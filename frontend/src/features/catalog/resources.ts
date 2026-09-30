type InputKind = "text" | "number" | "password" | "email" | "select" | "textarea";
export type Field = { name: string; label: string; kind?: InputKind; required?: boolean; min?: number; minLength?: number; options?: Array<{ label: string; value: string }>; pathOnly?: boolean };
export type Resource = {
  key: string; title: string; description: string; path: string; method?: "POST" | "PUT" | "PATCH";
  writePath?: (values: Record<string, string>) => string; fields?: Field[]; body?: (values: Record<string, string>) => unknown;
};

const option = (label: string, value = label) => ({ label, value });
export const resourcesBySection: Record<string, Resource[]> = {
  users: [
      { key: "users", title: "Cuentas de usuario", description: "Crea cuentas internas y asigna uno de los tres roles del sistema.", path: "/api/users?pageSize=100", method: "POST", fields: [
      { name: "name", label: "Nombre completo", required: true }, { name: "username", label: "Nombre de usuario", required: true },
      { name: "password", label: "Contraseña inicial", kind: "password", required: true, minLength: 12 },
      { name: "role", label: "Rol", kind: "select", required: true, options: [option("Administrador", "ADMIN"), option("Operador de estación", "OPERADOR_ESTACION"), option("Administrativo", "ADMINISTRATIVO")] },
    ] },
    { key: "update-user", title: "Cambiar cuenta", description: "Cambia el rol o estado; siempre debe quedar un administrador activo.", path: "/api/users?pageSize=100", method: "PATCH", writePath: (values) => `/api/users/${values.userId}`, fields: [{ name: "userId", label: "ID de usuario", kind: "number", required: true, pathOnly: true }, { name: "role", label: "Rol", kind: "select", options: [option("Sin cambio", ""), option("Administrador", "ADMIN"), option("Operador de estación", "OPERADOR_ESTACION"), option("Administrativo", "ADMINISTRATIVO")] }, { name: "active", label: "Estado", kind: "select", options: [option("Sin cambio", ""), option("Activo", "true"), option("Inactivo", "false")] }], body: (values) => ({ ...(values.role ? { role: values.role } : {}), ...(values.active ? { active: values.active === "true" } : {}) }) },
    { key: "roles", title: "Roles disponibles", description: "Roles fijos con permisos aplicados desde la API.", path: "/api/roles" },
  ],
  transport: [
    { key: "municipalities", title: "Municipalidades", description: "Catálogo territorial de líneas y estaciones.", path: "/api/transport/municipalities", method: "POST", fields: [{ name: "name", label: "Nombre", required: true }] },
    { key: "stations", title: "Estaciones", description: "Una estación puede pertenecer a varias líneas.", path: "/api/transport/stations", method: "POST", fields: [{ name: "code", label: "Código", required: true }, { name: "name", label: "Nombre", required: true }, { name: "municipalityId", label: "ID de municipalidad", kind: "number", required: true }] },
    { key: "lines", title: "Líneas", description: "Crea líneas en preparación y configura sus estaciones en orden.", path: "/api/transport/lines", method: "POST", fields: [{ name: "code", label: "Código", required: true }, { name: "name", label: "Nombre", required: true }, { name: "municipalityId", label: "ID de municipalidad", kind: "number", required: true }] },
    { key: "line-stations", title: "Orden y distancias", description: "Configura las paradas en orden y los kilómetros entre estaciones. La última parada cierra el recorrido.", path: "/api/transport/lines", method: "PUT", writePath: (values) => `/api/transport/lines/${values.lineId}/stations`, fields: [{ name: "lineId", label: "ID de línea", kind: "number", required: true, pathOnly: true }, { name: "stations", label: "Estaciones (JSON)", kind: "textarea", required: true }], body: (values) => ({ stations: JSON.parse(values.stations) }) },
    { key: "activate-line", title: "Habilitar línea", description: "La API valida estaciones, operadores, accesos cubiertos y entre uno y dos buses por estación.", path: "/api/transport/lines", method: "PATCH", writePath: (values) => `/api/transport/lines/${values.lineId}`, fields: [{ name: "lineId", label: "ID de línea", kind: "number", required: true, pathOnly: true }, { name: "active", label: "Estado de operación", kind: "select", required: true, options: [option("Habilitada", "true"), option("Deshabilitada", "false")] }] },
  ],
  personnel: [
    { key: "pilots", title: "Pilotos", description: "Datos de residencia, educación y contacto.", path: "/api/personnel/pilots", method: "POST", fields: [{ name: "name", label: "Nombre", required: true }, { name: "residence", label: "Residencia", required: true }, { name: "education", label: "Información educativa", kind: "textarea" }, { name: "phone", label: "Teléfono" }, { name: "email", label: "Correo", kind: "email" }] },
    { key: "operators", title: "Operadores", description: "Consulta operadores y sus estaciones asignadas.", path: "/api/personnel/operators" },
    { key: "assign-operator", title: "Asignar operador", description: "Vincula una cuenta con rol de operador a una estación activa.", path: "/api/personnel/operators", method: "POST", writePath: (values) => `/api/personnel/operators/${values.userId}/stations`, fields: [{ name: "userId", label: "ID de cuenta", kind: "number", required: true, pathOnly: true }, { name: "stationId", label: "ID de estación", kind: "number", required: true }] },
    { key: "guards", title: "Guardias", description: "Catálogo de guardias y cobertura de accesos.", path: "/api/security/guards", method: "POST", fields: [{ name: "name", label: "Nombre", required: true }, { name: "phone", label: "Teléfono" }] },
    { key: "assign-guard", title: "Asignar guardia", description: "Vincula un guardia activo con un acceso físico.", path: "/api/security/accesses", method: "POST", writePath: (values) => `/api/security/accesses/${values.accessId}/guards`, fields: [{ name: "accessId", label: "ID de acceso", kind: "number", required: true, pathOnly: true }, { name: "guardId", label: "ID de guardia", kind: "number", required: true }] },
    { key: "accesses", title: "Accesos físicos", description: "Crea accesos por estación; habilítalos después de asignar guardia.", path: "/api/security/accesses", method: "POST", fields: [{ name: "stationId", label: "ID de estación", kind: "number", required: true }, { name: "name", label: "Nombre del acceso", required: true }] },
    { key: "enable-access", title: "Habilitar acceso físico", description: "La API exige por lo menos un guardia vigente antes de habilitarlo.", path: "/api/security/accesses", method: "PATCH", writePath: (values) => `/api/security/accesses/${values.accessId}`, fields: [{ name: "accessId", label: "ID de acceso", kind: "number", required: true, pathOnly: true }, { name: "active", label: "Estado", kind: "select", required: true, options: [option("Habilitado", "true"), option("Deshabilitado", "false")] }] },
    { key: "media", title: "Medios de acceso", description: "Catálogo informativo; no procesa pagos ni transacciones.", path: "/api/access-media/media", method: "POST", fields: [{ name: "name", label: "Nombre", required: true }, { name: "description", label: "Descripción" }] },
    { key: "station-media", title: "Habilitar medio", description: "Activa un medio de acceso en una estación.", path: "/api/transport/stations", method: "PUT", writePath: (values) => `/api/access-media/stations/${values.stationId}/media`, fields: [{ name: "stationId", label: "ID de estación", kind: "number", required: true, pathOnly: true }, { name: "mediaId", label: "ID de medio", kind: "number", required: true }, { name: "active", label: "Estado", kind: "select", required: true, options: [option("Habilitado", "true"), option("Deshabilitado", "false")] }] },
  ],
  fleet: [
    { key: "parkings", title: "Parqueos", description: "Registra parqueos vinculados con una estación.", path: "/api/fleet/parkings", method: "POST", fields: [{ name: "stationId", label: "ID de estación", kind: "number", required: true }, { name: "name", label: "Nombre", required: true }] },
    { key: "buses", title: "Buses", description: "Cada bus se registra junto a su parqueo inicial en una transacción.", path: "/api/fleet/buses", method: "POST", fields: [{ name: "code", label: "Código", required: true }, { name: "plate", label: "Placa", required: true }, { name: "capacity", label: "Capacidad", kind: "number", required: true, min: 1 }, { name: "parkingId", label: "ID de parqueo inicial", kind: "number", required: true }] },
    { key: "assign-line", title: "Asignar bus a línea", description: "Una reasignación conserva historial y valida mínimos y máximos.", path: "/api/fleet/buses", method: "PUT", writePath: (values) => `/api/fleet/buses/${values.busId}/line`, fields: [{ name: "busId", label: "ID de bus", kind: "number", required: true, pathOnly: true }, { name: "lineId", label: "ID de línea (0 para retirar)", kind: "number", required: true }], body: (values) => ({ lineId: Number(values.lineId) === 0 ? null : Number(values.lineId) }) },
    { key: "assign-parking", title: "Reasignar parqueo", description: "El cambio cierra la asignación anterior y registra la nueva.", path: "/api/fleet/buses", method: "PUT", writePath: (values) => `/api/fleet/buses/${values.busId}/parking`, fields: [{ name: "busId", label: "ID de bus", kind: "number", required: true, pathOnly: true }, { name: "parkingId", label: "ID de parqueo", kind: "number", required: true }] },
  ],
  reports: [
    { key: "overview", title: "Resumen", description: "Totales actuales de la plataforma.", path: "/api/reports/overview" },
    { key: "map", title: "Líneas y conexiones", description: "Estaciones en orden y puntos compartidos, calculados desde la configuración.", path: "/api/reports/lines" },
    { key: "operations", title: "Recorridos y visitas", description: "Ocupación, demanda y alertas registradas.", path: "/api/reports/operations" },
    { key: "fleet-report", title: "Historial de flota", description: "Asignaciones históricas de líneas y parqueos.", path: "/api/reports/fleet" },
    { key: "access-report", title: "Conteos por medio", description: "Cantidades agrupadas por estación y medio.", path: "/api/reports/access-counts" },
  ],
  audit: [{ key: "audit", title: "Bitácora", description: "Eventos ordenados por fecha, con responsable y entidad.", path: "/api/audit?pageSize=100" }],
};


