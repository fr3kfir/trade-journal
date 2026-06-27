import { useState, useEffect } from 'react';

const SETUPS = ['VCP', 'HTF', 'EP', 'Breakout', 'Base Breakout', 'Pullback', 'Cup with Handle', 'Flat Base', 'IPO Base', 'Other'];

const MARKET_CONDITIONS = [
  { value: 'bull',   label: '🟢 Bull — שוק בעלייה',    color: '#16a34a' },
  { value: 'bear',   label: '🔴 Bear — שוק בירידה',    color: '#dc2626' },
  { value: 'chop',   label: '🟡 Chop — שוק צדדי',      color: '#d97706' },
  { value: 'mixed',  label: '⚪ Mixed — לא ברור',       color: '#6b7280' },
];

const EMPTY = {
  ticker: '', date: '', direction: 'L',
  entry: '', exit: '', stop: '', quantity: '',
  pnl: '', r_value: '', commission: '', setup: '',
  market_condition: '',
  thesis: '',
  notes: '',
  lessons: '',
  execution_score: null,
  followed_rules: null,
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
        >★</button>
      ))}
      {value && <span style={{ fontSize: 11, color: 'var(--text-faint)', alignSelf: 'center', marginLeft: 4 }}>{value}/5</span>}
    </div>
  );
}

