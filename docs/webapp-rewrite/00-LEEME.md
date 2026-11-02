# Rework de Puntuaciones: de app Expo a web app autoalojada

Esta carpeta es el encargo completo para reconstruir **Puntuaciones** como una
**web app (PWA) que se sirve desde el propio servidor del usuario**, sustituyendo
la app de React Native/Expo de `mobile/`. El objetivo es que el resultado sea
**funcionalmente la misma aplicación**: mismas pantallas, mismos datos, mismo
diseño, mismo comportamiento. No es un rediseño.

## Por qué se hace

- Con Expo, en iOS la app solo se puede compartir dentro de Expo Go (un "hub" de
  apps) o pagando la Apple Developer Account (99 €/año). Una PWA se instala desde
  Safari con "Añadir a pantalla de inicio" y queda como app independiente, con su
  icono, gratis.
- El backend ya vive en el servidor del usuario (Unraid, Docker/Portainer). Si el
  frontend también se sirve desde ahí, todo queda en un único despliegue.
- Hoy el usuario accede desde fuera de casa por **Tailscale**, pero en el futuro
  puede querer abrir la app a más usuarios en internet con un dominio propio. La
  arquitectura no debe depender de Tailscale (ver doc 04).

## Documentos (léelos en este orden)

| Archivo | Contenido |
|---|---|
| `01-producto-y-pantallas.md` | Especificación funcional: cada pantalla, cada interacción, textos exactos de la UI, casos límite. |
| `02-api-y-datos.md` | Esquema de base de datos y contrato completo de la API REST existente. |
| `03-diseno.md` | Sistema visual: colores (claro/oscuro), tipografía, componentes, animaciones. |
| `04-arquitectura-y-plan.md` | Stack propuesto, despliegue, PWA/HTTPS, mapas, plan por fases, criterios de aceptación y errores ya cometidos que no hay que repetir. |

## Referencias que ya están en el repo

- `mobile/` — la app actual (React Native/Expo). **Es la referencia de verdad** para
  cualquier medida, espaciado o comportamiento que estos documentos no detallen.
  Leer el componente equivalente antes de implementar cada pieza.
- `backend/` — API Node/Express + PostgreSQL. Se **reutiliza** (ver doc 04).
- `project/Puntuaciones App.dc.html` — el prototipo de diseño original en HTML/CSS.
  Al ser web, muchos estilos se pueden portar casi directamente desde aquí.
- `chats/chat1.md` — conversación de diseño original (intención del producto).
- `e2e/test.js` — test end-to-end con Playwright del flujo completo. Sirve como
  checklist de comportamiento y debe adaptarse a la nueva web app.

## Prompt para el modelo

Copiar y pegar tal cual al iniciar el trabajo:

```
Vas a reconstruir mi app "Puntuaciones" como una web app (PWA) que se sirve desde mi
propio servidor, sustituyendo la app actual de React Native/Expo. Debe ser la misma
aplicación (mismas pantallas, datos, diseño y comportamiento) en formato web, no un
rediseño.

Repositorio: https://github.com/arnaupool/ratepp (rama main)

## Antes de escribir código
1. Lee, en este orden y completos, los documentos de `docs/webapp-rewrite/`:
   00-LEEME.md, 01-producto-y-pantallas.md, 02-api-y-datos.md, 03-diseno.md,
   04-arquitectura-y-plan.md.
2. Lee `project/Puntuaciones App.dc.html` (el prototipo de diseño original en HTML/CSS).
3. Echa un vistazo a `mobile/src/` y `backend/src/`: `mobile/` es la referencia de
   verdad para cualquier medida o comportamiento que los docs no detallen, y
   `backend/` se reutiliza.
4. Antes de empezar, dime en pocas líneas qué has entendido y pregúntame lo que no
   esté claro. El doc 04 tiene 6 decisiones marcadas como [DECISIÓN] con la
   recomendación ya elegida; si alguna te parece mal, dímelo ahora.

## Reglas de trabajo
- Trabaja en una rama nueva `webapp-rewrite`, nunca directamente en `main`: mi
  servidor despliega desde main y no puede romperse mientras tanto.
- Sigue las fases del doc 04 en orden. Al terminar cada fase:
  verifica sus criterios de aceptación, haz commit, y dame un resumen corto de qué
  has hecho, qué has probado y cómo puedo probarlo yo. Espera mi OK antes de pasar
  a la siguiente fase.
- No pierdas datos: tengo puntuaciones y fotos reales en producción. No renombres los
  volúmenes de Docker (`pgdata`, `uploads`) ni el proyecto de compose. Cualquier
  cambio en el backend tiene que ser compatible hacia atrás: la app Expo actual debe
  seguir funcionando contra el mismo backend hasta que yo diga que se retira.
- No borres `mobile/` ni toques `main` sin preguntarme.
- La interfaz está en español: copia los textos de los docs tal cual.
- Si algo es ambiguo o los docs se contradicen con el código, pregunta en vez de
  suponer.
- Pruébalo de verdad: además de compilar, ejecuta la app y el test e2e (Chromium y
  WebKit con perfil de iPhone). Si algo falla, dímelo con el error, no lo escondas.
- Yo lo voy a usar en un iPhone, instalado como PWA desde Safari. Ten eso en mente
  en cada decisión.

## Contexto de mi servidor
Unraid con Docker/Portainer, Postgres y la API ya desplegados con el
`docker-compose.yml` del repo. Hoy accedo desde fuera de casa por Tailscale, pero
en el futuro puede que quiera abrir la app a más usuarios en internet con un
dominio propio. Nada debe depender de Tailscale: la app tiene que funcionar detrás
de cualquier proxy inverso con HTTPS, y lo que dependa del entorno va por variables
de entorno (ver doc 04, "Preparado para abrirse a más usuarios").
```

## Decisiones que el usuario puede querer revisar antes de empezar

Están marcadas como **[DECISIÓN]** en el doc 04. Las recomendaciones por defecto
ya están elegidas; solo hay que cambiarlas si el usuario lo pide.
