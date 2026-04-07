import { defineStore } from 'pinia';

export const useFilmStore = defineStore('film', {
    state: () => ({
        savedPhotos: uni.getStorageSync('retro_photos') ? JSON.parse(uni.getStorageSync('retro_photos')) as string[] : []
    }),

    actions: {
        takePhoto(photoDataUrl: string) {
            this.savedPhotos.unshift(photoDataUrl);
            uni.setStorageSync('retro_photos', JSON.stringify(this.savedPhotos));
            return true;
        },

        clearPhotos() {
            this.savedPhotos = [];
            uni.setStorageSync('retro_photos', JSON.stringify(this.savedPhotos));
        }
    }
});
