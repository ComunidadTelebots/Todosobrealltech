import React, { Component, createRef } from 'react';
import CloseIcon from '@material-ui/icons/Close';
import PhotoCameraIcon from '@material-ui/icons/PhotoCamera';
import SendIcon from '@material-ui/icons/Send';
import DeleteIcon from '@material-ui/icons/Delete';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import EditIcon from '@material-ui/icons/Edit';
import TdLibController from '../../Controllers/TdLibController';
import ImageEditor from '../Additional/ImageEditor';
import { addStoryItems, moveStoryItem, remainingStoryItems, removeStoryItem, toStoryAlbumPayload } from '../../Utils/StoryAlbum';
import './StoryComposer.css';

const PRIVACY_OPTIONS = [
    { value: 'everyone', label: 'Todos' },
    { value: 'contacts', label: 'Contactos' },
    { value: 'close_friends', label: 'Amigos cercanos' },
];
const PERIOD_OPTIONS = [
    { value: 21600, label: '6 horas' }, { value: 43200, label: '12 horas' },
    { value: 86400, label: '24 horas' }, { value: 172800, label: '48 horas' },
];

class StoryComposer extends Component {
    state = { items: [], activeIndex: 0, privacy: 'everyone', period: 86400, sending: false, progress: null, error: '', editorFile: null };
    _fileRef = createRef();

    _onFileChange = event => {
        const selected = Array.from(event.target.files || []);
        const invalid = selected.some(file => !file.type.startsWith('image/') && !file.type.startsWith('video/'));
        this.setState(({ items }) => ({
            items: addStoryItems(items, selected),
            activeIndex: items.length ? this.state.activeIndex : 0,
            error: invalid ? 'Se omitieron archivos que no eran imágenes o vídeos.' : '',
        }));
        event.target.value = '';
    };

    _updateActive = patch => this.setState(({ items, activeIndex }) => ({
        items: items.map((item, index) => index === activeIndex ? { ...item, ...patch } : item),
    }));

    _removeActive = () => this.setState(({ items, activeIndex }) => {
        const item = items[activeIndex];
        if (item?.previewSrc) URL.revokeObjectURL(item.previewSrc);
        const next = removeStoryItem(items, activeIndex);
        return { items: next, activeIndex: Math.max(0, Math.min(activeIndex, next.length - 1)) };
    });

    _move = direction => this.setState(({ items, activeIndex }) => {
        const target = activeIndex + direction;
        if (target < 0 || target >= items.length) return null;
        return { items: moveStoryItem(items, activeIndex, target), activeIndex: target };
    });

    _editActive = () => {
        const item = this.state.items[this.state.activeIndex];
        if (item?.file.type.startsWith('image/')) this.setState({ editorFile: item.file });
    };

    _onEditorDone = file => {
        const current = this.state.items[this.state.activeIndex];
        if (current?.previewSrc) URL.revokeObjectURL(current.previewSrc);
        this._updateActive({ file, previewSrc: URL.createObjectURL(file) });
        this.setState({ editorFile: null });
    };

    _onSend = async () => {
        const { items, privacy, period } = this.state;
        if (!items.length) return this.setState({ error: 'Selecciona una foto o vídeo.' });
        this.setState({ sending: true, progress: { completed: 0, total: items.length }, error: '' });
        try {
            await TdLibController.send({
                '@type': 'sendStoryAlbum', items: toStoryAlbumPayload(items), privacy, period,
                onProgress: progress => this.setState({ progress }),
            });
            this.props.onClose();
        } catch (error) {
            const completed = error.storyAlbumResult?.published?.length || 0;
            if (completed) this.state.items.slice(0, completed).forEach(item => item.previewSrc && URL.revokeObjectURL(item.previewSrc));
            this.setState(({ items }) => ({
                items: remainingStoryItems(items, completed), activeIndex: 0, sending: false, progress: null,
                error: completed ? `${completed} publicadas. Solo quedan en el editor las que no se enviaron.` : (error.message || 'Error al publicar.'),
            }));
        }
    };

    _onBackdropClick = event => {
        if (!this.state.sending && event.target === event.currentTarget) this.props.onClose();
    };

