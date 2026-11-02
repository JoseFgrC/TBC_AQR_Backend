// Restablece la contraseña de cualquier cuenta desde la terminal (por ejemplo, si la directora la olvida).
// Cierra sus sesiones abiertas y, si estaba desactivada, la vuelve a activar.
// Uso: npm run restablecer-password -- correo@escuela.com "nueva-contraseña"
import 'dotenv/config';
import { db } from '../src/config/db.js';
import AuthService from '../src/modules/auth/auth.service.js';
import { resetPasswordSchema } from '../src/modules/auth/auth.schemas.js';

const [email, password] = process.argv.slice(2);
const result = resetPasswordSchema({ password });

try {
	if (!email || !result.ok) {
		console.error('Uso: npm run restablecer-password -- correo@escuela.com "nueva-contraseña"');
		for (const error of result.errors ?? []) console.error(` - ${error.field}: ${error.message}`);
		process.exitCode = 1;
	} else {
		const user = await AuthService.resetPasswordByEmail(email, password);
		console.log(`Contraseña restablecida para ${user.nombre} (${user.email}, ${user.rol})`);
	}
} catch (error) {
	console.error('No se pudo restablecer:', error.message);
	process.exitCode = 1;
} finally {
	await db.end();
}
