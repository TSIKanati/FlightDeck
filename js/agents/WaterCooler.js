/**
 * WaterCooler - Floor 2 Agent Conversation System for The Highrise
 * Water cooler gathering point with floating tip bubbles, coffee-break
 * animations, and cross-project tip sharing.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

// ---- Constants ----
const WATER_COOLER_FLOOR = 2;
const GATHER_RADIUS      = 2.5;
const MAX_GATHERED       = 6;
const TIP_DISPLAY_TIME   = 5.0;  // seconds per tip
const TIP_FADE_TIME      = 0.8;
const ARRIVAL_INTERVAL   = 3.0;  // seconds between agent arrivals
const BREAK_DURATION     = 15.0; // seconds for a full coffee break
const GATHER_POSITIONS   = [];   // pre-computed circle seats

// Pre-compute gathering positions in a circle
for (let i = 0; i < MAX_GATHERED; i++) {
    const angle = (i / MAX_GATHERED) * Math.PI * 2;
    GATHER_POSITIONS.push(new THREE.Vector3(
        Math.cos(angle) * GATHER_RADIUS,
        0,
        Math.sin(angle) * GATHER_RADIUS
    ));
}

// Tip/insight rotation
const TIPS = [
    "Always validate user input before processing",
    "Break complex tasks into smaller chunks",
    "Keep your documentation up to date",
    "Test edge cases, not just happy paths",
    "Code reviews catch 60% more bugs than testing alone",
    "Use semantic versioning for all releases",
    "Monitor your error rates in production",
    "Automate repetitive deployment steps",
    "Pair programming doubles knowledge spread",
    "Security is everyone's responsibility",
    "Profile before you optimize",
    "Write tests for bugs before fixing them",
    "Keep functions under 20 lines when possible",
    "Use meaningful variable names",
    "Cross-team communication prevents silos",
    "Ship small, ship often",
    "Technical debt compounds like interest",
    "Agents that network produce 40% more innovation",
    "Data-driven decisions beat gut feelings",
    "Accessibility is not optional"
];

/**
 * Create a text bubble sprite
 */
function createTipBubble(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Bubble background
    const radius = 16;
    const x = 8, y = 8, w = canvas.width - 16, h = canvas.height - 16;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    // Bubble tail (small triangle at bottom)
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 10, canvas.height - 8);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.lineTo(canvas.width / 2 + 10, canvas.height - 8);
    ctx.fill();

    // Text
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2C3E50';

    // Word wrap
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';
    for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        if (ctx.measureText(testLine).width > w - 20) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = 26;
    const startY = (canvas.height - lines.length * lineHeight) / 2;
    lines.forEach((line, i) => {
        ctx.fillText(line, canvas.width / 2, startY + i * lineHeight + lineHeight / 2);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthTest: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3.0, 0.75, 1);

    return { sprite, material, texture };
}


export class WaterCooler {
    /**
     * @param {THREE.Scene} scene
     * @param {import('./AgentManager.js').AgentManager} agentManager
     * @param {object} [options]
     * @param {number} [options.floorHeight]
     */
    constructor(scene, agentManager, options = {}) {
        this.scene = scene;
        this.agentManager = agentManager;
        this.floorHeight = options.floorHeight || 3;
        this.floorY = WATER_COOLER_FLOOR * this.floorHeight;

        /** @type {THREE.Group} */
        this.group = new THREE.Group();
        this.group.name = 'water-cooler';
        this.group.position.y = this.floorY;
        this.scene.add(this.group);

        /**
         * Agents currently gathered
         * @type {{ sprite: import('./AgentSprite.js').AgentSprite, seatIndex: number, timer: number }[]}
         */
        this._gathered = [];

        // Tip state
        this._currentTipIndex = 0;
        this._tipTimer = 0;
        this._tipBubble = null;

        // Break state
        this._breakActive = false;
        this._breakTimer = 0;
        this._arrivalTimer = 0;
        this._arrivalQueue = [];

        // Build 3D environment
        this._buildCooler();
        this._buildFloor();
        this._initTipBubble();
    }

    // ------------------------------------------------------------------
    //  Build
    // ------------------------------------------------------------------

