import { Router } from 'express';
import { validate } from '../../middlewares/validate.middlewares.js';
import { requireRole } from '../../middlewares/auth.middlewares.js';
import { historySchema, scanSchema } from './asistencias.schema.js';
import * as controller from './asistencias.controller.js';

const router = Router();
router.post('/escanear', requireRole('directora', 'escaner'), validate(scanSchema), controller.scan);
router.get('/historial', requireRole('directora'), validate(historySchema, 'query'), controller.history);
router.get('/reporte', requireRole('directora'), validate(historySchema, 'query'), controller.report);
export default router;
