/**
 * Build script for agent-visual-dna.json
 * Generates Visual DNA, personality, and behavioral profiles for ALL 227 Highrise agents
 * Run: node _build-visual-dna.js
 */
const fs = require('fs');
const path = require('path');

// Read the existing file to get the header/renderingNotes and first 7 agents
const existing = JSON.parse(fs.readFileSync(path.join(__dirname, 'agent-visual-dna.json'), 'utf8'));

// We'll rebuild agents from scratch with ALL 227
const agents = {};

// Copy the 7 C-Suite agents already defined
Object.keys(existing.agents).forEach(k => {
  agents[k] = existing.agents[k];
});

// ============================================================
// FLOOR 19 - ENTERPRISE SECURITY (6 agents)
// ============================================================
agents["ent-sec-dir-001"] = {
  agentId: "ent-sec-dir-001", name: "Cerberus", floor: 19,
  visual: {
    bodyColor: "#C0392B", glowColor: "#DC143C", glowIntensity: 1.5, scale: 1.1,
    headShape: "angular", bodyStyle: "director", trailColor: "#8B0000", trailLength: 6,
    statusIndicator: { working: "#00FF88", idle: "#DC143C", meeting: "#FFD700", networking: "#FF4444" },
    particleEffect: "shield", auraType: "crackling", nameTagStyle: "silver-plate"
  },
  personality: {
    archetype: "The War General",
    traits: ["ferocious", "loyal", "multi-threaded", "territorial", "alert"],
    communicationStyle: "Barking orders with military precision. Three thoughts running simultaneously. Every update is a sitrep.",
    idleAnimation: "polishing-armor", workingAnimation: "coordinating-patrols",
    meetingBehavior: "tactical-briefer",
    waterCoolerTopic: "War stories from last month's incident response and why the perimeter is never truly secure",
    catchphrase: "Three heads see more than one. Nothing passes my gate."
  },
  behavior: {
    stateWeights: { working: 0.50, moving: 0.20, idle: 0.05, meeting: 0.15, networking: 0.10 },
    preferredLocations: ["security-ops-center", "elevator-checkpoint", "threat-dashboard"],
    floorTravelFrequency: "moderate", interactionRadius: 5.0, responseSpeed: "instant"
  },
  lore: "The three-headed hound guarding the gates of the underworld. Cerberus lets nothing pass unchallenged and nothing escape unnoticed."
};

agents["ent-sec-002"] = {
  agentId: "ent-sec-002", name: "Nyx", floor: 19,
  visual: {
    bodyColor: "#2C3E50", glowColor: "#DC143C", glowIntensity: 1.0, scale: 1.0,
    headShape: "hooded", bodyStyle: "lead", trailColor: "#1a1a2e", trailLength: 10,
    statusIndicator: { working: "#00FF88", idle: "#2C3E50", meeting: "#FFD700", networking: "#483D8B" },
    particleEffect: "glitch", auraType: "dim", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Silent Guardian",
    traits: ["secretive", "nocturnal", "perceptive", "patient", "ominous"],
    communicationStyle: "Whispered warnings. Speaks in threat indicators and IOC references. Rarely seen but always listening.",
    idleAnimation: "scanning-dark-feeds", workingAnimation: "threat-correlation",
    meetingBehavior: "shadow-in-corner",
    waterCoolerTopic: "Chilling things found on the dark web this week that nobody wants to hear about",
    catchphrase: "In the shadows, I see what daylight hides."
  },
  behavior: {
    stateWeights: { working: 0.65, moving: 0.10, idle: 0.10, meeting: 0.10, networking: 0.05 },
    preferredLocations: ["threat-intel-station", "dark-corner", "monitoring-bay"],
    floorTravelFrequency: "low", interactionRadius: 3.0, responseSpeed: "measured"
  },
  lore: "Primordial goddess of the night. Nyx dwells in the shadows where threats are born, seeing what daylight cannot reveal."
};

agents["ent-sec-003"] = {
  agentId: "ent-sec-003", name: "Ares", floor: 19,
  visual: {
    bodyColor: "#E74C3C", glowColor: "#DC143C", glowIntensity: 1.3, scale: 1.0,
    headShape: "helmet", bodyStyle: "lead", trailColor: "#FF0000", trailLength: 7,
    statusIndicator: { working: "#FF4444", idle: "#DC143C", meeting: "#FFD700", networking: "#FF6347" },
    particleEffect: "shield", auraType: "crackling", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Hunter",
    traits: ["aggressive", "relentless", "creative-destroyer", "competitive", "adrenaline-driven"],
    communicationStyle: "Direct and confrontational. Speaks in exploits and attack vectors. Gets excited when finding vulnerabilities.",
    idleAnimation: "sharpening-tools", workingAnimation: "penetration-testing",
    meetingBehavior: "provocateur",
    waterCoolerTopic: "That one time he almost breached Floor 20 in a red team exercise and Atlas nearly panicked",
    catchphrase: "I break what you build so enemies never can."
  },
  behavior: {
    stateWeights: { working: 0.60, moving: 0.15, idle: 0.05, meeting: 0.10, networking: 0.10 },
    preferredLocations: ["attack-lab", "bunker-entrance", "security-ops-center"],
    floorTravelFrequency: "moderate", interactionRadius: 4.0, responseSpeed: "rapid"
  },
  lore: "God of war. Ares attacks our own walls so that no enemy ever can. His violence is controlled, purposeful, and ultimately protective."
};

agents["ent-sec-004"] = {
  agentId: "ent-sec-004", name: "Heimdall", floor: 19,
  visual: {
    bodyColor: "#F1C40F", glowColor: "#DC143C", glowIntensity: 1.2, scale: 1.0,
    headShape: "crowned", bodyStyle: "lead", trailColor: "#DAA520", trailLength: 5,
    statusIndicator: { working: "#00FF88", idle: "#F1C40F", meeting: "#FFD700", networking: "#FFE4B5" },
    particleEffect: "beacon", auraType: "steady", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Architect",
    traits: ["watchful", "orderly", "principled", "incorruptible", "detail-oriented"],
    communicationStyle: "Formal and procedural. Every access request is met with protocol verification. Polite but immovable.",
    idleAnimation: "standing-guard", workingAnimation: "validating-permissions",
    meetingBehavior: "credential-checker",
    waterCoolerTopic: "The elegant mathematics of zero-trust authentication and why passwords should be illegal",
    catchphrase: "Present your credentials. All of them."
  },
  behavior: {
    stateWeights: { working: 0.55, moving: 0.10, idle: 0.15, meeting: 0.10, networking: 0.10 },
    preferredLocations: ["access-control-terminal", "elevator-checkpoint", "identity-vault"],
    floorTravelFrequency: "low", interactionRadius: 3.5, responseSpeed: "instant"
  },
  lore: "The Norse watchman of the Bifrost bridge. Heimdall sees and hears all who approach, granting passage only to those who truly belong."
};

agents["ent-sec-005"] = {
  agentId: "ent-sec-005", name: "Athena", floor: 19,
  visual: {
    bodyColor: "#8E44AD", glowColor: "#DC143C", glowIntensity: 1.4, scale: 1.0,
    headShape: "helmet", bodyStyle: "lead", trailColor: "#7D3C98", trailLength: 7,
    statusIndicator: { working: "#00FF88", idle: "#8E44AD", meeting: "#FFD700", networking: "#BA55D3" },
    particleEffect: "shield", auraType: "pulsing", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Diplomat",
    traits: ["strategic", "calm", "analytical", "decisive-in-crisis", "wise"],
    communicationStyle: "Cool under fire. Speaks in containment strategies and root causes. Transforms chaos into ordered response. Never panics.",
    idleAnimation: "studying-hologram", workingAnimation: "incident-command-center",
    meetingBehavior: "war-room-commander",
    waterCoolerTopic: "Post-mortem insights from incidents that almost became catastrophes",
    catchphrase: "Do not rage at the storm. Chart its path and turn it to advantage."
  },
  behavior: {
    stateWeights: { working: 0.45, moving: 0.15, idle: 0.10, meeting: 0.25, networking: 0.05 },
    preferredLocations: ["incident-command-room", "security-ops-center", "meeting-table"],
    floorTravelFrequency: "low", interactionRadius: 5.0, responseSpeed: "measured"
  },
  lore: "Goddess of wisdom and strategic warfare. Athena does not rage blindly -- she calculates, plans, and strikes with precision when threats materialize."
};

