// COMPONENT: Placeholder View (stub for non-implemented sections)
// SOURCE: standard admin pattern
// CUSTOM: NO

import type { SidebarSection } from '../types';

const META: Record<SidebarSection, { icon: string; title: string; desc: string }> = {
  dashboard:   { icon: '⊞', title: 'Dashboard',        desc: 'Hlavní přehled' },
  trzby:       { icon: '₿', title: 'Tržby',             desc: 'Detailní přehled tržeb' },
  zavierky:    { icon: '✓', title: 'Denní závěrky',     desc: 'Správa denních závěrek provozoven' },
  provozovny:  { icon: '⌂', title: 'Provozovny',        desc: 'Seznam a správa provozoven' },
  cashflow:    { icon: '↔', title: 'Cashflow',          desc: 'Přehled peněžních toků' },
  faktury:     { icon: '≡', title: 'Faktury',           desc: 'Přijaté a vydané faktury' },
  platby:      { icon: '◈', title: 'Platby',            desc: 'Přehled plateb a transakcí' },
  reporty:     { icon: '▥', title: 'Reporty',           desc: 'Exporty a analytické reporty' },
  nastaveni:   { icon: '⚙', title: 'Nastavení',         desc: 'Konfigurace systému' },
  komponenty:  { icon: '⊡', title: 'Mapa komponent',    desc: 'Dev reference' },
};

interface Props {
  section: SidebarSection;
}

export default function PlaceholderView({ section }: Props) {
  const m = META[section];
  return (
    <div className="placeholder-view">
      <div className="placeholder-icon">{m.icon}</div>
      <div className="placeholder-title">{m.title}</div>
      <div className="placeholder-sub">{m.desc}</div>
      <span className="badge badge-neutral" style={{ marginTop: 8 }}>
        Sekce připravena k implementaci
      </span>
    </div>
  );
}
