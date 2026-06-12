import { useEffect, useRef, useId } from 'react';

const INTERVAL_OPTIONS = [
  { label: '1m',  value: '1' },
  { label: '5m',  value: '5' },
  { label: '15m', value: '15' },
  { label: '1H',  value: '60' },
  { label: '4H',  value: '240' },
  { label: '1D',  value: 'D' },
  { label: '1W',  value: 'W' },
];

export default function TradingViewChart({ ticker, date, theme = 'dark' }) {
  const containerId = useId().replace(/:/g, '');
  const containerRef = useRef(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    if (!ticker || !containerRef.current) return;

    const loadWidget = () => {
      if (!window.TradingView) return;
      if (widgetRef.current) {
        try { widgetRef.current.remove?.(); } catch {}
      }
      containerRef.current.innerHTML = '';

      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: ticker.includes(':') ? ticker : `NASDAQ:${ticker}`,
        interval: 'D',
        timezone: 'America/New_York',
        theme: theme === 'dark' ? 'dark' : 'light',
        style: '1',
        locale: 'en',
        toolbar_bg: theme === 'dark' ? '#18181b' : '#f1f3f6',
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: `tv_${containerId}`,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: true,
        studies: [],
      });
    };

    if (window.TradingView) {
      loadWidget();
    } else {
      const existing = document.getElementById('tv-script');
      if (!existing) {
        const script = document.createElement('script');
        script.id = 'tv-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = loadWidget;
        document.head.appendChild(script);
      } else {
        existing.addEventListener('load', loadWidget);
      }
    }

    return () => {
      try { widgetRef.current?.remove?.(); } catch {}
    };
  }, [ticker, containerId, theme]);

  if (!ticker) return null;

  const tvUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(ticker)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: theme === 'dark' ? '#18181b' : 'var(--bg-card)',
        borderRadius: '8px 8px 0 0', border: '1px solid var(--border)', borderBottom: 'none',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: theme === 'dark' ? '#f8fafc' : 'var(--text)',
          letterSpacing: '0.04em',
        }}>
          {ticker}
        </span>
        {date && (
          <span style={{ fontSize: 11, color: '#64748b' }}>· {date}</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#64748b' }}>
            Ctrl+Shift+S בתוך TV → Paste כאן
          </span>
          <a
            href={tvUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
              background: '#1d4ed8', color: '#fff', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            ↗ TradingView
          </a>
        </div>
      </div>

      {/* Chart container */}
      <div
        ref={containerRef}
        id={`tv_${containerId}`}
        style={{
          height: 420,
          border: '1px solid var(--border)',
          borderRadius: '0 0 8px 8px',
          overflow: 'hidden',
          background: theme === 'dark' ? '#131722' : '#fff',
        }}
      />
    </div>
  );
}
