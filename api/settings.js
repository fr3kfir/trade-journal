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
      const settings = await redis.get('settings') || {};
      // Never expose the token — just confirm it's set
      return res.status(200).json({
        ibkrTokenSet: !!settings.ibkrToken,
        ibkrQueryId: settings.ibkrQueryId || '',
        ibkrConfirmQueryId: settings.ibkrConfirmQueryId || '',
      });
    } catch (err) {
      return res.status(200).json({ ibkrTokenSet: false, ibkrQueryId: '', ibkrConfirmQueryId: '', error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { ibkrToken, ibkrQueryId, ibkrConfirmQueryId } = req.body || {};
      const existing = await redis.get('settings') || {};
      const updated = {
        ...existing,
        ...(ibkrToken    ? { ibkrToken }    : {}),
        ...(ibkrQueryId  ? { ibkrQueryId }  : {}),
        // Empty string is allowed — clears the confirm query to disable intraday sync
        ...(ibkrConfirmQueryId !== undefined ? { ibkrConfirmQueryId: ibkrConfirmQueryId.trim() } : {}),
      };
      await redis.set('settings', updated);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
