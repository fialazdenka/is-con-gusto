// MOCK DATA: platební platformy (Qerko / GoPay / Sodexo) — Phase 6
// Per zápis 4. 6. 2026:
//  - Modul „platební karty" hlídá příchod plateb a poplatky
//  - Qerko a GoPay evidovány odděleně (každá vlastní sekce v sidebaru)
//  - Porovnávat denní tržby s příchozími platbami (D+1 zpoždění)
//  - Měsíční faktura od poskytovatele → kontrola vůči denním záznamům
//  - Sodexo bez API → manuální import

export type PlatformaId = 'qerko' | 'gopay' | 'sodexo' | 'terminal';

// Denní záznam párování: tržba (z POS) vs. příchozí platba D+1
// Per zápis 4. 6. 2026 — rozdělení po provozovnách kvůli sladění s cashflow
export interface DenniParovani {
  id: string;                    // unikátní (datum + provozovna)
  datum: string;                 // YYYY-MM-DD (datum prodeje na POS)
  provozovnaId?: string;         // ID provozovny — pokud chybí, je nutné ručně přiřadit
  trzbaPos: number;              // co řekl POS
  prislo: number | null;         // co přišlo na účet (D+1)
  rozdil: number;                // prislo - trzbaPos (záporný = méně než POS)
  poplatekOdhad: number;         // náš odhad poplatku
  stav: 'sparovane' | 'ceka-na-D1' | 'rozdil' | 'neprislo';
  poznamka?: string;
  parovanaSBankaTrans?: string;  // ID transakce v Bance
}

// Měsíční faktura od poskytovatele (s rozpadem poplatků)
export interface MesicniFakturaPlatformy {
  id: string;
  mesic: string;                 // YYYY-MM
  vydanaDatum: string;
  splatnost: string;
  prijmuCelkem: number;          // hrubá tržba prošlá platformou
  poplatekFakturovany: number;   // co fakturuje poskytovatel
  poplatekOdhadnuty: number;     // co jsme si denně počítali
  rozdil: number;                // odhad − fakturovany
  stav: 'ceka' | 'sedi' | 'rozdil' | 'reseno';
  poznamka?: string;
}

// Konfigurace platformy
export interface PlatformaConfig {
  id: PlatformaId;
  nazev: string;
  popis: string;
  icon: string;
  color: string;
  bg: string;
  apiDostupne: boolean;          // false = manuální import (Sodexo)
  poplatekPctOdhad: number;      // % poplatek pro odhad
  parovaniZpozdeniDni: number;   // D+1 typicky 1
  ucetCilovy: string;            // BANKA_UCTY id kam platby chodí
  // Pro UI
  ciselnyKod: string;            // např. Qerko ID
  podporovaneMetody: string[];   // ["Apple Pay", "Google Pay", ...]
  // Provozovny, které tuto platformu používají (per zápis — rozdělení by venue)
  provozovny: string[];          // BANKA_UCTY ids nebo PROVOZOVNY ids
}

// ─────────────────────────────────────────────────────────────
// PLATFORMS — config
// ─────────────────────────────────────────────────────────────

