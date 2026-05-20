import { useState } from 'react';
import type { ProvozovnaId } from '../types';
import { getOstatniForProvozovna, OSTPLATBA_LABELS, isPoSplatnosti } from '../platbyData';
import { PROVOZOVNY, fCzk, fDate } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  periodOd: string;
  periodDo: string;
}

const TYP_IKONY: Record<string, string> = {
  'trv-prikaz':    'solar:refresh-bold-duotone',
  'splatka-uveru': 'solar:bank-bold-duotone',
  'poplatek':      'solar:bill-bold-duotone',
  'vyplata':       'solar:user-bold-duotone',
  'dalsi':         'solar:document-bold-duotone',
};

export default function DalsiPlatbyPanel({ provozovna, periodOd, periodDo }: Props) {
  const [open, setOpen] = useState(true);

  const platby  = getOstatniForProvozovna(provozovna).filter(
    (o) => o.datum >= periodOd && o.datum <= periodDo
  );
  const celkem  = platby.reduce((s, o) => s + o.castka, 0);

  const getProvName  = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.shortName ?? id;
  const getProvColor = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.color ?? '#94a3b8';

  return (
    <div className="card mb-4">
      <div
        className="card-header d-flex align-items-center justify-content-between"
        style={{ cursor: 'pointer' }}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="d-flex align-items-center gap-2">
          <h5 className="card-title mb-0">Ostatní platby v období</h5>
          <span className="badge bg-secondary-subtle text-secondary">{platby.length} položek</span>
          <span className="text-muted fs-12">· automatické odchozí platby</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span className="fw-bold czk-num">{fCzk(celkem)}</span>
          <iconify-icon
            icon={open ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
            className="text-muted"
          />
        </div>
      </div>

      {open && (
        <div className="table-responsive">
          <table className="table table-hover table-centered table-nowrap mb-0">
            <thead className="table-light">
              <tr>
                <th>Typ</th>
                <th>Popis</th>
                {provozovna === 'all' && <th>Provoz</th>}
                <th className="text-end">Částka</th>
                <th>Datum</th>
                <th>Periodicita</th>
              </tr>
            </thead>
            <tbody>
              {platby.length === 0 && (
                <tr>
                  <td colSpan={provozovna === 'all' ? 6 : 5} className="text-center py-4 text-muted">
                    V tomto období nejsou žádné automatické platby
                  </td>
                </tr>
              )}
              {platby.map((o) => {
                const poSpl = isPoSplatnosti(o.datum);
                return (
                  <tr key={o.id} className={poSpl ? 'table-danger' : ''}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <iconify-icon icon={TYP_IKONY[o.typ] ?? 'solar:document-bold-duotone'} className="text-muted" />
                        <span className="badge bg-secondary-subtle text-secondary fs-11">
                          {OSTPLATBA_LABELS[o.typ]}
                        </span>
                      </div>
                    </td>
                    <td className="fw-semibold">{o.popis}</td>
                    {provozovna === 'all' && (
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="rounded-circle d-inline-block flex-shrink-0"
                            style={{ width: 8, height: 8, background: getProvColor(o.provozovna) }}
                          />
                          <span className="fs-13">{getProvName(o.provozovna)}</span>
                        </div>
                      </td>
                    )}
                    <td className="text-end czk-num fw-bold">{fCzk(o.castka)}</td>
                    <td>
                      <span className={poSpl ? 'text-danger fw-bold' : 'text-muted'}>
                        {fDate(o.datum)}
                      </span>
                      {poSpl && <div className="text-danger fs-11 fw-bold">PO SPLATNOSTI</div>}
                    </td>
                    <td className="text-muted fs-13">{o.periodicita ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            {platby.length > 0 && (
              <tfoot>
                <tr className="fw-bold table-light">
                  <td colSpan={provozovna === 'all' ? 3 : 2}>Celkem automatické platby</td>
                  <td className="text-end czk-num">{fCzk(celkem)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
