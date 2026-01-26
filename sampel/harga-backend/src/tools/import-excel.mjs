// src/tools/import-excel.mjs
import "dotenv/config.js";
import { MongoClient } from "mongodb";
import fs from "fs";
import XLSX from "xlsx";
import { parseMonthlySheet } from "../lib/excel.mjs";
import { aliasesFor } from "../routes/importExcel.js";

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

  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
  const dbName = process.env.MONGO_DB_NAME || process.env.DB_NAME || "harga_pasar";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  try {
    const pasar = db.collection('pasar');
    const komoditas = db.collection('komoditas');
    const laporan_harga = db.collection('laporan_harga');

    const p = await pasar.findOne({ nama_pasar: market }, { projection: { id: 1, nama_pasar: 1 } });
    if (!p) throw new Error(`Pasar "${market}" tidak ditemukan`);

    const buf = fs.readFileSync(file);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const parsed = parseMonthlySheet(ws, { year: Number(year) });
    const items = parsed?.items || [];
    if (!items.length) throw new Error('Tidak ada item terdeteksi');

    const komList = await komoditas.find({}, { projection: { _id: 0, id: 1, nama_komoditas: 1 } }).toArray();
    const idMap = new Map();
    for (const r of komList) {
      idMap.set(r.nama_komoditas.toLowerCase(), r.id);
      for (const a of aliasesFor(r.nama_komoditas)) idMap.set(String(a).toLowerCase(), r.id);
    }

    let inserted = 0, skipped = 0;
    for (const it of items) {
      const komId = idMap.get(String(it.komoditas_nama).toLowerCase()) || null;
      if (!komId) { skipped++; continue; }
      await laporan_harga.updateOne(
        { market_id: p.id, komoditas_id: komId, tanggal_lapor: it.tanggal_lapor },
        { $set: { harga: it.harga, status: 'verified', updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
        { upsert: true }
      );
      inserted++;
    }
    console.log(`OK: ${p.nama_pasar} ${month}/${year} (${inserted} masuk, ${skipped} dilewati)`);
  } catch (err) {
    console.error('[Import error]', err?.message || err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
