// ============================================================
// Platby — modul „autorizační kalkulačka" (v3 s40, zápis 22. 7. 2026)
// Mock data pro nový modul Platby. Celofiremní pohled:
//   • LEVÁ tabulka = banka (pravidelné platby + budoucí zůstatek)
//   • PRAVÁ tabulka = hotovost (trezory per provoz + výběry)
//   • dole provozy → KATEGORIE → konkrétní FAKTURY (drill-down ke kontrole)
// Majitel může odškrtnout celý provoz / kategorii / jednotlivou fakturu
// (odškrtnutá zůstane na příští termín).
// ============================================================

export const PLATBY_TODAY = '2026-04-17';          // referenční „dnes"
export const PLATBY_DO_DEFAULT = '2026-04-24';     // default „Do:" = +7 dní

// ── Kategorie plateb ────────────────────────────────────────
export type PlatbaKategorieId =
  | 'faktury' | 'investice' | 'dph' | 'energie'
  | 'vyplaty-ucet' | 'odvody' | 'vyplaty-hotove';

export const KATEGORIE_META: Record<PlatbaKategorieId, { label: string; icon: string; hotovost?: boolean }> = {
  faktury:         { label: 'Faktury dodavatelé', icon: 'solar:bill-list-bold-duotone' },
  investice:       { label: 'Investice',          icon: 'solar:city-bold-duotone' },
  dph:             { label: 'DPH',                 icon: 'solar:document-text-bold-duotone' },
  energie:         { label: 'Energie',            icon: 'solar:bolt-bold-duotone' },
  'vyplaty-ucet':  { label: 'Výplaty na účet',    icon: 'solar:card-transfer-bold-duotone' },
  odvody:          { label: 'Odvody',             icon: 'solar:hand-money-bold-duotone' },
  'vyplaty-hotove':{ label: 'Výplaty hotově',     icon: 'solar:wad-of-money-bold-duotone', hotovost: true },
};

// ── Konkrétní faktura / platba (nejnižší úroveň) ────────────
export interface PlatbaFaktura {
  id: string;
  dodavatel: string;
  cislo: string;
  castka: number;
  splatnost: string;    // reálná splatnost
}

export interface PlatbaKategorie {
  kategorie: PlatbaKategorieId;
  faktury: PlatbaFaktura[];
}

export interface PlatbyProvoz {
  id: string;
  name: string;
  short: string;
  color: string;
  disponibilni: number;        // banka — disponibilní zůstatek účtu provozu
  trezor: number;              // hotovost v trezoru
  kasar: number;               // minimální rezerva (nezapočítává se)
  kategorie: PlatbaKategorie[];
}

// ── Helpery ─────────────────────────────────────────────────
export function provozFaktury(p: PlatbyProvoz): PlatbaFaktura[] {
  return p.kategorie.flatMap((k) => k.faktury);
}
export function katSum(k: PlatbaKategorie): number {
  return k.faktury.reduce((s, f) => s + f.castka, 0);
}
export function provozPlatbySum(p: PlatbyProvoz): number {
  return provozFaktury(p).reduce((s, f) => s + f.castka, 0);
}
export function provozPocet(p: PlatbyProvoz): number {
  return provozFaktury(p).length;
}
// Součet jen VYBRANÝCH faktur (dle množiny id)
export function sumVybrane(p: PlatbyProvoz, vybrane: Set<string>): number {
  return provozFaktury(p).filter((f) => vybrane.has(f.id)).reduce((s, f) => s + f.castka, 0);
}

