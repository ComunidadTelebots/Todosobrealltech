import React, { Component } from 'react';
import CircularProgress from '@material-ui/core/CircularProgress';
import TdLibController from '../../Controllers/TdLibController';
import { STAR_GIFT_MESSAGE_LIMIT, validateStarGiftPurchase } from '../../Utils/StarGiftPurchase';
import './StarGiftCatalog.css';

class StarGiftCatalog extends Component {
    state = {
        loading: true,
        gifts: [],
        balance: 0,
        selected: null,
        message: '',
        hideName: false,
        includeUpgrade: false,
        confirmed: false,
        sending: false,
        error: '',
        success: '',
    };

    componentDidMount() {
        this.load();
    }

    load = async () => {
        this.setState({ loading: true, error: '' });
        try {
            const [catalog, status] = await Promise.all([
                TdLibController.send({ '@type': 'getStarGiftCatalog' }),
                TdLibController.send({ '@type': 'getStarsBalance' }),
            ]);
            this.setState({ loading: false, gifts: catalog.gifts || [], balance: Number(status.balance || 0) });
        } catch (error) {
            this.setState({ loading: false, error: error.message || 'No se pudo cargar la tienda de regalos.' });
        }
    };

    select = gift => {
        if (gift.sold_out) return;
        this.setState({ selected: gift, confirmed: false, error: '', success: '' });
    };

    send = async () => {
        const { selected, message, hideName, includeUpgrade, confirmed, sending, balance } = this.state;
        if (!selected || !confirmed || sending) return;
        if (selected.stars > balance) {
            this.setState({ error: 'No tienes suficientes Stars para este regalo.' });
            return;
        }
        let purchase;
        try {
            purchase = validateStarGiftPurchase({ giftId: selected.id, message, hideName, includeUpgrade });
        } catch (error) {
            this.setState({ error: error.message });
            return;
        }
        this.setState({ sending: true, error: '', success: '' });
        try {
            await TdLibController.send({
                '@type': 'sendStarGift',
                user_id: this.props.userId,
                gift_id: purchase.giftId,
                message: purchase.message,
                hide_name: purchase.hideName,
                include_upgrade: purchase.includeUpgrade,
            });
            this.setState(state => ({
                sending: false,
                selected: null,
                message: '',
                confirmed: false,
                balance: Math.max(0, state.balance - selected.stars),
                success: 'Regalo enviado correctamente.',
            }));
            if (this.props.onSent) this.props.onSent();
        } catch (error) {
            this.setState({ sending: false, error: error.message || 'Telegram no pudo completar el pago.' });
        }
    };

    render() {
        const { onClose } = this.props;
        const {
            loading, gifts, balance, selected, message, hideName, includeUpgrade,
            confirmed, sending, error, success,
        } = this.state;
        const total = selected ? selected.stars + (includeUpgrade ? selected.upgrade_stars || 0 : 0) : 0;

        return (
            <div className='star-gift-store-backdrop' role='presentation' onClick={e => e.target === e.currentTarget && onClose()}>
                <section className='star-gift-store' role='dialog' aria-modal='true' aria-labelledby='star-gift-store-title'>
                    <header className='star-gift-store-header'>
                        <div>
                            <strong id='star-gift-store-title'>Enviar regalo</strong>
                            <span>Saldo: {balance} ⭐</span>
                        </div>
                        <button type='button' aria-label='Cerrar' onClick={onClose}>×</button>
                    </header>
                    {loading ? (
                        <div className='star-gift-store-loading'><CircularProgress size={28} /></div>
                    ) : (
                        <div className='star-gift-store-body'>
                            <div className='star-gift-store-grid'>
                                {gifts.map(gift => (
                                    <button
                                        type='button'
                                        key={gift.id}
                                        disabled={gift.sold_out}
                                        aria-pressed={selected?.id === gift.id}
                                        className={selected?.id === gift.id ? 'is-selected' : ''}
                                        onClick={() => this.select(gift)}>
                                        <span className='star-gift-store-emoji'>{gift.birthday ? '🎂' : '🎁'}</span>
                                        <strong>{gift.stars} ⭐</strong>
                                        {gift.limited && <small>{gift.availability_remains ?? 0} disponibles</small>}
                                        {gift.sold_out && <small>Agotado</small>}
                                    </button>
                                ))}
                            </div>
                            {selected && (
                                <div className='star-gift-store-confirm'>
                                    <label>
                                        Mensaje opcional
                                        <textarea
                                            maxLength={STAR_GIFT_MESSAGE_LIMIT}
                                            value={message}
                                            disabled={sending}
                                            onChange={event => this.setState({ message: event.target.value, confirmed: false })}
                                        />
                                        <small>{message.length}/{STAR_GIFT_MESSAGE_LIMIT}</small>
                                    </label>
                                    <label className='star-gift-store-check'>
                                        <input type='checkbox' checked={hideName} disabled={sending}
                                            onChange={event => this.setState({ hideName: event.target.checked, confirmed: false })} />
                                        Ocultar mi nombre
                                    </label>
                                    {selected.upgrade_stars != null && (
                                        <label className='star-gift-store-check'>
                                            <input type='checkbox' checked={includeUpgrade} disabled={sending}
                                                onChange={event => this.setState({ includeUpgrade: event.target.checked, confirmed: false })} />
                                            Mejorar ahora (+{selected.upgrade_stars} ⭐)
                                        </label>
                                    )}
                                    <label className='star-gift-store-check star-gift-store-final-check'>
                                        <input type='checkbox' checked={confirmed} disabled={sending || total > balance}
                                            onChange={event => this.setState({ confirmed: event.target.checked })} />
                                        Confirmo el pago irreversible de {total} Stars
                                    </label>
                                    <button type='button' className='star-gift-store-send'
                                        disabled={!confirmed || sending || total > balance} onClick={this.send}>
                                        {sending ? 'Enviando…' : total > balance ? 'Saldo insuficiente' : `Enviar por ${total} ⭐`}
                                    </button>
                                </div>
                            )}
                            {error && <div className='star-gift-store-error' role='alert'>{error}</div>}
                            {success && <div className='star-gift-store-success' role='status'>{success}</div>}
                        </div>
                    )}
                </section>
            </div>
        );
    }
}

export default StarGiftCatalog;
