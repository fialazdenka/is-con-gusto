// COMPONENT: Balance Panel – kalkulátor dostupnosti prostředků (sticky)
// SOURCE: Larkon _card.scss + Bootstrap utilities
// CUSTOM: YES – live přepočet s logikou budoucích tržeb (gastro doménová logika)
//
// Larkon class mapping:
//   .card (position sticky)            → sticky kalkukátor
//   .card-header                       → hlavička
//   .card-title / small.text-muted     → titulek + počet vybráno
//   .card-body                         → tělo
//   .card-footer                       → CTA tlačítko
//   .btn.btn-primary.w-100             → odeslat tlačítko
//   .border-top (separator)            → oddělovač
//   .badge.bg-success-subtle / .bg-danger-subtle → status výsledku
//   CUSTOM: FutureRevMode selector (radio-like buttons) – gastro specifické

import type { ProvozovnaId } from '../types';
import type { FutureRevMode } from '../platbyData';
import {
  FAKTURY_PLATBY,
  OSTATNI_PLATBY,
  getZustatek,
  getCekajiciKarty,
  getOdhadZbytek,
} from '../platbyData';
import { fCzk } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  periodOd: string;
  periodDo: string;
  selectedFaIds: Set<string>;
  selectedOstatniIds: Set<string>;
  futureRevMode: FutureRevMode;
  onFutureRevChange: (m: FutureRevMode) => void;
  onPotvrdit: () => void;
}

