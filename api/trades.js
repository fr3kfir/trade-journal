import { Redis } from '@upstash/redis';
import { isDeleted, emptyTombstones } from './_lib/tradeMerge.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Extra data sections stored alongside trades (e.g. the journal)
const SECTIONS = { journal: 'journal' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const sectionKey = SECTIONS[req.query?.section];
  if (sectionKey) {
    if (req.method === 'POST') {
      try {
        const { data } = req.body || {};
        if (!Array.isArray(data)) return res.status(400).json({ error: 'Invalid payload' });
        await redis.set(sectionKey, data);
        return res.status(200).json({ ok: true, count: data.length });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    try {
      const data = (await redis.get(sectionKey)) || [];
      return res.status(200).json({ data });
    } catch (err) {
      return res.status(200).json({ data: [], error: err.message });
    }
  }

  try {
    const tombstones = emptyTombstones(await redis.get('trade_tombstones').catch(() => null));
    const trades = ((await redis.get('trades')) || []).filter(t => t && t.id && !isDeleted(t, tombstones));
    return res.status(200).json({ trades });
  } catch (err) {
    return res.status(200).json({ trades: [], error: err.message });
  }
}
