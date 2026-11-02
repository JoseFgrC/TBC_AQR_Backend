import { db } from '../../config/db.js';
import { AppError } from '../../middlewares/error.middlewares.js';
import { DIAS } from './horarios.schema.js';

// Fecha local del servidor (YYYY-MM-DD); la BD guarda hora local de México.
export const hoy = () => new Date().toLocaleDateString('sv-SE');

const toConfig = row => ({
	tolerancia_minutos: row.tolerancia_minutos,
	consejo_tecnico_ultimo_viernes: Boolean(row.consejo_tecnico_ultimo_viernes),
	aviso_no_llego: Boolean(row.aviso_no_llego),
});

export default class HorariosService {
	// Los 7 días de la semana (los que no tienen horario son días sin clases) + configuración.
	static async get() {
		const [result] = await db.query('CALL sp_obtener_horarios()');
		const [horarios, [config]] = result;
		const semana = DIAS.map((dia, index) => {
			const horario = horarios.find(row => row.dia_semana === index + 1);
			return { dia, dia_semana: index + 1, hay_clases: Boolean(horario), hora_entrada: horario?.hora_entrada ?? null, hora_salida: horario?.hora_salida ?? null };
		});
		return { semana, configuracion: toConfig(config) };
	}

	static async saveWeek(semana) {
		const conn = await db.getConnection();
		try {
			await conn.beginTransaction();
			for (const [dia, horario] of Object.entries(semana)) {
				await conn.query('CALL sp_guardar_horario_dia(?, ?, ?)', [DIAS.indexOf(dia) + 1, horario?.entrada ?? null, horario?.salida ?? null]);
			}
			await conn.commit();
		} catch (error) {
			await conn.rollback();
			throw error;
		} finally {
			conn.release();
		}
		return this.get();
	}

	static async updateConfig({ tolerancia_minutos, consejo_tecnico_ultimo_viernes, aviso_no_llego }) {
		const [result] = await db.query('CALL sp_actualizar_configuracion(?, ?, ?)', [tolerancia_minutos ?? null, consejo_tecnico_ultimo_viernes ?? null, aviso_no_llego ?? null]);
		return toConfig(result[0][0]);
	}

	static async forDate(fecha = hoy()) {
		const [result] = await db.query('CALL sp_horario_de_fecha(?)', [fecha]);
		const row = result[0][0];
		return { ...row, hay_clases: Boolean(row.hay_clases) };
	}

	static async listSpecialDays({ desde, hasta }) {
		const [result] = await db.query('CALL sp_listar_dias_especiales(?, ?)', [desde || '1000-01-01', hasta || '9999-12-31']);
		return result[0];
	}

	static async saveSpecialDay(fecha, { tipo, hora_entrada, hora_salida, descripcion }) {
		await db.query('CALL sp_guardar_dia_especial(?, ?, ?, ?, ?)', [fecha, tipo, hora_entrada || null, hora_salida || null, descripcion || null]);
		return this.forDate(fecha);
	}

	static async deleteSpecialDay(fecha) {
		const [result] = await db.query('CALL sp_eliminar_dia_especial(?)', [fecha]);
		if (!result[0][0].eliminados) throw new AppError('Ese día no está registrado como día especial', 404);
		return this.forDate(fecha);
	}
}