// ── Mock: aktivní provozy (čísla ladí s nákresem) ───────────
export const PLATBY_PROVOZY: PlatbyProvoz[] = [
  {
    id: 'u-capa', name: 'Pivnice U Čápa', short: 'U Čápa', color: '#0C5E44',
    disponibilni: 1_900_000, trezor: 185_000, kasar: 60_000,
    kategorie: [
      { kategorie: 'faktury', faktury: [
        { id: 'cap-f1', dodavatel: 'Makro Cash & Carry', cislo: 'FAK-2026-0101', castka: 320_000, splatnost: '2026-04-20' },
        { id: 'cap-f2', dodavatel: 'Bidfood', cislo: 'FAK-2026-0102', castka: 210_000, splatnost: '2026-04-21' },
        { id: 'cap-f3', dodavatel: 'Plzeňský Prazdroj', cislo: 'FAK-2026-0103', castka: 110_000, splatnost: '2026-04-22' },
      ]},
      { kategorie: 'investice', faktury: [
        { id: 'cap-i1', dodavatel: 'Gastro vybavení s.r.o.', cislo: 'FAK-2026-0110', castka: 210_000, splatnost: '2026-04-22' },
      ]},
      { kategorie: 'energie', faktury: [
        { id: 'cap-e1', dodavatel: 'E.ON Energie', cislo: 'FAK-2026-0120', castka: 90_000, splatnost: '2026-04-21' },
      ]},
      { kategorie: 'vyplaty-ucet', faktury: [
        { id: 'cap-v1', dodavatel: 'Výplaty — duben', cislo: 'MZDY-04', castka: 60_000, splatnost: '2026-04-23' },
      ]},
    ],
  },
  {
    id: 'monte', name: 'Monte bú', short: 'Monte', color: '#ad0d24',
    disponibilni: 410_000, trezor: 96_000, kasar: 50_000,
    kategorie: [
      { kategorie: 'faktury', faktury: [
        { id: 'mon-f1', dodavatel: 'Makro Cash & Carry', cislo: 'FAK-2026-0201', castka: 178_800, splatnost: '2026-04-19' },
        { id: 'mon-f2', dodavatel: 'Fresh Meat CZ', cislo: 'FAK-2026-0202', castka: 120_000, splatnost: '2026-04-20' },
      ]},
      { kategorie: 'dph', faktury: [
        { id: 'mon-d1', dodavatel: 'FÚ — DPH duben', cislo: 'DPH-2026-04', castka: 120_000, splatnost: '2026-04-24' },
      ]},
      { kategorie: 'energie', faktury: [
        { id: 'mon-e1', dodavatel: 'ČEZ Distribuce', cislo: 'FAK-2026-0220', castka: 80_000, splatnost: '2026-04-22' },
      ]},
    ],
  },
  {
    id: 'piazza', name: 'Piazza', short: 'Piazza', color: '#143746',
    disponibilni: 1_600_000, trezor: 240_000, kasar: 80_000,
    kategorie: [
      { kategorie: 'faktury', faktury: [
        { id: 'pia-f1', dodavatel: 'Makro Cash & Carry', cislo: 'FAK-2026-0301', castka: 250_000, splatnost: '2026-04-20' },
        { id: 'pia-f2', dodavatel: 'Bidfood', cislo: 'FAK-2026-0302', castka: 100_000, splatnost: '2026-04-21' },
        { id: 'pia-f3', dodavatel: 'Coca-Cola HBC', cislo: 'FAK-2026-0303', castka: 70_000, splatnost: '2026-04-22' },
      ]},
      { kategorie: 'investice', faktury: [
        { id: 'pia-i1', dodavatel: 'Rekonstrukce baru', cislo: 'FAK-2026-0310', castka: 250_000, splatnost: '2026-04-21' },
      ]},
      { kategorie: 'dph', faktury: [
        { id: 'pia-d1', dodavatel: 'FÚ — DPH duben', cislo: 'DPH-2026-04', castka: 100_000, splatnost: '2026-04-24' },
      ]},
      { kategorie: 'energie', faktury: [
        { id: 'pia-e1', dodavatel: 'E.ON Energie', cislo: 'FAK-2026-0320', castka: 70_000, splatnost: '2026-04-22' },
      ]},
      { kategorie: 'vyplaty-ucet', faktury: [
        { id: 'pia-v1', dodavatel: 'Výplaty — duben', cislo: 'MZDY-04', castka: 250_000, splatnost: '2026-04-23' },
      ]},
      { kategorie: 'odvody', faktury: [
        { id: 'pia-o1', dodavatel: 'ČSSZ + ZP', cislo: 'ODV-2026-04', castka: 80_000, splatnost: '2026-04-23' },
      ]},
      { kategorie: 'vyplaty-hotove', faktury: [
        { id: 'pia-h1', dodavatel: 'Výplaty hotově — brigádníci', cislo: 'HOT-04', castka: 50_000, splatnost: '2026-04-20' },
      ]},
    ],
  },
  {
    id: 'cg-brno', name: 'Con Gusto Brno', short: 'CG Brno', color: '#cdaa69',
    disponibilni: 720_000, trezor: 130_000, kasar: 55_000,
    kategorie: [
      { kategorie: 'faktury', faktury: [
        { id: 'brn-f1', dodavatel: 'Makro Cash & Carry', cislo: 'FAK-2026-0401', castka: 220_000, splatnost: '2026-04-21' },
        { id: 'brn-f2', dodavatel: 'Bidfood', cislo: 'FAK-2026-0402', castka: 160_000, splatnost: '2026-04-20' },
      ]},
      { kategorie: 'energie', faktury: [
        { id: 'brn-e1', dodavatel: 'ČEZ Distribuce', cislo: 'FAK-2026-0420', castka: 60_000, splatnost: '2026-04-22' },
      ]},
      { kategorie: 'vyplaty-ucet', faktury: [
        { id: 'brn-v1', dodavatel: 'Výplaty — duben', cislo: 'MZDY-04', castka: 190_000, splatnost: '2026-04-23' },
      ]},
    ],
  },
  {
    id: 'u-kohoutu', name: 'Pivnice U Kohoutů', short: 'U Kohoutů', color: '#E64843',
    disponibilni: 205_000, trezor: 72_000, kasar: 40_000,
    kategorie: [
      { kategorie: 'faktury', faktury: [
        { id: 'koh-f1', dodavatel: 'Makro Cash & Carry', cislo: 'FAK-2026-0501', castka: 150_000, splatnost: '2026-04-20' },
        { id: 'koh-f2', dodavatel: 'Plzeňský Prazdroj', cislo: 'FAK-2026-0502', castka: 90_000, splatnost: '2026-04-21' },
      ]},
      { kategorie: 'energie', faktury: [
        { id: 'koh-e1', dodavatel: 'E.ON Energie', cislo: 'FAK-2026-0520', castka: 35_000, splatnost: '2026-04-22' },
      ]},
    ],
  },
  {
    id: 'nad-hladinkou', name: 'Pivnice Nad Hladinkou', short: 'Nad Hl.', color: '#203A9A',
    disponibilni: 330_000, trezor: 58_000, kasar: 35_000,
    kategorie: [
      { kategorie: 'faktury', faktury: [
        { id: 'hla-f1', dodavatel: 'Makro Cash & Carry', cislo: 'FAK-2026-0601', castka: 165_000, splatnost: '2026-04-21' },
      ]},
      { kategorie: 'vyplaty-ucet', faktury: [
        { id: 'hla-v1', dodavatel: 'Výplaty — duben', cislo: 'MZDY-04', castka: 95_000, splatnost: '2026-04-23' },
      ]},
    ],
  },
  {
    id: 'teatr', name: 'Teátr', short: 'Teátr', color: '#e56445',
    disponibilni: 480_000, trezor: 88_000, kasar: 45_000,
    kategorie: [
      { kategorie: 'faktury', faktury: [
        { id: 'tea-f1', dodavatel: 'Bidfood', cislo: 'FAK-2026-0701', castka: 130_000, splatnost: '2026-04-20' },
        { id: 'tea-f2', dodavatel: 'Coca-Cola HBC', cislo: 'FAK-2026-0702', castka: 80_000, splatnost: '2026-04-21' },
      ]},
      { kategorie: 'dph', faktury: [
        { id: 'tea-d1', dodavatel: 'FÚ — DPH duben', cislo: 'DPH-2026-04', castka: 70_000, splatnost: '2026-04-24' },
      ]},
    ],
  },
  {
    id: 'cg-catering', name: 'Con Gusto Catering', short: 'CG Cater.', color: '#4b0041',
    disponibilni: 900_000, trezor: 45_000, kasar: 30_000,
    kategorie: [
      { kategorie: 'faktury', faktury: [
        { id: 'cat-f1', dodavatel: 'Makro Cash & Carry', cislo: 'FAK-2026-0801', castka: 185_000, splatnost: '2026-04-21' },
        { id: 'cat-f2', dodavatel: 'Fresh Meat CZ', cislo: 'FAK-2026-0802', castka: 120_000, splatnost: '2026-04-20' },
      ]},
      { kategorie: 'investice', faktury: [
        { id: 'cat-i1', dodavatel: 'Cateringové vybavení', cislo: 'FAK-2026-0810', castka: 160_000, splatnost: '2026-04-22' },
      ]},
    ],
  },
];

