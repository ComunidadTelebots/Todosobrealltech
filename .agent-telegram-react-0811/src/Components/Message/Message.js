/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component } from 'react';
import classNames from 'classnames';
import { compose } from 'recompose';
import { withTranslation } from 'react-i18next';
import withStyles from '@material-ui/core/styles/withStyles';
import CheckMarkIcon from '@material-ui/icons/Check';
import Reply from './Reply';
import Forward from './Forward';
import Meta from './Meta';
import MessageStatus from './MessageStatus';
import MessageAuthor from './MessageAuthor';
import UserTile from '../Tile/UserTile';
import ChatTile from '../Tile/ChatTile';
import UnreadSeparator from './UnreadSeparator';
import WebPage from './Media/WebPage';
import Reactions from './Reactions';
import InlineKeyboard from './InlineKeyboard';
import CommentsButton from './CommentsButton';
import FactCheck from './FactCheck';
import SeenBy from './SeenBy';
import QuickReactionBar from './QuickReactionBar';
import {
    getEmojiMatches,
    getText,
    getMedia,
    getUnread,
    getWebPage,
    openMedia,
    showMessageForward,
    canMessageBeEdited,
    isMessagePinned,
} from '../../Utils/Message';
import { canPinMessages, canSendMessages, isGroupChat, isAdminInChat } from '../../Utils/Chat';
import {
    openUser,
    openChat,
    selectMessage,
    openReply,
    forwardMessages,
    replyMessage,
    editMessage,
    clearSelection,
    deleteMessages,
} from '../../Actions/Client';
import MessageStore from '../../Stores/MessageStore';
import UserStore from '../../Stores/UserStore';
import TdLibController from '../../Controllers/TdLibController';
import { saveMedia } from '../../Utils/File';
import MessageShowMore from './MessageShowMore';
import './Message.css';
import Popover from '@material-ui/core/Popover';
import Snackbar from '@material-ui/core/Snackbar';
import MenuList from '@material-ui/core/MenuList';
import MenuItem from '@material-ui/core/MenuItem';
import InputBase from '@material-ui/core/InputBase';
import ChatStore from '../../Stores/ChatStore';
import { pinMessage, unpinMessage } from '../../Actions/Message';
import { withRestoreRef, withSaveRef } from '../../Utils/HOC';
import { readDoubleClickAction, shouldIgnoreMessageDoubleClick } from '../../Utils/PlusInteractions';

const styles = theme => ({
    message: {
        backgroundColor: 'transparent',
    },
    menuListRoot: {
        minWidth: 150,
    },
    messageAuthorColor: {
        color: theme.palette.primary.main,
    },
    messageSelected: {
        backgroundColor: theme.palette.primary.main + '22',
    },
    messageSelectTick: {
        background: theme.palette.primary.main,
        color: 'white',
    },
    '@keyframes highlighted': {
        from: { backgroundColor: theme.palette.primary.main + '22' },
        to: { backgroundColor: 'transparent' },
    },
    messageHighlighted: {
        animation: '$highlighted 4s ease-out',
    },
});

// Cache en memoria: `${chatId}:${messageId}:${langCode}` → texto traducido
const translationCache = new Map();

// Lista completa de idiomas soportados por messages.translateText (equivalente a Web A)
const SUPPORTED_TRANSLATION_LANGUAGES = [
    // Oficiales
    'en',
    'ar',
    'be',
    'ca',
    'zh',
    'nl',
    'fr',
    'de',
    'id',
    'it',
    'ja',
    'ko',
    'pl',
    'pt',
    'ru',
    'es',
    'uk',
    // No oficiales
    'af',
    'sq',
    'am',
    'hy',
    'az',
    'eu',
    'bn',
    'bs',
    'bg',
    'ceb',
    'zh-CN',
    'zh-TW',
    'co',
    'hr',
    'cs',
    'da',
    'eo',
    'et',
    'fi',
    'fy',
    'gl',
    'ka',
    'el',
    'gu',
    'ht',
    'ha',
    'haw',
    'he',
    'hi',
    'hmn',
    'hu',
    'is',
    'ig',
    'ga',
    'jv',
    'kn',
    'kk',
    'km',
    'rw',
    'ku',
    'ky',
    'lo',
    'la',
    'lv',
    'lt',
    'lb',
    'mk',
    'mg',
    'ms',
    'ml',
    'mt',
    'mi',
    'mr',
    'mn',
    'my',
    'ne',
    'no',
    'ny',
    'or',
    'ps',
    'fa',
    'pa',
    'ro',
    'sm',
    'gd',
    'sr',
    'st',
    'sn',
    'sd',
    'si',
    'sk',
    'sl',
    'so',
    'su',
    'sw',
    'sv',
    'tl',
    'tg',
    'ta',
    'tt',
    'te',
    'th',
    'tr',
    'tk',
    'ur',
    'ug',
    'uz',
    'vi',
    'cy',
    'xh',
    'yi',
    'yo',
    'zu',
];

