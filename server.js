
import 'dotenv/config';

import {
    Client,
    GatewayIntentBits,
    Events,
} from 'discord.js';

const token = process.env.DISCORD_TOKEN;


if (!token) {
    console.error('Error: DISCORD_TOKEN is missing from .env');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once(Events.ClientReady, (readyClient) => {
    console.log(`✅ Bot is online as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {

    if (message.author.bot) return;


    if (message.content.trim().toLowerCase() === '!ping') {
        await message.reply('Pong! 🏓');
    }
});

client.login(token).catch((error) => {
    console.error('Failed to log in to Discord:', error.message);
});
