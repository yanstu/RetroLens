import { defineStore } from 'pinia';
import { FilterType } from '../core/shader/ShaderLib';

export const useFilmStore = defineStore('film', {
    state: () => ({
        currentFilm: FilterType.Cyberpunk,
        savedPhotos: uni.getStorageSync('retro_photos') ? JSON.parse(uni.getStorageSync('retro_photos')) as string[] : []
    }),

    actions: {
        setFilm(filterType: FilterType) {
            this.currentFilm = filterType;
        },

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
