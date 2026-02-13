/**
 * FullySailSally - Server bot integration for The Highrise
 * Represents @FullySailSallyBot managing the Right Tower (Server System)
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

        botBridge.registerBot(this.id, this);
        this._startHealthSimulation();
    }

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
            status: 'in-progress',
            startTime: Date.now(),
            ...payload
        };
        this.deployments.push(deployment);
        eventBus.emit('sally:deploy:start', deployment);

        // Simulate deployment completion
        setTimeout(() => {
            deployment.status = 'complete';
            deployment.endTime = Date.now();
            eventBus.emit('sally:deploy:complete', deployment);
        }, 3000 + Math.random() * 5000);
    }

    _handleSync(payload) {
        this.syncStatus = 'syncing';
        eventBus.emit('sally:sync:start', payload);

        setTimeout(() => {
            this.syncStatus = 'idle';
            this.lastSync = Date.now();
            eventBus.emit('sally:sync:complete', { timestamp: this.lastSync });
        }, 2000 + Math.random() * 3000);
    }

    _updateHealth(payload) {
        if (payload.health) {
            Object.assign(this.serverHealth, payload.health);
        }
        eventBus.emit('sally:health', this.serverHealth);
    }

    _startHealthSimulation() {
        // Simulate realistic server health fluctuations
        setInterval(() => {
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

    getInfo() {
        return {
            id: this.id,
            name: this.name,
            username: this.username,
            status: this.status,
            tower: this.tower,
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
}
