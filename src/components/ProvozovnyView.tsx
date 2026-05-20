// COMPONENT: Provozovny – admin přehled provozoven
// SOURCE: Larkon _tables.scss + _badge.scss + Bootstrap utilities
// CUSTOM: PARTIAL – brand barvy, sub-sekce Piazza, status skupiny

import { useState } from 'react';
import { PROVOZOVNY } from '../data';
import type { Provozovna } from '../types';

// ── Skupiny provozoven ────────────────────────────────────────
const SKUPINY: { label: string; ids: string[] }[] = [
  { label: 'Restaurace',  ids: ['cg-brno', 'piazza', 'monte', 'teatr', 'jime-brno'] },
  { label: 'Pivnice',     ids: ['u-capa', 'u-kohoutu', 'nad-hladinkou'] },
  { label: 'Táckárny',   ids: ['tackarna-londyn', 'tackarna-turanka', 'tackarna-svedske-valy'] },
  { label: 'KOREK',       ids: ['korek-winebar', 'korek-wines'] },
  { label: 'Ostatní',     ids: ['flank', 'cg-catering', 'pijeme-vino'] },
];

const STAV_META: Record<string, { cls: string; label: string }> = {
  active:   { cls: 'bg-success-subtle text-success', label: 'Aktivní' },
  planned:  { cls: 'bg-warning-subtle text-warning', label: 'Plánovaná' },
  inactive: { cls: 'bg-secondary-subtle text-secondary', label: 'Neaktivní' },
};

function colorContrast(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#1a1a1a' : '#ffffff';
}

