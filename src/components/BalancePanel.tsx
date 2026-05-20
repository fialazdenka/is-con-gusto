import type { ProvozovnaId } from '../types';
import type { FutureRevMode } from '../platbyData';
import {
  FAKTURY_PLATBY,
  OSTATNI_PLATBY,
  BUDOUCI_TRZBY,
  getBankovniUctyForProvozovna,
  getPravniEntita,
  ENTITA_LABEL,
} from '../platbyData';
import { PROVOZOVNY, fCzk } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  periodOd: string;
  periodDo: string;
  selectedFaIds: Set<string>;
  futureRevMode: FutureRevMode;
  onFutureRevChange: (m: FutureRevMode) => void;
  onPotvrdit: () => void;
}

export default function BalancePanel({
  provozovna,
  periodOd,
  periodDo,
  selectedFaIds,
  futureRevMode,
  onFutureRevChange,
  onPotvrdit,
}: Props) {
  const ucty    = getBankovniUctyForProvozovna(provozovna);
  const uctyKc  = ucty.filter((u) => !u.mena || u.mena === 'CZK');
  const zustatek = uctyKc.reduce((s, u) => s + u.zustatek, 0);

  const vybrFaktury = FAKTURY_PLATBY.filter(
    (f) => selectedFaIds.has(f.id) && (provozovna === 'all' || f.provozovna === provozovna)
  );
  const sumaFaktury = vybrFaktury.reduce((s, f) => s + f.castka, 0);

  const vybrOstatni = OSTATNI_PLATBY.filter(
    (o) =>
      (provozovna === 'all' || o.provozovna === provozovna) &&
      o.datum >= periodOd &&
      o.datum <= periodDo
  );
  const sumaOstatni = vybrOstatni.reduce((s, o) => s + o.castka, 0);

  // Budoucí tržby per provozovna (jen CZK účty)
  const budouciData = BUDOUCI_TRZBY.filter(
    (b) => provozovna === 'all' || b.provozovna === provozovna
  ).filter((b) => uctyKc.some((u) => u.provozovna === b.provozovna));

  const sumaKarty  = futureRevMode.karty ? budouciData.reduce((s, b) => s + b.cekajiciKarty, 0) : 0;
  const sumaOdhad  = futureRevMode.odhad ? budouciData.reduce((s, b) => s + b.odhadZbytek, 0) : 0;

  const bezTrzeb = zustatek - sumaFaktury - sumaOstatni;
  const vysledek = bezTrzeb + sumaKarty + sumaOdhad;

  const dostatek     = vysledek >= 0;
  const pocetVybrano = vybrFaktury.length;

  const entityFaktur    = new Set(vybrFaktury.map((f) => getPravniEntita(f.provozovna)));
  const entityUctu      = new Set(uctyKc.map((u) => getPravniEntita(u.provozovna)));
  const entityKonflikty = [...entityFaktur].filter((e) => !entityUctu.has(e));

  return (
    <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Platební účty ─────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">Platební účty</h5>
        </div>
        <div className="card-body py-2 px-3">
          {ucty.length === 0 && (
            <div className="text-muted fs-13 py-2">Žádný účet pro tuto provozovnu</div>
          )}
          {ucty.map((ucetRow, i) => {
            const prov = PROVOZOVNY.find((p) => p.id === ucetRow.provozovna);
            const isEur = ucetRow.mena === 'EUR';
            const isLast = i === ucty.length - 1;
            return (
              <div
                key={ucetRow.cisloUctu}
                className="d-flex align-items-center justify-content-between py-2"
                style={{ borderBottom: isLast ? 'none' : '1px solid var(--bs-border-color)' }}
              >
                <div className="d-flex align-items-center gap-2 min-width-0">
                  {prov && (
                    <span className="rounded-circle flex-shrink-0"
                      style={{ width: 8, height: 8, background: prov.color, display: 'inline-block' }} />
                  )}
                  <div className="min-width-0">
                    <div className="fw-semibold fs-13 text-truncate">{ucetRow.nazev}</div>
                    <div className="text-muted fs-11 czk-num">{ucetRow.cisloUctu}</div>
                    <div className="text-muted fs-11">{ucetRow.banka}</div>
                  </div>
                </div>
                <div className="text-end flex-shrink-0 ms-3">
                  <div className="czk-num fw-bold fs-13">
                    {isEur
                      ? `€ ${ucetRow.zustatek.toLocaleString('cs-CZ')}`
                      : fCzk(ucetRow.zustatek)}
                  </div>
                  {isEur && (
                    <span className="badge bg-warning-subtle text-warning fs-10 mt-1">EUR</span>
                  )}
                </div>
              </div>
            );
          })}
          {uctyKc.length > 1 && (
            <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-1">
              <span className="text-muted fs-12">Celkem CZK</span>
              <span className="czk-num fw-bold fs-13">{fCzk(zustatek)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Kalkulátor dostupnosti ────────────────────────── */}
      <div className="card" style={{ borderTop: `4px solid ${dostatek ? '#198754' : '#dc3545'}` }}>
        <div className="card-header">
          <h5 className="card-title mb-0">
            Dostupnost prostředků
            <small className="text-muted fw-normal ms-2 fs-13">{pocetVybrano} faktur vybráno</small>
          </h5>
          {provozovna === 'all' && (
            <div className="text-warning fs-11 mt-1">⚠ Souhrnný přehled – odeslání vyžaduje výběr provozovny</div>
          )}
        </div>

        {entityKonflikty.length > 0 && (
          <div className="alert alert-warning d-flex align-items-start gap-2 mx-3 mt-3 mb-0 py-2 px-3">
            <iconify-icon icon="solar:danger-triangle-bold-duotone" style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }} />
            <div className="fs-12">
              <strong>Upozornění – rozdílné s.r.o.</strong>
              <div className="mt-1">
                Vybrané faktury patří {entityKonflikty.map((e) => <strong key={e}>{ENTITA_LABEL[e]}</strong>).reduce((a, b) => <>{a}, {b}</>)},
                {' '}ale platíte z účtu jiné právní entity.
              </div>
            </div>
          </div>
        )}

        <div className="card-body pt-3">
          {/* Toggle budoucích tržeb – dvě nezávislé volby */}
          <div className="mb-3">
            <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Zahrnout budoucí tržby</div>
            <div className="d-flex gap-1">
              {([
                { key: 'karty' as const, label: 'Karty v cestě', color: '#0dcaf0' },
                { key: 'odhad' as const, label: 'Odhad tržeb',   color: '#7c3aed' },
              ]).map((opt) => {
                const active = futureRevMode[opt.key];
                return (
                  <button
                    key={opt.key}
                    onClick={() => onFutureRevChange({ ...futureRevMode, [opt.key]: !active })}
                    style={{
                      flex: '1 1 auto',
                      padding: '5px 8px',
                      borderRadius: 'var(--bs-border-radius)',
                      border: `1px solid ${active ? opt.color : 'var(--bs-border-color)'}`,
                      background: active ? opt.color + '18' : 'transparent',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: active ? 700 : 500,
                      color: active ? opt.color : 'var(--bs-secondary-color)',
                      textAlign: 'center' as const,
                      transition: 'all 0.12s',
                      whiteSpace: 'nowrap' as const,
                    }}
                  >
                    {active ? '✓ ' : ''}{opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-top mb-2" />

          {uctyKc.map((u) => {
            const prov = PROVOZOVNY.find((p) => p.id === u.provozovna);
            return (
              <BalRow
                key={u.cisloUctu}
                label={`Zůstatek ${prov?.shortName ?? u.nazev}`}
                value={u.zustatek}
                color="#0dcaf0"
                dot={prov?.color}
              />
            );
          })}
          {uctyKc.length > 1 && (
            <>
              <div className="border-top my-1" />
              <BalRow label="Zůstatek celkem" value={zustatek} color="#0dcaf0" bold />
            </>
          )}
          <div className="border-top my-2" />
          <BalRow label={`Faktury (${vybrFaktury.length})`}            value={-sumaFaktury}  color={sumaFaktury  > 0 ? '#dc3545' : '#6c757d'} />
          <BalRow label={`Automatické platby (${vybrOstatni.length})`} value={-sumaOstatni}  color={sumaOstatni > 0 ? '#dc3545' : '#6c757d'} />

          <div className="border-top my-2" />
          <BalRow label="Bez zahrnutí tržeb" value={bezTrzeb} color={bezTrzeb >= 0 ? '#198754' : '#dc3545'} bold />

          {futureRevMode.karty && (
            <>
              {budouciData.length > 1
                ? budouciData.map((b) => {
                    const prov = PROVOZOVNY.find((p) => p.id === b.provozovna);
                    return <BalRow key={b.provozovna} label={`+ Karty ${prov?.shortName ?? b.provozovna}`} value={b.cekajiciKarty} color="#0dcaf0" indent dot={prov?.color} />;
                  })
                : <BalRow label="+ Karty v cestě" value={sumaKarty} color="#0dcaf0" indent />
              }
              {budouciData.length > 1 && (
                <BalRow label="+ Karty celkem" value={sumaKarty} color="#0dcaf0" bold />
              )}
            </>
          )}

          {futureRevMode.odhad && (
            <>
              {budouciData.length > 1
                ? budouciData.map((b) => {
                    const prov = PROVOZOVNY.find((p) => p.id === b.provozovna);
                    return <BalRow key={b.provozovna} label={`+ Odhad ${prov?.shortName ?? b.provozovna}`} value={b.odhadZbytek} color="#7c3aed" indent dot={prov?.color} />;
                  })
                : <BalRow label="+ Odhad tržeb (zbytek týdne)" value={sumaOdhad} color="#7c3aed" indent />
              }
              {budouciData.length > 1 && (
                <BalRow label="+ Odhad celkem" value={sumaOdhad} color="#7c3aed" bold />
              )}
            </>
          )}

          {(futureRevMode.karty || futureRevMode.odhad) && (
            <>
              <div className="border-top my-2" />
              <BalRow label="= Celkem s budoucími tržbami" value={vysledek} color={vysledek >= 0 ? '#198754' : '#dc3545'} bold />
            </>
          )}

          <div className={`alert ${dostatek ? 'alert-success' : 'alert-danger'} text-center mt-3 mb-0 py-3`}>
            <div className="fw-bold czk-num" style={{ fontSize: 24 }}>
              {dostatek ? '+' : ''}{fCzk(vysledek)}
            </div>
            <div className="fw-semibold fs-12 mt-1">
              {dostatek ? '✓ Prostředky dostačují' : '⚠ Nedostatek prostředků'}
            </div>
          </div>
        </div>

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

function BalRow({ label, value, color, bold, indent, dot }: {
  label: string; value: number; color: string; bold?: boolean; indent?: boolean; dot?: string;
}) {
  const prefix = value > 0 ? '+' : value < 0 ? '−' : '';
  const absVal = Math.abs(value);
  return (
    <div
      className="d-flex justify-content-between align-items-center"
      style={{ padding: '6px 0', paddingLeft: indent ? 12 : 0, fontSize: bold ? 13 : 12 }}
    >
      <span className="d-flex align-items-center gap-2" style={{ color: '#6c757d', fontWeight: bold ? 600 : 400 }}>
        {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />}
        {label}
      </span>
      <span style={{ color, fontWeight: bold ? 700 : 600, fontVariantNumeric: 'tabular-nums' }}>
        {value === 0 ? '—' : `${prefix} ${fCzk(absVal)}`}
      </span>
    </div>
  );
}
