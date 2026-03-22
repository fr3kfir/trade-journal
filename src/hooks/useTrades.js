import { useState, useEffect } from 'react';

const KEY = 'apex_trades_v1';

export function useTrades() {
  const [trades, setTrades] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(trades));
  }, [trades]);

  const addTrade = (t) => {
    const trade = { ...t, id: t.id || `${t.ticker}-${t.date}-${Date.now()}` };
    setTrades(prev => {
      if (prev.find(x => x.id === trade.id)) return prev;
      return [trade, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
  };

  const updateTrade = (id, fields) =>
    setTrades(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));

  const deleteTrade = (id) =>
    setTrades(prev => prev.filter(t => t.id !== id));

  const importTrades = (incoming) => {
    setTrades(prev => {
      const incomingMap = new Map(incoming.map(t => [t.id, t]));
      const manual = prev.filter(t => !t.id.startsWith('ibkr-'));
      const existingIbkr = prev.filter(t => t.id.startsWith('ibkr-'));
      const existingIds = new Set(existingIbkr.map(t => t.id));
      const fresh = incoming.filter(t => !existingIds.has(t.id));
      // Update existing ibkr trades with latest data (fixes P&L etc)
      const updated = existingIbkr.map(t => incomingMap.has(t.id) ? { ...t, ...incomingMap.get(t.id) } : t);
      return [...fresh, ...updated, ...manual].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    return incoming.length;
  };

  return { trades, addTrade, updateTrade, deleteTrade, importTrades };
}
