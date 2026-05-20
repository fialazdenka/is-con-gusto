// COMPONENT: Cashflow Preview — Summary Card + Stat List
// SOURCE: Larkon _card.scss + Bootstrap utilities
// CUSTOM: NO
//
// Larkon class mapping:
//   .card                                     → karta
//   .card-header                              → hlavička
//   .card-body                                → tělo
//   .p-3.bg-info.bg-opacity-10.rounded        → zůstatek highlight blok
//   .row.g-3                                  → 2-slot grid (po splatnosti / čekající)
//   .p-3.bg-danger.bg-opacity-10.rounded      → po splatnosti blok
//   .p-3.bg-warning.bg-opacity-10.rounded     → čekající blok
//   .d-flex.justify-content-between.border-bottom.py-2 → pohyb řádek
//   .text-uppercase.fw-semibold.text-muted.fs-11 → sekce titulek

import { CASHFLOW_ITEMS, FAKTURY, fCzk, fDate } from '../data';
import { getZustatek } from '../platbyData';

const ZUSTATEK_UCET = getZustatek('all');

interface Props {
  onNavigate: () => void;
}

export default function CashflowPreview({ onNavigate }: Props) {
  const poSplatnosti = FAKTURY.filter((f) => f.stav === 'po-splatnosti');
  const cekajici     = FAKTURY.filter((f) => f.stav === 'ceka');

  const sumaPoSplatnosti = poSplatnosti.reduce((s, f) => s + f.castka, 0);
  const sumaCekajici     = cekajici.reduce((s, f) => s + f.castka, 0);

  return (
    <div className="card h-100">
      {/* SOURCE: Larkon .card-header */}
      <div className="card-header d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0">
          Cashflow &amp; Faktury
          <small className="text-muted fw-normal ms-2 fs-13">Stav k dnešnímu dni</small>
        </h5>
        <button className="btn btn-light btn-sm" onClick={onNavigate}>
          Detail →
        </button>
      </div>

      <div className="card-body">
        {/* Zůstatek – SOURCE: Bootstrap .p-3.bg-info.bg-opacity-10.rounded */}
        <div className="p-3 bg-info bg-opacity-10 rounded mb-3 d-flex align-items-center justify-content-between">
          <div>
            <div className="text-muted fs-12 mb-1">Zůstatek na účtu</div>
            <h3 className="text-info fw-bold czk-num mb-0 text-nowrap">{fCzk(ZUSTATEK_UCET)}</h3>
          </div>
          <span className="badge bg-info-subtle text-info">Aktuální</span>
        </div>

        {/* Faktury stats – SOURCE: Bootstrap .row.g-3 */}
        <div className="row g-3 mb-3">
          <div className="col-6">
            <div className="p-3 bg-danger bg-opacity-10 rounded">
              <div className="text-danger fw-semibold fs-12">Po splatnosti</div>
              <div className="h5 fw-bold czk-num text-danger mb-1 text-nowrap">{fCzk(sumaPoSplatnosti)}</div>
              <div className="text-muted fs-12">{poSplatnosti.length} faktura</div>
            </div>
          </div>
          <div className="col-6">
            <div className="p-3 bg-warning rounded">
              <div className="text-white fw-semibold fs-12">Čekající platby</div>
              <div className="h5 fw-bold czk-num text-white mb-1 text-nowrap">{fCzk(sumaCekajici)}</div>
              <div className="fs-12" style={{ color: 'rgba(255,255,255,0.75)' }}>{cekajici.length} faktury</div>
            </div>
          </div>
        </div>

        {/* Recent cashflow items */}
        <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Poslední pohyby</div>
        {CASHFLOW_ITEMS.slice(0, 4).map((item) => (
          <div key={item.id} className="d-flex justify-content-between align-items-center border-bottom py-3">
            <div className="d-flex align-items-center gap-2">
              <iconify-icon
                icon={item.typ === 'prijem' ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'}
                className={item.typ === 'prijem' ? 'text-success' : 'text-muted'}
              />
              <span className="fs-13">{item.popis}</span>
            </div>
            <div className="text-end">
              <div
                className={`fw-semibold czk-num fs-13 text-nowrap ${item.typ === 'prijem' ? 'text-success' : ''}`}
              >
                {item.typ === 'prijem' ? '+' : '−'} {fCzk(item.castka)}
              </div>
              <div className="text-muted fs-11">{fDate(item.datum)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
