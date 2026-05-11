import { NextResponse } from 'next/server';
import pkg from '../../../package.json';

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}

export async function GET() {
  const repo = process.env.GITHUB_REPO;
  const localVersion = pkg.version;

  if (!repo || repo.includes('dein-github-name')) {
    return NextResponse.json({ configured: false, localVersion });
  }

  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${repo}/main/package.json?t=${Date.now()}`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`GitHub antwortet nicht (HTTP ${res.status})`);

    const remote = await res.json() as { version?: string };
    const remoteVersion = remote.version ?? '0.0.0';
    const hasUpdate = compareVersions(remoteVersion, localVersion) > 0;

    return NextResponse.json({ configured: true, localVersion, remoteVersion, hasUpdate });
  } catch (err) {
    return NextResponse.json({ configured: true, localVersion, error: String(err) }, { status: 502 });
  }
}

export async function POST() {
  const appDir = process.env.APP_DIR ?? process.cwd();
  const dbPath = process.env.DB_PATH ?? null;
  const pm2Name = process.env.PM2_APP_NAME;
  const serviceName = process.env.SERVICE_NAME;

  try {
    const { execSync, execFileSync } = await import('child_process');
    const { existsSync, copyFileSync } = await import('fs');
    const { join } = await import('path');

    const run = (cmd: string) =>
      execSync(cmd, { cwd: appDir, encoding: 'utf8', timeout: 300_000, stdio: 'pipe' });

    const steps: string[] = [];

    // ── Schritt 1: Datenbank sichern ──────────────────────────────────────
    const actualDbPath = dbPath ?? join(appDir, 'essensplan.db');
    if (existsSync(actualDbPath)) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupPath = `${actualDbPath}.backup-${ts}`;
      try {
        copyFileSync(actualDbPath, backupPath);
        steps.push(`✓ Datenbank gesichert: ${backupPath}`);
      } catch {
        steps.push('⚠ DB-Backup fehlgeschlagen — Update wird trotzdem fortgesetzt.');
      }
    } else {
      steps.push('⚠ Keine Datenbank gefunden — Neuinstallation?');
    }

    // ── Schritt 2: Code aktualisieren ─────────────────────────────────────
    steps.push('▶ Code aktualisieren…');
    execFileSync('git', ['-c', `safe.directory=${appDir}`, 'fetch', 'origin'], {
      cwd: appDir, encoding: 'utf8', timeout: 30_000, stdio: 'pipe',
    });
    execFileSync('git', ['-c', `safe.directory=${appDir}`, 'reset', '--hard', 'origin/main'], {
      cwd: appDir, encoding: 'utf8', timeout: 15_000, stdio: 'pipe',
    });
    steps.push('✓ Code auf aktuellen Stand gebracht.');

    // ── Schritt 3: Abhängigkeiten ─────────────────────────────────────────
    steps.push('▶ npm install…');
    run('npm install');
    steps.push('✓ Abhängigkeiten installiert.');

    // ── Schritt 4: Build ──────────────────────────────────────────────────
    steps.push('▶ Build…');
    run('npm run build');
    steps.push('✓ Build erfolgreich.');

    // ── Schritt 5: Neustart ───────────────────────────────────────────────
    // Neustart wird NACH dem Senden der Response ausgelöst (detached),
    // damit systemd nicht den laufenden Prozess killt bevor die Antwort rausgeht.
    steps.push('▶ Neustart…');
    let restartCmd: string | null = null;

    if (pm2Name) {
      try {
        run(`pm2 restart ${pm2Name}`);
        steps.push(`✓ pm2 "${pm2Name}" neu gestartet.`);
      } catch { /* weiter mit systemctl */ }
    }
    if (!restartCmd && serviceName) {
      restartCmd = `systemctl restart ${serviceName}`;
    }
    if (restartCmd) {
      // Wir lösen den Restart 1 Sekunde nach der HTTP-Response aus.
      // Der Prozess (=dieser Next.js-Server) wird danach von systemd beendet.
      const { spawn } = await import('child_process');
      spawn('sh', ['-c', `sleep 1 && ${restartCmd}`], {
        detached: true,
        stdio: 'ignore',
      }).unref();
      steps.push(`✓ Neustart von "${serviceName ?? pm2Name}" eingeplant — App startet gleich neu.`);
    } else if (!pm2Name) {
      steps.push('⚠ Kein Dienst konfiguriert (SERVICE_NAME oder PM2_APP_NAME fehlt in .env.local).');
    }

    return NextResponse.json({ ok: true, steps });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
