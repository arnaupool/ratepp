# Puntuaciones

A self-hosted app for rating anything (restaurants, movies, memories) from 1
to 10, with photos, other people's scores and free-form fields per score.

- **Web app (PWA)**: React + TypeScript + Vite, in `web/`. Installed on the
  iPhone from Safari ("Añadir a pantalla de inicio").
- **Backend**: Node/Express + PostgreSQL, in `backend/`. The same server
  serves the API, the photos and the web app, from one origin.

The original React Native/Expo app was retired; its last version is at the
git tag `expo-final`.

Design references: `project/Puntuaciones App.dc.html` (original prototype),
`docs/webapp-rewrite/` (spec for the web app, decisions in `05-decisiones.md`).

## Repo layout

```
Dockerfile           single image: builds web/, bundles it with the API
docker-compose.yml   Postgres + app (+ optional daily backups)
backend/             Express API, migrations, static serving of web/dist
web/                 the PWA
e2e/                 Playwright suite
dev/                 local-only tooling (throwaway Postgres, icon generator)
```

Each score has a title, photos, categories, your 1-10 score, other people's
scores and optional fields: text, number, date, location, gallery, list,
tag, price (per person or total), criteria (named 1-10 sub-scores), time,
link, sí/no, ingredients (rescaled by servings), steps and difficulty.

Notes are personal or belong to a group: members of a group see, create and
score its notes with their own accounts and share its categories and tags.
People join with an invitation link or are added by email (docs/grupos.md).

Templates keep the shape of a note (its fields, criteria names, categories,
color and who else scores) to start new ones from a dropdown in Nueva
puntuación; yours or a group's (docs/plantillas.md).

## Deploying on Unraid (Portainer or docker compose)

1. **Back up first** (see "Backups" below), every time you upgrade.
2. Create the stack from this repository (Portainer: *Stacks > Add stack >
   Repository*, branch `main`, compose path `docker-compose.yml`), or run
   `docker compose up -d --build` in a checkout.
3. Set the environment variables (Portainer: *Environment variables*):

| Variable | Default | What it does |
|---|---|---|
| `JWT_SECRET` | example value | **Set a real one** (`openssl rand -hex 32`). Signs sessions. |
| `APP_PORT` | `4000` | Host port the app is published on. |
| `ALLOW_REGISTRATION` | `true` | `false` closes sign-ups: 403 on register and no "Regístrate" link. Starting value: the admin panel can change it. |
| `ADMIN_EMAIL` | empty | The account with this email is always a site admin (Administración in the side menu) and can sign up even with registration closed. The panel can't demote, disable or delete it. Without it there is no admin. |
| `PUBLIC_URL` | empty | External address of the app (e.g. `https://anas.tail899c15.ts.net`). Group invitation links use it, so they work from outside even when created from a LAN address. Shown in Ajustes. |
| `TRUST_PROXY` | empty | Set when a reverse proxy sits in front, so rate limits see real client IPs. With a proxy reaching the container over Docker's network, `uniquelocal` works. |
| `MAP_TILE_URL` | OpenStreetMap | Map tile template. The CSP is built from it. |
| `GEOCODER_URL` | public Nominatim | Nominatim-compatible geocoder for the location picker. |
| `TMDB_API_KEY`, `RAWG_API_KEY` | empty | Optional: movie/series and game cover search. Books need no key. |
| `AUTH_RATE_LIMIT_MAX` | `30` | Login/register attempts per IP every 15 minutes. |
| `COMPOSE_PROFILES` | empty | `backup` enables the daily backup service. |
| `BACKUP_DIR`, `BACKUP_KEEP_DAYS` | `./backups`, `14` | Where backups go and how many daily dumps to keep. |

The compose project name, the `api` service and the `pgdata`/`uploads`
volumes keep their names: **don't rename them**, or Docker creates new empty
volumes and it looks as if all data was lost.

The container has a healthcheck (`GET /health`), shown in Portainer.

## HTTPS (needed to install the PWA and for "Usar mi ubicación actual")

The app always listens on plain HTTP; TLS is terminated by a reverse proxy
in front. Nothing in the code depends on which one, so switching later needs
no code change.

### Private: Tailscale (what this server uses today)

1. In the Tailscale admin console, *DNS* page: enable **MagicDNS** and
   **HTTPS Certificates** (they are off on this tailnet today).
