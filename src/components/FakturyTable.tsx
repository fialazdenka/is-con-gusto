// COMPONENT: Faktury Table – výběr k úhradě
// SOURCE: Larkon-like → Card + Table + Checkbox + Badge
// CUSTOM: NO

import type { ProvozovnaId } from '../types';
import type { FakturaStavPlatby, FakturaKategorie } from '../platbyData';
import {
  getFakturyForProvozovna,
  getOdeslatDo,
  isPoSplatnosti,
  isUrgentni,
  isSplatneVObdobi,
  KATEGORIE_LABELS,
  PROCESSING_DAYS_DEFAULT,
} from '../platbyData';
import { PROVOZOVNY, fCzk, fDate } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  periodOd: string;
  periodDo: string;
  kategorieFilter: string;
  stavFilter: string;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  processingDays: number;
}

const STAV_META: Record<FakturaStavPlatby, { cls: string; label: string }> = {
  nova:        { cls: 'badge-neutral', label: 'Nová' },
  'ke-schvaleni': { cls: 'badge-warn', label: 'Ke schválení' },
  schvalena:   { cls: 'badge-ok',     label: 'Schválená' },
  odeslana:    { cls: 'badge-info',   label: 'Odeslaná' },
  zaplacena:   { cls: 'badge-ok',     label: 'Zaplacená' },
};

const KAT_META: Record<FakturaKategorie, { color: string }> = {
  zbozi:   { color: '#3b82f6' },
  energie: { color: '#f97316' },
  sluzby:  { color: '#8b5cf6' },
  najem:   { color: '#ec4899' },
  vyplaty: { color: '#14b8a6' },
  ostatni: { color: '#94a3b8' },
};

