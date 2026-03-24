import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, PieChart, Pie, Legend,
  RadialBarChart, RadialBar,
} from 'recharts';

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

  // Streaks
  let curStreak = 0, maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
  pnls.forEach(p => {
    if (p > 0) { curWin++; curLoss = 0; maxWinStreak = Math.max(maxWinStreak, curWin); }
    else { curLoss++; curWin = 0; maxLossStreak = Math.max(maxLossStreak, curLoss); }
  });
  let i = pnls.length - 1;
  if (pnls.length > 0) {
    const lastSign = pnls[i] > 0;
    while (i >= 0 && (pnls[i] > 0) === lastSign) { curStreak++; i--; }
    if (!lastSign) curStreak = -curStreak;
  }

  // Equity curve
  let cumPnl = 0;
  const equity = sorted.map(t => {
    cumPnl += parseFloat(t.pnl);
    return { date: t.date?.slice(5), cum: Math.round(cumPnl * 100) / 100 };
  });

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
  const bestMonth = monthly.reduce((a, b) => b.pnl > a.pnl ? b : a, { pnl: -Infinity, month: '' });
  const worstMonth = monthly.reduce((a, b) => b.pnl < a.pnl ? b : a, { pnl: Infinity, month: '' });

  // Day of week performance
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDow = {};
  sorted.forEach(t => {
    if (!t.date) return;
    const d = DOW[new Date(t.date).getDay()];
    if (!byDow[d]) byDow[d] = { sum: 0, count: 0 };
    byDow[d].sum += parseFloat(t.pnl);
    byDow[d].count++;
  });
  const dowData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => ({
    day: d,
    avg: byDow[d] ? Math.round((byDow[d].sum / byDow[d].count) * 100) / 100 : 0,
    count: byDow[d]?.count || 0,
  }));

  // P&L distribution histogram
  const bucketSize = Math.max(50, Math.round((best - worst) / 10 / 50) * 50);
  const buckets = {};
  pnls.forEach(p => {
    const b = Math.floor(p / bucketSize) * bucketSize;
    buckets[b] = (buckets[b] || 0) + 1;
  });
  const distribution = Object.entries(buckets).sort((a, b) => +a[0] - +b[0]).map(([start, count]) => ({
    range: `${+start >= 0 ? '+' : ''}${start}`,
    count,
    pos: +start >= 0,
  }));

  return {
    totalPnl, winRate, wins: wins.length, losses: losses.length, total: closed.length,
    avgWin, avgLoss, profitFactor, best, worst, avgR, maxDD, monthly,
    totalComm, curStreak, maxWinStreak, maxLossStreak, bestMonth, worstMonth,
    equity, dowData, distribution,
  };
}

function StatTile({ label, value, color, sub }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{label}</div>
      <div className="amount" style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text)', letterSpacing: '-0.3px' }}>{value}</div>
      {sub && <div className="amount" style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', paddingBottom: 4, borderBottom: '1px solid var(--border)', marginTop: 4 }}>{children}</div>;
}

const TIP = { contentStyle: { background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } };
const NAVY = '#1E3A5F';
const GREEN = '#059669';
const RED = '#DC2626';

