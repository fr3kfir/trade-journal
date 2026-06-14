import { useState, useMemo, useCallback, useRef } from 'react';
import { Images, ChevronLeft, ChevronRight, Search, X, ExternalLink, Upload } from 'lucide-react';

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
  if (ticker.includes(':')) return ticker;
  return `NASDAQ:${ticker}`;
}

function tvUrl(ticker, theme = 'dark') {
  const symbol = encodeURIComponent(tvSymbol(ticker));
  return `https://s.tradingview.com/widgetembed/?frameElementId=tv_chart&symbol=${symbol}&interval=D&hide_top_toolbar=0&hide_legend=0&save_image=0&theme=${theme}&style=1&locale=en&allow_symbol_change=1&calendar=0&hotlist=0&news=0`;
}

function StageBadge({ stageKey }) {
  const stage = STAGES.find(s => s.key === stageKey) || STAGES[0];
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
      background: stage.color + '22', color: stage.color,
      letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>
      {stage.label}
    </span>
  );
}

function TVLightbox({ trade, startImg, allImages, imgIndex, onClose, onPrevImg, onNextImg, theme }) {
  const pnl = trade.pnl != null ? parseFloat(trade.pnl) : null;
  const rVal = trade.r_value != null ? parseFloat(trade.r_value) : null;
  const [showChart, setShowChart] = useState(!startImg);

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') onPrevImg();
    if (e.key === 'ArrowRight') onNextImg();
  }, [onClose, onPrevImg, onNextImg]);

  // attach/detach key listener
  useState(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, width: 'min(95vw, 1100px)' }}>

        <button onClick={onClose} style={{
          position: 'absolute', top: -36, right: 0,
          background: 'none', border: 'none', color: '#fff',
          cursor: 'pointer', fontSize: 26, lineHeight: 1,
        }}>×</button>

        {/* Toggle: chart vs saved image */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowChart(true)} style={{
            fontSize: 11, padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: showChart ? 'var(--navy)' : 'rgba(255,255,255,0.1)',
            color: '#fff', fontWeight: showChart ? 700 : 400, fontFamily: 'inherit',
          }}>📈 Live Chart</button>
          {allImages.length > 0 && (
            <button onClick={() => setShowChart(false)} style={{
              fontSize: 11, padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: !showChart ? 'var(--navy)' : 'rgba(255,255,255,0.1)',
              color: '#fff', fontWeight: !showChart ? 700 : 400, fontFamily: 'inherit',
            }}>🖼 Saved ({allImages.length})</button>
          )}
          <a
            href={`https://www.tradingview.com/chart/?symbol=${tvSymbol(trade.ticker)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
          >
            <ExternalLink size={12} /> TradingView
          </a>
        </div>

        {/* Content */}
        {showChart ? (
          <iframe
            src={tvUrl(trade.ticker, theme)}
            style={{ width: '100%', height: '62vh', border: 'none', borderRadius: 8 }}
            allowTransparency
            allowFullScreen
          />
        ) : (
          <div style={{ position: 'relative' }}>
            <img
              src={allImages[imgIndex]?.src}
              alt={`${trade.ticker} chart`}
              style={{ maxWidth: '100%', maxHeight: '62vh', objectFit: 'contain', borderRadius: 8, display: 'block', margin: '0 auto' }}
            />
            {allImages.length > 1 && (
              <>
                <button onClick={onPrevImg} disabled={imgIndex === 0} style={{
                  position: 'absolute', left: -48, top: '50%', transform: 'translateY(-50%)',
                  background: imgIndex === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)',
                  border: 'none', color: '#fff', cursor: imgIndex === 0 ? 'default' : 'pointer',
                  borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><ChevronLeft size={18} /></button>
                <button onClick={onNextImg} disabled={imgIndex === allImages.length - 1} style={{
                  position: 'absolute', right: -48, top: '50%', transform: 'translateY(-50%)',
                  background: imgIndex === allImages.length - 1 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.6)',
                  border: 'none', color: '#fff', cursor: imgIndex === allImages.length - 1 ? 'default' : 'pointer',
                  borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><ChevronRight size={18} /></button>
              </>
            )}
          </div>
        )}

        {/* Trade info bar */}
        <div style={{
          background: 'var(--bg-panel)', borderRadius: 8, padding: '10px 16px',
          display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{trade.ticker}</span>
          <span className={`badge ${trade.direction === 'L' ? 'badge-green' : 'badge-red'}`}>
            {trade.direction === 'L' ? 'Long' : 'Short'}
          </span>
          {trade.setup && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 9px', borderRadius: 12 }}>
              {trade.setup}
            </span>
          )}
          {pnl != null && (
            <span style={{ fontSize: 13, fontWeight: 700, color: pnlColor(pnl) }} className="amount">
              {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
            </span>
          )}
          {rVal != null && (
            <span style={{ fontSize: 12, fontWeight: 600, color: rVal >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {rVal >= 0 ? '+' : ''}{rVal.toFixed(2)}R
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{trade.date}</span>
        </div>

        {trade.notes?.trim() && (
          <div style={{
            background: 'var(--bg-panel)', borderRadius: 8, padding: '9px 14px',
            fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55,
            border: '1px solid var(--border)', whiteSpace: 'pre-wrap',
          }}>
            {trade.notes}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChartLibrary({ trades, onUpdate }) {
  const [search, setSearch] = useState('');
  const [setupFilter, setSetupFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [activeTrade, setActiveTrade] = useState(null);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [startWithChart, setStartWithChart] = useState(true);
  const theme = typeof document !== 'undefined'
    ? (document.documentElement.getAttribute('data-theme') || 'light')
    : 'light';

  // All closed trades with a ticker
  const tradedTrades = useMemo(() =>
    trades
      .filter(t => t.ticker && t.pnl != null)
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
  [trades]);

  const setups = useMemo(() => {
    const s = new Set();
    for (const t of tradedTrades) if (t.setup) s.add(t.setup);
    return [...s].sort();
  }, [tradedTrades]);

  const filtered = useMemo(() => {
    return tradedTrades.filter(trade => {
      if (outcomeFilter === 'wins' && !(parseFloat(trade.pnl) > 0)) return false;
      if (outcomeFilter === 'losses' && !(parseFloat(trade.pnl) < 0)) return false;
      if (setupFilter !== 'all' && trade.setup !== setupFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!trade.ticker?.toLowerCase().includes(q) && !trade.setup?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tradedTrades, outcomeFilter, setupFilter, search]);

  const openTrade = (trade, startImg = false) => {
    setActiveTrade(trade);
    setActiveImgIndex(0);
    setStartWithChart(!startImg);
  };

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

  const FilterBtn = ({ value, current, onChange, label, color }) => (
    <button
      onClick={() => onChange(value)}
      style={{
        fontSize: 11, padding: '4px 11px', borderRadius: 6, border: 'none', cursor: 'pointer',
        background: current === value ? (color || 'var(--navy)') : 'var(--bg-card)',
        color: current === value ? '#fff' : 'var(--text-muted)',
        fontWeight: current === value ? 600 : 400, fontFamily: 'inherit',
      }}
    >{label}</button>
  );

  const withImages = tradedTrades.filter(t => t.chart_images?.length).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Images size={18} /> Chart Library
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {tradedTrades.length} עסקאות · {withImages} עם תמונות שמורות
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input
            className="input"
            style={{ paddingLeft: 30, width: '100%' }}
            placeholder="חפש לפי מנייה או תבנית..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <FilterBtn value="all"    current={outcomeFilter} onChange={setOutcomeFilter} label="הכל" />
          <FilterBtn value="wins"   current={outcomeFilter} onChange={setOutcomeFilter} label="✓ זוכות" />
          <FilterBtn value="losses" current={outcomeFilter} onChange={setOutcomeFilter} label="✗ הפסדים" />
        </div>
        {setups.length > 0 && (
          <select
            className="input"
            style={{ fontSize: 12, width: 150 }}
            value={setupFilter}
            onChange={e => setSetupFilter(e.target.value)}
          >
            <option value="all">כל התבניות</option>
            {setups.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)' }}>
          <Images size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>אין עסקאות סגורות עם טיקר</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {filtered.map((trade) => {
            const imgs = normalizeImages(trade.chart_images);
            const pnl = trade.pnl != null ? parseFloat(trade.pnl) : null;
            const rVal = trade.r_value != null ? parseFloat(trade.r_value) : null;
            const hasImages = imgs.length > 0;

            return (
              <div
                key={trade.id}
                onClick={() => openTrade(trade, false)}
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

                {/* Thumbnail or TV placeholder */}
                <div style={{ background: '#0f1724', height: 160, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {hasImages ? (
                    <img
                      src={imgs[0].src}
                      alt={`${trade.ticker} chart`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.5 }}>
                      <span style={{ fontSize: 28 }}>📈</span>
                      <span style={{ fontSize: 11, color: '#8ab', fontWeight: 600 }}>לחץ לגרף חי</span>
                    </div>
                  )}
                  {/* Upload button */}
                  <label
                    onClick={e => e.stopPropagation()}
                    title="העלה תמונה"
                    style={{
                      position: 'absolute', bottom: 6, right: 6,
                      background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6,
                      color: '#fff', cursor: 'pointer', padding: '4px 7px', fontSize: 11,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <Upload size={11} />
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUpload(trade, e)} />
                  </label>
                  {hasImages && (
                    <span style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10,
                      padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                    }}>{imgs.length}</span>
                  )}
                </div>

                {/* Footer */}
                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
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
        <TVLightbox
          trade={activeTrade}
          startImg={!startWithChart}
          allImages={normalizeImages(activeTrade.chart_images)}
          imgIndex={activeImgIndex}
          onClose={() => setActiveTrade(null)}
          onPrevImg={() => setActiveImgIndex(i => Math.max(0, i - 1))}
          onNextImg={() => setActiveImgIndex(i => Math.min(normalizeImages(activeTrade.chart_images).length - 1, i + 1))}
          theme={theme}
        />
      )}
    </div>
  );
}
