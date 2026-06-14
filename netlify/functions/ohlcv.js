const https = require('https');

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Parse error')); }
      });
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET' }, body: '' };
  }

  const ticker = (event.queryStringParameters?.ticker || '').toUpperCase().replace(/[^A-Z0-9.]/g, '');
  const date = event.queryStringParameters?.date; // YYYY-MM-DD

  if (!ticker || !date) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'ticker and date required' }) };
  }

  const tradeTs = new Date(date + 'T12:00:00Z').getTime();
  const period1 = Math.floor((tradeTs - 60 * 24 * 3600 * 1000) / 1000);
  const period2 = Math.floor((tradeTs + 30 * 24 * 3600 * 1000) / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${period1}&period2=${period2}&events=none`;

  try {
    const json = await fetchJson(url);
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error('No data from Yahoo Finance');

    const timestamps = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};

    const candles = timestamps
      .map((ts, i) => ({
        time: ts,
        open: q.open?.[i] ?? null,
        high: q.high?.[i] ?? null,
        low: q.low?.[i] ?? null,
        close: q.close?.[i] ?? null,
      }))
      .filter(c => c.open != null && c.close != null);

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ candles, ticker }) };
  } catch (err) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
