/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { withTranslation } from 'react-i18next';
import classNames from 'classnames';
import { getUserFullName } from '../../Utils/User';
import { getChatTitle, isPrivateChat } from '../../Utils/Chat';
import { openUser as openUserCommand, openChat as openChatCommand } from '../../Actions/Client';
import UserStore from '../../Stores/UserStore';
import ChatStore from '../../Stores/ChatStore';
import { getPeerColor } from '../../Utils/PeerColors';
import CustomEmoji from './CustomEmoji';
import './MessageAuthor.css';

class MessageAuthor extends React.Component {
    componentDidMount() {
        UserStore.on('updateUser', this.handleUserUpdate);
    }

    componentWillUnmount() {
        UserStore.off('updateUser', this.handleUserUpdate);
    }

    handleUserUpdate = update => {
        if (update && update.user && update.user.id === this.props.userId) this.forceUpdate();
    };

    handleSelect = event => {
        const { chatId, userId, openUser, openChat } = this.props;

        if (openUser && userId) {
            event.stopPropagation();

            openUserCommand(userId, true);
            return;
        }

        if (openChat && chatId) {
            event.stopPropagation();

            openChatCommand(chatId, null, true);
            return;
        }
    };

    render() {
        const { t, chatId, userId, openUser, openChat } = this.props;

        const user = UserStore.get(userId);
        if (user) {
            const peerColor = getPeerColor(user.accent_color_id);
            const tileColor =
                !peerColor && isPrivateChat(chatId)
                    ? 'message-author-color'
                    : !peerColor
                    ? `user_color_${(Math.abs(userId) % 8) + 1}`
                    : null;
            const className = classNames(tileColor, 'message-author');
            const style = peerColor ? { color: peerColor } : undefined;

            const fullName = getUserFullName(user);
            const emojiDocId = user.emoji_status && user.emoji_status.document_id;
            const statusBadge = emojiDocId ? (
                <CustomEmoji key={emojiDocId} emojiId={emojiDocId} fallback='' />
            ) : user.is_premium ? (
                <span className='message-author-premium'>⭐</span>
            ) : null;

            return openUser ? (
                <a className={className} style={style} onClick={this.handleSelect}>
                    {fullName}
                    {statusBadge}
                </a>
            ) : (
                <>
                    <span style={style}>{fullName}</span>
                    {statusBadge}
                </>
            );
        }

        if (userId) {
            return <span className='message-author'>{`${t('User') || 'Usuario'} ${userId}`}</span>;
        }

        const chat = ChatStore.get(chatId);
        if (chat) {
            const className = classNames('message-author-color', 'message-author');

            const fullName = getChatTitle(chatId, false, t);

            return openChat ? (
                <a className={className} onClick={this.handleSelect}>
                    {fullName}
                </a>
            ) : (
                <>{fullName}</>
            );
        }

        return null;
    }
}

MessageAuthor.propTypes = {
    chatId: PropTypes.number,
    userId: PropTypes.number,
    openUser: PropTypes.bool,
    openChat: PropTypes.bool,
};

MessageAuthor.defaultProps = {
    openUser: false,
    openChat: false,
};

export default withTranslation()(MessageAuthor);
