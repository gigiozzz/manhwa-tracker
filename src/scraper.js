'use strict';
const fetch = require('node-fetch');
const { getSiteConfig } = require('./sites');

const CH_PATTERNS = [
  /chapter[- _](\d+(?:\.\d+)?)/gi,
  /chap[- _]?(\d+(?:\.\d+)?)/gi,
  /"chapter_number"\s*:\s*"?(\d+(?:\.\d+)?)"?/gi,
  /ch\.?\s*(\d+(?:\.\d+)?)/gi
];

const PATTERN_LABELS = ['chapter-N', 'chap-N', 'JSON chapter_number', 'ch.N'];

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractMaxChapter(html, patterns) {
  if (!patterns) patterns = CH_PATTERNS;
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  let max = 0;
  let bestIndex = null;
  let bestMatched = null;
  for (let pi = 0; pi < patterns.length; pi++) {
    const pat = patterns[pi];
    const re = new RegExp(pat.source, pat.flags);
    let m;
    while ((m = re.exec(clean)) !== null) {
      const n = parseFloat(m[1]);
      if (n > max && n < 9999 && n > 0) {
        max = n;
        bestIndex = pi;
        bestMatched = m[0];
      }
    }
  }
  return max > 0
    ? { ch: Math.floor(max), patternIndex: bestIndex, matched: bestMatched }
    : { ch: null, patternIndex: null, matched: null };
}

async function scrapeUrl(url, siteConfig) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const headers = Object.assign(
      { 'User-Agent': USER_AGENT },
      siteConfig && siteConfig.headers ? siteConfig.headers : {}
    );
    const patterns = (siteConfig && siteConfig.patterns) ? siteConfig.patterns : CH_PATTERNS;
    const resp = await fetch(url, { signal: controller.signal, headers });
    if (!resp.ok) return { chapter: null, patternLabel: null, matched: null };
    const html = await resp.text();
    if (typeof html !== 'string' || html.length < 200) return { chapter: null, patternLabel: null, matched: null };
    const { ch, patternIndex, matched } = extractMaxChapter(html, patterns);
    let patternLabel = null;
    if (patternIndex != null) {
      patternLabel = patterns === CH_PATTERNS
        ? PATTERN_LABELS[patternIndex]
        : patterns[patternIndex].source.substring(0, 30).replace(/\\\\/g, '\\');
    }
    return { chapter: ch, patternLabel, matched };
  } catch {
    return { chapter: null, patternLabel: null, matched: null };
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
    const siteConfig = getSiteConfig(url);
    const result = await scrapeUrl(url, siteConfig);
    if (result.chapter && result.chapter > 0) {
      return { ch: result.chapter, url, patternLabel: result.patternLabel, matched: result.matched, ok: true };
    }
  }
  return { ch: null, url: null, patternLabel: null, matched: null, ok: false };
}

module.exports = { scrapeUrl, scrapeChapter, extractMaxChapter, CH_PATTERNS, PATTERN_LABELS };
