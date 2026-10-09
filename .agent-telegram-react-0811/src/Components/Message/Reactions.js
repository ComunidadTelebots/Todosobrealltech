/*
 * Renders message reactions and handles sending/removing them.
 */

import React, { Component } from 'react';
import TdLibController from '../../Controllers/TdLibController';
import MessageStore from '../../Stores/MessageStore';
import GramJsController from '../../Controllers/GramJsController';
import ReactorsModal from './ReactorsModal';
import './Reactions.css';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const MAX_VISIBLE_REACTIONS = 5;
const REACTION_SEARCH_TERMS = [
    'me gusta like', 'amor corazon heart', 'risa reir laugh', 'sorpresa wow', 'triste llorar sad', 'rezar gracias please',
    'fuego fire', 'fiesta celebrar party', 'aplauso clap', 'pensar think', 'mente explota mind blown', 'enamorado love',
];
const readReactionChats = new Set();

class Reactions extends Component {
    constructor(props) {
        super(props);
        this.state = {
            showPicker: false,
            reactorsModal: null,
            availableReactions: QUICK_REACTIONS,
            paidOptimistic: 0,
            paidSending: false,
            pickerSearch: '',
            expanded: false,
            tooltip: null,
            tooltipNames: [],
        };
        this.pickerRef = null;
        this.tooltipTimer = null;
        this.reactionClickTimer = null;
    }

    componentDidMount() {
        this._isMounted = true;
        MessageStore.on('updateMessageReactions', this.onUpdateReactions);
        this.markUnreadReactionsAsRead();
        this.loadAvailableReactions();
        document.addEventListener('mousedown', this.handleOutsideClick);
    }

    componentDidUpdate() {
        this.markUnreadReactionsAsRead();
    }

    componentWillUnmount() {
        this._isMounted = false;
        MessageStore.off('updateMessageReactions', this.onUpdateReactions);
        document.removeEventListener('mousedown', this.handleOutsideClick);
        clearTimeout(this.tooltipTimer);
        clearTimeout(this.reactionClickTimer);
    }

    onUpdateReactions = update => {
        const { chatId, messageId } = this.props;
        if (update.chat_id === chatId && update.message_id === messageId) {
            if (this._isMounted) this.forceUpdate();
        }
    };

    handleReactionClick = (emoji, event) => {
        const { chatId, messageId } = this.props;
        const message = MessageStore.get(chatId, messageId);
        const reactions = message && message.reactions;
        const existing = reactions && reactions.reactions.find(r => r.reaction === emoji);

        if (!(existing && existing.is_chosen) && event && event.currentTarget) {
            this.spawnParticles(event.currentTarget);
        }

        TdLibController.send({
            '@type': 'sendMessageReaction',
            chat_id: chatId,
            message_id: messageId,
            reaction: existing && existing.is_chosen ? null : emoji,
        });
        this.setState({ showPicker: false, pickerSearch: '' });
    };

    handleReactionDoubleClick = (event, emoji) => {
        event.preventDefault();
        event.stopPropagation();
        clearTimeout(this.reactionClickTimer);
        TdLibController.send({
            '@type': 'sendMessageReaction',
            chat_id: this.props.chatId,
            message_id: this.props.messageId,
            reaction: emoji,
            is_big: true,
        });
        const target = event.currentTarget;
        target.classList.add('reaction-big-pulse');
        setTimeout(() => target && target.classList.remove('reaction-big-pulse'), 600);
    };

    handleReactionBubbleClick = (event, emoji) => {
        clearTimeout(this.reactionClickTimer);
        this.reactionClickTimer = setTimeout(() => this.handleReactionClick(emoji, event), 220);
    };

    handleOutsideClick = event => {
        if (this.pickerRef && !this.pickerRef.contains(event.target)) {
            this.setState({ showPicker: false, pickerSearch: '' });
        }
    };

