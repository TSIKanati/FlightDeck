/**
 * TranslucentWall.js - The Connecting Glass Wall Between Towers
 * TSI Enterprise 3D Command Center
 *
 * A semi-transparent glass bridge positioned at x=0 between the twin towers.
 * Full height of both buildings, with animated data-flow particles:
 *
 *   - Small glowing spheres traveling vertically and horizontally
 *   - Different colors by connection type (deployment=blue, sync=green, command=gold)
 *   - Particles spawn from random floors and travel to the corresponding floor on
 *     the opposite tower
 *   - 20-30 particles active at any time
 *   - Thin glowing connection lines between matched floors
 *   - Pulsing glow that intensifies during sync events
 *
 * Public:
 *   triggerSync(fromFloorIndex, toFloorIndex) -- bright burst between floors
 *
 * Usage (functional singleton):
 *   import { init, triggerSync } from '../buildings/TranslucentWall.js';
 *   init();
 *
 * Usage (class-based, for HighriseApp):
 *   import { TranslucentWall } from '../buildings/TranslucentWall.js';
 *   const wall = new TranslucentWall(floorsData);
 *   wall.create(scene);
 *   wall.update(dt);
 *   wall.triggerSync(5, 5);
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLOOR_HEIGHT    = 3.5;
const MIN_FLOOR_IDX   = -2;
const MAX_FLOOR_IDX   = 20;
const TOTAL_FLOORS    = MAX_FLOOR_IDX - MIN_FLOOR_IDX + 1;
const TOTAL_HEIGHT    = TOTAL_FLOORS * FLOOR_HEIGHT;
const BASE_Y          = MIN_FLOOR_IDX * FLOOR_HEIGHT;

const LEFT_X  = -10;
const RIGHT_X =  10;
const TOWER_HALF_W    = 7;   // half of tower width (towers are 14 wide)

const MAX_PARTICLES       = 30;
const MIN_PARTICLES       = 20;
const PARTICLE_SPEED_MIN  = 3.0;
const PARTICLE_SPEED_MAX  = 7.0;
const PARTICLE_SIZE       = 0.15;

// Connection type colors
const TYPE_COLORS = {
    deployment: new THREE.Color(0x4a90d9),  // blue
    sync:       new THREE.Color(0x2ecc71),  // green
    command:    new THREE.Color(0xd4af37),  // gold
    data:       new THREE.Color(0x9b59b6),  // purple
    alert:      new THREE.Color(0xe74c3c),  // red
};
const TYPE_KEYS = Object.keys(TYPE_COLORS);

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const wallGroup = new THREE.Group();
wallGroup.name  = 'translucent-wall';

let _glassMesh     = null;
let _scene         = null;
let _elapsed       = 0;

const _particlePool    = [];
const _connectionLines = [];

// Sync burst state
let _syncBurstActive = false;
let _syncBurstTimer  = 0;
let _syncBurstFrom   = 0;
let _syncBurstTo     = 0;
let _pulseIntensity  = 0;

// Spawn timer
let _spawnTimer   = 0;
const SPAWN_INTERVAL = 0.3;

// ---------------------------------------------------------------------------
// Glass wall
// ---------------------------------------------------------------------------

function _buildGlassWall() {
    const bridgeWidth = RIGHT_X - LEFT_X - TOWER_HALF_W * 2; // gap between tower edges
    const geo = new THREE.BoxGeometry(
        (RIGHT_X - LEFT_X) - 1,  // span almost the full distance
        TOTAL_HEIGHT,
        0.1
    );
    const mat = new THREE.MeshPhysicalMaterial({
        color: 0x0a1a3a,
        transparent: true,
        opacity: 0.15,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.7,
        thickness: 0.1,
        emissive: 0x1a3060,
        emissiveIntensity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    _glassMesh = new THREE.Mesh(geo, mat);
    _glassMesh.position.set(0, BASE_Y + TOTAL_HEIGHT / 2, 0);
    _glassMesh.renderOrder = 2;
    wallGroup.add(_glassMesh);
}

// ---------------------------------------------------------------------------
// Connection lines
// ---------------------------------------------------------------------------

function _buildConnectionLines() {
    const lineMat = new THREE.LineBasicMaterial({
        color: 0x1a3060,
        transparent: true,
        opacity: 0.12,
        linewidth: 1,
    });

    for (let i = MIN_FLOOR_IDX; i <= MAX_FLOOR_IDX; i++) {
        const y = i * FLOOR_HEIGHT + FLOOR_HEIGHT * 0.5;
        const points = [
            new THREE.Vector3(LEFT_X + TOWER_HALF_W, y, 0),
            new THREE.Vector3(RIGHT_X - TOWER_HALF_W, y, 0),
        ];
        const geo  = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, lineMat.clone());
        line.userData.floorIndex = i;
        wallGroup.add(line);
        _connectionLines.push(line);
    }
}

// ---------------------------------------------------------------------------
// Particle system
// ---------------------------------------------------------------------------

class DataParticle {
    constructor() {
        this.mesh     = null;
        this.active   = false;
        this.progress = 0;
        this.speed    = 0;
        this.start    = new THREE.Vector3();
        this.end      = new THREE.Vector3();
        this.control  = new THREE.Vector3();
        this.type     = 'sync';
        this._tmp     = new THREE.Vector3();
    }

    spawn(startPos, endPos, type) {
        this.active   = true;
        this.progress = 0;
        this.speed    = PARTICLE_SPEED_MIN + Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);
        this.type     = type || TYPE_KEYS[Math.floor(Math.random() * TYPE_KEYS.length)];

        this.start.copy(startPos);
        this.end.copy(endPos);

        // Bezier control -- midpoint with vertical jitter for a nice curve
        this.control.lerpVectors(startPos, endPos, 0.5);
        this.control.y += (Math.random() - 0.5) * 3;
        this.control.z += (Math.random() - 0.5) * 1.5;

        const color = TYPE_COLORS[this.type] || TYPE_COLORS.sync;
        if (this.mesh) {
            this.mesh.material.color.copy(color);
            this.mesh.material.emissive.copy(color);
            this.mesh.visible = true;
        }
    }

    kill() {
        this.active = false;
        if (this.mesh) this.mesh.visible = false;
    }

    update(dt) {
        if (!this.active) return;
        this.progress += dt * this.speed * 0.1;
        if (this.progress >= 1.0) { this.kill(); return; }

        const t  = this.progress;
        const t1 = 1 - t;

        // Quadratic bezier
        this._tmp.set(
            t1*t1*this.start.x + 2*t1*t*this.control.x + t*t*this.end.x,
            t1*t1*this.start.y + 2*t1*t*this.control.y + t*t*this.end.y,
            t1*t1*this.start.z + 2*t1*t*this.control.z + t*t*this.end.z
        );

        if (this.mesh) {
            this.mesh.position.copy(this._tmp);
            const fade = Math.sin(t * Math.PI);
            this.mesh.material.opacity = 0.6 + fade * 0.4;
            this.mesh.scale.setScalar(0.8 + fade * 0.5);
        }
    }
}

function _initParticles() {
    const geo = new THREE.SphereGeometry(PARTICLE_SIZE, 6, 6);

    for (let i = 0; i < MAX_PARTICLES; i++) {
        const mat = new THREE.MeshStandardMaterial({
            color: 0x4a90d9,
            emissive: 0x4a90d9,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.visible = false;
        mesh.renderOrder = 3;
        wallGroup.add(mesh);

        const p = new DataParticle();
        p.mesh = mesh;
        _particlePool.push(p);
    }
}

function _getInactive() {
    for (let i = 0; i < _particlePool.length; i++) {
        if (!_particlePool[i].active) return _particlePool[i];
    }
    return null;
}

function _countActive() {
    let n = 0;
    for (let i = 0; i < _particlePool.length; i++) {
        if (_particlePool[i].active) n++;
    }
    return n;
}

function _spawnRandom() {
    const p = _getInactive();
    if (!p) return;

    const floorIdx = MIN_FLOOR_IDX + Math.floor(Math.random() * TOTAL_FLOORS);
    const y = floorIdx * FLOOR_HEIGHT + FLOOR_HEIGHT * 0.5;

    const l2r    = Math.random() > 0.5;
    const startX = l2r ? LEFT_X + TOWER_HALF_W : RIGHT_X - TOWER_HALF_W;
    const endX   = l2r ? RIGHT_X - TOWER_HALF_W : LEFT_X + TOWER_HALF_W;

    const targetIdx = Math.max(MIN_FLOOR_IDX, Math.min(MAX_FLOOR_IDX,
        floorIdx + Math.floor(Math.random() * 3) - 1));
    const targetY = targetIdx * FLOOR_HEIGHT + FLOOR_HEIGHT * 0.5;

    p.spawn(
        new THREE.Vector3(startX, y,       (Math.random() - 0.5) * 0.5),
        new THREE.Vector3(endX,   targetY, (Math.random() - 0.5) * 0.5)
    );
}

// ---------------------------------------------------------------------------
// Per-frame update
// ---------------------------------------------------------------------------

function _updateWall(dt) {
    _elapsed += dt;

    // Update particles
    for (let i = 0; i < _particlePool.length; i++) {
        _particlePool[i].update(dt);
    }

    // Maintain particle count
    const active = _countActive();
    _spawnTimer += dt;
    if (_spawnTimer >= SPAWN_INTERVAL && active < MIN_PARTICLES) {
        _spawnRandom();
        _spawnTimer = 0;
    }
    if (_spawnTimer >= SPAWN_INTERVAL * 2 && active < MAX_PARTICLES && Math.random() < 0.3) {
        _spawnRandom();
        _spawnTimer = 0;
    }

    // Glass pulse
    if (_glassMesh) {
        const basePulse = 0.08 + Math.sin(_elapsed * 0.8) * 0.02;
        _glassMesh.material.emissiveIntensity = basePulse + _pulseIntensity * 0.2;
    }

    // Decay sync pulse
    if (_pulseIntensity > 0) {
        _pulseIntensity = Math.max(0, _pulseIntensity - dt * 1.5);
    }

    // Sync burst -- rapid particles between specific floors
    if (_syncBurstActive) {
        _syncBurstTimer -= dt;
        if (_syncBurstTimer <= 0) {
            _syncBurstActive = false;
        } else {
            for (let s = 0; s < 2; s++) {
                const p = _getInactive();
                if (!p) break;
                const fromY = _syncBurstFrom * FLOOR_HEIGHT + FLOOR_HEIGHT * 0.5;
                const toY   = _syncBurstTo   * FLOOR_HEIGHT + FLOOR_HEIGHT * 0.5;
                p.spawn(
                    new THREE.Vector3(LEFT_X + TOWER_HALF_W, fromY, (Math.random()-0.5)*0.3),
                    new THREE.Vector3(RIGHT_X - TOWER_HALF_W, toY,  (Math.random()-0.5)*0.3),
                    'sync'
                );
                p.speed = PARTICLE_SPEED_MAX * 1.5;
            }
        }
    }

    // Brighten connection lines near the camera
    const camY = stateManager.get('cameraPosition')?.y || 10;
    _connectionLines.forEach(line => {
        const floorY = line.userData.floorIndex * FLOOR_HEIGHT;
        const dist   = Math.abs(camY - floorY);
        line.material.opacity = Math.max(0.05, 0.3 - dist * 0.01) + _pulseIntensity * 0.15;
    });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Trigger a sync burst between two floors.
 * @param {number} fromFloorIndex
 * @param {number} toFloorIndex
 */
