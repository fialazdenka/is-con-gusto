// COMPONENT: Pohledávky Widget – kompaktní přehled pro dashboard
// SOURCE: Larkon _card.scss + Bootstrap utilities
// CUSTOM: NO

import {
  getPohledavkyForProvozovna,
  getCelkemAktivni,
  getCelkemPoSplatnosti,
  getDniPoSplatnosti,
  STAV_META_POH,
} from '../pohledavkyData';
import { fCzk, fDate } from '../data';
import type { ProvozovnaId } from '../types';

interface Props {
  provozovna: ProvozovnaId;
  onNavigate: () => void;
}

export default function PohledavkyWidget({ provozovna, onNavigate }: Props) {
  const vsechny     = getPohledavkyForProvozovna(provozovna);
  const aktivni     = vsechny.filter((p) => p.stav !== 'uhrazena');
  const poSplatnosti = vsechny.filter((p) =>
    ['po-splatnosti', 'upominka-1', 'upominka-2', 'predžalobni'].includes(p.stav)
  );
  const ocekavane   = vsechny.filter((p) => p.stav === 'odeslana' || p.stav === 'vystavena');
  const neodeslane  = vsechny.filter((p) => p.stav === 'vystavena');

  const celkemAktivni      = getCelkemAktivni(provozovna);
  const celkemPoSplatnosti = getCelkemPoSplatnosti(provozovna);
  const celkemOcekavane    = ocekavane.reduce((s, p) => s + p.castka, 0);

  // Top 3 nejdéle po splatnosti
  const topOverdue = [...poSplatnosti]
    .sort((a, b) => getDniPoSplatnosti(b.splatnost) - getDniPoSplatnosti(a.splatnost))
    .slice(0, 3);

  return (
    <div className="card h-100">
      {/* Header */}
      <div className="card-header d-flex align-items-center justify-content-between">
        <h5 className="card-title mb-0 d-flex align-items-center gap-2">
          <iconify-icon icon="solar:bill-list-bold-duotone" style={{ fontSize: 20, color: 'var(--prov-color, #c9911a)' }} />
          Pohledávky
        </h5>
        <button className="btn btn-link btn-sm text-muted p-0 fs-12" onClick={onNavigate}>
          Zobrazit vše →
        </button>
      </div>

      <div className="card-body p-0">
        {/* 3 metriky */}
        <div className="row g-0 border-bottom">
          {[
            { label: 'Celkem aktivní',   value: fCzk(celkemAktivni),      count: aktivni.length,       color: 'var(--prov-color, #c9911a)' },
            { label: 'Po splatnosti',    value: fCzk(celkemPoSplatnosti),  count: poSplatnosti.length,  color: '#ef4444' },
            { label: 'Očekáváno',        value: fCzk(celkemOcekavane),     count: ocekavane.length,     color: '#1c84ee' },
          ].map((m, i) => (
            <div key={m.label} className={`col-4 p-3 text-center${i < 2 ? ' border-end' : ''}`}>
              <div className="fw-bold font-monospace fs-14" style={{ color: m.color }}>{m.value}</div>
              <div className="text-muted fs-11 mt-1">{m.label}</div>
              <div className="text-muted fs-11">({m.count} fakt.)</div>
            </div>
          ))}
        </div>

        {/* Upozornění: neodesláno */}
        {neodeslane.length > 0 && (
          <div className="px-3 py-2 border-bottom d-flex align-items-center gap-2"
            style={{ background: '#fdf3dc' }}>
            <iconify-icon icon="solar:letter-bold-duotone" style={{ fontSize: 14, color: 'var(--prov-color, #c9911a)', flexShrink: 0 }} />
            <span className="fs-12" style={{ color: 'var(--prov-color, #c9911a)' }}>
              <strong>{neodeslane.length} faktur</strong> ještě nebylo odesláno klientovi
            </span>
            <button className="btn btn-link btn-sm p-0 ms-auto fs-11 fw-semibold" style={{ color: 'var(--prov-color, #c9911a)' }}
              onClick={onNavigate}>
              Odeslat →
            </button>
          </div>
        )}

        {/* Top overdue list */}
        {topOverdue.length > 0 ? (
          <div>
            <div className="px-3 pt-3 pb-1 text-uppercase text-muted fs-11 fw-semibold">
              Nejstarší po splatnosti
            </div>
            {topOverdue.map((p) => {
              const { cls, label } = STAV_META_POH[p.stav];
              const dni = getDniPoSplatnosti(p.splatnost);
              return (
                <div key={p.id}
                  className="px-3 py-2 border-bottom d-flex align-items-center gap-2"
                  style={{ cursor: 'pointer' }}
                  onClick={onNavigate}>
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-semibold fs-13 text-truncate">{p.klient}</div>
                    <div className="text-muted fs-12">{fDate(p.splatnost)} · {dni} dní po splatnosti</div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <div className="fw-bold font-monospace fs-13">{fCzk(p.castka)}</div>
                    <span className={`badge ${cls} fs-10`}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-muted fs-13">
            <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 28, color: '#14b8a6', opacity: 0.6 }} className="d-block mx-auto mb-2" />
            Žádné pohledávky po splatnosti
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="card-footer py-2 bg-light bg-opacity-50">
        <div className="d-flex justify-content-between align-items-center fs-12 text-muted">
          <span>{aktivni.length} aktivních pohledávek · celkem {fCzk(celkemAktivni)}</span>
          <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={onNavigate}>
            Správa pohledávek →
          </button>
        </div>
      </div>
    </div>
  );
}
