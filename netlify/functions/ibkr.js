const TOKEN    = process.env.IBKR_TOKEN;
const QUERY_ID = process.env.IBKR_QUERY_ID;

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

exports.handler = async () => {
  if (!TOKEN || !QUERY_ID) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'IBKR credentials not configured' }) };
  }

  try {
    // Step 1 — request the report
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

    // Step 2 — poll until ready (max 5 attempts × 4s = 20s)
    let body = null;
    for (let i = 0; i < 5; i++) {
      await sleep(4000);
      const r2 = await httpsGet(`${dlUrl}?t=${TOKEN}&q=${refCode}&v=3`);
      if (r2.body.includes('generation in progress') || r2.body.includes('Please wait')) continue;
      if (r2.status === 200 && r2.body.length > 50) { body = r2.body; break; }
    }

    if (!body) throw new Error('IBKR report not ready after 20s — try again in a moment');

    // Step 3 — parse JSON
    let data;
    try { data = JSON.parse(body); }
    catch { throw new Error('Could not parse IBKR response: ' + body.slice(0, 200)); }

    // Handle both nested and flat trade structures
    const stmt = data?.FlexQueryResponse?.FlexStatements?.FlexStatement
                 || data?.FlexStatements?.FlexStatement
                 || {};
    const raw  = stmt?.Trades?.Trade || stmt?.Trade || [];
    const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);

    const trades = list
      .filter(t => t.assetCategory === 'STK' || !t.assetCategory)
      .map(t => ({
        id:         `ibkr-${t.symbol}-${t.dateTime}-${t.quantity}`.replace(/\s/g, ''),
        ticker:     t.symbol || '',
        date:       (t.dateTime || '').split(';')[0].split(' ')[0],
        direction:  (t.buySell || 'BUY') === 'BUY' ? 'L' : 'S',
        quantity:   Math.abs(parseFloat(t.quantity) || 0),
        entry:      parseFloat(t.tradePrice) || null,
        exit:       null,
        stop:       null,
        pnl:        parseFloat(t.netCash) || null,
        commission: parseFloat(t.commission) || null,
        open_close: t.openCloseIndicator || '',
        notes:      `IBKR import`,
      }));

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ trades, count: trades.length }) };

  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
