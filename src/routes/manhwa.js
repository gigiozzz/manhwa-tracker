'use strict';
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.getAll());
});

router.post('/', (req, res) => {
  try {
    const record = db.create(req.body);
    res.status(201).json(record);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const record = db.update(id, req.body);
    if (!record) return res.status(404).json({ error: 'not found' });
    res.json(record);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  db.remove(parseInt(req.params.id));
  res.json({ ok: true });
});

router.post('/import', (req, res) => {
  const list = req.body.manhwa;
  if (!Array.isArray(list)) return res.status(400).json({ error: 'expected { manhwa: [] }' });
  let imported = 0;
  for (const m of list) {
    try {
      db.create({
        title: m.title || '',
        last_ch: m.lastCh || m.last_ch || 0,
        read_ch: m.readCh || m.read_ch || 0,
        release_day: m.releaseDay || m.release_day || '',
        main_link: m.mainLink || m.main_link || '',
        alt_links: m.altLinks || m.alt_links || [],
        status: m.status || 'active',
        cover_path: '',
        custom_cover: m.customCover || m.custom_cover || ''
      });
      imported++;
    } catch {}
  }
  res.json({ imported });
});

module.exports = router;
