// ─────────────────────────────────────────────────────────────
// COMPONENT: Cashflow Preview — Summary Card + Stat List
// SOURCE:    Larkon-like → Card + ListGroup + StatRow
// CUSTOM:    NO
//
// LARKON MAPPING:
//   Outer:       <Card>
//   Zůstatek:    <div className="p-3 bg-primary bg-opacity-10 rounded mb-3">
//                  + <h3 className="text-primary fw-bold"> + <Badge>
//   KPI grid:    <Row className="g-3 mb-3">
//     Po splat:  <Col><div className="p-3 bg-danger bg-opacity-10 rounded">
//     Čekající:  <Col><div className="p-3 bg-warning bg-opacity-10 rounded">
//   Pohyby:      <ListGroup variant="flush">
//     Each item: <ListGroupItem className="d-flex justify-content-between
//                  align-items-center px-0">
//     Kladná:    className="text-success fw-bold"
//     Záporná:   className="fw-bold"
//   Section tit: <div className="text-uppercase fw-semibold text-muted
//                  fs-11 mb-2">
// ─────────────────────────────────────────────────────────────

import { CASHFLOW_ITEMS, FAKTURY, ZUSTATEK_UCET, fCzk, fDate } from '../data';

interface Props {
  onNavigate: () => void;
}

export default function CashflowPreview({ onNavigate }: Props) {
  const poSplatnosti = FAKTURY.filter((f) => f.stav === 'po-splatnosti');
  const cekajici     = FAKTURY.filter((f) => f.stav === 'ceka');

  const sumaPoSplatnosti = poSplatnosti.reduce((s, f) => s + f.castka, 0);
  const sumaCekajici     = cekajici.reduce((s, f) => s + f.castka, 0);

  return (
    // COMPONENT: Card (Cashflow + Faktury summary)
    // SOURCE: Larkon-like
    // CUSTOM: NO
    <div className="card section-gap">
      <div className="card-header">
        <div className="card-title-wrap">
          <div className="card-title">Cashflow & Faktury</div>
          <div className="card-sub">Stav k dnešnímu dni</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onNavigate}>
          Detail →
        </button>
      </div>

      <div className="card-body" style={{ paddingBottom: 12 }}>
        {/* Zůstatek */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '12px 16px',
            background: 'var(--c-info-bg)',
            borderRadius: 'var(--r-md)',
            marginBottom: 16,
          }}
        >
          <div>
            <div className="fs-xs c-2 mb-1">Zůstatek na účtu</div>
            <div className="fs-2xl fw-700 fv-mono" style={{ color: 'var(--c-info)' }}>
              {fCzk(ZUSTATEK_UCET)}
            </div>
          </div>
          <span className="badge badge-info">Aktuální</span>
        </div>

        {/* Faktury stats */}
        <div className="grid-2 mb-4">
          <div
            className="flex flex-col gap-1"
            style={{
              padding: '12px 14px',
              background: 'var(--c-err-bg)',
              borderRadius: 'var(--r-md)',
            }}
          >
            <div className="fs-xs" style={{ color: 'var(--c-err-text)', fontWeight: 600 }}>
              Po splatnosti
            </div>
            <div className="fs-lg fw-700 fv-mono" style={{ color: 'var(--c-err)' }}>
              {fCzk(sumaPoSplatnosti)}
            </div>
            <div className="fs-xs c-2">{poSplatnosti.length} faktura</div>
          </div>
          <div
            className="flex flex-col gap-1"
            style={{
              padding: '12px 14px',
              background: 'var(--c-warn-bg)',
              borderRadius: 'var(--r-md)',
            }}
          >
            <div className="fs-xs" style={{ color: 'var(--c-warn-text)', fontWeight: 600 }}>
              Čekající platby
            </div>
            <div className="fs-lg fw-700 fv-mono" style={{ color: 'var(--c-warn)' }}>
              {fCzk(sumaCekajici)}
            </div>
            <div className="fs-xs c-2">{cekajici.length} faktury</div>
          </div>
        </div>

        {/* Recent cashflow items */}
        <div className="drawer-section-title mb-3">Poslední pohyby</div>
        {CASHFLOW_ITEMS.slice(0, 4).map((item) => (
          <div key={item.id} className="stat-row">
            <div className="stat-row-left">
              <span style={{ fontSize: 14 }}>
                {item.typ === 'prijem' ? '↑' : '↓'}
              </span>
              <span className="fs-sm">{item.popis}</span>
            </div>
            <div className="stat-row-right">
              <div
                className="stat-row-val"
                style={{ color: item.typ === 'prijem' ? 'var(--c-ok)' : 'var(--text-1)' }}
              >
                {item.typ === 'prijem' ? '+' : '−'} {fCzk(item.castka)}
              </div>
              <div className="stat-row-sub">{fDate(item.datum)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
