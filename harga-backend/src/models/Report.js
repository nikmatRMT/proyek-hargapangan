import { Schema, model } from 'mongoose';

const ReportSchema = new Schema({
  market_id: { type: Schema.Types.ObjectId, ref: 'Market', required: true, index: true },
  komoditas_id: { type: Schema.Types.ObjectId, ref: 'Commodity', required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  tanggal_lapor: { type: Date, required: true, index: true },
  harga: { type: Number, required: true, min: 0 },
  keterangan: { type: String, default: null },
  foto_url: { type: String, default: null },
  gps_url: { type: String, default: null },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  status: { type: String, enum: ['draft','verified','rejected'], default: 'verified', index: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

ReportSchema.index({ market_id: 1, komoditas_id: 1, tanggal_lapor: 1 }, { unique: true });

export default model('Report', ReportSchema);

