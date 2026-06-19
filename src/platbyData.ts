// ─────────────────────────────────────────────────────────────
// Mock data – modul Platba faktur & Cashflow
// Referenční datum: 2026-04-17 (čtvrtek)
// Týden: 2026-04-13 (Po) – 2026-04-19 (Ne)
// ─────────────────────────────────────────────────────────────

// Phase 8 (zápis 10. 6. 2026) — sjednocené stavy přijatých faktur:
//   nová → čeká na schválení (od X) → schválená → v bance → uhrazená
//   alternativně: schválená → pozastavená (jen po schválení) / zamítnutá
//   alternativně: v bance → v bance neuhrazená (3+ dny po splatnosti)
export type FakturaStavPlatby =
  | 'nova'                    // zadaná, čeká na přiřazení schvalovatele
  | 'ceka-na-schvaleni'       // má schvalovatele, čeká na rozhodnutí
  | 'schvalena'               // schválená k úhradě
  | 'pozastavena'             // dočasně pozastavená (jen po schválení)
  | 'zamitnuta'               // zamítnuta schvalovatelem
  | 'v-bance'                 // odeslaná do banky, čeká na zpracování
  | 'uhrazena'                // zaplacená, spárovaná, read-only
  | 'v-bance-neuhrazena';     // odeslaná, ale po splatnosti nesedí — vysoká urgence

export type FakturaKategorie =
  | 'zbozi'
  | 'energie'
  | 'sluzby'
  | 'najem'
  | 'vyplaty'
  | 'ostatni';

export type MatchingStav =
  | 'ceka-na-sparovani'   // waiting for matching attempt
  | 'sparovana'           // fully matched ✓
  | 'nesedi-dl'           // mismatch between invoice and delivery note
  | 'castecne-sparovana'  // partially matched
  | 'duplikat'            // duplicate invoice detected
  | 'bez-dl';             // no delivery note expected (services, rent, utilities)

export type OstatniTyp =
  | 'trv-prikaz'
  | 'splatka-uveru'
  | 'poplatek'
  | 'vyplata'
  | 'dalsi';

export interface FutureRevMode { karty: boolean; odhad: boolean; }

export type TypDokladu = 'prijata' | 'vydana';

// Speciální účetní formy dokladu (budoucí rozšíření)
//   standard  = běžná faktura
//   zalohova  = zálohová / proforma — bude započtena při finální fakturaci
//   dobropis  = vratka / dobropis — záporná částka, snižuje původní závazek
//   offset    = vzájemný zápočet — kompenzace pohledávky a závazku se stejným partnerem
export type FakturaForma = 'standard' | 'zalohova' | 'dobropis' | 'offset';

export const FORMA_LABELS: Record<FakturaForma, string> = {
  standard: 'Standardní',
  zalohova: 'Zálohová',
  dobropis: 'Dobropis',
  offset:   'Offset',
};

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
  vs?: string;               // variabilní symbol
  poznamka?: string;
  prirazenaOsoba?: string;
  schvalil?: string;
  datumSchvaleni?: string;
  strediskoOverride?: string;
  matchingStav?: MatchingStav;
  dlCisla?: string[];
  dlCastka?: number;
  duplikatFakturaId?: string;
  // Speciální účetní případy (architecture ready)
  forma?: FakturaForma;       // default 'standard'
  spojenaSId?: string;        // zálohová → finální faktura, dobropis → původní faktura, offset → protistrana
  // Locking pro uzavřená účetní období: zamezí editaci částky, IBAN, VS, ale kategorie zůstává editovatelná pro přeúčtování
  isLocked?: boolean;
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

export type PravniEntita = 'con-gusto' | 'u-capa' | 'korek';

export const PRAVNI_ENTITA: Record<string, PravniEntita> = {
  'u-capa':        'u-capa',
  'korek-wines':   'korek',
  'korek-winebar': 'korek',
  // vše ostatní = 'con-gusto' (výchozí)
};

export const ENTITA_LABEL: Record<PravniEntita, string> = {
  'con-gusto': 'Con Gusto s.r.o.',
  'u-capa':    'Pivnice U Čápa s.r.o.',
  'korek':     'KOREK s.r.o.',
};

