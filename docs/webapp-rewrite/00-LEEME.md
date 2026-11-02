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
- El usuario accede desde fuera de casa por **Tailscale**.

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

## Prompt sugerido para el modelo

> Vas a reconstruir la app "Puntuaciones" como una web app PWA autoalojada.
> Lee primero todos los documentos de `docs/webapp-rewrite/` en orden, después
> `project/Puntuaciones App.dc.html`, y usa `mobile/src/` como referencia de
> comportamiento y medidas exactas. Reutiliza `backend/` sin romper su API.
> Trabaja por las fases del documento 04, y al final de cada fase verifica los
> criterios de aceptación de esa fase. Si algo es ambiguo, pregunta antes de
> implementar. La interfaz está en español: copia los textos tal cual.

## Decisiones que el usuario puede querer revisar antes de empezar

Están marcadas como **[DECISIÓN]** en el doc 04. Las recomendaciones por defecto
ya están elegidas; solo hay que cambiarlas si el usuario lo pide.
