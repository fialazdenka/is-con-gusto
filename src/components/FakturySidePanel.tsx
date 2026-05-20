import { useState } from 'react';
import type { FakturaPlatby, FakturaStavPlatby, MatchingStav, FakturaForma } from '../platbyData';
import InvoicePreview from './InvoicePreview';
import DLMatchingDetail from './DLMatchingDetail';
import DuplicateDetail from './DuplicateDetail';
import type { SessionAuditEntry } from './FakturyView';
import {
  getMatchingData,
  getVS,
  SCHVALOVACI_OSOBY,
  KATEGORIE_LABELS,
  FAKTURY_PLATBY,
} from '../platbyData';
import { PROVOZOVNY, fCzk, fDate } from '../data';

const FORMA_INFO: Record<FakturaForma, { label: string; icon: string; color: string; bg: string; popis: string }> = {
  standard: { label: 'Standardní', icon: 'solar:document-bold-duotone',         color: '#9097a7', bg: '#f8f9fa',  popis: 'Běžná faktura' },
  zalohova: { label: 'Zálohová',   icon: 'solar:wallet-money-bold-duotone',     color: '#0dcaf0', bg: '#e8f7ff',  popis: 'Záloha bude započtena při finální fakturaci. Hlídá se navázání na finální doklad.' },
  dobropis: { label: 'Dobropis',   icon: 'solar:undo-left-round-bold-duotone',  color: '#dc3545', bg: '#fff5f5',  popis: 'Vratka / oprava — záporná částka snižuje původní závazek.' },
  offset:   { label: 'Offset',     icon: 'solar:transfer-horizontal-bold-duotone', color: '#6c757d', bg: '#f1f3f5', popis: 'Vzájemný zápočet — kompenzace pohledávky a závazku se stejným partnerem.' },
};

export interface KomentarEntry {
  id: string;
  kdo: string;
  role: string;
  avatar: string;
  color: string;
  zprava: string;
  cas: string;
}

const ROLE_LABEL: Record<string, string> = {
  ucetni: 'Účetní',
  provoz: 'Provoz',
  management: 'Management',
  schvalovatel: 'Schvalovatel',
  fakturant: 'Fakturant',
  majitel: 'Majitel',
};

function getMockKomentare(faktura: FakturaPlatby, matchingStav?: string): KomentarEntry[] {
  const base: KomentarEntry[] = [
    {
      id: 'mk-1', kdo: 'Jana Kovářová', role: 'ucetni', avatar: 'JK', color: '#0dcaf0',
      zprava: `Faktura zaevidována — kategorie ${KATEGORIE_LABELS[faktura.kategorie]}.`,
      cas: fDate(faktura.datum),
    },
  ];

  if (matchingStav === 'nesedi-dl') {
    base.push(
      { id: 'mk-2', kdo: 'Jana Kovářová', role: 'ucetni', avatar: 'JK', color: '#0dcaf0',
        zprava: 'Částka nesedí s dodacím listem. Prosím prověřte u provozovny před schválením.', cas: fDate(faktura.splatnost) },
      { id: 'mk-3', kdo: 'Martin Procházka', role: 'provoz', avatar: 'MP', color: '#198754',
        zprava: 'Vraceli jsme část zboží zpět dodavateli, dobropis ještě nepřišel. Čekáme.', cas: fDate(faktura.splatnost) },
    );
  } else if (matchingStav === 'duplikat') {
    base.push(
      { id: 'mk-2', kdo: 'Jana Kovářová', role: 'ucetni', avatar: 'JK', color: '#0dcaf0',
        zprava: 'Upozorňuji — tato faktura vypadá jako duplicitní. Kontaktuji dodavatele.', cas: fDate(faktura.splatnost) },
    );
  } else if (matchingStav === 'sparovana') {
    base.push(
      { id: 'mk-2', kdo: 'Jana Kovářová', role: 'ucetni', avatar: 'JK', color: '#0dcaf0',
        zprava: 'DL zkontrolován, vše sedí. Připraveno ke schválení.', cas: fDate(faktura.splatnost) },
    );
  } else if (faktura.stav === 'nova' || faktura.stav === 'ke-schvaleni') {
    base.push(
      { id: 'mk-2', kdo: 'Jana Kovářová', role: 'ucetni', avatar: 'JK', color: '#0dcaf0',
        zprava: 'Prosím o schválení, splatnost se blíží.', cas: fDate(faktura.splatnost) },
    );
  }

  return base;
}

