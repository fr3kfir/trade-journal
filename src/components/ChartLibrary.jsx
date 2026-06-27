import { useState, useMemo, useCallback, useEffect } from 'react';
import { Images, ChevronLeft, ChevronRight, Search, Upload, ExternalLink } from 'lucide-react';
import MiniChart from './MiniChart.jsx';

export const STAGES = [
  { key: 'setup', label: 'Setup',  color: '#6366f1' },
  { key: 'entry', label: 'Entry',  color: '#0ea5e9' },
  { key: 'add',   label: 'Add',    color: '#f59e0b' },
  { key: 'exit',  label: 'Exit',   color: '#ef4444' },
  { key: 'post',  label: 'Post',   color: '#8b5cf6' },
];

function normalizeImages(raw) {
  return (raw || []).map(img =>
    typeof img === 'string' ? { src: img, stage: 'setup' } : img
  );
}

function pnlColor(v) {
  if (v > 0) return 'var(--green)';
  if (v < 0) return 'var(--red)';
  return 'var(--text-muted)';
}

function tvSymbol(ticker) {
  if (!ticker) return 'SPY';
  return ticker.includes(':') ? ticker : `NASDAQ:${ticker}`;
}

function Lightbox({ trade, images, imgIndex, onClose, onPrev, onNext, onPrevTrade, onNextTrade, hasPrevTrade, hasNextTrade, theme, tradeIndex, totalTrades }) {
  const pnl = trade.pnl != null ? parseFloat(trade.pnl) : null;
  const rVal = trade.r_value != null ? parseFloat(trade.r_value) : null;
  const [tab, setTab] = useState('chart'); // 'chart' | 'img'

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft')  { if (hasPrevTrade) onPrevTrade(); }
      else if (e.key === 'ArrowRight') { if (hasNextTrade) onNextTrade(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onPrevTrade, onNextTrade, hasPrevTrade, hasNextTrade]);

  const execScore = trade.execution_score != null ? parseInt(trade.execution_score, 10) : null;

  const navBtnStyle = (enabled) => ({
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 6,
    border: 'none',
    cursor: enabled ? 'pointer' : 'default',
    background: enabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
    color: enabled ? '#fff' : 'rgba(255,255,255,0.3)',
    fontFamily: 'inherit',
    transition: 'background 0.15s',
  });

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 'min(98vw, 1300px)' }}>

        {/* Trade navigation bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onPrevTrade} disabled={!hasPrevTrade} style={navBtnStyle(hasPrevTrade)}>← עסקה קודמת</button>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{tradeIndex + 1} / {totalTrades}</span>
          <button onClick={onNextTrade} disabled={!hasNextTrade} style={navBtnStyle(hasNextTrade)}>עסקה הבאה →</button>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginLeft: 8 }}>{trade.ticker}</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>{trade.date}</span>
          {trade.entry != null && (
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, marginLeft: 8 }}>
              כניסה: ${parseFloat(trade.entry).toFixed(2)}
            </span>
          )}
          {trade.exit != null && (
            <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>
              יציאה: ${parseFloat(trade.exit).toFixed(2)}
            </span>
          )}
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '0 4px' }}
          >×</button>
        </div>

        {/* Main content: left (chart) + right (details) */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Left panel */}
          <div style={{ flex: '1.6 1 0', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Tabs row */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setTab('chart')} style={{
                fontSize: 12, padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: tab === 'chart' ? 'var(--navy)' : 'rgba(255,255,255,0.12)',
                color: '#fff', fontWeight: tab === 'chart' ? 700 : 400, fontFamily: 'inherit',
              }}>📈 גרף היסטורי</button>
              {images.length > 0 && (
                <button onClick={() => setTab('img')} style={{
                  fontSize: 12, padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: tab === 'img' ? 'var(--navy)' : 'rgba(255,255,255,0.12)',
                  color: '#fff', fontWeight: tab === 'img' ? 700 : 400, fontFamily: 'inherit',
                }}>🖼 תמונות שמורות ({images.length})</button>
              )}
              <a
                href={`https://www.tradingview.com/chart/?symbol=${tvSymbol(trade.ticker)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
              >
                <ExternalLink size={11} /> TradingView
              </a>
            </div>

            {/* Chart or image */}
            {tab === 'chart' ? (
              <div style={{ borderRadius: 8, overflow: 'hidden', height: '62vh', position: 'relative' }}>
                <MiniChart trade={trade} height={window.innerHeight * 0.62} theme={theme} />
                {/* Entry/Exit overlay badges */}
                <div style={{
                  position: 'absolute', top: 10, left: 10,
                  display: 'flex', gap: 8, flexWrap: 'wrap', zIndex: 10,
                  pointerEvents: 'none',
                }}>
                  {trade.entry != null && (
                    <span style={{
                      background: 'rgba(34,197,94,0.9)', color: '#fff',
                      fontSize: 12, fontWeight: 700, padding: '4px 10px',
                      borderRadius: 6, backdropFilter: 'blur(4px)',
                    }}>
                      ↑ כניסה ${parseFloat(trade.entry).toFixed(2)}
                    </span>
                  )}
                  {trade.exit != null && (
                    <span style={{
                      background: 'rgba(239,68,68,0.9)', color: '#fff',
                      fontSize: 12, fontWeight: 700, padding: '4px 10px',
                      borderRadius: 6, backdropFilter: 'blur(4px)',
                    }}>
                      ↓ יציאה ${parseFloat(trade.exit).toFixed(2)}
                    </span>
                  )}
                  {trade.stop != null && (
                    <span style={{
                      background: 'rgba(245,158,11,0.9)', color: '#fff',
                      fontSize: 12, fontWeight: 700, padding: '4px 10px',
                      borderRadius: 6, backdropFilter: 'blur(4px)',
                    }}>
                      ✕ סטופ ${parseFloat(trade.stop).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', textAlign: 'center' }}>
                <img
                  src={images[imgIndex]?.src}
                  alt={`${trade.ticker}`}
                  style={{ maxWidth: '100%', maxHeight: '62vh', objectFit: 'contain', borderRadius: 8 }}
                />
                {images.length > 1 && (
                  <>
                    <button onClick={onPrev} disabled={imgIndex === 0} style={{
                      position: 'absolute', left: -48, top: '50%', transform: 'translateY(-50%)',
                      background: imgIndex === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)',
                      border: 'none', color: '#fff', borderRadius: '50%', width: 38, height: 38,
                      cursor: imgIndex === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><ChevronLeft size={18} /></button>
                    <button onClick={onNext} disabled={imgIndex === images.length - 1} style={{
                      position: 'absolute', right: -48, top: '50%', transform: 'translateY(-50%)',
                      background: imgIndex === images.length - 1 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)',
                      border: 'none', color: '#fff', borderRadius: '50%', width: 38, height: 38,
                      cursor: imgIndex === images.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><ChevronRight size={18} /></button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right panel – trade details */}
          <div style={{
            width: 320, flexShrink: 0, minWidth: 0,
            background: 'var(--bg-panel)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
            overflowY: 'auto', maxHeight: '70vh',
          }}>
            {/* Date + direction */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>{trade.ticker}</span>
              <span className={`badge ${trade.direction === 'L' ? 'badge-green' : 'badge-red'}`}>
                {trade.direction === 'L' ? 'Long' : 'Short'}
              </span>
              {trade.setup && (
                <span style={{ fontSize: 11, color: 'var(--text-faint)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 10, marginLeft: 'auto' }}>
                  {trade.setup}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{trade.date}</div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
              {[
                { label: 'מחיר כניסה', val: trade.entry      != null ? `$${parseFloat(trade.entry).toFixed(2)}`      : '—' },
                { label: 'מחיר יציאה', val: trade.exit       != null ? `$${parseFloat(trade.exit).toFixed(2)}`       : '—' },
                { label: 'סטופ',       val: trade.stop       != null ? `$${parseFloat(trade.stop).toFixed(2)}`       : '—' },
                { label: 'כמות',       val: trade.quantity   != null ? trade.quantity                                 : '—' },
                { label: 'עמלה',       val: trade.commission != null ? `$${parseFloat(trade.commission).toFixed(2)}` : '—' },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 1 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{val}</div>
                </div>
              ))}
            </div>

            {/* PnL + R */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
              {pnl != null && (
                <span style={{ fontSize: 22, fontWeight: 800, color: pnlColor(pnl) }} className="amount">
                  {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                </span>
              )}
              {rVal != null && (
                <span style={{ fontSize: 15, fontWeight: 700, color: rVal >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {rVal >= 0 ? '+' : ''}{rVal.toFixed(2)}R
                </span>
              )}
            </div>

            <div style={{ height: 1, background: 'var(--border)' }} />

            {/* Execution score + followed rules */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 110 }}>ציון ביצוע</span>
                <span style={{ fontSize: 16, letterSpacing: 2 }}>
                  {execScore != null
                    ? Array.from({ length: 5 }, (_, i) => i < execScore ? '★' : '☆').join('')
                    : <span style={{ color: 'var(--text-faint)' }}>—</span>
                  }
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', minWidth: 110 }}>עקב לכללים</span>
                {trade.followed_rules == null
                  ? <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>—</span>
                  : trade.followed_rules
                    ? <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>✓ Yes</span>
                    : <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>✗ No</span>
                }
              </div>
            </div>

            {trade.notes?.trim() && (
              <>
                <div style={{ height: 1, background: 'var(--border)' }} />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>הערות</div>
                  <div style={{
                    fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55,
                    whiteSpace: 'pre-wrap', maxHeight: 150, overflowY: 'auto',
                  }}>
                    {trade.notes}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChartLibrary({ trades, onUpdate }) {
  const [search, setSearch] = useState('');
  const [setupFilter, setSetupFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [activeIndex, setActiveIndex] = useState(null);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');
  const [sortBy, setSortBy]   = useState('date'); // 'date' | 'pnl' | 'r'

  const theme = typeof document !== 'undefined'
    ? (document.documentElement.getAttribute('data-theme') || 'light')
    : 'light';

  const tradedTrades = useMemo(() =>
    trades
      .filter(t => t.ticker && t.pnl != null)
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
  [trades]);

  const setups = useMemo(() => {
    const s = new Set(tradedTrades.map(t => t.setup).filter(Boolean));
    return [...s].sort();
  }, [tradedTrades]);

  const filtered = useMemo(() => {
    let list = tradedTrades.filter(trade => {
      if (outcomeFilter === 'wins'   && !(parseFloat(trade.pnl) > 0)) return false;
      if (outcomeFilter === 'losses' && !(parseFloat(trade.pnl) < 0)) return false;
      if (setupFilter !== 'all' && trade.setup !== setupFilter) return false;
      if (dateFrom && trade.date < dateFrom) return false;
      if (dateTo   && trade.date > dateTo)   return false;
      if (search) {
        const q = search.toLowerCase();
        if (!trade.ticker?.toLowerCase().includes(q) &&
            !trade.setup?.toLowerCase().includes(q) &&
            !trade.date?.includes(q)) return false;
      }
      return true;
    });
    if (sortBy === 'pnl') list = [...list].sort((a, b) => parseFloat(b.pnl) - parseFloat(a.pnl));
    else if (sortBy === 'r') list = [...list].sort((a, b) => parseFloat(b.r_value || 0) - parseFloat(a.r_value || 0));
    // default 'date' is already sorted newest first from tradedTrades
    return list;
  }, [tradedTrades, outcomeFilter, setupFilter, search, dateFrom, dateTo, sortBy]);

  const activeTrade = activeIndex != null ? filtered[activeIndex] ?? null : null;

  const handleUpload = useCallback((trade, e) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const existing = normalizeImages(trade.chart_images);
      onUpdate(trade.id, { chart_images: [...existing, { src: ev.target.result, stage: 'setup' }] });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [onUpdate]);

  const FilterBtn = ({ value, current, onChange, label }) => (
    <button onClick={() => onChange(value)} style={{
      fontSize: 11, padding: '4px 11px', borderRadius: 6, border: 'none', cursor: 'pointer',
      background: current === value ? 'var(--navy)' : 'var(--bg-card)',
      color: current === value ? '#fff' : 'var(--text-muted)',
      fontWeight: current === value ? 600 : 400, fontFamily: 'inherit',
    }}>{label}</button>
  );

  const activeImages = activeTrade ? normalizeImages(activeTrade.chart_images) : [];

  function openTrade(trade) {
    const idx = filtered.indexOf(trade);
    setActiveIndex(idx >= 0 ? idx : null);
    setActiveImgIndex(0);
  }

  function goToPrevTrade() {
    if (activeIndex > 0) { setActiveIndex(activeIndex - 1); setActiveImgIndex(0); }
  }
  function goToNextTrade() {
    if (activeIndex < filtered.length - 1) { setActiveIndex(activeIndex + 1); setActiveImgIndex(0); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Images size={18} /> Chart Library
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {tradedTrades.length} עסקאות — גרפים עם קנייה/מכירה
          </div>
        </div>
      </div>

      {/* Filters row 1 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input className="input" style={{ paddingLeft: 30, width: '100%' }} placeholder="חפש לפי מנייה או תבנית..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <FilterBtn value="all"    current={outcomeFilter} onChange={setOutcomeFilter} label="הכל" />
          <FilterBtn value="wins"   current={outcomeFilter} onChange={setOutcomeFilter} label="✓ זוכות" />
          <FilterBtn value="losses" current={outcomeFilter} onChange={setOutcomeFilter} label="✗ הפסדים" />
        </div>
        {setups.length > 0 && (
          <select className="input" style={{ fontSize: 12, width: 150 }} value={setupFilter} onChange={e => setSetupFilter(e.target.value)}>
            <option value="all">כל התבניות</option>
            {setups.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Filters row 2: date range + sort */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input" type="date" value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          style={{ fontSize: 12, width: 140 }}
          placeholder="מתאריך"
        />
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>
        <input
          className="input" type="date" value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          style={{ fontSize: 12, width: 140 }}
          placeholder="עד תאריך"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'var(--bg-card)', color: 'var(--text-muted)', fontFamily: 'inherit',
            }}
          >✕ נקה תאריכים</button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <FilterBtn value="date" current={sortBy} onChange={setSortBy} label="תאריך" />
          <FilterBtn value="pnl"  current={sortBy} onChange={setSortBy} label="P&L" />
          <FilterBtn value="r"    current={sortBy} onChange={setSortBy} label="R" />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)' }}>
          <Images size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>אין עסקאות סגורות</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {filtered.map(trade => {
            const imgs = normalizeImages(trade.chart_images);
            const pnl = trade.pnl != null ? parseFloat(trade.pnl) : null;
            const rVal = trade.r_value != null ? parseFloat(trade.r_value) : null;

            return (
              <div
                key={trade.id}
                onClick={() => openTrade(trade)}
                style={{
                  background: 'var(--bg-panel)', border: '1px solid var(--border)',
                  borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                  transition: 'box-shadow 0.15s, transform 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,0,0,0.13)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                {/* P&L top strip */}
                <div style={{ height: 3, background: pnl == null ? 'var(--border)' : pnl > 0 ? 'var(--green)' : 'var(--red)' }} />

                {/* Mini chart — overlay prevents TradingView widget from swallowing the card click */}
                <div style={{ position: 'relative' }}>
                  <MiniChart trade={trade} height={160} theme={theme} />
                  <div style={{ position: 'absolute', inset: 0, zIndex: 5 }} />
                </div>

                {/* Upload overlay button */}
                <div style={{ position: 'relative' }}>
                  <label
                    onClick={e => e.stopPropagation()}
                    title="העלה תמונה"
                    style={{
                      position: 'absolute', bottom: 6, right: 6,
                      background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 6,
                      color: '#fff', cursor: 'pointer', padding: '4px 7px', fontSize: 11,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Upload size={11} />
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(trade, e)} />
                  </label>
                  {imgs.length > 0 && (
                    <span style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10,
                      padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                    }}>📷 {imgs.length}</span>
                  )}
                </div>

                {/* Footer */}
                <div style={{ padding: '8px 12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{trade.ticker}</span>
                    <span className={`badge ${trade.direction === 'L' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 9 }}>
                      {trade.direction === 'L' ? 'Long' : 'Short'}
                    </span>
                    {trade.setup && (
                      <span style={{ fontSize: 10, color: 'var(--text-faint)', background: 'var(--bg-card)', padding: '1px 6px', borderRadius: 10, marginLeft: 'auto' }}>
                        {trade.setup}
                      </span>
                    )}
                  </div>
                  {/* Entry / Exit prices */}
                  <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                    {trade.entry != null && (
                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                        כניסה: ${parseFloat(trade.entry).toFixed(2)}
                      </span>
                    )}
                    {trade.exit != null && (
                      <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                        יציאה: ${parseFloat(trade.exit).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {pnl != null && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: pnlColor(pnl) }} className="amount">
                        {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                      </span>
                    )}
                    {rVal != null && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: rVal >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {rVal >= 0 ? '+' : ''}{rVal.toFixed(2)}R
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto' }}>{trade.date}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTrade && (
        <Lightbox
          trade={activeTrade}
          images={activeImages}
          imgIndex={activeImgIndex}
          onClose={() => setActiveIndex(null)}
          onPrev={() => setActiveImgIndex(i => Math.max(0, i - 1))}
          onNext={() => setActiveImgIndex(i => Math.min(activeImages.length - 1, i + 1))}
          onPrevTrade={goToPrevTrade}
          onNextTrade={goToNextTrade}
          hasPrevTrade={activeIndex > 0}
          hasNextTrade={activeIndex < filtered.length - 1}
          tradeIndex={activeIndex}
          totalTrades={filtered.length}
          theme={theme}
        />
      )}
    </div>
  );
}
