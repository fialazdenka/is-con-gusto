# IS Con Gusto – Claude Code Instructions

Interaktivní admin wireframe pro gastro skupinu Con Gusto (15+ provozoven).
React 18 + Vite 4 + TypeScript 5, plain CSS, žádné UI kity, žádný backend.

## Verze

| Verze | Branch / repo | GitHub Pages | Popis |
|---|---|---|---|
| v1 | initial commit | — | Základní wireframe |
| v2 | `IS-Con-Gusto-v2` | `/IS-Con-Gusto-v2/` | Finance moduly, schvalování, cashflow |
| v3 | `IS-Con-Gusto-v3` | `/IS-Con-Gusto-v3/` | Redesign Tržby, Platby, brand systém, dashboard |

## Spuštění

```bash
npm run dev     # dev server na localhost:5173
npm run build   # TypeScript check + Vite build (vždy ověř po změnách)
```

## Architektura

```
src/
  App.tsx               # root, drží AppState, nastavuje --prov-color CSS proměnnou
  types.ts              # všechny sdílené typy (Provozovna rozšířena o status/parentId/note)
  data.ts               # mock data + helpery (fCzk, FOUNDING_YEAR, genMonthRevenue...)
  platbyData.ts         # faktury, platby, BANKOVNI_UCTY, PRAVNI_ENTITA, audit data
  pohledavkyData.ts     # pohledávky, aging, STAV_META_POH
  cashflowData.ts       # týdenní cashflow, KPI, kategorie, transakce, prognóza
  components/
    AppShell.tsx         # shell: sidebar + topbar + routing + mobilní overlay
    Sidebar.tsx          # navigace – Přehled / Finance / Systém / Dev
    Topbar.tsx           # dynamická výška (62px dashboard / 100px ostatní), breadcrumb, prov-color
    DashboardView.tsx    # dashboard: Tržby KPI + Platby KPI + grafy + přehledy
    TrzbyView.tsx        # analytická sekce – KPI boxy, detail, vývoj graf, historický přehled
    TrzbyWidget.tsx      # SVG stacked bar chart (kuchyň + bar) + trend line
    FakturyView.tsx      # správa a schvalování faktur
    FakturyTable.tsx     # tabulka faktur (showExtraCols prop pro Platby kontext)
    FakturaDetailDrawer.tsx # offcanvas drawer schválení / detail faktury
    PlatbyView.tsx       # platební dashboard: právní entity, stavový filtr, auto-výběr faktur
    PlatbyDetailPanel.tsx # offcanvas drawer: detail + audit + pozastavení s poznámkou + náhled faktury
    PlatbyKPIStrip.tsx   # 4× KPI karta platby (zůstatek/schváleno/po-splatnosti/splatné)
    InvoicePreview.tsx   # paper-styled náhled faktury s položkami, DPH, platebními údaji
    PohledavkyView.tsx   # vydané faktury, sledování úhrad, upomínky
    CashflowView.tsx     # přehled peněžních toků
    KPIStrip.tsx         # 4× KPI karta tržby (Dnes/Včera/Týden/Měsíc) pro dashboard
    AlertStrip.tsx       # upozornění nad dashboardem
    ProvozonySummary.tsx # tabulka provozoven na dashboardu
    CashflowPreview.tsx  # preview cashflow na dashboardu (zustatek = getZustatek('all'))
    PohledavkyWidget.tsx # widget pohledávek na dashboardu
    BalancePanel.tsx     # sticky: účty per provozovna + budoucí tržby (2 nezávislé volby) + kalkulátor
    DalsiPlatbyPanel.tsx # automatické platby – read-only přehled (bez checkboxů)
    PotvrditModal.tsx    # potvrzovací modal platby (jen faktury)
    ProvozovnaDrawer.tsx # offcanvas detail provozovny
    ProvozovnyView.tsx   # admin sekce: přehled/plánované/práva, brand barvy
    ComponentReference.tsx # dev mapa komponent
    PlaceholderView.tsx  # stub pro neimplementované sekce
```

## Klíčové typy

```typescript
type ProvozovnaId = 'all' | string;
type SidebarSection = 'dashboard' | 'trzby' | 'zavierky' | 'provozovny'
                    | 'cashflow' | 'faktury' | 'pohledavky' | 'platby'
                    | 'reporty' | 'nastaveni' | 'komponenty';

interface Provozovna {
  id: string; name: string; shortName: string; color: string;
  address: string; manager: string; phone: string;
  status: 'active' | 'planned' | 'inactive';
  parentId?: string;  // Piazza sub-sekce (ristorante/caffe/garden)
  note?: string;      // IT poznámka (budoucí brand, plánované atp.)
}

interface AppState {
  selectedSection: SidebarSection;
  selectedProvozovna: ProvozovnaId;
  dataMode: 'live' | 'zavierka';
  period: Period;
  drawerOpen: boolean;
  drawerProvozovnaId: string | null;
  sidebarCollapsed: boolean;
}
```

