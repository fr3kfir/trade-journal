export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { symbol = '^GSPC', range = 'ytd', interval = '1mo' } = req.query;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!r.ok) throw new Error(`Yahoo Finance ${r.status}`);
    const data = await r.json();

    const chart = data?.chart?.result?.[0];
    if (!chart) return res.status(200).json({ points: [] });

    const timestamps = chart.timestamp || [];
    const closes = chart.indicators?.quote?.[0]?.close || [];

    const points = timestamps
      .map((ts, i) => ({ ts, close: closes[i] }))
      .filter(p => p.close != null);

    // Normalize to % return from first point
    const base = points[0]?.close || 1;
    const normalized = points.map(p => ({
      date: new Date(p.ts * 1000).toISOString().split('T')[0],
      pct: Math.round(((p.close - base) / base) * 10000) / 100,
    }));

    res.status(200).json({ points: normalized, symbol });
  } catch (err) {
    res.status(200).json({ points: [], error: err.message });
  }
}
