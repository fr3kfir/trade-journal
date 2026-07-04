import { useMemo, useState } from 'react';
import { Clock, Calendar, Crosshair, Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Shield, ArrowUp, ArrowDown } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function netPnl(t) {
  return parseFloat(t.pnl) - (parseFloat(t.commission) || 0);
}

function fmt$(v, sign = true) {
  const s = sign ? (v >= 0 ? '+' : '-') : '';
  return `${s}$${Math.abs(v).toFixed(v >= 1000 || v <= -1000 ? 0 : 2)}`;
}

function groupStats(list) {
  const pnls = list.map(netPnl);
  const total = pnls.reduce((a, b) => a + b, 0);
  const wins = pnls.filter(p => p > 0).length;
  return {
    count:   list.length,
    total:   parseFloat(total.toFixed(2)),
    avg:     list.length ? parseFloat((total / list.length).toFixed(2)) : 0,
    winRate: list.length ? Math.round(wins / list.length * 100) : 0,
    wins,
  };
}

function groupBy(list, keyFn) {
  const map = new Map();
  for (const t of list) {
    const k = keyFn(t);
    if (k == null) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(t);
  }
  return [...map.entries()].map(([key, ts]) => ({ key, ...groupStats(ts) }));
}

const DAY_NAMES = { 1: 'שני', 2: 'שלישי', 3: 'רביעי', 4: 'חמישי', 5: 'שישי' };
const TRADING_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri (US market)

const SESSIONS = [
  { key: 'pre',   label: 'פרה-מרקט',  range: 'לפני 9:30',   from: 0,   to: 570 },
  { key: 'open',  label: 'פתיחה',      range: '9:30–10:30',  from: 570, to: 630 },
  { key: 'am',    label: 'בוקר',       range: '10:30–12:00', from: 630, to: 720 },
  { key: 'lunch', label: 'צהריים',     range: '12:00–14:00', from: 720, to: 840 },
  { key: 'pm',    label: 'אחה״צ',      range: '14:00–15:30', from: 840, to: 930 },
  { key: 'close', label: 'סגירה',      range: '15:30–16:00', from: 930, to: 960 },
  { key: 'after', label: 'אפטר-מרקט', range: 'אחרי 16:00',  from: 960, to: 1441 },
];

function timeToMins(time) {
  const m = /^(\d{1,2}):(\d{2})/.exec(time || '');
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null;
}

function sessionOf(t) {
  const mins = timeToMins(t.time);
  if (mins == null) return null;
  return SESSIONS.find(s => mins >= s.from && mins < s.to)?.key ?? null;
}

// ── Bar chart (single measure, polarity green/red, labeled values) ──────────

