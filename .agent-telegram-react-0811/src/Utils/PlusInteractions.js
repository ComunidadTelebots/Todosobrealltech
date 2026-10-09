export const QUICK_CHAT_BAR_KEY = 'tg_plus_quick_chat_bar';
export const DOUBLE_CLICK_ACTION_KEY = 'tg_plus_message_double_click';
export const PLUS_INTERACTIONS_EVENT = 'telegram-plus-interactions-changed';

export const DOUBLE_CLICK_ACTIONS = ['none', 'react', 'reply', 'edit', 'save', 'copy'];

export const readQuickChatBarEnabled = storage => (storage || localStorage).getItem(QUICK_CHAT_BAR_KEY) === '1';

export const readDoubleClickAction = storage => {
    const value = (storage || localStorage).getItem(DOUBLE_CLICK_ACTION_KEY) || 'none';
    return DOUBLE_CLICK_ACTIONS.includes(value) ? value : 'none';
};

export const writePlusInteraction = (key, value, storage) => {
    (storage || localStorage).setItem(key, String(value));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PLUS_INTERACTIONS_EVENT));
};

export const shouldIgnoreMessageDoubleClick = (target, messageRoot) => {
    if (!target || !messageRoot || !messageRoot.contains(target)) return true;
    if (typeof target.closest !== 'function') return true;
    return !!target.closest(
        'a,button,input,textarea,select,option,label,[role="button"],[contenteditable="true"],' +
            'img,video,audio,canvas,iframe,.reactions-wrap,.quick-reaction-bar,.inline-keyboard,.message-media',
    );
};

export const addRecentChat = (chatIds, chatId, limit = 6) => {
    const id = Number(chatId);
    if (!Number.isFinite(id) || id === 0) return chatIds.slice(0, limit);
    return [id, ...chatIds.filter(item => Number(item) !== id)].slice(0, limit);
};
