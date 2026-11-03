import { dateField, intField, objectSchema, stringField } from '../../middlewares/validate.middlewares.js';

export const scanSchema = objectSchema({ token: stringField('token', { max: 100 }) });
export const historySchema = objectSchema({
	desde: dateField('desde'),
	hasta: dateField('hasta'),
	alumnoId: intField('alumnoId', { required: false }),
});
