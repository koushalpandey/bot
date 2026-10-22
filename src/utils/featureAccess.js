
const BOT_OWNER_ID = process.env.BOT_OWNER_ID;


export const FEATURE_ACCESS = {
    ghost: [
        '111111111111111111',
        '222222222222222222',
    ],

    moderation: [
        '333333333333333333',
    ],

    welcome: [
        '444444444444444444',
        '555555555555555555',
    ],
};


export function hasFeatureAccess(userId, featureName) {

    if (BOT_OWNER_ID && userId === BOT_OWNER_ID) {
        return true;
    } const allowedUsers = FEATURE_ACCESS[featureName];

    if (!Array.isArray(allowedUsers)) {
        return false;
    }

    return allowedUsers.includes(userId);
}
