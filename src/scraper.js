'use strict';
const fetch = require('node-fetch');
const { getSiteConfig } = require('./sites');

const CH_PATTERNS = [
  /chapter[- _\/](\d+(?:\.\d+)?)/gi,
  /chap[- _\/]?(\d+(?:\.\d+)?)/gi,
  /"chapter_number"\s*:\s*"?(\d+(?:\.\d+)?)"?/gi,
  /ch\.?\s*(\d+(?:\.\d+)?)/gi
];

const PATTERN_LABELS = ['chapter-N', 'chap-N', 'JSON chapter_number', 'ch.N'];

const SCRAPER_VERSION = 4;
const TIMEOUT_MS = 12000;

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

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

// Ultimo segmento non vuoto del path, es. /comics/foo-bar/ -> "foo-bar"
function seriesSlug(url) {
  try {
    const segs = new URL(url).pathname.split('/').filter(Boolean);
    return segs.length ? safeDecode(segs[segs.length - 1]).toLowerCase() : null;
  } catch {
    return null;
  }
}

// Slug candidati: URL originale + URL finale (dopo redirect), con e senza suffisso hash
// (asura cambia periodicamente l'hash finale, es. "-3ec3b16f" -> "-bd5bdaf8")
function seriesSlugs(...urls) {
  const out = new Set();
  for (const u of urls) {
    const slug = seriesSlug(u);
    if (!slug || slug.length < 3) continue;
    out.add(slug);
    const base = slug.replace(/-[0-9a-f]{6,10}$/, '');
    if (base !== slug && base.length >= 8) out.add(base);
  }
  return [...out];
}

// Se l'href appartiene alla serie ritorna la parte dopo lo slug, altrimenti null
function afterSeriesSlug(href, slugs) {
  for (const slug of slugs) {
    const idx = href.indexOf(slug);
    if (idx !== -1) return href.slice(idx + slug.length);
  }
  return null;
}

// Considera solo i link che appartengono alla serie (evita sidebar/widget di altre serie)
function extractFromSeriesLinks(html, slugs) {
  if (typeof slugs === 'string') slugs = [slugs];
  if (!slugs || !slugs.length) return { ch: null, matched: null };
  const hrefRe = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  const chRe = /(?:chapter|chap|ch)[-_ \/.]?(\d+(?:\.\d+)?)/i;
  let max = 0;
  let bestMatched = null;
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    const raw = (m[1] || m[2] || '').replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, '&');
    const href = safeDecode(raw).toLowerCase();
    const rest = afterSeriesSlug(href, slugs);
    if (rest == null) continue;
    const c = chRe.exec(rest);
    if (!c) continue;
    const n = parseFloat(c[1]);
    if (n > max && n < 9999) {
      max = n;
      bestMatched = raw;
    }
  }
  return max > 0 ? { ch: Math.floor(max), matched: bestMatched } : { ch: null, matched: null };
}

function normalizeUrl(url) {
  try { return new URL(url).href.replace(/'/g, '%27'); } catch { return url; }
}

// Top N numeri distinti (desc) con un esempio di match per ciascuno
function topNumbers(entries, n) {
  const seen = new Map();
  for (const e of entries) if (!seen.has(e.n)) seen.set(e.n, e.sample);
  return [...seen.entries()].sort((a, b) => b[0] - a[0]).slice(0, n).map(([num, sample]) => ({ n: num, sample }));
}

// Diagnostica: quali link della serie e quali match per pattern sono stati trovati
function analyze(html, slugs, patterns, labels) {
  const hrefRe = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  const chRe = /(?:chapter|chap|ch)[-_ \/.]?(\d+(?:\.\d+)?)/i;
  let hrefCount = 0, slugHrefs = 0;
  const seriesEntries = [];
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    hrefCount++;
    if (!slugs.length) continue;
    const raw = (m[1] || m[2] || '').replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, '&');
    const href = safeDecode(raw).toLowerCase();
    const rest = afterSeriesSlug(href, slugs);
    if (rest == null) continue;
    slugHrefs++;
    const c = chRe.exec(rest);
    if (c) seriesEntries.push({ n: parseFloat(c[1]), sample: raw });
  }
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  const patternStats = patterns.map((pat, i) => {
    const re = new RegExp(pat.source, pat.flags);
    const entries = [];
    let pm;
    while ((pm = re.exec(clean)) !== null) {
      const n = parseFloat(pm[1]);
      if (n > 0 && n < 9999) entries.push({ n, sample: pm[0] });
    }
    return { label: labels[i], count: entries.length, top: topNumbers(entries, 5) };
  });
  return {
    hrefCount,
    slugHrefs,
    seriesLinks: { count: seriesEntries.length, top: topNumbers(seriesEntries, 5) },
    patterns: patternStats
  };
}

function pageTitle(html) {
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return t ? t[1].trim().slice(0, 150) : null;
}

function detectBlock(html, status) {
  if (/Just a moment\.\.\.|cf-chl|challenges\.cloudflare\.com|cf_chl_opt/i.test(html)) return 'cloudflare-challenge';
  if (/captcha/i.test(html) && html.length < 20000) return 'captcha';
  if (status === 403) return 'forbidden';
  return null;
}

function textSnippet(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400);
}

