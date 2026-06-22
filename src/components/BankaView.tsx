// COMPONENT: Banka – přehled bankovních účtů + transakcí
// SOURCE: Larkon card / table / badge — sticky headers, multiselect chip filtry
// CUSTOM: YES
//   – AutoSyncBar (auto-sync status — pattern z Faktury AutoStatusBar)
//   – Karta účtu s brand color border-top + multi-venue podporou (estetický seznam provozoven)
//   – Smart alerts strip (3 typy: critical balance / sync error / nedostatečné prostředky)
//   – Sparkline mini graf 37 bodů (30 minulých + dnes + 6 budoucích)
//   – Side-panel detail transakce (sticky right column, pattern z FakturySidePanel)

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { AppState } from '../types';
import {
  BANKA_UCTY,
  BANKA_TRANSAKCE,
  BANKA_USERS,
  STAV_META,
  TRANS_STAV_META,
  getUctyForProvozovna,
  getProvozovnyForUcet,
  sumForMena,
  timeAgo,
  isInternalTransfer,
  type BankaUcet,
  type BankaTransakce,
  type BankaTransStav,
  type SuggestedMatch,
  type TransAuditEntry,
  type TransNote,
  type TransDelegace,
  detectTransType,
} from '../bankaData';
import { FAKTURY_PLATBY } from '../platbyData';
import { UVERY } from '../uveryData';
import { fCzk, fDate, PROVOZOVNY } from '../data';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

// ── Sparkline helper ───────────────────────────────────────────
function Sparkline({ values, todayIdx, color }: { values: number[]; todayIdx: number; color: string }) {
  const W = 200, H = 36, MT = 2, MB = 2;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: MT + (1 - (v - min) / range) * (H - MT - MB),
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const todayPt = pts[todayIdx];
  // Rozdělení na historickou (solid) a budoucí (dashed) část
  const historyPath = pts.slice(0, todayIdx + 1).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const futurePath  = pts.slice(todayIdx).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }} preserveAspectRatio="none">
      <path d={historyPath} fill="none" stroke={color} strokeWidth="1.5" />
      <path d={futurePath}  fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7" />
      <circle cx={todayPt.x} cy={todayPt.y} r="2.5" fill={color} stroke="white" strokeWidth="1" />
      <path d={`${path} L ${W},${H} L 0,${H} Z`} fill={color} fillOpacity="0.08" />
    </svg>
  );
}

