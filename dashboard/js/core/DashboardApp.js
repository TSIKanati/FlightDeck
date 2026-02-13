/**
 * DashboardApp.js - Main controller for the TSI Enterprise Dashboard
 * Orchestrates data loading, routing, sidebar, and view rendering
 * Integrates TaskStore, GradeStore, AssetStore for full management
 */

import { Router } from './Router.js';
import { TaskStore } from './TaskStore.js';
import { GradeStore } from './GradeStore.js';
import { AssetStore } from './AssetStore.js';
import { KnowledgeStore } from './KnowledgeStore.js';
import { CommsBridge } from './CommsBridge.js';
import { DataBridge } from '../shared/DataBridge.js';
import { R } from '../shared/Renderer.js';
import { FloorNav } from '../components/FloorNav.js';
import { EnterpriseView } from '../views/EnterpriseView.js';
import { FloorView } from '../views/FloorView.js';
import { AgentView } from '../views/AgentView.js';
import { ProjectAudit } from '../views/ProjectAudit.js';
import { AssetInventory } from '../views/AssetInventory.js';
import { TowerCommsView } from '../views/TowerCommsView.js';
import { KnowledgeView } from '../views/KnowledgeView.js';
import { SmoothNav } from '../shared/SmoothNav.js';

export class DashboardApp {
    constructor(rootEl) {
        this._root = rootEl;
        this._data = new DataBridge();
        this._router = new Router();
        this._tasks = new TaskStore();
        this._grades = new GradeStore();
        this._assets = new AssetStore();
        this._knowledge = new KnowledgeStore();
        this._comms = new CommsBridge();
        this._floorNav = null;
        this._mainContainer = null;
        this._breadcrumb = null;
        this._smoothNav = null;
    }

    async init() {
        // Show loading progress
        const fill = document.getElementById('dash-loading-fill');
        if (fill) fill.style.width = '10%';

        await this._data.load((pct) => {
            if (fill) fill.style.width = Math.round(10 + pct * 50) + '%';
        });

        if (fill) fill.style.width = '70%';

        // Load stores in parallel
        await Promise.all([
            this._tasks.init(),
            this._grades.init(),
            this._assets.init(),
            this._knowledge.init(),
            this._comms.init()
        ]);

        if (fill) fill.style.width = '90%';

        console.log('[Dashboard] Data loaded:', {
            agents: this._data.agents.length,
            floors: this._data.floors.length,
            projects: this._data.projects.length,
            tasks: this._tasks.getAll().length,
            grades: this._grades.getAll().length,
            knowledge: this._knowledge.getAll().length,
            comms: this._comms.getAll().length
        });

        // Build shell
        this._buildShell();

        // Set up routing
        this._router.onNavigate((route) => this._onRoute(route));

        // Listen for store changes to update status bar
        this._tasks.onChange(() => this._updateStatusBar());
        this._grades.onChange(() => this._updateStatusBar());
        this._comms.onChange(() => this._updateCommsIndicator());

        // Set up export/import
        this._setupExportImport();

        // Fade out loading
        const loading = document.getElementById('dash-loading');
        if (loading) {
            if (fill) fill.style.width = '100%';
            setTimeout(() => {
                loading.classList.add('fade-out');
                setTimeout(() => loading.remove(), 600);
            }, 300);
        }

        // Trigger initial route
        this._router.start();
        this._updateStatusBar();
    }

    _buildShell() {
        R.clear(this._root);

        // Top bar
        const topbar = R.div('dash-topbar', [
            R.div('dash-topbar-left', [
                R.el('span', {
                    cls: 'dash-topbar-title',
                    text: 'TSI DASHBOARD',
                    on: { click: () => this._router.navigate('enterprise') }
                }),
                this._breadcrumb = R.el('span', { cls: 'dash-topbar-breadcrumb' })
            ]),
            R.div('dash-topbar-right', [
                this._statusAgents = R.el('span', {
                    cls: 'dash-topbar-stat',
                    html: `Agents: <b>${this._data.agents.length}</b>`
                }),
                this._statusTasks = R.el('span', {
                    cls: 'dash-topbar-stat',
                    html: `Tasks: <b>0</b>`
                }),
                this._statusGrades = R.el('span', {
                    cls: 'dash-topbar-stat',
                    html: `Reviews: <b>0</b>`
                }),
                R.el('span', {
                    cls: 'dash-topbar-link',
                    text: 'AUDIT',
                    style: { cursor: 'pointer' },
                    on: { click: () => this._router.navigate('audit') }
                }),
                R.el('span', {
                    cls: 'dash-topbar-link',
                    text: 'KB',
                    style: { cursor: 'pointer' },
                    attrs: { title: 'Knowledge Base' },
                    on: { click: () => this._router.navigate('knowledge') }
                }),
                this._commsIndicator = R.el('span', {
                    cls: 'dash-topbar-link dash-topbar-comms',
                    text: 'COMMS',
                    style: { cursor: 'pointer' },
                    attrs: { title: 'Tower Communications' },
                    on: { click: () => this._router.navigate('comms') }
                }),
                R.el('span', {
                    cls: 'dash-topbar-link',
                    text: 'EXPORT',
                    style: { cursor: 'pointer' },
                    attrs: { id: 'btn-export' },
                    on: { click: () => this._exportAll() }
                }),
                R.el('a', {
                    cls: 'dash-topbar-link',
                    text: '3D HIGHRISE',
                    attrs: { href: '/', title: 'Open 3D Highrise Command Center' }
                })
            ])
        ]);

        // Layout: sidebar + main
        const layout = R.div('dash-layout');

        // Sidebar
        this._floorNav = new FloorNav(this._data, this._router);
        layout.appendChild(this._floorNav.render());

        // Main content area
        this._mainContainer = R.div('dash-main');
        layout.appendChild(this._mainContainer);

        this._root.appendChild(topbar);
        this._root.appendChild(layout);

        // Attach smooth mouse-driven navigation to main content area
        this._smoothNav = SmoothNav.attach(this._mainContainer);
    }

