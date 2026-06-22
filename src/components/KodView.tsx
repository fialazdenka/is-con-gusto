// COMPONENT: Kód – výpis Laravel/Livewire v4/Alpine.js implementace pro kodéra
// SOURCE: Plain CSS + Bootstrap (sticky headers, accordion)
// CUSTOM: YES – code blocks v `<pre><code>`, copy-to-clipboard tlačítko
//
// Obsah: dva segmenty ze stránky Tržby přepsané do Laravel + Livewire v4 + Alpine.js + plain CSS.
// Vzhled musí zůstat 1:1 stejný — JS/TS verze tady v projektu se NEMĚNÍ, jde jen o podklad pro kodéra.

import { useState } from 'react';
import { fCzk } from '../data';

// ─── Visual previews — mockupy, jak má výstup z Laravelu vypadat ──

const PREVIEW_PROVS = [
  { id: 'cg-brno', shortName: 'CG Brno',   color: '#cdaa69' },
  { id: 'piazza',  shortName: 'Piazza',    color: '#143746' },
  { id: 'monte',   shortName: 'Monte',     color: '#ad0d24' },
  { id: 'u-capa',  shortName: 'U Čápa',    color: '#0C5E44' },
  { id: 'teatr',   shortName: 'Teátr',     color: '#e56445' },
];

// Mock řádky pro Tržby detail (7 dní × 5 provozoven)
const PREVIEW_ROWS = [
  { label: 'po 13.4.', byProv: [62100, 41200, 38400, 39300, 41800], today: false },
  { label: 'út 14.4.', byProv: [65800, 43900, 40500, 41200, 44100], today: false },
  { label: 'st 15.4.', byProv: [68400, 45800, 42100, 43500, 45900], today: false },
  { label: 'čt 16.4.', byProv: [72100, 48300, 44800, 45900, 48700], today: false },
  { label: 'pá 17.4.', byProv: [81500, 54200, 50100, 51800, 54300], today: true  },
];
const PREVIEW_LIVE: Record<string, boolean> = {
  'cg-brno': true, 'piazza': true, 'monte': false, 'u-capa': true, 'teatr': true,
};

