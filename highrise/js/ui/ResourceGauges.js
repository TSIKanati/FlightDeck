/**
 * ResourceGauges.js - System Resource Meters for The Highrise
 * TSI Enterprise 3D Command Center
 *
 * 8 gauge displays (4 local + 4 server) shown when viewing the Power Station floor.
 * Each gauge is a vertical bar with fill, percentage, name, color coding, warning
 * pulse, and a sparkline canvas showing last 60 values.
 *
 * All DOM elements created programmatically. CSS classes use 'hr-' prefix.
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

// ---------------------------------------------------------------------------
// Gauge definitions
// ---------------------------------------------------------------------------

const GAUGE_DEFS = {
    local: [
        { id: 'cpu',     label: 'CPU',       icon: '\uD83D\uDCBB' },
        { id: 'ram',     label: 'RAM',       icon: '\uD83E\uDDE0' },
        { id: 'gpu',     label: 'GPU',       icon: '\uD83C\uDFA8' },
        { id: 'storage', label: 'STORAGE',   icon: '\uD83D\uDCBE' },
    ],
    server: [
        { id: 'cpu',       label: 'CPU',       icon: '\uD83D\uDCBB' },
        { id: 'ram',       label: 'RAM',       icon: '\uD83E\uDDE0' },
        { id: 'bandwidth', label: 'BANDWIDTH', icon: '\uD83C\uDF10' },
        { id: 'storage',   label: 'STORAGE',   icon: '\uD83D\uDCBE' },
    ],
};

const HISTORY_LENGTH = 60;

// Color thresholds
function getGaugeColor(value) {
    if (value < 60) return { fill: '#2ECC71', glow: 'rgba(46,204,113,0.3)', label: 'green' };
    if (value < 85) return { fill: '#F39C12', glow: 'rgba(243,156,18,0.3)', label: 'yellow' };
    return { fill: '#E74C3C', glow: 'rgba(231,76,60,0.4)', label: 'red' };
}

// ---------------------------------------------------------------------------
// Style injection
// ---------------------------------------------------------------------------

function _injectStyles() {
    if (document.getElementById('hr-gauges-styles')) return;

    const style = document.createElement('style');
    style.id = 'hr-gauges-styles';
    style.textContent = `
        .hr-gauges {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            z-index: 58;
            pointer-events: auto;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            user-select: none;
            display: none;
        }
        .hr-gauges.visible {
            display: block;
        }
        .hr-gauges-container {
            background: rgba(10,15,30,0.94);
            border: 1px solid rgba(74,144,217,0.3);
            border-radius: 12px;
            backdrop-filter: blur(12px);
            padding: 20px 24px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.5);
        }

        /* Header */
        .hr-gauges-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(74,144,217,0.15);
        }
        .hr-gauges-title {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #FF4444;
        }
        .hr-gauges-title span {
            color: #4A90D9;
            font-weight: 400;
        }
        .hr-gauges-close {
            width: 28px;
            height: 28px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 4px;
            color: #8899aa;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s, color 0.15s;
        }
        .hr-gauges-close:hover {
            background: rgba(231,76,60,0.2);
            color: #E74C3C;
        }

        /* Two-column layout */
        .hr-gauges-columns {
            display: flex;
            gap: 20px;
        }
        .hr-gauges-column {
            flex: 1;
        }
        .hr-gauges-col-title {
            font-size: 10px;
            letter-spacing: 2px;
            color: #4A90D9;
            text-transform: uppercase;
            text-align: center;
            margin-bottom: 12px;
        }
        .hr-gauges-row {
            display: flex;
            gap: 14px;
            justify-content: center;
        }

        /* Individual gauge */
        .hr-gauge {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 60px;
        }
        .hr-gauge-icon {
            font-size: 14px;
            margin-bottom: 4px;
        }
        .hr-gauge-label {
            font-size: 8px;
            letter-spacing: 1px;
            color: #556677;
            text-transform: uppercase;
            margin-bottom: 6px;
        }

        /* Vertical bar */
        .hr-gauge-bar-wrap {
            position: relative;
            width: 24px;
            height: 100px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 4px;
            overflow: hidden;
        }
        .hr-gauge-bar-fill {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: #2ECC71;
            border-radius: 3px 3px 0 0;
            transition: height 0.5s cubic-bezier(0.4,0,0.2,1), background 0.3s;
        }
        .hr-gauge-bar-fill.warning-pulse {
            animation: hr-gauge-pulse 1s ease-in-out infinite;
        }
        @keyframes hr-gauge-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.65; }
        }

        /* Percentage */
        .hr-gauge-pct {
            font-size: 12px;
            font-weight: 700;
            color: #e0e8f0;
            margin-top: 6px;
            text-align: center;
        }

        /* Sparkline canvas */
        .hr-gauge-spark {
            width: 56px;
            height: 20px;
            margin-top: 4px;
            border-radius: 2px;
        }
    `;
    document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// ResourceGauges class
// ---------------------------------------------------------------------------

export class ResourceGauges {
    constructor() {
        this._root = null;
        this._isVisible = false;
        this._monitoring = false;
        this._monitorInterval = null;
        this._gauges = {};         // key: 'local.cpu' -> { fillEl, pctEl, sparkCanvas, sparkCtx }
        this._history = {};        // key: 'local.cpu' -> number[]
        this._values = {};         // key: 'local.cpu' -> number
        this._unsubscribers = [];
        this._hasLiveData = false; // Whether we've received live WS data
        this._liveDataTimeout = null;

        // Initialize history and values
        ['local', 'server'].forEach(side => {
            GAUGE_DEFS[side].forEach(g => {
                const key = `${side}.${g.id}`;
                this._history[key] = [];
                this._values[key] = 0;
            });
        });

        // Bridge status gauge
        this._history['bridge.sync'] = [];
        this._values['bridge.sync'] = 0;

        _injectStyles();
        this._build();
        this._bindEvents();
    }

    // -----------------------------------------------------------------------
    // DOM Construction
    // -----------------------------------------------------------------------

    _build() {
        this._root = document.createElement('div');
        this._root.className = 'hr-gauges';
        this._root.id = 'hr-gauges';

        const container = document.createElement('div');
        container.className = 'hr-gauges-container';

        // Header
        const header = document.createElement('div');
        header.className = 'hr-gauges-header';

        const title = document.createElement('div');
        title.className = 'hr-gauges-title';
        title.innerHTML = '\u26A1 POWER STATION <span>\u2014 RESOURCE MONITOR</span>';

        const closeBtn = document.createElement('div');
        closeBtn.className = 'hr-gauges-close';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', () => this.hide());

        header.appendChild(title);
        header.appendChild(closeBtn);
        container.appendChild(header);

        // Two columns
        const columns = document.createElement('div');
        columns.className = 'hr-gauges-columns';

        // Build each column
        ['local', 'server'].forEach(side => {
            const col = document.createElement('div');
            col.className = 'hr-gauges-column';

            const colTitle = document.createElement('div');
            colTitle.className = 'hr-gauges-col-title';
            colTitle.textContent = side === 'local' ? 'LOCAL SYSTEM' : 'SERVER (VPS)';
            col.appendChild(colTitle);

            const row = document.createElement('div');
            row.className = 'hr-gauges-row';

            GAUGE_DEFS[side].forEach(gaugeDef => {
                const gauge = this._buildGauge(side, gaugeDef);
                row.appendChild(gauge);
            });

            col.appendChild(row);
            columns.appendChild(col);
        });

        container.appendChild(columns);

        // Bridge Sync gauge (single gauge below the columns)
        const bridgeSection = document.createElement('div');
        bridgeSection.style.cssText = 'margin-top:14px;padding-top:12px;border-top:1px solid rgba(74,144,217,0.15);text-align:center;';

        const bridgeTitle = document.createElement('div');
        bridgeTitle.className = 'hr-gauges-col-title';
        bridgeTitle.textContent = 'TOWER BRIDGE SYNC';
        bridgeSection.appendChild(bridgeTitle);

        const bridgeRow = document.createElement('div');
        bridgeRow.style.cssText = 'display:flex;justify-content:center;';
        const bridgeGauge = this._buildGauge('bridge', { id: 'sync', label: 'SYNC', icon: '\uD83C\uDF09' });
        bridgeRow.appendChild(bridgeGauge);
        bridgeSection.appendChild(bridgeRow);

        container.appendChild(bridgeSection);

        this._root.appendChild(container);
        document.body.appendChild(this._root);
    }

    _buildGauge(side, def) {
        const key = `${side}.${def.id}`;

        const wrap = document.createElement('div');
        wrap.className = 'hr-gauge';

        // Icon
        const icon = document.createElement('div');
        icon.className = 'hr-gauge-icon';
        icon.textContent = def.icon;

        // Label
        const label = document.createElement('div');
        label.className = 'hr-gauge-label';
        label.textContent = def.label;

        // Vertical bar
        const barWrap = document.createElement('div');
        barWrap.className = 'hr-gauge-bar-wrap';

        const barFill = document.createElement('div');
        barFill.className = 'hr-gauge-bar-fill';
        barFill.style.height = '0%';
        barWrap.appendChild(barFill);

        // Percentage text
        const pct = document.createElement('div');
        pct.className = 'hr-gauge-pct';
        pct.textContent = '0%';

        // Sparkline
        const sparkCanvas = document.createElement('canvas');
        sparkCanvas.className = 'hr-gauge-spark';
        sparkCanvas.width = 112;   // 2x for retina
        sparkCanvas.height = 40;
        sparkCanvas.style.width = '56px';
        sparkCanvas.style.height = '20px';
        const sparkCtx = sparkCanvas.getContext('2d');

        wrap.appendChild(icon);
        wrap.appendChild(label);
        wrap.appendChild(barWrap);
        wrap.appendChild(pct);
        wrap.appendChild(sparkCanvas);

        // Store references
        this._gauges[key] = {
            fillEl: barFill,
            pctEl: pct,
            sparkCanvas,
            sparkCtx,
            barWrap,
        };

        return wrap;
    }

    // -----------------------------------------------------------------------
    // Gauge Update
    // -----------------------------------------------------------------------

    _updateGaugeVisual(key, value) {
        const gauge = this._gauges[key];
        if (!gauge) return;

        const clamped = Math.max(0, Math.min(100, value));
        const color = getGaugeColor(clamped);

        // Bar fill
        gauge.fillEl.style.height = `${clamped}%`;
        gauge.fillEl.style.background = color.fill;
        gauge.fillEl.style.boxShadow = `0 0 8px ${color.glow}`;

        // Warning pulse
        if (clamped >= 85) {
            gauge.fillEl.classList.add('warning-pulse');
        } else {
            gauge.fillEl.classList.remove('warning-pulse');
        }

        // Percentage text
        gauge.pctEl.textContent = `${Math.round(clamped)}%`;
        gauge.pctEl.style.color = color.fill;

        // Update history
        this._history[key].push(clamped);
        if (this._history[key].length > HISTORY_LENGTH) {
            this._history[key] = this._history[key].slice(-HISTORY_LENGTH);
        }

        // Redraw sparkline
        this._drawSparkline(key);
    }

    _drawSparkline(key) {
        const gauge = this._gauges[key];
        if (!gauge) return;

        const ctx = gauge.sparkCtx;
        const w = gauge.sparkCanvas.width;
        const h = gauge.sparkCanvas.height;
        const history = this._history[key];

        ctx.clearRect(0, 0, w, h);

        if (history.length < 2) return;

        const stepX = w / (HISTORY_LENGTH - 1);

        // Draw fill area
        ctx.beginPath();
        ctx.moveTo(0, h);

        history.forEach((val, i) => {
            const x = (HISTORY_LENGTH - history.length + i) * stepX;
            const y = h - (val / 100) * h;
            ctx.lineTo(x, y);
        });

        const lastX = (HISTORY_LENGTH - 1) * stepX;
        ctx.lineTo(lastX, h);
        ctx.closePath();

        const currentVal = history[history.length - 1];
        const color = getGaugeColor(currentVal);
        ctx.fillStyle = color.fill + '22';
        ctx.fill();

        // Draw line
        ctx.beginPath();
        history.forEach((val, i) => {
            const x = (HISTORY_LENGTH - history.length + i) * stepX;
            const y = h - (val / 100) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color.fill + 'AA';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // -----------------------------------------------------------------------
    // Simulation (when no live data available)
    // -----------------------------------------------------------------------

    _simulateValue(key) {
        const current = this._values[key] || 30;
        // Random walk with mean-reversion
        const target = key.includes('cpu') ? 45 : key.includes('ram') ? 62 : key.includes('gpu') ? 38 : 55;
        const drift = (target - current) * 0.05;
        const noise = (Math.random() - 0.5) * 12;
        const spike = Math.random() > 0.97 ? (Math.random() * 30) : 0; // occasional spike
        const next = Math.max(5, Math.min(98, current + drift + noise + spike));
        this._values[key] = next;
        return next;
    }

    // -----------------------------------------------------------------------
    // Event Binding
    // -----------------------------------------------------------------------

    _bindEvents() {
        // Show when Power Station floor is active
        const unsub1 = eventBus.on('state:currentFloor', ({ value }) => {
            if (value === -2) {
                this.show();
            } else if (this._isVisible) {
                this.hide();
            }
        });
        this._unsubscribers.push(unsub1);

        // Accept live resource data
        const unsub2 = eventBus.on('resources:update', ({ side, type, value }) => {
            this._hasLiveData = true;
            this.updateGauge(side, type, value);
        });
        this._unsubscribers.push(unsub2);

        // Listen for sally:health WebSocket events → parse into gauge updates
        const unsub3 = eventBus.on('sally:health', (data) => {
            this._hasLiveData = true;
            if (data.cpu !== undefined) this.updateGauge('server', 'cpu', data.cpu);
            if (data.ram !== undefined) this.updateGauge('server', 'ram', data.ram);
            if (data.bandwidth !== undefined) this.updateGauge('server', 'bandwidth', data.bandwidth);
            if (data.storage !== undefined) this.updateGauge('server', 'storage', data.storage);
        });
        this._unsubscribers.push(unsub3);

        // TowerBridge status → bridge sync gauge
        const unsub4 = eventBus.on('bridge:status', (status) => {
            const total = status.leftTasks + status.rightTasks + status.sharedTasks;
            const syncHealth = total > 0
                ? Math.min(100, Math.round(((status.sharedTasks + 1) / (total + 1)) * 100))
                : 50;
            this._values['bridge.sync'] = syncHealth;
            if (this._gauges['bridge.sync']) {
                this._updateGaugeVisual('bridge.sync', syncHealth);
            }
        });
        this._unsubscribers.push(unsub4);

        // AgentMetrics throughput updates
        const unsub5 = eventBus.on('metrics:updated', () => {
            // Throughput sparkline could update here if needed
        });
        this._unsubscribers.push(unsub5);

        // ESC to close
        const keyHandler = (e) => {
            if (e.key === 'Escape' && this._isVisible) {
                this.hide();
            }
        };
        document.addEventListener('keydown', keyHandler);
        this._unsubscribers.push(() => document.removeEventListener('keydown', keyHandler));
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Show the resource gauges overlay and start monitoring.
     */
    show() {
        this._isVisible = true;
        this._root.classList.add('visible');
        this.startMonitoring();
        eventBus.emit('gauges:visible', { visible: true });
    }

    /**
     * Hide the resource gauges overlay and stop monitoring.
     */
    hide() {
        this._isVisible = false;
        this._root.classList.remove('visible');
        this.stopMonitoring();
        eventBus.emit('gauges:visible', { visible: false });
    }

    /**
     * Update a single gauge.
     * @param {'local'|'server'} side
     * @param {string} type - e.g. 'cpu', 'ram', 'gpu', 'storage', 'bandwidth'
     * @param {number} value - 0 to 100
     */
    updateGauge(side, type, value) {
        const key = `${side}.${type}`;
        this._values[key] = value;
        this._updateGaugeVisual(key, value);

        // Update state manager
        const resources = stateManager.get('resources') || { local: {}, server: {} };
        if (resources[side]) {
            resources[side][type] = value;
            stateManager.set('resources', resources);
        }
    }

    /**
     * Start monitoring - uses live data if available, falls back to simulation after 5s.
     */
    startMonitoring() {
        if (this._monitoring) return;
        this._monitoring = true;

        // Initialize values if empty
        Object.keys(this._values).forEach(key => {
            if (this._values[key] === 0 && key !== 'bridge.sync') {
                this._values[key] = 20 + Math.random() * 40;
            }
        });

        // Wait 5s for live data before falling back to simulation
        this._liveDataTimeout = setTimeout(() => {
            if (!this._hasLiveData) {
                console.log('[ResourceGauges] No live WS data after 5s, using simulation fallback');
            }
        }, 5000);

        this._monitorInterval = setInterval(() => {
            if (!this._isVisible) return;

            // Only simulate for keys that don't have live data
            Object.keys(this._values).forEach(key => {
                if (key === 'bridge.sync') return; // Bridge is event-driven only
                if (this._hasLiveData && key.startsWith('server.')) return; // Skip server gauges if live
                const val = this._simulateValue(key);
                this._updateGaugeVisual(key, val);
            });

            // Emit alerts for high values
            Object.entries(this._values).forEach(([key, val]) => {
                if (val > 90 && key !== 'bridge.sync') {
                    const parts = key.split('.');
                    eventBus.emit('alert:new', {
                        message: `WARNING: ${parts[0].toUpperCase()} ${parts[1].toUpperCase()} at ${Math.round(val)}%`,
                    });
                }
            });
        }, 1500);
    }

    /**
     * Stop monitoring / simulation.
     */
    stopMonitoring() {
        this._monitoring = false;
        if (this._monitorInterval) {
            clearInterval(this._monitorInterval);
            this._monitorInterval = null;
        }
    }

    /**
     * Clean up.
     */
    dispose() {
        this.stopMonitoring();
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

export function createResourceGauges() {
    if (!_instance) _instance = new ResourceGauges();
    return _instance;
}

export default { ResourceGauges, createResourceGauges };
