(function () {
  console.log('[CMS] loader mp2');
  const ICONS = {
    eye:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path fill="#9CA3AF" d="M12 5c5.5 0 9.2 4.4 10 6-.8 1.6-4.5 6-10 6S2.8 12.6 2 11c.8-1.6 4.5-6 10-6Zm0 2C8.3 7 5.4 9.7 4.3 11 5.4 12.3 8.3 15 12 15s6.6-2.7 7.7-4C18.6 9.7 15.7 7 12 7Zm0 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"/></svg>',
    wrench:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path fill="#9CA3AF" d="M21 7.5a5.5 5.5 0 0 1-7.3 5.2l-7 7a2 2 0 1 1-2.8-2.8l7-7A5.5 5.5 0 1 1 21 7.5Z"/></svg>',
    toolbox:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path fill="#9CA3AF" d="M9 4h6a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v3H1V9a2 2 0 0 1 2-2h3V6a2 2 0 0 1 2-2Zm0 3h6V6H9v1Zm-8 7h22v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-4Zm9 1v2h4v-2H10Z"/></svg>',
    star:(f)=> f?'<svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24"><path d="m12 17.3-6.2 3.3 1.2-6.9-5-4.8 6.9-1 3.1-6.3 3.1 6.3 6.9 1-5 4.8 1.2 6.9z"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path stroke="#fbbf24" stroke-width="1.5" d="m12 17.3-6.2 3.3 1.2-6.9-5-4.8 6.9-1 3.1-6.3 3.1 6.3 6.9 1-5 4.8 1.2 6.9z"/></svg>',
    coin:(f)=> f?'<svg width="14" height="14" viewBox="0 0 24 24" fill="#eab308"><circle cx="12" cy="12" r="9"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#eab308" stroke-width="1.5"/></svg>'
  };
  const Views = { key:k=>`view:${k}`, inc(k){const kk=this.key(k);const n=(+localStorage.getItem(kk)||0)+1;localStorage.setItem(kk,n);return n;}, get(k){return +localStorage.getItem(this.key(k))||0;} };

  const CMS = {
    cfg:{
      gamesIndex:'/content/games/index.json',
      buildsIndex:'/content/builds/index.json',
      guidesIndex:'/content/guides/index.json',
      toolsIndex:'/content/tools/index.json',
      sel:{games:'#games-grid',builds:'#builds-grid',guides:'#guides-grid',tools:'#tools-grid'},
      clearHardcode:true, basePrefix:'/', page:'home',
      home:{gamesLimit:3,buildsLimit:3,guidesLimit:3,toolsLimit:3}
    },
    init(userCfg){
      const parts=location.pathname.split('/').filter(Boolean);
      this.cfg.basePrefix=parts.length>0?`/${parts[0]}/`:'/';
      this.cfg=Object.assign({},this.cfg,userCfg||{});
      const norm=p=>!p?'':/^https?:\/\//i.test(p)?p:(p.startsWith('/')?p.replace(/^\//,this.cfg.basePrefix):this.cfg.basePrefix+p);
      this.cfg.gamesIndex=norm(this.cfg.gamesIndex);this.cfg.buildsIndex=norm(this.cfg.buildsIndex);
      this.cfg.guidesIndex=norm(this.cfg.guidesIndex);this.cfg.toolsIndex=norm(this.cfg.toolsIndex);
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>this.run());else this.run();
    },
    normalizeAsset(src){ if(!src)return''; if(/^https?:\/\//i.test(src))return src; return src.startsWith('/')?src.replace(/^\//,this.cfg.basePrefix):this.cfg.basePrefix+src; },
    async fetchJSON(url){try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(r.status);const j=await r.json();return Array.isArray(j)?{items:j}:j;}catch(e){console.warn('[CMS] fetch failed',url,e);return null;}},
    clear(sel){if(!this.cfg.clearHardcode)return;const el=document.querySelector(sel);if(el)el.innerHTML='';},
    async run(){
      console.log('[CMS] endpoints',this.cfg);
      switch(this.cfg.page){
        case 'home':await this.renderHome();break;
        case 'games':await this.renderGames(true);break;
        case 'builds':await this.renderBuilds(true);break;
        case 'guides':await this.renderGuides(true);break;
        case 'tools':await this.renderTools(true);break;
        case 'detail':await this.renderDetail();break;
      }
      this.bindClicksForViews();
    },
    async renderHome(){
      await Promise.all([
        this.renderGames(false,this.cfg.home.gamesLimit),
        this.renderBuilds(false,this.cfg.home.buildsLimit),
        this.renderGuides(false,this.cfg.home.guidesLimit),
        this.renderTools(false,this.cfg.home.toolsLimit)
      ]);
    },
    async renderGames(full=false,limit=0){
      const [gamesIdx,buildsIdx,toolsIdx]=await Promise.all([
        this.fetchJSON(this.cfg.gamesIndex),this.fetchJSON(this.cfg.buildsIndex),this.fetchJSON(this.cfg.toolsIndex)
      ]);
      const items=gamesIdx?.items||[];
      const byGame=list=>{const m=new Map();(list?.items||[]).forEach(it=>{const k=(it.gameName||'').toLowerCase();m.set(k,(m.get(k)||0)+1)});return m;};
      const buildsCount=byGame(buildsIdx),toolsCount=byGame(toolsIdx);
      this.clear(this.cfg.sel.games); const root=document.querySelector(this.cfg.sel.games); if(!root)return;
      const html=items.slice(0,full?items.length:(limit||items.length)).map(g=>{
        const slug=g.slug||(g.name||'').toLowerCase().replace(/\s+/g,'-');
        const views=Views.get(`game:${slug}`); const key=(g.name||'').toLowerCase();
        const _builds=buildsCount.get(key)||0,_tools=toolsCount.get(key)||0;
        const href=`detail.html?type=game&slug=${encodeURIComponent(slug)}`;
        return CMS.tpl.gameCard({...g,_views:views,_builds,_tools,_href:href});
      }).join('');
      root.innerHTML=html;
    },
    starsFromDifficulty(diff){ if(!diff)return 3; const d=String(diff).toLowerCase();
      if(/facile/.test(d))return 2; if(/moyen/.test(d))return 3; if(/diffic/.test(d))return 4; if(/expert/.test(d))return 5;
      const n=parseInt(diff,10); return isFinite(n)?Math.max(1,Math.min(5,n)):3; },
    async renderBuilds(full=false,limit=0){
      const idx=await this.fetchJSON(this.cfg.buildsIndex); const items=idx?.items||[];
      this.clear(this.cfg.sel.builds); const root=document.querySelector(this.cfg.sel.builds); if(!root)return;
      const html=items.slice(0,full?items.length:(limit||items.length)).map(b=>{
        const slug=b.slug; const views=Views.get(`build:${slug}`); const stars=b.difficultyStars||this.starsFromDifficulty(b.difficulty);
        const coins=Math.max(0,Math.min(5,parseInt(b.cost||0,10))); const href=`detail.html?type=build&slug=${encodeURIComponent(slug)}`;
        return CMS.tpl.buildCard({...b,_views:views,_href:href,_stars:stars,_coins:coins});
      }).join('');
      root.innerHTML=html;
    },
    async renderGuides(full=false,limit=0){
      const idx=await this.fetchJSON(this.cfg.guidesIndex); const items=idx?.items||[];
      this.clear(this.cfg.sel.guides); const root=document.querySelector(this.cfg.sel.guides); if(!root)return;
      const html=items.slice(0,full?items.length:(limit||items.length)).map(x=>{
        const slug=x.slug||(x.title||'').toLowerCase().replace(/\s+/g,'-'); const views=Views.get(`guide:${slug}`);
        const href=`detail.html?type=guide&slug=${encodeURIComponent(slug)}`;
        return CMS.tpl.guideCard({...x,_views:views,_href:href});
      }).join('');
      root.innerHTML=html;
    },
    async renderTools(full=false,limit=0){
      const idx=await this.fetchJSON(this.cfg.toolsIndex); const items=idx?.items||[];
      this.clear(this.cfg.sel.tools); const root=document.querySelector(this.cfg.sel.tools); if(!root)return;
      const html=items.slice(0,full?items.length:(limit||items.length)).map(t=>{
        const slug=t.slug||(t.title||'').toLowerCase().replace(/\s+/g,'-'); const views=Views.get(`tool:${slug}`);
        const href=`detail.html?type=tool&slug=${encodeURIComponent(slug)}`;
        return CMS.tpl.toolCard({...t,_views:views,_href:href});
      }).join('');
      root.innerHTML=html;
    },
    bindClicksForViews(){
      document.querySelectorAll('[data-viewkey]').forEach(a=>{
        a.addEventListener('click', ()=>{
          const k=a.getAttribute('data-viewkey'); const n=Views.inc(k);
          const span=a.querySelector('[data-views]'); if(span) span.textContent=n.toLocaleString('fr-FR');
        }, {passive:true});
      });
    },
    parseQuery(){const u=new URL(location.href);return{type:u.searchParams.get('type')||'game',slug:u.searchParams.get('slug')||''};},
    async renderDetail(){
      const {type,slug}=this.parseQuery(); const folder={game:'games',build:'builds',guide:'guides',tool:'tools'}[type]||'games';
      const url=this.cfg.basePrefix+`content/${folder}/${slug}.json`; const data=await this.fetchJSON(url);
      const root=document.getElementById('detail-root'); if(!data){root.innerHTML='<p style="color:#f87171">Contenu introuvable.</p>';return;}
      const viewsNow=Views.inc(`${type}:${slug}`); const cover=data.cover?this.normalizeAsset(data.cover):''; const status=data.status||(type==='build'&&data.tier)||'Actif';
      const title=data.title||data.name||slug; const publisher=(data.publisher||data.studio||data.gameName||'').toUpperCase();
      const head = `
        <div class="hero">
          <div class="media">
            ${cover ? `<img src="${cover}" alt="${title}">` : '<div class="media-ph"></div>'}
            <div class="overlay"></div>
            <div class="meta">
              <span class="badge-pill">${status}</span>
              ${publisher? `<div class="publisher" style="margin-top:8px">${publisher}</div>`:''}
              <h1>${title}</h1>
            </div>
          </div>
        </div>
        <div style="margin:10px 0 6px;color:#9ca3af">${ICONS.eye}<span style="margin-left:6px">${viewsNow.toLocaleString('fr-FR')} vues</span></div>`;
      let body='';
      if(type==='build'){
        const stars=data.difficultyStars||this.starsFromDifficulty(data.difficulty);
        const coins=Math.max(0,Math.min(5,parseInt(data.cost||0,10)));
        const starRow=Array.from({length:5},(_,i)=>ICONS.star(i<stars)).join('');
        const coinRow=Array.from({length:5},(_,i)=>ICONS.coin(i<coins)).join('');
        body+=`<section class="section"><h3>Difficulté</h3><div class="stars">${starRow}</div></section>
               <section class="section"><h3>Coût</h3><div class="coins">${coinRow}</div></section>`;
      }
      if(data.body){ body+=`<section class="section"><h3>Détails</h3><div class="excerpt">${data.body}</div></section>`; }
      else if(data.short){ body+=`<section class="section"><h3>Description</h3><div class="excerpt">${data.short}</div></section>`; }
      root.innerHTML=head+body;
    },
    tpl:{
      imgBlock(src,alt){ if(src){const r=CMS.normalizeAsset(src);return `<img src="${r}" alt="${(alt||'').replace(/"/g,'&quot;')}" class="h-full w-full object-cover">`; } return '<div class="media-ph"></div>'; },
      badge(t,cls='badge-pill'){return `<span class="${cls}">${t}</span>`;},
      inferPublisherFromName(n=''){n=n.toLowerCase();if(n.includes('counter-strike')||n.includes('cs'))return'VALVE';if(n.includes('league of legends')||n.includes('lol'))return'RIOT GAMES';if(n.includes('valorant'))return'RIOT GAMES';return'';},
      gameCard(g){
        const status=g.status||'Actif', publisher=(g.publisher||g.studio||CMS.tpl.inferPublisherFromName(g.name)).toUpperCase();
        const excerpt=g.short||'', views=g._views||0, href=g._href||'#', key=`game:${g.slug||(g.name||'').toLowerCase().replace(/\s+/g,'-')}`;
        return `<a href="${href}" class="card--game" data-viewkey="${key}">
          <div class="card-media">${CMS.tpl.imgBlock(g.cover,g.name)}<div class="media-grad"></div>
            <div style="position:absolute;top:10px;left:10px;">${CMS.tpl.badge(status)}</div></div>
          <div class="card-body">${publisher?`<div class="publisher">${publisher}</div>`:''}<div class="title">${g.name||''}</div>${excerpt?`<p class="excerpt">${excerpt}</p>`:''}</div>
          <div class="card-foot"><span class="metric">${ICONS.eye}<span data-views>${views.toLocaleString('fr-FR')}</span></span>
            <span class="metric">${ICONS.wrench}<span>${g._builds??0}</span></span><span class="metric">${ICONS.toolbox}<span>${g._tools??0}</span></span></div>
        </a>`;
      },
      buildCard(b){
        const tier=b.tier?CMS.tpl.badge(b.tier,'badge-pill badge-tier'):'', publisher=(b.publisher||CMS.tpl.inferPublisherFromName(b.gameName)).toUpperCase();
        const views=b._views||0, href=b._href||'#', key=`build:${b.slug}`, stars=b._stars||3, coins=b._coins||0;
        const starRow=Array.from({length:5},(_,i)=>ICONS.star(i<stars)).join(''), coinRow=Array.from({length:5},(_,i)=>ICONS.coin(i<coins)).join('');
        return `<a href="${href}" class="card--game" data-viewkey="${key}">
          <div class="card-media">${CMS.tpl.imgBlock(b.cover,b.title)}<div class="media-grad"></div>
            ${tier?`<div style="position:absolute;top:10px;left:10px;">${tier}</div>`:''}
            ${b.gameName?`<div style="position:absolute;bottom:10px;left:12px;" class="publisher">${publisher||b.gameName}</div>`:''}
          </div>
          <div class="card-body"><div class="title">${b.title||''}</div>${b.summary?`<p class="excerpt">${b.summary}</p>`:''}</div>
          <div class="card-foot"><span class="metric">${ICONS.eye}<span data-views>${views.toLocaleString('fr-FR')}</span></span>
            <span class="metric">${starRow}</span><span class="metric">${coinRow}</span></div>
        </a>`;
      },
      guideCard(x){
        const views=x._views||0, href=x._href||'#', slug=x.slug||(x.title||'').toLowerCase().replace(/\s+/g,'-'), key=`guide:${slug}`;
        return `<a href="${href}" class="card--game" data-viewkey="${key}">
          <div class="card-media">${CMS.tpl.imgBlock(x.cover,x.title)}<div class="media-grad"></div>
            ${x.gameName?`<div style="position:absolute;bottom:10px;left:12px;" class="publisher">${(x.gameName||'').toUpperCase()}</div>`:''}
          </div>
          <div class="card-body"><div class="title">${x.title||''}</div>
            ${x.resource?`<p class="excerpt">Ressource : <strong>${x.resource}</strong></p>`:''}${x.route?`<p class="excerpt">${x.route}</p>`:''}
          </div>
          <div class="card-foot"><span class="metric">${ICONS.eye}<span data-views>${views.toLocaleString('fr-FR')}</span></span></div>
        </a>`;
      },
      toolCard(t){
        const views=t._views||0, href=t._href||'#', slug=t.slug||(t.title||'').toLowerCase().replace(/\s+/g,'-'), key=`tool:${slug}`;
        return `<a href="${href}" class="card--game" data-viewkey="${key}">
          <div class="card-media">${CMS.tpl.imgBlock(t.cover,t.title)}<div class="media-grad"></div>
            ${t.kind?`<div style="position:absolute;top:10px;left:10px;">${CMS.tpl.badge(t.kind)}</div>`:''}
          </div>
          <div class="card-body"><div class="title">${t.title||''}</div>
            ${t.gameName?`<div class="publisher" style="margin-top:2px;">${(t.gameName||'').toUpperCase()}</div>`:''}
            ${t.notes?`<p class="excerpt" style="margin-top:6px;">${t.notes}</p>`:''}
          </div>
          <div class="card-foot"><span class="metric">${ICONS.eye}<span data-views>${views.toLocaleString('fr-FR')}</span></span></div>
        </a>`;
      }
    }
  };
  window.CMS_LOADER = CMS;
})();
