'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type Offer = {
  id: number;
  name: string;
  description: string;
  price: number;
  oldPrice: number | null;
  shop: string;
  category: string;
  validFrom: string;
  validTo: string;
};

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function formatPrice(p: number) {
  return p.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

export default function AngeboteClient({ offers, error, allowedShops }: { offers: Offer[]; error?: string; allowedShops: string[] }) {
  const router = useRouter();
  const [activeShop, setActiveShop] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const shops = useMemo(() => {
    const s = [...new Set(offers.map((o) => o.shop))].sort();
    return s;
  }, [offers]);

  const shopsWithoutOffers = useMemo(() => {
    const foundShops = new Set(offers.map((o) => o.shop.toLowerCase()));
    return allowedShops.filter((s) => !foundShops.has(s.toLowerCase()));
  }, [offers, allowedShops]);

  const categories = useMemo(() => {
    const src = activeShop ? offers.filter((o) => o.shop === activeShop) : offers;
    const c = [...new Set(src.map((o) => o.category))].sort((a, b) =>
      a.localeCompare(b, 'de')
    );
    return c;
  }, [offers, activeShop]);

  const filtered = useMemo(() => {
    return offers.filter((o) => {
      if (activeShop && o.shop !== activeShop) return false;
      if (activeCategory && o.category !== activeCategory) return false;
      return true;
    });
  }, [offers, activeShop, activeCategory]);

  // Gruppiert nach Shop
  const grouped = useMemo(() => {
    const map: Record<string, Offer[]> = {};
    for (const o of filtered) {
      if (!map[o.shop]) map[o.shop] = [];
      map[o.shop].push(o);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, 'de'));
  }, [filtered]);

  const pillStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 12px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--accent)' : 'var(--chip)',
    color: active ? '#fff' : 'var(--fg)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  });

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 8px' }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'var(--chip)', border: 'none', borderRadius: 999, padding: '6px 12px', fontSize: 20, cursor: 'pointer', color: 'var(--fg)', lineHeight: 1 }}
        >
          ←
        </button>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Angebote</h1>
        <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 'auto', marginTop: 4 }}>
          {filtered.length} Angebote
        </span>
      </div>

      {error && (
        <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: '#fff3cd', borderRadius: 10, fontSize: 13, color: '#856404' }}>
          {error}
        </div>
      )}

      {shopsWithoutOffers.length > 0 && (
        <div style={{ margin: '0 16px 10px', padding: '9px 13px', background: 'var(--accent-soft-faint)', borderRadius: 10, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          ℹ️ {shopsWithoutOffers.join(', ')} {shopsWithoutOffers.length === 1 ? 'ist' : 'sind'} in deiner Region nicht bei Marktguru vertreten – keine Angebote verfügbar.
        </div>
      )}

      {/* Shop-Filter */}
      <div style={{ padding: '8px 16px 4px', overflowX: 'auto', display: 'flex', gap: 8 }}>
        <button style={pillStyle(!activeShop)} onClick={() => { setActiveShop(null); setActiveCategory(null); }}>
          Alle Märkte
        </button>
        {shops.map((s) => (
          <button key={s} style={pillStyle(activeShop === s)} onClick={() => { setActiveShop(activeShop === s ? null : s); setActiveCategory(null); }}>
            {s}
          </button>
        ))}
      </div>

      {/* Kategorie-Filter */}
      {categories.length > 1 && (
        <div style={{ padding: '6px 16px 8px', overflowX: 'auto', display: 'flex', gap: 6 }}>
          <button style={{ ...pillStyle(!activeCategory), fontSize: 12, padding: '4px 10px' }} onClick={() => setActiveCategory(null)}>
            Alle Kategorien
          </button>
          {categories.map((c) => (
            <button key={c} style={{ ...pillStyle(activeCategory === c), fontSize: 12, padding: '4px 10px' }} onClick={() => setActiveCategory(activeCategory === c ? null : c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Angebote gruppiert nach Shop */}
      {grouped.map(([shop, shopOffers]) => (
        <div key={shop} style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', padding: '0 16px 6px' }}>
            {shop} · {shopOffers.length}
          </div>
          <div style={{ margin: '0 12px' }} className="card">
            {shopOffers.map((offer, i) => (
              <div
                key={offer.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '11px 14px',
                  borderBottom: i < shopOffers.length - 1 ? '0.5px solid var(--accent-soft)' : 'none',
                  gap: 12,
                }}
              >
                {/* Preis */}
                <div style={{ textAlign: 'right', minWidth: 52, flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
                    {formatPrice(offer.price)}
                  </div>
                  {offer.oldPrice && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'line-through' }}>
                      {formatPrice(offer.oldPrice)}
                    </div>
                  )}
                </div>

                {/* Name & Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', lineHeight: 1.3 }}>
                    {offer.name}
                  </div>
                  {offer.description && offer.description !== offer.name && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                      {offer.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, background: 'var(--chip)', borderRadius: 999, padding: '2px 7px', color: 'var(--muted)' }}>
                      {offer.category}
                    </span>
                    {offer.validTo && (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        bis {formatDate(offer.validTo)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏷️</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Keine Angebote gefunden</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Supermärkte in den Einstellungen prüfen</div>
        </div>
      )}
    </div>
  );
}
