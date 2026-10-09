/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import copy from 'copy-to-clipboard';
import classNames from 'classnames';
import { compose } from 'recompose';
import withStyles from '@material-ui/core/styles/withStyles';
import { withSnackbar } from 'notistack';
import { withTranslation } from 'react-i18next';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import Switch from '@material-ui/core/Switch';
import AlternateEmailIcon from '@material-ui/icons/AlternateEmail';
import BlockIcon from '@material-ui/icons/Block';
import TimerIcon from '@material-ui/icons/Timer';
import HourglassEmptyIcon from '@material-ui/icons/HourglassEmpty';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import TranslateIcon from '@material-ui/icons/Translate';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import CheckIcon from '@material-ui/icons/Check';
import EditIcon from '@material-ui/icons/Edit';
import LockIcon from '@material-ui/icons/Lock';
import GroupIcon from '@material-ui/icons/Group';
import ForumIcon from '@material-ui/icons/Forum';
import CallIcon from '@material-ui/icons/Call';
import CloseIcon from '@material-ui/icons/Close';
import Divider from '@material-ui/core/Divider';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import HeadsetIcon from '@material-ui/icons/Headset';
import IconButton from '@material-ui/core/IconButton';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';
import InsertLinkIcon from '@material-ui/icons/InsertLink';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import MicIcon from '@material-ui/icons/Mic';
import PhotoIcon from '@material-ui/icons/Photo';
import { getAvatarAction } from '../../Utils/PlusPreferences';
import Typography from '@material-ui/core/Typography';
import VideocamIcon from '@material-ui/icons/Videocam';
import UserControl from '../Tile/UserControl';
import ChatControl from '../Tile/ChatControl';
import ChatDetailsHeader from './ChatDetailsHeader';
import NotificationsListItem from './NotificationsListItem';
import MoreListItem from './MoreListItem';
import {
    getChatUsername,
    getChatPhoneNumber,
    getChatBio,
    isGroupChat,
    getGroupChatMembers,
    getChatFullInfo,
    isPrivateChat,
    isChatSecret,
    getChatUserId,
    isMeChat,
    isAdminInChat,
} from '../../Utils/Chat';
import { getUserStatusOrder } from '../../Utils/User';
import { loadUsersContent, loadChatsContent } from '../../Utils/File';
import { formatPhoneNumber } from '../../Utils/Common';
import { openChat, openUser, setProfileMediaViewerContent } from '../../Actions/Client';
import { withRestoreRef, withSaveRef } from '../../Utils/HOC';
import { NOTIFICATION_AUTO_HIDE_DURATION_MS } from '../../Constants';
import ChatStore from '../../Stores/ChatStore';
import UserStore from '../../Stores/UserStore';
import BasicGroupStore from '../../Stores/BasicGroupStore';
import SupergroupStore from '../../Stores/SupergroupStore';
import OptionStore from '../../Stores/OptionStore';
import FileStore from '../../Stores/FileStore';
import ApplicationStore from '../../Stores/ApplicationStore';
import TdLibController from '../../Controllers/TdLibController';
import SimilarChannels from './SimilarChannels';
import StarGiftsGallery from './StarGiftsGallery';
import BusinessInfo from './BusinessInfo';
import AdminLog from './AdminLog';
import JoinRequests from './JoinRequests';
import ChannelStats from './ChannelStats';
import AdminManagement from './AdminManagement';
import './ChatDetails.css';

const styles = theme => ({
    closeIconButton: {
        margin: '8px -2px 8px 12px',
    },
    nested: {
        // paddingLeft: theme.spacing(4),
    },
    listItem: {
        padding: '11px 22px',
    },
});

class ChatDetails extends React.Component {
    constructor(props) {
        super(props);

        // console.log('ChatDetails.ctor', this.props.counters);

        this.chatDetailsListRef = React.createRef();

        const { chatId } = this.props;

        this.members = new Map();
        this.state = {
            prevChatId: chatId,
            editingDescription: false,
            descriptionDraft: '',
            supergroupMembers: [],
            translationSettingsVersion: 0,
            legacyFeaturesOnly: localStorage.getItem('tg_design_legacy_features') === 'true',
        };
    }

    static getDerivedStateFromProps(props, state) {
        if (props.chatId !== state.prevChatId) {
            return {
                prevChatId: props.chatId,
                supergroupMembers: [],
            };
        }

        return null;
    }

