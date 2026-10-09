import { HISTORICAL_FAMILIES, SHOWCASE } from './AppearanceCatalog';

describe('appearance catalog', () => {
    test('keeps every requested visual design available', () => {
        expect(SHOWCASE.map(item => item.label)).toEqual([
            'Android', 'Android Nuevo', 'Android Glass', 'Web', 'Webogram', 'iOS',
            'macOS', 'Desktop', 'Windows', 'Telegram X', 'Aurora',
        ]);
    });

    test('tracks the families with historical selectors', () => {
        expect(HISTORICAL_FAMILIES).toContain('android');
        expect(HISTORICAL_FAMILIES).toContain('ios');
        expect(HISTORICAL_FAMILIES).toContain('telegramx');
    });
});
