/**
 * CameraController.js - Camera Navigation for The Highrise
 * TSI Enterprise 3D Command Center
 *
 * Provides full camera interaction without relying on OrbitControls:
 * - Left-click drag to orbit around the target
 * - Scroll wheel to move camera UP/DOWN (elevator-style floor navigation)
 * - Right-click drag to pan
 * - Smooth lerp transitions
 * - zoomToFloor(floorIndex)   -- animate to focus on a specific floor
 * - zoomToInterior(floorIndex) -- move camera inside a floor
 * - returnToExterior()        -- pull back to full building view
 * - Floor indicator DOM element showing current visible floor range
 * - Y-axis clamping between basement and observation deck
 *
 * Usage (functional singleton -- requires SceneManager.init() first):
 *   import { init, zoomToFloor } from './CameraController.js';
 *   init();
 *
 * Usage (class-based, for HighriseApp compatibility):
 *   import { CameraController } from './CameraController.js';
 *   const cc = new CameraController(camera, canvasElement);
 *   cc.update(dt);
 */

import * as THREE from 'three';
import { eventBus } from './EventBus.js';
import { stateManager } from './StateManager.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLOOR_HEIGHT   = 3.5;
const MIN_FLOOR_IDX  = -2;     // Power Station (B2)
const MAX_FLOOR_IDX  = 20;     // Observation Deck

const CAM_Y_MIN = (MIN_FLOOR_IDX * FLOOR_HEIGHT) - 2;   // ~ -9
const CAM_Y_MAX = (MAX_FLOOR_IDX * FLOOR_HEIGHT) + 8;   // ~ 78

const DEFAULT_POS    = new THREE.Vector3(0, 20, 55);
const DEFAULT_TARGET = new THREE.Vector3(0, 12, 0);

const ORBIT_SPEED    = 0.005;
const PAN_SPEED      = 0.04;
const ELEVATOR_STEP  = 3.5;    // Y units per scroll tick
const LERP_FACTOR    = 0.08;

const MIN_DISTANCE   = 8;
const MAX_DISTANCE   = 80;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _camera  = null;   // reference to the THREE.PerspectiveCamera
let _canvas  = null;   // renderer DOM element for event binding
let _ready   = false;

const _spherical = new THREE.Spherical();

const _currentPos    = DEFAULT_POS.clone();
const _targetPos     = DEFAULT_POS.clone();
const _currentLookAt = DEFAULT_TARGET.clone();
const _targetLookAt  = DEFAULT_TARGET.clone();

// Transition animation
let _transitioning     = false;
let _transitionAlpha   = 0;
let _transitionSpeed   = 2.0;
const _transStartPos   = new THREE.Vector3();
const _transStartLook  = new THREE.Vector3();
const _transEndPos     = new THREE.Vector3();
const _transEndLook    = new THREE.Vector3();

// Mouse state
let _isOrbiting = false;
let _isPanning  = false;
const _prevMouse = { x: 0, y: 0 };

// View mode
let _viewMode      = 'exterior';
let _interiorFloor = null;

// Floor indicator DOM
let _floorIndicator = null;

// ---------------------------------------------------------------------------
// Floor indicator
// ---------------------------------------------------------------------------

function _createFloorIndicator() {
    _floorIndicator = document.createElement('div');
    _floorIndicator.id = 'floor-indicator';
    Object.assign(_floorIndicator.style, {
        position: 'fixed',
        right: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(8, 12, 24, 0.85)',
        border: '1px solid rgba(74, 144, 217, 0.4)',
        borderRadius: '8px',
        padding: '12px 16px',
        color: '#a0b4d0',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: '13px',
        lineHeight: '1.6',
        zIndex: '100',
        pointerEvents: 'none',
        backdropFilter: 'blur(6px)',
        minWidth: '120px',
        textAlign: 'center',
    });
    document.body.appendChild(_floorIndicator);
}

