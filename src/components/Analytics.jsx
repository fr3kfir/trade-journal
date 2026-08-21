import { useMemo, useState } from 'react';
import { TrendingUp, Target, Award, Calendar, BarChart2, Clock, ArrowUpDown, Layers, Star } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function netPnl(t) {
  return parseFloat(t.pnl) - (parseFloat(t.commission) || 0);
}

function fmt$(v, sign = true) {
  const s = sign ? (v >= 0 ? '+' : '') : '';
  return `${s}$${Math.abs(v).toFixed(2)}`;
}

function holdingDays(t) {
  if (!t.date || !t.exit_date) return null;
  const days = Math.round((new Date(t.exit_date) - new Date(t.date)) / 86400000);
  return days >= 0 ? days : null;
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_HEB = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

// ── SVG Equity Curve ─────────────────────────────────────────────────────────

function EquityCurve({ points, width = 700, height = 220 }) {
  if (points.length < 2) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
      אין מספיק עסקאות
    </div>
  );

  const pad = { top: 16, right: 16, bottom: 32, left: 60 };
  const W = width  - pad.left - pad.right;
  const H = height - pad.top  - pad.bottom;

  const vals = points.map(p => p.cum);
  const minV = Math.min(0, ...vals);
  const maxV = Math.max(0, ...vals);
  const range = maxV - minV || 1;

  const scaleX = i => (i / (points.length - 1)) * W;
  const scaleY = v => H - ((v - minV) / range) * H;
  const zeroY  = scaleY(0);

  // Build SVG path
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(p.cum).toFixed(1)}`).join(' ');
  const areaD = `${pathD} L${scaleX(points.length - 1)},${zeroY.toFixed(1)} L0,${zeroY.toFixed(1)} Z`;

  // Y-axis ticks
  const tickCount = 5;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => minV + (range / tickCount) * i);

  // X-axis labels (sample a few dates)
  const labelCount = Math.min(6, points.length);
  const xLabels = Array.from({ length: labelCount }, (_, i) => {
    const idx = Math.round(i * (points.length - 1) / (labelCount - 1));
    return { idx, date: points[idx].date };
  });

  const lastVal = points[points.length - 1].cum;
  const color = lastVal >= 0 ? '#16a34a' : '#dc2626';

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="eqGradNeg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dc2626" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {/* Grid lines + Y ticks */}
        {ticks.map((v, i) => {
          const y = scaleY(v);
          return (
            <g key={i}>
              <line x1={0} y1={y} x2={W} y2={y} stroke="var(--border)" strokeWidth={0.8} strokeDasharray={v === 0 ? 'none' : '3,3'} />
              <text x={-6} y={y + 4} textAnchor="end" fontSize={9} fill="var(--text-faint)">
                {v >= 0 ? '+' : ''}{v >= 1000 || v <= -1000 ? `$${(v/1000).toFixed(1)}k` : `$${Math.round(v)}`}
              </text>
            </g>
          );
        })}
        {/* Zero line */}
        <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="var(--border)" strokeWidth={1.5} />
        {/* Area fill */}
        <path d={areaD} fill={`url(#eqGrad)`} />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
        {/* Last dot */}
        <circle cx={scaleX(points.length - 1)} cy={scaleY(lastVal)} r={4} fill={color} />
        {/* X labels */}
        {xLabels.map(({ idx, date }) => (
          <text key={idx} x={scaleX(idx)} y={H + 20} textAnchor="middle" fontSize={9} fill="var(--text-faint)">
            {date?.slice(5)}
          </text>
        ))}
      </g>
    </svg>
  );
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────

