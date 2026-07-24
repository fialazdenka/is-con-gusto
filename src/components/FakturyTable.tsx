// COMPONENT: Faktury Table – výběr k úhradě
// SOURCE: Larkon _card.scss + _tables.scss + _badge.scss
// CUSTOM: přiřazení sloupec + KAT_META barevné badge (dynamická mapa kategorií)
//
// Larkon class mapping:
//   .card                              → karta
//   .card-header / .card-body          → header + body
//   .card-title                        → titulek
//   .table-responsive                  → horizontální scroll na mobilu
//   .table.table-hover.table-centered.table-nowrap → tabulka
//   .badge.bg-{color}-subtle.text-{color} → stav faktury (Bootstrap badge pattern)
//   .form-check-input                  → checkbox výběr řádku
//   .btn.btn-light.btn-sm              → akce tlačítka (Schválit, Zamítnout, Detail)
//   CUSTOM: KAT_META color map         → dynamická barva badge dle kategorie
//   CUSTOM: "Přiřazeno" sloupec        → avatar 24px + křestní jméno schvalovatele
//   CUSTOM: localPrirazeni prop        → session-local přiřazení (v produkci backend)

import type { ProvozovnaId } from '../types';
import type { FakturaPlatby, FakturaStavPlatby, FakturaKategorie, TypDokladu, MatchingStav, FakturaForma, ZpusobUhrady } from '../platbyData';
import {
  getFakturyForProvozovna,
  getOdeslatDo,
  isPoSplatnosti,
  isUrgentni,
  isSplatneVObdobi,
  getMatchingData,
  getVS,
  getZpusobUhrady,
  KATEGORIE_LABELS,
  PROCESSING_DAYS_DEFAULT,
  SCHVALOVACI_OSOBY,
  getEffektivniStav,
} from '../platbyData';
import { PROVOZOVNY, fCzk, fDateFull } from '../data';

export type SortCol = 'cislo' | 'dodavatel' | 'castka' | 'splatnost' | 'odeslatDo' | 'stav' | null;

// Filtr „Stavy" (zápis 24. 7. 2026) — jednotný multiselect: úhrada / workflow / způsob platby / párování s DL.
export type StavyKey =
  | 'neuhrazene' | 'uhrazene' | 'uhrazene-zapocet' | 'uhrazene-zaloha'
  | 'schvalene' | 'v-bance' | 'v-bance-neuhr' | 'pozastavene' | 'po-splatnosti'
  | 'hotove' | 'kartou' | 'stravenky' | 'prevodem'
  | 'dl-ceka' | 'dl-nesparovane' | 'dl-sparovane' | 'dl-duplicita';

// Odpovídá faktura danému klíči? (jeden vybraný klíč = OR)
function matchStavy(f: FakturaPlatby, key: StavyKey, effStav: FakturaStavPlatby): boolean {
  const paid = effStav === 'uhrazena' || effStav === 'zaplacena';
  const zp = getZpusobUhrady(f);
  const m = getMatchingData(f.id)?.stav;
  switch (key) {
    case 'neuhrazene':       return !paid;
    case 'uhrazene':         return paid;
    case 'uhrazene-zapocet': return paid && (zp === 'zapocet' || f.forma === 'offset');
    case 'uhrazene-zaloha':  return paid && (zp === 'zalohova' || f.forma === 'zalohova');
    case 'schvalene':        return effStav === 'schvalena';
    case 'v-bance':          return effStav === 'v-bance';
    case 'v-bance-neuhr':    return effStav === 'v-bance-neuhrazena';
    case 'pozastavene':      return effStav === 'pozastavena';
    case 'po-splatnosti':    return isPoSplatnosti(f.splatnost) && !paid;
    case 'hotove':           return zp === 'hotovost';
    case 'kartou':           return zp === 'karta';
    case 'stravenky':        return zp === 'stravenky';
    case 'prevodem':         return zp === 'banka';
    case 'dl-ceka':          return m === 'ceka-na-sparovani';
    case 'dl-nesparovane':   return m === 'nesedi-dl' || m === 'castecne-sparovana' || m === 'bez-dl';
    case 'dl-sparovane':     return m === 'sparovana';
    case 'dl-duplicita':     return m === 'duplikat';
    default:                 return false;
  }
}

