// COMPONENT: Daně — sekce Ekonomika → Daně (Phase 7 — zápis 12. 6. 2026)
// Evidence daňových plateb (DPH / DPPO / DPFO / Nemovitost / Silniční / Srážková)
// per S.R.O. + import dat + export oficiálních reportů.

import { useState, useMemo, useEffect } from 'react';
import type { AppState } from '../types';
import {
  DANE,
  DAN_TYP_META,
  DAN_STAV_META,
  PRAVNI_ENTITA_DAN_LABEL,
  getKpiDane,
  type Dan,
  type DanTyp,
  type DanStav,
  type PravniEntitaDan,
} from '../daneData';
import { BANKA_UCTY } from '../bankaData';
import { fCzk, fDate, PROVOZOVNY } from '../data';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

// ──────────────────────────────────────────────────────────────
// KPI strip
// ──────────────────────────────────────────────────────────────
function KpiStrip({ data }: { data: Dan[] }) {
  const kpi = getKpiDane(data);
  type Tile = { label: string; value: string; sub?: string; icon: string; color: string };
  const tiles: Tile[] = [
    { label: 'K odeslání tento měsíc', value: kpi.kOdeslaniMesic > 0 ? fCzk(Math.round(kpi.kOdeslaniMesic)) : '—',
      sub: 'do konce června 2026',
      icon: 'solar:upload-bold-duotone', color: '#fd7e14' },
    { label: 'Zaplaceno za 2026',      value: fCzk(Math.round(kpi.zaplacenoCelkem)),
      sub: 'kumulativní suma',
      icon: 'solar:check-circle-bold-duotone', color: '#198754' },
    { label: 'Po splatnosti',          value: String(kpi.poSplatnosti),
      sub: kpi.poSplatnosti > 0 ? 'vyžaduje pozornost' : 'vše v pořádku',
      icon: 'solar:bell-bing-bold-duotone', color: kpi.poSplatnosti > 0 ? '#dc3545' : '#9097a7' },
    { label: 'Naplánováno',            value: String(kpi.planovano),
      sub: 'budoucí daně',
      icon: 'solar:calendar-bold-duotone', color: '#0d6efd' },
  ];

  return (
    <div className="row g-2 mb-3">
      {tiles.map((t) => (
        <div key={t.label} className="col-6 col-md-3">
          <div className="card h-100" style={{ borderTop: `3px solid ${t.color}` }}>
            <div className="card-body py-3 d-flex align-items-center gap-3">
              <span className="d-flex align-items-center justify-content-center rounded-circle"
                style={{ width: 40, height: 40, background: `${t.color}1a`, color: t.color, flexShrink: 0 }}>
                <iconify-icon icon={t.icon} style={{ fontSize: 22 }} />
              </span>
              <div className="min-width-0">
                <div className="text-muted fs-12 text-uppercase fw-semibold" style={{ letterSpacing: '0.3px' }}>{t.label}</div>
                <div className="fw-bold czk-num text-truncate" style={{ fontSize: 16, lineHeight: 1.2 }}>{t.value}</div>
                {t.sub && <div className="text-muted fs-11">{t.sub}</div>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Form modal — nový / edit daňová platba
// ──────────────────────────────────────────────────────────────
function DanFormModal({ initial, onSave, onClose, onDelete }: {
  initial: Dan | null;
  onSave: (d: Dan) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}) {
  const isEdit = initial !== null;
  const defaults: Dan = initial ?? {
    id: `dn-new-${Date.now().toString().slice(-6)}`,
    typ: 'dph',
    obdobi: '',
    splatnost: '2026-06-19',
    castka: 0,
    stav: 'planovany',
    pravniEntita: 'con-gusto',
    ucetId: 'ua-hlavni',
    popis: '',
    poznamka: '',
  };
  const [form, setForm] = useState<Dan>(defaults);

  const handleChange = <K extends keyof Dan>(key: K, value: Dan[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canSave = form.popis?.trim() !== '' && form.castka > 0 && form.obdobi.trim() !== '';

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center gap-2">
                <iconify-icon icon={isEdit ? 'solar:pen-bold-duotone' : 'solar:add-square-bold-duotone'} style={{ fontSize: 22 }} />
                {isEdit ? 'Upravit daňovou platbu' : 'Nová daňová platba'}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Zavřít" />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Typ daně *</label>
                  <select className="form-select form-select-sm" value={form.typ}
                    onChange={(e) => handleChange('typ', e.target.value as DanTyp)}>
                    {Object.entries(DAN_TYP_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Právní entita (S.R.O.) *</label>
                  <select className="form-select form-select-sm" value={form.pravniEntita}
                    onChange={(e) => handleChange('pravniEntita', e.target.value as PravniEntitaDan)}>
                    {Object.entries(PRAVNI_ENTITA_DAN_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label fs-12 fw-semibold">Popis *</label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="např. DPH 2. kvartál 2026"
                    value={form.popis ?? ''} onChange={(e) => handleChange('popis', e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Období *</label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="např. 2026-Q2 nebo 2026"
                    value={form.obdobi} onChange={(e) => handleChange('obdobi', e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Splatnost *</label>
                  <input type="date" className="form-control form-control-sm"
                    value={form.splatnost} onChange={(e) => handleChange('splatnost', e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Částka (Kč) *</label>
                  <input type="number" className="form-control form-control-sm czk-num"
                    value={form.castka || ''}
                    onChange={(e) => handleChange('castka', parseFloat(e.target.value || '0'))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Stav</label>
                  <select className="form-select form-select-sm" value={form.stav}
                    onChange={(e) => handleChange('stav', e.target.value as DanStav)}>
                    {Object.entries(DAN_STAV_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Účet platby</label>
                  <select className="form-select form-select-sm"
                    value={form.ucetId ?? ''}
                    onChange={(e) => handleChange('ucetId', e.target.value || undefined)}>
                    <option value="">— nevybráno —</option>
                    {BANKA_UCTY.map((u) => (
                      <option key={u.id} value={u.id}>{u.nazev} ({u.mena})</option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label fs-12 fw-semibold">Provozovna (nepovinné)</label>
                  <select className="form-select form-select-sm"
                    value={form.provozovnaId ?? ''}
                    onChange={(e) => handleChange('provozovnaId', e.target.value || undefined)}>
                    <option value="">— Globálně (celá entita) —</option>
                    {PROVOZOVNY.filter((p) => p.status === 'active').map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label fs-12 fw-semibold">Poznámka</label>
                  <input type="text" className="form-control form-control-sm"
                    value={form.poznamka ?? ''} onChange={(e) => handleChange('poznamka', e.target.value)} />
                </div>
                <div className="col-12">
                  <label className="form-label fs-12 fw-semibold">Přiznání / dokument (PDF)</label>
                  <input type="file" className="form-control form-control-sm" accept=".pdf,.xlsx,.png,.jpg"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleChange('dokument', f.name);
                    }} />
                  {form.dokument && (
                    <div className="d-flex align-items-center gap-2 mt-2 p-2 border rounded" style={{ background: '#e8f6ed' }}>
                      <iconify-icon icon="solar:document-text-bold-duotone" style={{ fontSize: 18, color: '#0d6efd' }} />
                      <span className="fs-12 fw-semibold flex-grow-1 text-truncate">{form.dokument}</span>
                      <button type="button" className="btn btn-link btn-sm p-0 text-danger" title="Odebrat"
                        onClick={() => handleChange('dokument', undefined)}>
                        <iconify-icon icon="solar:trash-bin-trash-bold-duotone" style={{ fontSize: 14 }} />
                      </button>
                    </div>
                  )}
                  <div className="text-muted fs-11 mt-1">Mock — soubor se neukládá fyzicky.</div>
                </div>
              </div>
            </div>
            <div className="modal-footer d-flex justify-content-between">
              <div>
                {isEdit && onDelete && (
                  <button type="button" className="btn btn-outline-danger btn-sm"
                    onClick={() => {
                      if (confirm(`Opravdu smazat „${form.popis}"?`)) onDelete(form.id);
                    }}>
                    <iconify-icon icon="solar:trash-bin-trash-bold-duotone" className="me-1" />
                    Smazat
                  </button>
                )}
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-light btn-sm" onClick={onClose}>Zrušit</button>
                <button type="button" className="btn btn-primary btn-sm" disabled={!canSave} onClick={() => onSave(form)}>
                  <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                  {isEdit ? 'Uložit změny' : 'Vytvořit'}
                </button>
              </div>
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
export default function DaneView({ state }: Props) {
  const { selectedProvozovna } = state;
  const [search, setSearch]           = useState('');
  const [typFilter, setTypFilter]     = useState<DanTyp | 'all'>('all');
  const [stavFilter, setStavFilter]   = useState<DanStav | 'all'>('all');
  const [entitaFilter, setEntitaFilter] = useState<PravniEntitaDan | 'all'>('all');
  const [obdobiFilter, setObdobiFilter] = useState('');

  // Local session changes
  const [localDane, setLocalDane] = useState<Record<string, Dan>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [formState, setFormState] = useState<{ initial: Dan | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const merged: Dan[] = useMemo(() => {
    const map = new Map<string, Dan>();
    DANE.forEach((d) => map.set(d.id, d));
    Object.values(localDane).forEach((d) => map.set(d.id, d));
    return Array.from(map.values()).filter((d) => !deletedIds.has(d.id));
  }, [localDane, deletedIds]);

  const filtered = useMemo(() => {
    return merged.filter((d) => {
      // Filter podle topbar provozovny
      if (selectedProvozovna !== 'all') {
        if (d.provozovnaId) {
          if (d.provozovnaId !== selectedProvozovna) return false;
        } else {
          // Pokud nemá provozovnu, ale má účet, zkontroluj jestli účet patří k provozovně
          const ucet = BANKA_UCTY.find((u) => u.id === d.ucetId);
          if (ucet && !ucet.provozovny.includes(selectedProvozovna)) return false;
        }
      }
      if (typFilter !== 'all'    && d.typ !== typFilter)         return false;
      if (stavFilter !== 'all'   && d.stav !== stavFilter)       return false;
      if (entitaFilter !== 'all' && d.pravniEntita !== entitaFilter) return false;
      if (obdobiFilter && !d.obdobi.includes(obdobiFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!d.popis?.toLowerCase().includes(q) && !d.obdobi.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.splatnost.localeCompare(a.splatnost));
  }, [merged, selectedProvozovna, typFilter, stavFilter, entitaFilter, obdobiFilter, search]);

  const handleSave = (d: Dan) => {
    setLocalDane((prev) => ({ ...prev, [d.id]: d }));
    const isNew = formState?.initial === null;
    setFormState(null);
    setToast(isNew ? `Daňová platba „${d.popis}" vytvořena` : `Daňová platba „${d.popis}" upravena`);
  };

  const handleDelete = (id: string) => {
    setDeletedIds((prev) => new Set(prev).add(id));
    setFormState(null);
    setToast('Daňová platba smazána');
  };

  const handleImport = () => {
    setToast('Mock: Importováno 12 daňových plateb (CSV/XLSX)');
  };
  const handleExport = () => {
    setToast('Mock: Report exportován do XLSX (k odeslání účetnímu)');
  };

  return (
    <>
      <KpiStrip data={merged} />

      <div className="card">
        <div className="card-header">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h5 className="card-title mb-0">
              Daňové platby
              <small className="text-muted fw-normal ms-2 fs-13">
                {filtered.length} {filtered.length === 1 ? 'platba' : filtered.length < 5 ? 'platby' : 'plateb'} ·
                suma {fCzk(Math.round(filtered.reduce((s, d) => s + d.castka, 0)))}
              </small>
            </h5>
            <div className="ms-auto d-flex gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={handleImport}
                title="Mock: import dat z účetního systému (CSV/XLSX)">
                <iconify-icon icon="solar:download-bold-duotone" className="me-1" />
                Import dat
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={handleExport}
                title="Mock: export oficiálního reportu (XLSX)">
                <iconify-icon icon="solar:upload-bold-duotone" className="me-1" />
                Export reportu
              </button>
              <button className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                onClick={() => setFormState({ initial: null })}>
                <iconify-icon icon="solar:add-square-bold-duotone" />
                Nová platba
              </button>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
            <div className="position-relative" style={{ width: 220 }}>
              <iconify-icon icon="solar:magnifer-bold-duotone"
                style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9097a7' }} />
              <input type="text" className="form-control form-control-sm w-100"
                placeholder="Hledat popis / období…" value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 28 }} />
            </div>
            <select className="form-select form-select-sm" style={{ width: 'auto' }}
              value={typFilter} onChange={(e) => setTypFilter(e.target.value as DanTyp | 'all')}>
              <option value="all">Všechny typy</option>
              {Object.entries(DAN_TYP_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select className="form-select form-select-sm" style={{ width: 'auto' }}
              value={entitaFilter} onChange={(e) => setEntitaFilter(e.target.value as PravniEntitaDan | 'all')}>
              <option value="all">Všechny entity</option>
              {Object.entries(PRAVNI_ENTITA_DAN_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select className="form-select form-select-sm" style={{ width: 'auto' }}
              value={stavFilter} onChange={(e) => setStavFilter(e.target.value as DanStav | 'all')}>
              <option value="all">Všechny stavy</option>
              {Object.entries(DAN_STAV_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <input type="text" className="form-control form-control-sm" style={{ width: 120 }}
              placeholder="Období"
              value={obdobiFilter} onChange={(e) => setObdobiFilter(e.target.value)}
              title="Filtr na konkrétní období (např. 2026 nebo 2026-Q2)" />
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover table-centered mb-0" style={{ fontSize: 12 }}>
            <thead className="table-light">
              <tr>
                <th>Typ</th>
                <th>Popis</th>
                <th>Období</th>
                <th>Entita</th>
                <th>Splatnost</th>
                <th className="text-end">Částka</th>
                <th>Stav</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-4 text-muted">Žádné platby nesplňují filtr</td></tr>
              )}
              {filtered.map((d) => {
                const typM = DAN_TYP_META[d.typ];
                const stavM = DAN_STAV_META[d.stav];
                return (
                  <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => setFormState({ initial: d })}>
                    <td>
                      <span className="badge d-inline-flex align-items-center gap-1"
                        style={{ background: typM.bg, color: typM.color, fontSize: 10 }}>
                        <iconify-icon icon={typM.icon} style={{ fontSize: 11 }} />
                        {typM.short}
                      </span>
                    </td>
                    <td>
                      <div className="fw-semibold">{d.popis}</div>
                      {d.dokument && (
                        <div className="text-muted" style={{ fontSize: 10 }}>
                          <iconify-icon icon="solar:document-text-bold-duotone" className="me-1" />
                          {d.dokument}
                        </div>
                      )}
                    </td>
                    <td className="czk-num">{d.obdobi}</td>
                    <td className="text-muted fs-11">{PRAVNI_ENTITA_DAN_LABEL[d.pravniEntita]}</td>
                    <td className="czk-num">{fDate(d.splatnost)}</td>
                    <td className="text-end czk-num fw-bold text-danger">−{fCzk(d.castka)}</td>
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

      {formState && (
        <DanFormModal
          initial={formState.initial}
          onSave={handleSave}
          onClose={() => setFormState(null)}
          onDelete={handleDelete}
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
