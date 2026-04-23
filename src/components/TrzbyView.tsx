// COMPONENT: Tržby – analytický přehled
// SOURCE: Larkon _page-title.scss + Bootstrap layout
// CUSTOM: NO
//
// Larkon class mapping:
//   .page-title-box   → page header wrapper (space-between)
//   .h4.fw-semibold   → page title
//   .text-muted       → subtitle
//   .btn.btn-light.btn-sm → action buttons

import type { AppState } from '../types';
import type { ProvozovnaId } from '../types';
import TrzbyWidget from './TrzbyWidget';
import TrzbyTable from './TrzbyTable';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

export default function TrzbyView({ state, update }: Props) {
  const { selectedProvozovna } = state;

  return (
    <>
      {/* SOURCE: Larkon .page-title-box */}
      <div className="page-title-box">
        <div>
          <h4 className="page-title fw-semibold mb-1">Tržby</h4>
          <p className="text-muted mb-0">Analytický přehled · týden 13.4. – 19.4.2026</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-light btn-sm">
            Export CSV
          </button>
        </div>
      </div>

      <TrzbyWidget
        provozovna={selectedProvozovna}
        onDrillDown={(id: ProvozovnaId) => update({ selectedProvozovna: id })}
      />

      <TrzbyTable provozovna={selectedProvozovna} />
    </>
  );
}
