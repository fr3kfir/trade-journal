const { getStore } = require('@netlify/blobs');
const https = require('https');
const XLSX = require('xlsx');

const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_CHAT = process.env.TELEGRAM_CHAT_ID; // your personal chat ID — leave empty to allow anyone
const IBKR_TOKEN   = process.env.IBKR_TOKEN;
const IBKR_QUERY   = process.env.IBKR_QUERY_ID;

// ─── Telegram helpers ──────────────────────────────────────────────────────

function tgPost(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(params);
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/${method}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sendMessage(chatId, text) {
  return tgPost('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
}

function sendDocument(chatId, filename, fileBuffer) {
  return new Promise((resolve, reject) => {
    const boundary = 'TGB' + Date.now().toString(36);
    const CRLF = '\r\n';

    const pre = Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="chat_id"${CRLF}${CRLF}` +
      `${chatId}${CRLF}` +
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="document"; filename="${filename}"${CRLF}` +
      `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet${CRLF}${CRLF}`
    );
    const post = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
    const body = Buffer.concat([pre, fileBuffer, post]);

    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendDocument`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Excel generation ──────────────────────────────────────────────────────

function generateExcel(trades) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: All Trades
  const rows = trades.map(t => ({
    'Date':        t.date || '',
    'Ticker':      t.ticker || '',
    'Direction':   t.direction === 'L' ? 'Long' : 'Short',
    'Qty':         t.quantity || '',
    'Entry ($)':   t.entry  != null ? parseFloat(t.entry)      : '',
    'Exit ($)':    t.exit   != null ? parseFloat(t.exit)       : '',
    'P&L ($)':     t.pnl    != null ? parseFloat(t.pnl)        : '',
    'Commission':  t.commission != null ? parseFloat(t.commission) : '',
    'R Value':     t.r_value || '',
    'Open/Close':  t.open_close || '',
    'Notes':       t.notes || '',
  }));

  const wsT = XLSX.utils.json_to_sheet(rows);
  wsT['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 8 },
    { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 8  }, { wch: 10 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsT, 'Trades');

  // Sheet 2: Summary
  const closed  = trades.filter(t => t.pnl != null);
  const pnls    = closed.map(t => parseFloat(t.pnl));
  const total   = pnls.reduce((a, b) => a + b, 0);
  const wins    = pnls.filter(p => p > 0).length;
  const losses  = closed.length - wins;
  const avgWin  = wins    ? pnls.filter(p => p > 0).reduce((a, b) => a + b, 0) / wins   : 0;
  const avgLoss = losses  ? Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0) / losses) : 0;
  const pf      = avgLoss && losses ? (avgWin * wins) / (avgLoss * losses) : null;

  const summary = [
    { Metric: 'Total P&L',      Value: `$${total.toFixed(2)}` },
    { Metric: 'Total Trades',   Value: closed.length },
    { Metric: 'Win Rate',       Value: `${closed.length ? (wins / closed.length * 100).toFixed(1) : 0}%` },
    { Metric: 'Winners',        Value: wins },
    { Metric: 'Losers',         Value: losses },
    { Metric: 'Avg Win',        Value: `$${avgWin.toFixed(2)}` },
    { Metric: 'Avg Loss',       Value: `$${avgLoss.toFixed(2)}` },
    { Metric: 'Profit Factor',  Value: pf ? pf.toFixed(2) : 'N/A' },
    { Metric: 'Generated',      Value: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC' },
  ];

  const wsS = XLSX.utils.json_to_sheet(summary);
  wsS['!cols'] = [{ wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsS, 'Summary');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// ─── IBKR sync ─────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function fetchIBKR() {
  if (!IBKR_TOKEN || !IBKR_QUERY) throw new Error('IBKR credentials not configured');

  const r1 = await httpsGet(
    `https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest?t=${IBKR_TOKEN}&q=${IBKR_QUERY}&v=3`
  );
  if (r1.status !== 200) throw new Error(`IBKR SendRequest failed (${r1.status})`);

  const refCode = r1.body.match(/<ReferenceCode>(.*?)<\/ReferenceCode>/)?.[1];
  const dlUrl   = r1.body.match(/<Url>(.*?)<\/Url>/)?.[1];
  if (!refCode || !dlUrl) throw new Error('No reference code from IBKR');

  let body = null;
  for (let i = 0; i < 5; i++) {
    await sleep(4000);
    const r2 = await httpsGet(`${dlUrl}?t=${IBKR_TOKEN}&q=${refCode}&v=3`);
    if (r2.body.includes('generation in progress') || r2.body.includes('Please wait')) continue;
    if (r2.status === 200 && r2.body.length > 50) { body = r2.body; break; }
  }
  if (!body) throw new Error('IBKR report not ready — try again in a moment');

  // Try JSON first, fall back to XML
  let trades = [];
  try {
    const data = JSON.parse(body);
    const stmt = data?.FlexQueryResponse?.FlexStatements?.FlexStatement
              || data?.FlexStatements?.FlexStatement || {};
    const raw  = stmt?.Trades?.Trade || stmt?.Trade || [];
    const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    trades = list
      .filter(t => t.assetCategory === 'STK' || !t.assetCategory)
      .map(t => ({
        id:         `ibkr-${t.symbol}-${t.dateTime}-${t.quantity}`.replace(/[\s;,]/g, ''),
        ticker:     t.symbol || '',
        date:       (t.dateTime || '').split(';')[0].split(' ')[0],
        direction:  (t.buySell || 'BUY') === 'BUY' ? 'L' : 'S',
        quantity:   Math.abs(parseFloat(t.quantity) || 0),
        entry:      parseFloat(t.tradePrice) || null,
        exit:       null, stop: null,
        pnl:        parseFloat(t.netCash) || null,
        commission: parseFloat(t.commission) || null,
        open_close: t.openCloseIndicator || '',
        notes:      'IBKR import',
      }));
  } catch {
    // XML fallback
    const tradeRegex = /<Trade\s([^>]+?)\/>/g;
    let m;
    while ((m = tradeRegex.exec(body)) !== null) {
      const attrs = {};
      const attrRx = /(\w+)="([^"]*)"/g;
      let a;
      while ((a = attrRx.exec(m[1])) !== null) attrs[a[1]] = a[2];
      if (!attrs.symbol) continue;
      const pnl = parseFloat(attrs.fifoPnlRealized || attrs.netCash || '0');
      if (!attrs.openCloseIndicator?.includes('C') || pnl === 0) continue;
      trades.push({
        id:         `ibkr-${attrs.tradeID || (attrs.symbol + attrs.dateTime + attrs.quantity)}`.replace(/[\s;,]/g, ''),
        ticker:     attrs.symbol,
        date:       (attrs.tradeDate || attrs.dateTime || '').split(';')[0].split(' ')[0],
        direction:  attrs.buySell === 'SELL' ? 'L' : 'S',
        quantity:   Math.abs(parseFloat(attrs.quantity) || 0),
        entry:      parseFloat(attrs.tradePrice) || null,
        exit: null, stop: null,
        pnl,
        commission: Math.abs(parseFloat(attrs.ibCommission) || 0),
        open_close: attrs.openCloseIndicator || '',
        notes:      'IBKR import',
      });
    }
  }
  return trades;
}

// ─── Main handler ──────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (!BOT_TOKEN) return { statusCode: 200, body: 'Bot not configured' };
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'Telegram bot active' };

  let update;
  try { update = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 200, body: 'ok' }; }

  const message = update.message || update.edited_message;
  if (!message) return { statusCode: 200, body: 'ok' };

  const chatId = String(message.chat.id);
  const text   = (message.text || '').trim();

  // Security: ignore messages from unknown chats if TELEGRAM_CHAT_ID is set
  if (ALLOWED_CHAT && chatId !== String(ALLOWED_CHAT)) {
    return { statusCode: 200, body: 'ok' };
  }

  const store = getStore({ name: 'journal', siteID: process.env.SITE_ID, token: process.env.NETLIFY_TOKEN });
  const cmd   = text.toLowerCase();

  try {
    // ── /start or /help ──────────────────────────────────────────────────
    if (cmd === '/start' || cmd === '/help' || cmd === 'עזרה') {
      await sendMessage(chatId,
        '📊 <b>Trade Journal Bot</b>\n\n' +
        'פקודות זמינות:\n\n' +
        '📥 /excel — שלח קובץ אקסל עם כל העסקאות\n' +
        '📊 /summary — סיכום P&amp;L\n' +
        '🔄 /sync — סנכרן עסקאות מ-IBKR\n\n' +
        'אפשר גם בעברית:\n' +
        '"שלח אקסל", "סיכום", "סנכרן"'
      );

    // ── Excel export ─────────────────────────────────────────────────────
    } else if (cmd === '/excel' || cmd.includes('אקסל') || cmd.includes('excel')) {
      await sendMessage(chatId, '⏳ מכין קובץ אקסל...');
      const raw    = await store.get('trades');
      const trades = raw ? JSON.parse(raw) : [];

      if (!trades.length) {
        await sendMessage(chatId, '⚠️ אין עסקאות במערכת עדיין');
      } else {
        const buf  = generateExcel(trades);
        const date = new Date().toISOString().split('T')[0];
        await sendDocument(chatId, `trades_${date}.xlsx`, buf);
      }

    // ── Summary ──────────────────────────────────────────────────────────
    } else if (cmd === '/summary' || cmd.includes('סיכום') || cmd.includes('summary')) {
      const raw    = await store.get('trades');
      const trades = raw ? JSON.parse(raw) : [];
      const closed = trades.filter(t => t.pnl != null);
      const pnls   = closed.map(t => parseFloat(t.pnl));
      const total  = pnls.reduce((a, b) => a + b, 0);
      const wins   = pnls.filter(p => p > 0).length;
      const losses = closed.length - wins;

      await sendMessage(chatId,
        '📈 <b>סיכום עסקאות</b>\n\n' +
        `💰 Total P&amp;L: <b>${total >= 0 ? '+' : ''}$${Math.abs(total).toFixed(2)}</b>\n` +
        `🎯 Win Rate: <b>${closed.length ? (wins / closed.length * 100).toFixed(1) : 0}%</b>\n` +
        `✅ זוכות: ${wins}  ❌ מפסידות: ${losses}\n` +
        `📊 סה"כ עסקאות סגורות: ${closed.length}`
      );

    // ── IBKR Sync ────────────────────────────────────────────────────────
    } else if (cmd === '/sync' || cmd.includes('סנכרן') || cmd.includes('sync')) {
      await sendMessage(chatId, '🔄 מסנכרן עסקאות מ-IBKR...\n⏳ עד 30 שניות');

      const newTrades = await fetchIBKR();

      const raw      = await store.get('trades');
      const existing = raw ? JSON.parse(raw) : [];

      const incomingMap  = new Map(newTrades.map(t => [t.id, t]));
      const manual       = existing.filter(t => !t.id.startsWith('ibkr-'));
      const existingIbkr = existing.filter(t =>  t.id.startsWith('ibkr-'));
      const existingIds  = new Set(existingIbkr.map(t => t.id));

      const fresh   = newTrades.filter(t => !existingIds.has(t.id));
      const updated = existingIbkr.map(t => incomingMap.has(t.id) ? { ...t, ...incomingMap.get(t.id) } : t);
      const merged  = [...fresh, ...updated, ...manual].sort((a, b) => new Date(b.date) - new Date(a.date));

      await store.set('trades', JSON.stringify(merged));

      await sendMessage(chatId,
        '✅ <b>סנכרון הושלם!</b>\n\n' +
        `📥 עסקאות חדשות: <b>${fresh.length}</b>\n` +
        `🔄 עסקאות מעודכנות: <b>${updated.length}</b>\n` +
        `📊 סה"כ עסקאות: <b>${merged.length}</b>\n\n` +
        'האתר יתעדכן אוטומטית בפתיחה הבאה 🌐'
      );

    // ── Unknown ──────────────────────────────────────────────────────────
    } else {
      await sendMessage(chatId, 'שלח /help לרשימת הפקודות 📋');
    }

  } catch (err) {
    await sendMessage(chatId, `❌ שגיאה: ${err.message}`);
  }

  return { statusCode: 200, body: 'ok' };
};
