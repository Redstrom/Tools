(async () => {
  // Détecte le préfixe GitHub Pages (/Tools/) pour charger le fragment au bon endroit
  const parts = location.pathname.split('/').filter(Boolean);
  const basePrefix = parts.length > 0 ? `/${parts[0]}/` : '/';

  // 1) Charger et injecter le header partagé
  const headerURL = basePrefix + 'partials/header.html';
  try {
    const res = await fetch(headerURL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Header not found');
    const html = await res.text();
    document.body.insertAdjacentHTML('afterbegin', html);
  } catch (e) {
    console.warn('Header load failed:', e);
    return;
  }

  // 2) Marquer l’onglet actif (selon la page)
  const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.main-nav a').forEach(a => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href === current) a.classList.add('active');
  });

  // 3) Remplir le label (JEUX/BUILDS/…)
  //    On lit en priorité <meta name="cms:label" content="JEUX"> ; sinon on déduit depuis l’URL.
  const metaLabel = document.querySelector('meta[name="cms:label"]')?.content?.trim();
  const mapByFile = {
    'index.html': 'HOME',
    'games.html': 'JEUX',
    'builds.html': 'BUILDS',
    'guides.html': 'GUIDES',
    'tools.html': 'OUTILS',
    'detail.html': 'DETAIL'
  };
  const label = metaLabel || mapByFile[current] || '';
  const el = document.getElementById('page-label');
  if (el) el.textContent = label;
})();
