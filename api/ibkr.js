import https from 'https';
import { Redis } from '@upstash/redis';

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

  // IBKR dateTime looks like "20250101;093015" or "2025-01-01 09:30:15" — extract "HH:MM"
  const formatTime = (d) => {
    if (!d) return '';
    const part = d.includes(';') ? d.split(';')[1] : d.split(' ')[1];
    if (!part) return '';
    const s = part.replace(/:/g, '').trim();
    if (s.length >= 4 && /^\d+$/.test(s.slice(0, 4))) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
    return '';
  };

  const list = all.filter(t =>
    t.openCloseIndicator && t.openCloseIndicator.includes('C') &&
    t.fifoPnlRealized && parseFloat(t.fifoPnlRealized) !== 0
  );

  const trades = list.map(t => ({
    id:         `ibkr-${t.tradeID || (t.symbol + t.dateTime + t.quantity)}`.replace(/[\s;,]/g, ''),
    ticker:     t.symbol || '',
    date:       formatDate(t.tradeDate || t.dateTime),
    time:       formatTime(t.dateTime || t.tradeTime),
    direction:  t.buySell === 'SELL' ? 'L' : 'S',
    quantity:   Math.abs(parseFloat(t.quantity) || 0),
    entry:      parseFloat(t.tradePrice) || null,
    exit:       null,
    stop:       null,
    pnl:        parseFloat(t.fifoPnlRealized),
    commission: Math.abs(parseFloat(t.ibCommission) || 0),
    open_close: t.openCloseIndicator || '',
    notes:      'IBKR import',
  }));

  const allDates = [...new Set(all.map(t => (t.tradeDate || t.dateTime || '').split(';')[0].split(' ')[0]))].sort();
  const filteredOut = all.filter(t => !(
    t.openCloseIndicator && t.openCloseIndicator.includes('C') &&
    t.fifoPnlRealized && parseFloat(t.fifoPnlRealized) !== 0
  )).map(t => ({
    ticker: t.symbol,
    date: (t.tradeDate || t.dateTime || '').split(';')[0].split(' ')[0],
    openClose: t.openCloseIndicator,
    pnl: t.fifoPnlRealized,
  }));

  return { trades, count: trades.length, debug: { totalFromIBKR: all.length, afterFilter: list.length, datesInReport: allDates, filteredOut } };
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

  const step = req.query?.step;

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
