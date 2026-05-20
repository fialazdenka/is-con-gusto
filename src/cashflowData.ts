// ─────────────────────────────────────────────────────────────
// Mock data – modul Cashflow
// Referenční datum: 2026-04-17 (čtvrtek, týden 16)
// ─────────────────────────────────────────────────────────────

import { FAKTURY_PLATBY, OSTATNI_PLATBY, getZustatek } from './platbyData';
import { POHLEDAVKY } from './pohledavkyData';

export interface CashflowTyden {
  label: string;       // "23.2." = začátek týdne
  weekStart: string;
  prijmy: number;
  vydaje: number;
  projected: boolean;
  current: boolean;    // aktuální (neukončený) týden
}

export interface CashflowTransakce {
  id: string;
  typ: 'prijem' | 'vydaj';
  kategorie: 'trzby' | 'pohledavka' | 'faktura' | 'mzdy' | 'najem' | 'energie' | 'ostatni';
  popis: string;
  castka: number;
  datum: string;
  provozovna: string;
  stav: 'ok' | 'ceka' | 'chyba';
}

export interface KategorieRow {
  label: string;
  castka: number;
  color: string;
}

// ─── Scale faktory per provozovna ─────────────────────────────
const PROV_SCALE: Record<string, number> = {
  all: 1.0, 'cg-brno': 0.45, piazza: 0.35, monte: 0.20,
};

// ─── Týdenní data (base = všechny provozovny) ─────────────────
const BASE_TYDNY: Omit<CashflowTyden, 'projected' | 'current'>[] = [
  { label: '23.2.', weekStart: '2026-02-23', prijmy: 485_000, vydaje: 355_000 },
  { label: '2.3.',  weekStart: '2026-03-02', prijmy: 512_000, vydaje: 382_000 },
  { label: '9.3.',  weekStart: '2026-03-09', prijmy: 498_000, vydaje: 396_000 },
  { label: '16.3.', weekStart: '2026-03-16', prijmy: 546_000, vydaje: 458_000 }, // výplatní týden
  { label: '23.3.', weekStart: '2026-03-23', prijmy: 511_000, vydaje: 388_000 },
  { label: '30.3.', weekStart: '2026-03-30', prijmy: 528_000, vydaje: 490_000 }, // nájemné
  { label: '6.4.',  weekStart: '2026-04-06', prijmy: 563_000, vydaje: 412_000 },
  { label: '13.4.', weekStart: '2026-04-13', prijmy: 288_000, vydaje: 198_000 }, // neukončený (5 dní)
  { label: '20.4.', weekStart: '2026-04-20', prijmy: 540_000, vydaje: 385_000 }, // projected
  { label: '27.4.', weekStart: '2026-04-27', prijmy: 556_000, vydaje: 362_000 }, // projected
];

export function getCashflowTydny(provozovna: string): CashflowTyden[] {
  const scale = PROV_SCALE[provozovna] ?? 1.0;
  return BASE_TYDNY.map((w, i) => ({
    ...w,
    prijmy:    Math.round(w.prijmy    * scale),
    vydaje:    Math.round(w.vydaje    * scale),
    projected: i >= 8,
    current:   i === 7,
  }));
}

// ─── KPI – duben 2026 ─────────────────────────────────────────
const KPI_BASE = {
  prijmy:  1_173_000, // T15 (plný) + T16 (5 dní) + catering
  vydaje:    958_000,
};

export function getCashflowKPI(provozovna: string) {
  const s = PROV_SCALE[provozovna] ?? 1.0;
  return {
    prijmy:  Math.round(KPI_BASE.prijmy  * s),
    vydaje:  Math.round(KPI_BASE.vydaje  * s),
    cistyCC: Math.round((KPI_BASE.prijmy - KPI_BASE.vydaje) * s),
    zustatek: getZustatek(provozovna),
  };
}

