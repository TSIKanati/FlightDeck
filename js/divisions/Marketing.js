/**
 * Marketing Division - Billboard/presentation screen, campaign boards
 * Renders marketing-themed 3D objects for a division zone.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

const DIVISION_COLOR = 0xE67E22;

export class MarketingDivision {
    constructor() {
        /** @type {THREE.Group|null} */
        this._group = null;
        this._screenMat = null;
        this._timer = 0;
        this._campaignIndex = 0;

        // Simulated metrics
        this._metrics = {
            campaigns: 0,
            impressions: 0,
            engagement: 0
        };
    }

    /**
     * Create division objects at the given position
     * @param {THREE.Vector3} position
     * @returns {THREE.Group}
     */
    create(position) {
        this._group = new THREE.Group();
        this._group.name = 'div-marketing';
        this._group.position.copy(position);

        this._buildBillboard();
        this._buildCampaignBoards();
        this._buildPresenterPodium();

        return this._group;
    }

    _buildBillboard() {
        // Billboard frame
        const frameGeo = new THREE.BoxGeometry(1.8, 1.0, 0.05);
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.4,
            metalness: 0.6
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 1.5, -1.2);
        frame.castShadow = true;
        this._group.add(frame);

        // Screen (inner surface - emissive for "lit" effect)
        const screenGeo = new THREE.PlaneGeometry(1.6, 0.85);
        this._screenMat = new THREE.MeshStandardMaterial({
            color: DIVISION_COLOR,
            emissive: DIVISION_COLOR,
            emissiveIntensity: 0.4,
            roughness: 0.1,
            metalness: 0.0
        });
        const screen = new THREE.Mesh(screenGeo, this._screenMat);
        screen.position.set(0, 1.5, -1.17);
        this._group.add(screen);

        // Support posts
        for (const xOff of [-0.7, 0.7]) {
            const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6);
            const postMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 });
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(xOff, 0.75, -1.2);
            this._group.add(post);
        }
    }

    _buildCampaignBoards() {
        // Three small campaign card boards on the side wall
        const colors = [0xE74C3C, 0x3498DB, 0x2ECC71];
        for (let i = 0; i < 3; i++) {
            const boardGeo = new THREE.PlaneGeometry(0.5, 0.7);
            const boardMat = new THREE.MeshStandardMaterial({
                color: colors[i],
                emissive: colors[i],
                emissiveIntensity: 0.15,
                roughness: 0.3,
                side: THREE.DoubleSide
            });
            const board = new THREE.Mesh(boardGeo, boardMat);
            board.position.set(-1.0, 1.0 + i * 0.05, -0.3 + i * 0.55);
            board.rotation.y = Math.PI / 2;
            this._group.add(board);
        }
    }

    _buildPresenterPodium() {
        // Small podium/lectern
        const podiumGeo = new THREE.BoxGeometry(0.4, 0.8, 0.3);
        const podiumMat = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.6,
            metalness: 0.2
        });
        const podium = new THREE.Mesh(podiumGeo, podiumMat);
        podium.position.set(0.6, 0.4, -0.5);
        podium.castShadow = true;
        this._group.add(podium);
    }

    /**
     * @param {number} delta
     */
    update(delta) {
        this._timer += delta;

        // Pulse billboard screen
        if (this._screenMat) {
            const intensity = 0.3 + Math.sin(this._timer * 1.5) * 0.15;
            this._screenMat.emissiveIntensity = intensity;
        }

        // Slowly increment metrics
        this._metrics.impressions += delta * 10;
        this._metrics.engagement = Math.sin(this._timer * 0.2) * 30 + 50;
    }

    /**
     * @returns {object}
     */
    getMetrics() {
        return { ...this._metrics };
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
