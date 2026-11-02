# 01 — Producto y pantallas

## Qué es

Una app personal para **puntuar cualquier cosa del 1 al 10** (restaurantes,
películas, recuerdos, juegos, libros…). Cada "puntuación" (también llamada
"nota" en la UI) tiene:

- un **título**,
- una **galería de fotos** ordenada (la primera es la portada),
- **categorías** (varias, texto libre),
- **tu nota** del 1 al 10 (obligatoria),
- **notas de otras personas** opcionales (nombre + nota 1–10 cada una),
- **campos dinámicos** opcionales, ordenables, de 7 tipos,
- un **color de card** opcional.

Cada usuario solo ve sus propias puntuaciones. No hay parte social (todavía).

Idioma de la interfaz: **español**. Los textos entre comillas de este documento
son literales y deben copiarse tal cual.

## Tipos de campo dinámico

| id (API) | Nombre en UI | Valor guardado (`value`, JSON) | Edición | Visualización en Detalle |
|---|---|---|---|---|
| `text_long` | "Texto" | `string` | textarea multilínea, placeholder "Escribe tus notas..." | texto |
| `number` | "Número" | `string` (ej. `"24.50"`) | input numérico decimal, placeholder "Ej. 24.50" | texto |
| `date` | "Fecha" | `"YYYY-MM-DD"` o `null` | selector de fecha nativo | "14 de junio de 2026" (meses en español, minúscula) |
| `location` | "Ubicación" | `{ "label": string, "lat": number, "lng": number }` o `null` | botón "📍 Elegir ubicación en el mapa" → picker de mapa | mini mapa con chincheta + etiqueta + botón "Abrir navegación" |
| `gallery` | "Galería" | `string[]` (URLs) | miniaturas + "Añadir foto" + quitar (✕) | miniaturas; tocar abre el visor a pantalla completa |
| `list` | "Lista de ítems" | `string[]` | un input por ítem, placeholder "Añade un ítem...", botón "+ Añadir ítem" | "— ítem" por línea |
| `tag` | "Etiqueta" | `string[]` | autocompletado multiselección (ver abajo) | chips |

Notas:
- La API acepta también el tipo heredado `photo` (valor `string`), que ya no se
  ofrece al crear. Si aparece en datos antiguos, mostrarlo como una galería de 1.
- Datos antiguos pueden tener un campo `tag` con valor escalar (string) en vez de
  array: tolerarlo (tratarlo como `[valor]`), nunca romper.
- Cada campo tiene una **etiqueta editable** (por defecto el nombre del tipo, p. ej.
  "Fecha"; el usuario puede cambiarla a "Fecha de la visita").
- Valor por defecto al añadir: list → `[""]`, gallery → `[]`, tag → `[]`,
  date → `null`, location → `null`, resto → `""`.

## Navegación

```
No autenticado:  Acceder
Autenticado:     Principal ─┬─ Crear puntuación ──(guardar)──> Detalle (reemplaza Crear en el historial)
                            ├─ Detalle
                            └─ Menú lateral ─┬─ Mapa de ubicaciones ──> Detalle
                                             ├─ Categorías y etiquetas
                                             ├─ Ajustes
                                             └─ Cerrar sesión
```

En web: cada pantalla tiene su ruta (sugerencia: `/login`, `/`, `/nueva`,
`/p/:id`, `/mapa`, `/etiquetas`, `/ajustes`). El botón atrás del navegador y el
gesto de volver de iOS deben funcionar. Transición entre pantallas: deslizamiento
desde la derecha (como iOS), sin que sea obligatorio si complica.

Al arrancar: si hay token guardado, llamar a `GET /api/auth/me`; si responde bien,
entrar directo a Principal; si falla, borrar el token e ir a Acceder. Mientras se
comprueba, mostrar un spinner centrado con el color de acento.

---

## Pantalla 1 — Acceder (login / registro)

Un único formulario con dos modos que se alternan.

