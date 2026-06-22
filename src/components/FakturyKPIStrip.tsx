// COMPONENT: KPI Strip pro sekci Faktury
// Phase 8.11 (zápis 22. 6. 2026)
//
// 4 karty per zápis 22. 6.:
//   1. Po splatnosti — počet + suma Kč (červená)
//   2. Nespárované — počet (žlutá)
//   3. Neprovedené platby — počet + suma (ČERVENÁ, glow — nejdůležitější)
//   4. Schválené — počet (zelená)
//
// Alerty se sem přesunuly z původního "alert strip" nahoře (per feedback).

import type { ProvozovnaId } from '../types';
import {
  getFakturyForProvozovna,
  getMatchingData,
  isPoSplatnosti,
  type FakturaForma,
  type TypDokladu,
} from '../platbyData';
import { fCzk } from '../data';

interface Props {
  provozovna: ProvozovnaId;
  // Phase 8.11 (zápis 22. 6. 2026) — Reflektuje aktuální výběr v top-level forma tabu (Faktury / Dobropisy / Zálohové / Jiné)
  formaFilters?: Set<FakturaForma>;
  typDokladu?: TypDokladu | 'all';
}

export default function FakturyKPIStrip({ provozovna, formaFilters, typDokladu }: Props) {
  const allFaktury = getFakturyForProvozovna(provozovna);
  // Filtrujeme dataset podle aktuálního typu dokladu (prijata/vydana) + forma tabu
  const faktury = allFaktury.filter((f) => {
    if (typDokladu && typDokladu !== 'all' && f.typDokladu !== typDokladu) return false;
    if (formaFilters && formaFilters.size > 0) {
      const formaVal = (f.forma ?? 'standard') as FakturaForma;
      if (!formaFilters.has(formaVal)) return false;
    }
    return true;
  });
  // Phase 8.11 (zápis 22. 6. 2026) — Special režim pro Zálohové: místo "Neprovedené platby"
  // zobrazí "Nespárované zálohy" (uhrazené proformy bez navazující řádné faktury).
  const isZalohovaMode = !!formaFilters && formaFilters.size === 1 && formaFilters.has('zalohova');
  const allFakturyIds = new Set(allFaktury.map((f) => f.id));
  const nesparovaneZalohy = faktury.filter(
    (f) => f.forma === 'zalohova'
      && (f.stav === 'uhrazena' || f.stav === 'zaplacena')
      && (!f.spojenaSId || !allFakturyIds.has(f.spojenaSId))
  );
  const sumNesparovaneZalohy = nesparovaneZalohy.reduce((s, f) => s + f.castka, 0);

  // 1. Po splatnosti — nezaplacené, po datu splatnosti
  const poSplatnosti = faktury.filter(
    (f) => f.stav !== 'uhrazena' && f.stav !== 'zaplacena' && f.stav !== 'v-bance' && isPoSplatnosti(f.splatnost)
  );
  const sumPoSplat = poSplatnosti.reduce((s, f) => s + f.castka, 0);

  // 2. Nespárované — z matching dat (ceka-na-sparovani / nesedi-dl / duplikat)
  const nesparovane = faktury.filter((f) => {
    const m = getMatchingData(f.id);
    return m && (m.stav === 'ceka-na-sparovani' || m.stav === 'nesedi-dl' || m.stav === 'duplikat');
  });

  // 3. Neprovedené platby — kritické (faktury v bance >3 dny bez úhrady, nebo zamítnuté)
  const neprovedene = faktury.filter(
    (f) => f.stav === 'v-bance-neuhrazena'
  );
  const sumNeprovedene = neprovedene.reduce((s, f) => s + f.castka, 0);

  // 4. Schválené — k úhradě
  const schvalene = faktury.filter((f) => f.stav === 'schvalena');
  const sumSchvalene = schvalene.reduce((s, f) => s + f.castka, 0);

  return (
    <div className="row g-3 mb-4">
      {/* 1. Po splatnosti */}
      <div className="col-md-3">
        <div className="card overflow-hidden h-100" style={{ borderLeft: poSplatnosti.length > 0 ? '4px solid #dc3545' : undefined }}>
          <div className="card-body">
            <div className="d-flex align-items-start gap-3">
              <div className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center rounded"
                   style={{ background: 'rgba(220, 53, 69, 0.12)' }}>
                <iconify-icon icon="solar:danger-triangle-bold-duotone" style={{ fontSize: 22, color: '#dc3545' }} />
              </div>
              <div className="flex-grow-1 text-end min-width-0">
                <p className="text-muted mb-0 text-truncate fs-13">Po splatnosti</p>
                <h3 className="mt-1 mb-0 czk-num" style={{ color: poSplatnosti.length > 0 ? '#dc3545' : '#212529', whiteSpace: 'nowrap' }}>
                  {fCzk(sumPoSplat)}
                </h3>
              </div>
            </div>
          </div>
          <div className="card-footer py-2 bg-light bg-opacity-50">
            <span className={`badge ${poSplatnosti.length > 0 ? 'bg-danger-subtle text-danger' : 'bg-secondary-subtle text-secondary'}`}>
              {poSplatnosti.length} {poSplatnosti.length === 1 ? 'faktura' : poSplatnosti.length < 5 ? 'faktury' : 'faktur'}
            </span>
            {poSplatnosti.length > 0 && (
              <span className="text-danger fw-semibold fs-12 ms-2">Okamžitá akce</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Nespárované */}
      <div className="col-md-3">
        <div className="card overflow-hidden h-100" style={{ borderLeft: nesparovane.length > 0 ? '4px solid #ffc107' : undefined }}>
          <div className="card-body">
            <div className="d-flex align-items-start gap-3">
              <div className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center rounded"
                   style={{ background: 'rgba(255, 193, 7, 0.14)' }}>
                <iconify-icon icon="solar:link-broken-bold-duotone" style={{ fontSize: 22, color: '#ffc107' }} />
              </div>
              <div className="flex-grow-1 text-end min-width-0">
                <p className="text-muted mb-0 text-truncate fs-13">Nespárované</p>
                <h3 className="mt-1 mb-0 czk-num" style={{ color: nesparovane.length > 0 ? '#cc8a00' : '#212529' }}>
                  {nesparovane.length}
                </h3>
              </div>
            </div>
          </div>
          <div className="card-footer py-2 bg-light bg-opacity-50">
            <span className={`badge ${nesparovane.length > 0 ? 'bg-warning-subtle text-warning' : 'bg-secondary-subtle text-secondary'}`}>
              čeká na párování
            </span>
          </div>
        </div>
      </div>

      {/* 3. Neprovedené platby (default) NEBO Nespárované zálohy (v Zálohové tabu) — KRITICKÉ, červené s glow */}
      {(() => {
        // V režimu Zálohové tab → 3. karta = Nespárované zálohy (uhrazené proformy bez navazující řádné faktury)
        const useZaloha = isZalohovaMode;
        const cnt = useZaloha ? nesparovaneZalohy.length : neprovedene.length;
        const sum = useZaloha ? sumNesparovaneZalohy : sumNeprovedene;
        const label = useZaloha ? 'Nespárované zálohy' : 'Neprovedené platby';
        const footerText = useZaloha
          ? (cnt > 0 ? fCzk(sum) : 'Vše spárováno')
          : (cnt > 0 ? fCzk(sum) : 'Vše v pořádku');
        const subtitle = useZaloha
          ? (cnt > 0 ? '⚠ Vystavit řádnou fakturu' : null)
          : (cnt > 0 ? '⚠ Kritické' : null);
        const icon = useZaloha ? 'solar:link-broken-bold-duotone' : 'solar:bell-bing-bold-duotone';
        return (
      <div className="col-md-3">
        <div
          className="card overflow-hidden h-100"
          style={{
            borderLeft: cnt > 0 ? '4px solid #dc3545' : undefined,
            boxShadow: cnt > 0 ? '0 0 0 1px rgba(220, 53, 69, 0.35), 0 4px 14px rgba(220, 53, 69, 0.20)' : undefined,
          }}
        >
          <div className="card-body" style={{ background: cnt > 0 ? 'rgba(220, 53, 69, 0.04)' : undefined }}>
            <div className="d-flex align-items-start gap-3">
              <div
                className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center rounded"
                style={{
                  background: '#dc3545',
                  boxShadow: cnt > 0 ? '0 0 0 4px rgba(220, 53, 69, 0.18)' : undefined,
                }}
              >
                <iconify-icon icon={icon} style={{ fontSize: 22, color: '#fff' }} />
              </div>
              <div className="flex-grow-1 text-end min-width-0">
                <p className="mb-0 text-truncate fs-13 fw-semibold" style={{ color: cnt > 0 ? '#dc3545' : '#6c757d' }}>
                  {label}
                </p>
                <h3 className="mt-1 mb-0 czk-num fw-bold" style={{ color: cnt > 0 ? '#dc3545' : '#212529' }}>
                  {cnt}
                </h3>
              </div>
            </div>
          </div>
          <div className="card-footer py-2" style={{ background: cnt > 0 ? 'rgba(220, 53, 69, 0.08)' : 'rgba(248, 249, 250, 0.5)' }}>
            <span className="badge bg-danger" style={{ color: '#fff' }}>
              {footerText}
            </span>
            {subtitle && (
              <span className="text-danger fw-bold fs-12 ms-2">{subtitle}</span>
            )}
          </div>
        </div>
      </div>
        );
      })()}

      {/* 4. Schválené */}
      <div className="col-md-3">
        <div className="card overflow-hidden h-100" style={{ borderLeft: schvalene.length > 0 ? '4px solid #198754' : undefined }}>
          <div className="card-body">
            <div className="d-flex align-items-start gap-3">
              <div className="avatar-sm flex-shrink-0 d-flex align-items-center justify-content-center rounded"
                   style={{ background: 'rgba(25, 135, 84, 0.12)' }}>
                <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 22, color: '#198754' }} />
              </div>
              <div className="flex-grow-1 text-end min-width-0">
                <p className="text-muted mb-0 text-truncate fs-13">Schválené k úhradě</p>
                <h3 className="mt-1 mb-0 czk-num" style={{ color: schvalene.length > 0 ? '#198754' : '#212529', whiteSpace: 'nowrap' }}>
                  {fCzk(sumSchvalene)}
                </h3>
              </div>
            </div>
          </div>
          <div className="card-footer py-2 bg-light bg-opacity-50">
            <span className={`badge ${schvalene.length > 0 ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
              {schvalene.length} {schvalene.length === 1 ? 'faktura' : schvalene.length < 5 ? 'faktury' : 'faktur'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
