const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// ── Israeli CPI data (source: Central Bureau of Statistics / למ"ס) ────────────
// Base: 2020 average = 100
const CPI = {
  2020: { jan: 100.6, dec: 100.9 },
  2021: { jan: 100.7, dec: 103.1 },
  2022: { jan: 103.7, dec: 111.4 },
  2023: { jan: 112.2, dec: 117.9 },
  2024: { jan: 118.3, dec: 121.6 },
  2025: { jan: 122.0, dec: 124.0 },
};

// ── מס יסף thresholds (ILS) ──────────────────────────────────────────────────
const YESSEF = {
  2020: 647640, 2021: 647640, 2022: 663240,
  2023: 721560, 2024: 721560, 2025: 738120,
};

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const data  = JSON.stringify(body);
    const req   = https.request(
      { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } },
      res => {
        let buf = '';
        res.on('data', c => buf += c);
        res.on('end', () => resolve({ status: res.statusCode, body: buf }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!CLAUDE_API_KEY) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'CLAUDE_API_KEY not set in Netlify environment variables.' }) };
  }

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const { trades = [], taxYear, usdToIls = 3.7 } = payload;
  const year = parseInt(taxYear, 10);

  if (!year || year < 2020 || year > 2030) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid tax year' }) };
  }

  // Filter closed trades for this year
  const yearTrades = trades.filter(t =>
    t.pnl != null && t.date && String(t.date).startsWith(String(year))
  );

  if (!yearTrades.length) {
    return {
      statusCode: 200, headers: CORS,
      body: JSON.stringify({ report: `לא נמצאו עסקאות סגורות לשנת ${year}.` }),
    };
  }

  const cpi       = CPI[year]     || { jan: null, dec: null };
  const threshold = YESSEF[year]  || 721560;
  const rate      = parseFloat(usdToIls) || 3.7;

  // Build trade table for Claude
  const tradeRows = yearTrades.map(t => {
    const pnlUsd = parseFloat(t.pnl) || 0;
    const commUsd = parseFloat(t.commission) || 0;
    const pnlIls  = (pnlUsd * rate).toFixed(2);
    const commIls = (commUsd * rate).toFixed(2);
    return `${t.date} | ${(t.ticker || '').toUpperCase()} | ${t.direction === 'L' ? 'Long' : 'Short'} | ${t.quantity || ''} | $${pnlUsd.toFixed(2)} | ₪${pnlIls} | $${commUsd.toFixed(2)} | ₪${commIls}`;
  }).join('\n');

  const systemPrompt = `אתה יועץ מס ישראלי המתמחה במס רווחי הון לסוחרים פרטיים בניירות ערך זרים.
קבל נתוני עסקאות ממוינים לפי שנת מס והפק דוח מס רווחי הון מלא ומדויק.
השתמש בחוק הישראלי (פקודת מס הכנסה). פרמט מספרים עם סימן ₪.
השתמש אך ורק בנתונים שסופקו. אל תמציא מספרים.
הדוח יהיה בעברית, מובנה וברור.`;

  const userMessage = `שנת מס: ${year}
שער דולר/שקל (ממוצע): ${rate}
מספר עסקאות סגורות: ${yearTrades.length}

נתוני מדד המחירים לצרכן (CPI) לשנת ${year}:
מדד ינואר ${year}: ${cpi.jan ?? 'לא זמין'}
מדד דצמבר ${year}: ${cpi.dec ?? 'בחישוב (שנה שוטפת)'}
${cpi.jan && cpi.dec ? `יחס המדד: ${(cpi.dec / cpi.jan).toFixed(4)}` : 'יחס מדד: לא ניתן לחשב — שנה שוטפת, חשב לפי נומינלי'}

סף מס יסף לשנת ${year}: ₪${threshold.toLocaleString()}

טבלת עסקאות (תאריך | מניה | כיוון | כמות | רווח/הפסד USD | רווח/הפסד ILS | עמלה USD | עמלה ILS):
${tradeRows}

אנא הפק דוח מס רווחי הון מלא הכולל:

1. סיכום עסקאות
   • סך רווחים ברוטו (₪)
   • סך הפסדים (₪)
   • סך עמלות (₪)
   • רווח נומינלי נטו לפני קיזוז (₪)

2. קיזוז הפסדים
   • רווחים כולל (₪)
   • הפסדים לקיזוז (₪)
   • רווח נומינלי לאחר קיזוז (₪)

3. תיקון אינפלציוני
   • חישוב רווח ריאלי לאחר תיקון מדד (₪)
   • הסבר קצר על השיטה

4. חישוב מס רווחי הון
   • שיעור מס: 25%
   • בסיס המס (₪)
   • מס לתשלום (₪)

5. בדיקת מס יסף (3%)
   • סף מס יסף: ₪${threshold.toLocaleString()}
   • האם הרווח הריאלי עולה על הסף?
   • אם כן — מס יסף לתשלום (₪)

6. סיכום תשלומי מס
   • מס רווחי הון (₪)
   • מס יסף (₪)
   • סה"כ מס לתשלום (₪)

7. המלצות לחיסכון במס (3–5 המלצות ספציפיות לנתונים אלה)

8. נתונים לטופס 1322
   רווח הון חייב במס: ₪___
   מס בשיעור 25%: ₪___
   מס יסף (אם רלוונטי): ₪___
   סה"כ לתשלום: ₪___`;

  try {
    const res = await httpsPost(
      'api.anthropic.com',
      '/v1/messages',
      {
        'x-api-key':         CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      {
        model:      process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
        max_tokens: 4096,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userMessage }],
      }
    );

    if (res.status !== 200) {
      const err = JSON.parse(res.body);
      throw new Error(err?.error?.message || `Claude API error ${res.status}`);
    }

    const parsed = JSON.parse(res.body);
    const report = parsed?.content?.[0]?.text || 'לא התקבלה תשובה מ-Claude.';
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ report }) };

  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
