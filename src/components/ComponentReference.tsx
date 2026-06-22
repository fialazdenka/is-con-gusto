// COMPONENT: Component Reference View – vývojová dokumentace pro kodéra
// SOURCE: custom (dev-only helper view)
// CUSTOM: YES – vývojová pomůcka, v produkci se odstraní
//
// Phase 8.6 (zápis 22. 6. 2026) — refactor na NESTED SUBPAGES. Levý nav se sekcemi (Banka, Faktury, …)
// + pravý content area s komponentami pro zvolenou sekci. Banka sekce vyplněná kompletně,
// ostatní sekce budou postupně doplňovány jak budeme procházet jednotlivé části systému.

import { useState } from 'react';

type Status = 'hotovo' | 'rozpracovane' | 'ceka';

interface Component {
  name: string;
  file: string;
  pattern: string;
  larkon: string;
  subcomponents: string;
  implementation: string;
  custom: 'NO' | 'YES';
  customReason?: string;
  status?: Status;       // hotovo = zelená, rozpracovane = žlutá, ceka = šedá
  statusNote?: string;   // krátká poznámka kodéři ("finální podoba dořešena" apod.)
}

interface Section {
  id: string;
  label: string;
  icon: string;
  status: Status;
  intro?: string;
  components: Component[];
}

