import { useState, useMemo } from 'react';
import { BookMarked, TrendingUp, TrendingDown, Plus, Edit2, Check, X } from 'lucide-react';

// ── Default playbook entries ─────────────────────────────────────────────────
const DEFAULT_SETUPS = {
  VCP: {
    name: 'VCP — Volatility Contraction Pattern',
    description: 'מניה שעברה בייסינג ארוך עם התכווצות תנודתיות. כל פולבק צר יותר מהקודם, נפח יורד, ועד לנקודת קנייה ספציפית עם נפח גבוה.',
    criteria: [
      'לפחות 3 התכווצויות בגודל שיורד',
      'נפח יורד בכל התכווצות',
      'קנייה בנקודת הפריצה עם נפח גבוה מהממוצע',
      'סטופ מתחת לתחתית ה-VCP האחרון',
    ],
    risk: 'סטופ מתחת לתחתית הטייט — ריסק קטן יחסית',
    target: 'פוטנציאל 2R+, לעיתים 5R+ אם השוק תומך',
  },
  HTF: {
    name: 'HTF — High Tight Flag',
    description: 'מניה שעלתה 100%+ בתקופה קצרה ועכשיו מתבססת בצורה צרה. אחד הסטאפים הכי חזקים לפי O\'Neil.',
    criteria: [
      'עלייה של 100%+ ב-4-8 שבועות',
      'קונסולידציה צרה של 3-5 שבועות, מקסימום 25% ירידה',
      'נפח יורד בזמן הבסיס',
      'פריצה עם נפח גבוה',
    ],
    risk: 'סטופ מתחת לתחתית הדגל',
    target: '50-100% מהעלייה הראשונה',
  },
  EP: {
    name: 'EP — Episodic Pivot',
    description: 'פריצה חדה על חדשות קטליסט — רווחים, מוצר חדש, שינוי רגולטורי. המניה פורצת מבסיס על גאפ גדול.',
    criteria: [
      'גאפ גדול (5%+) על נפח גבוה במיוחד',
      'קטליסט ברור ומשמעותי',
      'קנייה ביום הגאפ, לפחות בחציו העליון',
      'סגירה חזקה ביום הראשון',
    ],
    risk: 'סטופ מתחת לנמוך של יום הגאפ',
    target: 'לפחות 2:1 ביחס לריסק',
  },
  Breakout: {
    name: 'Breakout — פריצת התנגדות',
    description: 'מניה שפורצת מעל התנגדות מרכזית (שיא ישן, קו טרנד) על נפח גבוה. הכי קלאסי.',
    criteria: [
      'פריצה מעל התנגדות ברורה',
      'נפח 1.5x+ מעל הממוצע',
      'בסיס של לפחות 3+ שבועות לפני הפריצה',
      'מניה ב-RS גבוה',
    ],
    risk: 'סטופ מתחת לנמוך של בסיס הפריצה',
    target: 'מדידת גובה הבסיס ×1.5 לפחות',
  },
  'U&R': {
    name: 'U&R — Undercut & Rally',
    description: 'מחיר יורד מתחת לרמת תמיכה מרכזית (שיא ישן, swing low), "מנקה" את הסטופים — ואז מיד חוזר מעל. אחד הסטאפים האהובים על אריאל.',
    criteria: [
      'רמת תמיכה ברורה (swing low, שיא ישן, HVC level)',
      'ירידה קצרה מתחת לרמה — לכמה שעות/יום',
      'חזרה מהירה מעל הרמה בנפח',
      'כניסה כשהמחיר חוזר מעל הרמה',
    ],
    risk: 'סטופ מתחת לנמוך החדש שנוצר ב-Undercut',
    target: 'שיא קודם + 10-20%',
  },
  HVC: {
    name: 'HVC — High Volume Close',
    description: 'כניסה משנית אחרי EP. אם לא נכנסת ביום הגאפ, מצא את מחיר הסגירה של אותו יום ורשום אותו כקו אופקי. כשהמחיר פורץ מעל הקו הזה — זו הכניסה.',
    criteria: [
      'מניה עם EP/גאפ על נפח גבוה (לפחות 3x ממוצע)',
      'לא נכנסת ביום הגאפ עצמו',
      'מסמן את מחיר הסגירה של יום הגאפ',
      'כניסה ברגע שהמחיר פורץ מעל ה-HVC level',
      'לא לחכות לסגירה יומית — הכניסה היא ב-intraday',
    ],
    risk: 'סטופ מתחת לנמוך של יום הכניסה',
    target: 'שיא חדש לפחות, יעד מינימלי 2R',
  },
  Pullback: {
    name: 'Pullback — קנייה בפולבק',
    description: 'מניה בטרנד עולה שחוזרת לממוצע נע (10/21/50 EMA) ו"נוגעת" ואז ממשיכה לעלות.',
    criteria: [
      'מגמה עולה ברורה (מניה מעל 50 EMA)',
      'פולבק לממוצע נע מרכזי',
      'נפח יורד בזמן הפולבק',
      'נר הפניה/קנייה עם נפח עולה',
    ],
    risk: 'סטופ מתחת לנמוך של הפולבק',
    target: 'שיא חדש + עוד',
  },
};

