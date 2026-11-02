import bcrypt from 'bcrypt';
import QRCode from 'qrcode';
import { AppError } from '../../middlewares/error.middlewares.js';
import { logger } from '../../utils/logger.js';
import { hashPassword } from '../../utils/password.js';
import TelegramService from '../notificaciones/telegram.service.js';
import { recuperacionRepository } from './recuperacion.repository.js';
import {
	ADMIN_LINK_PREFIX, LINK_MINUTES, MAX_ATTEMPTS, RECOVERY_MINUTES, TIPO_RECUPERAR, TIPO_VINCULAR,
	createLinkCode, createRecoveryCode, hashCode, isRecoveryCode, isUsable, sameHash,
} from './recuperacion.logic.js';

// Mismo texto exista o no la cuenta, tenga o no Telegram: no revela qué correos están registrados.
export const REQUEST_MESSAGE = 'Si la cuenta existe y tiene Telegram, te llegó un código. ¿No te llegó? Pide ayuda al administrador del sistema.';
export const INVALID_CODE_MESSAGE = 'El código no es válido o ya venció. Pide uno nuevo.';
export const PASSWORD_CHANGED_TEXT = 'Se cambió tu contraseña. Si no fuiste tú, avisa al administrador.';

const recoveryText = codigo =>
	`🔐 Tu código para recuperar la contraseña es: ${codigo}\n\nVence en ${RECOVERY_MINUTES} minutos y sirve una sola vez. Si no lo pediste, ignora este mensaje: tu contraseña no cambia. Si te llegan varios sin pedirlos, avisa al administrador.`;

// Las dependencias llegan por parámetro para probar la lógica sin BD ni Telegram (test/recuperacion.service.test.js).
// Nunca se escriben en el log el código ni el chat_id.
export const createRecuperacionService = ({ repo, telegram, hash = hashPassword, checkPassword = bcrypt.compare }) => {
	const service = {
		// Si es una directora activa con Telegram, genera un código (anula el anterior) y se lo manda.
		// En cualquier otro caso no hace nada; el controlador responde lo mismo sin esperar a esta función.
		async request(email) {
			const cuenta = await repo.findDirectoraByEmail(email);
			if (!cuenta?.telegram_chat_id || !telegram.enabled) return;
			const codigo = createRecoveryCode();
			await repo.saveCode(cuenta.id, TIPO_RECUPERAR, hashCode(codigo), RECOVERY_MINUTES);
			if (!(await telegram.notify(cuenta.telegram_chat_id, recoveryText(codigo)))) {
				logger.warn(`Recuperación: no se pudo enviar el código a la cuenta ${cuenta.id}`);
			}
		},

		// Cada intento cuenta (también el correcto); al quinto el código deja de servir. Todos los fallos
		// dan el mismo error, exista o no el correo.
		async confirm({ email, codigo, password }) {
			const invalid = new AppError(INVALID_CODE_MESSAGE, 400);
			if (!isRecoveryCode(codigo)) throw invalid;
			const cuenta = await repo.findDirectoraByEmail(email);
			if (!cuenta) throw invalid;
			const row = await repo.takeAttempt(cuenta.id, TIPO_RECUPERAR, MAX_ATTEMPTS);
			if (!isUsable(row) || !sameHash(hashCode(codigo), row.codigo_hash)) throw invalid;
			if (!(await repo.deleteCode(cuenta.id, TIPO_RECUPERAR, row.codigo_hash))) throw invalid;
			await repo.changePassword(cuenta.id, await hash(password));
			await service.passwordChanged(cuenta.id, cuenta);
		},

		// Después de cualquier cambio de la propia contraseña: anula códigos pendientes y avisa por Telegram.
		// Nunca lanza: una falla aquí no debe deshacer el cambio de contraseña.
		async passwordChanged(idAdmin, cuenta = null) {
			try {
				await repo.deleteCodes(idAdmin, TIPO_RECUPERAR);
				const chatId = (cuenta ?? await repo.findAdminById(idAdmin))?.telegram_chat_id;
				if (chatId) await telegram.notify(chatId, PASSWORD_CHANGED_TEXT);
			} catch (error) {
				logger.error(`No se pudo avisar el cambio de contraseña de la cuenta ${idAdmin}`, error.code ?? error.name);
			}
		},

		async telegramStatus(idAdmin) {
			const row = await repo.telegramStatus(idAdmin);
			return { vinculado: Boolean(Number(row?.vinculado)), vinculado_en: row?.telegram_vinculado_en ?? null };
		},

		// Enlace de un solo uso t.me/<bot>?start=adm_<código>; generar otro anula el anterior.
		// Pide la contraseña: con solo una sesión robada no se puede vincular otro Telegram y luego
		// usarlo para recuperar (cambiar) la contraseña.
		async createLink(idAdmin, password) {
			const passwordHash = await repo.passwordHash(idAdmin);
			if (!passwordHash || !(await checkPassword(password, passwordHash))) throw new AppError('La contraseña actual no es correcta', 400);
			const username = await telegram.username();
			const codigo = createLinkCode();
			const expira = await repo.saveCode(idAdmin, TIPO_VINCULAR, hashCode(codigo), LINK_MINUTES);
			const url = `https://t.me/${username}?start=${ADMIN_LINK_PREFIX}${codigo}`;
			return { url, qrDataUrl: await QRCode.toDataURL(url), expira };
		},

		// Desde el bot. Devuelve { nombre } o null si el enlace no sirve. ER_DUP_ENTRY si ese chat ya es de otra cuenta.
		async linkByCode(codigo, chatId) {
			if (!codigo) return null;
			const codigoHash = hashCode(codigo);
			const cuenta = await repo.findLinkCode(codigoHash);
			if (!cuenta || !(await repo.deleteCode(cuenta.id_admin, TIPO_VINCULAR, codigoHash))) return null;
			const anterior = (await repo.findAdminById(cuenta.id_admin))?.telegram_chat_id;
			await repo.linkTelegram(cuenta.id_admin, chatId);
			if (anterior && anterior !== chatId) {
				await telegram.notify(anterior, 'Se vinculó otro Telegram a tu cuenta de la escuela; los códigos para recuperar tu contraseña ya no llegarán aquí. Si no fuiste tú, avisa al administrador.');
			}
			return { nombre: cuenta.nombre };
		},

		// Avisa al chat que se desvincula (por si no lo pidió quien usa la cuenta) y anula sus códigos pendientes.
		async unlink(idAdmin) {
			const chatId = (await repo.findAdminById(idAdmin))?.telegram_chat_id;
			await repo.unlinkTelegram(idAdmin);
			await repo.deleteCodes(idAdmin);
			if (chatId) {
				await telegram.notify(chatId, 'Se desvinculó este Telegram de tu cuenta de la escuela. Ya no recibirás aquí códigos para recuperar tu contraseña.');
			}
		},
	};
	return service;
};

export default createRecuperacionService({ repo: recuperacionRepository, telegram: TelegramService });