interface Props {
  faktura: FakturaPlatby | null;
  effectiveStav: FakturaStavPlatby;
  localPoznamka: string;
  localSchvalil: string;
  localDatumSchvaleni: string;
  localPrirazeni: string;
  onClose: () => void;
  onSchvalit: (id: string) => void;
  onZamitout: (id: string) => void;
  onOdlozit: (id: string) => void;
  onPoznamkaChange: (id: string, val: string) => void;
  sessionAudit?: SessionAuditEntry[];
  komentare?: KomentarEntry[];
  onAddKomentar?: (id: string, entry: KomentarEntry) => void;
  onRematch?: (id: string) => void;
}

// ── Status metadata ────────────────────────────────────────────

const STAV_META: Record<FakturaStavPlatby, { cls: string; label: string; icon: string }> = {
  nova:                { cls: 'bg-secondary-subtle text-secondary', label: 'Nová',               icon: 'solar:document-bold-duotone' },
  'ke-schvaleni':      { cls: 'bg-warning-subtle text-warning',     label: 'Ke schválení',       icon: 'solar:clock-circle-bold-duotone' },
  schvalena:           { cls: 'bg-success-subtle text-success',     label: 'Schválená',          icon: 'solar:check-circle-bold-duotone' },
  zamitnuta:           { cls: 'bg-danger-subtle text-danger',       label: 'Zamítnutá',          icon: 'solar:close-circle-bold-duotone' },
  zastavena:           { cls: 'bg-danger-subtle text-danger',       label: 'Zastavená',          icon: 'solar:pause-circle-bold-duotone' },
  odeslana:            { cls: 'bg-info-subtle text-info',           label: 'Odeslaná',           icon: 'solar:arrow-right-up-bold-duotone' },
  zaplacena:           { cls: 'bg-success-subtle text-success',     label: 'Zaplacená',          icon: 'solar:check-square-bold-duotone' },
  'v-bance':           { cls: 'bg-info-subtle text-info',           label: 'V bance',            icon: 'solar:bank-bold-duotone' },
  'ceka-na-sparovani': { cls: 'platby-stav-sparovani',              label: 'Čeká na spárování',  icon: 'solar:refresh-circle-bold-duotone' },
  'chyba-platby':      { cls: 'platby-stav-chyba',                  label: 'Platba neproběhla',  icon: 'solar:danger-circle-bold-duotone' },
};

const MATCHING_META: Record<MatchingStav, { cls: string; label: string; icon: string; color: string }> = {
  'ceka-na-sparovani':  { cls: 'bg-info-subtle text-info',      label: 'Čeká na párování',    icon: 'solar:refresh-circle-bold-duotone',    color: '#0dcaf0' },
  sparovana:            { cls: 'bg-success-subtle text-success', label: 'Spárováno ✓',         icon: 'solar:check-circle-bold-duotone',      color: '#198754' },
  'nesedi-dl':          { cls: 'bg-warning-subtle text-warning', label: 'Nesedí DL',           icon: 'solar:danger-triangle-bold-duotone',   color: '#ffc107' },
  'castecne-sparovana': { cls: 'bg-warning-subtle text-warning', label: 'Část. spárováno',     icon: 'solar:pie-chart-bold-duotone',         color: '#fd7e14' },
  duplikat:             { cls: 'bg-danger-subtle text-danger',   label: 'Duplicita',           icon: 'solar:copy-bold-duotone',              color: '#dc3545' },
  'bez-dl':             { cls: 'bg-secondary-subtle text-secondary', label: 'Bez DL',          icon: 'solar:document-bold-duotone',          color: '#9097a7' },
};

// ── Mock audit entries (Phase 1 – per invoice state) ──────────

const EDITACE_MOCK = [
  'Variabilní symbol doplněn dle DL',
  'Kategorie upřesněna podle položek',
  'Splatnost opravena dle smlouvy',
  'Doplněno IČO dodavatele',
  'Přiřazena provozovna',
];

