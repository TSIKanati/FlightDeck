/**
 * LegalFloor.js - Floor 18: Legal & Compliance
 * The Highrise 3D Command Center
 *
 * Corporate legal department featuring:
 * - Law library with rows of bookshelves and colored book spines
 * - Oval conference table with surrounding chairs
 * - Secure document safe with combination dial
 * - Compliance scoreboard with green/red indicators
 * - Contract pipeline showing documents at different stages
 * - Gavel on judge's desk
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLOOR_WIDTH = 28;
const FLOOR_DEPTH = 18;
const FLOOR_HEIGHT = 4;

const BOOKSHELF_ROWS = 3;
const BOOKSHELF_HEIGHT = 3.0;
const BOOKSHELF_WIDTH = 2.0;
const BOOKSHELF_DEPTH = 0.6;
const BOOKS_PER_SHELF = 8;
const SHELF_LEVELS = 4;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _makeLabelSprite(text, position, scale = 1, color = '#c0d0ff') {
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

function _randomBookColor() {
    const palette = [
        0x883322, 0x224488, 0x228844, 0x884422, 0x442288,
        0x226644, 0x664422, 0x882244, 0x334466, 0x446633,
        0x553311, 0x113355, 0x335511, 0x551133,
    ];
    return palette[Math.floor(Math.random() * palette.length)];
}

// ---------------------------------------------------------------------------
// LegalFloor Class
// ---------------------------------------------------------------------------

export class LegalFloor {
    constructor() {
        /** @type {THREE.Group|null} */
        this.group = null;

        /** @type {{ indicator: THREE.Mesh, status: boolean }[]} */
        this._complianceIndicators = [];

        /** @type {THREE.Mesh|null} */
        this._combinationDial = null;

        /** @type {THREE.Group[]} - contract pipeline stage groups */
        this._pipelineStages = [];

        this._complianceScore = 85; // percentage
        this._elapsed = 0;
    }

    // -----------------------------------------------------------------------
    // create
    // -----------------------------------------------------------------------

    create(parentGroup) {
        this.group = new THREE.Group();
        this.group.name = 'Legal_Floor18';

        this._createFloorBase();
        this._createBookShelves();
        this._createConferenceTable();
        this._createDocumentSafe();
        this._createComplianceScoreboard();
        this._createContractPipeline();
        this._createGavelDesk();
        this._createLighting();

        parentGroup.add(this.group);

        eventBus.emit('floor:created', { floor: 18, name: 'Legal' });

        return this.group;
    }

    // -----------------------------------------------------------------------
    // Geometry builders (private)
    // -----------------------------------------------------------------------

    _createFloorBase() {
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(FLOOR_WIDTH, 0.15, FLOOR_DEPTH),
            new THREE.MeshStandardMaterial({ color: 0x14121e, roughness: 0.3, metalness: 0.4 })
        );
        floor.receiveShadow = true;
        this.group.add(floor);

        const ceiling = new THREE.Mesh(
            new THREE.BoxGeometry(FLOOR_WIDTH, 0.1, FLOOR_DEPTH),
            new THREE.MeshStandardMaterial({ color: 0x0e0c16, roughness: 0.8 })
        );
        ceiling.position.y = FLOOR_HEIGHT;
        this.group.add(ceiling);
    }

    _createBookShelves() {
        const shelfMat = new THREE.MeshStandardMaterial({
            color: 0x3a2a1a,
            roughness: 0.7,
            metalness: 0.1,
        });

        for (let row = 0; row < BOOKSHELF_ROWS; row++) {
            const shelfGroup = new THREE.Group();
            const xPos = -FLOOR_WIDTH / 2 + 1.5 + row * (BOOKSHELF_WIDTH + 0.5);

            // Back panel
            const backPanel = new THREE.Mesh(
                new THREE.BoxGeometry(BOOKSHELF_WIDTH, BOOKSHELF_HEIGHT, 0.06),
                shelfMat
            );
            backPanel.position.set(0, BOOKSHELF_HEIGHT / 2 + 0.1, -BOOKSHELF_DEPTH / 2);
            shelfGroup.add(backPanel);

            // Side panels
            for (const side of [-1, 1]) {
                const sidePanel = new THREE.Mesh(
                    new THREE.BoxGeometry(0.06, BOOKSHELF_HEIGHT, BOOKSHELF_DEPTH),
                    shelfMat
                );
                sidePanel.position.set(
                    side * (BOOKSHELF_WIDTH / 2 - 0.03),
                    BOOKSHELF_HEIGHT / 2 + 0.1,
                    0
                );
                shelfGroup.add(sidePanel);
            }

            // Shelf planks and books
            for (let level = 0; level < SHELF_LEVELS; level++) {
                const shelfY = 0.1 + level * (BOOKSHELF_HEIGHT / SHELF_LEVELS);

                // Shelf plank
                const plank = new THREE.Mesh(
                    new THREE.BoxGeometry(BOOKSHELF_WIDTH, 0.04, BOOKSHELF_DEPTH),
                    shelfMat
                );
                plank.position.set(0, shelfY, 0);
                shelfGroup.add(plank);

                // Books on this shelf
                const bookWidth = (BOOKSHELF_WIDTH - 0.2) / BOOKS_PER_SHELF;
                const bookHeight = (BOOKSHELF_HEIGHT / SHELF_LEVELS) * 0.75;

                for (let b = 0; b < BOOKS_PER_SHELF; b++) {
                    const height = bookHeight * (0.7 + Math.random() * 0.3);
                    const bookGeo = new THREE.BoxGeometry(
                        bookWidth * 0.85,
                        height,
                        BOOKSHELF_DEPTH * 0.7
                    );
                    const bookMat = new THREE.MeshStandardMaterial({
                        color: _randomBookColor(),
                        roughness: 0.6,
                    });
                    const book = new THREE.Mesh(bookGeo, bookMat);
                    book.position.set(
                        -BOOKSHELF_WIDTH / 2 + 0.15 + b * bookWidth + bookWidth / 2,
                        shelfY + 0.02 + height / 2,
                        0.05
                    );
                    shelfGroup.add(book);
                }
            }

            // Top plank
            const topPlank = new THREE.Mesh(
                new THREE.BoxGeometry(BOOKSHELF_WIDTH, 0.04, BOOKSHELF_DEPTH),
                shelfMat
            );
            topPlank.position.set(0, BOOKSHELF_HEIGHT + 0.1, 0);
            shelfGroup.add(topPlank);

            shelfGroup.position.set(xPos, 0, -FLOOR_DEPTH / 2 + 1.0);
            this.group.add(shelfGroup);
        }
    }

    _createConferenceTable() {
        // Oval table (flattened cylinder)
        const tableGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.12, 32);
        tableGeo.scale(1, 1, 0.6); // Flatten to oval
        const tableMat = new THREE.MeshStandardMaterial({
            color: 0x2a1e14,
            roughness: 0.3,
            metalness: 0.3,
        });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(2, 0.85, 2);
        table.castShadow = true;
        this.group.add(table);

        // Table legs
        const legGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.75, 6);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
        const legPositions = [
            { x: 1, z: 1.7 }, { x: 3, z: 1.7 },
            { x: 1, z: 2.3 }, { x: 3, z: 2.3 },
        ];
        for (const pos of legPositions) {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(pos.x, 0.45, pos.z);
            this.group.add(leg);
        }

        // Chairs around table
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.5 });
        const chairCount = 8;
        for (let i = 0; i < chairCount; i++) {
            const angle = (i / chairCount) * Math.PI * 2;
            const cx = 2 + Math.cos(angle) * 3.2;
            const cz = 2 + Math.sin(angle) * 2.0;

            const seat = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.35, 0.5),
                chairMat
            );
            seat.position.set(cx, 0.27, cz);
            this.group.add(seat);

            const back = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.5, 0.08),
                chairMat
            );
            const backAngle = Math.atan2(cz - 2, cx - 2);
            back.position.set(
                cx + Math.cos(backAngle) * 0.25,
                0.65,
                cz + Math.sin(backAngle) * 0.25
            );
            back.rotation.y = -backAngle + Math.PI / 2;
            this.group.add(back);
        }
    }

    _createDocumentSafe() {
        // Safe body
        const safeGeo = new THREE.BoxGeometry(1.4, 1.8, 1.2);
        const safeMat = new THREE.MeshStandardMaterial({
            color: 0x444455,
            roughness: 0.2,
            metalness: 0.9,
        });
        const safe = new THREE.Mesh(safeGeo, safeMat);
        safe.position.set(FLOOR_WIDTH / 2 - 1.5, 1.0, -FLOOR_DEPTH / 2 + 1.2);
        safe.castShadow = true;
        this.group.add(safe);

        // Combination dial (torus on front face)
        const dialGeo = new THREE.TorusGeometry(0.2, 0.04, 8, 24);
        const dialMat = new THREE.MeshStandardMaterial({
            color: 0xbbaa88,
            metalness: 0.9,
            roughness: 0.1,
        });
        this._combinationDial = new THREE.Mesh(dialGeo, dialMat);
        this._combinationDial.position.set(
            FLOOR_WIDTH / 2 - 1.5,
            1.1,
            -FLOOR_DEPTH / 2 + 1.82
        );
        this.group.add(this._combinationDial);

        // Handle bar
        const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x999988, metalness: 0.9 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(FLOOR_WIDTH / 2 - 1.2, 1.1, -FLOOR_DEPTH / 2 + 1.82);
        handle.rotation.z = Math.PI / 2;
        this.group.add(handle);

        // Label
        const label = _makeLabelSprite(
            'DOCUMENT VAULT',
            new THREE.Vector3(FLOOR_WIDTH / 2 - 1.5, 2.2, -FLOOR_DEPTH / 2 + 1.5),
            0.5
        );
        this.group.add(label);
    }

    _createComplianceScoreboard() {
        // Board background
        const boardGeo = new THREE.PlaneGeometry(2.0, 2.8);
        const boardMat = new THREE.MeshStandardMaterial({
            color: 0x0a0e1c,
            emissive: 0x060a14,
            emissiveIntensity: 0.3,
        });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.set(FLOOR_WIDTH / 2 - 0.5, 2.0, 0);
        board.rotation.y = -Math.PI / 2;
        this.group.add(board);

        // Frame
        const frameGeo = new THREE.BoxGeometry(0.08, 3.0, 2.2);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.7 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(FLOOR_WIDTH / 2 - 0.52, 2.0, 0);
        this.group.add(frame);

        // Compliance category indicators
        const categories = [
            'SOC2', 'GDPR', 'HIPAA', 'PCI-DSS',
            'ISO27001', 'FedRAMP', 'CCPA', 'SOX',
        ];

        const indicatorSize = 0.14;
        const startY = 3.1;
        const spacing = 0.35;

        for (let i = 0; i < categories.length; i++) {
            const isCompliant = Math.random() > 0.2; // 80% compliant
            const indGeo = new THREE.SphereGeometry(indicatorSize, 8, 8);
            const indMat = new THREE.MeshStandardMaterial({
                color: isCompliant ? 0x22aa44 : 0xcc3322,
                emissive: isCompliant ? 0x118822 : 0x881111,
                emissiveIntensity: 0.7,
            });
            const indicator = new THREE.Mesh(indGeo, indMat);
            indicator.position.set(
                FLOOR_WIDTH / 2 - 0.4,
                startY - i * spacing,
                -0.5
            );
            this.group.add(indicator);

            this._complianceIndicators.push({
                indicator,
                status: isCompliant,
            });

            // Category label
            const label = _makeLabelSprite(
                categories[i],
                new THREE.Vector3(FLOOR_WIDTH / 2 - 0.4, startY - i * spacing, 0.3),
                0.35
            );
            this.group.add(label);
        }
    }

    _createContractPipeline() {
        const stages = [
            { name: 'DRAFT', color: 0x555566 },
            { name: 'REVIEW', color: 0x4466aa },
            { name: 'LEGAL', color: 0xaa8844 },
            { name: 'APPROVED', color: 0x44aa66 },
            { name: 'SIGNED', color: 0x22cc44 },
        ];

        const startX = -6;
        const stageWidth = 1.2;
        const stageGap = 0.4;

        for (let i = 0; i < stages.length; i++) {
            const stageGroup = new THREE.Group();
            const x = startX + i * (stageWidth + stageGap);

            // Document stack (varying height per stage)
            const stackHeight = 0.1 + Math.random() * 0.4;
            const docGeo = new THREE.BoxGeometry(0.8, stackHeight, 0.6);
            const docMat = new THREE.MeshStandardMaterial({
                color: stages[i].color,
                roughness: 0.5,
            });
            const doc = new THREE.Mesh(docGeo, docMat);
            doc.position.set(0, 0.85 + stackHeight / 2, 0);
            stageGroup.add(doc);

            // Platform
            const platGeo = new THREE.BoxGeometry(stageWidth, 0.08, 0.9);
            const platMat = new THREE.MeshStandardMaterial({
                color: stages[i].color,
                emissive: stages[i].color,
                emissiveIntensity: 0.15,
                metalness: 0.5,
            });
            const plat = new THREE.Mesh(platGeo, platMat);
            plat.position.set(0, 0.8, 0);
            stageGroup.add(plat);

            // Stage label
            const label = _makeLabelSprite(
                stages[i].name,
                new THREE.Vector3(0, 0.55, 0),
                0.35
            );
            stageGroup.add(label);

            // Arrow to next stage (except last)
            if (i < stages.length - 1) {
                const arrowGeo = new THREE.ConeGeometry(0.08, 0.3, 4);
                const arrowMat = new THREE.MeshStandardMaterial({
                    color: 0x668899,
                    emissive: 0x334455,
                    emissiveIntensity: 0.3,
                });
                const arrow = new THREE.Mesh(arrowGeo, arrowMat);
                arrow.position.set((stageWidth + stageGap) / 2, 0.85, 0);
                arrow.rotation.z = -Math.PI / 2;
                stageGroup.add(arrow);
            }

            stageGroup.position.set(x, 0, FLOOR_DEPTH / 2 - 1.5);
            this.group.add(stageGroup);
            this._pipelineStages.push(stageGroup);
        }
    }

    _createGavelDesk() {
        // Judge-style desk
        const deskGeo = new THREE.BoxGeometry(1.8, 0.9, 1.0);
        const deskMat = new THREE.MeshStandardMaterial({
            color: 0x2a1e14,
            roughness: 0.4,
            metalness: 0.2,
        });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(-7, 0.55, 3);
        desk.castShadow = true;
        this.group.add(desk);

        // Gavel head (T-shape) - horizontal cylinder
        const headGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8);
        const gavelMat = new THREE.MeshStandardMaterial({
            color: 0x553322,
            roughness: 0.5,
        });
        const head = new THREE.Mesh(headGeo, gavelMat);
        head.position.set(-7, 1.2, 3);
        head.rotation.x = Math.PI / 2;
        this.group.add(head);

        // Gavel handle - vertical cylinder
        const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6);
        const handle = new THREE.Mesh(handleGeo, gavelMat);
        handle.position.set(-7, 1.05, 3);
        this.group.add(handle);

        // Gavel base plate
        const baseGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.6 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(-6.7, 1.02, 3);
        this.group.add(base);
    }

    _createLighting() {
        // Warm overhead light for legal office feel
        const warmLight = new THREE.PointLight(0xddcc99, 0.5, 16);
        warmLight.position.set(2, 3.5, 2);
        this.group.add(warmLight);

        // Cool accent for scoreboard area
        const coolLight = new THREE.PointLight(0x6688bb, 0.3, 8);
        coolLight.position.set(FLOOR_WIDTH / 2 - 1, 2.5, 0);
        this.group.add(coolLight);
    }

    // -----------------------------------------------------------------------
    // update
    // -----------------------------------------------------------------------

    update(delta) {
        this._elapsed += delta;

        // Slowly rotate combination dial
        if (this._combinationDial) {
            this._combinationDial.rotation.z += delta * 0.4;
        }

        // Subtle pulse on compliance indicators
        for (const entry of this._complianceIndicators) {
            const base = entry.status ? 0.5 : 0.3;
            const pulse = base + Math.sin(this._elapsed * 2 + this._complianceIndicators.indexOf(entry)) * 0.2;
            entry.indicator.material.emissiveIntensity = pulse;
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Compute and return the current compliance score.
     * @returns {{ score: number, total: number, compliant: number, details: { index: number, status: boolean }[] }}
     */
    getComplianceScore() {
        const total = this._complianceIndicators.length;
        const compliant = this._complianceIndicators.filter(e => e.status).length;
        const score = total > 0 ? Math.round((compliant / total) * 100) : 0;
        this._complianceScore = score;

        const details = this._complianceIndicators.map((e, i) => ({
            index: i,
            status: e.status,
        }));

        eventBus.emit('legal:complianceScore', { score, total, compliant });

        return { score, total, compliant, details };
    }
}

export default LegalFloor;
