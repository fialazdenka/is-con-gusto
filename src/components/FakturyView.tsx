// COMPONENT: Faktury – správa a schvalování faktur
// SOURCE: Larkon _page-title.scss + Bootstrap layout + _alert.scss
// CUSTOM: YES
//   – workflow schválení: Nova → Ke schválení → Schválená / Zamítnutá / Zastavená
//   – sticky bulk-action bar (.bulk-bar) s hromadným schválením – není v Larkon
//   – modal "Nová faktura" (typ dokladu, kategorie, provozovna, přiřazení, soubor) – gastro specifické
//   – localStavy / localSchvalil / localDatumSchvaleni / localPrirazeni – session-local schvalovací stav
//   – AKTUALNI_UZIVATEL jako přihlášený schvalovatel (v produkci auth kontext)
//
// Larkon class mapping:
//   .page-title-box                    → page header row
//   .alert.alert-{danger|warning|info} → upozornění nad tabulkou
//   .alert-link.fw-semibold.ms-auto    → CTA v alertu
//   .card > .card-body                 → filter panel
//   .form-select.form-select-sm        → select filtry (stav, kategorie, středisko)
//   .badge.bg-{color}-subtle           → quick-filter badges
//   .btn.btn-primary / .btn-light      → akce (nová faktura, export)
//   .modal.show.d-block                → modal dialog
//   .modal-dialog.modal-lg             → velký modal (Nová faktura)
//   CUSTOM: .bulk-bar                  → sticky bottom bar (position: sticky, bottom: 0)
//   CUSTOM: file upload placeholder    → .lk-custom div pro drag-drop PDF

import { useState, useCallback } from 'react';
import type { AppState, ProvozovnaId } from '../types';
import type { TypDokladu, FakturaStavPlatby, FakturaKategorie } from '../platbyData';
import {
  getFakturyForProvozovna,
  isPoSplatnosti,
  isSplatneVObdobi,
  TYDEN_OD,
  TYDEN_DO,
  PROCESSING_DAYS_DEFAULT,
  KATEGORIE_LABELS,
  SCHVALOVACI_OSOBY,
} from '../platbyData';
import { PROVOZOVNY } from '../data';
import PlatbyKPIStrip from './PlatbyKPIStrip';
import FakturyTable from './FakturyTable';
import FakturaDetailDrawer from './FakturaDetailDrawer';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

