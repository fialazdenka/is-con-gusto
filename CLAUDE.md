# IS Con Gusto – Claude Code Instructions

Interaktivní admin wireframe pro gastro skupinu Con Gusto (15+ provozoven).
React 18 + Vite 4 + TypeScript 5, plain CSS, žádné UI kity, žádný backend.

## Verze

| Verze | Branch / repo | GitHub Pages | Popis |
|---|---|---|---|
| v1 | initial commit | — | Základní wireframe |
| v2 | `IS-Con-Gusto-v2` | `/IS-Con-Gusto-v2/` | Finance moduly, schvalování, cashflow |
| v3 | `IS-Con-Gusto-v3` | `/IS-Con-Gusto-v3/` | Redesign Tržby, Platby, brand systém, dashboard |
| **live** | `is-con-gusto` | **https://fialazdenka.github.io/is-con-gusto/** | Aktuální verze (deploy z `main` přes GitHub Actions) |

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
  platbyData.ts         # faktury, platby, BANKOVNI_UCTY, PRAVNI_ENTITA, MATCHING_DATA, FakturaForma
  pohledavkyData.ts     # pohledávky, aging, STAV_META_POH
  cashflowData.ts       # týdenní cashflow, KPI, kategorie, transakce, prognóza
  bankaData.ts          # BankaUcet, BankaTransakce (3 stavy: paired/unpaired/manual-paired), SuggestedMatch, TransAuditEntry, TransNote, TransDelegace, BANKA_USERS, isInternalTransfer, helpers
  trvalePrikazyData.ts  # TrvalyPrikaz (standard/leasing/zaloha), TrvalySplatkaItem (rozpad VS), TrvalyDokument, generateLeasingSplatky
  uveryData.ts          # Uver (hypoteka/investicni/provozni/leasing-finanční), UverSplatkaItem (jistina/úrok rozpad), fix vs PRIBOR sazba, generateUverSplatky (anuita)
  poplatkyData.ts       # Poplatek (9 typů), MesicniSouhrn, getBreakdownPoTypech
  paymentPlatformsData.ts # Qerko/GoPay/Sodexo/terminal config, DenniParovani (per den per provozovna), MesicniFakturaPlatformy, skutečný vs odhad poplatek
  duplicateDetection.ts # detectDuplicates() – pure function (VS / číslo / dodavatel+částka+měsíc)
  dodaciListyData.ts    # mock dodací listy (DodaciList, DLPolozka, getDodaciList/y)
  fakturaPolozkyUtils.ts# generateFakturaPolozky(), DPH_SAZBA, getDiffStav(), DIFF_META, tolerance prahy
  components/
    KodView.tsx          # /kod – podklady pro kodéra: PHP/Laravel/Livewire v4 + náhledy
    AppShell.tsx         # shell: sidebar + topbar + routing + mobilní overlay
    Sidebar.tsx          # navigace – Přehled / Finance / Systém / Dev
    Topbar.tsx           # dynamická výška (62px dashboard / 100px ostatní), breadcrumb, prov-color
    DashboardView.tsx    # dashboard: Tržby KPI + Platby KPI + grafy + přehledy
    TrzbyView.tsx        # analytická sekce – KPI boxy, detail, vývoj graf, historický přehled
    TrzbyWidget.tsx      # SVG stacked bar chart (kuchyň + bar) + trend line
    FakturyView.tsx      # 2-col workflow dashboard: filter bar + AutoStatusBar + tabulka + side-panel
    FakturyTable.tsx     # tabulka faktur s sortovatelnými hlavičkami, multiselect filtry, forma badge
    FakturySidePanel.tsx # overlay detail (offcanvas zprava): sticky flush hlavička s ikonovým clusterem (popisky) + záložky Detail/Párování/Komunikace/Historie
    DLMatchingDetail.tsx # diff tabulka faktura vs DL, editovatelné DL, "Spustit párování" s callback
    DuplicateDetail.tsx  # side-by-side comparison "Tato faktura" vs "Originál" s red highlighty
    BankaView.tsx        # banka: účty (Konsolidované + Ostatní rozbalitelné) + Work Queue „Vyžaduje pozornost" + tabulka transakcí + single-scroll side panel
    TrvalePrikazyView.tsx# Trvalé příkazy: KPI + tabulka + form modal (nový/upravit) + side panel se splátkovým kalendářem (per-řádek edit)
    UveryView.tsx        # Úvěry: KpiBox strip + tabulka (sazba fix vs PRIBOR) + side panel (rozpad jistina/úrok, bez kalendáře) + „Detail úvěru" modal s editovatelným splátkovým kalendářem
    KpiBox.tsx           # SDÍLENÝ KPI box (styl Tržby .kpi-box): label+ikona / hodnota / sub / footer badge — sjednocený prvek napříč systémem
    PoplatkyView.tsx     # Poplatky: KpiBox strip + barbar breakdown po typech + tabulka + měsíční souhrny; edit modal (jen zařazení — datum/účet/částka read-only z banky)
    PaymentPlatformView.tsx # Generická view pro Qerko/GoPay/Sodexo/terminal: KpiBox strip + párovací výpis s bankou (Od–Do filtr + „Nahrát přehled" → reconciliation: skutečná provize + sloupec „Banka" ✓/⚠) + breakdown po provozovnách + měs. faktury
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
// Phase 1 restrukturalizace (zápis 4. 6. 2026) — sidebar členěn na 5 skupin:
// Přehled / Ekonomika / Finance / Systém / Dev
type SidebarSection = 'dashboard' | 'trzby' | 'zavierky' | 'provozovny'
                    | 'cashflow' | 'faktury' | 'pohledavky' | 'platby'
                    | 'banka' | 'trvale-prikazy' | 'uvery' | 'poplatky' | 'dane'
                    | 'karty' | 'qerko' | 'gopay' | 'sodexo'
                    | 'reporty' | 'nastaveni' | 'komponenty' | 'kod';

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

### 3. Vývoj tržeb – tři módy + „Všechny provozy"
- `roky` / `rok-mesice` (select roku) / `mesic-roky` (select měsíce)
- Tabulka pod grafem reaguje na stejný mód, zobrazuje `fCzk` (celá čísla)
- **„Všechny provozy" CTA** (synthetic `ALL_PROV` se id `'all'`, Con Gusto gold `#c9911a`) — exclusive toggle:
  - Klik → deaktivuje všechny ostatní podniky, ukáže jednu zlatou linii = součet všech aktivních provozoven
  - Auto-switch `chartPeriod = 'vse'` → historie od **2006** (Piazza, nejstarší branch v `FOUNDING_YEAR`)
  - Druhý klik → vrátí defaultní výběr (`cg-brno`, `piazza`, `monte`)
  - Klik na konkrétní podnik → odstraní `'all'` z výběru (vrátí se do per-branch módu)
  - Agregace přes `ACTIVE_PROVS.filter(p => BASE_DAY[p.id] > 0).reduce(...)` ve `VyvojChart.data` i `RocniVyvojTable.getValue`

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

## Faktury (FakturyView) – workflow dashboard

### Struktura (2-sloupcový layout)
- **LEFT (col-xl-7)**: FakturyTable se sortovatelnými hlavičkami a multiselect filtry
- **RIGHT (col-xl-5)**: FakturySidePanel – sticky `top: 24px`, `maxHeight: calc(100vh - 48px)`, scroll uvnitř
- Kliknutí na řádek → `setDrawerFakturaId` (NESMÍ navigovat na novou stránku)

### AutoStatusBar (architecture-ready pro cron)
- Mini-card mezi alerty a KPI: „Auto-párování · Interval 15 min · Poslední běh · Příští · Ve frontě · K přepárování · Duplicity blokovány"
- Indikátor `🟢 Aktivní` (zelená tečka s glow halo)
- V produkci by background worker volal `detectDuplicates()` + DL matching v intervalu, aktualizoval `MATCHING_DATA`
- **`MATCHING_DATA: Record<string, MatchingRecord>`** je oddělené od `FAKTURY_PLATBY` – API-ready, single source of truth

### Filter bar (4 řádky chip filtry + presety)
- **Řádek 1**: Search dodavatele · Kategorie select · Částka range (Od–Do Kč) · Preset chips (Po splatnosti, Tento týden) · Zrušit filtry
- **Řádek 2**: **Stav multiselect chips** – Nová / Ke schválení / Schválená / Zamítnutá / Zastavená / Zaplacená
- **Řádek 3**: **Párování multiselect chips** – Spárováno / Nesedí DL / Duplicita / Čistečně spárováno / Čeká / Bez DL
- **Řádek 4**: **Forma multiselect chips** – Zálohová / Dobropis / Offset (speciální účetní případy)
- Všechny multiselecty používají `Set<T>` + `toggleSet()` helper

### Řazení (sortable headers)
- Klikatelné `<SortableTh>` komponenty pro: Číslo / Dodavatel / Částka / Splatnost / Odeslat do / Stav
- ↑↓ indikátor (`solar:alt-arrow-up-bold` / `down-bold`), neaktivní = `sort-vertical-bold-duotone` šedý
- `sortBy: SortCol | null`, `sortDir: 'asc' | 'desc'`, `handleSort(col)` toggle pattern
- `STAV_ORDER` mapa pro semantické řazení stavů (nová → ke-schválení → schválená → …)

### Locking + Cost category audit (uzavřená účetní období)
- `isLocked?: boolean` flag v `FakturaPlatby` (paralelně s workflow stavem — typicky `zaplacena` + `isLocked: true`)
- Mock data: `fp14` Metro AG · CG Brno · březen, `fp46` Makro · Piazza · březen, `fp47` E.ON · Monte · březen
- V `FakturyTable`: 🔒 fialová ikona (`solar:lock-keyhole-bold-duotone`) vedle stav-badge + tooltip „Faktura uzamčena"
- Nový quick filter chip „🔒 Uzamčené (X)" — preset `'uzamcene'` v `presetFilters: Set<'po-splatnosti' | 'tydni' | 'uzamcene'>`; filter logika v `FakturyTable` zahrnuje i `zaplacena` (jinak skryté) když je `isUzamceneFilter` aktivní
- V `FakturySidePanel`: fialový alert nahoře, **nová sekce „Účetní kategorie"** s editovatelným `<select>` (jen kategorie!), workflow akce skryté (`isAprovable = !isLocked && ...`), poznámka `readOnly` s šedým pozadím
- Změna kategorie → callback `onKategorieChange(id, oldKat, newKat)` v `FakturyView` → `pushAudit` s `typ: 'editace'`, fialová ikona pera, text „Kategorie změněna: Zboží → Energie"
- `localKategorie: Record<id, FakturaKategorie>` state v `FakturyView`, předáno do panelu jako `effectiveKategorie`

### Rounding correction workflow (DL diff ≤ 1 Kč)
- V `DLMatchingDetail`: detekce `isRoundingCase = 0 < |totalDiff| <= 1`
- V zeleném boxu Celkem: tlačítko **„Schválit zaokrouhlení"** s info textem „Odchylka je v toleranci ≤ 1 Kč"
- Po schválení: stav „✓ Zaokrouhlení schváleno — odchylka +1 Kč odepsána"
- `localRoundingApproved: Record<id, boolean>` v `FakturyView` → audit `typ: 'parovani'`, zelená barva, ikona verified-check
- Mock: `fp01` Makro · 45 201 Kč (DL = 45 200 → diff +1 Kč) pro demo

### Recheck matching (vícenásobné pokusy)
- `localRecheckCount: Record<id, number>` v `FakturyView` (počet pokusů per faktura)
- Tlačítko v `DLMatchingDetail` mění label: „Spustit párování" → „Znovu párovat 1×" → „2×" → ...
- Bílý badge počtu v tlačítku; `btn-primary` při neukončeném párování, `btn-outline-primary` když sparovana
- Tooltip „Doteď X pokusů o přepárování"
- Audit zápis: „První / Druhý / Třetí pokus o přepárování — vyhodnoceno: spárováno ✓ / neshoda s DL / částečně spárováno / detekována duplicita / čeká na DL / bez DL"

### Saved filter presets (uložené filtry)
- Type `FilterPreset = { id, name, icon?, snapshot: { kategorieFilter, stavFilters[], matchingFilters[], formaFilters[], presetFilters[], castkaOd, castkaDo, search } }`
- `savedPresets: FilterPreset[]` state v `FakturyView` + 2 výchozí demo: **Denní review** (Stav: Nová + Ke schválení) a **K vyřešení** (Párování: Nesedí DL + Duplicita · Po splatnosti)
- Nový řádek nahoře v filter baru: „🔖 Moje filtry: [chipy] [+ Uložit aktuální]" s oddělovačem
- Klik na chip → `applyPreset` přepíše všechny filtry + označí preset jako aktivní (`activePresetId`, modré pozadí chipu)
- × ikona u každého chipu → confirm → `deletePreset`
- „Uložit aktuální" → `window.prompt` na název → `saveCurrentAsPreset` snapshot
- Tlačítko disabled když `!hasAnyFilter` (žádný filtr aktivní)
- „Zrušit filtry ×" také čistí `activePresetId`

### Speciální účetní formy (FakturaForma)
- `FakturaForma = 'standard' | 'zalohova' | 'dobropis' | 'offset'`
- `FORMA_LABELS` v platbyData.ts + `FORMA_META` (badge styly) v FakturyTable + `FORMA_INFO` (info sekce) v FakturySidePanel
- **Zálohová** (`fp43` ZAL-2026-0012): info banner „Bude započtena při finální fakturaci", modrý badge
- **Dobropis** (`fp44` DOB-2026-0003, **−3 400 Kč**): záporná částka **červeně** v tabulce i panelu, „Snižuje závazek o X"
- **Offset** (`fp45` OFF-2026-0001): „Místo platby — zápočet vzájemných pohledávek"
- `spojenaSId?: string` – generic odkaz: záloha↔finální / dobropis↔původní / offset↔protistrana

### MatchingStav (oddělené od FakturaStavPlatby)
- `MatchingStav = 'ceka-na-sparovani' | 'sparovana' | 'nesedi-dl' | 'castecne-sparovana' | 'duplikat' | 'bez-dl'`
- Matching workflow je nezávislý na payment workflow
- `getMatchingData(id)` lookup do `MATCHING_DATA` (58 entries pro fp01–fp42)
- `getVS(faktura)` – derives VS z `faktura.vs ?? deriveVS(faktura.cislo)`

