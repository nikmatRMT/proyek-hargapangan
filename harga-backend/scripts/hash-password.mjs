// Quick script to hash a password
import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'admin123';
const hash = await bcrypt.hash(password, 10);

console.log('\n=== Password Hash ===');
console.log('Password:', password);
console.log('Hash:', hash);
console.log('\nUse this hash in MongoDB:');
console.log(JSON.stringify({ password: hash }, null, 2));
