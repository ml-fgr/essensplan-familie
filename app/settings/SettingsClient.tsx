'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CITY_ZIP_MAP: Record<string, string[]> = {
  'köln': ['50667','50668','50670','50672','50674','50676','50678','50679','50733','50735','50737','50739','50765','50767','50769','50823','50825','50827','50829','50858','50859','50931','50933','50935','50937','50939','50968','50969','50996','50997','50999','51061','51063','51065','51067','51069','51103','51105','51107','51109','51143','51145','51147','51149'],
  'berlin': ['10115','10117','10119','10178','10179','10243','10245','10247','10249','10317','10318','10319','10365','10367','10369','10405','10407','10409','10435','10437','10439'],
  'hamburg': ['20095','20097','20099','20144','20146','20148','20149','20249','20251','20253','20255','20257','20259','20354','20355','20357','20359'],
  'münchen': ['80331','80333','80335','80336','80337','80339','80469','80796','80797','80798','80799','80801','80802','80803','80804','80805','80807','80809'],
  'frankfurt': ['60306','60308','60310','60311','60313','60314','60315','60316','60318','60322','60323','60325','60326','60327','60329'],
  'düsseldorf': ['40210','40211','40212','40213','40215','40217','40219','40221','40223','40225','40227','40229','40231','40233'],
  'stuttgart': ['70173','70174','70176','70178','70180','70182','70184','70186','70188','70190','70192','70193','70195','70197','70199'],
  'dortmund': ['44135','44137','44139','44141','44143','44145','44147','44149','44225','44227','44229'],
};

