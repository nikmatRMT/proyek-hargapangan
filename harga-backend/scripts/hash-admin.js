// scripts/hash-admin.js
import bcrypt from 'bcryptjs';

const plain = 'admin123';
const saltRounds = 10;

const hash = await bcrypt.hash(plain, saltRounds);
console.log('BCRYPT HASH =', hash);
