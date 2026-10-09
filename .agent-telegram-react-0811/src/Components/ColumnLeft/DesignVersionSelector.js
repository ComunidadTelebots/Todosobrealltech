/*
 * Generic design version selector — shows a pill in the dialogs header
 * for any theme family that has multiple sub-variants defined.
 * Replaces the Android-specific AndroidVersionSelector.
 */

import React from 'react';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import CheckIcon from '@material-ui/icons/Check';
import ApplicationStore from '../../Stores/ApplicationStore';
import { DESIGN_ACCENTS, getDesign, getDesignFamily, setDesign } from '../../Design';
import { newestDesignVersionsFirst } from '../../Utils/DesignVersionOrder';
import './DesignVersionSelector.css';

// All sub-variants per design family.
// Each entry: { value, label, detail, tag, trigger }
//   value   → design name passed to setDesign()
//   label   → short version label (shown in dropdown secondary row)
//   detail  → longer description (shown in dropdown primary row)
//   tag     → colored badge text
//   trigger → text shown on the pill button
export const DESIGN_VERSION_REGISTRY = {
    current: [
        { value: 'current', label: 'Standard', detail: 'Web React standard', tag: 'Standard', trigger: 'Standard' },
        { value: 'current-compact', label: 'Compact', detail: 'Web React compact', tag: 'Compact', trigger: 'Compact' },
    ],
    webk: [
        {
            value: 'webk-2020',
            label: '2020',
            detail: 'Web K primera versión — sidebar azul',
            tag: '2020',
            trigger: '2020',
        },
        { value: 'webk-2022', label: '2022', detail: 'Rediseño sidebar claro #3390ec', tag: '2022', trigger: '2022' },
        { value: 'webk', label: 'Actual', detail: 'Web K standard 2023+', tag: 'Actual', trigger: 'Actual' },
        { value: 'webk-2025', label: '2025', detail: 'Web K 2025 layout', tag: '2025', trigger: '2025' },
    ],
    weba: [
        { value: 'weba', label: 'Standard', detail: 'Web A (header blanco)', tag: 'Standard', trigger: 'Standard' },
        {
            value: 'weba-classic',
            label: 'Color',
            detail: 'Web A header azul',
            tag: 'Color',
            trigger: 'Color',
        },
    ],
    android: [
        { value: 'android-v1', label: '1.x', detail: 'Holo 2013', tag: 'Holo', trigger: '1.x' },
        { value: 'android-v2', label: '2.x', detail: 'Holo refinado 2014', tag: 'Holo 2', trigger: '2.x' },
        { value: 'android-v3', label: '3.x', detail: 'Material 2015', tag: 'Mat.', trigger: '3.x' },
        { value: 'android-v35', label: '3.5', detail: 'Material refinado 2016', tag: 'Mat.+', trigger: '3.5' },
        { value: 'android-holo', label: '4.x Holo', detail: 'Holo oscuro 2017', tag: '4.x', trigger: '4.x Holo' },
        { value: 'android-v9', label: '6.x', detail: 'Folders 2019', tag: '6.x', trigger: '6.x' },
        { value: 'android-classic', label: '7.x', detail: 'Classic 2020', tag: '7.x', trigger: '7.x' },
        { value: 'android-v11', label: '8.x', detail: 'Burbujas 2021', tag: '8.x', trigger: '8.x' },
        { value: 'android-matyou', label: '11.x MatY', detail: 'Material You 2024', tag: 'MatYou', trigger: '11.x' },
        { value: 'android-v12', label: '12.x', detail: 'Rediseño 2026', tag: 'Actual', trigger: '12.x' },
        { value: 'android-redesign', label: '12.5', detail: 'Redesign cards 2025', tag: '12.5', trigger: '12.5' },
        { value: 'android', label: '12.6', detail: 'Android estándar', tag: '12.6', trigger: '12.6' },
        { value: 'android-glass', label: '12.6.4', detail: 'Glass beta 2025', tag: 'Glass', trigger: 'Glass' },
    ],
    ios: [
        { value: 'ios-7', label: 'iOS 7', detail: 'Flat 2013 — primer diseño plano', tag: 'Flat', trigger: 'iOS 7' },
        { value: 'ios-10', label: 'iOS 10', detail: '3D Touch 2016', tag: 'iOS 10', trigger: 'iOS 10' },
        { value: 'ios-14', label: 'iOS 14', detail: 'Widgets 2020', tag: 'iOS 14', trigger: 'iOS 14' },
        { value: 'ios', label: 'iOS actual', detail: 'iPhone moderno 2024', tag: 'Actual', trigger: 'iOS' },
        { value: 'ios-ipad', label: 'iPad', detail: 'iPad wide layout', tag: 'iPad', trigger: 'iPad' },
    ],
    macos: [
        {
            value: 'macos-yosemite',
            label: 'Yosemite',
            detail: 'Primer flat macOS 2014',
            tag: 'Yosemite',
            trigger: 'Yosemite',
        },
        { value: 'macos-bigsur', label: 'Big Sur', detail: 'Translucency 2020', tag: 'Big Sur', trigger: 'Big Sur' },
        {
            value: 'macos-monterey',
            label: 'Monterey',
            detail: 'macOS Monterey 2021',
            tag: 'Monterey',
            trigger: 'Monterey',
        },
        { value: 'macos', label: 'Sonoma', detail: 'macOS Sonoma actual 2024', tag: 'Actual', trigger: 'Sonoma' },
    ],
    tdesktop: [
        {
            value: 'tdesktop-classic',
            label: 'Classic',
            detail: 'TDesktop Classic 2015 — sidebar azul oscuro',
            tag: '2015',
            trigger: 'Classic',
        },
        {
            value: 'tdesktop-2019',
            label: '2019',
            detail: 'TDesktop 2019 — sidebar #2b4f6e, burbujas 6px',
            tag: '2019',
            trigger: '2019',
        },
        { value: 'tdesktop', label: 'Actual', detail: 'TDesktop moderno 2020+', tag: 'Actual', trigger: 'Actual' },
    ],
    unigram: [
        { value: 'unigram-wp', label: 'WP 2016', detail: 'Windows Phone tiles 2016', tag: 'WP', trigger: 'WP 2016' },
        {
            value: 'unigram-fluent',
            label: 'Fluent 2018',
            detail: 'Fluent Design System 2018',
            tag: 'Fluent',
            trigger: 'Fluent',
        },
        { value: 'unigram', label: 'WinUI 3', detail: 'WinUI 3 actual 2022+', tag: 'WinUI3', trigger: 'WinUI3' },
    ],
    webogram: [
        {
            value: 'webogram',
            label: '2013',
            detail: 'Webogram clásico 2013 — accent #5682a3',
            tag: '2013',
            trigger: '2013',
        },
        {
            value: 'webogram-blue',
            label: '2016',
            detail: 'Webogram 2016 — accent azul vibrante #1d7cba',
            tag: '2016',
            trigger: '2016',
        },
    ],
    aurora: [
        { value: 'aurora', label: 'Default', detail: 'Aurora default', tag: 'Default', trigger: 'Default' },
        {
            value: 'aurora-midnight',
            label: 'Midnight',
            detail: 'Aurora midnight',
            tag: 'Midnight',
            trigger: 'Midnight',
        },
    ],
    telegramx: [
        {
            value: 'telegramx-2018',
            label: '2018',
            detail: 'Primera versión — acento verde agua',
            tag: '2018',
            trigger: '2018',
        },
        { value: 'telegramx', label: 'Actual', detail: 'TGX v8 actual', tag: 'v8', trigger: 'v8' },
        { value: 'telegramx-red', label: 'Red', detail: 'TGX Red gradient', tag: 'Red', trigger: 'Red' },
    ],
};

