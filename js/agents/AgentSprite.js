/**
 * AgentSprite - 3D agent character representation for The Highrise
 * Renders a simple humanoid using Three.js primitives with status indicators,
 * name labels, animations, trail effects, and glow lighting.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';

// ---- Constants ----

const STATUS_COLORS = {
    working:    0x2ECC71, // green
    moving:     0xE67E22, // orange
    idle:       0x5DADE2, // blue
    meeting:    0xF1C40F, // yellow
    networking: 0x8E44AD  // purple
};

const BODY_RADIUS   = 0.3;
const BODY_HEIGHT   = 1.0;
const HEAD_RADIUS   = 0.25;
const STATUS_RADIUS = 0.08;
const LABEL_SCALE   = 0.8;
const TRAIL_LENGTH  = 20;
const GLOW_INTENSITY = 0.4;
const GLOW_DISTANCE  = 3.0;

// Rank-based scale multipliers
const RANK_SCALES = {
    executive: 1.3,
    director:  1.1,
    lead:      1.0,
    staff:     0.9,
    standby:   0.85
};

// Shared geometries (re-used across all agents)
let _sharedGeo = null;
function getSharedGeometries() {
    if (_sharedGeo) return _sharedGeo;
    _sharedGeo = {
        body: new THREE.CylinderGeometry(BODY_RADIUS, BODY_RADIUS * 0.85, BODY_HEIGHT, 12),
        head: new THREE.SphereGeometry(HEAD_RADIUS, 16, 12),
        status: new THREE.SphereGeometry(STATUS_RADIUS, 8, 6)
    };
    // Shift body so origin is at feet
    _sharedGeo.body.translate(0, BODY_HEIGHT / 2, 0);
    _sharedGeo.head.translate(0, BODY_HEIGHT + HEAD_RADIUS * 0.9, 0);
    _sharedGeo.status.translate(0, BODY_HEIGHT + HEAD_RADIUS * 2 + 0.2, 0);
    return _sharedGeo;
}

/**
 * Create a canvas-based text sprite for agent name labels
 */
function createLabelSprite(text, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background pill
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    const radius = 12;
    const x = 8, y = 8, w = canvas.width - 16, h = canvas.height - 16;
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

    // Text
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(LABEL_SCALE, LABEL_SCALE * 0.25, 1);
    sprite.position.set(0, BODY_HEIGHT + HEAD_RADIUS * 2 + 0.55, 0);

    return sprite;
}


export class AgentSprite {
    /**
     * @param {object} agentDef - Agent definition from registry
     * @param {object} [options] - Extra options
     * @param {THREE.Vector3} [options.position] - Initial world position
     * @param {object} [options.visualDNA] - Visual DNA profile from agent-visual-dna.json
     * @param {string} [options.rank] - 'executive'|'director'|'lead'|'staff'|'standby'
     * @param {boolean} [options.enableGlow] - Whether to add PointLight (perf optimization)
     * @param {boolean} [options.enableTrail] - Whether to add trail effect
     */
    constructor(agentDef, options = {}) {
        this.id = agentDef.id;
        this.def = agentDef;
        this.state = 'idle';
        this.prevState = 'idle';

        // Visual DNA
        this._dna = options.visualDNA || null;
        this._rank = options.rank || 'staff';
        this._enableGlow = options.enableGlow !== false;
        this._enableTrail = options.enableTrail !== false;

        // Scale based on rank or DNA
        this._scale = this._dna?.visual?.scale || RANK_SCALES[this._rank] || 1.0;

        // Movement
        this._targetPosition = null;
        this._moveSpeed = 1.5;
        this._moveProgress = 0;
        this._moveOrigin = null;

        // Animation timers
        this._stateTime = 0;
        this._bobPhase = Math.random() * Math.PI * 2;
        this._rotPhase = Math.random() * Math.PI * 2;

        // Trail
        this._trailPositions = [];

        // Build 3D group
        this.group = new THREE.Group();
        this.group.name = `agent-${this.id}`;
        this.group.userData = { type: 'agent', agentId: this.id, agentData: agentDef, sprite: this };

        // Apply scale
        this.group.scale.setScalar(this._scale);

        this._buildMeshes(agentDef);
        if (this._enableTrail) this._buildTrail();
        if (this._enableGlow) this._buildGlow(agentDef);

        // Initial position
        if (options.position) {
            this.group.position.copy(options.position);
        }
    }

    // ------------------------------------------------------------------
    //  Construction
    // ------------------------------------------------------------------

