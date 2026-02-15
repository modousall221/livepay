# LivePay MVP - Architecture Simplifiée

## Vision
Chatbot WhatsApp transactionnel pour le live commerce en Afrique francophone (zone UEMOA).

---

## 🎯 Fonctionnalités MVP Exactes

### Côté Client (Acheteur)
1. **Envoie mot-clé produit** (ex: "ROBE1") sur WhatsApp du vendeur
2. **Reçoit info produit** (prix, stock, description)
3. **Choisit quantité** (boutons interactifs)
4. **Confirme commande** → Réservation stock automatique
5. **Reçoit lien de paiement** (expire en 10 min)
6. **Paie via mobile money** (Wave, Orange Money) ou carte
7. **Reçoit confirmation** automatique après paiement

### Côté Vendeur (Dashboard)
1. **Toggle Mode Live ON/OFF** - Active/désactive le chatbot
2. **Gestion produits** - Nom, mot-clé, prix, stock
3. **Suivi commandes** - Statut (réservé, payé, expiré)
4. **Stats basiques** - Commandes du jour, revenu total
5. **Configuration** - Message bienvenue, durée réservation

---

## 📊 Modèle de Données Minimal

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     users       │    │ vendor_configs  │    │    products     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id              │◄───┤ vendorId        │    │ id              │
│ email           │    │ businessName    │    │ vendorId ────────┼─►users
│ firstName       │    │ waPhoneNumberId │    │ keyword (unique)│
│ lastName        │    │ waAccessToken   │    │ name            │
│ phone           │    │ liveMode        │    │ price           │
│ createdAt       │    │ reservationMins │    │ stock           │
└─────────────────┘    │ welcomeMessage  │    │ reservedStock   │
                       └─────────────────┘    │ active          │
                                              └─────────────────┘
                                                      │
                                                      ▼
                       ┌─────────────────────────────────────────┐
                       │              orders                      │
                       ├─────────────────────────────────────────┤
                       │ id              │ paymentToken (unique) │
                       │ vendorId        │ paymentUrl            │
                       │ productId       │ paymentMethod         │
                       │ clientPhone     │ pspReference          │
                       │ clientName      │ status (enum)         │
                       │ productName     │ reservedAt            │
                       │ quantity        │ expiresAt             │
                       │ unitPrice       │ paidAt                │
                       │ totalAmount     │ createdAt             │
                       └─────────────────────────────────────────┘
```

### Enums
- **order_status**: `pending` | `reserved` | `paid` | `expired` | `cancelled`
- **payment_method**: `wave` | `orange_money` | `card` | `cash`

---

## 🔄 Flux Transactionnel Détaillé

```
┌──────────────┐                ┌──────────────┐               ┌──────────────┐
│   Client     │                │   LivePay    │               │   Vendeur    │
│  (WhatsApp)  │                │   Chatbot    │               │  (Dashboard) │
└──────────────┘                └──────────────┘               └──────────────┘
       │                               │                              │
       │  1. Envoie "ROBE1"            │                              │
       │─────────────────────────────►│                              │
       │                               │  2. Vérifie:                 │
       │                               │     - Mode Live ON?          │
       │                               │     - Produit existe?        │
       │                               │     - Stock dispo?           │
       │                               │                              │
       │  3. "Produit: Robe Wax        │                              │
       │      Prix: 15,000 FCFA        │                              │
       │      Stock: 5                 │                              │
       │      Combien?"                │                              │
       │◄─────────────────────────────│                              │
       │                               │                              │
       │  4. Clique "2"                │                              │
       │─────────────────────────────►│                              │
       │                               │                              │
       │  5. "Récap: Robe x2           │                              │
       │      Total: 30,000 FCFA       │                              │
       │      Confirmer?"              │                              │
       │◄─────────────────────────────│                              │
       │                               │                              │
       │  6. Clique "Confirmer"        │                              │
       │─────────────────────────────►│                              │
       │                               │  7. RÉSERVE STOCK            │
       │                               │     (stock - 2)              │
       │                               │     Crée commande            │
       │                               │     status: "reserved"       │
       │                               │                              │
       │  8. "Commande créée!          │                              │
       │      10 min pour payer        │                              │
       │      👇 Cliquez ici"          │                              │
       │◄─────────────────────────────│                              │
       │                               │                              │
       │  9. Clique lien paiement      │                              │
       │─────────────────────────────►│                              │
       │                               │                              │
       │  10. Page paiement:           │                              │
       │      Wave / OM / Carte        │                              │
       │◄─────────────────────────────│                              │
       │                               │                              │
       │  11. Paie via Wave            │                              │
       │─────────────────────────────►│  ────────────────────────────┐
       │                               │                              │
       │                               │         PSP (Bictorys)       │
       │                               │  ◄───────Webhook─────────────┘
       │                               │                              │
       │                               │  12. CONFIRME STOCK          │
       │                               │      (stock réel - 2)        │
       │                               │      status: "paid"          │
       │                               │                              │
       │  13. "✅ Paiement confirmé!   │                              │
       │       Réf: #ABC123            │  14. Notification vendeur    │
       │       Merci!"                 │─────────────────────────────►│
       │◄─────────────────────────────│                              │
       │                               │                              │
       │                               │  ┌─────────────────────────┐ │
       │                               │  │ Si expiration 10 min:   │ │
       │                               │  │ - Libère stock réservé  │ │
       │                               │  │ - status: "expired"     │ │
       │                               │  └─────────────────────────┘ │
