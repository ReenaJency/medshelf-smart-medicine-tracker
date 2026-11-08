# MEDSHELF: SMART MEDICINE EXPIRY TRACKER FOR HOME USE
## Full-Stack Project Screenshot & Demonstration Guide

This guide lists the exact screenshots you should capture from your running MedShelf full-stack application to include in your **Mini-Project Report**, **Laboratory Record Notebook**, and **PowerPoint Presentation**.

---

### PREPARATION BEFORE CAPTURING SCREENSHOTS
1. Start the backend server by double-clicking `run-medshelf.bat` (or running `node backend/server.js`).
2. Open your browser to `http://localhost:5000`.
3. Set your browser zoom to **100%** (`Ctrl + 0`).
4. On Windows, use `Windows Key + Shift + S` (Snipping Tool) to capture clean rectangular regions.

---

### RECOMMENDED SCREENSHOTS CHECKLIST

#### Screenshot 1: Professional Login Page (`login.html`)
- **What to capture:** The login screen showing MedShelf branding, email, password fields, "Sign In" button, and the "Try Demo Account" button.
- **Caption for Report:**  
  *Figure 1: MedShelf Secure Login Portal with Email/Password Authentication and JWT Token Issuance.*

---

#### Screenshot 2: User Registration Page with Input Validation (`register.html`)
- **What to capture:** The registration page showing Full Name, Email, Password, and Confirm Password fields.
- **How to demonstrate:** Try submitting with mismatched passwords to demonstrate client-side validation errors in red text.
- **Caption for Report:**  
  *Figure 2: User Registration Screen showing input validation and password confirmation safeguards.*

---

#### Screenshot 3: Fresh User Dashboard with Initial ZERO Counts (`dashboard.html`)
- **What to capture:** The dashboard immediately after a newly registered user logs in.
- **Key Elements Visible:**
  - Welcome greeting: *"Welcome back, [Name]!"*
  - Top navigation bar showing the logged-in user's name: `👤 [User Full Name]`.
  - All 5 KPI counter cards displaying **0** (Total: 0, Safe: 0, Expiring Soon: 0, Expired: 0, Low Stock: 0).
  - The empty-shelf message card.
- **Caption for Report:**  
  *Figure 3: Initial User Dashboard proving strict zero-count initialization for newly registered accounts.*

---

#### Screenshot 4: Populated Dashboard with Live Counters & Urgent Alert
- **What to capture:** The dashboard after medicines have been added (or after clicking "✨ Load Demo Medicines").
- **Key Elements Visible:**
  - Active counts on Total, Safe, Expiring Soon, Expired, and Low Stock.
  - Urgent Red Warning Banner alerting to expired or expiring soon items.
  - Notification bell with dynamic badge count.
- **Caption for Report:**  
  *Figure 4: Real-time Executive Dashboard displaying live statistics aggregated from the database.*

---

#### Screenshot 5: My Medicines Table View (`medicines.html`)
- **What to capture:** The inventory table displaying rows of medicines with color-coded status badges.
- **Key Elements Visible:**
  - Red badge on expired medicines (*"Expired 15 days ago"*).
  - Orange badge on expiring soon medicines (*"Expires in 5 days"*).
  - Green badge on safe medicines (*"180 days remaining"*).
  - Orange `⚠️ Low Stock` tag on items with quantity &le; 2.
  - One-click `+` and `-` quantity adjustment buttons.
- **Caption for Report:**  
  *Figure 5: Medicine Inventory Table View with color-coded expiry badges and inline stock adjusters.*

---

#### Screenshot 6: Add Medicine Modal Dialogue
- **What to capture:** The "Add New Medicine" modal open over the medicines page.
- **Key Elements Visible:**
  - Medicine Name, Expiry Date picker, Quantity, Family Member Name, Category dropdown, and Notes textarea.
- **Caption for Report:**  
  *Figure 6: Add Medicine Dialogue linked to backend REST API with foreign key user attribution.*

---

#### Screenshot 7: Edit Medicine Dialogue
- **What to capture:** The modal opened with pre-filled details for an existing medicine record.
- **How to trigger:** Click the "✏️ Edit" button on any row.
- **Caption for Report:**  
  *Figure 7: Edit Medicine Dialogue allowing modification of quantities, expiry dates, or family members.*

#### Screenshot 8: Delete Confirmation Safety Modal
- **What to capture:** The deletion confirmation popup.
- **How to trigger:** Click "🗑️ Delete" on any medicine row.
- **Key Elements Visible:**
  - Cautionary prompt confirming permanent deletion from MySQL database.
- **Caption for Report:**  
  *Figure 8: Deletion Confirmation Modal preventing accidental removal of critical records.*

---

#### Screenshot 9: Multi-Criteria Search & Filtering
- **What to capture:** The table filtered down by a search query or a specific family member (e.g., "Grandpa").
- **Key Elements Visible:**
  - Active search term in search bar.
  - Dynamic results summary: *"Showing X medicine(s)"*.
- **Caption for Report:**  
  *Figure 9: Real-time Substring Search and Family Member Filter in action.*

---

#### Screenshot 10: Mobile Responsive Card View
- **What to capture:** The card grid view or mobile screen layout.
- **How to trigger:** Click the "🗂️ Cards" toggle button, or press `F12` and toggle mobile device toolbar (`Ctrl + Shift + M`).
- **Caption for Report:**  
  *Figure 10: Mobile-Responsive Card Layout optimized for smartphones and touch devices.*

---

#### Screenshot 11: Database Schema & Records Verification
- **What to capture:** The MySQL Workbench, phpMyAdmin, or terminal window showing:
  ```sql
  SELECT * FROM users;
  SELECT * FROM medicines;
  ```
- **Key Elements Visible:**
  - `users` table showing `password_hash` as a 128-character salted hex string (zero plain text).
  - `medicines` table showing `user_id` foreign key association.
- **Caption for Report:**  
  *Figure 11: Relational Database Schema proving cryptographic password hashing and foreign key linkage.*
