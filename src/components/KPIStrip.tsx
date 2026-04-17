// ─────────────────────────────────────────────────────────────
// COMPONENT: KPI Strip — 4× Stat / KPI Card
// SOURCE:    Larkon-like → StatisticsWidget / KPICard
// CUSTOM:    NO
//
// LARKON MAPPING:
//   Wrapper:    grid-4 → Bootstrap <Row className="g-4">
//   Each card:  <StatisticsWidget icon="..." value="..." title="..."
//                 trendValue="..." trendDirection="up|down" />
//   Icon box:   <IconBox variant="primary-subtle" icon="...">
//   Sparkline:  ApexCharts type="line/bar" + sparkline:{enabled:true},
//               height=28, no axes/grid/labels
//   Trend:      <Badge bg={up?"success":"danger"}> s Lucide TrendingUp/Down
//   Accent top: CSS borderTop nebo Larkon Card s `accent` color prop
// ─────────────────────────────────────────────────────────────

import {
  DAYS_7,
  getTotalTrzby,
  getPrevTotalTrzby,
  fCzk,
  pctChange,
} from '../data';
import type { ProvozovnaId } from '../types';

interface Props {
  provozovna: ProvozovnaId;
}

export default function KPIStrip({ provozovna }: Props) {
  const cur  = getTotalTrzby(provozovna, DAYS_7);
  const prev = getPrevTotalTrzby(provozovna);

  const celkemChange = pctChange(cur.celkem, prev.celkem);
  const kuchynChange = pctChange(cur.kuchyn, prev.kuchyn);
  const barChange    = pctChange(cur.bar,    prev.bar);

  // Mock: mesic vs LY (+8.4%)
  const mesicVsLY = 8.4;

  // Mock: průměrná denní tržba
  const avgDen = Math.round(cur.celkem / DAYS_7.length);

  const sparkCelkem = [72, 65, 85, 79, 90, 100, 96];
  const sparkKuchyn = [70, 62, 84, 78, 89, 100, 95];
  const sparkBar    = [68, 63, 86, 77, 92, 100, 94];

  return (
    <div className="grid-4 section-gap">
      <KPICard
        label="Celkové tržby 7D"
        value={fCzk(cur.celkem)}
        change={celkemChange}
        meta="vs. minulý týden"
        spark={sparkCelkem}
        accent="#3b82f6"
        iconBg="#dbeafe"
        icon="₿"
      />
      <KPICard
        label="Kuchyň 7D"
        value={fCzk(cur.kuchyn)}
        change={kuchynChange}
        meta="vs. minulý týden"
        spark={sparkKuchyn}
        accent="#3b82f6"
        iconBg="#dbeafe"
        icon="🍽"
      />
      <KPICard
        label="Bar 7D"
        value={fCzk(cur.bar)}
        change={barChange}
        meta="vs. minulý týden"
        spark={sparkBar}
        accent="#22c55e"
        iconBg="#dcfce7"
        icon="🍷"
      />
      <KPICard
        label="Měsíc vs. LY"
        value={`+${mesicVsLY} %`}
        change={mesicVsLY}
        meta={`Průměr/den: ${fCzk(avgDen)}`}
        spark={[76, 80, 84, 82, 86, 90, 88]}
        accent="#a855f7"
        iconBg="#f3e8ff"
        icon="📈"
        isPercent
      />
    </div>
  );
}

interface KPICardProps {
  label: string;
  value: string;
  change: number;
  meta: string;
  spark: number[];
  accent: string;
  iconBg: string;
  icon: string;
  isPercent?: boolean;
}

function KPICard({ label, value, change, meta, spark, accent, iconBg, icon }: KPICardProps) {
  const up = change >= 0;
  const changeStr = `${up ? '+' : ''}${change.toFixed(1)} %`;
  const maxS = Math.max(...spark);

  return (
    <div className="kpi-card" style={{ '--kpi-accent': accent } as React.CSSProperties}>
      <div className="kpi-top">
        <div>
          <div className="kpi-label">{label}</div>
          <div className="kpi-value">{value}</div>
        </div>
        <div className="kpi-icon-wrap" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>

      <div className="sparkline">
        {spark.map((v, i) => (
          <div
            key={i}
            className="spark-bar"
            style={{
              height: `${Math.round((v / maxS) * 100)}%`,
              background: accent,
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className={`kpi-change ${up ? 'up' : 'down'}`}>
          <span>{up ? '↑' : '↓'}</span>
          <span>{changeStr}</span>
        </div>
        <div className="kpi-meta">{meta}</div>
      </div>
    </div>
  );
}
