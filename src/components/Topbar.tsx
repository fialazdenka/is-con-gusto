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

import { useEffect } from 'react';
import type { AppState, ProvozovnaId, Period, SidebarSection } from '../types';
import { PROVOZOVNY } from '../data';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
  onMenuToggle: () => void;
}

const SECTION_LABELS: Record<SidebarSection, string> = {
  dashboard:        'Dashboard',
  trzby:            'Tržby',
  zavierky:         'Denní závěrky',
  provozovny:       'Provozovny',
  cashflow:         'Cashflow',
  dane:             'Daně',
  faktury:          'Faktury',
  // Phase 8.10 (zápis 22. 6. 2026) — Faktury rozdělené na 2 samostatné podsekce
  'faktury-prijate': 'Přijaté faktury',
  'faktury-vydane':  'Vydané faktury',
  pohledavky:       'Pohledávky',
  platby:           'Platby',
  banka:            'Banka',
  'trvale-prikazy': 'Trvalé příkazy',
  uvery:            'Úvěry',
  poplatky:         'Poplatky',
  karty:            'Platební karty',
  qerko:            'Qerko',
  gopay:            'GoPay',
  sodexo:           'Sodexo',
  reporty:          'Reporty',
  nastaveni:        'Nastavení',
  komponenty:       'Mapa komponent',
  kod:              'Kód',
};

// Drobečková navigace – rodič sekce + label pro navigaci zpět
// Phase 1 restrukturalizace: Ekonomika (tržby/závěrky/faktury/pohledávky/cashflow) vs. Finance (banka a podsekce + platby)
const BREADCRUMB_PARENT: Partial<Record<SidebarSection, { label: string; section: SidebarSection }>> = {
  trzby:            { label: 'Ekonomika', section: 'dashboard' },
  zavierky:         { label: 'Ekonomika', section: 'dashboard' },
  faktury:          { label: 'Ekonomika', section: 'dashboard' },
  'faktury-prijate':{ label: 'Ekonomika', section: 'dashboard' },
  'faktury-vydane': { label: 'Ekonomika', section: 'dashboard' },
  pohledavky:       { label: 'Ekonomika', section: 'dashboard' },
  cashflow:         { label: 'Ekonomika', section: 'dashboard' },
  dane:             { label: 'Ekonomika', section: 'dashboard' },
  banka:            { label: 'Finance',   section: 'dashboard' },
  'trvale-prikazy': { label: 'Finance',   section: 'dashboard' },
  uvery:            { label: 'Finance',   section: 'dashboard' },
  poplatky:         { label: 'Finance',   section: 'dashboard' },
  karty:            { label: 'Finance',   section: 'dashboard' },
  qerko:            { label: 'Finance',   section: 'dashboard' },
  gopay:            { label: 'Finance',   section: 'dashboard' },
  sodexo:           { label: 'Finance',   section: 'dashboard' },
  platby:           { label: 'Finance',   section: 'dashboard' },
  provozovny:       { label: 'Přehled',   section: 'dashboard' },
  reporty:          { label: 'Systém',    section: 'dashboard' },
  nastaveni:        { label: 'Systém',    section: 'dashboard' },
  komponenty:       { label: 'Dev',       section: 'dashboard' },
  kod:              { label: 'Dev',       section: 'dashboard' },
};

const PERIOD_OPTS: { value: Period; label: string }[] = [
  { value: 'dnes',         label: 'Dnes' },
  { value: 'vcera',        label: 'Včera' },
  { value: 'tyden',        label: 'Tento týden' },
  { value: 'minuly-tyden', label: 'Minulý týden' },
  { value: 'minuly-mesic', label: 'Minulý měsíc' },
  { value: 'rok',          label: 'Aktuální rok' },
];

// Skupiny provozoven – stejný výčet jako v Tržby detail
const PROV_GROUPS: { label: string; ids: string[] }[] = [
  { label: 'Restaurace',  ids: ['cg-brno', 'piazza', 'monte', 'teatr', 'jime-brno'] },
  { label: 'Pivnice',     ids: ['u-capa', 'u-kohoutu', 'nad-hladinkou'] },
  { label: 'Táckárny',   ids: ['tackarna-londyn', 'tackarna-turanka', 'tackarna-svedske-valy'] },
  { label: 'KOREK',       ids: ['korek-winebar', 'korek-wines'] },
  { label: 'Ostatní',     ids: ['flank', 'cg-catering'] },
];

