import AuthService from './auth.service.js';
import RecuperacionService, { REQUEST_MESSAGE } from './recuperacion.service.js';
import { logger } from '../../utils/logger.js';
import { success } from '../../utils/responses.js';

export const register = async (req, res) => success(res, await AuthService.register(req.validated), 'Personal registrado', 201);
export const login = async (req, res) => success(res, await AuthService.login(req.validated), 'Inicio de sesión correcto');
export const me = async (req, res) => success(res, req.user, 'Sesión activa');
export const changePassword = async (req, res) => success(res, await AuthService.changePassword(req.user, req.validated), 'Contraseña actualizada');
export const listUsers = async (_req, res) => success(res, await AuthService.list(), 'Cuentas');
export const setUserStatus = async (req, res) => success(res, await AuthService.setStatus(req.user, req.params.id, req.validated.activo), 'Estado actualizado');
export const resetUserPassword = async (req, res) => success(res, await AuthService.resetPassword(req.user, req.params.id, req.validated.password), 'Contraseña restablecida');

// Recuperación por Telegram. Se responde antes de buscar la cuenta, así la respuesta y su tiempo
// son iguales exista o no el correo.
export const requestRecovery = async (req, res) => {
	success(res, null, REQUEST_MESSAGE);
	RecuperacionService.request(req.validated.email.trim())
		.catch(error => logger.error('Recuperación: no se pudo generar el código', error.code ?? error.name));
};
export const confirmRecovery = async (req, res) => {
	const { email, codigo, password } = req.validated;
	await RecuperacionService.confirm({ email: email.trim(), codigo, password });
	return success(res, null, 'Contraseña actualizada. Ya puedes iniciar sesión con la nueva.');
};
export const telegramStatus = async (req, res) => success(res, await RecuperacionService.telegramStatus(req.user.id), 'Telegram de la cuenta');
export const telegramLink = async (req, res) => success(res, await RecuperacionService.createLink(req.user.id, req.validated.password), 'Enlace de vinculación generado', 201);
export const telegramUnlink = async (req, res) => { await RecuperacionService.unlink(req.user.id); return success(res, null, 'Telegram desvinculado'); };