function getMockAudit(faktura: FakturaPlatby, effectiveStav: FakturaStavPlatby) {
  const base: Array<{ cas: string; kdo: string; akce: string; icon: string; color: string; typ?: string }> = [
    { cas: fDate(faktura.datum), kdo: 'Petra Nováková', akce: 'Faktura zadána do systému', icon: 'solar:document-add-bold-duotone', color: '#9097a7', typ: 'zadani' },
    { cas: fDate(faktura.datum), kdo: 'Petra Nováková', akce: `Příloha nahrána: ${faktura.cislo}.pdf`, icon: 'solar:upload-bold-duotone', color: '#9097a7', typ: 'priloha' },
  ];

  // Mock editace pro faktury, které prošly zpracováním (ne 'nova')
  if (faktura.stav !== 'nova') {
    const hash = parseInt(faktura.id.replace(/\D/g, ''), 10) || 0;
    const editaceAkce = EDITACE_MOCK[hash % EDITACE_MOCK.length];
    base.push({ cas: fDate(faktura.datum), kdo: 'Jana Kovářová', akce: editaceAkce, icon: 'solar:pen-bold-duotone', color: '#6f42c1', typ: 'editace' });
  }

  if (faktura.prirazenaOsoba) {
    const osoba = SCHVALOVACI_OSOBY.find((o) => o.id === faktura.prirazenaOsoba);
    base.push({ cas: fDate(faktura.datum), kdo: 'Systém', akce: `Přiřazeno ke schválení → ${osoba?.jmeno ?? ''}`, icon: 'solar:user-id-bold-duotone', color: '#c9911a', typ: 'prirazeni' });
  }

  const matching = getMatchingData(faktura.id);
  if (matching) {
    // Přepárování — spuštěno před samotným výsledkem
    if (matching.stav === 'sparovana' || matching.stav === 'nesedi-dl' || matching.stav === 'castecne-sparovana') {
      base.push({ cas: fDate(faktura.splatnost), kdo: 'Systém', akce: `Spuštěno párování s DL: ${matching.dlCisla?.join(', ') ?? '—'}`, icon: 'solar:refresh-circle-bold-duotone', color: '#0dcaf0', typ: 'parovani' });
    }
    if (matching.stav === 'sparovana') {
      base.push({ cas: fDate(faktura.splatnost), kdo: 'Systém', akce: `DL spárován: ${matching.dlCisla?.join(', ')}`, icon: 'solar:check-circle-bold-duotone', color: '#198754', typ: 'parovani' });
    } else if (matching.stav === 'nesedi-dl') {
      const rozdil = matching.dlCastka != null ? Math.abs(faktura.castka - matching.dlCastka) : 0;
      base.push({ cas: fDate(faktura.splatnost), kdo: 'Systém', akce: `Neshoda s DL — rozdíl ${rozdil.toLocaleString('cs-CZ')} Kč`, icon: 'solar:danger-triangle-bold-duotone', color: '#ffc107', typ: 'parovani' });
    } else if (matching.stav === 'duplikat') {
      base.push({ cas: fDate(faktura.splatnost), kdo: 'Systém', akce: `Detekována duplicita (orig.: ${matching.duplikatFakturaId}) — zablokováno`, icon: 'solar:copy-bold-duotone', color: '#dc3545', typ: 'parovani' });
    } else if (matching.stav === 'castecne-sparovana') {
      base.push({ cas: fDate(faktura.splatnost), kdo: 'Systém', akce: 'Spárováno částečně — chybí některé položky DL', icon: 'solar:pie-chart-bold-duotone', color: '#fd7e14', typ: 'parovani' });
    }
  }

  if (effectiveStav === 'schvalena' && faktura.schvalil) {
    base.push({ cas: faktura.datumSchvaleni ?? '', kdo: faktura.schvalil, akce: 'Faktura schválena k úhradě', icon: 'solar:check-circle-bold-duotone', color: '#198754', typ: 'schvaleni' });
  }
  if (effectiveStav === 'zamitnuta') {
    base.push({ cas: fDate(faktura.datum), kdo: faktura.schvalil ?? 'Schvalovatel', akce: 'Faktura zamítnuta', icon: 'solar:close-circle-bold-duotone', color: '#dc3545', typ: 'schvaleni' });
  }
  return base.reverse();
}