function getZipsForCity(city: string): string[] {
  return CITY_ZIP_MAP[city.toLowerCase().trim()] ?? [];
}
function todayISO() { return new Date().toISOString().split('T')[0]; }
function formatDateDE(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

const ALL_SHOPS = ['Aldi Süd', 'Aldi Nord', 'Rewe', 'Edeka', 'Lidl', 'Kaufland', 'Penny', 'Netto'];

type UpdateStatus = 'idle' | 'checking' | 'up-to-date' | 'available' | 'updating' | 'done' | 'error' | 'not-configured';

interface Props { city: string; zipCount: number; shoppingDate: string; localVersion: string; shops: string[]; familyName: string; }

export default function SettingsClient({ city: initialCity, zipCount: initialZipCount, shoppingDate: initialDate, localVersion, shops: initialShops, familyName: initialFamilyName }: Props) {
  const router = useRouter();
  const [city, setCity] = useState(initialCity);
  const [zipCount, setZipCount] = useState(initialZipCount);
  const [shoppingDate, setShoppingDate] = useState(initialDate || todayISO());
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [shops, setShops] = useState<string[]>(initialShops);
  const [savingShops, setSavingShops] = useState(false);
  const [shopsMsg, setShopsMsg] = useState('');
  const [savingCity, setSavingCity] = useState(false);
  const [savingDate, setSavingDate] = useState(false);
  const [dateMsg, setDateMsg] = useState('');
  const [familyName, setFamilyName] = useState(initialFamilyName);
  const [savingFamilyName, setSavingFamilyName] = useState(false);
  const [familyNameMsg, setFamilyNameMsg] = useState('');

  // Update-State
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [remoteVersion, setRemoteVersion] = useState('');
  const [updateLog, setUpdateLog] = useState<string[]>([]);
  const [updateError, setUpdateError] = useState('');

  function toggleShop(shop: string) {
    setShops((prev) => prev.includes(shop) ? prev.filter((s) => s !== shop) : [...prev, shop]);
    setShopsMsg('');
  }

  async function saveFamilyName() {
    setSavingFamilyName(true); setFamilyNameMsg('');
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ family_name: familyName }) });
    setSavingFamilyName(false);
    setFamilyNameMsg(familyName.trim() ? `✓ Angezeigt als: Für die Familie ${familyName.trim()}` : '✓ Gespeichert (kein Zusatz im Login)');
    router.refresh();
  }

  async function saveShops() {
    setSavingShops(true); setShopsMsg('');
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shops }) });
    setSavingShops(false);
    setShopsMsg('✓ Supermärkte gespeichert');
  }

  function handleCityChange(val: string) { setCity(val); setZipCount(getZipsForCity(val).length); }

  async function saveCity() {
    setSavingCity(true);
    const zips = getZipsForCity(city);
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city, zip_codes: zips.length > 0 ? zips : ['00000'] }) });
    setSavingCity(false);
    router.refresh();
  }

  async function saveShoppingDate() {
    setSavingDate(true); setDateMsg('');
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopping_date: shoppingDate }) });
    setSavingDate(false);
    setDateMsg(`✓ Einkaufstag gespeichert: ${formatDateDE(shoppingDate)}`);
    router.refresh();
  }

  async function changePassword() {
    setPwMsg('');
    try {
      const res = await fetch('/api/settings/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }) });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (res.ok) { setPwMsg('Passwort erfolgreich geändert.'); setOldPw(''); setNewPw(''); }
      else setPwMsg(data.error || 'Fehler beim Ändern des Passworts.');
    } catch {
      setPwMsg('Netzwerkfehler — bitte erneut versuchen.');
    }
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  }

  async function checkUpdate() {
    setUpdateStatus('checking'); setUpdateError(''); setUpdateLog([]);
    const res = await fetch('/api/update');
    const data = await res.json() as { configured: boolean; localVersion?: string; remoteVersion?: string; hasUpdate?: boolean; error?: string };
    if (!data.configured) { setUpdateStatus('not-configured'); return; }
    if (data.error) { setUpdateStatus('error'); setUpdateError(data.error); return; }
    if (data.hasUpdate) { setRemoteVersion(data.remoteVersion ?? ''); setUpdateStatus('available'); }
    else { setUpdateStatus('up-to-date'); }
  }

  async function runUpdate() {
    setUpdateStatus('updating'); setUpdateLog(['Update wird gestartet…']); setUpdateError('');
    const res = await fetch('/api/update', { method: 'POST' });
    const data = await res.json() as { ok: boolean; steps?: string[]; error?: string };
    if (data.ok) {
      setUpdateLog(data.steps ?? []);
      setUpdateStatus('done');
    } else {
      setUpdateError(data.error ?? 'Unbekannter Fehler');
      setUpdateStatus('error');
    }
  }

  const today = todayISO();

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 8px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--accent)', padding: '4px 0' }}>‹</button>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Einstellungen</h1>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ── Update ── */}
        <div>
          <div className="section-label" style={{ padding: 0, marginBottom: 4 }}>App-Update</div>
          <div className="card" style={{ padding: '14px 16px' }}>
            {/* Version-Zeile */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Installiert: </span>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>v{localVersion}</span>
                {updateStatus === 'available' && (
                  <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: 'var(--accent)' }}>→ v{remoteVersion} verfügbar</span>
                )}
                {updateStatus === 'up-to-date' && (
                  <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--accent)' }}>✓ Aktuell</span>
                )}
              </div>
              <button
                onClick={checkUpdate}
                disabled={updateStatus === 'checking' || updateStatus === 'updating'}
                style={{ background: 'var(--chip)', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {updateStatus === 'checking' ? '⏳ Prüfe…' : 'Nach Update suchen'}
              </button>
            </div>

            {/* Nicht konfiguriert */}
            {updateStatus === 'not-configured' && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                Kein GitHub-Repo konfiguriert. Trage <code style={{ background: 'var(--chip)', padding: '1px 5px', borderRadius: 4 }}>GITHUB_REPO</code> in die <code style={{ background: 'var(--chip)', padding: '1px 5px', borderRadius: 4 }}>.env.local</code> ein.
              </p>
            )}

            {/* Fehler beim Prüfen */}
            {updateStatus === 'error' && !updateLog.length && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--danger)' }}>Fehler: {updateError}</p>
            )}

            {/* Update verfügbar → Button */}
            {updateStatus === 'available' && (
              <button
                onClick={runUpdate}
                style={{ marginTop: 12, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }}
              >
                Jetzt auf v{remoteVersion} aktualisieren
              </button>
            )}

            {/* Update läuft / fertig: Log */}
            {(updateStatus === 'updating' || updateStatus === 'done' || (updateStatus === 'error' && updateLog.length > 0)) && (
              <div style={{ marginTop: 12, background: '#1a1e1a', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, fontFamily: 'monospace', lineHeight: 1.7, maxHeight: 240, overflowY: 'auto' }}>
                {updateLog.map((line, i) => (
                  <div key={i} style={{ color: line.startsWith('▶') ? '#7ec87a' : line.startsWith('⚠') ? '#f0c040' : '#d0d8cc' }}>{line}</div>
                ))}
                {updateStatus === 'updating' && (
                  <div style={{ color: '#7ec87a', animation: 'blink 1s infinite' }}>▋</div>
                )}
                {updateStatus === 'error' && updateError && (
                  <div style={{ color: '#f07070', marginTop: 4 }}>Fehler: {updateError}</div>
                )}
                {updateStatus === 'done' && (
                  <div style={{ color: '#7ec87a', marginTop: 4, fontWeight: 700 }}>✓ Update abgeschlossen. Seite neu laden.</div>
                )}
              </div>
            )}

            {updateStatus === 'done' && (
              <button onClick={() => window.location.reload()} style={{ marginTop: 10, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                Seite neu laden
              </button>
            )}
          </div>
        </div>

        {/* ── Einkaufstag ── */}
        <div>
          <div className="section-label" style={{ padding: 0, marginBottom: 4 }}>Einkaufstag</div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px' }}>Angebote werden für diesen Tag geprüft. Fallback ist heute.</p>
          <div style={{ width: '100%', overflow: 'hidden', borderRadius: 12 }}>
            <input type="date" value={shoppingDate} min={today} onChange={(e) => { setShoppingDate(e.target.value || today); setDateMsg(''); }} style={{ display: 'block', width: '100%', boxSizing: 'border-box', background: 'var(--bg-elevated)', border: '1.5px solid var(--accent-soft)', borderRadius: 12, padding: '12px 14px', fontSize: 15, color: 'var(--fg)', outline: 'none', cursor: 'pointer' }} />
          </div>
          {dateMsg && <p style={{ fontSize: 12.5, color: 'var(--accent)', margin: '6px 0 0' }}>{dateMsg}</p>}
          <button className="btn-primary" onClick={saveShoppingDate} disabled={savingDate} style={{ marginTop: 10 }}>
            {savingDate ? 'Speichern…' : 'Einkaufstag speichern'}
          </button>
        </div>

        {/* ── Familienname ── */}
        <div>
          <div className="section-label" style={{ padding: 0, marginBottom: 4 }}>Familienname</div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px' }}>Wird im Login-Bildschirm angezeigt: „Für die Familie …"</p>
          <input className="input" type="text" placeholder="z.B. Müller" value={familyName} onChange={(e) => { setFamilyName(e.target.value); setFamilyNameMsg(''); }} />
          {familyNameMsg && <p style={{ fontSize: 12.5, color: 'var(--accent)', margin: '6px 0 0' }}>{familyNameMsg}</p>}
          <button className="btn-primary" onClick={saveFamilyName} disabled={savingFamilyName} style={{ marginTop: 10 }}>
            {savingFamilyName ? 'Speichern…' : 'Familienname speichern'}
          </button>
        </div>

        {/* ── Stadt ── */}
        <div>
          <div className="section-label" style={{ padding: 0, marginBottom: 4 }}>Stadt</div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px' }}>Wird genutzt um lokale Supermarkt-Angebote zu finden.</p>
          <input className="input" type="text" placeholder="z.B. Köln, Berlin, München…" value={city} onChange={(e) => handleCityChange(e.target.value)} />
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 0' }}>
            {zipCount > 0 ? `✓ ${zipCount} Postleitzahlen erkannt` : city.trim() ? 'Stadt nicht bekannt — bitte prüfen' : 'Stadt eingeben für lokale Angebote'}
          </p>
          <button className="btn-primary" onClick={saveCity} disabled={savingCity} style={{ marginTop: 10 }}>
            {savingCity ? 'Speichern…' : 'Stadt speichern'}
          </button>
        </div>

        {/* ── Supermärkte ── */}
        <div>
          <div className="section-label" style={{ padding: 0, marginBottom: 4 }}>Supermärkte</div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 10px' }}>Nur Angebote dieser Märkte werden beim Refresh berücksichtigt.</p>
          <div className="card" style={{ padding: '4px 0' }}>
            {ALL_SHOPS.map((shop, i) => (
              <label
                key={shop}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 16px',
                  borderBottom: i < ALL_SHOPS.length - 1 ? '0.5px solid rgba(31,42,34,0.07)' : 'none',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={shops.includes(shop)}
                  onChange={() => toggleShop(shop)}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ fontSize: 15, fontWeight: 500 }}>{shop}</span>
              </label>
            ))}
          </div>
          {shopsMsg && <p style={{ fontSize: 12.5, color: 'var(--accent)', margin: '6px 0 0' }}>{shopsMsg}</p>}
          <button className="btn-primary" onClick={saveShops} disabled={savingShops || shops.length === 0} style={{ marginTop: 10 }}>
            {savingShops ? 'Speichern…' : 'Supermärkte speichern'}
          </button>
          {shops.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--danger)', margin: '6px 0 0' }}>Mindestens einen Markt auswählen.</p>}
        </div>

        {/* ── Passwort ── */}
        <div>
          <div className="section-label" style={{ padding: 0, marginBottom: 8 }}>Passwort ändern</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input className="input" type="password" placeholder="Aktuelles Passwort" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
            <input className="input" type="password" placeholder="Neues Passwort" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
            {pwMsg && <p style={{ fontSize: 13, color: pwMsg.includes('erfolgreich') ? 'var(--accent)' : 'var(--danger)', margin: 0 }}>{pwMsg}</p>}
            <button className="btn-primary" onClick={changePassword} disabled={!oldPw || !newPw}>Passwort ändern</button>
          </div>
        </div>

        {/* ── Abmelden ── */}
        <div style={{ borderTop: '0.5px solid rgba(31,42,34,0.1)', paddingTop: 20 }}>
          <button onClick={logout} style={{ background: 'none', border: '1.5px solid rgba(31,42,34,0.15)', color: 'var(--muted)', borderRadius: 12, padding: '12px', width: '100%', fontWeight: 500, cursor: 'pointer', fontSize: 15 }}>
            Abmelden
          </button>
        </div>
      </div>

      <style>{`
        input[type="date"] { appearance: auto; -webkit-appearance: auto; width: 100%; min-width: 0; max-width: 100%; box-sizing: border-box; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
