# MEDSHELF: SMART MEDICINE EXPIRY TRACKER FOR HOME USE
## PowerPoint Presentation Outline (12 Slides with Speaker Notes)

Use this outline to build your presentation for your mini-project review or final viva evaluation.

---

### SLIDE 1: TITLE SLIDE
- **Title:** MEDSHELF
- **Subtitle:** Smart Medicine Expiry Tracker for Home Use
- **Domain:** Full-Stack Web Development & Health-Tech Informatics
- **Architecture:** Node.js, Express.js REST APIs, MySQL Relational Database, HTML5/CSS3/ES6+
- **Presenter Name:** [Your Name / Roll No.]
- **Project Supervisor:** [Guide / Professor Name]
- **Institution:** [College / University Name]
- **Academic Year:** 2026–2027

> **Speaker Notes:**  
> "Good morning, respected professors and evaluators. Today, I am proud to present my mini-project: **MedShelf – Smart Medicine Expiry Tracker for Home Use**. This is a complete, full-stack application built with Node.js, Express, and MySQL that helps families manage their domestic medicine cabinets, track expiration dates, avoid dangerous cross-medication, and prevent emergency stockouts."

---

### SLIDE 2: INTRODUCTION & PROBLEM STATEMENT
- **The Household Challenge:** Every home maintains a collection of medicines, but tracking is done manually or not at all.
- **Critical Problems:**
  - Ingestion of expired drugs leading to chemical toxicity or antibiotic resistance.
  - Medication mix-ups among family members (children, adults, elderly).
  - Unexpected midnight stockouts of critical medications.
  - Lack of multi-user data privacy in domestic settings.
- **The Need:** An intuitive, multi-user web solution with real-time classification and privacy.

> **Speaker Notes:**  
> "Studies show that over 60% of homes retain expired medication without realizing it. Furthermore, medicines intended for different individuals get mixed up on the same shelf. MedShelf provides a digital inventory that classifies medicines into Safe, Expiring Soon, and Expired categories while keeping each user's records completely private."

---

### SLIDE 3: SYSTEM ARCHITECTURE & TECH STACK
- **Architecture:** 3-Tier Multi-Tenant Client-Server Architecture.
- **Frontend Layer:**
  - Modern HTML5 Semantic Markup
  - Responsive Healthcare CSS3 Design (Green Palette: `#059669`)
  - Vanilla JavaScript (ES6+) with Fetch API & JWT Bearer Tokens
- **Application Tier:**
  - Node.js & Express.js REST Framework
  - PBKDF2 Password Hashing (100,000 iterations + 16-byte random salt)
  - JWT Authentication Middleware
- **Database Tier:**
  - MySQL 8.0+ Relational Database (`medshelf_db`)
  - Automated local database adapter for zero-configuration testing

> **Speaker Notes:**  
> "Our architecture separates presentation, business logic, and data storage. We use Node.js and Express to expose RESTful APIs, secure passwords with salted PBKDF2 hashing, issue signed JWT tokens, and store records in MySQL with foreign key constraints."

---

### SLIDE 4: APPLICATION WORKFLOW & AUTHENTICATION
1. **Entry Point:** Users open the site &rarr; directed to `login.html`.
2. **Registration:** New users register with Name, Email, and Password. Duplicate emails are blocked.
3. **Authentication:** Validated credentials return a secure JWT token stored in browser session.
4. **Dashboard Redirection:** Authenticated users land on `dashboard.html`.
5. **Session Termination:** Clicking Logout clears the session and returns to `login.html`.
*Dashboard is strictly inaccessible prior to successful authentication.*

> **Speaker Notes:**  
> "Security was our top priority. The dashboard is completely protected. Unauthenticated requests are intercepted and redirected to the login page. When a user logs out, their token is revoked, ensuring no unauthorized access."

---

### SLIDE 5: DATABASE SCHEMA & RELATIONAL DESIGN
- **`users` Table:**
  - `user_id` (PK, Auto-Increment)
  - `full_name`, `email` (UNIQUE), `password_hash`
  - `created_at`
- **`medicines` Table:**
  - `medicine_id` (PK, Auto-Increment)
  - `user_id` (FK referencing `users.user_id` ON DELETE CASCADE)
  - `medicine_name`, `expiry_date`, `quantity`, `family_member`, `category`, `description`
  - `created_at`, `updated_at`
- **Strict User Isolation:** Every query enforces `WHERE user_id = ?`.

> **Speaker Notes:**  
> "Here is our Entity-Relationship model. We enforce referential integrity with cascading deletes. A critical design feature is user isolation: User A can never view, modify, or delete medicines belonging to User B because the server enforces ownership on every query."

---

### SLIDE 6: CORE ALGORITHM: DYNAMIC EXPIRY CLASSIFICATION
- **Mathematical Date Math:**
  $$\Delta t = D_{\text{expiry}} - D_{\text{today}}$$
  $$\Delta d = \text{round}\left(\frac{\Delta t}{86,400,000}\right)$$
- **Classification Rules:**
  - **$\Delta d < 0$:** `EXPIRED` &rarr; 🔴 Red Badge (*"Expired X days ago"*)
  - **$0 \le \Delta d \le 30$:** `EXPIRING SOON` &rarr; 🟠 Orange Badge (*"Expires in X days"*)
  - **$\Delta d > 30$:** `SAFE` &rarr; 🟢 Green Badge (*"X days remaining"*)
