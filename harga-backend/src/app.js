import express from 'express';
import exportPdfKomoditasRouter from './routes/exportPdfKomoditas.js';

const app = express();

// Middleware dan pengaturan lainnya

// Tambahkan router baru untuk endpoint /export-pdf-komoditas
app.use('/api', exportPdfKomoditasRouter);

// Rute dan logika lainnya

export default app;