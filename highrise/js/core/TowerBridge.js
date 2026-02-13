/**
 * TowerBridge - Cross-Tower Dedup & Coordination
 * TSI Enterprise 3D Command Center
 *
 * Sits between C2CommandChain and SallyC2 to prevent duplicate work
 * and coordinate cross-tower efforts.
 *
 * Hooks into c2:taskCreated and sally:taskCreated events.
 * Emits bridge:duplicate when duplicate detected.
 * Emits bridge:status on any change.
 */
import { eventBus } from './EventBus.js';

export class TowerBridge {
    constructor() {
        /** @type {Map<string, { taskId: string, tower: string, title: string, timestamp: number }>} */
        this.taskHashes = new Map();
        this.TTL = 300000; // 5 minutes
        this.dedupCount = 0;
        this._c2 = null;
        this._sallyC2 = null;
        this._agentManager = null;
        this._cleanInterval = null;
    }

    /**
     * Initialize the bridge with C2 references
     * @param {object} c2 - C2CommandChain instance
     * @param {object} sallyC2 - SallyC2 instance
     * @param {object} agentManager - AgentManager instance
     */
    init(c2, sallyC2, agentManager) {
        this._c2 = c2;
        this._sallyC2 = sallyC2;
        this._agentManager = agentManager;

        // Listen for tasks created on either tower
        eventBus.on('task:created', (task) => {
            this._onTaskCreated(task);
        });

        // Periodic cleanup
        this._cleanInterval = setInterval(() => this._cleanExpired(), 60000);

        console.log('[TowerBridge] Cross-tower coordination active');
        this._emitStatus();
    }

    /**
     * Check if a task is a duplicate of an existing one
     * @param {{ title: string, targetProject: string, targetFloor: number }} task
     * @returns {boolean}
     */
    isDuplicate(task) {
        this._cleanExpired();
        const hash = this._hashTask(task);
        return this.taskHashes.has(hash);
    }

    /**
     * Register a task as owned by a tower
     * @param {object} task
     * @param {'left'|'right'|'both'} tower
     */
    registerTask(task, tower) {
        const hash = this._hashTask(task);
        this.taskHashes.set(hash, {
            taskId: task.id,
            tower: tower || task.tower || 'left',
            title: task.title,
            timestamp: Date.now(),
        });
        this._emitStatus();
    }

    /**
     * Get the tower that owns a task hash
     * @param {string} taskHash
     * @returns {'left'|'right'|'both'|null}
     */
    getTaskOwner(taskHash) {
        const entry = this.taskHashes.get(taskHash);
        return entry ? entry.tower : null;
    }

    /**
     * Decide optimal tower for a new task, considering existing assignments
     * @param {object} task
     * @returns {'left'|'right'}
     */
    requestCrossTower(task) {
        const hash = this._hashTask(task);
        const existing = this.taskHashes.get(hash);

        if (existing) {
            // Already assigned - return opposite tower for collaboration, or same to avoid duplication
            return existing.tower === 'left' ? 'right' : 'left';
        }

        // Count tasks per tower for load balancing
        let leftCount = 0, rightCount = 0;
        for (const entry of this.taskHashes.values()) {
            if (entry.tower === 'left') leftCount++;
            else if (entry.tower === 'right') rightCount++;
        }

        return leftCount <= rightCount ? 'left' : 'right';
    }

    /**
     * Get current bridge status
     * @returns {{ leftTasks: number, rightTasks: number, sharedTasks: number, dedupCount: number }}
     */
    getStatus() {
        let leftTasks = 0, rightTasks = 0, sharedTasks = 0;
        for (const entry of this.taskHashes.values()) {
            if (entry.tower === 'left') leftTasks++;
            else if (entry.tower === 'right') rightTasks++;
            else if (entry.tower === 'both') sharedTasks++;
        }
        return { leftTasks, rightTasks, sharedTasks, dedupCount: this.dedupCount };
    }

    // ─── Internal ────────────────────────────────────────

    _onTaskCreated(task) {
        const hash = this._hashTask(task);

        if (this.taskHashes.has(hash)) {
            // Duplicate detected
            this.dedupCount++;
            const existing = this.taskHashes.get(hash);
            console.warn(`[TowerBridge] DUPLICATE detected: "${task.title}" already on ${existing.tower} tower (${existing.taskId})`);

            eventBus.emit('bridge:duplicate', {
                newTaskId: task.id,
                existingTaskId: existing.taskId,
                existingTower: existing.tower,
                title: task.title,
            });
            this._emitStatus();
            return;
        }

        // Register new task
        this.registerTask(task, task.tower || 'left');
    }

    /**
     * Create a normalized hash from task properties
     * @param {object} task
     * @returns {string}
     */
    _hashTask(task) {
        const title = (task.title || '').toLowerCase().trim().replace(/\s+/g, ' ');
        const project = (task.targetProject || task.project || '').toLowerCase().trim();
        const floor = task.targetFloor || task.floor || 0;
        return `${title}|${project}|${floor}`;
    }

    /**
     * Remove entries older than TTL
     */
    _cleanExpired() {
        const now = Date.now();
        for (const [hash, entry] of this.taskHashes) {
            if (now - entry.timestamp > this.TTL) {
                this.taskHashes.delete(hash);
            }
        }
    }

    _emitStatus() {
        eventBus.emit('bridge:status', this.getStatus());
    }

    dispose() {
        if (this._cleanInterval) {
            clearInterval(this._cleanInterval);
            this._cleanInterval = null;
        }
    }
}

export const towerBridge = new TowerBridge();
