import { describe, expect, it } from 'vitest';
import { resolveNotificationTarget } from './NotificationUrl';

describe('resolveNotificationTarget', () => {
    const origin = 'https://telegram.example';

    it('keeps relative and same-origin notification routes', () => {
        expect(resolveNotificationTarget('/chat/42?message=9', origin)).toBe(
            'https://telegram.example/chat/42?message=9',
        );
        expect(resolveNotificationTarget('https://telegram.example/settings', origin)).toBe(
            'https://telegram.example/settings',
        );
    });

    it('rejects external, credentialed and active-content destinations', () => {
        expect(resolveNotificationTarget('https://phishing.example/login', origin)).toBe(`${origin}/`);
        expect(resolveNotificationTarget('javascript:alert(1)', origin)).toBe(`${origin}/`);
        expect(resolveNotificationTarget('data:text/html,unsafe', origin)).toBe(`${origin}/`);
    });

    it('falls back safely for malformed input', () => {
        expect(resolveNotificationTarget('http://[', origin)).toBe(`${origin}/`);
    });
});