function BarChart({ data, valueKey, colorFn, label, fmt, width = 500, height = 160 }) {
  if (!data.length) return null;
  const pad = { top: 10, right: 10, bottom: 40, left: 50 };
  const W = width  - pad.left - pad.right;
  const H = height - pad.top  - pad.bottom;

  const vals  = data.map(d => d[valueKey]);
  const maxAbs = Math.max(...vals.map(Math.abs), 0.01);
  const barW  = Math.max(8, (W / data.length) * 0.65);
  const gap   = W / data.length;

  const scaleY = v => ((Math.abs(v) / maxAbs) * H * 0.9);
  const zeroY  = H;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {/* Zero line */}
        <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="var(--border)" strokeWidth={1} />
        {data.map((d, i) => {
          const v   = d[valueKey];
          const bH  = scaleY(v);
          const x   = gap * i + gap / 2 - barW / 2;
          const y   = v >= 0 ? zeroY - bH : zeroY;
          const col = colorFn(v, d);
          return (
            <g key={i}>
              <rect x={x} y={v >= 0 ? y : zeroY} width={barW} height={bH || 1} fill={col} rx={3} opacity={0.85} />
              <text x={x + barW / 2} y={v >= 0 ? y - 4 : zeroY + bH + 12} textAnchor="middle" fontSize={8.5} fill={col} fontWeight={600}>
                {fmt ? fmt(v) : v}
              </text>
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize={8} fill="var(--text-faint)" transform={`rotate(-30,${x + barW / 2},${H + 14})`}>
                {d.label?.length > 8 ? d.label.slice(0, 8) : d.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

// ── Stat mini-card ────────────────────────────────────────────────────────────

function Stat({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--text)' }} className="amount">{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{sub}</div>}
    </div>
  );
}

// ── Generic group breakdown table (Setup / Direction / Sector / Execution Score) ──

function groupStats(closed, keyFn) {
  const map = {};
  for (const t of closed) {
    const k = keyFn(t);
    if (!map[k]) map[k] = [];
    map[k].push(t);
  }
  return Object.entries(map).map(([key, ts]) => {
    const pnls  = ts.map(netPnl);
    const wins  = pnls.filter(p => p > 0).length;
    const rVals = ts.filter(t => t.r_value != null).map(t => parseFloat(t.r_value)).filter(v => !isNaN(v));
    return {
      key,
      count:    ts.length,
      winRate:  (wins / ts.length * 100).toFixed(0),
      avgPnl:   parseFloat((avg(pnls) || 0).toFixed(2)),
      totalPnl: parseFloat(pnls.reduce((a, b) => a + b, 0).toFixed(2)),
      avgR:     rVals.length ? parseFloat(avg(rVals).toFixed(2)) : null,
    };
  }).sort((a, b) => b.totalPnl - a.totalPnl);
}

function GroupRow({ s, maxPnl }) {
  const barW = Math.abs(s.totalPnl) / (maxPnl || 1) * 100;
  const color = s.totalPnl >= 0 ? 'var(--green)' : 'var(--red)';
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '9px 10px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.key || '—'}</td>
      <td style={{ padding: '9px 10px', textAlign: 'center', fontSize: 12 }}>{s.count}</td>
      <td style={{ padding: '9px 10px', textAlign: 'center', fontSize: 12, color: parseFloat(s.winRate) >= 50 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
        {s.winRate}%
      </td>
      <td style={{ padding: '9px 10px', textAlign: 'center', fontSize: 12, fontWeight: 600, color }}>
        {fmt$(s.avgPnl)}
      </td>
      <td style={{ padding: '9px 10px', textAlign: 'center', fontSize: 12, color: s.avgR >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
        {s.avgR != null ? `${s.avgR >= 0 ? '+' : ''}${s.avgR}R` : '—'}
      </td>
      <td style={{ padding: '9px 10px', minWidth: 100 }}>
        <div style={{ height: 8, background: 'var(--bg-card)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${barW}%`, background: color, borderRadius: 4 }} />
        </div>
        <div style={{ fontSize: 10, color, marginTop: 2, fontWeight: 600 }}>{fmt$(s.totalPnl)}</div>
      </td>
    </tr>
  );
}

function GroupTable({ icon, title, firstCol, data, emptyText }) {
  const Icon = icon;
  const maxPnl = Math.max(...data.map(s => Math.abs(s.totalPnl)), 0.01);
  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={15} /> {title}
      </div>
      {!data.length ? (
        <div style={{ padding: '24px 16px', fontSize: 13, color: 'var(--text-faint)' }}>{emptyText}</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-card)' }}>
              {[firstCol, 'עסקאות', 'Win%', 'ממוצע', 'Avg R', 'סה״כ P&L'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: h === firstCol ? 'left' : 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(s => <GroupRow key={s.key} s={s} maxPnl={maxPnl} />)}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Boolean impact box (rules followed / sector leading / RS strong) ───────────

function BooleanImpact({ icon, title, yesLabel, noLabel, yes, no }) {
  const Icon = icon;
  const rows = [
    { label: yesLabel, d: yes, color: 'var(--green)' },
    { label: noLabel,  d: no,  color: 'var(--red)' },
  ].filter(r => r.d.count > 0);
  if (!rows.length) return null;
  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={15} /> {title}
      </div>
      {rows.map(({ label, d, color }) => (
        <div key={label} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>{label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: 11 }}>
            <div style={{ color: 'var(--text-faint)' }}>עסקאות<br /><span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{d.count}</span></div>
            <div style={{ color: 'var(--text-faint)' }}>Win%<br /><span style={{ fontSize: 16, fontWeight: 700, color }}>{d.wr}%</span></div>
            <div style={{ color: 'var(--text-faint)' }}>ממוצע<br /><span style={{ fontSize: 16, fontWeight: 700, color: d.avg >= 0 ? 'var(--green)' : 'var(--red)' }} className="amount">{d.avg != null ? fmt$(d.avg) : '—'}</span></div>
          </div>
        </div>
      ))}
      {rows.length === 2 && rows[0].d.avg != null && rows[1].d.avg != null && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.6 }}>
          {rows[0].d.avg >= rows[1].d.avg
            ? `כש"${rows[0].label}" הרווחת ${fmt$(rows[0].d.avg - rows[1].d.avg)} יותר בממוצע לעסקה`
            : `כש"${rows[1].label}" הרווחת ${fmt$(rows[1].d.avg - rows[0].d.avg)} יותר בממוצע לעסקה`
          }
        </div>
      )}
    </div>
  );
}

function boolBreakdown(closed, keyFn) {
  const avgOf = arr => arr.length ? parseFloat((avg(arr.map(netPnl)) || 0).toFixed(2)) : null;
  const wrOf  = arr => arr.length ? (arr.filter(t => netPnl(t) > 0).length / arr.length * 100).toFixed(0) : null;
  const yes = closed.filter(t => keyFn(t) === true);
  const no  = closed.filter(t => keyFn(t) === false);
  return {
    yes: { count: yes.length, avg: avgOf(yes), wr: wrOf(yes) },
    no:  { count: no.length,  avg: avgOf(no),  wr: wrOf(no) },
  };
}

// ── Main Analytics component ──────────────────────────────────────────────────

export default function Analytics({ trades }) {
  const [tf, setTf] = useState('ALL');

  const closed = useMemo(() => {
    let list = trades.filter(t => t.pnl != null && t.date);
    if (tf !== 'ALL') {
      const now = new Date();
      let cutoff;
      if (tf === '1M')  { cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 1); }
      if (tf === '3M')  { cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 3); }
      if (tf === 'YTD') { cutoff = new Date(now.getFullYear(), 0, 1); }
      if (cutoff) list = list.filter(t => new Date(t.date) >= cutoff);
    }
    return [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [trades, tf]);

  // Equity curve points
  const equityPoints = useMemo(() => {
    let cum = 0;
    return closed.map(t => { cum += netPnl(t); return { date: t.date, cum: parseFloat(cum.toFixed(2)) }; });
  }, [closed]);

  // Overall stats
  const stats = useMemo(() => {
    const pnls = closed.map(netPnl);
    const wins = closed.filter(t => netPnl(t) > 0);
    const losses = closed.filter(t => netPnl(t) < 0);
    const total = pnls.reduce((a, b) => a + b, 0);
    const winRate = closed.length ? (wins.length / closed.length * 100).toFixed(1) : '0.0';
    const avgWin  = wins.length   ? wins.map(netPnl).reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.map(netPnl).reduce((a, b) => a + b, 0) / losses.length) : 0;
    const rr = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : null;
    const rVals = closed.filter(t => t.r_value != null).map(t => parseFloat(t.r_value)).filter(v => !isNaN(v));
    const avgR = rVals.length ? (rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(2) : null;
    const expectancy = wins.length && losses.length
      ? ((parseFloat(winRate) / 100 * avgWin) - ((1 - parseFloat(winRate) / 100) * avgLoss)).toFixed(2)
      : null;

    // Max drawdown
    let peak = 0, maxDD = 0, cum = 0;
    for (const p of pnls) { cum += p; if (cum > peak) peak = cum; maxDD = Math.max(maxDD, peak - cum); }

    // Best/worst streaks
    let streak = 0, maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
    for (const p of pnls) {
      if (p > 0) { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin); }
      else        { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss); }
    }
    return { total, wins: wins.length, losses: losses.length, count: closed.length, winRate, avgWin, avgLoss, rr, avgR, expectancy, maxDD, maxWin, maxLoss };
  }, [closed]);

  // Setup breakdown
  const setupData = useMemo(() => groupStats(closed, t => t.setup || '(ללא setup)'), [closed]);

  // Direction breakdown (Long vs Short)
  const directionData = useMemo(() => groupStats(closed, t => t.direction === 'S' ? 'Short' : 'Long'), [closed]);

  // Sector breakdown
  const sectorData = useMemo(() => groupStats(closed.filter(t => t.sector), t => t.sector), [closed]);

  // Execution score breakdown (self-graded discipline, 1-5)
  const execScoreData = useMemo(() => groupStats(closed.filter(t => t.execution_score), t => `${t.execution_score} ★`).sort((a, b) => b.key.localeCompare(a.key)), [closed]);

  // Holding time — winners vs losers
  const holdingData = useMemo(() => {
    const withHold = closed.map(t => ({ t, days: holdingDays(t) })).filter(x => x.days != null);
    const winners = withHold.filter(x => netPnl(x.t) > 0).map(x => x.days);
    const losers  = withHold.filter(x => netPnl(x.t) <= 0).map(x => x.days);
    const all     = withHold.map(x => x.days);

    // Buckets for avg P&L by holding period
    const bucketOf = d => d === 0 ? '0 (יומי)' : d <= 2 ? '1-2' : d <= 5 ? '3-5' : d <= 10 ? '6-10' : d <= 20 ? '11-20' : '20+';
    const order = ['0 (יומי)', '1-2', '3-5', '6-10', '11-20', '20+'];
    const buckets = {};
    for (const x of withHold) {
      const b = bucketOf(x.days);
      if (!buckets[b]) buckets[b] = [];
      buckets[b].push(netPnl(x.t));
    }
    const bucketData = order.filter(b => buckets[b]?.length).map(b => ({
      label: b,
      avgPnl: parseFloat((avg(buckets[b]) || 0).toFixed(2)),
      count: buckets[b].length,
    }));

    return {
      sampleCount: withHold.length,
      avgWin:  avg(winners) != null ? parseFloat(avg(winners).toFixed(1)) : null,
      avgLoss: avg(losers)  != null ? parseFloat(avg(losers).toFixed(1))  : null,
      avgAll:  avg(all)     != null ? parseFloat(avg(all).toFixed(1))     : null,
      maxHold: all.length ? Math.max(...all) : null,
      bucketData,
    };
  }, [closed]);

  // Day of week
  const dowData = useMemo(() => {
    const map = {};
    for (const t of closed) {
      const d = new Date(t.date).getDay();
      if (!map[d]) map[d] = [];
      map[d].push(netPnl(t));
    }
    return [1, 2, 3, 4, 5].map(d => ({
      label: DAYS[d],
      avgPnl: map[d]?.length ? parseFloat((map[d].reduce((a, b) => a + b, 0) / map[d].length).toFixed(2)) : 0,
      count:  map[d]?.length || 0,
    }));
  }, [closed]);

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const map = {};
    for (const t of closed) {
      const key = t.date.slice(0, 7); // YYYY-MM
      if (!map[key]) map[key] = 0;
      map[key] += netPnl(t);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => ({
      label: k.slice(5) + '/' + k.slice(2, 4),
      month: parseInt(k.slice(5)) - 1,
      totalPnl: parseFloat(v.toFixed(2)),
    }));
  }, [closed]);

  // Rules impact
  const rulesData = useMemo(() => boolBreakdown(closed, t => t.followed_rules), [closed]);

  // 3-way alignment checklist: sector leading + relative strength
  const sectorLeadData = useMemo(() => boolBreakdown(closed, t => t.sector_leading), [closed]);
  const rsStrongData   = useMemo(() => boolBreakdown(closed, t => t.rs_strong), [closed]);

  const TF_BTNS = ['1M', '3M', 'YTD', 'ALL'];
  const hasRules      = closed.some(t => t.followed_rules != null);
  const hasSectorLead  = closed.some(t => t.sector_leading != null);
  const hasRsStrong    = closed.some(t => t.rs_strong != null);

  if (!closed.length) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-faint)' }}>
      <BarChart2 size={36} style={{ marginBottom: 12, opacity: 0.35 }} />
      <div style={{ fontSize: 15 }}>אין עסקאות לניתוח</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>הוסף עסקאות כדי לראות את הביצועים שלך</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header + timeframe */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Analytics — Edge Improvement</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{closed.length} עסקאות</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {TF_BTNS.map(t => (
            <button key={t} onClick={() => setTf(t)} style={{
              fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tf === t ? 'var(--navy)' : 'var(--bg-card)',
              color: tf === t ? '#fff' : 'var(--text-muted)',
              fontWeight: tf === t ? 600 : 400, fontFamily: 'inherit',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        <Stat label="Net P&L"      value={fmt$(stats.total)}               color={stats.total >= 0 ? 'var(--green)' : 'var(--red)'} sub={`${stats.count} עסקאות`} />
        <Stat label="Win Rate"     value={`${stats.winRate}%`}             color={parseFloat(stats.winRate) >= 50 ? 'var(--green)' : 'var(--red)'} sub={`${stats.wins}W / ${stats.losses}L`} />
        <Stat label="Avg R"        value={stats.avgR ? `${stats.avgR >= 0 ? '+' : ''}${stats.avgR}R` : '—'} color="var(--navy)" sub="לעסקה" />
        <Stat label="Expectancy"   value={stats.expectancy ? fmt$(parseFloat(stats.expectancy)) : '—'} color={stats.expectancy >= 0 ? 'var(--green)' : 'var(--red)'} sub="לעסקה" />
        <Stat label="Risk/Reward"  value={stats.rr ? `1 : ${stats.rr}` : '—'} color="var(--navy)" sub="הפסד : רווח" />
        <Stat label="Max Drawdown" value={`-$${stats.maxDD.toFixed(2)}`}   color="var(--red)"  sub="ירידה מקסימאלית" />
        <Stat label="Win Streak"   value={stats.maxWin}                    color="var(--green)" sub="ניצחונות ברצף" />
        <Stat label="Loss Streak"  value={stats.maxLoss}                   color="var(--red)"  sub="הפסדים ברצף" />
      </div>

      {/* Equity Curve */}
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={15} /> עקומת הון (Equity Curve)
          <span style={{ marginLeft: 'auto', fontSize: 20, fontWeight: 800, color: equityPoints[equityPoints.length - 1]?.cum >= 0 ? 'var(--green)' : 'var(--red)' }} className="amount">
            {equityPoints.length ? fmt$(equityPoints[equityPoints.length - 1].cum) : '—'}
          </span>
        </div>
        <EquityCurve points={equityPoints} width={760} height={220} />
      </div>

      {/* Holding time — winners vs losers */}
      {holdingData.sampleCount > 0 && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={15} /> זמן אחזקה (Holding Time)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 12 }}>
            מבוסס על {holdingData.sampleCount} עסקאות עם תאריך יציאה מוזן
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: holdingData.bucketData.length > 1 ? 16 : 0 }}>
            <Stat label="ממוצע — מנצחות" value={holdingData.avgWin != null ? `${holdingData.avgWin} ימים` : '—'} color="var(--green)" />
            <Stat label="ממוצע — מפסידות" value={holdingData.avgLoss != null ? `${holdingData.avgLoss} ימים` : '—'} color="var(--red)" />
            <Stat label="ממוצע — כללי" value={holdingData.avgAll != null ? `${holdingData.avgAll} ימים` : '—'} color="var(--navy)" />
            <Stat label="אחזקה מקסימלית" value={holdingData.maxHold != null ? `${holdingData.maxHold} ימים` : '—'} />
          </div>
          {holdingData.bucketData.length > 1 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>ממוצע P&L לפי משך אחזקה</div>
              <BarChart
                data={holdingData.bucketData}
                valueKey="avgPnl"
                colorFn={v => v >= 0 ? '#16a34a' : '#dc2626'}
                width={760} height={150}
                fmt={v => `$${Math.abs(v).toFixed(0)}`}
              />
            </>
          )}
        </div>
      )}

      {/* Setup breakdown table */}
      <GroupTable icon={Target} title="ביצועים לפי Setup" firstCol="Setup" data={setupData.length === 1 && setupData[0].key === '(ללא setup)' ? [] : setupData} emptyText="הוסף שם setup לעסקאות כדי לראות ניתוח כאן" />

      {/* Direction + Sector breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: sectorData.length ? '1fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
        <GroupTable icon={ArrowUpDown} title="ביצועים לפי כיוון (Long / Short)" firstCol="כיוון" data={directionData} emptyText="אין עסקאות" />
        {sectorData.length > 0 && (
          <GroupTable icon={Layers} title="ביצועים לפי סקטור" firstCol="סקטור" data={sectorData} emptyText="הוסף סקטור לעסקאות כדי לראות ניתוח כאן" />
        )}
      </div>

      {/* Execution score + quality checklist */}
      {(execScoreData.length > 0 || hasSectorLead || hasRsStrong) && (
        <div style={{ display: 'grid', gridTemplateColumns: execScoreData.length ? '1fr 1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>
          {execScoreData.length > 0 && (
            <GroupTable icon={Star} title="ביצועים לפי ציון ביצוע (Execution Score)" firstCol="ציון" data={execScoreData} emptyText="אין נתונים" />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {hasSectorLead && (
              <BooleanImpact icon={Layers} title="הסקטור מוביל?" yesLabel="🏭 כן — הסקטור הוביל" noLabel="🏭 לא — הסקטור לא הוביל" yes={sectorLeadData.yes} no={sectorLeadData.no} />
            )}
            {hasRsStrong && (
              <BooleanImpact icon={TrendingUp} title="RS חזק (מוביל את השוק)?" yesLabel="💪 כן — RS חזק" noLabel="💪 לא — RS חלש" yes={rsStrongData.yes} no={rsStrongData.no} />
            )}
          </div>
        </div>
      )}

      {/* Rules impact */}
      {hasRules && (
        <BooleanImpact icon={Award} title="עמידה בכללים" yesLabel="✓ עקבתי לכללים" noLabel="✗ לא עקבתי לכללים" yes={rulesData.yes} no={rulesData.no} />
      )}

      {/* Day of week + Monthly */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Day of week */}
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} /> ממוצע P&L לפי יום
          </div>
          <BarChart
            data={dowData}
            valueKey="avgPnl"
            colorFn={v => v >= 0 ? '#16a34a' : '#dc2626'}
            width={300} height={160}
            fmt={v => `$${Math.abs(v).toFixed(0)}`}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {dowData.map(d => (
              <div key={d.label} style={{ fontSize: 10, color: 'var(--text-faint)', textAlign: 'center' }}>
                <span style={{ fontWeight: 700, color: d.avgPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{d.label}</span>
                <br/>{d.count} עסקאות
              </div>
            ))}
          </div>
        </div>

        {/* Monthly P&L */}
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={15} /> P&L חודשי
          </div>
          {monthlyData.length > 0 ? (
            <BarChart
              data={monthlyData}
              valueKey="totalPnl"
              colorFn={v => v >= 0 ? '#16a34a' : '#dc2626'}
              width={300} height={160}
              fmt={v => v >= 1000 || v <= -1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.abs(v).toFixed(0)}`}
            />
          ) : (
            <div style={{ color: 'var(--text-faint)', fontSize: 13 }}>אין נתונים</div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {monthlyData.map(m => (
              <div key={m.label} style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 5,
                background: m.totalPnl >= 0 ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.1)',
                color: m.totalPnl >= 0 ? 'var(--green)' : 'var(--red)',
                fontWeight: 600,
              }}>
                {m.label}: {fmt$(m.totalPnl)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edge summary box */}
      <div style={{ background: 'var(--navy)', borderRadius: 12, padding: '18px 22px', color: '#fff' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>סיכום Edge</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13, lineHeight: 1.6 }}>
          {setupData.length > 1 && (
            <div>
              <span style={{ color: '#94a3b8' }}>הסטאפ הרווחי ביותר: </span>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>{setupData[0].key}</span>
              <span style={{ color: '#94a3b8' }}> — win rate </span>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>{setupData[0].winRate}%</span>
              <span style={{ color: '#94a3b8' }}>, avg </span>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>{fmt$(setupData[0].avgPnl)}</span>
            </div>
          )}
          {setupData.length > 1 && (
            <div>
              <span style={{ color: '#94a3b8' }}>הסטאפ הכי פחות יעיל: </span>
              <span style={{ color: '#f87171', fontWeight: 700 }}>{setupData[setupData.length - 1].key}</span>
              <span style={{ color: '#94a3b8' }}> — שקול לדלג עליו</span>
            </div>
          )}
          {directionData.length > 1 && (() => {
            const best = [...directionData].sort((a, b) => b.avgPnl - a.avgPnl)[0];
            return (
              <div>
                <span style={{ color: '#94a3b8' }}>עדיף לך לסחור: </span>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>{best.key}</span>
                <span style={{ color: '#94a3b8' }}> — win rate </span>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>{best.winRate}%</span>
                <span style={{ color: '#94a3b8' }}>, avg </span>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>{fmt$(best.avgPnl)}</span>
              </div>
            );
          })()}
          {holdingData.avgWin != null && holdingData.avgLoss != null && (
            <div>
              <span style={{ color: '#94a3b8' }}>זמן אחזקה — מנצחות: </span>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>{holdingData.avgWin} ימים</span>
              <span style={{ color: '#94a3b8' }}> | מפסידות: </span>
              <span style={{ color: '#f87171', fontWeight: 700 }}>{holdingData.avgLoss} ימים</span>
              <span style={{ color: '#94a3b8' }}>
                {' — '}{holdingData.avgWin > holdingData.avgLoss ? 'אתה נותן לרווחים לרוץ ✓' : 'שקול לתת לעסקאות מנצחות יותר זמן להתפתח'}
              </span>
            </div>
          )}
          {(() => {
            const bestDay = [...dowData].sort((a, b) => b.avgPnl - a.avgPnl)[0];
            const worstDay = [...dowData].sort((a, b) => a.avgPnl - b.avgPnl)[0];
            if (!bestDay?.count) return null;
            return (
              <div>
                <span style={{ color: '#94a3b8' }}>היום הטוב ביותר: </span>
                <span style={{ color: '#4ade80', fontWeight: 700 }}>{bestDay.label}</span>
                <span style={{ color: '#94a3b8' }}> ({fmt$(bestDay.avgPnl)} בממוצע) | היום הקשה: </span>
                <span style={{ color: '#f87171', fontWeight: 700 }}>{worstDay.label}</span>
              </div>
            );
          })()}
          {stats.expectancy != null && (
            <div>
              <span style={{ color: '#94a3b8' }}>Expectancy: </span>
              <span style={{ color: parseFloat(stats.expectancy) >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>{fmt$(parseFloat(stats.expectancy))} לעסקה</span>
              <span style={{ color: '#94a3b8' }}> — {parseFloat(stats.expectancy) >= 0 ? 'יש לך edge חיובי' : 'ה-edge שלילי, בדוק את השיטה'}</span>
            </div>
          )}
          {hasRules && rulesData.yes.avg != null && rulesData.no.avg != null && (
            <div>
              <span style={{ color: '#94a3b8' }}>כשעקבת לכללים: </span>
              <span style={{ color: '#4ade80', fontWeight: 700 }}>{fmt$(rulesData.yes.avg)}</span>
              <span style={{ color: '#94a3b8' }}> ממוצע | כשלא: </span>
              <span style={{ color: '#f87171', fontWeight: 700 }}>{fmt$(rulesData.no.avg || 0)}</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
