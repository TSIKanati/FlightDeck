/**
 * Legal Division - Document stacks (layered boxes), gavel object
 * Renders legal/compliance-themed 3D objects for a division zone.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

const DIVISION_COLOR  = 0x8B4513;
const PAPER_COLOR     = 0xF5F5DC;
const GAVEL_WOOD      = 0x8B4513;
const GAVEL_METAL     = 0xBDC3C7;
const STAMP_COLOR     = 0xC0392B;
const STACK_COUNT     = 3;

export class LegalDivision {
    constructor() {
        /** @type {THREE.Group|null} */
        this._group = null;
        this._gavel = null;
        this._gavelArmPivot = null;
        this._timer = 0;
        this._gaveling = false;
        this._gavelTimer = 0;

        this._metrics = {
            documentsReviewed: 0,
            compliance: 98.2,
            pendingCases: 3,
            rulings: 0
        };
    }

    /**
     * @param {THREE.Vector3} position
     * @returns {THREE.Group}
     */
    create(position) {
        this._group = new THREE.Group();
        this._group.name = 'div-legal';
        this._group.position.copy(position);

        this._buildDocumentStacks();
        this._buildGavel();
        this._buildBookshelf();
        this._buildStamp();

        return this._group;
    }

    _buildDocumentStacks() {
        // Multiple stacks of papers/folders
        const stackConfigs = [
            { x: -0.6, z: -0.4, layers: 5, color: PAPER_COLOR },
            { x: 0.0,  z: -0.7, layers: 8, color: PAPER_COLOR },
            { x: 0.5,  z: -0.3, layers: 3, color: 0xE8D5B7 }
        ];

        for (const cfg of stackConfigs) {
            const stackGroup = new THREE.Group();
            stackGroup.position.set(cfg.x, 0.65, cfg.z);

            for (let layer = 0; layer < cfg.layers; layer++) {
                const docGeo = new THREE.BoxGeometry(
                    0.25 + Math.random() * 0.08,
                    0.015,
                    0.35 + Math.random() * 0.05
                );
                const docMat = new THREE.MeshStandardMaterial({
                    color: layer % 3 === 0 ? 0xD4C5A9 : cfg.color,
                    roughness: 0.9,
                    metalness: 0.0
                });
                const doc = new THREE.Mesh(docGeo, docMat);
                doc.position.y = layer * 0.016;
                // Slight random rotation per sheet
                doc.rotation.y = (Math.random() - 0.5) * 0.1;
                stackGroup.add(doc);
            }
            this._group.add(stackGroup);
        }

        // Manila folder on top of middle stack
        const folderGeo = new THREE.BoxGeometry(0.28, 0.01, 0.38);
        const folderMat = new THREE.MeshStandardMaterial({
            color: 0xD4A574,
            roughness: 0.8
        });
        const folder = new THREE.Mesh(folderGeo, folderMat);
        folder.position.set(0, 0.65 + 8 * 0.016 + 0.005, -0.7);
        folder.rotation.y = 0.05;
        this._group.add(folder);
    }

    _buildGavel() {
        // Gavel assembly
        const gavelGroup = new THREE.Group();
        gavelGroup.position.set(0.8, 0.65, 0.2);

        // Sound block (base)
        const blockGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.06, 12);
        const blockMat = new THREE.MeshStandardMaterial({
            color: GAVEL_WOOD,
            roughness: 0.4,
            metalness: 0.1
        });
        const block = new THREE.Mesh(blockGeo, blockMat);
        block.position.y = 0.03;
        gavelGroup.add(block);

        // Gavel arm pivot (for animation)
        this._gavelArmPivot = new THREE.Group();
        this._gavelArmPivot.position.set(0, 0.06, 0);

        // Handle
        const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6);
        const handleMat = new THREE.MeshStandardMaterial({
            color: GAVEL_WOOD,
            roughness: 0.5,
            metalness: 0.1
        });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.rotation.z = Math.PI / 2;
        handle.position.set(0.15, 0.05, 0);

        // Head
        const headGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8);
        const headMat = new THREE.MeshStandardMaterial({
            color: GAVEL_WOOD,
            roughness: 0.3,
            metalness: 0.2
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0.3, 0.05, 0);

        // Metal band on head
        const bandGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.02, 8);
        const bandMat = new THREE.MeshStandardMaterial({
            color: GAVEL_METAL,
            roughness: 0.2,
            metalness: 0.8
        });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.set(0.3, 0.05, 0);

        this._gavelArmPivot.add(handle);
        this._gavelArmPivot.add(head);
        this._gavelArmPivot.add(band);
        gavelGroup.add(this._gavelArmPivot);

        this._gavel = gavelGroup;
        this._group.add(gavelGroup);
    }

    _buildBookshelf() {
        // Small bookshelf with law books on the back wall
        const shelfGroup = new THREE.Group();
        shelfGroup.position.set(-0.9, 0, -1.0);

        // Shelf frame (two vertical sides + shelves)
        const sideMat = new THREE.MeshStandardMaterial({
            color: 0x5D3A1A,
            roughness: 0.6,
            metalness: 0.1
        });

        // Sides
        for (const xOff of [-0.35, 0.35]) {
            const sideGeo = new THREE.BoxGeometry(0.03, 1.2, 0.2);
            const side = new THREE.Mesh(sideGeo, sideMat);
            side.position.set(xOff, 0.6, 0);
            shelfGroup.add(side);
        }

        // Shelves (3 levels)
        for (let i = 0; i < 3; i++) {
            const shelfGeo = new THREE.BoxGeometry(0.7, 0.02, 0.2);
            const shelf = new THREE.Mesh(shelfGeo, sideMat.clone());
            shelf.position.y = 0.1 + i * 0.4;
            shelfGroup.add(shelf);

            // Books on each shelf
            const bookCount = 3 + Math.floor(Math.random() * 3);
            for (let b = 0; b < bookCount; b++) {
                const bookH = 0.2 + Math.random() * 0.15;
                const bookW = 0.04 + Math.random() * 0.03;
                const bookGeo = new THREE.BoxGeometry(bookW, bookH, 0.14);
                const bookColors = [0x8B0000, 0x00008B, 0x006400, 0x4B0082, 0x8B4513];
                const bookMat = new THREE.MeshStandardMaterial({
                    color: bookColors[Math.floor(Math.random() * bookColors.length)],
                    roughness: 0.7,
                    metalness: 0.1
                });
                const book = new THREE.Mesh(bookGeo, bookMat);
                book.position.set(-0.25 + b * 0.1, 0.12 + i * 0.4 + bookH / 2, 0);
                shelfGroup.add(book);
            }
        }

        this._group.add(shelfGroup);
    }

    _buildStamp() {
        // Approval stamp on the desk
        const stampGroup = new THREE.Group();
        stampGroup.position.set(0.3, 0.66, 0.3);

        // Stamp body
        const bodyGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.08, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: STAMP_COLOR,
            roughness: 0.5,
            metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.04;
        stampGroup.add(body);

        // Stamp handle
        const handleGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.06, 6);
        const handleMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.6,
            metalness: 0.4
        });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.y = 0.11;
        stampGroup.add(handle);

        this._group.add(stampGroup);
    }

    /**
     * @param {number} delta
     */
    update(delta) {
        this._timer += delta;

        // Periodic gavel slam animation
        if (!this._gaveling && Math.random() < delta * 0.05) {
            this._gaveling = true;
            this._gavelTimer = 0;
            this._metrics.rulings++;
        }

        if (this._gaveling && this._gavelArmPivot) {
            this._gavelTimer += delta;
            const slamDuration = 0.5;
            const progress = Math.min(this._gavelTimer / slamDuration, 1.0);

            if (progress < 0.4) {
                // Raise
                this._gavelArmPivot.rotation.z = (progress / 0.4) * 0.8;
            } else if (progress < 0.6) {
                // Slam down
                const slamP = (progress - 0.4) / 0.2;
                this._gavelArmPivot.rotation.z = 0.8 * (1 - slamP);
            } else {
                // Rest
                this._gavelArmPivot.rotation.z = 0;
                this._gaveling = false;
            }
        }

        // Slowly process documents
        this._metrics.documentsReviewed += delta * 0.2;
    }

    /**
     * @returns {object}
     */
    getMetrics() {
        return {
            documentsReviewed: Math.floor(this._metrics.documentsReviewed),
            compliance: this._metrics.compliance,
            pendingCases: this._metrics.pendingCases,
            rulings: this._metrics.rulings
        };
    }

    dispose() {
        if (this._group) {
            this._group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this._group.removeFromParent();
        }
    }
}
