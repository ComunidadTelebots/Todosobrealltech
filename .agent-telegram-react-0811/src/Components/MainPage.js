/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import classNames from 'classnames';
import { compose } from 'recompose';
import withStyles from '@material-ui/core/styles/withStyles';
import withLanguage from '../Language';
import withTheme from '../Theme';
import withSnackbarNotifications from '../Notifications';
import ForwardDialog from './Popup/ForwardDialog';
import NewGroupDialog from './Popup/NewGroupDialog';
import NewChannelDialog from './Popup/NewChannelDialog';
import ChatInfo from './ColumnRight/ChatInfo';
import DesignSwitcher from './DesignSwitcher';
import Dialogs from './ColumnLeft/Dialogs';
import DialogDetails from './ColumnMiddle/DialogDetails';
import Footer from './Footer';
import InstantViewer from './InstantView/InstantViewer';
import AmpViewer from './AmpViewer/AmpViewer';
import MessageThread from './Additional/MessageThread';
import BotWebApp from './Additional/BotWebApp';
import InternalBrowser from './Additional/InternalBrowser';
import IncomingCall from './Calls/IncomingCall';
import ActiveCall from './Calls/ActiveCall';
import CallRatingDialog from './Calls/CallRatingDialog';
import QuickChatBar from './Additional/QuickChatBar';
import MediaViewer from './Viewer/MediaViewer';
import ProfileMediaViewer from './Viewer/ProfileMediaViewer';
import { borderStyle } from './Theme';
import { highlightMessage, closeAmpViewer } from '../Actions/Client';
import ApplicationStore from '../Stores/ApplicationStore';
import ChatStore from '../Stores/ChatStore';
import InstantViewStore from '../Stores/InstantViewStore';
import UserStore from '../Stores/UserStore';
import TdLibController from '../Controllers/TdLibController';
import '../TelegramApp.css';

const styles = theme => ({
    page: {
        background: theme.palette.type === 'dark' ? theme.palette.background.default : '#FFFFFF',
        color: theme.palette.text.primary,
    },
    ...borderStyle(theme),
});

class MainPage extends React.Component {
    constructor(props) {
        super(props);

        this.dialogDetailsRef = React.createRef();

        this.state = {
            isChatDetailsVisible: ApplicationStore.isChatDetailsVisible,
            mediaViewerContent: ApplicationStore.mediaViewerContent,
            profileMediaViewerContent: ApplicationStore.profileMediaViewerContent,
            forwardInfo: null,
            instantViewContent: null,
            ampViewerUrl: null,
            ampViewerWebPage: null,
            newGroupOpen: false,
            newChannelOpen: false,
            activeChatId: ApplicationStore.getChatId(),
        };

        /*this.store = localForage.createInstance({
                    name: 'tdlib'
                });*/

        //this.initDB();
    }

    componentDidMount() {
        UserStore.on('clientUpdateOpenUser', this.onClientUpdateOpenUser);
        ChatStore.on('clientUpdateOpenChat', this.onClientUpdateOpenChat);

        ApplicationStore.on('clientUpdateChatDetailsVisibility', this.onClientUpdateChatDetailsVisibility);
        ApplicationStore.on('clientUpdateChatId', this.onClientUpdateChatId);
        ApplicationStore.on('clientUpdateMediaViewerContent', this.onClientUpdateMediaViewerContent);
        ApplicationStore.on('clientUpdateProfileMediaViewerContent', this.onClientUpdateProfileMediaViewerContent);
        ApplicationStore.on('clientUpdateForward', this.onClientUpdateForward);
        InstantViewStore.on('clientUpdateInstantViewContent', this.onClientUpdateInstantViewContent);
        TdLibController.on('clientUpdate', this.onClientUpdateDialogs);
        TdLibController.on('clientUpdate', this.onClientUpdateAmpViewer);
    }

    componentWillUnmount() {
        UserStore.off('clientUpdateOpenUser', this.onClientUpdateOpenUser);
        ChatStore.off('clientUpdateOpenChat', this.onClientUpdateOpenChat);

        ApplicationStore.off('clientUpdateChatDetailsVisibility', this.onClientUpdateChatDetailsVisibility);
        ApplicationStore.off('clientUpdateChatId', this.onClientUpdateChatId);
        ApplicationStore.off('clientUpdateMediaViewerContent', this.onClientUpdateMediaViewerContent);
        ApplicationStore.off('clientUpdateProfileMediaViewerContent', this.onClientUpdateProfileMediaViewerContent);
        ApplicationStore.off('clientUpdateForward', this.onClientUpdateForward);
        InstantViewStore.off('clientUpdateInstantViewContent', this.onClientUpdateInstantViewContent);
        TdLibController.off('clientUpdate', this.onClientUpdateDialogs);
        TdLibController.off('clientUpdate', this.onClientUpdateAmpViewer);
    }

