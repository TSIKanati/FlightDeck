/**
 * SallyC2 - RIGHT Tower Command & Control Chain
 *
 * Sally sits at Floor 20 RIGHT as the RIGHT tower's C2 commander,
 * mirroring BeeFrank's authority over the LEFT tower.
 *
 *   BeeFrank (Floor 20 LEFT) delegates RIGHT-tower tasks via c2:cross:right
 *       → Sally (Floor 20 RIGHT)
 *           → RIGHT FloorManagers (server floors)
 *               → Server Agents (deploy, sync, monitor, SSL, DNS, backup)
 *                   → Complete → Report back to BeeFrank via beefrank:reply
 *
 * Server-specific commands: deploy, sync, monitor, ssl, subdomain, backup
 */
import { eventBus } from '../core/EventBus.js';
import { taskLogger } from '../core/TaskLogger.js';
import { FloorManager } from './FloorManager.js';

// Keywords that indicate server/RIGHT-tower work
const SERVER_KEYWORDS = [
    'deploy', 'rollback', 'health-check', 'ftp', 'rsync', 'file-watch',
    'uptime', 'alerting', 'log-analysis', 'api-health', 'rate-limit',
    'endpoint', 'dns', 'ssl', 'subdomain', 'backup', 'migration',
    'query', 'database', 'server', 'vps', 'bandwidth', 'monitor'
];

export class SallyC2 {
    /**
     * @param {THREE.Scene} scene
     * @param {import('./AgentManager.js').AgentManager} agentManager
     * @param {object} options
     * @param {Array} options.serverAgents - Server agent definitions from server-agents.json
     */
    constructor(scene, agentManager, options = {}) {
        this.scene = scene;
        this.agentManager = agentManager;
        this.serverAgents = options.serverAgents || [];

        /** @type {Map<number, FloorManager>} floor number → RIGHT FloorManager */
        this.floorManagers = new Map();

        /** @type {Map<string, object>} active C2 tasks */
        this.activeTasks = new Map();

        this._initialized = false;
    }

    // ─── Initialize ─────────────────────────────────────
    async init() {
        // Create FloorManagers for RIGHT tower floors where server agents live
        const rightFloors = new Map();
        for (const agent of this.serverAgents) {
            const floor = agent.floor;
            if (!rightFloors.has(floor)) {
                rightFloors.set(floor, {
                    id: `right-f${floor}`,
                    name: `RIGHT Tower Floor ${floor}`
                });
            }
        }

        for (const [floor, projectDef] of rightFloors) {
            const fm = new FloorManager(floor, projectDef, this.agentManager, { tower: 'right' });
            this.floorManagers.set(floor, fm);
        }

        // Listen for commands directed at Sally / RIGHT tower
        eventBus.on('sally:command', (cmd) => this._handleCommand(cmd));
        eventBus.on('c2:cross:right', (cmd) => this._handleCommand(cmd));

        // Listen for task completions from RIGHT tower
        eventBus.on('task:completed', (data) => this._handleCompletion(data));
        eventBus.on('task:failed', (data) => this._handleFailure(data));

        this._initialized = true;
        console.log(`[SallyC2] RIGHT tower C2 initialized: ${this.floorManagers.size} floor managers, ${this.serverAgents.length} server agents`);
        eventBus.emit('sallyC2:ready', {
            floorManagers: this.floorManagers.size,
            agents: this.serverAgents.length
        });
    }

    // ─── Command Handling ────────────────────────────────
    _handleCommand(cmd) {
        const { command, args = {}, source = 'c2-cross', chatId, taskId: existingTaskId } = cmd;

        console.log(`[SallyC2] Command received: ${command}`, args);

        switch (command) {
            case 'deploy':
                this._handleDeploy(args, source, chatId, existingTaskId);
                break;
            case 'sync':
                this._handleSync(args, source, chatId, existingTaskId);
                break;
            case 'monitor':
                this._handleMonitor(args, source, chatId);
                break;
            case 'ssl':
                this._handleSSL(args, source, chatId);
                break;
            case 'subdomain':
                this._handleSubdomain(args, source, chatId);
                break;
            case 'backup':
                this._handleBackup(args, source, chatId);
                break;
            case 'task':
                this._delegateTask(args, source, chatId, existingTaskId);
                break;
            default:
                // Generic server task
                this._delegateTask({
                    title: args.title || `${command}: ${JSON.stringify(args)}`,
                    description: args.description || '',
                    ...args
                }, source, chatId, existingTaskId);
        }
    }

    // ─── Deploy ──────────────────────────────────────────
    _handleDeploy(args, source, chatId, existingTaskId) {
        const project = args.project || 'tsiapp';
        this._delegateTask({
            title: `Deploy ${project} to production`,
            description: `Deploy latest build of ${project}. Rollback ready.`,
            priority: 'high',
            division: 'production',
            floor: 15
        }, source, chatId, existingTaskId);

        // Notify Sally bot
        eventBus.emit('sally:deploy:start', { project, source });
    }

    // ─── Sync ────────────────────────────────────────────
    _handleSync(args, source, chatId, existingTaskId) {
        const target = args.target || args.project || 'all';
        this._delegateTask({
            title: `Sync ${target}`,
            description: `FTP/rsync synchronization for ${target}`,
            priority: 'normal',
            division: 'production',
            floor: 15
        }, source, chatId, existingTaskId);

        eventBus.emit('sally:sync:start', { target, source });
    }

    // ─── Monitor ─────────────────────────────────────────
    _handleMonitor(args, source, chatId) {
        const target = args.target || 'all';
        this._delegateTask({
            title: `Monitor ${target}`,
            description: `Uptime check and log analysis for ${target}`,
            priority: 'normal',
            division: 'security',
            floor: 19
        }, source, chatId);
    }

