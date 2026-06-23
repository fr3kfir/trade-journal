const { getStore } = require('@netlify/blobs');

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

exports.handler = async (event) => {
  try {
    const store = getStore({ name: 'journal', siteID: process.env.SITE_ID, token: process.env.NETLIFY_TOKEN });
    const section = event.queryStringParameters?.section;

    // Journal GET
    if (section === 'journal' && event.httpMethod === 'GET') {
      const raw = await store.get('journal_entries');
      const data = raw ? JSON.parse(raw) : [];
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ data }) };
    }

    // Journal POST (save)
    if (section === 'journal' && event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!Array.isArray(body.data)) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid payload' }) };
      await store.set('journal_entries', JSON.stringify(body.data));
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    // Default: return trades
    const raw = await store.get('trades');
    const trades = raw ? JSON.parse(raw) : [];
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ trades }) };

  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message, trades: [] }) };
  }
};
