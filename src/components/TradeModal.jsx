import { useState, useEffect } from 'react';

const EMPTY = { ticker: '', date: '', direction: 'L', entry: '', exit: '', stop: '', quantity: '', pnl: '', r_value: '', setup: '', notes: '' };

export default function TradeModal({ trade, onSave, onClose }) {
  const [form, setForm] = useState(trade ? { ...EMPTY, ...trade } : { ...EMPTY, date: new Date().toISOString().split('T')[0] });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calc P&L if entry+exit+qty filled
  useEffect(() => {
    const e = parseFloat(form.entry), x = parseFloat(form.exit), q = parseFloat(form.quantity);
    if (e && x && q) {
      const raw = form.direction === 'L' ? (x - e) * q : (e - x) * q;
      set('pnl', Math.round(raw * 100) / 100);
    }
  }, [form.entry, form.exit, form.quantity, form.direction]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.ticker || !form.date) return;
    onSave({
      ...form,
      entry:    parseFloat(form.entry) || null,
      exit:     parseFloat(form.exit) || null,
      stop:     parseFloat(form.stop) || null,
      quantity: parseFloat(form.quantity) || null,
      pnl:      parseFloat(form.pnl) || null,
      r_value:  parseFloat(form.r_value) || null,
    });
  };

  const Field = ({ label, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{trade ? 'Edit Trade' : 'Add Trade'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Ticker">
              <input className="input" value={form.ticker} onChange={e => set('ticker', e.target.value.toUpperCase())} placeholder="AAPL" required />
            </Field>
            <Field label="Date">
              <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Direction">
              <select className="input" value={form.direction} onChange={e => set('direction', e.target.value)}>
                <option value="L">Long</option>
                <option value="S">Short</option>
              </select>
            </Field>
            <Field label="Entry $">
              <input className="input" type="number" step="0.01" value={form.entry} onChange={e => set('entry', e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Exit $">
              <input className="input" type="number" step="0.01" value={form.exit} onChange={e => set('exit', e.target.value)} placeholder="0.00" />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Stop $">
              <input className="input" type="number" step="0.01" value={form.stop} onChange={e => set('stop', e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Shares">
              <input className="input" type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="100" />
            </Field>
            <Field label="P&L $">
              <input className="input" type="number" step="0.01" value={form.pnl} onChange={e => set('pnl', e.target.value)} placeholder="Auto" />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="R Value">
              <input className="input" type="number" step="0.1" value={form.r_value} onChange={e => set('r_value', e.target.value)} placeholder="e.g. 2.5" />
            </Field>
            <Field label="Setup">
              <input className="input" value={form.setup} onChange={e => set('setup', e.target.value)} placeholder="VCP, HTF, EP..." />
            </Field>
          </div>

          <Field label="Notes">
            <textarea className="input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." style={{ resize: 'vertical' }} />
          </Field>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Trade</button>
          </div>
        </form>
      </div>
    </div>
  );
}