export function getPravniEntita(provozovnaId: string): PravniEntita {
  return PRAVNI_ENTITA[provozovnaId] ?? 'con-gusto';
}

export interface BankovniUcet {
  provozovna: string;
  cisloUctu: string;
  nazev: string;
  banka: string;
  zustatek: number;
  cekajiciKarty: number;
  iban: string;
  mena?: 'CZK' | 'EUR';
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
  { provozovna: 'cg-brno',        zustatek: 287_300, cekajiciKarty: 42_100 },
  { provozovna: 'piazza',         zustatek: 124_500, cekajiciKarty: 22_300 },
  { provozovna: 'monte',          zustatek:  75_500, cekajiciKarty: 18_600 },
  { provozovna: 'u-capa',         zustatek:  98_400, cekajiciKarty: 15_200 },
  { provozovna: 'korek-winebar',  zustatek:  67_800, cekajiciKarty: 12_100 },
  { provozovna: 'u-kohoutu',      zustatek:  45_300, cekajiciKarty:  8_900 },
  { provozovna: 'nad-hladinkou',  zustatek:  52_700, cekajiciKarty: 11_400 },
  { provozovna: 'teatr',          zustatek:  38_900, cekajiciKarty:  7_600 },
  { provozovna: 'jime-brno',      zustatek:  29_500, cekajiciKarty:  5_800 },
];

export const BANKOVNI_UCTY: BankovniUcet[] = [
  { provozovna: 'cg-brno',       cisloUctu: '1028374650/0300',  nazev: 'CG Brno – Provozní',     banka: 'Komerční banka',   zustatek: 287_300, cekajiciKarty: 42_100, iban: 'CZ5503000000001028374650' },
  { provozovna: 'piazza',        cisloUctu: '2047836291/0800',  nazev: 'Piazza – Provozní CZK',  banka: 'Česká spořitelna', zustatek: 124_500, cekajiciKarty: 22_300, iban: 'CZ6808000000002047836291' },
  { provozovna: 'piazza',        cisloUctu: 'AT61190430023457320100', nazev: 'Piazza – EUR',     banka: 'Raiffeisen Bank',  zustatek:   8_420, cekajiciKarty:      0, iban: 'AT61 1904 3002 3457 3201', mena: 'EUR' },
  { provozovna: 'monte',         cisloUctu: '3019284736/2010',  nazev: 'Monte – Provozní',       banka: 'Fio banka',        zustatek:  75_500, cekajiciKarty: 18_600, iban: 'CZ9420100000003019284736' },
  { provozovna: 'u-capa',        cisloUctu: '4082910347/0100',  nazev: 'U Čápa – Provozní',      banka: 'Komerční banka',   zustatek:  98_400, cekajiciKarty: 15_200, iban: 'CZ3301000000004082910347' },
  { provozovna: 'korek-winebar', cisloUctu: '5173820456/5500',  nazev: 'KOREK WB – Provozní',    banka: 'Raiffeisenbank',   zustatek:  67_800, cekajiciKarty: 12_100, iban: 'CZ8855000000005173820456' },
  { provozovna: 'u-kohoutu',     cisloUctu: '6284731567/2010',  nazev: 'U Kohoutů – Provozní',   banka: 'Fio banka',        zustatek:  45_300, cekajiciKarty:  8_900, iban: 'CZ1720100000006284731567' },
  { provozovna: 'nad-hladinkou', cisloUctu: '7395642678/0800',  nazev: 'Nad Hladinkou – Provozní',banka: 'Česká spořitelna', zustatek:  52_700, cekajiciKarty: 11_400, iban: 'CZ4208000000007395642678' },
  { provozovna: 'teatr',         cisloUctu: '8406553789/0300',  nazev: 'Teátr – Provozní',       banka: 'ČSOB',             zustatek:  38_900, cekajiciKarty:  7_600, iban: 'CZ6103000000008406553789' },
  { provozovna: 'jime-brno',     cisloUctu: '9517464890/2010',  nazev: 'Jíme Brno – Provozní',   banka: 'Fio banka',        zustatek:  29_500, cekajiciKarty:  5_800, iban: 'CZ9220100000009517464890' },
];

