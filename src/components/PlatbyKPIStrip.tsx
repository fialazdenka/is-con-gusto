// COMPONENT: KPI Strip – Platba faktur
// SOURCE: Larkon _card.scss + _avatar.scss (stat card overflow-hidden pattern)
// CUSTOM: NO
//
// Larkon class mapping:
//   .row.g-3                              → grid obal
//   .col-md-3                             → sloupec
//   .card.overflow-hidden.h-100           → stat karta
//   .card-body / .row.align-items-center  → obsah
//   .avatar-md.bg-soft-{color}.rounded    → ikonka
//   .avatar-title.fs-28.text-{color}      → ikonka uvnitř
//   .text-muted.mb-0.text-truncate.fs-13  → label
//   .h3.text-dark.mt-1.mb-0              → hodnota
//   .badge.bg-{color}-subtle.text-{color} → badge stav
//   .card-footer.py-2.bg-light.bg-opacity-50 → patička

import type { ProvozovnaId } from '../types';
import {
  getFakturyForProvozovna,
  getZustatek,
  isPoSplatnosti,
  isSplatneVObdobi,
  TYDEN_OD,
  TYDEN_DO,
} from '../platbyData';
import { fCzk } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  periodOd: string;
  periodDo: string;
}

export default function PlatbyKPIStrip({ provozovna, periodOd, periodDo }: Props) {
  const faktury   = getFakturyForProvozovna(provozovna);
  const zustatek  = getZustatek(provozovna);

  const schvalene = faktury.filter(
    (f) => f.stav === 'schvalena' || f.stav === 'ke-schvaleni'
  );
  const poSplatnosti = faktury.filter(
    (f) => f.stav !== 'zaplacena' && f.stav !== 'odeslana' && isPoSplatnosti(f.splatnost)
  );
  const splatneVObdobi = faktury.filter(
    (f) =>
      f.stav !== 'zaplacena' &&
      f.stav !== 'odeslana' &&
      isSplatneVObdobi(f.splatnost, periodOd, periodDo) &&
      !isPoSplatnosti(f.splatnost)
  );
  const neschvalene = faktury.filter(
    (f) => f.stav === 'nova' || f.stav === 'ke-schvaleni'
  );

  const sumSchvalene = schvalene.reduce((s, f) => s + f.castka, 0);
  const sumPoSplat   = poSplatnosti.reduce((s, f) => s + f.castka, 0);
  const sumVObdobi   = splatneVObdobi.reduce((s, f) => s + f.castka, 0);

  void TYDEN_OD; void TYDEN_DO;

  return (
    // SOURCE: Larkon .row.g-3 stat cards pattern
    <div className="row g-3 mb-4">

      {/* Zůstatek na účtu */}
      <div className="col-md-3">
        <div className="card overflow-hidden h-100">
          <div className="card-body">
            <div className="d-flex align-items-start gap-3">
              <div className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center">
                <iconify-icon icon="solar:wallet-bold-duotone" className="avatar-title text-warning" style={{ fontSize: 26 }} />
              </div>
              <div className="flex-grow-1 text-end">
                <p className="text-muted mb-0 text-truncate fs-13">Zůstatek na účtu</p>
                <h3 className="text-dark mt-1 mb-0 czk-num">{fCzk(zustatek)}</h3>
              </div>
            </div>
          </div>
          <div className="card-footer py-2 bg-light bg-opacity-50">
            <span className="text-muted fs-12">
              {provozovna === 'all' ? 'Celkem všechny účty · ' : ''}17. 4. 2026
            </span>
          </div>
        </div>
      </div>

      {/* Schválené k úhradě */}
      <div className="col-md-3">
        <div className="card overflow-hidden h-100">
          <div className="card-body">
            <div className="d-flex align-items-start gap-3">
              <div className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center">
                <iconify-icon icon="solar:check-circle-bold-duotone" className="avatar-title text-success" style={{ fontSize: 26 }} />
              </div>
              <div className="flex-grow-1 text-end">
                <p className="text-muted mb-0 text-truncate fs-13">Schválené k úhradě</p>
                <h3 className="text-dark mt-1 mb-0 czk-num">{fCzk(sumSchvalene)}</h3>
              </div>
            </div>
          </div>
          <div className="card-footer py-2 bg-light bg-opacity-50">
            <span className="badge bg-success-subtle text-success">{schvalene.length} faktur</span>
          </div>
        </div>
      </div>

      {/* Po splatnosti */}
      <div className="col-md-3">
        <div className="card overflow-hidden h-100">
          <div className="card-body">
            <div className="d-flex align-items-start gap-3">
              <div className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center">
                <iconify-icon icon="solar:danger-triangle-bold-duotone" className="avatar-title text-danger" style={{ fontSize: 26 }} />
              </div>
              <div className="flex-grow-1 text-end">
                <p className="text-muted mb-0 text-truncate fs-13">Po splatnosti</p>
                <h3 className="text-danger mt-1 mb-0 czk-num">{fCzk(sumPoSplat)}</h3>
              </div>
            </div>
          </div>
          <div className="card-footer py-2 bg-light bg-opacity-50">
            <span className="badge bg-danger-subtle text-danger me-2">{poSplatnosti.length} faktur</span>
            {poSplatnosti.length > 0 && (
              <span className="text-danger fw-semibold fs-12">Okamžitá akce</span>
            )}
          </div>
        </div>
      </div>

      {/* Splatné v období */}
      <div className="col-md-3">
        <div className="card overflow-hidden h-100">
          <div className="card-body">
            <div className="d-flex align-items-start gap-3">
              <div className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center">
                <iconify-icon icon="solar:calendar-bold-duotone" className="avatar-title text-info" style={{ fontSize: 26 }} />
              </div>
              <div className="flex-grow-1 text-end">
                <p className="text-muted mb-0 text-truncate fs-13">Splatné v období</p>
                <h3 className="text-warning mt-1 mb-0 czk-num">{fCzk(sumVObdobi)}</h3>
              </div>
            </div>
          </div>
          <div className="card-footer py-2 bg-light bg-opacity-50">
            <span className="badge bg-warning-subtle text-warning me-2">{splatneVObdobi.length} faktur</span>
            {neschvalene.length > 0 && (
              <span className="badge bg-secondary-subtle text-secondary">{neschvalene.length} neschváleno</span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

export { TYDEN_OD, TYDEN_DO };
