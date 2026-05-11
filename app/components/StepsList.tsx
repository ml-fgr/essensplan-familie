'use client';

interface Props {
  steps: string[];
  onChange: (steps: string[]) => void;
}

export default function StepsList({ steps, onChange }: Props) {
  function add() { onChange([...steps, '']); }
  function update(i: number, val: string) { onChange(steps.map((s, idx) => idx === i ? val : s)); }
  function remove(i: number) { onChange(steps.filter((_, idx) => idx !== i)); }

  return (
    <div>
      {steps.length > 0 && (
        <div className="card" style={{ padding: '0' }}>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                borderBottom: i < steps.length - 1 ? '0.5px solid rgba(31,42,34,0.08)' : 'none',
                padding: '10px 12px',
              }}
            >
              {/* Schritt-Label */}
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Schritt {i + 1}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <textarea
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    fontSize: 15,
                    color: 'var(--fg)',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    minHeight: 56,
                    padding: 0,
                  }}
                  placeholder={`Beschreibe Schritt ${i + 1}…`}
                  value={step}
                  onChange={(e) => update(i, e.target.value)}
                />
                <button
                  onClick={() => remove(i)}
                  disabled={steps.length === 1}
                  title="Schritt entfernen"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: steps.length === 1 ? 'var(--muted)' : 'var(--danger)',
                    fontSize: 18,
                    cursor: steps.length === 1 ? 'default' : 'pointer',
                    padding: '2px 4px',
                    opacity: steps.length === 1 ? 0.3 : 1,
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        className="btn-ghost"
        onClick={add}
        style={{ marginTop: 6, padding: '8px 0', fontSize: 14, color: 'var(--accent)' }}
      >
        + Schritt hinzufügen
      </button>
    </div>
  );
}