    _onRoute(route) {
        try {
            switch (route.view) {
                case 'floor':
                    this._showFloor(route.params.floorId);
                    break;
                case 'agent':
                    this._showAgent(route.params.agentId);
                    break;
                case 'audit':
                    this._showAudit();
                    break;
                case 'assets':
                    this._showAssets(route.params.projectId);
                    break;
                case 'comms':
                    this._showComms(route.params.projectId);
                    break;
                case 'knowledge':
                    this._showKnowledge(route.params.projectId);
                    break;
                default:
                    this._showEnterprise();
            }
        } catch (err) {
            console.error('[Dashboard] Route error:', err);
            this._mainContainer.innerHTML = '<div style="padding:40px;color:#e74c3c;">' +
                '<h2>View Error</h2><pre>' + (err.stack || err.message || err) + '</pre></div>';
        }
    }

    _showEnterprise() {
        this._setBreadcrumb('Enterprise Overview');
        this._floorNav.setActive(null);
        const view = new EnterpriseView(this._data, this._router, this._tasks, this._grades, this._knowledge, this._comms);
        this._renderView(view.render());
    }

    _showFloor(floorId) {
        const floor = this._data.getFloor(floorId);
        const name = floor ? floor.name : floorId;
        this._setBreadcrumb(name);
        this._floorNav.setActive(floorId);
        const view = new FloorView(this._data, this._router, this._tasks, this._grades, this._knowledge, this._comms);
        this._renderView(view.render(floorId));
    }

    _showAgent(agentId) {
        const agent = this._data.getAgent(agentId);
        if (agent) {
            this._setBreadcrumb(`${agent.name} \u2014 ${agent.title}`);
            const floorId = this._data.getFloor(String(agent.floor))?.id;
            if (floorId) this._floorNav.setActive(floorId);
            const view = new AgentView(this._data, this._router, this._tasks, this._grades, this._knowledge);
            this._renderView(view.render(agentId));
        } else {
            this._setBreadcrumb('Agent Not Found');
            this._renderView(R.div('dash-empty', [
                R.div('dash-empty-icon', [R.text('\uD83D\uDD0D')]),
                R.div('dash-empty-text', [R.text(`Agent "${agentId}" not found`)])
            ]));
        }
    }

    _showAudit() {
        this._setBreadcrumb('Project Audit');
        this._floorNav.setActive(null);
        const view = new ProjectAudit(this._data, this._router, this._assets, this._tasks, this._knowledge);
        this._renderView(view.render());
    }

    _showAssets(projectId) {
        const proj = this._data.getProject(projectId);
        this._setBreadcrumb(proj ? `${proj.name} Assets` : 'Assets');
        this._floorNav.setActive(null);
        const view = new AssetInventory(this._data, this._router, this._assets);
        this._renderView(view.render(projectId));
    }

    _showComms(projectId) {
        this._setBreadcrumb('Tower Communications');
        this._floorNav.setActive(null);
        const view = new TowerCommsView(this._data, this._router, this._comms);
        this._renderView(view.render(projectId));
    }

    _showKnowledge(projectId) {
        const proj = projectId ? this._data.getProject(projectId) : null;
        this._setBreadcrumb(proj ? `${proj.name} Knowledge Base` : 'Knowledge Base');
        this._floorNav.setActive(null);
        const view = new KnowledgeView(this._data, this._router, this._knowledge, this._tasks);
        this._renderView(view.render(projectId));
    }

    _renderView(contentEl) {
        R.clear(this._mainContainer);
        // Move children from the view's container into our main container
        while (contentEl.firstChild) {
            this._mainContainer.appendChild(contentEl.firstChild);
        }
        // Scroll to top on view change
        if (this._smoothNav) this._smoothNav.scrollToTop();
    }

    _setBreadcrumb(text) {
        if (!this._breadcrumb) return;
        R.clear(this._breadcrumb);
        if (text) {
            this._breadcrumb.appendChild(R.text(' / '));
            this._breadcrumb.appendChild(R.el('span', { text }));
        }
    }

    _updateStatusBar() {
        const taskStats = this._tasks.stats();
        const gradeCount = this._grades.getAll().length;

        if (this._statusTasks) {
            this._statusTasks.innerHTML = `Tasks: <b>${taskStats['in-progress'] + taskStats.review}</b> active / <b>${taskStats.total}</b> total`;
        }
        if (this._statusGrades) {
            this._statusGrades.innerHTML = `Reviews: <b>${gradeCount}</b>`;
        }
    }

    _updateCommsIndicator() {
        if (!this._commsIndicator) return;
        const pending = this._comms.getPending().length;
        this._commsIndicator.textContent = pending > 0 ? `COMMS (${pending})` : 'COMMS';
        this._commsIndicator.classList.toggle('dash-topbar-comms-active', pending > 0);
    }

    _setupExportImport() {
        // Hidden file input for import
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (data.tasks) await this._tasks.importJSON(file);
                alert('Import successful!');
                this._router.start(); // Refresh
            } catch (err) {
                alert('Import failed: ' + err.message);
            }
        });

        this._fileInput = fileInput;
    }

    _exportAll() {
        this._tasks.exportJSON();
    }
}