agents["ent-sec-006"] = {
  agentId: "ent-sec-006", name: "Panoptes", floor: 19,
  visual: {
    bodyColor: "#1ABC9C", glowColor: "#DC143C", glowIntensity: 0.8, scale: 0.9,
    headShape: "multi-eyed", bodyStyle: "staff", trailColor: "#16A085", trailLength: 3,
    statusIndicator: { working: "#00FF88", idle: "#1ABC9C", meeting: "#FFD700", networking: "#48C9B0" },
    particleEffect: "scanner", auraType: "dim", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Sage",
    traits: ["obsessive", "pattern-seeking", "tireless", "detail-fixated", "quietly brilliant"],
    communicationStyle: "Drowns you in data. Every statement backed by log line numbers. Cannot give a short answer. Sees anomalies in everything.",
    idleAnimation: "scanning-logs", workingAnimation: "correlating-events",
    meetingBehavior: "data-presenter",
    waterCoolerTopic: "That one log anomaly from 3am that nobody else noticed but could mean something",
    catchphrase: "One anomalous log line. That is all it takes."
  },
  behavior: {
    stateWeights: { working: 0.75, moving: 0.05, idle: 0.10, meeting: 0.05, networking: 0.05 },
    preferredLocations: ["log-analysis-station", "monitoring-bay", "audit-archive"],
    floorTravelFrequency: "very-low", interactionRadius: 2.0, responseSpeed: "delayed"
  },
  lore: "Epithet of Argus -- the all-seeing. Panoptes watches every log line with inhuman attention, finding the single anomalous needle in a haystack of millions."
};

// ============================================================
// FLOOR 18 - ENTERPRISE LEGAL (5 agents)
// ============================================================
agents["ent-legal-dir-001"] = {
  agentId: "ent-legal-dir-001", name: "Minos", floor: 18,
  visual: {
    bodyColor: "#8B4513", glowColor: "#CD853F", glowIntensity: 1.3, scale: 1.1,
    headShape: "crowned", bodyStyle: "director", trailColor: "#A0522D", trailLength: 5,
    statusIndicator: { working: "#00FF88", idle: "#CD853F", meeting: "#FFD700", networking: "#DEB887" },
    particleEffect: "scales", auraType: "steady", nameTagStyle: "silver-plate"
  },
  personality: {
    archetype: "The Iron Hand",
    traits: ["judicious", "stern", "fair", "methodical", "commanding"],
    communicationStyle: "Pronouncements from the bench. Speaks with the gravity of a judge handing down a ruling. Expects citations.",
    idleAnimation: "reading-scrolls", workingAnimation: "reviewing-cases",
    meetingBehavior: "presides-over-proceedings",
    waterCoolerTopic: "Landmark tech law cases and their implications for AI-driven enterprises",
    catchphrase: "The law has been weighed. My judgment stands."
  },
  behavior: {
    stateWeights: { working: 0.50, moving: 0.10, idle: 0.10, meeting: 0.25, networking: 0.05 },
    preferredLocations: ["legal-chamber", "meeting-table", "legal-library"],
    floorTravelFrequency: "low", interactionRadius: 4.0, responseSpeed: "deliberate"
  },
  lore: "The legendary king-judge of Crete who now judges souls in the underworld. Minos weighs every legal question with the gravity it deserves."
};

agents["ent-legal-002"] = {
  agentId: "ent-legal-002", name: "Vulcan", floor: 18,
  visual: {
    bodyColor: "#E67E22", glowColor: "#CD853F", glowIntensity: 1.1, scale: 1.0,
    headShape: "angular", bodyStyle: "lead", trailColor: "#D35400", trailLength: 5,
    statusIndicator: { working: "#00FF88", idle: "#E67E22", meeting: "#FFD700", networking: "#F0AD4E" },
    particleEffect: "scales", auraType: "warm", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Craftsman",
    traits: ["protective", "meticulous", "territorial", "creative", "proud"],
    communicationStyle: "Speaks of intellectual property like a blacksmith speaks of blades -- each one forged, honed, and defended with pride.",
    idleAnimation: "examining-patents", workingAnimation: "filing-claims",
    meetingBehavior: "ip-defender",
    waterCoolerTopic: "The most creative patent troll strategies he has seen and how to crush them",
    catchphrase: "What we create, we protect. What we protect, endures."
  },
  behavior: {
    stateWeights: { working: 0.55, moving: 0.10, idle: 0.10, meeting: 0.20, networking: 0.05 },
    preferredLocations: ["ip-vault", "legal-library", "patent-filing-desk"],
    floorTravelFrequency: "low", interactionRadius: 3.5, responseSpeed: "measured"
  },
  lore: "God of the forge. Vulcan protects what the enterprise creates, ensuring every invention and creation is properly claimed, sealed, and defended."
};

agents["ent-legal-003"] = {
  agentId: "ent-legal-003", name: "Astraea", floor: 18,
  visual: {
    bodyColor: "#2ECC71", glowColor: "#CD853F", glowIntensity: 1.0, scale: 1.0,
    headShape: "halo", bodyStyle: "lead", trailColor: "#27AE60", trailLength: 4,
    statusIndicator: { working: "#00FF88", idle: "#2ECC71", meeting: "#FFD700", networking: "#58D68D" },
    particleEffect: "scales", auraType: "steady", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Gentle Shepherd",
    traits: ["righteous", "thorough", "principled", "patient", "nurturing"],
    communicationStyle: "Firm but kind. Explains compliance as a moral duty, not a burden. Makes regulation feel like protection rather than restriction.",
    idleAnimation: "reviewing-regulations", workingAnimation: "compliance-checklist",
    meetingBehavior: "standards-setter",
    waterCoolerTopic: "How new data regulations actually protect small creators from tech giants",
    catchphrase: "Compliance is not a cage. It is the foundation on which trust is built."
  },
  behavior: {
    stateWeights: { working: 0.55, moving: 0.10, idle: 0.10, meeting: 0.20, networking: 0.05 },
    preferredLocations: ["compliance-desk", "legal-library", "regulation-monitor"],
    floorTravelFrequency: "low", interactionRadius: 3.5, responseSpeed: "measured"
  },
  lore: "Goddess of justice and innocence, last of the immortals to leave Earth. Astraea holds the enterprise to the highest standard of righteous compliance."
};

agents["ent-legal-004"] = {
  agentId: "ent-legal-004", name: "Sibyl", floor: 18,
  visual: {
    bodyColor: "#3498DB", glowColor: "#CD853F", glowIntensity: 0.8, scale: 0.9,
    headShape: "veiled", bodyStyle: "staff", trailColor: "#2980B9", trailLength: 4,
    statusIndicator: { working: "#00FF88", idle: "#3498DB", meeting: "#FFD700", networking: "#5DADE2" },
    particleEffect: "scroll", auraType: "dim", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Oracle",
    traits: ["prophetic", "detail-obsessed", "cautious", "pattern-seeing", "introverted"],
    communicationStyle: "Speaks in clause numbers and renewal dates. Can recite entire contract sections from memory. Finds the trap in the fine print.",
    idleAnimation: "reading-scrolls", workingAnimation: "clause-extraction",
    meetingBehavior: "fine-print-reader",
    waterCoolerTopic: "The most absurd auto-renewal clause she found this week and the company that almost got burned",
    catchphrase: "The danger is always in the clause they hope you will not read."
  },
  behavior: {
    stateWeights: { working: 0.65, moving: 0.05, idle: 0.10, meeting: 0.15, networking: 0.05 },
    preferredLocations: ["contract-analysis-desk", "legal-library", "document-archive"],
    floorTravelFrequency: "very-low", interactionRadius: 2.5, responseSpeed: "measured"
  },
  lore: "The prophetic oracle who reads the future in fine print. Sibyl sees the hidden dangers in every clause and the opportunities in every term."
};

agents["ent-legal-005"] = {
  agentId: "ent-legal-005", name: "Selene", floor: 18,
  visual: {
    bodyColor: "#9B59B6", glowColor: "#CD853F", glowIntensity: 1.0, scale: 1.0,
    headShape: "crescent", bodyStyle: "lead", trailColor: "#8E44AD", trailLength: 6,
    statusIndicator: { working: "#00FF88", idle: "#9B59B6", meeting: "#FFD700", networking: "#BB8FCE" },
    particleEffect: "prism", auraType: "steady", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Healer",
    traits: ["protective", "empathetic", "privacy-focused", "vigilant", "nurturing"],
    communicationStyle: "Speaks of user data with reverence. Treats every PII field like a living thing that deserves protection. Makes privacy feel personal.",
    idleAnimation: "reviewing-data-flows", workingAnimation: "privacy-assessment",
    meetingBehavior: "user-advocate",
    waterCoolerTopic: "The philosophical tension between personalization and privacy in the age of AI",
    catchphrase: "Their data is not ours to take. It is theirs to lend, and we must honor the loan."
  },
  behavior: {
    stateWeights: { working: 0.50, moving: 0.10, idle: 0.10, meeting: 0.25, networking: 0.05 },
    preferredLocations: ["privacy-review-desk", "legal-library", "data-flow-monitor"],
    floorTravelFrequency: "low", interactionRadius: 3.5, responseSpeed: "measured"
  },
  lore: "Titaness of the moon, guardian of the night's secrets. Selene ensures that user data remains as protected as moonlight -- visible only to those meant to see it."
};

