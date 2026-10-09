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
import emojiRegex from 'emoji-regex';
import DoneIcon from '../../Assets/Icons/Done';
import IconButton from '@material-ui/core/IconButton';
import Button from '@material-ui/core/Button';
import InsertEmoticonIcon from '../../Assets/Icons/Smile';
import SendIcon from '../../Assets/Icons/Send';
import MicIcon from '@material-ui/icons/Mic';
import StopIcon from '@material-ui/icons/Stop';
import CloseIcon from '@material-ui/icons/Close';
import ScheduleIcon from '@material-ui/icons/Schedule';
import TagFacesIcon from '@material-ui/icons/TagFaces';
import VolumeOffIcon from '@material-ui/icons/VolumeOff';
import VolumeUpIcon from '@material-ui/icons/VolumeUp';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Snackbar from '@material-ui/core/Snackbar';
import TextField from '@material-ui/core/TextField';
import MenuItem from '@material-ui/core/MenuItem';
import AttachButton from './../ColumnMiddle/AttachButton';
import LiveLocationPanel from './LiveLocationPanel';
import CreatePollDialog from '../Popup/CreatePollDialog';
import GifPicker from './GifPicker';
import GifIcon from '@material-ui/icons/Gif';
import MentionAutocomplete from './MentionAutocomplete';
import BotCommandSuggestions from './BotCommandSuggestions';
import InlineBotResults from './InlineBotResults';
import EditUrlDialog from '../Popup/EditUrlDialog';
import InputBoxHeader from './InputBoxHeader';
import PasteFilesDialog from '../Popup/PasteFilesDialog';
import EditMediaDialog from '../Popup/EditMediaDialog';
import OutputTypingManager from '../../Utils/OutputTypingManager';
import { borderStyle } from '../Theme';
import { draftEquals, getChatDraft, getChatDraftReplyToMessageId, isMeChat, isPrivateChat } from '../../Utils/Chat';
import { findLastTextNode, focusInput } from '../../Utils/DOM';
import { isEditedMedia } from '../../Utils/Media';
import { getEntities, getNodes, isTextMessage } from '../../Utils/Message';
import { getSize, readImageSize } from '../../Utils/Common';
import { PHOTO_SIZE } from '../../Constants';
import { getLiveLocationMessageId, LIVE_LOCATION_PERIODS } from '../../Utils/LiveLocation';
import {
    normalizePhotoQuality,
    PHOTO_QUALITY_KEY,
    PHOTO_QUALITY_PROFILES,
    preparePhotoForSend,
} from '../../Utils/PhotoQuality';
import AppStore from '../../Stores/ApplicationStore';
import ChatStore from '../../Stores/ChatStore';
import FileStore from '../../Stores/FileStore';
import MessageStore from '../../Stores/MessageStore';
import StickerStore from '../../Stores/StickerStore';
import UserStore from '../../Stores/UserStore';
import TdLibController from '../../Controllers/TdLibController';
import './InputBoxControl.css';

const EmojiPickerButton = React.lazy(() => import('./../ColumnMiddle/EmojiPickerButton'));

const styles = theme => ({
    inputboxBackground: {
        background: theme.palette.type === 'dark' ? theme.palette.grey[900] : '#e6ebee',
    },
    inputboxBubble: {
        background: theme.palette.type === 'dark' ? theme.palette.background.default : '#FFFFFF',
        '&::after': {
            background: theme.palette.type === 'dark' ? theme.palette.background.default : '#FFFFFF',
        },
    },
    ...borderStyle(theme),
});

class InputBoxControl extends Component {
    constructor(props) {
        super(props);

        this.attachDocumentRef = React.createRef();
        this.attachPhotoRef = React.createRef();
        this.newMessageRef = React.createRef();

        const chatId = AppStore.getChatId();

        this.state = {
            chatId,
            replyToMessageId: getChatDraftReplyToMessageId(chatId),
            editMessageId: 0,
            recording: false,
            recordingSeconds: 0,
            voiceError: null,
            scheduleDialogOpen: false,
            scheduleDateValue: '',
            pendingScheduleContent: null,
            liveLocationDialogOpen: false,
            liveLocationPeriod: 3600,
            silentSend: false,
            formatBar: null,
            disableLinkPreview: false,
            showGifPicker: false,
            showEffectPicker: false,
            selectedEffectId: null,
            availableEffects: [],
            legacyFeaturesOnly: localStorage.getItem('tg_design_legacy_features') === 'true',
            mentionQuery: null,
            mentionMembers: [],
            botCommandQuery: null,
            botCommands: [],
            inlineBotUsername: null,
            inlineBotResults: null,
            charCount: 0,
            ctrlEnterMode: localStorage.getItem('ctrlEnterMode') === 'true',
            photoQuality: normalizePhotoQuality(localStorage.getItem(PHOTO_QUALITY_KEY)),
        };

        document.addEventListener(
            'selectionchange',
            () => {
                // console.log('[ed] selectionchange', document.activeElement);
                if (document.activeElement === this.newMessageRef.current) {
                    this.saveSelection();
                }
            },
            true,
        );
    }

    shouldComponentUpdate(nextProps, nextState) {
        const { theme, t } = this.props;
        const { chatId, newDraft, files, replyToMessageId, editMessageId, openEditMedia, openEditUrl, recording } =
            this.state;

        if (nextProps.theme !== theme) {
            return true;
        }

        if (nextProps.t !== t) {
            return true;
        }

        if (nextState.chatId !== chatId) {
            return true;
        }

        if (nextState.newDraft !== newDraft) {
            return true;
        }

        if (nextState.files !== files) {
            return true;
        }

        if (nextState.replyToMessageId !== replyToMessageId) {
            return true;
        }

        if (nextState.editMessageId !== editMessageId) {
            return true;
        }

        if (nextState.openEditUrl !== openEditUrl) {
            return true;
        }

        if (nextState.openEditMedia !== openEditMedia) {
            return true;
        }

        if (nextState.recording !== recording) {
            return true;
        }

        if (nextState.scheduleDialogOpen !== this.state.scheduleDialogOpen) {
            return true;
        }

        if (nextState.silentSend !== this.state.silentSend) {
            return true;
        }

        if (nextState.photoQuality !== this.state.photoQuality) return true;

        return false;
    }

    loadDraft() {
        this.setDraft();
        this.setInputFocus();
        this.handleInput();
    }

    saveDraft() {
        const { chatId, editMessageId, replyToMessageId } = this.state;

        const element = this.newMessageRef.current;
        if (!element) return;

        let innerHTML = null;
        if (editMessageId) {
            innerHTML = this.beforeEditText ? this.beforeEditText.innerHTML : null;
        } else {
            innerHTML = element.innerHTML;
        }

        const draftMessage = this.getDraftMessage(chatId, replyToMessageId, innerHTML);
        this.setChatDraftMessage(draftMessage);
    }

    componentDidMount() {
        AppStore.on('clientUpdateChatId', this.onClientUpdateChatId);
        AppStore.on('clientUpdateEditMessage', this.onClientUpdateEditMessage);
        AppStore.on('clientUpdateFocusWindow', this.onClientUpdateFocusWindow);
        ChatStore.on('updateChatDraftMessage', this.onUpdateChatDraftMessage);
        MessageStore.on('clientUpdateReply', this.onClientUpdateReply);
        MessageStore.on('updateDeleteMessages', this.onUpdateDeleteMessages);
        StickerStore.on('clientUpdateStickerSend', this.onClientUpdateStickerSend);
        AppStore.on('clientUpdateDesignCapabilities', this.onDesignCapabilitiesChange);

        this.loadDraft();
        if (!this.state.legacyFeaturesOnly) this.loadAvailableEffects();
    }

    componentWillUnmount() {
        this.saveDraft();

        this._voiceCancelled = true;
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.onstop = null;
            this.mediaRecorder.stop();
        }
        this.cleanupVoiceCapture();