    _buildCooler() {
        const coolerGroup = new THREE.Group();
        coolerGroup.name = 'cooler-object';

        // Body cylinder
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 12);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x5DADE2,
            transparent: true,
            opacity: 0.7,
            roughness: 0.3,
            metalness: 0.4
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        body.castShadow = true;
        coolerGroup.add(body);

        // Water tank sphere on top
        const tankGeo = new THREE.SphereGeometry(0.25, 16, 12);
        const tankMat = new THREE.MeshStandardMaterial({
            color: 0x85C1E9,
            transparent: true,
            opacity: 0.5,
            roughness: 0.2,
            metalness: 0.1
        });
        const tank = new THREE.Mesh(tankGeo, tankMat);
        tank.position.y = 1.1;
        coolerGroup.add(tank);

        // Base stand
        const baseGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.2, 8);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x95A5A6,
            roughness: 0.7,
            metalness: 0.3
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.1;
        coolerGroup.add(base);

        // Small spigot
        const spigotGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6);
        const spigotMat = new THREE.MeshStandardMaterial({ color: 0xC0392B, metalness: 0.8 });
        const spigot = new THREE.Mesh(spigotGeo, spigotMat);
        spigot.position.set(0.3, 0.55, 0);
        spigot.rotation.z = Math.PI / 2;
        coolerGroup.add(spigot);

        // Light on cooler
        const coolerLight = new THREE.PointLight(0x5DADE2, 0.3, 4);
        coolerLight.position.set(0, 1.3, 0);
        coolerGroup.add(coolerLight);

        this.group.add(coolerGroup);
        this._coolerGroup = coolerGroup;
    }

    _buildFloor() {
        // Floor disc for the social area
        const floorGeo = new THREE.CircleGeometry(GATHER_RADIUS + 1.5, 32);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x5DADE2,
            transparent: true,
            opacity: 0.1,
            roughness: 0.9
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.01;
        floor.receiveShadow = true;
        this.group.add(floor);

        // Seat markers (small discs at each gather position)
        for (const pos of GATHER_POSITIONS) {
            const seatGeo = new THREE.CircleGeometry(0.3, 12);
            const seatMat = new THREE.MeshStandardMaterial({
                color: 0x3498DB,
                transparent: true,
                opacity: 0.25,
                roughness: 0.8
            });
            const seat = new THREE.Mesh(seatGeo, seatMat);
            seat.rotation.x = -Math.PI / 2;
            seat.position.set(pos.x, 0.02, pos.z);
            this.group.add(seat);
        }
    }

    _initTipBubble() {
        const tip = createTipBubble(TIPS[0]);
        tip.sprite.position.set(0, 2.5, 0);
        this.group.add(tip.sprite);
        this._tipBubble = tip;
    }

    // ------------------------------------------------------------------
    //  Public API
    // ------------------------------------------------------------------

    /**
     * Start a coffee break - agents gather and share tips
     * @param {import('./AgentSprite.js').AgentSprite[]} [agents] - specific agents, or random selection
     */
    startBreak(agents) {
        if (this._breakActive) return;

        this._breakActive = true;
        this._breakTimer = 0;
        this._arrivalTimer = 0;

        // Build arrival queue
        if (agents && agents.length > 0) {
            this._arrivalQueue = agents.slice(0, MAX_GATHERED);
        } else {
            // Pull random agents from different floors (cross-project sharing)
            const all = this.agentManager.getAllAgents();
            const shuffled = all.sort(() => Math.random() - 0.5);
            this._arrivalQueue = shuffled.slice(0, Math.min(MAX_GATHERED, shuffled.length));
        }

        eventBus.emit('watercooler:breakStarted', {
            agentCount: this._arrivalQueue.length
        });
    }

    /**
     * End the current coffee break - agents leave
     */
    endBreak() {
        for (const g of this._gathered) {
            // Return agents to their floors
            g.sprite.setState('idle');
        }
        this._gathered = [];
        this._arrivalQueue = [];
        this._breakActive = false;

        eventBus.emit('watercooler:breakEnded');
    }

    /**
     * Get the current displayed tip text
     * @returns {string}
     */
    getCurrentTip() {
        return TIPS[this._currentTipIndex];
    }

    /**
     * Get all tips
     * @returns {string[]}
     */
    getAllTips() {
        return [...TIPS];
    }

    // ------------------------------------------------------------------
    //  Update
    // ------------------------------------------------------------------

    /**
     * @param {number} delta
     */
    update(delta) {
        // Animate cooler (gentle pulse on tank)
        if (this._coolerGroup) {
            const pulse = 1.0 + Math.sin(Date.now() * 0.002) * 0.03;
            this._coolerGroup.children[1].scale.setScalar(pulse);
        }

        // Tip rotation
        this._updateTips(delta);

        // Coffee break logic
        if (this._breakActive) {
            this._updateBreak(delta);
        }
    }

    _updateTips(delta) {
        this._tipTimer += delta;

        const tipPhase = this._tipTimer % (TIP_DISPLAY_TIME + TIP_FADE_TIME * 2);

        if (tipPhase < TIP_FADE_TIME) {
            // Fading in
            this._tipBubble.material.opacity = tipPhase / TIP_FADE_TIME;
        } else if (tipPhase < TIP_DISPLAY_TIME + TIP_FADE_TIME) {
            // Fully visible
            this._tipBubble.material.opacity = 1.0;
        } else {
            // Fading out
            const fadeProgress = (tipPhase - TIP_DISPLAY_TIME - TIP_FADE_TIME) / TIP_FADE_TIME;
            this._tipBubble.material.opacity = 1.0 - fadeProgress;
        }

        // Advance to next tip at end of cycle
        const cycleLength = TIP_DISPLAY_TIME + TIP_FADE_TIME * 2;
        const prevCycle = Math.floor((this._tipTimer - delta) / cycleLength);
        const currCycle = Math.floor(this._tipTimer / cycleLength);
        if (currCycle > prevCycle) {
            this._currentTipIndex = (this._currentTipIndex + 1) % TIPS.length;
            this._refreshTipTexture();
        }

        // Gentle float
        this._tipBubble.sprite.position.y = 2.5 + Math.sin(this._tipTimer * 0.8) * 0.1;
    }

    _refreshTipTexture() {
        // Dispose old and create new
        if (this._tipBubble.texture) this._tipBubble.texture.dispose();

        const newTip = createTipBubble(TIPS[this._currentTipIndex]);
        this._tipBubble.sprite.material = newTip.material;
        this._tipBubble.material = newTip.material;
        this._tipBubble.texture = newTip.texture;
    }

    _updateBreak(delta) {
        this._breakTimer += delta;

        // Arrival phase: agents arrive one by one
        if (this._arrivalQueue.length > 0) {
            this._arrivalTimer += delta;
            if (this._arrivalTimer >= ARRIVAL_INTERVAL) {
                this._arrivalTimer = 0;
                this._arriveAgent();
            }
        }

        // Animate gathered agents - face center
        for (const g of this._gathered) {
            const pos = g.sprite.group.position;
            const angle = Math.atan2(-pos.z + this.group.position.z, -pos.x + this.group.position.x);
            g.sprite.group.rotation.y = angle;
        }

        // Auto-end break after duration
        if (this._breakTimer >= BREAK_DURATION) {
            this.endBreak();
        }
    }

    _arriveAgent() {
        if (this._arrivalQueue.length === 0) return;

        const sprite = this._arrivalQueue.shift();
        const seatIndex = this._gathered.length % MAX_GATHERED;
        const seatPos = GATHER_POSITIONS[seatIndex].clone();
        seatPos.y = this.floorY + 0.05;
        seatPos.x += this.group.position.x;
        seatPos.z += this.group.position.z;

        sprite.moveTo(seatPos);
        sprite.setState('meeting');

        this._gathered.push({
            sprite,
            seatIndex,
            timer: 0
        });

        eventBus.emit('watercooler:agentArrived', {
            id: sprite.id,
            seat: seatIndex,
            total: this._gathered.length
        });
    }

    // ------------------------------------------------------------------
    //  Cleanup
    // ------------------------------------------------------------------

    dispose() {
        if (this._tipBubble) {
            if (this._tipBubble.texture) this._tipBubble.texture.dispose();
            this._tipBubble.material.dispose();
            this._tipBubble.sprite.removeFromParent();
        }
        this._gathered = [];
        this._arrivalQueue = [];
        this.group.removeFromParent();
    }
}
