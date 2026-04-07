import { defineStore } from 'pinia';
import { FilterType } from '../core/shader/ShaderLib';

export const cameraRatios = ['4:3', '1:1', '16:9'] as const;
export type CameraRatio = typeof cameraRatios[number];

type PreferenceState = {
    hapticsEnabled: boolean;
    soundEnabled: boolean;
    highQualityRender: boolean;
    selectedFilter: FilterType;
    selectedRatio: CameraRatio;
};

const STORAGE_KEY = 'retro_preferences';

const createDefaultState = (): PreferenceState => ({
    hapticsEnabled: true,
    soundEnabled: true,
    highQualityRender: true,
    selectedFilter: FilterType.HKNeon,
    selectedRatio: '4:3'
});

const isFilterType = (value: unknown): value is FilterType => {
    return typeof value === 'string' && Object.values(FilterType).includes(value as FilterType);
};

const isCameraRatio = (value: unknown): value is CameraRatio => {
    return typeof value === 'string' && cameraRatios.includes(value as CameraRatio);
};

const loadPreferenceState = (): PreferenceState => {
    const defaults = createDefaultState();

    try {
        const raw = uni.getStorageSync(STORAGE_KEY);
        if (!raw) {
            return defaults;
        }

        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

        return {
            hapticsEnabled: typeof parsed?.hapticsEnabled === 'boolean' ? parsed.hapticsEnabled : defaults.hapticsEnabled,
            soundEnabled: typeof parsed?.soundEnabled === 'boolean' ? parsed.soundEnabled : defaults.soundEnabled,
            highQualityRender: typeof parsed?.highQualityRender === 'boolean' ? parsed.highQualityRender : defaults.highQualityRender,
            selectedFilter: isFilterType(parsed?.selectedFilter) ? parsed.selectedFilter : defaults.selectedFilter,
            selectedRatio: isCameraRatio(parsed?.selectedRatio) ? parsed.selectedRatio : defaults.selectedRatio
        };
    } catch (error) {
        console.error('[RetroLens] Failed to load preferences', error);
        return defaults;
    }
};

export const usePreferenceStore = defineStore('preferences', {
    state: (): PreferenceState => loadPreferenceState(),

    actions: {
        persistPreferences() {
            uni.setStorageSync(STORAGE_KEY, JSON.stringify({
                hapticsEnabled: this.hapticsEnabled,
                soundEnabled: this.soundEnabled,
                highQualityRender: this.highQualityRender,
                selectedFilter: this.selectedFilter,
                selectedRatio: this.selectedRatio
            }));
        },
        setHapticsEnabled(enabled: boolean) {
            this.hapticsEnabled = enabled;
            this.persistPreferences();
        },
        setSoundEnabled(enabled: boolean) {
            this.soundEnabled = enabled;
            this.persistPreferences();
        },
        setHighQualityRender(enabled: boolean) {
            this.highQualityRender = enabled;
            this.persistPreferences();
        },
        setSelectedFilter(filterType: FilterType) {
            this.selectedFilter = filterType;
            this.persistPreferences();
        },
        setSelectedRatio(ratio: CameraRatio) {
            this.selectedRatio = ratio;
            this.persistPreferences();
        },
        toggleHaptics() {
            this.setHapticsEnabled(!this.hapticsEnabled);
        },
        toggleSound() {
            this.setSoundEnabled(!this.soundEnabled);
        }
    }
});
