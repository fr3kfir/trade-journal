import { useState } from 'react';
import { Plus, Trash2, ExternalLink, Star } from 'lucide-react';
import { useLocalStore } from '../hooks/useLocalStore';

const TYPES = ['Book', 'Video', 'Article', 'Course', 'Tool', 'Other'];
const CATS = ['Fundamental', 'Technical', 'Psychology', 'Risk Management', 'Strategies', 'Tools', 'General'];
const EMPTY = { title: '', url: '', type: 'Book', category: 'General', notes: '', is_completed: false, rating: 0 };

export default function Learning() {
  const { data, add, update, remove } = useLocalStore('apex_learning', []);
  const [form, setForm] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [catFilter, setCatFilter] = useState('All');

  const filtered = catFilter === 'All' ? data : data.filter(r => r.category === catFilter);
  const save = () => {
    if (!draft.title) return;
    if (form === 'new') add(draft);
    else update(form, draft);
    setForm(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Learning Resources</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{data.filter(r => r.is_completed).length}/{data.length} completed</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setDraft(EMPTY); setForm('new'); }}>
          <Plus size={14} /> Add Resource
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['All', ...CATS].map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            style={{ padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
              background: catFilter === c ? 'var(--navy)' : 'var(--bg-card)',
              color: catFilter === c ? '#fff' : 'var(--text-muted)', fontWeight: catFilter === c ? 600 : 400 }}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <div className="panel" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 48 }}>No resources yet</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {filtered.map(r => (
          <div key={r.id} className="panel" style={{ padding: '16px 18px', opacity: r.is_completed ? 0.7 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="badge badge-blue" style={{ fontSize: 10 }}>{r.type}</span>
                <span className="badge badge-gray" style={{ fontSize: 10 }}>{r.category}</span>
                {r.is_completed && <span className="badge badge-green" style={{ fontSize: 10 }}>Done</span>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {r.url && <a href={r.url} target="_blank" rel="noreferrer"><ExternalLink size={12} color="var(--text-faint)" /></a>}
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }} onClick={() => remove(r.id)}><Trash2 size={12} color="var(--text-faint)" /></button>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, cursor: 'pointer' }} onClick={() => { setDraft(r); setForm(r.id); }}>{r.title}</div>
            {r.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{r.notes}</div>}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={13} fill={n <= (r.rating || 0) ? '#f59e0b' : 'none'} color={n <= (r.rating || 0) ? '#f59e0b' : 'var(--border)'}
                    style={{ cursor: 'pointer' }} onClick={() => update(r.id, { rating: n })} />
                ))}
              </div>
              <button onClick={() => update(r.id, { is_completed: !r.is_completed })}
                style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: 'none', fontFamily: 'inherit',
                  color: r.is_completed ? 'var(--green)' : 'var(--text-muted)' }}>
                {r.is_completed ? 'Completed' : 'Mark done'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {form !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setForm(null)}>
          <div className="modal" style={{ maxWidth: 460 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>{form === 'new' ? 'Add Resource' : 'Edit Resource'}</div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Title</label>
              <input className="input" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Book / video / article title" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Type</label>
                <select className="input" value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select></div>
              <div><label style={lbl}>Category</label>
                <select className="input" value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>URL (optional)</label>
              <input className="input" value={draft.url || ''} onChange={e => setDraft(d => ({ ...d, url: e.target.value }))} placeholder="https://..." />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Notes</label>
              <input className="input" value={draft.notes || ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
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
