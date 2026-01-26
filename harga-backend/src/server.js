// src/server.js
import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';

// Middleware & helpers
import requireAuth from './middleware/requireAuth.js';
import requireRole from './middleware/requireRole.js'; // dipakai untuk sebagian route lain
import { bus } from './events/bus.js';
import { initMongo, mongoUri, mongoDbName } from './tools/db.js';

// Routers (WEB)
import authRouter from './routes/auth.js';
import meRouter from './routes/me.js';
import marketsRouter from './routes/markets.js';
import commoditiesRouter from './routes/commodities.js';
import pricesRouter from './routes/prices.js';
import importExcelRouter from './routes/importExcel.js';
import importFlexRouter from './routes/importFlex.js';
import usersRouter from './routes/users.js'; // ⬅️ SATU import saja
import surveyHistoryRouter from './routes/surveyHistory.js';
import mobileUsersRouter from './routes/mobileUsers.js';
// (opsional) API Mobile
import mobileAuthRouter from './routes/mobileAuth.js';
import mobileReportsRouter from './routes/mobileReports.js';
import exportPdfRouter from './routes/exportPdf.js';
import exportPdfKomoditasRouter from './routes/exportPdfKomoditas.js';
import exportPdfBackupAllRouter from './routes/exportPdfBackupAll.js';
// Stats & Monitoring
import statsRouter from './routes/stats.js';
import exportExcelRouter from './routes/exportExcel.js';

const app = express();

// Trust Vercel proxy for secure cookies
app.set('trust proxy', 1);

/* ---------- Security & basics ---------- */
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - Support multiple domains
const allowedOrigins = [
  'https://harpa-banua.vercel.app',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (same-origin, mobile apps, Postman)
      if (!origin) return callback(null, true);

      // Check exact match or allow all Vercel domains (*.vercel.app)
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';

/* ---------- Session (sebelum routes yang pakai req.session) ---------- */
const sessionStore = MongoStore.create({
  mongoUrl: mongoUri,
  dbName: mongoDbName,
  collectionName: 'sessions',
  ttl: 60 * 60 * 24 * 7, // 7 days
  autoRemove: 'interval',
  autoRemoveInterval: 10,
  touchAfter: 24 * 3600, // lazy session update
});

// Log session store errors
sessionStore.on('error', (error) => {
  console.error('[SESSION STORE ERROR]', error);
});

console.log('[SESSION CONFIG]', {
  mongoUri: mongoUri ? 'SET' : 'NOT_SET',
  secret: (process.env.SESSION_SECRET || 'dev_secret').substring(0, 10) + '...',
  isProduction,
  vercelEnv: process.env.VERCEL ? 'YES' : 'NO',
});

app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'dev_secret_fallback_change_in_production',
    resave: false,
    saveUninitialized: false,
    proxy: true, // ALWAYS trust proxy in Vercel
    store: sessionStore,
    cookie: {
      httpOnly: true,
      // Use 'none' in production so Set-Cookie is accepted when frontend and API
      // are served from different preview domains on Vercel. Keep 'lax' in dev.
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction, // true on HTTPS (Vercel)
      maxAge: 24 * 60 * 60 * 1000, // 1 hari
      path: '/',
      // NO domain setting - let browser set it automatically for current domain
      // This works for same-origin requests in Vercel
    },
  })
);

// Debug session middleware
app.use((req, res, next) => {
  console.log('[SESSION DEBUG]', {
    method: req.method,
    path: req.path,
    hasSession: !!req.session,
    hasUser: !!req.session?.user,
    cookies: req.headers.cookie || 'NO_COOKIE',
  });
  next();
});

app.use('/m/users', mobileUsersRouter);

/* ---------- Static uploads (foto/avatar) ---------- */
const uploadDir = isProduction
  ? path.resolve('/tmp/uploads')
  : path.resolve('tmp/uploads');
try {
  app.use('/uploads', express.static(uploadDir));
} catch (err) {
  console.warn('Static uploads directory not available:', err.message);
}

/* ---------- Health & routes list ---------- */
app.get('/health', (_req, res) => res.json({ ok: true }));
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

  // Allow all origins in allowedOrigins list
  if (origin && allowedOrigins.includes(origin)) {
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

/* ---------- Stats & Monitoring ---------- */
app.use('/api/stats', requireAuth, statsRouter);

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

// PDF Export - mount komoditas-specific router first so it takes precedence
app.use('/api', exportPdfKomoditasRouter);
// Dedicated backup-all PDF router (special format for "Backup Semua Pasar")
app.use('/api', exportPdfBackupAllRouter);
// legacy/general export router (kept for other endpoints)
app.use('/api', exportPdfRouter);
app.use('/api', exportExcelRouter);

// USERS
// Gunakan hanya requireAuth di sini agar /api/users/me/avatar bisa diakses semua user yang login.
// Cek role admin dilakukan di dalam routes/users.js pada endpoint tertentu (reset-password, delete, dll).
// Cek role admin dilakukan di dalam routes/users.js pada endpoint tertentu (reset-password, delete, dll).
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/survey-history', requireAuth, surveyHistoryRouter);

/* ---------- Start ---------- */
const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  await initMongo();
  console.log(`Server berjalan di port ${PORT}`);
});
