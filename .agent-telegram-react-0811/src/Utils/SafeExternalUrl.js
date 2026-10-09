export function getSafeHttpUrl(value, base) {
    try {
        const url = new URL(String(value || '').trim(), base);
        if (!['http:', 'https:'].includes(url.protocol)) return null;
        url.username = '';
        url.password = '';
        return url.href;
    } catch {
        return null;
    }
}
