import { booleanField, dateField, enumField, numberField, stringField, timeField, objectSchema } from '../../middlewares/validate.middlewares.js';

export const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export const semanaSchema = input => {
	const errors = [];
	const keys = Object.keys(input ?? {});
	if (!keys.length) errors.push({ field: 'semana', message: `Envía al menos un día: ${DIAS.join(', ')}` });
	for (const key of keys) {
		if (!DIAS.includes(key)) { errors.push({ field: key, message: `Día inválido. Usa: ${DIAS.join(', ')}` }); continue; }
		const dia = input[key];
		if (dia === null) continue;
		if (typeof dia !== 'object' || Array.isArray(dia)) { errors.push({ field: key, message: 'Debe ser { "entrada": "HH:MM", "salida": "HH:MM" } o null' }); continue; }
		const before = errors.length;
		timeField(`${key}.entrada`)(dia.entrada, errors);
		timeField(`${key}.salida`)(dia.salida, errors);
		if (errors.length === before && dia.entrada >= dia.salida) errors.push({ field: key, message: 'La hora de entrada debe ser anterior a la de salida' });
	}
	return errors.length ? { ok: false, errors } : { ok: true, value: input };
};

export const configuracionSchema = input => {
	const result = objectSchema({
		tolerancia_minutos: numberField('tolerancia_minutos', { required: false, max: 240 }),
		consejo_tecnico_ultimo_viernes: booleanField('consejo_tecnico_ultimo_viernes', { required: false }),
		aviso_no_llego: booleanField('aviso_no_llego', { required: false }),
	})(input);
	if (result.ok && !Object.keys(input ?? {}).length) {
		return { ok: false, errors: [{ field: 'configuracion', message: 'Envía tolerancia_minutos, consejo_tecnico_ultimo_viernes o aviso_no_llego' }] };
	}
	return result;
};

export const diaEspecialSchema = input => {
	const tipo = input?.tipo;
	return objectSchema({
		tipo: enumField('tipo', ['sin_clases', 'horario_especial']),
		hora_entrada: timeField('hora_entrada', { required: tipo === 'horario_especial' }),
		hora_salida: timeField('hora_salida', { required: tipo === 'horario_especial' }),
		descripcion: stringField('descripcion', { required: false, max: 150 }),
	})(input);
};

export const fechaQuerySchema = objectSchema({ fecha: dateField('fecha') });
export const rangoQuerySchema = objectSchema({ desde: dateField('desde'), hasta: dateField('hasta') });
