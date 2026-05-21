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

// ─── Code samples (PHP / Blade / CSS / JS) ────────────────────

const CODE_PROVOZOVNY_PHP = `<?php
// app/Support/Provozovny.php
// Statický seznam provozoven s brand barvami a metadaty.
// V produkci by toto byla DB tabulka (model Provozovna).
namespace App\\Support;

class Provozovny
{
    public const ITEMS = [
        ['id' => 'cg-brno',                'name' => 'CG Brno',                  'shortName' => 'CG Brno',     'color' => '#cdaa69', 'status' => 'active'],
        ['id' => 'piazza',                 'name' => 'Piazza',                   'shortName' => 'Piazza',      'color' => '#143746', 'status' => 'active'],
        ['id' => 'monte',                  'name' => 'Monte',                    'shortName' => 'Monte',       'color' => '#ad0d24', 'status' => 'active'],
        ['id' => 'u-capa',                 'name' => 'Pivnice U Čápa',           'shortName' => 'U Čápa',      'color' => '#0C5E44', 'status' => 'active'],
        ['id' => 'korek-winebar',          'name' => 'KOREK Winebar',            'shortName' => 'KOREK WB',    'color' => '#648CE8', 'status' => 'active'],
        ['id' => 'u-kohoutu',              'name' => 'U Kohoutů',                'shortName' => 'U Kohoutů',   'color' => '#E64843', 'status' => 'active'],
        ['id' => 'nad-hladinkou',          'name' => 'Nad Hladinkou',            'shortName' => 'Nad Hladinkou','color'=> '#203A9A', 'status' => 'active'],
        ['id' => 'flank',                  'name' => 'Flank',                    'shortName' => 'Flank',       'color' => '#3E111B', 'status' => 'active'],
        ['id' => 'cg-catering',            'name' => 'CG Catering',              'shortName' => 'CG Catering', 'color' => '#4b0041', 'status' => 'active'],
        ['id' => 'tackarna-londyn',        'name' => 'Táckárna Londýn',          'shortName' => 'Táck. LN',    'color' => '#a4e055', 'status' => 'active'],
        ['id' => 'tackarna-turanka',       'name' => 'Táckárna Turanka',         'shortName' => 'Táck. TU',    'color' => '#40cf6d', 'status' => 'active'],
        ['id' => 'tackarna-svedske-valy',  'name' => 'Táckárna Švédské Valy',    'shortName' => 'Táck. ŠV',    'color' => '#d9f5bf', 'status' => 'active'],
        ['id' => 'teatr',                  'name' => 'Teátr',                    'shortName' => 'Teátr',       'color' => '#e56445', 'status' => 'active'],
        ['id' => 'korek-wines',            'name' => 'KOREK Wines',              'shortName' => 'KOREK W',     'color' => '#FFD9AB', 'status' => 'active'],
        ['id' => 'jime-brno',              'name' => 'Jíme Brno',                'shortName' => 'Jíme Brno',   'color' => '#0a0a5a', 'status' => 'active'],
    ];

    public static function active(): array
    {
        return array_values(array_filter(self::ITEMS, fn ($p) => $p['status'] === 'active'));
    }

    public static function findById(string $id): ?array
    {
        foreach (self::ITEMS as $p) {
            if ($p['id'] === $id) return $p;
        }
        return null;
    }
}
`;

