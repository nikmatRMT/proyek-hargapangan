import express from "express";
import { pool } from "../tools/db.js";
import { isMongo } from "../tools/mongo.js";
import Market from "../models/Market.js";

const router = express.Router();

/** GET /api/markets → { rows: [...] } */
router.get("/", async (_req, res) => {
  if (isMongo()) {
    const docs = await Market.find({}, { nama_pasar: 1 }).sort({ nama_pasar: 1 }).lean();
    const rows = docs.map(d => ({ id: String(d._id), nama_pasar: d.nama_pasar }));
    return res.json({ rows });
  } else {
    const [rows] = await pool.query(
      "SELECT id, nama_pasar FROM pasar ORDER BY nama_pasar ASC"
    );
    return res.json({ rows });
  }
});

export default router;
