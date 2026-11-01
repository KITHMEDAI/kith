// Local dev server for Kith Workspace (generic edition) on :8090, or on the
// port given as the first argument (with its own build folder, so a second
// session can run one alongside: `node scripts/workspace-dev.mjs 8091`).
// Loads .env.workspace (Sydney Supabase keys) OVER .env.local, so the
// workspace never talks to the kith.space database.
import { readFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const file = '.env.workspace';
if (!existsSync(file)) {
  console.warn('No .env.workspace yet: running in PREVIEW-ONLY mode (open /preview). Sign-in and data need the Sydney keys.');
}
const env = { ...process.env };
// .env.workspace.generated holds the production ENCRYPTION_SECRET/CRON_SECRET,
// so notes written locally and on work.kith.space decrypt the same way.
for (const f of [file, '.env.workspace.generated']) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
if (!existsSync(file)) {
  env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'placeholder';
  env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder';
}
env.NEXT_PUBLIC_EDITION = 'workspace';
const port = process.argv[2] || '8090';
env.NEXT_DIST_DIR = port === '8090' ? '.next-workspace' : `.next-workspace-${port}`;
env.NEXT_PUBLIC_APP_URL = env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;

const child = spawn('npx', ['next', 'dev', '--turbo', '-p', port], { env, stdio: 'inherit', shell: true });
child.on('exit', code => process.exit(code ?? 0));
