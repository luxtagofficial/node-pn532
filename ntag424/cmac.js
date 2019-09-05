const crypto = require('crypto');

const algorithm = 'aes-128-cbc';
const key = Buffer.alloc(16, 0x00);
// The IV is usually passed along with the ciphertext.
const iv = Buffer.alloc(16, 0x00); // Initialization vector.
console.log('key:', key);
const encrypted = 'ef963ff7828658a599f3041510671e88';
console.log(encrypted);

const decipher = crypto.createDecipheriv(algorithm, key, iv);
decipher.setAutoPadding(false);

// Encrypted using same algorithm, key and iv.
let decrypted = decipher.update(encrypted, 'hex', 'hex');
decrypted += decipher.final('hex');
console.log(decrypted);