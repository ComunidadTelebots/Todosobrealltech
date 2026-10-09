import React from 'react';
import Button from '@material-ui/core/Button';
import TdLibController from '../../Controllers/TdLibController';
import './LiveLocationPanel.css';

class LiveLocationPanel extends React.Component {
    state = {
        active: false,
        secondsLeft: 0,
        chatId: null,
        messageId: null,
        period: 3600,
    };

    _interval = null;
    _geoWatch = null;
    _lastUpdateAt = 0;

    start(chatId, messageId, period) {
        if (this._interval) clearInterval(this._interval);
        this._clearGeoWatch();

        this.setState({ active: true, chatId, messageId, period, secondsLeft: period });

        this._interval = setInterval(() => {
            this.setState(prev => {
                if (prev.secondsLeft <= 1) {
                    this._stopAll();
                    return { active: false, secondsLeft: 0 };
                }
                return { secondsLeft: prev.secondsLeft - 1 };
            });
        }, 1000);

        if (navigator.geolocation) {
            this._geoWatch = navigator.geolocation.watchPosition(
                position => this._pushGeoUpdate(position),
                () => {},
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
            );
        }
    }

    _pushGeoUpdate(position) {
        const { chatId, messageId } = this.state;
        if (!chatId || !messageId) return;
        const now = Date.now();
        if (now - this._lastUpdateAt < 15000) return;
        this._lastUpdateAt = now;
        TdLibController.send({
            '@type': 'editLiveLocation',
            chat_id: chatId,
            message_id: messageId,
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            heading: position.coords.heading || undefined,
        }).catch(() => {});
    }

    _clearGeoWatch() {
        if (this._geoWatch !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(this._geoWatch);
        }
        this._geoWatch = null;
        this._lastUpdateAt = 0;
    }

    _stopAll() {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
        this._clearGeoWatch();
    }

    handleStop = async () => {
        const { chatId, messageId } = this.state;
        this._stopAll();
        this.setState({ active: false });
        if (chatId && messageId) {
            try {
                await TdLibController.send({
                    '@type': 'editLiveLocation',
                    chat_id: chatId,
                    message_id: messageId,
                    stopped: true,
                });
            } catch (e) {}
        }
    };

    componentWillUnmount() {
        this._stopAll();
    }

    _fmt(s) {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    render() {
        const { active, secondsLeft } = this.state;
        if (!active) return null;
        return (
            <div className='live-location-panel'>
                <span className='live-location-dot' />
                <span className='live-location-label'>Ubicación en vivo</span>
                <span className='live-location-timer'>{this._fmt(secondsLeft)}</span>
                <Button className='live-location-stop' size='small' onClick={this.handleStop}>
                    Detener
                </Button>
            </div>
        );
    }
}

export default LiveLocationPanel;
