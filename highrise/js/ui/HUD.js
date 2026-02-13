/**
 * HUD.js - Main Heads-Up Display Overlay for The Highrise
 * TSI Enterprise 3D Command Center
 *
 * Creates HTML overlay elements on top of the Three.js canvas:
 * - Top bar: title, time, connection status
 * - Left sidebar: collapsible floor list with navigation
 * - Bottom bar: current floor info, agent count, system status
 * - Alert ticker: scrolling warnings at top
 *
 * All DOM elements are created programmatically. CSS classes use 'hr-' prefix.
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

// ---------------------------------------------------------------------------
// Floor data (inline reference so HUD works standalone)
// ---------------------------------------------------------------------------

const FLOOR_LIST = [
    { index: -2, id: 'power-station', name: 'POWER STATION', emoji: '\u26A1', type: 'enterprise', color: '#FF4444' },
    { index: -1, id: 'test-bunker', name: 'TEST BUNKER', emoji: '\uD83D\uDD2C', type: 'enterprise', color: '#666666' },
    { index: 1,  id: 'lobby', name: 'LOBBY', emoji: '\uD83C\uDFDB\uFE0F', type: 'enterprise', color: '#D4AF37' },
    { index: 2,  id: 'water-cooler', name: 'WATER COOLER', emoji: '\uD83D\uDDE3\uFE0F', type: 'social', color: '#5DADE2' },
    { index: 3,  id: 'onboarding', name: 'ONBOARDING EXPO', emoji: '\uD83C\uDFD7\uFE0F', type: 'social', color: '#58D68D' },
    { index: 4,  id: 'translatorstitan', name: 'TranslatorsTitan', emoji: '\uD83D\uDE80', type: 'project', color: '#BDC3C7' },
    { index: 5,  id: 'machinistzen', name: 'MachinistZen', emoji: '\uD83D\uDD27', type: 'project', color: '#95A5A6' },
    { index: 6,  id: 'realworldprizes', name: 'RealWorldPrizes', emoji: '\uD83C\uDFC6', type: 'project', color: '#F39C12' },
    { index: 7,  id: 'quantumledger', name: 'QuantumLedger', emoji: '\u269B\uFE0F', type: 'project', color: '#8E44AD' },
    { index: 8,  id: 'parlorgames', name: 'ParlorGames', emoji: '\uD83C\uDFB2', type: 'project', color: '#9B59B6' },
    { index: 9,  id: 'onthewayhome', name: 'OnTheWayHome', emoji: '\uD83C\uDFE0', type: 'project', color: '#1ABC9C' },
    { index: 10, id: 'autozen', name: 'AutoZen', emoji: '\uD83D\uDE97', type: 'project', color: '#3498DB' },
    { index: 11, id: 'ideallearning', name: 'IdealLearning', emoji: '\uD83D\uDCDA', type: 'project', color: '#2ECC71' },
    { index: 12, id: 'guestofhonor', name: 'GuestOfHonor', emoji: '\uD83C\uDFA9', type: 'project', color: '#FFD700' },
    { index: 13, id: 'charitypats', name: 'CharityPats', emoji: '\uD83D\uDC3E', type: 'project', color: '#E74C3C' },
    { index: 14, id: 'clieair', name: 'CLIEAIR', emoji: '\uD83E\uDD16', type: 'project', color: '#4A90D9' },
    { index: 15, id: 'tsiapp', name: 'TSIAPP', emoji: '\uD83E\uDD86', type: 'project', color: '#FF6600' },
    { index: 16, id: 'finance', name: 'ENTERPRISE FINANCE', emoji: '\uD83D\uDCB0', type: 'enterprise', color: '#27AE60' },
    { index: 17, id: 'rnd', name: 'ENTERPRISE R&D', emoji: '\uD83D\uDD2C', type: 'enterprise', color: '#2980B9' },
    { index: 18, id: 'legal', name: 'ENTERPRISE LEGAL', emoji: '\u2696\uFE0F', type: 'enterprise', color: '#8B4513' },
    { index: 19, id: 'security', name: 'ENTERPRISE SECURITY', emoji: '\uD83D\uDD12', type: 'enterprise', color: '#C0392B' },
    { index: 20, id: 'observation', name: 'OBSERVATION DECK', emoji: '\u2601\uFE0F', type: 'enterprise', color: '#3498DB' },
];

// ---------------------------------------------------------------------------
// Style injection
// ---------------------------------------------------------------------------

function _injectStyles() {
    if (document.getElementById('hr-hud-styles')) return;

    const style = document.createElement('style');
    style.id = 'hr-hud-styles';
    style.textContent = `
        /* ---- HUD Container ---- */
        .hr-hud {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            pointer-events: none;
            z-index: 50;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            color: #c0d0e8;
            user-select: none;
        }
        .hr-hud * {
            box-sizing: border-box;
        }

        /* ---- Top Bar ---- */
        .hr-top-bar {
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            background: linear-gradient(180deg, rgba(6,10,22,0.92) 0%, rgba(6,10,22,0.7) 100%);
            border-bottom: 1px solid rgba(74,144,217,0.25);
            backdrop-filter: blur(8px);
            pointer-events: auto;
        }
        .hr-top-title {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 3px;
            color: #4A90D9;
            text-transform: uppercase;
        }
        .hr-top-title span {
            color: #667a90;
            font-weight: 400;
        }
        .hr-top-center {
            font-size: 12px;
            color: #8899aa;
            letter-spacing: 1px;
        }
        .hr-top-right {
            display: flex;
            align-items: center;
            gap: 16px;
            font-size: 11px;
        }
        .hr-conn-status {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .hr-conn-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #2ECC71;
            box-shadow: 0 0 6px rgba(46,204,113,0.6);
            transition: background 0.3s, box-shadow 0.3s;
        }
        .hr-conn-dot.warning {
            background: #F39C12;
            box-shadow: 0 0 6px rgba(243,156,18,0.6);
        }
        .hr-conn-dot.error {
            background: #E74C3C;
            box-shadow: 0 0 6px rgba(231,76,60,0.6);
        }
        .hr-conn-dot.offline {
            background: #555;
            box-shadow: none;
        }

        /* ---- Alert Ticker ---- */
        .hr-alert-ticker {
            position: absolute;
            top: 44px; left: 0; right: 0;
            height: 28px;
            overflow: hidden;
            background: rgba(231,76,60,0.12);
            border-bottom: 1px solid rgba(231,76,60,0.3);
            display: none;
            align-items: center;
        }
        .hr-alert-ticker.active {
            display: flex;
        }
        .hr-alert-track {
            display: flex;
            align-items: center;
            white-space: nowrap;
            animation: hr-ticker-scroll 20s linear infinite;
            font-size: 11px;
            color: #F5B041;
            letter-spacing: 0.5px;
        }
        .hr-alert-item {
            padding: 0 40px;
        }
        .hr-alert-item::before {
            content: '\\25B6 ';
            color: #E74C3C;
            margin-right: 6px;
        }
        @keyframes hr-ticker-scroll {
            0%   { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
        }

        /* ---- Left Sidebar ---- */
        .hr-sidebar {
            position: absolute;
            top: 50px;
            left: 0;
            bottom: 50px;
            width: 220px;
            background: rgba(6,10,22,0.88);
            border-right: 1px solid rgba(74,144,217,0.2);
            backdrop-filter: blur(8px);
            overflow-y: auto;
            overflow-x: hidden;
            transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s;
            pointer-events: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(74,144,217,0.3) transparent;
        }
        .hr-sidebar::-webkit-scrollbar {
            width: 4px;
        }
        .hr-sidebar::-webkit-scrollbar-track {
            background: transparent;
        }
        .hr-sidebar::-webkit-scrollbar-thumb {
            background: rgba(74,144,217,0.3);
            border-radius: 2px;
        }
        .hr-sidebar.collapsed {
            transform: translateX(-220px);
        }
        .hr-sidebar-toggle {
            position: absolute;
            top: 55px;
            left: 220px;
            width: 24px;
            height: 40px;
            background: rgba(6,10,22,0.85);
            border: 1px solid rgba(74,144,217,0.3);
            border-left: none;
            border-radius: 0 6px 6px 0;
            color: #4A90D9;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
            transition: left 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .hr-sidebar-toggle:hover {
            background: rgba(74,144,217,0.15);
        }
        .hr-sidebar.collapsed + .hr-sidebar-toggle {
            left: 0;
        }
        .hr-sidebar-header {
            padding: 10px 14px;
            font-size: 10px;
            letter-spacing: 2px;
            color: #4A90D9;
            border-bottom: 1px solid rgba(74,144,217,0.15);
            text-transform: uppercase;
        }
        .hr-floor-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 7px 14px;
            cursor: pointer;
            font-size: 11px;
            border-left: 2px solid transparent;
            transition: background 0.15s, border-color 0.15s;
        }
        .hr-floor-item:hover {
            background: rgba(74,144,217,0.08);
            border-left-color: rgba(74,144,217,0.4);
        }
        .hr-floor-item.active {
            background: rgba(74,144,217,0.12);
            border-left-color: #4A90D9;
            color: #e0e8f0;
        }
        .hr-floor-emoji {
            font-size: 14px;
            width: 22px;
            text-align: center;
            flex-shrink: 0;
        }
        .hr-floor-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .hr-floor-idx {
            margin-left: auto;
            color: #445566;
            font-size: 9px;
            flex-shrink: 0;
        }

        /* ---- Bottom Bar ---- */
        .hr-bottom-bar {
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            background: linear-gradient(0deg, rgba(6,10,22,0.92) 0%, rgba(6,10,22,0.7) 100%);
            border-top: 1px solid rgba(74,144,217,0.2);
            backdrop-filter: blur(8px);
            font-size: 11px;
            pointer-events: auto;
        }
        .hr-bottom-floor {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .hr-bottom-floor-name {
            color: #e0e8f0;
            font-weight: 600;
        }
        .hr-bottom-floor-emoji {
            font-size: 16px;
        }
        .hr-bottom-agents {
            color: #8899aa;
        }
        .hr-bottom-agents strong {
            color: #4A90D9;
        }
        .hr-bottom-status {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #667a90;
        }
        .hr-bottom-status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #2ECC71;
        }
    `;
    document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// HUD class
// ---------------------------------------------------------------------------

export class HUD {
    constructor() {
        /** @type {HTMLElement|null} */
        this._root = null;
        this._topBar = null;
        this._alertTicker = null;
        this._alertTrack = null;
        this._sidebar = null;
        this._sidebarToggle = null;
        this._bottomBar = null;
        this._timeEl = null;
        this._connDot = null;
        this._connLabel = null;
        this._floorNameEl = null;
        this._floorEmojiEl = null;
        this._agentCountEl = null;
        this._statusDot = null;
        this._statusLabel = null;

        this._visible = true;
        this._sidebarCollapsed = false;
        this._currentFloorIndex = null;
        this._alerts = [];
        this._clockInterval = null;
        this._floorItems = [];
        this._unsubscribers = [];

        _injectStyles();
        this._build();
        this._bindEvents();
        this._startClock();
    }

    // -----------------------------------------------------------------------
    // DOM Construction
    // -----------------------------------------------------------------------

    _build() {
        // Root container
        this._root = document.createElement('div');
        this._root.className = 'hr-hud';
        this._root.id = 'hr-hud';

        this._buildTopBar();
        this._buildAlertTicker();
        this._buildSidebar();
        this._buildBottomBar();

        document.body.appendChild(this._root);
    }

    _buildTopBar() {
        const bar = document.createElement('div');
        bar.className = 'hr-top-bar';

        // Title
        const title = document.createElement('div');
        title.className = 'hr-top-title';
        title.innerHTML = 'TSI ENTERPRISE <span>\u2014 THE HIGHRISE</span>';

        // Center time
        const center = document.createElement('div');
        center.className = 'hr-top-center';
        this._timeEl = center;

        // Right: connection status
        const right = document.createElement('div');
        right.className = 'hr-top-right';

        const conn = document.createElement('div');
        conn.className = 'hr-conn-status';

        this._connDot = document.createElement('div');
        this._connDot.className = 'hr-conn-dot';

        this._connLabel = document.createElement('span');
        this._connLabel.textContent = 'CONNECTED';
        this._connLabel.style.cssText = 'color:#8899aa;letter-spacing:1px;';

        conn.appendChild(this._connDot);
        conn.appendChild(this._connLabel);
        right.appendChild(conn);

        bar.appendChild(title);
        bar.appendChild(center);
        bar.appendChild(right);

        this._topBar = bar;
        this._root.appendChild(bar);
    }

    _buildAlertTicker() {
        const ticker = document.createElement('div');
        ticker.className = 'hr-alert-ticker';

        const track = document.createElement('div');
        track.className = 'hr-alert-track';

        ticker.appendChild(track);
        this._alertTicker = ticker;
        this._alertTrack = track;
        this._root.appendChild(ticker);
    }

    _buildSidebar() {
        const sidebar = document.createElement('div');
        sidebar.className = 'hr-sidebar';

        // Header
        const header = document.createElement('div');
        header.className = 'hr-sidebar-header';
        header.textContent = 'FLOORS';
        sidebar.appendChild(header);

        // Floor list (top floor first)
        const sortedFloors = [...FLOOR_LIST].sort((a, b) => b.index - a.index);
        this._floorItems = [];

        sortedFloors.forEach(floor => {
            const item = document.createElement('div');
            item.className = 'hr-floor-item';
            item.dataset.floorIndex = floor.index;

            const emoji = document.createElement('span');
            emoji.className = 'hr-floor-emoji';
            emoji.textContent = floor.emoji;

            const name = document.createElement('span');
            name.className = 'hr-floor-name';
            name.textContent = floor.name;

            const idx = document.createElement('span');
            idx.className = 'hr-floor-idx';
            idx.textContent = floor.index <= 0 ? `B${Math.abs(floor.index) + 1}` : `F${floor.index}`;

            item.appendChild(emoji);
            item.appendChild(name);
            item.appendChild(idx);

            item.addEventListener('click', () => {
                eventBus.emit('hud:floorClick', { floorIndex: floor.index, floor });
                eventBus.emit('elevator:navigate', { floorIndex: floor.index });
            });

            sidebar.appendChild(item);
            this._floorItems.push({ el: item, index: floor.index });
        });

        this._sidebar = sidebar;
        this._root.appendChild(sidebar);

        // Toggle button
        const toggle = document.createElement('div');
        toggle.className = 'hr-sidebar-toggle';
        toggle.textContent = '\u25C0';
        toggle.addEventListener('click', () => this._toggleSidebar());
        this._sidebarToggle = toggle;
        this._root.appendChild(toggle);
    }

    _buildBottomBar() {
        const bar = document.createElement('div');
        bar.className = 'hr-bottom-bar';

        // Left: current floor
        const floorSection = document.createElement('div');
        floorSection.className = 'hr-bottom-floor';

        this._floorEmojiEl = document.createElement('span');
        this._floorEmojiEl.className = 'hr-bottom-floor-emoji';
        this._floorEmojiEl.textContent = '\uD83C\uDFDB\uFE0F';

        this._floorNameEl = document.createElement('span');
        this._floorNameEl.className = 'hr-bottom-floor-name';
        this._floorNameEl.textContent = 'LOBBY';

        floorSection.appendChild(this._floorEmojiEl);
        floorSection.appendChild(this._floorNameEl);

        // Center: agent count
        this._agentCountEl = document.createElement('div');
        this._agentCountEl.className = 'hr-bottom-agents';
        this._agentCountEl.innerHTML = 'Agents: <strong>0</strong>';

        // Right: system status
        const statusSection = document.createElement('div');
        statusSection.className = 'hr-bottom-status';

        this._statusDot = document.createElement('div');
        this._statusDot.className = 'hr-bottom-status-dot';

        this._statusLabel = document.createElement('span');
        this._statusLabel.textContent = 'ALL SYSTEMS NOMINAL';

        statusSection.appendChild(this._statusDot);
        statusSection.appendChild(this._statusLabel);

        bar.appendChild(floorSection);
        bar.appendChild(this._agentCountEl);
        bar.appendChild(statusSection);

        this._bottomBar = bar;
        this._root.appendChild(bar);
    }

    // -----------------------------------------------------------------------
    // Event Binding
    // -----------------------------------------------------------------------

    _bindEvents() {
        // Keyboard: H to toggle HUD
        const keyHandler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'H' || e.key === 'h') {
                if (this._visible) this.hide(); else this.show();
            }
        };
        document.addEventListener('keydown', keyHandler);
        this._unsubscribers.push(() => document.removeEventListener('keydown', keyHandler));

        // State changes
        const unsub1 = eventBus.on('state:currentFloor', ({ value }) => {
            if (value !== null && value !== undefined) {
                this._setActiveFloor(value);
            }
        });
        this._unsubscribers.push(unsub1);

        const unsub2 = eventBus.on('camera:zoomToFloor', ({ floorIndex }) => {
            this._setActiveFloor(floorIndex);
        });
        this._unsubscribers.push(unsub2);

        const unsub3 = eventBus.on('registry:statusChanged', () => {
            this._refreshAgentCount();
        });
        this._unsubscribers.push(unsub3);

        const unsub4 = eventBus.on('alert:new', ({ message }) => {
            this.addAlert(message);
        });
        this._unsubscribers.push(unsub4);

        const unsub5 = eventBus.on('connection:statusChanged', ({ status }) => {
            this.setConnectionStatus(status);
        });
        this._unsubscribers.push(unsub5);
    }

    // -----------------------------------------------------------------------
    // Internal Helpers
    // -----------------------------------------------------------------------

    _startClock() {
        const tick = () => {
            if (this._timeEl) {
                const now = new Date();
                const h = String(now.getHours()).padStart(2, '0');
                const m = String(now.getMinutes()).padStart(2, '0');
                const s = String(now.getSeconds()).padStart(2, '0');
                this._timeEl.textContent = `${h}:${m}:${s}`;
            }
        };
        tick();
        this._clockInterval = setInterval(tick, 1000);
    }

    _toggleSidebar() {
        this._sidebarCollapsed = !this._sidebarCollapsed;
        if (this._sidebarCollapsed) {
            this._sidebar.classList.add('collapsed');
            this._sidebarToggle.textContent = '\u25B6';
            this._sidebarToggle.style.left = '0';
        } else {
            this._sidebar.classList.remove('collapsed');
            this._sidebarToggle.textContent = '\u25C0';
            this._sidebarToggle.style.left = '220px';
        }
    }

    _setActiveFloor(floorIndex) {
        this._currentFloorIndex = floorIndex;

        // Update sidebar highlight
        this._floorItems.forEach(({ el, index }) => {
            if (index === floorIndex) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });

        // Update bottom bar
        const floorData = FLOOR_LIST.find(f => f.index === floorIndex);
        if (floorData) {
            this._floorEmojiEl.textContent = floorData.emoji;
            this._floorNameEl.textContent = floorData.name;
        }

        this._refreshAgentCount();
    }

    _refreshAgentCount() {
        const agents = stateManager.get('agents') || {};
        let count = 0;
        if (this._currentFloorIndex !== null) {
            Object.values(agents).forEach(a => {
                if (a.floor === this._currentFloorIndex) count++;
            });
        }
        if (this._agentCountEl) {
            this._agentCountEl.innerHTML = `Agents: <strong>${count}</strong>`;
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Show the HUD overlay.
     */
    show() {
        this._visible = true;
        if (this._root) this._root.style.display = '';
        eventBus.emit('hud:visible', { visible: true });
    }

    /**
     * Hide the HUD overlay.
     */
    hide() {
        this._visible = false;
        if (this._root) this._root.style.display = 'none';
        eventBus.emit('hud:visible', { visible: false });
    }

    /**
     * Update floor info displayed in the bottom bar.
     * @param {{ name?: string, emoji?: string, agentCount?: number }} floorData
     */
    updateFloorInfo(floorData) {
        if (!floorData) return;
        if (floorData.emoji && this._floorEmojiEl) {
            this._floorEmojiEl.textContent = floorData.emoji;
        }
        if (floorData.name && this._floorNameEl) {
            this._floorNameEl.textContent = floorData.name;
        }
        if (floorData.agentCount !== undefined && this._agentCountEl) {
            this._agentCountEl.innerHTML = `Agents: <strong>${floorData.agentCount}</strong>`;
        }
    }

    /**
     * Add a scrolling alert to the ticker.
     * @param {string} msg
     */
    addAlert(msg) {
        this._alerts.push({ msg, time: Date.now() });

        // Keep last 10 alerts
        if (this._alerts.length > 10) {
            this._alerts = this._alerts.slice(-10);
        }

        // Rebuild ticker track
        this._alertTrack.innerHTML = '';
        this._alerts.forEach(a => {
            const item = document.createElement('span');
            item.className = 'hr-alert-item';
            item.textContent = a.msg;
            this._alertTrack.appendChild(item);
        });

        this._alertTicker.classList.add('active');

        // Auto-hide after 30 seconds if no new alerts
        clearTimeout(this._alertTimeout);
        this._alertTimeout = setTimeout(() => {
            this._alertTicker.classList.remove('active');
        }, 30000);
    }

    /**
     * Set the connection status indicator.
     * @param {'connected'|'warning'|'error'|'offline'} status
     */
    setConnectionStatus(status) {
        if (!this._connDot || !this._connLabel) return;

        this._connDot.className = 'hr-conn-dot';
        switch (status) {
            case 'connected':
                this._connDot.classList.add('');
                this._connLabel.textContent = 'CONNECTED';
                break;
            case 'warning':
                this._connDot.classList.add('warning');
                this._connLabel.textContent = 'DEGRADED';
                break;
            case 'error':
                this._connDot.classList.add('error');
                this._connLabel.textContent = 'ERROR';
                break;
            case 'offline':
                this._connDot.classList.add('offline');
                this._connLabel.textContent = 'OFFLINE';
                break;
            default:
                this._connLabel.textContent = status.toUpperCase();
        }
    }

    /**
     * Clean up all event listeners and DOM elements.
     */
    dispose() {
        this._unsubscribers.forEach(fn => { if (typeof fn === 'function') fn(); });
        this._unsubscribers = [];
        clearInterval(this._clockInterval);
        clearTimeout(this._alertTimeout);
        if (this._root && this._root.parentNode) {
            this._root.parentNode.removeChild(this._root);
        }
    }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

let _instance = null;

export function createHUD() {
    if (!_instance) _instance = new HUD();
    return _instance;
}

export default { HUD, createHUD };