    // ─── SSL ─────────────────────────────────────────────
    _handleSSL(args, source, chatId) {
        const domain = args.domain || args.target || 'unknown';
        this._delegateTask({
            title: `SSL cert for ${domain}`,
            description: `SSL certificate management for ${domain}`,
            priority: 'high',
            division: 'legal',
            floor: 18
        }, source, chatId);
    }

    // ─── Subdomain ───────────────────────────────────────
    _handleSubdomain(args, source, chatId) {
        const sub = args.subdomain || args.target || 'new';
        this._delegateTask({
            title: `Subdomain: ${sub}`,
            description: `DNS routing and subdomain configuration for ${sub}`,
            priority: 'normal',
            division: 'legal',
            floor: 18
        }, source, chatId);
    }

    // ─── Backup ──────────────────────────────────────────
    _handleBackup(args, source, chatId) {
        const target = args.target || 'full';
        this._delegateTask({
            title: `Backup ${target}`,
            description: `Database backup and migration prep for ${target}`,
            priority: 'normal',
            division: 'accounting',
            floor: 16
        }, source, chatId);
    }

    // ─── Task Delegation ─────────────────────────────────
    _delegateTask(args, source, chatId, existingTaskId) {
        const { title, description = '', priority = 'normal', division, floor } = args;

        // Create or reuse task
        let task;
        if (existingTaskId) {
            task = taskLogger.getTask(existingTaskId);
            if (!task) {
                task = taskLogger.createTask({
                    title,
                    description,
                    source,
                    sourceAgent: 'sally',
                    priority,
                    targetFloor: floor,
                    targetDivision: division,
                    tower: 'right'
                });
            }
        } else {
            task = taskLogger.createTask({
                title,
                description,
                source,
                sourceAgent: 'sally',
                priority,
                targetFloor: floor,
                targetDivision: division,
                tower: 'right'
            });
        }

        // Track
        this.activeTasks.set(task.id, {
            task,
            floor: floor || this._inferFloor(title, description),
            startTime: Date.now()
        });

        // Determine target floor
        let targetFloor = floor || this._inferFloor(title, description);

        // Delegate to RIGHT tower FloorManager
        const fm = this.floorManagers.get(targetFloor);
        if (fm) {
            eventBus.emit(`floor:right:${targetFloor}:task`, {
                taskId: task.id,
                title: task.title,
                description: task.description,
                priority: task.priority,
                fromAgent: 'sally',
                tower: 'right'
            });
        } else {
            // Default to first available RIGHT tower FloorManager
            const defaultFloor = this.floorManagers.keys().next().value;
            if (defaultFloor !== undefined) {
                eventBus.emit(`floor:right:${defaultFloor}:task`, {
                    taskId: task.id,
                    title: task.title,
                    description: task.description,
                    priority: task.priority,
                    fromAgent: 'sally',
                    tower: 'right'
                });
            } else {
                console.error(`[SallyC2] No FloorManagers available for task ${task.id}`);
                eventBus.emit('task:failed', {
                    taskId: task.id,
                    reason: 'No RIGHT tower FloorManagers available'
                });
            }
        }

        // Report back to BeeFrank
        if (chatId) {
            eventBus.emit('beefrank:reply', {
                chatId,
                text: `[RIGHT TOWER] Task ${task.id} delegated to Floor ${targetFloor}: ${title}`
            });
        }

        return task;
    }

    // ─── Floor Inference ─────────────────────────────────
    _inferFloor(title, description) {
        const text = `${title} ${description}`.toLowerCase();

        // Server-specific floor mapping
        if (text.match(/deploy|rollback|sync|rsync|ftp|ship|production/)) return 15;
        if (text.match(/backup|migration|database|query|data/)) return 16;
        if (text.match(/api|endpoint|rate.limit|prototype/)) return 17;
        if (text.match(/dns|ssl|subdomain|cert|domain|legal/)) return 18;
        if (text.match(/uptime|monitor|alert|log|security|watch/)) return 19;

        // Default to production
        return 15;
    }

    // ─── Completion Handling ─────────────────────────────
    _handleCompletion(data) {
        const tracked = this.activeTasks.get(data.taskId);
        if (!tracked) return;

        this.activeTasks.delete(data.taskId);

        // Report back to BeeFrank
        eventBus.emit('beefrank:reply', {
            text: `[RIGHT TOWER] Task ${data.taskId} COMPLETED: ${data.result || 'Success'}`
        });
    }

    _handleFailure(data) {
        const tracked = this.activeTasks.get(data.taskId);
        if (!tracked) return;

        this.activeTasks.delete(data.taskId);

        eventBus.emit('beefrank:reply', {
            text: `[RIGHT TOWER] Task ${data.taskId} FAILED: ${data.reason || 'Unknown'}`
        });
    }

    // ─── Status ──────────────────────────────────────────
    getStatus() {
        const fmStatus = Array.from(this.floorManagers.values())
            .filter(fm => fm.getActiveTaskCount() > 0)
            .map(fm => `  F${fm.floor}R: ${fm.getActiveTaskCount()} active`)
            .join('\n');

        return {
            tower: 'right',
            commander: 'sally',
            floorManagers: this.floorManagers.size,
            activeTasks: this.activeTasks.size,
            busyFloors: fmStatus || 'All clear'
        };
    }

    // ─── Update Loop ─────────────────────────────────────
    update(delta) {
        if (!this._initialized) return;
        // Future: tick server-side health checks, timeout stale tasks
    }

    // ─── Query API ───────────────────────────────────────
    getFloorManager(floor) {
        return this.floorManagers.get(floor);
    }

    getAllFloorManagers() {
        return Array.from(this.floorManagers.values());
    }
}
