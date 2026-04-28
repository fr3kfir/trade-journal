const { getStore } = require('@netlify/blobs');

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

const ALLOWED_KEYS = new Set([
  'apex_journal',
  'apex_surveys',
  'apex_learning',
  'apex_scenarios',
  'apex_routine_templates',
  'apex_routine_completions',
]);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const key = event.queryStringParameters?.key;
  if (!key || !ALLOWED_KEYS.has(key)) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid key' }) };
  }

  const store = getStore({ name: 'journal', siteID: process.env.SITE_ID, token: process.env.NETLIFY_TOKEN });

  try {
    if (event.httpMethod === 'GET') {
      const raw = await store.get(key);
      const data = raw ? JSON.parse(raw) : [];
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ data }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!Array.isArray(body.data)) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid payload' }) };
      }
      await store.set(key, JSON.stringify(body.data));
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
