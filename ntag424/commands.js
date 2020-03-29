import crypto from 'crypto';
import ndef from 'ndef';
import { decodeAES, encodeAES, getSessionKeys, getAPDUCmac } from './aes128';
import { leftRotate, rightRotate } from './strUtils.js';

export const buzzer = (enable) => {
  const pollBuzzStatus = enable ? 0xFF : 0x00;
  const packet = Buffer.from([
    0xFF, // CLA
    0x00, // command
    0x52, // P1
    pollBuzzStatus, // P2
    0x00, // Le
  ]);
  return packet;
}

export const getUID = () => {
  // ACR122U Get UID
  const packet = Buffer.from([
    0xFF, // CLA
    0xCA, // command
    0x00, // P1
    0x00, // P2
    0x00, // Le
  ]);
  return packet;
}

export const getCardUID = async (authEV2Obj, cmdCtr, reader) => {
  // command is CommMode.Full, but there is no data in C-APDU 
  // No encrypt step. Only MACing
  let cmdCounter = Buffer.from(cmdCtr.toString(16).padStart(4, '0'), 'hex').swap16().toString('hex');

  let packetTxid = '51' + cmdCounter + authEV2Obj.txid.toString('hex');
  let cmdCmac = getAPDUCmac(authEV2Obj.mac, Buffer.from(packetTxid, 'hex'));
  // console.log('cmd cmac truncated:', cmdCmac.toString('hex'));

  // Datasheet Get UID
  const packet = Buffer.from([
    0x90, // CLA
    0x51, // command
    0x00, // P1
    0x00, // P2
    cmdCmac.length,
    ...cmdCmac,
    0x00, // Le
  ]);
  let frame = await reader.sendCommand(cmdDataExchange(packet));
  frame = resBuf(frame);
  // console.log('getCarduid res:', frame);

  const status = frame.slice(frame.length - 2);
  let bufComp = status.compare(Buffer.from('9100', 'hex'));
  if (bufComp != 0) {
    throw new Error(`Status word ${status.toString('hex')}`);
  }

  let uid = frame.slice(0, frame.length - 10);
  // console.log('encrypted UID:', uid);

  cmdCtr += 1;
  cmdCounter = Buffer.from(cmdCtr.toString(16).padStart(4, '0'), 'hex').swap16().toString('hex');
  const IVrPlaintext = Buffer.from('5AA5' + authEV2Obj.txid.toString('hex') + cmdCounter + '0000000000000000', 'hex')
  const IVr = encodeAES(authEV2Obj.enc, Buffer.alloc(16, 0x00), IVrPlaintext);
  // console.log('IVr:', IVr);

  uid = decodeAES(authEV2Obj.enc, Buffer.from(IVr, 'hex'), uid).slice(0, 14);
  // console.log('decrypted uid:', uid);

  return uid;
}

export const selectDF = () => {
  const packet = Buffer.from([
    0x00, // CLA
    0xA4, // command
    0x04, // P1
    0x0C, // P2
    0x07, // Lc
    0xD2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01, // DF name
    0x00, // Le
  ]);
  return packet;
}

export const readData = () => {
  const packet = Buffer.from([
    0x90, // CLA
    0xAD, // read command
    0x00, // P1
    0x00, // P2
    0x07, // Lc
    0x02, // File no.; NDEF file
    0x00, 0x00, 0x00, // offset; no offset
    0x00, 0x00, 0x00, // length; read entire file
    0x00, // Le
  ]);
  return packet;
}

export const ISOreadBinary = () => {
  const packet = Buffer.from([
    0x00, // CLA
    0xB0, // read command
    0x84, // P1 0b100
    0x00, // P2
    0x00, // Le
  ]);
  return packet;
}

export const writeData = (fileNo, data) => {
  const packet = Buffer.from([
    0x90, // CLA
    0x8D, // write command
    0x00, // P1
    0x00, // P2
    (0x07 + data.length), // Lc
    fileNo, // File no.; NDEF file
    0x00, 0x00, 0x00, // offset; no offset
    data.length, 0x00, 0x00, // length; read entire file
    ...data,// ...writePayload
    0x00, // Le
  ]);
  return packet;
}

