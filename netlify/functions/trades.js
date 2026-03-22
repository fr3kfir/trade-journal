const { getStore } = require('@netlify/blobs');

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

exports.handler = async () => {
  try {
    const store = getStore({ name: 'journal', siteID: process.env.SITE_ID, token: process.env.NETLIFY_TOKEN });
    const raw = await store.get('trades');
    const trades = raw ? JSON.parse(raw) : [];
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ trades }) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message, trades: [] }) };
  }
};
