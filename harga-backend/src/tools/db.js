import mysql from 'mysql2/promise';

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'harga_pasar',
} = process.env;

// Aktifkan SSL bila DB_SSL=true (mis. Aiven)
const ssl = process.env.DB_SSL === 'true'
  ? { rejectUnauthorized: true, minVersion: 'TLSv1.2' }
  : undefined;

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
  charset: 'utf8mb4'
};

// Gunakan mysqlOptions untuk membuat pool
const pool = mysql.createPool(mysqlOptions);

// Helper query
export const query = (sql, params) => pool.execute(sql, params);