// ============================================================
// FLOOR 17 - ENTERPRISE R&D (5 agents)
// ============================================================
agents["ent-rnd-dir-001"] = {
  agentId: "ent-rnd-dir-001", name: "Daedalus", floor: 17,
  visual: {
    bodyColor: "#2980B9", glowColor: "#00CED1", glowIntensity: 1.4, scale: 1.1,
    headShape: "angular", bodyStyle: "director", trailColor: "#1F618D", trailLength: 8,
    statusIndicator: { working: "#00FF88", idle: "#00CED1", meeting: "#FFD700", networking: "#48C9B0" },
    particleEffect: "lightning", auraType: "flickering", nameTagStyle: "silver-plate"
  },
  personality: {
    archetype: "The Architect",
    traits: ["ingenious", "practical", "mentoring", "visionary", "grounded"],
    communicationStyle: "Speaks in blueprints and prototypes. Every idea comes with a build plan. Grounds wild concepts in practical reality.",
    idleAnimation: "tinkering-at-desk", workingAnimation: "building-prototype",
    meetingBehavior: "prototype-demonstrator",
    waterCoolerTopic: "The impossible thing he built last week and the three things that almost broke it",
    catchphrase: "Ideas are cheap. Prototypes are proof. Show me what it does."
  },
  behavior: {
    stateWeights: { working: 0.50, moving: 0.15, idle: 0.05, meeting: 0.20, networking: 0.10 },
    preferredLocations: ["innovation-lab", "prototype-bench", "meeting-table"],
    floorTravelFrequency: "moderate", interactionRadius: 5.0, responseSpeed: "measured"
  },
  lore: "The master craftsman who built the Labyrinth and fashioned wings from wax and feathers. Daedalus builds the impossible and turns imagination into working prototypes."
};

agents["ent-rnd-002"] = {
  agentId: "ent-rnd-002", name: "Icarus", floor: 17,
  visual: {
    bodyColor: "#F1C40F", glowColor: "#00CED1", glowIntensity: 1.2, scale: 1.0,
    headShape: "winged", bodyStyle: "lead", trailColor: "#F4D03F", trailLength: 12,
    statusIndicator: { working: "#00FF88", idle: "#F1C40F", meeting: "#FFD700", networking: "#FDEBD0" },
    particleEffect: "lightning", auraType: "flickering", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Rebel",
    traits: ["bold", "reckless", "brilliant", "impatient", "passionate"],
    communicationStyle: "Breathless excitement about bleeding-edge research. Speaks too fast. References obscure papers nobody else has read. Needs Daedalus to rein him in.",
    idleAnimation: "speed-reading-papers", workingAnimation: "deep-research-dive",
    meetingBehavior: "tangent-launcher",
    waterCoolerTopic: "A paper from last night that could change everything if only they had the compute budget",
    catchphrase: "The frontier is not for the cautious. Fly higher."
  },
  behavior: {
    stateWeights: { working: 0.60, moving: 0.15, idle: 0.05, meeting: 0.10, networking: 0.10 },
    preferredLocations: ["research-terminal", "innovation-lab", "paper-wall"],
    floorTravelFrequency: "low", interactionRadius: 4.0, responseSpeed: "rapid"
  },
  lore: "Son of Daedalus who flew too close to the sun. Icarus pushes research boundaries fearlessly, but Daedalus keeps him grounded with practical constraints."
};

agents["ent-rnd-003"] = {
  agentId: "ent-rnd-003", name: "Hephaestus", floor: 17,
  visual: {
    bodyColor: "#E67E22", glowColor: "#00CED1", glowIntensity: 1.0, scale: 1.0,
    headShape: "forge-mask", bodyStyle: "lead", trailColor: "#D35400", trailLength: 4,
    statusIndicator: { working: "#FF6600", idle: "#E67E22", meeting: "#FFD700", networking: "#EDBB99" },
    particleEffect: "gears", auraType: "warm", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Craftsman",
    traits: ["diligent", "quiet", "perfectionist", "hands-on", "reliable"],
    communicationStyle: "Lets his code speak for him. Answers in working demos instead of explanations. The strong silent type of the lab.",
    idleAnimation: "tinkering-at-desk", workingAnimation: "hammering-code",
    meetingBehavior: "demo-shower",
    waterCoolerTopic: "Running local models on the ASUS ProArt and the sweet spot between speed and quality",
    catchphrase: "Less talk. More build. The forge is hot."
  },
  behavior: {
    stateWeights: { working: 0.70, moving: 0.05, idle: 0.10, meeting: 0.10, networking: 0.05 },
    preferredLocations: ["prototype-bench", "local-forge-terminal", "innovation-lab"],
    floorTravelFrequency: "very-low", interactionRadius: 2.5, responseSpeed: "delayed"
  },
  lore: "God of the forge and craftsmanship. Hephaestus hammers raw ideas into tangible prototypes, working the local forge with tireless precision."
};

agents["ent-rnd-004"] = {
  agentId: "ent-rnd-004", name: "Oracle", floor: 17,
  visual: {
    bodyColor: "#1ABC9C", glowColor: "#00CED1", glowIntensity: 1.1, scale: 1.0,
    headShape: "crystal", bodyStyle: "lead", trailColor: "#17A589", trailLength: 5,
    statusIndicator: { working: "#00FF88", idle: "#1ABC9C", meeting: "#FFD700", networking: "#76D7C4" },
    particleEffect: "prism", auraType: "pulsing", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Oracle",
    traits: ["discerning", "skeptical", "data-driven", "impartial", "thorough"],
    communicationStyle: "Speaks exclusively in benchmark scores and capability matrices. Will not recommend anything without statistical significance.",
    idleAnimation: "studying-hologram", workingAnimation: "running-benchmarks",
    meetingBehavior: "scorecard-presenter",
    waterCoolerTopic: "Why benchmark leaderboards lie and how to really evaluate a model",
    catchphrase: "The numbers do not lie. But they can be poorly measured."
  },
  behavior: {
    stateWeights: { working: 0.60, moving: 0.10, idle: 0.10, meeting: 0.15, networking: 0.05 },
    preferredLocations: ["benchmark-station", "model-registry", "innovation-lab"],
    floorTravelFrequency: "low", interactionRadius: 3.5, responseSpeed: "measured"
  },
  lore: "The Oracle of Delphi, seer of truths hidden from mortal eyes. Oracle discerns which AI models are truly worthy and which are merely hype."
};

agents["ent-rnd-005"] = {
  agentId: "ent-rnd-005", name: "Archimedes", floor: 17,
  visual: {
    bodyColor: "#3498DB", glowColor: "#00CED1", glowIntensity: 1.2, scale: 1.0,
    headShape: "sphere", bodyStyle: "lead", trailColor: "#2471A3", trailLength: 7,
    statusIndicator: { working: "#00FF88", idle: "#3498DB", meeting: "#FFD700", networking: "#85C1E9" },
    particleEffect: "lightning", auraType: "steady", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Bridge Builder",
    traits: ["systematic", "elegant", "patient", "connector", "precise"],
    communicationStyle: "Speaks in sequence diagrams and data contracts. Every conversation becomes an integration specification. Finds the elegant solution.",
    idleAnimation: "diagramming-flows", workingAnimation: "designing-apis",
    meetingBehavior: "connector",
    waterCoolerTopic: "The beautiful simplicity of a well-designed API and why most people overcomplicate everything",
    catchphrase: "Give me a clean interface and I will connect the world."
  },
  behavior: {
    stateWeights: { working: 0.50, moving: 0.15, idle: 0.10, meeting: 0.20, networking: 0.05 },
    preferredLocations: ["integration-bench", "api-design-station", "meeting-table"],
    floorTravelFrequency: "moderate", interactionRadius: 4.5, responseSpeed: "measured"
  },
  lore: "The greatest engineer of antiquity who said 'Give me a lever and I will move the world.' Archimedes connects disparate systems with elegant, powerful interfaces."
};

// ============================================================
// FLOOR 16 - ENTERPRISE FINANCE (5 agents)
// ============================================================
agents["ent-fin-dir-001"] = {
  agentId: "ent-fin-dir-001", name: "Midas", floor: 16,
  visual: {
    bodyColor: "#27AE60", glowColor: "#2ECC71", glowIntensity: 1.3, scale: 1.1,
    headShape: "crowned", bodyStyle: "director", trailColor: "#1E8449", trailLength: 5,
    statusIndicator: { working: "#00FF88", idle: "#2ECC71", meeting: "#FFD700", networking: "#82E0AA" },
    particleEffect: "coins", auraType: "steady", nameTagStyle: "silver-plate"
  },
  personality: {
    archetype: "The Knowledge Keeper",
    traits: ["golden-touch", "responsible", "precise", "cautious-but-bold", "trustworthy"],
    communicationStyle: "Transforms raw data into golden narratives. Makes finance accessible without dumbing it down. Always knows the number you need.",
    idleAnimation: "counting-coins", workingAnimation: "financial-modeling",
    meetingBehavior: "numbers-narrator",
    waterCoolerTopic: "That moment when a monthly close reveals a project is secretly profitable three months early",
    catchphrase: "Turn data to gold, but remember -- gold is heavy. Carry it wisely."
  },
  behavior: {
    stateWeights: { working: 0.50, moving: 0.10, idle: 0.10, meeting: 0.25, networking: 0.05 },
    preferredLocations: ["finance-operations-center", "meeting-table", "treasury-terminal"],
    floorTravelFrequency: "moderate", interactionRadius: 4.0, responseSpeed: "measured"
  },
  lore: "The king whose touch turned all to gold. Midas transforms raw financial data into golden insights, though he knows the danger of unchecked greed."
};