interface Props {
  provozovna: ProvozovnaId;
  periodOd: string;
  periodDo: string;
  kategorieFilter: string;
  stavFilter?: string;                                  // legacy single-select (zachováno pro zpětnou kompatibilitu)
  stavFilters?: Set<FakturaStavPlatby>;                 // workflow multiselect (interní — alerty/presety)
  stavyFilters?: Set<StavyKey>;                         // „Stavy" — jednotný multiselect (úhrada/workflow/platba/DL)
  matchingFilter?: MatchingStav | 'all';                // legacy single-select
  matchingFilters?: Set<MatchingStav>;                  // nový multiselect
  formaFilters?: Set<FakturaForma>;                     // speciální účetní formy (zálohová / dobropis / offset)
  presetFilters?: Set<'po-splatnosti' | 'tydni' | 'uzamcene'>;       // preset filtry (po splatnosti, tento týden, uzamčené)
  castkaOd?: string;
  castkaDo?: string;
  // Phase 8.11 (zápis 22. 6. 2026) — Datum filter (splatnost od/do)
  datumOd?: string;
  datumDo?: string;
  datumPodle?: 'vystaveni' | 'splatnost' | 'duzp';   // na které datum aplikovat datumOd/Do
  sortBy?: SortCol;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (col: SortCol) => void;
  typDokladu: TypDokladu | 'all';
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  processingDays: number;
  localStavy?: Record<string, FakturaStavPlatby>;
  localPrirazeni?: Record<string, string>;
  onRowClick?: (id: string) => void;
  showExtraCols?: boolean;
  showMatching?: boolean;
  showZaplacene?: boolean;
  selectedRowId?: string | null;
  search?: string;
  tableTitle?: string;
}

const MATCHING_META: Record<MatchingStav, { cls: string; label: string; icon: string }> = {
  'ceka-na-sparovani':  { cls: 'bg-info-subtle text-info',           label: 'Čeká',        icon: 'solar:refresh-circle-bold-duotone' },
  sparovana:            { cls: 'bg-success-subtle text-success',     label: 'Spárováno',   icon: 'solar:check-circle-bold-duotone' },
  'nesedi-dl':          { cls: 'bg-warning-subtle text-warning',     label: 'Nesedí DL',   icon: 'solar:danger-triangle-bold-duotone' },
  'castecne-sparovana': { cls: 'bg-warning-subtle text-warning',     label: 'Část. spar.', icon: 'solar:pie-chart-bold-duotone' },
  duplikat:             { cls: 'bg-danger-subtle text-danger',       label: 'Duplicita',   icon: 'solar:copy-bold-duotone' },
  'bez-dl':             { cls: 'bg-secondary-subtle text-secondary', label: 'Bez DL',      icon: 'solar:document-bold-duotone' },
};

// Phase 8 (zápis 10. 6. 2026) — sjednocené stavy přijatých + vydaných faktur (8 + 3)
const STAV_META: Record<FakturaStavPlatby, { cls: string; label: string }> = {
  // Přijaté
  nova:                 { cls: 'bg-secondary-subtle text-secondary', label: 'Nová' },
  'ceka-na-schvaleni':  { cls: 'bg-warning-subtle text-warning',     label: 'Čeká na schválení' },
  'castecne-schvalena': { cls: 'bg-warning-subtle text-warning',     label: 'Částečně schválená' },
  schvalena:            { cls: 'bg-success-subtle text-success',     label: 'Schválená' },
  pozastavena:          { cls: 'bg-warning-subtle text-warning',     label: 'Pozastavená' },
  zamitnuta:            { cls: 'bg-danger-subtle text-danger',       label: 'Zamítnutá' },
  'v-bance':            { cls: 'bg-info-subtle text-info',           label: 'V bance' },
  uhrazena:             { cls: 'bg-success text-white',              label: 'Uhrazená' },
  'v-bance-neuhrazena': { cls: 'platby-stav-chyba',                  label: 'V bance neuhrazená' },
  // Phase 8.4 — Vydané (workflow vystavení → úhrada zákazníkem)
  vystavena:            { cls: 'bg-info-subtle text-info',           label: 'Vystavená' },
  nezaplacena:          { cls: 'bg-danger-subtle text-danger',       label: 'Nezaplacená' },
  zaplacena:            { cls: 'bg-success text-white',              label: 'Zaplacená' },
};