const CODE_TRZBY_HELPER_PHP = `<?php
// app/Support/TrzbyHelper.php
// Pure-function helper s mock daty + deterministická "variabilita" (bez random()).
// Stejné hodnoty pro stejné vstupy → predikovatelné chování napříč serverovými requesty.
namespace App\\Support;

use Carbon\\Carbon;

class TrzbyHelper
{
    // Kuchyň/Bar denní průměry (Kč/den) per provozovna
    public const BASE_SPLIT = [
        'cg-brno'                => ['k' => 50800, 'b' => 22100],
        'piazza'                 => ['k' => 35600, 'b' => 11500],
        'monte'                  => ['k' => 25200, 'b' => 16900],
        'u-capa'                 => ['k' => 21900, 'b' => 25400],
        'korek-winebar'          => ['k' =>  5700, 'b' => 24400],
        'u-kohoutu'              => ['k' => 19800, 'b' => 23300],
        'nad-hladinkou'          => ['k' => 17700, 'b' => 20300],
        'flank'                  => ['k' => 33500, 'b' => 12800],
        'cg-catering'            => ['k' => 21700, 'b' =>  4400],
        'tackarna-londyn'        => ['k' => 15000, 'b' =>  3900],
        'tackarna-turanka'       => ['k' => 11800, 'b' =>  3300],
        'tackarna-svedske-valy'  => ['k' => 13400, 'b' =>  3500],
        'teatr'                  => ['k' => 26200, 'b' => 19000],
        'korek-wines'            => ['k' =>  4600, 'b' => 17300],
        'jime-brno'              => ['k' => 29500, 'b' =>  8600],
    ];

    // Multiplikátor dle dne v týdnu (index 0 = pondělí, 6 = neděle)
    public const DOW_MULT = [0.80, 0.85, 0.90, 0.95, 1.12, 1.28, 1.12];

    // Sezónní faktor (index 0 = leden, 11 = prosinec)
    public const SEASONAL = [0.80, 0.75, 0.88, 0.95, 1.05, 1.10, 1.12, 1.08, 1.05, 0.98, 0.88, 1.18];

    // Roky vzniku provozoven
    public const FOUNDING_YEAR = [
        'cg-brno' => 2018, 'piazza' => 2006, 'monte' => 2021, 'u-capa' => 2020,
        'korek-winebar' => 2022, 'u-kohoutu' => 2021, 'nad-hladinkou' => 2022,
        'flank' => 2023, 'cg-catering' => 2020, 'tackarna-londyn' => 2023,
        'tackarna-turanka' => 2024, 'tackarna-svedske-valy' => 2024,
        'teatr' => 2022, 'korek-wines' => 2023, 'jime-brno' => 2024,
    ];

    // 2026 má data jen do dubna (17. 4.)
    public const MAX_MONTH_2026 = 4;
    public const REFERENCNI_DATUM = '2026-04-17';

    // Mock isLive flag per provozovna (otevřené účty)
    public const UCTY_MOCK = [
        'cg-brno' => true, 'piazza' => true, 'monte' => false, 'u-capa' => true,
        'korek-winebar' => true, 'u-kohoutu' => false, 'nad-hladinkou' => false,
        'flank' => true, 'cg-catering' => false, 'tackarna-londyn' => true,
        'tackarna-turanka' => true, 'tackarna-svedske-valy' => false,
        'teatr' => true, 'korek-wines' => true, 'jime-brno' => false,
    ];

    // ── Deterministická pseudo-random varianta (bez random()) ──
    public static function detRand(string $dateStr, string $provId): float
    {
        $h = 0;
        $s = $dateStr . $provId;
        for ($i = 0; $i < strlen($s); $i++) {
            $h = (($h * 31) + ord($s[$i])) & 0xFFFF;
        }
        return 0.88 + ($h % 1000) / 4000; // rozsah ~0.88–1.13
    }

    public static function baseDay(string $provId): int
    {
        $s = self::BASE_SPLIT[$provId] ?? null;
        return $s ? $s['k'] + $s['b'] : 0;
    }

    public static function getDowFactor(string $dateStr): float
    {
        $d   = Carbon::parse($dateStr . ' 12:00:00');
        $dow = $d->dayOfWeek;                  // 0 = neděle, 1 = pondělí…
        $idx = $dow === 0 ? 6 : $dow - 1;
        $monthGrowth = 1 + max(0, $d->month - 3) * 0.015;
        return self::DOW_MULT[$idx] * $monthGrowth;
    }

    // ── Celková tržba per provozovna pro 1 den (multi-venue tabulka) ──
    public static function genDayData(string $dateStr): array
    {
        $factor = self::getDowFactor($dateStr);
        $out = [];
        foreach (Provozovny::active() as $p) {
            $base = self::baseDay($p['id']);
            $out[$p['id']] = $base
                ? (int) round($base * $factor * self::detRand($dateStr, $p['id']))
                : 0;
        }
        return $out;
    }

    // ── Kuchyň / Bar / Celkem split (single-venue tabulka) ──
    public static function genDayDataSplit(string $dateStr, string $provId): array
    {
        $factor = self::getDowFactor($dateStr);
        $split  = self::BASE_SPLIT[$provId] ?? ['k' => 0, 'b' => 0];
        $r      = self::detRand($dateStr, $provId);
        $k = (int) round($split['k'] * $factor * $r);
        $b = (int) round($split['b'] * $factor * $r);
        return ['k' => $k, 'b' => $b, 'c' => $k + $b];
    }

    // ── Srovnání D-7 (stejný den před týdnem) ──
    public static function genD7Split(string $dateStr, string $provId): array
    {
        $d7 = Carbon::parse($dateStr . ' 12:00:00')->subDays(7)->format('Y-m-d');
        return self::genDayDataSplit($d7, $provId);
    }

    // ── Dní v měsíci (s respektováním omezení 2026) ──
    public static function daysInMonth(int $year, int $month): int
    {
        if ($year === 2026 && $month === self::MAX_MONTH_2026) return 17;
        if ($year === 2026 && $month >  self::MAX_MONTH_2026) return 0;
        return Carbon::create($year, $month, 1)->daysInMonth;
    }

    // ── Měsíční tržba pro jednu provozovnu ──
    public static function genMonthRevenue(int $year, int $month, string $provId): int
    {
        $fy = self::FOUNDING_YEAR[$provId] ?? 2022;
        if ($year < $fy) return 0;

        $days = self::daysInMonth($year, $month);
        if ($days === 0) return 0;

        $base = self::baseDay($provId);
        if (!$base) return 0;

        // Meziroční růst: 2025 = baseline, 2026 = +5 %, starší = ×0.95 ^ N
        $yFactor = $year === 2026 ? 1.05
                 : ($year === 2025 ? 1.0
                 : pow(0.95, 2025 - $year));

        $r = self::detRand(sprintf('%d-%02d', $year, $month), $provId);
        return (int) round($base * $days * self::SEASONAL[$month - 1] * $yFactor * $r);
    }

    // ── Roční tržba (pro graf vývoje) ──
    public static function genAnnualRevenue(int $year, string $provId): int
    {
        $fy = self::FOUNDING_YEAR[$provId] ?? 2022;
        if ($year < $fy || $year > 2026) return 0;

        if ($year >= 2025) {
            $sum = 0;
            for ($m = 1; $m <= 12; $m++) $sum += self::genMonthRevenue($year, $m, $provId);
            return $sum;
        }

        // Historická extrapolace
        $base = 0;
        for ($m = 1; $m <= 12; $m++) $base += self::genMonthRevenue(2025, $m, $provId);
        $back = 2025 - $year;
        $r    = self::detRand("ann-{$year}", $provId);
        return (int) round($base * pow(0.88, $back) * (0.93 + $r * 0.14));
    }

    // ── Formátování Kč s narrow no-break space (U+202F) ──
    public static function fCzk(int $n): string
    {
        $sign = $n < 0 ? '-' : '';
        $abs  = abs($n);
        $rev  = strrev((string) $abs);
        $grp  = str_split($rev, 3);
        $s    = strrev(implode("\\u{202F}", $grp));
        return $sign . $s . "\\u{202F}Kč";
    }

    // ── Datumy v rozsahu (včetně) ──
    public static function getDatesInRange(string $from, string $to): array
    {
        $dates = [];
        $cur = Carbon::parse($from . ' 12:00:00');
        $end = Carbon::parse($to   . ' 12:00:00');
        while ($cur <= $end) {
            $dates[] = $cur->format('Y-m-d');
            $cur->addDay();
        }
        return $dates;
    }

    // ── Smooth SVG path (Catmull-Rom přes cubic bezier) ──
    public static function smoothPath(array $pts): string
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
}
`;

