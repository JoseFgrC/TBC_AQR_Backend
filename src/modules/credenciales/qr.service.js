import QRCode from 'qrcode';
import { db } from '../../config/db.js';
import { AppError } from '../../middlewares/error.middlewares.js';
import { createQrToken } from '../../utils/qr-token.js';

export default class QrService {
	static async build(alumnoId, token) {
		return { alumnoId: Number(alumnoId), token, qrDataUrl: await QRCode.toDataURL(token) };
	}

	static async current(alumnoId) {
		const [rows] = await db.query('SELECT id, qr_token FROM alumnos WHERE id = ?', [alumnoId]);
		if (!rows[0]) throw new AppError('Alumno no encontrado', 404);
		return this.build(rows[0].id, rows[0].qr_token);
	}

	static async regenerate(alumnoId, motivo = 'Regeneración manual') {
		await this.current(alumnoId);
		const token = createQrToken();
		await db.query('CALL sp_regenerar_qr(?, ?, ?)', [alumnoId, token, motivo]);
		return this.build(alumnoId, token);
	}

	static async forPrint(alumnoId) {
		const [rows] = await db.query('SELECT id, nombre, grado, foto_url, qr_token FROM alumnos WHERE id = ?', [alumnoId]);
		if (!rows[0]) throw new AppError('Alumno no encontrado', 404);
		return rows[0];
	}

	static async forPrintBatch(grado) {
		const [rows] = await db.query('SELECT id, nombre, grado, foto_url, qr_token FROM alumnos WHERE activo = TRUE AND (? IS NULL OR grado = ?) ORDER BY grado, nombre', [grado, grado]);
		if (!rows.length) throw new AppError('No hay alumnos activos para imprimir', 404);
		return rows;
	}

	static async history(alumnoId) {
		await this.current(alumnoId);
		const [rows] = await db.query('SELECT id, qr_token_anterior, motivo, fecha FROM credenciales_historial WHERE id_alumno = ? ORDER BY fecha DESC, id DESC', [alumnoId]);
		return rows;
	}
}