## Brand barvy provozoven – `--prov-color` systém

- `App.tsx` nastavuje `--prov-color` na `:root` při každé změně `selectedProvozovna`
- Default (Všechny provozovny) = Con Gusto gold `#c9911a`
- Barva se automaticky propisuje do: card border-top, topbar row-filters border, provozovna select border, SVG grafy, KPI ikony, workflow kroky, avatary, pohledávky
- **Brand hex kódy** (z brand manuálů):
  - CG Brno `#cdaa69` · Piazza `#143746` · Monte `#ad0d24` · U Čápa `#0C5E44`
  - KOREK WB `#648CE8` · U Kohoutů `#E64843` · Nad Hladinkou `#203A9A`
  - Flank `#3E111B` · CG Catering `#4b0041` · Táck. LN `#a4e055`
  - Táck. TU `#40cf6d` · Táck. ŠV `#d9f5bf` · Teátr `#e56445`
  - KOREK W `#FFD9AB` · Jíme Brno `#0a0a5a` · Pijeme víno `#ffd2eb`
  - Plánované: Lango `#fcdeba` · Supper Lunch `#ff3700`
  - Piazza sub-sekce: Ristorante `#C87D69` · Caffe `#CDAA87` · Garden `#B9876E`
- Sémantické barvy (prahy výkonu, margin bar) zůstávají zlaté – nejsou `--prov-color`

## Topbar

- **Řádek 1 (vždy)**: hamburger → název sekce (h4) → `|` → provozovna grouped select → search → bell → user
- **Řádek 2 (jen mimo dashboard)**: Bootstrap `.breadcrumb` – cesta zpět, `Con Gusto › ← Finance`
  - ← šipka před rodičovskou sekcí (Finance / Provoz / Dev)
  - Dashboard nemá row 2 → topbar = 62px (useEffect nastavuje `--bs-topbar-height`)
  - Ostatní sekce = 100px
- **Period pills odstraněny** – dashboard KPIStrip zobrazuje Dnes/Včera/Týden/Měsíc přímo
- `.logo-box` fix: `display: flex; height: var(--bs-topbar-height)` místo `line-height`
- `.topbar-rows .topbar-item { height: auto }` – Larkon override (původně `height: 100px`)

## Dashboard

Dvě řady KPI + grafy + přehledy:

1. **Tržby KPI** (KPIStrip) – Dnes / Včera / Tento týden / Duben 2026
   - Stejná data a logika jako TrzbyView KPI boxíky
   - Live tečka u Dnes a Včera, % změny, predikce v patičce
2. **Platby KPI** (PlatbyKPIStrip) – Zůstatek / Schváleno / Po splatnosti / Splatné
3. TrzbyWidget (8col) + CashflowPreview (4col)
4. ProvozonySummary (7col) + PohledavkyWidget (5col)
- TrzbyTable odstraněna (nahrazena TrzbyView)
- Sekce labels s odkazem „Detailní přehled →" / „Správa plateb →"

## TrzbyView – čtyři sekce

### 1. KPI přehled (boxíky)
- Badge 18px, LIVE tečka 12px, % česky (`.toFixed(1).replace('.', ',')`)
- **Dnes**: hodnota otevřených/uzavřených účtů v Kč + počet účtů níž; LIVE badge
- **Včera**: LIVE tečka u periody + % badge (obojí viditelné zároveň); `isLive` prop
- **Tento týden**: predikce nahoře (před vs.), `TYDEN_DNI=5`, % vs. stejný počet dní
- **Duben 2026**: predikce = `(suma/17)×30`, vs. = celý duben 2025 (`sumaCelyMesic`)
- `UCTY_MOCK` má `isLive: boolean` per provozovna (Monte/Jíme/Hladinková/U Kohoutů = false)

### 2. Tržby detail
- **Dropdown přednastavených filtrů**: Dnes/Včera/Aktuální týden/Min. týden/Měsíc/Min. měsíc/Rok/Min. rok
- Default: posledních 7 dní, řazeno sestupně (nejnovější nahoře)
- LIVE tečka (5px) u částky každé provozovny zvlášť v dnešním řádku (dle `UCTY_MOCK.isLive`)
- Multi-venue: tečka per sloupec dle live stavu; Single-venue: tečka u Celkem

