// MOCK DATA: trvalé příkazy (Phase 3 — sekce Finance → Trvalé příkazy)
// Per zápis 4. 6. 2026 — kopie nastavení v bance + možnost vytvořit z nespárované platby.
// Leasingy s měnícím se VS → splátkový kalendář (editovatelné jednotlivé splátky).

export type TrvalyPrikazPerioda =
  | 'mesicni'
  | 'kvartalni'
  | 'pololetni'
  | 'rocni'
  | 'tydenni'
  | 'jednorazovy';

export type TrvalyPrikazStav =
  | 'aktivni'         // běží podle plánu
  | 'pozastaveny'     // dočasně zastaven
  | 'ukonceny';       // doběhl konec / zrušen

export type TrvalyPrikazTyp =
  | 'standard'        // stejná částka i VS každý cyklus
  | 'leasing'         // měnící se VS, fixní/skoro fixní částka
  | 'zaloha';         // záloha (energie) s ročním vyúčtováním

// Naplánovaná splátka v rámci splátkového kalendáře (pro leasingy / zálohy)
export interface TrvalySplatkaItem {
  id: string;
  cisloSplatky: number;
  datum: string;                 // YYYY-MM-DD
  castka: number;                // může se lišit per splátka
  vs: string;                    // pro leasingy se obvykle mění (lze editovat per řádek)
  stav: 'planovana' | 'odeslana' | 'zaplacena' | 'po-splatnosti';
  parovanaSId?: string;          // ID transakce v Bance pokud spárovaná
  ucetId?: string;               // override odchozího účtu per splátka (fallback = parent.ucetId)
  poznamka?: string;
  editedAt?: string;             // ISO timestamp ručního zásahu (pro UI badge „upraveno")
}

// Příloha trvalého příkazu (smlouva, dodatek apod.) — Phase 3
export interface TrvalyDokument {
  id: string;
  nazev: string;             // např. "Smlouva-Hyundai-Leasing-2025-10.pdf"
  typ: string;               // např. "Smlouva", "Dodatek", "Splátkový kalendář"
  velikostKb: number;
  uploadedAt: string;        // ISO timestamp
  uploadedBy: string;
}

export interface TrvalyPrikaz {
  id: string;
  nazev: string;
  ucetId: string;                // z BANKA_UCTY
  protistrana: string;
  protiUcet: string;
  typ: TrvalyPrikazTyp;
  perioda: TrvalyPrikazPerioda;
  castka: number;
  vs: string;
  ks?: string;
  ss?: string;
  zacatek: string;               // YYYY-MM-DD
  konec?: string;
  pristiSplatnost: string;       // YYYY-MM-DD
  stav: TrvalyPrikazStav;
  poznamka?: string;
  splatky?: TrvalySplatkaItem[];
  dokumenty?: TrvalyDokument[];  // smlouvy, dodatky
}

// ─────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────

// Phase 3 — generování splátkového kalendáře pro leasing.
// VS každé splátky se odvozuje od `vsTemplate` + pořadové číslo (3-místné).
export function generateLeasingSplatky(start: string, count: number, baseAmount: number, vsTemplate: string): TrvalySplatkaItem[] {
  const items: TrvalySplatkaItem[] = [];
  const [y, m, d] = start.split('-').map(Number);
  for (let i = 0; i < count; i++) {
    const date = new Date(y, m - 1 + i, d);
    const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const vs = `${vsTemplate}${String(i + 1).padStart(3, '0')}`;
    const today = '2026-06-09';
    let stav: TrvalySplatkaItem['stav'];
    if (ds < today)      stav = 'zaplacena';
    else if (ds === today) stav = 'odeslana';
    else                 stav = 'planovana';
    items.push({
      id: `sp-${vs}`,
      cisloSplatky: i + 1,
      datum: ds,
      castka: baseAmount + (i < 3 ? 0 : -200),
      vs,
      stav,
    });
  }
  return items;
}

// Pomocné — počet měsíců mezi 2 daty (orientačně, pro výpočet počtu splátek)
export function monthsBetween(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 0;
  const [sy, sm] = startISO.split('-').map(Number);
  const [ey, em] = endISO.split('-').map(Number);
  return Math.max(0, (ey - sy) * 12 + (em - sm) + 1);
}

