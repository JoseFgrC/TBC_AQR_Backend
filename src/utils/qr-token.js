import crypto from 'node:crypto';

// Token opaco que viaja dentro del QR; se guarda tal cual en alumnos.qr_token (VARCHAR(100)).
export const createQrToken = () => crypto.randomBytes(24).toString('base64url');
