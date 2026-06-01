const network = require('ocore/network');

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 10 * 1000;

function wait(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function reqFromLight(name, params) {
	let lastError;
	
	for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
		try {
			return await network.requestFromLightVendor(name, params);
		} catch (e) {
			lastError = e;
			if (attempt < RETRY_ATTEMPTS) {
				await wait(RETRY_DELAY_MS);
			}
		}
	}
	
	throw lastError;
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
