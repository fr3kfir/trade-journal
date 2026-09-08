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

// Groups trades by an arbitrary dimension (setup, sector, direction, ...) so
// the AI can answer "which X performs best" from a precomputed table instead
// of re-summing the raw trade list itself, which is where wrong numbers creep in.
function byDimension(closed, keyFn, label) {
  const map = new Map();
  for (const t of closed) {
    const key = keyFn(t) || null;
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  }
  return [...map.entries()]
    .map(([key, list]) => ({ [label]: key, ...aggregate(list) }))
    .sort((a, b) => b.netPnl - a.netPnl);
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function computeStreaks(closed) {
  let cur = 0, curIsWin = null, longestWin = 0, longestLoss = 0;
  for (const t of closed) {
    const isWin = t.netPnl > 0;
    cur = curIsWin === isWin ? cur + 1 : 1;
    curIsWin = isWin;
    if (isWin) longestWin = Math.max(longestWin, cur);
    else longestLoss = Math.max(longestLoss, cur);
  }
  return {
    currentStreakType: curIsWin == null ? null : (curIsWin ? 'win' : 'loss'),
    currentStreakLength: curIsWin == null ? 0 : cur,
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
  };
}

function computeMaxDrawdown(closed) {
  let equity = 0, peak = 0, maxDD = 0;
  for (const t of closed) {
    equity += t.netPnl;
    peak = Math.max(peak, equity);
    maxDD = Math.min(maxDD, equity - peak);
  }
  return round2(maxDD);
}

function computeRStats(closed) {
  const withR = closed.filter(t => t.rValue != null);
  if (!withR.length) return null;
  return {
    trades: withR.length,
    avgR: round2(withR.reduce((a, t) => a + t.rValue, 0) / withR.length),
  };
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
    // Precomputed breakdowns — use these instead of re-deriving from `trades`.
    bySetup: byDimension(closed, t => t.setup, 'setup'),
    bySector: byDimension(closed, t => t.sector, 'sector'),
    byDirection: byDimension(closed, t => t.direction, 'direction'),
    byMarketCondition: byDimension(closed, t => t.marketCondition, 'marketCondition'),
    byWeekday: byDimension(closed, t => WEEKDAYS[new Date(t.date).getUTCDay()], 'weekday'),
    streaks: computeStreaks(closed),
    maxDrawdown: computeMaxDrawdown(closed),
    rMultiple: computeRStats(closed),
    topWinners,
    topLosers,
    // Most recent trades in full detail — capped to keep the request small.
    trades: closed.slice(-500),
  };
}
