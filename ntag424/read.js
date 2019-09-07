const pn532 = require('../src/pn532');
const SerialPort = require('serialport');
const { bin2String, toHexString } = require('./strUtils.js');
const ndef = require('ndef');

const serialPort = new SerialPort('/dev/ttyUSB0', { baudRate: 115200 });
const rfid = new pn532.PN532(serialPort, { pollInterval: 1000 });

rfid.on('ready', function() {
    // rfid.getFirmwareVersion().then(function(res) {
    //     console.log(res);
    // });
    console.log('Scanning for tags...');
    rfid.on('tag', function(tag) {
        console.dir(tag, {colors: true});
        // getNdefFile((frame) => {
        //     frameObject = frame.toJSON();
        //     efBuf = Buffer.from(frameObject.data.body);
        //     console.log(frameObject, efBuf.length);
        //     // for (const value of efBuf.values()) {
        //     //     console.log(value.toString(16));
        //     // }
        //     efBody = efBuf.toString('utf-8');
        //     console.log(efBody);
        // });
        getNdefFile((res) => {
            for (let i = 0; i < res.length; i += 1) {
                console.log(res[i].type, res[i].value);
            }
        });
    });
});

async function getNdefFile(cb) {
    // === ISOSelectFile ===
    // select DF
    let commandBuffer = [
        0x40, // c.COMMAND_IN_DATA_EXCHANGE
        0x01, // tag number
        0x00, // CLA
        0xA4, // command
        0x04, // P1
        0x0C, // P2
        0x07, // Lc
        0xD2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01, // DF name
        0x00, // Le
    ];
    let frame = await rfid.sendCommand(commandBuffer);
    // console.log(frame.toJSON());

    // === ISOSelectFile ===
    // select EF
    commandBuffer = [
        0x40, // c.COMMAND_IN_DATA_EXCHANGE
        0x01, // tag number
        0x00, // CLA
        0xA4, // command
        0x02, // P1
        0x0C, // P2
        0x02, // Lc
        0xE1, 0x04, // Data
        0x00, // Le
    ];
    frame = await rfid.sendCommand(commandBuffer);
    // // console.log(frame.toJSON());

    // === ISOReadBinary ===
    commandBuffer = [
        0x40, // c.COMMAND_IN_DATA_EXCHANGE
        0x01, // tag number
        0x00, // CLA
        0xB0, // read command
        0x80, // P1
        0x00, // P2
        0x00, // Le
    ];
    frame = await rfid.sendCommand(commandBuffer);

    let dataBody = frame.getDataBody().toJSON();
    let efBuf = Buffer.from(dataBody.data);
    for (let i = 0; i < (Math.ceil(efBuf.length/8)); i += 1) {
        let octet = [];
        for (let j = 0; j < 8; j += 1) {
            octet.push(efBuf[(j + (i*8))]);
        }
        console.log(`${toHexString(octet, ' ')}  ${bin2String(octet)}`);
    }

    // console.log(efBuf.toString('utf-8'));
    let ndefStart = efBuf.indexOf(Buffer.from([0xD1])); // NDEF record header
    let ndefLength = efBuf[ndefStart - 1];
    console.log(
        'ndefStart:', ndefStart,
        'Length of ndef msg:', ndefLength
    );
    let decodedNdef = ndef.decodeMessage(efBuf.slice(ndefStart + 5, ndefLength + ndefStart));
    return cb(decodedNdef);
    // console.log('Encode:');
    // let encodeMsg = [ndef.uriRecord('https://verify.luxtag.io?uid=0452376A595780x000036x5BC25F23CDA2A17BQ')];
    // let encodeBuf = Buffer.from(ndef.encodeMessage(encodeMsg));
    // console.log(toHexString(encodeBuf, ' '));
    // console.log(encodeBuf.toString('utf-8'));
    // console.log(ndef.decodeMessage(encodeBuf));
    // === PN532 InRelease ===
    // commandBuffer = [
    //     0x52, // c.COMMAND_IN_DATA_EXCHANGE
    //     0x01, // tag number
    // ];
    // let releaseFrame = await rfid.sendCommand(commandBuffer);
    // console.log(releaseFrame);

    // cb(frame);
}

