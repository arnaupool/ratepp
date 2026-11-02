# 03 — Diseño

Fuente original: `project/Puntuaciones App.dc.html` (prototipo HTML/CSS). Al ser
web, **los estilos se pueden portar casi literalmente** desde ahí, incluido
`oklch()` (los navegadores modernos lo soportan; la app nativa tenía que convertirlo
a hex). Donde la app actual difiere del prototipo, manda la app actual
(`mobile/src/`), porque recoge cambios pedidos por el usuario después.

La app es **mobile-first** (se usará casi siempre en iPhone instalada como PWA).
En pantallas anchas, centrar una columna de ~430 px de ancho máximo; no hace falta
un layout de escritorio.

## Colores

Definir como variables CSS en `:root` y redefinirlas en modo oscuro
(`[data-theme="dark"]`). El modo lo elige el usuario en Ajustes (no seguir el del
sistema por defecto; por defecto claro).

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--bg` | `oklch(0.97 0.014 75)` | `oklch(0.17 0.014 75)` | fondo de pantalla |
| `--surface` | `oklch(0.99 0.006 65)` | `oklch(0.23 0.014 70)` | tarjetas, inputs, hojas |
| `--ink` | `oklch(0.22 0.02 40)` | `oklch(0.94 0.01 60)` | texto principal |
| `--sub` | `oklch(0.48 0.02 40)` | `oklch(0.80 0.015 60)` | texto secundario, labels |
| `--accent` | `oklch(0.62 0.17 42)` | `oklch(0.68 0.17 42)` | botones, selección, FAB |
| `--accent2` | `oklch(0.66 0.15 85)` | `oklch(0.72 0.14 85)` | fondo de iconos de campo |
| `--accent-ink` | `#fff` | `#fff` | texto sobre acento |
| `--line` | `oklch(0.88 0.02 50)` | `oklch(0.34 0.02 60)` | bordes |
| `--fab-shadow` | `oklch(0.62 0.17 42 / .55)` | `oklch(0.68 0.17 42 / .55)` | sombra del FAB |
| `--extra-badge` | `rgba(0,0,0,.55)` | igual | badge "+N" |
| error | `#c0392b` | igual | mensajes de error |

> `--sub` oscuro se subió de 0.68 a 0.80 a petición del usuario: en su iPhone el gris
> se leía mal. No volver a bajarlo.

### Tinte de card por categoría (cuando no hay `cardColor`)
Según la primera categoría de la puntuación:

| Categoría | Claro | Oscuro |
|---|---|---|
| Restaurantes | `oklch(0.92 0.045 40)` | `oklch(0.30 0.045 40)` |
| Películas | `oklch(0.92 0.035 265)` | `oklch(0.30 0.035 265)` |
| Recuerdos | `oklch(0.92 0.045 160)` | `oklch(0.30 0.045 160)` |
| cualquier otra / ninguna | `oklch(0.92 0.02 50)` | `oklch(0.30 0.02 50)` |

### Color de la nota (1–10)
`n` vacío → `oklch(0.78 0.01 70)`. Si no: `t = (n-1)/9`, `hue = 18 + t*125`,
color = `oklch(0.52 0.15 hue)` (rojo en 1 → verde en 10). Texto del badge blanco.
Igual en claro y oscuro.

### Placeholder de foto (franjas)
Para cards/hero sin foto. `seed = hash(id) % 97` (hash: `h = (h*31 + charCode) >>> 0`).
`hue = 30 + (seed*47) % 330`. Dos colores alternos en 6 franjas diagonales:
claro `oklch(0.88 0.05 hue)` / `oklch(0.92 0.03 hue)`;
oscuro `oklch(0.32 0.06 hue)` / `oklch(0.26 0.04 hue)`.
En CSS: `repeating-linear-gradient` diagonal (el prototipo ya lo hace así).

### Color de card personalizado
Muestras predefinidas (pasteles):
`#f6c9c9 #f6ddb8 #f3ecb0 #cfe8b8 #b9e3d0 #b9e0e8 #bcd4f0 #c9c3ee #e2c3ee #eec3dc`.
Selector = fila de círculos de 34 px: primero "AUTO" (borde discontinuo, vuelve a
`null`), luego el sugerido de la foto (icono 📷) si existe, luego las muestras.
Seleccionado = borde 2.5 px color acento.

**Suavizado del color sugerido** (`pastelize`): pasar a HSL, conservar el tono,
saturación limitada a [0.25, 0.55], luminosidad fija 0.88.

**Contraste del texto sobre color personalizado** (importante, era un bug real: en
modo oscuro el texto blanco no se leía sobre una card pastel). Cuando un texto va
directamente sobre `cardColor` (título de la card en Principal; título, labels,
nombres de personas, sección de color… en Crear/Detalle), no usar `--ink`/`--sub`
del tema sino calcularlo con la luminancia relativa WCAG del fondo:
- luminancia > 0.5 → ink `#241f1a`, sub `rgba(36,31,26,.68)`
- si no → ink `#f7f4f0`, sub `rgba(247,244,240,.75)`

