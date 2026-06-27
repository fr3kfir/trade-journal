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

function parseXmlTrades(xml) {
  const trades = [];
  const tradeRegex = /<Trade\s([^>]+?)\/>/g;
  let match;
  while ((match = tradeRegex.exec(xml)) !== null) {
    const attrs = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let a;
    while ((a = attrRegex.exec(match[1])) !== null) {
      attrs[a[1]] = a[2];
    }
    if (Object.keys(attrs).length > 0) trades.push(attrs);
  }
  return trades;
}

function buildTrades(all) {
  const formatDate = (d) => {
    if (!d) return '';
    const s = d.split(';')[0].split(' ')[0].replace(/-/g, '');
    if (s.length === 8) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
    return d.split(';')[0].split(' ')[0];
  };

  const list = all.filter(t =>
    t.openCloseIndicator && t.openCloseIndicator.includes('C') &&
    t.fifoPnlRealized && parseFloat(t.fifoPnlRealized) !== 0
  );

  const trades = list.map(t => ({
    id:         `ibkr-${t.tradeID || (t.symbol + t.dateTime + t.quantity)}`.replace(/[\s;,]/g, ''),
    ticker:     t.symbol || '',
    date:       formatDate(t.tradeDate || t.dateTime),
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

  // ── Step 1: send request to IBKR, return refCode + dlUrl to client ──
  if (step === 'request') {
    try {
      const r1 = await httpsGet(
        `https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest?t=${TOKEN}&q=${QUERY_ID}&v=3`
      );
      if (r1.status !== 200 || r1.body.includes('Error 403') || r1.body.includes('Access Denied')) {
        throw new Error(`SendRequest failed (${r1.status}): ${r1.body.slice(0, 200)}`);
      }
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
      const all = parseXmlTrades(r2.body);
      return res.status(200).json(buildTrades(all));
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

    const all = parseXmlTrades(body);
    return res.status(200).json(buildTrades(all));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
