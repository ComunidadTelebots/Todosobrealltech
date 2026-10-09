export const LIVE_LOCATION_PERIODS = Object.freeze([
    { value: 900, label: '15 minutos' },
    { value: 3600, label: '1 hora' },
    { value: 28800, label: '8 horas' },
]);

export function getLiveLocationMessageId(result) {
    const updates = result?.updates?.updates || result?.updates || [];
    const sentUpdate = Array.isArray(updates) ? updates.find(update => update?.message?.id || update?.id) : null;
    return sentUpdate?.message?.id || sentUpdate?.id || result?.message_id || null;
}
