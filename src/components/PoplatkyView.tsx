// COMPONENT: Poplatky — sekce Finance → Poplatky (Phase 5)
// Per zápis 4. 6. 2026: bankovní poplatky jako celofiremní náklad,
// auto-detekce z bank. transakcí, měsíční souhrny + breakdown po typech.

import { useState, useMemo } from 'react';
import type { AppState } from '../types';
import {
  POPLATKY,
  POPLATKY_TYP_META,
  getMesicniSouhrn,
  getSumaZaObdobi,
  getBreakdownPoTypech,
  type Poplatek,
  type PoplatekTyp,
} from '../poplatkyData';
import { BANKA_UCTY } from '../bankaData';
import { fCzk, fDate } from '../data';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

// ──────────────────────────────────────────────────────────────
// KPI strip — celkem / aktuální měsíc / průměr / nejdražší typ
// ──────────────────────────────────────────────────────────────
function KpiStrip({ data }: { data: Poplatek[] }) {
  const tenMonth = '2026-06';
  const lastMonth = '2026-05';

  const sumaTento  = getSumaZaObdobi(data, tenMonth, tenMonth);
  const sumaMinuly = getSumaZaObdobi(data, lastMonth, lastMonth);
  const trendPct   = sumaMinuly > 0 ? ((sumaTento - sumaMinuly) / sumaMinuly) * 100 : 0;
  const trendIsUp  = trendPct > 0;

  const souhrny = getMesicniSouhrn(data);
  const prumer = souhrny.length > 0 ? souhrny.reduce((s, m) => s + m.celkem, 0) / souhrny.length : 0;

  const breakdown = getBreakdownPoTypech(data);
  const nejdrazsi = breakdown[0];

  type Tile = { label: string; value: string; sub?: string; icon: string; color: string };
  const tiles: Tile[] = [
    { label: 'Tento měsíc (červen)', value: fCzk(Math.round(sumaTento)),
      sub: trendPct !== 0 ? `${trendIsUp ? '↑' : '↓'} ${Math.abs(trendPct).toFixed(1)} % vs. minulý` : 'beze změny',
      icon: 'solar:calendar-bold-duotone', color: '#0d6efd' },
    { label: 'Průměr/měsíc',         value: fCzk(Math.round(prumer)), sub: `${souhrny.length} měsíců`,
      icon: 'solar:graph-bold-duotone', color: '#198754' },
    { label: 'Nejdražší typ',        value: nejdrazsi ? POPLATKY_TYP_META[nejdrazsi.typ].label : '—',
      sub: nejdrazsi ? `${fCzk(Math.round(nejdrazsi.castka))} (${nejdrazsi.pct.toFixed(0)} %)` : '',
      icon: 'solar:tag-price-bold-duotone', color: '#fd7e14' },
    { label: 'Záznamů celkem',       value: String(data.length), sub: `napříč ${souhrny.length} měsíci`,
      icon: 'solar:document-text-bold-duotone', color: '#6f42c1' },
  ];

  return (
    <div className="row g-2 mb-3">
      {tiles.map((t) => (
        <div key={t.label} className="col-6 col-md-3">
          <div className="card h-100" style={{ borderTop: `3px solid ${t.color}` }}>
            <div className="card-body py-3 d-flex align-items-center gap-3">
              <span className="d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 40, height: 40, background: `${t.color}1a`, color: t.color, flexShrink: 0 }}>
                <iconify-icon icon={t.icon} style={{ fontSize: 22 }} />
              </span>
              <div className="min-width-0">
                <div className="text-muted fs-12 text-uppercase fw-semibold" style={{ letterSpacing: '0.3px' }}>{t.label}</div>
                <div className="fw-bold czk-num text-truncate" style={{ fontSize: 16, lineHeight: 1.2 }}>{t.value}</div>
                {t.sub && <div className="text-muted fs-11">{t.sub}</div>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Breakdown po typech — horizontální barbar
// ──────────────────────────────────────────────────────────────
function TypeBreakdown({ data, activeTyp, onSetTyp }: { data: Poplatek[]; activeTyp: PoplatekTyp | 'all'; onSetTyp: (t: PoplatekTyp | 'all') => void }) {
  const breakdown = getBreakdownPoTypech(data);
  if (breakdown.length === 0) return null;
  return (
    <div className="card mb-3">
      <div className="card-body py-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <iconify-icon icon="solar:chart-bold-duotone" style={{ fontSize: 16, color: '#0d6efd' }} />
            <div className="fw-semibold fs-13">Rozpad po typech</div>
            <span className="text-muted fs-11 d-none d-md-inline">Klikni pro filtraci tabulky</span>
          </div>
          {activeTyp !== 'all' && (
            <button className="btn btn-link btn-sm p-0 text-muted" style={{ fontSize: 12 }} onClick={() => onSetTyp('all')}>
              Zrušit filtr ×
            </button>
          )}
        </div>
        <div className="d-flex flex-column gap-1">
          {breakdown.map((b) => {
            const meta = POPLATKY_TYP_META[b.typ];
            const isActive = activeTyp === b.typ;
            return (
              <button key={b.typ}
                onClick={() => onSetTyp(isActive ? 'all' : b.typ)}
                className="d-flex align-items-center gap-2 py-1 px-2 rounded border-0 w-100 text-start"
                style={{
                  background: isActive ? `${meta.color}26` : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                <iconify-icon icon={meta.icon} style={{ fontSize: 14, color: meta.color, flexShrink: 0 }} />
                <div style={{ width: 160, flexShrink: 0 }} className="fs-12 fw-semibold text-truncate">{meta.label}</div>
                <div className="flex-grow-1 position-relative" style={{ height: 8, background: '#f1f3f5', borderRadius: 4 }}>
                  <div style={{
                    width: `${b.pct}%`, height: '100%',
                    background: meta.color, borderRadius: 4,
                    transition: 'width 0.25s',
                  }} />
                </div>
                <div className="d-flex align-items-center gap-2" style={{ width: 160, justifyContent: 'flex-end' }}>
                  <span className="czk-num fw-semibold fs-12">{fCzk(Math.round(b.castka))}</span>
                  <span className="text-muted fs-11" style={{ width: 36, textAlign: 'right' }}>{b.pct.toFixed(0)} %</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Tabulka poplatků
// ──────────────────────────────────────────────────────────────
function PoplatkyTable({ data, ucty, search, setSearch, typFilter, setTypFilter, ucetFilter, setUcetFilter, mesicFilter, setMesicFilter, onClearFilters }: {
  data: Poplatek[];
  ucty: typeof BANKA_UCTY;
  search: string;
  setSearch: (s: string) => void;
  typFilter: PoplatekTyp | 'all';
  setTypFilter: (t: PoplatekTyp | 'all') => void;
  ucetFilter: string;
  setUcetFilter: (s: string) => void;
  mesicFilter: string;
  setMesicFilter: (s: string) => void;
  onClearFilters: () => void;
}) {
  const hasAnyFilter = !!(search || typFilter !== 'all' || ucetFilter !== 'all' || mesicFilter);
  return (
    <div className="card">
      <div className="card-header">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <h5 className="card-title mb-0">
            Poplatky
            <small className="text-muted fw-normal ms-2 fs-13">
              {data.length} {data.length === 1 ? 'záznam' : data.length < 5 ? 'záznamy' : 'záznamů'} ·
              suma {fCzk(Math.round(data.reduce((s, p) => s + p.castka, 0)))}
            </small>
          </h5>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
          <div className="position-relative" style={{ width: 220 }}>
            <iconify-icon icon="solar:magnifer-bold-duotone"
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9097a7' }} />
            <input type="text" className="form-control form-control-sm w-100"
              placeholder="Hledat popis…" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 28 }} />
          </div>
          <select className="form-select form-select-sm" style={{ width: 'auto' }}
            value={typFilter} onChange={(e) => setTypFilter(e.target.value as PoplatekTyp | 'all')}>
            <option value="all">Všechny typy</option>
            {Object.entries(POPLATKY_TYP_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select className="form-select form-select-sm" style={{ width: 'auto', maxWidth: 220 }}
            value={ucetFilter} onChange={(e) => setUcetFilter(e.target.value)}>
            <option value="all">Všechny účty</option>
            {ucty.map((u) => (
              <option key={u.id} value={u.id}>{u.nazev}</option>
            ))}
          </select>
          <input type="month" className="form-control form-control-sm" style={{ width: 'auto' }}
            value={mesicFilter} onChange={(e) => setMesicFilter(e.target.value)} title="Filtr na konkrétní měsíc" />
          {hasAnyFilter && (
            <button className="btn btn-outline-danger btn-sm ms-auto" onClick={onClearFilters} style={{ fontSize: 12 }}>
              <iconify-icon icon="solar:eraser-bold-duotone" className="me-1" />
              Vyčistit filtry
            </button>
          )}
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-centered table-nowrap mb-0" style={{ fontSize: 12 }}>
          <thead className="table-light">
            <tr>
              <th>Datum</th>
              <th>Typ</th>
              <th>Popis</th>
              <th>Účet</th>
              <th>Banka</th>
              <th className="text-end">Částka</th>
              <th>Detekce</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Žádné poplatky nesplňují filtr</td></tr>
            )}
            {data.map((p) => {
              const ucet = ucty.find((u) => u.id === p.ucetId);
              const typM = POPLATKY_TYP_META[p.typ];
              return (
                <tr key={p.id}>
                  <td className="czk-num">{fDate(p.datum)}</td>
                  <td>
                    <span className="badge d-inline-flex align-items-center gap-1"
                      style={{ background: typM.bg, color: typM.color, fontSize: 10 }}>
                      <iconify-icon icon={typM.icon} style={{ fontSize: 11 }} />
                      {typM.label}
                    </span>
                  </td>
                  <td>{p.popis}</td>
                  <td>
                    <div className="fw-semibold">{ucet?.nazev ?? '—'}</div>
                    {ucet && <div className="text-muted czk-num" style={{ fontSize: 10 }}>{ucet.iban.slice(0, 12)}…</div>}
                  </td>
                  <td className="text-muted">{p.banka}</td>
                  <td className="text-end czk-num fw-bold text-danger">
                    −{fCzk(p.castka)}
                  </td>
                  <td>
                    {p.auto ? (
                      <span className="badge bg-info-subtle text-info" style={{ fontSize: 10 }} title="Auto-detekováno z bankovní transakce">
                        <iconify-icon icon="solar:bolt-bold-duotone" className="me-1" style={{ fontSize: 10 }} />
                        Auto
                      </span>
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 10 }}>
                        Manuální
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Měsíční souhrny — pravý sloupec (mini-cards)
// ──────────────────────────────────────────────────────────────
function MesicniSouhrny({ data, mesicFilter, onSetMesic }: { data: Poplatek[]; mesicFilter: string; onSetMesic: (s: string) => void }) {
  const souhrny = getMesicniSouhrn(data).slice(0, 6);
  return (
    <div className="card">
      <div className="card-header py-2">
        <div className="d-flex align-items-center gap-2">
          <iconify-icon icon="solar:calendar-bold-duotone" style={{ fontSize: 14, color: '#0d6efd' }} />
          <div className="fw-semibold fs-13">Měsíční souhrny</div>
        </div>
      </div>
      <div className="card-body p-2 d-flex flex-column gap-1">
        {souhrny.map((s) => {
          const isActive = mesicFilter === s.mesic;
          const topTyp = Object.entries(s.podleTypu).sort((a, b) => b[1] - a[1])[0];
          return (
            <button key={s.mesic}
              className="d-flex align-items-center gap-2 px-2 py-2 rounded border-0 text-start"
              style={{
                background: isActive ? '#e8f0ff' : '#fafbfc',
                border: isActive ? '1px solid #0d6efd' : '1px solid transparent',
                cursor: 'pointer',
              }}
              onClick={() => onSetMesic(isActive ? '' : s.mesic)}>
              <div className="flex-grow-1 min-width-0">
                <div className="fw-semibold fs-12">{s.label}</div>
                <div className="text-muted" style={{ fontSize: 10 }}>
                  {s.pocet} záznamů
                  {topTyp && ` · top ${POPLATKY_TYP_META[topTyp[0] as PoplatekTyp].label}`}
                </div>
              </div>
              <div className="text-end">
                <div className="fw-bold czk-num fs-13 text-danger">−{fCzk(Math.round(s.celkem))}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main view
// ──────────────────────────────────────────────────────────────
export default function PoplatkyView(_props: Props) {
  const [search, setSearch] = useState('');
  const [typFilter, setTypFilter]     = useState<PoplatekTyp | 'all'>('all');
  const [ucetFilter, setUcetFilter]   = useState('all');
  const [mesicFilter, setMesicFilter] = useState(''); // YYYY-MM

  const filtered = useMemo(() => {
    return POPLATKY.filter((p) => {
      if (typFilter !== 'all'  && p.typ !== typFilter)   return false;
      if (ucetFilter !== 'all' && p.ucetId !== ucetFilter) return false;
      if (mesicFilter && p.datum.slice(0, 7) !== mesicFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.popis.toLowerCase().includes(q) && !p.banka.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.datum.localeCompare(a.datum));
  }, [typFilter, ucetFilter, mesicFilter, search]);

  // KPI a Breakdown počítají z všech dat (nezávisle na filtru)
  return (
    <>
      <KpiStrip data={POPLATKY} />
      <TypeBreakdown data={POPLATKY} activeTyp={typFilter} onSetTyp={setTypFilter} />

      <div className="row g-3">
        <div className="col-xl-9 col-lg-8">
          <PoplatkyTable
            data={filtered} ucty={BANKA_UCTY}
            search={search} setSearch={setSearch}
            typFilter={typFilter} setTypFilter={setTypFilter}
            ucetFilter={ucetFilter} setUcetFilter={setUcetFilter}
            mesicFilter={mesicFilter} setMesicFilter={setMesicFilter}
            onClearFilters={() => {
              setSearch(''); setTypFilter('all'); setUcetFilter('all'); setMesicFilter('');
            }}
          />
        </div>
        <div className="col-xl-3 col-lg-4">
          <MesicniSouhrny data={POPLATKY} mesicFilter={mesicFilter} onSetMesic={setMesicFilter} />
        </div>
      </div>
    </>
  );
}
