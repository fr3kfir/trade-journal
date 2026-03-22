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

    // Merge: add new ibkr trades, update existing ibkr trades (to fix P&L etc), keep manual trades intact
    const incomingMap = new Map(incoming.map(t => [t.id, t]));
    const manual = existing.filter(t => !t.id.startsWith('ibkr-'));
    const existingIbkr = existing.filter(t => t.id.startsWith('ibkr-'));
    const existingIbkrIds = new Set(existingIbkr.map(t => t.id));

    const fresh = incoming.filter(t => !existingIbkrIds.has(t.id));
    // Update existing ibkr trades with latest data from IBKR (fixes P&L, commission, etc)
    const updated = existingIbkr.map(t => incomingMap.has(t.id) ? { ...t, ...incomingMap.get(t.id) } : t);

    const merged = [...fresh, ...updated, ...manual].sort((a, b) => new Date(b.date) - new Date(a.date));

    await store.set('trades', JSON.stringify(merged));

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ok: true, added: fresh.length, updated: updated.filter(t => incomingMap.has(t.id)).length, total: merged.length }),
    };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
