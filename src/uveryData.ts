// MOCK DATA: úvěry (Phase 4 — sekce Finance → Úvěry)
// Per zápis 4. 6. 2026:
//  - Samostatná evidence úvěrů, rozlišující jistinu a úrok
//  - Auto-párování splátek podle čísla účtu + předpisu splátky
//  - U úvěrů s variabilní sazbou (PRIBOR) nelze dopředu znát přesný rozpad —
//    úrok se počítá až po úplném spárování splátky v daném měsíci
//  - Nestandardní situace (částečné úhrady) → manuální kontrola
//  - Funkce předčasné splacení

export type UverTyp =
  | 'hypoteka'           // hypotéční úvěr
  | 'investicni'         // investiční úvěr (zařízení, vůz, technologie)
  | 'provozni'           // provozní úvěr / kontokorent
  | 'leasing-finanční';  // finanční leasing s rozpadem

export type UverSazbaTyp = 'fix' | 'pribor';   // fix sazba vs. PRIBOR + marže
export type UverStav     = 'aktivni' | 'splacen' | 'predcasne-splacen' | 'pozastaven';

export interface UverSplatkaItem {
  id: string;
  cisloSplatky: number;
  datum: string;                 // YYYY-MM-DD
  // Rozpad — pro fix vždy známé předem, pro PRIBOR predikované (final = po spárování v měsíci)
  jistina: number;               // částka splacené jistiny
  urok: number;                  // částka úroku
  celkem: number;                // jistina + urok (default — uživatel může přepsat)
  zustatekJistinyPo: number;     // zůstatek úvěru po této splátce
  vs: string;
  stav: 'planovana' | 'odeslana' | 'zaplacena' | 'po-splatnosti' | 'castecne-uhrazena';
  zaplaceno?: number;            // pokud částečně uhrazena — kolik přišlo
  parovanaSId?: string;          // bank transakce
  manualReview?: boolean;        // vyžaduje manuální kontrolu (nestandardní)
  poznamka?: string;
}

export interface Uver {
  id: string;
  nazev: string;                 // „Hypotéka provozovna Brno", „Provozní úvěr 2025"
  banka: string;                 // poskytovatel
  cisloSmlouvy: string;
  vs?: string;                   // základ variabilního symbolu pro splátky
  vsVariabilni?: boolean;        // VS se mění u každé splátky (true) / stejný pro všechny (false)
  typ: UverTyp;
  // Z účtu, kam přicházejí splátky/odkud odchází
  ucetId: string;                // BANKA_UCTY id
  protiUcet: string;
  // Finance
  jistinaPocatecni: number;      // původní výše úvěru
  jistinaZbytek: number;         // aktuální zůstatek (klesá s každou splátkou jistiny)
  sazbaTyp: UverSazbaTyp;
  sazbaPct: number;              // pro 'fix' = absolutní; pro 'pribor' = marže (PRIBOR + X %)
  priborPct?: number;            // aktuální PRIBOR (jen u 'pribor'), kvůli zobrazení
  pocetSplatekCelkem: number;
  splatkyDosud: number;          // kolik už proběhlo
  splatkaMesicni: number;        // typická měsíční splátka (pro fix), u PRIBOR orientační
  zacatek: string;               // YYYY-MM-DD
  konec: string;                 // YYYY-MM-DD
  pristiSplatnost: string;
  stav: UverStav;
  // Phase 7 (zápis 12. 6. 2026) — komu úvěr patří (provoz / právní entita)
  provozovnaId?: string;         // konkrétní provozovna (nebo undefined = celofiremní)
  poznamka?: string;
  // Splátkový kalendář (předpis)
  splatky: UverSplatkaItem[];
  // Dokumenty (smlouva, splátkový kalendář od banky)
  dokumenty?: Array<{
    id: string;
    nazev: string;
    typ: string;
    velikostKb: number;
    uploadedAt: string;
    uploadedBy: string;
  }>;
}

// ─────────────────────────────────────────────────────────────
// Helper — generování splátkového kalendáře s rozpadem jistina/úrok
// ─────────────────────────────────────────────────────────────

