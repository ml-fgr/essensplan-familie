'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Item {
  name: string;
  recipes: string[];
  offer: { shop: string; label: string } | null;
  checked: boolean;
}

interface Props {
  withOffer: Item[];
  withoutOffer: Item[];
}

export default function ShoppingClient({ withOffer, withoutOffer }: Props) {
  const router = useRouter();
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    [...withOffer, ...withoutOffer].forEach((i) => { m[i.name] = i.checked; });
    return m;
  });

  async function toggleCheck(name: string) {
    const next = !checkedMap[name];
    setCheckedMap((prev) => ({ ...prev, [name]: next }));
    await fetch('/api/shopping', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredient: name, checked: next }),
    });
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 8px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--accent)', padding: '4px 0' }}>‹</button>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Einkaufsliste</h1>
      </div>

      {withOffer.length === 0 && withoutOffer.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          <p>Noch keine bestätigten Gerichte diese Woche.</p>
        </div>
      )}

      {withOffer.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="section-label">Im Angebot</div>
          <div style={{ margin: '0 12px' }} className="card">
            {withOffer.map((item, i) => (
              <ItemRow key={item.name} item={item} isLast={i === withOffer.length - 1} checked={checkedMap[item.name]} onToggle={() => toggleCheck(item.name)} />
            ))}
          </div>
        </div>
      )}

      {withoutOffer.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="section-label">Weitere Zutaten</div>
          <div style={{ margin: '0 12px' }} className="card">
            {withoutOffer.map((item, i) => (
              <ItemRow key={item.name} item={item} isLast={i === withoutOffer.length - 1} checked={checkedMap[item.name]} onToggle={() => toggleCheck(item.name)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({ item, isLast, checked, onToggle }: { item: Item; isLast: boolean; checked: boolean; onToggle: () => void }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: isLast ? 'none' : '0.5px solid rgba(31,42,34,0.08)', gap: 12, cursor: 'pointer' }}
      onClick={onToggle}
    >
      <div style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid', borderColor: checked ? 'var(--accent)' : 'var(--accent-soft)', background: checked ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
        {checked && <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>✓</span>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, textDecoration: checked ? 'line-through' : 'none', color: checked ? 'var(--muted)' : 'var(--fg)' }}>{item.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{item.recipes.join(', ')}</div>
      </div>
      {item.offer && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span className="badge" style={{ display: 'block', marginBottom: 2 }}>Angebot</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.offer.shop}</span>
        </div>
      )}
    </div>
  );
}
