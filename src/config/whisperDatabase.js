import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dbPath =
    process.env.WHISPER_DB_PATH || './data/whispers.db';

const absoluteDbPath = path.resolve(dbPath);

// Make sure parent folder exists
fs.mkdirSync(path.dirname(absoluteDbPath), {
    recursive: true,
});

// Open / create SQLite database
const db = new Database(absoluteDbPath);

console.log(
    `[Whisper DB] Connected: ${absoluteDbPath}`
);

// Better SQLite behavior
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ==========================================
// TABLE
// ==========================================

db.exec(`
    CREATE TABLE IF NOT EXISTS whispers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        sender_id TEXT NOT NULL,
        sender_username TEXT NOT NULL,

        receiver_id TEXT NOT NULL,
        receiver_username TEXT NOT NULL,

        guild_id TEXT NOT NULL,
        guild_name TEXT NOT NULL,

        message TEXT NOT NULL,

        created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_whispers_created_at
    ON whispers(created_at);

    CREATE INDEX IF NOT EXISTS idx_whispers_sender_id
    ON whispers(sender_id);

    CREATE INDEX IF NOT EXISTS idx_whispers_receiver_id
    ON whispers(receiver_id);
`);

// ==========================================
// INSERT
// ==========================================

const insertWhisper = db.prepare(`
    INSERT INTO whispers (
        sender_id,
        sender_username,
        receiver_id,
        receiver_username,
        guild_id,
        guild_name,
        message,
        created_at
    )
    VALUES (
        @senderId,
        @senderUsername,
        @receiverId,
        @receiverUsername,
        @guildId,
        @guildName,
        @message,
        @createdAt
    )
`);

// ==========================================
// GET ALL
// ==========================================

const getAllWhispersQuery = db.prepare(`
    SELECT
        id,
        sender_id,
        sender_username,
        receiver_id,
        receiver_username,
        guild_id,
        guild_name,
        message,
        created_at
    FROM whispers
    ORDER BY created_at DESC
`);

// ==========================================
// DELETE OLD
// ==========================================

const deleteOldWhispersQuery = db.prepare(`
    DELETE FROM whispers
    WHERE created_at < ?
`);

// ==========================================
// SAVE WHISPER
// ==========================================

export function saveWhisper({
    senderId,
    senderUsername,
    receiverId,
    receiverUsername,
    guildId,
    guildName,
    message,
}) {
    return insertWhisper.run({
        senderId,
        senderUsername,
        receiverId,
        receiverUsername,
        guildId,
        guildName,
        message,
        createdAt: Date.now(),
    });
}

// ==========================================
// GET ALL WHISPERS
// ==========================================

export function getAllWhispers() {
    return getAllWhispersQuery.all();
}

// ==========================================
// DELETE 15+ DAY OLD DATA
// ==========================================

export function deleteExpiredWhispers() {
    const FIFTEEN_DAYS =
        15 * 24 * 60 * 60 * 1000;

    const cutoff =
        Date.now() - FIFTEEN_DAYS;

    const result =
        deleteOldWhispersQuery.run(cutoff);

    return result.changes;
}

// ==========================================
// START CLEANUP
// ==========================================

export function startWhisperCleanup() {
    // Cleanup immediately
    const deleted = deleteExpiredWhispers();

    if (deleted > 0) {
        console.log(
            `[Whisper DB] Deleted ${deleted} expired whisper(s).`
        );
    }

    // Cleanup every 1 hour
    const ONE_HOUR =
        60 * 60 * 1000;

    setInterval(() => {
        try {
            const deleted =
                deleteExpiredWhispers();

            if (deleted > 0) {
                console.log(
                    `[Whisper DB] Deleted ${deleted} expired whisper(s).`
                );
            }
        } catch (error) {
            console.error(
                '[Whisper DB] Cleanup error:',
                error
            );
        }
    }, ONE_HOUR);
}

export default db;