function bin2String(array) {
  var result = "";
  for (var i = 0; i < array.length; i++) {
    // result += String.fromCharCode(parseInt(array[i], 2));
    if (array[i] > 32 && array[i] < 127) {
      result += String.fromCharCode(array[i]);
    } else if (!array[i]){
      result += " "; // if 0x00, insert space
    } else {
      result += "·"; // to avoid weird emojis in my terminal
    }
  }
  return result;
}

function string2Bin(str) {
  var result = [];
  for (var i = 0; i < str.length; i++) {
    // result.push(str.charCodeAt(i).toString(10));
    result.push(str.charCodeAt(i));
  }
  return result;
}

function toHexString(byteArray, separator) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join(separator)
}

function hs2ByteArray(hexString) {
  let byteArray = [];
  if (hexString.length % 2) return false;
  for (let i = 0; i < hexString.length; i += 2) {
    let byteChunk = hexString.charAt(i) + hexString.charAt(i+1);
    byteArray.push(parseInt(byteChunk, 16));
  }
  return byteArray;
}

function leftRotate(buf) {
  const byteArray = [...buf, buf[0]];
  return Buffer.from(byteArray.slice(1), 'hex');
}

function rightRotate(buf) {
  const start = buf.length - 1;
  let byteArray = [buf[start], ...buf];
  byteArray.pop();
  return Buffer.from(byteArray,'hex');
}

function xor(a, b) {
  if (!Buffer.isBuffer(a)) a = Buffer.from(a, 'hex')
  if (!Buffer.isBuffer(b)) b = Buffer.from(b, 'hex')
  var res = []
  if (a.length > b.length) {
    for (var i = 0; i < b.length; i++) {
      res.push(a[i] ^ b[i])
    }
  } else {
    for (var i = 0; i < a.length; i++) {
      res.push(a[i] ^ b[i])
    }
  }
    return Buffer.from(res);
}

module.exports = {
  bin2String,
  string2Bin,
  toHexString,
  hs2ByteArray,
  leftRotate,
  rightRotate,
  xor
}
