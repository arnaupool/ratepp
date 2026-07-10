# Puntuaciones

A mobile app for rating anything — restaurants, movies, memories — from 1 to 10,
with freeform dynamic fields per score. Implemented from the Claude Design
handoff in `project/Puntuaciones App.dc.html` (see `chats/chat1.md` for the
full design conversation).

- **Mobile app**: React Native (Expo) — `mobile/`
- **Backend**: Node/Express + PostgreSQL, containerized — `backend/`

## Repo layout

```
backend/            Express API + Postgres migrations
  src/routes/        auth, scores (+ ratings, fields), uploads
  src/migrations/     SQL schema
docker-compose.yml   Postgres + API, for self-hosting
mobile/              Expo app
  src/screens/        Login, Home, Create, Detail
  src/components/     shared UI (score badges, field icons, pill selector...)
  src/theme/           oklch->hex color port + typography, from the design tokens
project/             original Claude Design export (reference only)
chats/               design conversation transcript (reference only)
```

## Running the backend

Requires Docker + Docker Compose.

```bash
cp backend/.env.example backend/.env   # then set a real JWT_SECRET
docker compose up --build
```

This starts Postgres and the API (migrations run automatically on boot).
The API listens on `http://localhost:4000`; uploaded photos are served from
`/uploads` and persisted in a Docker volume.

For a real server deployment, set `PUBLIC_URL` (in `docker-compose.yml`'s
`api` service or an `.env` next to `docker-compose.yml`) to the public
HTTPS URL of the API, since it's used to build photo URLs returned to the
app.

## Running the mobile app

Requires Node 18+ and the Expo Go app (or a dev build) on your phone.

```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://<your-machine-ip>:4000 npx expo start
```

`EXPO_PUBLIC_API_URL` must point at a host your phone can reach — `localhost`
only works in an iOS Simulator on the same machine. Set it to your computer's
LAN IP (or the public URL of your deployed backend) when testing on a real
device via Expo Go.

## What's implemented

The four screens from the design, wired to a real backend:

1. **Acceder** — login/register (toggle, matches the design's single form).
2. **Principal** — 2-column grid of your scores, search, tag filters, single
   score badge or stacked mini-badges + "+N" for multi-person scores.
3. **Crear puntuación** — title, required 1-10 score (single-row pill
   selector), optional extra people's scores, dynamic fields (quick-add
   chips + "more fields" sheet: text, number, date, location, photo,
   repeatable gallery, list, tag), save.
4. **Detalle** — hero photo + thumbnails, editable per-person scores
   (add/rename/remove), unified fields card with thin dividers.

Colors, spacing and type are ported directly from the design's CSS (the
`oklch()` tokens are converted to sRGB at runtime in `src/theme/oklch.js` —
RN has no `oklch()` support, so this keeps the palette pixel-accurate rather
than eyeballed). The pure-CSS field-type icons (border tricks / pseudo
elements) are recreated as small View compositions in
`src/components/FieldIcon.js`.

### Gaps filled beyond the prototype

The `.dc.html` prototype is a visual mock with local-only state; a few
things needed real decisions to become a working app and weren't specified
in the design chat:

- **Save action**: the create screen had no submit button in the prototype.
  Added a "Guardar puntuación" button, styled like the login CTA.
- **Category assignment**: cards are filterable by category
  (Restaurantes/Películas/Recuerdos in the mock data), but the create flow
  never let you set one. Added a lightweight "Categoría" text input with
  suggestion chips (existing categories, seeded with the three examples).
- **Field labels**: the mock detail view shows custom labels ("Precio
  medio", "Fecha de la visita") but the create flow only ever assigns the
  generic type label ("Número", "Fecha"). Made the field label editable
  inline when adding a field, defaulting to the generic label.
- **Photo/gallery fields in Detail**: the static mock detail data never
  included photo/gallery-type fields, so the prototype's detail template
  only handles list/text values. Added thumbnail rendering for those field
  types, and photos from `photo`/`gallery` fields feed the hero image +
  thumbnail strip.
- **Account name**: the login design has no "name" field. Registration
  derives a display name from the email's local part.

### Not yet built (per the design's own "next steps")

The design chat flags these as future work, not part of this handoff:
teams/invite flow (create/join with a code or link), empty-state polish,
and screen-transition animation (the `.dc.html` prototype's interactive
filmstrip was a design-tool affordance, not part of the spec to implement).
Score/field deletion beyond removing a field during creation, and editing a
score's title/fields after creation, are also not implemented — the design
only specifies score (rating) editing in Detail, not field editing.
