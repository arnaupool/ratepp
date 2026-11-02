# 02 — API y datos

El backend actual (`backend/`) se **reutiliza**. Este documento es su contrato:
la nueva web app debe consumirlo tal cual, y cualquier cambio en el backend debe
ser compatible hacia atrás (hay datos reales del usuario en producción).

## Stack del backend

- Node 20 + Express 4, PostgreSQL 16, `pg`, `bcryptjs`, `jsonwebtoken`, `multer`.
- Migraciones SQL en `backend/src/migrations/NNN_*.sql`, aplicadas una sola vez cada
  una por `src/migrate.js` (tabla `schema_migrations`) al arrancar el contenedor.
- Fotos en disco en `UPLOADS_DIR` (volumen Docker), servidas en `/uploads/<archivo>`.

## Esquema (estado final tras las 4 migraciones)

```sql
users (
  id uuid PK default gen_random_uuid(),
  email text NOT NULL UNIQUE,          -- guardado en minúsculas
  password_hash text NOT NULL,         -- bcrypt, coste 10
  name text NOT NULL,
  created_at timestamptz default now()
)

scores (
  id uuid PK,
  owner_id uuid NOT NULL -> users(id) ON DELETE CASCADE,
  title text NOT NULL,
  categories text[] NOT NULL default '{}',   -- índice GIN
  photo_urls text[] NOT NULL default '{}',   -- ordenado; [0] = portada
  card_color text NULL,                      -- '#rrggbb' o NULL
  created_at, updated_at timestamptz
)

score_ratings (
  id uuid PK,
  score_id uuid -> scores(id) ON DELETE CASCADE,
  person_name text NOT NULL,     -- la del propietario se llama 'Tú'
  is_owner boolean default false,-- exactamente una por score, sort_order 0
  value integer CHECK 1..10,
  sort_order integer, created_at
)

score_fields (
  id uuid PK,
  score_id uuid -> scores(id) ON DELETE CASCADE,
  type text CHECK IN ('text_long','number','date','location','photo','gallery','list','tag'),
  label text NOT NULL,
  value jsonb NOT NULL default 'null',
  sort_order integer, created_at
)
```

Formas de `value` por tipo: ver tabla en doc 01.

## Autenticación

- `Authorization: Bearer <jwt>` en todas las rutas salvo register/login/health.
- JWT HS256 con `JWT_SECRET`, payload `{ sub: userId }`, caduca a los **30 días**.
  No hay refresh token: al caducar, el usuario vuelve a Acceder.
- `/register` y `/login` tienen rate limit en memoria: 30 intentos / 15 min / IP →
  `429 { error: "Demasiados intentos, inténtalo de nuevo más tarde" }`.
  Si el frontend va detrás de un proxy inverso, configurar `app.set('trust proxy', …)`
  para que `req.ip` sea la IP real (si no, todos los usuarios comparten contador).

## Convenciones

- JSON en camelCase en la API; snake_case en la BD.
- Errores: `{ "error": "mensaje en español" }` con 400/401/404/409/429/500.
  El frontend muestra `error` tal cual. UUID mal formado → 400 "Identificador inválido".
- `401` en cualquier ruta = token inválido/caducado → cerrar sesión e ir a Acceder.
- Todas las rutas filtran por el usuario autenticado; un id ajeno devuelve 404.

## Endpoints

### Salud
`GET /health` → `{ ok: true }`

### Auth
| Método y ruta | Body | Respuesta |
|---|---|---|
| `POST /api/auth/register` | `{ email, password, name }` (password ≥ 6) | `201 { token, user: { id, email, name } }`; `409` si el email existe |
| `POST /api/auth/login` | `{ email, password }` | `200 { token, user }`; `401 "Credenciales incorrectas"` |
| `GET /api/auth/me` | — | `{ user }` |

### Puntuaciones
DTO de lista:
```json
{ "id": "uuid", "title": "…", "categories": ["…"], "photoUrls": ["https://…"],
  "cardColor": "#f6c9c9" | null, "createdAt": "…", "updatedAt": "…",
  "ratings": [ { "id", "personName", "isOwner", "value", "sortOrder" } ] }
```
DTO de detalle = el anterior + `"fields": [ { "id", "type", "label", "value", "sortOrder" } ]`.
`ratings` y `fields` vienen ordenados por `sortOrder`.

| Método y ruta | Detalle |
|---|---|
| `GET /api/scores` | Query opcional: `search`, `category`, `tag`, `dateFrom`, `dateTo` (`YYYY-MM-DD`). → `{ items: [DTO lista] }`, más recientes primero. `search` es ILIKE sobre título, cualquier categoría o el JSON textual de cualquier campo. `category=Todas` = sin filtro. `tag` = coincidencia exacta en campos `tag`. Fechas = existe algún campo `date` dentro del rango (inclusive). |
| `GET /api/scores/locations` | → `{ locations: [ { scoreId, title, coverUrl, avgScore (1 decimal), label, lat, lng } ] }` (una por campo de ubicación) |
| `GET /api/scores/:id` | → `{ score: DTO detalle }` |
| `POST /api/scores` | `{ title, categories?, photoUrls?, cardColor?, ownerValue (1-10, obligatorio), ratings?: [{personName, value}], fields?: [{type, label, value}] }` → `201 { score }`. Transaccional. |
| `PATCH /api/scores/:id` | Cualquiera de `{ title, categories, photoUrls, cardColor }` (`cardColor: null` lo borra; debe ser `#rrggbb`) → `{ score }` |
| `DELETE /api/scores/:id` | `204` (borra en cascada notas y campos; los archivos de fotos se quedan en disco) |

