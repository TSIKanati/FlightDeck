/**
 * C2CommandChain - Command & Control Delegation System
 *
 * @BeeFranknBot sits at Floor 20 (Observation Deck) as the top-level C2.
 * All commands flow DOWN through the chain:
 *
 *   Human (Telegram) → @BeeFranknBot (Floor 20)
 *       → Analyze command → Route to correct floor
 *           → FloorManager (Project Floor)
 *               → Delegate to division agents
 *               → OR Swarm intelligent agents across floors
 *                   → Complete → Log → Report back up chain
 *
 * The chain is fully observable - every delegation step is logged,
 * visualized in 3D (connection lines, agent movement), and reported
 * back to @BeeFranknBot for human visibility.
 */
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { taskLogger } from '../core/TaskLogger.js';
import { FloorManager } from './FloorManager.js';
import { SwarmIntelligence } from './SwarmIntelligence.js';

export class C2CommandChain {
    /**
     * @param {THREE.Scene} scene
     * @param {import('./AgentManager.js').AgentManager} agentManager
     * @param {object} options
     * @param {Array} options.projects - Project definitions
     * @param {Array} options.enterpriseFloors - Enterprise floor definitions
     */
    constructor(scene, agentManager, options = {}) {
        this.scene = scene;
        this.agentManager = agentManager;
        this.projects = options.projects || [];
        this.enterpriseFloors = options.enterpriseFloors || [];

        /** @type {Map<number, FloorManager>} floor number → FloorManager */
        this.floorManagers = new Map();

        /** @type {SwarmIntelligence} */
        this.swarm = new SwarmIntelligence(scene, agentManager);

        this._initialized = false;
    }

    // ─── Initialize ─────────────────────────────────────
    async init() {
        // Create FloorManagers for each project floor
        for (const project of this.projects) {
            const fm = new FloorManager(project.floor, project, this.agentManager);
            this.floorManagers.set(project.floor, fm);
        }

        // Create FloorManagers for enterprise floors too
        // floors.json uses 'index' for floor number, not 'floor'
        for (const ef of this.enterpriseFloors) {
            const floorNum = ef.floor || ef.index;
            if (floorNum > 0 && !this.floorManagers.has(floorNum)) {
                const fm = new FloorManager(floorNum, { id: ef.id, name: ef.name }, this.agentManager);
                this.floorManagers.set(floorNum, fm);
            }
        }

        // Listen for commands from BeeFrank C2
        eventBus.on('beefrank:command', (cmd) => this._handleC2Command(cmd));
        eventBus.on('c2:command', (cmd) => this._handleC2Command(cmd));

        // Listen for task completions to report back up
        eventBus.on('task:completed', (data) => this._reportCompletion(data));
        eventBus.on('task:failed', (data) => this._reportFailure(data));

        // Listen for direct API commands
        eventBus.on('BEEFRANK_MESSAGE', (data) => this._parseBeeFrankMessage(data));
        eventBus.on('NAVIGATE_FLOOR', (data) => this._handleNavigate(data));

        this._initialized = true;
        console.log(`[C2] Command chain initialized: ${this.floorManagers.size} floor managers, swarm ready`);
        eventBus.emit('c2:ready', { floorManagers: this.floorManagers.size });
    }

    // ─── Command Parsing ────────────────────────────────
    _parseBeeFrankMessage(data) {
        const text = (data.text || '').trim();
        if (!text.startsWith('/')) return; // Not a command

        const parts = text.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');

        switch (cmd) {
            case '/task':
                this._handleC2Command({
                    command: 'task',
                    args: { title: args, description: args },
                    source: 'telegram',
                    chatId: data.chatId
                });
                break;

            case '/deploy':
                this._handleC2Command({
                    command: 'deploy',
                    args: { project: args || 'tsiapp' },
                    source: 'telegram',
                    chatId: data.chatId
                });
                break;

            case '/swarm':
                this._handleC2Command({
                    command: 'swarm',
                    args: { title: args, priority: 'critical' },
                    source: 'telegram',
                    chatId: data.chatId
                });
                break;

            case '/status':
                this._sendStatusReport(data.chatId);
                break;

            case '/tasks':
                this._sendTaskReport(data.chatId);
                break;

            case '/floor':
                const floorNum = parseInt(args);
                if (floorNum) {
                    eventBus.emit('camera:gotoFloor', { floor: floorNum });
                }
                break;
        }
    }

