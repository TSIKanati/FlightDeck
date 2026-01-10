// TSI FlightDeck Type Definitions

// ============================================================================
// App Types
// ============================================================================

export type AppStatus = 'production' | 'development' | 'maintenance' | 'offline' | 'not_started';
export type AppPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export interface App {
  id: string;
  name: string;
  icon: string;
  priority: AppPriority;
  status: AppStatus;
  githubRepo?: string;
  localPath?: string;
  description?: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppMetrics {
  appId: string;
  activeUsers: number;
  totalUsers: number;
  sessionsToday: number;
  revenue: number;
  uptime: number;
  errorRate: number;
  responseTime: number;
  customMetrics: Record<string, number>;
  timestamp: Date;
}

// ============================================================================
// User & Auth Types
// ============================================================================

export type UserRole = 'SuperAdmin' | 'Admin' | 'Manager' | 'Developer' | 'Analyst' | 'Viewer';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  mfaEnabled: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface AuthSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

// ============================================================================
// Alert Types
// ============================================================================

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface Alert {
  id: string;
  appId: string;
  severity: AlertSeverity;
  message: string;
  details?: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface MetricCard {
  title: string;
  value: string | number;
  change?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    period: string;
  };
  status?: 'healthy' | 'warning' | 'critical';
  icon?: string;
}

export interface ChartData {
  label: string;
  value: number;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface Widget {
  id: string;
  type: 'metric' | 'chart' | 'list' | 'status' | 'custom';
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
}

export interface DashboardConfig {
  userId: string;
  appId: string;
  widgets: Widget[];
  preferences: Record<string, unknown>;
  updatedAt: Date;
}

// ============================================================================
// Deployment Types
// ============================================================================

export type DeploymentStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface Deployment {
  id: string;
  appId: string;
  triggeredBy: string;
  branch: string;
  commitSha: string;
  status: DeploymentStatus;
  progress: number;
  logs: string[];
  startedAt: Date;
  completedAt?: Date;
}

// ============================================================================
// Resource Types
// ============================================================================

export interface ResourceUsage {
  cpu: number;
  memory: number;
  gpu: number;
  disk: number;
  network: {
    in: number;
    out: number;
  };
  timestamp: Date;
}

// ============================================================================
// GitHub Integration Types
// ============================================================================

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: Date;
  url: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  author: string;
  status: 'open' | 'closed' | 'merged';
  createdAt: Date;
  url: string;
}

export interface GitHubMetrics {
  commitsThisWeek: number;
  openPRs: number;
  openIssues: number;
  lastCommit?: Date;
  contributors: number;
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

export interface WSAppStatusChanged {
  type: 'app:status:changed';
  app: string;
  status: AppStatus;
}

export interface WSAppMetricsUpdated {
  type: 'app:metrics:updated';
  app: string;
  metrics: Partial<AppMetrics>;
}

export interface WSAlertNew {
  type: 'alert:new';
  alert: Alert;
}

export interface WSAlertAcknowledged {
  type: 'alert:acknowledged';
  alertId: string;
  userId: string;
}

export interface WSDeployProgress {
  type: 'deploy:progress';
  deployId: string;
  progress: number;
  status: DeploymentStatus;
}

export type WSEvent =
  | WSAppStatusChanged
  | WSAppMetricsUpdated
  | WSAlertNew
  | WSAlertAcknowledged
  | WSDeployProgress;

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// ============================================================================
// App-Specific Metric Types
// ============================================================================

export interface TSIAppMetrics extends AppMetrics {
  callsScored: number;
  medalsWon: { bronze: number; silver: number; gold: number };
  speciesBreakdown: Record<string, number>;
  fftLatency: number;
  pitchAccuracy: number;
  activeCompetitions: number;
  proGuideCount: number;
}

export interface CLIEAIRMetrics extends AppMetrics {
  activeCases: number;
  aiAnalyses: number;
  agentStatus: { total: number; active: number; categories: Record<string, number> };
  complianceScore: number;
  casesPipeline: { intake: number; review: number; active: number; closed: number };
}

export interface CharityPatsMetrics extends AppMetrics {
  ideasFiled: number;
  blockchainAnchored: number;
  patentsMatched: number;
  creatorRevenue: number;
  noveltyScores: { high: number; medium: number; low: number };
  fundingMatches: { pitches: number; vcConnections: number; funded: number };
}

export interface GuestOfHonorMetrics extends AppMetrics {
  vipGuests: number;
  activeGeofences: number;
  avgResponseTime: number;
  satisfactionScore: number;
  guestLocations: Record<string, number>;
  preferenceLearning: { profilesUpdated: number; accuracy: number };
}

export interface IdealLearningMetrics extends AppMetrics {
  totalLearners: number;
  coursesCompleted: number;
  xpAwarded: number;
  certificatesIssued: number;
  ageDistribution: Record<string, number>;
  seniorCare: { activeSeniors: number; musicSessions: number; declineAlerts: number };
}

export interface AutoZenMetrics extends AppMetrics {
  diagnosticsRun: number;
  vehiclesRegistered: number;
  partsFound: number;
  adRevenue: number;
  diagnosticTypes: Record<string, number>;
  aiConfidence: number;
}

export interface OnTheWayHomeMetrics extends AppMetrics {
  activeVolunteers: number;
  tasksToday: number;
  avgMatchTime: number;
  volunteerPoints: number;
  taskCategories: Record<string, number>;
  trustLevels: Record<string, number>;
}

export interface ParlorGamesMetrics extends AppMetrics {
  activeGames: number;
  scoresToday: number;
  aiAccuracy: number;
  subscribers: number;
  gameTypes: Record<string, number>;
  modelTraining: { jobs: number; gpuQueue: number };
}

export interface QuantumLedgerMetrics extends AppMetrics {
  accountsManaged: number;
  transactionsThisMonth: number;
  reconciledPercent: number;
  quickbooksSynced: boolean;
  aiCategorization: { auto: number; manual: number };
  documentsProcessed: { pdf: number; excel: number };
}

export interface RealWorldPrizesMetrics extends AppMetrics {
  prizesWon: number;
  prizeValue: number;
  activeCompetitions: number;
  prizeCategories: Record<string, { won: number; value: number }>;
  fulfillment: { pending: number; shipped: number; delivered: number };
}

// ============================================================================
// Audit Log Types
// ============================================================================

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  appId?: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure';
  timestamp: Date;
}
