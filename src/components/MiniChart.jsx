import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

const cache = {};

function findCandleForPrice(candles, price, mode) {
  // mode: 'first' finds first candle where low <= price <= high
  // mode: 'last' finds last candle where low <= price <= high
  let result = null;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (c.low <= price && price <= c.high) {
      result = c;
      if (mode === 'first') break;
    }
  }
  if (result) return result;
  // Fallback: candle with closest close price
  let best = null;
  let bestDiff = Infinity;
  for (const c of candles) {
    const diff = Math.abs(c.close - price);
    if (diff < bestDiff) { bestDiff = diff; best = c; }
  }
  return best;
}

async function fetchCandles(ticker, date) {
  const key = `${ticker}_${date}`;
  if (cache[key]) return cache[key];
  const res = await fetch(`/api/ohlcv?ticker=${encodeURIComponent(ticker)}&date=${date}`);
  const data = await res.json();
  if (data.candles?.length) {
    cache[key] = data.candles;
    return data.candles;
  }
  throw new Error(data.error || 'No data');
}

export default function MiniChart({ trade, height = 160, theme = 'light' }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const observerRef = useRef(null);

  const isDark = theme === 'dark';
  const bg = isDark ? '#0f1724' : '#ffffff';
  const gridColor = isDark ? '#1e2d40' : '#f0f0f0';
  const textColor = isDark ? '#8ab' : '#888';
  const upColor = '#26a69a';
  const downColor = '#ef5350';

  useEffect(() => {
    if (!trade?.ticker || !trade?.date) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && status === 'idle') {
          setStatus('loading');
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    if (containerRef.current) observerRef.current.observe(containerRef.current);
    return () => observerRef.current?.disconnect();
  }, [trade?.ticker, trade?.date, status]);

  useEffect(() => {
    if (status !== 'loading' || !containerRef.current) return;
    let destroyed = false;

    (async () => {
      try {
        const candles = await fetchCandles(trade.ticker, trade.date);

        if (destroyed || !containerRef.current) return;

        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth || 240,
          height,
          layout: {
            background: { type: ColorType.Solid, color: bg },
            textColor,
          },
          grid: {
            vertLines: { color: gridColor },
            horzLines: { color: gridColor },
          },
          crosshair: { mode: CrosshairMode.Normal },
          rightPriceScale: { borderColor: gridColor, scaleMargins: { top: 0.1, bottom: 0.1 } },
          timeScale: { borderColor: gridColor, timeVisible: true, secondsVisible: false },
          handleScroll: false,
          handleScale: false,
        });
        chartRef.current = chart;

        const series = chart.addCandlestickSeries({
          upColor, downColor,
          borderUpColor: upColor, borderDownColor: downColor,
          wickUpColor: upColor, wickDownColor: downColor,
        });
        series.setData(candles);

        // Entry price line
        const entryPrice = parseFloat(trade.entry);
        if (!isNaN(entryPrice) && entryPrice > 0) {
          series.createPriceLine({
            price: entryPrice,
            color: trade.direction === 'L' ? '#22c55e' : '#ef4444',
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: 'Entry',
          });
        }

        // Exit price line
        const exitPrice = parseFloat(trade.exit);
        if (!isNaN(exitPrice) && exitPrice > 0) {
          series.createPriceLine({
            price: exitPrice,
            color: trade.direction === 'L' ? '#ef4444' : '#22c55e',
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: 'Exit',
          });
        }

        // Stop price line (dashed)
        const stopPrice = parseFloat(trade.stop);
        if (!isNaN(stopPrice) && stopPrice > 0) {
          series.createPriceLine({
            price: stopPrice,
            color: '#f59e0b',
            lineWidth: 1,
            lineStyle: 2,
            axisLabelVisible: false,
            title: 'Stop',
          });
        }

        // Buy/sell markers
        const markers = [];
        const isLong = trade.direction === 'L';

        if (!isNaN(entryPrice) && entryPrice > 0) {
          const candle = findCandleForPrice(candles, entryPrice, 'first');
          if (candle) {
            markers.push(isLong
              ? { time: candle.time, position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'B', size: 1 }
              : { time: candle.time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'S', size: 1 }
            );
          }
        }

        if (!isNaN(exitPrice) && exitPrice > 0) {
          const candle = findCandleForPrice(candles, exitPrice, 'last');
          if (candle) {
            markers.push(isLong
              ? { time: candle.time, position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: 'S', size: 1 }
              : { time: candle.time, position: 'belowBar', color: '#22c55e', shape: 'arrowUp', text: 'B', size: 1 }
            );
          }
        }

        if (markers.length > 0) {
          markers.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
          series.setMarkers(markers);
        }

        // Fit content with some padding
        chart.timeScale().fitContent();
        setStatus('done');

        const ro = new ResizeObserver(() => {
          if (containerRef.current && !destroyed) {
            chart.applyOptions({ width: containerRef.current.clientWidth });
          }
        });
        if (containerRef.current) ro.observe(containerRef.current);
        chartRef.current._ro = ro;
      } catch {
        if (!destroyed) setStatus('error');
      }
    })();

    return () => {
      destroyed = true;
      if (chartRef.current) {
        chartRef.current._ro?.disconnect();
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [status]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height, background: bg, position: 'relative', overflow: 'hidden' }}
    >
      {status !== 'done' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.45,
        }}>
          {status === 'error'
            ? <span style={{ fontSize: 11, color: textColor }}>No data</span>
            : status === 'loading'
              ? <span style={{ fontSize: 11, color: textColor }}>טוען...</span>
              : null}
        </div>
      )}
    </div>
  );
}
