import { describe, expect, it } from 'vitest';
import { getLiveLocationMessageId, LIVE_LOCATION_PERIODS } from './LiveLocation';

describe('live location helpers', () => {
    it('extracts a GramJS updateNewMessage id', () => {
        expect(
            getLiveLocationMessageId({
                updates: { updates: [{ className: 'UpdateNewMessage', message: { id: 731 } }] },
            }),
        ).toBe(731);
    });

    it('supports direct and compatibility response shapes', () => {
        expect(getLiveLocationMessageId({ updates: [{ id: 91 }] })).toBe(91);
        expect(getLiveLocationMessageId({ message_id: 18 })).toBe(18);
        expect(getLiveLocationMessageId({ updates: { updates: [] } })).toBeNull();
    });

    it('offers only Telegram-compatible bounded periods', () => {
        expect(LIVE_LOCATION_PERIODS.map(period => period.value)).toEqual([900, 3600, 28800]);
    });
});
