import { useState } from 'react';
import { Plus, Trash2, Zap, BookOpen } from 'lucide-react';
import { useLocalStore } from '../hooks/useLocalStore';

const EMPTY = { scenario_date: new Date().toISOString().slice(0,10), symbol: '', if_condition: '', then_action: '', trigger_price: '', is_active: true, was_triggered: false, notes: '' };

const TEMPLATES = [
  // ── Qullamaggie — Breakout ──────────────────────────────────────────────────
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה עולה 30-100%+ ב-1-3 חודשים ואחר כך מתכנסת בצורה מסודרת (Higher Lows) עם נפח יורד למשך 2-8 שבועות',
    then_action: 'זהה Breakout setup — קנה בפריצת ה-ORH (1 דקה, 5 דקות, או 60 דקות לפי תיזמון)',
    notes: '📘 Qullamaggie | Breakout Setup — Pre-conditions',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה פורצת עם Gap Up בפתיחה ונפח גדול',
    then_action: 'כנס על ה-High של נר 1 הדקה הראשון (1-min ORH) — לא לאחר מ-9:31',
    notes: '📘 Qullamaggie | Entry — Gap Up',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה פורצת בין 9:31-9:35 (לא Gap Up)',
    then_action: 'כנס על ה-High של נר 5 הדקות הראשון (5-min ORH)',
    notes: '📘 Qullamaggie | Entry — Early Breakout',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה פורצת בין 9:35-10:00',
    then_action: 'כנס על ה-High של נר 60 הדקות הראשון (Hourly ORH)',
    notes: '📘 Qullamaggie | Entry — Late Breakout',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'הסטופ הנדרש (LOD) רחב יותר מ-1x ATR/ADR של המניה',
    then_action: 'דלג על העסקה — לא לקחת עסקה שהסטופ שלה חורג מה-ATR',
    notes: '📘 Qullamaggie | Stop Rule — Skip Wide Stops',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'הפריצה קורית ללא נפח מוגבר',
    then_action: 'אל תיכנס — Breakout ללא נפח לרוב נכשל',
    notes: '📘 Qullamaggie | Entry Filter — No Volume = No Trade',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'המניה עולה 3-5 ימים חזקים לאחר הכניסה',
    then_action: 'מכור 1/3 עד 1/2 מהפוזיציה לתוך החוזק, העבר סטופ ל-Break-Even על יתרת המניות',
    notes: '📘 Qullamaggie | Exit — Partial Profit After 3-5 Days',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'הנפח בתחילת העסקה לא מרשים — המניה לא מתנהגת כמצופה',
    then_action: 'צא מיד — "If price doesn\'t act well, I exit"',
    notes: '📘 Qullamaggie | Exit — Poor Action = Exit Immediately',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'המניה סוגרת מתחת לממוצע 10 ימים לאחר ריצה מוצלחת',
    then_action: 'צא מיתרת הפוזיציה — Intraday dip אינו מהווה סיגנל, רק סגירה מתחת ל-MA',
    notes: '📘 Qullamaggie | Trailing Stop — Close Below 10-Day MA',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'הסטופ נפגע',
    then_action: 'צא מיד ללא היסוס — "I don\'t think, I just get out"',
    notes: '📘 Qullamaggie | Stop Loss — No Hesitation',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'השוק הכללי בירידה (Downtrend)',
    then_action: 'אל תיכנס ל-Breakouts — הם נכשלים באופן עקבי בשוק יורד',
    notes: '📘 Qullamaggie | Market Filter — No Breakouts in Downtrend',
  },
  // ── Qullamaggie — Episodic Pivot ───────────────────────────────────────────
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה עם Gap Up של 10%+ על קטליזטור אמיתי (רווחים, FDA, חוזה גדול), מניה הייתה שטוחה 3-6 חודשים, ונפח מסיבי בפרי-מרקט',
    then_action: 'זהה Episodic Pivot (EP) — כנס על 1-min ORH. אם השוק בעלייה ה-EP עשוי לא לחזור לרמת הפתיחה — פעל מהיר',
    notes: '📘 Qullamaggie | EP Setup — Full Conditions',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה עם Gap Up 10%+ אבל הנפח לא מגיע בפרי-מרקט או בראשית המסחר',
    then_action: 'המתן לנפח שיגיע — אם לא מגיע, דלג על העסקה',
    notes: '📘 Qullamaggie | EP Filter — Wait for Volume Confirmation',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה עם EP אבל כבר הייתה בריצה גדולה לאחרונה (לא מניה "שנשכחה")',
    then_action: 'דלג — לא EP אמיתי',
    notes: '📘 Qullamaggie | EP Filter — Not Extended Prior',
  },
  // ── Qullamaggie — Parabolic ────────────────────────────────────────────────
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה עלתה 50-100%+ בימים/שבועות ספורים ומראה יום אדום ראשון עם נפח גבוה',
    then_action: 'צפה ל-Short Setup — כנס על פריצת ה-Opening Range Low (1-min/5-min) כלפי מטה',
    notes: '📘 Qullamaggie | Parabolic Short — First Red Day',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה פראבולית מקפצת ל-VWAP ואז נכשלת ב-VWAP',
    then_action: 'כנס Short על כישלון VWAP — סטופ מעל VWAP',
    notes: '📘 Qullamaggie | Parabolic Short — VWAP Rejection',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה קרסה 50-60%+ בימים ספורים ומראה סימני היפוך',
    then_action: 'שקול Long Bounce — כנס על 1-min ORH הראשון לכיוון עלייה. מטרה: 50-100% ב-2-3 ימים',
    notes: '📘 Qullamaggie | Parabolic Bounce Long',
  },
  // ── Qullamaggie — Position Sizing ─────────────────────────────────────────
  {
    symbol: '', trigger_price: '',
    if_condition: 'קביעת גודל פוזיציה בכל עסקה',
    then_action: 'סכן לא יותר מ-0.25%-0.5% מהחשבון. גודל פוזיציה 10-15% מהחשבון בממוצע, מקסימום 25%',
    notes: '📘 Qullamaggie | Position Sizing',
    },
  {
    symbol: '', trigger_price: '',
    if_condition: 'יש לי 30+ פוזיציות פתוחות בו-זמנית',
    then_action: 'זה סיגנל שהשוק עשוי להתכנס לתיקון — שקול להקטין חשיפה',
    notes: '📘 Qullamaggie | Market Signal — Too Many Open Positions',
  },
  // ── Ariel Hernandez — Market & Sector ─────────────────────────────────────
  {
    symbol: '', trigger_price: '',
    if_condition: 'השוק הכללי בעלייה וסקטור המניה מוביל',
    then_action: 'כנס בגודל מלא — כל התנאים מסונכרנים (Market + Sector + Setup)',
    notes: '🔴 Ariel Hernandez | Market Filter — Full Size',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'השוק בתנודתיות/צ\'ופי אבל המניה מראה חוזק יחסי קיצוני',
    then_action: 'כנס בגודל קטן יותר — 50% מהגודל הרגיל',
    notes: '🔴 Ariel Hernandez | Market Filter — Half Size in Choppy',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'השוק בירידה כללית',
    then_action: 'אל תיכנס ל-Long setups — יותר False Breakouts ו-Fake Moves. "Never argue with price"',
    notes: '🔴 Ariel Hernandez | Market Filter — No Longs in Downtrend',
  },
  // ── Ariel Hernandez — EP ───────────────────────────────────────────────────
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה עם Gap Up 10%+ על קטליזטור אמיתי, הייתה שטוחה 3-6 חודשים, נפח פי כמה מהממוצע',
    then_action: 'EP Setup — כנס מעל ה-High של נר 5 הדקות הראשון. אם השוק בעלייה: פעל מהיר, לא תמיד יחזור לרמה',
    notes: '🔴 Ariel Hernandez | EP — Entry',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה עם EP עושה 3-5 ימים חזקים',
    then_action: 'קח רווח חלקי לתוך החוזק, הוסף Trailing Stop על יתרת הפוזיציה על פי ה-10-day MA',
    notes: '🔴 Ariel Hernandez | EP — Exit Management',
  },
  // ── Ariel Hernandez — HVC ─────────────────────────────────────────────────
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה סגרה ביום אחד עם נפח מסיבי (Institutional Accumulation) ואז ירדה מעט',
    then_action: 'סמן את רמת הסגירה הנפחית הגבוהה (HVC). המתן לשחזור — כנס ברגע שהמניה פורצת חזרה מעל הרמה',
    notes: '🔴 Ariel Hernandez | HVC — High Volume Close Reclaim',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה שחוזרת לרמת HVC אבל הנפח בפריצה חלש',
    then_action: 'נהג בזהירות — פריצת HVC ללא נפח עלולה להיכשל',
    notes: '🔴 Ariel Hernandez | HVC — Weak Volume = Caution',
  },
  // ── Ariel Hernandez — Flat Base ───────────────────────────────────────────
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה התכנסה לטווח צר ושטוח עם MA מתקרבים, ושוברת מעל ה-High של היום הקודם',
    then_action: 'Flat Base Breakout — כנס מעל High יום קודם. "ככל שהבסיס ארוך יותר, כוח הפריצה גדול יותר"',
    notes: '🔴 Ariel Hernandez | Flat Base Breakout',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'נר הפריצה ב-Flat Base רחב מאוד עם Wick גדול',
    then_action: 'הצב סטופ ב-Low של יום הפריצה (לא Prior Day Low) — וקטן את גודל הפוזיציה בהתאם לסיכון הרחב',
    notes: '🔴 Ariel Hernandez | Flat Base — Wide Candle = LOD Stop',
  },
  // ── Ariel Hernandez — U&R ─────────────────────────────────────────────────
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה יורדת מתחת ל-Support ידוע, לוכדת Shorts, ומיד חוזרת מעל הרמה',
    then_action: 'Undercut & Rally — כנס ברגע שהמחיר חוזר מעל הרמה. סטופ ב-Low החדש שנוצר',
    notes: '🔴 Ariel Hernandez | Undercut & Rally (U&R)',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה יורדת מתחת ל-Support ונשארת שם (לא חוזרת מיד)',
    then_action: 'דלג — לא U&R נקי. ה-Undercut צריך להיות מהיר ומיידי',
    notes: '🔴 Ariel Hernandez | U&R Filter — No Linger Below',
  },
  // ── Ariel Hernandez — MA U&R ──────────────────────────────────────────────
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה צוללת מתחת ל-MA (10/20/50) ואז מתאוששת מעל ה-MA עם נפח',
    then_action: 'MA Undercut & Rally — כנס ברגע שחוזרת מעל ה-MA. סטופ ב-Low של יום ה-Reclaim',
    notes: '🔴 Ariel Hernandez | MA Undercut & Rally',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה חוזרת מעל MA אחרי Undercut אבל נפח החזרה חלש',
    then_action: 'נהג בזהירות — Reclaim בנפח חלש עלול להיכשל',
    notes: '🔴 Ariel Hernandez | MA U&R — Low Volume = Caution',
  },
  // ── Ariel Hernandez — HTF ─────────────────────────────────────────────────
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה עלתה 50-100%+, ואז התכנסה 2-5 שבועות ב-Flag צר מאוד (HTF)',
    then_action: 'High Tight Flag — כנס כשהמחיר פורץ מעל החצי העליון של טווח ה-Flag. סטופ ב-LOD',
    notes: '🔴 Ariel Hernandez | High Tight Flag (HTF)',
  },
  // ── Ariel Hernandez — General ─────────────────────────────────────────────
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה מראה נר היפוך דובי בנפח גבוה לאחר ריצה',
    then_action: 'צא מיד — אל תחכה לסגירה. "Never argue with price"',
    notes: '🔴 Ariel Hernandez | Exit — Bearish Reversal Candle',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'הסטופ נפגע',
    then_action: 'צא ללא היסוס ואל תממוצע — "React, don\'t predict"',
    notes: '🔴 Ariel Hernandez | Stop — React Don\'t Predict',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'מניה סוגרת מתחת ל-MA 10 או 20 לאחר ריצה מוצלחת',
    then_action: 'צא מיתרת הפוזיציה',
    notes: '🔴 Ariel Hernandez | Trailing Stop — Close Below MA',
  },
  {
    symbol: '', trigger_price: '',
    if_condition: 'קביעת גודל פוזיציה',
    then_action: 'סכן 0.5%-1% מהחשבון. גודל פוזיציה = סכום הסיכון ÷ (כניסה - סטופ)',
    notes: '🔴 Ariel Hernandez | Position Sizing Formula',
  },
];

