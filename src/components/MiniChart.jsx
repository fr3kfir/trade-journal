import { useState, useRef, useEffect } from 'react';

function tvSymbol(ticker) {
  if (!ticker) return 'SPY';
  return ticker.includes(':') ? ticker : `NASDAQ:${ticker}`;
}

export default function MiniChart({ trade, height = 160, theme = 'light' }) {
  const containerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!trade?.ticker) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '300px' }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [trade?.ticker]);

  if (!trade?.ticker) return <div style={{ width: '100%', height }} />;

  const symbol = tvSymbol(trade.ticker);
  const isDark = theme === 'dark';

  // For thumbnails (height <= 200): daily bars, 3-month range — gives context of the setup
  // For large view (lightbox): 5-min bars, 5-day range — shows intraday execution
  const isThumb = height <= 200;
  const config = {
    symbol,
    interval:           isThumb ? 'D' : '5',
    range:              isThumb ? '3M' : '5D',
    timezone:           'America/New_York',
    theme:              isDark ? 'dark' : 'light',
    style:              '1',
    locale:             'en',
    hide_top_toolbar:   isThumb,
    hide_legend:        isThumb,
    hide_side_toolbar:  true,
    save_image:         false,
    enable_publishing:  false,
    withdateranges:     false,
    details:            false,
    hotlist:            false,
    calendar:           false,
    width:              '100%',
    height,
  };

  const src =
    'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.html' +
    `?locale=en#${encodeURIComponent(JSON.stringify(config))}`;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height,
        overflow: 'hidden',
        background: isDark ? '#0f1724' : '#ffffff',
        position: 'relative',
      }}
    >
      {visible ? (
        <iframe
          src={src}
          width="100%"
          height={height}
          frameBorder="0"
          allowTransparency="true"
          scrolling="no"
          loading="lazy"
          title={`Chart ${trade.ticker}`}
          style={{ display: 'block', border: 'none', width: '100%', height }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: isDark ? '#8ab' : '#aaa', opacity: 0.5,
        }}>
          {trade.ticker}
        </div>
      )}
    </div>
  );
}