export const PLATFORMS: Record<PlatformaId, PlatformaConfig> = {
  qerko: {
    id: 'qerko',
    nazev: 'Qerko',
    popis: 'Mobilní QR platby — zákazník naskenuje kód u stolu, zaplatí v aplikaci. Platby přicházejí D+1 sumárně.',
    icon: 'solar:qr-code-bold-duotone',
    color: '#0d6efd',
    bg: '#e8f0ff',
    apiDostupne: true,
    poplatekPctOdhad: 2.5,
    parovaniZpozdeniDni: 1,
    ucetCilovy: 'ua-hlavni',
    ciselnyKod: 'QER-CG-001',
    podporovaneMetody: ['Apple Pay', 'Google Pay', 'Platební karta'],
    // Restaurace s QR platbami u stolu
    provozovny: ['cg-brno', 'piazza', 'monte', 'u-capa', 'u-kohoutu', 'nad-hladinkou', 'jime-brno'],
  },
  gopay: {
    id: 'gopay',
    nazev: 'GoPay',
    popis: 'Online platební brána pro e-shop, rezervace, dárkové vouchery. Platby D+1 sumárně.',
    icon: 'solar:card-2-bold-duotone',
    color: '#198754',
    bg: '#d1f0db',
    apiDostupne: true,
    poplatekPctOdhad: 1.8,
    parovaniZpozdeniDni: 1,
    ucetCilovy: 'ua-cg-marketing',
    ciselnyKod: 'GP-2024-CG',
    podporovaneMetody: ['Platební karta', 'Bankovní převod', 'Apple Pay', 'Google Pay', 'Bitcoin'],
    // E-shop / rezervace / catering — méně provoz, ale větší objem na transakci
    provozovny: ['cg-brno', 'piazza', 'cg-catering', 'monte'],
  },
  sodexo: {
    id: 'sodexo',
    nazev: 'Sodexo',
    popis: 'Stravenkový systém (papírové + digitální poukázky). Platby přicházejí 1× měsíčně po předložení. Bez API — manuální import.',
    icon: 'solar:ticket-bold-duotone',
    color: '#fd7e14',
    bg: '#ffedd5',
    apiDostupne: false,
    poplatekPctOdhad: 4.5,
    parovaniZpozdeniDni: 30,
    ucetCilovy: 'ua-hlavni',
    ciselnyKod: 'SOD-CG-2024',
    podporovaneMetody: ['Papírové stravenky', 'Sodexo Card', 'Sodexo mobil app'],
    // Restaurace s denními menu pro zaměstnance okolních firem
    provozovny: ['cg-brno', 'piazza', 'monte', 'u-capa', 'jime-brno'],
  },
  terminal: {
    id: 'terminal',
    nazev: 'Platební karty (terminál)',
    popis: 'Klasický bankovní terminál pro Visa/Mastercard/AmEx (acquiring přes Comgate). Settlement D+2 sumárně, fakturovaný měsíční rozpad.',
    icon: 'solar:card-bold-duotone',
    color: '#6f42c1',
    bg: '#f3eaff',
    apiDostupne: true,
    poplatekPctOdhad: 1.2,
    parovaniZpozdeniDni: 2,
    ucetCilovy: 'ua-hlavni',
    ciselnyKod: 'CG-TERM-2024',
    podporovaneMetody: ['Visa', 'Mastercard', 'American Express', 'Maestro', 'Bezkontaktně'],
    // Většina restaurací má fyzický terminál
    provozovny: ['cg-brno', 'piazza', 'monte', 'u-capa', 'u-kohoutu', 'korek-winebar', 'nad-hladinkou', 'teatr', 'jime-brno'],
  },
};

// ─────────────────────────────────────────────────────────────
// MOCK DATA — denní párování (posledních ~30 dní pro každou platformu)
// ─────────────────────────────────────────────────────────────

// Helper na generování denních záznamů — per den per provozovnu
function generateDailyParovani(platforma: PlatformaConfig, baseAmountPerVenue: number, daysBack: number, today = '2026-06-09'): DenniParovani[] {
  const items: DenniParovani[] = [];
  const [y, m, d] = today.split('-').map(Number);
  for (let i = daysBack; i >= 1; i--) {
    const date = new Date(y, m - 1, d - i);
    const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    // Víkend = trochu vyšší tržba
    const dow = date.getDay();
    const factor = (dow === 5 || dow === 6) ? 1.4 : (dow === 0) ? 1.1 : 1;
    // Per provozovna — různý objem (CG Brno + Piazza větší, ostatní menší)
    platforma.provozovny.forEach((provId, vIdx) => {
      const venueFactor = vIdx === 0 ? 1.5 : vIdx === 1 ? 1.3 : 0.6 + (vIdx * 0.1);
      const seed = (date.getTime() / 86400000 + vIdx * 13) % 100;
      const trzba = Math.round(baseAmountPerVenue * factor * venueFactor * (0.7 + (seed % 40) / 100));
      const recordId = `${platforma.id}-${ds}-${provId}`;
      // Záměrné rozdíly pro demo
      let prislo: number | null;
      let stav: DenniParovani['stav'];
      let poznamka: string | undefined;
      let assignedProv: string | undefined = provId;

      if (i === 1 && platforma.apiDostupne) {
        prislo = null;
        stav = 'ceka-na-D1';
      } else if (i === 5 && platforma.id === 'qerko' && vIdx === 0) {
        prislo = trzba - 350;
        stav = 'rozdil';
        poznamka = 'Chybí 350 Kč — možný refund?';
      } else if (i === 12 && platforma.id === 'gopay' && vIdx === 0) {
        prislo = 0;
        stav = 'neprislo';
        poznamka = 'Eskalace na podporu GoPay';
      } else {
        const poplatek = Math.round(trzba * (platforma.poplatekPctOdhad / 100));
        prislo = trzba - poplatek;
        stav = 'sparovane';
      }
      // Demo: pár záznamů schválně bez provozovny — manuální dopárování
      if ((i === 3 || i === 8) && vIdx === platforma.provozovny.length - 1) {
        assignedProv = undefined;
      }

      const poplatekOdhad = Math.round(trzba * (platforma.poplatekPctOdhad / 100));
      items.push({
        id: recordId,
        datum: ds,
        provozovnaId: assignedProv,
        trzbaPos: trzba,
        prislo,
        rozdil: prislo !== null ? prislo - trzba : 0,
        poplatekOdhad,
        stav,
        poznamka,
      });
    });
  }
  return items;
}

