/**
 * FloorView.js - Floor detail view: header, stats, hierarchy, kanban, agent cards
 * Integrates TaskStore and GradeStore for full floor management
 */

import { R } from '../shared/Renderer.js';
import { TaskKanban } from '../components/TaskKanban.js';
import { TaskForm } from '../components/TaskForm.js';
import { GradeWidget } from '../components/GradeWidget.js';
import { CompletionReport } from '../components/CompletionReport.js';

export class FloorView {
    constructor(data, router, taskStore, gradeStore, knowledge, comms) {
        this._data = data;
        this._router = router;
        this._tasks = taskStore;
        this._grades = gradeStore;
        this._knowledge = knowledge;
        this._comms = comms;
    }

    render(floorId) {
        this._floorId = floorId;
        const container = R.div('dash-main');

        // Resolve floor
        const floor = this._data.getFloor(floorId);
        if (!floor) {
            container.appendChild(R.div('dash-empty', [
                R.div('dash-empty-icon', [R.text('\uD83D\uDD0D')]),
                R.div('dash-empty-text', [R.text(`Floor "${floorId}" not found`)])
            ]));
            return container;
        }

        const agents = this._data.getAgentsByFloor(floor.index);
        const project = this._data.getProjectByFloor(floor.index);

        // Floor header
        container.appendChild(this._renderHeader(floor, agents, project));

        // Stat cards
        container.appendChild(this._renderStats(floor, agents, project));

        // Tabs: Hierarchy | Tasks | Performance
        const tabContent = R.div('dash-tab-content');
        container.appendChild(this._renderTabs(floor, agents, tabContent));
        container.appendChild(tabContent);

        // Default to Hierarchy
        this._showHierarchyTab(floor, agents, tabContent);

        return container;
    }

    _renderHeader(floor, agents, project) {
        const hdr = R.div('dash-floor-header');

        hdr.appendChild(R.el('div', {
            cls: 'dash-floor-header-emoji',
            style: { borderColor: floor.color || 'var(--hr-border)' },
            children: [R.text(floor.emoji || '')]
        }));

        const info = R.div('dash-floor-header-info');
        const indexLabel = floor.index < 0 ? `B${Math.abs(floor.index)}` : `F${floor.index}`;
        info.appendChild(R.el('h2', { text: `${indexLabel} \u2014 ${floor.name}` }));

        let subParts = [`${agents.length} agents`];
        if (project) subParts.push(project.description);
        info.appendChild(R.el('p', { text: subParts.join(' \u2022 ') }));

        if (project) {
            const badges = R.el('div', {
                style: { display: 'flex', gap: '8px', marginTop: '6px' }
            });
            badges.appendChild(R.priorityBadge(project.priority));
            badges.appendChild(R.statusBadge(project.status));
            info.appendChild(badges);
        }

        hdr.appendChild(info);
        return hdr;
    }

    _renderStats(floor, agents, project) {
        const grid = R.div('dash-stat-grid');

        grid.appendChild(R.statCard('Agents', agents.length, floor.type));

        // Task stats
        const taskStats = this._tasks ? this._tasks.floorStats(floor.index) : { total: 0 };
        grid.appendChild(R.statCard('Tasks', taskStats.total,
            taskStats.inProgress ? `${taskStats.inProgress} in progress` : 'None yet'));

        // Grade average
        const gradeAvg = this._grades ? this._grades.floorAverageGrade(floor.index) : null;
        grid.appendChild(R.statCard('Avg Grade',
            gradeAvg ? gradeAvg.grade : '--',
            gradeAvg ? `${gradeAvg.averageScore}/5.0 (${gradeAvg.totalReviews} reviews)` : 'No reviews yet'));

        // Division breakdown
        const divs = {};
        for (const a of agents) {
            const d = a.division || 'unassigned';
            divs[d] = (divs[d] || 0) + 1;
        }
        grid.appendChild(R.statCard('Divisions', Object.keys(divs).length,
            Object.entries(divs).map(([k, v]) => `${k}: ${v}`).join(', ')));

        return grid;
    }

    _renderTabs(floor, agents, contentEl) {
        const tabs = R.div('dash-tabs');
        const tabDefs = [
            { id: 'hierarchy', label: 'Hierarchy', icon: '\uD83C\uDFE2' },
            { id: 'tasks', label: 'Task Board', icon: '\uD83D\uDCCB' },
            { id: 'agents', label: 'All Agents', icon: '\uD83D\uDC64' },
            { id: 'performance', label: 'Performance', icon: '\uD83C\uDFC6' }
        ];

        for (const tab of tabDefs) {
            const btn = R.el('button', {
                cls: `dash-tab ${tab.id === 'hierarchy' ? 'active' : ''}`,
                text: `${tab.icon} ${tab.label}`,
                on: {
                    click: () => {
                        tabs.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
                        btn.classList.add('active');
                        R.clear(contentEl);
                        if (tab.id === 'hierarchy') this._showHierarchyTab(floor, agents, contentEl);
                        else if (tab.id === 'tasks') this._showTasksTab(floor, agents, contentEl);
                        else if (tab.id === 'agents') this._showAgentsTab(agents, contentEl);
                        else this._showPerformanceTab(floor, agents, contentEl);
                    }
                }
            });
            tabs.appendChild(btn);
        }

        return tabs;
    }

