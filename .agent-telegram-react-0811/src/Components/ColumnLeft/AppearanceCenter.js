import React from 'react';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import CheckIcon from '@material-ui/icons/Check';
import CompareArrowsIcon from '@material-ui/icons/CompareArrows';
import EditIcon from '@material-ui/icons/Edit';
import LinkIcon from '@material-ui/icons/Link';
import ShareIcon from '@material-ui/icons/Share';
import { DESIGN_ACCENTS, getDesignFamily } from '../../Design';
import { DESIGN_VERSION_REGISTRY } from './DesignVersionSelector';
import { newestDesignVersionsFirst } from '../../Utils/DesignVersionOrder';
import { EDITOR_SECTIONS, FAMILY_LABELS, SHOWCASE } from './AppearanceCatalog';
import './AppearanceCenter.css';

function DesignMockup({ design, compact = false }) {
    const family = getDesignFamily(design);
    const accent = DESIGN_ACCENTS[design] || DESIGN_ACCENTS[family] || '#3390ec';
    return (
        <div className={`appearance-mockup appearance-mockup--${family}${compact ? ' is-compact' : ''}`} style={{ '--mock-accent': accent }}>
            <div className='appearance-mockup-status'><span>11:30</span><span>● ◢</span></div>
            <div className='appearance-mockup-head'><span>‹</span><i /><b>Lucía<small>en línea</small></b><span>⋮</span></div>
            <div className='appearance-mockup-date'>15 de mayo</div>
            <div className='appearance-mockup-chat'>
                <span className='in'>¡Hola! ¿Cómo estás?<small>11:20</small></span>
                <span className='out'>¡Hola! Todo bien, ¿y tú?<small>11:20 ✓✓</small></span>
            </div>
            <div className='appearance-mockup-input'><span>☺</span><em>Mensaje</em><span>⌕</span><span>♩</span></div>
        </div>
    );
}

class AppearanceCenter extends React.PureComponent {
    state = {
        view: 'home',
        family: getDesignFamily(this.props.design),
        originalDesign: this.props.design,
        compareDesign: 'current',
    };

    componentDidUpdate(prevProps) {
        if (!prevProps.open && this.props.open) {
            this.setState({ view: 'home', family: getDesignFamily(this.props.design), originalDesign: this.props.design });
        }
    }

    openFamily = family => this.setState({ view: 'versions', family, originalDesign: this.props.design });
    openPreview = design => {
        this.props.onSelectDesign(design);
        this.setState({ view: 'preview' });
    };
    cancelPreview = () => {
        this.props.onSelectDesign(this.state.originalDesign);
        this.setState({ view: 'versions' });
    };
    applyPreview = () => this.setState({ view: 'home', originalDesign: this.props.design });

    renderHeader(title, back = 'home') {
        return (
            <header className='appearance-center-header'>
                <button type='button' aria-label='Volver' onClick={() => back === 'close' ? this.props.onClose() : this.setState({ view: back })}><ArrowBackIcon /></button>
                <h2>{title}</h2>
                <span />
            </header>
        );
    }

    renderHome() {
        const { design } = this.props;
        return <>
            {this.renderHeader('Apariencia', 'close')}
            <main className='appearance-center-body'>
                <section>
                    <div className='appearance-section-title'>Diseños generales</div>
                    <p className='appearance-section-help'>Selecciona una familia o importa un diseño compartido mediante enlace.</p>
                    <div className='appearance-palette-grid'>
                        {['Clásico azul', 'Oscuro', 'Amanecer', 'Lavanda'].map((name, index) => <button key={name} type='button' onClick={this.props.onOpenAdvanced} className={`appearance-palette palette-${index}`}><i /><span>{name}</span></button>)}
                    </div>
                </section>
                <section>
                    <div className='appearance-section-title'>Diseños propios</div>
                    <div className='appearance-design-grid'>
                        {SHOWCASE.map(item => <button key={item.label} type='button' className={design === item.value ? 'selected' : ''} onClick={() => this.openFamily(item.family)}><DesignMockup design={item.value} compact /><span>{item.label}</span>{design === item.value && <CheckIcon />}</button>)}
                    </div>
                </section>
                <div className='appearance-home-actions'>
                    <button type='button' onClick={() => this.setState({ view: 'editor' })}><EditIcon /> Crear diseño</button>
                    <button type='button' onClick={() => this.setState({ view: 'compare' })}><CompareArrowsIcon /> Comparar</button>
                    <button type='button' onClick={this.props.onOpenAdvanced}>Ajustes avanzados</button>
                </div>
            </main>
        </>;
    }

