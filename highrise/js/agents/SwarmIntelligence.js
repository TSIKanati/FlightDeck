/**
 * SwarmIntelligence - Cross-floor agent swarming for The Highrise
 *
 * When a task is too complex for one floor's agents, SwarmIntelligence
 * recruits agents from across the building, coordinates their work,
 * and returns them when done.
 *
 * Visual: agents "elevator" to the target floor, work together with
 * particle connection lines, then elevator back.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { taskLogger } from '../core/TaskLogger.js';

const SWARM_COLORS = {
    recruiting: 0x00FFFF,   // Cyan pulse during recruitment
    active:     0xFFFF00,   // Yellow when swarm is working
    completing: 0x00FF00,   // Green on completion
    failed:     0xFF0000    // Red on failure
};

export class SwarmIntelligence {
    /**
     * @param {THREE.Scene} scene
     * @param {import('./AgentManager.js').AgentManager} agentManager
     */
    constructor(scene, agentManager) {
        this.scene = scene;
        this.agentManager = agentManager;

        /** @type {Map<string, SwarmSession>} Active swarm sessions */
        this.sessions = new Map();

        /** @type {THREE.Group} Visual swarm effects */
        this.swarmGroup = new THREE.Group();
        this.swarmGroup.name = 'swarm-effects';
        this.scene.add(this.swarmGroup);

        this._listen();
    }

    _listen() {
        // Listen for swarm requests from FloorManagers
        eventBus.on('swarm:request', (data) => this.handleSwarmRequest(data));
        eventBus.on('swarm:complete', (data) => this.completeSwarm(data));
        eventBus.on('task:swarmed', (data) => this._visualizeSwarm(data));

        // Listen on all enterprise floors for swarm requests
        for (const floor of [16, 17, 18, 19]) {
            eventBus.on(`floor:${floor}:swarm-request`, (data) => {
                this._dispatchReinforcementsFrom(floor, data);
            });
        }
    }

    // ─── Swarm Request Handling ─────────────────────────
    handleSwarmRequest(data) {
        const {
            taskId,
            targetFloor,
            coordinatorId,
            requiredCapabilities = [],
            priority = 'normal',
            maxAgents = 5
        } = data;

        console.log(`[SWARM] Request for task ${taskId}: floor ${targetFloor}, need ${requiredCapabilities.join(', ')}`);

        // Find available agents across all floors
        const allAgents = this.agentManager.getAllAgents();
        const candidates = [];

        // Determine tower scope - swarms stay within their tower unless cross-tower
        const tower = data.tower || 'left';

        for (const agent of allAgents) {
            // Skip agents already on the target floor
            if (agent.def.floor === targetFloor) continue;
            // Skip agents that are in a meeting or already swarming
            if (agent.state === 'meeting') continue;
            // Tower-aware: only recruit from the same tower unless explicitly cross-tower
            if (tower !== 'both' && (agent.def.tower || 'left') !== tower) continue;
            // Prefer idle agents
            const idleBonus = agent.state === 'idle' ? 2 : 0;

            // Score by capability match
            let capScore = 0;
            const agentCaps = agent.def.capabilities || [];
            for (const req of requiredCapabilities) {
                if (agentCaps.includes(req)) capScore += 3;
            }

            // Division match bonus
            const divisionMap = {
                security: ['security', 'pentest', 'audit'],
                rnd: ['research', 'prototype', 'experiment'],
                testing: ['qa', 'test', 'verify'],
                production: ['build', 'deploy', 'code']
            };
            for (const req of requiredCapabilities) {
                for (const [div, keywords] of Object.entries(divisionMap)) {
                    if (keywords.includes(req) && agent.def.division === div) {
                        capScore += 2;
                    }
                }
            }

            if (capScore > 0 || idleBonus > 0) {
                candidates.push({
                    agent,
                    score: capScore + idleBonus,
                    originalFloor: agent.def.floor,
                    originalState: agent.state
                });
            }
        }

        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);

        // Take top N
        const recruited = candidates.slice(0, maxAgents);

        if (recruited.length === 0) {
            console.log(`[SWARM] No available agents for task ${taskId}`);
            return;
        }

        // Create swarm session
        const session = {
            taskId,
            targetFloor,
            coordinatorId,
            agents: recruited.map(r => ({
                id: r.agent.def.id,
                sprite: r.agent,
                originalFloor: r.originalFloor,
                originalState: r.originalState
            })),
            status: 'recruiting',
            startTime: Date.now(),
            effects: []
        };
        this.sessions.set(taskId, session);

        // Move recruited agents to target floor (visual elevator animation)
        for (const r of recruited) {
            this._moveAgentToFloor(r.agent, targetFloor);
        }

        // Emit swarm event
        eventBus.emit('task:swarmed', {
            taskId,
            coordinator: coordinatorId,
            agents: recruited.map(r => r.agent.def.id),
            floor: targetFloor,
            division: 'swarm'
        });

        console.log(`[SWARM] Recruited ${recruited.length} agents for task ${taskId}`);

        // After a delay, set swarm to active
        setTimeout(() => {
            session.status = 'active';
            for (const r of session.agents) {
                r.sprite.setState('working');
            }
        }, 2000);
    }

    // ─── Enterprise Floor Dispatch ──────────────────────
    _dispatchReinforcementsFrom(floor, data) {
        const agents = this.agentManager.getAgentsByFloor(floor);
        const available = agents.filter(a => a.state === 'idle' || a.state === 'working');

        // Send up to 2 agents from enterprise floors
        const toSend = available.slice(0, 2);
        if (toSend.length > 0) {
            eventBus.emit(`floor:${data.requestingFloor}:swarm-response`, {
                taskId: data.taskId,
                agents: toSend.map(a => ({ id: a.def.id, division: a.def.division })),
                fromFloor: floor
            });

            // Move agents visually
            for (const agent of toSend) {
                this._moveAgentToFloor(agent, data.requestingFloor);
            }
        }
    }

    // ─── Agent Movement ─────────────────────────────────
    _moveAgentToFloor(agentSprite, targetFloor) {
        const floorHeight = 3.5;
        const targetY = targetFloor * floorHeight + 0.05;
        const currentY = agentSprite.group.position.y;

        // Animate Y position (elevator effect)
        const duration = 2000; // 2 seconds
        const startTime = Date.now();
        const startY = currentY;

        agentSprite.setState('moving');

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(1, elapsed / duration);
            // Smoothstep easing
            const smooth = t * t * (3 - 2 * t);
            agentSprite.group.position.y = startY + (targetY - startY) * smooth;

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                agentSprite.group.position.y = targetY;
                agentSprite.def.floor = targetFloor;
            }
        };
        requestAnimationFrame(animate);
    }

    // ─── Complete Swarm ─────────────────────────────────
    completeSwarm(data) {
        const session = this.sessions.get(data.taskId);
        if (!session) return;

        session.status = 'completing';

        // Return agents to their original floors
        for (const r of session.agents) {
            this._moveAgentToFloor(r.sprite, r.originalFloor);
            // Restore original state after returning
            setTimeout(() => {
                r.sprite.def.floor = r.originalFloor;
                r.sprite.setState(r.originalState || 'idle');
            }, 2500);
        }

        // Clean up effects
        for (const effect of session.effects) {
            this.swarmGroup.remove(effect);
            if (effect.geometry) effect.geometry.dispose();
            if (effect.material) effect.material.dispose();
        }

        this.sessions.delete(data.taskId);
        console.log(`[SWARM] Session completed for task ${data.taskId}, ${session.agents.length} agents returned`);
    }

    // ─── Visual Effects ─────────────────────────────────
    _visualizeSwarm(data) {
        const session = this.sessions.get(data.taskId);
        if (!session) return;

        // Create connection lines between swarming agents
        const positions = session.agents.map(a => a.sprite.group.position.clone());
        if (positions.length < 2) return;

        // Create a glowing ring around the swarm
        const center = new THREE.Vector3();
        for (const p of positions) center.add(p);
        center.divideScalar(positions.length);

        const ringGeom = new THREE.RingGeometry(3, 3.3, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: SWARM_COLORS.active,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.position.copy(center);
        ring.rotation.x = -Math.PI / 2;
        this.swarmGroup.add(ring);
        session.effects.push(ring);

        // Pulse animation
        const pulse = () => {
            if (!this.sessions.has(data.taskId)) return;
            const t = (Date.now() % 2000) / 2000;
            ring.scale.setScalar(1 + Math.sin(t * Math.PI * 2) * 0.15);
            ringMat.opacity = 0.3 + Math.sin(t * Math.PI * 2) * 0.2;
            requestAnimationFrame(pulse);
        };
        pulse();
    }

    // ─── Update (per frame) ─────────────────────────────
    update(delta) {
        // Rotate any active swarm effects
        for (const [, session] of this.sessions) {
            for (const effect of session.effects) {
                effect.rotation.z += delta * 0.5;
            }
        }
    }

    // ─── Query ──────────────────────────────────────────
    getActiveSessions() {
        return Array.from(this.sessions.values()).map(s => ({
            taskId: s.taskId,
            targetFloor: s.targetFloor,
            agentCount: s.agents.length,
            status: s.status,
            duration: Date.now() - s.startTime
        }));
    }

    dispose() {
        for (const [, session] of this.sessions) {
            for (const effect of session.effects) {
                this.swarmGroup.remove(effect);
            }
        }
        this.sessions.clear();
        this.swarmGroup.removeFromParent();
    }
}
