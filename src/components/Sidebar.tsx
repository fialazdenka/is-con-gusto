// COMPONENT: Sidebar – Vertical Navigation
// SOURCE: Larkon resources/views/layouts/partials/main-nav.blade.php
//         + structure/_vertical.scss
// CUSTOM: NO
//
// Larkon class mapping:
//   .main-nav           → sidebar container (position: fixed)
//   .logo-box           → logo row
//   .scrollbar          → scrollable nav area
//   .navbar-nav         → <ul> nav list
//   .menu-title         → section label
//   .nav-item           → <li> item
//   .nav-link           → <a> link (+ .active)
//   .nav-icon           → icon wrapper
//   .nav-text           → label text
//   .badge              → count badge (badge-danger)

import type { SidebarSection } from '../types';

interface Props {
  collapsed: boolean;
  active: SidebarSection;
  onSelect: (s: SidebarSection) => void;
  onToggle: () => void;
}

interface NavItem {
  id: SidebarSection;
  label: string;
  icon: string;  // iconify solar icon name
  badge?: number;
}

const MAIN_ITEMS: NavItem[] = [
  { id: 'dashboard',  label: 'Dashboard',      icon: 'solar:widget-5-bold-duotone' },
  { id: 'trzby',      label: 'Tržby',          icon: 'solar:chart-2-bold-duotone' },
  { id: 'zavierky',   label: 'Denní závěrky',  icon: 'solar:document-text-bold-duotone', badge: 2 },
  { id: 'provozovny', label: 'Provozovny',     icon: 'solar:buildings-bold-duotone' },
];

const FINANCE_ITEMS: NavItem[] = [
  { id: 'cashflow',    label: 'Cashflow',    icon: 'solar:dollar-minimalistic-bold-duotone' },
  { id: 'faktury',     label: 'Faktury',     icon: 'solar:bill-list-bold-duotone', badge: 1 },
  { id: 'pohledavky',  label: 'Pohledávky',  icon: 'solar:money-bag-bold-duotone', badge: 2 },
  { id: 'platby',      label: 'Platby',      icon: 'solar:card-send-bold-duotone' },
];

const SYSTEM_ITEMS: NavItem[] = [
  { id: 'reporty',   label: 'Reporty',   icon: 'solar:graph-bold-duotone' },
  { id: 'nastaveni', label: 'Nastavení', icon: 'solar:settings-bold-duotone' },
];

const DEV_ITEMS: NavItem[] = [
  { id: 'komponenty', label: 'Mapa komponent', icon: 'solar:layers-bold-duotone' },
];

export default function Sidebar({ active, onSelect }: Props) {
  return (
    <div className="main-nav">
      {/* Logo – SOURCE: Larkon .logo-box */}
      <div className="logo-box">
        <a href="#" className="logo-dark d-flex align-items-center gap-2 text-decoration-none">
          <div
            className="avatar-sm rounded d-flex align-items-center justify-content-center fw-bold text-white"
            style={{ background: 'var(--bs-primary)', fontFamily: 'var(--bs-font-sans-serif)', flexShrink: 0 }}
          >
            CG
          </div>
          <span className="logo-lg fw-bold text-white fs-15">Con Gusto IS</span>
        </a>
      </div>

      {/* Scrollable nav – SOURCE: Larkon .scrollbar */}
      <div className="scrollbar" data-simplebar>
        <ul className="navbar-nav" id="navbar-nav">

          <li className="menu-title">Přehled</li>
          {MAIN_ITEMS.map((item) => (
            <NavLink key={item.id} item={item} active={active} onSelect={onSelect} />
          ))}

          <li className="menu-title">Finance</li>
          {FINANCE_ITEMS.map((item) => (
            <NavLink key={item.id} item={item} active={active} onSelect={onSelect} />
          ))}

          <li className="menu-title">Systém</li>
          {SYSTEM_ITEMS.map((item) => (
            <NavLink key={item.id} item={item} active={active} onSelect={onSelect} />
          ))}

          <li className="menu-title">Dev</li>
          {DEV_ITEMS.map((item) => (
            <NavLink key={item.id} item={item} active={active} onSelect={onSelect} />
          ))}

        </ul>
      </div>

      {/* User footer – SOURCE: Larkon user dropdown / profile area */}
      <div className="p-3 border-top border-opacity-25 mt-auto">
        <div className="d-flex align-items-center gap-2">
          <div className="avatar-sm rounded-circle overflow-hidden flex-shrink-0">
            <span
              className="avatar-title rounded-circle text-white fw-bold"
              style={{ background: 'var(--bs-primary)' }}
            >
              MK
            </span>
          </div>
          <div className="nav-text overflow-hidden">
            <div className="text-white fw-semibold fs-13 text-truncate">Martin Kovář</div>
            <div className="text-muted fs-11 text-truncate">Administrátor</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  onSelect,
}: {
  item: NavItem;
  active: SidebarSection;
  onSelect: (s: SidebarSection) => void;
}) {
  const isActive = active === item.id;
  return (
    <li className="nav-item">
      <a
        className={`nav-link${isActive ? ' active' : ''}`}
        onClick={() => onSelect(item.id)}
        style={{ cursor: 'pointer' }}
      >
        <span className="nav-icon">
          <iconify-icon icon={item.icon} />
        </span>
        <span className="nav-text">{item.label}</span>
        {item.badge ? (
          <span className="badge bg-danger rounded-pill ms-auto">{item.badge}</span>
        ) : null}
      </a>
    </li>
  );
}
