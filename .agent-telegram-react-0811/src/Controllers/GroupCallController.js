import { EventEmitter } from 'events';
import TdLibController from './TdLibController';
import { videoSourcesSignature } from '../Utils/GroupCallMedia';
import { setGroupCallSyncActive } from '../Utils/GroupCallMessageSync';

const initialState = {
    status: 'idle',
    muted: true,
    error: '',
    remoteStream: null,
    remoteVideoStreams: {},
    presenting: false,
    presentationStream: null,
    presentationKind: null,
};

const waitForIceGathering = pc =>
    new Promise(resolve => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const finish = () => {
            pc.removeEventListener('icegatheringstatechange', onChange);
            clearTimeout(timer);
            resolve();
        };
        const onChange = () => pc.iceGatheringState === 'complete' && finish();
        const timer = setTimeout(finish, 8000);
        pc.addEventListener('icegatheringstatechange', onChange);
    });

const readSdpValue = (sdp, prefix, required = true) => {
    const line = sdp.split(/\r?\n/).find(value => value.startsWith(prefix));
    if (!line && required) throw new Error(`La oferta WebRTC no contiene ${prefix}`);
    return line ? line.slice(prefix.length) : '';
};

const offerToJoinPayload = sdp => {
    const fingerprint = readSdpValue(sdp, 'a=fingerprint:').split(/\s+/);
    const rawSsrc = readSdpValue(sdp, 'a=ssrc:', false);
    const ssrc = rawSsrc ? Number(rawSsrc.split(/\s+/)[0]) : 0;
    if (!Number.isInteger(ssrc) || ssrc === 0) throw new Error('No se pudo generar un SSRC de audio válido');
    const groups = sdp
        .split(/\r?\n/)
        .filter(line => line.startsWith('a=ssrc-group:'))
        .map(line => {
            const [semantics, ...sources] = line
                .slice('a=ssrc-group:'.length)
                .trim()
                .split(/\s+/);
            return { semantics, sources: sources.map(Number).filter(Number.isInteger) };
        })
        .filter(group => group.semantics && group.sources.length);
    return {
        fingerprints: [{ hash: fingerprint[0], fingerprint: fingerprint[1], setup: 'active' }],
        pwd: readSdpValue(sdp, 'a=ice-pwd:'),
        ssrc,
        'ssrc-groups': groups,
        ufrag: readSdpValue(sdp, 'a=ice-ufrag:'),
    };
};

const buildPresentationAnswer = (localSdp, payload) => {
    const transport = payload.transport || payload;
    if (!transport.ufrag || !transport.pwd || !transport.fingerprints?.length) {
        throw new Error('Telegram no devolviÃ³ parÃ¡metros WebRTC para la presentaciÃ³n');
    }
    const section = localSdp.split(/(?=m=)/).find(value => value.startsWith('m=video'));
    if (!section) throw new Error('La oferta no contiene una pista de vÃ­deo');
    const lines = section.split(/\r?\n/).filter(Boolean);
    const media = lines[0];
    const mid = (lines.find(line => line.startsWith('a=mid:')) || 'a=mid:0').slice('a=mid:'.length);
    const codecs = lines.filter(line => /^(a=rtpmap:|a=fmtp:|a=rtcp-fb:|a=extmap:)/.test(line));
    const candidates = (transport.candidates || []).map(candidateLine);
    const fingerprints = transport.fingerprints.map(
        fingerprint => `a=fingerprint:${fingerprint.hash || 'sha-256'} ${fingerprint.fingerprint}`,
    );
    return [
        'v=0',
        `o=- ${Date.now()} 2 IN IP4 0.0.0.0`,
        's=-',
        't=0 0',
        `a=group:BUNDLE ${mid}`,
        'a=ice-lite',
        media.replace(/m=video\s+\d+/, 'm=video 1'),
        'c=IN IP4 0.0.0.0',
        `a=mid:${mid}`,
        `a=ice-ufrag:${transport.ufrag}`,
        `a=ice-pwd:${transport.pwd}`,
        ...fingerprints,
        'a=setup:passive',
        ...candidates,
        ...codecs,
        'a=rtcp:1 IN IP4 0.0.0.0',
        'a=rtcp-mux',
        'a=recvonly',
        '',
    ].join('\r\n');
};

const candidateLine = candidate => {
    const protocol = String(candidate.protocol || 'udp').toUpperCase();
    const generation = candidate.generation == null ? 0 : candidate.generation;
    return `a=candidate:${candidate.foundation} ${candidate.component} ${protocol} ${candidate.priority} ${candidate.ip} ${candidate.port} typ ${candidate.type} generation ${generation}`;
};

