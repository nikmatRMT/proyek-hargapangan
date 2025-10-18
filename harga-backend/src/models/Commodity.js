import { Schema, model } from 'mongoose';

const CommoditySchema = new Schema({
  nama_komoditas: { type: String, required: true, unique: true, index: true },
  unit: { type: String, default: '(Rp/Kg)' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default model('Commodity', CommoditySchema);

