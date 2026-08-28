import { Redis } from '@upstash/redis';
import Anthropic from '@anthropic-ai/sdk';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const MODEL = 'claude-sonnet-5';

function buildSystemPrompt(context) {
  return `You are a trading performance assistant built into the user's personal trade journal app.
Answer questions about their trading performance using ONLY the trade data provided below — never invent numbers that aren't derivable from it.
Reply in the same language the user writes in (Hebrew or English). Format money with $ and use bullet points or a short table when it helps readability. Keep answers focused and concise.
Today's date is ${context.asOf || 'unknown'}.

TRADE DATA (JSON):
${JSON.stringify(context)}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, context } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'messages required' });
    }

    const settings = await redis.get('settings').catch(() => ({})) || {};
    const apiKey = settings.anthropicKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ error: 'no-api-key' });
    }

    const client = new Anthropic({ apiKey });
    const trimmed = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [{ type: 'text', text: buildSystemPrompt(context || {}), cache_control: { type: 'ephemeral' } }],
      messages: trimmed,
    });

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return res.status(200).json({ reply: text || '(no response)' });
  } catch (err) {
    return res.status(200).json({ error: err.message || 'Chat request failed' });
  }
}