// ── Smart Alerts ───────────────────────────────────────────────
function SmartAlerts({ ucty, onGoToUcet, onAction }: {
  ucty: BankaUcet[];
  onGoToUcet: (id: string) => void;
  onAction: (action: 'prevod' | 'resync' | 'prirazeni', ucetId: string) => void;
}) {
  const critical    = ucty.filter((u) => u.stav === 'critical-balance');
  const lowBal      = ucty.filter((u) => u.stav === 'low-balance');
  const syncErr     = ucty.filter((u) => u.stav === 'sync-error');
  const unassigned  = ucty.filter((u) => u.provozovny.length === 0);
  if (critical.length === 0 && lowBal.length === 0 && syncErr.length === 0 && unassigned.length === 0) return null;

  const chipBtn = (variant: 'danger' | 'warning' | 'info') => `badge border d-inline-flex align-items-center gap-1 bg-white text-${variant} border-${variant}`;

  return (
    <div className="d-flex flex-column gap-2 mb-3">
      {critical.length > 0 && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-0 flex-wrap">
          <iconify-icon icon="solar:danger-circle-bold-duotone" className="fs-5 flex-shrink-0" />
          <span className="flex-grow-1">
            <strong>{critical.length} {critical.length === 1 ? 'účet pod kritickou hranicí' : 'účty pod kritickou hranicí'}</strong> — vyžadují okamžitou pozornost
          </span>
          <div className="d-flex gap-2 flex-wrap">
            {critical.map((u) => (
              <div key={u.id} className="d-inline-flex align-items-center gap-1 bg-white border border-danger rounded px-2 py-1 text-nowrap" style={{ fontSize: 11 }}>
                <button className="btn btn-link p-0 text-danger text-decoration-none fw-semibold text-nowrap"
                  style={{ fontSize: 11 }} onClick={() => onGoToUcet(u.id)}>
                  <iconify-icon icon="solar:eye-bold-duotone" className="me-1" style={{ fontSize: 12 }} />
                  {u.nazev}
                </button>
                <button className="btn btn-danger btn-sm py-0 px-2 text-nowrap" style={{ fontSize: 10 }}
                  onClick={() => onAction('prevod', u.id)}>
                  <iconify-icon icon="solar:transfer-horizontal-bold-duotone" className="me-1" />
                  Převést
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {syncErr.length > 0 && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-0 flex-wrap">
          <iconify-icon icon="solar:close-circle-bold-duotone" className="fs-5 flex-shrink-0" />
          <span className="flex-grow-1">
            <strong>{syncErr.length} {syncErr.length === 1 ? 'účet — chyba synchronizace' : 'účty — chyba synchronizace'}</strong>
          </span>
          <div className="d-flex gap-2 flex-wrap">
            {syncErr.map((u) => (
              <div key={u.id} className="d-inline-flex align-items-center gap-1 bg-white border border-danger rounded px-2 py-1 text-nowrap" style={{ fontSize: 11 }}>
                <button className="btn btn-link p-0 text-danger text-decoration-none fw-semibold text-nowrap"
                  style={{ fontSize: 11 }} onClick={() => onGoToUcet(u.id)}>
                  <iconify-icon icon="solar:eye-bold-duotone" className="me-1" style={{ fontSize: 12 }} />
                  {u.nazev}
                </button>
                <button className="btn btn-warning btn-sm py-0 px-2 text-nowrap" style={{ fontSize: 10 }}
                  onClick={() => onAction('resync', u.id)}>
                  <iconify-icon icon="solar:refresh-bold-duotone" className="me-1" />
                  Resync
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {lowBal.length > 0 && (
        <div className="alert alert-warning d-flex align-items-center gap-2 mb-0 flex-wrap">
          <iconify-icon icon="solar:danger-triangle-bold-duotone" className="fs-5 flex-shrink-0" />
          <span className="flex-grow-1">
            <strong>{lowBal.length} {lowBal.length === 1 ? 'účet s nízkým zůstatkem' : 'účty s nízkým zůstatkem'}</strong> — sleduj predikci
          </span>
          <div className="d-flex gap-2 flex-wrap">
            {lowBal.map((u) => (
              <div key={u.id} className="d-inline-flex align-items-center gap-1 bg-white border border-warning rounded px-2 py-1 text-nowrap" style={{ fontSize: 11 }}>
                <button className="btn btn-link p-0 text-warning text-decoration-none fw-semibold text-nowrap"
                  style={{ fontSize: 11 }} onClick={() => onGoToUcet(u.id)}>
                  <iconify-icon icon="solar:eye-bold-duotone" className="me-1" style={{ fontSize: 12 }} />
                  {u.nazev}
                </button>
                <button className="btn btn-warning btn-sm py-0 px-2 text-nowrap" style={{ fontSize: 10 }}
                  onClick={() => onAction('prevod', u.id)}>
                  <iconify-icon icon="solar:transfer-horizontal-bold-duotone" className="me-1" />
                  Převést
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {unassigned.length > 0 && (
        <div className="alert alert-info d-flex align-items-center gap-2 mb-0 flex-wrap">
          <iconify-icon icon="solar:link-broken-minimalistic-bold-duotone" className="fs-5 flex-shrink-0" />
          <span className="flex-grow-1">
            <strong>{unassigned.length} {unassigned.length === 1 ? 'účet bez přiřazení provozovny' : 'účty bez přiřazení provozovny'}</strong> — neznámý účel
          </span>
          <div className="d-flex gap-2 flex-wrap">
            {unassigned.map((u) => (
              <div key={u.id} className="d-inline-flex align-items-center gap-1 bg-white border border-info rounded px-2 py-1 text-nowrap" style={{ fontSize: 11 }}>
                <button className="btn btn-link p-0 text-info text-decoration-none fw-semibold czk-num text-nowrap"
                  style={{ fontSize: 11 }} onClick={() => onGoToUcet(u.id)}>
                  <iconify-icon icon="solar:eye-bold-duotone" className="me-1" style={{ fontSize: 12 }} />
                  {u.iban.slice(0, 12)}…
                </button>
                <button className="btn btn-info btn-sm py-0 px-2 text-white text-nowrap" style={{ fontSize: 10 }}
                  onClick={() => onAction('prirazeni', u.id)}>
                  <iconify-icon icon="solar:link-bold-duotone" className="me-1" />
                  Přiřadit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Kategorie problému v Work Queue (Phase 2 — pod-skupiny nespárovaných transakcí)
type WorkQueueKind = 'unpaired' | 'overdue-at-bank' | 'with-candidates' | 'no-vs' | 'no-branch' | 'waiting-review' | 'error' | 'delegated';

// Lidsky čitelné labely pro Work Queue (zobrazení v aktivním filtr banneru)
const WORK_QUEUE_LABEL: Record<WorkQueueKind, string> = {
  'unpaired':         'Nespárované transakce',
  'overdue-at-bank':  'V bance neuhrazené',
  'with-candidates':  'Transakce s návrhem',
  'no-vs':            'Bez VS',
  'no-branch':        'Bez provozovny',
  'waiting-review':   'Čekající na kontrolu',
  'error':            'Transakce s chybou',
  'delegated':        'Delegované úkoly',
};

// ── Work Queue („Vyžaduje pozornost") ─────────────────────────
// Klikatelné karty: každá filtruje transakční tabulku podle kategorie problému
function WorkQueue({ transakce, ucty, onSelectQueue, activeQueue }: {
  transakce: BankaTransakce[];
  ucty: BankaUcet[];
  onSelectQueue: (queue: WorkQueueKind | null) => void;
  activeQueue: WorkQueueKind | null;
}) {
  // Po redukci stavů jsou všechny problémy podmnožiny 'unpaired'
  const unpaired         = transakce.filter((t) => t.stav === 'unpaired');
  const unpairedCount    = unpaired.length;
  const overdueCount     = unpaired.filter((t) => t.isOverdueAtBank).length;
  const delegatedCount   = unpaired.filter((t) => !!t.delegatedTo).length;
  const candidatesCount  = unpaired.filter((t) => (t.candidates?.length ?? 0) > 0).length;
  const reviewCount      = unpaired.filter((t) => t.isWaitingReview).length;
  const errorCount       = unpaired.filter((t) => t.hasError).length;
  const noVsCount        = unpaired.filter((t) => !t.vs).length;
  const noBranchCount    = unpaired.filter((t) => {
    const u = ucty.find((x) => x.id === t.ucetId);
    return u && u.provozovny.length === 0;
  }).length;

  // Definice karet rozdělené do 2 skupin per UX hierarchie:
  //  - „K vyřešení" (urgent) — zablokované workflow, vyžaduje akci
  //  - „K přehledu"  (info)  — sledovací metriky, nic neblokuje
  type CardDef = { kind: WorkQueueKind; count: number; label: string; icon: string; color: string; bg: string };
  const urgentCards: CardDef[] = [
    { kind: 'overdue-at-bank', count: overdueCount,    label: 'v bance neuhrazené',       icon: 'solar:bell-bing-bold-duotone',        color: '#dc3545', bg: '#f8d7da' },
    { kind: 'error',           count: errorCount,      label: 'transakcí s chybou',       icon: 'solar:close-circle-bold-duotone',     color: '#dc3545', bg: '#f8d7da' },
    { kind: 'with-candidates', count: candidatesCount, label: 'transakcí s návrhem',      icon: 'solar:layers-bold-duotone',           color: '#6f42c1', bg: '#f3eaff' },
    { kind: 'no-vs',           count: noVsCount,       label: 'transakcí bez VS',         icon: 'solar:hashtag-square-bold-duotone',   color: '#fd7e14', bg: '#ffedd5' },
    { kind: 'no-branch',       count: noBranchCount,   label: 'transakcí bez provozovny', icon: 'solar:buildings-3-bold-duotone',      color: '#9097a7', bg: '#f1f3f5' },
  ];
  const infoCards: CardDef[] = [
    { kind: 'unpaired',        count: unpairedCount,   label: 'nespárovaných celkem',     icon: 'solar:danger-triangle-bold-duotone',  color: '#ffc107', bg: '#fff3cd' },
    { kind: 'delegated',       count: delegatedCount,  label: 'delegovaných úkolů',       icon: 'solar:user-id-bold-duotone',          color: '#0d6efd', bg: '#e8f0ff' },
    { kind: 'waiting-review',  count: reviewCount,     label: 'čekajících na kontrolu',   icon: 'solar:hourglass-bold-duotone',        color: '#0dcaf0', bg: '#e8f7ff' },
  ];

  const visibleUrgent = urgentCards.filter((c) => c.count > 0);
  const visibleInfo   = infoCards.filter((c) => c.count > 0);
  const totalUrgent   = visibleUrgent.reduce((s, c) => s + c.count, 0);

  // Render jedné karty — čtverec: ikona+číslo nahoře vedle sebe, label dole.
  // Bílé pozadí + barevný border-top, hover lift, active = filled.
  const renderCard = (c: CardDef) => {
    const active = activeQueue === c.kind;
    return (
      <div key={c.kind} className="col-6 col-md-4 col-lg-3 col-xl-2">
        <button
          type="button"
          className={`wq-card w-100 d-flex flex-column gap-1 px-3 py-3 rounded-3 ${active ? 'shadow-sm' : ''}`}
          style={{
            background: active ? c.color : '#ffffff',
            color: active ? '#ffffff' : '#212529',
            border: '1px solid ' + (active ? c.color : '#e9ecef'),
            borderTop: `3px solid ${c.color}`,
            transition: 'all 0.15s ease',
            cursor: 'pointer',
            textAlign: 'left',
            minHeight: 96,
          }}
          onClick={() => onSelectQueue(active ? null : c.kind)}
          title={`Filtrovat tabulku: ${c.label}`}
        >
          {/* Horní řádek: ikona vlevo + velké číslo vpravo */}
          <div className="d-flex align-items-center justify-content-between">
            <span
              className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              style={{
                width: 32,
                height: 32,
                background: active ? 'rgba(255,255,255,0.22)' : c.bg,
                color: active ? '#ffffff' : c.color,
              }}
            >
              <iconify-icon icon={c.icon} style={{ fontSize: 18 }} />
            </span>
            <span className="fw-bold czk-num" style={{ fontSize: 26, lineHeight: 1 }}>{c.count}</span>
          </div>
          {/* Label dole */}
          <div style={{ fontSize: 12, lineHeight: 1.3, color: active ? 'rgba(255,255,255,0.92)' : '#6c757d', marginTop: 'auto' }}>
            {c.label}
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="card mb-3" style={{ borderTop: '3px solid var(--prov-color, #c9911a)' }}>
      <div className="card-body py-3">
        {/* Header — title + sub-text + reset */}
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <iconify-icon icon="solar:inbox-bold-duotone" style={{ fontSize: 22, color: 'var(--prov-color, #c9911a)' }} />
          <h5 className="mb-0">Vyžaduje pozornost</h5>
          {totalUrgent > 0 ? (
            <span className="badge bg-danger" style={{ fontSize: 10 }}>
              {totalUrgent} k akci
            </span>
          ) : (
            <span className="badge bg-success-subtle text-success" style={{ fontSize: 10 }}>
              <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" style={{ fontSize: 10 }} />
              Vše v pořádku
            </span>
          )}
          <span className="text-muted fs-12 d-none d-md-inline ms-2">Klikni na kartu pro filtraci tabulky transakcí</span>
          {activeQueue && (
            <button className="btn btn-link btn-sm ms-auto text-muted p-0" style={{ fontSize: 12 }}
              onClick={() => onSelectQueue(null)}>
              Zrušit filtr ×
            </button>
          )}
        </div>

        {/* Empty state — žádné karty */}
        {visibleUrgent.length === 0 && visibleInfo.length === 0 && (
          <div className="text-center py-3" style={{ background: '#f8fbf9', borderRadius: 8 }}>
            <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 32, color: '#198754' }} />
            <div className="fw-semibold mt-1">Nic nevyžaduje pozornost</div>
            <div className="text-muted fs-12">Všechny transakce jsou spárované nebo manuálně ošetřené.</div>
          </div>
        )}

        {/* Urgent skupina */}
        {visibleUrgent.length > 0 && (
          <>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="text-uppercase fw-semibold fs-11" style={{ color: '#dc3545', letterSpacing: '0.4px' }}>K vyřešení</span>
              <div className="flex-grow-1" style={{ height: 1, background: 'linear-gradient(to right, #f1c2c2 0%, transparent 100%)' }} />
            </div>
            <div className="row g-2 mb-3">
              {visibleUrgent.map((c) => renderCard(c))}
            </div>
          </>
        )}

        {/* Info skupina */}
        {visibleInfo.length > 0 && (
          <>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="text-uppercase fw-semibold fs-11 text-muted" style={{ letterSpacing: '0.4px' }}>K přehledu</span>
              <div className="flex-grow-1" style={{ height: 1, background: 'linear-gradient(to right, #d6dae0 0%, transparent 100%)' }} />
            </div>
            <div className="row g-2">
              {visibleInfo.map((c) => renderCard(c))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Top summary banner (Zůstatek celkem) ───────────────────────
// Phase 7 (zápis 12. 6. 2026) — zjednodušený přehled:
//  - 2 ukazatele (nespárované / ručně spárované)
//  - Zůstatek CZK + EUR s rozbalovacím seznamem účtů
function SimpleMetrics({ transakce }: { transakce: BankaTransakce[] }) {
  const nespCount    = transakce.filter((t) => t.stav === 'unpaired').length;
  const rucneCount   = transakce.filter((t) => t.stav === 'manual-paired').length;
  const tiles = [
    { label: 'Nespárované platby',     value: nespCount,  icon: 'solar:danger-triangle-bold-duotone', color: nespCount > 0 ? '#ffc107' : '#9097a7', bg: '#fff8e6' },
    { label: 'Ručně spárované platby', value: rucneCount, icon: 'solar:hand-stars-bold-duotone',      color: '#6c757d', bg: '#f1f3f5' },
  ];
  return (
    <div className="row g-2 mb-3">
      {tiles.map((t) => (
        <div key={t.label} className="col-12 col-md-6">
          <div className="card h-100" style={{ borderTop: `3px solid ${t.color}` }}>
            <div className="card-body py-3 d-flex align-items-center gap-3">
              <span className="d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 44, height: 44, background: t.bg, color: t.color, flexShrink: 0 }}>
                <iconify-icon icon={t.icon} style={{ fontSize: 24 }} />
              </span>
              <div className="min-width-0">
                <div className="text-muted fs-12 text-uppercase fw-semibold" style={{ letterSpacing: '0.3px' }}>{t.label}</div>
                <div className="fw-bold czk-num" style={{ fontSize: 24, lineHeight: 1.1 }}>{t.value}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Zůstatek CZK / EUR + rozbalovací seznam jednotlivých účtů s čísly a zůstatky
function BalanceOverview({ ucty }: { ucty: BankaUcet[] }) {
  const [open, setOpen] = useState(false);
  const czk = sumForMena(ucty, 'CZK');
  const eur = sumForMena(ucty, 'EUR');
  const czkUcty = ucty.filter((u) => u.mena === 'CZK');
  const eurUcty = ucty.filter((u) => u.mena === 'EUR');
  return (
    <div className="card mb-3" style={{ borderTop: '3px solid var(--prov-color, #c9911a)', background: '#f1faf3' }}>
      <div className="card-body py-3">
        {/* Hlavička — 2 měny vedle sebe */}
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-6">
            <div className="text-muted fs-12 text-uppercase fw-semibold mb-1">Zůstatek (CZK)</div>
            <div className="d-flex align-items-baseline gap-3 flex-wrap">
              <span className="czk-num fw-bold" style={{ fontSize: 26, whiteSpace: 'nowrap' }}>{fCzk(czk.ucetni)}</span>
              <span className="text-muted fs-13" style={{ whiteSpace: 'nowrap' }}>· dostupné <strong className="czk-num text-success">{fCzk(czk.dostupne)}</strong></span>
            </div>
            <div className="text-muted fs-12">{czkUcty.length} {czkUcty.length === 1 ? 'účet' : czkUcty.length < 5 ? 'účty' : 'účtů'}</div>
          </div>
          <div className="col-12 col-md-6">
            <div className="text-muted fs-12 text-uppercase fw-semibold mb-1">Zůstatek (EUR)</div>
            <div className="d-flex align-items-baseline gap-3 flex-wrap">
              <span className="czk-num fw-bold" style={{ fontSize: 26, whiteSpace: 'nowrap' }}>{eur.ucetni.toFixed(2)} €</span>
              <span className="text-muted fs-13" style={{ whiteSpace: 'nowrap' }}>· dostupné <strong className="czk-num text-success">{eur.dostupne.toFixed(2)} €</strong></span>
            </div>
            <div className="text-muted fs-12">{eurUcty.length} {eurUcty.length === 1 ? 'účet' : eurUcty.length < 5 ? 'účty' : 'účtů'}</div>
          </div>
        </div>

        {/* Rozbalovací seznam účtů */}
        <button className="btn btn-link btn-sm p-0 mt-2 text-muted d-flex align-items-center gap-1"
          style={{ fontSize: 12, textDecoration: 'none' }}
          onClick={() => setOpen((v) => !v)}>
          <iconify-icon icon={open ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-right-bold'} />
          {open ? 'Skrýt seznam účtů' : `Zobrazit seznam účtů (${ucty.length})`}
        </button>

        {open && (
          <div className="mt-2 border-top pt-2">
            <div className="table-responsive">
              <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                <thead className="table-light">
                  <tr>
                    <th>Účet</th>
                    <th>Číslo / IBAN</th>
                    <th>Banka</th>
                    <th className="text-end">Účetní</th>
                    <th className="text-end">Dostupné</th>
                  </tr>
                </thead>
                <tbody>
                  {ucty.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="fw-semibold">{u.nazev}</div>
                        <span className="badge bg-light text-dark border" style={{ fontSize: 10 }}>{u.mena}</span>
                      </td>
                      <td className="czk-num text-muted" style={{ fontSize: 11 }}>{u.iban}</td>
                      <td className="text-muted">{u.banka}</td>
                      <td className="text-end czk-num">
                        {u.mena === 'EUR' ? `${u.ucetniBalance.toFixed(2)} €` : fCzk(u.ucetniBalance)}
                      </td>
                      <td className="text-end czk-num fw-semibold text-success">
                        {u.mena === 'EUR' ? `${u.dostupniProstredky.toFixed(2)} €` : fCzk(u.dostupniProstredky)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AutoSyncBar ────────────────────────────────────────────────
// Phase 2.3b — AutoSyncBar rozšířen o:
//  - Error stav (autosync vypnutý kvůli chybě + tlačítko Zapnout znovu) — per zápis B9
//  - Hromadné platby (Odeslat dávku + Vrátit poslední krok) — per zápis B10 (API limit ~300/den)
function AutoSyncBar({ pendingCount, paymentsQueueCount, apiCallsUsed }: {
  pendingCount: number;
  paymentsQueueCount: number;
  apiCallsUsed: number;
}) {
  // Phase 8.6 (zápis 22. 6. 2026) — AutoSyncBar dočasně zjednodušen na status-only.
  // Hromadné dávky + error UI (manual trigger) + ručně spouštěné akce odebrány do dořešení finální podoby.
  void paymentsQueueCount;

  return (
    <div className="d-flex align-items-center gap-2 flex-wrap row-gap-2 px-3 py-2 mb-3 rounded"
      style={{ background: '#f8f9fa', border: '1px solid #e9ecef', fontSize: 12 }}>
      {/* Status */}
      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: '#198754', boxShadow: '0 0 0 3px rgba(25,135,84,0.15)' }} />
        <span className="fw-semibold">Auto-sync</span>
        <span className="badge bg-success-subtle text-success" style={{ fontSize: 10 }}>Aktivní</span>
      </div>
      {/* Metriky */}
      <div className="d-flex align-items-center gap-1 text-muted flex-shrink-0" title="Interval synchronizace">
        <iconify-icon icon="solar:refresh-circle-bold-duotone" style={{ fontSize: 13 }} />
        <span>15 min</span>
      </div>
      <div className="d-flex align-items-center gap-1 text-muted flex-shrink-0" title="Poslední synchronizace">
        <iconify-icon icon="solar:clock-circle-bold-duotone" style={{ fontSize: 13 }} />
        <span className="d-none d-md-inline">Poslední:</span>
        <span className="fw-semibold text-dark czk-num">14:32</span>
      </div>
      <div className="d-flex align-items-center gap-1 text-muted flex-shrink-0" title="Příští synchronizace">
        <iconify-icon icon="solar:alarm-bold-duotone" style={{ fontSize: 13 }} />
        <span className="d-none d-md-inline">Příští:</span>
        <span className="fw-semibold text-dark czk-num">14:47</span>
      </div>
      {/* API limit */}
      <div className="d-flex align-items-center gap-1 text-muted flex-shrink-0" title="Dotazy spotřebované z denního limitu (banka cca 300/den)">
        <iconify-icon icon="solar:server-square-bold-duotone" style={{ fontSize: 13 }} />
        <span className="d-none d-md-inline">API:</span>
        <span className={`fw-semibold czk-num ${apiCallsUsed > 250 ? 'text-warning' : 'text-dark'}`}>{apiCallsUsed}/300</span>
      </div>
      {/* Phase 8.6 (zápis 22. 6. 2026) — odebráno per zpětnou vazba: CTA "Odeslat dávku" + celá spodní řada (Živě / Znovu načíst / Simulovat chybu). Komponenta je v mapě + Kódu označená jako "rozpracované" — finální podoba bude dořešena. */}
    </div>
  );
}

// ── Karta účtu ─────────────────────────────────────────────────
function UcetCard({ ucet, allBranches, isHighlighted, isSyncing, cardRef, onOpenDetail, onAction }: {
  ucet: BankaUcet;
  allBranches: boolean;
  isHighlighted?: boolean;
  isSyncing?: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
  onOpenDetail?: (id: string) => void;
  onAction?: (action: 'prevod' | 'resync' | 'prirazeni', ucetId: string) => void;
}) {
  const provs = getProvozovnyForUcet(ucet);
  const stavMeta = STAV_META[ucet.stav];
  // Brand color: 1 provoz → její barva; multi → gold; žádná → šedá
  const brandColor = provs.length === 1 ? provs[0].color
                   : provs.length > 1   ? '#c9911a'
                   : '#9097a7';
  const isPredikceUp = ucet.predikceKonecMesice >= ucet.ucetniBalance;
  const todayIdx = 30; // index dneška ve sparkline (30 minulých + dnes)
  const isProblematic = ucet.stav !== 'ok';

  function stopProp(e: React.MouseEvent) { e.stopPropagation(); }

  return (
    <div ref={cardRef} className={`card h-100 ${isHighlighted ? 'banka-card-highlight' : ''}`}
      style={{ borderTop: `3px solid ${brandColor}`, transition: 'box-shadow 0.25s ease, transform 0.15s ease', cursor: 'pointer' }}
      onClick={() => onOpenDetail?.(ucet.id)}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
      <div className="card-body p-3">
        {/* Header — kompaktní layout, vše do 1-2 řádků */}
        <div className="mb-2">
          <div className="d-flex align-items-center gap-1 mb-1 flex-wrap">
            <span className="fw-bold fs-14 text-truncate" style={{ minWidth: 0, flexShrink: 1 }} title={ucet.nazev}>
              {ucet.nazev}
            </span>
            <span className="badge bg-light text-muted border ms-auto flex-shrink-0" style={{ fontSize: 9 }}>{ucet.mena}</span>
            <span className="badge flex-shrink-0" style={{ background: stavMeta.bg, color: stavMeta.color, fontSize: 9 }}
              title={stavMeta.labelLong}>
              <iconify-icon icon={stavMeta.icon} className="me-1" />
              {stavMeta.label}
            </span>
          </div>
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <span className="text-muted czk-num text-truncate" style={{ fontSize: 10, minWidth: 0 }} title={ucet.iban}>
              {ucet.iban}
            </span>
            <span className="text-muted flex-shrink-0" style={{ fontSize: 10 }}>{timeAgo(ucet.lastSync)}</span>
          </div>
          <div className="text-muted text-truncate" style={{ fontSize: 10 }}>{ucet.banka}</div>
        </div>

        {/* Balance */}
        <div className="mb-2">
          <div className="d-flex align-items-baseline gap-2 flex-wrap">
            <span className="text-muted fs-12">Účetní bilance:</span>
            <span className="czk-num fw-bold" style={{ fontSize: 16 }}>
              {ucet.mena === 'CZK' ? fCzk(ucet.ucetniBalance) : `${ucet.ucetniBalance.toFixed(2)} €`}
            </span>
          </div>
          <div className="d-flex align-items-baseline gap-2 flex-wrap">
            <span className="text-muted fs-12">Dostupní prostředky:</span>
            <span className="czk-num fw-semibold" style={{ fontSize: 13, color: '#198754' }}>
              {ucet.mena === 'CZK' ? fCzk(ucet.dostupniProstredky) : `${ucet.dostupniProstredky.toFixed(2)} €`}
            </span>
          </div>
        </div>

        {/* Sparkline */}
        <div className="mb-2">
          <Sparkline values={ucet.historieBalance} todayIdx={todayIdx} color={brandColor} />
          <div className="d-flex justify-content-between text-muted" style={{ fontSize: 10 }}>
            <span>-30 dní</span>
            <span>dnes</span>
            <span>+7 dní</span>
          </div>
        </div>

        {/* Predikce čísla */}
        <div className="d-flex flex-column gap-1 pb-2 mb-2 border-bottom">
          <div className="d-flex justify-content-between align-items-center gap-1">
            <span className="text-muted flex-shrink-0" style={{ fontSize: 11 }}>Týden:</span>
            <span className="czk-num fw-semibold text-end" style={{ fontSize: 12, color: isPredikceUp ? '#198754' : '#dc3545' }}>
              {ucet.mena === 'CZK' ? fCzk(ucet.predikceKonecTydne) : `${ucet.predikceKonecTydne.toFixed(2)} €`}
            </span>
          </div>
          <div className="d-flex justify-content-between align-items-center gap-1">
            <span className="text-muted flex-shrink-0" style={{ fontSize: 11 }}>Měsíc:</span>
            <span className="czk-num fw-semibold text-end" style={{ fontSize: 12, color: isPredikceUp ? '#198754' : '#dc3545' }}>
              {ucet.mena === 'CZK' ? fCzk(ucet.predikceKonecMesice) : `${ucet.predikceKonecMesice.toFixed(2)} €`}
              <iconify-icon
                icon={isPredikceUp ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'}
                className="ms-1" style={{ fontSize: 10 }}
              />
            </span>
          </div>
        </div>

        {/* Napárované provozovny — vždy u multi-venue, u single-venue jen když "Všechny" */}
        {(allBranches || provs.length > 1 || provs.length === 0) && (
          <div>
            <div className="text-muted fs-11 fw-semibold mb-1">
              {provs.length === 0 ? 'Bez přiřazení'
                : provs.length === 1 ? 'Napárováno na:'
                : `Napárováno na ${provs.length} provozovny:`}
            </div>
            {provs.length > 0 ? (
              <div className="d-flex flex-wrap gap-1">
                {provs.slice(0, 5).map((p) => (
                  <span key={p.id} className="badge bg-light text-dark border d-flex align-items-center gap-1" style={{ fontSize: 10 }}>
                    <span className="rounded-circle" style={{ width: 6, height: 6, background: p.color, display: 'inline-block' }} />
                    {p.shortName}
                  </span>
                ))}
                {provs.length > 5 && (
                  <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 10 }}
                    title={provs.slice(5).map((p) => p.shortName).join(', ')}>
                    +{provs.length - 5} dalších
                  </span>
                )}
              </div>
            ) : (
              <span className="badge bg-warning-subtle text-warning" style={{ fontSize: 10 }}>
                <iconify-icon icon="solar:question-circle-bold-duotone" className="me-1" />
                Neznámý účel
              </span>
            )}
          </div>
        )}

        {/* Akční tlačítka — jen pro problémové účty */}
        {isProblematic && (
          <div className="d-flex gap-1 mt-2 pt-2 border-top" onClick={stopProp}>
            {(ucet.stav === 'critical-balance' || ucet.stav === 'low-balance') && (
              <button className="btn btn-outline-primary btn-sm flex-grow-1 py-1" style={{ fontSize: 10 }}
                onClick={() => onAction?.('prevod', ucet.id)}>
                <iconify-icon icon="solar:transfer-horizontal-bold-duotone" className="me-1" />
                Převést
              </button>
            )}
            {ucet.stav === 'sync-error' && (
              <button className="btn btn-outline-warning btn-sm flex-grow-1 py-1" style={{ fontSize: 10 }}
                disabled={isSyncing}
                onClick={() => onAction?.('resync', ucet.id)}>
                <iconify-icon icon="solar:refresh-bold-duotone" className={`me-1 ${isSyncing ? 'spin' : ''}`} />
                {isSyncing ? 'Sync…' : 'Resync'}
              </button>
            )}
            {provs.length === 0 && (
              <button className="btn btn-outline-info btn-sm flex-grow-1 py-1" style={{ fontSize: 10 }}
                onClick={() => onAction?.('prirazeni', ucet.id)}>
                <iconify-icon icon="solar:link-bold-duotone" className="me-1" />
                Přiřadit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Důvody pro „mimo systém" a „bez faktury" ──────────────────
const OUTSIDE_REASONS: Array<{ value: string; label: string }> = [
  { value: 'interni-prevod',     label: 'Interní převod mezi účty' },
  { value: 'vratka-zakaznik',    label: 'Vratka zákazníkovi' },
  { value: 'osobni-vyber',       label: 'Osobní výběr majitele' },
  { value: 'jina-evidence',      label: 'Vedeno v jiné evidenci' },
  { value: 'jine',               label: 'Jiný důvod' },
];
const NO_INVOICE_REASONS: Array<{ value: string; label: string }> = [
  { value: 'bankovni-poplatek',  label: 'Bankovní poplatek' },
  { value: 'urok',               label: 'Úrok' },
  { value: 'pojisteni',          label: 'Pojištění' },
  { value: 'mzda',               label: 'Mzda / odměna' },
  { value: 'dane',               label: 'Daň / odvod' },
  { value: 'pokuta',             label: 'Pokuta' },
  { value: 'jine',               label: 'Jiné' },
];

// Sloučená aktivita: poznámky + audit zápisy v chronologickém feedu
type ActivityEntry =
  | { type: 'note'; id: string; cas: string; kdo: string; text: string }
  | { type: 'audit'; id: string; cas: string; kdo: string; akce: string; icon: string; color: string };

// ── Side-panel detail transakce ────────────────────────────────
function TransakceSidePanel({ transakce, ucty, onClose, onPatch, onAudit, onNote, onOpenFaktura, onCreateTP }: {
  transakce: BankaTransakce | null;
  ucty: BankaUcet[];
  onClose: () => void;
  onPatch: (id: string, patch: Partial<BankaTransakce>) => void;
  onAudit: (id: string, entry: TransAuditEntry) => void;
  onNote:  (id: string, note: TransNote) => void;
  onOpenFaktura?: (fakturaId: string) => void;   // Phase 2.3 — cross-section navigace
  onCreateTP?: (payload: { firma: string; castka: number; protiUcet?: string; vs?: string }) => void; // Phase 8.5 (zápis 12. 6.) — vytvořit TP z transakce
}) {
  const [noteInput, setNoteInput] = useState('');
  const [manualMatchInvoice, setManualMatchInvoice] = useState('');
  // Sjednocený dropdown „Označit jako…": null / 'outside' / 'no-invoice'
  const [oznacitMode, setOznacitMode] = useState<'outside' | 'no-invoice' | 'loan-payment' | null>(null);
  const [oznacitReason, setOznacitReason] = useState('');
  const [oznacitNote, setOznacitNote] = useState('');
  const [activityCollapsed, setActivityCollapsed] = useState(false);
  // Phase 2.3 — delegace na uživatele
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [delegateUserId, setDelegateUserId] = useState('');
  const [delegateNote, setDelegateNote] = useState('');
  // Mikrofeedback po úspěšné akci (krátký toast in-panel)
  const [feedback, setFeedback] = useState<string | null>(null);

  // Reset state když se mění transakce
  useEffect(() => {
    setNoteInput('');
    setManualMatchInvoice('');
    setOznacitMode(null);
    setOznacitReason('');
    setOznacitNote('');
    setDelegateOpen(false);
    setDelegateUserId('');
    setDelegateNote('');
    setFeedback(null);
  }, [transakce?.id]);

  // Auto-dismiss mikrofeedbacku po 2.5s
  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(null), 2500);
    return () => window.clearTimeout(id);
  }, [feedback]);

  if (!transakce) {
    return (
      <div className="card h-100" style={{ minHeight: 320 }}>
        <div className="card-body d-flex flex-column align-items-center justify-content-center text-center py-5">
          <iconify-icon icon="solar:card-transfer-bold-duotone" style={{ fontSize: 40, color: '#dee2e6', marginBottom: 12 }} />
          <div className="fw-semibold text-muted fs-14 mb-1">Žádná transakce vybrána</div>
          <div className="text-muted fs-12">Klikněte na řádek transakce pro zobrazení detailu</div>
        </div>
      </div>
    );
  }
  const ucet = ucty.find((u) => u.id === transakce.ucetId);
  const provs = ucet ? getProvozovnyForUcet(ucet) : [];
  const stavMeta = TRANS_STAV_META[transakce.stav];
  const isPrichoz = transakce.typ === 'prichoz';
  const formatAmount = (n: number) => ucet?.mena === 'EUR' ? `${n.toFixed(2)} €` : fCzk(n);

  // Aktuální čas pro audit/note
  const nowIso = () => new Date().toISOString().slice(0, 16);
  const me = 'Petr Dohnal'; // mock přihlášený uživatel

  const handleConfirmManualMatch = () => {
    const inv = manualMatchInvoice.trim();
    if (!inv) return;
    onPatch(transakce.id, { stav: 'paired', parovanaSId: inv });
    onAudit(transakce.id, {
      cas: nowIso(), kdo: me,
      akce: `Manuálně napárováno na fakturu ${inv}`,
      icon: 'solar:link-bold-duotone', color: '#198754',
    });
    setManualMatchInvoice('');
    setFeedback(`Napárováno na ${inv}`);
  };

  const handleSelectCandidate = (c: SuggestedMatch) => {
    onPatch(transakce.id, { stav: 'paired', parovanaSId: c.fakturaCislo });
    onAudit(transakce.id, {
      cas: nowIso(), kdo: me,
      akce: `Napárováno na ${c.fakturaCislo} (kandidát ${c.matchScore} %)`,
      icon: 'solar:check-circle-bold-duotone', color: '#198754',
    });
    setFeedback(`Napárováno na ${c.fakturaCislo}`);
  };

  const handleRejectCandidate = (c: SuggestedMatch) => {
    onAudit(transakce.id, {
      cas: nowIso(), kdo: me,
      akce: `Kandidát ${c.fakturaCislo} odmítnut`,
      icon: 'solar:close-circle-bold-duotone', color: '#dc3545',
    });
    onPatch(transakce.id, {
      candidates: (transakce.candidates ?? []).filter((x) => x.fakturaId !== c.fakturaId),
    });
  };

  const handleCreateInvoice = () => {
    const generatedNumber = `FA-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    onPatch(transakce.id, { stav: 'paired', parovanaSId: generatedNumber });
    onAudit(transakce.id, {
      cas: nowIso(), kdo: me,
      akce: `Vystavena nová faktura ${generatedNumber} a napárována`,
      icon: 'solar:add-square-bold-duotone', color: '#0d6efd',
    });
    setFeedback(`Vystavena ${generatedNumber}`);
  };

  const handleConfirmOznacit = () => {
    if (!oznacitMode || !oznacitReason) return;
    // Per zápis 4. 6. 2026 — obě varianty → 'manual-paired' (jednotný stav, rozliší přes manualReason)
    if (oznacitMode === 'outside') {
      const label = OUTSIDE_REASONS.find((r) => r.value === oznacitReason)?.label ?? oznacitReason;
      onPatch(transakce.id, {
        stav: 'manual-paired',
        manualReason: label,
        manualNote: oznacitNote,
      });
      onAudit(transakce.id, {
        cas: nowIso(), kdo: me,
        akce: `Spárováno ručně: ${label}`,
        icon: 'solar:hand-stars-bold-duotone', color: '#6c757d',
      });
      setFeedback('Spárováno ručně');
    } else {
      const label = NO_INVOICE_REASONS.find((r) => r.value === oznacitReason)?.label ?? oznacitReason;
      onPatch(transakce.id, {
        stav: 'manual-paired',
        manualReason: label,
      });
      onAudit(transakce.id, {
        cas: nowIso(), kdo: me,
        akce: `Spárováno ručně (bez faktury): ${label}`,
        icon: 'solar:hand-stars-bold-duotone', color: '#fd7e14',
      });
      setFeedback('Spárováno ručně (bez faktury)');
    }
    setOznacitMode(null);
    setOznacitReason('');
    setOznacitNote('');
  };

  const handleUnpair = () => {
    onPatch(transakce.id, { stav: 'unpaired', parovanaSId: undefined });
    onAudit(transakce.id, {
      cas: nowIso(), kdo: me,
      akce: 'Zrušeno párování',
      icon: 'solar:link-broken-minimalistic-bold-duotone', color: '#6c757d',
    });
    setFeedback('Párování zrušeno');
  };

  const handleReturnToUnpaired = () => {
    onPatch(transakce.id, { stav: 'unpaired', manualReason: undefined, manualNote: undefined });
    onAudit(transakce.id, {
      cas: nowIso(), kdo: me,
      akce: 'Vráceno do nespárovaných',
      icon: 'solar:undo-left-round-bold-duotone', color: '#6c757d',
    });
    setFeedback('Vráceno do nespárovaných');
  };

  const handleConfirmDelegate = () => {
    const user = BANKA_USERS.find((u) => u.id === delegateUserId);
    if (!user) return;
    onPatch(transakce.id, {
      delegatedTo: { user: user.jmeno, role: user.role, cas: nowIso(), note: delegateNote.trim() || undefined },
    });
    onAudit(transakce.id, {
      cas: nowIso(), kdo: me,
      akce: `Přiděleno: ${user.jmeno} (${user.role})${delegateNote.trim() ? ` — „${delegateNote.trim()}"` : ''}`,
      icon: 'solar:user-id-bold-duotone', color: user.color,
    });
    setFeedback(`Přiděleno: ${user.jmeno}`);
    setDelegateOpen(false);
    setDelegateUserId('');
    setDelegateNote('');
  };

  const handleClearDelegate = () => {
    if (!transakce.delegatedTo) return;
    const prev = transakce.delegatedTo.user;
    onPatch(transakce.id, { delegatedTo: undefined });
    onAudit(transakce.id, {
      cas: nowIso(), kdo: me,
      akce: `Zrušeno přidělení: ${prev}`,
      icon: 'solar:close-circle-bold-duotone', color: '#6c757d',
    });
    setFeedback('Přidělení zrušeno');
  };

  const handleApproveInternalTransfer = () => {
    onPatch(transakce.id, {
      stav: 'manual-paired',
      manualReason: 'Interní převod',
      manualNote: 'Auto-detekováno + schváleno (protistrana = firemní účet)',
    });
    onAudit(transakce.id, {
      cas: nowIso(), kdo: me,
      akce: 'Schváleno jako interní převod (auto-detekce)',
      icon: 'solar:transfer-horizontal-bold-duotone', color: '#0dcaf0',
    });
    setFeedback('Schváleno jako interní převod');
  };

  const handleAddNote = () => {
    const txt = noteInput.trim();
    if (!txt) return;
    onNote(transakce.id, { id: `n-${Date.now()}`, cas: nowIso(), kdo: me, text: txt });
    setNoteInput('');
  };

  // Audit & notes — merged data (mock + session) sloučené chronologicky
  const auditEntries = transakce.auditLog ?? [];
  const notes        = transakce.notes ?? [];
  const candidates   = transakce.candidates ?? [];
  const hasNoVs      = !transakce.vs;
  const hasNoBranch  = ucet ? ucet.provozovny.length === 0 : false;

  const activityFeed: ActivityEntry[] = [
    ...notes.map<ActivityEntry>((n) => ({ type: 'note', id: n.id, cas: n.cas, kdo: n.kdo, text: n.text })),
    ...auditEntries.map<ActivityEntry>((a, i) => ({ type: 'audit', id: `a-${i}-${a.cas}`, cas: a.cas, kdo: a.kdo, akce: a.akce, icon: a.icon, color: a.color })),
  ].sort((a, b) => b.cas.localeCompare(a.cas));

  // Potřebuje akci? (po Phase 2 redukci stavů — všechno čekající jsou 'unpaired')
  const needsAction = transakce.stav === 'unpaired';

  const SectionHeading = ({ icon, color, title, right }: { icon: string; color: string; title: string; right?: React.ReactNode }) => (
    <div className="d-flex align-items-center gap-2 mb-2">
      <iconify-icon icon={icon} style={{ fontSize: 14, color }} />
      <div className="fw-semibold fs-12 text-uppercase" style={{ letterSpacing: '0.3px', color: '#495057' }}>{title}</div>
      {right && <div className="ms-auto">{right}</div>}
    </div>
  );

  return (
    <div style={{
      position: 'sticky',
      top: 'calc(var(--bs-topbar-height, 100px) + 16px)',
      // Fixní výška (ne max) — vždy bude vlastní scrollbar uvnitř panelu,
      // wheel events nesplývají s page scrollem (overscrollBehavior: contain).
      height: 'calc(100vh - var(--bs-topbar-height, 100px) - 32px)',
      overflowY: 'auto',
      overscrollBehavior: 'contain',
    }}>
      <div className="card">
        {/* ── HEADER (vždy viditelný) — typ, stav, dodavatel, částka + datum ── */}
        <div className="card-header d-flex align-items-start gap-2">
          <div className="flex-grow-1 min-width-0">
            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
              <span className={`badge ${isPrichoz ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                <iconify-icon icon={isPrichoz ? 'solar:arrow-down-bold' : 'solar:arrow-up-bold'} className="me-1" />
                {isPrichoz ? 'Příchozí' : 'Odchozí'}
              </span>
              <span className={`badge ${stavMeta.cls}`} title={stavMeta.label}>
                <iconify-icon icon={stavMeta.icon} className="me-1" />
                {stavMeta.label}
              </span>
            </div>
            <div className="fw-bold fs-14 text-truncate">{transakce.firma}</div>
            <div className="text-muted fs-11">{transakce.poznamka}</div>
            <div className="d-flex align-items-baseline gap-2 mt-2">
              <div className={`fw-bold czk-num ${transakce.castka < 0 ? 'text-danger' : 'text-success'}`} style={{ fontSize: 20, lineHeight: 1 }}>
                {formatAmount(transakce.castka)}
              </div>
              <div className="text-muted fs-11">· {fDate(transakce.datum.slice(0, 10))} {transakce.datum.slice(11, 16)}</div>
            </div>
          </div>
          <button className="btn-close flex-shrink-0 mt-1" style={{ fontSize: 11 }} onClick={onClose} />
        </div>

        {/* ── ALERTY (kontextové) + mikrofeedback ── */}
        {(feedback || transakce.isOverdueAtBank || hasNoVs || hasNoBranch || transakce.hasError || transakce.isWaitingReview) && (
          <div className="px-3 pt-3 d-flex flex-column gap-2">
            {feedback && (
              <div className="alert alert-success py-2 mb-0 fs-12 d-flex align-items-center gap-2" style={{ borderLeft: '3px solid #198754' }}>
                <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 16 }} />
                <span>{feedback}</span>
              </div>
            )}
            {transakce.isOverdueAtBank && (
              <div className="alert alert-danger py-2 mb-0 fs-12 d-flex align-items-center gap-2">
                <iconify-icon icon="solar:bell-bing-bold-duotone" style={{ fontSize: 16 }} />
                <div>
                  <div className="fw-semibold">V bance neuhrazená</div>
                  <div>Odeslaná, ale nespárovaná víc než 3 dny po splatnosti{transakce.splatnost && <> ({fDate(transakce.splatnost)})</>}.</div>
                </div>
              </div>
            )}
            {hasNoVs && (
              <div className="alert alert-warning py-2 mb-0 fs-12 d-flex align-items-center gap-2">
                <iconify-icon icon="solar:hashtag-square-bold-duotone" style={{ fontSize: 16 }} />
                <span>Transakce nemá VS — automatické párování není možné.</span>
              </div>
            )}
            {hasNoBranch && (
              <div className="alert alert-secondary py-2 mb-0 fs-12 d-flex align-items-center gap-2">
                <iconify-icon icon="solar:buildings-3-bold-duotone" style={{ fontSize: 16 }} />
                <span>Účet nemá přiřazenou provozovnu.</span>
              </div>
            )}
            {transakce.isWaitingReview && transakce.stav === 'unpaired' && (
              <div className="alert alert-info py-2 mb-0 fs-12 d-flex align-items-center gap-2">
                <iconify-icon icon="solar:hourglass-bold-duotone" style={{ fontSize: 16 }} />
                <span>Čeká na automatické párování (auto-sync 15 min).</span>
              </div>
            )}
            {transakce.hasError && (
              <div className="alert alert-danger py-2 mb-0 fs-12 d-flex align-items-center gap-2">
                <iconify-icon icon="solar:close-circle-bold-duotone" style={{ fontSize: 16 }} />
                <span>Při zpracování došlo k chybě.</span>
              </div>
            )}
          </div>
        )}

        {/* ═══ SINGLE-SCROLL CONTENT ═══ */}
        <div className="card-body p-0">

          {/* ── AKČNÍ ZÓNA (vždy nahoře, kontextová podle stavu) ── */}
          <section className="p-3 border-bottom" style={{ background: '#fafbfc' }}>
            <SectionHeading icon="solar:bolt-bold-duotone" color="#0d6efd" title="Akce" />

            {/* PAIRED → success card + proklik na fakturu + Unpair */}
            {transakce.stav === 'paired' && (
              <div className="alert alert-success py-2 mb-0">
                <div className="d-flex align-items-center gap-2">
                  <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 18 }} />
                  <div className="flex-grow-1">
                    <div className="fw-semibold fs-13">Napárováno</div>
                    <div className="fs-11">Faktura {transakce.parovanaSId ?? '—'}</div>
                  </div>
                  {transakce.parovanaSId && onOpenFaktura && (
                    <button className="btn btn-success btn-sm" onClick={() => onOpenFaktura(transakce.parovanaSId!)} title="Otevřít detail faktury">
                      <iconify-icon icon="solar:square-top-up-bold-duotone" className="me-1" />
                      Otevřít fakturu
                    </button>
                  )}
                  <button className="btn btn-outline-secondary btn-sm" onClick={handleUnpair} title="Zrušit párování">
                    <iconify-icon icon="solar:link-broken-minimalistic-bold-duotone" />
                  </button>
                </div>
              </div>
            )}

            {/* MANUAL-PAIRED → info (důvod + poznámka) + return */}
            {transakce.stav === 'manual-paired' && (
              <div className="d-flex flex-column gap-2">
                <div className="alert alert-secondary py-2 mb-0 fs-12">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <iconify-icon icon="solar:hand-stars-bold-duotone" style={{ fontSize: 16 }} />
                    <span className="fw-semibold">Spárováno ručně</span>
                  </div>
                  {transakce.manualReason && <div>Důvod: {transakce.manualReason}</div>}
                  {transakce.manualNote && <div className="fst-italic mt-1">„{transakce.manualNote}"</div>}
                </div>
                <button className="btn btn-light btn-sm" onClick={handleReturnToUnpaired}>
                  <iconify-icon icon="solar:undo-left-round-bold-duotone" className="me-2" />
                  Vrátit do nespárovaných
                </button>
              </div>
            )}

            {/* NEEDS ACTION → kandidáti + manuální + vystavit + označit jako… */}
            {needsAction && (
              <div className="d-flex flex-column gap-3">

                {/* Interní převod — auto-detekce */}
                {isInternalTransfer(transakce, ucty) && (
                  <div className="alert alert-info py-2 mb-0 fs-12">
                    <div className="d-flex align-items-start gap-2 mb-2">
                      <iconify-icon icon="solar:transfer-horizontal-bold-duotone" style={{ fontSize: 16 }} />
                      <div>
                        <div className="fw-semibold">Detekováno: interní převod</div>
                        <div>Protistrana ({transakce.protiUcet}) je firemní účet — lze auto-schválit.</div>
                      </div>
                    </div>
                    <button className="btn btn-info btn-sm w-100" onClick={handleApproveInternalTransfer}>
                      <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                      Schválit jako interní převod
                    </button>
                  </div>
                )}

                {/* Kandidáti */}
                {candidates.length > 0 ? (
                  <div>
                    <div className="d-flex align-items-center gap-1 mb-2">
                      <iconify-icon icon="solar:layers-bold-duotone" style={{ fontSize: 14, color: '#6f42c1' }} />
                      <div className="fw-semibold fs-12">Navržení kandidáti ({candidates.length})</div>
                    </div>
                    <div className="d-flex flex-column gap-2">
                      {candidates.map((c, idx) => {
                        const isBest = c.matchScore >= 80 && idx === 0;
                        return (
                          <div key={c.fakturaId} className="rounded p-2"
                               style={{
                                 background: isBest ? '#eaf7ee' : '#ffffff',
                                 border: isBest ? '2px solid #198754' : '1px solid #dee2e6',
                               }}>
                            <div className="d-flex align-items-start gap-2 mb-2">
                              <div className="flex-grow-1 min-width-0">
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                  <div className="fw-semibold fs-13 text-truncate">{c.dodavatel}</div>
                                  {isBest && (
                                    <span className="badge bg-success" style={{ fontSize: 9 }}>DOPORUČENO</span>
                                  )}
                                </div>
                                <div className="text-muted fs-11 czk-num">{c.fakturaCislo} · {formatAmount(c.castka)}</div>
                              </div>
                              <div className="text-end flex-shrink-0">
                                <div className={`fw-bold fs-14 ${c.matchScore >= 80 ? 'text-success' : c.matchScore >= 50 ? 'text-warning' : 'text-danger'}`}>
                                  {c.matchScore} %
                                </div>
                                <div className="text-muted fs-11">shoda</div>
                              </div>
                            </div>
                            {c.duvody.length > 0 && (
                              <div className="d-flex flex-wrap gap-1 mb-2">
                                {c.duvody.map((d, i) => (
                                  <span key={i} className="badge bg-light text-dark border" style={{ fontSize: 10 }}>{d}</span>
                                ))}
                              </div>
                            )}
                            <div className="d-flex gap-1">
                              <button className="btn btn-success btn-sm flex-grow-1" onClick={() => handleSelectCandidate(c)}>
                                <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                                Potvrdit
                              </button>
                              <button className="btn btn-outline-secondary btn-sm" onClick={() => handleRejectCandidate(c)} title="Odmítnout">
                                <iconify-icon icon="solar:close-circle-bold-duotone" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null /* waiting-review se ukazuje jako alert nahoře přes isWaitingReview flag */}

                {/* Manuální párování (s mock datalist) */}
                <div>
                  <div className="d-flex align-items-center gap-1 mb-2">
                    <iconify-icon icon="solar:link-bold-duotone" style={{ fontSize: 14, color: '#0d6efd' }} />
                    <div className="fw-semibold fs-12">Napárovat ručně</div>
                  </div>
                  <div className="d-flex gap-1">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Začni psát VS nebo číslo faktury…"
                      list="mock-faktury-list"
                      value={manualMatchInvoice}
                      onChange={(e) => setManualMatchInvoice(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                    <datalist id="mock-faktury-list">
                      <option value="FA-2026-0042" />
                      <option value="FA-2026-0103" />
                      <option value="FA-2026-0154" />
                      <option value="FA-2026-0211" />
                      <option value="FA-2026-0287" />
                    </datalist>
                    <button className="btn btn-primary btn-sm" disabled={!manualMatchInvoice.trim()} onClick={handleConfirmManualMatch}>
                      Potvrdit
                    </button>
                  </div>
                </div>

                {/* Vystavit fakturu (jen pro příchozí) */}
                {isPrichoz && (
                  <button className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2" onClick={handleCreateInvoice}>
                    <iconify-icon icon="solar:add-square-bold-duotone" />
                    Vystavit novou fakturu
                  </button>
                )}

                {/* Delegovat na uživatele */}
                {transakce.delegatedTo ? (
                  <div className="border rounded p-2" style={{ background: '#f3f7fb' }}>
                    <div className="d-flex align-items-center gap-2">
                      {(() => {
                        const u = BANKA_USERS.find((x) => x.jmeno === transakce.delegatedTo?.user);
                        return (
                          <span className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold text-white"
                                style={{ width: 24, height: 24, fontSize: 11, background: u?.color ?? '#6c757d' }}>
                            {u?.initials ?? '?'}
                          </span>
                        );
                      })()}
                      <div className="flex-grow-1 min-width-0">
                        <div className="fw-semibold fs-12 text-truncate">{transakce.delegatedTo.user}</div>
                        <div className="text-muted" style={{ fontSize: 10 }}>{transakce.delegatedTo.role} · {fDate(transakce.delegatedTo.cas.slice(0, 10))}</div>
                      </div>
                      <button className="btn btn-outline-secondary btn-sm" title="Zrušit přidělení" onClick={handleClearDelegate}>
                        <iconify-icon icon="solar:close-circle-bold-duotone" />
                      </button>
                    </div>
                    {transakce.delegatedTo.note && (
                      <div className="fs-11 text-muted fst-italic mt-1">„{transakce.delegatedTo.note}"</div>
                    )}
                  </div>
                ) : delegateOpen ? (
                  <div className="border rounded p-2">
                    <div className="d-flex align-items-center gap-1 mb-2">
                      <iconify-icon icon="solar:user-id-bold-duotone" style={{ fontSize: 14, color: '#0d6efd' }} />
                      <div className="fw-semibold fs-12">Přidělit uživateli</div>
                    </div>
                    <select className="form-select form-select-sm mb-2" style={{ fontSize: 12 }}
                      value={delegateUserId} onChange={(e) => setDelegateUserId(e.target.value)}>
                      <option value="">— vyberte —</option>
                      {BANKA_USERS.map((u) => (
                        <option key={u.id} value={u.id}>{u.jmeno} ({u.role})</option>
                      ))}
                    </select>
                    <textarea className="form-control form-control-sm mb-2" style={{ fontSize: 12, resize: 'none' }}
                      rows={2} placeholder="Krátká poznámka (nepovinné)"
                      value={delegateNote} onChange={(e) => setDelegateNote(e.target.value)} />
                    <div className="d-flex gap-1">
                      <button className="btn btn-primary btn-sm flex-grow-1" disabled={!delegateUserId} onClick={handleConfirmDelegate}>
                        Přidělit
                      </button>
                      <button className="btn btn-light btn-sm" onClick={() => { setDelegateOpen(false); setDelegateUserId(''); setDelegateNote(''); }}>
                        Zrušit
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2" onClick={() => setDelegateOpen(true)}>
                    <iconify-icon icon="solar:user-id-bold-duotone" />
                    Přidělit uživateli
                  </button>
                )}

                {/* Phase 8.5 (zápis 12. 6. 2026) — Auto-návrh ze systému dle textu transakce */}
                {(() => {
                  const navrh = detectTransType(transakce.firma, transakce.poznamka);
                  if (!navrh) return null;
                  return (
                    <div className="alert py-2 mb-2 border-0 d-flex align-items-center gap-2" style={{ background: '#e7f1ff' }}>
                      <iconify-icon icon="solar:magic-stick-3-bold-duotone" style={{ fontSize: 18, color: '#0d6efd' }} />
                      <div className="flex-grow-1">
                        <div className="fs-12 fw-semibold">Návrh systému</div>
                        <div className="fs-11 text-muted">Klasifikovat jako: <strong>{navrh.typ}</strong></div>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        onPatch(transakce.id, {
                          stav: 'manual-paired',
                          manualReason: navrh.typ,
                          manualNote: `Auto-klasifikace dle popisu (Návrh systému)`,
                        });
                        onAudit(transakce.id, {
                          cas: nowIso(), kdo: me,
                          akce: `Přijat návrh: ${navrh.typ} → ${navrh.cilovaSekce}`,
                          icon: 'solar:magic-stick-3-bold-duotone', color: '#0d6efd',
                        });
                        setFeedback(`Klasifikováno jako ${navrh.typ} + přidáno do ${navrh.cilovaSekce}`);
                      }}>Přijmout návrh</button>
                    </div>
                  );
                })()}

                {/* Označit jako… (sloučený workflow) */}
                {oznacitMode === null ? (
                  <div>
                    <div className="text-muted fs-11 mb-1">Nelze napárovat?</div>
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        className="btn btn-outline-danger btn-sm flex-grow-1"
                        title="Phase 7 (zápis 12. 6. 2026) — okamžitě označí jako bankovní poplatek, přidá do sekce Poplatky"
                        onClick={() => {
                          // Rychlá akce — bez výběru důvodu, předvyplněno
                          onPatch(transakce.id, {
                            stav: 'manual-paired',
                            manualReason: 'Bankovní poplatek',
                            manualNote: 'Zaevidováno jako poplatek z nespárované transakce',
                          });
                          onAudit(transakce.id, {
                            cas: nowIso(), kdo: me,
                            akce: 'Označeno jako bankovní poplatek (auto-zařazení do Poplatků)',
                            icon: 'solar:tag-price-bold-duotone', color: '#dc3545',
                          });
                          setFeedback('Označeno jako poplatek + přidáno do Poplatků');
                        }}>
                        <iconify-icon icon="solar:tag-price-bold-duotone" className="me-1" />
                        Označit jako poplatek
                      </button>
                      <button
                        className="btn btn-outline-info btn-sm flex-grow-1"
                        title="Phase 7 (zápis 12. 6. 2026) — přiřadit transakci k existujícímu úvěru jako splátka"
                        onClick={() => { setOznacitMode('loan-payment'); setOznacitReason(''); }}>
                        <iconify-icon icon="solar:hand-money-bold-duotone" className="me-1" />
                        Splátka úvěru
                      </button>
                      {/* Phase 8.5 (zápis 12. 6. 2026) — Vytvořit trvalý příkaz z této pravidelné platby */}
                      <button
                        className="btn btn-outline-success btn-sm flex-grow-1"
                        title="Vytvořit trvalý příkaz s předvyplněnými údaji z této transakce (firma, částka, protiÚčet, VS)"
                        onClick={() => {
                          // Sloučená cross-section navigace přes onOpenFaktura mechanismus, ale s vlastním payload
                          // (handler v BankaView nastaví pendingTPFromTrans a přepne sekci)
                          if (onCreateTP) {
                            onCreateTP({
                              firma: transakce.firma,
                              castka: Math.abs(transakce.castka),
                              protiUcet: transakce.protiUcet,
                              vs: transakce.vs,
                            });
                          }
                        }}>
                        <iconify-icon icon="solar:refresh-circle-bold-duotone" className="me-1" />
                        Vytvořit trvalý příkaz
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm flex-grow-1"
                        onClick={() => { setOznacitMode('outside'); setOznacitReason(''); setOznacitNote(''); }}>
                        <iconify-icon icon="solar:logout-3-bold-duotone" className="me-1" />
                        Mimo systém
                      </button>
                      <button
                        className="btn btn-outline-warning btn-sm flex-grow-1"
                        onClick={() => { setOznacitMode('no-invoice'); setOznacitReason(''); }}>
                        <iconify-icon icon="solar:close-circle-bold-duotone" className="me-1" />
                        Bez faktury
                      </button>
                    </div>
                  </div>
                ) : oznacitMode === 'loan-payment' ? (
                  <div className="border rounded p-2" style={{ background: 'white' }}>
                    <div className="fw-semibold fs-12 mb-2">
                      <iconify-icon icon="solar:hand-money-bold-duotone" className="me-1" />
                      Označit jako splátku úvěru
                    </div>
                    <select
                      className="form-select form-select-sm mb-2"
                      style={{ fontSize: 12 }}
                      value={oznacitReason}
                      onChange={(e) => setOznacitReason(e.target.value)}>
                      <option value="">— vyberte úvěr —</option>
                      {UVERY.filter((u) => u.stav === 'aktivni').map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nazev} · {u.banka} · {fCzk(u.splatkaMesicni)}/měs
                        </option>
                      ))}
                    </select>
                    <div className="text-muted fs-11 mb-2">
                      Transakce bude označena jako splátka tohoto úvěru. V sekci Úvěry se v kalendáři spáruje s odpovídající splátkou.
                    </div>
                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-info btn-sm flex-grow-1"
                        disabled={!oznacitReason}
                        onClick={() => {
                          const uver = UVERY.find((u) => u.id === oznacitReason);
                          if (!uver) return;
                          onPatch(transakce.id, {
                            stav: 'manual-paired',
                            manualReason: `Splátka úvěru: ${uver.nazev}`,
                            manualNote: `Spárováno s úvěrem ${uver.cisloSmlouvy}`,
                            parovanaSId: uver.id,
                          });
                          onAudit(transakce.id, {
                            cas: nowIso(), kdo: me,
                            akce: `Označeno jako splátka úvěru „${uver.nazev}"`,
                            icon: 'solar:hand-money-bold-duotone', color: '#0d6efd',
                          });
                          setFeedback(`Označeno jako splátka úvěru „${uver.nazev}"`);
                          setOznacitMode(null);
                          setOznacitReason('');
                        }}>
                        <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                        Potvrdit
                      </button>
                      <button className="btn btn-light btn-sm" onClick={() => { setOznacitMode(null); setOznacitReason(''); }}>
                        Zrušit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded p-2" style={{ background: 'white' }}>
                    <div className="fw-semibold fs-12 mb-2">
                      {oznacitMode === 'outside' ? 'Označit jako mimo systém' : 'Označit jako bez faktury'}
                    </div>
                    <select
                      className="form-select form-select-sm mb-2"
                      style={{ fontSize: 12 }}
                      value={oznacitReason}
                      onChange={(e) => setOznacitReason(e.target.value)}>
                      <option value="">— vyberte důvod —</option>
                      {(oznacitMode === 'outside' ? OUTSIDE_REASONS : NO_INVOICE_REASONS).map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    {oznacitMode === 'outside' && (
                      <textarea
                        className="form-control form-control-sm mb-2"
                        style={{ fontSize: 12, resize: 'none' }}
                        rows={2}
                        placeholder="Poznámka (nepovinné)"
                        value={oznacitNote}
                        onChange={(e) => setOznacitNote(e.target.value)}
                      />
                    )}
                    <div className="d-flex gap-1">
                      <button
                        className={`btn btn-sm flex-grow-1 ${oznacitMode === 'outside' ? 'btn-secondary' : 'btn-warning'}`}
                        disabled={!oznacitReason}
                        onClick={handleConfirmOznacit}>
                        Potvrdit
                      </button>
                      <button className="btn btn-light btn-sm" onClick={() => { setOznacitMode(null); setOznacitReason(''); setOznacitNote(''); }}>
                        Zrušit
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── DETAIL ── */}
          <section className="p-3 border-bottom">
            <SectionHeading icon="solar:document-text-bold-duotone" color="#6c757d" title="Detail" />
            <div className="row g-2">
              <div className="col-6">
                <div className="text-muted fs-11 fw-semibold mb-1">VS</div>
                <div className={`fs-13 czk-num ${!transakce.vs ? 'text-muted' : ''}`}>{transakce.vs ?? '—'}</div>
              </div>
              <div className="col-6">
                <div className="text-muted fs-11 fw-semibold mb-1">Datum</div>
                <div className="fs-13 czk-num">{fDate(transakce.datum.slice(0, 10))} <span className="text-muted">{transakce.datum.slice(11, 16)}</span></div>
              </div>
              <div className="col-12">
                <div className="text-muted fs-11 fw-semibold mb-1">Účet</div>
                <div className="fs-13 fw-semibold">{ucet?.nazev ?? '—'}</div>
                <div className="text-muted fs-11 czk-num">{ucet?.iban ?? '—'}</div>
              </div>
              {provs.length > 0 && (
                <div className="col-12">
                  <div className="text-muted fs-11 fw-semibold mb-1">Provozovny</div>
                  <div className="d-flex flex-wrap gap-1">
                    {provs.map((p) => (
                      <span key={p.id} className="badge bg-light text-dark border d-flex align-items-center gap-1" style={{ fontSize: 11 }}>
                        <span className="rounded-circle" style={{ width: 6, height: 6, background: p.color, display: 'inline-block' }} />
                        {p.shortName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {transakce.manualReason && (
                <div className="col-12">
                  <div className="text-muted fs-11 fw-semibold mb-1">Ruční spárování — důvod</div>
                  <div className="fs-13">{transakce.manualReason}</div>
                  {transakce.manualNote && <div className="text-muted fs-11 fst-italic mt-1">„{transakce.manualNote}"</div>}
                </div>
              )}
              {transakce.protiUcet && (
                <div className="col-12">
                  <div className="text-muted fs-11 fw-semibold mb-1">Protiúčet</div>
                  <div className="fs-13 czk-num">{transakce.protiUcet}</div>
                </div>
              )}
            </div>
          </section>

          {/* ── AKTIVITA (sloučený timeline: audit + poznámky chronologicky) ── */}
          <section className="p-3">
            <SectionHeading
              icon="solar:history-bold-duotone"
              color="#6c757d"
              title={`Aktivita (${activityFeed.length})`}
              right={
                <button className="btn btn-link btn-sm text-muted p-0 d-flex align-items-center" style={{ textDecoration: 'none' }} onClick={() => setActivityCollapsed(!activityCollapsed)}>
                  <iconify-icon icon={activityCollapsed ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-up-bold'} />
                </button>
              }
            />
            {!activityCollapsed && (
              <>
                {activityFeed.length === 0 ? (
                  <div className="text-muted fs-12 text-center py-2">Žádná aktivita</div>
                ) : (
                  <div className="d-flex flex-column gap-2 mb-3">
                    {activityFeed.map((e) =>
                      e.type === 'note' ? (
                        <div key={e.id} className="rounded p-2" style={{ background: '#fff8e1', borderLeft: '3px solid #ffc107' }}>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <div className="d-flex align-items-center gap-1">
                              <iconify-icon icon="solar:chat-round-line-bold-duotone" style={{ fontSize: 12, color: '#ad8800' }} />
                              <div className="fw-semibold fs-12">{e.kdo}</div>
                            </div>
                            <div className="text-muted" style={{ fontSize: 10 }}>{fDate(e.cas.slice(0, 10))} {e.cas.slice(11, 16)}</div>
                          </div>
                          <div className="fs-12" style={{ whiteSpace: 'pre-wrap' }}>{e.text}</div>
                        </div>
                      ) : (
                        <div key={e.id} className="d-flex align-items-start gap-2">
                          <span
                            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                            style={{ width: 18, height: 18, background: e.color, color: 'white' }}>
                            <iconify-icon icon={e.icon} style={{ fontSize: 11 }} />
                          </span>
                          <div className="flex-grow-1">
                            <div className="fs-12">{e.akce}</div>
                            <div className="text-muted" style={{ fontSize: 10 }}>{e.kdo} · {fDate(e.cas.slice(0, 10))} {e.cas.slice(11, 16)}</div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
                {/* Vstup pro novou poznámku (vždy na konci aktivity) */}
                <div className="border-top pt-2 mt-2">
                  <textarea
                    className="form-control form-control-sm mb-2"
                    style={{ fontSize: 12, resize: 'none' }}
                    rows={2}
                    placeholder="Přidat poznámku…"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                  />
                  <button className="btn btn-light btn-sm w-100 d-flex align-items-center justify-content-center gap-1" disabled={!noteInput.trim()} onClick={handleAddNote}>
                    <iconify-icon icon="solar:add-circle-bold-duotone" />
                    Přidat poznámku
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Tabulka transakcí ──────────────────────────────────────────
function TransakceTable({
  transakce, ucty, selectedRowId, onRowClick, search, setSearch,
  stavFilters, toggleStav, typFilter, setTypFilter, ucetFilter, setUcetFilter,
  castkaOd, setCastkaOd, castkaDo, setCastkaDo,
  datumOd, setDatumOd, datumDo, setDatumDo,
  onClearFilters, activeQueueLabel, onNewPayment,
}: {
  transakce: BankaTransakce[];
  ucty: BankaUcet[];
  selectedRowId: string | null;
  onRowClick: (id: string) => void;
  search: string;
  setSearch: (s: string) => void;
  stavFilters: Set<BankaTransStav>;
  toggleStav: (s: BankaTransStav) => void;
  typFilter: 'all' | 'prichoz' | 'odchozi';
  setTypFilter: (t: 'all' | 'prichoz' | 'odchozi') => void;
  ucetFilter: string;
  setUcetFilter: (s: string) => void;
  castkaOd: string;
  setCastkaOd: (s: string) => void;
  castkaDo: string;
  setCastkaDo: (s: string) => void;
  datumOd: string;
  setDatumOd: (s: string) => void;
  datumDo: string;
  setDatumDo: (s: string) => void;
  onClearFilters: () => void;
  activeQueueLabel?: string | null;   // pokud je aktivní filtr z Work Queue
  onNewPayment: () => void;           // Phase 7 — „Nová platba" CTA
}) {
  // Per zápis 4. 6. 2026 — pouze 3 hlavní stavy
  const STAV_CHIPS: { value: BankaTransStav; label: string }[] = [
    { value: 'paired',        label: 'Spárováno' },
    { value: 'unpaired',      label: 'Nespárováno' },
    { value: 'manual-paired', label: 'Spárováno ručně' },
  ];
  return (
    <div className="card">
      <div className="card-header">
        <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
          <h5 className="card-title mb-0">
            Seznam transakcí
            <small className="text-muted fw-normal ms-2 fs-13">{transakce.length} {transakce.length === 1 ? 'transakce' : 'transakcí'}</small>
          </h5>
          <button className="btn btn-primary btn-sm ms-auto d-flex align-items-center gap-1" onClick={onNewPayment}
            title="Zadat platbu nevázanou na fakturu (daně, poplatky, ad-hoc)">
            <iconify-icon icon="solar:add-square-bold-duotone" />
            Nová platba
          </button>
        </div>
        {(() => {
          const hasAnyFilter = !!(search || castkaOd || castkaDo || datumOd || datumDo || typFilter !== 'all' || ucetFilter !== 'all' || stavFilters.size > 0 || activeQueueLabel);
          return (
            <div className="d-flex flex-column gap-2">

              {/* Aktivní filter z Work Queue — vždy viditelný banner */}
              {activeQueueLabel && (
                <div className="d-flex align-items-center gap-2 px-2 py-1 rounded"
                  style={{ background: '#e8f0ff', border: '1px solid #b6d4fe', fontSize: 12 }}>
                  <iconify-icon icon="solar:filter-bold-duotone" style={{ fontSize: 14, color: '#0d6efd' }} />
                  <span>Aktivní filtr z přehledu: <strong>{activeQueueLabel}</strong></span>
                  <button className="btn btn-sm btn-link p-0 ms-auto" style={{ fontSize: 12, textDecoration: 'none' }} onClick={onClearFilters}>
                    Zrušit ×
                  </button>
                </div>
              )}

              {/* ── Řádek 1: Fulltext + Typ + Účet ── */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div className="position-relative" style={{ flex: '1 1 240px', maxWidth: 320 }}>
                  <iconify-icon icon="solar:magnifer-bold-duotone"
                    style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9097a7' }} />
                  <input type="text" className="form-control form-control-sm w-100"
                    placeholder="Hledat firmu / poznámku / VS / protiúčet…" value={search} onChange={(e) => setSearch(e.target.value)}
                    style={{ paddingLeft: 28 }} />
                </div>

                <select className="form-select form-select-sm" style={{ width: 'auto' }}
                  value={typFilter} onChange={(e) => setTypFilter(e.target.value as 'all' | 'prichoz' | 'odchozi')}>
                  <option value="all">Příchozí + odchozí</option>
                  <option value="prichoz">Příchozí</option>
                  <option value="odchozi">Odchozí</option>
                </select>

                <select className="form-select form-select-sm" style={{ width: 'auto', maxWidth: 220 }}
                  value={ucetFilter} onChange={(e) => setUcetFilter(e.target.value)}>
                  <option value="all">Všechny účty</option>
                  {ucty.map((u) => (
                    <option key={u.id} value={u.id}>{u.nazev} ({u.mena})</option>
                  ))}
                </select>
              </div>

              {/* ── Řádek 2: Datum range + Částka range + Zrušit ── */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="text-muted fs-11 fw-semibold text-uppercase">Období:</span>
                <input type="date" className="form-control form-control-sm" style={{ width: 'auto' }}
                  value={datumOd} onChange={(e) => setDatumOd(e.target.value)} title="Od datum" />
                <span className="text-muted">–</span>
                <input type="date" className="form-control form-control-sm" style={{ width: 'auto' }}
                  value={datumDo} onChange={(e) => setDatumDo(e.target.value)} title="Do datum" />

                <span className="text-muted fs-11 fw-semibold text-uppercase ms-2">Částka:</span>
                <input type="number" inputMode="numeric" className="form-control form-control-sm" placeholder="od"
                  style={{ width: 100 }}
                  value={castkaOd} onChange={(e) => setCastkaOd(e.target.value)} />
                <span className="text-muted">–</span>
                <input type="number" inputMode="numeric" className="form-control form-control-sm" placeholder="do"
                  style={{ width: 100 }}
                  value={castkaDo} onChange={(e) => setCastkaDo(e.target.value)} />

                {hasAnyFilter && (
                  <button className="btn btn-outline-danger btn-sm ms-auto" onClick={onClearFilters}
                    style={{ fontSize: 12 }} title="Vyčistit všechny filtry a vrátit původní seznam">
                    <iconify-icon icon="solar:eraser-bold-duotone" className="me-1" />
                    Vyčistit všechny filtry
                  </button>
                )}
              </div>

              {/* ── Řádek 3: Stav chips ── */}
              <div className="d-flex gap-1 flex-wrap align-items-center">
                <span className="text-muted fs-11 fw-semibold text-uppercase me-1">Stav:</span>
                {STAV_CHIPS.map((c) => {
                  const active = stavFilters.has(c.value);
                  return (
                    <button key={c.value}
                      className={`badge border-0 ${active ? 'bg-dark text-white' : 'bg-secondary-subtle text-secondary'}`}
                      style={{ cursor: 'pointer', fontSize: 11 }}
                      onClick={() => toggleStav(c.value)}>
                      {active && <iconify-icon icon="solar:check-circle-bold" className="me-1" style={{ fontSize: 11 }} />}
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-centered table-nowrap mb-0" style={{ fontSize: 12 }}>
          <thead className="table-light">
            <tr>
              <th>Datum</th>
              <th>Typ</th>
              <th>Protistrana</th>
              <th>VS</th>
              <th>Účet</th>
              <th className="text-end">Částka</th>
              <th>Stav</th>
            </tr>
          </thead>
          <tbody>
            {transakce.length === 0 && (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Žádné transakce nesplňují filtr</td></tr>
            )}
            {transakce.map((t) => {
              const ucet = ucty.find((u) => u.id === t.ucetId);
              const isActive = t.id === selectedRowId;
              const stavMeta = TRANS_STAV_META[t.stav];
              // Phase 2.3 — overdue má červený levý okraj, delegace ukazuje avatar
              const rowStyle: React.CSSProperties = {
                cursor: 'pointer',
                ...(t.isOverdueAtBank ? { boxShadow: 'inset 3px 0 0 #dc3545', background: '#fdf3f4' } : {}),
              };
              return (
                <tr key={t.id} className={isActive ? 'table-active' : ''}
                    style={rowStyle}
                    onClick={(e) => {
                      const row = e.currentTarget;
                      const wasSelected = isActive;
                      onRowClick(t.id);
                      // Per zápis 12. 6. 2026: kliknutý řádek se zarovná s horní hranou
                      // sticky panelu vpravo (tj. jen pod topbar). Nevycentruje doprostřed.
                      if (!wasSelected) {
                        requestAnimationFrame(() => {
                          const rect = row.getBoundingClientRect();
                          const topbarH = parseFloat(
                            getComputedStyle(document.documentElement).getPropertyValue('--bs-topbar-height')
                          ) || 100;
                          const targetY = window.scrollY + rect.top - topbarH - 16;
                          window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
                        });
                      }
                    }}>
                  {/* Datum */}
                  <td>
                    <div className="fw-semibold czk-num">{fDate(t.datum.slice(0, 10))}</div>
                    <div className="text-muted" style={{ fontSize: 10 }}>{t.datum.slice(11, 16)}</div>
                  </td>
                  {/* Typ — šipka + label */}
                  <td>
                    <span className={`badge ${t.typ === 'prichoz' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} d-inline-flex align-items-center gap-1`} style={{ fontSize: 10 }}>
                      <iconify-icon icon={t.typ === 'prichoz' ? 'solar:arrow-down-bold' : 'solar:arrow-up-bold'} style={{ fontSize: 11 }} />
                      {t.typ === 'prichoz' ? 'Příchozí' : 'Odchozí'}
                    </span>
                    {/* Vedlejší badge (interní převod / overdue / delegace) */}
                    {(isInternalTransfer(t, BANKA_UCTY) || t.isOverdueAtBank || t.delegatedTo) && (
                      <div className="d-flex align-items-center gap-1 mt-1 flex-wrap">
                        {isInternalTransfer(t, BANKA_UCTY) && (
                          <span className="badge bg-info-subtle text-info" style={{ fontSize: 9 }} title="Interní převod mezi firemními účty">
                            <iconify-icon icon="solar:transfer-horizontal-bold-duotone" style={{ fontSize: 9 }} />
                          </span>
                        )}
                        {t.isOverdueAtBank && (
                          <span className="badge bg-danger-subtle text-danger" style={{ fontSize: 9 }} title={`V bance neuhrazená · splatnost ${t.splatnost ?? '—'}`}>
                            <iconify-icon icon="solar:bell-bing-bold-duotone" style={{ fontSize: 9 }} />
                          </span>
                        )}
                        {t.delegatedTo && (
                          <span
                            className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold text-white"
                            style={{ width: 16, height: 16, fontSize: 8, background: BANKA_USERS.find((u) => u.jmeno === t.delegatedTo?.user)?.color ?? '#6c757d' }}
                            title={`Přiděleno: ${t.delegatedTo.user} (${t.delegatedTo.role})`}
                          >
                            {BANKA_USERS.find((u) => u.jmeno === t.delegatedTo?.user)?.initials ?? '?'}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  {/* Protistrana (firma + protiÚčet) */}
                  <td style={{ maxWidth: 240 }}>
                    <div className="fw-semibold text-truncate" title={t.firma}>{t.firma}</div>
                    {t.protiUcet && (
                      <div className="text-muted czk-num text-truncate" style={{ fontSize: 10 }} title={t.protiUcet}>
                        {t.protiUcet}
                      </div>
                    )}
                  </td>
                  {/* VS */}
                  <td>
                    {t.vs ? (
                      <span className="czk-num">{t.vs}</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  {/* Účet */}
                  <td>
                    <div className="fw-semibold">{ucet?.nazev}</div>
                    <div className="text-muted czk-num" style={{ fontSize: 10 }}>{ucet?.iban.slice(0, 12)}…</div>
                  </td>
                  {/* Částka */}
                  <td className={`text-end czk-num fw-bold ${t.castka < 0 ? 'text-danger' : 'text-success'}`}>
                    {ucet?.mena === 'EUR' ? `${t.castka.toFixed(2)} €` : fCzk(t.castka)}
                  </td>
                  {/* Stav */}
                  <td>
                    <span className={`badge ${stavMeta.cls}`} style={{ fontSize: 10 }}>
                      <iconify-icon icon={stavMeta.icon} className="me-1" style={{ fontSize: 10 }} />
                      {stavMeta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Modal: Převod mezi účty ────────────────────────────────────
function PrevodModal({ ucty, prefilledTargetId, onClose, onSubmit }: {
  ucty: BankaUcet[];
  prefilledTargetId?: string | null;        // pre-fill na který účet posílat (z alertu)
  onClose: () => void;
  onSubmit: (fromId: string, toId: string, castka: number, datum: string, poznamka: string) => void;
}) {
  // Default "from" účet = největší konsolidovaný (Hlavní účet) nebo první CZK účet
  const defaultFrom = ucty.find((u) => u.id === 'ua-hlavni') ?? ucty.find((u) => u.mena === 'CZK')!;
  const [fromId,   setFromId]   = useState(defaultFrom?.id ?? '');
  const [toId,     setToId]     = useState(prefilledTargetId ?? '');
  const [castka,   setCastka]   = useState('');
  const [datum,    setDatum]    = useState('2026-04-17');
  const [poznamka, setPoznamka] = useState('Interní převod');

  const fromUcet = ucty.find((u) => u.id === fromId);
  const toUcet   = ucty.find((u) => u.id === toId);
  const sameUcet = fromId === toId && fromId !== '';
  const castkaN  = parseFloat(castka) || 0;
  const nedostat = fromUcet && castkaN > fromUcet.dostupniProstredky;
  const canSubmit = fromId !== '' && toId !== '' && !sameUcet && castkaN > 0 && !nedostat;

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 200 }} onClick={onClose} />
      <div className="modal show d-block" style={{ zIndex: 300 }} tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <iconify-icon icon="solar:transfer-horizontal-bold-duotone" className="me-2" />
                Převod mezi účty
              </h5>
              <button className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                {/* Z účtu */}
                <div className="col-12">
                  <label className="form-label fw-semibold fs-13">Z účtu</label>
                  <select className="form-select form-select-sm"
                    value={fromId} onChange={(e) => setFromId(e.target.value)}>
                    {ucty.filter((u) => u.mena === 'CZK').map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nazev} · dostupné {fCzk(u.dostupniProstredky)}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Na účet */}
                <div className="col-12">
                  <label className="form-label fw-semibold fs-13">Na účet</label>
                  <select className="form-select form-select-sm"
                    value={toId} onChange={(e) => setToId(e.target.value)}>
                    <option value="" disabled>— Vyberte cílový účet —</option>
                    {ucty.filter((u) => u.mena === 'CZK').map((u) => (
                      <option key={u.id} value={u.id} disabled={u.id === fromId}>
                        {u.nazev} · dostupné {fCzk(u.dostupniProstredky)}
                      </option>
                    ))}
                  </select>
                  {sameUcet && (
                    <div className="text-danger fs-12 mt-1">Cílový účet nemůže být stejný jako zdrojový.</div>
                  )}
                </div>
                {/* Částka + datum */}
                <div className="col-7">
                  <label className="form-label fw-semibold fs-13">Částka (Kč)</label>
                  <input type="number" className="form-control form-control-sm czk-num"
                    value={castka} onChange={(e) => setCastka(e.target.value)}
                    placeholder="0" min="0" />
                  {nedostat && (
                    <div className="text-danger fs-12 mt-1">
                      Překračuje dostupné prostředky ({fCzk(fromUcet!.dostupniProstredky)})
                    </div>
                  )}
                </div>
                <div className="col-5">
                  <label className="form-label fw-semibold fs-13">Datum platby</label>
                  <input type="date" className="form-control form-control-sm"
                    value={datum} onChange={(e) => setDatum(e.target.value)} />
                </div>
                {/* Poznámka */}
                <div className="col-12">
                  <label className="form-label fw-semibold fs-13">Poznámka</label>
                  <input type="text" className="form-control form-control-sm"
                    value={poznamka} onChange={(e) => setPoznamka(e.target.value)} />
                </div>
                {/* Preview */}
                {canSubmit && toUcet && (
                  <div className="col-12">
                    <div className="alert alert-info py-2 mb-0 fs-12">
                      <strong>{fromUcet!.nazev}</strong> → <strong>{toUcet.nazev}</strong> · {fCzk(castkaN)} ·{' '}
                      <span className="text-muted">{datum}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-light btn-sm" onClick={onClose}>Zrušit</button>
              <button className="btn btn-primary btn-sm" disabled={!canSubmit}
                onClick={() => onSubmit(fromId, toId, castkaN, datum, poznamka)}>
                <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                Odeslat převod
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Modal: Přiřadit provoz ─────────────────────────────────────
// Phase 7 (zápis 12. 6. 2026) — modal „Nová platba"
// Pro platby nevázané na faktury (daně, poplatky), případně s přiřazením/nahráním faktury.
function NovaPlatbaModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (t: BankaTransakce, fakturaInfo: { id?: string; nahranySoubor?: string }) => void;
}) {
  const [typ, setTyp]         = useState<'prichoz' | 'odchozi'>('odchozi');
  // Vždy všechny účty — nezávisle na filtru provozovny
  const ucty = BANKA_UCTY;
  const [ucetId, setUcetId]   = useState(ucty[0]?.id ?? '');
  const [datum, setDatum]     = useState('2026-06-18');
  const [castka, setCastka]   = useState('');
  const [firma, setFirma]     = useState('');
  const [protiUcet, setProtiUcet] = useState('');
  const [vs, setVs]           = useState('');
  const [poznamka, setPoznamka] = useState('');
  const [kategorie, setKategorie] = useState<'faktura' | 'dane' | 'poplatky' | 'jine'>('faktura');
  // Phase 7 — nepovinné přiřazení provozovny ('' = globálně Con Gusto)
  const [provozovnaId, setProvozovnaId] = useState('');

  // Faktura — None / Assign existing / Upload new
  const [fakturaMode, setFakturaMode] = useState<'none' | 'assign' | 'upload'>('none');
  const [fakturaId,   setFakturaId]   = useState('');
  const [fakturaFile, setFakturaFile] = useState<string | null>(null);

  // Validace — co chybí
  const castkaN = parseFloat(castka) || 0;
  const missing: string[] = [];
  if (!firma.trim())   missing.push('Protistrana');
  if (castkaN <= 0)    missing.push('Částka');
  if (!ucetId)         missing.push('Účet');
  const canSubmit = missing.length === 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const signedCastka = typ === 'odchozi' ? -Math.abs(castkaN) : Math.abs(castkaN);
    const newTrans: BankaTransakce = {
      id: `tx-new-${Date.now()}`,
      ucetId,
      typ,
      datum: `${datum}T${new Date().toTimeString().slice(0, 5)}:00`,
      castka: signedCastka,
      firma: firma.trim(),
      poznamka: poznamka.trim()
        || (kategorie === 'dane' ? 'Daň'
          : kategorie === 'poplatky' ? 'Poplatek'
          : kategorie === 'faktura' ? 'Platba k faktuře'
          : 'Ad-hoc platba'),
      vs: vs.trim() || undefined,
      protiUcet: protiUcet.trim() || undefined,
      // Pokud přiřazena faktura → stav „Spárováno" + reference, jinak „Spárováno ručně"
      stav: fakturaMode === 'assign' && fakturaId ? 'paired' : 'manual-paired',
      parovanaSId: fakturaMode === 'assign' && fakturaId ? fakturaId : undefined,
      manualReason: kategorie === 'dane' ? 'Daň'
                  : kategorie === 'poplatky' ? 'Bankovní poplatek'
                  : kategorie === 'faktura' ? 'Platba k faktuře'
                  : 'Ručně zadáno',
      provozovnaId: provozovnaId || undefined,
    };
    onSubmit(newTrans, {
      id: fakturaMode === 'assign' ? fakturaId : undefined,
      nahranySoubor: fakturaMode === 'upload' && fakturaFile ? fakturaFile : undefined,
    });
  };

  // Mock seznam faktur k přiřazení (jen nezaplacené)
  const unpaidFaktury = FAKTURY_PLATBY.filter((f) =>
    f.stav === 'schvalena' || f.stav === 'nova' || f.stav === 'ceka-na-schvaleni'
  ).slice(0, 10);

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center gap-2">
                <iconify-icon icon="solar:add-square-bold-duotone" style={{ fontSize: 22 }} />
                Nová platba
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Zavřít" />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                {/* Základní info */}
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Typ *</label>
                  <select className="form-select form-select-sm" value={typ} onChange={(e) => setTyp(e.target.value as 'prichoz' | 'odchozi')}>
                    <option value="odchozi">Odchozí</option>
                    <option value="prichoz">Příchozí</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Kategorie *</label>
                  <select className="form-select form-select-sm" value={kategorie} onChange={(e) => setKategorie(e.target.value as 'faktura' | 'dane' | 'poplatky' | 'jine')}>
                    <option value="faktura">Platba k faktuře</option>
                    <option value="dane">Daň</option>
                    <option value="poplatky">Poplatek</option>
                    <option value="jine">Jiné</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label fs-12 fw-semibold">Účet *</label>
                  <select className="form-select form-select-sm" value={ucetId} onChange={(e) => setUcetId(e.target.value)}>
                    {ucty.map((u) => (
                      <option key={u.id} value={u.id}>{u.nazev} ({u.mena}) — {u.iban}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label fs-12 fw-semibold">Provozovna (nepovinné)</label>
                  <select className="form-select form-select-sm" value={provozovnaId} onChange={(e) => setProvozovnaId(e.target.value)}>
                    <option value="">— Globálně (celé Con Gusto) —</option>
                    {PROVOZOVNY.filter((p) => p.status === 'active').map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="text-muted fs-11 mt-1">
                    Pokud platba není konkrétně provozovny, nech globálně.
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Protistrana (firma) *</label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="např. Finanční úřad / Komerční banka"
                    value={firma} onChange={(e) => setFirma(e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Číslo účtu protistrany</label>
                  <input type="text" className="form-control form-control-sm czk-num"
                    placeholder="např. 7704000/0710"
                    value={protiUcet} onChange={(e) => setProtiUcet(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Datum *</label>
                  <input type="date" className="form-control form-control-sm"
                    value={datum} onChange={(e) => setDatum(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">VS</label>
                  <input type="text" className="form-control form-control-sm czk-num"
                    value={vs} onChange={(e) => setVs(e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Částka (Kč) *</label>
                  <input type="number" inputMode="numeric" className="form-control form-control-sm czk-num"
                    placeholder="0" value={castka} onChange={(e) => setCastka(e.target.value)} />
                </div>
                <div className="col-12">
                  <label className="form-label fs-12 fw-semibold">Poznámka</label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="Volitelný popis"
                    value={poznamka} onChange={(e) => setPoznamka(e.target.value)} />
                </div>

                {/* ── Sekce Faktura ── */}
                <div className="col-12 mt-2">
                  <div className="text-muted fs-11 fw-semibold text-uppercase d-flex align-items-center gap-2"
                    style={{ letterSpacing: '0.3px', borderBottom: '1px solid #e9ecef', paddingBottom: 4 }}>
                    <iconify-icon icon="solar:bill-list-bold-duotone" />
                    <span>Faktura (volitelné)</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="btn-group btn-group-sm w-100" role="group">
                    <button type="button" className={`btn ${fakturaMode === 'none' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                      onClick={() => setFakturaMode('none')}>
                      Bez faktury
                    </button>
                    <button type="button" className={`btn ${fakturaMode === 'assign' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setFakturaMode('assign')}>
                      <iconify-icon icon="solar:link-bold-duotone" className="me-1" />
                      Přiřadit existující
                    </button>
                    <button type="button" className={`btn ${fakturaMode === 'upload' ? 'btn-success' : 'btn-outline-success'}`}
                      onClick={() => setFakturaMode('upload')}>
                      <iconify-icon icon="solar:upload-bold-duotone" className="me-1" />
                      Nahrát novou
                    </button>
                  </div>
                </div>
                {fakturaMode === 'assign' && (
                  <div className="col-12">
                    <label className="form-label fs-12 fw-semibold">Faktura k přiřazení</label>
                    <select className="form-select form-select-sm" value={fakturaId} onChange={(e) => setFakturaId(e.target.value)}>
                      <option value="">— vyberte fakturu —</option>
                      {unpaidFaktury.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.cislo} · {f.dodavatel} · {fCzk(f.castka)} · splatnost {f.splatnost.slice(0, 10)}
                        </option>
                      ))}
                    </select>
                    <div className="text-muted fs-11 mt-1">
                      Zobrazují se jen nezaplacené faktury. Po uložení dostane platba stav <strong>Spárováno</strong>.
                    </div>
                  </div>
                )}
                {fakturaMode === 'upload' && (
                  <div className="col-12">
                    <label className="form-label fs-12 fw-semibold">Nahrát PDF / obrázek faktury</label>
                    <input type="file" className="form-control form-control-sm" accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setFakturaFile(e.target.files?.[0]?.name ?? null)} />
                    {fakturaFile && (
                      <div className="d-flex align-items-center gap-2 mt-2 p-2 border rounded" style={{ background: '#e8f6ed' }}>
                        <iconify-icon icon="solar:document-text-bold-duotone" style={{ fontSize: 18, color: '#0d6efd' }} />
                        <span className="fs-12 fw-semibold flex-grow-1 text-truncate">{fakturaFile}</span>
                        <button type="button" className="btn btn-link btn-sm p-0 text-danger" title="Odebrat"
                          onClick={() => setFakturaFile(null)}>
                          <iconify-icon icon="solar:trash-bin-trash-bold-duotone" style={{ fontSize: 14 }} />
                        </button>
                      </div>
                    )}
                    <div className="text-muted fs-11 mt-1">Mock — soubor se neukládá fyzicky, jen metadata.</div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer d-flex align-items-center justify-content-between">
              {missing.length > 0 ? (
                <div className="text-warning fs-12 fw-semibold">
                  <iconify-icon icon="solar:danger-triangle-bold-duotone" className="me-1" />
                  Chybí vyplnit: {missing.join(', ')}
                </div>
              ) : <div />}
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-light btn-sm" onClick={onClose}>Zrušit</button>
                <button type="button" className="btn btn-primary btn-sm" disabled={!canSubmit} onClick={handleSubmit}>
                  <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                  Uložit platbu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PrirazeniModal({ ucet, onClose, onSubmit }: {
  ucet: BankaUcet;
  onClose: () => void;
  onSubmit: (provIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(ucet.provozovny));
  const activeProvs = PROVOZOVNY.filter((p) => p.status === 'active');

  function toggle(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 200 }} onClick={onClose} />
      <div className="modal show d-block" style={{ zIndex: 300 }} tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <iconify-icon icon="solar:link-bold-duotone" className="me-2" />
                Přiřadit provozovny — {ucet.nazev}
              </h5>
              <button className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="text-muted fs-12 mb-3">
                Vyberte provozovny, pro které je tento účet určen. Při výběru více provozoven se účet zařadí mezi <em>Konsolidované</em>.
              </div>
              <div className="row g-2">
                {activeProvs.map((p) => {
                  const isSel = selected.has(p.id);
                  return (
                    <div key={p.id} className="col-6 col-md-4">
                      <button className="d-flex align-items-center gap-2 w-100 p-2 rounded border text-start"
                        style={{
                          background: isSel ? `${p.color}1a` : 'white',
                          borderColor: isSel ? p.color : '#dee2e6',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggle(p.id)}>
                        <input type="checkbox" className="form-check-input m-0" checked={isSel} readOnly />
                        <span className="rounded-circle flex-shrink-0" style={{ width: 8, height: 8, background: p.color, display: 'inline-block' }} />
                        <span className="fs-13 fw-semibold text-truncate">{p.shortName}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="text-muted fs-12 mt-3">
                Vybráno: <strong>{selected.size}</strong> {selected.size === 1 ? 'provozovna' : selected.size < 5 ? 'provozovny' : 'provozoven'}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-light btn-sm" onClick={onClose}>Zrušit</button>
              <button className="btn btn-primary btn-sm" onClick={() => onSubmit(Array.from(selected))}>
                <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                Uložit přiřazení
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Drawer: Detail účtu (offcanvas vpravo) ─────────────────────
function UcetDetailDrawer({ ucet, transakce, onClose, onAction }: {
  ucet: BankaUcet | null;
  transakce: BankaTransakce[];
  onClose: () => void;
  onAction: (action: 'prevod' | 'resync' | 'prirazeni', ucetId: string) => void;
}) {
  if (!ucet) return null;
  const provs = getProvozovnyForUcet(ucet);
  const brandColor = provs.length === 1 ? provs[0].color
                   : provs.length > 1   ? '#c9911a'
                   : '#9097a7';
  const stavMeta = STAV_META[ucet.stav];
  // Transakce jen pro tento účet, posledních 10
  const ucetTransakce = transakce.filter((t) => t.ucetId === ucet.id).slice(0, 10);
  const isPredikceUp = ucet.predikceKonecMesice >= ucet.ucetniBalance;

  return (
    <>
      <div className="offcanvas-backdrop fade show" style={{ zIndex: 1040 }} onClick={onClose} />
      <div className="offcanvas offcanvas-end show" tabIndex={-1}
        style={{ visibility: 'visible', width: 'min(540px, 95vw)', zIndex: 1045 }}>
        <div className="offcanvas-header border-bottom" style={{ borderTop: `4px solid ${brandColor}` }}>
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2 mb-1">
              <h5 className="mb-0">{ucet.nazev}</h5>
              <span className="badge bg-light text-muted border">{ucet.mena}</span>
              <span className="badge" style={{ background: stavMeta.bg, color: stavMeta.color }}>
                <iconify-icon icon={stavMeta.icon} className="me-1" />
                {stavMeta.label}
              </span>
            </div>
            <div className="text-muted fs-12 czk-num">{ucet.iban}</div>
            <div className="text-muted fs-12">{ucet.banka} · {timeAgo(ucet.lastSync)}</div>
          </div>
          <button className="btn-close" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-0">
          {/* Balance */}
          <div className="p-3 border-bottom" style={{ background: '#f8f9fa' }}>
            <div className="row g-2">
              <div className="col-6">
                <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Účetní bilance</div>
                <div className="czk-num fw-bold" style={{ fontSize: 20 }}>
                  {ucet.mena === 'CZK' ? fCzk(ucet.ucetniBalance) : `${ucet.ucetniBalance.toFixed(2)} €`}
                </div>
              </div>
              <div className="col-6">
                <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Dostupní prostředky</div>
                <div className="czk-num fw-bold" style={{ fontSize: 20, color: '#198754' }}>
                  {ucet.mena === 'CZK' ? fCzk(ucet.dostupniProstredky) : `${ucet.dostupniProstredky.toFixed(2)} €`}
                </div>
              </div>
            </div>
          </div>

          {/* Sparkline */}
          <div className="p-3 border-bottom">
            <div className="text-muted fs-11 text-uppercase fw-semibold mb-2">Historie zůstatku (30 dní + projekce 7 dní)</div>
            <div style={{ height: 80 }}>
              <Sparkline values={ucet.historieBalance} todayIdx={30} color={brandColor} />
            </div>
            <div className="d-flex justify-content-between mt-2 fs-11 text-muted">
              <span>-30 dní</span><span>dnes</span><span>+7 dní</span>
            </div>
            <div className="row g-2 mt-2">
              <div className="col-6">
                <div className="text-muted fs-11">Konec týdne (19.4.):</div>
                <div className="czk-num fw-semibold" style={{ color: isPredikceUp ? '#198754' : '#dc3545' }}>
                  {ucet.mena === 'CZK' ? fCzk(ucet.predikceKonecTydne) : `${ucet.predikceKonecTydne.toFixed(2)} €`}
                </div>
              </div>
              <div className="col-6">
                <div className="text-muted fs-11">Konec měsíce (30.4.):</div>
                <div className="czk-num fw-semibold" style={{ color: isPredikceUp ? '#198754' : '#dc3545' }}>
                  {ucet.mena === 'CZK' ? fCzk(ucet.predikceKonecMesice) : `${ucet.predikceKonecMesice.toFixed(2)} €`}
                  <iconify-icon icon={isPredikceUp ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} className="ms-1" style={{ fontSize: 11 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Provozovny */}
          <div className="p-3 border-bottom">
            <div className="text-muted fs-11 text-uppercase fw-semibold mb-2">
              {provs.length === 0 ? 'Bez přiřazení'
                : provs.length === 1 ? 'Napárováno na provozovnu'
                : `Napárováno na ${provs.length} provozovny`}
            </div>
            {provs.length > 0 ? (
              <div className="d-flex flex-wrap gap-1">
                {provs.map((p) => (
                  <span key={p.id} className="badge bg-light text-dark border d-flex align-items-center gap-1">
                    <span className="rounded-circle" style={{ width: 6, height: 6, background: p.color, display: 'inline-block' }} />
                    {p.shortName}
                  </span>
                ))}
              </div>
            ) : (
              <button className="btn btn-warning btn-sm" onClick={() => onAction('prirazeni', ucet.id)}>
                <iconify-icon icon="solar:link-bold-duotone" className="me-1" />
                Přiřadit provozovny
              </button>
            )}
          </div>

          {/* Akce */}
          <div className="p-3 border-bottom d-flex flex-column gap-2">
            <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Akce</div>
            <button className="btn btn-primary btn-sm" onClick={() => onAction('prevod', ucet.id)}>
              <iconify-icon icon="solar:transfer-horizontal-bold-duotone" className="me-2" />
              Převod peněz na tento účet
            </button>
            {ucet.syncStav === 'error' && (
              <button className="btn btn-warning btn-sm" onClick={() => onAction('resync', ucet.id)}>
                <iconify-icon icon="solar:refresh-bold-duotone" className="me-2" />
                Pokusit se synchronizovat znovu
              </button>
            )}
            {provs.length > 0 && (
              <button className="btn btn-light btn-sm" onClick={() => onAction('prirazeni', ucet.id)}>
                <iconify-icon icon="solar:link-bold-duotone" className="me-2" />
                Změnit přiřazení provozoven
              </button>
            )}
          </div>

          {/* Poslední transakce */}
          <div className="p-3">
            <div className="text-muted fs-11 text-uppercase fw-semibold mb-2">
              Poslední transakce ({ucetTransakce.length})
            </div>
            {ucetTransakce.length === 0 ? (
              <div className="text-muted fs-12 fst-italic">Žádné transakce</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {ucetTransakce.map((t) => (
                  <div key={t.id} className="d-flex align-items-center gap-2 p-2 rounded" style={{ background: '#f8f9fa' }}>
                    <iconify-icon icon={t.typ === 'prichoz' ? 'solar:arrow-down-bold' : 'solar:arrow-up-bold'}
                      style={{ fontSize: 14, color: t.typ === 'prichoz' ? '#198754' : '#dc3545' }} />
                    <div className="flex-grow-1 min-width-0">
                      <div className="fs-13 fw-semibold text-truncate">{t.firma}</div>
                      <div className="fs-11 text-muted">{fDate(t.datum.slice(0, 10))}</div>
                    </div>
                    <div className={`czk-num fw-bold fs-12 ${t.castka < 0 ? 'text-danger' : 'text-success'}`}>
                      {ucet.mena === 'EUR' ? `${t.castka.toFixed(2)} €` : fCzk(t.castka)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── BankaView ────────────────────────────────────────────────

export default function BankaView({ state, update }: Props) {
  const { selectedProvozovna } = state;
  const allBranches = selectedProvozovna === 'all';

  // Filtrované účty podle topbar provoz-pickeru
  const filteredUcty = useMemo(() => getUctyForProvozovna(selectedProvozovna), [selectedProvozovna]);
  const filteredUcetIds = useMemo(() => new Set(filteredUcty.map((u) => u.id)), [filteredUcty]);

  // ── Transakce state ──
  const [selectedTransId, setSelectedTransId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stavFilters, setStavFilters] = useState<Set<BankaTransStav>>(new Set());
  const [typFilter, setTypFilter] = useState<'all' | 'prichoz' | 'odchozi'>('all');
  const [ucetFilter, setUcetFilter] = useState('all');
  // Phase 2.2 — filtry per zápis 4. 6. 2026
  const [castkaOd, setCastkaOd] = useState('');   // string aby šlo vyčistit
  const [castkaDo, setCastkaDo] = useState('');
  const [datumOd,  setDatumOd]  = useState('');   // YYYY-MM-DD
  const [datumDo,  setDatumDo]  = useState('');
  // Active Work Queue filter (filtruje transakce dle kategorie problému)
  const [activeQueue, setActiveQueue] = useState<WorkQueueKind | null>(null);
  // Ref pro scroll do tabulky transakcí (akční zóna v panelu je vždy nahoře)
  const transTableRef = useRef<HTMLDivElement>(null);
  // Phase 7 — Nová platba modal
  const [novaPlatbaOpen, setNovaPlatbaOpen] = useState(false);
  // Lokálně vytvořené transakce („Nová platba" — daně, poplatky atd.)
  const [localNewTrans, setLocalNewTrans] = useState<BankaTransakce[]>([]);

  const toggleStav = useCallback((s: BankaTransStav) => {
    setStavFilters((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }, []);

  // ── Local state pro reálné změny transakcí (manual match, outside-system, no-invoice, notes, audit) ──
  const [localTrans, setLocalTrans] = useState<Record<string, Partial<BankaTransakce>>>({});

  // Helper: vrátí transakci s aplikovanou lokální změnou
  const getMergedTrans = useCallback((t: BankaTransakce): BankaTransakce => {
    const patch = localTrans[t.id];
    if (!patch) return t;
    return {
      ...t,
      ...patch,
      // Audit a notes se appendují, ne přepisují
      auditLog: [...(t.auditLog ?? []), ...(patch.auditLog ?? [])],
      notes:    [...(t.notes ?? []),    ...(patch.notes ?? [])],
    };
  }, [localTrans]);

  // Helper: append audit entry
  const pushTransAudit = useCallback((id: string, entry: TransAuditEntry) => {
    setLocalTrans((prev) => {
      const cur = prev[id] ?? {};
      return { ...prev, [id]: { ...cur, auditLog: [...(cur.auditLog ?? []), entry] } };
    });
  }, []);

  // Helper: add note
  const pushTransNote = useCallback((id: string, note: TransNote) => {
    setLocalTrans((prev) => {
      const cur = prev[id] ?? {};
      return { ...prev, [id]: { ...cur, notes: [...(cur.notes ?? []), note] } };
    });
  }, []);

  // Helper: change stav (a patch ostatních polí)
  const patchTrans = useCallback((id: string, patch: Partial<BankaTransakce>) => {
    setLocalTrans((prev) => {
      const cur = prev[id] ?? {};
      return { ...prev, [id]: { ...cur, ...patch } };
    });
  }, []);

  // Všechny transakce s aplikovanými lokálními změnami (stav, parovanaSId, …)
  // + ručně přidané „Nové platby"
  const mergedAllTransakce = useMemo(() => {
    return [
      ...localNewTrans,
      ...BANKA_TRANSAKCE.map((t) => getMergedTrans(t)),
    ];
  }, [getMergedTrans, localNewTrans]);

  const filteredTransakce = useMemo(() => {
    return mergedAllTransakce.filter((t) => {
      // Provozovna filter — pokud transakce má explicitní provozovnaId, použij ho,
      // jinak filtruj podle účtu (původní logika).
      if (selectedProvozovna !== 'all') {
        if (t.provozovnaId) {
          if (t.provozovnaId !== selectedProvozovna) return false;
        } else if (!filteredUcetIds.has(t.ucetId)) {
          return false;
        }
      }
      if (typFilter !== 'all' && t.typ !== typFilter) return false;
      if (ucetFilter !== 'all' && t.ucetId !== ucetFilter) return false;
      if (stavFilters.size > 0 && !stavFilters.has(t.stav)) return false;
      // Work Queue filter — všechny kindy jsou pod-skupiny 'unpaired'
      if (activeQueue) {
        if (t.stav !== 'unpaired') return false;
        if (activeQueue === 'no-vs' && t.vs) return false;
        if (activeQueue === 'no-branch') {
          const u = BANKA_UCTY.find((x) => x.id === t.ucetId);
          if (u && u.provozovny.length > 0) return false;
        }
        if (activeQueue === 'overdue-at-bank' && !t.isOverdueAtBank)                  return false;
        if (activeQueue === 'delegated'       && !t.delegatedTo)                      return false;
        if (activeQueue === 'with-candidates' && (t.candidates?.length ?? 0) === 0)   return false;
        if (activeQueue === 'waiting-review'  && !t.isWaitingReview)                  return false;
        if (activeQueue === 'error'           && !t.hasError)                         return false;
      }
      // Fulltext (firma, poznámka, VS, protiÚčet)
      if (search) {
        const q = search.toLowerCase();
        const haystack = [t.firma, t.poznamka, t.vs ?? '', t.protiUcet ?? ''].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Filtr podle částky (abs hodnoty — uživatel zadává kladně)
      const abs = Math.abs(t.castka);
      const od  = castkaOd.trim() === '' ? null : parseFloat(castkaOd);
      const dox = castkaDo.trim() === '' ? null : parseFloat(castkaDo);
      if (od !== null && !isNaN(od) && abs < od) return false;
      if (dox !== null && !isNaN(dox) && abs > dox) return false;
      // Filtr podle období (porovnání jen na YYYY-MM-DD části)
      const datumPart = t.datum.slice(0, 10);
      if (datumOd && datumPart < datumOd) return false;
      if (datumDo && datumPart > datumDo) return false;
      return true;
    });
  }, [mergedAllTransakce, filteredUcetIds, typFilter, ucetFilter, stavFilters, search, activeQueue, castkaOd, castkaDo, datumOd, datumDo]);

  // Vybraná transakce — hledáme v MERGED ALL (ne filtered), aby panel nezmizel
  // poté co akce změní stav a transakce propadne aktivním filtrem.
  const selectedTrans = useMemo(
    () => mergedAllTransakce.find((t) => t.id === selectedTransId) ?? null,
    [mergedAllTransakce, selectedTransId]
  );

  const pendingCount = mergedAllTransakce.filter((t) => t.stav === 'unpaired').length;

  // ── Refs pro scroll-to-card + highlight ──
  const ucetRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [highlightedUcetId, setHighlightedUcetId] = useState<string | null>(null);

  const goToUcet = useCallback((id: string) => {
    const el = ucetRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedUcetId(id);
    window.setTimeout(() => setHighlightedUcetId(null), 2500);
  }, []);

  const setUcetRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) ucetRefs.current.set(id, el);
    else    ucetRefs.current.delete(id);
  }, []);

  // ── Local state pro reálné změny účtů (převody, přiřazení, resync) ──
  const [localUcty,    setLocalUcty]    = useState<Record<string, Partial<BankaUcet>>>({});
  const [syncingIds,   setSyncingIds]   = useState<Set<string>>(new Set());
  const [detailUcetId, setDetailUcetId] = useState<string | null>(null);
  const [modalState,   setModalState]   = useState<
    { type: 'prevod';     targetId?: string }   |
    { type: 'prirazeni';  targetId: string }    |
    null
  >(null);
  const [toast, setToast] = useState<string | null>(null);
  // Phase 3 — sekce „Účty provozoven" (single-venue) je defaultně sbalená — read-only historická data
  const [ostatniUctyOpen, setOstatniUctyOpen] = useState(false);

  // Helper: aplikuje localUcty na real účty
  const mergedUcty = useMemo(() => {
    return filteredUcty.map((u) => ({ ...u, ...(localUcty[u.id] ?? {}) }));
  }, [filteredUcty, localUcty]);

  // Akce — handle from card / alert / drawer
  const handleAction = useCallback((action: 'prevod' | 'resync' | 'prirazeni', ucetId: string) => {
    if (action === 'prevod') {
      setModalState({ type: 'prevod', targetId: ucetId });
    } else if (action === 'prirazeni') {
      setModalState({ type: 'prirazeni', targetId: ucetId });
    } else if (action === 'resync') {
      setSyncingIds((prev) => new Set(prev).add(ucetId));
      window.setTimeout(() => {
        setSyncingIds((prev) => { const n = new Set(prev); n.delete(ucetId); return n; });
        // Mock úspěch: změň syncStav na 'synced' + stav na 'ok'
        setLocalUcty((prev) => ({ ...prev, [ucetId]: { ...prev[ucetId], syncStav: 'synced', stav: 'ok', lastSync: '2026-04-17T14:35:00' } }));
        setToast(`Účet znovu synchronizován: ${BANKA_UCTY.find((u) => u.id === ucetId)?.nazev}`);
        window.setTimeout(() => setToast(null), 3000);
      }, 2000);
    }
  }, []);

  function handlePrevodSubmit(fromId: string, toId: string, castka: number, _datum: string, _poznamka: string) {
    // Aktualizuj bilanci: from -= castka, to += castka
    setLocalUcty((prev) => {
      const fromU = mergedUcty.find((u) => u.id === fromId)!;
      const toU   = mergedUcty.find((u) => u.id === toId)!;
      return {
        ...prev,
        [fromId]: { ...prev[fromId],
          ucetniBalance:      fromU.ucetniBalance - castka,
          dostupniProstredky: fromU.dostupniProstredky - castka },
        [toId]:   { ...prev[toId],
          ucetniBalance:      toU.ucetniBalance + castka,
          dostupniProstredky: toU.dostupniProstredky + castka,
          // Pokud došla pomoc, zlepši stav z critical / low → ok
          stav: 'ok' },
      };
    });
    const fromName = mergedUcty.find((u) => u.id === fromId)?.nazev;
    const toName   = mergedUcty.find((u) => u.id === toId)?.nazev;
    setToast(`Převod odeslán: ${fCzk(castka)} z ${fromName} → ${toName}`);
    window.setTimeout(() => setToast(null), 3000);
    setModalState(null);
  }

  function handlePrirazeniSubmit(ucetId: string, provIds: string[]) {
    setLocalUcty((prev) => ({ ...prev, [ucetId]: { ...prev[ucetId], provozovny: provIds } }));
    setToast(`Účet napárován na ${provIds.length} ${provIds.length === 1 ? 'provozovnu' : provIds.length < 5 ? 'provozovny' : 'provozoven'}`);
    window.setTimeout(() => setToast(null), 3000);
    setModalState(null);
  }

  return (
    <>
      {/* Phase 7 (zápis 12. 6. 2026) — zjednodušený přehled:
          AutoSyncBar nahoře → 2 ukazatele (nespárované / ručně spárované) → Zůstatek CZK/EUR + rozbalovací účty.
          Work Queue + sparkline karty účtů odstraněny (Úvodní čtvercové přehledy budou odstraněny). */}
      <AutoSyncBar
        pendingCount={pendingCount}
        paymentsQueueCount={5}
        apiCallsUsed={187}
      />
      <SimpleMetrics transakce={mergedAllTransakce} />
      <BalanceOverview ucty={mergedUcty} />

      {/* Tabulka transakcí + side-panel (panel se objeví až po výběru) */}
      {/* Bez `align-items-start` aby se pravý sloupec roztáhl na výšku tabulky — jinak sticky panel skáče nahoru. */}
      <div ref={transTableRef} className="row g-4">
        <div className={selectedTrans ? 'col-xl-8 col-lg-7' : 'col-12'}>
          <TransakceTable
            transakce={filteredTransakce}
            ucty={filteredUcty}
            selectedRowId={selectedTransId}
            onRowClick={(id) => setSelectedTransId((cur) => cur === id ? null : id)}
            search={search} setSearch={setSearch}
            stavFilters={stavFilters} toggleStav={toggleStav}
            typFilter={typFilter} setTypFilter={setTypFilter}
            ucetFilter={ucetFilter} setUcetFilter={setUcetFilter}
            castkaOd={castkaOd} setCastkaOd={setCastkaOd}
            castkaDo={castkaDo} setCastkaDo={setCastkaDo}
            datumOd={datumOd}   setDatumOd={setDatumOd}
            datumDo={datumDo}   setDatumDo={setDatumDo}
            onClearFilters={() => {
              setSearch('');
              setCastkaOd(''); setCastkaDo('');
              setDatumOd('');  setDatumDo('');
              setTypFilter('all');
              setUcetFilter('all');
              setStavFilters(new Set());
              setActiveQueue(null);
            }}
            activeQueueLabel={activeQueue ? WORK_QUEUE_LABEL[activeQueue] : null}
            onNewPayment={() => setNovaPlatbaOpen(true)}
          />
        </div>
        {selectedTrans && (
          <div className="col-xl-4 col-lg-5">
            <TransakceSidePanel
              transakce={selectedTrans}
              ucty={filteredUcty}
              onClose={() => setSelectedTransId(null)}
              onPatch={patchTrans}
              onAudit={pushTransAudit}
              onNote={pushTransNote}
              onOpenFaktura={(fakturaId) => {
                // Phase 8.3 (zápis 19. 6. 2026) — cross-section nav: nastavíme pendingFakturaId,
                // FakturyView ho v useEffect přečte, otevře side panel a vyčistí pole.
                setToast(`Otevírám fakturu ${fakturaId} v sekci Faktury…`);
                window.setTimeout(() => setToast(null), 2500);
                update({ selectedSection: 'faktury', pendingFakturaId: fakturaId });
              }}
              onCreateTP={(payload) => {
                // Phase 8.5 (zápis 12. 6. 2026) — naviguje na Trvalé příkazy s předvyplněnými údaji
                setToast(`Otevírám Trvalé příkazy — předvyplněno: ${payload.firma}`);
                window.setTimeout(() => setToast(null), 2500);
                update({ selectedSection: 'trvale-prikazy', pendingTPFromTrans: payload });
              }}
            />
          </div>
        )}
      </div>

      {/* Phase 7 — Nová platba modal */}
      {novaPlatbaOpen && (
        <NovaPlatbaModal
          onClose={() => setNovaPlatbaOpen(false)}
          onSubmit={(t, fakturaInfo) => {
            setLocalNewTrans((prev) => [t, ...prev]);
            setNovaPlatbaOpen(false);
            const msg = fakturaInfo.id ? `Platba uložena a napárována na ${fakturaInfo.id}`
                     : fakturaInfo.nahranySoubor ? `Platba uložena s fakturou „${fakturaInfo.nahranySoubor}"`
                     : `Nová platba „${t.firma}" uložena`;
            setToast(msg);
            window.setTimeout(() => setToast(null), 2500);
          }}
        />
      )}

      {/* ── Modaly ── */}
      {modalState?.type === 'prevod' && (
        <PrevodModal
          ucty={mergedUcty}
          prefilledTargetId={modalState.targetId}
          onClose={() => setModalState(null)}
          onSubmit={handlePrevodSubmit}
        />
      )}
      {modalState?.type === 'prirazeni' && (() => {
        const u = mergedUcty.find((x) => x.id === modalState.targetId);
        if (!u) return null;
        return (
          <PrirazeniModal
            ucet={u}
            onClose={() => setModalState(null)}
            onSubmit={(provIds) => handlePrirazeniSubmit(modalState.targetId, provIds)}
          />
        );
      })()}

      {/* ── Drawer (detail účtu) ── */}
      {detailUcetId && (
        <UcetDetailDrawer
          ucet={mergedUcty.find((u) => u.id === detailUcetId) ?? null}
          transakce={BANKA_TRANSAKCE}
          onClose={() => setDetailUcetId(null)}
          onAction={(action, id) => {
            setDetailUcetId(null);
            handleAction(action, id);
          }}
        />
      )}

      {/* ── Toast notifikace ── */}
      {toast && (
        <div className="position-fixed" style={{ top: 80, right: 24, zIndex: 1100, maxWidth: 400 }}>
          <div className="alert alert-success d-flex align-items-center gap-2 shadow-sm mb-0">
            <iconify-icon icon="solar:check-circle-bold-duotone" className="fs-5" />
            <span className="flex-grow-1 fs-13">{toast}</span>
            <button className="btn-close" style={{ fontSize: 11 }} onClick={() => setToast(null)} />
          </div>
        </div>
      )}
    </>
  );
}
