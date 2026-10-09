export const SMART_CHAT_FILTERS = ['all', 'users', 'groups', 'channels', 'bots', 'favorites', 'unread', 'managed'];
export const PLUS_VIEWS_KEY = 'tg_plus_smart_views';
export const PLUS_FILTER_KEY = 'tg_plus_smart_filter';
export const PLUS_SORT_KEY = 'tg_plus_chat_sort';
export const CHAT_LIST_LINES_KEY = 'tg_chat_list_lines';
export const PLUS_SETTINGS_EVENT = 'telegram-react-plus-settings';

export const normalizeChatListLines = value => (Number(value) === 3 ? 3 : 2);

export function readSmartChatPreference(key, fallback, storage = window.localStorage) {
    try {
        return storage.getItem(key) ?? fallback;
    } catch (error) {
        return fallback;
    }
}

export function writeSmartChatPreference(key, value, storage = window.localStorage) {
    try {
        storage.setItem(key, value);
        return true;
    } catch (error) {
        return false;
    }
}

export function matchesSmartChatFilter(chat, filter, stores = {}) {
    if (!chat || filter === 'all') return Boolean(chat);
    const type = chat.type || {};
    const kind = type['@type'];
    if (filter === 'favorites') return Boolean(chat.is_pinned);
    if (filter === 'unread') return Boolean(chat.is_marked_as_unread || chat.unread_count > 0);
    if (filter === 'users') {
        if (kind !== 'chatTypePrivate' && kind !== 'chatTypeSecret') return false;
        const user = stores.userStore?.get(type.user_id || type.userId);
        return !user?.type || user.type['@type'] !== 'userTypeBot';
    }
    if (filter === 'bots') {
        if (kind !== 'chatTypePrivate') return false;
        return stores.userStore?.get(type.user_id || type.userId)?.type?.['@type'] === 'userTypeBot';
    }
    if (filter === 'channels') return kind === 'chatTypeSupergroup' && Boolean(type.is_channel);
    if (filter === 'groups')
        return kind === 'chatTypeBasicGroup' || (kind === 'chatTypeSupergroup' && !type.is_channel);
    if (filter === 'managed') {
        if (kind === 'chatTypeBasicGroup') {
            const status = stores.basicGroupStore?.get(type.basic_group_id)?.status?.['@type'];
            return status === 'chatMemberStatusAdministrator' || status === 'chatMemberStatusCreator';
        }
        if (kind === 'chatTypeSupergroup') {
            const status = stores.supergroupStore?.get(type.supergroup_id)?.status?.['@type'];
            return status === 'chatMemberStatusAdministrator' || status === 'chatMemberStatusCreator';
        }
    }
    return false;
}

export function sortSmartChatIds(chatIds, getChat, mode = 'telegram') {
    const ids = [...chatIds];
    if (mode === 'telegram') return ids;
    const title = id => String(getChat(id)?.title || '').localeCompare('', undefined, { sensitivity: 'base' });
    return ids.sort((a, b) => {
        const left = getChat(a) || {};
        const right = getChat(b) || {};
        if (mode === 'name')
            return String(left.title || '').localeCompare(String(right.title || ''), undefined, {
                sensitivity: 'base',
            });
        if (mode === 'unread')
            return (
                Number(right.unread_count || right.is_marked_as_unread || 0) -
                Number(left.unread_count || left.is_marked_as_unread || 0)
            );
        if (mode === 'favorites') return Number(Boolean(right.is_pinned)) - Number(Boolean(left.is_pinned));
        return title(a) - title(b);
    });
}
