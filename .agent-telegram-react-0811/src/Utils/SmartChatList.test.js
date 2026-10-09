import {
    matchesSmartChatFilter,
    normalizeChatListLines,
    readSmartChatPreference,
    sortSmartChatIds,
    writeSmartChatPreference,
} from './SmartChatList';

const store = values => ({ get: id => values[id] });

describe('smart chat filters', () => {
    it('keeps the existing two-line layout unless three lines are explicitly selected', () => {
        expect(normalizeChatListLines()).toBe(2);
        expect(normalizeChatListLines('2')).toBe(2);
        expect(normalizeChatListLines('3')).toBe(3);
        expect(normalizeChatListLines('forged')).toBe(2);
    });
    it('survives blocked browser storage', () => {
        const blocked = {
            getItem: () => {
                throw new DOMException('blocked', 'SecurityError');
            },
            setItem: () => {
                throw new DOMException('blocked', 'SecurityError');
            },
        };
        expect(readSmartChatPreference('filter', 'all', blocked)).toBe('all');
        expect(writeSmartChatPreference('filter', 'bots', blocked)).toBe(false);
    });

    const stores = {
        userStore: store({
            1: { type: { '@type': 'userTypeRegular' } },
            2: { type: { '@type': 'userTypeBot' } },
        }),
        basicGroupStore: store({ 3: { status: { '@type': 'chatMemberStatusAdministrator' } } }),
        supergroupStore: store({ 4: { status: { '@type': 'chatMemberStatusCreator' } } }),
    };

    it('separates users and bots', () => {
        expect(matchesSmartChatFilter({ type: { '@type': 'chatTypePrivate', user_id: 1 } }, 'users', stores)).toBe(
            true,
        );
        expect(matchesSmartChatFilter({ type: { '@type': 'chatTypePrivate', user_id: 2 } }, 'users', stores)).toBe(
            false,
        );
        expect(matchesSmartChatFilter({ type: { '@type': 'chatTypePrivate', user_id: 2 } }, 'bots', stores)).toBe(true);
    });

    it('separates groups, channels and managed chats', () => {
        expect(
            matchesSmartChatFilter({ type: { '@type': 'chatTypeSupergroup', is_channel: true } }, 'channels', stores),
        ).toBe(true);
        expect(
            matchesSmartChatFilter({ type: { '@type': 'chatTypeSupergroup', is_channel: false } }, 'groups', stores),
        ).toBe(true);
        expect(
            matchesSmartChatFilter({ type: { '@type': 'chatTypeBasicGroup', basic_group_id: 3 } }, 'managed', stores),
        ).toBe(true);
        expect(
            matchesSmartChatFilter({ type: { '@type': 'chatTypeSupergroup', supergroup_id: 4 } }, 'managed', stores),
        ).toBe(true);
    });

    it('uses pinned and unread state without changing Telegram data', () => {
        expect(matchesSmartChatFilter({ is_pinned: true }, 'favorites', stores)).toBe(true);
        expect(matchesSmartChatFilter({ unread_count: 2 }, 'unread', stores)).toBe(true);
        expect(matchesSmartChatFilter({ unread_count: 0 }, 'unread', stores)).toBe(false);
    });
});

describe('smart chat sorting', () => {
    const chats = {
        1: { title: 'Zeta', unread_count: 0, is_pinned: false },
        2: { title: 'Alfa', unread_count: 5, is_pinned: false },
        3: { title: 'Beta', unread_count: 1, is_pinned: true },
    };
    const getChat = id => chats[id];

    it('keeps Telegram order by default', () => {
        expect(sortSmartChatIds([1, 2, 3], getChat, 'telegram')).toEqual([1, 2, 3]);
    });

    it('sorts by name, unread and favorites on cloned arrays', () => {
        const source = [1, 2, 3];
        expect(sortSmartChatIds(source, getChat, 'name')).toEqual([2, 3, 1]);
        expect(sortSmartChatIds(source, getChat, 'unread')).toEqual([2, 3, 1]);
        expect(sortSmartChatIds(source, getChat, 'favorites')).toEqual([3, 1, 2]);
        expect(source).toEqual([1, 2, 3]);
    });
});
