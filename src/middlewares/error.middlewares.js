import { failure } from '../utils/responses.js';

export class AppError extends Error {
	// details: errores de validación (se ocultan en producción).
	// data: contexto para la interfaz (p. ej. el alumno del QR); se envía siempre.
	constructor(message, statusCode = 500, details = undefined, data = undefined) {
		super(message);
		this.statusCode = statusCode;
		this.details = details;
		this.data = data;
		this.isOperational = true;
	}
}

// Traduce errores de MySQL conocidos (SIGNAL de los procedimientos, duplicados, FKs) a respuestas 4xx.
const fromDatabase = error => {
	if (error.sqlState === '45000') return new AppError(error.sqlMessage, 400);
	if (error.code === 'ER_DUP_ENTRY') return new AppError('El registro ya existe (valor duplicado)', 409);
	if (error.code === 'ER_NO_REFERENCED_ROW_2') return new AppError('Referencia inválida a otro registro', 400);
	if (error.code === 'ER_ROW_IS_REFERENCED_2') return new AppError('El registro está en uso por otros datos', 409);
	if (error.name === 'MulterError') return new AppError(error.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera 5 MB' : error.message, 400);
	return error;
};

export const notFound = (_req, _res, next) => next(new AppError('Ruta no encontrada', 404));

export const errorHandler = (rawError, _req, res, _next) => {
	const error = fromDatabase(rawError);
	const status = error.statusCode || 500;
	if (status >= 500) console.error(error);
	return failure(res, status === 500 ? 'Error interno del servidor' : error.message, status,
		process.env.NODE_ENV === 'production' ? undefined : error.details,
		status === 500 ? undefined : error.data);
};
