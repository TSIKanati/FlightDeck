/**
 * FinanceFloor.js - Floor 16: Finance & Accounting
 * The Highrise 3D Command Center
 *
 * Corporate finance operations center featuring:
 * - Large revenue display counter with green digital glow
 * - Budget allocation pie chart from colored torus segments
 * - Trading desk with multiple chart-line monitors
 * - Vault door with metallic circular design
 * - Cash flow tube pipes with green traveling particles
 * - Quarterly report growing document stack
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLOOR_WIDTH = 28;
const FLOOR_DEPTH = 18;
const FLOOR_HEIGHT = 4;

const PIE_RADIUS = 1.3;
const PIE_TUBE = 0.25;
const PARTICLE_COUNT = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _makeLabelSprite(text, position, scale = 1, color = '#88ffaa') {
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

function _makeRevenueTexture(amount) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#040a08';
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = '#22ff66';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`$${amount.toLocaleString()}`, 256, 50);

    ctx.fillStyle = '#118833';
    ctx.font = '18px monospace';
    ctx.fillText('TOTAL REVENUE', 256, 100);

    return new THREE.CanvasTexture(canvas);
}

function _makeChartTexture(seed) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#060e08';
    ctx.fillRect(0, 0, 256, 128);

    // Grid
    ctx.strokeStyle = '#113322';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < 256; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke();
    }
    for (let y = 0; y < 128; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
    }

    // Chart line
    ctx.strokeStyle = '#22ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let py = 80;
    ctx.moveTo(0, py);
    for (let x = 1; x < 256; x += 4) {
        py += (Math.sin(x * 0.05 + seed) * 8 + Math.random() * 6 - 3);
        py = Math.max(10, Math.min(118, py));
        ctx.lineTo(x, py);
    }
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
}

// ---------------------------------------------------------------------------
// FinanceFloor Class
// ---------------------------------------------------------------------------

export class FinanceFloor {
    constructor() {
        /** @type {THREE.Group|null} */
        this.group = null;

        /** @type {THREE.Mesh|null} */
        this._revenueDisplay = null;
        this._revenueAmount = 12450000;

        /** @type {{ mesh: THREE.Mesh, startAngle: number, arcLength: number, color: number, label: string }[]} */
        this._pieSegments = [];

        /** @type {{ particle: THREE.Mesh, t: number, speed: number, path: THREE.CatmullRomCurve3 }[]} */
        this._cashParticles = [];

        /** @type {THREE.Mesh[]} */
        this._reportStack = [];
        this._reportCount = 4;

        /** @type {THREE.Mesh|null} */
        this._vaultDoor = null;

        this._elapsed = 0;
        this._budgetAllocations = {
            Engineering: 0.30,
            Marketing: 0.20,
            Operations: 0.18,
            R_D: 0.15,
            Sales: 0.12,
            Other: 0.05,
        };
    }

    // -----------------------------------------------------------------------
    // create
    // -----------------------------------------------------------------------

    create(parentGroup) {
        this.group = new THREE.Group();
        this.group.name = 'Finance_Floor16';

        this._createFloorBase();
        this._createRevenueDisplay();
        this._createBudgetPieChart();
        this._createTradingDesk();
        this._createVaultDoor();
        this._createCashFlowPipes();
        this._createQuarterlyReports();
        this._createLighting();

        parentGroup.add(this.group);

        eventBus.emit('floor:created', { floor: 16, name: 'Finance' });

        return this.group;
    }

    // -----------------------------------------------------------------------
    // Geometry builders (private)
    // -----------------------------------------------------------------------

    _createFloorBase() {
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(FLOOR_WIDTH, 0.15, FLOOR_DEPTH),
            new THREE.MeshStandardMaterial({ color: 0x0e1210, roughness: 0.3, metalness: 0.4 })
        );
        floor.receiveShadow = true;
        this.group.add(floor);

        const ceiling = new THREE.Mesh(
            new THREE.BoxGeometry(FLOOR_WIDTH, 0.1, FLOOR_DEPTH),
            new THREE.MeshStandardMaterial({ color: 0x0a0e0c, roughness: 0.8 })
        );
        ceiling.position.y = FLOOR_HEIGHT;
        this.group.add(ceiling);
    }

    _createRevenueDisplay() {
        const tex = _makeRevenueTexture(this._revenueAmount);

        const displayGeo = new THREE.PlaneGeometry(4.5, 1.2);
        const displayMat = new THREE.MeshStandardMaterial({
            map: tex,
            emissive: 0x116633,
            emissiveIntensity: 0.5,
        });
        this._revenueDisplay = new THREE.Mesh(displayGeo, displayMat);
        this._revenueDisplay.position.set(0, 3.0, -FLOOR_DEPTH / 2 + 0.2);
        this.group.add(this._revenueDisplay);

        // Frame
        const frameGeo = new THREE.BoxGeometry(4.7, 1.4, 0.06);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x222833, metalness: 0.8 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 3.0, -FLOOR_DEPTH / 2 + 0.14);
        this.group.add(frame);

        // Glow light
        const glow = new THREE.PointLight(0x22ff66, 0.4, 5);
        glow.position.set(0, 3.0, -FLOOR_DEPTH / 2 + 1);
        this.group.add(glow);
    }

    _createBudgetPieChart() {
        const entries = Object.entries(this._budgetAllocations);
        const colors = [0x2266ff, 0xff6622, 0x22cc88, 0xcc44ff, 0xffcc22, 0x888899];

        let currentAngle = 0;

        const chartGroup = new THREE.Group();
        chartGroup.position.set(-5, 1.6, 1);

        for (let i = 0; i < entries.length; i++) {
            const [label, fraction] = entries[i];
            const arcLength = fraction * Math.PI * 2;

            const segGeo = new THREE.TorusGeometry(
                PIE_RADIUS,
                PIE_TUBE,
                8,
                Math.max(4, Math.round(fraction * 32)),
                arcLength
            );
            const segMat = new THREE.MeshStandardMaterial({
                color: colors[i],
                emissive: colors[i],
                emissiveIntensity: 0.2,
                roughness: 0.4,
            });
            const seg = new THREE.Mesh(segGeo, segMat);
            seg.rotation.x = Math.PI / 2;
            seg.rotation.z = currentAngle;
            chartGroup.add(seg);

            this._pieSegments.push({
                mesh: seg,
                startAngle: currentAngle,
                arcLength,
                color: colors[i],
                label,
            });

            // Segment label
            const midAngle = currentAngle + arcLength / 2;
            const lx = Math.cos(midAngle) * (PIE_RADIUS + 0.6);
            const lz = Math.sin(midAngle) * (PIE_RADIUS + 0.6);
            const segLabel = _makeLabelSprite(
                `${label} ${Math.round(fraction * 100)}%`,
                new THREE.Vector3(lx, 0, lz),
                0.3,
                `#${colors[i].toString(16).padStart(6, '0')}`
            );
            chartGroup.add(segLabel);

            currentAngle += arcLength;
        }

        this.group.add(chartGroup);

        // Chart title
        const title = _makeLabelSprite(
            'BUDGET ALLOCATION',
            new THREE.Vector3(-5, 3.0, 1),
            0.5
        );
        this.group.add(title);
    }

    _createTradingDesk() {
        // Desk body
        const deskGeo = new THREE.BoxGeometry(4, 0.9, 1.5);
        const deskMat = new THREE.MeshStandardMaterial({
            color: 0x1a1e22,
            roughness: 0.3,
            metalness: 0.6,
        });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(4, 0.55, 3);
        desk.castShadow = true;
        this.group.add(desk);

        // Multiple chart monitors on desk
        const monGeo = new THREE.PlaneGeometry(0.9, 0.6);
        for (let i = 0; i < 4; i++) {
            const chartTex = _makeChartTexture(i * 2.5);
            const monMat = new THREE.MeshStandardMaterial({
                map: chartTex,
                emissive: 0x114422,
                emissiveIntensity: 0.4,
            });
            const mon = new THREE.Mesh(monGeo, monMat);
            mon.position.set(2.5 + i * 1.0, 1.4, 2.5);
            mon.rotation.x = -0.1;
            this.group.add(mon);
        }

        // Chair
        const chair = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.45, 0.6),
            new THREE.MeshStandardMaterial({ color: 0x222230 })
        );
        chair.position.set(4, 0.32, 4.3);
        this.group.add(chair);
    }

    _createVaultDoor() {
        // Circular vault door (cylinder, rotated to face forward)
        const doorGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.2, 32);
        const doorMat = new THREE.MeshStandardMaterial({
            color: 0x667788,
            roughness: 0.1,
            metalness: 0.95,
        });
        this._vaultDoor = new THREE.Mesh(doorGeo, doorMat);
        this._vaultDoor.position.set(FLOOR_WIDTH / 2 - 0.5, 1.6, -2);
        this._vaultDoor.rotation.z = Math.PI / 2;
        this._vaultDoor.castShadow = true;
        this.group.add(this._vaultDoor);

        // Door handle wheel (torus)
        const wheelGeo = new THREE.TorusGeometry(0.4, 0.04, 8, 16);
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0xbbaa88,
            metalness: 0.9,
            roughness: 0.15,
        });
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(FLOOR_WIDTH / 2 - 0.3, 1.6, -2);
        wheel.rotation.y = Math.PI / 2;
        this.group.add(wheel);

        // Spokes on wheel
        const spokeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4);
        const spokeMat = wheelMat.clone();
        for (let i = 0; i < 3; i++) {
            const spoke = new THREE.Mesh(spokeGeo, spokeMat);
            spoke.position.copy(wheel.position);
            spoke.rotation.y = Math.PI / 2;
            spoke.rotation.z = (i / 3) * Math.PI;
            this.group.add(spoke);
        }

        // Door frame
        const frameGeo = new THREE.TorusGeometry(1.55, 0.1, 8, 32);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.8 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(FLOOR_WIDTH / 2 - 0.55, 1.6, -2);
        frame.rotation.y = Math.PI / 2;
        this.group.add(frame);
    }

    _createCashFlowPipes() {
        // Define pipe paths between sections
        const pipePaths = [
            // Revenue display to vault
            new THREE.CatmullRomCurve3([
                new THREE.Vector3(2.5, 2.8, -FLOOR_DEPTH / 2 + 0.8),
                new THREE.Vector3(5, 2.5, -3),
                new THREE.Vector3(FLOOR_WIDTH / 2 - 1, 2.0, -2),
            ]),
            // Revenue display to trading desk
            new THREE.CatmullRomCurve3([
                new THREE.Vector3(2, 2.5, -FLOOR_DEPTH / 2 + 1.5),
                new THREE.Vector3(3, 2.0, 0),
                new THREE.Vector3(4, 1.5, 2),
            ]),
            // Pie chart to vault
            new THREE.CatmullRomCurve3([
                new THREE.Vector3(-3.5, 1.8, 1),
                new THREE.Vector3(2, 2.2, -0.5),
                new THREE.Vector3(FLOOR_WIDTH / 2 - 1.5, 1.8, -2),
            ]),
        ];

        // Tube geometries for pipes
        const pipeMat = new THREE.MeshStandardMaterial({
            color: 0x224433,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
        });

        for (const path of pipePaths) {
            const tubeGeo = new THREE.TubeGeometry(path, 20, 0.06, 6, false);
            const tube = new THREE.Mesh(tubeGeo, pipeMat);
            this.group.add(tube);

            // Green particles traveling along pipe
            for (let p = 0; p < 4; p++) {
                const particleGeo = new THREE.SphereGeometry(0.04, 6, 6);
                const particleMat = new THREE.MeshStandardMaterial({
                    color: 0x44ff88,
                    emissive: 0x22cc44,
                    emissiveIntensity: 0.9,
                });
                const particle = new THREE.Mesh(particleGeo, particleMat);
                const startT = p / 4;
                const pos = path.getPointAt(startT);
                particle.position.copy(pos);
                this.group.add(particle);

                this._cashParticles.push({
                    particle,
                    t: startT,
                    speed: 0.15 + Math.random() * 0.1,
                    path,
                });
            }
        }
    }

    _createQuarterlyReports() {
        const stackX = -8;
        const stackZ = -3;

        for (let i = 0; i < this._reportCount; i++) {
            const docGeo = new THREE.BoxGeometry(0.7, 0.06, 0.9);
            const docMat = new THREE.MeshStandardMaterial({
                color: 0xddddcc,
                roughness: 0.8,
            });
            const doc = new THREE.Mesh(docGeo, docMat);
            doc.position.set(stackX, 0.15 + i * 0.07, stackZ);
            this.group.add(doc);
            this._reportStack.push(doc);
        }

        // Label
        const label = _makeLabelSprite(
            `Q${this._reportCount} REPORTS`,
            new THREE.Vector3(stackX, 0.8, stackZ),
            0.35
        );
        this.group.add(label);

        // Small desk under reports
        const deskGeo = new THREE.BoxGeometry(1.2, 0.08, 1.2);
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x2a2a38, metalness: 0.5 });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(stackX, 0.1, stackZ);
        this.group.add(desk);
    }

    _createLighting() {
        // Green accent for finance theme
        const greenLight = new THREE.PointLight(0x22ff66, 0.3, 12);
        greenLight.position.set(0, 3.5, 0);
        this.group.add(greenLight);

        // Warm light on trading area
        const warmLight = new THREE.PointLight(0xddaa66, 0.3, 8);
        warmLight.position.set(4, 2.5, 3);
        this.group.add(warmLight);

        // Vault area spotlight
        const vaultLight = new THREE.SpotLight(0xaabbcc, 0.5, 6, Math.PI / 6, 0.3);
        vaultLight.position.set(FLOOR_WIDTH / 2 - 2, 3.5, -2);
        vaultLight.target.position.set(FLOOR_WIDTH / 2 - 0.5, 1.6, -2);
        this.group.add(vaultLight);
        this.group.add(vaultLight.target);
    }

    // -----------------------------------------------------------------------
    // update
    // -----------------------------------------------------------------------

    update(delta) {
        this._elapsed += delta;

        // Animate cash flow particles along pipes
        for (const cp of this._cashParticles) {
            cp.t += cp.speed * delta;
            if (cp.t > 1) cp.t -= 1;
            const pos = cp.path.getPointAt(cp.t);
            cp.particle.position.copy(pos);
            // Pulse brightness
            cp.particle.material.emissiveIntensity = 0.6 + Math.sin(this._elapsed * 5 + cp.t * 10) * 0.3;
        }

        // Subtle pulse on revenue display
        if (this._revenueDisplay) {
            const pulse = 0.4 + Math.sin(this._elapsed * 1.5) * 0.15;
            this._revenueDisplay.material.emissiveIntensity = pulse;
        }

        // Slow rotation of pie chart segments for visual interest
        for (const seg of this._pieSegments) {
            // Very subtle oscillation
            seg.mesh.rotation.z = seg.startAngle + Math.sin(this._elapsed * 0.3) * 0.02;
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Update the revenue display amount.
     * @param {number} amount
     */
    updateRevenue(amount) {
        this._revenueAmount = amount;
        if (this._revenueDisplay) {
            const oldTex = this._revenueDisplay.material.map;
            this._revenueDisplay.material.map = _makeRevenueTexture(amount);
            this._revenueDisplay.material.needsUpdate = true;
            if (oldTex) oldTex.dispose();
        }
        eventBus.emit('finance:revenueUpdated', { amount });
    }

    /**
     * Set budget allocation percentages and rebuild pie chart visuals.
     * @param {Record<string, number>} allocations - e.g., { Engineering: 0.30, Marketing: 0.20, ... }
     */
    setBudget(allocations) {
        this._budgetAllocations = allocations;

        const entries = Object.entries(allocations);
        const colors = [0x2266ff, 0xff6622, 0x22cc88, 0xcc44ff, 0xffcc22, 0x888899];

        let currentAngle = 0;
        for (let i = 0; i < this._pieSegments.length && i < entries.length; i++) {
            const [, fraction] = entries[i];
            const arcLength = fraction * Math.PI * 2;

            // Update geometry by replacing
            const seg = this._pieSegments[i];
            seg.mesh.geometry.dispose();
            seg.mesh.geometry = new THREE.TorusGeometry(
                PIE_RADIUS,
                PIE_TUBE,
                8,
                Math.max(4, Math.round(fraction * 32)),
                arcLength
            );
            seg.mesh.rotation.z = currentAngle;
            seg.startAngle = currentAngle;
            seg.arcLength = arcLength;

            currentAngle += arcLength;
        }

        eventBus.emit('finance:budgetUpdated', { allocations });
    }
}

export default FinanceFloor;
