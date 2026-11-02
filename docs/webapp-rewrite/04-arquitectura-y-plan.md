# 04 — Arquitectura, despliegue y plan

## Principios

1. **Misma app, otra plataforma.** Paridad funcional con `mobile/` (doc 01). Nada de
   funcionalidades nuevas salvo las que exige el cambio a web.
2. **No perder datos.** El usuario ya tiene puntuaciones y fotos reales en su
   servidor. La base de datos y el volumen de fotos se conservan; cualquier cambio
   en el backend es compatible hacia atrás.
3. **Un solo despliegue.** Frontend y API en el mismo origen, en el mismo
   `docker-compose` que ya usa el usuario (Unraid + Portainer).
4. **No romper lo que funciona.** El usuario lo ha pedido explícitamente en varias
   ocasiones. Ante la duda, preguntar.
5. **Independiente de cómo se accede.** Hoy el usuario entra por Tailscale, pero en el
   futuro puede querer abrir la app a más usuarios en internet con un dominio
   propio. Nada puede depender de Tailscale: la app sirve HTTP en un puerto y el
   HTTPS lo pone un proxy inverso delante, sea cual sea. Hostnames, orígenes y
   proveedores externos se configuran por variables de entorno, nunca en el código.

## Arquitectura objetivo

```
iPhone (PWA instalada desde Safari)
        │  HTTPS
        ▼
Proxy inverso (termina TLS) — hoy: `tailscale serve`;
  mañana: Caddy / Nginx Proxy Manager / Cloudflare Tunnel con dominio propio
        │  HTTP
        ▼
┌───────────────────────── contenedor "app" ─────────────────────────┐
│ Express                                                            │
│   /api/*        → API actual (backend/src/routes, sin cambios de    │
│                   contrato; + /api/geo/*)                          │
│   /uploads/*    → fotos (volumen "uploads")                        │
│   /*            → build estático de la web app (SPA fallback a     │
│                   index.html)                                      │
└────────────────────────────────────────────────────────────────────┘
        │
        ▼
   contenedor "db" (Postgres 16, volumen "pgdata")  ← sin cambios
```

Al ser el mismo origen: sin CORS, URLs de API relativas (`/api/...`) y sin la
pantalla de "Configurar servidor".

## Decisiones (con la recomendación ya elegida)

**[DECISIÓN 1] Stack del frontend** — Recomendado: **React 19 + TypeScript + Vite**,
React Router, TanStack Query (caché y recarga al volver a una pantalla), CSS plano
con variables (portado del prototipo) o CSS Modules. Sin framework de UI pesado:
el diseño es propio. Alternativa válida si el usuario prefiere: SvelteKit (modo
estático).

**[DECISIÓN 2] Cómo se sirve** — Recomendado: **el propio Express sirve el build
estático** (Dockerfile multi-etapa: etapa 1 compila `web/`, etapa 2 copia `dist/`
dentro de la imagen del backend). Un solo contenedor `app`. Alternativa: contenedor
nginx delante; solo si el usuario lo prefiere.

**[DECISIÓN 3] HTTPS y acceso** — Necesario: el service worker de la PWA y "Usar mi
ubicación actual" (geolocalización) solo funcionan en contexto seguro. La app **no**
gestiona certificados: escucha en HTTP y el TLS lo termina un proxy inverso. El
README documenta dos formas, sin que el código dependa de ninguna:
- **Privado (lo que usa hoy el usuario):** `tailscale serve`, que da
  `https://<máquina>.<tailnet>.ts.net` con certificado válido, accesible solo dentro
  de la tailnet.
- **Público (futuro):** dominio propio + proxy con Let's Encrypt (Caddy o Nginx Proxy
  Manager, ambos habituales en Unraid) o Cloudflare Tunnel (sin abrir puertos del
  router).

Variable `TRUST_PROXY` (por defecto vacía = no confiar) para que Express lea la IP
real del cliente detrás del proxy (`app.set('trust proxy', …)`); sin ella, el rate
limit trata a todos los usuarios como una sola IP. Por HTTP en LAN la app debe
seguir funcionando, solo sin service worker ni geolocalización.

