import type {
  Provozovna,
  DenniTrzba,
  DenniZavierka,
  CashflowItem,
  Faktura,
  DataMode,
  Period,
} from './types';

// ─── Rozšířené typy pro widget tržeb ──────────────────────────

export type TrzbyZdroj = 'pokladna' | 'zavierka';

export interface Stredisko {
  id: string;
  nazev: string;
  trzba: number;
  color: string;
}

export interface DenniTrzbaV2 {
  datum: string;
  provozovna: string;
  kuchyn: number;
  bar: number;
  celkem: number;
  zdroj: TrzbyZdroj;       // auto: závěrka pokud existuje, jinak pokladna
  strediska?: Stredisko[];  // střediska – zatím jen Piazza
}

export interface MesicData {
  rok: number;
  mesic: number;
  provozovna: string;
  sumaDoDnes: number;    // suma od 1. do dnes (pro aktuální rok)
  pocetDni: number;      // počet uplynulých dnů (pro avg výpočet)
  prumerDen: number;     // avg/den = sumaDoDnes / pocetDni
  sumaCelyMesic?: number; // jen pro LY: celý měsíc
  prumerDenCelyMesic?: number; // LY avg/den
}

// ─── Provozovny ───────────────────────────────────────────────────────────────

export const PROVOZOVNY: Provozovna[] = [
  // ── Aktivní ──────────────────────────────────────────────────
  {
    id: 'cg-brno',
    name: 'Con Gusto Brno',
    shortName: 'CG Brno',
    color: '#cdaa69',
    address: 'Náměstí Svobody 12, 602 00 Brno',
    manager: 'Tomáš Novák',
    phone: '+420 542 123 456',
    status: 'active',
  },
  {
    id: 'piazza',
    name: 'Piazza',
    shortName: 'Piazza',
    color: '#143746',
    address: 'Šilingrovo náměstí 1, 602 00 Brno',
    manager: 'Jana Horáčková',
    phone: '+420 542 654 321',
    status: 'active',
  },
  {
    id: 'monte',
    name: 'Monte bú',
    shortName: 'Monte',
    color: '#ad0d24',
    address: 'Dominikánské náměstí 5, 602 00 Brno',
    manager: 'Pavel Kratochvíl',
    phone: '+420 542 987 654',
    status: 'active',
  },
  {
    id: 'u-capa',
    name: 'Pivnice U Čápa',
    shortName: 'U Čápa',
    color: '#0C5E44',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'active',
  },
  {
    id: 'korek-winebar',
    name: 'KOREK Winebar',
    shortName: 'KOREK WB',
    color: '#648CE8',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'active',
  },
  {
    id: 'u-kohoutu',
    name: 'Pivnice U Kohoutů',
    shortName: 'U Kohoutů',
    color: '#E64843',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'active',
  },
  {
    id: 'nad-hladinkou',
    name: 'Pivnice Nad Hladinkou',
    shortName: 'Nad Hl.',
    color: '#203A9A',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'active',
  },
  {
    id: 'flank',
    name: 'Flank',
    shortName: 'Flank',
    color: '#3E111B',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'active',
  },
  {
    id: 'cg-catering',
    name: 'Con Gusto Catering',
    shortName: 'CG Cater.',
    color: '#4b0041',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'active',
  },
  {
    id: 'tackarna-londyn',
    name: 'Táckárna Londýn',
    shortName: 'Táck. LN',
    color: '#a4e055',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'active',
  },
  {
    id: 'tackarna-turanka',
    name: 'Táckárna Tuřanka',
    shortName: 'Táck. TU',
    color: '#40cf6d',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'active',
  },
  {
    id: 'tackarna-svedske-valy',
    name: 'Táckárna Švédské Valy',
    shortName: 'Táck. ŠV',
    color: '#d9f5bf',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'active',
  },
  {
    id: 'teatr',
    name: 'Teátr',
    shortName: 'Teátr',
    color: '#e56445',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'active',
  },
  {
    id: 'korek-wines',
    name: 'KOREK Wines',
    shortName: 'KOREK W',
    color: '#FFD9AB',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'active',
  },
  {
    id: 'jime-brno',
    name: 'Jíme Brno',
    shortName: 'Jíme Brno',
    color: '#0a0a5a',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'active',
  },
  {
    id: 'pijeme-vino',
    name: 'Pijeme víno',
    shortName: 'Pijeme v.',
    color: '#ffd2eb',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'active',
  },
  // ── Piazza sub-sekce (zobrazí se při škálování Piazza) ────────
  {
    id: 'piazza-ristorante',
    name: 'Piazza ristorante',
    shortName: 'P. Ristorante',
    color: '#C87D69',
    address: 'Šilingrovo náměstí 1, 602 00 Brno',
    manager: '—',
    phone: '—',
    status: 'inactive',
    parentId: 'piazza',
    note: 'Sub-sekce Piazza – zobrazuje se pouze při škálování provozu Piazza',
  },
  {
    id: 'piazza-caffe',
    name: 'Piazza caffe',
    shortName: 'P. Caffe',
    color: '#CDAA87',
    address: 'Šilingrovo náměstí 1, 602 00 Brno',
    manager: '—',
    phone: '—',
    status: 'inactive',
    parentId: 'piazza',
    note: 'Sub-sekce Piazza – zobrazuje se pouze při škálování provozu Piazza',
  },
  {
    id: 'piazza-garden',
    name: 'Piazza garden',
    shortName: 'P. Garden',
    color: '#B9876E',
    address: 'Šilingrovo náměstí 1, 602 00 Brno',
    manager: '—',
    phone: '—',
    status: 'inactive',
    parentId: 'piazza',
    note: 'Sub-sekce Piazza – zobrazuje se pouze při škálování provozu Piazza',
  },
  // ── Plánované ─────────────────────────────────────────────────
  {
    id: 'lango',
    name: 'Lango',
    shortName: 'Lango',
    color: '#fcdeba',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'planned',
    note: 'Připravujeme',
  },
  {
    id: 'supper-lunch',
    name: 'Supper Lunch',
    shortName: 'Supper L.',
    color: '#ff3700',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'planned',
    note: 'Připravujeme',
  },
  {
    id: 'tackarna-abb',
    name: 'Táckárna ABB',
    shortName: 'Táck. ABB',
    color: '#9097a7',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'planned',
    note: 'Připravujeme – brand barva zatím nestanovena',
  },
  {
    id: 'flank-2',
    name: 'Flank 2',
    shortName: 'Flank 2',
    color: '#9097a7',
    address: '—',
    manager: '—',
    phone: '—',
    status: 'planned',
    note: 'Připravujeme – název a vizuální identita budou upřesněny',
  },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysBefore(n: number): string {
  const d = new Date('2026-04-17');
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export const DAYS_7 = [
  daysBefore(6),
  daysBefore(5),
  daysBefore(4),
  daysBefore(3),
  daysBefore(2),
  daysBefore(1),
  daysBefore(0),
];

export const DAYS_30 = Array.from({ length: 30 }, (_, i) => daysBefore(29 - i));

// ─── Tržby – aktuální týden ───────────────────────────────────────────────────

const BASE: Record<string, { k: number[]; b: number[] }> = {
  'cg-brno':    { k: [42500,38200,51300,47800,55200,61400,58900], b: [18200,16500,22800,20100,24600,27300,25800] },
  piazza:       { k: [31200,28900,35400,33100,38700,42100,39600], b: [9800, 8700,11200,10500,12300,13900,12700] },
  monte:        { k: [22100,19800,25300,23600,27400,29800,28200], b: [14500,12800,16900,15300,18100,19700,18400] },
  'u-capa':     { k: [18200,15900,22100,20400,24800,27200,25100], b: [21300,18700,25800,23600,28100,31200,29400] },
  'korek-winebar': { k: [4200,3800,5100,4700,6300,8100,7600],    b: [19800,17200,23400,21600,26800,31100,29200] },
  'u-kohoutu':  { k: [16400,14200,19800,18100,22300,24600,23100], b: [18900,16400,22700,20800,25600,28300,26700] },
  'nad-hladinkou': { k: [14800,12900,17600,16200,19800,21900,20600], b: [16200,14100,19400,17900,22100,24600,23100] },
  flank:        { k: [28900,25800,33700,31200,36800,40200,38100], b: [11200,9800,13400,12300,14900,16800,15700] },
  // Phase 8.5 (zápis 12. 6. 2026) — CG Catering eviduje 2 typy tržeb (k = zdaněné = řadu, b = nezdaněné = osvobozené plnění)
  'cg-catering':{ k: [0,0,45200,0,38900,67800,0],                b: [0,0,8900,0,7200,12400,0] },
  'tackarna-londyn':      { k: [12400,10800,14900,13700,16800,18900,17600], b: [3200,2800,3900,3600,4400,5100,4800] },
  'tackarna-turanka':     { k: [9800, 8600,11700,10800,13200,14900,13800], b: [2400,2100,2900,2700,3300,3800,3500] },
  'tackarna-svedske-valy':{ k: [11200,9800,13400,12300,14900,16800,15700], b: [2800,2400,3300,3000,3700,4200,3900] },
  teatr:        { k: [21800,19400,26200,24100,29300,32100,30400], b: [15400,13600,18300,16800,20600,22800,21400] },
  'korek-wines':{ k: [3200,2800,4100,3700,5200,6800,6400],       b: [14600,12800,17200,15900,19400,22600,21200] },
  'jime-brno':  { k: [24600,21800,29400,27200,32900,36100,34200], b: [7200,6300,8600,7900,9800,11200,10400] },
};

const ZERO7 = { k: [0,0,0,0,0,0,0], b: [0,0,0,0,0,0,0] };

export const TRZBY_7D: DenniTrzba[] = PROVOZOVNY.flatMap((p) => {
  const d = BASE[p.id] ?? ZERO7;
  return DAYS_7.map((datum, i) => ({
    datum,
    provozovna: p.id,
    kuchyn: d.k[i],
    bar: d.b[i],
    celkem: d.k[i] + d.b[i],
    mode: (i === 6 ? 'live' : 'zavierka') as DataMode,
  }));
});

// ─── Střediska Piazza (pro stredisko view) ────────────────────
// Kuchyň Piazzy = Sál + Terasa; Bar zůstává jako celek

const PIAZZA_STREDISKA_SPLIT = [
  // [sál, terasa] jako podíl z kuchyně
  [0.62, 0.38],
  [0.64, 0.36],
  [0.61, 0.39],
  [0.63, 0.37],
  [0.60, 0.40],
  [0.62, 0.38],
  [0.63, 0.37],
];

// ─── TRZBY_7D_V2 – rozšířená verze s zdrojem a středisky ─────
// Zdroj logika (zadání Petr Dohnal 13.4.):
//   - sobota (i=0), neděle (i=1): pokladna (víkend bez závěrky)
//   - pondělí-středa (i=2-4): závěrka existuje
//   - čtvrtek (i=5): závěrka existuje
//   - dnes pátek (i=6): pokladna (den ještě probíhá)

export const TRZBY_7D_V2: DenniTrzbaV2[] = PROVOZOVNY.flatMap((p) =>
  DAYS_7.map((datum, i) => {
    const zdroj: TrzbyZdroj = (i === 0 || i === 1 || i === 6) ? 'pokladna' : 'zavierka';
    const bd = BASE[p.id] ?? ZERO7;
    const kuchyn = bd.k[i];
    const bar    = bd.b[i];

    // Střediska jen pro Piazzu
    const strediska: Stredisko[] | undefined =
      p.id === 'piazza'
        ? [
            {
              id: 'sal',
              nazev: 'Sál',
              trzba: Math.round(kuchyn * PIAZZA_STREDISKA_SPLIT[i][0]),
              color: '#1c84ee',
            },
            {
              id: 'terasa',
              nazev: 'Terasa',
              trzba: Math.round(kuchyn * PIAZZA_STREDISKA_SPLIT[i][1]),
              color: '#f97316',
            },
            {
              id: 'bar',
              nazev: 'Bar',
              trzba: bar,
              color: '#22c55e',
            },
          ]
        : undefined;

    return {
      datum,
      provozovna: p.id,
      kuchyn,
      bar,
      celkem: kuchyn + bar,
      zdroj,
      strediska,
    };
  })
);

// ─── Měsíční data pro srovnání Duben 2026 vs. Duben 2025 ─────

// Duben 2026: 17 dní k dnešnímu dni (1.4.–17.4.)
const MESIC_2026: Record<string, number> = {
  'cg-brno':             1_201_800,
  piazza:                  741_500,
  monte:                   583_200,
  'u-capa':                774_600,
  'korek-winebar':         570_400,
  'u-kohoutu':             694_800,
  'nad-hladinkou':         618_300,
  flank:                   824_100,
  'cg-catering':           439_200,
  'tackarna-londyn':       344_800,
  'tackarna-turanka':      271_600,
  'tackarna-svedske-valy': 309_400,
  teatr:                   712_900,
  'korek-wines':           528_600,
  'jime-brno':             684_200,
};

// Duben 2025: celý měsíc (30 dní)
const MESIC_2025: Record<string, number> = {
  'cg-brno':             1_892_000,
  piazza:                1_101_000,
  monte:                   867_000,
  'u-capa':              1_198_000,
  'korek-winebar':         881_000,
  'u-kohoutu':           1_074_000,
  'nad-hladinkou':         956_000,
  flank:                 1_274_000,
  'cg-catering':           712_000,
  'tackarna-londyn':       532_000,
  'tackarna-turanka':      419_000,
  'tackarna-svedske-valy': 478_000,
  teatr:                 1_102_000,
  'korek-wines':           817_000,
  'jime-brno':           1_058_000,
};

export const MESIC_DATA: MesicData[] = PROVOZOVNY.flatMap((p) => {
  const m26 = MESIC_2026[p.id] ?? 0;
  const m25 = MESIC_2025[p.id] ?? 0;
  return [
    {
      rok: 2026,
      mesic: 4,
      provozovna: p.id,
      sumaDoDnes: m26,
      pocetDni: 17,
      prumerDen: m26 ? Math.round(m26 / 17) : 0,
    },
    {
      rok: 2025,
      mesic: 4,
      provozovna: p.id,
      sumaDoDnes: m25,
      pocetDni: 30,
      prumerDen: m25 ? Math.round(m25 / 30) : 0,
      sumaCelyMesic: m25,
      prumerDenCelyMesic: m25 ? Math.round(m25 / 30) : 0,
    },
  ];
});

// ─── Tržby – předchozí týden (srovnání) ──────────────────────────────────────

const PREV: Record<string, { k: number[]; b: number[] }> = {
  'cg-brno':    { k: [39200,35100,48600,45200,52100,57800,55300], b: [16800,15200,21100,18900,23100,25600,24200] },
  piazza:       { k: [28900,26400,33100,30800,36200,39400,37100], b: [9100, 8100,10600, 9800,11500,13100,11900] },
  monte:        { k: [20400,18200,23800,22100,25900,27900,26500], b: [13400,11900,15700,14200,17000,18500,17300] },
  'u-capa':     { k: [17100,14800,20600,19200,23400,25800,23900], b: [19800,17400,24100,22000,26500,29400,27700] },
  'korek-winebar': { k: [3900,3500,4800,4400,5900,7600,7100],    b: [18400,16000,21900,20200,25100,29200,27400] },
  'u-kohoutu':  { k: [15300,13200,18500,16900,20900,23100,21700], b: [17700,15300,21200,19400,23900,26500,24900] },
  'nad-hladinkou': { k: [13900,12100,16500,15200,18600,20600,19400], b: [15200,13200,18200,16800,20700,23100,21700] },
  flank:        { k: [27100,24200,31600,29300,34600,37900,35900], b: [10500,9200,12600,11600,14000,15800,14800] },
  'cg-catering':{ k: [0,52100,0,41200,0,0,58400],                b: [0,9800,0,7600,0,0,10900] },
  'tackarna-londyn':      { k: [11700,10200,14100,12900,15800,17900,16600], b: [3000,2600,3700,3400,4100,4800,4500] },
  'tackarna-turanka':     { k: [9200, 8100,11000,10200,12400,14100,13000], b: [2200,2000,2700,2500,3100,3600,3300] },
  'tackarna-svedske-valy':{ k: [10500,9200,12600,11600,14000,15800,14800], b: [2600,2300,3100,2800,3500,3900,3700] },
  teatr:        { k: [20500,18200,24600,22700,27600,30300,28700], b: [14500,12800,17200,15800,19400,21500,20200] },
  'korek-wines':{ k: [3000,2600,3800,3500,4800,6400,6000],       b: [13700,12000,16200,14900,18200,21300,19900] },
  'jime-brno':  { k: [23200,20500,27700,25600,30900,34000,32200], b: [6800,5900,8100,7400,9200,10500,9800] },
};

export const PREV_WEEK_TRZBY: DenniTrzba[] = PROVOZOVNY.flatMap((p) => {
  const d = PREV[p.id] ?? ZERO7;
  return DAYS_7.map((_, i) => ({
    datum: daysBefore(13 - i),
    provozovna: p.id,
    kuchyn: d.k[i],
    bar: d.b[i],
    celkem: d.k[i] + d.b[i],
    mode: 'zavierka' as DataMode,
  }));
});

// ─── Denní závěrky ────────────────────────────────────────────────────────────

export const DENNI_ZAVIERKY: DenniZavierka[] = [
  {
    id: 'z1',
    datum: DAYS_7[6],
    provozovna: 'cg-brno',
    trzba: 84700,
    stav: 'ceka',
    zalozil: '—',
    cas: '—',
  },
  {
    id: 'z2',
    datum: DAYS_7[5],
    provozovna: 'cg-brno',
    trzba: 88700,
    stav: 'ok',
    zalozil: 'T. Novák',
    cas: '23:45',
  },
  {
    id: 'z3',
    datum: DAYS_7[5],
    provozovna: 'piazza',
    trzba: 55700,
    stav: 'ok',
    zalozil: 'J. Horáčková',
    cas: '23:52',
  },
  {
    id: 'z4',
    datum: DAYS_7[5],
    provozovna: 'monte',
    trzba: 48200,
    stav: 'chyba',
    zalozil: 'P. Kratochvíl',
    cas: '00:12',
    poznamka: 'Nesouhlasí hotovost o 1 200 Kč',
  },
  {
    id: 'z5',
    datum: DAYS_7[4],
    provozovna: 'cg-brno',
    trzba: 79800,
    stav: 'ok',
    zalozil: 'T. Novák',
    cas: '23:41',
  },
  {
    id: 'z6',
    datum: DAYS_7[4],
    provozovna: 'piazza',
    trzba: 51000,
    stav: 'ok',
    zalozil: 'J. Horáčková',
    cas: '23:58',
  },
  {
    id: 'z7',
    datum: DAYS_7[4],
    provozovna: 'monte',
    trzba: 45500,
    stav: 'ceka',
    zalozil: '—',
    cas: '—',
  },
  {
    id: 'z8',
    datum: DAYS_7[3],
    provozovna: 'cg-brno',
    trzba: 67900,
    stav: 'ok',
    zalozil: 'T. Novák',
    cas: '23:38',
  },
  {
    id: 'z9',
    datum: DAYS_7[3],
    provozovna: 'piazza',
    trzba: 43600,
    stav: 'ok',
    zalozil: 'J. Horáčková',
    cas: '23:49',
  },
  {
    id: 'z10',
    datum: DAYS_7[3],
    provozovna: 'monte',
    trzba: 38900,
    stav: 'ok',
    zalozil: 'P. Kratochvíl',
    cas: '23:55',
  },
];

// ─── Cashflow ─────────────────────────────────────────────────────────────────

export const CASHFLOW_ITEMS: CashflowItem[] = [
  {
    id: 'cf1',
    typ: 'prijem',
    popis: 'Tržby CG Brno – 16.4.',
    castka: 88700,
    datum: DAYS_7[5],
    stav: 'ok',
  },
  {
    id: 'cf2',
    typ: 'prijem',
    popis: 'Tržby Piazza – 16.4.',
    castka: 55700,
    datum: DAYS_7[5],
    stav: 'ok',
  },
  {
    id: 'cf3',
    typ: 'vydaj',
    popis: 'Dodavatel Makro',
    castka: 45200,
    datum: '2026-04-10',
    splatnost: '2026-04-14',
    stav: 'po-splatnosti',
  },
  {
    id: 'cf4',
    typ: 'vydaj',
    popis: 'Pronájem CG Brno',
    castka: 85000,
    datum: '2026-04-05',
    splatnost: '2026-04-20',
    stav: 'ceka',
  },
  {
    id: 'cf5',
    typ: 'vydaj',
    popis: 'Mzdy – záloha duben',
    castka: 120000,
    datum: '2026-04-12',
    splatnost: '2026-04-15',
    stav: 'ok',
  },
  {
    id: 'cf6',
    typ: 'prijem',
    popis: 'Catering – event 14.4.',
    castka: 32500,
    datum: '2026-04-14',
    stav: 'ok',
  },
];

export const ZUSTATEK_UCET = 487300;

// ─── Faktury ──────────────────────────────────────────────────────────────────

export const FAKTURY: Faktura[] = [
  {
    id: 'f1',
    cislo: 'FAK-2026-0041',
    dodavatel: 'Makro Cash & Carry',
    castka: 45200,
    datum: '2026-04-10',
    splatnost: '2026-04-14',
    stav: 'po-splatnosti',
  },
  {
    id: 'f2',
    cislo: 'FAK-2026-0042',
    dodavatel: 'Coca-Cola HBC',
    castka: 18700,
    datum: '2026-04-12',
    splatnost: '2026-04-26',
    stav: 'ceka',
  },
  {
    id: 'f3',
    cislo: 'FAK-2026-0043',
    dodavatel: 'Plzeňský Prazdroj',
    castka: 22100,
    datum: '2026-04-12',
    splatnost: '2026-04-26',
    stav: 'ceka',
  },
  {
    id: 'f4',
    cislo: 'FAK-2026-0038',
    dodavatel: 'Správa budov s.r.o.',
    castka: 85000,
    datum: '2026-04-05',
    splatnost: '2026-04-20',
    stav: 'ceka',
  },
  {
    id: 'f5',
    cislo: 'FAK-2026-0035',
    dodavatel: 'Metro AG',
    castka: 31400,
    datum: '2026-04-01',
    splatnost: '2026-04-15',
    stav: 'uhrazena',
  },
];

// ─── Aggregation helpers ──────────────────────────────────────────────────────

export function getTrzbyByDay(provozovna: string, days: string[]) {
  return days.map((datum) => {
    const rows = TRZBY_7D.filter(
      (t) =>
        t.datum === datum &&
        (provozovna === 'all' || t.provozovna === provozovna)
    );
    return {
      datum,
      kuchyn: rows.reduce((s, t) => s + t.kuchyn, 0),
      bar: rows.reduce((s, t) => s + t.bar, 0),
      celkem: rows.reduce((s, t) => s + t.celkem, 0),
    };
  });
}

export function getTotalTrzby(provozovna: string, days: string[]) {
  const rows = TRZBY_7D.filter(
    (t) =>
      days.includes(t.datum) &&
      (provozovna === 'all' || t.provozovna === provozovna)
  );
  return {
    kuchyn: rows.reduce((s, t) => s + t.kuchyn, 0),
    bar: rows.reduce((s, t) => s + t.bar, 0),
    celkem: rows.reduce((s, t) => s + t.celkem, 0),
  };
}

export function getPrevTotalTrzby(provozovna: string) {
  const rows = PREV_WEEK_TRZBY.filter(
    (t) => provozovna === 'all' || t.provozovna === provozovna
  );
  return {
    kuchyn: rows.reduce((s, t) => s + t.kuchyn, 0),
    bar: rows.reduce((s, t) => s + t.bar, 0),
    celkem: rows.reduce((s, t) => s + t.celkem, 0),
  };
}

// ─── Hero blok – dnešní den vs. D-7 ──────────────────────────────────────────

export function getTrzbyDnes(provozovna: string) {
  const dnes = DAYS_7[6]; // referenční datum: 2026-04-17
  const rows = TRZBY_7D.filter(
    (t) => t.datum === dnes && (provozovna === 'all' || t.provozovna === provozovna)
  );
  return {
    datum: dnes,
    kuchyn: rows.reduce((s, t) => s + t.kuchyn, 0),
    bar:    rows.reduce((s, t) => s + t.bar, 0),
    celkem: rows.reduce((s, t) => s + t.celkem, 0),
    zdroj:  'pokladna' as const, // pátek = live, závěrka ještě neexistuje
  };
}

export function getTrzbyD7(provozovna: string) {
  // Stejný den minulého týdne = index 6 v PREV_WEEK_TRZBY (daysBefore(7))
  const rows = PREV_WEEK_TRZBY.filter(
    (t) =>
      t.datum === daysBefore(7) &&
      (provozovna === 'all' || t.provozovna === provozovna)
  );
  return {
    kuchyn: rows.reduce((s, t) => s + t.kuchyn, 0),
    bar:    rows.reduce((s, t) => s + t.bar, 0),
    celkem: rows.reduce((s, t) => s + t.celkem, 0),
  };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function fCzk(n: number): string {
  const num = new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n).replace(/(\d)\s(\d)/g, '$1 $2');
  return `${num} Kč`;
}

export function fCzkShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M Kč`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} tis. Kč`;
  return `${n} Kč`;
}

export function fDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' });
}

