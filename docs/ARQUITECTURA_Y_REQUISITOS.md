# Arquitectura, reglas y alcance

Fuente de negocio: E2_FranciscoMartinez_040926.pdf. Fuente de diagramas: E4_FranciscoMartinez_180926.pdf. Ambos se encuentran en la carpeta padre LAVANDERIA. La estructura técnica y el patrón de logo, acciones, sesión y cierre provienen de LAVANDERIA-main.

```text
TRANSMETROV1/
  backend/
    src/config, middleware, lib
    src/modules/auth, user, role, audit, health
    src/modules/transport-structure, personnel, access-security
    src/modules/fleet, route-operation, access-media, report
    prisma/schema.prisma, migrations, seed*.ts
    scripts/export-demo.ts, smoke.ts
    sql/00_crear_base.sql, 01_tablas.sql, 02_datos_demo.sql
  frontend/
    src/api, hooks, services, types, routes
    src/layout/AppLayout.tsx
    src/pages/LoginPage.tsx, administrative/
    src/features/catalog/, reports/
    src/components/ui/, OperationsWorkspace, LineVisualization, BrandLogo
    src/lib/csv.ts
    src/styles/, test/
  docs/
  README.md, README.me, docker-compose.yml
```

React consume `/api` mediante proxy de Vite. AuthContext conserva únicamente la identidad; el token no se guarda en localStorage. La API autentica cookie HttpOnly y verifica rol y ámbito de estación en cada operación. Zod valida entradas. Los servicios realizan comprobaciones de negocio dentro de transacciones y Prisma accede a MySQL. Las escrituras auditadas se registran junto al cambio para mantener coherencia.

El backend se reutiliza como fundamento y el modelo Prisma se adaptó al esquema original completo recibido. V1 añade correcciones de lógica y pruebas; la interfaz usa nuevas tablas, encabezados, diálogos, relaciones, editor de líneas, reportes y shell. Los catálogos usan definición declarativa y controles compartidos; operación mantiene su flujo específico porque tiene reglas distintas.

## Trazabilidad funcional

| RF | Implementación |
| --- | --- |
| RF01 | auth + middleware; LoginPage y rutas protegidas, tres roles |
| RF02 | transport-structure: municipalidades |
| RF03 | líneas en preparación, validación de habilitación |
| RF04 | estaciones y relación línea-estación; LineOrderEditor |
| RF05 | report/lines y LineVisualization |
| RF06 | access-security, accesos y cobertura de guardias |
| RF07 | fleet, buses/capacidad/asignaciones de línea |
| RF08 | parqueos y asignaciones con historial |
| RF09 | personnel, pilotos/residencia/formación/contacto |
| RF10 | cuentas de operador y asignaciones a estación |
| RF11 | distancias entre paradas y distancia total |
| RF12 | route-operation, recorridos y visitas en orden |
| RF13 | evaluateVisit, demanda/ocupación/alertas/espera |
| RF14 | medios habilitados por estación y conteos diarios |
| RF15 | reportes de líneas, operación, flota y accesos; filtros y CSV |
| RF16 | audit, responsable/acción/entidad/fecha |

## Reglas del negocio

| RN | Control principal |
| --- | --- |
| 01 | Orden consecutivo, posiciones únicas y visitas secuenciales |
| 02 | Estación activa vinculada; se comparte entre líneas |
| 03 | Acceso vinculado a una estación por FK |
| 04 | Una línea vigente por bus; reasignación cierra historial |
| 05 | Entre N y 2N buses por línea habilitada, N = estaciones |
| 06–07 | Parqueo inicial obligatorio y cambio transaccional con cierre/apertura |
| 08 | Accesos derivados de las estaciones de la línea |
| 09 | Acceso habilitado necesita guardia vigente; no se retira el último responsable |
| 10 | Línea y estación pertenecen a municipalidad |
| 11 | Total de kilómetros es suma de tramos adyacentes |
| 12–13 | Visita en la siguiente estación de la línea; bus asignado al recorrido |
| 14 | Demanda ≥ 1.5 × capacidad registrada → alerta |
| 15 | Ocupación < 0.25 × capacidad registrada → 5 minutos adicionales |
| 16 | Estaciones operativas con operador vigente; no se elimina último responsable |
| 17 | Conteos solo sobre medios habilitados y dentro del ámbito del operador |

La capacidad se conserva en cada visita para que cambiarla en el bus no altere las evaluaciones históricas. Las asignaciones temporales conservan inicio y fin. Los medios y conteos son informativos; no realizan cobros. El editor y las previsiones de UI ayudan al usuario, pero la autoridad de validación está en la API.

## Requisitos no funcionales

Aplicación web, base central, permisos, hash de contraseñas, integridad relacional, auditoría y modularidad se implementan en código. La interfaz usa controles nativos, estados de carga/error, foco visible, diálogo modal y menú móvil; su accesibilidad completa requiere revisión adicional. Los objetivos de rendimiento, concurrencia, internet/HTTPS, respaldo y recuperación deben verificarse en el entorno de despliegue. La existencia de un Compose no confirma esos objetivos.

## Ejemplos verificables

L1 tiene dos estaciones y dos buses; L2 también. Plaza Central está en ambas. Los recorridos demo contienen visitas con capacidad 100/ocupación 20/demanda 150 y capacidad 80/ocupación 15/demanda 120: producen alerta y cinco minutos de espera simultáneos. Los conteos solo usan Tarjeta y Boleto; Pase temporal está configurado pero deshabilitado.

Para pruebas nuevas no alteres estos ejemplos sin necesidad: iniciar un recorrido o modificar un conteo escribe únicamente en `transmetro_v1_original`; la versión anterior conserva su base. El smoke de V1 hace consultas y login/logout, sin crear recorridos ni cambiar catálogos.
