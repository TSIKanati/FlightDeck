/**
 * AgentMetrics - Per-Agent Performance Tracking
 * TSI Enterprise 3D Command Center
 *
 * Persisted to localStorage, auto-records from task events.
 * localStorage key: hr:metrics:{agentId} -> JSON stats object
 */
import { eventBus } from './EventBus.js';

export class AgentMetrics {
    constructor() {
        this.PREFIX = 'hr:metrics:';
        this.data = new Map();
    }

    init() {
        // Load all persisted metrics
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.PREFIX)) {
                const agentId = key.slice(this.PREFIX.length);
                this._load(agentId);
            }
        }

        // Auto-record from task events
        eventBus.on('task:completed', (data) => {
            if (data.agent) {
                this.recordTaskComplete(data.agent, {
                    duration: data.duration || 0,
                    result: data.result || 'Success',
                    taskType: data.taskType || 'general',
                });
            }
            // Also record for all assigned agents
            if (data.assignedAgents) {
                for (const agentId of data.assignedAgents) {
                    if (agentId !== data.agent) {
                        this.recordTaskComplete(agentId, {
                            duration: data.duration || 0,
                            result: data.result || 'Success',
                            taskType: data.taskType || 'general',
                        });
                    }
                }
            }
        });

        eventBus.on('task:failed', (data) => {
            if (data.agent) {
                this.recordTaskFailed(data.agent, {
                    duration: data.duration || 0,
                    reason: data.reason || 'Unknown',
                    taskType: data.taskType || 'general',
                });
            }
        });

        console.log(`[AgentMetrics] Initialized with ${this.data.size} agent(s) tracked`);
    }

    /**
     * Record a completed task for an agent
     */
    recordTaskComplete(agentId, { duration = 0, result = '', taskType = 'general' } = {}) {
        const stats = this._getOrCreate(agentId);
        stats.completed++;
        stats.totalDuration += duration;
        stats.avgDuration = stats.totalDuration / stats.completed;
        stats.streak++;
        stats.lastActive = Date.now();
        stats.recentDurations.push(duration);
        if (stats.recentDurations.length > 10) stats.recentDurations.shift();

        // Track task types
        stats.taskTypes[taskType] = (stats.taskTypes[taskType] || 0) + 1;

        this._save(agentId);
        eventBus.emit('metrics:updated', { agentId, stats: { ...stats } });
    }

    /**
     * Record a failed task for an agent
     */
    recordTaskFailed(agentId, { duration = 0, reason = '', taskType = 'general' } = {}) {
        const stats = this._getOrCreate(agentId);
        stats.failed++;
        stats.totalDuration += duration;
        stats.streak = 0;
        stats.lastActive = Date.now();
        stats.recentDurations.push(duration);
        if (stats.recentDurations.length > 10) stats.recentDurations.shift();

        stats.taskTypes[taskType] = (stats.taskTypes[taskType] || 0) + 1;

        this._save(agentId);
        eventBus.emit('metrics:updated', { agentId, stats: { ...stats } });
    }

    /**
     * Get stats for a single agent
     * @param {string} agentId
     * @returns {{ completed, failed, avgDuration, successRate, streak, lastActive, recentDurations, taskTypes }}
     */
    getAgentStats(agentId) {
        const stats = this.data.get(agentId) || this._createEmpty();
        const total = stats.completed + stats.failed;
        return {
            ...stats,
            successRate: total > 0 ? Math.round((stats.completed / total) * 100) : 0,
        };
    }

    /**
     * Get aggregate stats for a floor
     * @param {number} floorIndex
     * @returns {{ totalCompleted, avgDuration, topAgent }}
     */
    getFloorStats(floorIndex) {
        // Aggregate across all agents (floor filtering done by caller if needed)
        let totalCompleted = 0;
        let totalDuration = 0;
        let topAgent = null;
        let topScore = 0;

        for (const [agentId, stats] of this.data) {
            totalCompleted += stats.completed;
            totalDuration += stats.totalDuration;
            const score = stats.completed * (stats.completed / Math.max(1, stats.completed + stats.failed));
            if (score > topScore) {
                topScore = score;
                topAgent = agentId;
            }
        }

        return {
            totalCompleted,
            avgDuration: totalCompleted > 0 ? totalDuration / totalCompleted : 0,
            topAgent,
        };
    }

    /**
     * Get leaderboard of top agents
     * @param {number} limit
     * @returns {Array<{ agentId, score, completed, successRate }>}
     */
    getLeaderboard(limit = 10) {
        const board = [];
        for (const [agentId, stats] of this.data) {
            const total = stats.completed + stats.failed;
            const successRate = total > 0 ? Math.round((stats.completed / total) * 100) : 0;
            const score = stats.completed * (successRate / 100) * (1 + stats.streak * 0.1);
            board.push({ agentId, score: Math.round(score * 10) / 10, completed: stats.completed, successRate });
        }
        board.sort((a, b) => b.score - a.score);
        return board.slice(0, limit);
    }

    // ─── Internal ────────────────────────────────────────

    _getOrCreate(agentId) {
        if (!this.data.has(agentId)) {
            this._load(agentId);
        }
        if (!this.data.has(agentId)) {
            this.data.set(agentId, this._createEmpty());
        }
        return this.data.get(agentId);
    }

    _createEmpty() {
        return {
            completed: 0,
            failed: 0,
            totalDuration: 0,
            avgDuration: 0,
            streak: 0,
            lastActive: 0,
            recentDurations: [],
            taskTypes: {},
        };
    }

    _save(agentId) {
        try {
            const stats = this.data.get(agentId);
            if (stats) {
                localStorage.setItem(this.PREFIX + agentId, JSON.stringify(stats));
            }
        } catch (e) {
            console.error('[AgentMetrics] Save failed:', e);
        }
    }

    _load(agentId) {
        try {
            const raw = localStorage.getItem(this.PREFIX + agentId);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Ensure all fields exist
                this.data.set(agentId, { ...this._createEmpty(), ...parsed });
            }
        } catch (e) {
            console.error('[AgentMetrics] Load failed:', e);
        }
    }
}

export const agentMetrics = new AgentMetrics();
