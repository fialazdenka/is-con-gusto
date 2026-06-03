// COMPONENT: Banka – přehled bankovních účtů + transakcí
// SOURCE: Larkon card / table / badge — sticky headers, multiselect chip filtry
// CUSTOM: YES
//   – AutoSyncBar (auto-sync status — pattern z Faktury AutoStatusBar)
//   – Karta účtu s brand color border-top + multi-venue podporou (estetický seznam provozoven)
//   – Smart alerts strip (3 typy: critical balance / sync error / nedostatečné prostředky)
//   – Sparkline mini graf 37 bodů (30 minulých + dnes + 6 budoucích)
//   – Side-panel detail transakce (sticky right column, pattern z FakturySidePanel)

import { useState, useMemo, useCallback, useRef } from 'react';
import type { AppState } from '../types';
import {
  BANKA_UCTY,
  BANKA_TRANSAKCE,
  STAV_META,
  TRANS_STAV_META,
  getUctyForProvozovna,
  getProvozovnyForUcet,
  sumForMena,
  timeAgo,
  type BankaUcet,
  type BankaTransakce,
  type BankaTransStav,
} from '../bankaData';
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

// ── Top summary banner (Zůstatek celkem) ───────────────────────
function TopSummary({ ucty }: { ucty: BankaUcet[] }) {
  const czk = sumForMena(ucty, 'CZK');
  const eur = sumForMena(ucty, 'EUR');
  // Trend vs minulý týden (mock — celkem +2.4 %)
  const trendPct = 2.4;
  return (
    <div className="card mb-3" style={{ borderTop: '3px solid var(--prov-color, #c9911a)', background: '#f1faf3' }}>
      <div className="card-body py-3">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <div className="text-muted fs-12 text-uppercase fw-semibold mb-1">Zůstatek celkem</div>
            <div className="d-flex align-items-baseline gap-3 flex-wrap">
              <div>
                <span className="czk-num fw-bold" style={{ fontSize: 22 }}>{fCzk(czk.ucetni)}</span>
                <span className="text-muted ms-2 fs-13">účetní bilance</span>
              </div>
              {eur.ucetni > 0 && (
                <div className="text-muted">
                  + <span className="czk-num fw-semibold">{eur.ucetni.toFixed(2)} €</span>
                </div>
              )}
            </div>
            <div className="d-flex align-items-baseline gap-3 flex-wrap mt-1">
              <div>
                <span className="czk-num fw-semibold" style={{ fontSize: 16, color: '#198754' }}>{fCzk(czk.dostupne)}</span>
                <span className="text-muted ms-2 fs-12">dostupní prostředky</span>
              </div>
              {eur.dostupne > 0 && (
                <div className="text-muted fs-13">
                  + <span className="czk-num">{eur.dostupne.toFixed(2)} €</span>
                </div>
              )}
            </div>
          </div>
          <div className="d-flex flex-column gap-1 align-items-end">
            <span className={`badge ${trendPct >= 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} fs-12`}>
              <iconify-icon icon={trendPct >= 0 ? 'solar:arrow-up-bold' : 'solar:arrow-down-bold'} className="me-1" />
              {trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1).replace('.', ',')} % vs. minulý týden
            </span>
            <span className="text-muted fs-12">{ucty.length} {ucty.length === 1 ? 'účet' : ucty.length < 5 ? 'účty' : 'účtů'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AutoSyncBar ────────────────────────────────────────────────
function AutoSyncBar({ pendingCount }: { pendingCount: number }) {
  return (
    <div className="d-flex align-items-center gap-2 flex-wrap row-gap-2 px-3 py-2 mb-3 rounded"
      style={{ background: '#f8f9fa', border: '1px solid #e9ecef', fontSize: 12 }}>
      {/* Status — vždy viditelný */}
      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: '#198754', boxShadow: '0 0 0 3px rgba(25,135,84,0.15)' }} />
        <span className="fw-semibold">Auto-sync</span>
        <span className="badge bg-success-subtle text-success" style={{ fontSize: 10 }}>Aktivní</span>
      </div>
      {/* Metriky — text-popisky se schovají pod md, ikony zůstávají */}
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
      {pendingCount > 0 && (
        <div className="d-flex align-items-center gap-1 flex-shrink-0" title="Transakce čekající na párování">
          <iconify-icon icon="solar:hourglass-bold-duotone" style={{ fontSize: 13, color: '#0dcaf0' }} />
          <span className="text-muted d-none d-md-inline">Ve frontě:</span>
          <span className="fw-bold" style={{ color: '#0dcaf0' }}>{pendingCount}</span>
        </div>
      )}
      {/* Akce — vždy vpravo, blok zůstane pohromadě */}
      <div className="d-flex align-items-center gap-2 ms-auto flex-shrink-0">
        <button className="btn btn-light btn-sm py-1 px-2" style={{ fontSize: 11 }} title="Načíst aktuální data z banky">
          <iconify-icon icon="solar:refresh-bold-duotone" className="me-1" />
          Živě
        </button>
        <button className="btn btn-warning btn-sm py-1 px-2" style={{ fontSize: 11 }} title="Znovu načíst všechny transakce">
          <iconify-icon icon="solar:download-minimalistic-bold-duotone" className="me-1" />
          Znovu
        </button>
      </div>
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

// ── Side-panel detail transakce ────────────────────────────────
function TransakceSidePanel({ transakce, ucty, onClose }: {
  transakce: BankaTransakce | null;
  ucty: BankaUcet[];
  onClose: () => void;
}) {
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

  return (
    <div style={{ position: 'sticky', top: 24, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto' }}>
      <div className="card">
        <div className="card-header d-flex align-items-start gap-2">
          <div className="flex-grow-1 min-width-0">
            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
              <span className={`badge ${isPrichoz ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}`}>
                <iconify-icon icon={isPrichoz ? 'solar:arrow-down-bold' : 'solar:arrow-up-bold'} className="me-1" />
                {isPrichoz ? 'Příchozí' : 'Odchozí'}
              </span>
              <span className={`badge ${stavMeta.cls}`}>
                <iconify-icon icon={stavMeta.icon} className="me-1" />
                {stavMeta.label}
              </span>
            </div>
            <div className="fw-bold fs-14 text-truncate">{transakce.firma}</div>
            <div className="text-muted fs-11">{transakce.poznamka}</div>
          </div>
          <button className="btn-close flex-shrink-0 mt-1" style={{ fontSize: 11 }} onClick={onClose} />
        </div>

        <div className="card-body p-0">
          {/* Částka */}
          <div className="p-3 border-bottom">
            <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Částka</div>
            <div className={`fw-bold czk-num ${transakce.castka < 0 ? 'text-danger' : 'text-success'}`} style={{ fontSize: 22, lineHeight: 1 }}>
              {ucet?.mena === 'EUR' ? `${transakce.castka.toFixed(2)} €` : fCzk(transakce.castka)}
            </div>
          </div>

          {/* Detaily */}
          <div className="p-3 border-bottom">
            <div className="row g-2">
              <div className="col-6">
                <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Datum</div>
                <div className="fs-13 fw-semibold">{fDate(transakce.datum.slice(0, 10))}</div>
                <div className="text-muted fs-11">{transakce.datum.slice(11, 16)}</div>
              </div>
              {transakce.vs && (
                <div className="col-6">
                  <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">VS</div>
                  <div className="fs-13 czk-num">{transakce.vs}</div>
                </div>
              )}
              <div className="col-12">
                <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Účet</div>
                <div className="fs-13 fw-semibold">{ucet?.nazev ?? '—'}</div>
                <div className="text-muted fs-11 czk-num">{ucet?.iban ?? '—'}</div>
              </div>
              {provs.length > 0 && (
                <div className="col-12">
                  <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Provozovny</div>
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
              {transakce.parovanaSId && (
                <div className="col-12">
                  <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Napárováno na fakturu</div>
                  <span className="badge bg-success-subtle text-success">
                    <iconify-icon icon="solar:link-bold-duotone" className="me-1" />
                    {transakce.parovanaSId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Akce */}
          <div className="p-3 d-flex flex-column gap-2">
            {transakce.stav === 'unpaired' && (
              <>
                <button className="btn btn-success btn-sm w-100">
                  <iconify-icon icon="solar:link-bold-duotone" className="me-2" />
                  Napárovat na fakturu
                </button>
                <button className="btn btn-light btn-sm w-100">
                  <iconify-icon icon="solar:close-circle-bold-duotone" className="me-2" />
                  Označit jako bez faktury
                </button>
              </>
            )}
            {transakce.stav === 'error' && (
              <button className="btn btn-warning btn-sm w-100">
                <iconify-icon icon="solar:refresh-bold-duotone" className="me-2" />
                Pokusit se znovu
              </button>
            )}
            {transakce.stav === 'pending' && (
              <div className="alert alert-info py-2 mb-0 fs-12">
                <iconify-icon icon="solar:hourglass-bold-duotone" className="me-1" />
                Čeká na automatické párování (auto-sync každých 15 min)
              </div>
            )}
            {transakce.stav === 'paired' && (
              <button className="btn btn-light btn-sm w-100">
                <iconify-icon icon="solar:link-broken-minimalistic-bold-duotone" className="me-2" />
                Zrušit párování
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tabulka transakcí ──────────────────────────────────────────
function TransakceTable({
  transakce, ucty, selectedRowId, onRowClick, search, setSearch,
  stavFilters, toggleStav, typFilter, setTypFilter, ucetFilter, setUcetFilter,
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
}) {
  const STAV_CHIPS: { value: BankaTransStav; label: string }[] = [
    { value: 'paired',   label: 'Spárováno' },
    { value: 'unpaired', label: 'Nespárováno' },
    { value: 'pending',  label: 'Čeká' },
    { value: 'error',    label: 'Chyba' },
  ];
  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-2">
          Seznam transakcí
          <small className="text-muted fw-normal ms-2 fs-13">{transakce.length} {transakce.length === 1 ? 'transakce' : 'transakcí'}</small>
        </h5>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="position-relative">
            <iconify-icon icon="solar:magnifer-bold-duotone"
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9097a7' }} />
            <input type="text" className="form-control form-control-sm"
              placeholder="Hledat firmu / VS…" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 28, width: 200 }} />
          </div>

          {/* Typ */}
          <select className="form-select form-select-sm" style={{ width: 'auto' }}
            value={typFilter} onChange={(e) => setTypFilter(e.target.value as 'all' | 'prichoz' | 'odchozi')}>
            <option value="all">Příchozí + odchozí</option>
            <option value="prichoz">Příchozí</option>
            <option value="odchozi">Odchozí</option>
          </select>

          {/* Účet */}
          <select className="form-select form-select-sm" style={{ width: 'auto' }}
            value={ucetFilter} onChange={(e) => setUcetFilter(e.target.value)}>
            <option value="all">Všechny účty</option>
            {ucty.map((u) => (
              <option key={u.id} value={u.id}>{u.nazev} ({u.mena})</option>
            ))}
          </select>

          {/* Stav chips */}
          <div className="d-flex gap-1 flex-wrap">
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
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-centered table-nowrap mb-0" style={{ fontSize: 12 }}>
          <thead className="table-light">
            <tr>
              <th>Typ</th>
              <th>Datum</th>
              <th>Firma / Poznámka</th>
              <th>Účet</th>
              <th>Provoz</th>
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
              const provs = ucet ? getProvozovnyForUcet(ucet) : [];
              const isActive = t.id === selectedRowId;
              const stavMeta = TRANS_STAV_META[t.stav];
              return (
                <tr key={t.id} className={isActive ? 'table-active' : ''}
                    style={{ cursor: 'pointer' }} onClick={() => onRowClick(t.id)}>
                  <td>
                    <iconify-icon icon={t.typ === 'prichoz' ? 'solar:arrow-down-bold' : 'solar:arrow-up-bold'}
                      style={{ fontSize: 14, color: t.typ === 'prichoz' ? '#198754' : '#dc3545' }} />
                  </td>
                  <td>
                    <div>{fDate(t.datum.slice(0, 10))}</div>
                    <div className="text-muted" style={{ fontSize: 10 }}>{t.datum.slice(11, 16)}</div>
                  </td>
                  <td>
                    <div className="fw-semibold">{t.firma}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>
                      {t.poznamka}{t.vs && <span className="ms-2 czk-num">· VS {t.vs}</span>}
                    </div>
                  </td>
                  <td>
                    <div className="fw-semibold">{ucet?.nazev}</div>
                    <div className="text-muted czk-num" style={{ fontSize: 10 }}>{ucet?.iban.slice(0, 12)}…</div>
                  </td>
                  <td>
                    <div className="d-flex gap-1 flex-wrap">
                      {provs.map((p) => (
                        <span key={p.id} className="rounded-circle d-inline-block" title={p.shortName}
                          style={{ width: 8, height: 8, background: p.color }} />
                      ))}
                      {provs.length === 0 && <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td className={`text-end czk-num fw-bold ${t.castka < 0 ? 'text-danger' : 'text-success'}`}>
                    {ucet?.mena === 'EUR' ? `${t.castka.toFixed(2)} €` : fCzk(t.castka)}
                  </td>
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

export default function BankaView({ state }: Props) {
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

  const toggleStav = useCallback((s: BankaTransStav) => {
    setStavFilters((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }, []);

  const filteredTransakce = useMemo(() => {
    return BANKA_TRANSAKCE.filter((t) => {
      // Provozovna filter via account ownership
      if (!filteredUcetIds.has(t.ucetId)) return false;
      if (typFilter !== 'all' && t.typ !== typFilter) return false;
      if (ucetFilter !== 'all' && t.ucetId !== ucetFilter) return false;
      if (stavFilters.size > 0 && !stavFilters.has(t.stav)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.firma.toLowerCase().includes(q) && !t.poznamka.toLowerCase().includes(q) && !(t.vs ?? '').includes(q)) return false;
      }
      return true;
    });
  }, [filteredUcetIds, typFilter, ucetFilter, stavFilters, search]);

  const selectedTrans = useMemo(
    () => filteredTransakce.find((t) => t.id === selectedTransId) ?? null,
    [filteredTransakce, selectedTransId]
  );

  const pendingCount = BANKA_TRANSAKCE.filter((t) => t.stav === 'pending' || t.stav === 'unpaired').length;

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
      {/* Smart Alerts */}
      <SmartAlerts ucty={mergedUcty} onGoToUcet={goToUcet} onAction={handleAction} />

      {/* Top summary */}
      <TopSummary ucty={mergedUcty} />

      {/* AutoSyncBar */}
      <AutoSyncBar pendingCount={pendingCount} />

      {/* Konsolidované (multi-venue) účty — vždy nahoře */}
      {(() => {
        const multi  = mergedUcty.filter((u) => u.provozovny.length > 1);
        const single = mergedUcty.filter((u) => u.provozovny.length <= 1);
        return (
          <>
            {multi.length > 0 && (
              <div className="mb-4">
                <h5 className="mb-3">
                  Konsolidované účty
                  <small className="text-muted fw-normal ms-2 fs-13">
                    {multi.length} {multi.length === 1 ? 'účet' : multi.length < 5 ? 'účty' : 'účtů'} · napojeno na víc provozoven
                  </small>
                </h5>
                <div className="row g-3">
                  {multi.map((u) => (
                    <div key={u.id} className="col-12 col-sm-6 col-lg-4 col-xxl-3">
                      <UcetCard
                        ucet={u}
                        allBranches={allBranches}
                        isHighlighted={highlightedUcetId === u.id}
                        isSyncing={syncingIds.has(u.id)}
                        cardRef={(el) => setUcetRef(u.id, el)}
                        onOpenDetail={(id) => setDetailUcetId(id)}
                        onAction={handleAction}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {single.length > 0 && (
              <div className="mb-4">
                <h5 className="mb-3">
                  Účty provozoven
                  <small className="text-muted fw-normal ms-2 fs-13">
                    {single.length} {single.length === 1 ? 'účet' : single.length < 5 ? 'účty' : 'účtů'}
                  </small>
                </h5>
                <div className="row g-3">
                  {single.map((u) => (
                    <div key={u.id} className="col-12 col-sm-6 col-lg-4 col-xxl-3">
                      <UcetCard
                        ucet={u}
                        allBranches={allBranches}
                        isHighlighted={highlightedUcetId === u.id}
                        isSyncing={syncingIds.has(u.id)}
                        cardRef={(el) => setUcetRef(u.id, el)}
                        onOpenDetail={(id) => setDetailUcetId(id)}
                        onAction={handleAction}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Tabulka transakcí + side-panel (panel se objeví až po výběru) */}
      <div className="row g-4 align-items-start">
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
          />
        </div>
        {selectedTrans && (
          <div className="col-xl-4 col-lg-5">
            <TransakceSidePanel
              transakce={selectedTrans}
              ucty={filteredUcty}
              onClose={() => setSelectedTransId(null)}
            />
          </div>
        )}
      </div>

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
