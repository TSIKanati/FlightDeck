/**
 * Production Division - Assembly line (conveyor belt), output counter
 * Renders production/factory-themed 3D objects for a division zone.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

const DIVISION_COLOR    = 0x2ECC71;
const CONVEYOR_LENGTH   = 2.2;
const CONVEYOR_WIDTH    = 0.5;
const CONVEYOR_HEIGHT   = 0.06;
const CONVEYOR_SPEED    = 0.8; // units per second
const ITEM_SPAWN_RATE   = 2.0; // seconds between items
const MAX_ITEMS         = 6;

export class ProductionDivision {
    constructor() {
        /** @type {THREE.Group|null} */
        this._group = null;
        this._timer = 0;
        this._spawnTimer = 0;

        /** @type {{ mesh: THREE.Mesh, progress: number }[]} */
        this._conveyorItems = [];

        this._counterValue = 0;
        this._counterSprite = null;
        this._counterCtx = null;
        this._counterCanvas = null;
        this._counterTexture = null;

        this._metrics = {
            produced: 0,
            throughput: 0,
            efficiency: 95.5
        };
    }

    /**
     * @param {THREE.Vector3} position
     * @returns {THREE.Group}
     */
    create(position) {
        this._group = new THREE.Group();
        this._group.name = 'div-production';
        this._group.position.copy(position);

        this._buildConveyor();
        this._buildOutputCounter();
        this._buildMachinery();

        return this._group;
    }

    _buildConveyor() {
        // Conveyor belt base
        const beltGeo = new THREE.BoxGeometry(CONVEYOR_LENGTH, CONVEYOR_HEIGHT, CONVEYOR_WIDTH);
        const beltMat = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.8,
            metalness: 0.3
        });
        const belt = new THREE.Mesh(beltGeo, beltMat);
        belt.position.set(0, 0.5, -0.6);
        belt.receiveShadow = true;
        this._group.add(belt);

        // Belt surface (darker strip pattern)
        const surfaceGeo = new THREE.PlaneGeometry(CONVEYOR_LENGTH, CONVEYOR_WIDTH);
        const surfaceMat = new THREE.MeshStandardMaterial({
            color: 0x2C3E50,
            roughness: 0.9,
            metalness: 0.1
        });
        const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
        surface.rotation.x = -Math.PI / 2;
        surface.position.set(0, 0.531, -0.6);
        this._group.add(surface);

        // Side rails
        for (const zOff of [-0.3, 0.3]) {
            const railGeo = new THREE.BoxGeometry(CONVEYOR_LENGTH + 0.1, 0.12, 0.03);
            const railMat = new THREE.MeshStandardMaterial({
                color: 0xBDC3C7,
                roughness: 0.3,
                metalness: 0.7
            });
            const rail = new THREE.Mesh(railGeo, railMat);
            rail.position.set(0, 0.56, -0.6 + zOff);
            this._group.add(rail);
        }

        // Support legs
        const legGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.5, 6);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.6 });
        for (const xOff of [-0.9, 0, 0.9]) {
            for (const zOff of [-0.6]) {
                const leg = new THREE.Mesh(legGeo, legMat);
                leg.position.set(xOff, 0.25, zOff);
                this._group.add(leg);
            }
        }
    }

    _buildOutputCounter() {
        // Digital output counter display
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        this._counterCanvas = canvas;
        this._counterCtx = canvas.getContext('2d');
        this._updateCounterDisplay(0);

        this._counterTexture = new THREE.CanvasTexture(canvas);

        const counterMat = new THREE.SpriteMaterial({
            map: this._counterTexture,
            transparent: true,
            depthTest: false
        });

        this._counterSprite = new THREE.Sprite(counterMat);
        this._counterSprite.scale.set(0.8, 0.4, 1);
        this._counterSprite.position.set(1.3, 1.0, -0.6);
        this._group.add(this._counterSprite);

        // Counter backing box
        const backGeo = new THREE.BoxGeometry(0.6, 0.3, 0.05);
        const backMat = new THREE.MeshStandardMaterial({
            color: 0x1A1A2E,
            roughness: 0.4,
            metalness: 0.5
        });
        const back = new THREE.Mesh(backGeo, backMat);
        back.position.set(1.3, 1.0, -0.62);
        this._group.add(back);
    }

    _updateCounterDisplay(count) {
        const ctx = this._counterCtx;
        ctx.clearRect(0, 0, 128, 64);

        ctx.fillStyle = '#1A1A2E';
        ctx.fillRect(0, 0, 128, 64);

        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#2ECC71';
        ctx.fillText(String(count).padStart(5, '0'), 64, 24);

        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#95A5A6';
        ctx.fillText('OUTPUT', 64, 50);

        if (this._counterTexture) {
            this._counterTexture.needsUpdate = true;
        }
    }

    _buildMachinery() {
        // Small machine at the start of conveyor (input)
        const machGeo = new THREE.BoxGeometry(0.4, 0.5, 0.5);
        const machMat = new THREE.MeshStandardMaterial({
            color: DIVISION_COLOR,
            roughness: 0.5,
            metalness: 0.4
        });
        const machine = new THREE.Mesh(machGeo, machMat);
        machine.position.set(-1.2, 0.75, -0.6);
        machine.castShadow = true;
        this._group.add(machine);

        // Small indicator light on machine
        const indicGeo = new THREE.SphereGeometry(0.04, 8, 6);
        const indicMat = new THREE.MeshBasicMaterial({ color: DIVISION_COLOR });
        this._indicatorLight = new THREE.Mesh(indicGeo, indicMat);
        this._indicatorLight.position.set(-1.2, 1.05, -0.45);
        this._group.add(this._indicatorLight);
    }

    /**
     * @param {number} delta
     */
    update(delta) {
        this._timer += delta;
        this._spawnTimer += delta;

        // Spawn items on conveyor
        if (this._spawnTimer >= ITEM_SPAWN_RATE && this._conveyorItems.length < MAX_ITEMS) {
            this._spawnTimer = 0;
            this._spawnItem();
        }

        // Move conveyor items
        for (let i = this._conveyorItems.length - 1; i >= 0; i--) {
            const item = this._conveyorItems[i];
            item.progress += (CONVEYOR_SPEED * delta) / CONVEYOR_LENGTH;

            // Position along conveyor (left to right)
            const x = -CONVEYOR_LENGTH / 2 + item.progress * CONVEYOR_LENGTH;
            item.mesh.position.x = x;
            item.mesh.rotation.y += delta * 2;

            // Remove when off the end
            if (item.progress >= 1.0) {
                this._group.remove(item.mesh);
                item.mesh.geometry.dispose();
                item.mesh.material.dispose();
                this._conveyorItems.splice(i, 1);

                this._counterValue++;
                this._updateCounterDisplay(this._counterValue);
                this._metrics.produced = this._counterValue;
            }
        }

        // Blink indicator light
        if (this._indicatorLight) {
            this._indicatorLight.material.opacity =
                Math.sin(this._timer * 4) > 0 ? 1.0 : 0.2;
        }

        // Throughput calculation
        this._metrics.throughput = this._counterValue / Math.max(this._timer, 1);
    }

    _spawnItem() {
        // Random small product shape
        const shapes = [
            new THREE.BoxGeometry(0.12, 0.12, 0.12),
            new THREE.SphereGeometry(0.07, 8, 6),
            new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8)
        ];
        const geo = shapes[Math.floor(Math.random() * shapes.length)];
        const mat = new THREE.MeshStandardMaterial({
            color: DIVISION_COLOR,
            emissive: DIVISION_COLOR,
            emissiveIntensity: 0.15,
            roughness: 0.5,
            metalness: 0.3
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(-CONVEYOR_LENGTH / 2, 0.62, -0.6);
        mesh.castShadow = true;
        this._group.add(mesh);

        this._conveyorItems.push({ mesh, progress: 0 });
    }

    /**
     * @returns {object}
     */
    getMetrics() {
        return { ...this._metrics };
    }

    dispose() {
        for (const item of this._conveyorItems) {
            item.mesh.geometry.dispose();
            item.mesh.material.dispose();
        }
        if (this._counterTexture) this._counterTexture.dispose();
        if (this._group) {
            this._group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
            this._group.removeFromParent();
        }
    }
}
