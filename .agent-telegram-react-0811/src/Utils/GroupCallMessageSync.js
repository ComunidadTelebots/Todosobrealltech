const DEFAULT_RETRY_DELAYS = [120, 350, 800];
const TRANSIENT_ERROR_PATTERN =
    /(?:timeout|timed out|network|connection|disconnect|temporar|rpc_call_fail|server_error|503|502|500)/i;

let groupCallActive = false;
const inFlightOperations = new Map();
const recentUpdates = new Map();

export const setGroupCallSyncActive = active => {
    groupCallActive = !!active;
    if (!groupCallActive) recentUpdates.clear();
};

export const isGroupCallSyncActive = () => groupCallActive;

export const isTransientGroupCallError = error => {
    const code = Number(error?.code || error?.error_code || 0);
    // FLOOD_WAIT/429 requires the server-provided delay and must never be retried
    // with this short transport policy.
    if (code >= 500 || code === 408) return true;
    return TRANSIENT_ERROR_PATTERN.test(String(error?.errorMessage || error?.message || error || ''));
};

const wait = delay => new Promise(resolve => setTimeout(resolve, delay));

export const runGroupCallOperation = (key, operation, options = {}) => {
    if (!groupCallActive) return operation();
    if (inFlightOperations.has(key)) return inFlightOperations.get(key);

    const retryDelays = options.retryDelays || DEFAULT_RETRY_DELAYS;
    const promise = (async () => {
        let lastError;
        for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (!isTransientGroupCallError(error) || attempt === retryDelays.length) throw error;
                await wait(retryDelays[attempt]);
            }
        }
        throw lastError;
    })().finally(() => inFlightOperations.delete(key));

    inFlightOperations.set(key, promise);
    return promise;
};

export const acceptGroupCallUpdate = (key, ttl = 30000, now = Date.now()) => {
    if (!groupCallActive) return true;
    const expiresAt = recentUpdates.get(key) || 0;
    if (expiresAt > now) return false;
    recentUpdates.set(key, now + ttl);
    if (recentUpdates.size > 1000) {
        recentUpdates.forEach((expires, updateKey) => {
            if (expires <= now) recentUpdates.delete(updateKey);
        });
    }
    return true;
};

export const resetGroupCallMessageSyncForTests = () => {
    groupCallActive = false;
    inFlightOperations.clear();
    recentUpdates.clear();
};
