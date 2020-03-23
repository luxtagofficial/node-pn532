const pn532 = require('../src/pn532');
const SerialPort = require('serialport');
const cAPDU = require('./commands.js');

const serialPort = new SerialPort('/dev/ttyUSB0', { baudRate: 115200 });
const rfid = new pn532.PN532(serialPort, { pollInterval: 1000 });

rfid.on('ready', function() {
  // rfid.getFirmwareVersion().then(function(res) {
  //     console.log(res);
  // });
  console.log('Scanning for tags...');
  rfid.on('tag', async (tag) => {
    try {
      let frame = null;
      let cmdCtr = 0;
      console.dir(tag, {colors: true});

      frame = await rfid.sendCommand(cmdDataExchange(cAPDU.selectDF()));
      // console.log(resBuf(frame));

      const authEV2res = await cAPDU.authEV2first(Buffer.alloc(16, 0x00), 0, rfid);
      console.log('authEV2res:', authEV2res);

      const uid = await cAPDU.getCardUID(authEV2res, cmdCtr, rfid);
      console.log('uid:', uid);

    } catch(e) {
      console.log(e);
    }
  });
});

const cmdDataExchange = (buffer) => {
  return [ 0x40, 0x01, ...buffer ];
}

const resBuf = (frame) => {
  let buf = Buffer.from(frame.getDataBody().toJSON().data);
  buf = buf.slice(1, buf.length - 1);
  return buf;
}