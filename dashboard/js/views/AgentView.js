/**
 * AgentView.js - Individual agent detail: profile, tasks, grades, history, knowledge
 * Integrates task checkout/locking, completion reports, and knowledge base
 */

import { R } from '../shared/Renderer.js';
import { TaskCard } from '../components/TaskCard.js';
import { TaskForm } from '../components/TaskForm.js';
import { GradeWidget } from '../components/GradeWidget.js';
import { CompletionReport } from '../components/CompletionReport.js';

export class AgentView {
    constructor(data, router, taskStore, gradeStore, knowledge) {
        this._data = data;
        this._router = router;
        this._tasks = taskStore;
        this._grades = gradeStore;
        this._knowledge = knowledge;
    }

    render(agentId) {
        const container = R.div('dash-main');
        const agent = this._data.getAgent(agentId);

        if (!agent) {
            container.appendChild(R.div('dash-empty', [
                R.div('dash-empty-icon', [R.text('\uD83D\uDD0D')]),
                R.div('dash-empty-text', [R.text(`Agent "${agentId}" not found`)])
            ]));
            return container;
        }

        // Agent profile header
        container.appendChild(this._renderProfile(agent));

        // Tabs: Tasks | Grades | History | Knowledge
        const tabContent = R.div('dash-tab-content');
        container.appendChild(this._renderTabs(agent, tabContent));
        container.appendChild(tabContent);

        // Default to Tasks tab
        this._showTasksTab(agent, tabContent);

        return container;
    }

    _renderProfile(agent) {
        const profile = R.div('dash-agent-profile');
        const initials = (agent.name || '??').slice(0, 2).toUpperCase();
        const color = agent.avatar || agent._floorColor || '#3c8cff';

        const left = R.div('dash-agent-profile-left', [
            R.el('div', {
                cls: 'dash-agent-profile-avatar',
                style: { background: color },
                children: [R.text(initials)]
            }),
            R.div('dash-agent-profile-info', [
                R.el('h2', { text: agent.name }),
                R.el('p', { cls: 'dash-agent-profile-title', text: agent.title || '' }),
                R.div('dash-agent-card-meta', [
                    agent.model ? R.span('dash-agent-card-tag', agent.model) : null,
                    agent.division ? R.span('dash-agent-card-tag', agent.division) : null,
                    R.clearanceBadge(agent.securityClearance),
                    R.span('dash-agent-card-tag', `Floor ${agent.floor}`)
                ])
            ])
        ]);

        // Grade summary + checkout info on right
        const overallGrade = this._grades.agentOverallGrade(agent.id);
        const agentTasks = this._tasks.agentStats(agent.id);
        const lockedTasks = this._tasks.getByAgent(agent.id).filter(t => t.locked);
        const right = R.div('dash-agent-profile-right', [
            R.div('dash-agent-profile-stat', [
                R.div('dash-stat-card-label', [R.text('Grade')]),
                overallGrade
                    ? GradeWidget.renderBadge(overallGrade.grade, overallGrade.averageScore)
                    : R.span('dash-grade-badge dash-grade-none', '--')
            ]),
            R.div('dash-agent-profile-stat', [
                R.div('dash-stat-card-label', [R.text('Active Tasks')]),
                R.div('dash-stat-card-value', [R.text(String(agentTasks.active))])
            ]),
            R.div('dash-agent-profile-stat', [
                R.div('dash-stat-card-label', [R.text('Completed')]),
                R.div('dash-stat-card-value', [R.text(String(agentTasks.completed))])
            ]),
            R.div('dash-agent-profile-stat', [
                R.div('dash-stat-card-label', [R.text('Checked Out')]),
                R.div('dash-stat-card-value', [
                    R.text(String(lockedTasks.length)),
                    lockedTasks.length > 0
                        ? R.span('dash-task-lock-icon', ' \uD83D\uDD12')
                        : null
                ])
            ])
        ]);

        profile.appendChild(left);
        profile.appendChild(right);

        // Back to floor link
        const floor = this._data.getFloor(String(agent.floor));
        if (floor) {
            const backLink = R.el('a', {
                cls: 'dash-back-link',
                text: `\u2190 Back to ${floor.name}`,
                attrs: { href: '#' },
                on: { click: (e) => { e.preventDefault(); this._router.navigate(`floor=${floor.id}`); } }
            });
            profile.insertBefore(backLink, profile.firstChild);
        }

        return profile;
    }

