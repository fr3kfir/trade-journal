import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Same matching rule TradesTable uses to link a closing trade back to its
// standalone opening leg records (so we don't double-count that leg's price).
function getLegs(closeTrade, allTrades) {
  return allTrades.filter(t =>
    t.id !== closeTrade.id &&
    t.ticker === closeTrade.ticker &&
    t.pnl == null &&
    new Date(t.date) <= new Date(closeTrade.date)
  );
}

function buildSummary(trades) {
  const closed = trades.filter(t => t.ticker && t.pnl != null);
  const consumedLegIds = new Set();
  closed.forEach(c => getLegs(c, trades).forEach(l => consumedLegIds.add(l.id)));

  const byTicker = new Map();
  const group = (ticker) => {
    if (!byTicker.has(ticker)) byTicker.set(ticker, { ticker, buys: [], sells: [] });
    return byTicker.get(ticker);
  };

  // Closing trades: for a Long the entry leg was a buy and the exit was a sell;
  // for a Short the entry leg was a (short) sell and the exit was a buy-to-cover.
  closed.forEach(t => {
    const g = group(t.ticker);
    const isShort = t.direction === 'S';
    if (t.entry != null) (isShort ? g.sells : g.buys).push({ price: parseFloat(t.entry), date: t.date, id: `${t.id}-open` });
    if (t.exit != null)  (isShort ? g.buys : g.sells).push({ price: parseFloat(t.exit), date: t.date, id: `${t.id}-close` });
  });

  // Still-open positions: legs with no realized P&L that no closing trade claimed.
  trades.filter(t => t.ticker && t.pnl == null && t.entry != null && !consumedLegIds.has(t.id))
    .forEach(t => {
      const g = group(t.ticker);
      (t.direction === 'S' ? g.sells : g.buys).push({ price: parseFloat(t.entry), date: t.date, id: t.id, open: true });
    });

  return [...byTicker.values()].map(g => {
    const buys = g.buys.sort((a, b) => new Date(a.date) - new Date(b.date));
    const sells = g.sells.sort((a, b) => new Date(a.date) - new Date(b.date));
    const avg = arr => arr.length ? arr.reduce((s, x) => s + x.price, 0) / arr.length : null;
    return {
      ticker: g.ticker,
      buys, sells,
      avgBuy: avg(buys),
      avgSell: avg(sells),
      hasOpen: buys.some(b => b.open) || sells.some(s => s.open),
    };
  }).sort((a, b) => a.ticker.localeCompare(b.ticker));
}

function money(v) {
  return v == null ? '—' : `$${v.toFixed(2)}`;
}

function PriceList({ items, label }) {
  if (!items.length) return <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {items.map(it => (
        <div key={it.id} style={{ display: 'flex', gap: 8, fontSize: 12, alignItems: 'center' }}>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{money(it.price)}</span>
          <span style={{ color: 'var(--text-faint)' }}>{it.date}</span>
          {it.open && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: 'rgba(217,119,6,0.12)', padding: '1px 6px', borderRadius: 10 }}>
              OPEN
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function StockSummary({ trades }) {
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(new Set());
  const summary = useMemo(() => buildSummary(trades), [trades]);

  const filtered = summary.filter(s => !filter || s.ticker.toLowerCase().includes(filter.toLowerCase()));

  const toggle = (ticker) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(ticker) ? next.delete(ticker) : next.add(ticker);
      return next;
    });
  };

  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Buy / Sell Prices by Stock</span>
        <input
          className="input"
          style={{ width: 180 }}
          placeholder="Search ticker..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-faint)', fontWeight: 500 }}>
          {filtered.length} stocks
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="trade-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <th>Ticker</th>
              <th>Avg Buy</th>
              <th>Avg Sell</th>
              <th># Buys</th>
              <th># Sells</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 40 }}>No trades yet</td></tr>
            )}
            {filtered.map(s => {
              const isOpen = expanded.has(s.ticker);
              return (
                <>
                  <tr key={s.ticker} style={{ cursor: 'pointer' }} onClick={() => toggle(s.ticker)}>
                    <td style={{ textAlign: 'center', color: 'var(--text-faint)' }}>
                      {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </td>
                    <td style={{ fontWeight: 600, letterSpacing: '0.02em' }}>{s.ticker}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--green)' }}>{money(s.avgBuy)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--red)' }}>{money(s.avgSell)}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>{s.buys.length}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>{s.sells.length}</td>
                    <td>
                      {s.hasOpen
                        ? <span className="badge badge-green" style={{ fontSize: 10 }}>Open</span>
                        : <span className="badge" style={{ fontSize: 10, background: 'var(--bg-card)', color: 'var(--text-faint)' }}>Closed</span>}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr style={{ background: 'var(--bg-card)' }}>
                      <td></td>
                      <td colSpan={6} style={{ padding: '10px 12px 14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                              Buys ({s.buys.length})
                            </div>
                            <PriceList items={s.buys} />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                              Sells ({s.sells.length})
                            </div>
                            <PriceList items={s.sells} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
