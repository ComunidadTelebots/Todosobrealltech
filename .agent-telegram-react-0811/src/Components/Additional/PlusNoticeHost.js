import React from 'react';
import '../../Stores/PlusPresenceStore';
import './PlusSettings.css';

export default class PlusNoticeHost extends React.PureComponent {
    state = { notice: null };
    componentDidMount() { window.addEventListener('telegram-plus-notice', this.onNotice); }
    componentWillUnmount() { window.removeEventListener('telegram-plus-notice', this.onNotice); clearTimeout(this.timer); }
    onNotice = event => {
        clearTimeout(this.timer);
        this.setState({ notice: event.detail });
        this.timer = setTimeout(() => this.setState({ notice: null }), 5000);
    };
    render() {
        const { notice } = this.state;
        return notice ? <div className='plus-notice' role='status' aria-live='polite'>{notice.text}</div> : null;
    }
}

