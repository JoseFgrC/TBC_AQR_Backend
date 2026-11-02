import { db } from '../../config/db.js';

// SQL de la recuperación por Telegram. Los vencimientos se calculan con NOW() de MySQL,
// igual que los enlaces de los padres. recuperacion.service.js recibe este objeto (o uno falso en pruebas).
const CUENTA = 'SELECT id, nombre, rol, activo, telegram_chat_id FROM admins';

export const recuperacionRepository = {
	// Solo directoras activas: las cuentas de escáner las restablece la directora.
	async findDirectoraByEmail(email) {
		const [rows] = await db.query(`${CUENTA} WHERE email = ? AND rol = 'directora' AND activo = TRUE LIMIT 1`, [email]);
		return rows[0] ?? null;
	},

	async findAdminById(id) {
		const [rows] = await db.query(`${CUENTA} WHERE id = ?`, [id]);
		return rows[0] ?? null;
	},

	async passwordHash(id) {
		const [rows] = await db.query('SELECT password_hash FROM admins WHERE id = ?', [id]);
		return rows[0]?.password_hash ?? null;
	},

	async telegramStatus(id) {
		const [rows] = await db.query('SELECT telegram_chat_id IS NOT NULL AS vinculado, telegram_vinculado_en FROM admins WHERE id = ?', [id]);
		return rows[0] ?? null;
	},

	// Uno vigente por cuenta y tipo: guardar otro reemplaza al anterior y reinicia los intentos.
	async saveCode(idAdmin, tipo, codigoHash, minutes) {
		await db.query(
			`INSERT INTO admin_codigos (id_admin, tipo, codigo_hash, intentos, expira_en, creado_en)
			 VALUES (?, ?, ?, 0, NOW() + INTERVAL ? MINUTE, NOW())
			 ON DUPLICATE KEY UPDATE codigo_hash = VALUES(codigo_hash), intentos = 0,
			   expira_en = VALUES(expira_en), creado_en = VALUES(creado_en)`,
			[idAdmin, tipo, codigoHash, minutes],
		);
		const [rows] = await db.query('SELECT expira_en FROM admin_codigos WHERE id_admin = ? AND tipo = ?', [idAdmin, tipo]);
		return rows[0]?.expira_en ?? null;
	},

	// Gasta un intento antes de comparar, en una sola sentencia: dos peticiones simultáneas no pueden
	// pasar del máximo. Devuelve la fila (con el intento ya contado) o null si venció o se agotó.
	async takeAttempt(idAdmin, tipo, maxAttempts) {
		const [result] = await db.query(
			'UPDATE admin_codigos SET intentos = intentos + 1 WHERE id_admin = ? AND tipo = ? AND intentos < ? AND expira_en > NOW()',
			[idAdmin, tipo, maxAttempts],
		);
		if (!result.affectedRows) return null;
		const [rows] = await db.query(
			'SELECT codigo_hash, intentos, expira_en <= NOW() AS vencido FROM admin_codigos WHERE id_admin = ? AND tipo = ?',
			[idAdmin, tipo],
		);
		return rows[0] ?? null;
	},

	// true solo para quien lo borró: así cada código sirve una sola vez aunque lleguen dos a la vez.
	async deleteCode(idAdmin, tipo, codigoHash) {
		const [result] = await db.query('DELETE FROM admin_codigos WHERE id_admin = ? AND tipo = ? AND codigo_hash = ?', [idAdmin, tipo, codigoHash]);
		return result.affectedRows === 1;
	},

	async deleteCodes(idAdmin, tipo = null) {
		await db.query('DELETE FROM admin_codigos WHERE id_admin = ? AND (? IS NULL OR tipo = ?)', [idAdmin, tipo, tipo]);
	},

	// Código de vinculación vigente de una directora activa.
	async findLinkCode(codigoHash) {
		const [rows] = await db.query(
			`SELECT c.id_admin, a.nombre FROM admin_codigos c JOIN admins a ON a.id = c.id_admin
			 WHERE c.tipo = 'vincular_telegram' AND c.codigo_hash = ? AND c.expira_en > NOW()
			   AND a.rol = 'directora' AND a.activo = TRUE LIMIT 1`,
			[codigoHash],
		);
		return rows[0] ?? null;
	},

	async linkTelegram(idAdmin, chatId) {
		await db.query('UPDATE admins SET telegram_chat_id = ?, telegram_vinculado_en = NOW() WHERE id = ?', [chatId, idAdmin]);
	},

	async unlinkTelegram(idAdmin) {
		await db.query('UPDATE admins SET telegram_chat_id = NULL, telegram_vinculado_en = NULL WHERE id = ?', [idAdmin]);
	},

	// Marca password_cambiado_en: authenticate rechaza los tokens emitidos antes (cierra sesiones).
	async changePassword(idAdmin, passwordHash) {
		await db.query('CALL sp_cambiar_password_admin(?, ?)', [idAdmin, passwordHash]);
	},
};
