// COMPONENT: Úvěry — sekce Finance → Úvěry (Phase 4)
// SOURCE: Larkon table/card pattern + sticky right side panel
// Per zápis 4. 6. 2026:
//  - Samostatná evidence úvěrů, rozlišení jistinu/úrok
//  - Fix vs PRIBOR sazba — PRIBOR splátky se finalizují po spárování
//  - Auto-párování podle čísla účtu + předpisu
//  - Nestandardní situace (částečné úhrady) → manuální kontrola
//  - Předčasné splacení

import { useState, useMemo, useEffect, Fragment } from 'react';
import type { AppState } from '../types';
import {
  UVERY,
  UVER_TYP_META,
  UVER_STAV_META,
  UVER_SPLATKA_STAV_META,
  getCelkovyDluhVse,
  getMesicniSplatkaVse,
  maNestandardniSplatku,
  type Uver,
  type UverStav,
  type UverTyp,
  type UverSazbaTyp,
  type UverSplatkaItem,
} from '../uveryData';
import { BANKA_UCTY } from '../bankaData';
import { fCzk, fDate } from '../data';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

// ──────────────────────────────────────────────────────────────
// KPI strip
// ──────────────────────────────────────────────────────────────
function KpiStrip({ data, onClickNestandardni }: { data: Uver[]; onClickNestandardni: () => void }) {
  const aktivni       = data.filter((u) => u.stav === 'aktivni').length;
  const celkovyDluh   = data.filter((u) => u.stav === 'aktivni').reduce((s, u) => s + u.jistinaZbytek, 0);
  const mesicniZatez  = data.filter((u) => u.stav === 'aktivni').reduce((s, u) => s + u.splatkaMesicni, 0);
  const nestandardni  = data.filter(maNestandardniSplatku).length;

  type Tile = { label: string; value: string; icon: string; color: string; onClick?: () => void; alert?: boolean };
  const tiles: Tile[] = [
    { label: 'Aktivní úvěry',     value: String(aktivni),              icon: 'solar:hand-money-bold-duotone',          color: '#198754' },
    { label: 'Zbývající dluh',    value: fCzk(Math.round(celkovyDluh)), icon: 'solar:dollar-minimalistic-bold-duotone', color: '#0d6efd' },
    { label: 'Měsíční splátky',   value: fCzk(Math.round(mesicniZatez)), icon: 'solar:calendar-bold-duotone',           color: '#fd7e14' },
    { label: 'Nestandardní',      value: String(nestandardni),         icon: 'solar:danger-triangle-bold-duotone',     color: '#dc3545',
      onClick: nestandardni > 0 ? onClickNestandardni : undefined,
      alert: nestandardni > 0 },
  ];

  return (
    <div className="row g-2 mb-3">
      {tiles.map((t) => (
        <div key={t.label} className="col-6 col-md-3">
          <div className={`card h-100 ${t.onClick ? 'wq-card' : ''}`}
               style={{
                 borderTop: `3px solid ${t.color}`,
                 cursor: t.onClick ? 'pointer' : 'default',
                 background: t.alert ? '#fdf3f4' : undefined,
               }}
               onClick={t.onClick}>
            <div className="card-body py-3 d-flex align-items-center gap-3">
              <span className="d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 40, height: 40, background: `${t.color}1a`, color: t.color, flexShrink: 0 }}>
                <iconify-icon icon={t.icon} style={{ fontSize: 22 }} />
              </span>
              <div className="min-width-0">
                <div className="text-muted fs-12 text-uppercase fw-semibold" style={{ letterSpacing: '0.3px' }}>{t.label}</div>
                <div className="fw-bold czk-num text-truncate" style={{ fontSize: 18, lineHeight: 1.2 }}>{t.value}</div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Tabulka úvěrů
// ──────────────────────────────────────────────────────────────
function UveryTable({ data, ucty, selectedId, onSelect, search, setSearch, typFilter, setTypFilter, sazbaFilter, setSazbaFilter, stavFilter, setStavFilter, nestandardniOnly, setNestandardniOnly, onNew }: {
  data: Uver[];
  ucty: typeof BANKA_UCTY;
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  setSearch: (s: string) => void;
  typFilter: UverTyp | 'all';
  setTypFilter: (t: UverTyp | 'all') => void;
  sazbaFilter: UverSazbaTyp | 'all';
  setSazbaFilter: (s: UverSazbaTyp | 'all') => void;
  stavFilter: UverStav | 'all';
  setStavFilter: (s: UverStav | 'all') => void;
  nestandardniOnly: boolean;
  setNestandardniOnly: (v: boolean) => void;
  onNew: () => void;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <h5 className="card-title mb-0">
            Úvěry
            <small className="text-muted fw-normal ms-2 fs-13">{data.length} {data.length === 1 ? 'úvěr' : data.length < 5 ? 'úvěry' : 'úvěrů'}</small>
          </h5>
          <button className="btn btn-primary btn-sm ms-auto d-flex align-items-center gap-1" onClick={onNew}>
            <iconify-icon icon="solar:add-square-bold-duotone" />
            Nový úvěr
          </button>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
          <div className="position-relative" style={{ width: 220 }}>
            <iconify-icon icon="solar:magnifer-bold-duotone"
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9097a7' }} />
            <input type="text" className="form-control form-control-sm w-100"
              placeholder="Hledat název / banku / smlouvu…" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 28 }} />
          </div>
          <select className="form-select form-select-sm" style={{ width: 'auto' }}
            value={typFilter} onChange={(e) => setTypFilter(e.target.value as UverTyp | 'all')}>
            <option value="all">Všechny typy</option>
            <option value="hypoteka">Hypotéka</option>
            <option value="investicni">Investiční</option>
            <option value="provozni">Provozní</option>
            <option value="leasing-finanční">Finanční leasing</option>
          </select>
          <select className="form-select form-select-sm" style={{ width: 'auto' }}
            value={sazbaFilter} onChange={(e) => setSazbaFilter(e.target.value as UverSazbaTyp | 'all')}>
            <option value="all">Všechny sazby</option>
            <option value="fix">Fixní</option>
            <option value="pribor">Pohyblivá (PRIBOR)</option>
          </select>
          <select className="form-select form-select-sm" style={{ width: 'auto' }}
            value={stavFilter} onChange={(e) => setStavFilter(e.target.value as UverStav | 'all')}>
            <option value="all">Všechny stavy</option>
            <option value="aktivni">Aktivní</option>
            <option value="splacen">Splacené</option>
            <option value="predcasne-splacen">Předčasně splacené</option>
            <option value="pozastaven">Pozastavené</option>
          </select>
          <button type="button"
            className={`badge border-0 ${nestandardniOnly ? 'bg-danger text-white' : 'bg-danger-subtle text-danger'}`}
            style={{ cursor: 'pointer', fontSize: 11 }}
            onClick={() => setNestandardniOnly(!nestandardniOnly)}
            title="Jen úvěry s nestandardní splátkou (částečně uhrazená / po splatnosti / vyžaduje kontrolu)">
            <iconify-icon icon="solar:danger-triangle-bold-duotone" className="me-1" style={{ fontSize: 11 }} />
            Jen nestandardní
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-centered table-nowrap mb-0" style={{ fontSize: 12 }}>
          <thead className="table-light">
            <tr>
              <th>Název</th>
              <th>Typ</th>
              <th>Banka</th>
              <th>Sazba</th>
              <th className="text-end">Zbývající dluh</th>
              <th className="text-end">Měs. splátka</th>
              <th>Splaceno</th>
              <th>Stav</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={8} className="text-center py-4 text-muted">Žádné úvěry nesplňují filtr</td></tr>
            )}
            {data.map((u) => {
              const typM = UVER_TYP_META[u.typ];
              const stavM = UVER_STAV_META[u.stav];
              const isActive = u.id === selectedId;
              const progress = (u.splatkyDosud / u.pocetSplatekCelkem) * 100;
              return (
                <tr key={u.id} className={isActive ? 'table-active' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      const row = e.currentTarget;
                      const wasSelected = isActive;
                      onSelect(u.id);
                      if (!wasSelected) {
                        requestAnimationFrame(() => row.scrollIntoView({ behavior: 'smooth', block: 'center' }));
                      }
                    }}>
                  <td>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <div className="fw-semibold">{u.nazev}</div>
                      {maNestandardniSplatku(u) && (
                        <span className="badge bg-danger-subtle text-danger" style={{ fontSize: 9 }} title="Nestandardní situace ve splátkách">
                          <iconify-icon icon="solar:danger-triangle-bold-duotone" className="me-1" style={{ fontSize: 9 }} />
                          Vyžaduje kontrolu
                        </span>
                      )}
                    </div>
                    <div className="text-muted czk-num" style={{ fontSize: 11 }}>{u.cisloSmlouvy}</div>
                  </td>
                  <td>
                    <span className="badge d-inline-flex align-items-center gap-1"
                      style={{ background: typM.bg, color: typM.color, fontSize: 10 }}>
                      <iconify-icon icon={typM.icon} style={{ fontSize: 11 }} />
                      {typM.label}
                    </span>
                  </td>
                  <td><div className="fw-semibold">{u.banka}</div></td>
                  <td>
                    {u.sazbaTyp === 'fix' ? (
                      <span className="czk-num">{u.sazbaPct.toFixed(1)} % <span className="text-muted fs-11">fix</span></span>
                    ) : (
                      <span className="czk-num">
                        PRIBOR + {u.sazbaPct.toFixed(1)} %
                        <div className="text-muted fs-11">≈ {((u.priborPct ?? 0) + u.sazbaPct).toFixed(2)} % p. a.</div>
                      </span>
                    )}
                  </td>
                  <td className="text-end czk-num fw-bold">{fCzk(u.jistinaZbytek)}</td>
                  <td className="text-end czk-num">{fCzk(u.splatkaMesicni)}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="progress flex-grow-1" style={{ height: 4, minWidth: 60 }}>
                        <div className="progress-bar" style={{ width: `${progress}%`, background: '#198754' }} />
                      </div>
                      <span className="text-muted fs-11 czk-num">{u.splatkyDosud}/{u.pocetSplatekCelkem}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${stavM.cls}`} style={{ fontSize: 10 }}>
                      <iconify-icon icon={stavM.icon} className="me-1" style={{ fontSize: 10 }} />
                      {stavM.label}
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

// ──────────────────────────────────────────────────────────────
// Side panel — detail úvěru se splátkovým kalendářem (jistina/úrok rozpad)
// ──────────────────────────────────────────────────────────────
function UverSidePanel({ uver, ucty, onClose, onPredcasneSplatit, onEdit }: {
  uver: Uver | null;
  ucty: typeof BANKA_UCTY;
  onClose: () => void;
  onPredcasneSplatit: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  if (!uver) {
    return (
      <div className="card h-100" style={{ minHeight: 320 }}>
        <div className="card-body d-flex flex-column align-items-center justify-content-center text-center py-5">
          <iconify-icon icon="solar:hand-money-bold-duotone" style={{ fontSize: 40, color: '#dee2e6', marginBottom: 12 }} />
          <div className="fw-semibold text-muted fs-14 mb-1">Žádný úvěr vybrán</div>
          <div className="text-muted fs-12">Klikněte na řádek pro detail úvěru</div>
        </div>
      </div>
    );
  }

  const ucet = ucty.find((u) => u.id === uver.ucetId);
  const typM = UVER_TYP_META[uver.typ];
  const stavM = UVER_STAV_META[uver.stav];
  const splaceneProcento = ((uver.jistinaPocatecni - uver.jistinaZbytek) / uver.jistinaPocatecni) * 100;
  const aktualniSazba = uver.sazbaTyp === 'fix' ? uver.sazbaPct : (uver.priborPct ?? 0) + uver.sazbaPct;

  return (
    <div style={{
      position: 'sticky',
      top: 'calc(var(--bs-topbar-height, 100px) + 16px)',
      maxHeight: 'calc(100vh - var(--bs-topbar-height, 100px) - 32px)',
      overflowY: 'auto',
    }}>
      <div className="card">
        {/* HEADER */}
        <div className="card-header d-flex align-items-start gap-2">
          <div className="flex-grow-1 min-width-0">
            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
              <span className="badge d-inline-flex align-items-center gap-1"
                style={{ background: typM.bg, color: typM.color, fontSize: 10 }}>
                <iconify-icon icon={typM.icon} style={{ fontSize: 11 }} />
                {typM.label}
              </span>
              <span className={`badge ${stavM.cls}`} style={{ fontSize: 10 }}>
                <iconify-icon icon={stavM.icon} className="me-1" style={{ fontSize: 10 }} />
                {stavM.label}
              </span>
              {uver.sazbaTyp === 'pribor' && (
                <span className="badge bg-info-subtle text-info" style={{ fontSize: 10 }}>
                  PRIBOR + {uver.sazbaPct} %
                </span>
              )}
            </div>
            <div className="fw-bold fs-14">{uver.nazev}</div>
            <div className="text-muted fs-11">{uver.banka} · {uver.cisloSmlouvy}</div>
            <div className="d-flex align-items-baseline gap-2 mt-2">
              <div className="fw-bold czk-num text-danger" style={{ fontSize: 22, lineHeight: 1 }}>
                {fCzk(uver.jistinaZbytek)}
              </div>
              <div className="text-muted fs-11">/ {fCzk(uver.jistinaPocatecni)} · zbývá</div>
            </div>
            {/* Progress */}
            <div className="d-flex align-items-center gap-2 mt-2">
              <div className="progress flex-grow-1" style={{ height: 6 }}>
                <div className="progress-bar bg-success" style={{ width: `${splaceneProcento}%` }} />
              </div>
              <span className="text-muted fs-11 czk-num">{splaceneProcento.toFixed(0)}% splaceno</span>
            </div>
          </div>
          <button className="btn-close flex-shrink-0 mt-1" style={{ fontSize: 11 }} onClick={onClose} />
        </div>

        {/* AKČNÍ ZÓNA */}
        <div className="p-3 border-bottom" style={{ background: '#fafbfc' }}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <iconify-icon icon="solar:bolt-bold-duotone" style={{ fontSize: 14, color: '#0d6efd' }} />
            <div className="fw-semibold fs-12 text-uppercase" style={{ letterSpacing: '0.3px', color: '#495057' }}>Akce</div>
          </div>
          <div className="d-flex flex-column gap-2">
            <button className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={() => onEdit(uver.id)}>
              <iconify-icon icon="solar:pen-bold-duotone" />
              Upravit úvěr
            </button>
            {uver.stav === 'aktivni' && (
              <button className="btn btn-outline-info btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={() => {
                  if (confirm(`Předčasně splatit zbývající dluh ${fCzk(uver.jistinaZbytek)}?`)) {
                    onPredcasneSplatit(uver.id);
                  }
                }}>
                <iconify-icon icon="solar:medal-star-bold-duotone" />
                Předčasně splatit ({fCzk(uver.jistinaZbytek)})
              </button>
            )}
          </div>
        </div>

        {/* DETAIL ÚVĚRU */}
        <div className="p-3 border-bottom">
          <div className="d-flex align-items-center gap-2 mb-2">
            <iconify-icon icon="solar:document-text-bold-duotone" style={{ fontSize: 14, color: '#6c757d' }} />
            <div className="fw-semibold fs-12 text-uppercase" style={{ letterSpacing: '0.3px', color: '#495057' }}>Detail</div>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <div className="text-muted fs-11 fw-semibold mb-1">Sazba</div>
              <div className="fs-13 czk-num fw-semibold">
                {uver.sazbaTyp === 'fix' ? `${uver.sazbaPct.toFixed(1)} % fix` : `PRIBOR + ${uver.sazbaPct.toFixed(1)} %`}
              </div>
              {uver.sazbaTyp === 'pribor' && (
                <div className="text-muted fs-11">
                  Aktuálně ≈ {aktualniSazba.toFixed(2)} % p. a. (PRIBOR {uver.priborPct?.toFixed(2)} %)
                </div>
              )}
            </div>
            <div className="col-6">
              <div className="text-muted fs-11 fw-semibold mb-1">Měsíční splátka</div>
              <div className="fs-13 czk-num fw-semibold">{fCzk(uver.splatkaMesicni)}</div>
              {uver.sazbaTyp === 'pribor' && (
                <div className="text-muted fs-11">Orientační (mění se s PRIBOR)</div>
              )}
            </div>
            <div className="col-12">
              <div className="text-muted fs-11 fw-semibold mb-1">Splátky účet (kam splácíme)</div>
              <div className="fs-13 fw-semibold">{ucet?.nazev ?? '—'}</div>
              <div className="text-muted fs-11 czk-num">{ucet?.iban ?? '—'}</div>
            </div>
            <div className="col-12">
              <div className="text-muted fs-11 fw-semibold mb-1">Účet banky (protistrana)</div>
              <div className="fs-13 czk-num">{uver.protiUcet}</div>
            </div>
            <div className="col-6">
              <div className="text-muted fs-11 fw-semibold mb-1">Začátek</div>
              <div className="fs-13">{fDate(uver.zacatek)}</div>
            </div>
            <div className="col-6">
              <div className="text-muted fs-11 fw-semibold mb-1">Konec</div>
              <div className="fs-13">{fDate(uver.konec)}</div>
            </div>
            <div className="col-6">
              <div className="text-muted fs-11 fw-semibold mb-1">Splaceno splátek</div>
              <div className="fs-13 czk-num">{uver.splatkyDosud} / {uver.pocetSplatekCelkem}</div>
            </div>
            <div className="col-6">
              <div className="text-muted fs-11 fw-semibold mb-1">Příští splatnost</div>
              <div className="fs-13 fw-semibold">{fDate(uver.pristiSplatnost)}</div>
            </div>
            {uver.poznamka && (
              <div className="col-12">
                <div className="text-muted fs-11 fw-semibold mb-1">Poznámka</div>
                <div className="fs-12 fst-italic">„{uver.poznamka}"</div>
              </div>
            )}
          </div>
        </div>

        {/* SPLÁTKOVÝ KALENDÁŘ S ROZPADEM */}
        <div className="p-3 border-bottom">
          <div className="d-flex align-items-center gap-2 mb-2">
            <iconify-icon icon="solar:calendar-bold-duotone" style={{ fontSize: 14, color: '#fd7e14' }} />
            <div className="fw-semibold fs-12 text-uppercase" style={{ letterSpacing: '0.3px', color: '#495057' }}>
              Splátkový kalendář ({uver.splatky.length}) — rozpad jistina + úrok
            </div>
          </div>
          {uver.sazbaTyp === 'pribor' && (
            <div className="alert alert-info py-2 mb-2 fs-12">
              <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
              Sazba je vázána na PRIBOR — rozpad jistina/úrok pro budoucí splátky je predikce. Reálné hodnoty se finalizují po spárování splátky v daném měsíci.
            </div>
          )}
          <div className="table-responsive" style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="table table-sm mb-0" style={{ fontSize: 11 }}>
              <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th>#</th>
                  <th>Datum</th>
                  <th className="text-end">Jistina</th>
                  <th className="text-end">Úrok</th>
                  <th className="text-end">Celkem</th>
                  <th className="text-end">Zbývá</th>
                  <th>Stav</th>
                </tr>
              </thead>
              <tbody>
                {uver.splatky.map((s) => {
                  const sm = UVER_SPLATKA_STAV_META[s.stav];
                  const needsReview = s.manualReview;
                  const isPribor = uver.sazbaTyp === 'pribor';
                  const isPredicted = isPribor && (s.stav === 'planovana');
                  return (
                    <Fragment key={s.id}>
                      <tr style={needsReview ? { background: '#fdf3f4' } : undefined}>
                        <td>{s.cisloSplatky}</td>
                        <td className="czk-num">{fDate(s.datum)}</td>
                        <td className={`text-end czk-num ${isPredicted ? 'text-muted fst-italic' : ''}`}>{fCzk(Math.round(s.jistina))}</td>
                        <td className={`text-end czk-num ${isPredicted ? 'text-muted fst-italic' : ''}`}>{fCzk(Math.round(s.urok))}</td>
                        <td className="text-end czk-num fw-semibold">{fCzk(Math.round(s.celkem))}</td>
                        <td className="text-end czk-num text-muted">{fCzk(Math.round(s.zustatekJistinyPo))}</td>
                        <td>
                          <span className={`badge ${sm.cls}`} style={{ fontSize: 9 }}>
                            {sm.label}
                          </span>
                          {needsReview && (
                            <span className="badge bg-danger ms-1" style={{ fontSize: 8 }} title="Vyžaduje manuální kontrolu">!</span>
                          )}
                        </td>
                      </tr>
                      {needsReview && s.poznamka && (
                        <tr style={{ background: '#fdf3f4' }}>
                          <td />
                          <td colSpan={6} className="fs-11 text-danger" style={{ paddingTop: 0, fontStyle: 'italic' }}>
                            ⤷ {s.poznamka}{s.zaplaceno !== undefined && <> · Přišlo {fCzk(s.zaplaceno)} z {fCzk(Math.round(s.celkem))}</>}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-muted fs-11 mt-2">
            Auto-párování probíhá podle čísla účtu protistrany a předpisu splátky.
            Nestandardní situace (částečná úhrada, chybějící splátka) označí <span className="badge bg-danger" style={{ fontSize: 9 }}>!</span> a vyžaduje manuální kontrolu.
          </div>
        </div>

        {/* DOKUMENTY */}
        <div className="p-3">
          <div className="d-flex align-items-center gap-2 mb-2">
            <iconify-icon icon="solar:paperclip-bold-duotone" style={{ fontSize: 14, color: '#6c757d' }} />
            <div className="fw-semibold fs-12 text-uppercase" style={{ letterSpacing: '0.3px', color: '#495057' }}>
              Dokumenty {uver.dokumenty && uver.dokumenty.length > 0 && `(${uver.dokumenty.length})`}
            </div>
          </div>
          {uver.dokumenty && uver.dokumenty.length > 0 ? (
            <div className="d-flex flex-column gap-1">
              {uver.dokumenty.map((d) => (
                <div key={d.id} className="d-flex align-items-center gap-2 p-2 border rounded" style={{ background: '#fafbfc' }}>
                  <iconify-icon icon="solar:document-text-bold-duotone" style={{ fontSize: 18, color: '#0d6efd' }} />
                  <div className="flex-grow-1 min-width-0">
                    <div className="fs-12 fw-semibold text-truncate">{d.nazev}</div>
                    <div className="text-muted" style={{ fontSize: 10 }}>{d.typ} · {d.velikostKb} KB · {d.uploadedBy}</div>
                  </div>
                  <button className="btn btn-link btn-sm p-0 text-primary" title="Stáhnout (mock)">
                    <iconify-icon icon="solar:download-minimalistic-bold-duotone" style={{ fontSize: 14 }} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted fs-12 text-center py-2">Žádné přílohy</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Form modal — nový / edit úvěr (zjednodušený — bez generování kalendáře v edit)
// ──────────────────────────────────────────────────────────────
function UverFormModal({ initial, ucty, onSave, onClose }: {
  initial: Uver | null;
  ucty: typeof BANKA_UCTY;
  onSave: (data: Uver) => void;
  onClose: () => void;
}) {
  const isEdit = initial !== null;
  const today = '2026-06-09';
  const defaults: Uver = initial ?? {
    id: `uv-new-${Date.now().toString().slice(-6)}`,
    nazev: '',
    banka: '',
    cisloSmlouvy: '',
    typ: 'provozni',
    ucetId: ucty[0]?.id ?? '',
    protiUcet: '',
    jistinaPocatecni: 0,
    jistinaZbytek: 0,
    sazbaTyp: 'fix',
    sazbaPct: 5,
    priborPct: 3.3,
    pocetSplatekCelkem: 60,
    splatkyDosud: 0,
    splatkaMesicni: 0,
    zacatek: today,
    konec: today,
    pristiSplatnost: today,
    stav: 'aktivni',
    poznamka: '',
    splatky: [],
  };
  const [form, setForm] = useState<Uver>(defaults);
  // Mock upload pendingDocs (smlouvy, výpisy z banky atd.)
  const [pendingDocs, setPendingDocs] = useState<NonNullable<Uver['dokumenty']>>([]);

  const handleChange = <K extends keyof Uver>(key: K, value: Uver[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canSave = form.nazev.trim() !== ''
               && form.banka.trim() !== ''
               && form.ucetId !== ''
               && form.jistinaPocatecni > 0
               && form.pocetSplatekCelkem > 0;

  const handleSubmit = () => {
    let toSave = form;
    // Pokud nový — vygenerujeme splátky
    if (!isEdit) {
      // Re-import pro generaci nelze (function v data file) — použijeme inline naivně
      // Pro mock stačí prázdné splátky (uživatel si je vygeneruje?). Pro produkční app by se na backendu.
      // Zde generujeme zjednodušeně:
      const r = (form.sazbaPct / 100) / 12;
      const anuita = r === 0 ? form.jistinaPocatecni / form.pocetSplatekCelkem
        : form.jistinaPocatecni * (r * Math.pow(1 + r, form.pocetSplatekCelkem)) / (Math.pow(1 + r, form.pocetSplatekCelkem) - 1);
      let zbytek = form.jistinaPocatecni;
      const items: UverSplatkaItem[] = [];
      const [y, m, d] = form.zacatek.split('-').map(Number);
      for (let i = 0; i < form.pocetSplatekCelkem; i++) {
        const date = new Date(y, m - 1 + i, d);
        const ds = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const urok = Math.round(zbytek * r);
        const jistina = Math.min(Math.round(anuita - urok), zbytek);
        zbytek = Math.max(0, zbytek - jistina);
        const vs = `${form.cisloSmlouvy.replace(/\D/g, '').slice(0, 6) || 'UV'}${String(i + 1).padStart(3, '0')}`;
        items.push({
          id: `us-${vs}`,
          cisloSplatky: i + 1,
          datum: ds,
          jistina, urok, celkem: jistina + urok,
          zustatekJistinyPo: zbytek,
          vs,
          stav: ds < today ? 'zaplacena' : ds === today ? 'odeslana' : 'planovana',
        });
      }
      toSave = {
        ...form,
        splatkaMesicni: Math.round(anuita),
        jistinaZbytek: form.jistinaPocatecni,
        splatky: items,
      };
    }
    // Spojit existující dokumenty + nově nahrané
    const mergedDocs = [...(initial?.dokumenty ?? []), ...pendingDocs];
    if (mergedDocs.length > 0) {
      toSave = { ...toSave, dokumenty: mergedDocs };
    }
    onSave(toSave);
  };

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center gap-2">
                <iconify-icon icon={isEdit ? 'solar:pen-bold-duotone' : 'solar:add-square-bold-duotone'} style={{ fontSize: 22 }} />
                {isEdit ? 'Upravit úvěr' : 'Nový úvěr'}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Zavřít" />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label fs-12 fw-semibold">Název *</label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="např. Hypotéka — provozovna CG Brno"
                    value={form.nazev} onChange={(e) => handleChange('nazev', e.target.value)} />
                </div>

                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Typ *</label>
                  <select className="form-select form-select-sm" value={form.typ}
                    onChange={(e) => handleChange('typ', e.target.value as UverTyp)}>
                    <option value="hypoteka">Hypotéka</option>
                    <option value="investicni">Investiční úvěr</option>
                    <option value="provozni">Provozní úvěr</option>
                    <option value="leasing-finanční">Finanční leasing</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Stav</label>
                  <select className="form-select form-select-sm" value={form.stav}
                    onChange={(e) => handleChange('stav', e.target.value as UverStav)}>
                    <option value="aktivni">Aktivní</option>
                    <option value="splacen">Splacený</option>
                    <option value="predcasne-splacen">Předčasně splacen</option>
                    <option value="pozastaven">Pozastaven</option>
                  </select>
                </div>

                {/* Banka — sekce */}
                <div className="col-12 mt-2">
                  <div className="text-muted fs-11 fw-semibold text-uppercase" style={{ letterSpacing: '0.3px', borderBottom: '1px solid #e9ecef', paddingBottom: 4 }}>
                    Banka / smlouva
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Banka *</label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="např. Komerční banka"
                    value={form.banka} onChange={(e) => handleChange('banka', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Číslo smlouvy</label>
                  <input type="text" className="form-control form-control-sm czk-num"
                    placeholder="např. HU-2024-CG"
                    value={form.cisloSmlouvy} onChange={(e) => handleChange('cisloSmlouvy', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Účet (z kterého splácíme) *</label>
                  <select className="form-select form-select-sm" value={form.ucetId}
                    onChange={(e) => handleChange('ucetId', e.target.value)}>
                    {ucty.map((u) => (
                      <option key={u.id} value={u.id}>{u.nazev} ({u.mena})</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Účet banky (protistrana)</label>
                  <input type="text" className="form-control form-control-sm czk-num"
                    placeholder="např. 99887766/0100"
                    value={form.protiUcet} onChange={(e) => handleChange('protiUcet', e.target.value)} />
                </div>

                {/* Finance — sekce */}
                <div className="col-12 mt-2">
                  <div className="text-muted fs-11 fw-semibold text-uppercase" style={{ letterSpacing: '0.3px', borderBottom: '1px solid #e9ecef', paddingBottom: 4 }}>
                    Finance
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Výše úvěru (Kč) *</label>
                  <input type="number" className="form-control form-control-sm czk-num"
                    placeholder="0" value={form.jistinaPocatecni || ''}
                    onChange={(e) => handleChange('jistinaPocatecni', parseInt(e.target.value || '0', 10))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Typ sazby *</label>
                  <select className="form-select form-select-sm" value={form.sazbaTyp}
                    onChange={(e) => handleChange('sazbaTyp', e.target.value as UverSazbaTyp)}>
                    <option value="fix">Fixní</option>
                    <option value="pribor">Pohyblivá (PRIBOR + marže)</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">
                    {form.sazbaTyp === 'fix' ? 'Sazba % p. a. *' : 'Marže nad PRIBOR % *'}
                  </label>
                  <input type="number" step="0.01" className="form-control form-control-sm czk-num"
                    value={form.sazbaPct} onChange={(e) => handleChange('sazbaPct', parseFloat(e.target.value || '0'))} />
                </div>
                {form.sazbaTyp === 'pribor' && (
                  <div className="col-md-4">
                    <label className="form-label fs-12 fw-semibold">Aktuální PRIBOR %</label>
                    <input type="number" step="0.01" className="form-control form-control-sm czk-num"
                      value={form.priborPct ?? 0} onChange={(e) => handleChange('priborPct', parseFloat(e.target.value || '0'))} />
                    <div className="text-muted fs-11 mt-1">
                      Aktuálně: <strong>{((form.priborPct ?? 0) + form.sazbaPct).toFixed(2)} %</strong> p. a.
                    </div>
                  </div>
                )}
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Počet splátek *</label>
                  <input type="number" min={1} max={480} className="form-control form-control-sm czk-num"
                    value={form.pocetSplatekCelkem || ''}
                    onChange={(e) => handleChange('pocetSplatekCelkem', parseInt(e.target.value || '0', 10))} />
                </div>

                {/* Trvání */}
                <div className="col-12 mt-2">
                  <div className="text-muted fs-11 fw-semibold text-uppercase" style={{ letterSpacing: '0.3px', borderBottom: '1px solid #e9ecef', paddingBottom: 4 }}>
                    Trvání
                  </div>
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Začátek *</label>
                  <input type="date" className="form-control form-control-sm"
                    value={form.zacatek} onChange={(e) => handleChange('zacatek', e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Konec *</label>
                  <input type="date" className="form-control form-control-sm"
                    value={form.konec} onChange={(e) => handleChange('konec', e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Příští splatnost *</label>
                  <input type="date" className="form-control form-control-sm"
                    value={form.pristiSplatnost} onChange={(e) => handleChange('pristiSplatnost', e.target.value)} />
                </div>

                <div className="col-12">
                  <label className="form-label fs-12 fw-semibold">Poznámka</label>
                  <input type="text" className="form-control form-control-sm"
                    value={form.poznamka ?? ''} onChange={(e) => handleChange('poznamka', e.target.value)} />
                </div>

                {!isEdit && (
                  <div className="col-12">
                    <div className="alert alert-info py-2 mb-0 fs-12 d-flex align-items-center gap-2">
                      <iconify-icon icon="solar:info-circle-bold-duotone" style={{ fontSize: 16 }} />
                      <span>Po uložení se automaticky vygeneruje splátkový kalendář s rozpadem jistiny a úroku (anuitní splátky).</span>
                    </div>
                  </div>
                )}

                {/* Dokumenty (smlouvy / splátkový kalendář od banky / výpisy) */}
                <div className="col-12 mt-2">
                  <div className="text-muted fs-11 fw-semibold text-uppercase d-flex align-items-center gap-2"
                    style={{ letterSpacing: '0.3px', borderBottom: '1px solid #e9ecef', paddingBottom: 4 }}>
                    <iconify-icon icon="solar:paperclip-bold-duotone" />
                    <span>Smlouvy / dokumenty</span>
                  </div>
                </div>
                <div className="col-12">
                  <input type="file" className="form-control form-control-sm" accept=".pdf,.doc,.docx,.xlsx,.png,.jpg"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const lower = f.name.toLowerCase();
                      const typ = lower.includes('smlouva') ? 'Smlouva'
                                : lower.includes('kalend') ? 'Splátkový kalendář'
                                : lower.includes('vypis')   ? 'Výpis z banky'
                                : lower.includes('dodatek') ? 'Dodatek'
                                : 'Příloha';
                      const newDoc = {
                        id: `d-new-${Date.now()}`,
                        nazev: f.name,
                        typ,
                        velikostKb: Math.round(f.size / 1024),
                        uploadedAt: new Date().toISOString().slice(0, 16),
                        uploadedBy: 'Petr Dohnal',
                      };
                      setPendingDocs((prev) => [...prev, newDoc]);
                      e.currentTarget.value = '';
                    }} />
                  <div className="text-muted fs-11 mt-1">
                    Smlouva, splátkový kalendář od banky, dodatky, výpisy. PDF, Word, Excel, obrázek (mock — soubor se neukládá fyzicky).
                  </div>
                </div>
                {[...(initial?.dokumenty ?? []), ...pendingDocs].length > 0 && (
                  <div className="col-12">
                    <div className="d-flex flex-column gap-1">
                      {[...(initial?.dokumenty ?? []), ...pendingDocs].map((d) => {
                        const isNew = pendingDocs.find((x) => x.id === d.id);
                        return (
                          <div key={d.id} className="d-flex align-items-center gap-2 p-2 border rounded" style={{ background: isNew ? '#e8f6ed' : '#fafbfc' }}>
                            <iconify-icon icon="solar:document-text-bold-duotone" style={{ fontSize: 18, color: '#0d6efd' }} />
                            <div className="flex-grow-1 min-width-0">
                              <div className="fs-12 fw-semibold text-truncate">{d.nazev}</div>
                              <div className="text-muted" style={{ fontSize: 10 }}>{d.typ} · {d.velikostKb} KB · {d.uploadedBy}</div>
                            </div>
                            {isNew && (
                              <button type="button" className="btn btn-link btn-sm p-0 text-danger" title="Odebrat"
                                onClick={() => setPendingDocs((prev) => prev.filter((x) => x.id !== d.id))}>
                                <iconify-icon icon="solar:trash-bin-trash-bold-duotone" style={{ fontSize: 14 }} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light btn-sm" onClick={onClose}>Zrušit</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!canSave} onClick={handleSubmit}>
                <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                {isEdit ? 'Uložit změny' : 'Vytvořit úvěr'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// Main view
// ──────────────────────────────────────────────────────────────
export default function UveryView(_props: Props) {
  const [search, setSearch] = useState('');
  const [typFilter, setTypFilter]     = useState<UverTyp | 'all'>('all');
  const [sazbaFilter, setSazbaFilter] = useState<UverSazbaTyp | 'all'>('all');
  const [stavFilter, setStavFilter]   = useState<UverStav | 'all'>('all');
  const [nestandardniOnly, setNestandardniOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localUvery, setLocalUvery] = useState<Record<string, Uver>>({});
  const [formState, setFormState]   = useState<{ mode: 'new' | 'edit'; initial: Uver | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const mergedData: Uver[] = useMemo(() => {
    const baseMap = new Map<string, Uver>();
    UVERY.forEach((u) => baseMap.set(u.id, u));
    Object.values(localUvery).forEach((u) => baseMap.set(u.id, u));
    return Array.from(baseMap.values());
  }, [localUvery]);

  const filtered = useMemo(() => {
    return mergedData.filter((u) => {
      if (typFilter !== 'all'   && u.typ !== typFilter)         return false;
      if (sazbaFilter !== 'all' && u.sazbaTyp !== sazbaFilter)  return false;
      if (stavFilter !== 'all'  && u.stav !== stavFilter)       return false;
      if (nestandardniOnly && !maNestandardniSplatku(u))        return false;
      if (search) {
        const q = search.toLowerCase();
        if (!u.nazev.toLowerCase().includes(q) && !u.banka.toLowerCase().includes(q) && !u.cisloSmlouvy.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [mergedData, typFilter, sazbaFilter, stavFilter, search, nestandardniOnly]);

  const selected = useMemo(() => mergedData.find((u) => u.id === selectedId) ?? null, [mergedData, selectedId]);

  const handleSave = (data: Uver) => {
    setLocalUvery((prev) => ({ ...prev, [data.id]: data }));
    setFormState(null);
    setToast(formState?.mode === 'new' ? `Úvěr „${data.nazev}" vytvořen` : `Úvěr „${data.nazev}" upraven`);
    if (formState?.mode === 'new') setSelectedId(data.id);
  };

  const handlePredcasneSplatit = (id: string) => {
    const u = mergedData.find((x) => x.id === id);
    if (!u) return;
    setLocalUvery((prev) => ({ ...prev, [id]: { ...u, stav: 'predcasne-splacen', jistinaZbytek: 0 } }));
    setToast(`Úvěr „${u.nazev}" předčasně splacen — uvolněno ${fCzk(u.jistinaZbytek)}`);
  };

  return (
    <>
      <KpiStrip data={mergedData} onClickNestandardni={() => setNestandardniOnly(true)} />

      <div className="row g-4">
        <div className={selected ? 'col-xl-8 col-lg-7' : 'col-12'}>
          <UveryTable
            data={filtered} ucty={BANKA_UCTY}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId((cur) => cur === id ? null : id)}
            search={search} setSearch={setSearch}
            typFilter={typFilter} setTypFilter={setTypFilter}
            sazbaFilter={sazbaFilter} setSazbaFilter={setSazbaFilter}
            stavFilter={stavFilter} setStavFilter={setStavFilter}
            nestandardniOnly={nestandardniOnly} setNestandardniOnly={setNestandardniOnly}
            onNew={() => setFormState({ mode: 'new', initial: null })}
          />
        </div>
        {selected && (
          <div className="col-xl-4 col-lg-5">
            <UverSidePanel
              uver={selected} ucty={BANKA_UCTY}
              onClose={() => setSelectedId(null)}
              onPredcasneSplatit={handlePredcasneSplatit}
              onEdit={(id) => {
                const u = mergedData.find((x) => x.id === id);
                if (u) setFormState({ mode: 'edit', initial: u });
              }}
            />
          </div>
        )}
      </div>

      {formState && (
        <UverFormModal
          initial={formState.initial} ucty={BANKA_UCTY}
          onSave={handleSave}
          onClose={() => setFormState(null)}
        />
      )}

      {toast && (
        <div className="position-fixed top-0 end-0 m-4" style={{ zIndex: 1080 }}>
          <div className="alert alert-success py-2 px-3 mb-0 d-flex align-items-center gap-2 shadow-sm" style={{ minWidth: 240 }}>
            <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 18 }} />
            <span className="fs-13">{toast}</span>
          </div>
        </div>
      )}
    </>
  );
}