export const writeNDEFplain = (sunUrl) => {
  console.log('to be written:', sunUrl);
  let ndefMessage = [ ndef.uriRecord(sunUrl) ];
  ndefMessage = Buffer.from(ndef.encodeMessage(ndefMessage), 'hex');
  ndefMessage = Buffer.concat([
    Buffer.from(ndefMessage.length.toString(16).padStart(4, '0'), 'hex'), 
    ndefMessage,
  ]);
  return writeData(0x02, Buffer.from(ndefMessage, 'hex'));
}

export const writeNDEFfull = (sunUrl, authEV2Obj, cmdCounter) => {
  console.log('to be written:', sunUrl);
  let ndefMessage = [ ndef.uriRecord(sunUrl) ];
  ndefMessage = Buffer.from(ndef.encodeMessage(ndefMessage), 'hex');
  // ndefMessage = ndefMessage.toString('hex');
  ndefMessage = Buffer.concat([
    Buffer.from(ndefMessage.length.toString(16).padStart(4, '0'), 'hex'), 
    ndefMessage,
    // Buffer.from('80000000000000000000000000000000', 'hex'),
  ]);

  const zeroLength = 128 - ndefMessage.length;
  ndefMessage = Buffer.concat([
    ndefMessage,
    Buffer.alloc(zeroLength, 0x00),
    Buffer.from('80000000000000000000000000000000', 'hex'),
  ]);
  console.log('ndef:', ndefMessage.toString('hex'), ndefMessage.length);

  cmdCounter = cmdCounter.toString(16).padStart(4, '0');
  // console.log('cmdCtr:', cmdCounter);
  const IVcPlaintext = Buffer.from('A55A' + authEV2Obj.txid.toString('hex') + cmdCounter + '0000000000000000', 'hex')
  const IVc = encodeAES(authEV2Obj.enc, Buffer.alloc(16, 0x00), IVcPlaintext);
  // console.log('IVc:', IVc);

  const encCmdData = encodeAES(authEV2Obj.enc, Buffer.from(IVc, 'hex'), ndefMessage);
  // console.log('encrypted cmdData:', encCmdData, encCmdData.length);

  const cmdHeader = '02000000' + (ndefMessage.length - 16).toString(16) + '0000'; // 1 byte File no., 3 byte offset, 3 byte LSB length
  let packetTxid = '8d' + cmdCounter + authEV2Obj.txid.toString('hex') + cmdHeader + encCmdData;

  let cmdCmac = getAPDUCmac(authEV2Obj.mac, Buffer.from(packetTxid, 'hex'));
  console.log('cmd cmac truncated:', cmdCmac);

  const packet = Buffer.from([
    0x90, // CLA
    0x8D, // cmd
    0x00, // P1
    0x00, // P2
    ((cmdHeader.length + encCmdData.length + 16)/2), // Lc
    // 0x9F, // Lc
    0x02, // File no.
    0x00, 0x00, 0x00, // offset
    // (ndefMessage.length - 16), 0x00, 0x00, // length of data
    0x20, 0x00, 0x00,
    ...Buffer.from(encCmdData, 'hex'),
    ...cmdCmac,
    0x00, // Le
  ]);
  return packet;
}

export const changeFileSettings = (authEV2Obj, cmdCtr, fileNo, settings) => {

  // === commModeFull ===
  return commModeFull(authEV2Obj, 0x5F, cmdCtr, fileNo, settings);
  // console.log('commmodefull payload:', payload);

}

export const getFileSettings = (authEV2Obj, cmdCtr, fileNo) => {
  const cmdCounter = Buffer.from(cmdCtr.toString(16).padStart(4, '0'), 'hex').swap16().toString('hex');
  const cmdData = Buffer.from([fileNo]);

  let packetTxid = 'f5' + cmdCounter + authEV2Obj.txid.toString('hex') + cmdData.toString('hex');
  let cmdCmac = getAPDUCmac(authEV2Obj.mac, Buffer.from(packetTxid, 'hex'));
  console.log('cmd cmac truncated:', cmdCmac.toString('hex'));

  const payload = Buffer.from([
    0x90,
    0xF5,
    0x00, 0x00, // P1, P2
    0x09, // Lc
    0x02,
    ...cmdCmac,
    0x00
  ]);

  console.log('commmodefull payload:', payload.toString('hex'));
  return payload;
}

