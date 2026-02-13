/**
 * AgentManager - Agent lifecycle management for The Highrise
 * Loads agent definitions, creates sprites, manages state transitions,
 * and orchestrates the agent simulation loop.
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
    moving:     { min: 0,  max: 0  }  // duration is travel-time based
};

// Probability weights for next-state selection (from current state)
const TRANSITION_WEIGHTS = {
    working:    { working: 0.10, moving: 0.35, idle: 0.30, meeting: 0.15, networking: 0.10 },
    idle:       { working: 0.45, moving: 0.20, idle: 0.05, meeting: 0.15, networking: 0.15 },
    meeting:    { working: 0.40, moving: 0.25, idle: 0.20, meeting: 0.05, networking: 0.10 },
    networking: { working: 0.35, moving: 0.25, idle: 0.20, meeting: 0.10, networking: 0.10 },
    moving:     { working: 0.40, moving: 0.00, idle: 0.30, meeting: 0.15, networking: 0.15 }
};

/**
 * Pick a random value in [min, max]
 */
function randRange(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * Weighted random pick from a {state: weight} map
 */
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


export class AgentManager {
    /**
     * @param {THREE.Scene} scene - The Highrise scene
     * @param {object} [options]
     * @param {string} [options.dataUrl] - Path to agents.json
     * @param {number} [options.floorHeight] - Y-units per floor (default 3.5)
     * @param {number} [options.floorWidth] - X-extent of a floor (default 28)
     * @param {number} [options.floorDepth] - Z-extent of a floor (default 18)
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.dataUrl = options.dataUrl || '../data/agents.json';
        this.floorHeight = options.floorHeight || 3.5;
        this.floorWidth  = options.floorWidth  || 28;
        this.floorDepth  = options.floorDepth  || 18;

        /** @type {Map<string, AgentSprite>} */
        this._sprites = new Map();

        /** @type {Map<string, { timer: number, duration: number }>} */
        this._stateTimers = new Map();

        /** @type {THREE.Group} */
        this.agentGroup = new THREE.Group();
        this.agentGroup.name = 'agent-layer';
        this.scene.add(this.agentGroup);

        this._ready = false;
    }

    // ------------------------------------------------------------------
    //  Initialization
    // ------------------------------------------------------------------

    /**
     * Load agents.json, populate registry, create sprites
     * @returns {Promise<void>}
     */
    async init() {
        try {
            const resp = await fetch(this.dataUrl);
            if (!resp.ok) throw new Error(`Failed to fetch agents: ${resp.status}`);
            const data = await resp.json();

            // Populate registry
            agentRegistry.loadFromData(data);

            // Create system agent sprites
            for (const agentDef of (data.systemAgents || [])) {
                this._createSprite(agentDef);
            }

            // Create project agent sprites on their project floors
            for (const agentDef of (data.projectAgents || [])) {
                this._createProjectSprite(agentDef);
            }

            this._ready = true;
            eventBus.emit('agentManager:ready', { count: this._sprites.size });
            console.log(`[AgentManager] Initialized ${this._sprites.size} agent sprites`);
        } catch (err) {
            console.error('[AgentManager] Init failed:', err);
        }
    }

    /**
     * Create sprite for a system agent (has a floor assignment)
     */
    _createSprite(agentDef) {
        const pos = this._floorPosition(agentDef.floor, agentDef.division);
        const sprite = new AgentSprite(agentDef, { position: pos });

        // Random initial state
        const initialState = Math.random() > 0.5 ? 'working' : 'idle';
        sprite.setState(initialState);

        this._sprites.set(agentDef.id, sprite);
        this.agentGroup.add(sprite.group);
        this._resetTimer(agentDef.id, initialState);
    }

    /**
     * Create sprite for a project agent (assigned to a project phase floor)
     */
    _createProjectSprite(agentDef) {
        // Project agents use their phase to determine floor (phase 4-10 -> floors 15-9 roughly)
        // We map phase to the project floors defined in floors.json
        const phaseFloorMap = { 4: 15, 5: 15, 6: 14, 7: 13, 8: 12, 9: 11, 10: 10 };
        const floor = phaseFloorMap[agentDef.phase] || 15;
        const merged = { ...agentDef, floor };

        const pos = this._floorPosition(floor, agentDef.division);
        const sprite = new AgentSprite(merged, { position: pos });
        sprite.setState('working');

        this._sprites.set(agentDef.id, sprite);
        this.agentGroup.add(sprite.group);
        this._resetTimer(agentDef.id, 'working');
    }

    /**
     * Compute a world position for an agent given floor index + division
     */
    _floorPosition(floorIndex, divisionId) {
        const y = (floorIndex || 1) * this.floorHeight + 0.05;

        // Division determines x/z placement within the floor
        // 4x2 grid: ZONE_WIDTH=5.5, ZONE_GAP=0.5, ZONE_DEPTH=6.5
        // totalW=23.5, totalD=13.5  startX=-8.75, startZ=-3.25
        const divPositions = {
            marketing:   { x: -8.75, z: -3.25 },
            rnd:         { x: -2.75, z: -3.25 },
            testing:     { x:  3.25, z: -3.25 },
            production:  { x:  9.25, z: -3.25 },
            security:    { x: -8.75, z:  3.75 },
            legal:       { x: -2.75, z:  3.75 },
            accounting:  { x:  3.25, z:  3.75 },
            meeting:     { x:  9.25, z:  3.75 }
        };

        const divPos = divPositions[divisionId] || { x: 0, z: 0 };
        // Add small random offset so agents don't stack
        const jitter = () => (Math.random() - 0.5) * 2.5;

        return new THREE.Vector3(
            divPos.x + jitter(),
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

            // Skip timer for agents currently moving (movement handles its own end)
            if (sprite.state === 'moving') continue;

            timer.timer += delta;
            if (timer.timer >= timer.duration) {
                this._transitionAgent(agentId, sprite);
            }
        }
    }

    _transitionAgent(agentId, sprite) {
        const weights = TRANSITION_WEIGHTS[sprite.state] || TRANSITION_WEIGHTS.idle;
        const nextState = weightedPick(weights);

        if (nextState === 'moving') {
            // Pick a random destination on the same floor or a nearby one
            const floor = sprite.def.floor || 1;
            const divisions = ['marketing', 'rnd', 'testing', 'production', 'security', 'legal', 'accounting', 'meeting'];
            const randomDiv = divisions[Math.floor(Math.random() * divisions.length)];
            const dest = this._floorPosition(floor, randomDiv);
            sprite.moveTo(dest);
        } else {
            sprite.setState(nextState);
        }

        this._resetTimer(agentId, nextState);
    }

    // ------------------------------------------------------------------
    //  Update (call each frame)
    // ------------------------------------------------------------------

    /**
     * @param {number} delta - seconds since last frame
     */
    update(delta) {
        if (!this._ready) return;

        // Tick state timers
        this._tickTimers(delta);

        // Update each sprite animation
        for (const sprite of this._sprites.values()) {
            sprite.update(delta);
        }
    }

    // ------------------------------------------------------------------
    //  Public Query API
    // ------------------------------------------------------------------

    /**
     * @param {number} floorIndex
     * @returns {AgentSprite[]}
     */
    getAgentsByFloor(floorIndex) {
        return Array.from(this._sprites.values()).filter(
            s => s.def.floor === floorIndex
        );
    }

    /**
     * @param {string} divId
     * @returns {AgentSprite[]}
     */
    getAgentsByDivision(divId) {
        return Array.from(this._sprites.values()).filter(
            s => s.def.division === divId
        );
    }

    /**
     * @param {string} id
     * @returns {AgentSprite|undefined}
     */
    getAgent(id) {
        return this._sprites.get(id);
    }

    /**
     * @returns {AgentSprite[]}
     */
    getAllAgents() {
        return Array.from(this._sprites.values());
    }

    /**
     * Find an agent sprite by raycaster intersection (check userData)
     * @param {THREE.Intersection[]} intersections
     * @returns {AgentSprite|null}
     */
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

    // ------------------------------------------------------------------
    //  Cleanup
    // ------------------------------------------------------------------

    dispose() {
        for (const sprite of this._sprites.values()) {
            sprite.dispose();
        }
        this._sprites.clear();
        this._stateTimers.clear();
        this.agentGroup.removeFromParent();
    }
}
