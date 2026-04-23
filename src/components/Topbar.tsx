// COMPONENT: Topbar – Header Navigation Bar
// SOURCE: Larkon resources/views/layouts/partials/topbar.blade.php
//         + structure/_topbar.scss
// CUSTOM: YES
//   – dvouřádkový layout (.topbar-rows / .topbar-row-main / .topbar-row-filters) – není v Larkon
//   – segment controls (.lk-segment / .lk-seg-btn) pro Live/Závěrka + období – v produkci Bootstrap ButtonGroup
//   – provozovna <select> v topbaru (Larkon má dropdown, ne select)
//   – onMenuToggle prop – mobil vs. desktop chování hamburgeru
//
// Larkon class mapping:
//   header.topbar           → topbar container (výška: --bs-topbar-height = 100px)
//   .container-fluid.h-100  → inner container na celou výšku
//   .button-toggle-menu     → hamburger tlačítko (desktop: collapse sidebar; mobil: overlay)
//   .topbar-button          → icon buttons (zvonec, nastavení, uživatel)
//   .position-absolute.topbar-badge → notifikační číslice
//   .app-search             → search form (skrytý na mobilu)
//   CUSTOM: .topbar-rows    → flex column pro 2 řádky
//   CUSTOM: .topbar-row-main / .topbar-row-filters → hlavní řádek + filtry
//   CUSTOM: .lk-segment     → segment control (není v Larkon)
//   CUSTOM: .topbar-divider → oddělovač mezi segmenty

import type { AppState, ProvozovnaId, DataMode, Period, SidebarSection } from '../types';
import { PROVOZOVNY } from '../data';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
  onMenuToggle: () => void;
}

const SECTION_LABELS: Record<SidebarSection, string> = {
  dashboard:  'Dashboard',
  trzby:      'Tržby',
  zavierky:   'Denní závěrky',
  provozovny: 'Provozovny',
  cashflow:   'Cashflow',
  faktury:     'Faktury',
  pohledavky:  'Pohledávky',
  platby:      'Platby',
  reporty:    'Reporty',
  nastaveni:  'Nastavení',
  komponenty: 'Mapa komponent',
};

const PERIOD_OPTS: { value: Period; label: string }[] = [
  { value: 'dnes',         label: 'Dnes' },
  { value: 'vcera',        label: 'Včera' },
  { value: 'tyden',        label: 'Tento týden' },
  { value: 'minuly-tyden', label: 'Minulý týden' },
  { value: 'minuly-mesic', label: 'Minulý měsíc' },
  { value: 'rok',          label: 'Aktuální rok' },
];

export default function Topbar({ state, update, onMenuToggle }: Props) {
  const { selectedSection, selectedProvozovna, dataMode, period } = state;
  const isDashboard = selectedSection === 'dashboard' || selectedSection === 'trzby';

  return (
    <header className="topbar">
      <div className="container-fluid h-100">
        <div className="topbar-rows">

          {/* ── Řádek 1: navigace ───────────────────────────── */}
          <div className="topbar-row-main">

            {/* Levá strana */}
            <div className="d-flex align-items-center gap-2">
              {/* Hamburger – SOURCE: Larkon .button-toggle-menu */}
              <div className="topbar-item">
                <button
                  type="button"
                  className="button-toggle-menu"
                  onClick={onMenuToggle}
                >
                  <iconify-icon icon="solar:hamburger-menu-broken" className="align-middle" style={{ fontSize: 26 }} />
                </button>
              </div>

              {/* Název sekce */}
              <div className="topbar-item">
                <h4 className="fw-bold topbar-button pe-none text-uppercase mb-0 fs-14">
                  {SECTION_LABELS[selectedSection]}
                </h4>
              </div>
            </div>

            {/* Pravá strana – SOURCE: Larkon topbar actions */}
            <div className="d-flex align-items-center gap-1">
              {/* Search */}
              <form className="app-search d-none d-md-block">
                <div className="position-relative">
                  <input type="search" className="form-control" placeholder="Hledat..." autoComplete="off" />
                  <iconify-icon
                    icon="solar:magnifer-linear"
                    className="search-widget-icon"
                    style={{ fontSize: 20, position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: 'var(--bs-secondary-color)', pointerEvents: 'none', display: 'flex' }}
                  />
                </div>
              </form>

              {/* Notifications */}
              <div className="topbar-item">
                <button type="button" className="topbar-button position-relative">
                  <iconify-icon icon="solar:bell-bing-bold-duotone" className="align-middle" style={{ fontSize: 26 }} />
                  <span className="position-absolute topbar-badge fs-10 translate-middle badge bg-danger rounded-pill">
                    3
                  </span>
                </button>
              </div>

              {/* Settings */}
              <div className="topbar-item d-none d-md-flex">
                <button type="button" className="topbar-button">
                  <iconify-icon icon="solar:settings-bold-duotone" className="align-middle" style={{ fontSize: 26 }} />
                </button>
              </div>

              {/* User */}
              <div className="topbar-item">
                <button type="button" className="topbar-button d-flex align-items-center gap-2">
                  <div
                    className="avatar-sm rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                    style={{ background: 'var(--bs-primary)', width: 32, height: 32, fontSize: 12 }}
                  >
                    MK
                  </div>
                  <span className="d-none d-lg-block fw-semibold fs-13">Martin Kovář</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Řádek 2: filtry (jen dashboard / tržby) ─────── */}
          {isDashboard && (
            <div className="topbar-row-filters">

              {/* Provozovna switcher – SOURCE: Bootstrap .form-select.form-select-sm */}
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto', minWidth: 160 }}
                value={selectedProvozovna}
                onChange={(e) => update({ selectedProvozovna: e.target.value as ProvozovnaId })}
              >
                <option value="all">Všechny provozovny</option>
                <optgroup label="Aktivní">
                  {PROVOZOVNY.filter((p) => p.status === 'active').map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Plánované">
                  {PROVOZOVNY.filter((p) => p.status === 'inactive').map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              </select>

              <div className="topbar-divider" />

              {/* Live / Závěrka – CUSTOM: segment control */}
              <div className="lk-segment">
                <button
                  className={`lk-seg-btn${dataMode === 'live' ? ' active' : ''}`}
                  onClick={() => update({ dataMode: 'live' as DataMode })}
                >
                  ● Live
                </button>
                <button
                  className={`lk-seg-btn${dataMode === 'zavierka' ? ' active' : ''}`}
                  onClick={() => update({ dataMode: 'zavierka' as DataMode })}
                >
                  ◉ Závěrka
                </button>
              </div>

              <div className="topbar-divider" />

              {/* Presety období – CUSTOM: segment control */}
              <div className="lk-segment">
                {PERIOD_OPTS.map((o) => (
                  <button
                    key={o.value}
                    className={`lk-seg-btn${period === o.value ? ' active' : ''}`}
                    onClick={() => update({ period: o.value })}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

            </div>
          )}

        </div>
      </div>
    </header>
  );
}
