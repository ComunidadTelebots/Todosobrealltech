import React from 'react';
import ApplicationStore from '../../Stores/ApplicationStore';
import ChatStore from '../../Stores/ChatStore';
import { openChat } from '../../Actions/Client';
import {
    PLUS_INTERACTIONS_EVENT,
    addRecentChat,
    readQuickChatBarEnabled,
} from '../../Utils/PlusInteractions';
import './QuickChatBar.css';

const RECENT_CHATS_KEY = 'tg_plus_recent_chats';

const loadIds = () => {
    try {
        const value = JSON.parse(localStorage.getItem(RECENT_CHATS_KEY) || '[]');
        return Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
    } catch (_) {
        return [];
    }
};

class QuickChatBar extends React.PureComponent {
    state = { enabled: readQuickChatBarEnabled(), ids: loadIds(), activeChatId: ApplicationStore.getChatId() };

    componentDidMount() {
        ApplicationStore.on('clientUpdateChatId', this.handleChatChange);
        ChatStore.on('updateChatTitle', this.refresh);
        ChatStore.on('updateChatPhoto', this.refresh);
        window.addEventListener(PLUS_INTERACTIONS_EVENT, this.handlePreferenceChange);
        this.rememberChat(this.state.activeChatId);
    }

    componentWillUnmount() {
        ApplicationStore.off('clientUpdateChatId', this.handleChatChange);
        ChatStore.off('updateChatTitle', this.refresh);
        ChatStore.off('updateChatPhoto', this.refresh);
        window.removeEventListener(PLUS_INTERACTIONS_EVENT, this.handlePreferenceChange);
    }

    refresh = () => this.forceUpdate();
    handlePreferenceChange = () => this.setState({ enabled: readQuickChatBarEnabled() });
    handleChatChange = update => this.rememberChat(update.nextChatId || 0);

    rememberChat = chatId => {
        const ids = addRecentChat(this.state.ids, chatId);
        localStorage.setItem(RECENT_CHATS_KEY, JSON.stringify(ids));
        this.setState({ ids, activeChatId: Number(chatId) || 0 });
    };

    render() {
        const { enabled, ids, activeChatId } = this.state;
        if (!enabled) return null;
        const chats = ids.map(id => ChatStore.get(id)).filter(Boolean);
        if (!chats.length) return null;
        return (
            <nav className='quick-chat-bar' aria-label='Chats recientes'>
                {chats.map(chat => {
                    const title = chat.title || 'Chat';
                    const initials = title.trim().slice(0, 2).toUpperCase();
                    return (
                        <button key={chat.id} type='button' className={chat.id === activeChatId ? 'is-active' : ''}
                            aria-label={`Abrir ${title}`} aria-current={chat.id === activeChatId ? 'page' : undefined}
                            title={title} onClick={() => openChat(chat.id)}>
                            <span aria-hidden='true'>{initials}</span>
                            <small>{title}</small>
                        </button>
                    );
                })}
            </nav>
        );
    }
}

export default QuickChatBar;
