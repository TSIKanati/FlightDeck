/**
 * GradeStore.js - Agent grading and performance review persistence
 * Tracks quality, timeliness, thoroughness, and communication scores
 */

const STORAGE_KEY = 'tsi-dashboard-grades';

const GRADING_SCALE = {
    'A+': { min: 4.75, label: 'Exceptional' },
    'A':  { min: 4.5,  label: 'Excellent' },
    'A-': { min: 4.25, label: 'Very Good' },
    'B+': { min: 4.0,  label: 'Good' },
    'B':  { min: 3.5,  label: 'Satisfactory' },
    'B-': { min: 3.0,  label: 'Fair' },
    'C':  { min: 2.5,  label: 'Needs Improvement' },
    'D':  { min: 1.5,  label: 'Poor' },
    'F':  { min: 0,    label: 'Failing' }
};

export class GradeStore {
    constructor() {
        this._reviews = [];
        this._listeners = [];
        this._nextId = 1;
    }

    async init() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                this._reviews = JSON.parse(stored);
            } catch (e) {
                this._reviews = [];
            }
        }

        if (!this._reviews.length) {
            try {
                const res = await fetch('/js/data/grades.json');
                if (res.ok) {
                    const data = await res.json();
                    this._reviews = data.reviews || [];
                }
            } catch (e) { /* no seed file yet */ }
        }

        this._nextId = this._reviews.reduce((max, r) => {
            const num = parseInt((r.id || '').replace('review-', ''));
            return num > max ? num + 1 : max;
        }, 1);

        console.log(`[GradeStore] Loaded ${this._reviews.length} reviews`);
    }

    // ---- CRUD ----

    getAll() { return this._reviews; }

    getByAgent(agentId) {
        return this._reviews.filter(r => r.agentId === agentId);
    }

    getByFloor(floorIndex) {
        return this._reviews.filter(r => r.floor === Number(floorIndex));
    }

    getByTask(taskId) {
        return this._reviews.find(r => r.taskId === taskId);
    }

    create(reviewData) {
        const scores = reviewData.scores || {};
        const avg = this._calcAverage(scores);

        const review = {
            id: `review-${String(this._nextId++).padStart(3, '0')}`,
            agentId: reviewData.agentId,
            taskId: reviewData.taskId || null,
            floor: reviewData.floor !== undefined ? Number(reviewData.floor) : null,
            reviewer: reviewData.reviewer || 'owner',
            date: new Date().toISOString().slice(0, 10),
            scores: {
                quality: scores.quality || 3,
                timeliness: scores.timeliness || 3,
                thoroughness: scores.thoroughness || 3,
                communication: scores.communication || 3
            },
            overallGrade: this.calcGrade(avg),
            averageScore: avg,
            feedback: reviewData.feedback || '',
            actionItems: reviewData.actionItems || []
        };

        this._reviews.push(review);
        this._save();
        this._notify('create', review);
        return review;
    }

    // ---- Calculations ----

    _calcAverage(scores) {
        const vals = Object.values(scores).filter(v => typeof v === 'number');
        if (!vals.length) return 0;
        return vals.reduce((s, v) => s + v, 0) / vals.length;
    }

    calcGrade(avg) {
        for (const [grade, def] of Object.entries(GRADING_SCALE)) {
            if (avg >= def.min) return grade;
        }
        return 'F';
    }

    getGradeLabel(grade) {
        return GRADING_SCALE[grade]?.label || 'Unknown';
    }

    getGradingScale() {
        return GRADING_SCALE;
    }

    /** Get overall grade for an agent across all reviews */
    agentOverallGrade(agentId) {
        const reviews = this.getByAgent(agentId);
        if (!reviews.length) return null;
        const avg = reviews.reduce((s, r) => s + (r.averageScore || 0), 0) / reviews.length;
        return {
            grade: this.calcGrade(avg),
            averageScore: Math.round(avg * 100) / 100,
            totalReviews: reviews.length
        };
    }

    /** Get average grade for a floor */
    floorAverageGrade(floorIndex) {
        const reviews = this.getByFloor(floorIndex);
        if (!reviews.length) return null;
        const avg = reviews.reduce((s, r) => s + (r.averageScore || 0), 0) / reviews.length;
        return {
            grade: this.calcGrade(avg),
            averageScore: Math.round(avg * 100) / 100,
            totalReviews: reviews.length
        };
    }

    // ---- Persistence ----

    _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._reviews));
    }

    exportJSON() {
        const data = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            reviews: this._reviews,
            gradingScale: GRADING_SCALE
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tsi-grades-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    onChange(listener) { this._listeners.push(listener); }
    _notify(action, review) { for (const fn of this._listeners) fn(action, review); }
}
