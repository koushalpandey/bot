import {
    Events,
    PermissionFlagsBits,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
} from 'discord.js';

import { PREFIX } from '../utils/prefix.js';

import {
    hasFeatureAccess,
    getFeatureAccessLevel,
} from '../utils/featureAccess.js';

import {
    cannotUseFeatureOnOwner,
} from '../utils/errors-message/featureErrors.js';


const ghostedUsers = new Map();


const COLORS = {
    error: 0xED4245,
    success: 0x57F287,
    info: 0x5865F2,
    ghost: 0x9B59B6,
    neutral: 0x2B2D31,
};


async function getTargetMember(message) {
    const mentionedMember = message.mentions.members.first();

    if (mentionedMember) {
        return mentionedMember;
    }


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


function createErrorContainer(title, description) {
    return new ContainerBuilder()
        .setAccentColor(COLORS.error)

        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`### ${title}`)
        )

        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(description)
        );
}


function createInfoContainer(title, description) {
    return new ContainerBuilder()
        .setAccentColor(COLORS.info)

        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`### ${title}`)
        )

        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        )

        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(description)
        );
}


function createGhostStatusContainer({
    target,
    color,
    title,
    subtitle,
    footer,
}) {
    const container = new ContainerBuilder()
        .setAccentColor(color);


    container.addTextDisplayComponents(
        new TextDisplayBuilder()
            .setContent(`### ${title}`)
    );


    container.addSeparatorComponents(
        new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(true)
    );


    const section = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(
                    [
                        `**${target.user.tag}**`,
                        `<@${target.id}>`,
                        '',
                        subtitle,
                    ].join('\n')
                )
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder()
                .setURL(
                    target.user.displayAvatarURL({
                        size: 128,
                        extension: 'png',
                    })
                )
        );


    container.addSectionComponents(section);


    container.addSeparatorComponents(
        new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(true)
    );


    container.addTextDisplayComponents(
        new TextDisplayBuilder()
            .setContent(`-# ${footer}`)
    );


    return container;
}


async function replyWithContainer(message, container) {
    await message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,

        allowedMentions: {
            repliedUser: false,
        },
    }).catch(() => { });
}