async function scrapeUrl(url, siteConfig) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  const fetchUrl = normalizeUrl(url);
  const patterns = (siteConfig && siteConfig.patterns) ? siteConfig.patterns : CH_PATTERNS;
  const labels = patterns === CH_PATTERNS
    ? PATTERN_LABELS
    : patterns.map(p => p.source.substring(0, 30).replace(/\\\\/g, '\\'));
  const debug = {
    url,
    fetchUrl,
    siteConfig: siteConfig ? siteConfig.host : null,
    slugs: seriesSlugs(url),
    status: null,
    finalUrl: null,
    redirected: false,
    redirectedTo: null,
    contentType: null,
    server: null,
    htmlLength: null,
    pageTitle: null,
    blocked: null,
    elapsedMs: null,
    method: null,
    error: null,
    analysis: null,
    snippet: null
  };
  const fail = () => {
    debug.elapsedMs = Date.now() - t0;
    return { chapter: null, patternLabel: null, matched: null, debug };
  };
  try {
    const headers = Object.assign(
      { 'User-Agent': USER_AGENT },
      siteConfig && siteConfig.headers ? siteConfig.headers : {}
    );
    const resp = await fetch(fetchUrl, { signal: controller.signal, headers });
    debug.status = resp.status;
    debug.finalUrl = resp.url;
    debug.redirected = resp.url !== fetchUrl;
    // Redirect "significativo" (non solo slash finale): il link salvato andrebbe aggiornato
    if (debug.redirected && resp.url.replace(/\/$/, '') !== fetchUrl.replace(/\/$/, '')) {
      debug.redirectedTo = resp.url;
    }
    debug.contentType = resp.headers.get('content-type');
    debug.server = [resp.headers.get('server'), resp.headers.get('cf-ray') ? 'cf-ray' : null].filter(Boolean).join(' ') || null;
    const html = await resp.text();
    debug.htmlLength = html.length;
    debug.pageTitle = pageTitle(html);
    debug.blocked = detectBlock(html, resp.status);
    if (!resp.ok) {
      debug.error = `HTTP ${resp.status} ${resp.statusText}`;
      debug.snippet = textSnippet(html);
      return fail();
    }
    if (html.length < 200) {
      debug.error = 'html troppo corto';
      debug.snippet = textSnippet(html);
      return fail();
    }
    debug.slugs = seriesSlugs(url, resp.url);
    debug.analysis = analyze(html, debug.slugs, patterns, labels);
    const scoped = extractFromSeriesLinks(html, debug.slugs);
    if (scoped.ch) {
      debug.method = 'series-link';
      debug.elapsedMs = Date.now() - t0;
      return { chapter: scoped.ch, patternLabel: 'series-link', matched: scoped.matched, debug };
    }
    // Il massimo sull'intera pagina include sidebar/widget di altre serie: lo evitiamo
    // quando il sito ha sempre i link della serie o quando la pagina ne contiene
    if ((siteConfig && siteConfig.seriesLinksOnly) || debug.analysis.slugHrefs > 0) {
      debug.error = siteConfig && siteConfig.seriesLinksOnly
        ? 'nessun link capitolo della serie (seriesLinksOnly)'
        : 'link della serie senza numero capitolo';
      return fail();
    }
    const { ch, patternIndex, matched } = extractMaxChapter(html, patterns);
    if (!ch) {
      debug.error = 'nessun match';
      debug.snippet = textSnippet(html);
      return fail();
    }
    debug.method = 'pattern-max';
    debug.elapsedMs = Date.now() - t0;
    return { chapter: ch, patternLabel: labels[patternIndex], matched, debug };
  } catch (e) {
    debug.error = e.name === 'AbortError' ? `timeout ${TIMEOUT_MS}ms` : `${e.name}: ${e.message}`;
    return fail();
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeChapter(manhwa) {
  const altLinks = Array.isArray(manhwa.alt_links)
    ? manhwa.alt_links
    : JSON.parse(manhwa.alt_links || '[]');
  const urls = [manhwa.main_link, ...altLinks].filter(Boolean);
  const attempts = [];
  let blocked = null;
  const redirects = [];
  for (const url of urls) {
    const siteConfig = getSiteConfig(url);
    const result = await scrapeUrl(url, siteConfig);
    attempts.push({ ...result.debug, chapter: result.chapter, patternLabel: result.patternLabel, matched: result.matched });
    if (result.debug.blocked && !blocked) blocked = result.debug.blocked;
    if (result.debug.redirectedTo) redirects.push({ from: url, to: result.debug.redirectedTo });
    if (result.chapter && result.chapter > 0) {
      return { ch: result.chapter, url, patternLabel: result.patternLabel, matched: result.matched, ok: true, error: null, blocked, redirects, attempts };
    }
  }
  let error = urls.length ? 'not found' : 'nessun link configurato';
  if (blocked) {
    error = attempts.every(a => a.blocked)
      ? `bloccato (${blocked})${urls.length === 1 ? ': aggiungi un link alternativo' : ' su tutti i link'}`
      : `not found (un link bloccato: ${blocked})`;
  }
  return { ch: null, url: null, patternLabel: null, matched: null, ok: false, error, blocked, redirects, attempts };
}

module.exports = {
  scrapeUrl, scrapeChapter, extractMaxChapter, extractFromSeriesLinks, seriesSlug, seriesSlugs,
  CH_PATTERNS, PATTERN_LABELS, SCRAPER_VERSION, TIMEOUT_MS, USER_AGENT
};
