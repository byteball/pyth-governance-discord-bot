const eventBus = require('ocore/event_bus.js');
const network = require('ocore/network');
const headlessWallet = require('headless-obyte');
const walletGeneral = require('ocore/wallet_general');
const lightWallet = require('ocore/light_wallet');
const storage = require('ocore/storage');
const mutex = require('ocore/mutex');
const DiscordNotification = require('./controllers/Discord.js');
const conf = require('./conf.js');
const { reqFromLight, getSV, getSVValue, getSVWithAddress } = require('./services/obyte');
const { getAssetWithMeta } = require('./services/getAssetWithMeta')
const { convertFieldValues } = require("./utils/convertValue");
const { getVPFromNormalized } = require("./utils/getVPFromNormalized");
const { getUnitData } = require("./utils/unit");

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

const alreadyWatching = new Set();
function addAddressToWatch(address) {
	if (alreadyWatching.has(address)) return;
	
	network.addLightWatchedAa(address);
	walletGeneral.addWatchedAddress(address);
	alreadyWatching.add(address);
}

async function start() {
	const unlock = await mutex.lock('notifications');
	const metaByBaseAAs = await reqFromLight('light/get_aas_by_base_aas', { base_aas: conf.base_aas });
	const pForVars = metaByBaseAAs.map(meta => getSVWithAddress(meta.address));
	const varsWithAddresses = await Promise.all(pForVars);
	await prepareDataByPools(metaByBaseAAs, varsWithAddresses);
	
	[...Object.keys(assocStakingToMeta), ...conf.base_aas].forEach(aa => {
		addAddressToWatch(aa);
	});
	unlock();
	
	setTimeout(() => {
		lightWallet.refreshLightClientHistory([...alreadyWatching]);
	}, 10 * 1000);
}
setInterval(start, 30 * 60 * 1000);

async function formatAndSendMessageForDiscord(params) {
	const unlock = await mutex.lock('notifications');
	const {
		aa_address,
		trigger_address,
		voteName,
		voteValue,
		voteVP,
		totalVPByParam,
		leaderValue,
		leaderVP,
		trigger_unit,
		symbol,
	} = params;
	const meta = assocStakingToMeta[aa_address];
	
	const fVoteValue = convertFieldValues(voteName, voteValue);
	const fLeadValue = convertFieldValues(voteName, leaderValue);
	
	const fVoteVP = getVPFromNormalized(voteVP, meta.decayFactor) / 10 ** meta.asset0Meta.decimals;
	const fTotalVPByParam = getVPFromNormalized(totalVPByParam, meta.decayFactor) / 10 ** meta.asset0Meta.decimals;
	const fLeaderVP = getVPFromNormalized(leaderVP, meta.decayFactor) / 10 ** meta.asset0Meta.decimals;
	
	const msg = notification.getNewEmbed();
	msg.setTitle(`Support added in ${meta.reserveAssetMeta.symbol}/${meta.asset0Meta.symbol} - ${aa_address}`);
	msg.setDescription(`User ${trigger_address} voted for \`${voteName}\`${symbol ? ' in ' + symbol : ''}  of parameter \`${fVoteValue}\`. Added ${fVoteVP.toPrecision(6)} VP.`);
	msg.addFields({ name: 'Leader', value: `[${trigger_address}](${conf.explorer_url}/${trigger_address})` });
	
	msg.addFields(
		{ name: "Value", value: fVoteValue, inline: true },
		{ name: "VP", value: fTotalVPByParam.toPrecision(6), inline: true },
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
	unlock();
}

function processAADefinition(objUnit) {
	const definitionMessages = objUnit.messages.filter(m => m.app === 'definition');
	for (let message of definitionMessages) {
		const definitionPayload = message.payload;
		const definition = definitionPayload.definition;
		const base_aa = definition[1].base_aa;
		
		if(conf.base_aas.includes(base_aa)) {
			start();
		}
	}
}

async function processAAResponse(body) {
	const { aa_address, trigger_address, trigger_unit } = body;
	if (conf.base_aas.includes(aa_address)) return;
	
	const objTriggerUnit = await storage.readUnit(trigger_unit);
	const data = getUnitData(objTriggerUnit);
	if (!data.vote_value) return;
	
	if (data.name === 'add_price_aa') return;
	const voteName = data.name;
	const voteValue = data.value;
	let symbol = '';
	if (data.asset) {
		symbol = (await getAssetWithMeta(asset)).symbol;
	}
	
	const vars = await getSV(aa_address);
	const voteVP = vars[`user_value_votes_${trigger_address}_${voteName}${data.asset || ''}`].vp;
	const totalVPByParam = vars[`value_votes_${voteName}_${voteValue}`];
	const leaderValue = vars[`leader_${voteName}${data.asset || ''}`].value;
	const leaderVP = vars[`value_votes_${voteName}_${leaderValue}`] || 0;
	
	formatAndSendMessageForDiscord({
		aa_address,
		trigger_address,
		voteName,
		voteValue,
		voteVP,
		totalVPByParam,
		leaderValue,
		leaderVP,
		trigger_unit,
		symbol,
	});
}

eventBus.on("message_for_light", (ws, subject, body) => {
	if(subject === 'light/aa_definition') {
		processAADefinition(body);
	}
});

eventBus.on('aa_response', processAAResponse);
