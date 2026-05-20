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
import type { TypDokladu, FakturaStavPlatby, FakturaKategorie, MatchingStav, FakturaForma } from '../platbyData';
import {
  getFakturyForProvozovna,
  getMatchingData,
  isPoSplatnosti,
  isSplatneVObdobi,
  TYDEN_OD,
  TYDEN_DO,
  PROCESSING_DAYS_DEFAULT,
  KATEGORIE_LABELS,
  SCHVALOVACI_OSOBY,
} from '../platbyData';

export type SortCol = 'cislo' | 'dodavatel' | 'castka' | 'splatnost' | 'odeslatDo' | 'stav' | null;

const STAV_CHIPS: { value: FakturaStavPlatby; label: string }[] = [
  { value: 'nova',          label: 'Nová' },
  { value: 'ke-schvaleni',  label: 'Ke schválení' },
  { value: 'schvalena',     label: 'Schválená' },
  { value: 'zamitnuta',     label: 'Zamítnutá' },
  { value: 'zastavena',     label: 'Zastavená' },
  { value: 'zaplacena',     label: 'Zaplacená' },
];

const FORMA_CHIPS: { value: FakturaForma; label: string; icon: string }[] = [
  { value: 'zalohova', label: 'Zálohová', icon: 'solar:wallet-money-bold-duotone' },
  { value: 'dobropis', label: 'Dobropis', icon: 'solar:undo-left-round-bold-duotone' },
  { value: 'offset',   label: 'Offset',   icon: 'solar:transfer-horizontal-bold-duotone' },
];

const MATCHING_CHIPS: { value: MatchingStav; label: string }[] = [
  { value: 'sparovana',          label: 'Spárováno' },
  { value: 'nesedi-dl',          label: 'Nesedí DL' },
  { value: 'duplikat',           label: 'Duplicita' },
  { value: 'castecne-sparovana', label: 'Část. spárováno' },
  { value: 'ceka-na-sparovani',  label: 'Čeká na párování' },
  { value: 'bez-dl',             label: 'Bez DL' },
];

export interface SessionAuditEntry {
  cas: string;
  kdo: string;
  akce: string;
  icon: string;
  color: string;
  typ?: 'schvaleni' | 'editace' | 'parovani' | 'komunikace' | 'stav' | 'priloha' | 'zadani' | 'prirazeni';
}
import { PROVOZOVNY } from '../data';
import PlatbyKPIStrip from './PlatbyKPIStrip';
import FakturyTable from './FakturyTable';
import FakturySidePanel from './FakturySidePanel';
import type { KomentarEntry } from './FakturySidePanel';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