    // ─── C2 Command Handler ─────────────────────────────
    _handleC2Command(cmd) {
        const { command, args = {}, source = 'highrise', chatId } = cmd;

        console.log(`[C2] Command received: ${command}`, args);

        switch (command) {
            case 'task':
                this._createAndDelegate(args, source, chatId);
                break;

            case 'deploy':
                this._createDeployTask(args, source, chatId);
                break;

            case 'swarm':
                this._createSwarmTask(args, source, chatId);
                break;

            case 'assign':
                this._directAssign(args);
                break;

            case 'recall':
                this._recallSwarm(args);
                break;

            default:
                // Try to route as a generic task
                this._createAndDelegate({
                    title: `${command}: ${JSON.stringify(args)}`,
                    description: args.description || ''
                }, source, chatId);
        }
    }

    // ─── Task Creation & Delegation ─────────────────────
    _createAndDelegate(args, source, chatId) {
        const { title, description = '', project, floor, priority = 'normal', division } = args;

        // Create task in logger
        const task = taskLogger.createTask({
            title: title || 'Untitled Task',
            description,
            source,
            sourceAgent: 'beefrank',
            priority,
            targetProject: project,
            targetFloor: floor,
            targetDivision: division
        });

        // Determine target floor
        let targetFloor = floor;
        if (!targetFloor && project) {
            const proj = this.projects.find(p => p.id === project || p.name === project);
            if (proj) targetFloor = proj.floor;
        }
        if (!targetFloor) {
            targetFloor = this._inferFloor(title, description);
        }

        // Delegate to floor manager
        const fm = this.floorManagers.get(targetFloor);
        if (fm) {
            eventBus.emit(`floor:${targetFloor}:task`, {
                taskId: task.id,
                title: task.title,
                description: task.description,
                priority: task.priority,
                fromAgent: 'beefrank'
            });
        } else {
            console.warn(`[C2] No floor manager for floor ${targetFloor}, assigning to production floor`);
            // Default to TSIAPP floor
            eventBus.emit('floor:15:task', {
                taskId: task.id,
                title: task.title,
                description: task.description,
                priority: task.priority,
                fromAgent: 'beefrank'
            });
        }

        // Notify telegram if applicable
        if (chatId) {
            eventBus.emit('beefrank:reply', {
                chatId,
                text: `Task ${task.id} created and delegated to Floor ${targetFloor}`
            });
        }

        return task;
    }

    _createDeployTask(args, source, chatId) {
        const project = args.project || 'tsiapp';
        return this._createAndDelegate({
            title: `Deploy ${project}`,
            description: `Deploy latest build of ${project} to production`,
            project,
            priority: 'high',
            division: 'production'
        }, source, chatId);
    }

    _createSwarmTask(args, source, chatId) {
        const task = taskLogger.createTask({
            title: args.title || 'Swarm Task',
            description: args.description || 'Critical task requiring swarm intelligence',
            source,
            sourceAgent: 'beefrank',
            priority: 'critical',
            targetProject: args.project,
            targetFloor: args.floor
        });

        // Activate swarm
        this.swarm.handleSwarmRequest({
            taskId: task.id,
            targetFloor: args.floor || 15,
            coordinatorId: 'beefrank',
            requiredCapabilities: args.capabilities || ['code-generation', 'testing', 'deployment'],
            priority: 'critical',
            maxAgents: args.maxAgents || 8
        });

        if (chatId) {
            eventBus.emit('beefrank:reply', {
                chatId,
                text: `SWARM ACTIVATED: Task ${task.id} - recruiting agents across all floors`
            });
        }

        return task;
    }

    _directAssign(args) {
        const { agentId, taskTitle } = args;
        const agent = this.agentManager.getAgent(agentId);
        if (agent) {
            agent.setState('working');
            console.log(`[C2] Directly assigned "${taskTitle}" to agent ${agentId}`);
        }
    }

