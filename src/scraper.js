'use strict';
const fetch = require('node-fetch');

const CH_PATTERNS = [
  /chapter[- _](\d+(?:\.\d+)?)/gi,
  /chap[- _]?(\d+(?:\.\d+)?)/gi,
  /"chapter_number"\s*:\s*"?(\d+(?:\.\d+)?)"?/gi,
  /ch\.?\s*(\d+(?:\.\d+)?)/gi
];

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractMaxChapter(html) {
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  let max = 0;
  for (const pat of CH_PATTERNS) {
    let m;
    const re = new RegExp(pat.source, pat.flags);
    while ((m = re.exec(clean)) !== null) {
      const n = parseFloat(m[1]);
      if (n > max && n < 9999 && n > 0) max = n;
    }
  }
  return max > 0 ? Math.floor(max) : null;
}

async function scrapeUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT }
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    if (typeof html !== 'string' || html.length < 200) return null;
    return extractMaxChapter(html);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeChapter(manhwa) {
  const altLinks = Array.isArray(manhwa.alt_links)
    ? manhwa.alt_links
    : JSON.parse(manhwa.alt_links || '[]');
  const urls = [manhwa.main_link, ...altLinks].filter(Boolean);
  for (const url of urls) {
    const ch = await scrapeUrl(url);
    if (ch && ch > 0) return { ch, ok: true };
  }
  return { ch: null, ok: false };
}

module.exports = { scrapeUrl, scrapeChapter, extractMaxChapter };
