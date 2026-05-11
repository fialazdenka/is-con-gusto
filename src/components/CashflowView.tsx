// COMPONENT: Cashflow – přehled peněžních toků
// SOURCE: Larkon _page-title.scss + Bootstrap layout + _card.scss
// CUSTOM: YES
//   – SVG týdenní chart (viewBox 840×220): side-by-side sloupce Příjmy/Výdaje, 8 týdnů + projekce
//     → v produkci ApexCharts: type="bar", grouped, projected weeks s nižší opacity
//   – lokální přepínač provozovny (nav tabs Celá firma / CG / Piazza / Monte) – mimo globální AppState
//   – kategorie breakdown: horizontální progress bars (Příjmy 4 kat. + Výdaje 5 kat.)
//   – prognóza 30 dní: živá data z FAKTURY_PLATBY + OSTATNI_PLATBY + POHLEDAVKY
//   – per-provozovna mini karty (jen při activeProv = "all")
//   – KAT_ICONS mapa: iconify ikona pro každou kategorii transakce
//
// Larkon class mapping:
//   .page-title-box                      → page header
//   .nav.nav-pills                       → přepínač provozovny (tab nav)
//   .row.g-4 / .col-lg-8 / .col-lg-4    → chart + prognóza vedle sebe
//   .card > .card-header / .card-body    → jednotlivé sekce
//   .table-responsive                    → horizontální scroll tabulky transakcí
//   .table.table-hover.table-sm          → transakce tabulka
//   .badge.bg-{color}-subtle             → stav transakce (STAV_META_CF: ok/ceka/chyba)
//   CUSTOM: CashflowChart (SVG)          → vlastní SVG, nahradit ApexCharts
//   CUSTOM: kategorie bars               → inline style flex, není v Larkon
//   CUSTOM: activeProv state             → lokální přepínač (neovlivňuje globální AppState)

import { useState } from 'react';
import type { AppState, ProvozovnaId } from '../types';
import {
  getCashflowTydny,
  getCashflowKPI,
  getKategorieBreakdown,
  getCashflowTransakce,
  getUpcomingPrognoza,
  STAV_META_CF,
  KAT_ICONS,
  type CashflowTyden,
} from '../cashflowData';
import { PROVOZOVNY, fCzk, fDate } from '../data';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

// ─── SVG Chart ────────────────────────────────────────────────

function CashflowChart({ data }: { data: CashflowTyden[] }) {
  const W = 840, H = 220;
  const PAD = { t: 20, r: 16, b: 42, l: 64 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  const maxVal = Math.max(...data.map((d) => Math.max(d.prijmy, d.vydaje)));
  const yMax   = Math.ceil((maxVal * 1.12) / 100_000) * 100_000;
  const yScale = (v: number) => cH - (v / yMax) * cH;

  const colW = cW / data.length;
  const barW = Math.max(8, Math.floor((colW - 10) / 2 - 2));

  const gridVals = [0, 0.25, 0.5, 0.75, 1.0].map((f) => f * yMax);

  function fY(v: number) { return (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1_000)}K`); }

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      {/* Grid */}
      {gridVals.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + yScale(v)} y2={PAD.t + yScale(v)} stroke="#e9ecef" strokeWidth={v === 0 ? 1.5 : 1} />
          <text x={PAD.l - 8} y={PAD.t + yScale(v) + 4} textAnchor="end" fontSize="11" fill="#9097a7">{fY(v)}</text>
        </g>
      ))}

      {/* Projected background */}
      {data.map((d, i) => d.projected && (
        <rect key={`bg-${i}`}
          x={PAD.l + i * colW} y={PAD.t} width={colW} height={cH}
          fill="#f8f9fa" rx={0} />
      ))}

      {/* Current week highlight */}
      {data.map((d, i) => d.current && (
        <rect key={`cur-${i}`}
          x={PAD.l + i * colW} y={PAD.t} width={colW} height={cH}
          fill="#fdf3dc" rx={0} />
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const xBase = PAD.l + i * colW + 5;
        const priH  = (d.prijmy / yMax) * cH;
        const vydH  = (d.vydaje / yMax) * cH;
        const alpha = d.projected ? '60' : 'ff';
        return (
          <g key={d.label}>
            {/* Příjmy */}
            <rect x={xBase} y={PAD.t + cH - priH} width={barW} height={priH}
              fill={`#14b8a6${alpha}`} rx={2} />
            {/* Výdaje */}
            <rect x={xBase + barW + 3} y={PAD.t + cH - vydH} width={barW} height={vydH}
              fill={`#ef4444${alpha}`} rx={2} />
          </g>
        );
      })}

      {/* X labels */}
      {data.map((d, i) => (
        <text key={`xl-${i}`}
          x={PAD.l + i * colW + colW / 2} y={H - 6}
          textAnchor="middle" fontSize="11"
          fill={d.current ? '#c9911a' : d.projected ? '#bdc4ce' : '#9097a7'}
          fontWeight={d.current ? 600 : 400}>
          {d.label}{d.projected ? ' *' : ''}
        </text>
      ))}

      {/* Legend */}
      <g transform={`translate(${PAD.l}, ${H - 6})`}>
        <rect x={cW - 200} y={-14} width={10} height={10} fill="#14b8a6" rx={2} />
        <text x={cW - 186} y={-5} fontSize="11" fill="#9097a7">Příjmy</text>
        <rect x={cW - 130} y={-14} width={10} height={10} fill="#ef4444" rx={2} />
        <text x={cW - 116} y={-5} fontSize="11" fill="#9097a7">Výdaje</text>
        <text x={cW - 50}  y={-5} fontSize="10" fill="#bdc4ce">* projekce</text>
      </g>
    </svg>
  );
}

