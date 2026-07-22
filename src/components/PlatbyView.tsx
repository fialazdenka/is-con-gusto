// COMPONENT: Platby — „autorizační kalkulačka" (v3 s40, zápis 22. 7. 2026)
// Celofiremní pohled: souhrn BANKA (vlevo) + HOTOVOST (vpravo) → dole provozy.
// Majitel zkontroluje zeleně/červeně a jedním klikem (+ autorizace heslem)
// schválí platby do termínu „Do:".
//
// Vrstva 2 = drill-down Provoz → Kategorie → Faktura, výběr na každé úrovni
// (odškrtnutá faktura zůstane na příště) + akce „Uhradit ihned".

import { useState, useEffect } from 'react';
import type { AppState } from '../types';
import { fCzk } from '../data';
import type { FakturaPlatby, FakturaKategorie } from '../platbyData';
import FakturySidePanel from './FakturySidePanel';
import {
  PLATBY_PROVOZY, PLATBY_DO_DEFAULT, KATEGORIE_META,
  provozFaktury, sumVybrane, vybraneBreakdown,
  bankaSouhrn, hotovostSouhrn,
  type PlatbyProvoz, type PlatbaKategorie, type PlatbaFaktura, type PlatbaKategorieId,
} from '../platbyModulData';

// Mapování kategorie Plateb → účetní kategorie faktury (pro sdílený detail)
const KAT_TO_FAKTURA: Record<PlatbaKategorieId, FakturaKategorie> = {
  faktury: 'zbozi', investice: 'ostatni', dph: 'ostatni', energie: 'energie',
  'vyplaty-ucet': 'vyplaty', odvody: 'vyplaty', 'vyplaty-hotove': 'vyplaty',
};

// PlatbaFaktura → FakturaPlatby (aby fungoval sdílený FakturySidePanel)
function toFakturaPlatby(f: PlatbaFaktura, provoz: PlatbyProvoz, kat: PlatbaKategorieId): FakturaPlatby {
  return {
    id: f.id, cislo: f.cislo, dodavatel: f.dodavatel,
    kategorie: KAT_TO_FAKTURA[kat], provozovna: provoz.id,
    castka: f.castka, datum: '2026-04-10', splatnost: f.splatnost,
    stav: 'schvalena', typDokladu: 'prijata', vs: f.cislo, zpusobUhrady: 'banka',
  };
}

interface Props {
  state: AppState;
  update: (p: Partial<AppState>) => void;
}

type TriState = 'all' | 'some' | 'none';

// Všechny id faktur (pro default „vše vybráno")
const ALL_IDS = PLATBY_PROVOZY.flatMap((p) => provozFaktury(p).map((f) => f.id));

