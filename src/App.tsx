import { useState, useEffect } from 'react';
import type { AppState } from './types';
import AppShell from './components/AppShell';
import { PROVOZOVNY } from './data';

const CG_GOLD = '#c9911a'; // Con Gusto default – "Všechny provozovny"

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

  // Propagace brand barvy provozovny do celého UI přes CSS proměnnou
  useEffect(() => {
    const color = state.selectedProvozovna === 'all'
      ? CG_GOLD
      : PROVOZOVNY.find((p) => p.id === state.selectedProvozovna)?.color ?? CG_GOLD;
    document.documentElement.style.setProperty('--prov-color', color);
  }, [state.selectedProvozovna]);

  return <AppShell state={state} update={update} />;
}
