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
      `https://raw.githubusercontent.com/${repo}/main/package.json`,
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

// POST: führt das Update auf dem Server aus (git pull → npm install → build → restart)
export async function POST() {
  const appDir = process.env.APP_DIR ?? process.cwd();
  const pm2Name = process.env.PM2_APP_NAME;
  const serviceName = process.env.SERVICE_NAME;

  try {
    const { execSync } = await import('child_process');
    const run = (cmd: string) =>
      execSync(cmd, { cwd: appDir, encoding: 'utf8', timeout: 300_000, stdio: 'pipe' });

    const steps: string[] = [];

    steps.push('▶ Lokale Änderungen verwerfen...');
    execSync(`git -c "safe.directory=${appDir}" fetch origin`, {
      cwd: appDir, encoding: 'utf8', timeout: 30_000, stdio: 'pipe',
    });
    execSync(`git -c "safe.directory=${appDir}" reset --hard origin/main`, {
      cwd: appDir, encoding: 'utf8', timeout: 15_000, stdio: 'pipe',
    });
    steps.push('Auf Stand von GitHub zurückgesetzt.');

    steps.push('▶ npm install...');
    run('npm install');
    steps.push('Abhängigkeiten installiert.');

    steps.push('▶ npm run build...');
    run('npm run build');
    steps.push('Build erfolgreich.');

    steps.push('▶ Neustart...');
    let restarted = false;
    if (pm2Name) {
      try { run(`pm2 restart ${pm2Name}`); steps.push(`pm2 restart "${pm2Name}" OK.`); restarted = true; } catch { /* nächste Option */ }
    }
    if (!restarted && serviceName) {
      try { execSync(`systemctl restart ${serviceName}`, { encoding: 'utf8', timeout: 15_000 }); steps.push(`systemctl restart "${serviceName}" OK.`); restarted = true; } catch { /* nächste Option */ }
    }
    if (!restarted) steps.push('⚠ Kein Neustart-Dienst konfiguriert. Bitte manuell neu starten.');

    return NextResponse.json({ ok: true, steps });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
