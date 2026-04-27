const axios = require('axios');
const cheerio = require('cheerio');

async function fetchPage(url) {
  const start = Date.now();
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    },
    timeout: 30000,
  });
  const responseTimeMs = Date.now() - start;

  const finalUrl = response.request?.res?.responseUrl ?? url;
  const headers = response.headers;

  const contentType = headers['content-type'] || '';
  if (!contentType.includes('text/html')) {
    // Non-HTML response (PDF, image, etc.) — return empty DOM so audits get nothing
    // rather than spending 20-40s letting cheerio parse binary data as HTML.
    return { html: '', $: cheerio.load(''), headers, finalUrl, responseTimeMs };
  }

  const html = response.data;
  const $ = cheerio.load(html);

  return { html, $, headers, finalUrl, responseTimeMs };
}

async function fetchPageWithJS(url, timeoutMs = 15000) {
  const puppeteer = require('puppeteer');
  const start = Date.now();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs });
    const responseTimeMs = Date.now() - start;
    const headers  = response ? response.headers() : {};
    const finalUrl = page.url();
    const html = await page.content();
    const $ = cheerio.load(html);
    return { html, $, headers, finalUrl, responseTimeMs };
  } finally {
    await browser.close();
  }
}

module.exports = { fetchPage, fetchPageWithJS };
