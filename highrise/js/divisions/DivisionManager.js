/**
 * DivisionManager - Per-floor division area manager for The Highrise
 * Creates 8 division zones per project floor in a 4x2 grid layout.
 * Each zone has colored floor, label, desks, meeting room, and agent counters.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

// Division type classes
import { MarketingDivision } from './Marketing.js';
import { RnDDivision } from './RnD.js';
import { TestingDivision } from './Testing.js';
import { ProductionDivision } from './Production.js';
import { SecurityDivision } from './Security.js';
import { LegalDivision } from './Legal.js';
import { AccountingDivision } from './Accounting.js';

// ---- Constants ----
const DIVISIONS_PER_FLOOR = 8;
const GRID_COLS = 4;
const GRID_ROWS = 2;
const ZONE_WIDTH  = 2.8;
const ZONE_DEPTH  = 3.2;
const ZONE_GAP    = 0.3;
const FLOOR_OPACITY = 0.3;
const DESK_SIZE   = 0.25;
const DESK_HEIGHT = 0.4;
const TABLE_RADIUS = 0.8;
const TABLE_HEIGHT = 0.05;

// Division definitions matching floors.json
const DIVISION_DEFS = [
    { id: 'marketing',  name: 'Marketing',    emoji: '\uD83D\uDCE2', color: '#E67E22', cls: MarketingDivision },
    { id: 'rnd',        name: 'R&D',          emoji: '\uD83D\uDD2C', color: '#3498DB', cls: RnDDivision },
    { id: 'testing',    name: 'Testing',       emoji: '\uD83E\uDDEA', color: '#E74C3C', cls: TestingDivision },
    { id: 'production', name: 'Production',    emoji: '\uD83C\uDFED', color: '#2ECC71', cls: ProductionDivision },
    { id: 'security',   name: 'Security',      emoji: '\uD83D\uDD12', color: '#C0392B', cls: SecurityDivision },
    { id: 'legal',      name: 'Legal',         emoji: '\u2696\uFE0F', color: '#8B4513', cls: LegalDivision },
    { id: 'accounting', name: 'Accounting',    emoji: '\uD83D\uDCB0', color: '#27AE60', cls: AccountingDivision },
    { id: 'meeting',    name: 'Meeting Room',  emoji: '\uD83D\uDDE3\uFE0F', color: '#9B59B6', cls: null }
];

/**
 * Create a label sprite with emoji + text
 */
function createDivisionLabel(emoji, name, color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 8);
    ctx.fill();

    // Emoji + Name
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color || '#ffffff';
    ctx.fillText(`${emoji} ${name}`, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
    });

    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.6, 0.4, 1);
    return { sprite, texture, material: mat };
}

/**
 * Create an agent count indicator sprite
 */
function createCountIndicator() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 64;
    canvas.height = 64;

    // Will be redrawn when count changes
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('0', 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
    });

    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.4, 0.4, 1);

    return { sprite, texture, material: mat, canvas, ctx };
}

/**
 * Update the count indicator canvas
 */
function updateCountCanvas(indicator, count) {
    const { canvas, ctx, texture } = indicator;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = count > 0 ? 'rgba(46, 204, 113, 0.6)' : 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(count), 32, 32);

    texture.needsUpdate = true;
}


export class DivisionManager {
    /**
     * @param {THREE.Scene} scene
     * @param {object} [options]
     * @param {number} [options.floorHeight] - Y-units per floor
     * @param {object} [options.floorsData] - Parsed floors.json
     */
    constructor(scene, options = {}) {
        this.scene = scene;
        this.floorHeight = options.floorHeight || 3;
        this.floorsData = options.floorsData || null;

        /** @type {THREE.Group} */
        this.group = new THREE.Group();
        this.group.name = 'divisions-layer';
        this.scene.add(this.group);

        /**
         * Map of "floorIndex:divId" -> zone data
         * @type {Map<string, object>}
         */
        this._zones = new Map();

        /**
         * Map of floorIndex -> THREE.Group
         * @type {Map<number, THREE.Group>}
         */
        this._floorGroups = new Map();

        /**
         * Division type instances (per zone)
         * @type {Map<string, object>}
         */
        this._divisionInstances = new Map();
    }

    // ------------------------------------------------------------------
    //  Build divisions for a floor
    // ------------------------------------------------------------------

