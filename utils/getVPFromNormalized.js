const COMMON_TS = 1657843200; // Fri Jul 15 2022 00:00:00 GMT+0000
const YEAR_IN_SEC = 31104000;

function getVPFromNormalized(
	normalized_vp,
	decay_factor = 8,
) {
	if (!normalized_vp) return 0;
	const timestamp = Math.floor(Date.now() / 1000);
	
	return (
		normalized_vp / decay_factor ** ((timestamp - COMMON_TS) / YEAR_IN_SEC)
	);
}

module.exports = {
	getVPFromNormalized,
}
