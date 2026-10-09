export const normalizeCrop = crop => {
    const x = Math.max(0, Math.min(0.99, Number(crop?.x) || 0));
    const y = Math.max(0, Math.min(0.99, Number(crop?.y) || 0));
    return {
        x,
        y,
        width: Math.max(0.01, Math.min(1 - x, Number(crop?.width) || 1)),
        height: Math.max(0.01, Math.min(1 - y, Number(crop?.height) || 1)),
    };
};

export const cropForAspect = (width, height, aspect) => {
    if (!width || !height || !aspect) return normalizeCrop({});
    const sourceAspect = width / height;
    if (sourceAspect > aspect) {
        const cropWidth = aspect / sourceAspect;
        return normalizeCrop({ x: (1 - cropWidth) / 2, y: 0, width: cropWidth, height: 1 });
    }
    const cropHeight = sourceAspect / aspect;
    return normalizeCrop({ x: 0, y: (1 - cropHeight) / 2, width: 1, height: cropHeight });
};

export const normalizeImageEdits = edits => ({
    rotation: ((Number(edits?.rotation) || 0) % 360 + 360) % 360,
    flipX: Boolean(edits?.flipX),
    flipY: Boolean(edits?.flipY),
    brightness: Math.max(25, Math.min(175, Number(edits?.brightness) || 100)),
    contrast: Math.max(25, Math.min(175, Number(edits?.contrast) || 100)),
    crop: normalizeCrop(edits?.crop),
});

export const getOutputSize = (width, height, edits) => {
    const normalized = normalizeImageEdits(edits);
    const croppedWidth = Math.max(1, Math.round(width * normalized.crop.width));
    const croppedHeight = Math.max(1, Math.round(height * normalized.crop.height));
    const swapsAxes = normalized.rotation === 90 || normalized.rotation === 270;
    return swapsAxes
        ? { width: croppedHeight, height: croppedWidth }
        : { width: croppedWidth, height: croppedHeight };
};

export const renderEditedImage = (image, canvas, edits = {}) => {
    const normalized = normalizeImageEdits(edits);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const sx = Math.round(sourceWidth * normalized.crop.x);
    const sy = Math.round(sourceHeight * normalized.crop.y);
    const sw = Math.min(sourceWidth - sx, Math.round(sourceWidth * normalized.crop.width));
    const sh = Math.min(sourceHeight - sy, Math.round(sourceHeight * normalized.crop.height));
    const output = getOutputSize(sourceWidth, sourceHeight, normalized);
    canvas.width = output.width;
    canvas.height = output.height;

    const context = canvas.getContext('2d');
    context.save();
    context.filter = `brightness(${normalized.brightness}%) contrast(${normalized.contrast}%)`;
    context.translate(output.width / 2, output.height / 2);
    context.rotate((normalized.rotation * Math.PI) / 180);
    context.scale(normalized.flipX ? -1 : 1, normalized.flipY ? -1 : 1);
    context.drawImage(image, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
    context.restore();
    return output;
};

export const canvasToFile = (canvas, originalFile, quality = 0.92) =>
    new Promise((resolve, reject) => {
        const type = originalFile?.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('No se pudo procesar la imagen.'));
                return;
            }
            const baseName = (originalFile?.name || 'imagen').replace(/\.[^.]+$/, '');
            resolve(new File([blob], `${baseName}-editada.${type === 'image/png' ? 'png' : 'jpg'}`, { type }));
        }, type, quality);
    });
