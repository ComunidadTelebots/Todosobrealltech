import { describe, expect, it, vi } from 'vitest';
import { addStoryItems, MAX_STORY_ALBUM_ITEMS, moveStoryItem, remainingStoryItems, removeStoryItem, toStoryAlbumPayload } from './StoryAlbum';

const file = (name, type = 'image/jpeg') => ({ name, type });

describe('StoryAlbum', () => {
    it('accepts only story media and enforces the album limit', () => {
        const files = Array.from({ length: 25 }, (_, i) => file(`${i}.jpg`));
        files.unshift(file('bad.txt', 'text/plain'));
        const createUrl = vi.fn(value => `blob:${value.name}`);
        const result = addStoryItems([], files, createUrl);
        expect(result).toHaveLength(MAX_STORY_ALBUM_ITEMS);
        expect(createUrl).toHaveBeenCalledTimes(MAX_STORY_ALBUM_ITEMS);
    });

    it('reorders and removes entries without mutating the source', () => {
        const source = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
        expect(moveStoryItem(source, 2, 0).map(x => x.id)).toEqual(['c', 'a', 'b']);
        expect(removeStoryItem(source, 1).map(x => x.id)).toEqual(['a', 'c']);
        expect(source.map(x => x.id)).toEqual(['a', 'b', 'c']);
    });

    it('builds a safe publication payload', () => {
        const longCaption = 'x'.repeat(3000);
        const payload = toStoryAlbumPayload([{ file: file('one.jpg'), caption: longCaption }]);
        expect(payload[0].caption).toHaveLength(2048);
        expect(payload[0].file.name).toBe('one.jpg');
    });

    it('keeps only unpublished entries after a partial failure', () => {
        const source = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
        expect(remainingStoryItems(source, 2).map(x => x.id)).toEqual(['c']);
        expect(remainingStoryItems(source, 99)).toEqual([]);
    });
});