export default function FakturyView({ state, update }: Props) {
  const { selectedProvozovna } = state;

  const [periodOd,        setPeriodOd]        = useState(TYDEN_OD);
  const [periodDo,        setPeriodDo]        = useState(TYDEN_DO);
  const [kategorieFilter,    setKategorieFilter]    = useState('all');
  const [stavFilters,        setStavFilters]        = useState<Set<FakturaStavPlatby>>(new Set());
  const [matchingFilters,    setMatchingFilters]    = useState<Set<MatchingStav>>(new Set());
  const [formaFilters,       setFormaFilters]       = useState<Set<FakturaForma>>(new Set());
  const [presetFilters,      setPresetFilters]      = useState<Set<'po-splatnosti' | 'tydni'>>(new Set());
  const [castkaOd,           setCastkaOd]           = useState('');
  const [castkaDo,           setCastkaDo]           = useState('');
  const [sortBy,             setSortBy]             = useState<SortCol>('splatnost');
  const [sortDir,            setSortDir]            = useState<'asc' | 'desc'>('asc');
  const [typDokladu,         setTypDokladu]         = useState<TypDokladu | 'all'>('all');
  const [search,             setSearch]             = useState('');
  const [selectedIds,        setSelectedIds]        = useState<Set<string>>(new Set());

  function toggleSet<T>(s: Set<T>, v: T): Set<T> {
    const n = new Set(s); n.has(v) ? n.delete(v) : n.add(v); return n;
  }
  function handleSort(col: SortCol) {
    if (sortBy === col) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col); setSortDir('asc');
    }
  }

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
  const [localAudit,         setLocalAudit]        = useState<Record<string, SessionAuditEntry[]>>({});
  const [localKomentare,     setLocalKomentare]    = useState<Record<string, KomentarEntry[]>>({});

  function pushAudit(id: string, entry: SessionAuditEntry) {
    setLocalAudit((prev) => ({ ...prev, [id]: [entry, ...(prev[id] ?? [])] }));
  }

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

  const now = () => new Date().toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  function handleSchvalit(id: string) {
    setLocalStavy((prev) => ({ ...prev, [id]: 'schvalena' }));
    setLocalSchvalil((prev) => ({ ...prev, [id]: AKTUALNI_UZIVATEL.jmeno }));
    setLocalDatumSchvaleni((prev) => ({ ...prev, [id]: dnesStr }));
    pushAudit(id, { cas: now(), kdo: AKTUALNI_UZIVATEL.jmeno, akce: 'Faktura schválena k úhradě', icon: 'solar:check-circle-bold-duotone', color: '#198754', typ: 'schvaleni' });
    if (queueIndex >= 0 && queueIndex < schvalovaniQueue.length - 1) {
      setDrawerFakturaId(schvalovaniQueue[queueIndex + 1]);
    }
  }
  function handleZamitout(id: string) {
    setLocalStavy((prev) => ({ ...prev, [id]: 'zamitnuta' }));
    setLocalSchvalil((prev) => ({ ...prev, [id]: AKTUALNI_UZIVATEL.jmeno }));
    setLocalDatumSchvaleni((prev) => ({ ...prev, [id]: dnesStr }));
    pushAudit(id, { cas: now(), kdo: AKTUALNI_UZIVATEL.jmeno, akce: 'Faktura zamítnuta', icon: 'solar:close-circle-bold-duotone', color: '#dc3545', typ: 'schvaleni' });
  }
  function handleOdlozit(id: string) {
    const prevStav = localStavy[id];
    setLocalStavy((prev) => ({ ...prev, [id]: 'ke-schvaleni' }));
    setLocalSchvalil((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setLocalDatumSchvaleni((prev) => { const n = { ...prev }; delete n[id]; return n; });
    const akce = prevStav === 'zastavena' ? 'Obnoveno ke schválení' : prevStav === 'zamitnuta' ? 'Přehodnoceno – vráceno ke schválení' : 'Odloženo ke schválení';
    pushAudit(id, { cas: now(), kdo: AKTUALNI_UZIVATEL.jmeno, akce, icon: 'solar:refresh-bold-duotone', color: '#0dcaf0', typ: 'stav' });
  }

  function handleRematch(id: string) {
    pushAudit(id, {
      cas: now(),
      kdo: AKTUALNI_UZIVATEL.jmeno,
      akce: 'Spuštěno manuální přepárování s DL',
      icon: 'solar:refresh-circle-bold-duotone',
      color: '#0dcaf0',
      typ: 'parovani',
    });
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
  const nesediDLCnt  = allFaktury.filter((f) => getMatchingData(f.id)?.stav === 'nesedi-dl').length;
  const duplikatCnt  = allFaktury.filter((f) => getMatchingData(f.id)?.stav === 'duplikat').length;
  const cekaCnt      = allFaktury.filter((f) => getMatchingData(f.id)?.stav === 'ceka-na-sparovani').length;
  // Automatizace (mock cron status — v produkci by jely background workery)
  const CRON_INTERVAL_MIN = 15;
  const cronLast = '14:32';
  const cronNext = '14:47';

  void PROCESSING_DAYS_DEFAULT;

  return (
    <>
      {/* ACTION BAR – SOURCE: Larkon .page-title-box (title odstraněn, zobrazen v topbaru) */}
      <div className="page-title-box">
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
      {(poSplatCnt > 0 || neschvaleneCnt > 0 || splatneVObdobi > 0 || duplikatCnt > 0) && (
        <div className="d-flex flex-column gap-2 mb-4">
          {duplikatCnt > 0 && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-0">
              <iconify-icon icon="solar:copy-bold-duotone" className="fs-5 flex-shrink-0" />
              <span className="flex-grow-1">
                <strong>{duplikatCnt} {duplikatCnt === 1 ? 'duplicitní faktura' : duplikatCnt < 5 ? 'duplicitní faktury' : 'duplicitních faktur'}</strong> – riziko dvojí platby, vyžaduje okamžité prověření
              </span>
              <span className="alert-link fw-semibold text-nowrap ms-auto" style={{ cursor: 'pointer' }} onClick={() => setMatchingFilters(new Set(['duplikat']))}>
                Zkontrolovat →
              </span>
            </div>
          )}
          {poSplatCnt > 0 && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-0">
              <iconify-icon icon="solar:danger-triangle-bold-duotone" className="fs-5 flex-shrink-0" />
              <span className="flex-grow-1">
                <strong>{poSplatCnt} faktur po splatnosti</strong> – vyžadují okamžitou pozornost
              </span>
              <span className="alert-link fw-semibold text-nowrap ms-auto" style={{ cursor: 'pointer' }} onClick={() => setPresetFilters(new Set(['po-splatnosti']))}>
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
              <span className="alert-link fw-semibold text-nowrap ms-auto" style={{ cursor: 'pointer' }} onClick={() => setStavFilters(new Set(['nova', 'ke-schvaleni']))}>
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
              <span className="alert-link fw-semibold text-nowrap ms-auto" style={{ cursor: 'pointer' }} onClick={() => setPresetFilters(new Set(['tydni']))}>
                Filtrovat →
              </span>
            </div>
          )}
        </div>
      )}

      {/* Automatizace – cron status mini-card */}
      <div
        className="d-flex align-items-center gap-3 flex-wrap px-3 py-2 mb-3 rounded"
        style={{ background: '#f8f9fa', border: '1px solid #e9ecef', fontSize: 12 }}
      >
        <div className="d-flex align-items-center gap-2">
          <span
            className="rounded-circle d-inline-block"
            style={{ width: 8, height: 8, background: '#198754', boxShadow: '0 0 0 3px rgba(25,135,84,0.15)' }}
          />
          <span className="fw-semibold">Automatizace párování</span>
          <span className="badge bg-success-subtle text-success" style={{ fontSize: 10 }}>Aktivní</span>
        </div>

        <div className="d-flex align-items-center gap-1 text-muted">
          <iconify-icon icon="solar:refresh-circle-bold-duotone" style={{ fontSize: 13 }} />
          <span>Interval:</span>
          <span className="fw-semibold text-dark">{CRON_INTERVAL_MIN} min</span>
        </div>

        <div className="d-flex align-items-center gap-1 text-muted">
          <iconify-icon icon="solar:clock-circle-bold-duotone" style={{ fontSize: 13 }} />
          <span>Poslední běh:</span>
          <span className="fw-semibold text-dark czk-num">{cronLast}</span>
        </div>

        <div className="d-flex align-items-center gap-1 text-muted">
          <iconify-icon icon="solar:alarm-bold-duotone" style={{ fontSize: 13 }} />
          <span>Příští:</span>
          <span className="fw-semibold text-dark czk-num">{cronNext}</span>
        </div>

        <div className="d-flex align-items-center gap-3 ms-auto">
          {cekaCnt > 0 && (
            <div className="d-flex align-items-center gap-1">
              <iconify-icon icon="solar:hourglass-bold-duotone" style={{ fontSize: 13, color: '#0dcaf0' }} />
              <span className="text-muted">Ve frontě:</span>
              <span className="fw-bold" style={{ color: '#0dcaf0' }}>{cekaCnt}</span>
            </div>
          )}
          {nesediDLCnt > 0 && (
            <div className="d-flex align-items-center gap-1">
              <iconify-icon icon="solar:refresh-bold-duotone" style={{ fontSize: 13, color: '#ffc107' }} />
              <span className="text-muted">K přepárování:</span>
              <span className="fw-bold text-warning">{nesediDLCnt}</span>
            </div>
          )}
          {duplikatCnt > 0 && (
            <div className="d-flex align-items-center gap-1">
              <iconify-icon icon="solar:copy-bold-duotone" style={{ fontSize: 13, color: '#dc3545' }} />
              <span className="text-muted">Duplicity blokovány:</span>
              <span className="fw-bold text-danger">{duplikatCnt}</span>
            </div>
          )}
        </div>
      </div>

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

      {/* Filter bar */}
      <div className="card mb-4">
        <div className="card-body py-2 d-flex flex-column gap-2">

          {/* Řádek 1 — search, kategorie, částka, presety, reset */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="position-relative">
              <iconify-icon icon="solar:magnifer-bold-duotone"
                style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9097a7' }} />
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Hledat dodavatele…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 28, width: 180 }}
              />
            </div>

            <select className="form-select form-select-sm" style={{ width: 'auto' }}
              value={kategorieFilter} onChange={(e) => setKategorieFilter(e.target.value)}>
              <option value="all">Všechny kategorie</option>
              {(Object.keys(KATEGORIE_LABELS) as Array<keyof typeof KATEGORIE_LABELS>).map((k) => (
                <option key={k} value={k}>{KATEGORIE_LABELS[k]}</option>
              ))}
            </select>

            <div className="d-flex align-items-center gap-1">
              <span className="text-muted fs-12">Částka:</span>
              <input
                type="number"
                className="form-control form-control-sm czk-num"
                placeholder="od"
                value={castkaOd}
                onChange={(e) => setCastkaOd(e.target.value)}
                style={{ width: 90 }}
              />
              <span className="text-muted">–</span>
              <input
                type="number"
                className="form-control form-control-sm czk-num"
                placeholder="do"
                value={castkaDo}
                onChange={(e) => setCastkaDo(e.target.value)}
                style={{ width: 90 }}
              />
              <span className="text-muted fs-12">Kč</span>
            </div>

            <div className="d-flex gap-1 ms-1 flex-wrap">
              {poSplatCnt > 0 && (
                <button className={`badge border-0 ${presetFilters.has('po-splatnosti') ? 'bg-danger text-white' : 'bg-danger-subtle text-danger'}`}
                  style={{ cursor: 'pointer' }} onClick={() => setPresetFilters((p) => toggleSet(p, 'po-splatnosti'))}>
                  <iconify-icon icon="solar:danger-triangle-bold-duotone" className="me-1" />
                  Po splatnosti ({poSplatCnt})
                </button>
              )}
              <button className={`badge border-0 ${presetFilters.has('tydni') ? 'bg-info text-white' : 'bg-info-subtle text-info'}`}
                style={{ cursor: 'pointer' }} onClick={() => setPresetFilters((p) => toggleSet(p, 'tydni'))}>
                <iconify-icon icon="solar:calendar-bold-duotone" className="me-1" />
                Tento týden
              </button>
            </div>

            {(kategorieFilter !== 'all' || stavFilters.size > 0 || matchingFilters.size > 0 || formaFilters.size > 0 || presetFilters.size > 0 || castkaOd !== '' || castkaDo !== '' || search !== '') && (
              <button className="btn btn-link btn-sm ms-auto text-muted"
                onClick={() => {
                  setKategorieFilter('all');
                  setStavFilters(new Set());
                  setMatchingFilters(new Set());
                  setFormaFilters(new Set());
                  setPresetFilters(new Set());
                  setCastkaOd('');
                  setCastkaDo('');
                  setSearch('');
                }}>
                Zrušit filtry ×
              </button>
            )}
          </div>

          {/* Řádek 2 — Stav (multiselect chips) */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-muted fs-12" style={{ minWidth: 56 }}>Stav:</span>
            {STAV_CHIPS.map((c) => {
              const active = stavFilters.has(c.value);
              return (
                <button
                  key={c.value}
                  className={`badge border-0 ${active ? 'bg-dark text-white' : 'bg-secondary-subtle text-secondary'}`}
                  style={{ cursor: 'pointer', fontSize: 11 }}
                  onClick={() => setStavFilters((p) => toggleSet(p, c.value))}
                >
                  {active && <iconify-icon icon="solar:check-circle-bold" className="me-1" style={{ fontSize: 11 }} />}
                  {c.label}
                </button>
              );
            })}
            {stavFilters.size > 0 && (
              <button className="btn btn-link btn-sm text-muted p-0 ms-1" style={{ fontSize: 11 }}
                onClick={() => setStavFilters(new Set())}>
                vyčistit
              </button>
            )}
          </div>

          {/* Řádek 3 — Párování (multiselect chips) */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-muted fs-12" style={{ minWidth: 56 }}>Párování:</span>
            {MATCHING_CHIPS.map((c) => {
              const active = matchingFilters.has(c.value);
              const isHot = c.value === 'duplikat' || c.value === 'nesedi-dl';
              return (
                <button
                  key={c.value}
                  className={`badge border-0 ${active
                    ? (c.value === 'duplikat' ? 'bg-danger text-white' : c.value === 'nesedi-dl' ? 'bg-warning text-dark' : 'bg-dark text-white')
                    : (isHot ? (c.value === 'duplikat' ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning') : 'bg-secondary-subtle text-secondary')}`}
                  style={{ cursor: 'pointer', fontSize: 11 }}
                  onClick={() => setMatchingFilters((p) => toggleSet(p, c.value))}
                >
                  {active && <iconify-icon icon="solar:check-circle-bold" className="me-1" style={{ fontSize: 11 }} />}
                  {c.label}
                  {c.value === 'duplikat' && duplikatCnt > 0 && ` (${duplikatCnt})`}
                  {c.value === 'nesedi-dl' && nesediDLCnt > 0 && ` (${nesediDLCnt})`}
                </button>
              );
            })}
            {matchingFilters.size > 0 && (
              <button className="btn btn-link btn-sm text-muted p-0 ms-1" style={{ fontSize: 11 }}
                onClick={() => setMatchingFilters(new Set())}>
                vyčistit
              </button>
            )}
          </div>

          {/* Řádek 4 — Účetní forma (zálohová / dobropis / offset) */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-muted fs-12" style={{ minWidth: 56 }}>Forma:</span>
            {FORMA_CHIPS.map((c) => {
              const active = formaFilters.has(c.value);
              const activeBg = c.value === 'dobropis' ? 'bg-danger text-white'
                : c.value === 'zalohova' ? 'bg-info text-white'
                : 'bg-dark text-white';
              const inactiveBg = c.value === 'dobropis' ? 'bg-danger-subtle text-danger'
                : c.value === 'zalohova' ? 'bg-info-subtle text-info'
                : 'bg-secondary-subtle text-secondary';
              return (
                <button
                  key={c.value}
                  className={`badge border-0 ${active ? activeBg : inactiveBg}`}
                  style={{ cursor: 'pointer', fontSize: 11 }}
                  onClick={() => setFormaFilters((p) => toggleSet(p, c.value))}
                >
                  <iconify-icon icon={c.icon} className="me-1" style={{ fontSize: 11 }} />
                  {c.label}
                </button>
              );
            })}
            {formaFilters.size > 0 && (
              <button className="btn btn-link btn-sm text-muted p-0 ms-1" style={{ fontSize: 11 }}
                onClick={() => setFormaFilters(new Set())}>
                vyčistit
              </button>
            )}
            <span className="text-muted fs-11 ms-2 fst-italic" style={{ fontSize: 10 }}>
              Speciální účetní případy — architecture ready
            </span>
          </div>

        </div>
      </div>

      {/* ── 2-sloupcový layout: seznam vlevo, side panel vpravo ── */}
      <div className="row g-4 align-items-start">
        <div className="col-xl-7 col-lg-8">
          <FakturyTable
            provozovna={selectedProvozovna as ProvozovnaId}
            periodOd={periodOd}
            periodDo={periodDo}
            kategorieFilter={kategorieFilter}
            stavFilters={stavFilters}
            matchingFilters={matchingFilters}
            formaFilters={formaFilters}
            presetFilters={presetFilters}
            castkaOd={castkaOd}
            castkaDo={castkaDo}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={handleSort}
            typDokladu={typDokladu}
            selectedIds={selectedIds}
            onToggle={toggleFa}
            onToggleAll={toggleAllFa}
            processingDays={PROCESSING_DAYS_DEFAULT}
            localStavy={localStavy}
            localPrirazeni={localPrirazeni}
            showExtraCols={false}
            showMatching={true}
            tableTitle="Přehled faktur"
            showZaplacene={stavFilters.has('zaplacena')}
            selectedRowId={drawerFakturaId}
            search={search}
            onRowClick={(id) => {
              setDrawerFakturaId((prev) => prev === id ? null : id);
              if (!schvalovaniQueue.includes(id)) setSchvalovaniQueue([]);
            }}
          />
        </div>
        <div className="col-xl-5 col-lg-4">
          <FakturySidePanel
            faktura={drawerFaktura}
            effectiveStav={drawerFaktura ? (localStavy[drawerFaktura.id] ?? drawerFaktura.stav) : 'nova'}
            localPoznamka={drawerFaktura ? (localPoznamky[drawerFaktura.id] ?? '') : ''}
            localSchvalil={drawerFaktura ? (localSchvalil[drawerFaktura.id] ?? '') : ''}
            localDatumSchvaleni={drawerFaktura ? (localDatumSchvaleni[drawerFaktura.id] ?? '') : ''}
            localPrirazeni={drawerFaktura ? (localPrirazeni[drawerFaktura.id] ?? '') : ''}
            onClose={() => setDrawerFakturaId(null)}
            onSchvalit={handleSchvalit}
            onZamitout={handleZamitout}
            onOdlozit={handleOdlozit}
            onPoznamkaChange={(id, val) => setLocalPoznamky((p) => ({ ...p, [id]: val }))}
            sessionAudit={drawerFaktura ? (localAudit[drawerFaktura.id] ?? []) : []}
            komentare={drawerFaktura ? (localKomentare[drawerFaktura.id] ?? []) : []}
            onAddKomentar={(id, entry) => {
              setLocalKomentare((p) => ({ ...p, [id]: [...(p[id] ?? []), entry] }));
              const preview = entry.zprava.length > 60 ? entry.zprava.slice(0, 60) + '…' : entry.zprava;
              pushAudit(id, {
                cas: entry.cas,
                kdo: entry.kdo,
                akce: `Komentář: „${preview}"`,
                icon: 'solar:chat-round-bold-duotone',
                color: '#6c757d',
                typ: 'komunikace',
              });
            }}
            onRematch={handleRematch}
          />
        </div>
      </div>

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
                    Uložit a zkontrolovat
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
