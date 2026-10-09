import { normalizeParticipantVideo, normalizeSourceGroups, videoSourcesSignature } from './GroupCallMedia';

describe('GroupCallMedia', () => {
    it('normalizes Telegram SIM/FID source groups without signed SSRC values', () => {
        expect(
            normalizeSourceGroups([
                { semantics: 'sim', sources: [-1, 2, 0] },
                { semantics: 'FID', sources: [3, 4] },
            ]),
        ).toEqual([
            { semantics: 'SIM', sources: [4294967295, 2] },
            { semantics: 'FID', sources: [3, 4] },
        ]);
    });

    it('keeps endpoint, participant and presentation metadata', () => {
        expect(
            normalizeParticipantVideo(
                { endpoint: 'camera-1', paused: true, sourceGroups: [{ semantics: 'FID', sources: [10, 11] }] },
                '42',
                true,
            ),
        ).toMatchObject({
            endpoint: 'camera-1', participant_id: '42', paused: true, presentation: true,
        });
    });

    it('creates a stable signature independent of participant order', () => {
        const first = { endpoint: 'a', paused: false, source_groups: [{ semantics: 'FID', sources: [1, 2] }] };
        const second = { endpoint: 'b', paused: true, source_groups: [{ semantics: 'SIM', sources: [3, 4] }] };
        expect(videoSourcesSignature([first, second])).toBe(videoSourcesSignature([second, first]));
    });
});
