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
  return (
    <div className="card">
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

  // SVG dimensions
  const CW = 700, CH = 210, ML = 62, MT = 16, MR = 16, MB = 38;
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
    <div className="card">
      <div className="card-header" style={{ background: '#fff' }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <div>
            <h5 className="card-title mb-0">Vývoj tržeb</h5>
            <small className="text-muted fw-normal">Roční přehled · 2022–2026 · *duben 2026</small>
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
        <div style={{ position: 'relative', height: 230 }}>
          <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', height: '100%', display: 'block' }}>
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
//   - DailyClosingRow::SALES       — běžné tržby
//   - DailyClosingRow::SALE_MANUAL — manuálně dorovnané tržby
//
// Multi-tenancy: auth()->user()->activeBranch() + mainBranchGet()
//   - když user je na "main" pobočce → vidí všechny branches (multi-venue režim)
//   - jinak → vidí jen svou pobočku (single-venue režim)
//
// TODO (kodér):
//   - Kuchyň / Bar split — zatím jen sloupec "Celkem". Až bude rozlišení
//     v daily_closing_rows (např. další type_id konstanty), rozšířit single-venue mód.
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
                $this->branches = Branch::all();
            } else {
                $this->branches = Branch::where('id', $this->branch->id)->get();
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

        // Query: agregace daily_closing_rows.value GROUP BY branch + date
        $branchIds = $this->branches->pluck('id')->all();

        $salesRows = DailyClosingRow::query()
            ->selectRaw('
                daily_closings.branch_id,
                DATE(daily_closings.date) as closing_date,
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
                DailyClosingRow::SALE_MANUAL,
            ])
            ->groupBy(
                'daily_closings.branch_id',
                'closing_date'
            )
            ->get();

        $indexed = $salesRows->keyBy(function ($row) {
            return $row->branch_id . '_' . $row->closing_date;
        });

        // Sestavení datové struktury per branch
        $data = [];
        foreach ($this->branches as $branch) {
            $value = [
                'id'    => $branch->id,
                'name'  => $branch->name,
                'color' => $branch->color,
                'data'  => [],
                'sum'   => 0,
            ];

            foreach ($days as $dateKey => $_day) {
                $indexKey = $branch->id . '_' . $dateKey;
                $sales = isset($indexed[$indexKey])
                    ? (float) $indexed[$indexKey]->sales
                    : null;

                $value['data'][$dateKey] = $sales;

                if ($sales !== null) {
                    $value['sum'] += $sales;
                    $days[$dateKey]['sum'] += $sales;
                }
            }
            $data[] = $value;
        }

        $fullSum = array_sum(array_column($data, 'sum'));

        $this->data       = $data;
        $this->days       = $days;
        $this->singleData = ['fullSum' => $fullSum];
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

<div class="card mb-4">
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
// OTÁZKY PRO KODÉRA (otevřené):
//   1) Historické agregace — pro roční přehled (2006–2026) se každé zobrazení
//      počítá z daily_closings. Při větších datech (10+ let × 15 provozoven)
//      by mohla být dobrá monthly_summaries / branch_yearly_revenue tabulka.
//      Existuje něco takového? Jinak by se mělo nacacheovat (Cache::remember).
//
//   2) Rok vzniku provozovny — pro filtr "od roku X" (linie začínají od založení).
//      Existuje v branches sloupec opened_at / founded_year?
//      Pokud ne, MIN(daily_closings.date) per branch by mohl být fallback.

use Livewire\\Volt\\Component;
use Livewire\\Attributes\\Defer;

use App\\Models\\Branch;
use App\\Models\\DailyClosingRow;

use Carbon\\Carbon;

new #[Defer] class extends Component
{
    public string $mode    = 'roky';              // roky | rok-mesice | mesic-roky
    public string $period  = 'vse';               // 3 | 5 | 10 | vse (jen pro mode='roky')
    public int    $year    = 2025;                // pro mode='rok-mesice'
    public int    $month   = 1;                   // pro mode='mesic-roky' (1-12)
    public array  $selectedBranchIds = [];        // multi-select branches v grafu

    public $branches;

    public const MONTH_LABELS = ['Led','Únor','Bře','Dub','Kvě','Čer','Čec','Srp','Zář','Říj','Lis','Pro'];
    public const MONTH_FULL   = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];

    // SVG dimensions
    public const CW = 700; public const CH = 210;
    public const ML = 62;  public const MT = 16;
    public const MR = 16;  public const MB = 38;

    public function mount(): void
    {
        $branch = auth()->user()->activeBranch();
        if (!$branch) return;

        if ($branch->id == mainBranchGet()) {
            $this->branches = Branch::all();
        } else {
            $this->branches = Branch::where('id', $branch->id)->get();
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
        return match ($this->period) {
            '3'   => 2024, '5' => 2022, '10' => 2017, 'vse' => 2006,
            default => 2006,
        };
    }

    public function xLabels(): array
    {
        return match ($this->mode) {
            'roky'       => array_map('strval', range($this->fromYear(), now()->year)),
            'rok-mesice' => self::MONTH_LABELS,
            'mesic-roky' => array_map('strval', range($this->fromYear(), now()->year)),
        };
    }

    // ── Hlavní query ─────────────────────────────────────────────
    // Vrací: array indexed by [branchId][xLabel] => suma tržeb
    // TODO: pro větší rozsahy zvážit cache nebo monthly_summaries tabulku
    public function loadChartData(): array
    {
        $branchIds = $this->selectedBranchIds;
        if (empty($branchIds)) return [];

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
    }

    // SVG chart payload (rendrované server-side, hover ovládá Alpine.js)
    public function chart(): array
    {
        $IW = self::CW - self::ML - self::MR;
        $IH = self::CH - self::MT - self::MB;

        $xLabels  = $this->xLabels();
        $N        = count($xLabels);
        $branches = $this->selectedBranches();
        $indexed  = $this->loadChartData();

        // Sestav data per branch per x-bod
        $dataPerBranch = [];
        foreach ($branches as $b) {
            $vals = [];
            foreach ($xLabels as $i => $label) {
                $periodKey = $this->mode === 'rok-mesice' ? ($i + 1) : (int) $label;
                $vals[] = $indexed[$b->id][$periodKey] ?? 0;
            }
            $dataPerBranch[] = ['branch' => $b, 'vals' => $vals];
        }

        $allVals = [];
        foreach ($dataPerBranch as $d) foreach ($d['vals'] as $v) if ($v > 0) $allVals[] = $v;
        $maxVal = !empty($allVals) ? max($allVals) : 1;
        $yMax = (int) (ceil($maxVal / 1_000_000) * 1_000_000) ?: (int) (ceil($maxVal / 100_000) * 100_000);

        $xPx = fn (int $i) => $N > 1 ? self::ML + ($i / ($N - 1)) * $IW : self::ML + $IW / 2;
        $yPx = fn (float $v) => self::MT + $IH - ($v / $yMax) * $IH;

        $lines = [];
        foreach ($dataPerBranch as $d) {
            $pts = [];
            foreach ($d['vals'] as $i => $v) {
                $pts[] = ['x' => $xPx($i), 'y' => $yPx(max($v, 0)), 'v' => $v, 'has' => $v > 0];
            }
            $nonZero = array_values(array_filter($pts, fn ($p) => $p['has']));
            $areaPath = '';
            if (count($nonZero) > 1) {
                $smooth = $this->smoothPath($nonZero);
                $last = end($nonZero); $first = reset($nonZero);
                $baseLine = self::MT + $IH;
                $areaPath = "{$smooth} L {$last['x']},{$baseLine} L {$first['x']},{$baseLine} Z";
            }
            $lines[] = [
                'branch'   => $d['branch'],
                'pts'      => $pts,
                'linePath' => $this->smoothPath($pts),
                'areaPath' => $areaPath,
            ];
        }

        $xCoords = array_map(fn ($i) => $xPx($i), array_keys($xLabels));

        return [
            'IW' => $IW, 'IH' => $IH, 'N' => $N, 'yMax' => $yMax,
            'xLabels'  => $xLabels,
            'gridVals' => [$yMax * 0.25, $yMax * 0.5, $yMax * 0.75, $yMax],
            'lines'    => $lines,
            'xCoords'  => $xCoords,
            'xHalf'    => $N > 1 ? ($IW / ($N - 1)) / 2 : $IW / 2,
        ];
    }

    // Smooth SVG path (Catmull-Rom přes cubic bezier)
    public function smoothPath(array $pts): string
    {
        $n = count($pts);
        if ($n < 2) return '';
        $t = 0.25;
        $d = sprintf('M %s,%s', $pts[0]['x'], $pts[0]['y']);
        for ($i = 0; $i < $n - 1; $i++) {
            $p0 = $pts[max(0, $i - 1)];
            $p1 = $pts[$i];
            $p2 = $pts[$i + 1];
            $p3 = $pts[min($n - 1, $i + 2)];
            $cp1x = $p1['x'] + ($p2['x'] - $p0['x']) * $t;
            $cp1y = $p1['y'] + ($p2['y'] - $p0['y']) * $t;
            $cp2x = $p2['x'] - ($p3['x'] - $p1['x']) * $t;
            $cp2y = $p2['y'] - ($p3['y'] - $p1['y']) * $t;
            $d .= sprintf(' C %.1f,%.1f %.1f,%.1f %s,%s',
                $cp1x, $cp1y, $cp2x, $cp2y, $p2['x'], $p2['y']);
        }
        return $d;
    }

    public function fmtY(float $v): string
    {
        return $v >= 1_000_000
            ? sprintf('%.1fM', $v / 1_000_000)
            : sprintf('%dk', (int) round($v / 1_000));
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
    $chart = $this->chart();
    $branches = $this->branches;
    $selected = $this->selectedBranches();
@endphp

<div class="card mb-3"
     x-data="vyvojChart({
         xCoords: {{ json_encode($chart['xCoords']) }},
         xLabels: {{ json_encode($chart['xLabels']) }},
         lines:   {{ json_encode(array_map(fn ($l) => [
                        'id'    => $l['branch']->id,
                        'name'  => $l['branch']->name,
                        'color' => $l['branch']->color,
                        'vals'  => array_column($l['pts'], 'v'),
                    ], $chart['lines'])) }},
         mode:  '{{ $this->mode }}',
         year:  {{ $this->year }},
         month: {{ $this->month }},
         ml:    {{ \\App\\Livewire\\VyvojTrzeb::ML ?? 62 }},
         iw:    {{ $chart['IW'] }},
         N:     {{ $chart['N'] }},
     })">
    <div class="card-header trzby-detail-header-sticky">
        {{-- Řádek 1: nadpis + mode switcher --}}
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <div>
                <h4 class="card-title mb-0">Vývoj tržeb</h4>
                <small class="text-muted fw-normal">
                    @if($this->mode === 'roky')
                        Roční přehled · {{ $this->fromYear() }}–{{ now()->year }}
                    @elseif($this->mode === 'rok-mesice')
                        Měsíční přehled · rok {{ $this->year }}
                    @else
                        {{ self::MONTH_FULL[$this->month - 1] }} · {{ $this->fromYear() }}–{{ now()->year }}
                    @endif
                </small>
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

    <div class="card-body pb-2">
        <div class="spinner-border text-primary" role="status" wire:loading wire:target="setMode,setPeriod,year,month,toggleBranch">
            <span class="visually-hidden">Loading...</span>
        </div>

        @if($selected->isEmpty())
            <div style="height:230px;display:flex;align-items:center;justify-content:center" class="text-muted">
                Vyberte alespoň jeden podnik pomocí tlačítek výše.
            </div>
        @else
            <div style="position:relative;height:230px" wire:loading.remove>
                <svg viewBox="0 0 {{ self::CW }} {{ self::CH }}" style="width:100%;height:100%;display:block">
                    {{-- Grid + osy --}}
                    @foreach($chart['gridVals'] as $gv)
                        @php $yp = self::MT + $chart['IH'] - ($gv / $chart['yMax']) * $chart['IH']; @endphp
                        <line x1="{{ self::ML }}" y1="{{ $yp }}" x2="{{ self::CW - self::MR }}" y2="{{ $yp }}"
                              stroke="#eaedf1" stroke-width="1" stroke-dasharray="4 3"/>
                        <text x="{{ self::ML - 6 }}" y="{{ $yp + 4 }}" text-anchor="end" font-size="9" fill="#9097a7">
                            {{ $this->fmtY($gv) }}
                        </text>
                    @endforeach
                    <line x1="{{ self::ML }}" y1="{{ self::MT + $chart['IH'] }}"
                          x2="{{ self::CW - self::MR }}" y2="{{ self::MT + $chart['IH'] }}"
                          stroke="#eaedf1" stroke-width="1"/>

                    {{-- Linie per branch --}}
                    @foreach($chart['lines'] as $line)
                        <g>
                            @if($line['areaPath'])
                                <path d="{{ $line['areaPath'] }}" fill="{{ $line['branch']->color }}" fill-opacity="0.07"/>
                            @endif
                            <path d="{{ $line['linePath'] }}" fill="none"
                                  stroke="{{ $line['branch']->color }}" stroke-width="2.2" opacity="0.9"/>
                            @foreach($line['pts'] as $i => $pt)
                                @if($pt['has'])
                                    <circle cx="{{ $pt['x'] }}" cy="{{ $pt['y'] }}"
                                            :r="tooltipIdx === {{ $i }} ? 5.5 : 3.5"
                                            fill="{{ $line['branch']->color }}" stroke="white" stroke-width="1.5"
                                            style="transition:r 0.1s"/>
                                @endif
                            @endforeach
                        </g>
                    @endforeach

                    {{-- Hover zóny --}}
                    @foreach($chart['xLabels'] as $i => $lbl)
                        @php
                            $x = $chart['xCoords'][$i];
                            $w = $chart['N'] > 1 ? $chart['IW'] / ($chart['N'] - 1) : $chart['IW'];
                        @endphp
                        <rect x="{{ $x - $chart['xHalf'] }}" y="{{ self::MT }}"
                              width="{{ $w }}" height="{{ $chart['IH'] }}"
                              fill="transparent" style="cursor:crosshair"
                              @mouseenter="tooltipIdx = {{ $i }}"
                              @mouseleave="tooltipIdx = null"/>
                    @endforeach

                    {{-- Vertikální linka --}}
                    <line x-show="tooltipIdx !== null"
                          :x1="xCoords[tooltipIdx]" y1="{{ self::MT }}"
                          :x2="xCoords[tooltipIdx]" y2="{{ self::MT + $chart['IH'] }}"
                          stroke="#64748b" stroke-width="1" stroke-dasharray="3 2" opacity="0.4"/>

                    {{-- X popisky --}}
                    @foreach($chart['xLabels'] as $i => $lbl)
                        <text x="{{ $chart['xCoords'][$i] }}" y="{{ self::MT + $chart['IH'] + 22 }}"
                              text-anchor="middle" font-size="9"
                              :fill="tooltipIdx === {{ $i }} ? '#313b5e' : '#9097a7'"
                              :font-weight="tooltipIdx === {{ $i }} ? '700' : '400'">
                            {{ $lbl }}
                        </text>
                    @endforeach
                </svg>

                {{-- Tooltip — řízeno Alpine.js --}}
                <div x-show="tooltipIdx !== null"
                     :style="tooltipStyle"
                     x-html="tooltipHtml"
                     style="position:absolute;top:0;background:#313b5e;color:white;border-radius:8px;padding:9px 13px;font-size:11px;pointer-events:none;z-index:10;min-width:190px;box-shadow:0 4px 20px rgba(0,0,0,0.2)">
                </div>
            </div>
        @endif
    </div>
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
// Alpine.js komponent pro hover tooltip v grafu vývoje tržeb.
// Načti přes \`Alpine.data('vyvojChart', ...)\` v app.js.

window.fCzk = function (n) {
    const sign = n < 0 ? '-' : '';
    const abs  = Math.abs(n);
    const s    = String(abs).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '\\u202F');
    return sign + s + '\\u202FKč';
};

