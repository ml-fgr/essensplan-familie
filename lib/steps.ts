// Wandelt den recipe_text-String (alt: Freitext, neu: JSON-Array) in ein Array von Schritten um.
export function parseSteps(recipeText: string | null): string[] {
  if (!recipeText) return [];
  try {
    const parsed = JSON.parse(recipeText);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')) return parsed;
  } catch {}
  return [recipeText]; // Altdaten: ganzen Text als Schritt 1 einwickeln
}

export function serializeSteps(steps: string[]): string | null {
  const filtered = steps.map((s) => s.trim()).filter(Boolean);
  return filtered.length > 0 ? JSON.stringify(filtered) : null;
}
