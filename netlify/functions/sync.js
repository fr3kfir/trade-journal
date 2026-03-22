const { getStore } = require('@netlify/blobs');

const SECRET = process.env.SYNC_SECRET;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    // Verify secret key
    if (!SECRET || body.secret !== SECRET) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const incoming = body.trades || [];
    if (!incoming.length) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ message: 'No trades to sync' }) };
    }

    // Load existing trades from blob storage
    const store = getStore({ name: 'journal', siteID: process.env.SITE_ID, token: process.env.NETLIFY_TOKEN });
    let existing = [];
    try {
      const raw = await store.get('trades');
      if (raw) existing = JSON.parse(raw);
    } catch {}

    // Merge — skip duplicates by id
    const existingIds = new Set(existing.map(t => t.id));
    const fresh = incoming.filter(t => !existingIds.has(t.id));
    const merged = [...fresh, ...existing].sort((a, b) => new Date(b.date) - new Date(a.date));

    await store.set('trades', JSON.stringify(merged));

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ok: true, added: fresh.length, total: merged.length }),
    };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
