# MEDSHELF: SMART MEDICINE EXPIRY TRACKER FOR HOME USE
## Full-Stack Deployment & Hosting Guide

This guide explains how to run MedShelf locally on your Windows computer and how to deploy both the **Frontend** and **Backend + Database** to free, public hosting platforms (such as **Render / Railway** for the backend and **Netlify / Vercel** for the frontend) so you can share a working public link with college faculty and friends.

---

## 1. LOCAL EXECUTION (WINDOWS / VISUAL STUDIO CODE)

MedShelf includes a self-contained execution setup that requires zero manual database setup to test locally.

### Method A: One-Click Runner (Fastest)
1. Navigate to the project root in Windows File Explorer:
   `c:\Users\reena\OneDrive\Documents\GitHub\medshelf-smart-medicine-tracker`
2. Double-click **`run-medshelf.bat`**.
3. The script will start the backend server and automatically open `http://localhost:5000` in your default browser.

### Method B: Using Visual Studio Code Terminal
1. Open the project folder in VS Code (`File > Open Folder...`).
2. Open a new terminal (`Ctrl + ~`).
3. Run:
   ```bash
   node backend/server.js
   ```
4. Open your browser and go to `http://localhost:5000`.
5. You will be greeted by the **Login Page** (`login.html`).

---

## 2. GITHUB REPOSITORY UPLOAD

To push your full-stack source code to GitHub:

### Step 1: Create a GitHub Repository
1. Log in to [github.com/new](https://github.com/new).
2. Set repository name to: `medshelf-smart-medicine-tracker`.
3. Choose **Public**.
4. Leave "Add a README" **unchecked**.
5. Click **Create repository** and copy the repository URL.

### Step 2: Push Local Code via Git
Open PowerShell or your terminal in the project directory and run:

```powershell
# 1. Stage all project files
git add .

# 2. Commit the changes
git commit -m "Complete Full-Stack MedShelf Release with Auth, MySQL & Express"

# 3. Ensure branch is main
git branch -M main

# 4. Link your GitHub repository (replace with your actual username)
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/medshelf-smart-medicine-tracker.git

# 5. Push to GitHub
git push -u origin main
```

---

## 3. FULL-STACK CLOUD DEPLOYMENT

A full-stack application with a backend API and database cannot run as a static HTML file alone. The architecture is deployed in three connected steps:

```
[Netlify / Vercel Frontend] ---> HTTPS REST Calls ---> [Render / Railway Node Backend] ---> [Cloud MySQL Database]
```

---

### STEP 1: FREE CLOUD MYSQL DATABASE SETUP (Aiven or Clever Cloud)

1. Sign up for a free account on **[Aiven.io](https://aiven.io)** or **[Clever-Cloud.com](https://www.clever-cloud.com)**.
2. Create a new **MySQL** database service (Free tier).
3. Copy your database credentials:
   - `DB_HOST` (e.g., `mysql-12345-yourname.aivencloud.com`)
   - `DB_PORT` (e.g., `12345`)
   - `DB_USER` (e.g., `avnadmin`)
   - `DB_PASSWORD` (e.g., `your_cloud_password`)
   - `DB_NAME` (e.g., `defaultdb` or `medshelf_db`)
4. Open the web SQL console and execute the SQL script in [`database/schema.sql`](../database/schema.sql) to create the `users` and `medicines` tables.

---

### STEP 2: BACKEND SERVER DEPLOYMENT (Render.com)

1. Sign up for a free account on **[Render.com](https://render.com)**.
2. Click **New + &rarr; Web Service**.
3. Connect your GitHub repository: `medshelf-smart-medicine-tracker`.
4. Configure the settings:
   - **Name:** `medshelf-api`
   - **Root Directory:** Leave empty (or `backend`)
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node backend/server.js`
5. Scroll down to **Environment Variables** and add:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `your_strong_random_secret_key_here`
   - `DB_HOST`: `<Your Cloud MySQL Host>`
   - `DB_USER`: `<Your Cloud MySQL User>`
   - `DB_PASSWORD`: `<Your Cloud MySQL Password>`
   - `DB_NAME`: `<Your Cloud MySQL Database Name>`
   - `DB_PORT`: `<Your Cloud MySQL Port>`
6. Click **Create Web Service**.
7. In ~2 minutes, your backend API will be live at:
   `https://medshelf-api.onrender.com`

---

### STEP 3: FRONTEND DEPLOYMENT (Netlify or Vercel)

#### Deploying on Netlify
1. Go to **[app.netlify.com](https://app.netlify.com)** and click **"Add new site" &rarr; "Import an existing project"**.
2. Select **GitHub** and choose `medshelf-smart-medicine-tracker`.
3. Configure the build settings:
   - **Base directory:** Leave blank
   - **Publish directory:** `frontend`
   - **Build command:** Leave blank
4. Click **Deploy Site**.
5. Once deployed, Netlify will assign a public URL: `https://medshelf-tracker.netlify.app`.

#### Connecting Frontend to Deployed Backend
In `frontend/js/api.js`, update the fallback URL or set your deployed backend URL:
```javascript
// In frontend/js/api.js
const PRODUCTION_API_URL = 'https://medshelf-api.onrender.com/api';
```
Now, when you open your live Netlify site on your phone or laptop, all registration, login, dashboard counts, and medicine records communicate live with your cloud backend and MySQL database!

---

## 4. POST-DEPLOYMENT VERIFICATION CHECKLIST

After deployment, test the following steps:

- [ ] **1. Clean Navigation:** Open `https://your-site.netlify.app` &rarr; verify that it immediately routes to `login.html`.
- [ ] **2. User Registration:** Click "Register New Account", create an account with your real name and email.
- [ ] **3. Duplicate Check:** Attempt registering again with the same email &rarr; verify that HTTP 409 error is displayed.
- [ ] **4. Login:** Sign in with your registered email and password &rarr; redirected to `dashboard.html`.
- [ ] **5. Zero-Count Dashboard:** Verify that all 5 metric cards initially show **0**.
- [ ] **6. Add Safe Medicine:** Add a medicine with an expiry date 6 months ahead &rarr; Safe counter changes to **1**.
- [ ] **7. Add Expired Medicine:** Add a medicine with an expiry date last month &rarr; Expired counter changes to **1** with a red badge.
- [ ] **8. Low Stock Alert:** Add a medicine with quantity 1 &rarr; Low Stock counter increments and displays `⚠️ Low Stock`.
- [ ] **9. User Isolation:** Open an Incognito window, register User 2, and verify that User 2 sees 0 medicines and cannot see User 1's records.
- [ ] **10. Logout:** Click "Logout" &rarr; session token is cleared, and user is redirected back to `login.html`.
