import fs from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export const UPLOADS_DIR = path.resolve('uploads');
const LOCAL_PREFIX = `${env.publicUrl}/uploads/`;
const useCloudinary = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
if (useCloudinary) {
	cloudinary.config({ cloud_name: env.cloudinary.cloudName, api_key: env.cloudinary.apiKey, api_secret: env.cloudinary.apiSecret });
}

const uploadToCloudinary = (alumnoId, buffer) => new Promise((resolve, reject) => {
	cloudinary.uploader.upload_stream({
		folder: 'tbc_aqr/alumnos',
		public_id: `alumno-${alumnoId}`,
		overwrite: true,
		format: 'jpg',
		transformation: [{ width: 600, height: 750, crop: 'fill', gravity: 'face' }],
	}, (error, result) => (error ? reject(error) : resolve(result.secure_url))).end(buffer);
});

// Guarda la foto y devuelve la URL pública. Sin Cloudinary configurado, la guarda en ./uploads.
export const savePhoto = async (alumnoId, file) => {
	if (useCloudinary) return uploadToCloudinary(alumnoId, file.buffer);
	const name = `alumno-${alumnoId}-${Date.now()}.${file.mimetype === 'image/png' ? 'png' : 'jpg'}`;
	await fs.mkdir(path.join(UPLOADS_DIR, 'alumnos'), { recursive: true });
	await fs.writeFile(path.join(UPLOADS_DIR, 'alumnos', name), file.buffer);
	return `${LOCAL_PREFIX}alumnos/${name}`;
};

// Devuelve la imagen como Buffer (para el PDF) o null si no se puede obtener.
export const loadPhoto = async url => {
	if (!url) return null;
	try {
		if (url.startsWith(LOCAL_PREFIX)) return await fs.readFile(path.join(UPLOADS_DIR, url.slice(LOCAL_PREFIX.length)));
		const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
		return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
	} catch (error) {
		logger.warn('No se pudo cargar la foto', url, error.message);
		return null;
	}
};
