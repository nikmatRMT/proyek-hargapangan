import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
  nip: { type: String, sparse: true, unique: true, default: null },
  nama_lengkap: { type: String, required: true },
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'petugas'], default: 'petugas', index: true },
  is_active: { type: Boolean, default: true, index: true },
  phone: { type: String, default: null },
  alamat: { type: String, default: null },
  foto: { type: String, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default model('User', UserSchema);

