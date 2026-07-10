# Ranking App — Design Document

## Meta

- **Proyecto**: App de puntuaciones para cualquier cosa (comida, restaurantes, pelis, recuerdos, etc.)
- **Plataformas**: Android + iOS
- **Arquitectura de código**: Un archivo = una funcionalidad. Paquetes simples. Escalable.

---

## Decisiones tomadas

### Stack técnico
- **React Native con Expo** (TypeScript)
- Un solo codebase para ambas plataformas
- OTA updates vía Expo

### Modelo de puntuación
- **Puntuación numérica del 1 al 10**
- **Terminología**: "puntuación" en vez de "ranking"
- **Pantalla principal**: lista/grid de las últimas puntuaciones del usuario
- **Creación de puntuación**: canvas en blanco donde el usuario añade campos dinámicamente según qué está puntuando
  - Ejemplo restaurante: dirección, ítems pedidos, mapa, precio total, fecha, comensales, notas, fotos
  - Ejemplo receta: ingredientes, foto, notas

### Tipos de campo dinámicos
- **Texto corto** — OBLIGATORIO y ÚNICO. Título/nombre de lo que se puntúa.
- **Valoración (nota principal)** — OBLIGATORIA y ÚNICA. Escala del 1 al 10.
- **Texto largo / Notas** — Opcional, repetible.
- **Número** — Opcional, repetible. Soporta decimales (ej. precio, comensales).
- **Fecha** — Opcional, repetible.
- **Ubicación / Mapa** — Opcional, repetible.
- **Imagen / Foto** — Opcional, repetible.
- **Galería de imágenes** — Opcional, repetible.
- **Lista de ítems** — Opcional, repetible (ej. ingredientes, platos pedidos).
- **Selector / Etiqueta** — Opcional, repetible (ej. tipo de cocina, género).

### Persistencia
- **Backend propio** alojado en servidor personal
- **Stack backend**: Node.js + Express + TypeScript + PostgreSQL
- Imágenes en sistema de archivos o storage dedicado
- Sincronización multi-dispositivo

### Autenticación
- **Email + contraseña** — registro y login clásico

### Compartición y colaboración
- **Equipos/grupos**: usuarios pueden crear y unirse a equipos
- Dentro de un equipo, todos los miembros ven las puntuaciones de los demás
- **Puntuaciones multi-evaluador**: varios miembros pueden añadir su propia nota (1-10) a una misma puntuación (ej. pareja en un restaurante → nota de cada uno por separado)
- Los campos descriptivos (dirección, fotos, ítems, etc.) los crea el autor original; los demás añaden solo su valoración numérica
- No es necesario que editen simultáneamente, solo que todos puedan ver y puntuar

---

## Decisiones pendientes

### Sin plantillas
- Cada puntuación es un canvas en blanco fresco. No hay plantillas reutilizables ni presets. El usuario añade los campos que necesita cada vez.

### Organización / Filtrado
- La pantalla principal permite filtrar por los valores de los campos de tipo **selector/etiqueta** que el usuario haya creado (ej. "restaurante", "película").
- Búsqueda por texto sobre el título de la puntuación.

### Offline
- **V1: online-only**. La app requiere conexión a internet. La arquitectura se diseña para que añadir offline-first en el futuro sea viable sin reescribir.

### Equipos y privacidad
- Cada puntuación se crea como **personal/privada** o asignada a **un equipo**. Las personales solo las ve el creador; las de equipo las ven todos los miembros.
- Un usuario puede pertenecer a **varios equipos** simultáneamente.
- **Creación e invitación**: el creador genera un **link o código de invitación** que comparte por fuera (WhatsApp, etc.). El destinatario introduce el código/link en un submenú de la app y se une automáticamente. También se puede invitar por email.