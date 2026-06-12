import { useState, useMemo } from 'react';
import { StickyNote, ChevronDown, ChevronUp, ImageOff, Search } from 'lucide-react';
import TradeNotesModal from './TradeNotesModal';
import { STAGES } from './ChartLibrary';

function normalizeImages(raw) {
  return (raw || []).map(img =>
    typeof img === 'string' ? { src: img, stage: 'setup' } : img
  );
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

function pnlColor(v) {
  if (v > 0) return 'var(--green)';
  if (v < 0) return 'var(--red)';
  return 'var(--text-muted)';
}

function fmt(v) {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}$${Math.abs(parseFloat(v)).toFixed(2)}`;
}

function TradeCard({ trade, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const hasImages = trade.chart_images?.length > 0;
  const hasNotes  = trade.notes?.trim().length > 0;

  return (
    <div style={{
      background: 'var(--bg-panel)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      transition: 'box-shadow 0.15s',
    }}>
      {/* Card header — always visible */}
      <div
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Left: ticker + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.03em', color: 'var(--text)' }}>{trade.ticker}</span>
            <span className={`badge ${trade.direction === 'L' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
              {trade.direction === 'L' ? 'Long' : 'Short'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: pnlColor(trade.pnl) }} className="amount">
              {fmt(trade.pnl)}
            </span>
            {trade.r_value != null && (
              <span style={{ fontSize: 11, fontWeight: 600, color: parseFloat(trade.r_value) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {parseFloat(trade.r_value) >= 0 ? '+' : ''}{parseFloat(trade.r_value).toFixed(2)}R
              </span>
            )}
            {trade.setup && (
              <span style={{ fontSize: 11, color: 'var(--text-faint)', background: 'var(--bg-card)', padding: '1px 7px', borderRadius: 20 }}>
                {trade.setup}
              </span>
            )}
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>{trade.date}</span>
            {trade.execution_score != null && (
              <span style={{ color: '#f59e0b' }}>{'★'.repeat(trade.execution_score)}{'☆'.repeat(5 - trade.execution_score)}</span>
            )}
            {trade.followed_rules != null && (
              <span style={{ fontWeight: 600, color: trade.followed_rules ? 'var(--green)' : 'var(--red)' }}>
                {trade.followed_rules ? '✓ Rules' : '✗ Rules'}
              </span>
            )}
          </div>

          {/* Notes preview */}
          {hasNotes && !expanded && (
            <p style={{
              fontSize: 12, color: 'var(--text-muted)', marginTop: 6, marginBottom: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}>
              {trade.notes}
            </p>
          )}
        </div>

        {/* Right: indicators + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {hasImages && (
            <span style={{ fontSize: 11, color: 'var(--navy)', background: 'rgba(37,99,235,0.1)', padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>
              {trade.chart_images.length} 📸
            </span>
          )}
          {expanded ? <ChevronUp size={15} color="var(--text-faint)" /> : <ChevronDown size={15} color="var(--text-faint)" />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Full notes */}
          {hasNotes && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Notes</div>
              <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{trade.notes}</p>
            </div>
          )}

          {/* Chart images */}
          {hasImages && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                Charts ({trade.chart_images.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {normalizeImages(trade.chart_images).map((img, i) => {
                  const stage = STAGES.find(s => s.key === img.stage) || STAGES[0];
                  return (
                    <div key={i} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <div style={{ height: 2, background: stage.color }} />
                      <div style={{ padding: '4px 10px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StageBadge stageKey={img.stage} />
                      </div>
                      <img
                        src={img.src}
                        alt={`${trade.ticker} chart ${i + 1}`}
                        style={{ width: '100%', display: 'block', maxHeight: 500, objectFit: 'contain', background: '#000' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Edit button */}
          <div>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '5px 14px' }}
              onClick={() => setEditing(true)}
            >
              ✎ Edit Notes & Charts
            </button>
          </div>
        </div>
      )}

      {editing && (
        <TradeNotesModal
          trade={trade}
          onSave={fields => onUpdate(trade.id, fields)}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

export default function TradeReview({ trades, onUpdate }) {
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all'); // all | notes | charts | both
  const [sortBy, setSortBy]     = useState('date'); // date | ticker | pnl

  const reviewed = useMemo(() => {
    return trades
      .filter(t => t.pnl != null) // closed trades only
      .filter(t => {
        const hasNotes  = t.notes?.trim().length > 0;
        const hasImages = t.chart_images?.length > 0;
        if (filter === 'notes')  return hasNotes;
        if (filter === 'charts') return hasImages;
        if (filter === 'both')   return hasNotes && hasImages;
        return hasNotes || hasImages; // 'all' = any content
      })
      .filter(t => {
        if (!search) return true;
        const q = search.toLowerCase();
        return t.ticker?.toLowerCase().includes(q)
          || t.notes?.toLowerCase().includes(q)
          || t.setup?.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'ticker') return a.ticker?.localeCompare(b.ticker);
        if (sortBy === 'pnl')    return parseFloat(b.pnl) - parseFloat(a.pnl);
        return new Date(b.date) - new Date(a.date); // date desc
      });
  }, [trades, filter, search, sortBy]);

  const totalWithContent = trades.filter(t => t.pnl != null && (t.notes?.trim() || t.chart_images?.length)).length;

  const FilterBtn = ({ k, label }) => (
    <button
      onClick={() => setFilter(k)}
      style={{
        fontSize: 11, padding: '4px 11px', borderRadius: 6, border: 'none', cursor: 'pointer',
        background: filter === k ? 'var(--navy)' : 'var(--bg-card)',
        color: filter === k ? '#fff' : 'var(--text-muted)',
        fontWeight: filter === k ? 600 : 400, fontFamily: 'inherit',
      }}
    >{label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <StickyNote size={18} /> Trade Review
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {totalWithContent} trades with notes or charts
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input
            className="input"
            style={{ paddingLeft: 30, width: '100%' }}
            placeholder="Search ticker or notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          <FilterBtn k="all"    label="All" />
          <FilterBtn k="notes"  label="Notes only" />
          <FilterBtn k="charts" label="Charts only" />
          <FilterBtn k="both"   label="Notes + Charts" />
        </div>

        {/* Sort */}
        <select
          className="input"
          style={{ width: 120, fontSize: 12 }}
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="date">Latest first</option>
          <option value="ticker">By ticker</option>
          <option value="pnl">By P&L</option>
        </select>
      </div>

      {/* Cards */}
      {reviewed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)' }}>
          <ImageOff size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>
            {totalWithContent === 0
              ? 'No notes yet — click the 📝 icon on any trade to add notes or charts'
              : 'No trades match the current filter'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviewed.map(t => (
            <TradeCard key={t.id} trade={t} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
