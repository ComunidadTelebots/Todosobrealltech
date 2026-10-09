import React from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import Checkbox from '@material-ui/core/Checkbox';
import CircularProgress from '@material-ui/core/CircularProgress';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import TextField from '@material-ui/core/TextField';
import TdLibController from '../../Controllers/TdLibController';
import GroupCallController from '../../Controllers/GroupCallController';
import './GroupCallDialog.css';

const initialState = {
    loading: false,
    saving: false,
    error: '',
    call: null,
    title: '',
    scheduleDate: '',
    inviteUsers: '',
    recordingTitle: '',
    recordVideo: false,
    voiceStatus: GroupCallController.state.status,
    voiceMuted: GroupCallController.state.muted,
    remoteStream: GroupCallController.state.remoteStream,
    remoteVideoStreams: GroupCallController.state.remoteVideoStreams,
    presenting: GroupCallController.state.presenting,
    presentationStream: GroupCallController.state.presentationStream,
    presentationKind: GroupCallController.state.presentationKind,
};

class GroupCallDialog extends React.PureComponent {
    state = initialState;

    componentDidMount() {
        GroupCallController.on('state', this.handleVoiceState);
    }

    componentWillUnmount() {
        GroupCallController.removeListener('state', this.handleVoiceState);
    }

    componentDidUpdate(prevProps) {
        if (this.props.open && (!prevProps.open || prevProps.chatId !== this.props.chatId)) {
            this.setState({
                voiceStatus: GroupCallController.state.status,
                voiceMuted: GroupCallController.state.muted,
                remoteStream: GroupCallController.state.remoteStream,
                remoteVideoStreams: GroupCallController.state.remoteVideoStreams,
                presenting: GroupCallController.state.presenting,
                presentationStream: GroupCallController.state.presentationStream,
                presentationKind: GroupCallController.state.presentationKind,
            });
            this.load();
        }
        if (!this.props.open && prevProps.open) this.setState(initialState);
        if (this.audio && this.state.remoteStream && this.audio.srcObject !== this.state.remoteStream) {
            this.audio.srcObject = this.state.remoteStream;
            const playback = this.audio.play();
            if (playback?.catch) playback.catch(() => undefined);
        }
        if (
            this.presentationVideo &&
            this.state.presentationStream &&
            this.presentationVideo.srcObject !== this.state.presentationStream
        ) {
            this.presentationVideo.srcObject = this.state.presentationStream;
            const playback = this.presentationVideo.play();
            if (playback?.catch) playback.catch(() => undefined);
        }
    }

    handleVoiceState = state =>
        this.setState({
            voiceStatus: state.status,
            voiceMuted: state.muted,
            remoteStream: state.remoteStream,
            remoteVideoStreams: state.remoteVideoStreams,
            presenting: state.presenting,
            presentationStream: state.presentationStream,
            presentationKind: state.presentationKind,
            error: state.error || this.state.error,
        });

    callParams = () => ({
        call_id: this.state.call.call_id,
        access_hash: this.state.call.access_hash,
    });

    load = async () => {
        this.setState({ loading: true, error: '' });
        try {
            const call = await TdLibController.send({
                '@type': 'getGroupCallInfo',
                chat_id: this.props.chatId,
                limit: 100,
            });
            this.setState({ call, title: call?.title || '', loading: false });
        } catch (error) {
            this.setState({ loading: false, error: error?.message || 'No se pudo consultar el chat de voz.' });
        }
    };

    run = async (request, reload = true) => {
        this.setState({ saving: true, error: '' });
        try {
            const result = await TdLibController.send(request);
            if (reload) await this.load();
            this.setState({ saving: false });
            return result;
        } catch (error) {
            this.setState({ saving: false, error: error?.message || 'Telegram rechazó la operación.' });
            return null;
        }
    };