const SECTIONS: Section[] = [
  {
    id: 'banka',
    label: 'Banka',
    icon: 'solar:bank-bold-duotone',
    status: 'hotovo',
    intro:
      'Operační workspace pro majitele / finančního ředitele. Zobrazuje bankovní účty (konsolidované + per-provozovna), transakce, auto-sync stav, a side-panel s rozpadem (kandidáti na párování, audit, poznámky, návrh systému). Cíl: rychlé řešení nesparovaných plateb. Sekce má ~20 dílčích komponent.',
    components: [
      {
        name: 'BankaView',
        file: 'BankaView.tsx',
        pattern: 'Page Layout (compound view)',
        larkon: 'Card grid + Table + Side Panel',
        subcomponents: 'AutoSyncBar + SimpleMetrics + BalanceOverview + UcetCard[] + Tabulka transakcí + TransakceSidePanel + UcetDetailDrawer + Modals',
        implementation:
          'Root view, drží state napříč sekcí: `localUcty: Record<id, Partial<BankaUcet>>` (overlay nad mock daty), `localTrans: Record<id, Partial<BankaTransakce>>` (per-transakce patche + appendy auditu/poznámek). Helpery `pushTransAudit`, `pushTransNote`, `patchTrans` udržují immutable updates. `mergedAllTransakce` propaguje patche do Work Queue counts + tabulky + KPI.',
        custom: 'NO',
        status: 'hotovo',
      },
      {
        name: 'AutoSyncBar',
        file: 'BankaView.tsx (uvnitř)',
        pattern: 'Status Bar / Info Strip',
        larkon: 'Custom inline component',
        subcomponents: 'Status indikátor + interval + last/next sync + API limit',
        implementation:
          'Zjednodušený status-only řádek. Žluté pozadí, malé ikonky, fontSize 12. V produkci by data tahala z bankovní API přes background worker (interval 15 min). API limit ~300/den (banka konkrétně).',
        custom: 'YES',
        customReason: 'Custom layout — není v Larkonu standardní status bar v této podobě.',
        status: 'rozpracovane',
        statusNote:
          'Phase 8.6 (zápis 22. 6. 2026): odebráno CTA "Odeslat dávku" + celý druhý řádek (Živě / Znovu načíst / Simulovat chybu) + error UI s "Zapnout znovu". Finální podoba (dávkové platby, error stav, manuální akce) bude dořešena později. Neimplementovat zatím — zůstává jen status indikátor.',
      },
      {
        name: 'SimpleMetrics',
        file: 'BankaView.tsx (uvnitř)',
        pattern: 'KPI strip (compact)',
        larkon: 'StatisticsWidget (kompaktní)',
        subcomponents: '2 metriky: počet nespárovaných transakcí + počet ručně spárovaných',
        implementation: 'Inline řádek 2 karet (col-md-6). V produkci → `<StatisticsWidget>` od Larkonu s menším paddingem.',
        custom: 'NO',
        status: 'hotovo',
      },
      {
        name: 'BalanceOverview',
        file: 'BankaView.tsx (uvnitř)',
        pattern: 'Summary card + collapsible list',
        larkon: 'Card + Accordion',
        subcomponents: 'Celkový zůstatek CZK + EUR + trend % + rozbalitelný seznam účtů',
        implementation:
          'Klik na header → expand/collapse účtů (per měnu). V produkci → Bootstrap `<Accordion>` nebo Larkon collapsible card.',
        custom: 'NO',
        status: 'hotovo',
      },
      {
        name: 'UcetCard (Konsolidovaný / Provozní)',
        file: 'BankaView.tsx (uvnitř)',
        pattern: 'Compact Account Card',
        larkon: 'Card + Sparkline + Badge group',
        subcomponents: 'Brand border-top (--prov-color) + header (název, měna, stav) + IBAN + balance (účetní + dostupní prostředky) + sparkline 37 bodů + predikce týden/měsíc + provozovny badges',
        implementation:
          'Sparkline = SVG 37 bodů (30 minulých solid + dnes circle + 7 budoucích dashed), area fill opacity 0.08. Border-top barva: 1 provoz → její barva, multi → Con Gusto gold (#c9911a), žádná → šedá. Hover translateY(-2px).',
        custom: 'YES',
        customReason: 'Sparkline + brand color border-top + multi-venue badge logic — není standardní Larkon karta.',
        status: 'hotovo',
      },
      {
        name: 'Tabulka transakcí',
        file: 'BankaView.tsx (uvnitř)',
        pattern: 'Data Table',
        larkon: 'Table (table-hover, table-centered)',
        subcomponents: 'Sloupce: Datum / Typ (příchozí/odchozí badge) / Protistrana (firma + protiÚčet) / VS / Účet / Částka / Stav',
        implementation:
          'Klik na řádek → side panel + scroll-to-row-top (zarovnání horní hrany řádku s horní hranou sticky panelu). Klikatelný řádek (cursor:pointer).',
        custom: 'NO',
        status: 'hotovo',
      },
      {
        name: 'TransakceSidePanel',
        file: 'BankaView.tsx (uvnitř)',
        pattern: 'Sticky Side Panel (single-scroll)',
        larkon: 'Card s position:sticky',
        subcomponents:
          'Header (badges + částka + datum) → Akční zóna → Detail → Aktivita (feed audit + poznámky)',
        implementation:
          'Sticky `top: calc(var(--bs-topbar-height) + 16px)`, `maxHeight: calc(100vh - var(--bs-topbar-height) - 32px)`, `overflowY: auto`. Žádné tabs — vše v jednom plynulém scrollu (progressive disclosure).',
        custom: 'YES',
        customReason: 'Vlastní layout pattern (single-scroll s progressive disclosure místo tabs).',
        status: 'hotovo',
      },
      {
        name: 'Návrh systému (detectTransType)',
        file: 'bankaData.ts + BankaView.tsx',
        pattern: 'AI-style suggestion alert',
        larkon: 'Alert (info)',
        subcomponents: 'Modrý alert s ikonou + text + CTA "Přijmout návrh"',
        implementation:
          '`detectTransType(firma, poznamka)` v `bankaData.ts` rozpoznává poplatek / úrok / sankci / mzdu / splátku úvěru z textu transakce regex matchem. Vrací { typ, cilovaSekce: "poplatky" | "uvery" | "mzdy" }. V panelu modrý alert s tlačítkem "Přijmout návrh" → klasifikuje + audit zápis.',
        custom: 'NO',
        status: 'hotovo',
      },
      {
        name: 'Kandidáti na párování',
        file: 'BankaView.tsx (uvnitř panelu)',
        pattern: 'Suggestion list',
        larkon: 'List Group + Badge',
        subcomponents: 'Kandidát = match score % + důvody (chipy) + Potvrdit/× tlačítka',
        implementation:
          '≥80 % match dostane zelený 2px border + "DOPORUČENO" badge u prvního kandidáta. Klik Potvrdit → `onPatch` + audit + scroll panelu pryč po actionu.',
        custom: 'NO',
        status: 'hotovo',
      },
      {
        name: 'Označit jako… (sloučený workflow)',
        file: 'BankaView.tsx (uvnitř panelu)',
        pattern: 'Action group + inline forms',
        larkon: 'ButtonGroup + Collapse',
        subcomponents:
          'Tlačítka: Bankovní poplatek / Splátka úvěru / Vytvořit trvalý příkaz / Mimo systém / Bez faktury · každé otevírá inline form s důvody',
        implementation:
          'State `oznacitMode: null | "outside" | "no-invoice" | "loan-payment"`. Klik na tlačítko → expand inline form s důvody (`OUTSIDE_REASONS` 5 / `NO_INVOICE_REASONS` 7) + textarea poznámka pro "outside". Po Potvrdit → `patchTrans` + `pushTransAudit`.',
        custom: 'NO',
        status: 'hotovo',
      },
      {
        name: 'Cross-section nav (Otevřít fakturu / Vytvořit TP)',
        file: 'BankaView.tsx → AppState.pendingFakturaId / pendingTPFromTrans',
        pattern: 'Cross-section navigation',
        larkon: 'Custom React state pattern',
        subcomponents: '`AppState.pendingFakturaId` / `pendingTPFromTrans` — pole čekající na vyzvednutí v cílové sekci',
        implementation:
          'Klik na "Otevřít fakturu" v Bance → `update({ selectedSection: "faktury", pendingFakturaId: id })`. Cílová sekce (FakturyView / TrvalePrikazyView) má `useEffect` který pendingX pole přečte, otevře detail/form, a vyčistí.',
        custom: 'NO',
        status: 'hotovo',
      },
      {
        name: 'Aktivita (Audit + Poznámky feed)',
        file: 'BankaView.tsx (uvnitř panelu)',
        pattern: 'Chronological feed',
        larkon: 'Custom timeline',
        subcomponents: 'Audit = malá tečka + ikona + barva + text. Poznámka = žlutá bublina (borderLeft 3px) + chat ikona + text + meta',
        implementation:
          'Sloučený feed seřazený sestupně. `pushTransAudit(id, entry)` + `pushTransNote(id, note)` append-only helpery v BankaView.',
        custom: 'YES',
        customReason: 'Vlastní timeline UI (není v Larkonu).',
        status: 'hotovo',
      },
      {
        name: 'PrevodModal / PrirazeniModal / UcetDetailDrawer',
        file: 'BankaView.tsx (uvnitř)',
        pattern: 'Modal / Offcanvas Drawer',
        larkon: 'Modal / Offcanvas',
        subcomponents: 'Form fields, validace, save → toast',
        implementation:
          'PrevodModal: 2 selecty (z účtu / na účet) + částka + datum + poznámka + validace stejného účtu + dostatek prostředků. UcetDetailDrawer: velká sparkline + posledních 10 transakcí + akce.',
        custom: 'NO',
        status: 'hotovo',
      },
    ],
  },
  {
    id: 'faktury',
    label: 'Faktury',
    icon: 'solar:document-text-bold-duotone',
    status: 'ceka',
    intro: 'Workflow dashboard přijatých a vydaných faktur. 8 stavů přijatých + 3 stavy vydaných, schvalovací proces v side panelu, full-page Fakturoid-style editor pro vystavovanou fakturu/proformu, šablony položek (sdílený číselník), bulk akce, cross-section nav.',
    components: [],
  },
  {
    id: 'trvale-prikazy',
    label: 'Trvalé příkazy',
    icon: 'solar:refresh-circle-bold-duotone',
    status: 'hotovo',
    intro:
      'Sekce pro správu trvalých plateb (TP). 3 typy: standard (energie, nájmy) / leasing (auta, technika — fixní splátkový kalendář) / záloha (energie 2× ročně vyúčtování). KPI strip + tabulka + form modal pro new/edit + side panel s detailem a editovatelným splátkovým kalendářem. Cross-section nav z Banky (Vytvořit TP z nespárované transakce). UX schválené — připraveno k implementaci.',
    components: [
      {
        name: 'TrvalePrikazyView',
        file: 'TrvalePrikazyView.tsx',
        pattern: 'Page Layout (compound view)',
        larkon: 'Card grid + Table + Side Panel + Modal',
        subcomponents: 'KpiStrip + PrikazyTable + PrikazSidePanel + PrikazFormModal',
        implementation:
          'Root view, drží 4 lokální state: `localStavy` (override stav per ID), `localPrikazy` (přepisuje + nové), `formState` (null=zavřený / {mode, initial}). `mergedData` skládá mock + localPrikazy + localStavy → komponenty pracují s merged. `useEffect` reaguje na `state.pendingTPFromTrans` (cross-section nav z Banky) — auto-otevře form modal s předvyplněnými údaji z transakce a vyčistí pole.',
        custom: 'NO',
        status: 'hotovo',
      },
      {
        name: 'KpiStrip',
        file: 'TrvalePrikazyView.tsx (uvnitř)',
        pattern: 'KPI Strip (4× karta)',
        larkon: 'StatisticsWidget × 4',
        subcomponents: 'Aktivní (count) · Měsíční zátěž (Kč) · Nezaplacené splátky (count, klikatelný) · Pozastavené (count)',
        implementation:
          'Pole `<StatisticsWidget>` v `row g-3` (col-md-3). Klik na „Nezaplacené splátky" → callback `onClickNezaplacene` toggluje filter chip „Jen nezaplacené" v PrikazyTable. Měsíční zátěž = `getMesicniZatez()` helper z dat.',
        custom: 'NO',
        status: 'hotovo',
      },
      {
        name: 'PrikazyTable',
        file: 'TrvalePrikazyView.tsx (uvnitř)',
        pattern: 'Data Table + Filter chips',
        larkon: 'Table + Form controls',
        subcomponents:
          'Header: hledání + Stav select + Typ select + chip „Jen nezaplacené" + CTA „Nový příkaz" · Sloupce: Název / Typ badge / Protistrana / Perioda / Příští splatnost / Částka / Stav badge / Akce',
        implementation:
          'Filtry řešeny `useMemo(filtered)` přes 4 podmínky (search OR název/protistrana/VS, stavFilter, typFilter, nezaplaceneOnly). Klik na řádek → `onSelect(id)` otevírá side panel. „Nový příkaz" → otevírá `PrikazFormModal` s `mode: "new"`.',
        custom: 'NO',
        status: 'hotovo',
      },
      {
        name: 'PrikazSidePanel',
        file: 'TrvalePrikazyView.tsx (uvnitř)',
        pattern: 'Sticky Side Panel',
        larkon: 'Card s position:sticky',
        subcomponents:
          'Header (název + typ badge + stav + Editovat + Close) · Základní info (protistrana, perioda, částka, příští splatnost) · Akce (Pozastavit / Aktivovat / Ukončit) · **Splátkový kalendář** (inline editovatelný per řádek) · Dokumenty (upload smluv)',
        implementation:
          'Sticky `top: calc(var(--bs-topbar-height) + 16px)`. Splátkový kalendář per leasing = tabulka řádků s `<input>` pro datum / VS / částka + override odchozího účtu (`<select>`). Per-řádek edit → `onUpdateSplatka(prikazId, splatkaIdx, patch)`. Helper `generateLeasingSplatky()` v `trvalePrikazyData.ts` vyrobí kalendář z `(start, count, baseAmount, vsTemplate)` — VS každé splátky = `vsTemplate + index.padStart(3, "0")`.',
        custom: 'YES',
        customReason: 'Splátkový kalendář per řádek edit + override účtu — vlastní inline form pattern.',
        status: 'hotovo',
      },
      {
        name: 'PrikazFormModal',
        file: 'TrvalePrikazyView.tsx (uvnitř)',
        pattern: 'Modal Form',
        larkon: 'Modal + Form controls',
        subcomponents:
          'Typ (radio: standard/leasing/záloha) · Název · Protistrana · Číslo účtu protistrany · Perioda · Částka · VS · Datum začátku · Datum konce · Odchozí účet · NakladKomu (kancelar/provoz/sdileny) + provozovnaId · **Pro leasing: počet splátek + vsTemplate → auto-preview splátkového kalendáře** · Upload smluv',
        implementation:
          'Validace povinných polí. Pro leasing: změna `pocetSplatek` nebo `vsTemplate` triggeruje `generateLeasingSplatky()` a zobrazí preview tabulky se všemi splátkami. Submit → `onSave(prikaz)` → `TrvalePrikazyView` přidá do `localPrikazy`. **Cross-section payload** z Banky předvyplňuje formulář (firma → protistrana, částka, protiÚčet, VS) — viz `TrvalePrikazyView.useEffect(state.pendingTPFromTrans)`.',
        custom: 'NO',
        status: 'hotovo',
      },
      {
        name: 'Splátkový kalendář (leasing)',
        file: 'TrvalePrikazyView.tsx + trvalePrikazyData.ts',
        pattern: 'Inline editable table',
        larkon: 'Table + Form controls',
        subcomponents: 'Sloupce: Pořadí (#) · Datum splatnosti · VS · Částka · Stav (zaplacena/cekajici/zpozdeni) · Override účtu · Edit',
        implementation:
          '`generateLeasingSplatky(start, count, baseAmount, vsTemplate)` v `trvalePrikazyData.ts` vrátí `TrvalySplatkaItem[]`. Stav splátky se odvozuje od dnešního data (referenční `today = 2026-06-09`): `ds < today` → zaplacena, jinak cekajici (pokud past + nezaplaceno → zpozdeni). Helper `maNezaplacenouSplatku(p)` v dat.ts kontroluje, jestli má příkaz alespoň jednu nesplacenou.',
        custom: 'NO',
        status: 'hotovo',
      },
      {
        name: 'Upload dokumentů (smlouvy / dodatky)',
        file: 'TrvalePrikazyView.tsx (uvnitř panelu)',
        pattern: 'File upload + List',
        larkon: 'Card + List Group + File input',
        subcomponents: 'Drop area + seznam přiložených dokumentů s ikonou typu + datum + akce (stáhnout / odebrat)',
        implementation:
          'Mock — typ dokumentu se auto-detekuje z názvu souboru (smlouva.pdf → typ "smlouva", dodatek_1.pdf → typ "dodatek"). V produkci → multipart upload do storage + `TrvalyDokument` záznam v DB.',
        custom: 'YES',
        customReason: 'File upload UI (drag & drop) není v Larkonu standard.',
        status: 'hotovo',
      },
      {
        name: 'Cross-section nav (Vytvořit TP z transakce)',
        file: 'TrvalePrikazyView.tsx + AppState.pendingTPFromTrans',
        pattern: 'Cross-section navigation',
        larkon: 'Custom React state pattern',
        subcomponents: '`AppState.pendingTPFromTrans: { firma, castka, protiUcet?, vs? }`',
        implementation:
          'Banka side-panel má tlačítko „Vytvořit trvalý příkaz" → `update({ selectedSection: "trvale-prikazy", pendingTPFromTrans: payload })`. TrvalePrikazyView `useEffect([state.pendingTPFromTrans])` přečte payload, vytvoří initial `TrvalyPrikaz` s předvyplněnými údaji, otevře form modal v `new` módu, ukáže toast a vyčistí pendingTPFromTrans.',
        custom: 'NO',
        status: 'hotovo',
      },
    ],
  },
  {
    id: 'uvery',
    label: 'Úvěry',
    icon: 'solar:hand-money-bold-duotone',
    status: 'ceka',
    intro: '4 typy úvěrů (hypotéka / investiční / provozní / leasing-finanční), rozpad jistina/úrok per splátka, inline edit + mimořádná splátka + předčasné splacení, anuita preview.',
    components: [],
  },
  {
    id: 'poplatky',
    label: 'Poplatky',
    icon: 'solar:tag-price-bold-duotone',
    status: 'ceka',
    intro: '9 typů poplatků, klikatelný barbar breakdown, měsíční souhrny, provozovna filter.',
    components: [],
  },
  {
    id: 'karty-platformy',
    label: 'Karty / Qerko / GoPay / Sodexo',
    icon: 'solar:card-bold-duotone',
    status: 'ceka',
    intro: 'Generická view pro 4 platební platformy. POS × Banka × Výpis 3-way reconciliation, měsíční výpisy, manuální import (Sodexo), problémové dny editor.',
    components: [],
  },
  {
    id: 'dane',
    label: 'Daně',
    icon: 'solar:scale-bold-duotone',
    status: 'ceka',
    intro: '6 typů daní (DPH/DPPO/DPFO/Nemovitost/Silniční/Srážková) per právní entita, KPI, klikatelný breakdown.',
    components: [],
  },
  {
    id: 'trzby',
    label: 'Tržby',
    icon: 'solar:graph-up-bold-duotone',
    status: 'ceka',
    intro: 'KPI boxíky (Dnes / Včera / Týden / Měsíc) + Tržby detail + Vývoj tržeb (3 módy + Všechny provozy) + Historický přehled. Kuchyň/Bar split + zdaněné/nezdaněné (Catering).',
    components: [],
  },
  {
    id: 'platby',
    label: 'Platby',
    icon: 'solar:wallet-money-bold-duotone',
    status: 'ceka',
    intro: 'Operační dashboard plateb — výběr faktur k odeslání, balance panel s budoucími tržbami, auto-výběr schválených faktur.',
    components: [],
  },
  {
    id: 'pohledavky',
    label: 'Pohledávky',
    icon: 'solar:hand-money-bold-duotone',
    status: 'ceka',
    intro: 'Vydané faktury, sledování úhrad, upomínky, aging.',
    components: [],
  },
  {
    id: 'cashflow',
    label: 'Cashflow',
    icon: 'solar:chart-bold-duotone',
    status: 'ceka',
    intro: 'Týdenní cashflow, KPI, kategorie, transakce, prognóza.',
    components: [],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'solar:widget-bold-duotone',
    status: 'ceka',
    intro: 'Hlavní obrazovka — Tržby KPI + Platby KPI + grafy + přehledy.',
    components: [],
  },
  {
    id: 'nastaveni',
    label: 'Nastavení',
    icon: 'solar:settings-bold-duotone',
    status: 'ceka',
    intro: 'Číselník položek (sdílený katalog pro fakturaci), Uživatelé & role, Schvalovací proces.',
    components: [],
  },
  {
    id: 'shell',
    label: 'AppShell / Sidebar / Topbar',
    icon: 'solar:sidebar-minimalistic-bold-duotone',
    status: 'ceka',
    intro: 'Layout shell, sidebar (5 skupin), topbar (breadcrumb + provozovna filter + period pills).',
    components: [],
  },
];

