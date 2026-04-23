// COMPONENT: Provozovny Summary — Card + Data Table
// SOURCE: Larkon _card.scss + _tables.scss + _badge.scss
// CUSTOM: NO
//
// Larkon class mapping:
//   .card                              → karta
//   .card-header                       → hlavička
//   .card-title                        → titulek
//   .table.table-hover.table-centered.table-nowrap → tabulka
//   .progress (height:6px)             → progress bar podílu
//   .progress-bar                      → výplň progress baru
//   .badge.bg-success-subtle.text-success / .bg-danger-subtle.text-danger → trend
//   .btn.btn-light.btn-sm              → detail tlačítko

import type { ProvozovnaId } from '../types';
import { PROVOZOVNY, DAYS_7, getTotalTrzby, getPrevTotalTrzby, fCzk, pctChange } from '../data';

interface Props {
  selectedProvozovna: ProvozovnaId;
  onOpenDrawer: (id: string) => void;
}

export default function ProvozonySummary({ selectedProvozovna, onOpenDrawer }: Props) {
  const filtered =
    selectedProvozovna === 'all'
      ? PROVOZOVNY
      : PROVOZOVNY.filter((p) => p.id === selectedProvozovna);

  const rows = filtered.map((p) => {
    const cur   = getTotalTrzby(p.id, DAYS_7);
    const prev  = getPrevTotalTrzby(p.id);
    const all   = getTotalTrzby('all', DAYS_7);
    const share = all.celkem > 0 ? Math.round((cur.celkem / all.celkem) * 100) : 0;
    const chng  = pctChange(cur.celkem, prev.celkem);
    return { p, cur, share, chng };
  });

  const totalCur = getTotalTrzby('all', DAYS_7);

  return (
    <div className="card h-100 d-flex flex-column">
      {/* SOURCE: Larkon .card-header */}
      <div className="card-header d-flex align-items-center justify-content-between flex-shrink-0">
        <h5 className="card-title mb-0">
          Rozpad – provozovny
          <small className="text-muted fw-normal ms-2 fs-13">7 dní · klik = detail</small>
        </h5>
        <span className="badge bg-secondary-subtle text-secondary">{filtered.length} provozovny</span>
      </div>

      {/* SOURCE: Larkon .table.table-hover.table-centered.table-nowrap */}
      <div className="table-responsive flex-grow-1" style={{ overflowY: 'auto' }}>
        <table className="table table-hover table-centered table-nowrap mb-0">
          <thead className="table-light">
            <tr>
              <th>Provozovna</th>
              <th className="text-end" style={{ width: 90 }}>Kuchyň</th>
              <th className="text-end" style={{ width: 80 }}>Bar</th>
              <th className="text-end" style={{ width: 100 }}>Celkem</th>
              <th className="text-end" style={{ width: 80 }}>vs. min. týd.</th>
              <th className="text-end" style={{ width: 110 }}>Podíl</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, cur, share, chng }) => (
              <tr key={p.id}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="rounded-circle d-inline-block flex-shrink-0"
                      style={{ width: 8, height: 8, background: p.color }}
                    />
                    <span className="fw-semibold">{p.name}</span>
                  </div>
                </td>
                <td className="text-end font-monospace">{fCzk(cur.kuchyn)}</td>
                <td className="text-end font-monospace">{fCzk(cur.bar)}</td>
                <td className="text-end font-monospace fw-bold">{fCzk(cur.celkem)}</td>
                <td className="text-end">
                  {/* SOURCE: Larkon .badge.bg-{color}-subtle */}
                  <span className={`badge ${chng >= 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                    <iconify-icon icon={chng >= 0 ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} className="me-1" />
                    {Math.abs(chng).toFixed(1)} %
                  </span>
                </td>
                <td className="text-end">
                  <div className="d-flex align-items-center justify-content-end gap-2">
                    <span className="fs-13 fw-semibold">{share} %</span>
                    <div className="progress" style={{ width: 50, height: 6 }}>
                      <div className="progress-bar" style={{ width: `${share}%`, background: p.color }} />
                    </div>
                  </div>
                </td>
                <td>
                  <button
                    className="btn btn-light btn-sm"
                    onClick={() => onOpenDrawer(p.id)}
                  >
                    Detail →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {selectedProvozovna === 'all' && (
            <tfoot>
              <tr className="fw-bold table-light">
                <td>Celkem CG</td>
                <td className="text-end font-monospace">{fCzk(totalCur.kuchyn)}</td>
                <td className="text-end font-monospace">{fCzk(totalCur.bar)}</td>
                <td className="text-end font-monospace text-primary">{fCzk(totalCur.celkem)}</td>
                <td />
                <td className="text-end">100 %</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
