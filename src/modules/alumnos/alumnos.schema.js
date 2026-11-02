import { booleanField, intField, objectSchema, stringField } from '../../middlewares/validate.middlewares.js';

const parentescoField = name => stringField(name, { required: false, max: 30 });

const tutoresField = (value, errors) => {
	if (value == null) return;
	if (!Array.isArray(value)) return errors.push({ field: 'tutores', message: 'Debe ser una lista' });
	value.forEach((tutor, index) => {
		intField(`tutores[${index}].id_padre`)(tutor?.id_padre, errors);
		parentescoField(`tutores[${index}].parentesco`)(tutor?.parentesco, errors);
	});
};

export const createAlumnoSchema = objectSchema({
	nombre: stringField('nombre', { max: 150 }),
	grado: stringField('grado', { required: false, max: 20 }),
	foto_url: stringField('foto_url', { required: false, max: 500 }),
	tutores: tutoresField,
});

export const updateAlumnoSchema = objectSchema({
	nombre: stringField('nombre', { required: false, max: 150 }),
	grado: stringField('grado', { required: false, max: 20 }),
	foto_url: stringField('foto_url', { required: false, max: 500 }),
	activo: booleanField('activo', { required: false }),
});

export const tutorSchema = objectSchema({
	id_padre: intField('id_padre'),
	parentesco: parentescoField('parentesco'),
});
