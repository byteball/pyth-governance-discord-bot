const conf = require("../conf");
const { getSVValue } = require('./obyte');

const cache = {};

async function getAssetWithMeta(asset) {
	if (asset === 'base') {
		return {
			asset,
			symbol: 'GBYTE',
			decimals: 9,
		};
	}
	
	if (cache[asset]) return cache[asset];
	
	const symbol = await getSVValue(conf.registry_aa, 'a2s_' + asset);
	const desc = await getSVValue(conf.registry_aa, 'current_desc_' + asset);
	const decimals = await getSVValue(conf.registry_aa, 'decimals_' + desc);
	
	const result = {
		asset,
		symbol,
		decimals,
	};
	cache[asset] = result;
	
	return result;
}

module.exports = {
	getAssetWithMeta,
}