const CODE_TRZBY_DETAIL_PHP = `<?php
// app/Livewire/TrzbyDetail.php
// Livewire v4 komponenta — tabulka tržeb za období + přednastavené filtry.
// State: dateFrom, dateTo, selectedProvozovna (null = všechny).
namespace App\\Livewire;

use App\\Support\\Provozovny;
use App\\Support\\TrzbyHelper;
use Carbon\\Carbon;
use Livewire\\Attributes\\Computed;
use Livewire\\Component;

class TrzbyDetail extends Component
{
    public string  $dateFrom            = '2026-04-11';
    public string  $dateTo              = '2026-04-17';
    public ?string $selectedProvozovna  = null;            // null = všechny

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

    public function applyPreset(string $label): void
    {
        foreach (self::PRESETS as $p) {
            if ($p['label'] === $label) {
                $this->dateFrom = $p['from'];
                $this->dateTo   = $p['to'];
                return;
            }
        }
    }

    #[Computed]
    public function isSingleVenue(): bool
    {
        return $this->selectedProvozovna !== null && $this->selectedProvozovna !== 'all';
    }

    #[Computed]
    public function singleProv(): ?array
    {
        return $this->isSingleVenue
            ? Provozovny::findById($this->selectedProvozovna)
            : null;
    }

    #[Computed]
    public function isMonthly(): bool
    {
        // Rozsah > 60 dní → měsíční agregace
        $from = Carbon::parse($this->dateFrom);
        $to   = Carbon::parse($this->dateTo);
        return $from->diffInDays($to) > 60;
    }

    #[Computed]
    public function rows(): array
    {
        $dates = TrzbyHelper::getDatesInRange($this->dateFrom, $this->dateTo);

        if (! $this->isMonthly) {
            return array_map(fn ($d) => [
                'label'  => $this->rowLabel($d),
                'datum'  => $d,
                'byProv' => TrzbyHelper::genDayData($d),
            ], $dates);
        }

        // Měsíční agregace
        $months = [];
        foreach ($dates as $d) {
            $key = substr($d, 0, 7);
            $day = TrzbyHelper::genDayData($d);
            foreach (Provozovny::active() as $p) {
                $months[$key][$p['id']] = ($months[$key][$p['id']] ?? 0) + ($day[$p['id']] ?? 0);
            }
        }
        ksort($months);

        return array_map(fn ($key, $byProv) => [
            'label'  => $this->monthLabel($key),
            'datum'  => $key . '-01',
            'byProv' => $byProv,
        ], array_keys($months), $months);
    }

    #[Computed]
    public function cols(): array
    {
        return $this->isSingleVenue ? [] : Provozovny::active();
    }

    protected function rowLabel(string $d): string
    {
        $dt = Carbon::parse($d . ' 12:00:00');
        $wd = ['ne','po','út','st','čt','pá','so'][$dt->dayOfWeek];
        return "{$wd} {$dt->day}.{$dt->month}.";
    }

    protected function monthLabel(string $key): string
    {
        $dt = Carbon::parse($key . '-01 12:00:00');
        $m  = ['leden','únor','březen','duben','květen','červen',
               'červenec','srpen','září','říjen','listopad','prosinec'][$dt->month - 1];
        return "{$m} {$dt->year}";
    }

    public function render()
    {
        return view('livewire.trzby-detail', [
            'presets' => self::PRESETS,
        ]);
    }
}
`;

