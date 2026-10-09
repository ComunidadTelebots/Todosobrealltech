export const MAX_STORY_ALBUM_ITEMS = 20;

export const isStoryMedia = file => Boolean(
    file && (file.type?.startsWith('image/') || file.type?.startsWith('video/')),
);

export const addStoryItems = (items, files, createUrl = file => URL.createObjectURL(file)) => {
    const accepted = Array.from(files || []).filter(isStoryMedia);
    const available = Math.max(0, MAX_STORY_ALBUM_ITEMS - items.length);
    return items.concat(accepted.slice(0, available).map((file, index) => ({
        id: `${Date.now()}-${items.length + index}-${file.name || 'story'}`,
        file,
        previewSrc: createUrl(file),
        caption: '',
    })));
};

export const moveStoryItem = (items, from, to) => {
    if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return items;
    const next = items.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
};

export const removeStoryItem = (items, index) => items.filter((_, itemIndex) => itemIndex !== index);

export const remainingStoryItems = (items, publishedCount) => items.slice(
    Math.max(0, Math.min(items.length, Number(publishedCount) || 0)),
);

export const toStoryAlbumPayload = items => items.map(item => ({
    file: item.file,
    caption: (item.caption || '').slice(0, 2048),
}));
