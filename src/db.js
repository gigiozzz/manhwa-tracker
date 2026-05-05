'use strict';
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const db = new Database(path.join(DATA_DIR, 'tracker.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS manhwa (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    last_ch      REAL    DEFAULT 0,
    read_ch      REAL    DEFAULT 0,
    release_day  TEXT    DEFAULT '',
    main_link    TEXT    DEFAULT '',
    alt_links    TEXT    DEFAULT '[]',
    status       TEXT    DEFAULT 'active',
    cover_path   TEXT    DEFAULT '',
    custom_cover TEXT    DEFAULT '',
    created_at   INTEGER DEFAULT (unixepoch())
  )
`);

const INITIAL_DATA = [
  { title: "Skeleton Soldier Couldn't Protect the Dungeon", last_ch: 368, read_ch: 368, release_day: "Mercoledì", main_link: "https://manhwaclan.com/manga/skeleton-soldier-couldnt-protect-the-dungeon/", alt_links: '["https://kingofshojo.com","https://ravenscans.org"]', status: "active" },
  { title: "Return of the First Patriarch", last_ch: 26, read_ch: 26, release_day: "Lun/Mar", main_link: "https://manhwaclan.com/manga/return-of-the-first-patriarch/", alt_links: '["https://kingofshojo.com","https://thunderscans.com"]', status: "active" },
  { title: "The Back-Alley Mage's Return", last_ch: 34, read_ch: 34, release_day: "Sabato", main_link: "https://manhuaus.com/manga/the-back-alley-mages-return/", alt_links: '["https://vortexscans.org","https://kingofshojo.com"]', status: "active" },
  { title: "The Tutorial is Too Hard", last_ch: 255, read_ch: 255, release_day: "Mercoledì", main_link: "https://asurascans.com/manga/the-tutorial-is-too-hard/", alt_links: '["https://kingofshojo.com","https://arenascan.com"]', status: "active" },
  { title: "The Indomitable Martial King", last_ch: 120, read_ch: 120, release_day: "Domenica", main_link: "https://manhuaus.com/manga/the-indomitable-martial-king/", alt_links: '["https://kingofshojo.com"]', status: "active" },
  { title: "Pick Me Up (Infinite Gacha)", last_ch: 188, read_ch: 188, release_day: "Mercoledì", main_link: "https://manhuatop.org/manga/pick-me-up-infinite-gacha/", alt_links: '["https://kingofshojo.com","https://mgeko.cc"]', status: "active" },
  { title: "Unbeatable Dungeon's Lazy Boss Monster", last_ch: 112, read_ch: 100, release_day: "Sabato", main_link: "https://manhuaus.com/manga/unbeatable-dungeons-lazy-boss-monster/", alt_links: '["https://mgeko.cc"]', status: "active" },
  { title: "The Sword God From a Fallen World", last_ch: 48, read_ch: 48, release_day: "Settimanale", main_link: "https://vortexscans.org/manga/the-sword-god-from-a-fallen-world/", alt_links: '["https://manhuaus.com"]', status: "active" },
  { title: "Regressing as the Reincarnated Bastard of the Sword Clan", last_ch: 82, read_ch: 75, release_day: "Mercoledì", main_link: "https://vortexscans.org/manga/regressing-as-the-reincarnated-bastard/", alt_links: '["https://mgeko.cc"]', status: "active" },
  { title: "I Was Just Having Fun With The Time Limit", last_ch: 56, read_ch: 56, release_day: "Gio/Ven", main_link: "https://manhuatop.org/manga/i-was-just-having-fun-with-the-time-limit/", alt_links: '["https://manhwaclan.com"]', status: "active" },
  { title: "Emperor of Solo Play", last_ch: 46, read_ch: 46, release_day: "Sabato", main_link: "https://manhuaus.com/manga/emperor-of-solo-play/", alt_links: '["https://kingofshojo.com"]', status: "active" },
  { title: "The Necromancer Family's Young Heir", last_ch: 56, read_ch: 50, release_day: "Variabile", main_link: "https://manhwaclan.com/manga/the-necromancer-familys-young-heir/", alt_links: '["https://kingofshojo.com"]', status: "hiatus" },
  { title: "The Max-Level Player's 100th Regression", last_ch: 150, read_ch: 150, release_day: "Variabile", main_link: "https://manhuaus.com/manga/the-max-level-players-100th-regression/", alt_links: '["https://mgeko.cc"]', status: "active" },
  { title: "Barbarian's Adventure in a Fantasy World", last_ch: 46, read_ch: 46, release_day: "Variabile", main_link: "https://manhuaus.com/manga/barbarians-adventure-in-a-fantasy-world/", alt_links: '["https://tapas.io"]', status: "active" },
  { title: "Hero X Demon Queen", last_ch: 70, read_ch: 70, release_day: "Variabile", main_link: "https://manhuaus.com/manga/hero-x-demon-queen/", alt_links: '["https://mgeko.cc"]', status: "active" },
  { title: "The Archmage's Restaurant", last_ch: 116, read_ch: 116, release_day: "Settimanale", main_link: "https://manhuatop.org/manga/the-archmages-restaurant/", alt_links: '["https://kingofshojo.com"]', status: "active" },
  { title: "Star-Embracing Swordmaster", last_ch: 109, read_ch: 109, release_day: "Settimanale", main_link: "https://manhuatop.org/manga/star-embracing-swordmaster/", alt_links: '["https://kingofshojo.com"]', status: "active" },
  { title: "Surviving The Game as a Barbarian", last_ch: 143, read_ch: 140, release_day: "Mercoledì", main_link: "https://manhuatop.org/manga/surviving-the-game-as-a-barbarian/", alt_links: '["https://asuracomic.net"]', status: "active" },
  { title: "I Killed an Academy Player", last_ch: 80, read_ch: 80, release_day: "Variabile", main_link: "https://manhuatop.org/manga/i-killed-an-academy-player/", alt_links: '["https://kingofshojo.com"]', status: "active" },
  { title: "Revenge of the Iron-Blooded Sword Hound", last_ch: 149, read_ch: 149, release_day: "Settimanale", main_link: "https://manhuatop.org/manga/revenge-of-the-iron-blooded-sword-hound/", alt_links: '["https://kingofshojo.com"]', status: "active" },
  { title: "Solo Max-Level Newbie", last_ch: 245, read_ch: 245, release_day: "Mercoledì", main_link: "https://manhuatop.org/manga/solo-max-level-newbie/", alt_links: '["https://tappytoon.com"]', status: "active" },
  { title: "From Goblin to Goblin God", last_ch: 88, read_ch: 88, release_day: "Variabile", main_link: "https://manhuatop.org/manga/from-goblin-to-goblin-god/", alt_links: '["https://kingofshojo.com"]', status: "hiatus" },
  { title: "FFF-Class Trashero", last_ch: 172, read_ch: 172, release_day: "—", main_link: "https://manhuatop.org/manga/fff-class-trashero/", alt_links: '["https://kingofshojo.com"]', status: "completed" }
];

function seedInitialData() {
  const insert = db.prepare(`
    INSERT INTO manhwa (title, last_ch, read_ch, release_day, main_link, alt_links, status, cover_path, custom_cover)
    VALUES (@title, @last_ch, @read_ch, @release_day, @main_link, @alt_links, @status, @cover_path, @custom_cover)
  `);
  const insertMany = db.transaction(rows => {
    for (const row of rows) insert.run({ cover_path: '', custom_cover: '', ...row });
  });
  insertMany(INITIAL_DATA);
}

if (db.prepare('SELECT COUNT(*) as n FROM manhwa').get().n === 0) {
  seedInitialData();
}

function parse(row) {
  if (!row) return null;
  return { ...row, alt_links: JSON.parse(row.alt_links || '[]') };
}

function toDb(data) {
  const out = { ...data };
  if (Array.isArray(out.alt_links)) out.alt_links = JSON.stringify(out.alt_links);
  return out;
}

const ALLOWED = ['title', 'last_ch', 'read_ch', 'release_day', 'main_link', 'alt_links', 'status', 'cover_path', 'custom_cover'];

module.exports = {
  getAll() {
    return db.prepare('SELECT * FROM manhwa ORDER BY id').all().map(parse);
  },
  getById(id) {
    return parse(db.prepare('SELECT * FROM manhwa WHERE id = ?').get(id));
  },
  getActive() {
    return db.prepare("SELECT * FROM manhwa WHERE status = 'active' ORDER BY id").all().map(parse);
  },
  create(data) {
    const d = toDb(data);
    const result = db.prepare(`
      INSERT INTO manhwa (title, last_ch, read_ch, release_day, main_link, alt_links, status, cover_path, custom_cover)
      VALUES (@title, @last_ch, @read_ch, @release_day, @main_link, @alt_links, @status, @cover_path, @custom_cover)
    `).run({
      title: d.title || '',
      last_ch: d.last_ch || 0,
      read_ch: d.read_ch || 0,
      release_day: d.release_day || '',
      main_link: d.main_link || '',
      alt_links: d.alt_links || '[]',
      status: d.status || 'active',
      cover_path: d.cover_path || '',
      custom_cover: d.custom_cover || ''
    });
    return this.getById(result.lastInsertRowid);
  },
  update(id, fields) {
    const d = toDb({ ...fields });
    const keys = Object.keys(d).filter(k => ALLOWED.includes(k));
    if (!keys.length) return this.getById(id);
    const set = keys.map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE manhwa SET ${set} WHERE id = @id`).run({ ...d, id });
    return this.getById(id);
  },
  remove(id) {
    db.prepare('DELETE FROM manhwa WHERE id = ?').run(id);
  }
};
