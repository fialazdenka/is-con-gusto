// COMPONENT: Ostatní platby v období – Collapsible panel
// SOURCE: Larkon-like → Card + Accordion + ListGroup
// CUSTOM: NO

import { useState } from 'react';
import type { ProvozovnaId } from '../types';
import { getOstatniForProvozovna, OSTPLATBA_LABELS, isPoSplatnosti } from '../platbyData';
import { PROVOZOVNY, fCzk, fDate } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  periodOd: string;
  periodDo: string;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

const TYP_IKONY: Record<string, string> = {
  'trv-prikaz':    '🔄',
  'splatka-uveru': '🏦',
  'poplatek':      '💶',
  'vyplata':       '👤',
  'dalsi':         '📋',
};

export default function DalsiPlatbyPanel({
  provozovna,
  periodOd,
  periodDo,
  selectedIds,
  onToggle,
}: Props) {
  const [open, setOpen] = useState(true);

  const platby = getOstatniForProvozovna(provozovna).filter(
    (o) => o.datum >= periodOd && o.datum <= periodDo
  );

  const celkem = platby.reduce((s, o) => s + o.castka, 0);
  const vybrano = platby.filter((o) => selectedIds.has(o.id));
  const vybranoSum = vybrano.reduce((s, o) => s + o.castka, 0);

  const getProvName  = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.shortName ?? id;
  const getProvColor = (id: string) => PROVOZOVNY.find((p) => p.id === id)?.color ?? '#94a3b8';

  return (
    // COMPONENT: Card + Accordion (Collapsible section)
    // SOURCE: Larkon-like → Card + Accordion / CollapseToggle
    // CUSTOM: NO
    <div className="card section-gap">
      {/* Collapsible header */}
      <div
        className="collapsible-toggle"
        onClick={() => setOpen((o) => !o)}
        style={{ paddingBottom: open ? 0 : undefined }}
      >
        <div className="flex items-center gap-3">
          <span className="fw-700 fs-md">Ostatní platby v období</span>
          <span className="badge badge-neutral">{platby.length} položek</span>
          {vybrano.length > 0 && (
            <span className="badge badge-warn">{vybrano.length} zahrnuto</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="fw-700 fv-mono fs-md">{fCzk(celkem)}</span>
          {vybranoSum > 0 && (
            <span className="fs-sm c-2 fv-mono">(vybráno: {fCzk(vybranoSum)})</span>
          )}
          <span className={`collapsible-arrow${open ? ' open' : ''}`}>▾</span>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div className="table-wrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>Zahrnout</th>
                  <th>Typ</th>
                  <th>Popis</th>
                  {provozovna === 'all' && <th>Provoz</th>}
                  <th className="td-r">Částka</th>
                  <th>Datum</th>
                  <th>Periodicita</th>
                </tr>
              </thead>
              <tbody>
                {platby.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-3)' }}>
                      V tomto období nejsou žádné ostatní platby
                    </td>
                  </tr>
                )}
                {platby.map((o) => {
                  const poSpl  = isPoSplatnosti(o.datum);
                  const vybran = selectedIds.has(o.id);
                  return (
                    <tr
                      key={o.id}
                      style={{ background: vybran ? '#eff6ff' : poSpl ? '#fff8f8' : undefined, cursor: 'pointer' }}
                      onClick={() => onToggle(o.id)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={vybran}
                          onChange={() => onToggle(o.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span>{TYP_IKONY[o.typ] ?? '📋'}</span>
                          <span className="badge badge-neutral fs-xs">
                            {OSTPLATBA_LABELS[o.typ]}
                          </span>
                        </div>
                      </td>
                      <td className="fw-500">{o.popis}</td>
                      {provozovna === 'all' && (
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="prov-dot" style={{ background: getProvColor(o.provozovna) }} />
                            <span className="fs-sm">{getProvName(o.provozovna)}</span>
                          </div>
                        </td>
                      )}
                      <td className="td-r td-mono fw-700">{fCzk(o.castka)}</td>
                      <td>
                        <span className={poSpl ? 'c-err fw-700' : 'c-2'}>
                          {fDate(o.datum)}
                        </span>
                        {poSpl && <div className="fs-xs c-err fw-600">PO SPLATNOSTI</div>}
                      </td>
                      <td className="c-2 fs-sm">{o.periodicita ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              {platby.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={provozovna === 'all' ? 4 : 3} className="fw-700">
                      Celkem ostatní platby
                    </td>
                    <td className="td-r td-mono fw-700">{fCzk(celkem)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
