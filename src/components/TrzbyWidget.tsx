// COMPONENT: Tržby Widget v3 – graf tržeb (chart only)
// SOURCE: Larkon _card.scss + _nav.scss + Bootstrap utilities
// CUSTOM: YES (SVG stacked bar + trend line → v produkci ApexCharts)
//
// Larkon class mapping:
//   .card                              → karta
//   .card-header                       → hlavička + tabs
//   .nav.nav-tabs.card-header-tabs     → tab navigace (Piazza střediska)
//   .progress (height:4px)             → progress bar ve StrediskaBreakdown
//   .badge.bg-*-subtle                 → zdroj badge
//   .lk-custom                         → CUSTOM obal pro SVG chart

import { useState } from 'react';
import type { ProvozovnaId, Period } from '../types';
import {
  DAYS_7,
  PROVOZOVNY,
  getTrzbyByDayV2,
  getTrzbyForPeriod,
  getPeriodTitle,
  periodBarLabel,
  fCzk,
  fDayLabel,
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

export default function TrzbyWidget({ provozovna, period = 'tyden', onDrillDown: _onDrillDown }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [tab, setTab]         = useState<'tyden' | 'strediska'>('tyden');

  const dayData  = getTrzbyForPeriod(provozovna, period) as DayRow[];
  const maxVal   = Math.max(...dayData.map((d) => d.celkem), 1);
  const yMax     = Math.ceil(maxVal / 50000) * 50000;
  const gridVals = [yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  const n      = dayData.length;
  const groupW = IW / n;
  const barW   = Math.max(Math.floor(groupW * 0.60), 16);

  const showStrediska = provozovna === 'piazza';

  // Trend line: body (midpoints top of each bar)
  const trendPoints = dayData.map((d, i) => {
    const sx = ML + i * groupW + (groupW - barW) / 2;
    const cx = sx + barW / 2;
    const y  = yPx(d.celkem, yMax);
    return { cx, y };
  });

  return (
    <div className="card mb-0" style={{ borderTop: '3px solid #c9911a' }}>

      {/* ── Header ── SOURCE: Larkon .card-header ──────────────── */}
      <div className="card-header">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h5 className="card-title mb-0">{getPeriodTitle(period)}</h5>
            <small className="text-muted fw-normal">
              {provozovna === 'all'
                ? 'Celý CG · všechny provozovny'
                : PROVOZOVNY.find((p) => p.id === provozovna)?.name}
              {' · '}zdroj: automaticky (pokladna → závěrka)
            </small>
          </div>
          {/* Legenda zdrojů */}
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

        {/* Tabs – jen pro Piazzu */}
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

      {/* ── Chart ── CUSTOM: SVG → v produkci ApexCharts ──────── */}
      <div className="card-body pb-2">
        <div className="lk-custom">
          <div className="lk-custom-label">CUSTOM: SVG stacked bar + trend line (→ ApexCharts v produkci)</div>
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

              {/* Bars per day */}
              {dayData.map((d, i) => {
                const sx    = ML + i * groupW + (groupW - barW) / 2;
                const cx    = sx + barW / 2;
                const isHov = tooltip?.i === i;
                const isLast = i === dayData.length - 1;

                // ── Střediska (Piazza) ──────────────────────────
                if (showStrediska && tab === 'strediska' && d.strediska) {
                  const streds = d.strediska;
                  const maxSt  = Math.max(...dayData.map((dd) =>
                    (dd.strediska ?? []).reduce((s, st) => s + st.trzba, 0)
                  ), 1);
                  let yBottom = MT + IH;
                  return (
                    <g key={d.datum} onMouseEnter={() => setTooltip({ i, x: ((cx - ML) / IW) * 100, row: d })} onMouseLeave={() => setTooltip(null)}>
                      {isHov && <rect x={ML + i * groupW + 2} y={MT} width={groupW - 4} height={IH} fill="#f5f3ff" rx="3" />}
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
                      <circle cx={cx} cy={MT + IH + 14} r="3" fill={d.zdroj === 'zavierka' ? '#1c84ee' : '#f97316'} />
                    </g>
                  );
                }

                // ── Kuchyň + Bar stacked ────────────────────────
                const kH     = hPx(d.kuchyn, yMax);
                const bH     = hPx(d.bar, yMax);
                const totalH = kH + bH;
                const opacity = isLast ? 1 : 0.65;

                return (
                  <g key={d.datum} onMouseEnter={() => setTooltip({ i, x: ((cx - ML) / IW) * 100, row: d })} onMouseLeave={() => setTooltip(null)} style={{ cursor: 'pointer' }}>
                    {isHov && <rect x={ML + i * groupW + 2} y={MT} width={groupW - 4} height={IH} fill="#f5f3ff" rx="3" />}
                    {/* Kuchyň – spodní část */}
                    <rect x={sx} y={MT + IH - kH} width={barW} height={kH}
                      fill={isHov ? '#1167c4' : '#1c84ee'} opacity={opacity} />
                    {/* Bar – horní část */}
                    <rect x={sx} y={MT + IH - totalH} width={barW} height={bH}
                      fill={isHov ? '#15803d' : '#22c55e'} rx="3" opacity={opacity} />
                    {/* Popisek */}
                    <text x={cx} y={MT + IH + 28} textAnchor="middle" fontSize="9"
                      fill={isHov ? '#313b5e' : isLast ? '#6c757d' : '#9097a7'}
                      fontWeight={isHov || isLast ? '700' : '400'}>
                      {periodBarLabel(d.datum, period)}
                    </text>
                    {/* Zdroj indikátor */}
                    <circle cx={cx} cy={MT + IH + 14} r="3" fill={d.zdroj === 'zavierka' ? '#1c84ee' : '#f97316'} />
                  </g>
                );
              })}

              {/* Trend line – spojuje vrcholy sloupců */}
              {(!showStrediska || tab === 'tyden') && dayData.length > 1 && (
                <>
                  <polyline
                    points={trendPoints.map((p) => `${p.cx},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#c9911a"
                    strokeWidth="1.8"
                    strokeDasharray="5 3"
                    opacity="0.65"
                  />
                  {trendPoints.map((p, i) => (
                    <circle key={i} cx={p.cx} cy={p.y} r={tooltip?.i === i ? 4.5 : 3}
                      fill="#c9911a" opacity={tooltip?.i === i ? 1 : 0.55}
                      style={{ transition: 'r 0.1s' }}
                    />
                  ))}
                </>
              )}

            </svg>

            {/* Tooltip */}
            {tooltip && (
              <div style={{ position: 'absolute', left: `clamp(10px, ${tooltip.x}%, calc(100% - 170px))`, top: 0, background: '#313b5e', color: 'white', borderRadius: 8, padding: '8px 12px', fontSize: 11, pointerEvents: 'none', zIndex: 10, minWidth: 160, boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
                <div style={{ fontWeight: 700, marginBottom: 5, fontSize: 12 }}>
                  {fDayLabel(tooltip.row.datum)}
                  <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 4, background: tooltip.row.zdroj === 'zavierka' ? '#1c84ee' : '#f97316' }}>
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
            <div className="d-flex align-items-center gap-4 mt-2 px-1 pb-1 flex-wrap">
              <div className="d-flex align-items-center gap-1">
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1c84ee', display: 'inline-block' }} />
                <span className="text-muted fs-12">Kuchyň</span>
              </div>
              <div className="d-flex align-items-center gap-1">
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} />
                <span className="text-muted fs-12">Bar</span>
              </div>
              <div className="d-flex align-items-center gap-1">
                <span style={{ width: 10, height: 2, background: '#c9911a', display: 'inline-block', marginBottom: 1 }} />
                <span className="text-muted fs-12">Trend celkem</span>
              </div>
              <div className="d-flex align-items-center gap-3 ms-auto">
                <span className="text-muted fs-12">Zdroj:</span>
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
              {[{ label: 'Sál', color: '#1c84ee' }, { label: 'Terasa', color: '#f97316' }, { label: 'Bar', color: '#22c55e' }].map((s) => (
                <div key={s.label} className="d-flex align-items-center gap-1">
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block' }} />
                  <span className="text-muted fs-12">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Střediska summary (jen Piazza) ────────────────────── */}
      {showStrediska && <StrediskaBreakdown days={DAYS_7} />}
    </div>
  );
}

// ─── Sub-komponenta: Střediska breakdown ─────────────────────

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
      <div className="text-uppercase fw-semibold text-muted fs-11 mb-3">Střediska Piazza – 7D souhrn</div>
      {items.map((st) => {
        const pct = Math.round((st.trzba / total) * 100);
        return (
          <div key={st.nazev} className="d-flex align-items-center gap-3 border-bottom py-2">
            <div className="d-flex align-items-center gap-2" style={{ width: 80, flexShrink: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: st.color, display: 'inline-block', flexShrink: 0 }} />
              <span className="fw-semibold fs-13">{st.nazev}</span>
            </div>
            <div className="flex-grow-1">
              <div className="progress" style={{ height: 4 }}>
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
