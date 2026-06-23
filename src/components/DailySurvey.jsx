import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLocalStore } from '../hooks/useLocalStore';

const EMPTY = {
  survey_date: new Date().toISOString().slice(0,10),
  performance_rating: 5, emotional_state: 5, discipline_score: 5,
  pnl_today: '', market_thoughts: '', best_decision: '',
  biggest_challenge: '', improvement_area: '', overall_mood: 'neutral',
};

const MOODS = ['very_positive','positive','neutral','negative','very_negative'];
const MOOD_LABELS = { very_positive: 'Very Positive', positive: 'Positive', neutral: 'Neutral', negative: 'Negative', very_negative: 'Very Negative' };
const MOOD_COLORS = { very_positive: '#059669', positive: '#10b981', neutral: '#64748b', negative: '#f59e0b', very_negative: '#dc2626' };

function Slider({ label, value, onChange }) {
  const color = value >= 7 ? '#059669' : value >= 5 ? '#2563eb' : '#dc2626';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}/10</span>
      </div>
      <input type="range" min={1} max={10} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ width: '100%', accentColor: color }} />
    </div>
  );
}

export default function DailySurvey() {
  const { data: surveys, add, remove } = useLocalStore('apex_surveys', []);
  const [draft, setDraft] = useState({ ...EMPTY, survey_date: new Date().toISOString().slice(0,10) });
  const [showForm, setShowForm] = useState(false);

  const save = () => {
    if (!draft.survey_date) return;
    add({ ...draft, pnl_today: parseFloat(draft.pnl_today) || null });
    setShowForm(false);
    setDraft({ ...EMPTY, survey_date: new Date().toISOString().slice(0,10) });
  };

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Daily Check-in</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Track your performance and mindset daily</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Today's Check-in
        </button>
      </div>

      {showForm && (
        <div className="panel">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
            Check-in for {draft.survey_date}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <Slider label="Performance" value={draft.performance_rating} onChange={v => set('performance_rating', v)} />
              <Slider label="Emotional State" value={draft.emotional_state} onChange={v => set('emotional_state', v)} />
              <Slider label="Discipline" value={draft.discipline_score} onChange={v => set('discipline_score', v)} />
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Today's P&L ($)</label>
                <input className="input" type="number" value={draft.pnl_today} onChange={e => set('pnl_today', e.target.value)} placeholder="e.g. 250" />
              </div>
              <div>
                <label style={lbl}>Overall Mood</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {MOODS.map(m => (
                    <button key={m} onClick={() => set('overall_mood', m)}
                      style={{ padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, fontFamily: 'inherit',
                        background: draft.overall_mood === m ? MOOD_COLORS[m] : 'var(--bg-card)',
                        color: draft.overall_mood === m ? '#fff' : 'var(--text-muted)' }}>
                      {MOOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['market_thoughts','Market Thoughts'],['best_decision','Best Decision'],['biggest_challenge','Biggest Challenge'],['improvement_area','Area to Improve']].map(([k, l]) => (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <textarea className="input" rows={2} value={draft[k]} onChange={e => set(k, e.target.value)} style={{ resize: 'none' }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save Check-in</button>
          </div>
        </div>
      )}

      {/* History */}
      {surveys.length > 0 && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="trade-table">
            <thead>
              <tr>
                <th>Date</th><th>Perf.</th><th>Emotion</th><th>Discipline</th>
                <th>P&amp;L</th><th>Mood</th><th>Best Decision</th><th style={{ textAlign: 'right' }}>Del</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map(s => (
                <tr key={s.id}>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.survey_date}</td>
                  <td><RatingBadge v={s.performance_rating} /></td>
                  <td><RatingBadge v={s.emotional_state} /></td>
                  <td><RatingBadge v={s.discipline_score} /></td>
                  <td style={{ fontWeight: 600, color: s.pnl_today > 0 ? 'var(--green)' : s.pnl_today < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                    {s.pnl_today != null ? `${s.pnl_today >= 0 ? '+' : ''}$${Math.abs(s.pnl_today).toFixed(0)}` : '—'}
                  </td>
                  <td style={{ fontSize: 11, fontWeight: 600, color: MOOD_COLORS[s.overall_mood] }}>{MOOD_LABELS[s.overall_mood] || s.overall_mood}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.best_decision || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => remove(s.id)}><Trash2 size={11} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RatingBadge({ v }) {
  const color = v >= 7 ? 'var(--green)' : v >= 5 ? 'var(--navy)' : 'var(--red)';
  return <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{v}/10</span>;
}

const lbl = { fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 };
