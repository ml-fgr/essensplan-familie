'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Recipe, WeekplanRow } from './page';

interface Props {
  weekplan: WeekplanRow[];
  restRecipes: Recipe[];
}

const SWIPE_THRESHOLD = 70;
const MAX_DRAG = 200;

export default function HomeClient({ weekplan, restRecipes }: Props) {
  const router = useRouter();
  const [localWeekplan, setLocalWeekplan] = useState(weekplan);
  const [localRest, setLocalRest] = useState(restRecipes);
  const [openRowId, setOpenRowId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ weekplanId?: number; recipeId: number; name: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStep, setRefreshStep] = useState(0);

  // Wenn der Server nach router.refresh() neue Daten liefert, lokalen State synchronisieren
  useEffect(() => { setLocalWeekplan(weekplan); }, [weekplan]);
  useEffect(() => { setLocalRest(restRecipes); }, [restRecipes]);

  const confirmed = localWeekplan.filter((r) => r.status === 'confirmed');
  const suggestions = localWeekplan.filter((r) => r.status === 'suggestion');

  function toggleRow(id: number) {
    setOpenRowId((prev) => (prev === id ? null : id));
  }

  async function removeFromPlan(weekplanId: number) {
    setOpenRowId(null);
    await fetch(`/api/weekplan/${weekplanId}`, { method: 'DELETE' });
    setLocalWeekplan((prev) => prev.filter((r) => r.id !== weekplanId));
    router.refresh();
  }

  async function addToPlan(recipe: Recipe) {
    const res = await fetch('/api/weekplan/manual-add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe_id: recipe.id }),
    });
    if (res.ok) {
      setLocalRest((prev) => prev.filter((r) => r.id !== recipe.id));
      router.refresh();
    }
  }

  async function deleteRecipe(recipeId: number, weekplanId?: number) {
    if (weekplanId) await fetch(`/api/weekplan/${weekplanId}`, { method: 'DELETE' });
    await fetch(`/api/recipes/${recipeId}`, { method: 'DELETE' });
    setLocalWeekplan((prev) => prev.filter((r) => r.recipe_id !== recipeId));
    setLocalRest((prev) => prev.filter((r) => r.id !== recipeId));
    setDeleteConfirm(null);
    setOpenRowId(null);
    router.refresh();
  }

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshStep(1);
    const stepDelays = [900, 1400, 1000, 800];
    for (let i = 1; i < stepDelays.length; i++) {
      await delay(stepDelays[i - 1]);
      setRefreshStep(i + 1);
    }
    await fetch('/api/refresh', { method: 'POST' });
    await delay(500);
    setRefreshing(false);
    setRefreshStep(0);
    router.refresh();
  }

  function closeAll() {
    setOpenRowId(null);
  }

  return (
    <div style={{ paddingBottom: 120 }} onClick={closeAll}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px 8px' }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Diese Woche</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/angebote" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', background: 'var(--chip)', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 500, color: 'var(--fg)', textDecoration: 'none' }}>
            🏷️
          </a>
          <a href="/shopping" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', background: 'var(--chip)', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 500, color: 'var(--fg)', textDecoration: 'none' }}>
            🛒
          </a>
          <a href="/settings" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', background: 'var(--chip)', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 500, color: 'var(--fg)', textDecoration: 'none' }}>
            ⚙️
          </a>
        </div>
      </div>

      {/* Bestätigte Gerichte */}
      {confirmed.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="section-label">{confirmed.length} Gerichte diese Woche</div>
          <div style={{ margin: '0 12px' }} className="card">
            {confirmed.map((row, i) => (
              <SwipeRow
                key={row.id}
                row={row}
                opacity={1}
                isLast={i === confirmed.length - 1}
                isOpen={openRowId === row.id}
                onToggle={(e) => { e.stopPropagation(); toggleRow(row.id); }}
                onRemove={(e) => { e.stopPropagation(); removeFromPlan(row.id); }}
                onDelete={(e) => { e.stopPropagation(); setDeleteConfirm({ weekplanId: row.id, recipeId: row.recipe_id, name: row.name }); }}
                onInfo={(e) => { e.stopPropagation(); router.push(`/recipe/${row.recipe_id}`); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* KI-Vorschläge */}
      {suggestions.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="section-label">KI-Vorschläge</div>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 6px 16px' }}>Basierend auf aktuellen Angeboten</p>
          <div style={{ margin: '0 12px' }} className="card">
            {suggestions.map((row, i) => (
              <SwipeRow
                key={row.id}
                row={row}
                opacity={0.5}
                isLast={i === suggestions.length - 1}
                isOpen={openRowId === row.id}
                onToggle={(e) => { e.stopPropagation(); toggleRow(row.id); }}
                onRemove={(e) => { e.stopPropagation(); removeFromPlan(row.id); }}
                onDelete={(e) => { e.stopPropagation(); setDeleteConfirm({ weekplanId: row.id, recipeId: row.recipe_id, name: row.name }); }}
                onInfo={(e) => { e.stopPropagation(); router.push(`/recipe/${row.recipe_id}`); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Restliche Rezepte */}
      {localRest.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="section-label">Alle Rezepte</div>
          <div style={{ margin: '0 12px' }} className="card">
            {localRest.map((recipe, i) => {
              const ingredients: string[] = JSON.parse(recipe.ingredients);
              return (
                <RestRow
                  key={recipe.id}
                  recipe={recipe}
                  ingredients={ingredients}
                  isLast={i === localRest.length - 1}
                  isOpen={openRowId === -recipe.id}
                  onToggle={(e) => { e.stopPropagation(); setOpenRowId((p) => p === -recipe.id ? null : -recipe.id); }}
                  onAdd={(e) => { e.stopPropagation(); addToPlan(recipe); }}
                  onEdit={(e) => { e.stopPropagation(); router.push(`/recipe/${recipe.id}`); }}
                  onDelete={(e) => { e.stopPropagation(); setDeleteConfirm({ recipeId: recipe.id, name: recipe.name }); }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* FABs */}
      <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 16, zIndex: 50 }} onClick={(e) => e.stopPropagation()}>
        <button className="fab fab-neutral" onClick={() => router.push('/recipe/new')} title="Neues Rezept">＋</button>
        <button className="fab fab-primary" onClick={handleRefresh} title="Wochenplan neu laden">⟳</button>
      </div>

      {/* Löschen-Dialog */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }} onClick={(e) => e.stopPropagation()}>
          <div className="card" style={{ padding: 24, width: '100%', maxWidth: 320 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 600 }}>Rezept löschen?</h3>
            <p style={{ color: 'var(--muted)', margin: '0 0 20px', fontSize: 14 }}>
              „{deleteConfirm.name}" wird unwiderruflich gelöscht.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)}>Abbrechen</button>
              <button style={{ flex: 1, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 12, padding: '12px', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => deleteRecipe(deleteConfirm.recipeId, deleteConfirm.weekplanId)}>
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refresh-Overlay */}
      {refreshing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(246,248,243,0.92)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 200, gap: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid var(--accent-soft)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 240 }}>
            {REFRESH_STEPS.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: refreshStep > i ? 1 : 0.3 }}>
                <span style={{ fontSize: 16 }}>{refreshStep > i + 1 ? '✅' : '⏳'}</span>
                <span style={{ fontSize: 14 }}>{label}</span>
              </div>
            ))}
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}

const REFRESH_STEPS = ['Lade Postleitzahlen…', 'Frage Marktguru-API ab…', 'Berechne Angebots-Score…', 'Erstelle Wochenplan…'];

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/* ─── Shared Swipe-Logik (Hook für SwipeRow + RestRow) ─── */
function useSwipeGesture() {
  const rowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; axis: 'h' | 'v' | null; active: boolean }>({
    startX: 0, startY: 0, axis: null, active: false,
  });
  const [dragX, setDragX] = useState(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    function onStart(e: TouchEvent) {
      dragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, axis: null, active: true };
      isDragging.current = false;
      setDragX(0);
    }
    function onMove(e: TouchEvent) {
      if (!dragRef.current.active) return;
      const dx = e.touches[0].clientX - dragRef.current.startX;
      const dy = e.touches[0].clientY - dragRef.current.startY;
      if (dragRef.current.axis === null) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        dragRef.current.axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      }
      if (dragRef.current.axis === 'v') { dragRef.current.active = false; setDragX(0); return; }
      e.preventDefault();
      if (dx < 0) { isDragging.current = true; setDragX(Math.max(dx, -MAX_DRAG)); }
    }
    function onEnd() {
      dragRef.current.active = false;
      setDragX((prev) => (prev < -SWIPE_THRESHOLD ? -MAX_DRAG : 0));
      setTimeout(() => { isDragging.current = false; }, 50);
    }
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragX(0);
    isDragging.current = false;
    const startX = e.clientX;
    dragRef.current.active = true;
    function onMoveMouse(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 5) isDragging.current = true;
      if (dx < 0) setDragX(Math.max(dx, -MAX_DRAG));
    }
    function onUpMouse() {
      dragRef.current.active = false;
      setDragX((prev) => (prev < -SWIPE_THRESHOLD ? -MAX_DRAG : 0));
      setTimeout(() => { isDragging.current = false; }, 50);
      window.removeEventListener('mousemove', onMoveMouse);
      window.removeEventListener('mouseup', onUpMouse);
    }
    window.addEventListener('mousemove', onMoveMouse);
    window.addEventListener('mouseup', onUpMouse);
  }, []);

  return { rowRef, dragRef, dragX, isDragging, onMouseDown };
}

/* ─── SwipeRow: Wochenplan-Eintrag ─── */
interface SwipeRowProps {
  row: WeekplanRow;
  opacity: number;
  isLast: boolean;
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onInfo: (e: React.MouseEvent) => void;
}

function SwipeRow({ row, opacity, isLast, isOpen, onToggle, onRemove, onDelete, onInfo }: SwipeRowProps) {
  const ingredients: string[] = JSON.parse(row.ingredients);
  const offers: { ingredient: string }[] = row.offers ? JSON.parse(row.offers) : [];
  const { rowRef, dragRef, dragX, isDragging, onMouseDown } = useSwipeGesture();

  return (
    <div style={{ borderBottom: isLast ? 'none' : '0.5px solid rgba(31,42,34,0.08)', opacity }}>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'stretch' }}>
          <button onClick={onRemove} style={{ background: '#f0a040', color: 'white', border: 'none', width: 130, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Aus Plan entfernen
          </button>
          <button onClick={onDelete} style={{ background: 'var(--danger)', color: 'white', border: 'none', width: 70, fontWeight: 600, fontSize: 12, cursor: 'pointer', borderRadius: '0 14px 14px 0' }}>
            Löschen
          </button>
        </div>
        <div
          ref={rowRef}
          style={{
            display: 'flex', alignItems: 'center', padding: '13px 12px 13px 16px', gap: 10,
            background: 'var(--bg-elevated)',
            transform: `translateX(${dragX}px)`,
            transition: dragRef.current.active ? 'none' : 'transform 0.2s',
            userSelect: 'none', cursor: 'pointer',
          }}
          onMouseDown={onMouseDown}
          onClick={(e) => { if (!isDragging.current && dragX === 0) onInfo(e); }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{ingredients.length} Zutaten</div>
          </div>
          {row.score !== null && (
            <span className="badge">{offers.length}/{ingredients.length}</span>
          )}
          <button
            onClick={onToggle}
            title="Aktionen"
            style={{ background: isOpen ? 'var(--chip)' : 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', borderRadius: 8, flexShrink: 0, transition: 'background 0.15s' }}
          >
            ⋯
          </button>
        </div>
      </div>
      {isOpen && (
        <div style={{ display: 'flex', gap: 8, padding: '0 12px 10px', flexWrap: 'wrap' }}>
          <ActionChip label="Aus Plan entfernen" color="#a06010" bg="#fff3e0" border="#f5d9a8" onClick={onRemove} />
          <ActionChip label="Löschen" color="var(--danger)" bg="#fdf0ee" border="#f5ccc5" onClick={onDelete} />
        </div>
      )}
    </div>
  );
}

/* ─── RestRow: Nicht-Wochenplan-Eintrag ─── */
interface RestRowProps {
  recipe: Recipe;
  ingredients: string[];
  isLast: boolean;
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onAdd: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

function RestRow({ recipe, ingredients, isLast, isOpen, onToggle, onAdd, onEdit, onDelete }: RestRowProps) {
  const { rowRef, dragRef, dragX, isDragging, onMouseDown } = useSwipeGesture();

  return (
    <div style={{ borderBottom: isLast ? 'none' : '0.5px solid rgba(31,42,34,0.08)' }}>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'stretch' }}>
          <button onClick={onAdd} style={{ background: 'var(--accent)', color: 'white', border: 'none', width: 130, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Zu Plan hinzu
          </button>
          <button onClick={onDelete} style={{ background: 'var(--danger)', color: 'white', border: 'none', width: 70, fontWeight: 600, fontSize: 12, cursor: 'pointer', borderRadius: '0 14px 14px 0' }}>
            Löschen
          </button>
        </div>
        <div
          ref={rowRef}
          style={{
            display: 'flex', alignItems: 'center', padding: '13px 12px 13px 16px', gap: 10,
            background: 'var(--bg-elevated)',
            transform: `translateX(${dragX}px)`,
            transition: dragRef.current.active ? 'none' : 'transform 0.2s',
            userSelect: 'none', cursor: 'pointer',
          }}
          onMouseDown={onMouseDown}
          onClick={(e) => { if (!isDragging.current && dragX === 0) onAdd(e); }}
        >
          <div style={{ flex: 1, minWidth: 0, opacity: 0.35 }}>
            <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{ingredients.length} Zutaten — tippen zum Hinzufügen</div>
          </div>
          <button
            onClick={onToggle}
            title="Aktionen"
            style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', borderRadius: 8, flexShrink: 0, opacity: 0.35 }}
          >
            ⋯
          </button>
        </div>
      </div>
      {isOpen && (
        <div style={{ display: 'flex', gap: 8, padding: '0 12px 12px', flexWrap: 'wrap' }}>
          <ActionChip label="+ Zum Plan" color="var(--accent)" bg="var(--accent-soft-faint)" border="var(--accent-soft)" onClick={onAdd} />
          <ActionChip label="Bearbeiten" color="var(--fg)" bg="var(--chip)" border="transparent" onClick={onEdit} />
          <ActionChip label="Löschen" color="var(--danger)" bg="#fdf0ee" border="#f5ccc5" onClick={onDelete} />
        </div>
      )}
    </div>
  );
}

function ActionChip({ label, color, bg, border, onClick }: { label: string; color: string; bg: string; border: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: bg, color, border: `1.5px solid ${border}`, borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
    >
      {label}
    </button>
  );
}