function _updateFloorIndicator() {
    if (!_floorIndicator) return;

    const camY       = _currentPos.y;
    const floorIdx   = Math.round(camY / FLOOR_HEIGHT);
    const clampedIdx = Math.max(MIN_FLOOR_IDX, Math.min(MAX_FLOOR_IDX, floorIdx));
    const lo = Math.max(MIN_FLOOR_IDX, clampedIdx - 1);
    const hi = Math.min(MAX_FLOOR_IDX, clampedIdx + 1);

    const label = clampedIdx <= 0 ? `B${Math.abs(clampedIdx) + 1}` : `F${clampedIdx}`;
    const loLabel = lo <= 0 ? `B${Math.abs(lo) + 1}` : `${lo}`;
    const hiLabel = hi <= 0 ? `B${Math.abs(hi) + 1}` : `${hi}`;

    _floorIndicator.innerHTML =
        '<div style="color:#4A90D9;font-size:11px;letter-spacing:2px;margin-bottom:4px;">FLOOR</div>' +
        '<div style="color:#e0e8f0;font-size:22px;font-weight:bold;">' + label + '</div>' +
        '<div style="color:#667a90;font-size:10px;margin-top:4px;">' + loLabel + ' - ' + hiLabel + '</div>';
}

// ---------------------------------------------------------------------------
// Spherical sync
// ---------------------------------------------------------------------------

function _syncSpherical() {
    const offset = new THREE.Vector3().subVectors(_currentPos, _currentLookAt);
    _spherical.setFromVector3(offset);
    _spherical.phi    = Math.max(0.1, Math.min(Math.PI - 0.1, _spherical.phi));
    _spherical.radius = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, _spherical.radius));
}

// ---------------------------------------------------------------------------
// Input handlers
// ---------------------------------------------------------------------------

function _onMouseDown(e) {
    if (_transitioning) return;
    if (e.button === 0) _isOrbiting = true;
    if (e.button === 2) _isPanning = true;
    _prevMouse.x = e.clientX;
    _prevMouse.y = e.clientY;
}

function _onMouseMove(e) {
    if (_transitioning) return;
    const dx = e.clientX - _prevMouse.x;
    const dy = e.clientY - _prevMouse.y;
    _prevMouse.x = e.clientX;
    _prevMouse.y = e.clientY;

    if (_isOrbiting) {
        _spherical.theta -= dx * ORBIT_SPEED;
        _spherical.phi   -= dy * ORBIT_SPEED;
        _spherical.phi = Math.max(0.15, Math.min(Math.PI - 0.15, _spherical.phi));

        const offset = new THREE.Vector3().setFromSpherical(_spherical);
        _targetPos.copy(_targetLookAt).add(offset);
        _targetPos.y = Math.max(CAM_Y_MIN, Math.min(CAM_Y_MAX, _targetPos.y));
    }

    if (_isPanning) {
        const right = new THREE.Vector3();
        const up    = new THREE.Vector3(0, 1, 0);
        const fwd   = new THREE.Vector3().subVectors(_targetLookAt, _targetPos).normalize();
        right.crossVectors(fwd, up).normalize();

        const panOffset = new THREE.Vector3();
        panOffset.addScaledVector(right, -dx * PAN_SPEED);
        panOffset.addScaledVector(up,     dy * PAN_SPEED);

        _targetPos.add(panOffset);
        _targetLookAt.add(panOffset);

        _targetPos.y    = Math.max(CAM_Y_MIN, Math.min(CAM_Y_MAX, _targetPos.y));
        _targetLookAt.y = Math.max(CAM_Y_MIN, Math.min(CAM_Y_MAX, _targetLookAt.y));

        _syncSpherical();
    }
}

function _onMouseUp() {
    _isOrbiting = false;
    _isPanning  = false;
}

function _onWheel(e) {
    if (_transitioning) return;
    e.preventDefault();

    const direction = e.deltaY > 0 ? -1 : 1;
    const step = ELEVATOR_STEP * direction;

    _targetPos.y    = Math.max(CAM_Y_MIN, Math.min(CAM_Y_MAX, _targetPos.y + step));
    _targetLookAt.y = Math.max(CAM_Y_MIN, Math.min(CAM_Y_MAX, _targetLookAt.y + step));

    _syncSpherical();
}

