import React from 'react';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import EditIcon from '@material-ui/icons/Edit';
import NotificationsIcon from '@material-ui/icons/Notifications';
import LockIcon from '@material-ui/icons/Lock';
import DataUsageIcon from '@material-ui/icons/DataUsage';
import ChatBubbleIcon from '@material-ui/icons/ChatBubble';
import PaletteIcon from '@material-ui/icons/Palette';
import LanguageIcon from '@material-ui/icons/Language';
import HelpIcon from '@material-ui/icons/Help';
import InfoIcon from '@material-ui/icons/Info';
import Brightness2Icon from '@material-ui/icons/Brightness2';
import WbSunnyIcon from '@material-ui/icons/WbSunny';
import StorageIcon from '@material-ui/icons/Storage';
import FolderIcon from '@material-ui/icons/Folder';
import PhoneAndroidIcon from '@material-ui/icons/PhoneAndroid';
import StarIcon from '@material-ui/icons/Star';
import EmojiEmotionsIcon from '@material-ui/icons/EmojiEmotions';
import GroupIcon from '@material-ui/icons/Group';
import PersonAddIcon from '@material-ui/icons/PersonAdd';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import CropFreeIcon from '@material-ui/icons/CropFree';
import HistoryIcon from '@material-ui/icons/History';
import TuneIcon from '@material-ui/icons/Tune';
import Snackbar from '@material-ui/core/Snackbar';
import TwoStepVerification from '../Additional/TwoStepVerification';
import ActiveSessions from '../Additional/ActiveSessions';
import EditProfile from '../Additional/EditProfile';
import PrivacySettings from './PrivacySettings';
import LanguagePicker from './LanguagePicker';
import AndroidDataSettings from './AndroidDataSettings';
import PlusOptionsDialog from './PlusOptionsDialog';
import FavedStickers from '../Additional/FavedStickers';
import { getSrc } from '../../Utils/File';
import { getUserFullName } from '../../Utils/User';
import UserStore from '../../Stores/UserStore';
import OptionStore from '../../Stores/OptionStore';
import ApplicationStore from '../../Stores/ApplicationStore';
import TdLibController from '../../Controllers/TdLibController';
import { getDesign } from '../../Design';
import './AndroidSettings.css';

