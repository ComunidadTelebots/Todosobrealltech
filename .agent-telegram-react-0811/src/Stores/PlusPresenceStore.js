import TdLibController from '../Controllers/TdLibController';
import ChatStore from './ChatStore';
import UserStore from './UserStore';
import { getUserFullName } from '../Utils/User';
import { readNoticeTargets, readPlusPreferences } from '../Utils/PlusPreferences';

export function isPrivateContactTarget({ chat, user, targets, chatId, userId }) {
    return !!chat && chat.type?.['@type'] === 'chatTypePrivate' && chat.type.user_id === userId
        && !!user?.is_contact && targets.some(item => item.chatId === chatId && item.userId === userId);
}

class PlusPresenceStore {
    constructor() {
        this.lastStatuses = new Map();
        this.lastAlerts = new Map();
        TdLibController.addListener('update', this.onUpdate);
    }

    canAlert(key, cooldown) {
        const now = Date.now();
        const previous = this.lastAlerts.get(key) || 0;
        if (now - previous < cooldown) return false;
        this.lastAlerts.set(key, now);
        return true;
    }

    notify(kind, user) {
        window.dispatchEvent(new CustomEvent('telegram-plus-notice', {
            detail: {
                kind,
                text: kind === 'typing' ? `${getUserFullName(user)} está escribiendo` : `${getUserFullName(user)} está en línea`,
            },
        }));
    }

    onUpdate = update => {
        const preferences = readPlusPreferences();
        const targets = readNoticeTargets();
        if (!targets.length) return;

        if (update['@type'] === 'updateUserStatus') {
            const userId = update.user_id;
            const current = update.status?.['@type'];
            const previous = this.lastStatuses.get(userId);
            this.lastStatuses.set(userId, current);
            if (!preferences.presenceAlerts || previous == null || current !== 'userStatusOnline' || previous === current) return;
            const target = targets.find(item => item.userId === userId);
            const chat = target && ChatStore.get(target.chatId);
            const user = UserStore.get(userId);
            if (target && isPrivateContactTarget({ chat, user, targets, chatId: target.chatId, userId })
                && this.canAlert(`presence:${userId}`, preferences.alertCooldownMs)) this.notify('presence', user);
        }

        if (update['@type'] === 'updateUserChatAction' && preferences.typingAlerts
            && update.action?.['@type'] === 'chatActionTyping') {
            const chat = ChatStore.get(update.chat_id);
            const user = UserStore.get(update.user_id);
            if (isPrivateContactTarget({ chat, user, targets, chatId: update.chat_id, userId: update.user_id })
                && this.canAlert(`typing:${update.user_id}`, preferences.alertCooldownMs)) this.notify('typing', user);
        }
    };
}

export default new PlusPresenceStore();

