import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../../config/db.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middlewares/error.middlewares.js';
import { hashPassword } from '../../utils/password.js';
import RecuperacionService from './recuperacion.service.js';

export const ROLES = ['directora', 'escaner'];

const publicUser = row => ({ id: row.id, nombre: row.nombre, email: row.email, rol: row.rol });
const signToken = user => jwt.sign(publicUser(user), env.jwtSecret, { expiresIn: env.jwtExpiresIn, issuer: 'asistencia-escolar' });

export default class AuthService {
  // Desde el panel solo se crea personal de entrada ('escaner'); una directora solo con `npm run crear-admin`.
  static async register({ nombre, email, password }, rol = 'escaner') {
    if (!ROLES.includes(rol)) throw new AppError('Rol inválido', 400);
    const [existing] = await db.query('CALL sp_obtener_admin_por_email(?)', [email]);
    if (existing[0][0]) throw new AppError('El email ya está registrado', 409);
    const [result] = await db.query('CALL sp_crear_admin(?, ?, ?, ?)', [nombre, email, await hashPassword(password), rol]);
    return { id: result[0][0].id_admin, rol };
  }

  static async login({ email, password }) {
    const [result] = await db.query('CALL sp_obtener_admin_por_email(?)', [email]);
    const user = result[0][0];
    if (!user || !user.activo || !(await bcrypt.compare(password, user.password_hash))) throw new AppError('Credenciales inválidas', 401);
    return { accessToken: signToken(user), user: publicUser(user) };
  }

  static async list() {
    const [result] = await db.query('CALL sp_listar_admins()');
    return result[0].map(row => ({ ...row, activo: Boolean(row.activo) }));
  }

  static async findById(id) {
    const [result] = await db.query('CALL sp_obtener_admin_por_id(?)', [id]);
    if (!result[0][0]) throw new AppError('Cuenta no encontrada', 404);
    return result[0][0];
  }

  static async setStatus(currentUser, id, activo) {
    if (Number(id) === currentUser.id) throw new AppError('No puedes desactivar tu propia cuenta', 400);
    await this.findById(id);
    await db.query('CALL sp_cambiar_estado_admin(?, ?)', [id, activo]);
    return publicUser(await this.findById(id));
  }

  // La directora restablece la contraseña de otra cuenta; sus sesiones abiertas se cierran.
  static async resetPassword(currentUser, id, password) {
    if (Number(id) === currentUser.id) throw new AppError('Para tu propia cuenta usa "cambiar contraseña"', 400);
    await this.findById(id);
    await db.query('CALL sp_cambiar_password_admin(?, ?)', [id, await hashPassword(password)]);
    return null;
  }

  // Cambia la propia contraseña; devuelve un token nuevo porque los anteriores dejan de servir.
  // Si tiene Telegram vinculado se le avisa (sin esperar: una falla de Telegram no afecta el cambio).
  static async changePassword(currentUser, { password_actual, password_nueva }) {
    const user = await this.findById(currentUser.id);
    if (!(await bcrypt.compare(password_actual, user.password_hash))) throw new AppError('La contraseña actual no es correcta', 400);
    await db.query('CALL sp_cambiar_password_admin(?, ?)', [user.id, await hashPassword(password_nueva)]);
    RecuperacionService.passwordChanged(user.id);
    return { accessToken: signToken(user), user: publicUser(user) };
  }

  // Para el script de emergencia `npm run restablecer-password` (sin sesión).
  static async resetPasswordByEmail(email, password) {
    const [result] = await db.query('CALL sp_obtener_admin_por_email(?)', [email]);
    const user = result[0][0];
    if (!user) throw new AppError('No existe una cuenta con ese email', 404);
    await db.query('CALL sp_cambiar_password_admin(?, ?)', [user.id, await hashPassword(password)]);
    if (!user.activo) await db.query('CALL sp_cambiar_estado_admin(?, TRUE)', [user.id]);
    return publicUser(user);
  }
}
