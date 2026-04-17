// ─────────────────────────────────────────────────────────────
// COMPONENT: Denní závěrky Preview — Card + Data Table
// SOURCE:    Larkon-like → Card + Table + Badge
// CUSTOM:    NO
//
// LARKON MAPPING:
//   Outer:      <Card>
//   Header:     <Card.Header> + <Button variant="link" size="sm">Všechny →
//   Table:      <Table responsive hover>
//   Datum:      <td className="text-muted"> — fDate() helper
//   Provozovna: dot <span> + text, stejně jako ProvozonySummary
//   Status badge mapování:
//     'ok'    → <Badge bg="success">✓ OK</Badge>
//     'chyba' → <Badge bg="danger">✗ Chyba</Badge>
//     'ceka'  → <Badge bg="warning" text="dark">⏳ Čeká</Badge>
//   Footer:     <Card.Footer className="d-flex justify-content-between
//                 align-items-center"> + info text + <Button>
// ─────────────────────────────────────────────────────────────

import type { ProvozovnaId, ZavierkaStav } from '../types';
import { DENNI_ZAVIERKY, PROVOZOVNY, fCzk, fDate } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  onNavigate: () => void;
}

const STAV_BADGE: Record<ZavierkaStav, { cls: string; label: string }> = {
  ok:    { cls: 'badge-ok',   label: '✓ OK' },
  chyba: { cls: 'badge-err',  label: '✗ Chyba' },
  ceka:  { cls: 'badge-warn', label: '⏳ Čeká' },
};

export default function DenniZavierkyPreview({ provozovna, onNavigate }: Props) {
  const rows = DENNI_ZAVIERKY.filter(
    (z) => provozovna === 'all' || z.provozovna === provozovna
  ).slice(0, 9);

  const getProvName = (id: string) =>
    PROVOZOVNY.find((p) => p.id === id)?.shortName ?? id;

  const getProvColor = (id: string) =>
    PROVOZOVNY.find((p) => p.id === id)?.color ?? '#94a3b8';

  return (
    // COMPONENT: Card + Data Table
    // SOURCE: Larkon-like
    // CUSTOM: NO
    <div className="card section-gap">
      <div className="card-header">
        <div className="card-title-wrap">
          <div className="card-title">Denní závěrky</div>
          <div className="card-sub">Posledních {rows.length} záznamů</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onNavigate}>
          Všechny →
        </button>
      </div>

      <div className="table-wrap">
        <table className="dtable">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Provozovna</th>
              <th className="td-r">Tržba</th>
              <th>Stav</th>
              <th>Čas</th>
              <th>Vložil</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((z) => {
              const { cls, label } = STAV_BADGE[z.stav];
              return (
                <tr key={z.id}>
                  <td className="td-muted">{fDate(z.datum)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className="prov-dot"
                        style={{ background: getProvColor(z.provozovna) }}
                      />
                      {getProvName(z.provozovna)}
                    </div>
                  </td>
                  <td className="td-r td-mono fw-600">{fCzk(z.trzba)}</td>
                  <td>
                    <span className={`badge ${cls}`}>{label}</span>
                  </td>
                  <td className="td-muted td-mono">{z.cas}</td>
                  <td className="td-muted">{z.zalozil}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card-footer">
        <div className="fs-xs c-2">
          {DENNI_ZAVIERKY.filter((z) => z.stav === 'chyba').length > 0 && (
            <span className="c-err fw-600">
              {DENNI_ZAVIERKY.filter((z) => z.stav === 'chyba').length} chybná závěrka ·{' '}
            </span>
          )}
          {DENNI_ZAVIERKY.filter((z) => z.stav === 'ceka').length} čeká na doplnění
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onNavigate}>
          Správa závěrek
        </button>
      </div>
    </div>
  );
}
