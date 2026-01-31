(function () {
  // =========================
  // CONFIG & VERSION
  // =========================
  const VERSION = 'v11.6';
  const FILE = 'loader.cms.js';
  console.log(`[CMS] ${FILE} ${VERSION}`);

  // =========================
  // ICONS
  // =========================
  const ICONS = {
    eye:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="#9CA3AF" d="M12 5c5.5 0 9.2 4.4 10 6-.8 1.6-4.5 6-10 6S2.8 12.6 2 11c.8-1.6 4.5-6 10-6Zm0 2C8.3 7 5.4 9.7 4.3 11 5.4 12.3 8.3 15 12 15s6.6-2.7 7.7-4C18.6 9.7 15.7 7 12 7Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"/></svg>',
    starFilled:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" aria-hidden="true"><path d="m12 17.3-6.2 3.3 1.2-6.9-5-4.8 6.9-1 3.1-6.3 3.1 6.3 6.9 1-5 4.8 1.2 6.9z"/></svg>',
    starEmpty:
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path stroke="#fbbf24" stroke-width="1.5" d="m12 17.3-6.2 3.3 1.2-6.9-5-4.8 6.9-1 3.1-6.3 3.1 6.3 6.9 1-5 4.8 1.2 6.9z"/></svg>',
    // Pièce avec relief/reflet (lisible sur fond sombre)
    coinFilled:
      '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde047"/><stop offset="1" stop-color="#eab308"/></linearGradient></defs><circle cx="12" cy="12" r="10" fill="url(#g1)"/><circle cx="12" cy="12" r="8" fill="none" stroke="#a16207" stroke-width="1.25"/><path d="M7.5 9.2c1.2-.8 2.9-1.2 4.5-1.2 1.6 0 3.3.4 4.5 1.2" fill="none" stroke="#fef9c3" stroke-opacity=".9" stroke-width="1" stroke-linecap="round"/></svg>',
    coinEmpty:
      '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="#eab308" stroke-width="1.5"/><circle cx="12" cy="12" r="8" fill="none" stroke="#a16207" stroke-width="1.25"/></svg>',
  };

  // =========================
  // Utils (texte / normalisation)
  // =========================
  const Text = {
    rmAccents: (s = '') => s.normalize('NFD').replace(/\p{Diacritic}/gu, ''),
    norm: (s = '') => Text.rmAccents(String(s).toLowerCase().trim()),
    token: (q = '') => Text.norm(q).split(/\s+/).filter(Boolean),
  };

  // =========================
  // VIEWS API (Supabase - Edge Function)
  // =========================
  const ViewsAPI = {
    // ⚠️ On respecte ton URL telle quelle (ne pas modifier ici)
    EDGE_URL: 'https://eiuhpfmgdziqhycgcgsy.supabase.co/functions/v1/views',

    async fetchTotals(keys = []) {
      try {
        if (!keys.length) return new Map();
        const u = new URL(this.EDGE_URL);
        u.searchParams.set('keys', keys.join(','));
        const r = await fetch(u.toString(), { method: 'GET', mode: 'cors' });
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        const out = new Map();
        for (const k of keys) out.set(k, Number(j?.totals?.[k] || 0));
        return out;
      } catch {
        const out = new Map(); keys.forEach(k => out.set(k, 0)); return out;
      }
    },

    async increment(type, slug) {
      try {
        const r = await fetch(this.EDGE_URL, {
          method: 'POST',
          mode: 'cors',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type, slug }),
        });
        if (!r.ok) throw new Error(String(r.status));
        return true;
      } catch { return false; }
    },
  };

  // =========================
  // CMS LOADER
  // =========================
  const CMS = {
    cfg: {
      basePrefix: '/',
      sel: {
        games:  '#games-grid',
        builds: '#builds-grid',
        guides: '#guides-grid',
        tools:  '#tools-grid',
        search: '#search-input',
        nores:  '#no-results',
        sentinel:'#infinite-sentinel',
      },
      endpoints: {
        gamesIndex:  'content/games/index.json',
        buildsIndex: 'content/builds/index.json',
        guidesIndex: 'content/guides/index.json',
        toolsIndex:  'content/tools/index.json',
      },
      page: 'auto',
      pageSize: 24,
    },

    state: {
      indexes:   { games: null, builds: null, guides: null, tools: null },
      observers: { list: null, gameCols: null },
    },

    // ---------- Boot ----------
    init() {
      // Base prefix (ex. /Tools/ sur GitHub Pages)
      const parts = location.pathname.split('/').filter(Boolean);
      this.cfg.basePrefix = parts.length > 0 ? `/${parts[0]}/` : '/';

      // Absolutiser les endpoints
      const abs = (p) => (/^https?:\/\//i.test(p) ? p : this.cfg.basePrefix + p.replace(/^\//, ''));
      Object.keys(this.cfg.endpoints).forEach((k) => {
        this.cfg.endpoints[k] = abs(this.cfg.endpoints[k]);
      });

      // Quelle page ? meta ou autodetect
      const hinted = document.querySelector('meta[name="cms:page"]')?.content?.trim();
      this.cfg.page = hinted || this.autodetectPage();

      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => this.run());
      else this.run();
    },

    autodetectPage() {
      if (document.querySelector(this.cfg.sel.games))  return 'games';
      if (document.querySelector(this.cfg.sel.builds)) return 'builds';
      if (document.querySelector(this.cfg.sel.guides)) return 'guides';
      if (document.querySelector(this.cfg.sel.tools))  return 'tools';
      if (new URL(location.href).searchParams.get('type')) return 'detail';
      return 'home';
    },

    // ---------- HTTP ----------
    async fetchJSON(url) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error(r.status);
        const j = await r.json();
        return Array.isArray(j) ? { items: j } : j;
      } catch { return null; }
    },

    async loadIndex(key) {
      if (this.state.indexes[key]) return this.state.indexes[key];
      const url = this.cfg.endpoints[`${key}Index`];
      const j = await this.fetchJSON(url);
      const idx = j?.items || [];
      this.state.indexes[key] = idx;
      return idx;
    },

    normalizeAsset(src) {
      if (!src) return '';
      if (/^https?:\/\//i.test(src)) return src;
      return src.startsWith('/') ? src.replace(/^\//, this.cfg.basePrefix) : this.cfg.basePrefix + src;
    },

    // util: path "content/games/xxx.json" -> "xxx"
    pathToSlug(s = '') {
      const m = String(s).match(/content\/games\/([^/]+)\.json$/i);
      return m ? m[1] : (s || '');
    },

    // ---------- Templates ----------
    tpl: {
      img(src, alt) {
        const safeAlt = (alt || '').replace(/"/g, '"');
        if (!src) return '<div class="media-ph"></div>';
        const url = CMS.normalizeAsset(src);
        return `${url}`;
      },

      badge(t, cls = 'badge-pill') { return `<span class="${cls}">${t}</span>`; },

      gameCard(g, href, views = 0) {
        return `${href}
          <div class="card-media">
            ${g.cover ? CMS.tpl.img(g.cover, g.name) : '<div class="media-ph"></div>'}
            <div class="media-grad"></div>
            <div style="position:absolute;top:10px;left:10px;">${CMS.tpl.badge(g.status || 'Actif')}</div>
          </div>
          <div class="card-body">
            ${g.publisher ? `<div class="publisher">${String(g.publisher).toUpperCase()}</div>` : ''}
            <div class="title">${g.name || ''}</div>
            ${g.short ? `<p class="excerpt">${g.short}</p>` : ''}
          </div>
          <div class="card-foot">
            <span class="metric"><span class="icon">${ICONS.eye}</span><span>${views.toLocaleString('fr-FR')}</span></span>
          </div>
        </a>`;
      },

      buildCard(b, href, views = 0) {
        const stars = Math.max(1, Math.min(5, Number.isFinite(+b.difficultyStars) && +b.difficultyStars > 0 ? +b.difficultyStars : CMS.starsFromDifficulty(b.difficulty)));
        const coins = Math.max(0, Math.min(5, Number.isFinite(+b.cost) ? +b.cost : 0));
        const starRow = Array.from({ length: 5 }, (_, i) => (i < stars ? ICONS.starFilled : ICONS.starEmpty)).join('');
        const coinRow = Array.from({ length: 5 }, (_, i) => (i < coins ? ICONS.coinFilled : ICONS.coinEmpty)).join('');
        const pub = (b.gameDisplayName || b.gameName || '').toString().toUpperCase();

        return `${href}
          <div class="card-media">
            ${b.cover ? CMS.tpl.img(b.cover, b.title) : '<div class="media-ph"></div>'}
            <div class="media-grad"></div>
            ${b.tier ? `<div style="position:absolute;top:10px;left:10px;">${CMS.tpl.badge(b.tier, 'badge-pill badge-tier')}</div>` : ''}
            ${pub ? `<div style="position:absolute;bottom:10px;left:12px;" class="publisher">${pub}</div>` : ''}
          </div>
          <div class="card-body">
            <div class="title">${b.title || ''}</div>
            ${b.summary ? `<p class="excerpt">${b.summary}</p>` : ''}
          </div>
          <div class="card-foot">
            <span class="metric"><span class="icon">${ICONS.eye}</span><span>${views.toLocaleString('fr-FR')}</span></span>
            <span class="metric">${starRow}</span>
            <span class="metric">${coinRow}</span>
          </div>
        </a>`;
      },

      guideCard(x, href, views = 0) {
        const pub = (x.gameDisplayName || x.gameName || '').toString().toUpperCase();
        return `${href}
          <div class="card-media">
            ${x.cover ? CMS.tpl.img(x.cover, x.title) : '<div class="media-ph"></div>'}
            <div class="media-grad"></div>
            ${pub ? `<div style="position:absolute;bottom:10px;left:12px;" class="publisher">${pub}</div>` : ''}
          </div>
          <div class="card-body">
            <div class="title">${x.title || ''}</div>
            ${x.resource ? `<p class="excerpt">Ressource : <strong>${x.resource}</strong></p>` : ''}
            ${x.route ? `<p class="excerpt">${x.route}</p>` : ''}
          </div>
          <div class="card-foot">
            <span class="metric"><span class="icon">${ICONS.eye}</span><span>${views.toLocaleString('fr-FR')}</span></span>
          </div>
        </a>`;
      },

      toolCard(t, href, views = 0) {
        const pub = (t.gameDisplayName || t.gameName || '').toString().toUpperCase();
        return `${href}
          <div class="card-media">
            ${t.cover ? CMS.tpl.img(t.cover, t.title) : '<div class="media-ph"></div>'}
            <div class="media-grad"></div>
            ${t.kind ? `<div style="position:absolute;top:10px;left:10px;">${CMS.tpl.badge(t.kind)}</div>` : ''}
          </div>
          <div class="card-body">
            <div class="title">${t.title || ''}</div>
            ${pub ? `<div class="publisher" style="margin-top:2px;">${pub}</div>` : ''}
            ${t.notes ? `<p class="excerpt" style="margin-top:6px;">${t.notes}</p>` : ''}
          </div>
          <div class="card-foot">
            <span class="metric"><span class="icon">${ICONS.eye}</span><span>${views.toLocaleString('fr-FR')}</span></span>
          </div>
        </a>`;
      },

      compactCard(item, href, rightSmall = '') {
        const thumb = item.cover
          ? CMS.tpl.img(item.cover, item.title || item.name)
          : '<div class="media-ph" style="width:100%;height:100%"></div>';
        const title = item.title || item.name || '';
        const meta = item.gameDisplayName || item.gameName || item.kind || '';
        return `${href}
          <div class="thumb">${thumb}</div>
          <div class="meta">
            <div class="title">${title}</div>
            ${meta ? `<div class="small">${meta}</div>` : ''}
          </div>
          ${rightSmall ? `<div class="small" style="margin-left:auto;">${rightSmall}</div>` : ''}
        </a>`;
      },
    },

    // ---------- Helpers ----------
    starsFromDifficulty(diff) {
      if (!diff) return 3;
      const d = String(diff).toLowerCase();
      if (/facile/.test(d)) return 2;
      if (/moyen/.test(d)) return 3;
      if (/diffic/.test(d)) return 4;
      if (/expert/.test(d)) return 5;
      const n = parseInt(diff, 10);
      return isFinite(n) ? Math.max(1, Math.min(5, n)) : 3;
    },

    buildHref(type, slug) {
      return `detail.html?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`;
    },

    // ---------- RUN ----------
    async run() {
      switch (this.cfg.page) {
        case 'games':  await this.setupListPage('games');  break;
        case 'builds': await this.setupListPage('builds'); break;
        case 'guides': await this.setupListPage('guides'); break;
        case 'tools':  await this.setupListPage('tools');  break;
        case 'detail': await this.renderDetail();          break;
        case 'home':
        default: break;
      }
    },

    // ======================================
    // =========== LIST PAGES ===============
    // ======================================
    async setupListPage(type) {
      const [items, games] = await Promise.all([this.loadIndex(type), this.loadIndex('games')]);
      this.setupFilterOptions(type, games);

      const state = { all: items.slice(), filtered: [], cursor: 0, pageSize: this.cfg.pageSize };

      const root      = document.querySelector(this.cfg.sel[type]);
      const nores     = document.querySelector(this.cfg.sel.nores);
      const sentinel  = document.querySelector(this.cfg.sel.sentinel);
      const searchInp = document.querySelector(this.cfg.sel.search);
      const obs       = this.state.observers;

      const apply = () => {
        const query   = searchInp?.value || '';
        const filters = this.readFilters(type);

        const res = this.filterItems(type, state.all, query, filters);
        state.filtered = res;
        state.cursor   = 0;
        root.innerHTML = '';
        nores.hidden   = res.length > 0;

        this.renderNextBatch(type, state, root).then(() => {
          window.dispatchEvent(new CustomEvent('content:updated', { detail: { section: type } }));
        });
      };

      let t = null;
      const onSearch = () => { clearTimeout(t); t = setTimeout(apply, 200); };
      if (searchInp) searchInp.addEventListener('input', onSearch);
      this.bindFilterEvents(type, apply);

      if (obs.list) { try { obs.list.disconnect(); } catch {} }
      if (sentinel) {
        obs.list = new IntersectionObserver(async (entries) => {
          for (const ent of entries) if (ent.isIntersecting) await this.renderNextBatch(type, state, root);
        }, { root: null, rootMargin: '800px 0px', threshold: 0 });
        obs.list.observe(sentinel);
      }

      apply();
    },

    setupFilterOptions(type, games) {
      const gameSel = document.getElementById('filter-game');
      if (gameSel && Array.isArray(games)) {
        const opts = ['<option value="">Jeu: Tous</option>'].concat(
          games.map(g => `<option value="${g.slug}">${g.name}</option>`)
        );
        gameSel.innerHTML = opts.join('');
      }
    },

    readFilters(type) {
      const o = {};
      const arch = document.getElementById('toggle-archived');
      o.includeArchived = !!arch?.checked;

      if (type !== 'games') {
        const g = document.getElementById('filter-game');   if (g) o.game = g.value || '';
      }
      if (type === 'builds') {
        const t = document.getElementById('filter-tier');   if (t) o.tier = t.value || '';
        const v = document.getElementById('filter-version');if (v) o.version = v.value?.trim() || '';
      }
      if (type === 'tools') {
        const k = document.getElementById('filter-kind');   if (k) o.kind = k.value || '';
      }
      if (type === 'games') {
        const s = document.getElementById('filter-status'); if (s) o.status = s.value || '';
      }
      return o;
    },

    // ---- Recherche générique (blob) ----
    flattenForSearch(it) {
      const out = [];
      const seen = new Set();
      const walk = (v) => {
        if (v == null) return;
        const t = typeof v;
        if (t === 'string' || t === 'number' || t === 'boolean') { out.push(String(v)); return; }
        if (Array.isArray(v)) { v.forEach(walk); return; }
        if (t === 'object') {
          if (seen.has(v)) return;
          seen.add(v);
          for (const [k, val] of Object.entries(v)) {
            if (k.startsWith('_') || k === '__blob') continue;
            walk(val);
          }
        }
      };
      walk(it);
      return out.join(' ');
    },

    getSearchBlob(it) {
      if (it.__blob) return it.__blob;
      const blob = Text.norm(this.flattenForSearch(it));
      Object.defineProperty(it, '__blob', { value: blob, enumerable: false });
      return blob;
    },

    filterItems(type, list, query, filters) {
      const qTokens = Text.token(query);
      const keepArchived = !!filters.includeArchived;

      const keep = (it) => {
        if (type === 'games') {
          const status = String(it.status || '').toLowerCase();
          if (!keepArchived && status === 'archive') return false;
          if (filters.status && status !== String(filters.status)) return false;
        } else {
          const gStatus = String(it.gameStatus || '').toLowerCase();
          if (!keepArchived && gStatus === 'archive') return false;

          if (filters.game && String(it.gameName || '') !== filters.game) return false;
          if (type === 'builds') {
            if (filters.tier && String(it.tier || '') !== filters.tier) return false;
            if (filters.version && !Text.norm(String(it.version || '')).includes(Text.norm(filters.version))) return false;
          }
          if (type === 'tools') {
            if (filters.kind && String(it.kind || '') !== filters.kind) return false;
          }
        }

        if (qTokens.length === 0) return true;
        const hay = this.getSearchBlob(it);
        return qTokens.every(tk => hay.includes(tk));
      };

      return list.filter(keep);
    },

    async renderNextBatch(type, state, root) {
      if (state.cursor >= state.filtered.length) return;

      const to    = Math.min(state.cursor + state.pageSize, state.filtered.length);
      const chunk = state.filtered.slice(state.cursor, to);
      state.cursor = to;

      const singular = type.slice(0, -1); // games->game, builds->build, etc.
      const keys     = chunk.map(it => `${singular}:${it.slug}`);

      let totals = new Map();
      try { totals = await ViewsAPI.fetchTotals(keys); }
      catch { totals = new Map(); keys.forEach(k => totals.set(k, 0)); }

      const html = chunk.map(it => {
        const href = this.buildHref(singular, it.slug);
        const vv   = totals.get(`${singular}:${it.slug}`) || 0;

        if (type === 'games')  return this.tpl.gameCard(it, href, vv);
        if (type === 'builds') return this.tpl.buildCard(it, href, vv);
        if (type === 'guides') return this.tpl.guideCard(it, href, vv);
        if (type === 'tools')  return this.tpl.toolCard(it, href, vv);
        return '';
      }).join('');

      root.insertAdjacentHTML('beforeend', html);
      window.dispatchEvent(new CustomEvent('content:updated', { detail: { section: type, appended: chunk.length } }));
    },

    // ======================================
    // ============== DETAIL =================
    // ======================================
    async renderDetail() {
      const u = new URL(location.href);
      const type = u.searchParams.get('type') || 'game';
      const slug = u.searchParams.get('slug') || '';
      const folder = { game:'games', build:'builds', guide:'guides', tool:'tools' }[type] || 'games';

      const root = document.getElementById('detail-root');
      if (!root) return;

      const fileURL = this.cfg.basePrefix + `content/${folder}/${slug}.json`;
      const data = (await this.fetchJSON(fileURL))?.items ? null : await this.fetchJSON(fileURL);
      let head = data;
      if (!head) {
        const idx = await this.fetchJSON(this.cfg.basePrefix + `content/${folder}/index.json`);
        head = idx?.items?.find(x => String(x.slug||'').toLowerCase() === slug.toLowerCase()) || null;
      }
      if (!head) { root.innerHTML = `<p style="color:#f87171">Contenu introuvable.</p>`; return; }

      try { await ViewsAPI.increment(type, slug); } catch {}

      const title = head.title || head.name || slug;
      let publisher = (head.publisher || head.studio || head.gameDisplayName || head.gameName || '').toString();
      if (type !== 'game') {
        const gslug = this.pathToSlug(head.gameName || '');
        if (gslug) {
          const games = await this.loadIndex('games');
          const g = games.find(x => String(x.slug).toLowerCase() === gslug.toLowerCase());
          publisher = (g?.name || gslug).toString();
        }
      }
      const status   = (type === 'game' ? (head.status || 'Actif') : (head.tier || head.status || ''));
      const coverTag = head.cover ? this.tpl.img(head.cover, title) : '<div class="media-ph"></div>';

      const hero = `
        <div class="hero" style="border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#0f1115">
          <div class="media" style="position:relative;aspect-ratio:16/7;overflow:hidden">
            ${coverTag}
            <div class="overlay" style="position:absolute;inset:0;background:linear-gradient(to top,rgba(15,17,21,.9),rgba(15,17,21,.2))"></div>
            <div class="meta" style="position:absolute;bottom:16px;left:16px;right:16px">
              ${status ? `<span class="badge-pill">${status}</span>` : ''}
              ${publisher ? `<div class="publisher" style="margin-top:8px">${String(publisher).toUpperCase()}</div>` : ''}
              <h1 style="margin:6px 0 0;font-size:1.8rem">${title}</h1>
            </div>
          </div>
        </div>
      `;

      if (type === 'game') {
        const [builds, guides, tools] = await Promise.all([this.loadIndex('builds'), this.loadIndex('guides'), this.loadIndex('tools')]);

        const byGame = (arr) => arr.filter(x => String(x.gameName || '').toLowerCase() === slug.toLowerCase());

        const buildsF = byGame(builds).slice().sort((a, b) => {
          const aa = String(a.updatedAt || ''); const bb = String(b.updatedAt || '');
          return aa < bb ? 1 : aa > bb ? -1 : (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
        });
        const guidesF = byGame(guides).slice().sort((a, b) => {
          const aa = String(a.date || ''); const bb = String(b.date || '');
          return aa < bb ? 1 : aa > bb ? -1 : (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' });
        });
        const toolsF = byGame(tools).slice().sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fr', { sensitivity: 'base' }));

        const keep = (it) => String(it.gameStatus || '').toLowerCase() !== 'archive';
        let showArchived = false;

        const columns = `
          <div class="columns-3" id="game-columns">
            <div class="column" data-col="builds">
              <h3>Builds pour ${title}</h3>
              <div class="list" id="col-builds"></div>
              <p class="empty-hint" id="empty-builds" hidden>Aucun build trouvé.</p>
            </div>
            <div class="column" data-col="guides">
              <h3>Guides pour ${title}</h3>
              <div class="list" id="col-guides"></div>
              <p class="empty-hint" id="empty-guides" hidden>Aucun guide trouvé.</p>
            </div>
            <div class="column" data-col="tools">
              <h3>Outils pour ${title}</h3>
              <div class="list" id="col-tools"></div>
              <p class="empty-hint" id="empty-tools" hidden>Aucun outil trouvé.</p>
            </div>
          </div>
          <div class="hstack" style="gap:12px;margin:12px 2px">
            <label class="switch"><input id="toggle-archived" type="checkbox"/><span>Inclure les archivés</span></label>
            <span class="spinner" id="game-spinner" hidden></span>
          </div>
          <div id="infinite-sentinel" class="infinite-sentinel"></div>
        `;
        root.innerHTML = hero + columns;

        const stateCols = { bAll: buildsF, gAll: guidesF, tAll: toolsF, bCur: 0, gCur: 0, tCur: 0, pageSize: this.cfg.pageSize };
        const elB = () => document.getElementById('col-builds');
        const elG = () => document.getElementById('col-guides');
        const elT = () => document.getElementById('col-tools');
        const emptyB = () => document.getElementById('empty-builds');
        const emptyG = () => document.getElementById('empty-guides');
        const emptyT = () => document.getElementById('empty-tools');
        const spinner = () => document.getElementById('game-spinner');

        const applyArch = () => {
          const filt = (arr) => showArchived ? arr : arr.filter(keep);
          stateCols.bAll = filt(buildsF);
          stateCols.gAll = filt(guidesF);
          stateCols.tAll = filt(toolsF);
          stateCols.bCur = stateCols.gCur = stateCols.tCur = 0;
          elB().innerHTML = ''; elG().innerHTML = ''; elT().innerHTML = '';
          emptyB().hidden = stateCols.bAll.length > 0;
          emptyG().hidden = stateCols.gAll.length > 0;
          emptyT().hidden = stateCols.tAll.length > 0;
          renderMore();
        };

        const renderMore = async () => {
          spinner().hidden = false;

          const take = (arr, cur) => { const to = Math.min(cur + stateCols.pageSize, arr.length); return [arr.slice(cur, to), to]; };
          const [bChunk, bTo] = take(stateCols.bAll, stateCols.bCur);
          const [gChunk, gTo] = take(stateCols.gAll, stateCols.gCur);
          const [tChunk, tTo] = take(stateCols.tAll, stateCols.tCur);
          stateCols.bCur = bTo; stateCols.gCur = gTo; stateCols.tCur = tTo;

          const keys = []
            .concat(bChunk.map(i => `build:${i.slug}`))
            .concat(gChunk.map(i => `guide:${i.slug}`))
            .concat(tChunk.map(i => `tool:${i.slug}`));

          let totals = new Map();
          try { totals = await ViewsAPI.fetchTotals(keys); }
          catch { totals = new Map(); keys.forEach(k => totals.set(k, 0)); }

          const bHTML = bChunk.map(i => this.tpl.compactCard(i, this.buildHref('build', i.slug),  (totals.get(`build:${i.slug}`) || 0).toLocaleString('fr-FR'))).join('');
          const gHTML = gChunk.map(i => this.tpl.compactCard(i, this.buildHref('guide', i.slug), (totals.get(`guide:${i.slug}`) || 0).toLocaleString('fr-FR'))).join('');
          const tHTML = tChunk.map(i => this.tpl.compactCard(i, this.buildHref('tool',  i.slug),  (totals.get(`tool:${i.slug}`)  || 0).toLocaleString('fr-FR'))).join('');

          elB().insertAdjacentHTML('beforeend', bHTML);
          elG().insertAdjacentHTML('beforeend', gHTML);
          elT().insertAdjacentHTML('beforeend', tHTML);

          spinner().hidden = true;
          window.dispatchEvent(new CustomEvent('content:updated', { detail: { section: 'game-columns', appended: bChunk.length + gChunk.length + tChunk.length } }));
        };

        const toggle = document.getElementById('toggle-archived');
        if (toggle) toggle.addEventListener('change', () => { showArchived = !!toggle.checked; applyArch(); });

        const sentinel = document.getElementById('infinite-sentinel');
        if (this.state.observers.gameCols) { try { this.state.observers.gameCols.disconnect(); } catch {} }
        if (sentinel) {
          this.state.observers.gameCols = new IntersectionObserver(async (entries) => {
            for (const ent of entries) if (ent.isIntersecting) await renderMore();
          }, { root: null, rootMargin: '800px 0px', threshold: 0 });
          this.state.observers.gameCols.observe(sentinel);
        }

        applyArch();
        return;
      }

      // détail build/guide/tool : lien vers le jeu
      const gslug = this.pathToSlug((head.gameName || '').toString());
      let gameLinkHtml = '';
      if (gslug) {
        const games = await this.loadIndex('games');
        const g = games.find(x => String(x.slug).toLowerCase() === gslug.toLowerCase());
        const gName = g?.name || gslug.toUpperCase();
        gameLinkHtml = `<p style="margin:12px 0 0">${this.buildHref(Voir la fiche ${gName}</a></p>`;
      }

      let body = '';
      if (type === 'build') {
        const stars = Math.max(1, Math.min(5, Number.isFinite(+head.difficultyStars) && +head.difficultyStars > 0 ? +head.difficultyStars : this.starsFromDifficulty(head.difficulty)));
        const coins = Math.max(0, Math.min(5, Number.isFinite(+head.cost) ? +head.cost : 0));
        const starRow = Array.from({ length: 5 }, (_, i) => (i < stars ? ICONS.starFilled : ICONS.starEmpty)).join('');
        const coinRow = Array.from({ length: 5 }, (_, i) => (i < coins ? ICONS.coinFilled : ICONS.coinEmpty)).join('');
        body += `
          <section class="section"><h3>Difficulté</h3><div class="stars">${starRow}</div></section>
          <section class="section"><h3>Coût</h3><div class="coins">${coinRow}</div></section>
        `;
      }
      if (head.body) body += `<section class="section"><h3>Détails</h3><div class="excerpt">${head.body}</div></section>`;

      root.innerHTML = hero + gameLinkHtml + body;
    },

    // ---------- bind filters ----------
    bindFilterEvents(type, apply) {
      const ids = ['filter-game', 'filter-tier', 'filter-version', 'filter-kind', 'filter-status', 'toggle-archived'];
      ids.forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('change', apply); });
    },
  };

  // expose & boot
  window.CMS_LOADER = CMS;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => CMS.init());
  else CMS.init();
})();
