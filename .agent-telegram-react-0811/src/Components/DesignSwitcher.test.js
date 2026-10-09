import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { EventEmitter } from 'events';

vi.mock('../Stores/ApplicationStore', () => ({ default: new EventEmitter() }));

import ApplicationStore from '../Stores/ApplicationStore';
import DesignSwitcher from './DesignSwitcher';

describe('DesignSwitcher', () => {
    let container;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        localStorage.clear();
    });

    afterEach(() => {
        act(() => ReactDOM.unmountComponentAtNode(container));
        container.remove();
    });

    it('reflects a design version selected from another interface', () => {
        localStorage.setItem('tg_design', 'current');
        act(() => ReactDOM.render(<DesignSwitcher />, container));

        localStorage.setItem('tg_design', 'webk-2025');
        act(() => ApplicationStore.emit('clientUpdateThemeChange'));

        expect(container.textContent).toContain('Telegram Web K');
        expect(container.textContent).not.toContain('webk-2025');
    });
});
