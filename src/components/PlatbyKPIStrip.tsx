// COMPONENT: KPI Strip – Platba faktur
// SOURCE: Larkon-like → StatisticsWidget
// CUSTOM: NO

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
  const faktury = getFakturyForProvozovna(provozovna);
  const zustatek = getZustatek(provozovna);

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

  const sumSchvalene  = schvalene.reduce((s, f) => s + f.castka, 0);
  const sumPoSplat    = poSplatnosti.reduce((s, f) => s + f.castka, 0);
  const sumVObdobi    = splatneVObdobi.reduce((s, f) => s + f.castka, 0);

  return (
    <div className="grid-4 section-gap">
      {/* Zůstatek */}
      <div className="kpi-card" style={{ '--kpi-accent': '#2563eb' } as React.CSSProperties}>
        <div className="kpi-top">
          <div>
            <div className="kpi-label">Zůstatek na účtu</div>
            <div className="kpi-value" style={{ fontSize: 22 }}>{fCzk(zustatek)}</div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#dbeafe', fontSize: 20 }}>🏦</div>
        </div>
        <div className="kpi-meta">K {new Date('2026-04-17').toLocaleDateString('cs-CZ')}</div>
      </div>

      {/* Schválené k úhradě */}
      <div className="kpi-card" style={{ '--kpi-accent': '#22c55e' } as React.CSSProperties}>
        <div className="kpi-top">
          <div>
            <div className="kpi-label">Schválené k úhradě</div>
            <div className="kpi-value" style={{ fontSize: 22 }}>{fCzk(sumSchvalene)}</div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#dcfce7', fontSize: 20 }}>✓</div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="badge badge-ok">{schvalene.length} faktur</span>
        </div>
      </div>

      {/* Po splatnosti */}
      <div className="kpi-card" style={{ '--kpi-accent': '#dc2626' } as React.CSSProperties}>
        <div className="kpi-top">
          <div>
            <div className="kpi-label">Po splatnosti</div>
            <div className="kpi-value" style={{ fontSize: 22, color: 'var(--c-err)' }}>
              {fCzk(sumPoSplat)}
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#fee2e2', fontSize: 20 }}>⚠</div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="badge badge-err">{poSplatnosti.length} faktur</span>
          {poSplatnosti.length > 0 && (
            <span className="fs-xs c-err fw-600">Okamžitá akce</span>
          )}
        </div>
      </div>

      {/* Splatné v období */}
      <div className="kpi-card" style={{ '--kpi-accent': '#d97706' } as React.CSSProperties}>
        <div className="kpi-top">
          <div>
            <div className="kpi-label">Splatné v období</div>
            <div className="kpi-value" style={{ fontSize: 22, color: 'var(--c-warn)' }}>
              {fCzk(sumVObdobi)}
            </div>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#fef3c7', fontSize: 20 }}>📅</div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="badge badge-warn">{splatneVObdobi.length} faktur</span>
          {neschvalene.length > 0 && (
            <span className="badge badge-neutral">{neschvalene.length} neschváleno</span>
          )}
        </div>
      </div>
    </div>
  );
}

export { TYDEN_OD, TYDEN_DO };
