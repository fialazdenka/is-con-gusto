// ─────────────────────────────────────────────────────────────
// COMPONENT: Topbar — Header / Top Navigation Bar
// SOURCE:    Larkon-like → TopBar + SegmentedControl + Dropdowns
// CUSTOM:    NO
//
// LARKON MAPPING:
//   Root:        <header className="app-topbar"> (Larkon)
//   Hamburger:   <button className="btn btn-sm btn-ghost-secondary"
//                  onClick={toggleSidebar}> s Lucide <Menu size={20}>
//   Breadcrumb:  <Breadcrumb className="mb-0">
//                  <BreadcrumbItem>CG</BreadcrumbItem>
//                  <BreadcrumbItem active>{section}</BreadcrumbItem>
//   SegControl:  Bootstrap <ButtonGroup size="sm"> s <ToggleButton>
//                  — použít pro provozovna / mode / period přepínač
//                  NEBO Larkon <SegmentedControl items={[...]} value={...}>
//   Notification: Larkon <NotificationDropdown> s číslem badge
//   Search:      Larkon <TopbarSearch> nebo <Form.Control type="search">
//   User:        Larkon <ProfileDropdown user={...}> — zobrazí Avatar,
//                  jméno, roli, menu s položkami
// ─────────────────────────────────────────────────────────────

import type { AppState, ProvozovnaId, DataMode, Period, SidebarSection } from '../types';
import { PROVOZOVNY } from '../data';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

const SECTION_LABELS: Record<SidebarSection, string> = {
  dashboard:   'Dashboard',
  trzby:       'Tržby',
  zavierky:    'Denní závěrky',
  provozovny:  'Provozovny',
  cashflow:    'Cashflow',
  faktury:     'Faktury',
  platby:      'Platby',
  reporty:     'Reporty',
  nastaveni:   'Nastavení',
  komponenty:  'Mapa komponent',
};

const PERIOD_OPTS: { value: Period; label: string }[] = [
  { value: '7d',  label: '7 dní' },
  { value: '30d', label: '30 dní' },
  { value: 'mtd', label: 'Tento měsíc' },
];

export default function Topbar({ state, update }: Props) {
  const { selectedSection, selectedProvozovna, dataMode, period, sidebarCollapsed } = state;

  const handleToggleSidebar = () => update({ sidebarCollapsed: !sidebarCollapsed });

  const handleProvozovnaChange = (id: ProvozovnaId) =>
    update({ selectedProvozovna: id });

  const handleModeToggle = (m: DataMode) => update({ dataMode: m });

  const handlePeriodChange = (p: Period) => update({ period: p });

  const isDashboard = selectedSection === 'dashboard' || selectedSection === 'trzby';

  return (
    <header className="topbar">
      {/* Sidebar toggle */}
      <button className="tb-toggle" onClick={handleToggleSidebar} title="Přepnout boční panel">
        <span>☰</span>
      </button>

      {/* Breadcrumb */}
      <div className="tb-breadcrumb">
        <span>CG</span>
        <span className="tb-sep">›</span>
        <span className="tb-breadcrumb-active">{SECTION_LABELS[selectedSection]}</span>
      </div>

      {/* Provozovna switcher – segment */}
      {isDashboard && (
        <div className="segment" style={{ marginLeft: 12 }}>
          <button
            className={`seg-btn${selectedProvozovna === 'all' ? ' active' : ''}`}
            onClick={() => handleProvozovnaChange('all')}
          >
            Vše (CG)
          </button>
          {PROVOZOVNY.map((p) => (
            <button
              key={p.id}
              className={`seg-btn${selectedProvozovna === p.id ? ' active' : ''}`}
              onClick={() => handleProvozovnaChange(p.id as ProvozovnaId)}
            >
              {p.shortName}
            </button>
          ))}
        </div>
      )}

      {/* Live / Závěrka toggle */}
      {isDashboard && (
        <div className="segment">
          <button
            className={`seg-btn${dataMode === 'live' ? ' active' : ''}`}
            onClick={() => handleModeToggle('live')}
            style={dataMode === 'live' ? { color: 'var(--c-live)' } : {}}
          >
            ● Live
          </button>
          <button
            className={`seg-btn${dataMode === 'zavierka' ? ' active' : ''}`}
            onClick={() => handleModeToggle('zavierka')}
            style={dataMode === 'zavierka' ? { color: 'var(--c-info)' } : {}}
          >
            ◉ Závěrka
          </button>
        </div>
      )}

      {/* Period selector */}
      {isDashboard && (
        <div className="segment">
          {PERIOD_OPTS.map((o) => (
            <button
              key={o.value}
              className={`seg-btn${period === o.value ? ' active' : ''}`}
              onClick={() => handlePeriodChange(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <div className="tb-spacer" />

      {/* Right actions */}
      <div className="tb-actions">
        <button className="tb-icon-btn" title="Vyhledat">
          <span>⌕</span>
        </button>
        <button className="tb-icon-btn" title="Notifikace">
          <span>🔔</span>
          <span className="notif-dot" />
        </button>
        <div className="tb-user">
          <div className="tb-user-avatar">MK</div>
          <div className="tb-user-info">
            <div className="tb-user-name">Martin Kovář</div>
            <div className="tb-user-role">Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
}
