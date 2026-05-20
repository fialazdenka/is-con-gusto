import type { FakturaPlatby } from './platbyData';
import { getVS } from './platbyData';

// ── Typy ──────────────────────────────────────────────────────

export type DuplicateDuvod =
  | { typ: 'same-vs';              vs: string }
  | { typ: 'same-cislo';           cislo: string }
  | { typ: 'same-amount-supplier'; dodavatel: string; castka: number; mesic: string };

export interface DuplicateHit {
  originalId: string;  // ID faktury, které je považována za originál
  duvody: DuplicateDuvod[];
  zavaznost: 'critical' | 'warning'; // critical = VS/číslo, warning = částka+dodavatel
}

// ── Detekce ───────────────────────────────────────────────────

export function detectDuplicates(
  faktury: FakturaPlatby[],
): Map<string, DuplicateHit> {
  const hits = new Map<string, DuplicateHit>();

  for (let i = 0; i < faktury.length; i++) {
    const f = faktury[i];
    const fVS    = getVS(f);
    const fMesic = f.datum.slice(0, 7); // YYYY-MM

    for (let j = 0; j < i; j++) {
      const g = faktury[j];
      const gVS    = getVS(g);
      const duvody: DuplicateDuvod[] = [];

      // 1. Stejný VS (nejspolehlivější)
      if (fVS === gVS && fVS.length >= 4) {
        duvody.push({ typ: 'same-vs', vs: fVS });
      }

      // 2. Stejné číslo faktury
      if (f.cislo === g.cislo) {
        duvody.push({ typ: 'same-cislo', cislo: f.cislo });
      }

      // 3. Stejný dodavatel + částka + měsíc
      const gMesic = g.datum.slice(0, 7);
      if (
        f.dodavatel === g.dodavatel &&
        f.castka === g.castka &&
        fMesic === gMesic &&
        f.provozovna === g.provozovna
      ) {
        duvody.push({
          typ: 'same-amount-supplier',
          dodavatel: f.dodavatel,
          castka: f.castka,
          mesic: fMesic,
        });
      }

      if (duvody.length > 0) {
        const zavaznost = duvody.some((d) => d.typ === 'same-vs' || d.typ === 'same-cislo')
          ? 'critical'
          : 'warning';

        // Označíme fakturou s vyšším indexem (pozdější záznam) jako duplikát originálu
        hits.set(f.id, { originalId: g.id, duvody, zavaznost });
      }
    }
  }

  return hits;
}

// ── Formátování důvodů ────────────────────────────────────────

export function formatDuvod(d: DuplicateDuvod): string {
  switch (d.typ) {
    case 'same-vs':
      return `Stejný variabilní symbol (${d.vs})`;
    case 'same-cislo':
      return `Stejné číslo faktury (${d.cislo})`;
    case 'same-amount-supplier':
      return `Stejný dodavatel, částka a měsíc (${d.mesic})`;
  }
}
