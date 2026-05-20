// COMPONENT: Faktura Detail Drawer – schválení / zamítnutí / přiřazení faktury
// SOURCE: Larkon offcanvas pattern + Bootstrap utilities
// CUSTOM: YES
//   – kontextová hlavička (isResolved ? "Detail faktury" : "Schválení faktury")
//   – sekce přiřazení (jen u neschválených) → select z SCHVALOVACI_OSOBY
//   – audit trail badge (kdo + kdy schválil/zamítl) → fallback na lokální session stav
//   – queue navigace (1/N ve frontě ke schválení)
//   – PDF viewer placeholder (.lk-custom)
//   – workflow tlačítka: Schválit / Zamítnout / Odložit / Odeslat k revizi
//
// Larkon class mapping:
//   .offcanvas.offcanvas-end.show           → drawer zprava (width: min(520px, 100vw))
//   .offcanvas-header.border-bottom         → hlavička s btn-close
//   .offcanvas-body.p-0.d-flex.flex-column  → obsah (flex pro sticky footer)
//   .badge.bg-{color}-subtle.text-{color}   → stav faktury + audit trail
//   .btn.btn-success / btn-danger / btn-warning / btn-secondary → akce
//   .offcanvas-backdrop.fade.show           → tmavý překryv (zIndex 200)
//   CUSTOM: lokální schvalovací stav (localStav, localSchvalil, localDatumSchvaleni)
//   CUSTOM: isResolved flag – odděluje schvalování od readonly detailu

import { useState, useEffect } from 'react';
import type { FakturaPlatby, FakturaStavPlatby } from '../platbyData';
import { KATEGORIE_LABELS, SCHVALOVACI_OSOBY } from '../platbyData';
import { PROVOZOVNY, fCzk, fDate } from '../data';