const CODE_TRZBY_DETAIL_BLADE = `{{-- resources/views/livewire/trzby-detail.blade.php --}}
{{-- Vyžaduje TrzbyHelper a Provozovny aliasy; assume Bootstrap 5 + iconify-icon web-component --}}
@php
    use App\\Support\\TrzbyHelper;
@endphp
<div class="card mb-4">
    <div class="card-header trzby-detail-header-sticky">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h5 class="card-title mb-0">
                Tržby detail
                @if($this->isSingleVenue && $this->singleProv)
                    <span class="ms-2 fw-normal fs-6 text-muted">
                        <span class="rounded-circle d-inline-block me-1"
                              style="width:8px;height:8px;background:{{ $this->singleProv['color'] }}"></span>
                        {{ $this->singleProv['name'] }}
                    </span>
                @endif
            </h5>

            <div class="d-flex align-items-center gap-2 flex-wrap">
                {{-- Přednastavené filtry --}}
                <select class="form-select form-select-sm" style="width:auto"
                        wire:change="applyPreset($event.target.value)">
                    <option value="" disabled selected>Rychlý výběr…</option>
                    @foreach($presets as $p)
                        <option value="{{ $p['label'] }}">{{ $p['label'] }}</option>
                    @endforeach
                </select>

                <div class="topbar-divider"></div>

                <div class="d-flex align-items-center gap-1">
                    <span class="text-muted small">Od</span>
                    <input type="date" class="form-control form-control-sm" style="width:140px"
                           wire:model.live.debounce.300ms="dateFrom">
                </div>
                <div class="d-flex align-items-center gap-1">
                    <span class="text-muted small">Do</span>
                    <input type="date" class="form-control form-control-sm" style="width:140px"
                           wire:model.live.debounce.300ms="dateTo">
                </div>

                <span class="badge bg-light text-muted border">
                    {{ $this->isMonthly ? 'Měsíce' : 'Dny' }} · {{ count($this->rows) }} řádků
                </span>
            </div>
        </div>
    </div>

    <div class="trzby-detail-wrap">
        @if(count($this->rows) === 0)
            <div class="p-4 text-center text-muted">Vyberte platný rozsah dat (max. 2 roky).</div>

        @elseif($this->isSingleVenue && $this->singleProv)
            {{-- ─── Single venue: Kuchyň / Bar / Celkem / vs. D-7 ─── --}}
            @php
                $prov     = $this->singleProv;
                $isToday  = fn ($d) => $d === '2026-04-17';
                $isLive   = TrzbyHelper::UCTY_MOCK[$prov['id']] ?? false;
                $sumK = 0; $sumB = 0; $sumC = 0;
            @endphp
            <table class="trzby-detail-table">
                <thead>
                    <tr>
                        <th class="trzby-col-date trzby-sticky-l">
                            <div class="d-flex align-items-center gap-1">
                                <span class="rounded-circle d-inline-block"
                                      style="width:8px;height:8px;background:{{ $prov['color'] }}"></span>
                                {{ $this->isMonthly ? 'Měsíc' : 'Datum' }}
                            </div>
                        </th>
                        <th class="trzby-col-prov" style="color:#1c84ee">Kuchyň</th>
                        <th class="trzby-col-prov" style="color:#22c55e">Bar</th>
                        <th class="trzby-col-prov">Celkem</th>
                        <th class="trzby-col-prov trzby-sticky-r" style="min-width:110px">vs. D-7</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($this->rows as $row)
                        @php
                            $split = TrzbyHelper::genDayDataSplit($row['datum'], $prov['id']);
                            $d7    = $this->isMonthly ? null : TrzbyHelper::genD7Split($row['datum'], $prov['id']);
                            $d7Chng = $d7 ? round((($split['c'] - $d7['c']) / max($d7['c'], 1)) * 1000) / 10 : null;
                            $d7Up   = $d7Chng !== null && $d7Chng >= 0;
                            $provLive = $isToday($row['datum']) && $isLive;
                            $sumK += $split['k']; $sumB += $split['b']; $sumC += $split['c'];
                        @endphp
                        <tr wire:key="row-{{ $row['datum'] }}">
                            <td class="trzby-col-date trzby-sticky-l fw-semibold">{{ $row['label'] }}</td>
                            <td class="trzby-col-prov text-end czk-num" style="color:#1c84ee">
                                {{ TrzbyHelper::fCzk($split['k']) }}
                            </td>
                            <td class="trzby-col-prov text-end czk-num" style="color:#22c55e">
                                {{ TrzbyHelper::fCzk($split['b']) }}
                            </td>
                            <td class="trzby-col-prov text-end czk-num fw-semibold">
                                <span class="d-inline-flex align-items-center justify-content-end gap-1">
                                    @if($provLive)
                                        <span class="trzby-live-dot" style="width:5px;height:5px"></span>
                                    @endif
                                    {{ TrzbyHelper::fCzk($split['c']) }}
                                </span>
                            </td>
                            <td class="trzby-col-prov trzby-sticky-r text-end">
                                @if($d7Chng !== null)
                                    <span class="badge {{ $d7Up ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger' }}">
                                        <iconify-icon icon="{{ $d7Up ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold' }}"></iconify-icon>
                                        {{ $d7Up ? '+' : '' }}{{ number_format($d7Chng, 1, ',', '') }} %
                                    </span>
                                @else
                                    <span class="text-muted">—</span>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr>
                        <td class="trzby-col-date trzby-sticky-l fw-bold">Celkem</td>
                        <td class="trzby-col-prov text-end czk-num fw-bold" style="color:#1c84ee">{{ TrzbyHelper::fCzk($sumK) }}</td>
                        <td class="trzby-col-prov text-end czk-num fw-bold" style="color:#22c55e">{{ TrzbyHelper::fCzk($sumB) }}</td>
                        <td class="trzby-col-prov text-end czk-num fw-bold">{{ TrzbyHelper::fCzk($sumC) }}</td>
                        <td class="trzby-col-prov trzby-sticky-r text-end text-muted">—</td>
                    </tr>
                </tfoot>
            </table>

        @else
            {{-- ─── Multi venue: jeden sloupec per provozovna ─── --}}
            @php
                $isToday = fn ($d) => $d === '2026-04-17';
                $colSums  = [];
                $grandTot = 0;
            @endphp
            <table class="trzby-detail-table">
                <thead>
                    <tr>
                        <th class="trzby-col-date trzby-sticky-l">{{ $this->isMonthly ? 'Měsíc' : 'Datum' }}</th>
                        @foreach($this->cols as $p)
                            <th class="trzby-col-prov" wire:key="head-{{ $p['id'] }}">
                                <div class="d-flex align-items-center justify-content-end gap-1">
                                    <span class="rounded-circle d-inline-block flex-shrink-0"
                                          style="width:7px;height:7px;background:{{ $p['color'] }}"></span>
                                    {{ $p['shortName'] }}
                                </div>
                            </th>
                        @endforeach
                        <th class="trzby-col-total trzby-sticky-r">Celkem</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($this->rows as $row)
                        @php
                            $rowTotal = 0;
                            foreach ($this->cols as $p) $rowTotal += $row['byProv'][$p['id']] ?? 0;
                            $anyLive = false;
                            if ($isToday($row['datum'])) {
                                foreach ($this->cols as $p) {
                                    if (TrzbyHelper::UCTY_MOCK[$p['id']] ?? false) { $anyLive = true; break; }
                                }
                            }
                            $grandTot += $rowTotal;
                        @endphp
                        <tr wire:key="row-{{ $row['datum'] }}">
                            <td class="trzby-col-date trzby-sticky-l fw-semibold">{{ $row['label'] }}</td>
                            @foreach($this->cols as $p)
                                @php
                                    $v = $row['byProv'][$p['id']] ?? 0;
                                    $colSums[$p['id']] = ($colSums[$p['id']] ?? 0) + $v;
                                    $provLive = $isToday($row['datum']) && (TrzbyHelper::UCTY_MOCK[$p['id']] ?? false);
                                @endphp
                                <td class="trzby-col-prov text-end czk-num" wire:key="c-{{ $row['datum'] }}-{{ $p['id'] }}">
                                    @if($v > 0)
                                        <span class="d-inline-flex align-items-center justify-content-end gap-1">
                                            @if($provLive)
                                                <span class="trzby-live-dot" style="width:5px;height:5px"></span>
                                            @endif
                                            {{ TrzbyHelper::fCzk($v) }}
                                        </span>
                                    @else
                                        <span class="text-muted">—</span>
                                    @endif
                                </td>
                            @endforeach
                            <td class="trzby-col-total trzby-sticky-r text-end czk-num fw-bold">
                                <span class="d-inline-flex align-items-center justify-content-end gap-1">
                                    @if($anyLive)
                                        <span class="trzby-live-dot" style="width:5px;height:5px"></span>
                                    @endif
                                    {{ TrzbyHelper::fCzk($rowTotal) }}
                                </span>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr>
                        <td class="trzby-col-date trzby-sticky-l fw-bold">Celkem</td>
                        @foreach($this->cols as $p)
                            <td class="trzby-col-prov text-end czk-num fw-bold" wire:key="foot-{{ $p['id'] }}">
                                {{ TrzbyHelper::fCzk($colSums[$p['id']] ?? 0) }}
                            </td>
                        @endforeach
                        <td class="trzby-col-total trzby-sticky-r text-end czk-num fw-bold">
                            {{ TrzbyHelper::fCzk($grandTot) }}
                        </td>
                    </tr>
                </tfoot>
            </table>
        @endif
    </div>
</div>
`;

