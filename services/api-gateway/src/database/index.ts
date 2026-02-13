import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../flightdeck.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function initDatabase(): void {
  const database = getDb();

  // Create tables
  database.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Viewer',
      mfa_enabled INTEGER DEFAULT 0,
      mfa_secret TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login TEXT
    );

    -- Apps table
    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'development',
      description TEXT,
      github_repo TEXT,
      url TEXT,
      local_path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Metrics table
    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      metric_value REAL NOT NULL,
      tags TEXT DEFAULT '{}',
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (app_id) REFERENCES apps(id)
    );

    -- Alerts table
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT DEFAULT '{}',
      acknowledged INTEGER DEFAULT 0,
      acknowledged_by TEXT,
      acknowledged_at TEXT,
      resolved INTEGER DEFAULT 0,
      resolved_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (app_id) REFERENCES apps(id)
    );

    -- Permissions table
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      permission TEXT NOT NULL,
      granted_by TEXT,
      granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, permission)
    );

    -- Audit log table
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      action TEXT NOT NULL,
      app_id TEXT,
      details TEXT DEFAULT '{}',
      ip_address TEXT,
      user_agent TEXT,
      result TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Deployments table
    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      triggered_by TEXT,
      branch TEXT,
      commit_sha TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      progress INTEGER DEFAULT 0,
      logs TEXT,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (app_id) REFERENCES apps(id),
      FOREIGN KEY (triggered_by) REFERENCES users(id)
    );

    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_metrics_app_timestamp ON metrics(app_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_alerts_app ON alerts(app_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_deployments_app ON deployments(app_id);
  `);

  // Seed admin user if not exists
  const adminExists = database.prepare('SELECT id FROM users WHERE email = ?').get('kanati@translatorseries.com');

  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('TSI-Admin-2026!', 12);
    const adminId = uuidv4();

    database.prepare(`
      INSERT INTO users (id, email, password_hash, role, mfa_enabled)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminId, 'kanati@translatorseries.com', hashedPassword, 'SuperAdmin', 0);

    // Grant all permissions
    const permissions = [
      'alpha_flightdeck.full',
      'all_apps.full',
      'user_management.full',
      'billing.full',
      'audit_logs.full',
      'system_config.full',
      'deployment.full',
      'data_export.full'
    ];

    const insertPerm = database.prepare('INSERT INTO permissions (user_id, permission) VALUES (?, ?)');
    for (const perm of permissions) {
      insertPerm.run(adminId, perm);
    }

    console.log('Admin user created: kanati@translatorseries.com');
  }

  // Seed apps if not exists
  seedApps(database);
}

function seedApps(database: Database.Database): void {
  const appsExist = database.prepare('SELECT COUNT(*) as count FROM apps').get() as { count: number };

  if (appsExist.count === 0) {
    const apps = [
      { id: 'tsiapp', name: 'TSIAPP', icon: '🦆', priority: 'P0', status: 'production', description: 'Hunting call training platform', github_repo: 'TSIKanati/TSIAPP', url: 'https://www.translatorseries.com' },
      { id: 'clieair', name: 'CLIEAIR', icon: '🤖', priority: 'P1', status: 'production', description: 'Civil Liberties AI Investigation', github_repo: 'TSIKanati/CLIEAIR' },
      { id: 'charitypats', name: 'CharityPats', icon: '🐾', priority: 'P1', status: 'production', description: 'IP Protection Platform', github_repo: 'TSIKanati/CharityPats' },
      { id: 'guestofhonor', name: 'GuestOfHonor', icon: '🎩', priority: 'P1', status: 'production', description: 'Casino VIP Concierge', github_repo: 'TSIKanati/GuestofHonorandExtraordinaire' },
      { id: 'ideallearning', name: 'IdealLearning', icon: '📚', priority: 'P1', status: 'production', description: 'Lifelong Free Education', github_repo: 'TSIKanati/Ideallearning' },
      { id: 'autozen', name: 'AutoZen', icon: '🚗', priority: 'P1', status: 'production', description: 'Automotive AI Diagnostics' },
      { id: 'onthewayhome', name: 'OnTheWayHome', icon: '🏠', priority: 'P2', status: 'production', description: 'Community Volunteer Platform', github_repo: 'TSIKanati/OnTheWayHome' },
      { id: 'parlorgames', name: 'ParlorGames', icon: '🎲', priority: 'P2', status: 'production', description: 'AI Game Scoring Platform', github_repo: 'TSIKanati/ParlorGames' },
      { id: 'quantumledger', name: 'QuantumLedger', icon: '⚛️', priority: 'P2', status: 'production', description: 'AI Bookkeeping Platform', github_repo: 'TSIKanati/QuantumLedger' },
      { id: 'realworldprizes', name: 'RealWorldPrizes', icon: '🏆', priority: 'P2', status: 'production', description: 'Gaming Rewards Platform', github_repo: 'TSIKanati/RealWorldPrizes' },
      { id: 'machinistzen', name: 'MachinistZen', icon: '🔧', priority: 'P3', status: 'development', description: 'Machining Community Platform' },
      { id: 'translatorstitan', name: 'TranslatorsTitan', icon: '🚀', priority: 'P4', status: 'not_started', description: 'Reserved for future use' }
    ];

    const insertApp = database.prepare(`
      INSERT INTO apps (id, name, icon, priority, status, description, github_repo, url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const app of apps) {
      insertApp.run(app.id, app.name, app.icon, app.priority, app.status, app.description, app.github_repo || null, app.url || null);
    }

    console.log('Apps seeded');
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}
