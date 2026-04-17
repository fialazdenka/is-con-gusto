// ─────────────────────────────────────────────────────────────
// Mock data – modul Platba faktur & Cashflow
// Referenční datum: 2026-04-17 (čtvrtek)
// Týden: 2026-04-13 (Po) – 2026-04-19 (Ne)
// ─────────────────────────────────────────────────────────────

export type FakturaStavPlatby =
  | 'nova'         // zadaná, čeká na přiřazení
  | 'ke-schvaleni' // spárovaná se Septem, čeká na schválení
  | 'schvalena'    // schválená k úhradě
  | 'odeslana'     // odeslaná do banky
  | 'zaplacena';   // zaplacená (spárovaná)

export type FakturaKategorie =
  | 'zbozi'
  | 'energie'
  | 'sluzby'
  | 'najem'
  | 'vyplaty'
  | 'ostatni';

export type OstatniTyp =
  | 'trv-prikaz'
  | 'splatka-uveru'
  | 'poplatek'
  | 'vyplata'
  | 'dalsi';

export type FutureRevMode = 'off' | 'budouci' | 'budouci-plus';

export interface FakturaPlatby {
  id: string;
  cislo: string;
  dodavatel: string;
  kategorie: FakturaKategorie;
  provozovna: string;
  castka: number;
  datum: string;      // datum vystavení
  splatnost: string;  // účetní splatnost
  stav: FakturaStavPlatby;
  poznamka?: string;
}

export interface OstatniPlatba {
  id: string;
  typ: OstatniTyp;
  popis: string;
  castka: number;
  datum: string;       // datum splatnosti v tomto týdnu
  provozovna: string;
  periodicita?: string;
}

export interface UcetZustatek {
  provozovna: string;
  zustatek: number;
  cekajiciKarty: number; // kartové platby v cestě (nezapsané na účtu)
}

// ─── Nastavení ────────────────────────────────────────────────

export const PROCESSING_DAYS_DEFAULT = 2; // dní před splatností = kdy musíme odeslat

// ─── Zůstatky na účtech ───────────────────────────────────────

export const UCTY: UcetZustatek[] = [
  { provozovna: 'cg-brno', zustatek: 287_300, cekajiciKarty: 42_100 },
  { provozovna: 'piazza',  zustatek: 124_500, cekajiciKarty: 22_300 },
  { provozovna: 'monte',   zustatek:  75_500, cekajiciKarty: 18_600 },
];

// ─── Faktury ──────────────────────────────────────────────────

