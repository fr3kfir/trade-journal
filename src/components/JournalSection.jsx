import { useState } from 'react';
import { Plus, Star, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocalStore } from '../hooks/useLocalStore';

const CATEGORIES = ['Strategy', 'Mistake', 'Win', 'Market Thoughts', 'Psychology', 'Insight', 'Planning', 'Other'];
const MOODS = ['Very Positive', 'Positive', 'Neutral', 'Negative', 'Very Negative'];
const MOOD_COLORS = { 'Very Positive': '#059669', 'Positive': '#10b981', 'Neutral': '#64748b', 'Negative': '#f59e0b', 'Very Negative': '#dc2626' };

const EMPTY = { entry_date: new Date().toISOString().slice(0,10), title: '', content: '', category: 'Insight', mood: 'Neutral', is_important: false };

export default function JournalSection() {
  const { data: entries, add, update, remove } = useLocalStore('apex_journal', []);
  const [form, setForm] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [expanded, setExpanded] = useState(null);

  const save = () => {
    if (!draft.title || !draft.content) return;
    if (form === 'new') add(draft);
    else update(form, draft);
    setForm(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Trading Journal</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{entries.length} entries</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setDraft({ ...EMPTY, entry_date: new Date().toISOString().slice(0,10) }); setForm('new'); }}>
          <Plus size={14} /> New Entry
        </button>
      </div>

      {entries.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 48 }}>No journal entries yet</div>
      )}

      {entries.map(e => (
        <div key={e.id} className="panel" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{e.entry_date}</span>
                <span className="badge badge-blue" style={{ fontSize: 10 }}>{e.category}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: MOOD_COLORS[e.mood] || 'var(--text-muted)' }}>{e.mood}</span>
                {e.is_important && <Star size={12} fill="#f59e0b" color="#f59e0b" />}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{e.title}</div>
              {expanded === e.id && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, marginTop: 8, whiteSpace: 'pre-wrap' }}>{e.content}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }}
                onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                {expanded === e.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              <button className="btn btn-ghost" style={{ padding: '4px 9px', fontSize: 11 }}
                onClick={() => { setDraft(e); setForm(e.id); }}>Edit</button>
              <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 11 }}
                onClick={() => remove(e.id)}><Trash2 size={11} /></button>
            </div>
          </div>
        </div>
      ))}

      {form !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setForm(null)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>{form === 'new' ? 'New Entry' : 'Edit Entry'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Date</label>
                <input className="input" type="date" value={draft.entry_date} onChange={e => setDraft(d => ({ ...d, entry_date: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Category</label>
                <select className="input" value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Mood</label>
                <select className="input" value={draft.mood} onChange={e => setDraft(d => ({ ...d, mood: e.target.value }))}>
                  {MOODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Title</label>
              <input className="input" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Entry title..." />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Content</label>
              <textarea className="input" rows={6} value={draft.content} onChange={e => setDraft(d => ({ ...d, content: e.target.value }))} placeholder="Write your thoughts, analysis, lessons..." style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <input type="checkbox" id="important" checked={!!draft.is_important} onChange={e => setDraft(d => ({ ...d, is_important: e.target.checked }))} />
              <label htmlFor="important" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mark as important</label>
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
