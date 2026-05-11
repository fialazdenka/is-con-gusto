// COMPONENT: Tržby – Reporting Table v3
// SOURCE: Larkon _tables.scss + _card.scss + _nav.scss
// CUSTOM: PARTIAL – výkon progress bar, osoba, kategorie ratio
//
// Larkon class mapping:
//   .card                             → karta
//   .card-header                      → header s tabs + toolbar
//   .nav.nav-tabs.card-header-tabs    → tab navigace
//   .table.table-hover.table-nowrap   → tabulka
//   .badge.bg-*-subtle                → status badges
//   .progress                         → výkon progress bar (CUSTOM)

import { useState } from 'react';
import type { ProvozovnaId, Period } from '../types';
import { TRZBY_7D, PROVOZOVNY, fCzk, fDate } from '../data';

// Mock denní cíle (Kč) pro výpočet výkonu
const DAILY_TARGET: Record<string, number> = {
  'cg-brno':                80000,
  'piazza':                 56000,
  'monte':                  46000,
  'u-capa':                 52000,
  'korek-winebar':          42000,
  'u-kohoutu':              48000,
  'nad-hladinkou':          44000,
  'flank':                  58000,
  'cg-catering':            70000,
  'tackarna-londyn':        24000,
  'tackarna-turanka':       18000,
  'tackarna-svedske-valy':  20000,
  'teatr':                  54000,
  'korek-wines':            36000,
  'jime-brno':              46000,
};

interface Props {
  provozovna: ProvozovnaId;
  period?: Period;
}

type SortKey = 'datum' | 'kuchyn' | 'bar' | 'celkem' | 'vykon';
type TabKey  = 'den' | 'provozovna';

function getProvozovna(id: string) {
  return PROVOZOVNY.find((p) => p.id === id);
}

function vykKls(v: number) {
  if (v >= 100) return '#22c55e';
  if (v >= 80)  return '#c9911a';
  return '#ef4444';
}

