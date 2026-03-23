import { kv } from '@vercel/kv';

const SECRET = process.env.SYNC_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    if (!SECRET || body.secret !== SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const incoming = body.trades || [];
    if (!incoming.length) return res.status(200).json({ message: 'No trades to sync' });

    let existing = [];
    try { existing = await kv.get('trades') || []; } catch {}

    const incomingMap = new Map(incoming.map(t => [t.id, t]));
    const manual = existing.filter(t => !t.id.startsWith('ibkr-'));
    const existingIbkr = existing.filter(t => t.id.startsWith('ibkr-'));
    const existingIbkrIds = new Set(existingIbkr.map(t => t.id));

    const fresh = incoming.filter(t => !existingIbkrIds.has(t.id));
    const updated = existingIbkr.map(t => incomingMap.has(t.id) ? { ...t, ...incomingMap.get(t.id) } : t);
    const merged = [...fresh, ...updated, ...manual].sort((a, b) => new Date(b.date) - new Date(a.date));

    await kv.set('trades', merged);

    return res.status(200).json({ ok: true, added: fresh.length, updated: updated.filter(t => incomingMap.has(t.id)).length, total: merged.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
