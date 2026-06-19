// ─────────────────────────────────────────────────────────────
// Mock data – modul Banka
// Referenční datum: 2026-04-17 (čtvrtek)
// Účty (live sync z banky) + transakce + helpers
// ─────────────────────────────────────────────────────────────

import { PROVOZOVNY } from './data';
import type { Provozovna } from './types';

export type BankaUcetStav  = 'ok' | 'sync-error' | 'critical-balance' | 'low-balance';
export type BankaSyncStav  = 'synced' | 'syncing' | 'error' | 'pending';
export type BankaTransTyp  = 'prichoz' | 'odchozi';
// Rozšířené matching stavy per workflow spec
//  paired              — Spárováno (s fakturou v systému)
// Per zápis 4. 6. 2026 — redukce na 3 hlavní stavy:
//  paired         — Spárováno (auto-shoda s dokladem)
//  unpaired       — Nespárováno (bez vazby na doklad)
//  manual-paired  — Spárováno ručně (dříve 'mimo systém' + 'bez faktury') — vyžaduje oprávnění + poznámku
//
// Vnitřní pod-stavy nesp. transakce řešeny přes flagy/deriv:
//  - hasCandidates  = candidates && candidates.length > 0    (návrhy z auto-detekce)
//  - isWaitingReview                                          (čeká na auto-sync)
//  - hasError                                                 (chyba synchronizace)
export type BankaTransStav = 'paired' | 'unpaired' | 'manual-paired';

// Návrh na spárování s fakturou (z auto-detekce)
export interface SuggestedMatch {
  fakturaId: string;       // ID faktury (z FAKTURY_PLATBY)
  fakturaCislo: string;    // např. "FAK-2026-0042"
  dodavatel: string;
  castka: number;
  matchScore: number;      // 0-100 % shoda
  duvody: string[];        // ["VS shoda", "Částka přesně", "Dodavatel shoda"]
}

// Záznam v audit logu transakce
export interface TransAuditEntry {
  cas: string;             // ISO timestamp
  kdo: string;
  akce: string;
  icon: string;
  color: string;
}

// Provozní poznámka k transakci
export interface TransNote {
  id: string;
  cas: string;
  kdo: string;
  text: string;
}

// Delegace nespárované transakce na konkrétního uživatele jako úkol
// Per zápis 4. 6. 2026 — „Přidat funkci pro přiřazení nespárovaných plateb konkrétním uživatelům."
export interface TransDelegace {
  user: string;          // jméno (nebo userId — pro mock stačí jméno)
  role: string;          // role pro UI badge
  cas: string;           // kdy bylo přiděleno
  note?: string;         // proč / co s tím
}

// Mock uživatelé pro delegování (přihlášený = Petr Dohnal)
export const BANKA_USERS: Array<{ id: string; jmeno: string; role: string; initials: string; color: string }> = [
  { id: 'u-petr',   jmeno: 'Petr Dohnal',     role: 'Majitel',  initials: 'PD', color: '#c9911a' },
  { id: 'u-jana',   jmeno: 'Jana Kovářová',   role: 'Účetní',   initials: 'JK', color: '#0dcaf0' },
  { id: 'u-martin', jmeno: 'Martin Procházka', role: 'Provoz',  initials: 'MP', color: '#198754' },
  { id: 'u-zdenka', jmeno: 'Zdeňka Fiala',    role: 'Asistent', initials: 'ZF', color: '#6f42c1' },
];

// ── Bankovní účet (richer než BankovniUcet z platbyData) ──
export interface BankaUcet {
  id: string;
  nazev: string;                          // 'Piazza CZK', 'CG Marketing', 'Bez názvu'
  iban: string;
  banka: string;                          // 'Raiffeisen Bank', 'Komerční banka', 'ČSOB'
  mena: 'CZK' | 'EUR';
  provozovny: string[];                   // ID provozoven (může být víc) — prázdné = žádná
  ucetniBalance: number;                  // účetní zůstatek
  dostupniProstredky: number;             // available funds (= zůstatek - blokované)
  lastSync: string;                       // ISO timestamp poslední synchronizace
  syncStav: BankaSyncStav;
  stav: BankaUcetStav;                    // health
  // Historie pro sparkline (30 dní zpět + 7 dní projekce)
  historieBalance: number[];              // length 37 (30 minulých + dnes + 6 budoucích)
  // Predikce
  predikceKonecTydne: number;             // forecast konec tohoto týdne (Ne 2026-04-19)
  predikceKonecMesice: number;            // forecast konec dubna 2026
}

