export const STAR_GIFT_MESSAGE_LIMIT = 128;

export function validateStarGiftPurchase(input = {}) {
    const giftId = String(input.giftId || '').trim();
    const message = String(input.message || '').trim();

    if (!/^\d{1,30}$/.test(giftId) || giftId === '0') {
        throw new Error('El regalo seleccionado no es válido.');
    }
    if (message.length > STAR_GIFT_MESSAGE_LIMIT) {
        throw new Error(`El mensaje no puede superar ${STAR_GIFT_MESSAGE_LIMIT} caracteres.`);
    }

    return {
        giftId,
        message,
        hideName: Boolean(input.hideName),
        includeUpgrade: Boolean(input.includeUpgrade),
    };
}