export default function FakturyTable({
  provozovna,
  periodOd,
  periodDo,
  kategorieFilter,
  stavFilter,
  selectedIds,
  onToggle,
  onToggleAll,
  processingDays,
}: Props) {
  const vsechny = getFakturyForProvozovna(provozovna);

  // Filtrování
  const zobrazene = vsechny.filter((f) => {
    if (f.stav === 'zaplacena' || f.stav === 'odeslana') return false;
    if (kategorieFilter !== 'all' && f.kategorie !== kategorieFilter) return false;
    if (stavFilter === 'schvalena' && f.stav !== 'schvalena') return false;
    if (stavFilter === 'neschvalena' && f.stav !== 'nova' && f.stav !== 'ke-schvaleni') return false;
    if (stavFilter === 'po-splatnosti' && !isPoSplatnosti(f.splatnost)) return false;
    if (stavFilter === 'tydni' && !isSplatneVObdobi(f.splatnost, periodOd, periodDo)) return false;
    return true;
  });

  // Pouze schválené se dají vybrat k platbě
  const vybiratelne = zobrazene.filter((f) => f.stav === 'schvalena');
  const vsechnyVybrany =
    vybiratelne.length > 0 && vybiratelne.every((f) => selectedIds.has(f.id));
  const nekteréVybrany = vybiratelne.some((f) => selectedIds.has(f.id));

  const getProvName  = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.shortName ?? id;
  const getProvColor = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.color ?? '#94a3b8';

  return (
    // COMPONENT: Card + Table (s Checkbox, Badge, ProgressBar urgence)
    // SOURCE: Larkon-like
    // CUSTOM: NO
    <div className="card">
      <div className="card-header">
        <div className="card-title-wrap">
          <div className="card-title">Faktury k úhradě</div>
          <div className="card-sub">
            {zobrazene.length} faktur · {vybiratelne.filter((f) => selectedIds.has(f.id)).length} vybráno
          </div>
        </div>
        <div className="card-actions">
          {nekteréVybrany && (
            <button
              className="btn btn-ghost btn-sm c-2"
              onClick={() => onToggleAll([])}
            >
              Zrušit výběr
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() =>
              onToggleAll(
                vsechnyVybrany ? [] : vybiratelne.map((f) => f.id)
              )
            }
            disabled={vybiratelne.length === 0}
          >
            {vsechnyVybrany ? 'Odznačit vše' : 'Vybrat vše schválené'}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={vsechnyVybrany}
                  ref={(el) => {
                    if (el) el.indeterminate = nekteréVybrany && !vsechnyVybrany;
                  }}
                  onChange={() =>
                    onToggleAll(vsechnyVybrany ? [] : vybiratelne.map((f) => f.id))
                  }
                  disabled={vybiratelne.length === 0}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th>Číslo</th>
              <th>Dodavatel</th>
              <th>Kategorie</th>
              {provozovna === 'all' && <th>Provoz</th>}
              <th className="td-r">Částka</th>
              <th>Splatnost</th>
              <th>Odeslat do</th>
              <th>Stav</th>
            </tr>
          </thead>
          <tbody>
            {zobrazene.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>
                  Žádné faktury neodpovídají filtru
                </td>
              </tr>
            )}
            {zobrazene.map((f) => {
              const poSpl    = isPoSplatnosti(f.splatnost);
              const urgentni = isUrgentni(f.splatnost, processingDays);
              const odeslatDo = getOdeslatDo(f.splatnost, processingDays);
              const vybiratelna = f.stav === 'schvalena';
              const vybrana = selectedIds.has(f.id);
              const { cls, label } = STAV_META[f.stav];

              let rowBg = '';
              if (vybrana) rowBg = '#eff6ff';
              else if (poSpl) rowBg = '#fff8f8';
              else if (urgentni) rowBg = '#fffbf0';

              return (
                <tr
                  key={f.id}
                  style={{ background: rowBg, cursor: vybiratelna ? 'pointer' : 'default' }}
                  onClick={() => vybiratelna && onToggle(f.id)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={vybrana}
                      disabled={!vybiratelna}
                      onChange={() => vybiratelna && onToggle(f.id)}
                      style={{ cursor: vybiratelna ? 'pointer' : 'default' }}
                    />
                  </td>
                  <td className="td-mono" style={{ fontSize: 11, color: 'var(--text-2)' }}>
                    {f.cislo}
                  </td>
                  <td>
                    <div className="fw-600" style={{ fontSize: 13 }}>{f.dodavatel}</div>
                    {f.poznamka && (
                      <div className="fs-xs c-2">{f.poznamka}</div>
                    )}
                  </td>
                  <td>
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
                      <div className="flex items-center gap-2">
                        <div className="prov-dot" style={{ background: getProvColor(f.provozovna) }} />
                        <span className="fs-sm">{getProvName(f.provozovna)}</span>
                      </div>
                    </td>
                  )}
                  <td className="td-r td-mono fw-700">{fCzk(f.castka)}</td>
                  <td>
                    <span className={poSpl ? 'c-err fw-700' : 'c-2'}>
                      {fDate(f.splatnost)}
                    </span>
                    {poSpl && (
                      <div className="fs-xs c-err fw-600">PO SPLATNOSTI</div>
                    )}
                  </td>
                  <td>
                    <span
                      className={urgentni ? 'fw-700' : 'c-2'}
                      style={{ color: urgentni && !poSpl ? 'var(--c-warn)' : undefined }}
                    >
                      {fDate(odeslatDo)}
                    </span>
                    {urgentni && !poSpl && (
                      <div className="fs-xs fw-600" style={{ color: 'var(--c-warn)' }}>
                        Dnes!
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${cls}`}>{label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer - zpracování dnů */}
      <div className="card-footer">
        <div className="fs-xs c-2">
          Datum odeslání = splatnost −{' '}
          <strong>{processingDays} dny</strong> (zpracování banky) ·{' '}
          <span className="c-warn fw-600">oranžová</span> = odeslat dnes ·{' '}
          <span className="c-err fw-600">červená</span> = po splatnosti
        </div>
        <div className="flex items-center gap-2">
          <span className="fs-xs c-2">Nastavit zprac. dny:</span>
          <select
            className="select"
            style={{ padding: '2px 24px 2px 8px', fontSize: 11 }}
            value={processingDays}
            disabled
          >
            {[1, 2, 3].map((d) => (
              <option key={d} value={d}>{d} {d === 1 ? 'den' : 'dny'}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
