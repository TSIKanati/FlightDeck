/**
 * FloorManager - Per-floor task delegation manager
 *
 * Each project floor has a FloorManager that:
 * 1. Receives tasks from BeeFrank C2 (Floor 20 → here)
 * 2. Analyzes task requirements
 * 3. Delegates to appropriate division agents
 * 4. Can request swarm reinforcements from other floors
 * 5. Reports completion back up the chain
 */
import { eventBus } from '../core/EventBus.js';
import { taskLogger } from '../core/TaskLogger.js';

export class FloorManager {
    /**
     * @param {number} floor - Floor number this manager controls
     * @param {object} projectDef - Project definition from projects.json
     * @param {import('./AgentManager.js').AgentManager} agentManager
     * @param {object} [options]
     * @param {string} [options.tower] - 'left' or 'right' (default: 'left')
     */
    constructor(floor, projectDef, agentManager, options = {}) {
        this.floor = floor;
        this.project = projectDef;
        this.agentManager = agentManager;
        this.tower = options.tower || 'left';
        this.id = this.tower === 'right'
            ? `fm-right-${projectDef?.id || floor}`
            : `fm-${projectDef?.id || floor}`;
        this.name = this.tower === 'right'
            ? `RIGHT ${projectDef?.name || 'Floor ' + floor} Manager`
            : `${projectDef?.name || 'Floor ' + floor} Manager`;
        this.taskQueue = [];
        this.activeTasks = new Map();
        this.swarmRequests = [];

        // Division capability mapping - what each division handles
        this.divisionCapabilities = {
            marketing:  ['brand', 'social', 'content', 'outreach', 'campaign', 'launch', 'pr'],
            rnd:        ['research', 'prototype', 'experiment', 'design', 'architecture', 'innovation', 'explore'],
            testing:    ['test', 'qa', 'verify', 'validate', 'audit', 'review', 'check', 'debug'],
            production: ['build', 'deploy', 'ship', 'implement', 'code', 'develop', 'feature', 'fix'],
            security:   ['security', 'vulnerability', 'threat', 'encrypt', 'auth', 'pentest', 'firewall'],
            legal:      ['legal', 'compliance', 'license', 'patent', 'copyright', 'terms', 'contract'],
            accounting: ['budget', 'invoice', 'expense', 'revenue', 'financial', 'receipt', 'cost']
        };

        this._listen();
    }

    _listen() {
        // Tower-scoped event channels
        const prefix = this.tower === 'right' ? `floor:right:${this.floor}` : `floor:${this.floor}`;
        eventBus.on(`${prefix}:task`, (data) => this.receiveTask(data));
        eventBus.on(`${prefix}:swarm-response`, (data) => this._handleSwarmResponse(data));
    }

    // ─── Receive Task ───────────────────────────────────
    receiveTask(data) {
        const { taskId, title, description, priority, fromAgent } = data;

        // Log delegation
        eventBus.emit('task:delegated', {
            taskId,
            fromAgent: fromAgent || 'beefrank',
            toAgent: this.id,
            floor: this.floor,
            division: 'management'
        });

        // Analyze task to determine best division(s)
        const divisions = this._analyzeTask(title, description);
        const complexity = this._assessComplexity(title, description, priority);

        console.log(`[${this.name}] Received task ${taskId}: "${title}" → Divisions: [${divisions.join(', ')}], Complexity: ${complexity}`);

        if (complexity === 'swarm') {
            // Complex task - need swarm intelligence
            this._initiateSwarm(taskId, title, description, divisions, priority);
        } else if (divisions.length > 1) {
            // Multi-division task - parallel delegation
            this._delegateMulti(taskId, title, description, divisions, priority);
        } else {
            // Simple single-division task
            this._delegateSingle(taskId, title, description, divisions[0] || 'production', priority);
        }
    }

    // ─── Task Analysis ──────────────────────────────────
    _analyzeTask(title, description) {
        const text = `${title} ${description}`.toLowerCase();
        const matches = [];

        for (const [division, keywords] of Object.entries(this.divisionCapabilities)) {
            const score = keywords.reduce((s, kw) => s + (text.includes(kw) ? 1 : 0), 0);
            if (score > 0) matches.push({ division, score });
        }

        // Sort by relevance score
        matches.sort((a, b) => b.score - a.score);

        // Return top divisions, or default to production
        return matches.length > 0
            ? matches.slice(0, 3).map(m => m.division)
            : ['production'];
    }

    _assessComplexity(title, description, priority) {
        const text = `${title} ${description}`.toLowerCase();
        const complexKeywords = ['overhaul', 'migrate', 'rewrite', 'redesign', 'full-stack', 'enterprise', 'critical', 'urgent'];
        const swarmKeywords = ['all hands', 'swarm', 'team effort', 'cross-division', 'company-wide', 'everyone'];

        if (swarmKeywords.some(kw => text.includes(kw)) || priority === 'critical') {
            return 'swarm';
        }
        if (complexKeywords.some(kw => text.includes(kw)) || priority === 'high') {
            return 'complex';
        }
        return 'standard';
    }

