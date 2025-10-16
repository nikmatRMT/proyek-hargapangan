import express from "express";
import { pool } from "../tools/db.js";

const router = express.Router();

/** GET /api/markets → { rows: [...] } */
router.get("/", async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, nama_pasar FROM pasar ORDER BY nama_pasar ASC"
  );
  res.json({ rows });
});

export default router;