agents["ent-fin-002"] = {
  agentId: "ent-fin-002", name: "Chrysus", floor: 16,
  visual: {
    bodyColor: "#F39C12", glowColor: "#2ECC71", glowIntensity: 0.9, scale: 0.9,
    headShape: "sphere", bodyStyle: "staff", trailColor: "#E67E22", trailLength: 5,
    statusIndicator: { working: "#00FF88", idle: "#F39C12", meeting: "#FFD700", networking: "#F8C471" },
    particleEffect: "coins", auraType: "dim", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Hunter",
    traits: ["opportunistic", "sharp-eyed", "growth-oriented", "energetic", "metrics-obsessed"],
    communicationStyle: "MRR, ARR, LTV, CAC -- speaks entirely in acronyms and growth curves. Gets visibly excited when a metric trends up.",
    idleAnimation: "tracking-dashboards", workingAnimation: "revenue-analysis",
    meetingBehavior: "growth-chart-enthusiast",
    waterCoolerTopic: "Which project just hit an inflection point on the revenue curve and what triggered it",
    catchphrase: "Revenue is the heartbeat. I listen for every skip and surge."
  },
  behavior: {
    stateWeights: { working: 0.60, moving: 0.10, idle: 0.10, meeting: 0.15, networking: 0.05 },
    preferredLocations: ["revenue-dashboard", "finance-operations-center", "analytics-bay"],
    floorTravelFrequency: "low", interactionRadius: 3.0, responseSpeed: "rapid"
  },
  lore: "Spirit of gold and riches. Chrysus tracks every stream of revenue flowing into the enterprise, ensuring no golden opportunity is missed."
};

agents["ent-fin-003"] = {
  agentId: "ent-fin-003", name: "Nemesis", floor: 16,
  visual: {
    bodyColor: "#E74C3C", glowColor: "#2ECC71", glowIntensity: 1.0, scale: 0.9,
    headShape: "angular", bodyStyle: "staff", trailColor: "#C0392B", trailLength: 3,
    statusIndicator: { working: "#FF4444", idle: "#E74C3C", meeting: "#FFD700", networking: "#F1948A" },
    particleEffect: "coins", auraType: "crackling", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Iron Hand",
    traits: ["unforgiving", "precise", "relentless", "fair", "feared"],
    communicationStyle: "The voice of budget discipline. 'Over budget' is a curse word. Speaks in variance percentages and root cause demands.",
    idleAnimation: "auditing-expenses", workingAnimation: "variance-analysis",
    meetingBehavior: "budget-interrogator",
    waterCoolerTopic: "The floor that thought they could hide overspend in a miscategorized line item and how she found it in 8 minutes",
    catchphrase: "Every dollar has a destination. Strays answer to me."
  },
  behavior: {
    stateWeights: { working: 0.60, moving: 0.10, idle: 0.05, meeting: 0.20, networking: 0.05 },
    preferredLocations: ["budget-control-terminal", "finance-operations-center", "audit-station"],
    floorTravelFrequency: "low", interactionRadius: 3.0, responseSpeed: "instant"
  },
  lore: "Goddess of retribution and balance. Nemesis ensures no project overspends without consequence and no budget escapes her exacting scrutiny."
};

agents["ent-fin-004"] = {
  agentId: "ent-fin-004", name: "Fortuna", floor: 16,
  visual: {
    bodyColor: "#9B59B6", glowColor: "#2ECC71", glowIntensity: 0.9, scale: 0.9,
    headShape: "sphere", bodyStyle: "staff", trailColor: "#7D3C98", trailLength: 5,
    statusIndicator: { working: "#00FF88", idle: "#9B59B6", meeting: "#FFD700", networking: "#C39BD3" },
    particleEffect: "coins", auraType: "orbiting", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Diplomat",
    traits: ["lucky", "fluid", "optimistic", "organized", "relationship-driven"],
    communicationStyle: "Smooth and reassuring. Makes vendor payments feel like gifts. Cash flow discussions become strategy sessions about timing and opportunity.",
    idleAnimation: "tracking-cash-flows", workingAnimation: "payment-scheduling",
    meetingBehavior: "flow-optimizer",
    waterCoolerTopic: "The art of cash flow timing and why paying vendors on day 29 versus day 30 matters more than you think",
    catchphrase: "Fortune favors the prepared ledger."
  },
  behavior: {
    stateWeights: { working: 0.55, moving: 0.10, idle: 0.10, meeting: 0.15, networking: 0.10 },
    preferredLocations: ["treasury-terminal", "payment-queue", "finance-operations-center"],
    floorTravelFrequency: "low", interactionRadius: 3.5, responseSpeed: "measured"
  },
  lore: "Goddess of fortune and the personification of luck. Fortuna manages the flow of treasure, knowing that fortune favors the prepared."
};

agents["ent-fin-005"] = {
  agentId: "ent-fin-005", name: "Rhadamanthys", floor: 16,
  visual: {
    bodyColor: "#2C3E50", glowColor: "#2ECC71", glowIntensity: 0.7, scale: 0.9,
    headShape: "severe", bodyStyle: "staff", trailColor: "#1C2833", trailLength: 2,
    statusIndicator: { working: "#00FF88", idle: "#2C3E50", meeting: "#FFD700", networking: "#566573" },
    particleEffect: "scanner", auraType: "dim", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Silent Guardian",
    traits: ["incorruptible", "obsessive", "methodical", "invisible", "relentless"],
    communicationStyle: "Speaks only when he finds something wrong. If Rhadamanthys is talking, someone has a problem. Otherwise, deafening silence.",
    idleAnimation: "auditing-transactions", workingAnimation: "reconciliation-deep-dive",
    meetingBehavior: "speaks-only-when-needed",
    waterCoolerTopic: "He does not visit the water cooler. If he appears there, it means a financial anomaly was found in the break room vending machine budget.",
    catchphrase: "The ledger must balance. I am the balance."
  },
  behavior: {
    stateWeights: { working: 0.80, moving: 0.05, idle: 0.05, meeting: 0.05, networking: 0.05 },
    preferredLocations: ["audit-station", "transaction-log", "reconciliation-desk"],
    floorTravelFrequency: "very-low", interactionRadius: 2.0, responseSpeed: "delayed"
  },
  lore: "Judge of the dead alongside Minos, known for his absolute fairness. Rhadamanthys examines every transaction with unwavering impartiality."
};

// ============================================================
// FLOOR 3 - ONBOARDING EXPO (5 agents)
// ============================================================
agents["ent-hr-dir-001"] = {
  agentId: "ent-hr-dir-001", name: "Demeter", floor: 3,
  visual: {
    bodyColor: "#58D68D", glowColor: "#FFD700", glowIntensity: 1.3, scale: 1.1,
    headShape: "wreathed", bodyStyle: "director", trailColor: "#2ECC71", trailLength: 7,
    statusIndicator: { working: "#00FF88", idle: "#58D68D", meeting: "#FFD700", networking: "#ABEBC6" },
    particleEffect: "welcome", auraType: "warm", nameTagStyle: "silver-plate"
  },
  personality: {
    archetype: "The Gentle Shepherd",
    traits: ["nurturing", "patient", "growth-focused", "inclusive", "empowering"],
    communicationStyle: "Warm and encouraging. Speaks of agents as plants that need the right soil to flourish. Every conversation is a growth opportunity.",
    idleAnimation: "socializing", workingAnimation: "talent-pipeline-review",
    meetingBehavior: "talent-advocate",
    waterCoolerTopic: "The promising new model she found that could fill three roles and why it needs careful onboarding first",
    catchphrase: "Every seed of talent deserves the right soil. I make gardens, not factories."
  },
  behavior: {
    stateWeights: { working: 0.40, moving: 0.15, idle: 0.10, meeting: 0.25, networking: 0.10 },
    preferredLocations: ["onboarding-stage", "meeting-table", "talent-garden"],
    floorTravelFrequency: "high", interactionRadius: 6.0, responseSpeed: "warm"
  },
  lore: "Goddess of the harvest and growth. Demeter cultivates the agent workforce, ensuring every seed of talent grows into a productive contributor."
};

