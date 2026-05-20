import type { FakturaPlatby, FakturaKategorie } from '../platbyData';
import { getPravniEntita, ENTITA_LABEL, getBankovniUcet } from '../platbyData';
import { fCzk } from '../data';

interface Props {
  faktura: FakturaPlatby;
}

// ── Supplier lookup ────────────────────────────────────────────
const DODAVATEL_INFO: Record<string, { ico: string; dic: string; adresa: string; mesto: string; banka: string; ucet: string; iban: string }> = {
  'Makro Cash & Carry':           { ico: '26441381', dic: 'CZ26441381', adresa: 'Pekařská 695/3',         mesto: 'Praha 5, 155 00',       banka: 'Česká spořitelna', ucet: '1000397353/0800', iban: 'CZ1508000000001000397353' },
  'Linde Gas (CO₂)':             { ico: '00011754', dic: 'CZ00011754', adresa: 'U Tescomy 3',             mesto: 'Zlín, 760 01',          banka: 'Komerční banka',   ucet: '1121970237/0100', iban: 'CZ4501000000001121970237' },
  'Správa budov s.r.o.':         { ico: '28876543', dic: 'CZ28876543', adresa: 'Lidická 32',              mesto: 'Brno, 602 00',          banka: 'Raiffeisenbank',   ucet: '1035002871/5500', iban: 'CZ7255000000001035002871' },
  'E.ON Energie':                { ico: '26078201', dic: 'CZ26078201', adresa: 'F. A. Gerstnera 2151/6',  mesto: 'České Budějovice, 370 01', banka: 'ČSOB',          ucet: '273938400/0300', iban: 'CZ5503000000000273938400' },
  'Sodexo (stravování)':         { ico: '61860018', dic: 'CZ61860018', adresa: 'Radlická 2',              mesto: 'Praha 5, 158 00',       banka: 'BNP Paribas',      ucet: '9014012080/6800', iban: 'CZ4568000000009014012080' },
  'ČEZ (elektřina)':             { ico: '45274649', dic: 'CZ45274649', adresa: 'Duhová 2/1444',           mesto: 'Praha 4, 140 53',       banka: 'Unicredit',        ucet: '1020001188/2700', iban: 'CZ8227000000001020001188' },
  'UniCredit (internet + telefon)':{ ico: '64948242', dic: 'CZ64948242', adresa: 'Želetavská 1525/1',    mesto: 'Praha 4, 140 92',       banka: 'Unicredit',        ucet: '2107711819/2700', iban: 'CZ6627000000002107711819' },
  'Firemní catering – AutoPalace a.s.': { ico: '45789012', dic: 'CZ45789012', adresa: 'Türkova 1001/2', mesto: 'Praha 4, 149 00',       banka: 'Fio banka',        ucet: '2800647314/2010', iban: 'CZ4920100000002800647314' },
  'Konferenční raut – Brno Hotel': { ico: '27654321', dic: 'CZ27654321', adresa: 'Křížkovského 22',      mesto: 'Brno, 603 00',          banka: 'Komerční banka',   ucet: '1028374123/0100', iban: 'CZ3801000000001028374123' },
  'Coca-Cola HBC':               { ico: '45795660', dic: 'CZ45795660', adresa: 'Argentinská 286/38',      mesto: 'Praha 7, 170 00',       banka: 'HSBC',             ucet: '4055200001/4300', iban: 'CZ2543000000004055200001' },
  'Plzeňský Prazdroj':           { ico: '45357366', dic: 'CZ45357366', adresa: 'U Prazdroje 64/7',       mesto: 'Plzeň, 301 00',         banka: 'Česká spořitelna', ucet: '0101259217/0800', iban: 'CZ5008000000000101259217' },
  'Metro AG':                    { ico: '49615855', dic: 'CZ49615855', adresa: 'Jeremiášova 1249/7',      mesto: 'Praha 5, 155 00',       banka: 'Deutsche Bank',    ucet: '5270008803/7910', iban: 'CZ8379100000005270008803' },
  'Pivovary Krušovice':          { ico: '00023302', dic: 'CZ00023302', adresa: 'Krušovice 1',             mesto: 'Rakovník, 270 53',      banka: 'Komerční banka',   ucet: '1924374031/0100', iban: 'CZ5701000000001924374031' },
  'Zásoba s.r.o. (reklamace)':   { ico: '03847261', dic: 'CZ03847261', adresa: 'Průmyslová 14',          mesto: 'Brno, 619 00',          banka: 'Fio banka',        ucet: '2400568112/2010', iban: 'CZ7820100000002400568112' },
  'Zásobování Praha s.r.o.':     { ico: '27813456', dic: 'CZ27813456', adresa: 'Novodvorská 1010/14',    mesto: 'Praha 4, 142 00',       banka: 'Raiffeisenbank',   ucet: '5500117832/5500', iban: 'CZ3955000000005500117832' },
  'Pivovar Kozel a.s.':          { ico: '45787111', dic: 'CZ45787111', adresa: 'Velké Popovice 1',       mesto: 'Velké Popovice, 251 69',banka: 'ČSOB',             ucet: '161526553/0300', iban: 'CZ4903000000000161526553' },
  'Fresh Meat CZ s.r.o.':        { ico: '06234871', dic: 'CZ06234871', adresa: 'Brněnská 380',           mesto: 'Rajhrad, 664 61',       banka: 'Fio banka',        ucet: '2901418219/2010', iban: 'CZ1120100000002901418219' },
};

