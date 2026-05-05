'use strict';
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function fetchAndSaveCover(manhwa, coversDir) {
  try {
    const url = `https://api.mangadex.org/manga?title=${encodeURIComponent(manhwa.title)}&limit=3&contentRating[]=safe&contentRating[]=suggestive&originalLanguage[]=ko&includes[]=cover_art`;
    const r = await fetch(url, { timeout: 10000 });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.data || !data.data.length) return null;
    const cov = data.data[0].relationships.find(x => x.type === 'cover_art');
    if (!cov || !cov.attributes) return null;
    const imgUrl = `https://uploads.mangadex.org/covers/${data.data[0].id}/${cov.attributes.fileName}.512.jpg`;
    return await downloadAndSaveCover(manhwa.id, imgUrl, coversDir);
  } catch {
    return null;
  }
}

async function downloadAndSaveCover(id, url, coversDir) {
  try {
    const r = await fetch(url, { timeout: 15000 });
    if (!r.ok) return null;
    const buffer = await r.buffer();
    if (!buffer || buffer.length < 1000) return null;
    const filename = `${id}.jpg`;
    fs.writeFileSync(path.join(coversDir, filename), buffer);
    return filename;
  } catch {
    return null;
  }
}

module.exports = { fetchAndSaveCover, downloadAndSaveCover };