    _buildMeshes(agentDef) {
        const geo = getSharedGeometries();
        // Use Visual DNA bodyColor if available, fallback to avatar color
        const colorHex = this._dna?.visual?.bodyColor || agentDef.avatar || '#888888';
        const avatarColor = new THREE.Color(colorHex);

        // Body
        this._bodyMat = new THREE.MeshStandardMaterial({
            color: avatarColor,
            roughness: 0.6,
            metalness: 0.2
        });
        this._bodyMesh = new THREE.Mesh(geo.body, this._bodyMat);
        this._bodyMesh.castShadow = true;
        this._bodyMesh.receiveShadow = true;
        this._bodyMesh.userData = { type: 'agent', agentId: this.id, sprite: this };
        this.group.add(this._bodyMesh);

        // Head
        this._headMat = new THREE.MeshStandardMaterial({
            color: avatarColor.clone().lerp(new THREE.Color(0xffffff), 0.25),
            roughness: 0.5,
            metalness: 0.1
        });
        this._headMesh = new THREE.Mesh(geo.head, this._headMat);
        this._headMesh.castShadow = true;
        this._headMesh.userData = { type: 'agent', agentId: this.id, sprite: this };
        this.group.add(this._headMesh);

        // Status indicator
        this._statusMat = new THREE.MeshBasicMaterial({
            color: STATUS_COLORS[this.state] || STATUS_COLORS.idle,
            transparent: true,
            opacity: 0.9
        });
        this._statusMesh = new THREE.Mesh(geo.status, this._statusMat);
        this.group.add(this._statusMesh);

        // Name label sprite
        this._label = createLabelSprite(agentDef.name, agentDef.avatar || '#ffffff');
        this.group.add(this._label);
    }

