import { AppError } from './error.middlewares.js';

export const validate = (schema, source = 'body') => (req, _res, next) => {
	const result = schema(req[source]);
	if (!result.ok) return next(new AppError('Errores de validación', 400, result.errors));
	req.validated = result.value ?? {};
	next();
};

export const validId = (...names) => (req, _res, next) => {
	const errors = names.filter(name => !/^[1-9]\d*$/.test(req.params[name] ?? '')).map(field => ({ field, message: 'ID inválido' }));
	return errors.length ? next(new AppError('Errores de validación', 400, errors)) : next();
};

// 'YYYY-MM-DD' que además exista en el calendario (rechaza 2026-02-31).
export const isRealDate = value => {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

export const validDate = (...names) => (req, _res, next) => {
	const errors = names.filter(name => !isRealDate(req.params[name])).map(field => ({ field, message: 'Fecha inválida (YYYY-MM-DD)' }));
	return errors.length ? next(new AppError('Errores de validación', 400, errors)) : next();
};

const isEmpty = value => value == null || value === '';

export const stringField = (name, { required = true, min = 0, max = 255, email = false } = {}) => (value, errors) => {
	if (required && (typeof value !== 'string' || !value.trim())) errors.push({ field: name, message: 'Campo requerido' });
	if (value != null && typeof value !== 'string') errors.push({ field: name, message: 'Debe ser texto' });
	if (min && typeof value === 'string' && value.trim() && value.length < min) errors.push({ field: name, message: `Mínimo ${min} caracteres` });
	if (value != null && typeof value === 'string' && value.length > max) errors.push({ field: name, message: `Máximo ${max} caracteres` });
	if (email && value && !/^\S+@\S+\.\S+$/.test(value)) errors.push({ field: name, message: 'Email inválido' });
};

export const intField = (name, { required = true } = {}) => (value, errors) => {
	if (isEmpty(value)) { if (required) errors.push({ field: name, message: 'Campo requerido' }); return; }
	if (!/^[1-9]\d*$/.test(String(value))) errors.push({ field: name, message: 'Debe ser un entero positivo' });
};

export const booleanField = (name, { required = true } = {}) => (value, errors) => {
	if (value == null) { if (required) errors.push({ field: name, message: 'Campo requerido' }); return; }
	if (typeof value !== 'boolean') errors.push({ field: name, message: 'Debe ser booleano (true/false)' });
};

export const dateField = (name, { required = false } = {}) => (value, errors) => {
	if (isEmpty(value)) { if (required) errors.push({ field: name, message: 'Campo requerido' }); return; }
	if (!isRealDate(value)) errors.push({ field: name, message: 'Formato YYYY-MM-DD' });
};

export const timeField = (name, { required = true } = {}) => (value, errors) => {
	if (isEmpty(value)) { if (required) errors.push({ field: name, message: 'Campo requerido' }); return; }
	if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) errors.push({ field: name, message: 'Formato HH:MM (24 horas)' });
};

export const numberField = (name, { required = true, min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => (value, errors) => {
	if (value == null) { if (required) errors.push({ field: name, message: 'Campo requerido' }); return; }
	if (!Number.isInteger(value) || value < min || value > max) errors.push({ field: name, message: `Debe ser un entero entre ${min} y ${max}` });
};

export const enumField = (name, options, { required = true } = {}) => (value, errors) => {
	if (isEmpty(value)) { if (required) errors.push({ field: name, message: 'Campo requerido' }); return; }
	if (!options.includes(value)) errors.push({ field: name, message: `Valores permitidos: ${options.join(', ')}` });
};

export const objectSchema = (rules) => input => {
	const errors = [];
	for (const [name, rule] of Object.entries(rules)) rule(input?.[name], errors);
	return errors.length ? { ok: false, errors } : { ok: true, value: input };
};
