import { Router } from 'express';
import { authLimiter, passwordLimiter, recoveryConfirmLimiters, recoveryRequestLimiters } from '../../middlewares/rateLimiter.middlewares.js';
import { authenticate, requireRole } from '../../middlewares/auth.middlewares.js';
import { validate, validId } from '../../middlewares/validate.middlewares.js';
import { changePasswordSchema, loginSchema, recoveryConfirmSchema, recoveryRequestSchema, registerSchema, resetPasswordSchema, statusSchema, telegramLinkSchema } from './auth.schemas.js';
import * as controller from './auth.controller.js';

const router = Router();
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.get('/me', authenticate, controller.me);
router.patch('/password', passwordLimiter, authenticate, validate(changePasswordSchema), controller.changePassword);

// Recuperar la contraseña con un código que manda el bot (sin sesión; solo directoras con Telegram vinculado).
router.post('/recuperar/solicitar', ...recoveryRequestLimiters, validate(recoveryRequestSchema), controller.requestRecovery);
router.post('/recuperar/confirmar', ...recoveryConfirmLimiters, validate(recoveryConfirmSchema), controller.confirmRecovery);
// Telegram de la propia cuenta (donde llegan esos códigos).
router.get('/telegram', authenticate, requireRole('directora'), controller.telegramStatus);
router.post('/telegram/enlace', passwordLimiter, authenticate, requireRole('directora'), validate(telegramLinkSchema), controller.telegramLink);
router.delete('/telegram', authenticate, requireRole('directora'), controller.telegramUnlink);

// Administración de cuentas: solo la directora. Las cuentas que crea son de personal de entrada.
// La cuenta de directora se crea con `npm run crear-admin`.
router.post('/registro', authLimiter, authenticate, requireRole('directora'), validate(registerSchema), controller.register);
router.get('/usuarios', authenticate, requireRole('directora'), controller.listUsers);
router.patch('/usuarios/:id/estado', authenticate, requireRole('directora'), validId('id'), validate(statusSchema), controller.setUserStatus);
router.patch('/usuarios/:id/password', passwordLimiter, authenticate, requireRole('directora'), validId('id'), validate(resetPasswordSchema), controller.resetUserPassword);
export default router;
