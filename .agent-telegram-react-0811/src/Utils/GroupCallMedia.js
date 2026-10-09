const toSource = value => {
    const source = Number(value) >>> 0;
    return source || 0;
};

export const normalizeSourceGroups = groups =>
    (groups || [])
        .map(group => ({
            semantics: String(group?.semantics || '').toUpperCase(),
            sources: (group?.sources || []).map(toSource).filter(Boolean),
        }))
        .filter(group => group.semantics && group.sources.length);

export const normalizeParticipantVideo = (video, participantId, presentation = false) => {
    if (!video?.endpoint) return null;
    const sourceGroups = normalizeSourceGroups(video.sourceGroups || video.source_groups);
    if (!sourceGroups.length) return null;
    return {
        participant_id: String(participantId || ''),
        endpoint: String(video.endpoint),
        paused: !!video.paused,
        presentation: !!presentation,
        audio_source: toSource(video.audioSource ?? video.audio_source),
        source_groups: sourceGroups,
    };
};

export const videoSourcesSignature = videos =>
    (videos || [])
        .map(video => `${video.endpoint}:${video.paused ? 1 : 0}:${video.source_groups
            .map(group => `${group.semantics}=${group.sources.join('.')}`)
            .join('|')}`)
        .sort()
        .join(',');

