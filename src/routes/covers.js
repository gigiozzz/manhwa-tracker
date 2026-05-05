'use strict';
const express = require('express');
const path = require('path');
const db = require('../db');
const { fetchAndSaveCover, downloadAndSaveCover } = require('../covers');

const router = express.Router();
const COVERS_DIR = path.resolve(process.env.DATA_DIR || './data', 'covers');

router.post('/:id/fetch', async (req, res) => {
  const id = parseInt(req.params.id);
  const manhwa = db.getById(id);
  if (!manhwa) return res.status(404).json({ error: 'not found' });

  const filename = await fetchAndSaveCover(manhwa, COVERS_DIR);
  if (!filename) return res.status(422).json({ error: 'cover not found on MangaDex' });

  const record = db.update(id, { cover_path: filename, custom_cover: '' });
  res.json(record);
});

router.post('/:id/custom', async (req, res) => {
  const id = parseInt(req.params.id);
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const manhwa = db.getById(id);
  if (!manhwa) return res.status(404).json({ error: 'not found' });

  const filename = await downloadAndSaveCover(id, url, COVERS_DIR);
  if (filename) {
    const record = db.update(id, { cover_path: filename, custom_cover: '' });
    return res.json(record);
  }
  // fallback: store URL directly if download fails
  const record = db.update(id, { custom_cover: url });
  res.json(record);
});

module.exports = router;
