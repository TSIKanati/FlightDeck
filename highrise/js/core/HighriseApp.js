/**
 * HighriseApp - Main application controller for The Highrise
 * TSI Enterprise 3D Command Center
 * Orchestrates all modules: scene, buildings, agents, UI, bots
 */
import * as THREE from 'three';
import { eventBus } from './EventBus.js';
import { stateManager } from './StateManager.js';
import { SceneManager } from './SceneManager.js';
import { CameraController } from './CameraController.js';
import { TwinTowers } from '../buildings/TwinTowers.js';
import { TranslucentWall } from '../buildings/TranslucentWall.js';
import { AgentManager } from '../agents/AgentManager.js';
import { AgentOnboarding } from '../agents/AgentOnboarding.js';
import { WaterCooler } from '../agents/WaterCooler.js';
import { AgentNetworking } from '../agents/AgentNetworking.js';
import { Lobby } from '../enterprise/Lobby.js';
import { SecurityFloor } from '../enterprise/SecurityFloor.js';
import { LegalFloor } from '../enterprise/LegalFloor.js';
import { RnDFloor } from '../enterprise/RnDFloor.js';
import { FinanceFloor } from '../enterprise/FinanceFloor.js';
import { TestBunker } from '../enterprise/TestBunker.js';
import { PowerStation } from '../buildings/PowerStation.js';
import { HUD } from '../ui/HUD.js';
import { FloorPanel } from '../ui/FloorPanel.js';
import { AgentPanel } from '../ui/AgentPanel.js';
import { ElevatorUI } from '../ui/ElevatorUI.js';
import { MiniMap } from '../ui/MiniMap.js';
import { ResourceGauges } from '../ui/ResourceGauges.js';
import { BeeFranknBot } from '../bots/BeeFranknBot.js';
import { FullySailSally } from '../bots/FullySailSally.js';
import { botBridge } from '../bots/BotBridge.js';
import { C2CommandChain } from '../agents/C2CommandChain.js';
import { SallyC2 } from '../agents/SallyC2.js';
import { taskLogger } from './TaskLogger.js';