export const TRVALE_PRIKAZY: TrvalyPrikaz[] = [
  // Klasické měsíční paušály
  {
    id: 'tp01',
    nazev: 'O2 — telefon CG Brno',
    ucetId: 'ua-cg-brno',
    protistrana: 'O2 Czech Republic',
    protiUcet: '56789012/0300',
    typ: 'standard',
    perioda: 'mesicni',
    castka: 2_800,
    vs: '20260315',
    ks: '0308',
    zacatek: '2024-01-15',
    pristiSplatnost: '2026-06-15',
    stav: 'aktivni',
    poznamka: 'Telefon paušál — manažeři CG Brno',
  },
  {
    id: 'tp02',
    nazev: 'Vodafone — internet Piazza',
    ucetId: 'ua-piazza',
    protistrana: 'Vodafone Czech',
    protiUcet: '23456789/0300',
    typ: 'standard',
    perioda: 'mesicni',
    castka: 12_300,
    vs: '20260411',
    zacatek: '2022-03-01',
    pristiSplatnost: '2026-06-10',
    stav: 'aktivni',
  },
  {
    id: 'tp03',
    nazev: 'Generali — pojistné Q',
    ucetId: 'ua-monte',
    protistrana: 'Generali Pojišťovna',
    protiUcet: '67890123/0100',
    typ: 'standard',
    perioda: 'kvartalni',
    castka: 3_800,
    vs: '20260400',
    zacatek: '2023-07-01',
    pristiSplatnost: '2026-07-01',
    stav: 'aktivni',
    poznamka: 'Pojištění zařízení provozovny',
  },
  {
    id: 'tp04',
    nazev: 'Správa budov — nájem Piazza',
    ucetId: 'ua-piazza',
    protistrana: 'Správa budov s.r.o.',
    protiUcet: '12345678/2700',
    typ: 'standard',
    perioda: 'mesicni',
    castka: 68_000,
    vs: '20260400',
    zacatek: '2020-04-01',
    pristiSplatnost: '2026-06-25',
    stav: 'aktivni',
  },
  {
    id: 'tp05',
    nazev: 'PPL CZ — paušál doprava',
    ucetId: 'ua-cg-brno',
    protistrana: 'PPL CZ s.r.o.',
    protiUcet: '34567812/0100',
    typ: 'standard',
    perioda: 'mesicni',
    castka: 8_500,
    vs: '20260321',
    zacatek: '2024-03-01',
    pristiSplatnost: '2026-06-20',
    stav: 'aktivni',
  },

  // Zálohy (energie)
  {
    id: 'tp06',
    nazev: 'E.ON — zálohy elektřina CG Brno',
    ucetId: 'ua-cg-brno',
    protistrana: 'E.ON Energie',
    protiUcet: '34567890/0800',
    typ: 'zaloha',
    perioda: 'mesicni',
    castka: 8_400,
    vs: '20260309',
    zacatek: '2024-01-01',
    pristiSplatnost: '2026-06-15',
    stav: 'aktivni',
    poznamka: 'Vyúčtování 1× ročně (březen).',
  },
  {
    id: 'tp07',
    nazev: 'Pražská plynárenská — plyn',
    ucetId: 'ua-monte',
    protistrana: 'Pražská plynárenská',
    protiUcet: '45678901/0800',
    typ: 'zaloha',
    perioda: 'mesicni',
    castka: 4_200,
    vs: '20260512',
    zacatek: '2023-09-01',
    pristiSplatnost: '2026-06-12',
    stav: 'aktivni',
  },

  // Leasingy
  {
    id: 'tp08',
    nazev: 'Hyundai Leasing — dodávka CG Brno',
    ucetId: 'ua-cg-brno',
    protistrana: 'Hyundai Leasing',
    protiUcet: '45678901/2010',
    typ: 'leasing',
    perioda: 'mesicni',
    castka: 45_000,
    vs: '20260415',
    ks: '1148',
    zacatek: '2025-10-15',
    konec: '2030-09-15',
    pristiSplatnost: '2026-06-15',
    stav: 'aktivni',
    poznamka: 'Splátkový kalendář — 60 měsíců.',
    // Splátka #5 (2026-02-15) zůstala neuhrazená — po splatnosti (demo nezaplacené)
    splatky: generateLeasingSplatky('2025-10-15', 12, 45_000, '202610').map((s) =>
      s.cisloSplatky === 5 ? { ...s, stav: 'po-splatnosti' as const, poznamka: 'Nedostatek prostředků 2026-02' } : s
    ),
    dokumenty: [
      { id: 'd-tp08-1', nazev: 'Smlouva-Hyundai-Leasing-2025-10.pdf', typ: 'Smlouva',           velikostKb: 412, uploadedAt: '2025-10-15T09:00:00', uploadedBy: 'Petr Dohnal' },
      { id: 'd-tp08-2', nazev: 'Splatkovy-kalendar.xlsx',             typ: 'Splátkový kalendář', velikostKb: 78,  uploadedAt: '2025-10-15T09:05:00', uploadedBy: 'Petr Dohnal' },
    ],
  },
  {
    id: 'tp09',
    nazev: 'ŠkoFIN — Octavia Piazza',
    ucetId: 'ua-piazza',
    protistrana: 'ŠkoFIN s.r.o.',
    protiUcet: '78901234/2010',
    typ: 'leasing',
    perioda: 'mesicni',
    castka: 12_500,
    vs: '20260101',
    ks: '1148',
    zacatek: '2025-01-01',
    konec: '2028-12-31',
    pristiSplatnost: '2026-06-05',
    stav: 'aktivni',
    splatky: generateLeasingSplatky('2025-01-01', 12, 12_500, '202601'),
  },

  // Pozastavený
  {
    id: 'tp10',
    nazev: 'Allianz — pojistka kavárna (pozastaveno)',
    ucetId: 'ua-u-capa',
    protistrana: 'Allianz pojišťovna',
    protiUcet: '11223344/0100',
    typ: 'standard',
    perioda: 'rocni',
    castka: 18_500,
    vs: '20260701',
    zacatek: '2022-07-01',
    pristiSplatnost: '2026-07-01',
    stav: 'pozastaveny',
    poznamka: 'Pozastaveno — řeší se přechod na jinou pojišťovnu.',
  },
];

