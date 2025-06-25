# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production with TypeScript compilation
- `npm run build:prod` - Production build with NODE_ENV=production
- `npm run preview` - Preview production build locally

### Testing

- `npm run test` - Run unit tests with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:e2e:ui` - Run E2E tests with Playwright UI
- `npm run test:e2e:debug` - Debug E2E tests
- Run single test: `npm run test:e2e -- --grep "test name" --project=chromium`

### Code Quality

- `npm run lint` - ESLint with TypeScript support
- `npm run format` - Format code with Prettier

### Production Operations

- `npm run logs:localhost` - View production logs
- `npm run stop:localhost` - Stop production containers

## Architecture Overview

This is a real-time collaborative whiteboard application built with React and Excalidraw, featuring live drawing synchronization via Socket.IO.

### Core Architecture Patterns

**Real-time Collaboration System**

- Socket.IO client (`src/services/socket.ts`) manages WebSocket connections with auto-reconnection
- Collaboration state managed through `src/components/collab/Collab.tsx` (main coordinator)
- Element synchronization follows Excalidraw's official patterns with proper reconciliation
- Encrypted data transmission using deterministic room keys

**Component Architecture**

- `App.tsx` - Main application coordinator, manages collaboration state and URL routing
- `Collab.tsx` - Hidden collaboration backend, handles socket events and data sync
- `CollabFooter.tsx`, `CollabMobileMenu.tsx` - UI components for collaboration controls
- All collaboration components use imperative handles for parent-child communication

**State Management Flow**

1. App.tsx coordinates overall collaboration state
2. Collab.tsx manages socket connections and data synchronization
3. Socket events trigger reconciliation of drawing elements
4. UI components receive state updates via callbacks

### Key Technical Patterns

**Element Synchronization**

- Uses `isSyncableElement()` to filter elements for network transmission
- Implements 24-hour deletion timeout for proper sync of deleted elements
- Element versioning prevents duplicate updates and sync loops
- Reconciliation follows Excalidraw's official `reconcileElements()` pattern

**Socket Management**

- Auto-detection of WebSocket URLs with fallback support
- Deterministic encryption keys generated from room IDs
- Socket ID-based user identification and cleanup
- Proper disconnect handling and collaborator removal

**URL-based Room Joining**

- Supports `?room=xxx&username=yyy` URL parameters for direct room access
- Automatic room joining when URL parameters are present
- URL cleanup after successful room join to prevent history pollution

## Key Files and Responsibilities

### Core Application

- `src/App.tsx` - Main app coordinator, handles collaboration state, URL routing, and component integration
- `src/main.tsx` - Application entry point with React 19 concurrent features

### Collaboration System

- `src/components/collab/Collab.tsx` - Main collaboration coordinator (hidden component)
- `src/services/socket.ts` - Socket.IO service with auto-reconnection and encryption
- `src/utils/element-sync.ts` - Element synchronization utilities and deletion timeout logic

### UI Components

- `src/components/collab/ShareDialog.tsx` - State-aware dialog for room management
- `src/components/collab/CollabFooter.tsx` - Desktop footer with room info and username
- `src/components/collab/RoomDisplay.tsx` - Compact room info component (🚪 Room ID 📋)

### Socket Communication

- Room management via `room-user-change` events for user tracking
- Encrypted scene updates via `client-broadcast` events
- Mouse location and username updates via `MOUSE_LOCATION` payloads

### Testing Strategy

- Unit tests with Vitest and React Testing Library (`tests/unit/`)
- E2E tests with Playwright covering collaboration scenarios (`tests/e2e/`)
- Performance tests for drawing and synchronization (`tests/performance/`)
- Screenshot-based visual testing for UI verification

## Configuration Notes

**Environment Variables**

- `VITE_WEBSOCKET_SERVER_URL` - WebSocket server URL (auto-detected if not set)
- Runtime environment injection via `/env.js` for containerized deployments

**Development Setup**

- Vite dev server typically runs on port 3000-3003 (auto-port detection)
- WebSocket server expected on port 3002
- Playwright tests configured to use http://localhost:3000

**Production Deployment**

- Docker-based deployment with Nginx reverse proxy
- Production builds use Terser for optimization
- Self-hosted collaboration server (excalidraw-room)