    /**
     * Create all 8 division zones for a given floor
     * @param {number} floorIndex
     * @param {object} [floorDef] - floor definition from floors.json
     */
    buildFloor(floorIndex, floorDef) {
        const floorGroup = new THREE.Group();
        floorGroup.name = `floor-divisions-${floorIndex}`;
        floorGroup.position.y = floorIndex * this.floorHeight;
        this.group.add(floorGroup);
        this._floorGroups.set(floorIndex, floorGroup);

        // Total floor width and depth
        const totalWidth = GRID_COLS * ZONE_WIDTH + (GRID_COLS - 1) * ZONE_GAP;
        const totalDepth = GRID_ROWS * ZONE_DEPTH + (GRID_ROWS - 1) * ZONE_GAP;
        const startX = -totalWidth / 2 + ZONE_WIDTH / 2;
        const startZ = -totalDepth / 2 + ZONE_DEPTH / 2;

        DIVISION_DEFS.forEach((divDef, index) => {
            const col = index % GRID_COLS;
            const row = Math.floor(index / GRID_COLS);

            const x = startX + col * (ZONE_WIDTH + ZONE_GAP);
            const z = startZ + row * (ZONE_DEPTH + ZONE_GAP);
            const position = new THREE.Vector3(x, 0.01, z);

            const zone = this._createZone(divDef, position, floorIndex);
            floorGroup.add(zone.group);

            const key = `${floorIndex}:${divDef.id}`;
            this._zones.set(key, zone);

            // Instantiate division-type class if available
            if (divDef.cls) {
                const instance = new divDef.cls();
                const divObjects = instance.create(position.clone());
                if (divObjects) {
                    floorGroup.add(divObjects);
                }
                this._divisionInstances.set(key, instance);
            }
        });

        eventBus.emit('divisions:floorBuilt', { floorIndex, zoneCount: DIVISIONS_PER_FLOOR });
    }

    /**
     * Create a single division zone
     */
    _createZone(divDef, position, floorIndex) {
        const zoneGroup = new THREE.Group();
        zoneGroup.name = `zone-${divDef.id}`;
        zoneGroup.position.copy(position);

        const color = new THREE.Color(divDef.color);

        // Colored floor rectangle
        const floorGeo = new THREE.PlaneGeometry(ZONE_WIDTH, ZONE_DEPTH);
        const floorMat = new THREE.MeshStandardMaterial({
            color,
            transparent: true,
            opacity: FLOOR_OPACITY,
            roughness: 0.9,
            side: THREE.DoubleSide
        });
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = true;
        zoneGroup.add(floorMesh);

        // Label sprite
        const label = createDivisionLabel(divDef.emoji, divDef.name, divDef.color);
        label.sprite.position.set(0, 0.6, 0);
        zoneGroup.add(label.sprite);

        // Agent count indicator
        const counter = createCountIndicator();
        counter.sprite.position.set(ZONE_WIDTH / 2 - 0.3, 0.5, -ZONE_DEPTH / 2 + 0.3);
        zoneGroup.add(counter.sprite);

        // Desks (initial count: 2)
        const desks = [];
        const deskCount = 2;
        for (let i = 0; i < deskCount; i++) {
            const desk = this._createDesk(color);
            const deskX = (i - (deskCount - 1) / 2) * 0.7;
            desk.position.set(deskX, DESK_HEIGHT / 2, 0.6);
            zoneGroup.add(desk);
            desks.push(desk);
        }

        // Meeting room (only for 'meeting' division)
        let meetingTable = null;
        if (divDef.id === 'meeting') {
            meetingTable = this._createMeetingTable();
            zoneGroup.add(meetingTable);
        }

        return {
            group: zoneGroup,
            divDef,
            floorIndex,
            floorMesh,
            floorMat,
            label,
            counter,
            desks,
            meetingTable,
            agentCount: 0
        };
    }

    _createDesk(tintColor) {
        const geo = new THREE.BoxGeometry(DESK_SIZE * 2, DESK_HEIGHT, DESK_SIZE * 1.5);
        const mat = new THREE.MeshStandardMaterial({
            color: tintColor.clone().lerp(new THREE.Color(0x333333), 0.6),
            roughness: 0.7,
            metalness: 0.2
        });
        const desk = new THREE.Mesh(geo, mat);
        desk.castShadow = true;
        desk.receiveShadow = true;
        return desk;
    }

