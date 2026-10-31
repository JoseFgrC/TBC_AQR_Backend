import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
// Cambios de contraseña: mismo límite que el login, pero con su propio contador.
export const passwordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
export const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });

// Recuperación de contraseña: un contador por IP y otro por correo (el del correo frena a quien
// cambia de IP para atacar una sola cuenta). Cada llamada crea contadores nuevos.
const recoveryOptions = {
	windowMs: 15 * 60 * 1000,
	standardHeaders: true,
	legacyHeaders: false,
	message: { success: false, message: 'Hiciste varios intentos seguidos. Espera unos minutos y vuelve a probar.' },
};
export const normalizeEmail = value => (typeof value === 'string' ? value.trim().toLowerCase() : '');
export const limitByIp = limit => rateLimit({ ...recoveryOptions, limit });
export const limitByEmail = (limit, windowMs = recoveryOptions.windowMs) =>
	rateLimit({ ...recoveryOptions, windowMs, limit, keyGenerator: req => `email:${normalizeEmail(req.body?.email)}` });
const DAY = 24 * 60 * 60 * 1000;

// Además, tope diario por correo: limita cuántos códigos se pueden adivinar al día contra una cuenta
// (10 códigos × 5 intentos, pero confirmar se corta en 30): ~0.003 % de acertar por día.
export const recoveryRequestLimiters = [limitByIp(5), limitByEmail(3), limitByEmail(10, DAY)];
export const recoveryConfirmLimiters = [limitByIp(20), limitByEmail(10), limitByEmail(30, DAY)];
