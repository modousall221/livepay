# LivePay - Infrastructure de paiement pour le live commerce

## Overview
LivePay is a real-time payment infrastructure for live commerce in the UEMOA zone. It enables vendors on TikTok, Instagram, Facebook, and WhatsApp to generate instant invoices with secure payment links during live sessions.

## Architecture
- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect)
- **Routing**: wouter (frontend), Express (backend)
- **State Management**: TanStack React Query

## Key Features (MVP)
- Vendor authentication via Replit Auth
- Product catalog management (CRUD)
- Live session creation and management
- Instant invoice generation with secure token links
- Client-facing mobile-first payment page with countdown timer
- Real-time payment status tracking (paid/pending/expired)
- Dark mode support

## Project Structure
```
client/src/
  App.tsx              - Main app with auth routing
  components/
    app-sidebar.tsx    - Navigation sidebar
    theme-provider.tsx - Dark/light theme
    theme-toggle.tsx   - Theme toggle button
    ui/                - shadcn/ui components
  pages/
    landing.tsx        - Landing page (unauthenticated)
    dashboard.tsx      - Vendor dashboard
    products.tsx       - Product catalog
    sessions.tsx       - Live sessions list
    session-live.tsx   - Active session with invoice generation
    invoices.tsx       - All invoices list
    pay.tsx            - Client payment page (public)
  hooks/
    use-auth.ts        - Auth hook
    use-toast.ts       - Toast notifications
  lib/
    queryClient.ts     - TanStack Query config
    auth-utils.ts      - Auth utilities

server/
  index.ts            - Express server entry
  routes.ts           - API routes
  storage.ts          - Database storage layer
  db.ts               - Database connection
  replit_integrations/ - Auth module

shared/
  schema.ts           - Drizzle models (products, liveSessions, invoices)
  models/auth.ts      - Auth models (users, sessions)
```

## API Endpoints
- `GET /api/auth/user` - Current user
- `GET/POST /api/products` - Product CRUD
- `DELETE /api/products/:id` - Delete product
- `GET/POST /api/sessions` - Session CRUD
- `GET /api/sessions/:id` - Get session
- `PATCH /api/sessions/:id/end` - End session
- `GET/POST /api/invoices` - Invoice CRUD (query: ?sessionId=)
- `GET /api/pay/:token` - Public payment info
- `POST /api/pay/:token` - Process payment (simulated)

## Database Tables
- users (Replit Auth)
- sessions (Auth sessions)
- products (vendor catalog)
- live_sessions (live selling sessions)
- invoices (generated invoices with tokens)

## User Preferences
- French-language UI (target: francophone Africa)
- Dark mode default (for live nocturne)
- FCFA currency formatting