export default function PlatbyView(_props: Props) {
  const [doDatum, setDoDatum] = useState(PLATBY_DO_DEFAULT);
  const [vybrane, setVybrane] = useState<Set<string>>(() => new Set(ALL_IDS));
  const [ihned, setIhned] = useState<Set<string>>(() => new Set());
  const [openProvoz, setOpenProvoz] = useState<Set<string>>(new Set());
  const [openKat, setOpenKat] = useState<Set<string>>(new Set());
  // Detail faktury v offcanvas panelu
  const [detail, setDetail] = useState<{ f: PlatbaFaktura; provoz: PlatbyProvoz; kat: PlatbaKategorieId } | null>(null);
  // Autorizace platby heslem (test heslo „2026")
  const [authOpen, setAuthOpen] = useState(false);
  const [heslo, setHeslo] = useState('');
  const [authErr, setAuthErr] = useState(false);
  const [authDone, setAuthDone] = useState(false);
  const openAuth = () => { setHeslo(''); setAuthErr(false); setAuthDone(false); setAuthOpen(true); };
  const submitAuth = () => { if (heslo === '2026') { setAuthDone(true); setAuthErr(false); } else setAuthErr(true); };

  useEffect(() => {
    if (!detail && !authOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setDetail(null); setAuthOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, authOpen]);

  // ── Výběr faktur (add/remove množiny id) ──
  const setMany = (ids: string[], on: boolean) =>
    setVybrane((prev) => {
      const n = new Set(prev);
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
      return n;
    });
  const toggleFaktura = (id: string) => setMany([id], !vybrane.has(id));
  const toggleKat = (k: PlatbaKategorie) => {
    const ids = k.faktury.map((f) => f.id);
    setMany(ids, !ids.every((id) => vybrane.has(id)));
  };
  const toggleProvoz = (p: PlatbyProvoz) => {
    const ids = provozFaktury(p).map((f) => f.id);
    setMany(ids, !ids.every((id) => vybrane.has(id)));
  };
  const toggleVse = () => setVybrane(vybrane.size === ALL_IDS.length ? new Set() : new Set(ALL_IDS));

  const toggleIhned = (f: PlatbaFaktura) =>
    setIhned((prev) => {
      const n = new Set(prev);
      if (n.has(f.id)) n.delete(f.id);
      else { n.add(f.id); if (!vybrane.has(f.id)) setMany([f.id], true); } // ihned ⇒ vybráno
      return n;
    });

  const toggleOpenProvoz = (id: string) =>
    setOpenProvoz((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleOpenKat = (key: string) =>
    setOpenKat((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // ── Kalkulačka ──
  const platbySum = PLATBY_PROVOZY.reduce((s, p) => s + sumVybrane(p, vybrane), 0);
  const bd = vybraneBreakdown(vybrane);
  const hotovost = hotovostSouhrn(vybrane);
  const banka = bankaSouhrn(bd, hotovost.nutnyVyberCelkem);
  const bankaOK = banka.budouciZustatek >= 0;
  const hotovostOK = banka.budouciZustatek >= 0; // hotovost se dorovná výběrem z banky → limit je banka
  const vsechnoOK = bankaOK && hotovostOK;
  const vybranoCount = ALL_IDS.filter((id) => vybrane.has(id)).length;
  const vybraneProvozy = PLATBY_PROVOZY.filter((p) => provozFaktury(p).some((f) => vybrane.has(f.id)));

  return (
    <div className="platby-modul">

      {/* ── Horní lišta ── */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div className="d-flex align-items-center gap-3">
          <h4 className="mb-0">Platby</h4>
          <span className="badge bg-light text-muted border d-inline-flex align-items-center gap-1"
            title="Platby se řeší za celou firmu — výběr provozovny je neaktivní">
            <iconify-icon icon="solar:buildings-2-bold-duotone" style={{ fontSize: 14 }} />
            Celá firma
          </span>
        </div>
        <div className="d-flex align-items-end gap-3 flex-wrap">
          <div>
            <label className="form-label fs-13 fw-semibold mb-1 d-flex align-items-center gap-1">
              <iconify-icon icon="solar:calendar-bold-duotone" style={{ fontSize: 14 }} />
              Platit do
            </label>
            <input type="date" className="form-control form-control-sm" style={{ minWidth: 160 }}
              value={doDatum} onChange={(e) => setDoDatum(e.target.value)} />
          </div>
          <button
            className={`btn btn-sm ${vsechnoOK ? 'btn-success' : 'btn-outline-danger'} d-inline-flex align-items-center gap-2`}
            disabled={!vsechnoOK}
            onClick={openAuth}
            title={vsechnoOK ? 'Autorizovat a odeslat platby' : 'Nejdřív vyřešte nedostatek prostředků (červené pole)'}
          >
            <iconify-icon icon="solar:shield-check-bold-duotone" style={{ fontSize: 16 }} />
            Autorizovat platby
          </button>
        </div>
      </div>

      {/* ── Dvě souhrnné tabulky ── */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-6">
          <div className={`card h-100 platby-souhrn ${bankaOK ? 'platby-ok' : 'platby-nok'}`}>
            <div className="card-header d-flex align-items-center justify-content-between">
              <span className="fw-bold d-flex align-items-center gap-2">
                <iconify-icon icon="solar:card-2-bold-duotone" style={{ fontSize: 18 }} />
                Banka — pravidelné platby
              </span>
              <span className={`badge ${bankaOK ? 'bg-success' : 'bg-danger'}`}>{bankaOK ? 'Dostatek' : 'Nedostatek'}</span>
            </div>
            <div className="card-body py-2">
              <SouhrnRadek label="Aktuální stav účtů" value={banka.stavUctu} />
              <SouhrnRadek label="− Trvalé příkazy" value={-banka.trvalePrikazy} minus />
              <SouhrnRadek label="− Úvěry" value={-banka.uvery} minus />
              <SouhrnRadek label="− Daně" value={-banka.dane} minus />
              <SouhrnRadek label="− Poplatky" value={-banka.poplatky} minus />
              <SouhrnRadek label="− Platby (vybrané faktury)" value={-banka.platby} minus />
              {banka.vyberHotovost > 0 && (
                <SouhrnRadek label="− Výběr hotovosti (výplaty)" value={-banka.vyberHotovost} minus />
              )}
              <SouhrnRadek label="+ Predikce (peníze na cestě)" value={banka.predikce} predikce />
            </div>
            <div className={`card-footer d-flex align-items-center justify-content-between fw-bold ${bankaOK ? 'text-success' : 'text-danger'}`}>
              <span>Budoucí zůstatek po schválení</span>
              <span className="czk-num" style={{ fontSize: 18 }}>{fCzk(banka.budouciZustatek)}</span>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className={`card h-100 platby-souhrn ${hotovostOK ? 'platby-ok' : 'platby-nok'}`}>
            <div className="card-header d-flex align-items-center justify-content-between">
              <span className="fw-bold d-flex align-items-center gap-2">
                <iconify-icon icon="solar:safe-2-bold-duotone" style={{ fontSize: 18 }} />
                Hotovost — trezory
              </span>
              <span className={`badge ${hotovost.nutnyVyberCelkem > 0 ? 'bg-warning' : 'bg-success'}`}>
                {hotovost.nutnyVyberCelkem > 0 ? 'Nutný výběr' : 'Dostatek'}
              </span>
            </div>
            <div className="card-body py-2">
              <SouhrnRadek label="Trezory celkem" value={hotovost.trezorCelkem} />
              <SouhrnRadek label={'− Rezerva „Kasař"'} value={-hotovost.kasarCelkem} minus />
              <SouhrnRadek label="Disponibilní hotovost" value={hotovost.disponibilniHotovost} bold />
              <SouhrnRadek label="− Plánované výplaty hotově" value={-hotovost.planVyberVyplaty} minus />
              {hotovost.nutnyVyberCelkem > 0 && (
                <>
                  <SouhrnRadek label="+ Nutný výběr z banky" value={hotovost.nutnyVyberCelkem} predikce />
                  <div className="mt-2 p-2 rounded" style={{ background: '#fff7e6', border: '1px solid #ffe0a3' }}>
                    <div className="text-warning fw-semibold fs-11 text-uppercase mb-1">Kde vybrat z banky</div>
                    {hotovost.provozy.filter((p) => p.nutnyVyber > 0).map((p) => (
                      <div key={p.id} className="d-flex align-items-center gap-2 py-1">
                        <span className="rounded-circle d-inline-block flex-shrink-0" style={{ width: 8, height: 8, background: p.color }} />
                        <span className="fs-13 flex-grow-1">{p.name}</span>
                        <span className="czk-num fs-13 fw-semibold">{fCzk(p.nutnyVyber)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="card-footer d-flex align-items-center justify-content-between fw-bold text-success">
              <span>Hotovost po výplatách</span>
              <span className="czk-num" style={{ fontSize: 18 }}>{fCzk(hotovost.poVyberu)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Provozy → Kategorie → Faktury ── */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <span className="fw-bold">Platby ke schválení do {fmtDatum(doDatum)}</span>
          <span className="text-muted fs-13">{vybranoCount} z {ALL_IDS.length} faktur · celkem {fCzk(platbySum)}</span>
        </div>
        <div className="card-body p-0">
          {/* Vše */}
          <div className="platby-row d-flex align-items-center gap-2 px-3 py-2 border-bottom bg-light bg-opacity-50">
            <Check state={vybrane.size === ALL_IDS.length ? 'all' : vybrane.size === 0 ? 'none' : 'some'} onChange={toggleVse} />
            <span className="fw-bold flex-grow-1">Vše</span>
            <span className="fw-bold czk-num flex-shrink-0">{fCzk(platbySum)}</span>
          </div>

          {PLATBY_PROVOZY.map((p) => {
            const ids = provozFaktury(p).map((f) => f.id);
            const sel = ids.filter((id) => vybrane.has(id)).length;
            const pState: TriState = sel === ids.length ? 'all' : sel === 0 ? 'none' : 'some';
            const pOpen = openProvoz.has(p.id);
            return (
              <div key={p.id}>
                {/* Provoz */}
                <div className="platby-row d-flex align-items-center gap-2 px-3 py-2 border-bottom">
                  <Check state={pState} onChange={() => toggleProvoz(p)} />
                  <span className="rounded-circle d-inline-block flex-shrink-0" style={{ width: 10, height: 10, background: p.color }} />
                  <button className="btn btn-link p-0 text-decoration-none text-body fw-semibold flex-grow-1 text-start d-flex align-items-center gap-2 min-width-0"
                    onClick={() => toggleOpenProvoz(p.id)}>
                    <iconify-icon icon={pOpen ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-right-bold'} style={{ fontSize: 14, color: '#9097a7', flexShrink: 0 }} />
                    <span className="text-truncate">{p.name}</span>
                  </button>
                  <span className="badge bg-secondary-subtle text-secondary flex-shrink-0">{sel}/{ids.length}</span>
                  <span className="fw-bold czk-num flex-shrink-0" style={{ minWidth: 120, textAlign: 'right' }}>{fCzk(sumVybrane(p, vybrane))}</span>
                </div>

                {/* Kategorie */}
                {pOpen && p.kategorie.map((k) => {
                  const meta = KATEGORIE_META[k.kategorie];
                  const kIds = k.faktury.map((f) => f.id);
                  const kSel = kIds.filter((id) => vybrane.has(id)).length;
                  const kState: TriState = kSel === kIds.length ? 'all' : kSel === 0 ? 'none' : 'some';
                  const kKey = `${p.id}::${k.kategorie}`;
                  const kOpen = openKat.has(kKey);
                  const kSelSum = k.faktury.filter((f) => vybrane.has(f.id)).reduce((s, f) => s + f.castka, 0);
                  return (
                    <div key={kKey}>
                      <div className="platby-row d-flex align-items-center gap-2 py-2 border-bottom" style={{ paddingLeft: 40, paddingRight: 16, background: '#fbfcfd' }}>
                        <Check state={kState} onChange={() => toggleKat(k)} />
                        <button className="btn btn-link p-0 text-decoration-none text-body flex-grow-1 text-start d-flex align-items-center gap-2 min-width-0"
                          onClick={() => toggleOpenKat(kKey)}>
                          <iconify-icon icon={kOpen ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-right-bold'} style={{ fontSize: 13, color: '#9097a7', flexShrink: 0 }} />
                          <iconify-icon icon={meta.icon} style={{ fontSize: 16, color: '#6c757d', flexShrink: 0 }} />
                          <span className="fs-13 text-truncate">{meta.label}</span>
                          {meta.hotovost && <span className="badge bg-warning-subtle text-warning flex-shrink-0" style={{ fontSize: 10 }}>hotově</span>}
                        </button>
                        <span className="badge bg-light text-muted border flex-shrink-0">{kSel}/{kIds.length}</span>
                        <span className="czk-num fs-13 flex-shrink-0" style={{ minWidth: 120, textAlign: 'right' }}>{fCzk(kSelSum)}</span>
                      </div>

                      {/* Faktury */}
                      {kOpen && k.faktury.map((f) => {
                        const on = vybrane.has(f.id);
                        const now = ihned.has(f.id);
                        return (
                          <div key={f.id} className="platby-row d-flex align-items-center gap-2 py-2 border-bottom"
                            style={{ paddingLeft: 64, paddingRight: 16, opacity: on ? 1 : 0.55 }}>
                            <Check state={on ? 'all' : 'none'} onChange={() => toggleFaktura(f.id)} />
                            <div className="flex-grow-1 min-width-0">
                              <div className="fs-13 fw-semibold text-truncate">{f.dodavatel}</div>
                              <div className="text-muted fs-11 czk-num">
                                {f.cislo} · {now ? <span className="text-success fw-semibold">splatnost dnes</span> : `splatnost ${fmtDatum(f.splatnost)}`}
                              </div>
                            </div>
                            <span className="czk-num fs-13 flex-shrink-0" style={{ minWidth: 100, textAlign: 'right' }}>{fCzk(f.castka)}</span>
                            <button
                              className="btn btn-sm btn-outline-primary py-0 px-2 flex-shrink-0 d-inline-flex align-items-center gap-1"
                              style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                              onClick={() => setDetail({ f, provoz: p, kat: k.kategorie })}
                              title="Zobrazit detail faktury">
                              <iconify-icon icon="solar:document-text-bold-duotone" style={{ fontSize: 13 }} />
                              Detail
                            </button>
                            <button
                              className={`btn btn-sm ${now ? 'btn-success' : 'btn-outline-secondary'} py-0 px-2 flex-shrink-0`}
                              style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                              onClick={() => toggleIhned(f)}
                              title={now ? 'Zařazeno do nejbližší platby' : 'Uhradit ihned — nečekat na splatnost'}>
                              {now ? '✓ Ihned' : 'Uhradit ihned'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Detail faktury (sdílený FakturySidePanel, jen jiné CTA) ── */}
      {detail && (() => {
        const vybrano = vybrane.has(detail.f.id);
        const now = ihned.has(detail.f.id);
        return (
          <>
            <div className="platby-overlay-backdrop" onClick={() => setDetail(null)} />
            <div className="platby-overlay-panel">
              <FakturySidePanel
                faktura={toFakturaPlatby(detail.f, detail.provoz, detail.kat)}
                effectiveStav="schvalena"
                effectiveKategorie={KAT_TO_FAKTURA[detail.kat]}
                localPoznamka=""
                localSchvalil=""
                localDatumSchvaleni=""
                localPrirazeni=""
                onClose={() => setDetail(null)}
                onSchvalit={() => {}}
                onZamitout={() => {}}
                onOdlozit={() => {}}
                onPoznamkaChange={() => {}}
                hideWorkflow
                ctaSlot={
                  <div className="d-flex flex-column gap-2">
                    <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Platba</div>
                    <button className={`btn btn-sm ${now ? 'btn-success' : 'btn-outline-success'} d-inline-flex align-items-center justify-content-center gap-2`}
                      onClick={() => toggleIhned(detail.f)}>
                      <iconify-icon icon="solar:bolt-bold-duotone" style={{ fontSize: 15 }} />
                      {now ? '✓ Uhradit ihned (zapnuto)' : 'Uhradit ihned'}
                    </button>
                    <button className={`btn btn-sm ${vybrano ? 'btn-outline-secondary' : 'btn-outline-primary'} d-inline-flex align-items-center justify-content-center gap-2`}
                      onClick={() => toggleFaktura(detail.f.id)}>
                      <iconify-icon icon={vybrano ? 'solar:close-circle-bold-duotone' : 'solar:check-circle-bold-duotone'} style={{ fontSize: 15 }} />
                      {vybrano ? 'Nechat na příště (odebrat z výběru)' : 'Přidat do výběru k platbě'}
                    </button>
                  </div>
                }
              />
            </div>
          </>
        );
      })()}

      {/* ── Autorizace platby (modal + heslo) ── */}
      {authOpen && (
        <div className="platby-modal-backdrop" onClick={() => setAuthOpen(false)}>
          <div className="platby-modal card" onClick={(e) => e.stopPropagation()}>
            {!authDone ? (
              <>
                <div className="card-header d-flex align-items-center justify-content-between">
                  <span className="fw-bold d-flex align-items-center gap-2">
                    <iconify-icon icon="solar:shield-keyhole-bold-duotone" style={{ fontSize: 20, color: '#198754' }} />
                    Autorizace platby
                  </span>
                  <button className="btn-close" style={{ fontSize: 11 }} onClick={() => setAuthOpen(false)} />
                </div>
                <div className="card-body">
                  <p className="fs-13 mb-3">
                    Odesíláte <strong>{vybranoCount}</strong> {vybranoCount === 1 ? 'platbu' : vybranoCount < 5 ? 'platby' : 'plateb'} za
                    {' '}<strong>{vybraneProvozy.length}</strong> {vybraneProvozy.length === 1 ? 'provoz' : vybraneProvozy.length < 5 ? 'provozy' : 'provozů'} v celkové výši
                    {' '}<strong className="czk-num">{fCzk(platbySum)}</strong> do termínu {fmtDatum(doDatum)}.
                  </p>
                  <label className="form-label fs-13 fw-semibold mb-1">Zadejte autorizační heslo</label>
                  <input
                    type="password" autoFocus
                    className={`form-control ${authErr ? 'is-invalid' : ''}`}
                    placeholder="Heslo"
                    value={heslo}
                    onChange={(e) => { setHeslo(e.target.value); setAuthErr(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitAuth(); }}
                  />
                  {authErr && <div className="text-danger fs-12 mt-1">Nesprávné heslo. Zkuste to znovu.</div>}
                  <div className="text-muted fs-11 mt-2">Testovací heslo: <span className="czk-num">2026</span></div>
                </div>
                <div className="card-footer d-flex justify-content-end gap-2">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setAuthOpen(false)}>Zrušit</button>
                  <button className="btn btn-sm btn-success d-inline-flex align-items-center gap-2" onClick={submitAuth}>
                    <iconify-icon icon="solar:shield-check-bold-duotone" style={{ fontSize: 15 }} />
                    Potvrdit a odeslat
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="card-body text-center py-4">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                    style={{ width: 64, height: 64, background: '#e8f5ee' }}>
                    <iconify-icon icon="solar:check-circle-bold-duotone" style={{ fontSize: 40, color: '#198754' }} />
                  </div>
                  <h5 className="mb-2">Děkujeme!</h5>
                  <p className="fs-13 text-muted mb-3">
                    Právě jste odeslal platby za tyto provozy v celkové výši <strong className="czk-num text-body">{fCzk(platbySum)}</strong>.
                  </p>
                  <div className="d-flex flex-wrap justify-content-center gap-2 mb-1">
                    {vybraneProvozy.map((p) => (
                      <span key={p.id} className="badge d-inline-flex align-items-center gap-1"
                        style={{ background: `${p.color}1a`, color: p.color, fontWeight: 600 }}>
                        <span className="rounded-circle d-inline-block" style={{ width: 8, height: 8, background: p.color }} />
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="card-footer d-flex justify-content-center">
                  <button className="btn btn-sm btn-success px-4" onClick={() => setAuthOpen(false)}>Hotovo</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tri-state checkbox ──────────────────────────────────────
function Check({ state, onChange }: { state: TriState; onChange: () => void }) {
  return (
    <input
      type="checkbox"
      className="form-check-input mt-0 flex-shrink-0"
      checked={state === 'all'}
      ref={(el) => { if (el) el.indeterminate = state === 'some'; }}
      onChange={onChange}
    />
  );
}

// ── Řádek souhrnné tabulky ──────────────────────────────────
function SouhrnRadek({ label, value, minus, predikce, bold }: {
  label: string; value: number; minus?: boolean; predikce?: boolean; bold?: boolean;
}) {
  return (
    <div className="d-flex align-items-center justify-content-between py-1 border-bottom border-light">
      <span className={`fs-13 ${bold ? 'fw-semibold' : 'text-muted'}`}>{label}</span>
      <span className={`czk-num ${bold ? 'fw-bold' : ''} ${minus ? 'text-danger' : predikce ? 'text-success' : ''}`}>{fCzk(value)}</span>
    </div>
  );
}

function fmtDatum(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)}. ${parseInt(m)}. ${y}`;
}