const FORMA_META: Record<FakturaForma, { label: string; cls: string; icon: string }> = {
  standard: { label: '',          cls: '',                                 icon: '' },
  zalohova: { label: 'Zálohová',  cls: 'bg-info-subtle text-info',          icon: 'solar:wallet-money-bold-duotone' },
  dobropis: { label: 'Dobropis',  cls: 'bg-danger-subtle text-danger',      icon: 'solar:undo-left-round-bold-duotone' },
  offset:   { label: 'Offset',    cls: 'bg-secondary-subtle text-secondary', icon: 'solar:transfer-horizontal-bold-duotone' },
};

const KAT_META: Record<FakturaKategorie, { color: string }> = {
  zbozi:   { color: '#1c84ee' },
  energie: { color: '#f97316' },
  sluzby:  { color: '#8b5cf6' },
  najem:   { color: '#ec4899' },
  vyplaty: { color: '#14b8a6' },
  ostatni: { color: '#9097a7' },
};

// ── Ikonový systém stavů (zápis 21. 7. 2026, dle rozpisu kolegyň) ──
// Stav = ikona místo textu; plný název v tooltipu.
const STAV_ICON: Record<FakturaStavPlatby, { icon: string; color: string }> = {
  nova:                 { icon: 'solar:document-bold-duotone',        color: '#9097a7' },
  'ceka-na-schvaleni':  { icon: 'solar:clock-circle-bold-duotone',    color: '#e67e00' },
  'castecne-schvalena': { icon: 'solar:pie-chart-2-bold-duotone',     color: '#e67e00' },
  schvalena:            { icon: 'mdi:check-bold',                     color: '#198754' },
  pozastavena:          { icon: 'solar:pause-circle-bold-duotone',    color: '#8b5cf6' },
  zamitnuta:            { icon: 'solar:close-circle-bold-duotone',    color: '#dc3545' },
  // „V bance" = prošlo schválením → fajfka zůstává (kontrola, že platba v bance JE schválená).
  // Info „už v bance" nese modrý domeček (druh platby), ne stav ikona.
  'v-bance':            { icon: 'mdi:check-bold',                     color: '#198754' },
  'v-bance-neuhrazena': { icon: 'mdi:exclamation-thick',              color: '#dc3545' },
  uhrazena:             { icon: 'solar:check-square-bold-duotone',    color: '#198754' },
  vystavena:            { icon: 'solar:file-check-bold-duotone',      color: '#0d6efd' },
  nezaplacena:          { icon: 'mdi:exclamation-thick',              color: '#dc3545' },
  zaplacena:            { icon: 'solar:check-square-bold-duotone',    color: '#198754' },
};

// Druh platby — jasně rozlišitelné symboly. Barva: šedá dokud není uhrazeno, zelená po úhradě
// (převod navíc modrá, když je v bance). Zápočet / zálohová faktura / stravenky = další způsoby úhrady.
const ZPUSOB_META: Record<ZpusobUhrady, { icon: string; label: string }> = {
  hotovost:  { icon: 'fa6-solid:sack-dollar',        label: 'Hotově' },              // měšec zlata
  karta:     { icon: 'fa6-solid:credit-card',        label: 'Kartou' },              // platební karta
  banka:     { icon: 'fa6-solid:building-columns',   label: 'Převodem' },            // bankovní budova
  zapocet:   { icon: 'fa6-solid:right-left',         label: 'Zápočtem' },            // protější šipky
  zalohova:  { icon: 'fa6-solid:file-invoice-dollar', label: 'Zálohovou fakturou' }, // zálohová faktura
  stravenky: { icon: 'fa6-solid:ticket',             label: 'Stravenkami' },         // stravenky
};

// Zkratka druhu dokladu (dle formy + přijatá/vydaná) — dle rozpisu kolegyň.
// (DAP = Daně přijaté řeší samostatná sekce Daně.)
function dokladZkratka(typ: TypDokladu, forma?: FakturaForma): string {
  const f = forma ?? 'standard';
  if (typ === 'vydana') {
    return f === 'dobropis' ? 'ODDV' : f === 'zalohova' ? 'ZFAV' : f === 'offset' ? 'JINV' : 'FAV';
  }
  return f === 'dobropis' ? 'ODDP' : f === 'zalohova' ? 'ZFAP' : f === 'offset' ? 'JINP' : 'FAP';
}
const ZKRATKA_COLOR: Record<FakturaForma, string> = {
  standard: '#0d6efd',
  dobropis: '#dc3545',
  zalohova: '#0dcaf0',
  offset:   '#fd7e14',
};