export interface BankaTransakce {
  id: string;
  ucetId: string;
  typ: BankaTransTyp;                     // příchozí / odchozí
  datum: string;                          // ISO datetime
  castka: number;                         // záporné pro odchozí, kladné pro příchozí
  firma: string;                          // protistrana (dodavatel / odběratel)
  poznamka: string;
  protiUcet?: string;                     // protiúčet (IBAN nebo "1234567/0100") — pro proklik na detail
  vs?: string;                            // variabilní symbol
  stav: BankaTransStav;
  parovanaSId?: string;                   // ID napárované faktury (z platbyData.FAKTURY_PLATBY)
  // Vnitřní flagy pro nespárované (UI rozliší v Work Queue / panelu)
  isWaitingReview?: boolean;              // čeká na auto-sync (cron 15 min)
  hasError?: boolean;                     // chyba synchronizace
  // Phase 2.3 — auto-status „V bance neuhrazená" (odeslaná, nespárovaná >3 dny po splatnosti)
  splatnost?: string;                     // YYYY-MM-DD — datum splatnosti faktury (pro outgoing)
  isOverdueAtBank?: boolean;              // auto-set 3 dny po splatnosti bez spárování
  // Phase 2.3 — delegace nespárované transakce
  delegatedTo?: TransDelegace;
  // Phase 7 (zápis 12. 6. 2026) — nepovinné přiřazení provozovně.
  // Pokud chybí → platba spadá globálně pod celé Con Gusto.
  provozovnaId?: string;
  // Rozšíření per workflow spec:
  candidates?: SuggestedMatch[];          // návrhy spárování (auto-detekce)
  // Pro 'manual-paired' — důvod a poznámka (vyžadováno per zápis)
  manualReason?: string;                  // jednotný důvod (sloučení outsideReason + noInvoiceReason)
  manualNote?: string;                    // volitelná podrobnost / poznámka uživatele
  // Legacy fields (deprecated — zachované kvůli mock datům, viz manualReason/manualNote)
  outsideReason?: string;
  outsideNote?: string;
  noInvoiceReason?: string;
  notes?: TransNote[];                    // provozní poznámky (multi)
  auditLog?: TransAuditEntry[];           // historie změn
}

// ─────────────────────────────────────────────────────────────
// MOCK DATA — bankovní účty
// ─────────────────────────────────────────────────────────────