interface Props {
  faktura: FakturaPlatby;
  localStav: FakturaStavPlatby;
  localPoznamka: string;
  localStredisko: string;
  localPrirazeni: string;   // id přiřazené osoby (nebo '')
  localSchvalil: string;    // jméno schvalovatele po rozhodnutí
  localDatumSchvaleni: string;
  queueIndex: number;
  queueTotal: number;
  onClose: () => void;
  onSchvalit: (id: string, poznamka: string) => void;
  onZamitout: (id: string, poznamka: string) => void;
  onOdlozit: (id: string, poznamka: string) => void;
  onPoznamkaChange: (id: string, value: string) => void;
  onStrediskoChange: (id: string, value: string) => void;
  onPrirazeniChange: (id: string, osobaId: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

const STAV_META: Record<FakturaStavPlatby, { cls: string; label: string }> = {
  nova:                 { cls: 'bg-secondary-subtle text-secondary', label: 'Nová' },
  'ke-schvaleni':       { cls: 'bg-warning-subtle text-warning',     label: 'Ke schválení' },
  schvalena:            { cls: 'bg-success-subtle text-success',     label: 'Schválená' },
  zamitnuta:            { cls: 'bg-danger-subtle text-danger',       label: 'Zamítnutá' },
  zastavena:            { cls: 'bg-danger-subtle text-danger',       label: 'Zastavená' },
  odeslana:             { cls: 'bg-info-subtle text-info',           label: 'Odeslaná' },
  zaplacena:            { cls: 'bg-success-subtle text-success',     label: 'Zaplacená' },
  'v-bance':            { cls: 'bg-info-subtle text-info',           label: 'V bance' },
  'ceka-na-sparovani':  { cls: 'platby-stav-sparovani',              label: 'Čeká na spárování' },
  'chyba-platby':       { cls: 'platby-stav-chyba',                  label: 'Platba neproběhla' },
};

const ROLE_LABEL: Record<string, string> = {
  fakturant:    'Fakturant',
  schvalovatel: 'Schvalovatel',
  majitel:      'Majitel',
};

export default function FakturaDetailDrawer({
  faktura, localStav, localPoznamka, localStredisko,
  localPrirazeni, localSchvalil, localDatumSchvaleni,
  queueIndex, queueTotal,
  onClose, onSchvalit, onZamitout, onOdlozit,
  onPoznamkaChange, onStrediskoChange, onPrirazeniChange,
  onPrev, onNext,
}: Props) {
  const [poznamka, setPoznamka] = useState(localPoznamka);
  const [stredisko, setStredisko] = useState(localStredisko || faktura.provozovna);
  const [prirazeniId, setPrirazeniId] = useState(localPrirazeni || faktura.prirazenaOsoba || '');

  useEffect(() => {
    setPoznamka(localPoznamka);
    setStredisko(localStredisko || faktura.provozovna);
    setPrirazeniId(localPrirazeni || faktura.prirazenaOsoba || '');
  }, [faktura.id, localPoznamka, localStredisko, localPrirazeni]);

  const stav = STAV_META[localStav];
  const isResolved = localStav === 'schvalena' || localStav === 'zamitnuta';
  const schvalilJmeno = localSchvalil || faktura.schvalil || '';
  const schvalilDatum = localDatumSchvaleni || faktura.datumSchvaleni || '';
  const aktivniProvozovny = PROVOZOVNY.filter((p) => p.status === 'active');

  const prirazenaOsoba = SCHVALOVACI_OSOBY.find((o) => o.id === prirazeniId);

  function handleSchvalit() {
    onPoznamkaChange(faktura.id, poznamka);
    onStrediskoChange(faktura.id, stredisko);
    onSchvalit(faktura.id, poznamka);
  }
  function handleZamitout() {
    onPoznamkaChange(faktura.id, poznamka);
    onZamitout(faktura.id, poznamka);
  }
  function handleOdlozit() {
    onPoznamkaChange(faktura.id, poznamka);
    onOdlozit(faktura.id, poznamka);
  }
  function handlePrirazeni(osobaId: string) {
    setPrirazeniId(osobaId);
    onPrirazeniChange(faktura.id, osobaId);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="offcanvas-backdrop fade show"
        style={{ zIndex: 200 }}
        onClick={onClose}
      />

      {/* Drawer – SOURCE: Larkon .offcanvas.offcanvas-end */}
      <div
        className="offcanvas offcanvas-end show"
        style={{ width: 'min(520px, 100vw)', zIndex: 300 }}
      >
        {/* ── Hlavička ─────────────────────────────────────── */}
        <div className="offcanvas-header border-bottom">
          <div>
            <h5 className="offcanvas-title mb-0">
              {isResolved ? 'Detail faktury' : 'Schválení faktury'}
            </h5>
            {queueTotal > 0 && (
              <small className="text-muted fs-12">
                {queueIndex + 1} / {queueTotal} ve frontě ke schválení
              </small>
            )}
          </div>
          <button className="btn-close" onClick={onClose} />
        </div>

        {/* ── Tělo ─────────────────────────────────────────── */}
        <div className="offcanvas-body p-0 d-flex flex-column" style={{ overflowY: 'auto' }}>

          {/* Metadata faktury */}
          <div className="p-4 border-bottom">
            <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
              <div>
                <div className="text-muted fs-12 mb-1">{faktura.cislo}</div>
                <div className="fw-bold fs-5 mb-1">{faktura.dodavatel}</div>
                <span className={`badge ${stav.cls}`}>{stav.label}</span>
              </div>
              <div className="text-end">
                <div className="fw-bold czk-num fs-4" style={{ color: '#313b5e' }}>
                  {fCzk(faktura.castka)}
                </div>
                <div className="text-muted fs-12">
                  {faktura.typDokladu === 'prijata' ? 'Přijatá faktura' : 'Vydaná faktura'}
                </div>
              </div>
            </div>

            <div className="row g-2 fs-13">
              <div className="col-6">
                <span className="text-muted">Datum vystavení</span>
                <div className="fw-semibold">{fDate(faktura.datum)}</div>
              </div>
              <div className="col-6">
                <span className="text-muted">Splatnost</span>
                <div className="fw-semibold">{fDate(faktura.splatnost)}</div>
              </div>
              <div className="col-6">
                <span className="text-muted">Kategorie</span>
                <div className="fw-semibold">{KATEGORIE_LABELS[faktura.kategorie]}</div>
              </div>
              <div className="col-6">
                <span className="text-muted">Provozovna</span>
                <div className="fw-semibold">
                  {PROVOZOVNY.find((p) => p.id === faktura.provozovna)?.name ?? faktura.provozovna}
                </div>
              </div>
              {faktura.poznamka && (
                <div className="col-12">
                  <span className="text-muted">Původní poznámka</span>
                  <div className="fw-semibold">{faktura.poznamka}</div>
                </div>
              )}
            </div>

            {/* Audit trail – kdo schválil */}
            {isResolved && schvalilJmeno && (
              <div
                className={`mt-3 px-3 py-2 rounded fs-12 d-flex align-items-center gap-2 ${
                  localStav === 'schvalena' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                }`}
              >
                <iconify-icon
                  icon={localStav === 'schvalena' ? 'solar:check-circle-bold-duotone' : 'solar:close-circle-bold-duotone'}
                  style={{ fontSize: 16, flexShrink: 0 }}
                />
                <span>
                  <strong>{localStav === 'schvalena' ? 'Schválil' : 'Zamítl'}:</strong>{' '}
                  {schvalilJmeno}
                  {schvalilDatum && (
                    <span className="ms-2 opacity-75">· {schvalilDatum}</span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Přiřazení ke schválení – jen u neschválených */}
          {!isResolved && <div className="p-4 border-bottom">
            <div className="text-uppercase fw-semibold text-muted fs-11 mb-3">
              Přiřazení ke schválení
            </div>

            {prirazenaOsoba ? (
              <div className="d-flex align-items-center gap-3 mb-3">
                {/* Avatar */}
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold fs-12 text-white"
                  style={{ width: 36, height: 36, background: 'var(--prov-color, #c9911a)' }}
                >
                  {prirazenaOsoba.avatar}
                </div>
                <div className="flex-grow-1">
                  <div className="fw-semibold fs-13">{prirazenaOsoba.jmeno}</div>
                  <div className="text-muted fs-12">{ROLE_LABEL[prirazenaOsoba.role]}</div>
                </div>
                <span className="badge bg-success-subtle text-success fs-11">Přiřazeno</span>
              </div>
            ) : (
              <div className="text-muted fs-13 mb-3">
                <iconify-icon icon="solar:user-plus-bold-duotone" style={{ fontSize: 16 }} className="me-1" />
                Faktura není nikomu přiřazena
              </div>
            )}

            <div className="d-flex gap-2">
              <select
                className="form-select form-select-sm"
                value={prirazeniId}
                onChange={(e) => handlePrirazeni(e.target.value)}
              >
                <option value="">— Vybrat osobu —</option>
                {SCHVALOVACI_OSOBY.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.jmeno} ({ROLE_LABEL[o.role]})
                  </option>
                ))}
              </select>
              {prirazenaOsoba && (
                <button
                  className="btn btn-outline-secondary btn-sm text-nowrap"
                  onClick={() => handlePrirazeni('')}
                >
                  Odebrat
                </button>
              )}
            </div>
          </div>}

          {/* Náhled dokladu – CUSTOM placeholder */}
          <div className="p-4 border-bottom">
            <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Náhled dokladu</div>
            <div
              className="lk-custom rounded d-flex align-items-center justify-content-center"
              style={{ height: 140, background: '#f8f9fa' }}
            >
              <div className="lk-custom-label">CUSTOM: PDF viewer (iframe / react-pdf)</div>
              <div className="text-center text-muted">
                <iconify-icon icon="solar:document-bold-duotone" style={{ fontSize: 36, opacity: 0.3 }} />
                <div className="fs-13 mt-2">{faktura.cislo}.pdf</div>
                <div className="fs-11 mt-1">v produkci PDF viewer</div>
              </div>
            </div>
          </div>

          {/* Přesun střediska */}
          <div className="p-4 border-bottom">
            <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Středisko / provozovna</div>
            <select
              className="form-select form-select-sm"
              value={stredisko}
              onChange={(e) => {
                setStredisko(e.target.value);
                onStrediskoChange(faktura.id, e.target.value);
              }}
            >
              {aktivniProvozovny.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {stredisko !== faktura.provozovna && (
              <div className="text-warning fs-12 mt-1 fw-semibold">
                ⚠ Původní: {PROVOZOVNY.find((p) => p.id === faktura.provozovna)?.name} → přesunuto
              </div>
            )}
          </div>

          {/* Poznámka ke schválení */}
          <div className="p-4 border-bottom flex-grow-1">
            <div className="text-uppercase fw-semibold text-muted fs-11 mb-2">Poznámka ke schválení</div>
            <textarea
              className="form-control form-control-sm"
              rows={3}
              placeholder="Volitelná poznámka pro účetní / ekonoma..."
              value={poznamka}
              onChange={(e) => {
                setPoznamka(e.target.value);
                onPoznamkaChange(faktura.id, e.target.value);
              }}
            />
          </div>

          {/* Akce */}
          <div className="p-4 border-bottom">
            <div className="text-uppercase fw-semibold text-muted fs-11 mb-3">Rozhodnutí</div>
            {isResolved ? (
              <div className={`alert ${localStav === 'schvalena' ? 'alert-success' : 'alert-danger'} mb-0`}>
                <iconify-icon
                  icon={localStav === 'schvalena' ? 'solar:check-circle-bold-duotone' : 'solar:close-circle-bold-duotone'}
                  style={{ fontSize: 20 }}
                  className="me-2"
                />
                <strong>
                  {localStav === 'schvalena' ? 'Faktura schválena' : 'Faktura zamítnuta'}
                </strong>
                {poznamka && <div className="fs-12 mt-1">{poznamka}</div>}
                <button
                  className="btn btn-link btn-sm p-0 mt-2 d-block"
                  onClick={() => {
                    onPoznamkaChange(faktura.id, poznamka);
                    onOdlozit(faktura.id, poznamka);
                  }}
                >
                  ← Vrátit ke schválení
                </button>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                <button className="btn btn-success w-100" onClick={handleSchvalit}>
                  <iconify-icon icon="solar:check-circle-bold-duotone" className="me-2" style={{ fontSize: 18 }} />
                  Schválit fakturu
                </button>
                <button className="btn btn-danger w-100" onClick={handleZamitout}>
                  <iconify-icon icon="solar:close-circle-bold-duotone" className="me-2" style={{ fontSize: 18 }} />
                  Zamítnout
                </button>
                <button className="btn btn-outline-secondary w-100" onClick={handleOdlozit}>
                  <iconify-icon icon="solar:clock-circle-bold-duotone" className="me-2" style={{ fontSize: 18 }} />
                  Odložit / Vyžádat doklady
                </button>
              </div>
            )}
          </div>

        </div>

        {/* ── Navigační patička ─────────────────────────────── */}
        {queueTotal > 0 && (
          <div className="border-top p-3 d-flex align-items-center justify-content-between bg-light">
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={queueIndex === 0}
              onClick={onPrev}
            >
              ← Předchozí
            </button>
            <span className="text-muted fs-13">{queueIndex + 1} / {queueTotal}</span>
            <button
              className="btn btn-outline-secondary btn-sm"
              disabled={queueIndex === queueTotal - 1}
              onClick={onNext}
            >
              Další →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