function EdgeBars({ data, width = 520, height = 190, fmtVal = fmt$ }) {
  if (!data.length) return null;
  const pad = { top: 22, right: 8, bottom: 42, left: 8 };
  const W = width - pad.left - pad.right;
  const H = height - pad.top - pad.bottom;

  const maxAbs = Math.max(...data.map(d => Math.abs(d.avg)), 0.01);
  const gap  = W / data.length;
  const barW = Math.min(46, Math.max(10, gap * 0.6));
  const posH = H * 0.62, negH = H * 0.38; // asymmetric space above/below zero
  const zeroY = posH;
  const scale = v => Math.abs(v) / maxAbs * (v >= 0 ? posH : negH) * 0.92;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${pad.left},${pad.top})`}>
        <line x1={0} y1={zeroY} x2={W} y2={zeroY} stroke="var(--border)" strokeWidth={1} />
        {data.map((d, i) => {
          const bH = scale(d.avg);
          const x = gap * i + gap / 2 - barW / 2;
          const col = d.avg >= 0 ? 'var(--green)' : 'var(--red)';
          const y = d.avg >= 0 ? zeroY - bH : zeroY;
          return (
            <g key={d.key}>
              <rect x={x} y={y} width={barW} height={Math.max(bH, 1)} fill={col} rx={3} opacity={0.85} />
              {/* negative values: label above the zero line so it never collides with axis labels */}
              <text x={x + barW / 2} y={d.avg >= 0 ? y - 5 : zeroY - 5} textAnchor="middle" fontSize={9.5} fill={col} fontWeight={700}>
                {fmtVal(d.avg)}
              </text>
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize={9.5} fill="var(--text)" fontWeight={600}>
                {d.label}
              </text>
              <text x={x + barW / 2} y={H + 26} textAnchor="middle" fontSize={8} fill="var(--text-faint)">
                {d.count}× · {d.winRate}%
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

// ── Insight card ─────────────────────────────────────────────────────────────

const INSIGHT_STYLE = {
  edge: { color: 'var(--green)', bg: 'rgba(22,163,74,0.08)',  Icon: TrendingUp,    title: 'עובד לך' },
  leak: { color: 'var(--red)',   bg: 'rgba(220,38,38,0.07)',  Icon: TrendingDown,  title: 'מחליש אותך' },
  warn: { color: '#d97706',      bg: 'rgba(217,119,6,0.08)',  Icon: AlertTriangle, title: 'שים לב' },
};

function InsightCard({ ins }) {
  const s = INSIGHT_STYLE[ins.kind];
  return (
    <div dir="rtl" style={{ background: s.bg, border: `1px solid ${s.color}33`, borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <s.Icon size={16} style={{ color: s.color, flexShrink: 0, marginTop: 2 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
          {ins.title}
          {ins.smallSample && <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-faint)', marginInlineStart: 6 }}> (מדגם קטן)</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.55 }}>{ins.detail}</div>
        {ins.action && <div style={{ fontSize: 12, color: s.color, marginTop: 5, fontWeight: 600 }}>→ {ins.action}</div>}
      </div>
    </div>
  );
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────

function Panel({ icon: Icon, title, sub, children }) {
  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {Icon && <Icon size={15} />} {title}
        </div>
        {sub && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{sub}</span>}
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EdgeAnalytics({ trades }) {
  const [tf, setTf] = useState('ALL');

  const closed = useMemo(() => {
    let list = trades.filter(t => t.pnl != null && t.date);
    if (tf !== 'ALL') {
      const now = new Date();
      let cutoff;
      if (tf === '1M')  { cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 1); }
      if (tf === '3M')  { cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 3); }
      if (tf === 'YTD') { cutoff = new Date(now.getFullYear(), 0, 1); }
      if (cutoff) list = list.filter(t => new Date(t.date) >= cutoff);
    }
    return [...list].sort((a, b) =>
      (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  }, [trades, tf]);

  const withTime = useMemo(() => closed.filter(t => timeToMins(t.time) != null), [closed]);

  // ── dimensional breakdowns ──
  const hourData = useMemo(() =>
    groupBy(withTime, t => Math.floor(timeToMins(t.time) / 60))
      .sort((a, b) => a.key - b.key)
      .map(d => ({ ...d, label: `${d.key}:00` })),
  [withTime]);

  const sessionData = useMemo(() => {
    const grouped = groupBy(withTime, sessionOf);
    return SESSIONS
      .map(s => ({ ...s, ...(grouped.find(g => g.key === s.key) || { count: 0, total: 0, avg: 0, winRate: 0 }) }))
      .filter(s => s.count > 0);
  }, [withTime]);

  const dayData = useMemo(() => {
    const grouped = groupBy(closed, t => new Date(t.date).getDay());
    return TRADING_DAYS
      .map(d => ({ ...(grouped.find(g => g.key === d) || { key: d, count: 0, total: 0, avg: 0, winRate: 0 }), label: DAY_NAMES[d] }))
      .filter(d => d.count > 0);
  }, [closed]);

  const dirData = useMemo(() => {
    const g = groupBy(closed, t => t.direction === 'S' ? 'S' : 'L');
    return {
      L: g.find(x => x.key === 'L') || { count: 0 },
      S: g.find(x => x.key === 'S') || { count: 0 },
    };
  }, [closed]);

  const tickerData = useMemo(() =>
    groupBy(closed, t => t.ticker || '?').sort((a, b) => b.total - a.total),
  [closed]);

  const setupData = useMemo(() =>
    groupBy(closed.filter(t => t.setup), t => t.setup).sort((a, b) => b.avg - a.avg),
  [closed]);

  // Day × Session heat grid
  const heatGrid = useMemo(() => {
    if (withTime.length < 10) return null;
    const cells = {};
    for (const t of withTime) {
      const d = new Date(t.date).getDay();
      const s = sessionOf(t);
      if (!TRADING_DAYS.includes(d) || !s) continue;
      const k = `${d}|${s}`;
      if (!cells[k]) cells[k] = [];
      cells[k].push(t);
    }
    const rows = SESSIONS.filter(s => withTime.some(t => sessionOf(t) === s.key));
    const maxAbs = Math.max(...Object.values(cells).map(ts => Math.abs(groupStats(ts).avg)), 0.01);
    return { cells, rows, maxAbs };
  }, [withTime]);

  // ── discipline metrics ──
  const discipline = useMemo(() => {
    // group by trading day
    const byDay = new Map();
    for (const t of closed) {
      if (!byDay.has(t.date)) byDay.set(t.date, []);
      byDay.get(t.date).push(t);
    }
    const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([date, ts]) => ({ date, ...groupStats(ts) }));

    // performance the day AFTER a red day vs after a green day (tilt check)
    const afterRed = [], afterGreen = [];
    for (let i = 1; i < days.length; i++) {
      (days[i - 1].total < 0 ? afterRed : afterGreen).push(days[i].avg);
    }
    const avgOf = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    // overtrading: per-trade avg on busy days vs calm days (split at median trade count)
    const counts = days.map(d => d.count).sort((a, b) => a - b);
    const median = counts.length ? counts[Math.floor(counts.length / 2)] : 0;
    const busy = days.filter(d => d.count > median);
    const calm = days.filter(d => d.count <= median);
    const perTradeAvg = ds => {
      const all = ds.flatMap(d => [d.total]);
      const n = ds.reduce((a, d) => a + d.count, 0);
      return n ? all.reduce((a, b) => a + b, 0) / n : null;
    };

    // rules adherence
    const followed    = groupStats(closed.filter(t => t.followed_rules === true));
    const notFollowed = groupStats(closed.filter(t => t.followed_rules === false));

    return {
      dayCount: days.length,
      afterRed:   { n: afterRed.length,   avg: avgOf(afterRed) },
      afterGreen: { n: afterGreen.length, avg: avgOf(afterGreen) },
      busy: { n: busy.length, medianCount: median, avg: perTradeAvg(busy) },
      calm: { n: calm.length, avg: perTradeAvg(calm) },
      followed, notFollowed,
    };
  }, [closed]);

  // ── conclusions engine ──
  const insights = useMemo(() => {
    const list = [];
    const MIN = 3;
    const best  = (arr) => arr.filter(d => d.count >= MIN).sort((a, b) => b.avg - a.avg)[0];
    const worst = (arr) => arr.filter(d => d.count >= MIN).sort((a, b) => a.avg - b.avg)[0];
    const small = d => d && d.count < 6;

    // sessions (time of day)
    const bs = best(sessionData), ws = worst(sessionData);
    if (bs && bs.avg > 0) list.push({
      kind: 'edge', smallSample: small(bs),
      title: `הסשן החזק שלך: ${bs.label} (${bs.range})`,
      detail: `ממוצע ${fmt$(bs.avg)} לעסקה · ${bs.winRate}% win rate · ${bs.count} עסקאות · סה״כ ${fmt$(bs.total)}`,
      action: 'רכז שם את רוב הפעילות — זה חלון הזמן שבו ה-Edge שלך הכי חד',
    });
    if (ws && ws.key !== bs?.key && ws.avg < 0) list.push({
      kind: 'leak', smallSample: small(ws),
      title: `הסשן החלש שלך: ${ws.label} (${ws.range})`,
      detail: `ממוצע ${fmt$(ws.avg)} לעסקה · ${ws.winRate}% win rate · ${ws.count} עסקאות · סה״כ ${fmt$(ws.total)}`,
      action: 'שקול לא לפתוח עסקאות חדשות בחלון הזה, או לחתוך סייז בחצי',
    });

    // days
    const bd = best(dayData), wd = worst(dayData);
    if (bd && bd.avg > 0) list.push({
      kind: 'edge', smallSample: small(bd),
      title: `יום ${bd.label} הוא היום הרווחי שלך`,
      detail: `ממוצע ${fmt$(bd.avg)} לעסקה · ${bd.winRate}% win rate · ${bd.count} עסקאות`,
      action: 'תכנן את הסטאפים הכי טובים שלך ליום הזה',
    });
    if (wd && wd.key !== bd?.key && wd.avg < 0) list.push({
      kind: 'leak', smallSample: small(wd),
      title: `יום ${wd.label} עולה לך כסף`,
      detail: `ממוצע ${fmt$(wd.avg)} לעסקה · ${wd.winRate}% win rate · ${wd.count} עסקאות · סה״כ ${fmt$(wd.total)}`,
      action: 'ביום הזה — פחות עסקאות, סייז קטן יותר, או רק צפייה',
    });

    // setups
    const bst = best(setupData), wst = worst(setupData);
    if (bst && bst.avg > 0) list.push({
      kind: 'edge', smallSample: small(bst),
      title: `הסטאפ שמדפיס לך: ${bst.key}`,
      detail: `ממוצע ${fmt$(bst.avg)} לעסקה · ${bst.winRate}% win rate · ${bst.count} עסקאות`,
      action: 'זה ה-A+ סטאפ שלך — חכה לו ותן לו סייז מלא',
    });
    if (wst && wst.key !== bst?.key && wst.avg < 0) list.push({
      kind: 'leak', smallSample: small(wst),
      title: `הסטאפ שמדמם: ${wst.key}`,
      detail: `ממוצע ${fmt$(wst.avg)} לעסקה · ${wst.winRate}% win rate · ${wst.count} עסקאות · סה״כ ${fmt$(wst.total)}`,
      action: 'הפסק לסחור אותו עד שתבין למה הוא לא עובד לך',
    });

    // direction
    if (dirData.L.count >= MIN && dirData.S.count >= MIN) {
      const better = dirData.L.avg >= dirData.S.avg ? 'L' : 'S';
      const b = dirData[better], w = dirData[better === 'L' ? 'S' : 'L'];
      if (b.avg > 0 && w.avg < 0) list.push({
        kind: 'leak', smallSample: small(w),
        title: `${better === 'L' ? 'Short' : 'Long'} פוגע לך ב-P&L`,
        detail: `${better === 'L' ? 'לונג' : 'שורט'}: ממוצע ${fmt$(b.avg)} (${b.winRate}%) מול ${better === 'L' ? 'שורט' : 'לונג'}: ${fmt$(w.avg)} (${w.winRate}%)`,
        action: `התמקד ב-${better === 'L' ? 'Long' : 'Short'} — שם ה-Edge שלך`,
      });
    }

    // tickers
    const bt = best(tickerData), wt = worst(tickerData);
    if (bt && bt.avg > 0) list.push({
      kind: 'edge', smallSample: small(bt),
      title: `${bt.key} — הטיקר שהכי עובד לך`,
      detail: `סה״כ ${fmt$(bt.total)} · ממוצע ${fmt$(bt.avg)} · ${bt.winRate}% win rate · ${bt.count} עסקאות`,
    });
    if (wt && wt.key !== bt?.key && wt.total < 0 && wt.count >= MIN) list.push({
      kind: 'leak', smallSample: small(wt),
      title: `${wt.key} — הטיקר שהכי מפסיד לך`,
      detail: `סה״כ ${fmt$(wt.total)} · ממוצע ${fmt$(wt.avg)} · ${wt.winRate}% win rate · ${wt.count} עסקאות`,
      action: 'אולי המניה הזאת פשוט לא מתאימה לסגנון שלך',
    });

    // rules
    const { followed, notFollowed } = discipline;
    if (followed.count >= MIN && notFollowed.count >= MIN && followed.avg > notFollowed.avg) {
      list.push({
        kind: 'warn',
        title: 'משמעת = כסף',
        detail: `כשעקבת אחרי הכללים: ${fmt$(followed.avg)} לעסקה (${followed.winRate}%). כשלא: ${fmt$(notFollowed.avg)} (${notFollowed.winRate}%). הפער: ${fmt$(followed.avg - notFollowed.avg)} לעסקה.`,
        action: 'כל עסקה מחוץ לתוכנית עולה לך כסף אמיתי',
      });
    }

    // tilt — day after a red day
    const { afterRed, afterGreen } = discipline;
    if (afterRed.n >= MIN && afterGreen.n >= MIN && afterRed.avg != null && afterRed.avg < 0 && afterRed.avg < (afterGreen.avg ?? 0)) {
      list.push({
        kind: 'warn',
        title: 'זהירות מטילט אחרי יום אדום',
        detail: `ביום שאחרי יום הפסד הממוצע שלך לעסקה הוא ${fmt$(afterRed.avg)} (${afterRed.n} ימים), לעומת ${fmt$(afterGreen.avg ?? 0)} אחרי יום ירוק.`,
        action: 'אחרי יום אדום — התחל את היום בסייז מוקטן עד ווין ראשון',
      });
    }

    // overtrading
    const { busy, calm } = discipline;
    if (busy.n >= MIN && calm.n >= MIN && busy.avg != null && calm.avg != null && busy.avg < calm.avg && busy.avg < 0) {
      list.push({
        kind: 'warn',
        title: 'ימים עמוסים = תוצאות חלשות',
        detail: `בימים עם יותר מ-${busy.medianCount} עסקאות הממוצע לעסקה הוא ${fmt$(busy.avg)}, לעומת ${fmt$(calm.avg)} בימים רגועים.`,
        action: 'קבע מגבלת עסקאות יומית — אחרי שהגעת אליה, סגור את הפלטפורמה',
      });
    }

    // sort: edges → leaks → warnings
    const order = { edge: 0, leak: 1, warn: 2 };
    return list.sort((a, b) => order[a.kind] - order[b.kind]);
  }, [sessionData, dayData, setupData, dirData, tickerData, discipline]);

  const TF_BTNS = ['1M', '3M', 'YTD', 'ALL'];

  if (!closed.length) return (
    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-faint)' }}>
      <Crosshair size={36} style={{ marginBottom: 12, opacity: 0.35 }} />
      <div style={{ fontSize: 15 }}>אין עסקאות לניתוח Edge</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>הוסף עסקאות או הרץ Sync מ-IBKR</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Crosshair size={18} /> Edge Lab
          </div>
          <div dir="rtl" style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2, textAlign: 'left' }}>
            {closed.length} עסקאות · {withTime.length} עם שעת ביצוע
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {TF_BTNS.map(t => (
            <button key={t} onClick={() => setTf(t)} style={{
              fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: tf === t ? 'var(--navy)' : 'var(--bg-card)',
              color: tf === t ? '#fff' : 'var(--text-muted)',
              fontWeight: tf === t ? 600 : 400, fontFamily: 'inherit',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Conclusions */}
      <Panel icon={Lightbulb} title="המסקנות שלך" sub="מחושב אוטומטית מהעסקאות — מינימום 3 עסקאות למסקנה">
        {insights.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {insights.map((ins, i) => <InsightCard key={i} ins={ins} />)}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-faint)', padding: '10px 0' }}>
            עדיין אין מספיק נתונים למסקנות מובהקות — המשך לתעד, המסקנות יופיעו אוטומטית
          </div>
        )}
      </Panel>

      {/* Hour of day */}
      <Panel icon={Clock} title="ממוצע P&L לפי שעת ביצוע" sub="שעון ניו-יורק (שעת סגירת העסקה)">
        {withTime.length ? (
          <>
            <EdgeBars data={hourData} />
            {/* Session cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginTop: 14 }}>
              {sessionData.map(s => (
                <div key={s.key} style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 12px', borderTop: `3px solid ${s.avg >= 0 ? 'var(--green)' : 'var(--red)'}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{s.label}</div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-faint)' }}>{s.range}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: s.avg >= 0 ? 'var(--green)' : 'var(--red)', marginTop: 4 }} className="amount">{fmt$(s.avg)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{s.count}× · {s.winRate}% win</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div dir="rtl" style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 8, padding: '14px 16px', lineHeight: 1.7, textAlign: 'right' }}>
            ⏱ אין עדיין נתוני שעת ביצוע. לחץ <b>Sync</b> למעלה — מעכשיו כל עסקה מ-IBKR נשמרת עם שעת הביצוע,
            וה-sync גם ישלים שעות לעסקאות קיימות שעדיין מופיעות בדוח. לעסקאות ידניות אפשר להזין שעה בטופס.
          </div>
        )}
      </Panel>

      {/* Day of week + Day×Session heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: heatGrid ? '1fr 1fr' : '1fr', gap: 16 }}>
        <Panel icon={Calendar} title="ממוצע P&L לפי יום בשבוע">
          <EdgeBars data={dayData} width={440} />
        </Panel>

        {heatGrid && (
          <Panel icon={Crosshair} title="מפת חום: יום × סשן" sub="ממוצע לעסקה בכל משבצת">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 3, width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600, textAlign: 'right', padding: 4 }}>סשן</th>
                    {TRADING_DAYS.map(d => (
                      <th key={d} style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600, padding: 4 }}>{DAY_NAMES[d]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatGrid.rows.map(s => (
                    <tr key={s.key}>
                      <td style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 6px', whiteSpace: 'nowrap' }}>{s.label}</td>
                      {TRADING_DAYS.map(d => {
                        const ts = heatGrid.cells[`${d}|${s.key}`];
                        if (!ts) return <td key={d} style={{ background: 'var(--bg-card)', borderRadius: 6, minWidth: 52, height: 40 }} />;
                        const st = groupStats(ts);
                        const intensity = 0.12 + Math.min(Math.abs(st.avg) / heatGrid.maxAbs, 1) * 0.5;
                        const bg = st.avg >= 0 ? `rgba(22,163,74,${intensity})` : `rgba(220,38,38,${intensity})`;
                        return (
                          <td key={d} style={{ background: bg, borderRadius: 6, textAlign: 'center', minWidth: 52, height: 40, padding: 2 }}>
                            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text)' }} className="amount">{fmt$(st.avg)}</div>
                            <div style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>{st.count}×</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      {/* Long vs Short + Discipline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <Panel icon={TrendingUp} title="Long מול Short">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[{ d: dirData.L, label: 'Long', icon: <ArrowUp size={13} />, color: 'var(--green)' }, { d: dirData.S, label: 'Short', icon: <ArrowDown size={13} />, color: 'var(--red)' }].map(({ d, label, icon, color }) => (
              <div key={label} style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color, display: 'flex', alignItems: 'center', gap: 5 }}>{icon} {label}</div>
                {d.count ? (
                  <div dir="rtl" style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'right' }}>
                    <div><b style={{ fontSize: 16, color: d.avg >= 0 ? 'var(--green)' : 'var(--red)' }} className="amount">{fmt$(d.avg)}</b> ממוצע לעסקה</div>
                    <div>{d.winRate}% win rate · {d.count} עסקאות</div>
                    <div>סה״כ <span className="amount" style={{ fontWeight: 700, color: d.total >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt$(d.total)}</span></div>
                  </div>
                ) : <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 8 }}>אין עסקאות</div>}
              </div>
            ))}
          </div>
        </Panel>

        <Panel icon={Shield} title="משמעת ומצב מנטלי">
          <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
            {discipline.afterRed.n >= 2 && discipline.afterRed.avg != null && (
              <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 12px' }}>
                <b style={{ color: 'var(--text)' }}>יום אחרי יום אדום:</b>{' '}
                ממוצע <span className="amount" style={{ fontWeight: 700, color: discipline.afterRed.avg >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt$(discipline.afterRed.avg)}</span> לעסקה
                {discipline.afterGreen.avg != null && <> · אחרי יום ירוק: <span className="amount" style={{ fontWeight: 700, color: discipline.afterGreen.avg >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt$(discipline.afterGreen.avg)}</span></>}
              </div>
            )}
            {discipline.busy.avg != null && discipline.calm.avg != null && (
              <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 12px' }}>
                <b style={{ color: 'var(--text)' }}>עומס:</b>{' '}
                בימים עמוסים (&gt;{discipline.busy.medianCount} עסק׳) ממוצע <span className="amount" style={{ fontWeight: 700, color: discipline.busy.avg >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt$(discipline.busy.avg)}</span>,
                בימים רגועים <span className="amount" style={{ fontWeight: 700, color: discipline.calm.avg >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt$(discipline.calm.avg)}</span>
              </div>
            )}
            {discipline.followed.count > 0 && (
              <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 12px' }}>
                <b style={{ color: 'var(--text)' }}>עמידה בכללים:</b>{' '}
                עם כללים <span className="amount" style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt$(discipline.followed.avg)}</span> ({discipline.followed.count})
                {discipline.notFollowed.count > 0 && <> · בלי <span className="amount" style={{ fontWeight: 700, color: 'var(--red)' }}>{fmt$(discipline.notFollowed.avg)}</span> ({discipline.notFollowed.count})</>}
              </div>
            )}
            {discipline.afterRed.n < 2 && discipline.busy.avg == null && !discipline.followed.count && (
              <div style={{ color: 'var(--text-faint)' }}>אין מספיק נתונים עדיין — סמן ״עקבתי אחרי הכללים״ בעסקאות כדי לקבל ניתוח משמעת</div>
            )}
          </div>
        </Panel>
      </div>

      {/* Tickers */}
      <Panel icon={TrendingUp} title="ביצועים לפי טיקר" sub={`${tickerData.length} טיקרים`}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card)' }}>
                {['Ticker', 'עסקאות', 'Win%', 'ממוצע', 'סה״כ P&L'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Ticker' ? 'left' : 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickerData.slice(0, 12).map(t => (
                <tr key={t.key} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t.key}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12 }}>{t.count}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: t.winRate >= 50 ? 'var(--green)' : 'var(--red)' }}>{t.winRate}%</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: t.avg >= 0 ? 'var(--green)' : 'var(--red)' }} className="amount">{fmt$(t.avg)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: t.total >= 0 ? 'var(--green)' : 'var(--red)' }} className="amount">{fmt$(t.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickerData.length > 12 && <div style={{ fontSize: 11, color: 'var(--text-faint)', padding: '8px 10px' }}>מציג 12 מובילים מתוך {tickerData.length}</div>}
        </div>
      </Panel>

    </div>
  );
}
