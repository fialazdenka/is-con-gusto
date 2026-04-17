// ─────────────────────────────────────────────────────────────
// COMPONENT: Sidebar — Vertical Navigation
// SOURCE:    Larkon-like → LeftSideBar + SideNavItem + SideNavSection
// CUSTOM:    NO
//
// LARKON MAPPING:
//   Root:        <aside className="app-menu navbar-menu"> (Larkon)
//   Logo:        <div className="navbar-brand-box"> s logem + textem
//   NavSection:  <li className="menu-title"><span>{label}</span></li>
//   NavItem:     <li className="nav-item">
//                  <a className={`nav-link${active?" active":""}`}>
//                    <i className="nav-icon"> + <span>{label}</span>
//                    + optional <span className="badge"> pro číslo
//   Collapse:    CSS transition width + overflow:hidden (nebo
//                Larkon sidebar-toggle JS)
//   User footer: Larkon <UserDropdown> nebo
//                <div className="sidebar-user d-flex align-items-center">
//                  s <Avatar> + jméno + role
// ─────────────────────────────────────────────────────────────

import type { SidebarSection } from '../types';

interface Props {
  collapsed: boolean;
  active: SidebarSection;
  onSelect: (s: SidebarSection) => void;
}

interface NavItem {
  id: SidebarSection;
  label: string;
  icon: string;
  badge?: number;
}

const MAIN_ITEMS: NavItem[] = [
  { id: 'dashboard',   label: 'Dashboard',       icon: '⊞' },
  { id: 'trzby',       label: 'Tržby',           icon: '₿' },
  { id: 'zavierky',    label: 'Denní závěrky',   icon: '✓', badge: 2 },
  { id: 'provozovny',  label: 'Provozovny',      icon: '⌂' },
];

const FINANCE_ITEMS: NavItem[] = [
  { id: 'cashflow',    label: 'Cashflow',        icon: '↔' },
  { id: 'faktury',     label: 'Faktury',         icon: '≡', badge: 1 },
  { id: 'platby',      label: 'Platby',          icon: '◈' },
];

const SYSTEM_ITEMS: NavItem[] = [
  { id: 'reporty',     label: 'Reporty',          icon: '▥' },
  { id: 'nastaveni',   label: 'Nastavení',        icon: '⚙' },
];

const DEV_ITEMS: NavItem[] = [
  { id: 'komponenty',  label: 'Mapa komponent',   icon: '⊡' },
];

export default function Sidebar({ collapsed, active, onSelect }: Props) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-logo-mark">CG</div>
        <div className="sb-logo-text">
          <div className="sb-logo-title">Con Gusto</div>
          <div className="sb-logo-sub">Interní systém</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sb-nav">
        <SbSection label="Přehled" items={MAIN_ITEMS} active={active} onSelect={onSelect} />
        <SbSection label="Finance" items={FINANCE_ITEMS} active={active} onSelect={onSelect} />
        <SbSection label="Systém" items={SYSTEM_ITEMS} active={active} onSelect={onSelect} />
        <SbSection label="Dev" items={DEV_ITEMS} active={active} onSelect={onSelect} />
      </nav>

      {/* User */}
      <div className="sb-footer">
        <div className="sb-user">
          <div className="sb-avatar">MK</div>
          <div className="sb-user-info">
            <div className="sb-user-name">Martin Kovář</div>
            <div className="sb-user-role">Administrátor</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SbSection({
  label,
  items,
  active,
  onSelect,
}: {
  label: string;
  items: NavItem[];
  active: SidebarSection;
  onSelect: (s: SidebarSection) => void;
}) {
  return (
    <>
      <div className="sb-section-label">{label}</div>
      {items.map((item) => (
        <button
          key={item.id}
          className={`sb-item${active === item.id ? ' active' : ''}`}
          onClick={() => onSelect(item.id)}
        >
          <span className="sb-icon">{item.icon}</span>
          <span className="sb-label">{item.label}</span>
          {item.badge ? (
            <span className="sb-badge">{item.badge}</span>
          ) : null}
        </button>
      ))}
    </>
  );
}