### DL párování (DLMatchingDetail)
- Editovatelné DL čísla (přidat/odebrat)
- Celková shoda: green/red box s `totalDiff = faktura.castka - dlCelkem`
- **Diff tabulka 4 sloupce**: Položka | Faktura | DL | Rozdíl
- Tolerance prahy: **≤1 Kč zelená** / **≤5 % oranžová** / **>5 % červená** (`TOLERANCE_EXACT`, `TOLERANCE_PCT`)
- Chybějící položky = „Chybí" / nadbytečné DL položky = „Navíc"
- „Spustit párování" tlačítko se spin animací (`.spin` keyframe) + `onRematch?(id)` callback → audit log

### Duplicate detection (duplicateDetection.ts)
- `detectDuplicates(faktury)` – pure function, idempotentní (vhodná pro cron)
- 3 kontroly: **stejný VS** (≥ 4 znaky) / **stejné číslo faktury** / **stejný dodavatel + částka + provozovna + měsíc**
- `DuplicateHit = { originalId, duvody, zavaznost: 'critical' | 'warning' }`
- Critical = VS/číslo match → blokuje schválení; warning = částka+dodavatel match → upozornění
- `DuplicateDetail` komponenta: side-by-side comparison s **červeně zvýrazněnými shodnými poli**

### FakturySidePanel — 4 záložky (tabs) namísto endless scrollu

**Vždy nahoře viditelné** (nad záložkami):
- **Header** – status badges (effectiveStav + matching stav) + 🔒 lock indicator + dodavatel + číslo
- **Alerty** – Locked (fialový) / Mismatch (warning) / Duplicate (danger) — zobrazují se podle stavu

