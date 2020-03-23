const pn532 = require('../src/pn532');
const SerialPort = require('serialport');
const ndef = require('ndef');

const serialPort = new SerialPort('/dev/ttyUSB0', { baudRate: 115200 });
const rfid = new pn532.PN532(serialPort, { pollInterval: 500 });

console.log('Waiting for rfid ready event...');
rfid.on('ready', function() {
  console.log('Scanning for tags...');
  rfid.on('tag', function(tag) {
    console.dir(tag, {colors: true});
    rfid.readNdefData().then(function(data) {
      // console.log('Tag data:', data);
      var records = ndef.decodeMessage(Array.from(data));
      // console.log(records);
      for (let i = 0; i < records.length; i += 1) {
        console.log(records[i].type, records[i].value);
      }
    });
    console.log('\nScanning for tags...');
  });
});
