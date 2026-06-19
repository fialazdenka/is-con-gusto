// MOCK DATA: bankovní poplatky (Phase 5 — sekce Finance → Poplatky)
// Per zápis 4. 6. 2026:
//  - Automaticky identifikované podle typu transakce
//  - Evidovány v samostatné sekci „Poplatky" jako celofiremní náklad
//  - Cílový pohled: souhrn za měsíc + breakdown po typech

export type PoplatekTyp =
  | 'vedeni-uctu'        // měsíční poplatek za vedení účtu
  | 'transakce'          // poplatek za odchozí platbu (zahraniční, mimo banku)
  | 'karta'              // poplatek za kartu (vedení, akceptace)
  | 'vyber'              // výběr z bankomatu
  | 'vklady'             // vklad na pobočce
  | 'urok-debet'         // úrok z debetu / kontokorent
  | 'sluzby'             // SMS info, mobilní bankovnictví, prémiový balíček
  | 'sankce'             // sankční poplatek (nedostatek, nečitelný příkaz)
  | 'jine';

export interface Poplatek {
  id: string;
  datum: string;                 // YYYY-MM-DD
  ucetId: string;                // BANKA_UCTY id (z kterého účtu byl poplatek odebrán)
  banka: string;                 // poskytovatel (pro filtraci)
  typ: PoplatekTyp;
  popis: string;                 // např. „Vedení účtu duben 2026"
  castka: number;                // vždy kladná částka (poplatek = náklad)
  parovanaSBankaTrans?: string;  // ID transakce v Bance — pro auditing
  auto: boolean;                 // true = auto-detekován z bank. transakce
  // Phase 7 (zápis 12. 6. 2026) — nepovinné přiřazení provozovně.
  // Pokud chybí → poplatek spadá globálně pod celé Con Gusto (celofiremní náklad).
  provozovnaId?: string;
  poznamka?: string;
}

export const POPLATKY_TYP_META: Record<PoplatekTyp, { label: string; color: string; bg: string; icon: string }> = {
  'vedeni-uctu':  { label: 'Vedení účtu',       color: '#0d6efd', bg: '#e8f0ff', icon: 'solar:wallet-bold-duotone' },
  'transakce':    { label: 'Transakce',         color: '#6c757d', bg: '#f1f3f5', icon: 'solar:card-transfer-bold-duotone' },
  'karta':        { label: 'Karta',             color: '#198754', bg: '#d1f0db', icon: 'solar:card-bold-duotone' },
  'vyber':        { label: 'Výběr z bankomatu', color: '#fd7e14', bg: '#ffedd5', icon: 'solar:atom-bold-duotone' },
  'vklady':       { label: 'Vklad na pobočce',  color: '#0dcaf0', bg: '#e8f7ff', icon: 'solar:hand-money-bold-duotone' },
  'urok-debet':   { label: 'Úrok z debetu',     color: '#dc3545', bg: '#f8d7da', icon: 'solar:graph-down-bold-duotone' },
  'sluzby':       { label: 'Doplňkové služby',  color: '#6f42c1', bg: '#f3eaff', icon: 'solar:bell-bing-bold-duotone' },
  'sankce':       { label: 'Sankční poplatek',  color: '#dc3545', bg: '#f8d7da', icon: 'solar:danger-triangle-bold-duotone' },
  'jine':         { label: 'Jiné',              color: '#9097a7', bg: '#f1f3f5', icon: 'solar:question-circle-bold-duotone' },
};

// ─────────────────────────────────────────────────────────────
// MOCK DATA — ~40 záznamů napříč 6 měsíci (2026-01 až 2026-06)
// ─────────────────────────────────────────────────────────────

// Helper pro generování záznamu
let _id = 1;
const m = (datum: string, ucetId: string, banka: string, typ: PoplatekTyp, popis: string, castka: number, auto = true): Poplatek => ({
  id: `pp${String(_id++).padStart(3, '0')}`,
  datum, ucetId, banka, typ, popis, castka, auto,
});

