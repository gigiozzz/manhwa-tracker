'use strict';
const express = require('express');
const db = require('../db');
const { scrapeUrl, scrapeChapter } = require('../scraper');

const router = express.Router();

router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const result = await scrapeUrl(url);
    res.json({ chapter: result.chapter });
  } catch {
    res.json({ chapter: null });
  }
});

router.post('/preview', async (req, res) => {
  const id = parseInt(req.body.id);
  if (!id) return res.status(400).json({ error: 'id required' });
  const manhwa = db.getById(id);
  if (!manhwa) return res.status(404).json({ error: 'not found' });
  try {
    const result = await scrapeChapter(manhwa);
    res.json({
      id: manhwa.id,
      title: manhwa.title,
      old_ch: manhwa.last_ch,
      new_ch: result.ch,
      url: result.url,
      patternLabel: result.patternLabel,
      matched: result.matched,
      ok: result.ok,
      error: result.error,
      blocked: result.blocked,
      redirects: result.redirects,
      attempts: result.attempts
    });
  } catch (e) {
    res.json({
      id: manhwa.id, title: manhwa.title, old_ch: manhwa.last_ch,
      new_ch: null, url: null, patternLabel: null, matched: null,
      ok: false, error: e.message
    });
  }
});

router.get('/preview/bulk', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = data => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const active = db.getActive();
  let found = 0, errors = 0;

  for (const manhwa of active) {
    if (res.writableEnded) break;
    send({ type: 'progress', id: manhwa.id, title: manhwa.title, status: 'running' });
    try {
      const result = await scrapeChapter(manhwa);
      if (result.ok) found++; else errors++;
      send({
        type: 'progress',
        id: manhwa.id, title: manhwa.title,
        old_ch: manhwa.last_ch, new_ch: result.ch,
        url: result.url,
        patternLabel: result.patternLabel,
        matched: result.matched,
        ok: result.ok,
        error: result.error,
        blocked: result.blocked,
        redirects: result.redirects,
        attempts: result.attempts
      });
    } catch (e) {
      errors++;
      send({
        type: 'progress',
        id: manhwa.id, title: manhwa.title,
        old_ch: manhwa.last_ch, new_ch: null, url: null,
        patternLabel: null, matched: null, ok: false, error: e.message
      });
    }
  }

  send({ type: 'done', total: active.length, found, errors });
  res.end();
});

module.exports = router;