// Base per venue (záměrně nižší — výsledek = per venue per day)
export const QERKO_DENNI:    DenniParovani[] = generateDailyParovani(PLATFORMS.qerko,    4_200, 30);
export const GOPAY_DENNI:    DenniParovani[] = generateDailyParovani(PLATFORMS.gopay,    5_800, 30);
export const SODEXO_DENNI:   DenniParovani[] = generateDailyParovani(PLATFORMS.sodexo,   2_200, 30);
export const TERMINAL_DENNI: DenniParovani[] = generateDailyParovani(PLATFORMS.terminal, 18_000, 30);  // Hlavní platební metoda — největší objem

// ─────────────────────────────────────────────────────────────
// Měsíční faktury od poskytovatele
// ─────────────────────────────────────────────────────────────

export const QERKO_FAKTURY: MesicniFakturaPlatformy[] = [
  { id: 'qer-2026-05', mesic: '2026-05', vydanaDatum: '2026-06-01', splatnost: '2026-06-15',
    prijmuCelkem: 542_300, poplatekFakturovany: 13_557, poplatekOdhadnuty: 13_557, rozdil: 0, stav: 'sedi' },
  { id: 'qer-2026-04', mesic: '2026-04', vydanaDatum: '2026-05-01', splatnost: '2026-05-15',
    prijmuCelkem: 498_200, poplatekFakturovany: 12_605, poplatekOdhadnuty: 12_455, rozdil: 150, stav: 'rozdil',
    poznamka: 'Poskytovatel uplatnil vyšší sazbu na 2 transakce nad limit.' },
  { id: 'qer-2026-03', mesic: '2026-03', vydanaDatum: '2026-04-01', splatnost: '2026-04-15',
    prijmuCelkem: 461_900, poplatekFakturovany: 11_548, poplatekOdhadnuty: 11_548, rozdil: 0, stav: 'sedi' },
];
export const GOPAY_FAKTURY: MesicniFakturaPlatformy[] = [
  { id: 'gp-2026-05', mesic: '2026-05', vydanaDatum: '2026-06-03', splatnost: '2026-06-17',
    prijmuCelkem: 362_400, poplatekFakturovany: 6_523, poplatekOdhadnuty: 6_523, rozdil: 0, stav: 'sedi' },
  { id: 'gp-2026-04', mesic: '2026-04', vydanaDatum: '2026-05-03', splatnost: '2026-05-17',
    prijmuCelkem: 348_700, poplatekFakturovany: 6_277, poplatekOdhadnuty: 6_277, rozdil: 0, stav: 'sedi' },
];
export const SODEXO_FAKTURY: MesicniFakturaPlatformy[] = [
  { id: 'sod-2026-05', mesic: '2026-05', vydanaDatum: '2026-06-05', splatnost: '2026-06-20',
    prijmuCelkem: 168_000, poplatekFakturovany: 7_560, poplatekOdhadnuty: 7_350, rozdil: 210, stav: 'ceka',
    poznamka: 'Čeká na ruční import dat z platformy.' },
  { id: 'sod-2026-04', mesic: '2026-04', vydanaDatum: '2026-05-05', splatnost: '2026-05-20',
    prijmuCelkem: 152_400, poplatekFakturovany: 6_858, poplatekOdhadnuty: 6_858, rozdil: 0, stav: 'sedi' },
];
export const TERMINAL_FAKTURY: MesicniFakturaPlatformy[] = [
  { id: 'term-2026-05', mesic: '2026-05', vydanaDatum: '2026-06-02', splatnost: '2026-06-16',
    prijmuCelkem: 2_540_800, poplatekFakturovany: 30_490, poplatekOdhadnuty: 30_490, rozdil: 0, stav: 'sedi' },
  { id: 'term-2026-04', mesic: '2026-04', vydanaDatum: '2026-05-02', splatnost: '2026-05-16',
    prijmuCelkem: 2_412_300, poplatekFakturovany: 29_232, poplatekOdhadnuty: 28_948, rozdil: 284, stav: 'rozdil',
    poznamka: 'Vyšší sazba pro AmEx transakce (4 ks).' },
  { id: 'term-2026-03', mesic: '2026-03', vydanaDatum: '2026-04-02', splatnost: '2026-04-16',
    prijmuCelkem: 2_308_500, poplatekFakturovany: 27_702, poplatekOdhadnuty: 27_702, rozdil: 0, stav: 'sedi' },
];

