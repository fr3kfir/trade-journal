import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const STORAGE_KEY = 'apex_market_log_v1';

const EMPTY_ENTRY = {
  date: '',
  market_bias: '',        // bull / bear / chop
  leading_sectors: [],
  themes: '',
  watchlist: '',
  key_levels: '',
  max_risk_today: '',
  notes: '',
  mood: null,             // 1-3: bad/ok/great
};

const BIAS_OPTS = [
  { v: 'bull',  l: '🟢 Bull', c: '#16a34a' },
  { v: 'chop',  l: '🟡 Chop', c: '#d97706' },
  { v: 'bear',  l: '🔴 Bear', c: '#dc2626' },
];

const SECTOR_LIST = [
  'Technology', 'AI/Semi', 'Healthcare', 'Biotech', 'Energy', 'Financials',
  'Consumer Disc.', 'Industrials', 'Materials', 'Communication', 'Utilities',
];

const MOOD_OPTS = [
  { v: 1, l: '😕 לא טוב', c: '#dc2626' },
  { v: 2, l: '😐 בסדר',   c: '#d97706' },
  { v: 3, l: '💪 מעולה',  c: '#16a34a' },
];

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function BiasIcon({ bias, size = 14 }) {
  if (bias === 'bull')  return <TrendingUp  size={size} color="#16a34a" />;
  if (bias === 'bear')  return <TrendingDown size={size} color="#dc2626" />;
  if (bias === 'chop')  return <Minus        size={size} color="#d97706" />;
  return null;
}

function EntryForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { ...EMPTY_ENTRY, date: new Date().toISOString().slice(0, 10) });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleSector = (s) => {
    const cur = form.leading_sectors || [];
    set('leading_sectors', cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Date + Market Bias */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>תאריך</label>
          <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} style={{ width: 160 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>מצב שוק</label>
          <div style={{ display: 'flex', gap: 5 }}>
            {BIAS_OPTS.map(o => (
              <button key={o.v} type="button" onClick={() => set('market_bias', form.market_bias === o.v ? '' : o.v)} style={{
                padding: '7px 12px', borderRadius: 7, border: '1px solid', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.12s',
                background: form.market_bias === o.v ? `${o.c}20` : 'transparent',
                borderColor: form.market_bias === o.v ? o.c : 'var(--border)',
                color: form.market_bias === o.v ? o.c : 'var(--text-faint)',
              }}>{o.l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>מצב נפשי</label>
          <div style={{ display: 'flex', gap: 5 }}>
            {MOOD_OPTS.map(o => (
              <button key={o.v} type="button" onClick={() => set('mood', form.mood === o.v ? null : o.v)} style={{
                padding: '5px 10px', borderRadius: 7, border: '1px solid', cursor: 'pointer',
                fontSize: 11, fontFamily: 'inherit',
                background: form.mood === o.v ? `${o.c}20` : 'transparent',
                borderColor: form.mood === o.v ? o.c : 'var(--border)',
                color: form.mood === o.v ? o.c : 'var(--text-faint)',
              }}>{o.l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Leading Sectors */}
      <div>
        <label style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
          🏭 סקטורים מובילים היום (Ariel: עקוב אחרי הכסף)
        </label>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {SECTOR_LIST.map(s => {
            const active = (form.leading_sectors || []).includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleSector(s)} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid', cursor: 'pointer',
                fontSize: 11, fontWeight: active ? 600 : 400, fontFamily: 'inherit', transition: 'all 0.1s',
                background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                borderColor: active ? '#6366f1' : 'var(--border)',
                color: active ? '#6366f1' : 'var(--text-faint)',
              }}>{s}</button>
            );
          })}
        </div>
      </div>

      {/* Themes + Watchlist */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎯 תמות / נרטיב היום</label>
          <textarea className="input" rows={2} placeholder="AI stocks, energy breakouts, biotech catalysts..." value={form.themes} onChange={e => set('themes', e.target.value)} style={{ resize: 'vertical', fontSize: 12 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>👁 ווטשליסט היום</label>
          <textarea className="input" rows={2} placeholder="NVDA, TSLA, ARM..." value={form.watchlist} onChange={e => set('watchlist', e.target.value)} style={{ resize: 'vertical', fontSize: 12 }} />
        </div>
      </div>

      {/* Key Levels + Max Risk */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📏 רמות מפתח (SPY/QQQ)</label>
          <input className="input" placeholder="e.g. SPY support 520, resistance 528" value={form.key_levels} onChange={e => set('key_levels', e.target.value)} style={{ fontSize: 12 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>מקסימום ריסק היום ($)</label>
          <input className="input" type="number" placeholder="e.g. 500" value={form.max_risk_today} onChange={e => set('max_risk_today', e.target.value)} style={{ width: 140 }} />
        </div>
      </div>

      {/* Notes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💬 הערות ותובנות</label>
        <textarea className="input" rows={2} placeholder="מה שמתי לב, שיקולים מיוחדים, לא לסחור אם..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical', fontSize: 12 }} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel} style={{ fontSize: 13 }}>ביטול</button>}
        <button type="button" className="btn btn-primary" onClick={() => onSave(form)} style={{ fontSize: 13, minWidth: 120 }}>שמור יומן</button>
      </div>
    </div>
  );
}

function EntryCard({ entry, onDelete }) {
  const moodOpt = MOOD_OPTS.find(o => o.v === entry.mood);
  const biasOpt = BIAS_OPTS.find(o => o.v === entry.market_bias);

  return (
    <div style={{
      background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', background: 'var(--bg-card)',
        display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{entry.date}</span>
        {biasOpt && (
          <span style={{
            fontSize: 12, fontWeight: 600, color: biasOpt.c,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <BiasIcon bias={entry.market_bias} size={13} /> {biasOpt.l}
          </span>
        )}
        {moodOpt && <span style={{ fontSize: 12, color: moodOpt.c }}>{moodOpt.l}</span>}
        {entry.max_risk_today && (
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Max risk: ${entry.max_risk_today}</span>
        )}
        <button
          onClick={onDelete}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}
        ><Trash2 size={13} /></button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entry.leading_sectors?.length > 0 && (
          <div>
            <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>סקטורים מובילים: </span>
            {entry.leading_sectors.map(s => (
              <span key={s} style={{
                display: 'inline-block', margin: '0 3px', padding: '2px 7px', borderRadius: 5,
                background: 'rgba(99,102,241,0.12)', color: '#6366f1', fontSize: 11, fontWeight: 600,
              }}>{s}</span>
            ))}
          </div>
        )}
        {entry.themes && (
          <div><span style={{ fontSize: 11, color: 'var(--text-faint)' }}>תמות: </span><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entry.themes}</span></div>
        )}
        {entry.watchlist && (
          <div><span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Watchlist: </span><span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>{entry.watchlist}</span></div>
        )}
        {entry.key_levels && (
          <div><span style={{ fontSize: 11, color: 'var(--text-faint)' }}>רמות: </span><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{entry.key_levels}</span></div>
        )}
        {entry.notes && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', borderLeft: '2px solid var(--border)', paddingLeft: 8 }}>{entry.notes}</div>
        )}
      </div>
    </div>
  );
}

export default function MarketLog({ trades }) {
  const [entries, setEntries] = useState(() => load());
  const [showAdd, setShowAdd]   = useState(false);

  const saveAll = (data) => { setEntries(data); save(data); };

  const handleSave = (form) => {
    if (!form.date) return;
    const idx = entries.findIndex(e => e.date === form.date);
    const updated = idx >= 0
      ? entries.map((e, i) => i === idx ? form : e)
      : [form, ...entries];
    saveAll(updated.sort((a, b) => b.date.localeCompare(a.date)));
    setShowAdd(false);
  };

  const handleDelete = (date) => {
    if (confirm(`מחק יומן ${date}?`)) saveAll(entries.filter(e => e.date !== date));
  };

  // Correlate market bias with trade performance
  const biasStats = useMemo(() => {
    const closed = trades.filter(t => t.pnl != null && t.date);
    const map = {};
    for (const e of entries) {
      if (!e.market_bias) continue;
      const dayTrades = closed.filter(t => t.date === e.date);
      if (!dayTrades.length) continue;
      const dayPnl = dayTrades.reduce((s, t) => s + parseFloat(t.pnl) - (parseFloat(t.commission) || 0), 0);
      if (!map[e.market_bias]) map[e.market_bias] = [];
      map[e.market_bias].push(dayPnl);
    }
    return Object.entries(map).map(([bias, pnls]) => ({
      bias,
      count: pnls.length,
      avg:   parseFloat((pnls.reduce((a, b) => a + b, 0) / pnls.length).toFixed(2)),
      total: parseFloat(pnls.reduce((a, b) => a + b, 0).toFixed(2)),
    }));
  }, [entries, trades]);

  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = entries.find(e => e.date === today);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Market Log — יומן שוק יומי</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 3 }}>
            כמו MarketPulse של אריאל — לפני שהשוק נפתח, כתוב את התכנית שלך
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 8, border: 'none',
            background: 'var(--navy)', color: '#fff', cursor: 'pointer',
            fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
          }}
        ><Plus size={14} /> {todayEntry ? 'עדכן היום' : 'הוסף יומן היום'}</button>
      </div>

      {/* Bias vs. P&L correlation */}
      {biasStats.length > 0 && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>
            📊 מה ה-P&L שלך לפי מצב שוק?
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {biasStats.map(s => {
              const opt = BIAS_OPTS.find(o => o.v === s.bias);
              return (
                <div key={s.bias} style={{
                  background: 'var(--bg-card)', borderRadius: 8, padding: '10px 16px',
                  border: `1px solid ${opt?.c || 'var(--border)'}33`, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 12, color: opt?.c, fontWeight: 700, marginBottom: 4 }}>{opt?.l || s.bias}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.avg >= 0 ? 'var(--green)' : 'var(--red)' }} className="amount">
                    {s.avg >= 0 ? '+' : ''}${Math.abs(s.avg).toFixed(0)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>ממוצע / יום ({s.count} ימים)</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid #6366f1', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: 'var(--text)' }}>
            📅 יומן שוק — {todayEntry ? 'עדכון ' : 'חדש ל-'}{new Date().toLocaleDateString('he-IL')}
          </div>
          <EntryForm
            initial={todayEntry || undefined}
            onSave={handleSave}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {/* Entry list */}
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📓</div>
          <div style={{ fontSize: 14 }}>יומן השוק ריק</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>לחץ "הוסף יומן היום" לפני שהשוק נפתח</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(e => (
            <EntryCard key={e.date} entry={e} onDelete={() => handleDelete(e.date)} />
          ))}
        </div>
      )}
    </div>
  );
}