class DesignVersionSelector extends React.PureComponent {
    constructor(props) {
        super(props);

        this.rootRef = React.createRef();
        this.state = {
            open: false,
            design: getDesign(),
            legacyOnly: localStorage.getItem('tg_design_legacy_features') === 'true',
        };
    }

    componentDidMount() {
        document.addEventListener('mousedown', this.handleDocumentMouseDown);
        ApplicationStore.on('clientUpdateThemeChange', this.handleThemeChange);
        ApplicationStore.on('clientUpdateDesignCapabilities', this.handleCapabilitiesChange);
    }

    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleDocumentMouseDown);
        ApplicationStore.off('clientUpdateThemeChange', this.handleThemeChange);
        ApplicationStore.off('clientUpdateDesignCapabilities', this.handleCapabilitiesChange);
    }

    handleThemeChange = () => {
        this.setState({ design: getDesign() });
    };

    handleCapabilitiesChange = ({ legacyOnly }) => {
        this.setState({ legacyOnly: !!legacyOnly });
    };

    handleToggleCapabilities = event => {
        event.stopPropagation();
        this.setState(({ legacyOnly }) => {
            const next = !legacyOnly;
            localStorage.setItem('tg_design_legacy_features', String(next));
            document.body.classList.toggle('design-legacy-features', next);
            ApplicationStore.emit('clientUpdateDesignCapabilities', { legacyOnly: next });
            return { legacyOnly: next };
        });
    };

    handleDocumentMouseDown = event => {
        if (!this.rootRef.current) return;
        if (this.rootRef.current.contains(event.target)) return;
        this.setState({ open: false });
    };

    handleToggle = event => {
        event.stopPropagation();
        this.setState(({ open }) => ({ open: !open }));
    };

    handleSelect = value => {
        setDesign(value);
        this.setState({ design: value, open: false });

        const family = getDesignFamily(value);
        ApplicationStore.emit('clientUpdateThemeChanging', {
            type: document.body.classList.contains('theme-dark') ? 'dark' : 'light',
            primary: { main: DESIGN_ACCENTS[value] || DESIGN_ACCENTS[family] || DESIGN_ACCENTS.current },
        });
    };

    render() {
        const { open, design, legacyOnly } = this.state;
        const family = getDesignFamily(design);
        const versions = DESIGN_VERSION_REGISTRY[family];

        // Don't render if there's only one version for this family
        if (!versions || versions.length < 2) return null;

        const current = versions.find(v => v.value === design) || versions[0];
        const accent = DESIGN_ACCENTS[design] || DESIGN_ACCENTS[family] || DESIGN_ACCENTS.current;

        return (
            <div className={`dv-selector dv-selector--${family}`} ref={this.rootRef}>
                <button
                    type='button'
                    className='dv-trigger'
                    style={{ '--dv-accent': accent }}
                    onClick={this.handleToggle}
                    aria-haspopup='menu'
                    aria-expanded={open}>
                    <span className='dv-trigger-text'>{current.trigger || current.detail}</span>
                    <KeyboardArrowDownIcon className='dv-chevron' />
                </button>
                {open && (
                    <div className='dv-menu' role='menu'>
                        {newestDesignVersionsFirst(versions).map(option => {
                            const selected = option.value === design;
                            return (
                                <button
                                    key={option.value}
                                    type='button'
                                    className={`dv-option${selected ? ' dv-option--selected' : ''}`}
                                    style={{ '--dv-accent': accent }}
                                    onClick={() => this.handleSelect(option.value)}>
                                    <span className='dv-copy'>
                                        <span className='dv-detail'>{option.detail}</span>
                                        <span className='dv-label'>{option.label}</span>
                                    </span>
                                    <span className='dv-tag'>{option.tag}</span>
                                    {selected && <CheckIcon className='dv-check' />}
                                </button>
                            );
                        })}
                        <div className='dv-capabilities'>
                            <div className='dv-capabilities-copy'>
                                <strong>{legacyOnly ? 'Funciones de la época' : 'Todas las funciones actuales'}</strong>
                                <span>La API moderna se mantiene en ambos modos.</span>
                            </div>
                            <button
                                type='button'
                                className={`dv-capabilities-button${legacyOnly ? ' is-legacy' : ''}`}
                                onClick={this.handleToggleCapabilities}>
                                {legacyOnly ? 'Activar funciones actuales' : 'Mantener diseño original'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
}

export default DesignVersionSelector;