const ACTIVE = PROVOZOVNY.filter((p) => p.status === 'active');

export default function Topbar({ state, update, onMenuToggle }: Props) {
  const { selectedSection, selectedProvozovna, period } = state;
  const isDashboard = selectedSection === 'dashboard';
  const parent      = BREADCRUMB_PARENT[selectedSection];

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--bs-topbar-height',
      isDashboard ? '62px' : '100px'
    );
  }, [isDashboard]);

  return (
    <header className="topbar">
      <div className="container-fluid h-100">
        <div className="topbar-rows">

          {/* ── Řádek 1: hamburger + název + provozovna + akce ── */}
          <div className="topbar-row-main">

            {/* Levá strana */}
            <div className="d-flex align-items-center gap-2">
              <div className="topbar-item">
                <button type="button" className="button-toggle-menu" onClick={onMenuToggle}>
                  <iconify-icon icon="solar:hamburger-menu-broken" className="align-middle" style={{ fontSize: 26 }} />
                </button>
              </div>
              <div className="topbar-item">
                <h4 className="fw-bold topbar-button pe-none text-uppercase mb-0 fs-14">
                  {SECTION_LABELS[selectedSection]}
                </h4>
              </div>
              <div className="topbar-divider d-none d-sm-block" />
              <select
                className="form-select form-select-sm topbar-prov-select d-none d-sm-block"
                value={selectedProvozovna}
                onChange={(e) => update({ selectedProvozovna: e.target.value as ProvozovnaId })}
              >
                <option value="all">Všechny provozovny</option>
                {PROV_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {ACTIVE.filter((p) => g.ids.includes(p.id)).map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Pravá strana */}
            <div className="d-flex align-items-center gap-1">
              <form className="app-search d-none d-md-block">
                <div className="position-relative">
                  <input type="search" className="form-control" placeholder="Hledat..." autoComplete="off" />
                  <iconify-icon icon="solar:magnifer-linear" className="search-widget-icon"
                    style={{ fontSize: 20, position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: 'var(--bs-secondary-color)', pointerEvents: 'none', display: 'flex' }} />
                </div>
              </form>
              <div className="topbar-item">
                <button type="button" className="topbar-button position-relative">
                  <iconify-icon icon="solar:bell-bing-bold-duotone" className="align-middle" style={{ fontSize: 26 }} />
                  <span className="position-absolute topbar-badge fs-10 translate-middle badge bg-danger rounded-pill">3</span>
                </button>
              </div>
              <div className="topbar-item d-none d-md-flex">
                <button type="button" className="topbar-button">
                  <iconify-icon icon="solar:settings-bold-duotone" className="align-middle" style={{ fontSize: 26 }} />
                </button>
              </div>
              <div className="topbar-item">
                <button type="button" className="topbar-button d-flex align-items-center gap-2">
                  <div className="avatar-sm rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                    style={{ background: 'var(--bs-primary)', width: 32, height: 32, fontSize: 12 }}>
                    MK
                  </div>
                  <span className="d-none d-lg-block fw-semibold fs-13">Martin Kovář</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Řádek 2: breadcrumb (cesta zpět) – jen mimo dashboard ── */}
          {!isDashboard && (
            <div className="topbar-row-filters">
              <nav aria-label="breadcrumb" className="topbar-breadcrumb">
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <button className="btn btn-link p-0 topbar-breadcrumb-link"
                      onClick={() => update({ selectedSection: 'dashboard' })}>
                      Con Gusto
                    </button>
                  </li>
                  {parent && (
                    <li className="breadcrumb-item">
                      <button className="btn btn-link p-0 topbar-breadcrumb-link d-flex align-items-center gap-1"
                        onClick={() => update({ selectedSection: parent.section })}>
                        <iconify-icon icon="solar:alt-arrow-left-bold" style={{ fontSize: 11 }} />
                        {parent.label}
                      </button>
                    </li>
                  )}
                </ol>
              </nav>
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
