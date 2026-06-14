import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Images, ChevronLeft, ChevronRight, Search, Download, Loader } from 'lucide-react';

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

function Lightbox({ items, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const item = items[idx];

  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIdx(i => Math.min(items.length - 1, i + 1)), [items.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  const { img, trade } = item;
  const pnl = trade.pnl != null ? parseFloat(trade.pnl) : null;
  const rVal = trade.r_value != null ? parseFloat(trade.r_value) : null;
  const stage = STAGES.find(s => s.key === img.stage) || STAGES[0];

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: '92vw' }}>

        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: -36, right: 0,
            background: 'none', border: 'none', color: '#fff',
            cursor: 'pointer', fontSize: 26, lineHeight: 1,
          }}
        >×</button>

        {/* Stage strip */}
        <div style={{ height: 3, background: stage.color, borderRadius: 2 }} />

        <img
          src={img.src}
          alt={`${trade.ticker} chart`}
          style={{ maxWidth: '92vw', maxHeight: '66vh', objectFit: 'contain', borderRadius: 8, display: 'block' }}
        />

        {/* Trade info bar */}
        <div style={{
          background: 'var(--bg-panel)', borderRadius: 8, padding: '11px 16px',
          display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{trade.ticker}</span>
          <span className={`badge ${trade.direction === 'L' ? 'badge-green' : 'badge-red'}`}>
            {trade.direction === 'L' ? 'Long' : 'Short'}
          </span>
          <StageBadge stageKey={img.stage} />
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
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)' }}>
            {idx + 1} / {items.length}
          </span>
        </div>

        {trade.notes?.trim() && (
          <div style={{
            background: 'var(--bg-panel)', borderRadius: 8, padding: '9px 14px',
            fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55,
            border: '1px solid var(--border)', maxWidth: '92vw', whiteSpace: 'pre-wrap',
          }}>
            {trade.notes}
          </div>
        )}

        {items.length > 1 && (
          <>
            <button onClick={prev} disabled={idx === 0} style={{
              position: 'absolute', left: -52, top: '38%',
              background: idx === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.55)',
              border: 'none', color: '#fff', cursor: idx === 0 ? 'default' : 'pointer',
              borderRadius: '50%', width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ChevronLeft size={20} />
            </button>
            <button onClick={next} disabled={idx === items.length - 1} style={{
              position: 'absolute', right: -52, top: '38%',
              background: idx === items.length - 1 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.55)',
              border: 'none', color: '#fff', cursor: idx === items.length - 1 ? 'default' : 'pointer',
              borderRadius: '50%', width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ChevronRight size={20} />
            </button>
          </>
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
  const [stageFilter, setStageFilter] = useState('all');
  const [lightboxItems, setLightboxItems] = useState(null);
  const [lightboxStart, setLightboxStart] = useState(0);
  const [autoFetching, setAutoFetching] = useState(false);
  const [autoFetchProgress, setAutoFetchProgress] = useState(null);
  const [autoFetchResult, setAutoFetchResult] = useState(null);
  const autoFetchedOnMount = useRef(false);

  const tradesWithoutCharts = useMemo(() =>
    trades.filter(t => t.pnl != null && t.ticker && !t.chart_images?.length),
  [trades]);

  const handleAutoFetch = useCallback(async () => {
    if (!tradesWithoutCharts.length || autoFetching) return;
    setAutoFetching(true);
    setAutoFetchResult(null);
    setAutoFetchProgress({ done: 0, total: tradesWithoutCharts.length, current: '' });
    let success = 0, failed = 0;
    for (let i = 0; i < tradesWithoutCharts.length; i++) {
      const trade = tradesWithoutCharts[i];
      setAutoFetchProgress({ done: i, total: tradesWithoutCharts.length, current: trade.ticker });
      try {
        const res = await fetch(`/api/chart?ticker=${encodeURIComponent(trade.ticker)}&tf=d`);
        const data = await res.json();
        if (data.src) {
          onUpdate(trade.id, { chart_images: [{ src: data.src, stage: 'setup' }] });
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      await new Promise(r => setTimeout(r, 300));
    }
    setAutoFetching(false);
    setAutoFetchProgress(null);
    setAutoFetchResult({ success, failed });
    setTimeout(() => setAutoFetchResult(null), 6000);
  }, [tradesWithoutCharts, autoFetching, onUpdate]);

  // Auto-trigger on first open if there are trades missing charts
  useEffect(() => {
    if (autoFetchedOnMount.current || !tradesWithoutCharts.length) return;
    autoFetchedOnMount.current = true;
    handleAutoFetch();
  }, [tradesWithoutCharts.length, handleAutoFetch]);

  // Flatten all chart images
  const allItems = useMemo(() => {
    const items = [];
    for (const trade of trades) {
      const imgs = normalizeImages(trade.chart_images);
      for (const img of imgs) {
        items.push({ img, trade });
      }
    }
    return items.sort((a, b) => new Date(b.trade.date) - new Date(a.trade.date));
  }, [trades]);

  const setups = useMemo(() => {
    const s = new Set();
    for (const { trade } of allItems) if (trade.setup) s.add(trade.setup);
    return [...s].sort();
  }, [allItems]);

  const filtered = useMemo(() => {
    return allItems.filter(({ img, trade }) => {
      if (setupFilter !== 'all' && trade.setup !== setupFilter) return false;
      if (outcomeFilter === 'wins' && !(parseFloat(trade.pnl) > 0)) return false;
      if (outcomeFilter === 'losses' && !(parseFloat(trade.pnl) < 0)) return false;
      if (directionFilter !== 'all' && trade.direction !== directionFilter) return false;
      if (stageFilter !== 'all' && img.stage !== stageFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!trade.ticker?.toLowerCase().includes(q) && !trade.setup?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allItems, setupFilter, outcomeFilter, directionFilter, stageFilter, search]);

  const openLightbox = (idx) => {
    setLightboxStart(idx);
    setLightboxItems(filtered);
  };

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Images size={18} /> Chart Library
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {allItems.length} charts · {trades.filter(t => t.chart_images?.length).length} trades with images
            {tradesWithoutCharts.length > 0 && (
              <span style={{ color: 'var(--text-faint)' }}> · {tradesWithoutCharts.length} ללא גרף</span>
            )}
          </div>
        </div>
        {autoFetchResult && (
          <div style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, background: 'var(--bg-card)', color: autoFetchResult.failed > 0 ? 'var(--text-muted)' : 'var(--green)' }}>
            ✓ {autoFetchResult.success} גרפים נטענו
            {autoFetchResult.failed > 0 && <span style={{ color: 'var(--red)' }}> · {autoFetchResult.failed} נכשלו</span>}
          </div>
        )}
        {tradesWithoutCharts.length > 0 && (
          <button
            onClick={handleAutoFetch}
            disabled={autoFetching}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, padding: '7px 14px',
              borderRadius: 8, border: 'none', cursor: autoFetching ? 'default' : 'pointer',
              background: autoFetching ? 'var(--bg-card)' : 'var(--navy)',
              color: autoFetching ? 'var(--text-muted)' : '#fff',
              fontFamily: 'inherit', transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            {autoFetching
              ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> {autoFetchProgress?.current} ({autoFetchProgress?.done}/{autoFetchProgress?.total})</>
              : <><Download size={13} /> Auto-fetch {tradesWithoutCharts.length} גרפים</>}
          </button>
        )}
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

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

        <div style={{ display: 'flex', gap: 4 }}>
          <FilterBtn value="all" current={directionFilter} onChange={setDirectionFilter} label="L+S" />
          <FilterBtn value="L"   current={directionFilter} onChange={setDirectionFilter} label="Long" />
          <FilterBtn value="S"   current={directionFilter} onChange={setDirectionFilter} label="Short" />
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

      {/* Stage filter row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)', marginRight: 2 }}>שלב:</span>
        <FilterBtn value="all" current={stageFilter} onChange={setStageFilter} label="הכל" />
        {STAGES.map(s => (
          <FilterBtn
            key={s.key}
            value={s.key}
            current={stageFilter}
            onChange={setStageFilter}
            label={s.label}
            color={s.color}
          />
        ))}
      </div>

      {/* Setup chips with win rate */}
      {setups.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {setups.map(setup => {
            const setupItems = allItems.filter(i => i.trade.setup === setup);
            const withPnl = setupItems.filter(i => i.trade.pnl != null);
            const wins = withPnl.filter(i => parseFloat(i.trade.pnl) > 0).length;
            if (!withPnl.length) return null;
            return (
              <button
                key={setup}
                onClick={() => setSetupFilter(setupFilter === setup ? 'all' : setup)}
                style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 20,
                  border: '1px solid var(--border)', cursor: 'pointer',
                  background: setupFilter === setup ? 'var(--navy)' : 'var(--bg-card)',
                  color: setupFilter === setup ? '#fff' : 'var(--text-muted)',
                  fontFamily: 'inherit', display: 'flex', gap: 5, alignItems: 'center',
                }}
              >
                <span>{setup}</span>
                <span style={{ opacity: 0.7 }}>{setupItems.length}</span>
                <span style={{ color: setupFilter === setup ? '#86efac' : 'var(--green)', fontWeight: 600 }}>
                  {Math.round(wins / withPnl.length * 100)}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)' }}>
          <Images size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>
            {allItems.length === 0
              ? 'אין גרפים עדיין — הוסף תמונות לעסקאות דרך Trade Review'
              : 'אין גרפים מתאימים לפילטר הנוכחי'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {filtered.map((item, idx) => {
            const { img, trade } = item;
            const pnl = trade.pnl != null ? parseFloat(trade.pnl) : null;
            const rVal = trade.r_value != null ? parseFloat(trade.r_value) : null;
            const stage = STAGES.find(s => s.key === img.stage) || STAGES[0];
            return (
              <div
                key={`${trade.id}-${idx}`}
                onClick={() => openLightbox(idx)}
                style={{
                  background: 'var(--bg-panel)', border: '1px solid var(--border)',
                  borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                  transition: 'box-shadow 0.15s, transform 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,0,0,0.13)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                {/* Stage color strip */}
                <div style={{ height: 3, background: stage.color }} />

                {/* Thumbnail */}
                <div style={{ background: '#000', height: 170, overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={img.src}
                    alt={`${trade.ticker} chart`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* Win/loss tint strip at bottom */}
                  {pnl != null && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                      background: pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'transparent',
                    }} />
                  )}
                </div>

                {/* Footer */}
                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{trade.ticker}</span>
                    <span className={`badge ${trade.direction === 'L' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 9 }}>
                      {trade.direction === 'L' ? 'Long' : 'Short'}
                    </span>
                    <StageBadge stageKey={img.stage} />
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

      {lightboxItems && (
        <Lightbox items={lightboxItems} startIndex={lightboxStart} onClose={() => setLightboxItems(null)} />
      )}
    </div>
  );
}
