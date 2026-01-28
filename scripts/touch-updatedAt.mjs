// scripts/touch-updatedAt.mjs
import fs from 'fs';

const list = (process.env.MODIFIED||'').split('\n').map(s=>s.trim()).filter(Boolean);
const re = /^content\/(builds|guides|tools)\/.+\.json$/;
const today = new Date().toISOString().slice(0,10);

for (const f of list) {
  if (!re.test(f)) continue;
  try {
    const raw = fs.readFileSync(f,'utf8');
    const j = JSON.parse(raw);
    j.updatedAt = today;
    fs.writeFileSync(f, JSON.stringify(j, null, 2));
    console.log('updatedAt:', f, today);
  } catch(e){ console.warn('skip', f, e.message); }
}
