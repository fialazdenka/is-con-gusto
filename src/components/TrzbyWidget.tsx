// ─────────────────────────────────────────────────────────────
// COMPONENT: Tržby Widget v2 – hlavní modul tržeb
// SOURCE:    Larkon-like → Card + ApexCharts
// CUSTOM:    YES (SVG chart – zadáním povoleno; v prod. ApexCharts grouped bar)
//
// Zadání Petr Dohnal 13.4.2026:
//  - Zdroj AUTO: pokladna (víkend, live den) nebo závěrka (pokud existuje)
//  - Celkem + Kuchyň + Bar + střediska (Piazza)
//  - 7 dní, porovnání min. týden (↑/↓), měsíc vs. LY
//  - CG: drill-down na provozovny; provozovna: detail středisek
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { ProvozovnaId } from '../types';
import {
  DAYS_7,
  PROVOZOVNY,
  getTrzbyByDayV2,
  getTotalTrzbyV2,
  getPrevTotalTrzby,
  getTrzbyPerProvozovna,
  getMesicVsLY,
  fCzk,
  fDayLabel,
  pctChange,
  type TrzbyZdroj,
  type Stredisko,
} from '../data';

// ─── Chart constants ──────────────────────────────────────────

const CW = 580, CH = 200;
const ML = 54, MT = 12, MR = 12, MB = 32;
const IW = CW - ML - MR;
const IH = CH - MT - MB;

function yPx(val: number, yMax: number)   { return MT + IH - (val / yMax) * IH; }
function hPx(val: number, yMax: number)   { return (val / yMax) * IH; }
function fmt(n: number)                    { return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n); }

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
  x: number; // % of chart width
  row: DayRow;
}

// ─── Props ────────────────────────────────────────────────────

interface Props {
  provozovna: ProvozovnaId;
  onDrillDown?: (id: ProvozovnaId) => void; // callback pro drill-down na provozovnu
}

// ─────────────────────────────────────────────────────────────

