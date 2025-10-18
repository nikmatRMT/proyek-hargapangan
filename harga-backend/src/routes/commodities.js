import express from "express";
import Commodity from "../models/Commodity.js";

const router = express.Router();

/** GET /api/commodities → { rows: [...] } */
router.get("/", async (_req, res) => {
  const docs = await Commodity.find({}, { nama_komoditas: 1, unit: 1 }).sort({ nama_komoditas: 1 }).lean();
  const rows = docs.map(d => ({ id: String(d._id), nama_komoditas: d.nama_komoditas, unit: d.unit }));
  return res.json({ rows });
});

export default router;