function isHoloOrClassic(d) {
    return d === 'android-holo' || d === 'android-classic';
}
class AndroidSettings extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            isDark: document.body.classList.contains('theme-dark'),
            design: getDesign(),
            bio: '',
            snackbar: null,
            legacyOnly: localStorage.getItem('tg_design_legacy_features') === 'true',
        };
    }

    componentDidMount() {
        this.loadBio();
        ApplicationStore.on('clientUpdateThemeChange', this.onDesignChange);
    }

    componentWillUnmount() {
        ApplicationStore.off('clientUpdateThemeChange', this.onDesignChange);
    }

    onDesignChange = () => this.setState({ design: getDesign() });

    async loadBio() {
        const myId = OptionStore.get('my_id');
        if (!myId || !myId.value) return;
        try {
            const full = await TdLibController.send({ '@type': 'getUserFullInfo', user_id: myId.value });
            if (full && full.bio) this.setState({ bio: full.bio.text || full.bio || '' });
        } catch {}
    }

    getMe() {
        const myId = OptionStore.get('my_id');
        if (!myId || !myId.value) return null;
        return UserStore.get(myId.value);
    }

    handleToggleDark = () => {
        const isDark = !this.state.isDark;
        this.setState({ isDark });
        ApplicationStore.emit('clientUpdateThemeChanging', {
            type: isDark ? 'dark' : 'light',
            primary: { main: '#229af0' },
        });
    };

    handleLogOut = () => {
        this.props.onClose();
        TdLibController.send({ '@type': 'logOut' });
    };

    handleTwoStepVerification = () => {
        if (this.twoStepRef) this.twoStepRef.open();
    };

    handleDevices = () => {
        if (this.activeSessionsRef) this.activeSessionsRef.open();
    };

    handlePrivacy = () => {
        if (this.privacySettingsRef) this.privacySettingsRef.open();
    };

    handleEditProfile = () => {
        if (this.editProfileRef) this.editProfileRef.open();
    };

    handleSoon = label => {
        this.setState({ snackbar: `${label} — próximamente` });
    };

    handleNotifications = async () => {
        if (!('Notification' in window)) {
            this.setState({ snackbar: 'Este navegador no admite notificaciones.' });
            return;
        }
        const permission =
            Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
        const labels = { granted: 'Notificaciones activadas', denied: 'Notificaciones bloqueadas por el navegador' };
        this.setState({ snackbar: labels[permission] || 'Permiso de notificaciones pendiente' });
    };

    handleChatSettings = () => {
        if (this.props.onAppearance) this.props.onAppearance();
    };

    handleChatFolders = () => {
        this.props.onClose();
        ApplicationStore.emit('clientUpdateOpenCreateFolder');
    };

    handleStorage = async () => {
        if (this.dataSettingsRef) this.dataSettingsRef.open();
    };

    handleFavoriteStickers = () => {
        if (this.favedStickersRef) this.favedStickersRef.open();
    };

    handleToggleLegacyFeatures = () => {
        this.setState(({ legacyOnly }) => {
            const next = !legacyOnly;
            localStorage.setItem('tg_design_legacy_features', String(next));
            document.body.classList.toggle('design-legacy-features', next);
            ApplicationStore.emit('clientUpdateDesignCapabilities', { legacyOnly: next });
            return { legacyOnly: next };
        });
    };

    handleLanguage = () => {
        if (this.languagePickerRef) this.languagePickerRef.open();
    };

    handlePlusOptions = () => {
        if (this.plusOptionsRef) this.plusOptionsRef.open();
    };

    openHelp = path => window.open(`https://telegram.org/${path}`, '_blank', 'noopener,noreferrer');

    render() {
        const { onClose } = this.props;
        const { isDark, design, bio, legacyOnly } = this.state;
        const me = this.getMe();
        const name = me ? getUserFullName(me) : 'Telegram User';
        const phone = me && me.phone_number ? '+' + me.phone_number : '';
        const username = me && me.username ? '@' + me.username : '';
        const initials = name
            .split(' ')
            .map(w => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
        const avatarSrc = me ? getSrc(me.profile_photo ? me.profile_photo.small : null) : null;
        const isOld = isHoloOrClassic(design);

        // Secciones que varían por era
        const sections = [
            // Cuenta — siempre presente
            {
                key: 'account',
                rows: [
                    {
                        icon: <NotificationsIcon />,
                        label: 'Notificaciones y sonidos',
                        sub: '',
                        arrow: true,
                        action: this.handleNotifications,
                    },
                    {
                        icon: <LockIcon />,
                        label: 'Privacidad y seguridad',
                        sub: 'Configuración de privacidad',
                        arrow: true,
                        action: this.handlePrivacy,
                    },
                    {
                        icon: <DataUsageIcon />,
                        label: 'Datos y almacenamiento',
                        sub: '',
                        arrow: true,
                        action: this.handleStorage,
                    },
                    {
                        icon: <ChatBubbleIcon />,
                        label: 'Ajustes de chat',
                        sub: 'Texto, densidad y animaciones',
                        arrow: true,
                        action: this.handleChatSettings,
                    },
                    ...(legacyOnly
                        ? []
                        : [
                              {
                                  icon: <FolderIcon />,
                                  label: 'Carpetas de chat',
                                  sub: 'Crear y organizar carpetas',
                                  arrow: true,
                                  action: this.handleChatFolders,
                              },
                          ]),
                ],
            },
            // Dispositivos — desde v9 en adelante
            ...(!legacyOnly
                ? [
                      {
                          key: 'devices',
                          rows: [
                              {
                                  icon: <PhoneAndroidIcon />,
                                  label: 'Dispositivos',
                                  sub: 'Sesiones activas',
                                  arrow: true,
                                  action: this.handleDevices,
                              },
                          ],
                      },
                      // Premium — solo en eras modernas
                      {
                          key: 'premium',
                          rows: [
                              {
                                  icon: <StarIcon />,
                                  label: 'Telegram Premium',
                                  sub: 'Exclusive features',
                                  arrow: true,
                                  accent: true,
                              },
                              {
                                  icon: <EmojiEmotionsIcon />,
                                  label: 'Stickers & Emoji',
                                  sub: 'Stickers favoritos',
                                  arrow: true,
                                  action: this.handleFavoriteStickers,
                              },
                          ],
                      },
                  ]
                : []),
            // Display
            {
                key: 'display',
                rows: [
                    {
                        icon: isDark ? <WbSunnyIcon /> : <Brightness2Icon />,
                        label: 'Modo nocturno',
                        toggle: true,
                        toggleOn: isDark,
                        action: this.handleToggleDark,
                    },
                    {
                        icon: <PaletteIcon />,
                        label: 'Apariencia',
                        sub: 'Diseño y tema',
                        arrow: true,
                        action: this.props.onAppearance,
                    },
                    {
                        icon: <LanguageIcon />,
                        label: 'Idioma',
                        sub: 'Español',
                        arrow: true,
                        action: this.handleLanguage,
                    },
                    {
                        icon: <TuneIcon />,
                        label: 'Opciones Plus Messenger',
                        sub: 'Organización, accesos rápidos, multimedia y privacidad',
                        arrow: true,
                        action: this.handlePlusOptions,
                    },
                    {
                        icon: <HistoryIcon />,
                        label: 'Solo funciones de la época',
                        sub: legacyOnly ? 'Activado · API moderna' : 'Desactivado · funciones actuales',
                        toggle: true,
                        toggleOn: legacyOnly,
                        action: this.handleToggleLegacyFeatures,
                    },
                ],
            },
            // Invitar amigos — vieja era lo tenía aquí
            ...(isOld
                ? [
                      {
                          key: 'invite',
                          rows: [
                              { icon: <PersonAddIcon />, label: 'Invite Friends', sub: '', arrow: true },
                              { icon: <GroupIcon />, label: 'Telegram Features', sub: '', arrow: true },
                          ],
                      },
                  ]
                : []),
            // Almacenamiento
            {
                key: 'storage',
                rows: [
                    {
                        icon: <StorageIcon />,
                        label: 'Almacenamiento y datos',
                        sub: '',
                        arrow: true,
                        action: this.handleStorage,
                    },
                ],
            },
            // Soporte
            {
                key: 'help',
                rows: [
                    {
                        icon: <HelpIcon />,
                        label: 'Ask a Question',
                        sub: '',
                        arrow: true,
                        action: () => this.openHelp('support'),
                    },
                    {
                        icon: <InfoIcon />,
                        label: 'Telegram Features',
                        sub: '',
                        arrow: true,
                        action: () => this.openHelp('faq'),
                    },
                ],
            },
        ];

        return (
            <>
                <div className='android-settings-overlay'>
                    {/* Toolbar */}
                    <div className='android-settings-toolbar'>
                        <button className='android-settings-back' onClick={onClose} aria-label='Back'>
                            <ArrowBackIcon />
                        </button>
                        <span className='android-settings-toolbar-title'>Ajustes</span>
                        <button className='android-settings-toolbar-action' aria-label='Edit'>
                            <EditIcon style={{ fontSize: 20 }} />
                        </button>
                        {!isOld && (
                            <button className='android-settings-toolbar-action' aria-label='QR'>
                                <CropFreeIcon style={{ fontSize: 20 }} />
                            </button>
                        )}
                    </div>

                    <div className='android-settings-content'>
                        {/* Profile hero */}
                        <div
                            className='android-settings-profile'
                            onClick={this.handleEditProfile}
                            style={{ cursor: 'pointer' }}>
                            <div className='android-settings-avatar'>
                                {avatarSrc ? <img src={avatarSrc} alt='' /> : initials}
                            </div>
                            <div className='android-settings-profile-info'>
                                <div className='android-settings-profile-name'>{name}</div>
                                {bio ? (
                                    <div className='android-settings-profile-bio'>{bio}</div>
                                ) : username ? (
                                    <div className='android-settings-profile-bio'>{username}</div>
                                ) : null}
                                {phone && <div className='android-settings-profile-phone'>{phone}</div>}
                            </div>
                        </div>

                        {/* Sections */}
                        {sections.map(section => (
                            <div key={section.key} className='android-settings-section'>
                                {section.rows.map((row, i) => (
                                    <React.Fragment key={row.label}>
                                        <button
                                            className={`android-settings-row${
                                                row.accent ? ' android-settings-row--accent' : ''
                                            }`}
                                            onClick={row.action || undefined}>
                                            <span className={`android-settings-row-icon${row.accent ? ' accent' : ''}`}>
                                                {row.icon}
                                            </span>
                                            <span className='android-settings-row-content'>
                                                <span className='android-settings-row-label'>{row.label}</span>
                                                {row.sub && (
                                                    <span className='android-settings-row-value'>{row.sub}</span>
                                                )}
                                            </span>
                                            {row.toggle !== undefined ? (
                                                <span
                                                    className={`android-settings-toggle${row.toggleOn ? ' on' : ''}`}
                                                />
                                            ) : row.arrow ? (
                                                <span className='android-settings-row-arrow'>
                                                    <ChevronRightIcon />
                                                </span>
                                            ) : null}
                                        </button>
                                        {i < section.rows.length - 1 && <div className='android-settings-divider' />}
                                    </React.Fragment>
                                ))}
                            </div>
                        ))}

                        {/* Log out */}
                        <div className='android-settings-section android-settings-section--danger'>
                            <button
                                className='android-settings-row android-settings-row--danger'
                                onClick={this.handleLogOut}>
                                <span className='android-settings-row-icon android-settings-row-icon--danger'>
                                    <ExitToAppIcon />
                                </span>
                                <span className='android-settings-row-content'>
                                    <span className='android-settings-row-label android-settings-row-label--danger'>
                                        Cerrar sesión
                                    </span>
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
                <TwoStepVerification ref={ref => (this.twoStepRef = ref)} />
                <ActiveSessions ref={ref => (this.activeSessionsRef = ref)} />
                <EditProfile ref={ref => (this.editProfileRef = ref)} />
                <PrivacySettings ref={ref => (this.privacySettingsRef = ref)} />
                <LanguagePicker ref={ref => (this.languagePickerRef = ref)} />
                <AndroidDataSettings ref={ref => (this.dataSettingsRef = ref)} />
                <PlusOptionsDialog ref={ref => (this.plusOptionsRef = ref)} />
                <FavedStickers ref={ref => (this.favedStickersRef = ref)} />
                <Snackbar
                    open={!!this.state.snackbar}
                    message={this.state.snackbar || ''}
                    autoHideDuration={3000}
                    onClose={() => this.setState({ snackbar: null })}
                />
            </>
        );
    }
}

export default AndroidSettings;
