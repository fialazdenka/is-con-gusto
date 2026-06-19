// MOCK DATA: daně (Phase 7 — sekce Ekonomika → Daně)
// Per zápis 12. 6. 2026:
//  - Evidence daňových plateb (nemovitost, příjem, DPH) za S.R.O.
//  - Per právní entita (Con Gusto / U Čápa / KOREK)
//  - Import dat + export oficiálních reportů

export type DanTyp =
  | 'dph'              // DPH (měsíční / kvartální)
  | 'prijem-pravnicke' // Daň z příjmu právnických osob (roční)
  | 'prijem-fyzicke'   // Daň z příjmu FO (pro vedení, mzdové odvody)
  | 'nemovitost'       // Daň z nemovitosti (roční)
  | 'silnicni'         // Silniční daň
  | 'srazka'           // Srážková daň
  | 'jine';

export type DanStav =
  | 'planovany'        // budoucí, ještě nepřišel den splatnosti
  | 'odeslano'         // odesláno do banky
  | 'zaplaceno'        // přišlo / spárováno
  | 'po-splatnosti';   // po splatnosti, nezaplaceno

export type PravniEntitaDan = 'con-gusto' | 'u-capa' | 'korek';

export interface Dan {
  id: string;
  typ: DanTyp;
  obdobi: string;                // "2025-Q4" / "2025" / "2026-05"
  splatnost: string;             // YYYY-MM-DD
  castka: number;                // kladná = odchozí (placené)
  stav: DanStav;
  pravniEntita: PravniEntitaDan;
  ucetId?: string;               // BANKA_UCTY id
  parovanaSBankaTrans?: string;
  popis?: string;
  poznamka?: string;
  // Přiznání / dokument (PDF)
  dokument?: string;             // mock název souboru
  // Phase 7 — nepovinné přiřazení provozovně
  provozovnaId?: string;
}

// ─────────────────────────────────────────────────────────────
// META
// ─────────────────────────────────────────────────────────────

export const DAN_TYP_META: Record<DanTyp, { label: string; color: string; bg: string; icon: string; short: string }> = {
  'dph':              { label: 'DPH',                   short: 'DPH',  color: '#0d6efd', bg: '#e8f0ff', icon: 'solar:bill-list-bold-duotone' },
  'prijem-pravnicke': { label: 'Daň z příjmu PO',       short: 'DPPO', color: '#198754', bg: '#d1f0db', icon: 'solar:buildings-2-bold-duotone' },
  'prijem-fyzicke':   { label: 'Daň z příjmu FO',       short: 'DPFO', color: '#6f42c1', bg: '#f3eaff', icon: 'solar:user-bold-duotone' },
  'nemovitost':       { label: 'Daň z nemovitosti',     short: 'DN',   color: '#fd7e14', bg: '#ffedd5', icon: 'solar:home-bold-duotone' },
  'silnicni':         { label: 'Silniční daň',          short: 'SD',   color: '#6c757d', bg: '#f1f3f5', icon: 'solar:car-bold-duotone' },
  'srazka':           { label: 'Srážková daň',          short: 'SrD',  color: '#0dcaf0', bg: '#e8f7ff', icon: 'solar:money-bag-bold-duotone' },
  'jine':             { label: 'Jiné',                  short: 'JI',   color: '#9097a7', bg: '#f1f3f5', icon: 'solar:question-circle-bold-duotone' },
};

export const DAN_STAV_META: Record<DanStav, { label: string; cls: string; icon: string }> = {
  planovany:       { label: 'Plánovaný',     cls: 'bg-light text-muted border',       icon: 'solar:calendar-bold-duotone' },
  odeslano:        { label: 'Odesláno',      cls: 'bg-info-subtle text-info',         icon: 'solar:upload-bold-duotone' },
  zaplaceno:       { label: 'Zaplaceno',     cls: 'bg-success-subtle text-success',   icon: 'solar:check-circle-bold-duotone' },
  'po-splatnosti': { label: 'Po splatnosti', cls: 'bg-danger-subtle text-danger',     icon: 'solar:bell-bing-bold-duotone' },
};

