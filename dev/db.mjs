// Throwaway Postgres 16 for local development and e2e runs, so nothing needs
// Docker on the dev machine. Data lives in dev/.pgdata (git-ignored).
//   node db.mjs           start (creates the cluster the first time)
//   node db.mjs --reset   wipe the data directory first (needed once for a
//                         cluster created before it was forced to UTF8)
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, '.pgdata');
const port = Number(process.env.PGPORT || 5433);

if (process.argv.includes('--reset')) fs.rmSync(dataDir, { recursive: true, force: true });
const fresh = !fs.existsSync(path.join(dataDir, 'PG_VERSION'));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'puntuaciones',
  password: 'puntuaciones',
  port,
  persistent: true,
  // UTF8 like the server's Postgres; on Windows initdb would otherwise pick
  // WIN1252, which can't store emoji (template emoticons).
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase('puntuaciones');
console.log(`Postgres listo: postgres://puntuaciones:puntuaciones@localhost:${port}/puntuaciones`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