// ── Rozpad VYBRANÝCH plateb dle typu (pro bankovní kalkulačku) ──
export interface VyberBreakdown {
  platby: number;         // faktury + investice + energie + výplaty na účet (běžné platby bez spec. kategorie)
  dane: number;           // DPH + odvody
  vyplatyHotove: number;  // výplaty hotově (řeší se z trezoru, ne z banky)
}
export function vybraneBreakdown(vybrane: Set<string>): VyberBreakdown {
  let platby = 0, dane = 0, vyplatyHotove = 0;
  for (const p of PLATBY_PROVOZY) {
    for (const k of p.kategorie) {
      const sel = k.faktury.filter((f) => vybrane.has(f.id)).reduce((s, f) => s + f.castka, 0);
      if (k.kategorie === 'dph' || k.kategorie === 'odvody') dane += sel;
      else if (k.kategorie === 'vyplaty-hotove') vyplatyHotove += sel;
      else platby += sel;
    }
  }
  return { platby, dane, vyplatyHotove };
}

// ── Firemní souhrn — HOTOVOST (pravá tabulka) ───────────────
export interface ProvozHotovost {
  id: string; name: string; short: string; color: string;
  trezor: number; kasar: number; disponibilni: number;  // trezor − kasar
  vyplatyHotove: number;                                 // vybrané hotové výplaty provozu
  nutnyVyber: number;                                    // kolik chybí → vybrat z banky
}
export interface HotovostSouhrn {
  trezorCelkem: number;
  kasarCelkem: number;
  disponibilniHotovost: number;
  planVyberVyplaty: number;
  nutnyVyberCelkem: number;      // kolik je nutné vybrat z banky (součet schodků provozů)
  poVyberu: number;              // disponibilní hotovost po výplatách (po dorovnání výběrem)
  provozy: ProvozHotovost[];     // detail per provoz (kde a kolik vybrat)
}

