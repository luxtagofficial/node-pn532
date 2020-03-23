"use strict";

import { NFC } from '../src/index';
import ndef from 'ndef';
import * as cAPDU from './commands';
// import pretty from '../examples/pretty-logger';

const nfc = new NFC(); // optionally you can pass logger

nfc.on('reader', reader => {

	// disable auto processing
	reader.autoProcessing = false;
	let isBuzzerSet = false;

	console.log(`${reader.reader.name}  device attached`);
	
	// reader.aid = 'F222222222';
	// reader.aid = Buffer.from('D2760000850100', 'hex');

	reader.on('card', async (card) => {
		// card is object containing following data
		// String standard: TAG_ISO_14443_3 (standard nfc tags like MIFARE) or TAG_ISO_14443_4 (Android HCE and others)
		// String type: same as standard
		// Buffer atr

		console.log(`card inserted`, card);

		// you can use reader.transmit to send commands and retrieve data
		// see https://github.com/pokusew/nfc-pcsc/blob/master/src/Reader.js#L288

		try {
			let frame = null;
			let cmdCtr = 0;

			if (!isBuzzerSet) {
				let frame = await reader.transmit(cAPDU.buzzer(true), 256);
				// console.log(frame);
				isBuzzerSet = true;
			}

			frame = await reader.transmit(cAPDU.getUID(), 256);
			console.log('UID:', frame.toString('hex').substr(0,14));

			frame = await reader.transmit(cAPDU.selectDF(), 256);
			// console.log(frame);

			const sunUrl = 'https://sun.luxtagenterprise.io/?uid=00000000000000&ctr=000000&c=0000000000000000';
			// const sunUrl = 'https://luxtag.io';
			const writePacket = cAPDU.writeNDEFplain(sunUrl);
			// const writePacket = Buffer.from('908D00005702000000500000004ed1014a550473756e2e6c7578746167656e74657270726973652e696f2f3f7569643d3030303030303030303030303030266374723d30303030303026633d3030303030303030303030303030303000', 'hex');
			console.log('write packet:', writePacket.toString('hex'));
			frame = await reader.transmit(writePacket, 256);
			console.log('write frame:', frame);

			const pcdKey = Buffer.from('00000000000000000000000000000000', 'hex');
      const piccKeyNumber = 0;
      const authEV2res = await cAPDU.authEV2first(pcdKey, piccKeyNumber, reader);
			console.log('authEV2 first:', authEV2res);

			// const decodedUid = cAPDU.getCardUID(authEV2res, cmdCtr, reader);
			// console.log('decoded uid:', decodedUid);

			// frame = await reader.transmit(cAPDU.getFileSettings(authEV2res, cmdCtr, 2), 256);
			// console.log('get settings frame:', frame);
			// cmdCtr += 1;

			const mirrorSettings = {
				fileNo: 2, 
				uidOffset: 36, 
				ctrOffset: 55,
				macInputOffset: 64,
				macOffset: 64
			}
			const changePacket = cAPDU.changeFileSettings(authEV2res, cmdCtr, mirrorSettings);
			console.log('change settings:', changePacket.toString('hex'));
			frame = await reader.transmit(changePacket, 256);
			console.log('change settings frame:', frame);
			// cAPDU.changeFileSettings(authEV2res, cmdCtr, mirrorSettings)
								
		} catch(e) {
			console.log(e);
		}

	});

	reader.on('card.off', card => {
		console.log(`card removed`);
	});

	reader.on('error', err => {
		console.log(`${reader.reader.name}  an error occurred`, err);
	});

	reader.on('end', () => {
		console.log(`${reader.reader.name}  device removed`);
	});

});

nfc.on('error', err => {
	console.log('an error occurred', err);
});



// const hexNdef = Buffer.from('D1014D550463686F6F73652E75726C2E636F6D2F6E7461673432343F653D303030303030303030303030303030303030303030303030303030303030303026633D30303030303030303030303030303030', 'hex');
// console.log(hexNdef.toString('hex'));
// console.log(hexNdef.length.toString(16));
// // 0051 > 530000