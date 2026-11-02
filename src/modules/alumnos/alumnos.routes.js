import { Router } from 'express';
import { validate, validId } from '../../middlewares/validate.middlewares.js';
import { requireRole } from '../../middlewares/auth.middlewares.js';
import { photoUpload } from '../../middlewares/upload.middlewares.js';
import { createAlumnoSchema, tutorSchema, updateAlumnoSchema } from './alumnos.schema.js';
import * as controller from './alumnos.controller.js';

const router = Router();
router.get('/', controller.list);
router.get('/:id', validId('id'), controller.get);
router.post('/', requireRole('directora'), validate(createAlumnoSchema), controller.create);
router.put('/:id', requireRole('directora'), validId('id'), validate(updateAlumnoSchema), controller.update);
router.post('/:id/foto', requireRole('directora'), validId('id'), photoUpload, controller.uploadPhoto);
router.post('/:id/tutores', requireRole('directora'), validId('id'), validate(tutorSchema), controller.addTutor);
router.delete('/:id/tutores/:padreId', requireRole('directora'), validId('id', 'padreId'), controller.removeTutor);
export default router;
