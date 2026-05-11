// COMPONENT: Dashboard View – hlavní obsah
// SOURCE: Larkon _page-title.scss + Bootstrap layout
// CUSTOM: NO
//
// Larkon class mapping:
//   .page-title-box             → page header row
//   .row.g-4.mb-4               → 2-1 grid (ProvozonySummary + CashflowPreview)
//   .col-md-8 / .col-md-4       → poměr sloupců

import type { AppState } from '../types';
import KPIStrip from './KPIStrip';
import AlertStrip from './AlertStrip';
import TrzbyWidget from './TrzbyWidget';
import ProvozonySummary from './ProvozonySummary';
import CashflowPreview from './CashflowPreview';
import TrzbyTable from './TrzbyTable';
import PohledavkyWidget from './PohledavkyWidget';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
  onOpenDrawer: (id: string) => void;
}

export default function DashboardView({ state, update, onOpenDrawer }: Props) {
  const { selectedProvozovna, period } = state;

  const now = new Date('2026-04-17');
  const dateStr = now.toLocaleDateString('cs-CZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  function navTo(section: typeof state.selectedSection) {
    update({ selectedSection: section });
  }

  return (
    <>
      {/* ACTION BAR – SOURCE: Larkon .page-title-box (title odstraněn, zobrazen v topbaru) */}
      <div className="page-title-box">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-light btn-sm">Export PDF</button>
          <button className="btn btn-primary btn-sm">Nová závěrka</button>
        </div>
      </div>

      {/* Alert strip – závěrky s chybou / čekající */}
      <AlertStrip
        provozovna={selectedProvozovna}
        onNavigate={() => navTo('zavierky')}
      />

      {/* Hlavní tržby widget */}
      <TrzbyWidget
        provozovna={selectedProvozovna}
        period={period}
        onDrillDown={(id) => update({ selectedProvozovna: id })}
      />

      {/* KPI strip – 4 karty */}
      <KPIStrip provozovna={selectedProvozovna} period={period} />

      {/* Rozpad + cashflow – SOURCE: Bootstrap .row.g-4 */}
      <div className="row g-4 mb-4">
        <div className="col-lg-7">
          <ProvozonySummary
            selectedProvozovna={selectedProvozovna}
            onOpenDrawer={onOpenDrawer}
          />
        </div>
        <div className="col-lg-5">
          <CashflowPreview onNavigate={() => navTo('cashflow')} />
        </div>
      </div>

      {/* Pohledávky + tržby tabulka – SOURCE: Bootstrap .row.g-4 */}
      <div className="row g-4 mb-4">
        <div className="col-lg-5">
          <PohledavkyWidget
            provozovna={selectedProvozovna}
            onNavigate={() => navTo('pohledavky')}
          />
        </div>
        <div className="col-lg-7">
          <TrzbyTable provozovna={selectedProvozovna} />
        </div>
      </div>

    </>
  );
}
