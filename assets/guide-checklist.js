const GAME_CONFIG = {
  // slug = le nom de fichier dans content/games/<slug>.json
  'last-epoch': {
    totals: {
      passives:        { label: 'Passifs',        icon: '★' },
      idol_slots:      { label: 'Idoles',         icon: '⌘' },
      respec_points:   { label: 'Respec',         icon: '↺' }
    },
    // détection auto optionnelle depuis le texte (si awards absent)
    detect: [
      { key: 'passives',     re: /\b(\+?\d+)\s*(passive|passives)\b/i },
      { key: 'idol_slots',   re: /\b(\+?\d+)\s*(idol(?:\s*slot)?s?)\b/i },
      { key: 'respec_points',re: /\b(\+?\d+)\s*(respec(?:\s*points?)?)\b/i }
    ]
  },

  'path-of-exile-i': {
    totals: {
      passive_points:  { label: 'Passifs',        icon: '★' },
      max_life_percent:{ label: 'Vie max %',      icon: '❤' },
      respec_points:   { label: 'Respec',         icon: '↺' }
    },
    detect: [
      { key: 'passive_points',   re: /\b(\+?\d+)\s*(passive\s*points?)\b/i },
      { key: 'max_life_percent', re: /\b(\+?\d+)\s*%\s*(?:max(?:imum)?\s*)?life\b/i },
      { key: 'respec_points',    re: /\b(\+?\d+)\s*(respec(?:\s*points?)?)\b/i }
    ]
  },

  'path-of-exile-ii': {
    totals: {
      passive_points:  { label: 'Passifs',        icon: '★' },
      respec_points:   { label: 'Respec',         icon: '↺' }
      // ajoute d'autres stats PoE2 si utiles
    },
    detect: [
      { key: 'passive_points', re: /\b(\+?\d+)\s*(passive\s*points?)\b/i },
      { key: 'respec_points',  re: /\b(\+?\d+)\s*(respec(?:\s*points?)?)\b/i }
    ]
  }
};
