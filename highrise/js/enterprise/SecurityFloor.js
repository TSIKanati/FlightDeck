/**
 * SecurityFloor.js - Floor 19: Enterprise Security Monitoring
 * The Highrise 3D Command Center
 *
 * High-tech security operations center featuring:
 * - 4x3 grid of surveillance monitor screens with cycling colors
 * - Traffic-light threat level indicator (green / yellow / red)
 * - Scrolling audit log ticker
 * - Translucent firewall dome
 * - Security agent workstation with multiple monitors
 * - Ceiling alert beacon that flashes red during alerts
 */

import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLOOR_WIDTH = 20;
const FLOOR_DEPTH = 14;
const FLOOR_HEIGHT = 4;

const MONITOR_COLS = 4;
const MONITOR_ROWS = 3;
const MONITOR_WIDTH = 1.6;
const MONITOR_HEIGHT = 1.0;
const MONITOR_GAP = 0.15;

const THREAT_LEVELS = { green: 0, yellow: 1, red: 2 };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _makeLabelSprite(text, position, scale = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 512, 64);
    ctx.fillStyle = '#88ddaa';
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

// ---------------------------------------------------------------------------
// SecurityFloor Class
// ---------------------------------------------------------------------------

export class SecurityFloor {
    constructor() {
        /** @type {THREE.Group|null} */
        this.group = null;

        /** @type {THREE.Mesh[]} */
        this._monitors = [];

        /** @type {THREE.Mesh[]} - [green, yellow, red] spheres */
        this._threatLights = [];
        this._currentThreatLevel = 0; // 0=green, 1=yellow, 2=red

        /** @type {THREE.Sprite|null} */
        this._tickerSprite = null;
        this._tickerOffset = 0;
        this._auditMessages = [
            'AUTH_OK user:admin src:10.0.0.1',
            'SCAN_COMPLETE ports:443,80,22 status:CLEAN',
            'FIREWALL rule:ALLOW dst:api.tsi.com',
            'LOGIN user:operator ip:192.168.1.40',
            'ALERT intrusion_attempt blocked src:unknown',
            'PATCH applied: CVE-2026-0412 status:RESOLVED',
            'CERT renewed: *.tsi.com expires:2027-02-11',
        ];
        this._currentMessage = 0;

        /** @type {THREE.Mesh|null} */
        this._firewallDome = null;

        /** @type {THREE.Mesh|null} */
        this._alertBeacon = null;
        this._alertActive = false;
        this._alertFlashTimer = 0;

        this._elapsed = 0;
        this._monitorCycleTimer = 0;
    }

    // -----------------------------------------------------------------------
    // create
    // -----------------------------------------------------------------------

    create(parentGroup) {
        this.group = new THREE.Group();
        this.group.name = 'Security_Floor19';

        this._createFloorBase();
        this._createMonitorWall();
        this._createThreatIndicator();
        this._createAuditTicker();
        this._createFirewallDome();
        this._createSecurityDesk();
        this._createAlertBeacon();
        this._createAmbientDetails();

        parentGroup.add(this.group);

        eventBus.emit('floor:created', { floor: 19, name: 'Security' });

        return this.group;
    }

    // -----------------------------------------------------------------------
    // Geometry builders (private)
    // -----------------------------------------------------------------------

