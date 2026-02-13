/**
 * TestBunker.js - Floor B1 (index -1): Secret R&D Basement
 * The Highrise 3D Command Center
 *
 * Underground testing facility featuring:
 * - Dark/moody lighting with focused spotlights
 * - Server racks with blinking LED dots
 * - Glass display cases with glowing prototype objects
 * - War room round table with holographic blue map
 * - Pulsing wireframe containment field
 * - Access terminal with single bright monitor
 * - Yellow/black caution tape perimeter
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLOOR_WIDTH = 28;
const FLOOR_DEPTH = 18;
const FLOOR_HEIGHT = 4;

const SERVER_RACK_COUNT = 6;
const LEDS_PER_RACK = 8;
const DISPLAY_CASE_COUNT = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _makeLabelSprite(text, position, scale = 1, color = '#ff8844') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 64);
    ctx.fillStyle = color;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(position);
    sprite.scale.set(3 * scale, 0.4 * scale, 1);
    return sprite;
}

function _makeHoloMapTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#020810';
    ctx.fillRect(0, 0, 512, 512);

    // Grid
    ctx.strokeStyle = '#0a2244';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 512; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
    }
    for (let y = 0; y <= 512; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    }

    // Tactical markers
    ctx.strokeStyle = '#2266cc';
    ctx.lineWidth = 2;

    // Circles for zones
    ctx.beginPath(); ctx.arc(256, 256, 100, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(256, 256, 180, 0, Math.PI * 2); ctx.stroke();

    // Cross hairs
    ctx.beginPath(); ctx.moveTo(256, 56); ctx.lineTo(256, 456); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(56, 256); ctx.lineTo(456, 256); ctx.stroke();

    // Blips
    ctx.fillStyle = '#44aaff';
    const blips = [
        { x: 180, y: 200 }, { x: 320, y: 150 }, { x: 280, y: 330 },
        { x: 150, y: 350 }, { x: 370, y: 280 },
    ];
    for (const b of blips) {
        ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
    }

    // Label
    ctx.fillStyle = '#4488cc';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('TACTICAL OVERVIEW', 200, 30);

    return new THREE.CanvasTexture(canvas);
}

// ---------------------------------------------------------------------------
// TestBunker Class
// ---------------------------------------------------------------------------

export class TestBunker {
    constructor() {
        /** @type {THREE.Group|null} */
        this.group = null;

        /** @type {{ mesh: THREE.Mesh, on: boolean, timer: number }[]} */
        this._leds = [];

        /** @type {{ case: THREE.Mesh, inner: THREE.Mesh, name: string }[]} */
        this._displayCases = [];

        /** @type {THREE.Mesh|null} */
        this._containmentField = null;
        this._containmentPulse = 0;

        /** @type {THREE.Mesh|null} */
        this._holoMap = null;

        /** @type {THREE.Mesh|null} */
        this._terminalScreen = null;

        /** @type {{ name: string, group: THREE.Group }[]} */
        this._experiments = [];

        this._elapsed = 0;
    }

    // -----------------------------------------------------------------------
    // create
    // -----------------------------------------------------------------------

    create(parentGroup) {
        this.group = new THREE.Group();
        this.group.name = 'TestBunker_FloorB1';

        this._createFloorBase();
        this._createMoodyLighting();
        this._createServerRacks();
        this._createDisplayCases();
        this._createWarRoomTable();
        this._createContainmentField();
        this._createAccessTerminal();
        this._createCautionTape();

        parentGroup.add(this.group);

        eventBus.emit('floor:created', { floor: -1, name: 'Test Bunker' });

        return this.group;
    }

    // -----------------------------------------------------------------------
    // Geometry builders (private)
    // -----------------------------------------------------------------------

    _createFloorBase() {
        // Dark concrete floor
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(FLOOR_WIDTH, 0.2, FLOOR_DEPTH),
            new THREE.MeshStandardMaterial({ color: 0x0a0a0e, roughness: 0.9, metalness: 0.1 })
        );
        floor.receiveShadow = true;
        this.group.add(floor);

        // Reinforced ceiling
        const ceiling = new THREE.Mesh(
            new THREE.BoxGeometry(FLOOR_WIDTH, 0.2, FLOOR_DEPTH),
            new THREE.MeshStandardMaterial({ color: 0x080810, roughness: 0.9 })
        );
        ceiling.position.y = FLOOR_HEIGHT;
        this.group.add(ceiling);

        // Exposed pipe on ceiling
        const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, FLOOR_WIDTH - 2, 8);
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.7, roughness: 0.3 });
        const pipe = new THREE.Mesh(pipeGeo, pipeMat);
        pipe.position.set(0, FLOOR_HEIGHT - 0.3, -3);
        pipe.rotation.z = Math.PI / 2;
        this.group.add(pipe);

        const pipe2 = new THREE.Mesh(pipeGeo.clone(), pipeMat);
        pipe2.position.set(0, FLOOR_HEIGHT - 0.3, 3);
        pipe2.rotation.z = Math.PI / 2;
        this.group.add(pipe2);
    }

    _createMoodyLighting() {
        // Very dim ambient
        const dimAmbient = new THREE.PointLight(0x111122, 0.15, 20);
        dimAmbient.position.set(0, 3.5, 0);
        this.group.add(dimAmbient);

        // Focused spotlights
        const spots = [
            { x: -5, z: 0, color: 0xff6633, target: { x: -5, z: 0 } },
            { x: 5, z: 0, color: 0x3366ff, target: { x: 5, z: 0 } },
            { x: 0, z: -3, color: 0xffaa22, target: { x: 0, z: -3 } },
            { x: 0, z: 3, color: 0x22ffaa, target: { x: 0, z: 3 } },
        ];

        for (const s of spots) {
            const spot = new THREE.SpotLight(s.color, 0.4, 8, Math.PI / 5, 0.5);
            spot.position.set(s.x, FLOOR_HEIGHT - 0.4, s.z);
            spot.target.position.set(s.target.x, 0, s.target.z);
            spot.castShadow = true;
            this.group.add(spot);
            this.group.add(spot.target);
        }
    }

    _createServerRacks() {
        const rackMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a22,
            roughness: 0.4,
            metalness: 0.7,
        });

        for (let i = 0; i < SERVER_RACK_COUNT; i++) {
            const rackGroup = new THREE.Group();
            const x = -FLOOR_WIDTH / 2 + 1.5 + i * 1.4;

            // Rack body
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(1.0, 2.8, 0.8),
                rackMat
            );
            body.position.y = 1.5;
            body.castShadow = true;
            rackGroup.add(body);

            // Front panel divisions
            for (let row = 0; row < 5; row++) {
                const panel = new THREE.Mesh(
                    new THREE.BoxGeometry(0.92, 0.04, 0.01),
                    new THREE.MeshStandardMaterial({ color: 0x333340, metalness: 0.8 })
                );
                panel.position.set(0, 0.5 + row * 0.5, 0.41);
                rackGroup.add(panel);
            }

            // Blinking LEDs
            for (let led = 0; led < LEDS_PER_RACK; led++) {
                const ledGeo = new THREE.SphereGeometry(0.025, 4, 4);
                const on = Math.random() > 0.5;
                const ledColor = [0x00ff44, 0xff8800, 0x4488ff][Math.floor(Math.random() * 3)];
                const ledMat = new THREE.MeshStandardMaterial({
                    color: on ? ledColor : 0x111111,
                    emissive: on ? ledColor : 0x000000,
                    emissiveIntensity: on ? 0.9 : 0,
                });
                const ledMesh = new THREE.Mesh(ledGeo, ledMat);
                ledMesh.position.set(
                    -0.3 + (led % 4) * 0.2,
                    0.3 + Math.floor(led / 4) * 0.5 + Math.floor(led / 4) * 0.15,
                    0.42
                );
                rackGroup.add(ledMesh);
                this._leds.push({
                    mesh: ledMesh,
                    on,
                    timer: Math.random() * 3,
                    _baseColor: ledColor,
                });
            }

            rackGroup.position.set(x, 0, -FLOOR_DEPTH / 2 + 0.8);
            this.group.add(rackGroup);
        }
    }

    _createDisplayCases() {
        const casePositions = [
            { x: 5, z: -3 },
            { x: 7, z: -3 },
            { x: 6, z: -1 },
        ];

        const innerGeos = [
            new THREE.DodecahedronGeometry(0.25, 0),
            new THREE.TorusKnotGeometry(0.18, 0.06, 32, 8),
            new THREE.IcosahedronGeometry(0.25, 0),
        ];

        const innerColors = [0xff4444, 0x44ffaa, 0xaa44ff];

        for (let i = 0; i < DISPLAY_CASE_COUNT; i++) {
            const pos = casePositions[i];

            // Glass case (transparent box)
            const caseGeo = new THREE.BoxGeometry(0.8, 1.0, 0.8);
            const caseMat = new THREE.MeshStandardMaterial({
                color: 0x88aacc,
                transparent: true,
                opacity: 0.1,
                side: THREE.DoubleSide,
                roughness: 0.05,
                metalness: 0.1,
            });
            const caseMesh = new THREE.Mesh(caseGeo, caseMat);
            caseMesh.position.set(pos.x, 1.1, pos.z);
            this.group.add(caseMesh);

            // Base pedestal
            const baseMesh = new THREE.Mesh(
                new THREE.BoxGeometry(0.9, 0.15, 0.9),
                new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.6 })
            );
            baseMesh.position.set(pos.x, 0.55, pos.z);
            this.group.add(baseMesh);

            // Glowing inner object
            const innerMat = new THREE.MeshStandardMaterial({
                color: innerColors[i],
                emissive: innerColors[i],
                emissiveIntensity: 0.7,
            });
            const inner = new THREE.Mesh(innerGeos[i], innerMat);
            inner.position.set(pos.x, 1.1, pos.z);
            this.group.add(inner);

            // Small point light
            const caseLight = new THREE.PointLight(innerColors[i], 0.3, 2);
            caseLight.position.set(pos.x, 1.3, pos.z);
            this.group.add(caseLight);

            this._displayCases.push({
                case: caseMesh,
                inner,
                name: `Specimen_${i + 1}`,
            });
        }
    }

    _createWarRoomTable() {
        // Round table
        const tableGeo = new THREE.CylinderGeometry(2.0, 2.0, 0.1, 24);
        const tableMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a28,
            roughness: 0.3,
            metalness: 0.6,
        });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(0, 0.85, 2);
        table.castShadow = true;
        this.group.add(table);

        // Central pedestal leg
        const legGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.75, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.7 });
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(0, 0.45, 2);
        this.group.add(leg);

        // Holographic map on table surface
        const mapTex = _makeHoloMapTexture();
        const mapGeo = new THREE.PlaneGeometry(3.2, 3.2);
        const mapMat = new THREE.MeshStandardMaterial({
            map: mapTex,
            emissive: 0x1144aa,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.85,
        });
        this._holoMap = new THREE.Mesh(mapGeo, mapMat);
        this._holoMap.rotation.x = -Math.PI / 2;
        this._holoMap.position.set(0, 0.92, 2);
        this.group.add(this._holoMap);

        // Map glow
        const mapLight = new THREE.PointLight(0x2266cc, 0.4, 4);
        mapLight.position.set(0, 1.3, 2);
        this.group.add(mapLight);
    }

    _createContainmentField() {
        // Wireframe box around experiment area
        const fieldGeo = new THREE.BoxGeometry(3, 2.5, 3);
        const fieldMat = new THREE.MeshBasicMaterial({
            color: 0xff6622,
            wireframe: true,
            transparent: true,
            opacity: 0.3,
        });
        this._containmentField = new THREE.Mesh(fieldGeo, fieldMat);
        this._containmentField.position.set(-5, 1.35, 3);
        this.group.add(this._containmentField);

        // Corner marker spheres
        const cornerGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const cornerMat = new THREE.MeshStandardMaterial({
            color: 0xff8833,
            emissive: 0xff6622,
            emissiveIntensity: 0.8,
        });
        const halfW = 1.5, halfH = 1.25, halfD = 1.5;
        const offsets = [
            [-halfW, -halfH, -halfD], [halfW, -halfH, -halfD],
            [-halfW, halfH, -halfD], [halfW, halfH, -halfD],
            [-halfW, -halfH, halfD], [halfW, -halfH, halfD],
            [-halfW, halfH, halfD], [halfW, halfH, halfD],
        ];
        for (const [ox, oy, oz] of offsets) {
            const corner = new THREE.Mesh(cornerGeo, cornerMat);
            corner.position.set(-5 + ox, 1.35 + oy, 3 + oz);
            this.group.add(corner);
        }

        // Warning label
        const label = _makeLabelSprite(
            'CONTAINMENT ACTIVE',
            new THREE.Vector3(-5, 3.0, 3),
            0.45,
            '#ff6622'
        );
        this.group.add(label);
    }

    _createAccessTerminal() {
        // Desk
        const deskGeo = new THREE.BoxGeometry(1.5, 0.8, 0.8);
        const deskMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a28,
            roughness: 0.4,
            metalness: 0.6,
        });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(FLOOR_WIDTH / 2 - 2, 0.5, 3);
        desk.castShadow = true;
        this.group.add(desk);

        // Single bright monitor
        const screenGeo = new THREE.PlaneGeometry(1.0, 0.7);
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x22ff88,
            emissive: 0x11cc44,
            emissiveIntensity: 0.9,
        });
        this._terminalScreen = new THREE.Mesh(screenGeo, screenMat);
        this._terminalScreen.position.set(FLOOR_WIDTH / 2 - 2, 1.3, 2.7);
        this._terminalScreen.rotation.x = -0.1;
        this.group.add(this._terminalScreen);

        // Screen frame
        const frameGeo = new THREE.BoxGeometry(1.1, 0.8, 0.04);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.7 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(FLOOR_WIDTH / 2 - 2, 1.3, 2.66);
        this.group.add(frame);

        // Terminal glow
        const termLight = new THREE.PointLight(0x22ff88, 0.5, 3);
        termLight.position.set(FLOOR_WIDTH / 2 - 2, 1.5, 3.5);
        this.group.add(termLight);

        // Keyboard
        const kbGeo = new THREE.BoxGeometry(0.8, 0.03, 0.3);
        const kbMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.5 });
        const kb = new THREE.Mesh(kbGeo, kbMat);
        kb.position.set(FLOOR_WIDTH / 2 - 2, 0.92, 3.2);
        this.group.add(kb);
    }

    _createCautionTape() {
        // Yellow/black striped caution tape segments around the perimeter
        const stripeMat = this._makeCautionStripeMaterial();

        const halfW = FLOOR_WIDTH / 2 - 0.3;
        const halfD = FLOOR_DEPTH / 2 - 0.3;
        const tapeY = 0.5;
        const tapeHeight = 0.08;

        // Four wall segments
        const segments = [
            { from: new THREE.Vector3(-halfW, tapeY, -halfD), to: new THREE.Vector3(halfW, tapeY, -halfD) },
            { from: new THREE.Vector3(halfW, tapeY, -halfD), to: new THREE.Vector3(halfW, tapeY, halfD) },
            { from: new THREE.Vector3(halfW, tapeY, halfD), to: new THREE.Vector3(-halfW, tapeY, halfD) },
            { from: new THREE.Vector3(-halfW, tapeY, halfD), to: new THREE.Vector3(-halfW, tapeY, -halfD) },
        ];

        for (const seg of segments) {
            const dir = new THREE.Vector3().subVectors(seg.to, seg.from);
            const length = dir.length();
            const mid = new THREE.Vector3().addVectors(seg.from, seg.to).multiplyScalar(0.5);

            const tapeGeo = new THREE.BoxGeometry(length, tapeHeight, 0.02);
            const tape = new THREE.Mesh(tapeGeo, stripeMat);
            tape.position.copy(mid);
            tape.lookAt(seg.to.x, mid.y, seg.to.z);
            this.group.add(tape);
        }
    }

    _makeCautionStripeMaterial() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');

        // Yellow/black diagonal stripes
        ctx.fillStyle = '#ccaa00';
        ctx.fillRect(0, 0, 128, 16);

        ctx.fillStyle = '#111111';
        for (let x = -16; x < 144; x += 24) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + 12, 0);
            ctx.lineTo(x + 12 + 16, 16);
            ctx.lineTo(x + 16, 16);
            ctx.closePath();
            ctx.fill();
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(8, 1);

        return new THREE.MeshStandardMaterial({
            map: tex,
            emissive: 0x332200,
            emissiveIntensity: 0.2,
            roughness: 0.8,
        });
    }

    // -----------------------------------------------------------------------
    // update
    // -----------------------------------------------------------------------

    update(delta) {
        this._elapsed += delta;

        // Blink server LEDs
        for (const led of this._leds) {
            led.timer -= delta;
            if (led.timer <= 0) {
                led.on = !led.on;
                led.timer = 0.5 + Math.random() * 2.5;
                if (led.on) {
                    led.mesh.material.color.setHex(led._baseColor);
                    led.mesh.material.emissive.setHex(led._baseColor);
                    led.mesh.material.emissiveIntensity = 0.9;
                } else {
                    led.mesh.material.color.setHex(0x111111);
                    led.mesh.material.emissive.setHex(0x000000);
                    led.mesh.material.emissiveIntensity = 0;
                }
            }
        }

        // Rotate display case inner objects
        for (let i = 0; i < this._displayCases.length; i++) {
            const dc = this._displayCases[i];
            dc.inner.rotation.y += delta * (0.6 + i * 0.2);
            dc.inner.rotation.x += delta * 0.15;
            // Pulse glow
            dc.inner.material.emissiveIntensity = 0.5 + Math.sin(this._elapsed * 2.5 + i) * 0.25;
        }

        // Pulse containment field
        if (this._containmentField) {
            this._containmentPulse += delta * 2;
            const opacity = 0.15 + Math.sin(this._containmentPulse) * 0.15;
            this._containmentField.material.opacity = Math.max(0.05, opacity);
        }

        // Holographic map subtle glow pulse
        if (this._holoMap) {
            this._holoMap.material.emissiveIntensity = 0.3 + Math.sin(this._elapsed * 1.2) * 0.15;
        }

        // Terminal screen flicker
        if (this._terminalScreen) {
            const flicker = Math.random() > 0.97 ? 0.3 : 0;
            this._terminalScreen.material.emissiveIntensity = 0.8 + Math.sin(this._elapsed * 4) * 0.1 - flicker;
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Add a named experiment to the containment zone.
     * @param {string} name
     */
    addExperiment(name) {
        // Create a small marker object inside the containment field
        const markerGeo = new THREE.OctahedronGeometry(0.15, 0);
        const markerMat = new THREE.MeshStandardMaterial({
            color: 0xff8844,
            emissive: 0xcc6622,
            emissiveIntensity: 0.6,
            wireframe: true,
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);

        const offset = this._experiments.length;
        marker.position.set(
            -5 + (offset % 3 - 1) * 0.6,
            0.8 + Math.floor(offset / 3) * 0.5,
            3 + (offset % 2 === 0 ? -0.3 : 0.3)
        );

        const expGroup = new THREE.Group();
        expGroup.add(marker);

        const label = _makeLabelSprite(
            name,
            new THREE.Vector3(0, 0.3, 0),
            0.25,
            '#ffaa44'
        );
        expGroup.add(label);
        expGroup.position.copy(marker.position);
        marker.position.set(0, 0, 0);

        this.group.add(expGroup);
        this._experiments.push({ name, group: expGroup });

        // Intensify containment field
        if (this._containmentField) {
            this._containmentField.material.color.setHex(
                this._experiments.length > 3 ? 0xff2200 : 0xff6622
            );
        }

        eventBus.emit('bunker:experimentAdded', { name, total: this._experiments.length });
    }
}

export default TestBunker;
