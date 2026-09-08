# INTEGRA 2026 — Master Project Documentation

---

## 📖 Table of Contents
1. [Executive Summary & Project Overview](#1-executive-summary--project-overview)
2. [Key Highlights & Core Innovations](#2-key-highlights--core-innovations)
3. [System Architecture & Tech Stack](#3-system-architecture--tech-stack)
4. [User Roles & Access Control Matrix](#4-user-roles--access-control-matrix)
5. [The 8 AI Missions & Event Details](#5-the-8-ai-missions--event-details)
6. [Portals & Modules Breakdown](#6-portals--modules-breakdown)
7. [Database Schema & Data Models](#7-database-schema--data-models)
8. [PDF Generation & Smart Document Subsystems](#8-pdf-generation--smart-document-subsystems)
9. [API Endpoints & Cloud Services](#9-api-endpoints--cloud-services)
10. [Deployment & Environment Configuration](#10-deployment--environment-configuration)
11. [Project Directory & File Structure](#11-project-directory--file-structure)
12. [User Manual & Operational Workflows](#12-user-manual--operational-workflows)

---

## 1. Executive Summary & Project Overview

**INTEGRA 2026** (*“Innovation Network for Technology Growth and Research Advancement”*) is an enterprise-grade, state-of-the-art web platform engineered to power the inter-collegiate technology and cultural symposium organized by the **PG & Research Department of Computer Science**, **Don Bosco College (Co-Ed), Yelagiri Hills**.

- **Theme**: *“POWERED BY AI”*
- **Slogan**: *“INNOVATE TODAY, INSPIRE TOMORROW, INTEGRATE FOREVER.”*
- **Target Audience**: All Undergraduate (UG) students across Arts, Science, Engineering, and Management streams.
- **Production URL**: [https://integra-2026-teal.vercel.app](https://integra-2026-teal.vercel.app)

The platform consolidates participant registrations, automated email delivery of QR hall tickets, role-based evaluation portals, live scoring, food token redemption, and on-demand generation of 2-page print-ready **AI Passports** and official certificates.

---

## 2. Key Highlights & Core Innovations

- **🚀 60 FPS Interactive Neural Canvas Loader**: Real-time particle mesh with interactive physics, mouse gravity, and automatic zero-click warp transition.
- **🛂 2-Page Smart AI Passport**: Personal booklet with identity visa pages, stamped tracks, security watermark, and QR entry barcodes.
- **📱 100% Real Scannable ISO QR Engine**: Zero-latency QR scanning for participant check-in, track admission, and meal coupon verification.
- **☁️ Hybrid Cloud Synchronization**: Real-time Firebase Cloud Firestore with automatic offline/mock fallback for 100% uptime during network degradation.
- **⚖️ Real-Time Multi-Judge Scoring Engine**: Rubric-based live evaluation that instantly computes ranks and streams results to the live leaderboard.
- **📜 Instant PDF Studio**: High-resolution vector PDF generators for Hall Tickets, Merit Certificates, ID Cards, and Score Sheets.

---

## 3. System Architecture & Tech Stack

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  Next.js 16 (App Router + Turbopack)  •  React 19  •  Tailwind CSS  •  Lucide UI  |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                             BUSINESS LOGIC & ENGINE                               |
|  Role Gateways  •  PDF Vector Studio (jsPDF + QRCode)  •  Live Leaderboard Engine |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                                PERSISTENCE LAYER                                  |
|   Google Firebase Cloud Firestore (Primary)  •  Browser Mock-DB (Sync Fallback)   |
+-----------------------------------------------------------------------------------+
```

### Technology Matrix:
- **Framework**: Next.js 16.2.10 (Turbopack, Server & Client Components)
- **Language**: TypeScript 5.8
- **Styling**: Tailwind CSS with custom glassmorphic & cyberpunk tokens
- **Cloud Database**: Google Cloud Firestore (`integra-ai-874eb`)
- **PDF Engine**: `jspdf` (300 DPI vector rendering) + `qrcode` (ISO 18004 2D matrix)
- **Deployment**: Vercel Serverless Edge Global CDN

---

## 4. User Roles & Access Control Matrix

| Role | Default Route | Key Responsibilities |
| :--- | :--- | :--- |
| **Participant** | `/dashboard` | View registered tracks, download AI Passport & Hall Ticket, view certificates. |
| **Event Coordinator** | `/coordinator` | Mark participant attendance via QR scanner, manage rounds, view track rosters. |
| **Judge / Evaluator** | `/judge` | Enter rubric scores for contestants, submit evaluation feedback, lock ranks. |
| **Host Volunteer** | `/volunteer` | Helpdesk desk check-ins, campus guidance, general attendee lookup. |
| **Food Coordinator** | `/food` / `/stall` | Scan meal QR codes to redeem food tokens and prevent double-dipping. |
| **Admin** | `/admin` | Manage events, approve verifications, print master reports, broadcast updates. |
| **Super Admin** | `/superadmin` | Database purging, raw JSON export/import, master system configuration. |

---

## 5. The 8 AI Missions & Event Details

| # | Event Name | Category | Type | Assigned Staff Coordinator | Official Emblem |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **1** | 🧠 **AI Quiz Arena** | Technical | Team (2) | **Mrs. Vasantharani** | `/events/ai-quiz-arena.jpg` |
| **2** | 👁️ **Vision AI** | Technical | Team (2) | **Dr. Naveen A** | `/events/vision-ai.png` |
| **3** | 🤖 **Prompt Master** | Technical | Individual | **Dr. P. Radhakrishnan** | `/events/prompt-master.jpg` |
| **4** | 🚀 **Startup Lab** | Non-Technical | Team (2-3) | **Ms. Poovarasi** | `/events/startup-lab.jpg` |
| **5** | 🎨 **Creative Studio** | Non-Technical | Indiv / Team (2) | **Mr. Kamalesh** | `/events/creative-studio.jpg` |
| **6** | 💻 **AI Framecraft** | Innovation | Team (2-3) | **Mr. Naveen Kumar** | `/events/ai-framecraft.jpg` |
| **7** | 🎵 **Rhythm AI** | Audio & Music | Indiv / Team (2) | **Dr. Immanuvel S** | `/events/rhythm-ai.jpg` |
| **8** | 💃 **Integra Vibe** | Cultural Grand Finale | Indiv / Group | **Mr. Daniel Abishek** | `/events/integra-vibe.jpg` |

---

## 6. Portals & Modules Breakdown

### 1. Public Landing Page (`/`)
- Interactive Hero with Countdown Clock to September 11, 2026.
- Interactive Event Showcase with rules, coordinator contacts, and registration limits.
- Live Real-Time Department & College Leaderboards.
- FAQ accordion & interactive AI Assistant chatbot.

### 2. Registration Portal (`/register`)
- Registration for individual and team participants.
- Automated generation of a unique **PIN** (e.g., `INT-26-8942`).
- Payment verification upload with transaction reference IDs.

### 3. Participant Portal (`/dashboard`)
- **2-Page AI Passport**: Downloadable 2-page print booklet with photo badge, QR identity, and stamped event visas.
- **Event Hall Ticket**: Digital boarding pass with timing and venue schedule.
- Instant Certificate of Participation/Merit download.

### 4. Admin Management Portal (`/admin`)
- **Registrations & Verifications**: Approve or reject registrations with instant email dispatch.
- **Manage Events**: Live configuration of venues, coordinator details, and team size rules.
- **Scoreboard Management**: Publish official symposium winners.
- **Refreshment Stalls**: Track live breakfast, lunch, and high-tea redemption tallies.

### 5. Judge & Evaluation Console (`/judge`)
- Criteria-based sliders (Creativity, Technical Depth, Prompt Precision, Presentation).
- Automatic rank computation and one-click submission locking.

---

## 7. Database Schema & Data Models

### Primary Entities:

```typescript
// Participant Registration
interface Registration {
  id: string;
  pin: string; // e.g. "INT-26-8942"
  fullName: string;
  email: string;
  phone: string;
  collegeName: string;
  department: string;
  year: string;
  registeredMissions: string[];
  paymentStatus: "Pending" | "Verified" | "Rejected";
  transactionId?: string;
  attendedEvents: string[];
  foodStatus: { breakfast: boolean; lunch: boolean; tea: boolean };
  createdAt: string;
}

// Mission (Symposium Event)
interface Mission {
  id: string;
  name: string;
  category: "Technical" | "Non-Technical" | "Gaming/Audio" | "Grand Finale";
  type: "Individual" | "Team";
  minTeamSize: number;
  maxTeamSize: number;
  coordinator: string;
  phone: string;
  venue: string;
  startTime: string;
  endTime: string;
  rules: string[];
  criteria: string[];
  logoUrl: string;
}
```

---

## 8. PDF Generation & Smart Document Subsystems

Located in [`src/lib/pdf-helper.ts`](file:///E:/AY26-27/ANTIGRAVITY/src/lib/pdf-helper.ts):
1. **`downloadAIPassport(reg)`**: Generates the official 2-Page A4 booklet with bio-page, security QR watermark, and stamped track visas.
2. **`downloadHallTicket(reg)`**: High-contrast A4 boarding pass with event schedule, venue guide, and photo placeholder.
3. **`downloadCertificate(studentName, college, eventName, rank)`**: Official high-resolution certificate with college & department insignia.
4. **`downloadLandscapeSymposiumPoster()`**: 300 DPI horizontal poster for grand displays.

---

## 9. API Endpoints & Cloud Services

- `POST /api/send-welcome-email`: Sends confirmation email containing PIN upon submission.
- `POST /api/send-hall-ticket`: Sends PDF Hall Ticket attachment upon admin approval.
- `GET /verify?id=<hash>`: Public verification gateway for checking authenticity of certificates and QR badges.

---

## 10. Deployment & Environment Configuration

### Environment Variables (`.env.local`):
```env
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="integra-ai-874eb.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="integra-ai-874eb"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="integra-ai-874eb.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="720743606708"
NEXT_PUBLIC_FIREBASE_APP_ID="1:720743606708:web:75704179e0a02ef82b9a71"
RESEND_API_KEY="re_..."
```

### Local Development Commands:
```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run TypeScript type check
npx tsc --noEmit

# Build production bundle
npm run build
```

---

## 11. Project File Structure

```
E:\AY26-27\ANTIGRAVITY
├── public/                     # Static assets & event logos
│   ├── college-logo.png        # Don Bosco College crest
│   ├── dept-logo.png           # Department of CS logo
│   ├── integra-logo.png        # Official INTEGRA 2026 emblem
│   └── events/                 # 8 Official event emblems
├── src/
│   ├── app/
│   │   ├── admin/page.tsx      # Admin Control Console
│   │   ├── coordinator/page.tsx# Event Coordinator Portal
│   │   ├── dashboard/page.tsx  # Participant Portal (AI Passport)
│   │   ├── food/page.tsx       # Food & Refreshment Scanner
│   │   ├── judge/page.tsx      # Judge Scoring Console
│   │   ├── login/page.tsx      # Unified Auth Gateway
│   │   ├── register/page.tsx   # Registration Engine
│   │   ├── superadmin/page.tsx # Superadmin Master Console
│   │   ├── verify/page.tsx     # Public Certificate Verifier
│   │   └── page.tsx            # Main Landing Showcase
│   ├── components/
│   │   ├── ai-assistant.tsx    # Interactive AI Chatbot
│   │   └── boot-screen.tsx     # 60 FPS Particle Canvas Loader
│   └── lib/
│       ├── firebase.ts         # Firestore connection
│       ├── firebase-service.ts # Cloud CRUD operations
│       ├── mock-db.ts          # Offline database & default missions
│       └── pdf-helper.ts       # 300 DPI Vector PDF Engine
├── DOCUMENTATION.md            # Master Project Documentation
└── package.json                # Project dependencies & scripts
```

---

## 12. User Manual & Operational Workflows

### 🎫 Scenario A: Participant Journey
1. Participant visits `https://integra-2026-teal.vercel.app` and clicks **Register**.
2. Selects up to 3 events, enters college details, and uploads payment proof.
3. System assigns a unique **PIN** (e.g., `INT-26-8942`).
4. Upon admin verification, receives an automated confirmation email with their official Hall Ticket.
5. In the **Participant Portal** (`/dashboard`), downloads their **2-Page AI Passport** and **Event Schedule**.

### 📱 Scenario B: Event Day Attendance & Food
1. At the college entrance, Host Volunteers scan the participant's QR code via `/volunteer` to confirm check-in.
2. At the Mission Venue, the Event Coordinator scans the QR to mark event attendance via `/coordinator`.
3. At the Dining Hall, the Food Coordinator scans the meal QR to record breakfast, lunch, or high-tea redemption via `/food`.

### 🏆 Scenario C: Judging & Score Finalization
1. Judges log in to `/judge` and select their assigned track.
2. Evaluates teams based on predefined scoring criteria (0–100 scale).
3. The system computes rankings automatically and feeds the live leaderboard on the home page.
