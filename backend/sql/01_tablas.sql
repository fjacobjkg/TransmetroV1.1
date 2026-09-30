-- Esquema original: ejecutar solo en una base nueva.
USE transmetro_v1_original;

CREATE TABLE roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_roles_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

CREATE TABLE usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rol_id INT UNSIGNED NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    nombre_usuario VARCHAR(60) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_usuarios_nombre_usuario UNIQUE (nombre_usuario),
    CONSTRAINT fk_usuarios_rol
        FOREIGN KEY (rol_id) REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE bitacora (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    accion VARCHAR(80) NOT NULL,
    entidad VARCHAR(80) NOT NULL,
    entidad_id INT UNSIGNED NULL,
    descripcion VARCHAR(500) NULL,
    fecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bitacora_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_bitacora_usuario_fecha (usuario_id, fecha_hora),
    INDEX idx_bitacora_entidad (entidad, entidad_id)
) ENGINE=InnoDB;

CREATE TABLE municipalidades (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_municipalidades_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

CREATE TABLE lineas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    municipalidad_id INT UNSIGNED NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_lineas_codigo UNIQUE (codigo),
    CONSTRAINT fk_lineas_municipalidad
        FOREIGN KEY (municipalidad_id) REFERENCES municipalidades(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE estaciones (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    municipalidad_id INT UNSIGNED NOT NULL,
    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_estaciones_codigo UNIQUE (codigo),
    CONSTRAINT fk_estaciones_municipalidad
        FOREIGN KEY (municipalidad_id) REFERENCES municipalidades(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE linea_estacion (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    linea_id INT UNSIGNED NOT NULL,
    estacion_id INT UNSIGNED NOT NULL,
    orden SMALLINT UNSIGNED NOT NULL,
    distancia_siguiente DECIMAL(10,3) NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,

    CONSTRAINT uq_linea_estacion UNIQUE (linea_id, estacion_id),
    CONSTRAINT uq_linea_orden UNIQUE (linea_id, orden),
    CONSTRAINT chk_linea_estacion_orden CHECK (orden > 0),
    CONSTRAINT chk_distancia_siguiente CHECK (
        distancia_siguiente IS NULL OR distancia_siguiente >= 0
    ),
    CONSTRAINT fk_linea_estacion_linea
        FOREIGN KEY (linea_id) REFERENCES lineas(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_linea_estacion_estacion
        FOREIGN KEY (estacion_id) REFERENCES estaciones(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE accesos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    estacion_id INT UNSIGNED NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_accesos_estacion_nombre UNIQUE (estacion_id, nombre),
    CONSTRAINT fk_accesos_estacion
        FOREIGN KEY (estacion_id) REFERENCES estaciones(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE guardias (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    telefono VARCHAR(25) NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE asignacion_guardia_acceso (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guardia_id INT UNSIGNED NOT NULL,
    acceso_id INT UNSIGNED NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_guardia_acceso_fechas CHECK (
        fecha_fin IS NULL OR fecha_fin >= fecha_inicio
    ),
    CONSTRAINT fk_guardia_acceso_guardia
        FOREIGN KEY (guardia_id) REFERENCES guardias(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_guardia_acceso_acceso
        FOREIGN KEY (acceso_id) REFERENCES accesos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_guardia_acceso_guardia_vigencia (guardia_id, fecha_fin),
    INDEX idx_guardia_acceso_acceso_vigencia (acceso_id, fecha_fin)
) ENGINE=InnoDB;

CREATE TABLE pilotos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    residencia VARCHAR(255) NOT NULL,
    informacion_educativa TEXT NULL,
    telefono VARCHAR(25) NULL,
    correo VARCHAR(120) NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE asignacion_usuario_estacion (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    estacion_id INT UNSIGNED NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_usuario_estacion_fechas CHECK (
        fecha_fin IS NULL OR fecha_fin >= fecha_inicio
    ),
    CONSTRAINT fk_usuario_estacion_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_usuario_estacion_estacion
        FOREIGN KEY (estacion_id) REFERENCES estaciones(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_usuario_estacion_usuario_vigencia (usuario_id, fecha_fin),
    INDEX idx_usuario_estacion_estacion_vigencia (estacion_id, fecha_fin)
) ENGINE=InnoDB;

CREATE TABLE buses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL,
    placa VARCHAR(20) NOT NULL,
    capacidad_maxima SMALLINT UNSIGNED NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_buses_codigo UNIQUE (codigo),
    CONSTRAINT uq_buses_placa UNIQUE (placa),
    CONSTRAINT chk_buses_capacidad CHECK (capacidad_maxima > 0)
) ENGINE=InnoDB;

CREATE TABLE parqueos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    estacion_id INT UNSIGNED NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_parqueos_estacion_nombre UNIQUE (estacion_id, nombre),
    CONSTRAINT fk_parqueos_estacion
        FOREIGN KEY (estacion_id) REFERENCES estaciones(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE asignacion_bus_linea (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bus_id INT UNSIGNED NOT NULL,
    linea_id INT UNSIGNED NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_bus_linea_fechas CHECK (
        fecha_fin IS NULL OR fecha_fin >= fecha_inicio
    ),
    CONSTRAINT fk_bus_linea_bus
        FOREIGN KEY (bus_id) REFERENCES buses(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_bus_linea_linea
        FOREIGN KEY (linea_id) REFERENCES lineas(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_bus_linea_bus_vigencia (bus_id, fecha_fin),
    INDEX idx_bus_linea_linea_vigencia (linea_id, fecha_fin)
) ENGINE=InnoDB;

CREATE TABLE asignacion_bus_parqueo (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bus_id INT UNSIGNED NOT NULL,
    parqueo_id INT UNSIGNED NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_bus_parqueo_fechas CHECK (
        fecha_fin IS NULL OR fecha_fin >= fecha_inicio
    ),
    CONSTRAINT fk_bus_parqueo_bus
        FOREIGN KEY (bus_id) REFERENCES buses(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_bus_parqueo_parqueo
        FOREIGN KEY (parqueo_id) REFERENCES parqueos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_bus_parqueo_bus_vigencia (bus_id, fecha_fin),
    INDEX idx_bus_parqueo_parqueo_vigencia (parqueo_id, fecha_fin)
) ENGINE=InnoDB;

CREATE TABLE recorridos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    bus_id INT UNSIGNED NOT NULL,
    linea_id INT UNSIGNED NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NULL,
    estado VARCHAR(30) NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_recorridos_fechas CHECK (
        fecha_fin IS NULL OR fecha_fin >= fecha_inicio
    ),
    CONSTRAINT fk_recorridos_bus
        FOREIGN KEY (bus_id) REFERENCES buses(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_recorridos_linea
        FOREIGN KEY (linea_id) REFERENCES lineas(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_recorridos_bus_fecha (bus_id, fecha_inicio),
    INDEX idx_recorridos_linea_fecha (linea_id, fecha_inicio)
) ENGINE=InnoDB;

CREATE TABLE visitas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    recorrido_id BIGINT UNSIGNED NOT NULL,
    estacion_id INT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED NOT NULL,
    orden SMALLINT UNSIGNED NOT NULL,
    fecha_hora DATETIME NOT NULL,
    ocupacion SMALLINT UNSIGNED NOT NULL,
    demanda INT UNSIGNED NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_visitas_recorrido_orden UNIQUE (recorrido_id, orden),
    CONSTRAINT chk_visitas_orden CHECK (orden > 0),
    CONSTRAINT fk_visitas_recorrido
        FOREIGN KEY (recorrido_id) REFERENCES recorridos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_visitas_estacion
        FOREIGN KEY (estacion_id) REFERENCES estaciones(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_visitas_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_visitas_estacion_fecha (estacion_id, fecha_hora)
) ENGINE=InnoDB;

CREATE TABLE medios_acceso (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_medios_acceso_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

CREATE TABLE estacion_medio_acceso (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    estacion_id INT UNSIGNED NOT NULL,
    medio_acceso_id INT UNSIGNED NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_estacion_medio UNIQUE (estacion_id, medio_acceso_id),
    CONSTRAINT fk_estacion_medio_estacion
        FOREIGN KEY (estacion_id) REFERENCES estaciones(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_estacion_medio_medio
        FOREIGN KEY (medio_acceso_id) REFERENCES medios_acceso(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE registros_acceso (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    estacion_medio_acceso_id INT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED NOT NULL,
    fecha_registro DATE NOT NULL,
    cantidad INT UNSIGNED NOT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_registros_acceso_estacion_medio
        FOREIGN KEY (estacion_medio_acceso_id) REFERENCES estacion_medio_acceso(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_registros_acceso_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    INDEX idx_registros_acceso_fecha (fecha_registro),
    INDEX idx_registros_acceso_medio_fecha (estacion_medio_acceso_id, fecha_registro)
) ENGINE=InnoDB;
