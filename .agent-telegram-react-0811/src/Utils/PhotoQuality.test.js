import { getPhotoOutputSize, normalizePhotoQuality } from './PhotoQuality';

describe('photo quality profiles', () => {
    it('preserves current behavior for missing or invalid preferences', () => {
        expect(normalizePhotoQuality()).toBe('original');
        expect(normalizePhotoQuality('forged')).toBe('original');
        expect(getPhotoOutputSize(4000, 3000, 'original')).toEqual({ width: 4000, height: 3000 });
    });

    it('constrains dimensions without changing aspect ratio', () => {
        expect(getPhotoOutputSize(4000, 3000, 'balanced')).toEqual({ width: 1920, height: 1440 });
        expect(getPhotoOutputSize(1200, 1800, 'data')).toEqual({ width: 853, height: 1280 });
    });

    it('never upscales small images', () => {
        expect(getPhotoOutputSize(640, 480, 'high')).toEqual({ width: 640, height: 480 });
    });
});
