// COMPONENT: Platby Detail Panel – platební workflow detail + audit timeline
// SOURCE: Larkon offcanvas pattern + Bootstrap utilities
// CUSTOM: YES – audit timeline, bank status, payment workflow actions

import type { FakturaPlatby, FakturaStavPlatby } from '../platbyData';
import {
  KATEGORIE_LABELS, getPlatbyAudit, getBankovniUcet,
} from '../platbyData';
import { PROVOZOVNY, fCzk, fDate } from '../data';

interface Props {
  faktura: FakturaPlatby;
  onClose: () => void;
  onOdeslatDoBanky?: (id: string) => void;
  onPozastavit?: (id: string) => void;
  onObnovit?: (id: string) => void;
}

const STAV_META: Record<FakturaStavPlatby, { cls: string; label: string; icon: string }> = {
  nova:                { cls: 'bg-secondary-subtle text-secondary', label: 'Nová',                  icon: 'solar:document-bold-duotone' },
  'ke-schvaleni':      { cls: 'bg-warning-subtle text-warning',     label: 'Ke schválení',          icon: 'solar:clock-circle-bold-duotone' },
  schvalena:           { cls: 'bg-success-subtle text-success',     label: 'Schválená',             icon: 'solar:check-circle-bold-duotone' },
  zamitnuta:           { cls: 'bg-danger-subtle text-danger',       label: 'Zamítnutá',             icon: 'solar:close-circle-bold-duotone' },
  zastavena:           { cls: 'bg-danger-subtle text-danger',       label: 'Zastavená',             icon: 'solar:pause-circle-bold-duotone' },
  odeslana:            { cls: 'bg-info-subtle text-info',           label: 'Odeslaná',              icon: 'solar:arrow-right-up-bold-duotone' },
  zaplacena:           { cls: 'bg-success-subtle text-success',     label: 'Zaplacená',             icon: 'solar:check-square-bold-duotone' },
  'v-bance':           { cls: 'bg-info-subtle text-info',           label: 'V bance',               icon: 'solar:bank-bold-duotone' },
  'ceka-na-sparovani': { cls: 'platby-stav-sparovani',              label: 'Čeká na spárování',     icon: 'solar:refresh-circle-bold-duotone' },
  'chyba-platby':      { cls: 'platby-stav-chyba',                  label: 'Platba neproběhla',          icon: 'solar:danger-circle-bold-duotone' },
};

const AUDIT_IKONY: Record<string, string> = {
  vytvorena:           'solar:document-add-bold-duotone',
  prirazen:            'solar:user-id-bold-duotone',
  schvalena:           'solar:check-circle-bold-duotone',
  zamitnuta:           'solar:close-circle-bold-duotone',
  zastavena:           'solar:pause-circle-bold-duotone',
  'odeslana-do-banky': 'solar:arrow-right-up-bold-duotone',
  'v-bance':           'solar:bank-bold-duotone',
  sparovana:           'solar:check-square-bold-duotone',
  chyba:               'solar:danger-circle-bold-duotone',
  obnovena:            'solar:refresh-bold-duotone',
};

const AUDIT_BARVY: Record<string, string> = {
  vytvorena:           '#9097a7',
  prirazen:            '#c9911a',
  schvalena:           '#198754',
  zamitnuta:           '#dc3545',
  zastavena:           '#dc3545',
  'odeslana-do-banky': '#0d6efd',
  'v-bance':           '#0dcaf0',
  sparovana:           '#198754',
  chyba:               '#dc3545',
  obnovena:            '#0d6efd',
};

