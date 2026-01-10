import { create } from 'zustand';

export interface AppData {
  id: string;
  name: string;
  icon: string;
  priority: string;
  status: 'production' | 'development' | 'maintenance' | 'offline' | 'not_started';
  description: string;
  githubRepo?: string;
  url?: string;
  metrics: {
    users: number;
    sessionsToday: number;
    revenue: number;
    uptime: number;
    errorRate: number;
    customMetrics: Record<string, number>;
  };
}

export interface Alert {
  id: string;
  appId: string;
  appName: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  acknowledged: boolean;
  createdAt: Date;
}

interface AppsState {
  apps: AppData[];
  alerts: Alert[];
  selectedAppId: string | null;
  setSelectedApp: (appId: string | null) => void;
  acknowledgeAlert: (alertId: string) => void;
  dismissAlert: (alertId: string) => void;
}

// Initial app data based on the TSI enterprise
const initialApps: AppData[] = [
  {
    id: 'tsiapp',
    name: 'TSIAPP',
    icon: '🦆',
    priority: 'P0',
    status: 'production',
    description: 'Hunting call training platform',
    githubRepo: 'TSIKanati/TSIAPP',
    url: 'https://www.translatorseries.com',
    metrics: {
      users: 1247,
      sessionsToday: 3892,
      revenue: 12500,
      uptime: 99.94,
      errorRate: 0.12,
      customMetrics: {
        callsScored: 127845,
        medalsWon: 45632
      }
    }
  },
  {
    id: 'clieair',
    name: 'CLIEAIR',
    icon: '🤖',
    priority: 'P1',
    status: 'production',
    description: 'Civil Liberties AI Investigation',
    githubRepo: 'TSIKanati/CLIEAIR',
    metrics: {
      users: 342,
      sessionsToday: 892,
      revenue: 8900,
      uptime: 99.87,
      errorRate: 0.08,
      customMetrics: {
        activeCases: 342,
        aiAnalyses: 8947
      }
    }
  },
  {
    id: 'charitypats',
    name: 'CharityPats',
    icon: '🐾',
    priority: 'P1',
    status: 'production',
    description: 'IP Protection Platform',
    githubRepo: 'TSIKanati/CharityPats',
    metrics: {
      users: 567,
      sessionsToday: 1234,
      revenue: 5600,
      uptime: 99.92,
      errorRate: 0.15,
      customMetrics: {
        ideasFiled: 2847,
        creatorRevenue: 127400
      }
    }
  },
  {
    id: 'guestofhonor',
    name: 'GuestOfHonor',
    icon: '🎩',
    priority: 'P1',
    status: 'production',
    description: 'Casino VIP Concierge',
    githubRepo: 'TSIKanati/GuestofHonorandExtraordinaire',
    metrics: {
      users: 1892,
      sessionsToday: 4567,
      revenue: 23400,
      uptime: 99.99,
      errorRate: 0.02,
      customMetrics: {
        vipGuests: 1892,
        avgResponseTime: 18
      }
    }
  },
  {
    id: 'ideallearning',
    name: 'IdealLearning',
    icon: '📚',
    priority: 'P1',
    status: 'production',
    description: 'Lifelong Free Education',
    githubRepo: 'TSIKanati/Ideallearning',
    metrics: {
      users: 45892,
      sessionsToday: 12456,
      revenue: 0,
      uptime: 99.91,
      errorRate: 0.18,
      customMetrics: {
        coursesCompleted: 127845,
        certificatesIssued: 2347
      }
    }
  },
  {
    id: 'autozen',
    name: 'AutoZen',
    icon: '🚗',
    priority: 'P1',
    status: 'production',
    description: 'Automotive AI Diagnostics',
    metrics: {
      users: 8234,
      sessionsToday: 5678,
      revenue: 23400,
      uptime: 99.88,
      errorRate: 0.22,
      customMetrics: {
        diagnosticsRun: 12847,
        partsFound: 45892
      }
    }
  },
  {
    id: 'onthewayhome',
    name: 'OnTheWayHome',
    icon: '🏠',
    priority: 'P2',
    status: 'production',
    description: 'Community Volunteer Platform',
    githubRepo: 'TSIKanati/OnTheWayHome',
    metrics: {
      users: 3456,
      sessionsToday: 892,
      revenue: 1200,
      uptime: 99.85,
      errorRate: 0.25,
      customMetrics: {
        activeVolunteers: 3456,
        tasksCompleted: 892
      }
    }
  },
  {
    id: 'parlorgames',
    name: 'ParlorGames',
    icon: '🎲',
    priority: 'P2',
    status: 'production',
    description: 'AI Game Scoring Platform',
    githubRepo: 'TSIKanati/ParlorGames',
    metrics: {
      users: 2345,
      sessionsToday: 567,
      revenue: 4500,
      uptime: 99.78,
      errorRate: 0.35,
      customMetrics: {
        activeGames: 567,
        aiAccuracy: 98.7
      }
    }
  },
  {
    id: 'quantumledger',
    name: 'QuantumLedger',
    icon: '⚛️',
    priority: 'P2',
    status: 'production',
    description: 'AI Bookkeeping Platform',
    githubRepo: 'TSIKanati/QuantumLedger',
    metrics: {
      users: 892,
      sessionsToday: 234,
      revenue: 8900,
      uptime: 99.95,
      errorRate: 0.05,
      customMetrics: {
        accountsManaged: 892,
        transactionsProcessed: 234567
      }
    }
  },
  {
    id: 'realworldprizes',
    name: 'RealWorldPrizes',
    icon: '🏆',
    priority: 'P2',
    status: 'production',
    description: 'Gaming Rewards Platform',
    githubRepo: 'TSIKanati/RealWorldPrizes',
    metrics: {
      users: 8456,
      sessionsToday: 2345,
      revenue: 12300,
      uptime: 99.82,
      errorRate: 0.28,
      customMetrics: {
        prizesWon: 567,
        prizeValue: 45200
      }
    }
  },
  {
    id: 'machinistzen',
    name: 'MachinistZen',
    icon: '🔧',
    priority: 'P3',
    status: 'development',
    description: 'Machining Community Platform',
    metrics: {
      users: 1234,
      sessionsToday: 345,
      revenue: 0,
      uptime: 95.5,
      errorRate: 2.5,
      customMetrics: {
        forumPosts: 4567,
        toolsListed: 5678
      }
    }
  },
  {
    id: 'translatorstitan',
    name: 'TranslatorsTitan',
    icon: '🚀',
    priority: 'P4',
    status: 'not_started',
    description: 'Reserved for future use',
    metrics: {
      users: 0,
      sessionsToday: 0,
      revenue: 0,
      uptime: 0,
      errorRate: 0,
      customMetrics: {}
    }
  }
];

const initialAlerts: Alert[] = [
  {
    id: '1',
    appId: 'clieair',
    appName: 'CLIEAIR',
    severity: 'warning',
    message: 'API rate limit approaching 85%',
    acknowledged: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15)
  },
  {
    id: '2',
    appId: 'parlorgames',
    appName: 'ParlorGames',
    severity: 'warning',
    message: 'GPU training queue backed up (3 jobs waiting)',
    acknowledged: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45)
  },
  {
    id: '3',
    appId: 'system',
    appName: 'System',
    severity: 'info',
    message: 'All deployments completed successfully',
    acknowledged: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60)
  },
  {
    id: '4',
    appId: 'system',
    appName: 'System',
    severity: 'info',
    message: 'Weekly analytics report is ready for review',
    acknowledged: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 120)
  }
];

export const useAppsStore = create<AppsState>((set) => ({
  apps: initialApps,
  alerts: initialAlerts,
  selectedAppId: null,

  setSelectedApp: (appId) => set({ selectedAppId: appId }),

  acknowledgeAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    })),

  dismissAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== alertId)
    }))
}));
