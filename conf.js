/* jslint node: true */
"use strict";


exports.bServeAsHub = false;
exports.bLight = true;
exports.bSingleAddress = true;
exports.bStaticChangeAddress = false;

//exports.logToSTDOUT = true;
exports.bNoPassphrase = true;

exports.storage = 'sqlite';

exports.hub = process.env.testnet ? 'obyte.org/bb-test' : 'obyte.org/bb';
exports.deviceName = 'Pyth Discord Bot';
exports.permanent_pairing_secret = '0000'; // use '*' to allow any or generate random string
exports.control_addresses = ['DEVICE ALLOWED TO CHAT'];
exports.payout_address = 'WHERE THE MONEY CAN BE SENT TO';
exports.KEYS_FILENAME = 'keys.json';


exports.discord_token = process.env.discord_token;
exports.discord_channels = [process.env.channel];

exports.explorer_url = process.env.testnet ? 'https://testnetexplorer.obyte.org' : 'https://explorer.obyte.org';
exports.perpetual_url = process.env.testnet ? 'https://testnet.pyth.ooo/governance/management' : 'https://pyth.ooo/governance/management';
exports.base_aas = ['A336I77COVXUCN3L2YOYVIZF7PKMFCAV'];
exports.registry_aa = 'O6H6ZIFI57X3PLTYHOCVYPP5A553CYFQ';

console.log('finished pyth discord bot conf');
