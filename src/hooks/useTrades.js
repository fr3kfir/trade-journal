import { useState, useEffect, useRef } from 'react';

const KEY = 'apex_trades_v1';

function pushToServer(trades) {
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trades }),
  }).catch(() => {});
}

export function useTrades() {
  const [trades, setTrades] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  });
  const initialized = useRef(false);

  // Save to localStorage on every change
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(trades));
    // Push to server after initial load from server
    if (initialized.current) pushToServer(trades);
  }, [trades]);

  // Load from server on startup — server is source of truth
  useEffect(() => {
    const local = JSON.parse(localStorage.getItem(KEY) || '[]');
    fetch('/api/trades')
      .then(r => r.json())
      .then(d => {
        if (d.trades?.length) {
          // Server has data — use it
          setTrades(d.trades);
        } else if (local.length) {
          // Server empty but local has data — push local to server
          pushToServer(local);
        }
        initialized.current = true;
      })
      .catch(() => { initialized.current = true; });
  }, []);

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
      const existingIds = new Set(prev.map(t => t.id));
      const fresh = incoming.filter(t => !existingIds.has(t.id));
      return [...fresh, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    return incoming.length;
  };

  return { trades, addTrade, updateTrade, deleteTrade, importTrades };
}
