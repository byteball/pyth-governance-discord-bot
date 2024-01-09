const network = require('ocore/network');

function reqFromLight(name, params) {
	return network.requestFromLightVendor(name, params);
}

async function getSVValue(address, name) {
	const result = await reqFromLight('light/get_aa_state_vars', {
		address,
		var_prefix_from: name,
		var_prefix_to: name
	});
	return result[name];
}

function getSV(address) {
	return reqFromLight('light/get_aa_state_vars', { address });
} 

async function getSVWithAddress(address) {
	return {
		address,
		vars: await getSV(address)
	};
}

module.exports = {
	reqFromLight,
	getSV,
	getSVValue,
	getSVWithAddress,
}
