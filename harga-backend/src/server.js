// src/server.js
import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import path from 'path';

// Middleware & helpers
import requireAuth from './middleware/requireAuth.js';
import requireRole from './middleware/requireRole.js'; // dipakai untuk sebagian route lain
import { bus } from './events/bus.js';
import { mysqlOptions } from './tools/db.js'; // ⬅️ named import, sesuai file DB kamu

// Routers (WEB)
import authRouter from './routes/auth.js';
import meRouter from './routes/me.js';
import marketsRouter from './routes/markets.js';
import commoditiesRouter from './routes/commodities.js';
import pricesRouter from './routes/prices.js';
import importExcelRouter from './routes/importExcel.js';
import importFlexRouter from './routes/importFlex.js';
import usersRouter from './routes/users.js'; // ⬅️ SATU import saja
import mobileUsersRouter from './routes/mobileUsers.js';
// (opsional) API Mobile
import mobileAuthRouter from './routes/mobileAuth.js';
import mobileReportsRouter from './routes/mobileReports.js';
import fs from 'fs';
import os from 'os';


const app = express();
const uploadStaticPath = process.env.VERCEL === '1'
  ? path.join(os.tmpdir(), 'uploads')       // Vercel: gunakan /tmp/uploads
  : path.join(process.cwd(), 'tmp', 'uploads'); // Lokal: tmp/uploads di project

// Pastikan direktori uploads tersedia (khususnya saat di Vercel menggunakan os.tmpdir())
try {
  fs.mkdirSync(uploadStaticPath, { recursive: true });
} catch (_) {}

app.use('/uploads', express.static(uploadStaticPath));
/* ---------- Security & basics ---------- */
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const allowList = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                 // mis. curl/postman
    if (allowList.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed`));
  },
  credentials: true,
}));

/* ---------- Root + favicon (nice DX) ---------- */
app.get('/', (_req, res) => {
  res.status(200).json({
    ok: true,
    name: 'harga-backend',
    routes: '/__routes',
    ping: '/api/ping',
  });
});
app.get('/favicon.ico', (_req, res) => res.status(204).end());

/* ---------- Session (sebelum routes yang pakai req.session) ---------- */
const useSecureCookie = allowList.some(o => o.startsWith('https://'));
const sameSite = useSecureCookie ? 'none' : 'lax';
const MySQLStore = MySQLStoreFactory(session);
app.use(
  session({
    name: process.env.COOKIE_NAME || 'sid',
    secret: process.env.SESSION_SECRET || 'dev_secret',
    resave: false,
    saveUninitialized: false,
    store: new MySQLStore(mysqlOptions),
    cookie: {
      httpOnly: true,
      sameSite,                // https → 'none', lokal → 'lax'
      secure: useSecureCookie, // https (Netlify/Tunnel) → true, lokal → false
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use('/m/users', mobileUsersRouter);

/* ---------- Health & routes list ---------- */
app.get('/__routes', (_req, res) => {
  const stack = (app._router?.stack || [])
    .filter((l) => l.route)
    .map((l) => ({
      path: l.route.path,
      methods: Object.keys(l.route.methods),
    }));
  res.json(stack);
});

/* ---------- SSE: harga live ---------- */
app.get('/sse/prices', (req, res) => {
  const origin = req.headers.origin;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (origin && allowList.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const wantMarketId = Number(req.query.marketId || NaN);
  const handler = (payload) => {
    if (Number.isFinite(wantMarketId) && payload?.marketId !== wantMarketId) return;
    res.write(`event: prices\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  bus.on('prices:changed', handler);
  const ping = setInterval(() => {
    res.write(`event: ping\ndata: "💓"\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    bus.off('prices:changed', handler);
    res.end();
  });
});

/* ---------- Mobile API (opsional) ---------- */
app.use('/m/auth', mobileAuthRouter);
app.use('/m/reports', mobileReportsRouter);

/* ---------- WEB (admin) ---------- */
app.use('/auth', authRouter);
app.use('/api/me', requireAuth, meRouter);

// Sumber data
app.use('/api/markets', marketsRouter);
app.use('/api/commodities', commoditiesRouter);
app.use('/api/prices', pricesRouter);

// Import Excel
app.use('/api/import-excel', importExcelRouter);
app.use('/api/importExcel', importExcelRouter); // alias kompat
app.use('/api/import-flex', importFlexRouter);

// USERS
// Gunakan hanya requireAuth di sini agar /api/users/me/avatar bisa diakses semua user yang login.
// Cek role admin dilakukan di dalam routes/users.js pada endpoint tertentu (reset-password, delete, dll).
// satu-satunya mount /api/users
app.use('/api/users', requireAuth, requireRole('admin'), usersRouter);

/* ---------- Start ---------- */
// Health check harus satu kali saja sebelum sesi & DB


// Middleware error agar pesan error muncul jelas di log Vercel
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err?.message || 'Internal error' });
});

// Hanya memanggil listen() saat dijalankan lokal (bukan di Vercel)
if (process.env.VERCEL !== '1') {
  const port = process.env.PORT || 8080;
  app.listen(port, () => console.log(`API listening on ${port}`));
}

// Ekspor default app agar dapat diimpor di api/index.js
export default app;

