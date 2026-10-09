import React, { Component } from 'react';
import CircularProgress from '@material-ui/core/CircularProgress';
import TdLibController from '../../Controllers/TdLibController';
import { giftMarketplaceAvailability } from '../../Utils/TelegramCapabilities';
import StarGiftCatalog from './StarGiftCatalog';
import './StarGiftsGallery.css';

const giftMarketplace = giftMarketplaceAvailability();

class GiftDetailModal extends Component {
    constructor(props) {
        super(props);
        this.state = { transferOpen: false, transferConfirmed: false, recipient: '' };
    }

    submitTransfer = () => {
        const recipient = this.state.recipient.trim();
        if (!recipient || !this.state.transferConfirmed) return;
        this.props.onAction('transfer', this.props.gift, { recipient });
    };

    render() {
        const { gift, onClose, onAction, busyAction, actionError } = this.props;
        if (!gift) return null;

        const canUpgrade = gift.can_upgrade || gift.canUpgrade;
        const upgradeStars = gift.upgrade_stars ?? gift.upgradeStars;
        const transferStars = gift.transfer_stars ?? gift.transferStars;
        const refunded = gift.refunded;
        const nameHidden = gift.name_hidden ?? gift.nameHidden;
        const unsaved = gift.unsaved;

        const canTransfer = transferStars != null;
        const { transferOpen, transferConfirmed, recipient } = this.state;

        return (
            <div className='stargift-modal-backdrop' onClick={e => e.target === e.currentTarget && onClose()}>
                <div className='stargift-modal'>
                    <div className='stargift-modal-header'>
                        <span className='stargift-modal-title'>Regalo de estrellas</span>
                        <button className='stargift-modal-close' onClick={onClose}>
                            ✕
                        </button>
                    </div>
                    <div className='stargift-modal-body'>
                        <div className='stargift-modal-icon'>{refunded ? '🔄' : '⭐'}</div>
                        <div className='stargift-modal-stars'>{gift.stars != null ? `${gift.stars} ⭐` : '—'}</div>

                        {refunded && <div className='stargift-badge stargift-badge--refunded'>Reembolsado</div>}
                        {unsaved && <div className='stargift-badge stargift-badge--unsaved'>No guardado</div>}
                        {nameHidden && <div className='stargift-badge stargift-badge--anon'>Remitente anónimo</div>}

                        {gift.message && <div className='stargift-modal-message'>{gift.message}</div>}
                        <div className='stargift-modal-meta'>
                            {gift.date ? new Date(gift.date * 1000).toLocaleDateString() : ''}
                        </div>

                        <div className='stargift-actions'>
                            {/* Upgrade */}
                            <button
                                type='button'
                                disabled={!canUpgrade || !!busyAction}
                                onClick={() => onAction('upgrade', gift)}
                                className={`stargift-action${canUpgrade ? '' : ' stargift-action--disabled'}`}>
                                <span className='stargift-action-icon'>✨</span>
                                <div className='stargift-action-info'>
                                    <span className='stargift-action-label'>Mejorar regalo</span>
                                    {upgradeStars != null && (
                                        <span className='stargift-action-cost'>{upgradeStars} ⭐</span>
                                    )}
                                </div>
                                <span className='stargift-action-status'>
                                    {canUpgrade ? 'Disponible' : 'No disponible'}
                                </span>
                            </button>

                            {/* Transfer */}
                            <button
                                type='button'
                                disabled={!canTransfer || !!busyAction}
                                onClick={() => this.setState({ transferOpen: !transferOpen, transferConfirmed: false })}
                                className={`stargift-action${canTransfer ? '' : ' stargift-action--disabled'}`}>
                                <span className='stargift-action-icon'>↗</span>
                                <div className='stargift-action-info'>
                                    <span className='stargift-action-label'>Transferir</span>
                                    {transferStars != null && (
                                        <span className='stargift-action-cost'>{transferStars} ⭐</span>
                                    )}
                                </div>
                                <span className='stargift-action-status'>
                                    {canTransfer ? 'Disponible' : 'No disponible'}
                                </span>
                            </button>

                            {transferOpen && canTransfer && (
                                <div className='stargift-transfer-form'>
                                    <label htmlFor='stargift-recipient'>Usuario o ID del destinatario</label>
                                    <input
                                        id='stargift-recipient'
                                        type='text'
                                        autoComplete='off'
                                        value={recipient}
                                        placeholder='@usuario o ID'
                                        disabled={!!busyAction}
                                        onChange={event =>
                                            this.setState({ recipient: event.target.value, transferConfirmed: false })
                                        }
                                    />
                                    <label className='stargift-transfer-confirm'>
                                        <input
                                            type='checkbox'
                                            checked={transferConfirmed}
                                            disabled={!recipient.trim() || !!busyAction}
                                            onChange={event =>
                                                this.setState({ transferConfirmed: event.target.checked })
                                            }
                                        />
                                        <span>
                                            Confirmo la transferencia irreversible
                                            {transferStars > 0 ? ` y el coste de ${transferStars} Stars` : ''}.
                                        </span>
                                    </label>
                                    <button
                                        type='button'
                                        className='stargift-transfer-submit'
                                        disabled={!recipient.trim() || !transferConfirmed || !!busyAction}
                                        onClick={this.submitTransfer}>
                                        {busyAction === 'transfer' ? 'Transfiriendo...' : 'Confirmar transferencia'}
                                    </button>
                                </div>
                            )}

                            {/* Resale */}
                            <div className='stargift-action stargift-action--disabled'>
                                <span className='stargift-action-icon'>🏷</span>
                                <div className='stargift-action-info'>
                                    <span className='stargift-action-label'>Poner en venta</span>
                                    <span className='stargift-action-cost'>
                                        {giftMarketplace.label}
                                    </span>
                                </div>
                                <span className='stargift-action-status'>
                                    {giftMarketplace.available ? 'Pendiente de validación' : 'No disponible'}
                                </span>
                            </div>

                            {/* Convert */}
                            {gift.convert_stars != null && (
                                <button
                                    type='button'
                                    disabled={!!busyAction}
                                    onClick={() => onAction('convert', gift)}
                                    className='stargift-action'>
                                    <span className='stargift-action-icon'>💫</span>
                                    <div className='stargift-action-info'>
                                        <span className='stargift-action-label'>Convertir a estrellas</span>
                                        <span className='stargift-action-cost'>{gift.convert_stars} ⭐</span>
                                    </div>
                                    <span className='stargift-action-status'>Disponible</span>
                                </button>
                            )}

                            <button
                                type='button'
                                disabled={!!busyAction}
                                onClick={() => onAction(gift.unsaved ? 'save' : 'unsave', gift)}
                                className='stargift-action'>
                                <span className='stargift-action-icon'>{gift.unsaved ? '☆' : '★'}</span>
                                <div className='stargift-action-info'>
                                    <span className='stargift-action-label'>
                                        {gift.unsaved ? 'Mostrar en el perfil' : 'Ocultar del perfil'}
                                    </span>
                                </div>
                                <span className='stargift-action-status'>
                                    {busyAction === 'save' || busyAction === 'unsave' ? 'Guardando...' : 'Cambiar'}
                                </span>
                            </button>
                        </div>
                        {actionError && <div className='stargift-action-error'>{actionError}</div>}
                    </div>
                </div>
            </div>
        );
    }
}

