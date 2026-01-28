import { promises as fs } from 'node:fs';
import path from 'node:path';

const CONTENT = path.resolve('content');

async function readJSON(p){
  try{ return JSON.parse(await fs.readFile(p,'utf8')); }
  catch(e){ return null; }
}
async function ensureDir(p){ await fs.mkdir(path.dirname(p), {recursive:true}); }
async function list(dir){
  try{ return (await fs.readdir(dir)).filter(f=>f.endsWith('.json') && f!=='index.json'); }
  catch{ return []; }
}

async function buildGames(){
  const dir = path.join(CONTENT, 'games');
  const files = await list(dir);
  const items = [];
  for (const f of files){
    const p = path.join(dir, f);
    const data = await readJSON(p) || {};
    const slug = f.replace(/\.json$/, '');
    items.push({ slug, name: data.name, status: data.status, cover: data.cover, short: data.short });
  }
  const out = path.join(dir, 'index.json');
  await ensureDir(out);
  await fs.writeFile(out, JSON.stringify({items}, null, 2));
}

async function buildBuilds(){
  const dir = path.join(CONTENT, 'builds');
  const files = await list(dir);
  const items = [];
  for (const f of files){
    const p = path.join(dir, f);
    const data = await readJSON(p) || {};
    const slug = f.replace(/\.json$/, '');
    let gameName = '';
    if (data.game){
      const gamePath = path.resolve(data.game);
      const g = await readJSON(gamePath);
      gameName = g?.name || '';
    }
    items.push({ slug, title: data.title, tier: data.tier, version: data.version, gameName, cover: data.cover, updatedAt: data.updatedAt });
  }
  const out = path.join(dir, 'index.json');
  await ensureDir(out);
  await fs.writeFile(out, JSON.stringify({items}, null, 2));
}

async function buildGuides(){
  const dir = path.join(CONTENT, 'guides');
  const files = await list(dir);
  const items = [];
  for (const f of files){
    const p = path.join(dir, f);
    const data = await readJSON(p) || {};
    const slug = f.replace(/\.json$/, '');
    let gameName = '';
    if (data.game){
      const gamePath = path.resolve(data.game);
      const g = await readJSON(gamePath);
      gameName = g?.name || '';
    }
    items.push({ slug, title: data.title, resource: data.resource, route: data.route, gameName, date: data.date });
  }
  const out = path.join(dir, 'index.json');
  await ensureDir(out);
  await fs.writeFile(out, JSON.stringify({items}, null, 2));
}

async function buildTools(){
  const dir = path.join(CONTENT, 'tools');
  const files = await list(dir);
  const items = [];
  for (const f of files){
    const p = path.join(dir, f);
    const data = await readJSON(p) || {};
    const slug = f.replace(/\.json$/, '');
    let gameName = '';
    if (data.game){
      const gamePath = path.resolve(data.game);
      const g = await readJSON(gamePath);
      gameName = g?.name || '';
    }
    items.push({ slug, title: data.title, kind: data.kind, url: data.url, notes: data.notes, gameName });
  }
  const out = path.join(dir, 'index.json');
  await ensureDir(out);
  await fs.writeFile(out, JSON.stringify({items}, null, 2));
}

await buildGames();
await buildBuilds();
await buildGuides();
await buildTools();
console.log('Indexes built.');
