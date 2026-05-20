// COMPONENT: Pohledávky – vydané faktury, sledování úhrad, upomínky
// SOURCE: Larkon _page-title.scss + Bootstrap layout + _tables.scss + offcanvas
// CUSTOM: YES
//   – aging report (stáří pohledávek): horizontal bars 0-30 / 31-60 / 61-90 / 90+ dní
//   – timeline drawer: kroková vizualizace (Vystavena → Odeslána → Upomínka → Uhrazena)
//   – stavový automat: vystavena → odeslana → po-splatnosti → upominka-1/2 → predžalobni → uhrazena
//   – modal "Nová pohledávka" s opakováním (měsíční, týdenní) a "odeslat ihned" přepínač
//   – localStavy: session-local přepínání stavů (v produkci backend)
//   – inline akce tabulky: Odeslat / Upomínka / Uhrazena
//
// Larkon class mapping:
//   .page-title-box                           → page header
//   .row.g-3 / .col-md-3                      → KPI strip (4 karty)
//   .card > .card-body                         → aging report karta + filter panel
//   .table-responsive                          → horizontální scroll na mobilu
//   .table.table-hover.table-centered          → tabulka pohledávek
//   .badge.bg-{color}-subtle.text-{color}      → stav pohledávky (STAV_META_POH)
//   .offcanvas.offcanvas-end.show              → detail drawer zprava
//   .offcanvas-backdrop.fade.show              → tmavý překryv
//   .modal.show.d-block / .modal-dialog.modal-lg → modal Nová pohledávka
//   CUSTOM: aging horizontal bars              → inline CSS flex, není v Larkon
//   CUSTOM: timeline kroky                     → absolutně pozicované kruhy na svislé čáře

import { useState } from 'react';
import type { AppState, ProvozovnaId } from '../types';
import {
  getPohledavkyForProvozovna,
  getCelkemAktivni,
  getCelkemPoSplatnosti,
  getUhrazenoTentoMesic,
  getAgingBuckets,
  getDniPoSplatnosti,
  STAV_META_POH,
  getNextUpominka,
  getNextActionLabel,
  POHLEDAVKY,
  type PohledavkaStav,
  type Pohledavka,
} from '../pohledavkyData';
import { PROVOZOVNY, fCzk, fDate } from '../data';
import { KATEGORIE_LABELS, SCHVALOVACI_OSOBY } from '../platbyData';
import type { FakturaKategorie } from '../platbyData';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

const PROVOZOVNY_ACTIVE = PROVOZOVNY.filter((p) => p.status === 'active');