// ─────────────────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }: { status: Status; size?: 'sm' | 'md' }) {
  // Phase 8.6 (zápis 22. 6. 2026) — Status 'hotovo' znamená "připraveno k implementaci"
  // = je to nasazené na live, kodér to může implementovat. "Rozpracované" = ještě se UX dolaďuje.
  const cfg = {
    hotovo:        { label: 'Připraveno k implementaci', cls: 'bg-success-subtle text-success',    icon: 'solar:check-circle-bold-duotone' },
    rozpracovane:  { label: 'Rozpracované',              cls: 'bg-warning-subtle text-warning',    icon: 'solar:hammer-bold-duotone' },
    ceka:          { label: 'Čeká',                      cls: 'bg-secondary-subtle text-secondary', icon: 'solar:clock-circle-bold-duotone' },
  }[status];
  return (
    <span className={`badge ${cfg.cls} d-inline-flex align-items-center gap-1`} style={{ fontSize: size === 'sm' ? 11 : 12 }}>
      <iconify-icon icon={cfg.icon} style={{ fontSize: size === 'sm' ? 12 : 14 }} />
      {cfg.label}
    </span>
  );
}

function ComponentCard({ c }: { c: Component }) {
  return (
    <div className="card mb-3" style={{ borderLeft: c.status === 'rozpracovane' ? '4px solid #fd7e14' : c.status === 'hotovo' ? '4px solid #198754' : '4px solid #adb5bd' }}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
          <div>
            <h6 className="mb-1 fw-bold">{c.name}</h6>
            <code className="fs-12 text-muted">{c.file}</code>
          </div>
          <div className="d-flex gap-2 align-items-center">
            {c.status && <StatusBadge status={c.status} />}
            {c.custom === 'YES'
              ? <span className="badge bg-warning-subtle text-warning fs-11">CUSTOM</span>
              : <span className="badge bg-info-subtle text-info fs-11">STANDARD</span>}
          </div>
        </div>
        {c.status === 'rozpracovane' && c.statusNote && (
          <div className="alert alert-warning py-2 mb-2 fs-12">
            <iconify-icon icon="solar:hammer-bold-duotone" className="me-1" />
            <strong>Rozpracované:</strong> {c.statusNote}
          </div>
        )}
        <div className="row g-2 fs-12">
          <div className="col-md-4">
            <div className="text-muted fs-11 text-uppercase mb-1">Pattern</div>
            <div>{c.pattern}</div>
          </div>
          <div className="col-md-4">
            <div className="text-muted fs-11 text-uppercase mb-1">Larkon</div>
            <div>{c.larkon}</div>
          </div>
          <div className="col-md-4">
            <div className="text-muted fs-11 text-uppercase mb-1">Subkomponenty</div>
            <div>{c.subcomponents}</div>
          </div>
          <div className="col-12 mt-2">
            <div className="text-muted fs-11 text-uppercase mb-1">Implementace</div>
            <div className="fs-13">{c.implementation}</div>
          </div>
          {c.custom === 'YES' && c.customReason && (
            <div className="col-12 mt-1">
              <div className="alert alert-warning py-1 px-2 mb-0 fs-12">
                <strong>Proč custom:</strong> {c.customReason}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ComponentReference() {
  const [aktivni, setAktivni] = useState<string>('banka');
  const sekce = SECTIONS.find((s) => s.id === aktivni) ?? SECTIONS[0];
  const hotovoCnt = SECTIONS.filter((s) => s.status === 'hotovo').length;
  const rozpCnt = SECTIONS.filter((s) => s.status === 'rozpracovane').length;
  const cekaCnt = SECTIONS.filter((s) => s.status === 'ceka').length;

  return (
    <>
      <div className="page-title-box">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h4 className="page-title mb-0 d-flex align-items-center gap-2">
            <iconify-icon icon="solar:widget-bold-duotone" style={{ color: '#6c757d' }} />
            Mapa komponent
          </h4>
          <div className="d-flex gap-2 align-items-center fs-12 flex-wrap">
            <StatusBadge status="hotovo" /> <span className="text-muted">{hotovoCnt}</span>
            <span className="text-muted">·</span>
            <StatusBadge status="rozpracovane" /> <span className="text-muted">{rozpCnt}</span>
            <span className="text-muted">·</span>
            <StatusBadge status="ceka" /> <span className="text-muted">{cekaCnt}</span>
          </div>
        </div>
      </div>

      <div className="alert alert-info py-2 mb-3 fs-13 d-flex align-items-start gap-2">
        <iconify-icon icon="solar:info-circle-bold-duotone" style={{ fontSize: 18 }} />
        <div>
          Vývojová dokumentace pro kodéra. Vyber sekci v levém panelu — uvidíš komponenty té sekce
          (pattern, Larkon mapping, sub-komponenty, jak implementovat). <strong>Postupně doplňujeme</strong> —
          jak procházíme jednotlivé sekce systému, dokumentaci aktualizujeme.
        </div>
      </div>

      <div className="row g-3">
        {/* LEVÝ NAV — sekce */}
        <div className="col-md-3">
          <div className="card">
            <div className="list-group list-group-flush">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${aktivni === s.id ? 'active' : ''}`}
                  onClick={() => setAktivni(s.id)}>
                  <iconify-icon icon={s.icon} style={{ fontSize: 18 }} />
                  <div className="flex-grow-1 text-start">
                    <div className="fw-semibold fs-13">{s.label}</div>
                    <div className={`fs-11 ${aktivni === s.id ? 'text-white-50' : 'text-muted'}`}>
                      {s.components.length > 0 ? `${s.components.length} komponent` : '—'}
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PRAVÝ OBSAH — komponenty sekce */}
        <div className="col-md-9">
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                <div>
                  <h5 className="mb-1 d-flex align-items-center gap-2">
                    <iconify-icon icon={sekce.icon} style={{ color: '#0d6efd' }} />
                    {sekce.label}
                  </h5>
                  <div className="text-muted fs-12">
                    {sekce.components.length > 0
                      ? `${sekce.components.length} komponent`
                      : 'Sekce zatím nemá detailní mapping'}
                  </div>
                </div>
                <StatusBadge status={sekce.status} size="md" />
              </div>
              {sekce.intro && (
                <p className="fs-13 mb-0 mt-2 text-muted">{sekce.intro}</p>
              )}
            </div>
          </div>

          {sekce.components.length > 0 ? (
            sekce.components.map((c, i) => <ComponentCard key={i} c={c} />)
          ) : (
            <div className="card">
              <div className="card-body text-center text-muted py-5">
                <iconify-icon icon="solar:clock-circle-bold-duotone" style={{ fontSize: 56, color: '#dee2e6' }} />
                <div className="mt-3 fs-15">Sekce čeká na rozpis</div>
                <div className="fs-13 mt-1">
                  Detailní mapping komponent doplníme, jakmile budeme tuto sekci procházet v rámci feedback meetingu.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
