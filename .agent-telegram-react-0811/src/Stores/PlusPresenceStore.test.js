import { isPrivateContactTarget } from './PlusPresenceStore';

describe('PlusPresenceStore privacy gate', () => {
    const targets = [{ chatId: 10, userId: 20 }];
    const privateChat = { type: { '@type': 'chatTypePrivate', user_id: 20 } };
    const contact = { id: 20, is_contact: true };

    it('allows only an explicitly selected private contact', () => {
        expect(isPrivateContactTarget({ chat: privateChat, user: contact, targets, chatId: 10, userId: 20 })).toBe(true);
    });

    it('rejects groups, non-contacts and users outside the allowlist', () => {
        expect(isPrivateContactTarget({ chat: { type: { '@type': 'chatTypeSupergroup' } }, user: contact, targets, chatId: 10, userId: 20 })).toBe(false);
        expect(isPrivateContactTarget({ chat: privateChat, user: { ...contact, is_contact: false }, targets, chatId: 10, userId: 20 })).toBe(false);
        expect(isPrivateContactTarget({ chat: privateChat, user: contact, targets: [], chatId: 10, userId: 20 })).toBe(false);
    });
});

