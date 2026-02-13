/**
 * TaskLogger - Enterprise task logging system for The Highrise
 * Tracks every task from C2 command through delegation chain to completion.
 *
 * Flow: BeeFrank (C2) → FloorManager → Agent(s) → Completion → Log
 */
import { eventBus } from './EventBus.js';

const MAX_LOG_SIZE = 500;

export class TaskLogger {
    constructor() {
        /** @type {Map<string, TaskEntry>} */
        this.tasks = new Map();
        /** @type {TaskEntry[]} completed log */
        this.completedLog = [];
        this._idCounter = 0;

        eventBus.on('task:created', (t) => this._onCreated(t));
        eventBus.on('task:delegated', (t) => this._onDelegated(t));
        eventBus.on('task:swarmed', (t) => this._onSwarmed(t));
        eventBus.on('task:progress', (t) => this._onProgress(t));
        eventBus.on('task:completed', (t) => this._onCompleted(t));
        eventBus.on('task:failed', (t) => this._onFailed(t));
    }

    // ─── Create ─────────────────────────────────────────
    createTask(params) {
        const id = `TSK-${String(++this._idCounter).padStart(5, '0')}`;
        const task = {
            id,
            title: params.title || 'Untitled Task',
            description: params.description || '',
            source: params.source || 'unknown',
            sourceAgent: params.sourceAgent || null,
            priority: params.priority || 'normal', // low | normal | high | critical
            targetFloor: params.targetFloor || null,
            targetProject: params.targetProject || null,
            targetDivision: params.targetDivision || null,
            tower: params.tower || 'left',  // 'left' | 'right' | 'both'
            crossTowerLink: params.crossTowerLink || null,  // linked task ID for cross-tower pairs
            status: 'pending',    // pending → delegated → in-progress → swarming → completed | failed
            delegationChain: [],  // { agent, floor, division, timestamp, action }
            assignedAgents: [],   // current assigned agent IDs
            swarmAgents: [],      // agents pulled in via swarm
            progress: 0,          // 0-100
            logs: [],             // { timestamp, message, agent }
            createdAt: Date.now(),
            updatedAt: Date.now(),
            completedAt: null,
            duration: null,
            result: null
        };

        this.tasks.set(id, task);
        this._log(task, `Task created by ${task.source}`, task.sourceAgent);
        eventBus.emit('task:created', { ...task });
        eventBus.emit('tasklog:update', this.getStats());
        return task;
    }

    // ─── Event Handlers ─────────────────────────────────
    _onCreated(task) {
        // Already handled in createTask
    }

    _onDelegated(data) {
        const task = this.tasks.get(data.taskId);
        if (!task) return;

        task.status = 'delegated';
        task.delegationChain.push({
            agent: data.fromAgent,
            toAgent: data.toAgent,
            floor: data.floor,
            division: data.division,
            timestamp: Date.now(),
            action: 'delegate'
        });
        if (data.toAgent && !task.assignedAgents.includes(data.toAgent)) {
            task.assignedAgents.push(data.toAgent);
        }
        task.updatedAt = Date.now();
        this._log(task, `Delegated: ${data.fromAgent} → ${data.toAgent} (Floor ${data.floor})`, data.fromAgent);
        eventBus.emit('tasklog:update', this.getStats());
    }

    _onSwarmed(data) {
        const task = this.tasks.get(data.taskId);
        if (!task) return;

        task.status = 'swarming';
        for (const agentId of (data.agents || [])) {
            if (!task.swarmAgents.includes(agentId)) {
                task.swarmAgents.push(agentId);
            }
            task.delegationChain.push({
                agent: data.coordinator,
                toAgent: agentId,
                floor: data.floor,
                division: data.division,
                timestamp: Date.now(),
                action: 'swarm-recruit'
            });
        }
        task.updatedAt = Date.now();
        this._log(task, `Swarm activated: ${data.agents.length} agents recruited by ${data.coordinator}`, data.coordinator);
        eventBus.emit('tasklog:update', this.getStats());
    }

