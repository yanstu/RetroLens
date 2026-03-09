import { defineStore } from 'pinia';

export const usePreferenceStore = defineStore('preferences', {
    state: () => ({
        hapticsEnabled: true,
        soundEnabled: true,
        highQualityRender: true
    }),

    actions: {
        toggleHaptics() {
            this.hapticsEnabled = !this.hapticsEnabled;
        },
        toggleSound() {
            this.soundEnabled = !this.soundEnabled;
        }
    },

    persist: true
});
