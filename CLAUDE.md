# IS Con Gusto – Claude Code Instructions

Interaktivní admin wireframe pro gastro firmu Con Gusto (3 provozovny).
React 18 + Vite 4 + TypeScript 5, plain CSS, žádné UI kity, žádný backend.

## Spuštění

```bash
npm run dev     # dev server na localhost:5173
npm run build   # TypeScript check + Vite build (vždy ověř po změnách)
```

## Architektura

```
src/
  App.tsx               # root, drží celý AppState, předává state + update dolů
  types.ts              # všechny sdílené typy (AppState, ProvozovnaId, ...)
  data.ts               # mock data – tržby, závěrky, provozovny + helpery
  platbyData.ts         # mock data – faktury, ostatní platby, účty, SCHVALOVACI_OSOBY
  pohledavkyData.ts     # mock data – pohledávky, aging, stavový automat
  cashflowData.ts       # mock data – týdenní cashflow, KPI, kategorie, transakce, prognóza
  components/
    AppShell.tsx         # shell: sidebar + topbar + routing + mobilní overlay
    Sidebar.tsx          # navigace – Přehled / Finance / Systém / Dev
    Topbar.tsx           # dvouřádkový topbar: název sekce + filtry (jen dashboard/tržby)
    DashboardView.tsx    # hlavní dashboard
    TrzbyView.tsx        # analytická sekce – TrzbyWidget + TrzbyTable
    FakturyView.tsx      # správa a schvalování faktur (Finance > Faktury)
    FakturyTable.tsx     # tabulka faktur (sdílená s PlatbyView)
    FakturaDetailDrawer.tsx # offcanvas drawer pro schválení / detail faktury
    PlatbyView.tsx       # výběr a odeslání plateb do banky (Finance > Platby)
    PohledavkyView.tsx   # vydané faktury, sledování úhrad, upomínky (Finance > Pohledávky)
    CashflowView.tsx     # přehled peněžních toků (Finance > Cashflow)
    TrzbyWidget.tsx      # hlavní tržby widget (SVG chart + MesicVsLY + breakdown)
    KPIStrip.tsx         # 4× stat karta s CSS sparkline (dashboard)
    AlertStrip.tsx       # upozornění nad dashboardem
    ProvozonySummary.tsx # tabulka provozoven na dashboardu
    CashflowPreview.tsx  # preview cashflow na dashboardu
    PohledavkyWidget.tsx # widget pohledávek na dashboardu
    TrzbyTable.tsx       # tabulka denních tržeb
    BalancePanel.tsx     # sticky cashflow kalkulátor (PlatbyView)
    DalsiPlatbyPanel.tsx # ostatní platby mimo faktury (PlatbyView)
    PotvrditModal.tsx    # potvrzovací modal platby
    ProvozovnaDrawer.tsx # offcanvas detail provozovny
    ComponentReference.tsx # dev mapa komponent (sidebar > Dev)
    PlaceholderView.tsx  # stub pro neimplementované sekce
```

## Klíčové typy

```typescript
type ProvozovnaId = 'all' | 'cg-brno' | 'piazza' | 'monte';
type SidebarSection = 'dashboard' | 'trzby' | 'zavierky' | 'provozovny'
                    | 'cashflow' | 'faktury' | 'pohledavky' | 'platby'
                    | 'reporty' | 'nastaveni' | 'komponenty';

interface AppState {
  selectedSection: SidebarSection;
  selectedProvozovna: ProvozovnaId;
  dataMode: 'live' | 'zavierka';
  period: Period;           // 'dnes' | 'vcera' | 'tyden' | 'minuly-tyden' | 'minuly-mesic' | 'rok'
  drawerOpen: boolean;
  drawerProvozovnaId: string | null;
  sidebarCollapsed: boolean;
}
```

## Routing (AppShell.tsx)

| selectedSection | Komponenta |
|---|---|
| `dashboard` | DashboardView |
| `trzby` | TrzbyView |
| `faktury` | FakturyView |
| `pohledavky` | PohledavkyView |
| `cashflow` | CashflowView |
| `platby` | PlatbyView |
| `komponenty` | ComponentReference |
| ostatní | PlaceholderView |