function _onContextMenu(e) {
    e.preventDefault();
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

function _startTransition(endPos, endLookAt, speed) {
    _transitioning   = true;
    _transitionAlpha = 0;
    _transitionSpeed = speed || 2.0;
    _transStartPos.copy(_currentPos);
    _transStartLook.copy(_currentLookAt);
    _transEndPos.copy(endPos);
    _transEndLook.copy(endLookAt);
}

function _smoothstep(t) {
    return t * t * (3 - 2 * t);
}

function _tickTransition(dt) {
    if (!_transitioning) return;

    _transitionAlpha += dt * _transitionSpeed;
    if (_transitionAlpha >= 1.0) {
        _transitionAlpha = 1.0;
        _transitioning = false;
    }

    const t = _smoothstep(_transitionAlpha);
    _currentPos.lerpVectors(_transStartPos, _transEndPos, t);
    _currentLookAt.lerpVectors(_transStartLook, _transEndLook, t);

    if (!_transitioning) {
        _targetPos.copy(_currentPos);
        _targetLookAt.copy(_currentLookAt);
        _syncSpherical();
        eventBus.emit('camera:transitionComplete', { viewMode: _viewMode });
    }
}

// ---------------------------------------------------------------------------
// Per-frame update
// ---------------------------------------------------------------------------

function update(dt) {
    if (!_camera) return;

    if (_transitioning) {
        _tickTransition(dt);
    } else {
        _currentPos.lerp(_targetPos, LERP_FACTOR);
        _currentLookAt.lerp(_targetLookAt, LERP_FACTOR);
    }

    _camera.position.copy(_currentPos);
    _camera.lookAt(_currentLookAt);

    // Keep state manager in sync
    stateManager.update('cameraPosition', {
        x: _currentPos.x,
        y: _currentPos.y,
        z: _currentPos.z,
    });

    _updateFloorIndicator();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Animate camera to focus on a specific floor from the exterior.
 * @param {number} floorIndex - Floor index (-2 to 20)
 */
function zoomToFloor(floorIndex) {
    _viewMode = 'exterior';
    _interiorFloor = null;

    const floorY = floorIndex * FLOOR_HEIGHT;
    const endPos    = new THREE.Vector3(0, floorY + 4, 38);
    const endLookAt = new THREE.Vector3(0, floorY + 1.75, 0);

    _startTransition(endPos, endLookAt, 1.8);

    stateManager.set('currentView', 'exterior');
    stateManager.set('currentFloor', floorIndex);
    eventBus.emit('camera:zoomToFloor', { floorIndex });
}

/**
 * Move camera inside a floor for interior view.
 * @param {number} floorIndex - Floor index (-2 to 20)
 * @param {string} [tower='left'] - Which tower to enter
 */
function zoomToInterior(floorIndex, tower) {
    tower = tower || 'left';
    _viewMode = 'interior';
    _interiorFloor = floorIndex;

    const towerX = tower === 'left' ? -10 : 10;
    const floorY = floorIndex * FLOOR_HEIGHT + 1.75;

    const endPos    = new THREE.Vector3(towerX, floorY, 6);
    const endLookAt = new THREE.Vector3(towerX, floorY - 0.2, -4);

    _startTransition(endPos, endLookAt, 1.5);

    stateManager.set('currentView', 'interior');
    stateManager.set('currentFloor', floorIndex);
    stateManager.set('currentTower', tower);
    eventBus.emit('camera:zoomToInterior', { floorIndex, tower });
}

/**
 * Pull camera back to the default exterior view.
 */
function returnToExterior() {
    _viewMode = 'exterior';
    _interiorFloor = null;

    _startTransition(DEFAULT_POS.clone(), DEFAULT_TARGET.clone(), 1.5);

    stateManager.set('currentView', 'exterior');
    stateManager.set('currentFloor', null);
    eventBus.emit('camera:returnToExterior');
}

/**
 * Get the floor index closest to the current camera Y level.
 * @returns {number}
 */
function getCurrentFloorIndex() {
    return Math.round(_currentPos.y / FLOOR_HEIGHT);
}

/**
 * Initialise the camera controller using the SceneManager singleton.
 * Imports camera and renderer lazily to avoid circular dependency issues.
 */
async function init() {
    // Dynamic import to break potential circular reference
    const sm = await import('./SceneManager.js');
    _camera = sm.camera;
    _canvas = sm.renderer ? sm.renderer.domElement : null;

    if (!_camera || !_canvas) {
        console.warn('[CameraController] SceneManager not yet initialized. Call SceneManager.init() first.');
        return;
    }

    _currentPos.copy(_camera.position);
    _targetPos.copy(_camera.position);

    _syncSpherical();
    _createFloorIndicator();

    // Bind input events
    _canvas.addEventListener('mousedown',  _onMouseDown);
    _canvas.addEventListener('mousemove',  _onMouseMove);
    _canvas.addEventListener('mouseup',    _onMouseUp);
    _canvas.addEventListener('mouseleave', _onMouseUp);
    _canvas.addEventListener('wheel',      _onWheel, { passive: false });
    _canvas.addEventListener('contextmenu', _onContextMenu);

    // Register in the SceneManager animation loop
    sm.onUpdate((_dt) => update(_dt));

    _ready = true;
    eventBus.emit('camera:initialized');
}

/**
 * Clean up event listeners and DOM elements.
 */
function dispose() {
    if (_canvas) {
        _canvas.removeEventListener('mousedown',  _onMouseDown);
        _canvas.removeEventListener('mousemove',  _onMouseMove);
        _canvas.removeEventListener('mouseup',    _onMouseUp);
        _canvas.removeEventListener('mouseleave', _onMouseUp);
        _canvas.removeEventListener('wheel',      _onWheel);
        _canvas.removeEventListener('contextmenu', _onContextMenu);
    }
    if (_floorIndicator && _floorIndicator.parentNode) {
        _floorIndicator.parentNode.removeChild(_floorIndicator);
    }
}

// ---------------------------------------------------------------------------
// Class wrapper for HighriseApp compatibility
// ---------------------------------------------------------------------------

/**
 * Class-based facade.
 * Usage:
 *   const cc = new CameraController(camera, canvasElement);
 *   cc.update(dt);
 *   cc.zoomToFloor(5);
 */
class CameraControllerClass {
    constructor(cameraObj, canvasEl) {
        _camera = cameraObj;
        _canvas = canvasEl;

        if (_camera) {
            _currentPos.copy(_camera.position);
            _targetPos.copy(_camera.position);
            _syncSpherical();
        }

        _createFloorIndicator();

        if (_canvas) {
            _canvas.addEventListener('mousedown',  _onMouseDown);
            _canvas.addEventListener('mousemove',  _onMouseMove);
            _canvas.addEventListener('mouseup',    _onMouseUp);
            _canvas.addEventListener('mouseleave', _onMouseUp);
            _canvas.addEventListener('wheel',      _onWheel, { passive: false });
            _canvas.addEventListener('contextmenu', _onContextMenu);
        }

        _ready = true;
        eventBus.emit('camera:initialized');
    }

    update(dt)                        { update(dt); }
    zoomToFloor(idx)                  { zoomToFloor(idx); }
    zoomToInterior(idx, tower)        { zoomToInterior(idx, tower); }
    returnToExterior()                { returnToExterior(); }
    getCurrentFloorIndex()            { return getCurrentFloorIndex(); }
    dispose()                         { dispose(); }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
    init,
    update,
    dispose,
    zoomToFloor,
    zoomToInterior,
    returnToExterior,
    getCurrentFloorIndex,
};

export { CameraControllerClass as CameraController };

export default {
    init,
    update,
    dispose,
    zoomToFloor,
    zoomToInterior,
    returnToExterior,
    getCurrentFloorIndex,
};
