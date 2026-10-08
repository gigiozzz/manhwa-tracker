'use strict';
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const db = require('../db');
const { SITE_CONFIGS } = require('../sites');
const { CH_PATTERNS, PATTERN_LABELS, SCRAPER_VERSION, TIMEOUT_MS, USER_AGENT } = require('../scraper');

const ROOT = path.join(__dirname, '..', '..');
const STARTED_AT = new Date();

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString().trim();
  } catch {
    return null;
  }
}

// Calcolato all'avvio: rappresenta il codice effettivamente caricato in memoria
const GIT_INFO = {
  commit: process.env.GIT_COMMIT || git('rev-parse HEAD'),
  branch: git('rev-parse --abbrev-ref HEAD'),
  subject: git('log -1 --format=%s'),
  date: git('log -1 --format=%cI'),
  dirtyFiles: (() => {
    const out = git('status --porcelain');
    return out == null ? null : out.split('\n').filter(Boolean);
  })()
};

function fileInfo(rel) {
  try {
    const buf = fs.readFileSync(path.join(ROOT, rel));
    const st = fs.statSync(path.join(ROOT, rel));
    return { sha: crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12), mtime: st.mtime.toISOString() };
  } catch {
    return null;
  }
}

const CODE_FILES = [
  'server.js', 'src/scraper.js', 'src/sites.js', 'src/db.js', 'src/covers.js',
  'src/routes/scrape.js', 'src/routes/manhwa.js', 'public/index.html'
];
// Hash dei file al momento dell'avvio (codice in esecuzione)
const FILES_AT_START = Object.fromEntries(CODE_FILES.map(f => [f, fileInfo(f)]));

function depVersion(name) {
  try {
    return require(path.join(ROOT, 'node_modules', name, 'package.json')).version;
  } catch {
    return null;
  }
}

const router = express.Router();

router.get('/', (req, res) => {
  const pkg = require(path.join(ROOT, 'package.json'));
  const dataDir = path.resolve(process.env.DATA_DIR || './data');
  let dbSize = null;
  try { dbSize = fs.statSync(path.join(dataDir, 'tracker.db')).size; } catch {}
  const all = db.getAll();
  // File modificati su disco dopo l'avvio → serve un riavvio per caricarli
  const changedSinceStart = CODE_FILES.filter(f => {
    const now = fileInfo(f);
    return (now && now.sha) !== (FILES_AT_START[f] && FILES_AT_START[f].sha);
  });

  res.json({
    app: { name: pkg.name, version: pkg.version },
    git: {
      ...GIT_INFO,
      shortCommit: GIT_INFO.commit ? GIT_INFO.commit.slice(0, 7) : null,
      currentHeadOnDisk: git('rev-parse HEAD')
    },
    code: { files: FILES_AT_START, changedSinceStart },
    scraper: {
      version: SCRAPER_VERSION,
      timeoutMs: TIMEOUT_MS,
      userAgent: USER_AGENT,
      sites: Object.keys(SITE_CONFIGS),
      defaultPatterns: CH_PATTERNS.map((p, i) => ({ label: PATTERN_LABELS[i], source: p.source }))
    },
    runtime: {
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      os: `${os.type()} ${os.release()}`,
      hostname: os.hostname(),
      pid: process.pid,
      startedAt: STARTED_AT.toISOString(),
      uptimeSec: Math.round(process.uptime()),
      memoryRssMb: Math.round(process.memoryUsage().rss / 1048576),
      serverTime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cwd: process.cwd()
    },
    env: {
      NODE_ENV: process.env.NODE_ENV || null,
      PORT: process.env.PORT || null,
      BASE_PATH: process.env.BASE_PATH || null,
      DATA_DIR: dataDir
    },
    deps: Object.fromEntries(
      ['express', 'node-fetch', 'better-sqlite3', 'express-session', 'passport'].map(d => [d, depVersion(d)])
    ),
    db: {
      sizeBytes: dbSize,
      total: all.length,
      active: all.filter(m => m.status === 'active').length,
      hiatus: all.filter(m => m.status === 'hiatus').length,
      completed: all.filter(m => m.status === 'completed').length
    }
  });
});

module.exports = router;
