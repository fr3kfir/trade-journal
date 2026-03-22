import { useState } from 'react';
import TradeModal from './TradeModal';

function pnlColor(v) {
  if (v > 0) return 'var(--green)';
  if (v < 0) return 'var(--red)';
  return 'var(--text-muted)';
}

export default function TradesTable({ trades, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('');
  const [dirFilter, setDirFilter] = useState('ALL');
  const [confirm, setConfirm] = useState(null);

  const filtered = trades.filter(t => {
    const matchText = !filter || t.ticker?.toLowerCase().includes(filter.toLowerCase()) || t.setup?.toLowerCase().includes(filter.toLowerCase());
    const matchDir = dirFilter === 'ALL' || t.direction === dirFilter;
    return matchText && matchDir;
  });

  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-panel)' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Trade Log</span>
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
          {filtered.length} {filtered.length === 1 ? 'trade' : 'trades'}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 460 }}>
        <table className="trade-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Ticker</th>
              <th>Dir</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>Stop</th>
              <th>Shares</th>
              <th>P&amp;L</th>
              <th>R</th>
              <th>Setup</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 40 }}>No trades yet</td></tr>
            )}
            {filtered.map(t => (
              <tr key={t.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{t.date}</td>
                <td style={{ fontWeight: 600, letterSpacing: '0.02em' }}>{t.ticker}</td>
                <td>
                  <span className={`badge ${t.direction === 'L' ? 'badge-green' : 'badge-red'}`}>
                    {t.direction === 'L' ? 'Long' : 'Short'}
                  </span>
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.entry ? `$${parseFloat(t.entry).toFixed(2)}` : '—'}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.exit  ? `$${parseFloat(t.exit).toFixed(2)}`  : '—'}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>{t.stop ? `$${parseFloat(t.stop).toFixed(2)}` : '—'}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{t.quantity ?? '—'}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: pnlColor(t.pnl) }}>
                  {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}$${parseFloat(t.pnl).toFixed(2)}` : '—'}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
                  {t.r_value != null ? `${t.r_value}R` : '—'}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.setup || '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11, marginRight: 4 }} onClick={() => setEditing(t)}>Edit</button>
                  <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setConfirm(t.id)}>Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <TradeModal
          trade={editing}
          onSave={fields => { onUpdate(editing.id, fields); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Confirm delete */}
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