export function fDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('cs-CZ', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });
}

export function fDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.toLocaleDateString('cs-CZ', { weekday: 'short' });
  const num = d.getDate();
  return `${day} ${num}.`;
}

export function pctChange(current: number, prev: number): number {
  if (prev === 0) return 0;
  return Math.round(((current - prev) / prev) * 100 * 10) / 10;
}

// ─── V2 helpers: TRZBY_7D_V2 ─────────────────────────────────

export function getTrzbyByDayV2(provozovna: string, days: string[]) {
  return days.map((datum) => {
    const rows = TRZBY_7D_V2.filter(
      (t) =>
        t.datum === datum &&
        (provozovna === 'all' || t.provozovna === provozovna)
    );
    // Zdroj: pokud aspoň jedna závěrka → závěrka, jinak pokladna
    const zdroj: TrzbyZdroj =
      rows.some((r) => r.zdroj === 'zavierka') ? 'zavierka' : 'pokladna';
    return {
      datum,
      kuchyn: rows.reduce((s, t) => s + t.kuchyn, 0),
      bar: rows.reduce((s, t) => s + t.bar, 0),
      celkem: rows.reduce((s, t) => s + t.celkem, 0),
      zdroj,
      strediska: provozovna === 'piazza' ? (rows[0]?.strediska ?? undefined) : undefined,
    };
  });
}

