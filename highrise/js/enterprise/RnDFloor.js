/**
 * RnDFloor.js - Floor 17: Innovation Lab / R&D
 * The Highrise 3D Command Center
 *
 * Cutting-edge research and development lab featuring:
 * - Translucent prototype pods with glowing objects inside
 * - Central holographic wireframe polyhedron display
 * - Lab benches with beakers and instruments
 * - Whiteboard with grid texture
 * - 3D printer that gradually materializes objects
 * - Innovation meter with particle-like rising bars
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLOOR_WIDTH = 20;
const FLOOR_DEPTH = 14;
const FLOOR_HEIGHT = 4;

const POD_RADIUS = 1.0;
const POD_COUNT = 4;
const HOLO_RADIUS = 0.7;
const HOLO_SPEED = 0.6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _makeLabelSprite(text, position, scale = 1, color = '#88ccff') {
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

// ---------------------------------------------------------------------------
// RnDFloor Class
// ---------------------------------------------------------------------------

export class RnDFloor {
    constructor() {
        /** @type {THREE.Group|null} */
        this.group = null;

        /** @type {{ dome: THREE.Mesh, inner: THREE.Mesh, label: THREE.Sprite, name: string }[]} */
        this._pods = [];

        /** @type {THREE.Mesh|null} */
        this._hologram = null;

        /** @type {{ mesh: THREE.Mesh, targetY: number, currentY: number }[]} */
        this._printerLayers = [];
        this._printerTimer = 0;
        this._printerLayerIndex = 0;

        /** @type {THREE.Mesh[]} - innovation meter bar segments */
        this._meterBars = [];
        this._innovationLevel = 0.0; // 0 to 1

        this._elapsed = 0;
    }

    // -----------------------------------------------------------------------
    // create
    // -----------------------------------------------------------------------

    create(parentGroup) {
        this.group = new THREE.Group();
        this.group.name = 'RnD_Floor17';

        this._createFloorBase();
        this._createPrototypePods();
        this._createHolographicDisplay();
        this._createLabBenches();
        this._createWhiteboard();
        this._create3DPrinter();
        this._createInnovationMeter();
        this._createLighting();

        parentGroup.add(this.group);

        eventBus.emit('floor:created', { floor: 17, name: 'R&D' });

        return this.group;
    }

    // -----------------------------------------------------------------------
    // Geometry builders (private)
    // -----------------------------------------------------------------------

    _createFloorBase() {
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(FLOOR_WIDTH, 0.15, FLOOR_DEPTH),
            new THREE.MeshStandardMaterial({ color: 0x10101e, roughness: 0.3, metalness: 0.4 })
        );
        floor.receiveShadow = true;
        this.group.add(floor);

        const ceiling = new THREE.Mesh(
            new THREE.BoxGeometry(FLOOR_WIDTH, 0.1, FLOOR_DEPTH),
            new THREE.MeshStandardMaterial({ color: 0x0c0c16, roughness: 0.8 })
        );
        ceiling.position.y = FLOOR_HEIGHT;
        this.group.add(ceiling);

        // Tech-floor grid lines
        const gridMat = new THREE.MeshStandardMaterial({
            color: 0x224466,
            emissive: 0x112233,
            emissiveIntensity: 0.3,
        });
        for (let i = -8; i <= 8; i += 2) {
            const line = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.02, FLOOR_DEPTH - 1),
                gridMat
            );
            line.position.set(i, 0.09, 0);
            this.group.add(line);
        }
        for (let j = -5; j <= 5; j += 2) {
            const line = new THREE.Mesh(
                new THREE.BoxGeometry(FLOOR_WIDTH - 1, 0.02, 0.02),
                gridMat
            );
            line.position.set(0, 0.09, j);
            this.group.add(line);
        }
    }

    _createPrototypePods() {
        const podPositions = [
            { x: -6, z: -3, name: 'Alpha' },
            { x: -6, z: 3, name: 'Beta' },
            { x: 6, z: -3, name: 'Gamma' },
            { x: 6, z: 3, name: 'Delta' },
        ];

        const innerGeometries = [
            new THREE.TetrahedronGeometry(0.35, 0),
            new THREE.OctahedronGeometry(0.3, 0),
            new THREE.DodecahedronGeometry(0.3, 0),
            new THREE.IcosahedronGeometry(0.3, 0),
        ];

        const innerColors = [0xff4488, 0x44ff88, 0x4488ff, 0xffaa44];

        for (let i = 0; i < POD_COUNT; i++) {
            const pos = podPositions[i];

            // Translucent dome
            const domeGeo = new THREE.SphereGeometry(POD_RADIUS, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
            const domeMat = new THREE.MeshStandardMaterial({
                color: 0x88aacc,
                transparent: true,
                opacity: 0.15,
                side: THREE.DoubleSide,
                roughness: 0.1,
                metalness: 0.2,
            });
            const dome = new THREE.Mesh(domeGeo, domeMat);
            dome.position.set(pos.x, 0.1, pos.z);
            this.group.add(dome);

            // Glowing inner object
            const innerMat = new THREE.MeshStandardMaterial({
                color: innerColors[i],
                emissive: innerColors[i],
                emissiveIntensity: 0.6,
                wireframe: true,
            });
            const inner = new THREE.Mesh(innerGeometries[i], innerMat);
            inner.position.set(pos.x, 0.6, pos.z);
            this.group.add(inner);

            // Pod base ring
            const baseGeo = new THREE.TorusGeometry(POD_RADIUS, 0.04, 8, 24);
            const baseMat = new THREE.MeshStandardMaterial({
                color: 0x446688,
                emissive: 0x223344,
                emissiveIntensity: 0.4,
                metalness: 0.8,
            });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.set(pos.x, 0.1, pos.z);
            base.rotation.x = Math.PI / 2;
            this.group.add(base);

            // Pod point light
            const podLight = new THREE.PointLight(innerColors[i], 0.4, 3);
            podLight.position.set(pos.x, 0.8, pos.z);
            this.group.add(podLight);

            // Label
            const label = _makeLabelSprite(
                `Pod ${pos.name}`,
                new THREE.Vector3(pos.x, 1.4, pos.z),
                0.4
            );
            this.group.add(label);

            this._pods.push({ dome, inner, label, name: pos.name });
        }
    }

    _createHolographicDisplay() {
        // Central wireframe polyhedron
        const holoGeo = new THREE.OctahedronGeometry(HOLO_RADIUS, 1);
        const holoMat = new THREE.MeshStandardMaterial({
            color: 0x4488ff,
            emissive: 0x2244aa,
            emissiveIntensity: 0.8,
            wireframe: true,
        });
        this._hologram = new THREE.Mesh(holoGeo, holoMat);
        this._hologram.position.set(0, 2.2, 0);
        this.group.add(this._hologram);

        // Hologram pedestal
        const pedestalGeo = new THREE.CylinderGeometry(0.6, 0.8, 0.15, 16);
        const pedestalMat = new THREE.MeshStandardMaterial({
            color: 0x1a2244,
            emissive: 0x112244,
            emissiveIntensity: 0.3,
            metalness: 0.7,
        });
        const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
        pedestal.position.set(0, 0.9, 0);
        this.group.add(pedestal);

        // Beam column from pedestal to hologram
        const beamGeo = new THREE.CylinderGeometry(0.02, 0.15, 1.2, 8);
        const beamMat = new THREE.MeshStandardMaterial({
            color: 0x4488ff,
            emissive: 0x2244aa,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.25,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(0, 1.55, 0);
        this.group.add(beam);

        // Hologram point light
        const holoLight = new THREE.PointLight(0x4488ff, 0.6, 5);
        holoLight.position.set(0, 2.2, 0);
        this.group.add(holoLight);
    }

    _createLabBenches() {
        const benchMat = new THREE.MeshStandardMaterial({
            color: 0x2a2a3a,
            roughness: 0.4,
            metalness: 0.5,
        });

        const benchConfigs = [
            { x: -3, z: 0, rot: 0 },
            { x: 3, z: 0, rot: 0 },
        ];

        for (const cfg of benchConfigs) {
            const bench = new THREE.Group();

            // Table top
            const top = new THREE.Mesh(
                new THREE.BoxGeometry(3, 0.08, 1.2),
                benchMat
            );
            top.position.y = 0.9;
            bench.add(top);

            // Legs
            const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85, 6);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.7 });
            const legOffsets = [
                { x: -1.3, z: -0.5 }, { x: 1.3, z: -0.5 },
                { x: -1.3, z: 0.5 }, { x: 1.3, z: 0.5 },
            ];
            for (const lo of legOffsets) {
                const leg = new THREE.Mesh(legGeo, legMat);
                leg.position.set(lo.x, 0.45, lo.z);
                bench.add(leg);
            }

            // Beaker (cylinder)
            const beakerGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.25, 8, 1, true);
            const beakerMat = new THREE.MeshStandardMaterial({
                color: 0x88bbdd,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide,
            });
            for (let b = 0; b < 3; b++) {
                const beaker = new THREE.Mesh(beakerGeo, beakerMat);
                beaker.position.set(-0.8 + b * 0.4, 1.06, -0.2);
                bench.add(beaker);

                // Liquid inside
                const liquidGeo = new THREE.CylinderGeometry(0.065, 0.05, 0.12 + Math.random() * 0.1, 8);
                const liquidColor = [0x22ff88, 0xff8844, 0x4488ff][b];
                const liquidMat = new THREE.MeshStandardMaterial({
                    color: liquidColor,
                    emissive: liquidColor,
                    emissiveIntensity: 0.4,
                    transparent: true,
                    opacity: 0.6,
                });
                const liquid = new THREE.Mesh(liquidGeo, liquidMat);
                liquid.position.set(-0.8 + b * 0.4, 1.0, -0.2);
                bench.add(liquid);
            }

            // Box instruments
            const instMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.6 });
            const inst1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.3), instMat);
            inst1.position.set(0.6, 0.98, 0.2);
            bench.add(inst1);

            const inst2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.25), instMat);
            inst2.position.set(1.0, 1.0, -0.1);
            bench.add(inst2);

            bench.position.set(cfg.x, 0, cfg.z);
            bench.rotation.y = cfg.rot;
            this.group.add(bench);
        }
    }

    _createWhiteboard() {
        // Create grid texture for whiteboard
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = '#e8e8ee';
        ctx.fillRect(0, 0, 512, 384);

        // Grid lines
        ctx.strokeStyle = '#c0c0d0';
        ctx.lineWidth = 1;
        for (let x = 0; x <= 512; x += 32) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 384);
            ctx.stroke();
        }
        for (let y = 0; y <= 384; y += 32) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(512, y);
            ctx.stroke();
        }

        // Some "writing" marks
        ctx.strokeStyle = '#2244aa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(200, 150, 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(260, 150);
        ctx.lineTo(350, 100);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(260, 150);
        ctx.lineTo(350, 200);
        ctx.stroke();

        ctx.fillStyle = '#cc3322';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('INNOVATION ROADMAP', 120, 40);

        const tex = new THREE.CanvasTexture(canvas);

        const boardGeo = new THREE.PlaneGeometry(4, 3);
        const boardMat = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.9,
        });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.set(0, 2.2, -FLOOR_DEPTH / 2 + 0.15);
        this.group.add(board);

        // Frame
        const frameGeo = new THREE.BoxGeometry(4.15, 3.15, 0.06);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 2.2, -FLOOR_DEPTH / 2 + 0.1);
        this.group.add(frame);
    }

    _create3DPrinter() {
        const printerGroup = new THREE.Group();
        printerGroup.position.set(7, 0, -3);

        // Printer body (box frame)
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.6 });

        // Four vertical corner posts
        const postGeo = new THREE.BoxGeometry(0.08, 1.2, 0.08);
        const corners = [
            { x: -0.5, z: -0.5 }, { x: 0.5, z: -0.5 },
            { x: -0.5, z: 0.5 }, { x: 0.5, z: 0.5 },
        ];
        for (const c of corners) {
            const post = new THREE.Mesh(postGeo, frameMat);
            post.position.set(c.x, 0.7, c.z);
            printerGroup.add(post);
        }

        // Print bed
        const bedGeo = new THREE.BoxGeometry(1.0, 0.04, 1.0);
        const bedMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            emissive: 0x111122,
            emissiveIntensity: 0.2,
        });
        const bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.y = 0.15;
        printerGroup.add(bed);

        // Printing layers (appear gradually)
        const layerCount = 8;
        const layerHeight = 0.06;
        for (let i = 0; i < layerCount; i++) {
            const size = 0.4 - i * 0.02;
            const layerGeo = new THREE.BoxGeometry(size, layerHeight, size);
            const layerMat = new THREE.MeshStandardMaterial({
                color: 0x44aaff,
                emissive: 0x2266aa,
                emissiveIntensity: 0.4,
                transparent: true,
                opacity: 0,
            });
            const layer = new THREE.Mesh(layerGeo, layerMat);
            layer.position.y = 0.19 + i * layerHeight;
            printerGroup.add(layer);
            this._printerLayers.push({
                mesh: layer,
                targetY: 0.19 + i * layerHeight,
                currentY: 0.19 + i * layerHeight,
            });
        }

        // Nozzle
        const nozzleGeo = new THREE.CylinderGeometry(0.02, 0.01, 0.1, 6);
        const nozzleMat = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            emissive: 0xff6600,
            emissiveIntensity: 0.3,
            metalness: 0.9,
        });
        const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
        nozzle.position.set(0, 1.25, 0);
        printerGroup.add(nozzle);

        this.group.add(printerGroup);

        // Label
        const label = _makeLabelSprite(
            '3D PRINTER',
            new THREE.Vector3(7, 1.6, -3),
            0.4
        );
        this.group.add(label);
    }

    _createInnovationMeter() {
        const meterGroup = new THREE.Group();
        meterGroup.position.set(-FLOOR_WIDTH / 2 + 1.0, 0, 0);

        // Back panel
        const panelGeo = new THREE.BoxGeometry(0.1, 3.0, 1.0);
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.5 });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.y = 1.8;
        meterGroup.add(panel);

        // Meter bar segments
        const segCount = 12;
        const segHeight = 0.18;
        const segGap = 0.04;

        for (let i = 0; i < segCount; i++) {
            const t = i / segCount;
            const hue = 0.33 - t * 0.33; // green to red
            const color = new THREE.Color().setHSL(hue, 0.8, 0.4);

            const segGeo = new THREE.BoxGeometry(0.06, segHeight, 0.6);
            const segMat = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.1,
            });
            const seg = new THREE.Mesh(segGeo, segMat);
            seg.position.set(0.06, 0.5 + i * (segHeight + segGap), 0);
            meterGroup.add(seg);
            this._meterBars.push(seg);
        }

        this.group.add(meterGroup);

        // Label
        const label = _makeLabelSprite(
            'INNOVATION',
            new THREE.Vector3(-FLOOR_WIDTH / 2 + 1.0, 3.5, 0),
            0.4
        );
        this.group.add(label);
    }

    _createLighting() {
        // Central blue glow
        const blueLight = new THREE.PointLight(0x4488ff, 0.5, 10);
        blueLight.position.set(0, 3, 0);
        this.group.add(blueLight);

        // Lab bench warm lights
        const warmLeft = new THREE.PointLight(0xddaa66, 0.3, 6);
        warmLeft.position.set(-3, 2.5, 0);
        this.group.add(warmLeft);

        const warmRight = new THREE.PointLight(0xddaa66, 0.3, 6);
        warmRight.position.set(3, 2.5, 0);
        this.group.add(warmRight);
    }

    // -----------------------------------------------------------------------
    // update
    // -----------------------------------------------------------------------

    update(delta) {
        this._elapsed += delta;

        // Rotate holographic display
        if (this._hologram) {
            this._hologram.rotation.y += HOLO_SPEED * delta;
            this._hologram.rotation.x += HOLO_SPEED * 0.3 * delta;
            // Subtle bobbing
            this._hologram.position.y = 2.2 + Math.sin(this._elapsed * 1.2) * 0.08;
        }

        // Rotate pod inner objects
        for (let i = 0; i < this._pods.length; i++) {
            const pod = this._pods[i];
            pod.inner.rotation.y += delta * (0.5 + i * 0.15);
            pod.inner.rotation.x += delta * 0.2;
            // Pulse glow
            const pulse = 0.4 + Math.sin(this._elapsed * 2 + i * 1.5) * 0.25;
            pod.inner.material.emissiveIntensity = pulse;
        }

        // 3D printer layer animation
        this._printerTimer += delta;
        if (this._printerTimer > 1.5) {
            this._printerTimer = 0;
            if (this._printerLayerIndex < this._printerLayers.length) {
                const layer = this._printerLayers[this._printerLayerIndex];
                layer.mesh.material.opacity = 0.8;
                this._printerLayerIndex++;
            } else {
                // Reset: hide all layers and start over
                for (const layer of this._printerLayers) {
                    layer.mesh.material.opacity = 0;
                }
                this._printerLayerIndex = 0;
            }
        }

        // Innovation meter animation
        const fillCount = Math.floor(this._innovationLevel * this._meterBars.length);
        for (let i = 0; i < this._meterBars.length; i++) {
            const bar = this._meterBars[i];
            if (i < fillCount) {
                bar.material.emissiveIntensity = 0.6 + Math.sin(this._elapsed * 3 + i * 0.5) * 0.2;
            } else {
                bar.material.emissiveIntensity = 0.05;
            }
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Add a named prototype to the next available pod.
     * @param {string} name
     */
    addPrototype(name) {
        const emptyPod = this._pods.find(p => p.name === name || !p._assigned);
        if (emptyPod) {
            emptyPod._assigned = true;
            emptyPod.name = name;

            // Flash the pod dome
            emptyPod.dome.material.opacity = 0.4;
            setTimeout(() => {
                emptyPod.dome.material.opacity = 0.15;
            }, 800);

            // Increase innovation level
            this._innovationLevel = Math.min(1.0, this._innovationLevel + 0.15);

            eventBus.emit('rnd:prototypeAdded', { name });
        }
    }
}

export default RnDFloor;
