'use strict';
const express = require('express');
const db = require('../db');
const { scrapeUrl, scrapeChapter } = require('../scraper');

const router = express.Router();

router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const chapter = await scrapeUrl(url);
    res.json({ chapter });
  } catch (e) {
    res.json({ chapter: null });
  }
});

router.get('/bulk', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = data => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const active = db.getActive();
  let updated = 0;
  let errors = 0;

  for (const manhwa of active) {
    if (res.writableEnded) break;
    send({ type: 'progress', id: manhwa.id, title: manhwa.title, status: 'running' });
    try {
      const result = await scrapeChapter(manhwa);
      if (result.ok && result.ch) {
        const isNew = result.ch > manhwa.last_ch;
        if (isNew) {
          db.update(manhwa.id, { last_ch: result.ch });
          updated++;
        }
        send({ type: 'progress', id: manhwa.id, chapter: result.ch, updated: isNew });
      } else {
        errors++;
        send({ type: 'progress', id: manhwa.id, error: 'not found' });
      }
    } catch (e) {
      errors++;
      send({ type: 'progress', id: manhwa.id, error: e.message });
    }
  }

  send({ type: 'done', updated, errors });
  res.end();
});

module.exports = router;
