// Phase 8.5 (zápis 10. 6. 2026) — Nastavení: sekce pro administrativní konfiguraci.
// Aktuálně: Číselník položek (sdílený katalog typů položek pro vystavované faktury) +
// placeholdery pro budoucí sekce (Uživatelé, Role, Schvalovací proces).
//
// Účetní/kancelář spravuje číselník centrálně — provozní si jen vybírá při vystavování.

import { useState } from 'react';
import { VYDANE_SABLONY } from '../platbyData';
import type { PolozkaSablona } from '../platbyData';

export default function NastaveniView() {
  const [aktivniSekce, setAktivniSekce] = useState<'cisselnik' | 'uzivatele' | 'schvalovani'>('cisselnik');
  const [hledat, setHledat] = useState('');
  const [filtrKat, setFiltrKat] = useState('all');
  // Mock — v produkci by tady byl CRUD na backend, teď read-only s "Přidat" disabled
  const [polozky] = useState<PolozkaSablona[]>(VYDANE_SABLONY);

  const filtered = polozky.filter((p) => {
    if (filtrKat !== 'all' && p.kategorie !== filtrKat) return false;
    if (hledat && !p.nazev.toLowerCase().includes(hledat.toLowerCase())) return false;
    return true;
  });
  const kategorie = Array.from(new Set(polozky.map((p) => p.kategorie)));

  return (
    <>
      <div className="page-title-box">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h4 className="page-title mb-0 d-flex align-items-center gap-1">
            <iconify-icon icon="solar:settings-bold-duotone" style={{ color: '#6c757d' }} />
            Nastavení
          </h4>
          <span className="text-muted fs-13">Administrativní konfigurace systému</span>
        </div>
      </div>

      {/* Levé navigační záložky (sekce) */}
      <div className="row g-3">
        <div className="col-md-3">
          <div className="card">
            <div className="list-group list-group-flush">
              <button
                className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${aktivniSekce === 'cisselnik' ? 'active' : ''}`}
                onClick={() => setAktivniSekce('cisselnik')}>
                <iconify-icon icon="solar:bookmark-bold-duotone" style={{ fontSize: 18 }} />
                <div className="flex-grow-1 text-start">
                  <div className="fw-semibold fs-13">Číselník položek</div>
                  <div className={`fs-11 ${aktivniSekce === 'cisselnik' ? 'text-white-50' : 'text-muted'}`}>
                    Šablony pro fakturaci · {polozky.length} položek
                  </div>
                </div>
              </button>
              <button
                className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${aktivniSekce === 'uzivatele' ? 'active' : ''}`}
                onClick={() => setAktivniSekce('uzivatele')}>
                <iconify-icon icon="solar:users-group-rounded-bold-duotone" style={{ fontSize: 18 }} />
                <div className="flex-grow-1 text-start">
                  <div className="fw-semibold fs-13">Uživatelé &amp; role</div>
                  <div className={`fs-11 ${aktivniSekce === 'uzivatele' ? 'text-white-50' : 'text-muted'}`}>
                    Práva &amp; přístupy
                  </div>
                </div>
              </button>
              <button
                className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${aktivniSekce === 'schvalovani' ? 'active' : ''}`}
                onClick={() => setAktivniSekce('schvalovani')}>
                <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 18 }} />
                <div className="flex-grow-1 text-start">
                  <div className="fw-semibold fs-13">Schvalovací proces</div>
                  <div className={`fs-11 ${aktivniSekce === 'schvalovani' ? 'text-white-50' : 'text-muted'}`}>
                    Limity, eskalace, fronta
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Pravý obsah */}
        <div className="col-md-9">
          {aktivniSekce === 'cisselnik' && (
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div>
                  <h5 className="card-title mb-0 d-flex align-items-center gap-1">
                    <iconify-icon icon="solar:bookmark-bold-duotone" style={{ color: '#0d6efd' }} />
                    Číselník položek
                  </h5>
                  <div className="text-muted fs-12 mt-1">
                    Centrálně spravované šablony pro vystavované faktury. Provozní si vybírá z této tabulky při vystavování faktury.
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" disabled title="Přidání nové položky bude v produkční verzi">
                  <iconify-icon icon="solar:add-circle-bold-duotone" className="me-1" />
                  Přidat položku
                </button>
              </div>
              <div className="card-body">
                <div className="d-flex gap-2 align-items-center mb-3 flex-wrap">
                  <input type="text" className="form-control form-control-sm" style={{ maxWidth: 280 }}
                    placeholder="Hledat v názvu…"
                    value={hledat} onChange={(e) => setHledat(e.target.value)} />
                  <select className="form-select form-select-sm" style={{ width: 160 }}
                    value={filtrKat} onChange={(e) => setFiltrKat(e.target.value)}>
                    <option value="all">Všechny kategorie</option>
                    {kategorie.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <span className="text-muted fs-12 ms-auto">
                    Zobrazeno {filtered.length} z {polozky.length}
                  </span>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Název</th>
                        <th>Kategorie</th>
                        <th>Jednotka</th>
                        <th className="text-end">Výchozí cena</th>
                        <th>DPH</th>
                        <th>Poznámka účetní</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => (
                        <tr key={p.id}>
                          <td className="fw-semibold fs-13">{p.nazev}</td>
                          <td><span className="badge bg-secondary-subtle text-secondary fs-11">{p.kategorie}</span></td>
                          <td className="fs-13">{p.jednotka}</td>
                          <td className="text-end czk-num fs-13">
                            {p.cenaJednDefault != null ? `${p.cenaJednDefault.toLocaleString('cs-CZ')} Kč` : <span className="text-muted">—</span>}
                          </td>
                          <td><span className="badge bg-light text-dark fs-11">{p.dphSazba} %</span></td>
                          <td className="fs-12 text-muted" style={{ maxWidth: 260 }}>
                            {p.poznamka ?? <span className="fst-italic">(žádná)</span>}
                          </td>
                          <td>
                            <button className="btn btn-link btn-sm text-muted p-0" disabled title="Úprava bude v produkční verzi">
                              <iconify-icon icon="solar:pen-bold-duotone" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="alert alert-info py-2 mb-0 fs-12 mt-3">
                  <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                  <strong>Wireframe mód.</strong> CRUD operace (přidat / upravit / smazat) budou aktivní až v produkční verzi.
                  Centrální správa znamená, že každá změna se okamžitě promítne všem provozním při vystavování faktury.
                </div>
              </div>
            </div>
          )}

          {aktivniSekce === 'uzivatele' && (
            <div className="card">
              <div className="card-body text-center text-muted py-5">
                <iconify-icon icon="solar:users-group-rounded-bold-duotone" style={{ fontSize: 56, color: '#dee2e6' }} />
                <div className="mt-3 fs-15">Uživatelé &amp; role — sekce v přípravě</div>
                <div className="text-muted fs-13 mt-1">Bude spravovat přihlašování, role (Provozní / Fakturant / Účetní / Majitel) a oprávnění.</div>
              </div>
            </div>
          )}

          {aktivniSekce === 'schvalovani' && (
            <div className="card">
              <div className="card-body text-center text-muted py-5">
                <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 56, color: '#dee2e6' }} />
                <div className="mt-3 fs-15">Schvalovací proces — sekce v přípravě</div>
                <div className="text-muted fs-13 mt-1">Pravidla schvalování dle částky / kategorie / provozovny + eskalace.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
