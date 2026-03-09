/**
 * AudioManager - Singleton for loading and playing retro SFX
 * Uses uniapp's innerAudioContext for cross-platform support.
 */
import audioData from './sounds_b64.json';

export class AudioManager {
    private static instance: AudioManager;

    private contexts: Map<string, UniApp.InnerAudioContext> = new Map();
    private loaded: boolean = false;

    private readonly soundFiles = {
        shutter: (audioData as any).shutter,
        wind: (audioData as any).wind,
        static: (audioData as any).static
    };

    private constructor() { }

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    public preloadAll() {
        if (this.loaded) return;

        for (const [key, path] of Object.entries(this.soundFiles)) {
            const ctx = uni.createInnerAudioContext();
            ctx.src = path;
            ctx.obeyMuteSwitch = false; // Play even if silent mode on some devices
            // Preload triggers internally in some environments when src is set
            this.contexts.set(key, ctx);
        }
        this.loaded = true;
    }

    public play(sound: keyof typeof this.soundFiles, loop: boolean = false) {
        if (!this.loaded) this.preloadAll();

        const ctx = this.contexts.get(sound);
        if (ctx) {
            ctx.loop = loop;
            ctx.stop(); // Stop if already playing
            ctx.play();
        }
    }

    public stop(sound: keyof typeof this.soundFiles) {
        const ctx = this.contexts.get(sound);
        if (ctx) {
            ctx.stop();
        }
    }
}
