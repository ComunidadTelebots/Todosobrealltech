/* global BigInt */
/*
 * GramJsController — reemplaza TdLibController usando GramJS (layer actual)
 * con la misma interfaz de eventos para que los stores no necesiten cambios.
 */

import { EventEmitter } from 'events';
import { unstable_batchedUpdates } from 'react-dom';
import bigInt from 'big-integer';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram';
import { computeCheck } from 'telegram/Password';
import packageJson from '../../package.json';
import { getBrowser, getOSName } from '../Utils/Common';
import { translateUpdate } from '../Utils/GramJs/UpdateTranslator';
import {
    translateUser,
    translateChat,
    translateMessage,
    translateSticker,
    entityToTdlibChatId,
    peerToTdlibChatId,
    tdlibChatIdToInputPeer,
    translateStickerSetInfo,
    translateStickerSet,
    translateUserProfilePhoto,
    translateInstantView,
    mediaCache,
} from '../Utils/GramJs/EntityTranslator';
import { translateStoryItem } from '../Utils/GramJs/UpdateTranslator';
import { loadMessages, saveMessages } from '../Utils/MessageCache';
import * as InstantViewCache from '../Stores/InstantViewCache';
import { resolveLinkedCommunityChatId } from '../Utils/LinkedCommunity';
import { normalizeParticipantVideo } from '../Utils/GroupCallMedia';
import { isGroupCallSyncActive, runGroupCallOperation } from '../Utils/GroupCallMessageSync';

const ACCOUNTS_KEY = 'tg_gramjs_accounts';
const ACTIVE_ACCOUNT_KEY = 'tg_gramjs_active_account';
const SESSION_KEY_PREFIX = 'tg_gramjs_session_';
const SESSION_KEY_LEGACY = 'tg_gramjs_session'; // for migration

class GramJsController extends EventEmitter {
    constructor() {
        super();
        this.client = null;
        this.parameters = { useTestDC: false };
        this.disableLog = false;

        // Multi-account support — inline to avoid class-field ordering issues
        {
            const stored = localStorage.getItem(ACCOUNTS_KEY);
            let accounts = null;
            if (stored) {
                try {
                    accounts = JSON.parse(stored);
                } catch {}
            }
            if (!accounts) {
                const legacySession = localStorage.getItem(SESSION_KEY_LEGACY);
                if (legacySession) localStorage.setItem(`${SESSION_KEY_PREFIX}0`, legacySession);
                accounts = [{ index: 0, sessionKey: `${SESSION_KEY_PREFIX}0`, userId: null, name: null, phone: null }];
                localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
            }
            this._accounts = accounts;
        }
        this._activeAccountIndex = parseInt(localStorage.getItem(ACTIVE_ACCOUNT_KEY) || '0', 10);

        // Cachés locales para reverse-lookup
        this._entityCache = new Map(); // chatId → entity raw (para access hash)
        this._chatCache = new Map(); // chatId → TDLib chat object
        this._userCache = new Map(); // userId → TDLib user object

        this._downloadedFiles = new Map();
        this._downloadingFiles = new Set();

        this._initialDialogsLoaded = false;
        this._initialDialogsResolver = null;
        this._initialDialogsPromise = new Promise(resolve => {
            this._initialDialogsResolver = resolve;
        });

        // Chat folders (dialog filters)
        this._folderChats = new Map(); // folderId → Set<chatId>
        this._chatFilters = [];

        // Sticker set access hashes for getStickerSet lookups
        this._stickerSetAccessHashes = new Map(); // String(id) → BigInt accessHash

        // Custom emoji document cache
        this._customEmojiCache = new Map(); // String(document_id) → translated sticker object
        this._customEmojiFetchQueue = new Set(); // IDs pending batch fetch
        this._customEmojiFetchTimer = null;
        this._sponsoredMessagesCache = new Map();
        this._downloadReconnects = new Map();
        this._downloadReconnectAt = new Map();
        this._downloadDeferUntil = new Map();
        this._qrPollGeneration = 0;
        this._qrLoginCompleting = false;

        // Auth state internos
        this._phone = null;
        this._phoneHash = null;
        this._addAccountPreviousIndex = null; // set while adding a new account

        this.setMaxListeners(Infinity);
    }

    // ─── Multi-account helpers ───────────────────────────────────────────────