const CODE_VYVOJ_TRZEB_PHP = `<?php
// app/Livewire/VyvojTrzeb.php
// Livewire v4 komponenta — multi-line SVG chart vývoje tržeb + tabulka pod ním.
// 3 módy: Roky (X = roky) / Rok › měsíce (X = měsíce zvoleného roku) / Měsíc › roky (X = roky zvoleného měsíce).
namespace App\\Livewire;

use App\\Support\\Provozovny;
use App\\Support\\TrzbyHelper;
use Livewire\\Attributes\\Computed;
use Livewire\\Component;

class VyvojTrzeb extends Component
{
    public string $mode    = 'roky';              // roky | rok-mesice | mesic-roky
    public string $period  = 'vse';               // 3 | 5 | 10 | vse (jen pro mode='roky')
    public int    $year    = 2025;                // pro mode='rok-mesice'
    public int    $month   = 1;                   // pro mode='mesic-roky' (1-12)
    public array  $selectedProvs = ['cg-brno', 'piazza', 'monte'];

    public const MONTH_LABELS = ['Led','Únor','Bře','Dub','Kvě','Čer','Čec','Srp','Zář','Říj','Lis','Pro'];
    public const MONTH_FULL   = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];

    // SVG dimensions (musí matchovat s JS verzí)
    public const CW = 700; public const CH = 210;
    public const ML = 62;  public const MT = 16;
    public const MR = 16;  public const MB = 38;

    public function setMode(string $m): void   { $this->mode = $m; }
    public function setPeriod(string $p): void { $this->period = $p; }

    public function toggleProv(string $id): void
    {
        if (in_array($id, $this->selectedProvs, true)) {
            $this->selectedProvs = array_values(array_filter($this->selectedProvs, fn ($x) => $x !== $id));
        } else {
            $this->selectedProvs[] = $id;
        }
    }

    #[Computed]
    public function chartProvs(): array
    {
        return array_values(array_filter(
            Provozovny::active(),
            fn ($p) => in_array($p['id'], $this->selectedProvs, true) && TrzbyHelper::baseDay($p['id']) > 0
        ));
    }

    #[Computed]
    public function fromYear(): int
    {
        return match ($this->period) {
            '3'   => 2024,
            '5'   => 2022,
            '10'  => 2017,
            'vse' => 2006,
            default => 2006,
        };
    }

    #[Computed]
    public function mesicRokyFromYear(): int
    {
        if (empty($this->chartProvs)) return 2018;
        $years = array_map(
            fn ($p) => TrzbyHelper::FOUNDING_YEAR[$p['id']] ?? 2018,
            $this->chartProvs
        );
        return min($years);
    }

    #[Computed]
    public function xLabels(): array
    {
        return match ($this->mode) {
            'roky'       => array_map('strval', range($this->fromYear, 2026)),
            'rok-mesice' => self::MONTH_LABELS,
            'mesic-roky' => array_map('strval', range($this->mesicRokyFromYear, 2026)),
        };
    }

    #[Computed]
    public function data(): array
    {
        $out = [];
        foreach ($this->chartProvs as $p) {
            $vals = [];
            if ($this->mode === 'roky') {
                foreach ($this->xLabels as $y) $vals[] = TrzbyHelper::genAnnualRevenue((int) $y, $p['id']);
            } elseif ($this->mode === 'rok-mesice') {
                for ($i = 1; $i <= 12; $i++) $vals[] = TrzbyHelper::genMonthRevenue($this->year, $i, $p['id']);
            } else { // mesic-roky
                foreach ($this->xLabels as $y) $vals[] = TrzbyHelper::genMonthRevenue((int) $y, $this->month, $p['id']);
            }
            $out[] = $vals;
        }
        return $out;
    }

    // Připraví SVG payload pro Blade (paths, body, gridy…)
    #[Computed]
    public function chart(): array
    {
        $IW = self::CW - self::ML - self::MR;
        $IH = self::CH - self::MT - self::MB;
        $N  = count($this->xLabels);

        $allVals = [];
        foreach ($this->data as $row) foreach ($row as $v) if ($v > 0) $allVals[] = $v;
        $maxVal = !empty($allVals) ? max($allVals) : 1;
        $yMax   = (int) (ceil($maxVal / 1_000_000) * 1_000_000) ?: (int) (ceil($maxVal / 100_000) * 100_000);

        $xPx = fn (int $i) => $N > 1 ? self::ML + ($i / ($N - 1)) * $IW : self::ML + $IW / 2;
        $yPx = fn (float $v) => self::MT + $IH - ($v / $yMax) * $IH;

        $lines = [];
        foreach ($this->chartProvs as $pi => $prov) {
            $pts = [];
            foreach ($this->data[$pi] as $i => $v) {
                $pts[] = ['x' => $xPx($i), 'y' => $yPx(max($v, 0)), 'v' => $v, 'has' => $v > 0];
            }
            $nonZero = array_values(array_filter($pts, fn ($p) => $p['has']));

            $areaPath = '';
            if (count($nonZero) > 1) {
                $smooth   = TrzbyHelper::smoothPath($nonZero);
                $last     = end($nonZero);
                $first    = reset($nonZero);
                $baseLine = self::MT + $IH;
                $areaPath = "{$smooth} L {$last['x']},{$baseLine} L {$first['x']},{$baseLine} Z";
            }

            $lines[] = [
                'prov'     => $prov,
                'pts'      => $pts,
                'linePath' => TrzbyHelper::smoothPath($pts),
                'areaPath' => $areaPath,
            ];
        }

        $xCoords = array_map(fn ($i) => $xPx($i), array_keys($this->xLabels));

        return [
            'IW' => $IW, 'IH' => $IH, 'N' => $N, 'yMax' => $yMax,
            'gridVals' => [$yMax * 0.25, $yMax * 0.5, $yMax * 0.75, $yMax],
            'lines'    => $lines,
            'xCoords'  => $xCoords,
            'xHalf'    => $N > 1 ? ($IW / ($N - 1)) / 2 : $IW / 2,
            'fmtY'     => function (float $v): string {
                return $v >= 1_000_000
                    ? sprintf('%.1fM', $v / 1_000_000)
                    : sprintf('%dk', (int) round($v / 1_000));
            },
        ];
    }

    public function render()
    {
        return view('livewire.vyvoj-trzeb');
    }
}
`;

