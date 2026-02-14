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
- **QR Codes**: qrcode library for dynamic QR generation

## Key Features
- Vendor authentication via Replit Auth
- Product catalog management (CRUD)
- Live session creation and management
- Instant invoice generation with secure token links
- QR code generation per invoice (inline preview, download, OBS overlay)
- WhatsApp share button (wa.me deep link with pre-filled message)
- Auto-copy payment link on invoice creation
- Open Graph meta tags for rich link previews on social media
- Client-facing mobile-first payment page with countdown timer
- Payment method selection (Wave, Orange Money, Card, Cash)
- Real-time payment status tracking (paid/pending/expired)
- Payment provider abstraction layer (ready for PSP integration)
- WhatsApp chatbot webhook skeleton (message parsing, keyword detection)
- Dark mode support

## Project Structure
```
client/src/
  App.tsx              - Main app with auth routing
  components/
    app-sidebar.tsx    - Navigation sidebar
    qr-code.tsx        - QR code display + inline QR components
    theme-provider.tsx - Dark/light theme
    theme-toggle.tsx   - Theme toggle button
    ui/                - shadcn/ui components
  pages/
    landing.tsx        - Landing page (unauthenticated)
    dashboard.tsx      - Vendor dashboard
    products.tsx       - Product catalog
    sessions.tsx       - Live sessions list
    session-live.tsx   - Active session with invoice generation, QR codes, WhatsApp share
    invoices.tsx       - All invoices list
    pay.tsx            - Client payment page with method selector (public)
    qr-overlay.tsx     - QR code overlay for OBS streaming (public)
  hooks/
    use-auth.ts        - Auth hook
    use-toast.ts       - Toast notifications
  lib/
    queryClient.ts     - TanStack Query config
    auth-utils.ts      - Auth utilities

server/
  index.ts             - Express server entry
  routes.ts            - API routes (including OG tags, WhatsApp webhook)
  storage.ts           - Database storage layer
  payment-providers.ts - Payment provider abstraction (Wave, Orange Money, Card, Cash)
  db.ts                - Database connection
  replit_integrations/  - Auth module

shared/
  schema.ts            - Drizzle models (products, liveSessions, invoices with paymentMethod)
  models/auth.ts       - Auth models (users, sessions)
```

## API Endpoints
- `GET /api/auth/user` - Current user
- `GET/POST /api/products` - Product CRUD
- `DELETE /api/products/:id` - Delete product
- `GET/POST /api/sessions` - Session CRUD
- `GET /api/sessions/:id` - Get session (vendor-scoped)
- `PATCH /api/sessions/:id/end` - End session
- `GET/POST /api/invoices` - Invoice CRUD (query: ?sessionId=)
- `GET /api/pay/:token` - Public payment info
- `POST /api/pay/:token` - Process payment with method selection
- `GET /api/payment-methods` - Available payment methods
- `GET /pay/:token` - Open Graph meta tags for crawlers
- `GET/POST /api/webhooks/whatsapp` - WhatsApp Business API webhook

## Database Tables
- users (Replit Auth)
- sessions (Auth sessions)
- products (vendor catalog)
- live_sessions (live selling sessions)
- invoices (with token, paymentMethod, paymentProviderRef)

## Public Routes (no auth)
- `/pay/:token` - Client payment page
- `/qr/:token` - QR code overlay for OBS

## User Preferences
- French-language UI (target: francophone Africa)
- Dark mode default (for live nocturne)
- FCFA currency formatting
