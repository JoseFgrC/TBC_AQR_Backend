import HorariosService from './horarios.service.js';
import { success } from '../../utils/responses.js';

export const get = async (_req, res) => success(res, await HorariosService.get(), 'Horario escolar');
export const saveWeek = async (req, res) => success(res, await HorariosService.saveWeek(req.validated), 'Horario actualizado');
export const updateConfig = async (req, res) => success(res, await HorariosService.updateConfig(req.validated), 'Configuración actualizada');
export const forDate = async (req, res) => success(res, await HorariosService.forDate(req.validated.fecha), 'Horario del día');
export const listSpecialDays = async (req, res) => success(res, await HorariosService.listSpecialDays(req.validated), 'Días especiales');
export const saveSpecialDay = async (req, res) => success(res, await HorariosService.saveSpecialDay(req.params.fecha, req.validated), 'Día especial guardado');
export const deleteSpecialDay = async (req, res) => success(res, await HorariosService.deleteSpecialDay(req.params.fecha), 'Día especial eliminado');
