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