function triggerSync(fromFloorIndex, toFloorIndex) {
    _syncBurstActive = true;
    _syncBurstTimer  = 1.2;
    _syncBurstFrom   = fromFloorIndex;
    _syncBurstTo     = toFloorIndex;
    _pulseIntensity  = 1.0;

    _connectionLines.forEach(line => {
        if (line.userData.floorIndex === fromFloorIndex ||
            line.userData.floorIndex === toFloorIndex) {
            line.material.opacity = 0.8;
            line.material.color.set(TYPE_COLORS.sync);
        }
    });

    eventBus.emit('wall:syncTriggered', { from: fromFloorIndex, to: toFloorIndex });
}

/**
 * Initialize (functional singleton path).
 * Adds the wall to the SceneManager scene automatically.
 */
async function init() {
    _buildGlassWall();
    _buildConnectionLines();
    _initParticles();

    const sm = await import('../core/SceneManager.js');
    if (sm.scene) {
        sm.scene.add(wallGroup);
        _scene = sm.scene;
    }
    if (sm.onUpdate) {
        sm.onUpdate(_updateWall);
    }

    // Listen for external sync events
    eventBus.on('sync:trigger', (data) => {
        if (data && data.from !== undefined && data.to !== undefined) {
            triggerSync(data.from, data.to);
        }
    });

    eventBus.emit('wall:ready');
}

