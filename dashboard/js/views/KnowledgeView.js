/**
 * KnowledgeView.js - Per-project knowledge base view
 * Displays lessons learned from completed tasks, searchable and filterable.
 * Allows manual knowledge entry creation.
 */

import { R } from '../shared/Renderer.js';

export class KnowledgeView {
    constructor(data, router, knowledge, tasks) {
        this._data = data;
        this._router = router;
        this._knowledge = knowledge;
        this._tasks = tasks;
    }

    render(projectId) {
        this._projectId = projectId;
        const container = R.div('dash-main');

        // Header
        const proj = projectId ? this._data.getProject(projectId) : null;
        const header = R.div('dash-overview-header');
        header.appendChild(R.el('h2', {
            text: proj ? `${proj.name} Knowledge Base` : 'Enterprise Knowledge Base'
        }));
        header.appendChild(R.el('p', {
            text: 'Lessons learned, best practices, and institutional memory from completed tasks'
        }));
        container.appendChild(header);

        // Project filter (if no project specified)
        if (!projectId) {
            container.appendChild(this._renderProjectFilter(container));
        }

        // Stats
        container.appendChild(this._renderStats(projectId));

        // Search bar
        const contentContainer = R.div('dash-section');
        container.appendChild(this._renderSearch(contentContainer, projectId));

        // Add Entry button + entries
        container.appendChild(this._renderAddButton(contentContainer, projectId));

        // Entries list
        this._renderEntries(contentContainer, projectId);
        container.appendChild(contentContainer);

        return container;
    }

    _renderProjectFilter(container) {
        const sec = R.div('dash-section');
        sec.appendChild(R.div('dash-section-title', [R.text('Projects')]));

        const grid = R.div('dash-stat-grid');

        // All projects card
        grid.appendChild(R.el('div', {
            cls: 'dash-stat-card',
            style: { cursor: 'pointer' },
            on: { click: () => this._router.navigate('knowledge') },
            children: [
                R.div('dash-stat-card-label', [R.text('All Projects')]),
                R.div('dash-stat-card-value', [R.text(String(this._knowledge.getAll().length))]),
                R.div('dash-stat-card-sub', [R.text('Total entries')])
            ]
        }));

        for (const p of this._data.projects) {
            const kbStats = this._knowledge.projectStats(p.id);
            grid.appendChild(R.el('div', {
                cls: 'dash-stat-card',
                style: { cursor: 'pointer' },
                on: { click: () => this._router.navigate(`knowledge=${p.id}`) },
                children: [
                    R.div('dash-stat-card-label', [R.text(p.name)]),
                    R.div('dash-stat-card-value', [R.text(String(kbStats.total))]),
                    R.div('dash-stat-card-sub', [R.text(
                        kbStats.total > 0
                            ? `${kbStats.contributors.length} contributors`
                            : 'No entries yet'
                    )])
                ]
            }));
        }

        sec.appendChild(grid);
        return sec;
    }

