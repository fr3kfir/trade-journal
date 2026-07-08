import { useState, useEffect, useRef, useCallback } from 'react';

const KEY = 'apex_trades_v1';
const DELETED_KEY = 'apex_deleted_trades_v1';

const isIbkr = (t) => typeof t?.id === 'string' && t.id.startsWith('ibkr-');
const contentKey = (t) =>
  `${(t.ticker || '').toUpperCase()}|${t.date || ''}|${t.quantity ?? ''}|${t.entry ?? ''}`;

function loadDeleted() {
  try {
    const d = JSON.parse(localStorage.getItem(DELETED_KEY)) || {};
    return { ids: d.ids || [], keys: d.keys || [] };
  } catch { return { ids: [], keys: [] }; }
}

function pushToServer(trades, deleted, fullReplace = false) {
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trades, deletedIds: deleted?.ids || [], deletedKeys: deleted?.keys || [], fullReplace }),
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

// Server list wins, but chart images that only exist locally are kept
function mergeServerTrades(serverTrades, localTrades) {
  const localById = new Map(localTrades.map(t => [t.id, t]));
  return serverTrades.map(st => {
    const lt = localById.get(st.id);
    if (lt?.chart_images?.length && !st.chart_images?.length) {
      return { ...st, chart_images: lt.chart_images };
    }
    return st;
  });
}

export function useTrades() {
  const [trades, setTrades] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  });
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);
  const deletedRef = useRef(loadDeleted());
  const fullReplaceNext = useRef(false);

  const rememberDeleted = useCallback((removed) => {
    const d = deletedRef.current;
    for (const t of removed) {
      if (!d.ids.includes(t.id)) d.ids.push(t.id);
      if (isIbkr(t)) {
        const k = contentKey(t);
        if (!d.keys.includes(k)) d.keys.push(k);
      }
    }
    d.ids = d.ids.slice(-2000);
    d.keys = d.keys.slice(-2000);
    localStorage.setItem(DELETED_KEY, JSON.stringify(d));
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(trades));
    if (!initialized.current) return;
    // Debounced push — one request per burst of edits instead of one per change
    const t = setTimeout(() => {
      pushToServer(trades, deletedRef.current, fullReplaceNext.current);
      fullReplaceNext.current = false;
    }, 500);
    return () => clearTimeout(t);
  }, [trades]);

  const reloadFromServer = useCallback(async () => {
    try {
      const r = await fetch('/api/trades');
      const d = await r.json();
      if (Array.isArray(d.trades)) {
        setTrades(prev => mergeServerTrades(d.trades, prev));
        return true;
      }
    } catch { /* offline — keep local copy */ }
    return false;
  }, []);

  useEffect(() => {
    const local = JSON.parse(localStorage.getItem(KEY) || '[]');
    fetch('/api/trades')
      .then(r => r.json())
      .then(d => {
        if (d.trades?.length) {
          setTrades(mergeServerTrades(d.trades, local));
        } else if (local.length) {
          pushToServer(local, deletedRef.current);
        }
        initialized.current = true;
        setReady(true);
      })
      .catch(() => { initialized.current = true; setReady(true); });
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
    setTrades(prev => {
      const removed = prev.filter(t => t.id === id);
      if (removed.length) rememberDeleted(removed);
      return prev.filter(t => t.id !== id);
    }),
  [rememberDeleted]);

  // Intentionally NOT tombstoned — the next sync re-imports a clean copy.
  // fullReplace makes the push clear them on the server too (normally the
  // server keeps ibkr trades a client push is missing).
  const clearIbkrTrades = useCallback(() => {
    fullReplaceNext.current = true;
    setTrades(prev => prev.filter(t => !isIbkr(t)));
  }, []);

  const importTrades = useCallback((incoming) => {
    let fresh = [];
    setTrades(prev => {
      const prevIds = new Set(prev.map(t => t.id));
      const prevKeys = new Set(prev.filter(isIbkr).map(contentKey));
      fresh = incoming.filter(t =>
        !prevIds.has(t.id) && !(isIbkr(t) && prevKeys.has(contentKey(t)))
      );
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

  return { trades, ready, addTrade, updateTrade, deleteTrade, importTrades, clearIbkrTrades, reloadFromServer };
}
