// ─────────────────────────────────────────────────────────────
// COMPONENT: Alert Strip — Notification Banner
// SOURCE:    standard admin pattern → Bootstrap Alert
// CUSTOM:    NO
//
// LARKON MAPPING:
//   Each strip: <Alert variant="danger|warning|info"
//                 className="d-flex align-items-center gap-3 mb-2">
//   Icon:       <i className="ri-error-warning-line fs-5 flex-shrink-0">
//   Message:    <span className="flex-grow-1"> s <strong>
//   CTA link:   <Alert.Link className="fw-bold text-nowrap ms-auto">
//   Container:  <div className="d-flex flex-column gap-2 mb-4">
//   Podmíněné renderování: {chyba.length > 0 && <Alert ...>}
// ─────────────────────────────────────────────────────────────

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
    <div className="section-gap">
      {chyba.length > 0 && (
        <div className="alert-strip alert-err">
          <span className="alert-icon">⚠</span>
          <span className="alert-msg">
            <strong>{chyba.length} závěrka{chyba.length > 1 ? 'y' : ''} s chybou</strong>
            {' — '}
            {chyba.map((z, i) => (
              <span key={z.id}>
                {i > 0 && ', '}
                {z.provozovna} ({z.poznamka || 'nesoulad'})
              </span>
            ))}
          </span>
          <span className="alert-cta" onClick={onNavigate}>
            Zobrazit →
          </span>
        </div>
      )}

      {ceka.length > 0 && (
        <div className="alert-strip alert-warn">
          <span className="alert-icon">⏳</span>
          <span className="alert-msg">
            <strong>{ceka.length} závěrka{ceka.length > 1 ? 'y' : ''} čeká</strong>
            {' na doplnění'}
          </span>
          <span className="alert-cta" onClick={onNavigate}>
            Doplnit →
          </span>
        </div>
      )}
    </div>
  );
}