export function getTotalTrzbyV2(provozovna: string, days: string[]) {
  const rows = TRZBY_7D_V2.filter(
    (t) =>
      days.includes(t.datum) &&
      (provozovna === 'all' || t.provozovna === provozovna)
  );
  return {
    kuchyn: rows.reduce((s, t) => s + t.kuchyn, 0),
    bar: rows.reduce((s, t) => s + t.bar, 0),
    celkem: rows.reduce((s, t) => s + t.celkem, 0),
  };
}

// Součet tržeb per provozovna pro week breakdown
export function getTrzbyPerProvozovna(days: string[]) {
  return PROVOZOVNY.map((p) => {
    const rows = TRZBY_7D_V2.filter(
      (t) => days.includes(t.datum) && t.provozovna === p.id
    );
    const cur  = rows.reduce((s, t) => s + t.celkem, 0);
    const prev = PREV_WEEK_TRZBY
      .filter((t) => t.provozovna === p.id)
      .reduce((s, t) => s + t.celkem, 0);
    return { provozovna: p, cur, prev, chng: pctChange(cur, prev) };
  });
}

// Měsíc vs. LY helper
export function getMesicVsLY(provozovna: string): {
  cur2026: MesicData | undefined;
  ly2025: MesicData | undefined;
  chng: number;
} {
  const filter = (r: MesicData) =>
    r.mesic === 4 &&
    (provozovna === 'all' || r.provozovna === provozovna);

  // Pro 'all': sečti všechny provozovny
  const cur2026 = provozovna === 'all'
    ? {
        rok: 2026, mesic: 4, provozovna: 'all',
        sumaDoDnes: MESIC_DATA.filter((m) => m.rok === 2026 && m.mesic === 4).reduce((s, m) => s + m.sumaDoDnes, 0),
        pocetDni: 17,
        prumerDen: Math.round(MESIC_DATA.filter((m) => m.rok === 2026 && m.mesic === 4).reduce((s, m) => s + m.sumaDoDnes, 0) / 17),
      }
    : MESIC_DATA.find((m) => m.rok === 2026 && filter(m));

  const ly2025 = provozovna === 'all'
    ? {
        rok: 2025, mesic: 4, provozovna: 'all',
        sumaDoDnes: MESIC_DATA.filter((m) => m.rok === 2025 && m.mesic === 4).reduce((s, m) => s + m.sumaDoDnes, 0),
        pocetDni: 30,
        prumerDen: Math.round(MESIC_DATA.filter((m) => m.rok === 2025 && m.mesic === 4).reduce((s, m) => s + m.sumaDoDnes, 0) / 30),
        sumaCelyMesic: MESIC_DATA.filter((m) => m.rok === 2025 && m.mesic === 4).reduce((s, m) => s + (m.sumaCelyMesic ?? 0), 0),
        prumerDenCelyMesic: Math.round(MESIC_DATA.filter((m) => m.rok === 2025 && m.mesic === 4).reduce((s, m) => s + m.sumaDoDnes, 0) / 30),
      }
    : MESIC_DATA.find((m) => m.rok === 2025 && filter(m));

  const chng =
    cur2026 && ly2025
      ? pctChange(cur2026.prumerDen, ly2025.prumerDen)
      : 0;

  return { cur2026, ly2025, chng };
}

