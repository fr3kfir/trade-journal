const Anthropic = require('@anthropic-ai/sdk');

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
const MODEL = 'claude-sonnet-5';

function buildSystemPrompt(context) {
  return `You are a trading performance assistant built into the user's personal trade journal app.
Answer questions about their trading performance using ONLY the trade data provided below — never invent numbers that aren't derivable from it.
Reply in the same language the user writes in (Hebrew or English). Format money with $ and use bullet points or a short table when it helps readability. Keep answers focused and concise.
Today's date is ${context.asOf || 'unknown'}.

TRADE DATA (JSON):
${JSON.stringify(context)}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { messages, context } = JSON.parse(event.body || '{}');
    if (!Array.isArray(messages) || !messages.length) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'messages required' }) };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ error: 'no-api-key' }) };
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
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ reply: text || '(no response)' }) };
  } catch (err) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ error: err.message || 'Chat request failed' }) };
  }
};
