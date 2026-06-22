// COMPONENT: Poplatky — sekce Finance → Poplatky (Phase 5)
// Per zápis 4. 6. 2026: bankovní poplatky jako celofiremní náklad,
// auto-detekce z bank. transakcí, měsíční souhrny + breakdown po typech.

import { useState, useMemo, useEffect } from 'react';
import type { AppState } from '../types';
import {
  POPLATKY,
  POPLATKY_TYP_META,
  getMesicniSouhrn,
  getSumaZaObdobi,
  getBreakdownPoTypech,
  type Poplatek,
  type PoplatekTyp,
} from '../poplatkyData';
import { BANKA_UCTY } from '../bankaData';
import { fCzk, fDate, PROVOZOVNY } from '../data';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

// ──────────────────────────────────────────────────────────────
// KPI strip — celkem / aktuální měsíc / průměr / nejdražší typ
// ──────────────────────────────────────────────────────────────
function KpiStrip({ data }: { data: Poplatek[] }) {
  const tenMonth = '2026-06';
  const lastMonth = '2026-05';

  const sumaTento  = getSumaZaObdobi(data, tenMonth, tenMonth);
  const sumaMinuly = getSumaZaObdobi(data, lastMonth, lastMonth);
  const trendPct   = sumaMinuly > 0 ? ((sumaTento - sumaMinuly) / sumaMinuly) * 100 : 0;
  const trendIsUp  = trendPct > 0;

  const souhrny = getMesicniSouhrn(data);
  const prumer = souhrny.length > 0 ? souhrny.reduce((s, m) => s + m.celkem, 0) / souhrny.length : 0;

  const breakdown = getBreakdownPoTypech(data);
  const nejdrazsi = breakdown[0];

  type Tile = { label: string; value: string; sub?: string; icon: string; color: string };
  const tiles: Tile[] = [
    { label: 'Tento měsíc (červen)', value: fCzk(Math.round(sumaTento)),
      sub: trendPct !== 0 ? `${trendIsUp ? '↑' : '↓'} ${Math.abs(trendPct).toFixed(1)} % vs. minulý` : 'beze změny',
      icon: 'solar:calendar-bold-duotone', color: '#0d6efd' },
    { label: 'Průměr/měsíc',         value: fCzk(Math.round(prumer)), sub: `${souhrny.length} měsíců`,
      icon: 'solar:graph-bold-duotone', color: '#198754' },
    { label: 'Nejdražší typ',        value: nejdrazsi ? POPLATKY_TYP_META[nejdrazsi.typ].label : '—',
      sub: nejdrazsi ? `${fCzk(Math.round(nejdrazsi.castka))} (${nejdrazsi.pct.toFixed(0)} %)` : '',
      icon: 'solar:tag-price-bold-duotone', color: '#fd7e14' },
    { label: 'Záznamů celkem',       value: String(data.length), sub: `napříč ${souhrny.length} měsíci`,
      icon: 'solar:document-text-bold-duotone', color: '#6f42c1' },
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
// Breakdown po typech — horizontální barbar
// ──────────────────────────────────────────────────────────────
// Phase 7 (zápis 12. 6. 2026) — kartičky/štítky místo měsíčního souhrnu.
// Každý typ poplatku je samostatná klikatelná karta s ikonou, sumou, podílem.
function TypeBreakdown({ data, activeTyp, onSetTyp }: { data: Poplatek[]; activeTyp: PoplatekTyp | 'all'; onSetTyp: (t: PoplatekTyp | 'all') => void }) {
  const breakdown = getBreakdownPoTypech(data);
  if (breakdown.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex align-items-center gap-2">
          <iconify-icon icon="solar:widget-2-bold-duotone" style={{ fontSize: 18, color: '#0d6efd' }} />
          <h5 className="mb-0">Poplatky podle typu</h5>
          <span className="text-muted fs-12 d-none d-md-inline">Klikni na kartu pro filtraci tabulky</span>
        </div>
        {activeTyp !== 'all' && (
          <button className="btn btn-link btn-sm p-0 text-muted" style={{ fontSize: 12 }} onClick={() => onSetTyp('all')}>
            Zrušit filtr ×
          </button>
        )}
      </div>
      <div className="row g-2">
        {breakdown.map((b) => {
          const meta = POPLATKY_TYP_META[b.typ];
          const isActive = activeTyp === b.typ;
          return (
            <div key={b.typ} className="col-6 col-md-4 col-lg-3 col-xl-2">
              <button
                onClick={() => onSetTyp(isActive ? 'all' : b.typ)}
                className={`wq-card w-100 d-flex flex-column gap-1 px-3 py-3 rounded-3 ${isActive ? 'shadow-sm' : ''}`}
                style={{
                  background: isActive ? meta.color : '#ffffff',
                  color: isActive ? '#ffffff' : '#212529',
                  border: '1px solid ' + (isActive ? meta.color : '#e9ecef'),
                  borderTop: `3px solid ${meta.color}`,
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minHeight: 110,
                }}>
                <div className="d-flex align-items-center justify-content-between">
                  <span
                    className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                    style={{
                      width: 32, height: 32,
                      background: isActive ? 'rgba(255,255,255,0.22)' : meta.bg,
                      color: isActive ? '#ffffff' : meta.color,
                    }}>
                    <iconify-icon icon={meta.icon} style={{ fontSize: 18 }} />
                  </span>
                  <span className="czk-num fw-semibold fs-11" style={{ opacity: isActive ? 0.95 : 0.55 }}>{b.pct.toFixed(0)} %</span>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.3, color: isActive ? 'rgba(255,255,255,0.95)' : '#6c757d' }}>
                  {meta.label}
                </div>
                <div className="d-flex align-items-baseline gap-1 mt-auto">
                  <span className="czk-num fw-bold" style={{ fontSize: 16, whiteSpace: 'nowrap' }}>{fCzk(Math.round(b.castka))}</span>
                </div>
                <div style={{ fontSize: 10, opacity: isActive ? 0.85 : 0.6 }}>
                  {b.pocet} {b.pocet === 1 ? 'záznam' : b.pocet < 5 ? 'záznamy' : 'záznamů'}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Tabulka poplatků
// ──────────────────────────────────────────────────────────────
function PoplatkyTable({ data, ucty, search, setSearch, typFilter, setTypFilter, ucetFilter, setUcetFilter, mesicFilter, setMesicFilter, onClearFilters, onNew, onEdit }: {
  data: Poplatek[];
  ucty: typeof BANKA_UCTY;
  search: string;
  setSearch: (s: string) => void;
  typFilter: PoplatekTyp | 'all';
  setTypFilter: (t: PoplatekTyp | 'all') => void;
  ucetFilter: string;
  setUcetFilter: (s: string) => void;
  mesicFilter: string;
  setMesicFilter: (s: string) => void;
  onClearFilters: () => void;
  onNew: () => void;
  onEdit: (p: Poplatek) => void;
}) {
  const hasAnyFilter = !!(search || typFilter !== 'all' || ucetFilter !== 'all' || mesicFilter);
  return (
    <div className="card">
      <div className="card-header">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <h5 className="card-title mb-0">
            Poplatky
            <small className="text-muted fw-normal ms-2 fs-13">
              {data.length} {data.length === 1 ? 'záznam' : data.length < 5 ? 'záznamy' : 'záznamů'} ·
              suma {fCzk(Math.round(data.reduce((s, p) => s + p.castka, 0)))}
            </small>
          </h5>
          {/* Phase 8.9 (zápis 22. 6. 2026) — CTA "Nový poplatek" odebráno. Poplatky se evidují
              automaticky z Banky (přes detectTransType → "Bankovní poplatek" / "Úrok") + případně
              z manuálního označení transakce v Banka side-panelu. Žádný manuální vstup zde. */}
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
          <div className="position-relative" style={{ width: 220 }}>
            <iconify-icon icon="solar:magnifer-bold-duotone"
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9097a7' }} />
            <input type="text" className="form-control form-control-sm w-100"
              placeholder="Hledat popis…" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 28 }} />
          </div>
          <select className="form-select form-select-sm" style={{ width: 'auto' }}
            value={typFilter} onChange={(e) => setTypFilter(e.target.value as PoplatekTyp | 'all')}>
            <option value="all">Všechny typy</option>
            {Object.entries(POPLATKY_TYP_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select className="form-select form-select-sm" style={{ width: 'auto', maxWidth: 220 }}
            value={ucetFilter} onChange={(e) => setUcetFilter(e.target.value)}>
            <option value="all">Všechny účty</option>
            {ucty.map((u) => (
              <option key={u.id} value={u.id}>{u.nazev}</option>
            ))}
          </select>
          <input type="month" className="form-control form-control-sm" style={{ width: 'auto' }}
            value={mesicFilter} onChange={(e) => setMesicFilter(e.target.value)} title="Filtr na konkrétní měsíc" />
          {hasAnyFilter && (
            <button className="btn btn-outline-danger btn-sm ms-auto" onClick={onClearFilters} style={{ fontSize: 12 }}>
              <iconify-icon icon="solar:eraser-bold-duotone" className="me-1" />
              Vyčistit filtry
            </button>
          )}
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-centered table-nowrap mb-0" style={{ fontSize: 12 }}>
          <thead className="table-light">
            <tr>
              <th>Datum</th>
              <th>Typ</th>
              <th>Popis</th>
              <th>Účet</th>
              <th>Banka</th>
              <th className="text-end">Částka</th>
              <th>Detekce</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Žádné poplatky nesplňují filtr</td></tr>
            )}
            {data.map((p) => {
              const ucet = ucty.find((u) => u.id === p.ucetId);
              const typM = POPLATKY_TYP_META[p.typ];
              return (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => onEdit(p)}>
                  <td className="czk-num">{fDate(p.datum)}</td>
                  <td>
                    <span className="badge d-inline-flex align-items-center gap-1"
                      style={{ background: typM.bg, color: typM.color, fontSize: 10 }}>
                      <iconify-icon icon={typM.icon} style={{ fontSize: 11 }} />
                      {typM.label}
                    </span>
                  </td>
                  <td>{p.popis}</td>
                  <td>
                    <div className="fw-semibold">{ucet?.nazev ?? '—'}</div>
                    {ucet && <div className="text-muted czk-num" style={{ fontSize: 10 }}>{ucet.iban.slice(0, 12)}…</div>}
                  </td>
                  <td className="text-muted">{p.banka}</td>
                  <td className="text-end czk-num fw-bold text-danger">
                    −{fCzk(p.castka)}
                  </td>
                  <td>
                    {p.auto ? (
                      <span className="badge bg-info-subtle text-info" style={{ fontSize: 10 }} title="Auto-detekováno z bankovní transakce">
                        <iconify-icon icon="solar:bolt-bold-duotone" className="me-1" style={{ fontSize: 10 }} />
                        Auto
                      </span>
                    ) : (
                      <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 10 }}>
                        Manuální
                      </span>
                    )}
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
// Modal: nový / editace poplatku
// ──────────────────────────────────────────────────────────────
function PoplatekFormModal({ initial, ucty, onSave, onClose, onDelete }: {
  initial: Poplatek | null;
  ucty: typeof BANKA_UCTY;
  onSave: (p: Poplatek) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}) {
  const isEdit = initial !== null;
  const today = '2026-06-18';
  const defaults: Poplatek = initial ?? {
    id: `pp-new-${Date.now().toString().slice(-6)}`,
    datum: today,
    ucetId: ucty[0]?.id ?? '',
    banka: ucty[0]?.banka ?? '',
    typ: 'vedeni-uctu',
    popis: '',
    castka: 0,
    auto: false,
    provozovnaId: undefined,   // Phase 7 — defaultně globálně Con Gusto
    poznamka: '',
  };
  const [form, setForm] = useState<Poplatek>(defaults);

  const handleChange = <K extends keyof Poplatek>(key: K, value: Poplatek[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Pokud měníme účet, auto-sync banky
      if (key === 'ucetId') {
        const u = ucty.find((x) => x.id === value);
        if (u) next.banka = u.banka;
      }
      return next;
    });
  };

  const canSave = form.popis.trim() !== '' && form.castka > 0 && form.ucetId !== '';

  return (
    <>
      <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} onClick={onClose} />
      <div className="modal fade show d-block" style={{ zIndex: 1060 }} tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title d-flex align-items-center gap-2">
                <iconify-icon icon={isEdit ? 'solar:pen-bold-duotone' : 'solar:add-square-bold-duotone'} style={{ fontSize: 22 }} />
                {isEdit ? 'Upravit poplatek' : 'Nový poplatek'}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Zavřít" />
            </div>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Datum *</label>
                  <input type="date" className="form-control form-control-sm"
                    value={form.datum} onChange={(e) => handleChange('datum', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label fs-12 fw-semibold">Typ *</label>
                  <select className="form-select form-select-sm" value={form.typ}
                    onChange={(e) => handleChange('typ', e.target.value as PoplatekTyp)}>
                    {Object.entries(POPLATKY_TYP_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label fs-12 fw-semibold">Popis *</label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="např. Vedení účtu — červen 2026"
                    value={form.popis} onChange={(e) => handleChange('popis', e.target.value)} />
                </div>
                <div className="col-md-8">
                  <label className="form-label fs-12 fw-semibold">Účet *</label>
                  <select className="form-select form-select-sm" value={form.ucetId}
                    onChange={(e) => handleChange('ucetId', e.target.value)}>
                    {ucty.map((u) => (
                      <option key={u.id} value={u.id}>{u.nazev} ({u.mena}) — {u.banka}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-12 fw-semibold">Částka (Kč) *</label>
                  <input type="number" inputMode="decimal" step="0.01" className="form-control form-control-sm czk-num"
                    placeholder="0" value={form.castka || ''}
                    onChange={(e) => handleChange('castka', parseFloat(e.target.value || '0'))} />
                </div>
                <div className="col-12">
                  <label className="form-label fs-12 fw-semibold">Provozovna (nepovinné)</label>
                  <select className="form-select form-select-sm"
                    value={form.provozovnaId ?? ''}
                    onChange={(e) => handleChange('provozovnaId', e.target.value || undefined)}>
                    <option value="">— Globálně (celé Con Gusto) —</option>
                    {PROVOZOVNY.filter((p) => p.status === 'active').map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="text-muted fs-11 mt-1">
                    Pokud poplatek není konkrétně provozovny (vedení účtu firmy atp.), nech globálně.
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label fs-12 fw-semibold">Poznámka</label>
                  <input type="text" className="form-control form-control-sm"
                    placeholder="Volitelný komentář"
                    value={form.poznamka ?? ''} onChange={(e) => handleChange('poznamka', e.target.value)} />
                </div>
                {form.auto && (
                  <div className="col-12">
                    <div className="alert alert-info py-2 mb-0 fs-12 d-flex align-items-center gap-2">
                      <iconify-icon icon="solar:bolt-bold-duotone" style={{ fontSize: 16 }} />
                      <span>Tento poplatek byl <strong>auto-detekován</strong> z bankovní transakce. Při editaci se převede na manuální.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer d-flex justify-content-between">
              <div>
                {isEdit && onDelete && (
                  <button type="button" className="btn btn-outline-danger btn-sm"
                    onClick={() => {
                      if (confirm(`Opravdu smazat poplatek „${form.popis}"?`)) {
                        onDelete(form.id);
                      }
                    }}>
                    <iconify-icon icon="solar:trash-bin-trash-bold-duotone" className="me-1" />
                    Smazat
                  </button>
                )}
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-light btn-sm" onClick={onClose}>Zrušit</button>
                <button type="button" className="btn btn-primary btn-sm" disabled={!canSave}
                  onClick={() => onSave({ ...form, auto: false })}>
                  <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                  {isEdit ? 'Uložit změny' : 'Vytvořit poplatek'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Phase 7 (zápis 12. 6. 2026) — měsíční souhrny jako horizontální chip-strip
// (předtím byly v pravém sloupci jako vertikální cards)
function MesicniChips({ data, mesicFilter, onSetMesic }: { data: Poplatek[]; mesicFilter: string; onSetMesic: (s: string) => void }) {
  const souhrny = getMesicniSouhrn(data);
  return (
    <div className="card mb-3">
      <div className="card-body py-2 px-3">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <iconify-icon icon="solar:calendar-bold-duotone" style={{ fontSize: 14, color: '#0d6efd' }} />
          <span className="fw-semibold fs-12 text-uppercase" style={{ letterSpacing: '0.3px' }}>Měsíční přehled</span>
          <div className="d-flex gap-1 flex-wrap ms-2">
            {souhrny.map((s) => {
              const isActive = mesicFilter === s.mesic;
              return (
                <button key={s.mesic}
                  type="button"
                  onClick={() => onSetMesic(isActive ? '' : s.mesic)}
                  className={`badge border-0 d-inline-flex align-items-center gap-2 ${isActive ? 'bg-primary text-white' : 'bg-light text-dark border'}`}
                  style={{
                    fontSize: 11, cursor: 'pointer', padding: '6px 10px',
                    border: isActive ? undefined : '1px solid #dee2e6',
                  }}
                  title={`${s.pocet} záznamů`}>
                  <span style={{ whiteSpace: 'nowrap' }}>{s.label}</span>
                  <span className="czk-num fw-bold" style={{ whiteSpace: 'nowrap', opacity: isActive ? 0.95 : 0.7 }}>−{fCzk(Math.round(s.celkem))}</span>
                </button>
              );
            })}
          </div>
          {mesicFilter && (
            <button className="btn btn-link btn-sm p-0 ms-auto text-muted" style={{ fontSize: 12 }} onClick={() => onSetMesic('')}>
              Zrušit filtr ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main view
// ──────────────────────────────────────────────────────────────
export default function PoplatkyView({ state }: Props) {
  const { selectedProvozovna } = state;
  const [search, setSearch] = useState('');
  const [typFilter, setTypFilter]     = useState<PoplatekTyp | 'all'>('all');
  const [ucetFilter, setUcetFilter]   = useState('all');
  const [mesicFilter, setMesicFilter] = useState(''); // YYYY-MM
  // Phase 7 — lokální session změny + nové poplatky
  const [localPoplatky, setLocalPoplatky] = useState<Record<string, Poplatek>>({});
  const [deletedIds, setDeletedIds]       = useState<Set<string>>(new Set());
  const [formState, setFormState] = useState<{ initial: Poplatek | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Sloučená data — defaults + edits + new minus deleted
  const merged: Poplatek[] = useMemo(() => {
    const map = new Map<string, Poplatek>();
    POPLATKY.forEach((p) => map.set(p.id, p));
    Object.values(localPoplatky).forEach((p) => map.set(p.id, p));
    return Array.from(map.values()).filter((p) => !deletedIds.has(p.id));
  }, [localPoplatky, deletedIds]);

  const filtered = useMemo(() => {
    return merged.filter((p) => {
      // Phase 7 — filtr podle topbar provozovny (per zápis 12. 6. 2026):
      // pokud poplatek má explicitní provozovnaId, použij ho; jinak filtruj podle účtu.
      if (selectedProvozovna !== 'all') {
        if (p.provozovnaId) {
          if (p.provozovnaId !== selectedProvozovna) return false;
        } else {
          // Najdi účet, jestli patří k vybrané provozovně
          const ucet = BANKA_UCTY.find((u) => u.id === p.ucetId);
          if (ucet && !ucet.provozovny.includes(selectedProvozovna)) return false;
        }
      }
      if (typFilter !== 'all'  && p.typ !== typFilter)   return false;
      if (ucetFilter !== 'all' && p.ucetId !== ucetFilter) return false;
      if (mesicFilter && p.datum.slice(0, 7) !== mesicFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.popis.toLowerCase().includes(q) && !p.banka.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.datum.localeCompare(a.datum));
  }, [merged, selectedProvozovna, typFilter, ucetFilter, mesicFilter, search]);

  const handleSave = (p: Poplatek) => {
    setLocalPoplatky((prev) => ({ ...prev, [p.id]: p }));
    const isNew = formState?.initial === null;
    setFormState(null);
    setToast(isNew ? `Poplatek „${p.popis}" vytvořen` : `Poplatek „${p.popis}" upraven`);
  };

  const handleDelete = (id: string) => {
    setDeletedIds((prev) => new Set(prev).add(id));
    setFormState(null);
    setToast('Poplatek smazán');
  };

  return (
    <>
      <KpiStrip data={merged} />
      <MesicniChips data={merged} mesicFilter={mesicFilter} onSetMesic={setMesicFilter} />
      <PoplatkyTable
        data={filtered} ucty={BANKA_UCTY}
        search={search} setSearch={setSearch}
        typFilter={typFilter} setTypFilter={setTypFilter}
        ucetFilter={ucetFilter} setUcetFilter={setUcetFilter}
        mesicFilter={mesicFilter} setMesicFilter={setMesicFilter}
        onClearFilters={() => {
          setSearch(''); setTypFilter('all'); setUcetFilter('all'); setMesicFilter('');
        }}
        onNew={() => setFormState({ initial: null })}
        onEdit={(p) => setFormState({ initial: p })}
      />

      {formState && (
        <PoplatekFormModal
          initial={formState.initial} ucty={BANKA_UCTY}
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