// Nombres de idioma usando Intl.DisplayNames con fallback a código
const _displayNamesCache = new Map();
function getLangLabel(code, uiLocale) {
    const key = `${code}:${uiLocale}`;
    if (_displayNamesCache.has(key)) return _displayNamesCache.get(key);
    let label = code;
    try {
        const dn = new Intl.DisplayNames([uiLocale, 'en'], { type: 'language' });
        const name = dn.of(code);
        label = name && name !== code ? name : code;
    } catch (_) {}
    _displayNamesCache.set(key, label);
    return label;
}

// Lista de idiomas precalculada (en locale UI del navegador) para el picker
function buildLangList(uiLocale) {
    return SUPPORTED_TRANSLATION_LANGUAGES.map(code => ({
        code,
        label: getLangLabel(code, uiLocale),
    })).sort((a, b) => a.label.localeCompare(b.label, uiLocale));
}

class Message extends Component {
    constructor(props) {
        super(props);

        const { chatId, messageId } = this.props;
        if (process.env.NODE_ENV !== 'production') {
            this.state = {
                message: MessageStore.get(chatId, messageId),
                emojiMatches: getEmojiMatches(chatId, messageId),
                selected: false,
                highlighted: false,
                contextMenu: false,
                left: 0,
                top: 0,
                translationText: null,
                translating: false,
                translationVisible: true,
                langMenu: false,
                langSearch: '',
                hovered: false,
                copiedToast: false,
            };
        } else {
            this.state = {
                emojiMatches: getEmojiMatches(chatId, messageId),
                selected: false,
                highlighted: false,
                contextMenu: false,
                left: 0,
                top: 0,
                translationText: null,
                translating: false,
                translationVisible: true,
                langMenu: false,
                langSearch: '',
                hovered: false,
                copiedToast: false,
            };
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        const {
            theme,
            chatId,
            messageId,
            sendingState,
            showUnreadSeparator,
            showTail,
            showTitle,
            showAuthor,
        } = this.props;
        const {
            contextMenu,
            selected,
            highlighted,
            emojiMatches,
            translationText,
            translating,
            translationVisible,
            langMenu,
            langSearch,
            hovered,
        } = this.state;

        if (nextProps.theme !== theme) {
            // console.log('Message.shouldComponentUpdate true');
            return true;
        }

        if (nextProps.chatId !== chatId) {
            // console.log('Message.shouldComponentUpdate true');
            return true;
        }

        if (nextProps.messageId !== messageId) {
            // console.log('Message.shouldComponentUpdate true');
            return true;
        }

        if (nextProps.sendingState !== sendingState) {
            // console.log('Message.shouldComponentUpdate true');
            return true;
        }

        if (nextProps.showUnreadSeparator !== showUnreadSeparator) {
            // console.log('Message.shouldComponentUpdate true');
            return true;
        }

        if (nextProps.showTail !== showTail) {
            // console.log('Message.shouldComponentUpdate true');
            return true;
        }

        if (nextProps.showTitle !== showTitle) {
            // console.log('Message.shouldComponentUpdate true');
            return true;
        }

        if (nextProps.showAuthor !== showAuthor) {
            return true;
        }

        if (nextState.contextMenu !== contextMenu) {
            // console.log('Message.shouldComponentUpdate true');
            return true;
        }

        if (nextState.selected !== selected) {
            // console.log('Message.shouldComponentUpdate true');
            return true;
        }

        if (nextState.highlighted !== highlighted) {
            // console.log('Message.shouldComponentUpdate true');
            return true;
        }

        if (nextState.emojiMatches !== emojiMatches) {
            // console.log('Message.shouldComponentUpdate true');
            return true;
        }

        if (nextState.translationText !== translationText) return true;
        if (nextState.translating !== translating) return true;
        if (nextState.translationVisible !== translationVisible) return true;
        if (nextState.langSearch !== langSearch) return true;
        if (nextState.hovered !== hovered) return true;

        // console.log('Message.shouldComponentUpdate false');
        return false;
    }

    componentDidMount() {
        MessageStore.on('clientUpdateMessageHighlighted', this.onClientUpdateMessageHighlighted);
        MessageStore.on('clientUpdateMessageSelected', this.onClientUpdateMessageSelected);
        MessageStore.on('clientUpdateClearSelection', this.onClientUpdateClearSelection);
        MessageStore.on('updateMessageContent', this.onUpdateMessageContent);
        MessageStore.on('updateMessageEdited', this.onUpdateMessageEdited);
        MessageStore.on('updateMessageViews', this.onUpdateMessageViews);
    }

    componentWillUnmount() {
        MessageStore.off('clientUpdateMessageHighlighted', this.onClientUpdateMessageHighlighted);
        MessageStore.off('clientUpdateMessageSelected', this.onClientUpdateMessageSelected);
        MessageStore.off('clientUpdateClearSelection', this.onClientUpdateClearSelection);
        MessageStore.off('updateMessageContent', this.onUpdateMessageContent);
        MessageStore.off('updateMessageEdited', this.onUpdateMessageEdited);
        MessageStore.off('updateMessageViews', this.onUpdateMessageViews);
    }

    onClientUpdateClearSelection = update => {
        if (!this.state.selected) return;

        this.setState({ selected: false });
    };

    onClientUpdateMessageHighlighted = update => {
        const { chatId, messageId } = this.props;
        const { selected, highlighted } = this.state;

        if (selected) return;

        if (chatId === update.chatId && messageId === update.messageId) {
            if (highlighted) {
                this.setState({ highlighted: false }, () => {
                    setTimeout(() => {
                        this.setState({ highlighted: true });
                    }, 0);
                });
            } else {
                this.setState({ highlighted: true });
            }
        } else if (highlighted) {
            this.setState({ highlighted: false });
        }
    };

    onClientUpdateMessageSelected = update => {
        const { chatId, messageId } = this.props;
        const { selected } = update;

        if (chatId === update.chatId && messageId === update.messageId) {
            this.setState({ selected, highlighted: false });
        }
    };

    onUpdateMessageEdited = update => {
        const { chat_id, message_id } = update;
        const { chatId, messageId } = this.props;

        if (chatId === chat_id && messageId === message_id) {
            this.forceUpdate();
        }
    };

    onUpdateMessageViews = update => {
        const { chat_id, message_id } = update;
        const { chatId, messageId } = this.props;

        if (chatId === chat_id && messageId === message_id) {
            this.forceUpdate();
        }
    };

    onUpdateMessageContent = update => {
        const { chat_id, message_id } = update;
        const { chatId, messageId } = this.props;
        const { emojiMatches } = this.state;

        if (chatId !== chat_id) return;
        if (messageId !== message_id) return;

        const newEmojiMatches = getEmojiMatches(chatId, messageId);
        if (newEmojiMatches !== emojiMatches) {
            this.setState({ emojiMatches: getEmojiMatches(chatId, messageId) });
        } else {
            this.forceUpdate();
        }
    };

    handleSelectUser = userId => {
        openUser(userId, true);
    };

    handleSelectChat = chatId => {
        openChat(chatId, null, true);
    };

    handleSelection = () => {
        if (!this.mouseDown) return;

        const selection = window.getSelection().toString();
        if (selection) return;

        const { chatId, messageId } = this.props;

        const selected = !MessageStore.selectedItems.has(`chatId=${chatId}_messageId=${messageId}`);
        selectMessage(chatId, messageId, selected);
    };

    handleDateClick = e => {
        e.preventDefault();
        e.stopPropagation();

        const { chatId, messageId } = this.props;

        const message = MessageStore.get(chatId, messageId);

        const canBeReplied = canSendMessages(chatId);
        if (canBeReplied) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateReply',
                chatId: chatId,
                messageId: messageId,
            });
            return;
        }

        const canBeForwarded = message && message.can_be_forwarded;
        if (canBeForwarded) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateForward',
                info: {
                    chatId: chatId,
                    messageIds: [messageId],
                },
            });
        }
    };

    openMedia = event => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const { chatId, messageId } = this.props;

        openMedia(chatId, messageId);
    };

    handleAnimationEnd = () => {
        this.setState({ highlighted: false });
    };

    handleMouseDown = () => {
        this.mouseDown = true;
    };

    handleMouseOver = () => {
        this.mouseDown = false;
        if (!this.state.hovered) this.setState({ hovered: true });
    };

    handleMouseOut = () => {
        this.mouseOut = false;
        if (this.state.hovered) this.setState({ hovered: false });
    };

    handleReplyClick = () => {
        const { chatId, messageId } = this.props;
        openReply(chatId, messageId);
    };

    handleContextMenu = async event => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const { contextMenu } = this.state;

        if (contextMenu) {
            this.setState({ contextMenu: false });
        } else {
            if (MessageStore.selectedItems.size > 1) {
                return;
            }

            const left = event.clientX;
            const top = event.clientY;

            // capture text selection for "Reply with quote"
            const sel = window.getSelection();
            const selText = sel ? sel.toString().trim() : '';
            if (selText && sel.rangeCount > 0) {
                this._selectionText = selText;
                // estimate offset: characters before selection in the message text
                const range = sel.getRangeAt(0);
                this._selectionOffset = range.startOffset || 0;
            } else {
                this._selectionText = '';
                this._selectionOffset = 0;
            }

            this.setState({
                contextMenu: true,
                left,
                top,
            });
        }
    };

    handleCloseContextMenu = event => {
        if (event) {
            event.stopPropagation();
        }

        this.setState({ contextMenu: false });
    };

    handleReply = event => {
        const { chatId, messageId } = this.props;

        clearSelection();
        this.handleCloseContextMenu(event);

        replyMessage(chatId, messageId);
    };

    handleReplyWithQuote = event => {
        const { chatId, messageId } = this.props;
        const sel = window.getSelection();
        const quoteText = sel && sel.toString().trim();
        const quoteOffset = quoteText ? this._selectionOffset || 0 : 0;

        clearSelection();
        this.handleCloseContextMenu(event);

        replyMessage(chatId, messageId, quoteText || null, quoteOffset);
    };

    handlePin = event => {
        const { chatId, messageId } = this.props;

        clearSelection();
        this.handleCloseContextMenu(event);

        if (isMessagePinned(chatId, messageId)) {
            unpinMessage(chatId);
        } else {
            pinMessage(chatId, messageId);
        }
    };

    handleForward = event => {
        const { chatId, messageId } = this.props;

        this.handleCloseContextMenu(event);

        forwardMessages(chatId, [messageId]);
    };

    handleEdit = event => {
        const { chatId, messageId } = this.props;

        clearSelection();
        this.handleCloseContextMenu(event);

        editMessage(chatId, messageId);
    };

    handleSelect = event => {
        const { chatId, messageId } = this.props;

        this.handleCloseContextMenu(event);

        selectMessage(chatId, messageId, true);
    };

    handleDelete = event => {
        const { chatId, messageId } = this.props;

        this.handleCloseContextMenu(event);

        deleteMessages(chatId, [messageId]);
    };

    handleCopy = event => {
        const { chatId, messageId } = this.props;
        this.handleCloseContextMenu(event);

        const message = MessageStore.get(chatId, messageId);
        if (!message) return;

        const { content } = message;
        if (!content) return;
        let text = '';
        if (content['@type'] === 'messageText') {
            text = content.text?.text || '';
        } else if (content.caption) {
            text = content.caption.text || '';
        }

        if (text && navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => {});
            this.setState({ copiedToast: true });
        }
    };

    handleMessageDoubleClick = event => {
        if (shouldIgnoreMessageDoubleClick(event.target, event.currentTarget)) return;
        const action = readDoubleClickAction();
        if (action === 'none') return;

        const { chatId, messageId } = this.props;
        const message = MessageStore.get(chatId, messageId);
        if (!message) return;
        event.preventDefault();
        event.stopPropagation();

        if (action === 'react') {
            TdLibController.send({ '@type': 'sendMessageReaction', chat_id: chatId, message_id: messageId, reaction: '👍' });
        } else if (action === 'reply' && canSendMessages(chatId)) {
            this.handleReply(event);
        } else if (action === 'edit' && canMessageBeEdited(chatId, messageId)) {
            this.handleEdit(event);
        } else if (action === 'save' && message.can_be_forwarded) {
            this.handleSaveToSavedMessages(event);
        } else if (action === 'copy') {
            this.handleCopy(event);
        }
    };

    handleTranslate = event => {
        this.handleCloseContextMenu(event);
        this.setState({ langMenu: true, langSearch: '' });
    };

    handleCloseLangMenu = () => {
        this.setState({ langMenu: false, langSearch: '' });
    };

    handleLangSearchChange = event => {
        this.setState({ langSearch: event.target.value });
    };

    handleTranslateTo = async langCode => {
        this.setState({ langMenu: false });
        const { chatId, messageId, t } = this.props;

        const cacheKey = `${chatId}:${messageId}:${langCode}`;
        if (translationCache.has(cacheKey)) {
            this.setState({ translationText: translationCache.get(cacheKey), translationVisible: true });
            return;
        }

        const message = MessageStore.get(chatId, messageId);
        if (!message) return;

        this.setState({ translating: true, translationText: null, translationVisible: true });
        try {
            let result;
            const hasValidId = message.id && message.id > 0 && chatId;
            if (hasValidId) {
                result = await TdLibController.send({
                    '@type': 'translateText',
                    chat_id: chatId,
                    message_ids: [messageId],
                    to_language_code: langCode,
                });
            } else {
                const { content } = message;
                let text = '';
                if (content?.['@type'] === 'messageText') {
                    text = content.text?.text || '';
                } else if (content?.caption) {
                    text = content.caption.text || '';
                }
                if (!text) {
                    this.setState({ translating: false });
                    return;
                }
                result = await TdLibController.send({
                    '@type': 'translateText',
                    text,
                    to_language_code: langCode,
                });
            }
            const translated = result?.text?.[0]?.text?.text || result?.text?.text || result?.text || result;
            const translationText = typeof translated === 'string' ? translated : String(translated ?? '');
            translationCache.set(cacheKey, translationText);
            this.setState({ translating: false, translationText });
        } catch (e) {
            this.setState({ translating: false, translationText: t('TranslationUnavailable') });
        }
    };

    handleReport = async event => {
        const { chatId, messageId } = this.props;
        this.handleCloseContextMenu(event);
        try {
            await TdLibController.send({
                '@type': 'reportChat',
                chat_id: chatId,
                message_ids: [messageId],
                reason: { '@type': 'chatReportReasonSpam' },
                text: '',
            });
        } catch (e) {
            console.warn('[Message] reportChat error', e);
        }
    };

    handleReplyInPrivate = async event => {
        const { chatId, messageId } = this.props;
        const message = MessageStore.get(chatId, messageId);
        const userId = message?.sender_user_id;
        this.handleCloseContextMenu(event);
        if (!userId) return;
        try {
            const chat = await TdLibController.send({ '@type': 'createPrivateChat', user_id: userId, force: true });
            if (chat) {
                openChat(chat.id);
            }
        } catch (e) {
            console.warn('[Message] replyInPrivate error', e);
        }
    };

    handleMarkAsRead = async event => {
        const { chatId, messageId } = this.props;
        this.handleCloseContextMenu(event);
        try {
            await TdLibController.send({
                '@type': 'viewMessages',
                chat_id: chatId,
                message_ids: [messageId],
                force_read: true,
            });
        } catch {}
    };

    handleSaveToSavedMessages = async event => {
        const { chatId, messageId } = this.props;
        this.handleCloseContextMenu(event);
        try {
            const myId = (await TdLibController.send({ '@type': 'getMe' })).id;
            const saved = await TdLibController.send({ '@type': 'createPrivateChat', user_id: myId, force: true });
            await TdLibController.send({
                '@type': 'forwardMessages',
                chat_id: saved.id,
                from_chat_id: chatId,
                message_ids: [messageId],
                disable_notifications: true,
                from_background: false,
                as_album: false,
            });
        } catch (e) {
            console.warn('[Message] saveToSavedMessages error', e);
        }
    };

    handleDownloadMedia = event => {
        const { chatId, messageId } = this.props;
        const message = MessageStore.get(chatId, messageId);
        this.handleCloseContextMenu(event);
        if (!message) return;
        const content = message.content;
        if (!content) return;
        const mediaTypes = [
            'messageDocument',
            'messagePhoto',
            'messageVideo',
            'messageAnimation',
            'messageAudio',
            'messageVoiceNote',
            'messageVideoNote',
        ];
        if (!mediaTypes.includes(content['@type'])) return;
        const mediaKey = content['@type'].replace('message', '').toLowerCase();
        const media =
            content[mediaKey] ||
            content.document ||
            content.photo ||
            content.video ||
            content.animation ||
            content.audio ||
            content.voice_note ||
            content.video_note;
        if (media) saveMedia(media, message);
    };

    handleBlockUser = async event => {
        const { chatId, messageId } = this.props;
        const message = MessageStore.get(chatId, messageId);
        const userId = message?.sender_user_id;
        this.handleCloseContextMenu(event);
        if (!userId) return;
        try {
            await TdLibController.send({ '@type': 'blockUser', user_id: userId });
        } catch (e) {
            console.warn('[Message] blockUser error', e);
        }
    };

    handleBanUser = async event => {
        const { chatId, messageId } = this.props;
        const message = MessageStore.get(chatId, messageId);
        const userId = message?.sender_id?.user_id || message?.sender_user_id;
        this.handleCloseContextMenu(event);
        if (!userId) return;
        try {
            await TdLibController.send({
                '@type': 'setChatMemberStatus',
                chat_id: chatId,
                member_id: { '@type': 'messageSenderUser', user_id: userId },
                status: { '@type': 'chatMemberStatusBanned', banned_until_date: 0 },
            });
        } catch (e) {
            console.warn('[Message] banUser error', e);
        }
    };

    handleDeleteAllFromUser = async event => {
        const { chatId, messageId } = this.props;
        const message = MessageStore.get(chatId, messageId);
        const userId = message?.sender_id?.user_id || message?.sender_user_id;
        this.handleCloseContextMenu(event);
        if (!userId) return;
        try {
            await TdLibController.send({
                '@type': 'deleteChatMessagesBySender',
                chat_id: chatId,
                sender_id: { '@type': 'messageSenderUser', user_id: userId },
            });
        } catch (e) {
            console.warn('[Message] deleteAllFromUser error', e);
        }
    };

    handleViewMessageInfo = async event => {
        const { chatId, messageId } = this.props;
        this.handleCloseContextMenu(event);
        try {
            const result = await TdLibController.send({
                '@type': 'getMessageViewers',
                chat_id: chatId,
                message_id: messageId,
            });
            const viewers = result?.users || result?.members || [];
            const names = viewers.map(v => v.first_name || v.username || v.id).join(', ');
            alert(`Visto por ${viewers.length} usuario(s):\n${names || '-'}`);
        } catch (e) {
            console.warn('[Message] getMessageViewers error', e);
        }
    };

    handleShowInChat = event => {
        const { chatId, messageId } = this.props;
        const message = MessageStore.get(chatId, messageId);
        this.handleCloseContextMenu(event);
        const origin = message?.forward_info?.origin;
        if (!origin) return;
        if (origin['@type'] === 'messageForwardOriginChannel') {
            openChat(origin.chat_id, origin.message_id);
        } else if (
            origin['@type'] === 'messageForwardOriginUser' ||
            origin['@type'] === 'messageForwardOriginHiddenUser'
        ) {
            const userId = origin.sender_user_id;
            if (userId) openChat(userId > 0 ? userId : -userId);
        }
    };

    handleCopyLink = async event => {
        const { chatId, messageId } = this.props;
        this.handleCloseContextMenu(event);
        try {
            const result = await TdLibController.send({
                '@type': 'getMessageLink',
                chat_id: chatId,
                message_id: messageId,
            });
            if (result?.link) {
                await navigator.clipboard.writeText(result.link);
                this.setState({ copiedToast: true });
            }
        } catch (e) {
            console.warn('[Message] getMessageLink error', e);
        }
    };

    render() {
        // console.log('[m] render', this.props.messageId);
        const { t, classes, chatId, messageId, showUnreadSeparator, showTail, showTitle, showAuthor } = this.props;
        const {
            emojiMatches,
            selected,
            highlighted,
            contextMenu,
            left,
            top,
            translationText,
            translating,
            translationVisible,
            langMenu,
            langSearch,
            hovered,
            copiedToast,
        } = this.state;

        const message = MessageStore.get(chatId, messageId);
        if (!message) return <div>[empty message]</div>;

        const {
            is_outgoing,
            sending_state,
            views,
            date,
            edit_date,
            reply_to_message_id,
            forward_info,
            sender_user_id,
        } = message;

        const showForward = showMessageForward(chatId, messageId);
        const textNodes = getText(message);
        const rawText = message.content?.text?.text || message.content?.caption?.text || '';
        const senderUserId = message.sender_id?.user_id || message.sender_user_id;
        const senderUser = senderUserId ? UserStore.get(senderUserId) : null;
        const isBot = !!(senderUser && senderUser.type && senderUser.type['@type'] === 'userTypeBot');
        const text =
            isBot && rawText.length > 1024 ? (
                <MessageShowMore rawText={rawText}>{textNodes}</MessageShowMore>
            ) : (
                textNodes
            );
        const hasTitle = showTitle || showAuthor || showForward || Boolean(reply_to_message_id);
        const hasCaption = text !== null && text.length > 0;
        const webPage = getWebPage(message);
        const media = getMedia(message, this.openMedia, hasTitle, hasCaption);
        this.unread = getUnread(message);

        const isIncomingGroup = !is_outgoing && isGroupChat(chatId);
        let tile = null;
        if (showTail && !is_outgoing) {
            tile = sender_user_id ? (
                <UserTile userId={sender_user_id} onSelect={this.handleSelectUser} small />
            ) : (
                <ChatTile chatId={chatId} onSelect={this.handleSelectChat} small />
            );
        }

        const messageClassName = classNames('message', classes.message, {
            'message-selected': selected,
            [classes.messageSelected]: selected,
            [classes.messageHighlighted]: highlighted && !selected,
            'message-short': is_outgoing ? !showTail : !tile,
            'message-outgoing': is_outgoing,
            'message-incoming-group': isIncomingGroup,
        });

        const meta = <Meta date={date} editDate={edit_date} views={views} onDateClick={this.handleDateClick} />;

        const canBeReplied = canSendMessages(chatId);
        const canBePinned = canPinMessages(chatId);
        const isPinned = isMessagePinned(chatId, messageId);
        const canBeForwarded = message.can_be_forwarded;
        const canBeDeleted = message.can_be_deleted_only_for_self || message.can_be_deleted_for_all_users;
        const canBeSelected = !MessageStore.hasSelectedMessage(chatId, messageId);
        const canBeEdited = canMessageBeEdited(chatId, messageId);
        const contentType = message.content ? message.content['@type'] : null;
        const canBeCopied =
            contentType === 'messageText'
                ? !!(message.content.text && message.content.text.text)
                : !!(message.content && message.content.caption && message.content.caption.text);
        const canBeTranslated = canBeCopied;
        const isOutgoingGroup = is_outgoing && isGroupChat(chatId);
        const canBeReported = !message.is_outgoing;
        const canBeBlocked = !message.is_outgoing && !!message.sender_user_id;
        const canCopyLink = !message.is_outgoing;
        const forwardOriginType = message.forward_info?.origin?.['@type'];
        const canShowInChat = !!forwardOriginType && forwardOriginType === 'messageForwardOriginChannel';
        const canReplyInPrivate = !message.is_outgoing && !!message.sender_user_id && isGroupChat(chatId);
        const canBeSaved = message.can_be_forwarded;
        const canBeMarkedAsRead = !message.is_outgoing && message.id > 0 && message.contains_unread_mention;
        const isAdmin = isAdminInChat(chatId);
        const canBanUser = isAdmin && !message.is_outgoing && !!senderUserId && isGroupChat(chatId);
        const canDeleteAllFromUser = canBanUser;
        const canViewInfo = message.is_outgoing && isGroupChat(chatId);
        const downloadableTypes = [
            'messageDocument',
            'messagePhoto',
            'messageVideo',
            'messageAnimation',
            'messageAudio',
            'messageVoiceNote',
            'messageVideoNote',
        ];
        const canDownload = downloadableTypes.includes(contentType);
        const firstUrl = (() => {
            const entities = message.content?.text?.entities || message.content?.caption?.entities || [];
            const urlEntity = entities.find(e => e.type?.['@type'] === 'textEntityTypeUrl');
            if (urlEntity) {
                const txt = message.content?.text?.text || message.content?.caption?.text || '';
                return txt.slice(urlEntity.offset, urlEntity.offset + urlEntity.length);
            }
            return null;
        })();
        const isScheduled = !!message.scheduling_state;
        const showQuickReactions = hovered && !selected && !contextMenu && message.can_be_forwarded;
        const withBubble = contentType !== 'messageSticker' && contentType !== 'messageVideoNote';

        return (
            <div
                className={messageClassName}
                onMouseOver={this.handleMouseOver}
                onMouseOut={this.handleMouseOut}
                onMouseDown={this.handleMouseDown}
                onClick={this.handleSelection}
                onDoubleClick={this.handleMessageDoubleClick}
                onAnimationEnd={this.handleAnimationEnd}
                onContextMenu={this.handleContextMenu}>
                {showUnreadSeparator && <UnreadSeparator />}
                <div className='message-wrapper' style={{ position: 'relative' }}>
                    {showQuickReactions && (
                        <QuickReactionBar
                            chatId={chatId}
                            messageId={messageId}
                            onClose={() => this.setState({ hovered: false })}
                        />
                    )}
                    <div className='message-left-padding'>
                        <CheckMarkIcon className={classNames('message-select-tick', classes.messageSelectTick)} />
                        {/*{this.unread && (*/}
                        {/*    <MessageStatus chatId={chatId} messageId={messageId} sendingState={sending_state} />*/}
                        {/*)}*/}
                    </div>
                    {tile}
                    <div
                        className={classNames('message-content', {
                            'message-bubble': withBubble,
                            'message-bubble-out': withBubble && is_outgoing,
                        })}>
                        <div className='message-title'>
                            {(showAuthor || (showTitle && !showForward)) && (
                                <MessageAuthor chatId={chatId} openChat userId={sender_user_id} openUser />
                            )}
                            {showForward && <Forward forwardInfo={forward_info} />}
                            {showTitle && meta}
                        </div>
                        {Boolean(reply_to_message_id) && (
                            <Reply
                                chatId={chatId}
                                messageId={reply_to_message_id}
                                quoteText={message.reply_to?.quote?.text || null}
                                onClick={this.handleReplyClick}
                            />
                        )}
                        {media}
                        <div
                            className={classNames('message-text', {
                                'message-text-1emoji': emojiMatches === 1,
                                'message-text-2emoji': emojiMatches === 2,
                                'message-text-3emoji': emojiMatches === 3,
                            })}>
                            {text}
                        </div>
                        {webPage && <WebPage chatId={chatId} messageId={messageId} openMedia={this.openMedia} />}
                        {translating && (
                            <div className='message-translation message-translation-loading'>{t('Translate')}…</div>
                        )}
                        {translationText && translationVisible && (
                            <div className='message-translation'>
                                <span className='message-translation-text'>{translationText}</span>
                                <button
                                    type='button'
                                    className='message-translation-toggle'
                                    onClick={() => this.setState({ translationVisible: false })}>
                                    {t('ShowOriginal')}
                                </button>
                            </div>
                        )}
                        {translationText && !translationVisible && (
                            <button
                                type='button'
                                className='message-translation-toggle message-translation-show'
                                onClick={() => this.setState({ translationVisible: true })}>
                                {t('Translate')} ↩
                            </button>
                        )}
                        {isScheduled && <div className='message-scheduled-badge'>🕐 Programado</div>}
                        {message.effect_id && (
                            <span className='message-effect-indicator' title={`Effect: ${message.effect_id}`}>
                                ✨
                            </span>
                        )}
                        {message.fact_check && <FactCheck factCheck={message.fact_check} />}
                        <Reactions chatId={chatId} messageId={messageId} />
                        {isOutgoingGroup && <SeenBy chatId={chatId} messageId={messageId} />}
                        {message.interaction_info && message.interaction_info.reply_info != null && (
                            <CommentsButton
                                replyCount={message.interaction_info.reply_info.reply_count || 0}
                                onClick={() => {
                                    if (window._messageThreadRef) {
                                        window._messageThreadRef.open(chatId, messageId);
                                    }
                                }}
                            />
                        )}
                        {message.reply_markup && (
                            <InlineKeyboard chatId={chatId} messageId={messageId} replyMarkup={message.reply_markup} />
                        )}
                        {/*{!showTitle && meta}*/}
                    </div>
                    {/*{!showTitle && meta}*/}
                    {/*{showTail&&<div>tail</div>}*/}
                </div>
                <Popover
                    open={contextMenu}
                    onClose={this.handleCloseContextMenu}
                    anchorReference='anchorPosition'
                    anchorPosition={{ top, left }}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    onMouseDown={e => e.stopPropagation()}>
                    <MenuList classes={{ root: classes.menuListRoot }} onClick={e => e.stopPropagation()}>
                        {canBeReplied && <MenuItem onClick={this.handleReply}>{t('Reply')}</MenuItem>}
                        {canBeReplied && this._selectionText && (
                            <MenuItem onClick={this.handleReplyWithQuote}>{t('ReplyWithQuote')}</MenuItem>
                        )}
                        {canBeCopied && <MenuItem onClick={this.handleCopy}>{t('Copy')}</MenuItem>}
                        {canBePinned && (
                            <MenuItem onClick={this.handlePin}>{isPinned ? t('Unpin') : t('Pin')}</MenuItem>
                        )}
                        {canBeSelected && <MenuItem onClick={this.handleSelect}>{t('Select')}</MenuItem>}
                        {canBeForwarded && <MenuItem onClick={this.handleForward}>{t('Forward')}</MenuItem>}
                        {canBeEdited && <MenuItem onClick={this.handleEdit}>{t('Edit')}</MenuItem>}
                        {canBeDeleted && <MenuItem onClick={this.handleDelete}>{t('Delete')}</MenuItem>}
                        {canBeTranslated && <MenuItem onClick={this.handleTranslate}>{t('TranslateMessage')}</MenuItem>}
                        {canBeReported && <MenuItem onClick={this.handleReport}>{t('ReportMessage')}</MenuItem>}
                        {canCopyLink && <MenuItem onClick={this.handleCopyLink}>{t('CopyMessageLink')}</MenuItem>}
                        {canReplyInPrivate && (
                            <MenuItem onClick={this.handleReplyInPrivate}>{t('ReplyInPrivate')}</MenuItem>
                        )}
                        {canBeBlocked && <MenuItem onClick={this.handleBlockUser}>{t('BlockUser')}</MenuItem>}
                        {canBanUser && <MenuItem onClick={this.handleBanUser}>Banear usuario</MenuItem>}
                        {canDeleteAllFromUser && (
                            <MenuItem onClick={this.handleDeleteAllFromUser}>Eliminar todos sus mensajes</MenuItem>
                        )}
                        {canViewInfo && <MenuItem onClick={this.handleViewMessageInfo}>Info del mensaje</MenuItem>}
                        {canDownload && <MenuItem onClick={this.handleDownloadMedia}>Descargar</MenuItem>}
                        {canShowInChat && <MenuItem onClick={this.handleShowInChat}>{t('ShowInChat')}</MenuItem>}
                        {canBeSaved && (
                            <MenuItem onClick={this.handleSaveToSavedMessages}>Guardar en Mensajes Guardados</MenuItem>
                        )}
                        {canBeMarkedAsRead && <MenuItem onClick={this.handleMarkAsRead}>Marcar como leído</MenuItem>}
                        {firstUrl && (
                            <MenuItem
                                onClick={() => {
                                    navigator.clipboard.writeText(firstUrl);
                                    this.setState({ copiedToast: true, contextMenu: false });
                                }}>
                                Copiar enlace
                            </MenuItem>
                        )}
                        {firstUrl && (
                            <MenuItem
                                onClick={() => {
                                    window.open(firstUrl, '_blank', 'noopener,noreferrer');
                                    this.handleCloseContextMenu();
                                }}>
                                Abrir enlace en nueva pestaña
                            </MenuItem>
                        )}
                    </MenuList>
                </Popover>
                <Snackbar
                    open={copiedToast}
                    autoHideDuration={1800}
                    onClose={() => this.setState({ copiedToast: false })}
                    message='Copiado al portapapeles'
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                />
                <Popover
                    open={langMenu}
                    onClose={this.handleCloseLangMenu}
                    anchorReference='anchorPosition'
                    anchorPosition={{ top, left }}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    onMouseDown={e => e.stopPropagation()}>
                    <div className='lang-picker-search' onClick={e => e.stopPropagation()}>
                        <InputBase
                            autoFocus
                            fullWidth
                            placeholder={t('SearchLanguage')}
                            value={langSearch}
                            onChange={this.handleLangSearchChange}
                            inputProps={{ 'aria-label': 'search language' }}
                        />
                    </div>
                    <MenuList
                        classes={{ root: classes.menuListRoot }}
                        className='lang-picker-list'
                        onClick={e => e.stopPropagation()}>
                        {buildLangList(navigator.language || 'en')
                            .filter(({ code, label }) => {
                                if (!langSearch) return true;
                                const q = langSearch.toLowerCase();
                                return label.toLowerCase().includes(q) || code.toLowerCase().includes(q);
                            })
                            .map(({ code, label }) => (
                                <MenuItem key={code} onClick={() => this.handleTranslateTo(code)}>
                                    <span className='lang-picker-label'>{label}</span>
                                    <span className='lang-picker-code'>{code}</span>
                                </MenuItem>
                            ))}
                    </MenuList>
                </Popover>
            </div>
        );
    }
}

const enhance = compose(withSaveRef(), withStyles(styles, { withTheme: true }), withTranslation(), withRestoreRef());

export default enhance(Message);
