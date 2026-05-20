// COMPONENT: Tržby – Revenue Analytics Page v3
// SOURCE: Larkon _page-title.scss + _card.scss + _tables.scss + Bootstrap layout
// CUSTOM: PARTIAL – KPI row layout, sticky-column detail table, data generation

import { useState, useMemo, Fragment } from 'react';
import type { AppState } from '../types';
import type { ProvozovnaId } from '../types';
import {
  PROVOZOVNY,
  getTrzbyDnes,
  getTrzbyD7,
  getTotalForPeriod,
  getPrevForPeriod,
  getMesicVsLY,
  fCzk,
  fCzkShort,
  pctChange,
} from '../data';

// ─── Aktivní provozovny a jejich denní průměry ────────────────

const ACTIVE_PROVS = PROVOZOVNY.filter((p) => p.status === 'active');

// Kuchyň/Bar split průměrů (Kč/den) – základ pro generování dat
const BASE_SPLIT: Record<string, { k: number; b: number }> = {
  'cg-brno':                { k: 50800, b: 22100 },
  'piazza':                 { k: 35600, b: 11500 },
  'monte':                  { k: 25200, b: 16900 },
  'u-capa':                 { k: 21900, b: 25400 },
  'korek-winebar':          { k:  5700, b: 24400 },
  'u-kohoutu':              { k: 19800, b: 23300 },
  'nad-hladinkou':          { k: 17700, b: 20300 },
  'flank':                  { k: 33500, b: 12800 },
  'cg-catering':            { k: 21700, b:  4400 },
  'tackarna-londyn':        { k: 15000, b:  3900 },
  'tackarna-turanka':       { k: 11800, b:  3300 },
  'tackarna-svedske-valy':  { k: 13400, b:  3500 },
  'teatr':                  { k: 26200, b: 19000 },
  'korek-wines':            { k:  4600, b: 17300 },
  'jime-brno':              { k: 29500, b:  8600 },
};

// Celkový průměr per provozovna (odvozeno ze splitů)
const BASE_DAY: Record<string, number> = Object.fromEntries(
  Object.entries(BASE_SPLIT).map(([id, { k, b }]) => [id, k + b])
);

// Denní cíl = průměr × 1.05 (5% nad průměrem)
const DAILY_TARGET: Record<string, number> = Object.fromEntries(
  Object.entries(BASE_DAY).map(([id, v]) => [id, Math.round(v * 1.05)])
);

// Den v týdnu multiplikátor (index 0 = pondělí, 6 = neděle)
const DOW_MULT = [0.80, 0.85, 0.90, 0.95, 1.12, 1.28, 1.12];

// Deterministická "variabilita" per datum × provozovna (bez random())
function detRand(dateStr: string, provId: string): number {
  let h = 0;
  for (const c of dateStr + provId) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return 0.88 + (h % 1000) / 4000; // rozsah ~0.88–1.13
}

function getDowFactor(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  const idx = dow === 0 ? 6 : dow - 1;
  const monthGrowth = 1 + Math.max(0, d.getMonth() - 2) * 0.015;
  return DOW_MULT[idx] * monthGrowth;
}

// Celková tržba per provozovna pro jeden den (pro multi-venue tabulku)
function genDayData(dateStr: string): Record<string, number> {
  const factor = getDowFactor(dateStr);
  const result: Record<string, number> = {};
  ACTIVE_PROVS.forEach((p) => {
    const base = BASE_DAY[p.id] ?? 0;
    if (!base) { result[p.id] = 0; return; }
    result[p.id] = Math.round(base * factor * detRand(dateStr, p.id));
  });
  return result;
}

// Split kuchyň/bar pro single-venue tabulku
function genDayDataSplit(dateStr: string, provId: string): { k: number; b: number; c: number } {
  const factor = getDowFactor(dateStr);
  const split  = BASE_SPLIT[provId] ?? { k: 0, b: 0 };
  const r      = detRand(dateStr, provId);
  const k = Math.round(split.k * factor * r);
  const b = Math.round(split.b * factor * r);
  return { k, b, c: k + b };
}

// Srovnávací hodnota D-7 (deterministicky stejná logika, posun o 7 dní)
function genD7Split(dateStr: string, provId: string): { k: number; b: number; c: number } {
  const d7 = new Date(dateStr + 'T12:00:00');
  d7.setDate(d7.getDate() - 7);
  const d7Str = d7.toISOString().split('T')[0];
  return genDayDataSplit(d7Str, provId);
}

// Vygeneruje pole datumů od-do (včetně)
function getDatesInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from + 'T12:00:00');
  const end = new Date(to   + 'T12:00:00');
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

type TableRow = { label: string; datum: string; byProv: Record<string, number> };

// Sestaví řádky tabulky (dny nebo měsíce)
function buildRows(from: string, to: string, monthly: boolean): TableRow[] {
  const dates = getDatesInRange(from, to);

  if (!monthly) {
    return dates.map((d) => ({
      label: fRowLabel(d),
      datum: d,
      byProv: genDayData(d),
    }));
  }

  // Agregace po měsících
  const months: Record<string, Record<string, number>> = {};
  dates.forEach((d) => {
    const key = d.slice(0, 7);
    if (!months[key]) months[key] = {};
    const day = genDayData(d);
    ACTIVE_PROVS.forEach((p) => {
      months[key][p.id] = (months[key][p.id] ?? 0) + (day[p.id] ?? 0);
    });
  });

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, byProv]) => ({
      label: fMonthLabel(key),
      datum: key + '-01',
      byProv,
    }));
}

function fRowLabel(d: string): string {
  const dt = new Date(d + 'T12:00:00');
  const wd = dt.toLocaleDateString('cs-CZ', { weekday: 'short' });
  return `${wd} ${dt.getDate()}.${dt.getMonth() + 1}.`;
}

function fMonthLabel(key: string): string {
  const dt = new Date(key + '-01T12:00:00');
  return dt.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
}

// ─── Roční / měsíční data pro graf a srovnávací tabulku ──────

// Sezónní faktory pro restaurace (index 0 = leden, 11 = prosinec)
const SEASONAL = [0.80, 0.75, 0.88, 0.95, 1.05, 1.10, 1.12, 1.08, 1.05, 0.98, 0.88, 1.18];

// 2026 má data jen do dubna (17. 4.)
const MAX_MONTH_2026 = 4;

// Dní v měsíci (s ohledem na omezení 2026)
function daysInMonth(year: number, month: number): number {
  if (year === 2026 && month === MAX_MONTH_2026) return 17; // duben jen do 17.4.
  if (year === 2026 && month > MAX_MONTH_2026)  return 0;  // budoucí měsíce nemají data
  return new Date(year, month, 0).getDate();               // standardní počet dnů
}