export default function TrzbyWidget({ provozovna, onDrillDown }: Props) {
  const [tooltip, setTooltip]   = useState<TooltipState | null>(null);
  const [tab, setTab]           = useState<'tyden' | 'strediska'>('tyden');

  const dayData  = getTrzbyByDayV2(provozovna, DAYS_7) as DayRow[];
  const cur      = getTotalTrzbyV2(provozovna, DAYS_7);
  const prev     = getPrevTotalTrzby(provozovna);
  const weekChng = pctChange(cur.celkem, prev.celkem);
  const isUp     = weekChng >= 0;

  const mesic    = getMesicVsLY(provozovna);
  const mesicUp  = mesic.chng >= 0;

  const provozovnyData = getTrzbyPerProvozovna(DAYS_7);

  // Chart scales
  const maxVal = Math.max(...dayData.map((d) => d.celkem), 1);
  const yMax   = Math.ceil(maxVal / 50000) * 50000;
  const gridVals = [yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  const n      = dayData.length;
  const groupW = IW / n;
  const barW   = Math.max(Math.floor((groupW - 10) / 2), 8);

  const showStrediska = provozovna === 'piazza';
  const showDrillDown = provozovna === 'all';

  return (
    <div className="card section-gap" style={{ borderTop: '4px solid #3b82f6' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="card-header">
        <div className="card-title-wrap">
          <div className="card-title">Tržby – posledních 7 dní</div>
          <div className="card-sub">
            {provozovna === 'all' ? 'Celý CG · všechny provozovny' : PROVOZOVNY.find((p) => p.id === provozovna)?.name}
            {' · '}zdroj: automaticky (pokladna → závěrka)
          </div>
        </div>
        <div className="card-actions">
          {/* Legenda zdroje */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f97316', display: 'inline-block' }} />
              <span className="fs-xs c-2">Pokladna</span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#2563eb', display: 'inline-block' }} />
              <span className="fs-xs c-2">Závěrka</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary strip ──────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showDrillDown ? '1fr 1fr 1fr 1.4fr' : '1fr 1fr 1fr 1.4fr',
          gap: 0,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <SumItem label="Celkem 7D" value={fCzk(cur.celkem)} />
        <SumItem label="Kuchyň" value={fCzk(cur.kuchyn)} accent="#3b82f6" />
        <SumItem label="Bar" value={fCzk(cur.bar)} accent="#22c55e" />
        {/* Týdenní srovnání – prominentní */}
        <div
          style={{
            padding: '12px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderLeft: '1px solid var(--border)',
            background: isUp ? '#f0fdf4' : '#fef2f2',
          }}
        >
          <div className="fs-xs c-2 mb-1">vs. minulý týden</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 22,
              fontWeight: 800,
              color: isUp ? 'var(--c-ok)' : 'var(--c-err)',
              lineHeight: 1,
            }}
          >
            <span>{isUp ? '↑' : '↓'}</span>
            <span>{isUp ? '+' : ''}{weekChng.toFixed(1)} %</span>
          </div>
          <div className="fs-xs mt-1" style={{ color: isUp ? 'var(--c-ok-text)' : 'var(--c-err-text)' }}>
            {isUp ? 'lepší než minulý týden' : 'horší než minulý týden'}
          </div>
        </div>
      </div>

      {/* ── Tabs (pouze pro Piazzu se středisky) ───────────── */}
      {showStrediska && (
        <div style={{ padding: '0 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button
              className={`tab-btn${tab === 'tyden' ? ' active' : ''}`}
              onClick={() => setTab('tyden')}
            >
              Kuchyň / Bar
            </button>
            <button
              className={`tab-btn${tab === 'strediska' ? ' active' : ''}`}
              onClick={() => setTab('strediska')}
            >
              Střediska (Sál / Terasa / Bar)
            </button>
          </div>
        </div>
      )}

      {/* ── Chart ──────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px 8px' }}>
        <div style={{ position: 'relative', height: 220 }}>
          <svg
            viewBox={`0 0 ${CW} ${CH}`}
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            {/* Grid lines */}
            {gridVals.map((gv, gi) => (
              <g key={gi}>
                <line
                  x1={ML} y1={yPx(gv, yMax)} x2={CW - MR} y2={yPx(gv, yMax)}
                  stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3"
                />
                <text x={ML - 6} y={yPx(gv, yMax) + 4} textAnchor="end" fontSize="9" fill="#94a3b8">
                  {fmt(gv)}
                </text>
              </g>
            ))}
            <line x1={ML} y1={MT + IH} x2={CW - MR} y2={MT + IH} stroke="#e2e8f0" strokeWidth="1" />

            {/* Bars per day */}
            {dayData.map((d, i) => {
              const gx    = ML + i * groupW + (groupW - barW * 2 - 3) / 2;
              const kx    = gx;
              const bx    = gx + barW + 3;
              const isHov = tooltip?.i === i;

              // Strediska tab for Piazza
              if (showStrediska && tab === 'strediska' && d.strediska) {
                const streds = d.strediska;
                const total  = streds.reduce((s, st) => s + st.trzba, 0);
                const maxSt  = Math.max(...dayData.map((dd) =>
                  (dd.strediska ?? []).reduce((s, st) => s + st.trzba, 0)
                ), 1);
                const stackW = barW * 2 + 3;
                let yBottom = MT + IH;

                return (
                  <g key={d.datum} onMouseEnter={() => setTooltip({ i, x: ((gx + stackW / 2 - ML) / IW) * 100, row: d })} onMouseLeave={() => setTooltip(null)}>
                    {isHov && <rect x={ML + i * groupW + 2} y={MT} width={groupW - 4} height={IH} fill="#f1f5f9" rx="3" />}
                    {streds.map((st) => {
                      const h = hPx(st.trzba, maxSt);
                      yBottom -= h;
                      return (
                        <rect key={st.id} x={gx} y={yBottom} width={stackW} height={h}
                          fill={st.color} rx="2" style={{ transition: 'opacity 0.14s' }}
                          opacity={isHov ? 1 : 0.85} />
                      );
                    })}
                    <text x={gx + stackW / 2} y={MT + IH + 20} textAnchor="middle" fontSize="9"
                      fill={isHov ? '#0f172a' : '#94a3b8'} fontWeight={isHov ? '700' : '400'}>
                      {fDayLabel(d.datum)}
                    </text>
                    {/* Zdroj indikátor */}
                    <circle cx={gx + stackW / 2} cy={MT + IH + 10} r="3"
                      fill={d.zdroj === 'zavierka' ? '#2563eb' : '#f97316'} />
                    <text x={gx + stackW / 2 + 6} y={MT + IH + 14} fontSize="7"
                      fill={d.zdroj === 'zavierka' ? '#2563eb' : '#f97316'}>
                      {d.zdroj === 'zavierka' ? 'Z' : 'P'}
                    </text>
                    void(total);
                  </g>
                );
              }

              // Standard K+B grouped bars
              const kH = hPx(d.kuchyn, yMax);
              const bH = hPx(d.bar, yMax);

              return (
                <g
                  key={d.datum}
                  onMouseEnter={() => setTooltip({ i, x: ((gx + barW - ML) / IW) * 100, row: d })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {isHov && <rect x={ML + i * groupW + 2} y={MT} width={groupW - 4} height={IH} fill="#f1f5f9" rx="3" />}
                  {/* Kuchyň */}
                  <rect x={kx} y={yPx(d.kuchyn, yMax)} width={barW} height={kH}
                    fill={isHov ? '#1d4ed8' : '#3b82f6'} rx="3" style={{ transition: 'fill 0.14s' }} />
                  {/* Bar */}
                  <rect x={bx} y={yPx(d.bar, yMax)} width={barW} height={bH}
                    fill={isHov ? '#15803d' : '#22c55e'} rx="3" style={{ transition: 'fill 0.14s' }} />
                  {/* X label */}
                  <text x={kx + barW + 1.5} y={MT + IH + 20} textAnchor="middle" fontSize="9"
                    fill={isHov ? '#0f172a' : '#94a3b8'} fontWeight={isHov ? '700' : '400'}>
                    {fDayLabel(d.datum)}
                  </text>
                  {/* Zdroj dot + label */}
                  <circle cx={kx + barW + 1.5} cy={MT + IH + 10} r="3"
                    fill={d.zdroj === 'zavierka' ? '#2563eb' : '#f97316'} />
                  <text x={kx + barW + 8} y={MT + IH + 13} fontSize="7"
                    fill={d.zdroj === 'zavierka' ? '#2563eb' : '#f97316'}>
                    {d.zdroj === 'zavierka' ? 'Z' : 'P'}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              style={{
                position: 'absolute',
                left: `clamp(10px, ${tooltip.x}%, calc(100% - 170px))`,
                top: 0,
                background: '#0f172a',
                color: 'white',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 11,
                pointerEvents: 'none',
                zIndex: 10,
                minWidth: 160,
                boxShadow: 'var(--sh-lg)',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 5, fontSize: 12 }}>
                {fDayLabel(tooltip.row.datum)}
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: tooltip.row.zdroj === 'zavierka' ? '#1d4ed8' : '#c2410c',
                  }}
                >
                  {tooltip.row.zdroj === 'zavierka' ? 'Závěrka' : 'Pokladna'}
                </span>
              </div>
              {showStrediska && tab === 'strediska' && tooltip.row.strediska
                ? tooltip.row.strediska.map((st) => (
                    <div key={st.id} className="flex justify-between gap-3">
                      <span style={{ color: st.color }}>{st.nazev}</span>
                      <span style={{ fontWeight: 600 }}>{fCzk(st.trzba)}</span>
                    </div>
                  ))
                : (
                  <>
                    <div className="flex justify-between gap-3">
                      <span style={{ color: '#93c5fd' }}>Kuchyň</span>
                      <span style={{ fontWeight: 600 }}>{fCzk(tooltip.row.kuchyn)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span style={{ color: '#86efac' }}>Bar</span>
                      <span style={{ fontWeight: 600 }}>{fCzk(tooltip.row.bar)}</span>
                    </div>
                  </>
                )}
              <div className="flex justify-between gap-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 4, paddingTop: 4 }}>
                <span>Celkem</span>
                <span style={{ fontWeight: 700 }}>{fCzk(tooltip.row.celkem)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        {(!showStrediska || tab === 'tyden') && (
          <div className="flex items-center gap-4 mt-2">
            <div className="legend-item"><div className="legend-dot" style={{ background: '#3b82f6' }} />Kuchyň</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#22c55e' }} />Bar</div>
            <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
              <span className="fs-xs c-2">Zdroj dat:</span>
              <span className="flex items-center gap-1 fs-xs">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />závěrka
              </span>
              <span className="flex items-center gap-1 fs-xs">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', display: 'inline-block' }} />pokladna
              </span>
            </div>
          </div>
        )}
        {showStrediska && tab === 'strediska' && (
          <div className="flex items-center gap-4 mt-2">
            {[{ label: 'Sál', color: '#3b82f6' }, { label: 'Terasa', color: '#f97316' }, { label: 'Bar', color: '#22c55e' }].map((s) => (
              <div key={s.label} className="legend-item">
                <div className="legend-dot" style={{ background: s.color }} />{s.label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Měsíc vs. LY ────────────────────────────────────── */}
      <MesicVsLY provozovna={provozovna} />

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

function SumItem({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ padding: '12px 20px', borderLeft: accent ? '1px solid var(--border)' : undefined }}>
      <div className="fs-xs c-2 mb-1">{label}</div>
      <div className="fs-lg fw-700 fv-mono" style={accent ? { color: accent } : {}}>
        {value}
      </div>
    </div>
  );
}

// COMPONENT: Month vs LY comparison row
// SOURCE: standard admin pattern → Card section
// CUSTOM: NO

function MesicVsLY({ provozovna }: { provozovna: string }) {
  const { cur2026, ly2025, chng } = getMesicVsLY(provozovna);
  const isUp = chng >= 0;

  if (!cur2026 || !ly2025) return null;

  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        padding: '14px 20px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: 0,
      }}
    >
      <div>
        <div className="fs-xs c-2 mb-1">Duben 2026 (do dnes)</div>
        <div className="fs-lg fw-700 fv-mono">{fCzk(cur2026.sumaDoDnes)}</div>
        <div className="fs-xs c-2">Ø/den: {fCzk(cur2026.prumerDen)}</div>
      </div>
      <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
        <div className="fs-xs c-2 mb-1">Duben 2025 (celý měsíc)</div>
        <div className="fs-md fw-700 fv-mono c-2">{fCzk(ly2025.sumaCelyMesic ?? 0)}</div>
        <div className="fs-xs c-2">Ø/den: {fCzk(ly2025.prumerDen)}</div>
      </div>
      <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
        <div className="fs-xs c-2 mb-1">Průměr/den – srovnání</div>
        <div
          className="flex items-center gap-1"
          style={{ fontSize: 20, fontWeight: 800, color: isUp ? 'var(--c-ok)' : 'var(--c-err)' }}
        >
          <span>{isUp ? '↑' : '↓'}</span>
          <span>{isUp ? '+' : ''}{chng.toFixed(1)} %</span>
        </div>
        <div className="fs-xs" style={{ color: isUp ? 'var(--c-ok-text)' : 'var(--c-err-text)', marginTop: 2 }}>
          vs. stejný měsíc {ly2025.rok}
        </div>
      </div>
      <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
        <div className="fs-xs c-2 mb-1">Projekce (30 dní)</div>
        <div className="fs-md fw-700 fv-mono" style={{ color: '#7c3aed' }}>
          {fCzk(cur2026.prumerDen * 30)}
        </div>
        <div className="fs-xs c-2">
          na základě Ø/den {cur2026.pocetDni} dní
        </div>
      </div>
    </div>
  );
}

// COMPONENT: Venue Breakdown (drill-down z CG → provozovna)
// SOURCE: Larkon-like → ListGroup + ProgressBar
// CUSTOM: NO

function ProvozovnyBreakdown({
  data,
  onSelect,
}: {
  data: { provozovna: typeof PROVOZOVNY[0]; cur: number; prev: number; chng: number }[];
  onSelect?: (id: ProvozovnaId) => void;
}) {
  const maxCur = Math.max(...data.map((d) => d.cur), 1);

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px 16px' }}>
      <div className="fs-xs fw-700 c-2 mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Rozpad provozoven (7D) · klik = detail
      </div>
      {data.map(({ provozovna: p, cur, chng }) => {
        const isUp = chng >= 0;
        const pct  = Math.round((cur / maxCur) * 100);
        return (
          <div
            key={p.id}
            className="flex items-center gap-3"
            style={{
              padding: '8px 0',
              borderBottom: '1px solid var(--border-light)',
              cursor: onSelect ? 'pointer' : 'default',
            }}
            onClick={() => onSelect?.(p.id as ProvozovnaId)}
          >
            <div className="flex items-center gap-2" style={{ width: 90, flexShrink: 0 }}>
              <div className="prov-dot" style={{ background: p.color }} />
              <span className="fs-sm fw-600">{p.shortName}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div className="prog">
                <div className="prog-fill" style={{ width: `${pct}%`, background: p.color }} />
              </div>
            </div>
            <div className="fv-mono fs-sm fw-700" style={{ width: 100, textAlign: 'right', flexShrink: 0 }}>
              {fCzk(cur)}
            </div>
            <div
              className="flex items-center gap-1 fw-700 fs-sm"
              style={{ width: 64, justifyContent: 'flex-end', color: isUp ? 'var(--c-ok)' : 'var(--c-err)', flexShrink: 0 }}
            >
              {isUp ? '↑' : '↓'} {Math.abs(chng).toFixed(1)} %
            </div>
            {onSelect && (
              <span className="fs-xs c-3" style={{ flexShrink: 0 }}>→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// COMPONENT: Střediska breakdown (Piazza)
// SOURCE: Larkon-like → ListGroup
// CUSTOM: NO

function StrediskaBreakdown({ days }: { days: string[] }) {
  // Agreguj strediska přes všechny dny
  const { getTrzbyByDayV2: fn } = { getTrzbyByDayV2 };
  const piazzaDays = fn('piazza', days) as DayRow[];

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
    <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px 16px' }}>
      <div className="fs-xs fw-700 c-2 mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Střediska Piazza (7D)
      </div>
      {items.map((st) => {
        const pct = Math.round((st.trzba / total) * 100);
        return (
          <div key={st.nazev} className="flex items-center gap-3" style={{ padding: '7px 0', borderBottom: '1px solid var(--border-light)' }}>
            <div className="flex items-center gap-2" style={{ width: 80, flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: st.color, flexShrink: 0 }} />
              <span className="fs-sm fw-600">{st.nazev}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div className="prog">
                <div className="prog-fill" style={{ width: `${pct}%`, background: st.color }} />
              </div>
            </div>
            <span className="fv-mono fs-sm fw-700" style={{ width: 90, textAlign: 'right', flexShrink: 0 }}>
              {fCzk(st.trzba)}
            </span>
            <span className="fs-xs c-2" style={{ width: 32, textAlign: 'right', flexShrink: 0 }}>
              {pct} %
            </span>
          </div>
        );
      })}
    </div>
  );
}
