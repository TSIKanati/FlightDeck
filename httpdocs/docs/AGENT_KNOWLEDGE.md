# AGENT KNOWLEDGE BASE
> Persistent memory for AI agents across TSI projects

---

## UNIVERSAL FILE LOCATION CONVENTION

```
╔══════════════════════════════════════════════════════════════════════════════╗
║  ALL AI AGENTS: This file is ALWAYS located at:                              ║
║                                                                              ║
║  LOCAL (Windows Dev):   {project_root}/httpdocs/docs/AGENT_KNOWLEDGE.md      ║
║  SERVER (VPS/IIS):      {vhost_root}/httpdocs/docs/AGENT_KNOWLEDGE.md        ║
║                                                                              ║
║  Check this path FIRST on every new session. No reminders needed.            ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Path Examples

**Local Development (ASUS ProDuo)**:
| Project | AGENT_KNOWLEDGE.md Path |
|---------|-------------------------|
| MachinistZen IMS | `D:\2026TSIServer\MachinistZen\ims.machinistzen.com\httpdocs\docs\AGENT_KNOWLEDGE.md` |
| MachinistZen Parent | `D:\2026TSIServer\MachinistZen\httpdocs\docs\AGENT_KNOWLEDGE.md` |
| TSIAPP | `D:\2026TSIServer\TSIAPP\httpdocs\docs\AGENT_KNOWLEDGE.md` |
| ParlorGames | `D:\2026TSIServer\ParlorGames\httpdocs\docs\AGENT_KNOWLEDGE.md` |
| TSI Orchestrator | `C:\Users\Trans\TSI_ORCHESTRATOR\docs\AGENT_KNOWLEDGE.md` |

**Production Server (VPS/IIS)**:
| Project | AGENT_KNOWLEDGE.md Path |
|---------|-------------------------|
| MachinistZen IMS | `C:\inetpub\vhosts\machinistzen.com\IMS.Machinistzen.com\httpdocs\docs\AGENT_KNOWLEDGE.md` |
| MachinistZen Parent | `C:\inetpub\vhosts\machinistzen.com\httpdocs\docs\AGENT_KNOWLEDGE.md` |
| TranslatorSeries | `C:\inetpub\vhosts\translatorseries.com\httpdocs\docs\AGENT_KNOWLEDGE.md` |

### Agent Onboarding Rule
**EVERY new AI agent session (Claude, Copilot, Qwen, Gemini, etc.) MUST**:
1. Check for `httpdocs/docs/AGENT_KNOWLEDGE.md` in current project
2. Read it to understand system context, patterns, and conventions
3. Update it when discovering new patterns or making corrections

---

## SYSTEM PROFILE

### Hardware Environment
| Component | Specification |
|-----------|---------------|
| **Machine** | ASUS ProArt StudioBook Pro Duo UX581 |
| **CPU** | Intel Core i9 (10th Gen) |
| **RAM** | 32GB DDR4 |
| **GPU (Internal)** | NVIDIA RTX Quadro (Laptop) |
| **eGPU** | AMD Radeon RX 7900 XT (20GB VRAM) |
| **Storage** | NVMe SSD + D:/E:/F: external drives |
| **OS** | Windows 10/11 |

### Local LLM Infrastructure
| Model | Purpose | VRAM Usage |
|-------|---------|------------|
| `deepseek-coder-v2:16b-lite-instruct-q4_K_M` | Primary code generation | ~8GB |
| `qwen2.5-coder:14b` | Alternative coder | ~8GB |
| `qwen2.5-coder:32b` | Heavy tasks | ~16GB |
| **Runtime**: Ollama | **Concurrent Instances**: 2-4 |

### Agent Model
**This file produced by**: Claude Opus 4.5 (`claude-opus-4-5-20251101`)
**Date Created**: 2026-02-05
**Location**: D:\2026TSIServer\MachinistZen\ims.machinistzen.com

---

## PROJECT INVENTORY

### Local Repositories (D:\2026TSIServer\)
| Project | Description | Status |
|---------|-------------|--------|
| **MachinistZen** | Production monitoring for machine shops | Active |
| **ims.machinistzen.com** | IMS client portal (React + Node.js) | Active |
| **TSIAPP** | Translator Series hunting education | Active |
| **FlightDeck** | TSI Master Command Center | Active |
| **AutoZen** | Automotive service platform | Development |
| **ParlorGames** | AI-scored dice/darts/games | Development |
| **QuantumLedger** | AI bookkeeping | Development |
| **CharityPats** | Logo-centric charity company | Development |
| **IdealLearning** | Free accredited education | Development |
| **CLIEAIR** | Civil Liberties AI Review | Development |
| **GuestOfHonor** | Gaming industry concierge | Development |
| **OnTheWayHome** | Community assistance app | Development |
| **RealWorldPrizes** | Incentivized gaming | Development |
| **TranslatorsTitan** | Hunting translator platform | Development |

### GitHub Organization: TSIKanati
- 16 repositories synced
- Self-hosted GitHub Actions runners
- Automated CI/CD pipelines

---

## PROVEN PATTERNS & TECHNIQUES

### 1. Multi-Agent Task Queue System

**Pattern**: Master Queue → Delegation Agent → Per-Agent Queues

```
┌─────────────────────────────────────────────────────┐
│  MASTER_TASK_QUEUE.md (20,000+ tasks)               │
└─────────────────────┬───────────────────────────────┘
                      │ task_delegation_agent.py
                      ▼
