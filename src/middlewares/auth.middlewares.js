import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from './error.middlewares.js';

// Además de validar el token, consulta la cuenta: si se desactivó o cambió su contraseña después de
// emitirse el token, la sesión deja de servir al instante. El rol se toma de la BD, no del token.
export const authenticate = async (req, _res, next) => {
	const token = req.headers.authorization?.startsWith('Bearer ')
		? req.headers.authorization.slice(7) : null;
	if (!token) return next(new AppError('Token de autenticación requerido', 401));
	let payload;
	try {
		payload = jwt.verify(token, env.jwtSecret, { issuer: 'asistencia-escolar' });
	} catch { return next(new AppError('Token inválido o expirado', 401)); }

	const [result] = await db.query('CALL sp_obtener_admin_por_id(?)', [payload.id]);
	const user = result[0][0];
	if (!user || !user.activo) return next(new AppError('Cuenta desactivada o inexistente', 401));
	if (user.password_cambiado_ts && payload.iat < Number(user.password_cambiado_ts)) {
		return next(new AppError('La contraseña cambió; inicia sesión de nuevo', 401));
	}
	req.user = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
	next();
};

export const requireRole = (...roles) => (req, _res, next) => {
	if (!roles.includes(req.user?.rol)) return next(new AppError('No tienes permisos para esta operación', 403));
	next();
};
