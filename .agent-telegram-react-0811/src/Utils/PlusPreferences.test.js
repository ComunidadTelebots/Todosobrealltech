import {
    PLUS_DEFAULTS, applyPlusAppearance, exportPlusPreferences, importPlusPreferences, readNoticeTargets,
    readPlusPreferences, setNoticeTarget, validatePlusPreferences,
} from './PlusPreferences';

const createStorage = () => {
    const values = new Map();
    return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

describe('PlusPreferences', () => {
    it('exports only the versioned allowlisted preferences', () => {
        const storage = createStorage();
        storage.setItem('telegram_session', 'secret');
        const payload = JSON.parse(exportPlusPreferences(storage));
        expect(payload.preferences).toEqual(PLUS_DEFAULTS);
        expect(JSON.stringify(payload)).not.toContain('secret');
        expect(payload).not.toHaveProperty('telegram_session');
    });

    it('rejects unknown fields, invalid values and incompatible versions', () => {
        expect(() => validatePlusPreferences({ token: 'secret' })).toThrow('no permitidos');
        expect(() => validatePlusPreferences({ avatarAction: 'javascript:' })).toThrow('avatar');
        expect(() => validatePlusPreferences({ emojiPanelSize: 'enormous' })).toThrow('emoji');
        expect(() => importPlusPreferences(JSON.stringify({ schema: 'wrong', version: 1, preferences: {} }), createStorage()))
            .toThrow('incompatible');
    });

    it('applies optional appearance without replacing the active design', () => {
        document.body.className = 'design-android design-android-v4';
        applyPlusAppearance(validatePlusPreferences({
            useSystemFont: true, emojiPanelSize: 'compact', hidePhoneNumber: true,
        }));
        expect(document.body.classList.contains('design-android-v4')).toBe(true);
        expect(document.body.classList.contains('plus-system-font')).toBe(true);
        expect(document.body.classList.contains('plus-hide-phone')).toBe(true);
        expect(document.body.dataset.plusEmojiSize).toBe('compact');
    });

    it('applies navigation preferences without replacing the active design', () => {
        document.body.className = 'design-android design-android-v12';
        applyPlusAppearance(validatePlusPreferences({
            hideBottomNavigation: true, hideBottomNavOnScroll: true,
            hideNewMessageButton: true,
        }));
        expect(document.body.classList.contains('design-android-v12')).toBe(true);
        expect(document.body.classList.contains('plus-hide-bottom-navigation')).toBe(true);
        expect(document.body.classList.contains('plus-hide-bottom-on-scroll')).toBe(true);
        expect(document.body.classList.contains('plus-hide-new-message')).toBe(true);
    });

    it('imports valid preferences without importing notification targets', () => {
        const storage = createStorage();
        const imported = importPlusPreferences(JSON.stringify({
            schema: 'telegram-react-plus-preferences', version: 1,
            preferences: { presenceAlerts: true, avatarAction: 'none' },
        }), storage);
        expect(imported.presenceAlerts).toBe(true);
        expect(readPlusPreferences(storage).avatarAction).toBe('none');
        expect(readNoticeTargets(storage)).toEqual([]);
    });

    it('stores only numeric targets and removes them explicitly', () => {
        const storage = createStorage();
        setNoticeTarget({ chatId: 10, userId: 20 }, true, storage);
        expect(readNoticeTargets(storage)).toEqual([{ chatId: 10, userId: 20 }]);
        setNoticeTarget({ chatId: 10, userId: 20 }, false, storage);
        expect(readNoticeTargets(storage)).toEqual([]);
    });
});

