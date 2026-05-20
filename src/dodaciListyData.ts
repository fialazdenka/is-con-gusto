// ─────────────────────────────────────────────────────────────
// Mock data – Dodací listy (DL)
// Párování: DL číslo ↔ číslo faktury ↔ VS
// ─────────────────────────────────────────────────────────────

export interface DLPolozka {
  popis: string;
  mnozstvi: number;
  jednotka: string;
  cenaBezDph: number;
  celkemBezDph: number;
  dphSazba: number;
  celkemSDph: number;
}

export interface DodaciList {
  cislo: string;
  datum: string;
  dodavatel: string;
  provozovna: string;
  polozky: DLPolozka[];
  celkemBezDph: number;
  celkemSDph: number;
}

// ── Spárované DL (fp01 – Makro CG Brno, částky sedí) ─────────
const DL_2026_0041: DodaciList = {
  cislo: 'DL-2026-0041',
  datum: '2026-04-08',
  dodavatel: 'Makro Cash & Carry',
  provozovna: 'cg-brno',
  polozky: [
    { popis: 'Maso a drůbež',              mnozstvi: 1, jednotka: 'ks', cenaBezDph: 14_821, celkemBezDph: 14_821, dphSazba: 12, celkemSDph: 16_600 },
    { popis: 'Zelenina, ovoce a bylinky',  mnozstvi: 1, jednotka: 'ks', cenaBezDph:  8_571, celkemBezDph:  8_571, dphSazba: 12, celkemSDph:  9_600 },
    { popis: 'Suchý sortiment a koření',   mnozstvi: 1, jednotka: 'ks', cenaBezDph:  8_393, celkemBezDph:  8_393, dphSazba: 12, celkemSDph:  9_400 },
    { popis: 'Nápoje a doplňkový sortiment',mnozstvi: 1, jednotka: 'ks', cenaBezDph:  8_571, celkemBezDph:  8_571, dphSazba: 12, celkemSDph:  9_600 },
  ],
  celkemBezDph: 40_357,
  celkemSDph: 45_200,
};

// ── Neshoda DL (fp02 – Linde Gas Piazza, DL nižší o 280 Kč) ──
const DL_2026_0039: DodaciList = {
  cislo: 'DL-2026-0039',
  datum: '2026-04-09',
  dodavatel: 'Linde Gas (CO₂)',
  provozovna: 'piazza',
  polozky: [
    { popis: 'CO₂ potravinářský (10 kg)',  mnozstvi: 3, jednotka: 'lahev', cenaBezDph: 1_071, celkemBezDph: 3_214, dphSazba: 12, celkemSDph: 3_600 },
    { popis: 'Poplatek za nájem láhve',    mnozstvi: 3, jednotka: 'ks',   cenaBezDph:   268, celkemBezDph:   804, dphSazba: 21, celkemSDph:   920 },
    // faktura má navíc přepravné 280 Kč – v DL chybí
  ],
  celkemBezDph: 4_018,
  celkemSDph: 4_520,   // faktura je 4 800 → rozdíl 280 Kč
};

// ── Neshoda DL (fp15 – Zásoba rek., DL nižší, probíhá reklamace)
const DL_2026_0049: DodaciList = {
  cislo: 'DL-2026-0049',
  datum: '2026-04-09',
  dodavatel: 'Zásoba s.r.o. (reklamace)',
  provozovna: 'cg-brno',
  polozky: [
    { popis: 'Čerstvé maso – telecí',      mnozstvi: 5,  jednotka: 'kg',  cenaBezDph:  893, celkemBezDph:  4_464, dphSazba: 12, celkemSDph:  5_000 },
    { popis: 'Uzeniny – výběrové',         mnozstvi: 3,  jednotka: 'kg',  cenaBezDph:  625, celkemBezDph:  1_875, dphSazba: 12, celkemSDph:  2_100 },
    // faktura požaduje ještě 2 500 Kč za vrácené zboží – DL to neobsahuje
  ],
  celkemBezDph: 6_339,
  celkemSDph: 8_100,   // faktura je 9 600 → rozdíl 1 500 Kč (reklamace)
};

