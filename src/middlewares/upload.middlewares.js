import multer from 'multer';
import { AppError } from './error.middlewares.js';

// Solo JPG/PNG: son los formatos que PDFKit puede poner en la credencial.
export const photoUpload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, callback) => (/^image\/(jpeg|png)$/.test(file.mimetype)
		? callback(null, true)
		: callback(new AppError('La foto debe ser JPG o PNG', 400))),
}).single('foto');
