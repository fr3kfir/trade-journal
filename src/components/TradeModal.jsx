import { useState, useEffect } from 'react';

const SETUPS = ['VCP', 'HTF', 'EP', 'Breakout', 'Base Breakout', 'Pullback', 'Cup with Handle', 'Flat Base', 'IPO Base', 'Other'];

const EMPTY = {
  ticker: '', date: '', direction: 'L',
  entry: '', exit: '', stop: '', quantity: '',
  pnl: '', r_value: '', commission: '', setup: '', notes: '',
  execution_score: null, followed_rules: null,
};

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(null);
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(value === star ? null : star)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 22, lineHeight: 1, padding: '2px',
            color: star <= (hover ?? value ?? 0) ? '#f59e0b' : 'var(--border)',
            transition: 'color 0.1s',
          }}
        >
          ★
        </button>
      ))}
      {value && (
        <span style={{ fontSize: 11, color: 'var(--text-faint)', alignSelf: 'center', marginLeft: 4 }}>
          {value}/5
        </span>
      )}
    </div>
  );
}

export default function TradeModal({ trade, onSave, onClose }) {
  const [form, setForm] = useState(
    trade ? { ...EMPTY, ...trade } : { ...EMPTY, date: new Date().toISOString().split('T')[0] }
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calc P&L
  useEffect(() => {
    const e = parseFloat(form.entry), x = parseFloat(form.exit), q = parseFloat(form.quantity);
    if (e && x && q) {
      const raw = form.direction === 'L' ? (x - e) * q : (e - x) * q;
      set('pnl', Math.round(raw * 100) / 100);
    }
  }, [form.entry, form.exit, form.quantity, form.direction]);

  // Auto-calc R-Multiple
  useEffect(() => {
    const e = parseFloat(form.entry), x = parseFloat(form.exit), s = parseFloat(form.stop);
    if (e && x && s) {
      const initialRisk = form.direction === 'L' ? e - s : s - e;
      const profit     = form.direction === 'L' ? x - e : e - x;
      if (initialRisk > 0) {
        set('r_value', Math.round((profit / initialRisk) * 100) / 100);
      }
    }
  }, [form.entry, form.exit, form.stop, form.direction]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.ticker || !form.date) return;
    onSave({
      ...form,
      entry:           parseFloat(form.entry)      || null,
      exit:            parseFloat(form.exit)       || null,
      stop:            parseFloat(form.stop)       || null,
      quantity:        parseFloat(form.quantity)   || null,
      pnl:             parseFloat(form.pnl)        || null,
      r_value:         parseFloat(form.r_value)    || null,
      commission:      parseFloat(form.commission) || null,
      execution_score: form.execution_score,
      followed_rules:  form.followed_rules,
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
      <div className="modal" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{trade ? 'Edit Trade' : 'Add Trade'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Row 1: Ticker + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Ticker">
              <input className="input" value={form.ticker} onChange={e => set('ticker', e.target.value.toUpperCase())} placeholder="AAPL" required />
            </Field>
            <Field label="Date">
              <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
            </Field>
          </div>

          {/* Row 2: Direction + Entry + Exit */}
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

          {/* Row 3: Stop + Shares + P&L + Commission */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <Field label="Stop Loss $">
              <input className="input" type="number" step="0.01" value={form.stop} onChange={e => set('stop', e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Shares">
              <input className="input" type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="100" />
            </Field>
            <Field label="P&L $ (auto)">
              <input className="input" type="number" step="0.01" value={form.pnl} onChange={e => set('pnl', e.target.value)} placeholder="Auto" />
            </Field>
            <Field label="Commission $">
              <input className="input" type="number" step="0.01" value={form.commission} onChange={e => set('commission', e.target.value)} placeholder="0.00" />
            </Field>
          </div>

          {/* Row 4: R Value (auto) + Setup dropdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="R-Multiple (auto)">
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.r_value}
                  onChange={e => set('r_value', e.target.value)}
                  placeholder="Auto from Entry/Exit/Stop"
                  style={{ paddingRight: form.r_value ? 44 : undefined }}
                />
                {form.r_value !== '' && form.r_value !== null && (
                  <span style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 11, fontWeight: 700,
                    color: parseFloat(form.r_value) >= 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                    {parseFloat(form.r_value) >= 0 ? '+' : ''}{parseFloat(form.r_value).toFixed(2)}R
                  </span>
                )}
              </div>
            </Field>
            <Field label="Setup">
              <select className="input" value={form.setup} onChange={e => set('setup', e.target.value)}>
                <option value="">— Select Setup —</option>
                {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {/* Row 5: Execution Score + Followed Rules */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Execution Score">
              <StarRating value={form.execution_score} onChange={v => set('execution_score', v)} />
            </Field>
            <Field label="Followed the Rules?">
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                {[true, false].map(val => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => set('followed_rules', form.followed_rules === val ? null : val)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      background: form.followed_rules === val
                        ? (val ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)')
                        : 'transparent',
                      borderColor: form.followed_rules === val
                        ? (val ? 'var(--green)' : 'var(--red)')
                        : 'var(--border)',
                      color: form.followed_rules === val
                        ? (val ? 'var(--green)' : 'var(--red)')
                        : 'var(--text-muted)',
                    }}
                  >
                    {val ? '✓ Yes' : '✗ No'}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Notes */}
          <Field label="Notes / Psychology">
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Mental state, mistakes, observations..."
              style={{ resize: 'vertical' }}
            />
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
