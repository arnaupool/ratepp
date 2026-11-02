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

## Arquitectura objetivo

```
iPhone (PWA instalada desde Safari)
        │  HTTPS  (Tailscale: https://<máquina>.<tailnet>.ts.net)
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

**[DECISIÓN 3] HTTPS** — Necesario: el service worker de la PWA y "Usar mi ubicación
actual" (geolocalización) solo funcionan en contexto seguro. Recomendado:
**`tailscale serve`** en el servidor, que da `https://<máquina>.<tailnet>.ts.net` con
certificado válido y solo accesible dentro de la tailnet. Documentar el comando
exacto para Unraid en el README. Por HTTP en LAN la app debe seguir funcionando,
solo sin esas dos cosas.

**[DECISIÓN 4] URLs de las fotos** — Hoy se guardan absolutas con `PUBLIC_URL`
(p. ej. `http://192.168.1.50:4000/uploads/abc.jpg`). Servidas en una página HTTPS,
esas URLs HTTP se bloquean (contenido mixto) y además se rompen si se accede por
otro host (IP de LAN vs. nombre de Tailscale). Recomendado:
- El frontend **normaliza al leer**: cualquier URL cuya ruta sea `/uploads/<archivo>`
  se convierte en la ruta relativa `/uploads/<archivo>`. Las URLs externas
  (pósters de TMDB/RAWG/Open Library, HTTPS) se dejan tal cual.
- Las subidas nuevas devuelven la ruta relativa (`/uploads/<archivo>`).
- `GET /api/color` debe aceptar también rutas relativas (hoy hace `new URL(url)`,
  que falla con relativas).
- No reescribir los datos existentes en la BD mientras la app Expo siga en uso.
  Cuando se retire, se puede añadir una migración que quite el host de
  `scores.photo_urls` y de los valores de campos `gallery`/`photo`.

**[DECISIÓN 5] Mapas** — Recomendado: **Leaflet** (react-leaflet) con teselas de
OpenStreetMap, y geocodificación con **Nominatim a través del backend**
(`/api/geo/search`, `/api/geo/reverse`, ver doc 02). Sin claves ni costes.
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
- Añadir `app.set('trust proxy', 'loopback')` (o lo adecuado) si va detrás de
  `tailscale serve`, para que el rate limit vea IPs reales.
- README actualizado: cómo desplegar en Unraid/Portainer, cómo activar HTTPS con
  Tailscale, cómo instalar en el iPhone ("Compartir → Añadir a pantalla de inicio").

## Plan por fases

Cada fase termina con la app funcionando y sus criterios verificados.

| Fase | Alcance | Criterios de aceptación |
|---|---|---|
| 0. Base | Copia de seguridad documentada. `web/` con Vite+React+TS. Express sirve el build con fallback SPA. Docker multi-etapa. | `docker compose up --build` levanta todo; `/` sirve la web; `/api/*` y `/uploads/*` siguen respondiendo igual que antes. |
| 1. Esqueleto | Tokens de color, Poppins autoalojada, tema claro/oscuro, router, Acceder (login/registro/me), cerrar sesión. | Registro, login, sesión persistente tras recargar, 401 → login. |
| 2. Principal | Cabecera, búsqueda con debounce, chips de categoría, hoja de filtros (fechas animadas + etiquetas), rejilla de cards, badges/stack, FAB, menú lateral con icono animado, estados vacío/error. | Mismos resultados que la app móvil con los mismos datos reales. |
| 3. Detalle (lectura) | Hero + miniaturas, lightbox con zoom, notas, campos de todos los tipos (ubicación puede ser provisional), fondo `cardColor` con contraste, eliminar. | Puntuaciones existentes se ven completas, incluidas fotos antiguas con URL absoluta. |
| 4. Crear | Galería (subida + reordenar + portada), buscador de carátulas con pestañas independientes, categorías, píldoras, personas, 7 tipos de campo, color en vivo, guardar. | Crear con todos los tipos de campo y verla correcta en Detalle. |
| 5. Detalle (edición) | Guardado inmediato por acción con reversión en error, reordenar campos, título editable, color, diálogo de salida. | Cada edición persiste tras recargar; salir con un input a medias pregunta. |
| 6. Ubicación | `/api/geo/*`, selector de mapa, vista previa con navegación, pantalla Mapa de ubicaciones. | Elegir por búsqueda, por toque y por "mi ubicación" (en HTTPS). |
| 7. Resto | Categorías y etiquetas (borrado global), Ajustes (modo oscuro). | Borrar una etiqueta la quita de todas las notas. |
| 8. PWA y HTTPS | Manifest, iconos, service worker, `tailscale serve`, README. | Instalable en iPhone, abre a pantalla completa con su icono, funciona fuera de casa por Tailscale. |
| 9. Tests y cierre | Portar `e2e/test.js` (Playwright) a la web app; pasar en verde. Decidir con el usuario qué hacer con `mobile/`. | E2E completo en verde sin errores de consola. |

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

## Fuera de alcance (ideas futuras ya habladas, no construir ahora)

Sección social / compartir notas, modo standalone sin servidor (local-first),
login con Google, recuperar contraseña, exportar/importar (Markdown/JSON),
panel de administración. Conviene no cerrarles la puerta en la arquitectura, pero
no implementar nada de esto en el rework.