    _recallSwarm(args) {
        const { taskId } = args;
        if (taskId) {
            this.swarm.completeSwarm({ taskId });
        }
    }

    // ─── Floor Inference ────────────────────────────────
    _inferFloor(title, description) {
        const text = `${title} ${description}`.toLowerCase();

        // Project name matching
        for (const p of this.projects) {
            if (text.includes(p.id) || text.includes(p.name?.toLowerCase())) {
                return p.floor;
            }
        }

        // Division matching → enterprise floors
        if (text.includes('security') || text.includes('threat')) return 19;
        if (text.includes('legal') || text.includes('compliance')) return 18;
        if (text.includes('research') || text.includes('prototype')) return 17;
        if (text.includes('finance') || text.includes('budget')) return 16;

        // Default to TSIAPP (flagship)
        return 15;
    }

    // ─── Reporting ──────────────────────────────────────
    _reportCompletion(data) {
        eventBus.emit('beefrank:reply', {
            text: `Task ${data.taskId} COMPLETED: ${data.result || 'Success'}`
        });

        // If this was a swarm task, complete the swarm session
        this.swarm.completeSwarm(data);
    }

    _reportFailure(data) {
        eventBus.emit('beefrank:reply', {
            text: `Task ${data.taskId} FAILED: ${data.reason || 'Unknown'}`
        });
    }

    _sendStatusReport(chatId) {
        const stats = taskLogger.getStats();
        const fmStatus = Array.from(this.floorManagers.values())
            .filter(fm => fm.getActiveTaskCount() > 0)
            .map(fm => `  F${fm.floor}: ${fm.getActiveTaskCount()} active`)
            .join('\n');

        const swarms = this.swarm.getActiveSessions();
        const swarmStatus = swarms.length > 0
            ? swarms.map(s => `  ${s.taskId}: ${s.agentCount} agents, ${s.status}`).join('\n')
            : '  None';

        eventBus.emit('beefrank:reply', {
            chatId,
            text: `*HIGHRISE C2 STATUS*\n━━━━━━━━━━━━━━━\n*Tasks:*\n  Active: ${stats.active}\n  Completed: ${stats.completedTotal}\n  Failed: ${stats.failedTotal}\n\n*Busy Floors:*\n${fmStatus || '  All clear'}\n\n*Swarms:*\n${swarmStatus}\n\n*Floor Managers:* ${this.floorManagers.size}\n*Avg Task Time:* ${Math.round(stats.avgDuration / 1000)}s`
        });
    }

    _sendTaskReport(chatId) {
        const active = taskLogger.getActiveTasks();
        const recent = taskLogger.getCompletedTasks(5);

        let text = '*ACTIVE TASKS*\n';
        if (active.length === 0) {
            text += '  No active tasks\n';
        } else {
            for (const t of active) {
                text += `  ${t.id} [${t.status}] ${t.title} (${t.progress}%)\n`;
                text += `    Chain: ${t.delegationChain.map(d => d.toAgent).join(' → ')}\n`;
            }
        }

        text += '\n*RECENT COMPLETED*\n';
        for (const t of recent) {
            const dur = t.duration ? `${(t.duration / 1000).toFixed(1)}s` : '?';
            text += `  ${t.id} ${t.title} (${dur})\n`;
        }

        eventBus.emit('beefrank:reply', { chatId, text });
    }

    _handleNavigate(data) {
        eventBus.emit('camera:gotoFloor', data);
    }

    // ─── Update Loop ────────────────────────────────────
    update(delta) {
        if (!this._initialized) return;
        this.swarm.update(delta);
    }

    // ─── Query API ──────────────────────────────────────
    getFloorManager(floor) {
        return this.floorManagers.get(floor);
    }

    getAllFloorManagers() {
        return Array.from(this.floorManagers.values());
    }

    getTaskLog() {
        return taskLogger.getFullLog();
    }

    getStats() {
        return {
            ...taskLogger.getStats(),
            floorManagers: this.floorManagers.size,
            activeSwarms: this.swarm.getActiveSessions().length
        };
    }
}