    _renderTabs(agent, contentEl) {
        const tabs = R.div('dash-tabs');
        const tabDefs = [
            { id: 'tasks', label: 'Tasks', icon: '\uD83D\uDCCB' },
            { id: 'grades', label: 'Performance', icon: '\uD83C\uDFC6' },
            { id: 'history', label: 'History', icon: '\uD83D\uDCDC' },
            { id: 'knowledge', label: 'Knowledge', icon: '\uD83D\uDCDA' }
        ];

        for (const tab of tabDefs) {
            const btn = R.el('button', {
                cls: `dash-tab ${tab.id === 'tasks' ? 'active' : ''}`,
                text: `${tab.icon} ${tab.label}`,
                attrs: { 'data-tab': tab.id },
                on: {
                    click: () => {
                        tabs.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
                        btn.classList.add('active');
                        R.clear(contentEl);
                        if (tab.id === 'tasks') this._showTasksTab(agent, contentEl);
                        else if (tab.id === 'grades') this._showGradesTab(agent, contentEl);
                        else if (tab.id === 'knowledge') this._showKnowledgeTab(agent, contentEl);
                        else this._showHistoryTab(agent, contentEl);
                    }
                }
            });
            tabs.appendChild(btn);
        }

        return tabs;
    }

    _showTasksTab(agent, container) {
        R.clear(container);
        const tasks = this._tasks.getByAgent(agent.id);

        // Add Task button
        const addBtn = R.el('button', {
            cls: 'dash-btn dash-btn-primary',
            text: '+ Add Task',
            on: {
                click: () => {
                    R.clear(container);
                    const form = TaskForm.render({
                        agentId: agent.id,
                        floor: agent.floor,
                        project: agent._floorKey ? this._data.getProjectByFloor(agent.floor)?.id : null,
                        agents: this._data.getAgentsByFloor(agent.floor),
                        onSubmit: (taskData) => {
                            this._tasks.create(taskData);
                            this._showTasksTab(agent, container);
                        },
                        onCancel: () => this._showTasksTab(agent, container)
                    });
                    container.appendChild(form);
                }
            }
        });

        const lockedCount = tasks.filter(t => t.locked).length;
        container.appendChild(R.div('dash-section-header', [
            R.span('', `${tasks.length} tasks${lockedCount ? ` (\uD83D\uDD12 ${lockedCount} checked out)` : ''}`),
            addBtn
        ]));

        if (!tasks.length) {
            container.appendChild(R.div('dash-empty', [
                R.div('dash-empty-icon', [R.text('\uD83D\uDCCB')]),
                R.div('dash-empty-text', [R.text('No tasks assigned. Click + Add Task to create one.')])
            ]));
            return;
        }

        // Group by status
        for (const status of ['in-progress', 'review', 'backlog', 'done']) {
            const group = tasks.filter(t => t.status === status);
            if (!group.length) continue;

            const sec = R.div('dash-section');
            sec.appendChild(R.div('dash-section-title', [R.text(`${status.toUpperCase()} (${group.length})`)]));

            for (const task of group) {
                sec.appendChild(TaskCard.render(task, {
                    onStatusChange: (id, newStatus) => {
                        if (newStatus === 'done') {
                            // Show completion report form first
                            R.clear(container);
                            container.appendChild(CompletionReport.renderForm({
                                task,
                                agentName: agent.name,
                                onSubmit: (report) => {
                                    this._tasks.submitCompletionReport(id, report);
                                    this._tasks.updateStatus(id, 'done');

                                    // Auto-add to knowledge base
                                    if (this._knowledge && (report.lessonsLearned || report.recommendations)) {
                                        this._knowledge.addFromCompletionReport(task, report, task.grade);
                                    }

                                    // Now prompt for grading
                                    R.clear(container);
                                    container.appendChild(GradeWidget.renderForm({
                                        agentId: agent.id,
                                        agentName: agent.name,
                                        taskId: task.id,
                                        taskTitle: task.title,
                                        floor: agent.floor,
                                        onSubmit: (gradeData) => {
                                            this._grades.create(gradeData);
                                            this._tasks.update(task.id, { grade: gradeData.scores ?
                                                this._grades.calcGrade(Object.values(gradeData.scores).reduce((a,b)=>a+b,0)/4) : null });
                                            this._showTasksTab(agent, container);
                                        },
                                        onCancel: () => this._showTasksTab(agent, container)
                                    }));
                                },
                                onCancel: () => {
                                    // Skip report, just mark done and grade
                                    this._tasks.updateStatus(id, 'done');
                                    R.clear(container);
                                    container.appendChild(GradeWidget.renderForm({
                                        agentId: agent.id,
                                        agentName: agent.name,
                                        taskId: task.id,
                                        taskTitle: task.title,
                                        floor: agent.floor,
                                        onSubmit: (gradeData) => {
                                            this._grades.create(gradeData);
                                            this._tasks.update(task.id, { grade: gradeData.scores ?
                                                this._grades.calcGrade(Object.values(gradeData.scores).reduce((a,b)=>a+b,0)/4) : null });
                                            this._showTasksTab(agent, container);
                                        },
                                        onCancel: () => this._showTasksTab(agent, container)
                                    }));
                                }
                            }));
                            return;
                        }
                        this._tasks.updateStatus(id, newStatus);
                        this._showTasksTab(agent, container);
                    },
                    onCheckout: (id) => {
                        this._tasks.checkout(id, agent.id);
                        this._showTasksTab(agent, container);
                    },
                    onRelease: (id) => {
                        this._tasks.release(id);
                        this._showTasksTab(agent, container);
                    },
                    onViewAgent: (id) => this._router.navigate(`agent=${id}`)
                }));
            }
            container.appendChild(sec);
        }
    }