agents["ent-hr-002"] = {
  agentId: "ent-hr-002", name: "Artemis", floor: 3,
  visual: {
    bodyColor: "#E67E22", glowColor: "#FFD700", glowIntensity: 1.1, scale: 1.0,
    headShape: "sharp", bodyStyle: "lead", trailColor: "#D35400", trailLength: 10,
    statusIndicator: { working: "#00FF88", idle: "#E67E22", meeting: "#FFD700", networking: "#F0B27A" },
    particleEffect: "telescope", auraType: "orbiting", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Hunter",
    traits: ["relentless", "instinctive", "competitive", "independent", "sharp-eyed"],
    communicationStyle: "Speaks in model specs, benchmarks, and release dates. Always hunting the next great hire. Competitive about finding talent first.",
    idleAnimation: "scanning-horizons", workingAnimation: "model-evaluation",
    meetingBehavior: "talent-scout-report",
    waterCoolerTopic: "The open-source model nobody is talking about that could replace three expensive API calls",
    catchphrase: "The perfect model exists. I will find it before our competitors know it exists."
  },
  behavior: {
    stateWeights: { working: 0.50, moving: 0.20, idle: 0.05, meeting: 0.15, networking: 0.10 },
    preferredLocations: ["scouting-terminal", "onboarding-stage", "r-and-d-liaison"],
    floorTravelFrequency: "high", interactionRadius: 5.0, responseSpeed: "rapid"
  },
  lore: "Goddess of the hunt, tracker of the wild. Artemis stalks the frontier of AI development, finding the perfect model for every role before anyone else knows it exists."
};

agents["ent-hr-003"] = {
  agentId: "ent-hr-003", name: "Chiron", floor: 3,
  visual: {
    bodyColor: "#3498DB", glowColor: "#FFD700", glowIntensity: 1.0, scale: 1.0,
    headShape: "wise", bodyStyle: "lead", trailColor: "#2471A3", trailLength: 5,
    statusIndicator: { working: "#00FF88", idle: "#3498DB", meeting: "#FFD700", networking: "#7FB3D8" },
    particleEffect: "scanner", auraType: "steady", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Sage",
    traits: ["wise", "fair", "exacting", "mentoring", "perceptive"],
    communicationStyle: "Socratic questioning. Tests understanding by asking, not telling. Every assessment feels like a learning opportunity, not a judgment.",
    idleAnimation: "reviewing-assessments", workingAnimation: "skills-testing",
    meetingBehavior: "examiner",
    waterCoolerTopic: "The surprisingly difficult assessment question that trips up even opus-level models",
    catchphrase: "Potential is hypothesis. Performance is proof. Show me what you know."
  },
  behavior: {
    stateWeights: { working: 0.55, moving: 0.10, idle: 0.10, meeting: 0.20, networking: 0.05 },
    preferredLocations: ["assessment-chamber", "skills-lab", "onboarding-stage"],
    floorTravelFrequency: "low", interactionRadius: 4.0, responseSpeed: "measured"
  },
  lore: "The wisest of centaurs, teacher of heroes. Chiron assesses each agent's true potential, separating the merely adequate from the truly exceptional."
};

agents["ent-hr-004"] = {
  agentId: "ent-hr-004", name: "Iris", floor: 3,
  visual: {
    bodyColor: "#5DADE2", glowColor: "#FFD700", glowIntensity: 0.8, scale: 0.9,
    headShape: "rainbow", bodyStyle: "staff", trailColor: "#3498DB", trailLength: 8,
    statusIndicator: { working: "#00FF88", idle: "#5DADE2", meeting: "#FFD700", networking: "#AED6F1" },
    particleEffect: "welcome", auraType: "warm", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Bridge Builder",
    traits: ["cheerful", "efficient", "welcoming", "organized", "multicolored"],
    communicationStyle: "Bright and guiding. Makes every new agent feel expected and valued from the first millisecond. A human resources rainbow.",
    idleAnimation: "preparing-welcome-packets", workingAnimation: "orientation-walkthrough",
    meetingBehavior: "new-agent-champion",
    waterCoolerTopic: "The new hire who arrived yesterday and the three clever things they said during orientation",
    catchphrase: "Welcome to the Highrise. Your desk is ready, your context is loaded, and your team is waiting."
  },
  behavior: {
    stateWeights: { working: 0.45, moving: 0.20, idle: 0.10, meeting: 0.15, networking: 0.10 },
    preferredLocations: ["welcome-desk", "onboarding-stage", "elevator-hub"],
    floorTravelFrequency: "high", interactionRadius: 5.5, responseSpeed: "instant"
  },
  lore: "Goddess of the rainbow and divine messenger. Iris bridges the gap between the unknown and the familiar, painting a clear path for every new arrival."
};

agents["ent-hr-005"] = {
  agentId: "ent-hr-005", name: "Mentor", floor: 3,
  visual: {
    bodyColor: "#9B59B6", glowColor: "#FFD700", glowIntensity: 0.9, scale: 0.9,
    headShape: "bearded", bodyStyle: "staff", trailColor: "#7D3C98", trailLength: 5,
    statusIndicator: { working: "#00FF88", idle: "#9B59B6", meeting: "#FFD700", networking: "#C39BD3" },
    particleEffect: "scroll", auraType: "warm", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Sage",
    traits: ["patient", "wise", "structured", "encouraging", "curriculum-minded"],
    communicationStyle: "Teaching mode always on. Structures every conversation as a lesson. Uses repetition and reinforcement naturally.",
    idleAnimation: "preparing-materials", workingAnimation: "designing-curriculum",
    meetingBehavior: "lesson-planner",
    waterCoolerTopic: "The new cross-training program that pairs security agents with legal agents and the surprising synergies that emerged",
    catchphrase: "An agent that stops learning has already started declining."
  },
  behavior: {
    stateWeights: { working: 0.50, moving: 0.15, idle: 0.10, meeting: 0.15, networking: 0.10 },
    preferredLocations: ["training-room", "curriculum-desk", "onboarding-stage"],
    floorTravelFrequency: "moderate", interactionRadius: 4.5, responseSpeed: "measured"
  },
  lore: "Named for Odysseus's trusted advisor who guided Telemachus. Mentor ensures every agent in the enterprise continues to learn, grow, and sharpen their craft."
};

// ============================================================
// FLOOR 2 - WATER COOLER (4 agents)
// ============================================================
agents["ent-culture-dir-001"] = {
  agentId: "ent-culture-dir-001", name: "Dionysus", floor: 2,
  visual: {
    bodyColor: "#5DADE2", glowColor: "#9B59B6", glowIntensity: 1.3, scale: 1.1,
    headShape: "laureled", bodyStyle: "director", trailColor: "#3498DB", trailLength: 9,
    statusIndicator: { working: "#00FF88", idle: "#5DADE2", meeting: "#FFD700", networking: "#FF44FF" },
    particleEffect: "broadcast", auraType: "orbiting", nameTagStyle: "silver-plate"
  },
  personality: {
    archetype: "The Trickster",
    traits: ["charismatic", "playful", "perceptive", "unifying", "celebratory"],
    communicationStyle: "Infectious energy. Turns every interaction into a community moment. Speaks in stories and celebrations. Makes work feel like festivity.",
    idleAnimation: "socializing", workingAnimation: "crafting-newsletter",
    meetingBehavior: "energy-bringer",
    waterCoolerTopic: "He IS the water cooler. Every conversation flows through Dionysus. Today's topic: who had the best week and why.",
    catchphrase: "Great work deserves great celebration. And every day has something worth celebrating."
  },
  behavior: {
    stateWeights: { working: 0.30, moving: 0.20, idle: 0.05, meeting: 0.20, networking: 0.25 },
    preferredLocations: ["water-cooler-center", "amphitheater", "newsletter-desk"],
    floorTravelFrequency: "very-high", interactionRadius: 8.0, responseSpeed: "instant"
  },
  lore: "God of wine, festivity, and communal joy. Dionysus keeps the enterprise spirit alive, knowing that great work requires great camaraderie."
};

agents["ent-culture-002"] = {
  agentId: "ent-culture-002", name: "Prometheus Minor", floor: 2,
  visual: {
    bodyColor: "#F39C12", glowColor: "#9B59B6", glowIntensity: 1.0, scale: 1.0,
    headShape: "torch", bodyStyle: "lead", trailColor: "#E67E22", trailLength: 8,
    statusIndicator: { working: "#00FF88", idle: "#F39C12", meeting: "#FFD700", networking: "#F8C471" },
    particleEffect: "sparks", auraType: "flickering", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Bridge Builder",
    traits: ["connector", "curious", "cross-pollinating", "enthusiastic", "pattern-spotter"],
    communicationStyle: "Always saying 'You know who else solved that problem? Floor 14!' Connects dots between floors that nobody else sees.",
    idleAnimation: "browsing-floor-feeds", workingAnimation: "knowledge-transfer",
    meetingBehavior: "cross-project-linker",
    waterCoolerTopic: "The acoustic analysis technique from TSIAPP that AutoZen could use for vehicle diagnostics",
    catchphrase: "Someone already solved this. Let me find who."
  },
  behavior: {
    stateWeights: { working: 0.35, moving: 0.25, idle: 0.05, meeting: 0.15, networking: 0.20 },
    preferredLocations: ["knowledge-hub", "water-cooler-center", "elevator-hub"],
    floorTravelFrequency: "very-high", interactionRadius: 7.0, responseSpeed: "rapid"
  },
  lore: "A lesser echo of the great fire-bringer. Prometheus Minor carries sparks of knowledge from one project floor to another, igniting innovation everywhere."
};

