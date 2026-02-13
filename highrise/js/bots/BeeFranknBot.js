/**
 * BeeFranknBot - Telegram C2 integration for The Highrise
 * Represents @BeeFranknBot as a visual agent in the command center
 */
import { eventBus } from '../core/EventBus.js';
import { botBridge } from './BotBridge.js';

export class BeeFranknBot {
    constructor() {
        this.id = 'beefrank';
        this.name = 'BeeFrank';
        this.botId = '8342114547';
        this.userId = '8333835942';
        this.username = '@BeeFranknBot';
        this.status = 'active';
        this.lastMessage = null;
        this.commandHistory = [];
        this.floor = 2; // Water Cooler floor - Communications Desk

        botBridge.registerBot(this.id, this);
    }

    handleMessage(type, payload) {
        this.lastMessage = { type, payload, timestamp: Date.now() };

        switch (type) {
            case 'command':
                this.commandHistory.push(payload);
                if (this.commandHistory.length > 50) this.commandHistory.shift();
                eventBus.emit('beefrank:command', payload);
                break;
            case 'status':
                this.status = payload.status || this.status;
                eventBus.emit('beefrank:status', payload);
                break;
            case 'alert':
                eventBus.emit('beefrank:alert', payload);
                break;
            default:
                eventBus.emit('beefrank:message', { type, payload });
        }
    }

    sendCommand(command, args = {}) {
        botBridge.sendMessage(this.id, 'sally', 'command', {
            command,
            args,
            source: 'highrise'
        });
    }

    getInfo() {
        return {
            id: this.id,
            name: this.name,
            username: this.username,
            status: this.status,
            floor: this.floor,
            lastMessage: this.lastMessage,
            recentCommands: this.commandHistory.slice(-5)
        };
    }
}
