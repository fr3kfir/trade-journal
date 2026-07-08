import { Redis } from '@upstash/redis';
import { mergeClientPush, addTombstones, emptyTombstones } from './_lib/tradeMerge.js';

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
    const { trades, deletedIds, deletedKeys, fullReplace } = req.body || {};
    if (!Array.isArray(trades)) return res.status(400).json({ error: 'Invalid payload' });

    let tombstones = emptyTombstones(await redis.get('trade_tombstones').catch(() => null));
    if (deletedIds?.length || deletedKeys?.length) {
      tombstones = addTombstones(tombstones, deletedIds || [], deletedKeys || []);
      await redis.set('trade_tombstones', tombstones);
    }

    if (trades.length === 0 && !deletedIds?.length) {
      return res.status(200).json({ ok: true, count: 0, skipped: true });
    }

    // Keep ibkr trades a stale client doesn't know about (added by a
    // background sync) instead of letting the push wipe them. fullReplace
    // (sent by "Clear IBKR") skips that protection intentionally.
    const server = fullReplace ? [] : (await redis.get('trades').catch(() => [])) || [];
    const { merged, serverOnly } = mergeClientPush(server, trades, tombstones);

    await redis.set('trades', merged);
    return res.status(200).json({ ok: true, count: merged.length, serverOnly });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