    create = () => {
        const date = this.state.scheduleDate ? Math.floor(new Date(this.state.scheduleDate).getTime() / 1000) : 0;
        this.run({
            '@type': 'createGroupCall',
            chat_id: this.props.chatId,
            title: this.state.title,
            schedule_date: Number.isFinite(date) ? date : 0,
        });
    };

    editTitle = () => this.run({ '@type': 'editGroupCallTitle', ...this.callParams(), title: this.state.title });

    toggleJoinMuted = event =>
        this.run({
            '@type': 'toggleGroupCallJoinMuted',
            ...this.callParams(),
            join_muted: event.target.checked,
        });

    copyInvite = async () => {
        const result = await this.run({ '@type': 'exportGroupCallInvite', ...this.callParams() }, false);
        if (!result?.link) return;
        try {
            await navigator.clipboard.writeText(result.link);
        } catch (_) {
            window.prompt('Enlace del chat de voz', result.link);
        }
    };

    discard = () => {
        if (!window.confirm('¿Finalizar este chat de voz para todos?')) return;
        this.run({ '@type': 'discardGroupCall', ...this.callParams() });
    };

    invite = async () => {
        const users = this.state.inviteUsers
            .split(/[\s,;]+/)
            .map(value => value.trim())
            .filter(Boolean);
        if (!users.length) return;
        const result = await this.run({ '@type': 'inviteToGroupCall', ...this.callParams(), users }, false);
        if (result) this.setState({ inviteUsers: '' });
    };

    toggleRecording = () =>
        this.run({
            '@type': 'toggleGroupCallRecord',
            ...this.callParams(),
            start: !this.state.call.record_start_date,
            video: this.state.recordVideo,
            title: this.state.recordingTitle,
        });

    subscribeScheduled = () =>
        this.run({ '@type': 'subscribeScheduledGroupCall', ...this.callParams(), subscribed: true }, false);

    toggleParticipantMute = participant =>
        this.run({
            '@type': 'editGroupCallParticipant',
            ...this.callParams(),
            participant: participant.id,
            muted: !participant.muted,
        });

    joinVoice = async () => {
        this.setState({ error: '' });
        try {
            await GroupCallController.join({ ...this.callParams(), muted: true });
        } catch (error) {
            this.setState({ error: error?.message || 'No se pudo conectar el audio.' });
        }
    };

    leaveVoice = () => GroupCallController.leave();

    toggleSelfMute = async () => {
        try {
            await GroupCallController.setMuted(!this.state.voiceMuted);
        } catch (error) {
            this.setState({ error: error?.message || 'No se pudo cambiar el micrófono.' });
        }
    };

    togglePresentation = async kind => {
        this.setState({ error: '' });
        try {
            if (this.state.presenting) await GroupCallController.stopPresentation();
            else await GroupCallController.startPresentation(kind);
        } catch (error) {
            this.setState({ error: error?.message || 'No se pudo compartir la pantalla.' });
        }
    };

    attachRemoteVideo = (element, stream) => {
        if (!element || !stream || element.srcObject === stream) return;
        element.srcObject = stream;
        const playback = element.play();
        if (playback?.catch) playback.catch(() => undefined);
    };

    renderCreate() {
        const { saving, title, scheduleDate } = this.state;
        return (
            <>
                <DialogContentText>
                    No hay un chat de voz activo. Puedes iniciarlo ahora o programarlo.
                </DialogContentText>
                <TextField
                    label='Título (opcional)'
                    value={title}
                    onChange={event => this.setState({ title: event.target.value })}
                    fullWidth
                    margin='dense'
                />
                <TextField
                    label='Programar para'
                    type='datetime-local'
                    value={scheduleDate}
                    onChange={event => this.setState({ scheduleDate: event.target.value })}
                    fullWidth
                    margin='dense'
                    InputLabelProps={{ shrink: true }}
                />
                <Button color='primary' variant='contained' disabled={saving} onClick={this.create}>
                    {scheduleDate ? 'Programar chat de voz' : 'Iniciar chat de voz'}
                </Button>
            </>
        );
    }

