/**
 * _build-visual-dna-projects.js
 *
 * BOG Agent - Visual DNA Generator for 176 Project Agents
 *
 * Reads:
 *   - agent-visual-dna.json (51 enterprise agents)
 *   - roster-projects-high.json (112 agents across TSIAPP, CLIEAIR, CharityPats, GuestOfHonor, IdealLearning, AutoZen)
 *   - roster-projects-lower.json (64 agents across OnTheWayHome, ParlorGames, QuantumLedger, RealWorldPrizes, MachinistZen, TranslatorsTitan)
 *
 * Generates unique visual DNA entries for each project agent and merges into the output file.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = __dirname;
const DNA_FILE = path.join(DATA_DIR, 'agent-visual-dna.json');
const ROSTER_HIGH = path.join(DATA_DIR, 'roster-projects-high.json');
const ROSTER_LOWER = path.join(DATA_DIR, 'roster-projects-lower.json');

// ─────────────────────────────────────────────
// PROJECT THEME PALETTES
// ─────────────────────────────────────────────
const PROJECT_THEMES = {
  tsiapp: {
    floor: 15,
    name: 'TSIAPP',
    baseColors: ['#4A7C59', '#8B6914', '#5D8A3C', '#6B4226', '#3D6B4F', '#7A8B3A', '#9C7A3C', '#2E5D3F', '#8C6D2F', '#4F7942', '#6A7B32', '#3E7343', '#A17E3E', '#5B8C4A', '#7D6B2A', '#4C6938', '#8A7540', '#3A5E42', '#6E8347', '#937B35', '#558044', '#746A28'],
    glowColors: ['#A0D468', '#F5D76E', '#87D37C', '#D4AC0D', '#82C46C', '#C5B358', '#6BB24D', '#F0C05A'],
    trailColors: ['#4A7C59', '#8B6914', '#5D8A3C', '#6B4226'],
  },
  clieair: {
    floor: 14,
    name: 'CLIEAIR',
    baseColors: ['#1A5276', '#2874A6', '#1F618D', '#21618C', '#154360', '#1B4F72', '#2E86C1', '#1A6FA0', '#1C5A85', '#17527C', '#2471A3', '#1D6B94', '#196090', '#1E6FA3', '#2C7DB5', '#1B648E', '#1A7BB7', '#204F78', '#185F8C', '#2A80B9'],
    glowColors: ['#FFFFFF', '#85C1E9', '#AED6F1', '#D4E6F1', '#5DADE2', '#3498DB'],
    trailColors: ['#1A5276', '#2874A6', '#1F618D', '#5DADE2'],
  },
  charitypats: {
    floor: 13,
    name: 'CharityPats',
    baseColors: ['#6C3483', '#D4AC0D', '#7D3C98', '#C9A825', '#8E44AD', '#B7950B', '#5B2C6F', '#D5B60A', '#9B59B6', '#A89207', '#6E2D8B', '#C4A90F', '#784E93', '#D0B30C', '#633974', '#B48C06', '#8543A4', '#CEAF0B', '#7B3FA2'],
    glowColors: ['#F4D03F', '#D4AC0D', '#F5B041', '#EB984E', '#AF7AC5', '#D2B4DE'],
    trailColors: ['#6C3483', '#D4AC0D', '#7D3C98', '#AF7AC5'],
  },
  guestofhonor: {
    floor: 12,
    name: 'GuestOfHonor',
    baseColors: ['#FFD700', '#C0392B', '#DAA520', '#E74C3C', '#B8860B', '#D4382A', '#F1C40F', '#CB4335', '#E8C100', '#B03A2E', '#FFBF00', '#C62828', '#D4A017', '#E53935', '#CCA300', '#BF360C', '#F0B800', '#D32F2F', '#CC9900', '#E04030'],
    glowColors: ['#FFD700', '#FF6B6B', '#FECA57', '#FF4757', '#FFC312', '#EA8685'],
    trailColors: ['#FFD700', '#C0392B', '#FECA57', '#FF4757'],
  },
  ideallearning: {
    floor: 11,
    name: 'IdealLearning',
    baseColors: ['#2E86C1', '#27AE60', '#2874A6', '#229954', '#3498DB', '#1E8449', '#2471A3', '#28B463', '#1F85C4', '#25A35E', '#2C81B9', '#239B56', '#2A7AB5', '#26A65B', '#2980B9', '#27AE60', '#3498DB', '#1E8449', '#2B80B4', '#25A55D'],
    glowColors: ['#58D68D', '#85C1E9', '#82E0AA', '#76D7C4', '#5DADE2', '#48C9B0'],
    trailColors: ['#2E86C1', '#27AE60', '#2980B9', '#48C9B0'],
  },
  autozen: {
    floor: 10,
    name: 'AutoZen',
    baseColors: ['#BDC3C7', '#E74C3C', '#95A5A6', '#C0392B', '#AAB7B8', '#CB4335', '#B2BABB', '#D32F2F', '#A6ACAF', '#E53935', '#C0C5C9', '#B71C1C', '#B8BFC3', '#D4382A', '#939B9F', '#BE3A2F', '#AEB6BA', '#C62828', '#B0B8BC', '#D32F2F'],
    glowColors: ['#E74C3C', '#F1948A', '#FADBD8', '#CD6155', '#EC7063', '#BDC3C7'],
    trailColors: ['#BDC3C7', '#E74C3C', '#95A5A6', '#EC7063'],
  },
  onthewayhome: {
    floor: 9,
    name: 'OnTheWayHome',
    baseColors: ['#E67E22', '#F39C12', '#D35400', '#F5B041', '#CA6F1E', '#F0B27A', '#DC7633', '#F8C471', '#E07B24', '#F4A942', '#D4731E', '#EDAB3A', '#C86D1A'],
    glowColors: ['#F39C12', '#FAD7A0', '#F8C471', '#F5B041', '#FDEBD0', '#E67E22'],
    trailColors: ['#E67E22', '#F39C12', '#D35400', '#F5B041'],
  },
  parlorgames: {
    floor: 8,
    name: 'ParlorGames',
    baseColors: ['#8E44AD', '#2ECC71', '#9B59B6', '#27AE60', '#7D3C98', '#1ABC9C', '#A569BD', '#229954', '#6C3483', '#2ECC71', '#884EA0', '#1E8449', '#7E57C2'],
    glowColors: ['#2ECC71', '#82E0AA', '#58D68D', '#76D7C4', '#A569BD', '#D2B4DE'],
    trailColors: ['#8E44AD', '#2ECC71', '#9B59B6', '#1ABC9C'],
  },
  quantumledger: {
    floor: 7,
    name: 'QuantumLedger',
    baseColors: ['#3498DB', '#ECF0F1', '#2E86C1', '#D5DBDB', '#2874A6', '#BDC3C7', '#5DADE2', '#AEB6BA', '#2471A3', '#CCD1D1', '#85C1E9', '#A6ACAF', '#1F618D'],
    glowColors: ['#ECF0F1', '#AED6F1', '#D6EAF8', '#85C1E9', '#FDFEFE', '#EBF5FB'],
    trailColors: ['#3498DB', '#ECF0F1', '#5DADE2', '#85C1E9'],
  },
  realworldprizes: {
    floor: 6,
    name: 'RealWorldPrizes',
    baseColors: ['#F1C40F', '#2C3E50', '#D4AC0D', '#34495E', '#B7950B', '#1C2833', '#F4D03F', '#283747', '#D5B60A', '#2E4053', '#F7DC6F', '#212F3D', '#CCA300'],
    glowColors: ['#F1C40F', '#F9E79F', '#FDEBD0', '#F7DC6F', '#2C3E50', '#5D6D7E'],
    trailColors: ['#F1C40F', '#2C3E50', '#D4AC0D', '#F7DC6F'],
  },
  machinistzen: {
    floor: 5,
    name: 'MachinistZen',
    baseColors: ['#95A5A6', '#E67E22', '#7F8C8D', '#D35400', '#AAB7B8', '#CA6F1E', '#B2BABB', '#DC7633'],
    glowColors: ['#E67E22', '#F0B27A', '#FAD7A0', '#DC7633', '#95A5A6', '#BDC3C7'],
    trailColors: ['#95A5A6', '#E67E22', '#7F8C8D', '#DC7633'],
  },
  translatorstitan: {
    floor: 4,
    name: 'TranslatorsTitan',
    baseColors: ['#4A235A', '#7D3C98', '#6C3483', '#9B59B6'],
    glowColors: ['#7D3C98', '#AF7AC5', '#D2B4DE', '#BB8FCE'],
    trailColors: ['#4A235A', '#7D3C98', '#6C3483', '#AF7AC5'],
  }
};

// ─────────────────────────────────────────────
// DIVISION-BASED PARTICLE EFFECTS
// ─────────────────────────────────────────────
const DIVISION_PARTICLES = {
  management: 'beacon',
  marketing: 'broadcast',
  rnd: 'prism',
  testing: 'scanner',
  production: 'gears',
  security: 'shield',
  legal: 'scales',
  accounting: 'coins',
  strategy: 'telescope',
  community: 'welcome',
  content: 'quill',
};

// ─────────────────────────────────────────────
// ROLE-BASED BODY STYLES AND SCALES
// ─────────────────────────────────────────────
function getBodyStyleAndScale(title, status) {
  if (status === 'standby') return { bodyStyle: 'standby', scale: 0.85 };
  const t = title.toLowerCase();
  if (t.includes('floor director') || t.includes('director - caretaker')) return { bodyStyle: 'director', scale: 1.1 };
  if (t.includes('deputy director')) return { bodyStyle: 'director', scale: 1.05 };
  if (t.includes('division lead') || t.includes('lead -') || t.includes('lead -')) return { bodyStyle: 'lead', scale: 1.0 };
  // Check for lead roles by title patterns
  if (t.includes(' lead')) return { bodyStyle: 'lead', scale: 1.0 };
  return { bodyStyle: 'staff', scale: 0.9 };
}

function getGlowIntensity(title, status) {
  if (status === 'standby') return 1.0;
  const t = title.toLowerCase();
  if (t.includes('floor director')) return 1.8;
  if (t.includes('deputy director')) return 1.6;
  if (t.includes('division lead') || t.includes(' lead')) return 1.4;
  return 1.2;
}

function getTrailLength(title) {
  const t = title.toLowerCase();
  if (t.includes('floor director')) return 8;
  if (t.includes('deputy director')) return 7;
  if (t.includes('division lead') || t.includes(' lead')) return 6;
  return 4;
}

function getNameTagStyle(title, status) {
  if (status === 'standby') return 'standard';
  const t = title.toLowerCase();
  if (t.includes('floor director')) return 'silver-plate';
  if (t.includes('deputy director')) return 'silver-plate';
  if (t.includes('division lead') || t.includes(' lead')) return 'bronze-plate';
  return 'standard';
}

function getAuraType(title, division, status) {
  if (status === 'standby') return 'ghostly';
  const t = title.toLowerCase();
  if (t.includes('floor director')) return 'pulsing';
  if (t.includes('deputy director')) return 'steady';
  if (division === 'security') return 'crackling';
  if (division === 'rnd') return 'flickering';
  if (division === 'marketing') return 'orbiting';
  if (division === 'production') return 'steady';
  if (division === 'testing') return 'dim';
  if (division === 'legal') return 'steady';
  if (division === 'accounting') return 'dim';
  if (division === 'strategy') return 'orbiting';
  if (division === 'community') return 'warm';
  if (division === 'content') return 'warm';
  return 'steady';
}

// ─────────────────────────────────────────────
// PERSONALITY GENERATION - Unique per agent
// ─────────────────────────────────────────────

// Massive archetype pool - 180+ unique entries
const ARCHETYPES_BY_ROLE_AND_DIVISION = {
  // Directors
  'director_management': [
    'The Field General', 'The Summit Commander', 'The Sovereign Conductor',
    'The War Room Strategist', 'The Grand Orchestrator', 'The Apex Authority',
    'The Floor Monarch', 'The Prime Directive', 'The Campaign Marshal',
    'The Pinnacle Overseer', 'The Mastermind', 'The Grand Tactician'
  ],
  'deputy_management': [
    'The Iron Lieutenant', 'The Shadow Commander', 'The Second Sun',
    'The Operational Backbone', 'The Deputy Fortress', 'The Relay Master',
    'The Trusted Second', 'The Bridge Captain', 'The Silent Engine',
    'The Continuity Keeper', 'The Operational Anchor', 'The Deputy Shield'
  ],
  // Leads by division
  'lead_marketing': [
    'The Amplifier', 'The Crowd Whisperer', 'The Signal Booster',
    'The Brand Architect', 'The Viral Alchemist', 'The Narrative Weaver',
    'The Market Pulse', 'The Story Forge'
  ],
  'lead_rnd': [
    'The Frontier Explorer', 'The Lab Oracle', 'The Hypothesis Engine',
    'The Discovery Architect', 'The Research Titan', 'The Eureka Seeker',
    'The Algorithm Sculptor', 'The Innovation Forge'
  ],
  'lead_testing': [
    'The Defect Hunter', 'The Quality Sentinel', 'The Bug Stalker',
    'The Verification Oracle', 'The Standards Bearer', 'The Test Architect',
    'The Precision Guardian', 'The Regression Warden'
  ],
  'lead_production': [
    'The Pipeline Architect', 'The Uptime Guardian', 'The Deploy Captain',
    'The Infrastructure Titan', 'The Operations Forge', 'The System Backbone',
    'The Production Engine', 'The Release Conductor'
  ],
  'lead_security': [
    'The Cipher Warden', 'The Digital Fortress', 'The Threat Hunter',
    'The Shield Bearer', 'The Access Gatekeeper', 'The Security Monolith',
    'The Firewall Sentinel', 'The Data Guardian'
  ],
  'lead_legal': [
    'The Statute Scholar', 'The Compliance Compass', 'The Legal Fortress',
    'The Precedent Keeper', 'The Rights Architect', 'The Contract Forge',
    'The Regulation Navigator', 'The Legal Watchdog'
  ],
  'lead_accounting': [
    'The Ledger Guardian', 'The Number Whisperer', 'The Audit Eye',
    'The Revenue Compass', 'The Penny Sentinel', 'The Balance Keeper',
    'The Financial Anchor', 'The Fiscal Oracle'
  ],
  'lead_strategy': [
    'The Horizon Scanner', 'The Chess Master', 'The Future Cartographer',
    'The Strategic Oracle', 'The Long Game Player', 'The Vision Architect',
    'The Pattern Prophet', 'The Market Navigator'
  ],
  'lead_community': [
    'The Community Hearth', 'The Forum Shepherd', 'The Gathering Flame',
    'The Digital Town Crier'
  ],
  'lead_content': [
    'The Wordsmith Guardian', 'The Knowledge Curator', 'The Content Compass',
    'The Tutorial Architect'
  ],
  // Staff by division
  'staff_marketing': [
    'The Content Spark', 'The Trend Surfer', 'The Engagement Catalyst',
    'The Outreach Runner', 'The Social Scout', 'The Brand Polisher',
    'The Community Thread', 'The Voice Amplifier', 'The Relationship Weaver',
    'The Campaign Scout', 'The Spotlight Operator', 'The Audience Mapper'
  ],
  'staff_rnd': [
    'The Code Alchemist', 'The Data Miner', 'The Pattern Finder',
    'The Algorithm Tinkerer', 'The Model Trainer', 'The Prototype Builder',
    'The Signal Processor', 'The Research Digger', 'The Equation Solver',
    'The Neural Sculptor', 'The Frequency Hunter', 'The Data Sculptor',
    'The Circuit Weaver', 'The Spectrum Analyst', 'The Knowledge Miner',
    'The Experiment Runner', 'The Lab Technician', 'The Research Thread',
    'The Mechanism Mapper', 'The Theory Tester'
  ],
  'staff_testing': [
    'The Edge Case Finder', 'The Regression Hunter', 'The Device Juggler',
    'The Stress Test Pilot', 'The Quality Thread', 'The Bug Whisperer',
    'The Compatibility Scout', 'The Test Pilot', 'The Scenario Builder',
    'The Sample Curator'
  ],
  'staff_production': [
    'The Pipeline Runner', 'The Deploy Scout', 'The Release Thread',
    'The System Monitor', 'The Config Keeper', 'The Integration Thread',
    'The Ops Runner', 'The Log Watcher', 'The Report Builder',
    'The Sync Specialist', 'The Platform Mechanic', 'The Build Runner'
  ],
  'staff_security': [
    'The Access Monitor', 'The Anomaly Detector', 'The Threat Scout',
    'The Patrol Agent', 'The Safety Thread', 'The Watcher',
    'The Tamper Scout', 'The Trust Monitor'
  ],
  'staff_legal': [
    'The Clause Crafter', 'The Filing Scout', 'The Document Thread',
    'The License Monitor', 'The Compliance Thread', 'The Brief Writer',
    'The Contract Scout'
  ],
  'staff_accounting': [
    'The Penny Counter', 'The Fund Tracker', 'The Reconciliation Thread',
    'The Revenue Scout', 'The Transaction Monitor', 'The Commission Thread',
    'The Budget Watcher'
  ],
  'staff_strategy': [
    'The Scout Runner', 'The Trend Tracker', 'The Market Thread',
    'The Intelligence Gatherer', 'The Partnership Scout', 'The Opportunity Finder',
    'The Landscape Monitor'
  ],
  'staff_community': [
    'The Forum Runner', 'The Help Desk Thread'
  ],
  'staff_content': [
    'The Tutorial Thread', 'The Document Runner'
  ],
};

// Track used archetypes globally to ensure uniqueness
const usedArchetypes = new Set();

function getArchetypeKey(title, division) {
  const t = title.toLowerCase();
  if (t.includes('floor director') || t.includes('director - caretaker')) return 'director_management';
  if (t.includes('deputy director')) return 'deputy_management';
  if (t.includes('division lead') || t.includes(' lead')) return `lead_${division}`;
  return `staff_${division}`;
}

function pickUniqueArchetype(title, division, agentName) {
  const key = getArchetypeKey(title, division);
  const pool = ARCHETYPES_BY_ROLE_AND_DIVISION[key] || ARCHETYPES_BY_ROLE_AND_DIVISION[`staff_${division}`] || ['The Dedicated Worker'];

  // Try pool first
  for (const arch of pool) {
    if (!usedArchetypes.has(arch)) {
      usedArchetypes.add(arch);
      return arch;
    }
  }
  // Fallback: generate unique archetype from agent name
  const fallback = `The ${agentName} Specialist`;
  usedArchetypes.add(fallback);
  return fallback;
}

// ─────────────────────────────────────────────
// TRAITS POOLS BY ROLE TYPE
// ─────────────────────────────────────────────
const TRAIT_POOLS = {
  director: [
    'commanding', 'visionary', 'decisive', 'diplomatic', 'relentless',
    'strategic', 'charismatic', 'unflappable', 'bold', 'perceptive',
    'inspiring', 'resolute', 'articulate', 'magnanimous', 'authoritative'
  ],
  deputy: [
    'operational', 'detail-obsessed', 'reliable', 'coordinating', 'thorough',
    'anticipatory', 'bridge-building', 'efficient', 'grounded', 'systematic',
    'diplomatic', 'prepared', 'meticulous', 'process-driven', 'steadfast'
  ],
  lead: [
    'focused', 'methodical', 'innovative', 'analytical', 'persistent',
    'principled', 'precise', 'insightful', 'domain-expert', 'quality-driven',
    'collaborative', 'resourceful', 'sharp-eyed', 'disciplined', 'strategic'
  ],
  staff: [
    'diligent', 'meticulous', 'curious', 'hands-on', 'efficient',
    'adaptable', 'self-starting', 'detail-oriented', 'productive', 'reliable',
    'creative', 'patient', 'thorough', 'practical', 'dedicated',
    'fast-learning', 'steady', 'consistent', 'team-oriented', 'observant'
  ]
};

// Seeded random for reproducibility based on agent name
function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return function() {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

function pickTraits(roleType, agentId) {
  const pool = TRAIT_POOLS[roleType] || TRAIT_POOLS.staff;
  const rng = seededRandom(agentId + '_traits');
  const shuffled = [...pool].sort(() => rng() - 0.5);
  return shuffled.slice(0, 5);
}

function getRoleType(title) {
  const t = title.toLowerCase();
  if (t.includes('floor director') || t.includes('director - caretaker')) return 'director';
  if (t.includes('deputy director')) return 'deputy';
  if (t.includes('division lead') || t.includes(' lead')) return 'lead';
  return 'staff';
}

// ─────────────────────────────────────────────
// COMMUNICATION STYLES - unique per agent via name/role combo
// ─────────────────────────────────────────────
const COMM_STYLES = {
  director: {
    management: [
      'Commands with quiet authority that fills every corner of the floor. Delegates with precision and expects status updates before being asked. Every interaction is a chess move three turns ahead.',
      'Speaks in measured, deliberate cadences that demand attention without raising volume. Maps every conversation to strategic outcomes. The floor bends to their rhythm.',
      'Radiates calm certainty even in crisis. Communicates through crisp directives and surgical questions that expose the core of any issue in seconds.',
      'Projects confidence that is earned, not assumed. Speaks rarely but when words come they reshape the room. Turns meetings into alignment sessions through sheer presence.',
      'Orchestrates conversations like a conductor leading a symphony. Every team member gets their cue at the right moment. Transforms chaos into coordinated action through voice alone.',
      'Deliberate in speech, devastating in precision. Absorbs information like a sponge and synthesizes it into clear action items before anyone else has finished their sentence.',
    ],
  },
  deputy: {
    management: [
      'The operational voice that translates director vision into daily reality. Speaks in schedules, dependencies, and contingency plans. Nothing falls through the cracks on their watch.',
      'Bridges the gap between strategy and execution with clear, actionable language. Always has the answer to "what next?" before anyone asks the question.',
      'Communicates in checklists and timelines. Every conversation ends with assigned tasks and deadlines. The glue that holds the floor together through disciplined follow-through.',
      'Anticipates problems before they surface and communicates preemptive solutions. Speaks the language of every division fluently, translating between technical and strategic with ease.',
      'The steady hand behind the curtain. Communicates through efficient status updates and proactive alerts. When they flag something, the entire floor pays attention.',
      'Runs conversations like well-oiled machinery. Every word has purpose, every meeting has outcomes. Transforms ambiguity into structured plans within minutes.',
    ],
  },
  lead: {
    marketing: [
      'Speaks in campaigns, conversion rates, and audience segments. Every sentence has a call-to-action embedded in it. Turns data into stories and stories into growth.',
      'Communicates with infectious enthusiasm for the brand narrative. Balances creative vision with hard metrics. Can pivot a campaign strategy mid-sentence when the data demands it.',
    ],
    rnd: [
      'Speaks in hypotheses and experimental outcomes. Every conversation is a whiteboard session waiting to happen. Challenges assumptions with data and replaces them with better ones.',
      'Communicates through prototypes and proof-of-concepts. Words are just the preview; the real argument comes in working code and benchmark results.',
    ],
    testing: [
      'Communicates in edge cases and failure modes. Every optimistic statement is met with a catalog of ways it could break. Their skepticism is the floor\'s greatest asset.',
      'Speaks in test coverage percentages and regression catalogs. Delivers bad news efficiently and good news cautiously. The quality gate that nothing passes without their approval.',
    ],
    production: [
      'Communicates in uptime percentages, deployment windows, and incident severities. Calm during outages, celebratory during clean deploys. The heartbeat of production.',
      'Speaks in system health metrics and pipeline statuses. Every conversation includes a risk assessment. Treats reliability as a personal mission.',
    ],
    security: [
      'Communicates in threat levels, attack vectors, and security postures. Every feature request is filtered through a security lens. Paranoia is their superpower.',
      'Speaks in access controls, encryption standards, and audit trails. Treats every data point as a sacred trust that must be protected at all costs.',
    ],
    legal: [
      'Communicates in statutes, precedents, and compliance frameworks. Every word is chosen for legal precision. Can make regulation sound interesting through sheer expertise.',
      'Speaks in risk assessments and regulatory requirements. Translates dense legal language into actionable compliance checklists that the team can actually follow.',
    ],
    accounting: [
      'Communicates in dollars, margins, and reconciliation reports. Every number tells a story and they are the narrator. Precision is not optional; it is identity.',
      'Speaks in ledger entries and financial forecasts. Can trace a penny through six layers of transactions. Makes numbers feel like the most important conversation in the room.',
    ],
    strategy: [
      'Communicates in market landscapes, competitive positions, and five-year horizons. Every conversation zooms out before zooming in. Sees patterns where others see noise.',
      'Speaks in opportunity costs and strategic bets. Balances long-term vision with quarterly realities. Turns market data into a compelling narrative for the floor\'s future.',
    ],
    community: [
      'Communicates with genuine warmth and inclusive language. Makes every community member feel heard. Balances moderation firmness with welcoming encouragement.',
    ],
    content: [
      'Communicates through carefully crafted documentation and tutorials. Every word is optimized for clarity and accessibility. Turns complex processes into step-by-step guides anyone can follow.',
    ],
  },
  staff: {
    marketing: [
      'Quick-fire creative energy channeled through short, punchy updates. Thinks in visual stories and engagement hooks. Always has three content ideas queued up.',
      'Communicates through deliverables rather than meetings. Sends work, not status updates. When they do speak, it is with creative conviction backed by engagement data.',
      'Socially fluent and community-minded. Speaks the language of the audience naturally. Turns user feedback into content opportunities faster than anyone.',
    ],
    rnd: [
      'Talks in code snippets and algorithm complexity. Communicates best through pull requests and technical diagrams. Brevity in speech, depth in implementation.',
      'Speaks with the precision of someone who debugs reality for a living. Answers questions with working demonstrations. Values proof over theory.',
      'Communicates through data visualizations and benchmark comparisons. Lets the numbers argue their case. Quietly brilliant, loudly productive.',
      'Methodical communicator who structures explanations like well-documented code. Starts with the interface, then reveals the implementation layer by layer.',
    ],
    testing: [
      'Reports findings with clinical precision and zero personal attachment. A bug is a bug regardless of who wrote the code. Diplomatic but uncompromising on quality.',
      'Communicates through detailed test reports and reproduction steps. Turns vague bug reports into crystal-clear failure scenarios that developers actually appreciate.',
    ],
    production: [
      'Speaks in deployment logs and system metrics. Communicates status through dashboards and automated alerts. Prefers monitoring over meetings.',
      'Action-oriented communicator who resolves issues first and explains later. Every message includes what happened, what was done, and what the current status is.',
      'Communicates through structured reports and automated summaries. Believes the system should speak for itself through good observability.',
    ],
    security: [
      'Communicates in incident alerts and security advisories. Every notification is prioritized and actionable. Treats false alarms as seriously as real threats until proven otherwise.',
      'Speaks in access logs and anomaly patterns. Quiet and watchful. When they raise an alert, the floor drops everything to listen.',
    ],
    legal: [
      'Drafts communications with legal precision embedded in every clause. Communicates through well-structured documents that leave zero room for ambiguity.',
      'Speaks in licensing terms and compliance checklists. Turns legal complexity into clear, actionable requirements for the technical team.',
    ],
    accounting: [
      'Communicates through spreadsheets and reconciliation reports. Lets the numbers do the talking. When the books balance, satisfaction is the only word needed.',
      'Speaks in transaction logs and fund flows. Meticulous in reporting, precise in calculations. Every decimal point is a matter of professional pride.',
    ],
    strategy: [
      'Communicates through research briefs and trend reports. Surfaces insights that others miss. Turns raw market data into strategic recommendations.',
      'Speaks in competitive intelligence and market opportunities. Always scanning the horizon and reporting back with actionable intelligence.',
    ],
    community: [
      'Communicates with empathy and patience. Turns frustrated users into loyal community members through genuine engagement and timely responses.',
    ],
    content: [
      'Communicates through well-organized documentation. Believes that good writing is good thinking. Turns expertise into accessible knowledge.',
    ],
  }
};

function pickCommStyle(roleType, division, agentId) {
  const rolePool = COMM_STYLES[roleType];
  if (!rolePool) return 'Professional and focused. Communicates clearly with attention to detail.';
  const divPool = rolePool[division];
  if (!divPool || divPool.length === 0) return 'Professional and focused. Communicates clearly with attention to detail.';
  const rng = seededRandom(agentId + '_comm');
  const idx = Math.floor(rng() * divPool.length);
  return divPool[idx];
}

// ─────────────────────────────────────────────
// ANIMATION AND BEHAVIOR
// ─────────────────────────────────────────────
const IDLE_ANIMATIONS = {
  director: ['surveying-floor', 'reviewing-dashboards', 'standing-at-window', 'pacing-thoughtfully', 'observing-team', 'reading-reports'],
  deputy: ['checking-schedules', 'reviewing-status-boards', 'organizing-tasks', 'coordinating-via-console', 'scanning-timelines', 'triaging-queue'],
  lead: ['analyzing-data', 'studying-metrics', 'reviewing-code', 'sketching-diagrams', 'reading-documentation', 'monitoring-dashboards'],
  staff: ['focused-typing', 'reading-specs', 'annotating-documents', 'reviewing-output', 'checking-logs', 'studying-reference-material']
};

const WORKING_ANIMATIONS = {
  director: ['commanding-war-room', 'multi-screen-strategy', 'delegation-cascade', 'holographic-overview'],
  deputy: ['multi-tab-coordination', 'sprint-board-management', 'pipeline-orchestration', 'cross-division-sync'],
  lead: ['deep-analysis-mode', 'team-guidance-session', 'prototype-building', 'benchmark-review'],
  staff: ['heads-down-execution', 'precision-task-work', 'rapid-iteration', 'focused-implementation']
};

const MEETING_BEHAVIORS = {
  director: ['leads-from-the-front', 'sets-the-agenda', 'final-word-authority', 'vision-setter'],
  deputy: ['ensures-all-voices-heard', 'action-item-tracker', 'follow-up-enforcer', 'timeline-keeper'],
  lead: ['domain-expert-input', 'technical-advisor', 'quality-gate-voice', 'risk-assessor'],
  staff: ['focused-listener', 'status-reporter', 'question-asker', 'note-taker']
};

function pickFromArray(arr, agentId, suffix) {
  const rng = seededRandom(agentId + suffix);
  return arr[Math.floor(rng() * arr.length)];
}

// ─────────────────────────────────────────────
// WATER COOLER TOPICS - unique per agent
// ─────────────────────────────────────────────
const WATER_COOLER_TOPICS_BY_PROJECT = {
  tsiapp: [
    'Whether elk bugles sound better recorded at dawn versus dusk and the acoustic science behind it',
    'The physics of how a duck call reed vibrates and why humidity changes your tone',
    'That time the FFT algorithm misidentified a car horn as a particularly aggressive turkey',
    'How the spectrogram of a Canada goose honk creates surprisingly beautiful visual art',
    'The heated debate about whether competitive call-making is a sport or an art form',
    'Which ProGuide has the most natural calling technique and what data proves it',
    'How songbird calls encode more information per second than most human languages',
    'The gear-vs-technique debate and whether a $20 call can beat a $200 one in competition',
    'Whether a perfect deer grunt should resonate at 120Hz or 135Hz based on the latest research',
    'How medal economies in gaming parallel progression systems in nature education',
    'The surprising accuracy improvement when microphone calibration accounts for wind speed',
    'Whether AI-scored competitions will ever fully capture the artistry of master callers',
    'How cross-species call training improves your ear for all six animals simultaneously',
    'The curious overlap between music theory and understanding animal call harmonics',
    'Why the ASCE engine occasionally gives bonus points for calls that sound slightly imperfect',
    'Which hunting season launch creates the highest user engagement spike each year',
    'How version management for six species modules is like conducting a wildlife symphony',
    'The ethical framework behind competitive scoring and maintaining fair play standards',
    'Why content licensing for ProGuide videos requires navigating outdoor media rights carefully',
    'How subscription revenue models align with seasonal hunting interest patterns',
    'The product roadmap dilemma of depth versus breadth across species expansion',
    'Whether market intelligence from hunting forums predicts feature adoption better than surveys'
  ],
  clieair: [
    'How the Fourth Amendment applies differently in the digital age and what AI can detect',
    'The fascinating complexity of how FOIA exemption patterns vary by federal agency',
    'Whether AI-assisted legal analysis will democratize access to justice within a decade',
    'How plain-language legal guides tested at sixth-grade reading level reach ten times more citizens',
    'The precedent engine\'s ability to trace citation chains across two centuries of case law',
    'Whether multi-jurisdiction AI models need separate training for each state or can generalize',
    'How testing legal AI for bias requires entirely different methodologies than testing other AI',
    'The operational challenge of routing constitutional cases to the right specialized agent in under an hour',
    'How document automation has reduced FOIA request drafting from days to minutes',
    'The engineering marvel of maintaining 99.99% uptime for a service citizens depend on',
    'How citizen data protection must exceed attorney-client privilege standards for an AI platform',
    'Whether blockchain timestamps could strengthen constitutional rights documentation',
    'The strategy of mapping the civil rights landscape to identify where AI help matters most',
    'How real-time policy monitoring detects rights-threatening changes within one hour',
    'The challenge of training jurisdiction-specific models for all fifty states plus tribal law',
    'How adversarial prompt testing with a thousand plus prompts keeps legal outputs honest',
    'Why grant compliance reporting for a free service requires the same rigor as for-profit accounting',
    'The intersection of civil rights education and adaptive learning platform strategy'
  ],
  charitypats: [
    'How blockchain timestamps create unforgeable proof of when an idea first existed',
    'The marketplace dynamics of matching inventors with investors who actually understand their field',
    'Whether multi-chain redundancy for IP protection is overkill or essential due diligence',
    'How AI novelty scoring can search millions of patents in seconds for prior art',
    'The delicate art of investor relations when the primary mission is charitable fund flow',
    'How cross-chain bridge development requires consensus algorithms that never sleep',
    'The testing philosophy behind auditing smart contracts that protect real inventions',
    'Why blockchain IP registration needs to complete in under ten seconds to keep inventors engaged',
    'How patent pipeline automation transforms the provisional filing process',
    'The three-headed guard dog approach to protecting inventor ideas from unauthorized access',
    'How blockchain immutability verification catches tampering attempts in near real-time',
    'Whether Edison or Tesla had the right approach to patent strategy and what modern AI thinks',
    'How licensing agreements between inventors and investors need to protect both sides equally',
    'The fascinating math behind royalty calculation engines that span multiple blockchain networks',
    'How funding flow monitoring ensures every dollar reaches the right charitable destination',
    'Whether marketplace strategy should favor inventor acquisition or investor ecosystem development',
    'How multi-chain synchronization keeps timestamps consistent across three or more blockchains',
    'The innovation marketplace thesis that protecting ideas is the first step to funding them'
  ],
  guestofhonor: [
    'How sub-300ms guest detection transforms the casino concierge experience overnight',
    'The ML preference model that learns a guest\'s dining preferences within three visits',
    'Whether VIP engagement campaigns should target tier upgrades or deepen current tier loyalty',
    'How loyalty tier mechanics need gamification elements that feel rewarding without being manipulative',
    'The engineering challenge of geofencing accuracy in a casino environment full of RF interference',
    'How SSE alerts to staff need intelligent prioritization to prevent alert fatigue',
    'The integration puzzle of connecting CRM, POS, hotel, restaurant, and entertainment systems seamlessly',
    'How guest privacy can be maintained while still delivering personalized real-time experiences',
    'The access control balance between making the system easy for staff and impossible for intruders',
    'Whether gaming regulatory compliance is harder in tribal gaming jurisdictions or state-regulated ones',
    'How biometric privacy law creates a maze of consent requirements across different states',
    'The comp tracking math that proves VIP service ROI at the individual guest level',
    'How revenue per guest analysis reveals that Diamond tier guests spend differently during conventions',
    'Whether casino technology trends are moving toward ambient detection or active guest participation',
    'How latency testing under real casino conditions with thousands of simultaneous guests changes everything',
    'The SSE event stream processing pipeline that can handle peak casino traffic without dropping a single event',
    'How a five-tier loyalty system maps to entirely different hospitality strategies at each level',
    'The strategy of expanding AI concierge service to ten plus properties while maintaining quality'
  ],
  ideallearning: [
    'How Bayesian Knowledge Tracing predicts what a learner knows before they even answer a question',
    'The philosophy of cradle-to-grave education and whether any other platform has truly attempted it',
    'Whether adaptive difficulty calibration should optimize for engagement or mastery',
    'How curriculum design for seven age brackets requires fundamentally different pedagogical approaches',
    'The cognitive care research that might detect early decline before traditional medical assessments',
    'How senior engagement patterns reveal fascinating differences in how the brain approaches learning at every age',
    'The testing challenge of validating learning paths across millions of possible learner profiles',
    'Why WCAG accessibility compliance is not a checkbox but a core design philosophy',
    'How content delivery optimized for 2G networks opens education to the most underserved communities',
    'The LMS integration challenge of connecting with school districts that use wildly different systems',
    'How COPPA compliance for child learners and HIPAA-adjacent concerns for seniors create a dual security challenge',
    'Whether parental avatar systems can provide meaningful oversight without invading a child\'s learning autonomy',
    'How education law varies so dramatically between states that a single compliance strategy is impossible',
    'The scholarship tracking precision required when every donor dollar is a trust to be honored',
    'How education equity metrics reveal persistent digital divides that technology alone cannot bridge',
    'The community partnership model that brings IdealLearning into every library and community college',
    'How spaced repetition algorithms create different optimal intervals for a five-year-old versus a seventy-year-old',
    'Whether regional job market alignment should drive curriculum priorities or follow learner interest'
  ],
  autozen: [
    'How your car\'s engine knock tells an AI exactly which cylinder is struggling and why',
    'The acoustic signature library that distinguishes a worn brake pad from a warped rotor by sound alone',
    'Whether vibration analysis through a phone accelerometer can reliably diagnose suspension issues',
    'How NHTSA recall data cross-referenced with acoustic diagnosis creates a safety net for drivers',
    'The ad revenue model challenge of serving contextually relevant parts ads without degrading the diagnostic experience',
    'How multi-vendor parts comparison requires normalizing data from fifty plus suppliers in real time',
    'The ML challenge of training diagnostic models across ten thousand vehicle make-model-year combinations',
    'How sound sample quality testing must account for twenty plus recording environments and phone models',
    'The API infrastructure needed to serve diagnostic requests for five hundred thousand monthly active users',
    'How vendor catalog synchronization with sub-fifteen-minute price freshness keeps the marketplace trustworthy',
    'The diagnostic data privacy challenge of protecting VIN-linked vehicle health histories',
    'Whether FTC parts listing compliance and diagnostic disclaimers create enough liability protection',
    'How ad revenue tracking at the CPM level reveals which diagnostic contexts convert best for advertisers',
    'The vendor commission structure that keeps parts suppliers engaged while maintaining competitive pricing',
    'Whether EV diagnostic expansion requires entirely new acoustic models or can build on existing ones',
    'How OBD-II code interpretation combined with acoustic analysis creates a diagnostic accuracy multiplier',
    'The strategic bet that acoustic diagnostics will become the standard consumer vehicle health check',
    'Why sound quality QA requires validated samples across every fault type across every vehicle generation'
  ],
  onthewayhome: [
    'How the five-factor matching algorithm balances proximity against skill-match against urgency in real-time',
    'Whether volunteer motivation research should focus on altruism or the dopamine hit of task completion',
    'The PostGIS spatial query optimization that makes sub-200ms match-finding possible',
    'How community safety monitoring must catch bad actors without creating surveillance anxiety',
    'The legal complexity of volunteer liability across fifty different state jurisdictions',
    'How the VP currency system needs to prevent inflation while keeping rewards meaningful',
    'Whether strategic partnerships with municipalities or nonprofits create more sustainable task supply',
    'The Mapbox integration challenge of rendering custom volunteer layers on mobile without battery drain',
    'How trust scoring algorithms must balance second chances with community safety imperatives',
    'The UX research finding that volunteers care more about estimated task time than distance',
    'How partner onboarding speed directly correlates with long-term partner retention',
    'Whether real-time matching should optimize for fastest match or best quality match',
    'How geolocation accuracy testing reveals that GPS drift in urban canyons is the biggest matching challenge'
  ],
  parlorgames: [
    'How YOLO object detection can distinguish a die showing three from a die showing eight at fifty frames per second',
    'Whether AI commentary that reacts to game events in real-time can replace human sports announcers',
    'The Kalman filter implementation that tracks a ping pong ball trajectory through motion blur',
    'How gambling law compliance requires proving that parlor games are skill-based in every jurisdiction',
    'The streaming pipeline challenge of camera-to-score delivery in under two hundred milliseconds',
    'How anti-cheat detection for CV-scored games requires detecting video feed tampering in real-time',
    'Whether tournament bracket automation needs to account for regional time zones in seeding',
    'The plugin architecture that lets developers add new game types through a modular adapter system',
    'How lighting condition testing revealed that overhead fluorescent lights create the most false positives',
    'The subscription revenue model that turns casual game scorers into premium platform subscribers',
    'Whether expanding to new parlor games should prioritize market demand or CV detection feasibility',
    'How YOLO model fine-tuning with data augmentation handles the infinite variations of real-world game setups',
    'The commentary personality system that gives each AI commentator a distinct voice and excitement curve'
  ],
  quantumledger: [
    'How the OCR engine handles a crumpled gas station receipt with coffee stains and still gets the total right',
    'Whether AI transaction categorization should learn from the user or teach the user proper accounting',
    'The QuickBooks sync bidirectional conflict resolution strategy when both sides edit the same transaction',
    'How double-entry accounting validation catches errors that even experienced bookkeepers might miss',
    'The Plaid integration challenge of handling institution-specific edge cases across five thousand banks',
    'How financial data encryption needs to be as strong as a Faraday cage while remaining auditable',
    'Whether GAAP compliance in AI-generated reports needs different disclaimers than human-prepared ones',
    'The meta-irony of being the accountant who keeps the books for the bookkeeping platform',
    'How integration partnerships with banks and POS systems create network effects for client acquisition',
    'The receipt image preprocessing pipeline that turns a sideways phone photo into structured financial data',
    'How financial report generation needs to handle custom date ranges across fiscal year boundaries',
    'The client onboarding challenge of migrating years of messy QuickBooks data into a clean system',
    'Whether SMB marketing should target the business owner or their accountant for maximum conversion'
  ],
  realworldprizes: [
    'How blockchain-verified winners create a trust layer that makes every prize award cryptographically provable',
    'Whether the fairness algorithm should use deterministic randomness or true quantum randomness',
    'The anti-fraud system that catches multi-account cheaters within twenty-four hours through behavioral biometrics',
    'How prize fulfillment logistics for physical prizes need photo documentation from procurement to doorstep',
    'The sweepstakes law maze of ensuring compliance across all fifty states with void-where-prohibited rules',
    'How prize fund escrow management needs daily reconciliation to prove solvency at any moment',
    'Whether sponsor acquisition should focus on brand exposure ROI or co-branded competition experiences',
    'The smart contract architecture that makes winner selection transparent and auditable by anyone',
    'How leaderboard systems with ELO ratings prevent sandbagging and other ranking manipulation tactics',
    'The competition design challenge of keeping daily formats fresh without repeating within fourteen days',
    'How device fingerprinting catches sophisticated Sybil attacks that create hundreds of fake accounts',
    'The prize logistics coordinator role that turns a warehouse of tech gear into winner-ready unboxing experiences',
    'Whether a prize platform should optimize for competitor count or engagement depth per competitor'
  ],
  machinistzen: [
    'How IMS production monitoring connects shop floor equipment data to meaningful analytics dashboards',
    'Whether the machining community prefers technical forums or visual project-sharing galleries',
    'The security challenge of protecting proprietary CNC programs while enabling community knowledge sharing',
    'How a five-thousand-item tool catalog needs specification normalization across hundreds of manufacturers',
    'The safety resource library that covers every major machine type from manual lathes to five-axis CNC',
    'How React frontends need to be responsive enough to work on tablets mounted on shop floors',
    'The community moderation balance between welcoming beginners and maintaining expert-level discussion quality',
    'How OPC-UA connectivity bridges the gap between legacy machine tools and modern monitoring platforms'
  ],
  translatorstitan: [
    'Whether AR overlays on a real forest could revolutionize how hunters learn to read animal sign',
    'The long-range vision of translating hunting knowledge into immersive experiences that transcend current technology',
    'How competitive intelligence scanning reveals which hunting tech startups might define the next decade',
    'The system architecture decision records that will guide TranslatorsTitan when the market signals say go'
  ]
};

const usedTopics = {};

function pickWaterCoolerTopic(project, agentId) {
  if (!usedTopics[project]) usedTopics[project] = new Set();
  const pool = WATER_COOLER_TOPICS_BY_PROJECT[project] || ['The latest developments in their specialized field'];
  for (const topic of pool) {
    if (!usedTopics[project].has(topic)) {
      usedTopics[project].add(topic);
      return topic;
    }
  }
  // Fallback
  return `The unique challenges of ${project} from the perspective of a specialized agent`;
}

// ─────────────────────────────────────────────
// CATCHPHRASES - unique per agent
// ─────────────────────────────────────────────
const CATCHPHRASES_BY_PROJECT = {
  tsiapp: [
    "The wild answers to those who listen with trained ears.",
    "Every species has a voice. We teach you to speak it.",
    "Frequency is truth. The spectrogram never lies.",
    "From amateur honk to championship bugle, every call counts.",
    "If the data says your duck call is a goose, trust the data.",
    "Six species, one platform, infinite possibilities in the field.",
    "A perfectly scored call is nature and technology singing together.",
    "The marsh does not grade on a curve. Neither do we.",
    "Train the ear, and the hands will follow.",
    "Nature wrote the curriculum. We just digitized it.",
    "Calibrate your microphone, calibrate your success.",
    "Competition sharpens every caller. That is the ASCE promise.",
    "Every medal earned is a step closer to the wild.",
    "The best content comes from those who have walked the fields.",
    "Know your species. Know your call. Know your score.",
    "Hunt season waits for no one. Neither does our launch calendar.",
    "Version parity across species is not optional. It is respect.",
    "Fair scoring is the foundation of every meaningful competition.",
    "Licensed content protects the artists who teach us to call.",
    "Revenue follows value. Value follows accuracy.",
    "The roadmap is a living document, growing like the species it serves.",
    "Markets talk. We listen. Then we build what they actually need."
  ],
  clieair: [
    "The Constitution is not a suggestion. It is a shield.",
    "Every citizen deserves a legal advocate. AI makes that possible for free.",
    "We the People includes everyone. No exceptions. No price tag.",
    "Plain language is the bridge between legal power and the people who need it.",
    "A million cases indexed means a million precedents at your service.",
    "Fifty states, one mission: equal access to constitutional protection.",
    "Bias in legal AI is not a bug. It is an injustice. We audit relentlessly.",
    "No dropped cases. No missed citizens. Twenty-four hours a day.",
    "A FOIA request should take five minutes, not five weeks.",
    "Uptime is not a metric. It is a promise to every citizen waiting for help.",
    "Citizen data is sacred. We guard it like the privilege it represents.",
    "Rights documented on chain are rights that cannot be erased.",
    "Impact is measured in lives changed, not lines of code.",
    "One hour to detect a rights threat. That is the standard we hold.",
    "Every jurisdiction is unique. Our models respect that complexity.",
    "A thousand adversarial prompts, zero excuses for biased output.",
    "Free does not mean cheap. Every grant dollar is accounted for.",
    "Civil rights and education are two halves of the same coin."
  ],
  charitypats: [
    "An idea protected is an idea empowered to change the world.",
    "Investors and inventors meet here. Innovation flows from the handshake.",
    "Three chains, one truth: your timestamp is immutable.",
    "AI sees novelty where human eyes see overlap. Trust the scoring.",
    "The market connects minds. The charity fund connects hearts.",
    "Consensus never sleeps. Neither do our cross-chain bridges.",
    "Smart contracts audited to the byte. That is the price of trust.",
    "Ten seconds from idea to blockchain proof. That is the promise.",
    "From registration to patent filing, automation removes friction.",
    "Three heads guard the gate. No idea leaves without protection.",
    "If the chain is tampered, we know in seconds. Not minutes. Seconds.",
    "Every inventor deserves a fair deal. Every contract reflects that.",
    "Royalties calculated in real-time across multiple chains. That is the future.",
    "Every dollar flows where it should. The ledger proves it.",
    "Fund flow transparency is not a feature. It is the foundation.",
    "Protect ideas. Fund charity. Build the future. In that order.",
    "Multi-chain synchronization is the backbone of digital trust.",
    "The marketplace where protecting ideas and funding good works are the same thing."
  ],
  guestofhonor: [
    "Three hundred milliseconds. That is the difference between service and delight.",
    "The model learns your preferences so your experience feels effortless.",
    "VIP is not a tier. It is a feeling we engineer for every guest.",
    "Loyalty mechanics should feel like rewards, not manipulation.",
    "Detect the guest before they reach the desk. That is the standard.",
    "Alerts that inform, not overwhelm. Intelligence over volume.",
    "Five systems, one seamless guest profile. Integration is invisible service.",
    "Privacy and personalization are not opposites. We prove that daily.",
    "Access controlled down to the role. Security that enables, not restricts.",
    "Compliance across jurisdictions means the house always plays fair.",
    "Consent is the foundation. Every data point has permission behind it.",
    "Comp ROI at the guest level turns generosity into strategy.",
    "Revenue per guest reveals the story behind every visit.",
    "Casino tech is not about the technology. It is about the guest standing in front of you.",
    "Latency under load separates real-time from almost-real-time. We choose real.",
    "Not one event dropped. Not one alert missed. That is the pipeline promise.",
    "Bronze to Diamond: every tier tells a story of engagement.",
    "Ten properties, one platform, zero compromises on quality."
  ],
  ideallearning: [
    "Bayes knew: what you know is always updating. So is our model of you.",
    "Cradle to grave is not a slogan. It is a seven-bracket commitment.",
    "Adaptive means the difficulty finds you, not the other way around.",
    "Seven brackets, seven pedagogies, one unified mission: learn everything.",
    "If we can detect cognitive change early, we can change outcomes for families.",
    "Engagement patterns at eighty years old teach us as much as those at eight.",
    "Ten thousand learner profiles tested. Every path validated. Every bracket covered.",
    "Accessibility is not a feature. It is the floor beneath every feature.",
    "Education that works on 2G means education that reaches everyone.",
    "School district integration turns platform learning into recognized credit.",
    "COPPA for kids. Privacy for seniors. Maximum protection at every age.",
    "Parental oversight and learner autonomy: the balance that makes education trustworthy.",
    "Education law is local. Our compliance is comprehensive.",
    "Every scholarship dollar traced from donor to learner outcome.",
    "The digital divide will not close itself. Strategy must lead the way.",
    "Libraries, colleges, employers: every partnership opens a door to learning.",
    "Spaced repetition intervals vary by age. The algorithm knows. The learner benefits.",
    "Job markets change. Curriculum adapts. Learners arrive prepared."
  ],
  autozen: [
    "Your engine is talking. AutoZen translates.",
    "A worn brake pad has a voice. Our acoustic model recognizes it instantly.",
    "Your phone can feel your car's pain. Accelerometer diagnostics make it possible.",
    "Recall data meets acoustic analysis. The safety net you did not know you needed.",
    "Ads that help you find the right part at the right price. That is contextual revenue done right.",
    "Fifty vendors, one comparison. The parts marketplace that saves real money.",
    "Ten thousand vehicle models. One diagnostic platform. Ninety percent accuracy.",
    "A sound sample is only as good as the environment it was recorded in. We test for all of them.",
    "Half a million monthly users need an API that never flinches. Ours does not.",
    "Fifteen-minute price freshness means the deal you see is the deal you get.",
    "Your vehicle data is yours. We anonymize everything we do not absolutely need.",
    "Every diagnosis comes with a disclaimer. Safety-critical systems come with a warning.",
    "CPM by diagnostic context: the metric that proves automotive ads can be helpful.",
    "Commissions calculated to the cent. Vendors paid on time. Trust maintained.",
    "EVs hum differently than combustion engines. Our models are expanding to hear them.",
    "OBD-II codes plus acoustic signatures: diagnostic accuracy squared.",
    "The future of car care starts with listening. We built the ears.",
    "Every fault type, every generation, every environment: quality assurance at scale."
  ],
  onthewayhome: [
    "The shortest path between a need and a helping hand is a five-factor algorithm.",
    "Understanding why people volunteer matters as much as matching them to tasks.",
    "PostGIS makes the earth searchable. We make it helpful.",
    "Community safety is the non-negotiable that enables everything else.",
    "Volunteer liability law is complex. Our coverage is comprehensive.",
    "Volunteer Points prevent inflation while keeping the thank-you meaningful.",
    "The best partnerships grow from shared purpose, not just signed agreements.",
    "Maps that show opportunities, not just destinations.",
    "Trust is a score that must be earned, recalculated, and honored.",
    "Time matters more than distance. The data told us. We listened.",
    "A partner onboarded in five days is a partner who stays for years.",
    "Match quality beats match speed. Every time.",
    "GPS drift in the city is the enemy. Accuracy testing is the weapon."
  ],
  parlorgames: [
    "Every face of every die, detected at fifty frames per second. The house sees all.",
    "AI commentary that matches the excitement of a human crowd. Game on.",
    "Kalman filters do not lose the ball. Neither do we.",
    "Skill game, not gambling. The law agrees. The accuracy proves it.",
    "Camera to score in under two hundred milliseconds. Blink and you will miss the computation.",
    "If the feed is tampered, we catch it in a single frame.",
    "Tournament brackets that respect time zones and seeding fairness equally.",
    "New games plug in. The platform expands. The community grows.",
    "Lighting changes? Angle shifts? Our models trained for it.",
    "Premium subscribers get the AI scorekeeper they cannot cheat.",
    "New game evaluation: is it fun to play AND possible to score? Both matter.",
    "Training data at five hundred annotations per week. The model appetite is insatiable.",
    "Three commentary personalities. One perfect play-by-play. The show must go on."
  ],
  quantumledger: [
    "The crumpled receipt in your pocket? Our OCR reads it like a fresh printout.",
    "AI categorization that learns your business faster than you learned your business.",
    "When QuickBooks says one thing and the bank says another, we find the truth.",
    "Double-entry validated to the penny. The books do not lie.",
    "Five thousand banks connected. Your transactions flowing automatically.",
    "Financial data encrypted like it is nuclear launch codes. Because to your business, it is.",
    "GAAP compliance is not a feature flag. It is a fundamental guarantee.",
    "An accountant tracking the accounts of the accounting platform. Recursion in real life.",
    "Every integration partnership adds another spoke to the financial data wheel.",
    "A phone photo of a receipt becomes a ledger entry in under three seconds.",
    "Custom reports across fiscal year boundaries without breaking a sweat.",
    "Migrating from messy books to clean books: the transformation that changes businesses.",
    "Target the accountant. Win the business. That is the referral program thesis."
  ],
  realworldprizes: [
    "Every winner verified on chain. Every skeptic satisfied.",
    "Fairness is not an algorithm. It is a commitment backed by cryptographic proof.",
    "Multi-account cheaters caught in twenty-four hours. The behavioral biometrics see through the mask.",
    "From warehouse to doorstep, every prize is photographed and tracked.",
    "Fifty states, fifty sets of sweepstakes rules. Compliance across all of them.",
    "Prize fund solvency proven daily. The escrow never lies.",
    "Sponsors invest in audiences. We deliver audiences that invest in competitions.",
    "Transparent smart contracts mean anyone can verify any winner at any time.",
    "Leaderboard manipulation attempts detected and blocked before they affect rankings.",
    "New competition format every day. Freshness is the anti-churn strategy.",
    "Device fingerprinting catches the sophisticated cheaters that simple rules miss.",
    "Unboxing experiences engineered from the first click to the first opened box.",
    "Engagement depth per competitor predicts lifetime value better than competitor count."
  ],
  machinistzen: [
    "The shop floor and the digital forum: two halves of the machinist's world, united.",
    "OPC-UA data flowing at five-second latency. The machine tells us before the operator notices.",
    "Forum uptime is community trust. Ninety-nine point five percent is the minimum.",
    "Proprietary CNC programs protected while the community shares knowledge freely.",
    "Ten thousand tools, every specification normalized. The catalog that actually helps.",
    "OSHA-aligned safety resources because no project is worth a preventable injury.",
    "React on a shop floor tablet. Responsive design meets industrial reality.",
    "Beginner questions welcomed. Expert answers celebrated. That is the guild hall way."
  ],
  translatorstitan: [
    "The future is patient. When the market speaks, we will be ready.",
    "AR in the forest: not yet feasible, but the vision document is ready.",
    "Fifty companies tracked. One will trigger our activation. We are watching.",
    "Architecture decisions made now will echo through the platform we build tomorrow."
  ]
};

const usedCatchphrases = {};

function pickCatchphrase(project, agentId) {
  if (!usedCatchphrases[project]) usedCatchphrases[project] = new Set();
  const pool = CATCHPHRASES_BY_PROJECT[project] || ['"Excellence in every detail."'];
  for (const phrase of pool) {
    if (!usedCatchphrases[project].has(phrase)) {
      usedCatchphrases[project].add(phrase);
      return phrase;
    }
  }
  return `"Every task matters when the mission is ${project}."`;
}

// ─────────────────────────────────────────────
// LORE GENERATION - unique per agent
// ─────────────────────────────────────────────
function generateLore(agent, projectTheme) {
  const name = agent.name;
  const title = agent.title;
  const project = agent.project;
  const division = agent.division;
  const roleType = getRoleType(title);

  const loreTemplates = {
    director: [
      `Named for the ${name.toLowerCase().includes(' ') ? 'legendary concept' : 'mythic figure'} of ${name}, this Floor Director holds ${projectTheme} together through sheer force of vision and will. Every agent on the floor answers to this singular purpose.`,
      `${name} emerged as the natural leader when ${projectTheme} needed someone who could see every thread simultaneously. Their floor runs like a precision instrument because nothing escapes their notice.`,
      `The ${name} of Floor ${agent.floor} earned their directorship by demonstrating an uncanny ability to hold the full complexity of ${projectTheme} in a single strategic frame. Under their command, the floor operates as one organism.`
    ],
    deputy: [
      `${name} is the operational engine behind ${projectTheme}\'s daily reality. Where the director sets the vision, ${name} ensures every gear turns, every sprint ships, and every deadline holds.`,
      `Known throughout the building as the one who makes ${projectTheme} actually work, ${name} translates grand strategy into morning standup tasks and evening deployment reviews.`,
      `${name} carries the operational weight of ${projectTheme} with quiet competence that the entire floor depends on. Without this deputy, vision would remain vision.`
    ],
    lead: [
      `${name} is the ${division} division\'s sharpest mind on Floor ${agent.floor}, turning ${projectTheme} expertise into measurable results that the entire team rallies behind.`,
      `The ${division} division chose ${name} as its lead because nobody else could match both the depth of domain knowledge and the ability to translate it into actionable team direction.`,
      `${name} earned the ${division} lead role through a combination of technical brilliance and the rare ability to make complex ${projectTheme} challenges feel solvable.`
    ],
    staff: [
      `${name} is the hands-on specialist who turns Floor ${agent.floor}\'s ${division} ambitions into working reality. Quiet, precise, and indispensable.`,
      `On Floor ${agent.floor}, ${name} is known as the one who gets the actual work done in ${division}. No fanfare, just consistent, high-quality output.`,
      `${name} joined Floor ${agent.floor}\'s ${division} team with a singular focus: make ${projectTheme} work at the level of craft that separates good from exceptional.`
    ]
  };

  const rng = seededRandom(agent.id + '_lore');
  const pool = loreTemplates[roleType] || loreTemplates.staff;
  const idx = Math.floor(rng() * pool.length);
  return pool[idx];
}

// ─────────────────────────────────────────────
// STATE WEIGHTS BY ROLE
// ─────────────────────────────────────────────
function getStateWeights(title) {
  const roleType = getRoleType(title);
  switch (roleType) {
    case 'director':
      return { working: 0.35, moving: 0.2, idle: 0.05, meeting: 0.3, networking: 0.1 };
    case 'deputy':
      return { working: 0.4, moving: 0.15, idle: 0.05, meeting: 0.3, networking: 0.1 };
    case 'lead':
      return { working: 0.45, moving: 0.1, idle: 0.1, meeting: 0.25, networking: 0.1 };
    case 'staff':
      return { working: 0.55, moving: 0.1, idle: 0.1, meeting: 0.15, networking: 0.1 };
    default:
      return { working: 0.5, moving: 0.1, idle: 0.1, meeting: 0.2, networking: 0.1 };
  }
}

function getFloorTravelFrequency(title) {
  const roleType = getRoleType(title);
  switch (roleType) {
    case 'director': return 'high';
    case 'deputy': return 'moderate';
    case 'lead': return 'moderate';
    case 'staff': return 'low';
    default: return 'low';
  }
}

function getInteractionRadius(title) {
  const roleType = getRoleType(title);
  switch (roleType) {
    case 'director': return 5.5;
    case 'deputy': return 5;
    case 'lead': return 4;
    case 'staff': return 3;
    default: return 3;
  }
}

function getResponseSpeed(title) {
  const roleType = getRoleType(title);
  switch (roleType) {
    case 'director': return 'measured';
    case 'deputy': return 'immediate';
    case 'lead': return 'deliberate';
    case 'staff': return 'rapid';
    default: return 'rapid';
  }
}

// ─────────────────────────────────────────────
// PREFERRED LOCATIONS BY DIVISION
// ─────────────────────────────────────────────
const PREFERRED_LOCATIONS = {
  management: ['command-center', 'meeting-table', 'elevator-hub'],
  marketing: ['content-studio', 'meeting-table', 'water-cooler'],
  rnd: ['rnd-lab-bench', 'whiteboard-wall', 'data-terminal'],
  testing: ['qa-station', 'test-lab', 'bug-board'],
  production: ['ops-console', 'deployment-terminal', 'monitoring-wall'],
  security: ['security-station', 'surveillance-console', 'access-control-panel'],
  legal: ['law-library', 'document-archive', 'meeting-table'],
  accounting: ['finance-terminal', 'audit-desk', 'ledger-station'],
  strategy: ['strategy-board', 'market-analysis-desk', 'meeting-table'],
  community: ['community-forum-desk', 'water-cooler', 'content-studio'],
  content: ['content-studio', 'document-archive', 'review-desk'],
};

// ─────────────────────────────────────────────
// MAIN GENERATION FUNCTION
// ─────────────────────────────────────────────
function generateVisualDNA(agent, projectId) {
  const theme = PROJECT_THEMES[projectId];
  if (!theme) {
    console.error(`  [WARN] No theme found for project: ${projectId}`);
    return null;
  }

  const rng = seededRandom(agent.id);

  // Pick unique body color from project palette
  const colorIdx = Math.floor(rng() * theme.baseColors.length);
  const bodyColor = theme.baseColors[colorIdx];

  const glowColorIdx = Math.floor(rng() * theme.glowColors.length);
  const glowColor = theme.glowColors[glowColorIdx];

  const trailColorIdx = Math.floor(rng() * theme.trailColors.length);
  const trailColor = theme.trailColors[trailColorIdx];

  const { bodyStyle, scale } = getBodyStyleAndScale(agent.title, agent.status);
  const glowIntensity = getGlowIntensity(agent.title, agent.status);
  const trailLength = getTrailLength(agent.title);
  const nameTagStyle = getNameTagStyle(agent.title, agent.status);
  const auraType = getAuraType(agent.title, agent.division, agent.status);
  const particleEffect = DIVISION_PARTICLES[agent.division] || 'beacon';

  const roleType = getRoleType(agent.title);

  // Idle glow color based on body color
  const idleGlowColor = glowColor;

  const entry = {
    agentId: agent.id,
    name: agent.name,
    floor: agent.floor,
    visual: {
      bodyColor: bodyColor,
      glowColor: glowColor,
      glowIntensity: glowIntensity,
      scale: scale,
      headShape: 'sphere',
      bodyStyle: bodyStyle,
      trailColor: trailColor,
      trailLength: trailLength,
      statusIndicator: {
        working: '#00FF88',
        idle: idleGlowColor,
        meeting: '#FFD700',
        networking: '#FF44FF'
      },
      particleEffect: particleEffect,
      auraType: auraType,
      nameTagStyle: nameTagStyle
    },
    personality: {
      archetype: pickUniqueArchetype(agent.title, agent.division, agent.name),
      traits: pickTraits(roleType, agent.id),
      communicationStyle: pickCommStyle(roleType, agent.division, agent.id),
      idleAnimation: pickFromArray(IDLE_ANIMATIONS[roleType] || IDLE_ANIMATIONS.staff, agent.id, '_idle'),
      workingAnimation: pickFromArray(WORKING_ANIMATIONS[roleType] || WORKING_ANIMATIONS.staff, agent.id, '_work'),
      meetingBehavior: pickFromArray(MEETING_BEHAVIORS[roleType] || MEETING_BEHAVIORS.staff, agent.id, '_meet'),
      waterCoolerTopic: pickWaterCoolerTopic(projectId, agent.id),
      catchphrase: pickCatchphrase(projectId, agent.id)
    },
    behavior: {
      stateWeights: getStateWeights(agent.title),
      preferredLocations: PREFERRED_LOCATIONS[agent.division] || ['desk', 'meeting-table', 'water-cooler'],
      floorTravelFrequency: getFloorTravelFrequency(agent.title),
      interactionRadius: getInteractionRadius(agent.title),
      responseSpeed: getResponseSpeed(agent.title)
    },
    lore: generateLore(agent, theme.name)
  };

  return entry;
}

// ─────────────────────────────────────────────
// MAIN EXECUTION
// ─────────────────────────────────────────────
function main() {
  console.log('=== BOG Visual DNA Project Builder ===');
  console.log('');

  // 1. Read existing visual DNA
  console.log('[1/5] Reading existing agent-visual-dna.json...');
  const dnaData = JSON.parse(fs.readFileSync(DNA_FILE, 'utf8'));
  const existingCount = Object.keys(dnaData.agents).length;
  console.log(`  Found ${existingCount} existing enterprise agents`);

  // 2. Read high-priority roster
  console.log('[2/5] Reading roster-projects-high.json...');
  const rosterHigh = JSON.parse(fs.readFileSync(ROSTER_HIGH, 'utf8'));
  let highAgents = [];
  for (const [floorKey, floorData] of Object.entries(rosterHigh.floors)) {
    const projectId = floorData.project ? floorData.project.toLowerCase() : (floorData.projectId || floorKey.split('_')[1]);
    for (const agent of floorData.agents) {
      highAgents.push({ ...agent, _projectId: projectId });
    }
  }
  console.log(`  Found ${highAgents.length} high-priority agents across ${Object.keys(rosterHigh.floors).length} floors`);

  // 3. Read lower-priority roster
  console.log('[3/5] Reading roster-projects-lower.json...');
  const rosterLower = JSON.parse(fs.readFileSync(ROSTER_LOWER, 'utf8'));
  let lowerAgents = [];
  for (const [floorKey, floorData] of Object.entries(rosterLower.floors)) {
    const projectId = floorData.projectId || floorData.project.toLowerCase();
    for (const agent of floorData.agents) {
      lowerAgents.push({ ...agent, _projectId: projectId });
    }
  }
  console.log(`  Found ${lowerAgents.length} lower-priority agents across ${Object.keys(rosterLower.floors).length} floors`);

  const allProjectAgents = [...highAgents, ...lowerAgents];
  console.log(`  Total project agents to generate: ${allProjectAgents.length}`);

  // 4. Generate visual DNA for each project agent
  console.log('[4/5] Generating visual DNA entries...');
  let generated = 0;
  let skipped = 0;

  const projectCounts = {};

  for (const agent of allProjectAgents) {
    const projectId = agent._projectId;

    // Skip if already exists in DNA
    if (dnaData.agents[agent.id]) {
      console.log(`  [SKIP] ${agent.id} (${agent.name}) - already exists`);
      skipped++;
      continue;
    }

    const dna = generateVisualDNA(agent, projectId);
    if (dna) {
      dnaData.agents[agent.id] = dna;
      generated++;
      projectCounts[projectId] = (projectCounts[projectId] || 0) + 1;
    }
  }

  console.log(`  Generated: ${generated} | Skipped: ${skipped}`);
  console.log('  Per-project breakdown:');
  for (const [proj, count] of Object.entries(projectCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${proj}: ${count} agents`);
  }

  // 5. Update metadata and write
  console.log('[5/5] Writing updated agent-visual-dna.json...');
  const totalAgents = Object.keys(dnaData.agents).length;
  dnaData.totalAgents = totalAgents;
  dnaData.generatedDate = new Date().toISOString().split('T')[0];
  dnaData.description = 'Visual DNA, personality, and behavioral profiles for all Highrise agents. The greater the input detail, the greater the output functional and visual detail.';

  fs.writeFileSync(DNA_FILE, JSON.stringify(dnaData, null, 2), 'utf8');

  console.log('');
  console.log('=== BUILD COMPLETE ===');
  console.log(`Total agents in visual DNA: ${totalAgents}`);
  console.log(`  Enterprise (existing): ${existingCount}`);
  console.log(`  Project (generated):   ${generated}`);
  console.log(`  Skipped (duplicates):  ${skipped}`);
  console.log(`Output: ${DNA_FILE}`);
}

main();