/**
 * Anuitní splátka: konstantní celková splátka, klesající úrok, rostoucí jistina.
 * sazbaPct = roční úroková sazba v %
 */
function calcAnuita(jistina: number, sazbaPct: number, mesicu: number): number {
  const r = (sazbaPct / 100) / 12;
  if (r === 0) return jistina / mesicu;
  return jistina * (r * Math.pow(1 + r, mesicu)) / (Math.pow(1 + r, mesicu) - 1);
}

function generateUverSplatky(
  jistinaCelkem: number,
  sazbaPct: number,
  pocetSplatek: number,
  zacatekDate: string,
  vsPrefix: string,
  today = '2026-06-09',
  pribor = false,   // PRIBOR = „obrácený" kalendář: jistina rovnoměrně, úrok jen u uhrazených (z úhrady)
): UverSplatkaItem[] {
  const anuita = Math.round(calcAnuita(jistinaCelkem, sazbaPct, pocetSplatek));
  const r = (sazbaPct / 100) / 12;
  const jistinaLin = Math.round(jistinaCelkem / pocetSplatek);   // rovnoměrná jistina (PRIBOR)
  let zbytek = jistinaCelkem;
  const items: UverSplatkaItem[] = [];
  const [y, m, d] = zacatekDate.split('-').map(Number);
  for (let i = 0; i < pocetSplatek; i++) {
    const date = new Date(y, m - 1 + i, d);
    const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    let stav: UverSplatkaItem['stav'];
    if (ds < today)      stav = 'zaplacena';
    else if (ds === today) stav = 'odeslana';
    else                 stav = 'planovana';
    const zbytekPred = zbytek;
    let jistina: number;
    let urok: number;
    if (pribor) {
      // Jistina rovnoměrně; úrok se doplní až z úhrady → jen u už zaplacených (jinak prázdný)
      jistina = Math.min(jistinaLin, zbytek);
      if (stav === 'zaplacena') {
        const effR = ((sazbaPct + ((i % 5) - 2) * 0.15) / 100) / 12;   // mírná variabilita PRIBOR v čase
        urok = Math.round(zbytekPred * effR);
      } else {
        urok = 0;   // dopředu neznámý
      }
    } else {
      // Fix = anuita (jistina roste, úrok klesá)
      urok = Math.round(zbytekPred * r);
      jistina = Math.min(anuita - urok, zbytek);
    }
    zbytek = Math.max(0, zbytek - jistina);
    const vs = `${vsPrefix}${String(i + 1).padStart(3, '0')}`;
    items.push({
      id: `us-${vs}`,
      cisloSplatky: i + 1,
      datum: ds,
      jistina,
      urok,
      celkem: jistina + urok,
      zustatekJistinyPo: zbytek,
      vs,
      stav,
    });
  }
  return items;
}

// ─────────────────────────────────────────────────────────────
// MOCK DATA — 3 úvěry: hypotéka (PRIBOR), provozní (fix), investiční (PRIBOR)
// ─────────────────────────────────────────────────────────────