    renderActive() {
        const {
            call,
            saving,
            title,
            inviteUsers,
            recordingTitle,
            recordVideo,
            voiceStatus,
            voiceMuted,
            presenting,
            presentationKind,
            remoteVideoStreams,
        } = this.state;
        const canManage = call.can_change_join_muted;
        const voiceConnected = voiceStatus === 'connected';
        const voiceConnecting = voiceStatus === 'connecting';
        return (
            <>
                <DialogContentText>
                    {call.scheduled
                        ? `Programado para ${new Date(call.schedule_date * 1000).toLocaleString()}`
                        : `${call.participants_count} participante(s)`}
                </DialogContentText>
                <TextField
                    label='Título'
                    value={title}
                    onChange={event => this.setState({ title: event.target.value })}
                    fullWidth
                    margin='dense'
                />
                {canManage && (
                    <Button color='primary' disabled={saving || title === call.title} onClick={this.editTitle}>
                        Guardar título
                    </Button>
                )}
                {call.can_change_join_muted && (
                    <FormControlLabel
                        control={<Checkbox checked={call.join_muted} onChange={this.toggleJoinMuted} color='primary' />}
                        label='Los nuevos participantes entran silenciados'
                    />
                )}
                {call.scheduled && canManage && (
                    <Button
                        color='primary'
                        variant='contained'
                        disabled={saving}
                        onClick={() => this.run({ '@type': 'startScheduledGroupCall', ...this.callParams() })}>
                        Iniciar ahora
                    </Button>
                )}
                {call.scheduled && (
                    <Button color='primary' disabled={saving} onClick={this.subscribeScheduled}>
                        Avisarme cuando empiece
                    </Button>
                )}
                {!call.scheduled && (
                    <div>
                        {voiceStatus === 'idle' || voiceStatus === 'error' ? (
                            <Button color='primary' variant='contained' disabled={saving} onClick={this.joinVoice}>
                                Unirme al audio
                            </Button>
                        ) : (
                            <>
                                <Button color='primary' disabled={!voiceConnected} onClick={this.toggleSelfMute}>
                                    {voiceMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
                                </Button>
                                <Button color='secondary' disabled={voiceConnecting} onClick={this.leaveVoice}>
                                    Salir del audio
                                </Button>
                                {presenting ? (
                                    <Button
                                        color='primary'
                                        disabled={!voiceConnected}
                                        onClick={this.togglePresentation}>
                                        Dejar de compartir {presentationKind === 'camera' ? 'cÃ¡mara' : 'pantalla'}
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            color='primary'
                                            disabled={!voiceConnected}
                                            onClick={() => this.togglePresentation('screen')}>
                                            Compartir pantalla
                                        </Button>
                                        <Button
                                            color='primary'
                                            disabled={!voiceConnected}
                                            onClick={() => this.togglePresentation('camera')}>
                                            Compartir cÃ¡mara
                                        </Button>
                                    </>
                                )}
                            </>
                        )}
                        <DialogContentText>
                            {voiceConnecting
                                ? 'Conectando con el servidor de audio de Telegram…'
                                : voiceConnected
                                ? voiceMuted
                                    ? 'Conectado como oyente.'
                                    : 'Conectado con el micrófono activo.'
                                : 'Audio WebRTC disponible en navegadores compatibles.'}
                        </DialogContentText>
                        <audio ref={element => (this.audio = element)} autoPlay playsInline />
                        {Object.entries(remoteVideoStreams || {}).length > 0 && (
                            <div className='group-call-video-grid' aria-label='VÃ­deos de participantes'>
                                {Object.entries(remoteVideoStreams).map(([endpoint, stream]) => {
                                    const participant = (call.participants || []).find(item =>
                                        [item.video?.endpoint, item.presentation?.endpoint].includes(endpoint),
                                    );
                                    return (
                                        <figure className='group-call-video-tile' key={endpoint}>
                                            <video
                                                ref={element => this.attachRemoteVideo(element, stream)}
                                                autoPlay
                                                playsInline
                                            />
                                            <figcaption>
                                                {participant?.name || 'Participante'}
                                                {participant?.presentation?.endpoint === endpoint ? ' Â· pantalla' : ''}
                                            </figcaption>
                                        </figure>
                                    );
                                })}
                            </div>
                        )}
                        {presenting && (
                            <video
                                ref={element => (this.presentationVideo = element)}
                                autoPlay
                                muted
                                playsInline
                                style={{ width: '100%', maxHeight: 180, background: '#000' }}
                            />
                        )}
                        <DialogContentText>
                            La cÃ¡mara propia se publica como presentaciÃ³n. Las cÃ¡maras y pantallas de participantes se
                            reciben desde el transporte principal mediante sus fuentes SIM/FID.
                        </DialogContentText>
                    </div>
                )}
                <TextField
                    label='Invitar usuarios (@usuario o ID, separados por comas)'
                    value={inviteUsers}
                    onChange={event => this.setState({ inviteUsers: event.target.value })}
                    fullWidth
                    margin='dense'
                />
                <Button color='primary' disabled={saving || !inviteUsers.trim()} onClick={this.invite}>
                    Invitar participantes
                </Button>
                {!call.scheduled && canManage && (
                    <>
                        {!call.record_start_date && (
                            <TextField
                                label='Título de la grabación (opcional)'
                                value={recordingTitle}
                                onChange={event => this.setState({ recordingTitle: event.target.value })}
                                fullWidth
                                margin='dense'
                            />
                        )}
                        {!call.record_start_date && (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={recordVideo}
                                        onChange={event => this.setState({ recordVideo: event.target.checked })}
                                        color='primary'
                                    />
                                }
                                label='Incluir vídeo en la grabación'
                            />
                        )}
                        <Button color='primary' disabled={saving} onClick={this.toggleRecording}>
                            {call.record_start_date ? 'Detener grabación' : 'Iniciar grabación'}
                        </Button>
                    </>
                )}
                <List dense>
                    {(call.participants || []).map(participant => (
                        <ListItem key={`${participant.id}-${participant.username}`}>
                            <ListItemText
                                primary={participant.name}
                                secondary={[
                                    participant.username ? `@${participant.username}` : '',
                                    participant.muted ? 'silenciado' : 'hablando',
                                    participant.video_joined ? 'vídeo activo' : '',
                                    participant.raised_hand ? 'mano levantada' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            />
                            {canManage && (
                                <Button
                                    size='small'
                                    disabled={saving || !participant.id}
                                    onClick={() => this.toggleParticipantMute(participant)}>
                                    {participant.muted ? 'Permitir hablar' : 'Silenciar'}
                                </Button>
                            )}
                        </ListItem>
                    ))}
                </List>
            </>
        );
    }

    render() {
        const { open, onClose } = this.props;
        const { loading, saving, error, call } = this.state;
        return (
            <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm' aria-labelledby='group-call-title'>
                <DialogTitle id='group-call-title'>Chat de voz</DialogTitle>
                <DialogContent>
                    {loading ? (
                        <CircularProgress size={28} />
                    ) : call?.active ? (
                        this.renderActive()
                    ) : (
                        this.renderCreate()
                    )}
                    {error && <DialogContentText color='error'>{error}</DialogContentText>}
                </DialogContent>
                <DialogActions>
                    {call?.active && (
                        <Button disabled={saving} onClick={this.copyInvite}>
                            Copiar invitación
                        </Button>
                    )}
                    {call?.active && call.can_change_join_muted && (
                        <Button disabled={saving} color='secondary' onClick={this.discard}>
                            Finalizar
                        </Button>
                    )}
                    <Button onClick={onClose}>Cerrar</Button>
                </DialogActions>
            </Dialog>
        );
    }
}

GroupCallDialog.propTypes = {
    chatId: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,
    open: PropTypes.bool.isRequired,
};

export default GroupCallDialog;
