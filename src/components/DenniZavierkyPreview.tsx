// COMPONENT: Denní závěrky Preview — Card + Data Table
// SOURCE: Larkon _card.scss + _tables.scss + _badge.scss
// CUSTOM: NO
//
// Larkon class mapping:
//   .card                             → karta
//   .card-header                      → hlavička
//   .card-title                       → titulek
//   .table.table-hover.table-centered.table-nowrap → tabulka
//   .badge.bg-success-subtle.text-success → OK
//   .badge.bg-danger-subtle.text-danger   → Chyba
//   .badge.bg-warning-subtle.text-warning → Čeká
//   .card-footer.bg-light.bg-opacity-50  → patička

import type { ProvozovnaId, ZavierkaStav } from '../types';
import { DENNI_ZAVIERKY, PROVOZOVNY, fCzk, fDate } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  onNavigate: () => void;
}

const STAV_BADGE: Record<ZavierkaStav, { cls: string; label: string }> = {
  ok:    { cls: 'bg-success-subtle text-success', label: '✓ OK' },
  chyba: { cls: 'bg-danger-subtle text-danger',   label: '✗ Chyba' },
  ceka:  { cls: 'bg-warning-subtle text-warning', label: '⏳ Čeká' },
};

export default function DenniZavierkyPreview({ provozovna, onNavigate }: Props) {
  const rows = DENNI_ZAVIERKY.filter(
    (z) => provozovna === 'all' || z.provozovna === provozovna
  ).slice(0, 9);

  const getProvName  = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.shortName ?? id;
  const getProvColor = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.color ?? '#94a3b8';

  const chybaCnt = DENNI_ZAVIERKY.filter((z) => z.stav === 'chyba').length;
  const cekaCnt  = DENNI_ZAVIERKY.filter((z) => z.stav === 'ceka').length;

  return (
    <div className="card mb-4">
      {/* SOURCE: Larkon .card-header */}
      <div className="card-header d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0">
          Denní závěrky
          <small className="text-muted fw-normal ms-2 fs-13">Posledních {rows.length} záznamů</small>
        </h5>
        <button className="btn btn-light btn-sm" onClick={onNavigate}>
          Všechny →
        </button>
      </div>

      {/* SOURCE: Larkon .table.table-hover.table-centered.table-nowrap */}
      <div className="table-responsive">
        <table className="table table-hover table-centered table-nowrap mb-0">
          <thead className="table-light">
            <tr>
              <th>Datum</th>
              <th>Provozovna</th>
              <th className="text-end">Tržba</th>
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
                  <td className="text-muted">{fDate(z.datum)}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className="rounded-circle d-inline-block flex-shrink-0"
                        style={{ width: 8, height: 8, background: getProvColor(z.provozovna) }}
                      />
                      {getProvName(z.provozovna)}
                    </div>
                  </td>
                  <td className="text-end font-monospace fw-semibold">{fCzk(z.trzba)}</td>
                  <td>
                    {/* SOURCE: Larkon .badge.bg-{color}-subtle.text-{color} */}
                    <span className={`badge ${cls}`}>{label}</span>
                  </td>
                  <td className="text-muted font-monospace">{z.cas}</td>
                  <td className="text-muted">{z.zalozil}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SOURCE: Larkon .card-footer.py-2.bg-light.bg-opacity-50 */}
      <div className="card-footer py-2 bg-light bg-opacity-50">
        <div className="d-flex align-items-center justify-content-between">
          <span className="text-muted fs-12">
            {chybaCnt > 0 && (
              <span className="text-danger fw-semibold me-2">
                {chybaCnt} chybná závěrka ·
              </span>
            )}
            {cekaCnt} čeká na doplnění
          </span>
          <button className="btn btn-light btn-sm" onClick={onNavigate}>
            Správa závěrek
          </button>
        </div>
      </div>
    </div>
  );
}