    getSnapshotBeforeUpdate(prevProps, prevState) {
        const { chatId } = this.props;

        const list = this.chatDetailsListRef.current;
        const { scrollTop, scrollHeight, offsetHeight } = list;
        const snapshot = {
            scrollTop,
            scrollHeight,
            offsetHeight,
        };

        // console.log(
        //     `[ChatDetails] getSnapshotBeforeUpdate chatId=${chatId} scrollTop=${scrollTop} scrollHeight=${scrollHeight} offsetHeight=${offsetHeight}`
        // );

        return snapshot;
    }

    shouldComponentUpdate(nextProps, nextState) {
        const { chatId, theme, counters, migratedCounters } = this.props;
        const { editingDescription, descriptionDraft, translationSettingsVersion, legacyFeaturesOnly } = this.state;

        if (nextProps.chatId !== chatId) {
            return true;
        }

        if (nextProps.counters !== counters) {
            return true;
        }

        if (nextProps.migratedCounters !== migratedCounters) {
            return true;
        }

        if (nextProps.theme !== theme) {
            return true;
        }

        if (nextState.editingDescription !== editingDescription) {
            return true;
        }

        if (nextState.descriptionDraft !== descriptionDraft) {
            return true;
        }

        if (nextState.translationSettingsVersion !== translationSettingsVersion) {
            return true;
        }

        if (nextState.legacyFeaturesOnly !== legacyFeaturesOnly) {
            return true;
        }

        return false;
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const { chatId } = this.props;
        if (prevProps.chatId !== chatId) {
            this.loadContent();
        }

        const list = this.chatDetailsListRef.current;
        const { scrollTop, scrollHeight, offsetHeight } = snapshot;
        if (prevProps.chatId === chatId) {
            list.scrollTop = scrollTop;
        } else {
            list.scrollTop = 0;
        }
    }

    componentDidMount() {
        this.loadContent();

        UserStore.on('updateUserStatus', this.onUpdateUserStatus);
        UserStore.on('updateUserFullInfo', this.onUpdateUserFullInfo);
        BasicGroupStore.on('updateBasicGroupFullInfo', this.onUpdateBasicGroupFullInfo);
        SupergroupStore.on('updateSupergroupFullInfo', this.onUpdateSupergroupFullInfo);
        ChatStore.on('updateChatMessageTtl', this.onUpdateChatMessageTtl);
        ApplicationStore.on('clientUpdateDesignCapabilities', this.onDesignCapabilitiesChange);
    }

    componentWillUnmount() {
        UserStore.off('updateUserStatus', this.onUpdateUserStatus);
        UserStore.off('updateUserFullInfo', this.onUpdateUserFullInfo);
        BasicGroupStore.off('updateBasicGroupFullInfo', this.onUpdateBasicGroupFullInfo);
        SupergroupStore.off('updateSupergroupFullInfo', this.onUpdateSupergroupFullInfo);
        ChatStore.off('updateChatMessageTtl', this.onUpdateChatMessageTtl);
        ApplicationStore.off('clientUpdateDesignCapabilities', this.onDesignCapabilitiesChange);
    }

    onDesignCapabilitiesChange = ({ legacyOnly }) => {
        this.setState({ legacyFeaturesOnly: !!legacyOnly });
    };

    onUpdateChatMessageTtl = update => {
        if (update.chat_id === this.props.chatId) this.forceUpdate();
    };

    onUpdateBasicGroupFullInfo = update => {
        const chat = ChatStore.get(this.props.chatId);
        if (!chat) return;

        if (
            chat.type &&
            chat.type['@type'] === 'chatTypeBasicGroup' &&
            chat.type.basic_group_id === update.basic_group_id
        ) {
            this.forceUpdate(); // update bio
        }
    };

    onUpdateSupergroupFullInfo = update => {
        const chat = ChatStore.get(this.props.chatId);
        if (!chat) return;

        if (
            chat.type &&
            chat.type['@type'] === 'chatTypeSupergroup' &&
            chat.type.supergroup_id === update.supergroup_id
        ) {
            this.forceUpdate(); // update bio
        }
    };

    onUpdateUserFullInfo = update => {
        const chat = ChatStore.get(this.props.chatId);
        if (!chat) return;

        if (
            chat.type &&
            (chat.type['@type'] === 'chatTypePrivate' || chat.type['@type'] === 'chatTypeSecret') &&
            chat.type.user_id === update.user_id
        ) {
            this.forceUpdate(); // update bio
        }
    };

