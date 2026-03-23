import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  try {
    const trades = await redis.get('trades') || [];
    return res.status(200).json({ trades });
  } catch (err) {
    return res.status(200).json({ trades: [], error: err.message });
  }
}