export default function TrzbyTable({ provozovna, period = 'tyden' }: Props) {
  const [sortKey,   setSortKey]   = useState<SortKey>('datum');
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<TabKey>('den');
  const [search,    setSearch]    = useState('');

  const rows = TRZBY_7D.filter(
    (t) => (provozovna === 'all' || t.provozovna === provozovna) && t.celkem > 0
  );

  // Search filter (po názvu provozovny)
  const searched = search.trim()
    ? rows.filter((r) => {
        const pn = getProvozovna(r.provozovna);
        return (pn?.name ?? '').toLowerCase().includes(search.toLowerCase());
      })
    : rows;

  // Sort
  const sorted = [...searched].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'datum') return a.datum.localeCompare(b.datum) * dir;
    if (sortKey === 'vykon') {
      const vA = (a.celkem / (DAILY_TARGET[a.provozovna] ?? 60000)) * 100;
      const vB = (b.celkem / (DAILY_TARGET[b.provozovna] ?? 60000)) * 100;
      return (vA - vB) * dir;
    }
    return (a[sortKey as 'kuchyn' | 'bar' | 'celkem'] - b[sortKey as 'kuchyn' | 'bar' | 'celkem']) * dir;
  });

  // Agregace po provozovnách (záložka "Podle provozovny")
  const byProv = PROVOZOVNY
    .filter((p) => p.status === 'active' && (provozovna === 'all' || p.id === provozovna))
    .map((p) => {
      const pRows = searched.filter((r) => r.provozovna === p.id);
      if (!pRows.length) return null;
      const kuchyn = pRows.reduce((s, r) => s + r.kuchyn, 0);
      const bar    = pRows.reduce((s, r) => s + r.bar,    0);
      const celkem = pRows.reduce((s, r) => s + r.celkem, 0);
      const vykon  = Math.round((celkem / (DAILY_TARGET[p.id] ?? 60000) / 7) * 100);
      return { p, kuchyn, bar, celkem, vykon, manager: p.manager };
    })
    .filter(Boolean) as {
      p: typeof PROVOZOVNY[0]; kuchyn: number; bar: number; celkem: number; vykon: number; manager: string;
    }[];

  const total = sorted.reduce(
    (acc, r) => ({ kuchyn: acc.kuchyn + r.kuchyn, bar: acc.bar + r.bar, celkem: acc.celkem + r.celkem }),
    { kuchyn: 0, bar: 0, celkem: 0 }
  );

  const provTotal = byProv.reduce(
    (acc, r) => ({ kuchyn: acc.kuchyn + r.kuchyn, bar: acc.bar + r.bar, celkem: acc.celkem + r.celkem }),
    { kuchyn: 0, bar: 0, celkem: 0 }
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <iconify-icon icon="solar:sort-bold" className="ms-1 text-muted" style={{ fontSize: 11 }} />;
    return sortDir === 'asc'
      ? <iconify-icon icon="solar:alt-arrow-up-bold" className="ms-1" style={{ fontSize: 11 }} />
      : <iconify-icon icon="solar:alt-arrow-down-bold" className="ms-1" style={{ fontSize: 11 }} />;
  }

  return (
    <div className="card mb-4">
      {/* ── Header + toolbar ── SOURCE: Larkon .card-header ───── */}
      <div className="card-header">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h5 className="card-title mb-0">
              Reportovací tabulka
              <small className="text-muted fw-normal ms-2 fs-13">
                {activeTab === 'den' ? `${sorted.length} záznamů` : `${byProv.length} provozoven`}
                {' · '}7D přehled
              </small>
            </h5>
          </div>
          <div className="d-flex align-items-center gap-2">
            {/* Search */}
            <div className="position-relative d-none d-md-block">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Hledat provozovnu..."
                style={{ paddingLeft: 30, width: 180 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <iconify-icon
                icon="solar:magnifer-linear"
                style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--bs-secondary-color)' }}
              />
            </div>
            <span className="badge bg-light text-muted border fs-11">
              Cíl: denní plán
            </span>
            <button className="btn btn-light btn-sm d-flex align-items-center gap-1">
              <iconify-icon icon="solar:export-bold" style={{ fontSize: 13 }} />
              Export
            </button>
          </div>
        </div>

        {/* Tabs */}
        <ul className="nav nav-tabs card-header-tabs mt-2">
          <li className="nav-item">
            <a className={`nav-link${activeTab === 'den' ? ' active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setActiveTab('den')}>
              Podle dne
            </a>
          </li>
          <li className="nav-item">
            <a className={`nav-link${activeTab === 'provozovna' ? ' active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setActiveTab('provozovna')}>
              Podle provozovny
            </a>
          </li>
        </ul>
      </div>

      {/* ── Tabulka: Podle dne ──────────────────────────────────── */}
      {activeTab === 'den' && (
        <div className="table-responsive">
          <table className="table table-hover table-centered table-nowrap mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('datum')}>
                  Datum <SortIcon col="datum" />
                </th>
                <th>Provozovna &amp; Osoba</th>
                <th>Kategorie</th>
                <th className="text-end d-mobile-none" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('kuchyn')}>
                  Kuchyň <SortIcon col="kuchyn" />
                </th>
                <th className="text-end d-mobile-none" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('bar')}>
                  Bar <SortIcon col="bar" />
                </th>
                <th className="text-end" style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('celkem')}>
                  Celkem <SortIcon col="celkem" />
                </th>
                <th style={{ minWidth: 120, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('vykon')}>
                  Výkon <SortIcon col="vykon" />
                </th>
                <th>Stav</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => {
                const prov   = getProvozovna(row.provozovna);
                const target = DAILY_TARGET[row.provozovna] ?? 60000;
                const vykon  = Math.min(Math.round((row.celkem / target) * 100), 120);
                const kShare = row.celkem > 0 ? Math.round((row.kuchyn / row.celkem) * 100) : 0;
                const bShare = 100 - kShare;

                return (
                  <tr key={`${row.datum}-${row.provozovna}-${i}`}>
                    {/* Datum */}
                    <td className="text-muted fs-13">{fDate(row.datum)}</td>

                    {/* Provozovna & Osoba */}
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle flex-shrink-0" style={{ width: 8, height: 8, background: prov?.color ?? '#94a3b8', display: 'inline-block' }} />
                        <div>
                          <div className="fw-semibold fs-13">{prov?.shortName ?? row.provozovna}</div>
                          <div className="text-muted fs-11">{prov?.manager ?? '—'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Kategorie – K/B ratio chips */}
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <span className="badge bg-primary-subtle" style={{ color: '#1c84ee', fontSize: 10, fontWeight: 600 }}>K {kShare} %</span>
                        <span className="badge bg-success-subtle" style={{ color: '#15803d', fontSize: 10, fontWeight: 600 }}>B {bShare} %</span>
                      </div>
                    </td>

                    {/* Kuchyň */}
                    <td className="text-end font-monospace fs-13 d-mobile-none" style={{ color: '#1c84ee' }}>
                      {fCzk(row.kuchyn)}
                    </td>

                    {/* Bar */}
                    <td className="text-end font-monospace fs-13 d-mobile-none" style={{ color: '#16a34a' }}>
                      {fCzk(row.bar)}
                    </td>

                    {/* Celkem */}
                    <td className="text-end font-monospace fw-bold fs-13">{fCzk(row.celkem)}</td>

                    {/* Výkon */}
                    <td>
                      <div className="trzby-perf-bar">
                        <div className="progress" style={{ height: 6, flex: 1, minWidth: 60, borderRadius: 3 }}>
                          <div
                            className="progress-bar"
                            style={{ width: `${Math.min(vykon, 100)}%`, background: vykKls(vykon), borderRadius: 3, transition: 'width 0.3s' }}
                          />
                        </div>
                        <span className="fs-11 fw-semibold text-nowrap" style={{ color: vykKls(vykon), minWidth: 38, textAlign: 'right' }}>
                          {vykon} %
                        </span>
                      </div>
                    </td>

                    {/* Stav */}
                    <td>
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
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="fw-bold table-light">
                <td colSpan={3}>Celkem za výběr</td>
                <td className="text-end font-monospace d-mobile-none" style={{ color: '#1c84ee' }}>{fCzk(total.kuchyn)}</td>
                <td className="text-end font-monospace d-mobile-none" style={{ color: '#16a34a' }}>{fCzk(total.bar)}</td>
                <td className="text-end font-monospace fs-6">{fCzk(total.celkem)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Tabulka: Podle provozovny ──────────────────────────── */}
      {activeTab === 'provozovna' && (
        <div className="table-responsive">
          <table className="table table-hover table-centered table-nowrap mb-0">
            <thead className="table-light">
              <tr>
                <th>Provozovna</th>
                <th>Odpovědná osoba</th>
                <th>Kategorie</th>
                <th className="text-end d-mobile-none">Kuchyň 7D</th>
                <th className="text-end d-mobile-none">Bar 7D</th>
                <th className="text-end">Celkem 7D</th>
                <th style={{ minWidth: 130 }}>Výkon (Ø/den)</th>
                <th className="text-end d-mobile-none">Cíl/den</th>
              </tr>
            </thead>
            <tbody>
              {byProv.map(({ p, kuchyn, bar, celkem, vykon, manager }) => {
                const kShare = celkem > 0 ? Math.round((kuchyn / celkem) * 100) : 0;
                const bShare = 100 - kShare;
                return (
                  <tr key={p.id}>
                    {/* Provozovna */}
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle flex-shrink-0" style={{ width: 10, height: 10, background: p.color, display: 'inline-block' }} />
                        <span className="fw-semibold fs-13">{p.name}</span>
                      </div>
                    </td>

                    {/* Osoba */}
                    <td className="text-muted fs-13">{manager}</td>

                    {/* Kategorie */}
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <span className="badge bg-primary-subtle" style={{ color: '#1c84ee', fontSize: 10 }}>K {kShare} %</span>
                        <span className="badge bg-success-subtle" style={{ color: '#15803d', fontSize: 10 }}>B {bShare} %</span>
                      </div>
                    </td>

                    <td className="text-end font-monospace fs-13 d-mobile-none" style={{ color: '#1c84ee' }}>{fCzk(kuchyn)}</td>
                    <td className="text-end font-monospace fs-13 d-mobile-none" style={{ color: '#16a34a' }}>{fCzk(bar)}</td>
                    <td className="text-end font-monospace fw-bold fs-13">{fCzk(celkem)}</td>

                    {/* Výkon */}
                    <td>
                      <div className="trzby-perf-bar">
                        <div className="progress" style={{ height: 6, flex: 1, minWidth: 60, borderRadius: 3 }}>
                          <div
                            className="progress-bar"
                            style={{ width: `${Math.min(vykon, 100)}%`, background: vykKls(vykon), borderRadius: 3 }}
                          />
                        </div>
                        <span className="fs-11 fw-semibold text-nowrap" style={{ color: vykKls(vykon), minWidth: 38, textAlign: 'right' }}>
                          {vykon} %
                        </span>
                      </div>
                    </td>

                    <td className="text-end font-monospace text-muted fs-12 d-mobile-none">
                      {fCzk(DAILY_TARGET[p.id] ?? 60000)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="fw-bold table-light">
                <td colSpan={3}>Celkem</td>
                <td className="text-end font-monospace d-mobile-none" style={{ color: '#1c84ee' }}>{fCzk(provTotal.kuchyn)}</td>
                <td className="text-end font-monospace d-mobile-none" style={{ color: '#16a34a' }}>{fCzk(provTotal.bar)}</td>
                <td className="text-end font-monospace fs-6">{fCzk(provTotal.celkem)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Period context footer */}
      <div className="card-footer py-2 px-4 d-flex align-items-center justify-content-between">
        <small className="text-muted">
          Zobrazeno: <strong>7D detail (13.4.–19.4.2026)</strong>
          {period !== 'tyden' && <span className="ms-2 badge bg-light text-muted border fs-10">Vybrané období: {period}</span>}
        </small>
        <small className="text-muted">
          Výkon = celkové tržby / denní cíl · barevně: ≥100 % zelená · 80–99 % žlutá · &lt;80 % červená
        </small>
      </div>
    </div>
  );
}