export const FAKTURY_PLATBY: FakturaPlatby[] = [
  // ── PO SPLATNOSTI ──
  {
    id: 'fp01',
    cislo: 'FAK-2026-0041',
    dodavatel: 'Makro Cash & Carry',
    kategorie: 'zbozi',
    provozovna: 'cg-brno',
    castka: 45_200,
    datum: '2026-04-10',
    splatnost: '2026-04-14',
    stav: 'schvalena',
    poznamka: 'Nákup 8.4. – týdenní zásoby',
  },
  {
    id: 'fp02',
    cislo: 'FAK-2026-0039',
    dodavatel: 'Linde Gas (CO₂)',
    kategorie: 'zbozi',
    provozovna: 'piazza',
    castka: 4_800,
    datum: '2026-04-09',
    splatnost: '2026-04-15',
    stav: 'ke-schvaleni',
    poznamka: 'Čeká na schválení Septou',
  },
  // ── SPLATNÉ TENTO TÝDEN (13–19.4.) ──
  {
    id: 'fp03',
    cislo: 'FAK-2026-0044',
    dodavatel: 'Správa budov s.r.o.',
    kategorie: 'najem',
    provozovna: 'cg-brno',
    castka: 85_000,
    datum: '2026-04-05',
    splatnost: '2026-04-20',
    stav: 'schvalena',
    poznamka: 'Měsíční nájemné duben',
  },
  {
    id: 'fp04',
    cislo: 'FAK-2026-0045',
    dodavatel: 'E.ON Energie',
    kategorie: 'energie',
    provozovna: 'monte',
    castka: 12_500,
    datum: '2026-04-07',
    splatnost: '2026-04-18',
    stav: 'schvalena',
  },
  {
    id: 'fp05',
    cislo: 'FAK-2026-0046',
    dodavatel: 'Sodexo (stravování)',
    kategorie: 'sluzby',
    provozovna: 'piazza',
    castka: 8_900,
    datum: '2026-04-10',
    splatnost: '2026-04-17',
    stav: 'schvalena',
    poznamka: 'Stravenkový příspěvek',
  },
  {
    id: 'fp06',
    cislo: 'FAK-2026-0052',
    dodavatel: 'ČEZ (elektřina)',
    kategorie: 'energie',
    provozovna: 'cg-brno',
    castka: 24_800,
    datum: '2026-04-08',
    splatnost: '2026-04-18',
    stav: 'schvalena',
  },
  {
    id: 'fp07',
    cislo: 'FAK-2026-0048',
    dodavatel: 'UniCredit (internet + telefon)',
    kategorie: 'sluzby',
    provozovna: 'cg-brno',
    castka: 1_200,
    datum: '2026-04-10',
    splatnost: '2026-04-19',
    stav: 'schvalena',
  },
  // ── NESCHVÁLENÉ (nova / ke-schvaleni) ──
  {
    id: 'fp08',
    cislo: 'FAK-2026-0050',
    dodavatel: 'Pronto Print (menu karty)',
    kategorie: 'sluzby',
    provozovna: 'monte',
    castka: 3_500,
    datum: '2026-04-12',
    splatnost: '2026-04-19',
    stav: 'nova',
    poznamka: 'Nová, čeká na přiřazení',
  },
  {
    id: 'fp09',
    cislo: 'FAK-2026-0053',
    dodavatel: 'Metro AG',
    kategorie: 'zbozi',
    provozovna: 'piazza',
    castka: 18_400,
    datum: '2026-04-11',
    splatnost: '2026-04-22',
    stav: 'ke-schvaleni',
    poznamka: 'Spárovaná se Septem – čeká na schválení',
  },
  // ── MIMO TÝDEN (pozdější splatnost) ──
  {
    id: 'fp10',
    cislo: 'FAK-2026-0042',
    dodavatel: 'Coca-Cola HBC',
    kategorie: 'zbozi',
    provozovna: 'piazza',
    castka: 18_700,
    datum: '2026-04-12',
    splatnost: '2026-04-26',
    stav: 'schvalena',
  },
  {
    id: 'fp11',
    cislo: 'FAK-2026-0043',
    dodavatel: 'Plzeňský Prazdroj',
    kategorie: 'zbozi',
    provozovna: 'monte',
    castka: 22_100,
    datum: '2026-04-12',
    splatnost: '2026-04-26',
    stav: 'schvalena',
  },
  {
    id: 'fp12',
    cislo: 'FAK-2026-0047',
    dodavatel: 'Metro AG',
    kategorie: 'zbozi',
    provozovna: 'cg-brno',
    castka: 31_400,
    datum: '2026-04-10',
    splatnost: '2026-04-22',
    stav: 'schvalena',
  },
  {
    id: 'fp13',
    cislo: 'FAK-2026-0051',
    dodavatel: 'Pivovary Krušovice',
    kategorie: 'zbozi',
    provozovna: 'cg-brno',
    castka: 15_200,
    datum: '2026-04-10',
    splatnost: '2026-04-25',
    stav: 'schvalena',
  },
  // ── ZAPLACENÉ ──
  {
    id: 'fp14',
    cislo: 'FAK-2026-0035',
    dodavatel: 'Metro AG',
    kategorie: 'zbozi',
    provozovna: 'cg-brno',
    castka: 31_400,
    datum: '2026-04-01',
    splatnost: '2026-04-15',
    stav: 'zaplacena',
  },
];

// ─── Ostatní platby v tomto týdnu (13–19.4.) ─────────────────

export const OSTATNI_PLATBY: OstatniPlatba[] = [
  {
    id: 'op01',
    typ: 'splatka-uveru',
    popis: 'Splátka investičního úvěru – CG Brno',
    castka: 45_000,
    datum: '2026-04-17',
    provozovna: 'cg-brno',
    periodicita: 'mesic',
  },
  {
    id: 'op02',
    typ: 'trv-prikaz',
    popis: 'Záloha energie – Monte (trvalý příkaz)',
    castka: 8_500,
    datum: '2026-04-15',
    provozovna: 'monte',
    periodicita: 'mesic',
  },
  {
    id: 'op03',
    typ: 'trv-prikaz',
    popis: 'Záloha plyn – Piazza (trvalý příkaz)',
    castka: 4_200,
    datum: '2026-04-19',
    provozovna: 'piazza',
    periodicita: 'mesic',
  },
  {
    id: 'op04',
    typ: 'poplatek',
    popis: 'Bankovní poplatky – všechny provozovny',
    castka: 850,
    datum: '2026-04-17',
    provozovna: 'cg-brno',
    periodicita: 'mesic',
  },
  {
    id: 'op05',
    typ: 'vyplata',
    popis: 'Zálohy na mzdy – celý CG (duben)',
    castka: 180_000,
    datum: '2026-04-15',
    provozovna: 'cg-brno',
    periodicita: 'mesic',
  },
  {
    id: 'op06',
    typ: 'dalsi',
    popis: 'Pojistné – Kooperativa (čtvrtletní)',
    castka: 12_400,
    datum: '2026-04-18',
    provozovna: 'piazza',
    periodicita: 'ctvrtleti',
  },
];

