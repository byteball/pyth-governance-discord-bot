const eventBus = require('ocore/event_bus.js');
const headlessWallet = require('headless-obyte');
const DiscordNotification = require('./controllers/Discord.js');
const conf = require('./conf.js');
const network = require('ocore/network');
const { reqFromLight, getSV, getSVValue, getSVWithAddress } = require('./services/obyte');
const { getAssetWithMeta } = require('./services/getAssetWithMeta')
const { convertFieldValues } = require("./utils/convertValue");
const { getVPFromNormalized } = require("./utils/getVPFromNormalized");

const assocStakingToMeta = {};

const notification = new DiscordNotification("Perpetual Governance AAs", conf.discord_token);
const readyPromise = new Promise((resolve) => {
	eventBus.once('headless_wallet_ready', resolve);
});

Promise.all([notification.login(), readyPromise]).then(() => {
	start();
});


async function getAssetsWithMeta(assets) {
	const metaByAsset = {};
	const p = [];
	
	for (const asset of assets) {
		p.push(getAssetWithMeta(asset));
	}
	
	const result = await Promise.all(p);
	result.forEach(meta => {
		metaByAsset[meta.asset] = meta;
	});
	
	return metaByAsset;
}

async function prepareDataByPools(metaByBaseAas, varsWithAddresses) {
	const assets = new Set();
	const varsByAddress = {};
	
	metaByBaseAas.forEach(meta => {
		const definition = meta.definition;
		const params = definition[1].params
		assets.add(params.reserve_asset);
		meta.reserve_asset = params.reserve_asset;
		if (params.decay_factor) {
			meta.decay_factor = params.decay_factor;
		}
	});
	
	varsWithAddresses.forEach(v => {
		varsByAddress[v.address] = v.vars;
		assets.add(v.vars.state.asset0);
		
		for (let key in v.vars) {
			if (!key.startsWith('asset_')) continue;
			assets.add(key.substring(6));
		}
	});
	
	const assetsWithMeta = await getAssetsWithMeta(assets);
	
	for (const { address, reserve_asset, decay_factor } of metaByBaseAas) {
		const stakingAa = await getSVValue(address, 'staking_aa')
		const asset0 = varsByAddress[address].state.asset0;
		let decayFactor = varsByAddress[address].decay_factor;
		if (!decayFactor) {
			decayFactor = decay_factor || 8;
		}
		assocStakingToMeta[stakingAa] = {
			perp: address,
			reserveAssetMeta: assetsWithMeta[reserve_asset],
			asset0Meta: assetsWithMeta[asset0],
			decayFactor,
		};
	}
}

async function start() {
	const metaByBaseAAs = await reqFromLight('light/get_aas_by_base_aas', { base_aas: conf.base_aas });
	const pForVars = metaByBaseAAs.map(meta => getSVWithAddress(meta.address));
	const varsWithAddresses = await Promise.all(pForVars);
	await prepareDataByPools(metaByBaseAAs, varsWithAddresses);
	
	Object.keys(assocStakingToMeta).forEach(aa => {
		network.addLightWatchedAa(aa);
	});
}

function formatAndSendMessageForDiscord(params) {
	const {
		aa_address,
		trigger_address,
		voteName,
		voteValue,
		voteVP,
		leaderValue,
		leaderVP,
		trigger_unit,
		symbol,
	} = params;
	const meta = assocStakingToMeta[aa_address];
	
	const fVoteValue = convertFieldValues(voteName, voteValue);
	const fLeadValue = convertFieldValues(voteName, leaderValue);
	
	const fVoteVP = getVPFromNormalized(voteVP, meta.decayFactor) / 10 ** meta.asset0Meta.decimals;
	const fLeaderVP = getVPFromNormalized(leaderVP, meta.decayFactor) / 10 ** meta.asset0Meta.decimals;
	
	const msg = notification.getNewEmbed();
	msg.setTitle(`Support added in ${meta.reserveAssetMeta.symbol}/${meta.asset0Meta.symbol} - ${aa_address}`);
	msg.setDescription(`User ${trigger_address} voted for \`${voteName}\`${symbol ? ' in ' + symbol : ''}  of parameter \`${fVoteValue}\``);
	
	msg.addFields(
		{ name: "Value", value: fVoteValue, inline: true },
		{ name: "VP", value: fVoteVP.toPrecision(6), inline: true },
		{ name: '\u200B', value: '\u200B', inline: true }
	);
	msg.addFields(
		{ name: "Lead value", value: fLeadValue, inline: true },
		{ name: "VP", value: fLeaderVP.toPrecision(6), inline: true },
		{ name: '\u200B', value: '\u200B', inline: true }
	);
	
	
	msg.addFields({ name: 'Trigger unit', value: `[${trigger_unit}](${conf.explorer_url}/${trigger_unit})` });
	
	conf.discord_channels.forEach(v => {
		notification.sendEmbed(v, msg);
	})
}

eventBus.on("message_for_light", async (ws, subject, body) => {
	if (subject !== 'light/aa_response') return;
	
	const { aa_address, trigger_address, trigger_unit, updatedStateVars } = body;
	const stateVars = updatedStateVars[aa_address]
	const voteKeyForState = Object.keys(stateVars).find(k => k.startsWith(`user_value_votes_${trigger_address}`));
	let voteName = voteKeyForState.substring(50);
	const voteValue = stateVars[voteKeyForState].value.value;
	const voteVP = stateVars[voteKeyForState].value.vp;
	const vars = await getSV(aa_address);
	const leaderValue = vars[`leader_${voteName}`].value;
	const leaderVP = vars[`value_votes_${voteName}_${leaderValue}`] || 0;
	if (voteName.includes('add_price_aa')) return;
	
	let symbol = '';
	if (voteName.includes('change_drift_rate')) {
		const asset = voteName.substring('change_drift_rate'.length);
		symbol = (await getAssetWithMeta(asset)).symbol;
		voteName = 'change_drift_rate';
	}
	
	formatAndSendMessageForDiscord({
		aa_address,
		trigger_address,
		voteName,
		voteValue,
		voteVP,
		leaderValue,
		leaderVP,
		trigger_unit,
		symbol,
	});
});
