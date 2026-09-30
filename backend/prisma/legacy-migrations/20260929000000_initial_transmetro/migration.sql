CREATE TABLE `roles` (
  `id_rol` INTEGER NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(60) NOT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `actualizado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_rol`),
  UNIQUE INDEX `uq_roles_nombre` (`nombre`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `usuarios` (
  `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
  `rol_id` INTEGER NOT NULL,
  `nombre` VARCHAR(120) NOT NULL,
  `nombre_usuario` VARCHAR(60) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `actualizado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_usuario`),
  UNIQUE INDEX `uq_usuarios_nombre_usuario` (`nombre_usuario`),
  INDEX `idx_usuarios_rol` (`rol_id`),
  CONSTRAINT `fk_usuarios_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id_rol`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `bitacora` (
  `id_bitacora` BIGINT NOT NULL AUTO_INCREMENT,
  `usuario_id` INTEGER NOT NULL,
  `accion` VARCHAR(80) NOT NULL,
  `entidad` VARCHAR(80) NOT NULL,
  `entidad_id` BIGINT NULL,
  `descripcion` VARCHAR(500) NULL,
  `fecha_hora` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_bitacora`),
  INDEX `idx_bitacora_usuario_fecha` (`usuario_id`, `fecha_hora`),
  INDEX `idx_bitacora_entidad` (`entidad`, `entidad_id`),
  CONSTRAINT `fk_bitacora_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `municipalidades` (
  `id_municipalidad` INTEGER NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(120) NOT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `actualizado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_municipalidad`),
  UNIQUE INDEX `uq_municipalidades_nombre` (`nombre`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `lineas` (
  `id_linea` INTEGER NOT NULL AUTO_INCREMENT,
  `municipalidad_id` INTEGER NOT NULL,
  `codigo` VARCHAR(30) NOT NULL,
  `nombre` VARCHAR(120) NOT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT false,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `actualizado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_linea`),
  UNIQUE INDEX `uq_lineas_codigo` (`codigo`),
  INDEX `idx_lineas_municipalidad` (`municipalidad_id`),
  CONSTRAINT `fk_lineas_municipalidad` FOREIGN KEY (`municipalidad_id`) REFERENCES `municipalidades` (`id_municipalidad`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `estaciones` (
  `id_estacion` INTEGER NOT NULL AUTO_INCREMENT,
  `municipalidad_id` INTEGER NOT NULL,
  `codigo` VARCHAR(30) NOT NULL,
  `nombre` VARCHAR(120) NOT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `actualizado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_estacion`),
  UNIQUE INDEX `uq_estaciones_codigo` (`codigo`),
  INDEX `idx_estaciones_municipalidad` (`municipalidad_id`),
  CONSTRAINT `fk_estaciones_municipalidad` FOREIGN KEY (`municipalidad_id`) REFERENCES `municipalidades` (`id_municipalidad`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `linea_estacion` (
  `id_linea_estacion` INTEGER NOT NULL AUTO_INCREMENT,
  `linea_id` INTEGER NOT NULL,
  `estacion_id` INTEGER NOT NULL,
  `orden` SMALLINT UNSIGNED NOT NULL,
  `distancia_siguiente` DECIMAL(10,3) NULL,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (`id_linea_estacion`),
  UNIQUE INDEX `uq_linea_estacion_orden` (`linea_id`, `orden`),
  UNIQUE INDEX `uq_linea_estacion` (`linea_id`, `estacion_id`),
  INDEX `idx_linea_estacion_estacion` (`estacion_id`),
  CONSTRAINT `fk_linea_estacion_linea` FOREIGN KEY (`linea_id`) REFERENCES `lineas` (`id_linea`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_linea_estacion_estacion` FOREIGN KEY (`estacion_id`) REFERENCES `estaciones` (`id_estacion`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `accesos` (
  `id_acceso` INTEGER NOT NULL AUTO_INCREMENT,
  `estacion_id` INTEGER NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT false,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `actualizado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_acceso`),
  UNIQUE INDEX `uq_accesos_estacion_nombre` (`estacion_id`, `nombre`),
  INDEX `idx_accesos_estacion` (`estacion_id`),
  CONSTRAINT `fk_accesos_estacion` FOREIGN KEY (`estacion_id`) REFERENCES `estaciones` (`id_estacion`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `guardias` (
  `id_guardia` INTEGER NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(120) NOT NULL,
  `telefono` VARCHAR(25) NULL,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `actualizado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_guardia`),
  INDEX `idx_guardias_nombre` (`nombre`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `asignacion_guardia_acceso` (
  `id_asignacion_guardia_acceso` INTEGER NOT NULL AUTO_INCREMENT,
  `guardia_id` INTEGER NOT NULL,
  `acceso_id` INTEGER NOT NULL,
  `fecha_inicio` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `fecha_fin` DATETIME(0) NULL,
  PRIMARY KEY (`id_asignacion_guardia_acceso`),
  INDEX `idx_asignacion_guardia_vigencia` (`guardia_id`, `fecha_fin`),
  INDEX `idx_asignacion_acceso_vigencia` (`acceso_id`, `fecha_fin`),
  CONSTRAINT `fk_asignacion_guardia_acceso_guardia` FOREIGN KEY (`guardia_id`) REFERENCES `guardias` (`id_guardia`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_asignacion_guardia_acceso_acceso` FOREIGN KEY (`acceso_id`) REFERENCES `accesos` (`id_acceso`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `buses` (
  `id_bus` INTEGER NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(30) NOT NULL,
  `placa` VARCHAR(20) NOT NULL,
  `capacidad_maxima` INTEGER NOT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `actualizado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_bus`),
  UNIQUE INDEX `uq_buses_codigo` (`codigo`),
  UNIQUE INDEX `uq_buses_placa` (`placa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `asignacion_bus_linea` (
  `id_asignacion_bus_linea` INTEGER NOT NULL AUTO_INCREMENT,
  `bus_id` INTEGER NOT NULL,
  `linea_id` INTEGER NOT NULL,
  `fecha_inicio` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `fecha_fin` DATETIME(0) NULL,
  PRIMARY KEY (`id_asignacion_bus_linea`),
  INDEX `idx_asignacion_bus_linea_vigencia` (`bus_id`, `fecha_fin`),
  INDEX `idx_asignacion_linea_bus_vigencia` (`linea_id`, `fecha_fin`),
  CONSTRAINT `fk_asignacion_bus_linea_bus` FOREIGN KEY (`bus_id`) REFERENCES `buses` (`id_bus`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_asignacion_bus_linea_linea` FOREIGN KEY (`linea_id`) REFERENCES `lineas` (`id_linea`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `parqueos` (
  `id_parqueo` INTEGER NOT NULL AUTO_INCREMENT,
  `estacion_id` INTEGER NOT NULL,
  `nombre` VARCHAR(120) NOT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `actualizado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_parqueo`),
  UNIQUE INDEX `uq_parqueos_estacion_nombre` (`estacion_id`, `nombre`),
  CONSTRAINT `fk_parqueos_estacion` FOREIGN KEY (`estacion_id`) REFERENCES `estaciones` (`id_estacion`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `asignacion_bus_parqueo` (
  `id_asignacion_bus_parqueo` INTEGER NOT NULL AUTO_INCREMENT,
  `bus_id` INTEGER NOT NULL,
  `parqueo_id` INTEGER NOT NULL,
  `fecha_inicio` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `fecha_fin` DATETIME(0) NULL,
  PRIMARY KEY (`id_asignacion_bus_parqueo`),
  INDEX `idx_asignacion_bus_parqueo_vigencia` (`bus_id`, `fecha_fin`),
  INDEX `idx_asignacion_parqueo_bus_vigencia` (`parqueo_id`, `fecha_fin`),
  CONSTRAINT `fk_asignacion_bus_parqueo_bus` FOREIGN KEY (`bus_id`) REFERENCES `buses` (`id_bus`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_asignacion_bus_parqueo_parqueo` FOREIGN KEY (`parqueo_id`) REFERENCES `parqueos` (`id_parqueo`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `pilotos` (
  `id_piloto` INTEGER NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(120) NOT NULL,
  `residencia` VARCHAR(255) NOT NULL,
  `informacion_educativa` TEXT NOT NULL,
  `telefono` VARCHAR(25) NULL,
  `correo` VARCHAR(120) NULL,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `actualizado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_piloto`),
  INDEX `idx_pilotos_nombre` (`nombre`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `asignacion_usuario_estacion` (
  `id_asignacion_usuario_estacion` INTEGER NOT NULL AUTO_INCREMENT,
  `usuario_id` INTEGER NOT NULL,
  `estacion_id` INTEGER NOT NULL,
  `fecha_inicio` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `fecha_fin` DATETIME(0) NULL,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_asignacion_usuario_estacion`),
  INDEX `idx_asignacion_usuario_estacion_vigencia` (`usuario_id`, `fecha_fin`),
  INDEX `idx_asignacion_estacion_usuario_vigencia` (`estacion_id`, `fecha_fin`),
  CONSTRAINT `fk_asignacion_usuario_estacion_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_asignacion_usuario_estacion_estacion` FOREIGN KEY (`estacion_id`) REFERENCES `estaciones` (`id_estacion`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `recorridos` (
  `id_recorrido` BIGINT NOT NULL AUTO_INCREMENT,
  `bus_id` INTEGER NOT NULL,
  `linea_id` INTEGER NOT NULL,
  `fecha_inicio` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `fecha_fin` DATETIME(0) NULL,
  `estado` ENUM('EN_CURSO', 'FINALIZADO', 'CANCELADO') NOT NULL DEFAULT 'EN_CURSO',
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_recorrido`),
  INDEX `idx_recorridos_linea_inicio` (`linea_id`, `fecha_inicio`),
  INDEX `idx_recorridos_bus_inicio` (`bus_id`, `fecha_inicio`),
  INDEX `idx_recorridos_estado_inicio` (`estado`, `fecha_inicio`),
  CONSTRAINT `fk_recorridos_bus` FOREIGN KEY (`bus_id`) REFERENCES `buses` (`id_bus`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_recorridos_linea` FOREIGN KEY (`linea_id`) REFERENCES `lineas` (`id_linea`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `visitas` (
  `id_visita` BIGINT NOT NULL AUTO_INCREMENT,
  `recorrido_id` BIGINT NOT NULL,
  `estacion_id` INTEGER NOT NULL,
  `usuario_id` INTEGER NOT NULL,
  `orden` SMALLINT UNSIGNED NOT NULL,
  `fecha_hora` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `ocupacion` INTEGER NOT NULL,
  `demanda` INTEGER NOT NULL,
  `capacidad_registrada` INTEGER NOT NULL,
  `alerta_unidad_adicional` BOOLEAN NOT NULL DEFAULT false,
  `espera_adicional_minutos` INTEGER NOT NULL DEFAULT 0,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_visita`),
  UNIQUE INDEX `uq_visitas_recorrido_orden` (`recorrido_id`, `orden`),
  INDEX `idx_visitas_estacion_fecha` (`estacion_id`, `fecha_hora`),
  INDEX `idx_visitas_usuario_fecha` (`usuario_id`, `fecha_hora`),
  CONSTRAINT `fk_visitas_recorrido` FOREIGN KEY (`recorrido_id`) REFERENCES `recorridos` (`id_recorrido`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_visitas_estacion` FOREIGN KEY (`estacion_id`) REFERENCES `estaciones` (`id_estacion`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_visitas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `medios_acceso` (
  `id_medio_acceso` INTEGER NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` VARCHAR(255) NULL,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `actualizado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_medio_acceso`),
  UNIQUE INDEX `uq_medios_acceso_nombre` (`nombre`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `estacion_medio_acceso` (
  `id_estacion_medio_acceso` INTEGER NOT NULL AUTO_INCREMENT,
  `estacion_id` INTEGER NOT NULL,
  `medio_acceso_id` INTEGER NOT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT true,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_estacion_medio_acceso`),
  UNIQUE INDEX `uq_estacion_medio_acceso` (`estacion_id`, `medio_acceso_id`),
  CONSTRAINT `fk_estacion_medio_acceso_estacion` FOREIGN KEY (`estacion_id`) REFERENCES `estaciones` (`id_estacion`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_estacion_medio_acceso_medio` FOREIGN KEY (`medio_acceso_id`) REFERENCES `medios_acceso` (`id_medio_acceso`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `registros_acceso` (
  `id_registro_acceso` BIGINT NOT NULL AUTO_INCREMENT,
  `estacion_medio_acceso_id` INTEGER NOT NULL,
  `usuario_id` INTEGER NOT NULL,
  `fecha_registro` DATE NOT NULL,
  `cantidad` INTEGER NOT NULL,
  `creado_en` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id_registro_acceso`),
  UNIQUE INDEX `uq_registro_acceso_operador_dia` (`estacion_medio_acceso_id`, `usuario_id`, `fecha_registro`),
  INDEX `idx_registros_acceso_fecha` (`estacion_medio_acceso_id`, `fecha_registro`),
  INDEX `idx_registros_acceso_usuario_fecha` (`usuario_id`, `fecha_registro`),
  CONSTRAINT `fk_registros_acceso_estacion_medio` FOREIGN KEY (`estacion_medio_acceso_id`) REFERENCES `estacion_medio_acceso` (`id_estacion_medio_acceso`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_registros_acceso_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