export class HighriseApp {
    constructor(container) {
        this.container = container;
        this.clock = { lastTime: 0, delta: 0 };
        this.isRunning = false;
        this.loadingEl = document.querySelector('.hr-loading');
        this.loadProgress = 0;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    async init() {
        try {
            this._updateLoading(5, 'Initializing scene...');

            // Core 3D scene
            this.sceneManager = new SceneManager(this.container);
            this.sceneManager.init();
            this._updateLoading(15, 'Building towers...');

            // Camera
            this.camera = new CameraController(
                this.sceneManager.camera,
                this.sceneManager.renderer.domElement
            );
            this._updateLoading(20, 'Constructing twin towers...');

            // Load data
            const [floorsData, projectsData, agentsData] = await Promise.all([
                fetch('./js/data/floors.json').then(r => r.json()),
                fetch('./js/data/projects.json').then(r => r.json()),
                fetch('./js/data/agents.json').then(r => r.json())
            ]);
            stateManager.set('floorsData', floorsData);
            stateManager.set('projectsData', projectsData);
            stateManager.set('agentsData', agentsData);
            this._updateLoading(30, 'Loading project data...');

            // Twin Towers
            this.towers = new TwinTowers(floorsData, projectsData);
            this.towers.create(this.sceneManager.scene);
            this._updateLoading(50, 'Raising buildings...');

            // Translucent Wall
            this.wall = new TranslucentWall(floorsData);
            this.wall.create(this.sceneManager.scene);
            this._updateLoading(55, 'Installing glass wall...');

            // Enterprise Floors
            this.lobby = new Lobby();
            this.securityFloor = new SecurityFloor();
            this.legalFloor = new LegalFloor();
            this.rndFloor = new RnDFloor();
            this.financeFloor = new FinanceFloor();
            this.testBunker = new TestBunker();
            this.powerStation = new PowerStation();

            this.lobby.create(this.sceneManager.scene);
            this.securityFloor.create(this.sceneManager.scene);
            this.legalFloor.create(this.sceneManager.scene);
            this.rndFloor.create(this.sceneManager.scene);
            this.financeFloor.create(this.sceneManager.scene);
            this.testBunker.create(this.sceneManager.scene);
            this.powerStation.create(this.sceneManager.scene);
            this._updateLoading(65, 'Furnishing enterprise floors...');

            // Agent System
            this.agentManager = new AgentManager(this.sceneManager.scene);
            this.onboarding = new AgentOnboarding(this.sceneManager.scene);
            this.waterCooler = new WaterCooler(this.sceneManager.scene, this.agentManager);
            this.networking = new AgentNetworking(this.sceneManager.scene, this.agentManager);
            this._updateLoading(75, 'Onboarding agents...');

            // Bots
            this.beeFrank = new BeeFranknBot();
            this.sally = new FullySailSally();
            botBridge.connect(); // Starts in simulation mode
            this._updateLoading(78, 'Connecting bots...');

            // C2 Command Chain - BeeFrank (F20) → FloorManagers → Agents
            const projectsArr = projectsData?.projects || [];
            const enterpriseFloors = floorsData?.floors?.filter(f => f.type === 'enterprise') || [];
            this.c2 = new C2CommandChain(this.sceneManager.scene, this.agentManager, {
                projects: projectsArr,
                enterpriseFloors
            });
            await this.c2.init();
            this._updateLoading(82, 'C2 command chain online...');

            // Sally C2 - RIGHT Tower Command Chain
            let serverAgents = [];
            try {
                const serverResp = await fetch('./js/data/server-agents.json');
                if (serverResp.ok) {
                    const serverData = await serverResp.json();
                    serverAgents = serverData.serverAgents || [];
                }
            } catch (e) {
                console.warn('[Highrise] No server-agents.json, SallyC2 will init with no agents');
            }
            this.sallyC2 = new SallyC2(this.sceneManager.scene, this.agentManager, { serverAgents });
            await this.sallyC2.init();
            this.c2.setSallyC2(this.sallyC2);
            this._updateLoading(85, 'Sally C2 RIGHT tower online...');

            // UI
            this.hud = new HUD();
            this.floorPanel = new FloorPanel();
            this.agentPanel = new AgentPanel();
            this.elevator = new ElevatorUI();
            this.minimap = new MiniMap();
            this.resourceGauges = new ResourceGauges();
            this._updateLoading(90, 'Activating HUD...');

            // Event wiring
            this._setupEvents();
            this._updateLoading(95, 'Wiring event systems...');

            // Click interaction on the canvas
            this.sceneManager.renderer.domElement.addEventListener('click', (e) => this._onClick(e));
            this.sceneManager.renderer.domElement.addEventListener('dblclick', (e) => this._onDoubleClick(e));

            this._updateLoading(100, 'The Highrise is ready');

            // Fade out loading screen
            setTimeout(() => {
                if (this.loadingEl) {
                    this.loadingEl.classList.add('fade-out');
                    setTimeout(() => this.loadingEl.remove(), 800);
                }
            }, 500);

            // Start animation loop
            this.isRunning = true;
            this._animate(0);

            console.log('[Highrise] TSI Enterprise 3D Command Center initialized');
        } catch (err) {
            console.error('[Highrise] Init error:', err);
            if (this.loadingEl) {
                const p = this.loadingEl.querySelector('p');
                if (p) {
                    p.textContent = `Error: ${err.message}`;
                    p.style.color = '#e74c3c';
                }
            }
        }
    }

    _updateLoading(percent, message) {
        this.loadProgress = percent;
        if (this.loadingEl) {
            const fill = this.loadingEl.querySelector('.hr-loading-bar-fill');
            const text = this.loadingEl.querySelector('p');
            if (fill) fill.style.width = percent + '%';
            if (text) text.textContent = message;
        }
    }

    _setupEvents() {
        // Floor click -> show panel
        eventBus.on('floor:clicked', (data) => {
            const projectsData = stateManager.get('projectsData');
            const project = projectsData?.projects?.find(p => p.id === data.projectId);
            this.floorPanel.show(data, project);
            this.camera.zoomToFloor(data.index);
            stateManager.set('currentFloor', data.index);
        });

        // Agent click -> show panel
        eventBus.on('agent:selected', (data) => {
            this.agentPanel.show(data);
        });

        // Elevator navigation
        eventBus.on('elevator:navigate', (data) => {
            this.camera.zoomToFloor(data.floorIndex);
            stateManager.set('currentFloor', data.floorIndex);
        });

        // View toggle (interior/exterior)
        eventBus.on('view:interior', (data) => {
            this.camera.zoomToInterior(data.floorIndex);
            stateManager.set('currentView', 'interior');
        });
        eventBus.on('view:exterior', () => {
            this.camera.returnToExterior();
            stateManager.set('currentView', 'exterior');
            this.floorPanel.hide();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Skip if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key === 'Escape') {
                if (stateManager.get('currentView') === 'interior') {
                    eventBus.emit('view:exterior');
                } else {
                    this.floorPanel.hide();
                    this.agentPanel.hide();
                }
            }
            if (e.key === 'h' || e.key === 'H') {
                if (this.hud.toggle) this.hud.toggle();
                else if (this.hud._visible) this.hud.hide(); else this.hud.show();
            }
            if (e.key === 'm' || e.key === 'M') {
                if (this.minimap.toggle) this.minimap.toggle();
            }
            if (e.key === 'l' || e.key === 'L') eventBus.emit('elevator:navigate', { floorIndex: 1 });
            if (e.key === 't' || e.key === 'T') eventBus.emit('elevator:navigate', { floorIndex: 20 });
            if (e.key === 'ArrowUp') {
                const cur = stateManager.get('currentFloor') || 1;
                eventBus.emit('elevator:navigate', { floorIndex: Math.min(20, cur + 1) });
            }
            if (e.key === 'ArrowDown') {
                const cur = stateManager.get('currentFloor') || 1;
                eventBus.emit('elevator:navigate', { floorIndex: Math.max(-2, cur - 1) });
            }
        });

        // Power station visibility
        eventBus.on('state:currentFloor', ({ value }) => {
            if (value === -2) {
                this.resourceGauges.show();
            } else {
                this.resourceGauges.hide();
            }
        });

        // C2 floor navigation (from Telegram /floor command)
        eventBus.on('camera:gotoFloor', (data) => {
            const floor = data.floor || data.floorIndex || 1;
            this.camera.zoomToFloor(floor);
            stateManager.set('currentFloor', floor);
        });

        // C2 task log updates -> HUD
        eventBus.on('tasklog:update', (stats) => {
            eventBus.emit('hud:stats', {
                activeTasks: stats.active,
                completedTasks: stats.completedTotal,
                activeSwarms: stats.swarming
            });
        });

        // Bot messages -> translucent wall effects
        eventBus.on('bot:message', (msg) => {
            if (msg.type === 'sync' || msg.type === 'deploy') {
                this.wall.triggerSync(
                    Math.floor(Math.random() * 20) + 1,
                    Math.floor(Math.random() * 20) + 1
                );
            }
        });
    }

