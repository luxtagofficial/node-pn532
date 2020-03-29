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
      let status = null;
      let cmdCtr = 0;
      console.dir(tag, {colors: true});

      frame = await rfid.sendCommand(cmdDataExchange(cAPDU.selectDF()));
      // console.log(resBuf(frame));

      const appKey0 = Buffer.alloc(16, 0x00);
      const authEV2res = await cAPDU.authEV2first(appKey0, 0, rfid);
      // console.log('authEV2res:', authEV2res);

      // const uid = await cAPDU.getCardUID(authEV2res, cmdCtr, rfid);
      // console.log('uid:', uid);

      // === Erase ===
      frame = await rfid.sendCommand(cmdDataExchange(cAPDU.writeData(2, Buffer.alloc(128, 0x00))));
      frame = resBuf(frame);
      errorFrameHandler(frame);
      console.log(frame);
      cmdCtr += 1;

      // const fileSettings = Buffer.from([
      //   0x40, // SDM and mirroring enabled 0x40
      //   0xE0, 0x00, // access conditions E0 00
      //   0xC1, // SDM options: uid, ctr C1
      //   0xFE, 0xE0, // SDM access rights FE E0
      //   36, 0x00, 0x00, // uid offset
      //   55, 0x00, 0x00, // ctr offset
      //   64, 0x00, 0x00, // mac input offset
      //   64, 0x00, 0x00, // mac offset
      // ]);
      const fileSettings = Buffer.from([
        0x00, // SDM and mirroring enabled 0x40
        0xE0, 0x00, // access conditions E0 00
      ]);
      console.log('settings:', fileSettings.toString('hex'));
      frame = await rfid.sendCommand(cmdDataExchange(cAPDU.changeFileSettings(authEV2res, cmdCtr, 2, fileSettings)));
      frame = resBuf(frame);
      errorFrameHandler(frame);
      console.log(frame);

      console.log('\x1b[32m%s\x1b[0m', 'WRITE SUCCESS');

    } catch(e) {
      console.log(e);
      console.log('\x1b[31m%s\x1b[0m', 'WRITE FAIL');
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

const errorFrameHandler = (frame) => {
  // console.log('second part rAPDU:', frame);
  status = frame.slice(frame.length - 2);
  bufComp = status.compare(Buffer.from('9100', 'hex'));
  if (bufComp != 0) {
    throw new Error(`Status word ${status.toString('hex')}`);
  }

}