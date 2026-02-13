/**
 * BeeFranknBot - Telegram C2 Command Center for The Highrise
 *
 * @BeeFranknBot sits at Floor 20 (Observation Deck) as the SUPREME C2.
 * All human commands enter through Telegram, get analyzed here,
 * then delegated down the chain via C2CommandChain.
 *
 * Commands:
 *   /task <description>     - Create and auto-delegate a task
 *   /deploy <project>       - Deploy a project
 *   /swarm <description>    - Activate swarm intelligence (critical)
 *   /status                 - Full system status report
 *   /tasks                  - Active and recent task list
 *   /floor <number>         - Navigate 3D view to floor
 *   /agents                 - List all agents and status
 *   /recall                 - Recall active swarm
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
        this.floor = 20; // Observation Deck - Supreme C2 Position
        this.role = 'Supreme Commander';
        this.tower = 'left';

        // Stats
        this.commandsIssued = 0;
        this.tasksCreated = 0;
        this.swarmsActivated = 0;

        botBridge.registerBot(this.id, this);
        this._listen();
    }

    _listen() {
        // Listen for replies to send back to Telegram
        eventBus.on('beefrank:reply', (data) => this._handleReply(data));
        // Listen for task completions for stats
        eventBus.on('task:completed', () => this.tasksCreated++);
    }

    handleMessage(type, payload) {
        this.lastMessage = { type, payload, timestamp: Date.now() };

        switch (type) {
            case 'command':
                this.commandsIssued++;
                this.commandHistory.push({
                    ...payload,
                    timestamp: Date.now(),
                    index: this.commandsIssued
                });
                if (this.commandHistory.length > 100) this.commandHistory.shift();

                // Route command through C2 chain
                eventBus.emit('c2:command', payload);
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

    _handleReply(data) {
        // In live mode, the API server handles sending to Telegram
        // Here we just log and emit for the UI
        if (data.text) {
            console.log(`[BeeFrank C2] Reply: ${data.text.substring(0, 80)}...`);
            eventBus.emit('hud:alert', {
                type: 'c2',
                message: data.text.substring(0, 120),
                source: 'BeeFrank'
            });
        }
    }

    // ─── Direct Command API (from UI) ───────────────────
    issueTask(title, options = {}) {
        this.handleMessage('command', {
            command: 'task',
            args: { title, ...options },
            source: 'highrise-ui'
        });
    }

    issueDeploy(projectId) {
        this.handleMessage('command', {
            command: 'deploy',
            args: { project: projectId },
            source: 'highrise-ui'
        });
    }

    issueSwarm(title, options = {}) {
        this.swarmsActivated++;
        this.handleMessage('command', {
            command: 'swarm',
            args: { title, priority: 'critical', ...options },
            source: 'highrise-ui'
        });
    }

    sendCommand(command, args = {}) {
        this.handleMessage('command', {
            command,
            args,
            source: 'highrise'
        });
    }

    // ─── Info ───────────────────────────────────────────
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            username: this.username,
            role: this.role,
            status: this.status,
            floor: this.floor,
            tower: this.tower,
            lastMessage: this.lastMessage,
            stats: {
                commandsIssued: this.commandsIssued,
                tasksCreated: this.tasksCreated,
                swarmsActivated: this.swarmsActivated
            },
            recentCommands: this.commandHistory.slice(-10)
        };
    }
}
