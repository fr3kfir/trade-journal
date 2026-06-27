import { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { RefreshCw, Activity, TrendingUp, BarChart3, Clipboard } from 'lucide-react';
import ThemeTracker from './ThemeTracker';
import ClipboardPanel, { CLIP_COLORS, CLIP_BG } from './ClipboardPanel';

/* ─── COT TAB ─── */

const COT_MARKETS = [
  { key: 'NQ',  label: 'NQ — Nasdaq 100'  },
  { key: 'ES',  label: 'ES — S&P 500'      },
  { key: 'YM',  label: 'YM — Dow Jones'    },
  { key: 'RTY', label: 'RTY — Russell 2000' },
];

function fmtK(v) {
  if (v == null) return '';
  const abs = Math.abs(v);
  if (abs >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
}

function COTTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-panel)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow)', minWidth: 200,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 8 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ fontSize: 12, color: p.color, marginBottom: 3, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{(p.value ?? 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function COTTab() {
  const [market, setMarket]   = useState('NQ');
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const loadCOT = useCallback(async (mkt) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/cot?market=${mkt}`);
      const d = await r.json();
      if (d.error && !d.data?.length) throw new Error(d.error);
      setData(d.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCOT(market); }, [market, loadCOT]);

  const chartData = data.map(d => ({ ...d, label: d.date?.slice(5) ?? '' }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Market selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {COT_MARKETS.map(m => (
          <button
            key={m.key}
            onClick={() => setMarket(m.key)}
            style={{
              padding: '7px 16px', borderRadius: 8, border: '1px solid', fontSize: 13,
              fontWeight: market === m.key ? 700 : 400, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
              borderColor: market === m.key ? 'var(--navy)' : 'var(--border)',
              background:  market === m.key ? 'var(--navy)' : 'var(--bg-card)',
              color:       market === m.key ? '#fff' : 'var(--text-muted)',
            }}
          >{m.key}</button>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-faint)', marginLeft: 4 }}>
          {COT_MARKETS.find(m => m.key === market)?.label}
        </span>
      </div>

      {/* Chart card */}
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 12, border: '1px solid var(--border)',
        padding: 20, boxShadow: 'var(--shadow)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>COT Net Positions — {market}</span>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Weekly · CFTC · Last 52 weeks</span>
        </div>

        {loading ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
            Loading CFTC data...
          </div>
        ) : error ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', fontSize: 13 }}>
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 55, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'var(--text-faint)' }}
                axisLine={false} tickLine={false} interval={5}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 9, fill: 'var(--text-faint)' }}
                axisLine={false} tickLine={false} tickFormatter={fmtK} width={52}
              />
              <YAxis
                yAxisId="right" orientation="right"
                tick={{ fontSize: 9, fill: '#22c55e' }}
                axisLine={false} tickLine={false} tickFormatter={fmtK} width={52}
              />
              <Tooltip content={<COTTooltip />} />
              <ReferenceLine yAxisId="left" y={0} stroke="var(--border)" strokeDasharray="4 3" />
              <Bar yAxisId="left" dataKey="largeSpec"  name="Large Speculators" fill="#3b82f6" opacity={0.85} maxBarSize={7} />
              <Bar yAxisId="left" dataKey="commercial" name="Commercials"        fill="#ef4444" opacity={0.85} maxBarSize={7} />
              <Bar yAxisId="left" dataKey="smallSpec"  name="Small Speculators"  fill="#eab308" opacity={0.85} maxBarSize={7} />
              <Line yAxisId="right" type="monotone" dataKey="openInterest" name="Open Interest"
                stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#22c55e' }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          {[
            { color: '#3b82f6', label: 'Large Speculators (Net)' },
            { color: '#ef4444', label: 'Commercials (Net)' },
            { color: '#eab308', label: 'Small Speculators (Net)' },
            { color: '#22c55e', label: 'Open Interest', line: true },
          ].map(({ color, label, line }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {line
                ? <div style={{ width: 20, height: 2, background: color, borderRadius: 1 }} />
                : <div style={{ width: 12, height: 12, borderRadius: 2, background: color, opacity: 0.85 }} />
              }
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div style={{
        fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)',
        borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--text)' }}>פרשנות COT:</strong>  Commercials (אדום) = "smart money" — הם מגדרים.  Large Speculators (כחול) = קרנות גדולות, trend-followers.  Small Speculators (צהוב) = אינדיקטור קונטראריאני.  Source: CFTC.gov
      </div>
    </div>
  );
}

/* ─── SCREENER TAB ─── */

function ScreenerTab({ clipboard, onClip }) {
  const [stocks, setStocks]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [lastUpdated, setLast]    = useState(null);
  const [sortKey, setSortKey]     = useState('ratio');
  const [sortDir, setSortDir]     = useState('desc');
  const [minPct, setMinPct]       = useState(10);
  const [minRatio, setMinRatio]   = useState(1);

  const loadScreener = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/screener?minPct=${minPct}&minRatio=${minRatio}`);
      const d = await r.json();
      if (d.error && !d.stocks?.length) throw new Error(d.error);
      setStocks(d.stocks ?? []);
      setLast(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [minPct, minRatio]);

  useEffect(() => { loadScreener(); }, []);

  const sorted = [...stocks].sort((a, b) =>
    sortDir === 'desc' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]
  );

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortIcon = (key) => sortKey === key ? (sortDir === 'desc' ? ' ▾' : ' ▴') : '';

  const th = (key, align = 'right', label) => ({
    onClick: () => handleSort(key),
    style: {
      padding: '10px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', userSelect: 'none',
      textAlign: align, textTransform: 'uppercase', letterSpacing: '0.06em',
      color: sortKey === key ? 'var(--navy)' : 'var(--text-faint)',
      background: 'var(--bg)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)',
    },
    children: (label ?? key) + sortIcon(key),
  });

  const clipState = (ticker) => {
    if ((clipboard?.long     ?? []).some(t => t.ticker === ticker)) return 'long';
    if ((clipboard?.short    ?? []).some(t => t.ticker === ticker)) return 'short';
    if ((clipboard?.universe ?? []).some(t => t.ticker === ticker)) return 'universe';
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Min % from 50 SMA:</span>
          <select
            className="input"
            value={minPct}
            onChange={e => setMinPct(Number(e.target.value))}
            style={{ padding: '5px 8px', fontSize: 12, width: 'auto' }}
          >
            {[0, 5, 10, 15, 20, 30, 50].map(v => <option key={v} value={v}>{v}%</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Min Ratio:</span>
          <select
            className="input"
            value={minRatio}
            onChange={e => setMinRatio(Number(e.target.value))}
            style={{ padding: '5px 8px', fontSize: 12, width: 'auto' }}
          >
            {[0, 1, 2, 3, 5, 7, 10].map(v => <option key={v} value={v}>{v}x</option>)}
          </select>
        </div>
        <button
          onClick={loadScreener}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 8, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: 'var(--navy)', color: '#fff',
            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Scanning...' : 'Refresh'}
        </button>
        {lastUpdated && (
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        {stocks.length > 0 && !loading && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {stocks.length} stocks found
          </span>
        )}
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 12, border: '1px solid var(--border)',
        overflow: 'hidden', boxShadow: 'var(--shadow)',
      }}>
        {loading && stocks.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
            Scanning ~65 stocks... ~10-15 seconds
          </div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>{error}</div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
            No stocks match the filters. Try lowering Min % from 50 SMA or Min Ratio.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, textAlign: 'center', color: 'var(--text-faint)', textTransform: 'uppercase', background: 'var(--bg)', borderBottom: '1px solid var(--border)', width: 36 }}>#</th>
                  <th {...th('ticker',  'left',  'Ticker')}  />
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, textAlign: 'left', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>Company</th>
                  <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, textAlign: 'left', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--bg)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Group</th>
                  <th {...th('price',      'right', 'Price')}     />
                  <th {...th('sma50',      'right', '50 SMA')}    />
                  <th {...th('pctFromSma', 'right', '% from SMA')} />
                  <th {...th('atrPct',     'right', 'ATR%')}      />
                  <th {...th('ratio',      'right', 'Ratio')}     />
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => {
                  const cs = clipState(s.ticker);
                  return (
                    <tr
                      key={s.ticker}
                      onClick={() => onClip && onClip(s.ticker, s.company)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: onClip ? 'pointer' : 'default',
                        background: cs ? CLIP_BG[cs] : 'transparent',
                        transition: 'background 0.1s',
                        borderLeft: cs ? `3px solid ${CLIP_COLORS[cs]}` : '3px solid transparent',
                      }}
                      onMouseEnter={e => { if (!cs) e.currentTarget.style.background = 'var(--bg-card)'; }}
                      onMouseLeave={e => { if (!cs) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: 'var(--text-faint)' }}>{i + 1}</td>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: cs ? CLIP_COLORS[cs] : 'var(--navy)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {cs && <div style={{ width: 7, height: 7, borderRadius: '50%', background: CLIP_COLORS[cs], flexShrink: 0 }} />}
                          {s.ticker}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.company}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {s.group && (
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, whiteSpace: 'nowrap',
                            background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)',
                          }}>{s.group}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>${s.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>${s.sma50.toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: s.pctFromSma >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {s.pctFromSma >= 0 ? '+' : ''}{s.pctFromSma.toFixed(1)}%
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{s.atrPct.toFixed(1)}%</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: s.ratio >= 7 ? 'var(--red)' : s.ratio >= 4 ? '#f59e0b' : 'var(--text)',
                        }}>
                          {s.ratio.toFixed(1)}x
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{
        fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)',
        borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--text)' }}>Ratio</strong> = (% from 50 SMA) ÷ ATR%.
        ≥7x = אדום (קיצוני). ≥4x = כתום. Ratio גבוה = מניה מורחקת מאוד מה-SMA ביחס לתנודתיות הרגילה שלה.
        לחץ על שורה להוסיף ל-Clipboard (1=Long 🟢, 2=Short 🔴, 3=Universe 🔵, 4=הסר).
        Data: Yahoo Finance · ~65 מניות growth/momentum.
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─── */

