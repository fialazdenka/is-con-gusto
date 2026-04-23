// COMPONENT: KPI Strip – 4× Stat Card
// SOURCE: Larkon resources/views/dashboards/index.blade.php
//         – card overflow-hidden + card-body row + card-footer pattern
// CUSTOM: YES – SVG sparkline bar chart → v produkci ApexCharts sparkline (type="bar", height=28)
//
// Larkon class mapping:
//   .card.overflow-hidden.h-100      → stat card container
//   .card-body                       → card body
//   .d-flex.align-items-start.gap-3  → icon + hodnota vedle sebe
//   .avatar-sm.flex-shrink-0         → icon obal
//   iconify-icon.text-{color}        → ikona sekce
//   p.text-muted.fs-12               → popisek (label)
//   h3.text-dark.text-nowrap         → hodnota (částka/procento)
//   .card-footer.py-2.bg-light.bg-opacity-50 → trend footer
//   .text-success / .text-danger     → trend barva
//   CUSTOM: .lk-custom div           → obal SVG sparkline (nahradit ApexCharts)
//   CUSTOM: CSS flex bar chart       → 7 sloupečků, výška normalizovaná na max hodnotu

import {
  DAYS_7,
  getTotalTrzby,
  getPrevTotalTrzby,
  getTotalForPeriod,
  getPrevForPeriod,
  getPeriodShortLabel,
  getMesicVsLY,
  fCzk,
  pctChange,
} from '../data';
import type { ProvozovnaId, Period } from '../types';

interface Props {
  provozovna: ProvozovnaId;
  period?: Period;
}

export default function KPIStrip({ provozovna, period = 'tyden' }: Props) {
  const cur  = getTotalForPeriod(provozovna, period);
  const prev = getPrevForPeriod(provozovna, period);

  const celkemChange = pctChange(cur.celkem, prev.celkem);
  const kuchynChange = pctChange(cur.kuchyn, prev.kuchyn);
  const barChange    = pctChange(cur.bar,    prev.bar);
  const mesic        = getMesicVsLY(provozovna);
  const mesicVsLY    = mesic.chng;
  const nDays        = period === 'dnes' || period === 'vcera' ? 1
                     : period === 'tyden' || period === 'minuly-tyden' ? 7
                     : period === 'minuly-mesic' ? 31 : 112;
  const avgDen       = Math.round(cur.celkem / nDays);
  const periodLabel  = getPeriodShortLabel(period);

  const sparkCelkem = [72, 65, 85, 79, 90, 100, 96];
  const sparkKuchyn = [70, 62, 84, 78, 89, 100, 95];
  const sparkBar    = [68, 63, 86, 77, 92, 100, 94];

  return (
    <div className="row g-4 mb-4">
      <div className="col-md-3">
        <StatCard
          label={`Celkové tržby – ${periodLabel}`}
          value={fCzk(cur.celkem)}
          change={celkemChange}
          meta="vs. předchozí období"
          spark={sparkCelkem}
          iconClass="solar:chart-2-bold-duotone"
          colorClass="primary"
        />
      </div>
      <div className="col-md-3">
        <StatCard
          label={`Kuchyň – ${periodLabel}`}
          value={fCzk(cur.kuchyn)}
          change={kuchynChange}
          meta="vs. předchozí období"
          spark={sparkKuchyn}
          iconClass="solar:chef-hat-bold-duotone"
          colorClass="info"
        />
      </div>
      <div className="col-md-3">
        <StatCard
          label={`Bar – ${periodLabel}`}
          value={fCzk(cur.bar)}
          change={barChange}
          meta="vs. předchozí období"
          spark={sparkBar}
          iconClass="solar:wineglass-bold-duotone"
          colorClass="success"
        />
      </div>
      <div className="col-md-3">
        <StatCard
          label="Měsíc vs. LY"
          value={`${mesicVsLY >= 0 ? '+' : ''}${mesicVsLY.toFixed(1)} %`}
          change={mesicVsLY}
          meta={`Průměr/den: ${fCzk(avgDen)}`}
          spark={[76, 80, 84, 82, 86, 90, 88]}
          iconClass="solar:graph-up-bold-duotone"
          colorClass="warning"
        />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  change: number;
  meta: string;
  spark: number[];
  iconClass: string;
  colorClass: string;
}

function StatCard({ label, value, change, meta, spark, iconClass, colorClass }: StatCardProps) {
  const up = change >= 0;
  const changeStr = `${up ? '+' : ''}${change.toFixed(1)} %`;
  const maxS = Math.max(...spark);

  return (
    // SOURCE: Larkon card overflow-hidden stat pattern
    <div className="card overflow-hidden h-100">
      <div className="card-body">
        <div className="d-flex align-items-start gap-3">
          {/* Icon box – SOURCE: Larkon .avatar-sm.bg-soft-{color} */}
          <div className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center">
            <iconify-icon
              icon={iconClass}
              className={`text-${colorClass}`}
              style={{ fontSize: 26 }}
            />
          </div>
          {/* Value + label */}
          <div className="flex-grow-1 text-end" style={{ minWidth: 0 }}>
            <p className="text-muted mb-0 fs-12" style={{ lineHeight: 1.3 }}>{label}</p>
            <h3 className="text-dark mt-1 mb-0 text-nowrap">{value}</h3>
          </div>
        </div>

        {/* Sparkline – CUSTOM: v produkci ApexCharts sparkline bar chart */}
        <div className="lk-custom mt-3">
          <div className="lk-custom-label">CUSTOM: ApexCharts sparkline</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
            {spark.map((v, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.round((v / maxS) * 100)}%`,
                  background: `var(--bs-${colorClass})`,
                  opacity: i === spark.length - 1 ? 1 : 0.5,
                  borderRadius: '2px 2px 0 0',
                  minHeight: 2,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer – SOURCE: Larkon .card-footer.py-2.bg-light.bg-opacity-50 */}
      <div className="card-footer py-2 bg-light bg-opacity-50">
        <div className={`fw-semibold fs-13 ${up ? 'text-success' : 'text-danger'}`}>
          <iconify-icon icon={up ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} />
          {' '}{changeStr}
        </div>
        <div className="text-muted fs-12 mt-1">{meta}</div>
      </div>
    </div>
  );
}