- Logo: cuadrado redondeado 60×60, radio 18, fondo acento, letra "P" blanca.
- Título: "Bienvenido de nuevo" / "Crea tu cuenta".
- Subtítulo: "Accede para ver tus puntuaciones" / "Empieza a puntuar lo que quieras".
- Campos: "Email" (placeholder "tucorreo@email.com"), "Contraseña" ("••••••••"),
  y solo en registro "Confirmar contraseña".
- Botón principal: "Iniciar sesión" / "Crear cuenta" (spinner mientras envía).
- Enlace inferior: "¿No tienes cuenta? **Regístrate**" / "¿Ya tienes cuenta? **Inicia sesión**".
- Validaciones en cliente: vacío → "Introduce tu email y contraseña"; en registro,
  contraseñas distintas → "Las contraseñas no coinciden". Errores del servidor se
  muestran tal cual (texto rojo `#c0392b`, centrado).
- Registro: no hay campo nombre; el nombre se deriva de la parte local del email
  (`ana@x.com` → `ana`).

- Si el servidor no responde (sin red o sin acceso al servidor): mensaje claro
  "No se puede conectar con el servidor", nunca un spinner infinito.
- Si el servidor tiene el registro desactivado (`ALLOW_REGISTRATION=false`, ver doc
  04), ocultar el enlace "Regístrate" y el modo registro.

> La app móvil tenía aquí una sección plegable "Configurar servidor" (IP + puerto).
> **En la web app no hace falta**: el frontend se sirve desde el mismo servidor que
> la API, así que la API siempre es el mismo origen. Eliminar esta funcionalidad
> (también de Ajustes).

## Pantalla 2 — Principal ("Tus puntuaciones")

De arriba abajo:

1. **Cabecera**: botón hamburguesa (3 barras, la tercera más corta: 20/20/12 px de
   ancho, 2.5 de alto) + título "Tus puntuaciones". Al abrir el menú, el icono se
   transforma en una X sincronizado con la animación del menú.
2. **Fila de búsqueda**:
   - Caja con icono "⌕", placeholder "Buscar por título, texto, fecha, categoría o
     etiqueta...", botón ✕ para limpiar cuando hay texto ("Borrar búsqueda").
   - Búsqueda con debounce de 300 ms; la hace el servidor (`search=`).
   - Botón cuadrado de **Filtros** a la derecha, con un punto/contador cuando hay
     filtros activos (cuenta: etiqueta = 1, rango de fechas = 1).
3. **Fila de chips de categoría**, scroll horizontal: "Todas" + las categorías del
   usuario (`GET /api/categories`). Selección única. Altura fija de chip (no deben
   aplastarse nunca — fue un bug recurrente). Debe haber separación clara (≈14 px)
   entre esta fila y la rejilla.
4. **Rejilla de 2 columnas** de cards, ordenadas por fecha de creación (más
   recientes primero).
5. **Botón flotante "+"** abajo a la derecha (56×56, círculo, acento, sombra del
   acento) → Crear puntuación.

Se recarga la lista cada vez que la pantalla vuelve a estar visible (al volver de
Detalle o Crear).

### Card de puntuación
- Fondo: `cardColor` si existe; si no, el tinte de su primera categoría (ver doc 03).
- Foto de portada arriba, relación 4:3. Sin foto → placeholder de franjas
  diagonales generado a partir del id (ver doc 03).
- Cuerpo: título (máx. 2 líneas) y, a la derecha:
  - 1 nota → badge circular de 30 px con el número;
  - varias → badges mini (24 px) solapados, máx. 2 visibles + badge gris "+N".
- Debajo, chips de sus categorías.
- Si hay `cardColor`, el color del título se elige por contraste (ver doc 03).
- Tocar → Detalle.

### Hoja "Filtros" (bottom sheet)
- Título "Filtros".
- Sección "Fecha": dos selectores "Desde" y "Hasta" lado a lado (filtran por
  campos de tipo fecha: `dateFrom`, `dateTo`).