┌─────────────┬─────────────┬─────────────┬───────────┐
│ qwen_tasks  │ claude_tasks│ gemini_tasks│ copilot_  │
│ (100 tasks) │ (100 tasks) │ (100 tasks) │ tasks     │
└─────────────┴─────────────┴─────────────┴───────────┘
```

**Key Settings**:
- Batch size: 100 tasks per agent
- Replenish threshold: < 50 tasks
- Status flow: `AVAILABLE → IN_PROGRESS → COMPLETE`

**Why It Works**:
- Agents load fast (100 vs 20,000 tasks = 200x improvement)
- Prevents context window overflow
- Enables parallel agent execution
- Central status tracking via JSON database

### 2. Context Window Management

**Problem**: LLMs hang/degrade after processing many tasks
**Solution**: Automatic model reload

```python
RELOAD_INTERVAL = 2  # Reload every N tasks
CONTEXT_THRESHOLD = 0.85  # Reload at 85% capacity
MAX_CONTEXT_CHARS = 120000  # ~30k tokens
```

**Implementation**:
1. Track cumulative context size
2. Trigger reload when threshold reached
3. `ollama stop MODEL` → pause → `ollama run MODEL`
4. Reset context counter

### 3. Atomic Task Completion

**Problem**: Orphaned IN_PROGRESS tasks when agent crashes
**Solution**: Don't write status until work is complete

```python
# BAD: Write claim before work
claim_task(content)
write_queue(content)  # DANGEROUS - crash leaves orphan
do_work()

# GOOD: Atomic completion
do_work()
claim_task(content)
complete_task(content)
write_queue(content)  # Only write on success
```

### 4. Boris Cherny CLAUDE.md Methodology

**Pattern**: Living documentation that grows with every correction

```
project_root/
├── CLAUDE.md              # Project-specific instructions
├── .claude/
│   ├── agents/            # Specialized subagents
│   │   ├── code-reviewer.md
│   │   ├── build-validator.md
│   │   └── deployment-verifier.md
│   └── commands/          # Slash commands
│       ├── /commit-push-pr
│       ├── /test-and-fix
│       └── /quick-commit
└── knowledge_base/        # Shared learnings
    ├── patterns.json
    ├── common_bugs.json
    └── best_practices.json
```

**Update Protocol**:
1. Every mistake becomes a rule
2. File issue with `@.claude add-to-CLAUDE.md:` prefix
3. Subagent reviews and proposes addition
4. Commit with `docs: update CLAUDE.md - [reason]`

### 5. GPU Agent Orchestration

**Hardware**: AMD RX 7900 XT (20GB VRAM)

**Pattern**: Dual-agent parallel execution
```powershell
# orchestrate_gpu_agents.ps1
Start-Process "ollama run qwen2.5-coder:14b"  # Code agent (~5GB)
Start-Process "comfyui"  # Media generation (~10GB)
```

**Environment Variables**:
```bash
HIP_VISIBLE_DEVICES=0
HSA_OVERRIDE_GFX_VERSION=11.0.0  # For RDNA3
```

### 6. Smart File Routing

**Pattern**: Auto-route generated files to correct directories

```python
def route_file(filepath):
    ext = os.path.splitext(filepath)[1]
    if ext in ['.js', '.mjs'] and 'test' in filepath:
        return TEST_DIR
    elif ext == '.py':
        return SRC_DIR
    elif ext in ['.md']:
        return DOCS_DIR
    # ... etc
```

### 7. Agent Network Architecture

```
┌─ Frank (Claude Code Local) ──────┐
│  Frontend, Complex Reasoning      │
└──────────────────────────────────┘
              ↕ WebSocket
┌─ Sally (VPS Node.js) ────────────┐
│  Remote Deployment, Sync          │
└──────────────────────────────────┘
              ↕ SSH/FTP
┌─ BeeFrank (Telegram Bot) ────────┐
│  Human C2 Interface               │
│  @BeeFranknBot (ID: 8342114547)   │
└──────────────────────────────────┘
              ↕ API
┌─ Qwen (Local Ollama) ────────────┐
│  Autonomous Code Generation       │
│  4-6+ tasks/day                   │
└──────────────────────────────────┘
```

### 8. Deployment Pipeline

**Windows IIS + PM2**:
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ims-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    kill_timeout: 5000,
    listen_timeout: 10000
  }]
};
```

