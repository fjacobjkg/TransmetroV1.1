-- Ejecutar con una cuenta administradora de MySQL. No cambia usuarios ni contraseñas.
CREATE DATABASE IF NOT EXISTS transmetro_v1_original CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON transmetro_v1_original.* TO 'transmetro_app'@'localhost';