    // ─── Single Delegation ──────────────────────────────
    _delegateSingle(taskId, title, description, division, priority) {
        const floorAgents = this.tower === 'right'
            ? this.agentManager.getAgentsByFloorAndTower(this.floor, 'right')
            : this.agentManager.getAgentsByFloor(this.floor);
        const agents = floorAgents.filter(a => a.def.division === division);

        if (agents.length === 0) {
            // No agents in this division, use any available on the floor
            const available = floorAgents;
            if (available.length > 0) {
                const agent = available[Math.floor(Math.random() * available.length)];
                this._assignToAgent(taskId, agent, division);
            } else {
                console.warn(`[${this.name}] No agents available on floor ${this.floor}`);
                eventBus.emit('task:failed', { taskId, reason: `No agents on floor ${this.floor}` });
            }
            return;
        }

        // Pick the least busy agent (prefer 'idle' state)
        const idle = agents.filter(a => a.state === 'idle');
        const target = idle.length > 0 ? idle[0] : agents[0];
        this._assignToAgent(taskId, target, division);
    }

    // ─── Multi-Division Delegation ──────────────────────
    _delegateMulti(taskId, title, description, divisions, priority) {
        const subtasks = divisions.map((div, i) => ({
            parentTaskId: taskId,
            subtaskIndex: i,
            division: div
        }));

        for (const sub of subtasks) {
            const floorAgents = this.tower === 'right'
                ? this.agentManager.getAgentsByFloorAndTower(this.floor, 'right')
                : this.agentManager.getAgentsByFloor(this.floor);
            const agents = floorAgents.filter(a => a.def.division === sub.division);

            if (agents.length > 0) {
                const agent = agents[0];
                this._assignToAgent(taskId, agent, sub.division);
            }
        }

        // Start progress simulation
        this._simulateProgress(taskId, divisions.length * 5000 + Math.random() * 10000);
    }

    // ─── Swarm Intelligence ─────────────────────────────
    _initiateSwarm(taskId, title, description, divisions, priority) {
        console.log(`[${this.name}] SWARM ACTIVATED for task ${taskId}`);

        // Get all agents on this floor (tower-aware)
        const localAgents = this.tower === 'right'
            ? this.agentManager.getAgentsByFloorAndTower(this.floor, 'right')
            : this.agentManager.getAgentsByFloor(this.floor);

        // Assign all local agents
        const localIds = [];
        for (const agent of localAgents) {
            agent.setState('working');
            localIds.push(agent.def.id);
        }

        // Request reinforcements from other floors
        const reinforcementFloors = this._findReinforcementFloors(divisions);
        for (const rFloor of reinforcementFloors) {
            eventBus.emit(`floor:${rFloor}:swarm-request`, {
                taskId,
                requestingFloor: this.floor,
                requestingManager: this.id,
                neededDivisions: divisions,
                priority
            });
        }

        // Emit swarm event
        eventBus.emit('task:swarmed', {
            taskId,
            coordinator: this.id,
            agents: localIds,
            floor: this.floor,
            divisions
        });

        // Swarm tasks take longer but complete more thoroughly
        this._simulateProgress(taskId, 15000 + Math.random() * 20000);
    }

    _findReinforcementFloors(divisions) {
        // Find floors that specialize in needed divisions
        // Enterprise floors: Security(19), Legal(18), R&D(17), Finance(16)
        const specialtyFloors = {
            security: 19,
            legal: 18,
            rnd: 17,
            accounting: 16
        };

        const floors = [];
        for (const div of divisions) {
            if (specialtyFloors[div]) {
                floors.push(specialtyFloors[div]);
            }
        }
        return [...new Set(floors)];
    }

    _handleSwarmResponse(data) {
        const { taskId, agents, fromFloor } = data;
        if (!agents || agents.length === 0) return;

        console.log(`[${this.name}] Swarm reinforcements: ${agents.length} agents from floor ${fromFloor}`);

        eventBus.emit('task:swarmed', {
            taskId,
            coordinator: this.id,
            agents: agents.map(a => a.id || a),
            floor: fromFloor,
            division: 'reinforcement'
        });
    }

    // ─── Agent Assignment ───────────────────────────────
    _assignToAgent(taskId, agentSprite, division) {
        // Move agent to 'working' state
        agentSprite.setState('working');

        // Log the delegation
        eventBus.emit('task:delegated', {
            taskId,
            fromAgent: this.id,
            toAgent: agentSprite.def.id || agentSprite.def.name,
            floor: this.floor,
            division
        });

        // Track active task
        this.activeTasks.set(taskId, {
            agent: agentSprite,
            division,
            startTime: Date.now()
        });
    }

    // ─── Progress Simulation ────────────────────────────
    _simulateProgress(taskId, totalTime) {
        const steps = 10;
        const stepTime = totalTime / steps;
        let step = 0;

        const interval = setInterval(() => {
            step++;
            const progress = Math.min(100, Math.round((step / steps) * 100));

            eventBus.emit('task:progress', {
                taskId,
                progress,
                agent: this.id,
                message: `${this.name}: ${progress}% complete`
            });

            if (step >= steps) {
                clearInterval(interval);
                this._completeTask(taskId);
            }
        }, stepTime);
    }

    _completeTask(taskId) {
        const active = this.activeTasks.get(taskId);

        // Release assigned agents back to normal behavior
        if (active?.agent) {
            active.agent.setState('idle');
        }

        this.activeTasks.delete(taskId);

        eventBus.emit('task:completed', {
            taskId,
            agent: this.id,
            result: `Completed by ${this.name}`
        });

        console.log(`[${this.name}] Task ${taskId} COMPLETED`);
    }

    // ─── Query ──────────────────────────────────────────
    getActiveTaskCount() {
        return this.activeTasks.size;
    }

    getInfo() {
        return {
            id: this.id,
            name: this.name,
            floor: this.floor,
            tower: this.tower,
            project: this.project?.id,
            activeTasks: this.activeTasks.size,
            queueLength: this.taskQueue.length
        };
    }
}