    _showGradesTab(agent, container) {
        R.clear(container);
        const reviews = this._grades.getByAgent(agent.id);
        const overall = this._grades.agentOverallGrade(agent.id);

        if (overall) {
            const summary = R.div('dash-stat-grid');
            summary.appendChild(R.statCard('Overall Grade', overall.grade, `${overall.averageScore}/5.0`));
            summary.appendChild(R.statCard('Reviews', overall.totalReviews, 'Total evaluations'));

            const catAvgs = { quality: 0, timeliness: 0, thoroughness: 0, communication: 0 };
            let count = 0;
            for (const r of reviews) {
                if (r.scores) {
                    for (const k of Object.keys(catAvgs)) {
                        catAvgs[k] += r.scores[k] || 0;
                    }
                    count++;
                }
            }
            if (count) {
                for (const k of Object.keys(catAvgs)) catAvgs[k] = Math.round((catAvgs[k] / count) * 10) / 10;
            }
            summary.appendChild(R.statCard('Best',
                Object.entries(catAvgs).sort((a,b) => b[1] - a[1])[0]?.[0] || '-',
                `${Object.entries(catAvgs).sort((a,b) => b[1] - a[1])[0]?.[1] || 0}/5`
            ));
            container.appendChild(summary);

            const bars = R.div('dash-section');
            bars.appendChild(R.div('dash-section-title', [R.text('Category Breakdown')]));
            for (const [cat, avg] of Object.entries(catAvgs)) {
                bars.appendChild(R.metricBar(cat.charAt(0).toUpperCase() + cat.slice(1), avg, 5, 'var(--hr-accent)'));
            }
            container.appendChild(bars);
        }

        const sec = R.div('dash-section');
        sec.appendChild(R.div('dash-section-title', [R.text('Review History')]));
        sec.appendChild(GradeWidget.renderHistory(reviews));
        container.appendChild(sec);
    }

