
import { registerGhostFeature } from './features/ghost.js';

export function registerApp(client) {
    registerGhostFeature(client);

    console.log('✅ All bot features loaded.');
}
