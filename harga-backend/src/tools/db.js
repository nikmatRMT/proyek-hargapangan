import mysql from 'mysql2/promise';

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'harga_pasar',
  DB_SSL = 'false',
  DB_SSL_CA = '',
  DB_SSL_CA_BASE64 = '',
} = process.env;

// Aktifkan SSL bila DB_SSL=true (mis. Aiven). Dukung CA melalui env string atau base64.
let ssl = undefined;
if (String(DB_SSL).toLowerCase() === 'true') {
  ssl = { rejectUnauthorized: true, minVersion: 'TLSv1.2' };
  const ca = DB_SSL_CA || (DB_SSL_CA_BASE64 ? Buffer.from(DB_SSL_CA_BASE64, 'base64').toString('utf8') : undefined);
  if (ca) ssl.ca = ca;
}

// Opsi koneksi tunggal dan konsisten
export const mysqlOptions = {
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  ssl,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000,
  charset: 'utf8mb4'
};
const pool = mysql.createPool(mysqlOptions);
export { pool };

// Helper query
export const query = (sql, params) => pool.execute(sql, params);
