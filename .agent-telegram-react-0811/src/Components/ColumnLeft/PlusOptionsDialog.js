import React from 'react';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import PlusSettings from './PlusSettings';
import PlusInteractionSettings from './PlusInteractionSettings';
import {
    CHAT_LIST_LINES_KEY,
    PLUS_SETTINGS_EVENT,
    PLUS_SORT_KEY,
    PLUS_VIEWS_KEY,
    readSmartChatPreference,
    writeSmartChatPreference,
} from '../../Utils/SmartChatList';
import { PHOTO_QUALITY_KEY, PHOTO_QUALITY_PROFILES, normalizePhotoQuality } from '../../Utils/PhotoQuality';
import './PlusOptionsDialog.css';

class PlusOptionsDialog extends React.PureComponent {
    state = {
        open: false,
        smartViews: readSmartChatPreference(PLUS_VIEWS_KEY, '0') === '1',
        sortMode: readSmartChatPreference(PLUS_SORT_KEY, 'telegram'),
        chatLines: readSmartChatPreference(CHAT_LIST_LINES_KEY, '2'),
        photoQuality: normalizePhotoQuality(readSmartChatPreference(PHOTO_QUALITY_KEY, 'original')),
    };

    open = () => this.setState({ open: true });
    close = () => this.setState({ open: false });

    save = (key, stateKey, value) => {
        writeSmartChatPreference(key, value);
        this.setState({ [stateKey]: value });
        window.dispatchEvent(new Event(PLUS_SETTINGS_EVENT));
    };

    render() {
        const { open, smartViews, sortMode, chatLines, photoQuality } = this.state;
        return (
            <Dialog open={open} onClose={this.close} fullScreen classes={{ paper: 'plus-options-dialog' }}>
                <header className='plus-options-toolbar'>
                    <button type='button' onClick={this.close} aria-label='Volver a ajustes'>
                        <ArrowBackIcon />
                    </button>
                    <div><strong>Opciones Plus Messenger</strong><small>Funciones opcionales para personalizar Telegram React</small></div>
                </header>
                <DialogContent className='plus-options-content'>
                    <section className='plus-options-card'>
                        <strong>Organización de chats</strong>
                        <label><span>Vistas inteligentes</span><input type='checkbox' checked={smartViews}
                            onChange={e => this.save(PLUS_VIEWS_KEY, 'smartViews', e.target.checked ? '1' : '0')} /></label>
                        <label><span>Orden de conversaciones</span><select value={sortMode}
                            onChange={e => this.save(PLUS_SORT_KEY, 'sortMode', e.target.value)}>
                            <option value='telegram'>Orden de Telegram</option><option value='unread'>No leídos primero</option>
                            <option value='name'>Por nombre</option><option value='favorites'>Favoritos primero</option>
                        </select></label>
                        <label><span>Líneas por conversación</span><select value={chatLines}
                            onChange={e => this.save(CHAT_LIST_LINES_KEY, 'chatLines', e.target.value)}>
                            <option value='2'>Dos líneas</option><option value='3'>Tres líneas</option>
                        </select></label>
                        <small>La selección múltiple se activa desde el botón «Seleccionar» de la lista de chats.</small>
                    </section>
                    <section className='plus-options-card'>
                        <strong>Fotografías</strong>
                        <label><span>Calidad predeterminada</span><select value={photoQuality}
                            onChange={e => this.save(PHOTO_QUALITY_KEY, 'photoQuality', e.target.value)}>
                            {PHOTO_QUALITY_PROFILES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                        </select></label>
                    </section>
                    <PlusInteractionSettings />
                    <PlusSettings />
                    <a className='plus-options-github' href='https://github.com/rafalense/Plus-Messenger'
                        target='_blank' rel='noopener noreferrer'>Ver Plus Messenger en GitHub ↗</a>
                </DialogContent>
            </Dialog>
        );
    }
}

export default PlusOptionsDialog;
