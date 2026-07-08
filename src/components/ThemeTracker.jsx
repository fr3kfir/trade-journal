import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, RefreshCw, Zap, Layers, TrendingUp, Filter } from 'lucide-react';
import { CLIP_COLORS, CLIP_BG } from './constants';

/* ─── SMALL COMPONENTS ───────────────────────────────────────────────── */

function Pct({ v, bold, size }) {
  if (v == null) return <span style={{ color: 'var(--text-faint)', fontSize: size ?? 12 }}>—</span>;
  const pos = v >= 0;
  return (
    <span style={{ fontSize: size ?? 12, fontWeight: bold ? 700 : 500, color: pos ? 'var(--green)' : 'var(--red)' }}>
      {pos ? '+' : ''}{v.toFixed(1)}%
    </span>
  );
}

function RSBar({ value }) {
  if (value == null) return null;
  const clamped = Math.max(-15, Math.min(15, value));
  const pos = value >= 0;
  const barWidth = (Math.abs(clamped) / 15) * 50;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 80, height: 6, background: 'var(--border)', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'var(--text-faint)', opacity: 0.4 }} />
        <div style={{
          position: 'absolute', top: 0, bottom: 0, borderRadius: 3,
          left: pos ? '50%' : `${50 - barWidth}%`,
          width: `${barWidth}%`,
          background: pos ? 'var(--green)' : 'var(--red)',
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: pos ? 'var(--green)' : 'var(--red)', minWidth: 36 }}>
        {pos ? '+' : ''}{value.toFixed(1)}
      </span>
    </div>
  );
}

/** Volume Ratio badge */
function VolBadge({ ratio }) {
  if (ratio == null) return <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>—</span>;
  const color = ratio >= 2 ? '#f59e0b' : ratio >= 1.5 ? '#34d399' : 'var(--text-muted)';
  const bg    = ratio >= 2 ? 'rgba(245,158,11,0.12)' : ratio >= 1.5 ? 'rgba(52,211,153,0.10)' : 'transparent';
  return (
    <span style={{
      fontSize: 11, fontWeight: ratio >= 1.5 ? 700 : 500,
      color, background: bg, padding: ratio >= 1.5 ? '1px 6px' : 0,
      borderRadius: 5,
    }}>
      {ratio.toFixed(1)}x
    </span>
  );
}

/** MA alignment dots: green=above, red=below */
function MaBadges({ aboveEma10, aboveEma21, aboveEma50 }) {
  const dot = (label, above) => (
    <span
      key={label}
      title={`${label} EMA: ${above ? 'Above ✅' : 'Below ❌'}`}
      style={{
        fontSize: 10, fontWeight: 600,
        padding: '1px 5px', borderRadius: 4,
        background: above ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.10)',
        color: above ? 'var(--green)' : 'var(--red)',
        border: `1px solid ${above ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.25)'}`,
      }}
    >
      {label}
    </span>
  );
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
      {aboveEma10  != null && dot('10',  aboveEma10)}
      {aboveEma21  != null && dot('21',  aboveEma21)}
      {aboveEma50  != null && dot('50',  aboveEma50)}
    </div>
  );
}

/** Setup flag chips */
function SetupFlags({ isHVC, isFlatBase }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {isHVC && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5,
          background: 'rgba(234,179,8,0.15)', color: '#ca8a04',
          border: '1px solid rgba(234,179,8,0.35)',
        }}>🔊 HVC</span>
      )}
      {isFlatBase && (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5,
          background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
          border: '1px solid rgba(59,130,246,0.3)',
        }}>🏗️ Base</span>
      )}
    </div>
  );
}

const TH = ({ children, active, onClick, align = 'right' }) => (
  <th
    onClick={onClick}
    style={{
      padding: '10px 12px', fontSize: 11, fontWeight: 700,
      cursor: onClick ? 'pointer' : 'default', userSelect: 'none',
      textAlign: align, textTransform: 'uppercase', letterSpacing: '0.06em',
      color: active ? 'var(--navy)' : 'var(--text-faint)',
      background: 'var(--bg)', whiteSpace: 'nowrap',
      borderBottom: '1px solid var(--border)',
    }}
  >{children}</th>
);