const EMPTY_SETUP = {
  name: '', description: '', criteria: [''], risk: '', target: '',
};

// ── Stat chip ────────────────────────────────────────────────────────────────
function Chip({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', minWidth: 70,
    }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: color || 'var(--text)' }} className="amount">{value}</div>
      <div style={{ fontSize: 9.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}

// ── Setup performance from trades ────────────────────────────────────────────
function calcSetupStats(trades, setupKey) {
  const ts = trades.filter(t => t.setup === setupKey && t.pnl != null);
  if (!ts.length) return null;
  const pnls  = ts.map(t => parseFloat(t.pnl) - (parseFloat(t.commission) || 0));
  const wins  = pnls.filter(p => p > 0);
  const rVals = ts.filter(t => t.r_value != null).map(t => parseFloat(t.r_value)).filter(v => !isNaN(v));
  return {
    count:   ts.length,
    winRate: Math.round(wins.length / ts.length * 100),
    totalPnl: parseFloat(pnls.reduce((a, b) => a + b, 0).toFixed(2)),
    avgPnl:  parseFloat((pnls.reduce((a, b) => a + b, 0) / ts.length).toFixed(2)),
    avgR:    rVals.length ? parseFloat((rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(2)) : null,
    trades:  ts,
  };
}

// ── Single setup card ─────────────────────────────────────────────────────────
function SetupCard({ setupKey, entry, stats, onEdit, isEditing, onSave, onCancel }) {
  const [draft, setDraft] = useState(entry);
  const [criteriaText, setCriteriaText] = useState((entry.criteria || []).join('\n'));

  const handleSave = () => {
    onSave(setupKey, {
      ...draft,
      criteria: criteriaText.split('\n').map(s => s.trim()).filter(Boolean),
    });
  };

  const pnlColor = stats?.totalPnl >= 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div style={{
      background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12,
      overflow: 'hidden', transition: 'box-shadow 0.15s',
    }}>
      {/* Header strip */}
      <div style={{
        height: 3,
        background: stats ? (stats.totalPnl >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--border)',
      }} />

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            {isEditing ? (
              <input
                className="input" value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="שם הסטאפ"
                style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}
              />
            ) : (
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{entry.name || setupKey}</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>Setup: {setupKey}</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {isEditing ? (
              <>
                <button type="button" onClick={handleSave} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--green)', padding: 4 }}><Check size={16} /></button>
                <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4 }}><X size={16} /></button>
              </>
            ) : (
              <button type="button" onClick={() => { setDraft(entry); setCriteriaText((entry.criteria || []).join('\n')); onEdit(setupKey); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', padding: 4 }}>
                <Edit2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        {stats ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: 'var(--bg-card)', borderRadius: 8, padding: 8 }}>
            <Chip label="עסקאות"  value={stats.count} />
            <Chip label="Win %"   value={`${stats.winRate}%`} color={stats.winRate >= 50 ? 'var(--green)' : 'var(--red)'} />
            <Chip label="ממוצע"   value={`${stats.avgPnl >= 0 ? '+' : ''}$${Math.abs(stats.avgPnl).toFixed(0)}`} color={pnlColor} />
            {stats.avgR != null && <Chip label="Avg R" value={`${stats.avgR >= 0 ? '+' : ''}${stats.avgR}R`} color={stats.avgR >= 0 ? 'var(--green)' : 'var(--red)'} />}
            <Chip label="Net P&L" value={`${stats.totalPnl >= 0 ? '+' : ''}$${Math.abs(stats.totalPnl).toFixed(0)}`} color={pnlColor} />
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-faint)', background: 'var(--bg-card)', borderRadius: 8, padding: '10px 12px' }}>
            אין עסקאות בסטאפ הזה עדיין
          </div>
        )}

        {/* Description */}
        <div>
          <div style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>תיאור</div>
          {isEditing ? (
            <textarea className="input" rows={2} value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} style={{ fontSize: 13, resize: 'vertical' }} />
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{entry.description || '—'}</div>
          )}
        </div>

        {/* Criteria */}
        <div>
          <div style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>קריטריונים לכניסה</div>
          {isEditing ? (
            <textarea className="input" rows={4} value={criteriaText} onChange={e => setCriteriaText(e.target.value)} placeholder="שורה אחת = קריטריון אחד" style={{ fontSize: 12, resize: 'vertical' }} />
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(entry.criteria || []).map((c, i) => (
                <li key={i} style={{ display: 'flex', gap: 7, fontSize: 12.5, color: 'var(--text-muted)', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--green)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  <span>{c}</span>
                </li>
              ))}
              {!entry.criteria?.length && <li style={{ color: 'var(--text-faint)', fontSize: 12 }}>לחץ על עריכה להוסיף קריטריונים</li>}
            </ul>
          )}
        </div>

        {/* Risk + Target */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: '🛑 סטופ לוס', key: 'risk', color: '#dc2626' },
            { label: '🎯 יעד', key: 'target', color: '#16a34a' },
          ].map(({ label, key, color }) => (
            <div key={key} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>{label}</div>
              {isEditing ? (
                <input className="input" value={draft[key] || ''} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))} placeholder={label} style={{ fontSize: 12 }} />
              ) : (
                <div style={{ fontSize: 12, color, fontWeight: 500 }}>{entry[key] || '—'}</div>
              )}
            </div>
          ))}
        </div>

        {/* Recent trades mini-list */}
        {stats?.trades?.length > 0 && (
          <div>
            <div style={{ fontSize: 10.5, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              עסקאות אחרונות
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {stats.trades.slice(-5).reverse().map((t, i) => {
                const net = parseFloat(t.pnl) - (parseFloat(t.commission) || 0);
                const r   = t.r_value != null ? parseFloat(t.r_value) : null;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, padding: '5px 8px', background: 'var(--bg-card)', borderRadius: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text)', minWidth: 50 }}>{t.ticker}</span>
                    <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>{t.date}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 700, color: net >= 0 ? 'var(--green)' : 'var(--red)' }} className="amount">
                      {net >= 0 ? '+' : ''}${Math.abs(net).toFixed(2)}
                    </span>
                    {r != null && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: r >= 0 ? 'var(--green)' : 'var(--red)', minWidth: 36, textAlign: 'right' }}>
                        {r >= 0 ? '+' : ''}{r.toFixed(1)}R
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Playbook component ───────────────────────────────────────────────────
const STORAGE_KEY = 'apex_playbook_v1';

function loadPlaybook() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_SETUPS, ...JSON.parse(saved) };
  } catch { /* corrupt data — fall back to defaults */ }
  return { ...DEFAULT_SETUPS };
}

