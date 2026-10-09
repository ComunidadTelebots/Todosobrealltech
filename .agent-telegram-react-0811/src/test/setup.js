// GramJS reads localStorage while building its generated API schema. Node 22
// may expose an incomplete experimental localStorage in test workers, so make
// the storage contract explicit before application modules are imported.
if (!globalThis.localStorage || typeof globalThis.localStorage.getItem !== 'function') {
    const values = new Map();
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
            getItem: key => (values.has(String(key)) ? values.get(String(key)) : null),
            setItem: (key, value) => values.set(String(key), String(value)),
            removeItem: key => values.delete(String(key)),
            clear: () => values.clear(),
            key: index => [...values.keys()][index] || null,
            get length() { return values.size; },
        },
    });
}
