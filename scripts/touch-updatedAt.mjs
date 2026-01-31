// scripts/touch-updatedAt.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const list = (process.env.MODIFIED || '')
  .split(/\r?\n/)
  .map(s => s.trim())
  .filter(Boolean);

const re = /^content\/(builds|guides|tools)\/[^/]+\.json$/;

function todayLocalYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
const today = todayLocalYYYYMMDD();

for (const f of list) {
  if (!re.test(f)) continue;
  try {
    const j = JSON.parse(readFileSync(f, 'utf8'));
    j.updatedAt = today;
    writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
    console.log('updatedAt:', f, today);
  } catch (e) {
    console.warn('skip', f, e.message);
  }
}
