'use client';
import { useRouter } from 'next/navigation';

interface Props {
  recipe: { id: number; name: string; ingredients: string[]; steps: string[] };
  weekplanId: number | null;
  status: string | null;
  score: number | null;
  offers: { ingredient: string; shop: string; label: string }[];
}

export default function RecipeDetailClient({ recipe, weekplanId, status, score, offers }: Props) {
  const { steps } = recipe;
  const router = useRouter();

  const offerMap: Record<string, { shop: string; label: string }> = {};
  for (const o of offers) offerMap[o.ingredient.toLowerCase()] = o;

  async function removeFromPlan() {
    if (!weekplanId) return;
    await fetch(`/api/weekplan/${weekplanId}`, { method: 'DELETE' });
    router.back();
    router.refresh();
  }

  const inPlan = status === 'confirmed' || status === 'suggestion';
  const offerCount = recipe.ingredients.filter((ing) => offerMap[ing.toLowerCase()]).length;
  const pct = recipe.ingredients.length > 0 ? Math.round((offerCount / recipe.ingredients.length) * 100) : 0;

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 8px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--accent)', padding: '4px 0' }}>‹</button>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, flex: 1 }}>{recipe.name}</h1>
        <button onClick={() => router.push(`/recipe/${recipe.id}/edit`)} style={{ background: 'var(--chip)', border: 'none', borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 500, color: 'var(--fg)', cursor: 'pointer' }}>
          Bearbeiten
        </button>
      </div>

      {/* Score-Banner */}
      {score !== null && (
        <div style={{ margin: '8px 16px', background: 'var(--accent-soft-faint)', border: '1px solid var(--accent-soft)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>{pct}%</div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--fg)', fontSize: 14 }}>im Angebot</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{offerCount} von {recipe.ingredients.length} Zutaten</div>
          </div>
        </div>
      )}

      {/* Zutaten */}
      <div style={{ margin: '16px 16px 0' }}>
        <div className="section-label" style={{ padding: 0, marginBottom: 8 }}>Zutaten</div>
        <div className="card">
          {recipe.ingredients.map((ing, i) => {
            const offer = offerMap[ing.toLowerCase()];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i < recipe.ingredients.length - 1 ? '0.5px solid rgba(31,42,34,0.08)' : 'none', gap: 10 }}>
                <span style={{ flex: 1 }}>{ing}</span>
                {offer && (
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge" style={{ display: 'block', marginBottom: 2 }}>Angebot</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{offer.shop}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Zubereitungsschritte */}
      {steps.length > 0 && (
        <div style={{ margin: '20px 16px 0' }}>
          <div className="section-label" style={{ padding: 0, marginBottom: 8 }}>Zubereitung</div>
          <div className="card">
            {steps.map((step, i) => (
              <div key={i} style={{ padding: '14px 16px', borderBottom: i < steps.length - 1 ? '0.5px solid rgba(31,42,34,0.08)' : 'none', display: 'flex', gap: 12 }}>
                {/* Schritt-Nummer */}
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </div>
                <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--fg)', flex: 1 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aus Plan entfernen */}
      {inPlan && (
        <div style={{ margin: '24px 16px 0' }}>
          <button
            onClick={removeFromPlan}
            style={{ background: 'none', border: '1.5px solid var(--danger)', color: 'var(--danger)', borderRadius: 12, padding: '12px', width: '100%', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}
          >
            Aus Wochenplan entfernen
          </button>
        </div>
      )}
    </div>
  );
}