### Notas por persona
| Método y ruta | Detalle |
|---|---|
| `POST /api/scores/:id/ratings` | `{ personName = "Nuevo", value = 5 }` → `201 { rating }` |
| `PATCH /api/scores/:id/ratings/:ratingId` | `{ personName?, value? }` → `{ rating }`. La nota del propietario no se puede renombrar (400). Tu nota se cambia por aquí con `value`. |
| `DELETE /api/scores/:id/ratings/:ratingId` | `204`. La del propietario no se puede borrar (400). |

### Campos dinámicos
| Método y ruta | Detalle |
|---|---|
| `POST /api/scores/:id/fields` | `{ type, label?, value? }` → `201 { field }` (se añade al final) |
| `PATCH /api/scores/:id/fields/:fieldId` | `{ label?, value? }` → `{ field }` |
| `DELETE /api/scores/:id/fields/:fieldId` | `204` |
| `POST /api/scores/:id/fields/reorder` | `{ order: [fieldId, …] }` → `{ fields }` |

### Fotos
`POST /api/uploads` — `multipart/form-data`, campo **`photo`**. Tipos aceptados:
jpeg, png, webp, heic; máx. 10 MB. → `201 { url }` con
`url = PUBLIC_URL + "/uploads/<uuid>.<ext>"`.

> Ojo para la web: `url` es absoluta y depende de `PUBLIC_URL`, y todas las fotos ya
> guardadas tienen URLs absolutas con la IP del servidor por HTTP. El frontend debe
> normalizar **todas** las URLs de imagen que reciba (`photoUrls`, valores de campos
> `gallery`/`photo`, `coverUrl`) a rutas relativas `/uploads/...`. **No cambiar esta
> respuesta mientras exista la app Expo** (la rompería). Detalle en doc 04,
> decisión 4.

### Categorías y etiquetas
| Método y ruta | Detalle |
|---|---|
| `GET /api/categories` | → `{ categories: [string] }` (distintas, ordenadas) |
| `DELETE /api/categories/:name` | Quita la categoría de todas tus puntuaciones → `204` |
| `GET /api/tags` | → `{ tags: [string] }` (de campos `tag` con valor array) |
| `DELETE /api/tags/:name` | Quita la etiqueta de todos tus campos `tag` → `204` |

### Carátulas
`GET /api/covers/search?type=movie|tv|game|book&q=…` →
`{ results: [ { id, title, subtitle, posterUrl } ], note? }`.
movie/tv usan TMDB (`TMDB_API_KEY`, idioma es-ES), game usa RAWG (`RAWG_API_KEY`),
book usa Open Library (sin clave). Sin clave → `results: []` + `note`.

### Color dominante
`GET /api/color?url=…` → `{ color: "#rrggbb" | null }`. Media de píxeles de la
imagen (JPEG/PNG). Las URLs `/uploads/…` propias se leen de disco; las externas se
descargan con protección SSRF básica. Siempre responde 200; `null` si no puede.

## Variables de entorno

| Variable | Uso |
|---|---|
| `PORT` | 4000 |
| `DATABASE_URL` | Postgres |
| `JWT_SECRET` | **Obligatorio uno real**. Si falta o es el de ejemplo, el servidor avisa en logs. |
| `UPLOADS_DIR` | `/app/uploads` |
| `PUBLIC_URL` | Base para construir URLs de fotos |
| `TMDB_API_KEY`, `RAWG_API_KEY` | Opcionales, búsqueda de carátulas |
| `ALLOW_REGISTRATION` | **Nueva.** `true` por defecto; `false` cierra el registro (ver doc 04) |
| `TRUST_PROXY` | **Nueva.** Vacía por defecto. Valor para `app.set('trust proxy', …)` cuando hay un proxy inverso delante |
| `MAP_TILE_URL` | **Nueva.** Plantilla de teselas; por defecto OpenStreetMap |
| `GEOCODER_URL` | **Nueva.** Base de la API compatible con Nominatim; por defecto el Nominatim público |

## Seguridad ya aplicada (mantener)

- Todas las consultas parametrizadas; propiedad comprobada en cada ruta.
- `X-Content-Type-Options: nosniff` global.
- Nombres de archivo aleatorios con extensión fija según MIME.
- Mensaje de login genérico (no revela si el email existe).
- Rate limit en auth.

## Nuevos endpoints necesarios para la web

La app móvil usaba geocodificación nativa del teléfono (`expo-location`). En web
no existe; se recomienda añadir al backend un proxy a Nominatim (OpenStreetMap):

- `GET /api/geo/search?q=…` → `{ results: [ { label, lat, lng } ] }`
- `GET /api/geo/reverse?lat=…&lng=…` → `{ label }`

Requisitos de la política de uso de Nominatim: `User-Agent` identificativo,
máx. 1 petición/segundo, cachear respuestas. Deben requerir auth como el resto.

Otros endpoints nuevos (detalle en doc 04), todos compatibles hacia atrás:

- `GET /api/config` (público, sin auth) → `{ allowRegistration: boolean,
  mapTileUrl: string }`.
- `GET /api/thumb?path=/uploads/<archivo>&w=400` (auth) → imagen redimensionada
  con `sharp` y cacheada en disco. Solo archivos de `UPLOADS_DIR`.
- `GET /api/color` debe aceptar también una ruta relativa `/uploads/<archivo>`.
- `POST /api/auth/register` → `403 "El registro está desactivado"` si
  `ALLOW_REGISTRATION=false`.
