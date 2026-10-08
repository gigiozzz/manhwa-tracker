'use strict';

const SITE_CONFIGS = {
  'asurascans.com': {
    patterns: [
      /"chapter_number"\s*:\s*"?(\d+(?:\.\d+)?)"?/gi,
      /chapter[- _](\d+(?:\.\d+)?)/gi,
    ],
    headers: {}
  },
  'asuracomic.net': {
    patterns: [
      /"chapter_number"\s*:\s*"?(\d+(?:\.\d+)?)"?/gi,
      /chapter[- _](\d+(?:\.\d+)?)/gi,
    ],
    headers: {}
  },
  'reaperscans.com': {
    patterns: [
      /chapter[- _](\d+(?:\.\d+)?)/gi,
      /"chapter_number"\s*:\s*"?(\d+(?:\.\d+)?)"?/gi,
    ],
    headers: {}
  },
  'mangakakalot.com': {
    patterns: [
      /chapter[- _](\d+(?:\.\d+)?)/gi,
      /chap[- _]?(\d+(?:\.\d+)?)/gi,
    ],
    headers: {}
  },
  'manhuaus.com': {
    patterns: [
      /chapter[- _](\d+(?:\.\d+)?)/gi,
      /chap[- _]?(\d+(?:\.\d+)?)/gi,
    ],
    headers: {}
  }
};

function getSiteConfig(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return SITE_CONFIGS[host] || null;
  } catch {
    return null;
  }
}

module.exports = { getSiteConfig, SITE_CONFIGS };
