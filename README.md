# 💊 MedShelf: Smart Medicine Expiry Tracker for Home Use
### Full-Stack Web Application (Node.js &bull; Express.js &bull; MySQL &bull; HTML5/CSS3/JavaScript)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Backend: Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-059669.svg)](#)
[![Database: MySQL](https://img.shields.io/badge/Database-MySQL%208.0-0d9488.svg)](#)
[![Authentication: JWT](https://img.shields.io/badge/Auth-JWT%20%2B%20PBKDF2-blue.svg)](#)
[![Academic Level](https://img.shields.io/badge/Academic-B.Tech%20Mini--Project-green.svg)](#)

> **A full-stack, multi-user medicine inventory and expiry tracking system engineered for domestic households. Features secure user authentication, dynamic mathematical expiry classification, multi-tenant user isolation, relational database storage, and a clean healthcare design system.**

---

## 📌 Project Overview

Household medicine boxes frequently accumulate expired drugs, mix up medications between family members, or run out of critical supplies during midnight emergencies.

**MedShelf** provides a complete full-stack digital solution:
1. **User Authentication:** Registered users sign in securely using salted PBKDF2 password hashes and JWT tokens.
2. **Dashboard Analytics:** For new accounts, all dashboard counters start strictly at **0**. As medicines are logged, counters update dynamically from the database.
3. **Dynamic Expiry Classification:** Medicines are evaluated against the current calendar date:
   - 🟢 **Safe:** $> 30$ days remaining (Green)
   - 🟠 **Expiring Soon:** $\le 30$ days remaining (Orange)
   - 🔴 **Expired:** Date is in the past (Red)
4. **Strict User Isolation:** Every user's shelf is private. User A can never view, edit, or delete User B's medicines.
5. **Low Stock Alerts:** Quantities $\le 2$ trigger automatic warnings.
6. **Family Categorization:** Medicines are tagged per family member (e.g., Grandpa, Mom, Kids).

---

## 🗂️ Project Directory Structure

```
medshelf-smart-medicine-tracker/
│
├── frontend/                   # Client-Side Presentation Tier
│   ├── index.html              # Smart auth router (redirects to login or dashboard)
│   ├── login.html              # Professional login portal with demo access
│   ├── register.html           # User registration with password confirmation
│   ├── dashboard.html          # Executive dashboard with live database counters
│   ├── medicines.html          # Full inventory management (table, cards, filters)
│   ├── css/
│   │   ├── auth.css            # Styles for Login & Registration
│   │   └── dashboard.css       # Green healthcare theme for Dashboard & Inventory
│   ├── js/
│   │   ├── api.js              # Centralized API client & JWT session manager
│   │   ├── auth.js             # Client-side login, register, & password reset
│   │   ├── dashboard.js        # Live dashboard statistics & greeting controller
│   │   ├── medicines.js        # Full CRUD, search, filter, sort, +/- stock controller
│   │   └── reminders.js        # 60, 30, 7 day reminders & Web Notifications API
│   └── assets/
│       └── favicon.svg         # Emerald green vector medical logo
│
├── backend/                    # Server & Business Logic Tier
│   ├── server.js               # Express & Native HTTP server entry point
│   ├── package.json            # Node.js dependencies & scripts
│   ├── test-suite.js           # Automated 15-test verification suite
│   ├── config/
│   │   └── db.js               # MySQL pool with automated local fallback
│   ├── middleware/
│   │   └── auth.js             # PBKDF2 password hashing & JWT auth middleware
│   ├── routes/
│   │   ├── auth.routes.js      # /api/auth endpoints (register, login, me, reset)
│   │   ├── medicines.routes.js # /api/medicines CRUD endpoints
│   │   └── dashboard.routes.js # /api/dashboard/stats live counter endpoints
│   └── controllers/
│       ├── auth.controller.js
│       ├── medicines.controller.js
│       └── dashboard.controller.js
│
├── database/                   # Data Tier
│   └── schema.sql              # MySQL DDL (users and medicines tables with FK)
│
├── docs/                       # Comprehensive Academic Documentation
│   ├── PROJECT_REPORT.md       # 16-Section Academic Project Report
│   ├── PRESENTATION_SLIDES.md  # 12-Slide PowerPoint Presentation Outline
│   ├── VIVA_QUESTIONS.md       # 35+ Full-Stack Viva Q&As
│   ├── SCREENSHOTS_GUIDE.md    # Step-by-Step Screenshot Capturing Guide
│   └── DEPLOYMENT_GUIDE.md     # Full-Stack Deployment Guide (Render, MySQL, Netlify)
│
├── .env.example                # Environment variables template
├── run-medshelf.bat            # 1-Click Windows execution script
└── README.md                   # Project documentation
```

---

## ⚡ Quickstart: Running the Application

MedShelf provides **two complete modes of execution** to fit any environment or demonstration context:

### 🌟 Mode 1: Instant Standalone Browser Mode (Zero Setup Required)
*Directly replicates the interactive client-side experience of the Claude reference artifact:*
1. Simply double-click **`index.html`** (or **`standalone.html`**) in the project root directory.
2. The application opens directly in Google Chrome or Microsoft Edge with zero server dependencies.
3. Features localStorage persistence, live color-coded status badges, real-time search & filters, quantity adjusters, reminder alerts, and JSON export/import.

### 🚀 Mode 2: Full-Stack Multi-User Mode (Node.js & Database Backend)
*For complete multi-user authentication, JWT sessions, and isolated relational database storage:*
1. **One-Click Run (Windows):** Double-click **`run-medshelf.bat`** in the project root.
2. The script boots the Node.js / Express backend server on port 5000 and automatically launches `http://localhost:5000` in your default browser.
3. Sign in using the **Try Demo Account** button or register a new household profile.

#### Terminal Execution:
```bash
# Start backend server
node backend/server.js
# Or with Antigravity Node:
agy-node backend/server.js
```

---

## 🧪 Automated Testing & Verification

MedShelf includes an automated test runner executing 15 unit and integration tests covering authentication, database queries, zero-count initialization, and multi-user isolation:

```bash
# Run test suite
node backend/test-suite.js
```

### Test Results:
```
============================================================
 STARTING MEDSHELF AUTOMATED VERIFICATION TEST SUITE
============================================================

 ✅ PASS: 1. User Registration with Valid Data
 ✅ PASS: 2. Duplicate Email Registration Prevention
 ✅ PASS: 3. Login with Correct Credentials
 ✅ PASS: 4. Login with Incorrect Password (Security Rejection)
 ✅ PASS: 5. New User Dashboard Displays All 0 Counts
 ✅ PASS: 6. Add Safe Medicine (> 30 Days)
 ✅ PASS: 7. Add Expiring Soon Medicine (<= 30 Days)
 ✅ PASS: 8. Add Expired Medicine (< Today)
 ✅ PASS: 9. Low-Stock Detection (Qty <= 2)
 ✅ PASS: 10. Dashboard Counters Update Dynamically from Database
 ✅ PASS: 11. Edit Medicine Record
 ✅ PASS: 12. Fast Stock Adjustment (+/-)
 ✅ PASS: 13. Strict User Isolation (User 2 Cannot See or Edit User 1 Records)
 ✅ PASS: 14. Delete Medicine by Authorized Owner
 ✅ PASS: 15. Password Security (Never Stored in Plain Text)

============================================================
 TEST SUMMARY: 15 PASSED | 0 FAILED
============================================================
```

---

## 🚀 Cloud Deployment Guide

A full-stack application requires hosting both the frontend and backend with a cloud database:

1. **Cloud Database:** Create a free MySQL database on [Aiven.io](https://aiven.io) or [Clever-Cloud.com](https://www.clever-cloud.com) and execute `database/schema.sql`.
2. **Backend Server:** Deploy the Node.js server to [Render.com](https://render.com) or Railway, setting your database environment variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`).
3. **Frontend:** Deploy the `frontend/` folder to [Netlify](https://app.netlify.com) or Vercel.

*For complete step-by-step commands and Git instructions, refer to [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md).*

---

## 📚 Academic Deliverables Index

* 📄 [**Academic Project Report (`docs/PROJECT_REPORT.md`)**](docs/PROJECT_REPORT.md): 16-section formal mini-project report with SRS, architecture diagrams, DFDs, ER diagrams, pseudocode, and security specifications.
* 📊 [**Presentation Slides Outline (`docs/PRESENTATION_SLIDES.md`)**](docs/PRESENTATION_SLIDES.md): 12 PowerPoint slides with slide layouts and spoken notes.
* 💬 [**Viva Questions & Answers (`docs/VIVA_QUESTIONS.md`)**](docs/VIVA_QUESTIONS.md): 35+ questions on JWT, PBKDF2 hashing, user isolation, foreign keys, and REST APIs.
* 📸 [**Screenshots Guide (`docs/SCREENSHOTS_GUIDE.md`)**](docs/SCREENSHOTS_GUIDE.md): 11 annotated screenshot checkpoints for the project report.
* 🚀 [**Deployment Guide (`docs/DEPLOYMENT_GUIDE.md`)**](docs/DEPLOYMENT_GUIDE.md): Instructions for local VS Code testing, GitHub, Render, MySQL, and Netlify.

---

## ⚠️ Medical Safety & Ethical Disclaimer

> **IMPORTANT:** MedShelf is exclusively an **inventory tracking and expiry date monitoring tool**.
> - It does **NOT** provide medical advice, diagnosis, or clinical dosage guidelines.
> - It does **NOT** suggest that expired medicines are safe to consume.
> - Users must always consult a certified doctor or licensed pharmacist for healthcare decisions.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free for academic, personal, and educational use.