    onUpdateUserStatus = update => {
        if (this.members.has(update.user_id)) {
            this.forceUpdate();
        }
    };

    loadContent = () => {
        this.loadChatContents();
    };

    loadChatContents = () => {
        const { chatId, popup } = this.props;

        const store = FileStore.getStore();

        loadChatsContent(store, [chatId]);
        const members = getGroupChatMembers(chatId).map(x => x.user_id);
        loadUsersContent(store, members);

        getChatFullInfo(chatId);
        this.loadSupergroupMembers(chatId);
    };

    loadSupergroupMembers = async chatId => {
        const chat = ChatStore.get(chatId);
        if (!chat || !chat.type || chat.type['@type'] !== 'chatTypeSupergroup') return;

        const supergroupId = chat.type.supergroup_id;
        try {
            // Load recent (non-bot) members first
            const result = await TdLibController.send({
                '@type': 'getSupergroupMembers',
                supergroup_id: supergroupId,
                filter: { '@type': 'supergroupMembersFilterRecent' },
                offset: 0,
                limit: 200,
            });
            if (result && result.members) {
                this.setState({ supergroupMembers: result.members });
                const store = FileStore.getStore();
                loadUsersContent(
                    store,
                    result.members.map(m => m.user_id),
                );
            }
        } catch (e) {
            console.warn('[ChatDetails] getSupergroupMembers failed', e);
        }
    };

    handleUsernameHint = () => {
        const { t, chatId } = this.props;
        const username = getChatUsername(chatId);
        if (!username) return;

        const telegramUrlOption = OptionStore.get('t_me_url');
        const usernameLink = telegramUrlOption ? telegramUrlOption.value : 'https://telegram.org/';

        copy(usernameLink + username);

        const key = `${chatId}_copy_username`;
        const message = t('TextCopied');
        const action = null;

        this.handleScheduledAction(key, message, action);
    };

    handleScheduledAction = (key, message, action) => {
        if (!key) return;

        const { enqueueSnackbar } = this.props;
        if (!enqueueSnackbar) return;

        const TRANSITION_DELAY = 150;
        if (
            ApplicationStore.addScheduledAction(key, NOTIFICATION_AUTO_HIDE_DURATION_MS + 2 * TRANSITION_DELAY, action)
        ) {
            enqueueSnackbar(message, {
                autoHideDuration: NOTIFICATION_AUTO_HIDE_DURATION_MS,
                action: [
                    <IconButton
                        key='close'
                        aria-label='Close'
                        color='inherit'
                        className='notification-close-button'
                        onClick={() => ApplicationStore.removeScheduledAction(key)}>
                        <CloseIcon />
                    </IconButton>,
                ],
            });
        }
    };

    handlePhoneHint = () => {
        const { t, chatId } = this.props;
        const phoneNumber = getChatPhoneNumber(chatId);
        if (!phoneNumber) return;

        copy(formatPhoneNumber(phoneNumber));

        const key = `${chatId}_copy_phone`;
        const message = t('PhoneCopied');
        const action = null;

        this.handleScheduledAction(key, message, action);
    };

    handleHeaderClick = () => {
        this.chatDetailsListRef.current.scrollTop = 0;
    };

