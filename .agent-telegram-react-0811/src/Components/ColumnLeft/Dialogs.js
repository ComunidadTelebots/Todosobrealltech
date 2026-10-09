/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import withStyles from '@material-ui/core/styles/withStyles';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Search from './Search/Search';
import DialogsHeader from './DialogsHeader';
import DialogsList from './DialogsList';
import FolderDialogsList from './FolderDialogsList';
import StoriesTray from '../Stories/StoriesTray';
import StoryViewer from '../Stories/StoryViewer';
import TopicsList from './TopicsList';
import UpdatePanel from './UpdatePanel';
import AndroidBottomNav from './AndroidBottomNav';
import { borderStyle } from '../Theme';
import { openChat } from '../../Actions/Client';
import { setChatChatList, toggleChatNotificationSettings } from '../../Actions/Chat';
import { viewMessages } from '../../Actions/Message';
import { getArchiveTitle } from '../../Utils/Archive';
import {
    CHAT_LIST_LINES_KEY,
    PLUS_FILTER_KEY,
    PLUS_SETTINGS_EVENT,
    PLUS_SORT_KEY,
    PLUS_VIEWS_KEY,
    normalizeChatListLines,
    readSmartChatPreference,
    writeSmartChatPreference,
} from '../../Utils/SmartChatList';
import { canSetChatChatList, isChatMuted, isChatUnread } from '../../Utils/Chat';
import { loadChatsContent } from '../../Utils/File';
import AppStore from '../../Stores/ApplicationStore';
import CacheStore from '../../Stores/CacheStore';
import ChatStore from '../../Stores/ChatStore';
import FileStore from '../../Stores/FileStore';
import TdLibController from '../../Controllers/TdLibController';
import './Dialogs.css';

const styles = theme => ({
    ...borderStyle(theme),
});

const FOLDER_ICONS = {
    All: '💬',
    Unmuted: '🔔',
    Unread: '✉️',
    Personal: '👤',
    Work: '💼',
    Groups: '👥',
    Channels: '📢',
    Bots: '🤖',
    Contacts: '📋',
    NonContacts: '👥',
    NewChats: '🆕',
    Existing: '📨',
    Setup: '⚙️',
};

const SMART_FILTERS = [
    ['all', 'Todos'],
    ['users', 'Usuarios'],
    ['groups', 'Grupos'],
    ['channels', 'Canales'],
    ['bots', 'Bots'],
    ['favorites', 'Favoritos'],
    ['unread', 'No leídos'],
    ['managed', 'Administrados'],
];
const SORT_MODES = [
    ['telegram', 'Orden de Telegram'],
    ['unread', 'No leídos primero'],
    ['name', 'Por nombre'],
    ['favorites', 'Favoritos primero'],
];

function getFolderIcon(name) {
    return FOLDER_ICONS[name] || '📁';
}

class Dialogs extends Component {
    constructor(props) {
        super(props);

        this.dialogListRef = React.createRef();
        this.archiveListRef = React.createRef();
        this.dialogsHeaderRef = React.createRef();

        const { isChatDetailsVisible } = AppStore;

        this.state = {
            cache: null,

            showArchive: false,
            archiveTitle: null,

            mainItems: [],
            archiveItems: [],

            isChatDetailsVisible,
            openSearch: false,
            openArchive: false,

            searchChatId: 0,
            searchText: null,
            query: null,

            chatFilters: [],
            activeFilter: null,

            storyViewerChatId: null,
            forumChatId: null,
            createFolderOpen: false,
            createFolderName: '',
            smartViewsEnabled: readSmartChatPreference(PLUS_VIEWS_KEY, '0') === '1',
            smartFilter: readSmartChatPreference(PLUS_FILTER_KEY, 'all'),
            sortMode: readSmartChatPreference(PLUS_SORT_KEY, 'telegram'),
            selectionMode: false,
            selectedChatIds: new Set(),
            bulkBusy: false,
            chatListLines: normalizeChatListLines(readSmartChatPreference(CHAT_LIST_LINES_KEY, '2')),
        };
    }

