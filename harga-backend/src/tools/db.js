// src/tools/db.js
import mysql from 'mysql2/promise';

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '3306',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'harga_pasar',
} = process.env;

export const mysqlOptions = {
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
};

export const pool = mysql.createPool(mysqlOptions);

// helper singkat
export async function query(sql, params) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
