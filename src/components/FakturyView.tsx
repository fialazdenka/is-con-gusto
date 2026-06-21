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

import { useState, useCallback, useEffect, Fragment } from 'react';
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
  BANKOVNI_UCTY,
  VYDANE_SABLONY,
  PRAVNI_ENTITA,
  ENTITA_LABEL,
  getEffektivniStav,
} from '../platbyData';
import type { PravniEntita } from '../platbyData';
import type { PolozkaSablona } from '../platbyData';

export type SortCol = 'cislo' | 'dodavatel' | 'castka' | 'splatnost' | 'odeslatDo' | 'stav' | null;

// Stav chips pro PŘIJATÉ faktury (workflow schvalování)
const STAV_CHIPS: { value: FakturaStavPlatby; label: string }[] = [
  { value: 'nova',          label: 'Nová' },
  { value: 'ceka-na-schvaleni',  label: 'Ke schválení' },
  { value: 'schvalena',     label: 'Schválená' },
  { value: 'zamitnuta',     label: 'Zamítnutá' },
  { value: 'pozastavena',     label: 'Pozastavená' },
  { value: 'uhrazena',     label: 'Uhrazená' },
];
// Phase 8.4 (zápis 19. 6. 2026) — Stav chips pro VYDANÉ faktury (workflow vystavení → úhrada)
const STAV_CHIPS_VYDANE: { value: FakturaStavPlatby; label: string }[] = [
  { value: 'vystavena',   label: 'Vystavená' },
  { value: 'nezaplacena', label: 'Nezaplacená' },
  { value: 'zaplacena',   label: 'Zaplacená' },
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
  // Phase 8.5 (zápis 10. 6. 2026) — Celofiremní pohled napříč právními entitami
  const [entitaFilter,    setEntitaFilter]    = useState<'all-entity' | PravniEntita>('all-entity');
  const [kategorieFilter,    setKategorieFilter]    = useState('all');
  const [stavFilters,        setStavFilters]        = useState<Set<FakturaStavPlatby>>(new Set());
  const [matchingFilters,    setMatchingFilters]    = useState<Set<MatchingStav>>(new Set());
  const [formaFilters,       setFormaFilters]       = useState<Set<FakturaForma>>(new Set());
  const [presetFilters,      setPresetFilters]      = useState<Set<'po-splatnosti' | 'tydni' | 'uzamcene'>>(new Set());
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

  // Phase 8 (zápis 19. 6. 2026) — Nová faktura / Nová proforma / Vystavit fakturu jsou samostatné podstránky,
  // ne modal okna. Přepíná se mezi list / new-faktura / new-proforma / new-vydana view.
  // Phase 8.4 (zápis 19. 6.) — Vydanou fakturu v systému KOMPLETNĚ vystavujeme (jako ve Fakturoidu —
  // položky, výpočet DPH, live preview), ne jen zaznamenáváme. Proto má vlastní full-page editor.
  // Phase 8.4 (zápis 19. 6.) — 'new-vydana' a 'new-vydana-proforma' používají stejný full editor,
  // jen se liší flagem jeProforma (badge "PROFORMA", warning "vystavit finální fakturu").
  // 'new-faktura' = záznam přijaté faktury; 'new-proforma' = legacy záznam přijaté proformy.
  type ViewMode = 'list' | 'new-faktura' | 'new-proforma' | 'new-vydana' | 'new-vydana-proforma';
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const showNovaFaktura  = viewMode === 'new-faktura';
  const showNovaProforma = viewMode === 'new-proforma';
  const showVystavit     = viewMode === 'new-vydana' || viewMode === 'new-vydana-proforma';
  const isProformaVystavit = viewMode === 'new-vydana-proforma';
  const setShowNovaFaktura = (v: boolean) => setViewMode(v ? 'new-faktura' : 'list');
  const setShowNovaProforma = (v: boolean) => setViewMode(v ? 'new-proforma' : 'list');
  const setShowVystavit     = (v: boolean) => setViewMode(v ? 'new-vydana' : 'list');
  const setShowVystavitProforma = (v: boolean) => setViewMode(v ? 'new-vydana-proforma' : 'list');
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
  // Phase 8.3 (zápis 19. 6. 2026) — sledování, zda byl k formuláři přiložen dokument (PDF).
  // Při uložení bez dokumentu se zobrazí potvrzovací dialog (per zápis 10. 6. — fakturanti
  // občas ukládají bez PDF a pak ho dohledávají; systém má upozornit).
  const [novaFaDocument, setNovaFaDocument] = useState<string | null>(null);
  const [novaProfDocument, setNovaProfDocument] = useState<string | null>(null);
  const [showNoDocConfirm, setShowNoDocConfirm] = useState<null | { typ: 'faktura' | 'proforma' }>(null);

  // Phase 8.4 (zápis 19. 6. 2026) — Vystavovaná faktura (full invoice creator jako Fakturoid)
  // originSablonaId — pokud byla položka vložena ze šablony (zobrazí se ⭐ indikátor)
  type VystPolozka = { id: string; nazev: string; jednotka: string; pocet: number; cenaJedn: number; dphSazba: number; originSablonaId?: string };
  // Vlastní šablony (provozní si tvoří přímo z položek faktury, persistovaly by se na user profil)
  const [customSablony, setCustomSablony] = useState<PolozkaSablona[]>([]);
  // Inline form na uložení řádku jako šablony (per id řádku)
  const [savingTemplateFor, setSavingTemplateFor] = useState<string | null>(null);
  const [savingTemplateKat, setSavingTemplateKat] = useState<string>('Vlastní');
  const [novaVyd, setNovaVyd] = useState({
    cislo: 'VYD-2026-0023',
    pravniEntita: 'con-gusto' as 'con-gusto' | 'u-capa' | 'korek',
    provozovna: selectedProvozovna === 'all' ? 'cg-brno' : selectedProvozovna,
    // Odběratel
    odbNazev: '',
    odbIco: '',
    odbDic: '',
    odbAdresa: '',
    odbUcet: '',      // Phase 8.5 (zápis 10. 6.) — CZ číslo účtu odběratele (volitelné, pro inkaso)
    odbIban: '',
    // Data + platba
    datumVystaveni: '2026-04-23',
    duzp: '2026-04-23',
    splatnost: '2026-05-07',
    bankovniUcet: '',  // cisloUctu — naplní se z prvního dostupného účtu
    formaPlatby: 'prevod' as 'prevod' | 'hotovost' | 'karta',
    konstSymbol: '0308',
    poznamka: '',
  });
  const [vystPolozky, setVystPolozky] = useState<VystPolozka[]>([
    { id: 'p1', nazev: '', jednotka: 'ks', pocet: 1, cenaJedn: 0, dphSazba: 21 },
  ]);
  // Phase 8.4 — Živý náhled defaultně skrytý (form přes celou šířku). Toggle v hlavičce editoru.
  const [vystShowPreview, setVystShowPreview] = useState(false);
  function addPolozka() {
    setVystPolozky((p) => [...p, { id: 'p' + (p.length + 1), nazev: '', jednotka: 'ks', pocet: 1, cenaJedn: 0, dphSazba: 21 }]);
  }
  function removePolozka(id: string) {
    setVystPolozky((p) => p.filter((it) => it.id !== id));
  }
  function updatePolozka(id: string, patch: Partial<VystPolozka>) {
    setVystPolozky((p) => p.map((it) => it.id === id ? { ...it, ...patch } : it));
  }
  // Phase 8.4 — vloží šablonu jako novou položku (pokud první položka je prázdná, nahradí ji)
  function insertSablona(sab: PolozkaSablona) {
    const nova: VystPolozka = {
      id: 'p' + Date.now(),
      nazev: sab.nazev,
      jednotka: sab.jednotka,
      pocet: 1,
      cenaJedn: sab.cenaJednDefault ?? 0,
      dphSazba: sab.dphSazba,
      originSablonaId: sab.id,
    };
    setVystPolozky((p) => {
      const first = p[0];
      if (p.length === 1 && first && !first.nazev && first.cenaJedn === 0) return [nova];
      return [...p, nova];
    });
  }
  // Uloží konkrétní řádek jako vlastní šablonu (do customSablony state)
  function saveAsTemplate(id: string, kategorie: string) {
    const polozka = vystPolozky.find((p) => p.id === id);
    if (!polozka || !polozka.nazev) return;
    const nova: PolozkaSablona = {
      id: 'cs' + Date.now(),
      nazev: polozka.nazev,
      kategorie,
      jednotka: polozka.jednotka,
      dphSazba: polozka.dphSazba as 0 | 12 | 21,
      cenaJednDefault: polozka.cenaJedn || undefined,
    };
    setCustomSablony((c) => [...c, nova]);
    // Označíme řádek jako pocházející ze šablony
    setVystPolozky((p) => p.map((it) => it.id === id ? { ...it, originSablonaId: nova.id } : it));
    setSavingTemplateFor(null);
    setSavingTemplateKat('Vlastní');
  }

  // Phase 8.4 (zápis 19. 6.) — Odeslat-flow: po kliknutí na "Uložit a odeslat" se objeví panel pro
  // vyplnění příjemce e-mailu, kontaktní osoby a doprovodné zprávy. Po dalším potvrzení se odešle.
  const [sendPanel, setSendPanel] = useState<null | { typ: 'export' | 'odeslat' }>(null);
  const [sendData, setSendData] = useState({ kontakt: '', email: '', subject: '', message: 'Dobrý den,\n\nv příloze zasíláme fakturu č. {cislo}.\n\nS pozdravem,\nCon Gusto' });

  function handleSaveFaktura() {
    if (!novaFaDocument) { setShowNoDocConfirm({ typ: 'faktura' }); return; }
    setShowNovaFaktura(false);
    setNovaFaDocument(null);
  }
  function handleSaveProforma() {
    if (!novaProfDocument) { setShowNoDocConfirm({ typ: 'proforma' }); return; }
    setShowNovaProforma(false);
    setNovaProfDocument(null);
  }
  function confirmSaveWithoutDoc() {
    if (showNoDocConfirm?.typ === 'faktura') { setShowNovaFaktura(false); setNovaFaDocument(null); }
    if (showNoDocConfirm?.typ === 'proforma') { setShowNovaProforma(false); setNovaProfDocument(null); }
    setShowNoDocConfirm(null);
  }

  // Phase 8 (zápis 10. 6. 2026) — proforma (zálohová) faktura – samostatná podstránka
  const [novaProf, setNovaProf] = useState({
    typDokladu: 'prijata' as TypDokladu,
    dodavatel: '',
    cislo: '',
    kategorie: 'sluzby' as FakturaKategorie,
    provozovna: selectedProvozovna === 'all' ? 'cg-brno' : selectedProvozovna,
    castka: '',
    datum: '2026-04-23',
    splatnost: '',
    poznamka: '',
    spojenaSId: '',     // odkaz na finální fakturu (volitelné)
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
  const [localKategorie,     setLocalKategorie]    = useState<Record<string, FakturaKategorie>>({});
  const [localRoundingApproved, setLocalRoundingApproved] = useState<Record<string, boolean>>({});
  const [localRecheckCount,     setLocalRecheckCount]     = useState<Record<string, number>>({});

  // Phase 8.3 (zápis 19. 6. 2026) — cross-section nav: jiná sekce (Banka, Platby) nastavila
  // pendingFakturaId → otevřeme detail v side panelu, zapneme list view a vyčistíme pole.
  useEffect(() => {
    if (state.pendingFakturaId) {
      setViewMode('list');
      setDrawerFakturaId(state.pendingFakturaId);
      update({ pendingFakturaId: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pendingFakturaId]);

  // ── Saved filter presets ──
  type FilterPreset = {
    id: string;
    name: string;
    icon?: string;
    snapshot: {
      kategorieFilter: string;
      stavFilters:     string[];
      matchingFilters: string[];
      formaFilters:    string[];
      presetFilters:   string[];
      castkaOd:        string;
      castkaDo:        string;
      search:          string;
    };
  };
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>([
    // 2 výchozí demo presety
    {
      id: 'p-review',
      name: 'Denní review',
      icon: 'solar:clock-circle-bold-duotone',
      snapshot: {
        kategorieFilter: 'all',
        stavFilters:     ['nova', 'ceka-na-schvaleni'],
        matchingFilters: [],
        formaFilters:    [],
        presetFilters:   [],
        castkaOd:        '',
        castkaDo:        '',
        search:          '',
      },
    },
    {
      id: 'p-problemy',
      name: 'K vyřešení',
      icon: 'solar:danger-triangle-bold-duotone',
      snapshot: {
        kategorieFilter: 'all',
        stavFilters:     [],
        matchingFilters: ['nesedi-dl', 'duplikat'],
        formaFilters:    [],
        presetFilters:   ['po-splatnosti'],
        castkaOd:        '',
        castkaDo:        '',
        search:          '',
      },
    },
  ]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  function applyPreset(p: FilterPreset) {
    setKategorieFilter(p.snapshot.kategorieFilter);
    setStavFilters(new Set(p.snapshot.stavFilters as FakturaStavPlatby[]));
    setMatchingFilters(new Set(p.snapshot.matchingFilters as MatchingStav[]));
    setFormaFilters(new Set(p.snapshot.formaFilters as FakturaForma[]));
    setPresetFilters(new Set(p.snapshot.presetFilters as Array<'po-splatnosti' | 'tydni' | 'uzamcene'>));
    setCastkaOd(p.snapshot.castkaOd);
    setCastkaDo(p.snapshot.castkaDo);
    setSearch(p.snapshot.search);
    setActivePresetId(p.id);
  }

  function saveCurrentAsPreset() {
    const name = window.prompt('Název presetu:', 'Můj filtr');
    if (!name || !name.trim()) return;
    const id = `p-${Date.now()}`;
    const newP: FilterPreset = {
      id,
      name: name.trim(),
      icon: 'solar:bookmark-bold-duotone',
      snapshot: {
        kategorieFilter,
        stavFilters:     Array.from(stavFilters),
        matchingFilters: Array.from(matchingFilters),
        formaFilters:    Array.from(formaFilters),
        presetFilters:   Array.from(presetFilters),
        castkaOd,
        castkaDo,
        search,
      },
    };
    setSavedPresets((arr) => [...arr, newP]);
    setActivePresetId(id);
  }

  function deletePreset(id: string) {
    setSavedPresets((arr) => arr.filter((p) => p.id !== id));
    if (activePresetId === id) setActivePresetId(null);
  }

  // Hlídací mechanismus: kdykoliv se filtr změní mimo applyPreset, zruš "aktivní preset"
  // (jednoduchý effect — pokud aktuální filtry neshodují snapshot aktivního presetu)
  // Pro účely demo: ponecháme jen po explicitním kliku
  // (kompletní comparison by byl over-engineering pro mock)
  const hasAnyFilter = (
    kategorieFilter !== 'all' || stavFilters.size > 0 || matchingFilters.size > 0
    || formaFilters.size > 0 || presetFilters.size > 0
    || castkaOd !== '' || castkaDo !== '' || search !== ''
  );

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

  // Phase 8.5 (zápis 10. 6. 2026) — Celofiremní pohled: filtr napříč právními entitami.
  // 'all-entity' = napříč všemi entitami; konkrétní entita = zúží na faktury patřící dané entitě.
  // Funguje navíc nad provozovnu filtrem (entitu lze kombinovat).
  const rawForProv = getFakturyForProvozovna(selectedProvozovna);
  const allFakturyRaw = entitaFilter === 'all-entity'
    ? rawForProv
    : rawForProv.filter((f) => (PRAVNI_ENTITA[f.provozovna] ?? 'con-gusto') === entitaFilter);
  const keSchvaleni = allFakturyRaw.filter(
    (f) => (localStavy[f.id] ?? f.stav) === 'nova' || (localStavy[f.id] ?? f.stav) === 'ceka-na-schvaleni'
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
    setLocalStavy((prev) => ({ ...prev, [id]: 'ceka-na-schvaleni' }));
    setLocalSchvalil((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setLocalDatumSchvaleni((prev) => { const n = { ...prev }; delete n[id]; return n; });
    const akce = prevStav === 'pozastavena' ? 'Obnoveno ke schválení' : prevStav === 'zamitnuta' ? 'Přehodnoceno – vráceno ke schválení' : 'Odloženo ke schválení';
    pushAudit(id, { cas: now(), kdo: AKTUALNI_UZIVATEL.jmeno, akce, icon: 'solar:refresh-bold-duotone', color: '#0dcaf0', typ: 'stav' });
  }

  function handleRematch(id: string) {
    // Inkrementuj počet pokusů + popis akce zahrnuje pořadí + aktuální matching stav
    const newCount = (localRecheckCount[id] ?? 0) + 1;
    setLocalRecheckCount((p) => ({ ...p, [id]: newCount }));
    const matching = getMatchingData(id);
    const stavLabel = matching?.stav === 'sparovana'         ? 'spárováno ✓'
                    : matching?.stav === 'nesedi-dl'         ? 'neshoda s DL'
                    : matching?.stav === 'castecne-sparovana'? 'částečně spárováno'
                    : matching?.stav === 'duplikat'          ? 'detekována duplicita'
                    : matching?.stav === 'ceka-na-sparovani' ? 'čeká na DL'
                    : matching?.stav === 'bez-dl'            ? 'bez DL'
                    : 'výsledek čeká';
    const ordinal = newCount === 1 ? 'První' : newCount === 2 ? 'Druhý' : newCount === 3 ? 'Třetí' : `${newCount}.`;
    pushAudit(id, {
      cas: now(),
      kdo: AKTUALNI_UZIVATEL.jmeno,
      akce: `${ordinal} pokus o přepárování — vyhodnoceno: ${stavLabel}`,
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
    (f) => f.stav !== 'uhrazena' && f.stav !== 'v-bance' && isPoSplatnosti(f.splatnost)
  ).length;
  const neschvaleneCnt = allFaktury.filter(
    (f) => f.stav === 'nova' || f.stav === 'ceka-na-schvaleni'
  ).length;
  const splatneVObdobi = allFaktury.filter(
    (f) =>
      f.stav !== 'uhrazena' &&
      f.stav !== 'v-bance' &&
      isSplatneVObdobi(f.splatnost, periodOd, periodDo) &&
      !isPoSplatnosti(f.splatnost)
  ).length;
  const nesediDLCnt  = allFaktury.filter((f) => getMatchingData(f.id)?.stav === 'nesedi-dl').length;
  const duplikatCnt  = allFaktury.filter((f) => getMatchingData(f.id)?.stav === 'duplikat').length;
  const lockedCnt    = allFaktury.filter((f) => f.isLocked === true).length;
  const cekaCnt      = allFaktury.filter((f) => getMatchingData(f.id)?.stav === 'ceka-na-sparovani').length;
  // Phase 8.4 (zápis 19. 6. 2026) — VYDANÉ PROFORMY čekající na vystavení finální faktury
  // Detekce: forma=zalohova + typDokladu=vydana + stav=zaplacena + bez spojenaSId nebo s ID, které není v seznamu
  const allFakturyIds = new Set(allFaktury.map((f) => f.id));
  const proformyBezFinal = allFaktury.filter((f) =>
    f.forma === 'zalohova' &&
    f.typDokladu === 'vydana' &&
    f.stav === 'zaplacena' &&
    (!f.spojenaSId || !allFakturyIds.has(f.spojenaSId))
  );
  const proformyBezFinalCnt = proformyBezFinal.length;
  // Automatizace (mock cron status — v produkci by jely background workery)
  const CRON_INTERVAL_MIN = 15;
  const cronLast = '14:32';
  const cronNext = '14:47';

  void PROCESSING_DAYS_DEFAULT;

  return (
    <>
      {/* Phase 8 (zápis 19. 6. 2026) — viewMode přepíná: list ↔ formulář pro Novou fakturu / Novou proformu (samostatné podstránky, ne modaly) */}
      {viewMode === 'list' && (
      <>
      {/* ACTION BAR – SOURCE: Larkon .page-title-box (title odstraněn, zobrazen v topbaru) */}
      {/* Layout: levá skupina (Období) + pravá skupina (akční tlačítka) — wrap-row na úzkých */}
      <div className="page-title-box">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 row-gap-2">
          {/* Levá: Období */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
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
            {/* Phase 8.5 (zápis 10. 6. 2026) — Celofiremní pohled napříč entitami */}
            <span className="text-muted fs-13 ms-2 d-flex align-items-center gap-1">
              <iconify-icon icon="solar:buildings-2-bold-duotone" style={{ color: '#6c757d' }} />
              Entita:
            </span>
            <div className="btn-group btn-group-sm" role="group">
              {([
                { value: 'all-entity', label: 'Všechny' },
                { value: 'con-gusto',  label: 'Con Gusto' },
                { value: 'u-capa',     label: 'U Čápa' },
                { value: 'korek',      label: 'KOREK' },
              ] as { value: 'all-entity' | PravniEntita; label: string }[]).map((e) => (
                <button key={e.value}
                  className={`btn btn-sm ${entitaFilter === e.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ fontSize: 11 }}
                  onClick={() => setEntitaFilter(e.value)}
                  title={e.value === 'all-entity' ? 'Faktury všech právních entit' : ENTITA_LABEL[e.value as PravniEntita]}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          {/* Pravá: akční tlačítka — zůstanou pohromadě, wrapnou jako blok */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {keSchvaleni.length > 0 && (
              <button
                className="btn btn-warning btn-sm fw-semibold"
                onClick={spustitSchvalovani}
              >
                <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" style={{ fontSize: 16 }} />
                Spustit schvalování ({keSchvaleni.length})
              </button>
            )}
            {/* Phase 8.4 (zápis 19. 6. 2026) — 3 typy nového dokladu, každý vlastní formulář.
                Přijatá = záznam přišlé faktury. Vystavit = plný invoice creator (jako Fakturoid). Proforma = záloha. */}
            <button className="btn btn-light btn-sm d-flex align-items-center gap-1" onClick={() => {
              setNovaFa((f) => ({ ...f, typDokladu: 'prijata', provozovna: selectedProvozovna === 'all' ? 'cg-brno' : selectedProvozovna }));
              setShowNovaFaktura(true);
            }} title="Záznam přijaté faktury — dodavatel, částka, příloha PDF">
              <iconify-icon icon="solar:download-square-bold-duotone" />
              Přijatá faktura
            </button>
            <button className="btn btn-success btn-sm d-flex align-items-center gap-1" onClick={() => {
              setNovaVyd((f) => ({ ...f, provozovna: selectedProvozovna === 'all' ? 'cg-brno' : selectedProvozovna }));
              setShowVystavit(true);
            }} title="Plný formulář pro vystavení vydané faktury — položky, DPH, náhled">
              <iconify-icon icon="solar:document-add-bold-duotone" />
              Vystavit fakturu
            </button>
            <button className="btn btn-outline-info btn-sm d-flex align-items-center gap-1" onClick={() => {
              setNovaVyd((f) => ({ ...f, cislo: 'ZAL-2026-0013', provozovna: selectedProvozovna === 'all' ? 'cg-brno' : selectedProvozovna }));
              setShowVystavitProforma(true);
            }} title="Vystavit zálohovou (proforma) fakturu — bude započtena při finální fakturaci">
              <iconify-icon icon="solar:wallet-money-bold-duotone" />
              Vystavit proformu
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => update({ selectedSection: 'platby' })}
            >
              Přejít na platby →
            </button>
          </div>
        </div>
      </div>

      {/* Alert strips – SOURCE: Bootstrap .alert.alert-{danger|warning|info} */}
      {(poSplatCnt > 0 || neschvaleneCnt > 0 || splatneVObdobi > 0 || duplikatCnt > 0 || proformyBezFinalCnt > 0) && (
        <div className="d-flex flex-column gap-2 mb-4">
          {/* Phase 8.4 (zápis 19. 6. 2026) — Proformy bez vystavené finální faktury */}
          {proformyBezFinalCnt > 0 && (
            <div className="alert alert-warning d-flex align-items-center gap-2 mb-0" style={{ borderLeft: '4px solid #0dcaf0' }}>
              <iconify-icon icon="solar:wallet-money-bold-duotone" className="fs-5 flex-shrink-0" style={{ color: '#0dcaf0' }} />
              <span className="flex-grow-1">
                <strong>{proformyBezFinalCnt} {proformyBezFinalCnt === 1 ? 'uhrazená proforma čeká' : proformyBezFinalCnt < 5 ? 'uhrazené proformy čekají' : 'uhrazených proform čeká'} na vystavení finální faktury</strong>
                <span className="text-muted ms-2">— po úhradě zálohy je nutné vystavit řádný daňový doklad</span>
              </span>
              <span className="alert-link fw-semibold text-nowrap ms-auto" style={{ cursor: 'pointer' }}
                onClick={() => { setTypDokladu('vydana'); setFormaFilters(new Set(['zalohova'])); }}>
                Vystavit finální faktury →
              </span>
            </div>
          )}
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
              <span className="alert-link fw-semibold text-nowrap ms-auto" style={{ cursor: 'pointer' }} onClick={() => setStavFilters(new Set(['nova', 'ceka-na-schvaleni']))}>
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
              onClick={() => {
                setTypDokladu(t.value);
                setSelectedIds(new Set());
                setStavFilters(new Set());  // Phase 8.4 — vyčistit stav filtr při přepnutí tabu (přijaté ↔ vydané mají různé stavy)
              }}
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

          {/* Řádek 0 — Uložené filtry (presety) */}
          <div className="d-flex align-items-center gap-2 flex-wrap pb-2 border-bottom">
            <span className="text-muted fs-12 d-flex align-items-center gap-1" style={{ minWidth: 80 }}>
              <iconify-icon icon="solar:bookmark-bold-duotone" style={{ fontSize: 13 }} />
              Moje filtry:
            </span>
            {savedPresets.length === 0 ? (
              <span className="text-muted fs-12 fst-italic">Žádné uložené filtry</span>
            ) : (
              savedPresets.map((p) => {
                const active = activePresetId === p.id;
                return (
                  <div key={p.id}
                    className={`badge border d-inline-flex align-items-center gap-1 ${active ? 'bg-primary text-white border-primary' : 'bg-light text-dark border-secondary'}`}
                    style={{ fontSize: 11, padding: '4px 6px 4px 8px', cursor: 'pointer' }}>
                    <button
                      className="btn btn-link p-0 text-decoration-none d-flex align-items-center gap-1"
                      style={{ fontSize: 11, color: active ? 'white' : '#212529' }}
                      onClick={() => applyPreset(p)}
                      title="Načíst tento filtr"
                    >
                      <iconify-icon icon={p.icon ?? 'solar:bookmark-bold-duotone'} style={{ fontSize: 12 }} />
                      {p.name}
                    </button>
                    <button
                      className="btn btn-link p-0"
                      style={{ fontSize: 11, color: active ? 'white' : '#9097a7' }}
                      onClick={(e) => { e.stopPropagation(); if (window.confirm(`Smazat preset „${p.name}"?`)) deletePreset(p.id); }}
                      title="Smazat preset"
                    >
                      <iconify-icon icon="solar:close-circle-bold" style={{ fontSize: 13 }} />
                    </button>
                  </div>
                );
              })
            )}
            <button
              className="btn btn-outline-primary btn-sm py-0 px-2 ms-auto"
              style={{ fontSize: 11 }}
              onClick={saveCurrentAsPreset}
              disabled={!hasAnyFilter}
              title={hasAnyFilter ? 'Uložit aktuální kombinaci filtrů jako preset' : 'Nejdřív nastav nějaké filtry'}
            >
              <iconify-icon icon="solar:add-circle-bold-duotone" className="me-1" />
              Uložit aktuální
            </button>
          </div>

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
              {lockedCnt > 0 && (
                <button className={`badge border-0 ${presetFilters.has('uzamcene')
                  ? 'text-white' : ''}`}
                  style={{
                    cursor: 'pointer',
                    background: presetFilters.has('uzamcene') ? '#6f42c1' : '#f3eaff',
                    color: presetFilters.has('uzamcene') ? 'white' : '#6f42c1',
                  }}
                  onClick={() => setPresetFilters((p) => toggleSet(p, 'uzamcene'))}>
                  <iconify-icon icon="solar:lock-keyhole-bold-duotone" className="me-1" />
                  Uzamčené ({lockedCnt})
                </button>
              )}
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
                  setActivePresetId(null);
                }}>
                Zrušit filtry ×
              </button>
            )}
          </div>

          {/* Řádek 2 — Stav (multiselect chips). Phase 8.4 — různé chipy pro přijaté vs vydané */}
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="text-muted fs-12" style={{ minWidth: 56 }}>Stav:</span>
            {(typDokladu === 'vydana' ? STAV_CHIPS_VYDANE : STAV_CHIPS).map((c) => {
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

      {/* ── Layout: full-width tabulka když není vybrána žádná faktura, jinak 2-col ── */}
      <div className="row g-4 align-items-start">
        <div className={drawerFaktura ? 'col-xl-7 col-lg-7' : 'col-12'}>
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
            showZaplacene={stavFilters.has('uhrazena')}
            selectedRowId={drawerFakturaId}
            search={search}
            onRowClick={(id) => {
              setDrawerFakturaId((prev) => prev === id ? null : id);
              if (!schvalovaniQueue.includes(id)) setSchvalovaniQueue([]);
            }}
          />
        </div>
        {drawerFaktura && (
        <div className="col-xl-5 col-lg-5">
          <FakturySidePanel
            faktura={drawerFaktura}
            effectiveStav={drawerFaktura ? getEffektivniStav(localStavy[drawerFaktura.id] ?? drawerFaktura.stav, drawerFaktura.splatnost) : 'nova'}
            effectiveKategorie={drawerFaktura ? (localKategorie[drawerFaktura.id] ?? drawerFaktura.kategorie) : undefined}
            localPoznamka={drawerFaktura ? (localPoznamky[drawerFaktura.id] ?? '') : ''}
            localSchvalil={drawerFaktura ? (localSchvalil[drawerFaktura.id] ?? '') : ''}
            localDatumSchvaleni={drawerFaktura ? (localDatumSchvaleni[drawerFaktura.id] ?? '') : ''}
            localPrirazeni={drawerFaktura ? (localPrirazeni[drawerFaktura.id] ?? '') : ''}
            onClose={() => setDrawerFakturaId(null)}
            onSchvalit={handleSchvalit}
            onZamitout={handleZamitout}
            onOdlozit={handleOdlozit}
            onPoznamkaChange={(id, val) => setLocalPoznamky((p) => ({ ...p, [id]: val }))}
            onKategorieChange={(id, oldKat, newKat) => {
              setLocalKategorie((p) => ({ ...p, [id]: newKat }));
              pushAudit(id, {
                cas: now(),
                kdo: AKTUALNI_UZIVATEL.jmeno,
                akce: `Kategorie změněna: ${KATEGORIE_LABELS[oldKat]} → ${KATEGORIE_LABELS[newKat]}`,
                icon: 'solar:pen-bold-duotone',
                color: '#6f42c1',
                typ: 'editace',
              });
            }}
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
            recheckCount={drawerFaktura ? (localRecheckCount[drawerFaktura.id] ?? 0) : 0}
            roundingApproved={drawerFaktura ? (localRoundingApproved[drawerFaktura.id] ?? false) : false}
            onApproveRounding={(id, diff) => {
              setLocalRoundingApproved((p) => ({ ...p, [id]: true }));
              pushAudit(id, {
                cas: now(),
                kdo: AKTUALNI_UZIVATEL.jmeno,
                akce: `Zaokrouhlení schváleno: ${diff > 0 ? '+' : '−'}${Math.abs(diff).toFixed(2)} Kč (DL ↔ faktura)`,
                icon: 'solar:verified-check-bold-duotone',
                color: '#198754',
                typ: 'parovani',
              });
            }}
          />
        </div>
        )}
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
          <div className="d-flex align-items-center gap-2 px-4 py-3 bg-white rounded shadow">
            <span className="fw-semibold fs-13 me-2">{selectedIds.size} faktur vybráno</span>
            <button className="btn btn-light btn-sm" onClick={() => setSelectedIds(new Set())}>
              Zrušit výběr
            </button>
            {/* Phase 8.5 (zápis 10. 6. 2026) — Bulk akce per zápis: exporty + označit jako uhrazené */}
            <button className="btn btn-outline-primary btn-sm" onClick={() => {
              alert(`Stahuji PDF balíček s ${selectedIds.size} fakturami…\n(mock — v produkci by se vygeneroval ZIP)`);
              setSelectedIds(new Set());
            }} title="Stáhnout vybrané faktury jako jeden ZIP s PDFky">
              <iconify-icon icon="solar:download-bold-duotone" className="me-1" />
              Exportovat PDF ({selectedIds.size})
            </button>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => {
              alert(`Posílám PDF s ${selectedIds.size} fakturami účetní e-mailem…\n(mock — v produkci by se otevřel mail panel)`);
              setSelectedIds(new Set());
            }} title="Hromadně odeslat účetní (přílohou)">
              <iconify-icon icon="solar:letter-bold-duotone" className="me-1" />
              Odeslat účetní
            </button>
            <button className="btn btn-outline-success btn-sm" onClick={() => {
              setLocalStavy((prev) => {
                const next = { ...prev };
                selectedIds.forEach((id) => { next[id] = 'uhrazena'; });
                return next;
              });
              setSelectedIds(new Set());
            }} title="Hromadně označit jako uhrazené (přijatá strana — platba odeslána z banky)">
              <iconify-icon icon="solar:check-square-bold-duotone" className="me-1" />
              Označit uhrazené
            </button>
            <div className="vr mx-1"></div>
            <button
              className="btn btn-success btn-sm"
              onClick={handleBulkSchvalit}
            >
              <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
              Schválit ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      </>
      )}

      {/* Phase 8 (zápis 19. 6. 2026) — Podstránka: Nová faktura (full-page, ne modal) */}
      {showNovaFaktura && (
        <>
          <div className="page-title-box">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-light btn-sm d-flex align-items-center gap-1"
                  onClick={() => setShowNovaFaktura(false)}
                  title="Zpět na seznam faktur"
                >
                  <iconify-icon icon="solar:alt-arrow-left-bold-duotone" style={{ fontSize: 16 }} />
                  Zpět na seznam
                </button>
                <span className="text-muted">/</span>
                <span className="fw-semibold">Nová faktura</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">

                  <div className="row g-3">
                    {/* Phase 8.4 — tento formulář slouží POUZE pro přijaté faktury (záznam přišlé faktury).
                        Pro vydanou se otevírá samostatný "Vystavit fakturu" formulář s položkami a náhledem.
                        Pole typDokladu už není v UI — nastaveno na 'prijata' při otevření tlačítkem. */}
                    <div className="col-12">
                      <div className="alert alert-light border py-2 mb-0 fs-13">
                        <iconify-icon icon="solar:download-square-bold-duotone" className="me-1" style={{ color: '#6c757d' }} />
                        <strong>Záznam přijaté faktury</strong>
                        <span className="text-muted ms-2">— pro vystavení vydané faktury použijte tlačítko „Vystavit fakturu"</span>
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

                    {/* Phase 8.3 — Příloha (doklad): mock-upload, state novaFaDocument */}
                    <div className="col-12">
                      <label className="form-label fw-semibold fs-13">Příloha (doklad)</label>
                      {novaFaDocument ? (
                        <div className="border rounded d-flex align-items-center justify-content-between p-2 px-3"
                             style={{ background: '#e8f5e9', borderColor: '#198754' }}>
                          <div className="d-flex align-items-center gap-2">
                            <iconify-icon icon="solar:document-text-bold-duotone" style={{ fontSize: 22, color: '#198754' }} />
                            <div>
                              <div className="fw-semibold fs-13">{novaFaDocument}</div>
                              <div className="text-muted fs-11">Dokument připraven k uložení</div>
                            </div>
                          </div>
                          <button className="btn btn-sm btn-link text-danger p-0" onClick={() => setNovaFaDocument(null)} title="Odebrat dokument">
                            <iconify-icon icon="solar:trash-bin-trash-bold-duotone" style={{ fontSize: 18 }} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="border rounded d-flex align-items-center justify-content-center"
                          style={{ height: 80, background: '#f8f9fa', cursor: 'pointer' }}
                          onClick={() => setNovaFaDocument(`faktura-${novaFa.cislo || 'mock'}.pdf`)}
                        >
                          <div className="text-center text-muted fs-13">
                            <iconify-icon icon="solar:upload-bold-duotone" style={{ fontSize: 22 }} className="d-block mx-auto mb-1" />
                            <strong className="text-primary">Přidat dokument</strong>
                            <span className="ms-2">— přetáhněte PDF nebo klikněte pro výběr</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
                  <button className="btn btn-light btn-sm" onClick={() => setShowNovaFaktura(false)}>
                    Zrušit
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveFaktura}
                  >
                    <iconify-icon icon="solar:diskette-bold-duotone" className="me-1" style={{ fontSize: 16 }} />
                    Uložit fakturu
                  </button>
                </div>

            </div>
          </div>
        </>
      )}

      {/* Phase 8.4 (zápis 19. 6. 2026) — Podstránka: Vystavit fakturu (full invoice creator, 2-col layout
          form vlevo + live náhled vpravo, položky s automatickým výpočtem DPH, jako ve Fakturoidu) */}
      {showVystavit && (() => {
        // Výpočty
        const dphSazby = [0, 12, 21];
        const dphBreakdown = dphSazby.map((sazba) => {
          const polozky = vystPolozky.filter((p) => p.dphSazba === sazba);
          const zaklad = polozky.reduce((s, p) => s + p.pocet * p.cenaJedn, 0);
          const dph = zaklad * sazba / 100;
          return { sazba, zaklad, dph };
        }).filter((b) => b.zaklad > 0);
        const celkemBezDph = vystPolozky.reduce((s, p) => s + p.pocet * p.cenaJedn, 0);
        const celkemDph    = dphBreakdown.reduce((s, b) => s + b.dph, 0);
        const celkemSDph   = celkemBezDph + celkemDph;
        const entitaLabel  = { 'con-gusto': 'Con Gusto s.r.o.', 'u-capa': 'Pivnice U Čápa s.r.o.', 'korek': 'KOREK s.r.o.' }[novaVyd.pravniEntita];
        const ucet = BANKOVNI_UCTY.find((u) => u.cisloUctu === novaVyd.bankovniUcet) ?? BANKOVNI_UCTY[0];
        const fCzk = (n: number) => Math.round(n).toLocaleString('cs-CZ').replace(/ /g, ' ') + ' Kč';

        return (
        <>
          <div className="page-title-box">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <button className="btn btn-light btn-sm d-flex align-items-center gap-1"
                  onClick={() => setShowVystavit(false)} title="Zpět na seznam faktur">
                  <iconify-icon icon="solar:alt-arrow-left-bold-duotone" style={{ fontSize: 16 }} />
                  Zpět na seznam
                </button>
                <span className="text-muted">/</span>
                <span className="fw-semibold d-flex align-items-center gap-1">
                  <iconify-icon icon={isProformaVystavit ? 'solar:wallet-money-bold-duotone' : 'solar:document-add-bold-duotone'}
                    style={{ fontSize: 18, color: isProformaVystavit ? '#0dcaf0' : '#198754' }} />
                  {isProformaVystavit ? 'Vystavit proformu (zálohová faktura)' : 'Vystavit fakturu'}
                </span>
                <span className="badge bg-light text-muted ms-2 fs-12">{novaVyd.cislo}</span>
                {isProformaVystavit && (
                  <span className="badge bg-info-subtle text-info border border-info-subtle fs-11">PROFORMA</span>
                )}
              </div>
              <div className="d-flex gap-2">
                {/* Phase 8.4 — Toggle živého náhledu (defaultně vypnutý, formulář přes celou šířku) */}
                <button
                  className={`btn btn-sm ${vystShowPreview ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setVystShowPreview((v) => !v)}
                  title={vystShowPreview ? 'Skrýt živý náhled' : 'Zobrazit živý náhled'}
                >
                  <iconify-icon icon={vystShowPreview ? 'solar:eye-closed-bold-duotone' : 'solar:eye-bold-duotone'} className="me-1" />
                  {vystShowPreview ? 'Skrýt náhled' : 'Zobrazit náhled'}
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowVystavit(false)}>
                  Uložit jako rozpracovaný koncept
                </button>
              </div>
            </div>
          </div>

          {/* Phase 8.4 — Info banner pro proformu */}
          {isProformaVystavit && (
            <div className="alert alert-info py-2 mb-3 fs-13 d-flex align-items-start gap-2">
              <iconify-icon icon="solar:info-circle-bold-duotone" style={{ fontSize: 18, marginTop: 2 }} />
              <div>
                <strong>Proforma = zálohová faktura.</strong> Po jejím uhrazení musíte na základě této proformy
                vystavit <strong>řádnou (finální) fakturu</strong> — systém vás bude upozorňovat v hlavičce sekce Faktury,
                dokud finální doklad nevystavíte.
              </div>
            </div>
          )}

          <div className="row g-3">
            {/* ── LEVÝ SLOUPEC: FORMULÁŘ (defaultně přes celou šířku; zúží se jen když je preview zapnutý) ── */}
            <div className={vystShowPreview ? 'col-xl-7 col-lg-7' : 'col-12'}>
              {/* Hlavička: číslo, entita, provozovna */}
              <div className="card mb-3">
                <div className="card-body">
                  <h6 className="fw-semibold mb-3 d-flex align-items-center gap-1">
                    <iconify-icon icon="solar:settings-bold-duotone" style={{ color: '#198754' }} />
                    Základní údaje
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fs-12 fw-semibold">Číslo faktury *</label>
                      <input type="text" className="form-control form-control-sm czk-num"
                        value={novaVyd.cislo} onChange={(e) => setNovaVyd((f) => ({ ...f, cislo: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fs-12 fw-semibold">Provozovna *</label>
                      <select className="form-select form-select-sm" value={novaVyd.provozovna}
                        onChange={(e) => setNovaVyd((f) => ({ ...f, provozovna: e.target.value }))}>
                        {PROVOZOVNY.filter((p) => p.status === 'active').map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fs-12 fw-semibold">Právní entita *</label>
                      <select className="form-select form-select-sm" value={novaVyd.pravniEntita}
                        onChange={(e) => setNovaVyd((f) => ({ ...f, pravniEntita: e.target.value as 'con-gusto' | 'u-capa' | 'korek' }))}>
                        <option value="con-gusto">Con Gusto s.r.o.</option>
                        <option value="u-capa">Pivnice U Čápa s.r.o.</option>
                        <option value="korek">KOREK s.r.o.</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Odběratel */}
              <div className="card mb-3">
                <div className="card-body">
                  <h6 className="fw-semibold mb-3 d-flex align-items-center gap-1">
                    <iconify-icon icon="solar:user-rounded-bold-duotone" style={{ color: '#0dcaf0' }} />
                    Odběratel
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label fs-12 fw-semibold">Název / jméno *</label>
                      <input type="text" className="form-control form-control-sm" placeholder="Začněte psát — nebo zadat IČO pro načtení z ARESu"
                        value={novaVyd.odbNazev} onChange={(e) => setNovaVyd((f) => ({ ...f, odbNazev: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fs-12 fw-semibold">IČO</label>
                      <div className="input-group input-group-sm">
                        <input type="text" className="form-control czk-num" placeholder="12345678"
                          value={novaVyd.odbIco} onChange={(e) => setNovaVyd((f) => ({ ...f, odbIco: e.target.value }))} />
                        <button className="btn btn-outline-secondary" title="Načíst údaje z registru ARES (mock)">
                          <iconify-icon icon="solar:download-bold-duotone" style={{ fontSize: 14 }} />
                        </button>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fs-12 fw-semibold">DIČ</label>
                      <input type="text" className="form-control form-control-sm czk-num" placeholder="CZ12345678"
                        value={novaVyd.odbDic} onChange={(e) => setNovaVyd((f) => ({ ...f, odbDic: e.target.value }))} />
                    </div>
                    <div className="col-md-8">
                      <label className="form-label fs-12 fw-semibold">Adresa</label>
                      <input type="text" className="form-control form-control-sm" placeholder="Ulice 1, PSČ Město"
                        value={novaVyd.odbAdresa} onChange={(e) => setNovaVyd((f) => ({ ...f, odbAdresa: e.target.value }))} />
                    </div>
                    {/* Phase 8.5 (zápis 10. 6. 2026) — Bankovní účet odběratele pro inkasní platby a párování */}
                    <div className="col-md-6">
                      <label className="form-label fs-12 fw-semibold">Číslo účtu odběratele <span className="text-muted fs-11">(volitelné)</span></label>
                      <input type="text" className="form-control form-control-sm czk-num"
                        placeholder="123456-789/0100"
                        value={novaVyd.odbUcet}
                        onChange={(e) => setNovaVyd((f) => ({ ...f, odbUcet: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fs-12 fw-semibold">IBAN odběratele <span className="text-muted fs-11">(volitelné)</span></label>
                      <input type="text" className="form-control form-control-sm czk-num"
                        placeholder="CZ65 0800 0000 1920 0014 5399"
                        value={novaVyd.odbIban}
                        onChange={(e) => setNovaVyd((f) => ({ ...f, odbIban: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Položky */}
              <div className="card mb-3">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-semibold mb-0 d-flex align-items-center gap-1">
                      <iconify-icon icon="solar:bag-4-bold-duotone" style={{ color: '#fd7e14' }} />
                      Položky faktury
                    </h6>
                    <button className="btn btn-outline-success btn-sm" onClick={addPolozka}>
                      <iconify-icon icon="solar:add-circle-bold-duotone" className="me-1" />
                      Prázdná položka
                    </button>
                  </div>

                  {/* Phase 8.4 — Šablony jako kategoriální chip-tlačítka (1 klik na kategorii → submenu → vložit).
                      Účetní spravuje systémové šablony s přesným zněním + DPH; provozní si může uložit i vlastní. */}
                  <div className="mb-3 p-2 rounded border border-light" style={{ background: '#f8f9fa' }}>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="text-muted fs-12 d-flex align-items-center gap-1" style={{ minWidth: 86 }}>
                        <iconify-icon icon="solar:bookmark-bold-duotone" style={{ color: '#0d6efd' }} />
                        Šablony:
                      </span>
                      {(['Catering', 'Pronájem', 'Služby', 'Poukazy', 'Storno'] as const).map((kat) => {
                        const items = VYDANE_SABLONY.filter((s) => s.kategorie === kat);
                        return (
                          <div className="dropdown" key={kat}>
                            <button className="btn btn-light btn-sm dropdown-toggle border" data-bs-toggle="dropdown" aria-expanded="false"
                              style={{ fontSize: 12 }}>
                              {kat}
                              <span className="badge bg-secondary-subtle text-secondary ms-1 fs-11">{items.length}</span>
                            </button>
                            <ul className="dropdown-menu shadow" style={{ maxHeight: 360, overflowY: 'auto', minWidth: 340 }}>
                              {items.map((sab) => (
                                <li key={sab.id}>
                                  <button className="dropdown-item d-flex justify-content-between align-items-center py-2"
                                    onClick={() => insertSablona(sab)} title={sab.poznamka}>
                                    <div className="d-flex flex-column">
                                      <span className="fs-13">{sab.nazev}</span>
                                      {sab.cenaJednDefault != null && (
                                        <span className="text-muted fs-11 czk-num">{sab.cenaJednDefault.toLocaleString('cs-CZ')} Kč / {sab.jednotka}</span>
                                      )}
                                    </div>
                                    <span className="badge bg-light text-muted ms-2 fs-11">{sab.dphSazba} %</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                      {/* Vlastní šablony (uložené provozním z této obrazovky) */}
                      <div className="dropdown">
                        <button className="btn btn-light btn-sm dropdown-toggle border d-flex align-items-center gap-1"
                          data-bs-toggle="dropdown" aria-expanded="false"
                          style={{ fontSize: 12, borderStyle: 'dashed' }}>
                          <iconify-icon icon="solar:star-bold-duotone" style={{ color: '#ffc107' }} />
                          Moje šablony
                          <span className="badge bg-secondary-subtle text-secondary ms-1 fs-11">{customSablony.length}</span>
                        </button>
                        <ul className="dropdown-menu shadow" style={{ maxHeight: 360, overflowY: 'auto', minWidth: 340 }}>
                          {customSablony.length === 0 ? (
                            <li><span className="dropdown-item-text text-muted fs-12 fst-italic">
                              Zatím nemáte vlastní šablony.<br />
                              Uložte si vlastní položku ikonou 💾 v řádku.
                            </span></li>
                          ) : customSablony.map((sab) => (
                            <li key={sab.id}>
                              <button className="dropdown-item d-flex justify-content-between align-items-center py-2"
                                onClick={() => insertSablona(sab)}>
                                <div className="d-flex flex-column">
                                  <span className="fs-13">{sab.nazev}</span>
                                  <span className="text-muted fs-11">{sab.kategorie}</span>
                                </div>
                                <span className="badge bg-light text-muted ms-2 fs-11">{sab.dphSazba} %</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <span className="text-muted fs-11 ms-2 fst-italic">Klikněte na kategorii → vyberte položku</span>
                      <a className="text-muted fs-11 ms-auto text-decoration-none" href="#"
                         onClick={(e) => { e.preventDefault(); update({ selectedSection: 'nastaveni' }); }}>
                        <iconify-icon icon="solar:settings-bold-duotone" className="me-1" />
                        Spravovat šablony…
                      </a>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm mb-0 fs-13">
                      <thead className="text-muted fs-12">
                        <tr>
                          <th style={{ minWidth: 320 }}>Název položky</th>
                          <th style={{ width: 70 }}>Počet</th>
                          <th style={{ width: 90 }}>Jedn.</th>
                          <th style={{ width: 110 }} className="text-end">Cena/jedn.</th>
                          <th style={{ width: 80 }}>DPH</th>
                          <th style={{ width: 110 }} className="text-end">Celkem</th>
                          <th style={{ width: 36 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {vystPolozky.map((p) => {
                          const celkem = p.pocet * p.cenaJedn;
                          const fromSablona = !!p.originSablonaId;
                          const isSaving = savingTemplateFor === p.id;
                          return (
                            <Fragment key={p.id}>
                            <tr>
                              <td>
                                <div className="position-relative">
                                  <input type="text" className="form-control form-control-sm"
                                    placeholder="Napište text — nebo vyberte ze šablon nahoře"
                                    value={p.nazev}
                                    onChange={(e) => updatePolozka(p.id, { nazev: e.target.value, originSablonaId: undefined })}
                                    style={fromSablona ? { paddingLeft: 28 } : undefined} />
                                  {fromSablona && (
                                    <iconify-icon icon="solar:star-bold-duotone"
                                      title="Vloženo ze šablony"
                                      style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#ffc107', fontSize: 16, pointerEvents: 'none' }} />
                                  )}
                                </div>
                              </td>
                              <td>
                                <input type="number" className="form-control form-control-sm czk-num" min={0} step={0.5}
                                  value={p.pocet} onChange={(e) => updatePolozka(p.id, { pocet: parseFloat(e.target.value) || 0 })} />
                              </td>
                              <td>
                                <select className="form-select form-select-sm" value={p.jednotka}
                                  onChange={(e) => updatePolozka(p.id, { jednotka: e.target.value })}>
                                  <option value="ks">ks</option>
                                  <option value="hod">hod</option>
                                  <option value="kg">kg</option>
                                  <option value="l">l</option>
                                  <option value="km">km</option>
                                  <option value="lahev">lahev</option>
                                  <option value="balení">balení</option>
                                  <option value="osoba">osoba</option>
                                  <option value="akce">akce</option>
                                </select>
                              </td>
                              <td>
                                <input type="number" className="form-control form-control-sm czk-num text-end" min={0} step={0.01}
                                  value={p.cenaJedn} onChange={(e) => updatePolozka(p.id, { cenaJedn: parseFloat(e.target.value) || 0 })} />
                              </td>
                              <td>
                                <select className="form-select form-select-sm" value={p.dphSazba}
                                  onChange={(e) => updatePolozka(p.id, { dphSazba: parseInt(e.target.value) })}>
                                  <option value={0}>0 %</option>
                                  <option value={12}>12 %</option>
                                  <option value={21}>21 %</option>
                                </select>
                              </td>
                              <td className="text-end czk-num fw-semibold">{fCzk(celkem)}</td>
                              <td>
                                <div className="d-flex gap-1 align-items-center">
                                  {/* Phase 8.4 — Uložit jako šablonu (jen pokud řádek má text a NENÍ už ze šablony) */}
                                  {p.nazev && !fromSablona && (
                                    <button className="btn btn-link btn-sm text-primary p-0"
                                      onClick={() => { setSavingTemplateFor(p.id); setSavingTemplateKat('Vlastní'); }}
                                      title="Uložit jako vlastní šablonu">
                                      <iconify-icon icon="solar:bookmark-add-bold-duotone" />
                                    </button>
                                  )}
                                  {vystPolozky.length > 1 && (
                                    <button className="btn btn-link btn-sm text-danger p-0"
                                      onClick={() => removePolozka(p.id)} title="Odebrat položku">
                                      <iconify-icon icon="solar:trash-bin-trash-bold-duotone" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {/* Inline save-as-template formulář (pod řádkem) */}
                            {isSaving && (
                              <tr>
                                <td colSpan={7} className="bg-primary-subtle">
                                  <div className="d-flex align-items-center gap-2 py-1 px-2">
                                    <iconify-icon icon="solar:bookmark-add-bold-duotone" style={{ color: '#0d6efd', fontSize: 16 }} />
                                    <span className="fs-12 fw-semibold">Uložit jako šablonu:</span>
                                    <span className="fs-13">„{p.nazev}"</span>
                                    <span className="text-muted fs-11">→ {p.dphSazba} % DPH, {p.jednotka}</span>
                                    <label className="fs-12 ms-2">Kategorie:</label>
                                    <select className="form-select form-select-sm" style={{ width: 140 }}
                                      value={savingTemplateKat} onChange={(e) => setSavingTemplateKat(e.target.value)}>
                                      <option>Catering</option>
                                      <option>Pronájem</option>
                                      <option>Služby</option>
                                      <option>Poukazy</option>
                                      <option>Storno</option>
                                      <option>Vlastní</option>
                                    </select>
                                    <button className="btn btn-primary btn-sm ms-auto"
                                      onClick={() => saveAsTemplate(p.id, savingTemplateKat)}>
                                      <iconify-icon icon="solar:diskette-bold-duotone" className="me-1" />
                                      Uložit šablonu
                                    </button>
                                    <button className="btn btn-light btn-sm"
                                      onClick={() => setSavingTemplateFor(null)}>×</button>
                                  </div>
                                </td>
                              </tr>
                            )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Souhrn DPH */}
                  <div className="mt-3 pt-3 border-top">
                    <div className="row g-2 fs-13">
                      <div className="col-md-7"></div>
                      <div className="col-md-5">
                        {dphBreakdown.length === 0 ? (
                          <div className="text-muted fs-12 fst-italic text-end">Zadejte alespoň jednu položku</div>
                        ) : (
                          <>
                            {dphBreakdown.map((b) => (
                              <div key={b.sazba} className="d-flex justify-content-between text-muted fs-12">
                                <span>Základ DPH {b.sazba} %:</span>
                                <span className="czk-num">{fCzk(b.zaklad)}</span>
                              </div>
                            ))}
                            {dphBreakdown.map((b) => (
                              <div key={`d${b.sazba}`} className="d-flex justify-content-between text-muted fs-12">
                                <span>DPH {b.sazba} %:</span>
                                <span className="czk-num">{fCzk(b.dph)}</span>
                              </div>
                            ))}
                            <div className="d-flex justify-content-between mt-2 pt-2 border-top fs-13">
                              <span>Bez DPH:</span>
                              <span className="czk-num">{fCzk(celkemBezDph)}</span>
                            </div>
                            <div className="d-flex justify-content-between fs-13">
                              <span>DPH celkem:</span>
                              <span className="czk-num">{fCzk(celkemDph)}</span>
                            </div>
                            <div className="d-flex justify-content-between mt-1 pt-1 border-top fw-bold fs-15">
                              <span>Celkem k úhradě:</span>
                              <span className="czk-num text-success">{fCzk(celkemSDph)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platba */}
              <div className="card mb-3">
                <div className="card-body">
                  <h6 className="fw-semibold mb-3 d-flex align-items-center gap-1">
                    <iconify-icon icon="solar:wallet-money-bold-duotone" style={{ color: '#6f42c1' }} />
                    Platební údaje + termíny
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fs-12 fw-semibold">Datum vystavení *</label>
                      <input type="date" className="form-control form-control-sm" value={novaVyd.datumVystaveni}
                        onChange={(e) => setNovaVyd((f) => ({ ...f, datumVystaveni: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fs-12 fw-semibold">DUZP *</label>
                      <input type="date" className="form-control form-control-sm" value={novaVyd.duzp}
                        onChange={(e) => setNovaVyd((f) => ({ ...f, duzp: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fs-12 fw-semibold">Splatnost *</label>
                      <input type="date" className="form-control form-control-sm" value={novaVyd.splatnost}
                        onChange={(e) => setNovaVyd((f) => ({ ...f, splatnost: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fs-12 fw-semibold">Forma platby</label>
                      <select className="form-select form-select-sm" value={novaVyd.formaPlatby}
                        onChange={(e) => setNovaVyd((f) => ({ ...f, formaPlatby: e.target.value as 'prevod' | 'hotovost' | 'karta' }))}>
                        <option value="prevod">Bankovní převod</option>
                        <option value="hotovost">Hotovost</option>
                        <option value="karta">Platební karta</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fs-12 fw-semibold">Bankovní účet (kam příjde platba)</label>
                      <select className="form-select form-select-sm" value={novaVyd.bankovniUcet}
                        onChange={(e) => setNovaVyd((f) => ({ ...f, bankovniUcet: e.target.value }))}>
                        <option value="">— Výchozí účet provozovny —</option>
                        {BANKOVNI_UCTY.map((u) => (
                          <option key={u.cisloUctu} value={u.cisloUctu}>{u.banka} – {u.cisloUctu}{u.mena === 'EUR' ? ' (EUR)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fs-12 fw-semibold">Konstantní symbol</label>
                      <input type="text" className="form-control form-control-sm czk-num" value={novaVyd.konstSymbol}
                        onChange={(e) => setNovaVyd((f) => ({ ...f, konstSymbol: e.target.value }))} />
                    </div>
                    <div className="col-md-8">
                      <label className="form-label fs-12 fw-semibold">Variabilní symbol (auto)</label>
                      <input type="text" className="form-control form-control-sm czk-num" value={novaVyd.cislo.replace(/\D/g, '')}
                        disabled title="Odvozeno z čísla faktury" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Poznámka */}
              <div className="card mb-3">
                <div className="card-body">
                  <label className="form-label fs-12 fw-semibold">Poznámka pro odběratele (volitelné)</label>
                  <textarea className="form-control form-control-sm" rows={2} placeholder="Např. Děkujeme za spolupráci."
                    value={novaVyd.poznamka} onChange={(e) => setNovaVyd((f) => ({ ...f, poznamka: e.target.value }))} />
                </div>
              </div>

              {/* Phase 8.4 (zápis 19. 6. 2026) — Spodní CTA: Uložit a stáhnout / Uložit a odeslat.
                  Po kliknutí na „Odeslat" se rozbalí panel pro vyplnění kontaktu + e-mailu + zprávy. */}
              <div className="card border-0" style={{ background: '#f8f9fa' }}>
                <div className="card-body py-3">
                  {!sendPanel ? (
                    <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end">
                      <div className="text-muted fs-12 me-auto">
                        <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                        Vyberte způsob dokončení faktury:
                      </div>
                      <button className="btn btn-outline-primary"
                        onClick={() => setSendPanel({ typ: 'export' })}>
                        <iconify-icon icon="solar:download-bold-duotone" className="me-1" />
                        Uložit a stáhnout PDF
                      </button>
                      <button className={`btn ${isProformaVystavit ? 'btn-info' : 'btn-success'}`}
                        onClick={() => {
                          setSendPanel({ typ: 'odeslat' });
                          setSendData((d) => ({
                            ...d,
                            kontakt: d.kontakt || novaVyd.odbNazev,
                            subject: d.subject || `Faktura ${novaVyd.cislo} — ${entitaLabel}`,
                            message: d.message.replace('{cislo}', novaVyd.cislo),
                          }));
                        }}>
                        <iconify-icon icon="solar:letter-bold-duotone" className="me-1" />
                        Uložit a odeslat
                      </button>
                    </div>
                  ) : sendPanel.typ === 'export' ? (
                    <div className="d-flex align-items-center gap-3 py-2">
                      <iconify-icon icon="solar:download-bold-duotone" style={{ fontSize: 28, color: '#0d6efd' }} />
                      <div className="flex-grow-1">
                        <div className="fw-semibold">Připraveno ke stažení</div>
                        <div className="text-muted fs-12">PDF se uloží do faktury a stáhne se do prohlížeče. Odběratel se NEoznamuje.</div>
                      </div>
                      <button className="btn btn-light btn-sm" onClick={() => setSendPanel(null)}>Zpět</button>
                      <button className="btn btn-primary" onClick={() => { setShowVystavit(false); setSendPanel(null); }}>
                        <iconify-icon icon="solar:check-circle-bold-duotone" className="me-1" />
                        Potvrdit a stáhnout
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <iconify-icon icon="solar:letter-bold-duotone" style={{ fontSize: 22, color: '#198754' }} />
                        <h6 className="fw-semibold mb-0">Odeslat fakturu e-mailem zákazníkovi</h6>
                        <button className="btn btn-link btn-sm text-muted ms-auto p-0" onClick={() => setSendPanel(null)}>
                          ← Zpět na výběr
                        </button>
                      </div>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label fs-12 fw-semibold">Kontaktní osoba *</label>
                          <input type="text" className="form-control form-control-sm" placeholder="Jméno odběratele / kontaktní osoby"
                            value={sendData.kontakt}
                            onChange={(e) => setSendData((d) => ({ ...d, kontakt: e.target.value }))} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fs-12 fw-semibold">E-mail příjemce *</label>
                          <input type="email" className="form-control form-control-sm czk-num"
                            placeholder="kontakt@firma.cz"
                            value={sendData.email}
                            onChange={(e) => setSendData((d) => ({ ...d, email: e.target.value }))} />
                        </div>
                        <div className="col-12">
                          <label className="form-label fs-12 fw-semibold">Předmět e-mailu</label>
                          <input type="text" className="form-control form-control-sm"
                            value={sendData.subject}
                            onChange={(e) => setSendData((d) => ({ ...d, subject: e.target.value }))} />
                        </div>
                        <div className="col-12">
                          <label className="form-label fs-12 fw-semibold">Zpráva</label>
                          <textarea className="form-control form-control-sm" rows={5}
                            value={sendData.message}
                            onChange={(e) => setSendData((d) => ({ ...d, message: e.target.value }))} />
                          <div className="text-muted fs-11 mt-1">
                            <iconify-icon icon="solar:paperclip-bold-duotone" className="me-1" />
                            K e-mailu se automaticky přiloží <strong>PDF faktury {novaVyd.cislo}</strong>
                          </div>
                        </div>
                        <div className="col-12 d-flex justify-content-end gap-2 pt-2 border-top">
                          <button className="btn btn-light btn-sm" onClick={() => setSendPanel(null)}>
                            Zrušit
                          </button>
                          <button className="btn btn-outline-secondary btn-sm" title="Uložit fakturu, ale e-mail odeslat později ručně"
                            onClick={() => { setShowVystavit(false); setSendPanel(null); }}>
                            Uložit bez odeslání
                          </button>
                          <button className="btn btn-success" disabled={!sendData.email || !sendData.kontakt}
                            title={!sendData.email || !sendData.kontakt ? 'Vyplňte kontakt a e-mail' : undefined}
                            onClick={() => { setShowVystavit(false); setSendPanel(null); }}>
                            <iconify-icon icon="solar:plain-bold-duotone" className="me-1" />
                            Odeslat e-mail
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── PRAVÝ SLOUPEC: LIVE NÁHLED (defaultně skrytý; toggle v hlavičce) ── */}
            {vystShowPreview && (
            <div className="col-xl-5 col-lg-5">
              <div className="card" style={{ position: 'sticky', top: 'calc(var(--bs-topbar-height, 100px) + 16px)' }}>
                <div className="card-header bg-light py-2 d-flex align-items-center gap-2">
                  <iconify-icon icon="solar:eye-bold-duotone" style={{ color: '#0dcaf0' }} />
                  <span className="fw-semibold fs-13">Živý náhled</span>
                  <span className="badge bg-secondary-subtle text-secondary ms-auto fs-11">aktualizuje se za běhu</span>
                </div>
                <div className="card-body" style={{ background: '#fafbfc' }}>
                  <div className="bg-white p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)', minHeight: 600 }}>
                    {/* Hlavička */}
                    <div className="d-flex justify-content-between mb-4 pb-3 border-bottom">
                      <div>
                        <div className="fs-22 fw-bold mb-1" style={{ color: isProformaVystavit ? '#0dcaf0' : undefined }}>
                          {isProformaVystavit ? 'ZÁLOHOVÁ FAKTURA (PROFORMA)' : 'FAKTURA'}
                        </div>
                        <div className="text-muted fs-13">{novaVyd.cislo}</div>
                      </div>
                      <div className="text-end fs-12">
                        <div className="text-muted">Datum vystavení: <strong>{novaVyd.datumVystaveni}</strong></div>
                        <div className="text-muted">DUZP: <strong>{novaVyd.duzp}</strong></div>
                        <div className="text-muted">Splatnost: <strong>{novaVyd.splatnost}</strong></div>
                      </div>
                    </div>

                    {/* Dodavatel + Odběratel */}
                    <div className="row g-3 mb-4 fs-12">
                      <div className="col-6">
                        <div className="text-muted fs-11 text-uppercase mb-1">Dodavatel</div>
                        <div className="fw-bold">{entitaLabel}</div>
                        <div>IČO: 28282828 · DIČ: CZ28282828</div>
                        <div>Veveří 12, 602 00 Brno</div>
                      </div>
                      <div className="col-6">
                        <div className="text-muted fs-11 text-uppercase mb-1">Odběratel</div>
                        <div className="fw-bold">{novaVyd.odbNazev || <span className="text-muted fst-italic">(zatím nezadán)</span>}</div>
                        {novaVyd.odbIco && <div>IČO: {novaVyd.odbIco}{novaVyd.odbDic && ` · DIČ: ${novaVyd.odbDic}`}</div>}
                        {novaVyd.odbAdresa && <div>{novaVyd.odbAdresa}</div>}
                      </div>
                    </div>

                    {/* Položky */}
                    <table className="table table-sm fs-12 mb-3">
                      <thead className="text-muted">
                        <tr>
                          <th>Položka</th>
                          <th className="text-end">Počet</th>
                          <th className="text-end">Cena/j.</th>
                          <th className="text-end">DPH</th>
                          <th className="text-end">Celkem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vystPolozky.map((p) => (
                          <tr key={p.id}>
                            <td>{p.nazev || <span className="text-muted fst-italic">(nezadáno)</span>}</td>
                            <td className="text-end czk-num">{p.pocet} {p.jednotka}</td>
                            <td className="text-end czk-num">{fCzk(p.cenaJedn)}</td>
                            <td className="text-end">{p.dphSazba} %</td>
                            <td className="text-end czk-num fw-semibold">{fCzk(p.pocet * p.cenaJedn)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Souhrn */}
                    <div className="d-flex justify-content-end">
                      <div style={{ minWidth: 220 }} className="fs-12">
                        {dphBreakdown.map((b) => (
                          <div key={b.sazba} className="d-flex justify-content-between text-muted">
                            <span>Základ {b.sazba} %:</span>
                            <span className="czk-num">{fCzk(b.zaklad)}</span>
                          </div>
                        ))}
                        {dphBreakdown.map((b) => (
                          <div key={`d${b.sazba}`} className="d-flex justify-content-between text-muted">
                            <span>DPH {b.sazba} %:</span>
                            <span className="czk-num">{fCzk(b.dph)}</span>
                          </div>
                        ))}
                        <div className="d-flex justify-content-between mt-2 pt-2 border-top fw-bold fs-15">
                          <span>Celkem:</span>
                          <span className="czk-num text-success">{fCzk(celkemSDph)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Platební údaje */}
                    <div className="mt-4 pt-3 border-top fs-12">
                      <div className="text-muted fs-11 text-uppercase mb-2">Platební údaje</div>
                      <div className="row g-2">
                        <div className="col-6">
                          <div>Banka: <strong>{ucet?.banka ?? '—'}</strong></div>
                          <div className="czk-num">Číslo účtu: <strong>{ucet?.cisloUctu ?? '—'}</strong></div>
                        </div>
                        <div className="col-6">
                          <div className="czk-num">VS: <strong>{novaVyd.cislo.replace(/\D/g, '')}</strong></div>
                          <div className="czk-num">KS: <strong>{novaVyd.konstSymbol}</strong></div>
                          <div>Forma: <strong>{{ prevod: 'Bank. převod', hotovost: 'Hotovost', karta: 'Karta' }[novaVyd.formaPlatby]}</strong></div>
                        </div>
                      </div>
                    </div>

                    {novaVyd.poznamka && (
                      <div className="mt-3 pt-3 border-top fs-12 text-muted">
                        <div className="text-muted fs-11 text-uppercase mb-1">Poznámka</div>
                        {novaVyd.poznamka}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </>
        );
      })()}

      {/* Phase 8 (zápis 19. 6. 2026) — Podstránka: Nová proforma (zálohová) faktura (full-page, ne modal) */}
      {showNovaProforma && (
        <>
          <div className="page-title-box">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-light btn-sm d-flex align-items-center gap-1"
                  onClick={() => setShowNovaProforma(false)}
                  title="Zpět na seznam faktur"
                >
                  <iconify-icon icon="solar:alt-arrow-left-bold-duotone" style={{ fontSize: 16 }} />
                  Zpět na seznam
                </button>
                <span className="text-muted">/</span>
                <span className="fw-semibold d-flex align-items-center gap-1">
                  <iconify-icon icon="solar:wallet-money-bold-duotone" style={{ fontSize: 18, color: '#0dcaf0' }} />
                  Nová proforma (zálohová) faktura
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">

                  <div className="alert alert-info py-2 mb-3 fs-12">
                    <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                    <strong>Proforma / zálohová faktura</strong> — záloha bude započtena při finální fakturaci.
                    Systém hlídá navázání na finální doklad.
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fs-12 fw-semibold">Typ dokladu</label>
                      <div className="d-flex gap-3 pt-1">
                        {(['prijata', 'vydana'] as TypDokladu[]).map((t) => (
                          <label key={t} className="d-flex align-items-center gap-1">
                            <input type="radio"
                              checked={novaProf.typDokladu === t}
                              onChange={() => setNovaProf((f) => ({ ...f, typDokladu: t }))} />
                            <span className="fs-13">{t === 'prijata' ? 'Přijatá' : 'Vydaná'}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fs-12 fw-semibold">Provozovna *</label>
                      <select className="form-select form-select-sm" value={novaProf.provozovna}
                        onChange={(e) => setNovaProf((f) => ({ ...f, provozovna: e.target.value }))}>
                        {PROVOZOVNY.filter((p) => p.status === 'active').map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fs-12 fw-semibold">
                        {novaProf.typDokladu === 'prijata' ? 'Dodavatel *' : 'Odběratel *'}
                      </label>
                      <input type="text" className="form-control form-control-sm"
                        placeholder="Název firmy"
                        value={novaProf.dodavatel}
                        onChange={(e) => setNovaProf((f) => ({ ...f, dodavatel: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fs-12 fw-semibold">Číslo proformy *</label>
                      <input type="text" className="form-control form-control-sm czk-num"
                        placeholder="např. ZAL-2026-0001"
                        value={novaProf.cislo}
                        onChange={(e) => setNovaProf((f) => ({ ...f, cislo: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fs-12 fw-semibold">Datum vystavení *</label>
                      <input type="date" className="form-control form-control-sm"
                        value={novaProf.datum}
                        onChange={(e) => setNovaProf((f) => ({ ...f, datum: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fs-12 fw-semibold">Splatnost *</label>
                      <input type="date" className="form-control form-control-sm"
                        value={novaProf.splatnost}
                        onChange={(e) => setNovaProf((f) => ({ ...f, splatnost: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fs-12 fw-semibold">Záloha (Kč) *</label>
                      <input type="number" className="form-control form-control-sm czk-num"
                        placeholder="0"
                        value={novaProf.castka}
                        onChange={(e) => setNovaProf((f) => ({ ...f, castka: e.target.value }))} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fs-12 fw-semibold">Kategorie</label>
                      <select className="form-select form-select-sm" value={novaProf.kategorie}
                        onChange={(e) => setNovaProf((f) => ({ ...f, kategorie: e.target.value as FakturaKategorie }))}>
                        <option value="zbozi">Zboží</option>
                        <option value="sluzby">Služby</option>
                        <option value="najem">Nájem</option>
                        <option value="energie">Energie</option>
                        <option value="ostatni">Ostatní</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fs-12 fw-semibold">Navázání na finální fakturu (volitelné)</label>
                      <input type="text" className="form-control form-control-sm czk-num"
                        placeholder="ID nebo číslo finální faktury (pokud už víte)"
                        value={novaProf.spojenaSId}
                        onChange={(e) => setNovaProf((f) => ({ ...f, spojenaSId: e.target.value }))} />
                      <div className="text-muted fs-11 mt-1">
                        Pokud necháte prázdné, systém vás upozorní při finální fakturaci od stejného dodavatele.
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fs-12 fw-semibold">Poznámka</label>
                      <textarea className="form-control form-control-sm" rows={2}
                        placeholder="Volitelný komentář"
                        value={novaProf.poznamka}
                        onChange={(e) => setNovaProf((f) => ({ ...f, poznamka: e.target.value }))} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fs-12 fw-semibold">Příloha (doklad)</label>
                      {novaProfDocument ? (
                        <div className="border rounded d-flex align-items-center justify-content-between p-2 px-3"
                             style={{ background: '#e8f5e9', borderColor: '#198754' }}>
                          <div className="d-flex align-items-center gap-2">
                            <iconify-icon icon="solar:document-text-bold-duotone" style={{ fontSize: 22, color: '#198754' }} />
                            <div>
                              <div className="fw-semibold fs-13">{novaProfDocument}</div>
                              <div className="text-muted fs-11">Dokument připraven k uložení</div>
                            </div>
                          </div>
                          <button className="btn btn-sm btn-link text-danger p-0" onClick={() => setNovaProfDocument(null)} title="Odebrat dokument">
                            <iconify-icon icon="solar:trash-bin-trash-bold-duotone" style={{ fontSize: 18 }} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className="border rounded d-flex align-items-center justify-content-center"
                          style={{ height: 80, background: '#f8f9fa', cursor: 'pointer' }}
                          onClick={() => setNovaProfDocument(`proforma-${novaProf.cislo || 'mock'}.pdf`)}
                        >
                          <div className="text-center text-muted fs-13">
                            <iconify-icon icon="solar:upload-bold-duotone" style={{ fontSize: 22 }} className="d-block mx-auto mb-1" />
                            <strong className="text-info">Přidat dokument</strong>
                            <span className="ms-2">— přetáhněte PDF nebo klikněte pro výběr</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                <div className="d-flex justify-content-end gap-2 mt-3 pt-3 border-top">
                  <button className="btn btn-light btn-sm" onClick={() => setShowNovaProforma(false)}>
                    Zrušit
                  </button>
                  <button className="btn btn-info btn-sm" onClick={handleSaveProforma}>
                    <iconify-icon icon="solar:diskette-bold-duotone" className="me-1" />
                    Uložit proformu
                  </button>
                </div>
            </div>
          </div>
        </>
      )}

      {/* Phase 8.3 (zápis 19. 6. 2026) — Confirm dialog: uložit bez přiloženého dokumentu? */}
      {showNoDocConfirm && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 400 }} onClick={() => setShowNoDocConfirm(null)} />
          <div className="modal fade show d-block" style={{ zIndex: 500 }} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header bg-warning-subtle">
                  <h5 className="modal-title d-flex align-items-center gap-2">
                    <iconify-icon icon="solar:danger-triangle-bold-duotone" style={{ fontSize: 22, color: '#fd7e14' }} />
                    Uložit bez dokumentu?
                  </h5>
                  <button className="btn-close" onClick={() => setShowNoDocConfirm(null)} />
                </div>
                <div className="modal-body">
                  <p className="mb-2">
                    K {showNoDocConfirm.typ === 'proforma' ? 'proformě' : 'faktuře'} jste nepřiložil/a žádný dokument (PDF).
                  </p>
                  <p className="text-muted fs-13 mb-0">
                    Záznam bude označen jako <strong>bez přílohy</strong> — fakturanti budou dokument muset dohledat
                    a doplnit později. Doporučujeme přiložit PDF už teď.
                  </p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-light btn-sm" onClick={() => setShowNoDocConfirm(null)}>
                    Zpět — přiložit dokument
                  </button>
                  <button className="btn btn-warning btn-sm" onClick={confirmSaveWithoutDoc}>
                    Uložit i tak bez dokumentu
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
