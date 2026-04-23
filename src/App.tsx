import { useState } from 'react';
import type { AppState } from './types';
import AppShell from './components/AppShell';

export default function App() {
  const [state, setState] = useState<AppState>({
    selectedSection: 'dashboard',
    selectedProvozovna: 'all',
    dataMode: 'live',
    period: 'tyden',
    drawerOpen: false,
    drawerProvozovnaId: null,
    sidebarCollapsed: false,
  });

  function update(patch: Partial<AppState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  return <AppShell state={state} update={update} />;
}