export default function PlatbyDetailPanel({ faktura, onClose, onOdeslatDoBanky, onPozastavit, onObnovit }: Props) {
  const provName  = PROVOZOVNY.find((p) => p.id === faktura.provozovna)?.shortName ?? faktura.provozovna;
  const provColor = PROVOZOVNY.find((p) => p.id === faktura.provozovna)?.color ?? '#94a3b8';
  const audit     = getPlatbyAudit(faktura.id);
  const ucet      = getBankovniUcet(faktura.provozovna);
  const { cls, label, icon } = STAV_META[faktura.stav] ?? STAV_META['nova'];

  const isInBank    = faktura.stav === 'v-bance' || faktura.stav === 'ceka-na-sparovani';
  const isChyba     = faktura.stav === 'chyba-platby';
  const isAktivni   = faktura.stav === 'schvalena';
  const isZastavena = faktura.stav === 'zastavena';

  return (
    <>
      <div className="offcanvas-backdrop fade show" onClick={onClose} style={{ zIndex: 200 }} />
      <div className="offcanvas offcanvas-end show" style={{ width: 'min(540px, 100vw)', zIndex: 300 }} role="dialog">

        {/* Header */}
        <div className="offcanvas-header border-bottom">
          <div className="flex-grow-1 min-width-0">
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className={`badge ${cls}`}>
                <iconify-icon icon={icon} className="me-1" style={{ fontSize: 12 }} />
                {label}
              </span>
              <span className="text-muted fs-12 font-monospace">{faktura.cislo}</span>
            </div>
            <h5 className="mb-0 text-truncate">{faktura.dodavatel}</h5>
          </div>
          <button className="btn-close ms-3" onClick={onClose} />
        </div>

        {/* Body */}
        <div className="offcanvas-body p-0 d-flex flex-column" style={{ overflowY: 'auto' }}>

          {/* Chyba alert */}
          {isChyba && (
            <div className="alert alert-danger m-3 mb-0 d-flex align-items-center gap-2">
              <iconify-icon icon="solar:danger-triangle-bold-duotone" style={{ fontSize: 20, flexShrink: 0 }} />
              <div>
                <div className="fw-bold">Platba neproběhla – vyžaduje akci</div>
                <div className="fs-12 mt-1">{faktura.poznamka}</div>
              </div>
            </div>
          )}

          {/* Main detail grid */}
          <div className="p-3">
            <div className="row g-2 mb-3">
              <div className="col-6">
                <DetailField label="Částka" value={<span className="font-monospace fw-bold fs-5">{fCzk(faktura.castka)}</span>} />
              </div>
              <div className="col-6">
                <DetailField label="Splatnost" value={
                  <span className={faktura.stav === 'chyba-platby' || (faktura.stav === 'schvalena' && faktura.splatnost < '2026-04-17') ? 'text-danger fw-bold' : ''}>
                    {fDate(faktura.splatnost)}
                  </span>
                } />
              </div>
              <div className="col-6">
                <DetailField label="Provozovna" value={
                  <span className="d-flex align-items-center gap-1">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: provColor, display: 'inline-block', flexShrink: 0 }} />
                    {provName}
                  </span>
                } />
              </div>
              <div className="col-6">
                <DetailField label="Kategorie" value={KATEGORIE_LABELS[faktura.kategorie]} />
              </div>
              {faktura.schvalil && (
                <div className="col-6">
                  <DetailField label="Schválil" value={faktura.schvalil} />
                </div>
              )}
              {faktura.datumSchvaleni && (
                <div className="col-6">
                  <DetailField label="Datum schválení" value={faktura.datumSchvaleni} />
                </div>
              )}
              {faktura.poznamka && !isChyba && (
                <div className="col-12">
                  <DetailField label="Poznámka" value={<span className="text-muted fs-13">{faktura.poznamka}</span>} />
                </div>
              )}
            </div>

            {/* Bank account info */}
            {ucet && (
              <div className="p-2 rounded mb-3" style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Bankovní účet provozovny</div>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold fs-13">{ucet.nazev}</div>
                    <div className="text-muted fs-12 font-monospace">{ucet.cisloUctu}</div>
                  </div>
                  <div className="text-end">
                    <div className="text-muted fs-11">{ucet.banka}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Bank status (if in process) */}
            {(isInBank || isChyba) && (
              <div className={`p-2 rounded mb-3 ${isChyba ? 'border border-danger' : 'border border-info'}`}
                style={{ background: isChyba ? '#fff5f5' : '#f0fbff' }}>
                <div className="text-uppercase fw-semibold fs-11 mb-2" style={{ color: isChyba ? '#dc3545' : '#0dcaf0' }}>
                  Stav v bance
                </div>
                <div className="d-flex align-items-center gap-2">
                  <iconify-icon
                    icon={isChyba ? 'solar:danger-circle-bold-duotone' : 'solar:bank-bold-duotone'}
                    style={{ fontSize: 20, color: isChyba ? '#dc3545' : '#0dcaf0', flexShrink: 0 }}
                  />
                  <div className="fs-13">
                    {faktura.stav === 'v-bance' && 'Platba odeslána do banky, čeká na zpracování (1–2 pracovní dny)'}
                    {faktura.stav === 'ceka-na-sparovani' && 'Platba zpracována bankou, čeká na automatické spárování s výpisem'}
                    {isChyba && 'Platba vrácena bankou – zkontrolujte číslo účtu a odešlete znovu'}
                  </div>
                </div>
              </div>
            )}

            {/* Audit timeline */}
            {audit.length > 0 && (
              <>
                <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Historie</div>
                <div className="platby-audit-timeline">
                  {audit.map((z, i) => (
                    <div key={i} className="platby-audit-item">
                      <div className="platby-audit-dot" style={{ background: AUDIT_BARVY[z.akce] ?? '#9097a7' }}>
                        <iconify-icon icon={AUDIT_IKONY[z.akce] ?? 'solar:document-bold-duotone'} style={{ fontSize: 10, color: 'white' }} />
                      </div>
                      <div className="platby-audit-content">
                        <div className="d-flex align-items-center justify-content-between gap-2">
                          <span className="fw-semibold fs-13">{z.kdo}</span>
                          <span className="text-muted fs-11">{z.cas}</span>
                        </div>
                        <div className="text-muted fs-12">{z.poznamka ?? z.akce.replace(/-/g, ' ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-top p-3 d-flex flex-column gap-2" style={{ flexShrink: 0 }}>
          {isAktivni && onOdeslatDoBanky && (
            <button className="btn btn-primary w-100" onClick={() => { onOdeslatDoBanky(faktura.id); onClose(); }}>
              <iconify-icon icon="solar:arrow-right-up-bold" className="me-2" />
              Odeslat do banky
            </button>
          )}
          {isChyba && onObnovit && (
            <button className="btn btn-warning w-100" onClick={() => { onObnovit(faktura.id); onClose(); }}>
              <iconify-icon icon="solar:refresh-bold" className="me-2" />
              Znovu odeslat do banky
            </button>
          )}
          {(isAktivni || isInBank) && onPozastavit && (
            <button className="btn btn-light w-100" onClick={() => { onPozastavit(faktura.id); onClose(); }}>
              <iconify-icon icon="solar:pause-circle-bold" className="me-2" />
              Pozastavit
            </button>
          )}
          {isZastavena && onObnovit && (
            <button className="btn btn-success w-100" onClick={() => { onObnovit(faktura.id); onClose(); }}>
              <iconify-icon icon="solar:refresh-bold" className="me-2" />
              Obnovit ke schválení
            </button>
          )}
          <button className="btn btn-light w-100" onClick={onClose}>Zavřít</button>
        </div>
      </div>
    </>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">{label}</div>
      <div className="fs-13">{value}</div>
    </div>
  );
}
