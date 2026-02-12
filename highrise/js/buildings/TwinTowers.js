/**
 * TwinTowers.js - Twin Tower Building Geometry for The Highrise
 * TSI Enterprise 3D Command Center
 *
 * Creates two mirrored towers:
 *   LEFT  tower at x=-10 (Local System, warm gold accent)
 *   RIGHT tower at x=+10 (Server System, cool blue accent)
 *
 * Each tower:
 *   - 14 units wide, 9 units deep
 *   - 22 floors (index -2 through 20), each 3.5 units tall
 *   - Glass shell (MeshPhysicalMaterial with transmission)
 *   - Per-floor geometry built via Floor class
 *   - Active project floors pulse gently (emissive color animation)
 *   - Enterprise floors have distinct trim color
 *   - Special floors (Lobby, Water Cooler, Onboarding) with unique accents
 *   - Right tower is a "mirror" with slightly different tint (server blue vs local gold)
 *
 * Usage (functional singleton):
 *   import { init, floorMeshes, getFloor } from '../buildings/TwinTowers.js';
 *   await init();
 *
 * Usage (class-based, for HighriseApp):
 *   import { TwinTowers } from '../buildings/TwinTowers.js';
 *   const towers = new TwinTowers(floorsData, projectsData);
 *   towers.create(scene);
 *   towers.update(dt);
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { Floor } from './Floor.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLOOR_HEIGHT  = 3.5;
const TOWER_WIDTH   = 14;
const TOWER_DEPTH   = 9;
const LEFT_X        = -10;
const RIGHT_X       = 10;

const LEFT_ACCENT  = new THREE.Color(0xd4af37);  // warm gold -- local system
const RIGHT_ACCENT = new THREE.Color(0x4a90d9);  // cool blue -- server system

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const towerGroup = new THREE.Group();
towerGroup.name  = 'twin-towers';

const leftTower  = new THREE.Group();
leftTower.name   = 'tower-left';
leftTower.position.x = LEFT_X;

const rightTower = new THREE.Group();
rightTower.name  = 'tower-right';
rightTower.position.x = RIGHT_X;

towerGroup.add(leftTower);
towerGroup.add(rightTower);

/** Flat array of slab meshes for raycasting (both towers). */
const floorMeshes = [];

/** Map of all Floor instances keyed by "left-{floorId}" / "right-{floorId}". */
const floorInstances = new Map();

let _floorsData   = null;
let _projectsData = null;
let _scene        = null;
let _elapsed      = 0;

// ---------------------------------------------------------------------------
// Data loading (for functional API)
// ---------------------------------------------------------------------------

async function _loadData() {
    const basePath = _resolveBasePath();
    const [floorsRes, projectsRes] = await Promise.all([
        fetch(basePath + '/js/data/floors.json'),
        fetch(basePath + '/js/data/projects.json'),
    ]);
    const floorsJson   = await floorsRes.json();
    const projectsJson = await projectsRes.json();
    _floorsData   = floorsJson.floors;
    _projectsData = projectsJson.projects;
}

function _resolveBasePath() {
    const loc = window.location.pathname;
    const idx = loc.indexOf('/highrise/');
    if (idx !== -1) return loc.substring(0, idx + '/highrise'.length);
    return '.';
}

// ---------------------------------------------------------------------------
// Tower construction
// ---------------------------------------------------------------------------

