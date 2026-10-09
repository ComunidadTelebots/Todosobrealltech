import React from 'react';
import {
    DOUBLE_CLICK_ACTION_KEY,
    QUICK_CHAT_BAR_KEY,
    readDoubleClickAction,
    readQuickChatBarEnabled,
    writePlusInteraction,
} from '../../Utils/PlusInteractions';
import './PlusInteractionSettings.css';

class PlusInteractionSettings extends React.PureComponent {
    state = { quickBar: readQuickChatBarEnabled(), doubleClick: readDoubleClickAction() };

    setQuickBar = event => {
        const quickBar = event.target.checked;
        writePlusInteraction(QUICK_CHAT_BAR_KEY, quickBar ? '1' : '0');
        this.setState({ quickBar });
    };

    setDoubleClick = event => {
        const doubleClick = event.target.value;
        writePlusInteraction(DOUBLE_CLICK_ACTION_KEY, doubleClick);
        this.setState({ doubleClick });
    };

    render() {
        return (
            <section className='plus-interaction-settings' aria-labelledby='plus-interactions-title'>
                <strong id='plus-interactions-title'>Accesos rápidos</strong>
                <label>
                    <span>Barra opcional de chats recientes</span>
                    <input type='checkbox' checked={this.state.quickBar} onChange={this.setQuickBar} />
                </label>
                <label>
                    <span>Al hacer doble clic en un mensaje</span>
                    <select value={this.state.doubleClick} onChange={this.setDoubleClick}>
                        <option value='none'>No hacer nada (predeterminado)</option>
                        <option value='react'>Reaccionar</option>
                        <option value='reply'>Responder</option>
                        <option value='edit'>Editar si es posible</option>
                        <option value='save'>Guardar en Mensajes guardados</option>
                        <option value='copy'>Copiar texto</option>
                    </select>
                </label>
                <small>Los enlaces, botones y contenidos multimedia conservan siempre su doble clic original.</small>
            </section>
        );
    }
}

export default PlusInteractionSettings;
