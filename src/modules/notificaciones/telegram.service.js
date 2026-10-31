import { createRequire } from 'node:module';
import { env } from '../../config/env.js';
import { AppError } from '../../middlewares/error.middlewares.js';
import { logger } from '../../utils/logger.js';

const require = createRequire(import.meta.url);
const TelegramBot = require('node-telegram-bot-api');
const bot = env.telegram.botToken ? new TelegramBot(env.telegram.botToken, { polling: env.telegram.polling }) : null;
bot?.on('polling_error', error => logger.error('Telegram polling', error.message));

let botUsername;

// Texto del aviso según tipo y estado del registro (sp_registrar_asistencia).
const ATTENDANCE_TEXT = {
	entrada: {
		puntual: { titulo: '✅ ENTRÓ a la escuela' },
		retardo: { titulo: '⚠️ ENTRÓ CON RETARDO a la escuela', programada: 'entrada' },
	},
	salida: {
		puntual: { titulo: '🏠 SALIÓ de la escuela' },
		anticipada: { titulo: '🏠 SALIÓ ANTES de su horario', programada: 'salida' },
	},
};

// '2026-10-02 08:15:00' -> { fecha: '02/10/2026', hora: '08:15' } (la BD guarda hora local de México).
const formatFechaHora = fechaHora => {
	const [fecha, hora] = String(fechaHora).split(' ');
	const [anio, mes, dia] = fecha.split('-');
	return { fecha: `${dia}/${mes}/${anio}`, hora: hora.slice(0, 5) };
};

export default class TelegramService {
	static get enabled() {
		return Boolean(bot);
	}

	static async username() {
		if (!bot) throw new AppError('Telegram no está configurado (falta TELEGRAM_BOT_TOKEN)', 503);
		botUsername ??= (await bot.getMe()).username;
		return botUsername;
	}

	static async send(chatId, text) {
		if (bot) await bot.sendMessage(chatId, text);
	}

	// Recibe /start [codigo]; el código llega cuando el padre abre t.me/<bot>?start=<codigo>.
	// chatType: 'private', 'group', 'supergroup' o 'channel'.
	static onStart(handler) {
		bot?.onText(/^\/start(?:\s+(\S+))?/, (message, match) => handler(String(message.chat.id), match[1], message.chat.type));
	}

	// Avisa a un tutor; sp_registrar_asistencia ya filtra a los que tienen Telegram vinculado y avisos activos.
	static async notifyAttendance(chatId, alumnoNombre, asistencia) {
		const { fecha, hora } = formatFechaHora(asistencia.fecha_hora);
		const { titulo, programada } = ATTENDANCE_TEXT[asistencia.tipo][asistencia.estado ?? 'puntual'];
		const detalle = programada && asistencia.hora_programada ? ` (${programada}: ${asistencia.hora_programada})` : '';
		return this.notify(chatId, `${alumnoNombre}\n${titulo}\n\n📅 ${fecha}\n🕐 ${hora} hrs${detalle}\n🏫 ${env.schoolName}`);
	}

	// Aviso de que el alumno no ha registrado su entrada cuando ya pasó la tolerancia.
	static async notifyAbsence(chatId, alumnoNombre, { fecha, hora_entrada }) {
		const [anio, mes, dia] = String(fecha).split('-');
		return this.notify(chatId, `${alumnoNombre}\n⚠️ NO ha registrado su entrada hoy\n\n📅 ${dia}/${mes}/${anio}\n🕐 Entrada: ${hora_entrada} hrs\n🏫 ${env.schoolName}\n\nSi llega más tarde, te avisaremos aquí.`);
	}

	static async notify(chatId, text) {
		if (!bot || !chatId) return false;
		try {
			await bot.sendMessage(chatId, text);
			return true;
		} catch (error) {
			logger.error('No se pudo enviar Telegram', error.message);
			return false;
		}
	}
}
