/**
 * AgentRegistry - Agent database for The Highrise
 * Stores all agent definitions and provides query/filter capabilities
 */
import { eventBus } from '../core/EventBus.js';

export class AgentRegistry {
    constructor() {
        /** @type {Map<string, object>} */
        this._agents = new Map();
        /** @type {boolean} */
        this._loaded = false;
    }

    // ---- Loading ----

    /**
     * Register a single agent definition
     * @param {object} agentDef - raw agent definition from JSON
     */
    register(agentDef) {
        if (!agentDef || !agentDef.id) {
            console.warn('[AgentRegistry] Attempted to register agent without id', agentDef);
            return;
        }
        this._agents.set(agentDef.id, {
            ...agentDef,
            registeredAt: Date.now(),
            runtimeStatus: agentDef.status || 'idle'
        });
        eventBus.emit('registry:agentAdded', { id: agentDef.id, agent: agentDef });
    }

    /**
     * Bulk-register agents from parsed JSON data
     * @param {{ systemAgents: object[], projectAgents: object[] }} data
     */
    loadFromData(data) {
        if (data.systemAgents) {
            data.systemAgents.forEach(a => {
                a._category = 'system';
                this.register(a);
            });
        }
        if (data.projectAgents) {
            data.projectAgents.forEach(a => {
                a._category = 'project';
                this.register(a);
            });
        }
        this._loaded = true;
        eventBus.emit('registry:loaded', { count: this._agents.size });
    }

    /** @returns {boolean} */
    get loaded() { return this._loaded; }

    // ---- Queries ----

    /**
     * @returns {object[]} all registered agents
     */
    getAll() {
        return Array.from(this._agents.values());
    }

    /**
     * @param {string} id
     * @returns {object|undefined}
     */
    getById(id) {
        return this._agents.get(id);
    }

    /**
     * @param {string} role - partial or exact role match (case-insensitive)
     * @returns {object[]}
     */
    getByRole(role) {
        const lower = role.toLowerCase();
        return this.getAll().filter(a =>
            a.role && a.role.toLowerCase().includes(lower)
        );
    }

    /**
     * @param {number} floor - floor index
     * @returns {object[]}
     */
    getByFloor(floor) {
        return this.getAll().filter(a => a.floor === floor);
    }

    /**
     * @param {string} status - e.g. 'active', 'on-demand', 'idle'
     * @returns {object[]}
     */
    getByStatus(status) {
        return this.getAll().filter(a => a.status === status || a.runtimeStatus === status);
    }

    /**
     * @param {string} divId - division identifier
     * @returns {object[]}
     */
    getByDivision(divId) {
        return this.getAll().filter(a => a.division === divId);
    }

    /**
     * @param {string} category - 'system' or 'project'
     * @returns {object[]}
     */
    getByCategory(category) {
        return this.getAll().filter(a => a._category === category);
    }

    // ---- Statistics ----

    /**
     * @returns {object} map of status -> count
     */
    countByStatus() {
        const counts = {};
        this._agents.forEach(a => {
            const s = a.runtimeStatus || a.status || 'unknown';
            counts[s] = (counts[s] || 0) + 1;
        });
        return counts;
    }

    /**
     * @returns {object} map of floorIndex -> count
     */
    countByFloor() {
        const counts = {};
        this._agents.forEach(a => {
            if (a.floor !== undefined) {
                counts[a.floor] = (counts[a.floor] || 0) + 1;
            }
        });
        return counts;
    }

    /**
     * @returns {object} map of divisionId -> count
     */
    countByDivision() {
        const counts = {};
        this._agents.forEach(a => {
            if (a.division) {
                counts[a.division] = (counts[a.division] || 0) + 1;
            }
        });
        return counts;
    }

    // ---- Search / Filter ----

    /**
     * General-purpose search across name, role, description
     * @param {string} query
     * @returns {object[]}
     */
    search(query) {
        const q = query.toLowerCase();
        return this.getAll().filter(a =>
            (a.name && a.name.toLowerCase().includes(q)) ||
            (a.role && a.role.toLowerCase().includes(q)) ||
            (a.description && a.description.toLowerCase().includes(q)) ||
            (a.id && a.id.toLowerCase().includes(q))
        );
    }

    /**
     * Multi-filter query
     * @param {{ floor?: number, division?: string, status?: string, category?: string }} filters
     * @returns {object[]}
     */
    filter(filters = {}) {
        let results = this.getAll();
        if (filters.floor !== undefined) {
            results = results.filter(a => a.floor === filters.floor);
        }
        if (filters.division) {
            results = results.filter(a => a.division === filters.division);
        }
        if (filters.status) {
            results = results.filter(a =>
                a.status === filters.status || a.runtimeStatus === filters.status
            );
        }
        if (filters.category) {
            results = results.filter(a => a._category === filters.category);
        }
        return results;
    }

    /**
     * Update runtime status of an agent
     * @param {string} id
     * @param {string} status
     */
    setRuntimeStatus(id, status) {
        const agent = this._agents.get(id);
        if (agent) {
            const old = agent.runtimeStatus;
            agent.runtimeStatus = status;
            eventBus.emit('registry:statusChanged', { id, status, old });
        }
    }
}

export const agentRegistry = new AgentRegistry();