- Sección "Etiquetas": chips de todas las etiquetas usadas (`GET /api/tags`),
  selección única (tocar otra vez deselecciona). Si no hay: "Todavía no has usado
  ninguna etiqueta."
- Botones: "Limpiar filtros" (texto) y "Listo" (botón acento).
- El selector de fecha se abre como **hoja que sube desde abajo** (no un fundido
  rápido — el usuario lo pidió explícitamente), con título "Elegir fecha — Desde"
  / "— Hasta" y botón "Listo".

### Estados
- Cargando: spinner.
- Error: "No se pudieron cargar tus puntuaciones".
- Vacío sin filtros: "Todavía no hay puntuaciones" + "Toca el botón + para puntuar
  tu primer restaurante, peli o recuerdo."
- Vacío con búsqueda/filtros: "No hay notas" + "Toca el botón + para crear una."

### Menú lateral
Panel desde la izquierda (ancho `min(300px, 80%)`) + fondo oscuro translúcido;
tocar fuera cierra. Panel y fondo animan con la **misma duración y curva**
(240 ms apertura, 180 ms cierre) para que se sienta un único movimiento.
Contenido: nombre del usuario (grande), email debajo, y los ítems:
"🗺️  Mapa de ubicaciones", "🏷️  Categorías y etiquetas", "⚙️  Ajustes",
"↩️  Cerrar sesión" (este último en color secundario).

## Pantalla 3 — Crear puntuación

Botón volver arriba a la izquierda. Formulario en scroll:

1. **Título**: input grande sin borde, placeholder "Título *".
2. **"Fotos"**: editor de galería (ver componente abajo).
3. **"Categorías"**: editor de categorías (ver abajo). Sugerencias = las 3 por
   defecto ("Restaurantes", "Películas", "Recuerdos") + todas las ya usadas.
4. **"Nota *"**: fila de 10 píldoras circulares 1–10; la seleccionada se rellena
   con el color de esa nota.
5. **"Nota adicional"**: editor de personas (ver abajo).
6. **Campos añadidos**, en orden, cada uno como fila editable.
7. **"Añadir campo"**: una fila de chips con los 7 tipos (icono + nombre); tocar
   añade el campo al final.
8. **"Color de la card"**: sección **plegada por defecto**; al abrirla, selector de
   color (ver abajo). Al elegir color, **el fondo de la pantalla cambia en vivo**.
   Igual que en Detalle, cuando cambia la portada (primera foto de la galería) se
   pide la sugerencia de color y aparece el círculo "📷" (ver "Sugerencia de color"
   en Pantalla 4).
9. Error (si lo hay) en rojo.
10. Botón "Guardar puntuación".

Al guardar:
- Validaciones: título vacío → "El título es obligatorio"; sin nota → "La puntuación
  (1-10) es obligatoria"; fotos aún subiéndose → "Espera a que terminen de subirse
  las fotos".
- `POST /api/scores` con todo; al terminar, navegar a Detalle **reemplazando** la
  pantalla de Crear en el historial (atrás desde Detalle vuelve a Principal).
- Las fotos se suben en cuanto se eligen (`POST /api/uploads`), no al guardar.
  En el payload van ya como URLs.
- Personas con el nombre vacío se envían como "Invitado". (El servidor descarta en
  silencio cualquier persona sin nota válida 1–10.)

## Pantalla 4 — Detalle

### Modo lectura (por defecto)
- **Hero**: foto de portada a todo el ancho, 4:3 (o franjas si no hay foto).
  Tocar abre el visor a pantalla completa. Encima, botones flotantes circulares
  (34 px, fondo blanco 85 %): volver (izquierda), editar (lápiz) y eliminar
  (papelera) a la derecha, uno debajo del otro. Iconos vectoriales finos tipo
  Feather `edit-2` / `trash-2`, no emojis.
- Si hay >1 foto: fila de miniaturas cuadradas debajo; tocar una la pone como foto
  activa del hero, mantener pulsado la abre en el visor; las no activas con
  opacidad 0.6.
