# IS Con Gusto – Claude Code Instructions

Interaktivní admin wireframe pro gastro skupinu Con Gusto (15+ provozoven).
React 18 + Vite 4 + TypeScript 5, plain CSS, žádné UI kity, žádný backend.

## Verze

| Verze | Branch / repo | GitHub Pages | Popis |
|---|---|---|---|
| v1 | initial commit | — | Základní wireframe |
| v2 | `IS-Con-Gusto-v2` | `/IS-Con-Gusto-v2/` | Finance moduly, schvalování, cashflow |
| v3 | `IS-Con-Gusto-v3` | `/IS-Con-Gusto-v3/` | Redesign Tržby, historické grafy, multi-venue |

## Spuštění

```bash
npm run dev     # dev server na localhost:5173
npm run build   # TypeScript check + Vite build (vždy ověř po změnách)
```

## Architektura

```
src/
  App.tsx               # root, drží celý AppState, předává state + update dolů
  types.ts              # všechny sdílené typy
  data.ts               # mock data + helpery (fCzk s tečkou, FOUNDING_YEAR, genMonthRevenue...)
  platbyData.ts         # faktury, platby, účty, SCHVALOVACI_OSOBY
  pohledavkyData.ts     # pohledávky, aging, STAV_META_POH
  cashflowData.ts       # týdenní cashflow, KPI, kategorie, transakce, prognóza
  components/
    AppShell.tsx         # shell: sidebar + topbar + routing + mobilní overlay
    Sidebar.tsx          # navigace – Přehled / Finance / Systém / Dev
    Topbar.tsx           # vždy dvouřádkový: název sekce | grouped provozovna select + period (jen dashboard)
    DashboardView.tsx    # hlavní dashboard
    TrzbyView.tsx        # analytická sekce v3 – KPI boxy, detail tabulka, vývoj graf, historický přehled
    TrzbyWidget.tsx      # SVG stacked bar chart (kuchyň + bar) + trend line, jen chart
    FakturyView.tsx      # správa a schvalování faktur (Finance > Faktury)
    FakturyTable.tsx     # tabulka faktur (sdílená s PlatbyView)
    FakturaDetailDrawer.tsx # offcanvas drawer pro schválení / detail faktury
    PlatbyView.tsx       # výběr a odeslání plateb do banky (Finance > Platby)
    PohledavkyView.tsx   # vydané faktury, sledování úhrad, upomínky (Finance > Pohledávky)
    CashflowView.tsx     # přehled peněžních toků – řídí ho globální selectedProvozovna
    KPIStrip.tsx         # 4× stat karta s CSS sparkline (dashboard)
    AlertStrip.tsx       # upozornění nad dashboardem
    ProvozonySummary.tsx # tabulka provozoven na dashboardu
    CashflowPreview.tsx  # preview cashflow na dashboardu
    PohledavkyWidget.tsx # widget pohledávek na dashboardu
    BalancePanel.tsx     # sticky cashflow kalkulátor (PlatbyView)
    DalsiPlatbyPanel.tsx # ostatní platby mimo faktury (PlatbyView)
    PotvrditModal.tsx    # potvrzovací modal platby
    ProvozovnaDrawer.tsx # offcanvas detail provozovny
    ComponentReference.tsx # dev mapa komponent (sidebar > Dev)
    PlaceholderView.tsx  # stub pro neimplementované sekce
```

## Klíčové typy

```typescript
type ProvozovnaId = 'all' | string; // 15+ aktivních provozoven
type SidebarSection = 'dashboard' | 'trzby' | 'zavierky' | 'provozovny'
                    | 'cashflow' | 'faktury' | 'pohledavky' | 'platby'
                    | 'reporty' | 'nastaveni' | 'komponenty';

interface AppState {
  selectedSection: SidebarSection;
  selectedProvozovna: ProvozovnaId;  // globální filtr – řídí VŠECHNY sekce
  dataMode: 'live' | 'zavierka';    // NENÍ uživatelsky nastavitelný (odstraněn toggle)
  period: Period;                    // používá jen Dashboard
  drawerOpen: boolean;
  drawerProvozovnaId: string | null;
  sidebarCollapsed: boolean;
}
```

## Topbar (v3)

- **Vždy dvouřádkový** – `--bs-topbar-height: 100px` fixně
- Řádek 1: hamburger + název sekce + search + notifikace + user
- Řádek 2 (vždy): grouped `<select>` provozovny + period pills (jen Dashboard)
- **Grouped provozovna select**: optgroup Restaurace / Pivnice / Táckárny / KOREK / Ostatní + "Všechny provozovny"
- Odstraněno: Live/Závěrka toggle (byl v topbaru v2)
- Period pills se zobrazují POUZE pro sekci `dashboard`