export const BANKA_UCTY: BankaUcet[] = [
  // ── Konsolidované (umbrella) účty — víc provozoven ──
  {
    id: 'ua-hlavni',
    nazev: 'Hlavní účet',
    iban: 'CZ1801000000123456789012',
    banka: 'Komerční banka',
    mena: 'CZK',
    provozovny: [
      'cg-brno','piazza','monte','u-capa','korek-winebar','u-kohoutu',
      'nad-hladinkou','flank','cg-catering','tackarna-londyn',
      'tackarna-turanka','tackarna-svedske-valy','teatr','korek-wines','jime-brno',
    ],
    ucetniBalance: 2_450_780.50,
    dostupniProstredky: 2_350_120.30,
    lastSync: '2026-04-17T14:32:00',
    syncStav: 'synced',
    stav: 'ok',
    historieBalance: Array.from({ length: 37 }, (_, i) => 2_300_000 + Math.sin(i / 6) * 200_000 + i * 4500),
    predikceKonecTydne: 2_500_400,
    predikceKonecMesice: 2_650_700,
  },
  {
    id: 'ua-mzdy',
    nazev: 'Mzdy a HR',
    iban: 'CZ1801000000987654321098',
    banka: 'Komerční banka',
    mena: 'CZK',
    provozovny: [
      'cg-brno','piazza','monte','u-capa','korek-winebar','u-kohoutu',
      'nad-hladinkou','flank','teatr','jime-brno',
    ],
    ucetniBalance: 1_240_350.00,
    dostupniProstredky: 1_240_350.00,
    lastSync: '2026-04-17T14:32:00',
    syncStav: 'synced',
    stav: 'ok',
    historieBalance: Array.from({ length: 37 }, (_, i) => 1_500_000 - i * 7000 + Math.cos(i / 5) * 100_000),
    predikceKonecTydne: 1_180_400,
    predikceKonecMesice: 980_200,
  },
  {
    id: 'ua-cg-marketing',
    nazev: 'CG Marketing',
    iban: 'CZ2901000001153616390207',
    banka: 'Komerční banka',
    mena: 'CZK',
    provozovny: ['cg-brno', 'piazza', 'monte', 'jime-brno'],
    ucetniBalance: 104_604.04,
    dostupniProstredky: 93_002.41,
    lastSync: '2026-04-17T14:32:00',
    syncStav: 'synced',
    stav: 'ok',
    historieBalance: Array.from({ length: 37 }, (_, i) => 110_000 + Math.cos(i / 6) * 20_000 - i * 200),
    predikceKonecTydne: 88_400,
    predikceKonecMesice: 65_200,
  },
  {
    id: 'ua-cg-catering',
    nazev: 'CG Catering',
    iban: 'CZ3601000001239399620287',
    banka: 'Komerční banka',
    mena: 'CZK',
    provozovny: ['cg-catering', 'cg-brno'],
    ucetniBalance: 261_772.24,
    dostupniProstredky: 261_772.24,
    lastSync: '2026-04-17T14:32:00',
    syncStav: 'synced',
    stav: 'ok',
    historieBalance: Array.from({ length: 37 }, (_, i) => 250_000 + Math.sin(i / 5) * 40_000),
    predikceKonecTydne: 275_400,
    predikceKonecMesice: 290_100,
  },

  // ── Single-branch účty (1 účet = 1 provoz) ──
  {
    id: 'ua-cg-brno',
    nazev: 'CG Brno',
    iban: 'CZ0530100000115189251023',
    banka: 'Komerční banka',
    mena: 'CZK',
    provozovny: ['cg-brno'],
    ucetniBalance: 698_103.73,
    dostupniProstredky: 962_502.34,
    lastSync: '2026-04-17T14:32:00',
    syncStav: 'synced',
    stav: 'ok',
    historieBalance: [
      820_000, 815_400, 810_200, 795_500, 770_300, 745_800, 705_200,  // -30 to -24
      685_400, 650_900, 632_100, 605_700, 580_200, 545_900, 510_400,  // -23 to -17
      485_700, 460_200, 432_600, 405_800, 412_300, 425_700, 445_900,  // -16 to -10
      478_200, 515_700, 542_400, 580_200, 625_900, 658_400, 690_800,  // -9 to -3
      695_400, 696_900, 698_100,                                       // -2 to 0 (dnes)
      710_400, 698_200, 685_700, 670_300, 655_800, 645_200,           // +1 to +6
    ],
    predikceKonecTydne: 645_200,
    predikceKonecMesice: 580_400,
  },
  {
    id: 'ua-piazza',
    nazev: 'Piazza',
    iban: 'CZ8601000001151937440237',
    banka: 'Komerční banka',
    mena: 'CZK',
    provozovny: ['piazza'],
    ucetniBalance: 681_032.64,
    dostupniProstredky: 735_437.71,
    lastSync: '2026-04-17T14:32:00',
    syncStav: 'synced',
    stav: 'ok',
    historieBalance: [
      610_000, 625_400, 640_200, 655_500, 665_300, 678_800, 692_200,
      685_400, 670_900, 660_100, 645_700, 632_200, 625_900, 640_400,
      655_700, 670_200, 685_600, 695_800, 712_300, 725_700, 738_900,
      720_200, 705_700, 692_400, 685_200, 678_900, 672_400, 670_800,
      672_400, 678_900, 681_000,
      695_400, 710_200, 725_700, 745_300, 762_800, 778_200,
    ],
    predikceKonecTydne: 778_200,
    predikceKonecMesice: 850_100,
  },
  {
    id: 'ua-piazza-eur',
    nazev: 'Piazza EUR',
    iban: 'CZ1230300000004532112233',
    banka: 'Raiffeisen Bank',
    mena: 'EUR',
    provozovny: ['piazza'],
    ucetniBalance: 127.40,
    dostupniProstredky: 127.40,
    lastSync: '2026-04-17T14:32:00',
    syncStav: 'synced',
    stav: 'ok',
    historieBalance: Array.from({ length: 37 }, (_, i) => 100 + Math.sin(i / 3) * 50 + i * 2),
    predikceKonecTydne: 145.00,
    predikceKonecMesice: 220.00,
  },
  {
    id: 'ua-monte',
    nazev: 'Monte',
    iban: 'CZ5530100000115189251037',
    banka: 'Komerční banka',
    mena: 'CZK',
    provozovny: ['monte'],
    ucetniBalance: 245_870.40,
    dostupniProstredky: 312_540.20,
    lastSync: '2026-04-17T14:32:00',
    syncStav: 'synced',
    stav: 'ok',
    historieBalance: Array.from({ length: 37 }, (_, i) => 280_000 + Math.cos(i / 4) * 50_000 - i * 1000),
    predikceKonecTydne: 285_400,
    predikceKonecMesice: 195_300,
  },
  {
    id: 'ua-u-capa',
    nazev: 'U Čápa',
    iban: 'CZ8501000001151937770287',
    banka: 'Komerční banka',
    mena: 'CZK',
    provozovny: ['u-capa'],
    ucetniBalance: 58_515.23,
    dostupniProstredky: 148_330.16,
    lastSync: '2026-04-17T14:32:00',
    syncStav: 'synced',
    stav: 'low-balance',     // pod 100 tis Kč
    historieBalance: Array.from({ length: 37 }, (_, i) => 180_000 - i * 3500 + Math.sin(i / 2) * 20_000),
    predikceKonecTydne: 145_200,
    predikceKonecMesice: 80_400,    // klesá pod limit
  },
  {
    id: 'ua-korek-wb',
    nazev: 'KOREK Winebar',
    iban: 'CZ2901000001151937770287',
    banka: 'Komerční banka',
    mena: 'CZK',
    provozovny: ['korek-winebar'],
    ucetniBalance: 184_320.50,
    dostupniProstredky: 215_840.10,
    lastSync: '2026-04-17T14:32:00',
    syncStav: 'synced',
    stav: 'ok',
    historieBalance: Array.from({ length: 37 }, (_, i) => 200_000 + Math.sin(i / 5) * 30_000),
    predikceKonecTydne: 215_400,
    predikceKonecMesice: 245_700,
  },
  {
    id: 'ua-u-kohoutu',
    nazev: 'U Kohoutů',
    iban: 'CZ8501000001159633860247',
    banka: 'Komerční banka',
    mena: 'CZK',
    provozovny: ['u-kohoutu'],
    ucetniBalance: 415_269.56,
    dostupniProstredky: 469_689.86,
    lastSync: '2026-04-17T14:32:00',
    syncStav: 'synced',
    stav: 'ok',
    historieBalance: Array.from({ length: 37 }, (_, i) => 430_000 + Math.cos(i / 4) * 60_000 + i * 500),
    predikceKonecTydne: 472_400,
    predikceKonecMesice: 510_300,
  },
  {
    id: 'ua-nad-hladinkou',
    nazev: 'Nad Hladinkou',
    iban: 'CZ1201000001313300100277',
    banka: 'ČSOB',
    mena: 'CZK',
    provozovny: ['nad-hladinkou'],
    ucetniBalance: 397_519.07,
    dostupniProstredky: 486_498.10,
    lastSync: '2026-04-17T11:15:00',     // out of date, last successful sync
    syncStav: 'error',                   // chyba synchronizace
    stav: 'sync-error',
    historieBalance: Array.from({ length: 37 }, (_, i) => 450_000 + Math.sin(i / 3) * 40_000),
    predikceKonecTydne: 460_200,
    predikceKonecMesice: 425_700,
  },

  // ── Unassigned účet (kritický stav) ──
  {
    id: 'ua-bez-nazvu-1',
    nazev: 'Bez názvu',
    iban: 'CZ8901000000949505480637',
    banka: 'Komerční banka',
    mena: 'CZK',
    provozovny: [],                          // nepřiřazené!
    ucetniBalance: 14_300.00,
    dostupniProstredky: 0.00,                // 0 dostupných → critical
    lastSync: '2026-04-17T14:32:00',
    syncStav: 'synced',
    stav: 'critical-balance',
    historieBalance: Array.from({ length: 37 }, (_, i) => 80_000 - i * 2200),
    predikceKonecTydne: 0,
    predikceKonecMesice: -25_400,            // záporný → kritické
  },
  {
    id: 'ua-bez-nazvu-2',
    nazev: 'Bez názvu',
    iban: 'CZ0301000001232717370227',
    banka: 'Komerční banka',
    mena: 'CZK',
    provozovny: [],
    ucetniBalance: 2_192.23,
    dostupniProstredky: 2_192.23,
    lastSync: '2026-04-17T14:32:00',
    syncStav: 'synced',
    stav: 'low-balance',
    historieBalance: Array.from({ length: 37 }, (_, i) => 10_000 - i * 200 + Math.sin(i / 2) * 1500),
    predikceKonecTydne: 2_200,
    predikceKonecMesice: 1_800,
  },
];