// ─── Breakdown kategorií (base = all, duben) ──────────────────
const PRIJMY_KAT_BASE: KategorieRow[] = [
  { label: 'Tržby hotovost',   castka: 682_000, color: '#14b8a6' },
  { label: 'Kartové platby',   castka: 341_000, color: '#1c84ee' },
  { label: 'Pohledávky / catering', castka: 130_000, color: '#c9911a' },
  { label: 'Ostatní příjmy',   castka: 20_000,  color: '#9097a7' },
];

const VYDAJE_KAT_BASE: KategorieRow[] = [
  { label: 'Zásoby a zboží',   castka: 326_000, color: '#f97316' },
  { label: 'Personál / mzdy',  castka: 291_000, color: '#8b5cf6' },
  { label: 'Nájem',            castka: 255_000, color: '#ec4899' },
  { label: 'Energie',          castka: 72_000,  color: '#ef4444' },
  { label: 'Služby a ostatní', castka: 14_000,  color: '#9097a7' },
];

export function getKategorieBreakdown(provozovna: string) {
  const s = PROV_SCALE[provozovna] ?? 1.0;
  return {
    prijmy: PRIJMY_KAT_BASE.map((k) => ({ ...k, castka: Math.round(k.castka * s) })),
    vydaje: VYDAJE_KAT_BASE.map((k) => ({ ...k, castka: Math.round(k.castka * s) })),
  };
}

// ─── Transakce (posledních ~14 dní) ───────────────────────────
const TRANSAKCE_BASE: CashflowTransakce[] = [
  { id: 'ct01', typ: 'prijem', kategorie: 'trzby',      popis: 'Tržby CG Brno – 17.4.',        castka: 88_700, datum: '2026-04-17', provozovna: 'cg-brno', stav: 'ok' },
  { id: 'ct02', typ: 'prijem', kategorie: 'trzby',      popis: 'Tržby Piazza – 17.4.',          castka: 55_700, datum: '2026-04-17', provozovna: 'piazza',  stav: 'ok' },
  { id: 'ct03', typ: 'prijem', kategorie: 'trzby',      popis: 'Tržby Monte – 17.4.',           castka: 31_200, datum: '2026-04-17', provozovna: 'monte',   stav: 'ok' },
  { id: 'ct04', typ: 'vydaj',  kategorie: 'faktura',    popis: 'Sodexo – stravenkový příspěvek',castka:  8_900, datum: '2026-04-17', provozovna: 'piazza',  stav: 'ok' },
  { id: 'ct05', typ: 'prijem', kategorie: 'trzby',      popis: 'Tržby CG Brno – 16.4.',        castka: 91_400, datum: '2026-04-16', provozovna: 'cg-brno', stav: 'ok' },
  { id: 'ct06', typ: 'prijem', kategorie: 'trzby',      popis: 'Tržby Piazza – 16.4.',         castka: 58_200, datum: '2026-04-16', provozovna: 'piazza',  stav: 'ok' },
  { id: 'ct07', typ: 'vydaj',  kategorie: 'faktura',    popis: 'ČEZ – elektřina',              castka: 24_800, datum: '2026-04-16', provozovna: 'cg-brno', stav: 'ok' },
  { id: 'ct08', typ: 'vydaj',  kategorie: 'faktura',    popis: 'E.ON – elektřina Monte',       castka: 12_500, datum: '2026-04-15', provozovna: 'monte',   stav: 'ok' },
  { id: 'ct09', typ: 'vydaj',  kategorie: 'mzdy',       popis: 'Záloha mezd – duben',          castka:120_000, datum: '2026-04-15', provozovna: 'cg-brno', stav: 'ok' },
  { id: 'ct10', typ: 'prijem', kategorie: 'pohledavka', popis: 'Úhrada Brno Hotel a.s.',       castka: 45_200, datum: '2026-04-12', provozovna: 'piazza',  stav: 'ok' },
  { id: 'ct11', typ: 'prijem', kategorie: 'trzby',      popis: 'Tržby (agregát) – 11.4.',      castka:167_800, datum: '2026-04-11', provozovna: 'cg-brno', stav: 'ok' },
  { id: 'ct12', typ: 'vydaj',  kategorie: 'faktura',    popis: 'Makro Cash & Carry',           castka: 45_200, datum: '2026-04-10', provozovna: 'cg-brno', stav: 'chyba' },
  { id: 'ct13', typ: 'vydaj',  kategorie: 'najem',      popis: 'Nájemné CG Brno – duben',      castka: 85_000, datum: '2026-04-07', provozovna: 'cg-brno', stav: 'ceka' },
  { id: 'ct14', typ: 'prijem', kategorie: 'trzby',      popis: 'Tržby (agregát) – 7.–10.4.',   castka:398_000, datum: '2026-04-10', provozovna: 'cg-brno', stav: 'ok' },
  { id: 'ct15', typ: 'vydaj',  kategorie: 'faktura',    popis: 'Plzeňský Prazdroj',            castka: 22_100, datum: '2026-04-08', provozovna: 'monte',   stav: 'ok' },
];