    renderVersions() {
        const { family } = this.state;
        const versions = newestDesignVersionsFirst(DESIGN_VERSION_REGISTRY[family] || [{ value: family, label: 'Actual', detail: FAMILY_LABELS[family] }]);
        return <>
            {this.renderHeader(`Versiones de ${FAMILY_LABELS[family] || family}`)}
            <main className='appearance-center-body'>
                <div className='appearance-family-tabs'>{Object.keys(DESIGN_VERSION_REGISTRY).map(key => <button type='button' key={key} className={key === family ? 'selected' : ''} onClick={() => this.setState({ family: key })}>{FAMILY_LABELS[key] || key}</button>)}</div>
                <div className='appearance-version-line'>{versions.map((version, index) => <button type='button' key={version.value} className={this.props.design === version.value ? 'selected' : ''} onClick={() => this.openPreview(version.value)}><i>{index + 1}</i><DesignMockup design={version.value} compact /><b>{version.label}</b><small>{version.detail}</small></button>)}</div>
                <div className='appearance-info'><b>{versions.find(item => item.value === this.props.design)?.detail || FAMILY_LABELS[family]}</b><span>Diseño histórico recreado para funcionar con las capacidades modernas de Telegram React.</span></div>
            </main>
        </>;
    }

    renderPreview() {
        return <>
            {this.renderHeader(`Vista previa · ${this.props.design}`, 'versions')}
            <main className='appearance-center-body appearance-preview'><DesignMockup design={this.props.design} /><p>Comprueba burbujas, navegación, tipografía, avatares e iconos antes de aplicar el diseño.</p></main>
            <footer className='appearance-action-bar'><button type='button' onClick={this.cancelPreview}>Cancelar</button><button type='button' className='primary' onClick={this.applyPreview}>Aplicar</button></footer>
        </>;
    }

    renderEditor() {
        return <>
            {this.renderHeader('Crear diseño')}
            <main className='appearance-center-body appearance-editor-layout'>
                <div className='appearance-editor-menu'>{EDITOR_SECTIONS.map(([title, detail]) => <button type='button' key={title} onClick={this.props.onOpenAdvanced}><span><b>{title}</b><small>{detail}</small></span><i>›</i></button>)}</div>
                <div className='appearance-editor-preview'><span>Vista previa</span><DesignMockup design={this.props.design} /></div>
            </main>
            <footer className='appearance-action-bar'><button type='button' className='primary' onClick={this.props.onOpenAdvanced}>Abrir editor completo</button></footer>
        </>;
    }

    renderCompare() {
        const { compareDesign } = this.state;
        return <>
            {this.renderHeader('Comparar e importar')}
            <main className='appearance-center-body'>
                <div className='appearance-compare'>
                    <div><b>Tema actual</b><DesignMockup design={this.props.design} /></div>
                    <span><CompareArrowsIcon /></span>
                    <div><b>Diseño alternativo</b><DesignMockup design={compareDesign} /></div>
                </div>
                <select value={compareDesign} onChange={event => this.setState({ compareDesign: event.target.value })}>{SHOWCASE.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
                <div className='appearance-share-actions'><button type='button' onClick={this.props.onOpenAdvanced}><LinkIcon /> Importar enlace</button><button type='button' onClick={this.props.onOpenAdvanced}>⇧ Exportar diseño</button><button type='button' onClick={this.props.onOpenAdvanced}><ShareIcon /> Compartir</button></div>
            </main>
        </>;
    }

    render() {
        if (this.state.view === 'versions') return this.renderVersions();
        if (this.state.view === 'preview') return this.renderPreview();
        if (this.state.view === 'editor') return this.renderEditor();
        if (this.state.view === 'compare') return this.renderCompare();
        return this.renderHome();
    }
}

export { DesignMockup };
export default AppearanceCenter;
