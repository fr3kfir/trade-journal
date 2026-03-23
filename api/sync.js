import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { trades } = req.body || {};
    if (!Array.isArray(trades)) return res.status(400).json({ error: 'Invalid payload' });
    await redis.set('trades', trades);
    return res.status(200).json({ ok: true, count: trades.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