**Paths**:
- Production: `C:\inetpub\vhosts\machinistzen.com\`
- Development: `D:\2026TSIServer\MachinistZen\`

---

## TSI ORCHESTRATOR SYSTEM

**Location**: `C:\Users\Trans\TSI_ORCHESTRATOR\`

### Coordinator Types
| Coordinator | Purpose | File |
|-------------|---------|------|
| **BOG** | Breath of God - Backend heavy lifting | `bog_coordinator_brain.py` |
| **HOG** | Hand of God - Handoff verification | `hog_coordinator_brain.py` |
| **EQ** | Earthquake - Major restructuring | `eq_coordinator_brain.py` |
| **LTN** | Lightning - Quick fixes | `ltn_coordinator_brain.py` |

### Launcher Scripts
- `BREATH_OF_GOD.bat` - Start BOG coordinator
- `DIVINE_CREATION.bat` - Full orchestration
- `DASHBOARD.py` - Real-time monitoring
- `TILE_WINDOWS.ps1` - Window arrangement

---

## GLOBAL CLAUDE AGENTS

**Location**: `C:\Users\Trans\.claude\agents\`

| Agent | Purpose |
|-------|---------|
| `bog.md` | Breath of God - Sustained autonomous work |
| `hog.md` | Hand of God - Verification and handoff |
| `earthquake.md` | Major refactoring operations |
| `heaven-earth.md` | Full-stack comprehensive work |
| `lightning.md` | Rapid execution for quick tasks |
| `code-reviewer.md` | Code quality analysis |

---

## TESTING INFRASTRUCTURE

### Stack
- **Unit**: Vitest
- **E2E**: Playwright
- **Component**: Jest + React Testing Library
- **Accessibility**: jest-axe

### Commands
```bash
npm test              # Unit tests
npm run test:e2e      # E2E tests
npm run test:coverage # Coverage report
npm run test:full     # Full suite
npm run check:a11y    # Accessibility
```

### Coverage Target: 95%+

---

## KNOWLEDGE BASE STRUCTURE

```
knowledge_base/
├── patterns.json        # Proven code patterns
├── common_bugs.json     # Bugs and fixes
├── best_practices.json  # Per-technology
├── architecture.json    # Design decisions
├── lessons_learned.json # From reviews
├── qwen_improvements.json
└── copilot_insights.json
```

### Learning Loop
1. Copilot reviews completed tasks (every 3 min)
2. Extracts patterns and identifies issues
3. Updates knowledge base entries
4. All agents benefit from shared learnings

---

## COMMON MISTAKES & RULES

### Git Operations
- NEVER `git push --force` to main
- NEVER skip pre-commit hooks without explicit request
- ALWAYS create NEW commits (don't amend after hook failure)
- ALWAYS stage specific files, not `git add -A`

### Agent Behavior
- NEVER write IN_PROGRESS status before work is done
- ALWAYS reload model every 2-3 tasks
- ALWAYS validate file saves before committing
- ALWAYS re-read queue after long operations (indices change)

### Code Quality
- NEVER add features beyond what was requested
- NEVER add comments/docstrings to unchanged code
- NEVER create abstractions for one-time operations
- ALWAYS prefer editing existing files over creating new ones

---

## SYNC & COMMUNICATION

### FTP Sync
- **Account**: TSIKanati3
- **Target**: VPS production servers
- **Script**: `ftp_mirror_sync.py`

### Telegram C2
- **Bot**: @BeeFranknBot
- **User ID**: 8333835942
- **Bot ID**: 8342114547

### Real-time
- WebSocket between local and VPS agents
- Health checks every 30 seconds

---

## CAPACITY & METRICS

### Agent Throughput
| Agent | Tasks/Day | Mode |
|-------|-----------|------|
| Qwen | 4-6+ | Autonomous |
| Claude | 1-2 | On-demand |
| Gemini | 3-5 | API-based |
| Copilot | 2-4 | Real-time |
| **Total** | 20-35 | Combined |

### Quality Metrics
- 400+ tests passing (99.25% success)
- 16 security microservices
- 13 API endpoints active
- Full git synchronization

---

## REPLICATION CHECKLIST

To replicate this ecosystem in a new project:

```
[ ] Create CLAUDE.md with project-specific instructions
[ ] Create .claude/agents/ with subagent definitions
[ ] Create .claude/commands/ with slash commands
[ ] Create agent_queues/ directory
[ ] Create knowledge_base/ with empty JSON files
[ ] Copy qwen_agent.py template (adjust paths)
[ ] Setup ecosystem.config.js for PM2
[ ] Configure .github/workflows/ for CI/CD
[ ] Create DEPLOYMENT_PATHS.md
[ ] Mirror this AGENT_KNOWLEDGE.md file
```

---

## UPDATE LOG

| Date | Change | Author |
|------|--------|--------|
| 2026-02-05 | Initial creation | Claude Opus 4.5 |
| 2026-02-05 | Fixed orphaned IN_PROGRESS bug in qwen_agent.py | Claude Opus 4.5 |

---

## CROSS-PROJECT SYNC PROTOCOL

This file should be mirrored to all project roots:
1. Copy `AGENT_KNOWLEDGE.md` to project root
2. Update "Location" in System Profile section
3. Keep core patterns/techniques identical
4. Add project-specific sections at bottom
5. Sync updates via git or manual copy

**DO NOT** add project-specific task queues or configurations to this file.
Those belong in project-specific files (CLAUDE.md, DEPLOYMENT_PATHS.md, etc.).

---

*This document is a living knowledge base. Every correction becomes a rule.*
