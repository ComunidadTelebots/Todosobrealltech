/*
 *  Copyright (c) 2018-present, Evgeny Nadymov
 *
 * This source code is licensed under the GPL v.3.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormLabel from '@material-ui/core/FormLabel';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import Typography from '@material-ui/core/Typography';
import withStyles from '@material-ui/core/styles/withStyles';
import red from '@material-ui/core/colors/red';
import orange from '@material-ui/core/colors/orange';
import amber from '@material-ui/core/colors/amber';
import green from '@material-ui/core/colors/green';
import blue from '@material-ui/core/colors/blue';
import indigo from '@material-ui/core/colors/indigo';
import deepPurple from '@material-ui/core/colors/deepPurple';
import ApplicationStore from '../../Stores/ApplicationStore';
import { getDesign, setDesign } from '../../Design';
import PalettePicker from './PalettePicker';
import DesignEditor from './DesignEditor';
import ThemeIO from './ThemeIO';
import ThemeShare from './ThemeShare';
import ChatBackground from './ChatBackground';
import ChatPatternPicker from './ChatPatternPicker';
import DisplaySettings from './DisplaySettings';
import PlusSettings from './PlusSettings';
import AppearanceReset from './AppearanceReset';
import PlusInteractionSettings from './PlusInteractionSettings';
import AppearanceCenter from './AppearanceCenter';

const styles = theme => ({
    formControl: {
        margin: theme.spacing(3),
    },
    group: {
        margin: `${theme.spacing(1)}px 0`,
    },
    redRoot: {
        color: red[600],
        '&$checked': {
            color: red[500],
        },
    },
    orangeRoot: {
        color: orange[600],
        '&$checked': {
            color: orange[500],
        },
    },
    amberRoot: {
        color: amber[600],
        '&$checked': {
            color: amber[500],
        },
    },
    greenRoot: {
        color: green[600],
        '&$checked': {
            color: green[500],
        },
    },
    blueRoot: {
        color: '#5B8AF1',
        '&$checked': {
            color: '#5B8AF1',
        },
    },
    indigoRoot: {
        color: indigo[600],
        '&$checked': {
            color: indigo[500],
        },
    },
    deepPurpleRoot: {
        color: deepPurple[600],
        '&$checked': {
            color: deepPurple[500],
        },
    },
    checked: {},
});

class ThemePicker extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            open: false,
            advanced: false,
            type: this.props.theme.palette.type,
            color: this.getColorString(this.props.theme.palette.primary.main),
            design: getDesign(),
        };
    }

    handleChange = event => {
        this.setState({ type: event.target.value });

        ApplicationStore.emit('clientUpdateThemeChanging', {
            type: event.target.value,
            primary: this.getColor(this.state.color),
        });
    };

    handleAccentChange = event => {
        this.setState({ color: event.target.value });

        ApplicationStore.emit('clientUpdateThemeChanging', {
            type: this.state.type,
            primary: this.getColor(event.target.value),
        });
    };

    handleDesignChange = event => {
        const design = event.target.value;
        this.setState({ design });
        setDesign(design);
        // Regenerar el tema MUI con la configuración del nuevo diseño
        ApplicationStore.emit('clientUpdateThemeChanging', {
            type: this.state.type,
            primary: this.getColor(this.state.color),
        });
    };

    getColorString = value => {
        switch (value) {
            case red['500']:
                return 'red';
            case orange['500']:
                return 'orange';
            case amber['500']:
                return 'amber';
            case green['500']:
                return 'green';
            case '#5B8AF1':
                return 'blue';
            case indigo['500']:
                return 'indigo';
            case deepPurple['500']:
                return 'deepPurple';
        }

        return 'blue';
    };

    getColor = value => {
        switch (value) {
            case 'red':
                return red;
            case 'orange':
                return orange;
            case 'amber':
                return amber;
            case 'green':
                return green;
            case 'blue':
                return { main: '#5B8AF1' };
            case 'indigo':
                return indigo;
            case 'deepPurple':
                return deepPurple;
        }

        return { main: '#5B8AF1' };
    };

    handleClose = () => {
        this.setState({ open: false, advanced: false });
    };

    open = () => {
        this.setState({ open: true, advanced: false });
    };

    render() {
        const { classes } = this.props;
        const { type, color, design } = this.state;

        const designOptions = [
            {
                value: 'current',
                label: 'Telegram Web',
                preview: {
                    sidebar: '#ffffff',
                    chatBg: '#f0f0f0',
                    bubble: '#eeffde',
                    bubbleTextOut: '#333',
                    bubbleIn: '#ffffff',
                    radius: '10px 10px 10px 0',
                    radiusOut: '10px 10px 0 10px',
                    font: 'Roboto',
                },
            },
            {
                value: 'webk',
                label: 'Telegram Web K',
                preview: {
                    sidebar: '#ffffff',
                    chatBg: '#f1f1f1',
                    bubble: '#eeffde',
                    bubbleTextOut: '#222222',
                    bubbleIn: '#ffffff',
                    radius: '12px 12px 12px 3px',
                    radiusOut: '12px 12px 3px 12px',
                    font: 'Roboto',
                },
            },
            {
                value: 'weba',
                label: 'Telegram Web A',
                preview: {
                    sidebar: '#ffffff',
                    chatBg: '#e6ebee',
                    bubble: '#efffde',
                    bubbleTextOut: '#1a1a1a',
                    bubbleIn: '#ffffff',
                    radius: '10px 10px 10px 3px',
                    radiusOut: '10px 10px 3px 10px',
                    font: 'Roboto',
                },
            },
            {
                value: 'android',
                label: 'Android v16',
                preview: {
                    sidebar: '#ffffff',
                    chatBg: '#d2dcc4',
                    bubble: '#efffde',
                    bubbleTextOut: '#202124',
                    bubbleIn: '#ffffff',
                    radius: '12px 12px 12px 4px',
                    radiusOut: '12px 12px 4px 12px',
                    font: 'Roboto',
                },
            },
            {
                value: 'android-glass',
                label: 'Android v15',
                preview: {
                    sidebar: 'rgba(255,255,255,0.78)',
                    chatBg: '#e9eff0',
                    bubble: 'rgba(239, 255, 222, 0.74)',
                    bubbleTextOut: '#162018',
                    bubbleIn: 'rgba(255,255,255,0.78)',
                    radius: '16px',
                    radiusOut: '16px',
                    font: 'Roboto',
                },
            },
            {
                value: 'android-redesign',
                label: 'Android v14',
                preview: {
                    sidebar: '#ffffff',
                    chatBg: '#d2dcc4',
                    bubble: '#efffde',
                    bubbleTextOut: '#202124',
                    bubbleIn: '#ffffff',
                    radius: '14px 14px 14px 4px',
                    radiusOut: '14px 14px 4px 14px',
                    font: 'Roboto',
                },
            },
            {
                value: 'android-classic',
                label: 'Android v13',
                preview: {
                    sidebar: '#ffffff',
                    chatBg: '#d6e3ec',
                    bubble: '#e1ffc7',
                    bubbleTextOut: '#202124',
                    bubbleIn: '#ffffff',
                    radius: '4px 4px 4px 0',
                    radiusOut: '4px 4px 0 4px',
                    font: 'Roboto',
                },
            },
            {
                value: 'webogram',
                label: 'Webogram',
                preview: {
                    sidebar: '#ffffff',
                    chatBg: '#e7ebf0',
                    bubble: '#dcf8c6',
                    bubbleTextOut: '#202020',
                    bubbleIn: '#ffffff',
                    radius: '3px',
                    radiusOut: '3px',
                    font: 'Helvetica Neue',
                },
            },
            {
                value: 'macos',
                label: 'macOS',
                preview: {
                    sidebar: '#f5f5f7',
                    chatBg: '#ffffff',
                    bubble: '#248bf2',
                    bubbleTextOut: '#ffffff',
                    bubbleIn: '#f1f1f3',
                    radius: '17px',
                    radiusOut: '17px',
                    font: '-apple-system',
                },
            },
            {
                value: 'tdesktop',
                label: 'TDesktop',
                preview: {
                    sidebar: '#ffffff',
                    chatBg: '#c8d8e8',
                    bubble: '#effdde',
                    bubbleTextOut: '#333',
                    bubbleIn: '#ffffff',
                    radius: '6px 6px 6px 0',
                    radiusOut: '6px 6px 0 6px',
                    font: 'Segoe UI',
                },
            },
            {
                value: 'unigram',
                label: 'Unigram',
                preview: {
                    sidebar: '#f7f9fb',
                    chatBg: '#eef3f8',
                    bubble: '#d7ecff',
                    bubbleTextOut: '#202020',
                    bubbleIn: '#ffffff',
                    radius: '6px',
                    radiusOut: '6px',
                    font: 'Segoe UI',
                },
            },
            {
                value: 'ios',
                label: 'iOS',
                preview: {
                    sidebar: '#f2f2f7',
                    chatBg: '#ffffff',
                    bubble: '#007aff',
                    bubbleTextOut: '#ffffff',
                    bubbleIn: '#e9e9eb',
                    radius: '18px 18px 18px 4px',
                    radiusOut: '18px 18px 4px 18px',
                    font: '-apple-system',
                },
            },
            {
                value: 'aurora',
                label: 'Aurora',
                preview: {
                    sidebar: '#161b22',
                    chatBg: '#0d1117',
                    bubble: '#1a3a2e',
                    bubbleTextOut: '#e6edf3',
                    bubbleIn: '#21262d',
                    radius: '14px 14px 14px 4px',
                    radiusOut: '14px 14px 4px 14px',
                    font: 'Manrope',
                },
            },
        ];

        return (
            <Dialog
                fullScreen
                transitionDuration={0}
                open={this.state.open}
                onClose={this.handleClose}
                PaperProps={{ className: 'appearance-center-dialog' }}
                aria-labelledby='alert-dialog-title'
                aria-describedby='alert-dialog-description'>
                {!this.state.advanced ? (
                    <AppearanceCenter
                        open={this.state.open}
                        design={design}
                        onClose={this.handleClose}
                        onSelectDesign={value => this.handleDesignChange({ target: { value } })}
                        onOpenAdvanced={() => this.setState({ advanced: true })}
                    />
                ) : (
                    <>
                <DialogTitle id='alert-dialog-title'>
                    <button
                        type='button'
                        aria-label='Volver al centro de apariencia'
                        onClick={() => this.setState({ advanced: false })}
                        style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 24, marginRight: 12 }}>
                        ‹
                    </button>
                    Ajustes avanzados de apariencia
                </DialogTitle>
                <DialogContent>
                    <FormControl component='fieldset' className={classes.formControl}>
                        <FormLabel focused component='legend'>
                            Theme
                        </FormLabel>
                        <RadioGroup
                            aria-label='theme'
                            name='theme1'
                            className={classes.group}
                            value={type}
                            onChange={this.handleChange}>
                            <FormControlLabel value='light' control={<Radio color='primary' />} label='Light' />
                            <FormControlLabel value='dark' control={<Radio color='primary' />} label='Dark' />
                        </RadioGroup>
                    </FormControl>
                    <FormControl component='fieldset' className={classes.formControl}>
                        <FormLabel focused component='legend'>
                            Accent
                        </FormLabel>
                        <RadioGroup
                            aria-label='accent'
                            name='accent1'
                            className={classes.group}
                            value={color}
                            onChange={this.handleAccentChange}>
                            <FormControlLabel
                                value='red'
                                control={
                                    <Radio
                                        color='primary'
                                        classes={{
                                            root: classes.redRoot,
                                            checked: classes.checked,
                                        }}
                                    />
                                }
                                label='Red'
                            />
                            <FormControlLabel
                                value='orange'
                                control={
                                    <Radio
                                        color='primary'
                                        classes={{
                                            root: classes.orangeRoot,
                                            checked: classes.checked,
                                        }}
                                    />
                                }
                                label='Orange'
                            />
                            <FormControlLabel
                                value='amber'
                                control={
                                    <Radio
                                        color='primary'
                                        classes={{
                                            root: classes.amberRoot,
                                            checked: classes.checked,
                                        }}
                                    />
                                }
                                label='Amber'
                            />
                            <FormControlLabel
                                value='green'
                                control={
                                    <Radio
                                        color='primary'
                                        classes={{
                                            root: classes.greenRoot,
                                            checked: classes.checked,
                                        }}
                                    />
                                }
                                label='Green'
                            />
                            <FormControlLabel
                                value='blue'
                                control={
                                    <Radio
                                        color='primary'
                                        classes={{
                                            root: classes.blueRoot,
                                            checked: classes.checked,
                                        }}
                                    />
                                }
                                label='Blue'
                            />
                            <FormControlLabel
                                value='indigo'
                                control={
                                    <Radio
                                        color='primary'
                                        classes={{
                                            root: classes.indigoRoot,
                                            checked: classes.checked,
                                        }}
                                    />
                                }
                                label='Indigo'
                            />
                            <FormControlLabel
                                value='deepPurple'
                                control={
                                    <Radio
                                        color='primary'
                                        classes={{
                                            root: classes.deepPurpleRoot,
                                            checked: classes.checked,
                                        }}
                                    />
                                }
                                label='Deep Purple'
                            />
                        </RadioGroup>
                    </FormControl>
                    <FormControl component='fieldset' className={classes.formControl}>
                        <FormLabel focused component='legend'>
                            Paleta de color
                        </FormLabel>
                        <PalettePicker />
                    </FormControl>
                    <FormControl component='fieldset' className={classes.formControl}>
                        <FormLabel focused component='legend'>
                            Diseño
                        </FormLabel>
                        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                            {designOptions.map(opt => {
                                const selected = design === opt.value;
                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => this.handleDesignChange({ target: { value: opt.value } })}
                                        style={{
                                            cursor: 'pointer',
                                            border: selected ? '2px solid #5b8af1' : '2px solid #e0e0e0',
                                            borderRadius: 10,
                                            overflow: 'hidden',
                                            width: 140,
                                            boxShadow: selected ? '0 0 0 2px rgba(91,138,241,0.25)' : 'none',
                                            transition: 'border-color 0.15s, box-shadow 0.15s',
                                        }}>
                                        {/* Mini preview */}
                                        <div style={{ display: 'flex', height: 80, fontSize: 0 }}>
                                            {/* Sidebar mini */}
                                            <div
                                                style={{
                                                    width: 38,
                                                    background: opt.preview.sidebar,
                                                    borderRight: '1px solid #e0e0e0',
                                                    padding: '6px 4px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 4,
                                                }}>
                                                {[20, 14, 17].map((w, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            height: 6,
                                                            width: `${w}px`,
                                                            background: '#ccc',
                                                            borderRadius: 3,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                            {/* Chat mini */}
                                            <div
                                                style={{
                                                    flex: 1,
                                                    background: opt.preview.chatBg || '#f0f0f0',
                                                    padding: '6px 5px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 4,
                                                }}>
                                                <div
                                                    style={{
                                                        alignSelf: 'flex-start',
                                                        background: opt.preview.bubbleIn,
                                                        borderRadius: opt.preview.radius,
                                                        padding: '3px 7px',
                                                        fontSize: 8,
                                                        color: '#555',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                    }}>
                                                    Hola
                                                </div>
                                                <div
                                                    style={{
                                                        alignSelf: 'flex-end',
                                                        background: opt.preview.bubble,
                                                        borderRadius: opt.preview.radiusOut,
                                                        padding: '3px 7px',
                                                        fontSize: 8,
                                                        color: opt.preview.bubbleTextOut || '#333',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                    }}>
                                                    Hola!
                                                </div>
                                                <div
                                                    style={{
                                                        alignSelf: 'flex-start',
                                                        background: opt.preview.bubbleIn,
                                                        borderRadius: opt.preview.radius,
                                                        padding: '3px 7px',
                                                        fontSize: 8,
                                                        color: '#555',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                                    }}>
                                                    😊
                                                </div>
                                            </div>
                                        </div>
                                        {/* Label */}
                                        <div
                                            style={{
                                                padding: '6px 8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                borderTop: '1px solid #e0e0e0',
                                                background: '#fafafa',
                                            }}>
                                            <div
                                                style={{
                                                    width: 14,
                                                    height: 14,
                                                    borderRadius: '50%',
                                                    border: selected ? '4px solid #5b8af1' : '2px solid #ccc',
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <Typography variant='caption' style={{ fontWeight: selected ? 600 : 400 }}>
                                                {opt.label}
                                            </Typography>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </FormControl>
                    <FormControl component='fieldset' className={classes.formControl}>
                        <DesignEditor />
                    </FormControl>
                    <FormControl component='fieldset' className={classes.formControl}>
                        <ThemeIO />
                    </FormControl>
                    <FormControl component='fieldset' className={classes.formControl}>
                        <ThemeShare />
                    </FormControl>
                    <FormControl component='fieldset' className={classes.formControl}>
                        <ChatBackground />
                    </FormControl>
                    <FormControl component='fieldset' className={classes.formControl}>
                        <ChatPatternPicker />
                    </FormControl>
                    <FormControl component='fieldset' className={classes.formControl}>
                        <DisplaySettings />
                    </FormControl>
                    <FormControl component='fieldset' className={classes.formControl}>
                        <PlusSettings />
                    </FormControl>
                    <FormControl component='fieldset' className={classes.formControl}>
                        <PlusInteractionSettings />
                    </FormControl>
                    <FormControl component='fieldset' className={classes.formControl}>
                        <AppearanceReset />
                    </FormControl>
                </DialogContent>
                    </>
                )}
            </Dialog>
        );
    }
}

ThemePicker.propTypes = {};

export default withStyles(styles, { withTheme: true })(ThemePicker);
