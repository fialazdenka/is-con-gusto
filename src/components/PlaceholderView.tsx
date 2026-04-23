// COMPONENT: Placeholder View (stub for non-implemented sections)
// SOURCE: Larkon empty-state pattern + Bootstrap card
// CUSTOM: NO
//
// Larkon class mapping:
//   .card.text-center.py-5    → centered empty-state card
//   iconify-icon fs-1          → large section icon
//   .h4.fw-semibold            → section title
//   .text-muted                → description
//   .badge.bg-secondary-subtle.text-secondary → status badge

import type { SidebarSection } from '../types';

const META: Record<SidebarSection, { icon: string; title: string; desc: string }> = {
  dashboard:  { icon: 'solar:widget-5-bold-duotone',         title: 'Dashboard',       desc: 'Hlavní přehled' },
  trzby:      { icon: 'solar:chart-2-bold-duotone',          title: 'Tržby',            desc: 'Detailní přehled tržeb' },
  zavierky:   { icon: 'solar:document-text-bold-duotone',    title: 'Denní závěrky',    desc: 'Správa denních závěrek provozoven' },
  provozovny: { icon: 'solar:buildings-bold-duotone',        title: 'Provozovny',       desc: 'Seznam a správa provozoven' },
  cashflow:   { icon: 'solar:dollar-minimalistic-bold-duotone', title: 'Cashflow',      desc: 'Přehled peněžních toků' },
  faktury:     { icon: 'solar:bill-list-bold-duotone',        title: 'Faktury',          desc: 'Přijaté a vydané faktury' },
  pohledavky:  { icon: 'solar:money-bag-bold-duotone',        title: 'Pohledávky',       desc: 'Vydané faktury a sledování úhrad' },
  platby:      { icon: 'solar:card-send-bold-duotone',        title: 'Platby',           desc: 'Přehled plateb a transakcí' },
  reporty:    { icon: 'solar:graph-bold-duotone',            title: 'Reporty',          desc: 'Exporty a analytické reporty' },
  nastaveni:  { icon: 'solar:settings-bold-duotone',         title: 'Nastavení',        desc: 'Konfigurace systému' },
  komponenty: { icon: 'solar:layers-bold-duotone',           title: 'Mapa komponent',   desc: 'Dev reference' },
};

interface Props {
  section: SidebarSection;
}

export default function PlaceholderView({ section }: Props) {
  const m = META[section];
  return (
    // SOURCE: Larkon empty-state card pattern
    <div className="card text-center py-5">
      <div className="card-body py-4">
        <iconify-icon
          icon={m.icon}
          style={{ fontSize: 64, color: 'var(--bs-secondary-color)', opacity: 0.5 }}
        />
        <h4 className="fw-semibold mt-3 mb-1">{m.title}</h4>
        <p className="text-muted mb-3">{m.desc}</p>
        <span className="badge bg-secondary-subtle text-secondary fs-12">
          Sekce připravena k implementaci
        </span>
      </div>
    </div>
  );
}
