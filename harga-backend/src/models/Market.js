import { Schema, model } from 'mongoose';

const MarketSchema = new Schema({
  nama_pasar: { type: String, required: true, unique: true, index: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default model('Market', MarketSchema);

