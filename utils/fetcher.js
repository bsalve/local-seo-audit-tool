const axios = require('axios');
const cheerio = require('cheerio');

async function fetchPage(url) {
  const start = Date.now();
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'LocalSEOAuditBot/1.0',
    },
    timeout: 10000,
  });
  const responseTimeMs = Date.now() - start;

  const html = response.data;
  const $ = cheerio.load(html);
  const headers = response.headers;
  const finalUrl = response.request?.res?.responseUrl ?? url;

  return { html, $, headers, finalUrl, responseTimeMs };
}

module.exports = { fetchPage };