    _showHierarchyTab(floor, agents, container) {
        R.clear(container);
        const hierarchy = this._data.buildFloorHierarchy(floor.index);
        if (hierarchy.length) {
            const sec = R.div('dash-section');
            sec.appendChild(R.div('dash-section-title', [R.text('Organization Hierarchy')]));
            const ul = R.el('ul', { cls: 'dash-hierarchy' });
            for (const node of hierarchy) {
                ul.appendChild(this._renderNode(node));
            }
            sec.appendChild(ul);
            container.appendChild(sec);
        } else {
            container.appendChild(R.div('dash-empty', [
                R.div('dash-empty-icon', [R.text('\uD83C\uDFE2')]),
                R.div('dash-empty-text', [R.text('No hierarchy data for this floor')])
            ]));
        }
    }

    _showTasksTab(floor, agents, container) {
        R.clear(container);
        const floorTasks = this._tasks ? this._tasks.getByFloor(floor.index) : [];

        // Add Task button
        const header = R.div('dash-section-header', [
            R.span('', `${floorTasks.length} tasks on this floor`),
            R.el('button', {
                cls: 'dash-btn dash-btn-primary',
                text: '+ Add Task',
                on: {
                    click: () => {
                        R.clear(container);
                        const project = this._data.getProjectByFloor(floor.index);
                        container.appendChild(TaskForm.render({
                            floor: floor.index,
                            project: project?.id,
                            agents: agents,
                            onSubmit: (taskData) => {
                                this._tasks.create(taskData);
                                this._showTasksTab(floor, agents, container);
                            },
                            onCancel: () => this._showTasksTab(floor, agents, container)
                        }));
                    }
                }
            })
        ]);
        container.appendChild(header);

        if (floorTasks.length) {
            container.appendChild(TaskKanban.render(floorTasks, {
                taskStore: this._tasks,
                onStatusChange: (taskId, newStatus) => {
                    if (newStatus === 'done') {
                        const task = this._tasks.getById(taskId);
                        if (task) {
                            R.clear(container);
                            container.appendChild(CompletionReport.renderForm({
                                task,
                                onSubmit: (report) => {
                                    this._tasks.submitCompletionReport(taskId, report);
                                    this._tasks.updateStatus(taskId, 'done');
                                    if (this._knowledge && (report.lessonsLearned || report.recommendations)) {
                                        this._knowledge.addFromCompletionReport(task, report, task.grade);
                                    }
                                    this._showTasksTab(floor, agents, container);
                                },
                                onCancel: () => {
                                    this._tasks.updateStatus(taskId, 'done');
                                    this._showTasksTab(floor, agents, container);
                                }
                            }));
                            return;
                        }
                    }
                    this._tasks.updateStatus(taskId, newStatus);
                    this._showTasksTab(floor, agents, container);
                },
                onCheckout: (taskId) => {
                    const task = this._tasks.getById(taskId);
                    if (task && task.assignedTo) {
                        this._tasks.checkout(taskId, task.assignedTo);
                    }
                    this._showTasksTab(floor, agents, container);
                },
                onRelease: (taskId) => {
                    this._tasks.release(taskId);
                    this._showTasksTab(floor, agents, container);
                },
                onViewAgent: (agentId) => this._router.navigate(`agent=${agentId}`)
            }));
        } else {
            container.appendChild(R.div('dash-empty', [
                R.div('dash-empty-icon', [R.text('\uD83D\uDCCB')]),
                R.div('dash-empty-text', [R.text('No tasks yet. Click + Add Task to create one.')])
            ]));
        }
    }

    _showAgentsTab(agents, container) {
        R.clear(container);
        const sec = R.div('dash-section');
        sec.appendChild(R.div('dash-section-title', [R.text(`All Agents (${agents.length})`)]));

        if (!agents.length) {
            sec.appendChild(R.div('dash-empty', [
                R.div('dash-empty-icon', [R.text('\uD83D\uDC64')]),
                R.div('dash-empty-text', [R.text('No agents assigned to this floor')])
            ]));
            container.appendChild(sec);
            return;
        }

        const grid = R.div('dash-agent-grid');
        const sorted = [...agents].sort((a, b) => {
            const aDir = (a.manages && a.manages.length) ? 0 : 1;
            const bDir = (b.manages && b.manages.length) ? 0 : 1;
            if (aDir !== bDir) return aDir - bDir;
            return (a.name || '').localeCompare(b.name || '');
        });

        for (const agent of sorted) {
            grid.appendChild(this._renderAgentCard(agent));
        }
        sec.appendChild(grid);
        container.appendChild(sec);
    }

