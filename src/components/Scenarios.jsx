import { useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { useLocalStore } from '../hooks/useLocalStore';

const EMPTY = { scenario_date: new Date().toISOString().slice(0,10), symbol: '', if_condition: '', then_action: '', trigger_price: '', is_active: true, was_triggered: false, notes: '' };

export default function Scenarios() {
  const { data, add, update, remove } = useLocalStore('apex_scenarios', []);
  const [form, setForm] = useState(null);
  const [draft, setDraft] = useState(EMPTY);

  const save = () => {
    if (!draft.if_condition || !draft.then_action) return;
    const item = { ...draft, trigger_price: parseFloat(draft.trigger_price) || null };
    if (form === 'new') add(item);
    else update(form, item);
    setForm(null);
  };

  const active = data.filter(s => s.is_active && !s.was_triggered);
  const triggered = data.filter(s => s.was_triggered);
  const inactive = data.filter(s => !s.is_active && !s.was_triggered);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>If / Then Scenarios</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Plan your reactions before the market opens</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setDraft({ ...EMPTY, scenario_date: new Date().toISOString().slice(0,10) }); setForm('new'); }}>
          <Plus size={14} /> New Scenario
        </button>
      </div>

      {data.length === 0 && <div className="panel" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 48 }}>No scenarios yet. Plan your If/Then rules.</div>}

      {[['Active', active, '#EFF6FF', 'var(--navy)'], ['Triggered', triggered, '#ECFDF5', 'var(--green)'], ['Inactive', inactive, 'var(--bg-card)', 'var(--text-faint)']].map(([label, items, bg, accent]) =>
        items.length > 0 && (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label} ({items.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(s => (
                <div key={s.id} className="panel" style={{ padding: '14px 18px', background: bg, borderColor: 'var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Zap size={16} color={accent} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{s.scenario_date}</span>
                        {s.symbol && <span style={{ fontWeight: 700, fontSize: 12 }}>{s.symbol}</span>}
                        {s.trigger_price && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>@ ${s.trigger_price}</span>}
                      </div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>IF </span>
                        <span style={{ color: 'var(--text)' }}>{s.if_condition}</span>
                      </div>
                      <div style={{ fontSize: 13 }}>
                        <span style={{ color: accent, fontWeight: 600 }}>THEN </span>
                        <span style={{ color: 'var(--text)' }}>{s.then_action}</span>
                      </div>
                      {s.notes && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>{s.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {s.is_active && !s.was_triggered && (
                        <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => update(s.id, { was_triggered: true })}>Triggered</button>
                      )}
                      <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => { setDraft(s); setForm(s.id); }}>Edit</button>
                      <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => remove(s.id)}><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {form !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setForm(null)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>{form === 'new' ? 'New Scenario' : 'Edit Scenario'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Date</label><input className="input" type="date" value={draft.scenario_date} onChange={e => setDraft(d => ({ ...d, scenario_date: e.target.value }))} /></div>
              <div><label style={lbl}>Symbol</label><input className="input" value={draft.symbol} onChange={e => setDraft(d => ({ ...d, symbol: e.target.value.toUpperCase() }))} placeholder="AAPL" /></div>
              <div><label style={lbl}>Trigger Price</label><input className="input" type="number" value={draft.trigger_price} onChange={e => setDraft(d => ({ ...d, trigger_price: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>IF... (condition)</label>
              <textarea className="input" rows={2} value={draft.if_condition} onChange={e => setDraft(d => ({ ...d, if_condition: e.target.value }))} placeholder="e.g. AAPL breaks above $180 on high volume" style={{ resize: 'none' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>THEN... (action)</label>
              <textarea className="input" rows={2} value={draft.then_action} onChange={e => setDraft(d => ({ ...d, then_action: e.target.value }))} placeholder="e.g. Buy 50 shares with stop at $176" style={{ resize: 'none' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Notes</label>
              <input className="input" value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = { fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 };