## Mobilní navigace (AppShell.tsx)

Sidebar na mobilu funguje jako overlay přes Larkon mechanismus:
- `html[data-menu-size="hidden"]` — sidebar skrytý (margin-left: -280px)
- `html.sidebar-enable` — sidebar viditelný jako overlay (z-index: 1055)
- `mobileNavOpen` — lokální state v AppShell (nesouvisí s AppState)
- `.mob-nav-backdrop` — backdrop div v AppShell, klik zavírá navigaci
- Hamburger volá `handleMenuToggle()`: mobil = toggle overlay, desktop = toggle collapse

## Sekce Finance – logika rozdělení

**Faktury** (`FakturyView`) = správa a schvalování
- všechny faktury bez ohledu na stav (vč. zamítnutých přes stavFilter)
- filtry: kategorie, stav, středisko/provozovna, období
- schvalovací workflow: Nova → Ke schválení → Schválená / Zamítnutá / Zastavená
- přiřazení faktury konkrétní osobě (SCHVALOVACI_OSOBY)
- audit trail: kdo a kdy schválil (localSchvalil + localDatumSchvaleni)
- bulk akce: schválit vybrané (sticky .bulk-bar dole)
- modal "Nová faktura" s typem dokladu, kategorií, přiřazením, souborem
- tlačítko "Přejít na platby →" naviguje na PlatbyView

**Pohledávky** (`PohledavkyView`) = vydané faktury, upomínky
- aging report: horizontal bars 0–30 / 31–60 / 61–90 / 90+ dní po splatnosti
- stavový automat: vystavena → odeslana → po-splatnosti → upominka-1/2 → predžalobni → uhrazena
- timeline drawer (offcanvas): kroková vizualizace průběhu pohledávky
- modal "Nová pohledávka" s opakováním (měsíční, týdenní)
- localStavy: session-local přepínání stavů

**Platby** (`PlatbyView`) = výběr a odeslání do banky
- zobrazuje **pouze schválené** faktury (stavFilter='schvalena' fixed)
- BalancePanel: `zustatek - sumaFa - sumaOstatni + cekajiciKarty + odhadZbytek`
- FutureRevMode: `'off'` / `'budouci'` / `'budouci-plus'`
- PotvrditModal s double-confirm při nedostatku prostředků
- tlačítko "← Správa faktur" naviguje zpět na FakturyView

**Cashflow** (`CashflowView`) = přehled peněžních toků
- lokální přepínač provozovny (nav tabs) — **mimo globální AppState**
- SVG týdenní chart: příjmy vs. výdaje, 8 týdnů history + 2 projektované
- PROV_SCALE: scale faktory dat per provozovna (`{all:1.0, cg-brno:0.45, piazza:0.35, monte:0.20}`)
- kategorie breakdown: horizontal bars (příjmy 4 kat. + výdaje 5 kat.)
- prognóza 30 dní: živá data z FAKTURY_PLATBY + OSTATNI_PLATBY + POHLEDAVKY
- transakce tabulka s KAT_ICONS (iconify ikony per kategorie)

## TrzbyWidget (v2)

Props: `provozovna: ProvozovnaId`, `onDrillDown?: (id: ProvozovnaId) => void`

- auto zdroj dat: víkend/dnes = `pokladna`, po–čt = `závěrka`
- SVG grouped bar chart (kuchyň + bar stacked) s tečkou zdroje pod každým dnem
- summary strip: Celkem / Kuchyň / Bar / vs. minulý týden (↑/↓ barevně)
- Piazza: tab „Střediska" – Sál / Terasa / Bar (stacked bars)
- MesicVsLY: duben 2026 vs. duben 2025, srovnání avg/den
- ProvozovnyBreakdown: `col-12 col-sm-6` (1 sloupec na mobilu, 2 na ≥576px)
  progress bars + klik = drill-down (jen při `provozovna='all'`)

## Data

