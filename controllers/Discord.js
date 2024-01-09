const { Client, EmbedBuilder, ActivityType, GatewayIntentBits } = require('discord.js');

module.exports = class DiscordNotification {
	constructor(activity, token) {
		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
			]
		});
		this.token = token;
		this.activity = activity;
	}
	
	async login() {
		await this.client.login(this.token);
		this.client.user.setActivity(this.activity, { type: ActivityType.Watching });
		return true;
	}
	
	getNewEmbed() {
		const embed = new EmbedBuilder();
		embed.setColor('#0099ff');
		return embed;
	}
	
	sendEmbed(channelId, embed) {
		this.client.channels.cache.get(channelId).send({ embeds: [embed] });
	}
}