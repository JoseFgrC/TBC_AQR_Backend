import { Router } from 'express';
import { requireRole } from '../../middlewares/auth.middlewares.js';
import { validate, validDate } from '../../middlewares/validate.middlewares.js';
import { configuracionSchema, diaEspecialSchema, fechaQuerySchema, rangoQuerySchema, semanaSchema } from './horarios.schema.js';
import * as controller from './horarios.controller.js';

const router = Router();
// La pantalla del escáner consulta el horario del día; todo lo demás es solo de la directora.
router.get('/dia', requireRole('directora', 'escaner'), validate(fechaQuerySchema, 'query'), controller.forDate);
router.use(requireRole('directora'));
router.get('/', controller.get);
router.put('/semana', validate(semanaSchema), controller.saveWeek);
router.patch('/configuracion', validate(configuracionSchema), controller.updateConfig);
router.get('/dias-especiales', validate(rangoQuerySchema, 'query'), controller.listSpecialDays);
router.put('/dias-especiales/:fecha', validDate('fecha'), validate(diaEspecialSchema), controller.saveSpecialDay);
router.delete('/dias-especiales/:fecha', validDate('fecha'), controller.deleteSpecialDay);
export default router;



