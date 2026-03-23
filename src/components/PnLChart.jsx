import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, subDays, subMonths, startOfYear } from 'date-fns';

const RANGES = [
  { key: '1W', label: '1W' },
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: 'YTD', label: 'YTD' },
  { key: 'ALL', label: 'All' },
];

function filterByRange(trades, range) {
  const now = new Date();
  const cutoff = {
    '1W':  subDays(now, 7),
    '1M':  subMonths(now, 1),
    '3M':  subMonths(now, 3),
    'YTD': startOfYear(now),
    'ALL': new Date(0),
  }[range];
  return trades.filter(t => new Date(t.date) >= cutoff);
}

const CustomTooltip = ({ active, payload, mode }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isPos = d.cumPnl >= 0;
  const color = isPos ? 'var(--green)' : 'var(--red)';
  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-md)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 5 }}>{d.date}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color }}>
        {mode === '%'
          ? `${d.cumPct >= 0 ? '+' : ''}${d.cumPct.toFixed(2)}%`
          : `${d.cumPnl >= 0 ? '+' : ''}$${d.cumPnl.toFixed(2)}`}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
        Trade: {d.pnl >= 0 ? '+' : ''}${d.pnl.toFixed(2)}
      </div>
    </div>
  );
};

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
        background: active ? 'var(--navy)' : 'var(--bg-card)',
        color: active ? '#fff' : 'var(--text-muted)',
        fontWeight: active ? 600 : 400,
        transition: 'all 0.15s',
        fontFamily: 'inherit',
      }}
    >{children}</button>
  );
}

export default function PnLChart({ trades }) {
  const [range, setRange] = useState('ALL');
  const [mode, setMode] = useState('$');

  const data = useMemo(() => {
    const filtered = filterByRange(
      trades.filter(t => t.pnl != null),
      range
    ).sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalCost = filtered.reduce((sum, t) => {
      return sum + Math.abs((parseFloat(t.entry) || 0) * (parseFloat(t.quantity) || 0));
    }, 0);

    let cum = 0;
    return filtered.map(t => {
      const pnl = parseFloat(t.pnl) || 0;
      cum += pnl;
      const cumPct = totalCost > 0 ? (cum / totalCost) * 100 : 0;
      return {
        date: format(new Date(t.date), 'MMM d'),
        pnl,
        cumPnl: Math.round(cum * 100) / 100,
        cumPct: Math.round(cumPct * 100) / 100,
      };
    });
  }, [trades, range]);

  const activeValue = mode === '%' ? 'cumPct' : 'cumPnl';
  const finalVal = data.length > 0 ? data[data.length - 1]?.[activeValue] ?? 0 : 0;
  const isPositive = finalVal >= 0;
  const lineColor = isPositive ? 'var(--green)' : 'var(--red)';
  const fillColor = isPositive ? '#059669' : '#DC2626';
  const gradId = isPositive ? 'gradPos' : 'gradNeg';

  const tickFmt = mode === '%' ? v => `${v}%` : v => `$${v}`;

  return (
    <div className="panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Cumulative P&amp;L</span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {RANGES.map(r => (
            <FilterBtn key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>{r.label}</FilterBtn>
          ))}
          <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
          <FilterBtn active={mode === '$'} onClick={() => setMode('$')}>$</FilterBtn>
          <FilterBtn active={mode === '%'} onClick={() => setMode('%')}>%</FilterBtn>
        </div>
      </div>

      {data.length === 0 ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
          No trades in this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={fillColor} stopOpacity={0.12}/>
                <stop offset="95%" stopColor={fillColor} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={fillColor} stopOpacity={0.12}/>
                <stop offset="95%" stopColor={fillColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={tickFmt} width={58} />
            <Tooltip content={<CustomTooltip mode={mode} />} />
            <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
            <Area type="monotone" dataKey={activeValue} stroke={lineColor} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
