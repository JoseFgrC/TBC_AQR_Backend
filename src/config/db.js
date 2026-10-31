import mysql from 'mysql2/promise';
import { env } from './env.js';

export const db = mysql.createPool({
	...env.db,
	waitForConnections: true,
	connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
	charset: 'utf8mb4',
	timezone: 'Z',
	// Devuelve DATETIME tal cual está en la BD ('2026-10-02 08:15:00') sin conversiones de zona horaria.
	dateStrings: true,
});
