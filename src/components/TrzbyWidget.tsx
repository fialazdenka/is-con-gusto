// COMPONENT: Tržby Widget v2 – hlavní modul tržeb
// SOURCE: Larkon _card.scss + _nav.scss + Bootstrap utilities
// CUSTOM: YES (SVG bar chart → v produkci ApexCharts grouped bar)
//
// Larkon class mapping:
//   .card                              → karta (border-top: 4px solid #ff6c2f)
//   .card-header                       → hlavička
//   .card-title / small.text-muted     → titulek + subtitle
//   .nav.nav-tabs.card-header-tabs     → tab navigace (Piazza střediska)
//   .progress (height:6px)             → progress bar provozoven
//   .progress-bar                      → výplň
//   .badge.bg-success-subtle / bg-danger-subtle → trend badge
//   .lk-custom                         → CUSTOM obal pro SVG chart
//   .lk-custom-label                   → CUSTOM popis

import { useState } from 'react';
import type { ProvozovnaId, Period } from '../types';
import {
  DAYS_7,
  PROVOZOVNY,
  getTrzbyByDayV2,
  getTotalTrzbyV2,
  getPrevTotalTrzby,
  getTrzbyPerProvozovna,
  getMesicVsLY,
  getTrzbyDnes,
  getTrzbyD7,
  getTrzbyForPeriod,
  getTotalForPeriod,
  getPrevForPeriod,
  getPeriodTitle,
  getPeriodCompareLabel,
  periodBarLabel,
  fCzk,
  fDate,
  fDayLabel,
  pctChange,
  type TrzbyZdroj,
  type Stredisko,
} from '../data';

// ─── Chart constants ──────────────────────────────────────────

const CW = 580, CH = 200;
const ML = 54, MT = 12, MR = 12, MB = 46;
const IW = CW - ML - MR;
const IH = CH - MT - MB;

function yPx(val: number, yMax: number) { return MT + IH - (val / yMax) * IH; }
function hPx(val: number, yMax: number) { return (val / yMax) * IH; }
function fmt(n: number)                  { return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n); }

interface DayRow {
  datum: string;
  kuchyn: number;
  bar: number;
  celkem: number;
  zdroj: TrzbyZdroj;
  strediska?: Stredisko[];
}

interface TooltipState {
  i: number;
  x: number;
  row: DayRow;
}

interface Props {
  provozovna: ProvozovnaId;
  period?: Period;
  onDrillDown?: (id: ProvozovnaId) => void;
}

