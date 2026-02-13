/**
 * AgentOnboarding - Floor 3 Agent Hiring / Assignment Expo
 * Renders an expo environment where new agents are introduced, assessed,
 * and animated into their assigned floor via elevator.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { AgentSprite } from './AgentSprite.js';

// ---- Layout constants ----
const EXPO_FLOOR    = 3;
const BOOTH_COUNT   = 6;
const BOOTH_RADIUS  = 4.0;
const BOOTH_SIZE    = 1.5;
const BOOTH_HEIGHT  = 0.15;
const BEAM_DURATION = 2.0;  // seconds for materialization beam
const STAT_BAR_HEIGHT = 0.6;
const ELEVATOR_SPEED  = 4.0; // floors per second

// Colors for expo booths
const BOOTH_COLORS = [
    0x3498DB, 0x2ECC71, 0xE74C3C, 0xF39C12, 0x9B59B6, 0x1ABC9C
];

/**
 * Create a single expo booth platform
 */
function createBooth(index, totalCount) {
    const angle = (index / totalCount) * Math.PI * 2;
    const x = Math.cos(angle) * BOOTH_RADIUS;
    const z = Math.sin(angle) * BOOTH_RADIUS;

    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Platform
    const platGeo = new THREE.CylinderGeometry(BOOTH_SIZE * 0.6, BOOTH_SIZE * 0.7, BOOTH_HEIGHT, 8);
    const platMat = new THREE.MeshStandardMaterial({
        color: BOOTH_COLORS[index % BOOTH_COLORS.length],
        transparent: true,
        opacity: 0.7,
        roughness: 0.3,
        metalness: 0.5
    });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.receiveShadow = true;
    group.add(platform);

    // Ring glow around edge
    const ringGeo = new THREE.TorusGeometry(BOOTH_SIZE * 0.65, 0.03, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
        color: BOOTH_COLORS[index % BOOTH_COLORS.length],
        transparent: true,
        opacity: 0.5
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = BOOTH_HEIGHT / 2 + 0.01;
    group.add(ring);

    return { group, platform, ring, position: new THREE.Vector3(x, 0, z) };
}

/**
 * Create the materialization beam of light
 */
function createBeam() {
    const beamGeo = new THREE.CylinderGeometry(0.1, 0.5, 6, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 3.0;
    beam.visible = false;
    return { mesh: beam, material: beamMat };
}

/**
 * Create floating stat bars for skills assessment
 */
function createStatBars(skills) {
    const group = new THREE.Group();
    const barWidth = 0.8;
    const barHeight = 0.08;
    const spacing = 0.15;

    const defaultSkills = skills || [
        { name: 'Code', value: 0.8 },
        { name: 'Review', value: 0.6 },
        { name: 'Deploy', value: 0.7 },
        { name: 'Test', value: 0.5 }
    ];

    defaultSkills.forEach((skill, i) => {
        // Background bar
        const bgGeo = new THREE.PlaneGeometry(barWidth, barHeight);
        const bgMat = new THREE.MeshBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const bg = new THREE.Mesh(bgGeo, bgMat);
        bg.position.set(0, STAT_BAR_HEIGHT + i * spacing, 0.6);
        group.add(bg);

        // Fill bar
        const fillWidth = barWidth * Math.max(0, Math.min(1, skill.value));
        const fillGeo = new THREE.PlaneGeometry(fillWidth, barHeight * 0.8);
        const hue = skill.value > 0.7 ? 0x2ECC71 : (skill.value > 0.4 ? 0xF1C40F : 0xE74C3C);
        const fillMat = new THREE.MeshBasicMaterial({
            color: hue,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        const fill = new THREE.Mesh(fillGeo, fillMat);
        fill.position.set(-(barWidth - fillWidth) / 2, STAT_BAR_HEIGHT + i * spacing, 0.601);
        group.add(fill);
    });

    group.visible = false;
    return group;
}


export class AgentOnboarding {
    /**
     * @param {THREE.Scene} scene
     * @param {object} [options]
     * @param {number} [options.floorHeight] - Y-units per floor
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.floorHeight = options.floorHeight || 3;
        this.floorY = EXPO_FLOOR * this.floorHeight;

        /** @type {THREE.Group} */
        this.group = new THREE.Group();
        this.group.name = 'onboarding-expo';
        this.group.position.y = this.floorY;

        /** @type {object[]} */
        this._booths = [];

        /** @type {{ agentDef: object, sprite: AgentSprite, state: string, timer: number, booth: number, targetFloor: number }[]} */
        this._queue = [];

        /** @type {{ agentDef: object, sprite: AgentSprite, state: string, timer: number, booth: number, targetFloor: number }|null} */
        this._activeOnboard = null;

        // Build environment
        this._buildExpo();
        this.scene.add(this.group);
    }

    // ------------------------------------------------------------------
    //  Build
    // ------------------------------------------------------------------

    _buildExpo() {
        // Floor surface
        const floorGeo = new THREE.PlaneGeometry(14, 10);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x58D68D,
            transparent: true,
            opacity: 0.15,
            roughness: 0.8
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.01;
        floor.receiveShadow = true;
        this.group.add(floor);

        // Expo booths in a circle
        for (let i = 0; i < BOOTH_COUNT; i++) {
            const booth = createBooth(i, BOOTH_COUNT);
            this.group.add(booth.group);
            this._booths.push(booth);
        }

        // Materialization beam (shared, repositioned per use)
        this._beam = createBeam();
        this.group.add(this._beam.mesh);

        // Stat bars (shared, repositioned per use)
        this._statBars = createStatBars();
        this.group.add(this._statBars);

        // Elevator shaft visual (right side)
        const shaftGeo = new THREE.BoxGeometry(1.2, 4, 1.2);
        const shaftMat = new THREE.MeshStandardMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.2,
            roughness: 0.9
        });
        this._elevatorShaft = new THREE.Mesh(shaftGeo, shaftMat);
        this._elevatorShaft.position.set(6.5, 2, 0);
        this.group.add(this._elevatorShaft);

        // Elevator car
        const carGeo = new THREE.BoxGeometry(1.0, 0.8, 1.0);
        const carMat = new THREE.MeshStandardMaterial({
            color: 0x95A5A6,
            roughness: 0.4,
            metalness: 0.6
        });
        this._elevatorCar = new THREE.Mesh(carGeo, carMat);
        this._elevatorCar.position.set(6.5, 0.4, 0);
        this.group.add(this._elevatorCar);

        // Center podium label
        const podiumGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.3, 6);
        const podiumMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.8, roughness: 0.2 });
        const podium = new THREE.Mesh(podiumGeo, podiumMat);
        podium.position.y = 0.15;
        this.group.add(podium);
    }

    // ------------------------------------------------------------------
    //  Public API
    // ------------------------------------------------------------------

    /**
     * Add a new agent to the onboarding queue
     * @param {object} agentDef - Agent definition
     * @returns {number} queue position
     */
    onboardAgent(agentDef) {
        const entry = {
            agentDef,
            sprite: null,
            state: 'queued',  // queued -> beaming -> assessing -> elevator -> done
            timer: 0,
            booth: this._nextBooth(),
            targetFloor: agentDef.floor || 1
        };
        this._queue.push(entry);
        eventBus.emit('onboarding:queued', { id: agentDef.id, position: this._queue.length });
        return this._queue.length;
    }

    /**
     * Show the expo - make group visible and start processing queue
     */
    showExpo() {
        this.group.visible = true;
        eventBus.emit('onboarding:expoShown');
    }

    /**
     * Hide the expo
     */
    hideExpo() {
        this.group.visible = false;
    }

    /**
     * @returns {number} queue length
     */
    get queueLength() {
        return this._queue.length;
    }

    // ------------------------------------------------------------------
    //  Update loop
    // ------------------------------------------------------------------

    /**
     * @param {number} delta - seconds
     */
    update(delta) {
        // Rotate booth rings for ambient animation
        for (const booth of this._booths) {
            booth.ring.rotation.z += delta * 0.5;
        }

        // Process active onboarding
        if (this._activeOnboard) {
            this._processActive(delta);
        } else if (this._queue.length > 0) {
            // Start next in queue
            this._startNext();
        }
    }

    // ------------------------------------------------------------------
    //  Internal processing
    // ------------------------------------------------------------------

    _nextBooth() {
        return Math.floor(Math.random() * BOOTH_COUNT);
    }

    _startNext() {
        const entry = this._queue.shift();
        if (!entry) return;

        // Create the agent sprite at booth position
        const booth = this._booths[entry.booth];
        const pos = booth.position.clone();
        pos.y = this.floorY + BOOTH_HEIGHT;

        entry.sprite = new AgentSprite(entry.agentDef, { position: pos });
        entry.sprite.group.scale.set(0.01, 0.01, 0.01); // start invisible
        entry.sprite.setState('idle');
        this.scene.add(entry.sprite.group);

        // Position beam over booth
        this._beam.mesh.position.set(booth.position.x, 3.0, booth.position.z);
        this._beam.mesh.visible = true;
        this._beam.material.opacity = 0;

        entry.state = 'beaming';
        entry.timer = 0;
        this._activeOnboard = entry;

        eventBus.emit('onboarding:started', { id: entry.agentDef.id });
    }

    _processActive(delta) {
        const e = this._activeOnboard;
        e.timer += delta;

        switch (e.state) {
            case 'beaming':
                this._processBeaming(e, delta);
                break;
            case 'assessing':
                this._processAssessing(e, delta);
                break;
            case 'elevator':
                this._processElevator(e, delta);
                break;
            case 'done':
                this._finishOnboard(e);
                break;
        }
    }

    _processBeaming(e, delta) {
        const progress = Math.min(e.timer / BEAM_DURATION, 1.0);

        // Beam fades in then out
        this._beam.material.opacity = progress < 0.5
            ? progress * 2 * 0.8
            : (1 - progress) * 2 * 0.8;

        // Agent materializes (scale up)
        const scale = THREE.MathUtils.smoothstep(progress, 0.2, 0.9);
        e.sprite.group.scale.setScalar(scale);

        if (progress >= 1.0) {
            this._beam.mesh.visible = false;
            e.state = 'assessing';
            e.timer = 0;

            // Show stat bars
            const booth = this._booths[e.booth];
            this._statBars.position.set(booth.position.x, 0, booth.position.z);
            this._statBars.visible = true;
        }
    }

    _processAssessing(e, delta) {
        // Stat bars visible for 3 seconds, rotate around agent
        this._statBars.rotation.y += delta * 1.5;

        if (e.timer >= 3.0) {
            this._statBars.visible = false;
            e.state = 'elevator';
            e.timer = 0;

            // Move agent to elevator position
            const elevatorPos = new THREE.Vector3(
                6.5,
                this.floorY + 0.4,
                0
            );
            e.sprite.moveTo(elevatorPos);
        }
    }

    _processElevator(e, delta) {
        // Wait for agent to reach elevator
        if (e.sprite.state === 'moving') return;

        // Ride elevator: move car + agent upward
        const targetY = e.targetFloor * this.floorHeight;
        const currentY = this._elevatorCar.position.y;
        const floorsToTravel = Math.abs(e.targetFloor - EXPO_FLOOR);
        const travelTime = floorsToTravel / ELEVATOR_SPEED;

        const progress = Math.min(e.timer / Math.max(travelTime, 0.5), 1.0);
        const newY = THREE.MathUtils.lerp(0.4, targetY - this.floorY + 0.4, progress);

        this._elevatorCar.position.y = newY;
        e.sprite.group.position.y = this.floorY + newY;

        if (progress >= 1.0) {
            // Reset elevator
            this._elevatorCar.position.y = 0.4;
            e.state = 'done';
        }
    }

    _finishOnboard(e) {
        // Agent is now on their target floor
        eventBus.emit('onboarding:complete', {
            id: e.agentDef.id,
            floor: e.targetFloor,
            sprite: e.sprite
        });

        // Remove sprite from scene (AgentManager should re-create it on the proper floor)
        e.sprite.group.removeFromParent();
        e.sprite.dispose();

        this._activeOnboard = null;
    }

    // ------------------------------------------------------------------
    //  Cleanup
    // ------------------------------------------------------------------

    dispose() {
        if (this._activeOnboard && this._activeOnboard.sprite) {
            this._activeOnboard.sprite.dispose();
        }
        for (const e of this._queue) {
            if (e.sprite) e.sprite.dispose();
        }
        this._queue = [];
        this._activeOnboard = null;
        this.group.removeFromParent();
    }
}
