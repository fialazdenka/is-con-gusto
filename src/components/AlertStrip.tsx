// COMPONENT: Alert Strip — Notification Banner
// SOURCE: Larkon _alert.scss + Bootstrap alert component
// CUSTOM: NO
//
// Larkon class mapping:
//   .alert.alert-danger.d-flex.align-items-center  → error strip
//   .alert.alert-warning.d-flex.align-items-center → warning strip
//   .alert-link.fw-semibold.ms-auto                → CTA link

import type { ProvozovnaId } from '../types';
import { DENNI_ZAVIERKY } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  onNavigate: () => void;
}

export default function AlertStrip({ provozovna, onNavigate }: Props) {
  const chyba = DENNI_ZAVIERKY.filter(
    (z) =>
      z.stav === 'chyba' &&
      (provozovna === 'all' || z.provozovna === provozovna)
  );

  const ceka = DENNI_ZAVIERKY.filter(
    (z) =>
      z.stav === 'ceka' &&
      (provozovna === 'all' || z.provozovna === provozovna)
  );

  if (chyba.length === 0 && ceka.length === 0) return null;

  return (
    <div className="d-flex flex-column gap-2 mb-4">
      {/* SOURCE: Bootstrap .alert.alert-danger */}
      {chyba.length > 0 && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-0">
          <iconify-icon icon="solar:danger-triangle-bold-duotone" style={{ fontSize: 26, flexShrink: 0 }} />
          <span className="flex-grow-1">
            <strong>{chyba.length} závěrka{chyba.length > 1 ? 'y' : ''} s chybou</strong>
            {' — '}
            {chyba.map((z, i) => (
              <span key={z.id}>
                {i > 0 && ', '}
                {z.provozovna} ({z.poznamka || 'nesoulad'})
              </span>
            ))}
          </span>
          <span
            className="alert-link fw-semibold text-nowrap ms-auto"
            style={{ cursor: 'pointer' }}
            onClick={onNavigate}
          >
            Zobrazit →
          </span>
        </div>
      )}

      {/* SOURCE: Bootstrap .alert.alert-warning */}
      {ceka.length > 0 && (
        <div className="alert alert-warning d-flex align-items-center gap-2 mb-0">
          <iconify-icon icon="solar:clock-circle-bold-duotone" style={{ fontSize: 26, flexShrink: 0 }} />
          <span className="flex-grow-1">
            <strong>{ceka.length} závěrka{ceka.length > 1 ? 'y' : ''} čeká</strong>
            {' na doplnění'}
          </span>
          <span
            className="alert-link fw-semibold text-nowrap ms-auto"
            style={{ cursor: 'pointer' }}
            onClick={onNavigate}
          >
            Doplnit →
          </span>
        </div>
      )}
    </div>
  );
}
