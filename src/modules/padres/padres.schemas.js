import { booleanField, objectSchema, stringField } from '../../middlewares/validate.middlewares.js';

export const createPadreSchema = objectSchema({
	nombre: stringField('nombre', { max: 150 }),
	telefono: stringField('telefono', { required: false, max: 20 }),
});

export const notificationSchema = objectSchema({ activo: booleanField('activo') });
export const telegramSchema = objectSchema({ telegram_chat_id: stringField('telegram_chat_id', { max: 50 }) });
