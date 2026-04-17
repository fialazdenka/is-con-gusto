// COMPONENT: Tržby – analytický přehled
// SOURCE: Larkon-like → Page layout
// CUSTOM: NO

import type { AppState } from '../types';
import TrzbyWidget from './TrzbyWidget';
import TrzbyTable from './TrzbyTable';
import type { ProvozovnaId } from '../types';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

export default function TrzbyView({ state, update }: Props) {
  const { selectedProvozovna } = state;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tržby</h1>
          <div className="page-sub">Analytický přehled · týden 13.4. – 19.4.2026</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm">⬇ Export CSV</button>
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
