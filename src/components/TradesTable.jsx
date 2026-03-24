import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import TradeModal from './TradeModal';

function pnlColor(v) {
  if (v > 0) return 'var(--green)';
  if (v < 0) return 'var(--red)';
  return 'var(--text-muted)';
}

function fmt(v, prefix = '$') {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${prefix}${Math.abs(parseFloat(v)).toFixed(2)}`;
}

// For a closing trade, find related opening legs (same ticker, no P&L, earlier/same date)
function getLegs(closeTrade, allTrades) {
  return allTrades.filter(t =>
    t.id !== closeTrade.id &&
    t.ticker === closeTrade.ticker &&
    t.pnl == null &&
    new Date(t.date) <= new Date(closeTrade.date)
  );
}

function ExpandedLegs({ legs }) {
  if (!legs.length) return (
    <tr>
      <td colSpan={10} style={{ padding: '10px 32px', color: 'var(--text-faint)', fontSize: 12, background: 'var(--bg-card)' }}>
        No opening legs found for this position
      </td>
    </tr>
  );
  return (
    <>
      <tr>
        <td colSpan={10} style={{ background: 'var(--bg-card)', padding: '6px 32px 2px', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Opening legs ({legs.length})
        </td>
      </tr>
      {legs.map(leg => (
        <tr key={leg.id} style={{ background: 'var(--bg-card)' }}>
          <td style={{ paddingLeft: 32, fontSize: 11, color: 'var(--text-muted)' }}>{leg.date}</td>
          <td style={{ fontSize: 12, fontWeight: 500 }}>{leg.ticker}</td>
          <td>
            <span className={`badge ${leg.direction === 'L' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10, padding: '1px 7px' }}>
              {leg.direction === 'L' ? 'Long' : 'Short'}
            </span>
          </td>
          <td style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{leg.entry ? `$${parseFloat(leg.entry).toFixed(2)}` : '—'}</td>
          <td style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>{leg.quantity ?? '—'}</td>
          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{leg.open_close || '—'}</td>
          <td colSpan={4} style={{ fontSize: 11, color: 'var(--text-faint)' }}>Open position — no realized P&amp;L</td>
        </tr>
      ))}
    </>
  );
}

export default function TradesTable({ trades, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('');
  const [dirFilter, setDirFilter] = useState('ALL');
  const [confirm, setConfirm] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

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
              <span style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: pnlColor(t.pnl), minWidth: 72, textAlign: 'right' }}>
                {fmt(t.pnl)}
              </span>
            </div>
            <div className="trade-card-row2">
              <span>{t.date}</span>
              {t.entry && <><span>·</span><span>${parseFloat(t.entry).toFixed(2)}</span></>}
              {t.quantity && <><span>·</span><span>{t.quantity} shares</span></>}
              {t.setup && <><span>·</span><span>{t.setup}</span></>}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1, padding: '5px', fontSize: 12, justifyContent: 'center' }} onClick={() => setEditing(t)}>Edit</button>
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
              <th>Date</th>
              <th>Ticker</th>
              <th>Dir</th>
              <th>Price</th>
              <th>Shares</th>
              <th>P&amp;L</th>
              <th>Commission</th>
              <th>Setup</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 40 }}>No closed trades yet</td></tr>
            )}
            {filtered.map(t => {
              const isOpen = expanded.has(t.id);
              const legs = getLegs(t, trades);
              return (
                <>
                  <tr key={t.id} style={{ cursor: legs.length ? 'pointer' : 'default' }}
                    onClick={() => legs.length && toggleExpand(t.id)}>
                    <td style={{ textAlign: 'center', color: 'var(--text-faint)' }}>
                      {legs.length > 0
                        ? (isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />)
                        : null}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{t.date}</td>
                    <td style={{ fontWeight: 600, letterSpacing: '0.02em' }}>{t.ticker}</td>
                    <td>
                      <span className={`badge ${t.direction === 'L' ? 'badge-green' : 'badge-red'}`}>
                        {t.direction === 'L' ? 'Long' : 'Short'}
                      </span>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.entry ? `$${parseFloat(t.entry).toFixed(2)}` : '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.quantity ?? '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: pnlColor(t.pnl) }}>
                      {fmt(t.pnl)}
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--red)', fontSize: 12 }}>
                      {t.commission ? `-$${Math.abs(parseFloat(t.commission)).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.setup || '—'}</td>
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11, marginRight: 4 }} onClick={() => setEditing(t)}>Edit</button>
                      <button className="btn btn-danger" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => setConfirm(t.id)}>Del</button>
                    </td>
                  </tr>
                  {isOpen && <ExpandedLegs legs={legs} />}
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
