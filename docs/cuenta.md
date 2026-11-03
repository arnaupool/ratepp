# Tu cuenta (Ajustes)

Decisiones del 2026-11-03. Estado: **implementado** (rutas `/api/auth/me*` en
`backend/src/routes/auth.js`, `backend/src/accounts.js`, pantalla Ajustes).

- **Nombre**: se cambia en Ajustes y se guarda al salir del campo. Es el que
  ven los demás en los grupos.
- **Contraseña**: pide la actual. Cierra las demás sesiones; esta sigue con un
  token nuevo.
- **Email**: pide la contraseña y que el email esté libre. La cuenta de
  `ADMIN_EMAIL` no lo puede cambiar (perdería el admin): se cambia en el
  servidor.
- **Cerrar sesión en los demás dispositivos**: sube `token_version`; esta
  sesión recibe un token nuevo.
- **Borrar la cuenta**: pide la contraseña y hace lo mismo que el borrado desde
  Administración (`deleteAccount`, docs/admin.md). La cuenta de `ADMIN_EMAIL`
  no se puede borrar desde Ajustes.
- Una contraseña incorrecta responde 403, nunca 401: la app cierra la sesión
  con cualquier 401.
- "Dirección externa" sale de Ajustes; se ve en Administración → Sistema.
