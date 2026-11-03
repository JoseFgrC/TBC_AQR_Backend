import QrService from './qr.service.js';
import { generateCredentialsPdf } from './pdf.service.js';
import { success } from '../../utils/responses.js';

const sendPdf = (res, buffer, filename) => res.type('application/pdf').set('Content-Disposition', `inline; filename="${filename}"`).send(buffer);

export const get = async (req, res) => success(res, await QrService.current(req.params.alumnoId), 'Credencial');
export const regenerate = async (req, res) => success(res, await QrService.regenerate(req.params.alumnoId, req.validated.motivo || undefined), 'Credencial regenerada');
export const history = async (req, res) => success(res, await QrService.history(req.params.alumnoId), 'Historial de credenciales');
export const pdf = async (req, res) => sendPdf(res, await generateCredentialsPdf([await QrService.forPrint(req.params.alumnoId)]), `credencial-${req.params.alumnoId}.pdf`);
export const batchPdf = async (req, res) => {
	const grado = req.validated.grado || null;
	return sendPdf(res, await generateCredentialsPdf(await QrService.forPrintBatch(grado)), `credenciales${grado ? `-${grado}` : ''}.pdf`);
};
