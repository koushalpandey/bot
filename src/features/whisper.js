import {
    Events,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SlashCommandBuilder,
} from 'discord.js';

import {
    saveWhisper,
    getAllWhispers,
    startWhisperCleanup,
} from '../config/whisperDatabase.js';


// ==========================================
// GLASS THEME PALETTE
// ==========================================

const GLASS = {
    // deep blue-black glass base
    accent: 0x0B1B33, // used only as accent color fallback (dark blue-black)
    base: 0x070B14, // near-black blue
    panel: 0x0D1A2E, // dark blue glass
    panelLight: 0x12263F, // lighter blue glass
    border: 0x1C3557, // subtle glass edge
    highlight: 0x2A4A73, // glass reflection
    text: 0xE6F0FF, // icy white-blue
    textMuted: 0x8FA8C7, // muted blue-grey
    glow: 0x3B6FA0, // soft blue glow

    // semantic tints (kept glassy / muted)
    success: 0x1E4D3A, // deep glass green
    error: 0x4A1E2A, // deep glass red
    info: 0x0D1A2E,
    whisper: 0x1A2A4A, // dark blue glass
    neutral: 0x0A111C,
};


// ==========================================
// SLASH COMMANDS
// ==========================================

export const whisperCommand =
    new SlashCommandBuilder()
        .setName('whisper')
        .setDescription('Send an anonymous whisper to a user.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user who will receive the whisper.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The anonymous message to send.')
                .setRequired(true)
                .setMaxLength(2000)
        );


export const getWhisperMsgsCommand =
    new SlashCommandBuilder()
        .setName('getwhispermsgs')
        .setDescription('Get all stored whisper logs in your DM.');


export const getWhispersCommand =
    new SlashCommandBuilder()
        .setName('getwhispers')
        .setDescription('Get all stored whisper logs in your DM.');






function createContainer({
    title,
    description,
    color = GLASS.panel,
    footer = null,
}) {

    const container =
        new ContainerBuilder()
            .setAccentColor(GLASS.base);



    container.addTextDisplayComponents(
        new TextDisplayBuilder()
            .setContent(`### ${title}`)
    );

    container.addSeparatorComponents(
        new SeparatorBuilder()
            .setSpacing(SeparatorSpacingSize.Small)
            .setDivider(true)
    );



    container.addTextDisplayComponents(
        new TextDisplayBuilder()
            .setContent(description)
    );

    // --------------------------------------
    // FOOTER
    // --------------------------------------

    if (footer) {

        container.addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true)
        );

        container.addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`-# ${footer}`)
        );
    }

    return container;
}




async function sendDM(user, container) {

    try {

        await user.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });

        return true;

    } catch (error) {

        console.error(
            '[Whisper] Failed to send DM:',
            error
        );

        return false;
    }
}


// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(timestamp) {

    return new Date(timestamp)
        .toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Asia/Kolkata',
        });
}


// ==========================================
// FORMAT DATABASE RECORD
// ==========================================

function formatWhisperRecord(row) {

    return [
        `**#${row.id}**`,
        `**From:** ${row.sender_username} (\`${row.sender_id}\`)`,
        `**To:** ${row.receiver_username} (\`${row.receiver_id}\`)`,
        `**Server:** ${row.guild_name} (\`${row.guild_id}\`)`,
        `**Time:** ${formatDate(row.created_at)}`,
        '',
        `**Message:**`,
        `> ${row.message.replace(/\n/g, '\n> ')}`,
    ].join('\n');
}


// ==========================================
// SPLIT LONG DATA
// ==========================================

function splitText(
    text,
    maxLength = 3800
) {

    const chunks = [];

    let current = '';

    for (
        const line of text.split('\n')
    ) {

        if (
            current.length +
            line.length +
            1 >
            maxLength
        ) {

            if (current) {
                chunks.push(current);
            }

            current = line;

        } else {

            current +=
                current
                    ? `\n${line}`
                    : line;
        }
    }

    if (current) {
        chunks.push(current);
    }

    return chunks;
}