## TrzbyView (v3) – čtyři sekce

### 1. KPI přehled (boxíky)
- 4 boxíky `col-12 col-sm-6 col-xl-3`, vždy čitelné i na úzkém monitoru
- **Badge** v pravém horním rohu: `.trzby-box-badge { font-size: 18px }`, LIVE tečka 12px
- **%** formátováno česky: `.toFixed(1).replace('.', ',')`
- **Dnes**: LIVE badge (pulzující tečka 12px) + počet otevřených/uzavřených účtů (mock `UCTY_MOCK`)
- **Včera**: tržba + % vs. konkrétní den min. týden (např. "vs. středa 9.4.2026")
- **Tento týden**:
  - Hodnota = součet dní co proběhly v týdnu (Po–dnešek, `TYDEN_DNI = 5`)
  - % badge = srovnání stejného počtu dní minulého týdne (`tydenComp * TYDEN_DNI / 7`)
  - vs. = celý minulý týden (6.4.–12.4., 7 dní) jako absolutní číslo
  - Predikce = `(suma / TYDEN_DNI) × 7`
- **Duben 2026**:
  - Hodnota = tržba za 17 dní
  - % badge + vs. = celý duben 2025 (`sumaCelyMesic` z LY dat)
  - Predikce = `(suma / 17) × 30` (průměrný den × počet dní v měsíci)

### 2. Tržby detail (sticky header)
- Card header sticky: `position: sticky; top: 0` – drží se při scrollu pod topbarem
- **Default rozsah: posledních 7 dní** (11.4.–17.4.2026), řazeno sestupně (nejnovější nahoře)
- Filtr: **Od / Do** (date picker), granularita se odvíjí automaticky (≤45 dní = dny, >45 dní = měsíce)
- **Bez lokálního provozovna selectu** – tabulka reaguje na globální `selectedProvozovna`:
  - `all` → multi-venue tabulka (sloupce = jednotlivé provozovny, sticky Celkem vpravo)
  - konkrétní podnik → single-venue detail (Kuchyň / Bar / Celkem / vs. D-7)
- Sticky: datum vlevo, Celkem vpravo, provozovny scrollují uprostřed

### 3. Vývoj tržeb (SVG multi-line chart)
- **Toggle podniků**: barevné pills, klik přidá/odebere linii z grafu (min. 1 vždy)
- **Tři módy** (segment přepínač, default: Roky):
  - `roky` – X = roky od `chartFromYear` do 2026, linie = roční součet per provozovna; délka: 3/5/10/Vše
  - `rok-mesice` – select roku (2006–2026), X = Led–Pro zvoleného roku, linie = měsíční tržby
  - `mesic-roky` – select měsíce (Leden–Prosinec), X = roky od vzniku nejstaršího podniku, linie = daný měsíc per rok
- State: `chartMode`, `chartYear`, `chartMonth`, `chartPeriod`, `chartFromYear` (useMemo), `mesicRokyFromYear` (useMemo)
- Pod grafem: **tabulka "Přehled po rocích/měsících"** (v téže kartě) – reaguje na stejný mód, hodnoty `fCzk` (celá čísla)

### 4. Historický přehled tržeb po měsících (RocniSrovnaniTable)
- Každý podnik = skupina řádků (jeden per rok, od nejaktuálnějšího po nejstarší)
- Sloupce = měsíce (Led–Pro), buňka = měsíční tržba + % vs. stejný měsíc předchozího roku
- Dva sticky sloupce: název podniku (`rowSpan=N`) + rok (2026/2025/...)
- **Defaultně sbaleno**: `useState(new Set(provs.map(p => p.id)))` – každý podnik zobrazí jen 2026+2025
- **Toggle sbalení** v buňce s názvem podniku: rozbaleno = vše od roku vzniku
  - Toggle se zobrazí jen pokud má podnik > 2 roky dat
- Vizuální oddělení: 2026 řádek = zlatavé pozadí + silná border-top

## Data (v3 změny)

