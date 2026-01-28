(function () {
  const CMS = {
    cfg: {
      gamesIndex: '/content/games/index.json',
      buildsIndex: '/content/builds/index.json',
      guidesIndex: '/content/guides/index.json',
      toolsIndex:  '/content/tools/index.json',
      sel: {
        games:  '#games-grid',
        builds: '#builds-grid',
        guides: '#guides-grid',
        tools:  '#tools-grid'
      },
      clearHardcode: true,
      basePrefix: '/'
    },

    init(userCfg) {
      // 1) Auto-détecte le préfixe (Project Pages => /<repo>/ ; User Pages => /)
      const parts = location.pathname.split('/').filter(Boolean);
      this.cfg.basePrefix = parts.length > 0 ? `/${parts[0]}/` : '/';

      // 2) Merge user config (BUG FIX: userCfg || {})
      this.cfg = Object.assign({}, this.cfg, userCfg || {});

      // 3) Normalise les endpoints (évite les /... absolus hors /<repo>/)
      const norm = (p) => {
        if (!p) return '';
        if (/^https?:\/\//i.test(p)) return p;                 // URL absolue OK
        if (p.startsWith('/')) return p.replace(/^\//, this.cfg.basePrefix); // /x -> /<repo>/x
        return this.cfg.basePrefix + p;                        // relatif -> /<repo>/x
      };
      this.cfg.gamesIndex  = norm(this.cfg.gamesIndex);
      this.cfg.buildsIndex = norm(this.cfg.buildsIndex);
      this.cfg.guidesIndex = norm(this.cfg.guidesIndex);
      this.cfg.toolsIndex  = norm(this.cfg.toolsIndex);

      // 4) Lance après DOM ready
      document.addEventListener('DOMContentLoaded', () => this.run());
    },

    async run() {
      const { sel } = this.cfg;
      const jobs = [];
      if (document.querySelector(sel.games))  jobs.push(this.renderGames());
      if (document.querySelector(sel.builds)) jobs.push(this.renderBuilds());
      if (document.querySelector(sel.guides)) jobs.push(this.renderGuides());
      if (document.querySelector(sel.tools))  jobs.push(this.renderTools());
      // Logs utiles
      console.log('[CMS] endpoints', {
        games:  this.cfg.gamesIndex,
        builds: this.cfg.buildsIndex,
        guides: this.cfg.guidesIndex,
        tools:  this.cfg.toolsIndex
      });
      await Promise.allSettled(jobs);
    },

    async fetchJSON(url) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const j = await res.json();
        // tolère les 2 formats: tableau direct OU {items:[...]}
        return Array.isArray(j) ? { items: j } : j;
      } catch (e) {
        console.warn('[CMS] fetch failed:', url, e);
        return null;
      }
    },

    clear(sel) {
      if (!this.cfg.clearHardcode) return;
      const el = document.querySelector(sel);
      if (el) el.innerHTML = '';
    },

    // ---------------- Renderers ----------------
    async renderGames() {
      const idx = await this.fetchJSON(this.cfg.gamesIndex);
      if (!idx || !idx.items) return;
      this.clear(this.cfg.sel.games);
      const root = document.querySelector(this.cfg.sel.games);
      root.innerHTML = idx.items.map(CMS.tpl.gameCard).join('');
    },

    async renderBuilds() {
      const idx = await this.fetchJSON(this.cfg.buildsIndex);
      if (!idx || !idx.items) return;
      this.clear(this.cfg.sel.builds);
      const root = document.querySelector(this.cfg.sel.builds);
      root.innerHTML = idx.items.map(CMS.tpl.buildCard).join('');
    },

    async renderGuides() {
      const idx = await this.fetchJSON(this.cfg.guidesIndex);
      if (!idx || !idx.items) return;
      this.clear(this.cfg.sel.guides);
      const root = document.querySelector(this.cfg.sel.guides);
      root.innerHTML = idx.items.map(CMS.tpl.guideCard).join('');
    },

    async renderTools() {
      const idx = await this.fetchJSON(this.cfg.toolsIndex);
      if (!idx || !idx.items) return;
      this.clear(this.cfg.sel.tools);
      const root = document.querySelector(this.cfg.sel.tools);
      root.innerHTML = idx.items.map(CMS.tpl.toolCard).join('');
    },

    // ---------------- Templates ----------------
    tpl: {
      // NOTE: pas de "/" initial sur src -> laisse le chemin tel quel
      gameCard: (g) => `
        <article class="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden h-full flex flex-col">
          <div class="relative aspect-video overflow-hidden">
            ${g.cover ? `<img alt="${g.name||''}" src="${g.cover}" class="h-full w-full object-cover">` : ''}
          </div>
          <div class="p-4 flex-grow">
            <h3 class="text-xl font-bold mb-2">${g.name||''}</h3>
            ${g.short ? `<p class="text-sm text-muted-foreground">${g.short}</p>` : ''}
          </div>
        </article>`,

      buildCard: (b) => `
        <article class="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden h-full flex flex-col">
          <div class="relative aspect-video overflow-hidden">
            ${b.cover ? `<img alt="${b.title||''}" src="${b.cover}" class="h-full w-full object-cover">` : ''}
            ${b.tier ? `<div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold absolute top-3 left-3" style="background:#10b981;color:#000;">${b.tier}</div>`: ''}
          </div>
          <div class="p-4 flex-grow">
            <h3 class="text-xl font-bold mb-2">${b.title||''}</h3>
            ${b.gameName ? `<p class="text-xs text-primary uppercase">${b.gameName}</p>` : ''}
          </div>
          <div class="px-4 py-3 border-t border-border bg-muted/30 flex justify-between items-center">
            <div class="text-[10px] text-muted-foreground">${b.updatedAt ? `Mis à jour le ${b.updatedAt}` : ''}</div>
          </div>
        </article>`,

      guideCard: (x) => `
        <article class="rounded-lg border bg-card text-card-foreground shadow-sm p-4 h-full flex flex-col">
          <h3 class="text-lg font-bold">${x.title||''}</h3>
          ${x.gameName? `<div class="text-xs text-muted-foreground uppercase mt-1">${x.gameName}</div>`:''}
          ${x.resource? `<div class="mt-2 text-sm">Ressource : <strong>${x.resource}</strong></div>`:''}
          ${x.route? `<p class="text-sm text-muted-foreground mt-2">${x.route}</p>`:''}
        </article>`,

      toolCard: (t) => `
        <article class="rounded-lg border bg-card text-card-foreground shadow-sm p-4 h-full flex flex-col">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-lg font-bold">${t.title||''}</h3>
            ${t.kind? `<span class="text-xs px-2 py-0.5 rounded-full border">${t.kind}</span>`:''}
          </div>
          ${t.gameName? `<div class="text-xs text-muted-foreground uppercase mt-1">${t.gameName}</div>`:''}
          ${t.notes? `<p class="text-sm text-muted-foreground mt-2">${t.notes}</p>`:''}
          ${t.url? `<a class="mt-3 text-primary text-sm font-semibold hover:underline" href="${t.url}" target="_blank" rel="noopener">Ouvrir</a>`:''}
        </article>`
    }
  };

  window.CMS_LOADER = CMS;
})();