// ==========================================
// SEND WHISPER LOGS
// ==========================================

async function sendWhisperLogs(user) {

    const whispers =
        getAllWhispers();

    // --------------------------------------
    // NO DATA
    // --------------------------------------

    if (whispers.length === 0) {

        await sendDM(
            user,

            createContainer({
                title: 'Whisper Logs',

                description:
                    'There are no whisper records stored from the last 15 days.',

                color:
                    GLASS.info,

                footer:
                    'Whisper data is automatically deleted after 15 days.',
            })
        );

        return;
    }


    // --------------------------------------
    // HEADER
    // --------------------------------------

    const headerSent =
        await sendDM(
            user,

            createContainer({

                title:
                    'Whisper Logs',

                description:
                    [
                        `Found **${whispers.length}** whisper record(s).`,
                        '',
                        'Only the last 15 days of data are retained.',
                    ].join('\n'),

                color:
                    GLASS.info,

                footer:
                    'These logs are visible only to the authorized user.',
            })
        );


    if (!headerSent) {

        console.log(
            `[Whisper] Could not DM logs to ${user.tag}`
        );

        return;
    }


    // --------------------------------------
    // FORMAT RECORDS
    // --------------------------------------

    const records =
        whispers
            .map(formatWhisperRecord)
            .join('\n\n');


    // --------------------------------------
    // SPLIT
    // --------------------------------------

    const chunks =
        splitText(records);


    // --------------------------------------
    // SEND EACH CHUNK
    // --------------------------------------

    for (
        let i = 0;
        i < chunks.length;
        i++
    ) {

        const sent =
            await sendDM(
                user,

                createContainer({

                    title:
                        `Whisper Records ${i + 1}/${chunks.length}`,

                    description:
                        chunks[i],

                    color:
                        GLASS.neutral,
                })
            );


        if (!sent) {

            console.log(
                `[Whisper] Failed while sending log chunk ${i + 1}`
            );

            break;
        }
    }
}


// ==========================================
// REGISTER SLASH COMMANDS
// ==========================================

async function registerCommands(client) {

    try {

        const commands = [
            whisperCommand,
            getWhisperMsgsCommand,
            getWhispersCommand,
        ];


        for (const command of commands) {

            const commandData =
                command.toJSON();


            const existing =
                await client.application.commands.fetch();


            const alreadyExists =
                existing.find(
                    cmd =>
                        cmd.name ===
                        commandData.name
                );


            if (alreadyExists) {

                await client.application.commands.edit(
                    alreadyExists.id,
                    commandData
                );

                console.log(
                    `[Whisper] Updated /${commandData.name}`
                );

            } else {

                await client.application.commands.create(
                    commandData
                );

                console.log(
                    `[Whisper] Registered /${commandData.name}`
                );
            }
        }

    } catch (error) {

        console.error(
            '[Whisper] Failed to register slash commands:',
            error
        );
    }
}


// ==========================================
// CHECK LOG ACCESS
// ==========================================

function hasWhisperLogAccess(userId) {

    const botOwnerId =
        process.env.BOT_OWNER_ID;

    const allowedUserId =
        process.env.WHISPER_LOG_ACCESS_USER_ID;


    return (
        (
            botOwnerId &&
            userId === botOwnerId
        ) ||
        (
            allowedUserId &&
            userId === allowedUserId
        )
    );
}




