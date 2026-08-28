// Builds a compact, LLM-friendly snapshot of the trade journal: raw closed
// trades plus precomputed aggregates (monthly/yearly, best/worst) so the
// AI chat answers stay numerically accurate instead of relying on the
// model to do the arithmetic over a long raw list.

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function aggregate(list) {
  const wins = list.filter(t => t.netPnl > 0);
  const losses = list.filter(t => t.netPnl < 0);
  const total = list.reduce((a, t) => a + t.netPnl, 0);
  return {
    trades: list.length,
    netPnl: round2(total),
    avgNetPnl: list.length ? round2(total / list.length) : 0,
    avgWin: wins.length ? round2(wins.reduce((a, t) => a + t.netPnl, 0) / wins.length) : 0,
    avgLoss: losses.length ? round2(Math.abs(losses.reduce((a, t) => a + t.netPnl, 0)) / losses.length) : 0,
    winRate: list.length ? round2((wins.length / list.length) * 100) : 0,
  };
}

function byPeriod(closed, keyFn) {
  const map = new Map();
  for (const t of closed) {
    const key = keyFn(t.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  return [...map.entries()]
    .map(([period, list]) => ({ period, ...aggregate(list) }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export function buildTradesContext(trades) {
  const closed = (trades || [])
    .filter(t => t.pnl != null && t.pnl !== '' && t.date)
    .map(t => {
      const gross = toNum(t.pnl) ?? 0;
      const commission = toNum(t.commission) ?? 0;
      return {
        date: t.date,
        ticker: t.ticker || '',
        direction: t.direction || '',
        entry: toNum(t.entry),
        exit: toNum(t.exit),
        quantity: toNum(t.quantity),
        grossPnl: round2(gross),
        commission: round2(commission),
        netPnl: round2(gross - commission),
        rValue: toNum(t.r_value),
        setup: t.setup || '',
        sector: t.sector || '',
        marketCondition: t.market_condition || '',
        notes: (t.notes || '').slice(0, 200),
      };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const byNetPnl = [...closed].sort((a, b) => b.netPnl - a.netPnl);
  const topWinners = byNetPnl.slice(0, 10).filter(t => t.netPnl > 0);
  const topLosers = byNetPnl.slice(-10).reverse().filter(t => t.netPnl < 0);

  return {
    asOf: new Date().toISOString().slice(0, 10),
    currency: 'USD',
    totals: aggregate(closed),
    monthly: byPeriod(closed, d => d.slice(0, 7)), // YYYY-MM
    yearly: byPeriod(closed, d => d.slice(0, 4)),  // YYYY
    topWinners,
    topLosers,
    // Most recent trades in full detail — capped to keep the request small.
    trades: closed.slice(-500),
  };
}
