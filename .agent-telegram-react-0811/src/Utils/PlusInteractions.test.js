import {
    DOUBLE_CLICK_ACTION_KEY,
    QUICK_CHAT_BAR_KEY,
    addRecentChat,
    readDoubleClickAction,
    readQuickChatBarEnabled,
    shouldIgnoreMessageDoubleClick,
} from './PlusInteractions';

const storage = values => ({ getItem: key => (key in values ? values[key] : null) });

describe('PlusInteractions', () => {
    it('keeps the existing behaviour disabled by default', () => {
        expect(readQuickChatBarEnabled(storage({}))).toBe(false);
        expect(readDoubleClickAction(storage({}))).toBe('none');
        expect(readDoubleClickAction(storage({ [DOUBLE_CLICK_ACTION_KEY]: 'unknown' }))).toBe('none');
    });

    it('reads explicit quick bar and double-click preferences', () => {
        expect(readQuickChatBarEnabled(storage({ [QUICK_CHAT_BAR_KEY]: '1' }))).toBe(true);
        expect(readDoubleClickAction(storage({ [DOUBLE_CLICK_ACTION_KEY]: 'reply' }))).toBe('reply');
    });

    it('keeps recent chats unique and bounded', () => {
        expect(addRecentChat([2, 1, 3], 1, 3)).toEqual([1, 2, 3]);
        expect(addRecentChat([2, 3, 4], 1, 3)).toEqual([1, 2, 3]);
        expect(addRecentChat([2], 0, 3)).toEqual([2]);
    });

    it('ignores links, controls and interactive media', () => {
        const root = document.createElement('div');
        const text = document.createElement('span');
        const link = document.createElement('a');
        const image = document.createElement('img');
        root.append(text, link, image);
        expect(shouldIgnoreMessageDoubleClick(text, root)).toBe(false);
        expect(shouldIgnoreMessageDoubleClick(link, root)).toBe(true);
        expect(shouldIgnoreMessageDoubleClick(image, root)).toBe(true);
        expect(shouldIgnoreMessageDoubleClick(document.createElement('span'), root)).toBe(true);
    });
});
