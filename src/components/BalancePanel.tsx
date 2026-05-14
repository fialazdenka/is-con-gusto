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
  BANKOVNI_UCTY,
  getCekajiciKarty,
  getOdhadZbytek,
  getBankovniUcet,
  getPravniEntita,
  ENTITA_LABEL,
} from '../platbyData';
import { PROVOZOVNY, fCzk } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  periodOd: string;
  periodDo: string;
  selectedFaIds: Set<string>;
  selectedOstatniIds: Set<string>;
  futureRevMode: FutureRevMode;
  onFutureRevChange: (m: FutureRevMode) => void;
  onPotvrdit: () => void;
  selectedUctyIds: Set<string>;
  onToggleUcet: (provId: string) => void;
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
  selectedUctyIds,
  onToggleUcet,
}: Props) {
  // Zůstatek = součet vybraných účtů
  const zustatek = BANKOVNI_UCTY
    .filter((u) => selectedUctyIds.has(u.provozovna))
    .reduce((s, u) => s + u.zustatek, 0);

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
  const ucet         = provozovna !== 'all' ? getBankovniUcet(provozovna) : undefined;

  // Kontrola neshody právních entit: faktury vs. platební účty
  const entityFaktur   = new Set(vybrFaktury.map((f) => getPravniEntita(f.provozovna)));
  const entityUctu     = new Set([...selectedUctyIds].map((id) => getPravniEntita(id)));
  const entityKonflikty = [...entityFaktur].filter((e) => !entityUctu.has(e));

  return (
    <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Výběr platebních účtů ────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">Platební účty</h5>
          <small className="text-muted fw-normal">Vyberte, ze kterých účtů platíte</small>
        </div>
        <div className="card-body py-2 px-3">
          {BANKOVNI_UCTY.map((ucetRow) => {
            const prov = PROVOZOVNY.find((p) => p.id === ucetRow.provozovna);
            if (!prov) return null;
            const checked = selectedUctyIds.has(ucetRow.provozovna);
            return (
              <label
                key={ucetRow.provozovna}
                className="d-flex align-items-center gap-2 py-2 platby-ucet-row"
                style={{ cursor: 'pointer', borderBottom: '1px solid var(--bs-border-color)' }}
              >
                <input
                  type="checkbox"
                  className="form-check-input flex-shrink-0 mt-0"
                  checked={checked}
                  onChange={() => onToggleUcet(ucetRow.provozovna)}
                />
                <span className="rounded-circle flex-shrink-0"
                  style={{ width: 8, height: 8, background: prov.color, display: 'inline-block' }} />
                <span className="fw-semibold fs-12 flex-grow-1">{prov.shortName}</span>
                <div className="text-end">
                  <div className="font-monospace fs-12 fw-bold">{fCzk(ucetRow.zustatek)}</div>
                  <div className="text-muted fs-11">{ucetRow.cisloUctu}</div>
                </div>
              </label>
            );
          })}
          {selectedUctyIds.size > 1 && (
            <div className="d-flex justify-content-between align-items-center pt-2">
              <span className="text-muted fs-12">Celkem vybrané účty</span>
              <span className="font-monospace fw-bold fs-13">{fCzk(zustatek)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Kalkulátor ── SOURCE: Larkon .card ─────────── */}
      <div className="card" style={{ borderTop: `4px solid ${dostatek ? '#198754' : '#dc3545'}` }}>
        <div className="card-header">
          <h5 className="card-title mb-0">
            Dostupnost prostředků
            <small className="text-muted fw-normal ms-2 fs-13">{pocetVybrano} položek vybráno</small>
          </h5>
          {ucet && (
            <div className="text-muted fs-11 font-monospace mt-1">{ucet.nazev} · {ucet.cisloUctu}</div>
          )}
          {provozovna === 'all' && (
            <div className="text-warning fs-11 mt-1">⚠ Souhrnný přehled – export plateb vyžaduje výběr provozovny</div>
          )}
        </div>

        {/* Upozornění na neshodné právní entity */}
        {entityKonflikty.length > 0 && (
          <div className="alert alert-warning d-flex align-items-start gap-2 mx-3 mt-3 mb-0 py-2 px-3">
            <iconify-icon icon="solar:danger-triangle-bold-duotone" style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }} />
            <div className="fs-12">
              <strong>Upozornění – rozdílné s.r.o.</strong>
              <div className="mt-1">
                Vybrané faktury patří {entityKonflikty.map((e) => <strong key={e}>{ENTITA_LABEL[e]}</strong>).reduce((a, b) => <>{a}, {b}</>)},
                {' '}ale platíte z účtu jiné právní entity. Zkontrolujte před odesláním.
              </div>
            </div>
          </div>
        )}

        <div className="card-body pt-3">
          {/* Toggle budoucích tržeb – SOURCE: CUSTOM segment, gastro logika */}
          <div className="mb-3">
            <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Zahrnout budoucí tržby</div>
            <div className="d-flex gap-1 flex-wrap">
              {(
                [
                  { value: 'off'          as FutureRevMode, label: 'Jen zůstatek',   desc: 'Aktuální stav účtu',                color: '#6c757d' },
                  { value: 'budouci'      as FutureRevMode, label: '+ Karty v cestě', desc: 'Zůstatek + kartové platby',        color: '#0dcaf0' },
                  { value: 'budouci-plus' as FutureRevMode, label: '+ Odhad tržeb',  desc: 'Zůstatek + karty + odhad týdne',  color: '#7c3aed' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  title={opt.desc}
                  onClick={() => onFutureRevChange(opt.value)}
                  style={{
                    flex: '1 1 auto',
                    padding: '5px 8px',
                    borderRadius: 'var(--bs-border-radius)',
                    border: `1px solid ${futureRevMode === opt.value ? opt.color : 'var(--bs-border-color)'}`,
                    background: futureRevMode === opt.value ? opt.color + '18' : 'transparent',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: futureRevMode === opt.value ? 700 : 500,
                    color: futureRevMode === opt.value ? opt.color : 'var(--bs-secondary-color)',
                    textAlign: 'center',
                    transition: 'all 0.12s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {futureRevMode === 'budouci-plus' && (
              <div className="mt-1 fs-11 text-muted" style={{ lineHeight: 1.4 }}>
                Odhad = průměr stejného týdne min. roku + 3 předchozí týdny
              </div>
            )}
          </div>
          <div className="border-top mb-2" />

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
