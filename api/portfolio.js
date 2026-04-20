import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const positions = await redis.get('portfolio') || [];
      return res.status(200).json({ positions });
    } catch (err) {
      return res.status(200).json({ positions: [], error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { positions } = req.body || {};
      if (!Array.isArray(positions)) return res.status(400).json({ error: 'Invalid payload' });
      await redis.set('portfolio', positions);
      return res.status(200).json({ ok: true, count: positions.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
