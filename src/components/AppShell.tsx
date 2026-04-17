// COMPONENT: App Shell (Sidebar + Topbar + Content)
// SOURCE: Larkon-like
// CUSTOM: NO

import type { AppState } from '../types';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import DashboardView from './DashboardView';
import PlaceholderView from './PlaceholderView';
import ProvozovnaDrawer from './ProvozovnaDrawer';
import ComponentReference from './ComponentReference';
import TrzbyView from './TrzbyView';
import FakturyView from './FakturyView';
import PlatbyView from './PlatbyView';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

export default function AppShell({ state, update }: Props) {
  const { selectedSection, sidebarCollapsed, drawerOpen, drawerProvozovnaId } = state;

  function openDrawer(id: string) {
    update({ drawerOpen: true, drawerProvozovnaId: id });
  }

  function closeDrawer() {
    update({ drawerOpen: false, drawerProvozovnaId: null });
  }

  function renderContent() {
    switch (selectedSection) {
      case 'dashboard':
        return (
          <DashboardView
            state={state}
            update={update}
            onOpenDrawer={openDrawer}
          />
        );
      case 'trzby':
        return <TrzbyView state={state} update={update} />;
      case 'faktury':
        return <FakturyView state={state} update={update} />;
      case 'platby':
        return <PlatbyView state={state} update={update} />;
      case 'komponenty':
        return <ComponentReference />;
      default:
        return <PlaceholderView section={selectedSection} />;
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={sidebarCollapsed}
        active={selectedSection}
        onSelect={(s) => update({ selectedSection: s })}
      />

      <div className="main-area">
        <Topbar state={state} update={update} />
        <main className="content">
          <div className="content-inner">{renderContent()}</div>
        </main>
      </div>

      {drawerOpen && drawerProvozovnaId && (
        <>
          <div className="overlay" onClick={closeDrawer} />
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
