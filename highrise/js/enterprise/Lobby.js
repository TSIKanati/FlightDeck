/**
 * Lobby.js - Floor 1: Ground Floor Lobby
 * The Highrise 3D Command Center
 *
 * Grand entrance of TSI Enterprise featuring:
 * - Marble pillars flanking the entrance
 * - Reception desk with TSI Enterprise branding
 * - Interactive directory board showing all floors
 * - Welcome mat area
 * - Animated elevator doors
 * - Spinning wireframe globe/logo
 * - Visitor seating clusters
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLOOR_WIDTH = 20;
const FLOOR_DEPTH = 14;
const FLOOR_HEIGHT = 4;
const PILLAR_RADIUS = 0.25;
const PILLAR_HEIGHT = FLOOR_HEIGHT - 0.2;
const GLOBE_RADIUS = 0.8;
const GLOBE_SPEED = 0.25;
const ELEVATOR_OPEN_SPEED = 2.0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a canvas texture with centered text lines. */
function _makeTextCanvas(lines, width, height, opts = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = opts.bg || '#0a1628';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = opts.color || '#c0d8ff';
    ctx.font = opts.font || 'bold 20px monospace';
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = 'top';

    const lineHeight = opts.lineHeight || 28;
    const startY = opts.startY || 16;

    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], width / 2, startY + i * lineHeight);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
}

/** Create a text sprite at given position. */
function _makeLabel(text, position, scale = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 512, 64);
    ctx.fillStyle = '#e0e8ff';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(position);
    sprite.scale.set(4 * scale, 0.5 * scale, 1);
    return sprite;
}

// ---------------------------------------------------------------------------
// Lobby Class
// ---------------------------------------------------------------------------

export class Lobby {
    constructor() {
        /** @type {THREE.Group|null} */
        this.group = null;

        /** @type {THREE.Mesh|null} - spinning globe */
        this._globe = null;

        /** @type {THREE.Mesh|null} */
        this._elevatorLeft = null;
        /** @type {THREE.Mesh|null} */
        this._elevatorRight = null;
        this._elevatorOpen = false;
        this._elevatorT = 0; // 0 = closed, 1 = open

        /** @type {THREE.Mesh|null} */
        this._directoryBoard = null;
        this._directoryVisible = false;

        this._elapsed = 0;
    }

    // -----------------------------------------------------------------------
    // create
    // -----------------------------------------------------------------------

    create(parentGroup) {
        this.group = new THREE.Group();
        this.group.name = 'Lobby_Floor1';

        this._createFloorBase();
        this._createPillars();
        this._createReceptionDesk();
        this._createDirectoryBoard();
        this._createWelcomeMat();
        this._createElevatorDoors();
        this._createGlobe();
        this._createVisitorSeating();

        parentGroup.add(this.group);

        eventBus.emit('floor:created', { floor: 1, name: 'Lobby' });

        return this.group;
    }

    // -----------------------------------------------------------------------
    // Geometry builders (private)
    // -----------------------------------------------------------------------

