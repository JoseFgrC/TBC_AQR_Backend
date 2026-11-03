import { db } from '../../config/db.js';
import TelegramService from '../notificaciones/telegram.service.js';
import { logger } from '../../utils/logger.js';

const INTERVAL_MS = 60_000;
let running = false;

// Avisa a los tutores de los alumnos que aún no registran entrada. sp_alumnos_sin_entrada solo devuelve
// alumnos cuando hoy hay clases, ya pasó la tolerancia, no es hora de salida y el aviso está activo.
export const sendAbsenceNotices = async () => {
	const [result] = await db.query('CALL sp_alumnos_sin_entrada()');
	const [alumnos, tutores] = result;
	let avisos = 0;
	for (const alumno of alumnos) {
		// Se reserva antes de enviar para no repetir el aviso (reinicios o varias instancias).
		const [reserva] = await db.query('CALL sp_registrar_aviso_falta(?, ?)', [alumno.id, alumno.fecha]);
		if (!reserva[0][0].registrado) continue;
		const chats = tutores.filter(tutor => tutor.id_alumno === alumno.id);
		const envios = await Promise.all(chats.map(tutor => TelegramService.notifyAbsence(tutor.telegram_chat_id, alumno.nombre, alumno)));
		const enviados = envios.filter(Boolean).length;
		// Si tenía tutores pero no salió ningún mensaje (Telegram caído), se libera para reintentar el siguiente minuto.
		if (chats.length && !enviados) {
			await db.query('DELETE FROM avisos_falta WHERE id_alumno = ? AND fecha = ?', [alumno.id, alumno.fecha]);
			continue;
		}
		await db.query('CALL sp_marcar_aviso_falta(?, ?, ?)', [alumno.id, alumno.fecha, enviados]);
		avisos += enviados;
	}
	if (alumnos.length) logger.info(`Aviso "no llegó": ${alumnos.length} alumno(s) sin entrada, ${avisos} aviso(s) enviados`);
	return { alumnos: alumnos.length, avisos };
};

const tick = async () => {
	if (running) return;
	running = true;
	try {
		await sendAbsenceNotices();
	} catch (error) {
		logger.error('Aviso "no llegó"', error.message);
	} finally {
		running = false;
	}
};

export const startAbsenceScheduler = () => {
	tick();
	return setInterval(tick, INTERVAL_MS);
};
