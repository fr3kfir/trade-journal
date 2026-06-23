import { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmt(n) {
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  const s = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(0)}`;
  return (n > 0 ? '+' : '-') + s;
}

function fmtFull(n) {
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  const s = `$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (n > 0 ? '+' : '-') + s;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function DayModal({ date, trades, onClose }) {
  const dayTrades = trades
    .filter(t => t.date?.slice(0, 10) === date && t.pnl != null)
    .sort((a, b) => (parseFloat(b.pnl) - parseFloat(a.pnl)));

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (dayTrades.length === 0) return null;

  const totalPnl = dayTrades.reduce((s, t) => s + parseFloat(t.pnl), 0);
  const wins = dayTrades.filter(t => parseFloat(t.pnl) > 0).length;

  // Format display date e.g. "Monday, June 15, 2026"
  const displayDate = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      <div className="modal" style={{ maxWidth: 600, width: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{displayDate}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 12 }}>
              <span>{dayTrades.length} עסקאות</span>
              <span style={{ color: wins === dayTrades.length ? 'var(--green)' : wins === 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                {wins}W / {dayTrades.length - wins}L
              </span>
              <span style={{ fontWeight: 700, color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toFixed(2)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '0 4px' }}
          >×</button>
        </div>

        {/* Trade list */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dayTrades.map((trade, i) => {
            const pnl = parseFloat(trade.pnl);
            const rVal = trade.r_value != null ? parseFloat(trade.r_value) : null;
            return (
              <div key={trade.id || i} style={{
                background: 'var(--bg-card)',
                border: `1px solid ${pnl > 0 ? 'rgba(52,211,153,0.25)' : pnl < 0 ? 'rgba(248,113,113,0.25)' : 'var(--border)'}`,
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              }}>
                {/* Left strip */}
                <div style={{
                  width: 3, alignSelf: 'stretch', borderRadius: 2, flexShrink: 0,
                  background: pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--border)',
                  minHeight: 36,
                }} />

                {/* Ticker + direction */}
                <div style={{ minWidth: 80 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{trade.ticker}</span>
                  <span className={`badge ${trade.direction === 'L' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 9, marginLeft: 6 }}>
                    {trade.direction === 'L' ? 'Long' : 'Short'}
                  </span>
                </div>

                {/* Entry / Exit */}
                <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                  {trade.entry != null && (
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>כניסה</div>
                      <div style={{ fontWeight: 600, color: 'var(--green)' }}>${parseFloat(trade.entry).toFixed(2)}</div>
                    </div>
                  )}
                  {trade.exit != null && (
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>יציאה</div>
                      <div style={{ fontWeight: 600, color: 'var(--red)' }}>${parseFloat(trade.exit).toFixed(2)}</div>
                    </div>
                  )}
                  {trade.stop != null && (
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>סטופ</div>
                      <div style={{ fontWeight: 600, color: '#f59e0b' }}>${parseFloat(trade.stop).toFixed(2)}</div>
                    </div>
                  )}
                  {trade.quantity != null && (
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--text-faint)' }}>כמות</div>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{trade.quantity}</div>
                    </div>
                  )}
                </div>

                {/* PnL + R */}
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--text-muted)' }} className="amount">
                    {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                  </div>
                  {rVal != null && (
                    <div style={{ fontSize: 11, color: rVal >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                      {rVal >= 0 ? '+' : ''}{rVal.toFixed(2)}R
                    </div>
                  )}
                </div>

                {/* Setup */}
                {trade.setup && (
                  <span style={{ fontSize: 10, color: 'var(--text-faint)', background: 'var(--bg-panel)', padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border)' }}>
                    {trade.setup}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CalendarView({ trades }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const isMobile = useIsMobile();

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

  const { weeks, monthlyPnl } = useMemo(() => {
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

    let totalPnl = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const data = dayMap[dateStr];
      if (data) totalPnl += data.pnl;
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

    return { weeks, monthlyPnl: totalPnl };
  }, [year, month, dayMap]);

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  // On mobile: no "Total" column, 7 equal cols
  const gridCols = isMobile ? 'repeat(7, 1fr)' : 'repeat(7, 1fr) 90px';
  const cellMinH = isMobile ? 52 : 80;
  const cellPad = isMobile ? '6px 4px' : '10px 12px';
  const dayFontSize = isMobile ? 11 : 13;
  const pnlFontSize = isMobile ? 11 : 13;
  const tradeFontSize = isMobile ? 9 : 11;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 12, border: '1px solid var(--border)',
        padding: isMobile ? '12px 14px' : '16px 20px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        boxShadow: 'var(--shadow)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prev} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: 'var(--text)', minWidth: isMobile ? 120 : 160, textAlign: 'center' }}>
            {isMobile ? `${MONTH_NAMES[month].slice(0, 3)} ${year}` : `${MONTH_NAMES[month]}, ${year}`}
          </span>
          <button onClick={next} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Monthly P&L</div>
          <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: monthlyPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fmtFull(monthlyPnl)}
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 12, border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)', overflow: 'hidden',
      }}>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '1px solid var(--border)' }}>
          {(isMobile ? DAY_LABELS_SHORT : DAY_LABELS).map((d, i) => (
            <div key={i} style={{ padding: isMobile ? '8px 0' : '10px 0', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', background: 'var(--bg)' }}>
              {d}
            </div>
          ))}
          {!isMobile && (
            <div style={{ padding: '10px 0', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em', background: 'var(--bg)', borderLeft: '1px solid var(--border)' }}>
              Total
            </div>
          )}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi}>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '1px solid var(--border)' }}>
              {/* Day cells */}
              {week.cells.map((cell, di) => {
                const isToday = cell.dateStr === todayStr;
                const hasTrades = cell.current && cell.data;
                const pnl = hasTrades ? cell.data.pnl : 0;
                const count = hasTrades ? cell.data.count : 0;

                return (
                  <div
                    key={di}
                    onClick={hasTrades ? () => setSelectedDate(cell.dateStr) : undefined}
                    onMouseEnter={hasTrades ? e => { e.currentTarget.style.outline = '2px solid var(--navy)'; e.currentTarget.style.zIndex = '1'; } : undefined}
                    onMouseLeave={hasTrades ? e => { e.currentTarget.style.outline = 'none'; e.currentTarget.style.zIndex = '0'; } : undefined}
                    style={{
                      minHeight: cellMinH, padding: cellPad,
                      borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                      background: !cell.current ? 'var(--bg)' : isToday ? '#EFF6FF' : 'var(--bg-panel)',
                      display: 'flex', flexDirection: 'column', gap: 2,
                      position: 'relative', overflow: 'hidden',
                      cursor: hasTrades ? 'pointer' : 'default',
                    }}
                  >
                    <div style={{
                      fontSize: dayFontSize, fontWeight: isToday ? 700 : 500,
                      color: isToday ? 'var(--navy)' : cell.current ? 'var(--text)' : 'var(--text-faint)',
                      lineHeight: 1,
                    }}>
                      {cell.day}
                    </div>

                    {hasTrades ? (
                      <>
                        <div style={{
                          fontSize: pnlFontSize, fontWeight: 600,
                          color: pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--text-muted)',
                          marginTop: 'auto', lineHeight: 1.2,
                        }}>
                          {fmt(pnl)}
                        </div>
                        {!isMobile && (
                          <div style={{ fontSize: tradeFontSize, color: 'var(--text-faint)' }}>
                            {count} {count === 1 ? 'trade' : 'trades'}
                          </div>
                        )}
                        {isMobile && (
                          <div style={{ fontSize: tradeFontSize, color: 'var(--text-faint)', lineHeight: 1 }}>
                            {count}t
                          </div>
                        )}
                      </>
                    ) : cell.current ? (
                      <div style={{ marginTop: 'auto', fontSize: tradeFontSize, color: 'var(--text-faint)' }}>—</div>
                    ) : null}
                  </div>
                );
              })}

              {/* Weekly total - desktop only */}
              {!isMobile && (
                <div style={{
                  minHeight: cellMinH, padding: '10px 14px',
                  borderLeft: '1px solid var(--border)',
                  background: 'var(--bg)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Wk {wi + 1}
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
              )}
            </div>

            {/* Mobile: weekly summary row */}
            {isMobile && (
              <div style={{
                padding: '6px 12px',
                background: 'var(--bg)',
                borderBottom: wi < weeks.length - 1 ? '2px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Week {wi + 1}
                </span>
                {week.count > 0 ? (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: week.pnl > 0 ? 'var(--green)' : week.pnl < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                      {fmt(week.pnl)}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                      {week.count} trades
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>—</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {selectedDate && (
        <DayModal
          date={selectedDate}
          trades={trades}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
