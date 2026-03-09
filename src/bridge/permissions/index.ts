/**
 * Cross-platform camera permissions handling
 */

export interface PermissionResult {
    granted: boolean;
    error?: string;
}

export async function requestCameraPermission(): Promise<PermissionResult> {
    return new Promise((resolve) => {
        // #ifdef H5
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    // Release immediately, just asking for permission
                    stream.getTracks().forEach(track => track.stop());
                    resolve({ granted: true });
                })
                .catch(err => {
                    resolve({ granted: false, error: err.message || 'H5 Camera Denied' });
                });
        } else {
            resolve({ granted: false, error: 'WebRTC not supported on this device/browser' });
        }
        // #endif

        // #ifdef MP-WEIXIN
        uni.authorize({
            scope: 'scope.camera',
            success() {
                resolve({ granted: true });
            },
            fail() {
                resolve({ granted: false, error: 'Mini-program Camera Denied. Please enable in settings.' });
            }
        });
        // #endif

        // #ifdef APP-PLUS
        // Native App permission logic using OS.js or plus.*
        const platform = uni.getSystemInfoSync().platform;
        if (platform === 'ios') {
            // iOS is mostly automatic on usage, but could use plus.navigator.checkPermission
            resolve({ granted: true });
        } else if (platform === 'android') {
            plus.android.requestPermissions(['android.permission.CAMERA'], (e: any) => {
                if (e.granted.length > 0) {
                    resolve({ granted: true });
                } else {
                    resolve({ granted: false, error: 'Android Camera Denied' });
                }
            });
        }
        // #endif
    });
}
