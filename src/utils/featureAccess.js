
const BOT_OWNER_ID = process.env.BOT_OWNER_ID;


export const FEATURE_ACCESS = {
    ghost: [
        '1513815784982450206',

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