export const POPLATKY: Poplatek[] = [
  // ── Vedení účtu (měsíční) ──
  m('2026-06-01', 'ua-hlavni',       'Komerční banka',  'vedeni-uctu', 'Vedení Hlavního účtu — červen 2026',         320),
  m('2026-06-01', 'ua-piazza',       'Komerční banka',  'vedeni-uctu', 'Vedení účtu Piazza CZK — červen 2026',       180),
  m('2026-06-01', 'ua-piazza-eur',   'Raiffeisen Bank', 'vedeni-uctu', 'Vedení EUR účtu Piazza — červen 2026',        9.50),
  m('2026-06-01', 'ua-cg-marketing', 'Komerční banka',  'vedeni-uctu', 'Vedení účtu Marketing — červen 2026',         180),
  m('2026-05-02', 'ua-hlavni',       'Komerční banka',  'vedeni-uctu', 'Vedení Hlavního účtu — květen 2026',         320),
  m('2026-05-02', 'ua-piazza',       'Komerční banka',  'vedeni-uctu', 'Vedení účtu Piazza CZK — květen 2026',       180),
  m('2026-05-02', 'ua-monte',        'ČSOB',            'vedeni-uctu', 'Vedení účtu Monte — květen 2026',             250),
  m('2026-04-01', 'ua-hlavni',       'Komerční banka',  'vedeni-uctu', 'Vedení Hlavního účtu — duben 2026',          320),
  m('2026-04-01', 'ua-piazza',       'Komerční banka',  'vedeni-uctu', 'Vedení účtu Piazza CZK — duben 2026',        180),

  // ── Transakce ──
  m('2026-06-08', 'ua-piazza',       'Komerční banka',  'transakce',   'Zahraniční platba — Italian Wines',           120),
  m('2026-06-05', 'ua-hlavni',       'Komerční banka',  'transakce',   'Mimobankovní platba — Hyundai Leasing',         8),
  m('2026-05-15', 'ua-piazza-eur',   'Raiffeisen Bank', 'transakce',   'SEPA platba — dodavatel víno',                  15.00),
  m('2026-05-10', 'ua-cg-brno',      'Komerční banka',  'transakce',   'Mimobankovní platba — E.ON',                    8),
  m('2026-04-20', 'ua-piazza',       'Komerční banka',  'transakce',   'Zahraniční platba — Italian Wines',           120),
  m('2026-04-15', 'ua-u-capa',       'Komerční banka',  'transakce',   'Mimobankovní platba — Sodexo',                  8),

  // ── Karty ──
  m('2026-06-01', 'ua-hlavni',       'Komerční banka',  'karta',       'Vedení karty — Petr Dohnal',                   200),
  m('2026-06-01', 'ua-hlavni',       'Komerční banka',  'karta',       'Vedení karty — Jana Kovářová',                 200),
  m('2026-05-01', 'ua-hlavni',       'Komerční banka',  'karta',       'Vedení karty — Petr Dohnal',                   200),
  m('2026-05-01', 'ua-hlavni',       'Komerční banka',  'karta',       'Vedení karty — Jana Kovářová',                 200),
  m('2026-04-01', 'ua-hlavni',       'Komerční banka',  'karta',       'Vedení karty — Petr Dohnal',                   200),

  // ── Výběr z bankomatu ──
  m('2026-06-07', 'ua-cg-brno',      'Komerční banka',  'vyber',       'Výběr bankomat — cizí síť (Air Bank)',          40),
  m('2026-05-22', 'ua-monte',        'ČSOB',            'vyber',       'Výběr bankomat — cizí síť',                     50),
  m('2026-04-18', 'ua-cg-brno',      'Komerční banka',  'vyber',       'Výběr bankomat — cizí síť (Fio)',               40),

  // ── Úrok z debetu ──
  m('2026-05-03', 'ua-cg-brno',      'Komerční banka',  'urok-debet',  'Úrok z debetu — duben 2026',                   450),
  m('2026-03-04', 'ua-u-capa',       'Komerční banka',  'urok-debet',  'Úrok z debetu — únor 2026',                    280),

  // ── Doplňkové služby ──
  m('2026-06-01', 'ua-hlavni',       'Komerční banka',  'sluzby',      'SMS notifikace — Hlavní účet',                  29),
  m('2026-06-01', 'ua-piazza',       'Komerční banka',  'sluzby',      'Premium balíček — Piazza',                     590),
  m('2026-05-01', 'ua-hlavni',       'Komerční banka',  'sluzby',      'SMS notifikace — Hlavní účet',                  29),
  m('2026-05-01', 'ua-piazza',       'Komerční banka',  'sluzby',      'Premium balíček — Piazza',                     590),
  m('2026-04-01', 'ua-hlavni',       'Komerční banka',  'sluzby',      'SMS notifikace — Hlavní účet',                  29),

  // ── Sankce ──
  m('2026-05-12', 'ua-u-capa',       'Komerční banka',  'sankce',      'Nedostatek prostředků — Sodexo platba',        180),
  m('2026-03-08', 'ua-cg-brno',      'Komerční banka',  'sankce',      'Nečitelný platební příkaz — vrácen',           220),

  // ── Starší měsíce — zkráceně ──
  m('2026-03-01', 'ua-hlavni',       'Komerční banka',  'vedeni-uctu', 'Vedení Hlavního účtu — březen 2026',           320),
  m('2026-03-01', 'ua-piazza',       'Komerční banka',  'vedeni-uctu', 'Vedení účtu Piazza CZK — březen 2026',         180),
  m('2026-02-02', 'ua-hlavni',       'Komerční banka',  'vedeni-uctu', 'Vedení Hlavního účtu — únor 2026',             320),
  m('2026-02-02', 'ua-piazza',       'Komerční banka',  'vedeni-uctu', 'Vedení účtu Piazza CZK — únor 2026',           180),
  m('2026-01-05', 'ua-hlavni',       'Komerční banka',  'vedeni-uctu', 'Vedení Hlavního účtu — leden 2026',            320),
  m('2026-01-05', 'ua-piazza',       'Komerční banka',  'vedeni-uctu', 'Vedení účtu Piazza CZK — leden 2026',          180),
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

export interface MesicniSouhrn {
  mesic: string;          // "2026-06"
  label: string;          // "Červen 2026"
  celkem: number;
  podleTypu: Record<PoplatekTyp, number>;
  pocet: number;
}

const MESIC_LABEL = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];

