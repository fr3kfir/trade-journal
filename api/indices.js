// Index closes from Yahoo Finance.
// ?from=YYYY-MM-DD[&to=YYYY-MM-DD]&interval=1d — explicit window (benchmark chart)
// ?range=ytd&interval=1mo                      — Yahoo range shorthand
// Each point carries the raw close plus % change from the first point.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { symbol = '^GSPC', range = 'ytd', interval = '1mo', from, to } = req.query;

  try {
    let window = `range=${range}`;
    if (from) {
      const p1 = Math.floor(new Date(`${from}T00:00:00Z`).getTime() / 1000);
      const p2 = to ? Math.floor(new Date(`${to}T23:59:59Z`).getTime() / 1000) : Math.floor(Date.now() / 1000);
      window = `period1=${p1}&period2=${p2}`;
    }
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${window}&interval=${interval}&includePrePost=false`;
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
      close: Math.round(p.close * 100) / 100,
      pct: Math.round(((p.close - base) / base) * 10000) / 100,
    }));

    res.status(200).json({ points: normalized, symbol });
  } catch (err) {
    res.status(200).json({ points: [], error: err.message });
  }
}