function _buildTower(towerSide) {
    const group  = towerSide === 'left' ? leftTower : rightTower;
    const accent = towerSide === 'left' ? LEFT_ACCENT : RIGHT_ACCENT;

    // Build a lookup of project statuses
    const statusMap = {};
    if (_projectsData) {
        _projectsData.forEach(p => { statusMap[p.id] = p.status; });
    }

    // Create each floor
    _floorsData.forEach(floorCfg => {
        const cfg = { ...floorCfg };

        // Right tower: tint colors toward server-blue
        if (towerSide === 'right') {
            const base = new THREE.Color(cfg.color);
            base.lerp(RIGHT_ACCENT, 0.15);
            cfg.color = '#' + base.getHexString();
        }

        const status = cfg.projectId ? (statusMap[cfg.projectId] || 'default') : 'default';
        const floor  = new Floor(cfg, status);
        group.add(floor.group);

        const key = towerSide + '-' + cfg.id;
        floorInstances.set(key, floor);

        // Store floor data on the slab for raycasting
        if (floor.slabMesh) {
            floor.slabMesh.userData.tower     = towerSide;
            floor.slabMesh.userData.floorData = cfg;
            floorMeshes.push(floor.slabMesh);
        }
    });

    // Full-height glass shell
    _buildGlassShell(group, accent);

    // Rooftop features
    _buildRooftop(group, accent);

    // Tower name label
    _buildTowerLabel(group, towerSide);
}

/**
 * Full-height translucent glass shell wrapping the tower.
 * MeshPhysicalMaterial with transmission for realism.
 */
function _buildGlassShell(group, accent) {
    const totalHeight = (_floorsData.length + 2) * FLOOR_HEIGHT;
    const baseY = -2 * FLOOR_HEIGHT;

    const shellGeo = new THREE.BoxGeometry(
        TOWER_WIDTH + 0.5,
        totalHeight,
        TOWER_DEPTH + 0.5
    );
    const shellMat = new THREE.MeshPhysicalMaterial({
        color: accent.clone().multiplyScalar(0.15),
        transparent: true,
        opacity: 0.06,
        roughness: 0.02,
        metalness: 0.1,
        transmission: 0.85,
        thickness: 0.5,
        emissive: accent,
        emissiveIntensity: 0.03,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.y = baseY + totalHeight / 2;
    shell.renderOrder = 1;
    group.add(shell);
}

/** Rooftop antenna and helipad marker. */
function _buildRooftop(group, accent) {
    const topFloorY = 20 * FLOOR_HEIGHT + FLOOR_HEIGHT;

    // Antenna
    const antennaGeo = new THREE.CylinderGeometry(0.08, 0.08, 3, 8);
    const antennaMat = new THREE.MeshStandardMaterial({
        color: 0x444466,
        roughness: 0.3,
        metalness: 0.8,
    });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.y = topFloorY + 1.5;
    antenna.castShadow = true;
    group.add(antenna);

    // Blinking light
    const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const lightMat = new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 1.0,
    });
    const lightMesh = new THREE.Mesh(lightGeo, lightMat);
    lightMesh.position.y = topFloorY + 3.1;
    group.add(lightMesh);
    group.userData._roofLight = lightMesh;

    // Helipad ring
    const padGeo = new THREE.RingGeometry(1.2, 1.5, 32);
    const padMat = new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = topFloorY + 0.05;
    group.add(pad);
}

/** Floating tower name label. */
function _buildTowerLabel(group, towerSide) {
    const topY  = 20 * FLOOR_HEIGHT + FLOOR_HEIGHT + 5;
    const isLeft = towerSide === 'left';
    const title  = isLeft ? 'LOCAL SYSTEM' : 'SERVER SYSTEM';
    const sub    = isLeft ? 'ASUS ProArt StudioBook' : '@FullySailSallyBot VPS';

    const canvas = document.createElement('canvas');
    canvas.width  = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = isLeft ? '#d4af37' : '#4a90d9';
    ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 256, 40);

    ctx.fillStyle = '#8090a0';
    ctx.font = '22px "Segoe UI", Arial, sans-serif';
    ctx.fillText(sub, 256, 90);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;

    const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: true,
        depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(8, 2, 1);
    sprite.position.set(0, topY, 0);
    group.add(sprite);
}

// ---------------------------------------------------------------------------
// Per-frame update
// ---------------------------------------------------------------------------

