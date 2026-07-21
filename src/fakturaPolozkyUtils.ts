import type { FakturaKategorie } from './platbyData';

export const DPH_SAZBA: Record<FakturaKategorie, number> = {
  zbozi:   0.12,
  energie: 0.21,
  sluzby:  0.21,
  najem:   0.21,
  vyplaty: 0,
  ostatni: 0.21,
};

// Druh položky pro schvalovací workflow (zápis 14. 7. 2026):
//  - 'surovina' = zboží dohledatelné v dodacích listech (Septim) → auto-schválení (zeleně)
//  - 'rezie'    = režijní náklad (doprava, obaly, poplatky, energie, nájem…) → schvaluje účetní (oranžově)
export type PolozkaDruh = 'surovina' | 'rezie';

const POLOZKY_PODIL: Record<FakturaKategorie, { popis: string; podil: number; druh: PolozkaDruh }[]> = {
  zbozi: [
    { popis: 'Maso a drůbež',                podil: 0.34, druh: 'surovina' },
    { popis: 'Zelenina, ovoce a bylinky',    podil: 0.20, druh: 'surovina' },
    { popis: 'Suchý sortiment a koření',     podil: 0.20, druh: 'surovina' },
    { popis: 'Nápoje a doplňkový sortiment', podil: 0.14, druh: 'surovina' },
    { popis: 'Obalový a čisticí materiál',   podil: 0.07, druh: 'rezie' },
    { popis: 'Doprava a logistika',          podil: 0.05, druh: 'rezie' },
  ],
  energie: [
    { popis: 'Spotřeba elektrické energie',  podil: 0.78, druh: 'rezie' },
    { popis: 'Distribuční poplatek',         podil: 0.22, druh: 'rezie' },
  ],
  najem: [
    { popis: 'Nájem nebytových prostor',     podil: 0.85, druh: 'rezie' },
    { popis: 'Záloha na služby',             podil: 0.15, druh: 'rezie' },
  ],
  sluzby: [
    { popis: 'Poskytnuté služby dle smlouvy', podil: 0.88, druh: 'rezie' },
    { popis: 'Administrativní poplatek',      podil: 0.12, druh: 'rezie' },
  ],
  vyplaty: [
    { popis: 'Mzdové náklady',               podil: 1.0, druh: 'rezie' },
  ],
  ostatni: [
    { popis: 'Plnění dle smlouvy',           podil: 1.0, druh: 'rezie' },
  ],
};

export interface FakturaPolozkaGen {
  popis: string;
  base: number;        // bez DPH
  total: number;       // s DPH
  dphSazba: number;
  druh: PolozkaDruh;
}

export function generateFakturaPolozky(castka: number, kategorie: FakturaKategorie): FakturaPolozkaGen[] {
  const sazba   = DPH_SAZBA[kategorie] ?? 0.21;
  const polozky = POLOZKY_PODIL[kategorie] ?? POLOZKY_PODIL['ostatni'];
  const zaklad  = sazba > 0 ? Math.round(castka / (1 + sazba)) : castka;

  return polozky.map((p, i) => {
    const isLast  = i === polozky.length - 1;
    const base    = isLast
      ? zaklad - polozky.slice(0, i).reduce((s, pp) => s + Math.round(zaklad * pp.podil), 0)
      : Math.round(zaklad * p.podil);
    const total   = Math.round(base * (1 + sazba));
    return { popis: p.popis, base, total, dphSazba: sazba, druh: p.druh };
  });
}

// Tolerance thresholds
export const TOLERANCE_EXACT = 1;        // ≤ 1 Kč → zelená
export const TOLERANCE_PCT   = 0.05;     // ≤ 5 % → oranžová, jinak červená

export type DiffStav = 'ok' | 'tolerance' | 'problem' | 'chybi-faktura' | 'chybi-dl';

export function getDiffStav(fakturaAmt: number | null, dlAmt: number | null): DiffStav {
  if (fakturaAmt === null) return 'chybi-faktura';
  if (dlAmt === null)      return 'chybi-dl';
  const diff = Math.abs(fakturaAmt - dlAmt);
  if (diff <= TOLERANCE_EXACT) return 'ok';
  if (diff <= fakturaAmt * TOLERANCE_PCT) return 'tolerance';
  return 'problem';
}

export const DIFF_META: Record<DiffStav, { color: string; bg: string; border: string; icon: string; label: string }> = {
  ok:             { color: '#198754', bg: '#f0fdf4', border: '#bbf7d0', icon: 'solar:check-circle-bold-duotone',     label: 'Sedí' },
  tolerance:      { color: '#e67e00', bg: '#fff8e1', border: '#ffe082', icon: 'solar:danger-triangle-bold-duotone',  label: 'Tolerance' },
  problem:        { color: '#dc3545', bg: '#fff5f5', border: '#fecaca', icon: 'solar:close-circle-bold-duotone',     label: 'Nesedí' },
  'chybi-faktura':{ color: '#6c757d', bg: '#f8f9fa', border: '#dee2e6', icon: 'solar:minus-circle-bold-duotone',     label: 'Navíc v DL' },
  'chybi-dl':     { color: '#dc3545', bg: '#fff5f5', border: '#fecaca', icon: 'solar:close-circle-bold-duotone',     label: 'Chybí v DL' },
};
