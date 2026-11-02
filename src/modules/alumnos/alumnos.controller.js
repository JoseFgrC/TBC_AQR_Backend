import AlumnosService from './alumnos.service.js';
import { success } from '../../utils/responses.js';

export const create = async (req, res) => success(res, await AlumnosService.create(req.validated), 'Alumno creado', 201);
export const list = async (req, res) => success(res, await AlumnosService.list(req.query), 'Alumnos');
export const get = async (req, res) => success(res, await AlumnosService.findById(req.params.id), 'Alumno');
export const uploadPhoto = async (req, res) => success(res, await AlumnosService.updatePhoto(req.params.id, req.file), 'Foto actualizada');
export const update = async (req, res) => success(res, await AlumnosService.update(req.params.id, req.validated), 'Alumno actualizado');
export const addTutor = async (req, res) => success(res, await AlumnosService.addTutor(req.params.id, req.validated), 'Tutor asignado');
export const removeTutor = async (req, res) => success(res, await AlumnosService.removeTutor(req.params.id, req.params.padreId), 'Tutor quitado');
