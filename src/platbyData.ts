// ─────────────────────────────────────────────────────────────
// Mock data – modul Platba faktur & Cashflow
// Referenční datum: 2026-04-17 (čtvrtek)
// Týden: 2026-04-13 (Po) – 2026-04-19 (Ne)
// ─────────────────────────────────────────────────────────────

export type FakturaStavPlatby =
  | 'nova'               // zadaná, čeká na přiřazení
  | 'ke-schvaleni'       // spárovaná se Septem, čeká na schválení
  | 'schvalena'          // schválená k úhradě
  | 'zamitnuta'          // zamítnuta schvalovatelem
  | 'zastavena'          // pozdržená – čeká na dořešení sporu / dokladů
  | 'odeslana'           // odeslaná do banky
  | 'zaplacena'          // zaplacená (spárovaná)
  | 'v-bance'            // sent to bank, processing
  | 'ceka-na-sparovani'  // bank processed, waiting for matching (2 working days)
  | 'chyba-platby';      // payment failed — high urgency

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

export type TypDokladu = 'prijata' | 'vydana';

export type SchvalovatelRole = 'fakturant' | 'schvalovatel' | 'majitel';

export interface SchvalovatelOsoba {
  id: string;
  jmeno: string;
  role: SchvalovatelRole;
  provozovna?: string; // pokud je vázán na konkrétní provozovnu
  avatar?: string;     // iniciály pro fallback
}

export const SCHVALOVACI_OSOBY: SchvalovatelOsoba[] = [
  { id: 'u-petra',  jmeno: 'Petra Nováková',  role: 'fakturant',    avatar: 'PN' },
  { id: 'u-martin', jmeno: 'Martin Kovář',    role: 'schvalovatel', provozovna: 'cg-brno', avatar: 'MK' },
  { id: 'u-jana',   jmeno: 'Jana Horáková',   role: 'schvalovatel', provozovna: 'piazza',  avatar: 'JH' },
  { id: 'u-tomas',  jmeno: 'Tomáš Blažek',   role: 'schvalovatel', provozovna: 'monte',   avatar: 'TB' },
  { id: 'u-petr',   jmeno: 'Petr Dohnal',     role: 'majitel',      avatar: 'PD' },
];

