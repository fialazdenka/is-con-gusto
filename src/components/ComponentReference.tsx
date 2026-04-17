// COMPONENT: Component Reference View – vývojová dokumentace
// SOURCE: custom (dev-only helper view)
// CUSTOM: YES – vývojová pomůcka, v produkci se odstraní

interface Mapping {
  component: string;
  file: string;
  pattern: string;
  larkon: string;
  subcomponents: string;
  implementation: string;
  custom: 'NO' | 'YES';
  customReason?: string;
}

const MAPPINGS: Mapping[] = [
  {
    component: 'AppShell',
    file: 'AppShell.tsx',
    pattern: 'Layout Shell',
    larkon: 'VerticalLayout / DefaultLayout',
    subcomponents: 'Sidebar + Topbar + <main> content area',
    implementation:
      'V Larkonu je toto výchozí layout wrapper – soubor `src/layouts/VerticalLayout.tsx`. Obalte obsah stránky do `<VerticalLayout>`. Shell zajišťuje flex row s pevným sidebarem a scrollovatelnou pravou částí.',
    custom: 'NO',
  },
  {
    component: 'Sidebar',
    file: 'Sidebar.tsx',
    pattern: 'Vertical Navigation',
    larkon: 'LeftSideBar + SideNavItem + SideNavSection',
    subcomponents: 'Logo block, MenuTitle (section labels), MenuItem (icon + label + badge), UserDropdown (footer)',
    implementation:
      'Každý `sb-item` → `<MenuItem>`. `sb-section-label` → `<MenuTitle>`. Aktivní stav přes `isMenuItemActive()` helper. User row → `<UserDropdown>` v sidebar footer. Collapse ikona → `<SidebarToggle>`. Badge (číslo upozornění) → Larkon `<Badge bg="danger">` inline v NavItem.',
    custom: 'NO',
  },
  {
    component: 'Topbar',
    file: 'Topbar.tsx',
    pattern: 'Header / Top Navigation Bar',
    larkon: 'TopBar + SegmentedControl + NotificationDropdown + ProfileDropdown',
    subcomponents:
      'HamburgerToggle, Breadcrumb, SegmentedControl (3×: provozovna / mode / period), IconButton (search, bell), UserDropdown',
    implementation:
      'Topbar shell → Larkon `<TopBar>`. Přepínač provozoven/módu/období → Bootstrap `<ButtonGroup>` nebo Larkon `<SegmentedControl>`. Notifikační zvoneček → `<NotificationDropdown>` s badge počtem. User → `<ProfileDropdown>` s avatarem. Breadcrumb → Bootstrap `<Breadcrumb>` (dva itemy).',
    custom: 'NO',
  },
  {
    component: 'KPIStrip (4× KPI Card)',
    file: 'KPIStrip.tsx',
    pattern: 'KPI / Stat Card',
    larkon: 'StatisticsWidget / KPICard',
    subcomponents:
      'Icon box (barevné pozadí), Label (fs-sm), Velká hodnota (fw-800), Sparkline (7 sloupečků), Trend badge (↑/↓ %)',
    implementation:
      'Larkon `<StatisticsWidget icon="..." value="..." title="..." trendValue="..." trendDirection="up|down">`. Sparkline → ApexCharts typ `line` nebo `bar` s `sparkline: { enabled: true }`, výška ~28px. Icon box → Larkon `<IconBox variant="primary-subtle" icon="...">`. Accent linka nahoře karty → `borderTop` CSS nebo Larkon `Card` s `accent` prop.',
    custom: 'NO',
  },
  {
    component: 'AlertStrip',
    file: 'AlertStrip.tsx',
    pattern: 'Alert / Notification Banner',
    larkon: 'Alert (Bootstrap)',
    subcomponents: 'Alert icon, Message text (strong + inline detail), CTA link/button',
    implementation:
      '`<Alert variant="danger|warning|info" className="d-flex align-items-center">`. Ikona → `<i>` nebo Lucide ikona vlevo. CTA → `<Alert.Link>` vpravo. Více alertů stackovat v `<div className="d-flex flex-column gap-2">`. `alert-err` → `variant="danger"`, `alert-warn` → `variant="warning"`, `alert-info` → `variant="info"`.',
    custom: 'NO',
  },
  {
    component: 'TrzbyWidget (Chart Card)',
    file: 'TrzbyWidget.tsx',
    pattern: 'Chart Card / Chart Widget',
    larkon: 'Card + ApexCharts (grouped bar)',
    subcomponents:
      'CardHeader (title + sub + Live/Závěrka badge), Summary row (3× inline stat), Chart area, Tooltip (hover), Legend, Predikce row',
    implementation:
      'Wrapper → Larkon `<Card>`. Graf → `<ReactApexChart type="bar" options={{ chart: { stacked: false }, plotOptions: { bar: { columnWidth: "60%", grouped: true } } }}>`. Grouped bars: 2 series (Kuchyň, Bar). Tooltip → ApexCharts `custom` tooltip. Live badge → `<Badge className="badge-soft-warning">` s CSS pulsující tečkou.',
    custom: 'YES',
    customReason:
      'SVG chart je ručně kreslený (zadáním povoleno jako fake chart). V produkci → nahradit ApexCharts `type="bar"` grouped series. Zbytek karty je standardní Larkon pattern.',
  },
  {
    component: 'ProvozonySummary',
    file: 'ProvozonySummary.tsx',
    pattern: 'Card + Data Table + Progress Bar',
    larkon: 'Card + Table + Badge + ProgressBar',
    subcomponents:
      'CardHeader (title + badge), Table (th sortable, td s dot+názvem, td číselné hodnoty, td ProgressBar + %, td trend badge, td action button)',
    implementation:
      '`<Card>` + `<Table responsive>`. Dot → `<span className="dot rounded-circle" style={{background: color}}>`. Podíl % → Bootstrap `<ProgressBar variant="primary" now={share} style={{width:60}}>` + inline text. Trend → `<Badge bg={chng>=0?"success":"danger"}>`. Action → `<Button variant="light" size="sm">`. Tfoot total row → `<tfoot>` s `fw-bold`.',
    custom: 'NO',
  },
  {
    component: 'DenniZavierkyPreview',
    file: 'DenniZavierkyPreview.tsx',
    pattern: 'Card + Data Table + Status Badge',
    larkon: 'Card + Table + Badge',
    subcomponents:
      'CardHeader (title + sub + link "Všechny →"), Table (datum, provozovna dot, tržba, status badge, čas, uživatel), CardFooter (info text + action button)',
    implementation:
      '`<Card>` + `<Table>`. Status badge mapování: `ok` → `<Badge bg="success">`, `chyba` → `<Badge bg="danger">`, `ceka` → `<Badge bg="warning" text="dark">`. Dot → inline `<span>`. Footer → `<Card.Footer className="d-flex justify-content-between">` + `<Button>`.',
    custom: 'NO',
  },
  {
    component: 'CashflowPreview',
    file: 'CashflowPreview.tsx',
    pattern: 'Summary Card + Stat List',
    larkon: 'Card + ListGroup + StatRow',
    subcomponents:
      'Zůstatek block (barevný box s velkou hodnotou + badge), 2-col KPI grid (po splatnosti / čekající), StatRow list (pohyby)',
    implementation:
      'Zůstatek → `<div className="p-3 bg-primary bg-opacity-10 rounded">`. Grid 2 KPI → Bootstrap `<Row><Col>` nebo CSS `grid-template-columns: 1fr 1fr`. Pohyby → `<ListGroup variant="flush">` + `<ListGroupItem className="d-flex justify-content-between">`. Kladná hodnota → `text-success`, záporná → výchozí.',
    custom: 'NO',
  },
  {
    component: 'TrzbyTable',
    file: 'TrzbyTable.tsx',
    pattern: 'Interactive Data Table + Tabs',
    larkon: 'Card + Nav Tabs + DataTable + Select + Button',
    subcomponents:
      'CardHeader (title + Form.Select + Export Button), Nav Tabs (Podle dne / Podle provozovny), sortovatelná Table (klik na th), tfoot (součtový řádek)',
    implementation:
      'Tabs → `<Nav variant="tabs" className="card-header-tabs">` uvnitř `<Card.Header>`. Table → Larkon `<DataTable>` nebo vlastní `<Table striped hover>` s client-side sortem. Select → Bootstrap `<Form.Select size="sm">`. Export → `<Button variant="outline-secondary" size="sm"><Download size={14}/> Export</Button>`. Sort ikony → Lucide `<ChevronsUpDown>` / `<ChevronUp>` / `<ChevronDown>`.',
    custom: 'NO',
  },
  {
    component: 'ProvozovnaDrawer',
    file: 'ProvozovnaDrawer.tsx',
    pattern: 'Offcanvas / Slide-in Drawer',
    larkon: 'Offcanvas (Bootstrap placement="end")',
    subcomponents:
      'OffcanvasHeader (dot + title + CloseButton), OffcanvasBody (KPI grid 2×2, mini chart, stat rows, závěrky table), Footer (2× Button)',
    implementation:
      '`<Offcanvas show={open} onHide={onClose} placement="end" style={{width:500}}>`. KPI grid → Bootstrap `<Row><Col>` nebo CSS grid. Mini chart → ApexCharts sparkline bar (výška 80px). Stat rows → `<ListGroup variant="flush">`. Footer → `<div className="offcanvas-footer d-flex gap-2 p-3 border-top">` + 2× `<Button>`.',
    custom: 'NO',
  },
  {
    component: 'PlaceholderView',
    file: 'PlaceholderView.tsx',
    pattern: 'Empty State',
    larkon: 'Empty State (není v Larkonu jako komponenta – triviální implementace)',
    subcomponents: 'Velká ikona (opacity), Nadpis (h4), Popis (p), Badge',
    implementation:
      '`<div className="text-center py-5 my-5">` + `<i className="... display-1 text-muted opacity-25">` + `<h4 className="mt-4">` + `<p className="text-muted">` + `<Badge bg="secondary">`. V Larkonu se přímo nepoužívá – jednoduše implementujete inline.',
    custom: 'YES',
    customReason: 'Není standardní Larkon komponenta. Triviálně implementovatelné (~5 řádků), žádný custom pattern není potřeba.',
  },
];

