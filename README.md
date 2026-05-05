# manhwa-tracker

Personal manhwa/manga tracker with automatic chapter scraping and cover management.

## Features

- Track reading progress across multiple series
- Automatic chapter detection via web scraping
- Bulk scrape all series with real-time SSE progress updates
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

| Method | Path             | Body      | Response                         |
|--------|------------------|-----------|----------------------------------|
| POST   | /api/scrape      | `{ url }` | `{ chapter: number \| null }`    |
| POST   | /api/scrape/bulk | —         | SSE stream                       |

Bulk scrape SSE format:
```
data: {"type":"progress","id":1,"title":"Solo Leveling","chapter":195}
data: {"type":"progress","id":2,"title":"...","error":"timeout"}
data: {"type":"done","updated":18,"errors":2}
```

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
│   ├── scraper.js     # Chapter scraping logic
│   ├── covers.js      # MangaDex fetch + disk storage
│   └── routes/
│       ├── manhwa.js  # CRUD routes
│       ├── scrape.js  # Scrape + bulk SSE routes
│       └── covers.js  # Cover routes
├── public/
│   └── index.html     # Frontend SPA
└── data/              # DB and covers (gitignored)
    ├── tracker.db
    └── covers/
```
