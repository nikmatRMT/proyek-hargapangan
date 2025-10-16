import express from "express";
import { pool } from "../tools/db.js";

const router = express.Router();

/** GET /api/commodities → { rows: [...] } */
router.get("/", async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, nama_komoditas FROM komoditas ORDER BY nama_komoditas ASC"
  );
  res.json({ rows });
});

export default router;