// ─────────────────────────────────────────────────────────────
// META
// ─────────────────────────────────────────────────────────────

export const PERIODA_LABEL: Record<TrvalyPrikazPerioda, string> = {
  tydenni:     'Týdenní',
  mesicni:     'Měsíční',
  kvartalni:   'Kvartální',
  pololetni:   'Pololetní',
  rocni:       'Roční',
  jednorazovy: 'Jednorázový',
};

export const TYP_META_TP: Record<TrvalyPrikazTyp, { label: string; color: string; icon: string; bg: string }> = {
  standard: { label: 'Standardní', color: '#0d6efd', icon: 'solar:refresh-circle-bold-duotone', bg: '#e8f0ff' },
  leasing:  { label: 'Leasing',    color: '#fd7e14', icon: 'solar:wallet-2-bold-duotone',       bg: '#ffedd5' },
  zaloha:   { label: 'Záloha',     color: '#198754', icon: 'solar:hand-money-bold-duotone',     bg: '#d1f0db' },
};

export const STAV_META_TP: Record<TrvalyPrikazStav, { label: string; cls: string; icon: string }> = {
  aktivni:     { label: 'Aktivní',     cls: 'bg-success-subtle text-success',     icon: 'solar:play-circle-bold-duotone' },
  pozastaveny: { label: 'Pozastaveno', cls: 'bg-warning-subtle text-warning',     icon: 'solar:pause-circle-bold-duotone' },
  ukonceny:    { label: 'Ukončeno',    cls: 'bg-secondary-subtle text-secondary', icon: 'solar:stop-circle-bold-duotone' },
};

export const SPLATKA_STAV_META: Record<TrvalySplatkaItem['stav'], { label: string; cls: string; icon: string }> = {
  planovana:       { label: 'Plánovaná',     cls: 'bg-light text-muted border',       icon: 'solar:calendar-bold-duotone' },
  odeslana:        { label: 'Odeslaná',      cls: 'bg-info-subtle text-info',         icon: 'solar:upload-bold-duotone' },
  zaplacena:       { label: 'Zaplacená',     cls: 'bg-success-subtle text-success',   icon: 'solar:check-circle-bold-duotone' },
  'po-splatnosti': { label: 'Po splatnosti', cls: 'bg-danger-subtle text-danger',     icon: 'solar:danger-triangle-bold-duotone' },
};

/** Měsíční zátěž za všechny aktivní příkazy (CZK only, normalizace per perioda). */
export function getMesicniZatez(): number {
  const FACTOR: Record<TrvalyPrikazPerioda, number> = {
    tydenni: 4, mesicni: 1, kvartalni: 1 / 3, pololetni: 1 / 6, rocni: 1 / 12, jednorazovy: 0,
  };
  return TRVALE_PRIKAZY
    .filter((p) => p.stav === 'aktivni')
    .reduce((sum, p) => sum + p.castka * FACTOR[p.perioda], 0);
}

/** Vrací true, pokud má příkaz alespoň jednu splátku po splatnosti. */
export function maNezaplacenouSplatku(p: TrvalyPrikaz): boolean {
  return !!p.splatky?.some((s) => s.stav === 'po-splatnosti');
}

/** Počet splátek po splatnosti napříč všemi příkazy. */
export function getPocetNezaplacenychSplatek(data: TrvalyPrikaz[]): number {
  return data.reduce((sum, p) => sum + (p.splatky?.filter((s) => s.stav === 'po-splatnosti').length ?? 0), 0);
}
