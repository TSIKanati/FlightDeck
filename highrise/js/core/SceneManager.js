/**
 * SceneManager.js - Three.js Scene Setup for The Highrise
 * TSI Enterprise 3D Command Center
 *
 * Creates and manages the core Three.js scene including:
 * - Scene with dark gradient sky background (dark navy to near-black)
 * - Ambient + directional lighting
 * - Ground plane with grid pattern
 * - Fog for depth perception
 * - WebGL renderer with shadows and antialiasing
 * - Window resize handling
 * - Main animation loop
 *
 * Usage (functional singleton):
 *   import { scene, camera, renderer, onUpdate, start } from './SceneManager.js';
 *
 * Usage (class-based, for HighriseApp compatibility):
 *   import { SceneManager } from './SceneManager.js';
 *   const sm = new SceneManager(container);
 *   sm.init();
 */

import * as THREE from 'three';
import { eventBus } from './EventBus.js';

// ---------------------------------------------------------------------------
// Singleton references -- populated by init()
// ---------------------------------------------------------------------------

let scene    = null;
let camera   = null;
let renderer = null;

let dirLight     = null;
let ambientLight = null;
let groundMesh   = null;
let gridHelper   = null;

/** @type {((dt: number, elapsed: number) => void)[]} */
const _updateCallbacks = [];

let _clock     = null;
let _animating = false;
let _container = null;

// ---------------------------------------------------------------------------
// Initialisation (deferred -- nothing happens until init() is called)
// ---------------------------------------------------------------------------

/**
 * Build the scene, renderer, camera, lights, ground, and grid.
 * @param {HTMLElement} [container] - DOM element to append the canvas into.
 *        Defaults to document.body.
 */
function init(container) {
    if (scene) return; // already initialised

    _container = container || document.body;

    // ------------------------------------------------------------------
    // Scene
    // ------------------------------------------------------------------
    scene = new THREE.Scene();

    // Dark gradient background baked into a small canvas texture
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width  = 2;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d');
    const gradient = bgCtx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0.0, '#0a0e27');   // deep navy at top
    gradient.addColorStop(0.4, '#060a1a');   // mid transition
    gradient.addColorStop(1.0, '#020308');   // near-black at bottom
    bgCtx.fillStyle = gradient;
    bgCtx.fillRect(0, 0, 2, 512);
    const bgTex = new THREE.CanvasTexture(bgCanvas);
    bgTex.magFilter = THREE.LinearFilter;
    bgTex.minFilter = THREE.LinearFilter;
    scene.background = bgTex;

    // ------------------------------------------------------------------
    // Fog -- subtle depth fade for atmosphere
    // ------------------------------------------------------------------
    scene.fog = new THREE.FogExp2(0x040610, 0.005);

    // ------------------------------------------------------------------
    // Lighting
    // ------------------------------------------------------------------

    // Soft ambient so nothing is fully black
    ambientLight = new THREE.AmbientLight(0x8899bb, 0.45);
    scene.add(ambientLight);

    // Main directional (moon-like key light from upper-right)
    dirLight = new THREE.DirectionalLight(0xc0d0ff, 0.9);
    dirLight.position.set(20, 40, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width  = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near   = 1;
    dirLight.shadow.camera.far    = 160;
    dirLight.shadow.camera.left   = -50;
    dirLight.shadow.camera.right  = 50;
    dirLight.shadow.camera.top    = 100;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // Fill from opposite side to soften shadows
    const fillLight = new THREE.DirectionalLight(0x334466, 0.35);
    fillLight.position.set(-15, 20, -20);
    scene.add(fillLight);

    // Cool up-light for futuristic feel
    const upLight = new THREE.DirectionalLight(0x1a2a4a, 0.25);
    upLight.position.set(0, -5, 0);
    scene.add(upLight);

    // ------------------------------------------------------------------
    // Ground Plane with Grid
    // ------------------------------------------------------------------
    const GROUND_SIZE = 300;

    const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x080c18,
        roughness: 0.9,
        metalness: 0.1,
    });
    groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.01;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Outer grid
    gridHelper = new THREE.GridHelper(GROUND_SIZE, 100, 0x1a2244, 0x0d1428);
    gridHelper.position.y = 0;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.35;
    scene.add(gridHelper);

    // Inner focus grid
    const innerGrid = new THREE.GridHelper(40, 20, 0x2244aa, 0x112244);
    innerGrid.position.y = 0.005;
    innerGrid.material.transparent = true;
    innerGrid.material.opacity = 0.25;
    scene.add(innerGrid);

    // ------------------------------------------------------------------
    // Camera
    // ------------------------------------------------------------------
    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        500
    );
    camera.position.set(0, 20, 55);
    camera.lookAt(0, 12, 0);

    // ------------------------------------------------------------------
    // Renderer
    // ------------------------------------------------------------------
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace  = THREE.SRGBColorSpace;

    // Style the canvas
    renderer.domElement.id = 'highrise-canvas';
    Object.assign(renderer.domElement.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        zIndex: '0',
        display: 'block',
    });

    _container.appendChild(renderer.domElement);

    // ------------------------------------------------------------------
    // Resize handler
    // ------------------------------------------------------------------
    window.addEventListener('resize', _onResize);

    // ------------------------------------------------------------------
    // Clock for animation loop
    // ------------------------------------------------------------------
    _clock = new THREE.Clock(false); // don't auto-start

    eventBus.emit('scene:initialized');
}

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------

