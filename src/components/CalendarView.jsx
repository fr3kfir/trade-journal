import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function CalendarView({ trades }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  // Build map: "YYYY-MM-DD" -> { pnl, count }
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

  // Calendar grid
  const { weeks, monthlyPnl } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells = [];

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, current: false });
    }

    // Current month
    let totalPnl = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const data = dayMap[dateStr];
      if (data) totalPnl += data.pnl;
      cells.push({ day: d, dateStr, current: true, data });
    }

    // Next month padding to complete grid
    const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, current: false });
    }

    // Group into weeks
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-panel)', borderRadius: 12, border: '1px solid var(--border)',
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: 'var(--shadow)',
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
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Monthly P&L</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: monthlyPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
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
            {/* Day cells */}
            {week.cells.map((cell, di) => {
              const isToday = cell.dateStr === todayStr;
              const hasTrades = cell.current && cell.data;
              const pnl = hasTrades ? cell.data.pnl : 0;
              const count = hasTrades ? cell.data.count : 0;

              return (
                <div
                  key={di}
                  style={{
                    minHeight: 80, padding: '10px 12px',
                    borderRight: di < 6 ? '1px solid var(--border)' : 'none',
                    background: !cell.current ? 'var(--bg)' : isToday ? '#EFF6FF' : 'var(--bg-panel)',
                    display: 'flex', flexDirection: 'column', gap: 4,
                    position: 'relative',
                  }}
                >
                  {/* Day number */}
                  <div style={{
                    fontSize: 13, fontWeight: isToday ? 700 : 500,
                    color: isToday ? 'var(--navy)' : cell.current ? 'var(--text)' : 'var(--text-faint)',
                    lineHeight: 1,
                  }}>
                    {cell.day}
                  </div>

                  {/* P&L + trade count */}
                  {hasTrades ? (
                    <>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--red)' : 'var(--text-muted)',
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
              minHeight: 80, padding: '10px 14px',
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
    </div>
  );
}
