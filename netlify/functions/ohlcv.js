const https = require('https');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// Module-level cache — survives warm Netlify function invocations
let cachedCookie = null;
let cachedCrumb  = null;

function rawGet(urlStr, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.get(
      {
        hostname: u.hostname,
        path:     u.pathname + u.search,
        headers:  {
          'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept':          '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          ...extraHeaders,
        },
        timeout: 12000,
      },
      (res) => {
        const cookies = (res.headers['set-cookie'] || []).map(c => c.split(';')[0]);
        let body = '';
        res.on('data', c => (body += c));
        res.on('end', () => resolve({ body, status: res.statusCode, cookies }));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function getCredentials(force = false) {
  if (cachedCrumb && cachedCookie && !force) return { crumb: cachedCrumb, cookie: cachedCookie };

  // Step 1 — get Yahoo cookie
  const { cookies } = await rawGet('https://fc.yahoo.com/');
  const cookie = cookies.join('; ');

  // Step 2 — exchange cookie for crumb
  const { body: crumb, status } = await rawGet(
    'https://query2.finance.yahoo.com/v1/test/getcrumb',
    { Cookie: cookie }
  );

  if (status !== 200 || !crumb || crumb === 'null') {
    throw new Error('Could not obtain Yahoo Finance crumb');
  }

  cachedCookie = cookie;
  cachedCrumb  = crumb.trim();
  return { crumb: cachedCrumb, cookie: cachedCookie };
}

async function fetchIntradayCandles(ticker, date) {
  // Build period1/period2 covering the full trading day in ET (EDT = UTC-4, EST = UTC-5).
  // Use 13:00–21:00 UTC which covers 9:00 AM–5:00 PM EDT (safe for both timezones).
  const dayStart = Math.floor(new Date(`${date}T13:00:00Z`).getTime() / 1000);
  const dayEnd   = Math.floor(new Date(`${date}T21:00:00Z`).getTime() / 1000);

  let { crumb, cookie } = await getCredentials();

  const buildUrl = (cr) =>
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?interval=5m&period1=${dayStart}&period2=${dayEnd}` +
    `&crumb=${encodeURIComponent(cr)}&events=none&includePrePost=true`;

  let res = await rawGet(buildUrl(crumb), { Cookie: cookie });

  // If Yahoo returns 401/unauthorized, refresh credentials once and retry
  if (res.status === 401 || res.status === 403) {
    ({ crumb, cookie } = await getCredentials(true));
    res = await rawGet(buildUrl(crumb), { Cookie: cookie });
  }

  if (res.status !== 200) throw new Error(`Yahoo returned HTTP ${res.status}`);

  const json = JSON.parse(res.body);
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(json?.chart?.error?.description || 'No chart data from Yahoo');

  const timestamps = result.timestamp || [];
  const q          = result.indicators?.quote?.[0] || {};

  const candles = timestamps
    .map((ts, i) => ({
      time:  ts,
      open:  q.open?.[i]  != null ? +q.open[i].toFixed(4)  : null,
      high:  q.high?.[i]  != null ? +q.high[i].toFixed(4)  : null,
      low:   q.low?.[i]   != null ? +q.low[i].toFixed(4)   : null,
      close: q.close?.[i] != null ? +q.close[i].toFixed(4) : null,
    }))
    .filter(c => c.open != null && c.high != null && c.low != null && c.close != null);

  return candles;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET' },
      body: '',
    };
  }

  const ticker = (event.queryStringParameters?.ticker || '')
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, '');
  const date = (event.queryStringParameters?.date || '').trim();

  if (!ticker || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'ticker and date (YYYY-MM-DD) are required' }),
    };
  }

  try {
    const candles = await fetchIntradayCandles(ticker, date);
    if (candles.length === 0) throw new Error('No intraday candles returned for this date');
    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ candles, ticker, count: candles.length }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
