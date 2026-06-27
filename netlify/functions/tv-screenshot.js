const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET' }, body: '' };
  }

  const raw = (event.queryStringParameters?.ticker || '').toUpperCase().trim();
  if (!raw) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'ticker required' }) };

  // Support EXCHANGE:SYMBOL or just SYMBOL
  const symbol = raw.includes(':') ? raw : `NASDAQ:${raw}`;
  const tf = event.queryStringParameters?.tf || 'D'; // D, W, M

  const config = {
    autosize: false,
    symbol,
    interval: tf,
    timezone: 'America/New_York',
    theme: 'dark',
    style: '1',
    locale: 'en',
    width: 1200,
    height: 650,
    hide_top_toolbar: false,
    hide_legend: false,
    save_image: false,
    studies: ['STD;SMA', 'STD;Volume'],
  };

  const url = `https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.html?locale=en#${encodeURIComponent(JSON.stringify(config))}`;

  let browser;
  try {
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      defaultViewport: { width: 1200, height: 650 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Block unnecessary resources to speed up load
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['font', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 18000 });

    // Wait for the chart canvas to appear
    await page.waitForSelector('canvas', { timeout: 12000 }).catch(() => {});
    // Extra time for chart to paint
    await new Promise(r => setTimeout(r, 2500));

    const screenshot = await page.screenshot({ type: 'jpeg', quality: 88, encoding: 'base64' });
    const src = `data:image/jpeg;base64,${screenshot}`;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ src, ticker: raw }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({ error: `Screenshot failed: ${err.message}` }),
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
};
