/**
 * TaskCard.js - Reusable task card component
 * Shows checkout/lock status, priority, subtask progress, and actions
 */

import { R } from '../shared/Renderer.js';

export class TaskCard {
    /**
     * @param {object} task - Task data object
     * @param {object} opts - { onStatusChange, onDelete, onViewAgent, onCheckout, onRelease, compact }
     */
    static render(task, opts = {}) {
        const isLocked = task.locked && task.checkedOutBy;
        const card = R.el('div', {
            cls: `dash-task-card dash-task-${task.status} ${isLocked ? 'dash-task-locked' : ''}`,
            attrs: { 'data-task-id': task.id, draggable: isLocked ? 'false' : 'true' }
        });

        // Drag support (disabled when locked by another agent)
        if (!isLocked) {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', task.id);
                card.classList.add('dragging');
            });
            card.addEventListener('dragend', () => card.classList.remove('dragging'));
        }

        // Lock indicator
        if (isLocked) {
            card.appendChild(R.el('div', {
                cls: 'dash-task-lock-badge',
                children: [
                    R.span('dash-task-lock-icon', '\uD83D\uDD12'),
                    R.span('dash-task-lock-agent', task.checkedOutBy)
                ]
            }));
        }

        // Header row: priority + title
        const header = R.div('dash-task-card-header', [
            R.priorityBadge(task.priority),
            R.span('dash-task-card-title', task.title)
        ]);
        card.appendChild(header);

        // Description (truncated)
        if (task.description && !opts.compact) {
            const desc = task.description.length > 120
                ? task.description.slice(0, 120) + '...'
                : task.description;
            card.appendChild(R.el('p', { cls: 'dash-task-card-desc', text: desc }));
        }

        // Subtask progress
        if (task.subtasks && task.subtasks.length) {
            const done = task.subtasks.filter(s => s.done).length;
            card.appendChild(R.div('dash-task-card-progress', [
                R.el('div', {
                    cls: 'dash-task-card-progress-bar',
                    children: [R.el('div', {
                        cls: 'dash-task-card-progress-fill',
                        style: { width: `${(done / task.subtasks.length) * 100}%` }
                    })]
                }),
                R.span('dash-task-card-progress-text', `${done}/${task.subtasks.length}`)
            ]));
        }

        // Completion report indicator
        if (task.completionReport) {
            card.appendChild(R.span('dash-task-report-badge', '\uD83D\uDCDD Report'));
        }

        // Footer: assignee + due date + actions
        const footer = R.div('dash-task-card-footer');

        if (task.assignedTo) {
            const assignee = R.el('span', {
                cls: 'dash-task-card-assignee',
                text: task.assignedTo,
                on: opts.onViewAgent ? { click: (e) => { e.stopPropagation(); opts.onViewAgent(task.assignedTo); } } : {}
            });
            footer.appendChild(assignee);
        }

        if (task.dueDate) {
            const due = new Date(task.dueDate);
            const now = new Date();
            const overdue = due < now && task.status !== 'done';
            footer.appendChild(R.el('span', {
                cls: `dash-task-card-due ${overdue ? 'overdue' : ''}`,
                text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }));
        }

        if (task.grade) {
            footer.appendChild(R.span('dash-task-card-grade', task.grade));
        }

        card.appendChild(footer);

        // Action buttons area
        const actions = R.div('dash-task-card-actions');

        // Checkout/Release button
        if (task.status !== 'done') {
            if (!task.locked && opts.onCheckout) {
                actions.appendChild(R.el('button', {
                    cls: 'dash-task-card-action',
                    text: '\uD83D\uDD13 Checkout',
                    on: { click: (e) => { e.stopPropagation(); opts.onCheckout(task.id); } }
                }));
            } else if (task.locked && opts.onRelease) {
                actions.appendChild(R.el('button', {
                    cls: 'dash-task-card-action dash-task-card-action-release',
                    text: '\uD83D\uDD12 Release',
                    on: { click: (e) => { e.stopPropagation(); opts.onRelease(task.id); } }
                }));
            }
        }

        // Status advance button
        if (opts.onStatusChange && task.status !== 'done') {
            const nextStatus = { backlog: 'in-progress', 'in-progress': 'review', review: 'done' };
            const next = nextStatus[task.status];
            if (next) {
                actions.appendChild(R.el('button', {
                    cls: 'dash-task-card-action',
                    text: next === 'done' ? '\u2705 Complete' : next === 'review' ? '\uD83D\uDD0D Review' : '\u26A1 Start',
                    on: { click: (e) => { e.stopPropagation(); opts.onStatusChange(task.id, next); } }
                }));
            }
        }

        if (actions.children.length) card.appendChild(actions);

        return card;
    }
}
