// Crea una cuenta de DIRECTORA (control total) desde la terminal. Es la única forma de crear una;
// desde el panel la directora solo crea cuentas de personal de entrada.
// Uso: npm run crear-admin -- "Nombre Completo" correo@escuela.com "contraseña"
import 'dotenv/config';
import { db } from '../src/config/db.js';
import AuthService from '../src/modules/auth/auth.service.js';
import { registerSchema } from '../src/modules/auth/auth.schemas.js';

const [nombre, email, password] = process.argv.slice(2);
const result = registerSchema({ nombre, email, password });

try {
	if (!result.ok) {
		console.error('Uso: npm run crear-admin -- "Nombre Completo" correo@escuela.com "contraseña"');
		for (const error of result.errors) console.error(` - ${error.field}: ${error.message}`);
		process.exitCode = 1;
	} else {
		const { id } = await AuthService.register(result.value, 'directora');
		console.log(`Directora creada con id ${id} (${email})`);
	}
} catch (error) {
	console.error('No se pudo crear:', error.message);
	process.exitCode = 1;
} finally {
	await db.end();
}
