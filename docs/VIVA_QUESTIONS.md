# MEDSHELF: SMART MEDICINE EXPIRY TRACKER FOR HOME USE
## Viva Examination Questions & In-Depth Model Answers (35+ Q&As)

This document contains 35+ comprehensive technical and domain questions with answers to help you prepare for your college mini-project review, external lab viva, and technical examination.

---

### CATEGORY 1: PROJECT CONCEPT & ARCHITECTURE

#### Q1. What is MedShelf, and what is the primary problem it solves?
**Answer:**  
MedShelf is a full-stack web application designed to manage household medicine inventories and track expiration dates. In domestic households, people often forget expiry dates, mix up medicines among family members, or experience unexpected stockouts. Consuming expired medication can lead to reduced therapeutic potency, toxicity, or antibiotic resistance. MedShelf automates expiry classification (Safe, Expiring Soon, Expired), tracks stock quantities, categorizes medicines per family member, and maintains separate accounts with strict user isolation.

#### Q2. Explain the overall architectural flow of MedShelf.
**Answer:**  
MedShelf uses a 3-tier client-server architecture:
1. **Presentation Tier (Frontend):** Built with HTML5, CSS3, and modern JavaScript. When a user arrives, they are greeted by `login.html`. Upon successful login, the client stores a signed JWT and redirects to `dashboard.html`.
2. **Application Tier (Backend):** Built using Node.js and Express.js. It handles authentication, token verification, input validation, and business logic via RESTful endpoints (`/api/auth`, `/api/medicines`, `/api/dashboard`).
3. **Data Tier (Database):** Uses MySQL 8.0 with tables for `users` and `medicines`. Foreign keys ensure referential integrity, and indexes optimize search and expiry queries.

#### Q3. Why did you choose a full-stack architecture with MySQL over a purely client-side LocalStorage approach?
**Answer:**  
While client-side LocalStorage is simple, it has severe limitations: data is trapped in a single browser on one physical computer, cannot be accessed across phones and laptops, and lacks true multi-user security. By using Node.js, Express, and MySQL:
- Multiple family members can have private accounts.
- Data persists in a central relational database accessible from any device.
- Passwords and user records are cryptographically secured on the server.
- The system supports real-world multi-tenant production standards.

---

### CATEGORY 2: AUTHENTICATION, SECURITY & USER ISOLATION

#### Q4. How is password security implemented in MedShelf?
**Answer:**  
Passwords are never stored in plain text. When a user registers, the server generates a cryptographically secure 16-byte random salt using `crypto.randomBytes(16)`. The password is then hashed using **PBKDF2 (Password-Based Key Derivation Function 2)** with HMAC-SHA-512, run through **100,000 iterations**, and derived into a 64-byte key. The stored value is formatted as `salt:hash`.  
During login, the incoming password is mixed with the stored salt and hashed; the candidate hash is compared against the stored hash using `crypto.timingSafeEqual()` to guard against side-channel timing attacks.

#### Q5. What is a JSON Web Token (JWT), and how does MedShelf use it?
**Answer:**  
A JWT is an open standard (RFC 7519) for securely transmitting information between parties as a compact, URL-safe JSON object. It consists of three parts separated by dots:
1. **Header:** `{"alg": "HS256", "typ": "JWT"}`
2. **Payload:** User claims (`userId`, `email`, `fullName`, `iat`, `exp`).
3. **Signature:** `HMAC-SHA256(Header + '.' + Payload, secretKey)`.  
When a user logs in, the backend signs and returns this token. For subsequent requests, the frontend sends this token in the `Authorization: Bearer <token>` header. The `authenticateToken` middleware verifies the signature and attaches `req.user` to the request.

#### Q6. How do you prevent one user from accessing or modifying another user's medicine records?
**Answer:**  
This is enforced at the database query level on the backend. Every query targeting the `medicines` table strictly specifies `WHERE user_id = ?`, where `user_id` is extracted directly from the verified JWT payload (`req.user.userId`).  
Even if User B attempts to perform an HTTP `DELETE /api/medicines/45`, the query executed is:
```sql
DELETE FROM medicines WHERE medicine_id = 45 AND user_id = <User B's ID>;
```
If medicine 45 belongs to User A, zero rows are affected and the server returns a 404/403 error, completely preventing Broken Object Level Authorization (BOLA/IDOR).

#### Q7. How does the application prevent SQL Injection?
**Answer:**  
All database interactions use **parameterized prepared statements** with `?` placeholders (e.g., `db.query('SELECT * FROM medicines WHERE user_id = ?', [userId])`). The SQL query structure is pre-compiled by the database engine, and user-supplied values are treated strictly as literal data, preventing malicious SQL code injection.

---

### CATEGORY 3: DATABASE DESIGN & SCHEMA

#### Q8. Describe the database tables and their relationships in MedShelf.
**Answer:**  
The relational schema consists of two tables:
1. **`users`:** `user_id` (PK, INT AUTO_INCREMENT), `full_name` (VARCHAR), `email` (VARCHAR UNIQUE), `password_hash` (VARCHAR), `created_at` (TIMESTAMP).
2. **`medicines`:** `medicine_id` (PK, INT AUTO_INCREMENT), `user_id` (FK referencing `users.user_id`), `medicine_name` (VARCHAR), `expiry_date` (DATE), `quantity` (INT), `family_member` (VARCHAR), `category` (VARCHAR), `description` (TEXT), `created_at`, `updated_at`.  
The relationship is **One-to-Many (1:N)**: one user can own many medicine records. The foreign key constraint includes `ON DELETE CASCADE`, ensuring that if a user account is deleted, their associated medicines are safely removed.

