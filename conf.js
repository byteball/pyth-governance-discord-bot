/* jslint node: true */
"use strict";


exports.bServeAsHub = false;
exports.bLight = true;
exports.bSingleAddress = true;
exports.bStaticChangeAddress = false;

exports.logToSTDOUT = true;
exports.bNoPassphrase = true;

exports.storage = 'sqlite';

exports.hub = process.env.testnet ? 'obyte.org/bb-test' : 'obyte.org/bb';
exports.deviceName = 'discordbot';
exports.permanent_pairing_secret = '0000'; // use '*' to allow any or generate random string
exports.control_addresses = ['DEVICE ALLOWED TO CHAT'];
exports.payout_address = 'WHERE THE MONEY CAN BE SENT TO';
exports.KEYS_FILENAME = 'keys.json';


exports.discord_token = process.env.discord_token;
exports.discord_channels = [process.env.channel];

exports.explorer_url = process.env.testnet ? 'https://testnetexplorer.obyte.org' : 'https://explorer.obyte.org';
exports.base_aas = ['LUXMFMYM2J6XBV3OG7G5R5XJFM3JPDBI'];
exports.registry_aa = 'O6H6ZIFI57X3PLTYHOCVYPP5A553CYFQ';

console.log('finished headless conf');