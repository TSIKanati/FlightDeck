/**
 * BotBridge - Communication bridge between bots and the Highrise visualization
 * Handles message routing, status updates, and connection management
 */
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

export class BotBridge {
    constructor() {
        this.bots = new Map();
        this.messageQueue = [];
        this.connectionStatus = 'disconnected';
        this.ws = null;
    }

    registerBot(botId, botInstance) {
        this.bots.set(botId, botInstance);
        eventBus.emit('bot:registered', { botId, bot: botInstance });
    }

    async connect(wsUrl) {
        try {
            if (typeof WebSocket !== 'undefined' && wsUrl) {
                this.ws = new WebSocket(wsUrl);
                this.ws.onopen = () => {
                    this.connectionStatus = 'connected';
                    eventBus.emit('bridge:connected');
                };
                this.ws.onmessage = (event) => {
                    const msg = JSON.parse(event.data);
                    this.routeMessage(msg);
                };
                this.ws.onclose = () => {
                    this.connectionStatus = 'disconnected';
                    eventBus.emit('bridge:disconnected');
                    setTimeout(() => this.connect(wsUrl), 5000);
                };
                this.ws.onerror = () => {
                    this.connectionStatus = 'error';
                    eventBus.emit('bridge:error');
                };
            } else {
                // Simulation mode - no live WebSocket
                this.connectionStatus = 'simulated';
                eventBus.emit('bridge:simulated');
                this._startSimulation();
            }
        } catch (e) {
            this.connectionStatus = 'simulated';
            this._startSimulation();
        }
    }

    routeMessage(msg) {
        const { target, type, payload } = msg;
        if (this.bots.has(target)) {
            this.bots.get(target).handleMessage(type, payload);
        }
        eventBus.emit('bot:message', msg);
        this.messageQueue.push({ ...msg, timestamp: Date.now() });
        if (this.messageQueue.length > 100) this.messageQueue.shift();
    }

    sendMessage(from, to, type, payload) {
        const msg = { from, target: to, type, payload, timestamp: Date.now() };
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
        this.routeMessage(msg);
    }

    getRecentMessages(count = 10) {
        return this.messageQueue.slice(-count);
    }

    getStatus() {
        return {
            connectionStatus: this.connectionStatus,
            registeredBots: Array.from(this.bots.keys()),
            queueLength: this.messageQueue.length
        };
    }

    _startSimulation() {
        // Simulate bot traffic for visualization
        const messageTypes = ['status', 'deploy', 'sync', 'alert', 'heartbeat'];
        const bots = ['beefrank', 'sally'];

        setInterval(() => {
            const from = bots[Math.floor(Math.random() * bots.length)];
            const to = bots.find(b => b !== from);
            const type = messageTypes[Math.floor(Math.random() * messageTypes.length)];
            this.routeMessage({
                from,
                target: to,
                type,
                payload: {
                    message: `Simulated ${type} from ${from}`,
                    timestamp: Date.now()
                }
            });
        }, 3000 + Math.random() * 7000);
    }
}

export const botBridge = new BotBridge();