**[DECISIÓN 4] URLs de las fotos** — Hoy se guardan absolutas con `PUBLIC_URL`
(p. ej. `http://192.168.1.50:4000/uploads/abc.jpg`). Servidas en una página HTTPS,
esas URLs HTTP se bloquean (contenido mixto) y además se rompen si se accede por
otro host (IP de LAN vs. nombre de Tailscale vs. un dominio futuro). Recomendado:
- El frontend **normaliza al leer**, en una única función aplicada a **todas** las
  URLs de imagen que vienen de la API: `photoUrls`, los valores de campos `gallery`
  y `photo` (heredado) y el `coverUrl` de `/api/scores/locations`. Cualquier URL
  cuya ruta sea `/uploads/<archivo>` se convierte en la ruta relativa
  `/uploads/<archivo>`. Las URLs externas (pósters de TMDB/RAWG/Open Library,
  HTTPS) se dejan tal cual.
- **Mientras la app Expo siga en uso, no cambiar lo que devuelve
  `POST /api/uploads`**: la app nativa necesita URLs absolutas y vería rotas las
  fotos nuevas. La normalización del frontend ya resuelve el problema en la web.
- `GET /api/color` debe aceptar también rutas relativas (hoy hace `new URL(url)`,
  que falla con relativas). Es un cambio compatible hacia atrás.
- No reescribir los datos existentes en la BD mientras la app Expo siga en uso.
  Cuando se retire (decisión 6): que las subidas devuelvan la ruta relativa y
  añadir una migración que quite el host de `scores.photo_urls` y de los valores de
  campos `gallery`/`photo`.

**[DECISIÓN 5] Mapas** — Recomendado: **Leaflet** (react-leaflet) con teselas de
OpenStreetMap, y geocodificación con **Nominatim a través del backend**
(`/api/geo/search`, `/api/geo/reverse`, ver doc 02). Sin claves ni costes.
Los servidores públicos de OSM y Nominatim solo admiten uso ligero; valen para
unos pocos usuarios pero no para una app abierta al público. Por eso la URL de
teselas (`MAP_TILE_URL`) y la del geocodificador (`GEOCODER_URL`) van por variable
de entorno con OSM/Nominatim por defecto, para poder pasar a un proveedor de pago o
autoalojado sin tocar código. El frontend obtiene la URL de teselas de
`GET /api/config`, y la CSP se construye a partir de ella. Mantener siempre visible
la atribución "© OpenStreetMap contributors" (obligatoria).
"Abrir navegación" abre la URL de direcciones de Google Maps como hoy
(`https://www.google.com/maps/dir/?api=1&destination=lat,lng`).

**[DECISIÓN 6] Qué pasa con `mobile/`** — Se mantiene en el repo sin tocar hasta que
el usuario confirme que la web app funciona en su iPhone. Después se archiva o se
borra (preguntar). El backend debe seguir sirviendo a ambas durante la transición.

## Detalles de implementación

- **Estructura**: nueva carpeta `web/` en la raíz. `backend/` gana el servido de
  estáticos y `/api/geo`. Nada más del backend cambia de contrato.
- **Sesión**: token en `localStorage` (clave `puntuaciones_token`), enviado como
  Bearer. Cualquier 401 → borrar token y volver a Acceder.
- **Tema**: `localStorage` (`puntuaciones_theme` = `light`|`dark`), aplicado como
  `data-theme` en `<html>` antes del primer pintado (script inline) para evitar
  parpadeo.
- **Subida de fotos**: `<input type="file" accept="image/*">` (en iOS ofrece cámara
  y galería). Antes de subir, reducir en cliente con canvas (lado mayor ≤ 2048 px,
  JPEG calidad ~0.8): normaliza HEIC y ahorra espacio. Mostrar spinner por foto.
- **Fechas**: `<input type="date">` dentro de la hoja animada, o un calendario
  propio si el nativo no se puede integrar bien en la hoja. Guardar siempre
  `YYYY-MM-DD` sin zona horaria.
- **Interceptar salida en modo edición** (Detalle): bloquear la navegación del router
  (`useBlocker` en React Router) y mostrar el diálogo "¿Guardar los cambios?".
- **Teclado en iOS Safari**: usar `visualViewport` para que hojas e inputs no queden
  tapados; `scrollIntoView` del input enfocado.
- **Gestos**: pinch-zoom del lightbox con una librería pequeña (p. ej.
  `react-zoom-pan-pinch`) o pointer events propios.
- **Datos**: recargar lista de Principal al volver a ella; invalidar caché tras
  crear/editar/borrar.

