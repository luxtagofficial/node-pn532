const pn532 = require('../src/pn532');
const SerialPort = require('serialport');
const ndef = require('ndef');
const querystring = require('querystring');
const { bin2String, toHexString } = require('./strUtils.js');
const { getCmac } = require('./aes128.js');
const open = require('open');

const serialPort = new SerialPort('/dev/ttyUSB0', { baudRate: 115200 });
const rfid = new pn532.PN532(serialPort, { pollInterval: 1000 });

let pcdCtr = -1;

rfid.on('ready', function() {
    // rfid.getFirmwareVersion().then(function(res) {
    //     console.log(res);
    // });
    console.log('Scanning for tags...');
    rfid.on('tag', function(tag) {
        console.dir(tag, {colors: true});
        getNdefFile((res) => {
            for (let i = 0; i < res.length; i += 1) {
                console.log(res[i].type, res[i].value);
            }
            // open(res[0].value);
            let urlSubstr = res[0].value.split('?');
            // console.log(urlSubstr);
            // open(`http://${process.argv[2]}/?${urlSubstr[1]}`);
            let ndefUrlObj = querystring.parse(urlSubstr[1]);
            console.dir(ndefUrlObj, {colors: true});
            let piccCtr = parseInt(ndefUrlObj.ctr, 16);
            console.log('PCD counter:', pcdCtr, 'PICC counter:', piccCtr);
            if (pcdCtr >= piccCtr) {
                console.log('\x1b[31m%s\x1b[0m', 'CLONED TAG');
            } else {
                if (ndefUrlObj.uid && ndefUrlObj.ctr && ndefUrlObj.c) {
                    const key = Buffer.alloc(16, 0x00);
                    let pcdCmac = getCmac(key, ndefUrlObj.uid, ndefUrlObj.ctr);
                    console.log('Computed CMAC:', pcdCmac);
                    if (pcdCmac.toString('hex') === ndefUrlObj.c.toLowerCase()) {
                        pcdCtr = piccCtr;
                        console.log('\x1b[32m%s\x1b[0m', 'SIMPLE SDM VERIFICATION PASS');
                    } else {
                        console.log('\x1b[31m%s\x1b[0m', 'SIMPLE SDM VERIFICATION FAIL');
                    }
                }
            }
            console.log('\nScanning for tags...');
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
    // === DEBUG ===
    // for (let i = 0; i < (Math.ceil(efBuf.length/8)); i += 1) {
    //     let octet = [];
    //     for (let j = 0; j < 8; j += 1) {
    //         octet.push(efBuf[(j + (i*8))]);
    //     }
    //     console.log(`${toHexString(octet, ' ')}  ${bin2String(octet)}`);
    // }

    // console.log(efBuf.toString('utf-8'));
    let ndefStart = efBuf.indexOf(Buffer.from([0xD1])); // NDEF record header
    let ndefLength = efBuf[ndefStart - 1];
    // console.log(
    //     'ndefStart:', ndefStart,
    //     'Length of ndef msg:', ndefLength
    // );
    let decodedNdef = ndef.decodeMessage(efBuf.slice(ndefStart + 0, ndefLength + ndefStart));
    // let decodedNdef = ndef.decodeMessage(efBuf);
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