function _onResize() {
    if (!camera || !renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    eventBus.emit('scene:resize', { width: w, height: h });
}

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------

/**
 * Register a callback to be invoked every frame.
 * Receives (deltaTime, elapsedTime) in seconds.
 * @returns {Function} Unsubscribe function.
 */
function onUpdate(fn) {
    _updateCallbacks.push(fn);
    return () => {
        const idx = _updateCallbacks.indexOf(fn);
        if (idx !== -1) _updateCallbacks.splice(idx, 1);
    };
}

function _animate() {
    if (!_animating) return;
    requestAnimationFrame(_animate);

    const dt      = _clock.getDelta();
    const elapsed = _clock.getElapsedTime();

    // Invoke all registered per-frame callbacks
    for (let i = 0; i < _updateCallbacks.length; i++) {
        _updateCallbacks[i](dt, elapsed);
    }

    renderer.render(scene, camera);
}

/** Start the render loop. */
function start() {
    if (_animating) return;
    _animating = true;
    _clock.start();
    _animate();
    eventBus.emit('scene:started');
}

/** Pause the render loop. */
function stop() {
    _animating = false;
    if (_clock) _clock.stop();
    eventBus.emit('scene:stopped');
}

/** Single-frame render (for external animation loops like HighriseApp). */
function render() {
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ---------------------------------------------------------------------------
// Dispose
// ---------------------------------------------------------------------------

function dispose() {
    stop();
    window.removeEventListener('resize', _onResize);
    if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    }
    eventBus.emit('scene:disposed');
}

// ---------------------------------------------------------------------------
// Class wrapper for HighriseApp compatibility
// ---------------------------------------------------------------------------

/**
 * Class-based facade that wraps the singleton for use in HighriseApp.
 * Usage:
 *   const sm = new SceneManager(containerElement);
 *   sm.init();
 *   sm.scene;      // THREE.Scene
 *   sm.camera;     // THREE.PerspectiveCamera
 *   sm.renderer;   // THREE.WebGLRenderer
 *   sm.render();   // single-frame render
 *   sm.dispose();
 */
class SceneManagerClass {
    constructor(container) {
        this._container = container || document.body;
    }

    init() {
        init(this._container);
    }

    get scene()    { return scene; }
    get camera()   { return camera; }
    get renderer() { return renderer; }

    render()  { render(); }
    start()   { start(); }
    stop()    { stop(); }
    dispose() { dispose(); }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

// Named exports -- functional singleton API
export {
    scene,
    camera,
    renderer,
    dirLight,
    ambientLight,
    groundMesh,
    gridHelper,
    init,
    onUpdate,
    start,
    stop,
    render,
    dispose,
};

// Class export -- for `import { SceneManager } from '...'` (HighriseApp pattern)
export { SceneManagerClass as SceneManager };

// Default export -- functional bag
export default {
    scene,
    camera,
    renderer,
    init,
    onUpdate,
    start,
    stop,
    render,
    dispose,
};