### 3. Vývoj tržeb – tři módy
- `roky` / `rok-mesice` (select roku) / `mesic-roky` (select měsíce)
- Tabulka pod grafem reaguje na stejný mód, zobrazuje `fCzk` (celá čísla)

### 4. Historický přehled
- Defaultně sbaleno, header s `flex-wrap` pro zalamování badges

## Platby (PlatbyView)

### Struktura
- **LEFT**: FakturyTable (`showExtraCols=false` – bez Typ dokladu/Kategorie/Přiřazeno) + DalsiPlatbyPanel
- **RIGHT**: BalancePanel (účty per provozovna + kalkulátor) – sticky

### Filtry
- **Splatné do**: pouze Do datum (Od odstraněno – systém filtruje od `2020-01-01`)
- **Status select**: Schválená (default) / Nová neschválená

### Automatický výběr faktur
- `useEffect` v PlatbyView: při změně `selectedProvozovna` se automaticky předvolí všechny `schvalena` faktury pro danou provozovnu
- Zajišťuje, že BalancePanel okamžitě zobrazuje reálnou dostupnost prostředků

### Platební účty (BalancePanel)
- Účty se zobrazují **podle vybrané provozovny** (bez checkboxů) – `getBankovniUctyForProvozovna(provozovna)`
- 1 provozovna → 1 účet; všechny → všechny účty stacked
- EUR účet: Piazza má navíc EUR účet (Raiffeisen Bank) – zobrazen s badge `EUR`, nezahrnuje se do CZK kalkulace
- `BankovniUcet` má pole `mena?: 'CZK' | 'EUR'`

### Dostupnost prostředků (BalancePanel)
- Zůstatky per provozovna jako samostatné řádky s barevnou tečkou, pod tím celkový součet
- Faktury a automatické platby odečteny
- **Budoucí tržby**: dvě **nezávislé** volby (lze kombinovat):
  - „Karty v cestě" (`futureRevMode.karty`)
  - „Odhad tržeb" (`futureRevMode.odhad`)
  - Při více provozovnách: breakdown per provozovna s tečkou
- `FutureRevMode = { karty: boolean; odhad: boolean }` (dříve enum)

### Ostatní platby (DalsiPlatbyPanel)
- **Read-only přehled** – bez checkboxů, bez výběru
- Automatické platby (trvalé příkazy, splátky, poplatky) vždy zahrnuty do kalkulace dostupnosti
- Záhlaví: „Ostatní platby v období · automatické odchozí platby"

### Pozastavení faktury s poznámkou
- Tlačítko „Pozastavit" → inline textarea „Důvod pozastavení…" + Potvrdit / Zrušit
- Poznámka se uloží do `localPoznamky` v PlatbyView, předá se jako `localPoznamka` prop
- V draweru zastavené faktury se zobrazí amber alert „Důvod pozastavení"
- Faktury z mock dat (stav=zastavena) zobrazí svůj `poznamka` field

### Náhled faktury (InvoicePreview)
- Collapsible sekce v PlatbyDetailPanel: „Zobrazit náhled faktury"
- Paper-styled dokument: hlavička (číslo, datum, VS), dodavatel/odběratel (IČO, DIČ, adresa), položky, DPH, platební údaje
- Položky generovány procedurálně dle `kategorie` (zbozi/energie/najem/sluzby/vyplaty)
- Lookup tabulka dodavatelů pro 17 known suppliers; ostatní mají fallback
- DPH sazby: zbozi=12%, ostatní=21%, vyplaty=0%

### Platební stavy (FakturaStavPlatby)
- `nova` · `ke-schvaleni` · `schvalena` · `zamitnuta` · `zastavena`
- `v-bance` · `ceka-na-sparovani` · **`chyba-platby`** = „Platba neproběhla" (jediná chyba)
- `odeslana` · `zaplacena`

### PlatbyKPIStrip
- Zůstatek: `getZustatek(provozovna)` – při 'all' = součet všech účtů, patička „Celkem všechny účty"
- Ostatní KPI (schválené/po splatnosti/splatné) vždy za vybranou provozovnu

### Právní entity (PRAVNI_ENTITA v platbyData.ts)
- `con-gusto`: vše kromě U Čápa a KOREK
- `u-capa`: Pivnice U Čápa s.r.o.
- `korek`: KOREK Wines + KOREK Winebar s.r.o.
- Při neshodu faktura↔účet → žlutý warning v BalancePanel (neblokující)

### Mock data – provozovny s platebními daty
CG Brno, Piazza (+ EUR účet), Monte, U Čápa, KOREK WB, U Kohoutů, Nad Hladinkou, Teátr, Jíme Brno
– každá má: UCTY, BANKOVNI_UCTY, BANK_SYNC_DATA, FAKTURY_PLATBY (3–4 ks), OSTATNI_PLATBY (2 ks), BUDOUCI_TRZBY

