const https = require('https');
const http = require('http');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://finviz.com/',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/gif' }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }

  const ticker = (event.queryStringParameters?.ticker || '').toUpperCase().trim();
  const timeframe = event.queryStringParameters?.tf || 'd';

  if (!ticker) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'ticker required' }) };
  }

  const symbol = ticker.includes(':') ? ticker.split(':')[1] : ticker;
  const tfMap = { d: 'd', w: 'w', m: 'm' };
  const p = tfMap[timeframe] || 'd';
  const url = `https://finviz.com/chart.ashx?t=${encodeURIComponent(symbol)}&ty=c&ta=1&p=${p}&s=l`;

  try {
    const { buffer, contentType } = await fetchUrl(url);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ src: dataUrl, ticker: symbol }) };
  } catch (err) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: `Failed to fetch chart: ${err.message}` }) };
  }
};
