/**
 * FullySailSally - Server bot integration for The Highrise
 * Represents @FullySailSallyBot managing the Right Tower (Server System)
 *
 * Connects to the Highrise API WebSocket for live server data,
 * with simulation fallback when API is unavailable.
 */
import { eventBus } from '../core/EventBus.js';
import { botBridge } from './BotBridge.js';

export class FullySailSally {
    constructor() {
        this.id = 'sally';
        this.name = 'Sally';
        this.username = '@FullySailSallyBot';
        this.status = 'active';
        this.tower = 'right';
        this.deployments = [];
        this.serverHealth = {
            cpu: 45,
            ram: 52,
            bandwidth: 30,
            storage: 34,
            uptime: 99.94
        };
        this.syncStatus = 'idle'; // 'idle' | 'syncing' | 'error'
        this.lastSync = Date.now();
        this.wsConnected = false;
        this._ws = null;
        this._reconnectTimer = null;

        botBridge.registerBot(this.id, this);

        // Try live API connection first, fall back to simulation
        this._connectToAPI();
    }

    // ─── Live API Connection ────────────────────────────
    _connectToAPI() {
        const wsUrl = this._getWSUrl();
        try {
            this._ws = new WebSocket(wsUrl);

            this._ws.onopen = () => {
                this.wsConnected = true;
                this.status = 'active';
                console.log('[Sally] Connected to Highrise API WebSocket');
                eventBus.emit('sally:connected', { live: true });

                // Stop simulation if running
                if (this._simTimer) {
                    clearInterval(this._simTimer);
                    this._simTimer = null;
                }
            };

            this._ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this._handleAPIMessage(msg);
                } catch (e) {
                    console.warn('[Sally] Bad WS message:', e.message);
                }
            };

            this._ws.onclose = () => {
                this.wsConnected = false;
                console.log('[Sally] API WebSocket disconnected, falling back to simulation');
                eventBus.emit('sally:disconnected');
                this._startHealthSimulation();
                this._scheduleReconnect();
            };

            this._ws.onerror = () => {
                // onclose will fire after this, handle there
            };
        } catch (e) {
            console.log('[Sally] API unavailable, running in simulation mode');
            this._startHealthSimulation();
        }
    }

    _getWSUrl() {
        // Check for API URL in various places
        const port = 8081;
        const host = window.location.hostname || 'localhost';
        return `ws://${host}:${port}/ws`;
    }

    _scheduleReconnect() {
        if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
        this._reconnectTimer = setTimeout(() => this._connectToAPI(), 10000);
    }

    _handleAPIMessage(msg) {
        switch (msg.type) {
            case 'SERVER_METRICS':
                this._updateHealth({ health: msg.data });
                break;
            case 'DEPLOY_STATUS':
                this._handleDeploy(msg.data);
                break;
            case 'SYNC_STATUS':
                this.syncStatus = msg.data.status || 'idle';
                this.lastSync = msg.data.timestamp || Date.now();
                eventBus.emit('sally:sync:complete', msg.data);
                break;
            case 'SALLY_STATUS':
                this.status = msg.data.connected ? 'active' : 'offline';
                eventBus.emit('sally:status', { status: this.status });
                break;
            case 'LOCAL_METRICS':
                // Forward local metrics to power station
                eventBus.emit('powerstation:local', msg.data);
                break;
        }
    }

    // ─── Message Handling ───────────────────────────────
    handleMessage(type, payload) {
        switch (type) {
            case 'deploy':
                this._handleDeploy(payload);
                break;
            case 'sync':
                this._handleSync(payload);
                break;
            case 'heartbeat':
                this._updateHealth(payload);
                break;
            case 'status':
                this.status = payload.status || this.status;
                eventBus.emit('sally:status', payload);
                break;
            default:
                eventBus.emit('sally:message', { type, payload });
        }
    }

    _handleDeploy(payload) {
        const deployment = {
            id: `deploy-${Date.now()}`,
            project: payload.project,
            status: payload.status || 'in-progress',
            startTime: Date.now(),
            ...payload
        };
        this.deployments.push(deployment);
        if (this.deployments.length > 20) this.deployments.shift();

        eventBus.emit('sally:deploy:start', deployment);

        // If simulating (no live connection), auto-complete
        if (!this.wsConnected) {
            setTimeout(() => {
                deployment.status = 'complete';
                deployment.endTime = Date.now();
                eventBus.emit('sally:deploy:complete', deployment);
            }, 3000 + Math.random() * 5000);
        }
    }

    _handleSync(payload) {
        this.syncStatus = 'syncing';
        eventBus.emit('sally:sync:start', payload);

        // Send to API if connected
        if (this.wsConnected && this._ws?.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify({
                type: 'AGENT_COMMAND',
                data: { action: 'sync', targetAgent: 'sally', ...payload }
            }));
        } else {
            // Simulate
            setTimeout(() => {
                this.syncStatus = 'idle';
                this.lastSync = Date.now();
                eventBus.emit('sally:sync:complete', { timestamp: this.lastSync });
            }, 2000 + Math.random() * 3000);
        }
    }

    _updateHealth(payload) {
        if (payload.health) {
            Object.assign(this.serverHealth, payload.health);
        }
        eventBus.emit('sally:health', this.serverHealth);
    }

    _startHealthSimulation() {
        if (this._simTimer) return; // Already simulating
        this._simTimer = setInterval(() => {
            this.serverHealth.cpu = Math.max(5, Math.min(95,
                this.serverHealth.cpu + (Math.random() - 0.5) * 8));
            this.serverHealth.ram = Math.max(20, Math.min(90,
                this.serverHealth.ram + (Math.random() - 0.5) * 4));
            this.serverHealth.bandwidth = Math.max(5, Math.min(80,
                this.serverHealth.bandwidth + (Math.random() - 0.5) * 10));
            this.serverHealth.storage = Math.max(30, Math.min(85,
                this.serverHealth.storage + (Math.random() - 0.5) * 1));
            eventBus.emit('sally:health', this.serverHealth);
        }, 5000);
    }

    // ─── Public API ─────────────────────────────────────
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            username: this.username,
            status: this.status,
            tower: this.tower,
            wsConnected: this.wsConnected,
            serverHealth: { ...this.serverHealth },
            syncStatus: this.syncStatus,
            lastSync: this.lastSync,
            recentDeployments: this.deployments.slice(-5)
        };
    }

    triggerDeploy(projectId) {
        this.handleMessage('deploy', { project: projectId, source: 'highrise' });
    }

    triggerSync() {
        this.handleMessage('sync', { source: 'highrise' });
    }

    destroy() {
        if (this._ws) this._ws.close();
        if (this._simTimer) clearInterval(this._simTimer);
        if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    }
}
