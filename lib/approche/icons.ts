// Pictogrammes de l'interface « Approche » : un seul jeu de tracés (24 × 24, trait) partagé par les composants React et les
// marqueurs de carte Leaflet, pour que tout soit homogène. Les noms sont libres : une icône inconnue retombe sur `dot`.

export const ICON_PATHS: Record<string, string> = {
  dot: '<circle cx="12" cy="12" r="3"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14c2.6.2 4.5 2.2 4.5 5"/>',
  coins: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V6z"/>',
  shieldCheck: '<path d="M12 3l7 3v5c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  building: '<path d="M4 21V9l8-5 8 5v12"/><path d="M9 21v-6h6v6M8 11h.01M12 11h.01M16 11h.01"/>',
  landmark: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M6 12H3c0 5 4 9 9 9s9-4 9-9h-3M8 12h8"/>',
  plane: '<path d="M21 4L3 11l7 2 2 7z"/><path d="M10 13l11-9"/>',
  jet: '<path d="M12 2c1 3 1 6 1 9l8 5v2l-8-2-1 5 2 1v1l-3-.5L8 23v-1l2-1-1-5-8 2v-2l8-5c0-3 0-6 3-12z"/>',
  atom: '<circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>',
  ship: '<path d="M3 17l2 4h14l2-4-9-3z"/><path d="M12 14V4l6 5h-6M6 11l6-3"/>',
  sub: '<ellipse cx="12" cy="14" rx="9" ry="4"/><path d="M9 10V7h5v3M14 7h2M21 14h2"/>',
  tank: '<rect x="3" y="12" width="18" height="6" rx="3"/><path d="M8 12V9h7l3 3M15 9l6-2"/>',
  cannon: '<path d="M4 16h8l8-7M3 20h10M7 16v4M11 16v4"/><circle cx="6" cy="20" r="1"/>',
  factory: '<path d="M3 21V10l6 3V10l6 3V6h4v15z"/><path d="M8 17h2M13 17h2"/>',
  bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
  wheat: '<path d="M12 22V8M12 12c-3 0-4-2-4-4 3 0 4 1 4 4zM12 12c3 0 4-2 4-4-3 0-4 1-4 4zM12 17c-3 0-4-2-4-4 3 0 4 1 4 4zM12 17c3 0 4-2 4-4-3 0-4 1-4 4zM12 8c-2-1-2-4 0-6 2 2 2 5 0 6z"/>',
  car: '<path d="M4 15l2-6h12l2 6v4h-3v-2H7v2H4z"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>',
  flask: '<path d="M9 3h6M10 3v6l-6 10a2 2 0 002 3h12a2 2 0 002-3l-6-10V3"/><path d="M7 15h10"/>',
  gem: '<path d="M6 4h12l4 6-10 11L2 10z"/><path d="M2 10h20M9 4l3 6 3-6"/>',
  satellite: '<rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)"/><path d="M4 8l3 3M17 13l3 3M5 19a8 8 0 018-8"/>',
  chip: '<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
  server: '<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><path d="M7 7h.01M7 17h.01"/>',
  cloud: '<path d="M7 18a4 4 0 01-.5-8 5.5 5.5 0 0110.7 1.5A3.5 3.5 0 0117 18z"/>',
  pill: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="M9 8l6 8" transform="rotate(0 12 12)"/>',
  flame: '<path d="M12 22c-4 0-7-3-7-7 0-3 2-5 3-7 1 2 2 2 3 2 0-3 1-6 4-8 1 4 4 6 4 11 0 4-3 9-7 9z"/>',
  wave: '<path d="M2 9c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/>',
  quake: '<path d="M2 12h4l2-6 4 12 3-9 2 3h5"/>',
  handshake: '<path d="M3 11l4-3 4 2 3-2 7 5-4 5-3 1-3-2-3 1-5-4z"/><path d="M11 10l3 3"/>',
  scale: '<path d="M12 3v18M6 21h12M5 7h14"/><path d="M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  pin: '<path d="M12 22s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  warning: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  check: '<path d="M4 12l5 5 11-11"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  book: '<path d="M4 5a2 2 0 012-2h13v17H6a2 2 0 00-2 2z"/><path d="M4 19V5"/>',
  megaphone: '<path d="M3 10v4h4l8 5V5L7 10z"/><path d="M18 9a4 4 0 010 6"/>',
  radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 12l6-6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  road: '<path d="M7 21L9 3M17 21L15 3M12 6v3M12 12v3M12 18v2"/>',
  train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 21l2-4M16 21l-2-4M9 14h.01M15 14h.01"/>',
  tower: '<path d="M12 3v18M8 21h8M9 7h6M8 11h8M7 16h10M12 3l-3 4M12 3l3 4"/>',
  fuel: '<path d="M5 21V5a2 2 0 012-2h6a2 2 0 012 2v16M5 21h10M5 10h10M15 8h2l2 2v8a1.5 1.5 0 003 0V9"/>',
  drop: '<path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z"/>',
  mountain: '<path d="M3 20l6-10 4 6 3-4 5 8z"/>',
  tree: '<path d="M12 22v-6M12 3l6 9h-3l4 6H5l4-6H6z"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  heart: '<path d="M12 21s-8-5-8-11a4.5 4.5 0 018-2.5A4.5 4.5 0 0120 10c0 6-8 11-8 11z"/>',
  hand: '<path d="M8 12V5a1.5 1.5 0 013 0v6M11 11V3.5a1.5 1.5 0 013 0V11M14 11V5a1.5 1.5 0 013 0v8a7 7 0 01-7 7c-3 0-4-2-6-5l-1-2a1.5 1.5 0 012-2l2 2"/>',
};

export type IconName = keyof typeof ICON_PATHS;

/** Balisage SVG complet d'une icône (pour les marqueurs Leaflet, qui reçoivent du HTML). */
export function iconSvg(name: string, size = 16, stroke = "#fff"): string {
  const inner = ICON_PATHS[name] ?? ICON_PATHS.dot;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

/** Icône par défaut d'un type d'objet de carte (sinon celle de la couche, sinon un point). */
export function iconForKind(kind: string, fallback = "dot"): string {
  const k = kind.toLowerCase();
  const rules: [RegExp, string][] = [
    [/base|implantation/, "flag"],
    [/territoire/, "pin"],
    [/op[ée]ration|zone d.op/, "target"],
    [/partenariat|coop/, "handshake"],
    [/port/, "anchor"],
    [/a[ée]roport/, "plane"],
    [/centrale|nucl/, "atom"],
    [/gnl|terminal/, "fuel"],
    [/ambassade/, "building"],
    [/consulat/, "landmark"],
    [/repr[ée]sentation|mission/, "globe"],
    [/inondation|aléa.*eau/, "drop"],
    [/feu|incend/, "flame"],
    [/sism|s[ée]isme/, "quake"],
    [/site|industr/, "factory"],
  ];
  return rules.find(([pattern]) => pattern.test(k))?.[1] ?? fallback;
}
