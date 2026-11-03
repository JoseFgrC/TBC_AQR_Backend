import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { authenticate, requireRole } from './middlewares/auth.middlewares.js';
import { apiLimiter } from './middlewares/rateLimiter.middlewares.js';
import { errorHandler, notFound } from './middlewares/error.middlewares.js';
import authRoutes from './modules/auth/auth.routes.js';
import alumnosRoutes from './modules/alumnos/alumnos.routes.js';
import asistenciasRoutes from './modules/asistencias/asistencias.routes.js';
import padresRoutes from './modules/padres/padres.routes.js';
import credencialesRoutes from './modules/credenciales/credenciales.routes.js';
import horariosRoutes from './modules/horarios/horarios.routes.js';
import { UPLOADS_DIR } from './modules/alumnos/fotos.service.js';
import { success } from './utils/responses.js';

const app = express();
// Solo se lee X-Forwarded-For si la conexión viene de un proxy de confianza (TRUST_PROXY).
app.set('trust proxy', env.trustProxy);
app.use(helmet());
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
// Fotos guardadas en disco (cuando no hay Cloudinary); se permiten desde el frontend en otro origen.
app.use('/uploads', express.static(UPLOADS_DIR, { setHeaders: res => res.set('Cross-Origin-Resource-Policy', 'cross-origin') }));
app.use(apiLimiter);
app.get('/health', (_req, res) => success(res, { status: 'ok' }, 'API disponible'));
app.use(`${env.apiPrefix}/auth`, authRoutes);
// Alumnos, tutores, credenciales y la mayoría de horarios: solo la directora.
// El personal de entrada ('escaner') solo escanea y consulta el horario del día.
app.use(`${env.apiPrefix}/alumnos`, authenticate, requireRole('directora'), alumnosRoutes);
app.use(`${env.apiPrefix}/asistencias`, authenticate, asistenciasRoutes);
app.use(`${env.apiPrefix}/padres`, authenticate, requireRole('directora'), padresRoutes);
app.use(`${env.apiPrefix}/credenciales`, authenticate, requireRole('directora'), credencialesRoutes);
app.use(`${env.apiPrefix}/horarios`, authenticate, horariosRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