export function getCashflowTransakce(provozovna: string): CashflowTransakce[] {
  if (provozovna === 'all') return TRANSAKCE_BASE;
  return TRANSAKCE_BASE.filter((t) => t.provozovna === provozovna);
}

// ─── Prognóza – nadcházející platby / příjmy ──────────────────
export interface PrognozaItem {
  id: string;
  typ: 'vydaj' | 'prijem';
  popis: string;
  castka: number;
  datum: string;     // expected payment date
  provozovna: string;
  zdroj: 'faktura' | 'pohledavka' | 'ostatni';
}

export function getUpcomingPrognoza(provozovna: string): PrognozaItem[] {
  const items: PrognozaItem[] = [];
  const ref = new Date('2026-04-17');
  const limit = new Date('2026-05-17');

  // Výdaje: schválené faktury splatné v 30 dnech
  for (const f of FAKTURY_PLATBY) {
    if (f.stav !== 'schvalena') continue;
    if (provozovna !== 'all' && f.provozovna !== provozovna) continue;
    const d = new Date(f.splatnost);
    if (d > ref && d <= limit) {
      items.push({ id: f.id, typ: 'vydaj', popis: f.dodavatel, castka: f.castka, datum: f.splatnost, provozovna: f.provozovna, zdroj: 'faktura' });
    }
  }

  // Výdaje: ostatní platby
  for (const o of OSTATNI_PLATBY) {
    if (provozovna !== 'all' && o.provozovna !== provozovna) continue;
    const d = new Date(o.datum);
    if (d > ref && d <= limit) {
      items.push({ id: o.id, typ: 'vydaj', popis: o.popis, castka: o.castka, datum: o.datum, provozovna: o.provozovna, zdroj: 'ostatni' });
    }
  }

  // Příjmy: pohledávky splatné v 30 dnech
  for (const p of POHLEDAVKY) {
    if (p.stav !== 'odeslana' && p.stav !== 'vystavena') continue;
    if (provozovna !== 'all' && p.provozovna !== provozovna) continue;
    const d = new Date(p.splatnost);
    if (d > ref && d <= limit) {
      items.push({ id: p.id, typ: 'prijem', popis: p.klient, castka: p.castka, datum: p.splatnost, provozovna: p.provozovna, zdroj: 'pohledavka' });
    }
  }

  return items.sort((a, b) => a.datum.localeCompare(b.datum));
}

export const STAV_META_CF: Record<string, { cls: string; label: string }> = {
  ok:    { cls: 'bg-success-subtle text-success', label: 'OK' },
  ceka:  { cls: 'bg-warning-subtle text-warning', label: 'Čeká' },
  chyba: { cls: 'bg-danger-subtle text-danger',   label: 'Chyba' },
};

export const KAT_ICONS: Record<string, string> = {
  trzby:     'solar:shop-bold-duotone',
  pohledavka:'solar:money-bag-bold-duotone',
  faktura:   'solar:bill-list-bold-duotone',
  mzdy:      'solar:users-group-rounded-bold-duotone',
  najem:     'solar:buildings-bold-duotone',
  energie:   'solar:bolt-bold-duotone',
  ostatni:   'solar:widget-5-bold-duotone',
};