#### Q9. Why is the `email` column indexed and marked as UNIQUE?
**Answer:**  
The `UNIQUE` constraint guarantees that no two accounts can share the same email address, preventing account collisions. The index (`INDEX idx_users_email (email)`) transforms email lookups during login from an $O(N)$ full table scan to an $O(\log N)$ B-tree index lookup, ensuring instant authentication even with thousands of registered users.

---

### CATEGORY 4: ALGORITHMS & BUSINESS LOGIC

#### Q10. What is the exact mathematical algorithm used to classify expiry status?
**Answer:**  
The algorithm computes the calendar day differential $\Delta d$ relative to the current local date:
1. Normalize today's date to midnight ($00:00:00$ local time):
   $$\text{today} = \text{new Date}(), \quad \text{today.setHours}(0, 0, 0, 0)$$
2. Parse the medicine's expiry date (`YYYY-MM-DD`) into a Date object at midnight.
3. Calculate time differential in milliseconds: $\Delta t = D_{\text{expiry}} - D_{\text{today}}$.
4. Convert to days: $\Delta d = \text{round}\left(\frac{\Delta t}{86,400,000}\right)$.
5. Classification:
   - If $\Delta d < 0$ &rarr; **EXPIRED** (Red badge).
   - If $0 \le \Delta d \le 30$ &rarr; **EXPIRING SOON** (Orange badge).
   - If $\Delta d > 30$ &rarr; **SAFE** (Green badge).

#### Q11. How does the dashboard behave for a newly registered user who has not added any medicines?
**Answer:**  
For a new user with an empty shelf, all dashboard metrics strictly query the database and return **0**:
- Total Medicines: 0
- Safe Medicines: 0
- Expiring Soon: 0
- Expired Medicines: 0
- Low Stock Medicines: 0  
An empty-shelf welcome card is displayed inviting the user to add their first medicine or load sample demo data.

#### Q12. How does the low-stock alert logic function?
**Answer:**  
Each medicine record has a `quantity` column. The backend and frontend compare this value against a threshold $T_{\text{low}} = 2$. If $\text{quantity} \le 2$, the item is tagged with a warning badge (`⚠️ Low Stock`) and increments the dashboard's `lowStockMedicines` counter. Users can also use the inline `+` and `-` buttons on the table to adjust quantities dynamically.

---

### CATEGORY 5: FRONTEND ARCHITECTURE & USER EXPERIENCE

#### Q13. Why does the application redirect to `login.html` instead of displaying the dashboard upon first visit?
**Answer:**  
In `frontend/index.html`, an immediate script checks whether `medshelf_jwt_token` exists in `localStorage`. If no token is found, it immediately executes `window.location.replace('login.html')`. Protected pages (`dashboard.html`, `medicines.html`) invoke `MedShelfAPI.requireAuth()` on load; unauthenticated requests are immediately bounced back to the login page.

#### Q14. What design system and color palette did you implement?
**Answer:**  
The application uses a clean healthcare design system:
- **Primary Color:** Medical Emerald Green (`#059669`, hover `#047857`, surface `#ecfdf5`).
- **Backgrounds:** Clean white (`#ffffff`) cards with slate grey sections (`#f8fafc`, `#f1f5f9`).
- **Semantic Indicators:** Green for Safe (`#10b981`), Amber/Orange for Warnings (`#d97706`), Red for Expired (`#dc2626`).
- **Typography & Layout:** Clean sans-serif hierarchy, CSS Flexbox, and CSS Grid with responsive breakpoints at 768px and 480px.

#### Q15. How did you implement real-time search and multi-filtering?
**Answer:**  
The search bar uses a debounced event listener (250ms delay) that queries the `/api/medicines` endpoint with query parameters: `?search=...&status=...&family=...&category=...&sort=...`.  
The backend filters the user's records using SQL conditions and returns the matching subset, which is then rendered as either an HTML table or responsive cards.

---

### CATEGORY 6: TESTING, DEPLOYMENT & LIMITATIONS

#### Q16. What automated tests did you write to verify the project?
**Answer:**  
We created `backend/test-suite.js` which executes 15 automated integration tests verifying:
1. User registration with valid inputs.
2. Prevention of duplicate email registration.
3. Login with correct password (JWT generation).
4. Rejection of incorrect password.
5. Verification of 0 counts on empty shelf.
6. Addition of safe, expiring soon, expired, and low-stock items.
7. Dynamic recalculation of dashboard statistics.
8. Record editing and quantity adjustment.
9. Multi-user isolation (User 2 blocked from viewing or deleting User 1 data).
10. Password hash integrity (verifying passwords are never plain text).  
All 15 tests passed with 100% success.

#### Q17. How can this full-stack project be deployed live for public evaluation?
**Answer:**  
1. **Source Code:** Hosted in a public GitHub repository.
2. **Backend Server:** Deployed on Render or Railway running Node.js (`npm start`).
3. **Database:** Hosted on a cloud MySQL provider (such as Aiven or Clever Cloud) with the `medshelf_db` schema loaded.
4. **Frontend:** Deployed on Netlify or Vercel pointing its API requests to the deployed backend URL.

#### Q18. What are the current limitations of the system, and how would you extend it in the future?
**Answer:**  
- **Current Limitations:** Data is entered manually through web forms, and desktop notifications only trigger while the browser is active.
- **Future Enhancements:**
  1. Camera-based barcode and QR code scanning.
  2. OCR printed text recognition (Tesseract.js) to extract expiry dates directly from blister packs.
  3. PWA (Progressive Web App) with background push notifications via Service Workers.
  4. Integration with pharmacy APIs for automated drug interaction checks.
