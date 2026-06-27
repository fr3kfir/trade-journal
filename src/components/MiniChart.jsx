import { useState, useRef, useEffect, useId } from 'react';

let _tvLoaded = false;
let _tvLoading = false;
const _tvQueue = [];

function loadTv(cb) {
  if (_tvLoaded) { cb(); return; }
  _tvQueue.push(cb);
  if (_tvLoading) return;
  _tvLoading = true;
  const s = document.createElement('script');
  s.src = 'https://s3.tradingview.com/tv.js';
  s.async = true;
  s.onload = () => { _tvLoaded = true; _tvQueue.splice(0).forEach(fn => fn()); };
  s.onerror = () => { _tvLoading = false; };
  document.head.appendChild(s);
}

function tvSymbol(ticker) {
  if (!ticker) return 'SPY';
  return ticker.includes(':') ? ticker : `NASDAQ:${ticker}`;
}

// Derive open+close price markers from trade data
function getMarkers(trade) {
  const isLong  = trade.direction === 'L';
  const entryP  = parseFloat(trade.entry);
  const exitP   = parseFloat(trade.exit);
  const pnl     = parseFloat(trade.pnl);
  const qty     = Math.abs(parseFloat(trade.quantity)) || 1;
  const isIbkr  = !!(trade.open_close?.includes('C') || trade.notes?.startsWith('IBKR'));

  const ts = trade.date
    ? Math.floor(new Date(trade.date + 'T14:00:00Z').getTime() / 1000)
    : null;
  if (!ts) return [];

  const markers = [];

  if (isIbkr && !isNaN(entryP) && entryP > 0) {
    // For IBKR closing trades: trade.entry stores the EXIT price
    const closeP = entryP;

    // Estimate the open price from P&L
    // Long: pnl ≈ (closeP - openP) × qty  →  openP = closeP - pnl/qty
    // Short: pnl ≈ (openP - closeP) × qty  →  openP = closeP + pnl/qty
    const openP = !isNaN(pnl) && qty > 0
      ? (isLong ? closeP - pnl / qty : closeP + pnl / qty)
      : NaN;

    if (!isNaN(openP) && openP > 0) {
      markers.push({
        time: ts, price: openP,
        shape: isLong ? 'arrow_up' : 'arrow_down',
        color: isLong ? '#16a34a' : '#dc2626',
        text: `כניסה $${openP.toFixed(2)}`,
      });
    }
    markers.push({
      time: ts, price: closeP,
      shape: isLong ? 'arrow_down' : 'arrow_up',
      color: isLong ? '#dc2626' : '#16a34a',
      text: `יציאה $${closeP.toFixed(2)}`,
    });
  } else {
    // Manual trades: entry = open price, exit = close price
    if (!isNaN(entryP) && entryP > 0) {
      markers.push({
        time: ts, price: entryP,
        shape: isLong ? 'arrow_up' : 'arrow_down',
        color: isLong ? '#16a34a' : '#dc2626',
        text: `כניסה $${entryP.toFixed(2)}`,
      });
    }
    if (!isNaN(exitP) && exitP > 0) {
      markers.push({
        time: ts, price: exitP,
        shape: isLong ? 'arrow_down' : 'arrow_up',
        color: isLong ? '#dc2626' : '#16a34a',
        text: `יציאה $${exitP.toFixed(2)}`,
      });
    }
  }

  return markers;
}

function addMarkers(chart, markers) {
  markers.forEach(m => {
    try {
      chart.createShape(
        { time: m.time, price: m.price },
        {
          shape: m.shape,
          lock: true,
          disableSelection: true,
          disableSave: true,
          disableUndo: true,
          overrides: { color: m.color, fontsize: 13, bold: true, text: m.text },
        }
      );
    } catch {}
    try {
      chart.createShape(
        { price: m.price },
        {
          shape: 'horizontal_line',
          lock: true,
          disableSelection: true,
          disableSave: true,
          disableUndo: true,
          overrides: { linecolor: m.color, linewidth: 1, linestyle: 2 },
        }
      );
    } catch {}
  });
}

export default function MiniChart({ trade, height = 160, theme = 'light' }) {
  const uid = useId().replace(/[^a-z0-9]/gi, 'x');
  const containerId  = `tv_mc_${uid}`;
  const containerRef = useRef(null);
  const widgetRef    = useRef(null);
  const [visible, setVisible]   = useState(false);
  const [loaded,  setLoaded]    = useState(false);
  const [error,   setError]     = useState(false);

  // Lazy: trigger load when near viewport
  useEffect(() => {
    if (!trade?.ticker) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: '600px' }
    );
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [trade?.ticker]);

  // Build widget once visible
  useEffect(() => {
    if (!visible || !trade?.ticker || !containerRef.current) return;
    let dead = false;
    setLoaded(false);
    setError(false);

    const isThumb = height <= 200;

    loadTv(() => {
      if (dead || !window.TradingView || !containerRef.current) return;
      try { widgetRef.current?.remove?.(); } catch {}
      containerRef.current.innerHTML = '';

      const widget = new window.TradingView.widget({
        container_id:      containerId,
        autosize:          true,          // fills container width
        height,
        symbol:            tvSymbol(trade.ticker),
        interval:          isThumb ? 'D' : 'D',
        range:             isThumb ? '6M' : '1Y',
        timezone:          'America/New_York',
        theme:             theme === 'dark' ? 'dark' : 'light',
        style:             '1',
        locale:            'en',
        toolbar_bg:        theme === 'dark' ? '#0f1724' : '#f1f3f6',
        enable_publishing: false,
        allow_symbol_change: false,
        hide_top_toolbar:  isThumb,
        hide_legend:       isThumb,
        hide_side_toolbar: true,
        save_image:        false,
        withdateranges:    false,
        details:           false,
        hotlist:           false,
        calendar:          false,
      });

      widgetRef.current = widget;

      widget.onChartReady(() => {
        if (dead) return;
        setLoaded(true);
        try {
          const chart = widget.activeChart();
          const markers = getMarkers(trade);
          addMarkers(chart, markers);
        } catch {}
      });

      // Timeout fallback — mark error if chart never ready
      setTimeout(() => {
        if (!dead && !loaded) setError(true);
      }, 15000);
    });

    return () => {
      dead = true;
      try { widgetRef.current?.remove?.(); } catch {}
      widgetRef.current = null;
    };
  }, [visible, trade?.ticker, trade?.entry, trade?.exit, trade?.pnl, height, theme]);

  if (!trade?.ticker) return <div style={{ width: '100%', height }} />;

  const bg = theme === 'dark' ? '#0f1724' : '#ffffff';

  return (
    <div style={{ width: '100%', height, position: 'relative', background: bg }}>
      {/* Container for TV widget */}
      <div
        ref={containerRef}
        id={containerId}
        style={{ width: '100%', height, overflow: 'hidden' }}
      />

      {/* Loading placeholder */}
      {!loaded && !error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700,
            color: theme === 'dark' ? '#4a6a8a' : '#bbb',
          }}>{trade.ticker}</div>
          {visible && (
            <div style={{
              width: 24, height: 24, border: `2px solid ${theme === 'dark' ? '#4a6a8a' : '#ddd'}`,
              borderTopColor: theme === 'dark' ? '#60a5fa' : '#6366f1',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: theme === 'dark' ? '#ef4444' : '#dc2626',
        }}>
          {trade.ticker} — failed to load
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