// ─── Period-aware helpers ─────────────────────────────────────────────────────

export const PREV_WEEK_DAYS = Array.from({ length: 7 }, (_, i) => daysBefore(13 - i));

// Agregovaná data provozovny na den (průměr BASE)
function avgDayBase(provozovna: string): { k: number; b: number } {
  const pList = PROVOZOVNY.filter(
    (p) => p.status === 'active' && (provozovna === 'all' || p.id === provozovna)
  );
  const k = pList.reduce((s, p) => s + (BASE[p.id] ?? ZERO7).k.reduce((a, x) => a + x, 0) / 7, 0);
  const b = pList.reduce((s, p) => s + (BASE[p.id] ?? ZERO7).b.reduce((a, x) => a + x, 0) / 7, 0);
  return { k, b };
}

// Vygeneruje N "souhrnných" sloupců pro delší období (týdny/měsíce)
function genBars(datums: string[], scaleK: number[], scaleB: number[], daysPerBar: number, provozovna: string): DenniTrzbaV2[] {
  const avg = avgDayBase(provozovna);
  return datums.map((datum, i) => {
    const kuchyn = Math.round(avg.k * daysPerBar * scaleK[i]);
    const bar    = Math.round(avg.b * daysPerBar * scaleB[i]);
    return { datum, provozovna, kuchyn, bar, celkem: kuchyn + bar, zdroj: 'zavierka' as TrzbyZdroj };
  });
}