    _saveAccounts = () => {
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(this._accounts));
        this.clientUpdate({
            '@type': 'clientUpdateAccounts',
            accounts: [...this._accounts],
            activeIndex: this._activeAccountIndex,
        });
    };

    _getActiveSessionKey = () => {
        const account = this._accounts.find(a => a.index === this._activeAccountIndex);
        return account ? account.sessionKey : `${SESSION_KEY_PREFIX}0`;
    };

    _getNextAccountIndex = () => {
        const used = new Set(this._accounts.map(a => a.index));
        let i = 0;
        while (used.has(i)) i++;
        return i;
    };

    _saveAccountInfo = me => {
        const account = this._accounts.find(a => a.index === this._activeAccountIndex);
        if (account) {
            account.userId = Number(me.id);
            account.name = [me.firstName, me.lastName].filter(Boolean).join(' ') || null;
            account.phone = me.phone ? `+${me.phone}` : null;
            this._saveAccounts();
        }
    };

    _clearCaches = () => {
        this._entityCache.clear();
        this._chatCache.clear();
        this._userCache.clear();
        this._downloadedFiles.clear();
        this._downloadingFiles.clear();
        this._folderChats.clear();
        this._chatFilters = [];
        this._stickerSetAccessHashes.clear();
        this._sponsoredMessagesCache.clear();
    };

    _switchToAccount = async index => {
        this._activeAccountIndex = index;
        localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(index));
        try {
            if (this.client) await this.client.disconnect();
        } catch {}
        this._clearCaches();
        this._resetInitialDialogsPromise();
        this._emitUpdate({
            '@type': 'updateAuthorizationState',
            authorization_state: { '@type': 'authorizationStateLoggingOut' },
        });
        this._emitUpdate({
            '@type': 'updateAuthorizationState',
            authorization_state: { '@type': 'authorizationStateClosed' },
        });
        // ApplicationStore handles authorizationStateClosed → calls init() → _startClient()
    };

    getAccounts = () => this._accounts.map(a => ({ ...a }));

    isAddingAccount = () => this._addAccountPreviousIndex !== null;

    addAccount = async () => {
        this._addAccountPreviousIndex = this._activeAccountIndex;
        const nextIndex = this._getNextAccountIndex();
        this._accounts.push({
            index: nextIndex,
            sessionKey: `${SESSION_KEY_PREFIX}${nextIndex}`,
            userId: null,
            name: null,
            phone: null,
        });
        this._saveAccounts();
        await this._switchToAccount(nextIndex);
    };

    cancelAddAccount = async () => {
        const prevIndex = this._addAccountPreviousIndex;
        this._addAccountPreviousIndex = null;
        const currentIndex = this._activeAccountIndex;
        // Remove the empty new account
        const account = this._accounts.find(a => a.index === currentIndex);
        if (account) localStorage.removeItem(account.sessionKey);
        this._accounts = this._accounts.filter(a => a.index !== currentIndex);
        this._saveAccounts();
        // Switch back to previous account
        const target =
            prevIndex !== null && this._accounts.find(a => a.index === prevIndex)
                ? prevIndex
                : this._accounts.length > 0
                ? this._accounts[0].index
                : null;
        if (target !== null) {
            await this._switchToAccount(target);
        } else {
            await this._logOut();
        }
    };

    switchAccount = async index => {
        if (index === this._activeAccountIndex) return;
        await this._switchToAccount(index);
    };

    removeAccount = async index => {
        const account = this._accounts.find(a => a.index === index);
        if (account) localStorage.removeItem(account.sessionKey);
        this._accounts = this._accounts.filter(a => a.index !== index);
        this._saveAccounts();

        if (this._activeAccountIndex === index) {
            const remaining = this._accounts[0];
            if (remaining) {
                await this._switchToAccount(remaining.index);
            } else {
                // No accounts left — full server-side logout
                await this._logOut();
            }
        }
    };

    // ─── Ciclo de vida ───────────────────────────────────────────────────────

    init = location => {
        this.clientUpdate({ '@type': 'clientUpdateTdLibDatabaseExists', exists: false });
        this._startClient();
    };

    _startClient = async () => {
        const apiId = parseInt(process.env.REACT_APP_TELEGRAM_API_ID, 10);
        const apiHash = process.env.REACT_APP_TELEGRAM_API_HASH;

        this.apiId = apiId;
        this.apiHash = apiHash;

        if (!apiId || !apiHash) {
            console.error('[GramJs] Faltan credenciales API. Configura .env');
            return;
        }

        // Simular el flujo de estados de auth que esperan los stores
        this._emitUpdate({
            '@type': 'updateAuthorizationState',
            authorization_state: { '@type': 'authorizationStateWaitTdlibParameters' },
        });

        this._clearCaches();
        const sessionKey = this._getActiveSessionKey();
        let savedSession = localStorage.getItem(sessionKey) || '';
        // Fallback: si la clave nueva está vacía, intentar con la clave legacy
        if (!savedSession) {
            const legacy = localStorage.getItem(SESSION_KEY_LEGACY) || '';
            if (legacy) {
                savedSession = legacy;
                localStorage.setItem(sessionKey, legacy);
            }
        }
        const session = new StringSession(savedSession);

        this.client = new TelegramClient(session, apiId, apiHash, this._buildClientOptions());
        if (this.client.setLogLevel) this.client.setLogLevel('error');

        try {
            await this.client.connect();
        } catch (err) {
            console.error('[GramJs] Error de conexión:', err);
            return;
        }

        this._saveSession();

        // Simular waitEncryptionKey para mantener compatibilidad con ApplicationStore
        this._emitUpdate({
            '@type': 'updateAuthorizationState',
            authorization_state: { '@type': 'authorizationStateWaitEncryptionKey' },
        });

        if (await this.client.isUserAuthorized()) {
            await this._onAuthorized();
        } else {
            this._emitUpdate({
                '@type': 'updateAuthorizationState',
                authorization_state: { '@type': 'authorizationStateWaitPhoneNumber' },
            });
        }
    };

    _onAuthorized = async () => {
        this._addAccountPreviousIndex = null; // clear add-account mode on successful login
        this._saveSession();
        this._setupUpdateHandler();

        this._emitUpdate({ '@type': 'updateConnectionState', state: { '@type': 'connectionStateConnecting' } });
        this._emitUpdate({ '@type': 'updateConnectionState', state: { '@type': 'connectionStateReady' } });
        this._emitUpdate({
            '@type': 'updateAuthorizationState',
            authorization_state: { '@type': 'authorizationStateReady' },
        });

        await this._loadInitialData();
    };

    _saveSession = () => {
        try {
            const str = this.client.session.save();
            if (str) localStorage.setItem(this._getActiveSessionKey(), str);
        } catch (e) {
            /* no-op */
        }
    };

    _setupUpdateHandler = () => {
        // Escuchar todos los updates raw de MTProto
        this.client.addEventHandler(event => {
            const raw = event.originalUpdate || event;
            if (!raw) return;

            const rawCls = raw.className || raw._;

            if (raw instanceof Api.UpdateLoginToken || rawCls === 'UpdateLoginToken' || rawCls === 'updateLoginToken') {
                this._completeQrLoginFromUpdate();
                return;
            }

            // Actualizar usuarios/chats que vengan en el update
            if (raw.users) raw.users.forEach(u => this._cacheUser(u));
            if (raw.chats) raw.chats.forEach(c => this._cacheEntity(c));

            const tdUpdate = translateUpdate(raw);
            if (tdUpdate) {
                this._emitUpdate(tdUpdate);
                const updateType = tdUpdate['@type'];

                // When a new message arrives, also update the chat's last_message in the dialog list
                if (updateType === 'updateNewMessage') {
                    const { message } = tdUpdate;
                    if (message) {
                        const chat = this._chatCache.get(message.chat_id);
                        if (chat) {
                            chat.last_message = message;
                            // Increment unread count for incoming messages so the badge updates
                            if (!message.is_outgoing) {
                                chat.unread_count = (chat.unread_count || 0) + 1;
                                this._emitUpdate({
                                    '@type': 'updateChatReadInbox',
                                    chat_id: message.chat_id,
                                    last_read_inbox_message_id: chat.last_read_inbox_message_id || 0,
                                    unread_count: chat.unread_count,
                                });
                            }
                        }
                        this._emitUpdate({
                            '@type': 'updateChatLastMessage',
                            chat_id: message.chat_id,
                            last_message: message,
                            order: String(message.date * 1000),
                        });
                    }
                }

                // When a poll result changes (others voted), find all messages with that poll
                // and emit updateMessageContent so Poll.js re-renders with new vote counts
                if (updateType === 'updatePoll') {
                    const pollId = tdUpdate.poll && tdUpdate.poll.id;
                    if (pollId) {
                        import('../Stores/MessageStore')
                            .then(({ default: MessageStore }) => {
                                MessageStore.items.forEach((chatMessages, chatId) => {
                                    chatMessages.forEach((msg, msgId) => {
                                        if (
                                            msg.content &&
                                            msg.content['@type'] === 'messagePoll' &&
                                            msg.content.poll &&
                                            String(msg.content.poll.id) === String(pollId)
                                        ) {
                                            this._emitUpdate({
                                                '@type': 'updateMessageContent',
                                                chat_id: chatId,
                                                message_id: msgId,
                                                new_content: { ...msg.content, poll: tdUpdate.poll },
                                            });
                                        }
                                    });
                                });
                            })
                            .catch(() => {});
                    }
                }

                // When a message is edited remotely, also emit updateMessageEdited so the
                // "edited" label and edit_date get refreshed in the UI
                if (updateType === 'updateMessageContent') {
                    const msg = raw.message;
                    if (msg && msg.editDate) {
                        this._emitUpdate({
                            '@type': 'updateMessageEdited',
                            chat_id: tdUpdate.chat_id,
                            message_id: tdUpdate.message_id,
                            edit_date: msg.editDate,
                            reply_markup: null,
                        });
                    }
                }

                // Llamadas VoIP — despachar al CallController
                if (updateType === 'updatePhoneCall') {
                    import('./CallController')
                        .then(({ default: callController }) => {
                            callController.onPhoneCallUpdate(tdUpdate);
                        })
                        .catch(() => {});
                }
                if (updateType === 'updatePhoneCallSignalingData') {
                    import('./CallController')
                        .then(({ default: callController }) => {
                            callController.onSignalingData(tdUpdate.data);
                        })
                        .catch(() => {});
                }
            }
        });
    };

    _loadInitialData = async () => {
        try {
            const me = await this.client.getMe();
            this._cacheUser(me);
        } catch (e) {
            console.warn('[GramJs] No se pudo obtener usuario propio', e);
        }

        // Emitir updateOption con el user id propio y guardar info de cuenta
        const me = await this.client.getMe().catch(() => null);
        if (me) {
            this._saveAccountInfo(me);
            this._emitUpdate({
                '@type': 'updateOption',
                name: 'my_id',
                value: { '@type': 'optionValueInteger', value: Number(me.id) },
            });
        }

        // Cargar lista de diálogos inicial
        await this._loadDialogs();

        // Cargar carpetas (no bloquea si falla)
        this._loadDialogFilters().catch(() => {});
    };

    _loadDialogs = async (offsetDate = undefined, offsetId = undefined, limit = 100) => {
        try {
            const dialogs = await this.client.getDialogs({
                limit,
                offsetDate: offsetDate || undefined,
                offsetId: offsetId || undefined,
            });

            // Collect sender user IDs from last messages so we can resolve them
            const senderUserIds = new Set();

            for (const dialog of dialogs) {
                const entity = dialog.entity;
                if (!entity) continue;

                this._cacheEntity(entity);

                // Track sender of last message in groups/channels
                const msg = dialog.message;
                if (msg && msg.fromId) {
                    const fc = msg.fromId.className || msg.fromId._;
                    if (fc === 'PeerUser') {
                        senderUserIds.add(Number(msg.fromId.userId));
                    }
                }

                const cls = entity.className || entity._;

                if (cls === 'User') {
                    const tdUser = translateUser(entity);
                    if (tdUser) {
                        this._userCache.set(tdUser.id, tdUser);
                        this._emitUpdate({ '@type': 'updateUser', user: tdUser });
                    }
                } else if (cls === 'Chat' || cls === 'ChatForbidden') {
                    const status = entity.creator
                        ? { '@type': 'chatMemberStatusCreator', is_member: true }
                        : entity.left
                        ? { '@type': 'chatMemberStatusLeft' }
                        : { '@type': 'chatMemberStatusMember' };
                    this._emitUpdate({
                        '@type': 'updateBasicGroup',
                        basic_group: {
                            '@type': 'basicGroup',
                            id: Number(entity.id),
                            member_count: entity.participantsCount || 0,
                            status,
                            is_active: !entity.deactivated,
                            upgraded_to_supergroup_id: 0,
                        },
                    });
                } else if (cls === 'Channel' || cls === 'ChannelForbidden') {
                    const status = entity.creator
                        ? { '@type': 'chatMemberStatusCreator', is_member: true }
                        : entity.left
                        ? { '@type': 'chatMemberStatusLeft' }
                        : entity.adminRights
                        ? {
                              '@type': 'chatMemberStatusAdministrator',
                              can_be_edited: false,
                              can_change_info: true,
                              can_post_messages: true,
                              can_edit_messages: true,
                              can_delete_messages: true,
                              can_invite_users: true,
                              can_restrict_members: true,
                              can_pin_messages: true,
                              can_promote_members: false,
                          }
                        : { '@type': 'chatMemberStatusMember' };
                    this._emitUpdate({
                        '@type': 'updateSupergroup',
                        supergroup: {
                            '@type': 'supergroup',
                            id: Number(entity.id),
                            username: entity.username || '',
                            date: entity.date || 0,
                            status,
                            member_count: entity.participantsCount || 0,
                            has_linked_chat: false,
                            has_location: false,
                            sign_messages: !!entity.signatures,
                            is_slow_mode_enabled: false,
                            is_channel: !entity.megagroup,
                            is_verified: !!entity.verified,
                            restriction_reason: '',
                            is_scam: !!entity.scam,
                        },
                    });
                }

                const tdChat = translateChat(entity, dialog);
                if (tdChat) {
                    this._chatCache.set(tdChat.id, tdChat);
                    this._emitUpdate({ '@type': 'updateNewChat', chat: tdChat });
                    if (tdChat.last_message) {
                        this._emitUpdate({
                            '@type': 'updateChatLastMessage',
                            chat_id: tdChat.id,
                            last_message: tdChat.last_message,
                            order: tdChat.order,
                        });
                    }
                }
            }

            // Resolve last-message senders that are not yet in UserStore
            // (MTProto returns them in the response; GramJS caches them internally)
            const missingSenders = [...senderUserIds].filter(id => !this._userCache.has(id));
            if (missingSenders.length > 0) {
                this._resolveSenderUsers(missingSenders).catch(() => {});
            }

            // Notificar que los diálogos están listos
            this.clientUpdate({ '@type': 'clientUpdateDialogsReady' });
        } catch (err) {
            console.error('[GramJs] Error cargando diálogos:', err);
        } finally {
            this._initialDialogsLoaded = true;
            if (this._initialDialogsResolver) {
                this._initialDialogsResolver();
            }
        }
    };

    // Fetch and emit users that sent last messages in groups but weren't in the dialog entity list
    _resolveSenderUsers = async userIds => {
        // Batch resolve via GramJS entity cache first, then API fallback
        const toFetch = [];
        for (const id of userIds) {
            const cached = this._entityCache.get(id);
            if (cached) {
                const tdUser = translateUser(cached);
                if (tdUser) {
                    this._userCache.set(tdUser.id, tdUser);
                    this._emitUpdate({ '@type': 'updateUser', user: tdUser });
                }
            } else {
                toFetch.push(id);
            }
        }

        // Fetch remaining ones from API in small batches
        for (let i = 0; i < toFetch.length; i += 10) {
            const batch = toFetch.slice(i, i + 10);
            await Promise.all(
                batch.map(async id => {
                    try {
                        const entity = await this.client.getEntity(BigInt(id));
                        if (entity) {
                            this._cacheEntity(entity);
                            const tdUser = translateUser(entity);
                            if (tdUser) {
                                this._userCache.set(tdUser.id, tdUser);
                                this._emitUpdate({ '@type': 'updateUser', user: tdUser });
                            }
                        }
                    } catch {}
                }),
            );
        }
    };

    _inputPeerToTdlibChatId = peer => {
        if (!peer) return null;
        const cls = peer.className;
        if (cls === 'InputPeerUser') return Number(peer.userId);
        if (cls === 'InputPeerChat') return -Number(peer.chatId);
        if (cls === 'InputPeerChannel') return -1000000000000 - Number(peer.channelId);
        return null;
    };

    _loadDialogFilters = async () => {
        try {
            const result = await this.client.invoke(new Api.messages.GetDialogFilters());
            const rawFilters = result.filters || result;
            const filterArray = Array.isArray(rawFilters) ? rawFilters : [rawFilters];

            const filters = [];
            for (const filter of filterArray) {
                const cls = filter.className;
                if (cls === 'DialogFilterDefault' || cls === 'DialogFilterChatlist') continue;
                if (!filter.id) continue;

                const chatIds = new Set();
                const peers = [...(filter.pinnedPeers || []), ...(filter.includePeers || [])];
                for (const peer of peers) {
                    const id = this._inputPeerToTdlibChatId(peer);
                    if (id !== null) chatIds.add(id);
                }

                const rawTitle = filter.title;
                const title = typeof rawTitle === 'string' ? rawTitle : rawTitle?.text || 'Folder';

                this._folderChats.set(filter.id, chatIds);
                filters.push({ id: filter.id, title });
            }

            this._chatFilters = filters;
            if (filters.length > 0) {
                this.clientUpdate({ '@type': 'clientUpdateChatFilters', filters });
            }
        } catch (e) {
            console.warn('[GramJs] getDialogFilters error:', e);
        }
    };

    _cacheEntity = entity => {
        if (!entity) return;
        const chatId = entityToTdlibChatId(entity);
        if (chatId) this._entityCache.set(chatId, entity);
    };

    _cacheUser = user => {
        if (!user) return;
        this._cacheEntity(user);
        const tdUser = translateUser(user);
        if (tdUser) this._userCache.set(tdUser.id, tdUser);
        return tdUser;
    };

    _cacheAndEmitUsers = users => {
        const emitted = new Set();
        for (const user of users || []) {
            const tdUser = this._cacheUser(user);
            if (!tdUser || emitted.has(tdUser.id)) continue;
            emitted.add(tdUser.id);
            this._emitUpdate({ '@type': 'updateUser', user: tdUser });
        }
    };

    // ─── Interfaz pública (compatible con TdLibController) ──────────────────

    clientUpdate = update => {
        if (!this.disableLog) console.log('[GramJs] clientUpdate', update);
        unstable_batchedUpdates(() => this.emit('clientUpdate', update));
    };

    // Queue-based deferred batching: accumulates all synchronous _emitUpdate calls
    // from a single GramJS event and flushes them in ONE React render cycle via
    // a microtask. Prevents removeChild crashes caused by interleaved parent
    // (DialogsList reorder) and child (DialogContent forceUpdate) updates.
    _pendingUpdates = [];
    _flushScheduled = false;

    _emitUpdate = update => {
        if (!this.disableLog) console.log('[GramJs] update', update);
        this._pendingUpdates.push(update);
        if (!this._flushScheduled) {
            this._flushScheduled = true;
            Promise.resolve().then(this._flushPendingUpdates);
        }
    };

    _flushPendingUpdates = () => {
        this._flushScheduled = false;
        const updates = this._pendingUpdates.splice(0);
        unstable_batchedUpdates(() => {
            updates.forEach(u => this.emit('update', u));
        });
    };

    send = async request => {
        const type = request['@type'];
        if (!this.disableLog) console.log('[GramJs] send', request);

        try {
            return await this._dispatch(type, request);
        } catch (err) {
            console.error('[GramJs] send error', type, err);
            throw err;
        }
    };

    _dispatch = async (type, req) => {
        switch (type) {
            // ── No-ops (ya gestionados en init) ─────────────────────────────
            case 'setTdlibParameters':
            case 'checkDatabaseEncryptionKey':
            case 'setLogTagVerbosityLevel':
            case 'setOption':
                return {};

            // ── Auth ─────────────────────────────────────────────────────────
            case 'setAuthenticationPhoneNumber':
                return this._sendPhone(req);
            case 'checkAuthenticationCode':
                return this._checkCode(req);
            case 'checkAuthenticationPassword':
                return this._checkPassword(req);
            case 'resendAuthenticationCode':
                return this._resendCode();
            case 'requestQrCodeAuthentication':
                return this._requestQrCodeAuthentication(req);
            case 'cancelQrCodeAuthentication':
                return this._cancelQrCodeAuthentication();
            case 'logOut':
                return this._logOut();
            case 'destroy':
                return this._logOut();
            case 'getCountryCode':
                return this._getCountryCode();

            // ── Multi-cuenta ──────────────────────────────────────────────────
            case 'getAccounts':
                return { '@type': 'accounts', accounts: this.getAccounts(), activeIndex: this._activeAccountIndex };
            case 'addAccount':
                await this.addAccount();
                return {};
            case 'switchAccount':
                await this.switchAccount(req.index);
                return {};
            case 'removeAccount':
                await this.removeAccount(req.index);
                return {};

            // ── Chats ─────────────────────────────────────────────────────────
            case 'getChats':
                return this._getChats(req);
            case 'getChat':
                return this._getChat(req);
            case 'searchPublicChat':
                return this._searchPublicChat(req);
            case 'openTelegramLink':
                return this._openTelegramLink(req);
            case 'createPrivateChat':
                return this._createPrivateChat(req);
            case 'getContacts':
                return this._getContacts();
            case 'createGroupChat':
                return this._createGroupChat(req);
            case 'createChannel':
                return this._createChannel(req);

            // ── Mensajes ──────────────────────────────────────────────────────
            case 'getChatHistory':
                return this._getChatHistory(req);
            case 'getMessages':
                return this._getMessages(req);
            case 'getMessage':
                return this._getMessage(req);
            case 'forwardMessages':
                return this._forwardMessages(req);
            case 'sendMessage':
                return this._sendMessage(req);
            case 'getAvailableMessageEffects':
                return this._getAvailableMessageEffects();
            case 'sendGifByUrl':
                return this._sendGifByUrl(req);
            case 'setChatMessageAutoDeleteTime':
                return this._setChatMessageAutoDeleteTime(req);
            case 'getDefaultMessageAutoDeleteTime':
                return this._getDefaultMessageAutoDeleteTime();
            case 'setDefaultMessageAutoDeleteTime':
                return this._setDefaultMessageAutoDeleteTime(req);
            case 'getChannelStats':
                return this._getChannelStats(req);
            case 'editMessageText':
                return this._editMessage(req);
            case 'deleteMessages':
                return this._deleteMessages(req);
            case 'viewMessages':
                return this._viewMessages(req);
            case 'getChatScheduledMessages':
                return this._getChatScheduledMessages(req);
            case 'sendChatScheduledMessages':
                return this._sendChatScheduledMessages(req);
            case 'deleteChatScheduledMessages':
                return this._deleteChatScheduledMessages(req);
            case 'readAllChatMentions':
                return this._readAllChatMentions(req);
            case 'reportChat':
                return this._reportChat(req);
            case 'pinChatMessage':
                return this._pinChatMessage(req);
            case 'unpinChatMessage':
                return this._unpinChatMessage(req);
            case 'unpinAllChatMessages':
                return this._unpinAllChatMessages(req);
            case 'translateText':
                return this._translateText(req);
            case 'toggleChatTranslations':
                return this._toggleChatTranslations(req);
            case 'transcribeAudio':
                return this._transcribeAudio(req);
            case 'rateTranscribedAudio':
                return this._rateTranscribedAudio(req);

            // ── Usuarios ──────────────────────────────────────────────────────
            case 'getUser':
                return this._getUser(req);
            case 'getUserFullInfo':
                return this._getUserFullInfo(req);
            case 'getUserProfilePhotos':
                return this._getUserProfilePhotos(req);
            case 'getSupergroupFullInfo':
                return this._getSupergroupFullInfo(req);
            case 'getBasicGroupFullInfo':
                return this._getBasicGroupFullInfo(req);
            case 'blockUser':
                return this._blockUser(req);
            case 'unblockUser':
                return this._unblockUser(req);
            case 'getMessageLink':
                return this._getMessageLink(req);
            case 'getActiveSessions':
                return this._getActiveSessions(req);
            case 'getMessageReadParticipants':
                return this._getMessageReadParticipants(req);
            case 'getMessageReactors':
                return this._getMessageReactors(req);
            case 'getChatThemes':
                return this._getChatThemes(req);
            case 'setChatTheme':
                return this._setChatTheme(req);
            case 'getSimilarChannels':
                return this._getSimilarChannels(req);
            case 'getPrivacy':
                return this._getPrivacy(req);
            case 'setPrivacy':
                return this._setPrivacy(req);
            case 'getGlobalPrivacySettings':
                return this._getGlobalPrivacySettings(req);
            case 'setGlobalPrivacySettings':
                return this._setGlobalPrivacySettings(req);
            case 'getAccountTTL':
                return this._getAccountTTL(req);
            case 'setAccountTTL':
                return this._setAccountTTL(req);
            case 'getAutoDownloadSettings':
                return this._getAutoDownloadSettings(req);
            case 'saveAutoDownloadSettings':
                return this._saveAutoDownloadSettings(req);
            case 'getContentSettings':
                return this._getContentSettings(req);
            case 'setContentSettings':
                return this._setContentSettings(req);
            case 'getAdminLog':
                return this._getAdminLog(req);
            case 'editAdmin':
                return this._editAdmin(req);
            case 'getJoinRequests':
                return this._getJoinRequests(req);
            case 'approveJoinRequest':
                return this._approveJoinRequest(req);
            case 'toggleJoinToSend':
                return this._toggleJoinToSend(req);
            case 'toggleJoinRequest':
                return this._toggleJoinRequest(req);
            case 'getFavedStickers':
                return this._getFavedStickers(req);
            case 'faveSticker':
                return this._faveSticker(req);
            case 'getEmojiGroups':
                return this._getEmojiGroups(req);
            case 'getAnimatedEmojiStickerSet':
                return this._getAnimatedEmojiStickerSet(req);
            case 'updateBusinessGreetingMessage':
                return this._updateBusinessGreetingMessage(req);
            case 'updateBusinessAwayMessage':
                return this._updateBusinessAwayMessage(req);
            case 'updateBusinessWorkHours':
                return this._updateBusinessWorkHours(req);
            case 'updateBusinessLocation':
                return this._updateBusinessLocation(req);
            case 'updateBusinessIntro':
                return this._updateBusinessIntro(req);
            case 'getQuickReplies':
                return this._getQuickReplies(req);
            case 'createQuickReply':
                return this._createQuickReply(req);
            case 'editQuickReply':
                return this._editQuickReply(req);
            case 'deleteQuickReply':
                return this._deleteQuickReply(req);
            case 'getBusinessConnectedBots':
                return this._getBusinessConnectedBots(req);
            case 'updateBusinessConnectedBot':
                return this._updateBusinessConnectedBot(req);
            case 'getGroupCallInfo':
                return this._getGroupCallInfo(req);
            case 'createGroupCall':
                return this._createGroupCall(req);
            case 'startScheduledGroupCall':
                return this._startScheduledGroupCall(req);
            case 'editGroupCallTitle':
                return this._editGroupCallTitle(req);
            case 'toggleGroupCallJoinMuted':
                return this._toggleGroupCallJoinMuted(req);
            case 'exportGroupCallInvite':
                return this._exportGroupCallInvite(req);
            case 'discardGroupCall':
                return this._discardGroupCall(req);
            case 'inviteToGroupCall':
                return this._inviteToGroupCall(req);
            case 'toggleGroupCallRecord':
                return this._toggleGroupCallRecord(req);
            case 'subscribeScheduledGroupCall':
                return this._subscribeScheduledGroupCall(req);
            case 'editGroupCallParticipant':
                return this._editGroupCallParticipant(req);
            case 'joinGroupCall':
                return this._joinGroupCall(req);
            case 'leaveGroupCall':
                return this._leaveGroupCall(req);
            case 'setGroupCallSelfMuted':
                return this._setGroupCallSelfMuted(req);
            case 'checkGroupCallConnection':
                return this._checkGroupCallConnection(req);
            case 'getGroupCallAudioSources':
                return this._getGroupCallAudioSources(req);
            case 'joinGroupCallPresentation':
                return this._joinGroupCallPresentation(req);
            case 'leaveGroupCallPresentation':
                return this._leaveGroupCallPresentation(req);
            case 'getAttachMenuBots':
                return this._getAttachMenuBots(req);
            case 'getBotApp':
                return this._getBotApp(req);
            case 'requestAppWebView':
                return this._requestAppWebView(req);
            case 'requestSimpleWebView':
                return this._requestSimpleWebView(req);
            case 'getMessageStats':
                return this._getMessageStats(req);
            case 'getMegagroupStats':
                return this._getMegagroupStats(req);
            case 'getMessagePublicForwards':
                return this._getMessagePublicForwards(req);
            case 'getBroadcastRevenueStats':
                return this._getBroadcastRevenueStats(req);
            case 'getStarsRevenueStats':
                return this._getStarsRevenueStats(req);
            case 'sendStoryReaction':
                return this._sendStoryReaction(req);
            case 'toggleStoryPinned':
                return this._toggleStoryPinned(req);
            case 'getPinnedStories':
                return this._getPinnedStories(req);
            case 'getStarsTopupOptions':
                return this._getStarsTopupOptions(req);
            case 'getPaymentForm':
                return this._getPaymentForm(req);
            case 'sendStarsForm':
                return this._sendStarsForm(req);
            case 'getSponsoredMessages':
                return this._getSponsoredMessages(req);
            case 'viewSponsoredMessage':
                return this._viewSponsoredMessage(req);
            case 'clickSponsoredMessage':
                return this._clickSponsoredMessage(req);
            case 'reportSponsoredMessage':
                return this._reportSponsoredMessage(req);
            case 'exportChatlistInvite':
                return this._exportChatlistInvite(req);
            case 'sendLiveLocation':
                return this._sendLiveLocation(req);
            case 'editLiveLocation':
                return this._editLiveLocation(req);
            case 'getChannelAdmins':
                return this._getChannelAdmins(req);
            case 'getSearchCounters':
                return this._getSearchCounters(req);
            case 'terminateSession':
                return this._terminateSession(req);
            case 'terminateAllOtherSessions':
                return this._terminateAllOtherSessions(req);
            case 'kickGroupMember':
                return this._kickGroupMember(req);
            case 'banGroupMember':
                return this._banGroupMember(req);
            case 'setChatDescription':
                return this._setChatDescription(req);
            case 'setChatProtectedContent':
                return this._setChatProtectedContent(req);
            case 'leaveChat':
                return this._leaveChat(req);
            case 'getInviteLink':
                return this._getInviteLink(req);

            // ── Acciones ──────────────────────────────────────────────────────
            case 'sendChatAction':
                return this._sendChatAction(req);
            case 'toggleChatIsPinned':
                return this._togglePin(req);
            case 'setChatNotificationSettings':
                return this._setChatNotificationSettings(req);
            case 'toggleChatIsMarkedAsUnread':
                return this._toggleChatIsMarkedAsUnread(req);
            case 'setChatDraftMessage':
                return this._setChatDraftMessage(req);
            case 'setChatMessageTtl':
                return this._setChatMessageTtl(req);
            case 'getTwoStepVerificationStatus':
                return this._getTwoStepVerificationStatus();
            case 'setTwoStepVerificationPassword':
                return this._setTwoStepVerificationPassword(req);

            // ── Búsqueda ──────────────────────────────────────────────────────
            case 'searchMessages':
                return this._searchMessages(req);
            case 'searchChatMessages':
                return this._searchChatMessages(req);
            case 'getTopChats':
                return this._getTopChats(req);
            case 'searchChats':
                return this._searchChats(req);
            case 'addRecentlyFoundChat':
                return this._addRecentlyFoundChat(req);
            case 'clearRecentlyFoundChats':
                return this._clearRecentlyFoundChats(req);

            // ── Opciones de idioma ────────────────────────────────────────────
            case 'getLocalizationTargetInfo':
                return {
                    '@type': 'localizationTargetInfo',
                    language_packs: [
                        {
                            '@type': 'languagePackInfo',
                            id: 'en',
                            base_language_pack_id: '',
                            name: 'English',
                            native_name: 'English',
                            plural_code: 'en',
                            is_official: true,
                            is_rtl: false,
                            is_beta: false,
                            is_installed: true,
                            total_string_count: 0,
                            translated_string_count: 0,
                            translation_url: '',
                        },
                        {
                            '@type': 'languagePackInfo',
                            id: 'es',
                            base_language_pack_id: '',
                            name: 'Spanish',
                            native_name: 'Español',
                            plural_code: 'es',
                            is_official: true,
                            is_rtl: false,
                            is_beta: false,
                            is_installed: true,
                            total_string_count: 0,
                            translated_string_count: 0,
                            translation_url: '',
                        },
                    ],
                };
            case 'getLanguagePackInfo':
                return {
                    '@type': 'languagePackInfo',
                    id: 'en',
                    base_language_pack_id: '',
                    name: 'English',
                    native_name: 'English',
                    plural_code: 'en',
                    is_official: true,
                    is_rtl: false,
                    is_beta: false,
                    is_installed: true,
                    total_string_count: 0,
                    translated_string_count: 0,
                    translation_url: '',
                };
            case 'getLanguagePackStrings':
                return { '@type': 'languagePackStrings', strings: [] };
            case 'synchronizeLanguagePack':
                return {};

            // ── Stickers ──────────────────────────────────────────────────────
            case 'getInstalledStickerSets':
                return this._getInstalledStickerSets(req);
            case 'getStickerSet':
                return this._getStickerSet(req);
            case 'getRecentStickers':
                return this._getRecentStickers(req);
            case 'getCustomEmojiDocuments':
                return this._getCustomEmojiDocuments(req);

            // ── Stories ──────────────────────────────────────────────────────
            case 'getActiveStories':
                return this._getActiveStories(req);
            case 'getChatActiveStories':
                return this._getChatActiveStories(req);
            case 'getStory':
                return this._getStory(req);
            case 'readStories':
                return this._readStories(req);
            case 'getStoryViewers':
                return this._getStoryViewers(req);
            case 'sendStory':
                return this._sendStory(req);
            case 'sendStoryAlbum':
                return this._sendStoryAlbum(req);

            // ── Saved Messages folders ────────────────────────────────────────
            case 'getSavedDialogs':
                return this._getSavedDialogs(req);
            case 'getPinnedSavedDialogs':
                return this._getPinnedSavedDialogs(req);
            case 'getSavedHistory':
                return this._getSavedHistory(req);
            case 'toggleSavedDialogIsPinned':
                return this._toggleSavedDialogIsPinned(req);

            // ── Stargifts ─────────────────────────────────────────────────────
            case 'getSavedStarGifts':
                return this._getSavedStarGifts(req);
            case 'saveStarGift':
                return this._saveStarGift(req);
            case 'convertStarGift':
                return this._convertStarGift(req);
            case 'upgradeStarGift':
                return this._upgradeStarGift(req);
            case 'transferStarGift':
                return this._transferStarGift(req);
            case 'joinChat':
                return this._joinChat(req);

            // ── Forum Topics ──────────────────────────────────────────────────
            case 'getForumTopics':
                return this._getForumTopics(req);
            case 'createForumTopic':
                return this._createForumTopic(req);
            case 'editForumTopic':
                return this._editForumTopic(req);

            // ── Inline bots ───────────────────────────────────────────────────
            case 'getInlineBotResults':
                return this._getInlineBotResults(req);
            case 'sendInlineBotResult':
                return this._sendInlineBotResult(req);

            // ── Notificaciones ────────────────────────────────────────────────
            case 'setNotificationGroup':
                return {};
            case 'removeNotification':
                return {};

            // ── Reacciones ────────────────────────────────────────────────────
            case 'sendMessageReaction':
                return this._sendReaction(req);
            case 'readAllMessageReactions':
                return this._readAllMessageReactions(req);
            case 'getAvailableReactions':
                return this._getAvailableReactions();
            case 'setDefaultReaction':
                return this._setDefaultReaction(req);
            case 'sendGifByUrl':
                return this._sendGifByUrl(req);
            case 'setChatMessageAutoDeleteTime':
                return this._setChatMessageAutoDeleteTime(req);
            case 'getChannelStats':
                return this._getChannelStats(req);
            case 'searchStickers':
                return this._searchStickers(req);
            case 'requestBotWebView':
                return this._requestBotWebView(req);
            case 'prolongWebView':
                return this._prolongWebView(req);
            case 'sendWebViewData':
                return this._sendWebViewData(req);
            case 'answerWebAppQuery':
                return this._answerWebAppQuery(req);

            // ── Channel Boosts ────────────────────────────────────────────────
            case 'getBoostsStatus':
                return this._getBoostsStatus(req);
            case 'getMyBoosts':
                return this._getMyBoosts(req);
            case 'applyBoost':
                return this._applyBoost(req);
            case 'getBoostsList':
                return this._getBoostsList(req);

            // ── Stars / Payments ──────────────────────────────────────────────
            case 'getStarsBalance':
                return this._getStarsBalance(req);
            case 'getStarsTransactions':
                return this._getStarsTransactions(req);
            case 'getStarGiftCatalog':
                return this._getStarGiftCatalog(req);
            case 'sendStarGift':
                return this._sendStarGift(req);

            // ── Premium ───────────────────────────────────────────────────────
            case 'getPremiumFeatures':
                return this._getPremiumFeatures(req);
            case 'getPremiumLimit':
                return this._getPremiumLimit(req);

            // ── Business ─────────────────────────────────────────────────────
            case 'getBusinessInfo':
                return this._getBusinessInfo(req);
            case 'getQuickReplies':
                return this._getQuickReplies(req);
            case 'createQuickReply':
                return this._createQuickReply(req);
            case 'editQuickReply':
                return this._editQuickReply(req);
            case 'deleteQuickReply':
                return this._deleteQuickReply(req);
            case 'getBusinessConnectedBots':
                return this._getBusinessConnectedBots(req);
            case 'updateBusinessConnectedBot':
                return this._updateBusinessConnectedBot(req);
            case 'getGroupCallInfo':
                return this._getGroupCallInfo(req);
            case 'createGroupCall':
                return this._createGroupCall(req);
            case 'startScheduledGroupCall':
                return this._startScheduledGroupCall(req);
            case 'editGroupCallTitle':
                return this._editGroupCallTitle(req);
            case 'toggleGroupCallJoinMuted':
                return this._toggleGroupCallJoinMuted(req);
            case 'exportGroupCallInvite':
                return this._exportGroupCallInvite(req);
            case 'discardGroupCall':
                return this._discardGroupCall(req);
            case 'inviteToGroupCall':
                return this._inviteToGroupCall(req);
            case 'toggleGroupCallRecord':
                return this._toggleGroupCallRecord(req);
            case 'subscribeScheduledGroupCall':
                return this._subscribeScheduledGroupCall(req);
            case 'editGroupCallParticipant':
                return this._editGroupCallParticipant(req);
            case 'joinGroupCall':
                return this._joinGroupCall(req);
            case 'leaveGroupCall':
                return this._leaveGroupCall(req);
            case 'setGroupCallSelfMuted':
                return this._setGroupCallSelfMuted(req);
            case 'checkGroupCallConnection':
                return this._checkGroupCallConnection(req);
            case 'getGroupCallAudioSources':
                return this._getGroupCallAudioSources(req);
            case 'joinGroupCallPresentation':
                return this._joinGroupCallPresentation(req);
            case 'leaveGroupCallPresentation':
                return this._leaveGroupCallPresentation(req);

            // ── Archivos ──────────────────────────────────────────────────────
            case 'downloadFile':
                return this._downloadFile(req);
            case 'readFile':
                return this._readFile(req);
            case 'cancelDownloadFile':
                return this._cancelDownloadFile(req);
            case 'uploadFile':
                return {};

            // ── Instant View ──────────────────────────────────────────────────
            case 'getWebPageInstantView':
                return this._getWebPageInstantView(req);

            // ── Inline keyboards ─────────────────────────────────────────────
            case 'getCallbackQueryAnswer':
                return this._getCallbackQueryAnswer(req);

            // ── Comment threads ──────────────────────────────────────────────
            case 'getMessageThreadHistory':
                return this._getMessageThreadHistory(req);

            // ── Group management ─────────────────────────────────────────────
            case 'setSupergroupSlowModeDelay':
                return this._setSupergroupSlowModeDelay(req);

            // ── Polls ────────────────────────────────────────────────────────
            case 'setPollAnswer':
                return this._setPollAnswer(req);
            case 'stopPoll':
                return this._stopPoll(req);

            // ── Jump to date ─────────────────────────────────────────────────
            case 'getChatMessageByDate':
                return this._getChatMessageByDate(req);

            // ── Profile editing ──────────────────────────────────────────────
            case 'setName':
                return this._setName(req);
            case 'setBio':
                return this._setBio(req);
            case 'setUsername':
                return this._setUsername(req);

            // ── Sessions ─────────────────────────────────────────────────────
            case 'getActiveSessions':
                return this._getActiveSessions(req);
            case 'getMessageReadParticipants':
                return this._getMessageReadParticipants(req);
            case 'getMessageReactors':
                return this._getMessageReactors(req);
            case 'getChatThemes':
                return this._getChatThemes(req);
            case 'setChatTheme':
                return this._setChatTheme(req);
            case 'getSimilarChannels':
                return this._getSimilarChannels(req);
            case 'getPrivacy':
                return this._getPrivacy(req);
            case 'setPrivacy':
                return this._setPrivacy(req);
            case 'getGlobalPrivacySettings':
                return this._getGlobalPrivacySettings(req);
            case 'setGlobalPrivacySettings':
                return this._setGlobalPrivacySettings(req);
            case 'getAccountTTL':
                return this._getAccountTTL(req);
            case 'setAccountTTL':
                return this._setAccountTTL(req);
            case 'getAutoDownloadSettings':
                return this._getAutoDownloadSettings(req);
            case 'saveAutoDownloadSettings':
                return this._saveAutoDownloadSettings(req);
            case 'getContentSettings':
                return this._getContentSettings(req);
            case 'setContentSettings':
                return this._setContentSettings(req);
            case 'getAdminLog':
                return this._getAdminLog(req);
            case 'editAdmin':
                return this._editAdmin(req);
            case 'getJoinRequests':
                return this._getJoinRequests(req);
            case 'approveJoinRequest':
                return this._approveJoinRequest(req);
            case 'toggleJoinToSend':
                return this._toggleJoinToSend(req);
            case 'toggleJoinRequest':
                return this._toggleJoinRequest(req);
            case 'getFavedStickers':
                return this._getFavedStickers(req);
            case 'faveSticker':
                return this._faveSticker(req);
            case 'getEmojiGroups':
                return this._getEmojiGroups(req);
            case 'getAnimatedEmojiStickerSet':
                return this._getAnimatedEmojiStickerSet(req);
            case 'updateBusinessGreetingMessage':
                return this._updateBusinessGreetingMessage(req);
            case 'updateBusinessAwayMessage':
                return this._updateBusinessAwayMessage(req);
            case 'updateBusinessWorkHours':
                return this._updateBusinessWorkHours(req);
            case 'updateBusinessLocation':
                return this._updateBusinessLocation(req);
            case 'updateBusinessIntro':
                return this._updateBusinessIntro(req);
            case 'getAttachMenuBots':
                return this._getAttachMenuBots(req);
            case 'getBotApp':
                return this._getBotApp(req);
            case 'requestAppWebView':
                return this._requestAppWebView(req);
            case 'requestSimpleWebView':
                return this._requestSimpleWebView(req);
            case 'getMessageStats':
                return this._getMessageStats(req);
            case 'getMegagroupStats':
                return this._getMegagroupStats(req);
            case 'getMessagePublicForwards':
                return this._getMessagePublicForwards(req);
            case 'getBroadcastRevenueStats':
                return this._getBroadcastRevenueStats(req);
            case 'getStarsRevenueStats':
                return this._getStarsRevenueStats(req);
            case 'sendStoryReaction':
                return this._sendStoryReaction(req);
            case 'toggleStoryPinned':
                return this._toggleStoryPinned(req);
            case 'getPinnedStories':
                return this._getPinnedStories(req);
            case 'getStarsTopupOptions':
                return this._getStarsTopupOptions(req);
            case 'getPaymentForm':
                return this._getPaymentForm(req);
            case 'sendStarsForm':
                return this._sendStarsForm(req);
            case 'getSponsoredMessages':
                return this._getSponsoredMessages(req);
            case 'viewSponsoredMessage':
                return this._viewSponsoredMessage(req);
            case 'clickSponsoredMessage':
                return this._clickSponsoredMessage(req);
            case 'reportSponsoredMessage':
                return this._reportSponsoredMessage(req);
            case 'exportChatlistInvite':
                return this._exportChatlistInvite(req);
            case 'sendLiveLocation':
                return this._sendLiveLocation(req);
            case 'editLiveLocation':
                return this._editLiveLocation(req);
            case 'getChannelAdmins':
                return this._getChannelAdmins(req);
            case 'getSearchCounters':
                return this._getSearchCounters(req);
            case 'terminateSession':
                return this._terminateSession(req);
            case 'terminateAllOtherSessions':
                return this._terminateAllOtherSessions(req);

            // ── VoIP Calls ────────────────────────────────────────────────────
            case 'requestCall':
                return this._requestCall(req);
            case 'acceptCall':
                return this._acceptCall(req);
            case 'confirmCall':
                return this._confirmCall(req);
            case 'discardCall':
                return this._discardCall(req);
            case 'receivedCall':
                return this._receivedCall(req);
            case 'sendCallSignalingData':
                return this._sendCallSignalingData(req);
            case 'setCallRating':
                return this._setCallRating(req);
            case 'getDhConfig':
                return this._getDhConfig(req);

            default:
                if (!this.disableLog) console.warn('[GramJs] send no implementado:', type);
                return {};
        }
    };

    _getCallbackQueryAnswer = async ({ chat_id, message_id, payload }) => {
        const inputPeer = await this._getInputPeer(chat_id);
        let data = null;
        if (payload && payload['@type'] === 'callbackQueryPayloadData') {
            data = payload.data instanceof Uint8Array ? Buffer.from(payload.data) : Buffer.from(payload.data || []);
        }
        const result = await this.client.invoke(
            new Api.messages.GetBotCallbackAnswer({
                peer: inputPeer,
                msgId: message_id,
                data: data || Buffer.alloc(0),
            }),
        );
        return {
            '@type': 'callbackQueryAnswer',
            text: result.message || '',
            show_alert: !!result.alert,
            url: result.url || '',
        };
    };

    _getMessageThreadHistory = async ({ chat_id, message_id, limit = 50 }) => {
        const inputPeer = await this._getInputPeer(chat_id);
        const result = await this.client.invoke(
            new Api.messages.GetReplies({
                peer: inputPeer,
                msgId: message_id,
                offsetId: 0,
                offsetDate: 0,
                addOffset: 0,
                limit,
                maxId: 0,
                minId: 0,
                hash: BigInt(0),
            }),
        );
        const { translateMessage } = await import('../Utils/GramJs/EntityTranslator');
        this._cacheAndEmitUsers(result.users || []);
        const messages = (result.messages || []).map(m => translateMessage(m, chat_id));
        return { '@type': 'messages', messages, total_count: result.count || messages.length };
    };

    _setSupergroupSlowModeDelay = async ({ supergroup_id, seconds }) => {
        const inputPeer = await this._getInputPeer(-supergroup_id);
        await this.client.invoke(new Api.channels.ToggleSlowMode({ channel: inputPeer, seconds }));
        this._emitUpdate({
            '@type': 'updateSupergroupFullInfo',
            supergroup_id,
            supergroup_full_info: { slow_mode_delay: seconds },
        });
        return {};
    };

    _setPollAnswer = async ({ chat_id, message_id, option_ids }) => {
        const inputPeer = await this._getInputPeer(chat_id);
        const MessageStore = (await import('../Stores/MessageStore')).default;
        const msg = MessageStore.get(chat_id, message_id);
        const options = [];
        if (option_ids && option_ids.length > 0 && msg && msg.content && msg.content.poll) {
            for (const idx of option_ids) {
                const opt = msg.content.poll.options[idx];
                if (opt && opt._option_data) {
                    options.push(Buffer.from(opt._option_data));
                }
            }
        }
        const voteResult = await this.client.invoke(
            new Api.messages.SendVote({
                peer: inputPeer,
                msgId: message_id,
                options,
            }),
        );
        // Refrescar el mensaje en el store para que el UI muestre el resultado
        try {
            if (voteResult && voteResult.updates) {
                for (const upd of voteResult.updates) {
                    const updClass = upd.className || upd._;
                    if (updClass === 'UpdateMessagePoll' && upd.poll) {
                        const { translateMessage } = await import('../Utils/GramJs/EntityTranslator');
                        const refreshed = await this.client.invoke(
                            new Api.channels.GetMessages({
                                channel: inputPeer,
                                id: [new Api.InputMessageID({ id: message_id })],
                            }),
                        );
                        if (refreshed && refreshed.messages && refreshed.messages[0]) {
                            const tdMsg = translateMessage(refreshed.messages[0], chat_id);
                            this._emitUpdate({
                                '@type': 'updateMessageContent',
                                chat_id,
                                message_id,
                                new_content: tdMsg.content,
                            });
                        }
                        break;
                    }
                }
            }
        } catch {}
        return {};
    };

    _stopPoll = async ({ chat_id, message_id }) => {
        const inputPeer = await this._getInputPeer(chat_id);
        await this.client.invoke(
            new Api.messages.EditMessage({
                peer: inputPeer,
                id: message_id,
                media: new Api.InputMediaPoll({
                    poll: new Api.Poll({
                        id: BigInt(0),
                        closed: true,
                        question: new Api.TextWithEntities({ text: '', entities: [] }),
                    }),
                }),
            }),
        );
        return {};
    };

    _getMessageReadParticipants = async ({ chat_id, message_id }) => {
        if (!chat_id || !message_id) return { user_ids: [] };
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const result = await this.client.invoke(
                new Api.messages.GetMessageReadParticipants({
                    peer: inputPeer,
                    msgId: message_id,
                }),
            );
            const userIds = (result || [])
                .map(r => {
                    if (r && r.userId) return Number(r.userId);
                    return Number(r);
                })
                .filter(Boolean);
            return { user_ids: userIds };
        } catch (e) {
            console.warn('[GramJs] getMessageReadParticipants error', e);
            return { user_ids: [] };
        }
    };

    _getMessageReactors = async ({ chat_id, message_id, reaction }) => {
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            let reactionFilter;
            if (reaction === 'paid') {
                reactionFilter = new Api.ReactionPaid();
            } else if (reaction) {
                reactionFilter = new Api.ReactionEmoji({ emoticon: reaction });
            }
            const result = await this.client.invoke(
                new Api.messages.GetMessageReactionsList({
                    peer: inputPeer,
                    id: message_id,
                    reaction: reactionFilter,
                    limit: 50,
                }),
            );
            const reactors = (result.reactions || []).map(r => {
                const peerId = r.peerId;
                let userId = 0;
                let name = '';
                if (peerId && peerId.userId) {
                    userId = Number(peerId.userId);
                    const user = result.users && result.users.find(u => Number(u.id) === userId);
                    if (user) name = [user.firstName, user.lastName].filter(Boolean).join(' ');
                }
                const isPaid = r.reaction && r.reaction.className === 'ReactionPaid';
                const starCount = isPaid && r.count ? r.count : null;
                return {
                    sender_id: { user_id: userId },
                    sender_name: name,
                    reaction: isPaid ? '⭐' : r.reaction?.emoticon || '',
                    star_count: starCount,
                };
            });
            return { reactors };
        } catch (e) {
            console.warn('[GramJs] getMessageReactors error', e);
            return { reactors: [] };
        }
    };

    _getSimilarChannels = async ({ chat_id }) => {
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const result = await this.client.invoke(new Api.channels.GetChannelRecommendations({ channel: inputPeer }));
            const chats = (result.chats || []).map(c => translateChat(c, null, this._entityCache)).filter(Boolean);
            return { chats };
        } catch (e) {
            console.warn('[GramJs] getSimilarChannels error', e);
            return { chats: [] };
        }
    };

    getOutboxReadDate = async (chatId, messageId) => {
        const inputPeer = tdlibChatIdToInputPeer(chatId, this._entityCache);
        const result = await this.client.invoke(
            new Api.messages.GetOutboxReadDate({ peer: inputPeer, msgId: messageId }),
        );
        return result.date;
    };

    _chatThemesCache = null;

    _getChatThemes = async () => {
        if (this._chatThemesCache) return { themes: this._chatThemesCache };
        try {
            const result = await this.client.invoke(new Api.account.GetChatThemes({ hash: BigInt(0) }));
            const themes = result.themes || [];
            this._chatThemesCache = themes.map(t => ({
                emoticon: t.emoticon || '',
                title: t.title || '',
                settings: (t.settings || []).map(s => ({
                    baseTheme: s.baseTheme ? s.baseTheme.className : '',
                    accentColor: s.accentColor || 0,
                    outboxAccentColor: s.outboxAccentColor || null,
                    messageColors: s.messageColors || [],
                })),
            }));
            return { themes: this._chatThemesCache };
        } catch (e) {
            console.warn('[GramJs] getChatThemes error', e);
            return { themes: [] };
        }
    };

    _setChatTheme = async ({ chat_id, emoticon }) => {
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(new Api.messages.SetChatTheme({ peer: inputPeer, emoticon: emoticon || '' }));
            return { success: true };
        } catch (e) {
            console.warn('[GramJs] setChatTheme error', e);
            throw e;
        }
    };

    // ── Misc (J) ──────────────────────────────────────────────────────────────

    _getSponsoredMessages = async ({ chat_id }) => {
        const cached = this._sponsoredMessagesCache.get(chat_id);
        if (cached && Date.now() - cached.createdAt < 5 * 60 * 1000) return cached.value;
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(new Api.messages.GetSponsoredMessages({ peer: inputPeer }));
        (result.chats || []).concat(result.users || []).forEach(entity => this._cacheEntity(entity));
        const value = {
            posts_between: Number(result.postsBetween || 0),
            messages: (result.messages || []).map(m => ({
                random_id_hex: Buffer.from(m.randomId || []).toString('hex'),
                url: String(m.url || ''),
                title: String(m.title || ''),
                message: String(m.message || ''),
                button_text: String(m.buttonText || 'Abrir'),
                recommended: !!m.recommended,
                can_report: !!m.canReport,
                sponsor_info: String(m.sponsorInfo || ''),
                additional_info: String(m.additionalInfo || ''),
                has_photo: !!m.photo,
                has_media: !!m.media,
            })),
        };
        this._sponsoredMessagesCache.set(chat_id, { createdAt: Date.now(), value });
        return value;
    };

    _viewSponsoredMessage = async ({ chat_id, random_id_hex }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        await this.client.invoke(
            new Api.messages.ViewSponsoredMessage({ peer: inputPeer, randomId: Buffer.from(random_id_hex, 'hex') }),
        );
        return { success: true };
    };

    _clickSponsoredMessage = async ({ chat_id, random_id_hex, media = false, fullscreen = false }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        await this.client.invoke(
            new Api.messages.ClickSponsoredMessage({
                peer: inputPeer,
                randomId: Buffer.from(random_id_hex, 'hex'),
                media: !!media,
                fullscreen: !!fullscreen,
            }),
        );
        return { success: true };
    };

    _reportSponsoredMessage = async ({ chat_id, random_id_hex, option_hex = '' }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(
            new Api.messages.ReportSponsoredMessage({
                peer: inputPeer,
                randomId: Buffer.from(random_id_hex, 'hex'),
                option: Buffer.from(option_hex, 'hex'),
            }),
        );
        const type = String(result.className || result._ || '');
        if (/ChooseOption$/i.test(type)) {
            return {
                status: 'choose',
                title: String(result.title || 'Informar de este anuncio'),
                options: (result.options || []).map(item => ({
                    text: String(item.text || ''),
                    option_hex: Buffer.from(item.option || []).toString('hex'),
                })),
            };
        }
        this._sponsoredMessagesCache.delete(chat_id);
        return { status: /AdsHidden$/i.test(type) ? 'hidden' : 'reported' };
    };

    _exportChatlistInvite = async ({ filter_id, title, peer_ids }) => {
        const peers = await Promise.all(
            peer_ids.map(id => Promise.resolve(tdlibChatIdToInputPeer(id, this._entityCache))),
        );
        const result = await this.client.invoke(
            new Api.chatlists.ExportChatlistInvite({
                chatlist: new Api.InputChatlistDialogFilter({ filterId: filter_id }),
                title: title || '',
                peers,
            }),
        );
        return { invite: result.invite ? { url: result.invite.url, title: result.invite.title } : null };
    };

    _sendLiveLocation = async ({
        chat_id,
        reply_to_message_id,
        lat,
        lon,
        heading,
        period,
        proximity_notification_radius,
    }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(
            new Api.messages.SendMedia({
                peer: inputPeer,
                media: new Api.InputMediaGeoLive({
                    geoPoint: new Api.InputGeoPoint({ lat, long: lon }),
                    heading: heading || undefined,
                    period: period || 3600,
                    proximityNotificationRadius: proximity_notification_radius || undefined,
                }),
                message: '',
                randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
                replyTo: reply_to_message_id
                    ? new Api.InputReplyToMessage({ replyToMsgId: reply_to_message_id })
                    : undefined,
            }),
        );
        return { success: true, updates: result };
    };

    _editLiveLocation = async ({ chat_id, message_id, lat, lon, heading, stopped }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        await this.client.invoke(
            new Api.messages.EditMessage({
                peer: inputPeer,
                id: message_id,
                media: new Api.InputMediaGeoLive({
                    geoPoint: stopped ? undefined : new Api.InputGeoPoint({ lat, long: lon }),
                    stopped: stopped || undefined,
                    heading: heading || undefined,
                }),
            }),
        );
        return { success: true };
    };

    _getChannelAdmins = async ({ chat_id }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(
            new Api.channels.GetParticipants({
                channel: inputPeer,
                filter: new Api.ChannelParticipantsAdmins(),
                offset: 0,
                limit: 200,
                hash: BigInt(0),
            }),
        );
        return {
            admins: (result.participants || []).map(p => ({
                user_id: String(p.userId),
                rank: p.rank || '',
                is_self: p.isSelf || false,
                admin_rights: p.adminRights
                    ? {
                          change_info: p.adminRights.changeInfo || false,
                          post_messages: p.adminRights.postMessages || false,
                          edit_messages: p.adminRights.editMessages || false,
                          delete_messages: p.adminRights.deleteMessages || false,
                          ban_users: p.adminRights.banUsers || false,
                          invite_users: p.adminRights.inviteUsers || false,
                          pin_messages: p.adminRights.pinMessages || false,
                          add_admins: p.adminRights.addAdmins || false,
                          anonymous: p.adminRights.anonymous || false,
                          manage_call: p.adminRights.manageCall || false,
                      }
                    : null,
            })),
            users: (result.users || []).map(u => ({
                id: String(u.id),
                first_name: u.firstName || '',
                last_name: u.lastName || '',
                username: u.username || '',
            })),
        };
    };

    _getSearchCounters = async ({ chat_id, filters }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const FILTER_MAP = {
            photo: 'InputMessagesFilterPhotos',
            video: 'InputMessagesFilterVideo',
            document: 'InputMessagesFilterDocument',
            url: 'InputMessagesFilterUrl',
            audio: 'InputMessagesFilterMusic',
            voice: 'InputMessagesFilterVoice',
            gif: 'InputMessagesFilterGif',
        };
        const filterObjs = (filters || ['photo', 'video', 'document', 'url', 'audio', 'voice', 'gif']).map(f => {
            const cls = FILTER_MAP[f];
            return cls && Api[cls] ? new Api[cls]() : new Api.InputMessagesFilterEmpty();
        });
        const result = await this.client.invoke(
            new Api.messages.GetSearchCounters({ peer: inputPeer, filters: filterObjs }),
        );
        return { counters: (result || []).map(c => ({ filter: c.filter?.className, count: c.count })) };
    };

    // ── Stars ─────────────────────────────────────────────────────────────────

    _getStarsTopupOptions = async () => {
        const result = await this.client.invoke(new Api.payments.GetStarsTopupOptions());
        return {
            options: (result || []).map(o => ({
                stars: String(o.stars),
                currency: o.currency,
                amount: String(o.amount),
                store_product: o.storeProduct || null,
                extended: o.extended || false,
            })),
        };
    };

    _getPaymentForm = async ({ chat_id, message_id }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(
            new Api.payments.GetPaymentForm({
                invoice: new Api.InputInvoiceMessage({ peer: inputPeer, msgId: message_id }),
                themeParams: new Api.DataJSON({ data: '{}' }),
            }),
        );
        return {
            form_id: String(result.formId),
            title: result.title,
            description: result.description,
            invoice: result.invoice ? { currency: result.invoice.currency, prices: result.invoice.prices || [] } : null,
            url: result.url,
        };
    };

    _sendStarsForm = async ({ form_id, chat_id, message_id }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(
            new Api.payments.SendPaymentForm({
                formId: BigInt(form_id),
                invoice: new Api.InputInvoiceMessage({ peer: inputPeer, msgId: message_id }),
                credentials: new Api.InputPaymentCredentials({
                    data: new Api.DataJSON({ data: JSON.stringify({ type: 'stars' }) }),
                }),
            }),
        );
        return { success: true, result };
    };

    // ── Stories ──────────────────────────────────────────────────────────────

    _sendStoryReaction = async ({ chat_id, story_id, reaction, add_to_recent }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        let reactionObj;
        if (!reaction || reaction === 'empty') {
            reactionObj = new Api.ReactionEmpty();
        } else if (reaction === 'paid') {
            reactionObj = new Api.ReactionPaid();
        } else {
            reactionObj = new Api.ReactionEmoji({ emoticon: reaction });
        }
        await this.client.invoke(
            new Api.stories.SendReaction({
                peer: inputPeer,
                storyId: story_id,
                reaction: reactionObj,
                addToRecent: add_to_recent,
            }),
        );
        return { success: true };
    };

    _toggleStoryPinned = async ({ chat_id, story_ids, pinned }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        await this.client.invoke(new Api.stories.TogglePinned({ peer: inputPeer, id: story_ids, pinned: !!pinned }));
        return { success: true };
    };

    _getPinnedStories = async ({ chat_id, offset_id = 0, limit = 20 }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(
            new Api.stories.GetPinnedStories({ peer: inputPeer, offsetId: offset_id, limit }),
        );
        return {
            stories: (result.stories || []).map(s => ({
                id: s.id,
                date: s.date,
                expired: s.expired || false,
                views: s.views ? { views_count: s.views.viewsCount, reactions_count: s.views.reactionsCount } : null,
            })),
        };
    };

    // ── Stats / Monetization ──────────────────────────────────────────────────

    _getMessageStats = async ({ chat_id, message_id }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(
            new Api.stats.GetMessageStats({ channel: inputPeer, msgId: message_id }),
        );
        return { views_graph: result.viewsGraph, reactions_by_emotion_graph: result.reactionsByEmotionGraph };
    };

    _getMegagroupStats = async ({ chat_id }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(new Api.stats.GetMegagroupStats({ channel: inputPeer }));
        return {
            members_graph: result.membersGraph,
            messages_graph: result.messagesGraph,
            actions_graph: result.actionsGraph,
            top_hoursGraph: result.topHoursGraph,
            weekdays_graph: result.weekdaysGraph,
            top_posters: (result.topPosters || []).map(p => ({ user_id: String(p.userId), messages: p.messages })),
            top_admins: (result.topAdmins || []).map(a => ({
                user_id: String(a.userId),
                deleted: a.deleted,
                kicked: a.kicked,
            })),
            top_inviters: (result.topInviters || []).map(i => ({
                user_id: String(i.userId),
                invitations: i.invitations,
            })),
        };
    };

    _getMessagePublicForwards = async ({ chat_id, message_id, limit = 20 }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(
            new Api.stats.GetMessagePublicForwards({ channel: inputPeer, msgId: message_id, offset: '', limit }),
        );
        return {
            forwards: (result.forwards || []).map(f => ({
                from_id: String(f.fromId?.channelId || f.fromId?.userId || 0),
                date: f.date,
                views: f.views,
                message_id: f.id,
            })),
        };
    };

    _getBroadcastRevenueStats = async ({ chat_id }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(new Api.stats.GetBroadcastRevenueStats({ peer: inputPeer }));
        return {
            ton_balance: String(result.balances?.overallRevenue || 0),
            revenue_graph: result.revenueGraph,
        };
    };

    _getStarsRevenueStats = async ({ chat_id }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(new Api.payments.GetStarsRevenueStats({ peer: inputPeer }));
        return {
            status: result.status
                ? {
                      current_balance: String(result.status.currentBalance),
                      available_balance: String(result.status.availableBalance),
                      overall_revenue: String(result.status.overallRevenue),
                  }
                : null,
            revenue_graph: result.revenueGraph,
        };
    };

    // ── Mini Apps / Bots ──────────────────────────────────────────────────────

    _getAttachMenuBots = async () => {
        const result = await this.client.invoke(new Api.messages.GetAttachMenuBots({ hash: BigInt(0) }));
        return {
            bots: (result.bots || []).map(b => ({
                bot_id: String(b.botId),
                short_name: b.shortName,
                peer_types: b.peerTypes?.map(t => t.className) || [],
            })),
        };
    };

    _getBotApp = async ({ bot_id, short_name }) => {
        const botPeer = await this.client.getInputEntity(BigInt(bot_id));
        const result = await this.client.invoke(
            new Api.messages.GetBotApp({
                app: new Api.InputBotAppShortName({ botId: botPeer, shortName: short_name }),
                hash: BigInt(0),
            }),
        );
        return { app: result.app ? { id: String(result.app.id), title: result.app.title, url: result.app.url } : null };
    };

    _requestAppWebView = async ({ chat_id, bot_id, short_name, start_param, platform = 'web' }) => {
        const peer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const botPeer = await this.client.getInputEntity(BigInt(bot_id));
        const result = await this.client.invoke(
            new Api.messages.RequestAppWebView({
                peer,
                app: new Api.InputBotAppShortName({ botId: botPeer, shortName: short_name }),
                startParam: start_param || undefined,
                themeParams: new Api.DataJSON({ data: '{}' }),
                platform,
            }),
        );
        return { url: result.url };
    };

    _requestSimpleWebView = async ({ bot_id, url, platform = 'web' }) => {
        const botPeer = await this.client.getInputEntity(BigInt(bot_id));
        const result = await this.client.invoke(
            new Api.messages.RequestSimpleWebView({
                bot: botPeer,
                url: url || undefined,
                themeParams: new Api.DataJSON({ data: '{}' }),
                platform,
            }),
        );
        return { url: result.url };
    };

    // ── Business ──────────────────────────────────────────────────────────────

    _updateBusinessGreetingMessage = async ({ shortcut_id, recipients, no_activity_days }) => {
        await this.client.invoke(
            new Api.account.UpdateBusinessGreetingMessage({
                message:
                    shortcut_id != null
                        ? new Api.InputBusinessGreetingMessage({
                              shortcutId: shortcut_id,
                              recipients: new Api.InputBusinessRecipients(recipients || {}),
                              noActivityDays: no_activity_days || 7,
                          })
                        : undefined,
            }),
        );
        return { success: true };
    };

    _updateBusinessAwayMessage = async ({ shortcut_id, offline_only, schedule, recipients }) => {
        await this.client.invoke(
            new Api.account.UpdateBusinessAwayMessage({
                message:
                    shortcut_id != null
                        ? new Api.InputBusinessAwayMessage({
                              offlineOnly: offline_only || false,
                              shortcutId: shortcut_id,
                              schedule: schedule || new Api.BusinessAwayMessageScheduleAlways(),
                              recipients: new Api.InputBusinessRecipients(recipients || {}),
                          })
                        : undefined,
            }),
        );
        return { success: true };
    };

    _updateBusinessWorkHours = async ({ open_now, timezone_id, weekly_open }) => {
        await this.client.invoke(
            new Api.account.UpdateBusinessWorkHours({
                businessWorkHours: weekly_open
                    ? new Api.BusinessWorkHours({ openNow: open_now, timezoneId: timezone_id, weeklyOpen: weekly_open })
                    : undefined,
            }),
        );
        return { success: true };
    };

    _updateBusinessLocation = async ({ lat, lon, address }) => {
        await this.client.invoke(
            new Api.account.UpdateBusinessLocation({
                geoPoint: lat != null ? new Api.InputGeoPoint({ lat, long: lon }) : undefined,
                address: address || undefined,
            }),
        );
        return { success: true };
    };

    _updateBusinessIntro = async ({ title, description }) => {
        await this.client.invoke(
            new Api.account.UpdateBusinessIntro({
                intro:
                    title != null
                        ? new Api.InputBusinessIntro({ title: title || '', description: description || '' })
                        : undefined,
            }),
        );
        return { success: true };
    };

    _joinChat = async ({ chat_id }) => {
        const peer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        if (!(peer instanceof Api.InputPeerChannel)) {
            throw new Error('Solo es posible unirse a canales o supergrupos');
        }
        const result = await this.client.invoke(
            new Api.channels.JoinChannel({
                channel: new Api.InputChannel({ channelId: peer.channelId, accessHash: peer.accessHash }),
            }),
        );
        return { ok: true, updates: result };
    };

    _getQuickReplies = async () => {
        const result = await this.client.invoke(new Api.messages.GetQuickReplies({ hash: BigInt(0) }));
        return {
            quick_reply_shortcuts: (result?.quickReplies || []).map(item => ({
                id: item.shortcutId,
                shortcut: item.shortcut,
                top_message: item.topMessage,
                count: item.count,
            })),
        };
    };

    _createQuickReply = async ({ shortcut, message }) => {
        const normalized = String(shortcut || '')
            .trim()
            .replace(/^\/+/, '');
        const text = String(message || '').trim();
        if (!normalized || !text) throw new Error('Shortcut and message are required');
        const available = await this.client.invoke(new Api.messages.CheckQuickReplyShortcut({ shortcut: normalized }));
        if (!available) throw new Error('Quick reply shortcut is already in use');
        const peer = await this.client.getInputEntity('me');
        await this.client.invoke(
            new Api.messages.SendMessage({
                peer,
                message: text,
                randomId: BigInt(Date.now()) * BigInt(1000) + BigInt(Math.floor(Math.random() * 1000)),
                quickReplyShortcut: new Api.InputQuickReplyShortcut({ shortcut: normalized }),
            }),
        );
        return { success: true };
    };

    _editQuickReply = async ({ shortcut_id, shortcut }) => {
        const normalized = String(shortcut || '')
            .trim()
            .replace(/^\/+/, '');
        if (!shortcut_id || !normalized) throw new Error('Shortcut is required');
        const success = await this.client.invoke(
            new Api.messages.EditQuickReplyShortcut({ shortcutId: Number(shortcut_id), shortcut: normalized }),
        );
        return { success: !!success };
    };

    _deleteQuickReply = async ({ shortcut_id }) => {
        const success = await this.client.invoke(
            new Api.messages.DeleteQuickReplyShortcut({ shortcutId: Number(shortcut_id) }),
        );
        return { success: !!success };
    };

    _getBusinessConnectedBots = async () => {
        const result = await this.client.invoke(new Api.account.GetConnectedBots());
        const users = new Map((result?.users || []).map(user => [String(user.id), user]));
        return {
            bots: (result?.connectedBots || []).map(item => {
                const user = users.get(String(item.botId));
                return {
                    id: String(item.botId),
                    username: user?.username || '',
                    name:
                        [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
                        user?.username ||
                        String(item.botId),
                    can_reply: !!item.canReply,
                    recipients: item.recipients || {},
                };
            }),
        };
    };

    _updateBusinessConnectedBot = async ({ bot, can_reply = true, deleted = false, recipients = {} }) => {
        const botInput = await this.client.getInputEntity(String(bot || '').trim());
        const result = await this.client.invoke(
            new Api.account.UpdateConnectedBot({
                bot: botInput,
                canReply: !!can_reply,
                deleted: !!deleted,
                recipients: new Api.InputBusinessBotRecipients({
                    existingChats: recipients.existing_chats !== false,
                    newChats: recipients.new_chats !== false,
                    contacts: recipients.contacts !== false,
                    nonContacts: recipients.non_contacts !== false,
                }),
            }),
        );
        return { success: true, updates: result };
    };

    _groupCallInput = ({ call_id, access_hash }) =>
        new Api.InputGroupCall({ id: BigInt(call_id), accessHash: BigInt(access_hash) });

    _getChatFullForGroupCall = async chatId => {
        const inputPeer = tdlibChatIdToInputPeer(chatId, this._entityCache);
        if (chatId < -1000000000000) {
            const result = await this.client.invoke(new Api.channels.GetFullChannel({ channel: inputPeer }));
            return result.fullChat || {};
        }
        const basicGroupId = Math.abs(Number(chatId));
        const result = await this.client.invoke(new Api.messages.GetFullChat({ chatId: BigInt(basicGroupId) }));
        return result.fullChat || {};
    };

    _getGroupCallInfo = async ({ chat_id, limit = 100 }) => {
        const full = await this._getChatFullForGroupCall(Number(chat_id));
        const active = full.call;
        if (!active?.id || !active?.accessHash) return { active: false, participants: [] };
        const callInput = new Api.InputGroupCall({ id: active.id, accessHash: active.accessHash });
        const result = await this.client.invoke(new Api.phone.GetGroupCall({ call: callInput, limit }));
        const users = new Map((result?.users || []).map(user => [String(user.id), user]));
        const chats = new Map((result?.chats || []).map(chat => [String(chat.id), chat]));
        const participants = (result?.participants || []).map(item => {
            const peerId = String(item.peer?.userId || item.peer?.channelId || item.peer?.chatId || '');
            const peer = users.get(peerId) || chats.get(peerId);
            return {
                id: peerId,
                name:
                    [peer?.firstName, peer?.lastName].filter(Boolean).join(' ') ||
                    peer?.title ||
                    peer?.username ||
                    peerId,
                username: peer?.username || '',
                muted: !!item.muted,
                muted_by_you: !!item.mutedByYou,
                can_self_unmute: !!item.canSelfUnmute,
                raised_hand: !!item.raiseHandRating,
                video_joined: !!item.videoJoined,
                volume: item.volume || 10000,
                source: item.source == null ? null : Number(item.source),
                video: normalizeParticipantVideo(item.video, peerId),
                presentation: normalizeParticipantVideo(item.presentation, peerId, true),
            };
        });
        const call = result.call || {};
        return {
            active: true,
            call_id: String(active.id),
            access_hash: String(active.accessHash),
            title: call.title || '',
            participants_count: call.participantsCount || participants.length,
            join_muted: !!call.joinMuted,
            can_change_join_muted: !!call.canChangeJoinMuted,
            can_start_video: !!call.canStartVideo,
            record_start_date: call.recordStartDate || 0,
            schedule_date: call.scheduleDate || 0,
            scheduled: !!call.scheduleDate,
            participants,
        };
    };

    _createGroupCall = async ({ chat_id, title = '', schedule_date = 0 }) => {
        const peer = tdlibChatIdToInputPeer(Number(chat_id), this._entityCache);
        const result = await this.client.invoke(
            new Api.phone.CreateGroupCall({
                peer,
                randomId: Math.floor(Math.random() * 0x7fffffff),
                title: String(title || '').trim() || undefined,
                scheduleDate: schedule_date ? Number(schedule_date) : undefined,
            }),
        );
        return { success: true, updates: result };
    };

    _startScheduledGroupCall = async call => {
        const result = await this.client.invoke(
            new Api.phone.StartScheduledGroupCall({ call: this._groupCallInput(call) }),
        );
        return { success: true, updates: result };
    };

    _editGroupCallTitle = async ({ title, ...call }) => {
        const result = await this.client.invoke(
            new Api.phone.EditGroupCallTitle({ call: this._groupCallInput(call), title: String(title || '').trim() }),
        );
        return { success: true, updates: result };
    };

    _toggleGroupCallJoinMuted = async ({ join_muted, ...call }) => {
        const result = await this.client.invoke(
            new Api.phone.ToggleGroupCallSettings({
                call: this._groupCallInput(call),
                joinMuted: !!join_muted,
            }),
        );
        return { success: true, updates: result };
    };

    _exportGroupCallInvite = async call => {
        const result = await this.client.invoke(
            new Api.phone.ExportGroupCallInvite({ call: this._groupCallInput(call), canSelfUnmute: true }),
        );
        return { link: result.link || '' };
    };

    _discardGroupCall = async call => {
        const result = await this.client.invoke(new Api.phone.DiscardGroupCall({ call: this._groupCallInput(call) }));
        return { success: true, updates: result };
    };

    _inviteToGroupCall = async ({ users = [], ...call }) => {
        const inputs = [];
        for (const user of users.slice(0, 100)) {
            inputs.push(await this.client.getInputEntity(String(user).trim()));
        }
        if (!inputs.length) throw new Error('At least one participant is required');
        const result = await this.client.invoke(
            new Api.phone.InviteToGroupCall({ call: this._groupCallInput(call), users: inputs }),
        );
        return { success: true, updates: result };
    };

    _toggleGroupCallRecord = async ({ start, video = false, title = '', ...call }) => {
        const result = await this.client.invoke(
            new Api.phone.ToggleGroupCallRecord({
                call: this._groupCallInput(call),
                start: !!start,
                video: !!video,
                title: start && title ? String(title).trim() : undefined,
                videoPortrait: false,
            }),
        );
        return { success: true, updates: result };
    };

    _subscribeScheduledGroupCall = async ({ subscribed = true, ...call }) => {
        const result = await this.client.invoke(
            new Api.phone.ToggleGroupCallStartSubscription({
                call: this._groupCallInput(call),
                subscribed: !!subscribed,
            }),
        );
        return { success: true, updates: result };
    };

    _editGroupCallParticipant = async ({ participant, muted, volume, raise_hand, ...call }) => {
        const peer = await this.client.getInputEntity(String(participant).trim());
        const result = await this.client.invoke(
            new Api.phone.EditGroupCallParticipant({
                call: this._groupCallInput(call),
                participant: peer,
                muted: muted == null ? undefined : !!muted,
                volume: volume == null ? undefined : Math.max(1, Math.min(20000, Number(volume))),
                raiseHand: raise_hand == null ? undefined : !!raise_hand,
            }),
        );
        return { success: true, updates: result };
    };

    _joinGroupCall = async ({ muted = true, params, invite_hash, ...call }) => {
        if (!params || !Number.isInteger(Number(params.ssrc)) || Number(params.ssrc) === 0) {
            throw new Error('Invalid WebRTC group-call payload');
        }
        const result = await this.client.invoke(
            new Api.phone.JoinGroupCall({
                muted: !!muted,
                videoStopped: true,
                call: this._groupCallInput(call),
                joinAs: new Api.InputPeerSelf(),
                inviteHash: invite_hash || undefined,
                params: new Api.DataJSON({ data: JSON.stringify(params) }),
            }),
        );
        const updates = result?.updates || [];
        const connection = updates.find(update => {
            const type = update?.className || update?._ || update?.['@type'];
            return type === 'UpdateGroupCallConnection' || type === 'updateGroupCallConnection';
        });
        const data = connection?.params?.data;
        if (!data) throw new Error('Telegram did not return group-call connection parameters');
        return { success: true, params: data };
    };

    _leaveGroupCall = async ({ source, ...call }) => {
        const result = await this.client.invoke(
            new Api.phone.LeaveGroupCall({ call: this._groupCallInput(call), source: Number(source) | 0 }),
        );
        return { success: true, updates: result };
    };

    _setGroupCallSelfMuted = async ({ muted, ...call }) => {
        const result = await this.client.invoke(
            new Api.phone.EditGroupCallParticipant({
                call: this._groupCallInput(call),
                participant: new Api.InputPeerSelf(),
                muted: !!muted,
            }),
        );
        return { success: true, updates: result };
    };

    _checkGroupCallConnection = async ({ source, ...call }) => {
        const sources = await this.client.invoke(
            new Api.phone.CheckGroupCall({ call: this._groupCallInput(call), sources: [Number(source) | 0] }),
        );
        return {
            connected: Array.from(sources || [])
                .map(Number)
                .includes(Number(source) | 0),
        };
    };

    _getGroupCallAudioSources = async call => {
        const result = await this.client.invoke(
            new Api.phone.GetGroupCall({ call: this._groupCallInput(call), limit: 100 }),
        );
        const participants = result?.participants || [];
        return {
            sources: participants
                .map(participant => (participant.source == null ? null : Number(participant.source)))
                .filter(source => Number.isInteger(source) && source !== 0),
            videos: participants.flatMap(participant => {
                const participantId = String(
                    participant.peer?.userId || participant.peer?.channelId || participant.peer?.chatId || '',
                );
                return [
                    normalizeParticipantVideo(participant.video, participantId),
                    normalizeParticipantVideo(participant.presentation, participantId, true),
                ].filter(Boolean);
            }),
        };
    };

    _joinGroupCallPresentation = async ({ params, ...call }) => {
        if (!params || !Number.isInteger(Number(params.ssrc)) || Number(params.ssrc) === 0) {
            throw new Error('Invalid WebRTC presentation payload');
        }
        const result = await this.client.invoke(
            new Api.phone.JoinGroupCallPresentation({
                call: this._groupCallInput(call),
                params: new Api.DataJSON({ data: JSON.stringify(params) }),
            }),
        );
        const connection = (result?.updates || []).find(update => {
            const type = update?.className || update?._ || update?.['@type'];
            return type === 'UpdateGroupCallConnection' || type === 'updateGroupCallConnection';
        });
        const data = connection?.params?.data;
        if (!data) throw new Error('Telegram did not return presentation connection parameters');
        return { success: true, params: data };
    };

    _leaveGroupCallPresentation = async call => {
        const result = await this.client.invoke(
            new Api.phone.LeaveGroupCallPresentation({ call: this._groupCallInput(call) }),
        );
        return { success: true, updates: result };
    };

    // ── Stickers / Emoji ──────────────────────────────────────────────────────

    _getFavedStickers = async () => {
        const result = await this.client.invoke(new Api.messages.GetFavedStickers({ hash: BigInt(0) }));
        return { stickers: result.stickers || [], hash: result.hash };
    };

    _faveSticker = async ({ document_id, access_hash, file_reference, unfave }) => {
        await this.client.invoke(
            new Api.messages.FaveSticker({
                id: new Api.InputDocument({
                    id: BigInt(document_id),
                    accessHash: BigInt(access_hash || 0),
                    fileReference: Buffer.from(file_reference || []),
                }),
                unfave: !!unfave,
            }),
        );
        return { success: true };
    };

    _getEmojiGroups = async () => {
        const result = await this.client.invoke(new Api.messages.GetEmojiGroups({ hash: 0 }));
        return {
            groups: (result.groups || []).map(g => ({
                title: g.title,
                icon_emoji_id: String(g.iconEmojiId || 0),
                emoticons: g.emoticons || [],
            })),
        };
    };

    _getAnimatedEmojiStickerSet = async () => {
        const result = await this.client.invoke(
            new Api.messages.GetStickerSet({ stickerset: new Api.InputStickerSetAnimatedEmoji(), hash: 0 }),
        );
        return {
            set: result.set
                ? { id: String(result.set.id), title: result.set.title, short_name: result.set.shortName }
                : null,
            stickers: (result.documents || []).map(d => ({ id: String(d.id), type: d.className })),
        };
    };

    // ── Admin / Channels ─────────────────────────────────────────────────────

    _getAdminLog = async ({ chat_id, q = '', limit = 100, max_id = BigInt(0), min_id = BigInt(0) }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(
            new Api.channels.GetAdminLog({
                channel: inputPeer,
                q,
                maxId: BigInt(max_id || 0),
                minId: BigInt(min_id || 0),
                limit,
            }),
        );
        return {
            events: (result.events || []).map(e => ({
                id: String(e.id),
                date: e.date,
                user_id: String(e.userId),
                action: e.action,
            })),
        };
    };

    _editAdmin = async ({ chat_id, user_id, rights, rank = '' }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const userPeer = await this.client.getInputEntity(BigInt(user_id));
        await this.client.invoke(
            new Api.channels.EditAdmin({
                channel: inputPeer,
                userId: userPeer,
                adminRights: new Api.ChatAdminRights({
                    changeInfo: rights.change_info,
                    postMessages: rights.post_messages,
                    editMessages: rights.edit_messages,
                    deleteMessages: rights.delete_messages,
                    banUsers: rights.ban_users,
                    inviteUsers: rights.invite_users,
                    pinMessages: rights.pin_messages,
                    addAdmins: rights.add_admins,
                    anonymous: rights.anonymous,
                    manageCall: rights.manage_call,
                    other: rights.other,
                    manageTopics: rights.manage_topics,
                }),
                rank,
            }),
        );
        return { success: true };
    };

    _getJoinRequests = async ({ chat_id, limit = 50 }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(
            new Api.messages.GetChatInviteImporters({
                requested: true,
                peer: inputPeer,
                offsetDate: 0,
                offsetUser: new Api.InputUserEmpty(),
                limit,
            }),
        );
        return {
            importers: (result.importers || []).map(i => ({
                user_id: String(i.userId),
                date: i.date,
                about: i.about || '',
            })),
            users: result.users || [],
        };
    };

    _approveJoinRequest = async ({ chat_id, user_id, approved }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const userPeer = await this.client.getInputEntity(BigInt(user_id));
        await this.client.invoke(
            new Api.messages.HideChatJoinRequest({ approved: !!approved, peer: inputPeer, userId: userPeer }),
        );
        return { success: true };
    };

    _toggleJoinToSend = async ({ chat_id, enabled }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        await this.client.invoke(new Api.channels.ToggleJoinToSend({ channel: inputPeer, enabled }));
        return { success: true };
    };

    _toggleJoinRequest = async ({ chat_id, enabled }) => {
        const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        await this.client.invoke(new Api.channels.ToggleJoinRequest({ channel: inputPeer, enabled }));
        return { success: true };
    };

    // ── Privacy ──────────────────────────────────────────────────────────────

    _PRIVACY_KEY_MAP = {
        StatusTimestamp: 'InputPrivacyKeyStatusTimestamp',
        PhoneNumber: 'InputPrivacyKeyPhoneNumber',
        ProfilePhoto: 'InputPrivacyKeyProfilePhoto',
        PhoneCall: 'InputPrivacyKeyPhoneCall',
        Forwards: 'InputPrivacyKeyForwards',
        ChatInvite: 'InputPrivacyKeyChatInvite',
        VoiceMessages: 'InputPrivacyKeyVoiceMessages',
        About: 'InputPrivacyKeyAbout',
        Birthday: 'InputPrivacyKeyBirthday',
    };

    _getPrivacyKey(key) {
        const cls = this._PRIVACY_KEY_MAP[key];
        if (!cls || !Api[cls]) throw new Error(`Unknown privacy key: ${key}`);
        return new Api[cls]();
    }

    _getPrivacy = async ({ key }) => {
        const result = await this.client.invoke(new Api.account.GetPrivacy({ key: this._getPrivacyKey(key) }));
        return { rules: result.rules || [] };
    };

    _setPrivacy = async ({ key, rule }) => {
        const RULE_MAP = {
            AllowAll: 'InputPrivacyValueAllowAll',
            AllowContacts: 'InputPrivacyValueAllowContacts',
            DisallowAll: 'InputPrivacyValueDisallowAll',
        };
        const ruleCls = RULE_MAP[rule];
        if (!ruleCls || !Api[ruleCls]) throw new Error(`Unknown rule: ${rule}`);
        const result = await this.client.invoke(
            new Api.account.SetPrivacy({ key: this._getPrivacyKey(key), rules: [new Api[ruleCls]()] }),
        );
        return { rules: result.rules || [] };
    };

    _getGlobalPrivacySettings = async () => {
        const r = await this.client.invoke(new Api.account.GetGlobalPrivacySettings());
        return {
            archive_and_mute_new_noncontact_peers: r.archiveAndMuteNewNoncontactPeers || false,
            keep_archived_unmuted: r.keepArchivedUnmuted || false,
            keep_archived_folders: r.keepArchivedFolders || false,
            hide_read_marks: r.hideReadMarks || false,
            new_noncontact_peers_require_premium: r.newNoncontactPeersRequirePremium || false,
        };
    };

    _setGlobalPrivacySettings = async ({ settings }) => {
        await this.client.invoke(
            new Api.account.SetGlobalPrivacySettings({
                settings: new Api.GlobalPrivacySettings({
                    archiveAndMuteNewNoncontactPeers: settings.archive_and_mute_new_noncontact_peers,
                    keepArchivedUnmuted: settings.keep_archived_unmuted,
                    keepArchivedFolders: settings.keep_archived_folders,
                    hideReadMarks: settings.hide_read_marks,
                    newNoncontactPeersRequirePremium: settings.new_noncontact_peers_require_premium,
                }),
            }),
        );
        return { success: true };
    };

    _getAccountTTL = async () => {
        const r = await this.client.invoke(new Api.account.GetAccountTTL());
        return { days: r.days || 180 };
    };

    _setAccountTTL = async ({ days }) => {
        await this.client.invoke(new Api.account.SetAccountTTL({ ttl: new Api.AccountDaysTTL({ days }) }));
        return { success: true };
    };

    _getAutoDownloadSettings = async () => {
        const r = await this.client.invoke(new Api.account.GetAutoDownloadSettings());
        const toObj = s => ({
            disabled: s.disabled || false,
            video_preload_large: s.videoPreloadLarge || false,
            audio_preload_next: s.audioPreloadNext || false,
            phonecalls_less_data: s.phonecallsLessData || false,
            stories_preload: s.storiesPreload || false,
            photo_size_max: s.photoSizeMax || 0,
            video_size_max: Number(s.videoSizeMax || 0),
            file_size_max: Number(s.fileSizeMax || 0),
            video_upload_maxbitrate: s.videoUploadMaxbitrate || 0,
            small_queue_active_operations_max: s.smallQueueActiveOperationsMax || 2,
            large_queue_active_operations_max: s.largeQueueActiveOperationsMax || 2,
        });
        return {
            low: toObj(r.low),
            medium: toObj(r.medium),
            high: toObj(r.high),
        };
    };

    _saveAutoDownloadSettings = async ({ preset, settings }) => {
        await this.client.invoke(
            new Api.account.SaveAutoDownloadSettings({
                low: preset === 'low',
                high: preset === 'high',
                settings: new Api.AutoDownloadSettings({
                    disabled: settings.disabled || false,
                    photoSizeMax: settings.photo_size_max || 0,
                    videoSizeMax: BigInt(settings.video_size_max || 0),
                    fileSizeMax: BigInt(settings.file_size_max || 0),
                    videoUploadMaxbitrate: settings.video_upload_maxbitrate || 0,
                    videoPreloadLarge: settings.video_preload_large || false,
                    audioPreloadNext: settings.audio_preload_next || false,
                    phonecallsLessData: settings.phonecalls_less_data || false,
                    storiesPreload: settings.stories_preload || false,
                    smallQueueActiveOperationsMax: settings.small_queue_active_operations_max || 2,
                    largeQueueActiveOperationsMax: settings.large_queue_active_operations_max || 2,
                }),
            }),
        );
        return { success: true };
    };

    _getContentSettings = async () => {
        const r = await this.client.invoke(new Api.account.GetContentSettings());
        return { sensitive_enabled: r.sensitiveEnabled || false, sensitive_can_change: r.sensitiveCanChange || false };
    };

    _setContentSettings = async ({ sensitive_enabled }) => {
        await this.client.invoke(new Api.account.SetContentSettings({ sensitiveEnabled: sensitive_enabled }));
        return { success: true };
    };

    sendPaidReaction = async (chatId, messageId, count = 1, isPrivate = false) => {
        const inputPeer = tdlibChatIdToInputPeer(chatId, this._entityCache);
        const randomId = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        await this.client.invoke(
            new Api.messages.SendPaidReaction({
                peer: inputPeer,
                msgId: messageId,
                count,
                randomId,
                private: isPrivate ? true : undefined,
            }),
        );
    };

    _getActiveSessions = async () => {
        const result = await this.client.invoke(new Api.account.GetAuthorizations());
        const sessions = (result.authorizations || []).map(a => ({
            '@type': 'session',
            id: String(a.hash),
            is_current: !!a.current,
            is_password_pending: false,
            api_id: a.apiId || 0,
            application_name: a.appName || '',
            application_version: a.appVersion || '',
            device_model: a.deviceModel || '',
            platform: a.platform || '',
            system_version: a.systemVersion || '',
            log_in_date: a.dateCreated || 0,
            last_active_date: a.dateActive || 0,
            ip: a.ip || '',
            country: a.country || '',
            region: a.region || '',
        }));
        return { '@type': 'sessions', sessions };
    };

    _terminateSession = async ({ session_id }) => {
        await this.client.invoke(new Api.account.ResetAuthorization({ hash: BigInt(session_id) }));
        return {};
    };

    _terminateAllOtherSessions = async () => {
        await this.client.invoke(new Api.auth.ResetAuthorizations());
        return {};
    };

    _getChatMessageByDate = async ({ chat_id, date }) => {
        const inputPeer = await this._getInputPeer(chat_id);
        const result = await this.client.invoke(
            new Api.messages.GetHistory({
                peer: inputPeer,
                offsetId: 0,
                offsetDate: date,
                addOffset: -1,
                limit: 1,
                maxId: 0,
                minId: 0,
                hash: BigInt(0),
            }),
        );
        const msgs = result && result.messages;
        if (msgs && msgs.length > 0) {
            const { translateMessage } = await import('../Utils/GramJs/EntityTranslator');
            const tdMsg = translateMessage(msgs[0], chat_id);
            return tdMsg || { id: msgs[0].id };
        }
        return {};
    };

    _setName = async ({ first_name, last_name }) => {
        await this.client.invoke(
            new Api.account.UpdateProfile({ firstName: first_name || '', lastName: last_name || '' }),
        );
        const OptionStore = (await import('../Stores/OptionStore')).default;
        const myIdOpt = OptionStore.get('my_id');
        const myId = myIdOpt && myIdOpt.value;
        if (myId) {
            const user = this._userCache.get(myId);
            if (user) {
                user.first_name = first_name || '';
                user.last_name = last_name || '';
                this._emitUpdate({ '@type': 'updateUser', user });
            }
        }
        return {};
    };

    _setBio = async ({ bio }) => {
        await this.client.invoke(new Api.account.UpdateProfile({ about: bio || '' }));
        return {};
    };

    _setUsername = async ({ username }) => {
        await this.client.invoke(new Api.account.UpdateUsername({ username: username || '' }));
        const OptionStore = (await import('../Stores/OptionStore')).default;
        const myIdOpt = OptionStore.get('my_id');
        const myId = myIdOpt && myIdOpt.value;
        if (myId) {
            const user = this._userCache.get(myId);
            if (user) {
                user.username = username || '';
                this._emitUpdate({ '@type': 'updateUser', user });
            }
        }
        return {};
    };

    // ─── Auth handlers ───────────────────────────────────────────────────────

    _buildClientOptions = (dcId = undefined) => ({
        ...(dcId !== undefined ? { dcId } : {}),
        connectionRetries: 10,
        retryDelay: 1000,
        useWSS: true,
        useIPV6: false,
        testMode: false,
        appVersion: packageJson.version,
        deviceModel: getBrowser(),
        systemVersion: getOSName(),
        langCode: navigator.language || 'en',
    });

    _sendPhone = async req => {
        const { phone_number } = req;
        const apiId = parseInt(process.env.REACT_APP_TELEGRAM_API_ID, 10);
        const apiHash = process.env.REACT_APP_TELEGRAM_API_HASH;

        console.log('[GramJs] Solicitando código de inicio de sesión');

        // Usamos invoke() directamente para que PHONE_MIGRATE nos llegue
        // (client.sendCode() lo intercepta y llama _switchDC que falla en WSS)
        const doSend = () =>
            this.client.invoke(
                new Api.auth.SendCode({
                    phoneNumber: phone_number,
                    apiId,
                    apiHash,
                    settings: new Api.CodeSettings({}),
                }),
            );

        let result;
        try {
            result = await doSend();
        } catch (err) {
            const errMsg = err.errorMessage || err.message || '';
            const dcMatch = errMsg.match(/PHONE_MIGRATE_(\d+)/i);
            if (dcMatch) {
                const dcId = parseInt(dcMatch[1], 10);
                console.log(`[GramJs] PHONE_MIGRATE_${dcId} — recreando cliente en DC${dcId}`);
                try {
                    await this.client.disconnect();
                } catch (_) {}

                this.client = new TelegramClient(new StringSession(''), apiId, apiHash, this._buildClientOptions(dcId));
                if (this.client.setLogLevel) this.client.setLogLevel('error');
                this._setupUpdateHandler();

                let connected = false;
                for (let attempt = 1; attempt <= 5; attempt++) {
                    try {
                        console.log(`[GramJs] Intentando conectar a DC${dcId} (intento ${attempt})...`);
                        await this.client.connect();
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        if (this.client.connected) {
                            connected = true;
                            break;
                        }
                    } catch (connErr) {
                        console.error(`[GramJs] Error al conectar a DC${dcId} en intento ${attempt}:`, connErr);
                        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                    }
                }

                if (!connected) {
                    throw new Error(`No se pudo conectar al DC${dcId} de destino.`);
                }

                let lastErr;
                for (let sendAttempt = 1; sendAttempt <= 5; sendAttempt++) {
                    try {
                        console.log(`[GramJs] Enviando código en DC${dcId} (intento ${sendAttempt})...`);
                        result = await doSend();
                        break;
                    } catch (sendErr) {
                        lastErr = sendErr;
                        console.warn(`[GramJs] Error al enviar código en DC${dcId} (intento ${sendAttempt}):`, sendErr);
                        if (sendErr.message?.includes('Not connected') || sendErr.message?.includes('network')) {
                            try {
                                await this.client.disconnect();
                            } catch (_) {}
                            await new Promise(resolve => setTimeout(resolve, 1500 * sendAttempt));
                            try {
                                await this.client.connect();
                            } catch (_) {}
                        } else {
                            throw sendErr;
                        }
                    }
                }
                if (!result) {
                    throw lastErr;
                }
            } else {
                throw err;
            }
        }

        console.log('[GramJs] Código de inicio de sesión solicitado');
        this._phone = phone_number;
        this._phoneHash = result.phoneCodeHash;

        this._emitUpdate({
            '@type': 'updateAuthorizationState',
            authorization_state: {
                '@type': 'authorizationStateWaitCode',
                code_info: {
                    phone_number,
                    type: { '@type': 'authenticationCodeTypeTelegramMessage', length: 5 },
                    next_type: null,
                    timeout: 120,
                },
            },
        });
        return {};
    };

    _checkCode = async req => {
        try {
            await this.client.invoke(
                new Api.auth.SignIn({
                    phoneNumber: this._phone,
                    phoneCodeHash: this._phoneHash,
                    phoneCode: req.code,
                }),
            );
            await this._onAuthorized();
        } catch (err) {
            if (err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
                this._emitUpdate({
                    '@type': 'updateAuthorizationState',
                    authorization_state: {
                        '@type': 'authorizationStateWaitPassword',
                        password_hint: '',
                        has_recovery_email_address: false,
                        recovery_email_address_pattern: '',
                    },
                });
                return {};
            }
            throw err;
        }
        return {};
    };

    _checkPassword = async req => {
        const passwordData = await this.client.invoke(new Api.account.GetPassword());
        const check = await computeCheck(passwordData, req.password);
        await this.client.invoke(new Api.auth.CheckPassword({ password: check }));
        await this._onAuthorized();
        return {};
    };

    _resendCode = async () => {
        if (this._phone && this._phoneHash) {
            await this.client.invoke(
                new Api.auth.ResendCode({ phoneNumber: this._phone, phoneCodeHash: this._phoneHash }),
            );
        }
        return {};
    };

    _resetInitialDialogsPromise = () => {
        this._initialDialogsLoaded = false;
        this._initialDialogsPromise = new Promise(resolve => {
            this._initialDialogsResolver = resolve;
        });
    };

    _logOut = async () => {
        await this.client.invoke(new Api.auth.LogOut()).catch(() => {});
        localStorage.removeItem(this._getActiveSessionKey());
        // Remove current account from list
        this._accounts = this._accounts.filter(a => a.index !== this._activeAccountIndex);
        this._saveAccounts();

        // If another account exists, switch to it; otherwise full logout
        const remaining = this._accounts[0];
        if (remaining) {
            this._activeAccountIndex = remaining.index;
            localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(remaining.index));
        }

        this._clearCaches();
        this._resetInitialDialogsPromise();
        this._emitUpdate({
            '@type': 'updateAuthorizationState',
            authorization_state: { '@type': 'authorizationStateLoggingOut' },
        });
        this._emitUpdate({
            '@type': 'updateAuthorizationState',
            authorization_state: { '@type': 'authorizationStateClosed' },
        });
        return {};
    };

    _getCountryCode = async () => {
        try {
            const result = await this.client.invoke(new Api.help.GetNearestDc());
            return { '@type': 'text', text: result.country || '' };
        } catch (e) {
            return { '@type': 'text', text: '' };
        }
    };

    logOut = () => {
        this.send({ '@type': 'logOut' }).catch(err => this.emit('tdlib_auth_error', err));
    };

    // ─── Chat handlers ───────────────────────────────────────────────────────

    _getChats = async req => {
        const { chat_list, offset_order = '9223372036854775807', offset_chat_id = 0, limit = 100 } = req || {};

        if (chat_list && chat_list['@type'] === 'chatListFilter') {
            const folderSet = this._folderChats.get(chat_list.filter_id);
            const chatIds = folderSet
                ? this._paginateChatIds(Array.from(folderSet), offset_order, offset_chat_id, limit)
                : [];
            return { '@type': 'chats', total_count: folderSet ? folderSet.size : 0, chat_ids: chatIds };
        }

        if (!this._initialDialogsLoaded && this._initialDialogsPromise) {
            await this._initialDialogsPromise;
        }
        const chatIds = this._paginateChatIds(Array.from(this._chatCache.keys()), offset_order, offset_chat_id, limit);
        return { '@type': 'chats', total_count: this._chatCache.size, chat_ids: chatIds };
    };

    _paginateChatIds = (chatIds, offsetOrder, offsetChatId, limit) => {
        const sortedIds = chatIds
            .filter(id => {
                const chat = this._chatCache.get(id);
                return chat && chat.order !== '0';
            })
            .sort((a, b) => {
                const chatA = this._chatCache.get(a);
                const chatB = this._chatCache.get(b);
                const orderA = chatA?.order || '0';
                const orderB = chatB?.order || '0';
                if (orderA.length !== orderB.length) return orderB.length - orderA.length;
                if (orderA !== orderB) return orderB > orderA ? 1 : -1;
                return b - a;
            });

        let startIndex = 0;
        if (offsetChatId) {
            const exactIndex = sortedIds.indexOf(offsetChatId);
            if (exactIndex !== -1) {
                startIndex = exactIndex + 1;
            } else {
                startIndex = sortedIds.findIndex(id => {
                    const order = this._chatCache.get(id)?.order || '0';
                    if (order.length !== offsetOrder.length) return order.length < offsetOrder.length;
                    return order < offsetOrder;
                });
                if (startIndex === -1) startIndex = sortedIds.length;
            }
        }

        return sortedIds.slice(startIndex, startIndex + Math.max(0, limit));
    };

    _getChat = async req => {
        const { chat_id } = req;
        const cached = this._chatCache.get(chat_id);
        if (cached) return cached;

        // Intentar obtener del servidor
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const entity = await this.client.getEntity(inputPeer);
            this._cacheEntity(entity);
            const tdChat = translateChat(entity, null);
            if (tdChat) {
                this._chatCache.set(tdChat.id, tdChat);
                return tdChat;
            }
        } catch (e) {
            /* no-op */
        }
        return null;
    };

    _searchPublicChat = async req => {
        const { username } = req;
        try {
            const entity = await this.client.getEntity(username);
            this._cacheEntity(entity);
            const tdChat = translateChat(entity, null);
            if (tdChat) {
                this._chatCache.set(tdChat.id, tdChat);
                this._emitUpdate({ '@type': 'updateNewChat', chat: tdChat });
                return tdChat;
            }
        } catch (e) {
            /* no-op */
        }
        return null;
    };

    _openTelegramLink = async req => {
        const parsed = this._parseTelegramLink(req && req.url);
        if (!parsed) return null;

        try {
            if (parsed.type === 'invite') {
                return this._importChatInvite(parsed.hash);
            }

            if (parsed.type === 'username') {
                const chat = await this._searchPublicChat({ username: parsed.username });
                if (chat) return chat;
            }
        } catch (e) {
            console.warn('[GramJs] openTelegramLink error', e);
            throw e;
        }

        return null;
    };

    _parseTelegramLink = value => {
        if (!value) return null;

        let url = String(value).trim();
        if (!url) return null;

        if (/^tg:\/\//i.test(url)) {
            const queryStart = url.indexOf('?');
            const query = new URLSearchParams(queryStart >= 0 ? url.slice(queryStart + 1) : '');
            const domain = (query.get('domain') || '').replace(/^@/, '');
            const invite = query.get('invite');
            const join = query.get('join');

            if (invite || join) return { type: 'invite', hash: invite || join };
            if (domain) return { type: 'username', username: domain };
            return null;
        }

        if (!/^https?:\/\//i.test(url)) {
            url = `https://${url}`;
        }

        try {
            const parsed = new URL(url);
            const host = parsed.hostname.toLowerCase();
            if (!['t.me', 'telegram.me', 'telegram.dog'].includes(host)) return null;

            const parts = parsed.pathname
                .split('/')
                .map(x => decodeURIComponent(x))
                .filter(Boolean);
            const first = parts[0] || '';

            if (!first) return null;
            if (first === '+' && parts[1]) return { type: 'invite', hash: parts[1] };
            if (first.charAt(0) === '+') return { type: 'invite', hash: first.slice(1) };
            if (first.toLowerCase() === 'joinchat' && parts[1]) return { type: 'invite', hash: parts[1] };
            if (first.toLowerCase() === 'c') return null;

            return { type: 'username', username: first.replace(/^@/, '') };
        } catch (e) {
            return null;
        }
    };

    _importChatInvite = async hash => {
        if (!hash) return null;

        try {
            const result = await this.client.invoke(new Api.messages.ImportChatInvite({ hash }));
            const chat = this._upsertChatsFromUpdates(result);
            if (chat) return chat;
        } catch (e) {
            if (!/USER_ALREADY_PARTICIPANT/i.test(e.message || '')) {
                console.warn('[GramJs] importChatInvite error', e);
                throw e;
            }
        }

        const checked = await this.client.invoke(new Api.messages.CheckChatInvite({ hash }));
        const chat = checked && checked.chat ? checked.chat : null;
        if (!chat) return null;

        this._cacheEntity(chat);
        const tdChat = translateChat(chat, null);
        if (tdChat) {
            this._chatCache.set(tdChat.id, tdChat);
            this._emitUpdate({ '@type': 'updateNewChat', chat: tdChat });
        }
        return tdChat;
    };

    _upsertChatsFromUpdates = result => {
        let firstChat = null;

        for (const user of result?.users || []) {
            const tdUser = translateUser(user);
            if (tdUser) {
                this._userCache.set(tdUser.id, tdUser);
                this._emitUpdate({ '@type': 'updateUser', user: tdUser });
            }
            this._cacheEntity(user);
        }

        for (const chatEntity of result?.chats || []) {
            this._cacheEntity(chatEntity);
            const tdChat = translateChat(chatEntity, null);
            if (!tdChat) continue;

            this._chatCache.set(tdChat.id, tdChat);
            this._emitUpdate({ '@type': 'updateNewChat', chat: tdChat });
            if (!firstChat) firstChat = tdChat;
        }

        return firstChat;
    };

    _createPrivateChat = async req => {
        const { user_id } = req;
        const cached = this._chatCache.get(user_id);
        if (cached) return cached;
        try {
            const entity = await this.client.getEntity(
                new Api.InputUser({ userId: BigInt(user_id), accessHash: BigInt(0) }),
            );
            this._cacheEntity(entity);
            const tdChat = translateChat(entity, null);
            if (tdChat) {
                this._chatCache.set(tdChat.id, tdChat);
                this._emitUpdate({ '@type': 'updateNewChat', chat: tdChat });
                return tdChat;
            }
        } catch (e) {
            /* no-op */
        }
        return null;
    };

    _getContacts = async () => {
        try {
            const result = await this.client.invoke(new Api.contacts.GetContacts({ hash: BigInt(0) }));
            const users = result.users || [];
            return users
                .filter(u => !(u.className === 'UserEmpty') && !u.deleted && !u.bot)
                .map(u => {
                    const tdUser = translateUser(u);
                    if (tdUser) {
                        this._userCache.set(tdUser.id, tdUser);
                        this._cacheEntity(u);
                    }
                    return tdUser;
                })
                .filter(Boolean);
        } catch (e) {
            console.error('[GramJs] getContacts error:', e);
            return [];
        }
    };

    // ---- Contactos frecuentes (top peers) ----
    _getTopChats = async req => {
        const limit = (req && req.limit) || 30;
        try {
            const result = await this.client.invoke(
                new Api.contacts.GetTopPeers({ correspondents: true, offset: 0, limit, hash: BigInt(0) }),
            );
            if (!result || !result.categories) return { '@type': 'chats', total_count: 0, chat_ids: [] };
            const userMap = new Map();
            (result.users || []).forEach(u => {
                this._cacheEntity(u);
                userMap.set(String(u.id), u);
            });
            const chatIds = [];
            for (const cat of result.categories) {
                for (const tp of cat.peers || []) {
                    const chatId = peerToTdlibChatId(tp.peer);
                    if (!chatId) continue;
                    const entity = userMap.get(String(tp.peer.userId));
                    if (entity) {
                        const tdUser = translateUser(entity);
                        if (tdUser) this._emitUpdate({ '@type': 'updateUser', user: tdUser });
                        const tdChat = translateChat(entity, null);
                        if (tdChat) {
                            this._chatCache.set(tdChat.id, tdChat);
                            this._emitUpdate({ '@type': 'updateNewChat', chat: tdChat });
                        }
                    }
                    chatIds.push(chatId);
                    if (chatIds.length >= limit) break;
                }
                if (chatIds.length >= limit) break;
            }
            return { '@type': 'chats', total_count: chatIds.length, chat_ids: chatIds };
        } catch (e) {
            console.error('[GramJs] getTopChats error:', e);
            return { '@type': 'chats', total_count: 0, chat_ids: [] };
        }
    };

    // ---- Búsquedas recientes (lado cliente, localStorage) ----
    _recentlyFoundKey = () => `recently_found_chats_${this._activeAccountIndex}`;

    _readRecentlyFound = () => {
        try {
            return JSON.parse(localStorage.getItem(this._recentlyFoundKey()) || '[]');
        } catch (e) {
            return [];
        }
    };

    _getRecentlyFoundChats = async (limit = 50) => {
        const ids = this._readRecentlyFound().slice(0, limit);
        const hydrated = [];
        for (const id of ids) {
            let chat = this._chatCache.get(id);
            if (!chat) {
                try {
                    chat = await this._getChat({ chat_id: id });
                } catch (e) {
                    /* no-op */
                }
            }
            if (chat) {
                this._emitUpdate({ '@type': 'updateNewChat', chat });
                hydrated.push(id);
            }
        }
        return { '@type': 'chats', total_count: hydrated.length, chat_ids: hydrated };
    };

    _searchChats = async req => {
        const { query, limit } = req;
        const q = (query || '').trim().toLowerCase();
        if (!q) return this._getRecentlyFoundChats(limit || 50);
        const ids = [];
        const max = limit || 50;
        for (const [id, chat] of this._chatCache) {
            const title = chat && chat.title ? String(chat.title).toLowerCase() : '';
            if (title.includes(q)) ids.push(id);
            if (ids.length >= max) break;
        }
        return { '@type': 'chats', total_count: ids.length, chat_ids: ids };
    };

    _addRecentlyFoundChat = async req => {
        const { chat_id } = req;
        if (!chat_id) return {};
        const ids = [chat_id, ...this._readRecentlyFound().filter(x => x !== chat_id)].slice(0, 50);
        localStorage.setItem(this._recentlyFoundKey(), JSON.stringify(ids));
        return {};
    };

    _clearRecentlyFoundChats = async () => {
        localStorage.removeItem(this._recentlyFoundKey());
        return {};
    };

    _createGroupChat = async req => {
        const { title, user_ids } = req;
        try {
            const users = user_ids.map(id => {
                const entity = this._entityCache.get(id);
                if (entity && entity.accessHash !== undefined) {
                    return new Api.InputUser({ userId: BigInt(id), accessHash: entity.accessHash });
                }
                return new Api.InputUser({ userId: BigInt(id), accessHash: BigInt(0) });
            });
            const result = await this.client.invoke(new Api.messages.CreateChat({ users, title }));
            const newChat = (result.chats || [])[0];
            if (!newChat) return null;
            this._cacheEntity(newChat);
            this._emitUpdate({
                '@type': 'updateBasicGroup',
                basic_group: {
                    '@type': 'basicGroup',
                    id: Number(newChat.id),
                    member_count: user_ids.length + 1,
                    status: { '@type': 'chatMemberStatusCreator', is_member: true },
                    is_active: true,
                    upgraded_to_supergroup_id: 0,
                },
            });
            const tdChat = translateChat(newChat, null);
            if (tdChat) {
                this._chatCache.set(tdChat.id, tdChat);
                this._emitUpdate({ '@type': 'updateNewChat', chat: tdChat });
                return tdChat;
            }
        } catch (e) {
            console.error('[GramJs] createGroupChat error:', e);
            throw e;
        }
        return null;
    };

    _createChannel = async req => {
        const { title, about, is_channel } = req;
        try {
            const result = await this.client.invoke(
                new Api.channels.CreateChannel({
                    title,
                    about: about || '',
                    broadcast: !!is_channel,
                    megagroup: !is_channel,
                }),
            );
            const newChat = (result.chats || [])[0];
            if (!newChat) return null;
            this._cacheEntity(newChat);
            this._emitUpdate({
                '@type': 'updateSupergroup',
                supergroup: {
                    '@type': 'supergroup',
                    id: Number(newChat.id),
                    username: newChat.username || '',
                    date: newChat.date || 0,
                    status: { '@type': 'chatMemberStatusCreator', is_member: true },
                    member_count: 1,
                    has_linked_chat: false,
                    has_location: false,
                    sign_messages: false,
                    is_slow_mode_enabled: false,
                    is_channel: !!is_channel,
                    is_verified: false,
                    restriction_reason: '',
                    is_scam: false,
                },
            });
            const tdChat = translateChat(newChat, null);
            if (tdChat) {
                this._chatCache.set(tdChat.id, tdChat);
                this._emitUpdate({ '@type': 'updateNewChat', chat: tdChat });
                return tdChat;
            }
        } catch (e) {
            console.error('[GramJs] createChannel error:', e);
            throw e;
        }
        return null;
    };

    // ─── Message handlers ────────────────────────────────────────────────────

    _doFetchChatHistory = async (chatId, fromMessageId, offset, limit) => {
        const inputPeer = tdlibChatIdToInputPeer(chatId, this._entityCache);
        const msgs = await this.client.getMessages(inputPeer, {
            limit,
            offsetId: fromMessageId || 0,
            addOffset: offset,
        });
        // The controller cache is not the React UserStore. Emit every resolved
        // sender so group messages render the actual author instead of the chat title.
        this._cacheAndEmitUsers(msgs.map(m => m.sender).filter(Boolean));
        const messages = msgs.map(m => translateMessage(m, chatId)).filter(Boolean);
        // Resolve uncommon sender shapes that GramJS did not attach to the message.
        for (const m of messages) {
            const uid = m.sender_user_id;
            if (uid && uid !== chatId && !msgs.some(raw => raw.sender && entityToTdlibChatId(raw.sender) === uid)) {
                const cached = this._entityCache.get(uid);
                if (cached) {
                    const tdUser = translateUser(cached);
                    if (tdUser) {
                        this._userCache.set(uid, tdUser);
                        this._emitUpdate({ '@type': 'updateUser', user: tdUser });
                    }
                }
            }
        }
        return { '@type': 'messages', messages, total_count: messages.length };
    };

    _refreshMessagesInBackground = async (chatId, cachedMessages, limit) => {
        // Small delay so React renders the cached messages and sets completed=true
        await new Promise(r => setTimeout(r, 250));
        try {
            const result = await this._doFetchChatHistory(chatId, 0, 0, limit);
            if (!result.messages.length) return;

            saveMessages(chatId, result.messages);

            const cachedIds = new Set(cachedMessages.map(m => m.id));
            result.messages
                .filter(m => !cachedIds.has(m.id))
                .forEach(m => this._emitUpdate({ '@type': 'updateNewMessage', message: m }));
        } catch (e) {
            // background refresh failed — not critical
        }
    };

    _getChatHistory = async req => {
        const { chat_id, from_message_id = 0, offset = 0, limit = 30 } = req;
        const isInitialLoad = from_message_id === 0 && offset === 0;

        if (isInitialLoad) {
            const cached = await loadMessages(chat_id);
            if (cached && cached.length > 0) {
                this._refreshMessagesInBackground(chat_id, cached, limit);
                return { '@type': 'messages', messages: cached, total_count: cached.length };
            }
        }

        try {
            const result = await this._doFetchChatHistory(chat_id, from_message_id, offset, limit);
            if (isInitialLoad && result.messages.length > 0) {
                saveMessages(chat_id, result.messages);
            }
            return result;
        } catch (err) {
            console.warn('[GramJs] getChatHistory error', err);
            return { '@type': 'messages', messages: [], total_count: 0 };
        }
    };

    _getMessages = async req => {
        const { chat_id, message_ids } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const msgs = await this.client.getMessages(inputPeer, { ids: message_ids });
            const messages = msgs.map(m => translateMessage(m, chat_id)).filter(Boolean);
            return { '@type': 'messages', messages, total_count: messages.length };
        } catch (err) {
            return { '@type': 'messages', messages: [], total_count: 0 };
        }
    };

    _getMessage = async req => {
        const { chat_id, message_id } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const msgs = await this.client.getMessages(inputPeer, { ids: [message_id] });
            const msg = msgs && msgs[0] ? translateMessage(msgs[0], chat_id) : null;
            if (msg) return msg;
        } catch (err) {
            console.error('[GramJs] getMessage error', err);
        }
        return null;
    };

    _forwardMessages = async req => {
        const { chat_id, from_chat_id, message_ids } = req;
        try {
            const toPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const fromPeer = tdlibChatIdToInputPeer(from_chat_id, this._entityCache);
            const result = await this.client.invoke(
                new Api.messages.ForwardMessages({
                    fromPeer,
                    id: message_ids,
                    toPeer,
                    randomId: message_ids.map(() => BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))),
                    silent: false,
                    background: false,
                    withMyScore: false,
                    grouped: false,
                    noforwards: false,
                }),
            );

            // Extract forwarded messages from the Updates response and emit locally
            const rawMessages = (result?.updates || []).filter(u => u.message).map(u => u.message);

            let lastTd = null;
            for (const raw of rawMessages) {
                const tdMessage = translateMessage(raw, chat_id);
                if (tdMessage) {
                    this._emitUpdate({ '@type': 'updateNewMessage', message: tdMessage });
                    lastTd = tdMessage;
                }
            }
            if (lastTd) {
                const chat = this._chatCache.get(chat_id);
                if (chat) chat.last_message = lastTd;
                this._emitUpdate({
                    '@type': 'updateChatLastMessage',
                    chat_id,
                    last_message: lastTd,
                    order: String(lastTd.date * 1000),
                });
            }
        } catch (err) {
            console.error('[GramJs] forwardMessages error', err);
        }
        return {};
    };

    _pinChatMessage = async req => {
        const { chat_id, message_id, disable_notification = false } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(
                new Api.messages.UpdatePinnedMessage({
                    peer: inputPeer,
                    id: message_id,
                    silent: disable_notification,
                    unpin: false,
                    pmOneside: false,
                }),
            );
            this._emitUpdate({ '@type': 'updateChatPinnedMessage', chat_id, pinned_message_id: message_id });
        } catch (err) {
            console.error('[GramJs] pinChatMessage error', err);
        }
        return {};
    };

    _unpinChatMessage = async req => {
        const { chat_id, message_id } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(
                new Api.messages.UpdatePinnedMessage({
                    peer: inputPeer,
                    id: message_id,
                    silent: true,
                    unpin: true,
                    pmOneside: false,
                }),
            );
            this._emitUpdate({ '@type': 'updateChatPinnedMessage', chat_id, pinned_message_id: 0 });
        } catch (err) {
            console.error('[GramJs] unpinChatMessage error', err);
        }
        return {};
    };

    _unpinAllChatMessages = async req => {
        const { chat_id } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(new Api.messages.UnpinAllMessages({ peer: inputPeer }));
            this._emitUpdate({ '@type': 'updateChatPinnedMessage', chat_id, pinned_message_id: 0 });
        } catch (err) {
            console.error('[GramJs] unpinAllChatMessages error', err);
        }
        return {};
    };

    _sendMessage = async req => {
        const {
            chat_id,
            input_message_content,
            reply_to_message_id = 0,
            schedule_date,
            disable_notification,
            disable_web_page_preview,
            effect_id,
        } = req;
        const contentType = input_message_content?.['@type'];

        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);

            if (
                contentType === 'inputMessageDocument' ||
                contentType === 'inputMessageVoiceNote' ||
                contentType === 'inputMessageAudio' ||
                contentType === 'inputMessagePhoto' ||
                contentType === 'inputMessageVideo' ||
                contentType === 'inputMessageVideoNote' ||
                contentType === 'inputMessageSticker' ||
                contentType === 'inputMessageAnimation'
            ) {
                return this._sendFile(
                    chat_id,
                    inputPeer,
                    input_message_content,
                    reply_to_message_id,
                    schedule_date,
                    disable_notification,
                );
            }

            if (contentType === 'inputMessagePoll') {
                return this._sendPoll(
                    chat_id,
                    inputPeer,
                    input_message_content,
                    reply_to_message_id,
                    schedule_date,
                    disable_notification,
                );
            }

            const text = input_message_content?.text?.text || '';
            const formattingEntities = tdEntitiesToGramJs(input_message_content?.text?.entities);
            let result;
            if (effect_id || isGroupCallSyncActive()) {
                const { generateRandomBigInt } = await import('telegram/Helpers');
                const randomId = generateRandomBigInt();
                const request = new Api.messages.SendMessage({
                    peer: inputPeer,
                    message: text,
                    randomId,
                    replyTo: reply_to_message_id
                        ? new Api.InputReplyToMessage({ replyToMsgId: reply_to_message_id })
                        : undefined,
                    entities: formattingEntities.length ? formattingEntities : undefined,
                    scheduleDate: schedule_date || undefined,
                    silent: !!disable_notification,
                    noWebpage: !!disable_web_page_preview,
                    effect: effect_id ? bigInt(String(effect_id)) : undefined,
                });
                const updates = await runGroupCallOperation(
                    `message:${chat_id}:${randomId.toString()}`,
                    () => this.client.invoke(request),
                );
                result = await this.client._getResponseMessage(request, updates, inputPeer);
            } else {
                result = await this.client.sendMessage(inputPeer, {
                    message: text,
                    replyTo: reply_to_message_id || undefined,
                    parseMode: undefined,
                    formattingEntities: formattingEntities.length ? formattingEntities : undefined,
                    scheduleDate: schedule_date || undefined,
                    silent: !!disable_notification,
                    noWebpage: !!disable_web_page_preview,
                });
            }

            const tdMessage = translateMessage(result, chat_id);
            if (tdMessage) {
                this._emitUpdate({ '@type': 'updateNewMessage', message: tdMessage });
                const chat = this._chatCache.get(chat_id);
                if (chat) chat.last_message = tdMessage;
                this._emitUpdate({
                    '@type': 'updateChatLastMessage',
                    chat_id,
                    last_message: tdMessage,
                    order: String(tdMessage.date * 1000),
                });
                return tdMessage;
            }
        } catch (err) {
            console.error('[GramJs] sendMessage error', err);
            throw err;
        }
        return {};
    };

    _getAvailableMessageEffects = async () => {
        try {
            const result = await this.client.invoke(new Api.messages.GetAvailableEffects({ hash: 0 }));
            const effects = (result.effects || []).map(effect => ({
                '@type': 'messageEffect',
                id: String(effect.id),
                emoji: effect.emoticon || '✨',
                premium_required: !!effect.premiumRequired,
                static_icon_id: effect.staticIconId ? String(effect.staticIconId) : null,
                effect_sticker_id: effect.effectStickerId ? String(effect.effectStickerId) : null,
                effect_animation_id: effect.effectAnimationId ? String(effect.effectAnimationId) : null,
            }));
            return { '@type': 'messageEffects', effects };
        } catch (err) {
            console.error('[GramJs] getAvailableMessageEffects error', err);
            return { '@type': 'messageEffects', effects: [] };
        }
    };

    _sendPoll = async (chatId, inputPeer, content, replyToMessageId, scheduleDate, disableNotification) => {
        const { generateRandomBigInt } = await import('telegram/Helpers');
        const optionBytes = (content.options || []).map((_, index) => Buffer.from(String(index)));
        const answers = (content.options || []).map(
            (text, index) =>
                new Api.PollAnswer({
                    text: new Api.TextWithEntities({ text, entities: [] }),
                    option: optionBytes[index],
                }),
        );
        const isQuiz = content.type && content.type['@type'] === 'pollTypeQuiz';
        const correctOptionId = isQuiz ? content.type.correct_option_id : null;
        const correctIndex = isQuiz ? (content.option_ids || []).findIndex(id => id === correctOptionId) : -1;
        const media = new Api.InputMediaPoll({
            poll: new Api.Poll({
                id: BigInt(0),
                closed: false,
                publicVoters: content.is_anonymous === false,
                multipleChoice: !isQuiz && !!content.allows_multiple_answers,
                quiz: isQuiz,
                question: new Api.TextWithEntities({ text: content.question || '', entities: [] }),
                answers,
            }),
            correctAnswers: isQuiz && correctIndex >= 0 ? [optionBytes[correctIndex]] : undefined,
        });

        const result = await this.client.invoke(
            new Api.messages.SendMedia({
                peer: inputPeer,
                media,
                message: '',
                randomId: generateRandomBigInt(),
                scheduleDate: scheduleDate || undefined,
                silent: !!disableNotification,
                replyTo: replyToMessageId ? new Api.InputReplyToMessage({ replyToMsgId: replyToMessageId }) : undefined,
            }),
        );
        const rawMessage = (result?.updates || []).find(update => update.message)?.message || result?.update?.message;
        const tdMessage = rawMessage ? translateMessage(rawMessage, chatId) : null;
        if (tdMessage) {
            this._emitUpdate({ '@type': 'updateNewMessage', message: tdMessage });
            const chat = this._chatCache.get(chatId);
            if (chat) chat.last_message = tdMessage;
            this._emitUpdate({
                '@type': 'updateChatLastMessage',
                chat_id: chatId,
                last_message: tdMessage,
                order: String(tdMessage.date * 1000),
            });
            return tdMessage;
        }
        return {};
    };

    _sendGifByUrl = async ({ chat_id, url, reply_to_message_id }) => {
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const { generateRandomBigInt } = await import('telegram/Helpers');
            await this.client.invoke(
                new Api.messages.SendMedia({
                    peer: inputPeer,
                    media: new Api.InputMediaDocumentExternal({ url }),
                    message: '',
                    randomId: generateRandomBigInt(),
                    replyTo: reply_to_message_id
                        ? new Api.InputReplyToMessage({ replyToMsgId: reply_to_message_id })
                        : undefined,
                }),
            );
        } catch (e) {
            console.warn('[GramJs] sendGifByUrl error', e);
        }
        return {};
    };

    _setChatMessageAutoDeleteTime = async ({ chat_id, message_auto_delete_time }) => {
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(
                new Api.messages.SetHistoryTTL({
                    peer: inputPeer,
                    period: message_auto_delete_time || 0,
                }),
            );
        } catch (e) {
            console.warn('[GramJs] setChatMessageAutoDeleteTime error', e);
        }
        return {};
    };

    _getDefaultMessageAutoDeleteTime = async () => {
        try {
            const result = await this.client.invoke(new Api.messages.GetDefaultHistoryTTL());
            return { '@type': 'messageAutoDeleteTime', message_auto_delete_time: result?.period || 0 };
        } catch (e) {
            console.warn('[GramJs] getDefaultMessageAutoDeleteTime error', e);
            return { '@type': 'messageAutoDeleteTime', message_auto_delete_time: 0 };
        }
    };

    _setDefaultMessageAutoDeleteTime = async ({ message_auto_delete_time }) => {
        try {
            await this.client.invoke(new Api.messages.SetDefaultHistoryTTL({ period: message_auto_delete_time || 0 }));
        } catch (e) {
            console.warn('[GramJs] setDefaultMessageAutoDeleteTime error', e);
        }
        return {};
    };

    _getChannelStats = async ({ chat_id }) => {
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const result = await this.client.invoke(
                new Api.stats.GetBroadcastStats({
                    channel: inputPeer,
                    dark: false,
                }),
            );
            const followers = result.followers;
            const views = result.viewsPerPost;
            const shares = result.sharesPerPost;
            return {
                '@type': 'channelStats',
                followers_count: followers ? followers.current || 0 : 0,
                followers_delta: followers ? (followers.current || 0) - (followers.previous || 0) : 0,
                views_per_post: views ? views.current || 0 : 0,
                shares_per_post: shares ? shares.current || 0 : 0,
            };
        } catch (e) {
            console.warn('[GramJs] getChannelStats error', e);
            return {
                '@type': 'channelStats',
                followers_count: 0,
                followers_delta: 0,
                views_per_post: 0,
                shares_per_post: 0,
            };
        }
    };

    _searchStickers = async ({ query, limit = 40 }) => {
        try {
            const result = await this.client.invoke(
                new Api.messages.SearchStickers({
                    emojis: false,
                    q: query,
                    hash: BigInt(0),
                }),
            );
            const stickers = (result.documents || []).slice(0, limit).map(doc => {
                const animAttr = doc.attributes?.find(a => a.className === 'DocumentAttributeSticker');
                const videoAttr = doc.attributes?.find(a => a.className === 'DocumentAttributeVideo');
                const imageAttr = doc.attributes?.find(a => a.className === 'DocumentAttributeImageSize');
                const isAnimated = doc.mimeType === 'application/x-tgsticker';
                const isVideo = doc.mimeType === 'video/webm';
                const w = (imageAttr || videoAttr)?.w || 512;
                const h = (imageAttr || videoAttr)?.h || 512;
                return {
                    '@type': 'sticker',
                    id: String(doc.id),
                    width: w,
                    height: h,
                    emoji: animAttr?.alt || '',
                    set_id: String(animAttr?.stickerset?.id || 0),
                    is_animated: isAnimated,
                    is_video: isVideo,
                    sticker: {
                        '@type': 'file',
                        id: Number(doc.id) % 2147483647,
                        size: Number(doc.size || 0),
                        expected_size: Number(doc.size || 0),
                        local: { '@type': 'localFile', can_be_downloaded: true, is_downloading_completed: false },
                        remote: { '@type': 'remoteFile', id: String(doc.id) },
                    },
                    thumbnail: null,
                    minithumbnail: null,
                };
            });
            return { '@type': 'stickers', stickers };
        } catch (e) {
            console.warn('[GramJs] searchStickers error', e);
            return { '@type': 'stickers', stickers: [] };
        }
    };

    _requestBotWebView = async ({ bot_user_id, chat_id, url, start_param }) => {
        try {
            const botInput = await this.client.getInputEntity(bot_user_id);
            const peerInput = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const result = await this.client.invoke(
                new Api.messages.RequestWebView({
                    peer: peerInput,
                    bot: botInput,
                    url: url || undefined,
                    startParam: start_param || undefined,
                    platform: 'web',
                }),
            );
            return { url: result.url || '', query_id: String(result.queryId || '0') };
        } catch (e) {
            console.warn('[GramJs] requestBotWebView error', e);
            return { url: '', query_id: '0' };
        }
    };

    _prolongWebView = async ({ bot_user_id, chat_id, query_id }) => {
        try {
            const botInput = await this.client.getInputEntity(bot_user_id);
            const peerInput = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(
                new Api.messages.ProlongWebView({
                    peer: peerInput,
                    bot: botInput,
                    queryId: BigInt(query_id || '0'),
                }),
            );
        } catch (e) {
            console.warn('[GramJs] prolongWebView error', e);
        }
    };

    _sendWebViewData = async ({ bot_user_id, button_text, data }) => {
        try {
            const botInput = await this.client.getInputEntity(bot_user_id);
            await this.client.invoke(
                new Api.messages.SendWebViewData({
                    bot: botInput,
                    randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
                    buttonText: button_text || '',
                    data: data || '',
                }),
            );
        } catch (e) {
            console.warn('[GramJs] sendWebViewData error', e);
        }
    };

    _answerWebAppQuery = async ({ query_id, result }) => {
        try {
            await this.client.invoke(
                new Api.messages.SendWebViewResultMessage({
                    botQueryId: query_id,
                    result,
                }),
            );
        } catch (e) {
            console.warn('[GramJs] answerWebAppQuery error', e);
        }
    };

    // ── Channel Boosts ────────────────────────────────────────────────────────

    _getBoostsStatus = async ({ chat_id }) => {
        if (!chat_id || !this._connected) return { level: 0, boost_count: 0 };
        try {
            const peer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const result = await this.client.invoke(new Api.premium.GetBoostsStatus({ peer }));
            return {
                level: result.level || 0,
                boost_count: Number(result.boosts || 0),
                current_level_boost_count: Number(result.currentLevelBoosts || 0),
                next_level_boost_count: Number(result.nextLevelBoosts || 0),
                premium_subscriber_count: Number(result.premiumSubscribers || 0),
                prepaid_giveaways: result.prepaidGiveaways || [],
                boost_url: result.boostUrl || '',
                my_boost_slots: result.myBoostSlots || [],
            };
        } catch (e) {
            console.warn('[GramJs] getBoostsStatus error', e);
            return { level: 0, boost_count: 0 };
        }
    };

    _getMyBoosts = async () => {
        try {
            const result = await this.client.invoke(new Api.premium.GetMyBoosts());
            return {
                my_boosts: (result.myBoosts || []).map(b => ({
                    slot: b.slot,
                    peer: b.peer,
                    date: Number(b.date || 0),
                    expires: Number(b.expires || 0),
                    cooldown_until_date: Number(b.cooldownUntilDate || 0),
                })),
            };
        } catch (e) {
            console.warn('[GramJs] getMyBoosts error', e);
            return { my_boosts: [] };
        }
    };

    _applyBoost = async ({ chat_id, slots }) => {
        try {
            const peer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(new Api.premium.ApplyBoost({ peer, slots: slots || [] }));
            return { ok: true };
        } catch (e) {
            console.warn('[GramJs] applyBoost error', e);
            return { ok: false, error: e.message };
        }
    };

    _getBoostsList = async ({ chat_id, gifts = false, offset = '', limit = 50 }) => {
        try {
            const peer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const result = await this.client.invoke(new Api.premium.GetBoostsList({ peer, gifts, offset, limit }));
            return {
                count: Number(result.count || 0),
                boosts: (result.boosts || []).map(b => ({
                    user_id: b.userId ? Number(b.userId) : null,
                    giveaway: !!b.giveaway,
                    unclaimed: !!b.unclaimed,
                    date: Number(b.date || 0),
                    expires: Number(b.expires || 0),
                    multiplier: b.multiplier || 1,
                })),
                next_offset: result.nextOffset || '',
            };
        } catch (e) {
            console.warn('[GramJs] getBoostsList error', e);
            return { count: 0, boosts: [] };
        }
    };

    // ── Stars ─────────────────────────────────────────────────────────────────

    _getStarsBalance = async () => {
        try {
            const result = await this.client.invoke(new Api.payments.GetStarsStatus({ peer: new Api.InputPeerSelf() }));
            return { balance: Number(result.balance?.amount || 0) };
        } catch (e) {
            console.warn('[GramJs] getStarsBalance error', e);
            return { balance: 0 };
        }
    };

    _getStarsTransactions = async ({ peer_id, offset = '', limit = 25 }) => {
        try {
            const peer = peer_id ? tdlibChatIdToInputPeer(peer_id, this._entityCache) : new Api.InputPeerSelf();
            const result = await this.client.invoke(new Api.payments.GetStarsTransactions({ peer, offset, limit }));
            return {
                balance: Number(result.balance?.amount || 0),
                transactions: (result.history || []).map(t => ({
                    id: String(t.id || ''),
                    stars: Number(t.stars?.amount || 0),
                    date: Number(t.date || 0),
                    description: t.description || '',
                    peer: t.peer,
                })),
                next_offset: result.nextOffset || '',
            };
        } catch (e) {
            console.warn('[GramJs] getStarsTransactions error', e);
            return { balance: 0, transactions: [] };
        }
    };

    _getStarGiftCatalog = async () => {
        const result = await this.client.invoke(new Api.payments.GetStarGifts({ hash: 0 }));
        return {
            gifts: (result.gifts || []).map(gift => ({
                id: String(gift.id),
                stars: Number(gift.stars || 0),
                convert_stars: Number(gift.convertStars || 0),
                upgrade_stars: gift.upgradeStars != null ? Number(gift.upgradeStars) : null,
                limited: !!gift.limited,
                sold_out: !!gift.soldOut,
                birthday: !!gift.birthday,
                availability_remains:
                    gift.availabilityRemains != null ? Number(gift.availabilityRemains) : null,
                availability_total: gift.availabilityTotal != null ? Number(gift.availabilityTotal) : null,
            })),
        };
    };

    _sendStarGift = async ({ user_id, gift_id, message = '', hide_name = false, include_upgrade = false }) => {
        const giftId = String(gift_id || '').trim();
        if (!/^\d{1,30}$/.test(giftId) || giftId === '0') throw new Error('Regalo no válido');
        const text = String(message || '').trim();
        if (text.length > 128) throw new Error('El mensaje no puede superar 128 caracteres');

        const peer = await this.client.getInputEntity(user_id);
        if (!(peer instanceof Api.InputPeerUser)) throw new Error('Los regalos solo se pueden enviar a usuarios');

        const invoice = new Api.InputInvoiceStarGift({
            peer,
            giftId: BigInt(giftId),
            hideName: !!hide_name,
            includeUpgrade: !!include_upgrade,
            message: text ? new Api.TextWithEntities({ text, entities: [] }) : undefined,
        });
        const form = await this.client.invoke(
            new Api.payments.GetPaymentForm({ invoice, themeParams: new Api.DataJSON({ data: '{}' }) }),
        );
        const result = await this.client.invoke(
            new Api.payments.SendStarsForm({ formId: form.formId, invoice }),
        );
        return { ok: true, result };
    };

    // ── Premium ───────────────────────────────────────────────────────────────

    _getPremiumFeatures = async () => {
        try {
            const result = await this.client.invoke(new Api.help.GetPremiumPromo({ langCode: 'es' }));
            return {
                features: result.videoSections || [],
                monthly_amount: result.monthlyAmount ? Number(result.monthlyAmount.amount) : null,
                currency: result.monthlyAmount?.currency || 'USD',
            };
        } catch (e) {
            console.warn('[GramJs] getPremiumFeatures error', e);
            return { features: [] };
        }
    };

    _getPremiumLimit = async ({ type }) => {
        try {
            const result = await this.client.invoke(new Api.help.GetAppConfig({ hash: 0 }));
            const cfg = result?.config?.value || [];
            return { limits: cfg };
        } catch (e) {
            console.warn('[GramJs] getPremiumLimit error', e);
            return { limits: [] };
        }
    };

    // ── Business ─────────────────────────────────────────────────────────────

    _getBusinessInfo = async ({ user_id }) => {
        if (!Api.account?.GetBusinessInfo) return {};
        try {
            const userInput = await this.client.getInputEntity(user_id);
            const result = await this.client.invoke(new Api.account.GetBusinessInfo({ peer: userInput }));
            return {
                location: result.location ? { address: result.location.address, geo: result.location.geoPoint } : null,
                work_hours: result.workHours || null,
                greeting_message: result.greetingMessage || null,
                away_message: result.awayMessage || null,
                intro: result.intro || null,
            };
        } catch (e) {
            console.warn('[GramJs] getBusinessInfo error', e);
            return {};
        }
    };

    _sendFile = async (chatId, inputPeer, content, replyToMessageId, scheduleDate, disableNotification = false) => {
        const contentType = content['@type'];
        try {
            let file, caption, voiceNote, attributes;

            if (contentType === 'inputMessageDocument') {
                file = content.document?.data;
                caption = content.caption?.text || '';
            } else if (contentType === 'inputMessageVoiceNote') {
                const raw = content.voice_note?.data;
                file = raw instanceof File ? raw : new File([raw], 'voice.webm', { type: 'audio/webm' });
                voiceNote = true;
                caption = '';
                attributes = [new Api.DocumentAttributeAudio({ voice: true, duration: content.duration || 0 })];
            } else if (contentType === 'inputMessageAudio') {
                file = content.audio?.data;
                caption = content.caption?.text || '';
                attributes = [
                    new Api.DocumentAttributeAudio({
                        duration: content.duration || 0,
                        title: content.title || '',
                        performer: content.performer || '',
                    }),
                ];
            } else if (contentType === 'inputMessagePhoto') {
                file = content.photo?.data;
                caption = content.caption?.text || '';
            } else if (contentType === 'inputMessageVideo') {
                file = content.video?.data;
                caption = content.caption?.text || '';
                const dur = content.duration || 0;
                const w = content.width || 0;
                const h = content.height || 0;
                attributes = [new Api.DocumentAttributeVideo({ duration: dur, w, h, supportsStreaming: true })];
            } else if (contentType === 'inputMessageVideoNote') {
                const raw = content.video_note?.data;
                file = raw instanceof File ? raw : new File([raw || []], 'videonote.mp4', { type: 'video/mp4' });
                caption = '';
                const dur = content.duration || 0;
                const len = content.length || 240;
                attributes = [new Api.DocumentAttributeVideo({ duration: dur, w: len, h: len, roundMessage: true })];
            } else if (contentType === 'inputMessageSticker' || contentType === 'inputMessageAnimation') {
                // The sticker/animation is already on Telegram servers — send by file ID reference
                const fileId = content.sticker?.id ?? content.animation?.id;
                const gDoc = fileId != null ? mediaCache.get(Number(fileId)) : null;
                if (gDoc) {
                    const result = await this.client.invoke(
                        new Api.messages.SendMedia({
                            peer: inputPeer,
                            media: new Api.InputMediaDocument({
                                id: new Api.InputDocument({
                                    id: gDoc.id,
                                    accessHash: gDoc.accessHash,
                                    fileReference: gDoc.fileReference,
                                }),
                                ttlSeconds: 0,
                            }),
                            message: '',
                            randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
                            ...(replyToMessageId
                                ? { replyTo: new Api.InputReplyToMessage({ replyToMsgId: replyToMessageId }) }
                                : {}),
                        }),
                    );
                    // Extract the Message from the Updates object
                    const sentMsg = result?.updates?.find?.(u => u.message) || result?.update?.message || null;
                    if (sentMsg) {
                        const tdMessage = translateMessage(sentMsg, chatId);
                        if (tdMessage) {
                            this._emitUpdate({ '@type': 'updateNewMessage', message: tdMessage });
                            const chat = this._chatCache.get(chatId);
                            if (chat) chat.last_message = tdMessage;
                            this._emitUpdate({
                                '@type': 'updateChatLastMessage',
                                chat_id: chatId,
                                last_message: tdMessage,
                                order: String(tdMessage.date * 1000),
                            });
                            return tdMessage;
                        }
                    }
                }
                return {};
            }

            if (!file) return {};

            const result = await this.client.sendFile(inputPeer, {
                file,
                caption: caption || '',
                replyTo: replyToMessageId || undefined,
                voiceNote: voiceNote || false,
                attributes: attributes && attributes.length ? attributes : undefined,
                scheduleDate: scheduleDate || undefined,
                silent: !!disableNotification,
                mimeType: file.type || undefined,
                workers: 1,
            });

            const tdMessage = translateMessage(result, chatId);
            if (tdMessage) {
                this._emitUpdate({ '@type': 'updateNewMessage', message: tdMessage });
                const chat = this._chatCache.get(chatId);
                if (chat) chat.last_message = tdMessage;
                this._emitUpdate({
                    '@type': 'updateChatLastMessage',
                    chat_id: chatId,
                    last_message: tdMessage,
                    order: String(tdMessage.date * 1000),
                });
                return tdMessage;
            }
        } catch (err) {
            console.error('[GramJs] sendFile error', contentType, err);
            throw err;
        }
        return {};
    };

    _editMessage = async req => {
        const { chat_id, message_id, input_message_content } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const text = input_message_content?.text?.text || '';
            await this.client.invoke(
                new Api.messages.EditMessage({
                    peer: inputPeer,
                    id: message_id,
                    message: text,
                }),
            );
            const editDate = Math.floor(Date.now() / 1000);
            this._emitUpdate({
                '@type': 'updateMessageContent',
                chat_id,
                message_id,
                new_content: {
                    '@type': 'messageText',
                    text: { '@type': 'formattedText', text, entities: [] },
                    web_page: null,
                },
            });
            this._emitUpdate({
                '@type': 'updateMessageEdited',
                chat_id,
                message_id,
                edit_date: editDate,
                reply_markup: null,
            });
        } catch (err) {
            throw err;
        }
        return {};
    };

    _deleteMessages = async req => {
        const { chat_id, message_ids, revoke = false } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            if (chat_id < -1000000000000) {
                await this.client.invoke(new Api.channels.DeleteMessages({ channel: inputPeer, id: message_ids }));
            } else {
                await this.client.invoke(new Api.messages.DeleteMessages({ id: message_ids, revoke }));
            }
            this._emitUpdate({
                '@type': 'updateDeleteMessages',
                chat_id,
                message_ids,
                is_permanent: true,
                from_cache: false,
            });
        } catch (err) {
            throw err;
        }
        return {};
    };

    _viewMessages = async req => {
        const { chat_id, message_ids } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const maxId = Math.max(...message_ids);
            if (chat_id < -1000000000000) {
                await this.client.invoke(new Api.channels.ReadHistory({ channel: inputPeer, maxId }));
            } else {
                await this.client.invoke(new Api.messages.ReadHistory({ peer: inputPeer, maxId }));
            }
            // Reset unread count and update last_read_inbox_message_id locally
            const chat = this._chatCache.get(chat_id);
            if (chat) {
                chat.unread_count = 0;
                chat.last_read_inbox_message_id = maxId;
                this._emitUpdate({
                    '@type': 'updateChatReadInbox',
                    chat_id,
                    last_read_inbox_message_id: maxId,
                    unread_count: 0,
                });
            }
        } catch (e) {
            /* no-op */
        }
        return {};
    };

    // ─── User handlers ────────────────────────────────────────────────────────

    _getUser = async req => {
        const { user_id } = req;
        const cached = this._userCache.get(user_id);
        if (cached) return cached;
        try {
            const accessHash = this._entityCache.get(user_id)?.accessHash || BigInt(0);
            const entity = await this.client.getEntity(new Api.InputUser({ userId: BigInt(user_id), accessHash }));
            this._cacheEntity(entity);
            const tdUser = translateUser(entity);
            if (tdUser) {
                this._userCache.set(tdUser.id, tdUser);
                this._emitUpdate({ '@type': 'updateUser', user: tdUser });
                return tdUser;
            }
        } catch (e) {
            /* no-op */
        }
        return null;
    };

    _getUserFullInfo = async req => {
        const { user_id } = req;
        try {
            const result = await this.client.invoke(
                new Api.users.GetFullUser({
                    id: new Api.InputUser({
                        userId: BigInt(user_id),
                        accessHash: this._entityCache.get(user_id)?.accessHash || BigInt(0),
                    }),
                }),
            );
            // GramJS returns UserFull wrapped in users.UserFull (result.fullUser) or directly
            const full = result.fullUser || result;
            // Also update user from the embedded User object if present
            const userObj = (result.users || [])[0];
            if (userObj) {
                this._cacheEntity(userObj);
                const tdUser = translateUser(userObj);
                if (tdUser) {
                    this._userCache.set(tdUser.id, tdUser);
                    this._emitUpdate({ '@type': 'updateUser', user: tdUser });
                }
            }
            return {
                '@type': 'userFullInfo',
                bio: full.about || '',
                supports_calls: true,
                has_private_calls: !!full.phoneCallsPrivate,
                has_private_forwards: !!full.privateForwards,
                need_phone_number_privacy_exception: false,
                commands: (full.botInfo?.commands || []).map(c => ({
                    '@type': 'botCommand',
                    command: c.command || '',
                    description: c.description || '',
                })),
            };
        } catch (e) {
            /* no-op */
        }
        return {
            '@type': 'userFullInfo',
            bio: '',
            supports_calls: false,
            has_private_calls: false,
            has_private_forwards: false,
            need_phone_number_privacy_exception: false,
            commands: [],
        };
    };

    _getSupergroupFullInfo = async req => {
        const { supergroup_id } = req;
        // Map supergroup_id to the negative TDLib chat ID for the channel
        const chatId = -1000000000000 - supergroup_id;
        const empty = {
            '@type': 'supergroupFullInfo',
            description: '',
            member_count: 0,
            administrator_count: 0,
            restricted_count: 0,
            banned_count: 0,
            can_get_members: false,
            can_set_sticker_set: false,
            can_set_location: false,
            can_get_statistics: false,
            sticker_set_id: '0',
            invite_link: '',
            upgraded_from_basic_group_id: 0,
            has_protected_content: false,
        };
        try {
            const inputPeer = tdlibChatIdToInputPeer(chatId, this._entityCache);
            const result = await this.client.invoke(new Api.channels.GetFullChannel({ channel: inputPeer }));
            const full = result.fullChat || {};
            const responseChats = result.chats || [];
            responseChats.forEach(entity => {
                this._cacheEntity(entity);
                const linkedChat = translateChat(entity, null, this._entityCache);
                if (linkedChat) {
                    this._chatCache.set(linkedChat.id, linkedChat);
                    this._emitUpdate({ '@type': 'updateNewChat', chat: linkedChat });
                }
            });
            const info = {
                '@type': 'supergroupFullInfo',
                description: full.about || '',
                member_count: full.participantsCount || 0,
                administrator_count: full.adminsCount || 0,
                restricted_count: full.kickedCount || 0,
                banned_count: full.bannedCount || 0,
                can_get_members: !!full.canViewParticipants,
                can_set_sticker_set: !!full.canSetStickers,
                can_set_location: !!full.canSetLocation,
                can_get_statistics: !!full.canViewStats,
                sticker_set_id: full.stickerset ? String(full.stickerset.id) : '0',
                invite_link: full.exportedInvite?.link || '',
                upgraded_from_basic_group_id: 0,
                has_protected_content: !!full.noforwards,
                linked_chat_id: resolveLinkedCommunityChatId(full.linkedChatId, responseChats),
                slow_mode_delay: full.slowmodeSeconds || 0,
                slow_mode_delay_expires_in: full.slowmodeNextSendDate
                    ? full.slowmodeNextSendDate - Math.floor(Date.now() / 1000)
                    : 0,
            };
            this._emitUpdate({
                '@type': 'updateSupergroupFullInfo',
                supergroup_id,
                supergroup_full_info: info,
            });
            return info;
        } catch (e) {
            console.error('[GramJs] getSupergroupFullInfo error', e);
        }
        return empty;
    };

    _getBasicGroupFullInfo = async req => {
        const { basic_group_id } = req;
        const chatId = -basic_group_id;
        try {
            const result = await this.client.invoke(new Api.messages.GetFullChat({ chatId: BigInt(basic_group_id) }));
            const full = result.fullChat || {};
            const participants = (result.users || [])
                .map(u => {
                    this._cacheUser(u);
                    const tdUser = translateUser(u);
                    if (tdUser) {
                        this._userCache.set(tdUser.id, tdUser);
                        this._emitUpdate({ '@type': 'updateUser', user: tdUser });
                    }
                    return tdUser;
                })
                .filter(Boolean);
            const rawParticipants = full.participants?.participants || [];
            const creatorRaw = rawParticipants.find(p => (p.className || p._) === 'ChatParticipantCreator');
            const creator_user_id = creatorRaw ? Number(creatorRaw.userId) : 0;

            const members = participants.map((u, i) => {
                const rawP = rawParticipants.find(p => Number(p.userId) === u.id);
                const rawCls = rawP ? rawP.className || rawP._ : '';
                let status = { '@type': 'chatMemberStatusMember' };
                if (rawCls === 'ChatParticipantCreator')
                    status = { '@type': 'chatMemberStatusCreator', is_member: true };
                else if (rawCls === 'ChatParticipantAdmin')
                    status = {
                        '@type': 'chatMemberStatusAdministrator',
                        can_be_edited: false,
                        can_change_info: true,
                        can_post_messages: false,
                        can_edit_messages: false,
                        can_delete_messages: true,
                        can_invite_users: true,
                        can_restrict_members: true,
                        can_pin_messages: true,
                        can_promote_members: false,
                    };
                return {
                    '@type': 'chatMember',
                    user_id: u.id,
                    inviter_user_id: 0,
                    joined_chat_date: rawP?.date || 0,
                    status,
                    bot_info: null,
                };
            });
            const info = {
                '@type': 'basicGroupFullInfo',
                description: full.about || '',
                creator_user_id,
                members,
                invite_link: full.exportedInvite?.link || '',
            };
            this._emitUpdate({
                '@type': 'updateBasicGroupFullInfo',
                basic_group_id,
                basic_group_full_info: info,
            });
            return info;
        } catch (e) {
            console.error('[GramJs] getBasicGroupFullInfo error', e);
        }
        return {
            '@type': 'basicGroupFullInfo',
            description: '',
            creator_user_id: 0,
            members: [],
            invite_link: '',
        };
    };

    // ─── Action handlers ─────────────────────────────────────────────────────

    _sendChatAction = async req => {
        const { chat_id, action } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const p = action?.progress || 0;
            const typeMap = {
                chatActionTyping: new Api.SendMessageTypingAction(),
                chatActionRecordingVideo: new Api.SendMessageRecordVideoAction(),
                chatActionUploadingVideo: new Api.SendMessageUploadVideoAction({ progress: p }),
                chatActionRecordingVoiceNote: new Api.SendMessageRecordAudioAction(),
                chatActionUploadingVoiceNote: new Api.SendMessageUploadAudioAction({ progress: p }),
                chatActionUploadingPhoto: new Api.SendMessageUploadPhotoAction({ progress: p }),
                chatActionUploadingDocument: new Api.SendMessageUploadDocumentAction({ progress: p }),
                chatActionChoosingLocation: new Api.SendMessageGeoLocationAction(),
                chatActionChoosingContact: new Api.SendMessageChooseContactAction(),
                chatActionStartPlayingGame: new Api.SendMessageGamePlayAction(),
                chatActionRecordingVideoNote: new Api.SendMessageRecordRoundAction(),
                chatActionUploadingVideoNote: new Api.SendMessageUploadRoundAction({ progress: p }),
                chatActionCancel: new Api.SendMessageCancelAction(),
            };
            const mtAction = typeMap[action?.['@type']] || new Api.SendMessageTypingAction();
            await this.client.invoke(new Api.messages.SetTyping({ peer: inputPeer, action: mtAction }));
        } catch (e) {
            /* no-op */
        }
        return {};
    };

    _togglePin = async req => {
        const { chat_id, is_pinned } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(
                new Api.messages.ToggleDialogPin({
                    peer: new Api.InputDialogPeer({ peer: inputPeer }),
                    pinned: is_pinned,
                }),
            );
            const chat = this._chatCache.get(chat_id);
            const order = is_pinned
                ? '9223372036854775807'
                : String((chat?.last_message?.date || Math.floor(Date.now() / 1000)) * 1000);
            if (chat) chat.is_pinned = is_pinned;
            this._emitUpdate({ '@type': 'updateChatIsPinned', chat_id, is_pinned, order });
        } catch (e) {
            console.error('[GramJs] togglePin error', e);
        }
        return {};
    };

    _searchMessages = async req => {
        const { query, limit = 20 } = req;
        try {
            const result = await this.client.invoke(
                new Api.messages.SearchGlobal({
                    q: query,
                    filter: new Api.InputMessagesFilterEmpty(),
                    minDate: 0,
                    maxDate: 0,
                    offsetRate: 0,
                    offsetPeer: new Api.InputPeerEmpty(),
                    offsetId: 0,
                    limit,
                }),
            );
            if (result.users) result.users.forEach(u => this._cacheUser(u));
            if (result.chats) result.chats.forEach(c => this._cacheEntity(c));
            const messages = (result.messages || [])
                .map(m => {
                    const chatId = peerToTdlibChatId(m.peerId);
                    return chatId ? translateMessage(m, chatId) : null;
                })
                .filter(Boolean);
            return { '@type': 'messages', messages, total_count: result.count || messages.length };
        } catch (e) {
            console.error('[GramJs] searchMessages error', e);
        }
        return { '@type': 'messages', messages: [], total_count: 0 };
    };

    _searchChatMessages = async req => {
        const { chat_id, query, limit = 20, from_message_id = 0, filter, sender_user_id } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);

            const filterMap = {
                searchMessagesFilterPhoto: new Api.InputMessagesFilterPhotos(),
                searchMessagesFilterVideo: new Api.InputMessagesFilterVideo(),
                searchMessagesFilterDocument: new Api.InputMessagesFilterDocument(),
                searchMessagesFilterUrl: new Api.InputMessagesFilterUrl(),
                searchMessagesFilterVoiceNote: new Api.InputMessagesFilterVoice(),
                searchMessagesFilterAudio: new Api.InputMessagesFilterMusic(),
                searchMessagesFilterPinned: new Api.InputMessagesFilterPinned(),
            };
            const gramFilter = (filter && filterMap[filter['@type']]) || new Api.InputMessagesFilterEmpty();

            let fromId = undefined;
            if (sender_user_id) {
                const entity = this._entityCache.get(sender_user_id);
                if (entity) {
                    fromId = new Api.InputPeerUser({
                        userId: BigInt(sender_user_id),
                        accessHash: entity.accessHash || BigInt(0),
                    });
                }
            }

            const msgs = await this.client.invoke(
                new Api.messages.Search({
                    peer: inputPeer,
                    q: query || '',
                    filter: gramFilter,
                    minDate: 0,
                    maxDate: 0,
                    offsetId: from_message_id,
                    addOffset: 0,
                    limit,
                    maxId: 0,
                    minId: 0,
                    hash: BigInt(0),
                    ...(fromId ? { fromId } : {}),
                }),
            );
            const messages = (msgs.messages || []).map(m => translateMessage(m, chat_id)).filter(Boolean);
            return { '@type': 'messages', messages, total_count: msgs.count || messages.length };
        } catch (e) {
            /* no-op */
        }
        return { '@type': 'messages', messages: [], total_count: 0 };
    };

    // ─── Instant View handler ─────────────────────────────────────────────────

    _getWebPageInstantView = async req => {
        const { url } = req;

        // Cache hit — return instantly without a network round-trip.
        const cached = InstantViewCache.get(url);
        if (cached) return cached;

        try {
            const result = await this.client.invoke(new Api.messages.GetWebPage({ url, hash: 0 }));
            const wp = result.webpage || result;
            const wpCls = wp?.className || wp?._;
            if (wpCls !== 'WebPage' || !wp.cachedPage) return {};
            const iv = translateInstantView(wp.cachedPage);
            if (!iv) return {};
            // Attach the canonical URL so InstantViewer.componentDidUpdate can use it
            iv.url = wp.url || url;
            InstantViewCache.set(iv.url, iv);
            return iv;
        } catch (e) {
            console.warn('[GramJs] getWebPageInstantView error:', e);
            return {};
        }
    };

    // ─── Reaction handlers ───────────────────────────────────────────────────

    _sendReaction = async req => {
        const { chat_id, message_id, reaction, is_big } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const request = new Api.messages.SendReaction({
                    peer: inputPeer,
                    msgId: message_id,
                    big: Boolean(is_big),
                    reaction: reaction ? [new Api.ReactionEmoji({ emoticon: reaction })] : [],
                });
            await runGroupCallOperation(
                `reaction:${chat_id}:${message_id}:${reaction || 'remove'}:${Boolean(is_big)}`,
                () => this.client.invoke(request),
            );
        } catch (err) {
            console.error('[GramJs] sendReaction error', err);
        }
        return {};
    };

    _readAllMessageReactions = async req => {
        const { chat_id } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(new Api.messages.ReadReactions({ peer: inputPeer }));
        } catch (err) {
            console.error('[GramJs] readAllMessageReactions error', err);
        }
        return {};
    };

    _getAvailableReactions = async () => {
        try {
            if (this._availableReactions?.length) {
                return { '@type': 'availableReactions', reactions: this._availableReactions };
            }

            const result = await this.client.invoke(new Api.messages.GetAvailableReactions({ hash: 0 }));
            const reactions = (result?.reactions || [])
                .filter(r => !r.inactive && !r.premium && r.reaction)
                .map(r => r.reaction)
                .slice(0, 24);
            this._availableReactions = reactions;
            return { '@type': 'availableReactions', reactions };
        } catch (err) {
            console.error('[GramJs] getAvailableReactions error', err);
            return { '@type': 'availableReactions', reactions: [] };
        }
    };

    _setDefaultReaction = async req => {
        const { reaction } = req;
        try {
            await this.client.invoke(
                new Api.messages.SetDefaultReaction({ reaction: new Api.ReactionEmoji({ emoticon: reaction }) }),
            );
        } catch (err) {
            console.error('[GramJs] setDefaultReaction error', err);
            throw err;
        }
        return {};
    };

    _translateText = async req => {
        const { text, to_language_code } = req;
        try {
            const result = await this.client.invoke(
                new Api.messages.TranslateText({
                    text: [new Api.TextWithEntities({ text, entities: [] })],
                    toLang: to_language_code || 'en',
                }),
            );
            const translated = result?.result?.[0]?.text || '';
            return { '@type': 'text', text: translated };
        } catch (e) {
            console.error('[GramJs] translateText error', e);
            throw e;
        }
    };

    // ─── File handlers ───────────────────────────────────────────────────────

    // ─── Sticker APIs ────────────────────────────────────────────────────────

    _toggleChatTranslations = async req => {
        const { chat_id, disabled = false } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(new Api.messages.TogglePeerTranslations({ peer: inputPeer, disabled }));
        } catch (e) {
            console.error('[GramJs] toggleChatTranslations error', e);
            throw e;
        }
        return { '@type': 'ok' };
    };

    _transcribeAudio = async req => {
        const { chat_id, message_id } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const result = await this.client.invoke(
                new Api.messages.TranscribeAudio({
                    peer: inputPeer,
                    msgId: message_id,
                }),
            );

            return {
                '@type': 'transcribedAudio',
                chat_id,
                message_id,
                pending: !!result.pending,
                transcription_id: result.transcriptionId ? String(result.transcriptionId) : '',
                text: result.text || '',
                trial_remains_num: result.trialRemainsNum || 0,
                trial_remains_until_date: result.trialRemainsUntilDate || 0,
            };
        } catch (e) {
            console.error('[GramJs] transcribeAudio error', e);
            throw e;
        }
    };

    _rateTranscribedAudio = async req => {
        const { chat_id, message_id, transcription_id, is_good } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(
                new Api.messages.RateTranscribedAudio({
                    peer: inputPeer,
                    msgId: message_id,
                    transcriptionId: BigInt(transcription_id),
                    good: !!is_good,
                }),
            );
        } catch (e) {
            console.error('[GramJs] rateTranscribedAudio error', e);
            throw e;
        }
        return {};
    };

    _getInstalledStickerSets = async req => {
        try {
            const result = await this.client.invoke(new Api.messages.GetAllStickers({ hash: BigInt(0) }));
            const sets = (result.sets || []).map(ss => {
                this._stickerSetAccessHashes.set(String(ss.id), ss.accessHash);
                return translateStickerSetInfo(ss);
            });
            return { '@type': 'stickerSets', total_count: sets.length, sets };
        } catch (e) {
            console.warn('[GramJs] getInstalledStickerSets error', e);
            return { '@type': 'stickerSets', total_count: 0, sets: [] };
        }
    };

    _getStickerSet = async req => {
        try {
            const { set_id } = req;
            const idStr = String(set_id);
            const accessHash = this._stickerSetAccessHashes.get(idStr) || BigInt(0);
            const result = await this.client.invoke(
                new Api.messages.GetStickerSet({
                    stickerset: new Api.InputStickerSetID({
                        id: BigInt(idStr),
                        accessHash,
                    }),
                    hash: 0,
                }),
            );
            return (
                translateStickerSet(result) || {
                    '@type': 'stickerSet',
                    id: idStr,
                    title: '',
                    name: '',
                    stickers: [],
                    emojis: [],
                }
            );
        } catch (e) {
            console.warn('[GramJs] getStickerSet error', e);
            return {
                '@type': 'stickerSet',
                id: String(req.set_id || '0'),
                title: '',
                name: '',
                stickers: [],
                emojis: [],
            };
        }
    };

    _getCustomEmojiDocuments = async req => {
        const { document_ids = [] } = req;
        const missing = [];
        const cached = [];
        for (const rawId of document_ids) {
            const key = String(rawId);
            if (this._customEmojiCache.has(key)) {
                cached.push(this._customEmojiCache.get(key));
            } else {
                missing.push(key);
            }
        }
        if (missing.length === 0) {
            return { '@type': 'stickers', stickers: cached };
        }
        try {
            // API limit is 200 IDs per call
            const BATCH = 200;
            const fetched = [];
            for (let i = 0; i < missing.length; i += BATCH) {
                const chunk = missing.slice(i, i + BATCH).map(id => BigInt(id));
                const result = await this.client.invoke(
                    new Api.messages.GetCustomEmojiDocuments({ documentId: chunk }),
                );
                for (const doc of result || []) {
                    const sticker = translateSticker(doc);
                    if (sticker) {
                        this._customEmojiCache.set(String(doc.id), sticker);
                        fetched.push(sticker);
                    }
                }
            }
            return { '@type': 'stickers', stickers: [...cached, ...fetched] };
        } catch (e) {
            console.warn('[GramJs] getCustomEmojiDocuments error', e);
            return { '@type': 'stickers', stickers: cached };
        }
    };

    // ── Stories ───────────────────────────────────────────────────────────────

    _getActiveStories = async () => {
        try {
            const result = await this.client.invoke(new Api.stories.GetAllStories({ next: false, hidden: false }));
            const peers = (result.peerStories || []).map(ps => {
                const peerId = peerToTdlibChatId(ps.peer);
                const stories = (ps.stories || []).map(s => translateStoryItem(s, peerId)).filter(Boolean);
                return {
                    sender_chat_id: peerId,
                    max_read_id: ps.maxReadId || 0,
                    stories,
                    order: ps.order || 0,
                };
            });
            return { '@type': 'activeStories', peers };
        } catch (e) {
            console.warn('[GramJs] getActiveStories error', e);
            return { '@type': 'activeStories', peers: [] };
        }
    };

    _getChatActiveStories = async req => {
        try {
            const { chat_id } = req;
            const peer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const result = await this.client.invoke(new Api.stories.GetPeerStories({ peer }));
            const peerId = chat_id;
            const stories = (result.stories?.stories || []).map(s => translateStoryItem(s, peerId)).filter(Boolean);
            return {
                '@type': 'chatActiveStories',
                sender_chat_id: peerId,
                max_read_id: result.stories?.maxReadId || 0,
                stories,
            };
        } catch (e) {
            console.warn('[GramJs] getChatActiveStories error', e);
            return { '@type': 'chatActiveStories', sender_chat_id: req.chat_id || 0, stories: [] };
        }
    };

    _getStory = async req => {
        try {
            const { chat_id, story_id } = req;
            const peer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const result = await this.client.invoke(new Api.stories.GetStoriesByID({ peer, id: [story_id] }));
            const stories = (result.stories || []).map(s => translateStoryItem(s, chat_id)).filter(Boolean);
            return stories[0] || null;
        } catch (e) {
            console.warn('[GramJs] getStory error', e);
            return null;
        }
    };

    _readStories = async req => {
        try {
            const { chat_id, max_story_id } = req;
            const peer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(new Api.stories.ReadStories({ peer, maxId: max_story_id }));
            return {};
        } catch (e) {
            console.warn('[GramJs] readStories error', e);
            return {};
        }
    };

    _sendStory = async req => {
        const { file, caption = '', privacy = 'everyone', period = 86400 } = req;
        if (!file) throw new Error('No file provided');

        const isVideo = file.type?.startsWith('video/');

        // Upload the file
        const uploaded = await this.client.uploadFile({ file, workers: 4 });

        let media;
        if (isVideo) {
            media = new Api.InputMediaUploadedDocument({
                file: uploaded,
                mimeType: file.type || 'video/mp4',
                attributes: [new Api.DocumentAttributeVideo({ duration: 0, w: 720, h: 1280, supportsStreaming: true })],
                nosoundVideo: false,
            });
        } else {
            media = new Api.InputMediaUploadedPhoto({ file: uploaded });
        }

        const privacyRules = {
            everyone: [new Api.InputPrivacyValueAllowAll()],
            contacts: [new Api.InputPrivacyValueAllowContacts()],
            close_friends: [new Api.InputPrivacyValueAllowCloseFriends()],
        }[privacy] || [new Api.InputPrivacyValueAllowAll()];

        const me = await this.client.getMe();
        const peer = new Api.InputPeerSelf();

        await this.client.invoke(
            new Api.stories.SendStory({
                peer,
                media,
                caption: caption || undefined,
                privacyRules,
                period,
                randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
            }),
        );
        return { '@type': 'storySent' };
    };

    _sendStoryAlbum = async req => {
        const { items = [], privacy = 'everyone', period = 86400, onProgress } = req;
        if (!Array.isArray(items) || items.length === 0) throw new Error('No story items provided');
        if (items.length > 20) throw new Error('A story album cannot contain more than 20 items');

        const published = [];
        for (let index = 0; index < items.length; index += 1) {
            try {
                await this._sendStory({ ...items[index], privacy, period });
                published.push(index);
                if (typeof onProgress === 'function') onProgress({ completed: index + 1, total: items.length });
            } catch (error) {
                error.storyAlbumResult = { published, failedIndex: index, total: items.length };
                throw error;
            }
        }
        return { '@type': 'storyAlbumSent', published, total: items.length };
    };

    _getStoryViewers = async req => {
        try {
            const { chat_id, story_id, offset = '', limit = 50 } = req;
            const peer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const result = await this.client.invoke(
                new Api.stories.GetStoryViewsList({
                    peer,
                    id: story_id,
                    offset,
                    limit,
                    justContacts: false,
                    reactionsFirst: false,
                }),
            );
            const viewers = (result.views || []).map(v => ({
                '@type': 'storyViewer',
                user_id: Number(v.userId || 0),
                date: v.date || 0,
            }));
            return { '@type': 'storyViewers', viewers, total_count: result.count || viewers.length };
        } catch (e) {
            console.warn('[GramJs] getStoryViewers error', e);
            return { '@type': 'storyViewers', viewers: [], total_count: 0 };
        }
    };

    _getRecentStickers = async req => {
        try {
            const result = await this.client.invoke(
                new Api.messages.GetRecentStickers({ attached: false, hash: BigInt(0) }),
            );
            const stickers = (result.stickers || []).map(doc => translateSticker(doc)).filter(Boolean);
            return { '@type': 'stickers', stickers };
        } catch (e) {
            return { '@type': 'stickers', stickers: [] };
        }
    };

    _getMediaDcId = gMedia => {
        if (!gMedia) return undefined;
        if (gMedia['@type'] === 'profilePhoto') {
            return gMedia.entity?.photo?.dcId;
        }
        return gMedia.dcId;
    };

    _getDownloadDcKey = dcId => String(dcId || this.client?.session?.dcId || 'main');

    _getFloodWaitSeconds = err => {
        if (!err) return 0;
        if (Number.isFinite(err.seconds)) return Number(err.seconds);
        const message = String(err.message || err.errorMessage || '');
        const match = message.match(/(?:FLOOD_WAIT_?|wait of )(\d+)/i);
        return match ? Number(match[1]) : 0;
    };

    _deferDownloads = (dcId, seconds) => {
        const key = this._getDownloadDcKey(dcId);
        const waitMs = Math.max(1, seconds) * 1000;
        const until = Date.now() + waitMs;
        const currentUntil = this._downloadDeferUntil.get(key) || 0;
        if (until > currentUntil) {
            this._downloadDeferUntil.set(key, until);
        }
    };

    _isDownloadDeferred = dcId => {
        const until = this._downloadDeferUntil.get(this._getDownloadDcKey(dcId)) || 0;
        if (Date.now() < until) return true;
        if (until) {
            this._downloadDeferUntil.delete(this._getDownloadDcKey(dcId));
        }
        return false;
    };

    _recoverDownloadConnection = async dcId => {
        const key = this._getDownloadDcKey(dcId);
        if (this._downloadReconnects.has(key)) {
            return this._downloadReconnects.get(key);
        }

        const now = Date.now();
        const lastReconnectAt = this._downloadReconnectAt.get(key) || 0;
        if (now - lastReconnectAt < 5000) {
            return Promise.resolve();
        }

        const reconnect = (async () => {
            try {
                this._downloadReconnectAt.set(key, Date.now());
                const mainDcId = this.client?.session?.dcId;
                if (dcId && mainDcId && Number(dcId) !== Number(mainDcId)) {
                    // Exported senders are rate-limited by Telegram. Do not force
                    // auth.ExportAuthorization here; pause this DC and try later.
                    this._deferDownloads(dcId, 30);
                    return;
                }

                if (!this.client?.connected) {
                    await this.client.connect();
                    return;
                }
            } catch (err) {
                console.warn('[GramJs] download reconnect failed', dcId, err);
            } finally {
                this._downloadReconnects.delete(key);
            }
        })();

        this._downloadReconnects.set(key, reconnect);
        return reconnect;
    };

    _emitUpdateFile = (fileId, blob, isComplete = false, isActive = false) => {
        const size = blob ? blob.size : 0;
        this._emitUpdate({
            '@type': 'updateFile',
            file: {
                '@type': 'file',
                id: fileId,
                size,
                expected_size: size,
                local: {
                    '@type': 'localFile',
                    path: '',
                    can_be_downloaded: !isComplete,
                    can_be_deleted: false,
                    is_downloading_active: isActive,
                    is_downloading_completed: isComplete,
                    downloaded_prefix_size: isComplete ? size : 0,
                    downloaded_size: isComplete ? size : 0,
                },
                remote: {
                    '@type': 'remoteFile',
                    id: String(fileId),
                    unique_id: String(fileId),
                    is_uploading_active: false,
                    is_uploading_completed: true,
                    uploaded_size: size,
                },
            },
        });
    };

    _downloadFile = async req => {
        const { file_id } = req;
        const fileId = typeof file_id === 'number' ? file_id : Number(file_id);

        if (this._downloadedFiles.has(fileId)) {
            this._emitUpdateFile(fileId, this._downloadedFiles.get(fileId), true);
            return { '@type': 'file', id: fileId };
        }
        if (this._downloadingFiles.has(fileId)) {
            return { '@type': 'file', id: fileId };
        }

        const gMedia = mediaCache.get(fileId);
        if (!gMedia) {
            console.warn('[GramJs] downloadFile: sin entrada en mediaCache para', fileId);
            return { '@type': 'file', id: fileId };
        }

        this._downloadingFiles.add(fileId);
        this._emitUpdateFile(fileId, null, false, true);

        const MAX_RETRIES = 4;
        const RETRY_DELAYS_MS = [250, 600, 1200, 2000];
        const mediaDcId = this._getMediaDcId(gMedia);

        if (this._isDownloadDeferred(mediaDcId)) {
            this._downloadingFiles.delete(fileId);
            this._emitUpdateFile(fileId, null, false);
            return { '@type': 'file', id: fileId };
        }

        const attemptDownload = async () => {
            const cls = gMedia.className || gMedia._;
            const dcId = mediaDcId;

            if (gMedia['@type'] === 'profilePhoto') {
                const buffer = await this.client.downloadProfilePhoto(gMedia.entity, {
                    isBig: !!gMedia.isBig,
                    workers: 1,
                });
                return new Blob([buffer || new Uint8Array()]);
            }

            let inputLocation;
            if (cls === 'Photo') {
                const downloadableSizes = (gMedia.sizes || []).filter(s => {
                    const sc = s.className || s._;
                    return sc !== 'PhotoStrippedSize' && sc !== 'PhotoSizeEmpty' && sc !== 'PhotoPathSize';
                });
                const biggestSize = downloadableSizes.slice(-1)[0];
                inputLocation = new Api.InputPhotoFileLocation({
                    id: gMedia.id,
                    accessHash: gMedia.accessHash,
                    fileReference: gMedia.fileReference,
                    thumbSize: biggestSize ? biggestSize.type : 'x',
                });
            } else {
                inputLocation = new Api.InputDocumentFileLocation({
                    id: gMedia.id,
                    accessHash: gMedia.accessHash,
                    fileReference: gMedia.fileReference,
                    thumbSize: '',
                });
            }
            const fileSize = gMedia.size ? bigInt(String(gMedia.size)) : bigInt(0);
            const buffer = await this.client.downloadFile(inputLocation, { dcId, fileSize, workers: 1 });
            return new Blob([buffer]);
        };

        const isConnectionNotInited = err =>
            err?.message?.includes('CONNECTION_NOT_INITED') ||
            err?.errorMessage === 'CONNECTION_NOT_INITED' ||
            (err?.code === 400 && String(err?.message).includes('CONNECTION_NOT_INITED'));

        let lastErr;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    await new Promise(res => setTimeout(res, RETRY_DELAYS_MS[attempt - 1]));
                }
                const blob = await attemptDownload();
                this._downloadedFiles.set(fileId, blob);
                this._downloadingFiles.delete(fileId);
                this._emitUpdateFile(fileId, blob, true);
                return { '@type': 'file', id: fileId };
            } catch (err) {
                const floodWaitSeconds = this._getFloodWaitSeconds(err);
                if (floodWaitSeconds > 0) {
                    this._deferDownloads(mediaDcId, floodWaitSeconds);
                    console.warn('[GramJs] downloadFile deferred by flood wait', fileId, `${floodWaitSeconds}s`);
                    this._downloadingFiles.delete(fileId);
                    this._emitUpdateFile(fileId, null, false);
                    return { '@type': 'file', id: fileId };
                }

                if (isConnectionNotInited(err) && attempt < MAX_RETRIES) {
                    lastErr = err;
                    const mainDcId = this.client?.session?.dcId;
                    if (mediaDcId && mainDcId && Number(mediaDcId) !== Number(mainDcId)) {
                        this._deferDownloads(mediaDcId, 30);
                        console.warn('[GramJs] downloadFile deferred: exported sender not ready', fileId, mediaDcId);
                        this._downloadingFiles.delete(fileId);
                        this._emitUpdateFile(fileId, null, false);
                        return { '@type': 'file', id: fileId };
                    }
                    await this._recoverDownloadConnection(mediaDcId);
                    continue;
                }
                console.error('[GramJs] downloadFile error', fileId, err);
                this._downloadingFiles.delete(fileId);
                this._emitUpdateFile(fileId, null, false);
                return { '@type': 'file', id: fileId };
            }
        }
        // Llegamos aquí solo si todos los reintentos de CONNECTION_NOT_INITED fallaron
        console.error('[GramJs] downloadFile error after retries', fileId, lastErr);
        this._downloadingFiles.delete(fileId);
        this._emitUpdateFile(fileId, null, false);

        return { '@type': 'file', id: fileId };
    };

    _readFile = async req => {
        const { file_id } = req;
        const fileId = typeof file_id === 'number' ? file_id : Number(file_id);
        // Return the Blob directly so FileStore.setBlob stores a real Blob.
        // The old binary-string path caused URL.createObjectURL to fail.
        const blob = this._downloadedFiles.get(fileId) || null;
        return { '@type': 'filePart', data: blob };
    };

    // ─── Compatibilidad con TdLibController ─────────────────────────────────

    setChatId = (chatId, messageId = null) => {
        this.clientUpdate({ '@type': 'clientUpdateChatId', chatId, messageId });
    };

    setMediaViewerContent = content => {
        this.clientUpdate({ '@type': 'clientUpdateMediaViewerContent', content });
    };

    sendTdParameters = async () => {
        // No-op: en GramJS los parámetros se pasan al constructor del cliente
    };

    // ─── Notificaciones / estado de chat ────────────────────────────────────

    _setChatNotificationSettings = async req => {
        const { chat_id, notification_settings } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const INT32_MAX = 2147483647;
            const rawMuteUntil = notification_settings?.mute_for
                ? Math.floor(Date.now() / 1000) + notification_settings.mute_for
                : 0;
            const muteUntil = Math.min(rawMuteUntil, INT32_MAX);

            await this.client.invoke(
                new Api.account.UpdateNotifySettings({
                    peer: new Api.InputNotifyPeer({ peer: inputPeer }),
                    settings: new Api.InputPeerNotifySettings({
                        muteUntil,
                        showPreviews: notification_settings?.show_preview ?? true,
                        silent: notification_settings?.mute_for > 0,
                    }),
                }),
            );

            // Refleja el cambio en el store localmente
            this._emitUpdate({
                '@type': 'updateChatNotificationSettings',
                chat_id,
                notification_settings: {
                    '@type': 'chatNotificationSettings',
                    use_default_mute_for: false,
                    mute_for: notification_settings?.mute_for ?? 0,
                    use_default_sound: true,
                    sound: '',
                    use_default_show_preview: false,
                    show_preview: notification_settings?.show_preview ?? true,
                    use_default_disable_pinned_message_notifications: true,
                    disable_pinned_message_notifications: false,
                    use_default_disable_mention_notifications: true,
                    disable_mention_notifications: false,
                },
            });
        } catch (e) {
            console.error('[GramJs] setChatNotificationSettings error', e);
        }
        return {};
    };

    _toggleChatIsMarkedAsUnread = async req => {
        const { chat_id, is_marked_as_unread } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(
                new Api.messages.MarkDialogUnread({
                    peer: new Api.InputDialogPeer({ peer: inputPeer }),
                    unread: is_marked_as_unread,
                }),
            );
            this._emitUpdate({
                '@type': 'updateChatIsMarkedAsUnread',
                chat_id,
                is_marked_as_unread,
            });
        } catch (e) {
            console.error('[GramJs] toggleChatIsMarkedAsUnread error', e);
        }
        return {};
    };

    _setChatDraftMessage = async req => {
        const { chat_id, draft_message } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const text = draft_message?.input_message_text?.text?.text || '';
            const replyToMsgId = draft_message?.reply_to_message_id || 0;
            await this.client.invoke(
                new Api.messages.SaveDraft({
                    peer: inputPeer,
                    message: text,
                    ...(replyToMsgId ? { replyToMsgId } : {}),
                }),
            );
            const chat = this._chatCache.get(chat_id);
            if (chat) chat.draft_message = draft_message || null;
            const order = String((chat?.last_message?.date || Math.floor(Date.now() / 1000)) * 1000);
            this._emitUpdate({
                '@type': 'updateChatDraftMessage',
                chat_id,
                draft_message: draft_message || null,
                order,
            });
        } catch (e) {
            console.error('[GramJs] setChatDraftMessage error', e);
        }
        return {};
    };

    _reportChat = async req => {
        const { chat_id, message_ids, reason, text } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            let mtReason = new Api.InputReportReasonSpam();
            if (reason) {
                switch (reason['@type']) {
                    case 'chatReportReasonViolence':
                        mtReason = new Api.InputReportReasonViolence();
                        break;
                    case 'chatReportReasonPornography':
                        mtReason = new Api.InputReportReasonPornography();
                        break;
                    case 'chatReportReasonChildAbuse':
                        mtReason = new Api.InputReportReasonChildAbuse();
                        break;
                    case 'chatReportReasonCopyright':
                        mtReason = new Api.InputReportReasonCopyright();
                        break;
                    case 'chatReportReasonUnrelatedLocation':
                        mtReason = new Api.InputReportReasonGeoIrrelevant();
                        break;
                    default:
                        mtReason = new Api.InputReportReasonSpam();
                }
            }
            await this.client.invoke(
                new Api.messages.Report({
                    peer: inputPeer,
                    id: message_ids || [],
                    reason: mtReason,
                    message: text || '',
                }),
            );
        } catch (e) {
            console.error('[GramJs] reportChat error', e);
        }
        return {};
    };

    _readAllChatMentions = async req => {
        const { chat_id } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(new Api.messages.ReadMentions({ peer: inputPeer }));
        } catch (e) {
            console.error('[GramJs] readAllChatMentions error', e);
        }
        return {};
    };

    _blockUser = async req => {
        const { user_id } = req;
        try {
            await this.client.invoke(
                new Api.contacts.Block({
                    id: new Api.InputUser({
                        userId: BigInt(user_id),
                        accessHash: this._entityCache.get(user_id)?.accessHash || BigInt(0),
                    }),
                }),
            );
            this._emitUpdate({ '@type': 'updateUserFullInfo', user_id, user_full_info: { is_blocked: true } });
        } catch (e) {
            console.error('[GramJs] blockUser error', e);
        }
        return {};
    };

    _unblockUser = async req => {
        const { user_id } = req;
        try {
            await this.client.invoke(
                new Api.contacts.Unblock({
                    id: new Api.InputUser({
                        userId: BigInt(user_id),
                        accessHash: this._entityCache.get(user_id)?.accessHash || BigInt(0),
                    }),
                }),
            );
            this._emitUpdate({ '@type': 'updateUserFullInfo', user_id, user_full_info: { is_blocked: false } });
        } catch (e) {
            console.error('[GramJs] unblockUser error', e);
        }
        return {};
    };

    _getMessageLink = async req => {
        const { chat_id, message_id } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            if (inputPeer instanceof Api.InputPeerChannel) {
                const result = await this.client.invoke(
                    new Api.channels.ExportMessageLink({
                        channel: new Api.InputChannel({
                            channelId: inputPeer.channelId,
                            accessHash: inputPeer.accessHash,
                        }),
                        id: message_id,
                        grouped: false,
                    }),
                );
                return { '@type': 'messageLink', link: result.link, is_public: true };
            }
        } catch (e) {
            console.error('[GramJs] getMessageLink error', e);
        }
        return { '@type': 'messageLink', link: '', is_public: false };
    };

    _getActiveSessions = async () => {
        try {
            const result = await this.client.invoke(new Api.account.GetAuthorizations());
            const sessions = (result.authorizations || []).map(auth => ({
                id: auth.hash.toString(),
                hash: auth.hash,
                app_name: auth.appName || '',
                app_version: auth.appVersion || '',
                device_model: auth.deviceModel || '',
                platform: auth.platform || '',
                system_version: auth.systemVersion || '',
                country: auth.country || '',
                region: auth.region || '',
                date_active: auth.dateActive || 0,
                date_created: auth.dateCreated || 0,
                is_current: auth.current || false,
                is_password_pending: auth.passwordPending || false,
            }));
            return { '@type': 'sessions', sessions };
        } catch (e) {
            console.error('[GramJs] getActiveSessions error', e);
        }
        return { '@type': 'sessions', sessions: [] };
    };

    _terminateSession = async req => {
        const { session_id } = req;
        try {
            await this.client.invoke(new Api.account.ResetAuthorization({ hash: BigInt(session_id) }));
            return { '@type': 'ok' };
        } catch (e) {
            console.error('[GramJs] terminateSession error', e);
        }
        return null;
    };

    _terminateAllOtherSessions = async () => {
        try {
            await this.client.invoke(new Api.auth.ResetAuthorizations());
            return { '@type': 'ok' };
        } catch (e) {
            console.error('[GramJs] terminateAllOtherSessions error', e);
        }
        return null;
    };

    _kickGroupMember = async req => {
        const { chat_id, user_id } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const userEntity = this._entityCache.get(user_id);
            const inputUser = new Api.InputUser({
                userId: BigInt(user_id),
                accessHash: userEntity?.accessHash || BigInt(0),
            });

            if (inputPeer instanceof Api.InputPeerChannel) {
                const bannedRights = new Api.ChatBannedRights({
                    viewMessages: false,
                    sendMessages: false,
                    sendMedia: false,
                    sendStickers: false,
                    sendGifs: false,
                    sendGames: false,
                    sendInline: false,
                    embedLinks: false,
                    untilDate: 1,
                });
                await this.client.invoke(
                    new Api.channels.EditBanned({
                        channel: new Api.InputChannel({
                            channelId: inputPeer.channelId,
                            accessHash: inputPeer.accessHash,
                        }),
                        participant: inputUser,
                        bannedRights,
                    }),
                );
                await this.client.invoke(
                    new Api.channels.EditBanned({
                        channel: new Api.InputChannel({
                            channelId: inputPeer.channelId,
                            accessHash: inputPeer.accessHash,
                        }),
                        participant: inputUser,
                        bannedRights: new Api.ChatBannedRights({ untilDate: 0 }),
                    }),
                );
            } else if (inputPeer instanceof Api.InputPeerChat) {
                await this.client.invoke(
                    new Api.messages.DeleteChatUser({
                        chatId: inputPeer.chatId,
                        userId: inputUser,
                        revokeHistory: false,
                    }),
                );
            }
            return { '@type': 'ok' };
        } catch (e) {
            console.error('[GramJs] kickGroupMember error', e);
        }
        return null;
    };

    _banGroupMember = async req => {
        const { chat_id, user_id } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const userEntity = this._entityCache.get(user_id);
            const inputUser = new Api.InputUser({
                userId: BigInt(user_id),
                accessHash: userEntity?.accessHash || BigInt(0),
            });

            if (inputPeer instanceof Api.InputPeerChannel) {
                const bannedRights = new Api.ChatBannedRights({
                    viewMessages: true,
                    sendMessages: true,
                    sendMedia: true,
                    sendStickers: true,
                    sendGifs: true,
                    sendGames: true,
                    sendInline: true,
                    embedLinks: true,
                    untilDate: 0,
                });
                await this.client.invoke(
                    new Api.channels.EditBanned({
                        channel: new Api.InputChannel({
                            channelId: inputPeer.channelId,
                            accessHash: inputPeer.accessHash,
                        }),
                        participant: inputUser,
                        bannedRights,
                    }),
                );
            } else if (inputPeer instanceof Api.InputPeerChat) {
                await this.client.invoke(
                    new Api.messages.DeleteChatUser({
                        chatId: inputPeer.chatId,
                        userId: inputUser,
                        revokeHistory: false,
                    }),
                );
            }
            return { '@type': 'ok' };
        } catch (e) {
            console.error('[GramJs] banGroupMember error', e);
        }
        return null;
    };

    _setChatDescription = async req => {
        const { chat_id, description } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            if (inputPeer instanceof Api.InputPeerChannel) {
                await this.client.invoke(
                    new Api.channels.EditAbout({
                        channel: new Api.InputChannel({
                            channelId: inputPeer.channelId,
                            accessHash: inputPeer.accessHash,
                        }),
                        about: description,
                    }),
                );
            } else if (inputPeer instanceof Api.InputPeerChat) {
                await this.client.invoke(new Api.messages.EditChatAbout({ peer: inputPeer, about: description }));
            }
            return { '@type': 'ok' };
        } catch (e) {
            console.error('[GramJs] setChatDescription error', e);
        }
        return null;
    };

    _setChatProtectedContent = async req => {
        const { chat_id, has_protected_content } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            if (!(inputPeer instanceof Api.InputPeerChannel)) return null;

            await this.client.invoke(
                new Api.messages.ToggleNoForwards({
                    peer: inputPeer,
                    enabled: !!has_protected_content,
                }),
            );

            const chat = this._chatCache.get(chat_id);
            const supergroupId = chat && chat.type && chat.type.supergroup_id;
            if (supergroupId) {
                this._emitUpdate({
                    '@type': 'updateSupergroupFullInfo',
                    supergroup_id: supergroupId,
                    supergroup_full_info: { has_protected_content: !!has_protected_content },
                });
            }
            return { '@type': 'ok' };
        } catch (e) {
            console.error('[GramJs] setChatProtectedContent error', e);
        }
        return null;
    };

    _leaveChat = async req => {
        const { chat_id } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            if (inputPeer instanceof Api.InputPeerChannel) {
                await this.client.invoke(
                    new Api.channels.LeaveChannel({
                        channel: new Api.InputChannel({
                            channelId: inputPeer.channelId,
                            accessHash: inputPeer.accessHash,
                        }),
                    }),
                );
            } else if (inputPeer instanceof Api.InputPeerChat) {
                await this.client.invoke(
                    new Api.messages.DeleteChatUser({
                        chatId: inputPeer.chatId,
                        userId: new Api.InputUserSelf(),
                    }),
                );
            }
            this._emitUpdate({
                '@type': 'updateChatChatList',
                chat_id,
                chat_list: null,
            });
            return { '@type': 'ok' };
        } catch (e) {
            console.error('[GramJs] leaveChat error', e);
        }
        return null;
    };

    _getUserProfilePhotos = async req => {
        const { user_id, offset, limit } = req;
        try {
            const u = this._entityCache.get(user_id);
            const inputUser = new Api.InputUser({
                userId: BigInt(user_id),
                accessHash: u?.accessHash || BigInt(0),
            });
            const result = await this.client.invoke(
                new Api.photos.GetUserPhotos({
                    userId: inputUser,
                    offset: offset || 0,
                    maxId: BigInt(0),
                    limit: Math.min(limit || 100, 100),
                }),
            );
            const photos = (result.photos || []).map(translateUserProfilePhoto).filter(Boolean);
            const totalCount = result.count !== undefined ? result.count : photos.length;
            return { '@type': 'userProfilePhotos', total_count: totalCount, photos };
        } catch (e) {
            console.error('[GramJs] getUserProfilePhotos error', e);
            return { '@type': 'userProfilePhotos', total_count: 0, photos: [] };
        }
    };

    _getInviteLink = async req => {
        const { chat_id } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const result = await this.client.invoke(new Api.messages.ExportChatInvite({ peer: inputPeer }));
            return { '@type': 'chatInviteLink', invite_link: result.link };
        } catch (e) {
            console.error('[GramJs] getInviteLink error', e);
        }
        return null;
    };

    _cancelDownloadFile = async req => {
        const { file_id } = req;
        const fileId = typeof file_id === 'number' ? file_id : Number(file_id);
        this._downloadingFiles.delete(fileId);
        this._emitUpdate({
            '@type': 'updateFile',
            file: {
                id: fileId,
                local: { is_downloading_active: false, is_downloading_completed: false, downloaded_size: 0 },
            },
        });
        return {};
    };

    _bytesToBase64Url = bytes => {
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
        }
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    };

    _emitAuthError = err => {
        const message = err?.errorMessage || err?.message || String(err);
        this.emit('tdlib_auth_error', {
            '@type': 'error',
            code: err?.code || 400,
            message,
        });
    };

    _isAuthTokenExpired = err => {
        const message = err?.errorMessage || err?.message || String(err);
        return message.includes('AUTH_TOKEN_EXPIRED');
    };

    _waitForClientConnection = async () => {
        for (let attempt = 0; attempt < 40; attempt++) {
            if (this.client?.connected) return true;
            await new Promise(resolve => setTimeout(resolve, 250));
        }

        if (this.client && !this.client.connected) {
            await this.client.connect();
            return true;
        }

        return false;
    };

    _emitQrLoginToken = result => {
        const tokenBase64 = this._bytesToBase64Url(result.token);
        const link = `tg://login?token=${tokenBase64}`;
        this._emitUpdate({
            '@type': 'updateAuthorizationState',
            authorization_state: {
                '@type': 'authorizationStateWaitQrCode',
                other_user_ids: [],
                link,
            },
        });
    };

    _handleQrLoginResult = async result => {
        if (result instanceof Api.auth.LoginToken) {
            this._emitQrLoginToken(result);
            this._qrPollGeneration += 1;
            this._pollQrToken(result.expires, this._qrPollGeneration);
            return;
        }

        if (result instanceof Api.auth.LoginTokenMigrateTo) {
            try {
                await this.client.disconnect();
            } catch (_) {}

            this.client = new TelegramClient(
                new StringSession(''),
                this.apiId,
                this.apiHash,
                this._buildClientOptions(result.dcId),
            );
            if (this.client.setLogLevel) this.client.setLogLevel('error');
            this._setupUpdateHandler();
            await this.client.connect();

            const migratedResult = await this.client.invoke(
                new Api.auth.ImportLoginToken({
                    token: result.token,
                }),
            );
            await this._handleQrLoginResult(migratedResult);
            return;
        }

        if (result instanceof Api.auth.LoginTokenSuccess) {
            this._qrPollGeneration += 1;
            await this._onAuthorized();
        }
    };

    _completeQrLoginFromUpdate = async () => {
        if (this._qrLoginCompleting) return;
        this._qrLoginCompleting = true;
        this._qrPollGeneration += 1;

        try {
            if (!(await this._waitForClientConnection())) throw new Error('CLIENT_NOT_CONNECTED');
            const result = await this.client.invoke(
                new Api.auth.ExportLoginToken({
                    apiId: this.apiId,
                    apiHash: this.apiHash,
                    exceptIds: [],
                }),
            );
            await this._handleQrLoginResult(result);
        } catch (e) {
            console.warn('[GramJs] complete QR login error', e);
            if (this._isAuthTokenExpired(e)) {
                this._requestQrCodeAuthentication({}).catch(err => this._emitAuthError(err));
            } else {
                this._emitAuthError(e);
            }
        } finally {
            this._qrLoginCompleting = false;
        }
    };

    _cancelQrCodeAuthentication = () => {
        // Incrementar la generación cancela cualquier _pollQrToken en vuelo
        // (el guard `if (generation !== this._qrPollGeneration) return` lo detiene).
        this._qrPollGeneration += 1;
        this._qrLoginCompleting = false;
        this._emitUpdate({
            '@type': 'updateAuthorizationState',
            authorization_state: { '@type': 'authorizationStateWaitPhoneNumber' },
        });
        return {};
    };

    _requestQrCodeAuthentication = async req => {
        this._qrPollGeneration += 1;
        try {
            if (!(await this._waitForClientConnection())) throw new Error('CLIENT_NOT_CONNECTED');
            const result = await this.client.invoke(
                new Api.auth.ExportLoginToken({
                    apiId: this.apiId,
                    apiHash: this.apiHash,
                    exceptIds: [],
                }),
            );
            await this._handleQrLoginResult(result);
        } catch (e) {
            console.error('[GramJs] requestQrCodeAuthentication error', e);
            if (this._isAuthTokenExpired(e)) {
                this._requestQrCodeAuthentication({}).catch(err => this._emitAuthError(err));
            } else {
                this._emitAuthError(e);
            }
        }
        return {};
    };

    _pollQrToken = async (expires, generation) => {
        const waitMs = Math.max(0, (expires - Math.floor(Date.now() / 1000) - 2) * 1000);
        await new Promise(r => setTimeout(r, Math.min(waitMs, 20000)));
        if (generation !== this._qrPollGeneration) return;
        try {
            if (!(await this._waitForClientConnection())) throw new Error('CLIENT_NOT_CONNECTED');
            const result = await this.client.invoke(
                new Api.auth.ExportLoginToken({
                    apiId: this.apiId,
                    apiHash: this.apiHash,
                    exceptIds: [],
                }),
            );
            await this._handleQrLoginResult(result);
        } catch (e) {
            console.warn('[GramJs] QR poll error', e);
            if (this._isAuthTokenExpired(e)) {
                this._requestQrCodeAuthentication({}).catch(err => this._emitAuthError(err));
            } else {
                this._emitAuthError(e);
            }
        }
    };

    _getTwoStepVerificationStatus = async () => {
        try {
            const pwd = await this.client.invoke(new Api.account.GetPassword());
            return {
                '@type': 'twoStepVerificationStatus',
                has_password: pwd.hasPassword || false,
                password_hint: pwd.hint || '',
                has_recovery_email_address: pwd.hasRecovery || false,
            };
        } catch (e) {
            console.error('[GramJs] getTwoStepVerificationStatus error', e);
            return { '@type': 'twoStepVerificationStatus', has_password: false, password_hint: '' };
        }
    };

    _setTwoStepVerificationPassword = async req => {
        const { current_password, new_password, new_hint } = req;
        try {
            await this.client.updateTwoFaSettings({
                currentPassword: current_password || undefined,
                newPassword: new_password || '',
                hint: new_hint || '',
            });
            return { '@type': 'ok' };
        } catch (e) {
            console.error('[GramJs] setTwoStepVerificationPassword error', e);
            throw new Error(e.message || 'Error al cambiar la contraseña 2FA');
        }
    };

    _setChatMessageTtl = async req => {
        const { chat_id, ttl } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(new Api.messages.SetHistoryTTL({ peer: inputPeer, period: ttl }));
            this._emitUpdate({
                '@type': 'updateChatMessageTtl',
                chat_id,
                message_ttl: ttl,
            });
        } catch (e) {
            console.error('[GramJs] setChatMessageTtl error', e);
        }
        return {};
    };

    _getChatScheduledMessages = async req => {
        const { chat_id } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const result = await this.client.invoke(
                new Api.messages.GetScheduledHistory({ peer: inputPeer, hash: BigInt(0) }),
            );
            const messages = (result.messages || []).map(m => translateMessage(m, chat_id)).filter(Boolean);
            return { '@type': 'messages', messages, total_count: messages.length };
        } catch (e) {
            console.error('[GramJs] getChatScheduledMessages error', e);
            return { '@type': 'messages', messages: [], total_count: 0 };
        }
    };

    _deleteChatScheduledMessages = async req => {
        const { chat_id, message_ids } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            await this.client.invoke(new Api.messages.DeleteScheduledMessages({ peer: inputPeer, id: message_ids }));
        } catch (e) {
            console.error('[GramJs] deleteChatScheduledMessages error', e);
        }
        return {};
    };
    _sendChatScheduledMessages = async req => {
        const { chat_id, message_ids } = req;
        try {
            const inputPeer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
            const result = await this.client.invoke(
                new Api.messages.SendScheduledMessages({ peer: inputPeer, id: message_ids }),
            );
            const sentMessages = (result?.updates || []).map(u => u.message).filter(Boolean);
            let lastMessage = null;

            sentMessages
                .map(message => translateMessage(message, chat_id))
                .filter(Boolean)
                .forEach(message => {
                    lastMessage = message;
                    this._emitUpdate({ '@type': 'updateNewMessage', message });
                });

            this._emitUpdate({
                '@type': 'updateDeleteMessages',
                chat_id,
                message_ids,
                is_permanent: true,
                from_cache: false,
            });

            if (lastMessage) {
                const chat = this._chatCache.get(chat_id);
                if (chat) chat.last_message = lastMessage;
                this._emitUpdate({
                    '@type': 'updateChatLastMessage',
                    chat_id,
                    last_message: lastMessage,
                    order: String(lastMessage.date * 1000),
                });
            }
        } catch (e) {
            console.error('[GramJs] sendChatScheduledMessages error', e);
            throw e;
        }
        return {};
    };

    // ─── VoIP Calls ──────────────────────────────────────────────────────────────

    _getDhConfig = async () => {
        const result = await this.client.invoke(new Api.messages.GetDhConfig({ version: 0, randomLength: 256 }));
        return {
            '@type': 'dh_config',
            p: result.p,
            g: result.g,
            version: result.version,
            random: result.random,
        };
    };

    _requestCall = async ({ user_id, is_video }) => {
        const inputUser =
            this._entityCache.get(user_id) || new Api.InputUser({ userId: BigInt(user_id), accessHash: BigInt(0) });

        // Step 1: get DH config
        const dhConfig = await this.client.invoke(new Api.messages.GetDhConfig({ version: 0, randomLength: 256 }));

        // Step 2: generate a, compute g^a, sha256(g^a)
        const p = BigInt('0x' + Buffer.from(dhConfig.p).toString('hex'));
        const g = BigInt(dhConfig.g);
        const aBytes = dhConfig.random || crypto.getRandomValues(new Uint8Array(256));
        const a = BigInt('0x' + Buffer.from(aBytes).toString('hex'));
        const gA = modPowBig(g, a, p);
        const gABytes = bigIntToBytesBig(gA, 256);
        const gAHash = await crypto.subtle.digest('SHA-256', gABytes);

        // Store DH state in callController
        const { default: callController } = await import('./CallController');
        callController._dhConfig = dhConfig;
        callController._myPrivate = a;
        callController._myPublic = gA;

        const protocol = new Api.PhoneCallProtocol({
            udpP2p: true,
            udpReflector: true,
            minLayer: 65,
            maxLayer: 92,
            libraryVersions: ['5.0.0'],
        });

        const result = await this.client.invoke(
            new Api.phone.RequestCall({
                userId: inputUser,
                randomId: Math.floor(Math.random() * 2147483647),
                gAHash: Buffer.from(gAHash),
                protocol,
                video: !!is_video,
            }),
        );

        // The phoneCallWaiting update will arrive via updatePhoneCall
        const call = result.phoneCall;
        const { default: cc } = await import('./CallController');
        cc.callInfo = {
            callId: String(call.id),
            accessHash: String(call.accessHash),
            userId: String(user_id),
            isVideo: !!is_video,
            isOutgoing: true, // nosotros iniciamos → outgoing
        };
        cc._setState('waiting');
        return {};
    };

    _acceptCall = async ({ call_id, is_video }) => {
        const { default: callController } = await import('./CallController');
        const { callInfo } = callController;
        if (!callInfo) return {};

        // Generate b, compute g^b
        const dhConfig = await this.client.invoke(new Api.messages.GetDhConfig({ version: 0, randomLength: 256 }));
        const p = BigInt('0x' + Buffer.from(dhConfig.p).toString('hex'));
        const g = BigInt(dhConfig.g);
        const bBytes = dhConfig.random || crypto.getRandomValues(new Uint8Array(256));
        const b = BigInt('0x' + Buffer.from(bBytes).toString('hex'));
        const gB = modPowBig(g, b, p);
        // Buffer.from(Uint8Array) no produce un Buffer válido en el entorno browser;
        // usar el ArrayBuffer subyacente garantiza compatibilidad con GramJS
        const gBUint8 = bigIntToBytesBig(gB, 256);
        const gBBytes = Buffer.from(gBUint8.buffer, gBUint8.byteOffset, gBUint8.byteLength);

        callController._dhConfig = dhConfig;
        callController._myPrivate = b;
        callController._myPublic = gB;

        const protocol = new Api.PhoneCallProtocol({
            udpP2p: true,
            udpReflector: true,
            minLayer: 65,
            maxLayer: 92,
            libraryVersions: ['5.0.0'],
        });

        await this.client.invoke(
            new Api.phone.AcceptCall({
                peer: new Api.InputPhoneCall({ id: BigInt(callInfo.callId), accessHash: BigInt(callInfo.accessHash) }),
                gb: gBBytes,
                protocol,
            }),
        );
        return {};
    };

    _confirmCall = async ({ call_id, g_a, key_fingerprint }) => {
        const { default: callController } = await import('./CallController');
        const { callInfo } = callController;
        if (!callInfo) return {};

        const protocol = new Api.PhoneCallProtocol({
            udpP2p: true,
            udpReflector: true,
            minLayer: 65,
            maxLayer: 92,
            libraryVersions: ['5.0.0'],
        });

        await this.client.invoke(
            new Api.phone.ConfirmCall({
                peer: new Api.InputPhoneCall({ id: BigInt(callInfo.callId), accessHash: BigInt(callInfo.accessHash) }),
                gA: Buffer.from(g_a),
                keyFingerprint: BigInt(key_fingerprint || 0),
                protocol,
            }),
        );
        return {};
    };

    _discardCall = async ({ call_id, is_disconnected, duration, is_video, connection_id }) => {
        if (!call_id) return {};
        try {
            const { default: callController } = await import('./CallController');
            const info = callController.callInfo;
            const accessHash = info ? BigInt(info.accessHash || 0) : BigInt(0);

            let reason;
            if (is_disconnected) {
                reason = new Api.PhoneCallDiscardReasonDisconnect();
            } else {
                reason = new Api.PhoneCallDiscardReasonHangup();
            }

            await this.client.invoke(
                new Api.phone.DiscardCall({
                    peer: new Api.InputPhoneCall({ id: BigInt(call_id), accessHash }),
                    duration: duration || 0,
                    reason,
                    connectionId: BigInt(connection_id || 0),
                    video: !!is_video,
                }),
            );
        } catch (e) {
            console.warn('[GramJs] discardCall error (may be already ended)', e.message);
        }
        return {};
    };

    _receivedCall = async ({ call_id }) => {
        try {
            const { default: callController } = await import('./CallController');
            const info = callController.callInfo;
            const accessHash = info ? BigInt(info.accessHash || 0) : BigInt(0);
            await this.client.invoke(
                new Api.phone.ReceivedCall({
                    peer: new Api.InputPhoneCall({ id: BigInt(call_id), accessHash }),
                }),
            );
        } catch (e) {
            console.warn('[GramJs] receivedCall error (ignorado)', e.message);
        }
        return {};
    };

    _setCallRating = async ({ call_id, rating, comment }) => {
        try {
            const { default: callController } = await import('./CallController');
            const info = callController.callInfo;
            const accessHash = info ? BigInt(info.accessHash || 0) : BigInt(0);
            await this.client.invoke(
                new Api.phone.SetCallRating({
                    peer: new Api.InputPhoneCall({ id: BigInt(call_id), accessHash }),
                    rating: rating || 5,
                    comment: comment || '',
                }),
            );
        } catch (e) {
            console.warn('[GramJs] setCallRating error', e.message);
        }
        return {};
    };

    _sendCallSignalingData = async ({ call_id, data }) => {
        try {
            const { default: callController } = await import('./CallController');
            const info = callController.callInfo;
            const accessHash = info ? BigInt(info.accessHash || 0) : BigInt(0);
            await this.client.invoke(
                new Api.phone.SendSignalingData({
                    peer: new Api.InputPhoneCall({ id: BigInt(call_id), accessHash }),
                    data: Buffer.from(data || []),
                }),
            );
        } catch (e) {
            console.warn('[GramJs] sendCallSignalingData error', e.message);
        }
        return {};
    };

    // ── Saved Messages folders ───────────────────────────────────────────────

    _translateSavedDialogs = result => {
        const { dialogs = [], messages = [], chats = [], users = [] } = result;
        const msgMap = new Map((messages || []).map(m => [m.id, m]));
        return {
            dialogs: dialogs.map(d => ({
                peer: d.peer,
                topMessage: msgMap.get(d.topMessage) || null,
                isPinned: !!(d.flags && d.flags & 4),
            })),
        };
    };

    _getSavedDialogs = async req => {
        const { offset_date = 0, offset_id = 0, limit = 100 } = req;
        const result = await this.client.invoke(
            new Api.messages.GetSavedDialogs({
                offsetDate: offset_date,
                offsetId: offset_id,
                offsetPeer: new Api.InputPeerEmpty(),
                limit,
                hash: BigInt(0),
            }),
        );
        return this._translateSavedDialogs(result);
    };

    _getPinnedSavedDialogs = async () => {
        const result = await this.client.invoke(new Api.messages.GetPinnedSavedDialogs());
        return this._translateSavedDialogs(result);
    };

    _savedPeerToInputPeer = peer => {
        if (peer && peer.user_id) {
            const user = this._entityCache.get(Number(peer.user_id));
            return new Api.InputPeerUser({ userId: BigInt(peer.user_id), accessHash: user?.accessHash || BigInt(0) });
        }
        if (peer && peer.chat_id) {
            return new Api.InputPeerChat({ chatId: BigInt(peer.chat_id) });
        }
        if (peer && peer.channel_id) {
            const channel = this._entityCache.get(-1000000000000 - Number(peer.channel_id));
            return new Api.InputPeerChannel({
                channelId: BigInt(peer.channel_id),
                accessHash: channel?.accessHash || BigInt(0),
            });
        }
        throw new Error('La carpeta guardada no contiene un destinatario válido');
    };

    _toggleSavedDialogIsPinned = async ({ peer, is_pinned }) => {
        const inputPeer = this._savedPeerToInputPeer(peer);
        await this.client.invoke(
            new Api.messages.ToggleSavedDialogPin({
                pinned: !!is_pinned,
                peer: new Api.InputDialogPeer({ peer: inputPeer }),
            }),
        );
        return { ok: true, is_pinned: !!is_pinned };
    };

    _getSavedHistory = async req => {
        const { peer, offset_id = 0, offset_date = 0, limit = 30 } = req;
        const inputPeer = this._savedPeerToInputPeer(peer);
        const result = await this.client.invoke(
            new Api.messages.GetSavedHistory({
                peer: inputPeer,
                offsetId: offset_id,
                offsetDate: offset_date,
                addOffset: 0,
                limit,
                maxId: 0,
                minId: 0,
                hash: BigInt(0),
            }),
        );
        const messages = (result.messages || [])
            .map(m => {
                try {
                    return translateMessage(m, null);
                } catch {
                    return null;
                }
            })
            .filter(Boolean);
        return { messages };
    };

    // ── Stargifts ────────────────────────────────────────────────────────────

    _getSavedStarGifts = async req => {
        const { chat_id, offset = 0, limit = 100 } = req;
        const peer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        const result = await this.client.invoke(
            new Api.payments.GetSavedStarGifts({
                peer,
                offset,
                limit,
            }),
        );
        const gifts = (result.gifts || []).map(g => ({
            id: g.msgId != null ? Number(g.msgId) : null,
            stars: g.gift?.stars != null ? Number(g.gift.stars) : null,
            convert_stars: g.convertStars != null ? Number(g.convertStars) : null,
            upgrade_stars: g.upgradeStars != null ? Number(g.upgradeStars) : null,
            transfer_stars: g.transferStars != null ? Number(g.transferStars) : null,
            can_export_at: g.canExportAt != null ? Number(g.canExportAt) : null,
            can_upgrade: !!g.canUpgrade,
            message: g.message?.text || null,
            date: g.date || null,
            name_hidden: !!g.nameHidden,
            unsaved: !!g.unsaved,
            refunded: !!g.refunded,
        }));
        return { gifts, count: result.count || gifts.length };
    };

    _savedStarGiftInput = giftId => {
        if (giftId == null || Number.isNaN(Number(giftId))) throw new Error('Regalo guardado no válido');
        return new Api.InputSavedStarGiftUser({ msgId: Number(giftId) });
    };

    _saveStarGift = async ({ gift_id, unsave = false }) => {
        await this.client.invoke(
            new Api.payments.SaveStarGift({
                unsave: !!unsave,
                stargift: this._savedStarGiftInput(gift_id),
            }),
        );
        return { ok: true, unsaved: !!unsave };
    };

    _convertStarGift = async ({ gift_id }) => {
        await this.client.invoke(new Api.payments.ConvertStarGift({ stargift: this._savedStarGiftInput(gift_id) }));
        return { ok: true };
    };

    _upgradeStarGift = async ({ gift_id, keep_original_details = true }) => {
        const result = await this.client.invoke(
            new Api.payments.UpgradeStarGift({
                keepOriginalDetails: !!keep_original_details,
                stargift: this._savedStarGiftInput(gift_id),
            }),
        );
        return { ok: true, result };
    };

    _transferStarGift = async ({ gift_id, recipient }) => {
        const value = String(recipient || '').trim();
        if (!/^(?:@[A-Za-z][A-Za-z0-9_]{4,31}|[A-Za-z][A-Za-z0-9_]{4,31}|\d{5,20})$/.test(value)) {
            throw new Error('Introduce un usuario de Telegram o un ID vÃ¡lido');
        }
        const entity = /^\d+$/.test(value) ? BigInt(value) : value.replace(/^@/, '');
        const toId = await this.client.getInputEntity(entity);
        if (!(toId instanceof Api.InputPeerUser)) {
            throw new Error('Los regalos solo se pueden transferir a usuarios');
        }
        const result = await this.client.invoke(
            new Api.payments.TransferStarGift({
                stargift: this._savedStarGiftInput(gift_id),
                toId,
            }),
        );
        return { ok: true, result };
    };

    // ── Forum Topics ─────────────────────────────────────────────────────────

    _getForumTopics = async req => {
        const { chat_id, offset_date = 0, offset_id = 0, offset_topic = 0, limit = 50 } = req;
        const peer = await this.getInputPeer(chat_id);
        const result = await this.client.invoke(
            new Api.channels.GetForumTopics({
                channel: peer,
                offsetDate: offset_date,
                offsetId: offset_id,
                offsetTopic: offset_topic,
                limit,
            }),
        );
        const topics = (result.topics || []).map(t => ({
            id: t.id,
            title: t.title,
            icon_color: t.iconColor || 0,
            icon_custom_emoji_id: t.iconEmojiId ? String(t.iconEmojiId) : null,
            unread_count: t.unreadCount || 0,
            unread_mentions_count: t.unreadMentionsCount || 0,
            last_message_id: t.topMessage || 0,
            is_closed: !!t.closed,
            is_pinned: !!t.pinned,
            is_hidden: !!t.hidden,
            creation_date: t.date || 0,
        }));
        return { topics, count: result.count || topics.length };
    };

    _createForumTopic = async req => {
        const { chat_id, title, icon_color = 0, icon_custom_emoji_id = null } = req;
        const peer = await this.getInputPeer(chat_id);
        const result = await this.client.invoke(
            new Api.channels.CreateForumTopic({
                channel: peer,
                title,
                iconColor: icon_color,
                iconEmojiId: icon_custom_emoji_id ? BigInt(icon_custom_emoji_id) : undefined,
                randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
            }),
        );
        return result;
    };

    _editForumTopic = async req => {
        const { chat_id, topic_id, title, icon_custom_emoji_id, is_closed, is_hidden } = req;
        const peer = await this.getInputPeer(chat_id);
        const result = await this.client.invoke(
            new Api.channels.EditForumTopic({
                channel: peer,
                topicId: topic_id,
                title,
                iconEmojiId: icon_custom_emoji_id != null ? BigInt(icon_custom_emoji_id) : undefined,
                closed: is_closed,
                hidden: is_hidden,
            }),
        );
        return result;
    };

    // ── Inline bot results ───────────────────────────────────────────────────

    _getInlineBotResults = async req => {
        const { bot_username, query = '', offset = '', chat_id } = req;
        try {
            const botEntity = await this.client.getEntity(bot_username);
            const peer = chat_id ? tdlibChatIdToInputPeer(chat_id, this._entityCache) : new Api.InputPeerEmpty();
            const result = await this.client.invoke(
                new Api.messages.GetInlineBotResults({
                    bot: botEntity,
                    peer,
                    query,
                    offset,
                }),
            );
            const results = (result.results || []).map(r => ({
                id: r.id,
                type:
                    r.className === 'BotInlineMediaResult'
                        ? r.photo
                            ? 'photo'
                            : r.document
                            ? 'document'
                            : 'article'
                        : r.type || 'article',
                title: r.title || '',
                description: r.description || '',
                url: r.url || '',
                thumb_url: r.thumb?.url || null,
                content_url: r.content?.url || null,
                send_message: r.sendMessage,
            }));
            return {
                query_id: result.queryId ? String(result.queryId) : '',
                results,
                next_offset: result.nextOffset || '',
                cache_time: result.cacheTime || 0,
            };
        } catch (e) {
            console.warn('[GramJs] _getInlineBotResults error:', e);
            return { results: [] };
        }
    };

    _sendInlineBotResult = async req => {
        const { chat_id, query_id, result_id, reply_to_message_id } = req;
        const peer = tdlibChatIdToInputPeer(chat_id, this._entityCache);
        await this.client.invoke(
            new Api.messages.SendInlineBotResult({
                peer,
                queryId: BigInt(query_id),
                id: result_id,
                replyTo: reply_to_message_id
                    ? new Api.InputReplyToMessage({ replyToMsgId: reply_to_message_id })
                    : undefined,
                randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
            }),
        );
        return {};
    };
}

