import { describe, expect, it } from 'vitest';
import { STAR_GIFT_MESSAGE_LIMIT, validateStarGiftPurchase } from './StarGiftPurchase';

describe('validateStarGiftPurchase', () => {
    it('normalizes a confirmed catalog purchase', () => {
        expect(
            validateStarGiftPurchase({ giftId: ' 123456 ', message: '  Feliz cumpleaños  ', hideName: true }),
        ).toEqual({ giftId: '123456', message: 'Feliz cumpleaños', hideName: true, includeUpgrade: false });
    });

    it.each(['', '0', '-1', '1.2', 'gift', '1e6'])('rejects a forged gift id: %s', giftId => {
        expect(() => validateStarGiftPurchase({ giftId })).toThrow('no es válido');
    });

    it('rejects oversized messages before invoking Telegram payments', () => {
        expect(() =>
            validateStarGiftPurchase({ giftId: '42', message: 'x'.repeat(STAR_GIFT_MESSAGE_LIMIT + 1) }),
        ).toThrow(`${STAR_GIFT_MESSAGE_LIMIT}`);
    });
});
