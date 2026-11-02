import { Router } from 'express';
import { validate, validId } from '../../middlewares/validate.middlewares.js';
import { createPadreSchema, notificationSchema, telegramSchema } from './padres.schemas.js';
import * as controller from './padres.controller.js';

const router = Router();
router.get('/', controller.list);
router.post('/', validate(createPadreSchema), controller.create);
router.get('/alumno/:alumnoId', validId('alumnoId'), controller.byAlumno);
router.get('/:id', validId('id'), controller.get);
router.patch('/:id/notificaciones', validId('id'), validate(notificationSchema), controller.notifications);
router.post('/:id/telegram/enlace', validId('id'), controller.telegramLink);
router.patch('/:id/telegram', validId('id'), validate(telegramSchema), controller.linkTelegram);
router.delete('/:id/telegram', validId('id'), controller.unlinkTelegram);
export default router;