    shouldComponentUpdate(nextProps, nextState) {
        const {
            cache,
            showArchive,
            archiveTitle,
            mainItems,
            archiveItems,
            isChatDetailsVisible,
            openSearch,
            openArchive,
            searchChatId,
            searchText,
            chatFilters,
            activeFilter,
        } = this.state;

        if (nextState.cache !== cache) return true;
        if (nextState.showArchive !== showArchive) return true;
        if (nextState.archiveTitle !== archiveTitle) return true;
        if (nextState.archiveItems !== archiveItems) return true;
        if (nextState.mainItems !== mainItems) return true;
        if (nextState.isChatDetailsVisible !== isChatDetailsVisible) return true;
        if (nextState.openSearch !== openSearch) return true;
        if (nextState.openArchive !== openArchive) return true;
        if (nextState.searchChatId !== searchChatId) return true;
        if (nextState.searchText !== searchText) return true;
        if (nextState.chatFilters !== chatFilters) return true;
        if (nextState.activeFilter !== activeFilter) return true;
        if (nextState.storyViewerChatId !== this.state.storyViewerChatId) return true;
        if (nextState.forumChatId !== this.state.forumChatId) return true;
        if (nextState.smartViewsEnabled !== this.state.smartViewsEnabled) return true;
        if (nextState.smartFilter !== this.state.smartFilter || nextState.sortMode !== this.state.sortMode) return true;
        if (
            nextState.selectionMode !== this.state.selectionMode ||
            nextState.selectedChatIds !== this.state.selectedChatIds
        )
            return true;
        if (nextState.bulkBusy !== this.state.bulkBusy) return true;
        if (nextState.chatListLines !== this.state.chatListLines) return true;

        return false;
    }

    componentDidMount() {
        this.loadCache();

        TdLibController.on('clientUpdate', this.onTdlibClientUpdate);

        AppStore.on('clientUpdateChatDetailsVisibility', this.onClientUpdateChatDetailsVisibility);
        AppStore.on('clientUpdateSearchChat', this.onClientUpdateSearchChat);
        AppStore.on('clientUpdateThemeChange', this.onClientUpdateThemeChange);
        AppStore.on('clientUpdateOpenCreateFolder', this.handleOpenCreateFolder);

        ChatStore.on('updateChatChatList', this.onUpdateChatChatList);

        ChatStore.on('updateChatDraftMessage', this.onUpdateChatOrder);
        ChatStore.on('updateChatIsPinned', this.onUpdateChatOrder);
        ChatStore.on('updateChatIsSponsored', this.onUpdateChatOrder);
        ChatStore.on('updateChatLastMessage', this.onUpdateChatOrder);
        ChatStore.on('updateChatOrder', this.onUpdateChatOrder);

        ChatStore.on('clientUpdateOpenArchive', this.onClientUpdateOpenArchive);
        ChatStore.on('clientUpdateCloseArchive', this.onClientUpdateCloseArchive);

        document.addEventListener('keydown', this.handleEscapeKey);
        window.addEventListener(PLUS_SETTINGS_EVENT, this.syncPlusSettings);
    }

    componentWillUnmount() {
        TdLibController.off('clientUpdate', this.onTdlibClientUpdate);

        AppStore.off('clientUpdateChatDetailsVisibility', this.onClientUpdateChatDetailsVisibility);
        AppStore.off('clientUpdateSearchChat', this.onClientUpdateSearchChat);
        AppStore.off('clientUpdateThemeChange', this.onClientUpdateThemeChange);
        AppStore.off('clientUpdateOpenCreateFolder', this.handleOpenCreateFolder);

        ChatStore.off('updateChatChatList', this.onUpdateChatChatList);

        ChatStore.off('updateChatDraftMessage', this.onUpdateChatOrder);
        ChatStore.off('updateChatIsPinned', this.onUpdateChatOrder);
        ChatStore.off('updateChatIsSponsored', this.onUpdateChatOrder);
        ChatStore.off('updateChatLastMessage', this.onUpdateChatOrder);
        ChatStore.off('updateChatOrder', this.onUpdateChatOrder);

        ChatStore.off('clientUpdateOpenArchive', this.onClientUpdateOpenArchive);
        ChatStore.off('clientUpdateCloseArchive', this.onClientUpdateCloseArchive);

        document.removeEventListener('keydown', this.handleEscapeKey);
        window.removeEventListener(PLUS_SETTINGS_EVENT, this.syncPlusSettings);
    }

    syncPlusSettings = () => this.setState({
        smartViewsEnabled: readSmartChatPreference(PLUS_VIEWS_KEY, '0') === '1',
        smartFilter: readSmartChatPreference(PLUS_FILTER_KEY, 'all'),
        sortMode: readSmartChatPreference(PLUS_SORT_KEY, 'telegram'),
        chatListLines: normalizeChatListLines(readSmartChatPreference(CHAT_LIST_LINES_KEY, '2')),
    });

