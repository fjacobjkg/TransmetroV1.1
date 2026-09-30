# Transmetro V1

Aplicación de control interno basada en los requisitos y diagramas de Transmetro y en la arquitectura y navegación de LAVANDERIA-main. Incluye React con TypeScript, API Express con Node.js, Prisma y MySQL. Mantiene carpetas independientes `backend/` y `frontend/`.

La guía de instalación, configuración de MySQL, carga manual de tablas e INSERT, funcionamiento y pruebas está en [README.me](README.me).

- [Comparación con la versión anterior](docs/COMPARACION.md).
- [Arquitectura y requisitos](docs/ARQUITECTURA_Y_REQUISITOS.md).
- [Cuentas locales de todos los roles](docs/CUENTAS_LOCALES.md). Este archivo contiene credenciales de desarrollo y está excluido de Git.

V1 está adaptado al SQL original completo y utiliza la base independiente `transmetro_v1_original`, backend en `3001` y frontend en `5174`. La versión anterior conserva `transmetro_db`. Consulta [la adaptación de la base original](docs/ADAPTACION_BASE_ORIGINAL.md). No ejecutes la carga manual sobre una base ya poblada.
