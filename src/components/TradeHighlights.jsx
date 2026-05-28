import { useState, useMemo } from 'react';
import { Star, ChevronDown, ChevronUp, Edit2, BookOpen } from 'lucide-react';
import TradeNotesModal from './TradeNotesModal';

function pnlColor(v) {
  if (v > 0) return 'var(--green)';
  if (v < 0) return 'var(--red)';
  return 'var(--text-muted)';
}

function fmt(v) {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}$${Math.abs(parseFloat(v)).toFixed(2)}`;
}

function HighlightCard({ trade, onUpdate }) {
  const [editingLesson, setEditingLesson] = useState(false);
  const [lessonDraft, setLessonDraft] = useState(trade.lesson_learned || '');
  const [chartsOpen, setChartsOpen] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);

  const isBest = trade.highlight_type === 'best';
  const hasCharts = trade.chart_images?.length > 0;
  const hasNotes = trade.notes?.trim().length > 0;

  const saveLesson = () => {
    onUpdate(trade.id, { lesson_learned: lessonDraft });
    setEditingLesson(false);
  };

  const removeHighlight = () => {
    onUpdate(trade.id, { highlight_type: null });
  };

  const accentColor = isBest ? 'var(--green)' : 'var(--red)';
  const accentBg = isBest ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)';

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: `1px solid ${isBest ? 'rgba(52,211,153,0.35)' : 'rgba(248,113,113,0.35)'}`,
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top accent bar */}
      <div style={{ height: 3, background: accentColor }} />

      {/* Card header */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.02em' }}>{trade.ticker}</span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
              background: accentBg, color: accentColor,
            }}>
              {isBest ? '⭐ עסקה מצוינת' : '⚠ עסקה גרועה'}
            </span>
            {trade.direction && (
              <span className={`badge ${trade.direction === 'L' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
                {trade.direction === 'L' ? 'Long' : 'Short'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: pnlColor(trade.pnl) }} className="amount">{fmt(trade.pnl)}</span>
            {trade.r_value != null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: parseFloat(trade.r_value) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {parseFloat(trade.r_value) >= 0 ? '+' : ''}{parseFloat(trade.r_value).toFixed(2)}R
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{trade.date}</span>
            {trade.setup && (
              <span style={{ fontSize: 11, color: 'var(--text-faint)', background: 'var(--bg-card)', padding: '1px 7px', borderRadius: 20 }}>
                {trade.setup}
              </span>
            )}
            {trade.execution_score != null && (
              <span style={{ fontSize: 12, color: '#f59e0b' }}>{'★'.repeat(trade.execution_score)}{'☆'.repeat(5 - trade.execution_score)}</span>
            )}
          </div>
        </div>
        <button
          onClick={removeHighlight}
          title="הסר מההיילייטים"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 18, lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}
        >×</button>
      </div>

      {/* Lesson learned */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
          <BookOpen size={11} /> לקח / מה למדתי
        </div>
        {editingLesson ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              className="input"
              rows={3}
              value={lessonDraft}
              onChange={e => setLessonDraft(e.target.value)}
              placeholder="מה למדת מהעסקה הזו? מה היית עושה אחרת?"
              autoFocus
              style={{ resize: 'vertical', width: '100%', fontSize: 13, lineHeight: 1.6 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ fontSize: 12, padding: '5px 14px' }} onClick={saveLesson}>שמור</button>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 14px' }} onClick={() => { setEditingLesson(false); setLessonDraft(trade.lesson_learned || ''); }}>ביטול</button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => { setEditingLesson(true); setLessonDraft(trade.lesson_learned || ''); }}
            style={{
              fontSize: 13, color: trade.lesson_learned ? 'var(--text)' : 'var(--text-faint)',
              background: 'var(--bg-card)', borderRadius: 8, padding: '10px 12px',
              cursor: 'pointer', lineHeight: 1.6, whiteSpace: 'pre-wrap',
              minHeight: 44, border: `1px dashed ${trade.lesson_learned ? 'var(--border)' : accentColor}`,
              transition: 'border-color 0.15s',
            }}
          >
            {trade.lesson_learned || 'לחץ לכתיבת לקח מהעסקה...'}
            <Edit2 size={11} style={{ marginLeft: 6, opacity: 0.4, verticalAlign: 'middle', flexShrink: 0 }} />
          </div>
        )}
      </div>

      {/* Notes section */}
      {hasNotes && (
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>הערות</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{trade.notes}</p>
        </div>
      )}

      {/* Charts toggle */}
      {hasCharts && (
        <div style={{ padding: '0 16px 14px' }}>
          <button
            onClick={() => setChartsOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--navy)', fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}
          >
            📸 {trade.chart_images.length} גרף{trade.chart_images.length > 1 ? 'ים' : ''}
            {chartsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {chartsOpen && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trade.chart_images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${trade.ticker} chart ${i + 1}`}
                  style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', maxHeight: 500, objectFit: 'contain', background: '#000', display: 'block' }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px', display: 'flex', gap: 8 }}>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12, padding: '4px 12px' }}
          onClick={() => setEditingNotes(true)}
        >
          ✎ עריכת הערות וגרפים
        </button>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12, padding: '4px 12px', color: isBest ? 'var(--red)' : 'var(--green)' }}
          onClick={() => onUpdate(trade.id, { highlight_type: isBest ? 'worst' : 'best' })}
        >
          {isBest ? '⚠ סמן כגרועה' : '⭐ סמן כמצוינת'}
        </button>
      </div>

      {editingNotes && (
        <TradeNotesModal
          trade={trade}
          onSave={fields => { onUpdate(trade.id, fields); setEditingNotes(false); }}
          onClose={() => setEditingNotes(false)}
        />
      )}
    </div>
  );
}

export default function TradeHighlights({ trades, onUpdate }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const highlighted = useMemo(() => {
    return trades
      .filter(t => t.pnl != null && (t.highlight_type === 'best' || t.highlight_type === 'worst'))
      .filter(t => {
        if (filter === 'best') return t.highlight_type === 'best';
        if (filter === 'worst') return t.highlight_type === 'worst';
        return true;
      })
      .filter(t => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          t.ticker?.toLowerCase().includes(q) ||
          t.lesson_learned?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q) ||
          t.setup?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [trades, filter, search]);

  const bestCount = trades.filter(t => t.highlight_type === 'best').length;
  const worstCount = trades.filter(t => t.highlight_type === 'worst').length;

  const totalPnlBest = trades.filter(t => t.highlight_type === 'best' && t.pnl != null)
    .reduce((s, t) => s + parseFloat(t.pnl), 0);
  const totalPnlWorst = trades.filter(t => t.highlight_type === 'worst' && t.pnl != null)
    .reduce((s, t) => s + parseFloat(t.pnl), 0);

  const FilterBtn = ({ k, label }) => (
    <button
      onClick={() => setFilter(k)}
      style={{
        fontSize: 12, padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
        background: filter === k ? 'var(--navy)' : 'var(--bg-card)',
        color: filter === k ? '#fff' : 'var(--text-muted)',
        fontWeight: filter === k ? 600 : 400, fontFamily: 'inherit',
      }}
    >{label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={18} color="#f59e0b" fill="#f59e0b" /> Trade Highlights
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
            עסקאות שכדאי לזכור וללמוד מהן
          </div>
        </div>

        {/* Summary pills */}
        {(bestCount + worstCount) > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {bestCount > 0 && (
              <div style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, background: 'rgba(52,211,153,0.1)', color: 'var(--green)', fontWeight: 600 }}>
                ⭐ {bestCount} מצוינות · +${Math.abs(totalPnlBest).toFixed(0)}
              </div>
            )}
            {worstCount > 0 && (
              <div style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, background: 'rgba(248,113,113,0.1)', color: 'var(--red)', fontWeight: 600 }}>
                ⚠ {worstCount} גרועות · -${Math.abs(totalPnlWorst).toFixed(0)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          style={{ flex: '1 1 200px', minWidth: 160 }}
          placeholder="חיפוש לפי טיקר, לקח, הערות..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          <FilterBtn k="all" label="הכל" />
          <FilterBtn k="best" label="⭐ מצוינות" />
          <FilterBtn k="worst" label="⚠ גרועות" />
        </div>
      </div>

      {/* Empty state */}
      {highlighted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--text-faint)' }}>
          <Star size={36} style={{ marginBottom: 14, opacity: 0.25 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            {bestCount + worstCount === 0 ? 'עדיין אין עסקאות מסומנות' : 'אין עסקאות מתאימות לסינון'}
          </div>
          <div style={{ fontSize: 13, maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
            {bestCount + worstCount === 0
              ? 'לחץ על כפתור ☆ בטבלת העסקאות כדי לסמן עסקאות כ"מצוינת" או "גרועה" ולהתחיל ללמוד מהן'
              : 'נסה לשנות את הסינון'}
          </div>
        </div>
      )}

      {/* Cards grid */}
      {highlighted.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 16,
        }}>
          {highlighted.map(t => (
            <HighlightCard key={t.id} trade={t} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
