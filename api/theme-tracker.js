/* ─── THEMES ── extend freely ─────────────────────────────────────────── */
const THEMES = {
  'Semiconductors':    ['NVDA','AMD','AVGO','ARM','MCHP','ON','MU','STX','MPWR','TXN','LRCX','KLAC','AMAT','SMCI','MRVL','ACLS','CRUS','AMBA','WOLF'],
  'Software / Cloud':  ['META','AMZN','NFLX','CRWD','PLTR','SNOW','NET','PANW','NOW','DDOG','WDAY','ZS','FTNT','OKTA','DOCN','GTLB','APP','TTD','HUBS'],
  'AI / Data':         ['INOD','TBLA','AIP','SOUN','BBAI','AI','CIEN','RVTY','ORCL','MSFT','GOOG'],
  'Crypto / Fintech':  ['COIN','HUT','MARA','RIOT','CLSK','PYPL','SQ','AFRM','RELY','BTBT'],
  'EV / Mobility':     ['TSLA','UBER','RIVN','LCID','CHPT','BLNK','AUR','PENG','LYFT'],
  'Consumer Tech':     ['SPOT','ABNB','ROKU','SNAP','PINS','BAND','TMUS','T'],
  'Industrial':        ['STRL','NUE','POWL','MYR','FLEX','PWR','ACMR','ENVX','GNRC'],
  'Defense / Aerospace':['LMT','RTX','GD','NOC','LHX','KTOS','BA','AVAV','RCAT','JOBY','HII','LDOS'],
  'Energy':            ['XOM','CVX','SLB','HAL','DVN','FANG','OXY','MPC','VLO','PSX','CTRA','MRO'],
  'Healthcare / Biotech':['ISRG','DXCM','PODD','INSP','AXSM','EXEL','LEGN','MRNA','TMDX','KYMR','RXRX','ARWR'],
  'Financials':        ['GS','MS','JPM','BLK','V','MA','IBKR','HOOD','SCHW','COF','NU','SOFI'],
  'China Tech':        ['BABA','JD','PDD','BIDU','TCOM','NIO','XPEV','LI','BEKE'],
  'Nuclear / Clean':   ['SMR','OKLO','BWXT','LEU','CCJ','DNN','UEC','UUUU','NLR','CEG'],
  'Mining / Materials':['FCX','MP','ALB','RGLD','WPM','NEM','AEM','AG','GOLD','VALE'],
};

/* ─── HELPERS ─────────────────────────────────────────────────────────── */
const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

/** Exponential Moving Average */
function calcEma(closes, period) {
  if (!closes || closes.length < period) return null;
  const k = 2 / (period + 1);
  let val = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) val = closes[i] * k + val * (1 - k);
  return val;
}

/** % return over N trading days */
function pctReturn(closes, days) {
  if (!closes || closes.length < days + 1) return null;
  const cur  = closes[closes.length - 1];
  const past = closes[closes.length - 1 - days];
  return past ? ((cur - past) / past) * 100 : null;
}

/**
 * Volume Ratio: today's vol vs 20-day average (excluding today).
 * Returns null if not enough data.
 */
function calcVolRatio(volumes) {
  if (!volumes || volumes.length < 21) return null;
  const todayVol = volumes[volumes.length - 1];
  if (!todayVol) return null;
  const avg20 = volumes.slice(-21, -1).filter(Boolean).reduce((a, b) => a + b, 0) / 20;
  return avg20 > 0 ? todayVol / avg20 : null;
}

/**
 * High Volume Close (HVC):
 *  – Volume Ratio ≥ 1.5
 *  – Close in the upper 65% of today's high-low range
 */
function detectHVC(closes, highs, lows, volumes) {
  if (!closes?.length || !highs?.length || !lows?.length || !volumes?.length) return false;
  const vr = calcVolRatio(volumes);
  if (vr == null || vr < 1.5) return false;
  const lastClose = closes[closes.length - 1];
  const lastHigh  = highs[highs.length - 1];
  const lastLow   = lows[lows.length - 1];
  const range = lastHigh - lastLow;
  if (!range) return false;
  return (lastClose - lastLow) / range >= 0.65;
}

/**
 * Flat Base signal:
 *  – 15-day price range < 10% (tight consolidation)
 *  – Current close within 5% of 15-day high (near top of base)
 */
function detectFlatBase(closes) {
  if (!closes || closes.length < 15) return false;
  const recent  = closes.slice(-15);
  const hi      = Math.max(...recent);
  const lo      = Math.min(...recent);
  const mid     = (hi + lo) / 2;
  const rangePct = mid > 0 ? (hi - lo) / mid * 100 : 999;
  const pctFromHi = (closes[closes.length - 1] - hi) / hi * 100;
  return rangePct < 10 && pctFromHi > -5;
}

