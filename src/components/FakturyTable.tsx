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
import type { FakturaStavPlatby, FakturaKategorie, TypDokladu } from '../platbyData';
import {
  getFakturyForProvozovna,
  getOdeslatDo,
  isPoSplatnosti,
  isUrgentni,
  isSplatneVObdobi,
  KATEGORIE_LABELS,
  PROCESSING_DAYS_DEFAULT,
  SCHVALOVACI_OSOBY,
} from '../platbyData';
import { PROVOZOVNY, fCzk, fDate } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  periodOd: string;
  periodDo: string;
  kategorieFilter: string;
  stavFilter: string;
  typDokladu: TypDokladu | 'all';
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  processingDays: number;
  localStavy?: Record<string, FakturaStavPlatby>;
  localPrirazeni?: Record<string, string>;
  onRowClick?: (id: string) => void;
}

// Larkon Bootstrap badge mapping
const STAV_META: Record<FakturaStavPlatby, { cls: string; label: string }> = {
  nova:           { cls: 'bg-secondary-subtle text-secondary', label: 'Nová' },
  'ke-schvaleni': { cls: 'bg-warning-subtle text-warning',     label: 'Ke schválení' },
  schvalena:      { cls: 'bg-success-subtle text-success',     label: 'Schválená' },
  zamitnuta:      { cls: 'bg-danger-subtle text-danger',       label: 'Zamítnutá' },
  zastavena:      { cls: 'bg-danger-subtle text-danger',       label: 'Zastavená' },
  odeslana:       { cls: 'bg-info-subtle text-info',           label: 'Odeslaná' },
  zaplacena:      { cls: 'bg-success-subtle text-success',     label: 'Zaplacená' },
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
  typDokladu,
  selectedIds,
  onToggle,
  onToggleAll,
  processingDays,
  localStavy = {},
  localPrirazeni = {},
  onRowClick,
}: Props) {
  const vsechny = getFakturyForProvozovna(provozovna);

  const zobrazene = vsechny.filter((f) => {
    if (f.stav === 'zaplacena' || f.stav === 'odeslana') return false;
    if (stavFilter === 'zamitnuta') return f.stav === 'zamitnuta';
    if (f.stav === 'zamitnuta') return false; // skryté ve výchozím pohledu
    if (stavFilter === 'zastavena' && f.stav !== 'zastavena') return false;
    if (typDokladu !== 'all' && f.typDokladu !== typDokladu) return false;
    if (kategorieFilter !== 'all' && f.kategorie !== kategorieFilter) return false;
    if (stavFilter === 'schvalena' && f.stav !== 'schvalena') return false;
    if (stavFilter === 'neschvalena' && f.stav !== 'nova' && f.stav !== 'ke-schvaleni') return false;
    if (stavFilter === 'po-splatnosti' && !isPoSplatnosti(f.splatnost)) return false;
    if (stavFilter === 'tydni' && !isSplatneVObdobi(f.splatnost, periodOd, periodDo)) return false;
    return true;
  });

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
          Faktury k úhradě
          <small className="text-muted fw-normal ms-2 fs-13">
            {zobrazene.length} faktur · {vybiratelne.filter((f) => selectedIds.has(f.id)).length} vybráno
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
              <th>Číslo</th>
              <th>Dodavatel</th>
              <th>Typ dokladu</th>
              <th>Kategorie</th>
              {provozovna === 'all' && <th>Provoz</th>}
              <th className="text-end">Částka</th>
              <th>Splatnost</th>
              <th>Odeslat do</th>
              <th>Přiřazeno</th>
              <th>Stav</th>
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

              let rowClass = '';
              if (vybrana) rowClass = 'table-primary';
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
                  <td className="text-muted fs-12 font-monospace">{f.cislo}</td>
                  <td>
                    <div className="fw-semibold">{f.dodavatel}</div>
                    {f.poznamka && <div className="text-muted fs-12">{f.poznamka}</div>}
                  </td>
                  <td>
                    <span className={`badge ${f.typDokladu === 'vydana' ? 'bg-purple-subtle text-purple' : 'bg-primary-subtle text-primary'}`}
                      style={f.typDokladu === 'vydana' ? { background: '#8b5cf61a', color: '#8b5cf6' } : {}}>
                      {f.typDokladu === 'vydana' ? 'Vydaná' : 'Přijatá'}
                    </span>
                  </td>
                  <td>
                    {/* Dynamic color badge – kategorie (custom color) */}
                    <span
                      className="badge"
                      style={{
                        background: KAT_META[f.kategorie].color + '1a',
                        color: KAT_META[f.kategorie].color,
                        fontWeight: 600,
                      }}
                    >
                      {KATEGORIE_LABELS[f.kategorie]}
                    </span>
                  </td>
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
                  <td className="text-end fw-bold font-monospace">{fCzk(f.castka)}</td>
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
                  <td>
                    {prirazenaOsoba ? (
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold text-white"
                          style={{ width: 24, height: 24, fontSize: 9, background: '#c9911a' }}
                        >
                          {prirazenaOsoba.avatar}
                        </div>
                        <span className="fs-12 text-nowrap">{prirazenaOsoba.jmeno.split(' ')[0]}</span>
                      </div>
                    ) : (
                      <span className="text-muted fs-12">—</span>
                    )}
                  </td>
                  <td>
                    {/* SOURCE: Larkon .badge.bg-{color}-subtle.text-{color} */}
                    <span className={`badge ${cls}`}>{label}</span>
                  </td>
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