    onClientUpdateInstantViewContent = update => {
        const { content } = update;

        this.setState({
            instantViewContent: content,
        });
    };

    onClientUpdateOpenChat = update => {
        const { chatId, messageId, popup } = update;

        this.handleSelectChat(chatId, messageId, popup);
    };

    onClientUpdateOpenUser = update => {
        const { userId, popup } = update;

        this.handleSelectUser(userId, popup);
    };

    onClientUpdateChatId = update => {
        this.setState({ activeChatId: update.nextChatId || 0 });
    };

    onClientUpdateChatDetailsVisibility = update => {
        this.setState({
            isChatDetailsVisible: ApplicationStore.isChatDetailsVisible,
        });
    };

    onClientUpdateMediaViewerContent = update => {
        this.setState({ mediaViewerContent: ApplicationStore.mediaViewerContent });
    };

    onClientUpdateProfileMediaViewerContent = update => {
        this.setState({
            profileMediaViewerContent: ApplicationStore.profileMediaViewerContent,
        });
    };

    onClientUpdateForward = update => {
        const { info } = update;

        this.setState({ forwardInfo: info });
    };

    onClientUpdateAmpViewer = update => {
        if (update['@type'] === 'clientUpdateAmpViewerContent') {
            this.setState({ ampViewerUrl: update.url || null, ampViewerWebPage: update.webPage || null });
        }
    };

    onClientUpdateDialogs = update => {
        if (update['@type'] === 'clientUpdateNewGroupDialog') {
            this.setState({ newGroupOpen: true });
        } else if (update['@type'] === 'clientUpdateNewChannelDialog') {
            this.setState({ newChannelOpen: true });
        }
    };

    handleSelectChat = (chatId, messageId = null, popup = false) => {
        const currentChatId = ApplicationStore.getChatId();
        const currentDialogChatId = ApplicationStore.dialogChatId;
        const currentMessageId = ApplicationStore.getMessageId();

        if (popup) {
            if (currentDialogChatId !== chatId) {
                TdLibController.clientUpdate({
                    '@type': 'clientUpdateDialogChatId',
                    chatId,
                });
            }

            return;
        }

        if (currentChatId === chatId && messageId && currentMessageId === messageId) {
            this.dialogDetailsRef.current.scrollToMessage();
            if (messageId) {
                highlightMessage(chatId, messageId);
            }
        } else if (currentChatId === chatId && !messageId) {
            this.dialogDetailsRef.current.scrollToStart();
        } else {
            TdLibController.setChatId(chatId, messageId);
        }

        this.setState({ activeChatId: chatId });
    };

    handleSelectUser = async (userId, popup) => {
        if (!userId) return;

        const chat = await TdLibController.send({
            '@type': 'createPrivateChat',
            user_id: userId,
            force: true,
        });

        this.handleSelectChat(chat.id, null, popup);
    };

    render() {
        const { classes } = this.props;
        const {
            instantViewContent,
            ampViewerUrl,
            ampViewerWebPage,
            isChatDetailsVisible,
            mediaViewerContent,
            profileMediaViewerContent,
            forwardInfo,
            newGroupOpen,
            newChannelOpen,
            activeChatId,
        } = this.state;

        return (
            <>
                <div
                    className={classNames(classes.page, classes.borderColor, 'page', {
                        'page-third-column': isChatDetailsVisible,
                    })}
                    data-chat-active={activeChatId ? 'true' : 'false'}>
                    <Dialogs />
                    <DialogDetails ref={this.dialogDetailsRef} />
                    {isChatDetailsVisible && <ChatInfo />}
                </div>
                {instantViewContent && <InstantViewer {...instantViewContent} />}
                {ampViewerUrl && <AmpViewer url={ampViewerUrl} webPage={ampViewerWebPage} onClose={closeAmpViewer} />}
                {mediaViewerContent && <MediaViewer {...mediaViewerContent} />}
                {profileMediaViewerContent && <ProfileMediaViewer {...profileMediaViewerContent} />}
                {forwardInfo && <ForwardDialog {...forwardInfo} />}
                <NewGroupDialog open={newGroupOpen} onClose={() => this.setState({ newGroupOpen: false })} />
                <NewChannelDialog open={newChannelOpen} onClose={() => this.setState({ newChannelOpen: false })} />
                <DesignSwitcher />
                <MessageThread ref={ref => (window._messageThreadRef = ref)} />
                <BotWebApp ref={ref => (window._botWebAppRef = ref)} />
                <InternalBrowser />
                <IncomingCall />
                <ActiveCall />
                <CallRatingDialog />
                <QuickChatBar />
            </>
        );
    }
}

MainPage.propTypes = {};

const enhance = compose(withLanguage, withTheme, withStyles(styles), withSnackbarNotifications);

export default enhance(MainPage);
