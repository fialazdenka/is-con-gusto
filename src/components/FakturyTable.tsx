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
import type { FakturaStavPlatby, FakturaKategorie, TypDokladu, MatchingStav, FakturaForma } from '../platbyData';
import {
  getFakturyForProvozovna,
  getOdeslatDo,
  isPoSplatnosti,
  isUrgentni,
  isSplatneVObdobi,
  getMatchingData,
  getVS,
  KATEGORIE_LABELS,
  PROCESSING_DAYS_DEFAULT,
  SCHVALOVACI_OSOBY,
} from '../platbyData';
import { PROVOZOVNY, fCzk, fDate } from '../data';

export type SortCol = 'cislo' | 'dodavatel' | 'castka' | 'splatnost' | 'odeslatDo' | 'stav' | null;

interface Props {
  provozovna: ProvozovnaId;
  periodOd: string;
  periodDo: string;
  kategorieFilter: string;
  stavFilter?: string;                                  // legacy single-select (zachováno pro zpětnou kompatibilitu)
  stavFilters?: Set<FakturaStavPlatby>;                 // nový multiselect
  matchingFilter?: MatchingStav | 'all';                // legacy single-select
  matchingFilters?: Set<MatchingStav>;                  // nový multiselect
  formaFilters?: Set<FakturaForma>;                     // speciální účetní formy (zálohová / dobropis / offset)
  presetFilters?: Set<'po-splatnosti' | 'tydni' | 'uzamcene'>;       // preset filtry (po splatnosti, tento týden, uzamčené)
  castkaOd?: string;
  castkaDo?: string;
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

// Larkon Bootstrap badge mapping
const STAV_META: Record<FakturaStavPlatby, { cls: string; label: string }> = {
  nova:                 { cls: 'bg-secondary-subtle text-secondary', label: 'Nová' },
  'ke-schvaleni':       { cls: 'bg-warning-subtle text-warning',     label: 'Ke schválení' },
  schvalena:            { cls: 'bg-success-subtle text-success',     label: 'Schválená' },
  zamitnuta:            { cls: 'bg-danger-subtle text-danger',       label: 'Zamítnutá' },
  zastavena:            { cls: 'bg-danger-subtle text-danger',       label: 'Zastavená' },
  odeslana:             { cls: 'bg-info-subtle text-info',           label: 'Odeslaná' },
  zaplacena:            { cls: 'bg-success-subtle text-success',     label: 'Zaplacená' },
  'v-bance':            { cls: 'bg-info-subtle text-info',           label: 'V bance' },
  'ceka-na-sparovani':  { cls: 'platby-stav-sparovani',              label: 'Čeká na spárování' },
  'chyba-platby':       { cls: 'platby-stav-chyba',                  label: 'Platba neproběhla' },
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
    if ((f.stav === 'zaplacena' || f.stav === 'odeslana') && !showZaplacene && !stavFilters?.has(f.stav) && !isUzamceneFilter) return false;

    if (typDokladu !== 'all' && f.typDokladu !== typDokladu) return false;
    if (kategorieFilter !== 'all' && f.kategorie !== kategorieFilter) return false;

    // ── Multiselect stav (nová cesta) ──
    if (stavFilters && stavFilters.size > 0 && !stavFilters.has(f.stav)) return false;

    // ── Legacy single-select stavFilter (pro zpětnou kompatibilitu) ──
    if (stavFilter) {
      if (stavFilter === 'zaplacena' && f.stav !== 'zaplacena') return false;
      if (stavFilter === 'zamitnuta' && f.stav !== 'zamitnuta') return false;
      if (f.stav === 'zamitnuta' && stavFilter !== 'zamitnuta' && stavFilter !== 'all') return false;
      if (stavFilter === 'zastavena' && f.stav !== 'zastavena') return false;
      if (stavFilter === 'schvalena' && f.stav !== 'schvalena') return false;
      if (stavFilter === 'neschvalena' && f.stav !== 'nova' && f.stav !== 'ke-schvaleni') return false;
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

    if (search && !f.dodavatel.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Řazení ──
  const STAV_ORDER: Record<FakturaStavPlatby, number> = {
    nova: 1, 'ke-schvaleni': 2, schvalena: 3, 'v-bance': 4, 'ceka-na-sparovani': 5,
    'chyba-platby': 6, odeslana: 7, zaplacena: 8, zastavena: 9, zamitnuta: 10,
  };
  const zobrazene = sortBy ? [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    let cmp = 0;
    switch (sortBy) {
      case 'cislo':      cmp = a.cislo.localeCompare(b.cislo); break;
      case 'dodavatel':  cmp = a.dodavatel.localeCompare(b.dodavatel, 'cs'); break;
      case 'castka':     cmp = a.castka - b.castka; break;
      case 'splatnost':  cmp = a.splatnost.localeCompare(b.splatnost); break;
      case 'odeslatDo':  cmp = getOdeslatDo(a.splatnost, processingDays).localeCompare(getOdeslatDo(b.splatnost, processingDays)); break;
      case 'stav':       cmp = (STAV_ORDER[localStavy[a.id] ?? a.stav] ?? 99) - (STAV_ORDER[localStavy[b.id] ?? b.stav] ?? 99); break;
    }
    return cmp * dir;
  }) : filtered;

  const vybiratelne = zobrazene.filter((f) => f.stav === 'schvalena');
  const vsechnyVybrany = vybiratelne.length > 0 && vybiratelne.every((f) => selectedIds.has(f.id));
  const nekteréVybrany = vybiratelne.some((f) => selectedIds.has(f.id));

  const getProvName  = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.shortName ?? id;
  const getProvColor = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.color ?? '#9097a7';

  void PROCESSING_DAYS_DEFAULT;

  return (
    <div className="card">
      {/* SOURCE: Larkon .card-header */}
      <div className="card-header d-flex align-items-center justify-content-between gap-3">
        <h5 className="card-title mb-0 flex-grow-1">
          {tableTitle}
          <small className="text-muted fw-normal ms-2 fs-13">
            {zobrazene.length} {showMatching ? 'faktur' : `faktur · ${vybiratelne.filter((f) => selectedIds.has(f.id)).length} vybráno`}
          </small>
        </h5>
        <div className="d-flex gap-2">
          {nekteréVybrany && (
            <button className="btn btn-light btn-sm" onClick={() => onToggleAll([])}>
              Zrušit výběr
            </button>
          )}
          <button
            className="btn btn-light btn-sm"
            onClick={() => onToggleAll(vsechnyVybrany ? [] : vybiratelne.map((f) => f.id))}
            disabled={vybiratelne.length === 0}
          >
            {vsechnyVybrany ? 'Odznačit vše' : 'Vybrat vše schválené'}
          </button>
        </div>
      </div>

      {/* SOURCE: Larkon .table.table-hover.table-centered.table-nowrap */}
      <div className="table-responsive">
        <table className="table table-hover table-centered table-nowrap mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={vsechnyVybrany}
                  ref={(el) => { if (el) el.indeterminate = nekteréVybrany && !vsechnyVybrany; }}
                  onChange={() => onToggleAll(vsechnyVybrany ? [] : vybiratelne.map((f) => f.id))}
                  disabled={vybiratelne.length === 0}
                />
              </th>
              <SortableTh col="cislo"     label="Číslo"     sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} />
              <SortableTh col="dodavatel" label="Dodavatel" sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} />
              {showExtraCols && <th>Typ dokladu</th>}
              {showExtraCols && <th>Kategorie</th>}
              {provozovna === 'all' && <th>Provoz</th>}
              <SortableTh col="castka"    label="Částka"    sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} className="text-end" />
              <SortableTh col="splatnost" label="Splatnost" sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} />
              <SortableTh col="odeslatDo" label="Odeslat do" sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} />
              {showExtraCols && <th>Přiřazeno</th>}
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
              const effectiveStav  = localStavy[f.id] ?? f.stav;
              const prirazeniId    = localPrirazeni[f.id] ?? f.prirazenaOsoba ?? '';
              const prirazenaOsoba = SCHVALOVACI_OSOBY.find((o) => o.id === prirazeniId);
              const poSpl    = isPoSplatnosti(f.splatnost);
              const urgentni = isUrgentni(f.splatnost, processingDays);
              const odeslatDo = getOdeslatDo(f.splatnost, processingDays);
              const vybiratelna = effectiveStav === 'schvalena';
              const vybrana = selectedIds.has(f.id);
              const { cls, label } = STAV_META[effectiveStav] ?? STAV_META['nova'];
              const matching = showMatching ? getMatchingData(f.id) : undefined;
              const matchMeta = matching ? MATCHING_META[matching.stav] : null;

              const isActiveRow = f.id === selectedRowId;
              let rowClass = '';
              if (isActiveRow) rowClass = 'table-active';
              else if (vybrana) rowClass = 'table-primary';
              else if (poSpl) rowClass = 'table-danger';
              else if (urgentni) rowClass = 'table-warning';

              return (
                <tr
                  key={f.id}
                  className={rowClass}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onRowClick ? onRowClick(f.id) : (vybiratelna && onToggle(f.id))}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={vybrana}
                      disabled={!vybiratelna}
                      onChange={() => vybiratelna && onToggle(f.id)}
                    />
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-1 flex-wrap">
                      <span className="text-muted fs-12 czk-num">{f.cislo}</span>
                      {f.forma && f.forma !== 'standard' && (
                        <span className={`badge ${FORMA_META[f.forma].cls}`} style={{ fontSize: 9 }}>
                          <iconify-icon icon={FORMA_META[f.forma].icon} className="me-1" style={{ fontSize: 10 }} />
                          {FORMA_META[f.forma].label}
                        </span>
                      )}
                    </div>
                    <div className="text-muted fs-11 czk-num" style={{ color: '#adb5bd' }}>VS: {getVS(f)}</div>
                  </td>
                  <td style={{ width: 220, maxWidth: 220, minWidth: 140 }}>
                    <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
                      <div className="fw-semibold text-truncate" title={f.dodavatel}>
                        {f.dodavatel}
                      </div>
                      {f.poznamka && (
                        <div className="text-muted fs-12 text-truncate" title={f.poznamka}>
                          {f.poznamka}
                        </div>
                      )}
                    </div>
                  </td>
                  {showExtraCols && (
                    <td>
                      <span className={`badge ${f.typDokladu === 'vydana' ? 'bg-purple-subtle text-purple' : 'bg-primary-subtle text-primary'}`}
                        style={f.typDokladu === 'vydana' ? { background: '#8b5cf61a', color: '#8b5cf6' } : {}}>
                        {f.typDokladu === 'vydana' ? 'Vydaná' : 'Přijatá'}
                      </span>
                    </td>
                  )}
                  {showExtraCols && (
                    <td>
                      <span className="badge" style={{ background: KAT_META[f.kategorie].color + '1a', color: KAT_META[f.kategorie].color, fontWeight: 600 }}>
                        {KATEGORIE_LABELS[f.kategorie]}
                      </span>
                    </td>
                  )}
                  {provozovna === 'all' && (
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="rounded-circle d-inline-block"
                          style={{ width: 8, height: 8, background: getProvColor(f.provozovna), flexShrink: 0 }}
                        />
                        <span className="fs-13">{getProvName(f.provozovna)}</span>
                      </div>
                    </td>
                  )}
                  <td className={`text-end fw-bold czk-num ${f.castka < 0 ? 'text-danger' : ''}`}>{fCzk(f.castka)}</td>
                  <td>
                    <span className={poSpl ? 'text-danger fw-bold' : 'text-muted'}>
                      {fDate(f.splatnost)}
                    </span>
                    {poSpl && <div className="text-danger fs-11 fw-bold">PO SPLATNOSTI</div>}
                  </td>
                  <td>
                    <span className={urgentni && !poSpl ? 'text-warning fw-bold' : 'text-muted'}>
                      {fDate(odeslatDo)}
                    </span>
                    {urgentni && !poSpl && (
                      <div className="text-warning fs-11 fw-bold">Dnes!</div>
                    )}
                  </td>
                  {showExtraCols && (
                    <td>
                      {prirazenaOsoba ? (
                        <div className="d-flex align-items-center gap-2">
                          <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold text-white"
                            style={{ width: 24, height: 24, fontSize: 9, background: 'var(--prov-color, #c9911a)' }}>
                            {prirazenaOsoba.avatar}
                          </div>
                          <span className="fs-12 text-nowrap">{prirazenaOsoba.jmeno.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="text-muted fs-12">—</span>
                      )}
                    </td>
                  )}
                  <td>
                    <div className="d-flex align-items-center gap-1">
                      <span className={`badge ${cls}`}>{label}</span>
                      {f.isLocked && (
                        <iconify-icon
                          icon="solar:lock-keyhole-bold-duotone"
                          title="Faktura uzamčena (uzavřené účetní období)"
                          style={{ fontSize: 14, color: '#6f42c1' }}
                        />
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
            <span className="text-danger fw-semibold">červená</span> = po splatnosti
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