function dispose() {
    wallGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
    if (_scene) _scene.remove(wallGroup);
}

// ---------------------------------------------------------------------------
// Class wrapper for HighriseApp compatibility
// ---------------------------------------------------------------------------

/**
 * Class-based facade.
 * Usage:
 *   const wall = new TranslucentWall(floorsData);
 *   wall.create(scene);
 *   wall.update(dt);
 *   wall.triggerSync(5, 5);
 */
class TranslucentWallClass {
    constructor(floorsData) {
        // floorsData is accepted for compatibility but not strictly needed
        // since the wall geometry is derived from constants
    }

    create(sceneObj) {
        _scene = sceneObj;
        _buildGlassWall();
        _buildConnectionLines();
        _initParticles();
        sceneObj.add(wallGroup);

        eventBus.on('sync:trigger', (data) => {
            if (data && data.from !== undefined && data.to !== undefined) {
                triggerSync(data.from, data.to);
            }
        });

        eventBus.emit('wall:ready');
    }

    update(dt)                          { _updateWall(dt); }
    triggerSync(from, to)               { triggerSync(from, to); }
    dispose()                           { dispose(); }
    get wallGroup()                     { return wallGroup; }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
    wallGroup,
    init,
    dispose,
    triggerSync,
};

export { TranslucentWallClass as TranslucentWall };

export default {
    wallGroup,
    init,
    dispose,
    triggerSync,
};
