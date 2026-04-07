import { onLoad, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app';

type PageShareConfig = {
    title: string;
    path: string;
    imageUrl?: string;
    query?: string;
};

export function usePageShare(config: PageShareConfig) {
    // #ifdef MP-WEIXIN
    onLoad(() => {
        if (typeof wx !== 'undefined' && typeof wx.showShareMenu === 'function') {
            wx.showShareMenu({
                menus: ['shareAppMessage', 'shareTimeline']
            });
        }
    });

    onShareAppMessage(() => ({
        title: config.title,
        path: config.path,
        imageUrl: config.imageUrl
    }));

    onShareTimeline(() => ({
        title: config.title,
        query: config.query || '',
        imageUrl: config.imageUrl
    }));
    // #endif
}