**Záložky (klik mění obsah, hlavička zůstává):**
1. **📄 Detail** (default) — Key details (částka, splatnost, VS, číslo, DL badges, přiřazeno, schválil, poznámka) · **Účetní kategorie** (jen pokud isLocked — editovatelný dropdown s audit zápisem) · **Účetní forma** (jen pokud ≠ 'standard') · **Náhled faktury** (collapsible InvoicePreview) · **Přílohy** (mock PDF + upload placeholder) · **Workflow akce** (Schválit / Odložit / Zamítnout, blokováno při duplicitě, skryté při isLocked) + Poznámka textarea (read-only při isLocked)
2. **🔗 Párování DL** — DLMatchingDetail (pro nesedi-dl / castecne-sparovana / sparovana) / DuplicateDetail (pro duplikat) / „Bez DL" stav. Obsahuje **Rounding correction workflow** (tlačítko „Schválit zaokrouhlení" když diff ≤ 1 Kč) a **Recheck matching** („Znovu párovat 3×" s počtem v badgi)
3. **💬 Komunikace** — Internal communication thread (Účetní / Provoz / Management mock + input)
4. **🕐 Historie** — Audit timeline s 8 typovými badgemi

**Sticky pozice:** `top: calc(var(--bs-topbar-height) + 16px)`, `maxHeight: calc(100vh - var(--bs-topbar-height) - 32px)` — správně pod topbarem, využije celou výšku viewportu

### Layout chování
- **Bez výběru faktury:** tabulka přes `col-12` (full-width)
- **Po výběru:** tabulka `col-xl-7 col-lg-7`, panel `col-xl-5 col-lg-5` se objeví vpravo
- **Po zavření panelu** (× nebo opakovaný klik): tabulka zpět full-width

### Audit log (SessionAuditEntry)
- `typ?: 'schvaleni' | 'editace' | 'parovani' | 'komunikace' | 'stav' | 'priloha' | 'zadani' | 'prirazeni'`
- `TYP_LABEL` mapa s vlastní barvou pro každý typ (badge zobrazený vedle jména)
- **Mock entries** (`getMockAudit`): zadání, příloha, editace (5 variant dle hashe ID), přiřazení, párování/přepárování, schválení/zamítnutí
- **Reálné session entries** (uloženo v `localAudit: Record<string, SessionAuditEntry[]>` ve FakturyView):
  - `handleSchvalit` / `handleZamitout` → typ `schvaleni`
  - `handleOdlozit` → typ `stav`
  - `handleRematch` → typ `parovani` (manuální přepárování)
  - `onAddKomentar` → typ `komunikace` (každý komentář se duplikuje do auditu)

### Interní komunikace (KomentarEntry)
- `KomentarEntry = { id, kdo, role, avatar, color, zprava, cas }`
- `ROLE_LABEL`: ucetni / provoz / management / schvalovatel / fakturant / majitel
- **Mock vlákno** (`getMockKomentare`): Jana Kovářová (Účetní, #0dcaf0 JK) a Martin Procházka (Provoz, #198754 MP)
  - **nesedi-dl**: účetní upozorní, provoz odpovídá (vrácené zboží, dobropis čeká)
  - **duplikat**: účetní upozorní a prověřuje
  - **sparovana**: účetní potvrzuje připravenost
  - **nova/ke-schvaleni**: účetní žádá o schválení
- Real session komentáře uloženy v `localKomentare: Record<string, KomentarEntry[]>` ve FakturyView
- PANEL_USER = majitel (`SCHVALOVACI_OSOBY.find(o => o.role === 'majitel')`), používá `var(--prov-color)`

### Workflow akce a queue schvalování
- `localStavy: Record<string, FakturaStavPlatby>` – session-local stavy
- „Spustit schvalování (X)" – modal queue přes všechny `ke-schvaleni` faktury, po každém schválení automaticky další
- AKTUALNI_UZIVATEL = majitel (mock přihlášený)

### Alert strip (4 typy, podmíněné)
- **Duplicity** (`duplikatCnt > 0`) – red, click → `setMatchingFilters(new Set(['duplikat']))`
- **Po splatnosti** – red, click → `setPresetFilters(new Set(['po-splatnosti']))`
- **Ke schválení** – warning, click → `setStavFilters(new Set(['nova', 'ke-schvaleni']))`
- **Splatné tento týden** – info, click → `setPresetFilters(new Set(['tydni']))`

## Banka (BankaView) – přehled bankovních účtů + transakce

Sidebar → **Finance → Banka** (`selectedSection: 'banka'`). Cílový uživatel: majitel / finanční ředitel.

### Datový model (`bankaData.ts`)
- `BankaUcet` — id, nazev, iban, banka, mena (CZK/EUR), **provozovny: string[]** (může být víc — budoucnost multi-venue), ucetniBalance, dostupniProstredky, lastSync (ISO), syncStav, **stav** (BankaUcetStav), **historieBalance: number[]** (37 hodnot: 30 minulých + dnes + 6 budoucích), predikceKonecTydne, predikceKonecMesice
- `BankaTransakce` — id, ucetId, typ (prichoz/odchozi), datum, castka (záporná=odchozí), firma, poznamka, vs?, stav, parovanaSId?, **manualReason?/manualNote?**, **rozdeleni?**: Array<{provozovnaId, castka, ucel?}> (rozpad platby na víc provozů), **delegatedTo?**: TransDelegace, **notes?**: TransNote[], **auditLog?**: TransAuditEntry[] · (legacy/nevyužité v UI: candidates?, isOverdueAtBank?, splatnost?, outsideReason?, noInvoiceReason?)
- `BankaUcetStav` — `'ok' | 'low-balance' | 'critical-balance' | 'sync-error'`
- `BankaTransStav` — `'paired' | 'unpaired' | 'manual-paired'` (**3 stavy** — redukce zápis 4. 6. 2026)
- `TransDelegace` — user, role, cas, note? (delegace nespárované transakce na uživatele)
- `TransAuditEntry` — cas, kdo, akce, icon, color
- `TransNote` — id, cas, kdo, text
- Helpers: `getUctyForProvozovna`, `getProvozovnyForUcet`, `sumForMena`, `timeAgo`, `STAV_META` (label + labelLong + bg + color + icon), `TRANS_STAV_META` (rozšířené o `shortLabel`)

### Mock data
- **13 účtů**: 4 konsolidované (Hlavní účet / Mzdy a HR / CG Marketing / CG Catering — multi-venue), 8 single-venue, 1 EUR (Piazza EUR), 2 „Bez názvu" (unassigned + critical/low balance)
- **38 transakcí**: 30 původních + 8 demo pro nové stavy (tx31 multi-candidates Metro AG, tx32 95% kandidát Plzeňský Prazdroj, tx33+tx34 bez VS, tx35 outside-system, tx36+tx37 no-invoice, tx38 waiting-review)

### Layout (sekce shora dolů)
1. **Smart Alerts strip** — 4 typy (critical/sync-error/low-balance/unassigned) s **klikatelnými chipy** s akcemi (Převést/Resync/Přiřadit)
2. **Work Queue „Vyžaduje pozornost"** — operační workspace, klikatelné karty s počty problémových transakcí (viz níže)
3. **Top summary banner** (zelený) — Zůstatek celkem CZK + EUR + trend % vs. minulý týden + počet účtů
4. **AutoSyncBar** — status (Aktivní) + interval 15 min + Poslední/Příští sync + CTA **„Aktualizovat banku"** (v3 s28: klik simuluje stažení dat z banky; kolonka API odebrána)
5. **Karty účtů — 2 sekce**: Konsolidované účty (multi-venue) + Účty provozoven (single-venue + unassigned); grid `col-12 col-sm-6 col-lg-4 col-xl-3`
6. **Tabulka transakcí** — full-width default, **zúží se na col-xl-8 jen po výběru** transakce
7. **Side-panel detail transakce** (sticky right column, fixní hlavička) — záložky Párování/Detail/Komunikace/Historie, viz níže
8. **Drawer detail účtu** (offcanvas vpravo, ~540px) — klik na celou kartu → otevře drawer

### Work Queue „Vyžaduje pozornost"
- Klikatelné karty ve 2 skupinách (K vyřešení / K přehledu), zobrazí se jen pokud count > 0:
  - 🔴 S chybou (error) · 🟠 Bez VS · ⚪ Bez provozovny (K vyřešení)
  - 🟡 Nespárované celkem (unpaired) · 🔵 Delegované · Čekající na kontrolu (K přehledu)
  - _(v3 s28 odstraněny karty „v bance neuhrazené" a „transakcí s návrhem")_
- Brand border-top `--prov-color`, karty 2 sloupce na xl
- **Klik na kartu** = atomická operace: aktivuje filter na tabulce + **auto-vybere první matching transakci** + scrollne k tabulce/panelu → uživatel se ocitne přímo v akční zóně
- Druhý klik (nebo „Zrušit filtr ×") deaktivuje
- State: `activeQueue: WorkQueueKind | null` v BankaView
- `mergedAllTransakce` propaguje lokální patche do počtů karet (po Potvrzení kandidáta se count okamžitě sníží)

### Side panel transakce — záložky (v3 s28, sjednoceno s Fakturami)
**Fixní hlavička (mimo scroll)**: typ badge + stav badge + dodavatel + **částka + datum** + close — vždy vidět, ke které transakci panel patří. Pod tím **kontextové alerty**: žlutý feedback po akci (auto-dismiss 2.5s) / bez VS / bez provozovny / chyba zpracování.

**Nav-tabs (Párování první — primární akce v Bance):**
1. **🔗 Párování** (default) — akční zóna kontextová podle stavu:
   - **paired** → zelený „Napárováno" + Otevřít fakturu (cross-section) + Unpair
   - **manual-paired** → info (důvod + poznámka + **rozdělení na provozovny**) + „Vrátit do nespárovaných"
   - **unpaired** (needsAction):
     - **Interní převod** auto-detekce (schválit)
     - **Napárovat ručně** (`<datalist>` autocomplete) + volitelný collapse **„Rozdělit na provozovny"** (`ProvozSplitEditor`, showUcel=false)
     - **Vystavit novou fakturu** (jen příchozí) → mock `FA-2026-XXXX`
     - **Přidělit uživateli** (delegace) + rychlé CTA (poplatek / splátka úvěru / vytvořit TP)
     - **„Nelze napárovat? → Mimo systém"** → inline form: důvod (`OUTSIDE_REASONS`) + **`ProvozSplitEditor` (showUcel=true)** + poznámka
   - _(v3 s28: „Navržení kandidáti" s match score odstraněni — u banky nedává smysl částečná shoda)_
2. **📄 Detail** — VS, datum, účet+IBAN, provozovny, protiúčet, ruční důvod + **rozdělení na provozovny**
3. **💬 Komunikace** — poznámky (žluté bubliny) + vstup
4. **🕐 Historie** — audit timeline (tečka + ikona + text)

### Rozdělení platby na provozovny (`ProvozSplitEditor` + `splitStatus`)
- Sdílená komponenta pro 2 toky (ruční párování na fakturu / „Mimo systém") — jedna platba může patřit na víc provozů
- Řádky **provoz + částka + volitelný účel** (`ucel` — např. „mzdy", „hotovost do kasy"; u párování na fakturu skrytý), „+ Přidat provoz", 🗑 odebrat
- **Prefill** single-venue účtu (provoz + celá částka), živý souhrn „Rozděleno X/Y · Zbývá/Sedí ✓"
- **Validace**: Potvrdit blokováno dokud součet nesedí přesně na celou částku transakce
- Výsledek uložen do `transakce.rozdeleni`, zobrazen v kartě „Spárováno ručně" + Detailu + auditu

### Sticky / scroll panelu (v3 s28)
- Panel = **flex sloupec s max výškou** (`maxHeight: calc(100vh - topbar - 32)`, `overflow: hidden`): **hlavička fixní**, scrolluje jen obsah pod ní (vlastní `overflowY: auto` div, `overscrollBehavior: contain`)
- Wrapper `position: sticky; top: calc(var(--bs-topbar-height, 100px) + 16px)`

### Master-detail sticky tabulky (v3 s28)
- Skutečný scroll kontejner je **`.page-content`** (`overflow-y: auto`), ne okno
- Filtr-hlavička tabulky `position: static` (odscrolluje), **hlavička sloupců + vybraný řádek sticky** relativně k `.page-content` → vybraná transakce zůstává vidět i při scrollu stránky
- CSS: `.banka-trans-table thead th { top: 0 }` + `.banka-row-selected > td { top: 41px }`; `.table-responsive` overflow:visible

### Důvody pro označení (konstanty v BankaView)
- `OUTSIDE_REASONS` (6): interní převod, vratka zákazníkovi, osobní výběr majitele, vedeno v jiné evidenci, **bez faktury (poplatek/mzda/daň)**, jiný důvod
- `NO_INVOICE_REASONS` (7): bankovní poplatek, úrok, pojištění, mzda, daň/odvod, pokuta, jiné _(nevyužité v UI po sloučení „Bez faktury" do „Mimo systém")_

### Karta účtu — kompaktní layout (BankaCard / UcetCard)
- **Brand color border-top**: 1 provoz → barva té branche, multi → Con Gusto gold `#c9911a`, žádná → šedá `#9097a7`
- **Hover efekt**: `translateY(-2px)` + cursor pointer
- **Header (kompaktní)**: jméno + měna badge + stav badge (zkrácený label, plný v `title` tooltipu) → IBAN + „před X min" → banka
- **Balance** ve formátu `Účetní bilance: 261 772,24 Kč` + `Dostupní prostředky: ...` (jako ve starém systému)
- **Sparkline** — 37 bodů (30 minulých solid + dnes circle + 7 budoucích dashed), area fill 0.08 opacity
- **Predikce čísla** — `Týden: 845 200 Kč` + `Měsíc: 920 100 Kč ↑` (barva dle isPredikceUp)
- **Provozovny badges** — max 5 viditelných + „+N dalších" s tooltipem (jinak by Hlavní účet s 15 branches zabíral hodně místa)
- **Akční tlačítka** (jen pro problémové): Převést / Resync (s `.spin` animací) / Přiřadit

### Akce (4 typy) — všechny mají vlastní handler v BankaView
- **🔄 Převod mezi účty** (modal): Z účtu (default Hlavní) → Na účet (pre-fill z alertu) → Částka → Datum → Poznámka. Validace: stejný účet, dostatek prostředků. Po submit: bilance se opravdu změní v UI, toast „Převod odeslán"
- **♻️ Re-sync** (inline): Klik → ikona se točí 2s → `localUcty[id] = { syncStav: 'synced', stav: 'ok' }` → alert zmizí, toast
- **🏷️ Přiřadit provoz** (modal): tlačítkový grid 15 aktivních provozoven s checkbox toggle → uložení změní `localUcty[id].provozovny` → účet se případně přesune mezi „Konsolidované" / „Účty provozoven"
- **📊 Detail účtu** (drawer/offcanvas): velká sparkline + provozovny + akce + posledních 10 transakcí pro daný účet

### State pattern (BankaView)
- `localUcty: Record<string, Partial<BankaUcet>>` — session-local změny účtů (převody, přiřazení, resync)
- `mergedUcty = filteredUcty.map(u => ({...u, ...localUcty[u.id]}))` — komponenty pracují s merged daty
- `localTrans: Record<string, Partial<BankaTransakce>>` — session-local změny transakcí (manual match, outside, no-invoice, audit, notes)
- `getMergedTrans(t)` — aplikuje patch + appenduje `auditLog` a `notes` (nepřepisuje)
- `mergedAllTransakce` propaguje patche do Work Queue counts + tabulky + KPI
- `selectedTrans` se hledá v `mergedAllTransakce` (NE filtered) → panel nezmizí po akci, která přesune transakci mimo aktivní filter
- `activeQueue: WorkQueueKind | null` — aktivní karta Work Queue
- `syncingIds: Set<string>` — který účet právě syncuje
- `detailUcetId` — který účet má otevřený drawer
- `modalState: { type: 'prevod' | 'prirazeni', targetId? }` — state machine pro modaly
- `highlightedUcetId` — žluté pulzování karty po kliknutí na alert chip
- `ucetRefs: Map<string, HTMLDivElement>`, `transTableRef` — refs pro scroll-to-card / scroll-to-tabulka
- `toast: string | null` — fixed-position notifikace v pravém horním rohu (3s timeout)
- Helpers `pushTransAudit(id, entry)`, `pushTransNote(id, note)`, `patchTrans(id, patch)` — atomic updates s appendem

### CSS (custom.css)
- `.banka-card-highlight` + `@keyframes banka-pulse` — žluté pulzování karty (2 pulzy 1s každý) po scroll-to-card z alertu

### Responzivita (laptop 1366×768)
- Card grid `col-12 col-sm-6 col-lg-4 col-xl-3` → 3 karty per row na 1366px (lg)
- Stav badge labels: zkrácené (`Kritický` místo `Kritický zůstatek`) + plné v title attr
- Predikce: `Týden:` / `Měsíc:` místo „Konec týdne (19.4.):"
- Alert chipy mají `text-nowrap` aby se nelomily napůl
- AutoSyncBar: zkrácené texty + `flex-wrap row-gap-2`

## Kód (KodView) – podklady pro kodéra

Samostatná podstránka v sidebaru → **Dev → Kód** (`selectedSection: 'kod'`).

### Účel
Příprava backend implementace pro vývojáře pracujícího v jiném stacku. Aktuálně obsahuje dva segmenty
ze sekce Tržby (`Tržby detail` a `Vývoj tržeb`) přepsané do:
- **PHP 8.2+** + **Laravel 11+**
- **Livewire Volt** (single-file komponenty — `new #[Defer] class extends Component { ... }` + Blade v jednom `.blade.php` souboru)
- **Alpine.js 3** (klientská interaktivita — ApexCharts inicializace + tooltip)
- **ApexCharts** (graf vývoje tržeb, npm/CDN)
- **plain JavaScript + plain CSS** (žádný React/Vue/Tailwind/SCSS)
- **Eloquent ORM** — `Branch` + `DailyClosingRow` (žádné mock generators, žádné slugy)

### Datový model (kodérova konvence)
- `Branch` (Eloquent model, `branches` table: id, name, color)
- `DailyClosing` (`daily_closings`: id, branch_id, date)
- `DailyClosingRow` (`daily_closing_rows`: id, daily_closing_id, type_id, value)
- `DailyClosingRow::SALES` — generická tržba (provoz bez K/B rozlišení)
- `DailyClosingRow::SALES_K` — tržba **kuchyně** (single-venue mód)
- `DailyClosingRow::SALES_B` — tržba **baru** (single-venue mód)
- `DailyClosingRow::SALE_MANUAL` — manuálně dorovnaná tržba
- **Multi-tenancy:** `auth()->user()->activeBranch()` + `mainBranchGet()` (main branch = vidí všechny, jinak jen sebe)
- **Helper:** `formatMoney($value, false)` — globální (asi `app/helpers.php`, druhý arg `false` = bez haléřů)
- **Custom Blade komponenta:** `<x-input label="..." wire:model="..." type="..." wire:input="..." margin="..." />`

### Struktura stránky
1. **Header** s badges: PHP 8.2+ · Laravel 11+ · Livewire Volt · Alpine.js 3 · **ApexCharts** · Eloquent · CSS
2. **Info banner** (modrý) — cíl, stack, vysvětlení Volt + Eloquent + styl podle vzoru
3. **Vyřešené body** (zelený alert) — 6 bodů po feedbacku od kodéra
4. **Skupina 1 — Tržby detail** — náhled mock tabulky s brand color border-top + accordion s Volt komponentou
5. **Skupina 2 — Vývoj tržeb** — náhled grafu (5:1 aspect) + accordion s Volt komponentou + Alpine.js (ApexCharts)
6. **Skupina 3 — Sdílené** — CSS + Routing/layout

### 5 sekcí v accordionu
- `1` — Tržby detail: `resources/views/livewire/trzby-detail.blade.php` (Volt, brand color, live tečka, K/B split)
- `2` — Vývoj tržeb: `resources/views/livewire/vyvoj-trzeb.blade.php` + `resources/js/vyvoj-chart.js` (Volt + ApexCharts)
- `3` — Vývoj tržeb: rozšíření „Všechny provozy" (patch existující komponenty — 4 změny v PHP + 1 v Blade, nepřepisuje původní)
- `4` — CSS: `resources/css/trzby.css`
- `5` — Routing + layout: `routes/web.php` + `resources/views/trzby/index.blade.php` (s ApexCharts CDN)

### Vyřešené technické body (po feedbacku kodéra)
1. **Kuchyň/Bar split** — query rozšířena o `SALES_K` + `SALES_B`, indexace `[branchId][dateKey][typeId]`. Single-venue tabulka má sloupce **Datum · Kuchyň · Bar · Celkem** (modrá / zelená).
2. **Historické agregace** — `loadChartData()` obalená v `Cache::remember(...)` s TTL 1h, klíč obsahuje `mode:period:year:month:branchIds`. Pro budoucí monthly_summaries tabulku TODO komentář.
3. **Rok vzniku provozovny** — `branches.opened_at` neexistuje, fallback `MIN(daily_closings.date)` přes `DB::table()->min('date')` s 24h cache (`vyvoj-trzeb:min-date:branchIds`).
4. **Brand barvy** — `public string $brandColor` property v Volt komponentě. V `mount()`: `#c9911a` pro main/multi-venue, `$branch->color` pro single. V Blade: `style="--prov-color: {{ $brandColor }}; border-top: 3px solid var(--prov-color);"`.
5. **Live tečka** — `.trzby-live-dot` (CSS pulse animace v `trzby.css`). V Blade: `@if($day['isToday']) <span class="trzby-live-dot"></span> @endif`.
6. **ApexCharts + plná šířka** — SVG kompletně odstraněn. Volt vrací `chartData()` jako JSON (`{categories, series, subtitle}`), Alpine.js inicializuje chart přes `window.vyvojTrzebChart(initialData)`. Smooth curve, gradient fill (0.25→0.02 opacity), dark tooltip, width 100%, responsive breakpoint 768px. Livewire eventy → `chart.updateOptions()` přes window CustomEvent.

### Náhledy v KodView.tsx (mock React komponenty)
- `TrzbyDetailPreview` — mock tabulka 5 dní × 5 provozoven, sticky cols, live tečka, brand color border-top přes `var(--prov-color)`
- `VyvojTrzebPreview` — SVG mock graf (5:1 aspect ratio přes **padding-bottom 20% trick** — bullet-proof pro full-width), brand color border-top, hover tooltip
  - **Důležité:** preview je v SVG (ne ApexCharts) kvůli demonstraci v React projektu. Aspect ratio container používá padding-bottom procentní trick (NE CSS `aspect-ratio` property — ta se v některých layoutech nerespektuje a graf zůstával centrovaný).
- Mock data: `PREVIEW_PROVS` (5 provoz), `PREVIEW_ROWS` (5 dní), `CHART_DATA` (3 linie × 5 let)

### Klíčový princip
**TrzbyView.tsx zůstává nedotčený** — náhledy v KodView jsou nezávislé mock komponenty s vlastními daty a state.

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

| selectedSection | Komponenta | Sidebar skupina |
|---|---|---|
| `dashboard` | DashboardView | Přehled |
| `provozovny` | ProvozovnyView | Přehled |
| `trzby` | TrzbyView | Ekonomika |
| `zavierky` | PlaceholderView | Ekonomika |
| `faktury` | FakturyView | Ekonomika |
| `pohledavky` | PohledavkyView | Ekonomika |
| `cashflow` | CashflowView | Ekonomika |
| `banka` | BankaView | Finance |
| `trvale-prikazy` | TrvalePrikazyView | Finance |
| `uvery` | UveryView | Finance |
| `poplatky` | PoplatkyView | Finance |
| `dane` | DaneView | Finance |
| `karty` | PaymentPlatformView (terminal) | Finance |
| `qerko` | PaymentPlatformView (qerko) | Finance |
| `gopay` | PaymentPlatformView (gopay) | Finance |
| `sodexo` | PaymentPlatformView (sodexo) | Finance |
| `platby` | PlatbyView | Finance |
| `reporty` | PlaceholderView | Systém |
| `nastaveni` | NastaveniView | Systém |
| `komponenty` | ComponentReference | Dev |
| `kod` | KodView | Dev |

## Kontext projektu

Wireframe vznikl jako interní demo pro vedení firmy Con Gusto.
Primární kontakt: Petr Dohnal (vedení).
Referenční datum: **2026-04-17** (čtvrtek), týden 13.4.–19.4.2026.
Piazza otevřena 2006 (potvrzeno majitelem).

### Session log
- **v3 s38**: **Faktury přijaté — detail jako overlay okno + kompletní faktury dolů (zápis 22. 7. 2026)**. Práce v `FakturyView.tsx` + `FakturySidePanel.tsx` + `FakturyTable.tsx` + `custom.css`. ① **Detail jako overlay (offcanvas zprava)** — tabulka je nově **vždy full-width** (`col-12`), detail se vysune jako fixní overlay vpravo (**560 px** desktop, **100 %** pod 992 px) přes poloprůhledný backdrop. Zavření: **×** v hlavičce · klik na backdrop · **Esc**. Odstraněn původní 2-col grid (`col-xl-7/col-xl-5`). CSS `.faktury-overlay-backdrop` + `.faktury-overlay-panel` (slide-in animace). ② **Overlay začíná pod hlavičkou „Přehled faktur"** — ta zůstává nad ním. `top` overlaye se **dynamicky měří** ze spodní hrany sticky `.card-header` tabulky (`tableColRef`), aby seděl i při scrollu (drží se na topbar+~55 px, když se hlavička přilepí). **Pozice se píše imperativně na DOM přes ref** (`overlayPanelRef`/`overlayBackdropRef`, `style.top`) uvnitř `requestAnimationFrame` → **žádný re-render při scrollu** (dřívější `setState` na scroll překresloval celý view → sekalo se). ③ **Sticky flush hlavička detailu** — panel má `padding: 0` (dřív 16 px způsobovalo, že se sticky hlavička lepila 16 px pod horní hranu a v tom proužku prosvítal rolující obsah). `.card-header` v panelu je sticky `top:0` s jemným stínem → identita faktury (název + stav) drží nahoře, obsah roluje čistě pod ní. ④ **Ikonový cluster s popisky v hlavičce** — do sticky hlavičky přidány chipy **s ikonou i textem** (dle rozpisu kolegyň): stav · párování se Septimem · **druh platby** (`ZPUSOB_META` zduplikováno z FakturyTable — Hotově/Kartou/Převodem/Zápočtem/Zálohovou fakturou/Stravenkami, barva šedá/zelená/modrá dle úhrady) · **dokument** (přiložen/bez) · **zámek** (Uzamčeno). Import `getZpusobUhrady` + typ `ZpusobUhrady`. ⑤ **Vrácené záložky** — po zpětné vazbě („my už to tak měli") obnoveny nav-tabs **Detail / Párování / Komunikace / Historie** (dočasně byly rozbalené pod sebou). Každá sekce zase zagátována `activeTab === '…'`; tab lišta pod sticky hlavičkou. ⑥ **Kompletní faktury zeleně + dolů** — nový helper `isComplete(f)` v FakturyTable (**uhrazená/zaplacená** = prošlo schválením **A** párování se Septimem = **spárovaná**). Takové řádky: **zelené pozadí** `#e6f7ec` + **stabilně seřazené na konec** seznamu (`baseSorted.sort((a,b) => isComplete → dolů)`, JS stable sort zachová řazení uvnitř skupin). V mock datech splňuje zatím 1 faktura (Metro AG FAK-2026-0035). _(TODO rozhodnout: počítat i uhrazené bez DL jako kompletní? legenda „zelená = kompletní"? tab lišta přišpendlit?)_ Build OK ~951 KB JS bundle. **Zbývá pro Přijaté**: zjednodušení filtru (stav jako zaškrtávací dropdown). Souhrn zbývajících sekcí beze změny: Daně (DUZP z formuláře), Vydané, Banka, Úvěry, Trvalé příkazy.
- **v3 s37**: **Faktury přijaté — velký UI overhaul dle feedbacku kolegyň + suroviny/režie + stav „Částečně schválená" (zápis 21. 7. 2026)**. Dvě části: **(A) Suroviny vs. režie + částečné schválení**: ① `fakturaPolozkyUtils.ts` — položky mají `druh: 'surovina' | 'rezie'` (`PolozkaDruh`); zboží obsahuje mix (potraviny=suroviny + obaly/doprava=režie), ostatní kategorie=režie. ② Nový stav **`castecne-schvalena`** ve `FakturaStavPlatby` (doplněn do STAV_META v FakturyTable/FakturySidePanel/PlatbyDetailPanel/FakturaDetailDrawer + STAV_ORDER + STAV_CHIPS). Význam: suroviny auto-schváleny z DL (Septim), režie čeká na účetní. ③ **FakturySidePanel** — sekce „Položky — suroviny vs. režie" (zelený box auto-schváleno / oranžový box schvaluje účetní + souhrn částečného schválení); `isAprovable` zahrnuje `castecne-schvalena`. ④ Kompaktní upozornění „Režie čeká na účetní"; demo fp21 Makro → `castecne-schvalena`. **(B) Přijaté faktury — přehled dle rozpisu kolegyň** (hlavně `FakturyTable.tsx` + `FakturyView.tsx`): ① **Jednořádkový systém** — odstraněn hromadný výběr (checkboxy / „Vybrat vše" / bulk toolbar); buňky zploštěny na 1 řádek (dodavatel bez VS podřádku, splatnost bez „PO SPLATNOSTI", stav nowrap). ② **Nové/upravené sloupce**: **Typ** (barevná zkratka dle formy + typu — přijaté FAP/ODDP/ZFAP/JINP, vydané FAV/ODDV/ZFAV/JINV; `dokladZkratka()`), **VS** primárně (číslo faktury jen drobná poznámka „č. …" když se liší), **Datum vystavení**, **DUZP** (nové pole `FakturaPlatby.duzp?`, fallback = datum vystavení), **celé datum s rokem** (`fDateFull` v data.ts). Odstraněn samostatný sloupec Párování + štítky formy u názvu. ③ **Ikonový systém stavů** (`STAV_ICON` + `ZPUSOB_META` + `rowBgForStav`): **stav jako ikona** (mdi:check-bold zelená fajfka = schválená/v-bance — fajfka u „v bance" zůstává jako kontrola, že platba v bance JE schválená; mdi:exclamation-thick červený výkřičník = v-bance-neuhrazená); **druh platby** (fa6-solid: sack-dollar/credit-card/building-columns + right-left zápočet / file-invoice-dollar zálohovka / ticket stravenky) — barva **šedá=neuhrazeno / zelená=uhrazeno / modrá=jen převod v bance**; **dokument** vždy viditelný (zelený=přiložen, šedý=bez); **párování „S"** se Septimem (zelená/oranžová/šedá) + **DUP** (duplicitní DL). **Barevný řádek** jen: oranžová (čeká na schválení), fialová (pozastavená), červená (po splatnosti, neuhrazená). Nové pole `FakturaPlatby.zpusobUhrady?` (`ZpusobUhrady`) + helper `getZpusobUhrady()` (zatím náhodně/dle formy; produkčně značí kolegyně). Ikony ~+25 % velikost. ④ **CTA „Nová faktura" vpravo nahoře** — hlavička sekce = flex-between (Typ dokladu tabs vlevo + kontextové CTA vpravo). ⑤ **Filtry** — Řádek 1 (Hledat · Vyhledat podle · Seřadit podle · Seřadit), Řádek 2 (Rychlý výběr · Datum od/do · Podle · Obsahuje náklad), Řádek 3 (**Částka od/do** + **multi-checkbox Stav** — chipy `STAV_CHIPS`/`STAV_CHIPS_VYDANE`). _(TODO: kolegyně chtějí filtr ještě zjednodušit — stav jako zaškrtávací dropdown, min. klikání.)_ ⑥ **Přehled ukazuje i uhrazené** (`showZaplacene={true}`) — aby byla vidět zelená ikona úhrady. **Zbývá pro Přijaté**: detail v overlay okně (× + rolování celého panelu), zjednodušení filtru. Build OK. Souhrn zbývajících sekcí: Daně (DUZP z formuláře), Vydané (bez schvalování/párování + položky na provozovny + práva), Banka (barevné ikony + párování do Platby), Úvěry (hlavička/křížek/scroll), Trvalé příkazy (propis do Plateb na pozadí).
- **v3 s36**: **Úvěry — pole „Stav" skryté u nového úvěru (zápis 14. 7. 2026)**. V `UverFormModal` (`UveryView.tsx`) se pole **Stav** (Aktivní/Splacený/Předčasně splacen/Pozastaven) zobrazuje **jen při editaci** (`{isEdit && ...}`). Nový úvěr je vždy „Aktivní" (výchozí `defaults.stav = 'aktivni'`), takže volba „Splacený" při zakládání zmizela — dle zápisu z porady. Build OK ~934 KB JS bundle.
- **v3 s35**: **Faktury — rychlý výběr období + sekce Daně v horním výběru (zápis 14. 7. 2026)**. Práce v `FakturyView.tsx`. ① **Rychlý výběr období ve filtrech** — nový select **„Rychlý výběr"** jako první pole Řádku 2 filtrů (stejné předvolby jako Tržby detail: `DATE_PRESETS` = Dnes/Včera/Aktuální týden/Minulý týden/Aktuální měsíc/Minulý měsíc/Aktuální rok/Minulý rok; ref. datum 2026-04-17). Výběr vyplní pole **Od**/**Do**; ruční změna data → select spadne na „— Období —". **Všechny stávající filtry zůstávají** (jen přidané pole), Řádek 2 sladěn na 5× `col-md` (Rychlý výběr · Od · Do · Podle · Obsahuje náklad). ② **Sekce „Daně" v horním výběru (jen Přijaté)** — do tab baru Typ dokladu přidána 6. záložka **Daně** (cyan, ikona `bill-check`, počet = `DANE.length`). Zobrazuje se jen u přijatých (`fixedTyp === 'prijata' || !fixedTyp`); při přepnutí na vydané se `daneMode` vypne (useEffect + tab switcher). Import z `daneData.ts` (`DANE`, `DAN_TYP_META`, `DAN_STAV_META`, `PRAVNI_ENTITA_DAN_LABEL`, typy `DanTyp`/`PravniEntitaDan`). Nový state `daneMode`, `novaDane`, `novaDaneSchvalovatele`, `novaDaneDocument`; ViewMode rozšířen o `'new-dane'` (+ `showNovaDane`/`setShowNovaDane`). ③ **V režimu Daně** — obsah faktur (upozornění + filtry + tabulka) zabalen do `{!daneMode && (...)}`; místo něj **seznam daňových dokladů** (`{daneMode && ...}`): tabulka Druh daně (ikona+popis) · Období · Splatnost · Právní entita · Částka · Stav (badge z `DAN_STAV_META`), filtrovaná dle vybrané provozovny (`provozovnaId === selectedProvozovna || bez provozovny`). Patička: „Daňové doklady vstupují jako Ostatní platby — po schválení se odešlou do banky". CTA se mění na **„Přidat daňový doklad"**. ④ **Formulář „Nový daňový doklad" (`showNovaDane`, ve stylu Nová přijatá faktura)** — page-title-box „← Zpět na seznam" + hlavička „Vytváření dokladu — Daň"; pole: Druh daně (7 typů z `DAN_TYP_META`) · Zdaňovací období · Právní entita · Nákladové středisko (provozovna / „Celá firma / Office") · Částka · VS · DUZP · Splatnost · Popis; Přiznání/dokument (upload placeholder); Účet na platbu (`BANKOVNI_UCTY`); **Schvalovatelé** (stejné chipy jako u přijaté faktury, `novaDaneSchvalovatele`); CTA „Přidat doklad a přejít na seznam" / „Přidat doklad a schválit" (obě → zpět na seznam Daně). Naplňuje bod ze zápisu „Ostatní platby (daně) evidované ve fakturách". `fDate` doplněn do importu z `../data`. Build OK ~934 KB JS bundle.
- **v3 s34**: **Faktury — sidebar cleanup + zjednodušené filtry + nové sloupce + schvalovatelé + kompaktní upozornění (zápis 13. 7. 2026)**. Práce v `Sidebar.tsx` + `FakturyView.tsx` + `FakturyTable.tsx` + `custom.css`. ① **Sidebar — parent „Faktury" NEKLIKATELNÝ** — jen skupinová hlavička (`div.nav-link.sidebar-parent-label`, `cursor:default`, `opacity:0.68`); routují jen children Přijaté/Vydané. Odstraněny `childIds`/`isAnyChildActive`. Nový CSS `.sidebar-parent-label` (hover/focus transparent, cursor default). ② **Zjednodušené filtry (dle reference)** — komplexní filter bar (5 řad: presety / search+kategorie+částka / stav chips / párování chips / forma chips) nahrazen **2řádkovým gridem**: Řádek 1 = **Hledat · Vyhledat podle** (Čísla faktury/Dodavatele/VS) **· Seřadit podle · Seřadit** (Od nejnovějších/nejstarších → `sortBy`/`sortDir` napojené na FakturyTable) **· Stav úhrady** (Všechny/Uhrazené/Neuhrazené/Po splatnosti → `STAV_UHRADY_OPTIONS` mapuje na set `FakturaStavPlatby`). Řádek 2 = **Od · Do** (`datumOd`/`datumDo`) **· Podle** (Datum vystavení/splatnosti) **· Obsahuje náklad** (`kategorieFilter`). Nový state `searchBy` / `stavUhrady` / `datumPodle`. Odebrány: uložené presety, chip multiselecty (stav/párování/forma), rozsah částky — state ponechán (default prázdný, dál se předává do FakturyTable). ③ **FakturyTable — 2 nové sloupce**: **Číslo faktury** (`f.cislo`, řaditelný `col="cislo"`) + **Datum vystavení** (`f.datum`). Pořadí: Dodavatel · Číslo faktury · Datum vystavení · Provoz · Splatnost · Částka · Stav. Číslo přesunuto z podřádku pod dodavatelem (tam zůstal jen VS). ④ **Schvalovatelé přijaté faktury** — v detailním formuláři Nová přijatá faktura (nad 3 CTA) nová karta **„Schvalovatelé faktury"**: multiselect toggle chipů (avatar + jméno + role/provoz) z `SCHVALOVACI_OSOBY` (bez fakturanta), lze vybrat víc osob — **stačí schválení kohokoli → faktura jde k úhradě**. Nový state `novaFaSchvalovatele: string[]`. Jen u přijaté (u vydané se neschvaluje). ⑤ **Kompaktní upozornění nad tabulkou** — ve stejném duchu jako Banka/Trvalé příkazy, ale **ne přes celou šířku** (řádek `d-flex flex-wrap gap-2` klikatelných karet, `min-width 220`, barevný levý okraj + ikona v kruhu + počet + label): **Neuhrazené dobropisy** (červená) · **Neuhrazené zálohové** (oranžová) · **Zálohové bez finální faktury** (fialová — uhrazené proformy bez navazující řádné faktury) · **Pozastavené faktury** (amber). Klik → nastaví odpovídající filtr (forma + stav úhrady). **Reflektuje horní lištu Typ dokladu** — každá karta má `forma` a zobrazí se přes `formaTab === 'all' || c.forma === formaTab` (Vše=vše, Dobropisy=jen dobropis, Zálohové=zálohové 2 karty, Faktury=pozastavené, Jiné=nic). Karty se ukážou jen když count > 0; respektují vybranou provozovnu i přijaté/vydané. Build OK ~930 KB JS bundle.
- **v3 s33**: **Banka + Trvalé příkazy — horní pole na sdílený KpiBox (zápis 13. 7. 2026)**. Čistě design sjednocení (jako Úvěry/Poplatky/Karty). ① **Banka `SimpleMetrics`** — 2 avatar-karty → 2× `KpiBox` (Nespárované platby · Ručně spárované platby; col-md-6). ② **Trvalé příkazy `KpiStrip`** — 3 avatar-karty → 3× `KpiBox` (Aktivní příkazy + footer „Celkem evidováno" · Měsíční zátěž + footer „Ročně" · Nezaplacené splátky s alert + icon badge + klik→filtr; col-md-4). KpiBox importován do obou. Vzhled KPI polí je teď jednotný napříč Úvěry / Poplatky / Karty / Banka / Trvalé příkazy (plochý box, velká ikona + nadpis, hodnota, sub, footer). Build OK ~930 KB JS bundle.
- **v3 s32**: **Platební karty zjednodušení výpisu + Úvěry PRIBOR obrácený kalendář (zápis 13. 7. 2026)**. **A) Platební karty (`PaymentPlatformView`) — zjednodušený párovací výpis**: tabulka z 10 na 7 sloupců — **Datum · Provozovna · Tržba POS · Úhrada (banka) · Provize · Ověření s bankou · Poznámka**. Sloupec **„Úhrada (banka)"** má **detaily z úhrady** (částka + datum připsání D+1 + reference bankovní transakce `parovanaSBankaTrans`). „Stav" + „Banka" sloučeny do jednoho **„Ověření s bankou"** (✓ V bance / ⏳ Čeká na úhradu / ⚠ Nedorazilo / ⚠ Nesedí) — vychází ze `stav`, `reconciled` prop z DailyTable odebrán. Odstraněny sloupce Provize odhad + Δ odhadu + info-poznámka o výpočtu provize. **B) Úvěry (`uveryData.ts` + `UveryView.tsx`) — PRIBOR „obrácený" kalendář**: ① `generateUverSplatky` + `buildUverSplatky` dostaly **PRIBOR větev** (`pribor`/`isPribor`) — **jistina rovnoměrně** (jistinaCelkem / počet), **úrok jen u už uhrazených** splátek (dopočtený z úhrady = zbytekPred × sazba s mírnou variabilitou `(i%5-2)*0.15`), budoucí prázdný (0 → „—"). Mock uv01 (hypotéka) + uv03 (investiční) zapnuty `pribor=true`; fix uv02 zůstává anuita. ② Nové helpery `urokPct(s)` (dopočítané roční % = úrok/zbytekPred×12×100) + `prumernaSazba(u)` (průměr z uhrazených). ③ Tabulka splátek v modalu má nový sloupec **„% p.a."** (dopočítané úroku, — dokud není úhrada). ④ Side panel detail u PRIBOR: **„Průměrná dosud ≈ X % p. a. (ze splacených)"**. ⑤ **Detail úvěru — splátkový kalendář schovaný za CTA** „Detail — zobrazit splátky" (collapse `splatkyOpen`, default zavřeno; „Přegenerovat" až po rozbalení). Build OK ~930 KB JS bundle.
- **v3 s31**: **Platební karty / platformy — sjednocený KpiBox + reconciliation výpis s bankou (zápis 13. 7. 2026)**. Práce v `PaymentPlatformView.tsx` (generická → Karty/Qerko/GoPay/Sodexo). ① **KpiStrip přepsán na sdílený `KpiBox`** (jako Úvěry/Poplatky) — 4 boxy: Příjmy v červnu (footer Čistá po provizi) · Provize červen (footer Z hrubé tržby %) · Marže (po provizi) · K vyřešení (alert + icon badge). ② **Horní hlavička platformy (`PlatformHeader`) kompletně odstraněna** — byl to interní config (účet pro příjmy / provize % / D+N zpoždění / provozovny / metody), „jen pro nás". Nahoře teď jen 4 KPI čtverce (u GoPay navíc alert banner). Funkce PlatformHeader smazána. ③ **Párovací výpis vytažen přímo pod KPI** — tabulka „Denní párování (POS vs. příchozí D+1)" přesunuta hned pod čtverce. Přidán **filtr období Od–Do** (2 date pickery + × clear; filtruje `filtered` přes `datumOd`/`datumDo`). CTA **„Nahrát přehled"** v hlavičce tabulky (pro **všechny** platformy, ne jen non-API) — otevře upload modal (přejmenovaný z „Manuální import"). Odstraněna dlouhá info-poznámka o výpočtu provize. ④ **Reconciliation flow po nahrání přehledu** — nový stav `reconciled`. Po potvrzení uploadu („Nahrát a ověřit s bankou"): `merged` transformuje čekající (`ceka-na-D1`) záznamy → doplní `prislo` (skutečný příchozí) + provizi → `stav: 'sparovane'` (sloupec „Provize skut." se vyplní). Nový sloupec **„Banka"** (ověření): před = „○ Nezkontrolováno", po = **✓ V bance** (dorazilo) / **⚠ Nedorazilo** (neprislo) / **⚠ Nesedí** (rozdil). KPI „K vyřešení" klesne. Toast se souhrnem (skutečná provize + X/Y ověřeno s bankou). ⑤ **Sdílený KpiBox** — vedlejší úpravy z minula platí i tady (badge 18 px, value truncate). Build OK ~929 KB JS bundle.
- **v3 s30**: **Poplatky — sjednocený KpiBox + edit jen zařazení (zápis 13. 7. 2026)**. ① **KpiStrip přepsán na sdílený `KpiBox`** (jako Úvěry) — 4 boxy: **Tento měsíc** (badge trend ↑/↓ % · ↑=červená, víc poplatků=hůř · footer Minulý měsíc) · **Průměr / měsíc** (sub N měsíců · footer Celkem) · **Nejdražší typ** (hodnota = název typu s ikonou/barvou daného typu · sub % z celku · footer Za období) · **Záznamů celkem** (sub napříč N měsíci · footer Auto-detekováno X/Y). ② **KpiBox badge zvětšen na 18 px** (`.kpi-box-badge`) — stejně jako Tržby (`.trzby-box-badge`), na přání pro čitelnost procent. Kvůli tomu: `.kpi-box-value` dostal `overflow:hidden`+`text-overflow:ellipsis` (dlouhý název typu se ořízne, nepřeteče), a Úvěry „Ke kontrole" badge zkrácen na **icon-only** (delší text by při 18 px přerostl box). KpiBox badge má `d-inline-flex align-items-center` + `me-1` jen když má text. ③ **Editace poplatku — jen zařazení**: poplatky se stahují z Banky, takže **Datum · Účet · Částka jsou read-only** (šedé pole `bg-light` + `pointerEvents:none`, hodnota převzatá z banky). **Editovatelné zůstává jen Typ · Popis · Provozovna**. Odebráno pole **Poznámka** + info hláška „evidovaný z banky". `onSave` v edit režimu nechává `auto` beze změny (needitujeme bankovní pole → nepřevádí se na manuální). Build OK ~929 KB JS bundle.
- **v3 s29**: **Úvěry — sjednocený KpiBox + Nový/Detail úvěr + panel master-detail (zápis 13. 7. 2026)**. ① **Sdílený komponent `KpiBox.tsx` + generický CSS `.kpi-box`** — vizuál převzatý z Tržby (plochý světlý box: label+ikona vlevo nahoře, velká hodnota, sub, divider+footer badge). Cíl: jeden opakovaně použitelný KPI prvek napříč systémem (méně různých prvků). Props: `label / value / badge / sub / footer / icon / iconColor / onClick / alert`. **Úvěry KpiStrip přepsán** z avatar-karet na 4× `KpiBox` (Aktivní úvěry · Zbývající dluh · Měsíční splátky · Ke kontrole s alert badge). Ikona 28 px + label 15 px (na přání — čitelnost). ② **Nový úvěr — chybějící pole**: **VS (variabilní symbol)** + checkbox **„VS je variabilní"** (zaškrtnuto → VS se u každé splátky inkrementuje; odškrtnuto → stejný pro všechny) + **„Výše splátky (Kč)"** (editovatelné, prázdné = auto anuita, hint „Auto anuita ≈"). Nová pole `Uver.vs?` + `Uver.vsVariabilni?`. Generace splátek vytažena do sdílené fce `buildUverSplatky(f, today)`. ③ **CTA „Upravit úvěr" → „Detail úvěru"** (ikona dokumentu). Modal v edit režimu má dole **editovatelný splátkový kalendář**: scrollovatelná tabulka (#·Datum·Stav·Jistina·Úrok·Celkem), **klik na řádek** → inline edit (datum/jistina/úrok/stav), tlačítko **„Přegenerovat"** (regen z parametrů, s confirmem). Edit už kalendář nepřepisuje automaticky (chrání ruční úpravy). ④ **Panel po kliknutí na úvěr** — **splátkový kalendář z panelu odstraněn** (přesunut do modalu; odebrán inline edit + mimořádná splátka + nepoužitý stav). Hlavička s identitou úvěru **drží nahoře při scrollu** (přes globální `.card-header` sticky). ⚠️ **Poznámka k iteraci**: flex „fixní hlavička + scroll area" (jako Banka) v Úvěrech vykreslila prázdnou hlavičku → **vráceno na jednoduchou strukturu** (wrapper `maxHeight`+`overflowY:auto`, plain card). ⑤ **Přišpendlení vybraného řádku v tabulce ODLOŽENO** — generický CSS `.md-sticky-table` / `.md-row-selected` **přidán do custom.css pro budoucí použití**, ale v Úvěrech zatím NEAPLIKOVÁN: `overflow:visible` na `.table-responsive` způsobil vodorovné **přetékání** dlouhých názvů (`table-nowrap`) do panelu. TODO: zúžit sloupec „Název" (truncate), pak sticky zapnout. Build OK ~929 KB JS bundle.
- **v3 s28**: **Banka — UX iterace detailu transakce (zápis 13. 7. 2026)**. Práce jen v `BankaView.tsx` + `bankaData.ts` + `custom.css`. ① **Odebráno CTA „Nová platba"** z hlavičky tabulky transakcí (modal `NovaPlatbaModal` ponechán dormant). ② **AutoSyncBar** — přidáno CTA **„Aktualizovat banku"** vpravo (klik → spinner ~1,8 s → aktualizace „Poslední/Příští" sync + badge „Data aktualizována"; ve wireframu simulace stažení dat z banky), **odebrána kolonka API** (`apiCallsUsed`). ③ **Detail transakce sjednocen do záložek** (jako přijaté faktury) — nav-tabs **Párování / Detail / Komunikace / Historie** (Párování první = primární akce v Bance). Sloučená „Aktivita" rozdělena na **Komunikace** (poznámky + vstup) a **Historie** (audit). Hlavička (typ/stav/firma/částka/datum) + kontextové alerty zůstávají nad záložkami. State `activeTab` v `TransakceSidePanel`. ④ **Odstraněn koncept „V bance neuhrazená"** (`isOverdueAtBank`/`splatnost`) napříč Bankou — panel alert, Work Queue karta „v bance neuhrazené" + typ/filtr, tabulka (červený okraj + zvonek badge), mock data (tx06 Metro AG, tx13 Sodexo). Důvod: **v Bance jsou jen proběhlé transakce**; neuhrazené faktury patří do sekce Faktury. ⑤ **„Bez faktury" sloučeno pod „Mimo systém"** — CTA tlačítko odebráno, přidáno jako důvod v `OUTSIDE_REASONS` (nyní 6 položek). ⑥ **Odstraněni „Navržení kandidáti"** (match score / DOPORUČENO / Potvrdit-odmítnout) — u banky nedává smysl částečná shoda. Odstraněny handlery, Work Queue karta „transakcí s návrhem" + typ/filtr, import `SuggestedMatch`, `candidates` z mock dat (tx31/tx32/tx38 → běžné nespárované). Zůstává jednoznačný workflow: **Napárovat ručně** (VS/číslo faktury). ⑦ **Rozdělení platby na provozovny** — sdílená komponenta **`ProvozSplitEditor`** + helper `splitStatus()` + typ `ProvozSplitRow`. Použito jako **společný krok ve dvou tocích**: „Napárovat ručně" (volitelný collapse „Rozdělit na provozovny") i „Mimo systém". Každý řádek **provoz + částka + volitelný účel** (`ucel`; u ručního párování skryto, u Mimo systém zobrazeno — pokrývá „část mzdy / část hotovost do kasy"). Nové pole `BankaTransakce.rozdeleni?: Array<{provozovnaId, castka, ucel?}>`. **Prefill** single-venue účtu (provoz + celá částka). **Validace**: Potvrdit blokováno dokud součet nesedí přesně na celou částku (souhrn „Rozděleno X/Y · Zbývá/Sedí ✓"). Zobrazení výsledku v kartě „Spárováno ručně" + záložce Detail + auditu. Wheel-fix na `type=number` (blur při scrollu). ⑧ **Sticky/scroll fixy panelu** — panel přestavěn na **flex sloupec s max výškou**: hlavička (identita transakce) je **fixní mimo scroll oblast**, scrolluje jen obsah pod ní. ⑨ **Master-detail sticky tabulky** — filtr-hlavička tabulky `position: static` (odscrolluje), **hlavička sloupců + vybraný řádek sticky relativně k `.page-content`** (skutečný scroll kontejner s `overflow-y: auto`), aby vybraná transakce zůstala vidět i při scrollu stránky (CSS `.banka-trans-table thead th` top:0 + `.banka-row-selected > td` top:41px; `.table-responsive` overflow:visible). Build OK ~928 KB JS bundle.
- **v3 s1**: Redesign Tržby, historické grafy, multi-venue chart, breadcrumb nav
- **v3 s2**: UX polish Tržby (badge, predikce, grafy módy, detail řazení)
- **v3 s3**: Platby dashboard (stavy, audit, multi-účty, právní entity, smart alerts)
- **v3 s4**: Brand systém (--prov-color, brand hex kódy, ProvozovnyView, Acumin Pro)
- **v3 s5**: Topbar redesign (breadcrumb, prov-color accent, dynamická výška, sticky headers)
- **v3 s6**: Tržby UX (LIVE tečky per-venue, date presety, DnesKpiBox hodnoty)
- **v3 s7**: Dashboard aktualizace (nové KPIStrip Dnes/Včera/Týden/Měsíc, PlatbyKPIStrip)
- **v3 s8**: Platby UX – oddělovač tisíců (U+202F), czk-num třída místo font-monospace, celoplošný Acumin Pro, pozastavení s poznámkou, InvoicePreview, DalsiPlatbyPanel read-only, BalancePanel per-provozovna účty bez checkboxů, EUR účet Piazza, FutureRevMode jako { karty, odhad }, per-provozovna breakdown budoucích tržeb, auto-výběr schválených faktur, mock data pro 6 nových provozoven, dynamický getZustatek napříč dashboardem
- **v3 s10**: Sekce **Kód** (`/kod`) – podklady pro backend kodéra (PHP/Laravel 11+/Livewire v4/Alpine.js 3/plain JS+CSS). 3 skupiny: Tržby detail (mock tabulka 5×5 se sticky cols + live tečka + Livewire/Blade kód), Vývoj tržeb (interaktivní SVG graf s tooltipem + Livewire/Blade/Alpine kód), Sdílené (helpery `TrzbyHelper.php` s `detRand`/`smoothPath`/`fCzk(U+202F)`, CSS, routing). Accordion s „Kopírovat" tlačítkem, code v dark theme `<pre>`. TrzbyView.tsx nedotčen — `TrzbyDetailPreview` a `VyvojTrzebPreview` jsou nezávislé mock komponenty.
- **v3 s11**: Sekce **Kód** refaktor #1 — kodér chce vše inline v komponentě bez Helper/Support tříd. Smazány `app/Support/Provozovny.php` a `app/Support/TrzbyHelper.php` jako samostatné soubory. Všechna mock data (PROVOZOVNY, BASE_SPLIT, DOW_MULT, UCTY_MOCK, SEASONAL, FOUNDING_YEAR) + helpery (detRand, baseDay, getDowFactor, genDayData, genDayDataSplit, genD7Split, genMonthRevenue, genAnnualRevenue, smoothPath, fCzk, getDatesInRange) přesunuty do class body `TrzbyDetail.php` a `VyvojTrzeb.php` jako public metody (volatelné z Blade přes `$this->...`). Accordion redukován ze 7 na 6 sekcí (bez Sdílené helpery). Sed script + Python regex pro hromadné `TrzbyHelper::` → `$this->` replace v Blade konstantách (38 substitucí).
- **v3 s12**: Sekce **Kód** refaktor #2 — kodér poslal vzorovou `sales-sum.blade.php`, přechod na **Livewire Volt** + **Eloquent**. Class-based `app/Livewire/*.php` přepsány na **Volt single-file** (`resources/views/livewire/*.blade.php` s anonymní třídou `new #[Defer] class extends Component {}`). Žádné mock generators — query přes `Branch::all()` + `DailyClosingRow` (`SUM(value)` pro `type_id IN [SALES, SALE_MANUAL]`). `formatMoney($n, false)` místo `fCzk()`, `<x-input>` Blade komponenta místo standardních inputů, multi-tenancy přes `auth()->user()->activeBranch()` + `mainBranchGet()`. Accordion redukován na 4 sekce. Žluté otázky pro kodéra: K/B split, historické agregace, opened_at.
- **v3 s13**: Sekce **Kód** refaktor #3 — odpovědi od kodéra zapracovány. **Kuchyň/Bar split** přes `DailyClosingRow::SALES_K` + `SALES_B` (query rozšířena o `GROUP BY type_id`, indexace `[branchId][date][typeId]`, single-venue tabulka Datum/Kuchyň/Bar/Celkem). **Cache::remember** pro `loadChartData()` (TTL 1h, klíč s mode/period/year/month/branchIds). **MIN(daily_closings.date)** fallback pro `fromYear()` při `period='vse'` (24h cache). Vyřešené body z žlutého varování přesunuty do zeleného success banneru.
- **v3 s27**: **Phase 8.10 + 8.11 (zápis 22. 6. 2026) — Faktury rozdělení na podsekce + master UI cleanup + FakturyKPIStrip + forma selector**. ① **Sidebar restrukturalizace** — Faktury nyní jako parent s 2 sub-items: **Přijaté** + **Vydané**. Nové sekce v `SidebarSection` typu: `faktury-prijate` + `faktury-vydane`. Sidebar má **profesionální nested visuál** s tree-style connector (svislá čára + horizontální „přípojka", L-tvar u posledního dítěte, T-tvar u ostatních), active child má světlejší connector (45% opacity). Parent „Faktury" je klikatelný (otevírá kombinovaný pohled) + zvýrazní se i při aktivním dítěti. ② **FakturyView fixedTyp prop** — když je `fixedTyp='prijata'/'vydana'`, tab switcher (nav-tabs Přijaté/Vydané) se skryje + useEffect synchronizuje interní `typDokladu` při přepnutí v sidebar. AppShell routuje `faktury-prijate` → `FakturyView fixedTyp='prijata'`, totéž pro vydane. ③ **Master UI cleanup horní části** — odebráno: levá skupina Action baru (Období od/do + Entita filter), AutoStatusBar (Automatizace párování cron status řádek), všech 5 alert strips (Po splatnosti / Duplicity / Ke schválení / Splatné týden / Proformy bez finální). Obsah alertů přesunut do KPI čtverců níž. ④ **FakturyKPIStrip** (nová komponenta `FakturyKPIStrip.tsx`) — specifický KPI strip pro Faktury (4 karty): **Po splatnosti** (počet + suma, červená), **Nespárované** (počet, žlutá), **Neprovedené platby** (počet + suma, **kritická červená s glow ringem**, bílá ikona zvonku v plné červené avataru, světle červené pozadí, „⚠ Kritické"), **Schválené k úhradě** (počet + suma, zelená). Nahrazuje PlatbyKPIStrip ve FakturyView. PlatbyKPIStrip zůstává v DashboardView + PlatbyView. ⑤ **Datum filter (Splatnost od/do)** — nový pickers v dolním filter baru, vedle Částky. Defaultně prázdné = bez omezení. Když je vyplněné, filtruje tabulku podle splatnosti. × ikona pro vyčištění obou. `hasAnyFilter` + „Zrušit filtry" aktualizováno. Předáno do FakturyTable jako `datumOd`/`datumDo` props s odpovídající filter logikou. ⑥ **Přijaté podsekce — schované CTA** — tlačítka „Vystavit fakturu" + „Vystavit proformu" skryté při `fixedTyp='prijata'` (kolegyně z obchodu zadávají faktury od dodavatelů, nevystavují je). Zůstává jen „Přijatá faktura". ⑦ **Top-level forma selector pro Přijaté** — nad KPI čtverci nový segmented pill bar: **Vše / Faktury / Dobropisy / Zálohové faktury / Jiné** (5 pills s barevnou ikonou + počtem). Klik nastavuje `formaFilters`, KPI čtverce + tabulka **reflektují aktuální výběr**. ⑧ **Zálohové special** — v režimu Zálohové tab se 3. karta (Neprovedené platby) **automaticky vymění** za **„Nespárované zálohy"** (uhrazené proformy bez navazující řádné faktury, červená s glow, label „⚠ Vystavit řádnou fakturu"). FakturyKPIStrip detekuje `isZalohovaMode = formaFilters.size === 1 && has('zalohova')`. Build OK ~822 KB JS bundle. Souhrn: 5 sekcí „Připraveno k implementaci" (beze změny), Faktury sekce je **rozpracovaná** (UX iterace pokračuje), 1 dílčí „Rozpracované" (AutoSyncBar).
- **v3 s26**: **Phase 8.9 (zápis 22. 6. 2026) — Poplatky „Připraveno k implementaci" + odebrání CTA „Nový poplatek"**. ① **PoplatkyView** — odebráno CTA tlačítko **„Nový poplatek"** z hlavičky tabulky. Poplatky jsou nyní **read-only z pohledu vstupu** — vstupují výhradně z Banky (automaticky přes `detectTransType()` regex klasifikace nebo manuálně tlačítkem „Označit jako poplatek" v Banka side-panelu). Edit existujících záznamů (klik na řádek → modal) zachován. ② **ComponentReference (Mapa komponent)** — sekce **Poplatky** povýšena na **„Připraveno k implementaci"**. Doplněno 7 komponent: PoplatkyView (root + cascading filter), KpiStrip (4 karty s trendem), TypeBreakdown (klikatelný stacked barbar), MesicniChips (klikatelné chip per měsíc), PoplatkyTable (filter bar bez CTA), PoplatekFormModal (jen EDIT), Auto-evidence z Banky (workflow vstup přes `BankTransactionClassifier` + manualMark). ③ **KodView (Kód)** — sekce **Poplatky** povýšena na **„Připraveno k implementaci"** s 5 kartami reálného Volt/Eloquent kódu: **Datový model** (1 tabulka `bank_fees` s 9-typ enum + `source_transaction_id` FK + `created_via` enum), **Auto-evidence z Banky** (`BankFeeFactory` service s `fromClassification()` + `fromManualMark()` metodami + mapováním klasifikace na typ), **Hlavní view** (Eloquent query s branch filtering + multi-tenancy), **KPI strip + breakdown** (`#[Computed]` properties — thisMonthSum / lastMonthSum / monthlyAverage / breakdownByType s GROUP BY a procenty), **FeeEditModal** (save s audit zápisem při změně typu + delete s authorize). Build OK ~820 KB JS bundle. Souhrn: 5 sekcí „Připraveno k implementaci" (Tržby + Banka + Trvalé příkazy + Úvěry + Poplatky), 1 dílčí „Rozpracované" (AutoSyncBar), 9 sekcí „Čeká".
- **v3 s25**: **Phase 8.8 (zápis 22. 6. 2026) — Úvěry „Připraveno k implementaci" + rozpad zaplaceného jistina/úroky pro majitele**. ① **UveryView** — v side panelu pod progress barem („X % splaceno") nový blok **„Z toho už splaceno"** s 2 mini KPI kartami: **Jistina** (zelená, ikona peněženky v kruhu, label + % podíl ze zaplacených splátek + bold zelená částka) a **Úroky** (oranžová, ikona klesajícího grafu). Karty mají bílé pozadí, 3px barevný levý border, kruhové ikonové pozadí 12% tinted. **Sumy s `whiteSpace: nowrap`** — částka + „Kč" se nikdy nezalomí na 2 řádky. Výpočet: `splatky.filter(s => stav === 'zaplacena' || 'castecne-uhrazena').reduce((sum, s) => sum + s.jistina, 0)` a totéž pro `urok`. Pro majitele důležitý pohled — vidí, kolik už úroků odteklo do banky vs. kolik si poníží dluhu. ② **ComponentReference (Mapa komponent)** — sekce **Úvěry** povýšena na **„Připraveno k implementaci"** (zelená). Doplněno 8 komponent: UveryView (root view + cascade filter), KpiStrip (4 karty), UveryTable (filtry + sazba badge), UverSidePanel (s mini KPI kartami pro majitele), Splátkový kalendář (jistina/úrok rozpad), UverFormModal (anuitní kalkulačka), Předčasné splacení + Mimořádná splátka, Inline edit splátky. ③ **KodView (Kód)** — sekce **Úvěry** povýšena na **„Připraveno k implementaci"** s 6 kartami reálného Volt/Eloquent kódu: **Datový model** (3 tabulky: loans s rate_type enum, loan_installments se jistina/úrok rozpadem, loan_documents), **Hlavní view** (Eloquent query s `whereHas` pro nestandardní splátky), **KPI strip** (`#[Computed]` + Cache::remember 300s — totalDebt, monthlyPayments, nonStandardCount), **Anuitní kalkulačka** (PHP implementace anuitního vzorce s for-loop pro generování všech splátek), **Side panel + rozpad pro majitele** (computed `paidPrincipal` / `paidInterest` / `paidPercentage` + kompletní Blade snippet pro 2 mini karty), **Inline edit + Mimořádná splátka + Předčasné splacení** (3 Volt action metody s authorize + activity log). Build OK ~815 KB JS bundle. Souhrn: 4 sekce „Připraveno k implementaci" (Tržby + Banka + Trvalé příkazy + Úvěry), 1 dílčí „Rozpracované" (AutoSyncBar), 10 sekcí „Čeká".
- **v3 s24**: **Phase 8.7 (zápis 22. 6. 2026) — Banka a Trvalé příkazy „Připraveno k implementaci" pro kodéra**. ① **ComponentReference (Mapa komponent)** — sekce **Banka** povýšena ze stavu „Rozpracované" na **„Připraveno k implementaci"** (zelená). Uvnitř zůstává jediná dílčí komponenta `AutoSyncBar` s „Rozpracované" statusem (čeká na finální UX dávkového UI). Doplněna sekce **Trvalé příkazy** kompletně — 8 komponent: TrvalePrikazyView (root view + cross-section z `pendingTPFromTrans`), KpiStrip (4 karty, klikatelný „Nezaplacené splátky"), PrikazyTable (filtry + sloupce), PrikazSidePanel (sticky + splátkový kalendář inline edit), PrikazFormModal (new/edit + leasing auto-preview), Splátkový kalendář (generateLeasingSplatky helper), Upload dokumentů (typ auto-detekce ze souboru), Cross-section nav z Banky. ② **KodView (Kód)** — sekce **Banka** povýšena na **„Připraveno k implementaci"**, obsah nahrazen za reálný Volt/Eloquent kód (8 karet): **Datový model** (4 tabulky: bank_accounts s JSON branch_ids pro multi-venue, bank_transactions s candidates/audit/notes, transaction_audit_entries, transaction_notes), **Hlavní view** (Eloquent query s `whereJsonContains` + multi-tenancy přes `activeBranch()`/`mainBranchGet()`), **BalanceOverview** (computed totalCzk/totalEur + Bootstrap accordion), **UcetCard** (SVG sparkline 37 bodů + brand color border-top podle počtu branche), **TransakceSidePanel** (confirmCandidate + markAs s audit zápisem), **Návrh systému** (`BankTransactionClassifier` service s regex detekcí 5 typů), **Cross-section nav** (`redirect(route, navigate: true)` + `session()->flash` pro pendingTPFromTransaction), **AutoSyncBar** zůstává s žlutým „Rozpracované" statusem + Blade snippet jen pro status-only verzi (dávkové UI počká). ③ Nová sekce **Trvalé příkazy** s 6 karet kódu: Datový model (`standing_orders` + `standing_order_installments` + `standing_order_documents` se enum hodnotami), Hlavní view (`#[Defer]` + Livewire query s `withCount(['installments as unpaid_count' => ...])` + cross-section z `session('pendingTPFromTrans')`), KPI strip (`#[Computed]` + `Cache::remember` 300s TTL pro `monthlyBurden` s perioda-aware výpočtem), Form modal s leasing auto-preview (`generateInstallmentsArray()` v Modelu + Blade preview tabulka), Side panel s `updateInstallment()` (authorize + activity log + override účtu select), CSS (type badges + splátka stav classes + sticky panel). Build OK ~810 KB JS bundle. Souhrn: 3 sekce „Připraveno k implementaci" (Tržby + Banka + Trvalé příkazy), 1 dílčí komponenta „Rozpracované" (AutoSyncBar), 11 sekcí „Čeká".
- **v3 s23**: **Phase 8.6 (zápis 22. 6. 2026) — Banka UX simplifikace + Mapa komponent/Kód jako nested subpages pro kodéra**. ① **Banka AutoSyncBar zjednodušen** per zpětnou vazbu z meetingu — odebráno CTA „Odeslat dávku" + celý druhý řádek (Živě / Znovu načíst / Simulovat chybu + Audit dropdown) + error stav UI s „Zapnout znovu". Zůstává jen **status-only verze**: indikátor (Aktivní), interval (15 min), Poslední sync (14:32), Příští sync (14:47), API limit (X/300). Související state (`lastBatch`, `revertConfirm`, `batchAudit`, `syncError`, `handleSendBatch`, `handleRevertBatch`, `handleToggleSyncError`) odstraněn — komponenta čistá ~25 řádků JSX. Confirm modal + 3 handlers vynuceně mrtvý kód odstraněn. ② **ComponentReference refactor na nested subpages** (`ComponentReference.tsx` kompletně přepsán, ~440 řádků) — levý nav s 14 sekcemi (Banka / Faktury / Trvalé příkazy / Úvěry / Poplatky / Karty/Qerko/GoPay/Sodexo / Daně / Tržby / Platby / Pohledávky / Cashflow / Dashboard / Nastavení / Shell), každá s **status badgem** (Připraveno k implementaci / Rozpracované / Čeká). Pravý content area zobrazuje komponenty zvolené sekce s metadaty (file path, pattern, Larkon mapping, sub-komponenty, implementace, custom YES/NO + důvod). Komponenta `<ComponentCard>` má `borderLeft` 4px podle statusu (zelená/oranžová/šedá), žlutý „Rozpracované" alert s konkrétní poznámkou pro kodéra. **Banka sekce vyplněná kompletně** — 13 komponent (BankaView, AutoSyncBar **s rozpracovaným statusem + popisem proč**, SimpleMetrics, BalanceOverview, UcetCard, Tabulka transakcí, TransakceSidePanel, Návrh systému `detectTransType`, Kandidáti, Označit jako… workflow, Cross-section nav `pendingFakturaId`/`pendingTPFromTrans`, Aktivita feed, Modaly). Ostatní sekce = placeholder „Sekce čeká na rozpis" — doplňujeme postupně. Header s počítadlem (X sekcí Připraveno / Y Rozpracovaných / Z Čeká). ③ **KodView refactor na stejnou nested strukturu** (~2 040 řádků, sticky levý nav) — Tržby sekce zachovává původní kompletní Volt/ApexCharts kód (3 podsekce: Tržby detail s `TrzbyDetailPreview` + Vývoj tržeb s `VyvojTrzebPreview` + Sdílené). Banka sekce má žlutý „Rozpracované — neimplementovat zatím" alert + samostatnou kartu pro AutoSyncBar s detailním popisem (Phase 8.6 odebráno X, Y, Z; zůstává jen status-only verze; finální dávkové UI bude dořešeno; neimplementovat zatím v Laravelu). Ostatní sekce placeholder. ④ **Status terminologie** — „Hotovo" přejmenováno na **„Připraveno k implementaci"** v obou viewách (kódový podklad nasazený na live → kodér může začít implementovat). Default selected sekce: ComponentReference → Banka, KodView → Tržby. Build OK ~810 KB JS bundle.
- **v3 s22**: **Phase 8.3–8.5 (zápis 10. 6. + 12. 6. 2026) + dokončení všech bodů obou porad**. Velký balík čisticích + nových features napříč Faktury / Banka / Tržby / Karty / Nastavení. **Phase 8.3 — Faktury closure (10. 6.)**: ① **Varování při uložení bez PDF** (confirm dialog „Uložit bez dokumentu?" s 2 volbami: Zpět-přiložit / Uložit i tak), ② tlačítka přejmenována (`Uložit a zkontrolovat` → **„Uložit fakturu"**, upload pole **„Přidat dokument"**), ③ **cross-section nav** přes `AppState.pendingFakturaId` — Banka transakční panel má **„Otevřít detail faktury"** → naviguje na Faktury + auto-otevře side panel. **Phase 8.4 — Vystavovaná faktura jako Fakturoid (10. 6. + 19. 6.)**: ① **3 stavy vydaných**: `vystavena / nezaplacena / zaplacena` (paralelně s 8 stavy přijatých), workflow akce v side panelu (Označit uhrazenou / Odeslat upomínku / K vymáhání / Stáhnout PDF) — schvalovací proces skrytý pro vydané. ② **„Vystavit fakturu"** = nový full-page editor s **interaktivní tabulkou položek** (název, počet, jednotka, cena/j., DPH 0/12/21 %, auto-celkem), výpočet DPH breakdownu, právní entita (Con Gusto / U Čápa / KOREK), pole pro **ARES lookup** (mock), platební údaje + termíny (vystavení / DUZP / splatnost, forma, KS, VS auto z čísla), **toggle živého náhledu** (default skrytý, formulář přes celou šířku), spodní CTA panel **„Uložit a stáhnout PDF" / „Uložit a odeslat"** — odeslat-flow rozbalí inline formu (Kontakt + e-mail + Předmět + Zpráva s auto-vyplněním + info „PDF se přiloží automaticky"). ③ **Šablony položek** — 16 systémových šablon v 5 kategoriích (Catering / Pronájem / Služby / Poukazy / Storno) jako kategoriální chip-tlačítka nad tabulkou; **vlastní šablony** v 6. dropdown (provozní si tvoří přímo z řádků faktury 💾 ikonou → inline „Uložit jako šablonu" s výběrem kategorie); ⭐ indikátor původu (žlutá hvězda v poli název, mizí po přepsání); odkaz „Spravovat šablony…" → Nastavení. ④ **„Vystavit proformu"** používá stejný editor s **isProformaVystavit** flagem (cyan badge PROFORMA, modrý info banner „po úhradě vystavit finální fakturu", náhled „ZÁLOHOVÁ FAKTURA (PROFORMA)"). ⑤ **Alert na seznamu Faktur** „X uhrazených proform čeká na finální fakturu" — klik filtruje vydané + forma=zalohova. Mock: 2 vydané proformy (AutoPalace 18k, Siemens 22,5k) bez `spojenaSId`. **Phase 8.5 — uzavření všech bodů obou porad** (audit-driven, 11 položek): ① **Reverzní akce** „Vrátit ke schválení" v side panelu pro stav `schvalena`. ② **Hromadné exporty** — bulk toolbar rozšířen o **Exportovat PDF (X) / Odeslat účetní / Označit uhrazené** + tlačítko **„Vybrat vše"** v hlavičce tabulky. ③ **Celofiremní pohled** — segmented filter v Action Baru Faktur (Všechny / Con Gusto / U Čápa / KOREK), kombinovatelný s filtrem provozovny. ④ **Číslo účtu odběratele** + IBAN ve vystavovacím editoru (sekce Odběratel). ⑤ **Nová sekce Nastavení** (`/nastaveni`, `NastaveniView.tsx`) se 3 záložkami: **Číselník položek** (tabulka 16 šablon, hledání + filter kategorie, sloupce: Název / Kategorie / Jednotka / Výchozí cena / DPH / Poznámka účetní; CRUD disabled v wireframe módu) + Uživatelé & role + Schvalovací proces (placeholdery). ⑥ **Dávka plateb „Vrátit poslední krok"** — skutečný flow v `AutoSyncBar`: tracking `lastBatch` (ID + count + čas), confirm modal před anulováním + audit log dropdown s historií dávek a anulací. ⑦ **Vytvořit trvalý příkaz z transakce** — nové zelené tlačítko v `BankaSidePanel` → naviguje na Trvalé příkazy s předvyplněnými údaji (firma, částka, protiÚčet, VS) přes `pendingTPFromTrans` v AppState; `TrvalePrikazyView` useEffect otevře form modal v `new` módu. ⑧ **Auto-status „V bance neuhrazená"** — helper `getEffektivniStav(rawStav, splatnost)` v `platbyData.ts` propaguje stav `v-bance` → `v-bance-neuhrazena` po 3+ dnech od splatnosti; aplikováno v `FakturyTable` (effective stav + řazení) i `FakturySidePanel`. Mock `fp50` (ČEZ Distribuce 24 300 Kč, splatnost 10. 4. + dnes 17. 4. = 7 dní po splatnosti). ⑨ **Bankovní poplatky auto-identifikace** — `detectTransType(firma, poznamka)` v `bankaData.ts` rozpoznává poplatek / úrok / sankci / mzdu / splátku úvěru z textu; v Banka side panelu modrý alert **„Návrh systému"** s tlačítkem **„Přijmout návrh"** → klasifikuje + audit. ⑩ **Sodexo / Karty manuální import** — modal s drag-drop areou, po nahrání souboru preview tabulka 5 řádků (datum, číslo, částka, provozovna, stav), zelený alert „17 z 18 řádků rozpoznáno, 1 čeká na přiřazení", select pro „Provozovna pro celý import". ⑪ **CG Catering zdaněné vs. nezdaněné** — info banner v `TrzbyView` při výběru `cg-catering`: „Zdaněné (15 %) ~74 %" + „Nezdaněné ~26 %" (BASE_DAY.b reprezentuje osvobozené plnění). **Layout fix**: **kliknutý řádek ve Fakturách se zarovnává s horní hranou side panelu** (scroll-to-row-top pattern z Banky — `requestAnimationFrame` + `window.scrollTo` s topbar offset). Build OK ~803 KB JS bundle.
- **v3 s21**: **Phase 7 (zápis 12. 6. 2026) + Phase 8.1/8.2 (zápis 10. 6. 2026)** — operační iterace napříč Finance + Faktury. **Phase 7 (12. 6.)**: ① nová sekce **Daně** (`/dane`, `daneData.ts` + `DaneView.tsx`) — 20 mock daňových plateb (DPH/DPPO/DPFO/Nemovitost/Silniční/Srážková) per právní entita (Con Gusto / U Čápa / KOREK), KPI, klikatelný breakdown, side panel s detailem. ② **Banka** přejmenována zpět z „Bankovní účty" na „Banka". Tabulka transakcí: nové sloupce **Datum / Typ / Protistrana (firma + protiÚčet) / VS / Účet / Částka / Stav** (provozovny mají label + tečku místo pouhé tečky s title). Smart Alerts strip + Work Queue nahrazeny **SimpleMetrics (2 ukazatele) + BalanceOverview** (CZK/EUR + collapsible účty list). Nová akce **„Splátka úvěru"** v platebním modalu. Topbar **provozovna funguje jako filtr** napříč Bankou (priority: explicit provozovnaId na záznamu → fallback na účet). „Nová platba" save fix (mergedUcty → BANKA_UCTY). ③ **Poplatky**: row-click pattern (per memory rule, ne ikona pera), provozovnaId optional field, **Nový poplatek** modal. Topbar provozovna filtruje. ④ **PaymentPlatformView (Qerko/GoPay/Sodexo/Karty)**: scope refocus — odstraněny marketingové metriky (průměrná útrata / počet transakcí), zaměřeno na **POS × Banka × Výpis 3-way reconciliation**. Detail mocky všech měsíců (`generateMonthDetail()` helper), klikatelná porovnávací tabulka, **expandable inline editor** problémových dnů: řešitel + komentář + **„Dopárovat ručně"**. Hlavičky breakdownu (Provozovna \| Podíl \| Hrubá \| Provize \| Čistý). ⑤ **Trvalé příkazy**: odstraněna „Zrušené" KPI dlaždice (3 dlaždice v col-md-4). ⑥ **Úvěry**: provozovnaId filter, **inline edit splátek** v side panelu (datum/VS/částka per řádek), **Mimořádná splátka** akce, **splátky preview s anuitou** v novém úvěr modalu. **Phase 8 (10. 6.) — Faktury**: ① **8 stavů** (`FakturaStavPlatby` přepsáno): `nova / ceka-na-schvaleni / schvalena / pozastavena / zamitnuta / v-bance / v-bance-neuhrazena / uhrazena`. Mock data migrace přes sed (`ke-schvaleni`→`ceka-na-schvaleni`, `zaplacena`→`uhrazena`, `odeslana`→`v-bance`, `chyba-platby`→`v-bance-neuhrazena`, `zastavena`→`pozastavena`). `getFakturyVProcesu()` filtruje jen `v-bance`/`v-bance-neuhrazena`. **STAV_ORDER** rebuild s unikátními klíči pro 8 stavů. ② **FakturyTable** zjednodušení: odstraněny checkboxy + hromadné akce, sloupce **Dodavatel(+číslo/VS) / Provoz / Splatnost / Částka / Stav**. Pro `ceka-na-schvaleni` zobrazen badge „od {jméno}". Odstraněny sloupce: Typ dokladu / Kategorie / Odeslat do / Přiřazeno. ③ **Schvalovací proces v side panelu**: **výběr účtu** (`BANKOVNI_UCTY` filtrované per provozovna) + **výběr schvalovatele** (`SCHVALOVACI_OSOBY` mimo fakturanta) + **korektura celkové částky** s impact alertem + **započet dobropisu/zálohy** toggle (nespárované select) + 4 akce **Schválit / Odložit / Přidat žádost / Zamítnout** + **Pozastavit s důvodem** (jen po schválené). Read-only pro `uhrazena`/locked. ④ **Nová faktura / Nová proforma jako samostatné podstránky** (NE modal okna). `viewMode: 'list' | 'new-faktura' | 'new-proforma'` přepíná mezi seznamem a formuláři. Page-title-box breadcrumb **„← Zpět na seznam / Nová faktura"**, formuláře jako normální karty přes celou šířku. Proforma má modrý info banner (záloha bude započtena při finální fakturaci) + pole **„Navázání na finální fakturu"** + hint o varování při uložení bez PDF. ⑤ TS error fixy po sed mass-replace stavů (FakturaDetailDrawer, FakturySidePanel, PlatbyDetailPanel STAV_META; obnovení `ceka-na-sparovani` MatchingStav, kterému sed omylem ublížil). Build OK ~790 KB JS bundle.
- **v3 s20.1**: **Fix sazby breakdown** v PaymentPlatformView — částka + „Kč" se lámaly na 2 řádky (sloupec breakdown v Karty/Qerko/GoPay/Sodexo měl jen 180px). Přidán `whiteSpace: nowrap` na 3 finanční hodnoty (hrubá / provize / čistý) + šířka sloupce 180→240px.
- **v3 s20**: **Phase 1–6 podle zápisu porady 4. 6. 2026** (master refactor + nové sekce). **Phase 1 (sidebar restrukturalizace)**: členění na 5 skupin (Přehled / Ekonomika / Finance / Systém / Dev). „Banka" přejmenována na „Bankovní účty". Přidány nové sekce: `trvale-prikazy` / `uvery` / `poplatky` / `karty` / `qerko` / `gopay` / `sodexo`. Topbar breadcrumb labels aktualizovány (Ekonomika vs. Finance). Sidebar CSS scroll fix — `overflow-y: auto` v `.main-nav .scrollbar` (nebyl SimpleBar JS init). **Phase 2 (Banka redukce + UX)**: `BankaTransStav` ze 7 na **3 stavy** (`paired` / `unpaired` / `manual-paired`) per zápis. Vnitřní flagy `isWaitingReview` / `hasError` / `isOverdueAtBank` / `delegatedTo` na `BankaTransakce`. Nová pole `protiUcet` / `splatnost` / `manualReason` / `manualNote`. Filter bar rozšířen o období (date range) + částka (range) + fulltext (firma/poznámka/VS/protiúčet). Nový sloupec **Protiúčet** v tabulce. Smart Alerts strip odstraněn (duplikoval Work Queue). Účty provozoven schované do rozbalovacího pole **„Ostatní účty"** (read-only). **Work Queue redesign** — 2 skupiny **„K vyřešení"** vs **„K přehledu"** se sekčními labels, čtvercové karty 96px (větší 26px číslo, ikona v kruhu, border-top barva). Tlačítko **„Vyčistit všechny filtry"** (outline-danger + ikona gumy) + viditelný banner aktivního Work Queue filtru. Sticky panel fix (`align-items-start` odstraněn → pravý sloupec se roztáhne na výšku tabulky). Scroll-to-center kliknutého řádku. Provozovny v tabulce mají label + tečku (předtím jen tečka s title). **Auto-evidence interních převodů** (`isInternalTransfer` helper porovná protiÚčet vs IBAN), **delegování na 4 mock uživatele** (`BANKA_USERS`), **„V bance neuhrazená"** auto-status (splatnost > 3 dny + nespárováno), **proklik na fakturu** přes cross-section nav. **AutoSyncBar** rozšířen: hromadné platby (Odeslat dávku / Vrátit poslední krok), error stav (Auto-sync vypnut + Zapnout znovu), API limit 187/300. **Phase 3 (Trvalé příkazy)**: nová sekce `/trvale-prikazy`, 10 mock příkazů (standard / leasing / záloha), KPI strip (Aktivní / Měsíční zátěž / **Nezaplacené splátky** klikatelné / Pozastavené), filter chip „Jen nezaplacené". **Form modal pro nový/edit** s auto-generováním splátkového kalendáře leasingu (vsVzor + počet → preview tabulka). **Inline edit splátky** v side panelu (datum, VS, částka, override odchozího účtu). **Upload smluv/dokumentů** (mock — typ se auto-detekuje z názvu souboru). **Phase 4 (Úvěry)**: nová sekce `/uvery`, 3 mock úvěry (hypotéka KB 8.5M PRIBOR / provozní ČSOB 800k fix / investiční Raiffeisen 1.5M PRIBOR s **částečnou splátkou pro demo manuální kontroly**). KPI s nestandardními splátkami. Tabulka s typem sazby (**fix vs PRIBOR + marže**), progress bar splaceno. Side panel s **rozpadem jistina/úrok per splátka** (PRIBOR predikce kurzívou + alert „finalizuje po spárování"). Akce **Předčasné splacení** s confirm dialogem. Form modal s anuitní kalkulačkou. Upload dokumentů. **Phase 5 (Poplatky)**: nová sekce `/poplatky`, ~40 mock záznamů napříč 6 měsíci, 9 typů poplatků (vedení účtu / transakce / karta / výběr / vklad / úrok z debetu / služby / sankce / jiné). KPI (Tento měsíc s trendem / Průměr/měsíc / Nejdražší typ / Záznamů celkem). **Klikatelný barbar breakdown po typech** (filtruje tabulku). Tabulka + měsíční souhrny v pravém sloupci (klikatelné chip). **Phase 6 (Qerko / GoPay / Sodexo / Platební karty)**: jedna generická komponenta `PaymentPlatformView` se 4 platformami. **Sodexo bez API** (warning badge + tlačítko „Importovat data"), ostatní s API. **Per-platforma config**: provize % / D+N zpoždění / účet pro příjmy / podporované metody / **seznam provozoven**. **Rozdělení po provozovnách** s klikatelným barbar a sumami (hrubá tržba / provize skut. / čistý příjem). **Inline „Přiřadit…" select** pro nepřiřazené záznamy. **Skutečný poplatek = TržbaPOS − Příchozí** (info banner — příchozí platba je net po provizi). Sloupce: Tržba POS / Příchozí (D+1) / **Provize skut. / Provize odhad / Δ odhadu** (zelená < 5 Kč, jinak žlutá). Měsíční faktury s porovnáním odhad vs fakturovaný poplatek. Mock data: per den per provozovnu, demo rozdíly (Qerko refund −350 / GoPay nepřišlo / 2 nepřiřazené dny pro manuální flow). Build OK, ~720 KB JS bundle.
- **v3 s19**: **Banka — Phase 2 (operační workflow)** podle master promptu ze schůzky. **Rozšířené stavy**: `BankaTransStav` ze 4 na **7 stavů** (přidány `waiting-review` / `multiple-candidates` / `outside-system` / `no-invoice`). Nové typy `SuggestedMatch` (matchScore + důvody), `TransAuditEntry`, `TransNote`. `BankaTransakce` rozšířena o `candidates?`, `outsideReason?/Note?`, `noInvoiceReason?`, `notes?`, `auditLog?`. 8 nových mock transakcí (tx31–tx38). **Work Queue „Vyžaduje pozornost"** — 6 klikatelných karet (nespárované / s více kandidáty / bez VS / bez provozovny / čekající / s chybou). Klik = atomická operace: filter + auto-select první transakce + scroll k panelu (žádné dohledávání). Druhý klik zruší. **Side panel kompletně přepracován** — původně 4 tabs (Detail / Párování / Komunikace / Historie), po UX iteraci přepsán na **single-scroll s progressive disclosure**: Akční zóna (vždy nahoře, kontextová) → Detail → Aktivita (sloučený chronologický feed audit + poznámky). Header rozšířen o částku + datum. **Mikrofeedback** po akci (zelený alert, auto-dismiss 2.5s). Kandidáti: ≥80 % match dostává zelený 2px border + **„DOPORUČENO" badge** u prvního. Manuální párování s `<datalist>` autocomplete (mock 5 VS). „Vystavit fakturu" generuje mock `FA-2026-XXXX`. **„Nelze napárovat?"** sloučený workflow — 2 tlačítka (Mimo systém / Bez faktury), klik rozbalí inline form s důvody (`OUTSIDE_REASONS` 5 / `NO_INVOICE_REASONS` 7). Outside dovoluje navíc text poznámky. Aktivita: audit = tečka+ikona+barva, poznámky = žlutá bublina s borderLeft. **State**: `localTrans: Record<id, Partial<BankaTransakce>>` + `getMergedTrans()` (appenduje audit/notes) + `mergedAllTransakce` propaguje do Work Queue counts + tabulky. `selectedTrans` hledán v `mergedAllTransakce` (ne filtered) → panel nezmizí po akci, která přesune transakci mimo filter. Helpers `pushTransAudit` / `pushTransNote` / `patchTrans`. Build OK.
- **v3 s18**: **Faktury — 5 nových features per spec** (operational invoice workflow dashboard). **1) Locking + Cost category audit**: nový flag `isLocked?: boolean` v `FakturaPlatby` (paralelně s workflow stavem). 3 mock faktury locked (fp14 Metro AG, fp46 Makro, fp47 E.ON — z března/dubna, zaplacené, uzavřené účetní období). V tabulce 🔒 fialová ikona vedle stav-badge + tooltip. V side panelu fialový alert „Faktura uzamčena", nová sekce „Účetní kategorie" s editovatelným dropdown (jen kategorie editovatelná, ostatní read-only), workflow akce skryté, poznámka read-only s šedým pozadím. Změna kategorie → audit zápis `typ: 'editace'`. Nový quick filter chip „🔒 Uzamčené (3)" který zahrnuje i zaplacené (jinak skryté). **2) Rounding correction workflow**: pro diff DL ≤ 1 Kč nové tlačítko „Schválit zaokrouhlení" v zeleném boxu DLMatchingDetail; po schválení změna stavu na „✓ Zaokrouhlení schváleno" + audit zápis `typ: 'parovani'`. Mock data: fp01.castka 45 200 → 45 201 (vytvoří diff +1 Kč pro demo). **3) Recheck matching vylepšení**: počet pokusů per faktura (`localRecheckCount: Record<id, number>`), tlačítko mění label (Spustit párování → Znovu párovat 1× → 2× → 3×) + počet v bílém badgi, primary modré při neukončeném párování, outline-primary když sparovana. Audit zápisy s ordinálním číslem („Druhý pokus o přepárování — vyhodnoceno: spárováno ✓") + výsledný stav matching. **4) Saved filter states**: state `savedPresets: FilterPreset[]` se snapshot všech filtrů (kategorie/stav/párování/forma/preset/částka/search). Nový řádek nahoře v filter baru „🔖 Moje filtry: [chipy] [+ Uložit aktuální]". 2 výchozí demo presety (Denní review / K vyřešení). Klik na chip načte snapshot, ×  smaže, „Uložit aktuální" prompts na název, „Zrušit filtry" zruší active preset. **5) Tabs v side panelu**: nahrazuje endless scroll. 4 záložky (Detail / Párování / Komunikace / Historie), modrý underline na aktivní, ikony Solar. Header (status badges + dodavatel) a alerty (Locked / Mismatch / Duplicita) vždy viditelné. Mostly jen jedna sekce najednou — žádné dlouhé scroll. **Plus layout vylepšení**: tabulka full-width (`col-12`) když není faktura vybraná, panel (`col-xl-5 col-lg-5`) se zobrazí až po výběru (jako v Bance). Dodavatel sloupec `width: 220px` + `text-truncate` + tooltip. Tabbed panel `top: calc(var(--bs-topbar-height) + 16px)` + `maxHeight: calc(100vh - var(--bs-topbar-height) - 32px)` (správně pod topbarem). Removed nested scroll v komentářích.
- **v3 s17**: **Responzivita pass #1** — analýza + 7 fixů ve 3 souborech. **Faktury layout**: panel z `col-lg-4` na `col-lg-5` (širší při 992–1199px). **Faktury action bar**: rozdělen na 2 logické skupiny (Období \| Akce) přes `justify-content-between`. **Banka AutoSyncBar**: text-popisky („Poslední:", „Příští:", „Ve frontě:") schované pod `md` (`d-none d-md-inline`) + `title` attr pro tooltip. **Banka card grid**: 4-per-row přesunuto z `xl` (1200+) na `xxl` (1400+), takže na 1200–1399 jsou 3-per-row (méně cramped). **Tržby Vývoj tržeb toggle row**: `flex-wrap` (3-4 řádky chaos) → `flex-nowrap` + horizontální scroll (`overflowX: auto` + `flex-shrink-0` na chipech) + tenký scrollbar (`.trzby-chart-toggles` CSS). **Tržby Vývoj tržeb header**: `flex-column flex-lg-row` — title nad kontroly na md (méně tisněné). **CSS media queries** pro tablet (768–991): `.trzby-box` padding 16→12px, `.trzby-box-value` 22→18px, `.card-header.trzby-detail-header-sticky` padding 10/14. Pro <1200: `.trzby-sticky-r` box-shadow pro vizuální oddělení. Nedotčeno: Dashboard layout, PlatbyView, Sidebar mobile overlay, Topbar `d-none d-md-block` shy, Banka Smart Alerts (již `text-nowrap`), Modal sizing (existující `@media` v custom.css).
- **v3 s16**: Tržby → Vývoj tržeb: **CTA „Všechny provozy"** — synthetic `ALL_PROV` (id `'all'`, Con Gusto gold), exclusive toggle, auto-switch `chartPeriod='vse'` (historie od 2006), agregace přes `ACTIVE_PROVS.filter(BASE_DAY > 0).reduce(...)` v `VyvojChart.data` + `RocniVyvojTable.getValue`. **Kód sekce** rozšířená o accordion entry „3 — Vývoj tržeb: rozšíření Všechny provozy" — patch existující Volt komponenty (nepřepisuje původní): 4 PHP úpravy (`toggleBranch` exclusive, `fromYear` MIN(date) cache pro 'all', `loadChartData` agregace pod klíčem `'all'`, `chartData` single zlatá series) + 1 Blade změna (tlačítko před foreach branches). Dodrženo: Volt syntax, žádné Helper/Support třídy, Eloquent + Cache::remember.
- **v3 s15**: Nová sekce **Banka** (`/banka`) — kompletní finanční přehled pro majitele / fin. ředitele. `bankaData.ts` (BankaUcet + BankaTransakce typy + 13 mock účtů + 30 mock transakcí + helpery STAV_META/TRANS_STAV_META). 3 sekce v layoutu: Smart Alerts (4 typy: critical/sync-error/low-balance/unassigned) s **klikatelnými chipy** s inline akcemi (Převést/Resync/Přiřadit) — chip má 2 části: scroll-to-card + akce. Top summary banner (Zůstatek celkem CZK+EUR, trend %). AutoSyncBar (cron readiness pattern z Faktur). Karty účtů ve 2 sekcích: **Konsolidované účty** (multi-venue, 4 účty: Hlavní/Mzdy/Marketing/Catering) + **Účty provozoven** (single-venue). Grid `col-12 col-sm-6 col-lg-4 col-xl-3`. Karta obsahuje: brand color border-top (1 provoz → její barva, multi → gold), kompaktní header s currency+stav badges (zkrácené labely + title tooltip), Účetní bilance / Dostupní prostředky (jako ve starém systému), **sparkline 30 dní zpět solid + 7 dní budoucích dashed**, predikce Týden/Měsíc s barvou dle trendu, max 5 badges provozoven + „+N dalších", akční tlačítka pro problémové účty (Převést/Resync/Přiřadit). Klik na kartu → drawer detail účtu (velká sparkline + posledních 10 transakcí + akce). Tabulka transakcí full-width default, zúží se na col-xl-8 jen po výběru. Side-panel detail transakce sticky right (pattern z Faktur). **4 akce**: PrevodModal (Z účtu → Na účet → Částka, validace dostatečných prostředků, opravdu mění bilanci), Re-sync inline (spin 2s → 'ok'), PrirazeniModal (multi-checkbox grid 15 provoz), UcetDetailDrawer (offcanvas 540px). State pattern: `localUcty: Record<id, Partial<BankaUcet>>` + `mergedUcty` — změny se okamžitě projeví napříč UI. Toast notifikace top-right (3s).
- **v3 s14**: Sekce **Kód** refaktor #4 — 3 nové vylepšení od kodéra. **Brand barvy karet** přes `public string $brandColor` property v Volt komponentě (`#c9911a` pro main, `$branch->color` jinak); v Blade jako CSS variable `--prov-color` + `border-top: 3px solid var(--prov-color)`. **Live tečka** dovysvětlená komentáři v Blade (CSS pulse animace `.trzby-live-dot` v `trzby.css`). **ApexCharts + plná šířka** — kompletní přepis grafu Vývoj tržeb z server-side SVG na ApexCharts; Volt vrací `chartData()` jako JSON, Alpine.js plugin `vyvojTrzebChart` inicializuje chart přes `new ApexCharts($refs.chartContainer, options)`; smooth curve, gradient fill, dark tooltip s naším designem, width 100%, responsive breakpoint 768; Livewire eventy → `chart.updateOptions()` přes window CustomEvent `chart-data-updated`. ApexCharts CDN přidán do layout. Náhledy v KodView preview komponentách: brand color border-top, **padding-bottom 20% trick** pro full-width SVG (CSS `aspect-ratio` se v některých layoutech nerespektoval a graf se centroval místo aby vyplnil kartu).
- **v3 s9**: Faktury workflow dashboard (body 1–12 z checklistu) – `MATCHING_DATA` oddělené od FAKTURY_PLATBY (API-ready), `MatchingStav` (6 stavů), `getVS()`/`deriveVS()`, `FakturaForma` (standard/zálohová/dobropis/offset) s `spojenaSId`, 2-col layout (tabulka + sticky FakturySidePanel místo offcanvas drawer), DLMatchingDetail (editovatelné DL, diff tabulka s tolerance prahy ≤1 Kč/≤5%/>5%, „Spustit párování" s `onRematch` callback), DuplicateDetail (side-by-side s red highlighty), `duplicateDetection.ts` pure function (VS/číslo/dodavatel+částka+měsíc, critical/warning), `dodaciListyData.ts` (7 mock DL), `fakturaPolozkyUtils.ts` shared utility, AutoStatusBar (cron readiness indikátor), 4 řady multiselect chip filtrů (Stav/Párování/Forma + presety), Set\<T\>+toggleSet pattern, sortovatelné hlavičky tabulky (↑↓), částka range filter, audit log s 8 typovými badgemi (`SessionAuditEntry.typ`), interní komunikační vlákno (Účetní/Provoz/Management mock thread), Přílohy sekce (mock PDF), session entries pro schválení/zamítnutí/odložení/rematch/komentář, mock data pro speciální formy (fp43 ZAL, fp44 DOB −3 400 Kč, fp45 OFF), záporné částky červeně napříč UI
