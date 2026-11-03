import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { env } from '../../config/env.js';
import { loadPhoto } from '../alumnos/fotos.service.js';

// Tarjeta CR80 (tamaño credencial bancaria): 85.6 x 54 mm, impresa a tamaño real en hoja carta.
const MM = 72 / 25.4;
const CARD_W = 85.6 * MM;
const CARD_H = 54 * MM;
const PAGE_W = 612;
const PAGE_H = 792;
const COLS = 2;
const ROWS = 4;
const GAP = 14;
const ORIGIN_X = (PAGE_W - (COLS * CARD_W + (COLS - 1) * GAP)) / 2;
const ORIGIN_Y = (PAGE_H - (ROWS * CARD_H + (ROWS - 1) * GAP)) / 2;
const PRIMARY = '#1e3a8a';
const MUTED = '#6b7280';

const drawPhoto = (doc, photo, x, y, w, h) => {
	if (photo) {
		try {
			doc.save().rect(x, y, w, h).clip();
			doc.image(photo, x, y, { cover: [w, h], align: 'center', valign: 'center' });
			doc.restore();
			doc.rect(x, y, w, h).lineWidth(0.5).stroke('#d1d5db');
			return;
		} catch {
			doc.restore();
		}
	}
	doc.rect(x, y, w, h).fill('#e5e7eb');
	doc.fillColor(MUTED).font('Helvetica').fontSize(6).text('SIN FOTO', x, y + h / 2 - 3, { width: w, align: 'center' });
};

const drawCard = (doc, x, y, alumno, photo, qr) => {
	const pad = 8;
	// Encabezado con el nombre de la escuela.
	doc.save().roundedRect(x, y, CARD_W, CARD_H, 8).clip();
	doc.rect(x, y, CARD_W, 26).fill(PRIMARY);
	doc.restore();
	doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
		.text(env.schoolName.toUpperCase(), x + pad, y + 5, { width: CARD_W - 2 * pad, height: 10, align: 'center', ellipsis: true });
	doc.font('Helvetica').fontSize(5.5).text('CREDENCIAL DE ALUMNO', x + pad, y + 16, { width: CARD_W - 2 * pad, align: 'center' });

	const photoX = x + pad;
	const bodyY = y + 33;
	drawPhoto(doc, photo, photoX, bodyY, 60, 75);

	const qrSize = 88;
	const qrX = x + CARD_W - pad - qrSize;
	doc.image(qr, qrX, bodyY - 1, { width: qrSize });

	const textX = photoX + 60 + 7;
	const textW = qrX - 4 - textX;
	doc.fillColor(MUTED).font('Helvetica').fontSize(5.5).text('NOMBRE', textX, bodyY + 2, { width: textW });
	doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8).text(alumno.nombre, textX, bodyY + 9, { width: textW, height: 34, ellipsis: true });
	doc.fillColor(MUTED).font('Helvetica').fontSize(5.5).text('GRADO', textX, bodyY + 48, { width: textW });
	doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9).text(alumno.grado || '-', textX, bodyY + 55, { width: textW, height: 12, ellipsis: true });

	const footerY = y + CARD_H - 13;
	doc.fillColor(MUTED).font('Helvetica').fontSize(5.5)
		.text(`No. ${String(alumno.id).padStart(5, '0')}`, x + pad, footerY, { width: 60 })
		.text('Personal e intransferible', x + pad, footerY, { width: CARD_W - 2 * pad, align: 'right' });

	// Contorno punteado como guía de corte.
	doc.roundedRect(x, y, CARD_W, CARD_H, 8).lineWidth(0.5).dash(3, { space: 2 }).stroke('#9ca3af').undash();
};

// alumnos: [{ id, nombre, grado, foto_url, qr_token }]. Acomoda 8 credenciales por hoja carta.
export const generateCredentialsPdf = async alumnos => {
	const assets = await Promise.all(alumnos.map(async alumno => ({
		alumno,
		photo: await loadPhoto(alumno.foto_url),
		qr: await QRCode.toBuffer(alumno.qr_token, { margin: 1, width: 300, errorCorrectionLevel: 'M' }),
	})));
	const doc = new PDFDocument({ size: 'LETTER', margin: 0, autoFirstPage: false });
	const chunks = [];
	doc.on('data', chunk => chunks.push(chunk));
	const done = new Promise(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));
	assets.forEach(({ alumno, photo, qr }, index) => {
		const slot = index % (COLS * ROWS);
		if (slot === 0) doc.addPage();
		const x = ORIGIN_X + (slot % COLS) * (CARD_W + GAP);
		const y = ORIGIN_Y + Math.floor(slot / COLS) * (CARD_H + GAP);
		drawCard(doc, x, y, alumno, photo, qr);
	});
	doc.end();
	return done;
};