const CODE_VYVOJ_TRZEB_BLADE = `{{-- resources/views/livewire/vyvoj-trzeb.blade.php --}}
{{-- Vyžaduje Alpine.js (pro hover tooltip) + iconify-icon web-component. --}}
@php
    use App\\Support\\Provozovny;
    use App\\Support\\TrzbyHelper;
    $activeProvs = array_values(array_filter(
        Provozovny::active(),
        fn ($p) => TrzbyHelper::baseDay($p['id']) > 0
    ));
    $chart = $this->chart;
    // Pole hodnot pro JS (Alpine tooltip)
    $dataJs    = json_encode($this->data);
    $xCoordsJs = json_encode($chart['xCoords']);
    $provsJs   = json_encode(array_map(fn ($p) => [
        'id' => $p['id'], 'shortName' => $p['shortName'], 'color' => $p['color'],
    ], $this->chartProvs));
@endphp
<div class="card mb-3"
     x-data="vyvojChart({
         data: {{ $dataJs }},
         xCoords: {{ $xCoordsJs }},
         provs: {{ $provsJs }},
         xLabels: {{ json_encode($this->xLabels) }},
         monthLabels: {{ json_encode(\\App\\Livewire\\VyvojTrzeb::MONTH_LABELS) }},
         mode: '{{ $this->mode }}',
         year: {{ $this->year }},
         month: {{ $this->month }},
         ml: {{ \\App\\Livewire\\VyvojTrzeb::ML }},
         iw: {{ $chart['IW'] }},
         N:  {{ $chart['N'] }},
     })">

    <div class="card-header trzby-detail-header-sticky">
        {{-- Řádek 1: nadpis + mode switcher --}}
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <div>
                <h5 class="card-title mb-0">Vývoj tržeb</h5>
                <small class="text-muted fw-normal">
                    @if($this->mode === 'roky')
                        Roční přehled · {{ $this->fromYear }}–2026 · *duben 2026
                    @elseif($this->mode === 'rok-mesice')
                        Měsíční přehled · rok {{ $this->year }}
                    @else
                        {{ \\App\\Livewire\\VyvojTrzeb::MONTH_FULL[$this->month - 1] }} · {{ $this->mesicRokyFromYear }}–2026
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
                        @for($y = 2026; $y >= 2006; $y--)
                            <option value="{{ $y }}">{{ $y }}</option>
                        @endfor
                    </select>
                @endif
                @if($this->mode === 'mesic-roky')
                    <select class="form-select form-select-sm" style="width:auto" wire:model.live="month">
                        @foreach(\\App\\Livewire\\VyvojTrzeb::MONTH_FULL as $i => $m)
                            <option value="{{ $i + 1 }}">{{ $m }}</option>
                        @endforeach
                    </select>
                @endif
            </div>
        </div>

        {{-- Řádek 2: toggle tlačítka podniků --}}
        <div class="d-flex flex-wrap gap-1">
            @foreach($activeProvs as $p)
                @php $sel = in_array($p['id'], $this->selectedProvs, true); @endphp
                <button class="trzby-chart-toggle"
                        style="{{ $sel ? "background:{$p['color']};border-color:{$p['color']};color:white" : '' }}"
                        wire:click="toggleProv('{{ $p['id'] }}')">
                    {{ $p['shortName'] }}
                </button>
            @endforeach
        </div>
    </div>

    <div class="card-body pb-2">
        @if(empty($this->chartProvs))
            <div style="height:230px;display:flex;align-items:center;justify-content:center" class="text-muted">
                Vyberte alespoň jeden podnik pomocí tlačítek výše.
            </div>
        @else
            <div style="position:relative;height:230px">
                <svg viewBox="0 0 {{ \\App\\Livewire\\VyvojTrzeb::CW }} {{ \\App\\Livewire\\VyvojTrzeb::CH }}"
                     style="width:100%;height:100%;display:block">

                    {{-- Grid --}}
                    @php
                        $ML = \\App\\Livewire\\VyvojTrzeb::ML;
                        $MR = \\App\\Livewire\\VyvojTrzeb::MR;
                        $MT = \\App\\Livewire\\VyvojTrzeb::MT;
                        $CW = \\App\\Livewire\\VyvojTrzeb::CW;
                    @endphp
                    @foreach($chart['gridVals'] as $gv)
                        @php $yp = $MT + $chart['IH'] - ($gv / $chart['yMax']) * $chart['IH']; @endphp
                        <line x1="{{ $ML }}" y1="{{ $yp }}" x2="{{ $CW - $MR }}" y2="{{ $yp }}"
                              stroke="#eaedf1" stroke-width="1" stroke-dasharray="4 3"/>
                        <text x="{{ $ML - 6 }}" y="{{ $yp + 4 }}" text-anchor="end" font-size="9" fill="#9097a7">
                            {{ ($chart['fmtY'])($gv) }}
                        </text>
                    @endforeach
                    <line x1="{{ $ML }}" y1="{{ $MT + $chart['IH'] }}"
                          x2="{{ $CW - $MR }}" y2="{{ $MT + $chart['IH'] }}"
                          stroke="#eaedf1" stroke-width="1"/>

                    {{-- Linie per provozovna --}}
                    @foreach($chart['lines'] as $idx => $line)
                        <g>
                            @if($line['areaPath'])
                                <path d="{{ $line['areaPath'] }}" fill="{{ $line['prov']['color'] }}" fill-opacity="0.07"/>
                            @endif
                            <path d="{{ $line['linePath'] }}" fill="none"
                                  stroke="{{ $line['prov']['color'] }}" stroke-width="2.2" opacity="0.9"/>
                            @foreach($line['pts'] as $i => $pt)
                                @if($pt['has'])
                                    <circle cx="{{ $pt['x'] }}" cy="{{ $pt['y'] }}"
                                            :r="tooltipIdx === {{ $i }} ? 5.5 : 3.5"
                                            fill="{{ $line['prov']['color'] }}" stroke="white" stroke-width="1.5"
                                            style="transition:r 0.1s"/>
                                @endif
                            @endforeach
                        </g>
                    @endforeach

                    {{-- Hover zóny --}}
                    @foreach($this->xLabels as $i => $lbl)
                        @php
                            $x = $chart['xCoords'][$i];
                            $w = $chart['N'] > 1 ? $chart['IW'] / ($chart['N'] - 1) : $chart['IW'];
                        @endphp
                        <rect x="{{ $x - $chart['xHalf'] }}" y="{{ $MT }}"
                              width="{{ $w }}" height="{{ $chart['IH'] }}"
                              fill="transparent" style="cursor:crosshair"
                              @mouseenter="tooltipIdx = {{ $i }}"
                              @mouseleave="tooltipIdx = null"/>
                    @endforeach

                    {{-- Vertikální linka --}}
                    <line x-show="tooltipIdx !== null"
                          :x1="xCoords[tooltipIdx]" y1="{{ $MT }}"
                          :x2="xCoords[tooltipIdx]" y2="{{ $MT + $chart['IH'] }}"
                          stroke="#64748b" stroke-width="1" stroke-dasharray="3 2" opacity="0.4"/>

                    {{-- X popisky --}}
                    @foreach($this->xLabels as $i => $lbl)
                        <text x="{{ $chart['xCoords'][$i] }}" y="{{ $MT + $chart['IH'] + 22 }}"
                              text-anchor="middle" font-size="9"
                              :fill="tooltipIdx === {{ $i }} ? '#313b5e' : '#9097a7'"
                              :font-weight="tooltipIdx === {{ $i }} ? '700' : '400'">
                            {{ $lbl }}
                        </text>
                    @endforeach

                    {{-- Speciální popisky pro 2026 --}}
                    @if($this->mode === 'roky' && $chart['N'] > 0)
                        <text x="{{ $chart['xCoords'][$chart['N'] - 1] }}" y="{{ $MT + $chart['IH'] + 34 }}"
                              text-anchor="middle" font-size="8" fill="#9097a7">*led–dub</text>
                    @endif
                    @if($this->mode === 'rok-mesice' && $this->year === 2026)
                        <text x="{{ $chart['xCoords'][3] }}" y="{{ $MT + $chart['IH'] + 34 }}"
                              text-anchor="middle" font-size="8" fill="#9097a7">*17 dní</text>
                    @endif
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

    {{-- Tabulka pod grafem (analogie React RocniVyvojTable) --}}
    <div class="border-top px-3 py-2 d-flex align-items-center gap-2">
        <span class="text-uppercase fw-semibold text-muted small">
            @if($this->mode === 'roky') Přehled po rocích
            @elseif($this->mode === 'rok-mesice') Přehled po měsících · {{ $this->year }}
            @else Přehled po rocích · {{ \\App\\Livewire\\VyvojTrzeb::MONTH_FULL[$this->month - 1] }}
            @endif
        </span>
        @if($this->mode === 'roky')
            <span class="text-muted small">· {{ $this->fromYear }}–2026 · *duben = leden–duben</span>
        @endif
    </div>
    <div class="trzby-detail-wrap">
        @include('livewire.vyvoj-trzeb-tabulka')
    </div>
</div>
`;