- **Accesibilidad / selectores de test**: mantener como `aria-label` exactamente las
  mismas etiquetas que usa la app actual (`accessibilityLabel` en `mobile/src/`,
  p. ej. "Abrir menú", "Crear puntuación", "Volver", "Editar puntuación",
  "Eliminar puntuación", "Quitar foto"…). `e2e/test.js` localiza los elementos por
  esas etiquetas y por textos visibles; si se conservan, portar el test es casi
  directo.
- **Sin conexión**: si la PWA se abre sin poder llegar al servidor (p. ej. fuera de
  casa sin VPN o sin datos), mostrar un estado claro ("No se puede conectar con el
  servidor" + botón "Reintentar"), nunca una pantalla en blanco ni un spinner
  infinito. Poner un timeout razonable a las peticiones (~10 s).

### Seguridad (cambia respecto a la app nativa)

Ahora el servidor entrega HTML y JS, y el token vive en `localStorage` del mismo
origen. Un XSS equivaldría a robar la sesión. Añadir:
- **Content-Security-Policy** estricta: `default-src 'self'`; `img-src 'self' data:
  blob:` + los dominios de pósters (`image.tmdb.org`, `media.rawg.io`,
  `covers.openlibrary.org`) + el host de teselas de `MAP_TILE_URL` (por defecto
  `*.tile.openstreetmap.org`), generando la cabecera a partir de la configuración;
  `script-src 'self'` (sin `unsafe-inline`; el script de tema en línea con hash o
  nonce); `frame-ancestors 'none'`.
- `Referrer-Policy: same-origin`, `X-Frame-Options: DENY` (redundante con
  `frame-ancestors`, por compatibilidad). Se puede usar `helmet`.
- **CORS**: hoy es `cors()` abierto a cualquier origen. Con todo en el mismo origen
  ya no hace falta para la web; mantenerlo solo mientras exista la app Expo (la app
  nativa no lo necesita, pero la versión web de Expo sí) y después quitarlo o
  restringirlo.
- No renderizar nunca contenido de usuario como HTML (`dangerouslySetInnerHTML`
  prohibido); los textos de campos se muestran como texto plano.
- **Registro**: añadir la variable `ALLOW_REGISTRATION` (por defecto `true` para no
  cambiar el comportamiento). Con `false`, `POST /api/auth/register` responde 403
  "El registro está desactivado" y la pantalla de Acceder oculta el enlace
  "Regístrate" (exponer el flag en un endpoint público, p. ej. `GET /api/config`).
  Útil para abrir altas a un grupo concreto y luego cerrarlas.

### Rendimiento de imágenes

Principal pinta las fotos originales (pueden pesar varios MB) en cards pequeñas;
fuera de casa con datos móviles es lento. La reducción en cliente al subir solo
arregla las fotos nuevas.
- `/uploads` con `Cache-Control: public, max-age=31536000, immutable` (los nombres
  son aleatorios y nunca se sobrescriben).
- **Miniaturas en el servidor** (recomendado): endpoint
  `GET /api/thumb?path=/uploads/<archivo>&w=400` que genera con `sharp`, guarda en
  caché en disco (p. ej. `UPLOADS_DIR/.thumbs/`) y sirve. Usarlo en la rejilla,
  miniaturas de Detalle y mapa; la foto original solo en el hero y el lightbox.
  Mismas restricciones que `/api/color` (solo archivos de `UPLOADS_DIR`, protección
  contra path traversal). Las URLs externas de pósters se usan tal cual.
- `loading="lazy"` y `decoding="async"` en todas las imágenes de listas.

### PWA
- `manifest.webmanifest`: `name` "Puntuaciones", `short_name` "Puntuaciones",
  `display: standalone`, `start_url: /`, `theme_color`/`background_color` = `--bg`
  claro (`#fbf4eb` aprox.), iconos 192/512 + `apple-touch-icon` 180 (la "P" blanca
  sobre el acento, esquinas redondeadas).
- `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`.
- Service worker (p. ej. `vite-plugin-pwa`): **solo** cachear el shell de la app
  (HTML/JS/CSS/fuentes/iconos). **Nunca** cachear `/api/*`; las fotos de `/uploads`
  se pueden cachear (son inmutables, nombre aleatorio).
- Al publicar una versión nueva, la app debe actualizarse sola en la siguiente
  apertura (o mostrar "Hay una versión nueva" con botón recargar).

### Despliegue (docker-compose)
- Sustituir el servicio `api` por `app` (misma configuración de entorno + build
  multi-etapa), o mantener el nombre `api` para no confundir al usuario en Portainer.
- **No cambiar** los nombres de los volúmenes `pgdata` y `uploads` ni el nombre del
  proyecto de compose: si cambian, Docker crea volúmenes nuevos vacíos y parecerá
  que se han perdido todos los datos.
- Antes del primer despliegue, indicar al usuario cómo hacer copia:
  `docker compose exec db pg_dump -U puntuaciones puntuaciones > backup.sql`
  y copiar el volumen de fotos.
- `TRUST_PROXY` configurable (ver decisión 3) para cualquier proxy delante.
- `healthcheck` en el servicio de la app (`GET /health`) para que Portainer muestre
  su estado.
- **Copias periódicas** (no solo la inicial): documentar en el README una forma
  sencilla para Unraid, p. ej. un servicio `backup` opcional en el compose que haga
  `pg_dump` diario a una carpeta del host con rotación (conservar N días), y
  recordar incluir el volumen `uploads` en la copia de Unraid (Appdata Backup o
  similar). Sin las fotos, la copia de la BD está incompleta.
- README actualizado: cómo desplegar en Unraid/Portainer, cómo poner HTTPS delante
  (privado con Tailscale y público con dominio propio), cómo instalar en el iPhone ("Compartir → Añadir a pantalla de inicio"),
  cómo restaurar una copia.

## Plan por fases

Cada fase termina con la app funcionando y sus criterios verificados.

| Fase | Alcance | Criterios de aceptación |
|---|---|---|
| 0. Base | Copia de seguridad documentada. `web/` con Vite+React+TS. Express sirve el build con fallback SPA. Docker multi-etapa con healthcheck. Cabeceras de seguridad (CSP, etc.), caché de `/uploads`, `ALLOW_REGISTRATION` + `GET /api/config`. | `docker compose up --build` levanta todo; `/` sirve la web; `/api/*` y `/uploads/*` siguen respondiendo igual que antes; la app Expo sigue funcionando contra este backend. |
| 1. Esqueleto | Tokens de color, Poppins autoalojada, tema claro/oscuro, router, Acceder (login/registro/me), cerrar sesión. | Registro, login, sesión persistente tras recargar, 401 → login. |
| 2. Principal | Normalizador de URLs de imagen y endpoint de miniaturas (`/api/thumb`). Cabecera, búsqueda con debounce, chips de categoría, hoja de filtros (fechas animadas + etiquetas), rejilla de cards, badges/stack, FAB, menú lateral con icono animado, estados vacío/error. | Mismos resultados que la app móvil con los mismos datos reales. |
| 3. Detalle (lectura) | Hero + miniaturas, lightbox con zoom, notas, campos de todos los tipos (ubicación puede ser provisional), fondo `cardColor` con contraste, eliminar. | Puntuaciones existentes se ven completas, incluidas fotos antiguas con URL absoluta. |
| 4. Crear | Galería (subida + reordenar + portada), buscador de carátulas con pestañas independientes, categorías, píldoras, personas, 7 tipos de campo, color en vivo, guardar. | Crear con todos los tipos de campo y verla correcta en Detalle. |
| 5. Detalle (edición) | Guardado inmediato por acción con reversión en error, reordenar campos, título editable, color, diálogo de salida. | Cada edición persiste tras recargar; salir con un input a medias pregunta. |
| 6. Ubicación | `/api/geo/*`, selector de mapa, vista previa con navegación, pantalla Mapa de ubicaciones. | Elegir por búsqueda, por toque y por "mi ubicación" (en HTTPS). |
| 7. Resto | Categorías y etiquetas (borrado global), Ajustes (modo oscuro). | Borrar una etiqueta la quita de todas las notas. |
| 8. PWA y HTTPS | Manifest, iconos, service worker, `TRUST_PROXY`, README con las dos formas de acceso. | Instalable en iPhone, abre a pantalla completa con su icono, funciona fuera de casa por HTTPS (hoy vía Tailscale) sin cambios de código para cambiar a un dominio público. |
| 9. Tests y cierre | Portar `e2e/test.js` (Playwright) a la web app y ejecutarlo en **dos proyectos: Chromium y WebKit con perfil de iPhone** (`devices['iPhone 15']`). El usuario usa Safari en iOS, que es donde aparecen los problemas de teclado, selector de fecha y modo standalone. Decidir con el usuario qué hacer con `mobile/`. | E2E completo en verde en ambos navegadores sin errores de consola. Prueba manual del usuario en su iPhone con la PWA instalada. |

## Errores ya vividos en este proyecto (no repetirlos)

Cada uno fue reportado por el usuario probando en su iPhone:

- Chips de categoría aplastados verticalmente → altura fija, nunca por padding.
- Fila de chips pegada a la rejilla de cards → separación explícita.
- Teclado tapando el input que se está editando (Crear y Detalle).
- Selector de fecha con fondo negro y aparición en fundido brusco → hoja que sube.
- Salir de edición perdiendo un texto sin confirmar.
- Borrar una etiqueta fallaba (500) si algún campo `tag` antiguo tenía valor escalar.
- Diálogo de borrado mostrando `"Eliminar 'undefined'"` durante su animación.
- Texto blanco ilegible sobre colores de card claros en modo oscuro.
- Gris secundario demasiado tenue en modo oscuro.
- Iconos de editar/borrar como emojis (no gustaban).
- Mapa del selector demasiado sensible: arrastrar movía la chincheta.
- Pestañas del buscador de carátulas compartiendo búsqueda.
- Pantalla de login sin salida si el servidor no respondía → en web, mensaje de
  error de red claro ("No se puede conectar con el servidor").

## Preparado para abrirse a más usuarios

El usuario puede querer servir la app en internet a más gente en el futuro. El
rework no la hace pública, pero no debe impedirlo.

**Hacer ya en este rework** (baratos y sin cambiar el comportamiento actual):
- Todo lo que dependa del entorno, por variable: `TRUST_PROXY`, `MAP_TILE_URL`,
  `GEOCODER_URL`, `ALLOW_REGISTRATION`, `PUBLIC_URL`. Nada de hostnames, IPs ni
  dominios en el código.
- Rate limit por usuario también en los endpoints que llaman a servicios externos o
  consumen disco/CPU: `POST /api/uploads`, `/api/covers/search`, `/api/geo/*`,
  `/api/color` y `/api/thumb`. Límites generosos para que un uso normal no los
  toque nunca. En memoria vale (un solo contenedor), pero detrás de una interfaz
  pequeña para poder cambiarlo por Redis si algún día hay varias instancias.
- La app no asume que solo hay un usuario: cada consulta ya filtra por `owner_id`;
  mantenerlo así en todo lo nuevo.
- Las fotos de `/uploads` se sirven **sin autenticación**: cualquiera con la URL
  exacta puede verlas. Hoy es aceptable porque los nombres son UUID aleatorios
  imposibles de adivinar y nunca se listan. No exponer nunca un listado del
  directorio ni nombres predecibles.

**Antes de abrirla al público** (fuera de alcance ahora; dejar anotado en el README
como checklist):
- `JWT_SECRET` real obligatorio: con un secreto por defecto, el servidor debe negarse
  a arrancar en modo público, no solo avisar.
- Recuperación de contraseña, que exige configurar envío de email (SMTP). Hoy un
  usuario que olvide la contraseña no tiene forma de entrar.
- Verificación de email y alguna protección anti-bots en el registro.
- Borrar la propia cuenta y exportar los propios datos (RGPD si hay usuarios en la UE),
  con política de privacidad y aviso legal.
- Cuota de almacenamiento por usuario para las fotos.
- Teselas y geocodificación con un proveedor que admita ese volumen (ver decisión 5).
- Atribución de TMDB en la app ("This product uses the TMDB API but is not endorsed
  or certified by TMDB"), obligatoria según sus condiciones.
- Copias de seguridad automáticas verificadas y algo de monitorización (al menos que
  el healthcheck avise si cae).

## Deuda conocida (no arreglar ahora, pero no empeorarla)

- **Fotos huérfanas**: borrar una puntuación o quitar una foto de una galería no
  borra el archivo de `UPLOADS_DIR`. Una futura tarea de limpieza (o el panel de
  administración) podría purgar los archivos que no aparezcan en ninguna fila. No
  borrar archivos automáticamente en este rework: una foto puede estar referenciada
  en varios sitios (galería de la nota y campos de galería).

## Fuera de alcance (ideas futuras ya habladas, no construir ahora)

Sección social / compartir notas, modo standalone sin servidor (local-first),
login con Google, recuperar contraseña (necesaria antes de abrirla al público, ver
arriba), exportar/importar (Markdown/JSON), panel de administración. Conviene no cerrarles la puerta en la arquitectura, pero
no implementar nada de esto en el rework.