    componentWillUnmount() { this.state.items.forEach(item => item.previewSrc && URL.revokeObjectURL(item.previewSrc)); }

    render() {
        const { items, activeIndex, privacy, period, sending, progress, error, editorFile } = this.state;
        const active = items[activeIndex];
        const isVideo = active?.file?.type?.startsWith('video/');
        return (
            <div className='story-composer-backdrop' onClick={this._onBackdropClick}>
                <div className='story-composer'>
                    <div className='story-composer-header'><span className='story-composer-title'>{items.length > 1 ? `Álbum · ${activeIndex + 1}/${items.length}` : 'Nueva historia'}</span><button className='story-composer-close' onClick={this.props.onClose} disabled={sending}><CloseIcon /></button></div>
                    <div className='story-composer-preview' onClick={() => !active && this._fileRef.current?.click()}>
                        {active && isVideo ? <video className='story-composer-media' src={active.previewSrc} controls playsInline /> : active ? <img className='story-composer-media' src={active.previewSrc} alt='' /> : <div className='story-composer-placeholder'><PhotoCameraIcon className='story-composer-placeholder-icon' /><span>Añade hasta 20 fotos o vídeos</span></div>}
                    </div>
                    {items.length > 0 && <div className='story-composer-album'>{items.map((item, index) => <button key={item.id} className={`story-composer-thumb${index === activeIndex ? ' story-composer-thumb--active' : ''}`} onClick={() => this.setState({ activeIndex: index })}>{item.file.type.startsWith('video/') ? <video src={item.previewSrc} muted /> : <img src={item.previewSrc} alt='' />}<span>{index + 1}</span></button>)}<button className='story-composer-add' onClick={() => this._fileRef.current?.click()}>+</button></div>}
                    <input ref={this._fileRef} type='file' accept='image/*,video/*' multiple hidden onChange={this._onFileChange} />
                    {active && <div className='story-composer-toolbar'><button onClick={() => this._move(-1)} disabled={activeIndex === 0 || sending}><ArrowBackIcon /> Antes</button>{!isVideo && <button onClick={this._editActive} disabled={sending}><EditIcon /> Editar</button>}<button onClick={this._removeActive} disabled={sending}><DeleteIcon /> Quitar</button><button onClick={() => this._move(1)} disabled={activeIndex === items.length - 1 || sending}>Después <ArrowForwardIcon /></button></div>}
                    {active && <div className='story-composer-field'><textarea className='story-composer-caption' placeholder={`Texto de la historia ${activeIndex + 1}…`} value={active.caption} maxLength={2048} rows={3} onChange={event => this._updateActive({ caption: event.target.value })} disabled={sending} /><small>{active.caption.length}/2048</small></div>}
                    <div className='story-composer-field'><label className='story-composer-label'>Privacidad del álbum</label><div className='story-composer-options'>{PRIVACY_OPTIONS.map(option => <button key={option.value} className={`story-composer-option${privacy === option.value ? ' story-composer-option--active' : ''}`} onClick={() => this.setState({ privacy: option.value })} disabled={sending}>{option.label}</button>)}</div></div>
                    <div className='story-composer-field'><label className='story-composer-label'>Duración</label><div className='story-composer-options'>{PERIOD_OPTIONS.map(option => <button key={option.value} className={`story-composer-option${period === option.value ? ' story-composer-option--active' : ''}`} onClick={() => this.setState({ period: option.value })} disabled={sending}>{option.label}</button>)}</div></div>
                    {error && <div className='story-composer-error'>{error}</div>}
                    <button className='story-composer-send' onClick={this._onSend} disabled={sending || !items.length}><SendIcon style={{ fontSize: 18, marginRight: 6 }} />{sending ? `Publicando ${progress?.completed || 0}/${progress?.total || items.length}…` : items.length > 1 ? `Publicar ${items.length} historias` : 'Publicar historia'}</button>
                    {editorFile && <ImageEditor file={editorFile} onDone={this._onEditorDone} onCancel={() => this.setState({ editorFile: null })} />}
                </div>
            </div>
        );
    }
}
export default StoryComposer;
