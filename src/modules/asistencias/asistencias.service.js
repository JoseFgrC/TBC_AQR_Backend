import { db } from '../../config/db.js';
import { AppError } from '../../middlewares/error.middlewares.js';
import TelegramService from '../notificaciones/telegram.service.js';
import { hoy } from '../horarios/horarios.service.js';

// Debe coincidir con v_minutos_minimos de sp_registrar_asistencia.
const MINUTOS_MINIMOS_SALIDA = 10;

// Contexto del QR rechazado para que el escáner muestre a quién pertenece y cuándo puede salir.
// Mismo criterio de "hoy" que el SP (CURDATE() de MySQL). null si el token no es de ningún alumno.
const scanErrorContext = async token => {
	const [rows] = await db.query(
		`SELECT a.id, a.nombre, a.grado, a.foto_url,
		        DATE_FORMAT(MAX(IF(s.tipo = 'entrada', s.fecha_hora, NULL)), '%H:%i') AS entrada,
		        DATE_FORMAT(MAX(IF(s.tipo = 'salida', s.fecha_hora, NULL)), '%H:%i') AS salida,
		        DATE_FORMAT(MAX(IF(s.tipo = 'entrada', s.fecha_hora, NULL)) + INTERVAL ? MINUTE, '%H:%i') AS salida_permitida_desde
		 FROM alumnos a
		 LEFT JOIN asistencias s ON s.id_alumno = a.id
		   AND s.fecha_hora >= CURDATE() AND s.fecha_hora < CURDATE() + INTERVAL 1 DAY
		 WHERE a.qr_token = ?
		 GROUP BY a.id`,
		[MINUTOS_MINIMOS_SALIDA, token],
	);
	const row = rows[0];
	if (!row) return undefined;
	return {
		alumno: { id: row.id, nombre: row.nombre, grado: row.grado, foto_url: row.foto_url },
		entrada: row.entrada,
		salida: row.salida,
		salida_permitida_desde: row.salida ? null : row.salida_permitida_desde,
	};
};

export default class AsistenciasService {
	static async scan(token, adminId) {
		// sp_registrar_asistencia devuelve: [0] alumno + asistencia, [1] tutores a los que hay que avisar.
		let result;
		try {
			[result] = await db.query('CALL sp_registrar_asistencia(?, ?)', [token, adminId]);
		} catch (error) {
			if (error.sqlState !== '45000') throw error;
			throw new AppError(error.sqlMessage, 400, undefined, await scanErrorContext(token).catch(() => undefined));
		}
		const registro = result[0][0];
		const tutores = result[1];
		const asistencia = { id: registro.id_asistencia, tipo: registro.tipo_registrado, estado: registro.estado, hora_programada: registro.hora_programada, fecha_hora: registro.fecha_hora };
		const envios = await Promise.all(tutores.map(tutor => TelegramService.notifyAttendance(tutor.telegram_chat_id, registro.nombre, asistencia)));
		const tutoresNotificados = envios.filter(Boolean).length;
		if (tutoresNotificados) await db.query('CALL sp_marcar_notificacion_enviada(?)', [asistencia.id]);
		return {
			alumno: { id: registro.id, nombre: registro.nombre, grado: registro.grado, foto_url: registro.foto_url },
			asistencia: { ...asistencia, notificacion_enviada: tutoresNotificados > 0, tutores_notificados: tutoresNotificados },
		};
	}

	static async history({ desde, hasta, alumnoId }) {
		const [result] = await db.query('CALL sp_historial_asistencias(?, ?, ?)', [alumnoId || null, desde || '1000-01-01', hasta || '9999-12-31']);
		return result[0];
	}

	// Resumen por alumno; por defecto del día 1 del mes actual a hoy.
	static async report({ desde, hasta, alumnoId }) {
		const fin = hasta || hoy();
		const inicio = desde || `${fin.slice(0, 8)}01`;
		if (inicio > fin) throw new AppError('"desde" debe ser anterior o igual a "hasta"', 400);
		if ((new Date(fin) - new Date(inicio)) / 86_400_000 > 366) throw new AppError('El rango máximo es de un año', 400);
		const [result] = await db.query('CALL sp_reporte_asistencia(?, ?, ?)', [inicio, fin, alumnoId || null]);
		return { desde: inicio, hasta: fin, alumnos: result[0] };
	}
}
