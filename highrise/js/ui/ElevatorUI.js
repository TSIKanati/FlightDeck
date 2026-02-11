/**
 * ElevatorUI.js - Floor Navigation Elevator Control for The Highrise
 * TSI Enterprise 3D Command Center
 *
 * Vertical strip on the left edge showing an elevator shaft with floor markers.
 * Click any floor marker to navigate camera there. Keyboard shortcuts supported.
 * Smooth animation of the current floor indicator.
 *
 * All DOM elements created programmatically. CSS classes use 'hr-' prefix.
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

// ---------------------------------------------------------------------------
// Floor reference data
// ---------------------------------------------------------------------------

const FLOORS = [
    { index: -2, id: 'power-station',    name: 'PWR',    emoji: '\u26A1',         color: '#FF4444' },
    { index: -1, id: 'test-bunker',      name: 'TEST',   emoji: '\uD83D\uDD2C',  color: '#666666' },
    { index: 1,  id: 'lobby',            name: 'LOBBY',  emoji: '\uD83C\uDFDB\uFE0F', color: '#D4AF37' },
    { index: 2,  id: 'water-cooler',     name: 'H2O',    emoji: '\uD83D\uDDE3\uFE0F', color: '#5DADE2' },
    { index: 3,  id: 'onboarding',       name: 'ONBRD',  emoji: '\uD83C\uDFD7\uFE0F', color: '#58D68D' },
    { index: 4,  id: 'translatorstitan', name: 'TT',     emoji: '\uD83D\uDE80',  color: '#BDC3C7' },
    { index: 5,  id: 'machinistzen',     name: 'MZ',     emoji: '\uD83D\uDD27',  color: '#95A5A6' },
    { index: 6,  id: 'realworldprizes',  name: 'RWP',    emoji: '\uD83C\uDFC6',  color: '#F39C12' },
    { index: 7,  id: 'quantumledger',    name: 'QL',     emoji: '\u269B\uFE0F',  color: '#8E44AD' },
    { index: 8,  id: 'parlorgames',      name: 'PG',     emoji: '\uD83C\uDFB2',  color: '#9B59B6' },
    { index: 9,  id: 'onthewayhome',     name: 'OTWH',   emoji: '\uD83C\uDFE0',  color: '#1ABC9C' },
    { index: 10, id: 'autozen',          name: 'AZ',     emoji: '\uD83D\uDE97',  color: '#3498DB' },
    { index: 11, id: 'ideallearning',    name: 'IL',     emoji: '\uD83D\uDCDA',  color: '#2ECC71' },
    { index: 12, id: 'guestofhonor',     name: 'GOH',    emoji: '\uD83C\uDFA9',  color: '#FFD700' },
    { index: 13, id: 'charitypats',      name: 'CP',     emoji: '\uD83D\uDC3E',  color: '#E74C3C' },
    { index: 14, id: 'clieair',          name: 'CLIE',   emoji: '\uD83E\uDD16',  color: '#4A90D9' },
    { index: 15, id: 'tsiapp',           name: 'TSI',    emoji: '\uD83E\uDD86',  color: '#FF6600' },
    { index: 16, id: 'finance',          name: 'FIN',    emoji: '\uD83D\uDCB0',  color: '#27AE60' },
    { index: 17, id: 'rnd',              name: 'R&D',    emoji: '\uD83D\uDD2C',  color: '#2980B9' },
    { index: 18, id: 'legal',            name: 'LAW',    emoji: '\u2696\uFE0F',  color: '#8B4513' },
    { index: 19, id: 'security',         name: 'SEC',    emoji: '\uD83D\uDD12',  color: '#C0392B' },
    { index: 20, id: 'observation',      name: 'OBS',    emoji: '\u2601\uFE0F',  color: '#3498DB' },
];

// Sorted bottom-to-top for visual layout (highest index at top)
const FLOORS_SORTED = [...FLOORS].sort((a, b) => b.index - a.index);

// Quick lookup
const FLOOR_BY_INDEX = {};
FLOORS.forEach(f => { FLOOR_BY_INDEX[f.index] = f; });

const LOBBY_INDEX = 1;
const TOP_INDEX = 20;

// ---------------------------------------------------------------------------
// Style injection
// ---------------------------------------------------------------------------

function _injectStyles() {
    if (document.getElementById('hr-elevator-styles')) return;

    const style = document.createElement('style');
    style.id = 'hr-elevator-styles';
    style.textContent = `
        .hr-elevator {
            position: fixed;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 46px;
            z-index: 55;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            user-select: none;
            pointer-events: auto;
        }

        /* Shaft background */
        .hr-elev-shaft {
            position: relative;
            width: 100%;
            background: rgba(6,10,22,0.85);
            border-right: 1px solid rgba(74,144,217,0.25);
            border-radius: 0 8px 8px 0;
            backdrop-filter: blur(6px);
            padding: 6px 0;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        /* Floor marker */
        .hr-elev-marker {
            position: relative;
            width: 36px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 3px;
            margin: 1px 0;
            transition: background 0.15s, transform 0.15s;
        }
        .hr-elev-marker:hover {
            background: rgba(74,144,217,0.15);
            transform: scale(1.08);
        }
        .hr-elev-marker.active {
            background: rgba(74,144,217,0.25);
        }
        .hr-elev-marker-emoji {
            font-size: 12px;
            line-height: 1;
        }

        /* Current floor indicator (the elevator car) */
        .hr-elev-car {
            position: absolute;
            left: 0;
            width: 46px;
            height: 24px;
            border: 1px solid rgba(74,144,217,0.6);
            border-radius: 4px;
            background: rgba(74,144,217,0.12);
            box-shadow: 0 0 10px rgba(74,144,217,0.25), inset 0 0 6px rgba(74,144,217,0.1);
            pointer-events: none;
            transition: top 0.4s cubic-bezier(0.4,0,0.2,1);
            z-index: 2;
        }
        .hr-elev-car::after {
            content: '';
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 2px;
            background: #4A90D9;
            border-radius: 1px;
            box-shadow: 0 0 4px rgba(74,144,217,0.6);
        }

        /* Tooltip */
        .hr-elev-tooltip {
            position: absolute;
            left: 52px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(10,15,30,0.95);
            border: 1px solid rgba(74,144,217,0.4);
            border-radius: 4px;
            padding: 4px 10px;
            font-size: 10px;
            color: #c0d0e8;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s;
            z-index: 10;
            backdrop-filter: blur(4px);
        }
        .hr-elev-marker:hover .hr-elev-tooltip {
            opacity: 1;
        }

        /* Express buttons */
        .hr-elev-express {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            margin-top: 6px;
        }
        .hr-elev-express-btn {
            width: 36px;
            height: 20px;
            border: 1px solid rgba(74,144,217,0.3);
            border-radius: 3px;
            background: rgba(74,144,217,0.06);
            color: #4A90D9;
            font-family: inherit;
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 1px;
            cursor: pointer;
            transition: background 0.15s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .hr-elev-express-btn:hover {
            background: rgba(74,144,217,0.2);
        }

        /* Rail line */
        .hr-elev-rail {
            position: absolute;
            left: 22px;
            top: 6px;
            bottom: 6px;
            width: 1px;
            background: rgba(74,144,217,0.12);
            pointer-events: none;
            z-index: 0;
        }
    `;
    document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// ElevatorUI class
// ---------------------------------------------------------------------------

export class ElevatorUI {
    constructor() {
        this._root = null;
        this._shaft = null;
        this._car = null;
        this._markers = [];      // [{el, index}]
        this._currentIndex = 1;  // Start at lobby
        this._unsubscribers = [];

        _injectStyles();
        this._build();
        this._bindEvents();
    }

    // -----------------------------------------------------------------------
    // DOM Construction
    // -----------------------------------------------------------------------

    _build() {
        this._root = document.createElement('div');
        this._root.className = 'hr-elevator';
        this._root.id = 'hr-elevator';

        const shaft = document.createElement('div');
        shaft.className = 'hr-elev-shaft';

        // Rail line
        const rail = document.createElement('div');
        rail.className = 'hr-elev-rail';
        shaft.appendChild(rail);

        // Elevator car indicator (positioned absolutely)
        this._car = document.createElement('div');
        this._car.className = 'hr-elev-car';
        shaft.appendChild(this._car);

        // Floor markers (top to bottom, highest first)
        this._markers = [];
        FLOORS_SORTED.forEach(floor => {
            const marker = document.createElement('div');
            marker.className = 'hr-elev-marker';
            marker.dataset.index = floor.index;

            const emoji = document.createElement('span');
            emoji.className = 'hr-elev-marker-emoji';
            emoji.textContent = floor.emoji;

            // Tooltip
            const tooltip = document.createElement('div');
            tooltip.className = 'hr-elev-tooltip';
            const floorLabel = floor.index <= 0 ? `B${Math.abs(floor.index) + 1}` : `F${floor.index}`;
            tooltip.textContent = `${floorLabel} ${floor.name}`;

            marker.appendChild(emoji);
            marker.appendChild(tooltip);

            marker.addEventListener('click', () => {
                this.navigateToFloor(floor.index);
            });

            shaft.appendChild(marker);
            this._markers.push({ el: marker, index: floor.index });
        });

        this._shaft = shaft;
        this._root.appendChild(shaft);

        // Express buttons
        const express = document.createElement('div');
        express.className = 'hr-elev-express';

        const btnTop = document.createElement('button');
        btnTop.className = 'hr-elev-express-btn';
        btnTop.textContent = 'TOP';
        btnTop.title = 'Observation Deck (T)';
        btnTop.addEventListener('click', () => this.navigateToFloor(TOP_INDEX));

        const btnLobby = document.createElement('button');
        btnLobby.className = 'hr-elev-express-btn';
        btnLobby.textContent = 'LBY';
        btnLobby.title = 'Lobby (L)';
        btnLobby.addEventListener('click', () => this.navigateToFloor(LOBBY_INDEX));

        express.appendChild(btnTop);
        express.appendChild(btnLobby);
        shaft.appendChild(express);

        document.body.appendChild(this._root);

        // Initial car position
        requestAnimationFrame(() => this._updateCarPosition());
    }

    // -----------------------------------------------------------------------
    // Car positioning
    // -----------------------------------------------------------------------

    _updateCarPosition() {
        if (!this._car || !this._markers.length) return;

        // Find the marker element for current index
        const markerInfo = this._markers.find(m => m.index === this._currentIndex);
        if (markerInfo && markerInfo.el) {
            const shaftRect = this._shaft.getBoundingClientRect();
            const markerRect = markerInfo.el.getBoundingClientRect();
            const top = markerRect.top - shaftRect.top - 1;
            this._car.style.top = `${top}px`;
        }

        // Update active state on markers
        this._markers.forEach(({ el, index }) => {
            if (index === this._currentIndex) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    // -----------------------------------------------------------------------
    // Navigation
    // -----------------------------------------------------------------------

    _getAdjacentFloor(direction) {
        // direction: 1 = up, -1 = down
        // Find the next valid floor index
        const sortedIndices = FLOORS.map(f => f.index).sort((a, b) => a - b);
        const currentPos = sortedIndices.indexOf(this._currentIndex);

        if (currentPos === -1) {
            // Current index not in list; snap to nearest
            return direction > 0 ? sortedIndices[0] : sortedIndices[sortedIndices.length - 1];
        }

        const nextPos = currentPos + direction;
        if (nextPos < 0 || nextPos >= sortedIndices.length) return this._currentIndex;
        return sortedIndices[nextPos];
    }

    // -----------------------------------------------------------------------
    // Event Binding
    // -----------------------------------------------------------------------

    _bindEvents() {
        // Keyboard navigation
        const keyHandler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateToFloor(this._getAdjacentFloor(1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateToFloor(this._getAdjacentFloor(-1));
                    break;
                case 'L':
                case 'l':
                    this.navigateToFloor(LOBBY_INDEX);
                    break;
                case 'T':
                case 't':
                    this.navigateToFloor(TOP_INDEX);
                    break;
            }
        };
        document.addEventListener('keydown', keyHandler);
        this._unsubscribers.push(() => document.removeEventListener('keydown', keyHandler));

        // Listen for camera-driven floor changes
        const unsub1 = eventBus.on('state:currentFloor', ({ value }) => {
            if (value !== null && value !== undefined) {
                this.setCurrentFloor(value);
            }
        });
        this._unsubscribers.push(unsub1);

        const unsub2 = eventBus.on('camera:zoomToFloor', ({ floorIndex }) => {
            this.setCurrentFloor(floorIndex);
        });
        this._unsubscribers.push(unsub2);

        // Window resize: reposition car
        const resizeHandler = () => this._updateCarPosition();
        window.addEventListener('resize', resizeHandler);
        this._unsubscribers.push(() => window.removeEventListener('resize', resizeHandler));
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Set the current floor indicator position (does NOT navigate camera).
     * @param {number} index - Floor index
     */
    setCurrentFloor(index) {
        if (this._currentIndex === index) return;
        this._currentIndex = index;
        this._updateCarPosition();
    }

    /**
     * Navigate camera to a floor and update the indicator.
     * @param {number} index - Floor index
     */
    navigateToFloor(index) {
        if (!FLOOR_BY_INDEX[index]) return;

        this._currentIndex = index;
        this._updateCarPosition();

        // Emit event for CameraController to pick up
        eventBus.emit('elevator:navigate', { floorIndex: index });

        // Also update state
        stateManager.set('currentFloor', index);
    }

    /**
     * Highlight a floor marker briefly (visual flash).
     * @param {number} index
     */
    highlight(index) {
        const markerInfo = this._markers.find(m => m.index === index);
        if (!markerInfo) return;

        const el = markerInfo.el;
        el.style.background = 'rgba(74,144,217,0.4)';
        el.style.transform = 'scale(1.15)';
        setTimeout(() => {
            el.style.background = '';
            el.style.transform = '';
        }, 600);
    }

    /**
     * Clean up.
     */
    dispose() {
        this._unsubscribers.forEach(fn => { if (typeof fn === 'function') fn(); });
        this._unsubscribers = [];
        if (this._root && this._root.parentNode) {
            this._root.parentNode.removeChild(this._root);
        }
    }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _instance = null;

export function createElevatorUI() {
    if (!_instance) _instance = new ElevatorUI();
    return _instance;
}

export default { ElevatorUI, createElevatorUI };