const TDLIB_TO_GRAMJS_ENTITY = {
    textEntityTypeBold: 'MessageEntityBold',
    textEntityTypeItalic: 'MessageEntityItalic',
    textEntityTypeUnderline: 'MessageEntityUnderline',
    textEntityTypeStrikethrough: 'MessageEntityStrike',
    textEntityTypeCode: 'MessageEntityCode',
    textEntityTypePre: 'MessageEntityPre',
    textEntityTypeUrl: 'MessageEntityUrl',
    textEntityTypeTextUrl: 'MessageEntityTextUrl',
    textEntityTypeMention: 'MessageEntityMention',
    textEntityTypeMentionUser: 'MessageEntityMentionName',
    textEntityTypeHashtag: 'MessageEntityHashtag',
    textEntityTypeBotCommand: 'MessageEntityBotCommand',
    textEntityTypeCashtag: 'MessageEntityCashtag',
    textEntityTypeSpoiler: 'MessageEntitySpoiler',
    textEntityTypePhoneNumber: 'MessageEntityPhone',
    textEntityTypeEmailAddress: 'MessageEntityEmail',
};

function tdEntitiesToGramJs(tdEntities) {
    if (!tdEntities?.length) return [];
    return tdEntities
        .map(e => {
            const tdType = e.type?.['@type'];
            const gramCls = TDLIB_TO_GRAMJS_ENTITY[tdType];
            if (!gramCls || !Api[gramCls]) return null;
            const opts = { offset: e.offset, length: e.length };
            if (tdType === 'textEntityTypeTextUrl') opts.url = e.type.url || '';
            if (tdType === 'textEntityTypeMentionUser') opts.userId = BigInt(e.type.user_id || 0);
            return new Api[gramCls](opts);
        })
        .filter(Boolean);
}

// ─── DH helpers (usados por _requestCall y _acceptCall) ──────────────────────

function modPowBig(base, exp, mod) {
    if (mod === 1n) return 0n;
    let result = 1n;
    base = base % mod;
    while (exp > 0n) {
        if (exp % 2n === 1n) result = (result * base) % mod;
        exp = exp / 2n;
        base = (base * base) % mod;
    }
    return result;
}

function bigIntToBytesBig(n, length) {
    const hex = n.toString(16).padStart(length * 2, '0');
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

const controller = new GramJsController();
window.controller = controller;
export default controller;
