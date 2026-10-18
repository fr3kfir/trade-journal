// Builds buy/sell dates and prices for every closed trade.
//
// IBKR imports store each execution as its own row: opening fills have
// pnl=null and closing fills carry the realized P&L, with the fill price in
// `entry`. To show when a position was bought and sold, closing fills are
// matched FIFO against earlier opening fills of the same ticker and side.
// Manual trades already hold both sides (entry/date and exit/exit_date).

const isExecutionRow = t => (t.source || '').startsWith('ibkr') && t.exit == null;

function avgPrice(fills) {
  const qty = fills.reduce((s, f) => s + f.qty, 0);
  if (!qty) return null;
  return fills.reduce((s, f) => s + f.price * f.qty, 0) / qty;
}

// Returns Map<closeTradeId, { buyDate, buyPrice, sellDate, sellPrice, openFills, estimated }>
export function buildTradeTimelines(trades) {
  const result = new Map();
  const queues = new Map(); // `${ticker}|${direction}` -> [{ id, date, price, qty }]

  const rows = trades
    .filter(t => isExecutionRow(t) && t.ticker && t.entry != null)
    .sort((a, b) => {
      const d = (a.date || '').localeCompare(b.date || '');
      if (d) return d;
      return (a.pnl == null ? 0 : 1) - (b.pnl == null ? 0 : 1); // opens before closes on the same day
    });

  for (const t of rows) {
    const key = `${t.ticker}|${t.direction}`;
    if (!queues.has(key)) queues.set(key, []);
    const queue = queues.get(key);
    const price = parseFloat(t.entry);
    const qty = parseFloat(t.quantity) || 0;

    if (t.pnl == null) {
      queue.push({ id: t.id, date: t.date, price, qty });
      continue;
    }

    const openFills = [];
    let need = qty;
    while (need > 1e-9 && queue.length) {
      const head = queue[0];
      const take = Math.min(head.qty, need);
      openFills.push({ id: head.id, date: head.date, price: head.price, qty: take });
      head.qty -= take;
      need -= take;
      if (head.qty <= 1e-9) queue.shift();
    }

    let openPrice = avgPrice(openFills);
    const openDate = openFills[0]?.date || null;
    let estimated = false;
    // Position opened before the imported history: back out the open price from realized P&L
    if (openPrice == null && qty) {
      const perShare = parseFloat(t.pnl) / qty;
      openPrice = t.direction === 'S' ? price + perShare : price - perShare;
      estimated = true;
    }

    const long = t.direction !== 'S';
    result.set(t.id, {
      buyDate:   long ? openDate : t.date,
      buyPrice:  long ? openPrice : price,
      sellDate:  long ? t.date : openDate,
      sellPrice: long ? price : openPrice,
      openFills,
      estimated,
    });
  }

  for (const t of trades) {
    if (t.pnl == null || result.has(t.id)) continue;
    const entry = t.entry != null ? parseFloat(t.entry) : null;
    const exit  = t.exit  != null ? parseFloat(t.exit)  : null;
    const exitDate = t.exit_date || t.date || null;
    const long = t.direction !== 'S';
    result.set(t.id, {
      buyDate:   long ? t.date : exitDate,
      buyPrice:  long ? entry : exit,
      sellDate:  long ? exitDate : t.date,
      sellPrice: long ? exit : entry,
      openFills: [],
      estimated: false,
    });
  }

  return result;
}

// 'YYYY-MM-DD' -> 'DD/MM/YYYY' (Israeli day-first format)
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || '—';
}

function labelPrice(v, estimated) {
  return v == null || isNaN(v) ? '—' : `${estimated ? '~' : ''}$${parseFloat(v).toFixed(2)}`;
}

// Text label to paste on a TradingView chart, opening side first
export function chartLabel(trade, tl = {}) {
  const long = trade.direction !== 'S';
  const bought = `BOUGHT AT ${labelPrice(tl.buyPrice, tl.estimated && long)} (${formatDate(tl.buyDate)})`;
  const sold   = `SOLD AT ${labelPrice(tl.sellPrice, tl.estimated && !long)} (${formatDate(tl.sellDate)})`;
  const pnl = parseFloat(trade.pnl);
  const lines = [
    `${trade.ticker} · ${long ? 'LONG' : 'SHORT'}${trade.quantity ? ` · ${trade.quantity} sh` : ''}`,
    ...(long ? [bought, sold] : [sold, bought]),
  ];
  if (!isNaN(pnl)) lines.push(`P&L ${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}`);
  return lines.join('\n');
}