    _createFloorBase() {
        const geo = new THREE.BoxGeometry(FLOOR_WIDTH, 0.15, FLOOR_DEPTH);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.3,
            metalness: 0.5,
        });
        const floor = new THREE.Mesh(geo, mat);
        floor.position.set(0, 0, 0);
        floor.receiveShadow = true;
        this.group.add(floor);

        // Ceiling
        const ceiling = new THREE.Mesh(
            new THREE.BoxGeometry(FLOOR_WIDTH, 0.1, FLOOR_DEPTH),
            new THREE.MeshStandardMaterial({ color: 0x0e0e1a, roughness: 0.8 })
        );
        ceiling.position.set(0, FLOOR_HEIGHT, 0);
        this.group.add(ceiling);
    }

    _createPillars() {
        const pillarGeo = new THREE.CylinderGeometry(PILLAR_RADIUS, PILLAR_RADIUS, PILLAR_HEIGHT, 12);
        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0xe8e0d0,
            roughness: 0.15,
            metalness: 0.3,
        });

        // Left pillar
        const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
        leftPillar.position.set(-3, PILLAR_HEIGHT / 2 + 0.1, FLOOR_DEPTH / 2 - 0.5);
        leftPillar.castShadow = true;
        this.group.add(leftPillar);

        // Right pillar
        const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
        rightPillar.position.set(3, PILLAR_HEIGHT / 2 + 0.1, FLOOR_DEPTH / 2 - 0.5);
        rightPillar.castShadow = true;
        this.group.add(rightPillar);
    }

    _createReceptionDesk() {
        // Main desk body
        const deskGeo = new THREE.BoxGeometry(5, 1.1, 1.2);
        const deskMat = new THREE.MeshStandardMaterial({
            color: 0x2a1f3d,
            roughness: 0.4,
            metalness: 0.6,
        });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(0, 0.65, 1);
        desk.castShadow = true;
        this.group.add(desk);

        // Desk front panel accent
        const accentGeo = new THREE.BoxGeometry(5.05, 0.08, 1.22);
        const accentMat = new THREE.MeshStandardMaterial({
            color: 0x4488cc,
            emissive: 0x224466,
            emissiveIntensity: 0.5,
        });
        const accent = new THREE.Mesh(accentGeo, accentMat);
        accent.position.set(0, 1.18, 1);
        this.group.add(accent);

        // Label sprite
        const label = _makeLabel('TSI Enterprise', new THREE.Vector3(0, 1.6, 1.7), 0.7);
        this.group.add(label);
    }

    _createDirectoryBoard() {
        const floorList = [
            '=== TSI ENTERPRISE ===',
            '',
            'F20  Executive Suite',
            'F19  Security Center',
            'F18  Legal & Compliance',
            'F17  R&D Innovation Lab',
            'F16  Finance & Accounting',
            'F15  Marketing & Growth',
            'F14  Product Division',
            'F13  Engineering Core',
            'F12  Data Analytics',
            'F11  QA & Testing',
            'F10  DevOps & Infra',
            'F09  Customer Success',
            'F08  HR & Talent',
            'F07  Design Studio',
            'F06  Sales Operations',
            'F05  Partnerships',
            'F04  Support Center',
            'F03  Training Academy',
            'F02  Onboarding',
            'F01  Lobby  [YOU ARE HERE]',
            'B01  Test Bunker',
            'B02  Power Station',
        ];

        const tex = _makeTextCanvas(floorList, 512, 768, {
            font: 'bold 16px monospace',
            lineHeight: 28,
            startY: 12,
            bg: '#060d1c',
            color: '#88bbee',
        });

        const boardGeo = new THREE.PlaneGeometry(2.4, 3.6);
        const boardMat = new THREE.MeshStandardMaterial({
            map: tex,
            emissive: 0x112244,
            emissiveIntensity: 0.3,
        });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.set(-7, 2.2, -0.5);
        board.rotation.y = Math.PI * 0.05;
        this.group.add(board);
        this._directoryBoard = board;

        // Board frame
        const frameGeo = new THREE.BoxGeometry(2.6, 3.8, 0.06);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.8 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.copy(board.position);
        frame.position.z -= 0.04;
        frame.rotation.y = board.rotation.y;
        this.group.add(frame);
    }

    _createWelcomeMat() {
        const matGeo = new THREE.PlaneGeometry(4, 2);
        const matMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a4466,
            roughness: 0.9,
            metalness: 0.0,
        });
        const welcomeMat = new THREE.Mesh(matGeo, matMaterial);
        welcomeMat.rotation.x = -Math.PI / 2;
        welcomeMat.position.set(0, 0.08, FLOOR_DEPTH / 2 - 1);
        this.group.add(welcomeMat);

        // Accent border
        const borderGeo = new THREE.PlaneGeometry(4.2, 2.2);
        const borderMat = new THREE.MeshStandardMaterial({
            color: 0x3388aa,
            emissive: 0x114455,
            emissiveIntensity: 0.4,
        });
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.rotation.x = -Math.PI / 2;
        border.position.set(0, 0.075, FLOOR_DEPTH / 2 - 1);
        this.group.add(border);
    }

    _createElevatorDoors() {
        const doorGeo = new THREE.BoxGeometry(1.2, 2.8, 0.08);
        const doorMat = new THREE.MeshStandardMaterial({
            color: 0x8899aa,
            metalness: 0.9,
            roughness: 0.15,
        });

        this._elevatorLeft = new THREE.Mesh(doorGeo, doorMat);
        this._elevatorLeft.position.set(-0.62, 1.5, -FLOOR_DEPTH / 2 + 0.1);
        this._elevatorLeft.castShadow = true;
        this.group.add(this._elevatorLeft);

        this._elevatorRight = new THREE.Mesh(doorGeo, doorMat.clone());
        this._elevatorRight.position.set(0.62, 1.5, -FLOOR_DEPTH / 2 + 0.1);
        this._elevatorRight.castShadow = true;
        this.group.add(this._elevatorRight);

        // Elevator frame
        const frameGeo = new THREE.BoxGeometry(3.0, 3.2, 0.12);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.8 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 1.6, -FLOOR_DEPTH / 2 + 0.04);
        this.group.add(frame);

        // Indicator light above doors
        const indGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const indMat = new THREE.MeshStandardMaterial({
            color: 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.8,
        });
        const indicator = new THREE.Mesh(indGeo, indMat);
        indicator.position.set(0, 3.1, -FLOOR_DEPTH / 2 + 0.15);
        this.group.add(indicator);
    }

    _createGlobe() {
        const geo = new THREE.IcosahedronGeometry(GLOBE_RADIUS, 1);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xccaa44,
            emissive: 0x886622,
            emissiveIntensity: 0.4,
            wireframe: true,
        });
        this._globe = new THREE.Mesh(geo, mat);
        this._globe.position.set(0, 2.8, 0.2);
        this.group.add(this._globe);

        // Globe pedestal
        const pedestalGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.5, 8);
        const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.7 });
        const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
        pedestal.position.set(0, 1.95, 0.2);
        this.group.add(pedestal);

        // Point light inside globe
        const globeLight = new THREE.PointLight(0xddaa33, 0.6, 4);
        globeLight.position.copy(this._globe.position);
        this.group.add(globeLight);
    }

    _createVisitorSeating() {
        const seatMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a3e,
            roughness: 0.6,
        });

        const seatPositions = [
            { x: 6, z: 3 },
            { x: 7, z: 3 },
            { x: 6, z: 5 },
            { x: 7, z: 5 },
            { x: -6, z: 3 },
            { x: -7, z: 3 },
        ];

        for (const pos of seatPositions) {
            // Seat base
            const base = new THREE.Mesh(
                new THREE.BoxGeometry(0.7, 0.45, 0.7),
                seatMat
            );
            base.position.set(pos.x, 0.32, pos.z);
            base.castShadow = true;
            this.group.add(base);

            // Seat back
            const back = new THREE.Mesh(
                new THREE.BoxGeometry(0.7, 0.5, 0.1),
                seatMat
            );
            back.position.set(pos.x, 0.75, pos.z - 0.3);
            this.group.add(back);
        }

        // Small coffee table between seating clusters
        const tableGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 8);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x1a1a28, metalness: 0.5 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(6.5, 0.3, 4);
        this.group.add(table);
    }

    // -----------------------------------------------------------------------
    // update
    // -----------------------------------------------------------------------

    update(delta) {
        this._elapsed += delta;

        // Spin globe
        if (this._globe) {
            this._globe.rotation.y += GLOBE_SPEED * delta;
            this._globe.rotation.x = Math.sin(this._elapsed * 0.3) * 0.1;
        }

        // Animate elevator doors
        if (this._elevatorLeft && this._elevatorRight) {
            const target = this._elevatorOpen ? 1 : 0;
            const diff = target - this._elevatorT;
            if (Math.abs(diff) > 0.001) {
                this._elevatorT += Math.sign(diff) * Math.min(Math.abs(diff), ELEVATOR_OPEN_SPEED * delta);
                const offset = this._elevatorT * 1.3;
                this._elevatorLeft.position.x = -0.62 - offset;
                this._elevatorRight.position.x = 0.62 + offset;
            }
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Toggle the directory board visibility with a subtle glow effect.
     */
    showDirectory() {
        this._directoryVisible = !this._directoryVisible;
        if (this._directoryBoard) {
            this._directoryBoard.material.emissiveIntensity = this._directoryVisible ? 0.8 : 0.3;
        }
        eventBus.emit('lobby:directory', { visible: this._directoryVisible });
    }

    /**
     * Open or close the elevator doors.
     * @param {boolean} open
     */
    setElevatorOpen(open) {
        this._elevatorOpen = open;
        eventBus.emit('lobby:elevator', { open });
    }
}

export default Lobby;
