import AsistenciasService from './asistencias.service.js';
import { success } from '../../utils/responses.js';

export const scan = async (req, res) => success(res, await AsistenciasService.scan(req.validated.token, req.user.id), 'Asistencia registrada', 201);
export const history = async (req, res) => success(res, await AsistenciasService.history(req.validated), 'Historial de asistencias');
export const report = async (req, res) => success(res, await AsistenciasService.report(req.validated), 'Reporte de asistencia');
