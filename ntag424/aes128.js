const crypto = require('crypto');
const { aesCmac } = require('node-aes-cmac');
const { string2Bin } = require('./strUtils.js');

const algorithm = 'aes-128-cbc';
// const key = Buffer.alloc(16, 0x00);
// AN12196 section 4.4.4.2.1 session key
const key = Buffer.from([0x3F,0xB5,0xF6,0xE3,0xA8,0x07,0xA0,0x3D,0x5E,0x35,0x70,0xAC,0xE3,0x93,0x77,0x6F]);
// The IV is usually passed along with the ciphertext.
const iv = Buffer.alloc(16, 0x00); // Initialization vector.

console.log('key:', key.toString('hex'));

function decodeAES(key, iv, encrypted) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAutoPadding(false);
  // Encrypted using same algorithm, key and iv.
  let decrypted = decipher.update(encrypted, 'hex', 'hex');
  decrypted += decipher.final('hex');
  return decrypted;
}

function encodeAES(key, iv, plaintext) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// const encrypted = 'A04C124213C186F22399D33AC2A30215';
// console.log('encrypted:', encrypted);
// console.log('decrypted:', decodeAES(key, iv, encrypted));

// const plaintext = 'verify.luxtag.io?uid=0452376A595780x000062x';
const plaintext = '';
console.log('plaintext:', plaintext);
console.log('encrypted:', encodeAES(key, iv, plaintext));
console.log('cmac:', aesCmac(key, plaintext));
