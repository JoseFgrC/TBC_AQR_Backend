-- =====================================================================
--  TBC AQR - Esquema completo de la base de datos (tablas + funciones + procedimientos)
--  Volcado de la BD real (2026-10-09): es la única fuente del esquema.
--  Incluye database/migraciones/2026-10-26_recuperacion_telegram.sql.
--  Crea la BD desde cero:  mysql -u root -p < database/schema.sql
--  Después crea la primera directora:  npm run crear-admin -- "Nombre" correo "contraseña"
--  Y ajusta el horario real con PUT /api/horarios/semana (viene lunes a viernes 13:00-18:00).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS TBC_AQR CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE TBC_AQR;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol` enum('directora','escaner') NOT NULL DEFAULT 'escaner',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `password_cambiado_en` datetime DEFAULT NULL,
  `telegram_chat_id` varchar(50) DEFAULT NULL,
  `telegram_vinculado_en` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `uq_admins_telegram_chat_id` (`telegram_chat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
-- Códigos de un solo uso de las cuentas (solo el HMAC-SHA256; uno vigente por cuenta y tipo).
CREATE TABLE `admin_codigos` (
  `id_admin` int NOT NULL,
  `tipo` enum('vincular_telegram','recuperar_password') NOT NULL,
  `codigo_hash` char(64) NOT NULL,
  `intentos` tinyint NOT NULL DEFAULT '0',
  `expira_en` datetime NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_admin`,`tipo`),
  KEY `idx_admin_codigos_hash` (`codigo_hash`),
  CONSTRAINT `fk_admin_codigos_admin` FOREIGN KEY (`id_admin`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `alumno_tutores` (
  `id_alumno` int NOT NULL,
  `id_padre` int NOT NULL,
  `parentesco` varchar(30) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_alumno`,`id_padre`),
  KEY `idx_alumno_tutores_padre` (`id_padre`),
  CONSTRAINT `fk_alumno_tutores_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_alumno_tutores_padre` FOREIGN KEY (`id_padre`) REFERENCES `padres` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `alumnos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `grado` varchar(20) DEFAULT NULL,
  `foto_url` varchar(500) DEFAULT NULL,
  `qr_token` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `qr_token` (`qr_token`),
  KEY `idx_qr_token` (`qr_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `asistencias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_alumno` int NOT NULL,
  `tipo` enum('entrada','salida') NOT NULL,
  `estado` enum('puntual','retardo','anticipada') DEFAULT NULL,
  `hora_programada` time DEFAULT NULL,
  `fecha_hora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `registrado_por` int DEFAULT NULL,
  `notificacion_enviada` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `registrado_por` (`registrado_por`),
  KEY `idx_alumno_fecha` (`id_alumno`,`fecha_hora`),
  CONSTRAINT `asistencias_ibfk_1` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id`),
  CONSTRAINT `asistencias_ibfk_2` FOREIGN KEY (`registrado_por`) REFERENCES `admins` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `avisos_falta` (
  `id_alumno` int NOT NULL,
  `fecha` date NOT NULL,
  `tutores_notificados` tinyint NOT NULL DEFAULT '0',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_alumno`,`fecha`),
  CONSTRAINT `fk_avisos_falta_alumno` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `configuracion` (
  `id` tinyint NOT NULL DEFAULT '1',
  `tolerancia_minutos` smallint NOT NULL DEFAULT '15',
  `consejo_tecnico_ultimo_viernes` tinyint(1) NOT NULL DEFAULT '1',
  `aviso_no_llego` tinyint(1) NOT NULL DEFAULT '1',
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_configuracion_tolerancia` CHECK ((`tolerancia_minutos` between 0 and 240)),
  CONSTRAINT `chk_configuracion_unica` CHECK ((`id` = 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `credenciales_historial` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_alumno` int NOT NULL,
  `qr_token_anterior` varchar(100) DEFAULT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `id_alumno` (`id_alumno`),
  CONSTRAINT `credenciales_historial_ibfk_1` FOREIGN KEY (`id_alumno`) REFERENCES `alumnos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `dias_especiales` (
  `fecha` date NOT NULL,
  `tipo` enum('sin_clases','horario_especial') NOT NULL,
  `hora_entrada` time DEFAULT NULL,
  `hora_salida` time DEFAULT NULL,
  `descripcion` varchar(150) DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`fecha`),
  CONSTRAINT `chk_dias_especiales_horas` CHECK ((((`tipo` = _utf8mb4'sin_clases') and (`hora_entrada` is null) and (`hora_salida` is null)) or ((`tipo` = _utf8mb4'horario_especial') and (`hora_entrada` < `hora_salida`))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `horarios` (
  `dia_semana` tinyint NOT NULL,
  `hora_entrada` time NOT NULL,
  `hora_salida` time NOT NULL,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`dia_semana`),
  CONSTRAINT `chk_horarios_dia` CHECK ((`dia_semana` between 1 and 7)),
  CONSTRAINT `chk_horarios_horas` CHECK ((`hora_entrada` < `hora_salida`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE `padres` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `telegram_chat_id` varchar(50) DEFAULT NULL,
  `telegram_vinculado` tinyint(1) NOT NULL DEFAULT '0',
  `notificaciones_activas` tinyint(1) NOT NULL DEFAULT '1',
  `codigo_vinculacion` varchar(40) DEFAULT NULL,
  `codigo_expira` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `telegram_chat_id` (`telegram_chat_id`),
  UNIQUE KEY `uq_padres_codigo_vinculacion` (`codigo_vinculacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Datos iniciales (la directora los ajusta desde el panel)
INSERT INTO configuracion (id) VALUES (1);
INSERT INTO horarios (dia_semana, hora_entrada, hora_salida) VALUES
    (1, '13:00', '18:00'), (2, '13:00', '18:00'), (3, '13:00', '18:00'),
    (4, '13:00', '18:00'), (5, '13:00', '18:00');

DELIMITER ;;
CREATE FUNCTION `fn_hora_entrada`(p_fecha DATE) RETURNS time
    READS SQL DATA
BEGIN
    RETURN COALESCE(
        (SELECT hora_entrada FROM dias_especiales WHERE fecha = p_fecha AND tipo = 'horario_especial'),
        (SELECT hora_entrada FROM horarios WHERE dia_semana = WEEKDAY(p_fecha) + 1)
    );
END ;;
DELIMITER ;
DELIMITER ;;
CREATE FUNCTION `fn_hora_salida`(p_fecha DATE) RETURNS time
    READS SQL DATA
BEGIN
    RETURN COALESCE(
        (SELECT hora_salida FROM dias_especiales WHERE fecha = p_fecha AND tipo = 'horario_especial'),
        (SELECT hora_salida FROM horarios WHERE dia_semana = WEEKDAY(p_fecha) + 1)
    );
END ;;
DELIMITER ;
DELIMITER ;;
CREATE FUNCTION `fn_motivo_sin_clases`(p_fecha DATE) RETURNS varchar(150) CHARSET utf8mb4
    READS SQL DATA
BEGIN
    DECLARE v_tipo VARCHAR(20);
    DECLARE v_descripcion VARCHAR(150);
    DECLARE v_consejo BOOLEAN;

    SELECT tipo, descripcion INTO v_tipo, v_descripcion
    FROM dias_especiales WHERE fecha = p_fecha;

    IF v_tipo = 'sin_clases' THEN
        RETURN COALESCE(v_descripcion, 'Día sin clases');
    ELSEIF v_tipo = 'horario_especial' THEN
        RETURN NULL;
    END IF;

    SELECT consejo_tecnico_ultimo_viernes INTO v_consejo FROM configuracion WHERE id = 1;
    
    IF v_consejo AND WEEKDAY(p_fecha) = 4 AND MONTH(p_fecha + INTERVAL 7 DAY) <> MONTH(p_fecha) THEN
        RETURN 'Consejo Técnico Escolar';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM horarios WHERE dia_semana = WEEKDAY(p_fecha) + 1) THEN
        RETURN 'Sin clases este día';
    END IF;

    RETURN NULL;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_actualizar_alumno`(
 IN p_id INT,
    IN p_nombre VARCHAR(150),
    IN p_grado VARCHAR(20),
    IN p_foto_url VARCHAR(500)
)
BEGIN
    UPDATE alumnos
    SET nombre = p_nombre,
        grado = p_grado,
        foto_url = COALESCE(p_foto_url, foto_url)
    WHERE id = p_id;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_actualizar_configuracion`(
    IN p_tolerancia_minutos SMALLINT,
    IN p_consejo_tecnico BOOLEAN,
    IN p_aviso_no_llego BOOLEAN
)
BEGIN
    UPDATE configuracion
    SET tolerancia_minutos = COALESCE(p_tolerancia_minutos, tolerancia_minutos),
        consejo_tecnico_ultimo_viernes = COALESCE(p_consejo_tecnico, consejo_tecnico_ultimo_viernes),
        aviso_no_llego = COALESCE(p_aviso_no_llego, aviso_no_llego)
    WHERE id = 1;

    SELECT tolerancia_minutos, consejo_tecnico_ultimo_viernes, aviso_no_llego
    FROM configuracion WHERE id = 1;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_actualizar_notificaciones`(
    IN p_id_padre INT,
    IN p_activas BOOLEAN
)
BEGIN
    UPDATE padres
    SET notificaciones_activas = p_activas
    WHERE id = p_id_padre;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_alumnos_sin_entrada`()
BEGIN
    DECLARE v_hoy DATE DEFAULT CURDATE();
    DECLARE v_entrada DATETIME;
    DECLARE v_salida DATETIME;
    DECLARE v_aplica BOOLEAN DEFAULT FALSE;

    IF fn_motivo_sin_clases(v_hoy) IS NULL THEN
        SET v_entrada = TIMESTAMP(v_hoy, fn_hora_entrada(v_hoy));
        SET v_salida = TIMESTAMP(v_hoy, fn_hora_salida(v_hoy));
        SELECT aviso_no_llego AND NOW() >= v_entrada + INTERVAL tolerancia_minutos MINUTE AND NOW() < v_salida
        INTO v_aplica
        FROM configuracion WHERE id = 1;
    END IF;

    DROP TEMPORARY TABLE IF EXISTS tmp_sin_entrada;
    CREATE TEMPORARY TABLE tmp_sin_entrada (id INT PRIMARY KEY, nombre VARCHAR(150));

    IF v_aplica THEN
        INSERT INTO tmp_sin_entrada (id, nombre)
        SELECT a.id, a.nombre
        FROM alumnos a
        WHERE a.activo = TRUE
          AND a.creado_en < v_entrada
          AND NOT EXISTS (SELECT 1 FROM asistencias s
                          WHERE s.id_alumno = a.id AND s.tipo = 'entrada'
                            AND s.fecha_hora >= v_hoy AND s.fecha_hora < v_hoy + INTERVAL 1 DAY)
          AND NOT EXISTS (SELECT 1 FROM avisos_falta f WHERE f.id_alumno = a.id AND f.fecha = v_hoy);
    END IF;

    SELECT id, nombre, v_hoy AS fecha, TIME_FORMAT(v_entrada, '%H:%i') AS hora_entrada
    FROM tmp_sin_entrada ORDER BY nombre;

    SELECT t.id_alumno, p.telegram_chat_id
    FROM tmp_sin_entrada x
    JOIN alumno_tutores t ON t.id_alumno = x.id
    JOIN padres p ON p.id = t.id_padre
    WHERE p.telegram_vinculado = TRUE
      AND p.notificaciones_activas = TRUE
      AND p.telegram_chat_id IS NOT NULL;

    DROP TEMPORARY TABLE tmp_sin_entrada;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_asignar_tutor`(
    IN p_id_alumno INT,
    IN p_id_padre INT,
    IN p_parentesco VARCHAR(30)
)
BEGIN
    INSERT INTO alumno_tutores (id_alumno, id_padre, parentesco)
    VALUES (p_id_alumno, p_id_padre, p_parentesco)
    ON DUPLICATE KEY UPDATE parentesco = VALUES(parentesco);
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_cambiar_estado_admin`(
    IN p_id INT,
    IN p_activo BOOLEAN
)
BEGIN
    UPDATE admins SET activo = p_activo WHERE id = p_id;
    SELECT ROW_COUNT() AS actualizados;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_cambiar_password_admin`(
    IN p_id INT,
    IN p_password_hash VARCHAR(255)
)
BEGIN
    UPDATE admins SET password_hash = p_password_hash, password_cambiado_en = NOW() WHERE id = p_id;
    SELECT ROW_COUNT() AS actualizados;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_crear_admin`(
    IN p_nombre VARCHAR(100),
    IN p_email VARCHAR(150),
    IN p_password_hash VARCHAR(255),
    IN p_rol VARCHAR(20)
)
BEGIN
    IF EXISTS (SELECT 1 FROM admins WHERE email = p_email) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El email ya está registrado';
    END IF;

    INSERT INTO admins (nombre, email, password_hash, rol, activo)
    VALUES (p_nombre, p_email, p_password_hash, p_rol, TRUE);

    SELECT LAST_INSERT_ID() AS id_admin;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_crear_alumno`(
    IN p_nombre VARCHAR(150),
    IN p_grado VARCHAR(20),
    IN p_foto_url VARCHAR(500),
    IN p_qr_token VARCHAR(100)
)
BEGIN
    INSERT INTO alumnos (nombre, grado, foto_url, qr_token)
    VALUES (p_nombre, p_grado, p_foto_url, p_qr_token);

    SELECT LAST_INSERT_ID() AS id_alumno;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_crear_padre`(
IN p_nombre VARCHAR(150),
    IN p_telefono VARCHAR(20)
)
BEGIN
    INSERT INTO padres (nombre, telefono)
    VALUES (p_nombre, p_telefono);

    SELECT LAST_INSERT_ID() AS id_padre;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_eliminar_dia_especial`(IN p_fecha DATE)
BEGIN
    DELETE FROM dias_especiales WHERE fecha = p_fecha;
    SELECT ROW_COUNT() AS eliminados;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_guardar_dia_especial`(
    IN p_fecha DATE,
    IN p_tipo VARCHAR(20),
    IN p_hora_entrada TIME,
    IN p_hora_salida TIME,
    IN p_descripcion VARCHAR(150)
)
BEGIN
    IF p_tipo = 'horario_especial' AND (p_hora_entrada IS NULL OR p_hora_salida IS NULL) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El horario especial necesita hora de entrada y de salida';
    END IF;
    IF p_tipo = 'horario_especial' AND p_hora_entrada >= p_hora_salida THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La hora de entrada debe ser anterior a la de salida';
    END IF;

    INSERT INTO dias_especiales (fecha, tipo, hora_entrada, hora_salida, descripcion)
    VALUES (p_fecha, p_tipo,
            IF(p_tipo = 'horario_especial', p_hora_entrada, NULL),
            IF(p_tipo = 'horario_especial', p_hora_salida, NULL),
            p_descripcion)
    ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), hora_entrada = VALUES(hora_entrada),
                            hora_salida = VALUES(hora_salida), descripcion = VALUES(descripcion);
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_guardar_horario_dia`(
    IN p_dia_semana TINYINT,
    IN p_hora_entrada TIME,
    IN p_hora_salida TIME
)
BEGIN
    IF p_hora_entrada IS NULL THEN
        DELETE FROM horarios WHERE dia_semana = p_dia_semana;
    ELSEIF p_hora_entrada >= p_hora_salida THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La hora de entrada debe ser anterior a la de salida';
    ELSE
        INSERT INTO horarios (dia_semana, hora_entrada, hora_salida)
        VALUES (p_dia_semana, p_hora_entrada, p_hora_salida)
        ON DUPLICATE KEY UPDATE hora_entrada = VALUES(hora_entrada), hora_salida = VALUES(hora_salida);
    END IF;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_historial_asistencias`(
    IN p_id_alumno INT,
    IN p_fecha_inicio DATE,
    IN p_fecha_fin DATE
)
BEGIN
    SELECT asi.id, a.nombre AS alumno, a.grado, asi.tipo, asi.estado,
           TIME_FORMAT(asi.hora_programada, '%H:%i') AS hora_programada, asi.fecha_hora
    FROM asistencias asi
    JOIN alumnos a ON a.id = asi.id_alumno
    WHERE (p_id_alumno IS NULL OR asi.id_alumno = p_id_alumno)
      AND DATE(asi.fecha_hora) BETWEEN p_fecha_inicio AND p_fecha_fin
    ORDER BY asi.fecha_hora DESC;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_horario_de_fecha`(IN p_fecha DATE)
BEGIN
    DECLARE v_motivo VARCHAR(150) DEFAULT fn_motivo_sin_clases(p_fecha);

    SELECT p_fecha AS fecha,
           v_motivo IS NULL AS hay_clases,
           v_motivo AS motivo,
           IF(v_motivo IS NULL, TIME_FORMAT(fn_hora_entrada(p_fecha), '%H:%i'), NULL) AS hora_entrada,
           IF(v_motivo IS NULL, TIME_FORMAT(fn_hora_salida(p_fecha), '%H:%i'), NULL) AS hora_salida,
           IF(v_motivo IS NULL, TIME_FORMAT(fn_hora_entrada(p_fecha) + INTERVAL c.tolerancia_minutos MINUTE, '%H:%i'), NULL) AS limite_puntual,
           (SELECT tipo FROM dias_especiales WHERE fecha = p_fecha) AS dia_especial
    FROM configuracion c WHERE c.id = 1;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_listar_admins`()
BEGIN
    SELECT id, nombre, email, rol, activo, creado_en, password_cambiado_en
    FROM admins
    ORDER BY rol, nombre;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_listar_alumnos`()
BEGIN
    SELECT a.id, a.nombre, a.grado, a.foto_url, a.activo,
           COUNT(t.id_padre) AS total_tutores,
           CAST(COALESCE(SUM(p.telegram_vinculado), 0) AS UNSIGNED) AS tutores_con_telegram,
           GROUP_CONCAT(p.nombre ORDER BY p.nombre SEPARATOR ', ') AS tutores
    FROM alumnos a
    LEFT JOIN alumno_tutores t ON t.id_alumno = a.id
    LEFT JOIN padres p ON p.id = t.id_padre
    GROUP BY a.id
    ORDER BY a.nombre;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_listar_dias_especiales`(IN p_desde DATE, IN p_hasta DATE)
BEGIN
    SELECT fecha, tipo, TIME_FORMAT(hora_entrada, '%H:%i') AS hora_entrada,
           TIME_FORMAT(hora_salida, '%H:%i') AS hora_salida, descripcion
    FROM dias_especiales
    WHERE fecha BETWEEN p_desde AND p_hasta
    ORDER BY fecha;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_marcar_aviso_falta`(IN p_id_alumno INT, IN p_fecha DATE, IN p_tutores TINYINT)
BEGIN
    UPDATE avisos_falta SET tutores_notificados = p_tutores
    WHERE id_alumno = p_id_alumno AND fecha = p_fecha;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_marcar_notificacion_enviada`(
IN p_id_asistencia INT
)
BEGIN
    UPDATE asistencias
    SET notificacion_enviada = TRUE
    WHERE id = p_id_asistencia;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_obtener_admin_por_email`(
    IN p_email VARCHAR(150)
)
BEGIN
    SELECT id, nombre, email, password_hash, rol, activo
    FROM admins
    WHERE email = p_email
    LIMIT 1;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_obtener_admin_por_id`(
    IN p_id INT
)
BEGIN
    SELECT id, nombre, email, password_hash, rol, activo,
           UNIX_TIMESTAMP(password_cambiado_en) AS password_cambiado_ts
    FROM admins
    WHERE id = p_id;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_obtener_alumno`(IN p_id INT)
BEGIN
    SELECT * FROM alumnos WHERE id = p_id;

    SELECT p.id, p.nombre, p.telefono, t.parentesco,
           p.telegram_vinculado, p.notificaciones_activas
    FROM alumno_tutores t
    JOIN padres p ON p.id = t.id_padre
    WHERE t.id_alumno = p_id
    ORDER BY p.nombre;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_obtener_horarios`()
BEGIN
    SELECT dia_semana, TIME_FORMAT(hora_entrada, '%H:%i') AS hora_entrada, TIME_FORMAT(hora_salida, '%H:%i') AS hora_salida
    FROM horarios ORDER BY dia_semana;

    SELECT tolerancia_minutos, consejo_tecnico_ultimo_viernes, aviso_no_llego
    FROM configuracion WHERE id = 1;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_quitar_tutor`(
    IN p_id_alumno INT,
    IN p_id_padre INT
)
BEGIN
    DELETE FROM alumno_tutores WHERE id_alumno = p_id_alumno AND id_padre = p_id_padre;
    SELECT ROW_COUNT() AS eliminados;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_regenerar_qr`(
IN p_id_alumno INT,
    IN p_nuevo_token VARCHAR(100),
    IN p_motivo VARCHAR(255)
)
BEGIN
    DECLARE v_token_anterior VARCHAR(100);

    SELECT qr_token INTO v_token_anterior FROM alumnos WHERE id = p_id_alumno;

    INSERT INTO credenciales_historial (id_alumno, qr_token_anterior, motivo)
    VALUES (p_id_alumno, v_token_anterior, p_motivo);

    UPDATE alumnos SET qr_token = p_nuevo_token WHERE id = p_id_alumno;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_registrar_asistencia`(
    IN p_qr_token VARCHAR(100),
    IN p_registrado_por INT
)
BEGIN
    DECLARE v_minutos_minimos INT DEFAULT 10;
    DECLARE v_id_alumno INT;
    DECLARE v_activo BOOLEAN;
    DECLARE v_entrada DATETIME;
    DECLARE v_salida DATETIME;
    DECLARE v_nuevo_tipo ENUM('entrada','salida');
    DECLARE v_estado ENUM('puntual','retardo','anticipada');
    DECLARE v_ahora DATETIME DEFAULT NOW();
    DECLARE v_motivo VARCHAR(150);
    DECLARE v_hora_entrada TIME;
    DECLARE v_hora_salida TIME;
    DECLARE v_hora_programada TIME;
    DECLARE v_tolerancia INT;
    DECLARE v_id_asistencia INT;
    DECLARE v_mensaje VARCHAR(200);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT id, activo INTO v_id_alumno, v_activo
    FROM alumnos
    WHERE qr_token = p_qr_token
    LIMIT 1
    FOR UPDATE;

    IF v_id_alumno IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'QR no reconocido';
    END IF;

    IF v_activo = FALSE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Alumno inactivo';
    END IF;

    SET v_motivo = fn_motivo_sin_clases(DATE(v_ahora));
    IF v_motivo IS NOT NULL THEN
        SET v_mensaje = CONCAT('Hoy no hay clases (', v_motivo, ')');
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_mensaje;
    END IF;

    SET v_hora_entrada = fn_hora_entrada(DATE(v_ahora));
    SET v_hora_salida = fn_hora_salida(DATE(v_ahora));
    SELECT tolerancia_minutos INTO v_tolerancia FROM configuracion WHERE id = 1;

    SELECT MAX(IF(tipo = 'entrada', fecha_hora, NULL)), MAX(IF(tipo = 'salida', fecha_hora, NULL))
    INTO v_entrada, v_salida
    FROM asistencias
    WHERE id_alumno = v_id_alumno
      AND fecha_hora >= CURDATE() AND fecha_hora < CURDATE() + INTERVAL 1 DAY;

    IF v_entrada IS NULL THEN
        SET v_nuevo_tipo = 'entrada';
        SET v_hora_programada = v_hora_entrada;
        SET v_estado = IF(v_ahora > TIMESTAMP(DATE(v_ahora), v_hora_entrada) + INTERVAL v_tolerancia MINUTE, 'retardo', 'puntual');
    ELSEIF v_salida IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El alumno ya registró su entrada y su salida hoy';
    ELSEIF TIMESTAMPDIFF(MINUTE, v_entrada, v_ahora) < v_minutos_minimos THEN
        SET v_mensaje = CONCAT('Entrada ya registrada a las ', DATE_FORMAT(v_entrada, '%H:%i'),
                               '. La salida se permite después de ', v_minutos_minimos, ' minutos');
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_mensaje;
    ELSE
        SET v_nuevo_tipo = 'salida';
        SET v_hora_programada = v_hora_salida;
        SET v_estado = IF(v_ahora < TIMESTAMP(DATE(v_ahora), v_hora_salida), 'anticipada', 'puntual');
    END IF;

    INSERT INTO asistencias (id_alumno, tipo, estado, hora_programada, fecha_hora, registrado_por)
    VALUES (v_id_alumno, v_nuevo_tipo, v_estado, v_hora_programada, v_ahora, p_registrado_por);
    SET v_id_asistencia = LAST_INSERT_ID();

    COMMIT;

    SELECT v_id_asistencia AS id_asistencia,
           a.id, a.nombre, a.grado, a.foto_url,
           v_nuevo_tipo AS tipo_registrado, v_estado AS estado,
           TIME_FORMAT(v_hora_programada, '%H:%i') AS hora_programada,
           v_ahora AS fecha_hora
    FROM alumnos a
    WHERE a.id = v_id_alumno;

    SELECT p.id, p.nombre, p.telegram_chat_id
    FROM alumno_tutores t
    JOIN padres p ON p.id = t.id_padre
    WHERE t.id_alumno = v_id_alumno
      AND p.telegram_vinculado = TRUE
      AND p.notificaciones_activas = TRUE
      AND p.telegram_chat_id IS NOT NULL;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_registrar_aviso_falta`(IN p_id_alumno INT, IN p_fecha DATE)
BEGIN
    INSERT IGNORE INTO avisos_falta (id_alumno, fecha) VALUES (p_id_alumno, p_fecha);
    SELECT ROW_COUNT() AS registrado;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_reporte_asistencia`(
    IN p_desde DATE,
    IN p_hasta DATE,
    IN p_id_alumno INT
)
BEGIN
    DECLARE v_tolerancia INT;
    SELECT tolerancia_minutos INTO v_tolerancia FROM configuracion WHERE id = 1;

    WITH RECURSIVE dias AS (
        SELECT p_desde AS fecha
        UNION ALL
        SELECT fecha + INTERVAL 1 DAY FROM dias WHERE fecha < LEAST(p_hasta, CURDATE())
    ),
    clases AS (
        SELECT fecha FROM dias
        WHERE fecha <= CURDATE()
          AND fn_motivo_sin_clases(fecha) IS NULL
          AND (fecha < CURDATE() OR NOW() >= TIMESTAMP(fecha, fn_hora_entrada(fecha)) + INTERVAL v_tolerancia MINUTE)
    )
    SELECT a.id, a.nombre, a.grado,
           COUNT(c.fecha) AS dias_clase,
           COUNT(e.id) AS asistencias,
           CAST(COALESCE(SUM(e.estado = 'puntual'), 0) AS UNSIGNED) AS puntuales,
           CAST(COALESCE(SUM(e.estado = 'retardo'), 0) AS UNSIGNED) AS retardos,
           COUNT(c.fecha) - COUNT(e.id) AS faltas,
           CAST(COALESCE(SUM(s.estado = 'anticipada'), 0) AS UNSIGNED) AS salidas_anticipadas,
           GROUP_CONCAT(IF(c.fecha IS NOT NULL AND e.id IS NULL, DATE_FORMAT(c.fecha, '%Y-%m-%d'), NULL) ORDER BY c.fecha SEPARATOR ', ') AS fechas_falta
    FROM alumnos a
    LEFT JOIN clases c ON c.fecha >= DATE(a.creado_en)
    LEFT JOIN asistencias e ON e.id_alumno = a.id AND e.tipo = 'entrada'
         AND e.fecha_hora >= c.fecha AND e.fecha_hora < c.fecha + INTERVAL 1 DAY
    LEFT JOIN asistencias s ON s.id_alumno = a.id AND s.tipo = 'salida'
         AND s.fecha_hora >= c.fecha AND s.fecha_hora < c.fecha + INTERVAL 1 DAY
    WHERE a.activo = TRUE AND (p_id_alumno IS NULL OR a.id = p_id_alumno)
    GROUP BY a.id
    ORDER BY a.grado, a.nombre;
END ;;
DELIMITER ;
DELIMITER ;;
CREATE PROCEDURE `sp_vincular_telegram`(
IN p_id_padre INT,
    IN p_chat_id VARCHAR(50)
)
BEGIN
    UPDATE padres
    SET telegram_chat_id = p_chat_id,
        telegram_vinculado = TRUE
    WHERE id = p_id_padre;
END ;;
DELIMITER ;


SET FOREIGN_KEY_CHECKS = 1;
