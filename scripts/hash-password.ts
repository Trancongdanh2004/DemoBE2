import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'admin123';
const saltRounds = 10;

const hash = bcrypt.hashSync(password, saltRounds);

console.log('----------------------------------------------------');
console.log(`Password: ${password}`);
console.log(`Bcrypt Hash: ${hash}`);
console.log('Copy this hash into ADMIN_PASSWORD_HASH in your .env');
console.log('----------------------------------------------------');