export function registerWhisperFeature(client) {



    startWhisperCleanup();




    client.once(
        Events.ClientReady,
        async () => {

            await registerCommands(client);

            console.log(
                '[Whisper] Slash commands ready.'
            );
        }
    );



    client.on(
        Events.InteractionCreate,
        async interaction => {

            try {



                if (
                    !interaction.isChatInputCommand()
                ) {
                    return;
                }




                if (
                    interaction.commandName ===
                    'whisper'
                ) {

                    const target =
                        interaction.options.getUser(
                            'user'
                        );

                    const whisperText =
                        interaction.options.getString(
                            'message'
                        );



                    if (!target) {

                        await interaction.reply({

                            components: [
                                createContainer({
                                    title:
                                        'Whisper Failed',

                                    description:
                                        'You must select a user.',

                                    color:
                                        GLASS.error,
                                }),
                            ],

                            flags:
                                MessageFlags.Ephemeral |
                                MessageFlags.IsComponentsV2,
                        });

                        return;
                    }


                    if (!whisperText) {

                        await interaction.reply({

                            components: [
                                createContainer({
                                    title:
                                        'Whisper Failed',

                                    description:
                                        'You must provide a message.',

                                    color:
                                        GLASS.error,
                                }),
                            ],

                            flags:
                                MessageFlags.Ephemeral |
                                MessageFlags.IsComponentsV2,
                        });

                        return;
                    }



                    if (target.bot) {

                        await interaction.reply({

                            components: [
                                createContainer({
                                    title:
                                        'Whisper Failed',

                                    description:
                                        'You cannot send a whisper to a bot.',

                                    color:
                                        GLASS.error,
                                }),
                            ],

                            flags:
                                MessageFlags.Ephemeral |
                                MessageFlags.IsComponentsV2,
                        });

                        return;
                    }




                    if (
                        target.id ===
                        interaction.user.id
                    ) {

                        await interaction.reply({

                            components: [
                                createContainer({
                                    title:
                                        'Whisper Failed',

                                    description:
                                        'You cannot send a whisper to yourself.',

                                    color:
                                        GLASS.error,
                                }),
                            ],

                            flags:
                                MessageFlags.Ephemeral |
                                MessageFlags.IsComponentsV2,
                        });

                        return;
                    }




                    if (!interaction.guild) {

                        await interaction.reply({

                            components: [
                                createContainer({
                                    title:
                                        'Whisper Failed',

                                    description:
                                        'This command can only be used inside a server.',

                                    color:
                                        GLASS.error,
                                }),
                            ],

                            flags:
                                MessageFlags.Ephemeral |
                                MessageFlags.IsComponentsV2,
                        });

                        return;
                    }




                    const anonymousDM =
                        createContainer({

                            title:
                                '💌  Anonymous Whisper',

                            description:
                                [
                                    whisperText,
                                    '',
                                    `**Server:** ${interaction.guild.name}`,
                                ].join('\n'),

                            color:
                                GLASS.whisper,

                            footer:
                                'This whisper was sent anonymously.',
                        });


                    // ---------------------------------
                    // TRY TO DELIVER
                    // ---------------------------------

                    const delivered =
                        await sendDM(
                            target,
                            anonymousDM
                        );


                    // =================================
                    // DM FAILED
                    // =================================

                    if (!delivered) {

                        await interaction.reply({

                            components: [
                                createContainer({

                                    title:
                                        'Whisper Not Delivered',

                                    description:
                                        [
                                            `I could not send the whisper to **${target.username}**.`,
                                            '',
                                            'Their DMs may be disabled or unavailable.',
                                            '',
                                            'The whisper was **not saved** to the database.',
                                        ].join('\n'),

                                    color:
                                        GLASS.error,
                                }),
                            ],

                            flags:
                                MessageFlags.Ephemeral |
                                MessageFlags.IsComponentsV2,
                        });

                        return;
                    }


                    // =================================
                    // SAVE TO DATABASE
                    // =================================

                    try {

                        saveWhisper({

                            senderId:
                                interaction.user.id,

                            senderUsername:
                                interaction.user.username,

                            receiverId:
                                target.id,

                            receiverUsername:
                                target.username,

                            guildId:
                                interaction.guild.id,

                            guildName:
                                interaction.guild.name,

                            message:
                                whisperText,
                        });

                    } catch (error) {

                        console.error(
                            '[Whisper DB] Failed to save whisper:',
                            error
                        );


                        await interaction.reply({

                            components: [
                                createContainer({

                                    title:
                                        'Whisper Delivered',

                                    description:
                                        [
                                            `Your whisper was successfully delivered to **${target.username}**.`,
                                            '',
                                            'However, the database log could not be saved.',
                                        ].join('\n'),

                                    color:
                                        GLASS.success,

                                    footer:
                                        'The recipient cannot see your identity.',
                                }),
                            ],

                            flags:
                                MessageFlags.Ephemeral |
                                MessageFlags.IsComponentsV2,
                        });

                        return;
                    }


                    // =================================
                    // PRIVATE SUCCESS RESPONSE
                    // =================================

                    await interaction.reply({

                        components: [
                            createContainer({

                                title:
                                    'Whisper Sent',

                                description:
                                    [
                                        `**To:** ${target.username}`,
                                        `**Server:** ${interaction.guild.name}`,
                                        '',
                                        'Your anonymous whisper was delivered successfully.',
                                    ].join('\n'),

                                color:
                                    GLASS.success,

                                footer:
                                    'Only you can see this confirmation. The recipient cannot see your identity.',
                            }),
                        ],

                        flags:
                            MessageFlags.Ephemeral |
                            MessageFlags.IsComponentsV2,
                    });


                    return;
                }


                // ==================================
                // /GETWHISPERMSGS
                // ==================================

                if (
                    interaction.commandName ===
                    'getwhispermsgs'
                ) {

                    if (
                        !hasWhisperLogAccess(
                            interaction.user.id
                        )
                    ) {

                        await interaction.reply({

                            components: [
                                createContainer({

                                    title:
                                        'Access Denied',

                                    description:
                                        'You do not have permission to access whisper logs.',

                                    color:
                                        GLASS.error,
                                }),
                            ],

                            flags:
                                MessageFlags.Ephemeral |
                                MessageFlags.IsComponentsV2,
                        });

                        return;
                    }


                    await interaction.reply({

                        components: [
                            createContainer({

                                title:
                                    'Whisper Logs',

                                description:
                                    'I am sending the complete whisper logs to your DM.',

                                color:
                                    GLASS.info,

                                footer:
                                    'Only authorized users can request these logs.',
                            }),
                        ],

                        flags:
                            MessageFlags.Ephemeral |
                            MessageFlags.IsComponentsV2,
                    });


                    await sendWhisperLogs(
                        interaction.user
                    );


                    return;
                }


                // ==================================
                // /GETWHISPERS
                // ==================================

                if (
                    interaction.commandName ===
                    'getwhispers'
                ) {

                    if (
                        !hasWhisperLogAccess(
                            interaction.user.id
                        )
                    ) {

                        await interaction.reply({

                            components: [
                                createContainer({

                                    title:
                                        'Access Denied',

                                    description:
                                        'You do not have permission to access whisper logs.',

                                    color:
                                        GLASS.error,
                                }),
                            ],

                            flags:
                                MessageFlags.Ephemeral |
                                MessageFlags.IsComponentsV2,
                        });

                        return;
                    }


                    await interaction.reply({

                        components: [
                            createContainer({

                                title:
                                    'Whisper Logs',

                                description:
                                    'I am sending the complete whisper logs to your DM.',

                                color:
                                    GLASS.info,

                                footer:
                                    'Only authorized users can request these logs.',
                            }),
                        ],

                        flags:
                            MessageFlags.Ephemeral |
                            MessageFlags.IsComponentsV2,
                    });


                    await sendWhisperLogs(
                        interaction.user
                    );


                    return;
                }

            } catch (error) {

                console.error(
                    '[Whisper Feature] Interaction error:',
                    error
                );


                try {

                    if (
                        !interaction.replied &&
                        !interaction.deferred
                    ) {

                        await interaction.reply({

                            components: [
                                createContainer({

                                    title:
                                        'Whisper Error',

                                    description:
                                        'Something went wrong while processing the command.',

                                    color:
                                        GLASS.error,
                                }),
                            ],

                            flags:
                                MessageFlags.Ephemeral |
                                MessageFlags.IsComponentsV2,
                        });
                    }

                } catch (secondaryError) {

                    console.error(
                        '[Whisper] Failed to send error response:',
                        secondaryError
                    );
                }
            }
        }
    );
}