/**
 * PowerStation.js - Floor B2 (index -2): System Resource Monitoring
 * The Highrise 3D Command Center
 *
 * Underground power facility split into two halves:
 * - LEFT: Local system gauges (CPU, RAM, GPU, Storage)
 * - RIGHT: Server system gauges (CPU, RAM, Bandwidth, Storage)
 *
 * Each gauge features:
 * - Base disk, fill bar that scales with percentage
 * - Color coding: Green (<60%), Yellow (60-85%), Red (>85%)
 * - Label and percentage text sprites
 *
 * Additional features:
 * - Generator cylinders with spinning torus elements
 * - Power cables (tubes) curving upward to towers
 * - Warning lights that activate when any gauge exceeds 85%
 * - Humming animation on generator objects
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLOOR_WIDTH = 28;
const FLOOR_DEPTH = 18;
const FLOOR_HEIGHT = 4;

const GAUGE_SPACING = 2.5;
const GAUGE_MAX_HEIGHT = 2.5;
const GAUGE_WIDTH = 0.6;
const GAUGE_BASE_RADIUS = 0.7;

const COLOR_GREEN = 0x22cc44;
const COLOR_YELLOW = 0xddaa22;
const COLOR_RED = 0xdd2222;

const EMISSIVE_GREEN = 0x116622;
const EMISSIVE_YELLOW = 0x665511;
const EMISSIVE_RED = 0x661111;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _makeLabelSprite(text, position, scale = 1, color = '#88ddff') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = color;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(position);
    sprite.scale.set(2 * scale, 0.35 * scale, 1);
    return sprite;
}

function _makePercentSprite(pct, position) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 64);

    const color = pct < 60 ? '#22cc44' : pct < 85 ? '#ddaa22' : '#dd2222';
    ctx.fillStyle = color;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(pct)}%`, 64, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(position);
    sprite.scale.set(1.2, 0.35, 1);
    return sprite;
}

function _getGaugeColor(pct) {
    if (pct < 60) return { color: COLOR_GREEN, emissive: EMISSIVE_GREEN };
    if (pct < 85) return { color: COLOR_YELLOW, emissive: EMISSIVE_YELLOW };
    return { color: COLOR_RED, emissive: EMISSIVE_RED };
}

// ---------------------------------------------------------------------------
// PowerStation Class
// ---------------------------------------------------------------------------

export class PowerStation {
    constructor() {
        /** @type {THREE.Group|null} */
        this.group = null;

        /**
         * Gauge data indexed by side then type.
         * @type {Record<string, Record<string, {
         *   bar: THREE.Mesh,
         *   pctSprite: THREE.Sprite,
         *   percentage: number,
         *   warningLight: THREE.Mesh
         * }>>}
         */
        this._gauges = {
            local: {},
            server: {},
        };

        /** @type {{ mesh: THREE.Mesh, torus: THREE.Mesh, baseY: number }[]} */
        this._generators = [];

        /** @type {THREE.Mesh[]} */
        this._warningLights = [];

        this._elapsed = 0;
    }

    // -----------------------------------------------------------------------
    // create
    // -----------------------------------------------------------------------

    create(parentGroup) {
        this.group = new THREE.Group();
        this.group.name = 'PowerStation_FloorB2';

        this._createFloorBase();
        this._createLighting();
        this._createGauges('local', -1, ['CPU', 'RAM', 'GPU', 'Storage']);
        this._createGauges('server', 1, ['CPU', 'RAM', 'Bandwidth', 'Storage']);
        this._createDividerLine();
        this._createGenerators();
        this._createPowerCables();
        this._createWarningLights();
        this._createSectionLabels();

        parentGroup.add(this.group);

        eventBus.emit('floor:created', { floor: -2, name: 'Power Station' });

        return this.group;
    }

    // -----------------------------------------------------------------------
    // Geometry builders (private)
    // -----------------------------------------------------------------------

    _createFloorBase() {
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(FLOOR_WIDTH, 0.2, FLOOR_DEPTH),
            new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9, metalness: 0.2 })
        );
        floor.receiveShadow = true;
        this.group.add(floor);

        const ceiling = new THREE.Mesh(
            new THREE.BoxGeometry(FLOOR_WIDTH, 0.2, FLOOR_DEPTH),
            new THREE.MeshStandardMaterial({ color: 0x060608, roughness: 0.9 })
        );
        ceiling.position.y = FLOOR_HEIGHT;
        this.group.add(ceiling);

        // Metal grating floor texture
        const grateGeo = new THREE.PlaneGeometry(FLOOR_WIDTH - 1, FLOOR_DEPTH - 1);
        const grateMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a22,
            roughness: 0.7,
            metalness: 0.5,
            wireframe: true,
        });
        const grate = new THREE.Mesh(grateGeo, grateMat);
        grate.rotation.x = -Math.PI / 2;
        grate.position.y = 0.12;
        this.group.add(grate);
    }

    _createLighting() {
        // Dim industrial lighting
        const mainLight = new THREE.PointLight(0x334466, 0.3, 18);
        mainLight.position.set(0, 3.5, 0);
        this.group.add(mainLight);

        // Colored accent lights per side
        const leftLight = new THREE.PointLight(0x2266cc, 0.25, 12);
        leftLight.position.set(-5, 3, 0);
        this.group.add(leftLight);

        const rightLight = new THREE.PointLight(0xcc6622, 0.25, 12);
        rightLight.position.set(5, 3, 0);
        this.group.add(rightLight);
    }

    /**
     * Create a row of 4 gauge meters on one side.
     * @param {'local'|'server'} side
     * @param {number} xSign - -1 for left, +1 for right
     * @param {string[]} types
     */
    _createGauges(side, xSign, types) {
        const startX = xSign * 2.0;
        const offsetStep = xSign * GAUGE_SPACING;

        for (let i = 0; i < types.length; i++) {
            const type = types[i];
            const x = startX + i * offsetStep;
            const z = -1;
            const pct = 20 + Math.random() * 40; // start with some baseline

            // Base disk
            const baseGeo = new THREE.CylinderGeometry(GAUGE_BASE_RADIUS, GAUGE_BASE_RADIUS, 0.08, 16);
            const baseMat = new THREE.MeshStandardMaterial({
                color: 0x222233,
                metalness: 0.7,
                roughness: 0.3,
            });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.set(x, 0.15, z);
            this.group.add(base);

            // Gauge background (dim outline)
            const bgGeo = new THREE.BoxGeometry(GAUGE_WIDTH, GAUGE_MAX_HEIGHT, GAUGE_WIDTH);
            const bgMat = new THREE.MeshStandardMaterial({
                color: 0x111118,
                transparent: true,
                opacity: 0.3,
            });
            const bg = new THREE.Mesh(bgGeo, bgMat);
            bg.position.set(x, 0.2 + GAUGE_MAX_HEIGHT / 2, z);
            this.group.add(bg);

            // Fill bar
            const fillHeight = (pct / 100) * GAUGE_MAX_HEIGHT;
            const colors = _getGaugeColor(pct);
            const fillGeo = new THREE.BoxGeometry(GAUGE_WIDTH - 0.05, fillHeight || 0.01, GAUGE_WIDTH - 0.05);
            const fillMat = new THREE.MeshStandardMaterial({
                color: colors.color,
                emissive: colors.emissive,
                emissiveIntensity: 0.5,
            });
            const fillBar = new THREE.Mesh(fillGeo, fillMat);
            fillBar.position.set(x, 0.2 + fillHeight / 2, z);
            this.group.add(fillBar);

            // Label sprite (below gauge)
            const label = _makeLabelSprite(
                type.toUpperCase(),
                new THREE.Vector3(x, -0.15, z),
                0.5
            );
            this.group.add(label);

            // Percentage sprite (above gauge)
            const pctSprite = _makePercentSprite(
                pct,
                new THREE.Vector3(x, 0.3 + GAUGE_MAX_HEIGHT + 0.2, z)
            );
            this.group.add(pctSprite);

            // Individual warning light per gauge
            const warnGeo = new THREE.SphereGeometry(0.08, 8, 8);
            const warnMat = new THREE.MeshStandardMaterial({
                color: 0x331111,
                emissive: 0x110000,
                emissiveIntensity: 0.1,
            });
            const warn = new THREE.Mesh(warnGeo, warnMat);
            warn.position.set(x, 0.3 + GAUGE_MAX_HEIGHT + 0.5, z);
            this.group.add(warn);

            this._gauges[side][type] = {
                bar: fillBar,
                pctSprite,
                percentage: pct,
                warningLight: warn,
                _x: x,
                _z: z,
            };
        }
    }

    _createDividerLine() {
        // Center dividing line
        const divGeo = new THREE.BoxGeometry(0.04, 0.02, FLOOR_DEPTH - 2);
        const divMat = new THREE.MeshStandardMaterial({
            color: 0x446688,
            emissive: 0x223344,
            emissiveIntensity: 0.4,
        });
        const divider = new THREE.Mesh(divGeo, divMat);
        divider.position.set(0, 0.12, 0);
        this.group.add(divider);

        // Labels at top
        const localLabel = _makeLabelSprite(
            'LOCAL SYSTEM',
            new THREE.Vector3(-5, 3.5, -1),
            0.6,
            '#4488cc'
        );
        this.group.add(localLabel);

        const serverLabel = _makeLabelSprite(
            'SERVER SYSTEM',
            new THREE.Vector3(5, 3.5, -1),
            0.6,
            '#cc8844'
        );
        this.group.add(serverLabel);
    }

    _createGenerators() {
        const genPositions = [
            { x: -5, z: 4 },
            { x: 5, z: 4 },
        ];

        for (const pos of genPositions) {
            const genGroup = new THREE.Group();

            // Main cylinder body
            const bodyGeo = new THREE.CylinderGeometry(0.8, 0.9, 1.6, 16);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: 0x333344,
                roughness: 0.3,
                metalness: 0.8,
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = 0.9;
            body.castShadow = true;
            genGroup.add(body);

            // Spinning torus element
            const torusGeo = new THREE.TorusGeometry(0.6, 0.08, 8, 24);
            const torusMat = new THREE.MeshStandardMaterial({
                color: 0x44aaff,
                emissive: 0x2266cc,
                emissiveIntensity: 0.5,
                metalness: 0.6,
            });
            const torus = new THREE.Mesh(torusGeo, torusMat);
            torus.position.y = 1.0;
            genGroup.add(torus);

            // Second spinning torus (perpendicular)
            const torus2 = new THREE.Mesh(torusGeo.clone(), torusMat.clone());
            torus2.position.y = 1.0;
            torus2.rotation.x = Math.PI / 2;
            genGroup.add(torus2);

            // Top cap
            const capGeo = new THREE.CylinderGeometry(0.5, 0.8, 0.2, 16);
            const capMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.8 });
            const cap = new THREE.Mesh(capGeo, capMat);
            cap.position.y = 1.8;
            genGroup.add(cap);

            // Base plate
            const basePlate = new THREE.Mesh(
                new THREE.CylinderGeometry(1.0, 1.0, 0.08, 16),
                new THREE.MeshStandardMaterial({ color: 0x222230, metalness: 0.6 })
            );
            basePlate.position.y = 0.15;
            genGroup.add(basePlate);

            // Generator hum light
            const genLight = new THREE.PointLight(0x4488ff, 0.3, 4);
            genLight.position.y = 1.0;
            genGroup.add(genLight);

            genGroup.position.set(pos.x, 0, pos.z);
            this.group.add(genGroup);

            this._generators.push({
                mesh: body,
                torus,
                torus2,
                baseY: 0.9,
                _group: genGroup,
            });
        }
    }

    _createPowerCables() {
        // Cables from each generator curving upward to ceiling (representing power to towers)
        const cablePaths = [
            // Left generator to left gauges
            new THREE.CatmullRomCurve3([
                new THREE.Vector3(-5, 1.8, 4),
                new THREE.Vector3(-5, 3.0, 2),
                new THREE.Vector3(-4, 3.5, 0),
                new THREE.Vector3(-3.5, 3.8, -1),
            ]),
            // Left generator up to ceiling
            new THREE.CatmullRomCurve3([
                new THREE.Vector3(-5, 1.8, 4),
                new THREE.Vector3(-3, 3.2, 4.5),
                new THREE.Vector3(-1, 3.8, 3),
            ]),
            // Right generator to right gauges
            new THREE.CatmullRomCurve3([
                new THREE.Vector3(5, 1.8, 4),
                new THREE.Vector3(5, 3.0, 2),
                new THREE.Vector3(4, 3.5, 0),
                new THREE.Vector3(3.5, 3.8, -1),
            ]),
            // Right generator up to ceiling
            new THREE.CatmullRomCurve3([
                new THREE.Vector3(5, 1.8, 4),
                new THREE.Vector3(3, 3.2, 4.5),
                new THREE.Vector3(1, 3.8, 3),
            ]),
        ];

        const cableMat = new THREE.MeshStandardMaterial({
            color: 0x334466,
            emissive: 0x112233,
            emissiveIntensity: 0.2,
            roughness: 0.4,
            metalness: 0.6,
        });

        for (const path of cablePaths) {
            const tubeGeo = new THREE.TubeGeometry(path, 16, 0.04, 6, false);
            const cable = new THREE.Mesh(tubeGeo, cableMat);
            this.group.add(cable);
        }
    }

    _createWarningLights() {
        // Master warning lights on ceiling
        const warnPositions = [
            { x: -4, z: -4 },
            { x: 4, z: -4 },
            { x: -4, z: 4 },
            { x: 4, z: 4 },
        ];

        for (const pos of warnPositions) {
            const warnGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const warnMat = new THREE.MeshStandardMaterial({
                color: 0x331111,
                emissive: 0x110000,
                emissiveIntensity: 0.1,
            });
            const warn = new THREE.Mesh(warnGeo, warnMat);
            warn.position.set(pos.x, FLOOR_HEIGHT - 0.3, pos.z);
            this.group.add(warn);
            this._warningLights.push(warn);
        }
    }

    _createSectionLabels() {
        const title = _makeLabelSprite(
            'POWER STATION',
            new THREE.Vector3(0, 3.8, -FLOOR_DEPTH / 2 + 1),
            0.7,
            '#88aaff'
        );
        this.group.add(title);
    }

    // -----------------------------------------------------------------------
    // update
    // -----------------------------------------------------------------------

    update(delta) {
        this._elapsed += delta;

        // Spin generator torus elements
        for (const gen of this._generators) {
            gen.torus.rotation.z += delta * 2.0;
            gen.torus.rotation.y += delta * 0.5;
            if (gen.torus2) {
                gen.torus2.rotation.z -= delta * 1.5;
                gen.torus2.rotation.x += delta * 0.8;
            }

            // Humming oscillation on generator body
            gen.mesh.position.y = gen.baseY + Math.sin(this._elapsed * 8) * 0.008;
        }

        // Check if any gauge is over 85% for warning lights
        let anyWarning = false;
        for (const side of ['local', 'server']) {
            for (const type of Object.keys(this._gauges[side])) {
                const gauge = this._gauges[side][type];
                if (gauge.percentage > 85) {
                    anyWarning = true;
                    // Flash individual gauge warning
                    const flash = Math.sin(this._elapsed * 6) > 0;
                    gauge.warningLight.material.color.setHex(flash ? 0xff2200 : 0x331111);
                    gauge.warningLight.material.emissive.setHex(flash ? 0xff2200 : 0x110000);
                    gauge.warningLight.material.emissiveIntensity = flash ? 1.0 : 0.1;
                } else {
                    gauge.warningLight.material.color.setHex(0x331111);
                    gauge.warningLight.material.emissive.setHex(0x110000);
                    gauge.warningLight.material.emissiveIntensity = 0.1;
                }
            }
        }

        // Master warning lights
        for (const warn of this._warningLights) {
            if (anyWarning) {
                const flash = Math.sin(this._elapsed * 4) > 0;
                warn.material.color.setHex(flash ? 0xff2200 : 0x331111);
                warn.material.emissive.setHex(flash ? 0xff2200 : 0x110000);
                warn.material.emissiveIntensity = flash ? 0.8 : 0.1;
            } else {
                warn.material.color.setHex(0x113311);
                warn.material.emissive.setHex(0x002200);
                warn.material.emissiveIntensity = 0.3;
            }
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Set a gauge to a specific percentage.
     * @param {'local'|'server'} side
     * @param {string} type - e.g. 'CPU', 'RAM', 'GPU', 'Storage', 'Bandwidth'
     * @param {number} percentage - 0 to 100
     */
    setGauge(side, type, percentage) {
        const gauge = this._gauges[side]?.[type];
        if (!gauge) return;

        percentage = Math.max(0, Math.min(100, percentage));
        gauge.percentage = percentage;

        // Update fill bar height and color
        const fillHeight = Math.max(0.01, (percentage / 100) * GAUGE_MAX_HEIGHT);
        const colors = _getGaugeColor(percentage);

        gauge.bar.geometry.dispose();
        gauge.bar.geometry = new THREE.BoxGeometry(
            GAUGE_WIDTH - 0.05,
            fillHeight,
            GAUGE_WIDTH - 0.05
        );
        gauge.bar.position.y = 0.2 + fillHeight / 2;
        gauge.bar.material.color.setHex(colors.color);
        gauge.bar.material.emissive.setHex(colors.emissive);

        // Update percentage sprite
        this._updatePercentSprite(gauge, percentage);

        eventBus.emit('power:gaugeUpdated', { side, type, percentage });
    }

    /**
     * Recreate the percentage text sprite for a gauge.
     * @private
     */
    _updatePercentSprite(gauge, pct) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 128, 64);

        const color = pct < 60 ? '#22cc44' : pct < 85 ? '#ddaa22' : '#dd2222';
        ctx.fillStyle = color;
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(pct)}%`, 64, 32);

        const tex = new THREE.CanvasTexture(canvas);
        if (gauge.pctSprite.material.map) {
            gauge.pctSprite.material.map.dispose();
        }
        gauge.pctSprite.material.map = tex;
        gauge.pctSprite.material.needsUpdate = true;
    }

    /**
     * Get all current gauge metrics.
     * @returns {{ local: Record<string, number>, server: Record<string, number> }}
     */
    getAllMetrics() {
        const metrics = { local: {}, server: {} };

        for (const side of ['local', 'server']) {
            for (const type of Object.keys(this._gauges[side])) {
                metrics[side][type] = this._gauges[side][type].percentage;
            }
        }

        return metrics;
    }
}

export default PowerStation;