```

---

## 🏗️ Architecture Technique

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │Dashboard │  │ Products │  │  Orders  │  │ Settings │        │
│  │(+ Live   │  │(keyword, │  │(status,  │  │(profile, │        │
│  │ toggle)  │  │ stock)   │  │ payment) │  │ config)  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Pay Page (public)                      │   │
│  │    Wave  │  Orange Money  │  Carte  │  Cash               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express)                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   WhatsApp Service                        │   │
│  │  - processIncomingMessage()                               │   │
│  │  - handleProductKeyword()                                 │   │
│  │  - handleQuantitySelection()                              │   │
│  │  - confirmOrder() → réserve stock → crée commande         │   │
│  │  - notifyPaymentReceived()                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │  /api/orders   │  │ /api/products  │  │/api/vendor/*   │     │
│  │  /api/orders   │  │ CRUD + keyword │  │ config, live   │     │
│  │  /pay/:token   │  │ + stock        │  │ mode toggle    │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Cron Job (30s): Check Expired Orders         │   │
│  │              → Libère stock réservé si timeout            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │  WhatsApp API   │  │   Bictorys PSP  │
│   (Drizzle ORM) │  │  (Meta Cloud)   │  │   (Wave, OM)    │
│                 │  │                 │  │                 │
│ - users         │  │ - Webhooks      │  │ - /charges      │
│ - vendorConfigs │  │ - Send messages │  │ - Webhooks      │
│ - products      │  │ - Templates     │  │ - Checkout      │
│ - orders        │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 📁 Structure Fichiers Simplifiée

```
├── client/src/
│   ├── pages/
│   │   ├── dashboard.tsx    # Live toggle + stats + commandes
│   │   ├── products.tsx     # CRUD produits + keyword + stock
│   │   ├── orders.tsx       # Liste commandes + statuts
│   │   ├── settings.tsx     # Profil + config chatbot
│   │   ├── pay.tsx          # Page paiement public
│   │   ├── landing.tsx      # Page d'accueil
│   │   ├── login.tsx        
│   │   └── register.tsx     
│   └── components/
│       ├── app-sidebar.tsx  # Navigation (4 items)
│       └── ui/              # Composants shadcn
│
├── server/
│   ├── index.ts             # Entry + Cron job expiration
│   ├── routes.ts            # API routes
│   ├── storage.ts           # Database access (Drizzle)
│   ├── payment-providers.ts # Bictorys integration
│   └── whatsapp/
│       ├── service.ts       # Chatbot logic
│       ├── types.ts         # Types WhatsApp
│       └── templates.ts     # Message templates
│
└── shared/
    └── schema.ts            # Tables: users, vendorConfigs, products, orders
```

---

## ⏱️ Roadmap Développement (30-45 jours)

### Semaine 1-2: Core Backend
- [x] Schema base de données (users, products, orders, vendorConfigs)
- [x] API CRUD produits avec keyword + stock
- [x] API orders avec réservation/libération stock
- [x] API vendor config (live mode toggle)
- [x] Cron job expiration commandes

### Semaine 2-3: WhatsApp Integration
- [x] Service WhatsApp (processIncomingMessage)
- [x] Flux keyword → produit → quantité → commande
- [x] Réservation stock temps réel
- [x] Envoi lien paiement
- [ ] Templates WhatsApp approuvés (Meta Business)

### Semaine 3-4: Frontend Dashboard
- [x] Dashboard avec Live Mode toggle
- [x] Page produits avec keyword + stock
- [x] Page commandes avec statuts
- [x] Page paiement mobile

### Semaine 4-5: Paiement & Tests
- [x] Intégration Bictorys (Wave, OM)
- [x] Webhooks paiement → confirmation
- [ ] Tests E2E flux complet
- [ ] Déploiement production

---

## ✅ Conformité UEMOA

| Exigence | Solution |
|----------|----------|
| Pas de détention de fonds | Bictorys PSP = agrément BCEAO |
| KYC vendeurs | Onboarding via email/téléphone |
| Traçabilité | Orders avec références uniques |
| Protection données | PostgreSQL chiffré + HTTPS |

---

## 🔐 Variables d'Environnement

```env
# Database
DATABASE_URL=postgresql://...

# WhatsApp Business API (Meta)
WHATSAPP_PHONE_NUMBER_ID=xxx
WHATSAPP_ACCESS_TOKEN=xxx
WHATSAPP_APP_SECRET=xxx
WHATSAPP_VERIFY_TOKEN=livepay_webhook_verify

# Bictorys PSP
BICTORYS_PUBLIC_KEY=xxx
BICTORYS_SECRET_KEY=xxx

# App
APP_HOST=https://your-domain.com
SESSION_SECRET=xxx
```

---

## 📱 Flux Client Résumé

```
1. Client voit produit pendant live TikTok/Facebook/Instagram
2. Vendeur dit: "Envoyez ROBE1 sur mon WhatsApp pour commander"
3. Client envoie "ROBE1" sur WhatsApp du vendeur
4. Chatbot répond avec infos produit
5. Client choisit quantité
6. Chatbot crée commande + réserve stock
7. Client reçoit lien paiement (10 min limite)
8. Client paie via Wave/Orange Money
9. Confirmation automatique WhatsApp
10. Vendeur notifié, prépare commande
```

---

## 🚫 Fonctionnalités Exclues du MVP

- ❌ Marketplace multi-vendeurs publique
- ❌ Intégration native TikTok/Instagram
- ❌ Overlay live streaming
- ❌ Réseau social interne
- ❌ Scoring vendeurs/acheteurs
- ❌ Assurance livraison
- ❌ Analytics avancés
- ❌ Multi-canaux (Telegram, etc.)
- ❌ Gestion livraison/tracking
