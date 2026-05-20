// COMPONENT: KPI Strip – Dashboard tržby (Dnes / Včera / Týden / Měsíc)
// SOURCE: Larkon _card.scss + _avatar.scss stat card pattern
// CUSTOM: YES – data z TrzbyView logiky (getTotalForPeriod, getMesicVsLY)

import {
  getTotalForPeriod,
  getPrevForPeriod,
  getMesicVsLY,
  fCzk,
  pctChange,
} from '../data';
import type { ProvozovnaId } from '../types';

const TYDEN_DNI = 5; // Po–Čtv (dnů proběhlých k 17.4.)

interface Props {
  provozovna: ProvozovnaId;
  period?: string; // nepoužíváme, zachováváme kompatibilitu
}

export default function KPIStrip({ provozovna }: Props) {
  const dnes       = getTotalForPeriod(provozovna, 'dnes');
  const vcera      = getTotalForPeriod(provozovna, 'vcera');
  const vceraComp  = getPrevForPeriod(provozovna, 'vcera');
  const vceraChng  = pctChange(vcera.celkem, vceraComp.celkem);
  const tyden      = getTotalForPeriod(provozovna, 'tyden');
  const tydenComp  = getPrevForPeriod(provozovna, 'tyden');
  const tydenCompSameDni = Math.round(tydenComp.celkem * TYDEN_DNI / 7);
  const tydenChng  = pctChange(tyden.celkem, tydenCompSameDni);
  const tydenPred  = Math.round((tyden.celkem / TYDEN_DNI) * 7);
  const mesic      = getMesicVsLY(provozovna);
  const pocetDni   = mesic.cur2026?.pocetDni ?? 17;
  const ly2025Full = mesic.ly2025?.sumaCelyMesic ?? (mesic.ly2025 ? mesic.ly2025.prumerDen * 30 : 0);
  const mesicChng  = mesic.cur2026 && ly2025Full > 0 ? pctChange(mesic.cur2026.sumaDoDnes, ly2025Full) : 0;
  const mesicPred  = mesic.cur2026 ? Math.round((mesic.cur2026.sumaDoDnes / pocetDni) * 30) : 0;

  return (
    <div className="row g-3 mb-3">

      {/* Dnes */}
      <div className="col-sm-6 col-xl-3">
        <div className="card overflow-hidden h-100" style={{ borderTop: '3px solid var(--prov-color, #c9911a)' }}>
          <div className="card-body pb-2">
            <div className="d-flex align-items-start justify-content-between mb-1">
              <p className="text-muted mb-0 fs-12 text-uppercase fw-semibold">Dnes</p>
              <span className="badge bg-success-subtle text-success d-flex align-items-center gap-1 fs-11">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'trzby-pulse 1.8s ease-in-out infinite' }} />
                Live
              </span>
            </div>
            <h3 className="text-dark mb-0 czk-num text-nowrap">{fCzk(dnes.celkem)}</h3>
            <p className="text-muted fs-11 mb-0 mt-1">17.4.2026 · čtvrtek</p>
          </div>
          <div className="card-footer py-2 bg-light bg-opacity-50">
            <span className="text-muted fs-12">Průběžná hodnota</span>
          </div>
        </div>
      </div>

      {/* Včera */}
      <div className="col-sm-6 col-xl-3">
        <div className="card overflow-hidden h-100">
          <div className="card-body pb-2">
            <div className="d-flex align-items-start justify-content-between mb-1">
              <p className="text-muted mb-0 fs-12 text-uppercase fw-semibold d-flex align-items-center gap-1">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'trzby-pulse 1.8s ease-in-out infinite' }} />
                Včera
              </p>
              <span className={`badge ${vceraChng >= 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} fs-11`}>
                {vceraChng >= 0 ? '+' : ''}{vceraChng.toFixed(1).replace('.', ',')} %
              </span>
            </div>
            <h3 className="text-dark mb-0 czk-num text-nowrap">{fCzk(vcera.celkem)}</h3>
            <p className="text-muted fs-11 mb-0 mt-1">vs. středa 9.4.2026</p>
          </div>
          <div className="card-footer py-2 bg-light bg-opacity-50">
            <span className="text-muted fs-12">{fCzk(vceraComp.celkem)} minulý týden</span>
          </div>
        </div>
      </div>

      {/* Tento týden */}
      <div className="col-sm-6 col-xl-3">
        <div className="card overflow-hidden h-100">
          <div className="card-body pb-2">
            <div className="d-flex align-items-start justify-content-between mb-1">
              <p className="text-muted mb-0 fs-12 text-uppercase fw-semibold">Tento týden</p>
              <span className={`badge ${tydenChng >= 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} fs-11`}>
                {tydenChng >= 0 ? '+' : ''}{tydenChng.toFixed(1).replace('.', ',')} %
              </span>
            </div>
            <h3 className="text-dark mb-0 czk-num text-nowrap">{fCzk(tyden.celkem)}</h3>
            <p className="text-muted fs-11 mb-0 mt-1">13.4. – 17.4. · {TYDEN_DNI} dní</p>
          </div>
          <div className="card-footer py-2 bg-light bg-opacity-50">
            <span className="text-muted fs-12">Predikce: </span>
            <span className="fw-semibold fs-12 czk-num" style={{ color: '#7c3aed' }}>~{fCzk(tydenPred)}</span>
          </div>
        </div>
      </div>

      {/* Duben 2026 */}
      <div className="col-sm-6 col-xl-3">
        <div className="card overflow-hidden h-100">
          <div className="card-body pb-2">
            <div className="d-flex align-items-start justify-content-between mb-1">
              <p className="text-muted mb-0 fs-12 text-uppercase fw-semibold">Duben 2026</p>
              <span className={`badge ${mesicChng >= 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} fs-11`}>
                {mesicChng >= 0 ? '+' : ''}{mesicChng.toFixed(1).replace('.', ',')} %
              </span>
            </div>
            <h3 className="text-dark mb-0 czk-num text-nowrap">{mesic.cur2026 ? fCzk(mesic.cur2026.sumaDoDnes) : '—'}</h3>
            <p className="text-muted fs-11 mb-0 mt-1">vs. duben 2025 (celý měsíc)</p>
          </div>
          <div className="card-footer py-2 bg-light bg-opacity-50">
            <span className="text-muted fs-12">Predikce: </span>
            <span className="fw-semibold fs-12 czk-num" style={{ color: '#7c3aed' }}>~{fCzk(mesicPred)}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
