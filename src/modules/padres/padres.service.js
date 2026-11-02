import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { db } from '../../config/db.js';
import { AppError } from '../../middlewares/error.middlewares.js';
import TelegramService from '../notificaciones/telegram.service.js';
import { ADMIN_LINK_PREFIX } from '../auth/recuperacion.logic.js';

const COLUMNS = 'p.id, p.nombre, p.telefono, p.telegram_chat_id, p.telegram_vinculado, p.notificaciones_activas, p.creado_en';
const LINK_DAYS = 7;

export default class PadresService {
	static async create({ nombre, telefono }) {
		const [result] = await db.query('CALL sp_crear_padre(?, ?)', [nombre, telefono || null]);
		return { id: result[0][0].id_padre };
	}

	static async list() {
		const [rows] = await db.query(`SELECT ${COLUMNS}, COUNT(t.id_alumno) AS total_alumnos FROM padres p LEFT JOIN alumno_tutores t ON t.id_padre = p.id GROUP BY p.id ORDER BY p.nombre`);
		return rows;
	}

	static async findById(id) {
		const [rows] = await db.query(`SELECT ${COLUMNS} FROM padres p WHERE p.id = ?`, [id]);
		if (!rows[0]) throw new AppError('Padre no encontrado', 404);
		return rows[0];
	}

	static async detail(id) {
		const padre = await this.findById(id);
		const [alumnos] = await db.query('SELECT a.id, a.nombre, a.grado, a.activo, t.parentesco FROM alumno_tutores t JOIN alumnos a ON a.id = t.id_alumno WHERE t.id_padre = ? ORDER BY a.nombre', [id]);
		return { ...padre, alumnos };
	}

	// Tutores del alumno; lista vacía si es mayor de edad o independiente.
	static async byAlumno(alumnoId) {
		const [alumno] = await db.query('SELECT id FROM alumnos WHERE id = ?', [alumnoId]);
		if (!alumno[0]) throw new AppError('Alumno no encontrado', 404);
		const [rows] = await db.query(`SELECT ${COLUMNS}, t.parentesco FROM alumno_tutores t JOIN padres p ON p.id = t.id_padre WHERE t.id_alumno = ? ORDER BY p.nombre`, [alumnoId]);
		return rows;
	}

	static async updateNotification(id, activo) {
		await this.findById(id);
		await db.query('CALL sp_actualizar_notificaciones(?, ?)', [id, activo]);
	}

	static async linkTelegram(id, telegramChatId) {
		await this.findById(id);
		await db.query('CALL sp_vincular_telegram(?, ?)', [id, telegramChatId]);
	}

	static async unlinkTelegram(id) {
		await this.findById(id);
		await db.query('UPDATE padres SET telegram_chat_id = NULL, telegram_vinculado = FALSE WHERE id = ?', [id]);
	}

	// Genera un enlace de un solo uso t.me/<bot>?start=<codigo> para que el padre se vincule solo.
	static async createTelegramLink(id) {
		await this.findById(id);
		const username = await TelegramService.username();
		// Los que empiezan con 'adm_' son de las cuentas de la escuela (el bot los separa por ese prefijo).
		let codigo;
		do codigo = crypto.randomBytes(16).toString('base64url'); while (codigo.startsWith(ADMIN_LINK_PREFIX));
		await db.query('UPDATE padres SET codigo_vinculacion = ?, codigo_expira = NOW() + INTERVAL ? DAY WHERE id = ?', [codigo, LINK_DAYS, id]);
		const [[{ codigo_expira: expira }]] = await db.query('SELECT codigo_expira FROM padres WHERE id = ?', [id]);
		const url = `https://t.me/${username}?start=${codigo}`;
		return { url, qrDataUrl: await QRCode.toDataURL(url), expira };
	}

	static async linkByCode(codigo, chatId) {
		const [rows] = await db.query('SELECT id, nombre FROM padres WHERE codigo_vinculacion = ? AND codigo_expira > NOW()', [codigo]);
		const padre = rows[0];
		if (!padre) return null;
		await db.query('CALL sp_vincular_telegram(?, ?)', [padre.id, chatId]);
		await db.query('UPDATE padres SET codigo_vinculacion = NULL, codigo_expira = NULL WHERE id = ?', [padre.id]);
		const [alumnos] = await db.query('SELECT a.nombre FROM alumno_tutores t JOIN alumnos a ON a.id = t.id_alumno WHERE t.id_padre = ? AND a.activo = TRUE ORDER BY a.nombre', [padre.id]);
		return { nombre: padre.nombre, alumnos: alumnos.map(alumno => alumno.nombre) };
	}
}
