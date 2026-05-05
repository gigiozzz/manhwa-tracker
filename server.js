'use strict';
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const COVERS_DIR = path.join(DATA_DIR, 'covers');
const BASE_PATH = (process.env.BASE_PATH || '').replace(/\/$/, '');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(COVERS_DIR, { recursive: true });

const app = express();

app.use(express.json());

// Serve public/ static files (skip index.html so we can inject BASE_PATH)
app.use(BASE_PATH || '/', express.static(path.join(__dirname, 'public'), { index: false }));
app.use(`${BASE_PATH}/covers`, express.static(COVERS_DIR));

// Inject BASE_PATH into index.html at request time
const indexPaths = BASE_PATH ? [BASE_PATH, BASE_PATH + '/'] : ['/'];
app.get(indexPaths, (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  html = html.replace('</head>', `<script>window.BASE_PATH='${BASE_PATH}';</script>\n</head>`);
  res.send(html);
});

app.use(`${BASE_PATH}/api/manhwa`, require('./src/routes/manhwa'));
app.use(`${BASE_PATH}/api/scrape`, require('./src/routes/scrape'));
app.use(`${BASE_PATH}/api/covers`, require('./src/routes/covers'));

app.listen(PORT, () => {
  console.log(`Manhwa Tracker running at http://localhost:${PORT}${BASE_PATH}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
