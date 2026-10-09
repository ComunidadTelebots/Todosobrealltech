import { newestDesignVersionsFirst } from '../../Utils/DesignVersionOrder';

describe('DesignVersionSelector ordering', () => {
    it('shows the newest version first without mutating the registry', () => {
        const versions = [{ value: '2013' }, { value: '2016' }, { value: '2026' }];

        expect(newestDesignVersionsFirst(versions).map(item => item.value)).toEqual(['2026', '2016', '2013']);
        expect(versions.map(item => item.value)).toEqual(['2013', '2016', '2026']);
    });
});