    _renderStats(projectId) {
        const entries = projectId
            ? this._knowledge.getByProject(projectId)
            : this._knowledge.getAll();
        const taskCompletions = entries.filter(e => e.type === 'task-completion').length;
        const manualEntries = entries.filter(e => e.type === 'manual').length;
        const categories = {};
        for (const e of entries) {
            categories[e.category] = (categories[e.category] || 0) + 1;
        }

        const grid = R.div('dash-stat-grid');
        grid.appendChild(R.statCard('Total Entries', entries.length, ''));
        grid.appendChild(R.statCard('From Tasks', taskCompletions, 'Auto-captured'));
        grid.appendChild(R.statCard('Manual', manualEntries, 'Manually added'));
        grid.appendChild(R.statCard('Categories', Object.keys(categories).length,
            Object.entries(categories).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'));
        return grid;
    }

    _renderSearch(contentContainer, projectId) {
        const searchRow = R.div('dash-section-header');

        const searchInput = R.el('input', {
            cls: 'dash-input',
            attrs: { type: 'text', placeholder: 'Search knowledge base...' },
            style: { maxWidth: '400px' }
        });

        searchInput.addEventListener('input', () => {
            const q = searchInput.value.trim();
            R.clear(contentContainer);
            if (q) {
                const results = this._knowledge.search(q).filter(
                    e => !projectId || e.project === projectId
                );
                this._renderFilteredEntries(contentContainer, results, `Search: "${q}"`);
            } else {
                this._renderEntries(contentContainer, projectId);
            }
        });

        searchRow.appendChild(searchInput);
        return searchRow;
    }

    _renderAddButton(contentContainer, projectId) {
        const sec = R.div('dash-section-header');
        sec.appendChild(R.el('button', {
            cls: 'dash-btn dash-btn-primary',
            text: '+ Add Knowledge Entry',
            on: {
                click: () => {
                    R.clear(contentContainer);
                    contentContainer.appendChild(this._renderAddForm(contentContainer, projectId));
                }
            }
        }));
        return sec;
    }

    _renderAddForm(contentContainer, projectId) {
        const form = R.div('dash-task-form');
        form.appendChild(R.el('h3', { cls: 'dash-task-form-title', text: 'Add Knowledge Entry' }));

        const titleInput = R.el('input', {
            cls: 'dash-input',
            attrs: { type: 'text', placeholder: 'Entry title...' }
        });
        form.appendChild(R.div('dash-form-field', [
            R.el('label', { cls: 'dash-form-label', text: 'Title' }),
            titleInput
        ]));

        const contentInput = R.el('textarea', {
            cls: 'dash-input dash-textarea',
            attrs: { placeholder: 'Knowledge content, best practices, lessons...', rows: '4' }
        });
        form.appendChild(R.div('dash-form-field', [
            R.el('label', { cls: 'dash-form-label', text: 'Content' }),
            contentInput
        ]));

        const recsInput = R.el('textarea', {
            cls: 'dash-input dash-textarea',
            attrs: { placeholder: 'Recommendations for future agents...', rows: '2' }
        });
        form.appendChild(R.div('dash-form-field', [
            R.el('label', { cls: 'dash-form-label', text: 'Recommendations' }),
            recsInput
        ]));

        const row = R.div('dash-form-row');
        const catSelect = R.el('select', { cls: 'dash-input' });
        for (const c of ['general', 'audit', 'development', 'review', 'research', 'deployment', 'testing', 'documentation', 'architecture', 'process']) {
            catSelect.appendChild(R.el('option', { text: c, attrs: { value: c } }));
        }
        row.appendChild(R.div('dash-form-field', [
            R.el('label', { cls: 'dash-form-label', text: 'Category' }),
            catSelect
        ]));

        const tagsInput = R.el('input', {
            cls: 'dash-input',
            attrs: { type: 'text', placeholder: 'Tags (comma separated)' }
        });
        row.appendChild(R.div('dash-form-field', [
            R.el('label', { cls: 'dash-form-label', text: 'Tags' }),
            tagsInput
        ]));
        form.appendChild(row);

        form.appendChild(R.div('dash-form-buttons', [
            R.el('button', {
                cls: 'dash-btn dash-btn-primary',
                text: 'Save Entry',
                on: {
                    click: () => {
                        if (!titleInput.value.trim()) {
                            titleInput.style.borderColor = 'var(--hr-danger)';
                            return;
                        }
                        this._knowledge.create({
                            project: projectId || null,
                            category: catSelect.value,
                            title: titleInput.value.trim(),
                            content: contentInput.value.trim(),
                            recommendations: recsInput.value.trim(),
                            tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean),
                            type: 'manual'
                        });
                        R.clear(contentContainer);
                        this._renderEntries(contentContainer, projectId);
                    }
                }
            }),
            R.el('button', {
                cls: 'dash-btn dash-btn-ghost',
                text: 'Cancel',
                on: {
                    click: () => {
                        R.clear(contentContainer);
                        this._renderEntries(contentContainer, projectId);
                    }
                }
            })
        ]));

        return form;
    }

    _renderEntries(container, projectId) {
        const entries = projectId
            ? this._knowledge.getByProject(projectId)
            : this._knowledge.getAll().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        this._renderFilteredEntries(container, entries, null);
    }

    _renderFilteredEntries(container, entries, title) {
        if (title) {
            container.appendChild(R.div('dash-section-title', [R.text(title)]));
        }

        if (!entries.length) {
            container.appendChild(R.div('dash-empty', [
                R.div('dash-empty-icon', [R.text('\uD83D\uDCDA')]),
                R.div('dash-empty-text', [R.text('No knowledge entries yet. Complete tasks with reports or add entries manually.')])
            ]));
            return;
        }

        for (const entry of entries) {
            container.appendChild(this._renderEntry(entry));
        }
    }

    _renderEntry(entry) {
        const card = R.div('dash-kb-entry');

        // Header
        const header = R.div('dash-kb-entry-header', [
            R.span('dash-kb-entry-type', entry.type === 'task-completion' ? '\uD83D\uDCCB Task' : '\u270D\uFE0F Manual'),
            entry.category ? R.span('dash-agent-card-tag', entry.category) : null,
            entry.project ? R.span('dash-agent-card-tag', entry.project) : null,
            R.span('dash-kb-entry-date',
                entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : '')
        ]);
        card.appendChild(header);

        // Title
        card.appendChild(R.el('h4', { cls: 'dash-kb-entry-title', text: entry.title }));

        // Content
        if (entry.content) {
            card.appendChild(R.el('p', { cls: 'dash-kb-entry-content', text: entry.content }));
        }

        // Recommendations
        if (entry.recommendations) {
            card.appendChild(R.div('dash-kb-entry-recs', [
                R.span('dash-kb-entry-recs-label', 'Recommendations: '),
                R.text(entry.recommendations)
            ]));
        }

        // Tags
        if (entry.tags && entry.tags.length) {
            const tags = R.div('dash-kb-entry-tags');
            for (const tag of entry.tags) {
                tags.appendChild(R.span('dash-agent-card-tag', tag));
            }
            card.appendChild(tags);
        }

        // Source
        if (entry.sourceTaskTitle) {
            card.appendChild(R.el('p', {
                cls: 'dash-kb-entry-source',
                text: `Source: ${entry.sourceTaskTitle} (${entry.sourceTaskId || ''}) by ${entry.contributedBy || 'unknown'}`
            }));
        }

        return card;
    }
}
