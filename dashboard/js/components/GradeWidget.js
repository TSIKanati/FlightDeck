/**
 * GradeWidget.js - Agent grading form + grade display
 */

import { R } from '../shared/Renderer.js';

export class GradeWidget {
    /**
     * Render grading form for a task/agent
     * @param {object} opts - { agentId, agentName, taskId, taskTitle, onSubmit, onCancel }
     */
    static renderForm(opts = {}) {
        const form = R.div('dash-grade-form');

        form.appendChild(R.el('h3', {
            cls: 'dash-grade-form-title',
            text: `Grade: ${opts.agentName || opts.agentId}`
        }));

        if (opts.taskTitle) {
            form.appendChild(R.el('p', {
                cls: 'dash-grade-form-task',
                text: `Task: ${opts.taskTitle}`
            }));
        }

        const categories = ['quality', 'timeliness', 'thoroughness', 'communication'];
        const sliders = {};

        for (const cat of categories) {
            const row = R.div('dash-grade-row');
            const label = R.el('label', { cls: 'dash-grade-label', text: cat.charAt(0).toUpperCase() + cat.slice(1) });
            const valueDisplay = R.span('dash-grade-value', '3');

            const slider = R.el('input', {
                cls: 'dash-grade-slider',
                attrs: { type: 'range', min: '1', max: '5', step: '1', value: '3' }
            });
            slider.addEventListener('input', () => {
                valueDisplay.textContent = slider.value;
                const stars = '★'.repeat(parseInt(slider.value)) + '☆'.repeat(5 - parseInt(slider.value));
                valueDisplay.textContent = `${slider.value} ${stars}`;
            });
            // Trigger initial display
            const stars = '★★★☆☆';
            valueDisplay.textContent = `3 ${stars}`;

            sliders[cat] = slider;
            row.appendChild(label);
            row.appendChild(slider);
            row.appendChild(valueDisplay);
            form.appendChild(row);
        }

        // Feedback textarea
        const feedback = R.el('textarea', {
            cls: 'dash-input dash-textarea',
            attrs: { placeholder: 'Performance feedback...', rows: '3' }
        });
        form.appendChild(R.div('dash-form-field', [
            R.el('label', { cls: 'dash-form-label', text: 'Feedback' }),
            feedback
        ]));

        // Action items
        const actionItems = R.el('input', {
            cls: 'dash-input',
            attrs: { type: 'text', placeholder: 'Action items (comma separated)' }
        });
        form.appendChild(R.div('dash-form-field', [
            R.el('label', { cls: 'dash-form-label', text: 'Action Items' }),
            actionItems
        ]));

        // Buttons
        form.appendChild(R.div('dash-form-buttons', [
            R.el('button', {
                cls: 'dash-btn dash-btn-primary',
                text: 'Submit Grade',
                on: {
                    click: () => {
                        const scores = {};
                        for (const [cat, slider] of Object.entries(sliders)) {
                            scores[cat] = parseInt(slider.value);
                        }
                        if (opts.onSubmit) opts.onSubmit({
                            agentId: opts.agentId,
                            taskId: opts.taskId,
                            floor: opts.floor,
                            scores,
                            feedback: feedback.value.trim(),
                            actionItems: actionItems.value.split(',').map(s => s.trim()).filter(Boolean)
                        });
                    }
                }
            }),
            R.el('button', {
                cls: 'dash-btn dash-btn-ghost',
                text: 'Cancel',
                on: { click: () => { if (opts.onCancel) opts.onCancel(); } }
            })
        ]));

        return form;
    }

    /**
     * Render compact grade display badge
     */
    static renderBadge(grade, score) {
        if (!grade) return R.span('dash-grade-badge dash-grade-none', '--');
        const cls = score >= 4.5 ? 'excellent' : score >= 3.5 ? 'good' : score >= 2.5 ? 'fair' : 'poor';
        return R.span(`dash-grade-badge dash-grade-${cls}`, grade);
    }

    /**
     * Render grade history list
     */
    static renderHistory(reviews) {
        if (!reviews.length) {
            return R.div('dash-empty', [
                R.div('dash-empty-text', [R.text('No reviews yet')])
            ]);
        }

        const table = R.el('table', { cls: 'dash-floor-table' });
        const thead = R.el('thead');
        const tr = R.el('tr');
        for (const h of ['Date', 'Task', 'Quality', 'Time', 'Thorough', 'Comms', 'Grade', 'Feedback']) {
            tr.appendChild(R.el('th', { text: h }));
        }
        thead.appendChild(tr);
        table.appendChild(thead);

        const tbody = R.el('tbody');
        const sorted = [...reviews].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        for (const r of sorted) {
            const row = R.el('tr');
            row.appendChild(R.el('td', { text: r.date || '' }));
            row.appendChild(R.el('td', { text: r.taskId || '-' }));
            row.appendChild(R.el('td', { text: `${r.scores?.quality || '-'}/5` }));
            row.appendChild(R.el('td', { text: `${r.scores?.timeliness || '-'}/5` }));
            row.appendChild(R.el('td', { text: `${r.scores?.thoroughness || '-'}/5` }));
            row.appendChild(R.el('td', { text: `${r.scores?.communication || '-'}/5` }));
            row.appendChild(R.el('td', { children: [GradeWidget.renderBadge(r.overallGrade, r.averageScore)] }));
            row.appendChild(R.el('td', {
                text: r.feedback ? (r.feedback.length > 60 ? r.feedback.slice(0, 60) + '...' : r.feedback) : ''
            }));
            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        return table;
    }
}
