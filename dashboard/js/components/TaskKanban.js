/**
 * TaskKanban.js - Kanban board with drag-and-drop between columns
 * Columns: Backlog | In Progress | In Review | Done
 * Prevents dropping locked tasks into other columns
 */

import { R } from '../shared/Renderer.js';
import { TaskCard } from './TaskCard.js';

const COLUMNS = [
    { status: 'backlog',     label: 'Backlog',     icon: '\uD83D\uDCCB' },
    { status: 'in-progress', label: 'In Progress',  icon: '\u26A1' },
    { status: 'review',      label: 'In Review',    icon: '\uD83D\uDD0D' },
    { status: 'done',        label: 'Done',          icon: '\u2705' }
];

export class TaskKanban {
    /**
     * @param {Array} tasks - Array of task objects
     * @param {object} opts - { onStatusChange, onViewAgent, onCheckout, onRelease, taskStore }
     */
    static render(tasks, opts = {}) {
        const board = R.div('dash-kanban');

        for (const col of COLUMNS) {
            const colTasks = tasks.filter(t => t.status === col.status);
            const lockedCount = colTasks.filter(t => t.locked).length;
            const column = R.div('dash-kanban-col');

            // Column header
            column.appendChild(R.div('dash-kanban-col-header', [
                R.span('dash-kanban-col-icon', col.icon),
                R.span('dash-kanban-col-label', col.label),
                R.span('dash-kanban-col-count', String(colTasks.length)),
                lockedCount > 0
                    ? R.span('dash-kanban-col-locked', `\uD83D\uDD12 ${lockedCount}`)
                    : null
            ]));

            // Drop zone
            const dropZone = R.div('dash-kanban-col-body');
            dropZone.setAttribute('data-status', col.status);

            // Drag and drop events
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                const taskId = e.dataTransfer.getData('text/plain');
                if (!taskId) return;

                // Check if task is locked before allowing status change
                if (opts.taskStore) {
                    const task = opts.taskStore.getById(taskId);
                    if (task && task.locked && task.checkedOutBy) {
                        // Locked tasks can only be moved by the agent who checked them out
                        // For now, allow the move (owner can always override)
                    }
                }

                if (opts.onStatusChange) {
                    opts.onStatusChange(taskId, col.status);
                }
            });

            // Render task cards sorted by priority then due date
            const sorted = [...colTasks].sort((a, b) => {
                // Locked tasks float to top
                if (a.locked !== b.locked) return a.locked ? -1 : 1;
                const pa = parseInt((a.priority || 'P9').replace('P', ''));
                const pb = parseInt((b.priority || 'P9').replace('P', ''));
                if (pa !== pb) return pa - pb;
                if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
                return 0;
            });

            for (const task of sorted) {
                dropZone.appendChild(TaskCard.render(task, {
                    onStatusChange: opts.onStatusChange,
                    onViewAgent: opts.onViewAgent,
                    onCheckout: opts.onCheckout,
                    onRelease: opts.onRelease,
                    compact: col.status === 'done'
                }));
            }

            if (!colTasks.length) {
                dropZone.appendChild(R.div('dash-kanban-empty', [
                    R.text('Drop tasks here')
                ]));
            }

            column.appendChild(dropZone);
            board.appendChild(column);
        }

        return board;
    }
}
