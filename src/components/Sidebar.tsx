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

// Phase 1 restrukturalizace per zápis 4. 6. 2026:
// Sidebar členěn na 5 skupin: Přehled / Ekonomika / Finance / Systém / Dev
const MAIN_ITEMS: NavItem[] = [
  { id: 'dashboard',  label: 'Dashboard',  icon: 'solar:widget-5-bold-duotone' },
  { id: 'provozovny', label: 'Provozovny', icon: 'solar:buildings-bold-duotone' },
];

// Ekonomika — účetní / dokladová evidence (tržby, doklady, peněžní výhled)
const EKONOMIKA_ITEMS: NavItem[] = [
  { id: 'trzby',      label: 'Tržby',         icon: 'solar:chart-2-bold-duotone' },
  { id: 'zavierky',   label: 'Denní závěrky', icon: 'solar:document-text-bold-duotone', badge: 2 },
  { id: 'faktury',    label: 'Faktury',       icon: 'solar:bill-list-bold-duotone', badge: 1 },
  { id: 'pohledavky', label: 'Pohledávky',    icon: 'solar:money-bag-bold-duotone', badge: 2 },
  { id: 'cashflow',   label: 'Cashflow',      icon: 'solar:dollar-minimalistic-bold-duotone' },
];

// Finance — peníze a bankovní operace (účty, automatické platby, poplatky, karty, payment platforms)
const FINANCE_ITEMS: NavItem[] = [
  { id: 'banka',          label: 'Bankovní účty',  icon: 'solar:wallet-bold-duotone' },
  { id: 'trvale-prikazy', label: 'Trvalé příkazy', icon: 'solar:refresh-circle-bold-duotone' },
  { id: 'uvery',          label: 'Úvěry',          icon: 'solar:hand-money-bold-duotone' },
  { id: 'poplatky',       label: 'Poplatky',       icon: 'solar:tag-price-bold-duotone' },
  { id: 'karty',          label: 'Platební karty', icon: 'solar:card-bold-duotone' },
  { id: 'qerko',          label: 'Qerko',          icon: 'solar:qr-code-bold-duotone' },
  { id: 'gopay',          label: 'GoPay',          icon: 'solar:card-2-bold-duotone' },
  { id: 'sodexo',         label: 'Sodexo',         icon: 'solar:ticket-bold-duotone' },
  { id: 'platby',         label: 'Platby',         icon: 'solar:card-send-bold-duotone' },
];

const SYSTEM_ITEMS: NavItem[] = [
  { id: 'reporty',   label: 'Reporty',   icon: 'solar:graph-bold-duotone' },
  { id: 'nastaveni', label: 'Nastavení', icon: 'solar:settings-bold-duotone' },
];

const DEV_ITEMS: NavItem[] = [
  { id: 'komponenty', label: 'Mapa komponent', icon: 'solar:layers-bold-duotone' },
  { id: 'kod',        label: 'Kód',            icon: 'solar:code-2-bold-duotone' },
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

          <li className="menu-title">Ekonomika</li>
          {EKONOMIKA_ITEMS.map((item) => (
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