// ─────────────────────────────────────────────────────────────
// META
// ─────────────────────────────────────────────────────────────

export const PAR_STAV_META: Record<DenniParovani['stav'], { label: string; cls: string; icon: string }> = {
  sparovane:   { label: 'Spárováno',  cls: 'bg-success-subtle text-success',   icon: 'solar:check-circle-bold-duotone' },
  'ceka-na-D1':{ label: 'Čeká na D+1', cls: 'bg-info-subtle text-info',         icon: 'solar:hourglass-bold-duotone' },
  rozdil:      { label: 'Rozdíl',     cls: 'bg-warning-subtle text-warning',    icon: 'solar:danger-triangle-bold-duotone' },
  neprislo:    { label: 'Nepřišlo',   cls: 'bg-danger-subtle text-danger',      icon: 'solar:close-circle-bold-duotone' },
};

export const FAKT_STAV_META: Record<MesicniFakturaPlatformy['stav'], { label: string; cls: string; icon: string }> = {
  ceka:    { label: 'Čeká',     cls: 'bg-secondary-subtle text-secondary', icon: 'solar:hourglass-bold-duotone' },
  sedi:    { label: 'Sedí',     cls: 'bg-success-subtle text-success',     icon: 'solar:check-circle-bold-duotone' },
  rozdil:  { label: 'Rozdíl',   cls: 'bg-warning-subtle text-warning',     icon: 'solar:danger-triangle-bold-duotone' },
  reseno:  { label: 'Řešeno',   cls: 'bg-info-subtle text-info',           icon: 'solar:user-id-bold-duotone' },
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

export function getDataForPlatforma(id: PlatformaId): { denni: DenniParovani[]; faktury: MesicniFakturaPlatformy[] } {
  switch (id) {
    case 'qerko':    return { denni: QERKO_DENNI,    faktury: QERKO_FAKTURY };
    case 'gopay':    return { denni: GOPAY_DENNI,    faktury: GOPAY_FAKTURY };
    case 'sodexo':   return { denni: SODEXO_DENNI,   faktury: SODEXO_FAKTURY };
    case 'terminal': return { denni: TERMINAL_DENNI, faktury: TERMINAL_FAKTURY };
  }
}

export interface KpiData {
  prijmyTentoMesic: number;
  poplatkyTentoMesic: number;
  marzePct: number;
  nesparovane: number;
  rozdily: number;
}

export function getKpi(denni: DenniParovani[]): KpiData {
  const tenMonth = '2026-06';
  const tenni = denni.filter((d) => d.datum.slice(0, 7) === tenMonth);
  const prijmyTentoMesic = tenni.reduce((s, d) => s + d.trzbaPos, 0);
  const poplatkyTentoMesic = tenni.reduce((s, d) => s + d.poplatekOdhad, 0);
  const marzePct = prijmyTentoMesic > 0 ? (1 - poplatkyTentoMesic / prijmyTentoMesic) * 100 : 0;
  const nesparovane = denni.filter((d) => d.stav === 'ceka-na-D1' || d.stav === 'neprislo').length;
  const rozdily     = denni.filter((d) => d.stav === 'rozdil' || d.stav === 'neprislo').length;
  return { prijmyTentoMesic, poplatkyTentoMesic, marzePct, nesparovane, rozdily };
}
