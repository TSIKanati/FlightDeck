/**
 * DataBridge.js - Loads the same JSON roster data as the Highrise 3D
 * Provides unified access to floors, projects, and all agents
 */

const BASE = '/js/data/';

export class DataBridge {
    constructor() {
        this.floors = [];
        this.projects = [];
        this.agents = [];
        this.agentMap = new Map();
        this.floorMap = new Map();
        this._loaded = false;
    }

    get loaded() { return this._loaded; }

    /**
     * Load all JSON files in parallel
     * @param {function} [onProgress] - progress callback (0-1)
     */
    async load(onProgress) {
        const files = [
            { key: 'floors',            url: BASE + 'floors.json' },
            { key: 'projects',          url: BASE + 'projects.json' },
            { key: 'rosterEnterprise',  url: BASE + 'roster-enterprise.json' },
            { key: 'rosterProjectsHigh',url: BASE + 'roster-projects-high.json' },
            { key: 'rosterProjectsLow', url: BASE + 'roster-projects-lower.json' },
        ];

        const data = {};
        let done = 0;

        await Promise.all(files.map(async (f) => {
            try {
                const res = await fetch(f.url);
                if (!res.ok) throw new Error(`${f.url}: ${res.status}`);
                data[f.key] = await res.json();
            } catch (err) {
                console.warn(`[DataBridge] Failed to load ${f.key}:`, err.message);
                data[f.key] = null;
            }
            done++;
            if (onProgress) onProgress(done / files.length);
        }));

        this._processFloors(data.floors);
        this._processProjects(data.projects);
        this._processRoster(data.rosterEnterprise, 'enterprise');
        this._processRoster(data.rosterProjectsHigh, 'project');
        this._processRoster(data.rosterProjectsLow, 'project');

        this._loaded = true;
        console.log(`[DataBridge] Loaded ${this.floors.length} floors, ${this.projects.length} projects, ${this.agents.length} agents`);
    }

    _processFloors(data) {
        if (!data || !data.floors) return;
        this.floors = data.floors;
        this.divisions = data.divisions || [];
        for (const f of this.floors) {
            this.floorMap.set(String(f.index), f);
            this.floorMap.set(f.id, f);
        }
    }

    _processProjects(data) {
        if (!data || !data.projects) return;
        this.projects = data.projects;
    }

    _processRoster(data, category) {
        if (!data) return;

        const floorsObj = data.floors;
        if (!floorsObj) return;

        for (const [floorKey, floorData] of Object.entries(floorsObj)) {
            const agents = floorData.agents || [];
            for (const agent of agents) {
                agent._category = category;
                agent._floorKey = floorKey;
                agent._floorName = floorData.name;
                agent._floorSubtitle = floorData.subtitle || '';
                agent._floorColor = floorData.color || '#3c8cff';

                if (!this.agentMap.has(agent.id)) {
                    this.agents.push(agent);
                    this.agentMap.set(agent.id, agent);
                }
            }
        }
    }

    // ---- Queries ----

    /** Get all agents on a floor by index */
    getAgentsByFloor(floorIndex) {
        const idx = Number(floorIndex);
        return this.agents.filter(a => a.floor === idx);
    }

    /** Get floor data by id or index */
    getFloor(idOrIndex) {
        return this.floorMap.get(String(idOrIndex));
    }

    /** Get agent by id */
    getAgent(id) {
        return this.agentMap.get(id);
    }

    /** Get project by floor index */
    getProjectByFloor(floorIndex) {
        return this.projects.find(p => p.floor === Number(floorIndex));
    }

    /** Get project by id */
    getProject(id) {
        return this.projects.find(p => p.id === id);
    }

    /** Count agents per floor -> Map<floorIndex, count> */
    agentCountsByFloor() {
        const counts = new Map();
        for (const a of this.agents) {
            if (a.floor !== undefined) {
                counts.set(a.floor, (counts.get(a.floor) || 0) + 1);
            }
        }
        return counts;
    }

    /** Get all agents managed by a given agent id */
    getManagedAgents(agentId) {
        const agent = this.agentMap.get(agentId);
        if (!agent || !agent.manages || !agent.manages.length) return [];
        return agent.manages.map(id => this.agentMap.get(id)).filter(Boolean);
    }

    /** Build hierarchy tree for a floor */
    buildFloorHierarchy(floorIndex) {
        const agents = this.getAgentsByFloor(floorIndex);
        if (!agents.length) return [];

        const agentIds = new Set(agents.map(a => a.id));
        const childMap = new Map();

        for (const a of agents) {
            if (a.manages) {
                for (const mId of a.manages) {
                    if (agentIds.has(mId)) {
                        if (!childMap.has(a.id)) childMap.set(a.id, []);
                        childMap.get(a.id).push(mId);
                    }
                }
            }
        }

        // Find roots: agents whose reportsTo is not on this floor
        const managedSet = new Set();
        for (const children of childMap.values()) {
            for (const c of children) managedSet.add(c);
        }
        const roots = agents.filter(a => !managedSet.has(a.id));

        const buildNode = (agent) => {
            const children = (childMap.get(agent.id) || [])
                .map(id => this.agentMap.get(id))
                .filter(Boolean)
                .map(buildNode);
            return { agent, children };
        };

        return roots.map(buildNode);
    }
}
