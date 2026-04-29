import { useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { usePortfolioStore } from '../hooks/usePortfolioStore';

const EMPTY = { symbol: '', quantity: '', entry_price: '', stop_loss: '', notes: '' };

export default function Portfolio({ trades = [] }) {
  const { data: positions, add, update, remove } = usePortfolioStore();
  const [form, setForm] = useState(null);
  const [draft, setDraft] = useState(EMPTY);

  // Only manually-entered trades that are still open (no realized P&L)
  const openTrades = trades.filter(t => t.pnl == null && t.ticker && !t.id?.startsWith('ibkr-'));

  const openAdd = () => { setDraft(EMPTY); setForm('new'); };
  const save = () => {
    if (!draft.symbol) return;
    const p = { ...draft, quantity: parseFloat(draft.quantity) || 0, entry_price: parseFloat(draft.entry_price) || 0, stop_loss: parseFloat(draft.stop_loss) || 0 };
    if (form === 'new') add(p);
    else update(form, p);
    setForm(null);
  };

  const riskPerShare = (entry, stop) => entry && stop ? Math.abs(entry - stop).toFixed(2) : null;
  const totalRisk = (entry, stop, qty) => entry && stop && qty ? (Math.abs(entry - stop) * qty).toFixed(2) : null;
  const positionValue = (entry, qty) => entry && qty ? (entry * qty).toFixed(2) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Open Positions</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{openTrades.length + positions.length} פוזיציות פעילות</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ gap: 6 }}>
          <Plus size={14} /> Add Position
        </button>
      </div>

      {/* Auto-detected from trade journal */}
      {openTrades.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Zap size={13} style={{ color: 'var(--navy)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              From Trade Journal
            </span>
          </div>
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="trade-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Dir</th>
                  <th>Date</th>
                  <th>Shares</th>
                  <th>Entry</th>
                  <th>Stop</th>
                  <th>Risk/Share</th>
                  <th>Total Risk</th>
                  <th>Position Value</th>
                </tr>
              </thead>
              <tbody>
                {openTrades.map(t => {
                  const entry = parseFloat(t.entry) || 0;
                  const stop = parseFloat(t.stop) || 0;
                  const qty = parseFloat(t.quantity) || 0;
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700, letterSpacing: '0.04em' }}>{t.ticker}</td>
                      <td>
                        <span className={`badge ${t.direction === 'L' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 10 }}>
                          {t.direction === 'L' ? 'Long' : 'Short'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{t.date}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{qty || '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{entry ? `$${entry.toFixed(2)}` : '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--red)' }}>{stop ? `$${stop.toFixed(2)}` : '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--red)' }}>{riskPerShare(entry, stop) ? `-$${riskPerShare(entry, stop)}` : '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--red)' }}>{totalRisk(entry, stop, qty) ? `-$${totalRisk(entry, stop, qty)}` : '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{positionValue(entry, qty) ? `$${positionValue(entry, qty)}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manually added positions */}
      {(positions.length > 0 || openTrades.length === 0) && (
        <div>
          {openTrades.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Plus size={13} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Manual Positions
              </span>
            </div>
          )}
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="trade-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Shares</th>
                  <th>Entry</th>
                  <th>Stop</th>
                  <th>Risk/Share</th>
                  <th>Total Risk</th>
                  <th>Position Value</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 40 }}>No manual positions — click "Add Position" to add one</td></tr>
                )}
                {positions.map(p => {
                  const entry = parseFloat(p.entry_price) || 0;
                  const stop = parseFloat(p.stop_loss) || 0;
                  const qty = parseFloat(p.quantity) || 0;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, letterSpacing: '0.04em' }}>{p.symbol}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{qty}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>${entry.toFixed(2)}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--red)' }}>${stop.toFixed(2)}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--red)' }}>{riskPerShare(entry, stop) ? `-$${riskPerShare(entry, stop)}` : '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--red)' }}>{totalRisk(entry, stop, qty) ? `-$${totalRisk(entry, stop, qty)}` : '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{positionValue(entry, qty) ? `$${positionValue(entry, qty)}` : '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11, marginRight: 4 }} onClick={() => { setDraft(p); setForm(p.id); }}>Edit</button>
                        <button className="btn btn-danger" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => remove(p.id)}><Trash2 size={11} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {form !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setForm(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>{form === 'new' ? 'Add Position' : 'Edit Position'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['symbol','Symbol','text'],['quantity','Shares','number'],['entry_price','Entry Price','number'],['stop_loss','Stop Loss','number']].map(([k, l, type]) => (
                <div key={k}>
                  <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{l}</label>
                  <input className="input" type={type} value={draft[k] || ''} onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Notes</label>
              <input className="input" value={draft.notes || ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