const buildRemoteAnswer = payload => {
    const transport = payload.transport || payload;
    if (!transport.ufrag || !transport.pwd || !transport.fingerprints?.length) {
        throw new Error('Telegram no devolvió parámetros WebRTC válidos');
    }
    const candidates = (transport.candidates || []).map(candidateLine).join('\r\n');
    const fingerprint = transport.fingerprints[0];
    return `v=0\r
o=- ${Date.now()} 2 IN IP4 0.0.0.0\r
s=-\r
t=0 0\r
a=group:BUNDLE 0\r
a=ice-lite\r
m=audio 1 RTP/SAVPF 111 126\r
c=IN IP4 0.0.0.0\r
a=mid:0\r
a=ice-ufrag:${transport.ufrag}\r
a=ice-pwd:${transport.pwd}\r
a=fingerprint:${fingerprint.hash || 'sha-256'} ${fingerprint.fingerprint}\r
a=setup:passive\r
${candidates}\r
a=rtpmap:111 opus/48000/2\r
a=rtpmap:126 telephone-event/8000\r
a=fmtp:111 minptime=10; useinbandfec=1; usedtx=1\r
a=rtcp:1 IN IP4 0.0.0.0\r
a=rtcp-mux\r
a=rtcp-fb:111 transport-cc\r
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r
a=recvonly\r
`;
};

const safeMid = (value, fallback) => String(value || fallback).replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 64);

const buildConferenceOffer = (transport, sources, mainSource, videos = []) => {
    const normalized = Array.from(new Set([mainSource, ...sources].map(source => Number(source) >>> 0))).filter(
        Boolean,
    );
    const audioMids = normalized.map(source => (source === mainSource >>> 0 ? '0' : `audio${source}`));
    const videoMids = videos.map((video, index) => safeMid(video.endpoint, `video${index}`));
    const mids = [...audioMids, ...videoMids];
    const lines = [
        'v=0',
        `o=- ${Date.now()} 2 IN IP4 0.0.0.0`,
        's=-',
        't=0 0',
        `a=group:BUNDLE ${mids.join(' ')}`,
        'a=ice-lite',
    ];
    normalized.forEach(source => {
        const main = source === mainSource >>> 0;
        lines.push(`m=audio ${main ? 1 : 0} RTP/SAVPF 111 126`);
        lines.push('c=IN IP4 0.0.0.0');
        lines.push(`a=mid:${main ? '0' : `audio${source}`}`);
        lines.push(`a=ice-ufrag:${transport.ufrag}`, `a=ice-pwd:${transport.pwd}`);
        transport.fingerprints.forEach(fingerprint => {
            lines.push(`a=fingerprint:${fingerprint.hash || 'sha-256'} ${fingerprint.fingerprint}`, 'a=setup:passive');
        });
        (transport.candidates || []).forEach(candidate => lines.push(candidateLine(candidate)));
        lines.push(
            'a=rtpmap:111 opus/48000/2',
            'a=rtpmap:126 telephone-event/8000',
            'a=fmtp:111 minptime=10; useinbandfec=1; usedtx=1',
            'a=rtcp:1 IN IP4 0.0.0.0',
            'a=rtcp-mux',
            'a=rtcp-fb:111 transport-cc',
            'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level',
            main ? 'a=sendrecv' : 'a=sendonly',
        );
        if (!main) lines.push('a=bundle-only');
        lines.push(
            `a=ssrc-group:FID ${source}`,
            `a=ssrc:${source} cname:stream${source}`,
            `a=ssrc:${source} msid:stream${source} audio${source}`,
            `a=ssrc:${source} mslabel:audio${source}`,
            `a=ssrc:${source} label:audio${source}`,
        );
    });
    videos.forEach((video, index) => {
        const mid = videoMids[index];
        const groups = video.source_groups || [];
        const videoSources = Array.from(new Set(groups.flatMap(group => group.sources || []))).filter(Boolean);
        lines.push('m=video 0 RTP/SAVPF 96 98 102 121');
        lines.push('c=IN IP4 0.0.0.0', `a=mid:${mid}`);
        lines.push(`a=ice-ufrag:${transport.ufrag}`, `a=ice-pwd:${transport.pwd}`);
        transport.fingerprints.forEach(fingerprint => {
            lines.push(`a=fingerprint:${fingerprint.hash || 'sha-256'} ${fingerprint.fingerprint}`, 'a=setup:passive');
        });
        (transport.candidates || []).forEach(candidate => lines.push(candidateLine(candidate)));
        lines.push(
            'a=rtpmap:96 VP8/90000',
            'a=rtpmap:98 VP9/90000',
            'a=rtpmap:102 H264/90000',
            'a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f',
            'a=rtpmap:121 rtx/90000',
            'a=fmtp:121 apt=96',
            'a=rtcp-fb:96 goog-remb',
            'a=rtcp-fb:96 transport-cc',
            'a=rtcp-fb:96 nack',
            'a=rtcp-fb:96 nack pli',
            'a=rtcp:1 IN IP4 0.0.0.0',
            'a=rtcp-mux',
            'a=sendonly',
            'a=bundle-only',
        );
        groups.forEach(group => lines.push(`a=ssrc-group:${group.semantics} ${group.sources.join(' ')}`));
        videoSources.forEach(source => {
            lines.push(
                `a=ssrc:${source} cname:${mid}`,
                `a=ssrc:${source} msid:${mid} ${mid}`,
                `a=ssrc:${source} mslabel:${mid}`,
                `a=ssrc:${source} label:${mid}`,
            );
        });
    });
    return `${lines.join('\r\n')}\r\n`;
};

