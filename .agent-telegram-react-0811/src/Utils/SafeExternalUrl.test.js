import { describe, expect, it } from 'vitest';
import { getSafeHttpUrl } from './SafeExternalUrl';

describe('getSafeHttpUrl', () => {
    it('accepts only HTTP(S) and removes embedded credentials', () => {
        expect(getSafeHttpUrl('https://user:pass@example.com/article')).toBe('https://example.com/article');
        expect(getSafeHttpUrl('http://example.com')).toBe('http://example.com/');
        expect(getSafeHttpUrl('/article', 'https://example.com')).toBe('https://example.com/article');
    });

    it('rejects active-content and malformed URLs', () => {
        expect(getSafeHttpUrl('javascript:alert(1)')).toBeNull();
        expect(getSafeHttpUrl('data:text/html,unsafe')).toBeNull();
        expect(getSafeHttpUrl('http://[')).toBeNull();
    });
});
