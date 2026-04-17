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
  App.tsx              # root, drží celý AppState, předává state + update dolů
  types.ts             # všechny sdílené typy (AppState, ProvozovnaId, ...)
  data.ts              # mock data pro tržby, závěrky, cashflow + helpery
  platbyData.ts        # mock data pro faktury/platby + helpery
  components/
    AppShell.tsx        # sidebar + topbar + routing (switch na selectedSection)
    Sidebar.tsx         # navigace – sekce: Přehled / Finance / Systém / Dev
    Topbar.tsx          # přepínač provozovny, dataMode, period
    DashboardView.tsx   # hlavní dashboard
    TrzbyView.tsx       # analytická sekce – TrzbyWidget + TrzbyTable
    FakturyView.tsx     # správa a schvalování faktur (Finance > Faktury)
    PlatbyView.tsx      # výběr a odeslání plateb do banky (Finance > Platby)
    TrzbyWidget.tsx     # hlavní tržby widget (chart + mesic vs LY + breakdown)
    ...                 # ostatní komponenty
```

## Klíčové typy

```typescript
type ProvozovnaId = 'all' | 'cg-brno' | 'piazza' | 'monte';
type SidebarSection = 'dashboard' | 'trzby' | 'zavierky' | 'provozovny'
                    | 'cashflow' | 'faktury' | 'platby' | 'reporty'
                    | 'nastaveni' | 'komponenty';

interface AppState {
  selectedSection: SidebarSection;
  selectedProvozovna: ProvozovnaId;
  dataMode: 'live' | 'zavierka';
  period: '7d' | '30d' | 'mtd';
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
| `platby` | PlatbyView |
| `komponenty` | ComponentReference |
| ostatní | PlaceholderView |

## Sekce Finance – logika rozdělení

**Faktury** (`FakturyView`) = správa a schvalování
- všechny faktury bez ohledu na stav
- filtry: kategorie, stav, období
- bulk akce: schválit vybrané (sticky bar dole)
- tlačítko "Přejít na platby →" naviguje na PlatbyView

**Platby** (`PlatbyView`) = výběr a odeslání do banky
- zobrazuje **pouze schválené** faktury (stavFilter='schvalena' fixed)
- BalancePanel: `zustatek - sumaFa - sumaOstatni + cekajiciKarty + odhadZbytek`
- FutureRevMode: `'off'` / `'budouci'` / `'budouci-plus'`
- PotvrditModal s double-confirm při nedostatku prostředků
- tlačítko "← Správa faktur" naviguje zpět na FakturyView

## TrzbyWidget (v2 – Phase 4)

Props: `provozovna: ProvozovnaId`, `onDrillDown?: (id: ProvozovnaId) => void`

- auto zdroj dat: víkend/dnes = `pokladna`, po–čt = `závěrka`
- SVG bar chart s tečkou zdroje pod každým dnem
- summary strip: Celkem / Kuchyň / Bar / **vs. minulý týden** (↑/↓ barevně)
- Piazza: tab „Střediska" – Sál / Terasa / Bar (stacked bars)
- MesicVsLY: duben 2026 vs. duben 2025, srovnání avg/den
- ProvozovnyBreakdown: progress bars + klik = drill-down (jen při `provozovna='all'`)

## Data

`src/data.ts` – tržby, závěrky, provozovny  
`src/platbyData.ts` – faktury (14 mock), ostatní platby (6), zůstatky účtů, budoucí tržby

Referenční datum: **2026-04-17** (čtvrtek), týden 13.4.–19.4.2026

## Konvence kódu

- Každá komponenta má header komentář: `// COMPONENT / SOURCE / CUSTOM`
- Larkon = cílový produkční UI kit; každá komponenta mapuje na Larkon pattern
- Sekce "Mapa komponent" (sidebar > Dev) zobrazuje ComponentReference.tsx
- Žádné externí UI kity, chart knihovny, routing kity
- Stav pouze v App.tsx přes AppState + `update(partial)` pattern
- CSS custom properties: `--kpi-accent`, `--c-ok`, `--c-err`, `--c-warn`, atd.

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
- Cashflow (`cashflow`)
- Reporty, Nastavení

## Kontext projektu

Wireframe vznikl jako interní demo pro vedení firmy Con Gusto.  
Primární kontakt: Petr Dohnal (vedení).  
Email 15.4.: spec modulu Platba faktur.  
Email 13.4.: spec TrzbyWidget (auto zdroj, week vs week, mesic vs LY, střediska, drill-down).