- Título, chips de categorías.
- "Tu puntuación" con badge de 40 px.
- "Nota adicional": personas con nombre pequeño encima y badge de 44 px, o
  "Nadie más ha puntuado esto todavía."
- Tarjeta de campos (fondo `surface`): cada campo con icono del tipo en un
  cuadrito de color `accent2`, etiqueta en mayúsculas pequeñas y su valor.
- El fondo de toda la pantalla es el `cardColor` si existe.
- Nada es editable en este modo.

### Modo edición (botón lápiz)
- La cabecera se sustituye por un bloque con fondo `surface`: botón volver, botón
  "Listo" (sale de edición) y "Fotos" con el editor de galería.
- Título editable (se guarda al perder el foco).
- Editor de categorías, píldoras 1–10 para tu nota, editor de personas.
- Filas de campo editables (etiqueta, valor, subir/bajar, quitar) + fila de chips
  para añadir campos.
- Sección plegada "Color de la card"; cambia el fondo en vivo y se guarda al momento.
- **Cada cambio se guarda inmediatamente** contra la API (no hay botón guardar):
  textos al perder el foco, el resto al tocar. Si una llamada falla, revertir el
  cambio local y mostrar el error (lista de mensajes en el código: "No se pudo
  guardar el campo", "No se pudo reordenar", etc.).
- **Salir con cambios a medias**: si el usuario intenta salir (atrás) estando en
  modo edición, mostrar el diálogo "¿Guardar los cambios?" con "Guardar"
  (confirma el input con foco y sale), "Descartar" (sale sin guardar lo pendiente)
  y "Cancelar". En web esto es: interceptar la navegación atrás del router y el
  gesto de volver.
- Añadir persona la crea al momento en el servidor ("Nuevo", nota 5); renombrar se
  guarda al perder el foco (vacío → "Invitado").

### Eliminar
Diálogo "¿Eliminar esta puntuación?" / "Se borrará para siempre, junto con sus fotos
y campos. No se puede deshacer." con "Cancelar" / "Eliminar" ("Eliminando..."
mientras borra). Al terminar vuelve a Principal.

### Sugerencia de color
Cuando cambia la portada (`photoUrls[0]`), pedir `GET /api/color?url=…`; si
devuelve color, el selector muestra un círculo extra "📷" con ese color suavizado
a pastel (ver doc 03). Es solo una sugerencia; nunca se aplica sola.

## Pantalla 5 — Mapa de ubicaciones
- Título "Mapa de ubicaciones" + volver.
- Mapa con una chincheta por cada campo de ubicación de todas las puntuaciones
  (`GET /api/scores/locations`). Tocar la chincheta abre un globo con portada,
  título y nota media; tocar el globo → Detalle.
- Encuadre inicial: que quepan todas las chinchetas. Sin datos: centrado en Madrid
  (40.4168, -3.7038).
- Error: "No se pudieron cargar las ubicaciones".

## Pantalla 6 — Categorías y etiquetas
- Secciones "Categorías" y "Etiquetas", cada una con una lista de filas (texto +
  icono papelera). Vacías: "No tienes categorías todavía." / "No tienes etiquetas
  todavía."
- Borrar pide confirmación: título `¿Eliminar "X"?`, mensaje "Está siendo usada por
  una o más notas. Se quitará de todas ellas. No se puede deshacer."
- Borrar quita la categoría/etiqueta de **todas** las puntuaciones
  (`DELETE /api/categories/:name`, `DELETE /api/tags/:name`) y desaparece de la
  lista con animación.
- Mantener el nombre visible en el diálogo durante su animación de cierre (bug
  antiguo: mostraba "Eliminar 'undefined'").

## Pantalla 7 — Ajustes
- "Modo oscuro": interruptor. Se guarda en el dispositivo (localStorage) y se aplica
  al instante en toda la app.
- (Eliminar la sección "Servidor", ver Pantalla 1.)

---

## Componentes compartidos