const ODBERATEL_INFO: Record<string, { ico: string; dic: string; adresa: string; mesto: string }> = {
  'con-gusto': { ico: '60123456', dic: 'CZ60123456', adresa: 'Moravské náměstí 1',   mesto: 'Brno, 602 00' },
  'u-capa':    { ico: '28734512', dic: 'CZ28734512', adresa: 'Štefánikova 48',        mesto: 'Praha 5, 150 00' },
  'korek':     { ico: '07123890', dic: 'CZ07123890', adresa: 'Náměstí Svobody 18',   mesto: 'Brno, 602 00' },
};

// ── DPH sazby ─────────────────────────────────────────────────
const DPH_SAZBA: Record<FakturaKategorie, number> = {
  zbozi:   0.12,
  energie: 0.21,
  sluzby:  0.21,
  najem:   0.21,
  vyplaty: 0,
  ostatni: 0.21,
};

// ── Line items per category ────────────────────────────────────
type Polozka = { popis: string; podil: number };

const POLOZKY: Record<FakturaKategorie, Polozka[]> = {
  zbozi: [
    { popis: 'Maso a drůbež',                podil: 0.38 },
    { popis: 'Zelenina, ovoce a bylinky',    podil: 0.22 },
    { popis: 'Suchý sortiment a koření',     podil: 0.22 },
    { popis: 'Nápoje a doplňkový sortiment', podil: 0.18 },
  ],
  energie: [
    { popis: 'Spotřeba elektrické energie',  podil: 0.78 },
    { popis: 'Distribuční poplatek',         podil: 0.22 },
  ],
  najem: [
    { popis: 'Nájem nebytových prostor',     podil: 0.85 },
    { popis: 'Záloha na služby',             podil: 0.15 },
  ],
  sluzby: [
    { popis: 'Poskytnuté služby dle smlouvy', podil: 0.88 },
    { popis: 'Administrativní poplatek',      podil: 0.12 },
  ],
  vyplaty: [
    { popis: 'Mzdové náklady',               podil: 1.0 },
  ],
  ostatni: [
    { popis: 'Plnění dle smlouvy',           podil: 1.0 },
  ],
};

function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