export default function FakturyView({ state, update }: Props) {
  const { selectedProvozovna } = state;

  const [periodOd,        setPeriodOd]        = useState(TYDEN_OD);
  const [periodDo,        setPeriodDo]        = useState(TYDEN_DO);
  const [kategorieFilter,    setKategorieFilter]    = useState('all');
  const [stavFilter,         setStavFilter]         = useState('all');
  const [typDokladu,         setTypDokladu]         = useState<TypDokladu | 'all'>('all');
  const [provozovnaFilter,   setProvozovnaFilter]   = useState<string>('all');
  const [selectedIds,        setSelectedIds]        = useState<Set<string>>(new Set());

  // Nová faktura – modal state
  const [showNovaFaktura, setShowNovaFaktura] = useState(false);
  const [novaFa, setNovaFa] = useState({
    typDokladu: 'prijata' as TypDokladu,
    dodavatel: '',
    cislo: '',
    kategorie: 'zbozi' as FakturaKategorie,
    provozovna: selectedProvozovna === 'all' ? 'cg-brno' : selectedProvozovna,
    castka: '',
    datum: '2026-04-23',
    splatnost: '',
    poznamka: '',
    prirazenaOsoba: '',
  });

  // Schvalování – drawer state
  const [drawerFakturaId, setDrawerFakturaId] = useState<string | null>(null);
  const [schvalovaniQueue, setSchvalovaniQueue] = useState<string[]>([]);
  const [localStavy,         setLocalStavy]        = useState<Record<string, FakturaStavPlatby>>({});
  const [localPoznamky,      setLocalPoznamky]     = useState<Record<string, string>>({});
  const [localStrediska,     setLocalStrediska]    = useState<Record<string, string>>({});
  const [localPrirazeni,     setLocalPrirazeni]    = useState<Record<string, string>>({});
  const [localSchvalil,      setLocalSchvalil]     = useState<Record<string, string>>({});
  const [localDatumSchvaleni, setLocalDatumSchvaleni] = useState<Record<string, string>>({});

  const toggleFa = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAllFa = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const allFakturyRaw = getFakturyForProvozovna(selectedProvozovna);
  const keSchvaleni = allFakturyRaw.filter(
    (f) => (localStavy[f.id] ?? f.stav) === 'nova' || (localStavy[f.id] ?? f.stav) === 'ke-schvaleni'
  );

  function spustitSchvalovani() {
    const queue = keSchvaleni.map((f) => f.id);
    setSchvalovaniQueue(queue);
    if (queue.length > 0) setDrawerFakturaId(queue[0]);
  }

  const drawerFaktura = drawerFakturaId
    ? allFakturyRaw.find((f) => f.id === drawerFakturaId) ?? null
    : null;
  const queueIndex = schvalovaniQueue.indexOf(drawerFakturaId ?? '');

  // Mock "přihlášený uživatel" = majitel (simuluje schválení majitelem)
  const AKTUALNI_UZIVATEL = SCHVALOVACI_OSOBY.find((o) => o.role === 'majitel')!;
  const dnesStr = new Date().toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

  function handleSchvalit(id: string) {
    setLocalStavy((prev) => ({ ...prev, [id]: 'schvalena' }));
    setLocalSchvalil((prev) => ({ ...prev, [id]: AKTUALNI_UZIVATEL.jmeno }));
    setLocalDatumSchvaleni((prev) => ({ ...prev, [id]: dnesStr }));
    if (queueIndex >= 0 && queueIndex < schvalovaniQueue.length - 1) {
      setDrawerFakturaId(schvalovaniQueue[queueIndex + 1]);
    }
  }
  function handleZamitout(id: string) {
    setLocalStavy((prev) => ({ ...prev, [id]: 'zamitnuta' }));
    setLocalSchvalil((prev) => ({ ...prev, [id]: AKTUALNI_UZIVATEL.jmeno }));
    setLocalDatumSchvaleni((prev) => ({ ...prev, [id]: dnesStr }));
  }
  function handleOdlozit(id: string) {
    setLocalStavy((prev) => ({ ...prev, [id]: 'ke-schvaleni' }));
    setLocalSchvalil((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setLocalDatumSchvaleni((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  function handleBulkSchvalit() {
    const newStavy: Record<string, FakturaStavPlatby> = {};
    const newSchvalil: Record<string, string> = {};
    const newDatum: Record<string, string> = {};
    selectedIds.forEach((id) => {
      newStavy[id] = 'schvalena';
      newSchvalil[id] = AKTUALNI_UZIVATEL.jmeno;
      newDatum[id] = dnesStr;
    });
    setLocalStavy((prev) => ({ ...prev, ...newStavy }));
    setLocalSchvalil((prev) => ({ ...prev, ...newSchvalil }));
    setLocalDatumSchvaleni((prev) => ({ ...prev, ...newDatum }));
    setSelectedIds(new Set());
  }

  const allFaktury     = getFakturyForProvozovna(selectedProvozovna);
  const poSplatCnt     = allFaktury.filter(
    (f) => f.stav !== 'zaplacena' && f.stav !== 'odeslana' && isPoSplatnosti(f.splatnost)
  ).length;
  const neschvaleneCnt = allFaktury.filter(
    (f) => f.stav === 'nova' || f.stav === 'ke-schvaleni'
  ).length;
  const splatneVObdobi = allFaktury.filter(
    (f) =>
      f.stav !== 'zaplacena' &&
      f.stav !== 'odeslana' &&
      isSplatneVObdobi(f.splatnost, periodOd, periodDo) &&
      !isPoSplatnosti(f.splatnost)
  ).length;

  void PROCESSING_DAYS_DEFAULT;

  return (
    <>
      {/* SOURCE: Larkon .page-title-box */}
      <div className="page-title-box">
        <div>
          <h4 className="page-title fw-semibold mb-1">Faktury</h4>
          <p className="text-muted mb-0">
            Správa a schvalování faktur · {allFaktury.length} faktur celkem
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted fs-13">Období:</span>
            <input
              type="date"
              className="form-control form-control-sm"
              value={periodOd}
              onChange={(e) => setPeriodOd(e.target.value)}
              style={{ width: 140 }}
            />
            <span className="text-muted">–</span>
            <input
              type="date"
              className="form-control form-control-sm"
              value={periodDo}
              onChange={(e) => setPeriodDo(e.target.value)}
              style={{ width: 140 }}
            />
          </div>
          {keSchvaleni.length > 0 && (
            <button
              className="btn btn-warning btn-sm fw-semibold"
              onClick={spustitSchvalovani}
            >
              <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" style={{ fontSize: 16 }} />
              Spustit schvalování ({keSchvaleni.length})
            </button>
          )}
          <button className="btn btn-light btn-sm" onClick={() => {
            setNovaFa((f) => ({ ...f, provozovna: selectedProvozovna === 'all' ? 'cg-brno' : selectedProvozovna }));
            setShowNovaFaktura(true);
          }}>
            Nová faktura
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => update({ selectedSection: 'platby' })}
          >
            Přejít na platby →
          </button>
        </div>
      </div>

      {/* Alert strips – SOURCE: Bootstrap .alert.alert-{danger|warning|info} */}
      {(poSplatCnt > 0 || neschvaleneCnt > 0 || splatneVObdobi > 0) && (
        <div className="d-flex flex-column gap-2 mb-4">
          {poSplatCnt > 0 && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-0">
              <iconify-icon icon="solar:danger-triangle-bold-duotone" className="fs-5 flex-shrink-0" />
              <span className="flex-grow-1">
                <strong>{poSplatCnt} faktur po splatnosti</strong> – vyžadují okamžitou pozornost
              </span>
              <span className="alert-link fw-semibold text-nowrap ms-auto" style={{ cursor: 'pointer' }} onClick={() => setStavFilter('po-splatnosti')}>
                Zobrazit →
              </span>
            </div>
          )}
          {neschvaleneCnt > 0 && (
            <div className="alert alert-warning d-flex align-items-center gap-2 mb-0">
              <iconify-icon icon="solar:clock-circle-bold-duotone" className="fs-5 flex-shrink-0" />
              <span className="flex-grow-1">
                <strong>{neschvaleneCnt} faktur čeká na schválení</strong> – nemohou být odeslány k platbě
              </span>
              <span className="alert-link fw-semibold text-nowrap ms-auto" style={{ cursor: 'pointer' }} onClick={() => setStavFilter('neschvalena')}>
                Schválit →
              </span>
            </div>
          )}
          {splatneVObdobi > 0 && (
            <div className="alert alert-info d-flex align-items-center gap-2 mb-0">
              <iconify-icon icon="solar:calendar-bold-duotone" className="fs-5 flex-shrink-0" />
              <span className="flex-grow-1">
                <strong>{splatneVObdobi} faktur splatných v tomto týdnu</strong>
              </span>
              <span className="alert-link fw-semibold text-nowrap ms-auto" style={{ cursor: 'pointer' }} onClick={() => setStavFilter('tydni')}>
                Filtrovat →
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPI strip */}
      <PlatbyKPIStrip
        provozovna={selectedProvozovna}
        periodOd={periodOd}
        periodDo={periodDo}
      />

      {/* Záložky Přijaté / Vydané – SOURCE: Bootstrap .nav.nav-tabs */}
      <ul className="nav nav-tabs mb-3">
        {([
          { value: 'all',     label: 'Všechny faktury' },
          { value: 'prijata', label: 'Přijaté' },
          { value: 'vydana',  label: 'Vydané' },
        ] as { value: TypDokladu | 'all'; label: string }[]).map((t) => (
          <li key={t.value} className="nav-item">
            <button
              className={`nav-link${typDokladu === t.value ? ' active' : ''}`}
              onClick={() => { setTypDokladu(t.value); setSelectedIds(new Set()); }}
            >
              {t.label}
              {t.value !== 'all' && (
                <span className="badge bg-secondary-subtle text-secondary ms-2 fw-normal">
                  {allFaktury.filter((f) => f.typDokladu === t.value).length}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Filter bar – SOURCE: Larkon .card > .card-body s form prvky */}
      <div className="card mb-4">
        <div className="card-body py-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-muted fs-13">Filtr:</span>

            {/* SOURCE: Bootstrap .form-select.form-select-sm */}
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={kategorieFilter}
              onChange={(e) => setKategorieFilter(e.target.value)}
            >
              <option value="all">Všechny kategorie</option>
              {(Object.keys(KATEGORIE_LABELS) as Array<keyof typeof KATEGORIE_LABELS>).map((k) => (
                <option key={k} value={k}>{KATEGORIE_LABELS[k]}</option>
              ))}
            </select>

            <select
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={provozovnaFilter}
              onChange={(e) => { setProvozovnaFilter(e.target.value); setSelectedIds(new Set()); }}
            >
              <option value="all">Všechna střediska</option>
              {PROVOZOVNY.filter((p) => p.status === 'active').map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={stavFilter}
              onChange={(e) => setStavFilter(e.target.value)}
            >
              <option value="all">Všechny stavy</option>
              <option value="schvalena">Schválené</option>
              <option value="neschvalena">Neschválené</option>
              <option value="zamitnuta">Zamítnuté</option>
              <option value="zastavena">Zastavené / Pozdržet</option>
              <option value="po-splatnosti">Po splatnosti</option>
              <option value="tydni">Splatné tento týden</option>
            </select>

            {/* Quick-filter badges – SOURCE: Larkon .badge.bg-{color}-subtle */}
            <div className="d-flex gap-2 ms-1">
              {poSplatCnt > 0 && (
                <button
                  className={`badge border-0 ${stavFilter === 'po-splatnosti' ? 'bg-danger text-white' : 'bg-danger-subtle text-danger'}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setStavFilter((s) => s === 'po-splatnosti' ? 'all' : 'po-splatnosti')}
                >
                  <iconify-icon icon="solar:danger-triangle-bold-duotone" className="me-1" />
                  Po splatnosti ({poSplatCnt})
                </button>
              )}
              {neschvaleneCnt > 0 && (
                <button
                  className={`badge border-0 ${stavFilter === 'neschvalena' ? 'bg-warning text-dark' : 'bg-warning-subtle text-warning'}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setStavFilter((s) => s === 'neschvalena' ? 'all' : 'neschvalena')}
                >
                  <iconify-icon icon="solar:clock-circle-bold-duotone" className="me-1" />
                  Ke schválení ({neschvaleneCnt})
                </button>
              )}
            </div>

            {(kategorieFilter !== 'all' || stavFilter !== 'all' || provozovnaFilter !== 'all') && (
              <button
                className="btn btn-link btn-sm ms-auto text-muted"
                onClick={() => { setKategorieFilter('all'); setStavFilter('all'); setProvozovnaFilter('all'); }}
              >
                Zrušit filtry ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabulka faktur */}
      <FakturyTable
        provozovna={(provozovnaFilter !== 'all' ? provozovnaFilter : selectedProvozovna) as ProvozovnaId}
        periodOd={periodOd}
        periodDo={periodDo}
        kategorieFilter={kategorieFilter}
        stavFilter={stavFilter}
        typDokladu={typDokladu}
        selectedIds={selectedIds}
        onToggle={toggleFa}
        onToggleAll={toggleAllFa}
        processingDays={PROCESSING_DAYS_DEFAULT}
        localStavy={localStavy}
        localPrirazeni={localPrirazeni}
        onRowClick={(id) => {
          setDrawerFakturaId(id);
          if (!schvalovaniQueue.includes(id)) setSchvalovaniQueue([]);
        }}
      />

      {/* Sticky bulk akční bar
          CUSTOM: sticky bottom bar – není v Larkon, v produkci Bootstrap .sticky-bottom */}
      {selectedIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
          }}
        >
          <div className="lk-custom d-flex align-items-center gap-3 px-4 py-3 bg-white rounded shadow">
            <div className="lk-custom-label">CUSTOM: Sticky bulk-action bar</div>
            <span className="fw-semibold fs-13">{selectedIds.size} faktur vybráno</span>
            <button className="btn btn-light btn-sm" onClick={() => setSelectedIds(new Set())}>
              Zrušit výběr
            </button>
            <button
              className="btn btn-success btn-sm"
              onClick={handleBulkSchvalit}
            >
              <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
              Schválit vybrané ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Modal – Nová faktura */}
      {showNovaFaktura && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 200 }} onClick={() => setShowNovaFaktura(false)} />
          <div className="modal show d-block" style={{ zIndex: 300 }} tabIndex={-1}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">

                <div className="modal-header">
                  <h5 className="modal-title">Nová faktura</h5>
                  <button className="btn-close" onClick={() => setShowNovaFaktura(false)} />
                </div>

                <div className="modal-body">
                  <div className="row g-3">
                    {/* Typ dokladu */}
                    <div className="col-12">
                      <label className="form-label fw-semibold fs-13">Typ dokladu</label>
                      <div className="d-flex gap-3">
                        {(['prijata', 'vydana'] as TypDokladu[]).map((t) => (
                          <div key={t} className="form-check">
                            <input
                              type="radio"
                              className="form-check-input"
                              id={`typ-${t}`}
                              checked={novaFa.typDokladu === t}
                              onChange={() => setNovaFa((f) => ({ ...f, typDokladu: t }))}
                            />
                            <label className="form-check-label" htmlFor={`typ-${t}`}>
                              {t === 'prijata' ? 'Přijatá faktura' : 'Vydaná faktura'}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dodavatel + číslo */}
                    <div className="col-8">
                      <label className="form-label fw-semibold fs-13">
                        {novaFa.typDokladu === 'prijata' ? 'Dodavatel' : 'Odběratel'}
                        <span className="text-danger ms-1">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder={novaFa.typDokladu === 'prijata' ? 'Název dodavatele...' : 'Název odběratele...'}
                        value={novaFa.dodavatel}
                        onChange={(e) => setNovaFa((f) => ({ ...f, dodavatel: e.target.value }))}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold fs-13">Číslo faktury</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="FAK-2026-…"
                        value={novaFa.cislo}
                        onChange={(e) => setNovaFa((f) => ({ ...f, cislo: e.target.value }))}
                      />
                    </div>

                    {/* Kategorie + provozovna */}
                    <div className="col-6">
                      <label className="form-label fw-semibold fs-13">Kategorie <span className="text-danger">*</span></label>
                      <select
                        className="form-select form-select-sm"
                        value={novaFa.kategorie}
                        onChange={(e) => setNovaFa((f) => ({ ...f, kategorie: e.target.value as FakturaKategorie }))}
                      >
                        {(Object.keys(KATEGORIE_LABELS) as FakturaKategorie[]).map((k) => (
                          <option key={k} value={k}>{KATEGORIE_LABELS[k]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold fs-13">Provozovna <span className="text-danger">*</span></label>
                      <select
                        className="form-select form-select-sm"
                        value={novaFa.provozovna}
                        onChange={(e) => setNovaFa((f) => ({ ...f, provozovna: e.target.value }))}
                      >
                        {PROVOZOVNY.filter((p) => p.status === 'active').map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Částka + datum + splatnost */}
                    <div className="col-4">
                      <label className="form-label fw-semibold fs-13">Částka (Kč) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="0"
                        value={novaFa.castka}
                        onChange={(e) => setNovaFa((f) => ({ ...f, castka: e.target.value }))}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold fs-13">Datum vystavení</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={novaFa.datum}
                        onChange={(e) => setNovaFa((f) => ({ ...f, datum: e.target.value }))}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-semibold fs-13">Splatnost <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={novaFa.splatnost}
                        onChange={(e) => setNovaFa((f) => ({ ...f, splatnost: e.target.value }))}
                      />
                    </div>

                    {/* Přiřadit ke schválení */}
                    <div className="col-12">
                      <label className="form-label fw-semibold fs-13">Přiřadit ke schválení</label>
                      <select
                        className="form-select form-select-sm"
                        value={novaFa.prirazenaOsoba}
                        onChange={(e) => setNovaFa((f) => ({ ...f, prirazenaOsoba: e.target.value }))}
                      >
                        <option value="">— Zatím nepřiřazovat —</option>
                        {SCHVALOVACI_OSOBY.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.jmeno} ({o.role === 'fakturant' ? 'Fakturant' : o.role === 'schvalovatel' ? 'Schvalovatel' : 'Majitel'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Poznámka */}
                    <div className="col-12">
                      <label className="form-label fw-semibold fs-13">Poznámka</label>
                      <textarea
                        className="form-control form-control-sm"
                        rows={2}
                        placeholder="Volitelná poznámka..."
                        value={novaFa.poznamka}
                        onChange={(e) => setNovaFa((f) => ({ ...f, poznamka: e.target.value }))}
                      />
                    </div>

                    {/* Příloha – CUSTOM placeholder */}
                    <div className="col-12">
                      <label className="form-label fw-semibold fs-13">Příloha (doklad)</label>
                      <div
                        className="lk-custom border rounded d-flex align-items-center justify-content-center"
                        style={{ height: 80, background: '#f8f9fa', cursor: 'pointer' }}
                      >
                        <div className="lk-custom-label">CUSTOM: file upload (drag & drop)</div>
                        <div className="text-center text-muted fs-13">
                          <iconify-icon icon="solar:upload-bold-duotone" style={{ fontSize: 22 }} className="d-block mx-auto mb-1" />
                          Přetáhněte PDF nebo klikněte pro výběr
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn btn-light btn-sm" onClick={() => setShowNovaFaktura(false)}>
                    Zrušit
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowNovaFaktura(false)}
                  >
                    <iconify-icon icon="solar:diskette-bold-duotone" className="me-1" style={{ fontSize: 16 }} />
                    Uložit fakturu
                  </button>
                </div>

              </div>
            </div>
          </div>
        </>
      )}

      {/* Drawer – schválení faktury */}
      {drawerFaktura && (
        <FakturaDetailDrawer
          faktura={drawerFaktura}
          localStav={localStavy[drawerFaktura.id] ?? drawerFaktura.stav}
          localPoznamka={localPoznamky[drawerFaktura.id] ?? ''}
          localStredisko={localStrediska[drawerFaktura.id] ?? ''}
          localPrirazeni={localPrirazeni[drawerFaktura.id] ?? ''}
          localSchvalil={localSchvalil[drawerFaktura.id] ?? ''}
          localDatumSchvaleni={localDatumSchvaleni[drawerFaktura.id] ?? ''}
          queueIndex={queueIndex >= 0 ? queueIndex : 0}
          queueTotal={schvalovaniQueue.length}
          onClose={() => setDrawerFakturaId(null)}
          onSchvalit={handleSchvalit}
          onZamitout={handleZamitout}
          onOdlozit={handleOdlozit}
          onPoznamkaChange={(id, val) => setLocalPoznamky((p) => ({ ...p, [id]: val }))}
          onStrediskoChange={(id, val) => setLocalStrediska((p) => ({ ...p, [id]: val }))}
          onPrirazeniChange={(id, val) => setLocalPrirazeni((p) => ({ ...p, [id]: val }))}
          onPrev={() => queueIndex > 0 && setDrawerFakturaId(schvalovaniQueue[queueIndex - 1])}
          onNext={() => queueIndex < schvalovaniQueue.length - 1 && setDrawerFakturaId(schvalovaniQueue[queueIndex + 1])}
        />
      )}
    </>
  );
}
