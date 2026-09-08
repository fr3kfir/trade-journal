import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarRange, Trophy, Skull, ListChecks } from 'lucide-react';
import MiniChart from './MiniChart';
import TradesTable from './TradesTable';

const MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
const QUARTER_MONTHS = { 1: [0, 1, 2], 2: [3, 4, 5], 3: [6, 7, 8], 4: [9, 10, 11] };
const DOW_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function netPnl(t) {
  return parseFloat(t.pnl) - (parseFloat(t.commission) || 0);
}

function fmt$(v) {
  return `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`;
}

function Stat({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div className="amount" style={{ fontSize: 20, fontWeight: 800, color: color || 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{sub}</div>}
    </div>
  );
}

function MiniMonthCalendar({ year, month, dayMap }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  let monthPnl = 0, monthTrades = 0, greenDays = 0, tradingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const data = dayMap[key];
    if (data) {
      monthPnl += data.pnl;
      monthTrades += data.count;
      tradingDays++;
      if (data.pnl > 0) greenDays++;
    }
  }

  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', flex: '1 1 220px', minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{MONTH_NAMES[month]}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: monthPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{monthTrades ? fmt$(monthPnl) : '—'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
        {DOW_LABELS.map((d, i) => (
          <div key={i} style={{ fontSize: 9, textAlign: 'center', color: 'var(--text-faint)' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((d, i) => {
          if (d == null) return <div key={i} />;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const data = dayMap[key];
          const isGreen = data && data.pnl > 0;
          const isRed = data && data.pnl < 0;
          return (
            <div
              key={i}
              title={data ? `${key}: ${fmt$(data.pnl)} (${data.count} עסקאות)` : key}
              style={{
                aspectRatio: '1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: data ? 700 : 400,
                background: isGreen ? 'rgba(52,211,153,0.25)' : isRed ? 'rgba(248,113,113,0.25)' : 'var(--bg-card)',
                color: isGreen ? 'var(--green)' : isRed ? 'var(--red)' : 'var(--text-faint)',
              }}
            >
              {d}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 6 }}>
        {tradingDays ? `${greenDays}/${tradingDays} ימים ירוקים • ${monthTrades} עסקאות` : 'אין עסקאות'}
      </div>
    </div>
  );
}

function HighlightCard({ trade, positive }) {
  const pnl = netPnl(trade);
  const notes = (trade.notes || '').trim();
  return (
    <div style={{ background: 'var(--navy)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: '1 1 260px', minWidth: 240 }}>
      <MiniChart trade={trade} height={110} theme="dark" />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '0.03em' }}>{trade.ticker}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: positive ? '#4ade80' : '#f87171' }}>{fmt$(pnl)}</span>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{trade.date}{trade.setup ? ` • ${trade.setup}` : ''}</div>
        {notes ? (
          <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {notes.length > 220 ? notes.slice(0, 220) + '…' : notes}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>אין הערות לעסקה זו</div>
        )}
      </div>
    </div>
  );
}

export default function QuarterlyReview({ trades, onUpdate, onDelete }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);

  const prevQuarter = () => {
    if (quarter === 1) { setQuarter(4); setYear(y => y - 1); }
    else setQuarter(q => q - 1);
  };
  const nextQuarter = () => {
    if (quarter === 4) { setQuarter(1); setYear(y => y + 1); }
    else setQuarter(q => q + 1);
  };

  const dayMap = useMemo(() => {
    const map = {};
    trades.forEach(t => {
      if (!t.date || t.pnl == null) return;
      const key = t.date.slice(0, 10);
      if (!map[key]) map[key] = { pnl: 0, count: 0 };
      map[key].pnl += parseFloat(t.pnl);
      map[key].count += 1;
    });
    return map;
  }, [trades]);

  const quarterTrades = useMemo(() => {
    const months = QUARTER_MONTHS[quarter];
    return trades
      .filter(t => t.pnl != null && t.date)
      .filter(t => {
        const d = new Date(t.date);
        return d.getFullYear() === year && months.includes(d.getMonth());
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [trades, year, quarter]);

  const stats = useMemo(() => {
    const pnls = quarterTrades.map(netPnl);
    const wins = quarterTrades.filter(t => netPnl(t) > 0);
    const losses = quarterTrades.filter(t => netPnl(t) < 0);
    const total = pnls.reduce((a, b) => a + b, 0);
    const winRate = quarterTrades.length ? (wins.length / quarterTrades.length * 100).toFixed(1) : '0.0';
    const avgWin = wins.length ? wins.reduce((a, t) => a + netPnl(t), 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((a, t) => a + netPnl(t), 0) / losses.length) : 0;
    const rVals = quarterTrades.filter(t => t.r_value != null && t.r_value !== '').map(t => parseFloat(t.r_value)).filter(v => !isNaN(v));
    const avgR = rVals.length ? (rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(2) : null;
    const sorted = [...quarterTrades].sort((a, b) => netPnl(b) - netPnl(a));
    return {
      total, count: quarterTrades.length, wins: wins.length, losses: losses.length, winRate, avgWin, avgLoss, avgR,
      bestTrade: sorted[0] || null,
      worstTrade: sorted[sorted.length - 1] || null,
    };
  }, [quarterTrades]);

  const topWinners = useMemo(() => quarterTrades.filter(t => netPnl(t) > 0).sort((a, b) => netPnl(b) - netPnl(a)).slice(0, 3), [quarterTrades]);
  const topLosers = useMemo(() => quarterTrades.filter(t => netPnl(t) < 0).sort((a, b) => netPnl(a) - netPnl(b)).slice(0, 3), [quarterTrades]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header + quarter nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarRange size={18} color="var(--navy)" />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>סיכום רבעוני</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevQuarter} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', minWidth: 90, textAlign: 'center' }}>Q{quarter} {year}</span>
          <button onClick={nextQuarter} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {quarterTrades.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)' }}>
          <CalendarRange size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: 14 }}>אין עסקאות סגורות ברבעון Q{quarter} {year}</div>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            <Stat label="Net P&L" value={fmt$(stats.total)} color={stats.total >= 0 ? 'var(--green)' : 'var(--red)'} sub={`${stats.count} עסקאות`} />
            <Stat label="Win Rate" value={`${stats.winRate}%`} color={parseFloat(stats.winRate) >= 50 ? 'var(--green)' : 'var(--red)'} sub={`${stats.wins}W / ${stats.losses}L`} />
            <Stat label="Avg R" value={stats.avgR ? `${stats.avgR >= 0 ? '+' : ''}${stats.avgR}R` : '—'} color="var(--navy)" />
            <Stat label="Avg Win" value={fmt$(stats.avgWin)} color="var(--green)" />
            <Stat label="Avg Loss" value={fmt$(-stats.avgLoss)} color="var(--red)" />
            <Stat label="הרווח הגדול ביותר" value={stats.bestTrade ? fmt$(netPnl(stats.bestTrade)) : '—'} color="var(--green)" sub={stats.bestTrade?.ticker} />
            <Stat label="ההפסד הגדול ביותר" value={stats.worstTrade ? fmt$(netPnl(stats.worstTrade)) : '—'} color="var(--red)" sub={stats.worstTrade?.ticker} />
          </div>

          {/* 3-month calendar strip */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {QUARTER_MONTHS[quarter].map(m => (
              <MiniMonthCalendar key={m} year={year} month={m} dayMap={dayMap} />
            ))}
          </div>

          {/* Highlights — top winners / top losers */}
          {(topWinners.length > 0 || topLosers.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topWinners.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Trophy size={14} color="var(--green)" /> העסקאות המוצלחות ביותר
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {topWinners.map(t => <HighlightCard key={t.id} trade={t} positive />)}
                  </div>
                </div>
              )}
              {topLosers.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Skull size={14} color="var(--red)" /> העסקאות הגרועות ביותר
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {topLosers.map(t => <HighlightCard key={t.id} trade={t} positive={false} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full trade list for the quarter */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ListChecks size={14} /> כל העסקאות ברבעון ({quarterTrades.length})
            </div>
            <div className="table-scroll">
              <TradesTable trades={[...quarterTrades].reverse()} onUpdate={onUpdate} onDelete={onDelete} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
