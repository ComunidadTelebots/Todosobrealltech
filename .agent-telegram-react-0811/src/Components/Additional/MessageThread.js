import React, { Component } from 'react';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import IconButton from '@material-ui/core/IconButton';
import CircularProgress from '@material-ui/core/CircularProgress';
import TdLibController from '../../Controllers/TdLibController';
import MessageStore from '../../Stores/MessageStore';
import { getText } from '../../Utils/Message';
import { openChat } from '../../Actions/Client';
import MessageAuthor from '../Message/MessageAuthor';
import './MessageThread.css';

class MessageThread extends Component {
    constructor(props) {
        super(props);
        this.state = { open: false, chatId: 0, messageId: 0, messages: [], loading: false };
    }

    open(chatId, messageId) {
        this.setState({ open: true, chatId, messageId, messages: [], loading: true }, () => {
            this._load(chatId, messageId);
        });
    }

    close = () => this.setState({ open: false });

    openInChat = messageId => {
        openChat(this.state.chatId, messageId);
        this.close();
    };

    _load = async (chatId, messageId) => {
        try {
            const result = await TdLibController.send({
                '@type': 'getMessageThreadHistory',
                chat_id: chatId,
                message_id: messageId,
                from_message_id: 0,
                limit: 50,
                offset: 0,
            });
            const messages = result && result.messages ? result.messages : [];
            this.setState({ messages, loading: false });
        } catch (e) {
            console.error('[MessageThread] load error', e);
            this.setState({ loading: false });
        }
    };

    render() {
        const { open, messages, loading } = this.state;
        if (!open) return null;

        return (
            <div className='message-thread-overlay' onClick={this.close}>
                <div className='message-thread-panel' onClick={e => e.stopPropagation()}>
                    <div className='message-thread-header'>
                        <IconButton onClick={this.close} size='small'>
                            <ArrowBackIcon />
                        </IconButton>
                        <span className='message-thread-title'>Comments</span>
                    </div>
                    <div className='message-thread-body'>
                        {loading && (
                            <div className='message-thread-loading'>
                                <CircularProgress size={28} />
                            </div>
                        )}
                        {!loading && messages.length === 0 && (
                            <div className='message-thread-empty'>No comments yet.</div>
                        )}
                        {!loading &&
                            messages.map(msg => {
                                const text = getText(msg);
                                return (
                                    <div key={msg.id} className='message-thread-item'>
                                        <div className='message-thread-item-sender'>
                                            <MessageAuthor
                                                chatId={msg.chat_id}
                                                userId={msg.sender_user_id}
                                                openUser={Boolean(msg.sender_user_id)}
                                                openChat={!msg.sender_user_id}
                                            />
                                        </div>
                                        <div className='message-thread-item-text'>
                                            {text && text.length > 0 ? text : <em>[media]</em>}
                                        </div>
                                        <button
                                            type='button'
                                            className='message-thread-view-chat'
                                            onClick={() => this.openInChat(msg.id)}>
                                            Ver en el chat
                                        </button>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>
        );
    }
}

export default MessageThread;
