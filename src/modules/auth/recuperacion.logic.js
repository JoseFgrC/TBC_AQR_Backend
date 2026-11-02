import crypto from 'node:crypto';
import { env } from '../../config/env.js';

// Códigos de un solo uso de las cuentas de la escuela (tabla admin_codigos).
export const TIPO_RECUPERAR = 'recuperar_password';
export const TIPO_VINCULAR = 'vincular_telegram';
export const RECOVERY_MINUTES = 10;
export const LINK_MINUTES = 15;
export const MAX_ATTEMPTS = 5;
// t.me/<bot>?start=adm_<código>; los códigos de padres nunca empiezan así (padres.service.js).
export const ADMIN_LINK_PREFIX = 'adm_';

// Clave propia derivada de JWT_SECRET: con solo una copia de la BD no se pueden probar los 10^6 códigos.
const HMAC_KEY = crypto.createHmac('sha256', env.jwtSecret).update('aqr:admin-codigos:v1').digest();

export const hashCode = code => crypto.createHmac('sha256', HMAC_KEY).update(String(code)).digest('hex');

export const sameHash = (a, b) =>
	typeof a === 'string' && typeof b === 'string' && a.length === 64 && b.length === 64
	&& crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));

export const isRecoveryCode = value => typeof value === 'string' && /^\d{6}$/.test(value);
export const createRecoveryCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
export const createLinkCode = () => crypto.randomBytes(16).toString('base64url');

// Payload de /start -> código de la cuenta, o null si es de un padre (o no trae código).
export const adminLinkCode = payload =>
	typeof payload === 'string' && payload.startsWith(ADMIN_LINK_PREFIX) ? payload.slice(ADMIN_LINK_PREFIX.length) : null;

// Fila de admin_codigos lista para comparar: existe, no venció y le quedan intentos.
export const isUsable = row => Boolean(row) && !Number(row.vencido) && Number(row.intentos) <= MAX_ATTEMPTS;