export function getTrzbyForPeriod(provozovna: string, period: Period) {
  switch (period) {
    case 'dnes':
      return getTrzbyByDayV2(provozovna, [DAYS_7[6]]);
    case 'vcera':
      return getTrzbyByDayV2(provozovna, [DAYS_7[5]]);
    case 'tyden':
      return getTrzbyByDayV2(provozovna, DAYS_7);
    case 'minuly-tyden': {
      // Použij PREV data pro Apr 4–10
      return PREV_WEEK_DAYS.map((datum, i) => {
        const pList = PROVOZOVNY.filter(
          (p) => p.status === 'active' && (provozovna === 'all' || p.id === provozovna)
        );
        const kuchyn = pList.reduce((s, p) => s + (PREV[p.id] ?? ZERO7).k[i], 0);
        const bar    = pList.reduce((s, p) => s + (PREV[p.id] ?? ZERO7).b[i], 0);
        return { datum, provozovna, kuchyn, bar, celkem: kuchyn + bar, zdroj: 'zavierka' as TrzbyZdroj };
      });
    }
    case 'minuly-mesic': {
      // 5 týdenních souhrnů pro březen 2026
      const dates  = ['2026-03-02','2026-03-09','2026-03-16','2026-03-23','2026-03-30'];
      const scaleK = [0.89, 0.91, 0.93, 0.95, 0.29]; // poslední "týden" jen 2 dny
      const scaleB = [0.88, 0.90, 0.92, 0.94, 0.29];
      return genBars(dates, scaleK, scaleB, 7, provozovna);
    }
    case 'rok': {
      // 4 měsíční souhrny Led–Dub 2026
      const dates  = ['2026-01-01','2026-02-01','2026-03-01','2026-04-01'];
      const scaleK = [0.82, 0.87, 0.94, 0.57]; // duben = 17/30 dnů
      const scaleB = [0.80, 0.85, 0.92, 0.57];
      return genBars(dates, scaleK, scaleB, 30, provozovna);
    }
    default:
      return getTrzbyByDayV2(provozovna, DAYS_7);
  }
}