export default function TrzbyWidget({ provozovna, period = 'tyden', onDrillDown }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [tab, setTab]         = useState<'tyden' | 'strediska'>('tyden');

  // Hero blok – jen pro dnes/vcera
  const showHero = period === 'dnes' || period === 'vcera';
  const dnes  = getTrzbyDnes(provozovna);
  const d7    = getTrzbyD7(provozovna);
  const d7Chng = pctChange(dnes.celkem, d7.celkem);
  const d7Up   = d7Chng >= 0;

  const dayData  = getTrzbyForPeriod(provozovna, period) as DayRow[];
  const cur      = getTotalForPeriod(provozovna, period);
  const prev     = getPrevForPeriod(provozovna, period);
  const weekChng = pctChange(cur.celkem, prev.celkem);
  const isUp     = weekChng >= 0;

  const mesic           = getMesicVsLY(provozovna);
  const provozovnyData  = getTrzbyPerProvozovna(DAYS_7);

  const maxVal  = Math.max(...dayData.map((d) => d.celkem), 1);
  const yMax    = Math.ceil(maxVal / 50000) * 50000;
  const gridVals = [yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  const n       = dayData.length;
  const groupW  = IW / n;
  // Stacked bar – jeden sloupec na den, cca 60 % šířky skupiny
  const barW    = Math.max(Math.floor(groupW * 0.60), 16);

  const showStrediska = provozovna === 'piazza';
  const showDrillDown = provozovna === 'all';

  return (
    <div className="card mb-4" style={{ borderTop: '4px solid #ff6c2f' }}>

      {/* ── Header ─── SOURCE: Larkon .card-header ─────────── */}
      <div className="card-header">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h5 className="card-title mb-0">
              {getPeriodTitle(period)}
            </h5>
            <small className="text-muted fw-normal">
              {provozovna === 'all' ? 'Celý CG · všechny provozovny' : PROVOZOVNY.find((p) => p.id === provozovna)?.name}
              {' · '}zdroj: automaticky (pokladna → závěrka)
            </small>
          </div>
          {/* Legenda zdroje */}
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-1">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f97316', display: 'inline-block' }} />
              <span className="text-muted fs-12">Pokladna</span>
            </div>
            <div className="d-flex align-items-center gap-1">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#1c84ee', display: 'inline-block' }} />
              <span className="text-muted fs-12">Závěrka</span>
            </div>
          </div>
        </div>

        {/* SOURCE: Larkon .nav.nav-tabs.card-header-tabs (jen pro Piazzu) */}
        {showStrediska && (
          <ul className="nav nav-tabs card-header-tabs mt-2">
            <li className="nav-item">
              <a className={`nav-link${tab === 'tyden' ? ' active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setTab('tyden')}>
                Kuchyň / Bar
              </a>
            </li>
            <li className="nav-item">
              <a className={`nav-link${tab === 'strediska' ? ' active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setTab('strediska')}>
                Střediska (Sál / Terasa / Bar)
              </a>
            </li>
          </ul>
        )}
      </div>

      {/* ── Hero blok – jen pro dnes/vcera ───────────────────────── */}
      {showHero && <div className="border-bottom px-4 py-3" style={{ background: 'var(--bs-light)' }}>
        <div className="row align-items-center g-3">
          {/* Dnešní tržba */}
          <div className="col-auto">
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-success-subtle text-success fs-11">
                <iconify-icon icon="solar:circle-bold" style={{ fontSize: 8 }} className="me-1" />
                Live · Pokladna
              </span>
              <span className="text-muted fs-12">{fDate(dnes.datum)}</span>
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <span className="fw-bold font-monospace" style={{ fontSize: 36, lineHeight: 1.1, color: '#313b5e' }}>
                {fCzk(dnes.celkem)}
              </span>
            </div>
            <div className="d-flex align-items-center gap-3 mt-1">
              <span className="text-muted fs-12">
                <span style={{ color: '#1c84ee', fontWeight: 600 }}>K {fCzk(dnes.kuchyn)}</span>
                {' · '}
                <span style={{ color: '#22c55e', fontWeight: 600 }}>B {fCzk(dnes.bar)}</span>
              </span>
            </div>
          </div>

          {/* D-7 srovnání */}
          <div className="col-auto ms-4">
            <div className="text-muted fs-12 mb-1">vs. stejný den minulý týden (D−7)</div>
            <div className="d-flex align-items-center gap-2">
              <span
                className={`fw-bold fs-4 ${d7Up ? 'text-success' : 'text-danger'}`}
              >
                <iconify-icon icon={d7Up ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} />
                {' '}{d7Up ? '+' : ''}{d7Chng.toFixed(1)} %
              </span>
              <span className="text-muted fs-12">
                (D−7: {fCzk(d7.celkem)})
              </span>
            </div>
            <div className="fs-12 mt-1" style={{ color: d7Up ? '#15803d' : '#b91c1c' }}>
              {d7Up ? 'Lepší než před týdnem' : 'Horší než před týdnem'}
            </div>
          </div>
        </div>
      </div>}

      {/* ── Summary strip ──────────────────────────────────────── */}
      <div className="border-bottom">
        <div className="row g-0">
          <div className="col-auto border-end py-3 px-3" style={{ minWidth: 120 }}>
            <div className="text-muted fs-12 mb-1">Celkem</div>
            <div className="fw-bold font-monospace fs-5">{fCzk(cur.celkem)}</div>
          </div>
          <div className="col-auto border-end py-3 px-3" style={{ minWidth: 110 }}>
            <div className="text-muted fs-12 mb-1">Kuchyň</div>
            <div className="fw-bold font-monospace fs-5" style={{ color: '#1c84ee' }}>{fCzk(cur.kuchyn)}</div>
          </div>
          <div className="col-auto border-end py-3 px-3" style={{ minWidth: 100 }}>
            <div className="text-muted fs-12 mb-1">Bar</div>
            <div className="fw-bold font-monospace fs-5" style={{ color: '#22c55e' }}>{fCzk(cur.bar)}</div>
          </div>
          {/* Srovnání s předchozím obdobím */}
          <div className="col py-3 px-3" style={{ background: isUp ? '#f0fdf4' : '#fef2f2' }}>
            <div className="text-muted fs-12 mb-1 text-nowrap">{getPeriodCompareLabel(period)}</div>
            <div className="d-flex align-items-center gap-1" style={{ color: isUp ? '#16a34a' : '#dc2626' }}>
              <iconify-icon icon={isUp ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} style={{ fontSize: 26 }} />
              <span className="fw-bold" style={{ fontSize: 22 }}>{isUp ? '+' : ''}{weekChng.toFixed(1)} %</span>
            </div>
            <div className="fs-12 mt-1 text-nowrap" style={{ color: isUp ? '#15803d' : '#b91c1c' }}>
              {isUp ? 'lepší než srovnávací období' : 'horší než srovnávací období'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart ── CUSTOM: SVG → v produkci ApexCharts grouped bar ── */}
      <div className="card-body pb-2">
        <div className="lk-custom">
          <div className="lk-custom-label">CUSTOM: ApexCharts grouped bar chart (kuchyň + bar, 7 dní)</div>
          <div style={{ position: 'relative', height: 220 }}>
            <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', height: '100%', display: 'block' }}>
              {/* Grid lines */}
              {gridVals.map((gv, gi) => (
                <g key={gi}>
                  <line x1={ML} y1={yPx(gv, yMax)} x2={CW - MR} y2={yPx(gv, yMax)} stroke="#eaedf1" strokeWidth="1" strokeDasharray="4 3" />
                  <text x={ML - 6} y={yPx(gv, yMax) + 4} textAnchor="end" fontSize="9" fill="#9097a7">{fmt(gv)}</text>
                </g>
              ))}
              <line x1={ML} y1={MT + IH} x2={CW - MR} y2={MT + IH} stroke="#eaedf1" strokeWidth="1" />

              {/* Bars per day – STACKED (kuchyň dole, bar nahoře) */}
              {dayData.map((d, i) => {
                // Centrovaná pozice jednoho sloupce
                const sx    = ML + i * groupW + (groupW - barW) / 2;
                const cx    = sx + barW / 2;
                const isHov = tooltip?.i === i;
                const isLast = i === dayData.length - 1; // dnešek – plná sytost

                // ── Střediska (Piazza) – stacked ────────────────────
                if (showStrediska && tab === 'strediska' && d.strediska) {
                  const streds = d.strediska;
                  const maxSt  = Math.max(...dayData.map((dd) =>
                    (dd.strediska ?? []).reduce((s, st) => s + st.trzba, 0)
                  ), 1);
                  let yBottom = MT + IH;
                  return (
                    <g key={d.datum} onMouseEnter={() => setTooltip({ i, x: ((cx - ML) / IW) * 100, row: d })} onMouseLeave={() => setTooltip(null)}>
                      {isHov && <rect x={ML + i * groupW + 2} y={MT} width={groupW - 4} height={IH} fill="#f0eeee" rx="3" />}
                      {streds.map((st, si) => {
                        const h = hPx(st.trzba, maxSt);
                        yBottom -= h;
                        const isTop = si === streds.length - 1;
                        return (
                          <rect key={st.id} x={sx} y={yBottom} width={barW} height={h}
                            fill={st.color} rx={isTop ? 3 : 0}
                            opacity={isHov ? 1 : isLast ? 0.95 : 0.65} />
                        );
                      })}
                      <text x={cx} y={MT + IH + 28} textAnchor="middle" fontSize="9" fill={isHov ? '#313b5e' : '#9097a7'} fontWeight={isHov ? '700' : '400'}>{periodBarLabel(d.datum, period)}</text>
                      <circle cx={cx} cy={MT + IH + 14} r="3" fill={d.zdroj === 'zavierka' ? '#1c84ee' : '#ff6c2f'} />
                    </g>
                  );
                }

                // ── Kuchyň + Bar stacked ─────────────────────────────
                const kH     = hPx(d.kuchyn, yMax);
                const bH     = hPx(d.bar, yMax);
                const totalH = kH + bH;
                const opacity = isLast ? 1 : 0.65; // starší dny ztlumené

                return (
                  <g key={d.datum} onMouseEnter={() => setTooltip({ i, x: ((cx - ML) / IW) * 100, row: d })} onMouseLeave={() => setTooltip(null)} style={{ cursor: 'pointer' }}>
                    {isHov && <rect x={ML + i * groupW + 2} y={MT} width={groupW - 4} height={IH} fill="#f0eeee" rx="3" />}
                    {/* Kuchyň – spodní část sloupce (bez zaoblení nahoře) */}
                    <rect x={sx} y={MT + IH - kH} width={barW} height={kH}
                      fill={isHov ? '#1167c4' : '#1c84ee'} opacity={opacity} />
                    {/* Bar – horní část sloupce (zaoblení nahoře) */}
                    <rect x={sx} y={MT + IH - totalH} width={barW} height={bH}
                      fill={isHov ? '#15803d' : '#22c55e'} rx="3" opacity={opacity} />
                    {/* Popisek dne */}
                    <text x={cx} y={MT + IH + 28} textAnchor="middle" fontSize="9"
                      fill={isHov ? '#313b5e' : isLast ? '#6c757d' : '#9097a7'}
                      fontWeight={isHov || isLast ? '700' : '400'}>
                      {periodBarLabel(d.datum, period)}
                    </text>
                    {/* Zdroj indikátor */}
                    <circle cx={cx} cy={MT + IH + 14} r="3" fill={d.zdroj === 'zavierka' ? '#1c84ee' : '#ff6c2f'} />
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            {tooltip && (
              <div style={{ position: 'absolute', left: `clamp(10px, ${tooltip.x}%, calc(100% - 170px))`, top: 0, background: '#313b5e', color: 'white', borderRadius: 8, padding: '8px 12px', fontSize: 11, pointerEvents: 'none', zIndex: 10, minWidth: 160, boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
                <div style={{ fontWeight: 700, marginBottom: 5, fontSize: 12 }}>
                  {fDayLabel(tooltip.row.datum)}
                  <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 4, background: tooltip.row.zdroj === 'zavierka' ? '#1c84ee' : '#ff6c2f' }}>
                    {tooltip.row.zdroj === 'zavierka' ? 'Závěrka' : 'Pokladna'}
                  </span>
                </div>
                {showStrediska && tab === 'strediska' && tooltip.row.strediska
                  ? tooltip.row.strediska.map((st) => (
                      <div key={st.id} className="d-flex justify-content-between gap-3">
                        <span style={{ color: st.color }}>{st.nazev}</span>
                        <span style={{ fontWeight: 600 }}>{fCzk(st.trzba)}</span>
                      </div>
                    ))
                  : (
                    <>
                      <div className="d-flex justify-content-between gap-3">
                        <span style={{ color: '#93c5fd' }}>Kuchyň</span>
                        <span style={{ fontWeight: 600 }}>{fCzk(tooltip.row.kuchyn)}</span>
                      </div>
                      <div className="d-flex justify-content-between gap-3">
                        <span style={{ color: '#86efac' }}>Bar</span>
                        <span style={{ fontWeight: 600 }}>{fCzk(tooltip.row.bar)}</span>
                      </div>
                    </>
                  )}
                <div className="d-flex justify-content-between gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 4, paddingTop: 4 }}>
                  <span>Celkem</span>
                  <span style={{ fontWeight: 700 }}>{fCzk(tooltip.row.celkem)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          {(!showStrediska || tab === 'tyden') && (
            <div className="d-flex align-items-center gap-4 mt-2 px-1 pb-1">
              <div className="d-flex align-items-center gap-1">
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1c84ee', display: 'inline-block' }} />
                <span className="text-muted fs-12">Kuchyň</span>
              </div>
              <div className="d-flex align-items-center gap-1">
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} />
                <span className="text-muted fs-12">Bar</span>
              </div>
              <div className="d-flex align-items-center gap-3 ms-auto">
                <span className="text-muted fs-12">Zdroj dat:</span>
                <div className="d-flex align-items-center gap-1">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1c84ee', display: 'inline-block' }} />
                  <span className="text-muted fs-12">závěrka</span>
                </div>
                <div className="d-flex align-items-center gap-1">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />
                  <span className="text-muted fs-12">pokladna</span>
                </div>
              </div>
            </div>
          )}
          {showStrediska && tab === 'strediska' && (
            <div className="d-flex align-items-center gap-4 mt-2 px-1 pb-1">
              {[{ label: 'Sál', color: '#1c84ee' }, { label: 'Terasa', color: '#ff6c2f' }, { label: 'Bar', color: '#22c55e' }].map((s) => (
                <div key={s.label} className="d-flex align-items-center gap-1">
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                  <span className="text-muted fs-12">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Měsíc vs. LY ─────────────────────────────────── */}
      <MesicVsLY provozovna={provozovna} mesic={mesic} />

      {/* ── Drill-down: provozovny breakdown (jen pro CG all) ── */}
      {showDrillDown && (
        <ProvozovnyBreakdown data={provozovnyData} onSelect={onDrillDown} />
      )}

      {/* ── Střediska summary (jen pro Piazzu) ──────────────── */}
      {showStrediska && <StrediskaBreakdown days={DAYS_7} />}
    </div>
  );
}

// ─── Sub-komponenty ───────────────────────────────────────────

// COMPONENT: Month vs LY comparison row
// SOURCE: Larkon card section + Bootstrap .border-top
// CUSTOM: NO

function MesicVsLY({ mesic }: { provozovna: string; mesic: ReturnType<typeof getMesicVsLY> }) {
  const { cur2026, ly2025, chng } = mesic;
  const isUp = chng >= 0;

  if (!cur2026 || !ly2025) return null;

  return (
    <div className="border-top">
      <div className="row g-0">
        <div className="col border-end py-3 px-4">
          <div className="text-muted fs-12 mb-1">Duben 2026 (do dnes)</div>
          <div className="fw-bold font-monospace fs-5">{fCzk(cur2026.sumaDoDnes)}</div>
          <div className="text-muted fs-12">Ø/den: {fCzk(cur2026.prumerDen)}</div>
        </div>
        <div className="col border-end py-3 px-4">
          <div className="text-muted fs-12 mb-1">Duben 2025 (celý měsíc)</div>
          <div className="fw-semibold font-monospace text-muted fs-5">{fCzk(ly2025.sumaCelyMesic ?? 0)}</div>
          <div className="text-muted fs-12">Ø/den: {fCzk(ly2025.prumerDen)}</div>
        </div>
        <div className="col border-end py-3 px-4">
          <div className="text-muted fs-12 mb-1">Průměr/den – srovnání</div>
          <div className="d-flex align-items-center gap-1" style={{ color: isUp ? '#16a34a' : '#dc2626', fontSize: 20, fontWeight: 800 }}>
            <iconify-icon icon={isUp ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} />
            <span>{isUp ? '+' : ''}{chng.toFixed(1)} %</span>
          </div>
          <div className="fs-12 mt-1" style={{ color: isUp ? '#15803d' : '#b91c1c' }}>
            vs. stejný měsíc {ly2025.rok}
          </div>
        </div>
        <div className="col py-3 px-4">
          <div className="text-muted fs-12 mb-1">Projekce (30 dní)</div>
          <div className="fw-bold font-monospace fs-5" style={{ color: '#7c3aed' }}>
            {fCzk(cur2026.prumerDen * 30)}
          </div>
          <div className="text-muted fs-12">na základě Ø/den {cur2026.pocetDni} dní</div>
        </div>
      </div>
    </div>
  );
}

// COMPONENT: Venue Breakdown – progress bars + drill-down
// SOURCE: Larkon _card.scss + Bootstrap .progress
// CUSTOM: NO

function ProvozovnyBreakdown({
  data,
  onSelect,
}: {
  data: { provozovna: typeof PROVOZOVNY[0]; cur: number; prev: number; chng: number }[];
  onSelect?: (id: ProvozovnaId) => void;
}) {
  const total = data.reduce((s, d) => s + d.cur, 0) || 1;

  return (
    <div className="border-top px-4 py-3">
      <div className="text-uppercase fw-semibold text-muted fs-11 mb-3">
        Rozpad provozoven (7D) · klik = detail
      </div>
      <div className="row g-3">
        {data.map(({ provozovna: p, cur, chng }) => {
          const isUp  = chng >= 0;
          const share = Math.round((cur / total) * 100);
          return (
            <div key={p.id} className="col-12 col-sm-6">
              <div
                className="d-flex flex-column gap-2 px-3 py-2 rounded"
                style={{ cursor: onSelect ? 'pointer' : 'default', background: 'var(--bs-light)' }}
                onClick={() => onSelect?.(p.id as ProvozovnaId)}
              >
                {/* Řádek 1: název + částka + trend */}
                <div className="d-flex align-items-center gap-2">
                  <span className="rounded-circle flex-shrink-0" style={{ width: 8, height: 8, background: p.color, display: 'inline-block' }} />
                  <span className="fw-semibold fs-13 flex-grow-1 text-nowrap overflow-hidden" style={{ textOverflow: 'ellipsis' }}>{p.name}</span>
                  <span className="font-monospace fw-bold fs-13 text-nowrap flex-shrink-0">{fCzk(cur)}</span>
                  <span className={`badge flex-shrink-0 ${isUp ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                    <iconify-icon icon={isUp ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} />
                    {' '}{Math.abs(chng).toFixed(1)} %
                  </span>
                </div>
                {/* Řádek 2: progress bar = podíl na celku CG */}
                <div className="d-flex align-items-center gap-2">
                  <div className="progress flex-grow-1" style={{ height: 5 }}>
                    <div className="progress-bar" style={{ width: `${share}%`, background: p.color }} />
                  </div>
                  <span className="text-muted fs-11 flex-shrink-0" style={{ minWidth: 32, textAlign: 'right' }}>{share} %</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// COMPONENT: Střediska breakdown (Piazza)
// SOURCE: Larkon _card.scss + Bootstrap .progress
// CUSTOM: NO

function StrediskaBreakdown({ days }: { days: string[] }) {
  const piazzaDays = getTrzbyByDayV2('piazza', days) as DayRow[];

  const totals: Record<string, { nazev: string; trzba: number; color: string }> = {};
  piazzaDays.forEach((d) => {
    d.strediska?.forEach((s) => {
      if (!totals[s.id]) totals[s.id] = { nazev: s.nazev, trzba: 0, color: s.color };
      totals[s.id].trzba += s.trzba;
    });
  });

  const items = Object.values(totals);
  const total = items.reduce((s, st) => s + st.trzba, 0);

  return (
    <div className="border-top px-4 py-3">
      <div className="text-uppercase fw-semibold text-muted fs-11 mb-3">Střediska Piazza (7D)</div>
      {items.map((st) => {
        const pct = Math.round((st.trzba / total) * 100);
        return (
          <div key={st.nazev} className="d-flex align-items-center gap-3 border-bottom py-2">
            <div className="d-flex align-items-center gap-2" style={{ width: 80, flexShrink: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: st.color, display: 'inline-block', flexShrink: 0 }} />
              <span className="fw-semibold fs-13">{st.nazev}</span>
            </div>
            <div className="flex-grow-1">
              <div className="progress" style={{ height: 6 }}>
                <div className="progress-bar" style={{ width: `${pct}%`, background: st.color }} />
              </div>
            </div>
            <span className="font-monospace fw-bold fs-13 text-end" style={{ width: 90, flexShrink: 0 }}>
              {fCzk(st.trzba)}
            </span>
            <span className="text-muted fs-12" style={{ width: 36, textAlign: 'right', flexShrink: 0 }}>
              {pct} %
            </span>
          </div>
        );
      })}
    </div>
  );
}
