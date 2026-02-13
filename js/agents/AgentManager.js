/**
 * AgentManager - Agent lifecycle management for The Highrise
 * Loads 227 agents from roster files, applies Visual DNA, creates sprites,
 * manages state transitions, and orchestrates the agent simulation loop.
 *
 * Roster sources:
 *   - roster-enterprise.json  (51 enterprise agents)
 *   - roster-projects-high.json (112 P0-P1 project agents)
 *   - roster-projects-lower.json (64 P2-P4 project agents)
 *   - agents.json (system agents - Frank, Sally, BeeFrank, etc.)
 *   - agent-visual-dna.json (visual/personality/behavior for all 227)
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { AgentSprite } from './AgentSprite.js';
import { agentRegistry } from './AgentRegistry.js';

// ---- State-transition timing (seconds) ----
const STATE_TIMINGS = {
    working:    { min: 10, max: 30 },
    idle:       { min: 5,  max: 10 },
    meeting:    { min: 8,  max: 20 },
    networking: { min: 6,  max: 15 },
    moving:     { min: 0,  max: 0  }
};

// Default transition weights (overridden by Visual DNA when available)
const TRANSITION_WEIGHTS = {
    working:    { working: 0.10, moving: 0.35, idle: 0.30, meeting: 0.15, networking: 0.10 },
    idle:       { working: 0.45, moving: 0.20, idle: 0.05, meeting: 0.15, networking: 0.15 },
    meeting:    { working: 0.40, moving: 0.25, idle: 0.20, meeting: 0.05, networking: 0.10 },
    networking: { working: 0.35, moving: 0.25, idle: 0.20, meeting: 0.10, networking: 0.10 },
    moving:     { working: 0.40, moving: 0.00, idle: 0.30, meeting: 0.15, networking: 0.15 }
};

function randRange(min, max) {
    return min + Math.random() * (max - min);
}

function weightedPick(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [state, w] of entries) {
        r -= w;
        if (r <= 0) return state;
    }
    return entries[entries.length - 1][0];
}

// Data file paths (relative to document root)
const DATA_BASE = './js/data/';

export class AgentManager {
    /**
     * @param {THREE.Scene} scene
     * @param {object} [options]
     * @param {number} [options.floorHeight]
     * @param {number} [options.floorWidth]
     * @param {number} [options.floorDepth]
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.floorHeight = options.floorHeight || 3.5;
        this.floorWidth  = options.floorWidth  || 28;
        this.floorDepth  = options.floorDepth  || 18;

        /** @type {Map<string, AgentSprite>} */
        this._sprites = new Map();

        /** @type {Map<string, { timer: number, duration: number }>} */
        this._stateTimers = new Map();

        /** Visual DNA lookup keyed by agent ID */
        this._visualDNA = {};

        /** @type {THREE.Group} */
        this.agentGroup = new THREE.Group();
        this.agentGroup.name = 'agent-layer';
        this.scene.add(this.agentGroup);

        this._ready = false;
    }

    // ------------------------------------------------------------------
    //  Initialization - loads ALL roster files + visual DNA
    // ------------------------------------------------------------------

    async init() {
        try {
            console.log('[AgentManager] Loading 227-agent roster...');

            // Load all data files in parallel
            const [
                systemData,
                rosterEnterprise,
                rosterHigh,
                rosterLower,
                visualDNA
            ] = await Promise.all([
                this._fetchJSON(DATA_BASE + 'agents.json'),
                this._fetchJSON(DATA_BASE + 'roster-enterprise.json'),
                this._fetchJSON(DATA_BASE + 'roster-projects-high.json'),
                this._fetchJSON(DATA_BASE + 'roster-projects-lower.json'),
                this._fetchJSON(DATA_BASE + 'agent-visual-dna.json')
            ]);

            // Store visual DNA for sprite creation
            this._visualDNA = visualDNA?.agents || {};

            // Register system agents (Frank, Sally, BeeFrank, etc.)
            if (systemData) {
                agentRegistry.loadFromData(systemData);
                for (const agentDef of (systemData.systemAgents || [])) {
                    this._createRosterSprite(agentDef);
                }
            }

            // Extract and create roster agents from all 3 files
            const rosterAgents = [
                ...this._extractRosterAgents(rosterEnterprise),
                ...this._extractRosterAgents(rosterHigh),
                ...this._extractRosterAgents(rosterLower)
            ];

            for (const agentDef of rosterAgents) {
                // Register in registry
                agentRegistry.register(agentDef);
                // Create 3D sprite
                this._createRosterSprite(agentDef);
            }

            this._ready = true;
            const totalCount = this._sprites.size;

            stateManager.set('agentCount', totalCount);
            eventBus.emit('agentManager:ready', { count: totalCount });
            console.log(`[AgentManager] Initialized ${totalCount} agent sprites (${rosterAgents.length} roster + ${(systemData?.systemAgents?.length || 0)} system)`);
        } catch (err) {
            console.error('[AgentManager] Init failed:', err);
            // Non-fatal: towers still render even if agents fail
            this._ready = false;
        }
    }

    /**
     * Fetch and parse JSON, returning null on failure (non-fatal)
     */
    async _fetchJSON(url) {
        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                console.warn(`[AgentManager] Failed to fetch ${url}: ${resp.status}`);
                return null;
            }
            return await resp.json();
        } catch (err) {
            console.warn(`[AgentManager] Error loading ${url}:`, err.message);
            return null;
        }
    }

    /**
     * Extract flat array of agent definitions from a roster file.
     * Roster format: { floors: { floorKey: { agents: [...] } } }
     */
    _extractRosterAgents(rosterData) {
        if (!rosterData || !rosterData.floors) return [];
        const agents = [];
        for (const [floorKey, floorData] of Object.entries(rosterData.floors)) {
            if (floorData.agents && Array.isArray(floorData.agents)) {
                for (const agent of floorData.agents) {
                    // Ensure floor index is set
                    if (agent.floor === undefined && floorData.index !== undefined) {
                        agent.floor = floorData.index;
                    } else if (agent.floor === undefined && floorData.floor !== undefined) {
                        agent.floor = floorData.floor;
                    }
                    agents.push(agent);
                }
            }
        }
        return agents;
    }

    // ------------------------------------------------------------------
    //  Sprite creation with Visual DNA
    // ------------------------------------------------------------------

    _createRosterSprite(agentDef) {
        // Skip if already created (avoid duplicates between system + roster)
        if (this._sprites.has(agentDef.id)) return;

        const dna = this._visualDNA[agentDef.id] || null;
        const pos = this._floorPosition(agentDef.floor, agentDef.division);

        // Determine rank for performance tiering
        const rank = this._getRank(agentDef, dna);

        const sprite = new AgentSprite(agentDef, {
            position: pos,
            visualDNA: dna,
            rank: rank,
            enableGlow: rank === 'executive' || rank === 'director',
            enableTrail: rank !== 'staff'
        });

        // Use Visual DNA behavior weights or random initial state
        const initialState = Math.random() > 0.5 ? 'working' : 'idle';
        sprite.setState(initialState);

        this._sprites.set(agentDef.id, sprite);
        this.agentGroup.add(sprite.group);
        this._resetTimer(agentDef.id, initialState);
    }

    _getRank(agentDef, dna) {
        // Check Visual DNA first
        if (dna?.visual?.bodyStyle) return dna.visual.bodyStyle;
        // Infer from title/clearance
        const title = (agentDef.title || '').toLowerCase();
        const clearance = agentDef.securityClearance || '';
        if (clearance === 'alpha' || title.includes('chief')) return 'executive';
        if (clearance === 'beta' || title.includes('director') || title.includes('deputy')) return 'director';
        if (clearance === 'gamma' || title.includes('lead')) return 'lead';
        return 'staff';
    }

    /**
     * Compute a world position for an agent given floor index + division.
     * Agents are placed in the LEFT tower (x offset ~ -10).
     */
    _floorPosition(floorIndex, divisionId) {
        const y = (floorIndex || 1) * this.floorHeight + 0.15;

        // Randomly assign to left or right tower
        const towerX = Math.random() > 0.5 ? -10 : 10;

        // Division determines x/z placement within the floor
        const divPositions = {
            executive:   { x: 0,     z: 0     },
            management:  { x: 0,     z: -1    },
            marketing:   { x: -4.5,  z: -2.5  },
            rnd:         { x: -1.5,  z: -2.5  },
            testing:     { x:  1.5,  z: -2.5  },
            production:  { x:  4.5,  z: -2.5  },
            security:    { x: -4.5,  z:  2.5  },
            legal:       { x: -1.5,  z:  2.5  },
            accounting:  { x:  1.5,  z:  2.5  },
            meeting:     { x:  4.5,  z:  2.5  },
            strategy:    { x:  0,    z:  1    },
            specialist:  { x:  2,    z:  0    }
        };

        const divPos = divPositions[divisionId] || divPositions.production || { x: 0, z: 0 };
        const jitter = () => (Math.random() - 0.5) * 2.0;

        return new THREE.Vector3(
            towerX + divPos.x + jitter(),
            y,
            divPos.z + jitter()
        );
    }

    // ------------------------------------------------------------------
    //  State-transition timers
    // ------------------------------------------------------------------

    _resetTimer(agentId, state) {
        const timing = STATE_TIMINGS[state] || STATE_TIMINGS.idle;
        this._stateTimers.set(agentId, {
            timer: 0,
            duration: randRange(timing.min, timing.max)
        });
    }

    _tickTimers(delta) {
        for (const [agentId, timer] of this._stateTimers) {
            const sprite = this._sprites.get(agentId);
            if (!sprite) continue;
            if (sprite.state === 'moving') continue;

            timer.timer += delta;
            if (timer.timer >= timer.duration) {
                this._transitionAgent(agentId, sprite);
            }
        }
    }

    _transitionAgent(agentId, sprite) {
        // Use Visual DNA behavior weights if available
        const dna = this._visualDNA[agentId];
        const dnaWeights = dna?.behavior?.stateWeights;
        const weights = dnaWeights || TRANSITION_WEIGHTS[sprite.state] || TRANSITION_WEIGHTS.idle;

        const nextState = weightedPick(weights);

        if (nextState === 'moving') {
            const floor = sprite.def.floor || 1;
            const divisions = ['marketing', 'rnd', 'testing', 'production', 'security', 'legal', 'accounting', 'meeting'];
            const randomDiv = divisions[Math.floor(Math.random() * divisions.length)];
            const dest = this._floorPosition(floor, randomDiv);
            // Keep same tower (preserve x roughly)
            dest.x = sprite.group.position.x + (Math.random() - 0.5) * 8;
            sprite.moveTo(dest);
        } else {
            sprite.setState(nextState);
        }

        this._resetTimer(agentId, nextState);
    }

    // ------------------------------------------------------------------
    //  Update (call each frame)
    // ------------------------------------------------------------------

    update(delta) {
        if (!this._ready) return;
        this._tickTimers(delta);

        for (const sprite of this._sprites.values()) {
            sprite.update(delta);
        }
    }

    // ------------------------------------------------------------------
    //  Public Query API
    // ------------------------------------------------------------------

    getAgentsByFloor(floorIndex) {
        return Array.from(this._sprites.values()).filter(s => s.def.floor === floorIndex);
    }

    getAgentsByDivision(divId) {
        return Array.from(this._sprites.values()).filter(s => s.def.division === divId);
    }

    getAgent(id) {
        return this._sprites.get(id);
    }

    getAllAgents() {
        return Array.from(this._sprites.values());
    }

    findAgentFromIntersection(intersections) {
        for (const hit of intersections) {
            let obj = hit.object;
            while (obj) {
                if (obj.userData && obj.userData.type === 'agent' && obj.userData.sprite) {
                    return obj.userData.sprite;
                }
                obj = obj.parent;
            }
        }
        return null;
    }

    dispose() {
        for (const sprite of this._sprites.values()) {
            sprite.dispose();
        }
        this._sprites.clear();
        this._stateTimers.clear();
        this.agentGroup.removeFromParent();
    }
}
