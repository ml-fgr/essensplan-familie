'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StepsList from '@/app/components/StepsList';
import { serializeSteps } from '@/lib/steps';

export default function NewRecipePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [steps, setSteps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function addIngredient() { setIngredients((p) => [...p, '']); }
  function updateIngredient(i: number, v: string) { setIngredients((p) => p.map((x, idx) => idx === i ? v : x)); }
  function removeIngredient(i: number) { setIngredients((p) => p.filter((_, idx) => idx !== i)); }

  async function handleSave() {
    const filteredIng = ingredients.map((i) => i.trim()).filter(Boolean);
    if (!name.trim() || filteredIng.length === 0) return;
    setSaving(true);
    await fetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), ingredients: filteredIng, recipe_text: serializeSteps(steps) }),
    });
    router.push('/');
    router.refresh();
  }

  const canSave = name.trim().length > 0 && ingredients.some((i) => i.trim().length > 0);

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 8px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--accent)', padding: '4px 0' }}>‹</button>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Neues Rezept</h1>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Name */}
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>REZEPTNAME</label>
          <input className="input" type="text" placeholder="z.B. Spaghetti Bolognese" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        {/* Zutaten */}
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>ZUTATEN</label>
          <div className="card" style={{ padding: '4px 0' }}>
            {ingredients.map((ing, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '2px 12px', gap: 8, borderBottom: i < ingredients.length - 1 ? '0.5px solid rgba(31,42,34,0.08)' : 'none' }}>
                <input
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', padding: '11px 0', fontSize: 15, color: 'var(--fg)' }}
                  type="text"
                  placeholder={`Zutat ${i + 1}`}
                  value={ing}
                  onChange={(e) => updateIngredient(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngredient(); } }}
                />
                {ingredients.length > 1 && (
                  <button onClick={() => removeIngredient(i)} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 18, cursor: 'pointer', padding: '4px' }}>×</button>
                )}
              </div>
            ))}
          </div>
          <button className="btn-ghost" style={{ marginTop: 6, padding: '8px 0', color: 'var(--accent)', fontSize: 14 }} onClick={addIngredient}>
            + Zutat hinzufügen
          </button>
        </div>

        {/* Zubereitungsschritte */}
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>ZUBEREITUNG (optional)</label>
          <StepsList steps={steps} onChange={setSteps} />
        </div>

        <button className="btn-primary" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? 'Speichern…' : 'Rezept speichern'}
        </button>
      </div>
    </div>
  );
}
