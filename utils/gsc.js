'use strict';
const db = require('./db');

const TOKEN_REFRESH_URL = 'https://oauth2.googleapis.com/token';
const GSC_SITES_URL     = 'https://www.googleapis.com/webmasters/v3/sites';

async function getValidToken(userId) {
  if (!db) return null;
  const user = await db('users').where({ id: userId }).first();
  if (!user || !user.google_access_token) return null;

  const expiry = Number(user.google_token_expiry); // bigint → string from Postgres
  const bufferMs = 60 * 1000; // refresh 1 min before expiry

  if (Date.now() < expiry - bufferMs) {
    return user.google_access_token;
  }

  // Token expired or expiring soon — try to refresh
  if (!user.google_refresh_token) return null;

  try {
    const res = await fetch(TOKEN_REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID     || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: user.google_refresh_token,
        grant_type:    'refresh_token',
      }).toString(),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token) return null;

    const newExpiry = Date.now() + ((data.expires_in ?? 3600) * 1000);
    await db('users').where({ id: userId }).update({
      google_access_token:  data.access_token,
      google_token_expiry:  newExpiry,
    });

    return data.access_token;
  } catch {
    return null;
  }
}

async function getGscData(userId, siteUrl) {
  const token = await getValidToken(userId);
  if (!token) return { connected: false };

  let host;
  try {
    host = new URL(siteUrl).hostname.replace(/^www\./, '');
  } catch {
    return { connected: false };
  }

  // Fetch list of verified GSC properties
  let sites;
  try {
    const res = await fetch(GSC_SITES_URL, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { connected: false };
    const data = await res.json();
    sites = data.siteEntry || [];
  } catch {
    return { connected: false };
  }

  // Match site — URL-prefix (https://example.com/) or sc-domain:example.com
  const matched = sites.find(s => {
    const u = s.siteUrl || '';
    if (u === `sc-domain:${host}`) return true;
    try {
      const h = new URL(u).hostname.replace(/^www\./, '');
      return h === host;
    } catch {
      return false;
    }
  });

  if (!matched) return { connected: false };

  // Fetch search analytics: last 28 days, top 10 queries
  const endDate   = new Date();
  const startDate = new Date(endDate - 28 * 24 * 60 * 60 * 1000);
  const fmt       = d => d.toISOString().slice(0, 10);

  const queryUrl = `${GSC_SITES_URL}/${encodeURIComponent(matched.siteUrl)}/searchAnalytics/query`;
  let rows;
  try {
    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate:  fmt(startDate),
        endDate:    fmt(endDate),
        dimensions: ['query'],
        rowLimit:   10,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { connected: true, site: matched.siteUrl, rows: [] };
    const data = await res.json();
    rows = data.rows || [];
  } catch {
    return { connected: true, site: matched.siteUrl, rows: [] };
  }

  return { connected: true, site: matched.siteUrl, rows };
}

module.exports = { getGscData };