const commModeFull = (authEV2Obj, cmd, cmdCtr, cmdHeader, cmdData) => {
  const cmdCounter = Buffer.from(cmdCtr.toString(16).padStart(4, '0'), 'hex').swap16().toString('hex');
  const IVcPlaintext = Buffer.from('A55A' + authEV2Obj.txid.toString('hex') + cmdCounter + '0000000000000000', 'hex')
  const IVc = encodeAES(authEV2Obj.enc, Buffer.alloc(16, 0x00), IVcPlaintext);
  // console.log('IVc:', IVc);
  // // console.log('enc:', authEV2Obj.enc.toString('hex'));

  cmdData = Buffer.concat([ cmdData, Buffer.from([0x80]) ]);
  const paddingCount = 16 - (cmdData.length % 16);
  cmdData = Buffer.concat([ cmdData, Buffer.alloc(paddingCount, 0x00) ]);
  // console.log('paddingCount:', paddingCount);
  // console.log('settings:', cmdData.toString('hex'));

  const encCmdData = encodeAES(authEV2Obj.enc, Buffer.from(IVc, 'hex'), cmdData, false);
  // console.log('encrypted cmdData:', encCmdData, encCmdData.length);
  let packetTxid = '5f' + cmdCounter + authEV2Obj.txid.toString('hex') + cmdHeader.toString(16).padStart(2, '0') + encCmdData;
  // console.log('mac input:', packetTxid);
  let cmdCmac = getAPDUCmac(authEV2Obj.mac, Buffer.from(packetTxid, 'hex'));
  // console.log('cmd cmac truncated:', cmdCmac.toString('hex'));

  const payload = Buffer.from([
    0x90,
    cmd,
    0x00, 0x00, // P1, P2
    (1 + (encCmdData.length/2) + 8), // Lc
    // 0x4D, // Lc
    cmdHeader,
    ...Buffer.from(encCmdData, 'hex'),
    ...cmdCmac,
    0x00
  ]);

  // console.log('commmodefull payload:', payload.toString('hex'));
  return payload;

}

export const changeKey = (authEV2Obj, cmdCtr, keyNo, newKey, keyVer) => {
  const cmdCounter = Buffer.from(cmdCtr.toString(16).padStart(4, '0'), 'hex').swap16().toString('hex');
  const IVcPlaintext = Buffer.from('A55A' + authEV2Obj.txid.toString('hex') + cmdCounter + '0000000000000000', 'hex')
  const IVc = encodeAES(authEV2Obj.enc, Buffer.alloc(16, 0x00), IVcPlaintext);

  let cmdData = Buffer.from([ ...newKey, keyVer, 0x80 ]);
  const paddingCount = 16 - (cmdData.length % 16);
  cmdData = Buffer.concat([ cmdData, Buffer.alloc(paddingCount, 0x00) ]);
  // console.log('changeey plaintext:', cmdData.toString('hex'), cmdData.length);

  const encCmdData = encodeAES(authEV2Obj.enc, Buffer.from(IVc, 'hex'), cmdData, false);
  // console.log('encrypted cmdData:', encCmdData, encCmdData.length);
  const packetTxid = 'c4' + cmdCounter + authEV2Obj.txid.toString('hex') + keyNo.toString(16).padStart(2, '0') + encCmdData;
  const cmdCmac = getAPDUCmac(authEV2Obj.mac, Buffer.from(packetTxid, 'hex'));
  // console.log('cmd cmac truncated:', cmdCmac.toString('hex'));

  const payload = Buffer.from([
    0x90,
    0xC4,
    0x00, 0x00, // P1, P2
    (1 + (encCmdData.length/2) + 8), // Lc
    keyNo,
    ...Buffer.from(encCmdData, 'hex'),
    ...cmdCmac,
    0x00
  ]);

  return payload;
}

