
import { Events, PermissionFlagsBits } from 'discord.js';
import { PREFIX } from '../utils/prefix.js';
import { hasFeatureAccess } from '../utils/featureAccess.js';

const ghostedUsers = new Map();

async function getTargetMember(message) {

    const mentionedMember = message.mentions.members.first();

    if (mentionedMember) return mentionedMember;


    if (message.reference?.messageId) {
        try {
            const repliedMessage = await message.channel.messages.fetch(
                message.reference.messageId
            );

            return await message.guild.members.fetch(
                repliedMessage.author.id
            );
        } catch {
            return null;
        }
    }

    return null;
}

export function registerGhostFeature(client) {
    client.on(Events.MessageCreate, async (message) => {
        if (!message.guild || message.author.bot) return;

        const guildId = message.guild.id;
        const userId = message.author.id;

        // Automatically delete new messages from ghosted users.
        if (ghostedUsers.get(guildId)?.has(userId)) {
            await message.delete().catch(() => { });
            return;
        }

        const content = message.content.trim();

        if (!content.startsWith(PREFIX)) return;

        const args = content
            .slice(PREFIX.length)
            .trim()
            .split(/\s+/);

        const command = (args.shift() || '').toLowerCase();

        if (command !== 'ghost' && command !== 'unghost') return;


        if (!hasFeatureAccess(message.author.id, 'ghost')) {
            await message.reply({
                content: 'You are not authorized to use the Ghost feature.',
                allowedMentions: { repliedUser: false },
            }).catch(() => { });

            return;
        }

        const ownerId = process.env.BOT_OWNER_ID;

        // Ensure the bot can delete messages.
        const botMember = message.guild.members.me;

        if (
            !botMember?.permissions.has(
                PermissionFlagsBits.ManageMessages
            )
        ) {
            await message.reply(
                'I need the Manage Messages permission.'
            ).catch(() => { });

            return;
        }

        const target = await getTargetMember(message);

        if (!target) {
            await message.reply({
                content:
                    `Mention a user or reply to their message.\n` +
                    `Examples: \`${PREFIX}ghost @user\` and \`${PREFIX}unghost @user\``,
                allowedMentions: { repliedUser: false },
            }).catch(() => { });

            return;
        }

        // Never allow ghosting bots or the bot owner.
        if (target.user.bot || target.id === ownerId) {
            await message.reply(
                'You cannot ghost this user.'
            ).catch(() => { });

            return;
        }


        if (!ghostedUsers.has(guildId)) {
            ghostedUsers.set(guildId, new Set());
        }

        const users = ghostedUsers.get(guildId);

        if (command === 'ghost') {
            if (users.has(target.id)) {
                await message.reply(
                    'This user is already ghosted.'
                ).catch(() => { });

                return;
            }

            users.add(target.id);

            await message.reply(
                `**${target.user.tag}** has been ghosted.`
            ).catch(() => { });

            return;
        }

        if (command === 'unghost') {
            if (!users.has(target.id)) {
                await message.reply(
                    'This user is not ghosted.'
                ).catch(() => { });

                return;
            }

            users.delete(target.id);

            await message.reply(
                `**${target.user.tag}** has been unghosted.`
            ).catch(() => { });
        }
    });
}
