const crypto = require('crypto');
const { aesCmac } = require('node-aes-cmac');
const { hs2ByteArray, xor } = require('./strUtils.js');

const algorithm = 'aes-128-cbc';

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

// 00000000000000000000000000000000
// const key00 = Buffer.from('2A764A3455627A355057372D41326A28', 'hex');
// const key00 = Buffer.from('00000000000000000000000000000000', 'hex');
// const iv = Buffer.alloc(16, 0x00); // Initialization vector.
// const encrypted = Buffer.from('A04C124213C186F22399D33AC2A30215', 'hex');

// // console.log(getCmac(key00, '04A13A921E6580', '00001E').toUpperCase());

// const decrypted = Buffer.from(decodeAES(key00, iv, encrypted), 'hex');
// console.log(decrypted);

// const rndA_rndBprime = Buffer.concat([Buffer.from('13C5DB8A5930439FC3DEF9A4C675360F', 'hex'), leftRotate(decrypted)]);
// console.log('rndA_rndBprime:', rndA_rndBprime);

// let authPt2 = encodeAES(key00, iv, rndA_rndBprime);
// console.log('authPt2:', authPt2);

// console.log(xor('DB8A5930439F', 'B9E2FC789B64'));
// const sv1 = Buffer.from('A55A0001008013C56268A548D8FBBF237CCCAA20EC7E6E48C3DEF9A4C675360F', 'hex');
// const keySessionEnc = aesCmac(key00, sv1, {returnAsBuffer: true});
// console.log('enc session key:', keySessionEnc);
// const rndA = Buffer.from('13C5DB8A5930439FC3DEF9A4C675360F', 'hex');
// const rndB = Buffer.from('B9E2FC789B64BF237CCCAA20EC7E6E48', 'hex');

// console.log(getSessionKeys(key00, rndA, rndB));

// const keySessionEnc = Buffer.from('1309C877509E5A215007FF0ED19CA564', 'hex');
// const keySessionMac = Buffer.from('4C6626F5E72EA694202139295C7A7FC7', 'hex');
// const IVc = encodeAES(keySessionEnc, iv, Buffer.from('A55A9D00C4DF' + '0000' + '0000000000000000', 'hex'));
// console.log('IVc:', IVc);
// const cmdData = Buffer.from('0051d1014d550463686f6f73652e75726c2e636f6d2f6e7461673432343f653d303030303030303030303030303030303030303030303030303030303030303026633d3030303030303030303030303030303000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000', 'hex');
// const encCmdData = encodeAES(keySessionEnc, Buffer.from(IVc, 'hex'), cmdData);
// // const encCmdData = Buffer.from('421C73A27D827658AF481FDFF20A5025B559D0E3AA21E58D347F343CFFC768BFE596C706BC00F2176781D4B0242642A0FF5A42C461AAF894D9A1284B8C76BCFA658ACD40555D362E08DB15CF421B51283F9064BCBE20E96CAE545B407C9D651A3315B27373772E5DA2367D2064AE054AF996C6F1F669170FA88CE8C4E3A4A7BBBEF0FD971FF532C3A802AF745660F2B4', 'hex');
// console.log('encrypted cmdData:', encCmdData);
// // console.log(decodeAES(keySessionEnc, Buffer.from(IVc, 'hex'), encCmdData));
// const cmdData2 = Buffer.from('8D00009D00C4DF02000000800000421C73A27D827658AF481FDFF20A5025B559D0E3AA21E58D347F343CFFC768BFE596C706BC00F2176781D4B0242642A0FF5A42C461AAF894D9A1284B8C76BCFA658ACD40555D362E08DB15CF421B51283F9064BCBE20E96CAE545B407C9D651A3315B27373772E5DA2367D2064AE054AF996C6F1F669170FA88CE8C4E3A4A7BBBEF0FD971FF532C3A802AF745660F2B4', 'hex');
// const cmdCmac = aesCmac(keySessionMac, cmdData2);
// console.log('cmd cmac:', cmdCmac);
// console.log('cmd cmac truncated:', cmacTruncate(cmdCmac));

function decodeAES(key, iv, encrypted, padding = false) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAutoPadding(padding);
  // Encrypted using same algorithm, key and iv.
  let decrypted = decipher.update(encrypted, 'hex', 'hex');
  decrypted += decipher.final('hex');
  return decrypted;
}

function encodeAES(key, iv, plaintext, padding = false) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  cipher.setAutoPadding(padding);
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

/**
 * Server-side CMAC computation
 * @param {Buffer} key key from DB
 * @param {String} uid uid from PICC
 * @param {String} sdmReadCtr 3 byte counter from PICC
 * @return {Buffer} CMAC
 */
function getCmac(key, uid, sdmReadCtr, tt) {
  let ctr = hs2ByteArray(sdmReadCtr);
  let ctrBuf = Buffer.from(ctr.reverse()); // MSB to LSB
  let sv2 = hs2ByteArray('3CC300010080' + uid + ctrBuf.toString('hex'));
  let sessionKey = aesCmac(key, Buffer.from(sv2), {returnAsBuffer: true});
  // console.log('session key:', sessionKey.toString('hex'));
  // TagTamper value + url offset as input into CMAC
  const plaintext = (tt) ? `${tt}&c=` : '';
  // console.log('plaintext:', plaintext);
  let cmac = aesCmac(sessionKey, plaintext);
  cmac = cmacTruncate(cmac);
  // console.log('cmac:', cmac);
  return Buffer.from(cmac, 'hex');
}

/**
 * APDU CMAC computation
 * @param {Buffer} key Session MAC key
 * @param {Buffer} apdu APDU command
 * @return {Buffer} CMAC
 */
function getAPDUCmac(key, apdu) {
  let cmac = aesCmac(key, apdu);
  cmac = cmacTruncate(cmac);
  // console.log('cmac:', cmac);
  return Buffer.from(cmac, 'hex');
}

/**
 * Authenticated session keys for ENC and MAC
 * @param {Buffer} key PICC appKey
 * @param {Buffer} rndA PCD generated random number
 * @param {Buffer} rndB PICC generated random number
 * @return {Object} session keys
 */
function getSessionKeys(key, rndA, rndB) {
  // console.log(rndA.slice(2, 8));
  // console.log(rndB.slice(0, 6));
  const xored = xor(rndA.slice(2, 8), rndB.slice(0, 6));
  // console.log('xor:', xored);
  const sv1 = Buffer.concat([
    Buffer.from('A55A00010080', 'hex'),
    rndA.slice(0,2),
    xored,
    rndB.slice(6, 16),
    rndA.slice(8, 16)
  ]);
  // console.log('sv1:', sv1);

  const sv2 = Buffer.concat([
    Buffer.from('5AA500010080', 'hex'),
    rndA.slice(0,2),
    xored,
    rndB.slice(6, 16),
    rndA.slice(8, 16)
  ]);
  // console.log('sv2:', sv2);

  const sessionKeys = {
    enc: aesCmac(key, sv1, {returnAsBuffer: true}),
    mac: aesCmac(key, sv2, {returnAsBuffer: true})
  }
  return sessionKeys;
}

module.exports = {
  encodeAES,
  decodeAES,
  getCmac,
  getAPDUCmac,
  getSessionKeys
}