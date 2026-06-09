// COMPONENT: Generická view pro platební platformu (Qerko / GoPay / Sodexo)
// SOURCE: Larkon table/card pattern
// CUSTOM:
//  - rozdělení po provozovnách (per zápis 4. 6. 2026 — sladění s cashflow)
//  - „Příchozí platba je net (po provizi)" → skutečný poplatek se počítá zpětně z rozdílu

import { useState, useMemo } from 'react';
import {
  PLATFORMS,
  getDataForPlatforma,
  PAR_STAV_META,
  FAKT_STAV_META,
  type PlatformaId,
  type DenniParovani,
} from '../paymentPlatformsData';
import { BANKA_UCTY } from '../bankaData';
import { fCzk, fDate, PROVOZOVNY } from '../data';

interface Props {
  platforma: PlatformaId;
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function getProvNazev(provId?: string): string {
  if (!provId) return 'Nepřiřazeno';
  return PROVOZOVNY.find((p) => p.id === provId)?.shortName ?? provId;
}
function getProvColor(provId?: string): string {
  if (!provId) return '#9097a7';
  return PROVOZOVNY.find((p) => p.id === provId)?.color ?? '#9097a7';
}
// Skutečný poplatek = tržba POS − příchozí
function skutecnyPoplatek(d: DenniParovani): number | null {
  if (d.prislo === null) return null;
  return d.trzbaPos - d.prislo;
}
// Odchylka odhadu od skutečnosti
function odchylkaOdhadu(d: DenniParovani): number | null {
  const skut = skutecnyPoplatek(d);
  if (skut === null) return null;
  return d.poplatekOdhad - skut;   // > 0 = odhad vyšší než skutečnost
}

// ──────────────────────────────────────────────────────────────
// Header
// ──────────────────────────────────────────────────────────────
function PlatformHeader({ platforma }: { platforma: PlatformaId }) {
  const cfg = PLATFORMS[platforma];
  const ucet = BANKA_UCTY.find((u) => u.id === cfg.ucetCilovy);
  return (
    <div className="card mb-3" style={{ borderTop: `3px solid ${cfg.color}` }}>
      <div className="card-body py-3 d-flex align-items-center gap-3 flex-wrap">
        <span className="d-flex align-items-center justify-content-center rounded-circle"
          style={{ width: 56, height: 56, background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
          <iconify-icon icon={cfg.icon} style={{ fontSize: 32 }} />
        </span>
        <div className="flex-grow-1 min-width-0">
          <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
            <h4 className="mb-0">{cfg.nazev}</h4>
            <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 10 }}>{cfg.ciselnyKod}</span>
            {cfg.apiDostupne ? (
              <span className="badge bg-success-subtle text-success" style={{ fontSize: 10 }}>
                <iconify-icon icon="solar:bolt-bold-duotone" className="me-1" style={{ fontSize: 10 }} />
                API automaticky
              </span>
            ) : (
              <span className="badge bg-warning-subtle text-warning" style={{ fontSize: 10 }}>
                <iconify-icon icon="solar:upload-bold-duotone" className="me-1" style={{ fontSize: 10 }} />
                Manuální import
              </span>
            )}
          </div>
          <div className="text-muted fs-12">{cfg.popis}</div>
          <div className="d-flex align-items-center gap-3 mt-2 flex-wrap">
            <div className="fs-12">
              <span className="text-muted">Účet pro příjmy:</span> <strong>{ucet?.nazev}</strong>
            </div>
            <div className="fs-12">
              <span className="text-muted">Provize:</span> <strong className="czk-num">≈ {cfg.poplatekPctOdhad.toFixed(1)} %</strong>
            </div>
            <div className="fs-12">
              <span className="text-muted">Zpoždění:</span> <strong>D+{cfg.parovaniZpozdeniDni}</strong>
            </div>
            <div className="fs-12">
              <span className="text-muted">Provozovny:</span> <strong>{cfg.provozovny.length}</strong>
            </div>
          </div>
          <div className="text-muted fs-11 mt-1">
            Metody: {cfg.podporovaneMetody.join(' · ')}
          </div>
        </div>
        {!cfg.apiDostupne && (
          <button className="btn btn-warning btn-sm d-flex align-items-center gap-2" title="Mock — bez backendu">
            <iconify-icon icon="solar:upload-bold-duotone" />
            Importovat data (CSV/XLSX)
          </button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// KPI strip — používá skutečný poplatek tam kde známe
// ──────────────────────────────────────────────────────────────
function KpiStrip({ platforma, denni }: { platforma: PlatformaId; denni: DenniParovani[] }) {
  const cfg = PLATFORMS[platforma];
  const tenMonth = '2026-06';
  const tenni = denni.filter((d) => d.datum.slice(0, 7) === tenMonth);
  const prijmyTentoMesic = tenni.reduce((s, d) => s + d.trzbaPos, 0);
  // Poplatek = skutečný (kde máme) jinak odhad
  const poplatkyTentoMesic = tenni.reduce((s, d) => {
    const skut = skutecnyPoplatek(d);
    return s + (skut !== null ? skut : d.poplatekOdhad);
  }, 0);
  const marzePct = prijmyTentoMesic > 0 ? (1 - poplatkyTentoMesic / prijmyTentoMesic) * 100 : 0;
  const nesparovane = denni.filter((d) => d.stav === 'ceka-na-D1' || d.stav === 'neprislo').length;
  const rozdily     = denni.filter((d) => d.stav === 'rozdil' || d.stav === 'neprislo').length;
  const nepriraz    = denni.filter((d) => !d.provozovnaId).length;

  type Tile = { label: string; value: string; sub?: string; icon: string; color: string };
  const tiles: Tile[] = [
    { label: 'Příjmy v červnu (hrubá)', value: fCzk(Math.round(prijmyTentoMesic)),
      sub: `čistá ${fCzk(Math.round(prijmyTentoMesic - poplatkyTentoMesic))}`,
      icon: 'solar:dollar-minimalistic-bold-duotone', color: cfg.color },
    { label: 'Provize červen', value: `−${fCzk(Math.round(poplatkyTentoMesic))}`,
      sub: `≈ ${cfg.poplatekPctOdhad} % (skutečné po spárování)`,
      icon: 'solar:tag-price-bold-duotone', color: '#dc3545' },
    { label: 'Marže (po provizi)', value: `${marzePct.toFixed(1)} %`,
      sub: 'čistý příjem / hrubá tržba',
      icon: 'solar:graph-up-bold-duotone', color: '#198754' },
    { label: 'K vyřešení', value: String(rozdily + nesparovane + nepriraz),
      sub: `${nesparovane} čeká · ${rozdily} rozdíl · ${nepriraz} bez provoz`,
      icon: 'solar:danger-triangle-bold-duotone', color: rozdily + nesparovane + nepriraz > 0 ? '#dc3545' : '#9097a7' },
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
// Per-provozovna breakdown — měsíční souhrny per venue
// ──────────────────────────────────────────────────────────────
function VenueBreakdown({ platforma, denni, activeProv, onSetProv }: {
  platforma: PlatformaId; denni: DenniParovani[];
  activeProv: string;
  onSetProv: (id: string) => void;
}) {
  const cfg = PLATFORMS[platforma];
  const tenMonth = '2026-06';
  const tenni = denni.filter((d) => d.datum.slice(0, 7) === tenMonth);

  // Sumy per provozovna
  const rows = cfg.provozovny.map((provId) => {
    const own = tenni.filter((d) => d.provozovnaId === provId);
    const trzba = own.reduce((s, d) => s + d.trzbaPos, 0);
    const poplatek = own.reduce((s, d) => {
      const skut = skutecnyPoplatek(d);
      return s + (skut !== null ? skut : d.poplatekOdhad);
    }, 0);
    return { provId, trzba, poplatek, cisty: trzba - poplatek, pocet: own.length };
  }).sort((a, b) => b.trzba - a.trzba);

  // Nepřiřazené sumy
  const unassigned = tenni.filter((d) => !d.provozovnaId);
  const unassignedTrzba = unassigned.reduce((s, d) => s + d.trzbaPos, 0);

  const allCelkem = rows.reduce((s, r) => s + r.trzba, 0);

  return (
    <div className="card mb-3">
      <div className="card-header py-2">
        <div className="d-flex align-items-center gap-2">
          <iconify-icon icon="solar:buildings-3-bold-duotone" style={{ fontSize: 14, color: cfg.color }} />
          <div className="fw-semibold fs-13">Rozdělení po provozovnách (červen)</div>
          <span className="text-muted fs-11 d-none d-md-inline">Klikni pro filtraci tabulky</span>
          {activeProv && (
            <button className="btn btn-link btn-sm p-0 ms-auto text-muted" style={{ fontSize: 12 }} onClick={() => onSetProv('')}>
              Zrušit filtr ×
            </button>
          )}
        </div>
      </div>
      <div className="card-body py-2">
        <div className="d-flex flex-column gap-1">
          {rows.map((r) => {
            const meta = PROVOZOVNY.find((p) => p.id === r.provId);
            const isActive = activeProv === r.provId;
            const pct = allCelkem > 0 ? (r.trzba / allCelkem) * 100 : 0;
            return (
              <button key={r.provId}
                onClick={() => onSetProv(isActive ? '' : r.provId)}
                className="d-flex align-items-center gap-2 py-1 px-2 rounded border-0 text-start w-100"
                style={{ background: isActive ? `${meta?.color}26` : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
                <span className="rounded-circle flex-shrink-0" style={{ width: 10, height: 10, background: meta?.color ?? '#9097a7', display: 'inline-block' }} />
                <div style={{ width: 130, flexShrink: 0 }} className="fs-12 fw-semibold text-truncate">{meta?.shortName ?? r.provId}</div>
                <div className="flex-grow-1 position-relative" style={{ height: 6, background: '#f1f3f5', borderRadius: 3 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: meta?.color ?? cfg.color, borderRadius: 3 }} />
                </div>
                <div className="d-flex align-items-center gap-2" style={{ width: 240, justifyContent: 'flex-end' }}>
                  <span className="czk-num fw-semibold fs-12" style={{ whiteSpace: 'nowrap' }}>{fCzk(Math.round(r.trzba))}</span>
                  <span className="text-muted fs-11 czk-num" style={{ whiteSpace: 'nowrap' }}>−{fCzk(Math.round(r.poplatek))}</span>
                  <span className="text-success fw-semibold fs-12 czk-num" style={{ whiteSpace: 'nowrap' }}>{fCzk(Math.round(r.cisty))}</span>
                </div>
              </button>
            );
          })}
          {unassigned.length > 0 && (
            <button onClick={() => onSetProv(activeProv === '__unassigned' ? '' : '__unassigned')}
              className="d-flex align-items-center gap-2 py-1 px-2 rounded border-0 text-start w-100 mt-1"
              style={{ background: activeProv === '__unassigned' ? '#fdf3f4' : '#fafbfc', cursor: 'pointer', borderTop: '1px dashed #dee2e6' }}>
              <iconify-icon icon="solar:question-circle-bold-duotone" style={{ fontSize: 14, color: '#dc3545' }} />
              <div className="fs-12 fw-semibold text-danger" style={{ width: 130 }}>Nepřiřazeno ({unassigned.length})</div>
              <div className="flex-grow-1 fs-11 text-muted fst-italic">Vyžaduje ruční přiřazení k provozovně</div>
              <span className="czk-num fw-semibold fs-12 text-danger">{fCzk(Math.round(unassignedTrzba))}</span>
            </button>
          )}
        </div>
        <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top fs-11 text-muted">
          <span><strong className="text-dark fs-12">Sloupce:</strong> Hrubá tržba · Provize (skutečná, kde známe) · Čistý příjem</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Tabulka denního párování
// ──────────────────────────────────────────────────────────────
function DailyTable({ platforma, data, search, setSearch, stavFilter, setStavFilter, provFilter, onAssignProvozovna }: {
  platforma: PlatformaId;
  data: DenniParovani[];
  search: string;
  setSearch: (s: string) => void;
  stavFilter: DenniParovani['stav'] | 'all';
  setStavFilter: (s: DenniParovani['stav'] | 'all') => void;
  provFilter: string;
  onAssignProvozovna: (recordId: string, provId: string) => void;
}) {
  const cfg = PLATFORMS[platforma];
  return (
    <div className="card mb-3">
      <div className="card-header">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <h5 className="card-title mb-0">
            Denní párování (POS vs. příchozí D+1)
            <small className="text-muted fw-normal ms-2 fs-13">{data.length} záznamů</small>
          </h5>
        </div>
        {/* Důležitá UX nápověda na výpočet poplatku */}
        <div className="alert alert-info py-2 mb-0 mt-2 fs-12 d-flex align-items-start gap-2">
          <iconify-icon icon="solar:info-circle-bold-duotone" style={{ fontSize: 16, marginTop: 2 }} />
          <span>
            <strong>Příchozí platba je vždy už ponížená o provizi.</strong> Skutečnou provizi proto dopočítáváme zpětně:
            <span className="czk-num"> Provize skutečná = Tržba POS − Příchozí</span>.
            <span className="d-block mt-1">Sloupec <strong>Δ odhadu</strong> ukazuje rozdíl mezi naším predikčním odhadem ({cfg.poplatekPctOdhad} %) a skutečností — slouží jako kontrola s měsíční fakturou.</span>
          </span>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
          <div className="position-relative" style={{ width: 220 }}>
            <iconify-icon icon="solar:magnifer-bold-duotone"
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9097a7' }} />
            <input type="text" className="form-control form-control-sm w-100"
              placeholder="Hledat datum / poznámku…" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 28 }} />
          </div>
          <select className="form-select form-select-sm" style={{ width: 'auto' }}
            value={stavFilter} onChange={(e) => setStavFilter(e.target.value as DenniParovani['stav'] | 'all')}>
            <option value="all">Všechny stavy</option>
            {Object.entries(PAR_STAV_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {provFilter && (
            <span className="badge bg-info-subtle text-info" style={{ fontSize: 11 }}>
              <iconify-icon icon="solar:buildings-3-bold-duotone" className="me-1" style={{ fontSize: 11 }} />
              Filtr: {provFilter === '__unassigned' ? 'Nepřiřazené' : getProvNazev(provFilter)}
            </span>
          )}
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-centered mb-0" style={{ fontSize: 12 }}>
          <thead className="table-light">
            <tr>
              <th>Datum</th>
              <th>Provozovna</th>
              <th className="text-end">Tržba POS</th>
              <th className="text-end">Příchozí (D+1)</th>
              <th className="text-end">Provize skut.</th>
              <th className="text-end">Provize odhad</th>
              <th className="text-end">Δ odhadu</th>
              <th>Stav</th>
              <th>Poznámka</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={9} className="text-center py-4 text-muted">Žádné záznamy nesplňují filtr</td></tr>
            )}
            {data.map((d) => {
              const sm = PAR_STAV_META[d.stav];
              const isRozdil = d.stav === 'rozdil' || d.stav === 'neprislo';
              const isUnassigned = !d.provozovnaId;
              const skut = skutecnyPoplatek(d);
              const odchylka = odchylkaOdhadu(d);
              return (
                <tr key={d.id} style={
                  isRozdil ? { background: '#fdf3f4' }
                  : isUnassigned ? { background: '#fffaf3' }
                  : undefined
                }>
                  <td className="czk-num fw-semibold">{fDate(d.datum)}</td>
                  <td>
                    {d.provozovnaId ? (
                      <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1" style={{ fontSize: 10 }}>
                        <span className="rounded-circle" style={{ width: 7, height: 7, background: getProvColor(d.provozovnaId), display: 'inline-block' }} />
                        {getProvNazev(d.provozovnaId)}
                      </span>
                    ) : (
                      <select
                        className="form-select form-select-sm py-0"
                        style={{ fontSize: 11, height: 24, maxWidth: 160, background: '#fff' }}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) onAssignProvozovna(d.id, e.target.value);
                        }}>
                        <option value="" disabled>Přiřadit…</option>
                        {PLATFORMS[platforma].provozovny.map((pid) => (
                          <option key={pid} value={pid}>{getProvNazev(pid)}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="text-end czk-num">{fCzk(d.trzbaPos)}</td>
                  <td className="text-end czk-num">
                    {d.prislo === null ? <span className="text-muted">—</span> : fCzk(d.prislo)}
                  </td>
                  <td className="text-end czk-num text-danger">
                    {skut === null ? <span className="text-muted">—</span> : `−${fCzk(Math.round(skut))}`}
                  </td>
                  <td className="text-end czk-num text-muted">−{fCzk(d.poplatekOdhad)}</td>
                  <td className={`text-end czk-num fw-semibold ${odchylka === null ? 'text-muted' : Math.abs(odchylka) < 5 ? 'text-success' : 'text-warning'}`}>
                    {odchylka === null ? '—' : (odchylka > 0 ? '+' : '') + fCzk(Math.round(odchylka))}
                  </td>
                  <td>
                    <span className={`badge ${sm.cls}`} style={{ fontSize: 10 }}>
                      <iconify-icon icon={sm.icon} className="me-1" style={{ fontSize: 10 }} />
                      {sm.label}
                    </span>
                  </td>
                  <td className="text-muted fs-11">{d.poznamka ?? ''}</td>
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
// Měsíční faktury
// ──────────────────────────────────────────────────────────────
function MonthlyInvoicesTable({ platforma }: { platforma: PlatformaId }) {
  const { faktury } = getDataForPlatforma(platforma);
  if (faktury.length === 0) return null;
  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">
          Měsíční faktury od poskytovatele
          <small className="text-muted fw-normal ms-2 fs-13">{faktury.length} faktury</small>
        </h5>
        <div className="text-muted fs-12 mt-1">
          Souhrn za měsíc — kontrola, zda denní skutečné provize sedí s fakturou.
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-centered mb-0" style={{ fontSize: 12 }}>
          <thead className="table-light">
            <tr>
              <th>Měsíc</th>
              <th>Vydána</th>
              <th>Splatnost</th>
              <th className="text-end">Tržba</th>
              <th className="text-end">Faktura — poplatek</th>
              <th className="text-end">Náš výpočet</th>
              <th className="text-end">Rozdíl</th>
              <th>Stav</th>
            </tr>
          </thead>
          <tbody>
            {faktury.map((f) => {
              const sm = FAKT_STAV_META[f.stav];
              return (
                <tr key={f.id} style={f.stav === 'rozdil' ? { background: '#fff8e6' } : undefined}>
                  <td className="fw-semibold">{f.mesic}</td>
                  <td className="czk-num">{fDate(f.vydanaDatum)}</td>
                  <td className="czk-num">{fDate(f.splatnost)}</td>
                  <td className="text-end czk-num">{fCzk(f.prijmuCelkem)}</td>
                  <td className="text-end czk-num text-danger">−{fCzk(f.poplatekFakturovany)}</td>
                  <td className="text-end czk-num text-muted">−{fCzk(f.poplatekOdhadnuty)}</td>
                  <td className={`text-end czk-num fw-bold ${f.rozdil > 0 ? 'text-warning' : f.rozdil < 0 ? 'text-success' : 'text-muted'}`}>
                    {f.rozdil === 0 ? '0' : (f.rozdil > 0 ? '+' : '') + fCzk(f.rozdil)}
                  </td>
                  <td>
                    <span className={`badge ${sm.cls}`} style={{ fontSize: 10 }}>
                      <iconify-icon icon={sm.icon} className="me-1" style={{ fontSize: 10 }} />
                      {sm.label}
                    </span>
                    {f.poznamka && (
                      <div className="text-muted fs-11 fst-italic mt-1">{f.poznamka}</div>
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
// Main view
// ──────────────────────────────────────────────────────────────
export default function PaymentPlatformView({ platforma }: Props) {
  const { denni } = getDataForPlatforma(platforma);
  const [search, setSearch]         = useState('');
  const [stavFilter, setStavFilter] = useState<DenniParovani['stav'] | 'all'>('all');
  const [provFilter, setProvFilter] = useState<string>('');
  // Lokální session přiřazení provozoven (uživatel ručně dopáruje)
  const [localProvAssign, setLocalProvAssign] = useState<Record<string, string>>({});

  // Aplikuj lokální přiřazení
  const merged: DenniParovani[] = useMemo(() => {
    return denni.map((d) => localProvAssign[d.id] ? { ...d, provozovnaId: localProvAssign[d.id] } : d);
  }, [denni, localProvAssign]);

  const filtered = useMemo(() => {
    return merged.filter((d) => {
      if (stavFilter !== 'all' && d.stav !== stavFilter) return false;
      if (provFilter === '__unassigned') {
        if (d.provozovnaId) return false;
      } else if (provFilter && d.provozovnaId !== provFilter) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!d.datum.includes(q) && !(d.poznamka ?? '').toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.datum.localeCompare(a.datum));
  }, [merged, stavFilter, provFilter, search]);

  return (
    <>
      <PlatformHeader platforma={platforma} />
      <KpiStrip platforma={platforma} denni={merged} />
      <VenueBreakdown
        platforma={platforma}
        denni={merged}
        activeProv={provFilter}
        onSetProv={setProvFilter}
      />
      <DailyTable
        platforma={platforma}
        data={filtered}
        search={search} setSearch={setSearch}
        stavFilter={stavFilter} setStavFilter={setStavFilter}
        provFilter={provFilter}
        onAssignProvozovna={(recordId, provId) => {
          setLocalProvAssign((prev) => ({ ...prev, [recordId]: provId }));
        }}
      />
      <MonthlyInvoicesTable platforma={platforma} />
    </>
  );
}
