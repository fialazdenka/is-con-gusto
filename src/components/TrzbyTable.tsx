// COMPONENT: Tržby Detail Table – Interactive DataTable + Tabs
// SOURCE: Larkon _tables.scss + _card.scss + _nav.scss
// CUSTOM: NO
//
// Larkon class mapping:
//   .card                             → karta
//   .card-header                      → header s tabs
//   .nav.nav-tabs.card-header-tabs    → tab navigace
//   .nav-item / .nav-link.active      → tab položka
//   .table.table-hover.table-centered.table-nowrap → tabulka
//   .badge.bg-success-subtle.text-success → live badge
//   .badge.bg-info-subtle.text-info   → závěrka badge
//   .form-select.form-select-sm       → filtr select
//   .btn.btn-light.btn-sm             → export tlačítko
//   tfoot.fw-bold + td                → součtový řádek

import { useState } from 'react';
import type { ProvozovnaId } from '../types';
import { TRZBY_7D, PROVOZOVNY, fCzk, fDate } from '../data';

interface Props {
  provozovna: ProvozovnaId;
}

type SortKey = 'datum' | 'kuchyn' | 'bar' | 'celkem';

export default function TrzbyTable({ provozovna }: Props) {
  const [sortKey,   setSortKey]   = useState<SortKey>('datum');
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'den' | 'provozovna'>('den');

  const rows = TRZBY_7D.filter(
    (t) => provozovna === 'all' || t.provozovna === provozovna
  );

  const getProvName  = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.shortName ?? id;
  const getProvColor = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.color ?? '#94a3b8';

  const sorted = [...rows].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'datum') return a.datum.localeCompare(b.datum) * dir;
    return (a[sortKey] - b[sortKey]) * dir;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <iconify-icon icon="solar:sort-bold" className="ms-1 text-muted fs-12" />;
    return sortDir === 'asc'
      ? <iconify-icon icon="solar:alt-arrow-up-bold" className="ms-1 fs-12" />
      : <iconify-icon icon="solar:alt-arrow-down-bold" className="ms-1 fs-12" />;
  }

  const total = sorted.reduce(
    (acc, r) => ({ kuchyn: acc.kuchyn + r.kuchyn, bar: acc.bar + r.bar, celkem: acc.celkem + r.celkem }),
    { kuchyn: 0, bar: 0, celkem: 0 }
  );

  void activeTab;

  return (
    <div className="card mb-4">
      {/* SOURCE: Larkon .card-header s nav-tabs */}
      <div className="card-header">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="card-title mb-0">
            Tržby – detail
            <small className="text-muted fw-normal ms-2 fs-13">{sorted.length} záznamů</small>
          </h5>
          <div className="d-flex align-items-center gap-2">
            <select className="form-select form-select-sm" style={{ width: 'auto' }} value={provozovna} disabled>
              <option value="all">Všechny provozovny</option>
              {PROVOZOVNY.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button className="btn btn-light btn-sm">
              Export
            </button>
          </div>
        </div>

        {/* SOURCE: Larkon .nav.nav-tabs.card-header-tabs */}
        <ul className="nav nav-tabs card-header-tabs mt-2">
          <li className="nav-item">
            <a
              className={`nav-link${activeTab === 'den' ? ' active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveTab('den')}
            >
              Podle dne
            </a>
          </li>
          <li className="nav-item">
            <a
              className={`nav-link${activeTab === 'provozovna' ? ' active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveTab('provozovna')}
            >
              Podle provozovny
            </a>
          </li>
        </ul>
      </div>

      {/* SOURCE: Larkon .table.table-hover.table-centered.table-nowrap */}
      <div className="table-responsive">
        <table className="table table-hover table-centered table-nowrap mb-0">
          <thead className="table-light">
            <tr>
              <th
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('datum')}
              >
                Datum <SortIcon col="datum" />
              </th>
              <th>Provozovna</th>
              <th>Režim</th>
              <th
                className="text-end"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('kuchyn')}
              >
                Kuchyň <SortIcon col="kuchyn" />
              </th>
              <th
                className="text-end"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('bar')}
              >
                Bar <SortIcon col="bar" />
              </th>
              <th
                className="text-end"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('celkem')}
              >
                Celkem <SortIcon col="celkem" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={`${row.datum}-${row.provozovna}-${i}`}>
                <td className="text-muted">{fDate(row.datum)}</td>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className="rounded-circle d-inline-block flex-shrink-0"
                      style={{ width: 8, height: 8, background: getProvColor(row.provozovna) }}
                    />
                    {getProvName(row.provozovna)}
                  </div>
                </td>
                <td>
                  {/* SOURCE: Larkon .badge.bg-{color}-subtle.text-{color} */}
                  {row.mode === 'live' ? (
                    <span className="badge bg-success-subtle text-success">
                      <iconify-icon icon="solar:circle-bold" className="me-1" style={{ fontSize: 8 }} />
                      Live
                    </span>
                  ) : (
                    <span className="badge bg-info-subtle text-info">
                      <iconify-icon icon="solar:record-bold" className="me-1" style={{ fontSize: 8 }} />
                      Závěrka
                    </span>
                  )}
                </td>
                <td className="text-end font-monospace" style={{ color: '#1c84ee' }}>
                  {fCzk(row.kuchyn)}
                </td>
                <td className="text-end font-monospace" style={{ color: '#16a34a' }}>
                  {fCzk(row.bar)}
                </td>
                <td className="text-end font-monospace fw-bold">{fCzk(row.celkem)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {/* SOURCE: Bootstrap tfoot pattern */}
            <tr className="fw-bold table-light">
              <td colSpan={3}>Celkem</td>
              <td className="text-end font-monospace" style={{ color: '#1c84ee' }}>
                {fCzk(total.kuchyn)}
              </td>
              <td className="text-end font-monospace" style={{ color: '#16a34a' }}>
                {fCzk(total.bar)}
              </td>
              <td className="text-end font-monospace fs-6">
                {fCzk(total.celkem)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