export function registerGhostFeature(client) {
    client.on(Events.MessageCreate, async (message) => {

        /*
         * Ignore DMs and bot messages.
         */
        if (!message.guild || message.author.bot) {
            return;
        }


        const guildId = message.guild.id;
        const userId = message.author.id;


        /*
         * Automatically delete new messages
         * from ghosted users.
         */
        if (ghostedUsers.get(guildId)?.has(userId)) {
            await message.delete().catch(() => { });
            return;
        }


        /*
         * Check prefix.
         */
        const content = message.content.trim();

        if (!content.startsWith(PREFIX)) {
            return;
        }


        /*
         * Parse command.
         */
        const args = content
            .slice(PREFIX.length)
            .trim()
            .split(/\s+/);

        const command = (args.shift() || '').toLowerCase();


        /*
         * Only handle ghost/unghost.
         */
        if (
            command !== 'ghost' &&
            command !== 'unghost'
        ) {
            return;
        }


        /*
         * Check whether the executor
         * has Ghost feature access.
         */
        if (!hasFeatureAccess(userId, 'ghost')) {

            return replyWithContainer(
                message,
                createErrorContainer(
                    'Access Denied',
                    'You are not authorized to use the Ghost feature.'
                )
            );
        }


        const ownerId = process.env.BOT_OWNER_ID;


        /*
         * Check bot permission.
         */
        const botMember = message.guild.members.me;

        if (
            !botMember?.permissions.has(
                PermissionFlagsBits.ManageMessages
            )
        ) {

            return replyWithContainer(
                message,
                createErrorContainer(
                    'Missing Permission',
                    'I need the `Manage Messages` permission to use the Ghost feature.'
                )
            );
        }


        const target = await getTargetMember(message);


        if (!target) {

            return replyWithContainer(
                message,
                createInfoContainer(
                    'Ghost Feature',
                    [
                        'Mention a user or reply to their message.',
                        '',
                        '**Usage**',
                        `\`${PREFIX}ghost @user\` — hide a user's new messages`,
                        `\`${PREFIX}unghost @user\` — restore a user's messages`,
                    ].join('\n')
                )
            );
        }



        if (target.id === userId) {

            return replyWithContainer(
                message,
                createErrorContainer(
                    'Action Not Allowed',
                    'You cannot ghost **yourself**.'
                )
            );
        }



        if (target.user.bot) {

            return replyWithContainer(
                message,
                createErrorContainer(
                    'Action Not Allowed',
                    'Bots cannot be ghosted.'
                )
            );
        }



        if (
            ownerId &&
            target.id === ownerId
        ) {

            return replyWithContainer(
                message,
                createErrorContainer(
                    'Protected User',
                    cannotUseFeatureOnOwner('ghost')
                )
            );
        }



        const executorLevel = getFeatureAccessLevel(
            userId,
            'ghost'
        );

        const targetLevel = getFeatureAccessLevel(
            target.id,
            'ghost'
        );


        let canTarget = false;



        if (executorLevel === 'owner') {

            canTarget = true;
        }



        else if (executorLevel === 'higher') {

            if (
                targetLevel === null ||
                targetLevel === 'lower'
            ) {
                canTarget = true;
            }
        }


        /*
         * Lower moderator.
         *
         * A lower moderator can ghost
         * ANY normal/stranger user.
         *
         * But cannot target another lower,
         * higher moderator, or owner.
         */
        else if (executorLevel === 'lower') {

            if (targetLevel === null) {
                canTarget = true;
            }
        }


        /*
         * Safety fallback.
         */
        else {

            canTarget = false;
        }


        /*
         * Hierarchy protection message.
         */
        if (!canTarget) {

            let reason =
                'You do not have permission to target this user.';


            if (
                executorLevel === 'lower' &&
                targetLevel === 'higher'
            ) {

                reason =
                    'Lower moderators cannot target higher moderators.';
            }


            else if (
                executorLevel === 'lower' &&
                targetLevel === 'lower'
            ) {

                reason =
                    'Lower moderators cannot target other lower moderators.';
            }


            else if (
                executorLevel === 'higher' &&
                targetLevel === 'higher'
            ) {

                reason =
                    'Higher moderators cannot target other higher moderators.';
            }


            else if (
                executorLevel === 'lower' &&
                targetLevel === 'owner'
            ) {

                reason =
                    'The bot owner is protected from the Ghost feature.';
            }


            else if (
                executorLevel === 'higher' &&
                targetLevel === 'owner'
            ) {

                reason =
                    'The bot owner is protected from the Ghost feature.';
            }


            return replyWithContainer(
                message,
                createErrorContainer(
                    'Hierarchy Protection',
                    reason
                )
            );
        }


        /*
         * Create guild ghost list.
         */
        if (!ghostedUsers.has(guildId)) {
            ghostedUsers.set(
                guildId,
                new Set()
            );
        }


        const users = ghostedUsers.get(guildId);


        /*
         * GHOST
         */
        if (command === 'ghost') {

            /*
             * Already ghosted.
             */
            if (users.has(target.id)) {

                return replyWithContainer(
                    message,
                    createGhostStatusContainer({
                        target,
                        color: COLORS.info,
                        title: 'Already Ghosted',
                        subtitle:
                            'This user is **already** being ghosted.',
                        footer:
                            'No changes were made.',
                    })
                );
            }


            /*
             * Add target.
             */
            users.add(target.id);


            /*
             * Success response.
             */
            return replyWithContainer(
                message,
                createGhostStatusContainer({
                    target,
                    color: COLORS.ghost,
                    title: 'User Ghosted',
                    subtitle:
                        'Their new messages will be **automatically deleted** in this server.\n' +
                        `Use \`${PREFIX}unghost\` to restore them.`,
                    footer:
                        'Ghost mode is now active.',
                })
            );
        }


        /*
         * UNGHOST
         */
        if (command === 'unghost') {

            /*
             * User isn't ghosted.
             */
            if (!users.has(target.id)) {

                return replyWithContainer(
                    message,
                    createGhostStatusContainer({
                        target,
                        color: COLORS.info,
                        title: 'Not Ghosted',
                        subtitle:
                            'This user is **not** currently ghosted.',
                        footer:
                            'No changes were made.',
                    })
                );
            }


            /*
             * Remove target.
             */
            users.delete(target.id);


            /*
             * Success response.
             */
            return replyWithContainer(
                message,
                createGhostStatusContainer({
                    target,
                    color: COLORS.success,
                    title: 'User Unghosted',
                    subtitle:
                        'Their messages will now appear normally again.',
                    footer:
                        'Ghost mode has been removed.',
                })
            );
        }
    });
}