    onTdlibClientUpdate = update => {
        if (update['@type'] === 'clientUpdateChatFilters') {
            this.setState({ chatFilters: update.filters });
        }
        if (update['@type'] === 'clientUpdateOpenStoryViewer') {
            this.setState({ storyViewerChatId: update.chatId });
        }
        if (update['@type'] === 'clientUpdateChatId') {
            const { chatId } = update;
            if (!chatId) {
                this.setState({ forumChatId: null });
                return;
            }
            const chat = ChatStore.get(chatId);
            const isForum = chat && chat.type && chat.type.is_forum;
            this.setState({ forumChatId: isForum ? chatId : null });
        }
    };

    handleFolderSelect = filterId => {
        this.setState({ activeFilter: filterId, smartFilter: 'all', selectionMode: false, selectedChatIds: new Set() });
    };

    toggleSmartViews = () => {
        this.setState(state => {
            const enabled = !state.smartViewsEnabled;
            writeSmartChatPreference(PLUS_VIEWS_KEY, enabled ? '1' : '0');
            return { smartViewsEnabled: enabled, smartFilter: 'all', selectionMode: false, selectedChatIds: new Set() };
        });
    };

    setSmartFilter = smartFilter => {
        writeSmartChatPreference(PLUS_FILTER_KEY, smartFilter);
        this.setState({ smartFilter, activeFilter: null, selectionMode: false, selectedChatIds: new Set() });
    };

    setSortMode = event => {
        const sortMode = event.target.value;
        writeSmartChatPreference(PLUS_SORT_KEY, sortMode);
        this.setState({ sortMode });
    };

    setChatListLines = event => {
        const chatListLines = normalizeChatListLines(event.target.value);
        writeSmartChatPreference(CHAT_LIST_LINES_KEY, String(chatListLines));
        this.setState({ chatListLines });
    };

    toggleSelectionMode = () => this.setState({ selectionMode: !this.state.selectionMode, selectedChatIds: new Set() });

    toggleChatSelection = chatId =>
        this.setState(state => {
            const selectedChatIds = new Set(state.selectedChatIds);
            if (selectedChatIds.has(chatId)) selectedChatIds.delete(chatId);
            else selectedChatIds.add(chatId);
            return { selectedChatIds };
        });

    runBulkAction = async action => {
        const chatIds = [...this.state.selectedChatIds];
        if (!chatIds.length || this.state.bulkBusy) return;
        this.setState({ bulkBusy: true });
        try {
            await Promise.allSettled(
                chatIds.map(async chatId => {
                    const chat = ChatStore.get(chatId);
                    if (!chat) return;
                    if (action === 'read' && isChatUnread(chatId)) {
                        if (chat.unread_count > 0 && chat.last_message)
                            await viewMessages(chatId, [chat.last_message.id], true);
                        else
                            await TdLibController.send({
                                '@type': 'toggleChatIsMarkedAsUnread',
                                chat_id: chatId,
                                is_marked_as_unread: false,
                            });
                    }
                    if (action === 'mute' && !isChatMuted(chatId)) toggleChatNotificationSettings(chatId, true);
                    if (action === 'archive' && canSetChatChatList(chatId))
                        setChatChatList(chatId, { '@type': 'chatListArchive' });
                }),
            );
        } finally {
            this.setState({ bulkBusy: false, selectionMode: false, selectedChatIds: new Set() });
        }
    };

    handleOpenCreateFolder = () => {
        this.setState({ createFolderOpen: true, createFolderName: '' });
    };

    handleCloseCreateFolder = () => {
        this.setState({ createFolderOpen: false, createFolderName: '' });
    };

    handleCreateFolder = async () => {
        const { createFolderName } = this.state;
        if (!createFolderName.trim()) return;
        try {
            await TdLibController.send({
                '@type': 'createChatFilter',
                filter: {
                    '@type': 'chatFilter',
                    title: createFolderName.trim(),
                    icon_name: 'All',
                    pinned_chat_ids: [],
                    included_chat_ids: [],
                    excluded_chat_ids: [],
                    include_contacts: false,
                    include_non_contacts: false,
                    include_bots: false,
                    include_groups: false,
                    include_channels: false,
                    exclude_muted: false,
                    exclude_read: false,
                    exclude_archived: false,
                },
            });
        } catch (e) {
            console.warn('[Dialogs] createChatFilter error', e);
        }
        this.handleCloseCreateFolder();
    };

