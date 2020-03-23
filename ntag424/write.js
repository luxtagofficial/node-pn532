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
      console.dir(tag, {colors: true});

      let apduArray = [ 0x40, 0x01, ...cAPDU.selectDF() ];
      console.log(apduArray);
      frame = await rfid.sendCommand(apduArray);
      console.log(Buffer.from(frame.getDataBody().toJSON().data));

      // const authEV2res = await cAPDU.authEV2first(Buffer.alloc(16, 0x00), 0, rfid);
      // console.log('authEV2res:', authEV2res);

    } catch(e) {
      console.log(e);
    }
  });
});