function savePlaybook(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* storage full — keep in memory */ }
}

export default function Playbook({ trades }) {
  const [playbook, setPlaybook] = useState(() => loadPlaybook());
  const [editingKey, setEditingKey] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newEntry, setNewEntry] = useState({ ...EMPTY_SETUP });

  const setupStats = useMemo(() => {
    const keys = new Set([...Object.keys(playbook), ...trades.map(t => t.setup).filter(Boolean)]);
    const result = {};
    keys.forEach(k => { result[k] = calcSetupStats(trades, k); });
    return result;
  }, [trades, playbook]);

  // Include setups from trades that aren't in playbook yet
  const allKeys = useMemo(() => {
    const fromTrades = [...new Set(trades.map(t => t.setup).filter(Boolean))];
    const keys = new Set([...Object.keys(playbook), ...fromTrades]);
    return [...keys].sort();
  }, [trades, playbook]);

  const handleSave = (key, entry) => {
    const updated = { ...playbook, [key]: entry };
    setPlaybook(updated);
    savePlaybook(updated);
    setEditingKey(null);
  };

  const handleAddNew = () => {
    if (!newKey.trim()) return;
    const k = newKey.trim().toUpperCase();
    const updated = { ...playbook, [k]: { ...newEntry } };
    setPlaybook(updated);
    savePlaybook(updated);
    setShowAdd(false);
    setNewKey('');
    setNewEntry({ ...EMPTY_SETUP });
  };

  // Sort: setups with trades first, sorted by total P&L desc
  const sortedKeys = useMemo(() =>
    allKeys.sort((a, b) => {
      const sa = setupStats[a], sb = setupStats[b];
      if (sa && !sb) return -1;
      if (!sa && sb) return 1;
      if (sa && sb) return (sb.totalPnl || 0) - (sa.totalPnl || 0);
      return a.localeCompare(b);
    }),
  [allKeys, setupStats]);

  const totalTrades = trades.filter(t => t.setup && t.pnl != null).length;
  const bestSetup   = sortedKeys.find(k => setupStats[k]?.totalPnl > 0);
  const totalPnl    = Object.values(setupStats).reduce((s, st) => s + (st?.totalPnl || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookMarked size={18} /> Playbook — ספר הסטאפים שלי
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 3 }}>
            הגדר קריטריונים לכל סטאפ ועקוב אחרי הביצועים שלו
          </div>
        </div>

        {/* Summary chips */}
        {totalTrades > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }} className="amount">
                {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toFixed(0)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>סה״כ כל הסטאפים</div>
            </div>
            {bestSetup && (
              <div style={{ background: 'rgba(22,163,74,0.1)', border: '1px solid var(--green)', borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>{bestSetup}</div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>הסטאפ הכי רווחי</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add new setup button */}
      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 8, border: '1px dashed var(--border)',
            background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer',
            fontSize: 13, fontFamily: 'inherit', fontWeight: 500,
          }}
        >
          <Plus size={14} /> הוסף סטאפ חדש
        </button>
      ) : (
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>סטאפ חדש</div>
          <input className="input" placeholder="מפתח (למשל: SQUEEZE)" value={newKey} onChange={e => setNewKey(e.target.value.toUpperCase())} style={{ maxWidth: 180, fontWeight: 700 }} />
          <input className="input" placeholder="שם מלא" value={newEntry.name} onChange={e => setNewEntry(d => ({ ...d, name: e.target.value }))} />
          <textarea className="input" rows={2} placeholder="תיאור הסטאפ" value={newEntry.description} onChange={e => setNewEntry(d => ({ ...d, description: e.target.value }))} style={{ resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAddNew} className="btn btn-primary" style={{ fontSize: 13 }}>הוסף</button>
            <button onClick={() => setShowAdd(false)} className="btn btn-ghost" style={{ fontSize: 13 }}>ביטול</button>
          </div>
        </div>
      )}

      {/* Setup grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {sortedKeys.map(key => (
          <SetupCard
            key={key}
            setupKey={key}
            entry={playbook[key] || { name: key, description: '', criteria: [], risk: '', target: '' }}
            stats={setupStats[key]}
            onEdit={k => setEditingKey(k)}
            isEditing={editingKey === key}
            onSave={handleSave}
            onCancel={() => setEditingKey(null)}
          />
        ))}
        {sortedKeys.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)' }}>
            <BookMarked size={32} style={{ marginBottom: 12, opacity: 0.35 }} />
            <div>הפלייבוק ריק — לחץ "הוסף סטאפ חדש" כדי להתחיל</div>
          </div>
        )}
      </div>
    </div>
  );
}
