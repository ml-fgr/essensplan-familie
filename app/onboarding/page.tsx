import Link from 'next/link';

export default function OnboardingPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '32px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🍽️</div>
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 12px' }}>So geht&apos;s los</h1>
      <p style={{ color: 'var(--muted)', maxWidth: 280, lineHeight: 1.6, margin: '0 0 8px' }}>
        Füge zuerst ein paar Rezepte hinzu. Die App erstellt dann automatisch einen Wochenplan basierend auf aktuellen Supermarkt-Angeboten.
      </p>
      <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 280, lineHeight: 1.5, margin: '0 0 32px' }}>
        💡 Tipp: Trage auch deine Stadt in den Einstellungen ein, damit Angebote gefunden werden.
      </p>
      <Link href="/recipe/new">
        <button className="btn-primary" style={{ maxWidth: 240 }}>Rezept hinzufügen</button>
      </Link>
    </div>
  );
}
