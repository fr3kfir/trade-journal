import https from 'https';
import { Redis } from '@upstash/redis';
import { mergeIbkrTrades, emptyTombstones } from './_lib/tradeMerge.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function parseXmlAttrs(xml, tag) {
  const results = [];
  const re = new RegExp(`<${tag}\\s([^>]+?)\\/>`, 'g');
  let match;
  while ((match = re.exec(xml)) !== null) {
    const attrs = {};
    const attrRe = /(\w+)="([^"]*)"/g;
    let a;
    while ((a = attrRe.exec(match[1])) !== null) attrs[a[1]] = a[2];
    if (Object.keys(attrs).length > 0) results.push(attrs);
  }
  return results;
}

function parseXmlTrades(xml)     { return parseXmlAttrs(xml, 'Trade'); }
function parseXmlPositions(xml)  { return parseXmlAttrs(xml, 'OpenPosition').filter(p => p.levelOfDetail === 'SUMMARY'); }

function parseAccountNAV(xml) {
  // Try EquitySummaryByReportDateInBase (most common)
  const m = xml.match(/<EquitySummaryByReportDateInBase\s([^>]+?)\/>/);
  if (m) {
    const t = m[1].match(/\btotal="([^"]+)"/);
    if (t) return parseFloat(t[1]);
  }
  // Fallback: CashReport totalValue
  const c = xml.match(/\btotalValue="([\d.]+)"/);
  if (c) return parseFloat(c[1]);
  return null;
}

function buildPositions(raw, nav) {
  const positions = raw.map(p => ({
    symbol:        p.symbol || '',
    description:   p.description || '',
    quantity:      parseFloat(p.position)           || 0,
    markPrice:     parseFloat(p.markPrice)          || 0,
    costBasis:     parseFloat(p.costBasisPrice)     || 0,
    positionValue: parseFloat(p.positionValue)      || 0,
    unrealizedPnl: parseFloat(p.fifoPnlUnrealized)  || 0,
    pctOfNAV:      parseFloat(p.percentOfNAV)       || 0,
    side:          p.side || (parseFloat(p.position) > 0 ? 'Long' : 'Short'),
    currency:      p.currency || 'USD',
  })).filter(p => p.symbol && p.quantity !== 0);

  const totalUnrealized = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const totalExposure   = positions.reduce((s, p) => s + Math.abs(p.positionValue), 0);

  return {
    positions,
    nav:            nav || null,
    totalUnrealized: parseFloat(totalUnrealized.toFixed(2)),
    totalExposure:   parseFloat(totalExposure.toFixed(2)),
    updatedAt:       new Date().toISOString(),
  };
}