    _showPerformanceTab(floor, agents, container) {
        R.clear(container);

        // Floor-level grade average
        const gradeAvg = this._grades ? this._grades.floorAverageGrade(floor.index) : null;
        if (gradeAvg) {
            const summary = R.div('dash-stat-grid');
            summary.appendChild(R.statCard('Floor Grade', gradeAvg.grade, `${gradeAvg.averageScore}/5.0`));
            summary.appendChild(R.statCard('Total Reviews', gradeAvg.totalReviews, ''));
            container.appendChild(summary);
        }

        // Per-agent grade table
        const sec = R.div('dash-section');
        sec.appendChild(R.div('dash-section-title', [R.text('Agent Performance')]));

        const table = R.el('table', { cls: 'dash-floor-table' });
        const thead = R.el('thead');
        const tr = R.el('tr');
        for (const h of ['Agent', 'Title', 'Tasks', 'Completed', 'Grade', 'Reviews']) {
            tr.appendChild(R.el('th', { text: h }));
        }
        thead.appendChild(tr);
        table.appendChild(thead);

        const tbody = R.el('tbody');
        for (const agent of agents) {
            const agentTasks = this._tasks ? this._tasks.agentStats(agent.id) : { active: 0, completed: 0 };
            const agentGrade = this._grades ? this._grades.agentOverallGrade(agent.id) : null;

            const row = R.el('tr', {
                on: { click: () => this._router.navigate(`agent=${agent.id}`) }
            });
            row.appendChild(R.el('td', {
                children: [R.el('span', { cls: 'dash-floor-table-name', text: agent.name })]
            }));
            row.appendChild(R.el('td', { text: agent.title || '' }));
            row.appendChild(R.el('td', { text: String(agentTasks.active), style: { fontFamily: 'var(--hr-font-mono)' } }));
            row.appendChild(R.el('td', { text: String(agentTasks.completed), style: { fontFamily: 'var(--hr-font-mono)' } }));
            row.appendChild(R.el('td', {
                children: [agentGrade
                    ? GradeWidget.renderBadge(agentGrade.grade, agentGrade.averageScore)
                    : R.span('dash-grade-badge dash-grade-none', '--')]
            }));
            row.appendChild(R.el('td', { text: agentGrade ? String(agentGrade.totalReviews) : '0' }));
            tbody.appendChild(row);
        }
        table.appendChild(tbody);
        sec.appendChild(table);
        container.appendChild(sec);
    }

    _renderNode(node) {
        const agent = node.agent;
        const agentTasks = this._tasks ? this._tasks.agentStats(agent.id) : { active: 0, completed: 0 };
        const agentGrade = this._grades ? this._grades.agentOverallGrade(agent.id) : null;

        const li = R.el('li');
        const nodeEl = R.el('span', {
            cls: 'dash-hierarchy-node',
            on: { click: () => this._router.navigate(`agent=${agent.id}`) },
            children: [
                R.el('span', {
                    cls: 'dash-hierarchy-dot',
                    style: { background: agent.avatar || agent._floorColor || '#3c8cff' }
                }),
                R.span('dash-hierarchy-name', agent.name),
                R.span('dash-hierarchy-title', `\u2014 ${agent.title}`),
                R.clearanceBadge(agent.securityClearance),
                agentGrade ? GradeWidget.renderBadge(agentGrade.grade, agentGrade.averageScore) : null,
                agentTasks.active > 0 ? R.span('dash-agent-card-tag', `${agentTasks.active} tasks`) : null
            ]
        });
        li.appendChild(nodeEl);

        if (node.children && node.children.length) {
            const subUl = R.el('ul');
            for (const child of node.children) {
                subUl.appendChild(this._renderNode(child));
            }
            li.appendChild(subUl);
        }

        return li;
    }

    _renderAgentCard(agent) {
        const initials = (agent.name || '??').slice(0, 2).toUpperCase();
        const avatarColor = agent.avatar || agent._floorColor || '#3c8cff';
        const agentTasks = this._tasks ? this._tasks.agentStats(agent.id) : { active: 0, completed: 0 };
        const agentGrade = this._grades ? this._grades.agentOverallGrade(agent.id) : null;

        const card = R.el('div', {
            cls: 'dash-agent-card',
            on: { click: () => this._router.navigate(`agent=${agent.id}`) },
            children: [
                R.el('div', {
                    cls: 'dash-agent-card-avatar',
                    style: { background: avatarColor },
                    children: [R.text(initials)]
                }),
                R.div('dash-agent-card-body', [
                    R.div('dash-agent-card-name', [R.text(agent.name || agent.id)]),
                    R.div('dash-agent-card-title', [R.text(agent.title || '')]),
                    R.div('dash-agent-card-meta', [
                        agent.model ? R.span('dash-agent-card-tag', agent.model) : null,
                        R.clearanceBadge(agent.securityClearance),
                        agentGrade ? GradeWidget.renderBadge(agentGrade.grade, agentGrade.averageScore) : null,
                        agentTasks.active > 0 ? R.span('dash-agent-card-tag', `${agentTasks.active} tasks`) : null
                    ])
                ])
            ]
        });

        return card;
    }
}