    _showHistoryTab(agent, container) {
        R.clear(container);
        const stats = this._tasks.agentStats(agent.id);

        container.appendChild(R.div('dash-section-title', [R.text('Completed Task Log')]));

        if (!stats.completedLog.length) {
            container.appendChild(R.div('dash-empty', [
                R.div('dash-empty-icon', [R.text('\uD83D\uDCDC')]),
                R.div('dash-empty-text', [R.text('No completed tasks in the log yet')])
            ]));
            return;
        }

        const table = R.el('table', { cls: 'dash-floor-table' });
        const thead = R.el('thead');
        const tr = R.el('tr');
        for (const h of ['Completed', 'Task', 'Project', 'Grade', 'Report']) {
            tr.appendChild(R.el('th', { text: h }));
        }
        thead.appendChild(tr);
        table.appendChild(thead);

        const tbody = R.el('tbody');
        for (const entry of stats.completedLog) {
            const row = R.el('tr');
            row.appendChild(R.el('td', { text: entry.completedAt ? new Date(entry.completedAt).toLocaleDateString() : '-' }));
            row.appendChild(R.el('td', { text: entry.title }));
            row.appendChild(R.el('td', { text: entry.project || '-' }));
            row.appendChild(R.el('td', { text: entry.grade || '-' }));
            row.appendChild(R.el('td', {
                text: entry.completionReport ? '\uD83D\uDCDD Yes' : '-',
                style: entry.completionReport ? { color: 'var(--hr-success)' } : {}
            }));
            tbody.appendChild(row);
        }
        table.appendChild(tbody);
        container.appendChild(table);

        // Show completion reports inline
        for (const entry of stats.completedLog) {
            if (entry.completionReport) {
                const reportSec = R.div('dash-section');
                reportSec.appendChild(R.div('dash-section-title', [R.text(`Report: ${entry.title}`)]));
                reportSec.appendChild(CompletionReport.renderDisplay(entry.completionReport));
                container.appendChild(reportSec);
            }
        }
    }

    _showKnowledgeTab(agent, container) {
        R.clear(container);

        if (!this._knowledge) {
            container.appendChild(R.div('dash-empty', [
                R.div('dash-empty-text', [R.text('Knowledge base not available')])
            ]));
            return;
        }

        const entries = this._knowledge.getByAgent(agent.id);

        container.appendChild(R.div('dash-section-title', [
            R.text(`Knowledge Contributions (${entries.length})`)
        ]));

        if (!entries.length) {
            container.appendChild(R.div('dash-empty', [
                R.div('dash-empty-icon', [R.text('\uD83D\uDCDA')]),
                R.div('dash-empty-text', [R.text('No knowledge contributions yet. Complete tasks with reports to build the knowledge base.')])
            ]));
            return;
        }

        for (const entry of entries) {
            const card = R.div('dash-kb-entry');
            card.appendChild(R.div('dash-kb-entry-header', [
                R.span('dash-kb-entry-type', entry.type === 'task-completion' ? '\uD83D\uDCCB Task' : '\u270D\uFE0F Manual'),
                entry.category ? R.span('dash-agent-card-tag', entry.category) : null,
                R.span('dash-kb-entry-date',
                    entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '')
            ]));
            card.appendChild(R.el('h4', { cls: 'dash-kb-entry-title', text: entry.title }));
            if (entry.content) {
                card.appendChild(R.el('p', { cls: 'dash-kb-entry-content', text: entry.content }));
            }
            if (entry.recommendations) {
                card.appendChild(R.div('dash-kb-entry-recs', [
                    R.span('dash-kb-entry-recs-label', 'Recommendations: '),
                    R.text(entry.recommendations)
                ]));
            }
            container.appendChild(card);
        }
    }
}