export function getTotalForPeriod(provozovna: string, period: Period) {
  const data = getTrzbyForPeriod(provozovna, period);
  return {
    kuchyn: data.reduce((s, d) => s + d.kuchyn, 0),
    bar:    data.reduce((s, d) => s + d.bar,    0),
    celkem: data.reduce((s, d) => s + d.celkem, 0),
  };
}

export function getPrevForPeriod(provozovna: string, period: Period) {
  // Vrátí srovnávací totály pro předchozí srovnatelné období
  switch (period) {
    case 'dnes':
    case 'vcera': {
      // Srovnání se stejným dnem minulého týdne
      const idx = period === 'dnes' ? 6 : 5;
      const pList = PROVOZOVNY.filter(
        (p) => p.status === 'active' && (provozovna === 'all' || p.id === provozovna)
      );
      const kuchyn = pList.reduce((s, p) => s + (PREV[p.id] ?? ZERO7).k[idx], 0);
      const bar    = pList.reduce((s, p) => s + (PREV[p.id] ?? ZERO7).b[idx], 0);
      return { kuchyn, bar, celkem: kuchyn + bar };
    }
    case 'tyden':
      return getPrevTotalTrzby(provozovna);
    case 'minuly-tyden': {
      // Týden před minulým = scale PREV * 0.96
      const prev = getPrevTotalTrzby(provozovna);
      return { kuchyn: Math.round(prev.kuchyn * 0.96), bar: Math.round(prev.bar * 0.96), celkem: Math.round(prev.celkem * 0.96) };
    }
    case 'minuly-mesic': {
      // Únor 2026 – scale minuly-mesic * 0.94
      const mar = getTotalForPeriod(provozovna, 'minuly-mesic');
      return { kuchyn: Math.round(mar.kuchyn * 0.94), bar: Math.round(mar.bar * 0.94), celkem: Math.round(mar.celkem * 0.94) };
    }
    case 'rok': {
      // Leden–Duben 2025 – scale * 0.91
      const ytd = getTotalForPeriod(provozovna, 'rok');
      return { kuchyn: Math.round(ytd.kuchyn * 0.91), bar: Math.round(ytd.bar * 0.91), celkem: Math.round(ytd.celkem * 0.91) };
    }
    default:
      return getPrevTotalTrzby(provozovna);
  }
}

