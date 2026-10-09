import React, { Component, createRef } from 'react';
import RotateRightIcon from '@material-ui/icons/RotateRight';
import FlipIcon from '@material-ui/icons/Flip';
import CropIcon from '@material-ui/icons/Crop';
import { cropForAspect, normalizeImageEdits, renderEditedImage } from '../../Utils/ImageTransforms';
import {
    exportCanvasWithPhotoQuality,
    normalizePhotoQuality,
    PHOTO_QUALITY_KEY,
    PHOTO_QUALITY_PROFILES,
} from '../../Utils/PhotoQuality';
import './ImageEditor.css';

const DEFAULT_EDITS = normalizeImageEdits({});
const CROPS = [
    { label: 'Original', aspect: null },
    { label: 'Cuadrado', aspect: 1 },
    { label: '4:3', aspect: 4 / 3 },
    { label: '16:9', aspect: 16 / 9 },
];

class ImageEditor extends Component {
    state = {
        edits: DEFAULT_EDITS,
        busy: false,
        error: '',
        photoQuality: normalizePhotoQuality(localStorage.getItem(PHOTO_QUALITY_KEY)),
    };
    imageRef = createRef();
    canvasRef = createRef();

    componentDidMount() {
        this.draw();
    }
    componentDidUpdate(prevProps, prevState) {
        if (prevProps.file !== this.props.file || prevState.edits !== this.state.edits) this.draw();
    }

    draw = () => {
        const { file } = this.props;
        if (!file) return;
        const image = this.imageRef.current || new Image();
        this.imageRef.current = image;
        const src = URL.createObjectURL(file);
        image.onload = () => {
            URL.revokeObjectURL(src);
            if (this.canvasRef.current) renderEditedImage(image, this.canvasRef.current, this.state.edits);
        };
        image.onerror = () => {
            URL.revokeObjectURL(src);
            this.setState({ error: 'No se pudo abrir la imagen.' });
        };
        image.src = src;
    };

    update = patch => this.setState(({ edits }) => ({ edits: normalizeImageEdits({ ...edits, ...patch }) }));

    setAspect = aspect => {
        const image = this.imageRef.current;
        this.update({ crop: cropForAspect(image?.naturalWidth, image?.naturalHeight, aspect) });
    };

    save = async () => {
        this.setState({ busy: true, error: '' });
        try {
            const file = await exportCanvasWithPhotoQuality(
                this.canvasRef.current,
                this.props.file,
                this.state.photoQuality,
            );
            this.props.onDone(file);
        } catch (error) {
            this.setState({ busy: false, error: error.message });
        }
    };

    render() {
        const { onCancel } = this.props;
        const { edits, busy, error, photoQuality } = this.state;
        return (
            <div className='image-editor-backdrop' role='dialog' aria-modal='true' aria-label='Editor multimedia'>
                <div className='image-editor'>
                    <canvas ref={this.canvasRef} className='image-editor-preview' />
                    <div className='image-editor-tools'>
                        <button onClick={() => this.update({ rotation: edits.rotation + 90 })}>
                            <RotateRightIcon /> Girar
                        </button>
                        <button onClick={() => this.update({ flipX: !edits.flipX })}>
                            <FlipIcon /> Voltear
                        </button>
                        <button onClick={() => this.setState({ edits: DEFAULT_EDITS })}>Restablecer</button>
                    </div>
                    <div className='image-editor-crops'>
                        <CropIcon />
                        {CROPS.map(item => (
                            <button key={item.label} onClick={() => this.setAspect(item.aspect)}>
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <label>
                        Brillo{' '}
                        <input
                            type='range'
                            min='25'
                            max='175'
                            value={edits.brightness}
                            onChange={e => this.update({ brightness: e.target.value })}
                        />
                    </label>
                    <label>
                        Contraste{' '}
                        <input
                            type='range'
                            min='25'
                            max='175'
                            value={edits.contrast}
                            onChange={e => this.update({ contrast: e.target.value })}
                        />
                    </label>
                    <label>
                        Calidad
                        <select
                            className='image-editor-quality'
                            value={photoQuality}
                            onChange={event => {
                                const value = normalizePhotoQuality(event.target.value);
                                localStorage.setItem(PHOTO_QUALITY_KEY, value);
                                this.setState({ photoQuality: value });
                            }}
                        >
                            {PHOTO_QUALITY_PROFILES.map(profile => (
                                <option key={profile.id} value={profile.id}>
                                    {profile.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    {error && <div className='image-editor-error'>{error}</div>}
                    <div className='image-editor-actions'>
                        <button onClick={onCancel} disabled={busy}>
                            Cancelar
                        </button>
                        <button className='image-editor-save' onClick={this.save} disabled={busy}>
                            {busy ? 'Procesando…' : 'Aplicar cambios'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

export default ImageEditor;
