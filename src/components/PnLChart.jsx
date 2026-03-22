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

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const color = d.cumPnl >= 0 ? 'var(--green)' : 'var(--red)';
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4 }}>{d.date}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: 'monospace' }}>
        {d.cumPnl >= 0 ? '+' : ''}${d.cumPnl.toFixed(2)}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
        Trade: {d.pnl >= 0 ? '+' : ''}${d.pnl.toFixed(2)}
      </div>
    </div>
  );
};

export default function PnLChart({ trades }) {
  const [range, setRange] = useState('ALL');

  const data = useMemo(() => {
    const filtered = filterByRange(
      trades.filter(t => t.pnl != null),
      range
    ).sort((a, b) => new Date(a.date) - new Date(b.date));

    let cum = 0;
    return filtered.map(t => {
      cum += parseFloat(t.pnl) || 0;
      return {
        date: format(new Date(t.date), 'MMM d'),
        pnl: parseFloat(t.pnl) || 0,
        cumPnl: Math.round(cum * 100) / 100,
      };
    });
  }, [trades, range]);

  const isPositive = data.length > 0 && data[data.length - 1]?.cumPnl >= 0;
  const lineColor = isPositive ? '#22c55e' : '#ef4444';
  const gradId = isPositive ? 'gradGreen' : 'gradRed';

  return (
    <div className="panel" style={{ height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Cumulative P&L</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: range === r.key ? 'var(--blue)' : 'var(--bg-card)',
                color: range === r.key ? '#fff' : 'var(--text-muted)',
                fontWeight: range === r.key ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >{r.label}</button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
          No trades in this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={55} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="var(--border-light)" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="cumPnl" stroke={lineColor} strokeWidth={2} fill={`url(#${gradId})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