export default function Stats({ trades }) {
  const s = useMemo(() => calcStats(trades), [trades]);

  if (!s) return (
    <div className="panel" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 56 }}>No closed trades yet</div>
  );

  const fmt = (n) => `${n >= 0 ? '+' : ''}$${Math.abs(n).toFixed(2)}`;
  const streakLabel = s.curStreak > 0 ? `${s.curStreak}W streak` : s.curStreak < 0 ? `${Math.abs(s.curStreak)}L streak` : 'No streak';
  const streakColor = s.curStreak > 0 ? GREEN : s.curStreak < 0 ? RED : 'var(--text-muted)';

  // Win/Loss donut data
  const donutData = [
    { name: 'Wins', value: s.wins, fill: GREEN },
    { name: 'Losses', value: s.losses, fill: RED },
  ];

  // Avg Win vs Avg Loss bar data
  const wlBar = [
    { name: 'Avg Win', value: s.avgWin, fill: GREEN },
    { name: 'Avg Loss', value: s.avgLoss, fill: RED },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Row 1: Key stats ── */}
      <SectionTitle>Performance Overview</SectionTitle>
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10 }}>
        <StatTile label="Total P&L"     value={fmt(s.totalPnl)}   color={s.totalPnl >= 0 ? GREEN : RED} />
        <StatTile label="Win Rate"      value={`${s.winRate.toFixed(1)}%`} color={s.winRate >= 50 ? GREEN : RED} sub={`${s.wins}W / ${s.losses}L`} />
        <StatTile label="Profit Factor" value={s.profitFactor === 999 ? '∞' : s.profitFactor.toFixed(2)} color={s.profitFactor >= 1.5 ? GREEN : RED} />
        <StatTile label="Total Trades"  value={s.total} />
        <StatTile label="Avg Win"       value={fmt(s.avgWin)}     color={GREEN} />
        <StatTile label="Avg Loss"      value={`-$${s.avgLoss.toFixed(2)}`} color={RED} />
        <StatTile label="Best Trade"    value={fmt(s.best)}       color={GREEN} />
        <StatTile label="Worst Trade"   value={fmt(s.worst)}      color={RED} />
        <StatTile label="Max Drawdown"  value={`-$${s.maxDD.toFixed(2)}`} color={RED} />
        <StatTile label="Avg R"         value={s.avgR != null ? `${s.avgR.toFixed(2)}R` : '—'} color={NAVY} />
        <StatTile label="Net P&L"       value={fmt(s.totalPnl - s.totalComm)} color={(s.totalPnl - s.totalComm) >= 0 ? GREEN : RED} sub="after commissions" />
        <StatTile label="Current Streak" value={streakLabel} color={streakColor} sub={`Best: ${s.maxWinStreak}W / ${s.maxLossStreak}L`} />
      </div>

      {/* ── Row 2: Equity curve + Win rate donut ── */}
      <SectionTitle>Equity Curve</SectionTitle>
      <div className="two-col-charts" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14 }}>
        {/* Equity curve */}
        <div className="panel" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>Cumulative P&L</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={s.equity} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={NAVY} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={NAVY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={58} />
              <Tooltip {...TIP} formatter={v => [`${v >= 0 ? '+' : ''}$${v.toFixed(2)}`, 'Cumulative P&L']} />
              <Area type="monotone" dataKey="cum" stroke={NAVY} strokeWidth={2} fill="url(#eqGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Win / Loss donut */}
        <div className="panel" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Win / Loss Split</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value" stroke="none">
                {donutData.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.9} />)}
              </Pie>
              <Tooltip {...TIP} formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          {/* legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: -4 }}>
            {donutData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.fill }} />
                <span style={{ color: 'var(--text-muted)' }}>{d.name}</span>
                <span style={{ fontWeight: 700, color: 'var(--text)' }}>{d.value}</span>
              </div>
            ))}
          </div>
          {/* center label — overlaid via absolute impossible in SVG, show below */}
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.winRate >= 50 ? GREEN : RED }}>{s.winRate.toFixed(1)}%</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>win rate</div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Avg Win vs Loss + Day of week ── */}
      <div className="two-col-charts" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Avg Win vs Avg Loss */}
        <div className="panel" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>Avg Win vs Avg Loss</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={wlBar} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--text)' }} axisLine={false} tickLine={false} width={72} />
              <Tooltip {...TIP} formatter={v => [`$${v.toFixed(2)}`]} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                {wlBar.map((d, i) => <Cell key={i} fill={d.fill} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* R-R ratio */}
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>R/R ratio: </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: s.avgLoss > 0 ? (s.avgWin / s.avgLoss >= 1 ? GREEN : RED) : GREEN }}>
              {s.avgLoss > 0 ? (s.avgWin / s.avgLoss).toFixed(2) : '∞'}
            </span>
          </div>
        </div>

        {/* Day of Week */}
        <div className="panel" style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>Avg P&L by Day</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={s.dowData} margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={50} />
              <Tooltip {...TIP} formatter={(v, _, p) => [`${v >= 0 ? '+' : ''}$${v.toFixed(2)}`, `Avg P&L (${p.payload.count} trades)`]} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]} barSize={28}>
                {s.dowData.map((d, i) => <Cell key={i} fill={d.avg >= 0 ? GREEN : RED} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 4: P&L Distribution ── */}
      <SectionTitle>Trade P&L Distribution</SectionTitle>
      <div className="panel" style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>Number of trades per P&L range</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={s.distribution} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="range" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip {...TIP} formatter={(v, _, p) => [v, `Trades in ${p.payload.range}`]} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {s.distribution.map((d, i) => <Cell key={i} fill={d.pos ? GREEN : RED} fillOpacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Row 5: Monthly ── */}
      {s.monthly.length > 0 && (
        <>
          <SectionTitle>Monthly P&L</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10, marginBottom: 4 }}>
            <StatTile label="Best Month"  value={`${s.bestMonth.month}: ${fmt(s.bestMonth.pnl)}`}  color={GREEN} />
            <StatTile label="Worst Month" value={`${s.worstMonth.month}: ${fmt(s.worstMonth.pnl)}`} color={RED} />
          </div>
          <div className="panel" style={{ padding: '16px 18px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={s.monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={58} />
                <Tooltip {...TIP} formatter={v => [`${v >= 0 ? '+' : ''}$${v.toFixed(2)}`, 'Monthly P&L']} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {s.monthly.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? GREEN : RED} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

    </div>
  );
}
