// COMPONENT: Potvrzení platby – Modal dialog
// SOURCE: Larkon _modal.scss + Bootstrap modal component
// CUSTOM: NO
//
// Larkon class mapping:
//   .modal.show.d-block              → modal wrapper
//   .modal-backdrop.fade.show        → backdrop overlay
//   .modal-dialog.modal-dialog-centered → centrování
//   .modal-content                   → obsah
//   .modal-header                    → hlavička s .btn-close
//   .modal-body                      → tělo
//   .modal-footer                    → patička s tlačítky
//   .alert.alert-danger              → nedostatek upozornění
//   .table.table-sm                  → přehled plateb
//   .btn.btn-secondary / .btn-primary / .btn-danger → akce

import { FAKTURY_PLATBY, OSTATNI_PLATBY, getZustatek } from '../platbyData';
import type { ProvozovnaId } from '../types';
import { fCzk, fDate } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  selectedFaIds: Set<string>;
  vysledekBalance: number;
  onConfirm: () => void;
  onClose: () => void;
}

export default function PotvrditModal({
  provozovna,
  selectedFaIds,
  vysledekBalance,
  onConfirm,
  onClose,
}: Props) {
  const faktury = FAKTURY_PLATBY.filter(
    (f) => selectedFaIds.has(f.id) && (provozovna === 'all' || f.provozovna === provozovna)
  );

  const sumaFa    = faktury.reduce((s, f) => s + f.castka, 0);
  const sumaTotal = sumaFa;
  const nedostatek = vysledekBalance < 0;
  const zustatek   = getZustatek(provozovna);

  return (
    <>
      {/* SOURCE: Bootstrap .modal-backdrop.fade.show */}
      <div className="modal-backdrop fade show" onClick={onClose} style={{ zIndex: 400 }} />

      {/* SOURCE: Bootstrap .modal.show.d-block */}
      <div className="modal show d-block" style={{ zIndex: 500 }} role="dialog">
        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540 }}>
          <div className="modal-content">

            {/* SOURCE: Bootstrap .modal-header */}
            <div className="modal-header">
              <div>
                <h5 className="modal-title">
                  {nedostatek ? (
                    <span className="text-danger">
                      <iconify-icon icon="solar:danger-triangle-bold-duotone" className="me-2" />
                      Upozornění – nedostatek prostředků
                    </span>
                  ) : 'Potvrdit odeslání plateb'}
                </h5>
                <small className="text-muted">
                  Platby budou odeslány do banky · faktury se označí jako „Odesláno k úhradě"
                </small>
              </div>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>

            {/* SOURCE: Bootstrap .modal-body */}
            <div className="modal-body" style={{ maxHeight: '55vh', overflowY: 'auto' }}>

              {/* Nedostatek warning – SOURCE: Bootstrap .alert.alert-danger */}
              {nedostatek && (
                <div className="alert alert-danger mb-3">
                  Na účtu je <strong>{fCzk(zustatek)}</strong>, platby celkem <strong>{fCzk(sumaTotal)}</strong>.
                  Rozdíl: <strong>{fCzk(Math.abs(vysledekBalance))}</strong> chybí.
                  Systém umožní odeslání, ale upozorňuje na možný nedostatek krytí.
                </div>
              )}

              {/* Shrnutí – SOURCE: Bootstrap .row.g-3 */}
              <div className="row g-3 mb-4">
                <div className="col-12">
                  <SummaryBox label="Faktury k odeslání" count={faktury.length} suma={sumaFa} color="#ff6c2f" />
                </div>
              </div>

              {/* Faktury list – SOURCE: Bootstrap .table.table-sm */}
              {faktury.length > 0 && (
                <>
                  <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Faktury k odeslání</div>
                  <div className="table-responsive mb-3">
                    <table className="table table-sm table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Dodavatel</th>
                          <th>Splatnost</th>
                          <th className="text-end">Částka</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faktury.map((f) => (
                          <tr key={f.id}>
                            <td className="fw-semibold">{f.dodavatel}</td>
                            <td className="text-muted">{fDate(f.splatnost)}</td>
                            <td className="text-end czk-num fw-semibold">{fCzk(f.castka)}</td>
                          </tr>
                        ))}
                        <tr className="fw-bold table-light">
                          <td colSpan={2}>Faktury celkem</td>
                          <td className="text-end czk-num" style={{ color: '#ff6c2f' }}>{fCzk(sumaFa)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}

            </div>

            {/* Celkový součet */}
            <div className="px-3 py-2 bg-light border-top border-bottom">
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">Celkem k odeslání</span>
                <span className="fw-bold czk-num fs-5">{fCzk(sumaTotal)}</span>
              </div>
            </div>

            {/* SOURCE: Bootstrap .modal-footer */}
            <div className="modal-footer flex-column gap-2 align-items-stretch">
              <div className="d-flex gap-3">
                <button className="btn btn-secondary flex-fill" onClick={onClose}>
                  Zpět – upravit výběr
                </button>
                <button
                  className={`btn flex-fill ${nedostatek ? 'btn-danger' : 'btn-primary'}`}
                  onClick={onConfirm}
                >
                  {nedostatek
                    ? `⚠ Odeslat i přes nedostatek (${fCzk(sumaTotal)})`
                    : `✓ Potvrdit odeslání (${fCzk(sumaTotal)})`}
                </button>
              </div>
              {nedostatek && (
                <div className="text-muted fs-11 text-center">
                  Potvrzením beru na vědomí, že na účtu nemusí být dostatek prostředků.
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

function SummaryBox({ label, count, suma, color }: { label: string; count: number; suma: number; color: string }) {
  return (
    <div className="p-3 rounded" style={{ background: color + '0d', border: `1px solid ${color}33` }}>
      <div className="fw-semibold fs-11 mb-1" style={{ color }}>{label}</div>
      <div className="fw-bold czk-num fs-5">{fCzk(suma)}</div>
      <div className="text-muted fs-12 mt-1">
        {count} {count === 1 ? 'položka' : count < 5 ? 'položky' : 'položek'}
      </div>
    </div>
  );
}
