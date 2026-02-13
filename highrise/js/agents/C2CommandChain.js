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

        /** @type {import('./SallyC2.js').SallyC2|null} Linked RIGHT tower C2 */
        this.sallyC2 = null;

        /** @type {import('../core/TowerBridge.js').TowerBridge|null} Cross-tower bridge */
        this.towerBridge = null;

        this._initialized = false;
    }

    /**
     * Link TowerBridge for cross-tower dedup
     * @param {object} bridge
     */
    setTowerBridge(bridge) {
        this.towerBridge = bridge;
        console.log('[C2] TowerBridge linked - dedup enabled');
    }

    /**
     * Link the RIGHT tower C2 chain (Sally) for cross-tower delegation
     * @param {import('./SallyC2.js').SallyC2} sallyC2
     */
    setSallyC2(sallyC2) {
        this.sallyC2 = sallyC2;
        console.log('[C2] Sally C2 linked - dual tower routing enabled');
    }

    /**
     * Determine which tower(s) should handle a task based on keywords
     * @param {string} title
     * @param {string} description
     * @returns {'left'|'right'|'both'}
     */
    _determineTower(title, description) {
        const text = `${title} ${description}`.toLowerCase();

        const rightKeywords = ['deploy', 'server', 'vps', 'ssl', 'dns', 'subdomain', 'uptime',
            'bandwidth', 'database', 'backup', 'rsync', 'ftp', 'monitor', 'alerting',
            'rate-limit', 'endpoint', 'rollback', 'health-check'];
        const leftKeywords = ['build', 'design', 'prototype', 'test', 'code', 'develop',
            'ui', 'frontend', 'component', 'style', 'feature', 'bug', 'fix'];
        const bothKeywords = ['full-stack', 'release', 'migrate', 'sync', 'full cycle'];

        // Check 'both' first (highest priority)
        if (bothKeywords.some(kw => text.includes(kw))) return 'both';

        // Score each tower
        let rightScore = 0, leftScore = 0;
        for (const kw of rightKeywords) { if (text.includes(kw)) rightScore++; }
        for (const kw of leftKeywords) { if (text.includes(kw)) leftScore++; }

        // Deploy tasks that also mention build are cross-tower
        if (text.includes('deploy') && (text.includes('build') || text.includes('test'))) {
            return 'both';
        }

        if (rightScore > 0 && leftScore === 0) return 'right';
        if (rightScore > leftScore) return 'right';

        return 'left';
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

        // Handle beefrank:reply - forward to UI via c2:reply (fix dead end)
        eventBus.on('beefrank:reply', (data) => {
            eventBus.emit('c2:reply', {
                text: data.text,
                chatId: data.chatId,
                source: 'beefrank',
                timestamp: Date.now(),
            });
        });

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

        // TowerBridge dedup check
        if (this.towerBridge) {
            const isDupe = this.towerBridge.isDuplicate({ title, targetProject: project, targetFloor: floor });
            if (isDupe) {
                console.warn(`[C2] TowerBridge blocked duplicate: "${title}"`);
                if (chatId) {
                    eventBus.emit('beefrank:reply', {
                        chatId,
                        text: `DUPLICATE BLOCKED: "${title}" already exists on another tower`
                    });
                }
                return null;
            }
        }

        // Determine which tower handles this task
        const tower = this._determineTower(title || '', description);

        // Create task in logger
        const task = taskLogger.createTask({
            title: title || 'Untitled Task',
            description,
            source,
            sourceAgent: 'beefrank',
            priority,
            targetProject: project,
            targetFloor: floor,
            targetDivision: division,
            tower
        });

        // Emit c2:taskCreated for TowerBridge tracking
        eventBus.emit('c2:taskCreated', { ...task });

        // Route to RIGHT tower via Sally C2
        if ((tower === 'right' || tower === 'both') && this.sallyC2) {
            eventBus.emit('c2:cross:right', {
                command: 'task',
                args: { title: task.title, description: task.description, priority, division },
                source: 'c2-cross',
                chatId,
                taskId: task.id
            });

            // Emit cross-tower visualization event
            eventBus.emit('wall:crossTowerTask', {
                taskId: task.id,
                title: task.title,
                type: tower === 'both' ? 'sync' : 'command',
                fromFloor: 20,
                toFloor: floor || 15
            });

            if (tower === 'right') {
                // Pure right-tower task, done here
                if (chatId) {
                    eventBus.emit('beefrank:reply', {
                        chatId,
                        text: `Task ${task.id} routed to RIGHT TOWER (Sally C2)`
                    });
                }
                return task;
            }
        }

        // LEFT tower delegation (or 'both' tower - LEFT portion)
        let targetFloor = floor;
        if (!targetFloor && project) {
            const proj = this.projects.find(p => p.id === project || p.name === project);
            if (proj) targetFloor = proj.floor;
        }
        if (!targetFloor) {
            targetFloor = this._inferFloor(title, description);
        }

        // Delegate to LEFT floor manager
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
            eventBus.emit('floor:15:task', {
                taskId: task.id,
                title: task.title,
                description: task.description,
                priority: task.priority,
                fromAgent: 'beefrank'
            });
        }

        // Notify telegram if applicable
        const towerLabel = tower === 'both' ? 'BOTH TOWERS' : `Floor ${targetFloor}`;
        if (chatId) {
            eventBus.emit('beefrank:reply', {
                chatId,
                text: `Task ${task.id} created and delegated to ${towerLabel}`
            });
        }

        return task;
    }

    _createDeployTask(args, source, chatId) {
        const project = args.project || 'tsiapp';

        // Deploy is always cross-tower: LEFT builds, RIGHT deploys
        const task = this._createAndDelegate({
            title: `Deploy ${project}`,
            description: `Build and deploy ${project} to production (cross-tower)`,
            project,
            priority: 'high',
            division: 'production'
        }, source, chatId);

        // Explicitly route the deploy portion to Sally C2
        if (this.sallyC2) {
            eventBus.emit('c2:cross:right', {
                command: 'deploy',
                args: { project },
                source: 'c2-cross',
                chatId,
                taskId: task?.id
            });

            eventBus.emit('wall:crossTowerTask', {
                taskId: task?.id,
                title: `Deploy ${project}`,
                type: 'deployment',
                fromFloor: 15,
                toFloor: 15
            });
        }

        return task;
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

        // LEFT tower floors
        const leftFmStatus = Array.from(this.floorManagers.values())
            .filter(fm => fm.getActiveTaskCount() > 0)
            .map(fm => `  F${fm.floor}L: ${fm.getActiveTaskCount()} active`)
            .join('\n');

        // RIGHT tower floors (via Sally C2)
        let rightFmStatus = '  No Sally C2';
        let rightTasks = 0;
        if (this.sallyC2) {
            const sallyStatus = this.sallyC2.getStatus();
            rightTasks = sallyStatus.activeTasks;
            rightFmStatus = sallyStatus.busyFloors || '  All clear';
        }

        const swarms = this.swarm.getActiveSessions();
        const swarmStatus = swarms.length > 0
            ? swarms.map(s => `  ${s.taskId}: ${s.agentCount} agents, ${s.status}`).join('\n')
            : '  None';

        eventBus.emit('beefrank:reply', {
            chatId,
            text: `*HIGHRISE C2 STATUS*\n━━━━━━━━━━━━━━━\n*Tasks:*\n  Active: ${stats.active}\n  Completed: ${stats.completedTotal}\n  Failed: ${stats.failedTotal}\n\n*LEFT TOWER (BeeFrank):*\n${leftFmStatus || '  All clear'}\n\n*RIGHT TOWER (Sally):*\n${rightFmStatus}\n  Active: ${rightTasks}\n\n*Swarms:*\n${swarmStatus}\n\n*Floor Managers:* ${this.floorManagers.size} LEFT + ${this.sallyC2?.floorManagers?.size || 0} RIGHT\n*Avg Task Time:* ${Math.round(stats.avgDuration / 1000)}s`
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
