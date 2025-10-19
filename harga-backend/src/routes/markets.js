import express from "express";
import { collections } from "../tools/db.js";

const router = express.Router();

/** GET /api/markets → { rows: [...] } */
router.get("/", async (_req, res) => {
  const { pasar } = collections();
  const rows = await pasar.find({}, { projection: { _id: 0, id: 1, nama_pasar: 1 } }).sort({ nama_pasar: 1 }).toArray();
  res.json({ rows });
});

export default router;