export function hotovostSouhrn(vybrane: Set<string>): HotovostSouhrn {
  const provozy: ProvozHotovost[] = PLATBY_PROVOZY.map((p) => {
    const disponibilni = p.trezor - p.kasar;
    const vyplatyHotove = p.kategorie
      .filter((k) => KATEGORIE_META[k.kategorie].hotovost)
      .reduce((a, k) => a + k.faktury.filter((f) => vybrane.has(f.id)).reduce((s, f) => s + f.castka, 0), 0);
    const nutnyVyber = Math.max(0, vyplatyHotove - disponibilni);
    return { id: p.id, name: p.name, short: p.short, color: p.color, trezor: p.trezor, kasar: p.kasar, disponibilni, vyplatyHotove, nutnyVyber };
  });
  const trezorCelkem = provozy.reduce((s, p) => s + p.trezor, 0);
  const kasarCelkem = provozy.reduce((s, p) => s + p.kasar, 0);
  const planVyberVyplaty = provozy.reduce((s, p) => s + p.vyplatyHotove, 0);
  const nutnyVyberCelkem = provozy.reduce((s, p) => s + p.nutnyVyber, 0);
  const disponibilniHotovost = trezorCelkem - kasarCelkem;
  return {
    trezorCelkem, kasarCelkem, disponibilniHotovost, planVyberVyplaty,
    nutnyVyberCelkem,
    poVyberu: disponibilniHotovost - planVyberVyplaty + nutnyVyberCelkem, // dorovnáno výběrem z banky
    provozy,
  };
}

// ── Firemní souhrn — BANKA (levá tabulka) ───────────────────
export interface BankaSouhrn {
  stavUctu: number;
  trvalePrikazy: number;
  uvery: number;
  dane: number;
  poplatky: number;
  platby: number;          // vybrané běžné platby (bez spec. kategorie)
  vyberHotovost: number;   // výběr hotovosti na výplaty (promítnutý z pravé tabulky)
  predikce: number;
  budouciZustatek: number;
}

export const FIREMNI_TP = 320_000;
export const FIREMNI_UVERY = 540_000;
export const FIREMNI_POPLATKY = 28_000;
export const FIREMNI_PREDIKCE = 690_000;   // karty na cestě (příchozí)

export function bankaSouhrn(bd: VyberBreakdown, vyberHotovost: number): BankaSouhrn {
  const stavUctu = PLATBY_PROVOZY.reduce((s, p) => s + p.disponibilni, 0);
  const budouciZustatek =
    stavUctu
    - (FIREMNI_TP + FIREMNI_UVERY + bd.dane + FIREMNI_POPLATKY + bd.platby + vyberHotovost)
    + FIREMNI_PREDIKCE;
  return {
    stavUctu, trvalePrikazy: FIREMNI_TP, uvery: FIREMNI_UVERY,
    dane: bd.dane, poplatky: FIREMNI_POPLATKY, platby: bd.platby,
    vyberHotovost, predikce: FIREMNI_PREDIKCE, budouciZustatek,
  };
}