export default function ComponentReference() {
  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Mapa komponent</h1>
          <p className="page-sub">
            Mapping každé UI komponenty na Larkon / standard admin pattern · vývojová reference
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge-ok" style={{ fontSize: 11, padding: '4px 10px' }}>
            {MAPPINGS.filter((m) => m.custom === 'NO').length} Standard
          </span>
          <span className="badge badge-warn" style={{ fontSize: 11, padding: '4px 10px' }}>
            {MAPPINGS.filter((m) => m.custom === 'YES').length} Custom
          </span>
        </div>
      </div>

      {/* Legend */}
      <div
        className="card section-gap"
        style={{ borderLeft: '4px solid var(--c-info)' }}
      >
        <div className="card-body" style={{ padding: '14px 20px' }}>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="badge badge-ok">NO</span>
              <span className="fs-sm c-2">
                Standardní pattern – přímé použití Larkon komponenty, žádná custom práce
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-warn">YES</span>
              <span className="fs-sm c-2">
                Custom – odchylka od standardu, viz sloupec „Implementace"
              </span>
            </div>
            <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
              <span className="fs-xs c-3">Verze prototypu:</span>
              <span className="fs-xs fw-700">IS Con Gusto v0.1 · React + Vite + TS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Component mapping cards */}
      {MAPPINGS.map((m) => (
        <div
          key={m.component}
          className="card section-gap"
          style={{
            borderLeft: `4px solid ${m.custom === 'YES' ? 'var(--c-warn)' : 'var(--c-ok)'}`,
          }}
        >
          <div className="card-header">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="card-title">{m.component}</span>
                  <span
                    className={`badge ${m.custom === 'YES' ? 'badge-warn' : 'badge-ok'}`}
                  >
                    CUSTOM: {m.custom}
                  </span>
                </div>
                <div className="fs-xs c-2 mt-1" style={{ fontFamily: 'monospace' }}>
                  {m.file}
                </div>
              </div>
            </div>

            {/* Pattern tag */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="badge badge-info"
                style={{ fontSize: 11 }}
              >
                {m.pattern}
              </span>
            </div>
          </div>

          <div
            className="card-body"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              padding: '16px 20px',
            }}
          >
            {/* Larkon ekvivalent */}
            <div>
              <div className="drawer-section-title mb-2">Larkon ekvivalent</div>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  padding: '10px 14px',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: 'var(--c-info)',
                  fontWeight: 600,
                  lineHeight: 1.6,
                }}
              >
                {m.larkon}
              </div>
            </div>

            {/* Sub-components */}
            <div>
              <div className="drawer-section-title mb-2">Sub-komponenty</div>
              <div className="fs-sm c-2" style={{ lineHeight: 1.6 }}>
                {m.subcomponents}
              </div>
            </div>

            {/* Implementation – full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="drawer-section-title mb-2">Implementace v Larkonu</div>
              <div
                style={{
                  background: m.custom === 'YES' ? '#fffbeb' : '#f8fafc',
                  border: `1px solid ${m.custom === 'YES' ? '#fcd34d' : 'var(--border)'}`,
                  borderRadius: 'var(--r-md)',
                  padding: '12px 16px',
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: 'var(--text-1)',
                }}
              >
                {m.implementation}
                {m.customReason && (
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '1px solid #fcd34d',
                      color: 'var(--c-warn-text)',
                      fontWeight: 600,
                    }}
                  >
                    ⚠ Důvod custom: {m.customReason}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Summary table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Přehled – všechny komponenty</div>
          <span className="badge badge-neutral">{MAPPINGS.length} komponent</span>
        </div>
        <div className="table-wrap">
          <table className="dtable">
            <thead>
              <tr>
                <th>#</th>
                <th>Komponenta</th>
                <th>Soubor</th>
                <th>Pattern</th>
                <th>Larkon ekvivalent</th>
                <th className="td-r">Custom</th>
              </tr>
            </thead>
            <tbody>
              {MAPPINGS.map((m, i) => (
                <tr key={m.component}>
                  <td className="td-muted td-mono">{String(i + 1).padStart(2, '0')}</td>
                  <td className="fw-600">{m.component}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--c-info)' }}>
                    {m.file}
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontSize: 10 }}>
                      {m.pattern}
                    </span>
                  </td>
                  <td className="fs-sm c-2">{m.larkon}</td>
                  <td className="td-r">
                    <span
                      className={`badge ${m.custom === 'YES' ? 'badge-warn' : 'badge-ok'}`}
                    >
                      {m.custom}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc' }}>
                <td colSpan={5} className="fw-600">
                  Celkem standard / custom
                </td>
                <td className="td-r">
                  <span className="badge badge-ok" style={{ marginRight: 4 }}>
                    {MAPPINGS.filter((m) => m.custom === 'NO').length} NO
                  </span>
                  <span className="badge badge-warn">
                    {MAPPINGS.filter((m) => m.custom === 'YES').length} YES
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