    _createFloorBase() {
        const geo = new THREE.BoxGeometry(FLOOR_WIDTH, 0.15, FLOOR_DEPTH);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x0a0e18,
            roughness: 0.4,
            metalness: 0.5,
        });
        const floor = new THREE.Mesh(geo, mat);
        floor.receiveShadow = true;
        this.group.add(floor);

        const ceiling = new THREE.Mesh(
            new THREE.BoxGeometry(FLOOR_WIDTH, 0.1, FLOOR_DEPTH),
            new THREE.MeshStandardMaterial({ color: 0x080a12, roughness: 0.9 })
        );
        ceiling.position.y = FLOOR_HEIGHT;
        this.group.add(ceiling);

        // Dim ambient for security atmosphere
        const dimLight = new THREE.PointLight(0x334466, 0.4, 18);
        dimLight.position.set(0, 3.5, 0);
        this.group.add(dimLight);
    }

    _createMonitorWall() {
        const totalW = MONITOR_COLS * (MONITOR_WIDTH + MONITOR_GAP) - MONITOR_GAP;
        const totalH = MONITOR_ROWS * (MONITOR_HEIGHT + MONITOR_GAP) - MONITOR_GAP;
        const startX = -totalW / 2 + MONITOR_WIDTH / 2;
        const startY = FLOOR_HEIGHT / 2 - totalH / 2 + MONITOR_HEIGHT / 2 + 0.3;

        const screenGeo = new THREE.PlaneGeometry(MONITOR_WIDTH, MONITOR_HEIGHT);

        const screenColors = [
            0x003344, 0x004433, 0x223344, 0x112244,
            0x003322, 0x112233, 0x002244, 0x004422,
            0x113333, 0x003344, 0x224433, 0x002233,
        ];

        for (let row = 0; row < MONITOR_ROWS; row++) {
            for (let col = 0; col < MONITOR_COLS; col++) {
                const i = row * MONITOR_COLS + col;
                const mat = new THREE.MeshStandardMaterial({
                    color: screenColors[i],
                    emissive: screenColors[i],
                    emissiveIntensity: 0.6,
                    side: THREE.DoubleSide,
                });

                const screen = new THREE.Mesh(screenGeo, mat);
                screen.position.set(
                    startX + col * (MONITOR_WIDTH + MONITOR_GAP),
                    startY + row * (MONITOR_HEIGHT + MONITOR_GAP),
                    -FLOOR_DEPTH / 2 + 0.2
                );
                screen.castShadow = false;
                this.group.add(screen);
                this._monitors.push(screen);
            }
        }

        // Monitor wall frame
        const frameGeo = new THREE.BoxGeometry(totalW + 0.3, totalH + 0.3, 0.06);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.8 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, FLOOR_HEIGHT / 2 + 0.3, -FLOOR_DEPTH / 2 + 0.12);
        this.group.add(frame);
    }

    _createThreatIndicator() {
        const housingGeo = new THREE.BoxGeometry(0.7, 2.6, 0.5);
        const housingMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, metalness: 0.6 });
        const housing = new THREE.Mesh(housingGeo, housingMat);
        housing.position.set(FLOOR_WIDTH / 2 - 1.5, 1.5, -FLOOR_DEPTH / 2 + 0.5);
        this.group.add(housing);

        const sphereGeo = new THREE.SphereGeometry(0.22, 16, 16);

        // Red (top)
        const redMat = new THREE.MeshStandardMaterial({ color: 0x331111, emissive: 0x110000, emissiveIntensity: 0.2 });
        const red = new THREE.Mesh(sphereGeo, redMat);
        red.position.set(FLOOR_WIDTH / 2 - 1.5, 2.3, -FLOOR_DEPTH / 2 + 0.7);
        this.group.add(red);
        this._threatLights[2] = red;

        // Yellow (middle)
        const yellowMat = new THREE.MeshStandardMaterial({ color: 0x332211, emissive: 0x111000, emissiveIntensity: 0.2 });
        const yellow = new THREE.Mesh(sphereGeo, yellowMat);
        yellow.position.set(FLOOR_WIDTH / 2 - 1.5, 1.6, -FLOOR_DEPTH / 2 + 0.7);
        this.group.add(yellow);
        this._threatLights[1] = yellow;

        // Green (bottom)
        const greenMat = new THREE.MeshStandardMaterial({ color: 0x113311, emissive: 0x001100, emissiveIntensity: 0.2 });
        const green = new THREE.Mesh(sphereGeo, greenMat);
        green.position.set(FLOOR_WIDTH / 2 - 1.5, 0.9, -FLOOR_DEPTH / 2 + 0.7);
        this.group.add(green);
        this._threatLights[0] = green;

        // Start at green
        this.setThreatLevel('green');
    }

    _createAuditTicker() {
        this._tickerSprite = _makeLabelSprite(
            this._auditMessages[0],
            new THREE.Vector3(0, 0.4, -FLOOR_DEPTH / 2 + 0.3),
            1.2
        );
        this.group.add(this._tickerSprite);
    }

    _createFirewallDome() {
        const domeGeo = new THREE.SphereGeometry(5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshStandardMaterial({
            color: 0x2266aa,
            emissive: 0x112244,
            emissiveIntensity: 0.15,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            wireframe: false,
        });
        this._firewallDome = new THREE.Mesh(domeGeo, domeMat);
        this._firewallDome.position.set(0, 0.1, 0);
        this.group.add(this._firewallDome);

        // Wireframe overlay for the dome
        const wireGeo = new THREE.SphereGeometry(5.02, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x3388cc,
            wireframe: true,
            transparent: true,
            opacity: 0.15,
        });
        const wireOverlay = new THREE.Mesh(wireGeo, wireMat);
        wireOverlay.position.copy(this._firewallDome.position);
        this.group.add(wireOverlay);
    }

    _createSecurityDesk() {
        // Main desk
        const deskGeo = new THREE.BoxGeometry(3, 0.9, 1.4);
        const deskMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.4,
            metalness: 0.6,
        });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(4, 0.55, 2);
        desk.castShadow = true;
        this.group.add(desk);

        // Multiple small monitor screens on desk
        const monGeo = new THREE.PlaneGeometry(0.6, 0.45);
        const monColors = [0x003322, 0x002244, 0x113322];

        for (let i = 0; i < 3; i++) {
            const monMat = new THREE.MeshStandardMaterial({
                color: monColors[i],
                emissive: monColors[i],
                emissiveIntensity: 0.7,
            });
            const mon = new THREE.Mesh(monGeo, monMat);
            mon.position.set(3.3 + i * 0.7, 1.35, 1.6);
            mon.rotation.x = -0.15;
            this.group.add(mon);
        }

        // Chair
        const chairGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7);
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x222238 });
        const chair = new THREE.Mesh(chairGeo, chairMat);
        chair.position.set(4, 0.35, 3.2);
        this.group.add(chair);

        const chairBack = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.6, 0.1),
            chairMat
        );
        chairBack.position.set(4, 0.85, 3.55);
        this.group.add(chairBack);
    }

    _createAlertBeacon() {
        const beaconGeo = new THREE.ConeGeometry(0.3, 0.5, 8);
        const beaconMat = new THREE.MeshStandardMaterial({
            color: 0x440000,
            emissive: 0x220000,
            emissiveIntensity: 0.1,
        });
        this._alertBeacon = new THREE.Mesh(beaconGeo, beaconMat);
        this._alertBeacon.position.set(0, FLOOR_HEIGHT - 0.3, 0);
        this._alertBeacon.rotation.x = Math.PI; // Point downward
        this.group.add(this._alertBeacon);
    }

    _createAmbientDetails() {
        // Floor edge strip lighting
        const stripGeo = new THREE.BoxGeometry(FLOOR_WIDTH - 0.5, 0.03, 0.08);
        const stripMat = new THREE.MeshStandardMaterial({
            color: 0x224466,
            emissive: 0x113355,
            emissiveIntensity: 0.5,
        });

        const stripFront = new THREE.Mesh(stripGeo, stripMat);
        stripFront.position.set(0, 0.1, FLOOR_DEPTH / 2 - 0.15);
        this.group.add(stripFront);

        const stripBack = new THREE.Mesh(stripGeo, stripMat.clone());
        stripBack.position.set(0, 0.1, -FLOOR_DEPTH / 2 + 0.15);
        this.group.add(stripBack);
    }

    // -----------------------------------------------------------------------
    // update
    // -----------------------------------------------------------------------

    update(delta) {
        this._elapsed += delta;

        // Cycle monitor screen colors
        this._monitorCycleTimer += delta;
        if (this._monitorCycleTimer > 2.0) {
            this._monitorCycleTimer = 0;
            for (const monitor of this._monitors) {
                const hue = Math.random() * 0.3;
                const sat = 0.3 + Math.random() * 0.3;
                const light = 0.08 + Math.random() * 0.12;
                const color = new THREE.Color().setHSL(hue + 0.45, sat, light);
                monitor.material.color.copy(color);
                monitor.material.emissive.copy(color);
            }
        }

        // Pulse firewall dome
        if (this._firewallDome) {
            const pulse = 0.10 + Math.sin(this._elapsed * 1.5) * 0.04;
            this._firewallDome.material.opacity = pulse;
        }

        // Flash alert beacon when active
        if (this._alertActive && this._alertBeacon) {
            this._alertFlashTimer += delta;
            const flash = Math.sin(this._alertFlashTimer * 8) > 0;
            this._alertBeacon.material.emissive.setHex(flash ? 0xff2200 : 0x220000);
            this._alertBeacon.material.emissiveIntensity = flash ? 1.2 : 0.1;
        }

        // Scroll audit ticker
        this._tickerOffset += delta;
        if (this._tickerOffset > 3.0 && this._tickerSprite) {
            this._tickerOffset = 0;
            this._currentMessage = (this._currentMessage + 1) % this._auditMessages.length;
            this._updateTickerText(this._auditMessages[this._currentMessage]);
        }
    }

    /** Recreate ticker sprite texture with new text. */
    _updateTickerText(text) {
        if (!this._tickerSprite) return;
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 1024, 64);
        ctx.fillStyle = '#44ee88';
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 512, 32);

        const tex = new THREE.CanvasTexture(canvas);
        this._tickerSprite.material.map.dispose();
        this._tickerSprite.material.map = tex;
        this._tickerSprite.material.needsUpdate = true;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Set the current threat level.
     * @param {'green'|'yellow'|'red'} level
     */
    setThreatLevel(level) {
        const idx = THREAT_LEVELS[level];
        if (idx === undefined) return;

        this._currentThreatLevel = idx;

        const glowColors = [0x00ff44, 0xffcc00, 0xff2200];
        const dimColors = [0x112211, 0x221100, 0x220000];
        const emissiveColors = [0x00ff44, 0xffcc00, 0xff2200];

        for (let i = 0; i < 3; i++) {
            const light = this._threatLights[i];
            if (!light) continue;
            if (i === idx) {
                light.material.color.setHex(glowColors[i]);
                light.material.emissive.setHex(emissiveColors[i]);
                light.material.emissiveIntensity = 1.0;
            } else {
                light.material.color.setHex(dimColors[i]);
                light.material.emissive.setHex(dimColors[i]);
                light.material.emissiveIntensity = 0.15;
            }
        }

        eventBus.emit('security:threatLevel', { level, index: idx });
    }

    /**
     * Trigger or cancel alert mode.
     * @param {boolean} [active=true]
     */
    triggerAlert(active = true) {
        this._alertActive = active;
        this._alertFlashTimer = 0;

        if (!active && this._alertBeacon) {
            this._alertBeacon.material.emissive.setHex(0x220000);
            this._alertBeacon.material.emissiveIntensity = 0.1;
        }

        eventBus.emit('security:alert', { active });
    }
}

export default SecurityFloor;
