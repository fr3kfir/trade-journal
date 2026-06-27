const SYMBOLS = [
  // Semiconductors
  { s: 'NVDA', g: 'Semiconductors' }, { s: 'AMD',  g: 'Semiconductors' }, { s: 'AVGO', g: 'Semiconductors' },
  { s: 'MCHP', g: 'Semiconductors' }, { s: 'ON',   g: 'Semiconductors' }, { s: 'INTC', g: 'Semiconductors' },
  { s: 'MU',   g: 'Semiconductors' }, { s: 'STX',  g: 'Semiconductors' }, { s: 'VSH',  g: 'Semiconductors' },
  { s: 'ACLS', g: 'Semiconductors' }, { s: 'VECO', g: 'Semiconductors' }, { s: 'MPWR', g: 'Semiconductors' },
  { s: 'TXN',  g: 'Semiconductors' }, { s: 'LRCX', g: 'Semiconductors' }, { s: 'KLAC', g: 'Semiconductors' },
  { s: 'AMAT', g: 'Semiconductors' }, { s: 'ARM',  g: 'Semiconductors' }, { s: 'SMCI', g: 'Semiconductors' },
  { s: 'MXL',  g: 'Semiconductors' }, { s: 'DIOD', g: 'Semiconductors' }, { s: 'UMC',  g: 'Semiconductors' },
  { s: 'SITM', g: 'Semiconductors' }, { s: 'WOLF', g: 'Semiconductors' }, { s: 'MRVL', g: 'Semiconductors' },
  { s: 'SIMO', g: 'Semiconductors' },
  // Software / Cloud
  { s: 'META', g: 'Software/Cloud' }, { s: 'AMZN', g: 'Software/Cloud' }, { s: 'NFLX', g: 'Software/Cloud' },
  { s: 'CRWD', g: 'Software/Cloud' }, { s: 'PLTR', g: 'Software/Cloud' }, { s: 'SNOW', g: 'Software/Cloud' },
  { s: 'NET',  g: 'Software/Cloud' }, { s: 'PANW', g: 'Software/Cloud' }, { s: 'NOW',  g: 'Software/Cloud' },
  { s: 'DDOG', g: 'Software/Cloud' }, { s: 'WDAY', g: 'Software/Cloud' }, { s: 'ZS',   g: 'Software/Cloud' },
  { s: 'FTNT', g: 'Software/Cloud' }, { s: 'OKTA', g: 'Software/Cloud' }, { s: 'DOCN', g: 'Software/Cloud' },
  // AI / Data
  { s: 'INOD', g: 'AI/Data' }, { s: 'TBLA', g: 'AI/Data' }, { s: 'AIP',  g: 'AI/Data' },
  // Crypto / Fintech
  { s: 'COIN', g: 'Crypto/Fintech' }, { s: 'HUT',  g: 'Crypto/Fintech' }, { s: 'GBTG', g: 'Crypto/Fintech' },
  { s: 'RELY', g: 'Crypto/Fintech' },
  // EV / Mobility
  { s: 'TSLA', g: 'EV/Mobility' }, { s: 'UBER', g: 'EV/Mobility' }, { s: 'PENG', g: 'EV/Mobility' },
  { s: 'BLDP', g: 'EV/Mobility' }, { s: 'AUR',  g: 'EV/Mobility' },
  // Consumer / Tech
  { s: 'SPOT', g: 'Consumer Tech' }, { s: 'ABNB', g: 'Consumer Tech' }, { s: 'BAND', g: 'Consumer Tech' },
  // Industrial / Construction
  { s: 'STRL', g: 'Industrial' }, { s: 'LGI',  g: 'Industrial' }, { s: 'NUE',  g: 'Industrial' },
  { s: 'POWL', g: 'Industrial' }, { s: 'MYR',  g: 'Industrial' }, { s: 'FLEX', g: 'Industrial' },
  // Other
  { s: 'PKX',  g: 'Other' }, { s: 'ASX',  g: 'Other' }, { s: 'CNC',  g: 'Other' },
  { s: 'EXTR', g: 'Other' }, { s: 'ELVR', g: 'Other' }, { s: 'STR',  g: 'Other' },
  { s: 'LIFE', g: 'Other' },
];

const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

async function fetchStock(symbol, group) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1d&includePrePost=false`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!r.ok) return null;

    const data = await r.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const q = result.indicators?.quote?.[0];
    const rawCloses = q?.close ?? [];
    const rawHighs  = q?.high  ?? [];
    const rawLows   = q?.low   ?? [];

    const cl = [], hi = [], lo = [];
    for (let i = 0; i < rawCloses.length; i++) {
      if (rawCloses[i] != null && rawHighs[i] != null && rawLows[i] != null) {
        cl.push(rawCloses[i]);
        hi.push(rawHighs[i]);
        lo.push(rawLows[i]);
      }
    }
    if (cl.length < 50) return null;

    const price = cl[cl.length - 1];
    const sma50 = cl.slice(-50).reduce((a, b) => a + b, 0) / 50;

    const trs = [];
    const start = Math.max(1, cl.length - 14);
    for (let i = start; i < cl.length; i++) {
      trs.push(Math.max(hi[i] - lo[i], Math.abs(hi[i] - cl[i - 1]), Math.abs(lo[i] - cl[i - 1])));
    }
    const atr    = trs.length ? trs.reduce((a, b) => a + b, 0) / trs.length : 0;
    const atrPct = price > 0 ? (atr / price) * 100 : 0;
    const pctFromSma = ((price - sma50) / sma50) * 100;
    const ratio  = atrPct > 0 ? pctFromSma / atrPct : 0;

    const meta = result.meta ?? {};

    return {
      ticker:     symbol,
      company:    meta.longName || meta.shortName || symbol,
      group,
      price:      round(price, 2),
      sma50:      round(sma50, 2),
      pctFromSma: round(pctFromSma, 1),
      atrPct:     round(atrPct, 1),
      ratio:      round(ratio, 1),
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const minPct   = parseFloat(req.query.minPct   ?? 0);
  const minRatio = parseFloat(req.query.minRatio ?? 1);

  try {
    const results = await Promise.all(SYMBOLS.map(({ s, g }) => fetchStock(s, g)));
    const stocks  = results
      .filter(s => s && s.pctFromSma >= minPct && s.ratio >= minRatio)
      .sort((a, b) => b.ratio - a.ratio);

    res.status(200).json({ stocks, total: stocks.length, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ stocks: [], error: err.message });
  }
}
