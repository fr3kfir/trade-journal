import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmt(n) {
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  const s = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(2)}`;
  return (n > 0 ? '+' : '-') + s;
}

function fmtFull(n) {
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  const s = `$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (n > 0 ? '+' : '-') + s;
}

function Stars({ value }) {
  if (!value) return null;
  return (
    <span style={{ color: '#f59e0b', fontSize: 13 }}>
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </span>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function DayModal({ dateStr, trades, allTradingDates, onClose, onNavigate }) {
  const date = new Date(dateStr + 'T00:00:00');
  const label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const totalPnl = trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
  const wins = trades.filter(t => parseFloat(t.pnl) > 0).length;
  const losses = trades.filter(t => parseFloat(t.pnl) < 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : 0;

  const sortedDates = [...allTradingDates].sort();
  const idx = sortedDates.indexOf(dateStr);
  const prevDate = idx > 0 ? sortedDates[idx - 1] : null;
  const nextDate = idx < sortedDates.length - 1 ? sortedDates[idx + 1] : null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 16, border: '1px solid var(--border)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.35)', width: '100%', maxWidth: 640,
        maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 22px 0', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                {trades.length} {trades.length === 1 ? 'trade' : 'trades'}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Day summary bar */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10, background: 'var(--bg-card)', borderRadius: 10, padding: '14px 16px', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Day P&L</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {fmtFull(totalPnl)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Win Rate</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: winRate >= 50 ? 'var(--green)' : 'var(--red)' }}>{winRate}%</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Wins</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{wins}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Losses</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: losses > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{losses}</span>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--border)', marginLeft: -22, marginRight: -22 }} />
        </div>

        {/* Trade list */}
        <div style={{ overflowY: 'auto', padding: '14px 22px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {trades.map((t, i) => {
            const pnl = parseFloat(t.pnl) || 0;
            const r = t.r_value != null ? parseFloat(t.r_value) : null;
            const isWin = pnl > 0;
            const isLoss = pnl < 0;
            return (
              <div
                key={t.id || i}
                style={{
                  background: 'var(--bg-card)', borderRadius: 12,
                  border: `1px solid ${isWin ? 'rgba(52,211,153,0.3)' : isLoss ? 'rgba(248,113,113,0.3)' : 'var(--border)'}`,
                  borderLeft: `4px solid ${isWin ? 'var(--green)' : isLoss ? 'var(--red)' : 'var(--border)'}`,
                  padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
                }}
              >
                {/* Top row: ticker + direction + P&L */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isWin ? <TrendingUp size={16} color="var(--green)" /> : isLoss ? <TrendingDown size={16} color="var(--red)" /> : null}
                    <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.02em' }}>
                      {t.ticker}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
                    background: t.direction === 'L' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                    color: t.direction === 'L' ? 'var(--green)' : 'var(--red)',
                  }}>
                    {t.direction === 'L' ? 'LONG' : 'SHORT'}
                  </span>
                  {t.setup && (
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 8px' }}>
                      {t.setup}
                    </span>
                  )}
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                      {fmtFull(pnl)}
                    </div>
                    {r != null && (
                      <div style={{ fontSize: 12, color: r >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        {r >= 0 ? '+' : ''}{r.toFixed(2)}R
                      </div>
                    )}
                  </div>
                </div>

                {/* Entry / Exit / Stop / Shares */}
                {(t.entry || t.exit || t.stop || t.quantity) && (
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                    {t.entry && <Stat label="Entry" value={`$${parseFloat(t.entry).toFixed(2)}`} />}
                    {t.exit && <Stat label="Exit" value={`$${parseFloat(t.exit).toFixed(2)}`} />}
                    {t.stop && <Stat label="Stop" value={`$${parseFloat(t.stop).toFixed(2)}`} />}
                    {t.quantity && <Stat label="Shares" value={t.quantity} />}
                    {t.commission && <Stat label="Commission" value={`$${parseFloat(t.commission).toFixed(2)}`} />}
                  </div>
                )}

                {/* Scores + Rules */}
                {(t.execution_score || t.followed_rules != null) && (
                  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    {t.execution_score && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Execution</span>
                        <Stars value={t.execution_score} />
                      </div>
                    )}
                    {t.followed_rules != null && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rules</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: t.followed_rules ? 'var(--green)' : 'var(--red)' }}>
                          {t.followed_rules ? '✓ Followed' : '✗ Broke rules'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {t.notes && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 8, lineHeight: 1.6 }}>
                    {t.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Navigation footer */}
        {(prevDate || nextDate) && (
          <div style={{
            borderTop: '1px solid var(--border)', padding: '12px 22px',
            display: 'flex', justifyContent: 'space-between', flexShrink: 0,
            background: 'var(--bg)',
          }}>
            {prevDate ? (
              <button
                onClick={() => onNavigate(prevDate)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ChevronLeft size={14} /> {prevDate}
              </button>
            ) : <div />}
            {nextDate ? (
              <button
                onClick={() => onNavigate(nextDate)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {nextDate} <ChevronRight size={14} />
              </button>
            ) : <div />}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarView({ trades }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  const { dayMap, tradesByDay, allTradingDates } = useMemo(() => {
    const map = {};
    const byDay = {};
    trades.forEach(t => {
      if (!t.date || t.pnl == null) return;
      const key = t.date.slice(0, 10);
      if (!map[key]) map[key] = { pnl: 0, count: 0 };
      map[key].pnl += parseFloat(t.pnl);
      map[key].count += 1;
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(t);
    });
    return { dayMap: map, tradesByDay: byDay, allTradingDates: Object.keys(map) };
  }, [trades]);

  const { weeks, monthlyPnl, monthlyTrades, monthlyWins } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, current: false });
    }

    let totalPnl = 0, totalTrades = 0, totalWins = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const data = dayMap[dateStr];
      if (data) {
        totalPnl += data.pnl;
        totalTrades += data.count;
        if (data.pnl > 0) totalWins++;
      }
      cells.push({ day: d, dateStr, current: true, data });
    }

    const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, current: false });
    }

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      const week = cells.slice(i, i + 7);
      const weekPnl = week.filter(c => c.current && c.data).reduce((s, c) => s + c.data.pnl, 0);
      const weekCount = week.filter(c => c.current && c.data).reduce((s, c) => s + c.data.count, 0);
      weeks.push({ cells: week, pnl: weekPnl, count: weekCount });
    }

    return { weeks, monthlyPnl: totalPnl, monthlyTrades: totalTrades, monthlyWins: totalWins };
  }, [year, month, dayMap]);

  const tradingDaysInMonth = useMemo(() => {
    return Object.keys(dayMap).filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length;
  }, [dayMap, year, month]);

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 12, border: '1px solid var(--border)',
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: 'var(--shadow)', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prev} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', minWidth: 160 }}>
            {MONTH_NAMES[month]}, {year}
          </span>
          <button onClick={next} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Month summary pills */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Monthly P&L</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: monthlyPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtFull(monthlyPnl)}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Trading Days</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{tradingDaysInMonth}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Total Trades</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{monthlyTrades}</div>
          </div>
          {tradingDaysInMonth > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Green Days</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: monthlyWins > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                {monthlyWins}/{tradingDaysInMonth}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 12, border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)', overflow: 'hidden',
      }}>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 110px', borderBottom: '1px solid var(--border)' }}>
          {DAY_LABELS.map(d => (
            <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', background: 'var(--bg)' }}>
              {d}
            </div>
          ))}
          <div style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', background: 'var(--bg)', borderLeft: '1px solid var(--border)' }}>
            Total
          </div>
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 110px', borderBottom: wi < weeks.length - 1 ? '1px solid var(--border)' : 'none' }}>
            {week.cells.map((cell, di) => {
              const isToday = cell.dateStr === todayStr;
              const hasTrades = cell.current && cell.data;
              const pnl = hasTrades ? cell.data.pnl : 0;
              const count = hasTrades ? cell.data.count : 0;
              const isGreen = pnl > 0;
              const isRed = pnl < 0;

              return (
                <div
                  key={di}
                  onClick={hasTrades ? () => setSelectedDate(cell.dateStr) : undefined}
                  style={{
                    minHeight: 84, padding: '10px 12px',
                    borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                    borderLeft: hasTrades ? `3px solid ${isGreen ? 'var(--green)' : isRed ? 'var(--red)' : 'var(--border)'}` : undefined,
                    background: !cell.current
                      ? 'var(--bg)'
                      : isToday
                      ? 'rgba(59,130,246,0.06)'
                      : hasTrades
                      ? isGreen ? 'rgba(52,211,153,0.04)' : 'rgba(248,113,113,0.04)'
                      : 'var(--bg-panel)',
                    display: 'flex', flexDirection: 'column', gap: 4,
                    position: 'relative',
                    cursor: hasTrades ? 'pointer' : 'default',
                    transition: 'background 0.12s, transform 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (hasTrades) {
                      e.currentTarget.style.background = isGreen ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (hasTrades) {
                      e.currentTarget.style.background = isGreen ? 'rgba(52,211,153,0.04)' : 'rgba(248,113,113,0.04)';
                    }
                  }}
                >
                  {/* Day number + click hint */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                      fontSize: 13, fontWeight: isToday ? 700 : 500,
                      color: isToday ? 'var(--navy)' : cell.current ? 'var(--text)' : 'var(--text-faint)',
                      lineHeight: 1,
                    }}>
                      {isToday ? (
                        <span style={{ background: 'var(--navy)', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                          {cell.day}
                        </span>
                      ) : cell.day}
                    </div>
                    {hasTrades && (
                      <ArrowRight size={11} color={isGreen ? 'var(--green)' : 'var(--red)'} style={{ opacity: 0.6 }} />
                    )}
                  </div>

                  {/* P&L + trade count */}
                  {hasTrades ? (
                    <>
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        color: isGreen ? 'var(--green)' : isRed ? 'var(--red)' : 'var(--text-muted)',
                        marginTop: 'auto',
                      }}>
                        {fmt(pnl)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                        {count} {count === 1 ? 'trade' : 'trades'}
                      </div>
                    </>
                  ) : cell.current ? (
                    <div style={{ marginTop: 'auto', fontSize: 11, color: 'var(--text-faint)' }}>—</div>
                  ) : null}
                </div>
              );
            })}

            {/* Weekly total */}
            <div style={{
              minHeight: 84, padding: '10px 14px',
              borderLeft: '1px solid var(--border)',
              background: 'var(--bg)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Week {wi + 1}
              </div>
              {week.count > 0 ? (
                <>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: week.pnl > 0 ? 'var(--green)' : week.pnl < 0 ? 'var(--red)' : 'var(--text-muted)',
                  }}>
                    {fmt(week.pnl)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                    {week.count} {week.count === 1 ? 'trade' : 'trades'}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>—</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Day detail modal */}
      {selectedDate && tradesByDay[selectedDate] && (
        <DayModal
          dateStr={selectedDate}
          trades={tradesByDay[selectedDate]}
          allTradingDates={allTradingDates}
          onClose={() => setSelectedDate(null)}
          onNavigate={setSelectedDate}
        />
      )}
    </div>
  );
}