    _onClick(event) {
        const rect = event.target.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        // Check floor clicks
        if (this.towers) {
            const floorMeshes = this.towers.getClickableFloors();
            if (floorMeshes && floorMeshes.length > 0) {
                const intersects = this.raycaster.intersectObjects(floorMeshes, true);
                if (intersects.length > 0) {
                    const hit = intersects[0].object;
                    const floorData = hit.userData?.floorData || hit.parent?.userData?.floorData;
                    if (floorData) {
                        eventBus.emit('floor:clicked', floorData);
                        return;
                    }
                }
            }
        }

        // Check agent clicks
        if (this.agentManager && this.agentManager.agentGroup) {
            const intersects = this.raycaster.intersectObjects(this.agentManager.agentGroup.children, true);
            if (intersects.length > 0) {
                const hit = intersects[0].object;
                let obj = hit;
                while (obj && !obj.userData?.agentData) obj = obj.parent;
                if (obj?.userData?.agentData) {
                    eventBus.emit('agent:selected', obj.userData.agentData);
                    return;
                }
            }
        }
    }

    _onDoubleClick(event) {
        const rect = event.target.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        if (this.towers) {
            const floorMeshes = this.towers.getClickableFloors();
            if (floorMeshes && floorMeshes.length > 0) {
                const intersects = this.raycaster.intersectObjects(floorMeshes, true);
                if (intersects.length > 0) {
                    const hit = intersects[0].object;
                    const floorData = hit.userData?.floorData || hit.parent?.userData?.floorData;
                    if (floorData) {
                        eventBus.emit('view:interior', { floorIndex: floorData.index });
                    }
                }
            }
        }
    }

    _animate(time) {
        if (!this.isRunning) return;
        requestAnimationFrame((t) => this._animate(t));

        const delta = (time - this.clock.lastTime) / 1000;
        this.clock.lastTime = time;
        this.clock.delta = Math.min(delta, 0.1); // Cap delta

        // Update all systems
        if (this.camera?.update) this.camera.update(this.clock.delta);
        if (this.towers?.update) this.towers.update(this.clock.delta);
        if (this.wall?.update) this.wall.update(this.clock.delta);
        if (this.agentManager?.update) this.agentManager.update(this.clock.delta);
        if (this.onboarding?.update) this.onboarding.update(this.clock.delta);
        if (this.waterCooler?.update) this.waterCooler.update(this.clock.delta);
        if (this.networking?.update) this.networking.update(this.clock.delta);

        // C2 Command Chains (swarm effects, task tracking)
        if (this.c2?.update) this.c2.update(this.clock.delta);
        if (this.sallyC2?.update) this.sallyC2.update(this.clock.delta);

        // Enterprise floors
        if (this.lobby?.update) this.lobby.update(this.clock.delta);
        if (this.securityFloor?.update) this.securityFloor.update(this.clock.delta);
        if (this.legalFloor?.update) this.legalFloor.update(this.clock.delta);
        if (this.rndFloor?.update) this.rndFloor.update(this.clock.delta);
        if (this.financeFloor?.update) this.financeFloor.update(this.clock.delta);
        if (this.testBunker?.update) this.testBunker.update(this.clock.delta);
        if (this.powerStation?.update) this.powerStation.update(this.clock.delta);

        // MiniMap
        if (this.minimap?.render) this.minimap.render();

        // Render
        this.sceneManager.render();
    }

    dispose() {
        this.isRunning = false;
        if (this.sceneManager) this.sceneManager.dispose();
    }
}
