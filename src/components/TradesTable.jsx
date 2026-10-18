import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, StickyNote } from 'lucide-react';
import TradeModal from './TradeModal';
import TradeNotesModal from './TradeNotesModal';
import { buildTradeTimelines, formatDate } from '../utils/tradeLegs';

function pnlColor(v) {
  if (v > 0) return 'var(--green)';
  if (v < 0) return 'var(--red)';
  return 'var(--text-muted)';
}

function fmt(v, prefix = '$') {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${prefix}${Math.abs(parseFloat(v)).toFixed(2)}`;
}

function money(v) {
  return v == null || isNaN(v) ? null : `$${parseFloat(v).toFixed(2)}`;
}

// Price with the execution date underneath
function SideCell({ price, date, estimated }) {
  const p = money(price);
  if (!p) return <span style={{ color: 'var(--text-faint)' }}>—</span>;
  return (
    <div style={{ lineHeight: 1.25 }}>
      <div title={estimated ? 'Estimated from realized P&L — opening fill not in imported history' : undefined}>
        {estimated ? '≈' : ''}{p}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{formatDate(date)}</div>
    </div>
  );
}

function ExpandedLegs({ fills, direction }) {
  const label = direction === 'S' ? 'Sold' : 'Bought';
  return (
    <>
      <tr>
        <td colSpan={14} style={{ background: 'var(--bg-card)', padding: '6px 32px 2px', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Opening fills ({fills.length})
        </td>
      </tr>
      {fills.map((f, i) => (
        <tr key={`${f.id}-${i}`} style={{ background: 'var(--bg-card)' }}>
          <td></td>
          <td colSpan={13} style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {formatDate(f.date)} · {label} {f.qty} sh @ {money(f.price)}
          </td>
        </tr>
      ))}
    </>
  );
}

// allTrades: full history used to match closing fills to their opening fills
// (the dashboard passes a sliced `trades` list)
export default function TradesTable({ trades, allTrades = trades, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [notes, setNotes] = useState(null);
  const [filter, setFilter] = useState('');
  const [dirFilter, setDirFilter] = useState('ALL');
  const [confirm, setConfirm] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const timelines = useMemo(() => buildTradeTimelines(allTrades), [allTrades]);

  // Only show trades that have realized P&L (closing trades)
  const closedTrades = trades.filter(t => t.pnl != null);

  const filtered = closedTrades.filter(t => {
    const matchText = !filter || t.ticker?.toLowerCase().includes(filter.toLowerCase()) || t.setup?.toLowerCase().includes(filter.toLowerCase());
    const matchDir = dirFilter === 'ALL' || t.direction === dirFilter;
    return matchText && matchDir;
  });

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Closed Trades</span>
        <input
          className="input"
          style={{ width: 180 }}
          placeholder="Search ticker or setup..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <select className="input" style={{ width: 100 }} value={dirFilter} onChange={e => setDirFilter(e.target.value)}>
          <option value="ALL">All</option>
          <option value="L">Long</option>
          <option value="S">Short</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-faint)', fontWeight: 500 }}>
          {filtered.length} trades
        </span>
      </div>

      {/* Mobile cards */}
      <div className="trade-cards-mobile">
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '32px 0', fontSize: 13 }}>No closed trades yet</div>
        )}
        {filtered.map(t => (
          <div key={t.id} className="trade-card">
            <div className="trade-card-row1">
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.02em', flex: 1 }}>{t.ticker}</span>
              <span className={`badge ${t.direction === 'L' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
                {t.direction === 'L' ? 'Long' : 'Short'}
              </span>
              <span className="amount" style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: pnlColor(t.pnl), minWidth: 72, textAlign: 'right' }}>
                {fmt(t.pnl)}
              </span>
            </div>
            {(() => {
              const tl = timelines.get(t.id) || {};
              return (
                <div style={{ display: 'flex', gap: 20, margin: '6px 0', fontSize: 13, fontWeight: 600 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bought</div>
                    <SideCell price={tl.buyPrice} date={tl.buyDate} estimated={tl.estimated && t.direction !== 'S'} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sold</div>
                    <SideCell price={tl.sellPrice} date={tl.sellDate} estimated={tl.estimated && t.direction === 'S'} />
                  </div>
                </div>
              );
            })()}
            <div className="trade-card-row2">
              {t.quantity && <span>{t.quantity} sh</span>}
              {t.commission != null && <><span>·</span><span style={{ color: 'var(--red)' }}>-${parseFloat(t.commission).toFixed(2)} comm</span></>}
              {t.setup && <><span>·</span><span style={{ color: 'var(--text-muted)' }}>{t.setup}</span></>}
              {t.r_value != null && (
                <><span>·</span>
                <span style={{ fontWeight: 700, color: t.r_value >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {t.r_value >= 0 ? '+' : ''}{parseFloat(t.r_value).toFixed(2)}R
                </span></>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              {t.execution_score != null && (
                <span style={{ fontSize: 12, color: '#f59e0b' }}>
                  {'★'.repeat(t.execution_score)}{'☆'.repeat(5 - t.execution_score)}
                </span>
              )}
              {t.followed_rules != null && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 20,
                  background: t.followed_rules ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                  color: t.followed_rules ? 'var(--green)' : 'var(--red)',
                }}>
                  {t.followed_rules ? '✓ Rules' : '✗ Rules'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1, padding: '5px', fontSize: 12, justifyContent: 'center' }} onClick={() => setEditing(t)}>Edit</button>
              <button className="btn btn-ghost" style={{ flex: 1, padding: '5px', fontSize: 12, justifyContent: 'center', color: (t.notes || t.chart_images?.length) ? 'var(--navy)' : undefined }} onClick={() => setNotes(t)}>
                <StickyNote size={13} style={{ marginRight: 4 }} />Notes{t.chart_images?.length ? ` (${t.chart_images.length})` : ''}
              </button>
              <button className="btn btn-danger" style={{ flex: 1, padding: '5px', fontSize: 12, justifyContent: 'center' }} onClick={() => setConfirm(t.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="trade-table-desktop" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 520 }}>
        <table className="trade-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <th>Ticker</th>
              <th>Dir</th>
              <th>Bought</th>
              <th>Sold</th>
              <th>Shares</th>
              <th>P&amp;L</th>
              <th>Comm.</th>
              <th>R</th>
              <th>Setup</th>
              <th>Exec</th>
              <th>Rules</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={14} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 40 }}>No closed trades yet</td></tr>
            )}
            {filtered.map(t => {
              const isOpen = expanded.has(t.id);
              const tl = timelines.get(t.id) || {};
              const fills = tl.openFills || [];
              return (
                <>
                  <tr key={t.id} style={{ cursor: fills.length > 1 ? 'pointer' : 'default' }}
                    onClick={() => fills.length > 1 && toggleExpand(t.id)}>
                    <td style={{ textAlign: 'center', color: 'var(--text-faint)' }}>
                      {fills.length > 1
                        ? (isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />)
                        : null}
                    </td>
                    <td style={{ fontWeight: 600, letterSpacing: '0.02em' }}>{t.ticker}</td>
                    <td>
                      <span className={`badge ${t.direction === 'L' ? 'badge-green' : 'badge-red'}`}>
                        {t.direction === 'L' ? 'Long' : 'Short'}
                      </span>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      <SideCell price={tl.buyPrice} date={tl.buyDate} estimated={tl.estimated && t.direction !== 'S'} />
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      <SideCell price={tl.sellPrice} date={tl.sellDate} estimated={tl.estimated && t.direction === 'S'} />
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.quantity ?? '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: pnlColor(t.pnl) }}>
                      <span className="amount">{fmt(t.pnl)}</span>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: t.commission ? 'var(--red)' : 'var(--text-faint)' }}>
                      {t.commission != null ? `-$${parseFloat(t.commission).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 12 }}>
                      {t.r_value != null
                        ? <span style={{ color: t.r_value >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {t.r_value >= 0 ? '+' : ''}{parseFloat(t.r_value).toFixed(2)}R
                          </span>
                        : <span style={{ color: 'var(--text-faint)' }}>—</span>
                      }
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.setup || '—'}</td>
                    <td style={{ fontSize: 13, color: '#f59e0b', whiteSpace: 'nowrap' }}>
                      {t.execution_score != null ? '★'.repeat(t.execution_score) : <span style={{ color: 'var(--text-faint)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 11, fontWeight: 600 }}>
                      {t.followed_rules === true && <span style={{ color: 'var(--green)' }}>✓</span>}
                      {t.followed_rules === false && <span style={{ color: 'var(--red)' }}>✗</span>}
                      {t.followed_rules == null && <span style={{ color: 'var(--text-faint)' }}>—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11, marginRight: 4 }} onClick={() => setEditing(t)}>Edit</button>
                      <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11, marginRight: 4, color: (t.notes || t.chart_images?.length) ? 'var(--navy)' : undefined }} onClick={() => setNotes(t)} title="Notes & Charts">
                        <StickyNote size={12} />
                        {t.chart_images?.length ? <span style={{ fontSize: 10, marginLeft: 2 }}>{t.chart_images.length}</span> : null}
                      </button>
                      <button className="btn btn-danger" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => setConfirm(t.id)}>Del</button>
                    </td>
                  </tr>
                  {isOpen && <ExpandedLegs fills={fills} direction={t.direction} />}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <TradeModal
          trade={editing}
          onSave={fields => { onUpdate(editing.id, fields); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}

      {notes && (
        <TradeNotesModal
          trade={notes}
          onSave={fields => { onUpdate(notes.id, fields); }}
          onClose={() => setNotes(null)}
        />
      )}

      {confirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Delete trade?</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { onDelete(confirm); setConfirm(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