function buildTrades(all) {
  const formatDate = (d) => {
    if (!d) return '';
    const s = d.split(';')[0].split(' ')[0].replace(/-/g, '');
    if (s.length === 8) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
    return d.split(';')[0].split(' ')[0];
  };

  // Import every stock execution: closing trades carry realized P&L (even 0),
  // opening trades come in with pnl=null so the UI treats them as open legs.
  const list = all.filter(t => t.symbol && (t.assetCategory === 'STK' || !t.assetCategory));

  const trades = list.map(t => {
    const isClose = (t.openCloseIndicator || '').includes('C');
    const hasPnl  = isClose && t.fifoPnlRealized !== undefined && t.fifoPnlRealized !== '';
    const isBuy   = t.buySell !== 'SELL';
    return {
      id:         `ibkr-${t.tradeID || (t.symbol + t.dateTime + t.quantity)}`.replace(/[\s;,]/g, ''),
      ticker:     t.symbol || '',
      date:       formatDate(t.tradeDate || t.dateTime),
      // A SELL that closes was a long; a BUY that opens is a long
      direction:  isClose ? (isBuy ? 'S' : 'L') : (isBuy ? 'L' : 'S'),
      quantity:   Math.abs(parseFloat(t.quantity) || 0),
      entry:      parseFloat(t.tradePrice) || null,
      exit:       null,
      stop:       null,
      pnl:        hasPnl ? parseFloat(t.fifoPnlRealized) : null,
      commission: Math.abs(parseFloat(t.ibCommission) || 0),
      open_close: t.openCloseIndicator || '',
      notes:      isClose ? 'IBKR import' : 'IBKR import — opening leg',
    };
  });

  const allDates = [...new Set(all.map(t => (t.tradeDate || t.dateTime || '').split(';')[0].split(' ')[0]))].sort();
  const opens  = trades.filter(t => t.pnl == null).length;
  const closes = trades.length - opens;

  return { trades, count: trades.length, debug: { totalFromIBKR: all.length, imported: trades.length, opens, closes, datesInReport: allDates } };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const settings = await redis.get('settings').catch(() => ({})) || {};
  const TOKEN    = settings.ibkrToken   || process.env.IBKR_TOKEN;
  const QUERY_ID = settings.ibkrQueryId || process.env.IBKR_QUERY_ID;

  if (!TOKEN || !QUERY_ID) {
    return res.status(500).json({ error: 'IBKR credentials not configured. Go to Settings in the app to add your token.' });
  }

  // Vercel Cron invokes the bare path — treat it as a full sync
  const step = req.query?.step || (req.headers?.['x-vercel-cron'] ? 'sync' : undefined);

  // ── Last background-sync result ──
  if (step === 'status') {
    const status = await redis.get('ibkr_sync_status').catch(() => null);
    return res.status(200).json(status || { ok: null, at: null });
  }

  // ── Full server-side sync: fetch report, merge into the trades store ──
  // Single source of truth used by the UI, the Vercel cron and the GitHub
  // Action, so every path produces identical trade IDs and merge behavior.
  if (step === 'sync') {
    try {
      let { refCode, dlUrl } = req.query || {};

      if (!refCode || !dlUrl) {
        const r1 = await httpsGet(
          `https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest?t=${TOKEN}&q=${QUERY_ID}&v=3`
        );
        if (r1.status !== 200 || r1.body.includes('Error 403') || r1.body.includes('Access Denied')) {
          throw new Error(`SendRequest failed (${r1.status}): ${r1.body.slice(0, 200)}`);
        }
        const ibkrError = r1.body.match(/<ErrorMessage>(.*?)<\/ErrorMessage>/)?.[1];
        if (ibkrError) throw new Error(`IBKR: ${ibkrError}`);
        refCode = r1.body.match(/<ReferenceCode>(.*?)<\/ReferenceCode>/)?.[1];
        dlUrl   = r1.body.match(/<Url>(.*?)<\/Url>/)?.[1];
        if (!refCode || !dlUrl) throw new Error('No reference code in response: ' + r1.body.slice(0, 300));
      }

      let body = null;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, i === 0 ? 3000 : 4000));
        const r2 = await httpsGet(`${dlUrl}?t=${TOKEN}&q=${refCode}&v=3`);
        if (r2.body.includes('generation in progress') || r2.body.includes('Please wait')) continue;
        if (r2.status === 200 && r2.body.length > 50) { body = r2.body; break; }
      }
      // Report still generating — hand the caller a continuation instead of failing
      if (!body) return res.status(202).json({ pending: true, refCode, dlUrl });

      const flexError = body.match(/<ErrorMessage>(.*?)<\/ErrorMessage>/)?.[1];
      if (flexError) throw new Error(`IBKR: ${flexError}`);

      const { trades: incoming } = buildTrades(parseXmlTrades(body));
      const rawPositions = parseXmlPositions(body);
      const nav          = parseAccountNAV(body);
      const portfolio    = buildPositions(rawPositions, nav);

      const existing   = (await redis.get('trades').catch(() => [])) || [];
      const tombstones = emptyTombstones(await redis.get('trade_tombstones').catch(() => null));
      const { merged, added, updated } = mergeIbkrTrades(existing, incoming, tombstones);

      await redis.set('trades', merged);
      if (portfolio.positions.length > 0 || nav) {
        await redis.set('ibkr_portfolio', portfolio).catch(() => {});
      }

      const status = { ok: true, at: new Date().toISOString(), added, updated, imported: incoming.length, total: merged.length };
      await redis.set('ibkr_sync_status', status).catch(() => {});
      return res.status(200).json(status);
    } catch (err) {
      const status = { ok: false, at: new Date().toISOString(), error: err.message };
      await redis.set('ibkr_sync_status', status).catch(() => {});
      return res.status(500).json(status);
    }
  }

  // ── Return cached portfolio snapshot from Redis ──
  if (step === 'portfolio') {
    const data = await redis.get('ibkr_portfolio').catch(() => null);
    return res.status(200).json(data || { positions: [], nav: null, totalUnrealized: 0, totalExposure: 0, updatedAt: null });
  }

  // ── Diagnostic: show what token is loaded and test IBKR ──
  if (step === 'test') {
    const tokenPreview = TOKEN ? TOKEN.slice(0, 6) + '...' + TOKEN.slice(-4) : null;
    const tokenSource  = (await redis.get('settings').catch(() => ({})) || {}).ibkrToken
      ? 'redis' : 'env-var';
    try {
      const r = await httpsGet(
        `https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest?t=${TOKEN}&q=${QUERY_ID}&v=3`
      );
      const ibkrError = r.body.match(/<ErrorMessage>(.*?)<\/ErrorMessage>/)?.[1];
      const refCode   = r.body.match(/<ReferenceCode>(.*?)<\/ReferenceCode>/)?.[1];
      return res.status(200).json({ tokenSource, tokenPreview, queryId: QUERY_ID, ibkrError: ibkrError || null, refCode: refCode || null, raw: r.body.slice(0, 300) });
    } catch (err) {
      return res.status(200).json({ tokenSource, tokenPreview, queryId: QUERY_ID, error: err.message });
    }
  }

  // ── Step 1: send request to IBKR, return refCode + dlUrl to client ──
  if (step === 'request') {
    try {
      const r1 = await httpsGet(
        `https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest?t=${TOKEN}&q=${QUERY_ID}&v=3`
      );
      if (r1.status !== 200 || r1.body.includes('Error 403') || r1.body.includes('Access Denied')) {
        throw new Error(`SendRequest failed (${r1.status}): ${r1.body.slice(0, 200)}`);
      }
      // Detect IBKR-level errors (token invalid, query not found, etc.)
      const ibkrError = r1.body.match(/<ErrorMessage>(.*?)<\/ErrorMessage>/)?.[1];
      if (ibkrError) throw new Error(`IBKR: ${ibkrError} — go to ⚙️ Settings and update your token`);
      const refCode = r1.body.match(/<ReferenceCode>(.*?)<\/ReferenceCode>/)?.[1];
      const dlUrl   = r1.body.match(/<Url>(.*?)<\/Url>/)?.[1];
      if (!refCode || !dlUrl) {
        throw new Error('No reference code in response: ' + r1.body.slice(0, 300));
      }
      return res.status(200).json({ refCode, dlUrl });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Step 2: try once to download the report ──
  if (step === 'download') {
    const { refCode, dlUrl } = req.query;
    if (!refCode || !dlUrl) return res.status(400).json({ error: 'Missing refCode or dlUrl' });
    try {
      const r2 = await httpsGet(`${dlUrl}?t=${TOKEN}&q=${refCode}&v=3`);
      if (r2.body.includes('generation in progress') || r2.body.includes('Please wait') || r2.body.length < 50) {
        return res.status(200).json({ pending: true });
      }
      const allTrades    = parseXmlTrades(r2.body);
      const rawPositions = parseXmlPositions(r2.body);
      const nav          = parseAccountNAV(r2.body);
      const portfolio    = buildPositions(rawPositions, nav);

      // Save portfolio snapshot to Redis (fire-and-forget)
      if (portfolio.positions.length > 0 || nav) {
        redis.set('ibkr_portfolio', portfolio).catch(() => {});
      }

      return res.status(200).json({ ...buildTrades(allTrades), portfolio });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Legacy: single-call flow (used by GitHub Actions) ──
  try {
    const r1 = await httpsGet(
      `https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest?t=${TOKEN}&q=${QUERY_ID}&v=3`
    );
    if (r1.status !== 200 || r1.body.includes('Error 403') || r1.body.includes('Access Denied')) {
      throw new Error(`SendRequest failed (${r1.status}): ${r1.body.slice(0, 200)}`);
    }
    const refCode = r1.body.match(/<ReferenceCode>(.*?)<\/ReferenceCode>/)?.[1];
    const dlUrl   = r1.body.match(/<Url>(.*?)<\/Url>/)?.[1];
    if (!refCode || !dlUrl) throw new Error('No reference code in response: ' + r1.body.slice(0, 300));

    let body = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, i === 0 ? 5000 : 4000));
      const r2 = await httpsGet(`${dlUrl}?t=${TOKEN}&q=${refCode}&v=3`);
      if (r2.body.includes('generation in progress') || r2.body.includes('Please wait')) continue;
      if (r2.status === 200 && r2.body.length > 50) { body = r2.body; break; }
    }
    if (!body) throw new Error('IBKR report not ready after 40s — try again in a moment');

    const allTrades    = parseXmlTrades(body);
    const rawPositions = parseXmlPositions(body);
    const nav          = parseAccountNAV(body);
    const portfolio    = buildPositions(rawPositions, nav);
    if (portfolio.positions.length > 0 || nav) {
      redis.set('ibkr_portfolio', portfolio).catch(() => {});
    }
    return res.status(200).json({ ...buildTrades(allTrades), portfolio });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
