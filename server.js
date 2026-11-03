import 'dotenv/config';
import app from './src/app.js';
import { env } from './src/config/env.js';
import './src/modules/notificaciones/telegram.bot.js';
import TelegramService from './src/modules/notificaciones/telegram.service.js';
import { startAbsenceScheduler } from './src/modules/asistencias/avisos.scheduler.js';

app.listen(env.port, () => {
	console.log(`[AQR] API ejecutándose en http://localhost:${env.port}${env.apiPrefix}`);
	// Solo la instancia que escucha al bot envía los avisos de "no llegó".
	if (TelegramService.enabled && env.telegram.polling) startAbsenceScheduler();
});
 