| Soubor | Obsah |
|---|---|
| `src/data.ts` | tržby, závěrky, provozovny, helpery (fCzk, fDate, ...) |
| `src/platbyData.ts` | faktury (14 mock), ostatní platby (6), účty, SCHVALOVACI_OSOBY |
| `src/pohledavkyData.ts` | pohledávky (12 mock), aging, STAV_META_POH |
| `src/cashflowData.ts` | týdenní data, KPI, kategorie breakdown, transakce, prognóza |

Referenční datum: **2026-04-17** (čtvrtek), týden 13.4.–19.4.2026

## Konvence kódu

- Každá komponenta má header komentář: `// COMPONENT / SOURCE / CUSTOM`
- `CUSTOM: YES` = obsahuje logiku nebo UI mimo Larkon (SVG chart, workflow, gastro logika)
- `CUSTOM: NO` = čistý Larkon/Bootstrap pattern
- `CUSTOM: PARTIAL` = layout Larkon, část logiky custom
- Larkon = cílový produkční UI kit; každá komponenta mapuje na Larkon pattern
- `.lk-custom` div = vizuální marker pro prototype prvky (v produkci smazat)
- Žádné externí UI kity, chart knihovny, routing kity
- Stav pouze v App.tsx přes AppState + `update(partial)` pattern
- Lokální view state (filtry, drawery, modaly) = `useState` přímo ve view komponentě
- Finanční částky: vždy `text-nowrap` / `white-space: nowrap` — nikdy nezalamovat

## Responzivní design

- Bootstrap breakpoint `sm` (576px): ProvozovnyBreakdown 2→1 sloupec
- Bootstrap breakpoint `md` (768px): hlavní mobilní breakpoint
  - Sidebar: overlay přes Larkon `data-menu-size="hidden"` + `sidebar-enable`
  - Offcanvas drawery: `width: min(520px/500px/480px, 100vw)`
  - Bootstrap modaly: `max-width: calc(100vw - 16px)`
  - Topbar filter row: horizontální scroll (overflow-x: auto)
  - KPI karty: 4→2 sloupce
  - Balance/grid panely: 2-1→1 sloupec
- Tabulky: `.table-responsive` wrapper (horizontální scroll, data se neztrácejí)
- Utility třída `.d-mobile-none`: skrytí sloupce na mobilu

## Custom CSS (src/styles/custom.css)

Vše v custom.css je mimo Larkon (sekce 1–12 s komentáři):
1. Brand accent Con Gusto gold `#c9911a` (přepis Bootstrap primary + warning)
2. SPA root layout (React + Larkon koordinace výšky topbaru)
3. Search icon fix (iconify-icon vertikální pozice)
4. `.lk-custom` / `.lk-custom-label` vizuální marker prototype prvků
5. `.chart-area` / `.chart-svg` kontejner pro SVG charty
6. Scrollbar styling
7. `.lk-segment` / `.lk-seg-btn` segment control (topbar přepínače)
8. `.lk-grid-*` CSS grid helpers
9. `.balance-result-row` oddělovač v BalancePanel
10. `.bulk-bar` sticky bulk-action bar (FakturyView)
11. `.topbar-rows` / `.topbar-row-main` / `.topbar-row-filters` dvouřádkový topbar
12. `.mob-nav-backdrop` + `@media (max-width: 767.98px)` mobilní responzivita

## Provozovny

| ID | Název | Zkratka |
|---|---|---|
| `cg-brno` | Con Gusto Brno | CG |
| `piazza` | Piazza | PI |
| `monte` | Monte | MO |
| `all` | Všechny provozovny | — |

## Co ještě není hotové (placeholder views)

- Denní závěrky (`zavierky`)
- Provozovny detail (`provozovny`)
- Reporty, Nastavení

## Kontext projektu

Wireframe vznikl jako interní demo pro vedení firmy Con Gusto.  
Primární kontakt: Petr Dohnal (vedení).  
Email 15.4.: spec modulu Platba faktur.  
Email 13.4.: spec TrzbyWidget (auto zdroj, week vs week, mesic vs LY, střediska, drill-down).