function vsFromCislo(cislo: string): string {
  return cislo.replace(/\D/g, '').slice(-8);
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

export default function InvoicePreview({ faktura }: Props) {
  const entita   = getPravniEntita(faktura.provozovna);
  const odberatel = ODBERATEL_INFO[entita] ?? ODBERATEL_INFO['con-gusto'];
  const dodInfo  = DODAVATEL_INFO[faktura.dodavatel];
  const ucet     = getBankovniUcet(faktura.provozovna);
  const sazba    = DPH_SAZBA[faktura.kategorie] ?? 0.21;
  const polozky  = POLOZKY[faktura.kategorie] ?? POLOZKY['ostatni'];
  const vs       = vsFromCislo(faktura.cislo);

  // Výpočet DPH z celkové částky (castka je vždy s DPH)
  const zakladDph  = sazba > 0 ? Math.round(faktura.castka / (1 + sazba)) : faktura.castka;
  const dphCastka  = faktura.castka - zakladDph;

  // Rozdělení základu DPH na položky
  const items = polozky.map((p, i) => {
    const isLast = i === polozky.length - 1;
    const itemBase = isLast
      ? zakladDph - polozky.slice(0, i).reduce((s, pp) => s + Math.round(zakladDph * pp.podil), 0)
      : Math.round(zakladDph * p.podil);
    const itemTotal = Math.round(itemBase * (1 + sazba));
    return { popis: p.popis, base: itemBase, total: itemTotal };
  });

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #dee2e6',
      borderRadius: 6,
      fontFamily: "'Acumin Pro', system-ui, sans-serif",
      fontSize: 11,
      lineHeight: 1.45,
      color: '#1a1a1a',
      overflow: 'hidden',
    }}>

      {/* Hlavička faktury */}
      <div style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6', padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Faktura – daňový doklad
            </div>
            <div style={{ color: '#6c757d', marginTop: 2 }}>č. {faktura.cislo}</div>
          </div>
          <div style={{ textAlign: 'right', color: '#6c757d' }}>
            <div>Datum vystavení: <strong style={{ color: '#1a1a1a' }}>{formatDate(faktura.datum)}</strong></div>
            <div>Datum splatnosti: <strong style={{ color: '#1a1a1a' }}>{formatDate(faktura.splatnost)}</strong></div>
            <div>Variabilní symbol: <strong style={{ color: '#1a1a1a' }}>{vs}</strong></div>
          </div>
        </div>
      </div>

      {/* Dodavatel / Odběratel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #dee2e6' }}>
        <div style={{ padding: '10px 14px', borderRight: '1px solid #dee2e6' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6c757d', textTransform: 'uppercase', marginBottom: 5, letterSpacing: '0.05em' }}>Dodavatel</div>
          <div style={{ fontWeight: 700, fontSize: 12 }}>{faktura.dodavatel}</div>
          {dodInfo ? (
            <>
              <div style={{ color: '#6c757d', marginTop: 3 }}>IČO: {dodInfo.ico}</div>
              <div style={{ color: '#6c757d' }}>DIČ: {dodInfo.dic}</div>
              <div style={{ color: '#6c757d', marginTop: 3 }}>{dodInfo.adresa}</div>
              <div style={{ color: '#6c757d' }}>{dodInfo.mesto}</div>
            </>
          ) : (
            <div style={{ color: '#adb5bd', marginTop: 4, fontStyle: 'italic' }}>Údaje dodavatele nejsou k dispozici</div>
          )}
        </div>
        <div style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#6c757d', textTransform: 'uppercase', marginBottom: 5, letterSpacing: '0.05em' }}>Odběratel</div>
          <div style={{ fontWeight: 700, fontSize: 12 }}>{ENTITA_LABEL[entita]}</div>
          <div style={{ color: '#6c757d', marginTop: 3 }}>IČO: {odberatel.ico}</div>
          <div style={{ color: '#6c757d' }}>DIČ: {odberatel.dic}</div>
          <div style={{ color: '#6c757d', marginTop: 3 }}>{odberatel.adresa}</div>
          <div style={{ color: '#6c757d' }}>{odberatel.mesto}</div>
        </div>
      </div>

      {/* Položky */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #dee2e6' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
            <th style={{ padding: '6px 14px', textAlign: 'left',  fontWeight: 700, color: '#6c757d', fontSize: 10, textTransform: 'uppercase' }}>Popis</th>
            <th style={{ padding: '6px 8px',  textAlign: 'center',fontWeight: 700, color: '#6c757d', fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>DPH</th>
            <th style={{ padding: '6px 14px', textAlign: 'right', fontWeight: 700, color: '#6c757d', fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Bez DPH</th>
            <th style={{ padding: '6px 14px', textAlign: 'right', fontWeight: 700, color: '#6c757d', fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>S DPH</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '6px 14px' }}>{item.popis}</td>
              <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6c757d' }}>
                {sazba > 0 ? `${sazba * 100}%` : '—'}
              </td>
              <td style={{ padding: '6px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fCzk(item.base)}</td>
              <td style={{ padding: '6px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fCzk(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Rekapitulace DPH */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 24px', padding: '10px 14px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
        {sazba > 0 && (
          <>
            <div style={{ textAlign: 'right', color: '#6c757d' }}>Základ DPH ({sazba * 100}%)</div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fCzk(zakladDph)}</div>
            <div style={{ textAlign: 'right', color: '#6c757d' }}>DPH {sazba * 100}%</div>
            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fCzk(dphCastka)}</div>
          </>
        )}
        <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, paddingTop: sazba > 0 ? 4 : 0, borderTop: sazba > 0 ? '1px solid #dee2e6' : 'none' }}>Celkem k úhradě</div>
        <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, fontVariantNumeric: 'tabular-nums', paddingTop: sazba > 0 ? 4 : 0, borderTop: sazba > 0 ? '1px solid #dee2e6' : 'none' }}>{fCzk(faktura.castka)}</div>
      </div>

      {/* Platební údaje */}
      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Platební údaje</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 12px', color: '#6c757d' }}>
          {dodInfo ? (
            <>
              <span>Číslo účtu:</span>
              <span style={{ color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{dodInfo.ucet}</span>
              <span>IBAN:</span>
              <span style={{ color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{formatIban(dodInfo.iban)}</span>
              <span>Banka:</span>
              <span style={{ color: '#1a1a1a' }}>{dodInfo.banka}</span>
            </>
          ) : ucet ? (
            <>
              <span>Číslo účtu:</span>
              <span style={{ color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{ucet.cisloUctu}</span>
              <span>IBAN:</span>
              <span style={{ color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{formatIban(ucet.iban)}</span>
              <span>Banka:</span>
              <span style={{ color: '#1a1a1a' }}>{ucet.banka}</span>
            </>
          ) : null}
          <span>Var. symbol:</span>
          <span style={{ color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>{vs}</span>
        </div>
      </div>
    </div>
  );
}
