import { describe, expect, it } from 'vitest';
import { cropForAspect, getOutputSize, normalizeCrop, normalizeImageEdits } from './ImageTransforms';

describe('ImageTransforms', () => {
    it('limits unsafe edit values', () => {
        expect(normalizeImageEdits({ rotation: -90, brightness: 999, contrast: 0 })).toMatchObject({
            rotation: 270,
            brightness: 175,
            contrast: 100,
        });
    });

    it('keeps crop coordinates inside the image', () => {
        const crop = normalizeCrop({ x: -1, y: 2, width: 0, height: 4 });
        expect(crop).toMatchObject({ x: 0, y: 0.99, width: 1 });
        expect(crop.height).toBeCloseTo(0.01);
    });

    it('centres an aspect crop without stretching the image', () => {
        expect(cropForAspect(1600, 900, 1)).toEqual({ x: 0.21875, y: 0, width: 0.5625, height: 1 });
    });

    it('swaps dimensions after a quarter turn', () => {
        expect(getOutputSize(1200, 800, { rotation: 90, crop: { width: 0.5, height: 1 } })).toEqual({
            width: 800,
            height: 600,
        });
    });
});
