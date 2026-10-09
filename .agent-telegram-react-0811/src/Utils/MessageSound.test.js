import {
    INCOMING_SOUND_KEY,
    OUTGOING_SOUND_KEY,
    createMessageTonePlayer,
    readSoundPreference,
    writeSoundPreference,
} from './MessageSound';

describe('MessageSound', () => {
    const storage = new Map();
    const fakeStorage = {
        getItem: key => storage.has(key) ? storage.get(key) : null,
        setItem: (key, value) => storage.set(key, value),
    };

    beforeEach(() => storage.clear());

    it('enables both message sounds by default and persists independent choices', () => {
        expect(readSoundPreference(INCOMING_SOUND_KEY, fakeStorage)).toBe(true);
        expect(readSoundPreference(OUTGOING_SOUND_KEY, fakeStorage)).toBe(true);
        writeSoundPreference(INCOMING_SOUND_KEY, false, fakeStorage);
        expect(readSoundPreference(INCOMING_SOUND_KEY, fakeStorage)).toBe(false);
        expect(readSoundPreference(OUTGOING_SOUND_KEY, fakeStorage)).toBe(true);
    });

    it('keeps the new outgoing tone opt-in for existing users', () => {
        const AudioContext = vi.fn();
        const play = createMessageTonePlayer({
            windowRef: { localStorage: fakeStorage, AudioContext },
        });
        expect(play(true)).toBe(false);
        expect(AudioContext).not.toHaveBeenCalled();
    });

    it('does not allocate audio resources when the selected sound is disabled', () => {
        writeSoundPreference(OUTGOING_SOUND_KEY, false, fakeStorage);
        const AudioContext = vi.fn();
        const play = createMessageTonePlayer({
            windowRef: { localStorage: fakeStorage, AudioContext },
        });
        expect(play(true)).toBe(false);
        expect(AudioContext).not.toHaveBeenCalled();
    });

    it('falls back safely when browser storage is unavailable', () => {
        const blockedStorage = {
            getItem: () => { throw new DOMException('blocked', 'SecurityError'); },
            setItem: () => { throw new DOMException('blocked', 'SecurityError'); },
        };
        expect(readSoundPreference(INCOMING_SOUND_KEY, blockedStorage, true)).toBe(true);
        expect(writeSoundPreference(INCOMING_SOUND_KEY, false, blockedStorage)).toBe(false);
    });

    it('does not fail when Web Audio is unavailable', () => {
        const play = createMessageTonePlayer({
            windowRef: { localStorage: fakeStorage },
        });
        expect(play(false)).toBe(false);
    });
});
