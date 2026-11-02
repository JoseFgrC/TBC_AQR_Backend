import { booleanField, objectSchema, stringField } from '../../middlewares/validate.middlewares.js';

const passwordField = name => stringField(name, { min: 8, max: 100 });

export const loginSchema = objectSchema({
  email: stringField('email', { email: true, max: 150 }),
  password: stringField('password', { max: 100 }),
});

export const registerSchema = objectSchema({
  nombre: stringField('nombre', { max: 100 }),
  email: stringField('email', { email: true, max: 150 }),
  password: passwordField('password'),
});

export const changePasswordSchema = objectSchema({
  password_actual: stringField('password_actual', { max: 100 }),
  password_nueva: passwordField('password_nueva'),
});

// Recuperación por Telegram (sin sesión).
export const recoveryRequestSchema = objectSchema({ email: stringField('email', { email: true, max: 150 }) });
export const recoveryConfirmSchema = objectSchema({
  email: stringField('email', { email: true, max: 150 }),
  codigo: (value, errors) => { if (typeof value !== 'string' || !/^\d{6}$/.test(value)) errors.push({ field: 'codigo', message: 'El código son 6 dígitos' }); },
  password: passwordField('password'),
});

export const telegramLinkSchema = objectSchema({ password: stringField('password', { max: 100 }) });

export const resetPasswordSchema = objectSchema({ password: passwordField('password') });
export const statusSchema = objectSchema({ activo: booleanField('activo') });