export const authEV2first = async (key, keyNum, reader) => {
  const iv = Buffer.alloc(16, 0x00); // Initialization vector

  // first part
  let packet = Buffer.from([
    0x90, // CLA
    0x71, // command
    0x00, // P1
    0x00, // P2
    0x02, // Lc
    keyNum, // key number 0
    0x00, // LenCap
    // 0x00, // PCDcap2.1
    0x00, // Le
  ]);
  let frame = await reader.sendCommand(cmdDataExchange(packet));
  frame = resBuf(frame);
  // console.log(resBuf(frame));
  let status = frame.slice(frame.length - 2);
  let bufComp = status.compare(Buffer.from('91af', 'hex'));
  if (bufComp != 0) {
    throw new Error(`Status word ${status.toString('hex')}`);
  }

  let rndB = frame.slice(0, frame.length - 2);
  // console.log('encrypted rndB:', rndB);

  rndB = Buffer.from(decodeAES(key, iv, rndB), 'hex');
  // console.log('decrypted rndB:', rndB);

  const rndA = crypto.randomBytes(16);
  // console.log('rndA:', rndA);

  let rndA_rndBprime = Buffer.concat([rndA, leftRotate(rndB)]);
  rndA_rndBprime = Buffer.from(encodeAES(key, iv, rndA_rndBprime), 'hex');
  // console.log('encrypted rndA_rndBprime:', rndA_rndBprime);

  // second part
  packet = Buffer.from([
    0x90, // CLA
    0xAF, // command
    0x00, // P1
    0x00, // P2
    0x20, // Lc
    ...rndA_rndBprime,
    0x00, // Le
  ]);
  frame = await reader.sendCommand(cmdDataExchange(packet));
  frame = resBuf(frame);
  // console.log('second part rAPDU:', frame);
  status = frame.slice(frame.length - 2);
  bufComp = status.compare(Buffer.from('9100', 'hex'));
  if (bufComp != 0) {
    throw new Error(`Status word ${status.toString('hex')}`);
  }

  let secondrAPDU = Buffer.from(decodeAES(key, iv, frame.slice(0, frame.length - 2)), 'hex');
  // console.log('decrypted rAPDU:', secondrAPDU);

  const txid = secondrAPDU.slice(0, 4);
  // console.log('transaction identifier:', txid);

  const rndA_prime = secondrAPDU.slice(4, 20);
  // console.log('rndA_prime:', rndA_prime);

  const piccRndA = rightRotate(rndA_prime);
  // console.log('piccRndA:', piccRndA);
  if (!crypto.timingSafeEqual(piccRndA, rndA)) {
    throw new Error('rndA does not match');
  }

  let authEV2res = getSessionKeys(key, rndA, rndB);
  authEV2res.txid = txid;
  // console.log(sessionKeys);

  return authEV2res;
}

const cmdDataExchange = (buffer) => {
  return [ 0x40, 0x01, ...buffer ];
}

const resBuf = (frame) => {
  let buf = Buffer.from(frame.getDataBody().toJSON().data);
  buf = buf.slice(1, buf.length - 1);
  return buf;
}

//             13C5 DB8A5930439F                   C3DEF9A4C675360F
//                B9E2FC789B64 BF237CCCAA20EC7E6E48 
// 5AA50001008013C56268A548D8FBBF237CCCAA20EC7E6E48C3DEF9A4C675360F

// 6268A548D8FB

// DB8A5930439F
// B9E2FC789B64


			// // === ISOSelectFile ===
			// // select DF
			// packet = Buffer.from([
			// 	0x00, // CLA
			// 	0xA4, // command
			// 	0x04, // P1
			// 	0x0C, // P2
			// 	0x07, // Lc
			// 	0xD2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01, // DF name
			// 	0x00, // Le
			// ]);

			// // === ISOSelectFile ===
			// // select EF
			// packet = Buffer.from([
			// 	0x00, // CLA
			// 	0xA4, // command
			// 	0x02, // P1
			// 	0x0C, // P2
			// 	0x02, // Lc
			// 	0xE1, 0x04, // Data
			// 	0x00, // Le
			// ]);
			// frame = await reader.transmit(packet, 256);
			// console.log(frame);

			// // ISO Read Binary
			// packet = Buffer.from([
			// 	0x00, // CLA
			// 	0xB0, // read command
			// 	0x80, // P1
			// 	0x00, // P2
			// 	0x00, // Le
			// ]);

			// // NTAG424 Read Data
			// packet = Buffer.from([
			// 	0x90, // CLA
			// 	0xAD, // read command
			// 	0x00, // P1
			// 	0x00, // P2
			// 	0x07, // Le
			// 	0x02,
			// 	0x00, 0x00, 0x00,
			// 	0x00, 0x00, 0x00,
			// 	0x00
			// ]);

