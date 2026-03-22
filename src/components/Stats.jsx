import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function calcStats(trades) {
  const closed = trades.filter(t => t.pnl != null);
  if (!closed.length) return null;
  const pnls = closed.map(t => parseFloat(t.pnl));
  const wins = pnls.filter(p => p > 0);
  const losses = pnls.filter(p => p < 0);
  const totalPnl = pnls.reduce((a, b) => a + b, 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
  const profitFactor = losses.length ? Math.abs(wins.reduce((a, b) => a + b, 0)) / Math.abs(losses.reduce((a, b) => a + b, 0)) : 999;
  const best = Math.max(...pnls);
  const worst = Math.min(...pnls);
  const avgR = trades.filter(t => t.r_value).length
    ? trades.filter(t => t.r_value).reduce((a, t) => a + parseFloat(t.r_value), 0) / trades.filter(t => t.r_value).length
    : null;

  let peak = 0, cum = 0, maxDD = 0;
  pnls.forEach(p => { cum += p; if (cum > peak) peak = cum; const dd = peak - cum; if (dd > maxDD) maxDD = dd; });

  const byMonth = {};
  closed.forEach(t => {
    const m = t.date?.slice(0, 7);
    if (m) byMonth[m] = (byMonth[m] || 0) + parseFloat(t.pnl);
  });
  const monthly = Object.entries(byMonth).sort().map(([month, pnl]) => ({
    month: month.slice(5) + '/' + month.slice(2, 4),
    pnl: Math.round(pnl * 100) / 100,
  }));

  return { totalPnl, winRate, wins: wins.length, losses: losses.length, total: closed.length, avgWin, avgLoss, profitFactor, best, worst, avgR, maxDD, monthly };
}

function StatTile({ label, value, color }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text)', letterSpacing: '-0.3px' }}>{value}</div>
    </div>
  );
}

export default function Stats({ trades }) {
  const s = useMemo(() => calcStats(trades), [trades]);

  if (!s) return (
    <div className="panel" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 56 }}>
      No closed trades yet
    </div>
  );

  const fmt = (n) => `${n >= 0 ? '+' : ''}$${Math.abs(n).toFixed(2)}`;
  const pct = (n) => `${n.toFixed(1)}%`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        <StatTile label="Total P&L"     value={fmt(s.totalPnl)}   color={s.totalPnl >= 0 ? 'var(--green)' : 'var(--red)'} />
        <StatTile label="Win Rate"      value={pct(s.winRate)}    color={s.winRate >= 50 ? 'var(--green)' : 'var(--red)'} />
        <StatTile label="Profit Factor" value={s.profitFactor === 999 ? '∞' : s.profitFactor.toFixed(2)} color={s.profitFactor >= 1.5 ? 'var(--green)' : 'var(--red)'} />
        <StatTile label="Total Trades"  value={s.total} />
        <StatTile label="Avg Win"       value={fmt(s.avgWin)}     color="var(--green)" />
        <StatTile label="Avg Loss"      value={`-$${s.avgLoss.toFixed(2)}`} color="var(--red)" />
        <StatTile label="Best Trade"    value={fmt(s.best)}       color="var(--green)" />
        <StatTile label="Worst Trade"   value={fmt(s.worst)}      color="var(--red)" />
        <StatTile label="Max Drawdown"  value={`-$${s.maxDD.toFixed(2)}`} color="var(--red)" />
        <StatTile label="Avg R"         value={s.avgR != null ? `${s.avgR.toFixed(2)}R` : '—'} color="var(--navy)" />
        <StatTile label="Wins"          value={s.wins}  color="var(--green)" />
        <StatTile label="Losses"        value={s.losses} color="var(--red)" />
      </div>

      {s.monthly.length > 0 && (
        <div className="panel">
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 18 }}>Monthly P&L</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={s.monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={58} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow-md)' }}
                formatter={(v) => [`${v >= 0 ? '+' : ''}$${v.toFixed(2)}`, 'P&L']}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {s.monthly.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? '#059669' : '#DC2626'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
