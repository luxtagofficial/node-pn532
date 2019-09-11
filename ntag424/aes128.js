const crypto = require('crypto');
const { aesCmac } = require('node-aes-cmac');
const { hs2ByteArray } = require('./strUtils.js');

const algorithm = 'aes-128-cbc';
// const key = Buffer.alloc(16, 0x00);
// // AN12196 section 4.4.4.2.1 session key
// // const key = Buffer.from(hs2ByteArray('3fb5f6e3a807a03d5e3570ace393776f'));
// // The IV is usually passed along with the ciphertext.
// const iv = Buffer.alloc(16, 0x00); // Initialization vector.

// console.log('file read key:', key.toString('hex'));

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

function cmacTruncate(mac) {
  let truncated = '';
  for (let i = 0; i < mac.length; i += 2) {
    if ((i % 4) == 2) {
      truncated += mac.charAt(i);
      truncated += mac.charAt(i+1);
    }
  }
  return truncated;
}

function getCmac(key, uid, sdmReadCtr) {
  let ctr = hs2ByteArray(sdmReadCtr);
  let ctrBuf = Buffer.from(ctr.reverse()); // MSB to LSB
  let sv2 = hs2ByteArray('3CC300010080' + uid + ctrBuf.toString('hex'));
  let sessionKey = aesCmac(key, Buffer.from(sv2), {returnAsBuffer: true});
  // console.log('session key:', sessionKey.toString('hex'));
  const plaintext = '';
  // console.log('plaintext:', plaintext);
  let cmac = aesCmac(sessionKey, plaintext);
  cmac = cmacTruncate(cmac);
  // console.log('cmac:', cmac);
  return cmac;
}

// AN12196 Table 5 step 3
// const encrypted = 'EF963FF7828658A599F3041510671E88';
// console.log('encrypted:', encrypted);
// console.log('decrypted:', decodeAES(key, iv, encrypted));

// const plaintext = 'verify.luxtag.io?uid=0452376A595780x000062x';
// console.log('plaintext:', plaintext);
// console.log('encrypted:', encodeAES(key, iv, plaintext));

// let uid = '042F8B12AA6180';
// let sdmReadCtr = '000009';
// let ctr = hs2ByteArray(sdmReadCtr);
// let ctrBuf = Buffer.from(ctr.reverse()); // MSB to LSB
// let sv2 = hs2ByteArray('3CC300010080' + uid + ctrBuf.toString('hex'));
// let sessionKey = aesCmac(key, Buffer.from(sv2), {returnAsBuffer: true});
// console.log('session key:', sessionKey.toString('hex'));
// const plaintext = '';
// console.log('plaintext:', plaintext);
// let cmac = aesCmac(sessionKey, plaintext);
// cmac = cmacTruncate(cmac);
// console.log('cmac:', cmac);

// console.log(cmacCheck(key, '042F8B12AA6180', '000009'));

module.exports = {
  encodeAES,
  decodeAES,
  getCmac
}
