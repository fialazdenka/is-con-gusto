// ─────────────────────────────────────────────────────────────
// COMPONENT: Tržby Detail Table — Interactive DataTable + Tabs
// SOURCE:    Larkon-like → Card + Nav Tabs + Table + Form.Select
// CUSTOM:    NO
//
// LARKON MAPPING:
//   Outer:      <Card>
//   Header:     <Card.Header className="d-flex align-items-center gap-3">
//   Tabs:       <Nav variant="tabs" className="card-header-tabs mt-2">
//                 <Nav.Item><Nav.Link active={...}>Podle dne</Nav.Link>
//   Select:     <Form.Select size="sm" style={{width:"auto"}}>
//   Export btn: <Button variant="outline-secondary" size="sm">
//                 <Download size={13}/> Export
//   Table:      <Table responsive hover> — klient-side sort:
//                 onClick na <th> → setState sortKey + toggleDir
//   Sort ikony: Lucide <ChevronsUpDown> / <ChevronUp> / <ChevronDown>
//               className="ms-1 text-muted" size={12}
//   Mode badge: stejné jako ostatní tabulky (live/závěrka)
//   Tfoot:      <tfoot><tr className="fw-bold bg-light">
//                 <td colSpan={3}>Celkem</td> + 3× <td className="text-end">
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { ProvozovnaId } from '../types';
import { TRZBY_7D, PROVOZOVNY, fCzk, fDate } from '../data';

interface Props {
  provozovna: ProvozovnaId;
}

type SortKey = 'datum' | 'kuchyn' | 'bar' | 'celkem';

export default function TrzbyTable({ provozovna }: Props) {
  const [sortKey,  setSortKey]  = useState<SortKey>('datum');
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('desc');
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
    if (sortKey !== col) return <span style={{ opacity: 0.3 }}>⇅</span>;
    return <span>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const total = sorted.reduce(
    (acc, r) => ({ kuchyn: acc.kuchyn + r.kuchyn, bar: acc.bar + r.bar, celkem: acc.celkem + r.celkem }),
    { kuchyn: 0, bar: 0, celkem: 0 }
  );

  return (
    // COMPONENT: Card + Data Table + Tabs
    // SOURCE: Larkon-like
    // CUSTOM: NO
    <div className="card">
      <div className="card-header">
        <div className="card-title-wrap">
          <div className="card-title">Tržby – detail</div>
          <div className="card-sub">{sorted.length} záznamů</div>
        </div>
        <div className="card-actions">
          <select
            className="select"
            value={provozovna}
            disabled
          >
            <option value="all">Všechny provozovny</option>
            {PROVOZOVNY.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm">⬇ Export</button>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab-btn${activeTab === 'den' ? ' active' : ''}`}
            onClick={() => setActiveTab('den')}
          >
            Podle dne
          </button>
          <button
            className={`tab-btn${activeTab === 'provozovna' ? ' active' : ''}`}
            onClick={() => setActiveTab('provozovna')}
          >
            Podle provozovny
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="dtable">
          <thead>
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
                className="td-r"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('kuchyn')}
              >
                Kuchyň <SortIcon col="kuchyn" />
              </th>
              <th
                className="td-r"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('bar')}
              >
                Bar <SortIcon col="bar" />
              </th>
              <th
                className="td-r"
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
                <td className="td-muted">{fDate(row.datum)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="prov-dot" style={{ background: getProvColor(row.provozovna) }} />
                    {getProvName(row.provozovna)}
                  </div>
                </td>
                <td>
                  {row.mode === 'live' ? (
                    <span className="badge badge-live">
                      <span className="badge-dot" /> Live
                    </span>
                  ) : (
                    <span className="badge badge-info">
                      <span className="badge-dot" /> Závěrka
                    </span>
                  )}
                </td>
                <td className="td-r td-mono" style={{ color: '#3b82f6' }}>
                  {fCzk(row.kuchyn)}
                </td>
                <td className="td-r td-mono" style={{ color: '#16a34a' }}>
                  {fCzk(row.bar)}
                </td>
                <td className="td-r td-mono fw-700">{fCzk(row.celkem)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8fafc', borderTop: '2px solid var(--border)' }}>
              <td className="fw-700" colSpan={3}>
                Celkem
              </td>
              <td className="td-r td-mono fw-700" style={{ color: '#3b82f6' }}>
                {fCzk(total.kuchyn)}
              </td>
              <td className="td-r td-mono fw-700" style={{ color: '#16a34a' }}>
                {fCzk(total.bar)}
              </td>
              <td className="td-r td-mono fw-700" style={{ color: 'var(--c-info)', fontSize: 'var(--fs-md)' }}>
                {fCzk(total.celkem)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