    _onProgress(data) {
        const task = this.tasks.get(data.taskId);
        if (!task) return;

        task.status = 'in-progress';
        task.progress = Math.min(100, Math.max(0, data.progress || task.progress));
        task.updatedAt = Date.now();
        if (data.message) {
            this._log(task, data.message, data.agent);
        }
    }

    _onCompleted(data) {
        const task = this.tasks.get(data.taskId);
        if (!task) return;

        task.status = 'completed';
        task.progress = 100;
        task.completedAt = Date.now();
        task.duration = task.completedAt - task.createdAt;
        task.result = data.result || 'Success';
        task.updatedAt = Date.now();

        this._log(task, `Completed in ${this._formatDuration(task.duration)}. Result: ${task.result}`, data.agent);

        // Move to completed log
        this.completedLog.push({ ...task });
        if (this.completedLog.length > MAX_LOG_SIZE) this.completedLog.shift();
        this.tasks.delete(data.taskId);

        eventBus.emit('tasklog:completed', { ...task });
        eventBus.emit('tasklog:update', this.getStats());
    }

    _onFailed(data) {
        const task = this.tasks.get(data.taskId);
        if (!task) return;

        task.status = 'failed';
        task.completedAt = Date.now();
        task.duration = task.completedAt - task.createdAt;
        task.result = data.reason || 'Unknown failure';
        task.updatedAt = Date.now();

        this._log(task, `FAILED: ${task.result}`, data.agent);

        this.completedLog.push({ ...task });
        if (this.completedLog.length > MAX_LOG_SIZE) this.completedLog.shift();
        this.tasks.delete(data.taskId);

        eventBus.emit('tasklog:failed', { ...task });
        eventBus.emit('tasklog:update', this.getStats());
    }

    // ─── Internal Logging ───────────────────────────────
    _log(task, message, agent) {
        task.logs.push({
            timestamp: Date.now(),
            message,
            agent: agent || 'system'
        });
    }

    _formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}min`;
    }

    // ─── Query API ──────────────────────────────────────
    getTask(taskId) {
        return this.tasks.get(taskId) || this.completedLog.find(t => t.id === taskId);
    }

    getActiveTasks() {
        return Array.from(this.tasks.values());
    }

    getCompletedTasks(limit = 50) {
        return this.completedLog.slice(-limit);
    }

    getTasksByFloor(floor) {
        return Array.from(this.tasks.values()).filter(t => t.targetFloor === floor);
    }

    getTasksByAgent(agentId) {
        return Array.from(this.tasks.values()).filter(t =>
            t.assignedAgents.includes(agentId) || t.swarmAgents.includes(agentId)
        );
    }

    /**
     * @param {string} tower - 'left', 'right', or 'both'
     * @returns {object[]}
     */
    getTasksByTower(tower) {
        return Array.from(this.tasks.values()).filter(t =>
            t.tower === tower || t.tower === 'both'
        );
    }

    /**
     * Get all cross-tower tasks (tasks that span both towers)
     * @returns {object[]}
     */
    getCrossTowerTasks() {
        return Array.from(this.tasks.values()).filter(t =>
            t.tower === 'both' || t.crossTowerLink
        );
    }

    getStats() {
        const active = Array.from(this.tasks.values());
        return {
            active: active.length,
            pending: active.filter(t => t.status === 'pending').length,
            delegated: active.filter(t => t.status === 'delegated').length,
            inProgress: active.filter(t => t.status === 'in-progress').length,
            swarming: active.filter(t => t.status === 'swarming').length,
            completedTotal: this.completedLog.length,
            failedTotal: this.completedLog.filter(t => t.status === 'failed').length,
            avgDuration: this.completedLog.length > 0
                ? this.completedLog.reduce((s, t) => s + (t.duration || 0), 0) / this.completedLog.length
                : 0
        };
    }

    getFullLog() {
        return {
            active: this.getActiveTasks(),
            completed: this.completedLog,
            stats: this.getStats()
        };
    }
}

export const taskLogger = new TaskLogger();
