// this error is belongs to the owner
export function cannotUseFeatureOnOwner(featureName) {
    return `You can't ${featureName} the OG.`;
}