function ProvRow({ p, indent }: { p: Provozovna; indent?: boolean }) {
  const stav = STAV_META[p.status] ?? STAV_META['inactive'];
  const textColor = colorContrast(p.color);
  return (
    <tr>
      <td style={{ paddingLeft: indent ? 32 : 16, width: 36 }}>
        <span
          className="rounded-circle d-inline-block"
          style={{ width: 24, height: 24, background: p.color, flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', border: '1px solid rgba(0,0,0,0.08)' }}
        />
      </td>
      <td>
        <div className="fw-semibold" style={{ paddingLeft: indent ? 8 : 0 }}>
          {indent && <span className="text-muted me-1" style={{ fontSize: 11 }}>↳</span>}
          {p.name}
        </div>
        {p.note && <div className="text-muted fs-11">{p.note}</div>}
      </td>
      <td className="text-muted fs-12">{p.shortName}</td>
      <td>
        <span className="badge rounded-pill px-2 py-1 czk-num fs-11"
          style={{ background: p.color, color: textColor, letterSpacing: '0.03em' }}>
          {p.color.toUpperCase()}
        </span>
      </td>
      <td><span className={`badge ${stav.cls}`}>{stav.label}</span></td>
      <td className="text-muted fs-12">{p.manager !== '—' ? p.manager : ''}</td>
      <td className="text-muted fs-12">{p.address !== '—' ? p.address : ''}</td>
      <td>
        <button className="btn btn-light btn-sm" disabled>
          Upravit
        </button>
      </td>
    </tr>
  );
}

export default function ProvozovnyView() {
  const [activeTab, setActiveTab] = useState<'seznam' | 'planovane' | 'prava'>('seznam');

  const aktivni   = PROVOZOVNY.filter((p) => p.status === 'active' && !p.parentId);
  const planovane = PROVOZOVNY.filter((p) => p.status === 'planned');
  const subSekce  = PROVOZOVNY.filter((p) => !!p.parentId);

  return (
    <>
      {/* Tabs */}
      <div className="card mb-4">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            {([
              { key: 'seznam',    label: 'Přehled provozoven' },
              { key: 'planovane', label: `Plánované (${planovane.length})` },
              { key: 'prava',     label: 'Přístupová práva' },
            ] as const).map((t) => (
              <li key={t.key} className="nav-item">
                <button
                  className={`nav-link${activeTab === t.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Tab: Přehled aktivních ─────────────────────────── */}
        {activeTab === 'seznam' && (
          <>
            {SKUPINY.map((skupina) => {
              const provs = aktivni.filter((p) => skupina.ids.includes(p.id));
              if (provs.length === 0) return null;
              return (
                <div key={skupina.label}>
                  <div className="px-3 pt-3 pb-1">
                    <span className="text-uppercase fw-semibold text-muted fs-11">{skupina.label}</span>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover table-nowrap mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 36 }} />
                          <th>Název</th>
                          <th>Zkratka</th>
                          <th>Brand barva</th>
                          <th>Stav</th>
                          <th>Manažer</th>
                          <th>Adresa</th>
                          <th style={{ width: 80 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {provs.map((p) => {
                          const children = subSekce.filter((s) => s.parentId === p.id);
                          return [
                            <ProvRow key={p.id} p={p} />,
                            ...children.map((c) => <ProvRow key={c.id} p={c} indent />),
                          ];
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Piazza sub-sekce info */}
            {subSekce.length > 0 && (
              <div className="px-3 py-2 border-top">
                <div className="d-flex align-items-center gap-2">
                  <iconify-icon icon="solar:info-circle-bold-duotone" className="text-muted" />
                  <span className="text-muted fs-12">
                    Sub-sekce (↳) se zobrazují pouze při škálování nadřazené provozovny a mají vlastní brand barvy.
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Plánované ────────────────────────────────── */}
        {activeTab === 'planovane' && (
          <div className="table-responsive">
            <table className="table table-hover table-nowrap mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 36 }} />
                  <th>Název</th>
                  <th>Zkratka</th>
                  <th>Brand barva</th>
                  <th>Stav</th>
                  <th>Poznámka</th>
                  <th style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {planovane.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">Žádné plánované provozovny</td>
                  </tr>
                ) : (
                  planovane.map((p) => {
                    const stav = STAV_META[p.status];
                    const textColor = colorContrast(p.color);
                    return (
                      <tr key={p.id}>
                        <td style={{ paddingLeft: 16 }}>
                          <span className="rounded-circle d-inline-block"
                            style={{ width: 24, height: 24, background: p.color, border: '1px solid rgba(0,0,0,0.08)' }} />
                        </td>
                        <td><div className="fw-semibold">{p.name}</div></td>
                        <td className="text-muted fs-12">{p.shortName}</td>
                        <td>
                          {p.color !== '#9097a7' ? (
                            <span className="badge rounded-pill px-2 py-1 czk-num fs-11"
                              style={{ background: p.color, color: textColor }}>
                              {p.color.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-muted fs-12">— zatím nestanovena</span>
                          )}
                        </td>
                        <td><span className={`badge ${stav.cls}`}>{stav.label}</span></td>
                        <td className="text-muted fs-12">{p.note ?? '—'}</td>
                        <td>
                          <button className="btn btn-light btn-sm" disabled>Upravit</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab: Přístupová práva ─────────────────────────── */}
        {activeTab === 'prava' && (
          <div className="card-body text-center py-5 text-muted">
            <iconify-icon icon="solar:shield-user-bold-duotone" style={{ fontSize: 48, opacity: 0.3 }} />
            <div className="mt-3 fw-semibold">Správa přístupových práv</div>
            <div className="fs-13 mt-1">Přiřazení uživatelů k provozovnám a rolím — připravujeme</div>
          </div>
        )}
      </div>

      {/* Info box pro IT */}
      <div className="alert alert-info d-flex gap-3 align-items-start">
        <iconify-icon icon="solar:info-circle-bold-duotone" style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }} />
        <div className="fs-13">
          <strong>Sekce pro IT administrátory.</strong>{' '}
          Barvy provozoven se automaticky propisují do grafů, tabulek a topbaru celého systému.
          Při přidání nové provozovny stačí zadat hex kód brand barvy — vše ostatní se aktualizuje automaticky.
        </div>
      </div>
    </>
  );
}
