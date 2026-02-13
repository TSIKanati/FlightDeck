/**
 * TaskForm.js - Add/edit task form component
 */

import { R } from '../shared/Renderer.js';

export class TaskForm {
    /**
     * Render a task creation form
     * @param {object} opts - { floor, project, agentId, agents, onSubmit, onCancel }
     */
    static render(opts = {}) {
        const form = R.div('dash-task-form');

        form.appendChild(R.el('h3', {
            cls: 'dash-task-form-title',
            text: opts.agentId ? 'Assign Task' : 'Create Task'
        }));

        // Title
        const titleInput = R.el('input', {
            cls: 'dash-input',
            attrs: { type: 'text', placeholder: 'Task title...', required: 'true' }
        });
        form.appendChild(TaskForm._field('Title', titleInput));

        // Description
        const descInput = R.el('textarea', {
            cls: 'dash-input dash-textarea',
            attrs: { placeholder: 'Description...', rows: '3' }
        });
        form.appendChild(TaskForm._field('Description', descInput));

        // Row: Priority + Category
        const row1 = R.div('dash-form-row');

        const prioritySelect = R.el('select', { cls: 'dash-input' });
        for (const p of ['P0', 'P1', 'P2', 'P3', 'P4']) {
            prioritySelect.appendChild(R.el('option', { text: p, attrs: { value: p } }));
        }
        prioritySelect.value = 'P2';
        row1.appendChild(TaskForm._field('Priority', prioritySelect));

        const catSelect = R.el('select', { cls: 'dash-input' });
        for (const c of ['general', 'audit', 'development', 'review', 'research', 'deployment', 'testing', 'documentation']) {
            catSelect.appendChild(R.el('option', { text: c, attrs: { value: c } }));
        }
        row1.appendChild(TaskForm._field('Category', catSelect));

        form.appendChild(row1);

        // Row: Assign To + Due Date
        const row2 = R.div('dash-form-row');

        const assignSelect = R.el('select', { cls: 'dash-input' });
        assignSelect.appendChild(R.el('option', { text: '(Unassigned)', attrs: { value: '' } }));
        if (opts.agents) {
            for (const a of opts.agents) {
                const opt = R.el('option', { text: `${a.name} - ${a.title}`, attrs: { value: a.id } });
                assignSelect.appendChild(opt);
            }
        }
        if (opts.agentId) assignSelect.value = opts.agentId;
        row2.appendChild(TaskForm._field('Assign To', assignSelect));

        const dueInput = R.el('input', {
            cls: 'dash-input',
            attrs: { type: 'date' }
        });
        row2.appendChild(TaskForm._field('Due Date', dueInput));

        form.appendChild(row2);

        // Tags input
        const tagsInput = R.el('input', {
            cls: 'dash-input',
            attrs: { type: 'text', placeholder: 'Tags (comma separated)' }
        });
        form.appendChild(TaskForm._field('Tags', tagsInput));

        // Buttons
        const buttons = R.div('dash-form-buttons');

        buttons.appendChild(R.el('button', {
            cls: 'dash-btn dash-btn-primary',
            text: 'Create Task',
            on: {
                click: () => {
                    if (!titleInput.value.trim()) {
                        titleInput.style.borderColor = 'var(--hr-danger)';
                        titleInput.focus();
                        return;
                    }
                    const taskData = {
                        title: titleInput.value.trim(),
                        description: descInput.value.trim(),
                        priority: prioritySelect.value,
                        category: catSelect.value,
                        assignedTo: assignSelect.value || null,
                        dueDate: dueInput.value || null,
                        floor: opts.floor !== undefined ? opts.floor : null,
                        project: opts.project || null,
                        tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
                    };
                    if (opts.onSubmit) opts.onSubmit(taskData);
                }
            }
        }));

        buttons.appendChild(R.el('button', {
            cls: 'dash-btn dash-btn-ghost',
            text: 'Cancel',
            on: { click: () => { if (opts.onCancel) opts.onCancel(); } }
        }));

        form.appendChild(buttons);
        return form;
    }

    static _field(label, inputEl) {
        return R.div('dash-form-field', [
            R.el('label', { cls: 'dash-form-label', text: label }),
            inputEl
        ]);
    }
}
