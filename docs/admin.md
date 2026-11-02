# Administración del sitio

Decisiones del 2026-11-02. Estado: **implementado** (migración 008,
`backend/src/routes/admin.js`, `backend/src/settings.js`, pantalla
Administración en `/admin`).

## Decisiones

1. **Quién es admin**: la cuenta cuyo email coincide con `ADMIN_EMAIL` (variable
   del contenedor) lo es siempre. Desde el panel se puede hacer admin a otras
   cuentas (`users.is_admin`). Sin `ADMIN_EMAIL` no hay ningún admin.
2. **La cuenta de `ADMIN_EMAIL` está protegida**: el panel no la puede
   degradar, desactivar, borrar, cambiarle la contraseña ni cerrarle las
   sesiones. Puede registrarse aunque el registro esté cerrado, para que una
   instalación nueva con el registro cerrado no deje fuera a su dueño.
3. **Nadie actúa sobre su propia cuenta** desde el panel. Así siempre queda al
   menos un admin (quien hace el cambio).
4. **Datos del panel**: usuarios (total, nuevos y activos en 30 días,
   desactivados), contenido (notas, notas en grupos, grupos, fotos),
   almacenamiento (fotos y miniaturas en disco, tamaño de la base de datos) y
   sistema (versión de la imagen, encendido, dirección externa, `ADMIN_EMAIL`,
   claves de carátulas). Lista de usuarios con alta, último acceso, notas y
   grupos.
5. **Acciones sobre una cuenta**: hacer o quitar admin, desactivar o reactivar,
   restablecer la contraseña, cerrar todas sus sesiones y eliminarla.
6. **Registro desde el panel**: abrirlo o cerrarlo se guarda en la base de
   datos (`app_settings`) y manda sobre `ALLOW_REGISTRATION`, que pasa a ser
   el valor inicial. "Volver al valor del servidor" borra el cambio.
7. **Eliminar una cuenta**: se borran sus notas personales y sus fotos (solo
   las que ninguna otra nota usa). Sus notas y puntuaciones en grupos se
   quedan, como cuando alguien sale de un grupo: la nota queda sin autor
   ("creada por un antiguo miembro") y la puntuación con su nombre y la marca
   de antiguo miembro. Antes sale de sus grupos con las reglas de siempre (otro
   miembro pasa a admin; un grupo vacío se borra). Se confirma escribiendo su
   email.

## Detalles

- **Sesiones**: el token lleva `tv` (versión) y cada petición comprueba la
  cuenta en la base de datos: si no existe, está desactivada o su
  `token_version` cambió, responde 401. Cerrar sesiones y restablecer la
  contraseña suben `token_version`. Los tokens anteriores sin `tv` cuentan como
  versión 0, así que nadie pierde la sesión al actualizar.
- **Último acceso**: `users.last_seen_at`, escrito como mucho cada 5 minutos
  por cuenta.
- **Contraseña temporal**: 12 caracteres sin ambiguos (`xxxx-xxxx-xxxx`). Se
  muestra una vez; no hay envío de emails.
- **Notas sin autor** (`scores.owner_id` NULL, solo en grupos): las gestionan
  los admins del grupo. Si un admin la saca del grupo, pasa a ser suya. Si el
  grupo se borra devolviendo las notas, o se queda vacío, las notas sin autor
  se borran (no hay a quién devolverlas).
- **Versión**: el workflow pasa el commit como `APP_VERSION` al construir la
  imagen. Una imagen construida a mano muestra "Sin datos".
