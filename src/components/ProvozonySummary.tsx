// ─────────────────────────────────────────────────────────────
// COMPONENT: Provozovny Summary — Card + Data Table
// SOURCE:    Larkon-like → Card + Table + Badge + ProgressBar
// CUSTOM:    NO
//
// LARKON MAPPING:
//   Outer:      <Card>
//   Header:     <Card.Header className="d-flex align-items-center
//                 justify-content-between">
//   Table:      <Table responsive hover> uvnitř Card.Body (bez paddingu)
//   th:         className="text-uppercase fs-11 fw-semibold text-muted"
//   Dot:        <span className="avatar-xs rounded-circle"
//                 style={{background: color}}>
//   ProgressBar: <ProgressBar now={share} style={{height:6,width:60}}
//                  variant="primary"> + inline `{share} %`
//   Trend badge: <Badge bg={chng>=0?"success":"danger"} className="fs-11">
//                  {chng>=0?"↑":"↓"} {Math.abs(chng)}%
//   Action btn:  <Button variant="light" size="sm">Detail →</Button>
//   Tfoot:      <tfoot> row s className="fw-bold bg-light"
// ─────────────────────────────────────────────────────────────

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
    const cur  = getTotalTrzby(p.id, DAYS_7);
    const prev = getPrevTotalTrzby(p.id);
    const all  = getTotalTrzby('all', DAYS_7);
    const share = all.celkem > 0 ? Math.round((cur.celkem / all.celkem) * 100) : 0;
    const chng  = pctChange(cur.celkem, prev.celkem);
    return { p, cur, share, chng };
  });

  const totalCur = getTotalTrzby('all', DAYS_7);

  return (
    // COMPONENT: Card + Data Table (Rozpad provozoven)
    // SOURCE: Larkon-like
    // CUSTOM: NO
    <div className="card section-gap">
      <div className="card-header">
        <div className="card-title-wrap">
          <div className="card-title">Rozpad – provozovny</div>
          <div className="card-sub">7 dní · klik = detail</div>
        </div>
        <span className="badge badge-neutral">{filtered.length} provozovny</span>
      </div>

      <div className="table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>Provozovna</th>
              <th className="td-r">Kuchyň</th>
              <th className="td-r">Bar</th>
              <th className="td-r">Celkem</th>
              <th className="td-r">Podíl</th>
              <th className="td-r">vs. min. týden</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, cur, share, chng }) => (
              <tr key={p.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="prov-dot" style={{ background: p.color }} />
                    <span className="fw-600">{p.name}</span>
                  </div>
                </td>
                <td className="td-r td-mono">{fCzk(cur.kuchyn)}</td>
                <td className="td-r td-mono">{fCzk(cur.bar)}</td>
                <td className="td-r td-mono fw-700">{fCzk(cur.celkem)}</td>
                <td className="td-r" style={{ minWidth: 120 }}>
                  <div className="flex items-center justify-end gap-2">
                    <span className="fs-sm fw-600">{share} %</span>
                    <div className="prog" style={{ width: 60 }}>
                      <div
                        className="prog-fill"
                        style={{ width: `${share}%`, background: p.color }}
                      />
                    </div>
                  </div>
                </td>
                <td className="td-r">
                  <span className={`kpi-change ${chng >= 0 ? 'up' : 'down'} fs-sm`}>
                    {chng >= 0 ? '↑' : '↓'} {Math.abs(chng).toFixed(1)} %
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-xs"
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
              <tr style={{ background: '#f8fafc' }}>
                <td className="fw-700">Celkem CG</td>
                <td className="td-r td-mono fw-700">{fCzk(totalCur.kuchyn)}</td>
                <td className="td-r td-mono fw-700">{fCzk(totalCur.bar)}</td>
                <td className="td-r td-mono fw-700" style={{ color: 'var(--c-info)' }}>
                  {fCzk(totalCur.celkem)}
                </td>
                <td className="td-r fw-700">100 %</td>
                <td />
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
