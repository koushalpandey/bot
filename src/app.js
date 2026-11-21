
import { registerGhostFeature } from './features/ghost.js';
import { registerWhisperFeature } from './features/whisper.js';


export function registerApp(client) {
    registerGhostFeature(client);
    registerWhisperFeature(client);

    console.log('✅ All bot features loaded.');
}
