import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { trades } = req.body || {};
    if (!Array.isArray(trades)) return res.status(400).json({ error: 'Invalid payload' });
    if (trades.length === 0) return res.status(200).json({ ok: true, count: 0, skipped: true });
    await redis.set('trades', trades);
    return res.status(200).json({ ok: true, count: trades.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