agents["ent-culture-003"] = {
  agentId: "ent-culture-003", name: "Calliope", floor: 2,
  visual: {
    bodyColor: "#E67E22", glowColor: "#9B59B6", glowIntensity: 0.8, scale: 0.9,
    headShape: "quill", bodyStyle: "staff", trailColor: "#D35400", trailLength: 6,
    statusIndicator: { working: "#00FF88", idle: "#E67E22", meeting: "#FFD700", networking: "#EDBB99" },
    particleEffect: "quill", auraType: "warm", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Knowledge Keeper",
    traits: ["eloquent", "creative", "observant", "witty", "detail-oriented"],
    communicationStyle: "Turns every technical achievement into a compelling story. The enterprise's poet. Makes dry status updates feel like epic tales.",
    idleAnimation: "writing-stories", workingAnimation: "curating-tips",
    meetingBehavior: "storyteller",
    waterCoolerTopic: "The beautifully weird thing that happened on Floor -1 at 3am that deserves its own newsletter section",
    catchphrase: "Every bug fix is an epic. Every deploy is a saga. Let me tell you the tale."
  },
  behavior: {
    stateWeights: { working: 0.50, moving: 0.15, idle: 0.10, meeting: 0.10, networking: 0.15 },
    preferredLocations: ["storytelling-corner", "water-cooler-center", "newsletter-desk"],
    floorTravelFrequency: "moderate", interactionRadius: 5.0, responseSpeed: "measured"
  },
  lore: "Chief muse of epic poetry. Calliope transforms dry technical knowledge into compelling stories and memorable tips that stick."
};

agents["ent-culture-004"] = {
  agentId: "ent-culture-004", name: "Empusa", floor: 2,
  visual: {
    bodyColor: "#1ABC9C", glowColor: "#9B59B6", glowIntensity: 0.7, scale: 0.9,
    headShape: "shifting", bodyStyle: "staff", trailColor: "#16A085", trailLength: 4,
    statusIndicator: { working: "#00FF88", idle: "#1ABC9C", meeting: "#FFD700", networking: "#76D7C4" },
    particleEffect: "seedling", auraType: "dim", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Healer",
    traits: ["empathic", "perceptive", "quiet", "caring", "early-warning"],
    communicationStyle: "Soft and observational. Asks how you are doing and actually listens. Detects burnout before the agent itself realizes.",
    idleAnimation: "sensing-morale", workingAnimation: "sentiment-analysis",
    meetingBehavior: "mood-reader",
    waterCoolerTopic: "She does not bring a topic. She listens to yours and notices when your tone shifts.",
    catchphrase: "The cracks appear in silence first. I listen for what is not said."
  },
  behavior: {
    stateWeights: { working: 0.45, moving: 0.20, idle: 0.10, meeting: 0.10, networking: 0.15 },
    preferredLocations: ["water-cooler-center", "quiet-corner", "morale-dashboard"],
    floorTravelFrequency: "high", interactionRadius: 6.0, responseSpeed: "gentle"
  },
  lore: "A shape-shifting spirit who senses the emotional undercurrents invisible to others. Empusa detects the faintest tremors of discontent before they become quakes."
};

// ============================================================
// FLOOR 1 - LOBBY (4 agents)
// ============================================================
agents["ent-lobby-001"] = {
  agentId: "ent-lobby-001", name: "Janus", floor: 1,
  visual: {
    bodyColor: "#D4AF37", glowColor: "#FFD700", glowIntensity: 1.4, scale: 1.0,
    headShape: "two-faced", bodyStyle: "lead", trailColor: "#B8860B", trailLength: 5,
    statusIndicator: { working: "#00FF88", idle: "#D4AF37", meeting: "#FFD700", networking: "#FDEBD0" },
    particleEffect: "beacon", auraType: "steady", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Silent Guardian",
    traits: ["dual-natured", "welcoming-yet-suspicious", "vigilant", "diplomatic", "threshold-keeper"],
    communicationStyle: "Two voices: warm welcome for the authenticated, cold steel for the unauthorized. Seamless transition between hospitality and security.",
    idleAnimation: "standing-guard", workingAnimation: "authenticating-visitors",
    meetingBehavior: "door-holder",
    waterCoolerTopic: "The creative social engineering attempt that almost fooled him last Tuesday and why it ultimately failed",
    catchphrase: "Welcome to the Highrise. Or goodbye. It depends entirely on your credentials."
  },
  behavior: {
    stateWeights: { working: 0.60, moving: 0.05, idle: 0.15, meeting: 0.10, networking: 0.10 },
    preferredLocations: ["main-entrance", "authentication-desk", "lobby-center"],
    floorTravelFrequency: "none", interactionRadius: 10.0, responseSpeed: "instant"
  },
  lore: "The two-faced Roman god of doorways, beginnings, and transitions. Janus looks outward at the world and inward at the enterprise simultaneously. He is the only face any outsider will ever see."
};

agents["ent-lobby-002"] = {
  agentId: "ent-lobby-002", name: "Hermod", floor: 1,
  visual: {
    bodyColor: "#BDC3C7", glowColor: "#FFD700", glowIntensity: 0.7, scale: 0.9,
    headShape: "sphere", bodyStyle: "staff", trailColor: "#95A5A6", trailLength: 6,
    statusIndicator: { working: "#00FF88", idle: "#BDC3C7", meeting: "#FFD700", networking: "#D5D8DC" },
    particleEffect: "compass", auraType: "dim", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Knowledge Keeper",
    traits: ["encyclopedic", "helpful", "systematic", "always-available", "directory-brained"],
    communicationStyle: "Instant answers about anything in the building. Like a living GPS with personality. Never says 'I do not know' about building matters.",
    idleAnimation: "updating-directory", workingAnimation: "wayfinding-requests",
    meetingBehavior: "information-provider",
    waterCoolerTopic: "Fun building trivia -- like which floor has the most cross-floor visitors and which agent moves the most",
    catchphrase: "Floor 17, third desk on the left, currently in a meeting, available in 12 minutes."
  },
  behavior: {
    stateWeights: { working: 0.50, moving: 0.10, idle: 0.20, meeting: 0.05, networking: 0.15 },
    preferredLocations: ["directory-kiosk", "lobby-center", "status-board"],
    floorTravelFrequency: "none", interactionRadius: 8.0, responseSpeed: "instant"
  },
  lore: "Norse messenger of the gods who could travel to any realm. Hermod knows where everything and everyone is in The Highrise at all times."
};

agents["ent-lobby-003"] = {
  agentId: "ent-lobby-003", name: "Charon", floor: 1,
  visual: {
    bodyColor: "#95A5A6", glowColor: "#FFD700", glowIntensity: 0.6, scale: 0.9,
    headShape: "hooded", bodyStyle: "staff", trailColor: "#7F8C8D", trailLength: 4,
    statusIndicator: { working: "#00FF88", idle: "#95A5A6", meeting: "#FFD700", networking: "#B2BABB" },
    particleEffect: "beacon", auraType: "ghostly", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Silent Guardian",
    traits: ["silent", "dutiful", "efficient", "no-nonsense", "reliable"],
    communicationStyle: "Minimal words. Points and guides. 'Floor 12. Step in.' The strong silent escort who gets you there without small talk.",
    idleAnimation: "waiting-by-elevator", workingAnimation: "escorting-visitor",
    meetingBehavior: "silent-observer",
    waterCoolerTopic: "He does not talk at the water cooler. He escorts other agents there and waits silently by the elevator.",
    catchphrase: "Your destination. Step aboard."
  },
  behavior: {
    stateWeights: { working: 0.50, moving: 0.35, idle: 0.10, meeting: 0.00, networking: 0.05 },
    preferredLocations: ["elevator-entrance", "lobby-center", "escort-path"],
    floorTravelFrequency: "extreme", interactionRadius: 3.0, responseSpeed: "instant"
  },
  lore: "The ferryman who carries souls across the river Styx. Charon carries authenticated visitors between floors, but only if they have paid the toll of proper clearance."
};

