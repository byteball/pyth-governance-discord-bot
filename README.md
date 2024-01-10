# perp-governance-discord-bot

### How add bot
1) Open https://discord.com/developers/applications
2) Add new application
3) Open setting > bot
4) Click "Reset token" and copy new token
5) Add token in .env discord_token=
6) Scroll to "Privileged Gateway Intents" and activate "PRESENCE INTENT" AND "MESSAGE CONTENT INTENT"
7) Open the link by first changing the client_id (General Information > APPLICATION ID) https://discord.com/oauth2/authorize?client_id=1193633751356424374&permissions=0&scope=bot%20applications.commands
8) Copy channel id and add in .env channel=