export default function PohledavkyView({ state, update }: Props) {
  const { selectedProvozovna } = state;

  const [stavFilter,       setStavFilter]       = useState('all');
  const [drawerPohId,      setDrawerPohId]      = useState<string | null>(null);
  const [showNova,         setShowNova]         = useState(false);
  const [localStavy,       setLocalStavy]       = useState<Record<string, PohledavkaStav>>({});

  // Nová pohledávka – form state
  const [novaFa, setNovaFa] = useState({
    klient: '', kontaktEmail: '', cislo: '',
    provozovna: selectedProvozovna === 'all' ? 'cg-brno' : selectedProvozovna,
    castka: '', datum: '2026-04-17', splatnost: '',
    kategorie: 'sluzby' as FakturaKategorie,
    poznamka: '', prirazenaOsoba: '', odeslat: false,
    opakovani: '' as '' | 'mesicni' | 'tydenni',
  });

  const effectiveProv = selectedProvozovna as ProvozovnaId;
  const vsechny = getPohledavkyForProvozovna(effectiveProv);

  const zobrazene = vsechny.filter((p) => {
    const stav = localStavy[p.id] ?? p.stav;
    if (stavFilter === 'aktivni')       return stav !== 'uhrazena';
    if (stavFilter === 'uhrazena')      return stav === 'uhrazena';
    if (stavFilter === 'neodeslana')    return stav === 'vystavena';
    if (stavFilter === 'po-splatnosti') return ['po-splatnosti','upominka-1','upominka-2','predžalobni'].includes(stav);
    return true;
  });

  // KPI data
  const celkemAktivni      = getCelkemAktivni(effectiveProv);
  const celkemPoSplatnosti = getCelkemPoSplatnosti(effectiveProv);
  const uhrazenoMesic      = getUhrazenoTentoMesic(effectiveProv);
  const pocetAktivnich     = getPohledavkyForProvozovna(effectiveProv).filter((p) => (localStavy[p.id] ?? p.stav) !== 'uhrazena').length;
  const aging              = getAgingBuckets(effectiveProv);
  const agingTotal         = aging.reduce((s, b) => s + b.castka, 0) || 1;

  const drawerPoh = drawerPohId ? (POHLEDAVKY.find((p) => p.id === drawerPohId) ?? null) : null;

  function handleAction(id: string) {
    const p = POHLEDAVKY.find((p) => p.id === id)!;
    const stav = localStavy[id] ?? p.stav;
    const next = getNextUpominka(stav);
    if (next) setLocalStavy((prev) => ({ ...prev, [id]: next }));
  }

  function handleUhrazena(id: string) {
    setLocalStavy((prev) => ({ ...prev, [id]: 'uhrazena' }));
    if (drawerPohId === id) setDrawerPohId(null);
  }

  const getProvName  = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.shortName ?? id;
  const getProvColor = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.color ?? '#9097a7';

  const poSplatnostiCount = vsechny.filter((p) => {
    const s = localStavy[p.id] ?? p.stav;
    return ['po-splatnosti','upominka-1','upominka-2','predžalobni'].includes(s);
  }).length;
  const neodeslaneCount = vsechny.filter((p) => (localStavy[p.id] ?? p.stav) === 'vystavena').length;

  return (
    <>
      {/* ACTION BAR – SOURCE: Larkon .page-title-box (title odstraněn, zobrazen v topbaru) */}
      <div className="page-title-box">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button className="btn btn-light btn-sm">Export</button>
          <button className="btn btn-primary btn-sm" onClick={() => {
            setNovaFa((f) => ({ ...f, provozovna: selectedProvozovna === 'all' ? 'cg-brno' : selectedProvozovna }));
            setShowNova(true);
          }}>
            <iconify-icon icon="solar:add-circle-bold-duotone" className="me-1" style={{ fontSize: 16 }} />
            Nová pohledávka
          </button>
        </div>
      </div>

      {/* Alerts */}
      {(poSplatnostiCount > 0 || neodeslaneCount > 0) && (
        <div className="d-flex flex-column gap-2 mb-4">
          {poSplatnostiCount > 0 && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-0">
              <iconify-icon icon="solar:danger-triangle-bold-duotone" className="fs-5 flex-shrink-0" />
              <span className="flex-grow-1">
                <strong>{poSplatnostiCount} pohledávek po splatnosti</strong> – {fCzk(celkemPoSplatnosti)} čeká na úhradu
              </span>
              <span className="alert-link fw-semibold text-nowrap ms-auto" style={{ cursor: 'pointer' }} onClick={() => setStavFilter('po-splatnosti')}>
                Zobrazit →
              </span>
            </div>
          )}
          {neodeslaneCount > 0 && (
            <div className="alert alert-warning d-flex align-items-center gap-2 mb-0">
              <iconify-icon icon="solar:letter-bold-duotone" className="fs-5 flex-shrink-0" />
              <span className="flex-grow-1">
                <strong>{neodeslaneCount} faktur</strong> ještě nebylo odesláno klientovi
              </span>
              <span className="alert-link fw-semibold text-nowrap ms-auto" style={{ cursor: 'pointer' }} onClick={() => setStavFilter('neodeslana')}>
                Odeslat →
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPI Strip */}
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Celkem pohledávky',
            value: fCzk(celkemAktivni),
            sub: `${pocetAktivnich} aktivních faktur`,
            icon: 'solar:bill-list-bold-duotone',
            color: 'var(--prov-color, #c9911a)',
          },
          {
            label: 'Po splatnosti',
            value: fCzk(celkemPoSplatnosti),
            sub: `${poSplatnostiCount} faktur vyžaduje pozornost`,
            icon: 'solar:danger-triangle-bold-duotone',
            color: '#ef4444',
          },
          {
            label: 'Uhrazeno v dubnu',
            value: fCzk(uhrazenoMesic),
            sub: `${vsechny.filter((p) => p.stav === 'uhrazena' && p.uhrazeno?.startsWith('2026-04')).length} faktur uhrazeno`,
            icon: 'solar:check-circle-bold-duotone',
            color: '#14b8a6',
          },
          {
            label: 'Očekáváno (30 dní)',
            value: fCzk(vsechny.filter((p) => {
              const s = localStavy[p.id] ?? p.stav;
              return s === 'odeslana' || s === 'vystavena';
            }).reduce((s, p) => s + p.castka, 0)),
            sub: 'odeslané + vystavené',
            icon: 'solar:calendar-bold-duotone',
            color: '#1c84ee',
          },
        ].map((k) => (
          <div key={k.label} className="col-sm-6 col-xl-3">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-start gap-3">
                  <iconify-icon icon={k.icon} style={{ fontSize: 26, color: k.color, flexShrink: 0, marginTop: 2 }} />
                  <div className="flex-grow-1 min-w-0">
                    <div className="text-muted fs-12 mb-1">{k.label}</div>
                    <div className="fw-bold fs-4 czk-num lh-1 mb-1" style={{ color: '#313b5e' }}>{k.value}</div>
                    <div className="text-muted fs-12">{k.sub}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Aging report */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">Stáří pohledávek</h5>
        </div>
        <div className="card-body py-3">
          <div className="d-flex flex-column gap-3">
            {aging.map((b) => (
              <div key={b.label} className="d-flex align-items-center gap-3">
                <div style={{ width: 120, flexShrink: 0 }} className="text-muted fs-13">{b.label}</div>
                <div className="flex-grow-1" style={{ height: 10, background: '#f0f2f7', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.round((b.castka / agingTotal) * 100)}%`,
                    background: b.color,
                    borderRadius: 5,
                    transition: 'width .4s ease',
                    minWidth: b.castka > 0 ? 4 : 0,
                  }} />
                </div>
                <div style={{ width: 110, textAlign: 'right', flexShrink: 0 }} className="czk-num fs-13 fw-semibold">
                  {b.castka > 0 ? fCzk(b.castka) : <span className="text-muted">—</span>}
                </div>
                <div style={{ width: 60, flexShrink: 0 }} className="text-muted fs-12 text-end">
                  {b.pocet > 0 ? `${b.pocet} fakt.` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card mb-4">
        <div className="card-body py-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-muted fs-13">Filtr:</span>
            <select className="form-select form-select-sm" style={{ width: 'auto' }}
              value={stavFilter} onChange={(e) => setStavFilter(e.target.value)}>
              <option value="all">Všechny stavy</option>
              <option value="aktivni">Aktivní</option>
              <option value="neodeslana">Neodesláno klientovi</option>
              <option value="po-splatnosti">Po splatnosti</option>
              <option value="uhrazena">Uhrazené</option>
            </select>
            {stavFilter !== 'all' && (
              <button className="btn btn-link btn-sm ms-auto text-muted"
                onClick={() => setStavFilter('all')}>
                Zrušit filtry ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabulka */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between gap-3">
          <h5 className="card-title mb-0 flex-grow-1">
            Přehled pohledávek
            <small className="text-muted fw-normal ms-2 fs-13">{zobrazene.length} faktur</small>
          </h5>
        </div>
        <div className="table-responsive">
          <table className="table table-hover table-centered table-nowrap mb-0">
            <thead className="table-light">
              <tr>
                <th>Číslo</th>
                <th>Klient</th>
                {effectiveProv === 'all' && <th>Provoz</th>}
                <th className="text-end">Částka</th>
                <th>Vystaveno</th>
                <th>Splatnost</th>
                <th>Stav</th>
                <th>Akce</th>
              </tr>
            </thead>
            <tbody>
              {zobrazene.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-muted">
                    Žádné pohledávky neodpovídají filtru
                  </td>
                </tr>
              )}
              {zobrazene.map((p) => {
                const stav = localStavy[p.id] ?? p.stav;
                const { cls, label } = STAV_META_POH[stav];
                const dni = getDniPoSplatnosti(p.splatnost);
                const actionLabel = getNextActionLabel(stav);
                const isActive = stav !== 'uhrazena';

                return (
                  <tr
                    key={p.id}
                    style={{ cursor: 'pointer' }}
                    className={stav === 'predžalobni' ? 'table-danger' : stav === 'po-splatnosti' || stav === 'upominka-1' || stav === 'upominka-2' ? 'table-warning' : ''}
                    onClick={() => setDrawerPohId(p.id)}
                  >
                    <td className="text-muted fs-12 czk-num">{p.cislo}</td>
                    <td>
                      <div className="fw-semibold">{p.klient}</div>
                      {p.poznamka && <div className="text-muted fs-12">{p.poznamka}</div>}
                    </td>
                    {effectiveProv === 'all' && (
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="rounded-circle d-inline-block"
                            style={{ width: 8, height: 8, background: getProvColor(p.provozovna), flexShrink: 0 }} />
                          <span className="fs-13">{getProvName(p.provozovna)}</span>
                        </div>
                      </td>
                    )}
                    <td className="text-end fw-bold czk-num">{fCzk(p.castka)}</td>
                    <td className="text-muted fs-13">{fDate(p.datum)}</td>
                    <td>
                      <span className={dni > 0 ? 'text-danger fw-bold' : 'text-muted'}>
                        {fDate(p.splatnost)}
                      </span>
                      {dni > 0 && <div className="text-danger fs-11 fw-bold">{dni} dní</div>}
                    </td>
                    <td><span className={`badge ${cls}`}>{label}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="d-flex gap-1">
                        {actionLabel && (
                          <button
                            className={`btn btn-sm ${stav === 'vystavena' ? 'btn-primary' : 'btn-outline-warning'}`}
                            style={{ fontSize: 11, padding: '2px 8px' }}
                            onClick={() => handleAction(p.id)}
                          >
                            {stav === 'vystavena' ? 'Odeslat' : 'Upomínka'}
                          </button>
                        )}
                        {isActive && stav !== 'vystavena' && (
                          <button
                            className="btn btn-sm btn-outline-success"
                            style={{ fontSize: 11, padding: '2px 8px' }}
                            onClick={() => handleUhrazena(p.id)}
                          >
                            Uhrazena
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Drawer – detail pohledávky ───────────────────────── */}
      {drawerPoh && (() => {
        const stav = localStavy[drawerPoh.id] ?? drawerPoh.stav;
        const { cls, label } = STAV_META_POH[stav];
        const dni = getDniPoSplatnosti(drawerPoh.splatnost);
        const actionLabel = getNextActionLabel(stav);
        const timelineSteps = [
          { key: 'vystavena',     stepLabel: 'Vystavena',          done: true,                      date: drawerPoh.datum },
          { key: 'odeslana',      stepLabel: 'Odesláno klientovi', done: !!drawerPoh.odeslano || (localStavy[drawerPoh.id] && stav !== 'vystavena'), date: drawerPoh.odeslano },
          { key: 'upominka-1',    stepLabel: '1. upomínka',        done: ['upominka-1','upominka-2','predžalobni','uhrazena'].includes(stav), date: undefined },
          { key: 'upominka-2',    stepLabel: '2. upomínka',        done: ['upominka-2','predžalobni'].includes(stav), date: undefined },
          { key: 'uhrazena',      stepLabel: 'Uhrazena',           done: stav === 'uhrazena', date: drawerPoh.uhrazeno },
        ];
        return (
          <>
            <div className="offcanvas-backdrop fade show" style={{ zIndex: 200 }} onClick={() => setDrawerPohId(null)} />
            <div className="offcanvas offcanvas-end show" style={{ width: 'min(480px, 100vw)', zIndex: 300 }}>
              <div className="offcanvas-header border-bottom">
                <div>
                  <h5 className="offcanvas-title mb-0">{drawerPoh.klient}</h5>
                  <small className="text-muted fs-12">{drawerPoh.cislo}</small>
                </div>
                <button className="btn-close" onClick={() => setDrawerPohId(null)} />
              </div>

              <div className="offcanvas-body p-0" style={{ overflowY: 'auto' }}>
                {/* Hlavní info */}
                <div className="p-4 border-bottom">
                  <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                    <span className={`badge ${cls} fs-12`}>{label}</span>
                    <div className="text-end">
                      <div className="fw-bold czk-num fs-3" style={{ color: '#313b5e' }}>{fCzk(drawerPoh.castka)}</div>
                      {drawerPoh.opakovani && (
                        <div className="text-muted fs-12">
                          <iconify-icon icon="solar:refresh-bold-duotone" style={{ fontSize: 12 }} className="me-1" />
                          Opakuje se {drawerPoh.opakovani === 'mesicni' ? 'měsíčně' : 'týdně'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="row g-2 fs-13">
                    <div className="col-6">
                      <span className="text-muted">Provozovna</span>
                      <div className="fw-semibold">{PROVOZOVNY.find((p) => p.id === drawerPoh.provozovna)?.name}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted">Kontakt</span>
                      <div className="fw-semibold text-truncate">{drawerPoh.kontaktEmail ?? '—'}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted">Datum vystavení</span>
                      <div className="fw-semibold">{fDate(drawerPoh.datum)}</div>
                    </div>
                    <div className="col-6">
                      <span className="text-muted">Splatnost</span>
                      <div className={`fw-semibold ${dni > 0 ? 'text-danger' : ''}`}>
                        {fDate(drawerPoh.splatnost)}
                        {dni > 0 && <span className="ms-1 fs-11">({dni} dní)</span>}
                      </div>
                    </div>
                    {drawerPoh.poznamka && (
                      <div className="col-12">
                        <span className="text-muted">Poznámka</span>
                        <div className="fw-semibold">{drawerPoh.poznamka}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="p-4 border-bottom">
                  <div className="text-uppercase fw-semibold text-muted fs-11 mb-3">Průběh</div>
                  <div className="d-flex flex-column gap-0">
                    {timelineSteps.map((step, i) => (
                      <div key={step.key} className="d-flex align-items-start gap-3">
                        <div className="d-flex flex-column align-items-center" style={{ width: 24, flexShrink: 0 }}>
                          <div className={`rounded-circle d-flex align-items-center justify-content-center`}
                            style={{
                              width: 22, height: 22,
                              background: step.done ? 'var(--prov-color, #c9911a)' : '#e9ecef',
                              border: `2px solid ${step.done ? 'var(--prov-color, #c9911a)' : '#dee2e6'}`,
                              flexShrink: 0,
                            }}>
                            {step.done && <iconify-icon icon="solar:check-bold" style={{ fontSize: 11, color: '#fff' }} />}
                          </div>
                          {i < timelineSteps.length - 1 && (
                            <div style={{ width: 2, height: 24, background: step.done ? 'var(--prov-color, #c9911a)' : '#e9ecef' }} />
                          )}
                        </div>
                        <div className="pb-3 flex-grow-1">
                          <div className={`fs-13 fw-semibold ${step.done ? '' : 'text-muted'}`}>{step.stepLabel}</div>
                          {step.date && <div className="text-muted fs-12">{fDate(step.date)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Náhled faktury */}
                <div className="p-4 border-bottom">
                  <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Doklad</div>
                  <div className="lk-custom rounded d-flex align-items-center justify-content-center"
                    style={{ height: 120, background: '#f8f9fa' }}>
                    <div className="lk-custom-label">CUSTOM: PDF viewer</div>
                    <div className="text-center text-muted">
                      <iconify-icon icon="solar:document-bold-duotone" style={{ fontSize: 32, opacity: 0.3 }} />
                      <div className="fs-12 mt-1">{drawerPoh.cislo}.pdf</div>
                    </div>
                  </div>
                </div>

                {/* Akce */}
                {stav !== 'uhrazena' && (
                  <div className="p-4 border-bottom">
                    <div className="text-uppercase fw-semibold text-muted fs-11 mb-3">Akce</div>
                    <div className="d-flex flex-column gap-2">
                      {actionLabel && (
                        <button className={`btn w-100 ${stav === 'vystavena' ? 'btn-primary' : 'btn-warning'}`}
                          onClick={() => handleAction(drawerPoh.id)}>
                          <iconify-icon icon={stav === 'vystavena' ? 'solar:letter-bold-duotone' : 'solar:bell-bold-duotone'}
                            className="me-2" style={{ fontSize: 18 }} />
                          {actionLabel}
                        </button>
                      )}
                      <button className="btn btn-success w-100" onClick={() => handleUhrazena(drawerPoh.id)}>
                        <iconify-icon icon="solar:check-circle-bold-duotone" className="me-2" style={{ fontSize: 18 }} />
                        Označit jako uhrazenou
                      </button>
                    </div>
                    {stav !== 'vystavena' && (
                      <div className="mt-3 p-3 rounded fs-12 text-muted" style={{ background: '#f8f9fa' }}>
                        <div className="lk-custom-label">CUSTOM: automatické upomínky</div>
                        <iconify-icon icon="solar:refresh-bold-duotone" className="me-1" style={{ fontSize: 14 }} />
                        <strong>Automatické upomínky</strong> – v produkci: 7 / 14 / 30 dní po splatnosti
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Modal – Nová pohledávka ───────────────────────────── */}
      {showNova && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 200 }} onClick={() => setShowNova(false)} />
          <div className="modal show d-block" style={{ zIndex: 300 }} tabIndex={-1}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Nová pohledávka</h5>
                  <button className="btn-close" onClick={() => setShowNova(false)} />
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    {/* Klient */}
                    <div className="col-8">
                      <label className="form-label fw-semibold fs-13">Klient / odběratel <span className="text-danger">*</span></label>
                      <input type="text" className="form-control form-control-sm" placeholder="Název firmy nebo osoby..."
                        value={novaFa.klient} onChange={(e) => setNovaFa((f) => ({ ...f, klient: e.target.value }))} />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold fs-13">Číslo faktury</label>
                      <input type="text" className="form-control form-control-sm" placeholder="VYD-2026-…"
                        value={novaFa.cislo} onChange={(e) => setNovaFa((f) => ({ ...f, cislo: e.target.value }))} />
                    </div>

                    {/* Kontakt */}
                    <div className="col-12">
                      <label className="form-label fw-semibold fs-13">Kontaktní e-mail</label>
                      <input type="email" className="form-control form-control-sm" placeholder="fakturace@klient.cz"
                        value={novaFa.kontaktEmail} onChange={(e) => setNovaFa((f) => ({ ...f, kontaktEmail: e.target.value }))} />
                      <div className="form-text">Na tuto adresu bude faktura odeslána a případné upomínky</div>
                    </div>

                    {/* Kategorie + provozovna */}
                    <div className="col-6">
                      <label className="form-label fw-semibold fs-13">Typ služby</label>
                      <select className="form-select form-select-sm" value={novaFa.kategorie}
                        onChange={(e) => setNovaFa((f) => ({ ...f, kategorie: e.target.value as FakturaKategorie }))}>
                        {(Object.keys(KATEGORIE_LABELS) as FakturaKategorie[]).map((k) => (
                          <option key={k} value={k}>{KATEGORIE_LABELS[k]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold fs-13">Provozovna <span className="text-danger">*</span></label>
                      <select className="form-select form-select-sm" value={novaFa.provozovna}
                        onChange={(e) => setNovaFa((f) => ({ ...f, provozovna: e.target.value }))}>
                        {PROVOZOVNY_ACTIVE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    {/* Částka + datum + splatnost */}
                    <div className="col-4">
                      <label className="form-label fw-semibold fs-13">Částka (Kč) <span className="text-danger">*</span></label>
                      <input type="number" className="form-control form-control-sm" placeholder="0"
                        value={novaFa.castka} onChange={(e) => setNovaFa((f) => ({ ...f, castka: e.target.value }))} />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold fs-13">Datum vystavení</label>
                      <input type="date" className="form-control form-control-sm" value={novaFa.datum}
                        onChange={(e) => setNovaFa((f) => ({ ...f, datum: e.target.value }))} />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold fs-13">Splatnost <span className="text-danger">*</span></label>
                      <input type="date" className="form-control form-control-sm" value={novaFa.splatnost}
                        onChange={(e) => setNovaFa((f) => ({ ...f, splatnost: e.target.value }))} />
                    </div>

                    {/* Opakování */}
                    <div className="col-6">
                      <label className="form-label fw-semibold fs-13">Opakující se faktura</label>
                      <select className="form-select form-select-sm" value={novaFa.opakovani}
                        onChange={(e) => setNovaFa((f) => ({ ...f, opakovani: e.target.value as typeof novaFa.opakovani }))}>
                        <option value="">Jednorázová</option>
                        <option value="tydenni">Týdenní</option>
                        <option value="mesicni">Měsíční</option>
                      </select>
                    </div>

                    {/* Přiřadit */}
                    <div className="col-6">
                      <label className="form-label fw-semibold fs-13">Přiřadit zodpovědnou osobu</label>
                      <select className="form-select form-select-sm" value={novaFa.prirazenaOsoba}
                        onChange={(e) => setNovaFa((f) => ({ ...f, prirazenaOsoba: e.target.value }))}>
                        <option value="">— Nepřiřazovat —</option>
                        {SCHVALOVACI_OSOBY.map((o) => (
                          <option key={o.id} value={o.id}>{o.jmeno}</option>
                        ))}
                      </select>
                    </div>

                    {/* Poznámka */}
                    <div className="col-12">
                      <label className="form-label fw-semibold fs-13">Popis / poznámka</label>
                      <textarea className="form-control form-control-sm" rows={2}
                        placeholder="Co faktura zahrnuje (akce, datum, počet hostů...)"
                        value={novaFa.poznamka}
                        onChange={(e) => setNovaFa((f) => ({ ...f, poznamka: e.target.value }))} />
                    </div>

                    {/* Příloha */}
                    <div className="col-12">
                      <label className="form-label fw-semibold fs-13">Příloha</label>
                      <div className="lk-custom border rounded d-flex align-items-center justify-content-center"
                        style={{ height: 72, background: '#f8f9fa', cursor: 'pointer' }}>
                        <div className="lk-custom-label">CUSTOM: file upload</div>
                        <div className="text-center text-muted fs-13">
                          <iconify-icon icon="solar:upload-bold-duotone" style={{ fontSize: 20 }} className="d-block mx-auto mb-1" />
                          PDF nebo obrázek faktury
                        </div>
                      </div>
                    </div>

                    {/* Odeslat ihned */}
                    <div className="col-12">
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="odeslat-ihned"
                          checked={novaFa.odeslat}
                          onChange={(e) => setNovaFa((f) => ({ ...f, odeslat: e.target.checked }))} />
                        <label className="form-check-label fs-13" htmlFor="odeslat-ihned">
                          Po uložení ihned odeslat klientovi e-mailem
                          <span className="text-muted ms-1">(v produkci: automaticky)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-light btn-sm" onClick={() => setShowNova(false)}>Zrušit</button>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowNova(false)}>
                    <iconify-icon icon="solar:diskette-bold-duotone" className="me-1" style={{ fontSize: 16 }} />
                    {novaFa.odeslat ? 'Uložit a odeslat' : 'Uložit pohledávku'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