    handleDeleteFolder = async (e, filterId) => {
        e.stopPropagation();
        try {
            await TdLibController.send({ '@type': 'deleteChatFilter', chat_filter_id: filterId });
        } catch (e2) {
            console.warn('[Dialogs] deleteChatFilter error', e2);
        }
        const { activeFilter } = this.state;
        if (activeFilter === filterId) {
            this.setState({ activeFilter: null });
        }
    };

    async loadCache() {
        const cache = (await CacheStore.loadCache()) || {};

        const { chats, archiveChats } = cache;

        this.setState({
            cache,

            showArchive: archiveChats && archiveChats.length > 0,
            archiveTitle: getArchiveTitle(),
        });

        this.loadChatContents((chats || []).map(x => x.id));

        TdLibController.clientUpdate({
            '@type': 'clientUpdateCacheLoaded',
        });
    }

    saveCache() {
        const { current: archiveCurrent } = this.archiveListRef;
        const archiveChatIds =
            archiveCurrent && archiveCurrent.state.chats ? archiveCurrent.state.chats.slice(0, 25) : [];

        const { current: mainCurrent } = this.dialogListRef;
        const mainChatIds = mainCurrent && mainCurrent.state.chats ? mainCurrent.state.chats.slice(0, 25) : [];

        CacheStore.saveChats(mainChatIds, archiveChatIds);
    }

    onUpdateChatOrder = update => {
        const { chat_id } = update;

        const { current: mainCurrent } = this.dialogListRef;
        if (mainCurrent && mainCurrent.loading) {
            return;
        }

        const { current: archiveCurrent } = this.archiveListRef;
        if (archiveCurrent && archiveCurrent.loading) {
            return;
        }

        const archive = ChatStore.chatList.get('chatListArchive');
        if (archive && archive.has(chat_id)) {
            this.setState({ archiveTitle: getArchiveTitle() });
        }
    };

