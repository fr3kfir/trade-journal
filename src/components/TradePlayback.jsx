import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { STAGES } from './ChartLibrary';

const STAGE_ORDER = ['setup', 'entry', 'add', 'exit', 'post'];

function normalizeImages(raw) {
  return (raw || []).map(img =>
    typeof img === 'string' ? { src: img, stage: 'setup' } : img
  );
}

function sortByStage(images) {
  return [...images].sort((a, b) =>
    STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
  );
}

function pnlColor(v) {
  if (v > 0) return '#22c55e';
  if (v < 0) return '#ef4444';
  return '#94a3b8';
}

export default function TradePlayback({ trade, onClose }) {
  const images = sortByStage(normalizeImages(trade.chart_images));
  const [idx, setIdx] = useState(0);

  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIdx(i => Math.min(images.length - 1, i + 1)), [images.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  if (!images.length) return null;

  const img = images[idx];
  const stage = STAGES.find(s => s.key === img.stage) || STAGES[0];
  const pnl = trade.pnl != null ? parseFloat(trade.pnl) : null;
  const rVal = trade.r_value != null ? parseFloat(trade.r_value) : null;

  // Group images by stage for the timeline
  const stageGroups = STAGE_ORDER.map(key => ({
    key,
    label: STAGES.find(s => s.key === key)?.label || key,
    color: STAGES.find(s => s.key === key)?.color || '#888',
    indices: images.reduce((acc, im, i) => im.stage === key ? [...acc, i] : acc, []),
  })).filter(g => g.indices.length > 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#09090b',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
      }}>
        {/* Stage label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', background: stage.color, flexShrink: 0,
            boxShadow: `0 0 8px ${stage.color}`,
          }} />
          <span style={{
            fontSize: 13, fontWeight: 800, color: stage.color,
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>
            {stage.label}
          </span>
        </div>

        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

        {/* Trade info */}
        <span style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', letterSpacing: '0.04em' }}>
          {trade.ticker}
        </span>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 700,
          background: trade.direction === 'L' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          color: trade.direction === 'L' ? '#22c55e' : '#ef4444',
        }}>
          {trade.direction === 'L' ? 'LONG' : 'SHORT'}
        </span>
        {trade.setup && (
          <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '2px 9px', borderRadius: 20 }}>
            {trade.setup}
          </span>
        )}

        {/* P&L */}
        {pnl != null && (
          <span style={{ fontSize: 14, fontWeight: 700, color: pnlColor(pnl) }} className="amount">
            {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
          </span>
        )}
        {rVal != null && (
          <span style={{ fontSize: 12, fontWeight: 700, color: rVal >= 0 ? '#22c55e' : '#ef4444' }}>
            {rVal >= 0 ? '+' : ''}{rVal.toFixed(2)}R
          </span>
        )}
        <span style={{ fontSize: 12, color: '#475569' }}>{trade.date}</span>

        {/* Counter */}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
          {idx + 1} / {images.length}
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8',
            cursor: 'pointer', borderRadius: 8, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Stage color strip */}
      <div style={{ height: 2, background: stage.color, opacity: 0.7, flexShrink: 0 }} />

      {/* Main image area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '16px 80px' }}>

        {/* Prev arrow */}
        <button
          onClick={prev}
          disabled={idx === 0}
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            background: idx === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)', color: idx === 0 ? '#334155' : '#94a3b8',
            cursor: idx === 0 ? 'default' : 'pointer',
            borderRadius: 12, width: 48, height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (idx > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = idx === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)'; }}
        >
          <ChevronLeft size={22} />
        </button>

        {/* Image */}
        <img
          key={idx}
          src={img.src}
          alt={`${trade.ticker} ${stage.label}`}
          style={{
            maxWidth: '100%', maxHeight: '100%',
            objectFit: 'contain', display: 'block',
            borderRadius: 6,
            animation: 'fadeSlide 0.2s ease',
          }}
        />

        {/* Next arrow */}
        <button
          onClick={next}
          disabled={idx === images.length - 1}
          style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            background: idx === images.length - 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)', color: idx === images.length - 1 ? '#334155' : '#94a3b8',
            cursor: idx === images.length - 1 ? 'default' : 'pointer',
            borderRadius: 12, width: 48, height: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (idx < images.length - 1) e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = idx === images.length - 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)'; }}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Notes */}
      {trade.notes?.trim() && (
        <div style={{
          padding: '10px 80px', flexShrink: 0,
          fontSize: 13, color: '#64748b', lineHeight: 1.6,
          borderTop: '1px solid rgba(255,255,255,0.04)',
          whiteSpace: 'pre-wrap',
          maxHeight: 72, overflow: 'hidden',
        }}>
          {trade.notes}
        </div>
      )}

      {/* Stage timeline */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 0, padding: '12px 24px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
      }}>
        {stageGroups.map((group, gi) => {
          const isCurrentGroup = group.indices.includes(idx);
          const isPast = group.indices[group.indices.length - 1] < idx;
          return (
            <div key={group.key} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Connector line */}
              {gi > 0 && (
                <div style={{
                  width: 40, height: 1,
                  background: isPast || isCurrentGroup ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                }} />
              )}
              {/* Stage pill */}
              <button
                onClick={() => setIdx(group.indices[0])}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px',
                }}
              >
                {/* Dots for each image in this stage */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {group.indices.map(i => (
                    <div
                      key={i}
                      onClick={e => { e.stopPropagation(); setIdx(i); }}
                      style={{
                        width: i === idx ? 20 : 6,
                        height: 6, borderRadius: 3,
                        background: i === idx ? group.color : isCurrentGroup || isPast ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        boxShadow: i === idx ? `0 0 6px ${group.color}` : 'none',
                      }}
                    />
                  ))}
                </div>
                <span style={{
                  fontSize: 9, fontWeight: isCurrentGroup ? 700 : 500,
                  color: isCurrentGroup ? group.color : isPast ? '#475569' : '#1e293b',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  transition: 'color 0.2s',
                }}>
                  {group.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0.6; transform: scale(0.99); }
          to   { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
