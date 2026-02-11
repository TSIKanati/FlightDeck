/**
 * Floor.js - Individual Floor Class for The Highrise
 * TSI Enterprise 3D Command Center
 *
 * Each Floor instance creates:
 * - Floor slab (thin box, slightly wider than walls)
 * - Transparent glass walls on each side
 * - Ceiling panel
 * - Interior furniture placeholders (desks, meeting table)
 * - 8 division zones with colored floor markings
 * - Floor label sprite (emoji + name)
 * - Glow intensity based on project status
 *
 * Methods:
 *   highlight()      - visually emphasize this floor
 *   unhighlight()    - return to normal state
 *   showInterior()   - reveal interior furniture / divisions
 *   hideInterior()   - hide interior detail
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLOOR_HEIGHT = 2.5;
const SLAB_THICKNESS = 0.12;
const WALL_THICKNESS = 0.04;
const TOWER_WIDTH  = 8;     // x extent
const TOWER_DEPTH  = 3;     // z extent

// Division layout -- 8 divisions arranged in a 4x2 grid inside each floor
// Each division is roughly 2x1.5 units
const DIVISION_COLS = 4;
const DIVISION_ROWS = 2;
const DIV_WIDTH  = TOWER_WIDTH / DIVISION_COLS;   // 2
const DIV_DEPTH  = TOWER_DEPTH / DIVISION_ROWS;   // 1.5

const DIVISION_DEFS = [
    { id: 'marketing',  name: 'Marketing',    emoji: '\uD83D\uDCE2', color: '#E67E22' },
    { id: 'rnd',        name: 'R&D',          emoji: '\uD83D\uDD2C', color: '#3498DB' },
    { id: 'testing',    name: 'Testing',       emoji: '\uD83E\uDDEA', color: '#E74C3C' },
    { id: 'production', name: 'Production',    emoji: '\uD83C\uDFED', color: '#2ECC71' },
    { id: 'security',   name: 'Security',      emoji: '\uD83D\uDD12', color: '#C0392B' },
    { id: 'legal',      name: 'Legal',         emoji: '\u2696\uFE0F',  color: '#8B4513' },
    { id: 'accounting', name: 'Accounting',    emoji: '\uD83D\uDCB0', color: '#27AE60' },
    { id: 'meeting',    name: 'Meeting Room',  emoji: '\uD83D\uDDE3\uFE0F', color: '#9B59B6' },
];

// Status -> emissive intensity mapping
const STATUS_GLOW = {
    production:  0.45,
    development: 0.28,
    concept:     0.12,
    reserved:    0.05,
    default:     0.15,
};

// ---------------------------------------------------------------------------
// Helper: create a text sprite from a canvas
// ---------------------------------------------------------------------------

function _createLabelSprite(text, bgColor, scale) {
    const canvas = document.createElement('canvas');
    canvas.width  = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Background pill (roundRect with fallback for older contexts)
    ctx.fillStyle = bgColor || 'rgba(8,12,24,0.8)';
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(0, 0, 512, 64, 12);
        ctx.fill();
    } else {
        // Fallback: plain rectangle
        ctx.fillRect(0, 0, 512, 64);
    }

    // Text
    ctx.fillStyle = '#e0e8f0';
    ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 34);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;

    const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: true,
        depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(scale || 3.5, (scale || 3.5) * (64 / 512), 1);
    return sprite;
}

// ---------------------------------------------------------------------------
// Floor Class
// ---------------------------------------------------------------------------

export class Floor {
    /**
     * @param {Object} config - Floor config from floors.json
     * @param {number} config.index - Floor index (-2 to 20)
     * @param {string} config.id - Unique id
     * @param {string} config.name - Display name
     * @param {string} config.emoji - Emoji icon
     * @param {string} config.type - "enterprise" | "social" | "project"
     * @param {string} config.color - Hex color
     * @param {string} [config.projectId] - Associated project id
     * @param {string} [status] - Project status for glow
     */
    constructor(config, status) {
        this.config = config;
        this.index  = config.index;
        this.id     = config.id;
        this.name   = config.name;
        this.type   = config.type;
        this.color  = new THREE.Color(config.color);
        this.status = status || 'default';

        /** The root group -- position this at the tower's x-offset */
        this.group = new THREE.Group();
        this.group.name = `floor-${this.id}`;

        // Y position = index * floor height
        this.group.position.y = this.index * FLOOR_HEIGHT;

        /** Interior details group (hidden by default) */
        this.interiorGroup = new THREE.Group();
        this.interiorGroup.visible = false;
        this.group.add(this.interiorGroup);

        /** References for highlight animation */
        this._glowMeshes   = [];
        this._edgeLines    = [];
        this._highlighted  = false;
        this._baseEmissive = STATUS_GLOW[this.status] || STATUS_GLOW.default;

        // Build geometry
        this._buildSlab();
        this._buildWalls();
        this._buildCeiling();
        this._buildEdgeGlow();
        this._buildLabel();
        this._buildInterior();
    }

    // -----------------------------------------------------------------------
    // Construction
    // -----------------------------------------------------------------------

    /** Floor slab -- thin box slightly wider than walls */
    _buildSlab() {
        const geo = new THREE.BoxGeometry(
            TOWER_WIDTH + 0.3,
            SLAB_THICKNESS,
            TOWER_DEPTH + 0.3
        );
        const mat = new THREE.MeshStandardMaterial({
            color: 0x1a2040,
            roughness: 0.6,
            metalness: 0.3,
            emissive: this.color,
            emissiveIntensity: this._baseEmissive * 0.3,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0;
        mesh.castShadow    = true;
        mesh.receiveShadow = true;
        mesh.userData = { floorId: this.id, floorIndex: this.index };
        this.slabMesh = mesh;
        this._glowMeshes.push(mesh);
        this.group.add(mesh);
    }

    /** Transparent glass walls on each side */
    _buildWalls() {
        const wallHeight = FLOOR_HEIGHT - SLAB_THICKNESS;
        const wallY = SLAB_THICKNESS / 2 + wallHeight / 2;

        // Determine tint based on floor type
        let tint;
        if (this.type === 'enterprise') {
            tint = new THREE.Color(0x1a3366); // deep enterprise blue
        } else if (this.type === 'social') {
            tint = new THREE.Color(0x1a4040); // teal social
        } else {
            tint = new THREE.Color(this.color).multiplyScalar(0.3); // project color tinted glass
        }

        // Build glass material -- MeshPhysicalMaterial for realistic glass
        const glassMat = new THREE.MeshPhysicalMaterial({
            color: tint,
            transparent: true,
            opacity: 0.2,
            roughness: 0.05,
            metalness: 0.1,
            transmission: 0.6,
            thickness: 0.1,
            emissive: this.color,
            emissiveIntensity: this._baseEmissive * 0.15,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        this.wallMeshes = [];

        // Front wall (z+)
        const frontGeo = new THREE.BoxGeometry(TOWER_WIDTH, wallHeight, WALL_THICKNESS);
        const front = new THREE.Mesh(frontGeo, glassMat.clone());
        front.position.set(0, wallY, TOWER_DEPTH / 2);
        this.group.add(front);
        this.wallMeshes.push(front);
        this._glowMeshes.push(front);

        // Back wall (z-)
        const back = new THREE.Mesh(frontGeo, glassMat.clone());
        back.position.set(0, wallY, -TOWER_DEPTH / 2);
        this.group.add(back);
        this.wallMeshes.push(back);
        this._glowMeshes.push(back);

        // Left wall (x-)
        const sideGeo = new THREE.BoxGeometry(WALL_THICKNESS, wallHeight, TOWER_DEPTH);
        const left = new THREE.Mesh(sideGeo, glassMat.clone());
        left.position.set(-TOWER_WIDTH / 2, wallY, 0);
        this.group.add(left);
        this.wallMeshes.push(left);

        // Right wall (x+)
        const right = new THREE.Mesh(sideGeo, glassMat.clone());
        right.position.set(TOWER_WIDTH / 2, wallY, 0);
        this.group.add(right);
        this.wallMeshes.push(right);
    }

    /** Ceiling panel */
    _buildCeiling() {
        const geo = new THREE.BoxGeometry(TOWER_WIDTH, SLAB_THICKNESS * 0.5, TOWER_DEPTH);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x141830,
            roughness: 0.7,
            metalness: 0.2,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = FLOOR_HEIGHT - SLAB_THICKNESS * 0.25;
        this.group.add(mesh);
    }

    /** Subtle glowing edge lines marking floor boundaries */
    _buildEdgeGlow() {
        const hw = TOWER_WIDTH / 2;
        const hd = TOWER_DEPTH / 2;

        // Bottom edge rectangle
        const points = [
            new THREE.Vector3(-hw, SLAB_THICKNESS / 2, -hd),
            new THREE.Vector3( hw, SLAB_THICKNESS / 2, -hd),
            new THREE.Vector3( hw, SLAB_THICKNESS / 2,  hd),
            new THREE.Vector3(-hw, SLAB_THICKNESS / 2,  hd),
            new THREE.Vector3(-hw, SLAB_THICKNESS / 2, -hd),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.5 + this._baseEmissive,
            linewidth: 1,
        });
        const line = new THREE.LineLoop(geo, mat);
        this.group.add(line);
        this._edgeLines.push(line);

        // Top edge rectangle
        const topPoints = points.map(p => p.clone().setY(FLOOR_HEIGHT - SLAB_THICKNESS * 0.5));
        const topGeo = new THREE.BufferGeometry().setFromPoints(topPoints);
        const topLine = new THREE.LineLoop(topGeo, mat.clone());
        this.group.add(topLine);
        this._edgeLines.push(topLine);
    }

    /** Floor label sprite on the front face */
    _buildLabel() {
        const labelText = `${this.config.emoji} ${this.name}`;

        // Background color based on type
        let bg;
        if (this.type === 'enterprise') {
            bg = 'rgba(26, 51, 102, 0.85)';
        } else if (this.type === 'social') {
            bg = 'rgba(26, 64, 64, 0.85)';
        } else {
            bg = 'rgba(12, 18, 36, 0.85)';
        }

        this.labelSprite = _createLabelSprite(labelText, bg, 3.2);
        this.labelSprite.position.set(0, FLOOR_HEIGHT * 0.5, TOWER_DEPTH / 2 + 0.6);
        this.group.add(this.labelSprite);
    }

    /** Interior furniture and division zones (hidden until showInterior) */
    _buildInterior() {
        const baseY = SLAB_THICKNESS / 2 + 0.01;

        for (let i = 0; i < DIVISION_DEFS.length; i++) {
            const div = DIVISION_DEFS[i];
            const col = i % DIVISION_COLS;
            const row = Math.floor(i / DIVISION_COLS);

            // Zone rectangle on the floor
            const zoneGeo = new THREE.PlaneGeometry(DIV_WIDTH - 0.1, DIV_DEPTH - 0.1);
            const zoneMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(div.color),
                transparent: true,
                opacity: 0.25,
                roughness: 0.9,
                emissive: new THREE.Color(div.color),
                emissiveIntensity: 0.15,
                side: THREE.DoubleSide,
            });
            const zone = new THREE.Mesh(zoneGeo, zoneMat);
            zone.rotation.x = -Math.PI / 2;

            // Position within the floor
            const x = -TOWER_WIDTH / 2 + DIV_WIDTH * (col + 0.5);
            const z = -TOWER_DEPTH / 2 + DIV_DEPTH * (row + 0.5);
            zone.position.set(x, baseY, z);
            zone.userData = { divisionId: div.id, floorId: this.id };
            this.interiorGroup.add(zone);

            // Furniture placeholder -- desk cluster (small boxes)
            if (div.id !== 'meeting') {
                // 2 small desk boxes
                for (let d = 0; d < 2; d++) {
                    const deskGeo = new THREE.BoxGeometry(0.6, 0.35, 0.4);
                    const deskMat = new THREE.MeshStandardMaterial({
                        color: 0x2a3050,
                        roughness: 0.6,
                        metalness: 0.3,
                    });
                    const desk = new THREE.Mesh(deskGeo, deskMat);
                    desk.position.set(
                        x + (d === 0 ? -0.4 : 0.4),
                        baseY + 0.175,
                        z
                    );
                    desk.castShadow = true;
                    this.interiorGroup.add(desk);
                }
            } else {
                // Meeting room -- larger table
                const tableGeo = new THREE.BoxGeometry(1.4, 0.3, 0.8);
                const tableMat = new THREE.MeshStandardMaterial({
                    color: 0x3a2a1a,
                    roughness: 0.4,
                    metalness: 0.2,
                });
                const table = new THREE.Mesh(tableGeo, tableMat);
                table.position.set(x, baseY + 0.15, z);
                table.castShadow = true;
                this.interiorGroup.add(table);
            }

            // Division label sprite (small)
            const divLabel = _createLabelSprite(`${div.emoji} ${div.name}`, `rgba(0,0,0,0.6)`, 1.2);
            divLabel.position.set(x, baseY + 1.0, z);
            this.interiorGroup.add(divLabel);
        }
    }

    // -----------------------------------------------------------------------
    // Public Methods
    // -----------------------------------------------------------------------

    /** Visually emphasize this floor (e.g., on hover / selection). */
    highlight() {
        if (this._highlighted) return;
        this._highlighted = true;

        this._glowMeshes.forEach(mesh => {
            if (mesh.material.emissiveIntensity !== undefined) {
                mesh.material.emissiveIntensity = this._baseEmissive + 0.4;
            }
        });
        this._edgeLines.forEach(line => {
            line.material.opacity = Math.min(1.0, line.material.opacity + 0.35);
        });
    }

    /** Return to normal visual state. */
    unhighlight() {
        if (!this._highlighted) return;
        this._highlighted = false;

        this._glowMeshes.forEach(mesh => {
            if (mesh.material.emissiveIntensity !== undefined) {
                mesh.material.emissiveIntensity = this._baseEmissive * 0.3;
            }
        });
        this._edgeLines.forEach(line => {
            line.material.opacity = 0.5 + this._baseEmissive;
        });
    }

    /** Reveal interior furniture and division zones. */
    showInterior() {
        this.interiorGroup.visible = true;
        // Make walls more transparent so we can see inside
        this.wallMeshes.forEach(w => {
            w.material.opacity = 0.08;
        });
    }

    /** Hide interior detail. */
    hideInterior() {
        this.interiorGroup.visible = false;
        this.wallMeshes.forEach(w => {
            w.material.opacity = 0.2;
        });
    }

    /**
     * Per-frame update for pulsing glow on active project floors.
     * @param {number} elapsed - seconds since scene start
     */
    update(elapsed) {
        if (this.type === 'project' && !this._highlighted) {
            // Gentle pulse
            const pulse = Math.sin(elapsed * 1.5 + this.index * 0.7) * 0.08;
            const intensity = this._baseEmissive * 0.3 + pulse;
            this._glowMeshes.forEach(mesh => {
                if (mesh.material.emissiveIntensity !== undefined) {
                    mesh.material.emissiveIntensity = Math.max(0, intensity);
                }
            });
        }
    }

    /** Dispose all geometry and materials. */
    dispose() {
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
}

export default Floor;