    onUpdateChatChatList = update => {
        const { showArchive: prevShowArchive } = this.state;

        const { current: mainCurrent } = this.dialogListRef;
        if (mainCurrent && mainCurrent.loading) {
            return;
        }

        const { current: archiveCurrent } = this.archiveListRef;
        if (archiveCurrent && archiveCurrent.loading) {
            return;
        }

        const archiveList = ChatStore.chatList.get('chatListArchive');
        const showArchive = archiveList && archiveList.size > 0;

        this.setState({ showArchive, archiveTitle: getArchiveTitle() }, () => {
            if (!prevShowArchive && showArchive) {
                const { current } = this.dialogListRef;
                if (current.listRef) {
                    const { current: listCurrent } = current.listRef;
                    if (listCurrent && listCurrent.scrollTop > 0) {
                        current.scrollTop += 68;
                    }
                }
            }
        });

        if (prevShowArchive && !showArchive) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateCloseArchive',
            });
        }
    };

    onClientUpdateOpenArchive = update => {
        this.setState({ openArchive: true });
    };

    onClientUpdateCloseArchive = update => {
        this.setState({ openArchive: false });
    };

    onClientUpdateThemeChange = update => {
        this.forceUpdate();
    };

    onClientUpdateChatDetailsVisibility = update => {
        const { isChatDetailsVisible } = AppStore;

        this.setState({ isChatDetailsVisible });
    };

    onClientUpdateSearchChat = update => {
        const { chatId, query } = update;
        const { openSearch, searchChatId, searchText } = this.state;

        if (openSearch && chatId === searchChatId && query === searchText) {
            return;
        }

        const header = this.dialogsHeaderRef.current;
        this.setState(
            {
                openSearch: true,
                searchChatId: chatId,
                searchText: null,
            },
            () => {
                if (header) {
                    header.setInitQuery(query);
                }
            },
        );
    };

    handleHeaderClick = () => {
        const { openArchive } = this.state;
        if (openArchive) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateCloseArchive',
            });
        } else {
            this.dialogListRef.current.scrollToTop();
        }
    };

    handleSearch = visible => {
        this.setState({
            openSearch: visible,
            searchChatId: 0,
            searchText: null,
        });
    };

    handleSelectMessage = (chatId, messageId, openSearch) => {
        openChat(chatId, messageId);

        const searchChatId = openSearch ? this.state.searchChatId : 0;
        const searchText = openSearch ? this.state.searchText : null;

        this.setState({
            openSearch: openSearch,
            searchChatId: searchChatId,
            searchText: searchText,
        });
    };

    handleEscapeKey = event => {
        if (event.key !== 'Escape' || event.altKey || event.ctrlKey || event.metaKey) return;
        // No interferir si hay un visor o diálogo abierto: gestionan su propio Escape
        if (
            document.querySelector(
                '.media-viewer, .amp-viewer, .instant-viewer, .story-viewer-backdrop, .MuiDialog-root, .MuiPopover-root',
            )
        ) {
            return;
        }
        // 1) Si la búsqueda está abierta, cerrarla
        if (this.state.openSearch) {
            event.preventDefault();
            this.handleClose();
            return;
        }
        // 2) Si hay un chat abierto, cerrarlo (volver a la lista)
        if (AppStore.getChatId()) {
            event.preventDefault();
            TdLibController.setChatId(0);
        }
    };

    handleClose = () => {
        this.setState({
            openSearch: false,
            searchChatId: 0,
            searchText: null,
        });
    };

    handleSearchTextChange = text => {
        this.setState({
            searchText: text,
            query: null,
        });
    };

    handleSaveCache = () => {
        this.saveCache();
    };

    loadChatContents(chatIds) {
        const store = FileStore.getStore();
        loadChatsContent(store, chatIds);
    }

    render() {
        const { classes } = this.props;
        const {
            cache,
            showArchive,
            archiveTitle,
            mainItems,
            archiveItems,
            isChatDetailsVisible,
            openArchive,
            openSearch,
            searchChatId,
            searchText,
            chatFilters,
            activeFilter,
            storyViewerChatId,
            forumChatId,
            createFolderOpen,
            createFolderName,
            smartViewsEnabled,
            smartFilter,
            sortMode,
            selectionMode,
            selectedChatIds,
            bulkBusy,
            chatListLines,
        } = this.state;

        const mainCacheItems = cache ? cache.chats || [] : null;
        const archiveCacheItems = cache ? cache.archiveChats || [] : null;

        return (
            <div
                className={classNames(classes.borderColor, 'dialogs', {
                    'dialogs-third-column': isChatDetailsVisible,
                    'chat-list-three-lines': chatListLines === 3,
                })}
            >
                <DialogsHeader
                    ref={this.dialogsHeaderRef}
                    openArchive={openArchive}
                    openSearch={openSearch}
                    onClick={this.handleHeaderClick}
                    onSearch={this.handleSearch}
                    onSearchTextChange={this.handleSearchTextChange}
                />
                {!openSearch && <StoriesTray />}
                {!openSearch && !openArchive && (
                    <div className='plus-chat-tools'>
                        <button
                            type='button'
                            className='plus-chat-tools-toggle'
                            aria-pressed={smartViewsEnabled}
                            onClick={this.toggleSmartViews}
                        >
                            {smartViewsEnabled ? 'Vistas inteligentes' : 'Activar vistas inteligentes'}
                        </button>
                        {smartViewsEnabled && (
                            <>
                                <label className='plus-chat-sort'>
                                    <span className='sr-only'>Ordenar chats</span>
                                    <select value={sortMode} onChange={this.setSortMode} aria-label='Ordenar chats'>
                                        {SORT_MODES.map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className='plus-chat-lines'>
                                    <span className='sr-only'>Líneas por chat</span>
                                    <select
                                        value={chatListLines}
                                        onChange={this.setChatListLines}
                                        aria-label='Líneas por chat'
                                    >
                                        <option value={2}>2 líneas</option>
                                        <option value={3}>3 líneas</option>
                                    </select>
                                </label>
                                <button
                                    type='button'
                                    className='plus-chat-select'
                                    aria-pressed={selectionMode}
                                    onClick={this.toggleSelectionMode}
                                >
                                    {selectionMode ? 'Cancelar' : 'Seleccionar'}
                                </button>
                            </>
                        )}
                    </div>
                )}
                {!openSearch && !openArchive && smartViewsEnabled && !selectionMode && (
                    <div className='smart-chat-tabs' role='tablist' aria-label='Vistas de chats'>
                        {SMART_FILTERS.map(([value, label]) => (
                            <button
                                key={value}
                                type='button'
                                role='tab'
                                aria-selected={smartFilter === value}
                                className={classNames('smart-chat-tab', {
                                    'smart-chat-tab-active': smartFilter === value,
                                })}
                                onClick={() => this.setSmartFilter(value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}
                {!openSearch && !openArchive && selectionMode && (
                    <div className='bulk-chat-actions' role='toolbar' aria-label='Acciones para chats seleccionados'>
                        <strong>{selectedChatIds.size} seleccionados</strong>
                        <button disabled={!selectedChatIds.size || bulkBusy} onClick={() => this.runBulkAction('read')}>
                            Leer
                        </button>
                        <button disabled={!selectedChatIds.size || bulkBusy} onClick={() => this.runBulkAction('mute')}>
                            Silenciar
                        </button>
                        <button
                            disabled={!selectedChatIds.size || bulkBusy}
                            onClick={() => this.runBulkAction('archive')}
                        >
                            Archivar
                        </button>
                    </div>
                )}
                {!openSearch && !openArchive && (
                    <div className='folder-tabs'>
                        <button
                            className={classNames('folder-tab', { 'folder-tab-active': activeFilter === null })}
                            onClick={() => this.handleFolderSelect(null)}
                        >
                            Todos
                        </button>
                        {chatFilters.map(f => (
                            <button
                                key={f.id}
                                className={classNames('folder-tab', { 'folder-tab-active': activeFilter === f.id })}
                                onClick={() => this.handleFolderSelect(f.id)}
                                title={f.title}
                            >
                                {f.icon_name && f.icon_name !== 'All' && (
                                    <span className='folder-tab-icon'>{getFolderIcon(f.icon_name)}</span>
                                )}
                                {f.title}
                                <span
                                    className='folder-tab-delete'
                                    title='Eliminar carpeta'
                                    onClick={e => this.handleDeleteFolder(e, f.id)}
                                >
                                    ×
                                </span>
                            </button>
                        ))}
                        <button
                            className='folder-tab folder-tab-add'
                            onClick={this.handleOpenCreateFolder}
                            title='Nueva carpeta'
                        >
                            +
                        </button>
                    </div>
                )}
                <Dialog open={createFolderOpen} onClose={this.handleCloseCreateFolder} maxWidth='xs' fullWidth>
                    <DialogTitle>Nueva carpeta</DialogTitle>
                    <DialogContent>
                        <TextField
                            autoFocus
                            label='Nombre de la carpeta'
                            fullWidth
                            value={createFolderName}
                            onChange={e => this.setState({ createFolderName: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && this.handleCreateFolder()}
                            inputProps={{ maxLength: 12 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleCloseCreateFolder} color='default'>
                            Cancelar
                        </Button>
                        <Button
                            onClick={this.handleCreateFolder}
                            color='primary'
                            variant='contained'
                            disabled={!createFolderName.trim()}
                        >
                            Crear
                        </Button>
                    </DialogActions>
                </Dialog>
                <div className='dialogs-content'>
                    {forumChatId && !openSearch ? (
                        <TopicsList
                            chatId={forumChatId}
                            onClose={() => {
                                this.setState({ forumChatId: null });
                                TdLibController.setChatId(0);
                            }}
                        />
                    ) : activeFilter !== null ? (
                        <FolderDialogsList filterId={activeFilter} />
                    ) : (
                        <>
                            <DialogsList
                                type='chatListMain'
                                ref={this.dialogListRef}
                                cacheItems={mainCacheItems}
                                items={mainItems}
                                showArchive={showArchive}
                                archiveTitle={archiveTitle}
                                open={true}
                                onSaveCache={this.handleSaveCache}
                                smartFilter={smartViewsEnabled ? smartFilter : 'all'}
                                sortMode={smartViewsEnabled ? sortMode : 'telegram'}
                                selectionMode={selectionMode}
                                selectedChatIds={selectedChatIds}
                                onToggleChatSelection={this.toggleChatSelection}
                            />
                            <DialogsList
                                type='chatListArchive'
                                ref={this.archiveListRef}
                                cacheItems={archiveCacheItems}
                                items={archiveItems}
                                open={openArchive}
                                onSaveCache={this.handleSaveCache}
                                smartFilter='all'
                                sortMode='telegram'
                            />
                        </>
                    )}
                    {openSearch && (
                        <Search
                            chatId={searchChatId}
                            text={searchText}
                            onSelectMessage={this.handleSelectMessage}
                            onClose={this.handleClose}
                        />
                    )}
                </div>
                <UpdatePanel />
                <AndroidBottomNav active='chats' />
                {storyViewerChatId != null && (
                    <StoryViewer
                        chatId={storyViewerChatId}
                        onClose={() => this.setState({ storyViewerChatId: null })}
                    />
                )}
            </div>
        );
    }
}

export default withStyles(styles)(Dialogs);
