import PadresService from './padres.service.js';
import { success } from '../../utils/responses.js';

export const create = async (req, res) => success(res, await PadresService.create(req.validated), 'Padre creado', 201);
export const list = async (_req, res) => success(res, await PadresService.list(), 'Padres');
export const get = async (req, res) => success(res, await PadresService.detail(req.params.id), 'Padre');
export const byAlumno = async (req, res) => success(res, await PadresService.byAlumno(req.params.alumnoId), 'Tutores del alumno');
export const notifications = async (req, res) => { await PadresService.updateNotification(req.params.id, req.validated.activo); return success(res, null, 'Preferencia actualizada'); };
export const linkTelegram = async (req, res) => { await PadresService.linkTelegram(req.params.id, req.validated.telegram_chat_id); return success(res, null, 'Telegram vinculado'); };
export const unlinkTelegram = async (req, res) => { await PadresService.unlinkTelegram(req.params.id); return success(res, null, 'Telegram desvinculado'); };
export const telegramLink = async (req, res) => success(res, await PadresService.createTelegramLink(req.params.id), 'Enlace de vinculación generado', 201);