    _buildTrail() {
        const trailGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(TRAIL_LENGTH * 3);
        const alphas = new Float32Array(TRAIL_LENGTH);
        trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        trailGeo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

        this._trailMat = new THREE.ShaderMaterial({
            vertexShader: `
                attribute float alpha;
                varying float vAlpha;
                void main() {
                    vAlpha = alpha;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                varying float vAlpha;
                void main() {
                    gl_FragColor = vec4(color, vAlpha * 0.6);
                }
            `,
            uniforms: {
                color: { value: new THREE.Color(STATUS_COLORS.moving) }
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this._trailLine = new THREE.Line(trailGeo, this._trailMat);
        this._trailLine.frustumCulled = false;
        this._trailLine.visible = false;
        this.group.add(this._trailLine);
    }

    _buildGlow(agentDef) {
        const glowColor = this._dna?.visual?.glowColor
            ? new THREE.Color(this._dna.visual.glowColor).getHex()
            : (STATUS_COLORS[this.state] || STATUS_COLORS.idle);
        const glowIntensity = this._dna?.visual?.glowIntensity || GLOW_INTENSITY;

        this._glow = new THREE.PointLight(
            glowColor,
            Math.min(glowIntensity, 2.0),
            GLOW_DISTANCE
        );
        this._glow.position.set(0, BODY_HEIGHT * 0.6, 0);
        this.group.add(this._glow);
    }

    // ------------------------------------------------------------------
    //  Public API
    // ------------------------------------------------------------------

    /**
     * Transition agent to a new state
     * @param {'working'|'moving'|'idle'|'meeting'|'networking'} state
     */
    setState(state) {
        if (this.state === state) return;
        this.prevState = this.state;
        this.state = state;
        this._stateTime = 0;

        // Update status indicator color
        const color = STATUS_COLORS[state] || STATUS_COLORS.idle;
        this._statusMat.color.setHex(color);
        if (this._glow) this._glow.color.setHex(color);

        // Trail visibility
        if (this._trailLine) {
            this._trailLine.visible = state === 'moving';
            if (state === 'moving') {
                this._trailMat.uniforms.color.value.setHex(color);
            }
        }

        eventBus.emit('agent:stateChanged', {
            id: this.id,
            state,
            prevState: this.prevState
        });
    }

    /**
     * Command agent to move toward a world position
     * @param {THREE.Vector3} position
     */
    moveTo(position) {
        this._moveOrigin = this.group.position.clone();
        this._targetPosition = position.clone();
        this._moveProgress = 0;
        this._trailPositions = [];
        this.setState('moving');

        eventBus.emit('agent:moved', {
            id: this.id,
            from: this._moveOrigin.clone(),
            to: this._targetPosition.clone()
        });
    }

    /**
     * Get serializable info about this agent
     * @returns {object}
     */
    getInfo() {
        return {
            id: this.id,
            name: this.def.name,
            role: this.def.role,
            state: this.state,
            position: {
                x: this.group.position.x,
                y: this.group.position.y,
                z: this.group.position.z
            },
            floor: this.def.floor,
            division: this.def.division,
            avatar: this.def.avatar
        };
    }

    /**
     * Handle click / selection
     */
    select() {
        eventBus.emit('agent:selected', { id: this.id, info: this.getInfo() });
    }

    // ------------------------------------------------------------------
    //  Update loop  (call each frame)
    // ------------------------------------------------------------------

    /**
     * @param {number} delta - seconds since last frame
     */
    update(delta) {
        this._stateTime += delta;

        switch (this.state) {
            case 'working':
                this._animateWorking(delta);
                break;
            case 'moving':
                this._animateMoving(delta);
                break;
            case 'idle':
                this._animateIdle(delta);
                break;
            case 'meeting':
                this._animateMeeting(delta);
                break;
            case 'networking':
                this._animateNetworking(delta);
                break;
        }

        // Pulse status indicator
        const pulse = 0.8 + 0.2 * Math.sin(this._stateTime * 3.0);
        this._statusMat.opacity = pulse;
    }

    // ------------------------------------------------------------------
    //  Animations
    // ------------------------------------------------------------------

    _animateWorking(delta) {
        // Gentle bob up/down
        this._bobPhase += delta * 2.0;
        const bobY = Math.sin(this._bobPhase) * 0.05;
        this._bodyMesh.position.y = bobY;
        this._headMesh.position.y = bobY;
    }

    _animateMoving(delta) {
        if (!this._targetPosition || !this._moveOrigin) return;

        const totalDist = this._moveOrigin.distanceTo(this._targetPosition);
        if (totalDist < 0.01) {
            this.setState('idle');
            return;
        }

        this._moveProgress += (this._moveSpeed * delta) / totalDist;

        if (this._moveProgress >= 1.0) {
            this.group.position.copy(this._targetPosition);
            this._targetPosition = null;
            this._moveOrigin = null;
            // Return to previous non-moving state or idle
            this.setState(this.prevState !== 'moving' ? this.prevState : 'idle');
            return;
        }

        // Lerp position
        this.group.position.lerpVectors(this._moveOrigin, this._targetPosition, this._moveProgress);

        // Walk bob
        this._bobPhase += delta * 8.0;
        const walkBob = Math.abs(Math.sin(this._bobPhase)) * 0.1;
        this._bodyMesh.position.y = walkBob;
        this._headMesh.position.y = walkBob;

        // Face direction of movement
        const dir = new THREE.Vector3().subVectors(this._targetPosition, this._moveOrigin);
        if (dir.lengthSq() > 0.001) {
            const angle = Math.atan2(dir.x, dir.z);
            this.group.rotation.y = angle;
        }

        // Update trail
        this._updateTrail();
    }

    _animateIdle(delta) {
        // Slow rotation
        this._rotPhase += delta * 0.5;
        this.group.rotation.y = Math.sin(this._rotPhase) * 0.3;

        // Reset any leftover bob
        this._bodyMesh.position.y *= 0.9;
        this._headMesh.position.y *= 0.9;
    }

    _animateMeeting(delta) {
        // Face toward a meeting table center (assumed at local 0,0,0 relative to meeting area)
        // Slight idle sway
        this._rotPhase += delta * 0.3;
        const sway = Math.sin(this._rotPhase) * 0.05;
        this._bodyMesh.position.y = sway;
        this._headMesh.position.y = sway;
    }

    _animateNetworking(delta) {
        // Energetic bob + slight rotation
        this._bobPhase += delta * 3.0;
        const bob = Math.sin(this._bobPhase) * 0.08;
        this._bodyMesh.position.y = bob;
        this._headMesh.position.y = bob;

        this._rotPhase += delta * 1.0;
        this.group.rotation.y += delta * 0.8;
    }

    // ------------------------------------------------------------------
    //  Trail
    // ------------------------------------------------------------------

    _updateTrail() {
        // Record current world position
        const wp = new THREE.Vector3();
        this.group.getWorldPosition(wp);
        wp.y += BODY_HEIGHT * 0.5; // trail at torso height

        this._trailPositions.push(wp.clone());
        if (this._trailPositions.length > TRAIL_LENGTH) {
            this._trailPositions.shift();
        }

        // Write into trail geometry
        const posAttr = this._trailLine.geometry.getAttribute('position');
        const alphaAttr = this._trailLine.geometry.getAttribute('alpha');
        const count = this._trailPositions.length;

        for (let i = 0; i < TRAIL_LENGTH; i++) {
            if (i < count) {
                const p = this._trailPositions[i];
                // Positions are world-space but trail is child of group,
                // so convert to local
                const local = this.group.worldToLocal(p.clone());
                posAttr.setXYZ(i, local.x, local.y, local.z);
                alphaAttr.setX(i, i / count); // fade from 0 (old) to 1 (new)
            } else {
                posAttr.setXYZ(i, 0, 0, 0);
                alphaAttr.setX(i, 0);
            }
        }

        posAttr.needsUpdate = true;
        alphaAttr.needsUpdate = true;
        this._trailLine.geometry.setDrawRange(0, count);
    }

    // ------------------------------------------------------------------
    //  Cleanup
    // ------------------------------------------------------------------

    dispose() {
        this._bodyMat.dispose();
        this._headMat.dispose();
        this._statusMat.dispose();
        if (this._trailMat) this._trailMat.dispose();
        if (this._label.material.map) this._label.material.map.dispose();
        this._label.material.dispose();
        this.group.removeFromParent();
    }
}
