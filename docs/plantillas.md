# Plantillas de puntuación

Decisiones del 2026-11-03. Estado: **implementado** (migración 009,
`backend/src/routes/templates.js`, desplegable y "Guardar como plantilla" en
Nueva puntuación y en el modo edición, pantalla Plantillas en `/plantillas`).

## Decisiones

1. **Qué guarda**: la forma de la nota, no sus valores. Los campos con su
   nombre, y dentro de cada campo lo que define su forma: los nombres de los
   criterios (sin nota) y, en Precio, la moneda y si es por persona o total
   (sin importe). También las categorías, el color y los nombres de las otras
   personas que puntúan. Textos, fechas, ubicación, fotos, ingredientes,
   pasos, enlaces y sí/no quedan vacíos. El servidor es quien recorta los
   valores (`shapeOf`), así que se le puede mandar la nota tal cual.
2. **De quién es**: tuya o de uno de tus grupos; se elige al guardar. Cualquier
   miembro puede añadir una al grupo; la renombra o borra quien la creó o un
   admin del grupo. Todas sirven en cualquier espacio.
3. **Dónde se crea**: "Guardar como plantilla" al final de Nueva puntuación y
   en el modo edición de una nota, con nombre y emoticono. La pantalla
   Plantillas (menú lateral) renombra, cambia el emoticono y borra.
4. **Al aplicar**: se añade sin pisar. Entran los campos que no estén ya (mismo
   tipo y nombre), las personas que falten (con un 5, como al añadir una a
   mano), las categorías que falten, y el color solo si no se había elegido.
   Aplicarla dos veces no duplica nada.
5. **Emoticono**: cuadrícula de 40 habituales y un campo "Otro" para escribir
   cualquiera.
6. **Diferido**: sugerir una plantilla al marcar su categoría.

## Detalles

- Si se borra un grupo (con cualquier opción para sus notas) o se queda vacío,
  sus plantillas vuelven a quien las creó como personales; las de una cuenta
  ya borrada se van con el grupo.
- Al borrar una cuenta desde Administración se borran sus plantillas
  personales; las de grupo se quedan en el grupo.
- El desplegable no aparece hasta que hay al menos una plantilla.