// Tržba jedné provozovny v daném měsíci a roce
function genMonthRevenue(year: number, month: number, provId: string): number {
  const fy = FOUNDING_YEAR[provId] ?? 2022;
  if (year < fy) return 0; // před vznikem podniku
  const days = daysInMonth(year, month);
  if (days === 0) return 0;
  const base = BASE_DAY[provId] ?? 0;
  if (!base) return 0;
  // Meziroční růst ~5 %: 2025 = baseline, každý rok zpět ×0,95
  const yFactor = year === 2026 ? 1.05
                : year === 2025 ? 1.0
                : Math.pow(0.95, 2025 - year);
  const r = detRand(`${year}-${String(month).padStart(2, '0')}`, provId);
  return Math.round(base * days * SEASONAL[month - 1] * yFactor * r);
}

// 12 měsíčních hodnot pro daný rok a provozovnu (null = aggregate vše)
function genYearData(year: number, provId: string | null): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    if (provId === null) {
      return ACTIVE_PROVS.reduce((s, p) => s + genMonthRevenue(year, month, p.id), 0);
    }
    return genMonthRevenue(year, month, provId);
  });
}

// Smooth SVG path přes body (cubic bezier / Catmull-Rom)
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  const t = 0.25; // tension
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
}

// Mock data otevřených / uzavřených účtů (aktuální den)
const UCTY_MOCK: Record<string, { otevrene: number; uzavrene: number; isLive: boolean }> = {
  'all':                   { otevrene: 12, uzavrene: 47, isLive: true  },
  'cg-brno':               { otevrene: 5,  uzavrene: 18, isLive: true  },
  'piazza':                { otevrene: 4,  uzavrene: 12, isLive: true  },
  'monte':                 { otevrene: 0,  uzavrene:  9, isLive: false }, // zavřeno
  'u-capa':                { otevrene: 6,  uzavrene: 22, isLive: true  },
  'korek-winebar':         { otevrene: 2,  uzavrene:  8, isLive: true  },
  'u-kohoutu':             { otevrene: 0,  uzavrene: 16, isLive: false }, // zavřeno
  'nad-hladinkou':         { otevrene: 0,  uzavrene: 14, isLive: false }, // zavřeno
  'flank':                 { otevrene: 5,  uzavrene: 19, isLive: true  },
  'cg-catering':           { otevrene: 0,  uzavrene:  3, isLive: false }, // catering hotov
  'tackarna-londyn':       { otevrene: 8,  uzavrene: 31, isLive: true  },
  'tackarna-turanka':      { otevrene: 6,  uzavrene: 24, isLive: true  },
  'tackarna-svedske-valy': { otevrene: 0,  uzavrene: 27, isLive: false }, // zavřeno
  'teatr':                 { otevrene: 3,  uzavrene: 11, isLive: true  },
  'korek-wines':           { otevrene: 2,  uzavrene:  7, isLive: true  },
  'jime-brno':             { otevrene: 0,  uzavrene: 16, isLive: false }, // obědy – zavřeno odpoledne
};

// Roky vzniku provozoven (mock data)
const FOUNDING_YEAR: Record<string, number> = {
  'cg-brno': 2018, 'piazza': 2006, 'monte': 2021, 'u-capa': 2020,
  'korek-winebar': 2022, 'u-kohoutu': 2021, 'nad-hladinkou': 2022,
  'flank': 2023, 'cg-catering': 2020, 'tackarna-londyn': 2023,
  'tackarna-turanka': 2024, 'tackarna-svedske-valy': 2024,
  'teatr': 2022, 'korek-wines': 2023, 'jime-brno': 2024,
};

// Roční tržba provozovny (pro historický přehled)
function genAnnualRevenue(year: number, provId: string): number {
  const fy = FOUNDING_YEAR[provId] ?? 2022;
  if (year < fy || year > 2026) return 0;
  if (year >= 2025) return genYearData(year, provId).reduce((s, v) => s + v, 0);
  const base = genYearData(2025, provId).reduce((s, v) => s + v, 0);
  const back = 2025 - year;
  const r    = detRand(`ann-${year}`, provId);
  return Math.round(base * Math.pow(0.88, back) * (0.93 + r * 0.14));
}

// Skupiny provozoven pro výběr
const PROV_GROUPS = [
  { label: 'Všechny', ids: null as string[] | null },
  { label: 'Restaurace', ids: ['cg-brno', 'piazza', 'monte', 'teatr', 'jime-brno'] },
  { label: 'Pivnice', ids: ['u-capa', 'u-kohoutu', 'nad-hladinkou'] },
  { label: 'Táckárny', ids: ['tackarna-londyn', 'tackarna-turanka', 'tackarna-svedske-valy'] },
  { label: 'KOREK', ids: ['korek-winebar', 'korek-wines'] },
  { label: 'Ostatní', ids: ['flank', 'cg-catering'] },
];

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

// Předdefinované filtry pro Tržby detail (referenční datum: 2026-04-17)
const DATE_PRESETS: { label: string; from: string; to: string }[] = [
  { label: 'Dnes',           from: '2026-04-17', to: '2026-04-17' },
  { label: 'Včera',          from: '2026-04-16', to: '2026-04-16' },
  { label: 'Aktuální týden', from: '2026-04-13', to: '2026-04-17' },
  { label: 'Minulý týden',   from: '2026-04-06', to: '2026-04-12' },
  { label: 'Aktuální měsíc', from: '2026-04-01', to: '2026-04-17' },
  { label: 'Minulý měsíc',   from: '2026-03-01', to: '2026-03-31' },
  { label: 'Aktuální rok',   from: '2026-01-01', to: '2026-04-17' },
  { label: 'Minulý rok',     from: '2025-01-01', to: '2025-12-31' },
];

