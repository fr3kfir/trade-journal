import { useMemo, useState, useEffect } from 'react';
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format, subDays, subMonths, startOfYear, startOfWeek, parseISO } from 'date-fns';
import { Settings } from 'lucide-react';

const RANGES = [
  { key: '1W',  label: '1W',  yahooRange: '5d',  yahooInterval: '1d'  },
  { key: '1M',  label: '1M',  yahooRange: '1mo', yahooInterval: '1d'  },
  { key: '3M',  label: '3M',  yahooRange: '3mo', yahooInterval: '1wk' },
  { key: 'YTD', label: 'YTD', yahooRange: 'ytd', yahooInterval: '1mo' },
  { key: 'ALL', label: 'All', yahooRange: '5y',  yahooInterval: '1mo' },
];

const INDICES = [
  { symbol: '^GSPC', label: 'S&P 500', color: '#6366f1' },
  { symbol: '^IXIC', label: 'Nasdaq',  color: '#f59e0b' },
];

function getBucket(dateStr, range) {
  const d = parseISO(dateStr);
  if (range === '1W' || range === '1M') {
    return { key: format(d, 'yyyy-MM-dd'), label: format(d, 'MMM d') };
  }
  if (range === '3M') {
    const ws = startOfWeek(d, { weekStartsOn: 1 });
    return { key: format(ws, 'yyyy-MM-dd'), label: format(ws, 'MMM d') };
  }
  return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy') };
}

function cutoffDate(range) {
  const now = new Date();
  return {
    '1W':  subDays(now, 7),
    '1M':  subMonths(now, 1),
    '3M':  subMonths(now, 3),
    'YTD': startOfYear(now),
    'ALL': new Date(0),
  }[range];
}

function buildTradeData(trades, range, accountSize) {
  const closed = trades
    .filter(t => t.pnl != null && t.date && new Date(t.date) >= cutoffDate(range))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const buckets = new Map();
  for (const t of closed) {
    const { key, label } = getBucket(t.date, range);
    if (!buckets.has(key)) buckets.set(key, { key, label, pnl: 0, r: 0, rCount: 0, count: 0 });
    const b = buckets.get(key);
    b.pnl   += parseFloat(t.pnl) || 0;
    const rv = parseFloat(t.r_value);
    if (!isNaN(rv)) { b.r += rv; b.rCount++; }
    b.count++;
  }

  let cum = 0, cumR = 0;
  return [...buckets.values()].map(b => {
    cum  += b.pnl;
    cumR += b.r;
    return {
      date:    b.label,
      dateKey: b.key,
      pnl:     Math.round(b.pnl  * 100) / 100,
      r:       Math.round(b.r    * 100) / 100,
      hasR:    b.rCount > 0,
      count:   b.count,
      cumPnl:  Math.round(cum  * 100) / 100,
      cumR:    Math.round(cumR * 100) / 100,
      cumPct:  accountSize > 0 ? Math.round((cum / accountSize) * 10000) / 100 : null,
    };
  });
}

function mergeIndices(tradeData, indicesData) {
  return tradeData.map(point => {
    const merged = { ...point };
    for (const [sym, pts] of Object.entries(indicesData)) {
      const match = [...pts].reverse().find(p => p.date <= point.dateKey);
      merged[sym] = match?.pct ?? null;
    }
    return merged;
  });
}

