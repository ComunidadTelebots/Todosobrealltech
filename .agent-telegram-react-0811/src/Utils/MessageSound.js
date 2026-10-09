export const INCOMING_SOUND_KEY = 'tg_sound_incoming';
export const OUTGOING_SOUND_KEY = 'tg_sound_outgoing';

export function readSoundPreference(key, storage = window.localStorage, fallback = true) {
    try {
        const value = storage.getItem(key);
        return value === null ? fallback : value === '1';
    } catch (error) {
        return fallback;
    }
}

export function writeSoundPreference(key, enabled, storage = window.localStorage) {
    try {
        storage.setItem(key, enabled ? '1' : '0');
        return true;
    } catch (error) {
        return false;
    }
}

export function createMessageTonePlayer({ windowRef = window, minimumInterval = 120 } = {}) {
    const lastPlayedAt = { incoming: 0, outgoing: 0 };
    return function playMessageTone(outgoing = false) {
        const key = outgoing ? OUTGOING_SOUND_KEY : INCOMING_SOUND_KEY;
        if (!readSoundPreference(key, windowRef.localStorage, !outgoing)) return false;
        const now = Date.now();
        const direction = outgoing ? 'outgoing' : 'incoming';
        if (now - lastPlayedAt[direction] < minimumInterval) return false;
        const AudioContext = windowRef.AudioContext || windowRef.webkitAudioContext;
        if (!AudioContext) return false;
        try {
            const context = new AudioContext();
            if (context.state === 'suspended' && context.resume) context.resume().catch(() => {});
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = outgoing ? 660 : 520;
            gain.gain.setValueAtTime(0.0001, context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
            oscillator.connect(gain).connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.13);
            let closed = false;
            const close = () => {
                if (closed) return;
                closed = true;
                Promise.resolve(context.close()).catch(() => {});
            };
            oscillator.addEventListener('ended', close, { once: true });
            windowRef.setTimeout(close, 1000);
            lastPlayedAt[direction] = now;
            return true;
        } catch (error) {
            return false;
        }
    };
}
