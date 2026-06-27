import { useState, useEffect, useRef, useCallback } from 'react';

const KEY = 'apex_trades_v1';

function pushToServer(trades) {
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trades }),
  }).catch(() => {});
}

async function fetchTVScreenshot(ticker) {
  try {
    const res = await fetch(`/api/chart?ticker=${encodeURIComponent(ticker)}&tf=d`);
    const data = await res.json();
    return data.src || null;
  } catch {
    return null;
  }
}

export function useTrades() {
  const [trades, setTrades] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  });
  const initialized = useRef(false);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(trades));
    if (initialized.current) pushToServer(trades);
  }, [trades]);

  useEffect(() => {
    const local = JSON.parse(localStorage.getItem(KEY) || '[]');
    fetch('/api/trades')
      .then(r => r.json())
      .then(d => {
        if (d.trades?.length) {
          // Merge: preserve locally-stored chart_images that the server doesn't have
          const localById = new Map(local.map(t => [t.id, t]));
          const merged = d.trades.map(st => {
            const lt = localById.get(st.id);
            if (lt?.chart_images?.length && !st.chart_images?.length) {
              return { ...st, chart_images: lt.chart_images };
            }
            return st;
          });
          setTrades(merged);
        } else if (local.length) {
          pushToServer(local);
        }
        initialized.current = true;
      })
      .catch(() => { initialized.current = true; });
  }, []);

  const updateTrade = useCallback((id, fields) =>
    setTrades(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t)),
  []);

  // Fire-and-forget: fetch a TV screenshot and attach it to the trade
  const autoScreenshot = useCallback(async (trade) => {
    if (trade.chart_images?.length || !trade.ticker) return;
    const src = await fetchTVScreenshot(trade.ticker);
    if (src) {
      updateTrade(trade.id, { chart_images: [{ src, stage: 'setup' }] });
    }
  }, [updateTrade]);

  const addTrade = useCallback((t) => {
    const trade = { ...t, id: t.id || `${t.ticker}-${t.date}-${Date.now()}` };
    setTrades(prev => {
      if (prev.find(x => x.id === trade.id)) return prev;
      return [trade, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    // Auto-screenshot in background — no button needed
    autoScreenshot(trade);
  }, [autoScreenshot]);

  const deleteTrade = useCallback((id) =>
    setTrades(prev => prev.filter(t => t.id !== id)),
  []);

  const clearIbkrTrades = useCallback(() =>
    setTrades(prev => prev.filter(t => !t.id.startsWith('ibkr-'))),
  []);

  const importTrades = useCallback((incoming) => {
    let fresh = [];
    setTrades(prev => {
      const prevIds = new Set(prev.map(t => t.id));
      fresh = incoming.filter(t => !prevIds.has(t.id));
      if (!fresh.length) return prev;
      return [...fresh, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
    });
    // Auto-screenshot all fresh trades, staggered to avoid hammering the server
    setTimeout(() => {
      fresh.forEach((trade, i) => {
        setTimeout(() => autoScreenshot(trade), i * 600);
      });
    }, 0);
    return fresh.length;
  }, [autoScreenshot]);

  return { trades, addTrade, updateTrade, deleteTrade, importTrades, clearIbkrTrades };
}