class StarGiftsGallery extends Component {
    constructor(props) {
        super(props);
        this.state = {
            gifts: [],
            loading: true,
            loadingMore: false,
            hasMore: false,
            total: 0,
            error: '',
            selectedGift: null,
            busyAction: '',
            actionError: '',
            catalogOpen: false,
        };
    }

    componentDidMount() {
        this._load();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.chatId !== this.props.chatId) {
            this.setState({ gifts: [], loading: true, error: '', selectedGift: null, actionError: '' });
            this._load();
        }
    }

    _load = async (append = false) => {
        const { chatId } = this.props;
        const offset = append ? this.state.gifts.length : 0;
        this.setState(append ? { loadingMore: true, error: '' } : { loading: true, error: '' });
        try {
            const result = await TdLibController.send({
                '@type': 'getSavedStarGifts',
                chat_id: chatId,
                offset,
                limit: 50,
            });
            const next = result.gifts || [];
            const total = result.count || next.length;
            this.setState(state => ({
                gifts: append ? state.gifts.concat(next) : next,
                total,
                loading: false,
                loadingMore: false,
                hasMore: offset + next.length < total,
            }));
        } catch (err) {
            this.setState({ loading: false, loadingMore: false, error: err.message || 'Error al cargar regalos.' });
        }
    };

    _performAction = async (action, gift, options = {}) => {
        const type = {
            save: 'saveStarGift',
            unsave: 'saveStarGift',
            convert: 'convertStarGift',
            upgrade: 'upgradeStarGift',
            transfer: 'transferStarGift',
        }[action];
        if (!type) return;
        this.setState({ busyAction: action, actionError: '' });
        try {
            await TdLibController.send({
                '@type': type,
                gift_id: gift.id,
                unsave: action === 'unsave',
                keep_original_details: true,
                recipient: options.recipient,
            });
            if (action === 'convert' || action === 'transfer') {
                this.setState(state => ({
                    gifts: state.gifts.filter(item => item.id !== gift.id),
                    selectedGift: null,
                    busyAction: '',
                    total: Math.max(0, state.total - 1),
                }));
            } else {
                const updated = {
                    ...gift,
                    unsaved: action === 'unsave' ? true : action === 'save' ? false : gift.unsaved,
                };
                this.setState(state => ({
                    gifts: state.gifts.map(item => (item.id === gift.id ? updated : item)),
                    selectedGift: updated,
                    busyAction: '',
                }));
            }
        } catch (error) {
            this.setState({ busyAction: '', actionError: error.message || 'No se pudo actualizar el regalo.' });
        }
    };

    render() {
        const { gifts, loading, loadingMore, hasMore, error, selectedGift, busyAction, actionError, catalogOpen } = this.state;

        return (
            <div className='stargift-gallery'>
                <div className='stargift-gallery-heading'>
                    <div className='stargift-gallery-title'>Regalos de estrellas</div>
                    <button type='button' className='stargift-shop-button' onClick={() => this.setState({ catalogOpen: true })}>
                        Enviar regalo
                    </button>
                </div>
                {loading ? (
                    <div className='stargift-gallery-loading'><CircularProgress size={24} /></div>
                ) : error ? (
                    <div className='stargift-gallery-error'>{error}</div>
                ) : gifts.length ? <div className='stargift-gallery-grid'>
                    {gifts.map((gift, idx) => (
                        <button
                            key={gift.id || idx}
                            className='stargift-item'
                            onClick={() => this.setState({ selectedGift: gift })}>
                            <span className='stargift-item-icon'>⭐</span>
                            {gift.stars != null && <span className='stargift-item-stars'>{gift.stars}</span>}
                        </button>
                    ))}
                </div> : <div className='stargift-gallery-empty'>Este usuario aún no muestra regalos.</div>}
                {hasMore && (
                    <button className='stargift-load-more' disabled={loadingMore} onClick={() => this._load(true)}>
                        {loadingMore ? 'Cargando...' : 'Ver más regalos'}
                    </button>
                )}
                {selectedGift && (
                    <GiftDetailModal
                        gift={selectedGift}
                        busyAction={busyAction}
                        actionError={actionError}
                        onAction={this._performAction}
                        onClose={() => this.setState({ selectedGift: null, actionError: '' })}
                    />
                )}
                {catalogOpen && (
                    <StarGiftCatalog
                        userId={this.props.chatId}
                        onClose={() => this.setState({ catalogOpen: false })}
                        onSent={() => this._load()}
                    />
                )}
            </div>
        );
    }
}

export default StarGiftsGallery;
