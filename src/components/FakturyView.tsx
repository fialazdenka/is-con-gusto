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

import { useState, useCallback, useEffect, useRef, Fragment } from 'react';
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
import { DANE, DAN_TYP_META, DAN_STAV_META, PRAVNI_ENTITA_DAN_LABEL } from '../daneData';
import type { DanTyp, PravniEntitaDan } from '../daneData';

export type SortCol = 'cislo' | 'dodavatel' | 'castka' | 'splatnost' | 'odeslatDo' | 'stav' | null;

// Stav chips pro PŘIJATÉ faktury (workflow schvalování)
const STAV_CHIPS: { value: FakturaStavPlatby; label: string }[] = [
  { value: 'nova',                label: 'Nová' },
  { value: 'ceka-na-schvaleni',   label: 'Čeká na schválení' },
  { value: 'castecne-schvalena',  label: 'Částečně schválená' },
  { value: 'schvalena',           label: 'Schválená' },
  { value: 'pozastavena',         label: 'Pozastavená' },
  { value: 'zamitnuta',           label: 'Zamítnutá' },
  { value: 'v-bance',             label: 'V bance' },
  { value: 'v-bance-neuhrazena',  label: 'V bance neuhrazená' },
  { value: 'uhrazena',            label: 'Uhrazená' },
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

// Rychlý výběr období (stejné předvolby jako Tržby detail; referenční datum 2026-04-17)
const DATE_PRESETS: { label: string; from: string; to: string }[] = [
  { label: 'Dnes',           from: '2026-04-17', to: '2026-04-17' },
  { label: 'Včera',          from: '2026-04-16', to: '2026-04-16' },
  { label: 'Aktuální týden', from: '2026-04-13', to: '2026-04-17' },
  { label: 'Minulý týden',   from: '2026-04-06', to: '2026-04-12' },
  { label: 'Aktuální měsíc', from: '2026-04-01', to: '2026-04-17' },
  { label: 'Minulý měsíc',   from: '2026-03-01', to: '2026-03-31' },
  { label: 'Aktuální rok',   from: '2026-01-01', to: '2026-04-17' },
  { label: 'Minulý rok',     from: '2025-01-01', to: '2025-12-31' },
];

// Zjednodušený filtr „Stav úhrady" (mapuje na set FakturaStavPlatby)
const STAV_UHRADY_OPTIONS: { value: string; label: string; set: FakturaStavPlatby[] }[] = [
  { value: 'all',           label: 'Všechny',       set: [] },
  { value: 'uhrazene',      label: 'Uhrazené',      set: ['uhrazena'] },
  { value: 'neuhrazene',    label: 'Neuhrazené',    set: ['nova', 'ceka-na-schvaleni', 'castecne-schvalena', 'schvalena', 'pozastavena', 'v-bance', 'v-bance-neuhrazena'] },
  { value: 'po-splatnosti', label: 'Po splatnosti', set: ['v-bance-neuhrazena'] },
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
import { PROVOZOVNY, fCzk, fDate } from '../data';
import PlatbyKPIStrip from './PlatbyKPIStrip';
import FakturyTable from './FakturyTable';
import FakturySidePanel from './FakturySidePanel';
import type { KomentarEntry } from './FakturySidePanel';

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
  // Phase 8.10 (zápis 22. 6. 2026) — Faktury rozdělené na 2 samostatné podsekce v sidebar.
  // Pokud je `fixedTyp` zadané, FakturyView zafixuje tab na daný typ a tab-switcher skryje.
  fixedTyp?: TypDokladu;
}

export default function FakturyView({ state, update, fixedTyp }: Props) {
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
  // Phase 8.11 (zápis 22. 6. 2026) — Datum filter (splatnost od/do) v dolním filter baru.
  // Defaultně prázdné = bez omezení. Když je vyplněné, filtruje tabulku podle splatnosti.
  const [datumOd,            setDatumOd]            = useState('');
  const [datumDo,            setDatumDo]            = useState('');
  const [sortBy,             setSortBy]             = useState<SortCol>('splatnost');
  const [sortDir,            setSortDir]            = useState<'asc' | 'desc'>('asc');
  // Zjednodušené filtry (zápis 13. 7. 2026 — dle reference)
  const [searchBy,           setSearchBy]           = useState<'cislo' | 'dodavatel' | 'vs'>('cislo');
  const [stavUhrady,         setStavUhrady]         = useState('all');
  const [datumPodle,         setDatumPodle]         = useState<'vystaveni' | 'splatnost'>('vystaveni');
  // Phase 8.10 — když je fixedTyp zadané, použij ho jako default. Tab-switcher pak skryje.
  const [typDokladu,         setTypDokladu]         = useState<TypDokladu | 'all'>(fixedTyp ?? 'all');
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
  // 'new-dane' (zápis 14. 7. 2026) — záznam daňového dokladu (jen u přijatých); formulář ve stylu faktury.
  type ViewMode = 'list' | 'new-faktura' | 'new-proforma' | 'new-vydana' | 'new-vydana-proforma' | 'new-dane';
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const showNovaFaktura  = viewMode === 'new-faktura';
  const showNovaProforma = viewMode === 'new-proforma';
  const showVystavit     = viewMode === 'new-vydana' || viewMode === 'new-vydana-proforma';
  const showNovaDane     = viewMode === 'new-dane';
  const isProformaVystavit = viewMode === 'new-vydana-proforma';
  const setShowNovaFaktura = (v: boolean) => setViewMode(v ? 'new-faktura' : 'list');
  const setShowNovaProforma = (v: boolean) => setViewMode(v ? 'new-proforma' : 'list');
  const setShowVystavit     = (v: boolean) => setViewMode(v ? 'new-vydana' : 'list');
  const setShowVystavitProforma = (v: boolean) => setViewMode(v ? 'new-vydana-proforma' : 'list');
  const setShowNovaDane     = (v: boolean) => setViewMode(v ? 'new-dane' : 'list');
  // Daně jako sekce horního výběru (jen Přijaté). daneMode = aktivní záložka „Daně" v list view.
  const [daneMode, setDaneMode] = useState(false);
  const [novaDane, setNovaDane] = useState({
    typ: 'dph' as DanTyp,
    obdobi: '2026-Q2',
    pravniEntita: 'con-gusto' as PravniEntitaDan,
    provozovna: '',
    castka: '',
    duzp: '2026-04-17',
    splatnost: '',
    vs: '',
    ucetPlatby: '',
    popis: '',
  });
  const [novaDaneSchvalovatele, setNovaDaneSchvalovatele] = useState<string[]>([]);
  const [novaDaneDocument, setNovaDaneDocument] = useState<string | null>(null);
  const [novaFa, setNovaFa] = useState({
    typDokladu: 'prijata' as TypDokladu,
    forma: 'standard' as FakturaForma,
    dodavatel: '',
    kontaktEmail: '',
    kontaktMobil: '',
    ico: '',
    dic: '',
    osoba: '',
    cislo: '',
    kategorie: 'zbozi' as FakturaKategorie,
    provozovna: selectedProvozovna === 'all' ? 'cg-brno' : selectedProvozovna,
    // Platební údaje
    zpusobUhrady: '' as '' | 'prevod' | 'hotovost' | 'karta',
    vs: '',
    ksymbol: '',
    ssymbol: '',
    autoUhradit: false,
    // Datumy
    datum: '2026-04-23',
    splatnost: '',
    duzp: '2026-04-23',
    // Detaily
    zaokrouhleni: 'desetinne' as 'desetinne' | 'nahoru' | 'zadne',
    mena: 'CZK',
    castka: '',
    spodniText: '',
    poznamka: '',            // interní poznámka
    prirazenaOsoba: '',
    // Automatické schválení
    ucetPlatby: '',
    autoSchvalit: false,
  });
  // UI toggly detailního formuláře Nová přijatá faktura (dle reference Fakturoid)
  const [novaFaViceDetailu, setNovaFaViceDetailu] = useState(false);
  const [novaFaKontaktInfo, setNovaFaKontaktInfo] = useState(false);
  // Schvalovatelé přijaté faktury (více osob — kdokoli z nich může fakturu schválit → jde k úhradě).
  // Dává smysl jen u přijaté faktury (u vydané se neschvaluje).
  const [novaFaSchvalovatele, setNovaFaSchvalovatele] = useState<string[]>([]);
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

  // Overlay detail — zavření klávesou Esc
  useEffect(() => {
    if (!drawerFakturaId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerFakturaId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerFakturaId]);

  // Overlay detail — začíná pod hlavičkou tabulky „Přehled faktur" (ta zůstává nad ním).
  // Pozici píšeme imperativně přímo na DOM (přes ref), aby scroll nepřekresloval celý view.
  const tableColRef = useRef<HTMLDivElement>(null);
  const overlayPanelRef = useRef<HTMLDivElement>(null);
  const overlayBackdropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!drawerFakturaId) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const topbar = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bs-topbar-height')) || 100;
      const hdr = tableColRef.current?.querySelector('.card-header') as HTMLElement | null;
      const top = `${Math.max(topbar, hdr ? hdr.getBoundingClientRect().bottom : topbar)}px`;
      if (overlayPanelRef.current) overlayPanelRef.current.style.top = top;
      if (overlayBackdropRef.current) overlayBackdropRef.current.style.top = top;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [drawerFakturaId]);

  // Phase 8.10 (zápis 22. 6. 2026) — Když uživatel přepne v sidebaru mezi Přijaté/Vydané,
  // FakturyView se rerendruje se stejným klíčem, ale fixedTyp se změní → sync interní typDokladu.
  useEffect(() => {
    if (fixedTyp && fixedTyp !== typDokladu) {
      setTypDokladu(fixedTyp);
      setStavFilters(new Set());        // přijaté ↔ vydané mají různé stavy
      setSelectedIds(new Set());
      setDrawerFakturaId(null);          // zavřít otevřený detail
    }
    // Daně jsou jen u přijatých — při přepnutí na vydané režim vypnout
    if (fixedTyp === 'vydana') { setDaneMode(false); if (viewMode === 'new-dane') setViewMode('list'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedTyp]);

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
    || datumOd !== '' || datumDo !== ''
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
      {/* Horní action bar odebrán (zápis 13. 7. 2026) — CTA pro zadání dokladu je nově POD
          výběrem typu dokladu a kontextově zohledňuje vybraný typ. */}

      {/* Hlavička sekce: Typ dokladu (vlevo) + CTA „Nová faktura" vpravo nahoře (zápis 21. 7. 2026).
          Tab bar = NADŘAZENÝ výběr; KPI / filtry / tabulka reflektují výběr. */}
      <div className="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-3" style={{ borderBottom: '2px solid #e9ecef' }}>
      {(() => {
        const formaCounts = {
          standard:  allFakturyRaw.filter((f) => !f.forma || f.forma === 'standard').length,
          dobropis:  allFakturyRaw.filter((f) => f.forma === 'dobropis').length,
          zalohova:  allFakturyRaw.filter((f) => f.forma === 'zalohova').length,
          offset:    allFakturyRaw.filter((f) => f.forma === 'offset').length,
        };
        const formaTab: 'all' | FakturaForma = formaFilters.size === 1 ? Array.from(formaFilters)[0] : 'all';
        const setFormaTab = (tab: 'all' | FakturaForma) => setFormaFilters(tab === 'all' ? new Set() : new Set([tab]));
        const tabs: { value: 'all' | FakturaForma; label: string; count: number; icon: string; color: string }[] = [
          { value: 'all',      label: 'Vše',              count: allFakturyRaw.length, icon: 'solar:layers-bold-duotone',          color: '#6c757d' },
          { value: 'standard', label: 'Faktury',          count: formaCounts.standard, icon: 'solar:bill-list-bold-duotone',       color: '#0d6efd' },
          { value: 'dobropis', label: 'Dobropisy',        count: formaCounts.dobropis, icon: 'solar:undo-left-round-bold-duotone', color: '#dc3545' },
          { value: 'zalohova', label: 'Zálohové faktury', count: formaCounts.zalohova, icon: 'solar:wallet-money-bold-duotone',    color: '#0dcaf0' },
          { value: 'offset',   label: 'Jiné',             count: formaCounts.offset,   icon: 'solar:transfer-horizontal-bold-duotone', color: '#fd7e14' },
        ];
        // Záložka „Daně" jen u přijatých dokladů (zápis 14. 7. 2026)
        const showDaneTab = fixedTyp === 'prijata' || !fixedTyp;
        const daneColor = '#0dcaf0';
        return (
          <div>
            <div className="d-flex align-items-center gap-1 flex-wrap">
              {tabs.map((t) => {
                const active = !daneMode && formaTab === t.value;
                return (
                  <button key={t.value} type="button" onClick={() => { setDaneMode(false); setFormaTab(t.value); }}
                    className="btn d-flex align-items-center gap-2"
                    style={{
                      fontSize: 14,
                      fontWeight: active ? 700 : 500,
                      color: active ? t.color : '#6c757d',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `3px solid ${active ? t.color : 'transparent'}`,
                      borderRadius: 0,
                      padding: '9px 16px',
                      marginBottom: -2,
                    }}>
                    <iconify-icon icon={t.icon} style={{ fontSize: 18 }} />
                    {t.label}
                    <span className="badge rounded-pill" style={{
                      fontSize: 11,
                      background: active ? t.color : '#eef0f2',
                      color: active ? '#fff' : '#6c757d',
                    }}>{t.count}</span>
                  </button>
                );
              })}
              {showDaneTab && (() => {
                const daneCount = DANE.length;
                return (
                  <button type="button" onClick={() => { setDaneMode(true); setFormaFilters(new Set()); }}
                    className="btn d-flex align-items-center gap-2"
                    style={{
                      fontSize: 14,
                      fontWeight: daneMode ? 700 : 500,
                      color: daneMode ? daneColor : '#6c757d',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `3px solid ${daneMode ? daneColor : 'transparent'}`,
                      borderRadius: 0,
                      padding: '9px 16px',
                      marginBottom: -2,
                    }}>
                    <iconify-icon icon="solar:bill-check-bold-duotone" style={{ fontSize: 18 }} />
                    Daně
                    <span className="badge rounded-pill" style={{
                      fontSize: 11,
                      background: daneMode ? daneColor : '#eef0f2',
                      color: daneMode ? '#fff' : '#6c757d',
                    }}>{daneCount}</span>
                  </button>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* Kontextové CTA vpravo nahoře — zohledňuje vybraný typ dokladu.
          Přijaté → „Přijatá faktura/dobropis/…"; Vydané → „Vystavit fakturu/dobropis/…". */}
      {(() => {
        const forma: FakturaForma = formaFilters.size === 1 ? Array.from(formaFilters)[0] : 'standard';
        const prijataLabel: Record<FakturaForma, string> = {
          standard: 'Přijatá faktura',
          dobropis: 'Přijatý dobropis',
          zalohova: 'Přijatá zálohová faktura',
          offset:   'Přijatý doklad',
        };
        const vydanaLabel: Record<FakturaForma, string> = {
          standard: 'Vystavit fakturu',
          dobropis: 'Vystavit dobropis',
          zalohova: 'Vystavit zálohovou fakturu',
          offset:   'Vystavit doklad',
        };
        const prov = selectedProvozovna === 'all' ? 'cg-brno' : selectedProvozovna;
        const openPrijata = () => {
          setNovaFa((f) => ({ ...f, typDokladu: 'prijata', forma, provozovna: prov }));
          setShowNovaFaktura(true);
        };
        const openVydana = () => {
          if (forma === 'zalohova') {
            setNovaVyd((f) => ({ ...f, cislo: 'ZAL-2026-0013', provozovna: prov }));
            setShowVystavitProforma(true);
          } else {
            setNovaVyd((f) => ({ ...f, provozovna: prov }));
            setShowVystavit(true);
          }
        };
        const showPrijata = fixedTyp === 'prijata' || !fixedTyp;
        const showVydana  = fixedTyp === 'vydana'  || !fixedTyp;
        // V režimu Daně nabídneme jen „Přidat daňový doklad" (formulář ve stylu faktury)
        if (daneMode) {
          return (
            <div className="d-flex gap-2 flex-wrap pb-2">
              <button className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                onClick={() => { setNovaDane((d) => ({ ...d, provozovna: prov })); setShowNovaDane(true); }}
                title="Zadat daňový doklad (DPH, DPPO, silniční…)">
                <iconify-icon icon="solar:bill-check-bold-duotone" />
                Přidat daňový doklad
              </button>
            </div>
          );
        }
        return (
          <div className="d-flex gap-2 flex-wrap pb-2">
            {showPrijata && (
              <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={openPrijata}
                title="Zadat přijatý doklad vybraného typu">
                <iconify-icon icon="solar:download-square-bold-duotone" />
                {prijataLabel[forma]}
              </button>
            )}
            {showVydana && (
              <button className="btn btn-success btn-sm d-flex align-items-center gap-1" onClick={openVydana}
                title="Vystavit doklad vybraného typu">
                <iconify-icon icon="solar:document-add-bold-duotone" />
                {vydanaLabel[forma]}
              </button>
            )}
          </div>
        );
      })()}
      </div>

      {/* Obsah faktur (upozornění + filtry + tabulka) — skryté v režimu Daně */}
      {!daneMode && (
      <>
      {/* Kompaktní upozornění (zápis 13. 7. 2026) — ve stejném duchu jako Banka/Trvalé příkazy,
          ale ne přes celou šířku: řádek kompaktních klikatelných karet. Klik aplikuje filtr. */}
      {(() => {
        const stavOf = (f: typeof allFakturyRaw[number]) => localStavy[f.id] ?? f.stav;
        const paid = (s: FakturaStavPlatby) => s === 'uhrazena' || s === 'zaplacena';
        const base = allFakturyRaw.filter((f) => typDokladu === 'all' || f.typDokladu === typDokladu);
        const dobropisNeuhr = base.filter((f) => f.forma === 'dobropis' && !paid(stavOf(f)) && stavOf(f) !== 'zamitnuta');
        const zalohNeuhr    = base.filter((f) => f.forma === 'zalohova' && !paid(stavOf(f)) && stavOf(f) !== 'zamitnuta');
        const zalohNespar   = base.filter((f) => f.forma === 'zalohova' && paid(stavOf(f)) && !f.spojenaSId);
        const pozastavene   = base.filter((f) => stavOf(f) === 'pozastavena');
        const castecne      = base.filter((f) => stavOf(f) === 'castecne-schvalena');

        const neuhrSet = new Set(STAV_UHRADY_OPTIONS.find((o) => o.value === 'neuhrazene')?.set ?? []);
        const uhrSet   = new Set(STAV_UHRADY_OPTIONS.find((o) => o.value === 'uhrazene')?.set ?? []);

        // Upozornění reflektuje výběr v horní liště (Typ dokladu): při „Vše" se ukážou všechna,
        // jinak jen ta, která patří k vybranému typu dokladu.
        const formaTab: 'all' | FakturaForma = formaFilters.size === 1 ? Array.from(formaFilters)[0] : 'all';

        const cards = [
          {
            key: 'dobropis-neuhr', forma: 'dobropis' as FakturaForma, show: dobropisNeuhr.length > 0, count: dobropisNeuhr.length,
            label: 'Neuhrazené dobropisy', color: '#dc3545', icon: 'solar:undo-left-round-bold-duotone',
            onClick: () => { setFormaFilters(new Set(['dobropis'])); setStavUhrady('neuhrazene'); setStavFilters(new Set(neuhrSet)); },
          },
          {
            key: 'zaloh-neuhr', forma: 'zalohova' as FakturaForma, show: zalohNeuhr.length > 0, count: zalohNeuhr.length,
            label: 'Neuhrazené zálohové', color: '#fd7e14', icon: 'solar:wallet-money-bold-duotone',
            onClick: () => { setFormaFilters(new Set(['zalohova'])); setStavUhrady('neuhrazene'); setStavFilters(new Set(neuhrSet)); },
          },
          {
            key: 'zaloh-nespar', forma: 'zalohova' as FakturaForma, show: zalohNespar.length > 0, count: zalohNespar.length,
            label: 'Zálohové bez finální faktury', color: '#6f42c1', icon: 'solar:link-broken-minimalistic-bold-duotone',
            onClick: () => { setFormaFilters(new Set(['zalohova'])); setStavUhrady('uhrazene'); setStavFilters(new Set(uhrSet)); },
          },
          {
            key: 'pozastavene', forma: 'standard' as FakturaForma, show: pozastavene.length > 0, count: pozastavene.length,
            label: 'Pozastavené faktury', color: '#e08e0b', icon: 'solar:pause-circle-bold-duotone',
            onClick: () => { setFormaFilters(new Set()); setStavUhrady('all'); setStavFilters(new Set(['pozastavena'])); },
          },
          {
            key: 'castecne', forma: 'standard' as FakturaForma, show: castecne.length > 0, count: castecne.length,
            label: 'Režie čeká na účetní', color: '#e67e00', icon: 'solar:pie-chart-2-bold-duotone',
            onClick: () => { setFormaFilters(new Set()); setStavUhrady('all'); setStavFilters(new Set(['castecne-schvalena'])); },
          },
        ].filter((c) => c.show && (formaTab === 'all' || c.forma === formaTab));

        if (cards.length === 0) return null;
        return (
          <div className="d-flex flex-wrap gap-2 mb-3">
            {cards.map((c) => (
              <button key={c.key} type="button" onClick={c.onClick}
                className="btn text-start p-0 border-0 bg-transparent"
                style={{ minWidth: 220, flex: '0 1 auto' }}
                title="Klikni pro zobrazení v tabulce">
                <div className="d-flex align-items-center gap-2 border rounded px-3 py-2 h-100 bg-white"
                  style={{ borderLeft: `4px solid ${c.color}` }}>
                  <span className="rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 36, height: 36, background: `${c.color}1a`, color: c.color }}>
                    <iconify-icon icon={c.icon} style={{ fontSize: 19 }} />
                  </span>
                  <div>
                    <div className="fw-bold lh-1 czk-num" style={{ fontSize: 20, color: c.color }}>{c.count}</div>
                    <div className="fs-12 text-muted mt-1">{c.label}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        );
      })()}

      {/* Záložky Přijaté / Vydané – SOURCE: Bootstrap .nav.nav-tabs.
          Phase 8.10 (zápis 22. 6. 2026) — když je fixedTyp zadané ze sidebar (Přijaté/Vydané),
          tab switcher skryjeme — uživatel přepíná přes sidebar, ne přes taby. */}
      {!fixedTyp && (
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
                if (t.value === 'vydana') setDaneMode(false);  // Daně jen u přijatých
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
      )}

      {/* Filter bar (zjednodušený — zápis 13. 7. 2026, dle reference) */}
      <div className="card mb-4">
        <div className="card-body py-3">
          {/* Řádek 1 — vyhledávání + řazení + stav úhrady */}
          <div className="row g-3">
            <div className="col-12 col-md">
              <label className="form-label fs-13 fw-semibold mb-1">Hledat</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Hledat…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-6 col-md">
              <label className="form-label fs-13 fw-semibold mb-1">Vyhledat podle</label>
              <select
                className="form-select form-select-sm"
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value as typeof searchBy)}
              >
                <option value="cislo">Čísla faktury</option>
                <option value="dodavatel">Dodavatele</option>
                <option value="vs">Variabilního symbolu</option>
              </select>
            </div>
            <div className="col-6 col-md">
              <label className="form-label fs-13 fw-semibold mb-1">Seřadit podle</label>
              <select
                className="form-select form-select-sm"
                value={sortBy ?? ''}
                onChange={(e) => setSortBy((e.target.value || null) as SortCol)}
              >
                <option value="">Vyberte možnost</option>
                <option value="cislo">Čísla faktury</option>
                <option value="dodavatel">Dodavatele</option>
                <option value="castka">Částky</option>
                <option value="splatnost">Splatnosti</option>
                <option value="stav">Stavu</option>
              </select>
            </div>
            <div className="col-6 col-md">
              <label className="form-label fs-13 fw-semibold mb-1">Seřadit</label>
              <select
                className="form-select form-select-sm"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
              >
                <option value="desc">Od nejnovějších</option>
                <option value="asc">Od nejstarších</option>
              </select>
            </div>
          </div>

          {/* Řádek 2 — období + typ data + náklad */}
          <div className="row g-3 mt-1">
            {/* Rychlý výběr období (jako v Tržby detail) — nastaví Od/Do; ty zůstávají editovatelné ručně */}
            <div className="col-6 col-md">
              <label className="form-label fs-13 fw-semibold mb-1">Rychlý výběr</label>
              <select
                className="form-select form-select-sm"
                value={DATE_PRESETS.find((p) => p.from === datumOd && p.to === datumDo)?.label ?? ''}
                onChange={(e) => {
                  const preset = DATE_PRESETS.find((p) => p.label === e.target.value);
                  if (preset) { setDatumOd(preset.from); setDatumDo(preset.to); }
                  else { setDatumOd(''); setDatumDo(''); }
                }}
              >
                <option value="">— Období —</option>
                {DATE_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md">
              <label className="form-label fs-13 fw-semibold mb-1">Od</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={datumOd}
                onChange={(e) => setDatumOd(e.target.value)}
              />
            </div>
            <div className="col-6 col-md">
              <label className="form-label fs-13 fw-semibold mb-1">Do</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={datumDo}
                onChange={(e) => setDatumDo(e.target.value)}
              />
            </div>
            <div className="col-6 col-md">
              <label className="form-label fs-13 fw-semibold mb-1">Podle</label>
              <select
                className="form-select form-select-sm"
                value={datumPodle}
                onChange={(e) => setDatumPodle(e.target.value as typeof datumPodle)}
              >
                <option value="vystaveni">Datum vystavení</option>
                <option value="splatnost">Datum splatnosti</option>
              </select>
            </div>
            <div className="col-6 col-md">
              <label className="form-label fs-13 fw-semibold mb-1">Obsahuje náklad</label>
              <select
                className="form-select form-select-sm"
                value={kategorieFilter}
                onChange={(e) => setKategorieFilter(e.target.value)}
              >
                <option value="all">Vyberte možnost</option>
                {(Object.keys(KATEGORIE_LABELS) as FakturaKategorie[]).map((k) => (
                  <option key={k} value={k}>{KATEGORIE_LABELS[k]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Řádek 3 — částka Od–Do + multi-checkbox Stav (zápis 21. 7. 2026) */}
          <div className="row g-3 mt-1 align-items-end">
            <div className="col-6 col-md-2">
              <label className="form-label fs-13 fw-semibold mb-1">Částka od (Kč)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="0"
                value={castkaOd}
                onChange={(e) => setCastkaOd(e.target.value)}
                onWheel={(e) => (e.target as HTMLElement).blur()}
              />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label fs-13 fw-semibold mb-1">Částka do (Kč)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                placeholder="∞"
                value={castkaDo}
                onChange={(e) => setCastkaDo(e.target.value)}
                onWheel={(e) => (e.target as HTMLElement).blur()}
              />
            </div>
            <div className="col-12 col-md">
              <label className="form-label fs-13 fw-semibold mb-1 d-flex align-items-center gap-2">
                Stav
                {stavFilters.size > 0 && (
                  <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none fs-11"
                    onClick={() => setStavFilters(new Set())}>
                    <iconify-icon icon="solar:close-circle-bold-duotone" className="me-1" />
                    Zrušit ({stavFilters.size})
                  </button>
                )}
              </label>
              <div className="d-flex flex-wrap gap-1">
                {(typDokladu === 'vydana'
                  ? STAV_CHIPS_VYDANE
                  : typDokladu === 'prijata'
                    ? STAV_CHIPS
                    : [...STAV_CHIPS, ...STAV_CHIPS_VYDANE]
                ).map((c) => {
                  const active = stavFilters.has(c.value);
                  return (
                    <button key={c.value} type="button"
                      className={`badge border-0 ${active ? 'bg-dark text-white' : 'bg-secondary-subtle text-secondary'}`}
                      style={{ cursor: 'pointer', fontSize: 11 }}
                      onClick={() => setStavFilters((prev) => {
                        const n = new Set(prev);
                        if (n.has(c.value)) n.delete(c.value); else n.add(c.value);
                        return n;
                      })}>
                      {active && <iconify-icon icon="solar:check-circle-bold" className="me-1" style={{ fontSize: 11 }} />}
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Layout: tabulka vždy full-width; detail se otevře jako overlay okno ── */}
      <div className="row g-4">
        <div className="col-12" ref={tableColRef}>
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
            datumOd={datumOd}
            datumDo={datumDo}
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
            showMatching={false}
            tableTitle="Přehled faktur"
            showZaplacene={true}
            selectedRowId={drawerFakturaId}
            search={search}
            onRowClick={(id) => {
              setDrawerFakturaId((prev) => prev === id ? null : id);
              if (!schvalovaniQueue.includes(id)) setSchvalovaniQueue([]);
            }}
          />
        </div>
      </div>

      {/* ── Overlay detail faktury (offcanvas zprava, roluje se celý) ── */}
      {drawerFaktura && (
        <>
          <div ref={overlayBackdropRef} className="faktury-overlay-backdrop" onClick={() => setDrawerFakturaId(null)} />
          <div ref={overlayPanelRef} className="faktury-overlay-panel">
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
        </>
      )}

      {/* Bulk toolbar odstraněn (zápis 21. 7. 2026) — jednořádkový systém bez hromadného výběru. */}
      </>
      )}

      {/* Sekce Daně (zápis 14. 7. 2026) — v rámci list view, jen když je aktivní záložka „Daně".
          Evidence daňových dokladů (DPH, DPPO, silniční…), zadávané formulářem ve stylu faktury. */}
      {daneMode && (() => {
        const daneList = DANE.filter((d) =>
          selectedProvozovna === 'all' || !d.provozovnaId || d.provozovnaId === selectedProvozovna
        );
        return (
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between gap-3">
              <h5 className="card-title mb-0">
                Daňové doklady
                <small className="text-muted fw-normal ms-2 fs-13">
                  {daneList.length} {daneList.length === 1 ? 'záznam' : daneList.length < 5 ? 'záznamy' : 'záznamů'}
                </small>
              </h5>
            </div>
            <div className="table-responsive">
              <table className="table table-hover table-centered table-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Druh daně</th>
                    <th>Období</th>
                    <th>Splatnost</th>
                    <th>Právní entita</th>
                    <th className="text-end">Částka</th>
                    <th>Stav</th>
                  </tr>
                </thead>
                <tbody>
                  {daneList.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-4 text-muted">Žádné daňové doklady</td></tr>
                  )}
                  {daneList.map((d) => {
                    const tm = DAN_TYP_META[d.typ];
                    const sm = DAN_STAV_META[d.stav];
                    return (
                      <tr key={d.id} style={{ cursor: 'pointer' }}>
                        <td>
                          <span className="d-inline-flex align-items-center gap-2">
                            <span className="rounded d-inline-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: 30, height: 30, background: tm.bg, color: tm.color }}>
                              <iconify-icon icon={tm.icon} style={{ fontSize: 16 }} />
                            </span>
                            <span>
                              <span className="fw-semibold d-block">{tm.label}</span>
                              {d.popis && <span className="text-muted fs-11">{d.popis}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="czk-num">{d.obdobi}</td>
                        <td className="czk-num">{fDate(d.splatnost)}</td>
                        <td className="fs-13">{PRAVNI_ENTITA_DAN_LABEL[d.pravniEntita]}</td>
                        <td className="text-end fw-bold czk-num">{fCzk(d.castka)}</td>
                        <td><span className={`badge ${sm.cls}`}>
                          <iconify-icon icon={sm.icon} className="me-1" style={{ fontSize: 11 }} />
                          {sm.label}
                        </span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card-footer py-3 bg-light bg-opacity-50">
              <span className="text-muted fs-12">
                Daňové doklady vstupují jako „Ostatní" platby — po schválení se odešlou do banky k úhradě.
              </span>
            </div>
          </div>
        );
      })()}

      </>
      )}

      {/* Phase 8 (zápis 19. 6. 2026) — Podstránka: Nová faktura (full-page, ne modal) */}
      {showNovaFaktura && (() => {
        const dphSazby = [0, 12, 21];
        const dphBreakdown = dphSazby.map((sazba) => {
          const pol = vystPolozky.filter((x) => x.dphSazba === sazba);
          const zaklad = pol.reduce((s, x) => s + x.pocet * x.cenaJedn, 0);
          const dph = zaklad * sazba / 100;
          return { sazba, zaklad, dph, vcetne: zaklad + dph };
        });
        const celkemBezDph = vystPolozky.reduce((s, x) => s + x.pocet * x.cenaJedn, 0);
        const celkemDph    = dphBreakdown.reduce((s, b) => s + b.dph, 0);
        const celkemVcetne = celkemBezDph + celkemDph;
        const formaLabel = ({ standard: 'Faktura', dobropis: 'Dobropis', zalohova: 'Zálohová faktura', offset: 'Doklad' } as Record<FakturaForma, string>)[novaFa.forma];
        return (
        <>
          <div className="page-title-box">
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-light btn-sm d-flex align-items-center gap-1" onClick={() => setShowNovaFaktura(false)} title="Zpět na seznam faktur">
                <iconify-icon icon="solar:alt-arrow-left-bold-duotone" style={{ fontSize: 16 }} />
                Zpět na seznam
              </button>
              <span className="text-muted">/</span>
              <span className="fw-semibold">Vytváření dokladu</span>
            </div>
          </div>

          {/* Hlavička + Načíst ISDOC */}
          <div className="card mb-3">
            <div className="card-body py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <h5 className="mb-0">Vytváření dokladu — {formaLabel}</h5>
              <button className="btn btn-secondary btn-sm d-flex align-items-center gap-1" title="Načíst doklad z ISDOC (XML) — mock">
                <iconify-icon icon="solar:import-bold-duotone" />
                Načíst ISDOC
              </button>
            </div>
          </div>

          {/* 3 sloupce: Dodavatel / Platební údaje / Datumy */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="row g-4">
                {/* Dodavatel */}
                <div className="col-lg-4">
                  <h6 className="fw-bold mb-3">Dodavatel</h6>
                  <label className="form-label fs-13 fw-semibold">Název <span className="text-danger">*</span></label>
                  <div className="d-flex gap-1">
                    <input type="text" className="form-control form-control-sm" placeholder="Název dodavatele…" value={novaFa.dodavatel} onChange={(e) => setNovaFa((f) => ({ ...f, dodavatel: e.target.value }))} />
                    <button className="btn btn-secondary btn-sm flex-shrink-0" title="Přidat nového dodavatele"><iconify-icon icon="solar:add-circle-bold-duotone" /></button>
                  </div>
                  <label className="form-label fs-13 fw-semibold mt-2">Kontaktní e-mail</label>
                  <input type="email" className="form-control form-control-sm" value={novaFa.kontaktEmail} onChange={(e) => setNovaFa((f) => ({ ...f, kontaktEmail: e.target.value }))} />
                  <button type="button" className="btn btn-light btn-sm w-100 mt-2" onClick={() => setNovaFaKontaktInfo((v) => !v)}>
                    {novaFaKontaktInfo ? 'Skrýt kontaktní informace' : 'Zobrazit kontaktní informace'}
                  </button>
                  {novaFaKontaktInfo && (
                    <div className="mt-2 d-flex flex-column gap-2">
                      <div>
                        <label className="form-label fs-12 mb-1">Kontaktní mobil</label>
                        <input type="text" className="form-control form-control-sm" value={novaFa.kontaktMobil} onChange={(e) => setNovaFa((f) => ({ ...f, kontaktMobil: e.target.value }))} />
                      </div>
                      <div className="row g-2">
                        <div className="col-6"><label className="form-label fs-12 mb-1">IČO</label><input type="text" className="form-control form-control-sm czk-num" value={novaFa.ico} onChange={(e) => setNovaFa((f) => ({ ...f, ico: e.target.value }))} /></div>
                        <div className="col-6"><label className="form-label fs-12 mb-1">DIČ</label><input type="text" className="form-control form-control-sm czk-num" value={novaFa.dic} onChange={(e) => setNovaFa((f) => ({ ...f, dic: e.target.value }))} /></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Platební údaje */}
                <div className="col-lg-4">
                  <h6 className="fw-bold mb-3">Platební údaje</h6>
                  <label className="form-label fs-13 fw-semibold">Způsob úhrady</label>
                  <select className="form-select form-select-sm" value={novaFa.zpusobUhrady} onChange={(e) => setNovaFa((f) => ({ ...f, zpusobUhrady: e.target.value as typeof f.zpusobUhrady }))}>
                    <option value="">Vyberte možnost</option>
                    <option value="prevod">Převodem</option>
                    <option value="hotovost">Hotově</option>
                    <option value="karta">Kartou</option>
                  </select>
                  <label className="form-label fs-13 fw-semibold mt-2">Variabilní symbol</label>
                  <input type="text" className="form-control form-control-sm czk-num" value={novaFa.vs} onChange={(e) => setNovaFa((f) => ({ ...f, vs: e.target.value }))} />
                  <div className="text-muted fs-12 mt-3" style={{ lineHeight: 1.7 }}>
                    Název banky: —<br />Číslo účtu: / <br />IBAN: —<br />SWIFT: —
                  </div>
                  <div className="form-check form-switch mt-2">
                    <input className="form-check-input" type="checkbox" id="nf-auto-uhradit" checked={novaFa.autoUhradit} onChange={(e) => setNovaFa((f) => ({ ...f, autoUhradit: e.target.checked }))} />
                    <label className="form-check-label fs-13" htmlFor="nf-auto-uhradit">Automaticky uhradit doklad</label>
                  </div>
                </div>

                {/* Datumy a informace */}
                <div className="col-lg-4">
                  <h6 className="fw-bold mb-3">Datumy a informace</h6>
                  <label className="form-label fs-13 fw-semibold">Číslo dokladu</label>
                  <input type="text" className="form-control form-control-sm czk-num" placeholder="FAK-2026-…" value={novaFa.cislo} onChange={(e) => setNovaFa((f) => ({ ...f, cislo: e.target.value }))} />
                  <label className="form-label fs-13 fw-semibold mt-2">Datum vystavení</label>
                  <input type="date" className="form-control form-control-sm" value={novaFa.datum} onChange={(e) => setNovaFa((f) => ({ ...f, datum: e.target.value }))} />
                  <label className="form-label fs-13 fw-semibold mt-2">Datum splatnosti <span className="text-danger">*</span></label>
                  <input type="date" className="form-control form-control-sm" value={novaFa.splatnost} onChange={(e) => setNovaFa((f) => ({ ...f, splatnost: e.target.value }))} />
                  <label className="form-label fs-13 fw-semibold mt-2">DUZP</label>
                  <input type="date" className="form-control form-control-sm" value={novaFa.duzp} onChange={(e) => setNovaFa((f) => ({ ...f, duzp: e.target.value }))} />
                </div>
              </div>

              {/* Zobrazit více detailů */}
              <div className="text-center mt-3">
                <button type="button" className="btn btn-light btn-sm px-4" onClick={() => setNovaFaViceDetailu((v) => !v)}>
                  {novaFaViceDetailu ? 'Zobrazit méně detailů' : 'Zobrazit více detailů'}
                </button>
              </div>

              {novaFaViceDetailu && (
                <div className="row g-4 mt-1 pt-3 border-top">
                  <div className="col-lg-4">
                    <h6 className="fw-bold mb-2">Provozovna</h6>
                    <label className="form-label fs-13 fw-semibold">Provozovna</label>
                    <select className="form-select form-select-sm" value={novaFa.provozovna} onChange={(e) => setNovaFa((f) => ({ ...f, provozovna: e.target.value }))}>
                      {PROVOZOVNY.filter((p) => p.status === 'active').map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                    <div className="text-muted fs-12 mt-2" style={{ lineHeight: 1.7 }}>Plátce DPH: ANO<br />Sídlo: Údolní 532/76, 602 00 Brno</div>
                  </div>
                  <div className="col-lg-4">
                    <label className="form-label fs-13 fw-semibold">Osoba</label>
                    <input type="text" className="form-control form-control-sm" value={novaFa.osoba} onChange={(e) => setNovaFa((f) => ({ ...f, osoba: e.target.value }))} />
                    <label className="form-label fs-13 fw-semibold mt-2">Kontaktní e-mail</label>
                    <input type="email" className="form-control form-control-sm" value={novaFa.kontaktEmail} onChange={(e) => setNovaFa((f) => ({ ...f, kontaktEmail: e.target.value }))} />
                    <label className="form-label fs-13 fw-semibold mt-2">Kontaktní mobil</label>
                    <input type="text" className="form-control form-control-sm" value={novaFa.kontaktMobil} onChange={(e) => setNovaFa((f) => ({ ...f, kontaktMobil: e.target.value }))} />
                  </div>
                  <div className="col-lg-4">
                    <label className="form-label fs-13 fw-semibold">Zaokrouhlování</label>
                    <select className="form-select form-select-sm" value={novaFa.zaokrouhleni} onChange={(e) => setNovaFa((f) => ({ ...f, zaokrouhleni: e.target.value as typeof f.zaokrouhleni }))}>
                      <option value="desetinne">Desetinná čísla</option>
                      <option value="nahoru">Nahoru na celé</option>
                      <option value="zadne">Bez zaokrouhlení</option>
                    </select>
                    <label className="form-label fs-13 fw-semibold mt-2">Měna</label>
                    <select className="form-select form-select-sm" value={novaFa.mena} onChange={(e) => setNovaFa((f) => ({ ...f, mena: e.target.value }))}>
                      <option value="CZK">Kč</option>
                      <option value="EUR">€</option>
                    </select>
                    <label className="form-label fs-13 fw-semibold mt-2">Konstantní symbol</label>
                    <input type="text" className="form-control form-control-sm czk-num" value={novaFa.ksymbol} onChange={(e) => setNovaFa((f) => ({ ...f, ksymbol: e.target.value }))} />
                    <label className="form-label fs-13 fw-semibold mt-2">Specifický symbol</label>
                    <input type="text" className="form-control form-control-sm czk-num" value={novaFa.ssymbol} onChange={(e) => setNovaFa((f) => ({ ...f, ssymbol: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Položky */}
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Položky</h6>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0" style={{ fontSize: 12 }}>
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 70 }}>Kód</th>
                      <th>Název</th>
                      <th className="text-end" style={{ width: 80 }}>Množství</th>
                      <th className="text-end" style={{ width: 120 }}>Cena</th>
                      <th style={{ width: 90 }}>Typ ceny</th>
                      <th className="text-end" style={{ width: 90 }}>DPH</th>
                      <th className="text-end">Výška DPH</th>
                      <th className="text-end">Cena celkem</th>
                      <th style={{ width: 70 }}>Funkce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vystPolozky.map((p) => {
                      const zaklad = p.pocet * p.cenaJedn;
                      const dph = zaklad * p.dphSazba / 100;
                      return (
                        <tr key={p.id}>
                          <td><input type="text" className="form-control form-control-sm" style={{ fontSize: 12 }} /></td>
                          <td><input type="text" className="form-control form-control-sm" style={{ fontSize: 12 }} placeholder="Název položky" value={p.nazev} onChange={(e) => updatePolozka(p.id, { nazev: e.target.value })} /></td>
                          <td><input type="number" className="form-control form-control-sm text-end" style={{ fontSize: 12 }} value={p.pocet} onChange={(e) => updatePolozka(p.id, { pocet: parseFloat(e.target.value || '0') })} /></td>
                          <td><div className="input-group input-group-sm"><input type="number" className="form-control text-end" style={{ fontSize: 12 }} value={p.cenaJedn} onChange={(e) => updatePolozka(p.id, { cenaJedn: parseFloat(e.target.value || '0') })} /><span className="input-group-text" style={{ fontSize: 11 }}>Kč</span></div></td>
                          <td><select className="form-select form-select-sm" style={{ fontSize: 12 }}><option>s DPH</option><option>bez DPH</option></select></td>
                          <td><div className="input-group input-group-sm"><input type="number" className="form-control text-end" style={{ fontSize: 12 }} value={p.dphSazba} onChange={(e) => updatePolozka(p.id, { dphSazba: parseFloat(e.target.value || '0') })} /><span className="input-group-text" style={{ fontSize: 11 }}>%</span></div></td>
                          <td className="text-end czk-num">{fCzk(Math.round(dph))}</td>
                          <td className="text-end czk-num fw-semibold">{fCzk(Math.round(zaklad + dph))}</td>
                          <td className="text-nowrap">
                            <button className="btn btn-sm btn-outline-warning py-0 px-1" onClick={addPolozka} title="Přidat řádek"><iconify-icon icon="solar:add-circle-bold-duotone" /></button>
                            <button className="btn btn-sm btn-outline-danger py-0 px-1 ms-1" onClick={() => removePolozka(p.id)} title="Odebrat řádek"><iconify-icon icon="solar:minus-circle-bold-duotone" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Rekapitulace DPH */}
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Rekapitulace DPH</h6>
              <div className="row g-4">
                <div className="col-lg-6">
                  <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                    <thead className="table-light"><tr><th>Sazba</th><th className="text-end">bez DPH</th><th className="text-end">DPH</th><th className="text-end">včetně DPH</th></tr></thead>
                    <tbody>
                      {dphBreakdown.map((b) => (
                        <tr key={b.sazba}><td>{b.sazba} %</td><td className="text-end czk-num">{fCzk(Math.round(b.zaklad))}</td><td className="text-end czk-num">{fCzk(Math.round(b.dph))}</td><td className="text-end czk-num">{fCzk(Math.round(b.vcetne))}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="col-lg-6">
                  <div className="d-flex justify-content-between border-bottom py-2"><span className="text-muted">Celkem bez DPH:</span><span className="czk-num">{fCzk(Math.round(celkemBezDph))}</span></div>
                  <div className="d-flex justify-content-between border-bottom py-2"><span className="text-muted">DPH:</span><span className="czk-num">{fCzk(Math.round(celkemDph))}</span></div>
                  <div className="d-flex justify-content-between border-bottom py-2"><span className="text-muted">Zaokrouhlení:</span><span className="czk-num">0 Kč</span></div>
                  <div className="d-flex justify-content-between py-2"><span className="fw-bold" style={{ fontSize: 15 }}>Celkem k úhradě:</span><span className="fw-bold czk-num" style={{ fontSize: 15 }}>{fCzk(Math.round(celkemVcetne))}</span></div>
                  <div className="row g-2 mt-2 align-items-end">
                    <div className="col-8"><label className="form-label fs-12 mb-1">Korektura celkové částky</label><input type="number" className="form-control form-control-sm" placeholder="0" /></div>
                    <div className="col-4"><label className="form-label fs-12 mb-1">Měna</label><input className="form-control form-control-sm bg-light text-muted" value={novaFa.mena} readOnly /></div>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className="form-label fs-13 fw-semibold">Spodní text na faktuře</label>
                <input type="text" className="form-control form-control-sm" placeholder="Volitelný text zobrazený na faktuře…" value={novaFa.spodniText} onChange={(e) => setNovaFa((f) => ({ ...f, spodniText: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Nahrání dokumentů + QR + Interní poznámka */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="row g-4">
                <div className="col-lg-6">
                  <h6 className="fw-bold mb-3">Nahrání dokumentů</h6>
                  {novaFaDocument ? (
                    <div className="border rounded d-flex align-items-center justify-content-between p-2 px-3" style={{ background: '#e8f5e9', borderColor: '#198754' }}>
                      <div className="d-flex align-items-center gap-2">
                        <iconify-icon icon="solar:document-text-bold-duotone" style={{ fontSize: 22, color: '#198754' }} />
                        <div><div className="fw-semibold fs-13">{novaFaDocument}</div><div className="text-muted fs-11">Dokument připraven k uložení</div></div>
                      </div>
                      <button className="btn btn-sm btn-link text-danger p-0" onClick={() => setNovaFaDocument(null)} title="Odebrat"><iconify-icon icon="solar:trash-bin-trash-bold-duotone" style={{ fontSize: 18 }} /></button>
                    </div>
                  ) : (
                    <div className="border border-2 border-dashed rounded p-4 text-center" style={{ borderColor: '#dee2e6', cursor: 'pointer' }} onClick={() => setNovaFaDocument(`doklad-${novaFa.cislo || 'mock'}.pdf`)}>
                      <iconify-icon icon="solar:cloud-upload-bold-duotone" style={{ fontSize: 40, color: '#c4c9d0' }} />
                      <div className="fw-semibold mt-2">Klepnutím nahrajte soubor</div>
                      <div className="text-muted fs-12 mt-1">Je možné nahrát jen <strong>jeden</strong> soubor.</div>
                    </div>
                  )}
                  <div className="text-muted fs-12 mt-3">Nebo použijte mobilní telefon a vyfoťte doklad přes něj.</div>
                  <div className="d-inline-flex mt-2 p-2 border rounded bg-white">
                    <iconify-icon icon="solar:qr-code-bold-duotone" style={{ fontSize: 96, color: '#212529' }} />
                  </div>
                </div>
                <div className="col-lg-6">
                  <label className="form-label fs-13 fw-semibold">Interní poznámka</label>
                  <textarea className="form-control form-control-sm" rows={3} placeholder="Interní poznámka (nezobrazí se na faktuře)…" value={novaFa.poznamka} onChange={(e) => setNovaFa((f) => ({ ...f, poznamka: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          {/* Automatické schválení faktury */}
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Automatické schválení faktury</h6>
              <label className="form-label fs-13 fw-semibold">Účet na platbu</label>
              <select className="form-select form-select-sm" value={novaFa.ucetPlatby} onChange={(e) => setNovaFa((f) => ({ ...f, ucetPlatby: e.target.value }))}>
                <option value="">— Vyberte účet —</option>
                {BANKOVNI_UCTY.map((u) => (<option key={u.iban} value={u.iban}>{u.nazev} ({u.iban}) — {u.mena ?? 'CZK'}</option>))}
              </select>
              <div className="row g-2 mt-2">
                <div className="col-md-6"><label className="form-label fs-13 fw-semibold">Suma</label><input type="number" className="form-control form-control-sm" placeholder="0" /></div>
                <div className="col-md-6"><label className="form-label fs-13 fw-semibold">Měna</label><input className="form-control form-control-sm bg-light text-muted" value="CZK" readOnly /></div>
              </div>
            </div>
          </div>

          {/* Schvalovatelé faktury — jen u přijaté faktury; kdokoli z vybraných může fakturu
              schválit → poté jde k úhradě. Lze přiřadit více osob. */}
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-1">Schvalovatelé faktury</h6>
              <p className="text-muted fs-13 mb-3">
                Vyberte osoby, které mohou fakturu schválit k úhradě. Stačí schválení kohokoli z nich.
              </p>
              <div className="d-flex flex-wrap gap-2">
                {SCHVALOVACI_OSOBY.filter((o) => o.role !== 'fakturant').map((o) => {
                  const vybrany = novaFaSchvalovatele.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={`btn btn-sm d-inline-flex align-items-center gap-2 ${vybrany ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setNovaFaSchvalovatele((prev) =>
                        prev.includes(o.id) ? prev.filter((x) => x !== o.id) : [...prev, o.id]
                      )}
                    >
                      <span
                        className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold"
                        style={{ width: 22, height: 22, fontSize: 10, background: vybrany ? 'rgba(255,255,255,0.25)' : 'var(--prov-color, #c9911a)', color: '#fff', flexShrink: 0 }}
                      >
                        {o.avatar}
                      </span>
                      <span className="d-flex flex-column align-items-start lh-1">
                        <span className="fw-semibold">{o.jmeno}</span>
                        <span className={`fs-11 ${vybrany ? 'text-white-50' : 'text-muted'}`}>
                          {o.role === 'majitel' ? 'Majitel' : 'Schvalovatel'}
                          {o.provozovna ? ` · ${PROVOZOVNY.find((p) => p.id === o.provozovna)?.shortName ?? o.provozovna}` : ''}
                        </span>
                      </span>
                      {vybrany && <iconify-icon icon="solar:check-circle-bold" style={{ fontSize: 14 }} />}
                    </button>
                  );
                })}
              </div>
              {novaFaSchvalovatele.length > 0 && (
                <div className="mt-3 text-success fs-13 fw-semibold">
                  <iconify-icon icon="solar:users-group-rounded-bold-duotone" className="me-1" />
                  Přiřazeno {novaFaSchvalovatele.length}{' '}
                  {novaFaSchvalovatele.length === 1 ? 'schvalovatel' : novaFaSchvalovatele.length < 5 ? 'schvalovatelé' : 'schvalovatelů'}
                </div>
              )}
            </div>
          </div>

          {/* 3 CTA */}
          <div className="d-flex gap-2 flex-wrap mb-4">
            <button className="btn btn-light flex-grow-1 fw-semibold" style={{ color: '#c9911a', minWidth: 200 }} onClick={handleSaveFaktura}>
              Přidat dokument a přejít na seznam
            </button>
            <button className="btn btn-warning text-white flex-grow-1 fw-semibold" style={{ minWidth: 200 }} onClick={handleSaveFaktura}>
              Přidat dokument a pokračovat
            </button>
            <button className="btn text-white flex-grow-1 fw-semibold" style={{ background: '#6f42c1', minWidth: 200 }} onClick={handleSaveFaktura}>
              Přidat dokument a schválit
            </button>
          </div>
        </>
        );
      })()}


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

          {/* Hlavička dokladu (u vydané se ISDOC nenačítá — vystavujeme vlastní doklad) */}
          <div className="card mb-3">
            <div className="card-body py-3">
              <h5 className="mb-0">Vytváření dokladu — {isProformaVystavit ? 'Zálohová faktura' : 'Faktura'}</h5>
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

              {/* Rekapitulace DPH (sjednoceno s přijatou fakturou) */}
              <div className="card mb-3">
                <div className="card-body">
                  <h6 className="fw-bold mb-3">Rekapitulace DPH</h6>
                  <div className="row g-4">
                    <div className="col-lg-6">
                      <table className="table table-sm mb-0" style={{ fontSize: 12 }}>
                        <thead className="table-light"><tr><th>Sazba</th><th className="text-end">bez DPH</th><th className="text-end">DPH</th><th className="text-end">včetně DPH</th></tr></thead>
                        <tbody>
                          {[0, 12, 21].map((sazba) => {
                            const pol = vystPolozky.filter((x) => x.dphSazba === sazba);
                            const zaklad = pol.reduce((s, x) => s + x.pocet * x.cenaJedn, 0);
                            const d = zaklad * sazba / 100;
                            return (
                              <tr key={sazba}><td>{sazba} %</td><td className="text-end czk-num">{fCzk(zaklad)}</td><td className="text-end czk-num">{fCzk(d)}</td><td className="text-end czk-num">{fCzk(zaklad + d)}</td></tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="col-lg-6">
                      <div className="d-flex justify-content-between border-bottom py-2"><span className="text-muted">Celkem bez DPH:</span><span className="czk-num">{fCzk(celkemBezDph)}</span></div>
                      <div className="d-flex justify-content-between border-bottom py-2"><span className="text-muted">DPH:</span><span className="czk-num">{fCzk(celkemDph)}</span></div>
                      <div className="d-flex justify-content-between border-bottom py-2"><span className="text-muted">Zaokrouhlení:</span><span className="czk-num">0 Kč</span></div>
                      <div className="d-flex justify-content-between py-2"><span className="fw-bold" style={{ fontSize: 15 }}>Celkem k úhradě:</span><span className="fw-bold czk-num" style={{ fontSize: 15 }}>{fCzk(celkemSDph)}</span></div>
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

      {/* Podstránka: Nový daňový doklad (zápis 14. 7. 2026) — formulář ve stylu Nová přijatá faktura */}
      {showNovaDane && (
        <>
          <div className="page-title-box">
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-light btn-sm d-flex align-items-center gap-1" onClick={() => setShowNovaDane(false)} title="Zpět na seznam">
                <iconify-icon icon="solar:arrow-left-linear" />
                <iconify-icon icon="solar:alt-arrow-left-linear" />
                Zpět na seznam
              </button>
              <h4 className="page-title mb-0">Nový daňový doklad</h4>
            </div>
          </div>

          {/* Hlavička dokladu */}
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <iconify-icon icon="solar:bill-check-bold-duotone" style={{ color: '#0dcaf0', fontSize: 20 }} />
                Vytváření dokladu — Daň
              </h6>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label fs-13 fw-semibold">Druh daně</label>
                  <select className="form-select form-select-sm" value={novaDane.typ}
                    onChange={(e) => setNovaDane((d) => ({ ...d, typ: e.target.value as DanTyp }))}>
                    {(Object.keys(DAN_TYP_META) as DanTyp[]).map((t) => (
                      <option key={t} value={t}>{DAN_TYP_META[t].label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-13 fw-semibold">Zdaňovací období</label>
                  <input className="form-control form-control-sm" placeholder="2026-Q2 / 2026 / 2026-05"
                    value={novaDane.obdobi} onChange={(e) => setNovaDane((d) => ({ ...d, obdobi: e.target.value }))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-13 fw-semibold">Právní entita</label>
                  <select className="form-select form-select-sm" value={novaDane.pravniEntita}
                    onChange={(e) => setNovaDane((d) => ({ ...d, pravniEntita: e.target.value as PravniEntitaDan }))}>
                    {(Object.keys(PRAVNI_ENTITA_DAN_LABEL) as PravniEntitaDan[]).map((e) => (
                      <option key={e} value={e}>{PRAVNI_ENTITA_DAN_LABEL[e]}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-13 fw-semibold">Nákladové středisko</label>
                  <select className="form-select form-select-sm" value={novaDane.provozovna}
                    onChange={(e) => setNovaDane((d) => ({ ...d, provozovna: e.target.value }))}>
                    <option value="">Celá firma / Office</option>
                    {PROVOZOVNY.filter((p) => p.id !== 'all').map((p) => (
                      <option key={p.id} value={p.id}>{p.shortName}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-13 fw-semibold">Částka (Kč)</label>
                  <input type="number" className="form-control form-control-sm" placeholder="0"
                    value={novaDane.castka} onChange={(e) => setNovaDane((d) => ({ ...d, castka: e.target.value }))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-13 fw-semibold">Variabilní symbol</label>
                  <input className="form-control form-control-sm" value={novaDane.vs}
                    onChange={(e) => setNovaDane((d) => ({ ...d, vs: e.target.value }))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-13 fw-semibold">DUZP</label>
                  <input type="date" className="form-control form-control-sm" value={novaDane.duzp}
                    onChange={(e) => setNovaDane((d) => ({ ...d, duzp: e.target.value }))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-13 fw-semibold">Splatnost</label>
                  <input type="date" className="form-control form-control-sm" value={novaDane.splatnost}
                    onChange={(e) => setNovaDane((d) => ({ ...d, splatnost: e.target.value }))} />
                </div>
                <div className="col-md-4">
                  <label className="form-label fs-13 fw-semibold">Popis</label>
                  <input className="form-control form-control-sm" placeholder="např. DPH 2. kvartál 2026"
                    value={novaDane.popis} onChange={(e) => setNovaDane((d) => ({ ...d, popis: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          {/* Nahrání přiznání / dokumentu */}
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Přiznání / dokument</h6>
              {novaDaneDocument ? (
                <div className="d-flex align-items-center gap-2 border rounded px-3 py-2 bg-light">
                  <iconify-icon icon="solar:file-text-bold-duotone" style={{ fontSize: 22, color: '#dc3545' }} />
                  <span className="fw-semibold flex-grow-1">{novaDaneDocument}</span>
                  <button className="btn btn-sm btn-light" onClick={() => setNovaDaneDocument(null)}>
                    <iconify-icon icon="solar:trash-bin-trash-bold-duotone" />
                  </button>
                </div>
              ) : (
                <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                  onClick={() => setNovaDaneDocument('DPH-priznani-2026.pdf')}>
                  <iconify-icon icon="solar:upload-bold-duotone" />
                  Přidat dokument
                </button>
              )}
            </div>
          </div>

          {/* Automatické schválení */}
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3">Úhrada z banky</h6>
              <label className="form-label fs-13 fw-semibold">Účet na platbu</label>
              <select className="form-select form-select-sm" value={novaDane.ucetPlatby}
                onChange={(e) => setNovaDane((d) => ({ ...d, ucetPlatby: e.target.value }))}>
                <option value="">— Vyberte účet —</option>
                {BANKOVNI_UCTY.map((u) => (<option key={u.iban} value={u.iban}>{u.nazev} ({u.iban}) — {u.mena ?? 'CZK'}</option>))}
              </select>
            </div>
          </div>

          {/* Schvalovatelé — stejná logika jako u přijaté faktury */}
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="fw-bold mb-1">Schvalovatelé dokladu</h6>
              <p className="text-muted fs-13 mb-3">
                Vyberte osoby, které mohou daňový doklad schválit k úhradě. Stačí schválení kohokoli z nich.
              </p>
              <div className="d-flex flex-wrap gap-2">
                {SCHVALOVACI_OSOBY.filter((o) => o.role !== 'fakturant').map((o) => {
                  const vybrany = novaDaneSchvalovatele.includes(o.id);
                  return (
                    <button key={o.id} type="button"
                      className={`btn btn-sm d-inline-flex align-items-center gap-2 ${vybrany ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setNovaDaneSchvalovatele((prev) =>
                        prev.includes(o.id) ? prev.filter((x) => x !== o.id) : [...prev, o.id]
                      )}>
                      <span className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold"
                        style={{ width: 22, height: 22, fontSize: 10, background: vybrany ? 'rgba(255,255,255,0.25)' : 'var(--prov-color, #c9911a)', color: '#fff', flexShrink: 0 }}>
                        {o.avatar}
                      </span>
                      <span className="d-flex flex-column align-items-start lh-1">
                        <span className="fw-semibold">{o.jmeno}</span>
                        <span className={`fs-11 ${vybrany ? 'text-white-50' : 'text-muted'}`}>
                          {o.role === 'majitel' ? 'Majitel' : 'Schvalovatel'}
                        </span>
                      </span>
                      {vybrany && <iconify-icon icon="solar:check-circle-bold" style={{ fontSize: 14 }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="d-flex gap-2 flex-wrap mb-4">
            <button className="btn btn-light flex-grow-1 fw-semibold" style={{ color: '#c9911a', minWidth: 200 }}
              onClick={() => { setShowNovaDane(false); setDaneMode(true); }}>
              Přidat doklad a přejít na seznam
            </button>
            <button className="btn text-white flex-grow-1 fw-semibold" style={{ background: '#6f42c1', minWidth: 200 }}
              onClick={() => { setShowNovaDane(false); setDaneMode(true); }}>
              Přidat doklad a schválit
            </button>
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
