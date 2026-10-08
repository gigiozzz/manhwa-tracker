# manhwa-tracker

Personal manhwa/manga tracker with automatic chapter scraping and cover management.

## Features

- Track reading progress across multiple series
- Automatic chapter detection via web scraping (site-specific regex patterns per hostname)
- Scraping approval workflow: preview results (old ch, new ch, URL, matched regex) before saving
- Bulk preview all active series via SSE — no DB writes until you approve each result
- Cover images fetched from MangaDex or custom URLs
- Import existing data from localStorage (`mtracker_v5` format)

## Tech Stack

- **Backend**: Node.js + Express, SQLite (`better-sqlite3`), `node-fetch`
- **Frontend**: Vanilla JS + HTML/CSS, Google Fonts (Cinzel + Rajdhani)

## Setup

```bash
npm install
cp .env.example .env
# edit .env if needed
node server.js
```

Open `http://localhost:3000` (or the configured PORT).

## Environment Variables

```bash
PORT=3000
DATA_DIR=./data   # stores tracker.db and covers/
```

`DATA_DIR` is created automatically on first run.

## API Reference

### Manhwa CRUD

| Method | Path            | Body                   | Response              |
|--------|-----------------|------------------------|-----------------------|
| GET    | /api/manhwa     | —                      | Array of all records  |
| POST   | /api/manhwa     | `{ title, ...fields }` | Created record        |
| PUT    | /api/manhwa/:id | Fields to update       | Updated record        |
| DELETE | /api/manhwa/:id | —                      | `{ ok: true }`        |

### Scraping

| Method | Path                     | Body      | Response                              |
|--------|--------------------------|-----------|---------------------------------------|
| POST   | /api/scrape              | `{ url }` | `{ chapter: number \| null }`         |
| POST   | /api/scrape/preview      | `{ id }`  | Single-series preview (no DB write)   |
| GET    | /api/scrape/preview/bulk | —         | SSE stream preview (no DB writes)     |

Preview bulk SSE format:
```
data: {"type":"progress","id":1,"title":"Solo Leveling","status":"running"}
data: {"type":"progress","id":1,"title":"Solo Leveling","old_ch":194,"new_ch":195,"url":"...","patternLabel":"chapter-N","matched":"chapter-195","ok":true}
data: {"type":"done","total":20,"found":18,"errors":2}
```

Chapters are saved only when the user explicitly approves a row via `PUT /api/manhwa/:id`.

### Covers

| Method | Path                    | Body      | Response                         |
|--------|-------------------------|-----------|----------------------------------|
| POST   | /api/covers/:id/fetch   | —         | Fetches from MangaDex, saves     |
| POST   | /api/covers/:id/custom  | `{ url }` | Downloads URL, saves             |
| GET    | /covers/:filename       | —         | Static image file                |

### Import

| Method | Path        | Body                | Response          |
|--------|-------------|---------------------|-------------------|
| POST   | /api/import | `{ manhwa: [...] }` | `{ imported: N }` |

## Project Structure

```
manhwa-tracker/
├── server.js          # Express entry point
├── src/
│   ├── db.js          # SQLite init, schema, query helpers
│   ├── scraper.js     # Chapter scraping + regex extraction
│   ├── sites.js       # Per-hostname scraping config (patterns, headers)
│   ├── covers.js      # MangaDex fetch + disk storage
│   └── routes/
│       ├── manhwa.js  # CRUD routes
│       ├── scrape.js  # Scrape preview routes (single + bulk SSE)
│       └── covers.js  # Cover routes
├── public/
│   └── index.html     # Frontend SPA
└── data/              # DB and covers (gitignored)
    ├── tracker.db
    └── covers/
```

## Adding a New Site

Add an entry to `SITE_CONFIGS` in `src/sites.js`:

```js
'example.com': {
  patterns: [/chapter[- _](\d+(?:\.\d+)?)/gi],
  headers: {}
}
```

The key is the bare hostname (no `www.`). `patterns` overrides the default 4-pattern set for that site.
