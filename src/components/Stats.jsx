import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function calcStats(trades) {
  const closed = trades.filter(t => t.pnl != null);
  if (!closed.length) return null;
  const sorted = [...closed].sort((a, b) => new Date(a.date) - new Date(b.date));
  const pnls = sorted.map(t => parseFloat(t.pnl));
  const wins = pnls.filter(p => p > 0);
  const losses = pnls.filter(p => p < 0);
  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
  const profitFactor = losses.length ? Math.abs(wins.reduce((a, b) => a + b, 0)) / Math.abs(losses.reduce((a, b) => a + b, 0)) : 999;
  const best = Math.max(...pnls);
  const worst = Math.min(...pnls);
  const totalComm = closed.reduce((s, t) => s + Math.abs(parseFloat(t.commission) || 0), 0);
  const avgR = trades.filter(t => t.r_value).length
    ? trades.filter(t => t.r_value).reduce((a, t) => a + parseFloat(t.r_value), 0) / trades.filter(t => t.r_value).length
    : null;

  // Max drawdown
  let peak = 0, cum = 0, maxDD = 0;
  pnls.forEach(p => { cum += p; if (cum > peak) peak = cum; const dd = peak - cum; if (dd > maxDD) maxDD = dd; });

  // Streak
  let curStreak = 0, maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
  pnls.forEach(p => {
    if (p > 0) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin); }
    else { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss); }
  });
  // Current streak
  let i = pnls.length - 1;
  if (pnls.length > 0) {
    const lastSign = pnls[i] > 0;
    while (i >= 0 && (pnls[i] > 0) === lastSign) { curStreak++; i--; }
    if (!lastSign) curStreak = -curStreak;
  }

  // Monthly P&L
  const byMonth = {};
  sorted.forEach(t => {
    const m = t.date?.slice(0, 7);
    if (m) byMonth[m] = (byMonth[m] || 0) + parseFloat(t.pnl);
  });
  const monthly = Object.entries(byMonth).sort().map(([month, pnl]) => ({
    month: month.slice(5) + '/' + month.slice(2, 4),
    pnl: Math.round(pnl * 100) / 100,
  }));

  // Best/worst month
  const bestMonth = monthly.reduce((a, b) => b.pnl > a.pnl ? b : a, { pnl: -Infinity, month: '' });
  const worstMonth = monthly.reduce((a, b) => b.pnl < a.pnl ? b : a, { pnl: Infinity, month: '' });

  return { totalPnl, winRate, wins: wins.length, losses: losses.length, total: closed.length,
    avgWin, avgLoss, profitFactor, best, worst, avgR, maxDD, monthly,
    totalComm, curStreak, maxWinStreak, maxLossStreak, bestMonth, worstMonth };
}

function StatTile({ label, value, color, sub }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text)', letterSpacing: '-0.3px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function Stats({ trades }) {
  const s = useMemo(() => calcStats(trades), [trades]);

  if (!s) return (
    <div className="panel" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 56 }}>No closed trades yet</div>
  );

  const fmt = (n) => `${n >= 0 ? '+' : ''}$${Math.abs(n).toFixed(2)}`;
  const pct = (n) => `${n.toFixed(1)}%`;
  const streakLabel = s.curStreak > 0 ? `${s.curStreak}W streak` : s.curStreak < 0 ? `${Math.abs(s.curStreak)}L streak` : 'No streak';
  const streakColor = s.curStreak > 0 ? 'var(--green)' : s.curStreak < 0 ? 'var(--red)' : 'var(--text-muted)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Section: P&L */}
      <SectionTitle>Performance</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        <StatTile label="Total P&L"     value={fmt(s.totalPnl)}   color={s.totalPnl >= 0 ? 'var(--green)' : 'var(--red)'} />
        <StatTile label="Win Rate"      value={pct(s.winRate)}    color={s.winRate >= 50 ? 'var(--green)' : 'var(--red)'} sub={`${s.wins}W / ${s.losses}L`} />
        <StatTile label="Profit Factor" value={s.profitFactor === 999 ? '∞' : s.profitFactor.toFixed(2)} color={s.profitFactor >= 1.5 ? 'var(--green)' : 'var(--red)'} />
        <StatTile label="Total Trades"  value={s.total} />
        <StatTile label="Avg Win"       value={fmt(s.avgWin)}     color="var(--green)" />
        <StatTile label="Avg Loss"      value={`-$${s.avgLoss.toFixed(2)}`} color="var(--red)" />
        <StatTile label="Best Trade"    value={fmt(s.best)}       color="var(--green)" />
        <StatTile label="Worst Trade"   value={fmt(s.worst)}      color="var(--red)" />
      </div>

      {/* Section: Risk */}
      <SectionTitle>Risk & Drawdown</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        <StatTile label="Max Drawdown"    value={`-$${s.maxDD.toFixed(2)}`}  color="var(--red)" />
        <StatTile label="Avg R"           value={s.avgR != null ? `${s.avgR.toFixed(2)}R` : '—'} color="var(--navy)" />
        <StatTile label="Total Commission" value={`-$${s.totalComm.toFixed(2)}`} color="var(--red)" />
        <StatTile label="Net P&L (after comm)" value={fmt(s.totalPnl - s.totalComm)} color={(s.totalPnl - s.totalComm) >= 0 ? 'var(--green)' : 'var(--red)'} />
      </div>

      {/* Section: Streaks */}
      <SectionTitle>Streaks</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        <StatTile label="Current Streak"   value={streakLabel}           color={streakColor} />
        <StatTile label="Best Win Streak"  value={`${s.maxWinStreak}W`}  color="var(--green)" />
        <StatTile label="Worst Loss Streak" value={`${s.maxLossStreak}L`} color="var(--red)" />
      </div>

      {/* Section: Monthly */}
      {s.monthly.length > 0 && (
        <>
          <SectionTitle>Monthly P&L</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 8 }}>
            <StatTile label="Best Month"  value={`${s.bestMonth.month}: ${fmt(s.bestMonth.pnl)}`}  color="var(--green)" />
            <StatTile label="Worst Month" value={`${s.worstMonth.month}: ${fmt(s.worstMonth.pnl)}`} color="var(--red)" />
          </div>
          <div className="panel">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={s.monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={58} />
                <Tooltip contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow-md)' }}
                  formatter={v => [`${v >= 0 ? '+' : ''}$${v.toFixed(2)}`, 'P&L']} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {s.monthly.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#059669' : '#DC2626'} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>{children}</div>;
}