// Barva řádku — jen smysluplné stavy: oranžová (čeká na schválení), fialová (pozastavená),
// červená (po splatnosti). Ostatní stavy řádek nebarví.
function rowBgForStav(stav: FakturaStavPlatby, poSpl: boolean): string {
  const paid = stav === 'uhrazena' || stav === 'zaplacena';
  if (stav === 'pozastavena')                             return '#f3e8ff';  // fialový
  if ((poSpl || stav === 'v-bance-neuhrazena') && !paid)  return '#ffe9e9';  // červený (po splatnosti)
  if (stav === 'ceka-na-schvaleni')                       return '#fff3e0';  // oranžový (čeká na schválení)
  return '';
}

export default function FakturyTable({
  provozovna,
  periodOd,
  periodDo,
  kategorieFilter,
  stavFilter,
  stavFilters,
  matchingFilter = 'all',
  matchingFilters,
  formaFilters,
  presetFilters,
  castkaOd = '',
  castkaDo = '',
  datumOd  = '',
  datumDo  = '',
  stavyFilters,
  datumPodle = 'splatnost',
  sortBy = null,
  sortDir = 'asc',
  onSortChange,
  typDokladu,
  selectedIds,
  onToggle,
  onToggleAll,
  processingDays,
  localStavy = {},
  localPrirazeni = {},
  onRowClick,
  showExtraCols = true,
  showMatching = false,
  showZaplacene = false,
  selectedRowId = null,
  search = '',
  tableTitle = 'Faktury k úhradě',
}: Props) {
  const vsechny = getFakturyForProvozovna(provozovna);

  const minCastka = castkaOd ? parseInt(castkaOd, 10) : null;
  const maxCastka = castkaDo ? parseInt(castkaDo, 10) : null;

  const filtered = vsechny.filter((f) => {
    // Zaplacené / odeslané skrýt, pokud uživatel je explicitně nezvolil
    // VÝJIMKA: pokud je aktivní preset "uzamcene", vždy ukazujeme i zaplacené
    const isUzamceneFilter = presetFilters?.has('uzamcene') ?? false;
    if ((f.stav === 'uhrazena' || f.stav === 'v-bance') && !showZaplacene && !stavFilters?.has(f.stav) && !isUzamceneFilter) return false;

    if (typDokladu !== 'all' && f.typDokladu !== typDokladu) return false;
    if (kategorieFilter !== 'all' && f.kategorie !== kategorieFilter) return false;

    // Datum filter — dle „Podle" (vystavení / splatnost / DUZP)
    {
      const dField = datumPodle === 'vystaveni' ? f.datum
        : datumPodle === 'duzp' ? (f.duzp ?? f.datum)
        : f.splatnost;
      if (datumOd && dField < datumOd) return false;
      if (datumDo && dField > datumDo) return false;
    }

    // ── Multiselect stav (nová cesta) ──
    if (stavFilters && stavFilters.size > 0 && !stavFilters.has(f.stav)) return false;

    // ── „Stavy" — jednotný multiselect (OR přes vybrané klíče) ──
    if (stavyFilters && stavyFilters.size > 0) {
      const effStav = getEffektivniStav(localStavy?.[f.id] ?? f.stav, f.splatnost);
      let ok = false;
      for (const key of stavyFilters) { if (matchStavy(f, key, effStav)) { ok = true; break; } }
      if (!ok) return false;
    }

    // ── Legacy single-select stavFilter (pro zpětnou kompatibilitu) ──
    if (stavFilter) {
      if (stavFilter === 'uhrazena' && f.stav !== 'uhrazena') return false;
      if (stavFilter === 'zamitnuta' && f.stav !== 'zamitnuta') return false;
      if (f.stav === 'zamitnuta' && stavFilter !== 'zamitnuta' && stavFilter !== 'all') return false;
      if (stavFilter === 'pozastavena' && f.stav !== 'pozastavena') return false;
      if (stavFilter === 'schvalena' && f.stav !== 'schvalena') return false;
      if (stavFilter === 'neschvalena' && f.stav !== 'nova' && f.stav !== 'ceka-na-schvaleni') return false;
      if (stavFilter === 'po-splatnosti' && !isPoSplatnosti(f.splatnost)) return false;
      if (stavFilter === 'tydni' && !isSplatneVObdobi(f.splatnost, periodOd, periodDo)) return false;
    }

    // ── Preset filtry ──
    if (presetFilters?.has('po-splatnosti') && !isPoSplatnosti(f.splatnost)) return false;
    if (presetFilters?.has('tydni') && !isSplatneVObdobi(f.splatnost, periodOd, periodDo)) return false;
    if (presetFilters?.has('uzamcene') && !f.isLocked) return false;

    // ── Účetní forma (zálohová / dobropis / offset) ──
    if (formaFilters && formaFilters.size > 0) {
      const forma: FakturaForma = f.forma ?? 'standard';
      if (!formaFilters.has(forma)) return false;
    }

    // ── Multiselect párování (nová cesta) ──
    if (matchingFilters && matchingFilters.size > 0) {
      const matching = getMatchingData(f.id);
      if (!matching || !matchingFilters.has(matching.stav)) return false;
    }

    // ── Legacy single-select matchingFilter ──
    if (matchingFilter !== 'all' && getMatchingData(f.id)?.stav !== matchingFilter) return false;

    // ── Částka range ──
    if (minCastka != null && f.castka < minCastka) return false;
    if (maxCastka != null && f.castka > maxCastka) return false;

    // Vyhledávání napříč: dodavatel + číslo faktury + variabilní symbol
    if (search) {
      const q = search.toLowerCase();
      const hay = `${f.dodavatel} ${f.cislo} ${getVS(f)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // ── Řazení per Phase 8 (zápis 10. 6. 2026) — sjednocené stavy přijatých + vydaných ──
  const STAV_ORDER: Record<FakturaStavPlatby, number> = {
    nova: 1, 'ceka-na-schvaleni': 2, 'castecne-schvalena': 3, schvalena: 4, pozastavena: 5,
    'v-bance': 6, 'v-bance-neuhrazena': 7, uhrazena: 8, zamitnuta: 9,
    // Vydané — řadíme po vlastní ose: vystavená → nezaplacená → zaplacená
    vystavena: 1, nezaplacena: 2, zaplacena: 3,
  };
  // „Kompletní" faktura = nic k řešení: uhrazená/zaplacená (prošlo schválením) A žádný otevřený
  // párovací problém. Párování je „vyřešené", když je spárováno se Septimem NEBO je bez DL
  // (nepáruje se — schvaluje se ručně; po zaplacení je hotová). Otevřené problémy (nesedí DL,
  // duplicita, částečné, čeká na párování) brání kompletnosti.
  const MATCHING_UNRESOLVED: MatchingStav[] = ['nesedi-dl', 'duplikat', 'castecne-sparovana', 'ceka-na-sparovani'];
  const isComplete = (f: FakturaPlatby): boolean => {
    const est = getEffektivniStav(localStavy[f.id] ?? f.stav, f.splatnost);
    const paid = est === 'uhrazena' || est === 'zaplacena';
    const matchStav = getMatchingData(f.id)?.stav;
    const parovaniOK = !matchStav || !MATCHING_UNRESOLVED.includes(matchStav);
    return paid && parovaniOK;
  };

  const baseSorted = sortBy ? [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    let cmp = 0;
    switch (sortBy) {
      case 'cislo':      cmp = a.cislo.localeCompare(b.cislo); break;
      case 'dodavatel':  cmp = a.dodavatel.localeCompare(b.dodavatel, 'cs'); break;
      case 'castka':     cmp = a.castka - b.castka; break;
      case 'splatnost':  cmp = a.splatnost.localeCompare(b.splatnost); break;
      case 'odeslatDo':  cmp = getOdeslatDo(a.splatnost, processingDays).localeCompare(getOdeslatDo(b.splatnost, processingDays)); break;
      case 'stav':       cmp = (STAV_ORDER[getEffektivniStav(localStavy[a.id] ?? a.stav, a.splatnost)] ?? 99) - (STAV_ORDER[getEffektivniStav(localStavy[b.id] ?? b.stav, b.splatnost)] ?? 99); break;
    }
    return cmp * dir;
  }) : [...filtered];
  // Kompletní faktury vždy dolů (stabilní sort zachová pořadí uvnitř skupin).
  const zobrazene = baseSorted.sort((a, b) => (isComplete(a) ? 1 : 0) - (isComplete(b) ? 1 : 0));

  const vybiratelne = zobrazene.filter((f) => f.stav === 'schvalena');
  const vsechnyVybrany = vybiratelne.length > 0 && vybiratelne.every((f) => selectedIds.has(f.id));
  const nekteréVybrany = vybiratelne.some((f) => selectedIds.has(f.id));

  const getProvName  = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.shortName ?? id;
  const getProvColor = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.color ?? '#9097a7';

  void PROCESSING_DAYS_DEFAULT;

  return (
    <div className="card">
      {/* Jednořádkový systém (zápis 21. 7. 2026) — bez hromadného výběru / checkboxů. Klik na řádek = detail. */}
      <div className="card-header d-flex align-items-center justify-content-between gap-3">
        <h5 className="card-title mb-0 flex-grow-1">
          {tableTitle}
          <small className="text-muted fw-normal ms-2 fs-13">
            {zobrazene.length} {zobrazene.length === 1 ? 'faktura' : zobrazene.length < 5 ? 'faktury' : 'faktur'}
          </small>
        </h5>
      </div>

      {/* SOURCE: Larkon .table.table-hover.table-centered.table-nowrap */}
      <div className="table-responsive">
        <table className="table table-hover table-centered table-nowrap mb-0">
          <thead className="table-light">
            {/* Phase 8 (zápis 10. 6. 2026) — zjednodušené sloupce: Dodavatel (+ číslo/VS) / Provoz / Splatnost / Částka / Stav.
                Odstraněny: hromadné zaškrtávání, Typ dokladu, Kategorie, Odeslat do, Přiřazeno (přesunuto do detailu). */}
            <tr>
              <th>Typ</th>
              <SortableTh col="dodavatel" label="Dodavatel"       sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} />
              <SortableTh col="cislo"     label="VS"               sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} />
              <th>Datum vystavení</th>
              <th>DUZP</th>
              {provozovna === 'all' && <th>Provoz</th>}
              <SortableTh col="splatnost" label="Splatnost" sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} />
              <SortableTh col="castka"    label="Částka"    sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} className="text-end" />
              <SortableTh col="stav"      label="Stav"      sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} />
              {showMatching && <th>Párování</th>}
            </tr>
          </thead>
          <tbody>
            {zobrazene.length === 0 && (
              <tr>
                <td colSpan={11} className="text-center py-4 text-muted">
                  Žádné faktury neodpovídají filtru
                </td>
              </tr>
            )}
            {zobrazene.map((f) => {
              const effectiveStav  = getEffektivniStav(localStavy[f.id] ?? f.stav, f.splatnost);
              const prirazeniId    = localPrirazeni[f.id] ?? f.prirazenaOsoba ?? '';
              const prirazenaOsoba = SCHVALOVACI_OSOBY.find((o) => o.id === prirazeniId);
              const poSpl    = isPoSplatnosti(f.splatnost);
              const urgentni = isUrgentni(f.splatnost, processingDays);
              const odeslatDo = getOdeslatDo(f.splatnost, processingDays);
              const { label } = STAV_META[effectiveStav] ?? STAV_META['nova'];
              const matching = getMatchingData(f.id);
              const matchMeta = matching ? MATCHING_META[matching.stav] : null;

              // ── Ikonový cluster (dle rozpisu kolegyň) ──
              const zp        = getZpusobUhrady(f);
              const zpMeta    = ZPUSOB_META[zp];
              const paid      = effectiveStav === 'uhrazena' || effectiveStav === 'zaplacena';
              const vBance    = effectiveStav === 'v-bance';
              // Barví se JEN ikona druhu platby: šedá = neuhrazeno · zelená = uhrazeno ·
              // modrá = jen převodem (domeček) když je faktura už v bance a čeká na úhradu
              const zpColor   = paid ? '#198754' : (zp === 'banka' && vBance) ? '#0d6efd' : '#9097a7';
              const stavIcon  = STAV_ICON[effectiveStav] ?? STAV_ICON['nova'];
              const matchStav = matching?.stav;
              const sColor    = matchStav === 'sparovana' ? '#198754'
                : (matchStav === 'castecne-sparovana' || matchStav === 'nesedi-dl') ? '#e67e00' : '#9097a7';
              const isDup     = matchStav === 'duplikat';
              const hasDoc    = ((parseInt(f.id.replace(/\D/g, ''), 10) || 0) % 4) !== 0;

              const isActiveRow = f.id === selectedRowId;
              // Kompletní (uhrazená + spárovaná = nic k řešení) → zelený řádek. Jinak stavové barvy.
              const komplet = isComplete(f);
              const rowBg = isActiveRow ? '' : (komplet ? '#e6f7ec' : rowBgForStav(effectiveStav, poSpl));

              return (
                <tr
                  key={f.id}
                  className={isActiveRow ? 'table-active' : ''}
                  style={{ cursor: 'pointer', ...(rowBg ? { background: rowBg } : {}) }}
                  onClick={(e) => {
                    const row = e.currentTarget;
                    const wasSelected = selectedRowId === f.id;
                    if (onRowClick) onRowClick(f.id);
                    // Phase 8.5 (zápis 19. 6. 2026) — Zarovnání horní hrany kliknutého řádku s horní hranou
                    // sticky panelu vpravo (jen pod topbar). Pattern z BankaView.
                    if (!wasSelected && onRowClick) {
                      requestAnimationFrame(() => {
                        const rect = row.getBoundingClientRect();
                        const topbarH = parseFloat(
                          getComputedStyle(document.documentElement).getPropertyValue('--bs-topbar-height')
                        ) || 100;
                        const targetY = window.scrollY + rect.top - topbarH - 16;
                        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
                      });
                    }
                  }}
                >
                  {/* Typ dokladu — zkratka dle formy (přijaté: FAP/ODDP/ZFAP/JINP; vydané: FAV/ODDV/ZFAV/JINV) */}
                  <td>
                    {(() => {
                      const forma = f.forma ?? 'standard';
                      const barva = ZKRATKA_COLOR[forma];
                      return (
                        <span className="badge fw-bold czk-num"
                          style={{ background: `${barva}1a`, color: barva, fontSize: 11 }}
                          title={dokladZkratka(f.typDokladu, forma)}>
                          {dokladZkratka(f.typDokladu, forma)}
                        </span>
                      );
                    })()}
                  </td>
                  {/* Dodavatel — jen název (forma je nově ve sloupci „Typ" vlevo) */}
                  <td style={{ width: 260, maxWidth: 260 }}>
                    <span className="fw-semibold text-truncate d-block" title={`${f.dodavatel} · VS ${getVS(f)}`} style={{ maxWidth: '100%' }}>{f.dodavatel}</span>
                  </td>
                  {/* VS primárně; číslo faktury jen jako miniaturní poznámka, když se liší (úspora šířky) */}
                  <td className="czk-num">
                    <div className="fw-semibold">{getVS(f)}</div>
                    {f.cislo !== getVS(f) && (
                      <div className="text-muted" style={{ fontSize: 10, lineHeight: 1.1 }}>č. {f.cislo}</div>
                    )}
                  </td>
                  {/* Datum vystavení */}
                  <td className="text-nowrap">{fDateFull(f.datum)}</td>
                  {/* DUZP — datum uskutečnění zdanitelného plnění (fallback = datum vystavení) */}
                  <td className="text-nowrap">{fDateFull(f.duzp ?? f.datum)}</td>
                  {provozovna === 'all' && (
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle d-inline-block"
                          style={{ width: 8, height: 8, background: getProvColor(f.provozovna), flexShrink: 0 }} />
                        <span className="fs-13">{getProvName(f.provozovna)}</span>
                      </div>
                    </td>
                  )}
                  <td>
                    <span
                      className={`text-nowrap ${poSpl ? 'text-danger fw-bold' : urgentni ? 'text-warning fw-bold' : ''}`}
                      title={poSpl ? 'Po splatnosti' : urgentni ? `Odeslat do ${fDateFull(odeslatDo)}` : undefined}>
                      {fDateFull(f.splatnost)}
                    </span>
                  </td>
                  <td className={`text-end fw-bold czk-num ${f.castka < 0 ? 'text-danger' : ''}`}>{fCzk(f.castka)}</td>
                  {/* Stav = ikonový cluster (dle rozpisu kolegyň): stav · druh platby · párování „S" · dokument · zámek.
                      Řádek je navíc podbarvený dle stavu. Plné názvy v tooltipu. */}
                  <td>
                    <div className="d-flex align-items-center gap-2 flex-nowrap">
                      {/* Workflow stav (ikona místo textu) */}
                      <iconify-icon icon={stavIcon.icon}
                        title={`Stav: ${label}${effectiveStav === 'ceka-na-schvaleni' && prirazenaOsoba ? ` (od ${prirazenaOsoba.jmeno})` : ''}`}
                        style={{ fontSize: effectiveStav === 'v-bance-neuhrazena' ? 24 : 21, color: stavIcon.color }} />
                      {/* Druh platby — barví se jen tato ikona: šedá/zelená/modrá (převod v bance) */}
                      <iconify-icon icon={zpMeta.icon}
                        title={`${zpMeta.label} — ${paid ? 'uhrazeno' : (zp === 'banka' && vBance) ? 'v bance, čeká na úhradu' : 'neuhrazeno'}`}
                        style={{ fontSize: 20, color: zpColor }} />
                      {/* Párování se Septimem */}
                      {isDup ? (
                        <span className="badge bg-danger" style={{ fontSize: 11 }} title="Duplicitní dodací list">DUP</span>
                      ) : (
                        <span className="fw-bold" style={{ fontSize: 16, lineHeight: 1, color: sColor }}
                          title={`Párování se Septimem${matchStav && MATCHING_META[matchStav] ? `: ${MATCHING_META[matchStav].label}` : ''}`}>S</span>
                      )}
                      {/* Dokument — vždy viditelný: zelený = nahraný, šedý = bez přílohy */}
                      <iconify-icon icon="solar:document-bold-duotone"
                        title={hasDoc ? 'Dokument přiložen' : 'Bez dokumentu'}
                        style={{ fontSize: 19, color: hasDoc ? '#198754' : '#9097a7' }} />
                      {/* Zámek */}
                      {f.isLocked && (
                        <iconify-icon icon="solar:lock-keyhole-bold-duotone"
                          title="Faktura uzamčena (uzavřené účetní období)"
                          style={{ fontSize: 17, color: '#6f42c1' }} />
                      )}
                    </div>
                  </td>
                  {showMatching && (
                    <td>
                      {matchMeta ? (
                        <span className={`badge ${matchMeta.cls}`}>
                          <iconify-icon icon={matchMeta.icon} className="me-1" style={{ fontSize: 10 }} />
                          {matchMeta.label}
                        </span>
                      ) : (
                        <span className="text-muted fs-12">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SOURCE: Larkon .card-footer */}
      <div className="card-footer py-3 bg-light bg-opacity-50">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <span className="text-muted fs-12">
            Datum odeslání = splatnost −{' '}
            <strong>{processingDays} dny</strong> (zpracování banky) ·{' '}
            <span className="text-warning fw-semibold">oranžová</span> = odeslat dnes ·{' '}
            <span className="text-danger fw-semibold">červená</span> = po splatnosti ·{' '}
            <span className="fw-semibold" style={{ color: '#198754' }}>zelená</span> = kompletní (nic k řešení)
          </span>
        </div>
      </div>
    </div>
  );
}

interface SortableThProps {
  col: Exclude<SortCol, null>;
  label: string;
  sortBy: SortCol;
  sortDir: 'asc' | 'desc';
  onSort?: (col: SortCol) => void;
  className?: string;
}

function SortableTh({ col, label, sortBy, sortDir, onSort, className = '' }: SortableThProps) {
  const active = sortBy === col;
  const clickable = !!onSort;
  return (
    <th
      className={className}
      style={{ cursor: clickable ? 'pointer' : 'default', userSelect: 'none' }}
      onClick={() => clickable && onSort && onSort(col)}
    >
      <span className="d-inline-flex align-items-center gap-1">
        {label}
        {clickable && (
          <iconify-icon
            icon={active
              ? (sortDir === 'asc' ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold')
              : 'solar:sort-vertical-bold-duotone'}
            style={{ fontSize: 11, color: active ? '#1a1a1a' : '#adb5bd' }}
          />
        )}
      </span>
    </th>
  );
}
