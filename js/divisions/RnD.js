/**
 * R&D Division - Lab equipment (beakers), prototype area
 * Renders research-themed 3D objects for a division zone.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

const DIVISION_COLOR = 0x3498DB;
const BEAKER_COLORS  = [0x3498DB, 0x2ECC71, 0xF39C12, 0xE74C3C];

export class RnDDivision {
    constructor() {
        /** @type {THREE.Group|null} */
        this._group = null;
        this._beakers = [];
        this._bubbles = [];
        this._timer = 0;

        this._metrics = {
            experiments: 0,
            prototypes: 0,
            breakthroughs: 0
        };
    }

    /**
     * @param {THREE.Vector3} position
     * @returns {THREE.Group}
     */
    create(position) {
        this._group = new THREE.Group();
        this._group.name = 'div-rnd';
        this._group.position.copy(position);

        this._buildLabBench();
        this._buildBeakers();
        this._buildPrototypeArea();
        this._buildBubbles();

        return this._group;
    }

    _buildLabBench() {
        // Lab bench table
        const benchGeo = new THREE.BoxGeometry(2.0, 0.08, 0.8);
        const benchMat = new THREE.MeshStandardMaterial({
            color: 0xBDC3C7,
            roughness: 0.3,
            metalness: 0.5
        });
        const bench = new THREE.Mesh(benchGeo, benchMat);
        bench.position.set(0, 0.65, -0.8);
        bench.castShadow = true;
        bench.receiveShadow = true;
        this._group.add(bench);

        // Bench legs
        const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.65, 6);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.7 });
        for (const [lx, lz] of [[-0.8, -0.5], [0.8, -0.5], [-0.8, -1.1], [0.8, -1.1]]) {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(lx, 0.325, lz);
            this._group.add(leg);
        }
    }

    _buildBeakers() {
        // Beakers on the bench (cylinders with varying heights)
        const beakerSizes = [
            { r: 0.08, h: 0.25 },
            { r: 0.06, h: 0.35 },
            { r: 0.10, h: 0.20 },
            { r: 0.07, h: 0.30 }
        ];

        beakerSizes.forEach((size, i) => {
            // Glass beaker (cylinder)
            const beakerGeo = new THREE.CylinderGeometry(size.r, size.r * 0.9, size.h, 12, 1, true);
            const beakerMat = new THREE.MeshStandardMaterial({
                color: 0xECF0F1,
                transparent: true,
                opacity: 0.35,
                roughness: 0.1,
                metalness: 0.0,
                side: THREE.DoubleSide
            });
            const beaker = new THREE.Mesh(beakerGeo, beakerMat);

            // Liquid inside (slightly smaller solid cylinder)
            const liquidH = size.h * (0.4 + Math.random() * 0.4);
            const liquidGeo = new THREE.CylinderGeometry(size.r * 0.85, size.r * 0.80, liquidH, 12);
            const liquidMat = new THREE.MeshStandardMaterial({
                color: BEAKER_COLORS[i],
                transparent: true,
                opacity: 0.6,
                emissive: BEAKER_COLORS[i],
                emissiveIntensity: 0.2,
                roughness: 0.2
            });
            const liquid = new THREE.Mesh(liquidGeo, liquidMat);
            liquid.position.y = -(size.h - liquidH) / 2;

            const beakerGroup = new THREE.Group();
            beakerGroup.add(beaker);
            beakerGroup.add(liquid);

            const xPos = -0.6 + i * 0.4;
            beakerGroup.position.set(xPos, 0.69 + size.h / 2, -0.8);
            this._group.add(beakerGroup);

            this._beakers.push({ group: beakerGroup, liquidMat, baseY: 0.69 + size.h / 2 });
        });
    }

    _buildPrototypeArea() {
        // Prototype platform (slightly raised platform)
        const platGeo = new THREE.BoxGeometry(1.0, 0.05, 1.0);
        const platMat = new THREE.MeshStandardMaterial({
            color: DIVISION_COLOR,
            transparent: true,
            opacity: 0.25,
            roughness: 0.8
        });
        const platform = new THREE.Mesh(platGeo, platMat);
        platform.position.set(0, 0.025, 0.6);
        this._group.add(platform);

        // Wireframe "holographic" prototype object
        const protoGeo = new THREE.IcosahedronGeometry(0.25, 1);
        const protoMat = new THREE.MeshBasicMaterial({
            color: DIVISION_COLOR,
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });
        this._prototype = new THREE.Mesh(protoGeo, protoMat);
        this._prototype.position.set(0, 0.35, 0.6);
        this._group.add(this._prototype);
    }

    _buildBubbles() {
        // Small floating bubble particles above beakers
        const bubbleGeo = new THREE.SphereGeometry(0.02, 6, 4);
        for (let i = 0; i < 8; i++) {
            const color = BEAKER_COLORS[i % BEAKER_COLORS.length];
            const bubbleMat = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.5
            });
            const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
            bubble.position.set(
                -0.6 + Math.random() * 1.6,
                0.9 + Math.random() * 0.4,
                -0.8 + (Math.random() - 0.5) * 0.4
            );
            this._group.add(bubble);
            this._bubbles.push({
                mesh: bubble,
                speed: 0.2 + Math.random() * 0.3,
                phase: Math.random() * Math.PI * 2,
                baseY: bubble.position.y
            });
        }
    }

    /**
     * @param {number} delta
     */
    update(delta) {
        this._timer += delta;

        // Rotate prototype hologram
        if (this._prototype) {
            this._prototype.rotation.y += delta * 0.8;
            this._prototype.rotation.x += delta * 0.3;
        }

        // Bubble animation - float upward and reset
        for (const b of this._bubbles) {
            b.mesh.position.y += b.speed * delta;
            b.mesh.position.x += Math.sin(this._timer * 2 + b.phase) * 0.002;

            // Reset when too high
            if (b.mesh.position.y > b.baseY + 0.6) {
                b.mesh.position.y = b.baseY;
                b.mesh.material.opacity = 0.5;
            } else {
                // Fade as they rise
                const progress = (b.mesh.position.y - b.baseY) / 0.6;
                b.mesh.material.opacity = 0.5 * (1 - progress);
            }
        }

        // Gentle beaker liquid glow pulse
        for (const beaker of this._beakers) {
            beaker.liquidMat.emissiveIntensity = 0.15 + Math.sin(this._timer * 2 + Math.random()) * 0.1;
        }

        // Increment metrics
        this._metrics.experiments += delta * 0.1;
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