export default function BalancePanel({
  provozovna,
  periodOd,
  periodDo,
  selectedFaIds,
  selectedOstatniIds,
  futureRevMode,
  onFutureRevChange,
  onPotvrdit,
}: Props) {
  const zustatek = getZustatek(provozovna);

  const vybrFaktury = FAKTURY_PLATBY.filter(
    (f) => selectedFaIds.has(f.id) && (provozovna === 'all' || f.provozovna === provozovna)
  );
  const sumaFaktury = vybrFaktury.reduce((s, f) => s + f.castka, 0);

  const vybrOstatni = OSTATNI_PLATBY.filter(
    (o) =>
      selectedOstatniIds.has(o.id) &&
      (provozovna === 'all' || o.provozovna === provozovna) &&
      o.datum >= periodOd &&
      o.datum <= periodDo
  );
  const sumaOstatni = vybrOstatni.reduce((s, o) => s + o.castka, 0);

  const cekajiciKarty   = futureRevMode !== 'off' ? getCekajiciKarty(provozovna) : 0;
  const odhadZbytek     = futureRevMode === 'budouci-plus' ? getOdhadZbytek(provozovna) : 0;

  const bezTrzeb         = zustatek - sumaFaktury - sumaOstatni;
  const sBudoucimi       = bezTrzeb + cekajiciKarty;
  const sBudoucimiPlus   = sBudoucimi + odhadZbytek;

  const vysledek =
    futureRevMode === 'budouci-plus' ? sBudoucimiPlus :
    futureRevMode === 'budouci'      ? sBudoucimi     : bezTrzeb;

  const dostatek     = vysledek >= 0;
  const pocetVybrano = vybrFaktury.length + vybrOstatni.length;

  return (
    <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Kalkulátor ── SOURCE: Larkon .card ─────────── */}
      <div className="card" style={{ borderTop: `4px solid ${dostatek ? '#198754' : '#dc3545'}` }}>
        <div className="card-header">
          <h5 className="card-title mb-0">
            Dostupnost prostředků
            <small className="text-muted fw-normal ms-2 fs-13">{pocetVybrano} položek vybráno</small>
          </h5>
        </div>

        <div className="card-body pt-3">
          {/* Řádky kalkulace */}
          <BalRow label="Zůstatek na účtu"       value={zustatek}       color="#0dcaf0" bold />
          <BalRow label={`Faktury (${vybrFaktury.length})`} value={-sumaFaktury} color={sumaFaktury > 0 ? '#dc3545' : '#6c757d'} />
          <BalRow label={`Ostatní platby (${vybrOstatni.length})`} value={-sumaOstatni} color={sumaOstatni > 0 ? '#dc3545' : '#6c757d'} />

          <div className="border-top my-2" />
          <BalRow label="Bez zahrnutí tržeb" value={bezTrzeb} color={bezTrzeb >= 0 ? '#198754' : '#dc3545'} bold />

          {futureRevMode !== 'off' && (
            <>
              <BalRow label="+ Tržby z karet (čekající)" value={cekajiciKarty} color="#0dcaf0" indent />
              <BalRow label="= S budoucími tržbami" value={sBudoucimi} color={sBudoucimi >= 0 ? '#198754' : '#dc3545'} bold />
            </>
          )}

          {futureRevMode === 'budouci-plus' && (
            <>
              <BalRow label="+ Odhadované tržby (zbytek týdne)" value={odhadZbytek} color="#7c3aed" indent />
              <div className="border-top my-2" />
              <BalRow label="= S budoucími tržbami+" value={sBudoucimiPlus} color={sBudoucimiPlus >= 0 ? '#198754' : '#dc3545'} bold />
            </>
          )}

          {/* Výsledný status – SOURCE: Bootstrap .alert-success/.alert-danger */}
          <div
            className={`alert ${dostatek ? 'alert-success' : 'alert-danger'} text-center mt-3 mb-0 py-3`}
          >
            <div className="fw-bold font-monospace" style={{ fontSize: 24 }}>
              {dostatek ? '+' : ''}{fCzk(vysledek)}
            </div>
            <div className="fw-semibold fs-12 mt-1">
              {dostatek ? '✓ Prostředky dostačují' : '⚠ Nedostatek prostředků'}
            </div>
          </div>
        </div>

        {/* CTA – SOURCE: Larkon .card-footer + Bootstrap .btn.btn-primary.w-100 */}
        <div className="card-footer d-flex flex-column gap-2 py-3">
          <button
            className={`btn w-100 ${pocetVybrano > 0 ? 'btn-primary' : 'btn-secondary'}`}
            onClick={onPotvrdit}
            disabled={pocetVybrano === 0}
          >
            {pocetVybrano === 0
              ? 'Vyberte faktury k úhradě'
              : `Odeslat ${pocetVybrano} plateb do banky →`}
          </button>
          {!dostatek && pocetVybrano > 0 && (
            <div className="text-danger fw-semibold fs-12 text-center" style={{ lineHeight: 1.4 }}>
              ⚠ Systém upozorní na nedostatek. Potvrzení bude možné i přesto.
            </div>
          )}
        </div>
      </div>

      {/* ── Toggle budoucích tržeb ──────────────────────────────
          COMPONENT: Future Revenue Selector
          SOURCE: Larkon card + CUSTOM radio-like buttons (gastro logika)
          CUSTOM: YES – doménová logika zahrnutí budoucích tržeb */}
      <div className="card">
        <div className="card-body py-3">
          <div className="text-uppercase fw-semibold text-muted fs-11 mb-3">
            Zahrnout budoucí tržby
          </div>
          <div className="lk-custom">
            <div className="lk-custom-label">CUSTOM: gastro cashflow logika – budoucí tržby</div>
            <div className="d-flex flex-column gap-2 pt-1">
              {(
                [
                  { value: 'off' as FutureRevMode,           label: 'Pouze zůstatek',    desc: 'Jen aktuální stav účtu',                      color: '#6c757d' },
                  { value: 'budouci' as FutureRevMode,       label: 'Budoucí přijaté platby',     desc: 'Zůstatek + kartové platby v cestě',            color: '#0dcaf0' },
                  { value: 'budouci-plus' as FutureRevMode,  label: 'Budoucí přijaté platby+',    desc: 'Zůstatek + karty + odhad zbytku týdne',       color: '#7c3aed' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onFutureRevChange(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px',
                    borderRadius: 'var(--bs-border-radius)',
                    border: `1px solid ${futureRevMode === opt.value ? opt.color : 'var(--bs-border-color)'}`,
                    background: futureRevMode === opt.value ? opt.color + '12' : 'white',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.14s',
                  }}
                >
                  <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${opt.color}`, background: futureRevMode === opt.value ? opt.color : 'transparent', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: futureRevMode === opt.value ? opt.color : 'var(--bs-body-color)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#adb5bd', marginTop: 1 }}>{opt.desc}</div>
                  </div>
                  {futureRevMode === opt.value && (
                    <span style={{ marginLeft: 'auto', color: opt.color, fontWeight: 700, fontSize: 12 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {futureRevMode === 'budouci-plus' && (
            <div className="mt-2 p-2 rounded fs-11" style={{ background: '#f5f3ff', color: '#5b21b6', lineHeight: 1.5 }}>
              Odhad = průměr stejného týdne minulého roku + 3 předchozí týdny aktuálního roku
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helper: jeden řádek kalkulace ────────────────────────────

function BalRow({
  label, value, color, bold, indent,
}: {
  label: string; value: number; color: string; bold?: boolean; indent?: boolean;
}) {
  const prefix = value > 0 ? '+' : value < 0 ? '−' : '';
  const absVal = Math.abs(value);
  return (
    <div
      className="d-flex justify-content-between align-items-center"
      style={{ padding: '8px 0', paddingLeft: indent ? 12 : 0, fontSize: bold ? 13 : 12 }}
    >
      <span style={{ color: '#6c757d', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ color, fontWeight: bold ? 700 : 600, fontVariantNumeric: 'tabular-nums' }}>
        {value === 0 ? '—' : `${prefix} ${fCzk(absVal)}`}
      </span>
    </div>
  );
}
