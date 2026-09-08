# INTEGRA 2027 – AI NEXT Symposium Platform

A production-ready technical symposium management platform built for **INTEGRA 2027**, an Inter-College Technical Symposium organized by the **PG & Research Department of Computer Science, Don Bosco College (Co-Ed), Yelagiri Hills**.

Designed with a premium dark cyber theme (cyan, violet, and mint neon accents), glassmorphic elements, typewriter terminal loaders, and role-based workflows (Student, Admin, Judge, Volunteer).

---

## 🚀 Key Features

1. **Cyberpunk Boot Screen**: Terminal typewriter initialization sequence introducing the department, college, and active modules.
2. **AI Core Assistant**: Interactive virtual chatbot coordinator suggesting suitable missions based on participant interest.
3. **Multi-Role Authentication Gateways**:
   - **Student Dashboard**: Manages registered missions, check-in status, virtual AI Passport (XP tracking, custom dynamic QR), and downloading certificates.
   - **Admin Dashboard**: Manages offline payment verification, real-time registrants analytics (popular events metrics), broadcasting announcements, and generating certificates.
   - **Judge Dashboard**: Live scorecard panels allowing evaluations of innovation, technical skill, and creativity. Leaders stand dynamically updated.
   - **Volunteer Dashboard**: Simulator scan portal capturing participant QR codes to mark entrance check-ins (checks if payment is verified).
4. **Offline Payment Workflow**: Supports payment verification desks (Pending ➔ Approved / Rejected).
5. **Interactive Client-Side PDF Engine**: Automatically compiles and downloads high-fidelity A4 passports, hall tickets, and landscape completion certificates on the fly via `jsPDF`.

---

## 🛠️ Folder Structure

```text
E:\AY26-27\ANTIGRAVITY\
├── src/
│   ├── app/                    # Next.js App Router folders
│   │   ├── page.tsx            # Landing Page & Boot screen loader
│   │   ├── register/           # Multi-step Student Registration
│   │   ├── login/              # Multi-role Quick Authentication Panel
│   │   ├── dashboard/          # Student Portal Console
│   │   ├── admin/              # Organizer Controller
│   │   ├── judge/              # Grader score scorecard
│   │   ├── volunteer/          # Gate entrance QR Scanner
│   │   └── verify/             # Certificate Verification Gateway
│   ├── components/             # Custom UI widgets
│   │   ├── boot-screen.tsx     # Terminal Typewriter Loader
│   │   └── ai-assistant.tsx    # Floating holographic AI assistant
│   ├── lib/                    # Core utilities
│   │   ├── mock-db.ts          # Seed data & localStorage Mock DB
│   │   ├── schema.ts           # Zod forms validations
│   │   └── pdf-helper.ts       # jsPDF layout templates
│   └── globals.css             # Cyber styling & @theme configurations
├── firebase/                   # Firebase rules & config
│   ├── firestore.rules
│   └── firestore.indexes.json
├── package.json
└── README.md
```

---

## ⚙️ Installation & Development

### 1. Requirements
Ensure you have **Node.js (v18 or higher)** and **NPM** installed.

### 2. Setup Dependencies
From the project root directory, run:
```bash
npm install
```

### 3. Start Local Terminal Server
Run the development environment locally:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🌐 Production Deployment Guide

### 1. Firebase Configuration (Optional)
To replace the mock client database with the live Firebase cluster:
1. Create a project at the [Firebase Console](https://console.firebase.google.com/).
2. Create standard collections: `users`, `missions`, `colleges`, `announcements`, `scores`, `certificates`.
3. In `src/lib/firebase.ts` (or similar), initialize the Firebase client SDK:
   ```typescript
   import { initializeApp } from "firebase/app";
   import { getFirestore } from "firebase/firestore";
   import { getAuth } from "firebase/auth";

   const firebaseConfig = {
     apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
     authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
     projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
     storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
     appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
   };

   export const app = initializeApp(firebaseConfig);
   export const db = getFirestore(app);
   export const auth = getAuth(app);
   ```

### 2. Hosting Deployments
- **Frontend (Vercel)**: Connect your Github repo to Vercel. It automatically configures and builds the Next.js production files.
- **Backend (Firebase CLI)**:
  ```bash
  npm install -g firebase-tools
  firebase login
  firebase init firestore
  firebase deploy --only firestore:rules
  ```

---

## 🧪 Simulation Sandbox Credentials

Use these quick credentials at the `/login` portal to inspect and test various dashboards out-of-the-box:
- **Student Dashboard**: `student@integra.in` (Grace Hopper)
- **Admin Dashboard**: `admin@integra.in` (Symposium Chair)
- **Judge Dashboard**: `judge@integra.in` (Dr. Alan Turing)
- **Volunteer Dashboard**: `volunteer@integra.in` (Gate Officer)
