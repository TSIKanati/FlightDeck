/**
 * Security Division - Monitor wall (grid of small planes), alert beacon
 * Renders security/surveillance-themed 3D objects for a division zone.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

const DIVISION_COLOR   = 0xC0392B;
const MONITOR_ROWS     = 2;
const MONITOR_COLS     = 3;
const MONITOR_WIDTH    = 0.45;
const MONITOR_HEIGHT   = 0.3;
const MONITOR_GAP      = 0.06;
const ALERT_COLOR      = 0xFF0000;
const SAFE_COLOR       = 0x2ECC71;
const SCAN_COLOR       = 0x3498DB;

export class SecurityDivision {
    constructor() {
        /** @type {THREE.Group|null} */
        this._group = null;
        /** @type {{ mesh: THREE.Mesh, mat: THREE.MeshStandardMaterial, feed: string }[]} */
        this._monitors = [];
        this._beacon = null;
        this._beaconMat = null;
        this._beaconLight = null;
        this._timer = 0;
        this._alertActive = false;
        this._alertTimer = 0;
        this._scanLine = null;
        this._scanMat = null;

        this._metrics = {
            threats: 0,
            scansCompleted: 0,
            alertLevel: 'green',
            uptime: 100
        };
    }

    /**
     * @param {THREE.Vector3} position
     * @returns {THREE.Group}
     */
    create(position) {
        this._group = new THREE.Group();
        this._group.name = 'div-security';
        this._group.position.copy(position);

        this._buildMonitorWall();
        this._buildAlertBeacon();
        this._buildSecurityDesk();
        this._buildScanLine();

        return this._group;
    }

    _buildMonitorWall() {
        // Back wall panel
        const wallW = MONITOR_COLS * (MONITOR_WIDTH + MONITOR_GAP) + MONITOR_GAP + 0.1;
        const wallH = MONITOR_ROWS * (MONITOR_HEIGHT + MONITOR_GAP) + MONITOR_GAP + 0.1;
        const wallGeo = new THREE.BoxGeometry(wallW, wallH, 0.04);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x1A1A2E,
            roughness: 0.6,
            metalness: 0.5
        });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(0, 1.2, -1.2);
        this._group.add(wall);

        // Monitor screens
        const feeds = ['Floor 15', 'Lobby', 'Server', 'Elevator', 'Roof', 'Parking'];
        const startX = -((MONITOR_COLS - 1) * (MONITOR_WIDTH + MONITOR_GAP)) / 2;
        const startY = 1.2 + ((MONITOR_ROWS - 1) * (MONITOR_HEIGHT + MONITOR_GAP)) / 2;

        let feedIdx = 0;
        for (let row = 0; row < MONITOR_ROWS; row++) {
            for (let col = 0; col < MONITOR_COLS; col++) {
                const monGeo = new THREE.PlaneGeometry(MONITOR_WIDTH, MONITOR_HEIGHT);
                const feedColor = Math.random() > 0.8 ? ALERT_COLOR : SCAN_COLOR;
                const monMat = new THREE.MeshStandardMaterial({
                    color: 0x0A0A1A,
                    emissive: feedColor,
                    emissiveIntensity: 0.2,
                    roughness: 0.1,
                    metalness: 0.0
                });
                const mon = new THREE.Mesh(monGeo, monMat);

                const x = startX + col * (MONITOR_WIDTH + MONITOR_GAP);
                const y = startY - row * (MONITOR_HEIGHT + MONITOR_GAP);
                mon.position.set(x, y, -1.17);
                this._group.add(mon);

                this._monitors.push({
                    mesh: mon,
                    mat: monMat,
                    feed: feeds[feedIdx % feeds.length]
                });
                feedIdx++;
            }
        }
    }

    _buildAlertBeacon() {
        // Rotating alert beacon on top of a small post
        const postGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.6, 6);
        const postMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7 });
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(1.0, 0.3, -1.0);
        this._group.add(post);

        // Beacon dome
        const beaconGeo = new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        this._beaconMat = new THREE.MeshBasicMaterial({
            color: SAFE_COLOR,
            transparent: true,
            opacity: 0.8
        });
        this._beacon = new THREE.Mesh(beaconGeo, this._beaconMat);
        this._beacon.position.set(1.0, 0.6, -1.0);
        this._group.add(this._beacon);

        // Beacon point light
        this._beaconLight = new THREE.PointLight(SAFE_COLOR, 0.3, 3);
        this._beaconLight.position.set(1.0, 0.7, -1.0);
        this._group.add(this._beaconLight);
    }

    _buildSecurityDesk() {
        // Small security console desk
        const deskGeo = new THREE.BoxGeometry(0.8, 0.5, 0.5);
        const deskMat = new THREE.MeshStandardMaterial({
            color: 0x2C3E50,
            roughness: 0.6,
            metalness: 0.4
        });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(-0.8, 0.25, 0.2);
        desk.castShadow = true;
        this._group.add(desk);

        // Keyboard area on desk
        const kbGeo = new THREE.BoxGeometry(0.4, 0.02, 0.15);
        const kbMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.3
        });
        const kb = new THREE.Mesh(kbGeo, kbMat);
        kb.position.set(-0.8, 0.51, 0.15);
        this._group.add(kb);
    }

    _buildScanLine() {
        // Horizontal scan line that sweeps across the monitor wall
        const lineGeo = new THREE.PlaneGeometry(
            MONITOR_COLS * (MONITOR_WIDTH + MONITOR_GAP),
            0.01
        );
        this._scanMat = new THREE.MeshBasicMaterial({
            color: SCAN_COLOR,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this._scanLine = new THREE.Mesh(lineGeo, this._scanMat);
        this._scanLine.position.set(0, 1.2, -1.16);
        this._group.add(this._scanLine);
    }

    /**
     * @param {number} delta
     */
    update(delta) {
        this._timer += delta;

        // Sweep scan line up and down
        if (this._scanLine) {
            const wallH = MONITOR_ROWS * (MONITOR_HEIGHT + MONITOR_GAP);
            const sweep = Math.sin(this._timer * 1.5);
            this._scanLine.position.y = 1.2 + sweep * wallH * 0.4;
            this._scanMat.opacity = 0.3 + Math.abs(sweep) * 0.4;
        }

        // Flicker monitors
        for (const mon of this._monitors) {
            if (Math.random() < delta * 0.3) {
                const flicker = 0.15 + Math.random() * 0.2;
                mon.mat.emissiveIntensity = flicker;
            }
        }

        // Random alert events
        if (!this._alertActive && Math.random() < delta * 0.02) {
            this._triggerAlert();
        }

        // Process active alert
        if (this._alertActive) {
            this._alertTimer += delta;
            // Flash beacon
            const flash = Math.sin(this._alertTimer * 8) > 0 ? 0.9 : 0.2;
            this._beaconMat.opacity = flash;
            this._beaconLight.intensity = flash * 0.8;

            // End alert after 5 seconds
            if (this._alertTimer >= 5.0) {
                this._endAlert();
            }
        }

        // Rotate beacon slowly when not alerting
        if (this._beacon && !this._alertActive) {
            this._beacon.rotation.y += delta * 2.0;
        }

        this._metrics.scansCompleted = Math.floor(this._timer / 3);
    }

    _triggerAlert() {
        this._alertActive = true;
        this._alertTimer = 0;
        this._beaconMat.color.setHex(ALERT_COLOR);
        this._beaconLight.color.setHex(ALERT_COLOR);
        this._metrics.threats++;
        this._metrics.alertLevel = 'red';

        // Flash all monitors red
        for (const mon of this._monitors) {
            mon.mat.emissive.setHex(ALERT_COLOR);
            mon.mat.emissiveIntensity = 0.4;
        }

        eventBus.emit('security:alert', {
            level: 'red',
            threats: this._metrics.threats
        });
    }

    _endAlert() {
        this._alertActive = false;
        this._beaconMat.color.setHex(SAFE_COLOR);
        this._beaconLight.color.setHex(SAFE_COLOR);
        this._beaconMat.opacity = 0.8;
        this._beaconLight.intensity = 0.3;
        this._metrics.alertLevel = 'green';

        // Restore monitor colors
        for (const mon of this._monitors) {
            mon.mat.emissive.setHex(SCAN_COLOR);
            mon.mat.emissiveIntensity = 0.2;
        }
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
