// COMPONENT: Platby Detail Panel – platební workflow detail + audit timeline
// SOURCE: Larkon offcanvas pattern + Bootstrap utilities
// CUSTOM: YES – audit timeline, bank status, payment workflow actions

import { useState } from 'react';
import type { FakturaPlatby, FakturaStavPlatby } from '../platbyData';
import InvoicePreview from './InvoicePreview';
import {
  KATEGORIE_LABELS, getPlatbyAudit, getBankovniUcet,
} from '../platbyData';
import { PROVOZOVNY, fCzk, fDate } from '../data';

interface Props {
  faktura: FakturaPlatby;
  onClose: () => void;
  onOdeslatDoBanky?: (id: string) => void;
  onPozastavit?: (id: string, poznamka: string) => void;
  onObnovit?: (id: string) => void;
  localPoznamka?: string;
}

const STAV_META: Record<FakturaStavPlatby, { cls: string; label: string; icon: string }> = {
  nova:                 { cls: 'bg-secondary-subtle text-secondary', label: 'Nová',                  icon: 'solar:document-bold-duotone' },
  'ceka-na-schvaleni':  { cls: 'bg-warning-subtle text-warning',     label: 'Čeká na schválení',     icon: 'solar:clock-circle-bold-duotone' },
  'castecne-schvalena': { cls: 'bg-warning-subtle text-warning',     label: 'Částečně schválená',    icon: 'solar:pie-chart-2-bold-duotone' },
  schvalena:            { cls: 'bg-success-subtle text-success',     label: 'Schválená',             icon: 'solar:check-circle-bold-duotone' },
  pozastavena:          { cls: 'bg-warning-subtle text-warning',     label: 'Pozastavená',           icon: 'solar:pause-circle-bold-duotone' },
  zamitnuta:            { cls: 'bg-danger-subtle text-danger',       label: 'Zamítnutá',             icon: 'solar:close-circle-bold-duotone' },
  'v-bance':            { cls: 'bg-info-subtle text-info',           label: 'V bance',               icon: 'solar:bank-bold-duotone' },
  uhrazena:             { cls: 'bg-success text-white',              label: 'Uhrazená',              icon: 'solar:check-square-bold-duotone' },
  'v-bance-neuhrazena': { cls: 'platby-stav-chyba',                  label: 'V bance neuhrazená',    icon: 'solar:danger-circle-bold-duotone' },
  // Phase 8.4 (zápis 19. 6. 2026) — stavy vydaných faktur
  vystavena:            { cls: 'bg-info-subtle text-info',           label: 'Vystavená',             icon: 'solar:document-add-bold-duotone' },
  nezaplacena:          { cls: 'bg-danger-subtle text-danger',       label: 'Nezaplacená',           icon: 'solar:danger-triangle-bold-duotone' },
  zaplacena:            { cls: 'bg-success text-white',              label: 'Zaplacená',             icon: 'solar:check-square-bold-duotone' },
};

const AUDIT_IKONY: Record<string, string> = {
  vytvorena:           'solar:document-add-bold-duotone',
  prirazen:            'solar:user-id-bold-duotone',
  schvalena:           'solar:check-circle-bold-duotone',
  zamitnuta:           'solar:close-circle-bold-duotone',
  pozastavena:           'solar:pause-circle-bold-duotone',
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
  pozastavena:           '#dc3545',
  'odeslana-do-banky': '#0d6efd',
  'v-bance':           '#0dcaf0',
  sparovana:           '#198754',
  chyba:               '#dc3545',
  obnovena:            '#0d6efd',
};

