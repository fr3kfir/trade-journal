import { useMemo, useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { format, parseISO, subDays, subMonths, startOfYear, differenceInDays } from 'date-fns';
import { Settings } from 'lucide-react';

const INDICES = [
  { symbol: '^GSPC', label: 'S&P 500',      color: '#6366f1' },
  { symbol: '^IXIC', label: 'Nasdaq',       color: '#f59e0b' },
  { symbol: '^DJI',  label: 'Dow Jones',    color: '#0ea5e9' },
  { symbol: '^RUT',  label: 'Russell 2000', color: '#ec4899' },
];

const DEFAULT_ACTIVE = { '^GSPC': true, '^IXIC': true, '^DJI': false, '^RUT': false };

const ymd = d => format(d, 'yyyy-MM-dd');
const netPnl = t => (parseFloat(t.pnl) || 0) - (parseFloat(t.commission) || 0);
const fmtPct = v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

function startDateFor(timeframe, trades) {
  const now = new Date();
  if (timeframe === '1W')  return ymd(subDays(now, 7));
  if (timeframe === '1M')  return ymd(subMonths(now, 1));
  if (timeframe === '3M')  return ymd(subMonths(now, 3));
  if (timeframe === 'YTD') return ymd(startOfYear(now));
  const dates = trades.filter(t => t.pnl != null && t.date).map(t => t.date.slice(0, 10)).sort();
  return dates[0] || ymd(startOfYear(now));
}

function loadActive() {
  try {
    const saved = JSON.parse(localStorage.getItem('apex_benchmark_indices'));
    if (saved && typeof saved === 'object') return { ...DEFAULT_ACTIVE, ...saved };
  } catch { /* storage unavailable */ }
  return DEFAULT_ACTIVE;
}

// Rebases each index to 0% at the last close before `start`, and lines up the
// account's cumulative net P&L (as % of account size) on the same dates.
function buildSeries(trades, indicesData, start, accountSize) {
  const closed = trades
    .filter(t => t.pnl != null && t.date && t.date.slice(0, 10) >= start)
    .map(t => ({ date: t.date.slice(0, 10), pnl: netPnl(t) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const series = {};
  let baseDate = ymd(subDays(parseISO(start), 1));
  for (const [sym, pts] of Object.entries(indicesData)) {
    if (!pts.length) continue;
    const before = pts.filter(p => p.date < start);
    const base = before.at(-1) || pts[0];
    if (before.length && base.date < baseDate) baseDate = base.date;
    series[sym] = pts
      .filter(p => p.date >= start && p !== base)
      .map(p => ({ date: p.date, pct: (p.close / base.close - 1) * 100 }));
  }

  const dates = new Set(closed.map(t => t.date));
  for (const pts of Object.values(series)) pts.forEach(p => dates.add(p.date));
  const axis = [...dates].sort();

  const rows = [{ dateKey: baseDate, me: accountSize > 0 ? 0 : null, ...Object.fromEntries(Object.keys(series).map(s => [s, 0])) }];
  let cum = 0, ti = 0;
  const cursor = Object.fromEntries(Object.keys(series).map(s => [s, { i: 0, last: 0 }]));
  for (const d of axis) {
    while (ti < closed.length && closed[ti].date <= d) cum += closed[ti++].pnl;
    const row = { dateKey: d, me: accountSize > 0 ? Math.round((cum / accountSize) * 10000) / 100 : null };
    for (const [sym, pts] of Object.entries(series)) {
      const c = cursor[sym];
      while (c.i < pts.length && pts[c.i].date <= d) c.last = pts[c.i++].pct;
      row[sym] = Math.round(c.last * 100) / 100;
    }
    rows.push(row);
  }
  return rows;
}

const CustomTooltip = ({ active, payload, labelFmt, activeIdx }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-md)', minWidth: 150 }}>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 5 }}>{labelFmt(d.dateKey)}</div>
      {d.me != null && (
        <div style={{ fontSize: 14, fontWeight: 700, color: d.me >= 0 ? 'var(--green)' : 'var(--red)' }}>
          Me: {fmtPct(d.me)}
        </div>
      )}
      {activeIdx.map(idx => d[idx.symbol] != null && (
        <div key={idx.symbol} style={{ fontSize: 11, color: idx.color, marginTop: 2 }}>
          {idx.label}: {fmtPct(d[idx.symbol])}
        </div>
      ))}
    </div>
  );
};

export default function BenchmarkChart({ trades, timeframe }) {
  const [active,         setActive]         = useState(loadActive);
  // { key, data, error } — key identifies the request the data answers
  const [fetched,        setFetched]        = useState({ key: '', data: {}, error: '' });
  const [accountSize,    setAccountSize]    = useState(() => parseFloat(localStorage.getItem('apex_account_size')) || 0);
  const [editingAccount, setEditingAccount] = useState(false);
  const [accountDraft,   setAccountDraft]   = useState('');
  const [ibkrNav,        setIbkrNav]        = useState(null);

  // Same source as the Portfolio page: the NAV from the last IBKR sync.
  useEffect(() => {
    fetch('/api/ibkr?step=portfolio')
      .then(r => r.json())
      .then(d => { if (d?.nav > 0) setIbkrNav(d.nav); })
      .catch(() => {});
  }, []);

  const start    = useMemo(() => startDateFor(timeframe, trades), [timeframe, trades]);
  // IBKR NAV is today's equity, so the period's starting capital is NAV minus
  // the P&L made since the start. A manually entered size is used as-is.
  const periodPnl = useMemo(
    () => trades.filter(t => t.pnl != null && t.date && t.date.slice(0, 10) >= start).reduce((a, t) => a + netPnl(t), 0),
    [trades, start],
  );
  const baseCapital = ibkrNav ? ibkrNav - periodPnl : accountSize;
  const longSpan = differenceInDays(new Date(), parseISO(start)) > 400;
  const activeIdx = INDICES.filter(i => active[i.symbol]);
  const activeKey = activeIdx.map(i => i.symbol).join(',');
  const interval  = longSpan ? '1wk' : '1d';
  const requestKey = `${activeKey}|${start}|${interval}`;
  const loading     = !!activeKey && fetched.key !== requestKey;
  const indicesData = fetched.data;
  const error       = fetched.key === requestKey ? fetched.error : '';

  useEffect(() => {
    try { localStorage.setItem('apex_benchmark_indices', JSON.stringify(active)); } catch { /* storage unavailable */ }
  }, [active]);

  useEffect(() => {
    const symbols = activeKey ? activeKey.split(',') : [];
    if (!symbols.length) return;
    let cancelled = false;
    // Fetch a few days before the start so we have a close to rebase from.
    const from = ymd(subDays(parseISO(start), 7));
    Promise.all(symbols.map(sym =>
      fetch(`/api/indices?symbol=${encodeURIComponent(sym)}&from=${from}&interval=${interval}`)
        .then(r => r.json())
        .then(d => [sym, d.points || [], d.error])
        .catch(e => [sym, [], e.message])
    )).then(results => {
      if (cancelled) return;
      setFetched({
        key:   requestKey,
        data:  Object.fromEntries(results.map(([s, p]) => [s, p])),
        error: results.every(([, p]) => !p.length) ? 'Could not load index data' : '',
      });
    });
    return () => { cancelled = true; };
  }, [activeKey, start, interval, requestKey]);

  const data = useMemo(() => {
    const shown = Object.fromEntries(Object.entries(indicesData).filter(([s]) => active[s]));
    return buildSeries(trades, shown, start, baseCapital);
  }, [trades, indicesData, active, start, baseCapital]);

  const last     = data.at(-1) || {};
  const myFinal  = last.me;
  const meColor  = (myFinal ?? 0) >= 0 ? 'var(--green)' : 'var(--red)';
  const labelFmt = k => format(parseISO(k), longSpan ? 'MMM d, yyyy' : 'MMM d');
  const tickFmt  = k => format(parseISO(k), longSpan ? 'MMM yy' : 'MMM d');

  const saveAccount = () => {
    const v = parseFloat(accountDraft);
    if (v > 0) { setAccountSize(v); localStorage.setItem('apex_account_size', v); }
    setEditingAccount(false);
  };

  return (
    <div className="panel">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Performance vs. Indices</span>
          {ibkrNav ? (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 6px' }}>
              NAV ${Math.round(ibkrNav).toLocaleString()} · IBKR
            </span>
          ) : editingAccount ? (
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
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {INDICES.map(idx => {
            const on = active[idx.symbol];
            return (
              <button key={idx.symbol}
                onClick={() => setActive(p => ({ ...p, [idx.symbol]: !p[idx.symbol] }))}
                style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 6, border: '1px solid',
                  borderColor: on ? idx.color : 'var(--border)',
                  background: on ? `${idx.color}18` : 'transparent',
                  color: on ? idx.color : 'var(--text-faint)',
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.15s',
                }}>
                {idx.label}{loading && on ? ' …' : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Period summary */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10, fontSize: 12 }}>
        {myFinal != null && (
          <span style={{ color: meColor, fontWeight: 700 }}>Me {fmtPct(myFinal)}</span>
        )}
        {activeIdx.map(idx => last[idx.symbol] != null && (
          <span key={idx.symbol} style={{ color: idx.color }}>
            {idx.label} {fmtPct(last[idx.symbol])}
            {myFinal != null && (
              <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                (you {myFinal - last[idx.symbol] >= 0 ? '+' : ''}{(myFinal - last[idx.symbol]).toFixed(2)} pts)
              </span>
            )}
          </span>
        ))}
      </div>

      {baseCapital <= 0 && (
        <div style={{ fontSize: 12, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: 6, padding: '6px 12px', marginBottom: 10 }}>
          ⚠ הכנס את גודל החשבון (למעלה) כדי לראות את התשואה שלך באחוזים מול המדדים
        </div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>{error}</div>
      )}

      {data.length <= 1 ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
          {loading ? 'Loading…' : 'No data for this period'}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="dateKey" tickFormatter={tickFmt} tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} width={48} />
            <Tooltip content={<CustomTooltip labelFmt={labelFmt} activeIdx={activeIdx} />} />
            <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
            {activeIdx.map(idx => (
              <Line key={idx.symbol} type="monotone" dataKey={idx.symbol} stroke={idx.color} strokeWidth={1.5}
                strokeDasharray="5 3" dot={false} activeDot={{ r: 3, fill: idx.color }} connectNulls isAnimationActive={false} />
            ))}
            {baseCapital > 0 && (
              <Line type="monotone" dataKey="me" name="Me" stroke={meColor} strokeWidth={2.5}
                dot={false} activeDot={{ r: 4, fill: meColor, strokeWidth: 0 }} connectNulls isAnimationActive={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
