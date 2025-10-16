// src/tools/import-excel.mjs
import "dotenv/config.js";
import { createPool } from "mysql2/promise";
import { importExcelToDb } from "../lib/excel.mjs";

/** ---- DB ---- */
const pool = createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "harga_pasar",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 5,
});

/** ---- CLI args ---- */
function parseArgs(argv) {
  const args = {};
  for (const part of argv.slice(2)) {
    const m = part.match(/^--([^=\s]+)(?:=(.*))?$/);
    if (m) {
      const key = m[1];
      const val = m[2] != null ? m[2] : null;
      args[key] = val;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const file = args.file || args.f;
  const market = args.market || args.m;
  const month = (args.month || args.mm || "").padStart(2, "0");
  const year = args.year || args.yy;

  if (!file || !market || !month || !year) {
    console.log(
      'Usage: npm run import:excel -- ' +
      '--file="./data/pasar-bauntung-2024.xlsx" ' +
      '--market="Pasar Bauntung" --month=07 --year=2024'
    );
    process.exit(1);
  }

  const conn = await pool.getConnection();
  try {
    const summary = await importExcelToDb({
      file,
      marketName: market,
      month,
      year,
      conn,
    });

    console.log(
      `OK: "${summary.sheet}" ⇒ ${summary.market} ${summary.month}/${summary.year} ` +
      `(${summary.inserted} baris masuk, ${summary.skipped} dilewati).`
    );
  } catch (err) {
    console.error("[Import error]", err?.message || err);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