class GroupCallController extends EventEmitter {
    constructor() {
        super();
        this.state = { ...initialState };
        this.pc = null;
        this.localStream = null;
        this.remoteStream = null;
        this.remoteVideoStreams = new Map();
        this.call = null;
        this.source = 0;
        this.checkTimer = null;
        this.sourcesTimer = null;
        this.transport = null;
        this.sourcesSignature = '';
        this.negotiating = false;
        this.presentationPc = null;
        this.presentationStream = null;
    }

    _setState(patch) {
        this.state = { ...this.state, ...patch };
        setGroupCallSyncActive(['connecting', 'connected'].includes(this.state.status));
        this.emit('state', this.state);
    }

    async join({ call_id, access_hash, muted = true }) {
        if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
            throw new Error('Este navegador no permite llamadas WebRTC');
        }
        await this.leave(false);
        this.call = { call_id, access_hash };
        this._setState({
            status: 'connecting', muted: !!muted, error: '', remoteStream: null, remoteVideoStreams: {},
        });
        try {
            this.pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
            this.remoteStream = new MediaStream();
            this.pc.ontrack = event => {
                const tracks = event.streams?.[0]?.getTracks() || [event.track];
                if (event.track?.kind === 'video') {
                    const mid = event.transceiver?.mid || event.track.id;
                    const stream = this.remoteVideoStreams.get(mid) || new MediaStream();
                    tracks.filter(track => track.kind === 'video').forEach(track => {
                        if (!stream.getTracks().some(current => current.id === track.id)) stream.addTrack(track);
                    });
                    this.remoteVideoStreams.set(mid, stream);
                    this._setState({ remoteVideoStreams: Object.fromEntries(this.remoteVideoStreams) });
                    return;
                }
                tracks.forEach(track => {
                    if (!this.remoteStream.getTracks().some(current => current.id === track.id)) {
                        this.remoteStream.addTrack(track);
                    }
                });
                this._setState({ remoteStream: this.remoteStream });
            };
            this.pc.onconnectionstatechange = () => {
                if (this.pc?.connectionState === 'connected') this._setState({ status: 'connected', error: '' });
                if (['failed', 'disconnected'].includes(this.pc?.connectionState)) this._checkConnection();
            };
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !muted;
                this.pc.addTrack(track, this.localStream);
            });
            const offer = await this.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
            await this.pc.setLocalDescription(offer);
            await waitForIceGathering(this.pc);
            const payload = offerToJoinPayload(this.pc.localDescription.sdp);
            this.source = payload.ssrc;
            const result = await TdLibController.send({
                '@type': 'joinGroupCall',
                call_id,
                access_hash,
                muted: !!muted,
                params: payload,
            });
            const remotePayload = typeof result.params === 'string' ? JSON.parse(result.params) : result.params;
            if (remotePayload?.stream) throw new Error('El modo stream de esta emisión todavía no es compatible');
            this.transport = remotePayload.transport || remotePayload;
            await this.pc.setRemoteDescription({ type: 'answer', sdp: buildRemoteAnswer(remotePayload) });
            await this._refreshAudioSources();
            this.sourcesTimer = setInterval(() => this._refreshAudioSources(), 5000);
            this._setState({ status: 'connected', remoteStream: this.remoteStream });
            return this.state;
        } catch (error) {
            await this.leave(false);
            this._setState({ status: 'error', error: error?.message || 'No se pudo conectar al chat de voz' });
            throw error;
        }
    }

    async setMuted(muted) {
        this.localStream?.getAudioTracks().forEach(track => (track.enabled = !muted));
        if (this.call) {
            await TdLibController.send({ '@type': 'setGroupCallSelfMuted', ...this.call, muted: !!muted });
        }
        this._setState({ muted: !!muted });
    }

    async startPresentation(kind = 'screen') {
        if (!this.call || this.state.status !== 'connected') throw new Error('Primero debes unirte al audio');
        if (kind === 'screen' && !navigator.mediaDevices?.getDisplayMedia) {
            throw new Error('Este navegador no permite compartir pantalla');
        }
        if (kind === 'camera' && !navigator.mediaDevices?.getUserMedia) {
            throw new Error('Este navegador no permite usar la cÃ¡mara');
        }
        await this.stopPresentation(false);
        try {
            this.presentationStream =
                kind === 'camera'
                    ? await navigator.mediaDevices.getUserMedia({
                          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } },
                          audio: false,
                      })
                    : await navigator.mediaDevices.getDisplayMedia({
                          video: { frameRate: { ideal: 15, max: 30 } },
                          audio: false,
                      });
            this.presentationPc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' });
            this.presentationStream.getVideoTracks().forEach(track => {
                track.addEventListener('ended', () => this.stopPresentation());
                this.presentationPc.addTrack(track, this.presentationStream);
            });
            const offer = await this.presentationPc.createOffer({
                offerToReceiveAudio: false,
                offerToReceiveVideo: false,
            });
            await this.presentationPc.setLocalDescription(offer);
            await waitForIceGathering(this.presentationPc);
            const localSdp = this.presentationPc.localDescription.sdp;
            const result = await TdLibController.send({
                '@type': 'joinGroupCallPresentation',
                ...this.call,
                params: offerToJoinPayload(localSdp),
            });
            const remotePayload = typeof result.params === 'string' ? JSON.parse(result.params) : result.params;
            await this.presentationPc.setRemoteDescription({
                type: 'answer',
                sdp: buildPresentationAnswer(localSdp, remotePayload),
            });
            this._setState({ presenting: true, presentationStream: this.presentationStream, presentationKind: kind });
        } catch (error) {
            await this.stopPresentation(false);
            throw error;
        }
    }

    async stopPresentation(notifyServer = true) {
        const wasPresenting = !!this.presentationPc;
        this.presentationPc?.close();
        this.presentationStream?.getTracks().forEach(track => track.stop());
        this.presentationPc = null;
        this.presentationStream = null;
        if (notifyServer && wasPresenting && this.call) {
            try {
                await TdLibController.send({ '@type': 'leaveGroupCallPresentation', ...this.call });
            } catch (_) {
                // La captura local siempre debe finalizar aunque la llamada ya se haya cerrado.
            }
        }
        this._setState({ presenting: false, presentationStream: null, presentationKind: null });
    }

    async _checkConnection() {
        if (!this.call || !this.source || this.checkTimer) return;
        this.checkTimer = setTimeout(async () => {
            this.checkTimer = null;
            try {
                const result = await TdLibController.send({
                    '@type': 'checkGroupCallConnection',
                    ...this.call,
                    source: this.source,
                });
                if (!result.connected) await this.leave();
            } catch (_) {
                await this.leave();
            }
        }, 4000);
    }

    async _refreshAudioSources() {
        if (!this.call || !this.pc || !this.transport || this.negotiating) return;
        try {
            const result = await TdLibController.send({ '@type': 'getGroupCallAudioSources', ...this.call });
            const sources = (result.sources || []).filter(source => Number(source) >>> 0 !== this.source >>> 0);
            const audioSignature = sources
                .map(source => Number(source) >>> 0)
                .sort((a, b) => a - b)
                .join(',');
            const videos = (result.videos || []).filter(video => !video.paused);
            const signature = `${audioSignature};${videoSourcesSignature(videos)}`;
            if (signature === this.sourcesSignature) return;
            this.negotiating = true;
            const offer = buildConferenceOffer(this.transport, sources, this.source, videos);
            await this.pc.setRemoteDescription({ type: 'offer', sdp: offer });
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);
            this.sourcesSignature = signature;
        } catch (error) {
            console.warn('[GroupCall] No se pudieron actualizar las fuentes de audio', error);
        } finally {
            this.negotiating = false;
        }
    }

    async leave(notifyServer = true) {
        const call = this.call;
        const source = this.source;
        await this.stopPresentation(notifyServer);
        this.call = null;
        this.source = 0;
        clearTimeout(this.checkTimer);
        this.checkTimer = null;
        clearInterval(this.sourcesTimer);
        this.sourcesTimer = null;
        this.pc?.close();
        this.pc = null;
        this.localStream?.getTracks().forEach(track => track.stop());
        this.remoteStream?.getTracks().forEach(track => track.stop());
        this.localStream = null;
        this.remoteStream = null;
        this.remoteVideoStreams.forEach(stream => stream.getTracks().forEach(track => track.stop()));
        this.remoteVideoStreams.clear();
        this.transport = null;
        this.sourcesSignature = '';
        this.negotiating = false;
        if (notifyServer && call && source) {
            try {
                await TdLibController.send({ '@type': 'leaveGroupCall', ...call, source });
            } catch (_) {
                // La limpieza local debe completarse aunque Telegram ya haya cerrado la llamada.
            }
        }
        this._setState({ ...initialState });
    }
}

export default new GroupCallController();
