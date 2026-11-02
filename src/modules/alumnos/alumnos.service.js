import { db } from '../../config/db.js';
import { AppError } from '../../middlewares/error.middlewares.js';
import { createQrToken } from '../../utils/qr-token.js';
import QrService from '../credenciales/qr.service.js';
import PadresService from '../padres/padres.service.js';
import { savePhoto } from './fotos.service.js';

export default class AlumnosService {
	// `tutores` es opcional: un alumno mayor de edad o independiente se crea sin tutores.
	static async create({ nombre, grado, foto_url, tutores = [] }) {
		for (const tutor of tutores) await PadresService.findById(tutor.id_padre);
		const token = createQrToken();
		const connection = await db.getConnection();
		try {
			await connection.beginTransaction();
			const [result] = await connection.query('CALL sp_crear_alumno(?, ?, ?, ?)', [nombre, grado || null, foto_url || null, token]);
			const id = result[0][0].id_alumno;
			for (const tutor of tutores) await connection.query('CALL sp_asignar_tutor(?, ?, ?)', [id, tutor.id_padre, tutor.parentesco || null]);
			await connection.commit();
			return { id, credencial: await QrService.build(id, token) };
		} catch (error) {
			await connection.rollback();
			throw error;
		} finally {
			connection.release();
		}
	}

	static async list({ search = '', page = 1, limit = 20 }) {
		const [result] = await db.query('CALL sp_listar_alumnos()');
		const term = String(search).trim().toLowerCase();
		const rows = term
			? result[0].filter(alumno => `${alumno.nombre} ${alumno.grado ?? ''} ${alumno.tutores ?? ''}`.toLowerCase().includes(term))
			: result[0];
		const size = Math.min(Math.max(Number(limit) || 20, 1), 100);
		const current = Math.max(Number(page) || 1, 1);
		return { total: rows.length, page: current, limit: size, items: rows.slice((current - 1) * size, current * size) };
	}

	static async findById(id) {
		const [result] = await db.query('CALL sp_obtener_alumno(?)', [id]);
		if (!result[0][0]) throw new AppError('Alumno no encontrado', 404);
		return { ...result[0][0], tutores: result[1] };
	}

	static async updatePhoto(id, file) {
		if (!file) throw new AppError('Envía una imagen JPG o PNG en el campo "foto" (form-data)', 400);
		await this.findById(id);
		await db.query('UPDATE alumnos SET foto_url = ? WHERE id = ?', [await savePhoto(id, file), id]);
		return this.findById(id);
	}

	static async update(id, data) {
		const current = await this.findById(id);
		// sp_actualizar_alumno sobrescribe nombre y grado, así que se completan con los valores actuales.
		await db.query('CALL sp_actualizar_alumno(?, ?, ?, ?)', [id, data.nombre ?? current.nombre, 'grado' in data ? data.grado : current.grado, data.foto_url ?? null]);
		if (data.activo != null) await db.query('UPDATE alumnos SET activo = ? WHERE id = ?', [data.activo, id]);
		return this.findById(id);
	}

	static async addTutor(id, { id_padre, parentesco }) {
		await this.findById(id);
		await PadresService.findById(id_padre);
		await db.query('CALL sp_asignar_tutor(?, ?, ?)', [id, id_padre, parentesco || null]);
		return this.findById(id);
	}

	static async removeTutor(id, padreId) {
		await this.findById(id);
		const [result] = await db.query('CALL sp_quitar_tutor(?, ?)', [id, padreId]);
		if (!result[0][0].eliminados) throw new AppError('Ese tutor no está asignado a este alumno', 404);
		return this.findById(id);
	}
}