const CODE_TABULKA_PARTIAL_BLADE = `{{-- resources/views/livewire/vyvoj-trzeb-tabulka.blade.php --}}
{{-- Tabulka pod grafem — sloupce dle módu (roky / měsíce / roky) --}}
@php
    use App\\Support\\TrzbyHelper;
    $cols = match($this->mode) {
        'roky' => array_map(fn ($y) => [
            'key' => (string)$y, 'label' => (string)$y,
            'sub' => $y === 2026 ? '*led–dub' : null,
        ], range($this->fromYear, 2026)),
        'rok-mesice' => collect(\\App\\Livewire\\VyvojTrzeb::MONTH_LABELS)->map(fn ($lbl, $i) => [
            'key' => (string)($i + 1), 'label' => $lbl,
            'sub' => $this->year === 2026 && $i === 3 ? '*17 dní' : null,
        ])->all(),
        'mesic-roky' => array_map(fn ($y) => [
            'key' => (string)$y, 'label' => (string)$y,
            'sub' => $y === 2026 ? '*17 dní' : null,
        ], range($this->mesicRokyFromYear, 2026)),
    };
    $getValue = function ($prov, string $colKey): int {
        return match ($this->mode) {
            'roky'       => TrzbyHelper::genAnnualRevenue((int)$colKey, $prov['id']),
            'rok-mesice' => TrzbyHelper::genMonthRevenue($this->year, (int)$colKey, $prov['id']),
            'mesic-roky' => TrzbyHelper::genMonthRevenue((int)$colKey, $this->month, $prov['id']),
        };
    };
@endphp
@if(empty($this->chartProvs))
    <div class="p-4 text-center text-muted">Vyberte provozovny v grafu výše.</div>
@else
    <table class="trzby-detail-table">
        <thead>
            <tr>
                <th class="trzby-col-date trzby-sticky-l" style="min-width:130px;max-width:160px">Provozovna</th>
                @foreach($cols as $col)
                    <th class="trzby-col-prov" style="min-width:90px;text-align:right" wire:key="hd-{{ $col['key'] }}">
                        <span style="display:block;line-height:1.2">{{ $col['label'] }}</span>
                        @if($col['sub'])
                            <span style="display:block;font-size:9px;font-weight:400;color:var(--bs-secondary-color)">{{ $col['sub'] }}</span>
                        @endif
                    </th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @foreach($this->chartProvs as $prov)
                @php $fy = TrzbyHelper::FOUNDING_YEAR[$prov['id']] ?? 2022; @endphp
                <tr wire:key="rw-{{ $prov['id'] }}">
                    <td class="trzby-col-date trzby-sticky-l">
                        <div class="d-flex align-items-center gap-1" style="min-width:0">
                            <span class="rounded-circle flex-shrink-0 d-inline-block"
                                  style="width:7px;height:7px;background:{{ $prov['color'] }}"></span>
                            <span class="fw-semibold" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0">
                                {{ $prov['shortName'] }}
                            </span>
                        </div>
                        <div class="text-muted" style="font-size:10px;padding-left:11px">od {{ $fy }}</div>
                    </td>
                    @foreach($cols as $col)
                        @php $v = $getValue($prov, $col['key']); @endphp
                        <td class="trzby-col-prov text-end" wire:key="cl-{{ $prov['id'] }}-{{ $col['key'] }}">
                            @if($v > 0)
                                <span class="czk-num fw-semibold" style="font-size:12px">{{ TrzbyHelper::fCzk($v) }}</span>
                            @else
                                <span class="text-muted" style="font-size:12px">—</span>
                            @endif
                        </td>
                    @endforeach
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr>
                <td class="trzby-col-date trzby-sticky-l fw-bold" style="font-size:12px">Celkem</td>
                @foreach($cols as $col)
                    @php
                        $sum = 0;
                        foreach ($this->chartProvs as $p) $sum += $getValue($p, $col['key']);
                    @endphp
                    <td class="trzby-col-prov text-end czk-num fw-bold" style="font-size:12px" wire:key="ft-{{ $col['key'] }}">
                        @if($sum > 0) {{ TrzbyHelper::fCzk($sum) }} @else <span class="text-muted">—</span> @endif
                    </td>
                @endforeach
            </tr>
        </tfoot>
    </table>
@endif
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
use App\\Livewire\\TrzbyDetail;
use App\\Livewire\\VyvojTrzeb;
use Illuminate\\Support\\Facades\\Route;

Route::view('/trzby', 'trzby.index')->name('trzby.index');

// V Livewire v4 se komponenty registrují automaticky podle jmenného prostoru.
// Pokud chceš ručně:
// Livewire::component('trzby-detail', TrzbyDetail::class);
// Livewire::component('vyvoj-trzeb', VyvojTrzeb::class);
`;