Solo se aplica cuando hay `cardColor`; con el fondo por defecto se usan los tokens
del tema. Los elementos que tienen su propio fondo (`surface`) no cambian.

## Tipografía

**Poppins** (Google Fonts), pesos 600, 700, 800, 900. Autoalojarla en el propio
servidor (la app debe funcionar sin depender de Google en la red local).

| Estilo | Peso | Tamaño (px) | Extra |
|---|---|---|---|
| Título de pantalla | 900 | 26 / lh 29 | |
| Título de login | 900 | 25 | |
| Título en Detalle | 900 | 20 | |
| Input de título (Crear) | 900 | 24 | |
| Título de hoja | 900 | 17 | |
| Label de sección ("FOTOS", "NOTA *") | 900 | 14 | mayúsculas, tracking 0.6 |
| Título de card | 800 | 13.5 / lh 17 | |
| Label de campo / login | 800 | 11–11.5 | mayúsculas, tracking 0.5 |
| Botón principal | 800 | 15 | |
| Chip | 700 | 12.5 / lh 16 | |
| Chip de categoría en card | 700 | 10 | |
| Nombre de persona | 700 | 10.5 | |
| Valor de campo / texto | 600 | 14–14.5 | |
| Badge de nota | 900 | 11 (mini) / 13 / 16 (≥38 px) | |

Tabla completa en `mobile/src/theme/typography.js`.

## Formas y medidas clave

- Radios: inputs y botones 14, cards 20, hojas 26 (solo esquinas superiores),
  chips 999.
- Card de Principal: radio 20, `overflow: hidden`, foto 4:3, cuerpo con padding
  11–13 px, separación 12 px en la rejilla, márgenes laterales 16 px.
- Chips: altura fija con contenido centrado (no depender del padding vertical: se
  aplastaban).
- Píldoras 1–10: 10 círculos en una fila, `flex: 1`, `aspect-ratio: 1`, gap 5,
  borde 1.5 `--line`.
- Badges de nota: círculos con el color de la nota; los mini (24 px) se solapan
  -9 px con borde 2 px color `--surface`.
- FAB: 56 px, abajo 26, derecha 18.
- Botones flotantes del hero: 34 px, fondo `rgba(255,255,255,.85)`, iconos oscuros
  `#2a2a2a` de 16 px.

## Iconos

- Iconos de tipo de campo: el prototipo los dibuja con CSS puro (bordes y
  pseudo-elementos) — copiarlos tal cual desde `project/Puntuaciones App.dc.html`
  (clases `.ficon.t-*`). Referencia alternativa: `mobile/src/components/FieldIcon.js`.
- Editar / borrar: iconos de línea tipo Feather (`edit-2`, `trash-2`). Se cambiaron
  de emojis a petición del usuario. Lucide o Feather en SVG valen.
- El resto de iconos de la UI pueden seguir siendo los caracteres/emoji actuales
  (⌕, ✕, ›, 📍, 🗺️…).

## Animaciones

| Elemento | Animación |
|---|---|
| Hojas inferiores | fondo fundido 180 ms; panel sube desde abajo 240 ms `cubic-bezier` ease-out; cierre 150/180 ms ease-in |
| Selector de fecha | igual que una hoja (sube desde abajo). **No** un fundido rápido. |
| Menú lateral | panel desde la izquierda + fondo, ambos 240 ms ease-out (cierre 180 ms ease-in), sincronizados |
| Icono hamburguesa | se transforma en X (barra 1 baja 6.5 px y rota 45°, barra 2 se desvanece, barra 3 sube 6.5 px, rota -45° y pasa de 12 a 20 px de ancho), misma duración que el menú |
| Añadir/quitar elementos (chips, campos, filas) | transición suave de layout (en web: View Transitions o una librería ligera tipo auto-animate) |
| Lightbox | entrada con escala + fundido |
| Cambio de pantalla | deslizamiento desde la derecha estilo iOS (opcional) |

Respetar `prefers-reduced-motion`.

## Detalles iOS / PWA a cuidar

- Áreas seguras: `env(safe-area-inset-*)` en cabeceras, FAB y hojas (el hero de
  Detalle llega hasta arriba, con los botones desplazados por el inset superior).
- `<meta name="theme-color">` acorde al tema; barra de estado translúcida.
- Inputs con `font-size` ≥ 16 px en móvil para que iOS no haga zoom al enfocar (o
  equivalente), sin romper la jerarquía visual.
- Sin rebote/scroll horizontal accidental en la página.