// ── Neshoda DL (fp27 – Krušovice U Kohoutů, DL vyšší) ────────
const DL_2026_0061: DodaciList = {
  cislo: 'DL-2026-0061',
  datum: '2026-04-10',
  dodavatel: 'Pivovary Krušovice',
  provozovna: 'u-kohoutu',
  polozky: [
    { popis: 'Krušovice Černé 0,5l (keg)', mnozstvi: 2, jednotka: 'keg', cenaBezDph: 5_893, celkemBezDph: 11_786, dphSazba: 21, celkemSDph: 14_261 },
    { popis: 'Krušovice Světlé 0,5l (keg)',mnozstvi: 2, jednotka: 'keg', cenaBezDph: 5_536, celkemBezDph: 11_071, dphSazba: 21, celkemSDph: 13_396 },
    { popis: 'Vratné obaly – depozit',     mnozstvi: 4, jednotka: 'ks',  cenaBezDph:   455, celkemBezDph:  1_818, dphSazba:  0, celkemSDph:  1_818 },
    // DL celkem 29 200 Kč – faktura jen 28 900 Kč → dodavatel fakturoval méně
  ],
  celkemBezDph: 24_674,
  celkemSDph: 29_475,   // reálně 29 200 po zaokrouhlení
};

// ── Částečně spárováno (fp12 – Metro CG Brno, 2 DL) ──────────
const DL_2026_0052: DodaciList = {
  cislo: 'DL-2026-0052',
  datum: '2026-04-08',
  dodavatel: 'Metro AG',
  provozovna: 'cg-brno',
  polozky: [
    { popis: 'Suchý sortiment – velkoobchod', mnozstvi: 1, jednotka: 'ks', cenaBezDph: 12_679, celkemBezDph: 12_679, dphSazba: 12, celkemSDph: 14_200 },
    { popis: 'Mléčné výrobky',               mnozstvi: 1, jednotka: 'ks', cenaBezDph:  6_250, celkemBezDph:  6_250, dphSazba: 12, celkemSDph:  7_000 },
  ],
  celkemBezDph: 18_929,
  celkemSDph: 21_200,
};

const DL_2026_0053: DodaciList = {
  cislo: 'DL-2026-0053',
  datum: '2026-04-10',
  dodavatel: 'Metro AG',
  provozovna: 'cg-brno',
  polozky: [
    { popis: 'Nápoje – balená voda a džusy', mnozstvi: 1, jednotka: 'ks', cenaBezDph:  4_464, celkemBezDph:  4_464, dphSazba: 12, celkemSDph:  5_000 },
    // Zbývá nepokryta část faktury ~5 200 Kč (čekáme na DL-2026-0054)
  ],
  celkemBezDph: 4_464,
  celkemSDph: 5_000,
};

// ── Spárováno (fp11 – Prazdroj Monte) ────────────────────────
const DL_2026_0048: DodaciList = {
  cislo: 'DL-2026-0048',
  datum: '2026-04-12',
  dodavatel: 'Plzeňský Prazdroj',
  provozovna: 'monte',
  polozky: [
    { popis: 'Pilsner Urquell 0,5l (keg)',  mnozstvi: 3, jednotka: 'keg', cenaBezDph: 4_959, celkemBezDph: 14_876, dphSazba: 21, celkemSDph: 18_000 },
    { popis: 'Gambrinus 11° (keg)',          mnozstvi: 1, jednotka: 'keg', cenaBezDph: 3_388, celkemBezDph:  3_388, dphSazba: 21, celkemSDph:  4_100 },
  ],
  celkemBezDph: 18_264,
  celkemSDph: 22_100,
};

// ── Index DL ──────────────────────────────────────────────────
const DL_MAP: Record<string, DodaciList> = {
  'DL-2026-0039': DL_2026_0039,
  'DL-2026-0041': DL_2026_0041,
  'DL-2026-0048': DL_2026_0048,
  'DL-2026-0049': DL_2026_0049,
  'DL-2026-0052': DL_2026_0052,
  'DL-2026-0053': DL_2026_0053,
  'DL-2026-0061': DL_2026_0061,
};

export function getDodaciList(cislo: string): DodaciList | undefined {
  return DL_MAP[cislo];
}

export function getDodaciListy(cisla: string[]): DodaciList[] {
  return cisla.map((c) => DL_MAP[c]).filter(Boolean) as DodaciList[];
}