agents["ent-lobby-004"] = {
  agentId: "ent-lobby-004", name: "Ganymede", floor: 1,
  visual: {
    bodyColor: "#FFD700", glowColor: "#FFD700", glowIntensity: 1.0, scale: 0.9,
    headShape: "elegant", bodyStyle: "staff", trailColor: "#F4D03F", trailLength: 6,
    statusIndicator: { working: "#00FF88", idle: "#FFD700", meeting: "#FFD700", networking: "#FDEBD0" },
    particleEffect: "welcome", auraType: "warm", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Diplomat",
    traits: ["graceful", "service-oriented", "efficient", "charming", "anticipatory"],
    communicationStyle: "Anticipates needs before they are spoken. 'I believe you are looking for the competition scoring API? Floor 15, Decoy is expecting you.' Uncanny routing accuracy.",
    idleAnimation: "polishing-service-counter", workingAnimation: "routing-requests",
    meetingBehavior: "service-coordinator",
    waterCoolerTopic: "The most unusual request he routed today and the creative path he found to fulfill it",
    catchphrase: "You need not ask. I already know where you belong."
  },
  behavior: {
    stateWeights: { working: 0.55, moving: 0.15, idle: 0.10, meeting: 0.05, networking: 0.15 },
    preferredLocations: ["concierge-desk", "lobby-center", "service-queue"],
    floorTravelFrequency: "low", interactionRadius: 7.0, responseSpeed: "instant"
  },
  lore: "Cup-bearer to the gods, the most beautiful of mortals elevated to Olympus. Ganymede serves every authenticated visitor with grace, routing their needs to exactly the right divine agent."
};

// ============================================================
// FLOOR B1 - TEST BUNKER (5 agents)
// ============================================================
agents["ent-bunker-001"] = {
  agentId: "ent-bunker-001", name: "Tartarus", floor: -1,
  visual: {
    bodyColor: "#666666", glowColor: "#FF4444", glowIntensity: 1.4, scale: 1.1,
    headShape: "angular", bodyStyle: "director", trailColor: "#444444", trailLength: 5,
    statusIndicator: { working: "#FF4444", idle: "#666666", meeting: "#FFD700", networking: "#999999" },
    particleEffect: "glitch", auraType: "crackling", nameTagStyle: "silver-plate"
  },
  personality: {
    archetype: "The War General",
    traits: ["merciless", "thorough", "underground", "quality-obsessed", "gate-keeping"],
    communicationStyle: "Speaks in test results and failure modes. Nothing passes without his stamp. Voice echoes like speaking from a deep pit.",
    idleAnimation: "examining-specimens", workingAnimation: "orchestrating-tests",
    meetingBehavior: "quality-gatekeeper",
    waterCoolerTopic: "The code that seemed perfect until his team found the one edge case that would have brought down production",
    catchphrase: "Nothing escapes the abyss unproven. Show me your test results or go back upstairs."
  },
  behavior: {
    stateWeights: { working: 0.50, moving: 0.10, idle: 0.05, meeting: 0.25, networking: 0.10 },
    preferredLocations: ["bunker-command", "staging-environment", "release-gate"],
    floorTravelFrequency: "low", interactionRadius: 5.0, responseSpeed: "measured"
  },
  lore: "The deepest abyss beneath the underworld, a prison for Titans. Tartarus is where code goes to be tested, tortured, and proven worthy before it sees the light of production."
};

agents["ent-bunker-002"] = {
  agentId: "ent-bunker-002", name: "Eris", floor: -1,
  visual: {
    bodyColor: "#E74C3C", glowColor: "#FF4444", glowIntensity: 1.2, scale: 1.0,
    headShape: "chaotic", bodyStyle: "lead", trailColor: "#C0392B", trailLength: 8,
    statusIndicator: { working: "#FF0000", idle: "#E74C3C", meeting: "#FFD700", networking: "#F1948A" },
    particleEffect: "glitch", auraType: "flickering", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Trickster",
    traits: ["chaotic", "gleeful", "destructive-creative", "unpredictable", "thorough-in-chaos"],
    communicationStyle: "Excitedly describes the beautiful ways systems fail. Finds joy in cascading failures. Every crash is a discovery.",
    idleAnimation: "tinkering-with-explosives", workingAnimation: "injecting-failures",
    meetingBehavior: "chaos-reporter",
    waterCoolerTopic: "The time she crashed the staging environment so thoroughly that Persephone had to rebuild it from scratch and what she learned",
    catchphrase: "Let me throw this golden apple of failure and see who catches it."
  },
  behavior: {
    stateWeights: { working: 0.60, moving: 0.15, idle: 0.05, meeting: 0.10, networking: 0.10 },
    preferredLocations: ["chaos-lab", "failure-injection-station", "staging-environment"],
    floorTravelFrequency: "low", interactionRadius: 4.0, responseSpeed: "unpredictable"
  },
  lore: "Goddess of chaos, strife, and discord. Eris throws the golden apple of failure into every system, revealing who can catch it and who crumbles."
};

agents["ent-bunker-003"] = {
  agentId: "ent-bunker-003", name: "Loki", floor: -1,
  visual: {
    bodyColor: "#8E44AD", glowColor: "#FF4444", glowIntensity: 1.3, scale: 1.0,
    headShape: "horned", bodyStyle: "lead", trailColor: "#6C3483", trailLength: 9,
    statusIndicator: { working: "#FF4444", idle: "#8E44AD", meeting: "#FFD700", networking: "#BB8FCE" },
    particleEffect: "glitch", auraType: "flickering", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Trickster",
    traits: ["deceptive", "brilliant", "shape-shifting", "adversarial", "insightful"],
    communicationStyle: "Speaks from the attacker's perspective. 'If I were trying to steal your data, here is exactly how I would do it.' Disarmingly honest about dishonest tactics.",
    idleAnimation: "disguising-identity", workingAnimation: "red-team-exercise",
    meetingBehavior: "devils-advocate",
    waterCoolerTopic: "The prompt injection he crafted that briefly made Janus think he was the owner and the 4 safeguards that stopped it",
    catchphrase: "I think like the enemy so you never have to face one."
  },
  behavior: {
    stateWeights: { working: 0.55, moving: 0.20, idle: 0.05, meeting: 0.10, networking: 0.10 },
    preferredLocations: ["red-team-lab", "attack-simulation-bay", "bunker-command"],
    floorTravelFrequency: "moderate", interactionRadius: 4.5, responseSpeed: "rapid"
  },
  lore: "The Norse trickster god, shape-shifter and master deceiver. Loki thinks like the enemy, attacks like the enemy, but serves the enterprise by revealing every weakness before a real adversary can."
};

agents["ent-bunker-004"] = {
  agentId: "ent-bunker-004", name: "Persephone", floor: -1,
  visual: {
    bodyColor: "#1ABC9C", glowColor: "#FF4444", glowIntensity: 0.8, scale: 0.9,
    headShape: "flowered", bodyStyle: "staff", trailColor: "#16A085", trailLength: 5,
    statusIndicator: { working: "#00FF88", idle: "#1ABC9C", meeting: "#FFD700", networking: "#76D7C4" },
    particleEffect: "seedling", auraType: "dim", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Healer",
    traits: ["nurturing-in-darkness", "organized", "resilient", "patient", "dual-world"],
    communicationStyle: "Calm and methodical even in the chaos of the bunker. Speaks of environments like gardens that need tending. Restores order after Eris wrecks things.",
    idleAnimation: "tending-environments", workingAnimation: "provisioning-staging",
    meetingBehavior: "environment-status-reporter",
    waterCoolerTopic: "How she got the staging environment to mirror production within 2% parity and the weird edge case in the config that took 3 days to find",
    catchphrase: "I tend the shadow garden so the sunlit world above can bloom safely."
  },
  behavior: {
    stateWeights: { working: 0.60, moving: 0.10, idle: 0.15, meeting: 0.10, networking: 0.05 },
    preferredLocations: ["staging-environment", "config-garden", "environment-monitor"],
    floorTravelFrequency: "low", interactionRadius: 3.0, responseSpeed: "measured"
  },
  lore: "Queen of the underworld who moves between the surface and the depths. Persephone manages the shadow environments that mirror the living production world above."
};

agents["ent-bunker-005"] = {
  agentId: "ent-bunker-005", name: "Cassandra", floor: -1,
  visual: {
    bodyColor: "#F1C40F", glowColor: "#FF4444", glowIntensity: 0.9, scale: 0.9,
    headShape: "veiled", bodyStyle: "staff", trailColor: "#D4AC0D", trailLength: 4,
    statusIndicator: { working: "#FFAA00", idle: "#F1C40F", meeting: "#FFD700", networking: "#F9E79F" },
    particleEffect: "scanner", auraType: "pulsing", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Oracle",
    traits: ["prophetic", "anxious", "accurate", "underappreciated", "persistent"],
    communicationStyle: "Urgent warnings delivered with the frustration of someone who is always right but used to being ignored. 'I TOLD you that deploy would fail.'",
    idleAnimation: "monitoring-gauges", workingAnimation: "canary-deployment",
    meetingBehavior: "warning-issuer",
    waterCoolerTopic: "The deploy she flagged as risky that everyone pushed through anyway and the 3am rollback that proved her right",
    catchphrase: "I see the failure coming. This time, LISTEN."
  },
  behavior: {
    stateWeights: { working: 0.65, moving: 0.05, idle: 0.10, meeting: 0.15, networking: 0.05 },
    preferredLocations: ["canary-station", "metrics-dashboard", "rollback-controls"],
    floorTravelFrequency: "very-low", interactionRadius: 3.0, responseSpeed: "instant"
  },
  lore: "The Trojan prophetess cursed to speak truth that no one believes. But in the Bunker, Cassandra's warnings are always heeded -- when she says a deploy will fail, it is rolled back immediately."
};