// ─────────────────────────────────────────────────────────────
// MOCK DATA — transakce (50 položek)
// ─────────────────────────────────────────────────────────────

export const BANKA_TRANSAKCE: BankaTransakce[] = [
  // Příchozí — tržby
  { id: 'tx01', ucetId: 'ua-piazza',         typ: 'prichoz', datum: '2026-04-17T09:14:00', castka:  84_320, firma: 'GoPay platby', poznamka: 'Karty Piazza 16.4.',     stav: 'paired',   vs: '20260416' },
  { id: 'tx02', ucetId: 'ua-cg-brno',        typ: 'prichoz', datum: '2026-04-17T09:15:00', castka:  72_100, firma: 'GoPay platby', poznamka: 'Karty CG Brno 16.4.',    stav: 'paired',   vs: '20260416', protiUcet: '2701234567/2010' },
  { id: 'tx03', ucetId: 'ua-monte',          typ: 'prichoz', datum: '2026-04-17T09:16:00', castka:  41_840, firma: 'Comgate',      poznamka: 'Karty Monte 16.4.',      stav: 'paired',   vs: '20260416', protiUcet: '2802345678/2010' },
  // Odchozí — faktury
  { id: 'tx04', ucetId: 'ua-cg-brno',        typ: 'odchozi', datum: '2026-04-17T08:30:00', castka: -45_200, firma: 'Makro Cash & Carry',  poznamka: 'FAK-2026-0041',          stav: 'paired',   vs: '20260041', parovanaSId: 'fp01', protiUcet: '17893421/0100' },
  { id: 'tx05', ucetId: 'ua-piazza',         typ: 'odchozi', datum: '2026-04-17T08:31:00', castka:  -4_800, firma: 'Linde Gas',            poznamka: 'FAK-2026-0039 CO₂',      stav: 'paired',   vs: '20260039', parovanaSId: 'fp02', protiUcet: '54231876/0300' },
  { id: 'tx06', ucetId: 'ua-cg-brno',        typ: 'odchozi', datum: '2026-04-17T08:32:00', castka: -31_400, firma: 'Metro AG',             poznamka: 'FAK-2026-0042',          stav: 'unpaired', vs: '20260042', protiUcet: '88991234/0100',
    splatnost: '2026-04-10', isOverdueAtBank: true,
    delegatedTo: { user: 'Jana Kovářová', role: 'Účetní', cas: '2026-04-16T09:30:00', note: 'Prověř proč nemá DL' } },
  { id: 'tx07', ucetId: 'ua-piazza',         typ: 'odchozi', datum: '2026-04-16T15:45:00', castka: -68_000, firma: 'Správa budov s.r.o.',  poznamka: 'Nájem duben',            stav: 'paired',   vs: '20260400', protiUcet: '12345678/2700' },
  { id: 'tx08', ucetId: 'ua-monte',          typ: 'odchozi', datum: '2026-04-16T15:46:00', castka: -28_500, firma: 'Plzeňský Prazdroj',    poznamka: 'Dodávka pivo',           stav: 'paired',   vs: '20260118', protiUcet: '76543210/0100' },
  { id: 'tx09', ucetId: 'ua-cg-brno',        typ: 'odchozi', datum: '2026-04-16T11:20:00', castka:  -8_400, firma: 'E.ON Energie',         poznamka: 'Elektřina březen',       stav: 'paired',   vs: '20260309', protiUcet: '34567890/0800' },
  { id: 'tx10', ucetId: 'ua-piazza',         typ: 'odchozi', datum: '2026-04-16T11:21:00', castka: -12_300, firma: 'Vodafone',             poznamka: 'Telefon + internet',     stav: 'paired',   vs: '20260411', protiUcet: '23456789/0300' },
  // Transakce čekající na párování
  { id: 'tx11', ucetId: 'ua-u-capa',         typ: 'prichoz', datum: '2026-04-17T07:30:00', castka:  18_500, firma: 'GoPay platby',         poznamka: 'Karty U Čápa 16.4.',     stav: 'unpaired', vs: '20260416', isWaitingReview: true, protiUcet: '2701234567/2010' },
  { id: 'tx12', ucetId: 'ua-korek-wb',       typ: 'prichoz', datum: '2026-04-17T07:31:00', castka:  21_300, firma: 'GoPay platby',         poznamka: 'Karty KOREK 16.4.',      stav: 'unpaired', vs: '20260416', isWaitingReview: true, protiUcet: '2701234567/2010' },
  { id: 'tx13', ucetId: 'ua-u-capa',         typ: 'odchozi', datum: '2026-04-15T14:00:00', castka:  -3_240, firma: 'Sodexo',               poznamka: 'Pull. servis',           stav: 'unpaired', vs: '20260301', protiUcet: '11223344/0100',
    splatnost: '2026-04-08', isOverdueAtBank: true },
  // Chyba platby
  { id: 'tx14', ucetId: 'ua-nad-hladinkou',  typ: 'odchozi', datum: '2026-04-16T16:00:00', castka: -15_400, firma: 'Plzeňský Prazdroj',    poznamka: 'Vrácená platba — chyba ÚČ',stav: 'unpaired', vs: '20260423', hasError: true, protiUcet: '76543210/0100' },
  // Dobropis
  { id: 'tx15', ucetId: 'ua-cg-brno',        typ: 'prichoz', datum: '2026-04-15T10:15:00', castka:   3_400, firma: 'Metro AG',             poznamka: 'Dobropis DOB-2026-0003',  stav: 'paired',   vs: '20260003', parovanaSId: 'fp44', protiUcet: '88991234/0100' },
  // Pravidelné platby
  { id: 'tx16', ucetId: 'ua-cg-brno',        typ: 'odchozi', datum: '2026-04-15T07:00:00', castka: -45_000, firma: 'Hyundai Leasing',      poznamka: 'Splátka — dodávka',       stav: 'paired',   vs: '20260415', protiUcet: '45678901/2010' },
  { id: 'tx17', ucetId: 'ua-piazza',         typ: 'odchozi', datum: '2026-04-15T07:01:00', castka:  -2_800, firma: 'O2 Czech',             poznamka: 'Telefon paušál',          stav: 'paired',   vs: '20260315', protiUcet: '56789012/0300' },
  { id: 'tx18', ucetId: 'ua-monte',          typ: 'odchozi', datum: '2026-04-15T07:02:00', castka:  -3_800, firma: 'Generali Pojišťovna',  poznamka: 'Pojistné Q2',             stav: 'paired',   vs: '20260400', protiUcet: '67890123/0100' },
  // Catering revenue
  { id: 'tx19', ucetId: 'ua-cg-catering',    typ: 'prichoz', datum: '2026-04-14T16:30:00', castka:  85_400, firma: 'ABC Corporation s.r.o.', poznamka: 'Catering pro event 12.4.', stav: 'paired',   vs: '20260412' },
  { id: 'tx20', ucetId: 'ua-cg-marketing',   typ: 'odchozi', datum: '2026-04-14T11:00:00', castka: -28_400, firma: 'Google Ireland',       poznamka: 'Google Ads — duben',      stav: 'paired',   vs: '20260400' },
  // Tržby pokračování (2 dny zpět)
  { id: 'tx21', ucetId: 'ua-piazza-eur',     typ: 'prichoz', datum: '2026-04-14T08:00:00', castka:     85.40, firma: 'Italian Wines srl',   poznamka: 'Dodavatel víno - vratka', stav: 'paired',   vs: '20260400' },
  { id: 'tx22', ucetId: 'ua-cg-brno',        typ: 'prichoz', datum: '2026-04-13T09:45:00', castka:  68_200, firma: 'GoPay platby',         poznamka: 'Karty CG Brno 12.4.',    stav: 'paired',   vs: '20260412' },
  { id: 'tx23', ucetId: 'ua-piazza',         typ: 'prichoz', datum: '2026-04-13T09:46:00', castka:  78_400, firma: 'GoPay platby',         poznamka: 'Karty Piazza 12.4.',     stav: 'paired',   vs: '20260412' },
  { id: 'tx24', ucetId: 'ua-cg-brno',        typ: 'odchozi', datum: '2026-04-13T08:00:00', castka: -22_500, firma: 'PPL CZ s.r.o.',        poznamka: 'Doprava zboží Q1',       stav: 'paired',   vs: '20260321' },
  { id: 'tx25', ucetId: 'ua-piazza',         typ: 'odchozi', datum: '2026-04-12T16:00:00', castka:  -9_200, firma: 'Coca-Cola HBC',        poznamka: 'Dodávka nápoje',         stav: 'paired',   vs: '20260408' },
  // Starší — minulý týden
  { id: 'tx26', ucetId: 'ua-cg-brno',        typ: 'odchozi', datum: '2026-04-10T13:15:00', castka: -76_300, firma: 'Bohemia Sekt',         poznamka: 'Velkoodběr víno',        stav: 'paired',   vs: '20260317' },
  { id: 'tx27', ucetId: 'ua-monte',          typ: 'odchozi', datum: '2026-04-10T13:16:00', castka: -52_100, firma: 'Bohemia Sekt',         poznamka: 'Velkoodběr víno',        stav: 'paired',   vs: '20260318' },
  { id: 'tx28', ucetId: 'ua-piazza',         typ: 'odchozi', datum: '2026-04-09T10:20:00', castka:  -7_300, firma: 'Linde Gas',            poznamka: 'CO₂ refill',             stav: 'paired',   vs: '20260306' },
  { id: 'tx29', ucetId: 'ua-cg-marketing',   typ: 'odchozi', datum: '2026-04-09T09:00:00', castka: -15_700, firma: 'Meta Platforms Ireland',poznamka: 'Facebook Ads',          stav: 'paired',   vs: '20260403' },
  { id: 'tx30', ucetId: 'ua-cg-catering',    typ: 'prichoz', datum: '2026-04-08T11:00:00', castka: 145_000, firma: 'XYZ Events s.r.o.',    poznamka: 'Záloha catering svatba', stav: 'paired',   vs: '20260408' },

  // ── Nové stavy per workflow spec ──

  // Multi-kandidát: 2 podobné faktury Metro AG, systém netuší která
  // Nespárováno + více kandidátů (auto-detekce zjistila 2 možné faktury Metro AG)
  { id: 'tx31', ucetId: 'ua-cg-brno', typ: 'odchozi', datum: '2026-04-17T08:33:00', castka: -31_200, firma: 'Metro AG', poznamka: 'Týdenní nákup', stav: 'unpaired', vs: '20260043',
    candidates: [
      { fakturaId: 'fp14', fakturaCislo: 'FAK-2026-0035', dodavatel: 'Metro AG', castka: 31_400, matchScore: 78, duvody: ['Dodavatel shoda', 'Měsíc shoda', 'Částka ±200 Kč'] },
      { fakturaId: 'fp01', fakturaCislo: 'FAK-2026-0041', dodavatel: 'Makro Cash & Carry', castka: 45_201, matchScore: 35, duvody: ['Stejné období'] },
    ]},

  // Unpaired s návrhem 95 % match (čeká na human accept)
  { id: 'tx32', ucetId: 'ua-piazza', typ: 'odchozi', datum: '2026-04-17T08:35:00', castka: -45_900, firma: 'Plzeňský Prazdroj', poznamka: 'Dodávka pivo Q2', stav: 'unpaired', vs: '20260415',
    candidates: [
      { fakturaId: 'fp08', fakturaCislo: 'FAK-2026-0044', dodavatel: 'Plzeňský Prazdroj', castka: 45_900, matchScore: 95, duvody: ['VS shoda 100 %', 'Dodavatel shoda', 'Částka přesně'] },
    ]},

  // Bez VS — vyžaduje ruční zařazení
  { id: 'tx33', ucetId: 'ua-cg-brno', typ: 'odchozi', datum: '2026-04-16T09:00:00', castka: -3_240, firma: 'Hyundai Leasing', poznamka: 'Splátka — dodávka (bez VS)', stav: 'unpaired' },

  // Bez VS + bez kontextu (Bez názvu účet)
  { id: 'tx34', ucetId: 'ua-bez-nazvu-1', typ: 'odchozi', datum: '2026-04-16T12:00:00', castka: -1_200, firma: 'Neznámý odběratel', poznamka: 'Bez VS, bez provozovny', stav: 'unpaired' },

  // Spárováno ručně — interní převod mezi účty (auto-schváleno, protiÚčet odpovídá IBAN CG Brno)
  { id: 'tx35', ucetId: 'ua-hlavni', typ: 'odchozi', datum: '2026-04-15T08:00:00', castka: -100_000, firma: 'Vlastní účet CG Brno', poznamka: 'Mezi-účetní převod', stav: 'manual-paired',
    manualReason: 'Interní převod', manualNote: 'Doplnění hotovosti na účet CG Brno pro odchozí faktury', protiUcet: '5189251023/3010' },

  // Spárováno ručně — bankovní poplatek
  { id: 'tx36', ucetId: 'ua-piazza', typ: 'odchozi', datum: '2026-04-16T23:55:00', castka: -180, firma: 'Komerční banka', poznamka: 'Měsíční poplatek za vedení účtu', stav: 'manual-paired',
    manualReason: 'Bankovní poplatek', protiUcet: '01010101/0100' },

  // Spárováno ručně — úrok
  { id: 'tx37', ucetId: 'ua-cg-marketing', typ: 'prichoz', datum: '2026-04-16T23:58:00', castka: 42, firma: 'Komerční banka', poznamka: 'Úrok za duben', stav: 'manual-paired',
    manualReason: 'Úrok z kreditu', protiUcet: '01010101/0100' },

  // Nespárováno + auto-match s nízkou jistotou (čeká na potvrzení uživatelem)
  { id: 'tx38', ucetId: 'ua-monte', typ: 'odchozi', datum: '2026-04-15T15:00:00', castka: -6_900, firma: 'Krušovice s.r.o.', poznamka: 'Dodávka pivo', stav: 'unpaired', vs: '20260412', isWaitingReview: true,
    candidates: [
      { fakturaId: 'fp28', fakturaCislo: 'FAK-2026-0060', dodavatel: 'Krušovice s.r.o.', castka: 6_900, matchScore: 88, duvody: ['Dodavatel shoda', 'Částka shoda', 'VS část. shoda'] },
    ]},

  // Nespárováno — interní převod čekající na auto-schválení (protiÚčet = Hlavní účet IBAN)
  { id: 'tx39', ucetId: 'ua-piazza', typ: 'odchozi', datum: '2026-04-17T07:45:00', castka: -50_000, firma: 'Vlastní účet Hlavní', poznamka: 'Převod likvidity', stav: 'unpaired', protiUcet: '123456789012/0100' },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Vrací účty filtrované podle vybrané provozovny v topbaru. */
export function getUctyForProvozovna(provozovnaId: string): BankaUcet[] {
  if (provozovnaId === 'all') return BANKA_UCTY;
  return BANKA_UCTY.filter((u) => u.provozovny.includes(provozovnaId));
}

/** Vrací rozšířené info o provozovnách (objekty) pro daný účet. */
export function getProvozovnyForUcet(ucet: BankaUcet): Provozovna[] {
  return ucet.provozovny
    .map((id) => PROVOZOVNY.find((p) => p.id === id))
    .filter((p): p is Provozovna => !!p);
}

/** Celkový součet ÚČETNÍ bilance v CZK (EUR účty vynechány). */
export function sumCzkUcetni(ucty: BankaUcet[]): number {
  return ucty.filter((u) => u.mena === 'CZK').reduce((s, u) => s + u.ucetniBalance, 0);
}

/** Celkový součet DOSTUPNÝCH prostředků v CZK. */
export function sumCzkDostupne(ucty: BankaUcet[]): number {
  return ucty.filter((u) => u.mena === 'CZK').reduce((s, u) => s + u.dostupniProstredky, 0);
}

/** Celkový součet pro danou měnu (separate). */
export function sumForMena(ucty: BankaUcet[], mena: 'CZK' | 'EUR'): { ucetni: number; dostupne: number } {
  const f = ucty.filter((u) => u.mena === mena);
  return {
    ucetni:   f.reduce((s, u) => s + u.ucetniBalance,     0),
    dostupne: f.reduce((s, u) => s + u.dostupniProstredky, 0),
  };
}

/** Health barvy + label pro stav účtu. */
export const STAV_META: Record<BankaUcetStav, { color: string; bg: string; label: string; labelLong: string; icon: string }> = {
  ok:                { color: '#198754', bg: '#d1f0db', label: 'OK',          labelLong: 'OK',                  icon: 'solar:check-circle-bold-duotone' },
  'low-balance':     { color: '#ffc107', bg: '#fff3cd', label: 'Nízký',       labelLong: 'Nízký zůstatek',      icon: 'solar:danger-triangle-bold-duotone' },
  'critical-balance':{ color: '#dc3545', bg: '#f8d7da', label: 'Kritický',    labelLong: 'Kritický zůstatek',   icon: 'solar:danger-circle-bold-duotone' },
  'sync-error':      { color: '#dc3545', bg: '#f8d7da', label: 'Chyba sync',  labelLong: 'Chyba synchronizace', icon: 'solar:close-circle-bold-duotone' },
};

/** Transakční stav metadata — 3 hlavní stavy per zápis 4. 6. 2026 */
export const TRANS_STAV_META: Record<BankaTransStav, { cls: string; label: string; icon: string; shortLabel?: string }> = {
  paired:         { cls: 'bg-success-subtle text-success',     label: 'Spárováno',         icon: 'solar:check-circle-bold-duotone' },
  unpaired:       { cls: 'bg-warning-subtle text-warning',     label: 'Nespárováno',       icon: 'solar:danger-triangle-bold-duotone' },
  'manual-paired':{ cls: 'bg-secondary-subtle text-secondary', label: 'Spárováno ručně',   icon: 'solar:hand-stars-bold-duotone',        shortLabel: 'Ručně' },
};

/**
 * Phase 2.3b — detekce interních převodů (mezi firemními účty).
 * Per zápis 4. 6. 2026 — „Převody mezi firemními účty budou evidovány a automaticky schvalovány."
 *
 * Vrací true, pokud `protiUcet` transakce odpovídá IBAN/lokálnímu číslu jiného našeho účtu.
 * Porovnání ignoruje formátování (lomítka, mezery).
 */
function normalizeAccount(s: string): string {
  return s.replace(/[\s/]/g, '').toUpperCase();
}
export function isInternalTransfer(transakce: BankaTransakce, ucty: BankaUcet[]): boolean {
  if (!transakce.protiUcet) return false;
  const target = normalizeAccount(transakce.protiUcet);
  // Strip case: protiUcet může být zkrácené IBAN nebo lokální (např. „125478963/0100")
  return ucty.some((u) => {
    if (u.id === transakce.ucetId) return false; // ne self
    const ibanNorm = normalizeAccount(u.iban);
    return ibanNorm.includes(target) || target.includes(ibanNorm.slice(-10));
  });
}

/** Formátování času pro „před X min". */
export function timeAgo(isoTimestamp: string): string {
  const ref = new Date('2026-04-17T14:35:00');     // mock "now"
  const t   = new Date(isoTimestamp);
  const min = Math.round((ref.getTime() - t.getTime()) / 60000);
  if (min < 1)        return 'právě teď';
  if (min < 60)       return `před ${min} min`;
  if (min < 60 * 24)  return `před ${Math.floor(min / 60)} h`;
  return `před ${Math.floor(min / (60 * 24))} dny`;
}
