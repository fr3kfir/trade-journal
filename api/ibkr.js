import https from 'https';

const TOKEN    = process.env.IBKR_TOKEN;
const QUERY_ID = process.env.IBKR_QUERY_ID;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

// Parse XML attributes into object
function parseXmlTrades(xml) {
  const trades = [];
  const tradeRegex = /<Trade\s([^>]+)\/>/g;
  let match;
  while ((match = tradeRegex.exec(xml)) !== null) {
    const attrs = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let a;
    while ((a = attrRegex.exec(match[1])) !== null) {
      attrs[a[1]] = a[2];
    }
    trades.push(attrs);
  }
  return trades;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (!TOKEN || !QUERY_ID) {
    return res.status(500).json({ error: 'IBKR credentials not configured' });
  }

  try {
    const r1 = await httpsGet(
      `https://ndcdyn.interactivebrokers.com/AccountManagement/FlexWebService/SendRequest?t=${TOKEN}&q=${QUERY_ID}&v=3`
    );

    if (r1.status !== 200 || r1.body.includes('Error 403') || r1.body.includes('Access Denied')) {
      throw new Error(`SendRequest failed (${r1.status}): ${r1.body.slice(0, 200)}`);
    }

    const refCode = r1.body.match(/<ReferenceCode>(.*?)<\/ReferenceCode>/)?.[1];
    const dlUrl   = r1.body.match(/<Url>(.*?)<\/Url>/)?.[1];

    if (!refCode || !dlUrl) {
      throw new Error('No reference code in response: ' + r1.body.slice(0, 300));
    }

    let body = null;
    for (let i = 0; i < 5; i++) {
      await sleep(4000);
      const r2 = await httpsGet(`${dlUrl}?t=${TOKEN}&q=${refCode}&v=3`);
      if (r2.body.includes('generation in progress') || r2.body.includes('Please wait')) continue;
      if (r2.status === 200 && r2.body.length > 50) { body = r2.body; break; }
    }

    if (!body) throw new Error('IBKR report not ready after 20s — try again in a moment');

    const all = parseXmlTrades(body);

    // Only closed trades (C = close, C;O = close+open same day)
    const list = all.filter(t =>
      (t.assetCategory === 'STK' || !t.assetCategory) &&
      t.openCloseIndicator && t.openCloseIndicator.includes('C')
    );

    const trades = list.map(t => ({
      id:         `ibkr-${t.symbol}-${t.tradeID || t.dateTime}-${t.quantity}`.replace(/[\s;]/g, ''),
      ticker:     t.symbol || '',
      date:       (t.tradeDate || t.dateTime || '').split(';')[0].split(' ')[0],
      direction:  (t.buySell || 'BUY') === 'BUY' ? 'L' : 'S',
      quantity:   Math.abs(parseFloat(t.quantity) || 0),
      entry:      parseFloat(t.tradePrice) || null,
      exit:       null,
      stop:       null,
      pnl:        parseFloat(t.fifoPnlRealized) || null,
      commission: Math.abs(parseFloat(t.ibCommission) || 0),
      open_close: t.openCloseIndicator || '',
      notes:      'IBKR import',
    }));

    return res.status(200).json({ trades, count: trades.length });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