export function getMesicniSouhrn(data: Poplatek[]): MesicniSouhrn[] {
  const map = new Map<string, MesicniSouhrn>();
  for (const p of data) {
    const mes = p.datum.slice(0, 7);
    let bucket = map.get(mes);
    if (!bucket) {
      const [y, m] = mes.split('-').map(Number);
      bucket = {
        mesic: mes,
        label: `${MESIC_LABEL[m - 1]} ${y}`,
        celkem: 0,
        podleTypu: {} as Record<PoplatekTyp, number>,
        pocet: 0,
      };
      map.set(mes, bucket);
    }
    bucket.celkem += p.castka;
    bucket.pocet++;
    bucket.podleTypu[p.typ] = (bucket.podleTypu[p.typ] ?? 0) + p.castka;
  }
  return Array.from(map.values()).sort((a, b) => b.mesic.localeCompare(a.mesic));
}

export function getSumaZaObdobi(data: Poplatek[], odMesic?: string, doMesic?: string): number {
  return data
    .filter((p) => {
      const mes = p.datum.slice(0, 7);
      if (odMesic && mes < odMesic) return false;
      if (doMesic && mes > doMesic) return false;
      return true;
    })
    .reduce((s, p) => s + p.castka, 0);
}

export function getBreakdownPoTypech(data: Poplatek[]): Array<{ typ: PoplatekTyp; castka: number; pocet: number; pct: number }> {
  const sumaTotal = data.reduce((s, p) => s + p.castka, 0);
  const map = new Map<PoplatekTyp, { castka: number; pocet: number }>();
  for (const p of data) {
    const e = map.get(p.typ) ?? { castka: 0, pocet: 0 };
    e.castka += p.castka;
    e.pocet++;
    map.set(p.typ, e);
  }
  return Array.from(map.entries())
    .map(([typ, { castka, pocet }]) => ({ typ, castka, pocet, pct: sumaTotal > 0 ? (castka / sumaTotal) * 100 : 0 }))
    .sort((a, b) => b.castka - a.castka);
}
