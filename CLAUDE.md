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
    FakturySidePanel.tsx # sticky right panel: detail, forma, matching, příloha, audit, komunikace
    DLMatchingDetail.tsx # diff tabulka faktura vs DL, editovatelné DL, "Spustit párování" s callback
    DuplicateDetail.tsx  # side-by-side comparison "Tato faktura" vs "Originál" s red highlighty
    BankaView.tsx        # banka: účty (Konsolidované + Ostatní rozbalitelné) + Work Queue „Vyžaduje pozornost" + tabulka transakcí + single-scroll side panel
    TrvalePrikazyView.tsx# Trvalé příkazy: KPI + tabulka + form modal (nový/upravit) + side panel se splátkovým kalendářem (per-řádek edit)
    UveryView.tsx        # Úvěry: KPI + tabulka (sazba fix vs PRIBOR) + side panel s rozpadem jistina/úrok + form modal + předčasné splacení
    PoplatkyView.tsx     # Poplatky: KPI + barbar breakdown po typech + tabulka + měsíční souhrny (klikatelné)
    PaymentPlatformView.tsx # Generická view pro Qerko/GoPay/Sodexo/terminal: header + KPI + breakdown po provozovnách + tabulka (skut vs odhad poplatek) + měs. faktury
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
                    | 'banka' | 'trvale-prikazy' | 'uvery' | 'poplatky'
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
- `BankaTransakce` — id, ucetId, typ (prichoz/odchozi), datum, castka (záporná=odchozí), firma, poznamka, vs?, stav, parovanaSId?, **candidates?**: SuggestedMatch[], **outsideReason?**, **outsideNote?**, **noInvoiceReason?**, **notes?**: TransNote[], **auditLog?**: TransAuditEntry[]
- `BankaUcetStav` — `'ok' | 'low-balance' | 'critical-balance' | 'sync-error'`
- `BankaTransStav` — `'paired' | 'unpaired' | 'waiting-review' | 'multiple-candidates' | 'outside-system' | 'no-invoice' | 'error'` (7 stavů)
- `SuggestedMatch` — fakturaId, fakturaCislo, dodavatel, castka, **matchScore** (0–100 %), duvody[]
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
4. **AutoSyncBar** — interval, poslední/příští běh, ve frontě na párování, tlačítka „Živě" + „Znovu"
5. **Karty účtů — 2 sekce**: Konsolidované účty (multi-venue) + Účty provozoven (single-venue + unassigned); grid `col-12 col-sm-6 col-lg-4 col-xl-3`
6. **Tabulka transakcí** — full-width default, **zúží se na col-xl-8 jen po výběru** transakce
7. **Side-panel detail transakce** (sticky right column) — single-scroll, viz níže
8. **Drawer detail účtu** (offcanvas vpravo, ~540px) — klik na celou kartu → otevře drawer

### Work Queue „Vyžaduje pozornost"
- 6 klikatelných karet (zobrazí se jen pokud count > 0):
  - 🟡 Nespárované (unpaired)
  - 🟣 S více kandidáty (multiple-candidates)
  - 🟠 Bez VS (chybí variabilní symbol)
  - ⚪ Bez provozovny (účet bez přiřazení)
  - 🔵 Čekající na kontrolu (waiting-review)
  - 🔴 S chybou (error)