export default function PlatbyDetailPanel({ faktura, onClose, onOdeslatDoBanky, onPozastavit, onObnovit, localPoznamka }: Props) {
  const provName  = PROVOZOVNY.find((p) => p.id === faktura.provozovna)?.shortName ?? faktura.provozovna;
  const provColor = PROVOZOVNY.find((p) => p.id === faktura.provozovna)?.color ?? '#94a3b8';
  const audit     = getPlatbyAudit(faktura.id);
  const ucet      = getBankovniUcet(faktura.provozovna);
  const { cls, label, icon } = STAV_META[faktura.stav] ?? STAV_META['nova'];

  const isInBank    = faktura.stav === 'v-bance';
  const isChyba     = faktura.stav === 'v-bance-neuhrazena';
  const isAktivni   = faktura.stav === 'schvalena';
  const isZastavena = faktura.stav === 'pozastavena';

  const [pozastavitMode, setPozastavitMode] = useState(false);
  const [poznamkaText, setPoznamkaText] = useState('');
  const [showPreview, setShowPreview] = useState(false);

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
              <span className="text-muted fs-12 czk-num">{faktura.cislo}</span>
            </div>
            <h5 className="mb-0 text-truncate">{faktura.dodavatel}</h5>
          </div>
          <button className="btn-close ms-3" onClick={onClose} />
        </div>

        {/* Body */}
        <div className="offcanvas-body p-0 d-flex flex-column" style={{ overflowY: 'auto' }}>

          {/* Zastavena alert */}
          {isZastavena && (localPoznamka || faktura.poznamka) && (
            <div className="alert alert-warning m-3 mb-0 d-flex align-items-start gap-2">
              <iconify-icon icon="solar:pause-circle-bold-duotone" style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }} />
              <div>
                <div className="fw-semibold fs-13">Důvod pozastavení</div>
                <div className="fs-12 mt-1">{localPoznamka ?? faktura.poznamka}</div>
              </div>
            </div>
          )}

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
                <DetailField label="Částka" value={<span className="czk-num fw-bold fs-5">{fCzk(faktura.castka)}</span>} />
              </div>
              <div className="col-6">
                <DetailField label="Splatnost" value={
                  <span className={faktura.stav === 'v-bance-neuhrazena' || (faktura.stav === 'schvalena' && faktura.splatnost < '2026-04-17') ? 'text-danger fw-bold' : ''}>
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
                    <div className="text-muted fs-12 czk-num">{ucet.cisloUctu}</div>
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
                    {isChyba && 'Platba v bance neuhrazena — zkontrolujte číslo účtu a odešlete znovu'}
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
            {/* Náhled faktury */}
            <div className="mt-3">
              <button
                className="btn btn-link p-0 text-muted fs-12 d-flex align-items-center gap-1 text-decoration-none"
                onClick={() => setShowPreview((v) => !v)}
              >
                <iconify-icon
                  icon={showPreview ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                  style={{ fontSize: 14 }}
                />
                {showPreview ? 'Skrýt náhled faktury' : 'Zobrazit náhled faktury'}
              </button>
              {showPreview && (
                <div className="mt-2">
                  <InvoicePreview faktura={faktura} />
                </div>
              )}
            </div>
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
            pozastavitMode ? (
              <div className="d-flex flex-column gap-2">
                <textarea
                  className="form-control fs-13"
                  rows={3}
                  placeholder="Důvod pozastavení… (např. probíhá reklamace, čeká na doplnění dokladů)"
                  value={poznamkaText}
                  onChange={(e) => setPoznamkaText(e.target.value)}
                  autoFocus
                />
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-warning flex-grow-1"
                    onClick={() => { onPozastavit(faktura.id, poznamkaText); onClose(); }}
                  >
                    <iconify-icon icon="solar:pause-circle-bold" className="me-2" />
                    Potvrdit pozastavení
                  </button>
                  <button className="btn btn-light" onClick={() => { setPozastavitMode(false); setPoznamkaText(''); }}>
                    Zrušit
                  </button>
                </div>
              </div>
            ) : (
              <button className="btn btn-light w-100" onClick={() => setPozastavitMode(true)}>
                <iconify-icon icon="solar:pause-circle-bold" className="me-2" />
                Pozastavit
              </button>
            )
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
