// src/server.js
import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import MongoStore from 'connect-mongo';
import { isMongo } from './tools/mongo.js';
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

// In Vercel serverless, default to skipping persistent session store to avoid cold-start timeouts
if (process.env.VERCEL === '1' && !process.env.FORCE_SESSION) {
  process.env.SKIP_SESSION = process.env.SKIP_SESSION || '1';
}


const app = express();
const uploadStaticPath = process.env.VERCEL === '1'
  ? path.join(os.tmpdir(), 'uploads')       // Vercel: gunakan /tmp/uploads
  : path.join(process.cwd(), 'tmp', 'uploads'); // Lokal: tmp/uploads di project

// Pastikan direktori uploads tersedia (khususnya saat di Vercel menggunakan os.tmpdir())
try {
  fs.mkdirSync(uploadStaticPath, { recursive: true });
} catch (_) {}

app.use('/uploads', express.static(uploadStaticPath));
// Alias di bawah /api agar tetap terjangkau tanpa rewrite Vercel
app.use('/api/uploads', express.static(uploadStaticPath));
/* ---------- Security & basics ---------- */
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Default origins: localhost + Netlify site
const _defaultOrigins = [
  'http://localhost:5173',
  'https://proyek-hargapangan-admin.netlify.app',
];
// Merge env FRONTEND_ORIGIN with defaults to be safer
const envOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const allowList = Array.from(new Set([..._defaultOrigins, ...envOrigins]));

function isAllowedOrigin(origin) {
  try {
    if (allowList.includes(origin)) return true;
    const u = new URL(origin);
    const host = u.hostname;
    // Izinkan Netlify preview: <hash>--proyek-hargapangan-admin.netlify.app
    if (host === 'proyek-hargapangan-admin.netlify.app') return true;
    if (host.endsWith('--proyek-hargapangan-admin.netlify.app')) return true;
    return false;
  } catch {
    return false;
  }
}

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                 // mis. curl/postman
    if (isAllowedOrigin(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
};

app.use(cors(corsOptions));
// Tangani preflight untuk semua route (OPTIONS)
app.options('*', cors(corsOptions));

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

// Early health endpoints (do not require session/DB)
app.get('/health', (_req, res) => res.status(200).json({ ok: true, ts: Date.now() }));
app.get('/api/health', (_req, res) => res.status(200).json({ ok: true, ts: Date.now() }));
app.get('/__routes-lite', (_req, res) => {
  res.json({ ok: true, notes: 'use /api/__routes after session/DB ready' });
});

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
    store: (
      process.env.SKIP_SESSION === '1'
        ? undefined
        : (
            isMongo()
              ? MongoStore.create({
                  mongoUrl: process.env.MONGO_URI,
                  dbName: process.env.MONGO_DB_NAME || 'harga_pasar_mongo',
                  ttl: 60 * 60 * 24 * 7,
                  autoRemove: 'native',
                })
              : new MySQLStore(mysqlOptions)
          )
    ),
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
const routesListHandler = (_req, res) => {
  const stack = (app._router?.stack || [])
    .filter((l) => l.route)
    .map((l) => ({
      path: l.route.path,
      methods: Object.keys(l.route.methods),
    }));
  res.json(stack);
};
app.get('/__routes', routesListHandler);
app.get('/api/__routes', routesListHandler);

/* ---------- SSE: harga live ---------- */
const ssePricesHandler = (req, res) => {
  const origin = req.headers.origin;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (origin && isAllowedOrigin(origin)) {
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
};
app.get('/sse/prices', ssePricesHandler);
app.get('/api/sse/prices', ssePricesHandler);

/* ---------- Mobile API (opsional) ---------- */
app.use('/m/auth', mobileAuthRouter);
app.use('/m/reports', mobileReportsRouter);

/* ---------- WEB (admin) ---------- */
app.use('/auth', authRouter);
// Alias di bawah /api agar aman tanpa rewrite Vercel
app.use('/api/auth', authRouter);
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