/* ─── DATA FETCH ──────────────────────────────────────────────────────── */
async function fetchData(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1d&includePrePost=false`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const quote   = result.indicators?.quote?.[0] ?? {};
    const closes  = (quote.close  ?? []).filter(v => v != null);
    const highs   = (quote.high   ?? []).filter(v => v != null);
    const lows    = (quote.low    ?? []).filter(v => v != null);
    const volumes = (quote.volume ?? []).filter(v => v != null);
    const meta    = result.meta ?? {};

    if (closes.length < 20) return null;
    return { closes, highs, lows, volumes, name: meta.longName || meta.shortName || symbol };
  } catch {
    return null;
  }
}

/* ─── HANDLER ─────────────────────────────────────────────────────────── */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Fetch all symbols (SPY + QQQ + all theme stocks) in parallel
    const allSymbols = ['SPY', 'QQQ', ...new Set(Object.values(THEMES).flat())];
    const fetched = await Promise.all(allSymbols.map(async s => ({ s, d: await fetchData(s) })));
    const map = {};
    fetched.forEach(({ s, d }) => { if (d) map[s] = d; });

    const spy = map['SPY'];
    const qqq = map['QQQ'];
    if (!spy) return res.status(200).json({ themes: [], error: 'SPY data unavailable' });

    const spyR1  = pctReturn(spy.closes, 1);
    const spyR5  = pctReturn(spy.closes, 5);
    const spyR20 = pctReturn(spy.closes, 20);
    const spyR60 = pctReturn(spy.closes, 60);

    const themes = Object.entries(THEMES).map(([name, syms]) => {
      const stocks = syms
        .map(s => {
          const d = map[s];
          if (!d) return null;

          const { closes, highs, lows, volumes } = d;

          // Returns
          const r1  = pctReturn(closes, 1);
          const r5  = pctReturn(closes, 5);
          const r20 = pctReturn(closes, 20);
          const r60 = pctReturn(closes, 60);

          // Relative Strength vs SPY
          const rs5  = r5  != null && spyR5  != null ? r5  - spyR5  : null;
          const rs20 = r20 != null && spyR20 != null ? r20 - spyR20 : null;
          const rs60 = r60 != null && spyR60 != null ? r60 - spyR60 : null;

          // Composite RS score (weighted)
          const parts = [
            rs5  != null ? rs5  * 0.40 : null,
            rs20 != null ? rs20 * 0.35 : null,
            rs60 != null ? rs60 * 0.25 : null,
          ].filter(v => v != null);
          const composite = parts.length ? parts.reduce((a, b) => a + b, 0) : 0;

          // Moving averages
          const curPrice = closes[closes.length - 1];
          const ema10 = calcEma(closes, 10);
          const ema21 = calcEma(closes, 21);
          const ema50 = calcEma(closes, 50);
          const aboveEma10 = ema10 != null ? curPrice > ema10 : null;
          const aboveEma21 = ema21 != null ? curPrice > ema21 : null;
          const aboveEma50 = ema50 != null ? curPrice > ema50 : null;

          // Volume
          const volRatio = calcVolRatio(volumes);

          // Setup flags
          const isHVC      = detectHVC(closes, highs, lows, volumes);
          const isFlatBase = detectFlatBase(closes);

          return {
            ticker: s,
            name: d.name,
            price: round(curPrice, 2),
            r1:  r1  != null ? round(r1,  2) : null,
            r5:  r5  != null ? round(r5,  2) : null,
            r20: r20 != null ? round(r20, 2) : null,
            r60: r60 != null ? round(r60, 2) : null,
            rs5:  rs5  != null ? round(rs5,  2) : null,
            rs20: rs20 != null ? round(rs20, 2) : null,
            rs60: rs60 != null ? round(rs60, 2) : null,
            composite: round(composite, 2),
            // MA context
            ema10:     ema10 != null ? round(ema10, 2) : null,
            ema21:     ema21 != null ? round(ema21, 2) : null,
            ema50:     ema50 != null ? round(ema50, 2) : null,
            aboveEma10,
            aboveEma21,
            aboveEma50,
            // Volume
            volRatio: volRatio != null ? round(volRatio, 2) : null,
            // Setup flags
            isHVC,
            isFlatBase,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.composite - a.composite);

      if (!stocks.length) return null;

      const avg = key => {
        const vs = stocks.map(s => s[key]).filter(v => v != null);
        return vs.length ? round(vs.reduce((a, b) => a + b, 0) / vs.length, 2) : null;
      };

      // Count setup flags in theme
      const hvcCount      = stocks.filter(s => s.isHVC).length;
      const flatBaseCount = stocks.filter(s => s.isFlatBase).length;
      const aboveEma21Pct = stocks.filter(s => s.aboveEma21 === true).length;

      return {
        theme:  name,
        count:  stocks.length,
        r1:     avg('r1'),
        r5:     avg('r5'),
        r20:    avg('r20'),
        r60:    avg('r60'),
        rs5:    avg('rs5'),
        rs20:   avg('rs20'),
        rs60:   avg('rs60'),
        composite:    avg('composite'),
        leader:       stocks[0]?.ticker ?? null,
        hvcCount,
        flatBaseCount,
        aboveEma21Pct,
        stocks,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0));

    res.status(200).json({
      themes,
      benchmark: {
        spy: {
          r1:  spyR1  != null ? round(spyR1,  2) : null,
          r5:  spyR5  != null ? round(spyR5,  2) : null,
          r20: spyR20 != null ? round(spyR20, 2) : null,
        },
        qqq: {
          r1: qqq ? round(pctReturn(qqq.closes, 1) ?? 0, 2) : null,
          r5: qqq ? round(pctReturn(qqq.closes, 5) ?? 0, 2) : null,
        },
      },
    });
  } catch (err) {
    res.status(200).json({ themes: [], error: err.message });
  }
}
