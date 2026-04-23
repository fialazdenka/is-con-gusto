// COMPONENT: App Shell
// SOURCE: Larkon _vertical.scss – .wrapper + .main-nav + .page-content
// CUSTOM: mobilní overlay navigace (html[data-menu-size="hidden"] + sidebar-enable + mob-nav-backdrop)
//
// Larkon class mapping:
//   .wrapper               → root flex container
//   .main-nav              → sidebar (position: fixed; Larkon řídí přes data-menu-size)
//   .page-content          → hlavní obsah (margin-left: var(--bs-main-nav-width))
//   .offcanvas-backdrop    → backdrop pro ProvozovnaDrawer
//   CUSTOM: mobileNavOpen state + mob-nav-backdrop div → mobilní overlay sidebar

import { useEffect, useState } from 'react';
import type { AppState, SidebarSection } from '../types';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import DashboardView from './DashboardView';
import PlaceholderView from './PlaceholderView';
import ProvozovnaDrawer from './ProvozovnaDrawer';
import ComponentReference from './ComponentReference';
import TrzbyView from './TrzbyView';
import FakturyView from './FakturyView';
import PohledavkyView from './PohledavkyView';
import PlatbyView from './PlatbyView';
import CashflowView from './CashflowView';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

export default function AppShell({ state, update }: Props) {
  const { selectedSection, sidebarCollapsed, drawerOpen, drawerProvozovnaId } = state;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Larkon uses html[data-menu-size] for sidebar state;
  // on mobile: "hidden" + class "sidebar-enable" for overlay
  useEffect(() => {
    function applyMenuSize() {
      if (window.innerWidth < 768) {
        document.documentElement.setAttribute('data-menu-size', 'hidden');
        document.documentElement.classList.toggle('sidebar-enable', mobileNavOpen);
      } else {
        document.documentElement.setAttribute(
          'data-menu-size',
          sidebarCollapsed ? 'condensed' : ''
        );
        document.documentElement.classList.remove('sidebar-enable');
      }
    }
    applyMenuSize();
    window.addEventListener('resize', applyMenuSize);
    return () => window.removeEventListener('resize', applyMenuSize);
  }, [sidebarCollapsed, mobileNavOpen]);

  function handleMenuToggle() {
    if (window.innerWidth < 768) {
      setMobileNavOpen(prev => !prev);
    } else {
      update({ sidebarCollapsed: !state.sidebarCollapsed });
    }
  }

  function handleNavSelect(s: SidebarSection) {
    update({ selectedSection: s });
    setMobileNavOpen(false);
  }

  function openDrawer(id: string) {
    update({ drawerOpen: true, drawerProvozovnaId: id });
  }

  function closeDrawer() {
    update({ drawerOpen: false, drawerProvozovnaId: null });
  }

  function renderContent() {
    switch (selectedSection) {
      case 'dashboard':
        return <DashboardView state={state} update={update} onOpenDrawer={openDrawer} />;
      case 'trzby':
        return <TrzbyView state={state} update={update} />;
      case 'faktury':
        return <FakturyView state={state} update={update} />;
      case 'pohledavky':
        return <PohledavkyView state={state} update={update} />;
      case 'cashflow':
        return <CashflowView state={state} update={update} />;
      case 'platby':
        return <PlatbyView state={state} update={update} />;
      case 'komponenty':
        return <ComponentReference />;
      default:
        return <PlaceholderView section={selectedSection} />;
    }
  }

  return (
    // Larkon root: .wrapper (structure/_vertical.scss)
    <div className="wrapper">
      {/* Topbar – SOURCE: Larkon header.topbar */}
      <Topbar state={state} update={update} onMenuToggle={handleMenuToggle} />

      {/* Sidebar – SOURCE: Larkon div.main-nav */}
      <Sidebar
        collapsed={sidebarCollapsed}
        active={selectedSection}
        onSelect={handleNavSelect}
        onToggle={() => update({ sidebarCollapsed: !sidebarCollapsed })}
      />

      {/* Mobilní backdrop pro navigaci */}
      {mobileNavOpen && (
        <div
          className="mob-nav-backdrop"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Main content – SOURCE: Larkon .page-content */}
      <div className="page-content">
        <div className="container-fluid">
          {renderContent()}
        </div>
      </div>

      {/* Drawer / Offcanvas – SOURCE: Larkon offcanvas pattern */}
      {drawerOpen && drawerProvozovnaId && (
        <>
          <div
            className="offcanvas-backdrop fade show"
            onClick={closeDrawer}
            style={{ zIndex: 200 }}
          />
          <ProvozovnaDrawer
            provozovnaId={drawerProvozovnaId}
            state={state}
            onClose={closeDrawer}
          />
        </>
      )}
    </div>
  );
}
