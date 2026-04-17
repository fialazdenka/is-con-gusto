// ─────────────────────────────────────────────────────────────
// COMPONENT: Provozovna Drawer — Offcanvas / Slide-in Panel
// SOURCE:    Larkon-like → Bootstrap Offcanvas (placement="end")
// CUSTOM:    NO (minor: mini SVG chart → nahradit ApexCharts)
//
// LARKON MAPPING:
//   Root:        <Offcanvas show={open} onHide={onClose}
//                  placement="end" style={{width:500}}>
//   Header:      <Offcanvas.Header closeButton>
//                  <div className="d-flex align-items-center gap-2">
//                    <span className="dot rounded-circle" style={{bg:color}}>
//                    <Offcanvas.Title>
//   Body:         <Offcanvas.Body className="d-flex flex-col gap-4">
//   KPI grid:     <Row className="g-3">
//                   <Col><div className="p-3 bg-light rounded">
//   Mini chart:   ApexCharts type="bar" height=80 sparkline-style,
//                   no legend/axis, 2 series (kuchyn/bar)
//   Stat rows:    <ListGroup variant="flush">
//                   <ListGroupItem className="d-flex justify-between px-0">
//   Info section: <dl className="row mb-0"> s <dt>/<dd> páry
//   Závěrky:      <Table size="sm" responsive>
//   Footer:       <div className="offcanvas-footer d-flex gap-2 p-3
//                   border-top">
//                   <Button variant="outline-secondary" className="flex-1">
//                   <Button variant="primary" className="flex-1">
// ─────────────────────────────────────────────────────────────

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
  ok:    { cls: 'badge-ok',   label: '✓ OK' },
  chyba: { cls: 'badge-err',  label: '✗ Chyba' },
  ceka:  { cls: 'badge-warn', label: '⏳ Čeká' },
};

// Mini bar chart for drawer
const MINI_W = 380;
const MINI_H = 80;
const MINI_ML = 8;
const MINI_MR = 8;
const MINI_MT = 8;
const MINI_MB = 20;
const MINI_IW = MINI_W - MINI_ML - MINI_MR;
const MINI_IH = MINI_H - MINI_MT - MINI_MB;