// ─── Odhadované budoucí tržby v období ───────────────────────

export interface BudouciTrzbyOdhad {
  provozovna: string;
  cekajiciKarty: number;    // karty ze včerejška – ještě nejsou na účtu
  odhadZbytek: number;      // odhad tržeb do konce týdne (čt zbytek + pá)
  baze: string;             // popis základny odhadu
}

export const BUDOUCI_TRZBY: BudouciTrzbyOdhad[] = [
  {
    provozovna: 'cg-brno',
    cekajiciKarty: 42_100,
    odhadZbytek: 68_200,
    baze: 'průměr: min. rok stejný týden + 3 předchozí týdny',
  },
  {
    provozovna: 'piazza',
    cekajiciKarty: 22_300,
    odhadZbytek: 38_900,
    baze: 'průměr: min. rok stejný týden + 3 předchozí týdny',
  },
  {
    provozovna: 'monte',
    cekajiciKarty: 18_600,
    odhadZbytek: 29_400,
    baze: 'průměr: min. rok stejný týden + 3 předchozí týdny',
  },
];

// ─── Helper functions ──────────────────────────────────────────

export function getZustatek(provozovna: string): number {
  if (provozovna === 'all') return UCTY.reduce((s, u) => s + u.zustatek, 0);
  return UCTY.find((u) => u.provozovna === provozovna)?.zustatek ?? 0;
}

export function getCekajiciKarty(provozovna: string): number {
  if (provozovna === 'all') return UCTY.reduce((s, u) => s + u.cekajiciKarty, 0);
  return UCTY.find((u) => u.provozovna === provozovna)?.cekajiciKarty ?? 0;
}

export function getOdhadZbytek(provozovna: string): number {
  if (provozovna === 'all') return BUDOUCI_TRZBY.reduce((s, b) => s + b.odhadZbytek, 0);
  return BUDOUCI_TRZBY.find((b) => b.provozovna === provozovna)?.odhadZbytek ?? 0;
}

export function getFakturyForProvozovna(provozovna: string): FakturaPlatby[] {
  if (provozovna === 'all') return FAKTURY_PLATBY;
  return FAKTURY_PLATBY.filter((f) => f.provozovna === provozovna);
}

export function getOstatniForProvozovna(provozovna: string): OstatniPlatba[] {
  if (provozovna === 'all') return OSTATNI_PLATBY;
  return OSTATNI_PLATBY.filter((o) => o.provozovna === provozovna);
}

// Efektivní datum odeslání = splatnost - processingDays
export function getOdeslatDo(splatnost: string, processingDays: number): string {
  const d = new Date(splatnost + 'T12:00:00');
  d.setDate(d.getDate() - processingDays);
  return d.toISOString().split('T')[0];
}

// Je faktura po splatnosti (účetně)?
export function isPoSplatnosti(splatnost: string): boolean {
  return splatnost < '2026-04-17';
}

// Je faktura urgentní (datum odeslání <= dnes)?
export function isUrgentni(splatnost: string, processingDays: number): boolean {
  const odeslatDo = getOdeslatDo(splatnost, processingDays);
  return odeslatDo <= '2026-04-17';
}

// Je faktura splatná v daném období?
export function isSplatneVObdobi(splatnost: string, from: string, to: string): boolean {
  return splatnost >= from && splatnost <= to;
}

// Aktuální týden: Po 13.4. – Ne 19.4.2026
export const TYDEN_OD = '2026-04-13';
export const TYDEN_DO = '2026-04-19';

export const KATEGORIE_LABELS: Record<FakturaKategorie, string> = {
  zbozi:    'Zboží',
  energie:  'Energie',
  sluzby:   'Služby',
  najem:    'Nájem',
  vyplaty:  'Výplaty',
  ostatni:  'Ostatní',
};

export const OSTPLATBA_LABELS: Record<OstatniTyp, string> = {
  'trv-prikaz':    'Trvalý příkaz',
  'splatka-uveru': 'Splátka úvěru',
  'poplatek':      'Poplatek',
  'vyplata':       'Výplata',
  'dalsi':         'Ostatní',
};
