# Adaptación al SQL original — 30/09/2026

TRANSMETROV1 usa la base independiente `transmetro_v1_original` en MySQL local `127.0.0.1:3306`. TRASNMETRO conserva `transmetro_db`: no se modificaron su configuración ni sus datos. V1 mantiene `backend/`, `frontend/`, React/TypeScript, Express, Prisma y la navegación basada en LAVANDERIA-main.

## Fuente y conservación

El archivo recibido fue `C:\Users\cobra\Downloads\transmetro_db.sql`. Su copia íntegra está en [sql/original/transmetro_db.sql](../backend/sql/original/transmetro_db.sql); su SHA-256 está en [SQL_ORIGINAL_SHA256.txt](SQL_ORIGINAL_SHA256.txt). El archivo contiene DDL, sin INSERT. Además incluye DROP/CREATE USER y un GRANT sobre `transmetro.*`, distinto de la base declarada. Esas instrucciones no se ejecutaron. Se separó el DDL original en una migración y en `01_tablas.sql`; `00_crear_base.sql` crea únicamente la base independiente y concede permisos al usuario existente.

Las 21 tablas se conservan completas: roles, usuarios, bitacora, municipalidades, lineas, estaciones, linea_estacion, accesos, guardias, asignacion_guardia_acceso, pilotos, asignacion_usuario_estacion, buses, parqueos, asignacion_bus_linea, asignacion_bus_parqueo, recorridos, visitas, medios_acceso, estacion_medio_acceso y registros_acceso. Se conservaron columnas, tipos, nulabilidad, defaults, claves, índices y CHECK del SQL. `_prisma_migrations` es solamente el historial técnico de Prisma.

## Cambios de compatibilidad

| Esquema original | Adaptación de la aplicación |
| --- | --- |
| Claves físicas llamadas `id` | Prisma mantiene aliases como `id_bus` mediante `@map("id")`; API y UI conservan sus contratos |
| Identificadores INT/BIGINT UNSIGNED | Tipos originales y rutas BIGINT sin conversión a Number; JSON transmite BIGINT como texto |
| Bitácora con entidad_id INT UNSIGNED | Referencias mayores a UINT32 se conservan en la descripción, sin truncar el ID |
| Buses.capacidad_maxima y visitas.ocupacion SMALLINT UNSIGNED | Máximo 65.535; demanda/cantidad hasta 4.294.967.295 |
| Asignación de operador sin `activo` | Vigencia por fecha_inicio/fecha_fin, usuario/rol/estación activos |
| Fechas de inicio sin default | Los servicios y seeds envían fecha_inicio explícitamente |
| Recorrido.estado VARCHAR | Se conserva VARCHAR; la API valida EN_CURSO/FINALIZADO/CANCELADO |
| Visitas sin columnas de evaluación | Cálculo en servicios; capacidad histórica en bitácora existente |
| Información educativa nullable | Se respeta NULL y se permite dejarla sin especificar |
| Conteos sin UNIQUE diario | Se preservan todas las filas del origen y se agregan todas en reportes; la UI corrige su registro seleccionado |

Las visitas nuevas registran en `bitacora.descripcion` un JSON con `format: transmetro.visit-evaluation.v1`, `visitId` como texto y `capacity`. Así un cambio posterior en la capacidad del bus no modifica su evaluación histórica. Las alertas se calculan con demanda ≥ 150 % y espera con ocupación < 25 %. Los campos que recibe React son calculados; no son columnas adicionales de `visitas`.

Si una visita original no tiene esa bitácora, se evalúa con la capacidad actual y la interfaz indica que es estimada. No se inventa capacidad histórica. Los reportes distinguen `estimatedVisits` y agregan todas las filas coincidentes, aun cuando el detalle se limita a 1.000.

## Datos cargados

Se copiaron una vez las filas de las 21 tablas de `transmetro_db`, adaptando nombres de claves y omitiendo columnas que no existen en el original. Se conservaron hashes y contraseñas de las tres cuentas, asignaciones, cuatro recorridos, cuatro visitas y seis conteos. Se añadieron cuatro eventos de bitácora para conservar la capacidad histórica que sí existía en las visitas anteriores. La copia se realizó en una transacción; el origen se consultó sin escrituras.

El archivo local [02_datos_demo.sql](../backend/sql/02_datos_demo.sql) contiene los INSERT compatibles. Incluye datos de demostración y hashes de cuentas; está excluido de Git. Solo se importa en tablas nuevas y vacías. La guía completa de carga manual y registro del historial Prisma está en [README.me](../README.me).

El esquema anterior se conserva como referencia en `backend/prisma/legacy-migrations/` y un respaldo de los archivos previos está en `.backups/20260930-original-db/`. Ninguno se aplica a la nueva base.

## Validación

Pasaron comprobación de tipos, compilación de backend/frontend, 32 pruebas backend y 2 CSV. Las consultas reales verificaron autenticación y permisos de los tres roles. La prueba `npm.cmd run test:original-db` desde backend verificó inserciones y relaciones originales dentro de una transacción que se revirtió, preservando los datos de negocio. El resumen local tiene 4 visitas, demanda total 380, 2 alertas, 2 esperas y 0 evaluaciones estimadas.

`prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` no detectó diferencias. Los CREATE TABLE de la migración provienen del DDL recibido, incluyendo sus CHECK. Las pruebas no certifican carga concurrente, recuperación ante fallos ni despliegue de producción.