export default function ProvozovnaDrawer({ provozovnaId, onClose }: Props) {
  const prov = PROVOZOVNY.find((p) => p.id === provozovnaId);
  if (!prov) return null;

  const cur   = getTotalTrzby(provozovnaId, DAYS_7);
  const prev  = getPrevTotalTrzby(provozovnaId);
  const chng  = pctChange(cur.celkem, prev.celkem);
  const isUp  = chng >= 0;

  const zavierky = DENNI_ZAVIERKY
    .filter((z) => z.provozovna === provozovnaId)
    .slice(0, 5);

  const dayData = getTrzbyByDay(provozovnaId, DAYS_7);
  const maxVal  = Math.max(...dayData.map((d) => d.celkem), 1);
  const yMax    = Math.ceil(maxVal / 20000) * 20000;

  const n      = dayData.length;
  const groupW = MINI_IW / n;
  const barW   = Math.max(Math.floor((groupW - 8) / 2), 6);

  return (
    <div className="drawer">
      {/* Header */}
      <div className="drawer-header">
        <div className="drawer-title-wrap">
          <div className="drawer-dot" style={{ background: prov.color }} />
          <div className="drawer-title">{prov.name}</div>
        </div>
        <button className="drawer-close" onClick={onClose}>✕</button>
      </div>

      {/* Body */}
      <div className="drawer-body">

        {/* KPI row */}
        <div className="drawer-kpi-row">
          <div className="drawer-kpi-box">
            <div className="drawer-kpi-label">Tržby 7 dní</div>
            <div className="drawer-kpi-val">{fCzk(cur.celkem)}</div>
            <div className={`kpi-change ${isUp ? 'up' : 'down'} mt-2`} style={{ fontSize: 'var(--fs-sm)' }}>
              {isUp ? '↑' : '↓'} {isUp ? '+' : ''}{chng.toFixed(1)} % vs. min. týden
            </div>
          </div>
          <div className="drawer-kpi-box">
            <div className="drawer-kpi-label">Kuchyň / Bar</div>
            <div className="drawer-kpi-val" style={{ fontSize: 'var(--fs-lg)' }}>
              {fCzk(cur.kuchyn)}<br />
              <span style={{ color: 'var(--c-ok)', fontSize: 'var(--fs-md)' }}>{fCzk(cur.bar)}</span>
            </div>
          </div>
        </div>

        {/* Mini chart */}
        <div className="drawer-section">
          <div className="drawer-section-title">Vývoj tržeb (7 dní)</div>
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: 'var(--r-md)',
              padding: '8px',
              overflow: 'hidden',
            }}
          >
            <svg
              viewBox={`0 0 ${MINI_W} ${MINI_H}`}
              style={{ width: '100%', height: MINI_H, display: 'block' }}
            >
              {dayData.map((d, i) => {
                const gx   = MINI_ML + i * groupW + (groupW - barW * 2 - 2) / 2;
                const kH   = (d.kuchyn / yMax) * MINI_IH;
                const bH   = (d.bar    / yMax) * MINI_IH;
                const kY   = MINI_MT + MINI_IH - kH;
                const bY   = MINI_MT + MINI_IH - bH;
                const cx   = gx + barW + 1;

                return (
                  <g key={d.datum}>
                    <rect x={gx}         y={kY} width={barW} height={kH} fill="#3b82f6" rx="2" />
                    <rect x={gx + barW + 2} y={bY} width={barW} height={bH} fill="#22c55e" rx="2" />
                    <text
                      x={cx} y={MINI_MT + MINI_IH + 14}
                      textAnchor="middle" fontSize="8" fill="#94a3b8"
                    >
                      {new Date(d.datum + 'T12:00:00').getDate()}.
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Střediska breakdown */}
        <div className="drawer-section">
          <div className="drawer-section-title">Střediska (7D)</div>
          <div className="detail-row">
            <span className="detail-row-lbl">
              <span className="flex items-center gap-2">
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#3b82f6' }} />
                Kuchyň
              </span>
            </span>
            <div>
              <span className="detail-row-val">{fCzk(cur.kuchyn)}</span>
              <span className="fs-xs c-2 ml-2">
                ({Math.round((cur.kuchyn / cur.celkem) * 100)} %)
              </span>
            </div>
          </div>
          <div className="detail-row">
            <span className="detail-row-lbl">
              <span className="flex items-center gap-2">
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#22c55e' }} />
                Bar
              </span>
            </span>
            <div>
              <span className="detail-row-val">{fCzk(cur.bar)}</span>
              <span className="fs-xs c-2 ml-2">
                ({Math.round((cur.bar / cur.celkem) * 100)} %)
              </span>
            </div>
          </div>
          {/* Progress */}
          <div style={{ marginTop: 10 }}>
            <div className="prog">
              <div
                className="prog-fill"
                style={{
                  width: `${Math.round((cur.kuchyn / cur.celkem) * 100)}%`,
                  background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="drawer-section">
          <div className="drawer-section-title">Informace o provozovně</div>
          <div className="detail-row">
            <span className="detail-row-lbl">Manager</span>
            <span className="detail-row-val">{prov.manager}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-lbl">Adresa</span>
            <span className="detail-row-val" style={{ textAlign: 'right', maxWidth: 240 }}>
              {prov.address}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-row-lbl">Telefon</span>
            <span className="detail-row-val">{prov.phone}</span>
          </div>
          <div className="detail-row">
            <span className="detail-row-lbl">Status</span>
            <span className="badge badge-ok">● Aktivní</span>
          </div>
        </div>

        {/* Závěrky */}
        <div className="drawer-section">
          <div className="drawer-section-title">Poslední závěrky</div>
          <table className="dtable">
            <thead>
              <tr>
                <th>Datum</th>
                <th className="td-r">Tržba</th>
                <th>Stav</th>
                <th>Vložil</th>
              </tr>
            </thead>
            <tbody>
              {zavierky.map((z) => {
                const { cls, label } = STAV_BADGE[z.stav];
                return (
                  <tr key={z.id}>
                    <td className="td-muted">{fDate(z.datum)}</td>
                    <td className="td-r td-mono fw-600">{fCzk(z.trzba)}</td>
                    <td><span className={`badge ${cls}`}>{label}</span></td>
                    <td className="td-muted">{z.zalozil}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Footer */}
      <div className="drawer-footer">
        <button className="btn btn-secondary flex-1">Otevřít provozovnu</button>
        <button className="btn btn-primary flex-1">Vložit závěrku</button>
      </div>
    </div>
  );
}
