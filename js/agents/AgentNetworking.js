/**
 * AgentNetworking - Self-networking logic for The Highrise
 * Agents discover shared interests, form connections with particle streams,
 * accumulate networking scores, and trigger innovation sparks when 3+
 * agents from different floors network together.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

// ---- Constants ----
const CONNECTION_RANGE         = 6.0;   // max distance for networking
const PARTICLE_COUNT           = 30;    // particles per connection line
const PARTICLE_SPEED           = 2.0;   // travel speed along connection
const SCORE_RATE               = 0.5;   // score per second while networking
const INNOVATION_THRESHOLD     = 3;     // agents from N different floors
const INNOVATION_PARTICLE_COUNT = 80;
const INNOVATION_DURATION      = 3.0;   // seconds
const SCAN_INTERVAL            = 2.0;   // seconds between network scans
const CONNECTION_COLOR         = 0x8E44AD;
const INNOVATION_COLOR         = 0xF1C40F;

/**
 * Create a particle-stream line between two points
 */
function createParticleStream(color) {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const alphas = new Float32Array(PARTICLE_COUNT);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.ShaderMaterial({
        vertexShader: `
            attribute float alpha;
            varying float vAlpha;
            void main() {
                vAlpha = alpha;
                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = 3.0 * (300.0 / -mvPos.z);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: `
            uniform vec3 uColor;
            varying float vAlpha;
            void main() {
                float d = length(gl_PointCoord - 0.5) * 2.0;
                if (d > 1.0) discard;
                float a = (1.0 - d) * vAlpha * 0.8;
                gl_FragColor = vec4(uColor, a);
            }
        `,
        uniforms: {
            uColor: { value: new THREE.Color(color) }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    return { points, geometry: geo, material: mat };
}

/**
 * Create the innovation spark burst
 */
function createInnovationBurst() {
    const positions = new Float32Array(INNOVATION_PARTICLE_COUNT * 3);
    const velocities = [];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    for (let i = 0; i < INNOVATION_PARTICLE_COUNT; i++) {
        velocities.push(new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            Math.random() * 3 + 1,
            (Math.random() - 0.5) * 4
        ));
    }

    const mat = new THREE.PointsMaterial({
        color: INNOVATION_COLOR,
        size: 0.15,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    points.visible = false;
    points.frustumCulled = false;

    return { points, geometry: geo, material: mat, velocities };
}


export class AgentNetworking {
    /**
     * @param {THREE.Scene} scene
     * @param {import('./AgentManager.js').AgentManager} agentManager
     */
    constructor(scene, agentManager) {
        this.scene = scene;
        this.agentManager = agentManager;

        /** @type {THREE.Group} */
        this.group = new THREE.Group();
        this.group.name = 'agent-networking';
        this.scene.add(this.group);

        /**
         * Active connections: Map<connectionKey, { agentA, agentB, stream, timer }>
         * connectionKey is sorted pair "idA:idB"
         */
        this._connections = new Map();

        /**
         * Networking scores per agent: Map<agentId, number>
         */
        this._scores = new Map();

        /**
         * Cross-floor connections: Map<connectionKey, { floorA, floorB }>
         */
        this._crossFloor = new Map();

        /**
         * Innovation spark effects currently playing
         * @type {{ burst: object, timer: number, duration: number, center: THREE.Vector3 }[]}
         */
        this._innovations = [];

        // Pre-build innovation burst pool
        this._burstPool = [];
        for (let i = 0; i < 3; i++) {
            const burst = createInnovationBurst();
            this.group.add(burst.points);
            this._burstPool.push(burst);
        }

        this._scanTimer = 0;
    }

    // ------------------------------------------------------------------
    //  Update loop
    // ------------------------------------------------------------------

    /**
     * @param {number} delta
     */
    update(delta) {
        // Periodic scan for new connections
        this._scanTimer += delta;
        if (this._scanTimer >= SCAN_INTERVAL) {
            this._scanTimer = 0;
            this._scanForConnections();
        }

        // Update active connections
        this._updateConnections(delta);

        // Update innovation bursts
        this._updateInnovations(delta);
    }

    // ------------------------------------------------------------------
    //  Scanning
    // ------------------------------------------------------------------

    _scanForConnections() {
        const agents = this.agentManager.getAllAgents();
        const networking = agents.filter(a => a.state === 'networking');

        // Build set of current valid connection keys
        const validKeys = new Set();

        for (let i = 0; i < networking.length; i++) {
            for (let j = i + 1; j < networking.length; j++) {
                const a = networking[i];
                const b = networking[j];
                const dist = a.group.position.distanceTo(b.group.position);

                if (dist <= CONNECTION_RANGE) {
                    const key = this._connectionKey(a.id, b.id);
                    validKeys.add(key);

                    if (!this._connections.has(key)) {
                        this._addConnection(a, b, key);
                    }
                }
            }
        }

        // Remove stale connections
        for (const [key, conn] of this._connections) {
            if (!validKeys.has(key)) {
                this._removeConnection(key);
            }
        }

        // Check for innovation sparks
        this._checkInnovation(networking);
    }

    _connectionKey(idA, idB) {
        return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
    }

    _addConnection(agentA, agentB, key) {
        const stream = createParticleStream(CONNECTION_COLOR);
        this.group.add(stream.points);

        const conn = {
            agentA,
            agentB,
            stream,
            timer: 0
        };
        this._connections.set(key, conn);

        // Track cross-floor
        const floorA = agentA.def.floor;
        const floorB = agentB.def.floor;
        if (floorA !== undefined && floorB !== undefined && floorA !== floorB) {
            this._crossFloor.set(key, { floorA, floorB });
        }

        eventBus.emit('networking:connected', {
            agentA: agentA.id,
            agentB: agentB.id,
            crossFloor: floorA !== floorB
        });
    }

    _removeConnection(key) {
        const conn = this._connections.get(key);
        if (!conn) return;

        conn.stream.points.removeFromParent();
        conn.stream.geometry.dispose();
        conn.stream.material.dispose();

        this._connections.delete(key);
        this._crossFloor.delete(key);
    }

    // ------------------------------------------------------------------
    //  Connection updates
    // ------------------------------------------------------------------

    _updateConnections(delta) {
        for (const [key, conn] of this._connections) {
            conn.timer += delta;

            // Update particle positions along the line between agents
            const posA = conn.agentA.group.position;
            const posB = conn.agentB.group.position;
            const posAttr = conn.stream.geometry.getAttribute('position');
            const alphaAttr = conn.stream.geometry.getAttribute('alpha');

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                // Each particle travels from A to B with offset timing
                const baseT = (i / PARTICLE_COUNT);
                const t = (baseT + conn.timer * PARTICLE_SPEED * 0.1) % 1.0;

                const px = THREE.MathUtils.lerp(posA.x, posB.x, t);
                const py = THREE.MathUtils.lerp(posA.y, posB.y, t) +
                           Math.sin(t * Math.PI) * 0.3; // arc upward
                const pz = THREE.MathUtils.lerp(posA.z, posB.z, t);

                posAttr.setXYZ(i, px, py, pz);
                // Fade at endpoints
                alphaAttr.setX(i, Math.sin(t * Math.PI));
            }

            posAttr.needsUpdate = true;
            alphaAttr.needsUpdate = true;

            // Increment networking scores
            this._incrementScore(conn.agentA.id, SCORE_RATE * delta);
            this._incrementScore(conn.agentB.id, SCORE_RATE * delta);
        }
    }

    _incrementScore(agentId, amount) {
        const current = this._scores.get(agentId) || 0;
        this._scores.set(agentId, current + amount);
    }

    // ------------------------------------------------------------------
    //  Innovation sparks
    // ------------------------------------------------------------------

    _checkInnovation(networkingAgents) {
        // Group networking agents by floor
        const byFloor = new Map();
        for (const agent of networkingAgents) {
            const f = agent.def.floor;
            if (f === undefined) continue;
            if (!byFloor.has(f)) byFloor.set(f, []);
            byFloor.get(f).push(agent);
        }

        // Check if agents from INNOVATION_THRESHOLD+ different floors are connected
        // Find connected clusters that span multiple floors
        const floors = Array.from(byFloor.keys());
        if (floors.length < INNOVATION_THRESHOLD) return;

        // Check if there are actual connections spanning the floors
        const connectedFloors = new Set();
        for (const { floorA, floorB } of this._crossFloor.values()) {
            connectedFloors.add(floorA);
            connectedFloors.add(floorB);
        }

        if (connectedFloors.size >= INNOVATION_THRESHOLD) {
            // Find center of all networking agents
            const center = new THREE.Vector3();
            for (const agent of networkingAgents) {
                center.add(agent.group.position);
            }
            center.divideScalar(networkingAgents.length);

            this._triggerInnovation(center);
        }
    }

    _triggerInnovation(center) {
        // Find an available burst from pool
        const burst = this._burstPool.find(b => !b.points.visible);
        if (!burst) return; // all bursts in use

        // Reset particle positions to center
        const posAttr = burst.geometry.getAttribute('position');
        for (let i = 0; i < INNOVATION_PARTICLE_COUNT; i++) {
            posAttr.setXYZ(i, center.x, center.y, center.z);
            burst.velocities[i].set(
                (Math.random() - 0.5) * 4,
                Math.random() * 3 + 1,
                (Math.random() - 0.5) * 4
            );
        }
        posAttr.needsUpdate = true;

        burst.points.visible = true;
        burst.material.opacity = 1.0;

        this._innovations.push({
            burst,
            timer: 0,
            duration: INNOVATION_DURATION,
            center: center.clone()
        });

        eventBus.emit('networking:innovation', {
            position: { x: center.x, y: center.y, z: center.z },
            floors: Array.from(new Set(
                Array.from(this._crossFloor.values()).flatMap(c => [c.floorA, c.floorB])
            ))
        });
    }

    _updateInnovations(delta) {
        for (let i = this._innovations.length - 1; i >= 0; i--) {
            const inn = this._innovations[i];
            inn.timer += delta;
            const progress = inn.timer / inn.duration;

            if (progress >= 1.0) {
                inn.burst.points.visible = false;
                this._innovations.splice(i, 1);
                continue;
            }

            // Animate particles outward with gravity
            const posAttr = inn.burst.geometry.getAttribute('position');
            for (let p = 0; p < INNOVATION_PARTICLE_COUNT; p++) {
                const vel = inn.burst.velocities[p];
                const x = posAttr.getX(p) + vel.x * delta;
                const y = posAttr.getY(p) + vel.y * delta;
                const z = posAttr.getZ(p) + vel.z * delta;

                // Gravity
                vel.y -= 2.0 * delta;

                posAttr.setXYZ(p, x, y, z);
            }
            posAttr.needsUpdate = true;

            // Fade out
            inn.burst.material.opacity = 1.0 - progress;
        }
    }

    // ------------------------------------------------------------------
    //  Public API
    // ------------------------------------------------------------------

    /**
     * Get networking score for an agent
     * @param {string} agentId
     * @returns {number}
     */
    getScore(agentId) {
        return this._scores.get(agentId) || 0;
    }

    /**
     * Get all scores sorted descending
     * @returns {{ agentId: string, score: number }[]}
     */
    getLeaderboard() {
        return Array.from(this._scores.entries())
            .map(([agentId, score]) => ({ agentId, score }))
            .sort((a, b) => b.score - a.score);
    }

    /**
     * Get active connection count
     * @returns {number}
     */
    get activeConnections() {
        return this._connections.size;
    }

    /**
     * Get cross-floor connection count
     * @returns {number}
     */
    get crossFloorConnections() {
        return this._crossFloor.size;
    }

    // ------------------------------------------------------------------
    //  Cleanup
    // ------------------------------------------------------------------

    dispose() {
        for (const [key] of this._connections) {
            this._removeConnection(key);
        }
        for (const burst of this._burstPool) {
            burst.geometry.dispose();
            burst.material.dispose();
            burst.points.removeFromParent();
        }
        this._innovations = [];
        this.group.removeFromParent();
    }
}
