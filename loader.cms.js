(function () {
  // ---------- VERSION ----------
  const VERSION = 'v9';
  console.log(`[CMS] loader ${VERSION}`);

  // ---------- Icônes ----------
  const ICONS = {
    eye:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path fill="#9CA3AF" d="M12 5c5.5 0 9.2 4.4 10 6-.8 1.6-4.5 6-10 6S2.8 12.6 2 11c.8-1.6 4.5-6 10-6Zm0 2C8.3 7 5.4 9.7 4.3 11 5.4 12.3 8.3 15 12 15s6.6-2.7 7.7-4C18.6 9.7 15.7 7 12 7Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"/></svg>',
    star:(f)=> f?'<svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24"><path d="m12 17.3-6.2 3.3 1.2-6.9-5-4.8 6.9-1 3.1-6.3 3.1 6.3 6.9 1-5 4.8 1.2 6.9z"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path stroke="#fbbf24" stroke-width="1.5" d="m12 17.3-6.2 3.3 1.2-6.9-5-4.8 6.9-1 3.1-6.3 3.1 6.3 6.9 1-5 4.8 1.2 6.9z"/></svg>',
    coin:(f)=> f?'<svg width="14" height="14" viewBox="0 0 24 24" fill="#eab308"><circle cx="12" cy="12" r="9"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#eab308" stroke-width="1.5"/></svg>'
  };

  // ---------- Vues (localStorage) ----------
  const Views = {
    key:k=>`view:${k}`,
    inc(k){ const kk=this.key(k); const n=(+localStorage.getItem(kk)||0)+1; localStorage.setItem(kk,n); return n; },
    get(k){ return +localStorage.getItem(this.key(k))||0; },
    resetAll(){ Object.keys(localStorage).forEach(k=>k.startsWith('view:')&&localStorage.removeItem(k)); }
  };

  // ---------- CMS ----------
  const CMS = {
    cfg:{
      // valeurs par défaut
      gamesIndex:'', buildsIndex:'', guidesIndex:'', toolsIndex:'',
      sel:{games:'#games-grid',builds:'#builds-grid',guides:'#guides-grid',tools:'#tools-grid'},
      basePrefix:'/', clearHardcode:true, page:'auto',        // page:'auto' = auto-détection
      home:{gamesLimit:3,buildsLimit:3,guidesLimit:3,toolsLimit:3}
    },

    init(){
      // basePrefix pour GitHub Pages Project (/<repo>/)
      const parts=location.pathname.split('/').filter(Boolean);
      this.cfg.basePrefix = parts.length>0 ? `/${parts[0]}/` : '/';

      // endpoints "classiques"
      const norm = p => !p ? '' : /^https?:\/\//i.test(p) ? p : (p.startsWith('/') ? p.replace(/^\//, this.cfg.basePrefix) : this.cfg.basePrefix + p);
      this.cfg.gamesIndex  = norm('content/games/index.json');
      this.cfg.buildsIndex = norm('content/builds/index.json');
      this.cfg.guidesIndex = norm('content/guides/index.json');
      this.cfg.toolsIndex  = norm('content/tools/index.json');

      // type de page : 1) via <meta name="cms:page">, 2) auto-détection
      const meta = document.querySelector('meta[name="cms:page"]');
      const hinted = meta?.content?.trim();
      if (hinted) this.cfg.page = hinted;
      else this.cfg.page = this.autodetectPage();

      if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>this.run());
      else this.run();
    },

    autodetectPage(){
      // Devine la page selon les conteneurs présents (utile si tu ne veux pas de <meta>)
      if (document.querySelector(this.cfg.sel.games))  return 'games';
      if (document.querySelector(this.cfg.sel.builds)) return 'builds';
      if (document.querySelector(this.cfg.sel.guides)) return 'guides';
      if (document.querySelector(this.cfg.sel.tools))  return 'tools';
      if (new URL(location.href).searchParams.get('type')) return 'detail';
      return 'home';
    },

    normalizeAsset(src){
      if(!src) return '';
      if(/^https?:\/\//i.test(src)) return src;
      return src.startsWith('/') ? src.replace(/^\//, this.cfg.basePrefix) : this.cfg.basePrefix + src;
    },

    async fetchJSON(url){
      try{ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error(r.status); const j=await r.json(); return Array.isArray(j)?{items:j}:j; }
      catch(_){ return null; }
    },

    async fetchIndex(url){ return (await this.fetchJSON(url)) || { items: [] }; },

    clear(sel){ if(!this.cfg.clearHardcode) return; const el=document.querySelector(sel); if(el) el.innerHTML=''; },

    async run(){
      switch(this.cfg.page){
        case 'home': break; // landing = rien à lister
        case 'games':  await this.renderGames(true);  break;
        case 'builds': await this.renderBuilds(true); break;
        case 'guides': await this.renderGuides(true); break;
        case 'tools':  await this.renderTools(true);  break;
        case 'detail': await this.renderDetail();     break;
        default: break;
      }
      this.bindClicksForViews();
    },

    // ------------- LISTES -------------
    async renderGames(full=false,limit=0){
      const [games, builds, tools] = await Promise.all([
        this.fetchIndex(this.cfg.gamesIndex),
        this.fetchIndex(this.cfg.buildsIndex),
        this.fetchIndex(this.cfg.toolsIndex)
      ]);
      const items = games.items || [];
      const byGame = list => { const m=new Map(); (list.items||[]).forEach(it=>{ const key=(it.gameName||it.name||'').toLowerCase(); m.set(key,(m.get(key)||0)+1); }); return m; };
      const buildsCount = byGame(builds), toolsCount = byGame(tools);

      this.clear(this.cfg.sel.games); const root=document.querySelector(this.cfg.sel.games); if(!root) return;
      root.innerHTML = items.slice(0, full?items.length:(limit||items.length)).map(g=>{
        const slug=g.slug||(g.name||'').toLowerCase().replace(/\s+/g,'-');
        const href=`detail.html?type=game&slug=${encodeURIComponent(slug)}`;
        const views=Views.get(`game:${slug}`);
        const key=(g.name||'').toLowerCase();
        return CMS.tpl.gameCard({...g,_href:href,_views:views,_builds:buildsCount.get(key)||0,_tools:toolsCount.get(key)||0});
      }).join('');
    },

    starsFromDifficulty(diff){
      if(!diff) return 3;
      const d=String(diff).toLowerCase();
      if(/facile/.test(d))return 2;
      if(/moyen/.test(d)) return 3;
      if(/diffic/.test(d))return 4;
      if(/expert/.test(d))return 5;
      const n=parseInt(diff,10); return isFinite(n)?Math.max(1,Math.min(5,n)):3;
    },

    async renderBuilds(full=false,limit=0){
      const idx = await this.fetchIndex(this.cfg.buildsIndex);
      const items = idx.items || [];
      this.clear(this.cfg.sel.builds); const root=document.querySelector(this.cfg.sel.builds); if(!root) return;

      root.innerHTML = items.slice(0, full?items.length:(limit||items.length)).map(b=>{
        const slug=b.slug||(b.title||'').toLowerCase().replace(/\s+/g,'-');
        const href=`detail.html?type=build&slug=${encodeURIComponent(slug)}`;
        const views=Views.get(`build:${slug}`);
        const stars=Math.max(1,Math.min(5, parseInt(b.difficultyStars??0,10) || this.starsFromDifficulty(b.difficulty)));
        const coins=Math.max(0,Math.min(5, parseInt(b.cost??0,10)||0));
        return CMS.tpl.buildCard({...b,_href:href,_views:views,_stars:stars,_coins:coins});
      }).join('');
    },

    async renderGuides(full=false,limit=0){
      const idx = await this.fetchIndex(this.cfg.guidesIndex);
      const items = idx.items || [];
      this.clear(this.cfg.sel.guides); const root=document.querySelector(this.cfg.sel.guides); if(!root) return;

      root.innerHTML = items.slice(0, full?items.length:(limit||items.length)).map(x=>{
        const slug=x.slug||(x.title||'').toLowerCase().replace(/\s+/g,'-');
        const href=`detail.html?type=guide&slug=${encodeURIComponent(slug)}`;
        const views=Views.get(`guide:${slug}`);
        return CMS.tpl.guideCard({...x,_href:href,_views:views});
      }).join('');
    },

    async renderTools(full=false,limit=0){
      const idx = await this.fetchIndex(this.cfg.toolsIndex);
      const items = idx.items || [];
      this.clear(this.cfg.sel.tools); const root=document.querySelector(this.cfg.sel.tools); if(!root) return;

      root.innerHTML = items.slice(0, full?items.length:(limit||items.length)).map(t=>{
        const slug=t.slug||(t.title||'').toLowerCase().replace(/\s+/g,'-');
        const href=`detail.html?type=tool&slug=${encodeURIComponent(slug)}`;
        const views=Views.get(`tool:${slug}`);
        return CMS.tpl.toolCard({...t,_href:href,_views:views});
      }).join('');
    },

    // ------------- DÉTAIL -------------
    async renderDetail(){
      const u=new URL(location.href);
      const type=u.searchParams.get('type')||'game';
      const slug=u.searchParams.get('slug')||'';
      const folder={game:'games',build:'builds',guide:'guides',tool:'tools'}[type]||'games';
      const root=document.getElementById('detail-root');

      // essaie le fichier direct
      const tryFile = async()=>{ const url=this.cfg.basePrefix+`content/${folder}/${slug}.json`; const j=await this.fetchJSON(url); return j?{data:j}:null; };
      // sinon retombe sur l’index
      const tryIndex = async()=>{
        const url = this.cfg.basePrefix+`content/${folder}/index.json`;
        const idx = await this.fetchJSON(url);
        if(!idx?.items) return null;
        const hit = idx.items.find(x=>(x.slug||'').toLowerCase()===slug.toLowerCase());
        return hit?{data:hit}:null;
      };

      const found = (await tryFile()) || (await tryIndex());
      if(!found){ root.innerHTML='<p style="color:#f87171">Contenu introuvable.</p>'; return; }

      const data=found.data;
      const viewsNow=Views.inc(`${type}:${slug}`);

      const title=data.title||data.name||slug;
      const publisher=(data.publisher||data.studio||data.gameName||'').toUpperCase();
      const status=data.status||(type==='build'&&data.tier)||'Actif';
      const coverHtml = data.cover ? CMS.tpl.imgBlock(CMS.normalizeAsset(data.cover), title) : '<div class="media-ph"></div>';

      const head=`
        <div class="hero">
          <div class="media">
            ${coverHtml}
            <div class="overlay"></div>
            <div class="meta">
              <span class="badge-pill">${status}</span>
              ${publisher?`<div class="publisher" style="margin-top:8px">${publisher}</div>`:''}
              <h1>${title}</h1>
            </div>
          </div>
        </div>
        <div style="margin:10px 0 6px;color:#9ca3af">${ICONS.eye}<span style="margin-left:6px">${viewsNow.toLocaleString('fr-FR')} vues</span></div>
      `;

      let body='';
      if(type==='build'){
        const stars=Math.max(1,Math.min(5, parseInt(data.difficultyStars??0,10) || this.starsFromDifficulty(data.difficulty)));
        const coins=Math.max(0,Math.min(5, parseInt(data.cost??0,10)||0));
        const STAR=f=>ICONS.star(f), COIN=f=>ICONS.coin(f);
        body+=`
          <section class="section"><h3>Difficulté</h3><div class="stars">${Array.from({length:5},(_,i)=>STAR(i<stars)).join('')}</div></section>
          <section class="section"><h3>Coût</h3><div class="coins">${Array.from({length:5},(_,i)=>COIN(i<coins)).join('')}</div></section>`;
      }
      if(data.body) body+=`<section class="section"><h3>Détails</h3><div class="excerpt">${data.body}</div></section>`;
      else if(data.short) body+=`<section class="section"><h3>Description</h3><div class="excerpt">${data.short}</div></section>`;

      root.innerHTML=head+body;
    },

    // incrément SEULEMENT au clic
    bindClicksForViews(){
      document.querySelectorAll('[data-viewkey]').forEach(a=>{
        a.addEventListener('click',()=>{
          const k=a.getAttribute('data-viewkey');
          const n=Views.inc(k);
          const span=a.querySelector('[data-views]');
          if(span) span.textContent=n.toLocaleString('fr-FR');
        },{passive:true});
      });
    },

    // -------- Templates --------
    tpl:{
      // Toujours un <img> OU un placeholder (jamais du texte brut)
      imgBlock(src, alt){
        const safeAlt = (alt || '').replace(/"/g,'&quot;');
        if (!src) return '<div class="media-ph"></div>';
        return `${src}" alt="${safeAlt}" class="h-full w-full object-cover">`;
      },
      badge(t,cls='badge-pill'){ return `<span class="${cls}">${t}</span>`; },
      inferPublisherFromName(n=''){
        n=n.toLowerCase();
        if(n.includes('counter-strike')||n.includes('cs')) return 'VALVE';
        if(n.includes('league of legends')||n.includes('lol')) return 'RIOT GAMES';
        if(n.includes('valorant')) return 'RIOT GAMES';
        return '';
      },

      gameCard(g){
        const slug=g.slug||(g.name||'').toLowerCase().replace(/\s+/g,'-');
        const href=`detail.html?type=game&slug=${encodeURIComponent(slug)}`;
        const key=`game:${slug}`, views=g._views||0;
        const publisher=(g.publisher||this.inferPublisherFromName(g.name)).toUpperCase();
        return `${href}
          <div class="card-media">
            ${g.cover?CMS.tpl.imgBlock(CMS.normalizeAsset(g.cover), g.name):'<div class="media-ph"></div>'}
            <div class="media-grad"></div>
            <div style="position:absolute;top:10px;left:10px;">${CMS.tpl.badge(g.status||'Actif')}</div>
          </div>
          <div class="card-body">
            ${publisher?`<div class="publisher">${publisher}</div>`:''}
            <div class="title">${g.name||''}</div>
            ${g.short?`<p class="excerpt">${g.short}</p>`:''}
          </div>
          <div class="card-foot"><span class="metric">${ICONS.eye}<span data-views>${views.toLocaleString('fr-FR')}</span></span></div>
        </a>`;
      },

      buildCard(b){
        const slug=b.slug||(b.title||'').toLowerCase().replace(/\s+/g,'-');
        const href=`detail.html?type=build&slug=${encodeURIComponent(slug)}`;
        const key=`build:${slug}`, views=b._views||0;
        const starRow=Array.from({length:5},(_,i)=>ICONS.star(i<(b._stars||3))).join('');
        const coinRow=Array.from({length:5},(_,i)=>ICONS.coin(i<(b._coins||0))).join('');
        const publisher=(b.publisher||this.inferPublisherFromName(b.gameName||'')).toUpperCase();
        return `${href}
          <div class="card-media">
            ${b.cover?CMS.tpl.imgBlock(CMS.normalizeAsset(b.cover), b.title):'<div class="media-ph"></div>'}
            <div class="media-grad"></div>
            ${b.tier?`<div style="position:absolute;top:10px;left:10px;">${CMS.tpl.badge(b.tier,'badge-pill badge-tier')}</div>`:''}
            ${b.gameName?`<div style="position:absolute;bottom:10px;left:12px;" class="publisher">${publisher||b.gameName}</div>`:''}
          </div>
          <div class="card-body">
            <div class="title">${b.title||''}</div>
            ${b.summary?`<p class="excerpt">${b.summary}</p>`:''}
          </div>
          <div class="card-foot">
            <span class="metric">${ICONS.eye}<span data-views>${views.toLocaleString('fr-FR')}</span></span>
            <span class="metric">${starRow}</span>
            <span class="metric">${coinRow}</span>
          </div>
        </a>`;
      },

      guideCard(x){
        const slug=x.slug||(x.title||'').toLowerCase().replace(/\s+/g,'-');
        const href=`detail.html?type=guide&slug=${encodeURIComponent(slug)}`;
        const key=`guide:${slug}`, views=x._views||0;
        return `${href}
          <div class="card-media">
            ${x.cover?CMS.tpl.imgBlock(CMS.normalizeAsset(x.cover), x.title):'<div class="media-ph"></div>'}
            <div class="media-grad"></div>
            ${x.gameName?`<div style="position:absolute;bottom:10px;left:12px;" class="publisher">${(x.gameName||'').toUpperCase()}</div>`:''}
          </div>
          <div class="card-body">
            <div class="title">${x.title||''}</div>
            ${x.resource?`<p class="excerpt">Ressource : <strong>${x.resource}</strong></p>`:''}
            ${x.route?`<p class="excerpt">${x.route}</p>`:''}
          </div>
          <div class="card-foot"><span class="metric">${ICONS.eye}<span data-views>${views.toLocaleString('fr-FR')}</span></span></div>
        </a>`;
      },

      toolCard(t){
        const slug=t.slug||(t.title||'').toLowerCase().replace(/\s+/g,'-');
        const href=`detail.html?type=tool&slug=${encodeURIComponent(slug)}`;
        const key=`tool:${slug}`, views=t._views||0;
        return `${href}
          <div class="card-media">
            ${t.cover?CMS.tpl.imgBlock(CMS.normalizeAsset(t.cover), t.title):'<div class="media-ph"></div>'}
            <div class="media-grad"></div>
            ${t.kind?`<div style="position:absolute;top:10px;left:10px;">${CMS.tpl.badge(t.kind)}</div>`:''}
          </div>
          <div class="card-body">
            <div class="title">${t.title||''}</div>
            ${t.gameName?`<div class="publisher" style="margin-top:2px;">${(t.gameName||'').toUpperCase()}</div>`:''}
            ${t.notes?`<p class="excerpt" style="margin-top:6px;">${t.notes}</p>`:''}
          </div>
          <div class="card-foot"><span class="metric">${ICONS.eye}<span data-views>${views.toLocaleString('fr-FR')}</span></span></div>
        </a>`;
      }
    }
  };

  // Expose global + util reset
  window.CMS_LOADER = CMS;
  // auto‑init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CMS.init());
  } else {
    CMS.init();
  }
})();