function Section({ title, children, accent }) {
  return (
    <div style={{
      border: `1px solid ${accent || 'var(--border)'}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 14px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: accent || 'var(--text-faint)',
        background: accent ? `${accent}18` : 'var(--bg-card)',
        borderBottom: `1px solid ${accent || 'var(--border)'}`,
      }}>{title}</div>
      <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
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
      const profit      = form.direction === 'L' ? x - e : e - x;
      if (initialRisk > 0) set('r_value', Math.round((profit / initialRisk) * 100) / 100);
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

  const Field = ({ label, children, half }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: half ? '0 0 calc(50% - 6px)' : '1' }}>
      <label style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );

  const pnlVal  = parseFloat(form.pnl);
  const rVal    = parseFloat(form.r_value);
  const hasResult = !isNaN(pnlVal) && form.pnl !== '';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580, maxHeight: '92vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {trade ? `✏️ Edit — ${trade.ticker}` : '+ New Trade'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
              {trade ? 'ערוך פרטי עסקה' : 'תכנן ותיעד את העסקה'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── SECTION 1: SETUP ── */}
          <Section title="📋 פרטי עסקה" accent="#6366f1">
            {/* Ticker + Date + Direction */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Field label="Ticker" half>
                <input className="input" value={form.ticker} onChange={e => set('ticker', e.target.value.toUpperCase())} placeholder="AAPL" required style={{ fontWeight: 700, fontSize: 15 }} />
              </Field>
              <Field label="תאריך" half>
                <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Field label="כיוון">
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ v: 'L', label: '▲ Long' }, { v: 'S', label: '▼ Short' }].map(({ v, label }) => (
                    <button key={v} type="button" onClick={() => set('direction', v)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', border: '1px solid',
                      background: form.direction === v ? (v === 'L' ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)') : 'transparent',
                      borderColor: form.direction === v ? (v === 'L' ? 'var(--green)' : 'var(--red)') : 'var(--border)',
                      color: form.direction === v ? (v === 'L' ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)',
                    }}>{label}</button>
                  ))}
                </div>
              </Field>
              <Field label="Setup">
                <select className="input" value={form.setup} onChange={e => set('setup', e.target.value)}>
                  <option value="">— בחר סטאפ —</option>
                  {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>

            {/* Market condition */}
            <Field label="תנאי שוק">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {MARKET_CONDITIONS.map(({ value, label, color }) => (
                  <button key={value} type="button" onClick={() => set('market_condition', form.market_condition === value ? '' : value)} style={{
                    flex: '1 1 auto', padding: '7px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 500,
                    cursor: 'pointer', border: '1px solid',
                    background: form.market_condition === value ? `${color}20` : 'transparent',
                    borderColor: form.market_condition === value ? color : 'var(--border)',
                    color: form.market_condition === value ? color : 'var(--text-muted)',
                    fontFamily: 'inherit', transition: 'all 0.12s',
                  }}>{label}</button>
                ))}
              </div>
            </Field>

            {/* Thesis */}
            <Field label="📌 תזה — למה אני נכנס?">
              <textarea
                className="input"
                rows={2}
                value={form.thesis}
                onChange={e => set('thesis', e.target.value)}
                placeholder="הסטאפ שראיתי, מה מיוחד, למה עכשיו..."
                style={{ resize: 'vertical', fontSize: 13 }}
              />
            </Field>
          </Section>

          {/* ── SECTION 2: PRICES ── */}
          <Section title="💰 מחירים וכמות" accent="#0ea5e9">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Field label="כניסה $" half>
                <input className="input" type="number" step="0.01" value={form.entry} onChange={e => set('entry', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="יציאה $" half>
                <input className="input" type="number" step="0.01" value={form.exit} onChange={e => set('exit', e.target.value)} placeholder="0.00" />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Field label="סטופ $" half>
                <input className="input" type="number" step="0.01" value={form.stop} onChange={e => set('stop', e.target.value)} placeholder="0.00" />
              </Field>
              <Field label="כמות מניות" half>
                <input className="input" type="number" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="100" />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Field label="P&L $ (אוטומטי)" half>
                <div style={{ position: 'relative' }}>
                  <input className="input" type="number" step="0.01" value={form.pnl} onChange={e => set('pnl', e.target.value)} placeholder="מחושב אוטומטית" />
                  {hasResult && (
                    <span style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 12, fontWeight: 800,
                      color: pnlVal >= 0 ? 'var(--green)' : 'var(--red)',
                    }}>{pnlVal >= 0 ? '+' : ''}${Math.abs(pnlVal).toFixed(2)}</span>
                  )}
                </div>
              </Field>
              <Field label="R-Multiple (אוטומטי)" half>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input" type="number" step="0.01" value={form.r_value}
                    onChange={e => set('r_value', e.target.value)}
                    placeholder="מחושב מ Entry/Exit/Stop"
                  />
                  {form.r_value !== '' && form.r_value !== null && !isNaN(rVal) && (
                    <span style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 12, fontWeight: 800,
                      color: rVal >= 0 ? 'var(--green)' : 'var(--red)',
                    }}>{rVal >= 0 ? '+' : ''}{rVal.toFixed(2)}R</span>
                  )}
                </div>
              </Field>
            </div>
            <Field label="עמלה $">
              <input className="input" type="number" step="0.01" value={form.commission} onChange={e => set('commission', e.target.value)} placeholder="0.00" style={{ maxWidth: 140 }} />
            </Field>
          </Section>

          {/* ── SECTION 3: REVIEW ── */}
          <Section title="🔍 ריוויו אחרי העסקה" accent="#16a34a">

            {/* Execution + Rules */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Field label="ציון ביצוע">
                <StarRating value={form.execution_score} onChange={v => set('execution_score', v)} />
              </Field>
              <Field label="עקבתי לכללים?">
                <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
                  {[true, false].map(val => (
                    <button key={String(val)} type="button"
                      onClick={() => set('followed_rules', form.followed_rules === val ? null : val)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: '1px solid',
                        background: form.followed_rules === val ? (val ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)') : 'transparent',
                        borderColor: form.followed_rules === val ? (val ? 'var(--green)' : 'var(--red)') : 'var(--border)',
                        color: form.followed_rules === val ? (val ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)',
                        fontFamily: 'inherit',
                      }}
                    >{val ? '✓ Yes' : '✗ No'}</button>
                  ))}
                </div>
              </Field>
            </div>

            {/* Notes (psychology during trade) */}
            <Field label="🧠 פסיכולוגיה / הערות במהלך העסקה">
              <textarea
                className="input" rows={2}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="מה הרגשתי, אם חרגתי מהתוכנית, לחץ..."
                style={{ resize: 'vertical', fontSize: 13 }}
              />
            </Field>

            {/* Lessons */}
            <Field label="💡 מה למדתי / מה לשפר">
              <textarea
                className="input" rows={2}
                value={form.lessons}
                onChange={e => set('lessons', e.target.value)}
                placeholder="מה הלך טוב? מה היה אחרת? מה אני לוקח לעסקה הבאה?"
                style={{ resize: 'vertical', fontSize: 13 }}
              />
            </Field>
          </Section>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>ביטול</button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: 120 }}>שמור עסקה</button>
          </div>
        </form>
      </div>
    </div>
  );
}