function _updateTowers(dt) {
    _elapsed += dt;

    // Update each floor (pulsing glow for project floors)
    floorInstances.forEach(floor => floor.update(_elapsed));

    // Blink rooftop lights
    const blinkVal = Math.sin(_elapsed * 3) > 0.3 ? 1.0 : 0.1;
    [leftTower, rightTower].forEach(tower => {
        const light = tower.userData._roofLight;
        if (light) light.material.emissiveIntensity = blinkVal;
    });
}

// ---------------------------------------------------------------------------
// Public API (functional singleton)
// ---------------------------------------------------------------------------

/**
 * Async initializer -- loads floor data and builds both towers.
 * Adds the tower group to the SceneManager's scene automatically.
 */
async function init() {
    await _loadData();

    _buildTower('left');
    _buildTower('right');

    // Import SceneManager dynamically to avoid circular deps
    const sm = await import('../core/SceneManager.js');
    if (sm.scene) {
        sm.scene.add(towerGroup);
        _scene = sm.scene;
    }

    // Register per-frame update
    if (sm.onUpdate) {
        sm.onUpdate(_updateTowers);
    }

    // Store floor data in state manager
    stateManager.set('floors', Object.fromEntries(
        _floorsData.map(f => [f.id, f])
    ));

    eventBus.emit('towers:ready', {
        floorCount: _floorsData.length,
        leftFloors: Array.from(floorInstances.keys()).filter(k => k.startsWith('left-')),
        rightFloors: Array.from(floorInstances.keys()).filter(k => k.startsWith('right-')),
    });
}

/**
 * Get a Floor instance by tower side and floor id.
 * @param {string} side - "left" or "right"
 * @param {string} floorId - e.g. "lobby", "tsiapp"
 * @returns {Floor|undefined}
 */
function getFloor(side, floorId) {
    return floorInstances.get(side + '-' + floorId);
}

/**
 * Get all Floor instances for a given floor index (both towers).
 * @param {number} index
 * @returns {Floor[]}
 */
function getFloorsByIndex(index) {
    const results = [];
    floorInstances.forEach(floor => {
        if (floor.index === index) results.push(floor);
    });
    return results;
}

// ---------------------------------------------------------------------------
// Class wrapper for HighriseApp compatibility
// ---------------------------------------------------------------------------

/**
 * Class-based facade.
 * Usage:
 *   const towers = new TwinTowers(floorsData, projectsData);
 *   towers.create(scene);
 *   towers.update(dt);
 *   towers.getClickableFloors();
 */
class TwinTowersClass {
    constructor(floorsData, projectsData) {
        _floorsData   = floorsData?.floors   || floorsData || [];
        _projectsData = projectsData?.projects || projectsData || [];
    }

    /**
     * Build both towers and add to the provided scene.
     * @param {THREE.Scene} sceneObj
     */
    create(sceneObj) {
        _scene = sceneObj;

        _buildTower('left');
        _buildTower('right');

        sceneObj.add(towerGroup);

        stateManager.set('floors', Object.fromEntries(
            _floorsData.map(f => [f.id, f])
        ));

        eventBus.emit('towers:ready', {
            floorCount: _floorsData.length,
        });
    }

    update(dt) {
        _updateTowers(dt);
    }

    /** Return the array of slab meshes for raycasting. */
    getClickableFloors() {
        return floorMeshes;
    }

    getFloor(side, id)       { return getFloor(side, id); }
    getFloorsByIndex(index)  { return getFloorsByIndex(index); }

    get towerGroup()    { return towerGroup; }
    get leftTower()     { return leftTower; }
    get rightTower()    { return rightTower; }
    get floorMeshes()   { return floorMeshes; }
    get floorInstances(){ return floorInstances; }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
    towerGroup,
    leftTower,
    rightTower,
    floorMeshes,
    floorInstances,
    init,
    getFloor,
    getFloorsByIndex,
};

export { TwinTowersClass as TwinTowers };

export default {
    towerGroup,
    leftTower,
    rightTower,
    floorMeshes,
    floorInstances,
    init,
    getFloor,
    getFloorsByIndex,
};
