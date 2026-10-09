import {
    acceptGroupCallUpdate,
    isTransientGroupCallError,
    resetGroupCallMessageSyncForTests,
    runGroupCallOperation,
    setGroupCallSyncActive,
} from './GroupCallMessageSync';

describe('GroupCallMessageSync', () => {
    beforeEach(() => resetGroupCallMessageSyncForTests());

    it('does not retry operations outside a group call', async () => {
        const operation = vi.fn().mockRejectedValue(new Error('network timeout'));
        await expect(runGroupCallOperation('message:1', operation, { retryDelays: [] })).rejects.toThrow();
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries transient failures with a bounded policy during a group call', async () => {
        setGroupCallSyncActive(true);
        const operation = vi.fn()
            .mockRejectedValueOnce(new Error('network timeout'))
            .mockResolvedValue({ ok: true });
        await expect(runGroupCallOperation('message:2', operation, { retryDelays: [0, 0] })).resolves.toEqual({ ok: true });
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it('deduplicates concurrent operations with the same delivery key', async () => {
        setGroupCallSyncActive(true);
        let resolve;
        const operation = vi.fn(() => new Promise(done => { resolve = done; }));
        const first = runGroupCallOperation('reaction:1', operation);
        const second = runGroupCallOperation('reaction:1', operation);
        expect(first).toBe(second);
        resolve('sent');
        await expect(first).resolves.toBe('sent');
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('deduplicates repeated message and reaction updates only while a call is active', () => {
        setGroupCallSyncActive(true);
        expect(acceptGroupCallUpdate('message:1', 1000, 10)).toBe(true);
        expect(acceptGroupCallUpdate('message:1', 1000, 20)).toBe(false);
        expect(acceptGroupCallUpdate('message:1', 1000, 1011)).toBe(true);
        setGroupCallSyncActive(false);
        expect(acceptGroupCallUpdate('message:1', 1000, 1020)).toBe(true);
        expect(acceptGroupCallUpdate('message:1', 1000, 1030)).toBe(true);
    });

    it('does not retry permanent Telegram errors', async () => {
        setGroupCallSyncActive(true);
        const operation = vi.fn().mockRejectedValue(new Error('CHAT_WRITE_FORBIDDEN'));
        await expect(runGroupCallOperation('message:3', operation, { retryDelays: [0, 0] })).rejects.toThrow();
        expect(operation).toHaveBeenCalledTimes(1);
        expect(isTransientGroupCallError({ code: 503 })).toBe(true);
        expect(isTransientGroupCallError({ code: 429, message: 'FLOOD_WAIT_30' })).toBe(false);
    });
});
