// scripts/build-content-index.mjs
import { promises as fs } from 'node:fs';
import path from 'node:path';

const CONTENT = path.resolve('content');

const EXTRA_KEYS = ['items', 'itemList', 'tags', 'urls', 'links', 'body', 'bodyHtml', 'bodyText'];

function pickExtras(src) {
  const out = {};
  for (const k of EXTRA_KEYS) {
    if (src && Object.prototype.hasOwnProperty.call(src, k) && src[k] != null) {
      out[k] = src[k];
    }
  }
  return out;
}

async function readJSON(p) {
  try { return JSON.parse(await fs.readFile(p, 'utf8')); }
  catch { return null; }
}
async function ensureDirForFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}
async function listJSON(dir) {
  try {
    const files = await fs.readdir(dir);
    return files.filter(f => f.endsWith('.json') && f !== 'index.json');
  } catch {
    return [];
  }
}
const fileSlug = (f) => f.replace(/\.json$/, '');
const cmpStr = (a = '', b = '') => a.localeCompare(b, 'fr', { sensitivity: 'base' });
const cmpDateDesc = (a, b) => {
  const aa = (a || '').toString();
  const bb = (b || '').toString();
  return aa < bb ? 1 : aa > bb ? -1 : 0;
};

// ---- utilities to normalize "gameName" ----
// Accepts either a slug ("league-of-legends") or a path ("content/games/league-of-legends.json")
function pathToSlug(maybePath = '') {
  if (!maybePath) return '';
  const m = maybePath.match(/content\/games\/([^/]+)\.json$/i);
  return m ? m[1] : maybePath; // fallback: treat as slug already
}

async function resolveGameMeta(maybePathOrSlug) {
  const slug = pathToSlug(maybePathOrSlug);
  const gameFile = path.join(CONTENT, 'games', `${slug}.json`);
  const g = await readJSON(gameFile);
  return {
    slug,
    name: g?.name || '',
    status: g?.status || 'actif',
    cover: g?.cover || ''
  };
}

// Build a lightweight map of games (slug -> meta) to avoid re-reading many times
async function loadGamesMap() {
  const dir = path.join(CONTENT, 'games');
  const files = await listJSON(dir);
  const map = new Map();
  for (const f of files) {
    const slug = fileSlug(f);
    const data = await readJSON(path.join(dir, f)) || {};
    map.set(slug, {
      slug,
      name: data.name || '',
      status: data.status || 'actif',
      cover: data.cover || ''
    });
  }
  return map;
}

async function buildGames() {
  const dir = path.join(CONTENT, 'games');
  const files = await listJSON(dir);
  const items = [];
  for (const f of files) {
    const p = path.join(dir, f);
    const data = await readJSON(p) || {};
    const slug = fileSlug(f);
    items.push({
      slug,
      name: data.name || '',
      status: data.status || 'actif',
      cover: data.cover || '',
      short: data.short || '',
      publisher: data.publisher || '',
    
      ...pickExtras(data)
    });
  }
  items.sort((a, b) => cmpStr(a.name, b.name));
  const out = path.join(dir, 'index.json');
  await ensureDirForFile(out);
  await fs.writeFile(out, JSON.stringify({ items }, null, 2) + '\n');
}

async function buildBuilds(gamesMap) {
  const dir = path.join(CONTENT, 'builds');
  const files = await listJSON(dir);
  const items = [];
  for (const f of files) {
    const p = path.join(dir, f);
    const data = await readJSON(p) || {};
    const slug = fileSlug(f);
    // Normalize gameName from reference path -> slug
    const gameNameSlug = pathToSlug(data.gameName || data.game || '');
    // Enrich with game meta (status, name)
    const gm = gamesMap.get(gameNameSlug) || (await resolveGameMeta(gameNameSlug));

    items.push({
      slug,
      title: data.title || '',
      tier: data.tier || '',
      version: data.version || '',
      summary: data.summary || '',
      cover: data.cover || '',
      updatedAt: data.updatedAt || '',
      difficulty: data.difficulty || '',
      difficultyStars: data.difficultyStars ?? null,
      cost: data.cost ?? null,
    
      gameName: gm.slug || gameNameSlug,
      gameDisplayName: gm.name || '',
      gameStatus: gm.status || 'actif',
    
      ...pickExtras(data)
    });
  }
  // Sort: updatedAt desc, then title
  items.sort((a, b) => {
    const c = cmpDateDesc(a.updatedAt, b.updatedAt);
    return c !== 0 ? c : cmpStr(a.title, b.title);
  });
  const out = path.join(dir, 'index.json');
  await ensureDirForFile(out);
  await fs.writeFile(out, JSON.stringify({ items }, null, 2) + '\n');
}

async function buildGuides(gamesMap) {
  const dir = path.join(CONTENT, 'guides');
  const files = await listJSON(dir);
  const items = [];
  for (const f of files) {
    const p = path.join(dir, f);
    const data = await readJSON(p) || {};
    const slug = fileSlug(f);
    const gameNameSlug = pathToSlug(data.gameName || data.game || '');
    const gm = gamesMap.get(gameNameSlug) || (await resolveGameMeta(gameNameSlug));

    items.push({
      slug,
      title: data.title || '',
      resource: data.resource || '',
      route: data.route || '',
      cover: data.cover || '',
      date: data.date || '',

      gameName: gm.slug || gameNameSlug,
      gameDisplayName: gm.name || '',
      gameStatus: gm.status || 'actif',
    
      ...pickExtras(data)
    });
  }
  // Sort: date desc, then title
  items.sort((a, b) => {
    const c = cmpDateDesc(a.date, b.date);
    return c !== 0 ? c : cmpStr(a.title, b.title);
  });
  const out = path.join(dir, 'index.json');
  await ensureDirForFile(out);
  await fs.writeFile(out, JSON.stringify({ items }, null, 2) + '\n');
}

async function buildTools(gamesMap) {
  const dir = path.join(CONTENT, 'tools');
  const files = await listJSON(dir);
  const items = [];
  for (const f of files) {
    const p = path.join(dir, f);
    const data = await readJSON(p) || {};
    const slug = fileSlug(f);
    const gameNameSlug = pathToSlug(data.gameName || data.game || '');
    const gm = gamesMap.get(gameNameSlug) || (await resolveGameMeta(gameNameSlug));

    items.push({
      slug,
      title: data.title || '',
      kind: data.kind || '',
      url: data.url || '',
      notes: data.notes || '',
      cover: data.cover || '',

      gameName: gm.slug || gameNameSlug,
      gameDisplayName: gm.name || '',
      gameStatus: gm.status || 'actif',
    
      ...pickExtras(data)
    });
  }
  // Sort: title asc
  items.sort((a, b) => cmpStr(a.title, b.title));
  const out = path.join(dir, 'index.json');
  await ensureDirForFile(out);
  await fs.writeFile(out, JSON.stringify({ items }, null, 2) + '\n');
}

(async () => {
  const gamesMap = await loadGamesMap(); // used to enrich other indexes
  await buildGames();
  await buildBuilds(gamesMap);
  await buildGuides(gamesMap);
  await buildTools(gamesMap);
  console.log('Indexes built.');
})();
