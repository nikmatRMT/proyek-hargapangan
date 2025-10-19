import express from "express";
import { collections } from "../tools/db.js";

const router = express.Router();

/** GET /api/commodities → { rows: [...] } */
router.get("/", async (_req, res) => {
  const { komoditas } = collections();
  const rows = await komoditas.find({}, { projection: { _id: 0, id: 1, nama_komoditas: 1 } }).sort({ nama_komoditas: 1 }).toArray();
  res.json({ rows });
});

export default router;
