const BOT_OWNER_ID = process.env.BOT_OWNER_ID;

export const FEATURE_ACCESS = {
    ghost: {
        higher: [
            '1513815784982450206',
        ],

        lower: [
            '519855807576276992',
        ],
    },
};


export function hasFeatureAccess(userId, featureName) {
    // Bot owner has access to every feature
    if (BOT_OWNER_ID && userId === BOT_OWNER_ID) {
        return true;
    }

    const feature = FEATURE_ACCESS[featureName];

    if (!feature) {
        return false;
    }

    const higherUsers = Array.isArray(feature.higher)
        ? feature.higher
        : [];

    const lowerUsers = Array.isArray(feature.lower)
        ? feature.lower
        : [];

    return (
        higherUsers.includes(userId) ||
        lowerUsers.includes(userId)
    );
}


export function getFeatureAccessLevel(userId, featureName) {
    // Bot owner has the highest level
    if (BOT_OWNER_ID && userId === BOT_OWNER_ID) {
        return 'owner';
    }

    const feature = FEATURE_ACCESS[featureName];

    if (!feature) {
        return null;
    }

    if (
        Array.isArray(feature.higher) &&
        feature.higher.includes(userId)
    ) {
        return 'higher';
    }

    if (
        Array.isArray(feature.lower) &&
        feature.lower.includes(userId)
    ) {
        return 'lower';
    }

    // Normal / stranger user
    return null;
}