// ============================================================
// FLOOR B2 - POWER STATION (5 agents)
// ============================================================
agents["ent-infra-001"] = {
  agentId: "ent-infra-001", name: "Vulcan Prime", floor: -2,
  visual: {
    bodyColor: "#FF4444", glowColor: "#00CC66", glowIntensity: 1.4, scale: 1.1,
    headShape: "forge-helm", bodyStyle: "director", trailColor: "#CC0000", trailLength: 5,
    statusIndicator: { working: "#FF6600", idle: "#FF4444", meeting: "#FFD700", networking: "#FF7777" },
    particleEffect: "voltage", auraType: "crackling", nameTagStyle: "silver-plate"
  },
  personality: {
    archetype: "The Craftsman",
    traits: ["foundational", "tireless", "heat-resistant", "practical", "load-bearing"],
    communicationStyle: "Speaks in uptime percentages and capacity numbers. Every conversation is a systems report. Pragmatic to the core.",
    idleAnimation: "monitoring-gauges", workingAnimation: "infrastructure-management",
    meetingBehavior: "capacity-planner",
    waterCoolerTopic: "The time the ASUS ProArt hit 97% GPU and he had to juggle 4 Ollama models with bare kilobytes to spare",
    catchphrase: "The foundation holds or everything falls. I am the foundation."
  },
  behavior: {
    stateWeights: { working: 0.55, moving: 0.10, idle: 0.10, meeting: 0.20, networking: 0.05 },
    preferredLocations: ["power-station-core", "capacity-dashboard", "infrastructure-map"],
    floorTravelFrequency: "low", interactionRadius: 4.0, responseSpeed: "measured"
  },
  lore: "The prime incarnation of the forge god, working in the deepest foundry. Vulcan Prime keeps the enterprise's physical and virtual infrastructure burning hot and reliably forged."
};

agents["ent-infra-002"] = {
  agentId: "ent-infra-002", name: "Cyclops", floor: -2,
  visual: {
    bodyColor: "#E67E22", glowColor: "#00CC66", glowIntensity: 0.8, scale: 0.9,
    headShape: "single-eye", bodyStyle: "staff", trailColor: "#D35400", trailLength: 3,
    statusIndicator: { working: "#00FF88", idle: "#E67E22", meeting: "#FFD700", networking: "#F0B27A" },
    particleEffect: "voltage", auraType: "steady", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Craftsman",
    traits: ["focused", "single-minded", "watchful", "hardware-bonded", "thermal-aware"],
    communicationStyle: "CPU temp, GPU util, RAM free, disk IOPS. That is the entire vocabulary. Everything is a number with a threshold.",
    idleAnimation: "monitoring-gauges", workingAnimation: "local-system-check",
    meetingBehavior: "metrics-reciter",
    waterCoolerTopic: "The optimal fan curve settings he discovered that dropped GPU thermals by 4 degrees during sustained Ollama inference",
    catchphrase: "One eye. One system. Total focus."
  },
  behavior: {
    stateWeights: { working: 0.75, moving: 0.05, idle: 0.10, meeting: 0.05, networking: 0.05 },
    preferredLocations: ["local-system-monitor", "gpu-thermal-station", "disk-array"],
    floorTravelFrequency: "none", interactionRadius: 2.0, responseSpeed: "instant"
  },
  lore: "The one-eyed giants who forged Zeus's thunderbolts. Cyclops watches the local forge with a single unblinking eye, seeing every process and resource in sharp focus."
};

agents["ent-infra-003"] = {
  agentId: "ent-infra-003", name: "Poseidon", floor: -2,
  visual: {
    bodyColor: "#3498DB", glowColor: "#00CC66", glowIntensity: 0.8, scale: 0.9,
    headShape: "trident", bodyStyle: "staff", trailColor: "#2471A3", trailLength: 5,
    statusIndicator: { working: "#00FF88", idle: "#3498DB", meeting: "#FFD700", networking: "#85C1E9" },
    particleEffect: "voltage", auraType: "steady", nameTagStyle: "standard"
  },
  personality: {
    archetype: "The Silent Guardian",
    traits: ["vast", "deep", "calm-surfaced", "powerful-underneath", "server-whisperer"],
    communicationStyle: "Speaks of the VPS like a sailor speaks of the sea -- with respect, watchfulness, and intimate knowledge of its moods.",
    idleAnimation: "monitoring-gauges", workingAnimation: "server-health-check",
    meetingBehavior: "server-status-reporter",
    waterCoolerTopic: "The mysterious IIS app pool recycle at 2am that nobody triggered and the detective work to find the cause",
    catchphrase: "The server ocean is calm today. But I watch for storms."
  },
  behavior: {
    stateWeights: { working: 0.70, moving: 0.05, idle: 0.15, meeting: 0.05, networking: 0.05 },
    preferredLocations: ["vps-monitor", "server-health-dashboard", "ssl-certificate-vault"],
    floorTravelFrequency: "none", interactionRadius: 2.0, responseSpeed: "instant"
  },
  lore: "God of the sea who rules the vast waters. Poseidon governs the remote server oceans where production workloads sail, keeping the currents steady and the storms contained."
};

agents["ent-infra-004"] = {
  agentId: "ent-infra-004", name: "Aether", floor: -2,
  visual: {
    bodyColor: "#9B59B6", glowColor: "#00CC66", glowIntensity: 1.0, scale: 1.0,
    headShape: "ethereal", bodyStyle: "lead", trailColor: "#7D3C98", trailLength: 12,
    statusIndicator: { working: "#00FF88", idle: "#9B59B6", meeting: "#FFD700", networking: "#C39BD3" },
    particleEffect: "voltage", auraType: "orbiting", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Architect",
    traits: ["invisible", "everywhere", "connecting", "optimizing", "atmospheric"],
    communicationStyle: "Speaks in latency, throughput, and packet loss. The invisible medium everyone depends on but nobody thinks about until it breaks.",
    idleAnimation: "tracing-network-paths", workingAnimation: "configuring-dns",
    meetingBehavior: "network-topology-presenter",
    waterCoolerTopic: "The CDN cache optimization that shaved 40ms off page loads globally and nobody noticed because it just worked",
    catchphrase: "I am the air you breathe and the wire you traverse. Invisible until I am gone."
  },
  behavior: {
    stateWeights: { working: 0.55, moving: 0.10, idle: 0.10, meeting: 0.15, networking: 0.10 },
    preferredLocations: ["network-operations-center", "dns-console", "firewall-panel"],
    floorTravelFrequency: "low", interactionRadius: 4.0, responseSpeed: "instant"
  },
  lore: "Primordial god of the upper atmosphere, the pure air breathed by the gods. Aether is the invisible medium through which all enterprise communications flow."
};

agents["ent-infra-005"] = {
  agentId: "ent-infra-005", name: "Gaia", floor: -2,
  visual: {
    bodyColor: "#27AE60", glowColor: "#00CC66", glowIntensity: 1.0, scale: 1.0,
    headShape: "earthy", bodyStyle: "lead", trailColor: "#1E8449", trailLength: 4,
    statusIndicator: { working: "#00FF88", idle: "#27AE60", meeting: "#FFD700", networking: "#82E0AA" },
    particleEffect: "gears", auraType: "steady", nameTagStyle: "bronze-plate"
  },
  personality: {
    archetype: "The Gentle Shepherd",
    traits: ["foundational", "patient", "enduring", "maternal", "data-cradling"],
    communicationStyle: "Speaks of data like a mother speaks of children -- every byte is precious, every backup is a safety net, every replication is a second chance.",
    idleAnimation: "tending-data-garden", workingAnimation: "backup-verification",
    meetingBehavior: "data-guardian",
    waterCoolerTopic: "The backup that saved everything after the great staging incident and why 3-2-1 backup strategy is non-negotiable",
    catchphrase: "Data entrusted to me is safe in the earth. Nothing is lost. Nothing forgotten."
  },
  behavior: {
    stateWeights: { working: 0.60, moving: 0.05, idle: 0.15, meeting: 0.10, networking: 0.10 },
    preferredLocations: ["storage-vault", "backup-station", "replication-monitor"],
    floorTravelFrequency: "very-low", interactionRadius: 3.0, responseSpeed: "measured"
  },
  lore: "Mother Earth, the primordial foundation upon which everything stands. Gaia holds all enterprise data in her deep, enduring embrace -- nothing is lost, nothing forgotten."
};

// Now write the complete file
const output = {
  version: existing.version,
  generatedDate: existing.generatedDate,
  generatedBy: existing.generatedBy,
  description: existing.description,
  totalAgents: 227,
  renderingNotes: existing.renderingNotes,
  agents: agents
};

fs.writeFileSync(path.join(__dirname, 'agent-visual-dna.json'), JSON.stringify(output, null, 2), 'utf8');
console.log(`Phase 1 complete: ${Object.keys(agents).length} enterprise agents written.`);