### Editor de galería de fotos
- Fila horizontal de miniaturas. La primera lleva la insignia "PORTADA".
- Cada miniatura: ✕ para quitar ("Quitar foto"), flechas ‹ › para moverla a
  izquierda/derecha (deshabilitadas en los extremos). Mover a la primera posición la
  convierte en portada.
- Casilla "+" para subir desde el dispositivo (input file, `accept="image/*"`).
  Mientras sube, spinner en la casilla.
- Botón "Buscar carátula" → buscador de carátulas.

### Buscador de carátulas (hoja)
- Título "Buscar carátula", pestañas "Película" / "Serie" / "Videojuego" / "Libro";
  **cada pestaña conserva su propia búsqueda y resultados** al cambiar de una a otra.
- Input "Título..." + buscar; rejilla de pósters con título y año/autor.
- "Sin resultados" / "No se pudo buscar". Si el servidor no tiene la clave de API de
  esa fuente, la respuesta trae `note`; mostrarla.
- Elegir un póster lo añade al final de la galería. Botón "Cerrar".
- La hoja se encoge cuando aparece el teclado para que el input no quede tapado
  (en iOS Safari usar `visualViewport`).

### Editor de categorías
- Input "Escribe y pulsa enter para añadir..." + botón chevron ▾/▴.
- Plegado: solo se ven como chips las categorías **seleccionadas**. Desplegado: todas
  las sugerencias como chips; tocar alterna selección (seleccionada = fondo acento,
  texto blanco).
- Enter con texto añade una categoría nueva y la selecciona.

### Editor de personas ("Nota adicional")
- Fila de personas: nombre editable encima (inline, centrado, pequeño) + ✕ para
  quitar, y debajo su badge de nota (44 px). Tocar el badge selecciona a esa persona
  para editar su nota.
- Último elemento: círculo con borde discontinuo "+" y texto "Añadir".
- Con una persona seleccionada aparece debajo "Editando puntuación de {nombre}" y una
  fila de píldoras 1–10; el texto se actualiza mientras se renombra sin perder el foco.
- Al añadir una persona: nombre "Nuevo", nota 5. Si el usuario deja el nombre
  vacío, se guarda como "Invitado".

### Etiquetas (campo `tag`)
- Chips de las etiquetas añadidas (con ✕), input "Escribe una etiqueta y pulsa
  enter...", y un desplegable plegado por defecto con las etiquetas usadas
  anteriormente ("Ver etiquetas usadas anteriormente" / "Ocultar etiquetas usadas")
  para añadirlas de un toque.

### Selector de ubicación (hoja)
- Título "Elegir ubicación", input "Buscar dirección..." + botón 🔍 (geocodificación
  directa), botón "📍 Usar mi ubicación actual" (geolocalización del navegador).
- Mapa: tocar coloca la chincheta y hace geocodificación inversa para la etiqueta
  (calle, nombre, ciudad, región). Si falla: "lat, lng" con 5 decimales.
- Debajo, la etiqueta resultante. Botones "Cancelar" y "Confirmar ubicación".
- Los toques en el mapa deben ser deliberados (un arrastre no debe mover la
  chincheta — fue un bug: era demasiado sensible).

### Visor de fotos (lightbox)
- Pantalla completa negra, la foto ajustada, botón cerrar (✕ blanco sobre fondo
  oscuro, "Cerrar foto").
- Pellizcar para hacer zoom, doble toque para alternar zoom, arrastrar con zoom.
  Entrada con animación (escala + fundido).

### Diálogos y hojas
- Hojas inferiores: fondo con fundido (180 ms) + panel que sube (240 ms, ease-out
  cúbica); cierre 150/180 ms ease-in. Tocar el fondo cierra. Al abrir, cerrar el
  teclado.
- Diálogo de confirmación centrado: título, mensaje, "Cancelar" + acción en rojo.

### Comportamiento de teclado (móvil)
- Tocar fuera de un input cierra el teclado; hacer scroll también.
- Un input enfocado cerca del final de la pantalla no debe quedar tapado por el
  teclado (fue un bug real en Detalle y en Crear).