const CustomTooltip = ({ active, payload, mode, showIndices }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const mainKey = mode === 'R' ? 'cumR' : mode === '%' ? 'cumPct' : 'cumPnl';
  const val = d[mainKey];
  if (val == null) return null;

  const isPos = val >= 0;
  const color = isPos ? 'var(--green)' : 'var(--red)';
  const fmtVal = mode === '%' ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`
               :               `${val >= 0 ? '+' : ''}$${Math.abs(val).toFixed(2)}`;
  const fmtPeriod = `${d.pnl >= 0 ? '+' : ''}$${Math.abs(d.pnl).toFixed(2)}`;

  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-md)', minWidth: 150 }}>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 5 }}>{d.date}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color }}>{fmtVal} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>cum.</span></div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
        Period: {fmtPeriod}{d.count > 1 ? ` (${d.count} trades)` : ''}
      </div>
      {showIndices && INDICES.map(idx => d[idx.symbol] != null && (
        <div key={idx.symbol} style={{ fontSize: 11, color: idx.color, marginTop: 2 }}>
          {idx.label}: {d[idx.symbol] >= 0 ? '+' : ''}{d[idx.symbol].toFixed(2)}%
        </div>
      ))}
    </div>
  );
};

function Btn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
      background: active ? 'var(--navy)' : 'var(--bg-card)',
      color: active ? '#fff' : 'var(--text-muted)',
      fontWeight: active ? 600 : 400, fontFamily: 'inherit', transition: 'all 0.15s',
    }}>{children}</button>
  );
}

export default function PnLChart({ trades, externalRange }) {
  const [range,          setRange]          = useState(externalRange || 'YTD');

  useEffect(() => {
    if (externalRange) setRange(externalRange);
  }, [externalRange]);
  const [mode,           setMode]           = useState('$');
  const [accountSize,    setAccountSize]    = useState(() => parseFloat(localStorage.getItem('apex_account_size')) || 0);
  const [editingAccount, setEditingAccount] = useState(false);
  const [accountDraft,   setAccountDraft]   = useState('');
  const [activeIndices,  setActiveIndices]  = useState({ '^GSPC': false, '^IXIC': false });
  const [indicesData,    setIndicesData]    = useState({});
  const [loadingIdx,     setLoadingIdx]     = useState(false);

  const showIndices = Object.values(activeIndices).some(Boolean);

  useEffect(() => {
    if (!showIndices) return;
    const ro = RANGES.find(r => r.key === range);
    setLoadingIdx(true);
    Promise.all(
      INDICES.filter(i => activeIndices[i.symbol]).map(i =>
        fetch(`/api/indices?symbol=${encodeURIComponent(i.symbol)}&range=${ro.yahooRange}&interval=${ro.yahooInterval}`)
          .then(r => r.json())
          .then(d => [i.symbol, d.points || []])
          .catch(() => [i.symbol, []])
      )
    ).then(results => { setIndicesData(Object.fromEntries(results)); setLoadingIdx(false); });
  }, [showIndices, range, activeIndices]);

  const tradeData = useMemo(() => buildTradeData(trades, range, accountSize), [trades, range, accountSize]);
  const data      = useMemo(() => mergeIndices(tradeData, indicesData), [tradeData, indicesData]);

  // Warn if R values missing
  const noAccount = mode === '%' && accountSize <= 0;

  const activeKey = mode === '%' ? 'cumPct' : 'cumPnl';
  const finalVal  = data.at(-1)?.[activeKey] ?? 0;
  const isPositive = finalVal >= 0;
  const lineColor  = isPositive ? 'var(--green)' : 'var(--red)';
  const fillColor  = isPositive ? '#059669'       : '#DC2626';

  const tickFmt = mode === '%' ? v => `${v}%` : v => {
    if (Math.abs(v) >= 1000) return `$${v >= 0 ? '' : '-'}${(Math.abs(v)/1000).toFixed(1)}k`;
    return `$${v}`;
  };

  const saveAccount = () => {
    const v = parseFloat(accountDraft);
    if (v > 0) { setAccountSize(v); localStorage.setItem('apex_account_size', v); }
    setEditingAccount(false);
  };

  return (
    <div className="panel">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Cumulative P&amp;L</span>
          {editingAccount ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                className="input" autoFocus type="number" value={accountDraft}
                onChange={e => setAccountDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveAccount(); if (e.key === 'Escape') setEditingAccount(false); }}
                placeholder="Account size $" style={{ width: 120, padding: '3px 8px', fontSize: 12 }}
              />
              <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: 11 }} onClick={saveAccount}>OK</button>
            </div>
          ) : (
            <button onClick={() => { setAccountDraft(accountSize || ''); setEditingAccount(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: accountSize ? 'var(--text-muted)' : 'var(--navy)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 5 }}>
              <Settings size={11} />
              {accountSize ? `$${accountSize.toLocaleString()}` : 'Set account size'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {RANGES.map(r => <Btn key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>{r.label}</Btn>)}
          <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />
          <Btn active={mode === '$'} onClick={() => setMode('$')}>$</Btn>
          <Btn active={mode === '%'} onClick={() => setMode('%')}>%</Btn>
        </div>
      </div>

      {/* Index toggles */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>vs.</span>
        {INDICES.map(idx => {
          const on = activeIndices[idx.symbol];
          return (
            <button key={idx.symbol}
              onClick={() => setActiveIndices(p => ({ ...p, [idx.symbol]: !p[idx.symbol] }))}
              style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 6, border: '1px solid',
                borderColor: on ? idx.color : 'var(--border)',
                background: on ? `${idx.color}18` : 'transparent',
                color: on ? idx.color : 'var(--text-faint)',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.15s',
              }}>
              {idx.label}{loadingIdx && on ? ' …' : ''}
            </button>
          );
        })}
        {showIndices && mode !== '%' && (
          <span style={{ fontSize: 10, color: 'var(--text-faint)', fontStyle: 'italic' }}>indices as %</span>
        )}
      </div>

      {/* Warnings */}
      {noAccount && (
        <div style={{ fontSize: 12, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: 6, padding: '6px 12px', marginBottom: 10 }}>
          ⚠ הכנס את גודל החשבון (למעלה) כדי לראות אחוז תשואה מדויק
        </div>
      )}

      {data.length === 0 ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
          No trades in this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={fillColor} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={fillColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={tickFmt} width={60} />
            <Tooltip content={<CustomTooltip mode={mode} showIndices={showIndices} />} />
            <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />

            {/* Portfolio — Area */}
            <Area
              type="monotone"
              dataKey={activeKey}
              stroke={lineColor}
              strokeWidth={2.5}
              fill="url(#gradFill)"
              dot={false}
              activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
              connectNulls
            />

            {/* Index lines */}
            {INDICES.filter(i => activeIndices[i.symbol]).map(idx => (
              <Line key={idx.symbol} type="monotone" dataKey={idx.symbol}
                stroke={idx.color} strokeWidth={1.5} strokeDasharray="5 3"
                dot={false} activeDot={{ r: 3, fill: idx.color }} connectNulls />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