### src/data.ts
- `fCzk()`: tečka jako oddělovač tisíců (`1.201.800 Kč`), ne mezera – viz `replace(/[  ]/g, '.')`
- `fCzkShort()`: `1.2 M Kč` / `890 tis. Kč`
- `PROVOZOVNY`: 15 aktivních + 3 plánované
- `FOUNDING_YEAR` (v TrzbyView): rok vzniku per provozovna; Piazza = 2006, CG Brno = 2018 atd.
- `genMonthRevenue(year, month, provId)`: měsíční tržba pro libovolný rok zpátky (yFactor = `Math.pow(0.95, 2025-year)`)
- `genYearData(year, provId)`: 12 měsíčních hodnot (volá genMonthRevenue)
- `genAnnualRevenue(year, provId)`: součet 12 měsíců (pro historický přehled)
- `SEASONAL[12]`: sezónní faktory (únor nejnižší 0.75, prosinec nejvyšší 1.18)

### Místní data v TrzbyView.tsx
- `BASE_SPLIT`: kuchyň/bar split průměrů per provozovna
- `BASE_DAY`: celkový denní průměr (odvozeno ze splitů)
- `DAILY_TARGET`: denní cíl = BASE_DAY × 1.05 (pro Výkon sloupec)
- `UCTY_MOCK`: otevřené/uzavřené účty per provozovna (pro Dnes box)
- `PROV_GROUPS`: skupiny pro výběr (Restaurace / Pivnice / Táckárny / KOREK / Ostatní)

## Odstraněno v v3

- Lokální provozovna selecty z: FakturyView, PohledavkyView, CashflowView (tabs)
- Live/Závěrka toggle z topbaru
- Period pills pro sekci Tržby v topbaru
- Výkon vs. cíl sloupec z Tržby detail (single-venue pohled)
- Samostatná karta "Přehled vybraných podniků" → sloučena do grafu

## Custom CSS (src/styles/custom.css) – v3 přidáno

- `.trzby-box` / `.trzby-box-*`: KPI boxíky (flex column, responsive)
- `.trzby-live-dot`: pulzující tečka u LIVE badge (`@keyframes trzby-pulse`)
- `.trzby-detail-header-sticky`: sticky card header pro Tržby detail
- `.trzby-detail-wrap` / `.trzby-detail-table`: scrollovatelná tabulka se sticky sloupci
- `.trzby-sticky-l` / `.trzby-sticky-r`: sticky levý/pravý sloupec
- `.trzby-chart-toggle`: toggle pills výběru podniků v grafu
- `.trzby-rs-*`: styly pro historický přehled (venue-h/c, year-h/c, cur/prev/last, toggle)
- `--bs-topbar-height: 100px` fixně (topbar vždy dvouřádkový)
- `.table > :not(caption) > * > *`: svislé linky mezi sloupci ve všech tabulkách

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

## Konvence kódu

- Každá komponenta má header komentář: `// COMPONENT / SOURCE / CUSTOM`
- `CUSTOM: YES` = SVG chart, workflow, gastro logika
- `CUSTOM: NO` = čistý Larkon/Bootstrap pattern
- `CUSTOM: PARTIAL` = layout Larkon, část logiky custom
- `.lk-custom` div = vizuální marker prototype prvků (v produkci smazat)
- Žádné externí UI kity, chart knihovny, routing kity
- Globální stav: App.tsx → AppState + `update(partial)` pattern
- Lokální view state: `useState` přímo ve view komponentě
- Finanční částky: `white-space: nowrap` vždy; formát s tečkami (`1.201.800 Kč`)

## Responzivní design

- Bootstrap breakpoint `md` (768px): hlavní mobilní breakpoint
  - Sidebar: overlay, offcanvas drawery: `min(520px, 100vw)`
  - KPI boxíky: `col-12 col-sm-6 col-xl-3` (4→2→1 sloupce)
  - Topbar filter row: horizontální scroll
- Tabulky: `.trzby-detail-wrap` s `overflow-x: auto`, sticky sloupce
- `.d-mobile-none`: skrytí tabulkových sloupců na mobilu

## Co ještě není hotové (placeholder views)

- Denní závěrky (`zavierky`)
- Provozovny detail (`provozovny`)
- Reporty, Nastavení

## Kontext projektu

Wireframe vznikl jako interní demo pro vedení firmy Con Gusto.
Primární kontakt: Petr Dohnal (vedení).
Referenční datum: **2026-04-17** (čtvrtek), týden 13.4.–19.4.2026.
Piazza otevřena 2006 (potvrzeno majitelem).
v3 session 1: kompletní redesign sekce Tržby + UX cleanup napříč aplikací.
v3 session 2: UX polish – badge velikost, desetinná čárka v %, predikce týden/měsíc, tři grafy módy, default 7 dní detail, historický přehled sbalený.
