# TSI FlightDeck

Enterprise Dashboard System for TSI Applications

## Overview

FlightDeck is a comprehensive dashboard ecosystem providing real-time visibility, control, and analytics across all TSI Enterprise applications.

### Features

- **Alpha FlightDeck**: Master command center with portfolio-wide visibility
- **12 Individual App FlightDecks**: Customized dashboards for each application
- **Real-time Updates**: WebSocket-based live data streaming
- **Role-Based Access Control**: Granular permissions per app
- **Cross-Project Analytics**: Unified metrics across the portfolio

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Navigate to FlightDeck directory
cd D:\2026TSIServer\FlightDeck

# Install dependencies
npm install

# Copy environment file
copy .env.example .env

# Start development servers
npm run dev
```

### Access

- **Alpha FlightDeck**: http://localhost:3000
- **API Gateway**: http://localhost:4000

### Login Credentials

```
Email: kanati@translatorseries.com
Password: TSI-Admin-2026!
Role: SuperAdmin
```

## Project Structure

```
FlightDeck/
├── apps/
│   └── alpha/              # Alpha FlightDeck (Next.js)
├── packages/
│   ├── ui/                 # Shared UI components
│   └── types/              # TypeScript types
├── services/
│   └── api-gateway/        # Backend API (Express + SQLite)
├── database/               # Database migrations
├── turbo.json              # Turborepo config
└── package.json            # Root package
```

## Apps Monitored

| App | Icon | Priority | Status |
|-----|------|----------|--------|
| TSIAPP | 🦆 | P0 | Production |
| CLIEAIR | 🤖 | P1 | Production |
| CharityPats | 🐾 | P1 | Production |
| GuestOfHonor | 🎩 | P1 | Production |
| IdealLearning | 📚 | P1 | Production |
| AutoZen | 🚗 | P1 | Production |
| OnTheWayHome | 🏠 | P2 | Production |
| ParlorGames | 🎲 | P2 | Production |
| QuantumLedger | ⚛️ | P2 | Production |
| RealWorldPrizes | 🏆 | P2 | Production |
| MachinistZen | 🔧 | P3 | Development |
| TranslatorsTitan | 🚀 | P4 | Not Started |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user
- `PUT /api/auth/password` - Change password

### Apps
- `GET /api/apps` - List all apps
- `GET /api/apps/:appId` - Get app details
- `PATCH /api/apps/:appId/status` - Update app status
- `GET /api/apps/:appId/metrics` - Get app metrics

### Alerts
- `GET /api/alerts` - List alerts
- `POST /api/alerts` - Create alert
- `PATCH /api/alerts/:alertId/acknowledge` - Acknowledge alert
- `DELETE /api/alerts/:alertId` - Delete alert

### Metrics
- `GET /api/metrics/overview` - Enterprise overview
- `GET /api/metrics/resources` - Resource usage
- `GET /api/metrics/analytics` - Analytics data

### Deployments
- `GET /api/deploy` - List deployments
- `POST /api/deploy` - Trigger deployment
- `GET /api/deploy/:deploymentId` - Get deployment status

## WebSocket Events

### Client → Server
- `subscribe:app` - Subscribe to app updates
- `unsubscribe:app` - Unsubscribe from app updates

### Server → Client
- `app:status:changed` - App status changed
- `app:metrics:updated` - App metrics updated
- `alert:new` - New alert created
- `resources:updated` - Resource metrics updated
- `deploy:progress` - Deployment progress

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Express.js, Socket.io, SQLite
- **Build**: Turborepo
- **Charts**: Recharts

## Development

```bash
# Run all services in development
npm run dev

# Build all packages
npm run build

# Run linting
npm run lint

# Run tests
npm run test
```

## License

Proprietary - TSIKanati Enterprise

---

**Version**: 1.0.0
**Created**: January 9, 2026
**Organization**: TSIKanati