### PlatbyDetailPanel
- Offcanvas drawer: detail faktury + bankovní účet provozovny + audit timeline + workflow akce
- Pozastavení s poznámkou (inline textarea)
- Collapsible náhled faktury (InvoicePreview)

## Provozovny (ProvozovnyView)

Admin sekce (sidebar → Provoz → Provozovny), 3 záložky:
- **Přehled**: skupiny Restaurace/Pivnice/Táckárny/KOREK/Ostatní, brand barva jako badge, Piazza sub-sekce odsazeny (↳)
- **Plánované**: Lango/Supper Lunch/Táck. ABB/Flank 2 s poznámkami
- **Práva**: placeholder pro IT

## Globální CSS (custom.css)

### Card headers (globální)
```css
.card-header { position: sticky; top: 0; z-index: 20; background: var(--bs-card-bg, #fff); }
.card-header.d-flex { flex-wrap: wrap !important; gap: 8px !important; }
```

### --prov-color napojení
```css
.topbar-row-filters { border-top: 2px solid var(--prov-color, var(--bs-border-color)); }
.topbar-prov-select { border-left: 3px solid var(--prov-color, ...); }
```

### Platby CSS
- `.platby-stav-sparovani` / `.platby-stav-chyba`: custom badge styly
- `.platby-alert-chyba`: dark red alert pro „Platba neproběhla"
- `.platby-bulk-toolbar`: floating dark toolbar při výběru
- `.platby-audit-timeline` / `.platby-audit-item` / `.platby-audit-dot`: audit časová osa
- `.platby-ucet-row`: řádky platebních účtů

### Font
- Acumin Pro (Book 400 / Semibold 600 / Bold 700) z `/public/fonts/`
- `@font-face` + globální override `body, .card, .table, .btn, .badge, h1-h6`
- CSS proměnné `--font` a `--font-heading` nastaveny na `'Acumin Pro'` (global.css)
- **Nikdy nepoužívat `font-monospace`** – Bootstrap třída přepne na systémový monospace (SF Mono/Menlo)

### Číselné formátování
- `fCzk(n)` v `data.ts`: oddělovač tisíců = `U+202F` (narrow no-break space) – viz regex `replace(/[  ]/g, ' ')`
- `.czk-num` CSS třída (custom.css): `font-family: 'Acumin Pro'; font-variant-numeric: tabular-nums` – nahrazuje `font-monospace` všude v projektu

## Routing (AppShell.tsx)

| selectedSection | Komponenta |
|---|---|
| `dashboard` | DashboardView |
| `trzby` | TrzbyView |
| `faktury` | FakturyView |
| `pohledavky` | PohledavkyView |
| `cashflow` | CashflowView |
| `platby` | PlatbyView |
| `provozovny` | ProvozovnyView |
| `komponenty` | ComponentReference |
| ostatní | PlaceholderView |

## Kontext projektu

Wireframe vznikl jako interní demo pro vedení firmy Con Gusto.
Primární kontakt: Petr Dohnal (vedení).
Referenční datum: **2026-04-17** (čtvrtek), týden 13.4.–19.4.2026.
Piazza otevřena 2006 (potvrzeno majitelem).

### Session log
- **v3 s1**: Redesign Tržby, historické grafy, multi-venue chart, breadcrumb nav
- **v3 s2**: UX polish Tržby (badge, predikce, grafy módy, detail řazení)
- **v3 s3**: Platby dashboard (stavy, audit, multi-účty, právní entity, smart alerts)
- **v3 s4**: Brand systém (--prov-color, brand hex kódy, ProvozovnyView, Acumin Pro)
- **v3 s5**: Topbar redesign (breadcrumb, prov-color accent, dynamická výška, sticky headers)
- **v3 s6**: Tržby UX (LIVE tečky per-venue, date presety, DnesKpiBox hodnoty)
- **v3 s7**: Dashboard aktualizace (nové KPIStrip Dnes/Včera/Týden/Měsíc, PlatbyKPIStrip)
- **v3 s8**: Platby UX – oddělovač tisíců (U+202F), czk-num třída místo font-monospace, celoplošný Acumin Pro, pozastavení s poznámkou, InvoicePreview, DalsiPlatbyPanel read-only, BalancePanel per-provozovna účty bez checkboxů, EUR účet Piazza, FutureRevMode jako { karty, odhad }, per-provozovna breakdown budoucích tržeb, auto-výběr schválených faktur, mock data pro 6 nových provozoven, dynamický getZustatek napříč dashboardem