const CODE_LAYOUT_BLADE = `{{-- resources/views/trzby/index.blade.php --}}
{{-- Hlavní stránka Tržby. Obě sekce jako Livewire komponenty. --}}
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
    id: 'shared-helpers',
    title: '1 — Sdílené: helpery a mock data',
    description: 'PHP třídy s daty provozoven a generátory tržeb. Použito oběma Livewire komponentami.',
    files: [
      { path: 'app/Support/Provozovny.php',  lang: 'php', code: CODE_PROVOZOVNY_PHP },
      { path: 'app/Support/TrzbyHelper.php', lang: 'php', code: CODE_TRZBY_HELPER_PHP },
    ],
  },
  {
    id: 'trzby-detail-php',
    title: '2 — Tržby detail: Livewire komponenta',
    description: 'PHP třída s computed properties (řádky, sloupce, single/multi venue mód).',
    files: [
      { path: 'app/Livewire/TrzbyDetail.php', lang: 'php', code: CODE_TRZBY_DETAIL_PHP },
    ],
  },
  {
    id: 'trzby-detail-blade',
    title: '3 — Tržby detail: Blade šablona',
    description: 'HTML s wire:model / wire:click + sticky tabulka pro single venue (Kuchyň/Bar/Celkem) a multi venue.',
    files: [
      { path: 'resources/views/livewire/trzby-detail.blade.php', lang: 'blade', code: CODE_TRZBY_DETAIL_BLADE },
    ],
  },
  {
    id: 'vyvoj-trzeb-php',
    title: '4 — Vývoj tržeb: Livewire komponenta',
    description: 'Server-side výpočet SVG bodů, smooth path a tabulky pod grafem. 3 módy: Roky / Rok › měsíce / Měsíc › roky.',
    files: [
      { path: 'app/Livewire/VyvojTrzeb.php', lang: 'php', code: CODE_VYVOJ_TRZEB_PHP },
    ],
  },
  {
    id: 'vyvoj-trzeb-blade',
    title: '5 — Vývoj tržeb: Blade šablona + Alpine.js',
    description: 'SVG graf rendrovaný server-side + tooltip ovládaný klientsky přes Alpine.js (hover přes neviditelné rect zóny).',
    files: [
      { path: 'resources/views/livewire/vyvoj-trzeb.blade.php',          lang: 'blade', code: CODE_VYVOJ_TRZEB_BLADE },
      { path: 'resources/views/livewire/vyvoj-trzeb-tabulka.blade.php',  lang: 'blade', code: CODE_TABULKA_PARTIAL_BLADE },
      { path: 'resources/js/vyvoj-chart.js',                              lang: 'js',    code: CODE_ALPINE_JS },
    ],
  },
  {
    id: 'css',
    title: '6 — CSS (sdílené pro obě sekce)',
    description: 'Plain CSS: sticky sloupce, live tečka pulzace, segment buttons, toggle tlačítka v grafu.',
    files: [
      { path: 'resources/css/trzby.css', lang: 'css', code: CODE_CSS },
    ],
  },
  {
    id: 'integration',
    title: '7 — Routing a layout (jak to zapojit)',
    description: 'Sample route + Blade layout, který vloží obě Livewire komponenty na jednu stránku.',
    files: [
      { path: 'routes/web.php',                       lang: 'php',   code: CODE_ROUTES_PHP },
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
              Podklady pro kodéra — segmenty <strong>Tržby detail</strong> a <strong>Vývoj tržeb</strong> přepsané do Laravel / Livewire v4 / Alpine.js
            </div>
          </div>
          <div className="d-flex gap-2 ms-auto flex-wrap">
            <span className="badge bg-primary-subtle text-primary">PHP 8.2+</span>
            <span className="badge bg-info-subtle text-info">Laravel 11+</span>
            <span className="badge bg-success-subtle text-success">Livewire v4</span>
            <span className="badge bg-warning-subtle text-warning">Alpine.js 3</span>
            <span className="badge bg-secondary-subtle text-secondary">plain JS + CSS</span>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="alert alert-info d-flex align-items-start gap-2 mb-4">
        <iconify-icon icon="solar:info-circle-bold-duotone" className="fs-5 flex-shrink-0" />
        <div className="fs-13">
          <strong>Cíl:</strong> zachovat 1:1 vizuál Tržby (sekce „Vývoj tržeb" a „Tržby detail") z aktuálního React/TS prototypu.
          <br />
          <strong>Stack:</strong> Laravel 11+ s Livewire v4 (server-side state + re-renders), Alpine.js 3 (klientská interaktivita — tooltip),
          plain CSS (sticky sloupce, animace), plain JS (formátování čísel).
          <br />
          <strong>Mock data:</strong> všechny generátory v <code className="bg-light px-1 rounded">TrzbyHelper.php</code> jsou pure-functions —
          stejné vstupy → stejné výstupy. V produkci nahradit DB dotazy.
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
          <li>Číselný formát používá <code>U+202F</code> (narrow no-break space) jako oddělovač tisíců — viz <code>TrzbyHelper::fCzk()</code> a <code>window.fCzk()</code>.</li>
          <li>Mock data jsou deterministická — funkce <code>detRand()</code> používá hash, ne <code>random()</code>. To zajistí stabilní výstup mezi requesty.</li>
          <li>SVG je rendrované server-side v PHP (smooth Catmull-Rom path). Alpine.js obsluhuje jen hover state pro tooltip.</li>
          <li>Bootstrap 5 utility třídy (<code>.d-flex</code>, <code>.gap-2</code>, <code>.badge</code>, <code>.card</code>…) předpokládám už zavedené v projektu.</li>
          <li>Ikony — používá se webový komponent <code>&lt;iconify-icon&gt;</code> s ikonami sady Solar. Nainstaluj přes <code>npm i iconify-icon</code>.</li>
        </ul>
      </div>
    </>
  );
}
