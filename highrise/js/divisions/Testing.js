/**
 * Testing Division - Test racks (box grids), red/green status lights
 * Renders QA-themed 3D objects for a division zone.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

const DIVISION_COLOR = 0xE74C3C;
const PASS_COLOR     = 0x2ECC71;
const FAIL_COLOR     = 0xE74C3C;
const PENDING_COLOR  = 0xF1C40F;
const RACK_ROWS      = 3;
const RACK_COLS      = 4;
const CELL_SIZE      = 0.18;
const CELL_GAP       = 0.04;

export class TestingDivision {
    constructor() {
        /** @type {THREE.Group|null} */
        this._group = null;
        /** @type {{ mesh: THREE.Mesh, mat: THREE.MeshStandardMaterial, status: string }[]} */
        this._testCells = [];
        /** @type {{ light: THREE.Mesh, mat: THREE.MeshBasicMaterial }[]} */
        this._statusLights = [];
        this._timer = 0;
        this._nextFlip = 1.0; // seconds until next random status change

        this._metrics = {
            passed: 0,
            failed: 0,
            pending: 0,
            totalRuns: 0
        };
    }

    /**
     * @param {THREE.Vector3} position
     * @returns {THREE.Group}
     */
    create(position) {
        this._group = new THREE.Group();
        this._group.name = 'div-testing';
        this._group.position.copy(position);

        this._buildTestRack();
        this._buildStatusLightBar();
        this._buildTerminal();

        return this._group;
    }

    _buildTestRack() {
        // Back panel
        const panelGeo = new THREE.BoxGeometry(
            RACK_COLS * (CELL_SIZE + CELL_GAP) + CELL_GAP + 0.1,
            RACK_ROWS * (CELL_SIZE + CELL_GAP) + CELL_GAP + 0.1,
            0.04
        );
        const panelMat = new THREE.MeshStandardMaterial({
            color: 0x2C3E50,
            roughness: 0.6,
            metalness: 0.4
        });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(0, 1.2, -1.2);
        this._group.add(panel);

        // Test cells (grid of small boxes with colored status)
        const startX = -((RACK_COLS - 1) * (CELL_SIZE + CELL_GAP)) / 2;
        const startY = 1.2 + ((RACK_ROWS - 1) * (CELL_SIZE + CELL_GAP)) / 2;

        for (let row = 0; row < RACK_ROWS; row++) {
            for (let col = 0; col < RACK_COLS; col++) {
                const status = Math.random() > 0.3 ? 'pass' : (Math.random() > 0.5 ? 'fail' : 'pending');
                const color = status === 'pass' ? PASS_COLOR : (status === 'fail' ? FAIL_COLOR : PENDING_COLOR);

                const cellGeo = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, 0.06);
                const cellMat = new THREE.MeshStandardMaterial({
                    color,
                    emissive: color,
                    emissiveIntensity: 0.3,
                    roughness: 0.3,
                    metalness: 0.2
                });
                const cell = new THREE.Mesh(cellGeo, cellMat);

                const x = startX + col * (CELL_SIZE + CELL_GAP);
                const y = startY - row * (CELL_SIZE + CELL_GAP);
                cell.position.set(x, y, -1.17);
                this._group.add(cell);

                this._testCells.push({ mesh: cell, mat: cellMat, status });
            }
        }
    }

    _buildStatusLightBar() {
        // Row of 5 status lights below the rack
        const lightCount = 5;
        const spacing = 0.35;
        const startX = -((lightCount - 1) * spacing) / 2;

        for (let i = 0; i < lightCount; i++) {
            const geo = new THREE.SphereGeometry(0.06, 8, 6);
            const isOn = Math.random() > 0.4;
            const color = isOn ? PASS_COLOR : FAIL_COLOR;
            const mat = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: isOn ? 0.9 : 0.3
            });
            const light = new THREE.Mesh(geo, mat);
            light.position.set(startX + i * spacing, 0.8, -1.15);
            this._group.add(light);
            this._statusLights.push({ light, mat });
        }
    }

    _buildTerminal() {
        // Small monitor/terminal on a desk
        // Monitor
        const monGeo = new THREE.BoxGeometry(0.6, 0.4, 0.04);
        const monMat = new THREE.MeshStandardMaterial({
            color: 0x1A1A2E,
            emissive: 0x2ECC71,
            emissiveIntensity: 0.15,
            roughness: 0.2,
            metalness: 0.3
        });
        const monitor = new THREE.Mesh(monGeo, monMat);
        monitor.position.set(0.8, 0.9, -0.3);
        monitor.rotation.y = -0.3;
        this._group.add(monitor);

        // Monitor stand
        const standGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.25, 6);
        const standMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6 });
        const stand = new THREE.Mesh(standGeo, standMat);
        stand.position.set(0.8, 0.6, -0.3);
        this._group.add(stand);
    }

    /**
     * @param {number} delta
     */
    update(delta) {
        this._timer += delta;

        // Randomly flip a test cell status
        this._nextFlip -= delta;
        if (this._nextFlip <= 0) {
            this._nextFlip = 0.5 + Math.random() * 2.0;
            this._flipRandomCell();
        }

        // Pulse the test cells gently
        for (const cell of this._testCells) {
            const pulse = 0.25 + Math.sin(this._timer * 3 + Math.random()) * 0.1;
            cell.mat.emissiveIntensity = pulse;
        }

        // Blink status lights occasionally
        if (Math.random() < delta * 0.5) {
            const idx = Math.floor(Math.random() * this._statusLights.length);
            const sl = this._statusLights[idx];
            const isOn = sl.mat.opacity > 0.5;
            sl.mat.opacity = isOn ? 0.3 : 0.9;
            const newColor = isOn ? FAIL_COLOR : PASS_COLOR;
            sl.mat.color.setHex(newColor);
        }
    }

    _flipRandomCell() {
        if (this._testCells.length === 0) return;
        const idx = Math.floor(Math.random() * this._testCells.length);
        const cell = this._testCells[idx];

        // Cycle through statuses
        const statuses = ['pass', 'fail', 'pending'];
        const colors = { pass: PASS_COLOR, fail: FAIL_COLOR, pending: PENDING_COLOR };
        const currentIdx = statuses.indexOf(cell.status);
        cell.status = statuses[(currentIdx + 1) % statuses.length];
        const color = colors[cell.status];
        cell.mat.color.setHex(color);
        cell.mat.emissive.setHex(color);

        // Update metrics
        this._metrics.totalRuns++;
        if (cell.status === 'pass') this._metrics.passed++;
        else if (cell.status === 'fail') this._metrics.failed++;
        else this._metrics.pending++;
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
