import { canvasToFile } from './ImageTransforms';

export const PHOTO_QUALITY_KEY = 'tg_photo_send_quality';
export const PHOTO_QUALITY_PROFILES = [
    { id: 'original', label: 'Original', maxDimension: null, quality: 0.92 },
    { id: 'high', label: 'Alta', maxDimension: 2560, quality: 0.9 },
    { id: 'balanced', label: 'Equilibrada', maxDimension: 1920, quality: 0.82 },
    { id: 'data', label: 'Ahorro de datos', maxDimension: 1280, quality: 0.7 },
];

export function normalizePhotoQuality(value) {
    return PHOTO_QUALITY_PROFILES.some(profile => profile.id === value) ? value : 'original';
}

export function getPhotoOutputSize(width, height, profileId) {
    const profile = PHOTO_QUALITY_PROFILES.find(item => item.id === normalizePhotoQuality(profileId));
    const max = profile.maxDimension;
    if (!max || Math.max(width, height) <= max) return { width, height };
    const scale = max / Math.max(width, height);
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function exportCanvasWithPhotoQuality(canvas, originalFile, profileId) {
    const profile = PHOTO_QUALITY_PROFILES.find(item => item.id === normalizePhotoQuality(profileId));
    if (profile.id === 'original') return canvasToFile(canvas, originalFile);
    const size = getPhotoOutputSize(canvas.width, canvas.height, profile.id);
    const output = document.createElement('canvas');
    output.width = size.width;
    output.height = size.height;
    const context = output.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(canvas, 0, 0, size.width, size.height);
    return canvasToFile(output, { name: originalFile?.name, type: 'image/jpeg' }, profile.quality);
}

export async function preparePhotoForSend(file, profileId) {
    const profile = normalizePhotoQuality(profileId);
    if (profile === 'original' || !file?.type?.startsWith('image/') || file.type === 'image/gif') return file;
    const image = new Image();
    const url = URL.createObjectURL(file);
    try {
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () => reject(new Error('No se pudo preparar la imagen.'));
            image.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        canvas.getContext('2d').drawImage(image, 0, 0);
        return exportCanvasWithPhotoQuality(canvas, file, profile);
    } finally {
        URL.revokeObjectURL(url);
    }
}