window.vyvojChart = function (config) {
    return {
        tooltipIdx: null,
        xCoords:    config.xCoords,
        data:       config.data,
        provs:      config.provs,
        xLabels:    config.xLabels,
        monthLabels: config.monthLabels,
        mode:       config.mode,
        year:       config.year,
        month:      config.month,
        ml:         config.ml,
        iw:         config.iw,
        N:          config.N,

        // Pozice tooltipu (clamp dle šířky containeru)
        get tooltipStyle() {
            if (this.tooltipIdx === null) return '';
            const x   = this.xCoords[this.tooltipIdx];
            const pct = ((x - this.ml) / this.iw) * 100;
            return \`left: clamp(10px, \${pct}%, calc(100% - 220px))\`;
        },

        // HTML obsah tooltipu
        get tooltipHtml() {
            if (this.tooltipIdx === null) return '';
            const idx = this.tooltipIdx;

            // Hlavička (datum / měsíc / rok)
            let title;
            if (this.mode === 'rok-mesice') {
                title = \`\${this.monthLabels[idx]} \${this.year}\`;
            } else if (this.mode === 'mesic-roky') {
                title = \`\${this.monthLabels[this.month - 1]} \${this.xLabels[idx]}\`;
            } else {
                const suffix = idx === this.N - 1 ? ' *' : '';
                title = \`\${this.xLabels[idx]}\${suffix}\`;
            }

            // Řádky per provozovna (jen ne-nulové)
            const rows = this.provs.map((prov, pi) => {
                const v = this.data[pi][idx];
                if (v <= 0) return '';
                return \`<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:2px">
                    <span style="color:\${prov.color}">\${prov.shortName}</span>
                    <span style="font-weight:600">\${window.fCzk(v)}</span>
                </div>\`;
            }).filter(Boolean).join('');

            if (!rows) return '';
            return \`<div style="font-weight:700;margin-bottom:6px;font-size:12px">\${title}</div>\${rows}\`;
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
    {{-- Alpine.js komponent pro tooltip v grafu --}}
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
    description: 'Anonymní třída + Blade v jednom souboru. Eloquent query přes Branch + DailyClosingRow. Inspirováno kodérovou sales-sum.blade.php.',
    files: [
      { path: 'resources/views/livewire/trzby-detail.blade.php', lang: 'blade', code: CODE_TRZBY_DETAIL_VOLT },
    ],
  },
  {
    id: 'vyvoj-trzeb-volt',
    title: '2 — Vývoj tržeb: Volt single-file komponenta',
    description: 'SVG graf rendrovaný server-side + Alpine.js tooltip. Eloquent agregace po měsících/letech. 3 módy: Roky / Rok › měsíce / Měsíc › roky.',
    files: [
      { path: 'resources/views/livewire/vyvoj-trzeb.blade.php', lang: 'blade', code: CODE_VYVOJ_TRZEB_VOLT },
      { path: 'resources/js/vyvoj-chart.js',                    lang: 'js',    code: CODE_ALPINE_JS },
    ],
  },
  {
    id: 'css',
    title: '3 — CSS (sdílené pro obě sekce)',
    description: 'Plain CSS: sticky sloupce, live tečka pulzace, segment buttons, toggle tlačítka v grafu.',
    files: [
      { path: 'resources/css/trzby.css', lang: 'css', code: CODE_CSS },
    ],
  },
  {
    id: 'integration',
    title: '4 — Routing a layout (jak to zapojit)',
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

export default function KodView() {
  const [openId,   setOpenId]   = useState<string | null>(null);
  const [copiedAt, setCopiedAt] = useState<string | null>(null);

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

  return (
    <>
      {/* Header */}
      <div className="page-title-box">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div>
            <h4 className="mb-1">Kód pro backend implementaci</h4>
            <div className="text-muted fs-13">
              Podklady pro kodéra — segmenty <strong>Tržby detail</strong> a <strong>Vývoj tržeb</strong> napojené na reálná Eloquent data (Branch + DailyClosingRow) v Livewire Volt
            </div>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <span className="badge bg-primary-subtle text-primary">PHP 8.2+</span>
            <span className="badge bg-info-subtle text-info">Laravel 11+</span>
            <span className="badge bg-success-subtle text-success">Livewire Volt</span>
            <span className="badge bg-warning-subtle text-warning">Alpine.js 3</span>
            <span className="badge bg-secondary-subtle text-secondary">Eloquent · plain JS + CSS</span>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="alert alert-info d-flex align-items-start gap-2 mb-3">
        <iconify-icon icon="solar:info-circle-bold-duotone" className="fs-5 flex-shrink-0" />
        <div className="fs-13">
          <strong>Cíl:</strong> zachovat 1:1 vizuál Tržby (sekce „Vývoj tržeb" a „Tržby detail") z aktuálního React/TS prototypu.
          <br />
          <strong>Stack:</strong> Laravel 11+ s <strong>Livewire Volt</strong> (single-file komponenty s anonymní třídou + Blade v jednom souboru),
          Alpine.js 3 (klientská interaktivita — tooltip), plain CSS, plain JS.
          <br />
          <strong>Reálná data:</strong> všechny query přes Eloquent — <code className="bg-light px-1 rounded">Branch</code> a <code className="bg-light px-1 rounded">DailyClosingRow</code>.
          Tržba = <code className="bg-light px-1 rounded">SUM(value)</code> pro <code>type_id IN [SALES, SALE_MANUAL]</code>.
          Multi-tenancy přes <code>auth()-&gt;user()-&gt;activeBranch()</code> + <code>mainBranchGet()</code>.
          <br />
          <strong>Styl podle vzoru:</strong> inspirováno kodérovým <code>sales-sum.blade.php</code> — <code>#[Defer]</code> lazy loading,
          <code>@placeholder</code> UI, <code>formatMoney($n, false)</code> helper, <code>&lt;x-input&gt;</code> Blade komponenty.
        </div>
      </div>

      {/* TODO/Otázky banner */}
      <div className="alert alert-warning d-flex align-items-start gap-2 mb-4">
        <iconify-icon icon="solar:question-circle-bold-duotone" className="fs-5 flex-shrink-0" />
        <div className="fs-13">
          <strong>Otevřené otázky pro kodéra (vyznačeno TODO komentáři v kódu):</strong>
          <ol className="mb-0 mt-1" style={{ paddingLeft: 18 }}>
            <li><strong>Kuchyň/Bar split</strong> — single-venue mód v „Tržby detail" zatím zobrazuje jen sloupec „Celkem". Existují konstanty jako <code>DailyClosingRow::SALES_KITCHEN</code> / <code>SALES_BAR</code>? Pokud ano, rozšíříme.</li>
            <li><strong>Historické agregace (Vývoj tržeb)</strong> — pro 10+ let × 15 provozoven je každé renderování přes <code>daily_closings</code> drahé. Existuje aggregate tabulka (<code>monthly_summaries</code> / <code>branch_yearly_revenue</code>)? Jinak doporučuji <code>Cache::remember(...)</code>.</li>
            <li><strong>Rok vzniku provozovny</strong> — pro „Vše" period filter potřebujeme nejstarší rok mezi vybranými branches. Existuje <code>branches.opened_at</code> / <code>founded_year</code>? Fallback = <code>MIN(daily_closings.date)</code>.</li>
          </ol>
        </div>
      </div>

      {/* Skupina 1 — Tržby detail */}
      <section className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-2">
          <iconify-icon icon="solar:table-bold-duotone" style={{ fontSize: 20, color: 'var(--prov-color, #c9911a)' }} />
          <h4 className="mb-0">Tržby detail</h4>
          <span className="text-muted fs-12 ms-2">Tabulka tržeb za období + přednastavené filtry</span>
        </div>

        {/* Náhled — jak má výstup vypadat */}
        <div className="mb-3 p-3 rounded" style={{ background: 'rgba(13, 202, 240, 0.06)', border: '1px solid rgba(13, 202, 240, 0.25)' }}>
          <div className="d-flex align-items-center gap-2 mb-3">
            <iconify-icon icon="solar:eye-bold-duotone" style={{ fontSize: 16, color: '#0dcaf0' }} />
            <strong className="fs-13" style={{ color: '#0dcaf0' }}>Náhled — jak má výstup z Laravelu vypadat</strong>
            <span className="text-muted fs-11 ms-auto fst-italic">Plně funkční verze v sekci „Tržby" v levém menu</span>
          </div>
          <TrzbyDetailPreview />
        </div>

        {/* Kód — accordion */}
        <div className="d-flex flex-column gap-2">
          {ACCORDION.filter(s => s.id.startsWith('trzby-detail')).map((sec) => renderAccordionItem(sec, openId, toggle, copiedAt, copyCode))}
        </div>
      </section>

      {/* Skupina 2 — Vývoj tržeb */}
      <section className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-2">
          <iconify-icon icon="solar:graph-up-bold-duotone" style={{ fontSize: 20, color: 'var(--prov-color, #c9911a)' }} />
          <h4 className="mb-0">Vývoj tržeb</h4>
          <span className="text-muted fs-12 ms-2">Multi-line SVG graf + tabulka po rocích/měsících</span>
        </div>

        <div className="mb-3 p-3 rounded" style={{ background: 'rgba(13, 202, 240, 0.06)', border: '1px solid rgba(13, 202, 240, 0.25)' }}>
          <div className="d-flex align-items-center gap-2 mb-3">
            <iconify-icon icon="solar:eye-bold-duotone" style={{ fontSize: 16, color: '#0dcaf0' }} />
            <strong className="fs-13" style={{ color: '#0dcaf0' }}>Náhled — jak má výstup z Laravelu vypadat</strong>
            <span className="text-muted fs-11 ms-auto fst-italic">Najeď myší na graf — uvidíš tooltip</span>
          </div>
          <VyvojTrzebPreview />
        </div>

        <div className="d-flex flex-column gap-2">
          {ACCORDION.filter(s => s.id.startsWith('vyvoj-trzeb')).map((sec) => renderAccordionItem(sec, openId, toggle, copiedAt, copyCode))}
        </div>
      </section>

      {/* Skupina 3 — Sdílené */}
      <section className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-3">
          <iconify-icon icon="solar:settings-bold-duotone" style={{ fontSize: 20, color: '#6c757d' }} />
          <h4 className="mb-0">Sdílené (pro obě sekce)</h4>
          <span className="text-muted fs-12 ms-2">Helpery, CSS, routing — bez vlastního vizuálu</span>
        </div>
        <div className="d-flex flex-column gap-2">
          {ACCORDION.filter(s => !s.id.startsWith('trzby-detail') && !s.id.startsWith('vyvoj-trzeb')).map((sec) => renderAccordionItem(sec, openId, toggle, copiedAt, copyCode))}
        </div>
      </section>

      {/* Footer note */}
      <div className="alert alert-light border mt-3 mb-4 fs-12 text-muted">
        <strong>Poznámky pro implementaci:</strong>
        <ul className="mb-0 mt-1" style={{ paddingLeft: 18 }}>
          <li><strong>Volt single-file</strong> — anonymní třída <code>{'new #[Defer] class extends Component { ... }'}</code> + Blade v jednom <code>.blade.php</code> souboru. Žádný oddělený <code>app/Livewire/*.php</code>.</li>
          <li><strong>Eloquent</strong> — všechny query přes <code>Branch</code> + <code>DailyClosingRow</code>. Žádné mock generators, žádné hash funkce, žádné slugy provozoven. <code>$branch-&gt;id</code> je integer, <code>$branch-&gt;name</code> string.</li>
          <li><strong>Tržba</strong> = <code>SUM(daily_closing_rows.value)</code> pro <code>type_id IN [DailyClosingRow::SALES, DailyClosingRow::SALE_MANUAL]</code>. JOIN přes <code>daily_closings</code> pro <code>branch_id</code> a <code>date</code>.</li>
          <li><strong>Helper</strong> <code>formatMoney($n, false)</code> — globální funkce kodéra (asi v <code>app/helpers.php</code>). Druhý parametr <code>false</code> = bez haléřů.</li>
          <li><strong>Multi-tenancy</strong> — pokud <code>auth()-&gt;user()-&gt;activeBranch()-&gt;id == mainBranchGet()</code>, uživatel vidí všechny <code>Branch::all()</code>. Jinak jen tu svou (single-venue mód).</li>
          <li><strong>SVG</strong> je rendrované server-side v PHP (smooth Catmull-Rom path). Alpine.js obsluhuje jen hover state pro tooltip.</li>
          <li><strong>x-input</strong> — kodérova vlastní Blade komponenta (<code>&lt;x-input label="Od" wire:model="from" type="date" /&gt;</code>). Pokud zatím neexistuje, lze nahradit standardním <code>&lt;input&gt;</code>.</li>
        </ul>
      </div>
    </>
  );
}
