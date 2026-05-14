// COMPONENT: Dashboard View – hlavní obsah
// SOURCE: Larkon _page-title.scss + Bootstrap layout
// CUSTOM: NO

import type { AppState } from '../types';
import KPIStrip from './KPIStrip';
import AlertStrip from './AlertStrip';
import TrzbyWidget from './TrzbyWidget';
import ProvozonySummary from './ProvozonySummary';
import CashflowPreview from './CashflowPreview';
import PohledavkyWidget from './PohledavkyWidget';
import PlatbyKPIStrip from './PlatbyKPIStrip';
import { TYDEN_OD, TYDEN_DO } from '../platbyData';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
  onOpenDrawer: (id: string) => void;
}

export default function DashboardView({ state, update, onOpenDrawer }: Props) {
  const { selectedProvozovna, period } = state;

  function navTo(section: typeof state.selectedSection) {
    update({ selectedSection: section });
  }

  return (
    <>
      {/* Alert strip – závěrky s chybou / čekající */}
      <AlertStrip
        provozovna={selectedProvozovna}
        onNavigate={() => navTo('zavierky')}
      />

      {/* ── Tržby KPI – Dnes / Včera / Týden / Měsíc ── */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span className="text-uppercase fw-semibold text-muted fs-11">Tržby</span>
        <button className="btn btn-link btn-sm p-0 fs-12" onClick={() => navTo('trzby')}>
          Detailní přehled →
        </button>
      </div>
      <KPIStrip provozovna={selectedProvozovna} period={period} />

      {/* ── Platby KPI – Zůstatek / Schváleno / Po splatnosti / Splatné ── */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span className="text-uppercase fw-semibold text-muted fs-11">Platby</span>
        <button className="btn btn-link btn-sm p-0 fs-12" onClick={() => navTo('platby')}>
          Správa plateb →
        </button>
      </div>
      <PlatbyKPIStrip
        provozovna={selectedProvozovna}
        periodOd={TYDEN_OD}
        periodDo={TYDEN_DO}
      />

      {/* ── Graf tržeb + Cashflow ── */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <TrzbyWidget
            provozovna={selectedProvozovna}
            period={period}
            onDrillDown={(id) => update({ selectedProvozovna: id })}
          />
        </div>
        <div className="col-lg-4">
          <CashflowPreview onNavigate={() => navTo('cashflow')} />
        </div>
      </div>

      {/* ── Provozovny + Pohledávky ── */}
      <div className="row g-4 mb-4">
        <div className="col-lg-7">
          <ProvozonySummary
            selectedProvozovna={selectedProvozovna}
            onOpenDrawer={onOpenDrawer}
          />
        </div>
        <div className="col-lg-5">
          <PohledavkyWidget
            provozovna={selectedProvozovna}
            onNavigate={() => navTo('pohledavky')}
          />
        </div>
      </div>
    </>
  );
}
