import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLocalStore } from '../hooks/useLocalStore';

const EMPTY = { symbol: '', quantity: '', entry_price: '', stop_loss: '', notes: '' };

export default function Portfolio() {
  const { data: positions, add, update, remove } = useLocalStore('apex_portfolio', []);
  const [form, setForm] = useState(null);
  const [draft, setDraft] = useState(EMPTY);

  const openAdd = () => { setDraft(EMPTY); setForm('new'); };
  const save = () => {
    if (!draft.symbol) return;
    const p = { ...draft, quantity: parseFloat(draft.quantity) || 0, entry_price: parseFloat(draft.entry_price) || 0, stop_loss: parseFloat(draft.stop_loss) || 0 };
    if (form === 'new') add(p);
    else update(form, p);
    setForm(null);
  };

  const riskPerShare = (p) => p.entry_price && p.stop_loss ? Math.abs(p.entry_price - p.stop_loss).toFixed(2) : null;
  const totalRisk = (p) => p.entry_price && p.stop_loss && p.quantity ? (Math.abs(p.entry_price - p.stop_loss) * p.quantity).toFixed(2) : null;
  const positionValue = (p) => p.entry_price && p.quantity ? (p.entry_price * p.quantity).toFixed(2) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Open Positions</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{positions.length} active positions</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{ gap: 6 }}>
          <Plus size={14} /> Add Position
        </button>
      </div>

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
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 40 }}>No open positions</td></tr>
            )}
            {positions.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700, letterSpacing: '0.04em' }}>{p.symbol}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.quantity}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>${parseFloat(p.entry_price).toFixed(2)}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--red)' }}>${parseFloat(p.stop_loss).toFixed(2)}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--red)' }}>{riskPerShare(p) ? `-$${riskPerShare(p)}` : '—'}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--red)' }}>{totalRisk(p) ? `-$${totalRisk(p)}` : '—'}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{positionValue(p) ? `$${positionValue(p)}` : '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.notes || '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11, marginRight: 4 }} onClick={() => { setDraft(p); setForm(p.id); }}>Edit</button>
                  <button className="btn btn-danger" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => remove(p.id)}><Trash2 size={11} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
