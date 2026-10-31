const split = (value, fallback) => (value || fallback).split(',').map(item => item.trim()).filter(Boolean);

// TRUST_PROXY -> valor de app.set('trust proxy'). Apagado por defecto: req.ip es quien se conecta.
// Acepta 'loopback', IPs/subredes separadas por coma o un número de saltos; nunca 'true', que haría
// confiar en cualquier X-Forwarded-For y dejaría falsificar la IP que ve el rate limit.
export const parseTrustProxy = value => {
	const text = String(value ?? '').trim().toLowerCase();
	if (!text || text === 'false' || text === '0') return false;
	if (text === 'true') throw new Error('TRUST_PROXY=true no está permitido: usa "loopback" o la IP del proxy');
	if (/^\d+$/.test(text)) return Number(text);
	return split(text);
};

export const env = {
	nodeEnv: process.env.NODE_ENV || 'development',
	port: Number(process.env.PORT || 3000),
	apiPrefix: process.env.API_PREFIX || '/api',
	// URL con la que el navegador llega a este servidor; se usa para las fotos guardadas en disco.
	publicUrl: (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, ''),
	schoolName: process.env.SCHOOL_NAME || 'Escuela',
	db: {
		host: process.env.DB_HOST || '127.0.0.1',
		port: Number(process.env.DB_PORT || 3306),
		user: process.env.DB_USER || 'root',
		password: process.env.DB_PASSWORD || '',
		database: process.env.DB_NAME || 'asistencia_escolar',
	},
	jwtSecret: process.env.JWT_SECRET || 'cambia-esta-clave-en-produccion',
	jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
	corsOrigins: split(process.env.ALLOWED_ORIGINS, 'http://localhost:5173'),
	trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
	cloudinary: {
		cloudName: process.env.CLOUDINARY_CLOUD_NAME,
		apiKey: process.env.CLOUDINARY_API_KEY,
		apiSecret: process.env.CLOUDINARY_API_SECRET,
	},
	telegram: {
		botToken: process.env.TELEGRAM_BOT_TOKEN,
		// Solo un proceso puede escuchar al bot a la vez; pon TELEGRAM_POLLING=false en instancias extra.
		polling: process.env.TELEGRAM_POLLING !== 'false',
	},
};

if (env.nodeEnv === 'production' && env.jwtSecret.startsWith('cambia-')) {
	throw new Error('JWT_SECRET debe configurarse en producción');
}