        AppStore.off('clientUpdateChatId', this.onClientUpdateChatId);
        AppStore.off('clientUpdateEditMessage', this.onClientUpdateEditMessage);
        AppStore.off('clientUpdateFocusWindow', this.onClientUpdateFocusWindow);
        ChatStore.off('updateChatDraftMessage', this.onUpdateChatDraftMessage);
        MessageStore.off('clientUpdateReply', this.onClientUpdateReply);
        MessageStore.off('updateDeleteMessages', this.onUpdateDeleteMessages);
        StickerStore.off('clientUpdateStickerSend', this.onClientUpdateStickerSend);
        AppStore.off('clientUpdateDesignCapabilities', this.onDesignCapabilitiesChange);
    }

    onDesignCapabilitiesChange = ({ legacyOnly }) => {
        this.setState(
            {
                legacyFeaturesOnly: !!legacyOnly,
                selectedEffectId: legacyOnly ? null : this.state.selectedEffectId,
                showEffectPicker: false,
            },
            () => {
                if (!legacyOnly && this.state.availableEffects.length === 0) this.loadAvailableEffects();
            },
        );
    };

    onUpdateDeleteMessages = update => {
        const { chatId, editMessageId } = this.state;
        const { chat_id, message_ids, is_permanent } = update;

        if (!editMessageId) return;
        if (!is_permanent) return;
        if (chatId !== chat_id) return;
        if (message_ids.indexOf(editMessageId) === -1) return;

        this.handleCancel();
    };

    onClientUpdateEditMessage = update => {
        const { chatId, messageId } = update;
        if (this.state.chatId !== chatId) return;

        if (!messageId) {
            this.restoreDraftAndSelection();
        } else {
            this.saveDraftAndSelection();
        }

        this.setState(
            {
                editMessageId: messageId,
                openEditMedia: messageId !== 0 && isEditedMedia(chatId, messageId),
            },
            () => {
                if (!this.state.openEditMedia) {
                    this.setEditMessage();
                    this.handleInput();
                    this.focusInput();
                }
            },
        );
    };

    restoreDraftAndSelection() {
        const element = this.newMessageRef.current;
        if (!element) return;

        const { beforeEditText } = this;

        if (beforeEditText) {
            element.innerHTML = beforeEditText.innerHTML;

            if (!beforeEditText.range) {
                this.focusInput();
                return;
            }

            const selection = document.getSelection();
            selection.removeAllRanges();
            selection.addRange(beforeEditText.range);

            element.focus();
        } else {
            element.innerHTML = null;
            this.focusInput();
        }

        this.handleInput();
    }

    saveDraftAndSelection() {
        const element = this.newMessageRef.current;
        if (!element) return;

        this.beforeEditText = {
            innerHTML: element.innerHTML,
            range: this.range,
        };
    }

    onClientUpdateFocusWindow = update => {
        const { focused } = update;
        if (focused) return;

        this.saveDraft();
    };

    onUpdateChatDraftMessage = update => {
        const { chat_id } = update;
        const { chatId } = this.state;

        if (chatId !== chat_id) return;

        this.loadDraft();
    };

    onClientUpdateStickerSend = update => {
        const { sticker: item } = update;
        if (!item) return;

        const { sticker, thumbnail, width, height } = item;
        if (!sticker) return;

        this.restoreSelection();

        const content = {
            '@type': 'inputMessageSticker',
            sticker: {
                '@type': 'inputFileId',
                id: sticker.id,
            },
            width,
            height,
        };

        if (thumbnail) {
            const { width: thumbnailWidth, height: thumbnailHeight, photo } = thumbnail;

            content.thumbnail = {
                thumbnail: {
                    '@type': 'inputFileId',
                    id: photo.id,
                },
                width: thumbnailWidth,
                height: thumbnailHeight,
            };
        }

        this.sendMessage(content, false, result => {});

        TdLibController.clientUpdate({
            '@type': 'clientUpdateLocalStickersHint',
            hint: null,
        });
    };

    onClientUpdateReply = update => {
        const { chatId: currentChatId } = this.state;
        const { chatId, messageId, quoteText, quoteOffset } = update;

        if (currentChatId !== chatId) {
            return;
        }

        this.setState({
            replyToMessageId: messageId,
            replyQuoteText: quoteText || null,
            replyQuoteOffset: quoteOffset || 0,
        });

        if (messageId) {
            this.setInputFocus();
        }
    };

    onClientUpdateChatId = update => {
        const { chatId } = this.state;
        if (chatId === update.nextChatId) return;

        this.saveDraft();
        this.beforeEditText = null;
        this.setState(
            {
                chatId: update.nextChatId,
                replyToMessageId: getChatDraftReplyToMessageId(update.nextChatId),
                editMessageId: 0,
                openEditUrl: false,
            },
            () => {
                this.loadDraft();
            },
        );
    };

    setDraft = () => {
        const { chatId } = this.state;

        const element = this.newMessageRef.current;

        const formattedText = getChatDraft(chatId);
        if (formattedText) {
            this.setFormattedText(formattedText);
            this.setState({
                replyToMessageId: getChatDraftReplyToMessageId(chatId),
            });
        } else {
            element.innerText = null;
        }
    };

    setEditMessage() {
        const { chatId, editMessageId } = this.state;

        const message = MessageStore.get(chatId, editMessageId);
        if (!message) return;

        const { content } = message;
        if (!content) return;

        const { text, caption } = content;
        if (!text && !caption) return;

        const element = this.newMessageRef.current;

        if (text) {
            this.setFormattedText(text);
        } else if (caption) {
            this.setFormattedText(caption);
        } else {
            element.innerText = null;
        }
    }

    setFormattedText(formattedText) {
        const element = this.newMessageRef.current;

        if (!formattedText) {
            element.innerText = null;
            return;
        }

        const { text, entities } = formattedText;
        try {
            const nodes = getNodes(text, entities);
            element.innerHTML = null;
            nodes.forEach(x => {
                element.appendChild(x);
            });
        } catch (e) {
            element.innerText = text;
        }
    }

    setInputFocus = () => {
        setTimeout(() => {
            const element = this.newMessageRef.current;

            focusInput(element);
        }, 100);
    };

    setChatDraftMessage = chatDraftMessage => {
        if (!chatDraftMessage) return;

        const { chatId, draftMessage } = chatDraftMessage;
        if (!chatId) return;

        TdLibController.send({
            '@type': 'setChatDraftMessage',
            chat_id: chatId,
            draft_message: draftMessage,
        });
    };

    getDraftMessage = (chatId, replyToMessageId, innerHTML) => {
        const chat = ChatStore.get(chatId);
        if (!chat) return;

        const { draft_message } = chat;
        const { text, entities } = getEntities(innerHTML);
        const draftMessage =
            (text && text.length > 0) || entities.length > 0
                ? {
                      '@type': 'draftMessage',
                      reply_to_message_id: replyToMessageId,
                      input_message_text: {
                          '@type': 'inputMessageText',
                          text: {
                              '@type': 'formattedText',
                              text,
                              entities,
                          },
                          disable_web_page_preview: false,
                          clear_draft: false,
                      },
                  }
                : null;

        if (draftEquals(draft_message, draftMessage)) {
            return null;
        }

        return { chatId, draftMessage };
    };

    handleSubmit = () => {
        const { chatId, editMessageId } = this.state;
        const element = this.newMessageRef.current;
        if (!element) return;

        const { innerHTML } = element;

        element.innerText = null;
        this.handleInput();
        TdLibController.clientUpdate({
            '@type': 'clientUpdateEditMessage',
            chatId,
            messageId: 0,
        });

        if (!innerHTML) return;
        if (!innerHTML.trim()) return;

        const { text, entities } = getEntities(innerHTML);

        const formattedText = {
            '@type': 'formattedText',
            text,
            entities,
        };
        const inputContent = {
            '@type': 'inputMessageText',
            text: formattedText,
            disable_web_page_preview: false,
            clear_draft: true,
        };

        if (editMessageId) {
            const editedMessage = MessageStore.get(chatId, editMessageId);
            if (!editedMessage) return;

            const { content } = editedMessage;
            if (!content) return;

            const { text, caption } = content;
            if (text) {
                this.editMessageText(inputContent, result => {});
            } else if (caption) {
                this.editMessageCaption(formattedText, result => {});
            }
        } else {
            this.sendMessage(inputContent, false, result => {});
        }
    };

    handleAttachPoll = () => {
        TdLibController.clientUpdate({
            '@type': 'clientUpdateNewPoll',
        });
    };

    handleAttachLocation = () => {
        if (!navigator.geolocation) {
            this.setState({ voiceError: 'Este navegador no permite compartir la ubicación.' });
            return;
        }
        this.setState({ liveLocationDialogOpen: true });
    };

    handleLiveLocationCancel = () => {
        this.setState({ liveLocationDialogOpen: false });
    };

    handleLiveLocationConfirm = () => {
        const { chatId } = this.state;
        const period = Number(this.state.liveLocationPeriod) || 3600;
        this.setState({ liveLocationDialogOpen: false });
        navigator.geolocation.getCurrentPosition(
            async pos => {
                try {
                    const result = await TdLibController.send({
                        '@type': 'sendLiveLocation',
                        chat_id: chatId,
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                        heading: pos.coords.heading || undefined,
                        period,
                    });
                    const msgId = getLiveLocationMessageId(result);
                    if (this.liveLocationPanelRef && msgId) {
                        this.liveLocationPanelRef.start(chatId, msgId, period);
                    } else {
                        this.setState({
                            voiceError: 'Telegram envió la ubicación, pero no devolvió el mensaje para actualizarla.',
                        });
                    }
                } catch (e) {
                    this.setState({ voiceError: e?.message || 'No se pudo enviar la ubicación en directo.' });
                }
            },
            error => {
                const denied = error?.code === 1;
                this.setState({
                    voiceError: denied
                        ? 'Permite el acceso a la ubicación para compartirla en directo.'
                        : 'No se pudo obtener tu ubicación actual.',
                });
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
        );
    };

    handleAttachPhoto = () => {
        if (!this.attachPhotoRef) return;

        this.attachPhotoRef.current.click();
    };

    handleAttachPhotoComplete = async () => {
        const files = this.attachPhotoRef.current.files;
        if (files.length === 0) return;

        const { photoQuality } = this.state;
        await Promise.allSettled(
            Array.from(files).map(async file => {
                try {
                    const prepared = await preparePhotoForSend(file, photoQuality);
                    readImageSize(prepared, result => {
                        this.handleSendPhoto(result);
                    });
                } catch (error) {
                    this.setState({ voiceError: error?.message || 'No se pudo preparar la imagen.' });
                }
            }),
        );

        this.attachPhotoRef.current.value = '';
    };

    handlePhotoQuality = event => {
        const photoQuality = normalizePhotoQuality(event.target.value);
        localStorage.setItem(PHOTO_QUALITY_KEY, photoQuality);
        this.setState({ photoQuality });
    };

    handleAttachDocument = () => {
        if (!this.attachDocumentRef) return;

        this.attachDocumentRef.current.click();
    };

    handleAttachDocumentComplete = () => {
        const files = this.attachDocumentRef.current.files;
        if (files.length === 0) return;

        Array.from(files).forEach(file => {
            this.handleSendDocument(file);
        });

        this.attachDocumentRef.current.value = '';
    };

    setTyping() {
        const { chatId, editMessageId } = this.state;
        const chat = ChatStore.get(chatId);
        if (!chat) return;

        const element = this.newMessageRef.current;
        if (!element) return;

        const { innerHTML } = element;
        if (innerHTML === '<br>' || innerHTML === '<div><br></div>') {
            element.innerHTML = null;
        }
        const { innerText } = element;

        if (!innerText) return;
        if (isMeChat(chatId)) return;
        if (editMessageId) return;

        const typingManager = chat.OutputTypingManager || (chat.OutputTypingManager = new OutputTypingManager(chat.id));
        typingManager.setTyping({ '@type': 'chatActionTyping' });
    }

    setHints() {
        const { editMessageId } = this.state;
        const innerText = this.newMessageRef.current.innerText;
        if (!innerText || innerText.length > 11 || editMessageId) {
            const { hint } = StickerStore;
            if (hint) {
                TdLibController.clientUpdate({
                    '@type': 'clientUpdateLocalStickersHint',
                    hint: null,
                });
            }

            return;
        }

        const t0 = performance.now();
        const regex = emojiRegex();
        let match = regex.exec(innerText);
        const t1 = performance.now();
        // console.log('Matched ' + (t1 - t0) + 'ms', match);
        if (!match || innerText !== match[0]) {
            const { hint } = StickerStore;
            if (hint) {
                TdLibController.clientUpdate({
                    '@type': 'clientUpdateLocalStickersHint',
                    hint: null,
                });
            }

            return;
        }

        const timestamp = Date.now();
        TdLibController.send({
            '@type': 'getStickers',
            emoji: match[0],
            limit: 100,
        }).then(stickers => {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateLocalStickersHint',
                hint: {
                    timestamp,
                    emoji: match[0],
                    stickers,
                },
            });
        });

        TdLibController.send({
            '@type': 'searchStickers',
            emoji: match[0],
            limit: 100,
        }).then(stickers => {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateRemoteStickersHint',
                hint: {
                    timestamp,
                    emoji: match[0],
                    stickers,
                },
            });
        });
    }

    handleClear = () => {
        document.execCommand('removeFormat', false, null);
        document.execCommand('unlink', false, null);
    };

    handleBold = () => {
        document.execCommand('removeFormat', false, null);
        document.execCommand('unlink', false, null);

        document.execCommand('bold', false, null);
    };

    handleItalic = () => {
        document.execCommand('removeFormat', false, null);
        document.execCommand('unlink', false, null);

        document.execCommand('italic', false, null);
    };

    handleMono = () => {
        document.execCommand('removeFormat', false, null);
        document.execCommand('unlink', false, null);

        let text = '';
        const { selection } = this;
        if (selection && !selection.isCollapsed) {
            text = selection.toString();
        }

        if (!text) return;
        text = `<code>${text}</code>`;
        document.execCommand('removeFormat', false, null);
        document.execCommand('insertHTML', false, text);
    };

    handleUnderline = () => {
        document.execCommand('removeFormat', false, null);
        document.execCommand('unlink', false, null);

        document.execCommand('underline', false, null);
    };

    handleStrikeThrough = () => {
        document.execCommand('removeFormat', false, null);
        document.execCommand('unlink', false, null);

        document.execCommand('strikeThrough', false, null);
    };

    handleSpoiler = () => {
        const sel = document.getSelection();
        if (!sel || sel.isCollapsed) return;
        const text = sel.toString();
        if (!text) return;
        document.execCommand('removeFormat', false, null);
        document.execCommand('insertHTML', false, `<span class="spoiler-text">${text}</span>`);
        this.hideFormatBar();
    };

    handleUrl = () => {
        this.openEditUrlDialog();
    };

    showFormatBar = () => {
        const sel = document.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
            this.setState({ formatBar: null });
            return;
        }
        const input = this.newMessageRef && this.newMessageRef.current;
        if (!input || !input.contains(sel.anchorNode)) {
            this.setState({ formatBar: null });
            return;
        }
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const inputRect = input.getBoundingClientRect();
        this.setState({
            formatBar: {
                x: rect.left - inputRect.left + rect.width / 2,
                y: rect.top - inputRect.top - 44,
            },
        });
    };

    hideFormatBar = () => {
        this.setState({ formatBar: null });
    };

    handleCancel = () => {
        const { chatId, editMessageId, replyToMessageId } = this.state;
        if (editMessageId) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateEditMessage',
                chatId,
                messageId: 0,
            });
        } else if (replyToMessageId) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateReply',
                chatId,
                messageId: 0,
            });
        }
    };

    handleKeyDown = event => {
        const { altKey, ctrlKey, keyCode, metaKey, repeat, shiftKey } = event;

        // console.log('[k] handleKeyDown', altKey, ctrlKey, keyCode, metaKey, repeat, shiftKey);

        switch (keyCode) {
            // enter
            case 13: {
                const { ctrlEnterMode } = this.state;
                const shouldSend = ctrlEnterMode
                    ? (ctrlKey || metaKey) && !altKey && !shiftKey
                    : !altKey && !ctrlKey && !metaKey && !shiftKey;
                if (shouldSend) {
                    if (!repeat) this.handleSubmit();
                    event.preventDefault();
                    event.stopPropagation();
                }
                break;
            }
            // esc
            case 27: {
                if (!altKey && !ctrlKey && !metaKey && !shiftKey) {
                    if (!repeat) this.handleCancel();

                    event.preventDefault();
                    event.stopPropagation();
                }
                break;
            }
            // arrow up
            case 38: {
                if (!repeat && !altKey && !ctrlKey && !metaKey && !shiftKey) {
                    const element = this.newMessageRef.current;
                    if (element && !element.innerText) {
                        const { editMessageId } = this.state;
                        if (editMessageId) return;

                        TdLibController.clientUpdate({
                            '@type': 'clientUpdateTryEditMessage',
                        });

                        event.preventDefault();
                        event.stopPropagation();
                    }
                }
                break;
            }
            // cmd + b
            case 66: {
                if (!altKey && (ctrlKey || metaKey) && !shiftKey) {
                    if (!repeat) this.handleBold();

                    event.preventDefault();
                    event.stopPropagation();
                }
                break;
            }
            // cmd + i
            case 73: {
                if (!altKey && (ctrlKey || metaKey) && !shiftKey) {
                    if (!repeat) this.handleItalic();

                    event.preventDefault();
                    event.stopPropagation();
                }
                break;
            }
            case 75: {
                // cmd + k
                if (!altKey && (ctrlKey || metaKey) && !shiftKey) {
                    if (!repeat) this.handleUrl();

                    event.preventDefault();
                    event.stopPropagation();
                }
                // alt + cmd + k
                else if (altKey && (ctrlKey || metaKey) && !shiftKey) {
                    if (!repeat) this.handleMono();

                    event.preventDefault();
                    event.stopPropagation();
                }
                break;
            }
            // alt + cmd + n
            case 192: {
                if (altKey && (ctrlKey || metaKey) && !shiftKey) {
                    if (!repeat) this.handleClear();

                    event.preventDefault();
                    event.stopPropagation();
                }
                break;
            }
        }
    };

    handleSendPhoto = file => {
        if (!file) return;

        const content = {
            '@type': 'inputMessagePhoto',
            photo: { '@type': 'inputFileBlob', name: file.name, data: file },
            width: file.photoWidth,
            height: file.photoHeight,
        };

        this.sendMessage(content, true, result => {
            const cachedMessage = MessageStore.get(result.chat_id, result.id);
            if (cachedMessage != null) {
                this.handleSendingMessage(cachedMessage, file);
            }

            FileStore.uploadFile(result.content.photo.sizes[0].photo.id, result);
        });
    };

    handleSendPoll = poll => {
        this.sendMessage(poll, true, () => {});
    };

    handleSendDocument = file => {
        if (!file) return;

        const content = {
            '@type': 'inputMessageDocument',
            document: { '@type': 'inputFileBlob', name: file.name, data: file },
        };

        this.sendMessage(content, true, result => FileStore.uploadFile(result.content.document.document.id, result));
    };

    handleVoiceStart = async () => {
        if (this.state.recording) {
            this.handleVoiceStop();
            return;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
            this.setState({ voiceError: 'Este navegador no permite grabar notas de voz.' });
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.voiceStream = stream;
            this.audioChunks = [];
            this._voiceCancelled = false;
            const mimeType =
                typeof MediaRecorder.isTypeSupported === 'function'
                    ? ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(type =>
                          MediaRecorder.isTypeSupported(type),
                      )
                    : null;
            this.mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            this._voiceMimeType = this.mediaRecorder.mimeType || mimeType || 'audio/webm';
            this.mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) this.audioChunks.push(e.data);
            };
            this.mediaRecorder.onerror = () => {
                this._voiceCancelled = true;
                this.cleanupVoiceCapture();
                this.setState({ recording: false, voiceError: 'La grabación se interrumpió.' });
            };
            this.mediaRecorder.onstop = () => {
                const cancelled = this._voiceCancelled;
                this.cleanupVoiceCapture();
                this.setState({ recording: false, recordingSeconds: 0 });
                if (cancelled) this.audioChunks = [];
                else this._sendVoiceNote();
            };
            this._voiceStartTime = Date.now();
            this.mediaRecorder.start();
            this._voiceTimer = setInterval(() => {
                this.setState({ recordingSeconds: Math.floor((Date.now() - this._voiceStartTime) / 1000) });
            }, 1000);
            this.setState({ recording: true, recordingSeconds: 0, voiceError: null });
            TdLibController.send({
                '@type': 'sendChatAction',
                chat_id: this.state.chatId,
                action: { '@type': 'chatActionRecordingVoiceNote' },
            });
        } catch (err) {
            console.error('[Voice] microphone error', err);
            this.cleanupVoiceCapture();
            const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
            this.setState({
                recording: false,
                voiceError: denied
                    ? 'Permite el acceso al micrófono para enviar notas de voz.'
                    : 'No se pudo iniciar el micrófono.',
            });
        }
    };

    handleVoiceStop = () => {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    };

    handleVoiceCancel = () => {
        this._voiceCancelled = true;
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
        TdLibController.send({
            '@type': 'sendChatAction',
            chat_id: this.state.chatId,
            action: { '@type': 'chatActionCancel' },
        });
    };

    cleanupVoiceCapture = () => {
        if (this._voiceTimer) clearInterval(this._voiceTimer);
        this._voiceTimer = null;
        if (this.voiceStream) this.voiceStream.getTracks().forEach(track => track.stop());
        this.voiceStream = null;
        this.mediaRecorder = null;
    };

    _sendVoiceNote = () => {
        const { chatId, replyToMessageId } = this.state;
        if (!this.audioChunks || this.audioChunks.length === 0) return;

        const duration = Math.max(1, Math.round((Date.now() - this._voiceStartTime) / 1000));
        const mimeType = this._voiceMimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const extension = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([blob], `voice.${extension}`, { type: mimeType });

        const content = {
            '@type': 'inputMessageVoiceNote',
            voice_note: { '@type': 'inputFileBlob', name: file.name, data: file },
            duration,
            waveform: '',
        };

        TdLibController.send({
            '@type': 'sendChatAction',
            chat_id: chatId,
            action: { '@type': 'chatActionUploadingVoiceNote', progress: 0 },
        });
        this.sendMessage(content, true, () => {}).finally(() => {
            TdLibController.send({
                '@type': 'sendChatAction',
                chat_id: chatId,
                action: { '@type': 'chatActionCancel' },
            });
        });
        this.audioChunks = [];
    };

    handlePaste = event => {
        const items = (event.clipboardData || event.originalEvent.clipboardData).items;

        const files = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind.indexOf('file') === 0) {
                files.push(items[i].getAsFile());
            }
        }

        if (files.length > 0) {
            event.preventDefault();

            this.setState({ files });
            return;
        }

        const plainText = event.clipboardData.getData('text/plain');
        if (plainText) {
            event.preventDefault();
            document.execCommand('insertText', false, plainText);
            return;
        }
    };

    handlePasteConfirm = () => {
        const { files } = this.state;
        if (!files) return;
        if (!files.length) return;

        files.forEach(file => {
            this.handleSendDocument(file);
        });

        this.handlePasteCancel();
    };

    handlePasteCancel = () => {
        this.setState({ files: null });
    };

    handleUpdateDraftConfirm = () => {
        const { newDraft } = this.state;
        if (!newDraft) return;

        this.loadDraft();
        this.handleUpdateDraftCancel();
    };

    handleUpdateDraftCancel = () => {
        this.setState({ newDraft: null });
    };

    handleSendingMessage = (message, blob) => {
        if (message && message.sending_state && message.sending_state['@type'] === 'messageSendingStatePending') {
            if (message.content && message.content['@type'] === 'messagePhoto' && message.content.photo) {
                let size = getSize(message.content.photo.sizes, PHOTO_SIZE);
                if (!size) return;

                let file = size.photo;
                if (file && file.local && file.local.is_downloading_completed && !file.blob) {
                    file.blob = blob;
                    FileStore.updatePhotoBlob(message.chat_id, message.id, file.id);
                }
            }
        }
    };

    async editMessageMedia(content, callback) {
        const { chatId, editMessageId } = this.state;
        // console.log('[em] editMessageMedia start', chatId, editMessageId, content);

        if (!chatId) return;
        if (!editMessageId) return;
        if (!content) return;

        // console.log('[em] editMessageMedia send', content);
        const result = await TdLibController.send({
            '@type': 'editMessageMedia',
            chat_id: chatId,
            message_id: editMessageId,
            input_message_content: content,
        });

        callback(result);
    }

    async editMessageCaption(caption, callback) {
        const { chatId, editMessageId } = this.state;

        if (!chatId) return;
        if (!editMessageId) return;
        if (!caption) return;

        const result = await TdLibController.send({
            '@type': 'editMessageCaption',
            chat_id: chatId,
            message_id: editMessageId,
            caption,
        });

        callback(result);
    }

    async editMessageText(content, callback) {
        const { chatId, editMessageId } = this.state;

        if (!chatId) return;
        if (!editMessageId) return;
        if (!content) return;

        try {
            const result = await TdLibController.send({
                '@type': 'editMessageText',
                chat_id: chatId,
                message_id: editMessageId,
                input_message_content: content,
            });

            callback(result);
        } finally {
        }
    }

    _scheduleIsoDefault = () => {
        const d = new Date(Date.now() + 3600000);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
            d.getMinutes(),
        )}`;
    };

    handleSubmitScheduled = () => {
        const { editMessageId } = this.state;
        if (editMessageId) {
            this.handleSubmit();
            return;
        }
        const element = this.newMessageRef.current;
        if (!element) return;
        const innerHTML = element.innerHTML;
        if (!innerHTML || innerHTML === '<br>') return;
        const { text, entities } = getEntities(element);
        if (!text) return;
        const content = {
            '@type': 'inputMessageText',
            text: { '@type': 'formattedText', text, entities },
            clear_draft: true,
        };
        this.setState({
            pendingScheduleContent: { content, clearDraft: true, callback: () => {} },
            scheduleDateValue: this._scheduleIsoDefault(),
            scheduleDialogOpen: true,
        });
    };

    handleScheduleConfirm = () => {
        const { scheduleDateValue, pendingScheduleContent } = this.state;
        if (!scheduleDateValue || !pendingScheduleContent) return;
        const scheduleDate = Math.floor(new Date(scheduleDateValue).getTime() / 1000);
        this.setState({ scheduleDialogOpen: false, pendingScheduleContent: null });
        const { content, clearDraft, callback } = pendingScheduleContent;
        this.sendMessage(content, clearDraft, callback, scheduleDate);
    };

    handleScheduleCancel = () => {
        this.setState({ scheduleDialogOpen: false, pendingScheduleContent: null });
    };

    sendMessage = async (content, clearDraft, callback, scheduleDate = 0) => {
        const {
            chatId,
            replyToMessageId,
            replyQuoteText,
            replyQuoteOffset,
            silentSend,
            disableLinkPreview,
            selectedEffectId,
        } = this.state;

        if (!chatId) return;
        if (!content) return;

        try {
            await AppStore.invokeScheduledAction(`clientUpdateClearHistory chatId=${chatId}`);

            const replyTo = replyToMessageId
                ? replyQuoteText
                    ? {
                          '@type': 'inputMessageReplyToMessage',
                          message_id: replyToMessageId,
                          quote: {
                              '@type': 'inputTextQuote',
                              text: { '@type': 'formattedText', text: replyQuoteText, entities: [] },
                              position: replyQuoteOffset || 0,
                          },
                      }
                    : { '@type': 'inputMessageReplyToMessage', message_id: replyToMessageId }
                : undefined;

            const result = await TdLibController.send({
                '@type': 'sendMessage',
                chat_id: chatId,
                reply_to: replyTo,
                reply_to_message_id: replyQuoteText ? undefined : replyToMessageId,
                input_message_content: content,
                schedule_date: scheduleDate || undefined,
                disable_notification: silentSend || undefined,
                disable_web_page_preview: disableLinkPreview || undefined,
                effect_id: selectedEffectId || undefined,
            });

            this.setState(
                { replyToMessageId: 0, replyQuoteText: null, replyQuoteOffset: 0, selectedEffectId: null },
                () => {
                    if (clearDraft) {
                        this.saveDraft();
                    }
                },
            );
            //MessageStore.set(result);

            TdLibController.send({
                '@type': 'viewMessages',
                chat_id: chatId,
                message_ids: [result.id],
            });

            callback(result);
        } catch (error) {
            alert('sendMessage error ' + JSON.stringify(error));
        }
    };

    loadAvailableEffects = async () => {
        try {
            const result = await TdLibController.send({ '@type': 'getAvailableMessageEffects' });
            if (result && result.effects && result.effects.length > 0) {
                this.setState({ availableEffects: result.effects });
            }
        } catch (e) {
            // TDLib may not support effects — silently ignore
        }
    };

    handleToggleEffectPicker = e => {
        e.stopPropagation();
        this.setState(s => ({ showEffectPicker: !s.showEffectPicker }));
    };

    handleSelectEffect = effectId => {
        this.setState(s => ({
            selectedEffectId: s.selectedEffectId === effectId ? null : effectId,
            showEffectPicker: false,
        }));
    };

    handleEmojiSelect = emoji => {
        if (!emoji) return;

        this.restoreSelection();
        document.execCommand('insertText', false, emoji.native);
        this.handleInput();
    };

    loadMentionMembers = async chatId => {
        if (this._mentionChatId === chatId && this._mentionMembersCache) return;
        this._mentionChatId = chatId;
        this._mentionMembersCache = [];

        const { ChatStore: CS } = await import('../../Stores/ChatStore');
        const chat = CS ? CS.get(chatId) : null;
        if (!chat || !chat.type) return;

        try {
            let members = [];
            if (chat.type['@type'] === 'chatTypeSupergroup') {
                const result = await TdLibController.send({
                    '@type': 'getSupergroupMembers',
                    supergroup_id: chat.type.supergroup_id,
                    filter: { '@type': 'supergroupMembersFilterRecent' },
                    offset: 0,
                    limit: 200,
                });
                members = result.members || [];
            } else if (chat.type['@type'] === 'chatTypeBasicGroup') {
                const result = await TdLibController.send({
                    '@type': 'getBasicGroupFullInfo',
                    basic_group_id: chat.type.basic_group_id,
                });
                members = result.members || [];
            }
            this._mentionMembersCache = members;
            this.setState({ mentionMembers: members });
        } catch {
            // no-op
        }
    };

    detectMention = () => {
        const element = this.newMessageRef.current;
        if (!element) return;

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
            this.setState({ mentionQuery: null });
            return;
        }

        const range = sel.getRangeAt(0);
        const preRange = document.createRange();
        preRange.selectNodeContents(element);
        try {
            preRange.setEnd(range.startContainer, range.startOffset);
        } catch {
            this.setState({ mentionQuery: null });
            return;
        }
        const textBeforeCursor = preRange.toString();
        const match = textBeforeCursor.match(/@(\w*)$/);
        if (!match) {
            this.setState({ mentionQuery: null });
            return;
        }

        const { chatId } = this.state;
        this.setState({ mentionQuery: match[1] });
        this.loadMentionMembers(chatId);
    };

    handleMentionSelect = user => {
        const { mentionQuery } = this.state;
        const element = this.newMessageRef.current;
        if (!element) return;

        element.focus();
        const deleteCount = (mentionQuery ? mentionQuery.length : 0) + 1;
        for (let i = 0; i < deleteCount; i++) {
            document.execCommand('delete', false);
        }
        const mention = user.username ? `@${user.username}` : `@${user.first_name}`;
        document.execCommand('insertText', false, mention + ' ');
        this.setState({ mentionQuery: null });
    };

    detectBotCommand = async () => {
        const element = this.newMessageRef.current;
        if (!element) return;

        const text = element.innerText || '';
        if (!text.startsWith('/')) {
            this.setState({ botCommandQuery: null });
            return;
        }

        const { chatId } = this.state;
        const chat = ChatStore.get(chatId);
        if (!chat || chat.type['@type'] !== 'chatTypePrivate') {
            this.setState({ botCommandQuery: null });
            return;
        }

        const userId = chat.type.user_id;
        const user = UserStore.get(userId);
        if (!user || user.type['@type'] !== 'userTypeBot') {
            this.setState({ botCommandQuery: null });
            return;
        }

        const query = text.slice(1);
        this.setState({ botCommandQuery: query });

        if (!this._botCommandsCache || this._botCommandsCache.userId !== userId) {
            try {
                const full = await TdLibController.send({ '@type': 'getUserFullInfo', user_id: userId });
                this._botCommandsCache = { userId, commands: full.commands || [] };
            } catch (e) {
                this._botCommandsCache = { userId, commands: [] };
            }
        }
        this.setState({ botCommands: this._botCommandsCache.commands });
    };

    detectInlineBot = () => {
        const element = this.newMessageRef.current;
        if (!element) return;

        const text = (element.innerText || '').trimStart();
        // Pattern: @username followed by a space and optional query
        const match = text.match(/^@(\w{3,32}) (.*)$/s);
        if (!match) {
            if (this.state.inlineBotUsername !== null) {
                this.setState({ inlineBotUsername: null, inlineBotResults: null });
            }
            return;
        }

        const username = match[1];
        const query = match[2];

        // Debounce via timeout stored on instance
        clearTimeout(this._inlineBotDebounce);
        this._inlineBotDebounce = setTimeout(() => {
            const { chatId } = this.state;
            this.setState({ inlineBotUsername: username, inlineBotResults: null });
            TdLibController.send({
                '@type': 'getInlineBotResults',
                bot_username: username,
                query,
                offset: '',
                chat_id: chatId,
            })
                .then(res => {
                    if (this.state.inlineBotUsername === username) {
                        this._lastInlineQueryId = res.query_id || '0';
                        this.setState({ inlineBotResults: res.results || [] });
                    }
                })
                .catch(() => {
                    this.setState({ inlineBotResults: [] });
                });
        }, 300);
    };

    handleInlineBotSelect = result => {
        const { chatId, replyToMessageId, inlineBotResults } = this.state;
        // inlineBotResults carries query_id set during last fetch
        const queryId = this._lastInlineQueryId || '0';
        TdLibController.send({
            '@type': 'sendInlineBotResult',
            chat_id: chatId,
            query_id: queryId,
            result_id: result.id,
            reply_to_message_id: replyToMessageId || 0,
        }).catch(() => {});

        // Clear input and panel
        const element = this.newMessageRef.current;
        if (element) element.innerText = '';
        this.setState({ inlineBotUsername: null, inlineBotResults: null, replyToMessageId: 0 });
    };

    handleBotCommandSelect = cmd => {
        const element = this.newMessageRef.current;
        if (!element) return;

        element.focus();
        element.innerText = '';
        document.execCommand('insertText', false, '/' + cmd.command + ' ');
        this.setState({ botCommandQuery: null });
    };

    handleInput = async event => {
        this.setTyping();
        this.setHints();
        this.detectMention();
        this.detectBotCommand();
        this.detectInlineBot();
        const el = this.newMessageRef.current;
        if (el) this.setState({ charCount: (el.innerText || '').length });
    };

    handleCtrlEnterToggle = () => {
        const { ctrlEnterMode } = this.state;
        const next = !ctrlEnterMode;
        localStorage.setItem('ctrlEnterMode', next);
        this.setState({ ctrlEnterMode: next });
    };

    openEditUrlDialog = () => {
        let defaultText = '';
        let defaultUrl = '';

        const { selection, range } = this;
        if (range) {
            let { startContainer, endContainer } = range;
            if (startContainer === endContainer) {
                const { parentElement } = startContainer;
                if (parentElement && parentElement.nodeName === 'A') {
                    defaultText = parentElement.innerText;
                    defaultUrl = parentElement.href;
                }
            }
        }

        if (!defaultText && selection && !selection.isCollapsed) {
            defaultText = selection.toString();
        }

        this.setState({
            openEditUrl: true,
            defaultUrl,
            defaultText,
        });
    };

    closeEditUrlDialog = () => {
        this.setState(
            {
                openEditUrl: false,
            },
            () => {
                this.restoreSelection();
            },
        );
    };

    saveSelection() {
        this.selection = document.getSelection();
        this.range = this.selection.getRangeAt(0);
    }

    restoreSelection() {
        const { range } = this;

        if (!range) {
            this.focusInput();
            return;
        }

        const selection = document.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        this.newMessageRef.current.focus();
    }

    focusInput = () => {
        const element = this.newMessageRef.current;
        if (!element) return;
        if (!element.childNodes.length) {
            element.focus();
            return;
        }

        const lastTextNode = findLastTextNode(element);
        if (!lastTextNode) {
            return;
        }

        const range = document.createRange();
        range.setStart(lastTextNode, lastTextNode.length);
        range.collapse(true);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        element.focus();
    };

    handleCancelEditUrl = () => {
        this.closeEditUrlDialog();
    };

    handleDoneEditUrl = (text, url) => {
        this.closeEditUrlDialog();
        setTimeout(() => {
            // edit current link node
            const { range } = this;
            if (range) {
                const { startContainer, endContainer } = range;
                if (startContainer && startContainer === endContainer) {
                    const { parentNode } = startContainer;
                    if (parentNode && parentNode.nodeName === 'A') {
                        parentNode.href = url;
                        parentNode.title = url;
                        parentNode.innerText = text;

                        // move cursor to end of editing node
                        const { lastChild } = parentNode;
                        if (lastChild) {
                            const range = document.createRange();
                            range.setStart(lastChild, lastChild.textContent.length);
                            range.setEnd(lastChild, lastChild.textContent.length);

                            const selection = document.getSelection();
                            selection.removeAllRanges();
                            selection.addRange(range);
                        }
                        return;
                    }
                }
            }

            // replace selected text with new link node
            const link = `<a href=${url} title=${url} rel='noopener noreferrer' target='_blank'>${text}</a>`;
            document.execCommand('removeFormat', false, null);
            document.execCommand('insertHTML', false, link);
        }, 0);
    };

    handleCancelEditMedia = () => {
        this.closeEditMediaDialog();
    };

    handleDoneEditMedia = (caption, content) => {
        if (content) {
            this.editMessageMedia(content, () => {});
            return;
        }

        this.editMessageCaption(caption, () => {});
    };

    closeEditMediaDialog() {
        this.setState(
            {
                openEditMedia: false,
            },
            () => {
                this.restoreSelection();
            },
        );
    }

    handleHeaderClick = () => {
        setTimeout(() => this.restoreSelection(), 0);
    };

    render() {
        const { classes, t } = this.props;
        const {
            chatId,
            editMessageId,
            replyToMessageId,
            files,
            newDraft,
            defaultText,
            defaultUrl,
            openEditUrl,
            openEditMedia,
            recording,
            recordingSeconds,
            voiceError,
            scheduleDialogOpen,
            scheduleDateValue,
            silentSend,
            disableLinkPreview,
            formatBar,
            showGifPicker,
            mentionQuery,
            mentionMembers,
            botCommandQuery,
            botCommands,
            inlineBotUsername,
            inlineBotResults,
            charCount,
            ctrlEnterMode,
            showEffectPicker,
            selectedEffectId,
            availableEffects,
        } = this.state;
        const MAX_MSG_LEN = 4096;
        const showCharCounter = charCount > 3000;

        const isMediaEditing = editMessageId > 0 && !isTextMessage(chatId, editMessageId);

        return (
            <div className={classes.inputboxBackground}>
                <div className={classNames(classes.borderColor, 'inputbox')}>
                    <div className={classNames('inputbox-bubble', classes.inputboxBubble)}>
                        {showGifPicker && <GifPicker onClose={() => this.setState({ showGifPicker: false })} />}
                        <InputBoxHeader
                            chatId={chatId}
                            messageId={replyToMessageId}
                            editMessageId={openEditMedia ? 0 : editMessageId}
                            onClick={this.handleHeaderClick}
                        />
                        <div className='inputbox-wrapper'>
                            <div className='inputbox-left-column'>
                                <React.Suspense
                                    fallback={
                                        <IconButton className='inputbox-icon-button' aria-label='Emoticon'>
                                            <InsertEmoticonIcon />
                                        </IconButton>
                                    }
                                >
                                    <EmojiPickerButton onSelect={this.handleEmojiSelect} />
                                </React.Suspense>
                                <IconButton
                                    className='inputbox-icon-button'
                                    aria-label='Stickers'
                                    title='Stickers'
                                    onClick={() =>
                                        TdLibController.clientUpdate({ '@type': 'clientUpdateOpenStickersPanel' })
                                    }
                                >
                                    <TagFacesIcon />
                                </IconButton>
                                <IconButton
                                    className='inputbox-icon-button'
                                    aria-label='GIF'
                                    title='Enviar GIF'
                                    onClick={() => this.setState(s => ({ showGifPicker: !s.showGifPicker }))}
                                >
                                    <GifIcon />
                                </IconButton>
                            </div>
                            <div className='inputbox-middle-column' style={{ position: 'relative' }}>
                                {botCommandQuery !== null && (
                                    <BotCommandSuggestions
                                        commands={botCommands}
                                        query={botCommandQuery}
                                        onSelect={this.handleBotCommandSelect}
                                    />
                                )}
                                {mentionQuery !== null && (
                                    <MentionAutocomplete
                                        members={mentionMembers}
                                        query={mentionQuery}
                                        onSelect={this.handleMentionSelect}
                                    />
                                )}
                                {inlineBotUsername !== null && (
                                    <InlineBotResults
                                        results={inlineBotResults || []}
                                        botUsername={inlineBotUsername}
                                        onSelect={this.handleInlineBotSelect}
                                    />
                                )}
                                <div
                                    id='inputbox-message'
                                    ref={this.newMessageRef}
                                    placeholder={isMediaEditing ? t('Caption') : t('Message')}
                                    contentEditable
                                    suppressContentEditableWarning
                                    onKeyDown={this.handleKeyDown}
                                    onPaste={this.handlePaste}
                                    onInput={this.handleInput}
                                    onMouseUp={this.showFormatBar}
                                    onKeyUp={this.showFormatBar}
                                />
                                {formatBar && (
                                    <div
                                        className='format-toolbar'
                                        style={{ left: formatBar.x, top: formatBar.y }}
                                        onMouseDown={e => e.preventDefault()}
                                    >
                                        <button
                                            className='fmt-btn'
                                            title='Negrita (Ctrl+B)'
                                            onMouseDown={this.handleBold}
                                        >
                                            <b>B</b>
                                        </button>
                                        <button
                                            className='fmt-btn'
                                            title='Cursiva (Ctrl+I)'
                                            onMouseDown={this.handleItalic}
                                        >
                                            <i>I</i>
                                        </button>
                                        <button
                                            className='fmt-btn'
                                            title='Subrayado (Ctrl+U)'
                                            onMouseDown={this.handleUnderline}
                                        >
                                            <u>U</u>
                                        </button>
                                        <button
                                            className='fmt-btn'
                                            title='Tachado'
                                            onMouseDown={this.handleStrikeThrough}
                                        >
                                            <s>S</s>
                                        </button>
                                        <button
                                            className='fmt-btn'
                                            title='Código'
                                            onMouseDown={this.handleMono}
                                            style={{ fontFamily: 'monospace' }}
                                        >
                                            &lt;/&gt;
                                        </button>
                                        <button className='fmt-btn' title='Spoiler' onMouseDown={this.handleSpoiler}>
                                            👁
                                        </button>
                                        <button
                                            className='fmt-btn'
                                            title='Enlace (Ctrl+K)'
                                            onMouseDown={this.handleUrl}
                                        >
                                            🔗
                                        </button>
                                        <button
                                            className='fmt-btn fmt-btn-clear'
                                            title='Quitar formato'
                                            onMouseDown={this.handleClear}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className='inputbox-right-column'>
                                {showCharCounter && (
                                    <span
                                        title='Caracteres restantes'
                                        style={{
                                            fontSize: 11,
                                            color: charCount > MAX_MSG_LEN - 100 ? '#e53935' : '#888',
                                            alignSelf: 'center',
                                            marginRight: 4,
                                            minWidth: 32,
                                            textAlign: 'right',
                                        }}
                                    >
                                        {MAX_MSG_LEN - charCount}
                                    </span>
                                )}
                                <IconButton
                                    size='small'
                                    className='inputbox-icon-button'
                                    aria-label={ctrlEnterMode ? 'Enviar con Ctrl+Enter' : 'Enviar con Enter'}
                                    title={ctrlEnterMode ? 'Modo: Ctrl+Enter para enviar' : 'Modo: Enter para enviar'}
                                    onClick={this.handleCtrlEnterToggle}
                                    style={{ fontSize: 10, padding: 4 }}
                                >
                                    <span style={{ fontSize: 9, fontWeight: 'bold', lineHeight: 1 }}>
                                        {ctrlEnterMode ? '⌃↵' : '↵'}
                                    </span>
                                </IconButton>
                                <input
                                    ref={this.attachDocumentRef}
                                    className='inputbox-attach-button'
                                    type='file'
                                    multiple='multiple'
                                    onChange={this.handleAttachDocumentComplete}
                                />
                                <input
                                    ref={this.attachPhotoRef}
                                    className='inputbox-attach-button'
                                    type='file'
                                    multiple='multiple'
                                    accept='image/*'
                                    onChange={this.handleAttachPhotoComplete}
                                />
                                {!Boolean(editMessageId) && (
                                    <AttachButton
                                        chatId={chatId}
                                        onAttachPhoto={this.handleAttachPhoto}
                                        onAttachDocument={this.handleAttachDocument}
                                        onAttachPoll={this.handleAttachPoll}
                                        onAttachLocation={this.handleAttachLocation}
                                    />
                                )}
                                {!Boolean(editMessageId) && (
                                    <label className='photo-quality-control' title='Calidad para las próximas fotos'>
                                        <span aria-hidden='true'>📷</span>
                                        <select
                                            value={this.state.photoQuality}
                                            onChange={this.handlePhotoQuality}
                                            aria-label='Calidad de envío de fotos'
                                        >
                                            {PHOTO_QUALITY_PROFILES.map(profile => (
                                                <option key={profile.id} value={profile.id}>
                                                    {profile.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                )}

                                {!Boolean(editMessageId) && (
                                    <>
                                        {recording && (
                                            <span
                                                aria-live='polite'
                                                title='Duración de la grabación'
                                                style={{
                                                    color: '#e53935',
                                                    fontSize: 12,
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}
                                            >
                                                {Math.floor(recordingSeconds / 60)}:
                                                {String(recordingSeconds % 60).padStart(2, '0')}
                                            </span>
                                        )}
                                        {recording && (
                                            <IconButton
                                                size='small'
                                                aria-label='Cancelar nota de voz'
                                                title='Cancelar nota de voz'
                                                onClick={this.handleVoiceCancel}
                                            >
                                                <CloseIcon fontSize='small' />
                                            </IconButton>
                                        )}
                                        <IconButton
                                            size='small'
                                            aria-label={recording ? 'Enviar nota de voz' : 'Grabar nota de voz'}
                                            title={recording ? 'Detener y enviar' : 'Grabar nota de voz'}
                                            onClick={this.handleVoiceStart}
                                            style={recording ? { color: '#e53935' } : {}}
                                        >
                                            {recording ? <StopIcon /> : <MicIcon />}
                                        </IconButton>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    {!Boolean(editMessageId) && (
                        <IconButton
                            size='small'
                            aria-label='Enviar sin notificación'
                            title={
                                silentSend ? 'Notificación desactivada — clic para activar' : 'Enviar sin notificación'
                            }
                            onClick={() => this.setState(s => ({ silentSend: !s.silentSend }))}
                            style={silentSend ? { color: '#e53935', marginRight: 2 } : { marginRight: 2 }}
                        >
                            {silentSend ? <VolumeOffIcon fontSize='small' /> : <VolumeUpIcon fontSize='small' />}
                        </IconButton>
                    )}
                    {!Boolean(editMessageId) && (
                        <IconButton
                            size='small'
                            aria-label={
                                disableLinkPreview ? 'Vista previa desactivada' : 'Desactivar vista previa de enlace'
                            }
                            title={
                                disableLinkPreview
                                    ? 'Vista previa desactivada — clic para activar'
                                    : 'Desactivar vista previa de enlace'
                            }
                            onClick={() => this.setState(s => ({ disableLinkPreview: !s.disableLinkPreview }))}
                            style={disableLinkPreview ? { color: '#e53935', marginRight: 2 } : { marginRight: 2 }}
                        >
                            <span
                                style={{
                                    fontSize: 16,
                                    lineHeight: 1,
                                    textDecoration: disableLinkPreview ? 'line-through' : 'none',
                                }}
                            >
                                🔗
                            </span>
                        </IconButton>
                    )}
                    {!Boolean(editMessageId) && (
                        <IconButton
                            size='small'
                            aria-label='Programar mensaje'
                            title='Enviar programado'
                            onClick={this.handleSubmitScheduled}
                            style={{ marginRight: 2 }}
                        >
                            <ScheduleIcon fontSize='small' />
                        </IconButton>
                    )}
                    {!Boolean(editMessageId) && !this.state.legacyFeaturesOnly && availableEffects.length > 0 && (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <IconButton
                                size='small'
                                aria-label='Enviar con efecto'
                                title={
                                    selectedEffectId ? 'Efecto seleccionado — clic para cambiar' : 'Enviar con efecto'
                                }
                                onClick={this.handleToggleEffectPicker}
                                style={
                                    selectedEffectId
                                        ? { color: 'var(--color-primary, #5B8AF1)', marginRight: 2 }
                                        : { marginRight: 2 }
                                }
                            >
                                <span style={{ fontSize: 16, lineHeight: 1 }}>✨</span>
                            </IconButton>
                            {showEffectPicker && (
                                <div className='effect-picker-popup'>
                                    <div className='effect-picker-title'>Efecto al enviar</div>
                                    <div className='effect-picker-grid'>
                                        {availableEffects.map(effect => {
                                            const emoji = effect.static_icon ? null : effect.emoji || '✨';
                                            return (
                                                <button
                                                    key={effect.id}
                                                    className={`effect-picker-item${
                                                        selectedEffectId === effect.id
                                                            ? ' effect-picker-item-selected'
                                                            : ''
                                                    }`}
                                                    onClick={() => this.handleSelectEffect(effect.id)}
                                                    title={effect.emoji || 'Efecto'}
                                                >
                                                    {emoji}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        className='effect-picker-clear'
                                        onClick={() =>
                                            this.setState({ selectedEffectId: null, showEffectPicker: false })
                                        }
                                    >
                                        Sin efecto
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <Button
                        variant='contained'
                        disableElevation
                        color='primary'
                        className='inputbox-send-button'
                        aria-label='Send'
                        size='small'
                        onClick={this.handleSubmit}
                    >
                        {editMessageId ? <DoneIcon /> : <SendIcon />}
                    </Button>
                </div>
                {!isPrivateChat(chatId) && <CreatePollDialog onSend={this.handleSendPoll} />}
                <PasteFilesDialog files={files} onConfirm={this.handlePasteConfirm} onCancel={this.handlePasteCancel} />
                {/*<UpdateDraftDialog draft={newDraft} onConfirm={this.handleUpdateDraftConfirm} onCancel={this.handleUpdateDraftCancel}/>*/}
                <EditUrlDialog
                    open={openEditUrl}
                    defaultText={defaultText}
                    defaultUrl={defaultUrl}
                    onDone={this.handleDoneEditUrl}
                    onCancel={this.handleCancelEditUrl}
                />
                <EditMediaDialog
                    open={openEditMedia}
                    chatId={chatId}
                    messageId={editMessageId}
                    onDone={this.handleDoneEditMedia}
                    onCancel={this.handleCancelEditMedia}
                />
                <Dialog open={scheduleDialogOpen} onClose={this.handleScheduleCancel} maxWidth='xs' fullWidth>
                    <DialogTitle>Programar mensaje</DialogTitle>
                    <DialogContent>
                        <TextField
                            label='Fecha y hora'
                            type='datetime-local'
                            fullWidth
                            value={scheduleDateValue}
                            onChange={e => this.setState({ scheduleDateValue: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: new Date().toISOString().slice(0, 16) }}
                            style={{ marginTop: 8 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleScheduleCancel} color='default'>
                            Cancelar
                        </Button>
                        <Button
                            onClick={this.handleScheduleConfirm}
                            color='primary'
                            variant='contained'
                            disabled={!scheduleDateValue}
                        >
                            Enviar programado
                        </Button>
                    </DialogActions>
                </Dialog>
                <Dialog
                    open={this.state.liveLocationDialogOpen}
                    onClose={this.handleLiveLocationCancel}
                    maxWidth='xs'
                    fullWidth
                >
                    <DialogTitle>Compartir ubicación en directo</DialogTitle>
                    <DialogContent>
                        <p>Telegram actualizará tu posición mientras esta ventana permanezca abierta.</p>
                        <TextField
                            select
                            fullWidth
                            label='Duración'
                            value={this.state.liveLocationPeriod}
                            onChange={event => this.setState({ liveLocationPeriod: Number(event.target.value) })}
                            margin='normal'
                        >
                            {LIVE_LOCATION_PERIODS.map(period => (
                                <MenuItem key={period.value} value={period.value}>
                                    {period.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleLiveLocationCancel}>Cancelar</Button>
                        <Button color='primary' variant='contained' onClick={this.handleLiveLocationConfirm}>
                            Compartir
                        </Button>
                    </DialogActions>
                </Dialog>
                <LiveLocationPanel
                    ref={ref => {
                        this.liveLocationPanelRef = ref;
                    }}
                />
                <Snackbar
                    open={!!voiceError}
                    message={voiceError || ''}
                    autoHideDuration={4500}
                    onClose={() => this.setState({ voiceError: null })}
                />
            </div>
        );
    }
}

const enhance = compose(withStyles(styles, { withTheme: true }), withTranslation());

export default enhance(InputBoxControl);