// ─── View ─────────────────────────────────────────────────────

export default function CashflowView({ state, update: _update }: Props) {
  const [stavFilter,  setStavFilter]  = useState('all');

  const effectiveProv = state.selectedProvozovna as ProvozovnaId;
  const kpi           = getCashflowKPI(effectiveProv);
  const tydny         = getCashflowTydny(effectiveProv);
  const { prijmy: prijmyKat, vydaje: vydajeKat } = getKategorieBreakdown(effectiveProv);
  const transakce     = getCashflowTransakce(effectiveProv).filter((t) => stavFilter === 'all' || t.stav === stavFilter);
  const prognoza      = getUpcomingPrognoza(effectiveProv);

  const prognozaVydaje = prognoza.filter((p) => p.typ === 'vydaj').reduce((s, p) => s + p.castka, 0);
  const prognozaPrijmy = prognoza.filter((p) => p.typ === 'prijem').reduce((s, p) => s + p.castka, 0);
  const prognozaNet    = prognozaPrijmy - prognozaVydaje;

  const prijmyTotal = prijmyKat.reduce((s, k) => s + k.castka, 0) || 1;
  const vydajeTotal = vydajeKat.reduce((s, k) => s + k.castka, 0) || 1;

  const getProvName  = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.shortName ?? id;
  const getProvColor = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.color ?? '#9097a7';

  return (
    <>
      {/* ACTION BAR – title odstraněn, zobrazen v topbaru */}
      <div className="page-title-box">
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-light btn-sm">Export PDF</button>
        </div>
      </div>


      {/* Čistý CF alert */}
      {kpi.cistyCC < 0 && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
          <iconify-icon icon="solar:danger-triangle-bold-duotone" className="fs-5 flex-shrink-0" />
          <span><strong>Záporný cashflow tento měsíc</strong> – výdaje převyšují příjmy o {fCzk(Math.abs(kpi.cistyCC))}</span>
        </div>
      )}

      {/* KPI strip */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Příjmy – duben',  value: fCzk(kpi.prijmy),   sub: 'tržby + pohledávky',     icon: 'solar:arrow-up-bold-duotone',         color: '#14b8a6' },
          { label: 'Výdaje – duben',  value: fCzk(kpi.vydaje),   sub: 'faktury + mzdy + nájem', icon: 'solar:arrow-down-bold-duotone',        color: '#ef4444' },
          { label: 'Čistý cashflow',  value: fCzk(kpi.cistyCC),  sub: 'příjmy − výdaje',        icon: 'solar:chart-2-bold-duotone',           color: kpi.cistyCC >= 0 ? '#14b8a6' : '#ef4444' },
          { label: 'Zůstatek na účtech', value: fCzk(kpi.zustatek), sub: 'aktuální stav',       icon: 'solar:dollar-minimalistic-bold-duotone',color: '#c9911a' },
        ].map((k) => (
          <div key={k.label} className="col-sm-6 col-xl-3">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-start gap-3">
                  <iconify-icon icon={k.icon} style={{ fontSize: 26, color: k.color, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div className="text-muted fs-12 mb-1">{k.label}</div>
                    <div className="fw-bold fs-4 font-monospace lh-1 mb-1" style={{ color: k.color }}>{k.value}</div>
                    <div className="text-muted fs-12">{k.sub}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card mb-4">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="card-title mb-0">Týdenní cashflow</h5>
          <span className="text-muted fs-12">posledních 8 týdnů + projekce</span>
        </div>
        <div className="card-body py-3 px-3">
          <CashflowChart data={tydny} />
        </div>
      </div>

      {/* Prognóza + breakdown + per-provozovna */}
      <div className="row g-4 mb-4">

        {/* Prognóza */}
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">Prognóza (30 dní)</h5>
            </div>
            <div className="card-body p-0">
              {/* Sumarizace */}
              <div className="row g-0 border-bottom">
                <div className="col-6 p-3 text-center border-end">
                  <div className="fw-bold font-monospace fs-14 text-success">{fCzk(prognozaPrijmy)}</div>
                  <div className="text-muted fs-11 mt-1">Očekáváno (příjmy)</div>
                </div>
                <div className="col-6 p-3 text-center">
                  <div className="fw-bold font-monospace fs-14 text-danger">{fCzk(prognozaVydaje)}</div>
                  <div className="text-muted fs-11 mt-1">Plánované výdaje</div>
                </div>
              </div>
              <div className={`px-3 py-2 border-bottom d-flex align-items-center justify-content-between`}
                style={{ background: prognozaNet >= 0 ? '#f0fdf4' : '#fef2f2' }}>
                <span className="fs-12 fw-semibold" style={{ color: prognozaNet >= 0 ? '#14b8a6' : '#ef4444' }}>
                  Čistý výhled
                </span>
                <span className="fw-bold font-monospace fs-13" style={{ color: prognozaNet >= 0 ? '#14b8a6' : '#ef4444' }}>
                  {prognozaNet >= 0 ? '+' : '−'}{fCzk(Math.abs(prognozaNet))}
                </span>
              </div>

              {/* Jednotlivé položky */}
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {prognoza.length === 0 && (
                  <div className="p-4 text-center text-muted fs-13">Žádné naplánované platby</div>
                )}
                {prognoza.map((p) => (
                  <div key={p.id} className="px-3 py-2 border-bottom d-flex align-items-center gap-2">
                    <iconify-icon
                      icon={p.typ === 'prijem' ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'}
                      style={{ fontSize: 14, color: p.typ === 'prijem' ? '#14b8a6' : '#ef4444', flexShrink: 0 }}
                    />
                    <div className="flex-grow-1 min-w-0">
                      <div className="fs-12 fw-semibold text-truncate">{p.popis}</div>
                      <div className="text-muted fs-11">{fDate(p.datum)}</div>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <span className={`fw-bold font-monospace fs-12 ${p.typ === 'prijem' ? 'text-success' : 'text-danger'}`}>
                        {p.typ === 'prijem' ? '+' : '−'}{fCzk(p.castka)}
                      </span>
                      <div className="text-muted fs-10">{getProvName(p.provozovna)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown kategorií */}
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">Struktura příjmů a výdajů</h5>
            </div>
            <div className="card-body">
              <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Příjmy</div>
              {prijmyKat.map((k) => (
                <div key={k.label} className="d-flex align-items-center gap-2 mb-2">
                  <div style={{ width: 90, flexShrink: 0 }} className="text-muted fs-12 text-truncate">{k.label}</div>
                  <div className="flex-grow-1" style={{ height: 8, background: '#f0f2f7', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((k.castka / prijmyTotal) * 100)}%`, background: k.color, borderRadius: 4 }} />
                  </div>
                  <div style={{ width: 80, textAlign: 'right', flexShrink: 0 }} className="font-monospace fs-12">{fCzk(k.castka)}</div>
                </div>
              ))}

              <div className="text-uppercase fw-semibold text-muted fs-11 mb-2 mt-3">Výdaje</div>
              {vydajeKat.map((k) => (
                <div key={k.label} className="d-flex align-items-center gap-2 mb-2">
                  <div style={{ width: 90, flexShrink: 0 }} className="text-muted fs-12 text-truncate">{k.label}</div>
                  <div className="flex-grow-1" style={{ height: 8, background: '#f0f2f7', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((k.castka / vydajeTotal) * 100)}%`, background: k.color, borderRadius: 4 }} />
                  </div>
                  <div style={{ width: 80, textAlign: 'right', flexShrink: 0 }} className="font-monospace fs-12">{fCzk(k.castka)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Per-provozovna */}
        {effectiveProv === 'all' && (
          <div className="col-lg-3">
            <div className="card h-100">
              <div className="card-header">
                <h5 className="card-title mb-0">Dle střediska</h5>
              </div>
              <div className="card-body p-0">
                {PROVOZOVNY.filter((p) => p.status === 'active').map((prov) => {
                  const kpiP = getCashflowKPI(prov.id);
                  const margin = Math.round(((kpiP.prijmy - kpiP.vydaje) / kpiP.prijmy) * 100);
                  return (
                    <div key={prov.id} className="p-3 border-bottom">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: getProvColor(prov.id), flexShrink: 0 }} />
                        <span className="fw-semibold fs-13">{prov.name}</span>
                        <span className={`badge ms-auto ${margin >= 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                          {margin >= 0 ? '+' : ''}{margin}%
                        </span>
                      </div>
                      <div className="d-flex justify-content-between fs-12">
                        <span className="text-success">+{fCzk(kpiP.prijmy)}</span>
                        <span className="text-danger">−{fCzk(kpiP.vydaje)}</span>
                      </div>
                      <div className="mt-2" style={{ height: 4, background: '#f0f2f7', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, Math.round((kpiP.vydaje / kpiP.prijmy) * 100))}%`, background: margin >= 15 ? '#14b8a6' : margin >= 0 ? '#c9911a' : '#ef4444', borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Transakce */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between gap-3">
          <h5 className="card-title mb-0 flex-grow-1">
            Pohyby
            <small className="text-muted fw-normal ms-2 fs-13">{transakce.length} záznamů</small>
          </h5>
          <select className="form-select form-select-sm" style={{ width: 'auto' }}
            value={stavFilter} onChange={(e) => setStavFilter(e.target.value)}>
            <option value="all">Všechny stavy</option>
            <option value="ok">V pořádku</option>
            <option value="ceka">Čeká</option>
            <option value="chyba">Chyba</option>
          </select>
        </div>
        <div className="table-responsive">
          <table className="table table-hover table-centered table-nowrap mb-0">
            <thead className="table-light">
              <tr>
                <th>Typ</th>
                <th>Popis</th>
                {effectiveProv === 'all' && <th>Středisko</th>}
                <th>Datum</th>
                <th className="text-end">Částka</th>
                <th>Stav</th>
              </tr>
            </thead>
            <tbody>
              {transakce.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-muted">Žádné záznamy</td></tr>
              )}
              {transakce.map((t) => {
                const { cls, label } = STAV_META_CF[t.stav] ?? STAV_META_CF.ok;
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <iconify-icon
                          icon={KAT_ICONS[t.kategorie]}
                          style={{ fontSize: 16, color: t.typ === 'prijem' ? '#14b8a6' : '#9097a7', flexShrink: 0 }}
                        />
                        <span className={`fs-11 fw-semibold ${t.typ === 'prijem' ? 'text-success' : 'text-muted'}`}>
                          {t.typ === 'prijem' ? 'Příjem' : 'Výdaj'}
                        </span>
                      </div>
                    </td>
                    <td className="fw-semibold">{t.popis}</td>
                    {effectiveProv === 'all' && (
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: getProvColor(t.provozovna), flexShrink: 0 }} />
                          <span className="fs-13">{getProvName(t.provozovna)}</span>
                        </div>
                      </td>
                    )}
                    <td className="text-muted fs-13">{fDate(t.datum)}</td>
                    <td className={`text-end fw-bold font-monospace ${t.typ === 'prijem' ? 'text-success' : ''}`}>
                      {t.typ === 'prijem' ? '+' : '−'}{fCzk(t.castka)}
                    </td>
                    <td><span className={`badge ${cls}`}>{label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card-footer py-2 bg-light bg-opacity-50">
          <span className="text-muted fs-12">
            Stavy: <span className="text-success fw-semibold">V pořádku</span> · <span className="text-warning fw-semibold">Čeká na kontrolu</span> · <span className="text-danger fw-semibold">Chyba</span>
          </span>
        </div>
      </div>
    </>
  );
}
