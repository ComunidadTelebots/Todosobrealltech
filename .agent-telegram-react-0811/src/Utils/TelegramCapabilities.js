import { Api } from 'telegram';

const CAPABILITY_METHODS = Object.freeze({
    passkeys: Object.freeze([
        'account.InitPasskeyRegistration',
        'account.RegisterPasskey',
        'account.GetPasskeys',
        'account.DeletePasskey',
        'auth.InitPasskeyLogin',
        'auth.FinishPasskeyLogin',
    ]),
    giftResale: Object.freeze([
        'payments.GetResaleStarGifts',
        'payments.UpdateStarGiftPrice',
    ]),
    giftOffers: Object.freeze([
        'payments.SendStarGiftOffer',
        'payments.ResolveStarGiftOffer',
    ]),
});

function hasConstructor(api, path) {
    return path.split('.').reduce((value, key) => value && value[key], api) != null;
}

export function detectTelegramCapabilities(api = Api) {
    const detect = methods => {
        const missing = methods.filter(method => !hasConstructor(api, method));
        return Object.freeze({ available: missing.length === 0, missing: Object.freeze(missing) });
    };

    return Object.freeze({
        passkeys: detect(CAPABILITY_METHODS.passkeys),
        giftResale: detect(CAPABILITY_METHODS.giftResale),
        giftOffers: detect(CAPABILITY_METHODS.giftOffers),
    });
}

export const telegramCapabilities = detectTelegramCapabilities();

export function giftMarketplaceAvailability(capabilities = telegramCapabilities) {
    if (capabilities.giftResale.available && capabilities.giftOffers.available) {
        return Object.freeze({
            available: true,
            label: 'Compatibilidad MTProto detectada; activación pendiente de validación segura.',
        });
    }

    return Object.freeze({
        available: false,
        label: 'Requiere una capa MTProto compatible con el mercado y las ofertas de Telegram.',
    });
}