export const BANK_SYNC_DATA: BankSyncStav[] = [
  { provozovna: 'cg-brno',       posledniSync: '2026-04-17T14:32:00', stav: 'ok' },
  { provozovna: 'piazza',        posledniSync: '2026-04-17T13:15:00', stav: 'ok' },
  { provozovna: 'monte',         posledniSync: '2026-04-17T09:41:00', stav: 'ceka', zprava: 'Synchronizace probíhá' },
  { provozovna: 'u-capa',        posledniSync: '2026-04-17T14:10:00', stav: 'ok' },
  { provozovna: 'korek-winebar', posledniSync: '2026-04-17T13:55:00', stav: 'ok' },
  { provozovna: 'u-kohoutu',     posledniSync: '2026-04-17T12:30:00', stav: 'ok' },
  { provozovna: 'nad-hladinkou', posledniSync: '2026-04-17T11:45:00', stav: 'ok' },
  { provozovna: 'teatr',         posledniSync: '2026-04-17T10:20:00', stav: 'chyba', zprava: 'Chyba připojení – pokus o obnovení' },
  { provozovna: 'jime-brno',     posledniSync: '2026-04-17T14:00:00', stav: 'ok' },
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
    { cas: '14.4. 23:55', kdo: 'Systém',         akce: 'v-bance',         stavPo: 'v-bance', poznamka: 'Platba zpracována bankou' },
  ],
  fp18: [
    { cas: '10.4. 10:00', kdo: 'Petra Nováková', akce: 'vytvorena',       stavPo: 'nova' },
    { cas: '11.4. 09:00', kdo: 'Tomáš Blažek',  akce: 'schvalena',       stavPo: 'schvalena' },
    { cas: '13.4. 08:00', kdo: 'Petra Nováková', akce: 'odeslana-do-banky', stavPo: 'v-bance', poznamka: 'Dávka #B2026-0038' },
    { cas: '15.4. 12:00', kdo: 'Systém',         akce: 'chyba',           stavPo: 'v-bance-neuhrazena', poznamka: 'Nesprávné číslo účtu – platba vrácena bankou' },
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
    castka: 45_201,                          // 45 201 → DL je 45 200 → diff +1 Kč (rounding)
    datum: '2026-04-10',
    splatnost: '2026-04-14',
    stav: 'schvalena',
    typDokladu: 'prijata',
    poznamka: 'Nákup 8.4. – týdenní zásoby (drobná odchylka 1 Kč k zaokrouhlení)',
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
    stav: 'ceka-na-schvaleni',
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
    stav: 'ceka-na-schvaleni',
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
    stav: 'pozastavena',
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
    stav: 'uhrazena',
    typDokladu: 'prijata',
    isLocked: true,                  // uzavřené účetní období (březen 2026)
    schvalil: 'Petr Dohnal',
    datumSchvaleni: '3. 4. 2026',
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
    stav: 'v-bance' as FakturaStavPlatby,
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
    stav: 'v-bance-neuhrazena' as FakturaStavPlatby,
    typDokladu: 'prijata' as TypDokladu,
    schvalil: 'Tomáš Blažek',
    datumSchvaleni: '11. 4. 2026',
    poznamka: 'CHYBA: Nesprávné číslo účtu dodavatele – platba vrácena',
  },

  // ── U ČÁPA ──
  { id: 'fp19', cislo: 'FAK-2026-0051', dodavatel: 'Plzeňský Prazdroj', kategorie: 'zbozi' as FakturaKategorie, provozovna: 'u-capa', castka: 38_400, datum: '2026-04-09', splatnost: '2026-04-16', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '11. 4. 2026', poznamka: 'Týdenní dodávka piva – duben' },
  { id: 'fp20', cislo: 'FAK-2026-0052', dodavatel: 'Správa budov s.r.o.', kategorie: 'najem' as FakturaKategorie, provozovna: 'u-capa', castka: 62_000, datum: '2026-04-05', splatnost: '2026-04-20', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '7. 4. 2026', poznamka: 'Nájem duben – Štefánikova' },
  { id: 'fp21', cislo: 'FAK-2026-0053', dodavatel: 'Makro Cash & Carry', kategorie: 'zbozi' as FakturaKategorie, provozovna: 'u-capa', castka: 14_700, datum: '2026-04-11', splatnost: '2026-04-18', stav: 'ceka-na-schvaleni' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, prirazenaOsoba: 'u-petr' },
  { id: 'fp22', cislo: 'FAK-2026-0054', dodavatel: 'E.ON Energie', kategorie: 'energie' as FakturaKategorie, provozovna: 'u-capa', castka: 9_800, datum: '2026-04-08', splatnost: '2026-04-17', stav: 'v-bance' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '10. 4. 2026' },

  // ── KOREK WINEBAR ──
  { id: 'fp23', cislo: 'FAK-2026-0055', dodavatel: 'Vinné sklepy Lechovice', kategorie: 'zbozi' as FakturaKategorie, provozovna: 'korek-winebar', castka: 52_300, datum: '2026-04-08', splatnost: '2026-04-17', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '10. 4. 2026', poznamka: 'Nákup vín – jarní kolekce' },
  { id: 'fp24', cislo: 'FAK-2026-0056', dodavatel: 'Správa budov s.r.o.', kategorie: 'najem' as FakturaKategorie, provozovna: 'korek-winebar', castka: 74_500, datum: '2026-04-05', splatnost: '2026-04-20', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '7. 4. 2026', poznamka: 'Nájem duben – Náměstí Svobody' },
  { id: 'fp25', cislo: 'FAK-2026-0057', dodavatel: 'Sodexo (stravování)', kategorie: 'sluzby' as FakturaKategorie, provozovna: 'korek-winebar', castka: 6_200, datum: '2026-04-10', splatnost: '2026-04-17', stav: 'nova' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu },
  { id: 'fp26', cislo: 'FAK-2026-0058', dodavatel: 'ČEZ (elektřina)', kategorie: 'energie' as FakturaKategorie, provozovna: 'korek-winebar', castka: 7_400, datum: '2026-04-07', splatnost: '2026-04-19', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '9. 4. 2026' },

  // ── U KOHOUTŮ ──
  { id: 'fp27', cislo: 'FAK-2026-0059', dodavatel: 'Pivovary Krušovice', kategorie: 'zbozi' as FakturaKategorie, provozovna: 'u-kohoutu', castka: 28_900, datum: '2026-04-10', splatnost: '2026-04-17', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '12. 4. 2026', poznamka: 'Pravidelná dodávka piva' },
  { id: 'fp28', cislo: 'FAK-2026-0060', dodavatel: 'Metro AG', kategorie: 'zbozi' as FakturaKategorie, provozovna: 'u-kohoutu', castka: 19_600, datum: '2026-04-11', splatnost: '2026-04-18', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '12. 4. 2026' },
  { id: 'fp29', cislo: 'FAK-2026-0061', dodavatel: 'Správa budov s.r.o.', kategorie: 'najem' as FakturaKategorie, provozovna: 'u-kohoutu', castka: 48_000, datum: '2026-04-05', splatnost: '2026-04-20', stav: 'pozastavena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, poznamka: 'Pozdrženo – probíhá jednání o výši nájmu' },
  { id: 'fp30', cislo: 'FAK-2026-0062', dodavatel: 'E.ON Energie', kategorie: 'energie' as FakturaKategorie, provozovna: 'u-kohoutu', castka: 8_100, datum: '2026-04-08', splatnost: '2026-04-18', stav: 'ceka-na-schvaleni' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, prirazenaOsoba: 'u-petra' },

  // ── NAD HLADINKOU ──
  { id: 'fp31', cislo: 'FAK-2026-0063', dodavatel: 'Makro Cash & Carry', kategorie: 'zbozi' as FakturaKategorie, provozovna: 'nad-hladinkou', castka: 31_200, datum: '2026-04-09', splatnost: '2026-04-15', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '11. 4. 2026', poznamka: 'Nákup 9.4. – týdenní zásoby' },
  { id: 'fp32', cislo: 'FAK-2026-0064', dodavatel: 'Coca-Cola HBC', kategorie: 'zbozi' as FakturaKategorie, provozovna: 'nad-hladinkou', castka: 11_500, datum: '2026-04-10', splatnost: '2026-04-17', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '12. 4. 2026' },
  { id: 'fp33', cislo: 'FAK-2026-0065', dodavatel: 'Správa budov s.r.o.', kategorie: 'najem' as FakturaKategorie, provozovna: 'nad-hladinkou', castka: 55_000, datum: '2026-04-05', splatnost: '2026-04-20', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '8. 4. 2026', poznamka: 'Nájem duben – Nad Hladinkou' },
  { id: 'fp34', cislo: 'FAK-2026-0066', dodavatel: 'UniCredit (internet + telefon)', kategorie: 'sluzby' as FakturaKategorie, provozovna: 'nad-hladinkou', castka: 3_200, datum: '2026-04-12', splatnost: '2026-04-19', stav: 'nova' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu },

  // ── TEÁTR ──
  { id: 'fp35', cislo: 'FAK-2026-0067', dodavatel: 'Metro AG', kategorie: 'zbozi' as FakturaKategorie, provozovna: 'teatr', castka: 24_800, datum: '2026-04-10', splatnost: '2026-04-17', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '12. 4. 2026' },
  { id: 'fp36', cislo: 'FAK-2026-0068', dodavatel: 'Správa budov s.r.o.', kategorie: 'najem' as FakturaKategorie, provozovna: 'teatr', castka: 68_000, datum: '2026-04-05', splatnost: '2026-04-20', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '7. 4. 2026', poznamka: 'Nájem duben – divadelní sál' },
  { id: 'fp37', cislo: 'FAK-2026-0069', dodavatel: 'Sodexo (stravování)', kategorie: 'sluzby' as FakturaKategorie, provozovna: 'teatr', castka: 7_800, datum: '2026-04-10', splatnost: '2026-04-18', stav: 'ceka-na-schvaleni' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, prirazenaOsoba: 'u-petra' },
  { id: 'fp38', cislo: 'FAK-2026-0070', dodavatel: 'ČEZ (elektřina)', kategorie: 'energie' as FakturaKategorie, provozovna: 'teatr', castka: 12_600, datum: '2026-04-07', splatnost: '2026-04-17', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '9. 4. 2026' },

  // ── JÍME BRNO ──
  { id: 'fp39', cislo: 'FAK-2026-0071', dodavatel: 'Makro Cash & Carry', kategorie: 'zbozi' as FakturaKategorie, provozovna: 'jime-brno', castka: 18_300, datum: '2026-04-11', splatnost: '2026-04-17', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '13. 4. 2026', poznamka: 'Zásoby – lunch menu' },
  { id: 'fp40', cislo: 'FAK-2026-0072', dodavatel: 'Správa budov s.r.o.', kategorie: 'najem' as FakturaKategorie, provozovna: 'jime-brno', castka: 41_000, datum: '2026-04-05', splatnost: '2026-04-20', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '7. 4. 2026', poznamka: 'Nájem duben – Nové sady' },
  { id: 'fp41', cislo: 'FAK-2026-0073', dodavatel: 'E.ON Energie', kategorie: 'energie' as FakturaKategorie, provozovna: 'jime-brno', castka: 6_400, datum: '2026-04-08', splatnost: '2026-04-18', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, schvalil: 'Petr Dohnal', datumSchvaleni: '10. 4. 2026' },
  { id: 'fp42', cislo: 'FAK-2026-0074', dodavatel: 'Linde Gas (CO₂)', kategorie: 'zbozi' as FakturaKategorie, provozovna: 'jime-brno', castka: 3_900, datum: '2026-04-12', splatnost: '2026-04-19', stav: 'ceka-na-schvaleni' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, prirazenaOsoba: 'u-petra' },

  // ── SPECIÁLNÍ ÚČETNÍ PŘÍPADY (placeholder demo) ──
  // Zálohová faktura — bude započtena s finální fakturou fp43
  { id: 'fp43', cislo: 'ZAL-2026-0012', dodavatel: 'Sklářské závody Bohemia', kategorie: 'zbozi' as FakturaKategorie, provozovna: 'cg-brno', castka: 25_000, datum: '2026-04-08', splatnost: '2026-04-15', stav: 'schvalena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, forma: 'zalohova', poznamka: 'Záloha na sklenice – objednávka 60 ks vinných sklenic', schvalil: 'Petr Dohnal', datumSchvaleni: '10. 4. 2026' },
  // Dobropis — vrácené zboží z fp14 (Metro)
  { id: 'fp44', cislo: 'DOB-2026-0003', dodavatel: 'Metro AG', kategorie: 'zbozi' as FakturaKategorie, provozovna: 'cg-brno', castka: -3_400, datum: '2026-04-14', splatnost: '2026-04-21', stav: 'ceka-na-schvaleni' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, forma: 'dobropis', spojenaSId: 'fp14', poznamka: 'Vrácené zkažené zboží – ovoce a zelenina', prirazenaOsoba: 'u-martin' },
  // Offset — vzájemný zápočet s odběratelem (CG má jak pohledávku, tak závazek)
  { id: 'fp45', cislo: 'OFF-2026-0001', dodavatel: 'Catering Partners s.r.o.', kategorie: 'sluzby' as FakturaKategorie, provozovna: 'cg-catering', castka: 12_500, datum: '2026-04-12', splatnost: '2026-04-22', stav: 'ceka-na-schvaleni' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, forma: 'offset', spojenaSId: 'fp40', poznamka: 'Vzájemný zápočet – pronájem prostor vs. catering servis' },

  // ── ZAMČENÉ faktury z uzavřeného účetního období (březen 2026) ──
  // Editovatelná pouze kategorie pro přeúčtování; částka/IBAN/VS jsou zamčené
  { id: 'fp46', cislo: 'FAK-2026-0021', dodavatel: 'Makro Cash & Carry', kategorie: 'zbozi' as FakturaKategorie, provozovna: 'piazza', castka: 38_900, datum: '2026-03-05', splatnost: '2026-03-12', stav: 'uhrazena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, isLocked: true, schvalil: 'Petr Dohnal', datumSchvaleni: '6. 3. 2026', poznamka: 'Měsíční nákup březen' },
  { id: 'fp47', cislo: 'FAK-2026-0024', dodavatel: 'E.ON Energie',       kategorie: 'energie' as FakturaKategorie, provozovna: 'monte', castka: 18_400, datum: '2026-03-10', splatnost: '2026-03-20', stav: 'uhrazena' as FakturaStavPlatby, typDokladu: 'prijata' as TypDokladu, isLocked: true, schvalil: 'Petr Dohnal', datumSchvaleni: '12. 3. 2026' },
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
  { id: 'op07', typ: 'trv-prikaz', popis: 'Záloha energie – U Čápa (trvalý příkaz)',       castka:  6_800, datum: '2026-04-16', provozovna: 'u-capa',        periodicita: 'mesic' },
  { id: 'op08', typ: 'splatka-uveru', popis: 'Splátka provozního úvěru – U Čápa',           castka: 22_000, datum: '2026-04-17', provozovna: 'u-capa',        periodicita: 'mesic' },
  { id: 'op09', typ: 'trv-prikaz', popis: 'Záloha energie – KOREK WB (trvalý příkaz)',      castka:  5_200, datum: '2026-04-15', provozovna: 'korek-winebar', periodicita: 'mesic' },
  { id: 'op10', typ: 'poplatek',   popis: 'Bankovní poplatky – KOREK WB',                   castka:    620, datum: '2026-04-17', provozovna: 'korek-winebar', periodicita: 'mesic' },
  { id: 'op11', typ: 'trv-prikaz', popis: 'Záloha energie – U Kohoutů (trvalý příkaz)',     castka:  4_900, datum: '2026-04-16', provozovna: 'u-kohoutu',     periodicita: 'mesic' },
  { id: 'op12', typ: 'splatka-uveru', popis: 'Splátka vybavení kuchyně – U Kohoutů',        castka: 12_500, datum: '2026-04-18', provozovna: 'u-kohoutu',     periodicita: 'mesic' },
  { id: 'op13', typ: 'trv-prikaz', popis: 'Záloha energie – Nad Hladinkou (trvalý příkaz)',castka:  7_300, datum: '2026-04-15', provozovna: 'nad-hladinkou', periodicita: 'mesic' },
  { id: 'op14', typ: 'poplatek',   popis: 'Pojistné – Nad Hladinkou (čtvrtletní)',          castka:  8_900, datum: '2026-04-18', provozovna: 'nad-hladinkou', periodicita: 'ctvrtleti' },
  { id: 'op15', typ: 'trv-prikaz', popis: 'Záloha energie – Teátr (trvalý příkaz)',         castka:  9_100, datum: '2026-04-16', provozovna: 'teatr',         periodicita: 'mesic' },
  { id: 'op16', typ: 'splatka-uveru', popis: 'Splátka rekonstrukce sálu – Teátr',           castka: 18_000, datum: '2026-04-17', provozovna: 'teatr',         periodicita: 'mesic' },
  { id: 'op17', typ: 'trv-prikaz', popis: 'Záloha energie – Jíme Brno (trvalý příkaz)',     castka:  3_800, datum: '2026-04-16', provozovna: 'jime-brno',     periodicita: 'mesic' },
  { id: 'op18', typ: 'poplatek',   popis: 'Bankovní poplatky – Jíme Brno',                  castka:    490, datum: '2026-04-17', provozovna: 'jime-brno',     periodicita: 'mesic' },
];

// ─── Odhadované budoucí tržby v období ───────────────────────

export interface BudouciTrzbyOdhad {
  provozovna: string;
  cekajiciKarty: number;    // karty ze včerejška – ještě nejsou na účtu
  odhadZbytek: number;      // odhad tržeb do konce týdne (čt zbytek + pá)
  baze: string;             // popis základny odhadu
}

export const BUDOUCI_TRZBY: BudouciTrzbyOdhad[] = [
  { provozovna: 'cg-brno',       cekajiciKarty: 42_100, odhadZbytek: 68_200, baze: 'průměr: min. rok stejný týden + 3 předchozí týdny' },
  { provozovna: 'piazza',        cekajiciKarty: 22_300, odhadZbytek: 38_900, baze: 'průměr: min. rok stejný týden + 3 předchozí týdny' },
  { provozovna: 'monte',         cekajiciKarty: 18_600, odhadZbytek: 29_400, baze: 'průměr: min. rok stejný týden + 3 předchozí týdny' },
  { provozovna: 'u-capa',        cekajiciKarty: 15_200, odhadZbytek: 24_800, baze: 'průměr: min. rok stejný týden + 3 předchozí týdny' },
  { provozovna: 'korek-winebar', cekajiciKarty: 12_100, odhadZbytek: 19_600, baze: 'průměr: min. rok stejný týden + 3 předchozí týdny' },
  { provozovna: 'u-kohoutu',     cekajiciKarty:  8_900, odhadZbytek: 14_200, baze: 'průměr: min. rok stejný týden + 3 předchozí týdny' },
  { provozovna: 'nad-hladinkou', cekajiciKarty: 11_400, odhadZbytek: 18_300, baze: 'průměr: min. rok stejný týden + 3 předchozí týdny' },
  { provozovna: 'teatr',         cekajiciKarty:  7_600, odhadZbytek: 12_100, baze: 'průměr: min. rok stejný týden + 3 předchozí týdny' },
  { provozovna: 'jime-brno',     cekajiciKarty:  5_800, odhadZbytek:  9_400, baze: 'průměr: min. rok stejný týden + 3 předchozí týdny' },
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
  return BANKOVNI_UCTY.find((u) => u.provozovna === provozovna && (!u.mena || u.mena === 'CZK'));
}

export function getBankovniUctyForProvozovna(provozovna: string): BankovniUcet[] {
  if (provozovna === 'all') return BANKOVNI_UCTY;
  return BANKOVNI_UCTY.filter((u) => u.provozovna === provozovna);
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

// ─── Matching data ────────────────────────────────────────────
// Separovaná od platebních dat – v produkci přijde z matching engine API

export interface MatchingRecord {
  stav: MatchingStav;
  dlCisla?: string[];
  dlCastka?: number;          // celková částka z DL (pro porovnání nesedí-dl)
  duplikatFakturaId?: string; // ID originálu při duplicitě
}

export const MATCHING_DATA: Record<string, MatchingRecord> = {
  // ── CG Brno ──
  fp01: { stav: 'sparovana',         dlCisla: ['DL-2026-0041'] },
  fp02: { stav: 'nesedi-dl',         dlCisla: ['DL-2026-0039'], dlCastka: 4_520 },
  fp03: { stav: 'bez-dl' },
  fp04: { stav: 'bez-dl' },
  fp05: { stav: 'bez-dl' },
  fp06: { stav: 'bez-dl' },
  fp07: { stav: 'bez-dl' },
  fp08: { stav: 'bez-dl' },
  fp09: { stav: 'bez-dl' },
  fp10: { stav: 'ceka-na-sparovani', dlCisla: ['DL-2026-0049'] },
  fp11: { stav: 'sparovana',         dlCisla: ['DL-2026-0048'] },
  fp12: { stav: 'duplikat',          duplikatFakturaId: 'fp14' },
  fp13: { stav: 'sparovana',         dlCisla: ['DL-2026-0047'] },
  fp14: { stav: 'sparovana',         dlCisla: ['DL-2026-0035'] },
  fp15: { stav: 'nesedi-dl',         dlCisla: ['DL-2026-0049'], dlCastka: 8_100 },
  fp16: { stav: 'sparovana',         dlCisla: ['DL-2026-0055'] },
  fp17: { stav: 'sparovana',         dlCisla: ['DL-2026-0043'] },
  fp18: { stav: 'sparovana',         dlCisla: ['DL-2026-0046'] },
  // ── U Čápa ──
  fp19: { stav: 'sparovana',         dlCisla: ['DL-2026-0058'] },
  fp20: { stav: 'bez-dl' },
  fp21: { stav: 'ceka-na-sparovani', dlCisla: ['DL-2026-0059'] },
  fp22: { stav: 'bez-dl' },
  // ── KOREK WB ──
  fp23: { stav: 'sparovana',         dlCisla: ['DL-2026-0060'] },
  fp24: { stav: 'bez-dl' },
  fp25: { stav: 'bez-dl' },
  fp26: { stav: 'bez-dl' },
  // ── U Kohoutů ──
  fp27: { stav: 'nesedi-dl',         dlCisla: ['DL-2026-0061'], dlCastka: 27_800 },
  fp28: { stav: 'ceka-na-sparovani', dlCisla: ['DL-2026-0062'] },
  fp29: { stav: 'bez-dl' },
  fp30: { stav: 'bez-dl' },
  // ── Nad Hladinkou ──
  fp31: { stav: 'sparovana',         dlCisla: ['DL-2026-0063'] },
  fp32: { stav: 'ceka-na-sparovani', dlCisla: ['DL-2026-0064'] },
  fp33: { stav: 'bez-dl' },
  fp34: { stav: 'bez-dl' },
  // ── Teátr ──
  fp35: { stav: 'duplikat',          duplikatFakturaId: 'fp12' },
  fp36: { stav: 'bez-dl' },
  fp37: { stav: 'bez-dl' },
  fp38: { stav: 'bez-dl' },
  // ── Jíme Brno ──
  fp39: { stav: 'castecne-sparovana',dlCisla: ['DL-2026-0066'], dlCastka: 15_900 },
  fp40: { stav: 'bez-dl' },
  fp41: { stav: 'bez-dl' },
  fp42: { stav: 'ceka-na-sparovani', dlCisla: ['DL-2026-0067'] },
};

export function getMatchingData(fakturaId: string): MatchingRecord | undefined {
  return MATCHING_DATA[fakturaId];
}

// VS = poslední číslice z čísla faktury (přepisovatelné polem faktura.vs)
export function deriveVS(cislo: string): string {
  return cislo.replace(/\D/g, '').slice(-8);
}

export function getVS(faktura: { vs?: string; cislo: string }): string {
  return faktura.vs ?? deriveVS(faktura.cislo);
}

export function getFakturyVProcesu(provozovna: string): FakturaPlatby[] {
  return getFakturyForProvozovna(provozovna).filter(
    (f) => f.stav === 'v-bance' || f.stav === 'v-bance-neuhrazena'
  );
}