export default function TrzbyView({ state, update }: Props) {
  const { selectedProvozovna } = state;

  // Detail table local state
  const [tableFrom, setTableFrom] = useState('2026-04-11');
  const [tableTo,   setTableTo]   = useState('2026-04-17');

  // Graf vývoje – multi-select podniků + přepínač módů + parametry
  const [chartIds,    setChartIds]    = useState<Set<string>>(new Set(['cg-brno', 'piazza', 'monte']));
  const [chartMode,   setChartMode]   = useState<'roky' | 'rok-mesice' | 'mesic-roky'>('roky');
  const [chartPeriod, setChartPeriod] = useState<'3' | '5' | '10' | 'vse'>('vse');
  const [chartYear,   setChartYear]   = useState(2025); // pro mód rok-mesice
  const [chartMonth,  setChartMonth]  = useState(1);    // pro mód mesic-roky (1=leden)

  const toggleChart = (id: string) => setChartIds(prev => {
    const n = new Set(prev);
    if (n.has(id) && n.size > 1) n.delete(id);
    else n.add(id);
    return n;
  });
  const chartProvs = ACTIVE_PROVS.filter(p => chartIds.has(p.id) && (BASE_DAY[p.id] ?? 0) > 0);

  // Počáteční rok grafu – jen pro mód roky
  const chartFromYear = useMemo(() => {
    if (chartMode !== 'roky') return 2026;
    if (chartPeriod === 'vse') {
      return chartProvs.length
        ? Math.min(...chartProvs.map((p) => FOUNDING_YEAR[p.id] ?? 2022))
        : 2018;
    }
    return 2026 - parseInt(chartPeriod) + 1;
  }, [chartMode, chartPeriod, chartProvs]);

  // Počáteční rok pro mód mesic-roky (nejstarší founding mezi vybranými)
  const mesicRokyFromYear = useMemo(() => {
    return chartProvs.length
      ? Math.min(...chartProvs.map((p) => FOUNDING_YEAR[p.id] ?? 2022))
      : 2018;
  }, [chartProvs]);

  // Single-venue mód → řídí globální výběr v topbaru
  const isSingleVenue = selectedProvozovna !== 'all';
  const singleProv    = isSingleVenue ? ACTIVE_PROVS.find((p) => p.id === selectedProvozovna) : undefined;

  // Počet dní v rozsahu → rozhoduje dny vs. měsíce
  const dayDiff = useMemo(() => {
    const a = new Date(tableFrom + 'T12:00:00');
    const b = new Date(tableTo   + 'T12:00:00');
    return Math.round((b.getTime() - a.getTime()) / 86_400_000);
  }, [tableFrom, tableTo]);
  const isMonthly = dayDiff > 45;

  // Sloupce tabulky (multi-venue mód) – vždy všechny aktivní provozovny
  const tableCols = useMemo(() => {
    if (isSingleVenue) return [];
    return ACTIVE_PROVS.filter((p) => (BASE_DAY[p.id] ?? 0) > 0);
  }, [isSingleVenue]);

  // Řádky tabulky
  const tableRows = useMemo(() => {
    if (!tableFrom || !tableTo || tableFrom > tableTo || dayDiff < 0 || dayDiff > 730) return [];
    return buildRows(tableFrom, tableTo, isMonthly).reverse();
  }, [tableFrom, tableTo, isMonthly, dayDiff]);

  // ── KPI data ─────────────────────────────────────────────────

  const dnes     = getTrzbyDnes(selectedProvozovna);
  const d7       = getTrzbyD7(selectedProvozovna);
  const dnesChng = pctChange(dnes.celkem, d7.celkem);

  const vcera     = getTotalForPeriod(selectedProvozovna, 'vcera');
  const vceraComp = getPrevForPeriod(selectedProvozovna, 'vcera');
  const vceraChng = pctChange(vcera.celkem, vceraComp.celkem);

  const tyden         = getTotalForPeriod(selectedProvozovna, 'tyden');
  const tydenComp     = getPrevForPeriod(selectedProvozovna, 'tyden'); // celý minulý týden (7 dní)
  const TYDEN_DNI     = 5;  // Po–Čtv (dnů proběhlých k 17.4.)
  const TYDEN_DNI_CEL = 7;  // celý týden Po–Ne
  // % badge: srovnání stejného počtu dní (5 dní loni vs. 5 dní letos)
  const tydenCompSameDni = Math.round(tydenComp.celkem * TYDEN_DNI / TYDEN_DNI_CEL);
  const tydenChng     = pctChange(tyden.celkem, tydenCompSameDni);
  // Predikce do konce týdne: průměr/den × 7
  const tydenPredikce = Math.round((tyden.celkem / TYDEN_DNI) * TYDEN_DNI_CEL);

  const mesic = getMesicVsLY(selectedProvozovna);

  const pocetDni        = mesic.cur2026?.pocetDni ?? 17;
  // vs. = celý duben 2025 (ne jen stejné období)
  const ly2025FullMonth = mesic.ly2025?.sumaCelyMesic ?? (mesic.ly2025 ? mesic.ly2025.prumerDen * 30 : 0);
  const mesicSameChng   = mesic.cur2026 && ly2025FullMonth > 0
    ? pctChange(mesic.cur2026.sumaDoDnes, ly2025FullMonth) : 0;
  // Predikce = průměrná denní tržba × počet dní v měsíci
  const totalDniMesic = 30; // duben má 30 dní
  const mesicPredikce = mesic.cur2026
    ? Math.round((mesic.cur2026.sumaDoDnes / pocetDni) * totalDniMesic) : 0;

  // Otevřené / uzavřené účty (dnešní den)
  const ucty = UCTY_MOCK[selectedProvozovna] ?? UCTY_MOCK['all'];

  // ── Render ────────────────────────────────────────────────────

  return (
    <>
      {/* ═══ SEKCE 1: KPI přehled – boxíky ══════════════════════ */}
      <div className="card mb-3" style={{ borderTop: '3px solid var(--prov-color, #c9911a)' }}>
        <div className="card-header trzby-detail-header-sticky">
          <h5 className="card-title mb-0">Přehled tržeb</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">

            {/* Boxík: Dnes – LIVE + účty */}
            <div className="col-12 col-sm-6 col-xl-3">
              <DnesKpiBox
                value={dnes.celkem}
                otevrene={ucty.otevrene}
                uzavrene={ucty.uzavrene}
              />
            </div>

            {/* Boxík: Včera */}
            <div className="col-12 col-sm-6 col-xl-3">
              <KpiBox
                period="Včera"
                sub="16.4.2026 · středa"
                value={vcera.celkem}
                compLabel="vs. středa 9.4.2026"
                compValue={vceraComp.celkem}
                chng={vceraChng}
                isLive
              />
            </div>

            {/* Boxík: Tento týden */}
            <div className="col-12 col-sm-6 col-xl-3">
              <KpiBox
                period="Tento týden"
                sub={`13.4. – 17.4.2026 · ${TYDEN_DNI} dní`}
                value={tyden.celkem}
                compLabel="vs. minulý týden (6.4.–12.4., celý)"
                compValue={tydenComp.celkem}
                chng={tydenChng}
                prediction={tydenPredikce}
                predictionLabel="Predikce do konce týdne"
              />
            </div>

            {/* Boxík: Měsíc + predikce do konce dubna */}
            {mesic.cur2026 && mesic.ly2025 && (
              <div className="col-12 col-sm-6 col-xl-3">
                <KpiBox
                  period="Duben 2026"
                  sub={`1.4. – 17.4. · ${pocetDni} dní`}
                  value={mesic.cur2026.sumaDoDnes}
                  compLabel={`vs. duben ${mesic.ly2025.rok} (celý měsíc)`}
                  compValue={ly2025FullMonth}
                  chng={mesicSameChng}
                  prediction={mesicPredikce}
                  predictionLabel="Predikce za celý duben"
                />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ═══ SEKCE 2: Tržby detail – velká tabulka ══════════════ */}
      <div className="card mb-4">
        <div className="card-header trzby-detail-header-sticky">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h5 className="card-title mb-0">
              Tržby detail
              {isSingleVenue && singleProv && (
                <span className="ms-2 fw-normal fs-13 text-muted">
                  <span className="rounded-circle d-inline-block me-1" style={{ width: 8, height: 8, background: singleProv.color }} />
                  {singleProv.name}
                </span>
              )}
            </h5>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Přednastavené filtry */}
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={DATE_PRESETS.find((p) => p.from === tableFrom && p.to === tableTo)?.label ?? ''}
                onChange={(e) => {
                  const preset = DATE_PRESETS.find((p) => p.label === e.target.value);
                  if (preset) { setTableFrom(preset.from); setTableTo(preset.to); }
                }}
              >
                <option value="" disabled>Rychlý výběr…</option>
                {DATE_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
              </select>
              <div className="topbar-divider" />
              <div className="d-flex align-items-center gap-1">
                <span className="text-muted fs-12">Od</span>
                <input type="date" className="form-control form-control-sm" style={{ width: 140 }}
                  value={tableFrom} onChange={(e) => setTableFrom(e.target.value)} />
              </div>
              <div className="d-flex align-items-center gap-1">
                <span className="text-muted fs-12">Do</span>
                <input type="date" className="form-control form-control-sm" style={{ width: 140 }}
                  value={tableTo} onChange={(e) => setTableTo(e.target.value)} />
              </div>
              <span className="badge bg-light text-muted border fs-11">
                {isMonthly ? `Měsíce · ${tableRows.length} řádků` : `Dny · ${tableRows.length} řádků`}
              </span>
            </div>
          </div>
        </div>

        {/* Tabulka se sticky sloupci */}
        <div className="trzby-detail-wrap">
          {tableRows.length === 0 ? (
            <div className="p-4 text-center text-muted fs-13">
              Vyberte platný rozsah dat (max. 2 roky).
            </div>
          ) : isSingleVenue && singleProv ? (

            /* ── Single venue: Kuchyň / Bar / Celkem / vs. D-7 ── */
            <table className="trzby-detail-table">
              <thead>
                <tr>
                  <th className="trzby-col-date trzby-sticky-l">
                    <div className="d-flex align-items-center gap-1">
                      <span className="rounded-circle" style={{ width: 8, height: 8, background: singleProv.color, display: 'inline-block' }} />
                      {isMonthly ? 'Měsíc' : 'Datum'}
                    </div>
                  </th>
                  <th className="trzby-col-prov" style={{ color: '#1c84ee' }}>Kuchyň</th>
                  <th className="trzby-col-prov" style={{ color: '#22c55e' }}>Bar</th>
                  <th className="trzby-col-prov">Celkem</th>
                  <th className="trzby-col-prov trzby-sticky-r" style={{ minWidth: 110 }}>vs. D-7</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => {
                  const split  = genDayDataSplit(row.datum, singleProv.id);
                  const d7     = isMonthly ? null : genD7Split(row.datum, singleProv.id);
                  const d7Chng = d7 ? Math.round(((split.c - d7.c) / Math.max(d7.c, 1)) * 1000) / 10 : null;
                  const d7Up   = d7Chng != null && d7Chng >= 0;

                  const isToday = row.datum === '2026-04-17';
                  const provLive = isToday && (UCTY_MOCK[singleProv.id]?.isLive ?? false);
                  return (
                    <tr key={row.datum}>
                      <td className="trzby-col-date trzby-sticky-l fw-semibold">{row.label}</td>
                      <td className="trzby-col-prov text-end czk-num" style={{ color: '#1c84ee' }}>
                        {fCzk(split.k)}
                      </td>
                      <td className="trzby-col-prov text-end czk-num" style={{ color: '#22c55e' }}>
                        {fCzk(split.b)}
                      </td>
                      <td className="trzby-col-prov text-end czk-num fw-semibold">
                        <span className="d-inline-flex align-items-center justify-content-end gap-1">
                          {provLive && <span className="trzby-live-dot flex-shrink-0" style={{ width: 5, height: 5 }} />}
                          {fCzk(split.c)}
                        </span>
                      </td>
                      <td className="trzby-col-prov trzby-sticky-r text-end">
                        {d7Chng != null ? (
                          <span className={`badge ${d7Up ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`} style={{ fontSize: 11 }}>
                            <iconify-icon icon={d7Up ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} />
                            {' '}{d7Up ? '+' : ''}{d7Chng.toFixed(1).replace('.', ',')} %
                          </span>
                        ) : (
                          <span className="text-muted fs-12">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="trzby-col-date trzby-sticky-l fw-bold">Celkem</td>
                  <td className="trzby-col-prov text-end czk-num fw-bold" style={{ color: '#1c84ee' }}>
                    {fCzk(tableRows.reduce((s, r) => s + genDayDataSplit(r.datum, singleProv.id).k, 0))}
                  </td>
                  <td className="trzby-col-prov text-end czk-num fw-bold" style={{ color: '#22c55e' }}>
                    {fCzk(tableRows.reduce((s, r) => s + genDayDataSplit(r.datum, singleProv.id).b, 0))}
                  </td>
                  <td className="trzby-col-prov text-end czk-num fw-bold">
                    {fCzk(tableRows.reduce((s, r) => s + genDayDataSplit(r.datum, singleProv.id).c, 0))}
                  </td>
                  <td className="trzby-col-prov trzby-sticky-r text-end text-muted fs-12">—</td>
                </tr>
              </tfoot>
            </table>

          ) : (

            /* ── Multi venue: jeden sloupec per provozovna ─────── */
            <table className="trzby-detail-table">
              <thead>
                <tr>
                  <th className="trzby-col-date trzby-sticky-l">
                    {isMonthly ? 'Měsíc' : 'Datum'}
                  </th>
                  {tableCols.map((p) => (
                    <th key={p.id} className="trzby-col-prov">
                      <div className="d-flex align-items-center justify-content-end gap-1">
                        <span className="rounded-circle" style={{ width: 7, height: 7, background: p.color, display: 'inline-block', flexShrink: 0 }} />
                        {p.shortName}
                      </div>
                    </th>
                  ))}
                  <th className="trzby-col-total trzby-sticky-r">Celkem</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => {
                  const total = tableCols.reduce((s, p) => s + (row.byProv[p.id] ?? 0), 0);
                  const isToday = row.datum === '2026-04-17';
                  // Alespoň jeden podnik z výběru ještě běží → live tečka u Celkem
                  const anyLive = isToday && tableCols.some((p) => UCTY_MOCK[p.id]?.isLive);
                  return (
                    <tr key={row.datum}>
                      <td className="trzby-col-date trzby-sticky-l fw-semibold">{row.label}</td>
                      {tableCols.map((p) => {
                        const val = row.byProv[p.id] ?? 0;
                        const provLive = isToday && (UCTY_MOCK[p.id]?.isLive ?? false);
                        return (
                          <td key={p.id} className="trzby-col-prov text-end czk-num">
                            {val > 0
                              ? <span className="d-inline-flex align-items-center justify-content-end gap-1">
                                  {provLive && <span className="trzby-live-dot flex-shrink-0" style={{ width: 5, height: 5 }} />}
                                  {fCzk(val)}
                                </span>
                              : <span className="text-muted">—</span>}
                          </td>
                        );
                      })}
                      <td className="trzby-col-total trzby-sticky-r czk-num fw-bold">
                        <span className="d-inline-flex align-items-center justify-content-end gap-1">
                          {anyLive && <span className="trzby-live-dot flex-shrink-0" style={{ width: 5, height: 5 }} />}
                          {fCzk(total)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="trzby-col-date trzby-sticky-l fw-bold">Celkem</td>
                  {tableCols.map((p) => {
                    const sum = tableRows.reduce((s, r) => s + (r.byProv[p.id] ?? 0), 0);
                    return (
                      <td key={p.id} className="trzby-col-prov text-end czk-num fw-bold">
                        {fCzk(sum)}
                      </td>
                    );
                  })}
                  <td className="trzby-col-total trzby-sticky-r czk-num fw-bold">
                    {fCzk(tableRows.reduce((s, r) =>
                      s + tableCols.reduce((ss, p) => ss + (r.byProv[p.id] ?? 0), 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>

          )}
        </div>
      </div>

      {/* ═══ SEKCE 3: Graf vývoje ════════════════════════════════ */}
      <div className="card mb-3">
        <div className="card-header trzby-detail-header-sticky">
          {/* Řádek 1: název + přepínače */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <div>
              <h5 className="card-title mb-0">Vývoj tržeb</h5>
              <small className="text-muted fw-normal">
                {chartMode === 'roky'
                  ? `Roční přehled · ${chartFromYear}–2026 · *duben 2026`
                  : chartMode === 'rok-mesice'
                  ? `Měsíční přehled · rok ${chartYear}`
                  : `${['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'][chartMonth-1]} · ${mesicRokyFromYear}–2026`}
              </small>
            </div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Mód přepínač */}
              <div className="lk-segment">
                <button className={`lk-seg-btn${chartMode === 'roky'       ? ' active' : ''}`} onClick={() => setChartMode('roky')}>Roky</button>
                <button className={`lk-seg-btn${chartMode === 'rok-mesice' ? ' active' : ''}`} onClick={() => setChartMode('rok-mesice')}>Rok › měsíce</button>
                <button className={`lk-seg-btn${chartMode === 'mesic-roky' ? ' active' : ''}`} onClick={() => setChartMode('mesic-roky')}>Měsíc › roky</button>
              </div>
              {/* Délka období – jen v Roky módu */}
              {chartMode === 'roky' && (
                <div className="lk-segment">
                  {(['3', '5', '10', 'vse'] as const).map((p) => (
                    <button key={p}
                      className={`lk-seg-btn${chartPeriod === p ? ' active' : ''}`}
                      onClick={() => setChartPeriod(p)}
                    >
                      {p === 'vse' ? 'Vše' : p === '3' ? '3 roky' : p === '5' ? '5 let' : '10 let'}
                    </button>
                  ))}
                </div>
              )}
              {/* Výběr roku – pro mód rok-mesice */}
              {chartMode === 'rok-mesice' && (
                <select className="form-select form-select-sm" style={{ width: 'auto' }}
                  value={chartYear} onChange={(e) => setChartYear(parseInt(e.target.value))}>
                  {Array.from({ length: 2026 - 2006 + 1 }, (_, i) => 2026 - i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}
              {/* Výběr měsíce – pro mód mesic-roky */}
              {chartMode === 'mesic-roky' && (
                <select className="form-select form-select-sm" style={{ width: 'auto' }}
                  value={chartMonth} onChange={(e) => setChartMonth(parseInt(e.target.value))}>
                  {['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'].map((m, i) => (
                    <option key={i+1} value={i+1}>{m}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          {/* Řádek 2: toggle tlačítka podniků */}
          <div className="d-flex flex-wrap gap-1">
            {ACTIVE_PROVS.filter((p) => BASE_DAY[p.id] > 0).map((p) => {
              const sel = chartIds.has(p.id);
              return (
                <button
                  key={p.id}
                  className="trzby-chart-toggle"
                  style={sel ? { background: p.color, borderColor: p.color, color: 'white' } : {}}
                  onClick={() => toggleChart(p.id)}
                >
                  {p.shortName}
                </button>
              );
            })}
          </div>
        </div>
        <div className="card-body pb-2">
          <div className="lk-custom">
            <div className="lk-custom-label">CUSTOM: SVG multi-line chart → ApexCharts v produkci</div>
            <VyvojChart provs={chartProvs} mode={chartMode} fromYear={chartFromYear} year={chartYear} month={chartMonth} mesicRokyFromYear={mesicRokyFromYear} />
          </div>
        </div>

        {/* Tabulka – součást stejné karty jako graf */}
        <div className="border-top px-3 py-2 d-flex align-items-center gap-2">
          <span className="text-uppercase fw-semibold text-muted fs-11">
            {chartMode === 'roky' ? 'Přehled po rocích' : chartMode === 'rok-mesice' ? `Přehled po měsících · ${chartYear}` : `Přehled po rocích · ${['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'][chartMonth-1]}`}
          </span>
          {chartMode === 'roky' && <span className="text-muted fs-11">· {chartFromYear}–2026 · *duben = leden–duben</span>}
        </div>
        <div className="trzby-detail-wrap">
          <RocniVyvojTable provs={chartProvs} mode={chartMode} fromYear={chartFromYear} year={chartYear} month={chartMonth} mesicRokyFromYear={mesicRokyFromYear} />
        </div>
      </div>

      {/* ═══ SEKCE 4: Roční srovnávací tabulka ══════════════════ */}
      <div className="card mb-4">
        <div className="card-header trzby-detail-header-sticky d-flex align-items-start justify-content-between gap-2 flex-wrap">
          <div style={{ minWidth: 0 }}>
            <h5 className="card-title mb-0">Historický přehled tržeb po měsících</h5>
            <small className="text-muted fw-normal">Každý podnik od roku vzniku · sloupce = měsíce · % = meziroční změna</small>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap flex-shrink-0">
            <span className="badge bg-success-subtle text-success fs-11">↑ meziroční růst</span>
            <span className="badge bg-danger-subtle text-danger fs-11">↓ meziroční pokles</span>
          </div>
        </div>
        <div className="trzby-detail-wrap">
          <RocniSrovnaniTable />
        </div>
      </div>
    </>
  );
}

// ─── Sub-komponenty ───────────────────────────────────────────

// COMPONENT: KPI boxík (Dnes / Včera / Týden / Měsíc)
// SOURCE: Bootstrap card / Larkon _card.scss
// CUSTOM: YES – .trzby-box layout

// COMPONENT: Dnes – Live boxík s účty
// CUSTOM: YES

function DnesKpiBox({ value, otevrene, uzavrene }: {
  value: number;
  otevrene: number;
  uzavrene: number;
}) {
  const total = otevrene + uzavrene || 1;
  // Hodnota otevřených (~35 % dne, účty v provozu) a uzavřených (zbytek)
  const hodnotaOtevrene = Math.round(value * (otevrene / total) * 0.65);
  const hodnotaUzavrene = value - hodnotaOtevrene;
  return (
    <div className="trzby-box h-100">
      <div className="trzby-box-head">
        <span className="trzby-box-period">Dnes</span>
        <span className="badge bg-success-subtle text-success trzby-box-badge d-flex align-items-center gap-1">
          <span className="trzby-live-dot" />
          Live
        </span>
      </div>
      <div className="trzby-box-value czk-num">{fCzk(value)}</div>
      <div className="trzby-box-sub">17.4.2026 · čtvrtek</div>
      <div className="trzby-box-divider" />
      <div className="trzby-box-comp">
        <span className="d-flex align-items-center gap-1">
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
          Otevřené účty
        </span>
        <span className="trzby-box-comp-amount czk-num" style={{ color: '#16a34a' }}>{fCzk(hodnotaOtevrene)}</span>
        <span className="text-muted" style={{ fontSize: 11 }}>{otevrene} účtů v provozu</span>
      </div>
      <div className="trzby-box-comp" style={{ marginTop: 4 }}>
        <span className="d-flex align-items-center gap-1">
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8', display: 'inline-block', flexShrink: 0 }} />
          Uzavřené účty
        </span>
        <span className="trzby-box-comp-amount czk-num text-muted">{fCzk(hodnotaUzavrene)}</span>
        <span className="text-muted" style={{ fontSize: 11 }}>{uzavrene} účtů uzavřeno</span>
      </div>
    </div>
  );
}

// COMPONENT: KPI boxík (Včera / Týden / Měsíc)
// CUSTOM: YES

function KpiBox({
  period, sub, value, compLabel, compValue, chng, prediction, predictionLabel, isLive,
}: {
  period: string;
  sub: string;
  value: number;
  compLabel: string;
  compValue: number;
  chng: number;
  prediction?: number;
  predictionLabel?: string;
  isLive?: boolean;
}) {
  const up = chng >= 0;
  return (
    <div className="trzby-box h-100">

      <div className="trzby-box-head">
        <span className="trzby-box-period d-flex align-items-center gap-1">
          {isLive && <span className="trzby-live-dot" style={{ width: 7, height: 7 }} />}
          {period}
        </span>
        <span className={`badge ${up ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} trzby-box-badge`}>
          <iconify-icon icon={up ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} />
          {' '}{up ? '+' : ''}{chng.toFixed(1).replace('.', ',')} %
        </span>
      </div>

      <div className="trzby-box-value czk-num">{fCzk(value)}</div>
      <div className="trzby-box-sub">{sub}</div>
      <div className="trzby-box-divider" />

      {prediction != null && (
        <div className="trzby-box-pred">
          <span>{predictionLabel ?? 'Predikce'}</span>
          <span className="trzby-box-pred-amount czk-num" style={{ color: '#7c3aed' }}>
            ~{fCzk(prediction)}
          </span>
        </div>
      )}

      <div className="trzby-box-comp">
        <span>{compLabel}</span>
        <span className="trzby-box-comp-amount czk-num">{fCzk(compValue)}</span>
      </div>

    </div>
  );
}

// ─── COMPONENT: Vývoj tržeb – SVG multi-line chart ───────────
// SOURCE: Larkon _card.scss + Bootstrap
// CUSTOM: YES – SVG smooth lines, více provozoven najednou

const MONTH_LABELS = ['Led', 'Únor', 'Bře', 'Dub', 'Kvě', 'Čer', 'Čec', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];
const CW = 700, CH = 210, ML = 62, MT = 16, MR = 16, MB = 38;
const IW = CW - ML - MR;
const IH = CH - MT - MB;

type ChartProv = typeof ACTIVE_PROVS[0];

function VyvojChart({ provs, mode, fromYear, year, month, mesicRokyFromYear }: {
  provs: ChartProv[];
  mode: 'roky' | 'rok-mesice' | 'mesic-roky';
  fromYear: number;
  year: number;
  month: number;
  mesicRokyFromYear: number;
}) {
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null);

  // X-osa závisí na módu
  const xLabels: string[] =
    mode === 'roky'
      ? Array.from({ length: 2026 - fromYear + 1 }, (_, i) => String(fromYear + i))
      : mode === 'rok-mesice'
      ? MONTH_LABELS
      : Array.from({ length: 2026 - mesicRokyFromYear + 1 }, (_, i) => String(mesicRokyFromYear + i));

  const N = xLabels.length;

  // Data per provozovna per x-bod
  const data: number[][] = provs.map((p) =>
    mode === 'roky'
      ? xLabels.map((y) => genAnnualRevenue(parseInt(y), p.id))
      : mode === 'rok-mesice'
      ? Array.from({ length: 12 }, (_, i) => genMonthRevenue(year, i + 1, p.id))
      : xLabels.map((y) => genMonthRevenue(parseInt(y), month, p.id))
  );

  const allVals  = data.flatMap((d) => d).filter((v) => v > 0);
  const maxVal   = Math.max(...allVals, 1);
  const yMax     = Math.ceil(maxVal / 1_000_000) * 1_000_000 || Math.ceil(maxVal / 100_000) * 100_000;
  const gridVals = [yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  function xPx(i: number) { return N > 1 ? ML + (i / (N - 1)) * IW : ML + IW / 2; }
  function yPx(v: number) { return MT + IH - (v / yMax) * IH; }
  function fmtY(v: number) { return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1_000)}k`; }

  const xHalf = N > 1 ? (IW / (N - 1)) / 2 : IW / 2;

  // Placeholder když nic není vybráno
  if (!provs.length) {
    return (
      <div style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="text-muted fs-13">
        Vyberte alespoň jeden podnik pomocí tlačítek výše.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: 230 }}>
      <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', height: '100%', display: 'block' }}>

        {/* Grid */}
        {gridVals.map((gv, gi) => (
          <g key={gi}>
            <line x1={ML} y1={yPx(gv)} x2={CW-MR} y2={yPx(gv)} stroke="#eaedf1" strokeWidth="1" strokeDasharray="4 3" />
            <text x={ML-6} y={yPx(gv)+4} textAnchor="end" fontSize="9" fill="#9097a7">{fmtY(gv)}</text>
          </g>
        ))}
        <line x1={ML} y1={MT+IH} x2={CW-MR} y2={MT+IH} stroke="#eaedf1" strokeWidth="1" />

        {/* Linie per provozovna – začínají od nuly (0 = před vznikem) */}
        {provs.map((prov, pi) => {
          const pts = data[pi].map((v, i) => ({ x: xPx(i), y: yPx(Math.max(v, 0)), v, has: v > 0 }));
          // Všechny body (incl. nuly) pro plnou liniovou cestu – vizuálně roste od 0
          if (pts.length < 2) return null;
          // Části s daty (ne-nulové) pro plochu pod liniemi
          const nonZeroPts = pts.filter((p) => p.has);
          return (
            <g key={prov.id}>
              {/* Area fill – jen nad nulou */}
              {nonZeroPts.length > 1 && (
                <path
                  d={`${smoothPath(nonZeroPts)} L ${nonZeroPts[nonZeroPts.length-1].x},${MT+IH} L ${nonZeroPts[0].x},${MT+IH} Z`}
                  fill={prov.color} fillOpacity="0.07"
                />
              )}
              {/* Linie – přes VŠECHNY body (nuly táhnou linii na osu X) */}
              <path d={smoothPath(pts)} fill="none" stroke={prov.color} strokeWidth="2.2" opacity="0.9" />
              {/* Tečky – jen kde existují reálná data */}
              {pts.map((p, i) => p.has ? (
                <circle key={i} cx={p.x} cy={p.y}
                  r={tooltipIdx === i ? 5.5 : 3.5}
                  fill={prov.color} stroke="white" strokeWidth="1.5"
                  style={{ transition: 'r 0.1s' }}
                />
              ) : null)}
            </g>
          );
        })}

        {/* Hover plochy */}
        {xLabels.map((_, i) => (
          <rect key={i} x={xPx(i) - xHalf} y={MT} width={N > 1 ? IW/(N-1) : IW} height={IH}
            fill="transparent" style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setTooltipIdx(i)}
            onMouseLeave={() => setTooltipIdx(null)}
          />
        ))}

        {/* Hover vertikální linka */}
        {tooltipIdx != null && (
          <line x1={xPx(tooltipIdx)} y1={MT} x2={xPx(tooltipIdx)} y2={MT+IH}
            stroke="#64748b" strokeWidth="1" strokeDasharray="3 2" opacity="0.4" />
        )}

        {/* X popisky */}
        {xLabels.map((lbl, i) => (
          <text key={i} x={xPx(i)} y={MT+IH+22} textAnchor="middle" fontSize="9"
            fill={tooltipIdx === i ? '#313b5e' : '#9097a7'}
            fontWeight={tooltipIdx === i ? '700' : '400'}>
            {lbl}
          </text>
        ))}

        {/* 2026 = částečný rok (jen v ročním módu) */}
        {mode === 'roky' && N > 0 && (
          <text x={xPx(N-1)} y={MT+IH+34} textAnchor="middle" fontSize="8" fill="#9097a7">
            *led–dub
          </text>
        )}
        {/* Duben 2026 = částečný měsíc (jen v rok-mesice pro rok 2026) */}
        {mode === 'rok-mesice' && year === 2026 && (
          <text x={xPx(3)} y={MT+IH+34} textAnchor="middle" fontSize="8" fill="#9097a7">
            *17 dní
          </text>
        )}

      </svg>

      {/* Tooltip */}
      {tooltipIdx != null && (() => {
        const xPct = ((xPx(tooltipIdx) - ML) / IW) * 100;
        const hasAny = provs.some((_, pi) => data[pi][tooltipIdx] > 0);
        if (!hasAny) return null;
        return (
          <div style={{ position: 'absolute', left: `clamp(10px, ${xPct}%, calc(100% - 220px))`, top: 0, background: '#313b5e', color: 'white', borderRadius: 8, padding: '9px 13px', fontSize: 11, pointerEvents: 'none', zIndex: 10, minWidth: 190, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 12 }}>
              {mode === 'rok-mesice'
                ? `${xLabels[tooltipIdx]} ${year}`
                : mode === 'mesic-roky'
                ? `${MONTH_LABELS[month-1]} ${xLabels[tooltipIdx]}`
                : `${xLabels[tooltipIdx]}${tooltipIdx === N-1 ? ' *' : ''}`}
            </div>
            {provs.map((prov, pi) => {
              const v = data[pi][tooltipIdx];
              return v > 0 ? (
                <div key={prov.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
                  <span style={{ color: prov.color }}>{prov.shortName}</span>
                  <span style={{ fontWeight: 600 }}>{fCzk(v)}</span>
                </div>
              ) : null;
            })}
          </div>
        );
      })()}
    </div>
  );
}

// ─── COMPONENT: Přehled podniků po rocích ──────────────────────
// SOURCE: Larkon _tables.scss + Bootstrap
// CUSTOM: NO – sticky first column, annual data

const MONTH_FULL = ['Leden','Únor','Březen','Duben','Květen','Červen','Červenec','Srpen','Září','Říjen','Listopad','Prosinec'];

function RocniVyvojTable({ provs, mode, fromYear, year, month, mesicRokyFromYear }: {
  provs: ChartProv[];
  mode: 'roky' | 'rok-mesice' | 'mesic-roky';
  fromYear: number;
  year: number;
  month: number;
  mesicRokyFromYear: number;
}) {
  if (!provs.length) {
    return <div className="p-4 text-center text-muted fs-13">Vyberte provozovny v grafu výše.</div>;
  }

  // Sloupce a hodnoty závisí na módu
  const cols: { key: string; label: string; sub?: string }[] =
    mode === 'roky'
      ? Array.from({ length: 2026 - fromYear + 1 }, (_, i) => {
          const y = fromYear + i;
          return { key: String(y), label: String(y), sub: y === 2026 ? '*led–dub' : undefined };
        })
      : mode === 'rok-mesice'
      ? MONTH_LABELS.map((lbl, i) => ({
          key: String(i + 1),
          label: lbl,
          sub: year === 2026 && i === 3 ? '*17 dní' : undefined,
        }))
      : Array.from({ length: 2026 - mesicRokyFromYear + 1 }, (_, i) => {
          const y = mesicRokyFromYear + i;
          return { key: String(y), label: String(y), sub: y === 2026 ? '*17 dní' : undefined };
        });

  function getValue(prov: ChartProv, colKey: string): number {
    if (mode === 'roky')       return genAnnualRevenue(parseInt(colKey), prov.id);
    if (mode === 'rok-mesice') return genMonthRevenue(year, parseInt(colKey), prov.id);
    return genMonthRevenue(parseInt(colKey), month, prov.id);
  }

  return (
    <table className="trzby-detail-table">
      <thead>
        <tr>
          <th className="trzby-col-date trzby-sticky-l" style={{ minWidth: 130, maxWidth: 160 }}>Provozovna</th>
          {cols.map((col) => (
            <th key={col.key} className="trzby-col-prov" style={{ minWidth: 90, textAlign: 'right' }}>
              <span style={{ display: 'block', lineHeight: 1.2 }}>{col.label}</span>
              {col.sub && (
                <span style={{ display: 'block', fontSize: 9, fontWeight: 400, color: 'var(--bs-secondary-color)' }}>{col.sub}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {provs.map((prov) => {
          const fy = FOUNDING_YEAR[prov.id] ?? 2022;
          return (
            <tr key={prov.id}>
              <td className="trzby-col-date trzby-sticky-l">
                <div className="d-flex align-items-center gap-1" style={{ minWidth: 0 }}>
                  <span className="rounded-circle flex-shrink-0" style={{ width: 7, height: 7, background: prov.color, display: 'inline-block' }} />
                  <span className="fw-semibold fs-12" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                    {prov.shortName}
                  </span>
                </div>
                <div className="text-muted" style={{ fontSize: 10, paddingLeft: 11 }}>od {fy}</div>
              </td>
              {cols.map((col) => {
                const v = getValue(prov, col.key);
                return (
                  <td key={col.key} className="trzby-col-prov text-end">
                    {v > 0
                      ? <span className="czk-num fw-semibold fs-12">{fCzk(v)}</span>
                      : <span className="text-muted fs-12">—</span>}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td className="trzby-col-date trzby-sticky-l fw-bold fs-12">Celkem</td>
          {cols.map((col) => {
            const sum = provs.reduce((s, p) => s + getValue(p, col.key), 0);
            return (
              <td key={col.key} className="trzby-col-prov text-end czk-num fw-bold fs-12">
                {sum > 0 ? fCzk(sum) : <span className="text-muted">—</span>}
              </td>
            );
          })}
        </tr>
      </tfoot>
    </table>
  );
}


// ─── COMPONENT: Roční srovnávací tabulka ─────────────────────
// SOURCE: Larkon _tables.scss + Bootstrap
// CUSTOM: NO – sticky first column, badge per buňka

function RocniSrovnaniTable() {
  const provs = ACTIVE_PROVS.filter((p) => BASE_DAY[p.id] > 0);
  // Sbalené podniky – defaultně vše sbaleno
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(provs.map((p) => p.id)));
  const toggle = (id: string) => setCollapsed(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  return (
    <table className="trzby-detail-table trzby-rs-table">
      <thead>
        <tr>
          <th className="trzby-rs-venue-h">Provozovna</th>
          <th className="trzby-rs-year-h">Rok</th>
          {MONTH_LABELS.map((m, i) => (
            <th key={i} className="trzby-col-prov" style={{ minWidth: 95, textAlign: 'right' }}>
              {m}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {provs.map((prov) => {
          const fy       = FOUNDING_YEAR[prov.id] ?? 2022;
          const allYears = Array.from({ length: 2026 - fy + 1 }, (_, i) => 2026 - i);
          const isCollapsed = collapsed.has(prov.id);
          const canCollapse = allYears.length > 2;
          // Sbaleno = jen 2026 + 2025, rozbaleno = všechny roky
          const years = isCollapsed ? allYears.slice(0, 2) : allYears;

          return (
            <Fragment key={prov.id}>
              {years.map((year, yi) => {
                const isNewest = yi === 0;
                const isOldest = yi === years.length - 1;
                const prevYear = year - 1;

                return (
                  <tr key={year} className={`trzby-rs-row${isNewest ? ' trzby-rs-cur' : ' trzby-rs-prev'}${isOldest ? ' trzby-rs-last' : ''}`}>

                    {/* Název podniku – rowspan přes viditelné řádky, jen v prvním */}
                    {isNewest && (
                      <td rowSpan={years.length} className="trzby-rs-venue-c">
                        <div className="d-flex align-items-center justify-content-between gap-1">
                          <div className="d-flex align-items-center gap-1" style={{ minWidth: 0 }}>
                            <span className="rounded-circle flex-shrink-0"
                              style={{ width: 7, height: 7, background: prov.color, display: 'inline-block' }} />
                            <span className="fw-semibold fs-12"
                              style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {prov.shortName}
                            </span>
                          </div>
                          {/* Toggle – jen pokud je co sbalit */}
                          {canCollapse && (
                            <button
                              className="trzby-rs-toggle"
                              onClick={() => toggle(prov.id)}
                              title={isCollapsed ? 'Rozbalit všechny roky' : 'Zabalit na 2 roky'}
                            >
                              <iconify-icon
                                icon={isCollapsed ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-up-bold'}
                                style={{ fontSize: 12 }}
                              />
                            </button>
                          )}
                        </div>
                        <div className="text-muted" style={{ fontSize: 10, paddingLeft: 11 }}>
                          od {fy}
                          {isCollapsed && canCollapse && (
                            <span className="ms-1" style={{ color: 'var(--prov-color, #c9911a)' }}>· {allYears.length} let</span>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Rok – sticky druhý sloupec */}
                    <td className="trzby-rs-year-c" style={{ color: isNewest ? '#1c3a5e' : undefined }}>
                      {year}{year === 2026 ? '*' : ''}
                    </td>

                    {/* Hodnoty per měsíc */}
                    {Array.from({ length: 12 }, (_, mi) => {
                      const month = mi + 1;
                      const vCur  = genMonthRevenue(year, month, prov.id);
                      const vPrev = !isOldest ? genMonthRevenue(prevYear, month, prov.id) : 0;
                      const chng  = vCur > 0 && !isOldest && vPrev > 0
                        ? pctChange(vCur, vPrev) : null;
                      const up    = chng != null && chng >= 0;

                      return (
                        <td key={mi} className="trzby-col-prov text-end">
                          {vCur > 0 ? (
                            <>
                              <div className={`czk-num fs-12${isNewest ? ' fw-semibold' : ''}`}>
                                {fCzk(vCur)}
                              </div>
                              {chng != null && (
                                <div>
                                  <span
                                    className={`badge ${up ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}
                                    style={{ fontSize: 10 }}
                                  >
                                    {up ? '+' : ''}{chng.toFixed(1)} %
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted fs-12">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
