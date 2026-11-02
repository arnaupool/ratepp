# Grupos: notas y etiquetas compartidas

Decisiones de la entrevista del 2026-11-02 y diseño propuesto. Estado:
**pendiente de implementar**.

## Decisiones

1. **Qué se comparte**: notas y etiquetas. Un grupo es un espacio común: sus
   miembros ven, crean y puntúan las notas del grupo y usan sus etiquetas.
2. **Perfiles**: cada persona tiene su propia cuenta (el login actual). No hay
   varios perfiles dentro de una cuenta.
3. **Varios grupos por persona**: sí (pareja, amigos, familia...).
4. **Pertenencia de una nota**: personal ("Solo yo", por defecto) o de un
   grupo; se elige al crear y se puede mover después.
5. **Puntuar en grupo**: cada miembro puntúa con su cuenta (su nota con su
   nombre, solo la cambia él). La "Nota adicional" de nombre libre se mantiene
   para gente sin cuenta.
6. **Entrar a un grupo**: enlace/código de invitación que caduca (se comparte
   por WhatsApp) y, además, el admin puede añadir por email a quien ya tenga
   cuenta.
7. **Permisos**: todos los miembros crean, editan y puntúan las notas del
   grupo; el admin además invita y expulsa, borra el grupo y borra etiquetas o
   categorías del grupo entero.
8. **Etiquetas y categorías**: siguen siendo texto libre, pero por espacio
   (personal y cada grupo). En una nota de grupo se sugieren las del grupo. En
   "Categorías y etiquetas" se ven las tuyas y, aparte, las de cada grupo.
9. **Principal**: fila de selección encima, "Todo · Solo yo · grupo A ·
   grupo B...". "Todo" mezcla, con un distintivo del grupo en cada card. La
   búsqueda y los filtros actúan dentro de lo elegido.
10. **Mapa**: incluye las notas de grupos, con el mismo selector.
11. **Salir o ser expulsado**: las notas que creó en el grupo se quedan en el
    grupo; su puntuación se conserva marcada como ex miembro; pierde el acceso.
    Sus notas personales no se tocan.
12. **Borrar un grupo** (solo admin): al borrarlo se elige entre devolver
    cada nota a su autor como personal o borrarlas también.

## Diseño propuesto

### Datos (migración nueva, sin tocar lo existente)

- `groups (id, name, created_by, created_at)`
- `group_members (group_id, user_id, role 'admin'|'member', joined_at)`;
  el creador entra como admin. Puede haber varios admins.
- `group_invites (id, group_id, token_hash, created_by, expires_at,
  revoked_at)`; el enlace lleva un token aleatorio y se guarda solo su hash.
  Caduca a los 7 días.
- `scores.group_id uuid NULL → groups`: NULL = personal. `owner_id` pasa a
  significar "autor".
- `score_ratings.user_id uuid NULL → users`: la puntuación de un miembro con
  cuenta. `is_owner` sigue marcando la del autor. Las de "Nota adicional"
  siguen con `user_id` NULL y nombre libre.

### Regla de acceso (en cada consulta)

Ves una nota si es tuya y personal (`owner_id = yo AND group_id IS NULL`) o
si es de un grupo del que eres miembro. Quien sale de un grupo pierde el
acceso a sus notas, incluidas las que creó allí.

### API (nueva o ampliada)

- Grupos: crear, listar los míos, renombrar, borrar (con
  `?notas=devolver|borrar`), miembros (listar, expulsar, cambiar rol, salir).
- Invitaciones: crear enlace, revocar, `POST /api/invites/:token/accept`;
  añadir por email (solo admin, responde igual exista o no la cuenta para no
  filtrar emails).
- `GET /api/scores?space=all|me|<groupId>`; `GET /api/scores/locations` con
  el mismo parámetro; `POST /api/scores` con `groupId`; `PATCH` permite
  mover de espacio.
- Categorías y etiquetas por espacio (`?space=`), y borrado global dentro de
  un espacio (en un grupo, solo admin).
- Mi puntuación en una nota de grupo: crear/cambiar la rating con mi
  `user_id`.

### Web

- Pantalla "Grupos" en el menú: lista, crear, detalle (miembros, invitar
  con enlace o email, roles, salir, borrar).
- Ruta `/unirse/:token` para aceptar invitaciones (pide login si hace falta).
- Selector de espacio en Crear y en el modo edición de Detalle ("Solo yo" o
  un grupo).
- Detalle de una nota de grupo: autor, puntuaciones de los miembros con su
  nombre y la tuya editable; "ex miembro" en las de quien ya no está.
- Principal y Mapa: fila "Todo · Solo yo · grupos"; distintivo de grupo en
  las cards.
- Categorías y etiquetas: secciones por espacio.

## Por decidir más adelante

- Quién puede mover una nota fuera de un grupo: propuesta, su autor o un
  admin; al salir del grupo vuelve como personal del autor.
- Avisos (badge o notificación) cuando alguien añade algo al grupo: fuera de
  alcance de la primera versión.