export const PRAVNI_ENTITA_DAN_LABEL: Record<PravniEntitaDan, string> = {
  'con-gusto': 'Con Gusto s.r.o.',
  'u-capa':    'Pivnice U Čápa s.r.o.',
  'korek':     'KOREK s.r.o.',
};

// ─────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────

export const DANE: Dan[] = [
  // ── DPH kvartální za Con Gusto (4× ročně, splatnost 25. dne) ──
  { id: 'dn01', typ: 'dph', obdobi: '2026-Q1', splatnost: '2026-04-25', castka:  348_500, stav: 'zaplaceno', pravniEntita: 'con-gusto', ucetId: 'ua-hlavni', popis: 'DPH 1. kvartál 2026', dokument: 'DPH-Q1-2026-priznani.pdf' },
  { id: 'dn02', typ: 'dph', obdobi: '2025-Q4', splatnost: '2026-01-25', castka:  412_300, stav: 'zaplaceno', pravniEntita: 'con-gusto', ucetId: 'ua-hlavni', popis: 'DPH 4. kvartál 2025', dokument: 'DPH-Q4-2025-priznani.pdf' },
  { id: 'dn03', typ: 'dph', obdobi: '2025-Q3', splatnost: '2025-10-25', castka:  389_100, stav: 'zaplaceno', pravniEntita: 'con-gusto', ucetId: 'ua-hlavni', popis: 'DPH 3. kvartál 2025' },
  { id: 'dn04', typ: 'dph', obdobi: '2025-Q2', splatnost: '2025-07-25', castka:  368_700, stav: 'zaplaceno', pravniEntita: 'con-gusto', ucetId: 'ua-hlavni', popis: 'DPH 2. kvartál 2025' },
  { id: 'dn05', typ: 'dph', obdobi: '2026-Q2', splatnost: '2026-07-25', castka:  340_000, stav: 'planovany', pravniEntita: 'con-gusto', ucetId: 'ua-hlavni', popis: 'DPH 2. kvartál 2026 (odhad)' },

  // U Čápa DPH
  { id: 'dn06', typ: 'dph', obdobi: '2026-Q1', splatnost: '2026-04-25', castka:   58_200, stav: 'zaplaceno', pravniEntita: 'u-capa',    ucetId: 'ua-u-capa', popis: 'DPH 1. kvartál 2026' },
  { id: 'dn07', typ: 'dph', obdobi: '2026-Q2', splatnost: '2026-07-25', castka:   62_000, stav: 'planovany', pravniEntita: 'u-capa',    ucetId: 'ua-u-capa', popis: 'DPH 2. kvartál 2026 (odhad)' },

  // KOREK DPH
  { id: 'dn08', typ: 'dph', obdobi: '2026-Q1', splatnost: '2026-04-25', castka:  124_500, stav: 'zaplaceno', pravniEntita: 'korek',     ucetId: 'ua-korek-wb', popis: 'DPH 1. kvartál 2026' },
  { id: 'dn09', typ: 'dph', obdobi: '2026-Q2', splatnost: '2026-07-25', castka:  130_000, stav: 'planovany', pravniEntita: 'korek',     ucetId: 'ua-korek-wb', popis: 'DPH 2. kvartál 2026 (odhad)' },

  // ── Daň z příjmu PO (roční, splatnost konec června) ──
  { id: 'dn10', typ: 'prijem-pravnicke', obdobi: '2024', splatnost: '2025-06-30', castka: 1_240_500, stav: 'zaplaceno',     pravniEntita: 'con-gusto', ucetId: 'ua-hlavni', popis: 'Daň z příjmu PO 2024', dokument: 'DPPO-2024-priznani.pdf' },
  { id: 'dn11', typ: 'prijem-pravnicke', obdobi: '2025', splatnost: '2026-06-30', castka: 1_320_000, stav: 'odeslano',      pravniEntita: 'con-gusto', ucetId: 'ua-hlavni', popis: 'Daň z příjmu PO 2025', dokument: 'DPPO-2025-priznani.pdf' },
  { id: 'dn12', typ: 'prijem-pravnicke', obdobi: '2025', splatnost: '2026-06-30', castka:   142_300, stav: 'odeslano',      pravniEntita: 'u-capa',    ucetId: 'ua-u-capa', popis: 'Daň z příjmu PO 2025' },
  { id: 'dn13', typ: 'prijem-pravnicke', obdobi: '2025', splatnost: '2026-06-30', castka:   285_700, stav: 'odeslano',      pravniEntita: 'korek',     ucetId: 'ua-korek-wb', popis: 'Daň z příjmu PO 2025' },

  // ── Daň z nemovitosti (roční, splatnost konec května) ──
  { id: 'dn14', typ: 'nemovitost', obdobi: '2026', splatnost: '2026-05-31', castka: 24_500, stav: 'zaplaceno', pravniEntita: 'con-gusto', ucetId: 'ua-hlavni', popis: 'Daň z nemovitosti 2026 — CG Brno', provozovnaId: 'cg-brno' },
  { id: 'dn15', typ: 'nemovitost', obdobi: '2026', splatnost: '2026-05-31', castka: 38_200, stav: 'zaplaceno', pravniEntita: 'con-gusto', ucetId: 'ua-piazza', popis: 'Daň z nemovitosti 2026 — Piazza', provozovnaId: 'piazza' },
  { id: 'dn16', typ: 'nemovitost', obdobi: '2026', splatnost: '2026-05-31', castka: 21_800, stav: 'zaplaceno', pravniEntita: 'con-gusto', ucetId: 'ua-monte', popis: 'Daň z nemovitosti 2026 — Monte', provozovnaId: 'monte' },
  { id: 'dn17', typ: 'nemovitost', obdobi: '2026', splatnost: '2026-05-31', castka:  9_500, stav: 'zaplaceno', pravniEntita: 'u-capa',    ucetId: 'ua-u-capa', popis: 'Daň z nemovitosti 2026 — U Čápa', provozovnaId: 'u-capa' },

  // ── Silniční daň (roční pro provozovny s dodávkou) ──
  { id: 'dn18', typ: 'silnicni', obdobi: '2026', splatnost: '2026-01-31', castka: 4_200, stav: 'zaplaceno', pravniEntita: 'con-gusto', ucetId: 'ua-hlavni', popis: 'Silniční daň 2026 — dodávka Hyundai', provozovnaId: 'cg-brno' },

  // ── Srážková daň (z dividend / honorářů, mock 1 ks) ──
  { id: 'dn19', typ: 'srazka', obdobi: '2026-05', splatnost: '2026-06-15', castka: 12_500, stav: 'planovany', pravniEntita: 'con-gusto', ucetId: 'ua-hlavni', popis: 'Srážková daň — autorský honorář květen' },

  // ── Po splatnosti (mock, pro demo) ──
  { id: 'dn20', typ: 'silnicni', obdobi: '2026', splatnost: '2026-01-31', castka: 1_800, stav: 'po-splatnosti', pravniEntita: 'u-capa', ucetId: 'ua-u-capa', popis: 'Silniční daň 2026 — vozík (po splatnosti)' },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

export function getKpiDane(data: Dan[]): {
  kOdeslaniMesic: number;
  zaplacenoCelkem: number;
  poSplatnosti: number;
  planovano: number;
} {
  const today = '2026-06-19';
  const monthEnd = '2026-06-30';
  const kOdeslaniMesic = data
    .filter((d) => d.stav === 'planovany' && d.splatnost >= today && d.splatnost <= monthEnd)
    .reduce((s, d) => s + d.castka, 0);
  const zaplacenoCelkem = data
    .filter((d) => d.stav === 'zaplaceno' && d.splatnost.slice(0, 4) === '2026')
    .reduce((s, d) => s + d.castka, 0);
  const poSplatnosti = data.filter((d) => d.stav === 'po-splatnosti').length;
  const planovano = data.filter((d) => d.stav === 'planovany').length;
  return { kOdeslaniMesic, zaplacenoCelkem, poSplatnosti, planovano };
}