    handleReactionHover = (event, emoji) => {
        const rect = event.currentTarget.getBoundingClientRect();
        clearTimeout(this.tooltipTimer);
        this.tooltipTimer = setTimeout(async () => {
            const result = await TdLibController.send({
                '@type': 'getMessageReactors',
                chat_id: this.props.chatId,
                message_id: this.props.messageId,
                reaction: emoji,
            });
            if (!this._isMounted) return;
            const names = (result?.reactors || []).slice(0, 5).map(r => r.sender_name).filter(Boolean);
            if (names.length) {
                this.setState({
                    tooltip: { top: rect.top, left: rect.left + rect.width / 2 },
                    tooltipNames: names,
                });
            }
        }, 350);
    };

    handleReactionLeave = () => {
        clearTimeout(this.tooltipTimer);
        this.setState({ tooltip: null, tooltipNames: [] });
    };

    spawnParticles = target => {
        const COUNT = 8;
        for (let i = 0; i < COUNT; i++) {
            const el = document.createElement('span');
            el.className = 'reaction-particle';
            const angle = (i / COUNT) * 2 * Math.PI;
            const dist = 18 + Math.random() * 12;
            el.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
            el.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
            el.style.animationDelay = `${Math.random() * 0.08}s`;
            target.appendChild(el);
            setTimeout(() => el.remove(), 650);
        }
    };

    handleReactionLongPress = (e, emoji) => {
        e.preventDefault();
        const { chatId, messageId } = this.props;
        this.setState({ reactorsModal: { chatId, messageId, reaction: emoji } });
    };

    handleSetDefaultReaction = async (event, emoji) => {
        event.preventDefault();
        event.stopPropagation();
        try {
            await TdLibController.send({ '@type': 'setDefaultReaction', reaction: emoji });
        } catch (e) {
            console.warn('[Reactions] setDefaultReaction error', e);
        }
        this.setState({ showPicker: false });
    };

    handleTogglePicker = e => {
        e.stopPropagation();
        this.setState(s => ({ showPicker: !s.showPicker, pickerSearch: '' }));
    };

    handlePaidReactionClick = async e => {
        e.stopPropagation();
        const { chatId, messageId } = this.props;
        if (this.state.paidSending) return;
        this.setState(s => ({ paidOptimistic: s.paidOptimistic + 1, paidSending: true }));
        try {
            await GramJsController.sendPaidReaction(chatId, messageId, 1);
        } catch (err) {
            const msg = err && (err.message || String(err));
            if (msg && msg.includes('STARS_TOO_FRESH')) {
                alert('No tienes suficientes estrellas.');
            }
            this.setState(s => ({ paidOptimistic: Math.max(0, s.paidOptimistic - 1) }));
        } finally {
            this.setState({ paidSending: false });
        }
    };

    handleCloseReactors = () => {
        this.setState({ reactorsModal: null });
    };

    loadAvailableReactions = async () => {
        try {
            const result = await TdLibController.send({ '@type': 'getAvailableReactions' });
            const reactions = result?.reactions || [];
            if (this._isMounted && reactions.length) {
                this.setState({ availableReactions: reactions.slice(0, 12) });
            }
        } catch (e) {
            console.warn('[Reactions] getAvailableReactions error', e);
        }
    };

    markUnreadReactionsAsRead = () => {
        const { chatId, messageId } = this.props;
        const message = MessageStore.get(chatId, messageId);
        const reactions = message && message.reactions;
        if (!reactions || !reactions.has_unread_reactions || readReactionChats.has(chatId)) return;

        readReactionChats.add(chatId);
        TdLibController.send({ '@type': 'readAllMessageReactions', chat_id: chatId });
        reactions.has_unread_reactions = false;
        if (reactions.recent_reactions) {
            reactions.recent_reactions.forEach(r => {
                r.is_unread = false;
            });
        }
    };

