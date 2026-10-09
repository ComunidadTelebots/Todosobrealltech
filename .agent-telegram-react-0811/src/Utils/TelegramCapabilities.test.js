import { detectTelegramCapabilities, giftMarketplaceAvailability } from './TelegramCapabilities';

function apiWith(paths) {
    const api = {};
    paths.forEach(path => {
        const keys = path.split('.');
        const name = keys.pop();
        const scope = keys.reduce((value, key) => (value[key] ||= {}), api);
        scope[name] = class Request {};
    });
    return api;
}

const passkeyMethods = [
    'account.InitPasskeyRegistration', 'account.RegisterPasskey', 'account.GetPasskeys',
    'account.DeletePasskey', 'auth.InitPasskeyLogin', 'auth.FinishPasskeyLogin',
];
const marketplaceMethods = [
    'payments.GetResaleStarGifts', 'payments.UpdateStarGiftPrice',
    'payments.SendStarGiftOffer', 'payments.ResolveStarGiftOffer',
];

describe('TelegramCapabilities', () => {
    it('does not advertise partially available capabilities', () => {
        const capabilities = detectTelegramCapabilities(apiWith([
            passkeyMethods[0], marketplaceMethods[0], marketplaceMethods[2],
        ]));

        expect(capabilities.passkeys.available).toBe(false);
        expect(capabilities.giftResale.available).toBe(false);
        expect(capabilities.giftOffers.available).toBe(false);
        expect(capabilities.passkeys.missing).toContain('auth.FinishPasskeyLogin');
    });

    it('enables a capability only when every required constructor exists', () => {
        const capabilities = detectTelegramCapabilities(apiWith([...passkeyMethods, ...marketplaceMethods]));

        expect(capabilities.passkeys.available).toBe(true);
        expect(capabilities.giftResale.available).toBe(true);
        expect(capabilities.giftOffers.available).toBe(true);
        expect(giftMarketplaceAvailability(capabilities).available).toBe(true);
    });

    it('explains that the installed MTProto layer cannot expose marketplace actions', () => {
        const availability = giftMarketplaceAvailability(detectTelegramCapabilities({}));

        expect(availability.available).toBe(false);
        expect(availability.label).toContain('Requiere una capa MTProto');
    });
});

