// COMPONENT: Provozovna Drawer — Offcanvas / Slide-in Panel
// SOURCE: Larkon _modal.scss + Bootstrap offcanvas component
// CUSTOM: YES – mini SVG grouped bar chart (kuchyň + bar, 7 dní) → v produkci ApexCharts sparkline
//
// Larkon class mapping:
//   .offcanvas.offcanvas-end.show              → drawer container (width: min(500px, 100vw))
//   .offcanvas-header.border-bottom            → hlavička s btn-close
//   .offcanvas-title                           → název provozovny
//   .offcanvas-body                            → scrollable obsah
//   .row.g-3                                   → KPI grid (celkem / kuchyň / bar / avg/den)
//   .p-3.bg-light.rounded                      → KPI blok
//   .text-uppercase.fw-semibold.text-muted.fs-11 → sekce titulek
//   .progress (height:6px)                     → podíl kuchyň/bar progress bar
//   .table.table-sm                            → poslední závěrky
//   .badge.bg-{color}-subtle                   → stav závěrky
//   div.d-flex.gap-2.p-3.border-top            → footer s tlačítky
//   .btn.btn-secondary / .btn-primary          → akce (Zavřít / Detail provozovny)
//   CUSTOM: .lk-custom SVG mini chart         → 7 sloupců kuchyň+bar (stacked), nahradit ApexCharts

import type { AppState, ZavierkaStav } from '../types';
import {
  PROVOZOVNY,
  DAYS_7,
  DENNI_ZAVIERKY,
  getTotalTrzby,
  getPrevTotalTrzby,
  getTrzbyByDay,
  fCzk,
  fDate,
  pctChange,
} from '../data';

interface Props {
  provozovnaId: string;
  state: AppState;
  onClose: () => void;
}

const STAV_BADGE: Record<ZavierkaStav, { cls: string; label: string }> = {
  ok:    { cls: 'bg-success-subtle text-success', label: '✓ OK' },
  chyba: { cls: 'bg-danger-subtle text-danger',   label: '✗ Chyba' },
  ceka:  { cls: 'bg-warning-subtle text-warning', label: '⏳ Čeká' },
};

const MINI_W = 380, MINI_H = 80;
const MINI_ML = 8, MINI_MR = 8, MINI_MT = 8, MINI_MB = 20;
const MINI_IW = MINI_W - MINI_ML - MINI_MR;
const MINI_IH = MINI_H - MINI_MT - MINI_MB;

