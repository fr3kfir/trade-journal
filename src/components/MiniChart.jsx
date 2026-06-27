import { useRef, useState } from 'react';

function tvSymbol(ticker) {
  if (!ticker) return 'SPY';
  return ticker.includes(':') ? ticker : `NASDAQ:${ticker}`;
}

function tvIframeSrc(ticker, height, theme) {
  const sym   = encodeURIComponent(tvSymbol(ticker));
  const thmStr = theme === 'dark' ? 'dark' : 'light';
  const isThumb = height <= 200;
  return (
    `https://s3.tradingview.com/widgetembed/` +
    `?symbol=${sym}` +
    `&interval=D` +
    `&range=${isThumb ? '6M' : '1Y'}` +
    `&theme=${thmStr}` +
    `&style=1` +
    `&locale=en` +
    `&hide_top_toolbar=${isThumb ? 1 : 0}` +
    `&hide_legend=${isThumb ? 1 : 0}` +
    `&hide_side_toolbar=1` +
    `&save_image=0` +
    `&withdateranges=0` +
    `&details=0` +
    `&hotlist=0` +
    `&calendar=0`
  );
}

export default function MiniChart({ trade, height = 160, theme = 'light' }) {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef(null);

  if (!trade?.ticker) return <div style={{ width: '100%', height }} />;

  const bg = theme === 'dark' ? '#0f1724' : '#f1f3f6';
  const src = tvIframeSrc(trade.ticker, height, theme);

  return (
    <div style={{ width: '100%', height, position: 'relative', background: bg }}>
      <iframe
        ref={iframeRef}
        title={`${trade.ticker} chart`}
        src={src}
        sandbox="allow-scripts allow-same-origin"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        onLoad={() => setLoaded(true)}
      />

      {/* Spinner while loading */}
      {!loaded && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6,
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme === 'dark' ? '#4a6a8a' : '#bbb' }}>
            {trade.ticker}
          </div>
          <div style={{
            width: 24, height: 24,
            border: `2px solid ${theme === 'dark' ? '#4a6a8a' : '#ddd'}`,
            borderTopColor: theme === 'dark' ? '#60a5fa' : '#6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
