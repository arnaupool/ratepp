# 05 — Decisiones tomadas al empezar

Respuestas del usuario a las dudas abiertas antes de la fase 0 (2026-11-02).
Prevalecen sobre los docs 01–04 donde se contradigan.

1. **Despliegue actual**: en ANAS no hay ninguna instancia con datos de valor.
   Se mantienen igualmente todas las reglas de compatibilidad (volúmenes
   `pgdata`/`uploads`, servicio `api`, app Expo funcionando contra el backend).
2. **Entorno de pruebas**: Postgres embebido (`embedded-postgres`) en local para
   desarrollo y e2e; la imagen Docker se verifica en una pila aislada
   `puntuaciones-test` en ANAS (volúmenes y puerto propios), que se borra al final.
3. **Rama**: `webapp-rewrite`, con push a GitHub al terminar cada fase. Nunca `main`.
4. **`GET /api/thumb` es público**, igual que `/uploads`: un `<img>` no puede
   mandar `Authorization: Bearer`. Solo sirve archivos de `UPLOADS_DIR`, con
   protección contra path traversal y rate limit por IP. (Sustituye a "auth" en
   doc 02 y doc 04.)
5. **Botón volver del hero en Detalle**: como `mobile/`, círculo oscuro
   `rgba(0,0,0,.55)` con flecha blanca. Editar y eliminar siguen blancos al 85 %.
6. **Diálogos de confirmación** (eliminar, "¿Guardar los cambios?", borrar
   categoría/etiqueta): hoja que sube desde abajo, como `mobile/`, no un diálogo
   centrado.
7. **Mapa de ubicaciones sin datos**: mapa centrado en **València**
   (39.4699, -0.3763) con el texto "Todavía no has guardado ninguna ubicación en
   tus puntuaciones." encima. El selector de ubicación también arranca en
   València. (Sustituye a "centrado en Madrid".)

## Notas de implementación (desviaciones respecto a los docs 01–04)

- **URLs de imagen**: se normalizan al pintar (`web/src/utils/images.ts`), no
  al leer de la API. Así nunca se escriben de vuelta en la BD URLs relativas
  (por ejemplo al reordenar fotos), que la app Expo no sabría mostrar.
- **CSP**: `style-src` admite `'unsafe-inline'` (WebKit inyecta una hoja de
  estilos para los `<select>` nativos). `script-src` sigue siendo solo
  `'self'`; el script de tema va en un archivo propio, sin hash ni nonce.
- **Selector de fecha**: calendario propio dentro de la hoja que sube (mes y
  año con `<select>` nativos, que en iOS abren la rueda), en vez de
  `<input type="date">`.
- **`AUTH_RATE_LIMIT_MAX`** (nueva, por defecto 30 como antes): solo para que
  la suite e2e pueda registrar un usuario por test.
- **Al borrar desde Detalle** se vuelve a la pantalla anterior (como
  `goBack()` en la app móvil): si se abrió desde el mapa, al mapa.
- **Ajustes** se adelantó a la fase 1 para poder probar el tema desde el
  principio.
- **Service worker** desactivado en el e2e salvo en la suite PWA: en WebKit,
  los stubs de red de Playwright no ven el tráfico que pasa por el SW. La
  recarga sin conexión se comprueba solo en Chromium (el WebKit de Playwright
  en Windows aborta cualquier navegación offline); hay que verificarla a mano
  en el iPhone.
- **Layout de escritorio** (pedido por el usuario el 2026-11-02, sustituye a
  "no hace falta un layout de escritorio" del doc 03): por debajo de 600 px
  nada cambia. Desde 600 px, Principal usa una rejilla automática (hasta
  1200 px de ancho) y los formularios van en columna centrada (760 px).
  Desde 900 px, Detalle va en dos columnas (fotos | información) y las hojas
  se muestran como diálogos centrados. Reglas en `web/src/styles/desktop.css`.
- **Teselas de OSM**: llevan `referrerPolicy="strict-origin-when-cross-origin"`
  (envían el origen de la app). Con la política global `same-origin` salían
  sin `Referer` y OSM respondía "Access blocked".

## App Expo retirada (2026-11-02)

- `mobile/` y `e2e/test.js` se borran; la última versión queda en la etiqueta
  git `expo-final`.
- `POST /api/uploads` devuelve la ruta relativa `/uploads/<archivo>`. La
  migración 005 quita el host de las URLs propias ya guardadas (portadas,
  campos `gallery` y `photo`), sin tocar pósters externos ni el orden.
- Fuera CORS, `PUBLIC_URL` y el Dockerfile solo-API de `backend/`.
- Tarjetas nuevas (migración 006 amplía el CHECK de `score_fields.type`):
  `price` `{ amount, currency, per: 'person'|'total', people }`,
  `criteria` `[{ name, value 1-10 }]`, `duration` (minutos), `link`
  `{ url, title }` (solo http/https se muestran como enlace), `boolean`,
  `ingredients` `{ servings, items: [{ qty, unit, name }] }` (en Detalle se
  pueden recalcular las cantidades para otras raciones), `steps` (lista
  numerada) y `difficulty` (1 fácil, 2 media, 3 difícil). Formas y lectores
  tolerantes en `web/src/utils/fields.ts`.
