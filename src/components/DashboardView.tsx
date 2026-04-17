// COMPONENT: Dashboard View – hlavní obsah
// SOURCE: Larkon-like
// CUSTOM: NO

import type { AppState } from '../types';
import KPIStrip from './KPIStrip';
import AlertStrip from './AlertStrip';
import TrzbyWidget from './TrzbyWidget';
import ProvozonySummary from './ProvozonySummary';
import DenniZavierkyPreview from './DenniZavierkyPreview';
import CashflowPreview from './CashflowPreview';
import TrzbyTable from './TrzbyTable';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
  onOpenDrawer: (id: string) => void;
}

export default function DashboardView({ state, update, onOpenDrawer }: Props) {
  const { selectedProvozovna } = state;

  const now = new Date('2026-04-17');
  const dateStr = now.toLocaleDateString('cs-CZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  function navTo(section: typeof state.selectedSection) {
    update({ selectedSection: section });
  }

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">{dateStr} · přehled za posledních 7 dní</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm">⬇ Export PDF</button>
          <button className="btn btn-primary btn-sm">＋ Nová závěrka</button>
        </div>
      </div>

      {/* ── Vrstva 1: STRATEGICKÝ PŘEHLED ── */}

      {/* Alert strip – závěrky s chybou / čekající */}
      <AlertStrip
        provozovna={selectedProvozovna}
        onNavigate={() => navTo('zavierky')}
      />

      {/* ── Vrstva 1: HLAVNÍ TRŽBY WIDGET ── */}

      {/* Hlavní tržby widget (chart) – nahoře dle zadání */}
      <TrzbyWidget
        provozovna={selectedProvozovna}
        onDrillDown={(id) => update({ selectedProvozovna: id })}
      />

      {/* KPI strip – 4 karty */}
      <KPIStrip provozovna={selectedProvozovna} />

      {/* ── Vrstva 2: OPERATIVA ── */}

      {/* ── Vrstva 3: ROZPAD ── */}

      <div className="grid-2-1 section-gap">
        {/* Rozpad provozoven */}
        <ProvozonySummary
          selectedProvozovna={selectedProvozovna}
          onOpenDrawer={onOpenDrawer}
        />

        {/* Cashflow preview */}
        <CashflowPreview onNavigate={() => navTo('cashflow')} />
      </div>

      {/* ── Vrstva 4: DETAILNÍ TABULKY ── */}

      {/* Denní závěrky preview */}
      <DenniZavierkyPreview
        provozovna={selectedProvozovna}
        onNavigate={() => navTo('zavierky')}
      />

      {/* Tržby detail tabulka */}
      <TrzbyTable provozovna={selectedProvozovna} />
    </>
  );
}