- **Stock Alert:** If `quantity` $\le 2$ &rarr; ⚠️ Low Stock Alert.

> **Speaker Notes:**  
> "The expiry status is calculated dynamically relative to the current calendar date at midnight. It never uses hardcoded dates. If a medicine expires today or within 30 days, it is flagged as Expiring Soon. If the date has passed, it is flagged in red as Expired."

---

### SLIDE 7: DASHBOARD & INITIAL ZERO-COUNT BEHAVIOR
- **Fresh Account Behavior:**
  - When a newly registered user logs in, every dashboard counter displays **ZERO**:
    * Total Medicines: 0 | Safe: 0 | Expiring Soon: 0 | Expired: 0 | Low Stock: 0
- **Dynamic Updates:**
  - Adding 2 safe, 1 expiring soon, and 1 expired medicine dynamically updates counts to:
    * Total: 4 | Safe: 2 | Expiring: 1 | Expired: 1 | Low Stock: based on quantities.
- **Values from Database:** Counters are calculated in real time via `/api/dashboard/stats`.

> **Speaker Notes:**  
> "Notice that our dashboard doesn't display hardcoded dummy numbers. For a brand-new user, all metrics start at zero. As medicines are added or modified, the dashboard queries the database and updates counters in real time."

---

### SLIDE 8: MEDICINE MANAGEMENT & USER INTERFACE
- **Navigation Menu:** Dashboard, My Medicines, Expiring Soon, Expired, Low Stock, Profile, Logout.
- **Greeting Display:** Logged-in user's name is permanently displayed in the navigation bar.
- **Inventory Tools:**
  - Dual View Mode: Responsive Table View and Touch-Friendly Cards View.
  - Substring Search & Multi-Filters (Category, Person, Status).
  - One-Click Quantity Controls (`+` and `-`) for rapid inventory updates.
  - Safe Deletion Modal with double-confirmation prompt.

> **Speaker Notes:**  
> "In My Medicines, users can search, sort by earliest expiry, filter by family member, and adjust stock quantities directly from table rows. The user interface uses a clean medical green palette with high-contrast accessibility."

---

### SLIDE 9: AUTOMATED TESTING & VERIFICATION RESULTS
- **Automated Test Suite (`backend/test-suite.js`):**
  - Executed 15 end-to-end integration tests.
  - **100% Pass Rate (15 Passed, 0 Failed).**
- **Test Scenarios Verified:**
  - Registration, duplicate email rejection, correct & incorrect password login.
  - Zero-count initialization on empty shelf.
  - Dynamic expiry classification (Safe, Expiring Soon, Expired).
  - Low-stock threshold detection ($\le 2$).
  - Multi-user isolation (User 2 blocked from viewing or deleting User 1 data).
  - Password hash verification (salt:hash format, zero plain text).

> **Speaker Notes:**  
> "We developed an automated test suite that validates every backend controller, database query, and security policy. In our multi-user test, User 2 was unable to access or delete User 1's records, proving strict multi-tenant isolation."

---

### SLIDE 10: ETHICAL, SAFETY & LEGAL COMPLIANCE
- **Strict Inventory Scope:** MedShelf is exclusively an inventory tracking application.
- **No Clinical Advice:**
  - Does NOT prescribe dosages.
  - Does NOT diagnose illnesses.
  - Does NOT suggest expired medicines are safe.
- **Safe Disposal Advice:** Explicit warnings urge safe chemical disposal.
- **Permanent Medical Disclaimers:** Visible notices on every screen.

> **Speaker Notes:**  
> "We have embedded strict ethical boundaries into MedShelf. The system displays a permanent medical disclaimer, never provides dosage advice, and emphasizes safe disposal of expired drugs."

---

### SLIDE 11: DEPLOYMENT & HOSTING ARCHITECTURE
- **Full-Stack Deployment Pipeline:**
  - **Source Code:** GitHub Version Control.
  - **Frontend:** Hosted on Netlify or Vercel with HTTPS.
  - **Backend Server:** Node.js Express API on Render / Railway.
  - **Database:** Cloud MySQL on Aiven / Clever Cloud.
- **Security:** Zero credentials exposed in frontend code or repository (`.env` configured securely).

> **Speaker Notes:**  
> "MedShelf is configured for full-stack deployment. The frontend connects to the backend REST APIs over secure HTTPS, and database credentials remain protected in server environment variables."

---

### SLIDE 12: CONCLUSION & FUTURE SCOPE
- **Key Achievements:**
  - Complete full-stack application with user authentication and database persistence.
  - Eliminates household risks from expired medicines and medication mix-ups.
  - Verified across 15 automated test cases with 100% pass rate.
- **Future Scope:**
  - 📷 Camera Barcode & GS1 DataMatrix scanner.
  - 🔍 OCR Expiry Date recognition via Tesseract.js.
  - 📱 Progressive Web App (PWA) with push notifications.
- **Live Demo Link:** [Your Deployed Application URL]
- **Q&A:** Open for questions from the evaluation committee!

> **Speaker Notes:**  
> "In conclusion, MedShelf provides a practical, full-stack solution to a critical everyday healthcare problem. Thank you for your time. I am now happy to take any questions."
