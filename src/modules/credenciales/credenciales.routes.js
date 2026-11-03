import { Router } from 'express';
import { validate, validId, objectSchema, stringField } from '../../middlewares/validate.middlewares.js';
import * as controller from './credenciales.controller.js';

const regenerateSchema = objectSchema({ motivo: stringField('motivo', { required: false, max: 255 }) });
const batchSchema = objectSchema({ grado: stringField('grado', { required: false, max: 20 }) });

const router = Router();
router.get('/lote/pdf', validate(batchSchema, 'query'), controller.batchPdf);
router.get('/:alumnoId', validId('alumnoId'), controller.get);
router.get('/:alumnoId/pdf', validId('alumnoId'), controller.pdf);
router.get('/:alumnoId/historial', validId('alumnoId'), controller.history);
router.post('/:alumnoId/regenerar', validId('alumnoId'), validate(regenerateSchema), controller.regenerate);
export default router;
