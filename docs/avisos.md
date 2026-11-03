# Avisos: pedir su nota a los miembros del grupo

Decisiones del 2026-11-03. Estado: **implementado** (migración 010,
`backend/src/push.js`, `backend/src/routes/push.js`, pendientes en
`routes/scores.js`, `web/src/utils/push.ts`, `web/public/push-sw.js`).

Los miembros ya puntúan con su cuenta desde el Detalle de una nota de grupo
(docs/grupos.md, decisión 5). Lo que faltaba es que alguien les avise; sin
aviso, quien crea la nota acaba metiendo la de los demás en "Nota adicional".

## Decisiones

1. **Canal**: los dos. Pendientes dentro de la app (aviso en Principal, lista
   de pendientes, distintivo en la card) y notificación push opcional, que
   cada uno activa en Ajustes. En iPhone el push solo funciona con la app
   instalada en la pantalla de inicio (iOS 16.4 o posterior).
2. **Qué está pendiente**: una nota de un grupo tuyo, creada después de que
   entraras, en la que no tienes puntuación. "No la he probado" la quita de
   tus pendientes sin puntuarla.
3. **A quién**: a todos los miembros del grupo menos al autor.
4. **"Nota adicional"**: se queda como está.
5. **Eventos push**: solo "nota nueva en tu grupo". Otros avisos (alguien
   puntúa tu nota, te añaden a un grupo) quedan para más adelante.

## Cómo está hecho

- Migración 010: `score_dismissals (score_id, user_id)` para "No la he
  probado" y `push_subscriptions (user_id, endpoint, p256dh, auth)`, una por
  dispositivo.
- API: `GET /api/scores/pending-count`, `GET /api/scores?pending=1`, cada
  nota trae `pending` y `dismissed`, `POST/DELETE /api/scores/:id/dismiss`,
  `GET /api/push/key` y `POST/DELETE /api/push/subscription`.
- Claves VAPID: las genera el servidor la primera vez y las guarda en
  `app_settings` (`vapidKeys`); no hace falta configurar nada. Si se
  cambiaran, cada dispositivo tendría que volver a activar las
  notificaciones.
- Envío: al crear una nota en un grupo, a todos sus miembros menos el autor.
  Mover una nota a un grupo no avisa (no cuenta como pendiente para quien
  entró después de crearla). Una suscripción que el servicio da por caducada
  (404/410) se borra. Requiere HTTPS (o localhost) en el navegador.
- Service worker: `web/public/push-sw.js`, importado en el generado
  (`workbox.importScripts`); el toque abre el Detalle de la nota.
- Cerrar sesión da de baja el push de ese dispositivo.
- Web: aviso en Principal con el número de pendientes (filtra al tocarlo),
  "Falta tu nota" en las cards, "No la he probado" y "Deshacer" en el
  Detalle, e interruptor "Notificaciones en este dispositivo" en Ajustes.
