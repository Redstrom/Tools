"use strict";
// Minimal UI patch: micro-router (hash), pagination (3 items/page), and simple CMS loader

(function microRouter(){
  const views = Array.from(document.querySelectorAll('[data-view]'));
  const links = Array.from(document.querySelectorAll('[data-route]'));
  const defaultRoute = 'jeux';

  function show(route){
    views.forEach(v => v.hidden = (v.dataset.view !== route));
    links.forEach(a => a.classList.toggle('active', a.dataset.route === route));
  }
  function getRoute(){
    const r = location.hash.replace(/^#\//,'');
    return ['jeux','builds','categories'].includes(r) ? r : defaultRoute;
  }
  function init(){ show(getRoute()); }

  window.addEventListener('hashchange', init);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();

(function pagination(){
  const PAGE_SIZE = 3;
  let initialized = false;

  function renderPager(grid, pager){
    const cards = Array.from(grid.querySelectorAll('.game-card'));
    const total = cards.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    let page = 1;

    const prevBtn = pager.querySelector('[data-page="prev"]');
    const nextBtn = pager.querySelector('[data-page="next"]');
    const info    = pager.querySelector('[data-page="info"]');

    function render(){
      const start = (page - 1) * PAGE_SIZE;
      const end   = start + PAGE_SIZE;
      cards.forEach((el,i)=>{ el.style.display = (i>=start && i<end) ? '' : 'none'; });
      if (info) info.textContent = `${page}/${totalPages}`;
      if (prevBtn) prevBtn.disabled = (page === 1);
      if (nextBtn) nextBtn.disabled = (page === totalPages);
    }
    prevBtn?.addEventListener('click', ()=>{ if(page>1){ page--; render(); }});
    nextBtn?.addEventListener('click', ()=>{ if(page<totalPages){ page++; render(); }});
    render();
  }

  function init(){
    const grid  = document.querySelector('#games-grid');
    const pager = document.querySelector('#games-pager');
    if (!grid || !pager) return; // nothing to do

    // Only (re)initialize once per content update
    if (initialized) return;
    initialized = true;
    renderPager(grid, pager);
  }

  // init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  // Re-init when new content is injected
  window.addEventListener('content:updated', init);
})();

(function cmsLoader(){
  async function loadJeux(){
    const root = document.querySelector('[data-collection="jeux"]');
    if (!root) return;

    // If there are already .game-card items, do not duplicate
    if (root.querySelector('.game-card')) {
      // still ensure pagination is initialized
      window.dispatchEvent(new CustomEvent('content:updated', { detail:'jeux' }));
      return;
    }

    try {
      const res = await fetch('collections/jeux.json', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();

      const tpl = document.getElementById('tpl-game-card');
      data.forEach(item => {
        let node;
        if (tpl && 'content' in tpl) {
          node = tpl.content.cloneNode(true);
          const a = node.querySelector('[data-bind="url"]');
          const img = node.querySelector('[data-bind="image"]');
          const title = node.querySelector('[data-bind="title"]');
          const excerpt = node.querySelector('[data-bind="excerpt"]');
          a && a.setAttribute('href', item.url || '#');
          img && img.setAttribute('src', item.image || '');
          if (img && item.title) img.setAttribute('alt', item.title);
          if (title) title.textContent = item.title || '';
          if (excerpt) excerpt.textContent = item.excerpt || '';
        } else {
          // Fallback if no template exists
          node = document.createElement('article');
          node.className = 'game-card';
          node.innerHTML = `
            <a href="${item.url || '#'}">
              <img src="${item.image || ''}" alt="${item.title || ''}">
              <h3>${item.title || ''}</h3>
              <p>${item.excerpt || ''}</p>
            </a>`;
        }
        root.appendChild(node);
      });

      window.dispatchEvent(new CustomEvent('content:updated', { detail:'jeux' }));
    } catch(err) {
      console.warn('CMS: jeux.json not loaded', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadJeux);
  } else { loadJeux(); }
})();