function TrzbyDetailPreview() {
  // Brand barva = aktuální --prov-color (mění se v sidebaru topbaru podle vybrané provozovny)
  return (
    <div className="card" style={{ borderTop: '3px solid var(--prov-color, #c9911a)' }}>
      <div className="card-header" style={{ background: '#fff' }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h5 className="card-title mb-0">Tržby detail</h5>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <select className="form-select form-select-sm" style={{ width: 'auto', pointerEvents: 'none' }} defaultValue="Aktuální týden">
              <option>Rychlý výběr…</option>
              <option>Dnes</option>
              <option>Včera</option>
              <option>Aktuální týden</option>
              <option>Minulý týden</option>
            </select>
            <div style={{ width: 1, height: 18, background: '#dee2e6' }} />
            <div className="d-flex align-items-center gap-1">
              <span className="text-muted fs-12">Od</span>
              <input type="date" className="form-control form-control-sm" style={{ width: 140, pointerEvents: 'none' }} defaultValue="2026-04-13" />
            </div>
            <div className="d-flex align-items-center gap-1">
              <span className="text-muted fs-12">Do</span>
              <input type="date" className="form-control form-control-sm" style={{ width: 140, pointerEvents: 'none' }} defaultValue="2026-04-17" />
            </div>
            <span className="badge bg-light text-muted border fs-11">Dny · 5 řádků</span>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="trzby-detail-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8f9fa' }}>
              <th className="trzby-col-date trzby-sticky-l" style={{ background: '#f8f9fa', padding: '6px 10px', minWidth: 110, position: 'sticky', left: 0, zIndex: 2 }}>Datum</th>
              {PREVIEW_PROVS.map((p) => (
                <th key={p.id} style={{ padding: '6px 10px', minWidth: 100, textAlign: 'right' }}>
                  <div className="d-flex align-items-center justify-content-end gap-1">
                    <span className="rounded-circle d-inline-block flex-shrink-0" style={{ width: 7, height: 7, background: p.color }} />
                    {p.shortName}
                  </div>
                </th>
              ))}
              <th className="trzby-sticky-r" style={{ background: '#f8f9fa', padding: '6px 10px', minWidth: 110, textAlign: 'right', position: 'sticky', right: 0, zIndex: 2 }}>Celkem</th>
            </tr>
          </thead>
          <tbody>
            {PREVIEW_ROWS.map((row, ri) => {
              const total = row.byProv.reduce((s, v) => s + v, 0);
              const anyLive = row.today && PREVIEW_PROVS.some((p) => PREVIEW_LIVE[p.id]);
              return (
                <tr key={ri} style={{ borderBottom: '1px solid #f1f3f5' }}>
                  <td className="trzby-sticky-l fw-semibold" style={{ background: '#fff', padding: '6px 10px', position: 'sticky', left: 0, zIndex: 1 }}>{row.label}</td>
                  {PREVIEW_PROVS.map((p, ci) => {
                    const v = row.byProv[ci];
                    const live = row.today && PREVIEW_LIVE[p.id];
                    return (
                      <td key={p.id} className="czk-num" style={{ padding: '6px 10px', textAlign: 'right' }}>
                        <span className="d-inline-flex align-items-center justify-content-end gap-1">
                          {live && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.25)' }} />}
                          {fCzk(v)}
                        </span>
                      </td>
                    );
                  })}
                  <td className="trzby-sticky-r czk-num fw-bold" style={{ background: '#fff', padding: '6px 10px', textAlign: 'right', position: 'sticky', right: 0, zIndex: 1 }}>
                    <span className="d-inline-flex align-items-center justify-content-end gap-1">
                      {anyLive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.25)' }} />}
                      {fCzk(total)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f8f9fa', borderTop: '2px solid #dee2e6' }}>
              <td className="trzby-sticky-l fw-bold" style={{ background: '#f8f9fa', padding: '6px 10px', position: 'sticky', left: 0, zIndex: 1 }}>Celkem</td>
              {PREVIEW_PROVS.map((p, ci) => {
                const sum = PREVIEW_ROWS.reduce((s, r) => s + r.byProv[ci], 0);
                return (
                  <td key={p.id} className="czk-num fw-bold" style={{ padding: '6px 10px', textAlign: 'right' }}>{fCzk(sum)}</td>
                );
              })}
              <td className="trzby-sticky-r czk-num fw-bold" style={{ background: '#f8f9fa', padding: '6px 10px', textAlign: 'right', position: 'sticky', right: 0, zIndex: 1 }}>
                {fCzk(PREVIEW_ROWS.reduce((s, r) => s + r.byProv.reduce((a, b) => a + b, 0), 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// Mock data pro graf vývoje (5 let × 3 provozovny v miliónech Kč)
const CHART_YEARS = ['2022', '2023', '2024', '2025', '2026'];
const CHART_DATA = [
  { prov: PREVIEW_PROVS[0], vals: [18.2, 22.4, 24.1, 26.5, 9.8]  }, // CG Brno
  { prov: PREVIEW_PROVS[1], vals: [11.8, 13.5, 15.2, 17.1, 6.4]  }, // Piazza
  { prov: PREVIEW_PROVS[2], vals: [ 8.5, 10.1, 12.3, 14.8, 5.7]  }, // Monte
];

function VyvojTrzebPreview() {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // SVG dimensions — wide aspect ratio (5:1) tak, aby graf zabral plnou šířku karty
  const CW = 1400, CH = 280, ML = 62, MT = 16, MR = 16, MB = 38;
  const IW = CW - ML - MR;
  const IH = CH - MT - MB;
  const N = CHART_YEARS.length;
  const yMax = 30; // 30M Kč

  const xPx = (i: number) => N > 1 ? ML + (i / (N - 1)) * IW : ML + IW / 2;
  const yPx = (v: number) => MT + IH - (v / yMax) * IH;

  const smoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    const t = 0.25;
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) * t;
      const cp1y = p1.y + (p2.y - p0.y) * t;
      const cp2x = p2.x - (p3.x - p1.x) * t;
      const cp2y = p2.y - (p3.y - p1.y) * t;
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y}`;
    }
    return d;
  };

  return (
    <div className="card" style={{ borderTop: '3px solid var(--prov-color, #c9911a)', width: '100%' }}>
      <div className="card-header" style={{ background: '#fff' }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <div>
            <h5 className="card-title mb-0">Vývoj tržeb</h5>
            <small className="text-muted fw-normal">Roční přehled · 2022–2026 · *duben 2026</small>
            <small className="text-muted fw-normal ms-2 fst-italic" style={{ fontSize: 10 }}>
              (V Laravelu render přes ApexCharts — tady SVG kvůli demonstraci)
            </small>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div style={{ display: 'inline-flex', border: '1px solid #dee2e6', borderRadius: 6, overflow: 'hidden', pointerEvents: 'none' }}>
              <button style={{ padding: '4px 10px', background: '#313b5e', color: 'white', border: 'none', fontSize: 12, fontWeight: 500 }}>Roky</button>
              <button style={{ padding: '4px 10px', background: 'transparent', borderLeft: '1px solid #dee2e6', color: '#495057', fontSize: 12, fontWeight: 500 }}>Rok › měsíce</button>
              <button style={{ padding: '4px 10px', background: 'transparent', borderLeft: '1px solid #dee2e6', color: '#495057', fontSize: 12, fontWeight: 500 }}>Měsíc › roky</button>
            </div>
            <div style={{ display: 'inline-flex', border: '1px solid #dee2e6', borderRadius: 6, overflow: 'hidden', pointerEvents: 'none' }}>
              <button style={{ padding: '4px 10px', background: 'transparent', color: '#495057', fontSize: 12 }}>3 roky</button>
              <button style={{ padding: '4px 10px', background: 'transparent', borderLeft: '1px solid #dee2e6', color: '#495057', fontSize: 12 }}>5 let</button>
              <button style={{ padding: '4px 10px', background: 'transparent', borderLeft: '1px solid #dee2e6', color: '#495057', fontSize: 12 }}>10 let</button>
              <button style={{ padding: '4px 10px', background: '#313b5e', borderLeft: '1px solid #dee2e6', color: 'white', fontSize: 12 }}>Vše</button>
            </div>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-1">
          {PREVIEW_PROVS.map((p, i) => {
            const sel = i < 3;
            return (
              <button key={p.id}
                style={{
                  padding: '3px 9px', borderRadius: 12, fontSize: 11, fontWeight: 500, lineHeight: 1.4, cursor: 'default',
                  background: sel ? p.color : 'white',
                  border: `1px solid ${sel ? p.color : '#dee2e6'}`,
                  color: sel ? 'white' : '#495057',
                }}>
                {p.shortName}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card-body pb-2">
        <div style={{ position: 'relative', width: '100%', paddingBottom: `${(CH / CW * 100).toFixed(2)}%` }}>
          <svg viewBox={`0 0 ${CW} ${CH}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}>
            {/* Grid */}
            {[7.5, 15, 22.5, 30].map((gv, gi) => (
              <g key={gi}>
                <line x1={ML} y1={yPx(gv)} x2={CW-MR} y2={yPx(gv)} stroke="#eaedf1" strokeWidth="1" strokeDasharray="4 3" />
                <text x={ML-6} y={yPx(gv)+4} textAnchor="end" fontSize="9" fill="#9097a7">{gv}M</text>
              </g>
            ))}
            <line x1={ML} y1={MT+IH} x2={CW-MR} y2={MT+IH} stroke="#eaedf1" strokeWidth="1" />

            {/* Linie per provozovna */}
            {CHART_DATA.map((line) => {
              const pts = line.vals.map((v, i) => ({ x: xPx(i), y: yPx(v) }));
              return (
                <g key={line.prov.id}>
                  <path
                    d={`${smoothPath(pts)} L ${pts[pts.length-1].x},${MT+IH} L ${pts[0].x},${MT+IH} Z`}
                    fill={line.prov.color} fillOpacity="0.07"
                  />
                  <path d={smoothPath(pts)} fill="none" stroke={line.prov.color} strokeWidth="2.2" opacity="0.9" />
                  {pts.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y}
                      r={hoverIdx === i ? 5.5 : 3.5}
                      fill={line.prov.color} stroke="white" strokeWidth="1.5"
                      style={{ transition: 'r 0.1s' }}
                    />
                  ))}
                </g>
              );
            })}

            {/* Hover zóny */}
            {CHART_YEARS.map((_, i) => (
              <rect key={i}
                x={xPx(i) - (N > 1 ? IW/(N-1)/2 : IW/2)} y={MT}
                width={N > 1 ? IW/(N-1) : IW} height={IH}
                fill="transparent" style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              />
            ))}

            {/* Vertikální linka */}
            {hoverIdx != null && (
              <line x1={xPx(hoverIdx)} y1={MT} x2={xPx(hoverIdx)} y2={MT+IH}
                stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
            )}

            {/* X popisky */}
            {CHART_YEARS.map((lbl, i) => (
              <text key={i} x={xPx(i)} y={MT+IH+22} textAnchor="middle" fontSize="9"
                fill={hoverIdx === i ? '#313b5e' : '#9097a7'}
                fontWeight={hoverIdx === i ? '700' : '400'}>
                {lbl}
              </text>
            ))}
            <text x={xPx(N-1)} y={MT+IH+34} textAnchor="middle" fontSize="8" fill="#9097a7">*led–dub</text>
          </svg>

          {/* Tooltip */}
          {hoverIdx != null && (
            <div style={{
              position: 'absolute',
              left: `clamp(10px, ${((xPx(hoverIdx) - ML) / IW) * 100}%, calc(100% - 220px))`,
              top: 0, background: '#313b5e', color: 'white', borderRadius: 8, padding: '9px 13px',
              fontSize: 11, pointerEvents: 'none', zIndex: 10, minWidth: 190,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12 }}>
                {CHART_YEARS[hoverIdx]}{hoverIdx === N-1 ? ' *' : ''}
              </div>
              {CHART_DATA.map((line) => (
                <div key={line.prov.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
                  <span style={{ color: line.prov.color }}>{line.prov.shortName}</span>
                  <span style={{ fontWeight: 600 }}>{line.vals[hoverIdx].toFixed(1)}M Kč</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Code samples (Volt / Blade / CSS / JS) ───────────────────

const CODE_TRZBY_DETAIL_VOLT = `<?php
// resources/views/livewire/trzby-detail.blade.php
// Livewire Volt — single-file komponenta (anonymní třída + Blade v jednom souboru).
// Inspirováno stylem kodérovy komponenty sales-sum.blade.php.
//
// Datové zdroje:
//   - Branch                       (Eloquent model, branches table)
//   - DailyClosing                 (daily_closings)
//   - DailyClosingRow              (daily_closing_rows, type_id, value)
//   - DailyClosingRow::SALES       — generická tržba (pro provoz bez K/B rozlišení)
//   - DailyClosingRow::SALES_K     — tržba kuchyně
//   - DailyClosingRow::SALES_B     — tržba baru
//   - DailyClosingRow::SALE_MANUAL — manuálně dorovnané tržby
//
// Multi-tenancy: auth()->user()->activeBranch() + mainBranchGet()
//   - když user je na "main" pobočce → vidí všechny branches (multi-venue režim, jen Celkem)
//   - jinak → vidí jen svou pobočku (single-venue režim, navíc Kuchyň / Bar sloupce)
//
// TODO (kodér):
//   - vs. D-7 (% změna oproti minulému týdnu) — zatím vynecháno.

use Livewire\\Volt\\Component;
use Livewire\\Attributes\\Defer;

use App\\Models\\Branch;
use App\\Models\\DailyClosingRow;

use Carbon\\Carbon;
use Carbon\\CarbonPeriod;

new #[Defer] class extends Component
{
    public $branch;
    public $branches;
    public string $brandColor = '#c9911a';        // Default Con Gusto gold (multi-venue / main branch)

    public $from;
    public $to;
    public $days = [];
    public $data = [];
    public $singleData = [];

    // Předdefinované presety (referenční datum: 2026-04-17)
    public const PRESETS = [
        ['label' => 'Dnes',           'from' => '2026-04-17', 'to' => '2026-04-17'],
        ['label' => 'Včera',          'from' => '2026-04-16', 'to' => '2026-04-16'],
        ['label' => 'Aktuální týden', 'from' => '2026-04-13', 'to' => '2026-04-17'],
        ['label' => 'Minulý týden',   'from' => '2026-04-06', 'to' => '2026-04-12'],
        ['label' => 'Aktuální měsíc', 'from' => '2026-04-01', 'to' => '2026-04-17'],
        ['label' => 'Minulý měsíc',   'from' => '2026-03-01', 'to' => '2026-03-31'],
        ['label' => 'Aktuální rok',   'from' => '2026-01-01', 'to' => '2026-04-17'],
        ['label' => 'Minulý rok',     'from' => '2025-01-01', 'to' => '2025-12-31'],
    ];

    public function mount(): void
    {
        $this->branch = auth()->user()->activeBranch();

        if ($this->branch) {
            // Multi-tenancy: "main" branch vidí všechny, ostatní jen sebe
            if ($this->branch->id == mainBranchGet()) {
                $this->branches   = Branch::all();
                $this->brandColor = '#c9911a';       // Con Gusto gold (default pro multi-venue)
            } else {
                $this->branches   = Branch::where('id', $this->branch->id)->get();
                $this->brandColor = $this->branch->color ?? '#c9911a';  // brand barva té branche
            }

            $this->from = Carbon::now()->subDays(7)->format('Y-m-d');
            $this->to   = Carbon::now()->format('Y-m-d');
            $this->loadData();
        }
    }

    public function applyPreset(string $label): void
    {
        foreach (self::PRESETS as $p) {
            if ($p['label'] === $label) {
                $this->from = $p['from'];
                $this->to   = $p['to'];
                $this->loadData();
                return;
            }
        }
    }

    public function loadData(): void
    {
        // Normalizace datumů
        $from = $this->from ? Carbon::parse($this->from) : now()->subDays(7);
        $to   = $this->to   ? Carbon::parse($this->to)   : now();

        if ($from->gt($to)) {
            [$from, $to] = [$to, $from];
            $this->from = $from->format('Y-m-d');
            $this->to   = $to->format('Y-m-d');
        }

        // Inicializace dní (sumy) + label dopředu (žádný Carbon::parse ve view)
        $days = [];
        foreach (CarbonPeriod::create($from, $to) as $date) {
            $key = $date->format('Y-m-d');
            $days[$key] = [
                'sum'   => 0,
                'label' => $date->translatedFormat('D j.n.'),
                'isToday' => $date->isToday(),
            ];
        }

        // Query: agregace daily_closing_rows.value GROUP BY branch + date + type_id
        // Type_id rozlišuje SALES (generická) / SALES_K (kuchyň) / SALES_B (bar) / SALE_MANUAL.
        // V single-venue módu rozdělíme Kuchyň vs. Bar; v multi-venue jen sečteme.
        $branchIds = $this->branches->pluck('id')->all();

        $salesRows = DailyClosingRow::query()
            ->selectRaw('
                daily_closings.branch_id,
                DATE(daily_closings.date) as closing_date,
                daily_closing_rows.type_id,
                SUM(daily_closing_rows.value) as sales
            ')
            ->join(
                'daily_closings',
                'daily_closings.id',
                '=',
                'daily_closing_rows.daily_closing_id'
            )
            ->whereIn('daily_closings.branch_id', $branchIds)
            ->whereBetween('daily_closings.date', [$from, $to])
            ->whereIn('daily_closing_rows.type_id', [
                DailyClosingRow::SALES,
                DailyClosingRow::SALES_K,
                DailyClosingRow::SALES_B,
                DailyClosingRow::SALE_MANUAL,
            ])
            ->groupBy(
                'daily_closings.branch_id',
                'closing_date',
                'daily_closing_rows.type_id'
            )
            ->get();

        // Indexace: $indexed[branchId][dateKey][typeId] => sales
        $indexed = [];
        foreach ($salesRows as $row) {
            $indexed[$row->branch_id][$row->closing_date][$row->type_id] = (float) $row->sales;
        }

        // Sestavení datové struktury per branch
        $data = [];
        foreach ($this->branches as $branch) {
            $value = [
                'id'    => $branch->id,
                'name'  => $branch->name,
                'color' => $branch->color,
                'data'  => [],        // per-date: celkem (K + B + generická + manuál)
                'dataK' => [],        // per-date: jen kuchyň (single-venue mód)
                'dataB' => [],        // per-date: jen bar (single-venue mód)
                'sum'   => 0,
                'sumK'  => 0,
                'sumB'  => 0,
            ];

            foreach ($days as $dateKey => $_day) {
                $rows = $indexed[$branch->id][$dateKey] ?? [];

                $k     = $rows[DailyClosingRow::SALES_K] ?? null;
                $b     = $rows[DailyClosingRow::SALES_B] ?? null;
                $total = ! empty($rows) ? array_sum($rows) : null; // všechny typy dohromady

                $value['dataK'][$dateKey] = $k;
                $value['dataB'][$dateKey] = $b;
                $value['data'][$dateKey]  = $total;

                if ($k     !== null) $value['sumK'] += $k;
                if ($b     !== null) $value['sumB'] += $b;
                if ($total !== null) {
                    $value['sum'] += $total;
                    $days[$dateKey]['sum'] += $total;
                }
            }
            $data[] = $value;
        }

        $fullSum = array_sum(array_column($data, 'sum'));

        $this->data       = $data;
        $this->days       = $days;
        $this->singleData = [
            'fullSum' => $fullSum,
            'sumK'    => array_sum(array_column($data, 'sumK')),
            'sumB'    => array_sum(array_column($data, 'sumB')),
        ];
    }

    public function isSingleVenue(): bool
    {
        return count($this->data) === 1;
    }
};
?>

@placeholder
    <div class="card">
        <div class="card-header"><h4>Tržby detail</h4></div>
        <div class="card-body">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    </div>
@endplaceholder

{{-- Brand barevný proužek nahoře: 3px border-top barvou aktivní provozovny --}}
{{-- (multi-venue / main branch = Con Gusto gold #c9911a) --}}
<div class="card mb-4" style="--prov-color: {{ $brandColor }}; border-top: 3px solid var(--prov-color);">
    <div class="card-header trzby-detail-header-sticky">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h4 class="card-title mb-0">
                Tržby detail
                @if($this->isSingleVenue() && count($data) > 0)
                    <span class="ms-2 fw-normal fs-6 text-muted">
                        <span class="rounded-circle d-inline-block me-1"
                              style="width:8px;height:8px;background:{{ $data[0]['color'] }}"></span>
                        {{ $data[0]['name'] }}
                    </span>
                @endif
            </h4>

            <div class="d-flex align-items-center gap-2 flex-wrap">
                {{-- Přednastavené filtry --}}
                <select class="form-select form-select-sm" style="width:auto"
                        wire:change="applyPreset($event.target.value)">
                    <option value="" disabled selected>Rychlý výběr…</option>
                    @foreach(self::PRESETS as $p)
                        <option value="{{ $p['label'] }}">{{ $p['label'] }}</option>
                    @endforeach
                </select>

                <div class="topbar-divider"></div>

                {{-- Stejný pattern jako kodérova sales-sum.blade.php --}}
                <x-input label="Od" wire:model="from" type="date" wire:input="loadData()" margin="1" />
                <x-input label="Do" wire:model="to" type="date" wire:input="loadData()" margin="1" />

                <span class="badge bg-light text-muted border">
                    {{ count($days) }} {{ count($days) === 1 ? 'den' : 'dní' }}
                </span>
            </div>
        </div>
    </div>

    <div class="card-body p-0">
        <div class="spinner-border text-primary m-3" role="status" wire:loading wire:target="loadData">
            <span class="visually-hidden">Loading...</span>
        </div>

        @if ($data != [])
            <div class="table-responsive" wire:loading.remove wire:target="loadData">

                @if($this->isSingleVenue())
                    {{-- ── Single-venue: Datum · Kuchyň · Bar · Celkem ── --}}
                    @php $branch = $data[0]; @endphp
                    <table class="table align-middle mb-0 table-hover table-centered trzby-detail-table">
                        <thead class="bg-light">
                            <tr>
                                <th class="trzby-col-date trzby-sticky-l" style="min-width:120px;">
                                    <div class="d-flex align-items-center gap-1">
                                        <span class="rounded-circle d-inline-block" style="width:8px;height:8px;background:{{ $branch['color'] }}"></span>
                                        Datum
                                    </div>
                                </th>
                                <th style="min-width:130px; text-align:right; color:#1c84ee;">Kuchyň</th>
                                <th style="min-width:130px; text-align:right; color:#22c55e;">Bar</th>
                                <th class="trzby-sticky-r bg-light" style="min-width:140px; text-align:right;">Celkem</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($days as $keyDay => $day)
                                <tr wire:key="row-{{ $keyDay }}">
                                    <td class="trzby-sticky-l">
                                        <strong>{{ $day['label'] }}</strong>
                                        {{-- Live tečka: pulzující zelená u dnešního dne (CSS .trzby-live-dot v trzby.css) --}}
                                        @if($day['isToday'] ?? false)
                                            <span class="trzby-live-dot ms-1" style="width:5px;height:5px"></span>
                                        @endif
                                    </td>
                                    <td class="text-end czk-num" style="color:#1c84ee;">
                                        @if(is_null($branch['dataK'][$keyDay]))
                                            <span class="text-muted">—</span>
                                        @else
                                            {{ formatMoney($branch['dataK'][$keyDay], false) }} Kč
                                        @endif
                                    </td>
                                    <td class="text-end czk-num" style="color:#22c55e;">
                                        @if(is_null($branch['dataB'][$keyDay]))
                                            <span class="text-muted">—</span>
                                        @else
                                            {{ formatMoney($branch['dataB'][$keyDay], false) }} Kč
                                        @endif
                                    </td>
                                    <td class="trzby-sticky-r bg-light-subtle text-end czk-num fw-bold">
                                        @if(is_null($branch['data'][$keyDay]))
                                            <span class="text-muted">—</span>
                                        @else
                                            {{ formatMoney($branch['data'][$keyDay], false) }} Kč
                                        @endif
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                        <tfoot>
                            <tr class="bg-light">
                                <td class="trzby-sticky-l"><strong>Celkem</strong></td>
                                <td class="text-end czk-num fw-bold" style="color:#1c84ee;">
                                    {{ formatMoney($singleData['sumK'] ?? 0, false) }} Kč
                                </td>
                                <td class="text-end czk-num fw-bold" style="color:#22c55e;">
                                    {{ formatMoney($singleData['sumB'] ?? 0, false) }} Kč
                                </td>
                                <td class="trzby-sticky-r bg-light text-end czk-num fw-bold">
                                    {{ formatMoney($branch['sum'], false) }} Kč
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                @else
                    {{-- ── Multi-venue: Datum · per branch sloupce · Celkem ── --}}
                    <table class="table align-middle mb-0 table-hover table-centered trzby-detail-table">
                        <thead class="bg-light">
                            <tr>
                                <th class="trzby-col-date trzby-sticky-l" style="min-width:120px;">Datum</th>
                                @foreach ($data as $branchH)
                                    <th style="min-width:140px; text-align:right;">
                                        <div class="d-flex gap-1 align-items-center justify-content-end">
                                            <div style="width:8px; height:8px; border-radius:50%; background-color:{{ $branchH['color'] }};"></div>
                                            <span class="mb-0">{{ $branchH['name'] }}</span>
                                        </div>
                                    </th>
                                @endforeach
                                <th class="trzby-sticky-r bg-light" style="min-width:140px; text-align:right;">Celkem</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($days as $keyDay => $day)
                                <tr wire:key="row-{{ $keyDay }}">
                                    <td class="trzby-sticky-l">
                                        <strong>{{ $day['label'] }}</strong>
                                        {{-- Live tečka: pulzující zelená u dnešního dne (CSS .trzby-live-dot v trzby.css) --}}
                                        @if($day['isToday'] ?? false)
                                            <span class="trzby-live-dot ms-1" style="width:5px;height:5px"></span>
                                        @endif
                                    </td>
                                    @foreach ($data as $branch)
                                        <td class="text-end czk-num" wire:key="c-{{ $keyDay }}-{{ $branch['id'] }}">
                                            @if(is_null($branch['data'][$keyDay]))
                                                <span class="text-muted">—</span>
                                            @else
                                                {{ formatMoney($branch['data'][$keyDay], false) }} Kč
                                            @endif
                                        </td>
                                    @endforeach
                                    <td class="trzby-sticky-r bg-light-subtle text-end czk-num fw-bold">
                                        {{ formatMoney($day['sum'], false) }} Kč
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                        <tfoot>
                            <tr class="bg-light">
                                <td class="trzby-sticky-l"><strong>Celkem</strong></td>
                                @foreach ($data as $finalBranch)
                                    <td class="text-end czk-num fw-bold">
                                        {{ formatMoney($finalBranch['sum'], false) }} Kč
                                    </td>
                                @endforeach
                                <td class="trzby-sticky-r bg-light text-end czk-num fw-bold">
                                    {{ formatMoney($singleData['fullSum'] ?? 0, false) }} Kč
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                @endif

            </div>
        @else
            <p class="p-3 text-muted">Nenalezena žádná data</p>
        @endif
    </div>
</div>
`;

const CODE_VYVOJ_TRZEB_VOLT = `<?php
// resources/views/livewire/vyvoj-trzeb.blade.php
// Livewire Volt — multi-line SVG chart vývoje tržeb + tabulka pod ním.
// Stejný styl jako trzby-detail.blade.php (Volt single-file).
//
// Datové zdroje:
//   - Branch (Eloquent model)
//   - DailyClosing + DailyClosingRow — denní závěrky agregované po měsících / letech
//
// 3 módy:
//   - 'roky'        — X osa = roky (např. 2018–2026), Y = roční suma tržeb
//   - 'rok-mesice'  — X osa = 12 měsíců zvoleného roku, Y = měsíční suma
//   - 'mesic-roky'  — X osa = roky, Y = suma zvoleného měsíce napříč roky
//
// Performance:
//   - Aggregate tabulka (monthly_summaries / branch_yearly_revenue) zatím neexistuje,
//     proto agregujeme z daily_closings + Cache::remember (TTL 1h).
//   - Rok vzniku provozovny: branches nemá opened_at, používáme fallback
//     MIN(daily_closings.date) per branch (s 24h cache).
//
// TODO (kodér):
//   - Cache invalidace přes Eloquent model events (DailyClosingRow::saved → Cache::forget)
//   - Až bude monthly_summaries tabulka, přepsat loadChartData na rychlejší query

use Livewire\\Volt\\Component;
use Livewire\\Attributes\\Defer;

use App\\Models\\Branch;
use App\\Models\\DailyClosingRow;

use Illuminate\\Support\\Facades\\Cache;
use Illuminate\\Support\\Facades\\DB;

use Carbon\\Carbon;

new #[Defer] class extends Component
{
    public string $mode    = 'roky';              // roky | rok-mesice | mesic-roky
    public string $period  = 'vse';               // 3 | 5 | 10 | vse (jen pro mode='roky')
    public int    $year    = 2025;                // pro mode='rok-mesice'
    public int    $month   = 1;                   // pro mode='mesic-roky' (1-12)
    public array  $selectedBranchIds = [];        // multi-select branches v grafu

    public $branches;
    public string $brandColor = '#c9911a';        // Default Con Gusto gold (main branch / multi-venue)

    public const MONTH_LABELS = ['Led','Únor','Bře','Dub','Kvě','Čer','Čec','Srp','Zář','Říj','Lis','Pro'];
    public const MONTH_FULL   = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];

    public function mount(): void
    {
        $branch = auth()->user()->activeBranch();
        if (!$branch) return;

        if ($branch->id == mainBranchGet()) {
            $this->branches   = Branch::all();
            $this->brandColor = '#c9911a';                          // Con Gusto gold (default)
        } else {
            $this->branches   = Branch::where('id', $branch->id)->get();
            $this->brandColor = $branch->color ?? '#c9911a';        // brand barva té branche
        }

        // Default: první 3 branches v grafu
        $this->selectedBranchIds = $this->branches->take(3)->pluck('id')->all();
    }

    public function setMode(string $m): void   { $this->mode   = $m; }
    public function setPeriod(string $p): void { $this->period = $p; }
    public function setYear(int $y): void      { $this->year   = $y; }
    public function setMonth(int $m): void     { $this->month  = $m; }

    public function toggleBranch(int $id): void
    {
        if (in_array($id, $this->selectedBranchIds, true)) {
            $this->selectedBranchIds = array_values(array_filter(
                $this->selectedBranchIds, fn ($x) => $x !== $id
            ));
        } else {
            $this->selectedBranchIds[] = $id;
        }
    }

    // ── Helpery (volatelné z Blade jako $this->...) ──

    public function selectedBranches()
    {
        if (!$this->branches) return collect();
        return $this->branches->whereIn('id', $this->selectedBranchIds)->values();
    }

    public function fromYear(): int
    {
        $currentYear = now()->year;

        // Konečné období podle volby
        if ($this->period === '3')  return $currentYear - 2;   // posledních 3 roky
        if ($this->period === '5')  return $currentYear - 4;
        if ($this->period === '10') return $currentYear - 9;

        // 'vse' — od nejstaršího data v daily_closings vybraných branches
        // Fallback (branches.opened_at v DB neexistuje).
        if (empty($this->selectedBranchIds)) return $currentYear - 5;

        sort($this->selectedBranchIds);
        $key = 'vyvoj-trzeb:min-date:' . implode(',', $this->selectedBranchIds);

        $minDate = Cache::remember($key, 86400, function () {
            return DB::table('daily_closings')
                ->whereIn('branch_id', $this->selectedBranchIds)
                ->min('date');
        });

        return $minDate ? Carbon::parse($minDate)->year : $currentYear - 5;
    }

    public function xLabels(): array
    {
        return match ($this->mode) {
            'roky'       => array_map('strval', range($this->fromYear(), now()->year)),
            'rok-mesice' => self::MONTH_LABELS,
            'mesic-roky' => array_map('strval', range($this->fromYear(), now()->year)),
        };
    }

    // ── Hlavní query (cached) ────────────────────────────────────
    // Vrací: array indexed by [branchId][periodKey] => suma tržeb.
    // Cache TTL: 1 hodina. V produkci doporučeno přidat Cache::forget
    // přes model event DailyClosingRow::saved/deleted pro live invalidaci.
    public function loadChartData(): array
    {
        $branchIds = $this->selectedBranchIds;
        if (empty($branchIds)) return [];

        sort($branchIds);
        $cacheKey = sprintf(
            'vyvoj-trzeb:%s:%s:%d:%d:%s',
            $this->mode,
            $this->period,
            $this->year,
            $this->month,
            implode(',', $branchIds)
        );

        return Cache::remember($cacheKey, 3600, function () use ($branchIds) {
            // Datum range podle módu
            if ($this->mode === 'roky') {
                $from = Carbon::create($this->fromYear(), 1, 1);
                $to   = Carbon::create(now()->year, 12, 31);
            } elseif ($this->mode === 'rok-mesice') {
                $from = Carbon::create($this->year, 1, 1);
                $to   = Carbon::create($this->year, 12, 31);
            } else { // mesic-roky
                $from = Carbon::create($this->fromYear(), $this->month, 1);
                $to   = Carbon::create(now()->year, $this->month, 1)->endOfMonth();
            }

            // Agregace dle módu (year | year+month | year)
            $groupBy = $this->mode === 'rok-mesice'
                ? 'MONTH(daily_closings.date)'
                : 'YEAR(daily_closings.date)';

            $rows = DailyClosingRow::query()
                ->selectRaw("
                    daily_closings.branch_id,
                    {$groupBy} as period_key,
                    SUM(daily_closing_rows.value) as sales
                ")
                ->join(
                    'daily_closings',
                    'daily_closings.id',
                    '=',
                    'daily_closing_rows.daily_closing_id'
                )
                ->whereIn('daily_closings.branch_id', $branchIds)
                ->whereBetween('daily_closings.date', [$from, $to])
                // pro mesic-roky filtrovat na zvolený měsíc
                ->when($this->mode === 'mesic-roky', function ($q) {
                    $q->whereRaw('MONTH(daily_closings.date) = ?', [$this->month]);
                })
                ->whereIn('daily_closing_rows.type_id', [
                    DailyClosingRow::SALES,
                    DailyClosingRow::SALES_K,
                    DailyClosingRow::SALES_B,
                    DailyClosingRow::SALE_MANUAL,
                ])
                ->groupBy('daily_closings.branch_id', 'period_key')
                ->get();

            // Indexace [branchId][periodKey] => sales
            $indexed = [];
            foreach ($rows as $r) {
                $indexed[$r->branch_id][$r->period_key] = (float) $r->sales;
            }
            return $indexed;
        });
    }

    // ── Data pro ApexCharts (předané jako JSON do Alpine.js) ─────
    // Vrací: ['categories' => [...], 'series' => [{name, data, color}, ...], 'subtitle' => '...']
    public function chartData(): array
    {
        $xLabels  = $this->xLabels();
        $branches = $this->selectedBranches();
        $indexed  = $this->loadChartData();

        $series = [];
        foreach ($branches as $b) {
            $data = [];
            foreach ($xLabels as $i => $label) {
                $periodKey = $this->mode === 'rok-mesice' ? ($i + 1) : (int) $label;
                $data[] = round($indexed[$b->id][$periodKey] ?? 0);
            }
            $series[] = [
                'name'  => $b->name,
                'data'  => $data,
                'color' => $b->color,
            ];
        }

        return [
            'categories' => $xLabels,
            'series'     => $series,
            'subtitle'   => $this->chartSubtitle(),
        ];
    }

    public function chartSubtitle(): string
    {
        return match ($this->mode) {
            'roky'       => 'Roční přehled · ' . $this->fromYear() . '–' . now()->year,
            'rok-mesice' => 'Měsíční přehled · rok ' . $this->year,
            'mesic-roky' => self::MONTH_FULL[$this->month - 1] . ' · ' . $this->fromYear() . '–' . now()->year,
        };
    }
};
?>

@placeholder
    <div class="card">
        <div class="card-header"><h4>Vývoj tržeb</h4></div>
        <div class="card-body">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    </div>
@endplaceholder

@php
    $branches = $this->branches;
    $selected = $this->selectedBranches();
@endphp

{{-- Brand barevný proužek nahoře (stejně jako u Tržby detail) + full-width container --}}
<div class="card mb-3"
     style="--prov-color: {{ $brandColor }}; border-top: 3px solid var(--prov-color); width: 100%;"
     x-data="vyvojTrzebChart(@js($this->chartData()))"
     x-init="renderChart()"
     @chart-data-updated.window="updateChart($event.detail)">

    <div class="card-header trzby-detail-header-sticky">
        {{-- Řádek 1: nadpis + mode switcher --}}
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <div>
                <h4 class="card-title mb-0">Vývoj tržeb</h4>
                <small class="text-muted fw-normal">{{ $this->chartSubtitle() }}</small>
            </div>
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <div class="lk-segment">
                    @foreach(['roky' => 'Roky', 'rok-mesice' => 'Rok › měsíce', 'mesic-roky' => 'Měsíc › roky'] as $k => $lbl)
                        <button class="lk-seg-btn @if($this->mode === $k) active @endif"
                                wire:click="setMode('{{ $k }}')">{{ $lbl }}</button>
                    @endforeach
                </div>

                @if($this->mode === 'roky')
                    <div class="lk-segment">
                        @foreach(['3' => '3 roky', '5' => '5 let', '10' => '10 let', 'vse' => 'Vše'] as $k => $lbl)
                            <button class="lk-seg-btn @if($this->period === $k) active @endif"
                                    wire:click="setPeriod('{{ $k }}')">{{ $lbl }}</button>
                        @endforeach
                    </div>
                @endif

                @if($this->mode === 'rok-mesice')
                    <select class="form-select form-select-sm" style="width:auto" wire:model.live="year">
                        @for($y = now()->year; $y >= 2006; $y--)
                            <option value="{{ $y }}">{{ $y }}</option>
                        @endfor
                    </select>
                @endif

                @if($this->mode === 'mesic-roky')
                    <select class="form-select form-select-sm" style="width:auto" wire:model.live="month">
                        @foreach(self::MONTH_FULL as $i => $m)
                            <option value="{{ $i + 1 }}">{{ $m }}</option>
                        @endforeach
                    </select>
                @endif
            </div>
        </div>

        {{-- Řádek 2: toggle tlačítka branches --}}
        <div class="d-flex flex-wrap gap-1">
            @foreach($branches as $b)
                @php $sel = in_array($b->id, $this->selectedBranchIds, true); @endphp
                <button class="trzby-chart-toggle"
                        style="{{ $sel ? "background:{$b->color};border-color:{$b->color};color:white" : '' }}"
                        wire:click="toggleBranch({{ $b->id }})">
                    {{ $b->name }}
                </button>
            @endforeach
        </div>
    </div>

    <div class="card-body p-2">
        <div class="spinner-border text-primary m-3" role="status" wire:loading wire:target="setMode,setPeriod,year,month,toggleBranch">
            <span class="visually-hidden">Loading...</span>
        </div>

        @if($selected->isEmpty())
            <div style="height:380px;display:flex;align-items:center;justify-content:center" class="text-muted">
                Vyberte alespoň jeden podnik pomocí tlačítek výše.
            </div>
        @else
            {{-- ApexCharts kontejner — plná šířka, vlastní implementace v vyvoj-chart.js --}}
            <div wire:loading.remove wire:target="setMode,setPeriod,year,month,toggleBranch"
                 wire:ignore  {{-- Livewire nesmí přepisovat ApexCharts DOM --}}
                 x-ref="chartContainer"
                 style="width: 100%; min-height: 380px;">
            </div>
        @endif
    </div>
</div>

{{-- Po každém Livewire re-render → pošli nová data do Alpine přes window event --}}
<script>
    document.addEventListener('livewire:initialized', () => {
        Livewire.hook('morph.updated', ({ component }) => {
            if (component.name === 'vyvoj-trzeb') {
                window.dispatchEvent(new CustomEvent('chart-data-updated', {
                    detail: @json($this->chartData())
                }));
            }
        });
    });
</script>
`;

const CODE_VSECHNY_PROVOZY_PATCH = `<?php
// PATCH pro resources/views/livewire/vyvoj-trzeb.blade.php
// ───────────────────────────────────────────────────────────
// Rozšíření existující Volt komponenty o tlačítko "Všechny provozy".
//
// Účel:
//   - exclusive toggle: deaktivuje individuální branches, zobrazí jedinou
//     zlatou linii reprezentující součet napříč všemi aktivními provozy
//   - auto-přepne $period na 'vse' → historie celé skupiny od nejstaršího
//     daily_closing.date napříč všemi branches (Cache::remember 24h)
//   - druhý klik vrátí default (první 3 branches)
//
// Pravidla (kodér chce vše v Volt komponentě, žádné Support třídy):
//   ✓ Veškerá logika v anonymní třídě komponenty
//   ✓ Eloquent (Branch, DailyClosingRow) — žádné mock data
//   ✓ Cache::remember pro agregaci napříč branches
//   ✓ Konstanta '#c9911a' = Con Gusto gold (lze přesunout do config)
//
// Aplikace patche: 4 změny v existující komponentě.
// ───────────────────────────────────────────────────────────

// ─── 1) ROZŠÍŘENÍ toggleBranch() ───────────────────────────
// V existující komponentě nahradit metodu toggleBranch:

public function toggleBranch(int|string $id): void
{
    if ($id === 'all') {
        if (in_array('all', $this->selectedBranchIds, true)) {
            // Druhý klik na "Všechny provozy" → vrátí defaultní 3 branches
            $this->selectedBranchIds = $this->branches->take(3)->pluck('id')->all();
        } else {
            // Exclusive: deaktivuje všechny ostatní, ponechá jen 'all'
            $this->selectedBranchIds = ['all'];
            // Auto-switch period → "vse", ať se ukáže historie celé skupiny
            $this->period = 'vse';
        }
        return;
    }

    // Klik na konkrétní branch → odstraní 'all' pokud byl aktivní
    $this->selectedBranchIds = array_values(array_filter(
        $this->selectedBranchIds, fn ($x) => $x !== 'all'
    ));

    // Normální toggle (kept-original logika)
    if (in_array($id, $this->selectedBranchIds, true)) {
        if (count($this->selectedBranchIds) > 1) {
            $this->selectedBranchIds = array_values(array_filter(
                $this->selectedBranchIds, fn ($x) => $x !== $id
            ));
        }
    } else {
        $this->selectedBranchIds[] = $id;
    }
}

// ─── 2) ROZŠÍŘENÍ fromYear() ────────────────────────────────
// V period='vse' použít MIN(date) napříč VŠEMI branches:

public function fromYear(): int
{
    $currentYear = now()->year;

    if ($this->period === '3')  return $currentYear - 2;
    if ($this->period === '5')  return $currentYear - 4;
    if ($this->period === '10') return $currentYear - 9;

    // period === 'vse'
    $isAll = in_array('all', $this->selectedBranchIds, true);
    $branchIds = $isAll
        ? $this->branches->pluck('id')->all()
        : $this->selectedBranchIds;

    if (empty($branchIds)) return $currentYear - 5;

    sort($branchIds);
    $key = $isAll
        ? 'vyvoj-trzeb:min-date:all'
        : 'vyvoj-trzeb:min-date:' . implode(',', $branchIds);

    $minDate = Cache::remember($key, 86400, function () use ($branchIds) {
        return DB::table('daily_closings')
            ->whereIn('branch_id', $branchIds)
            ->min('date');
    });

    return $minDate ? Carbon::parse($minDate)->year : $currentYear - 5;
}

// ─── 3) ROZŠÍŘENÍ loadChartData() ──────────────────────────
// Pokud 'all' → query napříč všemi branches + agregace pod klíčem 'all':

public function loadChartData(): array
{
    $isAll = in_array('all', $this->selectedBranchIds, true);
    $branchIds = $isAll
        ? $this->branches->pluck('id')->all()
        : $this->selectedBranchIds;

    if (empty($branchIds)) return [];

    sort($branchIds);
    $cacheKey = sprintf(
        'vyvoj-trzeb:%s:%s:%d:%d:%s%s',
        $this->mode,
        $this->period,
        $this->year,
        $this->month,
        $isAll ? 'all-' : '',
        implode(',', $branchIds)
    );

    return Cache::remember($cacheKey, 3600, function () use ($branchIds, $isAll) {
        // Datum range (původní logika)
        if ($this->mode === 'roky') {
            $from = Carbon::create($this->fromYear(), 1, 1);
            $to   = Carbon::create(now()->year, 12, 31);
        } elseif ($this->mode === 'rok-mesice') {
            $from = Carbon::create($this->year, 1, 1);
            $to   = Carbon::create($this->year, 12, 31);
        } else {
            $from = Carbon::create($this->fromYear(), $this->month, 1);
            $to   = Carbon::create(now()->year, $this->month, 1)->endOfMonth();
        }

        $groupBy = $this->mode === 'rok-mesice'
            ? 'MONTH(daily_closings.date)'
            : 'YEAR(daily_closings.date)';

        $rows = DailyClosingRow::query()
            ->selectRaw("
                daily_closings.branch_id,
                {$groupBy} as period_key,
                SUM(daily_closing_rows.value) as sales
            ")
            ->join('daily_closings', 'daily_closings.id', '=', 'daily_closing_rows.daily_closing_id')
            ->whereIn('daily_closings.branch_id', $branchIds)
            ->whereBetween('daily_closings.date', [$from, $to])
            ->when($this->mode === 'mesic-roky', function ($q) {
                $q->whereRaw('MONTH(daily_closings.date) = ?', [$this->month]);
            })
            ->whereIn('daily_closing_rows.type_id', [
                DailyClosingRow::SALES,
                DailyClosingRow::SALES_K,
                DailyClosingRow::SALES_B,
                DailyClosingRow::SALE_MANUAL,
            ])
            ->groupBy('daily_closings.branch_id', 'period_key')
            ->get();

        $indexed = [];
        if ($isAll) {
            // Agregace přes všechny branches → indexed pod klíčem 'all'
            foreach ($rows as $r) {
                $indexed['all'][$r->period_key] = ($indexed['all'][$r->period_key] ?? 0) + (float) $r->sales;
            }
        } else {
            foreach ($rows as $r) {
                $indexed[$r->branch_id][$r->period_key] = (float) $r->sales;
            }
        }
        return $indexed;
    });
}

// ─── 4) ROZŠÍŘENÍ chartData() ──────────────────────────────
// V chartData připravit jedinou zlatou series pro 'all':

public function chartData(): array
{
    $isAll = in_array('all', $this->selectedBranchIds, true);
    $xLabels = $this->xLabels();
    $indexed = $this->loadChartData();

    if ($isAll) {
        $data = [];
        foreach ($xLabels as $i => $label) {
            $periodKey = $this->mode === 'rok-mesice' ? ($i + 1) : (int) $label;
            $data[] = round($indexed['all'][$periodKey] ?? 0);
        }
        return [
            'categories' => $xLabels,
            'series' => [[
                'name'  => 'Všechny provozy',
                'data'  => $data,
                'color' => '#c9911a',   // Con Gusto gold (config('app.brand_color') by bylo lepší)
            ]],
            'subtitle' => 'Celá skupina Con Gusto · ' . $this->fromYear() . '–' . now()->year,
        ];
    }

    // Původní per-branch logika (nezměněno)
    $branches = $this->selectedBranches();
    $series = [];
    foreach ($branches as $b) {
        $data = [];
        foreach ($xLabels as $i => $label) {
            $periodKey = $this->mode === 'rok-mesice' ? ($i + 1) : (int) $label;
            $data[] = round($indexed[$b->id][$periodKey] ?? 0);
        }
        $series[] = [
            'name'  => $b->name,
            'data'  => $data,
            'color' => $b->color,
        ];
    }
    return [
        'categories' => $xLabels,
        'series'     => $series,
        'subtitle'   => $this->chartSubtitle(),
    ];
}
?>

{{-- ─── 5) BLADE: přidání tlačítka "Všechny provozy" ─────── --}}
{{-- V existující sekci s toggle tlačítky doplnit PŘED foreach branches: --}}

<div class="d-flex flex-wrap gap-1">
    {{-- "Všechny provozy" CTA (Con Gusto gold) --}}
    @php $isAll = in_array('all', $this->selectedBranchIds, true); @endphp
    <button class="trzby-chart-toggle"
            style="background: {{ $isAll ? '#c9911a' : 'white' }};
                   border-color: #c9911a;
                   color: {{ $isAll ? 'white' : '#c9911a' }};
                   font-weight: 600;"
            wire:click="toggleBranch('all')"
            title="Zobrazí vývoj celé skupiny Con Gusto (součet všech provozů)">
        <iconify-icon icon="solar:buildings-bold-duotone" class="me-1"></iconify-icon>
        Všechny provozy
    </button>
    <span class="mx-1 align-self-center text-muted" style="font-size:11px">·</span>

    {{-- Existující řada per-branch tlačítek (nezměněno) --}}
    @foreach($branches as $b)
        @php $sel = in_array($b->id, $this->selectedBranchIds, true); @endphp
        <button class="trzby-chart-toggle"
                style="{{ $sel ? "background:{$b->color};border-color:{$b->color};color:white" : '' }}"
                wire:click="toggleBranch({{ $b->id }})">
            {{ $b->name }}
        </button>
    @endforeach
</div>
`;

const CODE_CSS = `/* resources/css/trzby.css */
/* Vlastní styly pro Tržby detail + Vývoj tržeb. */
/* Předpokládá se globální font 'Acumin Pro' (Book/Semibold/Bold) z @font-face. */

:root {
    --prov-color: #c9911a; /* default = Con Gusto gold; přepíše JS dle vybrané provozovny */
}

/* ── Sticky karet hlavička (při scrollu zůstává) ───────────── */
.trzby-detail-header-sticky {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #fff;
}

/* ── Wrapper s horizontálním scrollem ──────────────────────── */
.trzby-detail-wrap {
    overflow-x: auto;
    max-width: 100%;
}

/* ── Hlavní tabulka ─────────────────────────────────────────── */
.trzby-detail-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
}

.trzby-detail-table th,
.trzby-detail-table td {
    padding: 6px 10px;
    white-space: nowrap;
    border-bottom: 1px solid #f1f3f5;
}

.trzby-detail-table thead th {
    background: #f8f9fa;
    color: #495057;
    font-weight: 600;
    font-size: 12px;
    border-bottom: 2px solid #dee2e6;
}

.trzby-detail-table tfoot td {
    background: #f8f9fa;
    font-weight: 700;
    border-top: 2px solid #dee2e6;
}

/* ── Sticky sloupce ────────────────────────────────────────── */
.trzby-sticky-l {
    position: sticky;
    left: 0;
    background: inherit;
    z-index: 2;
    box-shadow: 1px 0 0 #f1f3f5;
}
.trzby-sticky-r {
    position: sticky;
    right: 0;
    background: inherit;
    z-index: 2;
    box-shadow: -1px 0 0 #f1f3f5;
}
.trzby-detail-table thead .trzby-sticky-l,
.trzby-detail-table thead .trzby-sticky-r,
.trzby-detail-table tfoot .trzby-sticky-l,
.trzby-detail-table tfoot .trzby-sticky-r {
    background: #f8f9fa;
    z-index: 3;
}

.trzby-col-date  { min-width: 120px; }
.trzby-col-prov  { min-width: 90px;  text-align: right; }
.trzby-col-total { min-width: 100px; text-align: right; }

/* ── Live tečka (pulzující) ─────────────────────────────────── */
.trzby-live-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
    display: inline-block;
    animation: trzby-pulse 1.6s ease-in-out infinite;
}
@keyframes trzby-pulse {
    0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.25); }
    50%      { box-shadow: 0 0 0 5px rgba(34,197,94,0.10); }
}

/* ── Čísla v tabulce (tabular-nums + Acumin Pro) ───────────── */
.czk-num {
    font-family: 'Acumin Pro', system-ui, sans-serif;
    font-variant-numeric: tabular-nums;
}

/* ── Segment buttons (Roky / Rok › měsíce / …) ─────────────── */
.lk-segment {
    display: inline-flex;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    overflow: hidden;
}
.lk-seg-btn {
    padding: 4px 10px;
    background: transparent;
    border: none;
    color: #495057;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.12s;
}
.lk-seg-btn:hover {
    background: #f8f9fa;
}
.lk-seg-btn.active {
    background: #313b5e;
    color: white;
}
.lk-seg-btn + .lk-seg-btn {
    border-left: 1px solid #dee2e6;
}

/* ── Toggle tlačítka podniků v grafu vývoje ─────────────────── */
.trzby-chart-toggle {
    padding: 3px 9px;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 12px;
    color: #495057;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.12s;
    line-height: 1.4;
}
.trzby-chart-toggle:hover {
    background: #f8f9fa;
}

/* ── Topbar divider (decorative line in card-header) ────────── */
.topbar-divider {
    width: 1px;
    height: 18px;
    background: #dee2e6;
    margin: 0 4px;
}
`;

const CODE_ALPINE_JS = `// resources/js/vyvoj-chart.js
// Alpine.js + ApexCharts inicializace pro graf vývoje tržeb.
//
// Závislost: ApexCharts (npm i apexcharts NEBO CDN <script src="...apexcharts...">)
// Načti přes Alpine.data('vyvojTrzebChart', window.vyvojTrzebChart) v app.js,
// nebo definuj jako window.* (níže) — pak je dostupné v x-data="vyvojTrzebChart(...)".

// Formátování Kč s narrow no-break space (U+202F)
window.fCzk = function (n) {
    const sign = n < 0 ? '-' : '';
    const abs  = Math.abs(n);
    const s    = String(abs).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '\\u202F');
    return sign + s + '\\u202FKč';
};

// Stručná Y-osa: 1.5M, 850k apod.
window.fmtAxisY = function (v) {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000)     return Math.round(v / 1_000) + 'k';
    return String(v);
};

window.vyvojTrzebChart = function (initialData) {
    return {
        chart: null,
        data:  initialData,

        // Inicializace — voláno z x-init="renderChart()"
        renderChart() {
            this.chart = new ApexCharts(this.$refs.chartContainer, this.buildOptions());
            this.chart.render();
        },

        // Update z window eventu po Livewire re-renderu
        updateChart(newData) {
            this.data = newData;
            if (!this.chart) return;
            this.chart.updateOptions({
                series:      this.data.series.map(s => ({ name: s.name, data: s.data })),
                colors:      this.data.series.map(s => s.color),
                xaxis:       { categories: this.data.categories },
                subtitle:    { text: this.data.subtitle },
            }, true, true);  // (animate, redrawPaths)
        },

        // ApexCharts options — zachovává design SVG verze
        buildOptions() {
            return {
                chart: {
                    type:       'area',
                    height:     380,
                    fontFamily: "'Acumin Pro', system-ui, sans-serif",
                    toolbar:    { show: false },
                    zoom:       { enabled: false },
                    animations: { enabled: true, speed: 300 },
                },
                series: this.data.series.map(s => ({ name: s.name, data: s.data })),
                colors: this.data.series.map(s => s.color),
                stroke: {
                    curve:  'smooth',   // Catmull-Rom-like smooth lines (jako naše smoothPath)
                    width:  2.5,
                    lineCap: 'round',
                },
                fill: {
                    type:     'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom:    0.25,
                        opacityTo:      0.02,   // jako fill-opacity="0.07" v SVG verzi
                        stops:          [0, 95, 100],
                    },
                },
                xaxis: {
                    categories: this.data.categories,
                    labels: {
                        style: { fontSize: '11px', colors: '#9097a7', fontWeight: 400 },
                    },
                    axisBorder: { color: '#eaedf1' },
                    axisTicks:  { color: '#eaedf1' },
                },
                yaxis: {
                    labels: {
                        style:     { fontSize: '11px', colors: '#9097a7' },
                        formatter: window.fmtAxisY,
                    },
                },
                grid: {
                    borderColor:     '#eaedf1',
                    strokeDashArray: 4,           // jako dasharray="4 3" v SVG
                    yaxis: { lines: { show: true } },
                    xaxis: { lines: { show: false } },
                },
                dataLabels: { enabled: false },
                legend:     { show: false },      // máme vlastní toggle buttons v Blade
                markers: {
                    size:        3.5,
                    strokeWidth: 1.5,
                    strokeColors: '#fff',
                    hover:       { size: 5.5 },
                },
                tooltip: {
                    shared:        true,
                    intersect:     false,
                    followCursor:  true,
                    fillSeriesColor: false,
                    theme:         'dark',
                    custom: function ({ series, dataPointIndex, w }) {
                        const title = w.globals.labels[dataPointIndex];
                        let rows = '';
                        series.forEach((seriesData, i) => {
                            const v = seriesData[dataPointIndex];
                            if (v <= 0) return;
                            const name  = w.globals.seriesNames[i];
                            const color = w.globals.colors[i];
                            rows += \`
                                <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:2px">
                                    <span style="color:\${color}">\${name}</span>
                                    <span style="font-weight:600">\${window.fCzk(v)}</span>
                                </div>
                            \`;
                        });
                        if (!rows) return '';
                        return \`
                            <div style="background:#313b5e;color:white;border-radius:8px;padding:9px 13px;font-size:11px;min-width:190px;box-shadow:0 4px 20px rgba(0,0,0,0.2)">
                                <div style="font-weight:700;margin-bottom:6px;font-size:12px">\${title}</div>
                                \${rows}
                            </div>
                        \`;
                    },
                },
                responsive: [{
                    breakpoint: 768,
                    options: {
                        chart:  { height: 280 },
                        xaxis:  { labels: { style: { fontSize: '10px' } } },
                    },
                }],
            };
        },
    };
};
`;

const CODE_ROUTES_PHP = `<?php
// routes/web.php — registrace stránky Tržby
use Illuminate\\Support\\Facades\\Route;

Route::view('/trzby', 'trzby.index')
    ->middleware(['auth'])
    ->name('trzby.index');

// Volt komponenty jsou auto-discoverované z resources/views/livewire/.
// Vkládají se do Blade jako <livewire:trzby-detail /> nebo zkr. <livewire:trzby-detail />.
// Pokud používáš jiný directory, registruj v config/livewire.php.
`;

const CODE_LAYOUT_BLADE = `{{-- resources/views/trzby/index.blade.php --}}
{{-- Hlavní stránka Tržby. Obě sekce jako Volt komponenty (auto-loadované). --}}
@extends('layouts.app')

@section('title', 'Tržby')

@section('content')
    {{-- Sekce 1: Tržby detail (tabulka za období) --}}
    <livewire:trzby-detail />

    {{-- Sekce 2: Vývoj tržeb (graf + tabulka pod ním) --}}
    <livewire:vyvoj-trzeb />
@endsection

@push('scripts')
    {{-- ApexCharts knihovna pro graf vývoje tržeb (CDN nebo npm install apexcharts) --}}
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>

    {{-- Alpine.js inicializace ApexCharts + tooltip helpery --}}
    <script src="{{ asset('js/vyvoj-chart.js') }}"></script>
@endpush

@push('styles')
    <link rel="stylesheet" href="{{ asset('css/trzby.css') }}">
@endpush
`;

// ─── Accordion entries ────────────────────────────────────────

type CodeFile = { path: string; lang: string; code: string };
type AccItem  = { id: string; title: string; description: string; files: CodeFile[] };

const ACCORDION: AccItem[] = [
  {
    id: 'trzby-detail-volt',
    title: '1 — Tržby detail: Volt single-file komponenta',
    description: 'Anonymní třída + Blade v jednom souboru. Brand color border-top, live tečka u dnešního dne, Kuchyň/Bar split v single-venue módu. Inspirováno sales-sum.blade.php.',
    files: [
      { path: 'resources/views/livewire/trzby-detail.blade.php', lang: 'blade', code: CODE_TRZBY_DETAIL_VOLT },
    ],
  },
  {
    id: 'vyvoj-trzeb-volt',
    title: '2 — Vývoj tržeb: Volt single-file + ApexCharts',
    description: 'ApexCharts area chart na plnou šířku, brand color border-top, smooth lines + gradient fill. Volt vrací chartData() jako JSON, Alpine.js inicializuje chart a reaguje na Livewire eventy.',
    files: [
      { path: 'resources/views/livewire/vyvoj-trzeb.blade.php', lang: 'blade', code: CODE_VYVOJ_TRZEB_VOLT },
      { path: 'resources/js/vyvoj-chart.js',                    lang: 'js',    code: CODE_ALPINE_JS },
    ],
  },
  {
    id: 'vyvoj-trzeb-vsechny',
    title: '3 — Vývoj tržeb: rozšíření „Všechny provozy"',
    description: 'Patch existující Volt komponenty (nepřepisuje původní). Exclusive toggle pro celkový součet napříč všemi branches, auto-switch period na „vse", MIN(date) cache pro celé skupiny. 4 úpravy v komponentě + 1 v Blade.',
    files: [
      { path: 'resources/views/livewire/vyvoj-trzeb.blade.php (patch)', lang: 'blade', code: CODE_VSECHNY_PROVOZY_PATCH },
    ],
  },
  {
    id: 'css',
    title: '4 — CSS (sdílené pro obě sekce)',
    description: 'Plain CSS: sticky sloupce, live tečka pulzace, segment buttons, toggle tlačítka v grafu.',
    files: [
      { path: 'resources/css/trzby.css', lang: 'css', code: CODE_CSS },
    ],
  },
  {
    id: 'integration',
    title: '5 — Routing a layout (jak to zapojit)',
    description: 'Sample route + Blade layout, který vloží obě Volt komponenty na jednu stránku.',
    files: [
      { path: 'routes/web.php',                        lang: 'php',   code: CODE_ROUTES_PHP },
      { path: 'resources/views/trzby/index.blade.php', lang: 'blade', code: CODE_LAYOUT_BLADE },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────

function renderAccordionItem(
  sec: AccItem,
  openId: string | null,
  toggle: (id: string) => void,
  copiedAt: string | null,
  copyCode: (path: string, code: string) => void,
) {
  const open = openId === sec.id;
  return (
    <div key={sec.id} className="card">
      {/* Header */}
      <button
        className="card-header d-flex align-items-center gap-2 border-0 bg-transparent text-start w-100"
        onClick={() => toggle(sec.id)}
        style={{ cursor: 'pointer' }}
      >
        <iconify-icon
          icon={open ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-right-bold'}
          style={{ fontSize: 14, color: '#9097a7', flexShrink: 0 }}
        />
        <div className="flex-grow-1 min-width-0">
          <div className="fw-bold fs-14">{sec.title}</div>
          <div className="text-muted fs-12">{sec.description}</div>
        </div>
        <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 10 }}>
          {sec.files.length} {sec.files.length === 1 ? 'soubor' : sec.files.length < 5 ? 'soubory' : 'souborů'}
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className="card-body pt-0">
          {sec.files.map((f) => (
            <div key={f.path} className="mb-3">
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <iconify-icon
                  icon={
                    f.lang === 'php'   ? 'solar:code-bold-duotone' :
                    f.lang === 'blade' ? 'solar:layers-bold-duotone' :
                    f.lang === 'css'   ? 'solar:palette-bold-duotone' :
                                          'solar:document-text-bold-duotone'
                  }
                  style={{ fontSize: 14, color: '#6c757d' }}
                />
                <code className="bg-light px-2 py-1 rounded fs-12" style={{ color: '#1a1a1a' }}>
                  {f.path}
                </code>
                <span className="badge bg-light text-muted border" style={{ fontSize: 10 }}>{f.lang.toUpperCase()}</span>
                <button
                  className="btn btn-light btn-sm ms-auto py-0 px-2"
                  style={{ fontSize: 11 }}
                  onClick={() => copyCode(f.path, f.code)}
                >
                  {copiedAt === f.path ? (
                    <><iconify-icon icon="solar:check-circle-bold" className="me-1" style={{ fontSize: 12, color: '#198754' }} /> Zkopírováno</>
                  ) : (
                    <><iconify-icon icon="solar:copy-bold-duotone" className="me-1" style={{ fontSize: 12 }} /> Kopírovat</>
                  )}
                </button>
              </div>
              <pre
                style={{
                  background: '#0d1117',
                  color: '#e6edf3',
                  padding: '14px 16px',
                  borderRadius: 6,
                  overflowX: 'auto',
                  fontSize: 12,
                  lineHeight: 1.55,
                  fontFamily: "'Menlo', 'Monaco', 'SF Mono', 'Consolas', monospace",
                  margin: 0,
                  maxHeight: 500,
                }}
              >
                <code>{f.code}</code>
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Phase 8.6 (zápis 22. 6. 2026) — KodView refactor na NESTED SUBPAGES.
// Levý nav se sekcemi (Banka, Faktury, Tržby, …) + pravý content area pro zvolenou sekci.
// Tržby sekce má kompletní Volt/ApexCharts kód (převzato z předchozí verze),
// Banka sekce má placeholder s "rozpracované" notice, ostatní sekce čekají.

type KodStatus = 'hotovo' | 'rozpracovane' | 'ceka';

interface KodSekce {
  id: string;
  label: string;
  icon: string;
  status: KodStatus;
  intro?: string;
}

const KOD_SECTIONS: KodSekce[] = [
  { id: 'banka',           label: 'Banka',            icon: 'solar:bank-bold-duotone',           status: 'hotovo', intro: 'BalanceOverview + UcetCard + Tabulka transakcí + TransakceSidePanel + Návrh systému (detectTransactionType). Jediná dílčí komponenta s rozpracovaným statusem je AutoSyncBar (čeká na finální UX dávkového UI) — ostatní jsou připraveny k implementaci.' },
  { id: 'faktury',         label: 'Faktury',          icon: 'solar:document-text-bold-duotone',  status: 'ceka', intro: 'Workflow přijatých + vydaných faktur. Tabulka, schvalovací proces v panelu, Fakturoid-style editor, šablony položek.' },
  { id: 'trvale-prikazy',  label: 'Trvalé příkazy',   icon: 'solar:refresh-circle-bold-duotone', status: 'hotovo', intro: 'Trvalé příkazy (TP) — 3 typy (standard/leasing/záloha), splátkový kalendář per řádek edit, form modal s auto-generováním leasingových splátek. Eloquent: `StandingOrder` + `StandingOrderInstallment`. Cross-section nav z Banky (`pendingTPFromTrans`).' },
  { id: 'uvery',           label: 'Úvěry',            icon: 'solar:hand-money-bold-duotone',     status: 'hotovo', intro: 'Úvěry — 4 typy (hypotéka/investiční/provozní/leasing), 2 sazby (fix vs. PRIBOR+marže), splátkový kalendář s rozpadem jistina/úrok, anuitní kalkulačka, předčasné splacení, mimořádná splátka. Pro majitele: rozpad zaplaceného jistina/úroky pod progress barem.' },
  { id: 'poplatky',        label: 'Poplatky',         icon: 'solar:tag-price-bold-duotone',      status: 'hotovo', intro: 'Poplatky — read-only z pohledu vstupu (nikdy ne ručně přidat, vždy z Banky přes detectTransType + manuální označení). 9 typů, KPI strip, klikatelný breakdown, měsíční souhrny.' },
  { id: 'karty-platformy', label: 'Karty / Platformy', icon: 'solar:card-bold-duotone',          status: 'ceka' },
  { id: 'dane',            label: 'Daně',             icon: 'solar:scale-bold-duotone',          status: 'ceka' },
  { id: 'trzby',           label: 'Tržby',            icon: 'solar:graph-up-bold-duotone',       status: 'hotovo', intro: 'Tržby detail + Vývoj tržeb (ApexCharts) v Livewire Volt. Volt single-file + Eloquent + Cache::remember. Brand color border-top, live tečka, K/B split.' },
  { id: 'platby',          label: 'Platby',           icon: 'solar:wallet-money-bold-duotone',   status: 'ceka' },
  { id: 'pohledavky',      label: 'Pohledávky',       icon: 'solar:hand-money-bold-duotone',     status: 'ceka' },
  { id: 'cashflow',        label: 'Cashflow',         icon: 'solar:chart-bold-duotone',          status: 'ceka' },
  { id: 'dashboard',       label: 'Dashboard',        icon: 'solar:widget-bold-duotone',         status: 'ceka' },
  { id: 'nastaveni',       label: 'Nastavení',        icon: 'solar:settings-bold-duotone',       status: 'ceka' },
  { id: 'shell',           label: 'AppShell / Sidebar / Topbar', icon: 'solar:sidebar-minimalistic-bold-duotone', status: 'ceka' },
];

function KodStatusBadge({ status }: { status: KodStatus }) {
  // Phase 8.6 (zápis 22. 6. 2026) — Status 'hotovo' = "Připraveno k implementaci"
  // (kódový podklad je finální a nasazený na live, kodér může začít implementovat).
  const cfg = {
    hotovo:        { label: 'Připraveno k implementaci', cls: 'bg-success-subtle text-success',    icon: 'solar:check-circle-bold-duotone' },
    rozpracovane:  { label: 'Rozpracované',              cls: 'bg-warning-subtle text-warning',    icon: 'solar:hammer-bold-duotone' },
    ceka:          { label: 'Čeká',                      cls: 'bg-secondary-subtle text-secondary', icon: 'solar:clock-circle-bold-duotone' },
  }[status];
  return (
    <span className={`badge ${cfg.cls} d-inline-flex align-items-center gap-1`} style={{ fontSize: 11 }}>
      <iconify-icon icon={cfg.icon} style={{ fontSize: 12 }} />
      {cfg.label}
    </span>
  );
}

export default function KodView() {
  const [openId,   setOpenId]   = useState<string | null>(null);
  const [copiedAt, setCopiedAt] = useState<string | null>(null);
  const [aktivni,  setAktivni]  = useState<string>('trzby'); // default = Tržby (kompletní kód)

  function toggle(id: string) {
    setOpenId((cur) => cur === id ? null : id);
  }

  async function copyCode(path: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedAt(path);
      setTimeout(() => setCopiedAt(null), 1500);
    } catch {
      // fallback — uživatel zkopíruje ručně
    }
  }

  const sekce = KOD_SECTIONS.find((s) => s.id === aktivni) ?? KOD_SECTIONS[0];

  return (
    <>
      {/* Page header (společný pro celou stránku Kód) */}
      <div className="page-title-box">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h4 className="page-title mb-0 d-flex align-items-center gap-2">
            <iconify-icon icon="solar:code-bold-duotone" style={{ color: '#6c757d' }} />
            Kód pro backend implementaci
          </h4>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <span className="badge bg-primary-subtle text-primary fs-11">PHP 8.2+</span>
            <span className="badge bg-info-subtle text-info fs-11">Laravel 11+</span>
            <span className="badge bg-success-subtle text-success fs-11">Livewire Volt</span>
            <span className="badge bg-warning-subtle text-warning fs-11">Alpine.js 3</span>
            <span className="badge bg-danger-subtle text-danger fs-11">ApexCharts</span>
            <span className="badge bg-secondary-subtle text-secondary fs-11">Eloquent · CSS</span>
          </div>
        </div>
      </div>

      <div className="alert alert-info py-2 mb-3 fs-13 d-flex align-items-start gap-2">
        <iconify-icon icon="solar:info-circle-bold-duotone" style={{ fontSize: 18 }} />
        <div>
          Backend implementace pro kodéra. Vyber sekci v levém panelu — uvidíš Volt/Blade/Alpine kód té sekce
          (Eloquent query, Blade template, JS chart inicializaci, CSS). <strong>Postupně doplňujeme</strong> —
          jak procházíme jednotlivé sekce, dokumentaci aktualizujeme.
        </div>
      </div>

      <div className="row g-3">
        {/* LEVÝ NAV — sekce */}
        <div className="col-md-3">
          <div className="card" style={{ position: 'sticky', top: 'calc(var(--bs-topbar-height, 100px) + 16px)' }}>
            <div className="list-group list-group-flush">
              {KOD_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${aktivni === s.id ? 'active' : ''}`}
                  onClick={() => setAktivni(s.id)}>
                  <iconify-icon icon={s.icon} style={{ fontSize: 18 }} />
                  <div className="flex-grow-1 text-start">
                    <div className="fw-semibold fs-13">{s.label}</div>
                  </div>
                  <KodStatusBadge status={s.status} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PRAVÝ OBSAH */}
        <div className="col-md-9">
          {/* Section header */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                  <h5 className="mb-1 d-flex align-items-center gap-2">
                    <iconify-icon icon={sekce.icon} style={{ color: '#0d6efd' }} />
                    {sekce.label}
                  </h5>
                  {sekce.intro && <div className="text-muted fs-13 mt-1">{sekce.intro}</div>}
                </div>
                <KodStatusBadge status={sekce.status} />
              </div>
            </div>
          </div>

          {/* Sekce: Banka — Připraveno k implementaci (jen AutoSyncBar zůstává rozpracovaný) */}
          {aktivni === 'banka' && (
            <>
              <div className="alert alert-success d-flex align-items-start gap-2 mb-3 fs-13">
                <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 18 }} />
                <div>
                  <strong>Připraveno k implementaci.</strong> UX schválené v meetingu 22. 6. 2026.
                  Eloquent modely + Livewire Volt komponenty níže.
                  <br /><strong>Pozor:</strong> dílčí komponenta <code>AutoSyncBar</code> má status „Rozpracované" —
                  finální dávkové UI bude dořešeno v dalším kole. Implementujte zatím jen status-only verzi (viz karta níže).
                </div>
              </div>

              {/* Datový model */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Datový model (Eloquent)</h6>
                      <code className="fs-12 text-muted">app/Models/BankAccount.php + BankTransaction.php + …</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <ul className="fs-13 mb-2" style={{ paddingLeft: 18 }}>
                    <li><code>bank_accounts</code> — id, name, iban, bank, currency (CZK/EUR), branch_ids (JSON array — multi-venue), account_balance, available_funds, last_sync, sync_status, status (ok/low/critical/sync_error), history_balance (JSON — 37 bodů: 30 minulých + dnes + 6 budoucích), week_prediction, month_prediction</li>
                    <li><code>bank_transactions</code> — id, account_id (FK), type (incoming/outgoing), date, amount (negative=outgoing), counterparty, note, vs?, status (paired/unpaired/manual_paired), paired_invoice_id? (FK), candidates (JSON — SuggestedMatch[]), outside_reason?, outside_note?, no_invoice_reason?, manual_reason?, manual_note?, counter_account?, delegated_to_user_id? (FK)</li>
                    <li><code>transaction_audit_entries</code> — id, transaction_id (FK), time, user_id (FK), action, icon, color</li>
                    <li><code>transaction_notes</code> — id, transaction_id (FK), time, user_id (FK), text</li>
                  </ul>
                  <div className="alert alert-info py-2 mb-0 fs-12">
                    <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                    <strong>Multi-venue účet:</strong> <code>branch_ids</code> je JSON array → konsolidované účty (Hlavní, Mzdy, Marketing, Catering) mají více <code>branch_id</code>, single-venue mají jeden. Border-top karty: jeden branch → barva té branche, multi → Con Gusto gold <code>#c9911a</code>.
                  </div>
                </div>
              </div>

              {/* Main view */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Hlavní view (Volt)</h6>
                      <code className="fs-12 text-muted">resources/views/livewire/banka/index.blade.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <div className="fs-13 mb-2"><strong>State:</strong></div>
                  <ul className="fs-13 mb-2" style={{ paddingLeft: 18 }}>
                    <li><code>$dateFrom</code>, <code>$dateTo</code>, <code>$amountFrom</code>, <code>$amountTo</code>, <code>$search</code> — filtry</li>
                    <li><code>$statusFilter</code> (Set), <code>$typeFilter</code> — multiselect chipy</li>
                    <li><code>$selectedTransactionId</code> — který řádek je otevřený v panelu</li>
                    <li><code>$activeWorkQueue</code> — null / 'unpaired' / 'multiple-candidates' / 'no-vs' / 'no-branch' / 'waiting-review' / 'error'</li>
                  </ul>
                  <div className="fs-13"><strong>Query:</strong></div>
                  <pre className="bg-light p-2 rounded fs-12 mb-2" style={{ overflow: 'auto' }}>
{`public function with(): array {
  $branchId = auth()->user()->activeBranch()?->id;
  $accounts = BankAccount::query()
    ->when($branchId !== mainBranchGet(), fn($q) =>
      $q->whereJsonContains('branch_ids', $branchId))
    ->orderBy('name')
    ->get();

  $transactions = BankTransaction::query()
    ->whereIn('account_id', $accounts->pluck('id'))
    ->whereBetween('date', [$this->dateFrom, $this->dateTo])
    ->when($this->search, fn($q) => $q->where(function($q) {
      $q->where('counterparty', 'like', "%{$this->search}%")
        ->orWhere('vs', 'like', "%{$this->search}%")
        ->orWhere('note', 'like', "%{$this->search}%");
    }))
    ->when($this->statusFilter, fn($q) => $q->whereIn('status', $this->statusFilter))
    ->orderBy('date', 'desc')
    ->get();

  return compact('accounts', 'transactions');
}`}
                  </pre>
                  <div className="alert alert-info py-2 mb-0 fs-12">
                    <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                    Multi-tenancy přes <code>auth()-&gt;user()-&gt;activeBranch()</code> + <code>mainBranchGet()</code> — main branch vidí všechny účty, jinak jen ty s daným branch_id v JSON arrayi.
                  </div>
                </div>
              </div>

              {/* BalanceOverview */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">BalanceOverview (collapsible)</h6>
                      <code className="fs-12 text-muted">resources/views/livewire/banka/balance-overview.blade.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`#[Computed]
public function totalCzk(): float {
  return BankAccount::where('currency', 'CZK')
    ->whereJsonContains('branch_ids', auth()->user()->activeBranch()?->id)
    ->sum('account_balance');
}

#[Computed]
public function totalEur(): float {
  return BankAccount::where('currency', 'EUR')
    ->whereJsonContains('branch_ids', auth()->user()->activeBranch()?->id)
    ->sum('account_balance');
}

// Blade — collapsible Bootstrap accordion
<div class="accordion">
  <div class="accordion-item">
    <h2 class="accordion-header">
      <button class="accordion-button collapsed" data-bs-toggle="collapse"
              data-bs-target="#accountsList">
        Zůstatek celkem: {{ formatMoney($this->totalCzk, false) }}
        @if($this->totalEur > 0) + {{ number_format($this->totalEur, 2) }} € @endif
      </button>
    </h2>
    <div id="accountsList" class="accordion-collapse collapse">
      <div class="accordion-body">
        @foreach($accounts as $account)
          <div class="d-flex justify-content-between py-1">
            <span>{{ $account->name }}</span>
            <span class="czk-num">{{ formatMoney($account->account_balance, false) }}</span>
          </div>
        @endforeach
      </div>
    </div>
  </div>
</div>`}
                  </pre>
                </div>
              </div>

              {/* UcetCard se sparkline */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">UcetCard (SVG sparkline + brand color)</h6>
                      <code className="fs-12 text-muted">resources/views/livewire/banka/ucet-card.blade.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <div className="fs-13 mb-2">
                    Sparkline = inline SVG 37 bodů. 30 minulých = solid line, dnes = circle, 7 budoucích = dashed.
                    Area fill 0.08 opacity. Border-top barva podle počtu branche.
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`@php
  $borderColor = match(true) {
    count($account->branch_ids) === 1 =>
      Branch::find($account->branch_ids[0])->color,
    count($account->branch_ids) > 1 => '#c9911a',  // Con Gusto gold
    default => '#9097a7',                            // unassigned
  };
@endphp

<div class="card ucet-card" style="border-top: 3px solid {{ $borderColor }};">
  <div class="card-body">
    <h5>{{ $account->name }}</h5>
    <div>{{ $account->iban }}</div>
    <div>Účetní bilance: {{ formatMoney($account->account_balance, false) }}</div>
    <div>Dostupní prostředky: {{ formatMoney($account->available_funds, false) }}</div>

    {{-- SVG sparkline 37 bodů --}}
    <svg viewBox="0 0 200 40" class="ucet-sparkline">
      @php $points = json_decode($account->history_balance); @endphp
      <path d="..." fill="{{ $borderColor }}" fill-opacity="0.08" />
      <path d="..." stroke="{{ $borderColor }}" fill="none" />
    </svg>

    <div class="d-flex justify-content-between fs-12">
      <span>Týden: {{ formatMoney($account->week_prediction, false) }}</span>
      <span>Měsíc: {{ formatMoney($account->month_prediction, false) }}</span>
    </div>
  </div>
</div>`}
                  </pre>
                </div>
              </div>

              {/* TransakceSidePanel */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">TransakceSidePanel (single-scroll)</h6>
                      <code className="fs-12 text-muted">resources/views/livewire/banka/transaction-side-panel.blade.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <div className="fs-13 mb-2">
                    Sticky pravý panel, progressive disclosure (žádné taby, vše v jednom plynulém scrollu).
                    Sekce shora dolů: Akční zóna → Detail → Aktivita (audit + poznámky chronologicky).
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-2" style={{ overflow: 'auto' }}>
{`public function confirmCandidate(int $candidateInvoiceId): void {
  $invoice = Invoice::findOrFail($candidateInvoiceId);
  $this->transaction->update([
    'status' => 'paired',
    'paired_invoice_id' => $invoice->id,
  ]);
  $invoice->update(['status' => 'paid']);
  TransactionAuditEntry::create([
    'transaction_id' => $this->transaction->id,
    'time' => now(),
    'user_id' => auth()->id(),
    'action' => "Spárováno s fakturou {$invoice->number}",
    'icon' => 'solar:check-circle-bold-duotone',
    'color' => '#198754',
  ]);
  $this->feedback = 'Transakce spárována s ' . $invoice->number;
}

public function markAs(string $reason, string $targetSection): void {
  $this->transaction->update([
    'status' => 'manual_paired',
    'manual_reason' => $reason,
    'manual_note' => "Auto-klasifikace dle popisu",
  ]);
  TransactionAuditEntry::create([
    'transaction_id' => $this->transaction->id,
    'action' => "Přijat návrh: {$reason} → {$targetSection}",
    'icon' => 'solar:magic-stick-3-bold-duotone',
    'color' => '#0d6efd',
  ]);
}`}
                  </pre>
                </div>
              </div>

              {/* Návrh systému */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Návrh systému (detectTransactionType)</h6>
                      <code className="fs-12 text-muted">app/Services/BankTransactionClassifier.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`class BankTransactionClassifier {
  public function detect(BankTransaction $t): ?array {
    $text = strtolower($t->counterparty . ' ' . ($t->note ?? ''));

    if (preg_match('/(poplatek|vedeni\\s*[uú][cč]tu|transakce|sprav)/i', $text)) {
      return ['type' => 'Bankovní poplatek', 'target' => 'fees'];
    }
    if (preg_match('/([uú]rok|debetn|kreditn|sazba)/i', $text)) {
      return ['type' => 'Úrok z účtu', 'target' => 'fees'];
    }
    if (preg_match('/(sankce|pen[aá]le|pokut|upomink)/i', $text)) {
      return ['type' => 'Sankce / penále', 'target' => 'fees'];
    }
    if (preg_match('/(mzda|plat|vyplata|odm[eě]n)/i', $text)) {
      return ['type' => 'Mzda', 'target' => 'salaries'];
    }
    if (preg_match('/(splatka|leasing|[uú]v[eě]r)/i', $text)) {
      return ['type' => 'Splátka úvěru', 'target' => 'loans'];
    }
    return null;
  }
}

// Použití v Volt — Návrh systému alert:
#[Computed]
public function systemSuggestion(): ?array {
  return app(BankTransactionClassifier::class)->detect($this->transaction);
}`}
                  </pre>
                </div>
              </div>

              {/* Cross-section nav */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Cross-section navigace (Otevřít fakturu / Vytvořit TP)</h6>
                      <code className="fs-12 text-muted">Session flash + redirect</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`// Otevřít detail spárované faktury
public function openPairedInvoice(): void {
  $this->redirect(
    route('invoices.index', ['open' => $this->transaction->paired_invoice_id]),
    navigate: true
  );
}

// Vytvořit trvalý příkaz z nespárované transakce
public function createStandingOrder(): void {
  session()->flash('pending_tp_from_transaction', [
    'counterparty' => $this->transaction->counterparty,
    'amount' => abs($this->transaction->amount),
    'counter_account' => $this->transaction->counter_account,
    'vs' => $this->transaction->vs,
  ]);
  $this->redirect(route('standing-orders.index'), navigate: true);
}`}
                  </pre>
                </div>
              </div>

              {/* AutoSyncBar — ROZPRACOVANÉ */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #fd7e14' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
                    <div>
                      <h6 className="mb-1 fw-bold">AutoSyncBar</h6>
                      <code className="fs-12 text-muted">resources/views/livewire/banka/auto-sync-bar.blade.php</code>
                    </div>
                    <KodStatusBadge status="rozpracovane" />
                  </div>
                  <div className="alert alert-warning py-2 mb-2 fs-12">
                    <iconify-icon icon="solar:hammer-bold-duotone" className="me-1" />
                    <strong>Phase 8.6 (zápis 22. 6. 2026):</strong> v této iteraci implementujte jen <strong>status-only verzi</strong>.
                    Finální dávkové UI bude dořešeno v dalším feedback kole.
                  </div>
                  <div className="row g-2 fs-12 mb-2">
                    <div className="col-md-6">
                      <div className="text-muted fs-11 text-uppercase mb-1">Implementujte teď</div>
                      <div>Status indikátor (Aktivní), interval (15 min), Poslední sync, Příští sync, API limit (X/300)</div>
                    </div>
                    <div className="col-md-6">
                      <div className="text-muted fs-11 text-uppercase mb-1">Počkat na finální UX</div>
                      <div>Dávkové platby (Odeslat dávku / Vrátit poslední krok / audit), Error stav (Auto-sync vypnut + Zapnout znovu), Manuální akce (Živě / Znovu načíst)</div>
                    </div>
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`{{-- Status-only verze — pouze pro tento iterativní krok --}}
<div class="d-flex align-items-center gap-2 px-3 py-2 mb-3 rounded"
     style="background: #f8f9fa; border: 1px solid #e9ecef; font-size: 12px;">
  <span class="rounded-circle d-inline-block"
        style="width: 8px; height: 8px; background: #198754;
               box-shadow: 0 0 0 3px rgba(25,135,84,0.15);"></span>
  <span class="fw-semibold">Auto-sync</span>
  <span class="badge bg-success-subtle text-success">Aktivní</span>
  <span class="text-muted">15 min</span>
  <span class="text-muted">Poslední: {{ $lastSync }}</span>
  <span class="text-muted">Příští: {{ $nextSync }}</span>
  <span class="text-muted ms-auto">API: {{ $apiUsage }}/300</span>
</div>`}
                  </pre>
                </div>
              </div>
            </>
          )}

          {/* Sekce: Tržby — kompletní kód (původní obsah KodView) */}
          {aktivni === 'trzby' && (
            <>
              {/* Vyřešené body banner */}
              <div className="alert alert-success d-flex align-items-start gap-2 mb-3">
                <iconify-icon icon="solar:check-circle-bold-duotone" className="fs-5 flex-shrink-0" />
                <div className="fs-13">
                  <strong>Vyřešené body (po feedbacku od kodéra):</strong>
                  <ol className="mb-0 mt-1" style={{ paddingLeft: 18 }}>
                    <li><strong>Kuchyň/Bar split</strong> — používáme <code>DailyClosingRow::SALES_K</code> + <code>SALES_B</code>. Single-venue mód má sloupce Datum · Kuchyň · Bar · Celkem.</li>
                    <li><strong>Historické agregace</strong> — query přes <code>daily_closings</code> obalená v <code>Cache::remember(...)</code> s TTL 1h.</li>
                    <li><strong>Rok vzniku</strong> — fallback <code>MIN(daily_closings.date)</code> s 24h cache.</li>
                    <li><strong>Brand barvy</strong> — public <code>$brandColor</code> property + CSS proměnná <code>--prov-color</code>.</li>
                    <li><strong>Live tečka</strong> — pulzující zelená <code>.trzby-live-dot</code> u dnešního data.</li>
                    <li><strong>ApexCharts</strong> — graf Vývoj tržeb přes <code>chartData()</code> JSON + Alpine.js <code>vyvojTrzebChart</code> plugin.</li>
                  </ol>
                </div>
              </div>

              {/* Skupina: Tržby detail */}
              <section className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <iconify-icon icon="solar:table-bold-duotone" style={{ fontSize: 20, color: 'var(--prov-color, #c9911a)' }} />
                  <h5 className="mb-0">Tržby detail</h5>
                  <span className="text-muted fs-12 ms-2">Tabulka tržeb za období + filtry</span>
                </div>
                <div className="mb-3 p-3 rounded" style={{ background: 'rgba(13, 202, 240, 0.06)', border: '1px solid rgba(13, 202, 240, 0.25)' }}>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <iconify-icon icon="solar:eye-bold-duotone" style={{ fontSize: 16, color: '#0dcaf0' }} />
                    <strong className="fs-13" style={{ color: '#0dcaf0' }}>Náhled — jak má výstup z Laravelu vypadat</strong>
                  </div>
                  <TrzbyDetailPreview />
                </div>
                <div className="d-flex flex-column gap-2">
                  {ACCORDION.filter(s => s.id.startsWith('trzby-detail')).map((sec) => renderAccordionItem(sec, openId, toggle, copiedAt, copyCode))}
                </div>
              </section>

              {/* Skupina: Vývoj tržeb */}
              <section className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <iconify-icon icon="solar:graph-up-bold-duotone" style={{ fontSize: 20, color: 'var(--prov-color, #c9911a)' }} />
                  <h5 className="mb-0">Vývoj tržeb</h5>
                  <span className="text-muted fs-12 ms-2">ApexCharts graf na celou šířku</span>
                </div>
                <div className="mb-3 p-3 rounded" style={{ background: 'rgba(13, 202, 240, 0.06)', border: '1px solid rgba(13, 202, 240, 0.25)' }}>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <iconify-icon icon="solar:eye-bold-duotone" style={{ fontSize: 16, color: '#0dcaf0' }} />
                    <strong className="fs-13" style={{ color: '#0dcaf0' }}>Náhled</strong>
                  </div>
                  <VyvojTrzebPreview />
                </div>
                <div className="d-flex flex-column gap-2">
                  {ACCORDION.filter(s => s.id.startsWith('vyvoj-trzeb')).map((sec) => renderAccordionItem(sec, openId, toggle, copiedAt, copyCode))}
                </div>
              </section>

              {/* Sdílené */}
              <section className="mb-4">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <iconify-icon icon="solar:settings-bold-duotone" style={{ fontSize: 20, color: '#6c757d' }} />
                  <h5 className="mb-0">Sdílené (CSS, routing, helpery)</h5>
                </div>
                <div className="d-flex flex-column gap-2">
                  {ACCORDION.filter(s => !s.id.startsWith('trzby-detail') && !s.id.startsWith('vyvoj-trzeb')).map((sec) => renderAccordionItem(sec, openId, toggle, copiedAt, copyCode))}
                </div>
              </section>
            </>
          )}

          {/* Sekce: Trvalé příkazy — Připraveno k implementaci */}
          {aktivni === 'trvale-prikazy' && (
            <>
              <div className="alert alert-success d-flex align-items-start gap-2 mb-3 fs-13">
                <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 18 }} />
                <div>
                  <strong>Připraveno k implementaci.</strong> UX schválené v meetingu 22. 6. 2026 (žádné změny).
                  Eloquent modely + Livewire Volt komponenty níže. Stack: Laravel 11+ · Livewire Volt · Eloquent · Cache::remember.
                </div>
              </div>

              {/* Datový model */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Datový model (Eloquent)</h6>
                      <code className="fs-12 text-muted">app/Models/StandingOrder.php + StandingOrderInstallment.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <div className="fs-13 mb-2">2 tabulky + enum:</div>
                  <ul className="fs-13 mb-2" style={{ paddingLeft: 18 }}>
                    <li><code>standing_orders</code> — id, name, type (enum: standard/leasing/zaloha), counterparty, counterparty_account, account_id (FK <code>bank_accounts</code>), period (enum: weekly/monthly/quarterly/yearly), amount, vs, ks?, ss?, start_date, end_date?, next_due_date, status (active/paused/cancelled), expense_type (kancelar/provoz/sdileny), branch_id? (FK), note?</li>
                    <li><code>standing_order_installments</code> — id, standing_order_id (FK), sequence_number, due_date, vs, amount, status (paid/pending/overdue), override_account_id? (FK)</li>
                    <li><code>standing_order_documents</code> — id, standing_order_id (FK), name, type (smlouva/dodatek/jiný), uploaded_at, file_path</li>
                  </ul>
                  <div className="alert alert-info py-2 mb-0 fs-12">
                    <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                    <strong>Pro leasing:</strong> splátkový kalendář (<code>standing_order_installments</code>) se generuje při založení TP přes <code>StandingOrder::generateInstallments($count, $vsTemplate)</code> — VS každé splátky = <code>$vsTemplate . str_pad($i + 1, 3, "0", STR_PAD_LEFT)</code>. Standard/záloha typy nemají splátky (jen <code>next_due_date</code> + opakovaný auto-generated record při zaúčtování).
                  </div>
                </div>
              </div>

              {/* Hlavní view */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Hlavní view (Volt)</h6>
                      <code className="fs-12 text-muted">resources/views/livewire/standing-orders/index.blade.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <div className="fs-13">
                    <strong>Volt single-file</strong> komponenta s <code>#[Defer]</code> lazy loadingem. State:
                  </div>
                  <ul className="fs-13 mb-2" style={{ paddingLeft: 18 }}>
                    <li><code>$search</code>, <code>$statusFilter</code>, <code>$typeFilter</code>, <code>$unpaidOnly</code> — filtry (Livewire reactive)</li>
                    <li><code>$selectedId</code> — který TP je otevřený v side panelu</li>
                    <li><code>$formMode</code> — null / 'new' / 'edit' — řídí modal</li>
                  </ul>
                  <div className="fs-13"><strong>Query:</strong></div>
                  <pre className="bg-light p-2 rounded fs-12 mb-2" style={{ overflow: 'auto' }}>
{`public function with(): array {
  $orders = StandingOrder::query()
    ->when($this->search, fn($q) => $q->where(function($q) {
      $q->where('name', 'like', "%{$this->search}%")
        ->orWhere('counterparty', 'like', "%{$this->search}%")
        ->orWhere('vs', 'like', "%{$this->search}%");
    }))
    ->when($this->statusFilter, fn($q) => $q->where('status', $this->statusFilter))
    ->when($this->typeFilter, fn($q) => $q->where('type', $this->typeFilter))
    ->when($this->unpaidOnly, fn($q) => $q->whereHas('installments',
        fn($q) => $q->where('status', 'overdue')))
    ->withCount(['installments as unpaid_count' => fn($q) => $q->where('status', 'overdue')])
    ->orderBy('next_due_date')
    ->get();

  return compact('orders');
}`}
                  </pre>
                  <div className="alert alert-info py-2 mb-0 fs-12">
                    <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                    Cross-section nav z Banky: <code>session('pendingTPFromTrans')</code> v <code>mount()</code> → pokud existuje, auto-otevří formulář v <code>'new'</code> módu s předvyplněnými údaji (firma → counterparty, částka, protiÚčet, VS) a vyčistí session pole.
                  </div>
                </div>
              </div>

              {/* KPI strip */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">KPI strip</h6>
                      <code className="fs-12 text-muted">computed properties v Volt</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-2" style={{ overflow: 'auto' }}>
{`#[Computed]
public function activeCount(): int {
  return Cache::remember("standing-orders:active-count", 300,
    fn() => StandingOrder::where('status', 'active')->count());
}

#[Computed]
public function monthlyBurden(): int {
  return Cache::remember("standing-orders:monthly-burden", 300, function() {
    return StandingOrder::active()->get()->sum(function($o) {
      return match($o->period) {
        'weekly' => $o->amount * 4.33,
        'monthly' => $o->amount,
        'quarterly' => $o->amount / 3,
        'yearly' => $o->amount / 12,
      };
    });
  });
}

#[Computed]
public function unpaidInstallmentsCount(): int {
  return StandingOrderInstallment::where('status', 'overdue')->count();
}`}
                  </pre>
                </div>
              </div>

              {/* Form modal */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Form modal (new/edit) + leasing auto-preview</h6>
                      <code className="fs-12 text-muted">resources/views/livewire/standing-orders/form.blade.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <div className="fs-13 mb-2">
                    Formulář používá <code>{'<x-input>'}</code> Blade komponentu (jako Tržby). Validace přes Livewire rules.
                  </div>
                  <div className="fs-13 mb-2"><strong>Auto-preview leasingových splátek:</strong></div>
                  <pre className="bg-light p-2 rounded fs-12 mb-2" style={{ overflow: 'auto' }}>
{`#[Computed]
public function previewInstallments(): array {
  if ($this->type !== 'leasing' || !$this->installmentCount || !$this->vsTemplate) {
    return [];
  }
  return StandingOrder::generateInstallmentsArray(
    $this->startDate,
    (int)$this->installmentCount,
    (float)$this->amount,
    $this->vsTemplate
  );
}

// V Modelu:
public static function generateInstallmentsArray(
  string $start, int $count, float $baseAmount, string $vsTemplate
): array {
  $items = [];
  $date = Carbon::parse($start);
  for ($i = 0; $i < $count; $i++) {
    $items[] = [
      'sequence_number' => $i + 1,
      'due_date' => $date->copy()->addMonths($i)->toDateString(),
      'vs' => $vsTemplate . str_pad($i + 1, 3, '0', STR_PAD_LEFT),
      'amount' => $baseAmount,
      'status' => 'pending',
    ];
  }
  return $items;
}`}
                  </pre>
                  <div className="fs-13"><strong>Blade preview:</strong></div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`@if($this->type === 'leasing' && count($this->previewInstallments) > 0)
  <div class="alert alert-info py-2">
    <strong>Auto-preview {{ count($this->previewInstallments) }} splátek</strong>
  </div>
  <table class="table table-sm">
    <thead><tr><th>#</th><th>Datum</th><th>VS</th><th>Částka</th></tr></thead>
    <tbody>
      @foreach($this->previewInstallments as $i => $s)
        <tr>
          <td>{{ $s['sequence_number'] }}</td>
          <td>{{ $s['due_date'] }}</td>
          <td class="czk-num">{{ $s['vs'] }}</td>
          <td class="text-end czk-num">{{ formatMoney($s['amount'], false) }}</td>
        </tr>
      @endforeach
    </tbody>
  </table>
@endif`}
                  </pre>
                </div>
              </div>

              {/* Side panel */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Side panel + inline edit splátek</h6>
                      <code className="fs-12 text-muted">resources/views/livewire/standing-orders/side-panel.blade.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <div className="fs-13 mb-2">
                    Sticky pravý panel <code>style="top: calc(var(--bs-topbar-height) + 16px)"</code>.
                    Per-řádek edit splátky:
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-2" style={{ overflow: 'auto' }}>
{`public function updateInstallment(int $installmentId, array $patch): void {
  $installment = StandingOrderInstallment::findOrFail($installmentId);
  $this->authorize('update', $installment->standingOrder);
  $installment->update($patch);

  // Audit zápis
  activity()->performedOn($installment)
    ->causedBy(auth()->user())
    ->withProperties(['changes' => $patch])
    ->log('Splátka upravena');
}`}
                  </pre>
                  <div className="fs-13"><strong>Override odchozího účtu:</strong> per splátka jiný účet než default (např. když jeden účet má nedostatek). Select v inline editu:</div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`<select wire:change="updateInstallment({{ $s->id }}, ['override_account_id' => $event.target.value])">
  <option value="">— Výchozí účet ({{ $order->account->name }}) —</option>
  @foreach($availableAccounts as $acc)
    <option value="{{ $acc->id }}" @selected($s->override_account_id === $acc->id)>
      {{ $acc->name }} — {{ $acc->balance_formatted }}
    </option>
  @endforeach
</select>`}
                  </pre>
                </div>
              </div>

              {/* CSS */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">CSS</h6>
                      <code className="fs-12 text-muted">resources/css/standing-orders.css</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`/* Type badge colors */
.tp-type-standard { background: #e3f2fd; color: #1976d2; }
.tp-type-leasing  { background: #fff3e0; color: #f57c00; }
.tp-type-zaloha   { background: #f3e5f5; color: #7b1fa2; }

/* Installment status */
.tp-splatka-zaplacena { background: #e8f5e9; color: #2e7d32; }
.tp-splatka-cekajici  { background: #fff8e1; color: #f57c00; }
.tp-splatka-zpozdeni  { background: #ffebee; color: #c62828; }

/* Side panel sticky */
.tp-side-panel {
  position: sticky;
  top: calc(var(--bs-topbar-height, 100px) + 16px);
  max-height: calc(100vh - var(--bs-topbar-height, 100px) - 32px);
  overflow-y: auto;
}`}
                  </pre>
                </div>
              </div>
            </>
          )}

          {/* Sekce: Úvěry — Připraveno k implementaci */}
          {aktivni === 'uvery' && (
            <>
              <div className="alert alert-success d-flex align-items-start gap-2 mb-3 fs-13">
                <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 18 }} />
                <div>
                  <strong>Připraveno k implementaci.</strong> UX schválené 22. 6. 2026 vč. nového rozpadu zaplaceno (jistina/úroky) pro majitele.
                  Eloquent modely + Livewire Volt komponenty níže. Pozor na 2 typy sazby (fix vs. PRIBOR+marže) a predikci finálních hodnot.
                </div>
              </div>

              {/* Datový model */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Datový model (Eloquent)</h6>
                      <code className="fs-12 text-muted">app/Models/Loan.php + LoanInstallment.php + LoanDocument.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <ul className="fs-13 mb-2" style={{ paddingLeft: 18 }}>
                    <li><code>loans</code> — id, name, type (enum: hypoteka/investicni/provozni/leasing_financni), bank, contract_number, account_id (FK <code>bank_accounts</code>), principal_initial, principal_remaining, rate_type (enum: fix/pribor), rate_pct (marže pro PRIBOR), pribor_pct (jen pro pribor), monthly_payment, period_count, period_paid, start_date, end_date, status (enum: aktivni/splacen/predcasne_splacen/pozastaven), expense_type (kancelar/provoz/sdileny), branch_id? (FK), note?</li>
                    <li><code>loan_installments</code> — id, loan_id (FK), sequence_number, due_date, vs, principal_amount, interest_amount, total_amount, principal_remaining_after, status (enum: planovana/odeslana/zaplacena/po_splatnosti/castecne_uhrazena), paid_amount? (pro částečnou), override_account_id? (FK)</li>
                    <li><code>loan_documents</code> — id, loan_id (FK), name, type (smlouva/dodatek/oznameni_sazby), uploaded_at, file_path</li>
                  </ul>
                  <div className="alert alert-info py-2 mb-0 fs-12">
                    <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                    <strong>fix vs. PRIBOR:</strong> pro fix se kalendář vygeneruje napevno při založení (anuita známá předem). Pro PRIBOR jsou hodnoty <em>predikované</em> a finalizují se po spárování platby v měsíci. Aktuální sazba = <code>rate_pct + (rate_type === 'pribor' ? pribor_pct : 0)</code>.
                  </div>
                </div>
              </div>

              {/* Hlavní view */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Hlavní view (Volt)</h6>
                      <code className="fs-12 text-muted">resources/views/livewire/loans/index.blade.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-2" style={{ overflow: 'auto' }}>
{`public function with(): array {
  $loans = Loan::query()
    ->when($this->search, fn($q) => $q->where(function($q) {
      $q->where('name', 'like', "%{$this->search}%")
        ->orWhere('bank', 'like', "%{$this->search}%")
        ->orWhere('contract_number', 'like', "%{$this->search}%");
    }))
    ->when($this->typeFilter, fn($q) => $q->where('type', $this->typeFilter))
    ->when($this->rateFilter, fn($q) => $q->where('rate_type', $this->rateFilter))
    ->when($this->statusFilter, fn($q) => $q->where('status', $this->statusFilter))
    ->when($this->nonStandardOnly, fn($q) => $q->whereHas('installments',
        fn($q) => $q->whereIn('status', ['po_splatnosti', 'castecne_uhrazena'])))
    ->with(['installments' => fn($q) => $q->orderBy('sequence_number')])
    ->orderBy('end_date')
    ->get();

  return compact('loans');
}`}
                  </pre>
                </div>
              </div>

              {/* KPI strip */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">KPI strip</h6>
                      <code className="fs-12 text-muted">computed properties + Cache::remember</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-2" style={{ overflow: 'auto' }}>
{`#[Computed]
public function totalDebt(): int {
  return Cache::remember('loans:total-debt', 300,
    fn() => Loan::where('status', 'aktivni')->sum('principal_remaining'));
}

#[Computed]
public function monthlyPayments(): int {
  return Cache::remember('loans:monthly-payments', 300,
    fn() => Loan::where('status', 'aktivni')->sum('monthly_payment'));
}

#[Computed]
public function nonStandardInstallmentsCount(): int {
  return LoanInstallment::whereIn('status', ['po_splatnosti', 'castecne_uhrazena'])
    ->whereHas('loan', fn($q) => $q->where('status', 'aktivni'))
    ->count();
}`}
                  </pre>
                </div>
              </div>

              {/* Anuitní kalkulačka */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Anuitní kalkulačka (form modal + live preview)</h6>
                      <code className="fs-12 text-muted">resources/views/livewire/loans/form.blade.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <div className="fs-13 mb-2">Anuita: <code>splatka = J × (i/12) × (1 + i/12)^n / ((1 + i/12)^n − 1)</code>, kde J = jistina, i = roční sazba, n = počet splátek.</div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`#[Computed]
public function previewInstallments(): array {
  if (!$this->principalInitial || !$this->periodCount) return [];

  $rate = $this->rateType === 'pribor'
    ? ($this->priborPct ?? 0) + $this->ratePct
    : $this->ratePct;

  $j = (float) $this->principalInitial;
  $i = $rate / 100 / 12;  // měsíční sazba
  $n = (int) $this->periodCount;

  // Anuita
  $monthly = $j * $i * pow(1 + $i, $n) / (pow(1 + $i, $n) - 1);

  $items = [];
  $remaining = $j;
  $date = Carbon::parse($this->startDate);

  for ($s = 1; $s <= $n; $s++) {
    $interest = $remaining * $i;
    $principal = $monthly - $interest;
    $remaining -= $principal;
    $items[] = [
      'sequence_number' => $s,
      'due_date' => $date->copy()->addMonths($s - 1)->toDateString(),
      'vs' => str_pad($s, 6, '0', STR_PAD_LEFT),
      'principal_amount' => round($principal),
      'interest_amount' => round($interest),
      'total_amount' => round($monthly),
      'principal_remaining_after' => round($remaining),
      'status' => 'planovana',
    ];
  }
  return $items;
}`}
                  </pre>
                </div>
              </div>

              {/* Side panel + rozpad pro majitele */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Side panel + rozpad zaplaceného (jistina vs. úroky)</h6>
                      <code className="fs-12 text-muted">resources/views/livewire/loans/side-panel.blade.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <div className="alert alert-info py-2 mb-2 fs-12">
                    <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                    <strong>Phase 8.8 (zápis 22. 6. 2026):</strong> pod progress barem 2 mini karty pro majitele —
                    kolik už bylo zaplaceno na jistině a kolik na úrocích (z plně/částečně uhrazených splátek).
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-2" style={{ overflow: 'auto' }}>
{`#[Computed]
public function paidPrincipal(): int {
  return $this->loan->installments
    ->whereIn('status', ['zaplacena', 'castecne_uhrazena'])
    ->sum('principal_amount');
}

#[Computed]
public function paidInterest(): int {
  return $this->loan->installments
    ->whereIn('status', ['zaplacena', 'castecne_uhrazena'])
    ->sum('interest_amount');
}

#[Computed]
public function paidPercentage(): float {
  return ($this->loan->principal_initial - $this->loan->principal_remaining)
    / $this->loan->principal_initial * 100;
}`}
                  </pre>
                  <div className="fs-13 mb-1"><strong>Blade — 2 mini karty:</strong></div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`@php
  $total = $this->paidPrincipal + $this->paidInterest;
  $jistinaPct = $total > 0 ? $this->paidPrincipal / $total * 100 : 0;
  $urokyPct = $total > 0 ? $this->paidInterest / $total * 100 : 0;
@endphp

<div class="mt-3 pt-3 border-top">
  <div class="text-uppercase text-muted fw-semibold mb-2"
       style="font-size: 10px; letter-spacing: 0.4px;">
    Z toho už splaceno
  </div>
  <div class="d-flex flex-column gap-2">
    {{-- Jistina --}}
    <div class="d-flex align-items-center gap-2 p-2 rounded"
         style="background: #fff; border: 1px solid #e9ecef;
                border-left: 3px solid #198754;">
      <div class="d-flex align-items-center justify-content-center rounded-circle"
           style="width: 32px; height: 32px;
                  background: rgba(25, 135, 84, 0.12);">
        <i class="solar:wallet-money-bold-duotone"
           style="font-size: 16px; color: #198754;"></i>
      </div>
      <div class="flex-grow-1">
        <div class="fw-semibold" style="font-size: 12px;">Jistina</div>
        <div class="text-muted czk-num" style="font-size: 10px;">
          {{ number_format($jistinaPct, 0) }} % ze zaplacených splátek
        </div>
      </div>
      <div class="fw-bold czk-num text-success"
           style="font-size: 14px; white-space: nowrap;">
        {{ formatMoney($this->paidPrincipal, false) }}
      </div>
    </div>
    {{-- Úroky --}}
    <div class="d-flex align-items-center gap-2 p-2 rounded"
         style="background: #fff; border: 1px solid #e9ecef;
                border-left: 3px solid #fd7e14;">
      <div class="d-flex align-items-center justify-content-center rounded-circle"
           style="width: 32px; height: 32px;
                  background: rgba(253, 126, 20, 0.12);">
        <i class="solar:graph-down-bold-duotone"
           style="font-size: 16px; color: #fd7e14;"></i>
      </div>
      <div class="flex-grow-1">
        <div class="fw-semibold" style="font-size: 12px;">Úroky</div>
        <div class="text-muted czk-num" style="font-size: 10px;">
          {{ number_format($urokyPct, 0) }} % ze zaplacených splátek
        </div>
      </div>
      <div class="fw-bold czk-num" style="font-size: 14px;
                                          white-space: nowrap; color: #fd7e14;">
        {{ formatMoney($this->paidInterest, false) }}
      </div>
    </div>
  </div>
</div>`}
                  </pre>
                </div>
              </div>

              {/* Inline edit splátky + Mimořádná splátka + Předčasné splacení */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Inline edit + Mimořádná splátka + Předčasné splacení</h6>
                      <code className="fs-12 text-muted">Volt actions</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`public function updateInstallment(int $installmentId, array $patch): void {
  $i = LoanInstallment::findOrFail($installmentId);
  $this->authorize('update', $i->loan);
  $i->update($patch);
  activity()->performedOn($i)->log('Splátka upravena');
}

public function addExtraInstallment(int $loanId, array $data): void {
  $loan = Loan::findOrFail($loanId);
  $this->authorize('update', $loan);

  $newRemaining = $loan->principal_remaining - $data['principal_amount'];
  $loan->installments()->create([
    'sequence_number' => $loan->installments()->max('sequence_number') + 1,
    'due_date' => $data['due_date'],
    'vs' => 'EXTRA-' . str_pad(now()->timestamp % 1000000, 6, '0', STR_PAD_LEFT),
    'principal_amount' => $data['principal_amount'],
    'interest_amount' => $data['interest_amount'] ?? 0,
    'total_amount' => $data['principal_amount'] + ($data['interest_amount'] ?? 0),
    'principal_remaining_after' => $newRemaining,
    'status' => 'zaplacena',
  ]);
  $loan->update(['principal_remaining' => $newRemaining]);
}

public function payOffEarly(int $loanId): void {
  $loan = Loan::findOrFail($loanId);
  $this->authorize('update', $loan);

  $loan->installments()->create([
    'sequence_number' => $loan->installments()->max('sequence_number') + 1,
    'due_date' => today()->toDateString(),
    'vs' => 'PAYOFF-' . $loan->id,
    'principal_amount' => $loan->principal_remaining,
    'interest_amount' => 0,
    'total_amount' => $loan->principal_remaining,
    'principal_remaining_after' => 0,
    'status' => 'zaplacena',
  ]);
  $loan->update([
    'principal_remaining' => 0,
    'status' => 'predcasne_splacen',
  ]);
}`}
                  </pre>
                </div>
              </div>
            </>
          )}

          {/* Sekce: Poplatky — Připraveno k implementaci */}
          {aktivni === 'poplatky' && (
            <>
              <div className="alert alert-success d-flex align-items-start gap-2 mb-3 fs-13">
                <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 18 }} />
                <div>
                  <strong>Připraveno k implementaci.</strong> UX schválené 22. 6. 2026 vč. odstranění CTA „Nový poplatek".
                  <br /><strong>Důležité:</strong> Poplatky jsou <em>read-only z pohledu vstupu</em> — vznikají výhradně automaticky
                  v Banka modulu (přes <code>BankTransactionClassifier</code>) nebo manuálním označením v Banka side-panelu.
                </div>
              </div>

              {/* Datový model */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Datový model (Eloquent)</h6>
                      <code className="fs-12 text-muted">app/Models/BankFee.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <ul className="fs-13 mb-2" style={{ paddingLeft: 18 }}>
                    <li><code>bank_fees</code> — id, type (enum: 9 typů — account_management/transaction/card/withdrawal/deposit/debt_interest/service/sanction/other), date, description, account_id (FK <code>bank_accounts</code>), branch_id? (FK, volitelný — chybí = celofiremní), amount, source_transaction_id? (FK <code>bank_transactions</code> — odkaz na bankovní transakci, ze které poplatek vznikl), created_via (enum: auto_classified/manual_marked/edit)</li>
                  </ul>
                  <div className="alert alert-info py-2 mb-0 fs-12">
                    <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                    <strong>9 typů poplatků</strong> jako PHP enum: vedení účtu / transakce / karta / výběr / vklad / úrok z debetu / služby / sankce / jiné. Každý má vlastní barvu, ikonu (Solar) a label v <code>config/bank-fees.php</code>.
                  </div>
                </div>
              </div>

              {/* Auto-evidence z Banky */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Vstup výhradně z Banky (auto + manual)</h6>
                      <code className="fs-12 text-muted">app/Services/BankFeeFactory.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-2" style={{ overflow: 'auto' }}>
{`class BankFeeFactory {
  /** Z auto-klasifikace v BankTransactionClassifier (přijatý návrh systému) */
  public function fromClassification(BankTransaction $t, array $classification): BankFee {
    return BankFee::create([
      'type' => $this->mapClassificationToType($classification['type']),
      'date' => $t->date,
      'description' => $t->counterparty . ($t->note ? ' — ' . $t->note : ''),
      'account_id' => $t->account_id,
      'branch_id' => $t->account->branch_ids[0] ?? null,  // first branch
      'amount' => abs($t->amount),
      'source_transaction_id' => $t->id,
      'created_via' => 'auto_classified',
    ]);
  }

  /** Manuální označení uživatelem v Banka side-panelu */
  public function fromManualMark(BankTransaction $t, string $reason): BankFee {
    return BankFee::create([
      'type' => $this->mapReasonToType($reason),
      'date' => $t->date,
      'description' => $t->counterparty,
      'account_id' => $t->account_id,
      'branch_id' => $t->account->branch_ids[0] ?? null,
      'amount' => abs($t->amount),
      'source_transaction_id' => $t->id,
      'created_via' => 'manual_marked',
    ]);
  }

  private function mapClassificationToType(string $classification): string {
    return match($classification) {
      'Bankovní poplatek' => 'account_management',
      'Úrok z účtu'       => 'debt_interest',
      'Sankce / penále'   => 'sanction',
      default             => 'other',
    };
  }
}`}
                  </pre>
                  <div className="alert alert-warning py-2 mb-0 fs-12">
                    <iconify-icon icon="solar:danger-triangle-bold-duotone" className="me-1" />
                    V PoplatkyView (Volt) <strong>NENÍ tlačítko „Nový poplatek"</strong>. Pouze edit existujících. Vstup výhradně přes <code>BankFeeFactory</code> z Banky.
                  </div>
                </div>
              </div>

              {/* Hlavní view */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">Hlavní view (Volt)</h6>
                      <code className="fs-12 text-muted">resources/views/livewire/fees/index.blade.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-2" style={{ overflow: 'auto' }}>
{`public function with(): array {
  $branchId = auth()->user()->activeBranch()?->id;

  $fees = BankFee::query()
    ->when($branchId !== mainBranchGet(),
      fn($q) => $q->where('branch_id', $branchId)->orWhereNull('branch_id'))
    ->when($this->search, fn($q) => $q->where('description', 'like', "%{$this->search}%"))
    ->when($this->typeFilter, fn($q) => $q->where('type', $this->typeFilter))
    ->when($this->accountFilter, fn($q) => $q->where('account_id', $this->accountFilter))
    ->when($this->monthFilter, fn($q) => $q->where('date', 'like', "{$this->monthFilter}%"))
    ->orderBy('date', 'desc')
    ->get();

  return compact('fees');
}`}
                  </pre>
                  <div className="fs-13"><strong>Filter chips a klikatelný breakdown:</strong></div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`<x-fee-type-breakdown :fees="$fees" :active-type="$typeFilter">
  {{-- Klik na segment / řádek → wire:click="setTypeFilter('account_management')" --}}
</x-fee-type-breakdown>

<x-fee-monthly-chips :fees="$fees" :active-month="$monthFilter">
  {{-- Chip per měsíc → wire:click="setMonthFilter('2026-04')" --}}
</x-fee-monthly-chips>`}
                  </pre>
                </div>
              </div>

              {/* KPI strip */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">KPI strip + breakdown</h6>
                      <code className="fs-12 text-muted">computed properties</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`#[Computed]
public function thisMonthSum(): int {
  return BankFee::whereYear('date', now()->year)
    ->whereMonth('date', now()->month)
    ->sum('amount');
}

#[Computed]
public function lastMonthSum(): int {
  return BankFee::whereYear('date', now()->subMonth()->year)
    ->whereMonth('date', now()->subMonth()->month)
    ->sum('amount');
}

#[Computed]
public function monthlyAverage(): int {
  return BankFee::whereYear('date', now()->year)
    ->selectRaw('SUM(amount) / 12 as avg')
    ->value('avg') ?? 0;
}

#[Computed]
public function breakdownByType(): array {
  $total = BankFee::sum('amount');
  return BankFee::selectRaw('type, SUM(amount) as sum, COUNT(*) as count')
    ->groupBy('type')
    ->orderByDesc('sum')
    ->get()
    ->map(fn($r) => [
      'type' => $r->type,
      'sum' => $r->sum,
      'count' => $r->count,
      'pct' => $total > 0 ? $r->sum / $total * 100 : 0,
    ])
    ->all();
}`}
                  </pre>
                </div>
              </div>

              {/* Edit modal */}
              <div className="card mb-3" style={{ borderLeft: '4px solid #198754' }}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="mb-1 fw-bold">FeeEditModal (jen edit existujících)</h6>
                      <code className="fs-12 text-muted">resources/views/livewire/fees/edit-modal.blade.php</code>
                    </div>
                    <KodStatusBadge status="hotovo" />
                  </div>
                  <pre className="bg-light p-2 rounded fs-12 mb-0" style={{ overflow: 'auto' }}>
{`public function save(): void {
  $fee = BankFee::findOrFail($this->feeId);
  $this->authorize('update', $fee);

  // Audit změny typu (klasifikace upravená uživatelem)
  if ($this->type !== $fee->type) {
    activity()->performedOn($fee)
      ->causedBy(auth()->user())
      ->withProperties(['from' => $fee->type, 'to' => $this->type])
      ->log('Změna typu poplatku');
  }

  $fee->update([
    'type' => $this->type,
    'description' => $this->description,
    'branch_id' => $this->branchId,
    'amount' => $this->amount,
  ]);

  $this->dispatch('fee-updated');
  $this->closeModal();
}

public function delete(): void {
  $fee = BankFee::findOrFail($this->feeId);
  $this->authorize('delete', $fee);
  $fee->delete();  // soft-delete v produkci
}`}
                  </pre>
                </div>
              </div>
            </>
          )}

          {/* Ostatní sekce — placeholder */}
          {aktivni !== 'trzby' && aktivni !== 'banka' && aktivni !== 'trvale-prikazy' && aktivni !== 'uvery' && aktivni !== 'poplatky' && (
            <div className="card">
              <div className="card-body text-center text-muted py-5">
                <iconify-icon icon="solar:clock-circle-bold-duotone" style={{ fontSize: 56, color: '#dee2e6' }} />
                <div className="mt-3 fs-15">Sekce čeká na rozpis kódu</div>
                <div className="fs-13 mt-1">
                  Volt / Blade / Alpine kód doplníme, jakmile budeme tuto sekci procházet v rámci feedback meetingu.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <_KodViewOriginalEnd />
    </>
  );
}

// Pomocná no-op komponenta — drží původní footer s poznámkami (nepoužívá se aktivně v nové struktuře,
// ale zachováváme ho jako referenci kdyby kodér chtěl). Skryto.
function _KodViewOriginalEnd() {
  return null;
}

