import React from 'react';
import PersonIcon from '@material-ui/icons/Person';
import PhoneIcon from '@material-ui/icons/Phone';
import ChatIcon from '@material-ui/icons/Chat';
import SettingsIcon from '@material-ui/icons/Settings';
import AndroidSettings from './AndroidSettings';
import TdLibController from '../../Controllers/TdLibController';
import './AndroidBottomNav.css';

class AndroidBottomNav extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = { active: 'chats', showSettings: false };
    }

    handleSelect = key => {
        if (key === 'settings') {
            this.setState({ showSettings: true, active: key });
        } else {
            this.setState({ active: key, showSettings: false });
        }
    };

    render() {
        const { active, showSettings } = this.state;
        const items = [
            { key: 'contacts', label: 'Contacts', icon: <PersonIcon /> },
            { key: 'calls', label: 'Calls', icon: <PhoneIcon /> },
            { key: 'chats', label: 'Chats', icon: <ChatIcon /> },
            { key: 'settings', label: 'Settings', icon: <SettingsIcon /> },
        ];

        return (
            <>
                {showSettings && (
                    <AndroidSettings
                        onClose={() => this.setState({ showSettings: false, active: 'chats' })}
                        onAppearance={() => {
                            this.setState({ showSettings: false });
                            TdLibController.clientUpdate({ '@type': 'clientUpdateAppearance' });
                        }}
                    />
                )}
                <div className='android-bottom-nav'>
                    {items.map(({ key, label, icon }) => (
                        <button
                            key={key}
                            className={`android-bottom-nav-item${active === key ? ' active' : ''}`}
                            onClick={() => this.handleSelect(key)}>
                            {icon}
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </>
        );
    }
}

export default AndroidBottomNav;
