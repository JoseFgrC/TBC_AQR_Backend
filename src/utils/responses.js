export const success = (res, data = null, message = 'Operación exitosa', status = 200) =>
	res.status(status).json({ success: true, message, data });

export const failure = (res, message, status = 500, details = undefined, data = undefined) =>
	res.status(status).json({ success: false, message, ...(details ? { details } : {}), ...(data ? { data } : {}) });