export const UVERY: Uver[] = [
  // Hypotéka — variabilní PRIBOR + marže
  (() => {
    const splatky = generateUverSplatky(8_500_000, 5.8, 240, '2024-01-15', '20240101', '2026-06-09', true);
    const dosud = splatky.filter((s) => s.stav === 'zaplacena').length;
    const zbytek = splatky[dosud - 1]?.zustatekJistinyPo ?? 8_500_000;
    return {
      id: 'uv01',
      nazev: 'Hypotéka — provozovna CG Brno',
      provozovnaId: 'cg-brno',
      banka: 'Komerční banka',
      cisloSmlouvy: 'HU-2024-01-15-CG-BRNO',
      typ: 'hypoteka' as UverTyp,
      ucetId: 'ua-cg-brno',
      protiUcet: '99887766/0100',
      jistinaPocatecni: 8_500_000,
      jistinaZbytek: zbytek,
      sazbaTyp: 'pribor' as UverSazbaTyp,
      sazbaPct: 2.5,       // marže nad PRIBOR
      priborPct: 3.3,      // aktuální 3M PRIBOR (mock)
      pocetSplatekCelkem: 240,
      splatkyDosud: dosud,
      splatkaMesicni: 60_300,
      zacatek: '2024-01-15',
      konec: '2043-12-15',
      pristiSplatnost: '2026-07-15',
      stav: 'aktivni',
      poznamka: 'Sazba: 3M PRIBOR + 2.5 %. Splátka se mění s každou změnou PRIBOR.',
      splatky,
      dokumenty: [
        { id: 'd-uv01-1', nazev: 'Smlouva-hypoteka-KB-2024.pdf', typ: 'Smlouva',  velikostKb: 1_240, uploadedAt: '2024-01-15T10:00:00', uploadedBy: 'Petr Dohnal' },
        { id: 'd-uv01-2', nazev: 'Splatkovy-kalendar-2024.xlsx', typ: 'Splátkový kalendář', velikostKb: 95,  uploadedAt: '2024-01-15T10:05:00', uploadedBy: 'Petr Dohnal' },
      ],
    };
  })(),

  // Provozní úvěr — fix sazba
  (() => {
    const splatky = generateUverSplatky(800_000, 7.2, 36, '2025-04-01', '20250401');
    const dosud = splatky.filter((s) => s.stav === 'zaplacena').length;
    const zbytek = splatky[dosud - 1]?.zustatekJistinyPo ?? 800_000;
    return {
      id: 'uv02',
      nazev: 'Provozní úvěr — Piazza 2025',
      provozovnaId: 'piazza',
      banka: 'ČSOB',
      cisloSmlouvy: 'PU-2025-04-PIAZZA',
      typ: 'provozni' as UverTyp,
      ucetId: 'ua-piazza',
      protiUcet: '54321987/0300',
      jistinaPocatecni: 800_000,
      jistinaZbytek: zbytek,
      sazbaTyp: 'fix' as UverSazbaTyp,
      sazbaPct: 7.2,
      pocetSplatekCelkem: 36,
      splatkyDosud: dosud,
      splatkaMesicni: 24_700,
      zacatek: '2025-04-01',
      konec: '2028-03-01',
      pristiSplatnost: '2026-07-01',
      stav: 'aktivni',
      splatky,
    };
  })(),

  // Investiční úvěr — PRIBOR — má jednu splátku s manuální kontrolou (částečná úhrada)
  (() => {
    const splatky = generateUverSplatky(1_500_000, 6.8, 60, '2025-09-15', '20250915', '2026-06-09', true);
    const dosud = splatky.filter((s) => s.stav === 'zaplacena').length;
    // Splátka #7 — částečně uhrazena
    if (splatky[6]) {
      splatky[6] = {
        ...splatky[6],
        stav: 'castecne-uhrazena',
        zaplaceno: Math.round(splatky[6].celkem * 0.6),
        manualReview: true,
        poznamka: 'Přišla jen 60 % částky — chybí potvrzení banky.',
      };
    }
    const zbytek = splatky[dosud - 1]?.zustatekJistinyPo ?? 1_500_000;
    return {
      id: 'uv03',
      nazev: 'Investiční úvěr — kuchyně Monte',
      provozovnaId: 'monte',
      banka: 'Raiffeisen Bank',
      cisloSmlouvy: 'IU-2025-09-MONTE',
      typ: 'investicni' as UverTyp,
      ucetId: 'ua-monte',
      protiUcet: '11223399/5500',
      jistinaPocatecni: 1_500_000,
      jistinaZbytek: zbytek,
      sazbaTyp: 'pribor' as UverSazbaTyp,
      sazbaPct: 3.5,
      priborPct: 3.3,
      pocetSplatekCelkem: 60,
      splatkyDosud: dosud,
      splatkaMesicni: 29_600,
      zacatek: '2025-09-15',
      konec: '2030-08-15',
      pristiSplatnost: '2026-07-15',
      stav: 'aktivni',
      splatky,
    };
  })(),
];

