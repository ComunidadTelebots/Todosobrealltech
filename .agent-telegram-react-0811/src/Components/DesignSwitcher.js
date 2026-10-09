/*
 * Quick design switcher shown in the lower-left corner.
 */

import React from 'react';
import AppsIcon from '@material-ui/icons/Apps';
import CheckIcon from '@material-ui/icons/Check';
import packageJson from '../../package.json';
import ApplicationStore from '../Stores/ApplicationStore';
import { DESIGN_ACCENTS, DESIGN_LABELS, DESIGNS, getDesign, getDesignFamily, setDesign } from '../Design';
import './DesignSwitcher.css';

class DesignSwitcher extends React.PureComponent {
    constructor(props) {
        super(props);

        this.rootRef = React.createRef();
        this.state = {
            open: false,
            design: getDesign(),
        };
    }

    componentDidMount() {
        document.addEventListener('mousedown', this.handleDocumentMouseDown);
        ApplicationStore.on('clientUpdateThemeChange', this.handleDesignChange);
    }

    componentWillUnmount() {
        document.removeEventListener('mousedown', this.handleDocumentMouseDown);
        ApplicationStore.off('clientUpdateThemeChange', this.handleDesignChange);
    }

    handleDesignChange = () => {
        this.setState({ design: getDesign() });
    };

    handleDocumentMouseDown = event => {
        if (!this.rootRef.current) return;
        if (this.rootRef.current.contains(event.target)) return;

        this.setState({ open: false });
    };

    handleToggle = () => {
        this.setState(({ open }) => ({ open: !open }));
    };

    handleSelect = design => {
        setDesign(design);
        this.setState({ design, open: false });

        ApplicationStore.emit('clientUpdateThemeChanging', {
            type: document.body.classList.contains('theme-dark') ? 'dark' : 'light',
            primary: { main: DESIGN_ACCENTS[design] || DESIGN_ACCENTS.current },
        });
    };

    renderOption = design => {
        const selected = this.state.design === design;
        const label = DESIGN_LABELS[design] || design;
        const accent = DESIGN_ACCENTS[design] || DESIGN_ACCENTS.current;

        return (
            <button
                key={design}
                type='button'
                className='design-switcher-option'
                onClick={() => this.handleSelect(design)}>
                <span className='design-switcher-dot' style={{ background: accent }} />
                <span className='design-switcher-option-label'>{label}</span>
                {selected && <CheckIcon className='design-switcher-check' />}
            </button>
        );
    };

    render() {
        const { open, design } = this.state;
        const family = getDesignFamily(design);
        const label = DESIGN_LABELS[family] || family;
        const accent = DESIGN_ACCENTS[design] || DESIGN_ACCENTS[family] || DESIGN_ACCENTS.current;

        return (
            <div className='design-switcher' ref={this.rootRef}>
                {open && (
                    <div className='design-switcher-menu' role='menu' aria-label='Switch design'>
                        <div className='design-switcher-title'>Cambiar diseño</div>
                        <div className='design-switcher-options'>{DESIGNS.map(this.renderOption)}</div>
                    </div>
                )}
                <button
                    type='button'
                    className='design-switcher-trigger'
                    onClick={this.handleToggle}
                    aria-haspopup='menu'
                    aria-expanded={open}>
                    <AppsIcon className='design-switcher-trigger-icon' />
                    <span className='design-switcher-dot' style={{ background: accent }} />
                    <span className='design-switcher-trigger-label'>{label}</span>
                    <span className='design-switcher-version'>web v{packageJson.version}</span>
                </button>
            </div>
        );
    }
}

export default DesignSwitcher;
