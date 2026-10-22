
import 'dotenv/config';

import { Client, GatewayIntentBits, Events } from 'discord.js';
import { registerApp } from './src/app.js';

const token = process.env.DISCORD_TOKEN;
const ownerId = process.env.BOT_OWNER_ID;

if (!token) {
    console.error('DISCORD_TOKEN is missing from .env');
    process.exit(1);
}

if (!ownerId) {
    console.error('DISCORD_OWNER_ID is missing from .env');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});


registerApp(client);

client.once(Events.ClientReady, (readyClient) => {
    console.log(`✅ Bot is online as ${readyClient.user.tag}`);
});

client.login(token).catch((error) => {
    console.error('❌ Failed to log in to Discord:', error.message);
    process.exitCode = 1;
});
