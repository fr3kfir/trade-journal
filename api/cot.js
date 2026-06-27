export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { market = 'NQ' } = req.query;

  // CFTC contract market codes (reliable, unlike name matching)
  const CONTRACT_CODES = {
    NQ:  '20974+',   // E-MINI NASDAQ-100
    ES:  '13874+',   // E-MINI S&P 500
    YM:  '12460+',   // E-MINI DOW JONES $5
    RTY: '239742',   // E-MINI RUSSELL 2000
  };

  const code = CONTRACT_CODES[market] ?? CONTRACT_CODES.NQ;

  try {
    const where = encodeURIComponent(`cftc_contract_market_code = '${code}'`);
    const order = encodeURIComponent('report_date_as_yyyy_mm_dd DESC');
    const url = `https://publicreporting.cftc.gov/resource/jun7-3jbd.json?$where=${where}&$order=${order}&$limit=52`;

    const r = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (!r.ok) throw new Error(`CFTC API ${r.status}: ${r.statusText}`);

    const raw = await r.json();

    if (!Array.isArray(raw) || !raw.length) {
      // Fallback: try name-based search
      const nameFilters = {
        NQ: 'E-MINI NASDAQ-100',
        ES: 'E-MINI S%26P 500',
        YM: 'E-MINI DOW',
        RTY: 'E-MINI RUSSELL 2000',
      };
      const name = nameFilters[market] ?? nameFilters.NQ;
      const where2 = `$q=${encodeURIComponent(name)}`;
      const url2 = `https://publicreporting.cftc.gov/resource/jun7-3jbd.json?${where2}&$order=${order}&$limit=52`;
      const r2 = await fetch(url2, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
      const raw2 = await r2.json();
      if (!Array.isArray(raw2) || !raw2.length) {
        return res.status(200).json({ data: [], market, error: 'No data found for this market' });
      }
      return res.status(200).json({ data: mapRows(raw2.reverse()), market });
    }

    return res.status(200).json({ data: mapRows(raw.reverse()), market });

  } catch (err) {
    res.status(200).json({ data: [], error: err.message });
  }
}

function mapRows(raw) {
  return raw
    .map(row => ({
      date:         (row.report_date_as_yyyy_mm_dd ?? '').slice(0, 10),
      largeSpec:    +(row.noncomm_positions_long_all ?? 0) - +(row.noncomm_positions_short_all ?? 0),
      commercial:   +(row.comm_positions_long_all ?? 0)    - +(row.comm_positions_short_all ?? 0),
      smallSpec:    +(row.nonrept_positions_long_all ?? 0)  - +(row.nonrept_positions_short_all ?? 0),
      openInterest: +(row.open_interest_all ?? 0),
    }))
    .filter(d => d.date);
}