// 02000000800000421C73A27D827658AF481FDFF20A5025B559D0E3AA21E58D347F343CFFC768BFE596C706BC00F2176781D4B0242642A0FF5A42C461AAF894D9A1284B8C76BCFA658ACD40555D362E08DB15CF421B51283F9064BCBE20E96CAE545B407C9D651A3315B27373772E5DA2367D2064AE054AF996C6F1F669170FA88CE8C4E3A4A7BBBEF0FD971FF532C3A802AF745660F2B4D1D9A8499661EBF300
// 02000000800000e72344024233833a2ff583c313231f4f62cd58173380c73f57163cb573b30644ce9332ff2ec31bb26b7823cdd57e5eef95a4839fd5881fddaffe497468b45ea13e558a5d9423465d371fb726aad417fb86036e3a6641e722079b1d89b7a5064eb353a76f318205fca9f5076573a3c5d679c0bc6250f42b14eecad5ffd80cec24d59261e47bc3176c00
// 020000008000007fc715ffa823cf60e9b0bf4e31cd54475b6b3dfa2a0a482f1112c97efeab8af7e7ae4dc5f27e2fda3a113dcf33eda1c2dbc63a71a5ab221c0123c93fa94025a12fe487f944c56cfcafbd49a44c2a3696e467de46e901d37646fcebafde66c093678c344a4032c9700446421982bc31788c6a76bfb0654da4346f4a8ab24fb400686239d3f9d8e56800
// 02000000800000d24857ab60f3c4cd0a186d0084072318261658a357ca9b4606217c8d1019ac01e3e968a1e555d5c5ce14081a8b73978e9fae257d7b3a30346af20a6032fb375264c7817b6143542027e9de66cb7de0fda209e1c9666eb77846cec523496dd490a7e85a6be6f34a3ece8cf91a50f31ece56db3ba93199331b0d89038f4d3cc46629ff2377e8df7e38fb0d3f9d66cb8997476552b1ff58242800
// 0200000080000065336b4ab7897d21401eaccfb874c710fb91616a29c6bcfa063c537205dc66d59e29c90bcfb7f63eef381c9e649b5b434dd709a000e1a854d349eefc87a80d51d76f4c2085e5942809643807f2cebc0f0aa26856b7cfc6d67bd641d12dbaaaca3a9c44be12137449a87b4375367c02c91ad4c282511428e60cde4ddf6ef9e9cd2d705456db2bfca400
// 0200000050000053a5bf6747560e66f84624c8cfd3176fc64be48e54314663bada0f5164b745541c0c265f2e47d6c50fd71be218885644c4be62b00bd369ae738d2c34fa3b7b03fb08d9ebd92a686c28ee69ddf2ebdd290de3f2fbc94aa69f00
// 02000000600000d176d2a675ab0255c7596ede52cc43874284b67d34766ecb4900e4590725dedf6b95c6b7c5c348a48b19a0f7267555b9d5ef4bd3988cf27b7bb61246b0d886e37f86b9da5eb0935fbd1f78afa7774a00fcca03cf8c7265162ac5837bc2b50844e6c8df5f575d327300
// 020000006000009d099e4447ce90715cfd57dd36cea8d670fb23cf270f2b102c4b654e746d1bb4ebfb9ed51dc90dcba5b91dc9fc2ef90e8cede26ff464f0d5ba206a088a9b402a342e88aca56cc1b08ec168a0a8bf587740194dc65d02f2a1977369682dda65779eb072f2ea39043500
// 02000000800000d0b21a7894ee028e7c5354d5351c090478a6952d659352a0abb1cedfd08ac32b6521a71d8b8a6763d9d258efaf16f7886f1fa3f799674907dfa6a4ef869a2f4b46678ae4e7429e69eeacf79ae0203013c6d22b12803abe8a32eec6814a87e493977bbf0e796274ae241d7c01657ae8d841990898e8f39d556469049ead99b95dcf88f069f2844fef2ff0ca664741ce135af75ed67213459900