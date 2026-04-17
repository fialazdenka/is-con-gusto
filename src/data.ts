import type {
  Provozovna,
  DenniTrzba,
  DenniZavierka,
  CashflowItem,
  Faktura,
  DataMode,
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
  {
    id: 'cg-brno',
    name: 'Con Gusto Brno',
    shortName: 'CG Brno',
    color: '#3b82f6',
    address: 'Náměstí Svobody 12, 602 00 Brno',
    manager: 'Tomáš Novák',
    phone: '+420 542 123 456',
    status: 'active',
  },
  {
    id: 'piazza',
    name: 'Piazza',
    shortName: 'Piazza',
    color: '#22c55e',
    address: 'Šilingrovo náměstí 1, 602 00 Brno',
    manager: 'Jana Horáčková',
    phone: '+420 542 654 321',
    status: 'active',
  },
  {
    id: 'monte',
    name: 'Monte',
    shortName: 'Monte',
    color: '#a855f7',
    address: 'Dominikánské náměstí 5, 602 00 Brno',
    manager: 'Pavel Kratochvíl',
    phone: '+420 542 987 654',
    status: 'active',
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
  'cg-brno': {
    k: [42500, 38200, 51300, 47800, 55200, 61400, 58900],
    b: [18200, 16500, 22800, 20100, 24600, 27300, 25800],
  },
  piazza: {
    k: [31200, 28900, 35400, 33100, 38700, 42100, 39600],
    b: [9800, 8700, 11200, 10500, 12300, 13900, 12700],
  },
  monte: {
    k: [22100, 19800, 25300, 23600, 27400, 29800, 28200],
    b: [14500, 12800, 16900, 15300, 18100, 19700, 18400],
  },
};

export const TRZBY_7D: DenniTrzba[] = PROVOZOVNY.flatMap((p) =>
  DAYS_7.map((datum, i) => ({
    datum,
    provozovna: p.id,
    kuchyn: BASE[p.id].k[i],
    bar: BASE[p.id].b[i],
    celkem: BASE[p.id].k[i] + BASE[p.id].b[i],
    mode: (i === 6 ? 'live' : 'zavierka') as DataMode,
  }))
);

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
    const kuchyn = BASE[p.id].k[i];
    const bar    = BASE[p.id].b[i];

    // Střediska jen pro Piazzu
    const strediska: Stredisko[] | undefined =
      p.id === 'piazza'
        ? [
            {
              id: 'sal',
              nazev: 'Sál',
              trzba: Math.round(kuchyn * PIAZZA_STREDISKA_SPLIT[i][0]),
              color: '#3b82f6',
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
  'cg-brno': 1_201_800,
  piazza:     741_500,
  monte:      583_200,
};

// Duben 2025: celý měsíc (30 dní)
const MESIC_2025: Record<string, number> = {
  'cg-brno': 1_892_000,
  piazza:    1_101_000,
  monte:       867_000,
};

export const MESIC_DATA: MesicData[] = PROVOZOVNY.flatMap((p) => [
  {
    rok: 2026,
    mesic: 4,
    provozovna: p.id,
    sumaDoDnes: MESIC_2026[p.id],
    pocetDni: 17,
    prumerDen: Math.round(MESIC_2026[p.id] / 17),
  },
  {
    rok: 2025,
    mesic: 4,
    provozovna: p.id,
    sumaDoDnes: MESIC_2025[p.id],
    pocetDni: 30,
    prumerDen: Math.round(MESIC_2025[p.id] / 30),
    sumaCelyMesic: MESIC_2025[p.id],
    prumerDenCelyMesic: Math.round(MESIC_2025[p.id] / 30),
  },
]);

// ─── Tržby – předchozí týden (srovnání) ──────────────────────────────────────

const PREV: Record<string, { k: number[]; b: number[] }> = {
  'cg-brno': {
    k: [39200, 35100, 48600, 45200, 52100, 57800, 55300],
    b: [16800, 15200, 21100, 18900, 23100, 25600, 24200],
  },
  piazza: {
    k: [28900, 26400, 33100, 30800, 36200, 39400, 37100],
    b: [9100, 8100, 10600, 9800, 11500, 13100, 11900],
  },
  monte: {
    k: [20400, 18200, 23800, 22100, 25900, 27900, 26500],
    b: [13400, 11900, 15700, 14200, 17000, 18500, 17300],
  },
};

export const PREV_WEEK_TRZBY: DenniTrzba[] = PROVOZOVNY.flatMap((p) =>
  DAYS_7.map((_, i) => ({
    datum: daysBefore(13 - i),
    provozovna: p.id,
    kuchyn: PREV[p.id].k[i],
    bar: PREV[p.id].b[i],
    celkem: PREV[p.id].k[i] + PREV[p.id].b[i],
    mode: 'zavierka' as DataMode,
  }))
);

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

// ─── Format helpers ───────────────────────────────────────────────────────────

export function fCzk(n: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
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