- Brand border-top `--prov-color`, karty 2 sloupce na xl
- **Klik na kartu** = atomická operace: aktivuje filter na tabulce + **auto-vybere první matching transakci** + scrollne k tabulce/panelu → uživatel se ocitne přímo v akční zóně
- Druhý klik (nebo „Zrušit filtr ×") deaktivuje
- State: `activeQueue: WorkQueueKind | null` v BankaView
- `mergedAllTransakce` propaguje lokální patche do počtů karet (po Potvrzení kandidáta se count okamžitě sníží)

### Side panel transakce — single-scroll s progressive disclosure
**Žádné záložky** — jeden plynulý sloupec seshora dolů. Místo tabů 3 sekce s vizuálními oddělovači:

**Header (vždy)**: typ badge + stav badge + dodavatel + **částka + datum** + close. Pod tím **kontextové alerty**: žlutý feedback po akci (auto-dismiss 2.5s) / bez VS / bez provozovny / chyba zpracování.

1. **Akční zóna** (vždy první, šedé pozadí, kontextová podle stavu):
   - **paired** → zelený success card „Napárováno" + Unpair button
   - **outside-system / no-invoice** → info alert + „Vrátit do nespárovaných"
   - **needsAction** (unpaired/multiple-candidates/waiting-review/error):
     - **Kandidáti** s match score (≥80 % = zelený 2px border + **„DOPORUČENO"** badge u prvního) + důvody chipy + Potvrdit/× per kandidát
     - **Napárovat ručně** s `<datalist>` autocomplete (mock 5 fakturních čísel)
     - **Vystavit novou fakturu** (jen příchozí) → generuje mock `FA-2026-XXXX`
     - **„Nelze napárovat?"** sloučený workflow: 2 tlačítka (Mimo systém / Bez faktury) → klik rozbalí inline form se selectem důvodů (+ poznámka jen u outside)
2. **Detail** (řádky: VS, datum, účet+IBAN, provozovny badges, outsideReason+note, noInvoiceReason)
3. **Aktivita** (sloučený chronologický feed = audit + poznámky):
   - Audit zápis = malá tečka s ikonou/barvou + jednořádkový text + meta
   - Poznámka = žlutá bublina s borderLeft 3px + chat ikona + text
   - Řazení sestupně podle času
   - Lze sbalit šipkou v hlavičce sekce
   - Input pro novou poznámku vždy na konci

### Sticky pozice panelu
`top: calc(var(--bs-topbar-height, 100px) + 16px)`, `maxHeight: calc(100vh - var(--bs-topbar-height, 100px) - 32px)`, `overflowY: auto` — pod topbarem, využije celou výšku viewportu.

### Důvody pro označení (konstanty v BankaView)
- `OUTSIDE_REASONS` (5): interní převod, vratka zákazníkovi, osobní výběr majitele, vedeno v jiné evidenci, jiný důvod
- `NO_INVOICE_REASONS` (7): bankovní poplatek, úrok, pojištění, mzda, daň/odvod, pokuta, jiné

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
| `karty` | PaymentPlatformView (terminal) | Finance |
| `qerko` | PaymentPlatformView (qerko) | Finance |
| `gopay` | PaymentPlatformView (gopay) | Finance |
| `sodexo` | PaymentPlatformView (sodexo) | Finance |
| `platby` | PlatbyView | Finance |
| `reporty` / `nastaveni` | PlaceholderView | Systém |
| `komponenty` | ComponentReference | Dev |
| `kod` | KodView | Dev |

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
- **v3 s10**: Sekce **Kód** (`/kod`) – podklady pro backend kodéra (PHP/Laravel 11+/Livewire v4/Alpine.js 3/plain JS+CSS). 3 skupiny: Tržby detail (mock tabulka 5×5 se sticky cols + live tečka + Livewire/Blade kód), Vývoj tržeb (interaktivní SVG graf s tooltipem + Livewire/Blade/Alpine kód), Sdílené (helpery `TrzbyHelper.php` s `detRand`/`smoothPath`/`fCzk(U+202F)`, CSS, routing). Accordion s „Kopírovat" tlačítkem, code v dark theme `<pre>`. TrzbyView.tsx nedotčen — `TrzbyDetailPreview` a `VyvojTrzebPreview` jsou nezávislé mock komponenty.
- **v3 s11**: Sekce **Kód** refaktor #1 — kodér chce vše inline v komponentě bez Helper/Support tříd. Smazány `app/Support/Provozovny.php` a `app/Support/TrzbyHelper.php` jako samostatné soubory. Všechna mock data (PROVOZOVNY, BASE_SPLIT, DOW_MULT, UCTY_MOCK, SEASONAL, FOUNDING_YEAR) + helpery (detRand, baseDay, getDowFactor, genDayData, genDayDataSplit, genD7Split, genMonthRevenue, genAnnualRevenue, smoothPath, fCzk, getDatesInRange) přesunuty do class body `TrzbyDetail.php` a `VyvojTrzeb.php` jako public metody (volatelné z Blade přes `$this->...`). Accordion redukován ze 7 na 6 sekcí (bez Sdílené helpery). Sed script + Python regex pro hromadné `TrzbyHelper::` → `$this->` replace v Blade konstantách (38 substitucí).
- **v3 s12**: Sekce **Kód** refaktor #2 — kodér poslal vzorovou `sales-sum.blade.php`, přechod na **Livewire Volt** + **Eloquent**. Class-based `app/Livewire/*.php` přepsány na **Volt single-file** (`resources/views/livewire/*.blade.php` s anonymní třídou `new #[Defer] class extends Component {}`). Žádné mock generators — query přes `Branch::all()` + `DailyClosingRow` (`SUM(value)` pro `type_id IN [SALES, SALE_MANUAL]`). `formatMoney($n, false)` místo `fCzk()`, `<x-input>` Blade komponenta místo standardních inputů, multi-tenancy přes `auth()->user()->activeBranch()` + `mainBranchGet()`. Accordion redukován na 4 sekce. Žluté otázky pro kodéra: K/B split, historické agregace, opened_at.
- **v3 s13**: Sekce **Kód** refaktor #3 — odpovědi od kodéra zapracovány. **Kuchyň/Bar split** přes `DailyClosingRow::SALES_K` + `SALES_B` (query rozšířena o `GROUP BY type_id`, indexace `[branchId][date][typeId]`, single-venue tabulka Datum/Kuchyň/Bar/Celkem). **Cache::remember** pro `loadChartData()` (TTL 1h, klíč s mode/period/year/month/branchIds). **MIN(daily_closings.date)** fallback pro `fromYear()` při `period='vse'` (24h cache). Vyřešené body z žlutého varování přesunuty do zeleného success banneru.
- **v3 s20.1**: **Fix sazby breakdown** v PaymentPlatformView — částka + „Kč" se lámaly na 2 řádky (sloupec breakdown v Karty/Qerko/GoPay/Sodexo měl jen 180px). Přidán `whiteSpace: nowrap` na 3 finanční hodnoty (hrubá / provize / čistý) + šířka sloupce 180→240px.
- **v3 s20**: **Phase 1–6 podle zápisu porady 4. 6. 2026** (master refactor + nové sekce). **Phase 1 (sidebar restrukturalizace)**: členění na 5 skupin (Přehled / Ekonomika / Finance / Systém / Dev). „Banka" přejmenována na „Bankovní účty". Přidány nové sekce: `trvale-prikazy` / `uvery` / `poplatky` / `karty` / `qerko` / `gopay` / `sodexo`. Topbar breadcrumb labels aktualizovány (Ekonomika vs. Finance). Sidebar CSS scroll fix — `overflow-y: auto` v `.main-nav .scrollbar` (nebyl SimpleBar JS init). **Phase 2 (Banka redukce + UX)**: `BankaTransStav` ze 7 na **3 stavy** (`paired` / `unpaired` / `manual-paired`) per zápis. Vnitřní flagy `isWaitingReview` / `hasError` / `isOverdueAtBank` / `delegatedTo` na `BankaTransakce`. Nová pole `protiUcet` / `splatnost` / `manualReason` / `manualNote`. Filter bar rozšířen o období (date range) + částka (range) + fulltext (firma/poznámka/VS/protiúčet). Nový sloupec **Protiúčet** v tabulce. Smart Alerts strip odstraněn (duplikoval Work Queue). Účty provozoven schované do rozbalovacího pole **„Ostatní účty"** (read-only). **Work Queue redesign** — 2 skupiny **„K vyřešení"** vs **„K přehledu"** se sekčními labels, čtvercové karty 96px (větší 26px číslo, ikona v kruhu, border-top barva). Tlačítko **„Vyčistit všechny filtry"** (outline-danger + ikona gumy) + viditelný banner aktivního Work Queue filtru. Sticky panel fix (`align-items-start` odstraněn → pravý sloupec se roztáhne na výšku tabulky). Scroll-to-center kliknutého řádku. Provozovny v tabulce mají label + tečku (předtím jen tečka s title). **Auto-evidence interních převodů** (`isInternalTransfer` helper porovná protiÚčet vs IBAN), **delegování na 4 mock uživatele** (`BANKA_USERS`), **„V bance neuhrazená"** auto-status (splatnost > 3 dny + nespárováno), **proklik na fakturu** přes cross-section nav. **AutoSyncBar** rozšířen: hromadné platby (Odeslat dávku / Vrátit poslední krok), error stav (Auto-sync vypnut + Zapnout znovu), API limit 187/300. **Phase 3 (Trvalé příkazy)**: nová sekce `/trvale-prikazy`, 10 mock příkazů (standard / leasing / záloha), KPI strip (Aktivní / Měsíční zátěž / **Nezaplacené splátky** klikatelné / Pozastavené), filter chip „Jen nezaplacené". **Form modal pro nový/edit** s auto-generováním splátkového kalendáře leasingu (vsVzor + počet → preview tabulka). **Inline edit splátky** v side panelu (datum, VS, částka, override odchozího účtu). **Upload smluv/dokumentů** (mock — typ se auto-detekuje z názvu souboru). **Phase 4 (Úvěry)**: nová sekce `/uvery`, 3 mock úvěry (hypotéka KB 8.5M PRIBOR / provozní ČSOB 800k fix / investiční Raiffeisen 1.5M PRIBOR s **částečnou splátkou pro demo manuální kontroly**). KPI s nestandardními splátkami. Tabulka s typem sazby (**fix vs PRIBOR + marže**), progress bar splaceno. Side panel s **rozpadem jistina/úrok per splátka** (PRIBOR predikce kurzívou + alert „finalizuje po spárování"). Akce **Předčasné splacení** s confirm dialogem. Form modal s anuitní kalkulačkou. Upload dokumentů. **Phase 5 (Poplatky)**: nová sekce `/poplatky`, ~40 mock záznamů napříč 6 měsíci, 9 typů poplatků (vedení účtu / transakce / karta / výběr / vklad / úrok z debetu / služby / sankce / jiné). KPI (Tento měsíc s trendem / Průměr/měsíc / Nejdražší typ / Záznamů celkem). **Klikatelný barbar breakdown po typech** (filtruje tabulku). Tabulka + měsíční souhrny v pravém sloupci (klikatelné chip). **Phase 6 (Qerko / GoPay / Sodexo / Platební karty)**: jedna generická komponenta `PaymentPlatformView` se 4 platformami. **Sodexo bez API** (warning badge + tlačítko „Importovat data"), ostatní s API. **Per-platforma config**: provize % / D+N zpoždění / účet pro příjmy / podporované metody / **seznam provozoven**. **Rozdělení po provozovnách** s klikatelným barbar a sumami (hrubá tržba / provize skut. / čistý příjem). **Inline „Přiřadit…" select** pro nepřiřazené záznamy. **Skutečný poplatek = TržbaPOS − Příchozí** (info banner — příchozí platba je net po provizi). Sloupce: Tržba POS / Příchozí (D+1) / **Provize skut. / Provize odhad / Δ odhadu** (zelená < 5 Kč, jinak žlutá). Měsíční faktury s porovnáním odhad vs fakturovaný poplatek. Mock data: per den per provozovnu, demo rozdíly (Qerko refund −350 / GoPay nepřišlo / 2 nepřiřazené dny pro manuální flow). Build OK, ~720 KB JS bundle.
- **v3 s19**: **Banka — Phase 2 (operační workflow)** podle master promptu ze schůzky. **Rozšířené stavy**: `BankaTransStav` ze 4 na **7 stavů** (přidány `waiting-review` / `multiple-candidates` / `outside-system` / `no-invoice`). Nové typy `SuggestedMatch` (matchScore + důvody), `TransAuditEntry`, `TransNote`. `BankaTransakce` rozšířena o `candidates?`, `outsideReason?/Note?`, `noInvoiceReason?`, `notes?`, `auditLog?`. 8 nových mock transakcí (tx31–tx38). **Work Queue „Vyžaduje pozornost"** — 6 klikatelných karet (nespárované / s více kandidáty / bez VS / bez provozovny / čekající / s chybou). Klik = atomická operace: filter + auto-select první transakce + scroll k panelu (žádné dohledávání). Druhý klik zruší. **Side panel kompletně přepracován** — původně 4 tabs (Detail / Párování / Komunikace / Historie), po UX iteraci přepsán na **single-scroll s progressive disclosure**: Akční zóna (vždy nahoře, kontextová) → Detail → Aktivita (sloučený chronologický feed audit + poznámky). Header rozšířen o částku + datum. **Mikrofeedback** po akci (zelený alert, auto-dismiss 2.5s). Kandidáti: ≥80 % match dostává zelený 2px border + **„DOPORUČENO" badge** u prvního. Manuální párování s `<datalist>` autocomplete (mock 5 VS). „Vystavit fakturu" generuje mock `FA-2026-XXXX`. **„Nelze napárovat?"** sloučený workflow — 2 tlačítka (Mimo systém / Bez faktury), klik rozbalí inline form s důvody (`OUTSIDE_REASONS` 5 / `NO_INVOICE_REASONS` 7). Outside dovoluje navíc text poznámky. Aktivita: audit = tečka+ikona+barva, poznámky = žlutá bublina s borderLeft. **State**: `localTrans: Record<id, Partial<BankaTransakce>>` + `getMergedTrans()` (appenduje audit/notes) + `mergedAllTransakce` propaguje do Work Queue counts + tabulky. `selectedTrans` hledán v `mergedAllTransakce` (ne filtered) → panel nezmizí po akci, která přesune transakci mimo filter. Helpers `pushTransAudit` / `pushTransNote` / `patchTrans`. Build OK.
- **v3 s18**: **Faktury — 5 nových features per spec** (operational invoice workflow dashboard). **1) Locking + Cost category audit**: nový flag `isLocked?: boolean` v `FakturaPlatby` (paralelně s workflow stavem). 3 mock faktury locked (fp14 Metro AG, fp46 Makro, fp47 E.ON — z března/dubna, zaplacené, uzavřené účetní období). V tabulce 🔒 fialová ikona vedle stav-badge + tooltip. V side panelu fialový alert „Faktura uzamčena", nová sekce „Účetní kategorie" s editovatelným dropdown (jen kategorie editovatelná, ostatní read-only), workflow akce skryté, poznámka read-only s šedým pozadím. Změna kategorie → audit zápis `typ: 'editace'`. Nový quick filter chip „🔒 Uzamčené (3)" který zahrnuje i zaplacené (jinak skryté). **2) Rounding correction workflow**: pro diff DL ≤ 1 Kč nové tlačítko „Schválit zaokrouhlení" v zeleném boxu DLMatchingDetail; po schválení změna stavu na „✓ Zaokrouhlení schváleno" + audit zápis `typ: 'parovani'`. Mock data: fp01.castka 45 200 → 45 201 (vytvoří diff +1 Kč pro demo). **3) Recheck matching vylepšení**: počet pokusů per faktura (`localRecheckCount: Record<id, number>`), tlačítko mění label (Spustit párování → Znovu párovat 1× → 2× → 3×) + počet v bílém badgi, primary modré při neukončeném párování, outline-primary když sparovana. Audit zápisy s ordinálním číslem („Druhý pokus o přepárování — vyhodnoceno: spárováno ✓") + výsledný stav matching. **4) Saved filter states**: state `savedPresets: FilterPreset[]` se snapshot všech filtrů (kategorie/stav/párování/forma/preset/částka/search). Nový řádek nahoře v filter baru „🔖 Moje filtry: [chipy] [+ Uložit aktuální]". 2 výchozí demo presety (Denní review / K vyřešení). Klik na chip načte snapshot, ×  smaže, „Uložit aktuální" prompts na název, „Zrušit filtry" zruší active preset. **5) Tabs v side panelu**: nahrazuje endless scroll. 4 záložky (Detail / Párování / Komunikace / Historie), modrý underline na aktivní, ikony Solar. Header (status badges + dodavatel) a alerty (Locked / Mismatch / Duplicita) vždy viditelné. Mostly jen jedna sekce najednou — žádné dlouhé scroll. **Plus layout vylepšení**: tabulka full-width (`col-12`) když není faktura vybraná, panel (`col-xl-5 col-lg-5`) se zobrazí až po výběru (jako v Bance). Dodavatel sloupec `width: 220px` + `text-truncate` + tooltip. Tabbed panel `top: calc(var(--bs-topbar-height) + 16px)` + `maxHeight: calc(100vh - var(--bs-topbar-height) - 32px)` (správně pod topbarem). Removed nested scroll v komentářích.
- **v3 s17**: **Responzivita pass #1** — analýza + 7 fixů ve 3 souborech. **Faktury layout**: panel z `col-lg-4` na `col-lg-5` (širší při 992–1199px). **Faktury action bar**: rozdělen na 2 logické skupiny (Období \| Akce) přes `justify-content-between`. **Banka AutoSyncBar**: text-popisky („Poslední:", „Příští:", „Ve frontě:") schované pod `md` (`d-none d-md-inline`) + `title` attr pro tooltip. **Banka card grid**: 4-per-row přesunuto z `xl` (1200+) na `xxl` (1400+), takže na 1200–1399 jsou 3-per-row (méně cramped). **Tržby Vývoj tržeb toggle row**: `flex-wrap` (3-4 řádky chaos) → `flex-nowrap` + horizontální scroll (`overflowX: auto` + `flex-shrink-0` na chipech) + tenký scrollbar (`.trzby-chart-toggles` CSS). **Tržby Vývoj tržeb header**: `flex-column flex-lg-row` — title nad kontroly na md (méně tisněné). **CSS media queries** pro tablet (768–991): `.trzby-box` padding 16→12px, `.trzby-box-value` 22→18px, `.card-header.trzby-detail-header-sticky` padding 10/14. Pro <1200: `.trzby-sticky-r` box-shadow pro vizuální oddělení. Nedotčeno: Dashboard layout, PlatbyView, Sidebar mobile overlay, Topbar `d-none d-md-block` shy, Banka Smart Alerts (již `text-nowrap`), Modal sizing (existující `@media` v custom.css).
- **v3 s16**: Tržby → Vývoj tržeb: **CTA „Všechny provozy"** — synthetic `ALL_PROV` (id `'all'`, Con Gusto gold), exclusive toggle, auto-switch `chartPeriod='vse'` (historie od 2006), agregace přes `ACTIVE_PROVS.filter(BASE_DAY > 0).reduce(...)` v `VyvojChart.data` + `RocniVyvojTable.getValue`. **Kód sekce** rozšířená o accordion entry „3 — Vývoj tržeb: rozšíření Všechny provozy" — patch existující Volt komponenty (nepřepisuje původní): 4 PHP úpravy (`toggleBranch` exclusive, `fromYear` MIN(date) cache pro 'all', `loadChartData` agregace pod klíčem `'all'`, `chartData` single zlatá series) + 1 Blade změna (tlačítko před foreach branches). Dodrženo: Volt syntax, žádné Helper/Support třídy, Eloquent + Cache::remember.
- **v3 s15**: Nová sekce **Banka** (`/banka`) — kompletní finanční přehled pro majitele / fin. ředitele. `bankaData.ts` (BankaUcet + BankaTransakce typy + 13 mock účtů + 30 mock transakcí + helpery STAV_META/TRANS_STAV_META). 3 sekce v layoutu: Smart Alerts (4 typy: critical/sync-error/low-balance/unassigned) s **klikatelnými chipy** s inline akcemi (Převést/Resync/Přiřadit) — chip má 2 části: scroll-to-card + akce. Top summary banner (Zůstatek celkem CZK+EUR, trend %). AutoSyncBar (cron readiness pattern z Faktur). Karty účtů ve 2 sekcích: **Konsolidované účty** (multi-venue, 4 účty: Hlavní/Mzdy/Marketing/Catering) + **Účty provozoven** (single-venue). Grid `col-12 col-sm-6 col-lg-4 col-xl-3`. Karta obsahuje: brand color border-top (1 provoz → její barva, multi → gold), kompaktní header s currency+stav badges (zkrácené labely + title tooltip), Účetní bilance / Dostupní prostředky (jako ve starém systému), **sparkline 30 dní zpět solid + 7 dní budoucích dashed**, predikce Týden/Měsíc s barvou dle trendu, max 5 badges provozoven + „+N dalších", akční tlačítka pro problémové účty (Převést/Resync/Přiřadit). Klik na kartu → drawer detail účtu (velká sparkline + posledních 10 transakcí + akce). Tabulka transakcí full-width default, zúží se na col-xl-8 jen po výběru. Side-panel detail transakce sticky right (pattern z Faktur). **4 akce**: PrevodModal (Z účtu → Na účet → Částka, validace dostatečných prostředků, opravdu mění bilanci), Re-sync inline (spin 2s → 'ok'), PrirazeniModal (multi-checkbox grid 15 provoz), UcetDetailDrawer (offcanvas 540px). State pattern: `localUcty: Record<id, Partial<BankaUcet>>` + `mergedUcty` — změny se okamžitě projeví napříč UI. Toast notifikace top-right (3s).
- **v3 s14**: Sekce **Kód** refaktor #4 — 3 nové vylepšení od kodéra. **Brand barvy karet** přes `public string $brandColor` property v Volt komponentě (`#c9911a` pro main, `$branch->color` jinak); v Blade jako CSS variable `--prov-color` + `border-top: 3px solid var(--prov-color)`. **Live tečka** dovysvětlená komentáři v Blade (CSS pulse animace `.trzby-live-dot` v `trzby.css`). **ApexCharts + plná šířka** — kompletní přepis grafu Vývoj tržeb z server-side SVG na ApexCharts; Volt vrací `chartData()` jako JSON, Alpine.js plugin `vyvojTrzebChart` inicializuje chart přes `new ApexCharts($refs.chartContainer, options)`; smooth curve, gradient fill, dark tooltip s naším designem, width 100%, responsive breakpoint 768; Livewire eventy → `chart.updateOptions()` přes window CustomEvent `chart-data-updated`. ApexCharts CDN přidán do layout. Náhledy v KodView preview komponentách: brand color border-top, **padding-bottom 20% trick** pro full-width SVG (CSS `aspect-ratio` se v některých layoutech nerespektoval a graf se centroval místo aby vyplnil kartu).
- **v3 s9**: Faktury workflow dashboard (body 1–12 z checklistu) – `MATCHING_DATA` oddělené od FAKTURY_PLATBY (API-ready), `MatchingStav` (6 stavů), `getVS()`/`deriveVS()`, `FakturaForma` (standard/zálohová/dobropis/offset) s `spojenaSId`, 2-col layout (tabulka + sticky FakturySidePanel místo offcanvas drawer), DLMatchingDetail (editovatelné DL, diff tabulka s tolerance prahy ≤1 Kč/≤5%/>5%, „Spustit párování" s `onRematch` callback), DuplicateDetail (side-by-side s red highlighty), `duplicateDetection.ts` pure function (VS/číslo/dodavatel+částka+měsíc, critical/warning), `dodaciListyData.ts` (7 mock DL), `fakturaPolozkyUtils.ts` shared utility, AutoStatusBar (cron readiness indikátor), 4 řady multiselect chip filtrů (Stav/Párování/Forma + presety), Set\<T\>+toggleSet pattern, sortovatelné hlavičky tabulky (↑↓), částka range filter, audit log s 8 typovými badgemi (`SessionAuditEntry.typ`), interní komunikační vlákno (Účetní/Provoz/Management mock thread), Přílohy sekce (mock PDF), session entries pro schválení/zamítnutí/odložení/rematch/komentář, mock data pro speciální formy (fp43 ZAL, fp44 DOB −3 400 Kč, fp45 OFF), záporné částky červeně napříč UI