export default function Market() {
  const [tab, setTab] = useState('cot');
  const [clipboard, setClipboard] = useState({ long: [], short: [], universe: [] });
  const [showClipboard, setShowClipboard] = useState(false);

  const totalClipped = Object.values(clipboard).reduce((s, arr) => s + arr.length, 0);

  const onClip = useCallback((ticker, name) => {
    setClipboard(prev => {
      const inLong     = prev.long.some(t => t.ticker === ticker);
      const inShort    = prev.short.some(t => t.ticker === ticker);
      const inUniverse = prev.universe.some(t => t.ticker === ticker);
      const base = {
        long:     prev.long.filter(t => t.ticker !== ticker),
        short:    prev.short.filter(t => t.ticker !== ticker),
        universe: prev.universe.filter(t => t.ticker !== ticker),
      };
      if (!inLong && !inShort && !inUniverse) return { ...base, long: [...base.long, { ticker, name }] };
      if (inLong)  return { ...base, short: [...base.short, { ticker, name }] };
      if (inShort) return { ...base, universe: [...base.universe, { ticker, name }] };
      return base;
    });
  }, []);

  const onRemove = useCallback((list, ticker) => {
    setClipboard(prev => ({ ...prev, [list]: prev[list].filter(t => t.ticker !== ticker) }));
  }, []);

  const onClear = useCallback((list) => {
    setClipboard(prev => ({ ...prev, [list]: [] }));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {[
          { key: 'cot',     label: 'COT Charts',    Icon: Activity   },
          { key: 'screener',label: 'Screener',       Icon: TrendingUp },
          { key: 'theme',   label: 'Theme Tracker',  Icon: BarChart3  },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 8, border: '1px solid',
              fontSize: 13, fontWeight: tab === key ? 700 : 400, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
              borderColor: tab === key ? 'var(--navy)' : 'var(--border)',
              background:  tab === key ? 'var(--navy)' : 'var(--bg-card)',
              color:       tab === key ? '#fff' : 'var(--text-muted)',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}

        {/* Clipboard toggle */}
        <button
          onClick={() => setShowClipboard(v => !v)}
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 8,
            border: `1px solid ${showClipboard ? '#60a5fa' : 'var(--border)'}`,
            fontSize: 13, fontWeight: showClipboard ? 700 : 400, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.15s',
            background: showClipboard ? 'rgba(96,165,250,0.12)' : 'var(--bg-card)',
            color: showClipboard ? '#60a5fa' : 'var(--text-muted)',
            position: 'relative',
          }}
        >
          <Clipboard size={14} />
          Clipboard
          {totalClipped > 0 && (
            <span style={{
              background: '#60a5fa', color: '#000', borderRadius: 8,
              padding: '1px 6px', fontSize: 10, fontWeight: 700,
            }}>{totalClipped}</span>
          )}
        </button>
      </div>

      {tab === 'cot'      && <COTTab />}
      {tab === 'screener' && <ScreenerTab clipboard={clipboard} onClip={onClip} />}
      {tab === 'theme'    && <ThemeTracker clipboard={clipboard} onClip={onClip} />}

      {showClipboard && (
        <ClipboardPanel
          clipboard={clipboard}
          onRemove={onRemove}
          onClear={onClear}
          onClose={() => setShowClipboard(false)}
        />
      )}
    </div>
  );
}
