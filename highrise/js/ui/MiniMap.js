/**
 * MiniMap.js - Building Overview Minimap for The Highrise
 * TSI Enterprise 3D Command Center
 *
 * Fixed bottom-right corner minimap rendered on a 2D canvas.
 * Shows both towers as simplified silhouettes, floor bars colored
 * by project type, agent dots, viewport indicator, and click-to-navigate.
 *
 * All DOM elements created programmatically. CSS classes use 'hr-' prefix.
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

// ---------------------------------------------------------------------------
// Floor reference data
// ---------------------------------------------------------------------------

const FLOORS = [
    { index: -2, name: 'POWER STATION',     emoji: '\u26A1',         color: '#FF4444',  type: 'enterprise' },
    { index: -1, name: 'TEST BUNKER',       emoji: '\uD83D\uDD2C',  color: '#666666',  type: 'enterprise' },
    { index: 1,  name: 'LOBBY',             emoji: '\uD83C\uDFDB\uFE0F', color: '#D4AF37', type: 'enterprise' },
    { index: 2,  name: 'WATER COOLER',      emoji: '\uD83D\uDDE3\uFE0F', color: '#5DADE2', type: 'social' },
    { index: 3,  name: 'ONBOARDING EXPO',   emoji: '\uD83C\uDFD7\uFE0F', color: '#58D68D', type: 'social' },
    { index: 4,  name: 'TranslatorsTitan',  emoji: '\uD83D\uDE80',  color: '#BDC3C7',  type: 'project' },
    { index: 5,  name: 'MachinistZen',      emoji: '\uD83D\uDD27',  color: '#95A5A6',  type: 'project' },
    { index: 6,  name: 'RealWorldPrizes',   emoji: '\uD83C\uDFC6',  color: '#F39C12',  type: 'project' },
    { index: 7,  name: 'QuantumLedger',     emoji: '\u269B\uFE0F',  color: '#8E44AD',  type: 'project' },
    { index: 8,  name: 'ParlorGames',       emoji: '\uD83C\uDFB2',  color: '#9B59B6',  type: 'project' },
    { index: 9,  name: 'OnTheWayHome',      emoji: '\uD83C\uDFE0',  color: '#1ABC9C',  type: 'project' },
    { index: 10, name: 'AutoZen',           emoji: '\uD83D\uDE97',  color: '#3498DB',  type: 'project' },
    { index: 11, name: 'IdealLearning',     emoji: '\uD83D\uDCDA',  color: '#2ECC71',  type: 'project' },
    { index: 12, name: 'GuestOfHonor',      emoji: '\uD83C\uDFA9',  color: '#FFD700',  type: 'project' },
    { index: 13, name: 'CharityPats',       emoji: '\uD83D\uDC3E',  color: '#E74C3C',  type: 'project' },
    { index: 14, name: 'CLIEAIR',           emoji: '\uD83E\uDD16',  color: '#4A90D9',  type: 'project' },
    { index: 15, name: 'TSIAPP',            emoji: '\uD83E\uDD86',  color: '#FF6600',  type: 'project' },
    { index: 16, name: 'ENTERPRISE FINANCE', emoji: '\uD83D\uDCB0', color: '#27AE60',  type: 'enterprise' },
    { index: 17, name: 'ENTERPRISE R&D',    emoji: '\uD83D\uDD2C',  color: '#2980B9',  type: 'enterprise' },
    { index: 18, name: 'ENTERPRISE LEGAL',  emoji: '\u2696\uFE0F',  color: '#8B4513',  type: 'enterprise' },
    { index: 19, name: 'ENTERPRISE SECURITY', emoji: '\uD83D\uDD12', color: '#C0392B', type: 'enterprise' },
    { index: 20, name: 'OBSERVATION DECK',  emoji: '\u2601\uFE0F',  color: '#3498DB',  type: 'enterprise' },
];

const MIN_FLOOR = -2;
const MAX_FLOOR = 20;
const FLOOR_COUNT = FLOORS.length;
const FLOOR_HEIGHT_3D = 2.5;

// ---------------------------------------------------------------------------
// Layout constants for the canvas
// ---------------------------------------------------------------------------

const MAP_WIDTH = 200;
const MAP_HEIGHT = 300;
const PADDING = 12;
const TOWER_GAP = 14;
const TOWER_WIDTH = (MAP_WIDTH - PADDING * 2 - TOWER_GAP) / 2;
const FLOOR_BAR_H = Math.floor((MAP_HEIGHT - PADDING * 2 - 30) / FLOOR_COUNT); // room for label
const BUILDING_TOP = PADDING + 16;   // below title
const BUILDING_BOTTOM = MAP_HEIGHT - PADDING;

// ---------------------------------------------------------------------------
// Style injection
// ---------------------------------------------------------------------------

function _injectStyles() {
    if (document.getElementById('hr-minimap-styles')) return;

    const style = document.createElement('style');
    style.id = 'hr-minimap-styles';
    style.textContent = `
        .hr-minimap {
            position: fixed;
            bottom: 50px;
            right: 10px;
            width: ${MAP_WIDTH}px;
            height: ${MAP_HEIGHT}px;
            z-index: 55;
            pointer-events: auto;
            user-select: none;
        }
        .hr-minimap-canvas {
            width: 100%;
            height: 100%;
            border-radius: 8px;
            cursor: crosshair;
        }
        .hr-minimap-tooltip {
            position: absolute;
            left: -10px;
            transform: translateX(-100%);
            background: rgba(10,15,30,0.95);
            border: 1px solid rgba(74,144,217,0.4);
            border-radius: 4px;
            padding: 4px 10px;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            font-size: 10px;
            color: #c0d0e8;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s;
            z-index: 10;
        }
        .hr-minimap-tooltip.visible {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// MiniMap class
// ---------------------------------------------------------------------------

export class MiniMap {
    constructor() {
        this._root = null;
        this._canvas = null;
        this._ctx = null;
        this._tooltip = null;
        this._visible = true;
        this._viewportYMin = 0;
        this._viewportYMax = 10;
        this._agentPositions = []; // [{floor, color, id}]
        this._hoveredFloor = null;
        this._unsubscribers = [];

        _injectStyles();
        this._build();
        this._bindEvents();
        this.render();
    }

    // -----------------------------------------------------------------------
    // DOM Construction
    // -----------------------------------------------------------------------

    _build() {
        this._root = document.createElement('div');
        this._root.className = 'hr-minimap';
        this._root.id = 'hr-minimap';

        this._canvas = document.createElement('canvas');
        this._canvas.className = 'hr-minimap-canvas';
        this._canvas.width = MAP_WIDTH * 2;    // 2x for retina
        this._canvas.height = MAP_HEIGHT * 2;
        this._canvas.style.width = MAP_WIDTH + 'px';
        this._canvas.style.height = MAP_HEIGHT + 'px';
        this._ctx = this._canvas.getContext('2d');

        this._tooltip = document.createElement('div');
        this._tooltip.className = 'hr-minimap-tooltip';

        this._root.appendChild(this._canvas);
        this._root.appendChild(this._tooltip);
        document.body.appendChild(this._root);
    }

    // -----------------------------------------------------------------------
    // Rendering
    // -----------------------------------------------------------------------

    render() {
        const ctx = this._ctx;
        const w = MAP_WIDTH * 2;
        const h = MAP_HEIGHT * 2;
        const s = 2; // scale factor for retina

        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = 'rgba(6,10,22,0.88)';
        ctx.beginPath();
        this._roundRect(ctx, 0, 0, w, h, 16);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(74,144,217,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        this._roundRect(ctx, 1, 1, w - 2, h - 2, 16);
        ctx.stroke();

        // Title
        ctx.fillStyle = '#4A90D9';
        ctx.font = `bold ${10 * s}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('BUILDING MAP', w / 2, 14 * s);

        // Tower labels
        ctx.fillStyle = '#445566';
        ctx.font = `${7 * s}px "JetBrains Mono", monospace`;
        const leftTowerCenterX = (PADDING + TOWER_WIDTH / 2) * s;
        const rightTowerCenterX = (PADDING + TOWER_WIDTH + TOWER_GAP + TOWER_WIDTH / 2) * s;
        ctx.fillText('LOCAL', leftTowerCenterX, (BUILDING_TOP - 2) * s);
        ctx.fillText('SERVER', rightTowerCenterX, (BUILDING_TOP - 2) * s);

        // Draw floors
        const sortedFloors = [...FLOORS].sort((a, b) => b.index - a.index);
        const barH = Math.max(6, Math.floor(((BUILDING_BOTTOM - BUILDING_TOP) * s) / FLOOR_COUNT) - 2);
        const totalH = (barH + 2) * FLOOR_COUNT;
        const startY = BUILDING_TOP * s + ((BUILDING_BOTTOM - BUILDING_TOP) * s - totalH) / 2;

        // Store positions for hit detection
        this._floorRects = [];

        sortedFloors.forEach((floor, i) => {
            const y = startY + i * (barH + 2);

            // Left tower bar
            const lx = PADDING * s;
            const lw = TOWER_WIDTH * s;
            ctx.fillStyle = floor.color + '55';
            ctx.fillRect(lx, y, lw, barH);

            // Right tower bar (mirror)
            const rx = (PADDING + TOWER_WIDTH + TOWER_GAP) * s;
            const rw = TOWER_WIDTH * s;
            ctx.fillStyle = floor.color + '55';
            ctx.fillRect(rx, y, rw, barH);

            // Brighter edge on left of each bar
            ctx.fillStyle = floor.color + 'AA';
            ctx.fillRect(lx, y, 3, barH);
            ctx.fillRect(rx, y, 3, barH);

            // Store rect for hit detection (in canvas coords)
            this._floorRects.push({
                index: floor.index,
                name: floor.name,
                emoji: floor.emoji,
                y: y / s,
                h: barH / s,
                color: floor.color,
            });

            // Highlight hovered floor
            if (this._hoveredFloor === floor.index) {
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.fillRect(lx - 2, y - 1, lw + rw + TOWER_GAP * s + 4, barH + 2);
            }
        });

        // Draw viewport rectangle
        this._drawViewport(ctx, s, startY, barH, sortedFloors);

        // Draw agent dots
        this._drawAgents(ctx, s, startY, barH, sortedFloors);
    }

    _drawViewport(ctx, s, startY, barH, sortedFloors) {
        // Convert 3D Y range to floor indices
        const minFloorIdx = Math.round(this._viewportYMin / FLOOR_HEIGHT_3D);
        const maxFloorIdx = Math.round(this._viewportYMax / FLOOR_HEIGHT_3D);

        // Find corresponding Y positions on minimap
        let vpTop = null;
        let vpBottom = null;

        sortedFloors.forEach((floor, i) => {
            const y = startY + i * (barH + 2);
            if (floor.index <= maxFloorIdx && vpTop === null) vpTop = y;
            if (floor.index <= minFloorIdx && vpBottom === null) vpBottom = y + barH;
        });

        if (vpTop === null) vpTop = startY;
        if (vpBottom === null) vpBottom = startY + (barH + 2) * sortedFloors.length;

        // Draw the viewport rectangle
        const x = (PADDING - 3) * s;
        const w = (MAP_WIDTH - PADDING * 2 + 6) * s;
        const top = vpTop - 2;
        const height = Math.max(barH * 2, vpBottom - vpTop + 4);

        ctx.strokeStyle = 'rgba(74,144,217,0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x, top, w, height);
        ctx.setLineDash([]);

        // Semi-transparent fill
        ctx.fillStyle = 'rgba(74,144,217,0.06)';
        ctx.fillRect(x, top, w, height);
    }

    _drawAgents(ctx, s, startY, barH, sortedFloors) {
        if (!this._agentPositions.length) return;

        // Create a floor-index-to-y mapping
        const floorYMap = {};
        sortedFloors.forEach((floor, i) => {
            floorYMap[floor.index] = startY + i * (barH + 2) + barH / 2;
        });

        // Group agents by floor for offset
        const byFloor = {};
        this._agentPositions.forEach(a => {
            if (!byFloor[a.floor]) byFloor[a.floor] = [];
            byFloor[a.floor].push(a);
        });

        Object.entries(byFloor).forEach(([floorIdx, agents]) => {
            const fy = floorYMap[floorIdx];
            if (fy === undefined) return;

            agents.forEach((agent, i) => {
                const dotRadius = 4;
                // Place dots in left tower area, spaced out
                const dx = PADDING * s + 10 + i * (dotRadius * 3);
                const dy = fy;

                ctx.beginPath();
                ctx.arc(dx, dy, dotRadius, 0, Math.PI * 2);
                ctx.fillStyle = agent.color || '#4A90D9';
                ctx.fill();

                // Glow
                ctx.beginPath();
                ctx.arc(dx, dy, dotRadius + 2, 0, Math.PI * 2);
                ctx.fillStyle = (agent.color || '#4A90D9') + '33';
                ctx.fill();
            });
        });
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // -----------------------------------------------------------------------
    // Hit detection
    // -----------------------------------------------------------------------

    _getFloorAtCanvasY(canvasY) {
        if (!this._floorRects) return null;
        // canvasY is in CSS pixel space
        for (const rect of this._floorRects) {
            if (canvasY >= rect.y && canvasY <= rect.y + rect.h) {
                return rect;
            }
        }
        return null;
    }

    // -----------------------------------------------------------------------
    // Event Binding
    // -----------------------------------------------------------------------

    _bindEvents() {
        // Toggle with M key
        const keyHandler = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'M' || e.key === 'm') {
                this._visible = !this._visible;
                this._root.style.display = this._visible ? '' : 'none';
            }
        };
        document.addEventListener('keydown', keyHandler);
        this._unsubscribers.push(() => document.removeEventListener('keydown', keyHandler));

        // Mouse move for tooltip
        this._canvas.addEventListener('mousemove', (e) => {
            const rect = this._canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const floor = this._getFloorAtCanvasY(y);
            if (floor) {
                this._hoveredFloor = floor.index;
                this._tooltip.textContent = `${floor.emoji} ${floor.name}`;
                this._tooltip.style.top = `${y}px`;
                this._tooltip.classList.add('visible');
            } else {
                this._hoveredFloor = null;
                this._tooltip.classList.remove('visible');
            }
            this.render();
        });

        this._canvas.addEventListener('mouseleave', () => {
            this._hoveredFloor = null;
            this._tooltip.classList.remove('visible');
            this.render();
        });

        // Click to navigate
        this._canvas.addEventListener('click', (e) => {
            const rect = this._canvas.getBoundingClientRect();
            const y = e.clientY - rect.top;

            const floor = this._getFloorAtCanvasY(y);
            if (floor) {
                eventBus.emit('elevator:navigate', { floorIndex: floor.index });
                stateManager.set('currentFloor', floor.index);
            }
        });

        // State changes update viewport
        const unsub1 = eventBus.on('state:cameraPosition', ({ value }) => {
            if (value && value.y !== undefined) {
                // Estimate viewport from camera Y with a range
                const camY = value.y;
                this._viewportYMin = camY - 8;
                this._viewportYMax = camY + 8;
                this.render();
            }
        });
        this._unsubscribers.push(unsub1);

        // Agent registry changes
        const unsub2 = eventBus.on('registry:loaded', () => {
            this._refreshAgentPositions();
        });
        this._unsubscribers.push(unsub2);

        const unsub3 = eventBus.on('registry:statusChanged', () => {
            this._refreshAgentPositions();
        });
        this._unsubscribers.push(unsub3);
    }

    _refreshAgentPositions() {
        const agents = stateManager.get('agents') || {};
        this._agentPositions = Object.values(agents)
            .filter(a => a.floor !== undefined)
            .map(a => ({
                id: a.id,
                floor: a.floor,
                color: a.avatar || '#4A90D9',
            }));
        this.render();
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Re-render the minimap canvas.
     */
    render() {
        // Guard against rapid calls
        if (this._renderQueued) return;
        this._renderQueued = true;
        requestAnimationFrame(() => {
            this._renderQueued = false;
            this._doRender();
        });
    }

    /** Internal render -- called via rAF */
    _doRender() {
        const ctx = this._ctx;
        const w = MAP_WIDTH * 2;
        const h = MAP_HEIGHT * 2;
        const s = 2;

        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = 'rgba(6,10,22,0.88)';
        ctx.beginPath();
        this._roundRect(ctx, 0, 0, w, h, 16);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(74,144,217,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        this._roundRect(ctx, 1, 1, w - 2, h - 2, 16);
        ctx.stroke();

        // Title
        ctx.fillStyle = '#4A90D9';
        ctx.font = `bold ${10 * s}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('BUILDING MAP', w / 2, 14 * s);

        // Tower labels
        ctx.fillStyle = '#445566';
        ctx.font = `${7 * s}px "JetBrains Mono", monospace`;
        const leftTowerCenterX = (PADDING + TOWER_WIDTH / 2) * s;
        const rightTowerCenterX = (PADDING + TOWER_WIDTH + TOWER_GAP + TOWER_WIDTH / 2) * s;
        ctx.fillText('LOCAL', leftTowerCenterX, (BUILDING_TOP - 2) * s);
        ctx.fillText('SERVER', rightTowerCenterX, (BUILDING_TOP - 2) * s);

        // Draw floors
        const sortedFloors = [...FLOORS].sort((a, b) => b.index - a.index);
        const barH = Math.max(6, Math.floor(((BUILDING_BOTTOM - BUILDING_TOP) * s) / FLOOR_COUNT) - 2);
        const totalH = (barH + 2) * FLOOR_COUNT;
        const startY = BUILDING_TOP * s + ((BUILDING_BOTTOM - BUILDING_TOP) * s - totalH) / 2;

        this._floorRects = [];

        sortedFloors.forEach((floor, i) => {
            const y = startY + i * (barH + 2);

            const lx = PADDING * s;
            const lw = TOWER_WIDTH * s;
            ctx.fillStyle = floor.color + '55';
            ctx.fillRect(lx, y, lw, barH);

            const rx = (PADDING + TOWER_WIDTH + TOWER_GAP) * s;
            const rw = TOWER_WIDTH * s;
            ctx.fillStyle = floor.color + '55';
            ctx.fillRect(rx, y, rw, barH);

            ctx.fillStyle = floor.color + 'AA';
            ctx.fillRect(lx, y, 3, barH);
            ctx.fillRect(rx, y, 3, barH);

            this._floorRects.push({
                index: floor.index,
                name: floor.name,
                emoji: floor.emoji,
                y: y / s,
                h: barH / s,
                color: floor.color,
            });

            if (this._hoveredFloor === floor.index) {
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.fillRect(lx - 2, y - 1, lw + rw + TOWER_GAP * s + 4, barH + 2);
            }
        });

        this._drawViewport(ctx, s, startY, barH, sortedFloors);
        this._drawAgents(ctx, s, startY, barH, sortedFloors);
    }

    /**
     * Update agent positions for dot rendering.
     * @param {Array<{id: string, floor: number, color: string}>} agents
     */
    updateAgentPositions(agents) {
        this._agentPositions = agents || [];
        this.render();
    }

    /**
     * Set the viewport indicator range (in 3D Y coordinates).
     * @param {number} yMin
     * @param {number} yMax
     */
    setViewport(yMin, yMax) {
        this._viewportYMin = yMin;
        this._viewportYMax = yMax;
        this.render();
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

export function createMiniMap() {
    if (!_instance) _instance = new MiniMap();
    return _instance;
}

export default { MiniMap, createMiniMap };