export function getPeriodTitle(period: Period): string {
  return {
    dnes:           'Tržby – dnes',
    vcera:          'Tržby – včera',
    tyden:          'Tržby – tento týden',
    'minuly-tyden': 'Tržby – minulý týden',
    'minuly-mesic': 'Tržby – minulý měsíc (březen)',
    rok:            'Tržby – aktuální rok (Led–Dub 2026)',
  }[period];
}

export function getPeriodCompareLabel(period: Period): string {
  return {
    dnes:           'vs. stejný den min. týden',
    vcera:          'vs. stejný den min. týden',
    tyden:          'vs. minulý týden',
    'minuly-tyden': 'vs. týden před ním',
    'minuly-mesic': 'vs. únor 2026',
    rok:            'vs. stejné období 2025',
  }[period];
}

export function getPeriodShortLabel(period: Period): string {
  return {
    dnes:           'Dnes',
    vcera:          'Včera',
    tyden:          'Tento týden',
    'minuly-tyden': 'Min. týden',
    'minuly-mesic': 'Min. měsíc',
    rok:            'Rok 2026',
  }[period];
}

export function periodBarLabel(datum: string, period: Period): string {
  const d = new Date(datum + 'T12:00:00');
  if (period === 'rok') {
    return d.toLocaleDateString('cs-CZ', { month: 'short' });
  }
  if (period === 'minuly-mesic') {
    return `${d.getDate()}. ${d.getMonth() + 1}.`;
  }
  if (period === 'dnes' || period === 'vcera') {
    return d.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric' });
  }
  return fDayLabel(datum);
}