export default function Scenarios() {
  const { data, add, update, remove } = useLocalStore('apex_scenarios', []);
  const [form, setForm] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [showTemplates, setShowTemplates] = useState(false);
  const [filterSource, setFilterSource] = useState('ALL');

  const loadTemplates = () => {
    const today = new Date().toISOString().slice(0, 10);
    TEMPLATES.forEach(t => add({ ...t, scenario_date: today, is_active: true, was_triggered: false }));
    setShowTemplates(false);
  };

  const save = () => {
    if (!draft.if_condition || !draft.then_action) return;
    const item = { ...draft, trigger_price: parseFloat(draft.trigger_price) || null };
    if (form === 'new') add(item);
    else update(form, item);
    setForm(null);
  };

  const filtered = data.filter(s => {
    if (filterSource === 'Q') return s.notes?.includes('Qullamaggie');
    if (filterSource === 'A') return s.notes?.includes('Ariel');
    if (filterSource === 'CUSTOM') return !s.notes?.includes('Qullamaggie') && !s.notes?.includes('Ariel');
    return true;
  });

  const active    = filtered.filter(s => s.is_active && !s.was_triggered);
  const triggered = filtered.filter(s => s.was_triggered);
  const inactive  = filtered.filter(s => !s.is_active && !s.was_triggered);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>If / Then Rules</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Plan your reactions before the market opens</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" style={{ fontSize: 12, gap: 5 }} onClick={() => setShowTemplates(true)}>
            <BookOpen size={13} /> Load Templates
          </button>
          <button className="btn btn-primary" onClick={() => { setDraft({ ...EMPTY, scenario_date: new Date().toISOString().slice(0,10) }); setForm('new'); }}>
            <Plus size={14} /> New Rule
          </button>
        </div>
      </div>

      {/* Source filter */}
      {data.length > 0 && (
        <div style={{ display: 'flex', gap: 6 }}>
          {[['ALL','All'],['Q','📘 Qullamaggie'],['A','🔴 Ariel'],['CUSTOM','Custom']].map(([k,l]) => (
            <button key={k} onClick={() => setFilterSource(k)} style={{
              fontSize: 11, padding: '4px 11px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: filterSource === k ? 'var(--navy)' : 'var(--bg-card)',
              color: filterSource === k ? '#fff' : 'var(--text-muted)',
              fontWeight: filterSource === k ? 600 : 400, fontFamily: 'inherit',
            }}>{l}</button>
          ))}
        </div>
      )}

      {data.length === 0 && (
        <div className="panel" style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 48 }}>
          <div style={{ marginBottom: 12 }}>אין חוקים עדיין</div>
          <button className="btn btn-primary" style={{ gap: 6 }} onClick={() => setShowTemplates(true)}>
            <BookOpen size={14} /> טען חוקי Qullamaggie & Ariel
          </button>
        </div>
      )}

      {[['Active', active, '#EFF6FF', 'var(--navy)'], ['Triggered', triggered, '#ECFDF5', 'var(--green)'], ['Inactive', inactive, 'var(--bg-card)', 'var(--text-faint)']].map(([label, items, bg, accent]) =>
        items.length > 0 && (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label} ({items.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(s => (
                <div key={s.id} className="panel" style={{ padding: '12px 16px', background: bg }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <Zap size={15} color={accent} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {s.notes && (
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 5, fontWeight: 600, letterSpacing: '0.04em', direction: 'ltr' }}>{s.notes}</div>
                      )}
                      <div style={{ fontSize: 13, marginBottom: 4, lineHeight: 1.6, direction: 'rtl', textAlign: 'right', unicodeBidi: 'plaintext' }}>
                        <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>IF: </span>
                        <span style={{ color: 'var(--text)' }}>{s.if_condition}</span>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.6, direction: 'rtl', textAlign: 'right', unicodeBidi: 'plaintext' }}>
                        <span style={{ color: accent, fontWeight: 700 }}>THEN: </span>
                        <span style={{ color: 'var(--text)' }}>{s.then_action}</span>
                      </div>
                      {(s.symbol || s.trigger_price) && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          {s.symbol && <span style={{ fontWeight: 700, marginRight: 8 }}>{s.symbol}</span>}
                          {s.trigger_price && <span>@ ${s.trigger_price}</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      {s.is_active && !s.was_triggered && (
                        <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => update(s.id, { was_triggered: true })}>✓</button>
                      )}
                      <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 10 }} onClick={() => { setDraft(s); setForm(s.id); }}>Edit</button>
                      <button className="btn btn-danger" style={{ padding: '3px 7px', fontSize: 10 }} onClick={() => remove(s.id)}><Trash2 size={10} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Templates confirm modal */}
      {showTemplates && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTemplates(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>טען חוקי מסחר</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
              יטענו <strong>{TEMPLATES.length} חוקי If/Then</strong> מתוך:
              <br />📘 <strong>Kristjan Kullamägi (Qullamaggie)</strong> — Breakout, EP, Parabolic, Position Sizing
              <br />🔴 <strong>Ariel Hernandez</strong> — EP, HVC, Flat Base, U&R, MA U&R, HTF
              <br /><br />
              <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>החוקים הקיימים לא יימחקו.</span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowTemplates(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={loadTemplates}>טען {TEMPLATES.length} חוקים</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/New modal */}
      {form !== null && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setForm(null)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>{form === 'new' ? 'New Rule' : 'Edit Rule'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={lbl}>Date</label><input className="input" type="date" value={draft.scenario_date} onChange={e => setDraft(d => ({ ...d, scenario_date: e.target.value }))} /></div>
              <div><label style={lbl}>Symbol</label><input className="input" value={draft.symbol} onChange={e => setDraft(d => ({ ...d, symbol: e.target.value.toUpperCase() }))} placeholder="AAPL" /></div>
              <div><label style={lbl}>Trigger Price</label><input className="input" type="number" value={draft.trigger_price} onChange={e => setDraft(d => ({ ...d, trigger_price: e.target.value }))} /></div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>IF... (condition)</label>
              <textarea className="input" rows={3} value={draft.if_condition} onChange={e => setDraft(d => ({ ...d, if_condition: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>THEN... (action)</label>
              <textarea className="input" rows={3} value={draft.then_action} onChange={e => setDraft(d => ({ ...d, then_action: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Notes / Source</label>
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