const TYP_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  zadani:     { label: 'Zadání',    bg: '#f8f9fa', color: '#6c757d' },
  priloha:    { label: 'Příloha',   bg: '#f8f9fa', color: '#6c757d' },
  editace:    { label: 'Editace',   bg: '#f3eaff', color: '#6f42c1' },
  prirazeni:  { label: 'Přiřazení', bg: '#fff5e0', color: '#c9911a' },
  parovani:   { label: 'Párování',  bg: '#e8f7ff', color: '#0dcaf0' },
  schvaleni:  { label: 'Schválení', bg: '#e8f5ee', color: '#198754' },
  komunikace: { label: 'Komunikace', bg: '#f1f3f5', color: '#6c757d' },
  stav:       { label: 'Stav',      bg: '#fff3cd', color: '#856404' },
};

// ─────────────────────────────────────────────────────────────

const PANEL_USER = SCHVALOVACI_OSOBY.find((o) => o.role === 'majitel')!;

export default function FakturySidePanel({
  faktura,
  effectiveStav,
  localPoznamka,
  localSchvalil,
  localDatumSchvaleni,
  localPrirazeni,
  onClose,
  onSchvalit,
  onZamitout,
  onOdlozit,
  onPoznamkaChange,
  sessionAudit = [],
  komentare = [],
  onAddKomentar,
  onRematch,
}: Props) {

  const [showAudit, setShowAudit] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showPrilohy, setShowPrilohy] = useState(true);
  const [komentar, setKomentar] = useState('');

  // ── Empty state ──────────────────────────────────────────────
  if (!faktura) {
    return (
      <div className="card h-100" style={{ minHeight: 320 }}>
        <div className="card-body d-flex flex-column align-items-center justify-content-center text-center py-5">
          <iconify-icon icon="solar:document-bold-duotone" style={{ fontSize: 40, color: '#dee2e6', marginBottom: 12 }} />
          <div className="fw-semibold text-muted fs-14 mb-1">Žádná faktura vybrána</div>
          <div className="text-muted fs-12">Klikněte na řádek faktury pro zobrazení detailu</div>
        </div>
      </div>
    );
  }

  const matching   = getMatchingData(faktura.id);
  const stavMeta   = STAV_META[effectiveStav] ?? STAV_META['nova'];
  const matchMeta  = matching ? MATCHING_META[matching.stav] : null;
  const prov       = PROVOZOVNY.find((p) => p.id === faktura.provozovna);
  const prirazeniId = localPrirazeni || faktura.prirazenaOsoba || '';
  const prirazenaOsoba = SCHVALOVACI_OSOBY.find((o) => o.id === prirazeniId);
  const schvalilFinal = localSchvalil || faktura.schvalil || '';
  const datumSchvFinal = localDatumSchvaleni || faktura.datumSchvaleni || '';

  const isAprovable = effectiveStav === 'nova' || effectiveStav === 'ke-schvaleni';
  const isZastavena = effectiveStav === 'zastavena';
  const isZamitnuta = effectiveStav === 'zamitnuta';
  const mismatch    = matching?.stav === 'nesedi-dl';
  const isDuplikat  = matching?.stav === 'duplikat';
  const rozdil      = matching?.dlCastka != null ? faktura.castka - matching.dlCastka : 0; // pro alert banner
  const mockAudit     = getMockAudit(faktura, effectiveStav);
  const audit         = [...sessionAudit, ...mockAudit];
  const mockKomentare = getMockKomentare(faktura, matching?.stav);
  const allKomentare  = [...mockKomentare, ...komentare];

  function sendKomentar() {
    if (!faktura || !komentar.trim() || !onAddKomentar) return;
    onAddKomentar(faktura.id, {
      id: `k-${Date.now()}`,
      kdo: PANEL_USER.jmeno,
      role: PANEL_USER.role,
      avatar: PANEL_USER.avatar ?? '',
      color: 'var(--prov-color, #c9911a)',
      zprava: komentar.trim(),
      cas: new Date().toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    });
    setKomentar('');
  }

  return (
    <div style={{ position: 'sticky', top: 24, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto' }}>
      <div className="card">

        {/* ── Header ──────────────────────────────────── */}
        <div className="card-header d-flex align-items-start gap-2">
          <div className="flex-grow-1 min-width-0">
            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
              <span className={`badge ${stavMeta.cls}`}>
                <iconify-icon icon={stavMeta.icon} className="me-1" style={{ fontSize: 11 }} />
                {stavMeta.label}
              </span>
              {matchMeta && (
                <span className={`badge ${matchMeta.cls}`}>
                  <iconify-icon icon={matchMeta.icon} className="me-1" style={{ fontSize: 11 }} />
                  {matchMeta.label}
                </span>
              )}
            </div>
            <div className="fw-bold fs-14 text-truncate">{faktura.dodavatel}</div>
            <div className="text-muted fs-11 czk-num mt-1">
              {faktura.cislo}
              {' · '}
              {faktura.typDokladu === 'vydana' ? 'Vydaná' : 'Přijatá'}
              {' · '}
              {KATEGORIE_LABELS[faktura.kategorie]}
            </div>
          </div>
          <button className="btn-close flex-shrink-0 mt-1" style={{ fontSize: 11 }} onClick={onClose} />
        </div>

        {/* ── Mismatch / duplicate alert ───────────────── */}
        {mismatch && (
          <div className="alert alert-warning d-flex align-items-start gap-2 mx-3 mt-3 mb-0 py-2 px-3">
            <iconify-icon icon="solar:danger-triangle-bold-duotone" style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }} />
            <div className="fs-12">
              <strong>Nesedí DL</strong> — faktura {fCzk(faktura.castka)}, DL {fCzk(matching!.dlCastka!)}
              <div className="mt-1 text-warning fw-bold">Rozdíl: {fCzk(Math.abs(rozdil))} {rozdil > 0 ? '(faktura vyšší)' : '(DL vyšší)'}</div>
            </div>
          </div>
        )}
        {isDuplikat && (
          <div className="alert alert-danger d-flex align-items-start gap-2 mx-3 mt-3 mb-0 py-2 px-3">
            <iconify-icon icon="solar:copy-bold-duotone" style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }} />
            <div className="fs-12">
              <strong>Duplicitní faktura</strong> — stejný dodavatel, období a částka nalezena v systému.
              <div className="mt-1">Ref: <span className="czk-num fw-semibold">{matching!.duplikatFakturaId}</span></div>
            </div>
          </div>
        )}

        <div className="card-body p-0">

          {/* ── Key details ─────────────────────────────── */}
          <div className="p-3 border-bottom">
            <div className="d-flex align-items-end justify-content-between mb-3">
              <div>
                <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Částka</div>
                <div className={`fw-bold czk-num ${faktura.castka < 0 ? 'text-danger' : ''}`} style={{ fontSize: 22, lineHeight: 1 }}>{fCzk(faktura.castka)}</div>
              </div>
              {prov && (
                <div className="text-end">
                  <div className="d-flex align-items-center gap-1 justify-content-end">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: prov.color, display: 'inline-block' }} />
                    <span className="fs-13 fw-semibold">{prov.shortName}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="row g-2">
              <div className="col-6">
                <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Splatnost</div>
                <div className="fs-13 fw-semibold">{fDate(faktura.splatnost)}</div>
              </div>
              <div className="col-6">
                <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Vystavena</div>
                <div className="fs-13">{fDate(faktura.datum)}</div>
              </div>
              <div className="col-6">
                <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Variabilní symbol</div>
                <div className="fs-13 czk-num fw-semibold">{getVS(faktura)}</div>
              </div>
              <div className="col-6">
                <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Číslo faktury</div>
                <div className="fs-12 czk-num text-muted">{faktura.cislo}</div>
              </div>
              {matching?.dlCisla && matching.dlCisla.length > 0 && (
                <div className="col-12">
                  <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Dodací list (DL)</div>
                  <div className="d-flex flex-wrap gap-1">
                    {matching.dlCisla.map((dl) => (
                      <span key={dl} className="badge bg-secondary-subtle text-secondary czk-num fs-11">{dl}</span>
                    ))}
                  </div>
                </div>
              )}
              {prirazenaOsoba && (
                <div className="col-12">
                  <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Přiřazeno</div>
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                      style={{ width: 22, height: 22, fontSize: 8, background: 'var(--prov-color, #c9911a)' }}>
                      {prirazenaOsoba.avatar}
                    </div>
                    <span className="fs-12">{prirazenaOsoba.jmeno}</span>
                  </div>
                </div>
              )}
              {schvalilFinal && (
                <div className="col-12">
                  <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Schválil</div>
                  <div className="fs-12">{schvalilFinal} · {datumSchvFinal}</div>
                </div>
              )}
              {faktura.poznamka && (
                <div className="col-12">
                  <div className="text-muted fs-11 text-uppercase fw-semibold mb-1">Poznámka</div>
                  <div className="fs-12 text-muted">{faktura.poznamka}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Účetní forma (zálohová / dobropis / offset) ── */}
          {faktura.forma && faktura.forma !== 'standard' && (() => {
            const info = FORMA_INFO[faktura.forma];
            const spojena = faktura.spojenaSId
              ? FAKTURY_PLATBY.find((x) => x.id === faktura.spojenaSId)
              : null;
            return (
              <div className="p-3 border-bottom" style={{ background: info.bg }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <iconify-icon icon={info.icon} style={{ fontSize: 18, color: info.color, flexShrink: 0 }} />
                  <span className="fw-bold fs-13" style={{ color: info.color }}>{info.label}</span>
                  <span className="text-muted fs-11 ms-auto">Speciální účetní případ</span>
                </div>
                <div className="fs-12 mb-2" style={{ color: '#3d4149', lineHeight: 1.5 }}>{info.popis}</div>
                {spojena && (
                  <div className="d-flex align-items-center gap-2 p-2 rounded" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <iconify-icon icon="solar:link-bold-duotone" style={{ fontSize: 14, color: info.color, flexShrink: 0 }} />
                    <div className="flex-grow-1 min-width-0">
                      <div className="text-muted fs-11 fw-semibold">Navázáno na</div>
                      <div className="fs-12 czk-num text-truncate">
                        <span className="fw-semibold">{spojena.cislo}</span>
                        <span className="text-muted"> · {spojena.dodavatel} · {fCzk(spojena.castka)}</span>
                      </div>
                    </div>
                  </div>
                )}
                {faktura.forma === 'dobropis' && faktura.castka < 0 && (
                  <div className="mt-2 fs-12 text-danger fw-semibold">
                    <iconify-icon icon="solar:arrow-down-bold" className="me-1" />
                    Snižuje závazek o {fCzk(Math.abs(faktura.castka))}
                  </div>
                )}
                {faktura.forma === 'zalohova' && (
                  <div className="mt-2 fs-12 text-info fw-semibold">
                    <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                    Bude započtena při finální fakturaci
                  </div>
                )}
                {faktura.forma === 'offset' && (
                  <div className="mt-2 fs-12 text-muted fw-semibold">
                    <iconify-icon icon="solar:info-circle-bold-duotone" className="me-1" />
                    Místo platby — zápočet vzájemných pohledávek
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Párování s DL ───────────────────────────── */}
          {matching && (
            <div className="p-3 border-bottom">
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="text-muted fs-11 text-uppercase fw-semibold">Párování s DL</span>
                {matchMeta && (
                  <span className={`badge ${matchMeta.cls} ms-auto`} style={{ fontSize: 10 }}>
                    <iconify-icon icon={matchMeta.icon} className="me-1" style={{ fontSize: 10 }} />
                    {matchMeta.label}
                  </span>
                )}
              </div>

              {matching.stav === 'bez-dl' ? (
                <div className="d-flex align-items-center gap-2 text-muted fs-12">
                  <iconify-icon icon="solar:document-bold-duotone" style={{ fontSize: 16 }} />
                  Bez dodacího listu — služba / nájem / energie
                </div>
              ) : matching.stav === 'duplikat' ? (
                <DuplicateDetail faktura={faktura} originalId={matching.duplikatFakturaId} />
              ) : (
                <DLMatchingDetail faktura={faktura} matching={matching} onRematch={onRematch} />
              )}
            </div>
          )}

          {/* ── Náhled faktury ──────────────────────────── */}
          <div className="p-3 border-bottom">
            <button
              className="d-flex align-items-center justify-content-between w-100 border-0 bg-transparent p-0"
              onClick={() => setShowPreview((v) => !v)}
            >
              <span className="text-muted fs-11 text-uppercase fw-semibold">Náhled faktury</span>
              <iconify-icon
                icon={showPreview ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                style={{ fontSize: 14, color: '#9097a7' }}
              />
            </button>
            {showPreview && (
              <div className="mt-2">
                <InvoicePreview faktura={faktura} />
              </div>
            )}
          </div>

          {/* ── Přílohy ─────────────────────────────────── */}
          <div className="p-3 border-bottom">
            <button
              className="d-flex align-items-center justify-content-between w-100 border-0 bg-transparent p-0 mb-2"
              onClick={() => setShowPrilohy((v) => !v)}
            >
              <div className="d-flex align-items-center gap-2">
                <span className="text-muted fs-11 text-uppercase fw-semibold">Přílohy</span>
                <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 10 }}>1</span>
              </div>
              <iconify-icon
                icon={showPrilohy ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                style={{ fontSize: 14, color: '#9097a7' }}
              />
            </button>
            {showPrilohy && (
              <div className="d-flex flex-column gap-2">
                {/* Mock příloha – scan faktury */}
                <div
                  className="d-flex align-items-center gap-2 p-2 rounded"
                  style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
                >
                  <iconify-icon icon="solar:file-text-bold-duotone" style={{ fontSize: 22, color: '#dc3545', flexShrink: 0 }} />
                  <div className="flex-grow-1 min-width-0">
                    <div className="fs-12 fw-semibold text-truncate czk-num">{faktura.cislo}.pdf</div>
                    <div className="fs-11 text-muted">PDF · 284 kB · nahráno {fDate(faktura.datum)}</div>
                  </div>
                  <a
                    href="#"
                    className="btn btn-light btn-sm flex-shrink-0 py-1 px-2"
                    style={{ fontSize: 11 }}
                    onClick={(e) => e.preventDefault()}
                  >
                    <iconify-icon icon="solar:download-minimalistic-bold-duotone" style={{ fontSize: 13 }} />
                  </a>
                </div>

                {/* Upload placeholder */}
                <button
                  className="d-flex align-items-center justify-content-center gap-2 w-100 border-0 rounded py-2"
                  style={{ background: 'transparent', border: '1px dashed #dee2e6 !important', cursor: 'pointer', outline: '1px dashed #dee2e6' }}
                  onClick={() => {}}
                >
                  <iconify-icon icon="solar:upload-bold-duotone" style={{ fontSize: 14, color: '#9097a7' }} />
                  <span className="fs-12 text-muted">Přidat přílohu</span>
                </button>
              </div>
            )}
          </div>

          {/* ── Workflow akce ────────────────────────────── */}
          <div className="p-3 border-bottom d-flex flex-column gap-2">
            {isAprovable && !isDuplikat && (
              <>
                <button className="btn btn-success btn-sm w-100" onClick={() => onSchvalit(faktura.id)}>
                  <iconify-icon icon="solar:check-circle-bold-duotone" className="me-2" />
                  Schválit fakturu
                </button>
                <div className="d-flex gap-2">
                  <button className="btn btn-light btn-sm flex-grow-1" onClick={() => onOdlozit(faktura.id)}>
                    Odložit
                  </button>
                  <button className="btn btn-danger btn-sm flex-grow-1" onClick={() => onZamitout(faktura.id)}>
                    Zamítnout
                  </button>
                </div>
              </>
            )}
            {isAprovable && isDuplikat && (
              <div className="alert alert-danger py-2 mb-0 fs-12">
                <strong>Schválení blokováno</strong> – nejdříve vyřešte duplicitu
              </div>
            )}
            {isZastavena && (
              <button className="btn btn-success btn-sm w-100" onClick={() => onOdlozit(faktura.id)}>
                <iconify-icon icon="solar:refresh-bold" className="me-2" />
                Obnovit ke schválení
              </button>
            )}
            {isZamitnuta && (
              <button className="btn btn-warning btn-sm w-100" onClick={() => onOdlozit(faktura.id)}>
                <iconify-icon icon="solar:refresh-bold" className="me-2" />
                Přehodnotit
              </button>
            )}
            {!isAprovable && !isZastavena && !isZamitnuta && (
              <div className="text-muted fs-12 text-center py-1">Faktura ve stavu: <strong>{stavMeta.label}</strong></div>
            )}

            {/* Poznámka */}
            <div className="mt-1">
              <textarea
                className="form-control form-control-sm"
                rows={2}
                placeholder="Interní poznámka…"
                value={localPoznamka}
                onChange={(e) => onPoznamkaChange(faktura.id, e.target.value)}
                style={{ fontSize: 12, resize: 'none' }}
              />
            </div>
          </div>

          {/* ── Audit timeline ───────────────────────────── */}
          <div className="p-3 border-bottom">
            <button
              className="d-flex align-items-center justify-content-between w-100 border-0 bg-transparent p-0 mb-2"
              onClick={() => setShowAudit((v) => !v)}
            >
              <span className="text-muted fs-11 text-uppercase fw-semibold">Historie</span>
              <iconify-icon
                icon={showAudit ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                style={{ fontSize: 14, color: '#9097a7' }}
              />
            </button>
            {showAudit && (
              <div className="platby-audit-timeline">
                {audit.map((z, i) => {
                  const typMeta = z.typ ? TYP_LABEL[z.typ] : null;
                  return (
                    <div key={i} className="platby-audit-item">
                      <div className="platby-audit-dot" style={{ background: z.color }}>
                        <iconify-icon icon={z.icon} style={{ fontSize: 10, color: 'white' }} />
                      </div>
                      <div className="platby-audit-content">
                        <div className="d-flex align-items-center justify-content-between gap-2">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="fw-semibold fs-12">{z.kdo}</span>
                            {typMeta && (
                              <span
                                className="badge"
                                style={{ background: typMeta.bg, color: typMeta.color, fontSize: 9, fontWeight: 600 }}
                              >
                                {typMeta.label}
                              </span>
                            )}
                          </div>
                          <span className="text-muted fs-11">{z.cas}</span>
                        </div>
                        <div className="text-muted fs-12">{z.akce}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Interní komunikace ──────────────────────── */}
          <div className="p-3">
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="text-muted fs-11 text-uppercase fw-semibold">Interní komunikace</span>
              {allKomentare.length > 0 && (
                <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 10 }}>
                  {allKomentare.length}
                </span>
              )}
            </div>

            {/* Vlákno zpráv */}
            <div className="d-flex flex-column gap-3 mb-3" style={{ maxHeight: 300, overflowY: 'auto' }}>
              {allKomentare.map((k) => (
                <div key={k.id} className="d-flex align-items-start gap-2">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                    style={{ width: 28, height: 28, fontSize: 9, background: k.color, marginTop: 1 }}
                  >
                    {k.avatar}
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <span className="fw-semibold fs-12">{k.kdo}</span>
                      <span
                        className="badge bg-secondary-subtle text-secondary"
                        style={{ fontSize: 9, fontWeight: 500 }}
                      >
                        {ROLE_LABEL[k.role] ?? k.role}
                      </span>
                      <span className="text-muted fs-11 ms-auto">{k.cas}</span>
                    </div>
                    <div
                      className="fs-12 p-2 rounded"
                      style={{ background: '#f8f9fa', lineHeight: 1.5, color: '#3d4149' }}
                    >
                      {k.zprava}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="d-flex gap-2 align-items-center">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                style={{ width: 26, height: 26, fontSize: 9, background: 'var(--prov-color, #c9911a)' }}
              >
                {PANEL_USER.avatar}
              </div>
              <input
                type="text"
                className="form-control form-control-sm flex-grow-1"
                placeholder="Napište zprávu… (@Jana)"
                value={komentar}
                onChange={(e) => setKomentar(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendKomentar(); }}
                style={{ fontSize: 12 }}
              />
              <button
                className="btn btn-primary btn-sm flex-shrink-0"
                disabled={!komentar.trim()}
                onClick={sendKomentar}
              >
                <iconify-icon icon="solar:arrow-right-bold" style={{ fontSize: 14 }} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