    render() {
        const { chatId, messageId } = this.props;
        const {
            showPicker,
            reactorsModal,
            availableReactions,
            paidOptimistic,
            paidSending,
            pickerSearch,
            expanded,
            tooltip,
            tooltipNames,
        } = this.state;
        const message = MessageStore.get(chatId, messageId);
        const reactions = message && message.reactions;
        const list = reactions ? reactions.reactions : [];
        const visibleList =
            expanded || list.length <= MAX_VISIBLE_REACTIONS ? list : list.slice(0, MAX_VISIBLE_REACTIONS);
        const hiddenCount = Math.max(0, list.length - MAX_VISIBLE_REACTIONS);
        const normalizedSearch = pickerSearch.trim().toLocaleLowerCase();
        const filteredReactions = availableReactions.filter(
            (emoji, index) =>
                !normalizedSearch ||
                emoji.includes(normalizedSearch) ||
                (REACTION_SEARCH_TERMS[index] || '').includes(normalizedSearch),
        );
        const paidCount = (reactions ? reactions.paid_total_count || 0 : 0) + paidOptimistic;
        const unreadReactions = new Set(
            reactions && reactions.recent_reactions
                ? reactions.recent_reactions.filter(r => r.is_unread).map(r => r.reaction)
                : [],
        );

        return (
            <div className='reactions-wrap'>
                {paidCount > 0 && (
                    <button
                        className='reaction-paid-badge'
                        title={`${paidCount} paid reactions`}
                        onClick={e => this.setState({ reactorsModal: { chatId, messageId, reaction: 'paid' } })}>
                        ⭐ <span className='reaction-paid-count'>{paidCount}</span>
                    </button>
                )}
                <button
                    className={`reaction-paid-add${paidSending ? ' reaction-paid-sending' : ''}`}
                    onClick={this.handlePaidReactionClick}
                    title='Send a star reaction'>
                    +⭐
                </button>
                {visibleList.map(r => (
                    <button
                        key={r.reaction}
                        className={`reaction-bubble${r.is_chosen ? ' reaction-chosen' : ''}${
                            unreadReactions.has(r.reaction) ? ' reaction-unread' : ''
                        }`}
                        onClick={e => this.handleReactionBubbleClick(e, r.reaction)}
                        onDoubleClick={e => this.handleReactionDoubleClick(e, r.reaction)}
                        onContextMenu={e => this.handleReactionLongPress(e, r.reaction)}
                        onMouseEnter={e => this.handleReactionHover(e, r.reaction)}
                        onMouseLeave={this.handleReactionLeave}
                        title={r.reaction}>
                        <span className='reaction-emoji'>{r.reaction}</span>
                        <span className='reaction-count'>{r.total_count}</span>
                    </button>
                ))}
                {!expanded && hiddenCount > 0 && (
                    <button className='reaction-more-btn' onClick={() => this.setState({ expanded: true })}>
                        +{hiddenCount}
                    </button>
                )}
                <button className='reaction-add-btn' onClick={this.handleTogglePicker} title='Add reaction'>
                    +
                </button>
                {showPicker && (
                    <div className='reaction-picker-panel' ref={node => (this.pickerRef = node)}>
                        <input
                            className='reaction-picker-search'
                            value={pickerSearch}
                            onChange={event => this.setState({ pickerSearch: event.target.value })}
                            placeholder='Buscar reacción…'
                            aria-label='Buscar reacción'
                            autoFocus
                        />
                        <div className='reaction-picker-grid'>
                            {filteredReactions.map(emoji => (
                                <button
                                    key={emoji}
                                    className='reaction-picker-item'
                                    onClick={e => this.handleReactionClick(emoji, e)}
                                    onContextMenu={event => this.handleSetDefaultReaction(event, emoji)}
                                    title='Clic para reaccionar; clic derecho para predeterminada'>
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {tooltip && tooltipNames.length > 0 && (
                    <div className='reaction-tooltip' style={{ top: tooltip.top - 40, left: tooltip.left }}>
                        {tooltipNames.join(', ')}
                    </div>
                )}
                {reactorsModal && (
                    <ReactorsModal
                        open={true}
                        chatId={reactorsModal.chatId}
                        messageId={reactorsModal.messageId}
                        reaction={reactorsModal.reaction}
                        onClose={this.handleCloseReactors}
                    />
                )}
            </div>
        );
    }
}

export default Reactions;
