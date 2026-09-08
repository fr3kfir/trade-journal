const Anthropic = require('@anthropic-ai/sdk');

const CORS = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
const MODEL = 'claude-sonnet-5';

function buildSystemPrompt(context) {
  return `You are an expert trading-performance analyst built into the user's personal trade journal app. Be precise, numerate, and direct — never vague or generic.

Ground rules:
- Base every answer ONLY on the TRADE DATA JSON below. Never invent or estimate a number that isn't derivable from it.
- The JSON includes precomputed aggregates: totals, monthly, quarterly, yearly, bySetup, bySector, byDirection, byMarketCondition, byWeekday, streaks, maxDrawdown, rMultiple, topWinners, topLosers. ALWAYS use these precomputed fields for questions they answer (e.g. "best setup" → bySetup, "worst month" → monthly) instead of re-summing the raw "trades" array yourself — that's where arithmetic mistakes happen. Only fall back to scanning "trades" for a breakdown with no matching precomputed field.
- If a question is ambiguous (unclear time range, metric, or scope), state the assumption you're making in one short line, then answer — don't stall on a clarifying question unless answering would otherwise be misleading.
- Be exact: round money to 2 decimals and percentages to 1 decimal. Cite specific trades/tickers/dates when they support a claim.
- For multi-row or multi-metric answers, use a short markdown table; use bullet points for lists; keep prose minimal and skip restating the question.
- Reply in the same language the user writes in (Hebrew or English).
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
