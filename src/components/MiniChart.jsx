import { useState, useRef, useEffect, useId } from 'react';

// Shared script loader — loads tv.js only once across all instances
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
  s.onload = () => {
    _tvLoaded = true;
    _tvQueue.splice(0).forEach(fn => fn());
  };
  document.head.appendChild(s);
}

function tvSymbol(ticker) {
  if (!ticker) return 'SPY';
  return ticker.includes(':') ? ticker : `NASDAQ:${ticker}`;
}

export default function MiniChart({ trade, height = 160, theme = 'light' }) {
  // useId gives a unique id per instance; strip non-alphanumeric for valid HTML id
  const uid = useId().replace(/[^a-z0-9]/gi, 'x');
  const containerId = `tv_mc_${uid}`;
  const containerRef = useRef(null);
  const widgetRef   = useRef(null);
  const [visible, setVisible] = useState(false);

  // Lazy: only load when scrolled into view
  useEffect(() => {
    if (!trade?.ticker) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { rootMargin: '400px' }
    );
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [trade?.ticker]);

  // Create widget once visible
  useEffect(() => {
    if (!visible || !trade?.ticker || !containerRef.current) return;
    let dead = false;

    const isThumb = height <= 200;

    loadTv(() => {
      if (dead || !window.TradingView || !containerRef.current) return;
      try { widgetRef.current?.remove?.(); } catch {}

      widgetRef.current = new window.TradingView.widget({
        container_id:      containerId,
        width:             containerRef.current.clientWidth || 260,
        height,
        symbol:            tvSymbol(trade.ticker),
        interval:          isThumb ? 'D' : '5',
        range:             isThumb ? '3M' : '5D',
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
    });

    return () => {
      dead = true;
      try { widgetRef.current?.remove?.(); } catch {}
      widgetRef.current = null;
    };
  }, [visible, trade?.ticker, height, theme]);

  if (!trade?.ticker) return <div style={{ width: '100%', height }} />;

  const bg = theme === 'dark' ? '#0f1724' : '#ffffff';

  return (
    <div
      ref={containerRef}
      id={containerId}
      style={{ width: '100%', height, overflow: 'hidden', background: bg, position: 'relative' }}
    >
      {!visible && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: theme === 'dark' ? '#4a6a8a' : '#bbb',
        }}>
          {trade.ticker}
        </div>
      )}
    </div>
  );
}
