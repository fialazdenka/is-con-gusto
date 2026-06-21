// COMPONENT: Trvalé příkazy — sekce Finance → Trvalé příkazy (Phase 3 — Banka extension)
// SOURCE: Larkon table/card pattern + sticky right side panel (pattern z BankaView)
// CUSTOM: splátkový kalendář pro leasingy (editovatelné jednotlivé splátky)

import { useState, useMemo, useEffect, Fragment } from 'react';
import type { AppState } from '../types';
import {
  TRVALE_PRIKAZY,
  PERIODA_LABEL,
  TYP_META_TP,
  STAV_META_TP,
  SPLATKA_STAV_META,
  getMesicniZatez,
  generateLeasingSplatky,
  monthsBetween,
  maNezaplacenouSplatku,
  getPocetNezaplacenychSplatek,
  type TrvalyPrikaz,
  type TrvalyPrikazStav,
  type TrvalyPrikazTyp,
  type TrvalySplatkaItem,
  type TrvalyDokument,
} from '../trvalePrikazyData';
import { BANKA_UCTY } from '../bankaData';
import { fCzk, fDate, PROVOZOVNY } from '../data';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

// ──────────────────────────────────────────────────────────────
// KPI strip — souhrn aktivních příkazů + měsíční zátěž
// ──────────────────────────────────────────────────────────────
function KpiStrip({ data, onClickNezaplacene }: { data: TrvalyPrikaz[]; onClickNezaplacene: () => void }) {
  const aktivni = data.filter((p) => p.stav === 'aktivni').length;
  const mesicniZatez = getMesicniZatez();
  const nezaplaceneCount = getPocetNezaplacenychSplatek(data);
  const nezaplacenePrikazy = data.filter(maNezaplacenouSplatku).length;

  type Tile = { label: string; value: string; icon: string; color: string; onClick?: () => void; alert?: boolean };
  // Phase 7 — „Zrušené" KPI dlaždice odstraněna (per feedback 18. 6. 2026)
  const tiles: Tile[] = [
    { label: 'Aktivní',          value: String(aktivni),                  icon: 'solar:play-circle-bold-duotone',          color: '#198754' },
    { label: 'Měsíční zátěž',    value: fCzk(Math.round(mesicniZatez)),   icon: 'solar:dollar-minimalistic-bold-duotone',  color: '#0d6efd' },
    { label: nezaplaceneCount === 1 ? 'Nezaplacená splátka' : 'Nezaplacené splátky',
      value: nezaplaceneCount > 0 ? `${nezaplaceneCount} (${nezaplacenePrikazy} ${nezaplacenePrikazy === 1 ? 'TP' : 'TPs'})` : '0',
      icon: 'solar:bell-bing-bold-duotone',
      color: '#dc3545',
      onClick: nezaplaceneCount > 0 ? onClickNezaplacene : undefined,
      alert: nezaplaceneCount > 0,
    },
  ];

  return (
    <div className="row g-2 mb-3">
      {tiles.map((t) => (
        <div key={t.label} className="col-12 col-md-4">
          <div className={`card h-100 ${t.onClick ? 'wq-card' : ''}`}
               style={{
                 borderTop: `3px solid ${t.color}`,
                 cursor: t.onClick ? 'pointer' : 'default',
                 background: t.alert ? '#fdf3f4' : undefined,
               }}
               onClick={t.onClick}
               title={t.onClick ? 'Klikni pro filtr na nezaplacené' : undefined}>
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
// Tabulka trvalých příkazů
// ──────────────────────────────────────────────────────────────
function PrikazyTable({ data, ucty, selectedId, onSelect, search, setSearch, stavFilter, setStavFilter, typFilter, setTypFilter, onNew, nezaplaceneOnly, setNezaplaceneOnly }: {
  data: TrvalyPrikaz[];
  ucty: typeof BANKA_UCTY;
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  setSearch: (s: string) => void;
  stavFilter: TrvalyPrikazStav | 'all';
  setStavFilter: (s: TrvalyPrikazStav | 'all') => void;
  typFilter: TrvalyPrikazTyp | 'all';
  setTypFilter: (t: TrvalyPrikazTyp | 'all') => void;
  onNew: () => void;
  nezaplaceneOnly: boolean;
  setNezaplaceneOnly: (v: boolean) => void;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <h5 className="card-title mb-0">
            Trvalé příkazy
            <small className="text-muted fw-normal ms-2 fs-13">{data.length} {data.length === 1 ? 'příkaz' : data.length < 5 ? 'příkazy' : 'příkazů'}</small>
          </h5>
          <button className="btn btn-primary btn-sm ms-auto d-flex align-items-center gap-1" onClick={onNew}>
            <iconify-icon icon="solar:add-square-bold-duotone" />
            Nový trvalý příkaz
          </button>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
          <div className="position-relative" style={{ width: 220 }}>
            <iconify-icon icon="solar:magnifer-bold-duotone"
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9097a7' }} />
            <input type="text" className="form-control form-control-sm w-100"
              placeholder="Hledat název / protistranu…" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 28 }} />
          </div>
          <select className="form-select form-select-sm" style={{ width: 'auto' }}
            value={typFilter} onChange={(e) => setTypFilter(e.target.value as TrvalyPrikazTyp | 'all')}>
            <option value="all">Všechny typy</option>
            <option value="standard">Standardní</option>
            <option value="leasing">Leasing</option>
            <option value="zaloha">Záloha</option>
          </select>
          <select className="form-select form-select-sm" style={{ width: 'auto' }}
            value={stavFilter} onChange={(e) => setStavFilter(e.target.value as TrvalyPrikazStav | 'all')}>
            <option value="all">Všechny stavy</option>
            <option value="aktivni">Aktivní</option>
            <option value="zruseny">Zrušené</option>
          </select>
          <button type="button"
            className={`badge border-0 ${nezaplaceneOnly ? 'bg-danger text-white' : 'bg-danger-subtle text-danger'}`}
            style={{ cursor: 'pointer', fontSize: 11 }}
            onClick={() => setNezaplaceneOnly(!nezaplaceneOnly)}
            title="Jen příkazy s nezaplacenou splátkou">
            <iconify-icon icon="solar:bell-bing-bold-duotone" className="me-1" style={{ fontSize: 11 }} />
            Jen nezaplacené
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-centered table-nowrap mb-0" style={{ fontSize: 12 }}>
          <thead className="table-light">
            <tr>
              <th>Název</th>
              <th>Typ</th>
              <th>Účet</th>
              <th>Perioda</th>
              <th className="text-end">Částka</th>
              <th>VS</th>
              <th>Příští splatnost</th>
              <th>Stav</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={8} className="text-center py-4 text-muted">Žádné trvalé příkazy nesplňují filtr</td></tr>
            )}
            {data.map((p) => {
              const ucet = ucty.find((u) => u.id === p.ucetId);
              const typM = TYP_META_TP[p.typ];
              const stavM = STAV_META_TP[p.stav];
              const isActive = p.id === selectedId;
              return (
                <tr key={p.id} className={isActive ? 'table-active' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      const row = e.currentTarget;
                      const wasSelected = isActive;
                      onSelect(p.id);
                      if (!wasSelected) {
                        requestAnimationFrame(() => {
                          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        });
                      }
                    }}>
                  <td>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <div className="fw-semibold">{p.nazev}</div>
                      {maNezaplacenouSplatku(p) && (
                        <span className="badge bg-danger-subtle text-danger" style={{ fontSize: 9 }}
                              title="Příkaz má alespoň jednu splátku po splatnosti">
                          <iconify-icon icon="solar:bell-bing-bold-duotone" className="me-1" style={{ fontSize: 9 }} />
                          Nezaplaceno
                        </span>
                      )}
                    </div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{p.protistrana}</div>
                  </td>
                  <td>
                    <span className="badge d-inline-flex align-items-center gap-1"
                      style={{ background: typM.bg, color: typM.color, fontSize: 10 }}>
                      <iconify-icon icon={typM.icon} style={{ fontSize: 11 }} />
                      {typM.label}
                    </span>
                  </td>
                  <td>
                    <div className="fw-semibold">{ucet?.nazev ?? '—'}</div>
                  </td>
                  <td>{PERIODA_LABEL[p.perioda]}</td>
                  <td className="text-end czk-num fw-bold">{fCzk(p.castka)}</td>
                  <td className="czk-num text-muted" style={{ fontSize: 11 }}>{p.vs}</td>
                  <td>{fDate(p.pristiSplatnost)}</td>
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
// Side panel — detail příkazu (single-scroll, pattern z BankaView)
// ──────────────────────────────────────────────────────────────
function PrikazSidePanel({ prikaz, ucty, onClose, onChangeStav, onEdit, onUpdateSplatka }: {
  prikaz: TrvalyPrikaz | null;
  ucty: typeof BANKA_UCTY;
  onClose: () => void;
  onChangeStav: (id: string, stav: TrvalyPrikazStav) => void;
  onEdit: (id: string) => void;
  onUpdateSplatka: (prikazId: string, splatkaId: string, patch: Partial<TrvalySplatkaItem>) => void;
}) {
  // Inline edit state pro jednotlivou splátku
  const [editingSplatkaId, setEditingSplatkaId] = useState<string | null>(null);
  const [splatkaDraft, setSplatkaDraft] = useState<{ datum: string; vs: string; castka: number; ucetId: string }>({
    datum: '', vs: '', castka: 0, ucetId: '',
  });

  // Reset edit při změně příkazu
  useEffect(() => {
    setEditingSplatkaId(null);
  }, [prikaz?.id]);

  const startEditSplatka = (s: TrvalySplatkaItem) => {
    setEditingSplatkaId(s.id);
    setSplatkaDraft({
      datum: s.datum,
      vs: s.vs,
      castka: s.castka,
      ucetId: s.ucetId ?? prikaz?.ucetId ?? '',
    });
  };

  const cancelEditSplatka = () => {
    setEditingSplatkaId(null);
  };

  const saveEditSplatka = (s: TrvalySplatkaItem) => {
    if (!prikaz) return;
    const patch: Partial<TrvalySplatkaItem> = {
      datum: splatkaDraft.datum,
      vs: splatkaDraft.vs,
      castka: splatkaDraft.castka,
      editedAt: new Date().toISOString().slice(0, 16),
    };
    // ucetId — jen pokud se liší od parent (jinak undefined = fallback na parent)
    if (splatkaDraft.ucetId && splatkaDraft.ucetId !== prikaz.ucetId) {
      patch.ucetId = splatkaDraft.ucetId;
    } else {
      patch.ucetId = undefined;
    }
    onUpdateSplatka(prikaz.id, s.id, patch);
    setEditingSplatkaId(null);
  };
  if (!prikaz) {
    return (
      <div className="card h-100" style={{ minHeight: 320 }}>
        <div className="card-body d-flex flex-column align-items-center justify-content-center text-center py-5">
          <iconify-icon icon="solar:refresh-circle-bold-duotone" style={{ fontSize: 40, color: '#dee2e6', marginBottom: 12 }} />
          <div className="fw-semibold text-muted fs-14 mb-1">Žádný příkaz vybrán</div>
          <div className="text-muted fs-12">Klikněte na řádek pro detail trvalého příkazu</div>
        </div>
      </div>
    );
  }

  const ucet = ucty.find((u) => u.id === prikaz.ucetId);
  const typM = TYP_META_TP[prikaz.typ];
  const stavM = STAV_META_TP[prikaz.stav];

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
            </div>
            <div className="fw-bold fs-14">{prikaz.nazev}</div>
            <div className="text-muted fs-11">{prikaz.protistrana}</div>
            <div className="d-flex align-items-baseline gap-2 mt-2">
              <div className="fw-bold czk-num" style={{ fontSize: 22, lineHeight: 1 }}>
                {fCzk(prikaz.castka)}
              </div>
              <div className="text-muted fs-11">· {PERIODA_LABEL[prikaz.perioda]}</div>
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
              onClick={() => onEdit(prikaz.id)}>
              <iconify-icon icon="solar:pen-bold-duotone" />
              Upravit příkaz
            </button>
            {/* Phase 7 (zápis 12. 6. 2026) — jen 2 stavy: aktivní ↔ zrušený */}
            {prikaz.stav === 'aktivni' && (
              <button className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={() => onChangeStav(prikaz.id, 'zruseny')}>
                <iconify-icon icon="solar:stop-circle-bold-duotone" />
                Zrušit příkaz
              </button>
            )}
            {prikaz.stav === 'zruseny' && (
              <>
                <button className="btn btn-outline-success btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                  onClick={() => onChangeStav(prikaz.id, 'aktivni')}>
                  <iconify-icon icon="solar:play-circle-bold-duotone" />
                  Znovu aktivovat
                </button>
                <div className="alert alert-secondary py-2 mb-0 fs-12 d-flex align-items-center gap-2">
                  <iconify-icon icon="solar:stop-circle-bold-duotone" style={{ fontSize: 16 }} />
                  <span>Tento příkaz byl zrušen.</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* DETAIL */}
        <div className="p-3 border-bottom">
          <div className="d-flex align-items-center gap-2 mb-2">
            <iconify-icon icon="solar:document-text-bold-duotone" style={{ fontSize: 14, color: '#6c757d' }} />
            <div className="fw-semibold fs-12 text-uppercase" style={{ letterSpacing: '0.3px', color: '#495057' }}>Detail</div>
          </div>
          <div className="row g-2">
            <div className="col-6">
              <div className="text-muted fs-11 fw-semibold mb-1">VS</div>
              <div className="fs-13 czk-num">{prikaz.vs}</div>
            </div>
            {prikaz.ks && (
              <div className="col-3">
                <div className="text-muted fs-11 fw-semibold mb-1">KS</div>
                <div className="fs-13 czk-num">{prikaz.ks}</div>
              </div>
            )}
            <div className="col-12">
              <div className="text-muted fs-11 fw-semibold mb-1">Účet (z kterého odchází)</div>
              <div className="fs-13 fw-semibold">{ucet?.nazev ?? '—'}</div>
              <div className="text-muted fs-11 czk-num">{ucet?.iban ?? '—'}</div>
            </div>
            <div className="col-12">
              <div className="text-muted fs-11 fw-semibold mb-1">Protistrana — účet</div>
              <div className="fs-13 czk-num">{prikaz.protiUcet}</div>
            </div>
            <div className="col-6">
              <div className="text-muted fs-11 fw-semibold mb-1">Začátek</div>
              <div className="fs-13">{fDate(prikaz.zacatek)}</div>
            </div>
            {prikaz.konec && (
              <div className="col-6">
                <div className="text-muted fs-11 fw-semibold mb-1">Konec</div>
                <div className="fs-13">{fDate(prikaz.konec)}</div>
              </div>
            )}
            <div className="col-12">
              <div className="text-muted fs-11 fw-semibold mb-1">Příští splatnost</div>
              <div className="fs-13 fw-semibold">{fDate(prikaz.pristiSplatnost)}</div>
            </div>
            {/* Phase 7 — komu jde do nákladu */}
            <div className="col-12">
              <div className="text-muted fs-11 fw-semibold mb-1">Komu jde do nákladu</div>
              <div className="fs-12">
                {prikaz.nakladKomu === 'kancelar' && <span className="badge bg-info-subtle text-info"><iconify-icon icon="solar:buildings-2-bold-duotone" className="me-1" />Kancelář (celofiremní)</span>}
                {prikaz.nakladKomu === 'sdileny'  && <span className="badge bg-warning-subtle text-warning"><iconify-icon icon="solar:users-group-rounded-bold-duotone" className="me-1" />Sdílený</span>}
                {(prikaz.nakladKomu === 'provoz' || !prikaz.nakladKomu) && prikaz.provozovnaId && (
                  <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                    <span className="rounded-circle" style={{ width: 6, height: 6, background: PROVOZOVNY.find((p) => p.id === prikaz.provozovnaId)?.color ?? '#9097a7', display: 'inline-block' }} />
                    {PROVOZOVNY.find((p) => p.id === prikaz.provozovnaId)?.name ?? prikaz.provozovnaId}
                  </span>
                )}
                {(prikaz.nakladKomu === 'provoz' || !prikaz.nakladKomu) && !prikaz.provozovnaId && (
                  <span className="text-muted">— nevybráno —</span>
                )}
              </div>
            </div>
            {prikaz.poznamka && (
              <div className="col-12">
                <div className="text-muted fs-11 fw-semibold mb-1">Poznámka</div>
                <div className="fs-12 fst-italic">„{prikaz.poznamka}"</div>
              </div>
            )}
          </div>
        </div>

        {/* SPLÁTKOVÝ KALENDÁŘ (jen pro leasing / zaloha s vyúčtováním) */}
        {prikaz.splatky && prikaz.splatky.length > 0 && (
          <div className="p-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <iconify-icon icon="solar:calendar-bold-duotone" style={{ fontSize: 14, color: '#fd7e14' }} />
              <div className="fw-semibold fs-12 text-uppercase" style={{ letterSpacing: '0.3px', color: '#495057' }}>
                Splátkový kalendář ({prikaz.splatky.length})
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-sm mb-0" style={{ fontSize: 11 }}>
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Datum</th>
                    <th>VS</th>
                    <th className="text-end">Částka</th>
                    <th>Stav</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {prikaz.splatky.map((s) => {
                    const sm = SPLATKA_STAV_META[s.stav];
                    const isEditing = editingSplatkaId === s.id;
                    const hasOverride = !!s.ucetId && s.ucetId !== prikaz.ucetId;
                    const splatkaUcet = ucty.find((u) => u.id === (s.ucetId ?? prikaz.ucetId));
                    return (
                      <Fragment key={s.id}>
                        <tr style={s.editedAt ? { background: '#fffbe6' } : undefined}>
                          <td>{s.cisloSplatky}</td>
                          <td className="czk-num">{fDate(s.datum)}</td>
                          <td className="czk-num">
                            <span className={hasOverride ? 'text-warning fw-semibold' : 'text-muted'}>{s.vs}</span>
                            {s.editedAt && (
                              <span className="badge bg-warning-subtle text-warning ms-1" style={{ fontSize: 9 }} title={`Upraveno ${s.editedAt}`}>
                                upraveno
                              </span>
                            )}
                          </td>
                          <td className="text-end czk-num fw-semibold">{fCzk(s.castka)}</td>
                          <td>
                            <span className={`badge ${sm.cls}`} style={{ fontSize: 9 }}>
                              {sm.label}
                            </span>
                          </td>
                          <td className="text-end">
                            {s.stav !== 'zaplacena' && !isEditing && (
                              <button className="btn btn-link btn-sm p-0 text-primary" onClick={() => startEditSplatka(s)} title="Upravit splátku">
                                <iconify-icon icon="solar:pen-bold-duotone" style={{ fontSize: 14 }} />
                              </button>
                            )}
                          </td>
                        </tr>
                        {isEditing && (
                          <tr style={{ background: '#f0f7ff' }}>
                            <td colSpan={6} className="p-2">
                              <div className="d-flex flex-column gap-2">
                                <div className="text-uppercase fs-11 fw-semibold" style={{ letterSpacing: '0.3px', color: '#0d6efd' }}>
                                  Upravit splátku #{s.cisloSplatky}
                                </div>
                                <div className="row g-2">
                                  <div className="col-6">
                                    <label className="form-label fs-11 fw-semibold mb-1">Datum</label>
                                    <input type="date" className="form-control form-control-sm"
                                      value={splatkaDraft.datum}
                                      onChange={(e) => setSplatkaDraft((d) => ({ ...d, datum: e.target.value }))} />
                                  </div>
                                  <div className="col-6">
                                    <label className="form-label fs-11 fw-semibold mb-1">VS (celé číslo)</label>
                                    <input type="text" className="form-control form-control-sm czk-num"
                                      value={splatkaDraft.vs}
                                      onChange={(e) => setSplatkaDraft((d) => ({ ...d, vs: e.target.value }))} />
                                  </div>
                                  <div className="col-6">
                                    <label className="form-label fs-11 fw-semibold mb-1">Částka (Kč)</label>
                                    <input type="number" className="form-control form-control-sm czk-num"
                                      value={splatkaDraft.castka || ''}
                                      onChange={(e) => setSplatkaDraft((d) => ({ ...d, castka: parseInt(e.target.value || '0', 10) }))} />
                                  </div>
                                  <div className="col-6">
                                    <label className="form-label fs-11 fw-semibold mb-1">Odchozí účet</label>
                                    <select className="form-select form-select-sm"
                                      value={splatkaDraft.ucetId}
                                      onChange={(e) => setSplatkaDraft((d) => ({ ...d, ucetId: e.target.value }))}>
                                      {ucty.map((u) => (
                                        <option key={u.id} value={u.id}>{u.nazev} ({u.mena})</option>
                                      ))}
                                    </select>
                                    {splatkaDraft.ucetId !== prikaz.ucetId && (
                                      <div className="text-warning fs-11 mt-1">
                                        Odlišný od výchozího účtu příkazu — bude označeno jako override.
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="d-flex gap-1 mt-1">
                                  <button className="btn btn-primary btn-sm" onClick={() => saveEditSplatka(s)}>
                                    <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                                    Uložit
                                  </button>
                                  <button className="btn btn-light btn-sm" onClick={cancelEditSplatka}>Zrušit</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        {hasOverride && !isEditing && (
                          <tr style={{ background: '#fffaf3' }}>
                            <td />
                            <td colSpan={5} className="fs-11 text-warning" style={{ paddingTop: 0 }}>
                              ⤷ Odchozí účet override: <strong>{splatkaUcet?.nazev}</strong>
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
              Klikni na <iconify-icon icon="solar:pen-bold-duotone" style={{ fontSize: 11 }} /> u řádku pro úpravu VS, částky, data nebo odchozího účtu konkrétní splátky.
            </div>
          </div>
        )}

        {/* DOKUMENTY (smlouvy, dodatky) */}
        <div className="p-3 border-top">
          <div className="d-flex align-items-center gap-2 mb-2">
            <iconify-icon icon="solar:paperclip-bold-duotone" style={{ fontSize: 14, color: '#6c757d' }} />
            <div className="fw-semibold fs-12 text-uppercase" style={{ letterSpacing: '0.3px', color: '#495057' }}>
              Dokumenty {prikaz.dokumenty && prikaz.dokumenty.length > 0 && `(${prikaz.dokumenty.length})`}
            </div>
          </div>
          {prikaz.dokumenty && prikaz.dokumenty.length > 0 ? (
            <div className="d-flex flex-column gap-1 mb-2">
              {prikaz.dokumenty.map((d) => (
                <div key={d.id} className="d-flex align-items-center gap-2 p-2 border rounded" style={{ background: '#fafbfc' }}>
                  <iconify-icon icon={d.nazev.endsWith('.pdf') ? 'solar:document-text-bold-duotone' : 'solar:file-text-bold-duotone'}
                    style={{ fontSize: 18, color: '#0d6efd' }} />
                  <div className="flex-grow-1 min-width-0">
                    <div className="fs-12 fw-semibold text-truncate">{d.nazev}</div>
                    <div className="text-muted" style={{ fontSize: 10 }}>
                      {d.typ} · {d.velikostKb} KB · {d.uploadedBy}
                    </div>
                  </div>
                  <button className="btn btn-link btn-sm p-0 text-primary" title="Stáhnout (mock)">
                    <iconify-icon icon="solar:download-minimalistic-bold-duotone" style={{ fontSize: 14 }} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted fs-12 text-center py-2">
              <iconify-icon icon="solar:paperclip-bold-duotone" style={{ fontSize: 20, color: '#dee2e6' }} />
              <div className="mt-1">Žádné přílohy</div>
            </div>
          )}
          <div className="text-muted fs-11 fst-italic">
            Smlouvy, dodatky atp. — upload v editaci příkazu.
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Modal: nový / editace trvalého příkazu
// ──────────────────────────────────────────────────────────────
function PrikazFormModal({ initial, ucty, onSave, onClose }: {
  initial: TrvalyPrikaz | null;   // null = nový, jinak edit
  ucty: typeof BANKA_UCTY;
  onSave: (data: TrvalyPrikaz) => void;
  onClose: () => void;
}) {
  const isEdit = initial !== null;

  // Default pro nový
  const today = '2026-06-09';
  const defaults: TrvalyPrikaz = initial ?? {
    id: `tp-new-${Date.now().toString().slice(-6)}`,
    nazev: '',
    ucetId: ucty[0]?.id ?? '',
    protistrana: '',
    protiUcet: '',
    typ: 'standard',
    perioda: 'mesicni',
    castka: 0,
    vs: '',
    ks: '',
    zacatek: today,
    pristiSplatnost: today,
    stav: 'aktivni',
    poznamka: '',
  };

  const [form, setForm] = useState<TrvalyPrikaz>(defaults);
  // Leasing-specifická pole pro generování splátkového kalendáře
  const [vsVzor, setVsVzor]           = useState<string>(initial?.vs.slice(0, 6) ?? '');
  const [pocetSplatek, setPocetSplatek] = useState<number>(initial?.splatky?.length ?? 12);
  const [regenerateSplatky, setRegenerateSplatky] = useState<boolean>(!initial?.splatky); // při novém true, při edit false dokud user nechce
  // Mock upload „smlouvy" — držíme seznam pseudo-souborů
  const [pendingDocs, setPendingDocs] = useState<TrvalyDokument[]>([]);

  const handleChange = <K extends keyof TrvalyPrikaz>(key: K, value: TrvalyPrikaz[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-sync VS vzor s VS polem dokud uživatel přímo needitoval vsVzor
      if (key === 'vs' && typeof value === 'string') {
        setVsVzor(value.slice(0, 6));
      }
      // Pokud se mění perioda nebo konec → přepočítáme suggested počet splátek
      if ((key === 'konec' || key === 'zacatek') && next.typ === 'leasing') {
        const m = monthsBetween(next.zacatek, (key === 'konec' ? value as string : (next.konec ?? '')));
        if (m > 0) setPocetSplatek(m);
      }
      return next;
    });
  };

  // Preview generovaných splátek (jen pro leasing)
  const previewSplatky: TrvalySplatkaItem[] = useMemo(() => {
    if (form.typ !== 'leasing' || !regenerateSplatky) return [];
    return generateLeasingSplatky(form.zacatek, pocetSplatek, form.castka, vsVzor || form.vs.slice(0, 6) || 'VS');
  }, [form.typ, form.zacatek, form.castka, vsVzor, form.vs, pocetSplatek, regenerateSplatky]);

  const canSave = form.nazev.trim() !== ''
               && form.ucetId !== ''
               && form.protistrana.trim() !== ''
               && form.castka > 0;

  const handleSubmit = () => {
    let toSave = form;
    if (form.typ === 'leasing' && regenerateSplatky) {
      // Generovat splátkový kalendář
      const splatky = generateLeasingSplatky(form.zacatek, pocetSplatek, form.castka, vsVzor || form.vs.slice(0, 6) || 'VS');
      toSave = { ...form, splatky };
    } else if (form.typ !== 'leasing') {
      // Pokud se změnil typ z leasing na něco jiného, splátky pryč
      toSave = { ...form, splatky: undefined };
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
                {isEdit ? 'Upravit trvalý příkaz' : 'Nový trvalý příkaz'}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Zavřít" />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                {/* Interní název příkazu — Phase 7 (zápis 12. 6. 2026) oddělen od názvu firmy */}
                <div className="col-12">
                  <label className="form-label fs-12 fw-semibold">Interní název příkazu *</label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="např. O2 — telefon CG Brno"
                    value={form.nazev} onChange={(e) => handleChange('nazev', e.target.value)} />
                  <div className="text-muted fs-11 mt-1">Slouží pro orientaci v seznamu (popis, ke kterému účelu příkaz patří).</div>
                </div>

                {/* Typ + Perioda */}
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Typ *</label>
                  <select className="form-select form-select-sm" value={form.typ}
                    onChange={(e) => handleChange('typ', e.target.value as TrvalyPrikazTyp)}>
                    <option value="standard">Standardní</option>
                    <option value="leasing">Leasing (s měnícím se VS)</option>
                    <option value="zaloha">Záloha (s vyúčtováním)</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Perioda *</label>
                  <select className="form-select form-select-sm" value={form.perioda}
                    onChange={(e) => handleChange('perioda', e.target.value as TrvalyPrikaz['perioda'])}>
                    <option value="tydenni">Týdenní</option>
                    <option value="mesicni">Měsíční</option>
                    <option value="kvartalni">Kvartální</option>
                    <option value="pololetni">Pololetní</option>
                    <option value="rocni">Roční</option>
                    <option value="jednorazovy">Jednorázový</option>
                  </select>
                </div>

                {/* Účet odchozí + Částka */}
                <div className="col-md-8">
                  <label className="form-label fs-12 fw-semibold">Účet (z kterého odchází) *</label>
                  <select className="form-select form-select-sm" value={form.ucetId}
                    onChange={(e) => handleChange('ucetId', e.target.value)}>
                    {ucty.map((u) => (
                      <option key={u.id} value={u.id}>{u.nazev} ({u.mena}) — {u.iban}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Částka (Kč) *</label>
                  <input type="number" inputMode="numeric" className="form-control form-control-sm"
                    placeholder="0" value={form.castka || ''} onChange={(e) => handleChange('castka', parseInt(e.target.value || '0', 10))} />
                </div>

                {/* Protistrana — sekce */}
                <div className="col-12 mt-2">
                  <div className="text-muted fs-11 fw-semibold text-uppercase" style={{ letterSpacing: '0.3px', borderBottom: '1px solid #e9ecef', paddingBottom: 4 }}>
                    Protistrana (komu se platí)
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Název firmy *</label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="např. O2 Czech Republic"
                    value={form.protistrana} onChange={(e) => handleChange('protistrana', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Účet protistrany</label>
                  <input type="text" className="form-control form-control-sm czk-num"
                    placeholder="např. 1234567890/0100"
                    value={form.protiUcet} onChange={(e) => handleChange('protiUcet', e.target.value)} />
                </div>

                {/* VS / KS / SS */}
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">VS *</label>
                  <input type="text" className="form-control form-control-sm czk-num"
                    placeholder="např. 20260315"
                    value={form.vs} onChange={(e) => handleChange('vs', e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label fs-12 fw-semibold">KS</label>
                  <input type="text" className="form-control form-control-sm czk-num"
                    value={form.ks ?? ''} onChange={(e) => handleChange('ks', e.target.value)} />
                </div>
                <div className="col-md-3">
                  <label className="form-label fs-12 fw-semibold">SS</label>
                  <input type="text" className="form-control form-control-sm czk-num"
                    value={form.ss ?? ''} onChange={(e) => handleChange('ss', e.target.value)} />
                </div>

                {/* Trvání — sekce */}
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
                  <label className="form-label fs-12 fw-semibold">Konec (nepovinné)</label>
                  <input type="date" className="form-control form-control-sm"
                    value={form.konec ?? ''} onChange={(e) => handleChange('konec', e.target.value || undefined)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Příští splatnost *</label>
                  <input type="date" className="form-control form-control-sm"
                    value={form.pristiSplatnost} onChange={(e) => handleChange('pristiSplatnost', e.target.value)} />
                </div>

                {/* Komu jde do nákladu — Phase 7 (zápis 12. 6. 2026) */}
                <div className="col-12 mt-2">
                  <div className="text-muted fs-11 fw-semibold text-uppercase" style={{ letterSpacing: '0.3px', borderBottom: '1px solid #e9ecef', paddingBottom: 4 }}>
                    Komu jde do nákladu (účetnictví)
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Typ nákladu *</label>
                  <select className="form-select form-select-sm"
                    value={form.nakladKomu ?? 'provoz'}
                    onChange={(e) => handleChange('nakladKomu', e.target.value as NonNullable<TrvalyPrikaz['nakladKomu']>)}>
                    <option value="provoz">Konkrétní provozovna</option>
                    <option value="kancelar">Kancelář (celofiremní)</option>
                    <option value="sdileny">Sdílený mezi víc provoz</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Provozovna {form.nakladKomu === 'provoz' ? '*' : '(nepovinné)'}</label>
                  <select className="form-select form-select-sm"
                    value={form.provozovnaId ?? ''}
                    onChange={(e) => handleChange('provozovnaId', e.target.value || undefined)}
                    disabled={form.nakladKomu === 'kancelar'}>
                    <option value="">— nevybráno —</option>
                    {PROVOZOVNY.filter((p) => p.status === 'active').map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Stav + Poznámka */}
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Stav</label>
                  <select className="form-select form-select-sm" value={form.stav}
                    onChange={(e) => handleChange('stav', e.target.value as TrvalyPrikazStav)}>
                    <option value="aktivni">Aktivní</option>
                    <option value="zruseny">Zrušený</option>
                  </select>
                </div>
                <div className="col-md-8">
                  <label className="form-label fs-12 fw-semibold">Poznámka</label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="Volitelný komentář"
                    value={form.poznamka ?? ''} onChange={(e) => handleChange('poznamka', e.target.value)} />
                </div>

                {/* Dokumenty (smlouvy) — sekce */}
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
                      const newDoc: TrvalyDokument = {
                        id: `d-new-${Date.now()}`,
                        nazev: f.name,
                        typ: f.name.toLowerCase().includes('smlouva') ? 'Smlouva' : f.name.toLowerCase().includes('kalend') ? 'Splátkový kalendář' : 'Příloha',
                        velikostKb: Math.round(f.size / 1024),
                        uploadedAt: new Date().toISOString().slice(0, 16),
                        uploadedBy: 'Petr Dohnal',
                      };
                      setPendingDocs((prev) => [...prev, newDoc]);
                      // reset input — aby šlo nahrát stejný soubor znovu
                      e.currentTarget.value = '';
                    }} />
                  <div className="text-muted fs-11 mt-1">PDF, Word, Excel, obrázek (mock — soubor se neukládá fyzicky, jen jeho metadata).</div>
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

                {/* Splátkový kalendář — jen pro leasing */}
                {form.typ === 'leasing' && (
                  <>
                    <div className="col-12 mt-2">
                      <div className="text-muted fs-11 fw-semibold text-uppercase d-flex align-items-center gap-2"
                        style={{ letterSpacing: '0.3px', borderBottom: '1px solid #e9ecef', paddingBottom: 4 }}>
                        <span>Splátkový kalendář (leasing)</span>
                        {initial?.splatky && (
                          <label className="ms-auto d-flex align-items-center gap-1 fs-11 fw-normal text-dark text-lowercase" style={{ cursor: 'pointer' }}>
                            <input type="checkbox" className="form-check-input m-0"
                              checked={regenerateSplatky}
                              onChange={(e) => setRegenerateSplatky(e.target.checked)} />
                            <span>Přegenerovat kalendář</span>
                          </label>
                        )}
                      </div>
                    </div>

                    {regenerateSplatky ? (
                      <>
                        <div className="col-md-6">
                          <label className="form-label fs-12 fw-semibold">VS vzor (každá splátka má jiný)</label>
                          <div className="d-flex align-items-center gap-1">
                            <input type="text" className="form-control form-control-sm czk-num"
                              placeholder="např. 202610"
                              value={vsVzor} onChange={(e) => setVsVzor(e.target.value)} />
                            <span className="text-muted czk-num">+ 001, 002, …</span>
                          </div>
                          <div className="text-muted fs-11 mt-1">
                            Reálný VS = vzor + 3-místné pořadové číslo splátky.
                          </div>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fs-12 fw-semibold">Počet splátek</label>
                          <input type="number" min={1} max={120} className="form-control form-control-sm czk-num"
                            value={pocetSplatek} onChange={(e) => setPocetSplatek(parseInt(e.target.value || '1', 10))} />
                        </div>
                        <div className="col-md-3 d-flex align-items-end">
                          <div className="text-muted fs-11 czk-num">
                            ≈ {fCzk(form.castka * pocetSplatek)}<br/>
                            <span style={{ fontSize: 10 }}>celkem za celý kalendář</span>
                          </div>
                        </div>

                        {/* Preview tabulky */}
                        {previewSplatky.length > 0 && (
                          <div className="col-12">
                            <div className="border rounded" style={{ background: '#fafbfc' }}>
                              <div className="px-2 py-1 fs-11 fw-semibold border-bottom" style={{ background: '#f1f3f5' }}>
                                Náhled splátek ({previewSplatky.length})
                              </div>
                              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                                <table className="table table-sm mb-0" style={{ fontSize: 11 }}>
                                  <thead className="table-light" style={{ position: 'sticky', top: 0 }}>
                                    <tr>
                                      <th>#</th>
                                      <th>Datum</th>
                                      <th>VS</th>
                                      <th className="text-end">Částka</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {previewSplatky.slice(0, 24).map((s) => (
                                      <tr key={s.id}>
                                        <td>{s.cisloSplatky}</td>
                                        <td className="czk-num">{s.datum}</td>
                                        <td className="czk-num text-primary fw-semibold">{s.vs}</td>
                                        <td className="text-end czk-num">{fCzk(s.castka)}</td>
                                      </tr>
                                    ))}
                                    {previewSplatky.length > 24 && (
                                      <tr>
                                        <td colSpan={4} className="text-center text-muted fst-italic">
                                          … a dalších {previewSplatky.length - 24} splátek
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            <div className="text-muted fs-11 mt-1">
                              Jednotlivé splátky půjde po uložení editovat v detailu příkazu (např. VS u akontace nebo poslední splátky).
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="col-12">
                        <div className="alert alert-secondary py-2 mb-0 fs-12 d-flex align-items-center gap-2">
                          <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 16 }} />
                          <span>Stávající splátkový kalendář ({initial?.splatky?.length}) bude zachován. Pro přegenerování zaškrtni výše.</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light btn-sm" onClick={onClose}>
                Zrušit
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!canSave}
                onClick={handleSubmit}>
                <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                {isEdit ? 'Uložit změny' : 'Vytvořit příkaz'}
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
export default function TrvalePrikazyView({ state, update }: Props) {
  const [search, setSearch] = useState('');
  const [stavFilter, setStavFilter] = useState<TrvalyPrikazStav | 'all'>('all');
  const [typFilter, setTypFilter]   = useState<TrvalyPrikazTyp | 'all'>('all');
  const [nezaplaceneOnly, setNezaplaceneOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Lokální session změny stavu (Pozastavit / Aktivovat / Ukončit)
  const [localStavy, setLocalStavy] = useState<Record<string, TrvalyPrikazStav>>({});
  // Lokálně vytvořené / editované příkazy (přepisují default mock)
  const [localPrikazy, setLocalPrikazy] = useState<Record<string, TrvalyPrikaz>>({});
  // Form modal: null = zavřený, jinak edit ID (existing nebo "new")
  const [formState, setFormState] = useState<{ mode: 'new' | 'edit'; initial: TrvalyPrikaz | null } | null>(null);
  // Toast
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Phase 8.5 (zápis 12. 6. 2026) — Cross-section nav z Banky: vytvořit TP z transakce
  useEffect(() => {
    if (state.pendingTPFromTrans) {
      const tp = state.pendingTPFromTrans;
      const today = new Date().toISOString().slice(0, 10);
      // Otevřeme form modal v "new" módu s předvyplněnými údaji z transakce
      const initial: TrvalyPrikaz = {
        id: 'tp-new-' + Date.now(),
        nazev: `Trvalý příkaz — ${tp.firma}`,
        ucetId: '',
        protistrana: tp.firma,
        protiUcet: tp.protiUcet ?? '',
        typ: 'standard',
        perioda: 'mesicni',
        castka: tp.castka,
        vs: tp.vs ?? '',
        zacatek: today,
        pristiSplatnost: today,
        stav: 'aktivni',
      };
      setFormState({ mode: 'new', initial });
      setToast(`Předvyplněno z bankovní transakce: ${tp.firma}`);
      update({ pendingTPFromTrans: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pendingTPFromTrans]);

  const mergedData: TrvalyPrikaz[] = useMemo(() => {
    // Combine mock + local edits + local new
    const baseMap = new Map<string, TrvalyPrikaz>();
    TRVALE_PRIKAZY.forEach((p) => baseMap.set(p.id, p));
    Object.values(localPrikazy).forEach((p) => baseMap.set(p.id, p));
    // Apply stav overrides
    return Array.from(baseMap.values()).map((p) =>
      localStavy[p.id] ? { ...p, stav: localStavy[p.id] } : p
    );
  }, [localStavy, localPrikazy]);

  const filtered = useMemo(() => {
    return mergedData.filter((p) => {
      if (stavFilter !== 'all' && p.stav !== stavFilter) return false;
      if (typFilter !== 'all' && p.typ !== typFilter)   return false;
      if (nezaplaceneOnly && !maNezaplacenouSplatku(p)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.nazev.toLowerCase().includes(q) && !p.protistrana.toLowerCase().includes(q) && !p.vs.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [mergedData, stavFilter, typFilter, search, nezaplaceneOnly]);

  const selected = useMemo(() => mergedData.find((p) => p.id === selectedId) ?? null, [mergedData, selectedId]);

  const handleSave = (data: TrvalyPrikaz) => {
    setLocalPrikazy((prev) => ({ ...prev, [data.id]: data }));
    setFormState(null);
    setToast(formState?.mode === 'new' ? `Trvalý příkaz „${data.nazev}" vytvořen` : `Trvalý příkaz „${data.nazev}" upraven`);
    // Pokud nový, automaticky vyber v tabulce
    if (formState?.mode === 'new') {
      setSelectedId(data.id);
    }
  };

  return (
    <>
      <KpiStrip data={mergedData} onClickNezaplacene={() => setNezaplaceneOnly(true)} />

      <div className="row g-4">
        <div className={selected ? 'col-xl-8 col-lg-7' : 'col-12'}>
          <PrikazyTable
            data={filtered} ucty={BANKA_UCTY}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId((cur) => cur === id ? null : id)}
            search={search} setSearch={setSearch}
            stavFilter={stavFilter} setStavFilter={setStavFilter}
            typFilter={typFilter} setTypFilter={setTypFilter}
            onNew={() => setFormState({ mode: 'new', initial: null })}
            nezaplaceneOnly={nezaplaceneOnly} setNezaplaceneOnly={setNezaplaceneOnly}
          />
        </div>
        {selected && (
          <div className="col-xl-4 col-lg-5">
            <PrikazSidePanel
              prikaz={selected} ucty={BANKA_UCTY}
              onClose={() => setSelectedId(null)}
              onChangeStav={(id, stav) => setLocalStavy((prev) => ({ ...prev, [id]: stav }))}
              onEdit={(id) => {
                const p = mergedData.find((x) => x.id === id);
                if (p) setFormState({ mode: 'edit', initial: p });
              }}
              onUpdateSplatka={(prikazId, splatkaId, patch) => {
                // Najdi current verzi příkazu (z merged) a apply patch na konkrétní splátku
                const current = mergedData.find((p) => p.id === prikazId);
                if (!current || !current.splatky) return;
                const updatedSplatky = current.splatky.map((s) => s.id === splatkaId ? { ...s, ...patch } : s);
                setLocalPrikazy((prev) => ({
                  ...prev,
                  [prikazId]: { ...current, splatky: updatedSplatky },
                }));
                setToast('Splátka upravena');
              }}
            />
          </div>
        )}
      </div>

      {/* Form modal */}
      {formState && (
        <PrikazFormModal
          initial={formState.initial}
          ucty={BANKA_UCTY}
          onSave={handleSave}
          onClose={() => setFormState(null)}
        />
      )}

      {/* Toast */}
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
