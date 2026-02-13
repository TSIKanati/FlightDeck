/**
 * CompletionReport.js - Task completion report form + display
 * Required when agent finishes a task. Captures what was done,
 * lessons learned, blockers, and recommendations.
 * Feeds directly into the KnowledgeStore.
 */

import { R } from '../shared/Renderer.js';

export class CompletionReport {
    /**
     * Render the completion report form
     * @param {object} opts - { task, agentName, onSubmit, onCancel }
     */
    static renderForm(opts = {}) {
        const form = R.div('dash-completion-form');

        form.appendChild(R.el('h3', {
            cls: 'dash-task-form-title',
            text: '\uD83D\uDCDD Completion Report'
        }));

        if (opts.task) {
            form.appendChild(R.el('p', {
                cls: 'dash-grade-form-task',
                text: `Task: ${opts.task.title}`
            }));
            if (opts.agentName) {
                form.appendChild(R.el('p', {
                    cls: 'dash-grade-form-task',
                    text: `Completed by: ${opts.agentName}`
                }));
            }
        }

        // Summary - What was done
        const summaryInput = R.el('textarea', {
            cls: 'dash-input dash-textarea',
            attrs: { placeholder: 'What was accomplished? Describe the work completed...', rows: '3' }
        });
        form.appendChild(CompletionReport._field('Summary of Work', summaryInput));

        // Lessons Learned - feeds knowledge base
        const lessonsInput = R.el('textarea', {
            cls: 'dash-input dash-textarea',
            attrs: { placeholder: 'What did we learn? Key insights, techniques, patterns discovered...', rows: '3' }
        });
        form.appendChild(CompletionReport._field('Lessons Learned (feeds Knowledge Base)', lessonsInput));

        // Blockers encountered
        const blockersInput = R.el('textarea', {
            cls: 'dash-input dash-textarea',
            attrs: { placeholder: 'Any blockers or challenges encountered? How were they resolved?', rows: '2' }
        });
        form.appendChild(CompletionReport._field('Blockers / Challenges', blockersInput));

        // Recommendations for future tasks
        const recsInput = R.el('textarea', {
            cls: 'dash-input dash-textarea',
            attrs: { placeholder: 'Recommendations for future agents working on similar tasks...', rows: '2' }
        });
        form.appendChild(CompletionReport._field('Recommendations', recsInput));

        // Buttons
        form.appendChild(R.div('dash-form-buttons', [
            R.el('button', {
                cls: 'dash-btn dash-btn-primary',
                text: 'Submit Report',
                on: {
                    click: () => {
                        if (!summaryInput.value.trim()) {
                            summaryInput.style.borderColor = 'var(--hr-danger)';
                            summaryInput.focus();
                            return;
                        }
                        if (opts.onSubmit) opts.onSubmit({
                            summary: summaryInput.value.trim(),
                            lessonsLearned: lessonsInput.value.trim(),
                            blockers: blockersInput.value.trim(),
                            recommendations: recsInput.value.trim(),
                            submittedBy: opts.task?.assignedTo || 'unknown'
                        });
                    }
                }
            }),
            R.el('button', {
                cls: 'dash-btn dash-btn-ghost',
                text: 'Skip Report',
                on: { click: () => { if (opts.onCancel) opts.onCancel(); } }
            })
        ]));

        return form;
    }

    /**
     * Render a completion report display (read-only)
     */
    static renderDisplay(report) {
        if (!report) {
            return R.div('dash-completion-empty', [
                R.el('p', { cls: 'dash-text-dim', text: 'No completion report submitted' })
            ]);
        }

        const card = R.div('dash-completion-display');

        if (report.summary) {
            card.appendChild(R.div('dash-completion-section', [
                R.div('dash-completion-label', [R.text('Summary')]),
                R.el('p', { cls: 'dash-completion-text', text: report.summary })
            ]));
        }

        if (report.lessonsLearned) {
            card.appendChild(R.div('dash-completion-section', [
                R.div('dash-completion-label', [R.text('\uD83D\uDCA1 Lessons Learned')]),
                R.el('p', { cls: 'dash-completion-text', text: report.lessonsLearned })
            ]));
        }

        if (report.blockers) {
            card.appendChild(R.div('dash-completion-section', [
                R.div('dash-completion-label', [R.text('\u26A0\uFE0F Blockers')]),
                R.el('p', { cls: 'dash-completion-text', text: report.blockers })
            ]));
        }

        if (report.recommendations) {
            card.appendChild(R.div('dash-completion-section', [
                R.div('dash-completion-label', [R.text('\u2705 Recommendations')]),
                R.el('p', { cls: 'dash-completion-text', text: report.recommendations })
            ]));
        }

        if (report.submittedAt) {
            card.appendChild(R.el('p', {
                cls: 'dash-completion-meta',
                text: `Submitted ${new Date(report.submittedAt).toLocaleString()} by ${report.submittedBy || 'unknown'}`
            }));
        }

        return card;
    }

    static _field(label, inputEl) {
        return R.div('dash-form-field', [
            R.el('label', { cls: 'dash-form-label', text: label }),
            inputEl
        ]);
    }
}