export interface FakturaPlatby {
  id: string;
  cislo: string;
  dodavatel: string;
  kategorie: FakturaKategorie;
  provozovna: string;
  castka: number;
  datum: string;          // datum vystavení
  splatnost: string;      // účetní splatnost
  stav: FakturaStavPlatby;
  typDokladu: TypDokladu;
  poznamka?: string;
  prirazenaOsoba?: string;  // id osoby přiřazené ke schválení
  schvalil?: string;        // jméno (denormalizováno) – kdo schválil / zamítl
  datumSchvaleni?: string;  // datum schválení / zamítnutí
  strediskoOverride?: string;
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

export interface BankovniUcet {
  provozovna: string;
  cisloUctu: string;
  nazev: string;
  banka: string;
  zustatek: number;
  cekajiciKarty: number;
  iban: string;
}

export interface BankSyncStav {
  provozovna: string;
  posledniSync: string; // ISO datetime string
  stav: 'ok' | 'ceka' | 'chyba';
  zprava?: string;
}

export type AuditAkce = 'vytvorena' | 'prirazen' | 'schvalena' | 'zamitnuta' | 'zastavena'
  | 'odeslana-do-banky' | 'v-bance' | 'sparovana' | 'chyba' | 'obnovena';

export interface AuditZaznam {
  cas: string;
  kdo: string;
  akce: AuditAkce;
  stavPo?: FakturaStavPlatby;
  poznamka?: string;
}

// ─── Nastavení ────────────────────────────────────────────────

export const PROCESSING_DAYS_DEFAULT = 2; // dní před splatností = kdy musíme odeslat

// ─── Zůstatky na účtech ───────────────────────────────────────

export const UCTY: UcetZustatek[] = [
  { provozovna: 'cg-brno', zustatek: 287_300, cekajiciKarty: 42_100 },
  { provozovna: 'piazza',  zustatek: 124_500, cekajiciKarty: 22_300 },
  { provozovna: 'monte',   zustatek:  75_500, cekajiciKarty: 18_600 },
];

export const BANKOVNI_UCTY: BankovniUcet[] = [
  { provozovna: 'cg-brno', cisloUctu: '1028374650/0300', nazev: 'CG Brno – Provozní', banka: 'Komerční banka',   zustatek: 287_300, cekajiciKarty: 42_100, iban: 'CZ5503000000001028374650' },
  { provozovna: 'piazza',  cisloUctu: '2047836291/0800', nazev: 'Piazza – Provozní',   banka: 'Česká spořitelna', zustatek: 124_500, cekajiciKarty: 22_300, iban: 'CZ6808000000002047836291' },
  { provozovna: 'monte',   cisloUctu: '3019284736/2010', nazev: 'Monte – Provozní',    banka: 'Fio banka',        zustatek:  75_500, cekajiciKarty: 18_600, iban: 'CZ9420100000003019284736' },
];

export const BANK_SYNC_DATA: BankSyncStav[] = [
  { provozovna: 'cg-brno', posledniSync: '2026-04-17T14:32:00', stav: 'ok' },
  { provozovna: 'piazza',  posledniSync: '2026-04-17T13:15:00', stav: 'ok' },
  { provozovna: 'monte',   posledniSync: '2026-04-17T09:41:00', stav: 'ceka', zprava: 'Synchronizace probíhá' },
];

export const PLATBY_AUDIT: Record<string, AuditZaznam[]> = {
  fp01: [
    { cas: '10.4. 09:15', kdo: 'Petra Nováková', akce: 'vytvorena', stavPo: 'nova' },
    { cas: '11.4. 11:20', kdo: 'Petr Dohnal',    akce: 'schvalena', stavPo: 'schvalena' },
  ],
  fp16: [
    { cas: '15.4. 08:00', kdo: 'Petra Nováková', akce: 'vytvorena',       stavPo: 'nova' },
    { cas: '15.4. 10:30', kdo: 'Martin Kovář',   akce: 'schvalena',       stavPo: 'schvalena' },
    { cas: '17.4. 09:45', kdo: 'Petra Nováková', akce: 'odeslana-do-banky', stavPo: 'v-bance', poznamka: 'Dávka #B2026-0042' },
  ],
  fp17: [
    { cas: '12.4. 09:00', kdo: 'Petra Nováková', akce: 'vytvorena',       stavPo: 'nova' },
    { cas: '12.4. 14:00', kdo: 'Jana Horáková',  akce: 'schvalena',       stavPo: 'schvalena' },
    { cas: '14.4. 09:00', kdo: 'Petra Nováková', akce: 'odeslana-do-banky', stavPo: 'v-bance', poznamka: 'Dávka #B2026-0039' },
    { cas: '14.4. 23:55', kdo: 'Systém',         akce: 'v-bance',         stavPo: 'ceka-na-sparovani', poznamka: 'Platba zpracována bankou' },
  ],
  fp18: [
    { cas: '10.4. 10:00', kdo: 'Petra Nováková', akce: 'vytvorena',       stavPo: 'nova' },
    { cas: '11.4. 09:00', kdo: 'Tomáš Blažek',  akce: 'schvalena',       stavPo: 'schvalena' },
    { cas: '13.4. 08:00', kdo: 'Petra Nováková', akce: 'odeslana-do-banky', stavPo: 'v-bance', poznamka: 'Dávka #B2026-0038' },
    { cas: '15.4. 12:00', kdo: 'Systém',         akce: 'chyba',           stavPo: 'chyba-platby', poznamka: 'Nesprávné číslo účtu – platba vrácena bankou' },
  ],
};

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
    typDokladu: 'prijata',
    poznamka: 'Nákup 8.4. – týdenní zásoby',
    schvalil: 'Petr Dohnal',
    datumSchvaleni: '11. 4. 2026',
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
    typDokladu: 'prijata',
    poznamka: 'Čeká na schválení Septou',
    prirazenaOsoba: 'u-jana',
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
    typDokladu: 'prijata',
    poznamka: 'Měsíční nájemné duben',
    schvalil: 'Martin Kovář',
    datumSchvaleni: '8. 4. 2026',
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
    typDokladu: 'prijata',
    schvalil: 'Tomáš Blažek',
    datumSchvaleni: '9. 4. 2026',
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
    typDokladu: 'prijata',
    poznamka: 'Stravenkový příspěvek',
    schvalil: 'Jana Horáková',
    datumSchvaleni: '12. 4. 2026',
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
    typDokladu: 'prijata',
    schvalil: 'Martin Kovář',
    datumSchvaleni: '10. 4. 2026',
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
    typDokladu: 'prijata',
    schvalil: 'Martin Kovář',
    datumSchvaleni: '12. 4. 2026',
  },
  // ── NESCHVÁLENÉ (nova / ke-schvaleni) ──
  {
    id: 'fp08',
    cislo: 'VYD-2026-0018',
    dodavatel: 'Firemní catering – AutoPalace a.s.',
    kategorie: 'sluzby',
    provozovna: 'monte',
    castka: 3_500,
    datum: '2026-04-12',
    splatnost: '2026-04-19',
    stav: 'nova',
    typDokladu: 'vydana',
    poznamka: 'Pracovní obědy 9.–11.4.',
    prirazenaOsoba: 'u-tomas',
  },
  {
    id: 'fp09',
    cislo: 'VYD-2026-0017',
    dodavatel: 'Konferenční raut – Brno Hotel',
    kategorie: 'sluzby',
    provozovna: 'piazza',
    castka: 18_400,
    datum: '2026-04-11',
    splatnost: '2026-04-22',
    stav: 'ke-schvaleni',
    typDokladu: 'vydana',
    poznamka: 'Smluvní catering 8.4.',
    prirazenaOsoba: 'u-martin',
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
    typDokladu: 'prijata',
    schvalil: 'Jana Horáková',
    datumSchvaleni: '14. 4. 2026',
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
    typDokladu: 'prijata',
    schvalil: 'Tomáš Blažek',
    datumSchvaleni: '14. 4. 2026',
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
    typDokladu: 'prijata',
    schvalil: 'Petr Dohnal',
    datumSchvaleni: '13. 4. 2026',
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
    typDokladu: 'prijata',
    schvalil: 'Martin Kovář',
    datumSchvaleni: '13. 4. 2026',
  },
  // ── ZASTAVENÉ ──
  {
    id: 'fp15',
    cislo: 'FAK-2026-0049',
    dodavatel: 'Zásoba s.r.o. (reklamace)',
    kategorie: 'zbozi',
    provozovna: 'cg-brno',
    castka: 9_600,
    datum: '2026-04-09',
    splatnost: '2026-04-20',
    stav: 'zastavena',
    typDokladu: 'prijata',
    poznamka: 'Pozdrženo – probíhá reklamace zboží',
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
    typDokladu: 'prijata',
  },
  // ── V BANCE ──
  {
    id: 'fp16',
    cislo: 'FAK-2026-0053',
    dodavatel: 'Zásobování Praha s.r.o.',
    kategorie: 'zbozi' as FakturaKategorie,
    provozovna: 'cg-brno',
    castka: 28_600,
    datum: '2026-04-15',
    splatnost: '2026-04-19',
    stav: 'v-bance' as FakturaStavPlatby,
    typDokladu: 'prijata' as TypDokladu,
    schvalil: 'Martin Kovář',
    datumSchvaleni: '15. 4. 2026',
    poznamka: 'Odesláno do banky 17.4. 09:45 · Dávka #B2026-0042',
  },
  // ── ČEKÁ NA SPÁROVÁNÍ ──
  {
    id: 'fp17',
    cislo: 'FAK-2026-0038',
    dodavatel: 'Pivovar Kozel a.s.',
    kategorie: 'zbozi' as FakturaKategorie,
    provozovna: 'piazza',
    castka: 11_250,
    datum: '2026-04-12',
    splatnost: '2026-04-16',
    stav: 'ceka-na-sparovani' as FakturaStavPlatby,
    typDokladu: 'prijata' as TypDokladu,
    schvalil: 'Jana Horáková',
    datumSchvaleni: '12. 4. 2026',
    poznamka: 'V bance od 14.4. – čeká na spárování',
  },
  // ── CHYBA PLATBY ──
  {
    id: 'fp18',
    cislo: 'FAK-2026-0037',
    dodavatel: 'Fresh Meat CZ s.r.o.',
    kategorie: 'zbozi' as FakturaKategorie,
    provozovna: 'monte',
    castka: 16_800,
    datum: '2026-04-10',
    splatnost: '2026-04-15',
    stav: 'chyba-platby' as FakturaStavPlatby,
    typDokladu: 'prijata' as TypDokladu,
    schvalil: 'Tomáš Blažek',
    datumSchvaleni: '11. 4. 2026',
    poznamka: 'CHYBA: Nesprávné číslo účtu dodavatele – platba vrácena',
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

export function getBankovniUcet(provozovna: string): BankovniUcet | undefined {
  return BANKOVNI_UCTY.find((u) => u.provozovna === provozovna);
}

export function getBankSync(provozovna: string): BankSyncStav {
  if (provozovna === 'all') {
    const syncs = BANK_SYNC_DATA;
    const hasChyba = syncs.some((s) => s.stav === 'chyba');
    const hasCeka  = syncs.some((s) => s.stav === 'ceka');
    const latest   = syncs.reduce((l, s) => s.posledniSync > l ? s.posledniSync : l, '');
    return { provozovna: 'all', posledniSync: latest, stav: hasChyba ? 'chyba' : hasCeka ? 'ceka' : 'ok' };
  }
  return BANK_SYNC_DATA.find((s) => s.provozovna === provozovna)
    ?? { provozovna, posledniSync: '', stav: 'chyba', zprava: 'Bankovní účet nenalezen' };
}

export function getPlatbyAudit(fakturaId: string): AuditZaznam[] {
  return PLATBY_AUDIT[fakturaId] ?? [];
}

export function getFakturyVProcesu(provozovna: string): FakturaPlatby[] {
  return getFakturyForProvozovna(provozovna).filter(
    (f) => f.stav === 'v-bance' || f.stav === 'ceka-na-sparovani' || f.stav === 'chyba-platby'
  );
}
