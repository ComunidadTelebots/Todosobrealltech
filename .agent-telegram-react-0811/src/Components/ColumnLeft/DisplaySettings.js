import React, { Component } from 'react';
import './DisplaySettings.css';
import {
    INCOMING_SOUND_KEY,
    OUTGOING_SOUND_KEY,
    readSoundPreference,
    writeSoundPreference,
} from '../../Utils/MessageSound';

const FONT_SIZE_KEY = 'tg_font_size';
const COMPACT_KEY = 'tg_compact_mode';
const ANIM_KEY = 'tg_anim_speed';

export function initDisplaySettings() {
    const fontSize = parseInt(localStorage.getItem(FONT_SIZE_KEY) || '14', 10);
    const compact = localStorage.getItem(COMPACT_KEY) === '1';
    const animSpeed = localStorage.getItem(ANIM_KEY) || '1';

    document.documentElement.style.setProperty('--text-body', `${fontSize}px`);
    document.documentElement.style.setProperty('--text-dialog', `${fontSize}px`);
    if (compact) document.body.classList.add('display-compact');
    document.documentElement.style.setProperty('--anim-speed', animSpeed);
}

class DisplaySettings extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fontSize: parseInt(localStorage.getItem(FONT_SIZE_KEY) || '14', 10),
            compact: localStorage.getItem(COMPACT_KEY) === '1',
            animSpeed: localStorage.getItem(ANIM_KEY) || '1',
            incomingSound: readSoundPreference(INCOMING_SOUND_KEY, localStorage, true),
            outgoingSound: readSoundPreference(OUTGOING_SOUND_KEY, localStorage, false),
        };
    }

    handleFontSize = e => {
        const size = parseInt(e.target.value, 10);
        this.setState({ fontSize: size });
        localStorage.setItem(FONT_SIZE_KEY, String(size));
        document.documentElement.style.setProperty('--text-body', `${size}px`);
        document.documentElement.style.setProperty('--text-dialog', `${size}px`);
    };

    handleCompact = e => {
        const compact = e.target.checked;
        this.setState({ compact });
        localStorage.setItem(COMPACT_KEY, compact ? '1' : '0');
        document.body.classList.toggle('display-compact', compact);
    };

    handleAnimSpeed = speed => {
        this.setState({ animSpeed: speed });
        localStorage.setItem(ANIM_KEY, speed);
        document.documentElement.style.setProperty('--anim-speed', speed);
    };

    handleSound = (key, stateKey) => event => {
        const enabled = event.target.checked;
        writeSoundPreference(key, enabled);
        this.setState({ [stateKey]: enabled });
    };

    render() {
        const { fontSize, compact, animSpeed, incomingSound, outgoingSound } = this.state;
        return (
            <div className='display-settings'>
                <div className='display-settings-title'>Visualización</div>

                <div className='display-settings-row'>
                    <label className='display-settings-label'>Tamaño de fuente</label>
                    <div className='display-settings-range-wrap'>
                        <span className='display-settings-range-hint'>A</span>
                        <input
                            type='range'
                            min={11}
                            max={20}
                            step={1}
                            value={fontSize}
                            onChange={this.handleFontSize}
                            className='display-settings-range'
                        />
                        <span className='display-settings-range-hint display-settings-range-hint--lg'>A</span>
                        <span className='display-settings-range-val'>{fontSize}px</span>
                    </div>
                </div>

                <div className='display-settings-row'>
                    <label className='display-settings-label'>Sonido de mensajes recibidos</label>
                    <label className='display-settings-toggle'>
                        <input type='checkbox' checked={incomingSound}
                            onChange={this.handleSound(INCOMING_SOUND_KEY, 'incomingSound')} />
                        <span className='display-settings-toggle-track' />
                    </label>
                </div>

                <div className='display-settings-row'>
                    <label className='display-settings-label'>Sonido de mensajes enviados</label>
                    <label className='display-settings-toggle'>
                        <input type='checkbox' checked={outgoingSound}
                            onChange={this.handleSound(OUTGOING_SOUND_KEY, 'outgoingSound')} />
                        <span className='display-settings-toggle-track' />
                    </label>
                </div>

                <div className='display-settings-row'>
                    <label className='display-settings-label'>Modo compacto</label>
                    <label className='display-settings-toggle'>
                        <input type='checkbox' checked={compact} onChange={this.handleCompact} />
                        <span className='display-settings-toggle-track' />
                    </label>
                </div>

                <div className='display-settings-row'>
                    <label className='display-settings-label'>Velocidad de animaciones</label>
                    <div className='display-settings-speeds'>
                        {[
                            { val: '0', label: 'Sin' },
                            { val: '0.5', label: 'Rápida' },
                            { val: '1', label: 'Normal' },
                            { val: '1.5', label: 'Lenta' },
                        ].map(s => (
                            <button
                                key={s.val}
                                className={`display-settings-speed-btn${animSpeed === s.val ? ' selected' : ''}`}
                                onClick={() => this.handleAnimSpeed(s.val)}>
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}

export default DisplaySettings;
