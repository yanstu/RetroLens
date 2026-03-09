/**
 * HapticsManager - Singleton for haptic feedback
 * Wraps uni.vibrateShort / vibrateLong with fallback patterns
 */
export class HapticsManager {
    private static instance: HapticsManager;
    private enabled: boolean = true;

    private constructor() { }

    public static getInstance(): HapticsManager {
        if (!HapticsManager.instance) {
            HapticsManager.instance = new HapticsManager();
        }
        return HapticsManager.instance;
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    public dialTick() {
        if (!this.enabled) return;

        // Very light tap suitable for a mechanical dial click
        // Under WeChat / App
        void uni.vibrateShort({
            type: 'light',
            fail: () => {
                // Fallback for older devices/H5 where 'type' might not be supported
                // Silent catch
            }
        } as UniApp.VibrateShortOptions);
    }

    public shutterClick() {
        if (!this.enabled) return;

        // Medium/Heavy tap for the physical shutter release
        void uni.vibrateShort({
            type: 'heavy',
            fail: () => {
                // Fallback
            }
        } as UniApp.VibrateShortOptions);
    }

    public filmWind() {
        if (!this.enabled) return;

        // Long continuous mechanical feel
        void uni.vibrateLong({
            fail: () => { }
        });
    }
}
