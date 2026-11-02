import TelegramService from './telegram.service.js';
import PadresService from '../padres/padres.service.js';
import RecuperacionService from '../auth/recuperacion.service.js';
import { adminLinkCode } from '../auth/recuperacion.logic.js';
import { logger } from '../../utils/logger.js';

// t.me/<bot>?start=adm_<código>: la directora vincula su cuenta para recibir códigos de recuperación.
// En el log nunca van el código ni el chat_id (solo el código de error).
const linkAdmin = async (chatId, codigo, chatType) => {
	// En un grupo, los códigos de recuperación los verían todos sus miembros.
	if (chatType !== 'private') return TelegramService.notify(chatId, 'Por seguridad, abre el enlace en un chat privado con el bot, no en un grupo.');
	try {
		const cuenta = await RecuperacionService.linkByCode(codigo, chatId);
		if (!cuenta) return TelegramService.notify(chatId, 'Este enlace no es válido o ya venció. Genera uno nuevo en el panel, en Cuentas › Mi cuenta.');
		return TelegramService.notify(chatId, `Listo, ${cuenta.nombre}. Aquí te llegarán los códigos para recuperar tu contraseña.`);
	} catch (error) {
		if (error.code === 'ER_DUP_ENTRY') return TelegramService.notify(chatId, 'Este Telegram ya está vinculado a otra cuenta de la escuela. Desvincúlalo desde esa cuenta o usa otro Telegram.');
		logger.error('Error al vincular Telegram de una cuenta', error.code ?? error.name);
		return TelegramService.notify(chatId, 'Ocurrió un error al vincular tu cuenta. Inténtalo más tarde.');
	}
};

TelegramService.onStart(async (chatId, codigo, chatType) => {
	const codigoCuenta = adminLinkCode(codigo);
	if (codigoCuenta !== null) return linkAdmin(chatId, codigoCuenta, chatType);
	if (!codigo) {
		return TelegramService.send(chatId, 'Hola 👋\nPara recibir los avisos de asistencia abre el enlace (o escanea el QR) que te entregó la escuela.');
	}
	try {
		const vinculo = await PadresService.linkByCode(codigo, chatId);
		if (!vinculo) return TelegramService.send(chatId, 'Este enlace no es válido o ya expiró. Pide uno nuevo en la escuela.');
		const hijos = vinculo.alumnos.length ? vinculo.alumnos.join(', ') : 'tu hijo(a)';
		return TelegramService.send(chatId, `Listo, ${vinculo.nombre} ✅\nTe avisaremos aquí cada vez que ${hijos} entre o salga de la escuela.`);
	} catch (error) {
		if (error.code === 'ER_DUP_ENTRY') return TelegramService.send(chatId, 'Esta cuenta de Telegram ya está vinculada a otro padre. Contacta a la escuela.');
		logger.error('Error al vincular Telegram', error.message);
		return TelegramService.send(chatId, 'Ocurrió un error al vincular tu cuenta. Inténtalo más tarde.');
	}
});

if (TelegramService.enabled) logger.info('Bot de Telegram escuchando /start');