    _createMeetingTable() {
        const group = new THREE.Group();

        // Circular table
        const tableGeo = new THREE.CylinderGeometry(TABLE_RADIUS, TABLE_RADIUS, TABLE_HEIGHT, 24);
        const tableMat = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.5,
            metalness: 0.3
        });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.y = 0.35;
        table.castShadow = true;
        table.receiveShadow = true;
        group.add(table);

        // Table leg
        const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.6 });
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.y = 0.175;
        group.add(leg);

        return group;
    }

    // ------------------------------------------------------------------
    //  Build all project floors
    // ------------------------------------------------------------------

    /**
     * Build divisions for all project-type floors
     * @param {object[]} floors - array of floor definitions from floors.json
     */
    buildAllProjectFloors(floors) {
        const projectFloors = floors.filter(f => f.type === 'project');
        for (const floorDef of projectFloors) {
            this.buildFloor(floorDef.index, floorDef);
        }
    }

    // ------------------------------------------------------------------
    //  Queries
    // ------------------------------------------------------------------

    /**
     * Get zone data for a specific division on a specific floor
     * @param {number} floorIndex
     * @param {string} divId
     * @returns {object|undefined}
     */
    getDivision(floorIndex, divId) {
        return this._zones.get(`${floorIndex}:${divId}`);
    }

    /**
     * Get the agent count for a division zone
     * @param {number} floorIndex
     * @param {string} divId
     * @returns {number}
     */
    getAgentCount(floorIndex, divId) {
        const zone = this._zones.get(`${floorIndex}:${divId}`);
        return zone ? zone.agentCount : 0;
    }

    /**
     * Update agent count for a division zone (call when agents move)
     * @param {number} floorIndex
     * @param {string} divId
     * @param {number} count
     */
    setAgentCount(floorIndex, divId, count) {
        const zone = this._zones.get(`${floorIndex}:${divId}`);
        if (!zone) return;

        zone.agentCount = count;
        updateCountCanvas(zone.counter, count);

        // Dynamically adjust desk count based on agent population
        this._adjustDesks(zone, count);
    }

    /**
     * Add or remove desks based on agent population
     */
    _adjustDesks(zone, agentCount) {
        const targetDesks = Math.max(1, Math.min(6, Math.ceil(agentCount / 1.5)));
        const currentDesks = zone.desks.length;

        if (targetDesks > currentDesks) {
            // Add desks
            const color = new THREE.Color(zone.divDef.color);
            for (let i = currentDesks; i < targetDesks; i++) {
                const desk = this._createDesk(color);
                const deskX = (i - (targetDesks - 1) / 2) * 0.7;
                desk.position.set(deskX, DESK_HEIGHT / 2, 0.6);
                zone.group.add(desk);
                zone.desks.push(desk);
            }
        } else if (targetDesks < currentDesks) {
            // Remove excess desks
            while (zone.desks.length > targetDesks) {
                const desk = zone.desks.pop();
                zone.group.remove(desk);
                desk.geometry.dispose();
                desk.material.dispose();
            }
        }
    }

    /**
     * Get all zones for a floor
     * @param {number} floorIndex
     * @returns {object[]}
     */
    getFloorDivisions(floorIndex) {
        const results = [];
        for (const [key, zone] of this._zones) {
            if (zone.floorIndex === floorIndex) {
                results.push(zone);
            }
        }
        return results;
    }

    // ------------------------------------------------------------------
    //  Update
    // ------------------------------------------------------------------

    /**
     * @param {number} delta
     */
    update(delta) {
        // Update division type instances
        for (const [key, instance] of this._divisionInstances) {
            if (instance.update) {
                instance.update(delta);
            }
        }
    }

    // ------------------------------------------------------------------
    //  Cleanup
    // ------------------------------------------------------------------

    dispose() {
        for (const [key, zone] of this._zones) {
            zone.floorMat.dispose();
            if (zone.label.texture) zone.label.texture.dispose();
            zone.label.material.dispose();
            if (zone.counter.texture) zone.counter.texture.dispose();
            zone.counter.material.dispose();
        }
        for (const [key, instance] of this._divisionInstances) {
            if (instance.dispose) instance.dispose();
        }
        this._zones.clear();
        this._floorGroups.clear();
        this._divisionInstances.clear();
        this.group.removeFromParent();
    }
}