// ─────────────────────────────────────────────────────────────
// META
// ─────────────────────────────────────────────────────────────

export const UVER_TYP_META: Record<UverTyp, { label: string; color: string; icon: string; bg: string }> = {
  hypoteka:           { label: 'Hypotéka',         color: '#0d6efd', icon: 'solar:home-bold-duotone',         bg: '#e8f0ff' },
  investicni:         { label: 'Investiční úvěr', color: '#fd7e14', icon: 'solar:graph-up-bold-duotone',     bg: '#ffedd5' },
  provozni:           { label: 'Provozní úvěr',   color: '#198754', icon: 'solar:hand-money-bold-duotone',   bg: '#d1f0db' },
  'leasing-finanční': { label: 'Finanční leasing',color: '#6f42c1', icon: 'solar:wallet-2-bold-duotone',     bg: '#f3eaff' },
};

export const UVER_STAV_META: Record<UverStav, { label: string; cls: string; icon: string }> = {
  aktivni:              { label: 'Aktivní',            cls: 'bg-success-subtle text-success',     icon: 'solar:play-circle-bold-duotone' },
  splacen:              { label: 'Splacený',           cls: 'bg-secondary-subtle text-secondary', icon: 'solar:check-circle-bold-duotone' },
  'predcasne-splacen':  { label: 'Předčasně splacen',  cls: 'bg-info-subtle text-info',           icon: 'solar:medal-star-bold-duotone' },
  pozastaven:           { label: 'Pozastaven',         cls: 'bg-warning-subtle text-warning',     icon: 'solar:pause-circle-bold-duotone' },
};

export const UVER_SPLATKA_STAV_META: Record<UverSplatkaItem['stav'], { label: string; cls: string; icon: string }> = {
  planovana:          { label: 'Plánovaná',       cls: 'bg-light text-muted border',       icon: 'solar:calendar-bold-duotone' },
  odeslana:           { label: 'Odeslaná',        cls: 'bg-info-subtle text-info',         icon: 'solar:upload-bold-duotone' },
  zaplacena:          { label: 'Zaplacená',       cls: 'bg-success-subtle text-success',   icon: 'solar:check-circle-bold-duotone' },
  'po-splatnosti':    { label: 'Po splatnosti',   cls: 'bg-danger-subtle text-danger',     icon: 'solar:danger-triangle-bold-duotone' },
  'castecne-uhrazena':{ label: 'Částečně',        cls: 'bg-warning-subtle text-warning',   icon: 'solar:alt-arrow-down-bold-duotone' },
};

// Sumarní helpery
export function getUverCelkovyDluh(uver: Uver): number {
  return uver.jistinaZbytek;
}
export function getCelkovyDluhVse(): number {
  return UVERY.filter((u) => u.stav === 'aktivni').reduce((s, u) => s + u.jistinaZbytek, 0);
}
export function getMesicniSplatkaVse(): number {
  return UVERY.filter((u) => u.stav === 'aktivni').reduce((s, u) => s + u.splatkaMesicni, 0);
}
export function maNestandardniSplatku(u: Uver): boolean {
  return u.splatky.some((s) => s.manualReview || s.stav === 'po-splatnosti' || s.stav === 'castecne-uhrazena');
}

/** Dopočítané roční % úroku dané splátky (jen když je úrok znám z úhrady); jinak null. */
export function urokPct(s: UverSplatkaItem): number | null {
  if (!s.urok || s.urok <= 0) return null;
  const zbytekPred = s.zustatekJistinyPo + s.jistina;   // zůstatek jistiny před splátkou
  if (zbytekPred <= 0) return null;
  return (s.urok / zbytekPred) * 12 * 100;
}

/** Průměrná úroková sazba úvěru z uhrazených splátek (jen ty se známým úrokem). */
export function prumernaSazba(u: Uver): number | null {
  const rates = u.splatky.map(urokPct).filter((r): r is number => r !== null);
  if (rates.length === 0) return null;
  return rates.reduce((s, r) => s + r, 0) / rates.length;
}