    handleOpenViewer = () => {
        const { chatId, popup } = this.props;
        const chat = ChatStore.get(chatId);
        if (!chat) return;
        if (!chat.photo) return;

        setProfileMediaViewerContent({ chatId: chatId });

        if (popup) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateDialogChatId',
                chatId: 0,
            });
        }
    };

    handleOpenChat = () => {
        const { chatId, popup } = this.props;

        openChat(chatId, null, false);

        if (popup) {
            TdLibController.clientUpdate({
                '@type': 'clientUpdateDialogChatId',
                chatId: 0,
            });
        }
    };

    handleOpenLinkedCommunity = () => {
        const chat = ChatStore.get(this.props.chatId);
        const supergroupId = chat && chat.type && chat.type.supergroup_id;
        const fullInfo = supergroupId ? SupergroupStore.getFullInfo(supergroupId) : null;
        if (fullInfo && fullInfo.linked_chat_id) openChat(fullInfo.linked_chat_id, null, false);
    };

    handleCreateSecretChat = async () => {
        const { chatId } = this.props;
        const chat = ChatStore.get(chatId);
        if (!chat) return;
        try {
            const secretChat = await TdLibController.send({
                '@type': 'createNewSecretChat',
                user_id: chat.type.user_id,
            });
            openChat(secretChat.id);
        } catch (e) {
            console.error('[ChatDetails] createNewSecretChat', e);
        }
    };

    handleOpenUser = userId => {
        openUser(userId, true);
    };

    handleKickMember = async (event, userId) => {
        event.stopPropagation();
        const { chatId } = this.props;
        await TdLibController.send({ '@type': 'kickGroupMember', chat_id: chatId, user_id: userId });
    };

    handleBanMember = async (event, userId) => {
        event.stopPropagation();
        const { chatId } = this.props;
        await TdLibController.send({ '@type': 'banGroupMember', chat_id: chatId, user_id: userId });
    };

    handleEditDescription = () => {
        const { chatId } = this.props;
        const bio = getChatBio(chatId) || '';
        this.setState({ editingDescription: true, descriptionDraft: bio });
    };

    handleDescriptionChange = event => {
        this.setState({ descriptionDraft: event.target.value });
    };

    handleSaveDescription = async () => {
        const { chatId } = this.props;
        const { descriptionDraft } = this.state;
        await TdLibController.send({ '@type': 'setChatDescription', chat_id: chatId, description: descriptionDraft });
        this.setState({ editingDescription: false });
    };

    handleAdminLog = () => {
        const { chatId } = this.props;
        if (this.adminLogRef) this.adminLogRef.open(chatId);
    };

    handleJoinRequests = () => {
        const { chatId } = this.props;
        if (this.joinRequestsRef) this.joinRequestsRef.open(chatId);
    };

    handleChannelStats = () => {
        const { chatId } = this.props;
        if (this.channelStatsRef) this.channelStatsRef.open(chatId);
    };

    handleAdminManagement = () => {
        const { chatId } = this.props;
        if (this.adminMgmtRef) this.adminMgmtRef.open(chatId);
    };

    handleSetSlowMode = async event => {
        const { chatId } = this.props;
        const seconds = Number(event.target.value);
        const chat = ChatStore.get(chatId);
        const supergroupId = chat && chat.type && chat.type.supergroup_id;
        if (!supergroupId) return;
        await TdLibController.send({ '@type': 'setSupergroupSlowModeDelay', supergroup_id: supergroupId, seconds });
    };

    handleSetMessageTtl = async event => {
        const { chatId } = this.props;
        const ttl = Number(event.target.value);
        await TdLibController.send({ '@type': 'setChatMessageTtl', chat_id: chatId, ttl });
    };

    handleProtectedContentChange = async event => {
        const { chatId } = this.props;
        await TdLibController.send({
            '@type': 'setChatProtectedContent',
            chat_id: chatId,
            has_protected_content: event.target.checked,
        });
    };

    handleChatTranslationsChange = async event => {
        const { chatId } = this.props;
        const disabled = !event.target.checked;
        await TdLibController.send({ '@type': 'toggleChatTranslations', chat_id: chatId, disabled });

        const data = ChatStore.getClientData(chatId);
        await TdLibController.clientUpdate({
            '@type': 'clientUpdateSetChatClientData',
            chatId,
            clientData: Object.assign({}, data, { chat_translations_disabled: disabled }),
        });
        this.setState({ translationSettingsVersion: Date.now() });
    };

    handleCopyInviteLink = async () => {
        const { chatId } = this.props;
        try {
            const result = await TdLibController.send({ '@type': 'getInviteLink', chat_id: chatId });
            if (result && result.invite_link) {
                copy(result.invite_link);
                const { enqueueSnackbar } = this.props;
                if (enqueueSnackbar) enqueueSnackbar('Invite link copied', { variant: 'info', autoHideDuration: 2000 });
            }
        } catch (e) {
            console.error('getInviteLink error', e);
        }
    };

    getContentHeight = () => {
        if (!this.chatDetailsListRef) return 0;

        return this.chatDetailsListRef.current.clientHeight;
    };

    render() {
        const {
            backButton,
            className,
            chatId,
            classes,
            onClose,
            onOpenGroupInCommon,
            onOpenSharedAudios,
            onOpenSharedDocuments,
            onOpenSharedLinks,
            onOpenSharedMedia,
            onOpenSharedPhotos,
            onOpenSharedVideos,
            onOpenSharedVoiceNotes,
            popup,
            t,
        } = this.props;

        let { counters, migratedCounters } = this.props;
        counters = counters || [0, 0, 0, 0, 0, 0];
        migratedCounters = migratedCounters || [0, 0, 0, 0, 0, 0];

        const [photoCount, videoCount, documentCount, audioCount, urlCount, voiceAndVideoNoteCount] = counters.map(
            (el, i) => el + migratedCounters[i],
        );

        const chat = ChatStore.get(chatId);
        if (!chat) {
            return (
                <div className='chat-details'>
                    <ChatDetailsHeader onClose={onClose} />
                    <div ref={this.chatDetailsListRef} className='chat-details-list' />
                </div>
            );
        }

        let groupInCommonCount = 0;
        if (isPrivateChat(chatId)) {
            const fullInfo = UserStore.getFullInfo(chat.type.user_id);
            groupInCommonCount = fullInfo ? fullInfo.group_in_common_count : groupInCommonCount;
        }

        const username = getChatUsername(chatId);
        const phoneNumber = getChatPhoneNumber(chatId);
        const bio = getChatBio(chatId);
        const isGroup = isGroupChat(chatId);
        const isAdmin = isAdminInChat(chatId);
        const { editingDescription, descriptionDraft } = this.state;
        const isMe = isMeChat(chatId);
        const isSecret = isChatSecret(chatId);
        const supergroupId = chat.type && chat.type.supergroup_id;
        const currentSupergroup = supergroupId ? SupergroupStore.get(supergroupId) : null;
        const supergroupFullInfo = supergroupId ? SupergroupStore.getFullInfo(supergroupId) : null;
        const linkedCommunityId = supergroupFullInfo ? supergroupFullInfo.linked_chat_id : 0;
        const linkedCommunity = linkedCommunityId ? ChatStore.get(linkedCommunityId) : null;

        const { supergroupMembers } = this.state;
        const basicMembers = getGroupChatMembers(chatId);
        // For supergroups use the async-loaded members; for basicGroups use sync fullInfo
        const rawMembers = basicMembers.length > 0 ? basicMembers : supergroupMembers;
        const users = [];
        const seenIds = new Set();
        this.members = new Map();
        rawMembers.forEach(member => {
            const uid = member.user_id || member.member_id?.user_id;
            if (!uid || seenIds.has(uid)) return;
            seenIds.add(uid);
            const user = UserStore.get(uid);
            if (user) {
                this.members.set(user.id, user.id);
                users.push(user);
            }
        });

        const sortedUsers = users.sort((x, y) => {
            return getUserStatusOrder(y) - getUserStatusOrder(x);
        });
        const myId = UserStore.getMyId ? UserStore.getMyId() : 0;
        const items = sortedUsers.map(user => (
            <ListItem button className={classes.listItem} key={user.id}>
                <UserControl userId={user.id} onSelect={this.handleOpenUser} />
                {isAdmin && user.id !== myId && (
                    <ListItemSecondaryAction>
                        <Tooltip title='Kick'>
                            <IconButton size='small' onClick={e => this.handleKickMember(e, user.id)}>
                                <ExitToAppIcon fontSize='small' />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title='Ban'>
                            <IconButton size='small' onClick={e => this.handleBanMember(e, user.id)}>
                                <BlockIcon fontSize='small' />
                            </IconButton>
                        </Tooltip>
                    </ListItemSecondaryAction>
                )}
            </ListItem>
        ));

        const { photo } = chat;
        const handleAvatarSelect = photo ? () => {
            const action = getAvatarAction();
            if (action === 'photo') this.handleOpenViewer();
            else if (action === 'copy_username' && username) copy(username.startsWith('@') ? username : `@${username}`);
        } : null;

        const content = (
            <>
                <ChatDetailsHeader
                    chatId={chatId}
                    backButton={backButton}
                    onClose={onClose}
                    onClick={this.handleHeaderClick}
                />
                <div ref={this.chatDetailsListRef} className='chat-details-list'>
                    <div className='chat-details-info'>
                        <ChatControl
                            chatId={chatId}
                            big={true}
                            showStatus={true}
                            showSavedMessages={!popup}
                            onTileSelect={handleAvatarSelect}
                        />
                    </div>
                    {!!linkedCommunityId && !this.state.legacyFeaturesOnly && (
                        <>
                            <Divider />
                            <List className='linked-community-list'>
                                <ListItem
                                    button
                                    className={classNames(classes.listItem, 'linked-community-card')}
                                    onClick={this.handleOpenLinkedCommunity}>
                                    <ListItemIcon>
                                        <ForumIcon className='linked-community-icon' />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={linkedCommunity ? linkedCommunity.title : 'Comunidad enlazada'}
                                        secondary={
                                            currentSupergroup && currentSupergroup.is_channel
                                                ? 'Grupo de debate de este canal'
                                                : 'Canal vinculado a esta comunidad'
                                        }
                                    />
                                    <span className='linked-community-open'>Abrir</span>
                                </ListItem>
                            </List>
                        </>
                    )}
                    {(username || phoneNumber || bio) && (
                        <>
                            <List>
                                {username && (
                                    <ListItem button className={classes.listItem} onClick={this.handleUsernameHint}>
                                        <ListItemIcon>
                                            <AlternateEmailIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography variant='inherit' noWrap>
                                                    {username}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                )}
                                {phoneNumber && (
                                    <>
                                        <ListItem button className={classes.listItem} onClick={this.handlePhoneHint}>
                                            <ListItemIcon>
                                                <CallIcon />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Typography variant='inherit' noWrap>
                                                        {formatPhoneNumber(phoneNumber)}
                                                    </Typography>
                                                }
                                            />
                                        </ListItem>
                                    </>
                                )}
                                {(bio || (isAdmin && isGroup)) && (
                                    <ListItem className={classes.listItem}>
                                        <ListItemIcon>
                                            <ErrorOutlineIcon className='chat-details-info-icon' />
                                        </ListItemIcon>
                                        {editingDescription ? (
                                            <>
                                                <TextField
                                                    fullWidth
                                                    multiline
                                                    autoFocus
                                                    value={descriptionDraft}
                                                    onChange={this.handleDescriptionChange}
                                                    placeholder='Description'
                                                    variant='standard'
                                                />
                                                <ListItemSecondaryAction>
                                                    <IconButton size='small' onClick={this.handleSaveDescription}>
                                                        <CheckIcon fontSize='small' />
                                                    </IconButton>
                                                </ListItemSecondaryAction>
                                            </>
                                        ) : (
                                            <>
                                                <ListItemText
                                                    primary={bio || 'Add a description...'}
                                                    style={{
                                                        whiteSpace: 'pre-wrap',
                                                        wordWrap: 'break-word',
                                                        opacity: bio ? 1 : 0.5,
                                                    }}
                                                />
                                                {isAdmin && isGroup && (
                                                    <ListItemSecondaryAction>
                                                        <IconButton size='small' onClick={this.handleEditDescription}>
                                                            <EditIcon fontSize='small' />
                                                        </IconButton>
                                                    </ListItemSecondaryAction>
                                                )}
                                            </>
                                        )}
                                    </ListItem>
                                )}
                            </List>
                        </>
                    )}
                    {(!isMe || isGroup || (popup && !isGroup)) && (
                        <>
                            <Divider />
                            <List>
                                {!isMe && <NotificationsListItem chatId={chatId} />}
                                {!isMe &&
                                    (() => {
                                        const chat = ChatStore.get(chatId);
                                        const currentTtl = chat ? chat.message_ttl || 0 : 0;
                                        const ttlOptions = [
                                            { value: 0, label: 'Desactivado' },
                                            { value: 86400, label: '1 día' },
                                            { value: 604800, label: '1 semana' },
                                            { value: 2592000, label: '1 mes' },
                                        ];
                                        return (
                                            <ListItem className={classes.listItem}>
                                                <ListItemIcon>
                                                    <TimerIcon />
                                                </ListItemIcon>
                                                <ListItemText primary='Borrado automático' />
                                                <Select
                                                    value={currentTtl}
                                                    onChange={this.handleSetMessageTtl}
                                                    disableUnderline
                                                    style={{ fontSize: '0.875rem' }}>
                                                    {ttlOptions.map(o => (
                                                        <MenuItem key={o.value} value={o.value}>
                                                            {o.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </ListItem>
                                        );
                                    })()}
                                {isGroup && <MoreListItem chatId={chatId} />}
                                {isAdmin && isGroup && (
                                    <ListItem button className={classes.listItem} onClick={this.handleCopyInviteLink}>
                                        <ListItemIcon>
                                            <InsertLinkIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography color='primary' variant='inherit' noWrap>
                                                    Copy Invite Link
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                )}
                                {!isChatSecret(chatId) &&
                                    (() => {
                                        const clientData = ChatStore.getClientData(chatId);
                                        return (
                                            <ListItem className={classes.listItem}>
                                                <ListItemIcon>
                                                    <TranslateIcon />
                                                </ListItemIcon>
                                                <ListItemText primary='Traducciones del chat' />
                                                <Switch
                                                    color='primary'
                                                    checked={!clientData.chat_translations_disabled}
                                                    onChange={this.handleChatTranslationsChange}
                                                />
                                            </ListItem>
                                        );
                                    })()}
                                {isAdmin &&
                                    isGroup &&
                                    (() => {
                                        const chat = ChatStore.get(chatId);
                                        const supergroupId = chat && chat.type && chat.type.supergroup_id;
                                        if (!supergroupId) return null;
                                        const full = SupergroupStore.getFullInfo(supergroupId);
                                        return (
                                            <ListItem className={classes.listItem}>
                                                <ListItemIcon>
                                                    <LockIcon />
                                                </ListItemIcon>
                                                <ListItemText primary='Protected Content' />
                                                <Switch
                                                    color='primary'
                                                    checked={!!(full && full.has_protected_content)}
                                                    onChange={this.handleProtectedContentChange}
                                                />
                                            </ListItem>
                                        );
                                    })()}
                                {isAdmin &&
                                    isGroup &&
                                    (() => {
                                        const chat = ChatStore.get(chatId);
                                        const supergroupId = chat && chat.type && chat.type.supergroup_id;
                                        if (!supergroupId) return null;
                                        const full = SupergroupStore.getFullInfo(supergroupId);
                                        const currentDelay = full ? full.slow_mode_delay || 0 : 0;
                                        const slowOptions = [
                                            { value: 0, label: 'Desactivado' },
                                            { value: 10, label: '10 s' },
                                            { value: 30, label: '30 s' },
                                            { value: 60, label: '1 min' },
                                            { value: 300, label: '5 min' },
                                            { value: 900, label: '15 min' },
                                            { value: 3600, label: '1 hora' },
                                        ];
                                        return (
                                            <ListItem className={classes.listItem}>
                                                <ListItemIcon>
                                                    <HourglassEmptyIcon />
                                                </ListItemIcon>
                                                <ListItemText primary='Slow Mode' />
                                                <Select
                                                    value={currentDelay}
                                                    onChange={this.handleSetSlowMode}
                                                    disableUnderline
                                                    style={{ fontSize: '0.875rem' }}>
                                                    {slowOptions.map(o => (
                                                        <MenuItem key={o.value} value={o.value}>
                                                            {o.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </ListItem>
                                        );
                                    })()}
                                {isPrivateChat(chatId) && !isSecret && !isMe && (
                                    <ListItem button className={classes.listItem} onClick={this.handleCreateSecretChat}>
                                        <ListItemIcon>
                                            <LockIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography color='primary' variant='inherit' noWrap>
                                                    {t('StartSecretChat').toUpperCase()}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                )}
                                {popup && !isGroup && (
                                    <ListItem button className={classes.listItem} onClick={this.handleOpenChat}>
                                        <ListItemText
                                            inset
                                            primary={
                                                <Typography color='primary' variant='inherit' noWrap>
                                                    {t('SendMessage').toUpperCase()}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </>
                    )}
                    {isPrivateChat(chatId) && !isMe && (
                        <>
                            <Divider />
                            <BusinessInfo userId={getChatUserId(chatId)} />
                            <StarGiftsGallery chatId={chatId} />
                        </>
                    )}
                    {(photoCount > 0 ||
                        videoCount > 0 ||
                        documentCount > 0 ||
                        audioCount > 0 ||
                        urlCount > 0 ||
                        voiceAndVideoNoteCount > 0 ||
                        groupInCommonCount > 0) && (
                        <>
                            <Divider />
                            <List>
                                {photoCount > 0 && (
                                    <ListItem button className={classes.listItem} onClick={onOpenSharedPhotos}>
                                        <ListItemIcon>
                                            <PhotoIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography variant='inherit' noWrap>
                                                    {photoCount === 1 ? '1 photo' : `${photoCount} photos`}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                )}
                                {videoCount > 0 && (
                                    <ListItem button className={classes.listItem} onClick={onOpenSharedVideos}>
                                        <ListItemIcon>
                                            <VideocamIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography variant='inherit' noWrap>
                                                    {videoCount === 1 ? '1 video' : `${videoCount} videos`}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                )}
                                {documentCount > 0 && (
                                    <ListItem button className={classes.listItem} onClick={onOpenSharedDocuments}>
                                        <ListItemIcon>
                                            <InsertDriveFileIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography variant='inherit' noWrap>
                                                    {documentCount === 1 ? '1 file' : `${documentCount} files`}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                )}
                                {audioCount > 0 && (
                                    <ListItem button className={classes.listItem} onClick={onOpenSharedAudios}>
                                        <ListItemIcon>
                                            <HeadsetIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography variant='inherit' noWrap>
                                                    {audioCount === 1 ? '1 audio file' : `${audioCount} audio files`}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                )}
                                {urlCount > 0 && (
                                    <ListItem button className={classes.listItem} onClick={onOpenSharedLinks}>
                                        <ListItemIcon>
                                            <InsertLinkIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography variant='inherit' noWrap>
                                                    {urlCount === 1 ? '1 shared link' : `${urlCount} shared links`}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                )}
                                {voiceAndVideoNoteCount > 0 && (
                                    <ListItem button className={classes.listItem} onClick={onOpenSharedVoiceNotes}>
                                        <ListItemIcon>
                                            <MicIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography variant='inherit' noWrap>
                                                    {voiceAndVideoNoteCount === 1
                                                        ? '1 voice message'
                                                        : `${voiceAndVideoNoteCount} voice messages`}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                )}
                                {groupInCommonCount > 0 && (
                                    <ListItem button className={classes.listItem} onClick={onOpenGroupInCommon}>
                                        <ListItemIcon>
                                            <GroupIcon />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Typography variant='inherit' noWrap>
                                                    {groupInCommonCount === 1
                                                        ? '1 group in common'
                                                        : `${groupInCommonCount} groups in common`}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </>
                    )}
                    {items.length > 0 && (
                        <>
                            <Divider />
                            <List>{items}</List>
                        </>
                    )}
                    {chat && chat.type && chat.type['@type'] === 'chatTypeSupergroup' && chat.type.is_channel && (
                        <>
                            <Divider />
                            <SimilarChannels chatId={chatId} />
                            <Divider />
                            <List>
                                <ListItem button onClick={this.handleChannelStats}>
                                    <ListItemText primary='Channel Stats & Revenue' secondary='TON + Stars earnings' />
                                </ListItem>
                            </List>
                        </>
                    )}
                    {chat && chat.type && chat.type['@type'] === 'chatTypeSupergroup' && (
                        <>
                            <Divider />
                            <List>
                                <ListItem button onClick={this.handleAdminLog}>
                                    <ListItemText primary='Recent Actions' secondary='Admin log' />
                                </ListItem>
                                <ListItem button onClick={this.handleJoinRequests}>
                                    <ListItemText primary='Join Requests' secondary='Approve or reject' />
                                </ListItem>
                                <ListItem button onClick={this.handleAdminManagement}>
                                    <ListItemText primary='Administradores' secondary='Gestionar permisos y roles' />
                                </ListItem>
                            </List>
                        </>
                    )}
                </div>
            </>
        );

        return popup ? (
            <>
                {content}
                <AdminLog ref={ref => (this.adminLogRef = ref)} />
                <JoinRequests ref={ref => (this.joinRequestsRef = ref)} />
                <ChannelStats ref={ref => (this.channelStatsRef = ref)} />
                <AdminManagement ref={ref => (this.adminMgmtRef = ref)} />
            </>
        ) : (
            <div className={classNames('chat-details', className)}>
                {content}
                <AdminLog ref={ref => (this.adminLogRef = ref)} />
                <JoinRequests ref={ref => (this.joinRequestsRef = ref)} />
                <ChannelStats ref={ref => (this.channelStatsRef = ref)} />
                <AdminManagement ref={ref => (this.adminMgmtRef = ref)} />
            </div>
        );
    }
}

ChatDetails.propTypes = {
    chatId: PropTypes.number.isRequired,
    popup: PropTypes.bool,
    onClose: PropTypes.func,
    onOpenGroupInCommon: PropTypes.func,
    onOpenSharedDocuments: PropTypes.func,
    onOpenSharedMedia: PropTypes.func,
    onOpenSharedLinks: PropTypes.func,
    onOpenSharedPhotos: PropTypes.func,
    onOpenSharedVideos: PropTypes.func,
    onOpenSharedVoiceNotes: PropTypes.func,
};

const enhance = compose(
    withSaveRef(),
    withTranslation(),
    withStyles(styles, { withTheme: true }),
    withSnackbar,
    withRestoreRef(),
);

export default enhance(ChatDetails);