export default function ProvozovnaDrawer({ provozovnaId, onClose }: Props) {
  const prov = PROVOZOVNY.find((p) => p.id === provozovnaId);
  if (!prov) return null;

  const cur      = getTotalTrzby(provozovnaId, DAYS_7);
  const prev     = getPrevTotalTrzby(provozovnaId);
  const chng     = pctChange(cur.celkem, prev.celkem);
  const isUp     = chng >= 0;

  const zavierky = DENNI_ZAVIERKY.filter((z) => z.provozovna === provozovnaId).slice(0, 5);
  const dayData  = getTrzbyByDay(provozovnaId, DAYS_7);
  const maxVal   = Math.max(...dayData.map((d) => d.celkem), 1);
  const yMax     = Math.ceil(maxVal / 20000) * 20000;

  const n      = dayData.length;
  const groupW = MINI_IW / n;
  const barW   = Math.max(Math.floor((groupW - 8) / 2), 6);

  return (
    // SOURCE: Bootstrap .offcanvas.offcanvas-end.show
    <div
      className="offcanvas offcanvas-end show"
      style={{ width: 'min(500px, 100vw)', zIndex: 300, visibility: 'visible' }}
      role="dialog"
    >
      {/* SOURCE: Bootstrap .offcanvas-header */}
      <div className="offcanvas-header border-bottom">
        <div className="d-flex align-items-center gap-2">
          <span
            className="rounded-circle d-inline-block"
            style={{ width: 12, height: 12, background: prov.color, flexShrink: 0 }}
          />
          <h5 className="offcanvas-title mb-0">{prov.name}</h5>
        </div>
        <button type="button" className="btn-close" onClick={onClose} />
      </div>

      {/* SOURCE: Bootstrap .offcanvas-body */}
      <div className="offcanvas-body">

        {/* KPI row – SOURCE: Bootstrap .row.g-3 */}
        <div className="row g-3 mb-4">
          <div className="col-6">
            <div className="p-3 bg-light rounded">
              <div className="text-muted fs-12 mb-1">Tržby 7 dní</div>
              <div className="fw-bold czk-num fs-5">{fCzk(cur.celkem)}</div>
              <div className={`mt-2 fw-semibold fs-12 ${isUp ? 'text-success' : 'text-danger'}`}>
                <iconify-icon icon={isUp ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} />
                {' '}{isUp ? '+' : ''}{chng.toFixed(1)} % vs. min. týden
              </div>
            </div>
          </div>
          <div className="col-6">
            <div className="p-3 bg-light rounded">
              <div className="text-muted fs-12 mb-1">Kuchyň / Bar</div>
              <div className="fw-bold czk-num fs-5">{fCzk(cur.kuchyn)}</div>
              <div className="fw-semibold czk-num text-success fs-5">{fCzk(cur.bar)}</div>
            </div>
          </div>
        </div>

        {/* Mini chart – SOURCE: CUSTOM (v produkci ApexCharts sparkline) */}
        <div className="mb-4">
          <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Vývoj tržeb (7 dní)</div>
          <div className="lk-custom">
            <div className="lk-custom-label">CUSTOM: ApexCharts sparkline bar (kuchyň + bar)</div>
            <div className="bg-light rounded p-2 overflow-hidden">
              <svg viewBox={`0 0 ${MINI_W} ${MINI_H}`} style={{ width: '100%', height: MINI_H, display: 'block' }}>
                {dayData.map((d, i) => {
                  const gx  = MINI_ML + i * groupW + (groupW - barW * 2 - 2) / 2;
                  const kH  = (d.kuchyn / yMax) * MINI_IH;
                  const bH  = (d.bar    / yMax) * MINI_IH;
                  const kY  = MINI_MT + MINI_IH - kH;
                  const bY  = MINI_MT + MINI_IH - bH;
                  const cx  = gx + barW + 1;
                  return (
                    <g key={d.datum}>
                      <rect x={gx}           y={kY} width={barW} height={kH} fill="#1c84ee" rx="2" />
                      <rect x={gx + barW + 2} y={bY} width={barW} height={bH} fill="#22c55e" rx="2" />
                      <text x={cx} y={MINI_MT + MINI_IH + 14} textAnchor="middle" fontSize="8" fill="#9097a7">
                        {new Date(d.datum + 'T12:00:00').getDate()}.
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* Střediska breakdown */}
        <div className="mb-4">
          <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Střediska (7D)</div>
          <div className="d-flex justify-content-between align-items-center border-bottom py-2">
            <div className="d-flex align-items-center gap-2 text-muted">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#1c84ee', display: 'inline-block' }} />
              Kuchyň
            </div>
            <div>
              <span className="fw-semibold">{fCzk(cur.kuchyn)}</span>
              <span className="text-muted fs-12 ms-2">({Math.round((cur.kuchyn / cur.celkem) * 100)} %)</span>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center border-bottom py-2">
            <div className="d-flex align-items-center gap-2 text-muted">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} />
              Bar
            </div>
            <div>
              <span className="fw-semibold">{fCzk(cur.bar)}</span>
              <span className="text-muted fs-12 ms-2">({Math.round((cur.bar / cur.celkem) * 100)} %)</span>
            </div>
          </div>
          {/* SOURCE: Bootstrap .progress */}
          <div className="progress mt-2" style={{ height: 6 }}>
            <div
              className="progress-bar"
              style={{ width: `${Math.round((cur.kuchyn / cur.celkem) * 100)}%`, background: 'linear-gradient(90deg, #1c84ee, #22c55e)' }}
            />
          </div>
        </div>

        {/* Info o provozovně */}
        <div className="mb-4">
          <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Informace o provozovně</div>
          {[
            { lbl: 'Manager', val: prov.manager },
            { lbl: 'Adresa',  val: prov.address },
            { lbl: 'Telefon', val: prov.phone },
          ].map(({ lbl, val }) => (
            <div key={lbl} className="d-flex justify-content-between align-items-center border-bottom py-2">
              <span className="text-muted">{lbl}</span>
              <span className="fw-semibold text-end" style={{ maxWidth: 240 }}>{val}</span>
            </div>
          ))}
          <div className="d-flex justify-content-between align-items-center py-2">
            <span className="text-muted">Status</span>
            <span className="badge bg-success-subtle text-success">● Aktivní</span>
          </div>
        </div>

        {/* Poslední závěrky – SOURCE: Bootstrap .table.table-sm */}
        <div>
          <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Poslední závěrky</div>
          <div className="table-responsive">
            <table className="table table-sm table-hover table-nowrap mb-0">
              <thead className="table-light">
                <tr>
                  <th>Datum</th>
                  <th className="text-end">Tržba</th>
                  <th>Stav</th>
                  <th>Vložil</th>
                </tr>
              </thead>
              <tbody>
                {zavierky.map((z) => {
                  const { cls, label } = STAV_BADGE[z.stav];
                  return (
                    <tr key={z.id}>
                      <td className="text-muted">{fDate(z.datum)}</td>
                      <td className="text-end czk-num fw-semibold">{fCzk(z.trzba)}</td>
                      <td><span className={`badge ${cls}`}>{label}</span></td>
                      <td className="text-muted">{z.zalozil}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Footer – SOURCE: Bootstrap d-flex gap-2 border-top */}
      <div className="d-flex gap-2 p-3 border-top">
        <button className="btn btn-secondary flex-fill">Otevřít provozovnu</button>
        <button className="btn btn-primary flex-fill">Vložit závěrku</button>
      </div>
    </div>
  );
}
