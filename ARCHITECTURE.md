# Compliance-Connect Architecture Documentation

> **Version**: 1.0
> **Last Updated**: January 2026
> **Platform**: B2B SaaS for Compliance Testing Services

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [System Architecture Overview](#system-architecture-overview)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Schema](#database-schema)
7. [Key Features & User Flows](#key-features--user-flows)
8. [External Integrations](#external-integrations)
9. [Security Architecture](#security-architecture)
10. [Deployment & Infrastructure](#deployment--infrastructure)

---

## Executive Summary

**Compliance-Connect** is a modern B2B SaaS platform that connects businesses with certified compliance testing engineers. The platform enables customers to book compliance testing services (PAT testing, fire safety, electrical inspections), while engineers can manage their availability and complete assigned jobs.

### Core User Roles

| Role | Description |
|------|-------------|
| **Customer** | Books compliance tests, manages sites/locations, tracks bookings |
| **Engineer** | Accepts jobs, records test results, manages availability |
| **Admin** | Oversees platform, manages users, approves engineers, configures services |

### Key Value Propositions

- **Smart Dynamic Pricing**: Automatic discounts based on geographic proximity and scheduling
- **Automated Engineer Matching**: Assigns engineers based on coverage areas and competencies
- **Calendar Integration**: Syncs with Google/Apple/Outlook for availability management
- **Mobile-First for Engineers**: Optimized for field work on mobile devices

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.5 | React framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type-safe JavaScript |
| Tailwind CSS | 4.x | Utility-first styling |
| Radix UI + shadcn/ui | Latest | Component library |
| React Hook Form | 7.71.1 | Form management |
| Zod | 4.3.6 | Schema validation |
| Framer Motion | 12.29.2 | Animations |
| Lucide React | 0.560+ | Icons |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js Server Actions | - | Server-side mutations |
| Prisma ORM | 7.3.0 | Database ORM |
| PostgreSQL | 15+ | Database (via Supabase) |
| Clerk | 6.36.10 | Authentication & user management |
| Svix | 1.84.1 | Webhook signature verification |

### Infrastructure

| Service | Purpose |
|---------|---------|
| Supabase | PostgreSQL database hosting |
| Clerk | Authentication provider |
| Vercel | Deployment platform (recommended) |

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  Customer   │  │  Engineer   │  │   Admin     │                 │
│  │  Dashboard  │  │  Dashboard  │  │  Dashboard  │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          ▼                                          │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              Next.js App Router (React 19)                     │ │
│  │  • Server Components  • Client Components  • Server Actions    │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │  Server Actions │  │   API Routes    │  │    Middleware       │ │
│  │  /lib/actions/  │  │     /api/       │  │   (Auth + RBAC)     │ │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘ │
│           │                    │                      │             │
│           └────────────────────┼──────────────────────┘             │
│                                ▼                                    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    Business Logic Layer                        │ │
│  │  • Pricing Engine  • Auth Service  • Validation Schemas       │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐       ┌─────────────────────────────────────┐ │
│  │   Prisma ORM    │◄─────►│         PostgreSQL (Supabase)       │ │
│  └─────────────────┘       └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │
│  │   Clerk     │  │  Calendar   │  │     Email Service           │ │
│  │  (Auth)     │  │   APIs      │  │   (Certificates)            │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication pages
│   │   ├── sign-in/              # Clerk sign-in
│   │   ├── sign-up/              # Clerk sign-up
│   │   └── engineer/             # Engineer auth redirects
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── dashboard/            # Customer dashboard
│   │   ├── bookings/             # Booking management
│   │   ├── sites/                # Site management
│   │   ├── engineer/             # Engineer portal
│   │   └── admin/                # Admin portal
│   ├── api/                      # API routes
│   └── page.tsx                  # Landing page
├── components/                   # Reusable components
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Layout components
│   ├── shared/                   # Shared business components
│   ├── booking/                  # Booking-related components
│   ├── engineer/                 # Engineer-specific components
│   └── admin/                    # Admin-specific components
├── lib/                          # Utilities & business logic
│   ├── actions/                  # Server actions
│   ├── validations/              # Zod schemas
│   ├── auth.ts                   # Auth utilities
│   ├── db.ts                     # Database client
│   └── pricing.ts                # Pricing engine
└── types/                        # TypeScript definitions
```

### Route Structure

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Landing page with service catalog |
| `/sign-in` | Public | User authentication |
| `/sign-up` | Public | User registration |
| `/dashboard` | Customer | Customer overview dashboard |
| `/bookings` | Customer | Manage bookings |
| `/bookings/new` | Customer | Multi-step booking wizard |
| `/bookings/[id]` | Customer | Booking details |
| `/sites` | Customer | Manage locations |
| `/engineer` | Engineer | Engineer dashboard |
| `/engineer/jobs` | Engineer | Job list & management |
| `/engineer/jobs/[id]` | Engineer | Job execution & testing |
| `/engineer/onboarding` | Engineer | Profile setup wizard |
| `/admin` | Admin | Admin dashboard |
| `/admin/bookings` | Admin | All bookings oversight |
| `/admin/engineers` | Admin | User & engineer management |
| `/admin/services` | Admin | Service configuration |

### Component Architecture

```
Component Hierarchy:

RootLayout
└── ClerkProvider (Auth Context)
    └── DashboardLayout
        ├── Sidebar (Desktop)
        │   ├── Logo
        │   ├── Navigation Links
        │   └── User Menu
        ├── Mobile Header
        │   └── Sheet Menu
        └── Main Content Area
            ├── PageHeader
            └── Page-specific content
```

### State Management

| Concern | Solution |
|---------|----------|
| Server State | Server Components + Server Actions |
| Form State | React Hook Form |
| UI State | React useState/useReducer |
| Auth State | Clerk (ClerkProvider) |
| Toast Notifications | Sonner |

### Styling System

- **Framework**: Tailwind CSS 4 with PostCSS
- **Color System**: OKLch color space with CSS custom properties
- **Primary Color**: Electric Blue (`oklch(0.55 0.22 255)`)
- **Accent Color**: Amber/Orange (`oklch(0.8 0.16 75)`)
- **Dark Mode**: Supported via CSS custom properties
- **Typography**: Inter font family
- **Responsive**: Mobile-first with tablet/desktop breakpoints

---

## Backend Architecture

### Server Actions

All data mutations are handled via Next.js Server Actions:

| File | Actions |
|------|---------|
| `bookings.ts` | `createBooking`, `updateBooking`, `cancelBooking`, `getDateRangeDiscounts` |
| `engineer.ts` | `createEngineerProfile`, `updateAvailability`, `getAvailableJobs`, `completeJob` |
| `sites.ts` | `getUserSites`, `createSite`, `updateSite` |
| `services.ts` | `getServices` |
| `users.ts` | `getAllUsers`, `updateUserRole`, `getAllEngineerProfiles` |
| `assets.ts` | `addAsset`, `updateAsset` |

### API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/ticket` | GET | Engineer SSO ticket verification |
| `/api/webhooks/clerk` | POST | Clerk webhook handler (user sync) |
| `/api/admin/setup-engineers` | POST | Engineer auto-allocation setup |

### Pricing Engine

The smart pricing engine calculates dynamic discounts based on:

| Discount | Condition |
|----------|-----------|
| **50%** | Same location, same day as existing booking |
| **25%** | Same postcode area, same day OR within 20-min drive |
| **10%** | Adjacent day with nearby booking OR same postcode nearby |

**Algorithm**:
1. Calculate base price: `service.basePrice × quantity` (min: `service.minCharge`)
2. Query existing bookings for proximity/date matches
3. Calculate Haversine distance for geographic proximity
4. Apply highest applicable discount tier
5. Return: original price, discount %, final price, discount reason

### Authentication Flow

```
┌────────────┐      ┌──────────┐      ┌──────────────┐
│   Client   │─────►│  Clerk   │─────►│  Middleware  │
└────────────┘      └──────────┘      └──────────────┘
                          │                   │
                          ▼                   ▼
                    ┌──────────┐      ┌──────────────┐
                    │ Webhook  │─────►│   Database   │
                    │  Sync    │      │  (User sync) │
                    └──────────┘      └──────────────┘
```

1. User authenticates via Clerk (email/password or OAuth)
2. Clerk issues JWT session token
3. Middleware validates token on protected routes
4. Clerk webhook syncs user data to PostgreSQL
5. Role-based access control enforced at route/action level

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────────┐       ┌─────────────┐
│    User     │───┬───│   EngineerProfile   │───────│Qualification│
└─────────────┘   │   └─────────────────────┘       └─────────────┘
      │           │             │
      │           │             ├───────────────────┐
      │           │             │                   │
      ▼           │             ▼                   ▼
┌─────────────┐   │   ┌─────────────────┐   ┌─────────────┐
│    Site     │   │   │   Competency    │   │CoverageArea │
└─────────────┘   │   └─────────────────┘   └─────────────┘
      │           │             │
      │           │             │
      ▼           │             ▼
┌─────────────┐   │   ┌─────────────────┐
│   Booking   │◄──┴───│    Service      │
└─────────────┘       └─────────────────┘
      │
      ▼
┌─────────────┐
│    Asset    │
└─────────────┘
```

### Core Models

#### User
```
User
├── id: String (CUID)
├── clerkId: String (unique)
├── name: String
├── email: String
├── phone: String?
├── company: String?
├── role: CUSTOMER | ENGINEER | ADMIN
├── avatarUrl: String?
├── createdAt: DateTime
└── updatedAt: DateTime
```

#### Booking
```
Booking
├── id: String (CUID)
├── reference: String (unique, e.g., "CC-ABC123")
├── customerId: String → User
├── siteId: String → Site
├── serviceId: String → Service
├── engineerId: String? → User
├── status: PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED
├── scheduledDate: DateTime
├── slot: AM | PM | FULL_DAY
├── estimatedQty: Int
├── quotedPrice: Decimal
├── originalPrice: Decimal
├── discountPercent: Decimal
├── startedAt: DateTime?
├── completedAt: DateTime?
├── certificateUrl: String?
└── notes: String?
```

#### EngineerProfile
```
EngineerProfile
├── id: String (CUID)
├── userId: String (unique) → User
├── status: PENDING_APPROVAL | APPROVED | SUSPENDED | REJECTED
├── yearsExperience: Int?
├── bio: String?
├── dayRate: Decimal?
├── qualifications: EngineerQualification[]
├── competencies: EngineerCompetency[]
├── coverageAreas: EngineerCoverageArea[]
└── availability: EngineerAvailability[]
```

#### Service
```
Service
├── id: String (CUID)
├── name: String
├── description: String
├── basePrice: Decimal
├── minCharge: Decimal
├── unitName: String (e.g., "appliance", "extinguisher")
├── baseMinutes: Int
├── minutesPerUnit: Int
├── icon: String
└── isActive: Boolean
```

---

## Key Features & User Flows

### Customer Booking Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOOKING WIZARD (5 Steps)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: SERVICE SELECTION                                       │
│  ├── Display 15+ compliance services                            │
│  ├── Show base pricing per service                              │
│  └── Select service → Next                                       │
│                                                                  │
│  Step 2: SITE SELECTION                                          │
│  ├── Display customer's registered sites                        │
│  ├── Option to create new site                                  │
│  └── Select site → Next                                          │
│                                                                  │
│  Step 3: QUANTITY                                                │
│  ├── Enter estimated quantity (items to test)                   │
│  ├── Show price calculation preview                             │
│  └── Confirm quantity → Next                                     │
│                                                                  │
│  Step 4: SCHEDULE                                                │
│  ├── Interactive calendar with discount indicators              │
│  ├── Time slot selection (AM/PM/Full Day)                       │
│  ├── Real-time price with discount breakdown                    │
│  └── Select date/time → Next                                     │
│                                                                  │
│  Step 5: REVIEW & CONFIRM                                        │
│  ├── Summary of all selections                                  │
│  ├── Final pricing with discounts applied                       │
│  └── Confirm → Create Booking                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Engineer Job Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     JOB EXECUTION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. VIEW ASSIGNED JOBS                                           │
│     └── Jobs dashboard filtered by engineer                     │
│                                                                  │
│  2. NAVIGATE TO JOB                                              │
│     └── View site address, access notes, customer info          │
│                                                                  │
│  3. START JOB                                                    │
│     └── Status: CONFIRMED → IN_PROGRESS                         │
│                                                                  │
│  4. TEST ASSETS                                                  │
│     ├── Add asset (name, location, tag)                         │
│     ├── Record result (PASS / FAIL / N/A)                       │
│     ├── Add notes, capture photos                               │
│     └── Repeat for all items                                     │
│                                                                  │
│  5. COMPLETE JOB                                                 │
│     ├── Review all test results                                 │
│     ├── Add final notes                                         │
│     └── Submit → Status: COMPLETED                              │
│                                                                  │
│  6. CERTIFICATE GENERATION                                       │
│     └── Auto-generate PDF certificate with test results         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Available Services

| Category | Services |
|----------|----------|
| **Electrical Testing** | PAT Testing, Fixed Wire Testing (EICR), Arc Flash Assessment |
| **Fire Safety** | Fire Alarm Testing, Emergency Lighting, Fire Extinguisher Servicing, Fire Risk Assessment |
| **Specialist Testing** | Thermographic Survey, Control Panel Inspection, PV Array Testing |
| **Health & Safety** | Legionella Risk Assessment, DSE Assessment, H&S Assessment |
| **Training** | Fire Warden, First Aid, Manual Handling, Fire Awareness, Working at Height |

---

## External Integrations

### Clerk (Authentication)

| Feature | Implementation |
|---------|----------------|
| User Sign-up/Sign-in | Hosted UI + custom routing |
| OAuth Providers | Google, Apple, Microsoft |
| Session Management | JWT tokens, HTTP-only cookies |
| Webhooks | User sync on create/update/delete |
| Role Claims | Custom metadata for RBAC |

### Calendar APIs

| Provider | Purpose |
|----------|---------|
| Google Calendar | Sync engineer availability |
| Apple Calendar | Sync engineer availability |
| Microsoft Outlook | Sync engineer availability |

**Integration Flow**:
1. Engineer connects calendar via OAuth
2. System fetches calendar events
3. Busy times block availability slots
4. Auto-refresh via stored refresh tokens

### Supabase (Database)

| Feature | Usage |
|---------|-------|
| PostgreSQL | Primary database |
| Connection Pooling | PgBouncer for performance |
| SSL | Required in production |

---

## Security Architecture

### Authentication & Authorization

| Layer | Implementation |
|-------|----------------|
| **Authentication** | Clerk (OAuth, password, MFA) |
| **Session** | JWT tokens, HTTP-only cookies |
| **Middleware** | Route protection, auth validation |
| **RBAC** | Role-based access (Customer/Engineer/Admin) |
| **Server Actions** | Role verification before mutations |

### Data Protection

| Concern | Solution |
|---------|----------|
| **SQL Injection** | Prisma parameterized queries |
| **XSS** | React auto-escaping |
| **CSRF** | Clerk SameSite cookie protection |
| **Webhook Security** | Svix HMAC-SHA256 signature verification |
| **Input Validation** | Zod schemas on all inputs |
| **Secrets** | Environment variables, never in code |

### Role Permissions Matrix

| Action | Customer | Engineer | Admin |
|--------|:--------:|:--------:|:-----:|
| View own bookings | Yes | Yes | Yes |
| Create bookings | Yes | No | Yes |
| View assigned jobs | No | Yes | Yes |
| Complete jobs | No | Yes | No |
| Manage all users | No | No | Yes |
| Approve engineers | No | No | Yes |
| Configure services | No | No | Yes |

---

## Deployment & Infrastructure

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...        # Supabase connection string
DIRECT_URL=postgresql://...          # Direct connection (migrations)

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# App Config
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://...
```

### Build Commands

```bash
npm run dev        # Development server (localhost:3000)
npm run build      # Production build + Prisma generate
npm run start      # Start production server
npm run lint       # Run ESLint

# Database
npm run db:push    # Push schema changes
npm run db:migrate # Create migration
npm run db:seed    # Seed demo data
npm run db:studio  # Open Prisma Studio
```

### Recommended Deployment

| Platform | Configuration |
|----------|---------------|
| **Vercel** | Automatic Next.js optimization |
| **Database** | Supabase (Frankfurt region for UK compliance) |
| **Domain** | Custom domain with SSL |
| **CDN** | Vercel Edge Network |

### Pre-Deployment Checklist

- [ ] Run `npm run build` successfully
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Clerk webhook endpoint updated
- [ ] SSL certificates verified
- [ ] Error monitoring configured (Sentry recommended)

---

## Appendix: File Structure Reference

```
compliance-connect/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Auth route group
│   │   ├── (dashboard)/          # Dashboard route group
│   │   ├── api/                  # API routes
│   │   ├── globals.css           # Global styles
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Landing page
│   ├── components/               # React components (42 files)
│   │   ├── ui/                   # shadcn/ui primitives
│   │   ├── layout/               # Layout components
│   │   ├── shared/               # Shared components
│   │   ├── booking/              # Booking components
│   │   ├── engineer/             # Engineer components
│   │   └── admin/                # Admin components
│   ├── lib/                      # Utilities & logic
│   │   ├── actions/              # Server actions
│   │   ├── validations/          # Zod schemas
│   │   ├── auth.ts               # Auth utilities
│   │   ├── db.ts                 # Prisma client
│   │   ├── pricing.ts            # Pricing engine
│   │   └── utils.ts              # Helper functions
│   └── types/                    # TypeScript types
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── seed.ts                   # Seed data
│   └── migrations/               # Migration files
├── public/                       # Static assets
├── supabase/                     # Supabase config
├── package.json                  # Dependencies
├── next.config.ts                # Next.js config
├── tailwind.config.ts            # Tailwind config
└── tsconfig.json                 # TypeScript config
```

---

**Document Prepared For**: Product Management Team
**Technical Contact**: Engineering Team
**Repository**: compliance-connect
