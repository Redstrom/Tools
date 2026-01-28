
(function(){
  const CMS = {
    cfg: {
      gamesIndex: '/content/games/index.json',
      buildsIndex: '/content/builds/index.json',
      guidesIndex: '/content/guides/index.json',
      toolsIndex:  '/content/tools/index.json',
      sel: {
        games: '#games-grid',
        builds: '#builds-grid',
        guides: '#guides-grid',
        tools:  '#tools-grid'
      },
      clearHardcode: true
    },
    init(userCfg){
      this.cfg = Object.assign({}, this.cfg, userCfg || {});
      document.addEventListener('DOMContentLoaded', ()=> this.run());
    },
    async run(){
      const tasks = [];
      const {sel} = this.cfg;
      if (document.querySelector(sel.games)) tasks.push(this.renderGames());
      if (document.querySelector(sel.builds)) tasks.push(this.renderBuilds());
      if (document.querySelector(sel.guides)) tasks.push(this.renderGuides());
      if (document.querySelector(sel.tools))  tasks.push(this.renderTools());
      await Promise.allSettled(tasks);
    },
    async fetchJSON(url){
      try{
        const res = await fetch(url, {cache:'no-store'});
        if(!res.ok) throw new Error(res.status+' '+res.statusText);
        return await res.json();
      }catch(e){ console.warn('CMS loader: cannot fetch', url, e); return null; }
    },
    clear(sel){ if(!this.cfg.clearHardcode) return; const el=document.querySelector(sel); if(el) el.innerHTML=''; },

    // --- Renderers ---------------------------------------------------------
    async renderGames(){
      const idx = await this.fetchJSON(this.cfg.gamesIndex);
      if(!idx||!idx.items) return;
      this.clear(this.cfg.sel.games);
      const root = document.querySelector(this.cfg.sel.games);
      root.innerHTML = idx.items.map(g=>CMS.tpl.gameCard(g)).join('');
    },
    async renderBuilds(){
      const idx = await this.fetchJSON(this.cfg.buildsIndex);
      if(!idx||!idx.items) return;
      this.clear(this.cfg.sel.builds);
      const root = document.querySelector(this.cfg.sel.builds);
      root.innerHTML = idx.items.map(b=>CMS.tpl.buildCard(b)).join('');
    },
    async renderGuides(){
      const idx = await this.fetchJSON(this.cfg.guidesIndex);
      if(!idx||!idx.items) return;
      this.clear(this.cfg.sel.guides);
      const root = document.querySelector(this.cfg.sel.guides);
      root.innerHTML = idx.items.map(x=>CMS.tpl.guideCard(x)).join('');
    },
    async renderTools(){
      const idx = await this.fetchJSON(this.cfg.toolsIndex);
      if(!idx||!idx.items) return;
      this.clear(this.cfg.sel.tools);
      const root = document.querySelector(this.cfg.sel.tools);
      root.innerHTML = idx.items.map(t=>CMS.tpl.toolCard(t)).join('');
    },

    // --- Templates (reprennent tes classes Tailwind) ----------------------
    tpl: {
      gameCard: (g)=> `
        <article class="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden h-full flex flex-col">
          <div class="relative aspect-video overflow-hidden">
            ${g.cover ? `<img alt="${g.name||''}" src="/${g.cover}" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105">` : ''}
            <div class="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent"></div>
            ${g.status ? `<div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold absolute top-3 left-3" style="background:#00e701;color:#000;">${g.status}</div>`: ''}
          </div>
          <div class="p-4 flex-grow">
            <h3 class="text-xl font-bold mb-2">${g.name||''}</h3>
            ${g.short ? `<p class="text-sm text-muted-foreground">${g.short}</p>`:''}
          </div>
        </article>`,

      buildCard: (b)=> `
        <article class="rounded-lg border bg-card text-card-foreground shadow-sm gaming-card overflow-hidden h-full flex flex-col">
          <div class="relative aspect-video overflow-hidden">
            ${b.cover ? `<img alt="${b.title||''}" src="/${b.cover}" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105">` : ''}
            <div class="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent"></div>
            ${b.tier ? `<div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold absolute top-3 left-3" style="background:#10b981;color:#000;">${b.tier}</div>`: ''}
            ${b.gameName ? `<div class="absolute bottom-3 left-3"><p class="text-xs text-primary font-bold uppercase tracking-widest">${b.gameName}</p></div>`:''}
          </div>
          <div class="p-4 flex-grow">
            <h3 class="text-xl font-bold mb-2">${b.title}</h3>
            ${b.summary? `<p class="text-sm text-muted-foreground line-clamp-2">${b.summary}</p>`:''}
          </div>
          <div class="px-4 py-3 border-t border-border bg-muted/30 flex justify-between items-center">
            <div class="text-[10px] text-muted-foreground">${b.updatedAt ? `Mis à jour le ${b.updatedAt}`:''}</div>
            ${b.href ? `<a class="text-primary text-sm font-semibold hover:underline" href="${b.href}">Voir</a>`:''}
          </div>
        </article>`,

      guideCard: (x)=> `
        <article class="rounded-lg border bg-card text-card-foreground shadow-sm p-4 h-full flex flex-col">
          <h3 class="text-lg font-bold">${x.title}</h3>
          ${x.gameName? `<div class="text-xs text-muted-foreground uppercase mt-1">${x.gameName}</div>`:''}
          ${x.resource? `<div class="mt-2 text-sm">Ressource : <strong>${x.resource}</strong></div>`:''}
          ${x.route? `<p class="text-sm text-muted-foreground mt-2">${x.route}</p>`:''}
        </article>` ,

      toolCard: (t)=> `
        <article class="rounded-lg border bg-card text-card-foreground shadow-sm p-4 h-full flex flex-col">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-lg font-bold">${t.title}</h3>
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
