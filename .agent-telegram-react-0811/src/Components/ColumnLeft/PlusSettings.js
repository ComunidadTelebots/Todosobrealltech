import React from 'react';
import AppStore from '../../Stores/ApplicationStore';
import ChatStore from '../../Stores/ChatStore';
import UserStore from '../../Stores/UserStore';
import {
    applyPlusAppearance, exportPlusPreferences, importPlusPreferences, readNoticeTargets, readPlusPreferences,
    setNoticeTarget, writePlusPreferences,
} from '../../Utils/PlusPreferences';
import '../Additional/PlusSettings.css';

export default class PlusSettings extends React.PureComponent {
    state = { preferences: readPlusPreferences(), targetEnabled: false, message: '' };

    componentDidMount() { this.syncTarget(); }
    syncTarget = () => {
        const chatId = AppStore.getChatId();
        this.setState({ targetEnabled: readNoticeTargets().some(item => item.chatId === chatId) });
    };
    update = patch => {
        try {
            const preferences = writePlusPreferences({ ...this.state.preferences, ...patch });
            applyPlusAppearance(preferences);
            this.setState({ preferences, message: 'Preferencias guardadas.' });
        } catch (error) { this.setState({ message: error.message }); }
    };
    toggleCurrentTarget = event => {
        const chatId = AppStore.getChatId();
        const chat = ChatStore.get(chatId);
        const userId = chat?.type?.['@type'] === 'chatTypePrivate' ? chat.type.user_id : 0;
        const user = userId ? UserStore.get(userId) : null;
        if (!user?.is_contact) return this.setState({ message: 'Solo puedes activar avisos para contactos en chats privados.' });
        try {
            setNoticeTarget({ chatId, userId }, event.target.checked);
            this.setState({ targetEnabled: event.target.checked, message: 'Lista privada actualizada.' });
        } catch (error) { this.setState({ message: error.message }); }
    };
    exportSettings = () => {
        const blob = new Blob([exportPlusPreferences()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url; anchor.download = 'telegram-react-plus-preferences.json'; anchor.click();
        URL.revokeObjectURL(url);
    };
    importSettings = async event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || file.size > 16384) return this.setState({ message: 'Archivo no válido o demasiado grande.' });
        try {
            const preferences = importPlusPreferences(await file.text());
            applyPlusAppearance(preferences);
            this.setState({ preferences, message: 'Preferencias importadas.' });
        } catch (error) { this.setState({ message: error.message }); }
    };
    render() {
        const { preferences, targetEnabled, message } = this.state;
        return <section className='plus-settings'>
            <strong>Ajustes Plus privados</strong>
            <p>Los avisos están desactivados por defecto, no consultan estados ocultos y solo funcionan con contactos elegidos.</p>
            <label><span>Presencia en línea</span><input type='checkbox' checked={preferences.presenceAlerts} onChange={e => this.update({ presenceAlerts: e.target.checked })} /></label>
            <label><span>Está escribiendo</span><input type='checkbox' checked={preferences.typingAlerts} onChange={e => this.update({ typingAlerts: e.target.checked })} /></label>
            <label><span>Avisar sobre el chat privado actual</span><input type='checkbox' checked={targetEnabled} onChange={this.toggleCurrentTarget} /></label>
            <label><span>Al pulsar un avatar</span><select value={preferences.avatarAction} onChange={e => this.update({ avatarAction: e.target.value })}>
                <option value='photo'>Abrir fotografía</option><option value='copy_username'>Copiar usuario</option><option value='none'>Ninguna acción</option>
            </select></label>
            <label><span>Usar fuente del sistema</span><input type='checkbox' checked={preferences.useSystemFont} onChange={e => this.update({ useSystemFont: e.target.checked })} /></label>
            <label><span>Tamaño del panel de emoji</span><select value={preferences.emojiPanelSize} onChange={e => this.update({ emojiPanelSize: e.target.value })}>
                <option value='compact'>Compacto</option><option value='default'>Original del diseño</option><option value='large'>Grande</option>
            </select></label>
            <label><span>Ocultar mi teléfono en menús</span><input type='checkbox' checked={preferences.hidePhoneNumber} onChange={e => this.update({ hidePhoneNumber: e.target.checked })} /></label>
            <strong>Navegación</strong>
            <label><span>Ocultar navegación inferior</span><input type='checkbox' checked={preferences.hideBottomNavigation} onChange={e => this.update({ hideBottomNavigation: e.target.checked })} /></label>
            <label><span>Ocultarla al desplazarse</span><input type='checkbox' checked={preferences.hideBottomNavOnScroll} disabled={preferences.hideBottomNavigation} onChange={e => this.update({ hideBottomNavOnScroll: e.target.checked })} /></label>
            <label><span>Ocultar botón de mensaje nuevo</span><input type='checkbox' checked={preferences.hideNewMessageButton} onChange={e => this.update({ hideNewMessageButton: e.target.checked })} /></label>
            <div className='plus-settings-actions'><button type='button' onClick={this.exportSettings}>Exportar preferencias</button><label className='plus-settings-import'>Importar<input type='file' accept='application/json,.json' onChange={this.importSettings} /></label></div>
            <small>La exportación nunca incluye sesiones, claves, tokens, chats ni la lista privada de contactos.</small>
            {message && <div className='plus-settings-message' role='status'>{message}</div>}
        </section>;
    }
}