const TD = ({ children, align = 'right' }) => (
  <td style={{ padding: '10px 12px', textAlign: align }}>{children}</td>
);

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────── */
export default function ThemeTracker({ clipboard, onClip }) {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [sortKey,     setSortKey]     = useState('composite');
  const [sortDir,     setSortDir]     = useState('desc');
  const [expanded,    setExpanded]    = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filters
  const [minDaily,     setMinDaily]    = useState(0);      // min 1D% filter
  const [setupFilter,  setSetupFilter] = useState('all');  // 'all' | 'hvc' | 'base' | 'any'
  const [maFilter,     setMaFilter]    = useState('all');  // 'all' | 'above21' | 'above50'

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch('/api/theme-tracker');
      const d = await r.json();
      if (d.error && !d.themes?.length) throw new Error(d.error);
      setData(d);
      setLastUpdated(new Date());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const themes = data?.themes ?? [];
  const bm     = data?.benchmark ?? {};

  // Sort themes
  const sorted = [...themes].sort((a, b) => {
    const av = a[sortKey] ?? -999, bv = b[sortKey] ?? -999;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const sort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const si = (key) => sortKey === key ? (sortDir === 'desc' ? ' ▾' : ' ▴') : '';

  const spyR5 = bm.spy?.r5;
  const isBull = spyR5 != null && spyR5 > 0;

  // Clipboard state for a ticker
  const clipState = (ticker) => {
    if ((clipboard?.long     ?? []).find(t => t.ticker === ticker)) return 'long';
    if ((clipboard?.short    ?? []).find(t => t.ticker === ticker)) return 'short';
    if ((clipboard?.universe ?? []).find(t => t.ticker === ticker)) return 'universe';
    return null;
  };

  /** Filter stocks inside an expanded theme */
  function filterStocks(stocks) {
    return stocks.filter(s => {
      if (minDaily > 0 && (s.r1 == null || s.r1 < minDaily)) return false;
      if (minDaily < 0 && (s.r1 == null || s.r1 > minDaily)) return false;
      if (setupFilter === 'hvc'  && !s.isHVC)      return false;
      if (setupFilter === 'base' && !s.isFlatBase)  return false;
      if (setupFilter === 'any'  && !s.isHVC && !s.isFlatBase) return false;
      if (maFilter === 'above21' && s.aboveEma21 !== true) return false;
      if (maFilter === 'above50' && s.aboveEma50 !== true) return false;
      return true;
    });
  }

  /* ── Summary stats for the top bar ── */
  const totalHVC      = themes.reduce((a, t) => a + (t.hvcCount      ?? 0), 0);
  const totalFlatBase = themes.reduce((a, t) => a + (t.flatBaseCount  ?? 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Market Pulse ── */}
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 12, border: '1px solid var(--border)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        boxShadow: 'var(--shadow)',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Market Pulse</span>

        {spyR5 != null && (
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 6,
            background: isBull ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
            color: isBull ? 'var(--green)' : 'var(--red)',
          }}>
            {isBull ? '▲ BULL' : '▼ BEAR'}
          </span>
        )}

        {[
          { label: 'SPY 1D', val: bm.spy?.r1 },
          { label: 'SPY 1W', val: bm.spy?.r5 },
          { label: 'QQQ 1D', val: bm.qqq?.r1 },
          { label: 'QQQ 1W', val: bm.qqq?.r5 },
        ].map(({ label, val }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            <Pct v={val} bold size={16} />
          </div>
        ))}

        {/* Setup summary */}
        {themes.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginLeft: 8, paddingLeft: 16, borderLeft: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>HVC</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: totalHVC > 0 ? '#ca8a04' : 'var(--text-muted)' }}>{totalHVC}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Flat Base</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: totalFlatBase > 0 ? '#3b82f6' : 'var(--text-muted)' }}>{totalFlatBase}</span>
            </div>
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdated && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{lastUpdated.toLocaleTimeString()}</span>}
          <button onClick={load} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: 'var(--navy)', color: '#fff', fontSize: 12, fontWeight: 600,
            fontFamily: 'inherit', opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
          }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 10, border: '1px solid var(--border)',
        padding: '10px 16px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Filter size={12} /> Filters
        </span>

        {/* Daily movers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Today ≥</span>
          {[0, 2, 4, 6, -2, -4].map(v => (
            <button
              key={v}
              onClick={() => setMinDaily(v)}
              style={{
                padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: minDaily === v ? 700 : 400, fontFamily: 'inherit',
                background: minDaily === v ? (v < 0 ? 'rgba(248,113,113,0.2)' : 'var(--navy)') : 'var(--bg-card)',
                color: minDaily === v ? (v < 0 ? 'var(--red)' : '#fff') : 'var(--text-muted)',
                transition: 'all 0.12s',
              }}
            >
              {v >= 0 ? `+${v}%` : `${v}%`}
            </button>
          ))}
        </div>

        {/* Setup filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Setup:</span>
          {[
            { key: 'all',  label: 'All'      },
            { key: 'hvc',  label: '🔊 HVC'   },
            { key: 'base', label: '🏗️ Base'  },
            { key: 'any',  label: '⚡ Any'   },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSetupFilter(key)}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid',
                fontSize: 11, fontWeight: setupFilter === key ? 700 : 400, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.12s',
                borderColor: setupFilter === key ? 'var(--navy)' : 'var(--border)',
                background:  setupFilter === key ? 'var(--navy)' : 'var(--bg-card)',
                color:       setupFilter === key ? '#fff' : 'var(--text-muted)',
              }}
            >{label}</button>
          ))}
        </div>

        {/* MA filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>MA:</span>
          {[
            { key: 'all',     label: 'All'       },
            { key: 'above21', label: '↑ EMA 21'  },
            { key: 'above50', label: '↑ EMA 50'  },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMaFilter(key)}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid',
                fontSize: 11, fontWeight: maFilter === key ? 700 : 400, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.12s',
                borderColor: maFilter === key ? '#34d399' : 'var(--border)',
                background:  maFilter === key ? 'rgba(52,211,153,0.15)' : 'var(--bg-card)',
                color:       maFilter === key ? '#059669' : 'var(--text-muted)',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* ── Theme Table ── */}
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 12, border: '1px solid var(--border)',
        overflow: 'hidden', boxShadow: 'var(--shadow)',
      }}>
        {loading && !themes.length ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
            <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
            Calculating RS for all themes… (~25s)
          </div>
        ) : error ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <TH align="left">Theme</TH>
                  <TH active={sortKey==='count'}     onClick={() => sort('count')}    >Stocks{si('count')}</TH>
                  <TH active={sortKey==='r1'}        onClick={() => sort('r1')}       >1D%{si('r1')}</TH>
                  <TH active={sortKey==='r5'}        onClick={() => sort('r5')}       >1W%{si('r5')}</TH>
                  <TH active={sortKey==='r20'}       onClick={() => sort('r20')}      >1M%{si('r20')}</TH>
                  <TH active={sortKey==='r60'}       onClick={() => sort('r60')}      >3M%{si('r60')}</TH>
                  <TH active={sortKey==='rs5'}       onClick={() => sort('rs5')}      >RS 1W{si('rs5')}</TH>
                  <TH active={sortKey==='rs20'}      onClick={() => sort('rs20')}     >RS 1M{si('rs20')}</TH>
                  <TH active={sortKey==='composite'} onClick={() => sort('composite')}>RS Score{si('composite')}</TH>
                  <TH align="left">Setups</TH>
                  <TH align="left">Leader</TH>
                </tr>
              </thead>
              <tbody>
                {sorted.map(t => {
                  const isExp = expanded === t.theme;
                  const comp  = t.composite ?? 0;
                  const filteredStocks = filterStocks(t.stocks ?? []);

                  return (
                    <>
                      <tr
                        key={t.theme}
                        onClick={() => setExpanded(isExp ? null : t.theme)}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '12px 14px', textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {isExp ? <ChevronDown size={14} color="var(--text-faint)" /> : <ChevronRight size={14} color="var(--text-faint)" />}
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.theme}</span>
                          </div>
                        </td>
                        <TD><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.count}</span></TD>
                        <TD><Pct v={t.r1} /></TD>
                        <TD><Pct v={t.r5} /></TD>
                        <TD><Pct v={t.r20} /></TD>
                        <TD><Pct v={t.r60} /></TD>
                        <TD><Pct v={t.rs5} /></TD>
                        <TD><Pct v={t.rs20} /></TD>
                        <TD>
                          <span style={{
                            fontSize: 13, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                            background: comp >= 2 ? 'rgba(52,211,153,0.12)' : comp <= -2 ? 'rgba(248,113,113,0.12)' : 'transparent',
                            color: comp >= 0 ? 'var(--green)' : 'var(--red)',
                          }}>
                            {comp >= 0 ? '+' : ''}{comp.toFixed(1)}
                          </span>
                        </TD>
                        {/* Setup counts for theme */}
                        <td style={{ padding: '12px 14px', textAlign: 'left' }}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            {(t.hvcCount ?? 0) > 0 && (
                              <span title={`${t.hvcCount} HVC stocks`} style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: 'rgba(245,158,11,0.15)', color: '#ca8a04', border: '1px solid rgba(245,158,11,0.3)' }}>
                                🔊 {t.hvcCount}
                              </span>
                            )}
                            {(t.flatBaseCount ?? 0) > 0 && (
                              <span title={`${t.flatBaseCount} Flat Base stocks`} style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)' }}>
                                🏗️ {t.flatBaseCount}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'left' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', letterSpacing: '0.02em' }}>{t.leader ?? '—'}</span>
                        </td>
                      </tr>

                      {/* ── Expanded stock rows ── */}
                      {isExp && (
                        <tr key={`${t.theme}-exp`} style={{ borderBottom: '2px solid var(--border)' }}>
                          <td colSpan={11} style={{ padding: 0, background: 'var(--bg)' }}>

                            {/* Filter result count */}
                            {(minDaily !== 0 || setupFilter !== 'all' || maFilter !== 'all') && (
                              <div style={{ padding: '6px 40px', fontSize: 11, color: 'var(--text-faint)', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                                {filteredStocks.length} / {t.stocks.length} stocks match filters
                              </div>
                            )}

                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: 'var(--bg)' }}>
                                  {['Stock','Company','Price','1D%','Vol Ratio','RS 1W','RS 1M','EMA Alignment','Setup','RS Score'].map((h, i) => (
                                    <th key={h} style={{
                                      padding: '8px 12px' + (i === 0 ? ' 8px 40px' : ''),
                                      fontSize: 10, fontWeight: 700, color: 'var(--text-faint)',
                                      textAlign: i >= 3 ? 'right' : 'left',
                                      textTransform: 'uppercase', letterSpacing: '0.06em',
                                      background: 'var(--bg)', borderBottom: '1px solid var(--border)',
                                      whiteSpace: 'nowrap',
                                    }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {filteredStocks.length === 0 ? (
                                  <tr>
                                    <td colSpan={10} style={{ padding: '24px 40px', color: 'var(--text-faint)', fontSize: 12 }}>
                                      No stocks match the current filters.
                                    </td>
                                  </tr>
                                ) : filteredStocks.map((s, si2) => {
                                  const cs = clipState(s.ticker);
                                  return (
                                    <tr
                                      key={s.ticker}
                                      onClick={(e) => { e.stopPropagation(); onClip && onClip(s.ticker, s.name); }}
                                      style={{
                                        borderBottom: '1px solid var(--border)',
                                        cursor: onClip ? 'pointer' : 'default',
                                        background: cs ? CLIP_BG[cs] : 'transparent',
                                        transition: 'background 0.1s',
                                      }}
                                      onMouseEnter={e => { if (!cs) e.currentTarget.style.background = 'var(--bg-card)'; }}
                                      onMouseLeave={e => { if (!cs) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                      {/* Stock */}
                                      <td style={{ padding: '9px 12px 9px 40px', textAlign: 'left' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          {cs && <div style={{ width: 8, height: 8, borderRadius: '50%', background: CLIP_COLORS[cs], flexShrink: 0 }} />}
                                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{s.ticker}</span>
                                          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>#{si2 + 1}</span>
                                        </div>
                                      </td>
                                      {/* Company */}
                                      <td style={{ padding: '9px 12px', textAlign: 'left' }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{s.name}</span>
                                      </td>
                                      {/* Price */}
                                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                                          {s.price != null ? `$${s.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                        </span>
                                      </td>
                                      {/* 1D% */}
                                      <td style={{ padding: '9px 12px', textAlign: 'right' }}><Pct v={s.r1} /></td>
                                      {/* Vol Ratio */}
                                      <td style={{ padding: '9px 12px', textAlign: 'right' }}><VolBadge ratio={s.volRatio} /></td>
                                      {/* RS 1W */}
                                      <td style={{ padding: '9px 12px', textAlign: 'right' }}><Pct v={s.rs5} /></td>
                                      {/* RS 1M */}
                                      <td style={{ padding: '9px 12px', textAlign: 'right' }}><Pct v={s.rs20} /></td>
                                      {/* EMA Alignment */}
                                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                                        <MaBadges aboveEma10={s.aboveEma10} aboveEma21={s.aboveEma21} aboveEma50={s.aboveEma50} />
                                      </td>
                                      {/* Setup flags */}
                                      <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                                        <SetupFlags isHVC={s.isHVC} isFlatBase={s.isFlatBase} />
                                      </td>
                                      {/* RS Score bar */}
                                      <td style={{ padding: '9px 12px', textAlign: 'left' }}>
                                        <RSBar value={s.composite} />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)', lineHeight: 1.8 }}>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <span><strong style={{ color: 'var(--text)' }}>RS Score</strong> = RS 1W×40% + RS 1M×35% + RS 3M×25% vs SPY</span>
          <span><strong style={{ color: '#ca8a04' }}>🔊 HVC</strong> = High Volume Close (Vol ≥1.5x avg, close top 65% of range)</span>
          <span><strong style={{ color: '#3b82f6' }}>🏗️ Base</strong> = Flat Base (tight range &lt;10%, near highs)</span>
          <span><strong style={{ color: 'var(--text)' }}>EMA badges</strong> = 10/21/50 EMA alignment (green=above)</span>
        </div>
        <div style={{ marginTop: 6, color: 'var(--text-faint)', fontSize: 11 }}>
          לחץ על שורת תמה להרחבה. לחץ על מניה להוסיפה ל-Clipboard (1=Long 🟢, 2=Short 🔴, 3=Universe 🔵, 4=הסר).
        </div>
      </div>
    </div>
  );
}