2. On the Unraid host (Tailscale plugin), expose the app:

   ```bash
   tailscale serve --bg --https=443 http://localhost:4000
   ```

   The app is then at `https://anas.tail899c15.ts.net`, with a valid
   certificate, reachable only from your tailnet. `tailscale serve status`
   shows it; `tailscale serve --https=443 off` removes it.
3. Set `TRUST_PROXY=uniquelocal` (the proxy reaches the container through
   Docker's network).

### Public: own domain

Point a domain at the server and put any of these in front of port 4000:
Nginx Proxy Manager or Caddy with Let's Encrypt, or a Cloudflare Tunnel (no
router ports opened). Set `TRUST_PROXY` to the proxy's address range.

Before opening it to other people, see "Before going public" below.

## Installing on the iPhone

1. Open the HTTPS address in **Safari** and sign in.
2. *Share* > *Añadir a pantalla de inicio*.
3. Open it from the home screen: it runs full screen with its own icon.

New versions install themselves; if the app was open during an upgrade it
shows "Hay una versión nueva" with a reload button. Over plain HTTP (for
example the LAN IP) the app works, but without offline shell, installation
or geolocation.

## Backups

Photos live in the `uploads` volume and data in `pgdata`. A backup needs
**both**.

One-off, before an upgrade (from the folder with `docker-compose.yml`):

```bash
docker compose exec db pg_dump -U puntuaciones puntuaciones > backup-$(date +%F).sql
docker run --rm -v <project>_uploads:/data -v "$PWD":/backup alpine tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

`<project>` is the compose project (Portainer stack) name; `docker volume ls`
shows the exact volume names.

Periodic: set `COMPOSE_PROFILES=backup` and `BACKUP_DIR` to a share on the
array (for example `/mnt/user/backups/puntuaciones`). The `backup` service
writes a gzipped dump per day (keeps `BACKUP_KEEP_DAYS`) and mirrors the
photos into `BACKUP_DIR/uploads`. Named Docker volumes live inside
`docker.img`, which Unraid's Appdata Backup doesn't cover, so this mirror is
what protects the photos. Include `BACKUP_DIR` in your usual off-server copy.

### Restoring

```bash
docker compose stop api
gunzip -c backups/db/puntuaciones-YYYY-MM-DD.sql.gz | docker compose exec -T db psql -U puntuaciones -d puntuaciones
docker run --rm -v <project>_uploads:/data -v "$PWD/backups/uploads":/src alpine cp -a /src/. /data/
docker compose start api
```

Restore the dump into an empty database (a fresh `pgdata` volume, or after
`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`).

## Development

```bash
cd dev && npm install && node db.mjs          # throwaway Postgres 16 on :5433
cd backend && npm install && node src/migrate.js && node src/index.js
cd web && npm install && npm run dev           # http://localhost:5173, proxies /api
```

The backend reads `DATABASE_URL`
(`postgres://puntuaciones:puntuaciones@localhost:5433/puntuaciones` for the
dev database), `JWT_SECRET`, `UPLOADS_DIR`, and `WEB_DIST_DIR=../web/dist` to
serve a built web app.

### Tests

```bash
cd web && npm run build
cd e2e && npm install && npx playwright install chromium webkit
npx playwright test
```

The suite starts its own throwaway stack (embedded Postgres, the API on
:4100 and a stub geocoder) and runs every test in Chromium and in WebKit
with an iPhone 15 profile, plus layout checks on a 1440x900 desktop. It
fails on any browser console error.

## Security notes

- Strict Content-Security-Policy (scripts only from the same origin), no
  framing, `Referrer-Policy: same-origin`, `nosniff`.
- Rate limits: login/register per IP; uploads, cover search, geocoding and
  color extraction per user; thumbnails per IP.
- Photos under `/uploads` (and their thumbnails) are served without a
  session: anyone with the exact URL can see a photo. Names are random UUIDs
  and are never listed.

### Before going public

- A real `JWT_SECRET` (the server only warns about the example one today).
- Password recovery (needs SMTP), email verification and some anti-bot
  protection on sign-up; or keep `ALLOW_REGISTRATION=false`.
- Deleting one's account and exporting one's data (GDPR), privacy policy.
- Per-user photo storage quota.
- Map tiles and geocoding from a provider that allows that traffic.
- TMDB attribution in the app ("This product uses the TMDB API but is not
  endorsed or certified by TMDB").
- Verified automatic backups and monitoring of the healthcheck.
