import https from 'https';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  const settings = await redis.get('settings').catch(() => ({})) || {};
  const TOKEN    = settings.ibkrToken   || process.env.IBKR_TOKEN;
  const QUERY_ID = settings.ibkrQueryId || process.env.IBKR_QUERY_ID;

  const tokenSource = settings.ibkrToken ? 'redis-settings' : 'env-var';
  const tokenPreview = TOKEN ? TOKEN.slice(0, 6) + '...' + TOKEN.slice(-4) : null;

  if (!TOKEN) {
    return res.status(200).json({ ok: false, error: 'No token configured', tokenSource, queryId: QUERY_ID });
  }

  try {
    const r = await httpsGet(
      `https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest?t=${TOKEN}&q=${QUERY_ID}&v=3`
    );
    const ibkrError = r.body.match(/<ErrorMessage>(.*?)<\/ErrorMessage>/)?.[1];
    const refCode   = r.body.match(/<ReferenceCode>(.*?)<\/ReferenceCode>/)?.[1];
    return res.status(200).json({
      ok: !ibkrError,
      ibkrError: ibkrError || null,
      refCode: refCode || null,
      tokenSource,
      tokenPreview,
      queryId: QUERY_ID,
      rawResponse: r.body.slice(0, 300),
    });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message, tokenSource, tokenPreview, queryId: QUERY_ID });
  }
}
