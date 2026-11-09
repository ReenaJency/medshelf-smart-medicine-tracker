# MedShelf: Smart Medicine Expiry Tracker
### Mini Project | CS25S01 Skill Development Course I
**Department of Computer Science and Engineering &bull; J. J. College of Engineering and Technology, Tiruchirappalli**  
*November 2026*

---

## 👥 Project Team & Academic Credentials

| Team Member | Register / Roll Number | Department |
| :--- | :--- | :--- |
| **Reena Jency V** | 811325104172 | CSE |
| **Reshma A** | 811325104173 | CSE |
| **Nisha K** | 811325104144 | CSE |
| **Poojasri S** | 811325104152 | CSE |

**Project Guide:** Mrs. T. Keerthana Jerine, M.E., Assistant Professor, Department of Computer Science and Engineering

---

## 🔗 How to Open & Run the Application

MedShelf is built according to **Slide 5** of the project requirements using:
- **HTML5:** Semantic pages & forms
- **CSS3:** Fully responsive layout for Phone, Tablet, and Desktop
- **JavaScript (ES6+):** All application and calculation logic
- **localStorage:** Private client-side data isolation per user
- **SHA-256:** Cryptographic client-side password hashing

Because it has **zero external database dependencies** and requires **no background server installations**, it runs on **ALL systems** (Windows, macOS, Linux, Android, iOS, Chrome, Edge, Firefox, Safari).

### 🚀 Option 1: Direct Browser Link (Instant Open)
Open this link directly in your browser:
```
file:///C:/Users/reena/OneDrive/Documents/GitHub/medshelf-smart-medicine-tracker/index.html
```
*(Or simply double-click `index.html` in the folder).*

### ⚡ Option 2: Windows Batch Launcher
Double-click:
```bat
run-medshelf.bat
```
This automatically launches your system's default web browser directly to the MedShelf portal.

### 🌐 Option 3: Deploy to GitHub Pages (Shareable to Mobile & Any PC)
To share this application link with professors, teammates, or on a mobile phone without sending files:
1. Push this repository to GitHub: `https://github.com/ReenaJency/medshelf-smart-medicine-tracker`
2. In GitHub, go to **Settings &rarr; Pages &rarr; Branch: `main` &rarr; Save**.
3. Your live link will be:
   ```
   https://reenajency.github.io/medshelf-smart-medicine-tracker/
   ```

---

## 🎯 Problem & Project Goals (Slide 2)

### The Problem:
1. **Expiry dates are small and easy to miss:** Printed dates on blister packs and bottles are difficult to read and fade over time.
2. **Expired medicines are found too late:** Often discovered during emergency situations when someone is sick.
3. **Stock runs out without warning:** Critical daily medications run out without advance notice.
4. **Paper lists and memory are not reliable:** Hand-written notes are lost and not kept up-to-date.

### Our Goals:
- **Private login for every user** with cryptographic SHA-256 password security.
- **Automatic Safe, Expiring Soon, and Expired status** computed in real-time.
- **Live counters and low-stock alerts** that refresh immediately on any change.
- **Dual Operating Modes:**
  - 🏠 **Family Mode:** Personal medicines, expiry dates, stock, and family member tags.
  - 🏥 **Store / Hospital Mode:** Bulk stock with units, batch-wise tracking, FEFO stock out, alerts, and stock activity logs.
- **Works on phone and desktop** seamlessly.

---

## 🔄 Dual Operating Modes (Slide 3)

After logging in, users are greeted with the **Mode Chooser**:
- 🏠 **Family:** Personal medicines, expiry dates, stock and reminders at home.
- 🏥 **Store / Hospital:** Bulk inventory, batches, stock in and out, low-stock alerts.

Users can switch between modes at any time using the **Switch mode** button in the top navigation.

---

## 🧮 How Status Is Decided (Slide 5)

Expiry status is calculated mathematically from the calendar date at midnight:
$$\Delta d = \text{round}\left(\frac{\text{Expiry Date} - \text{Today's Date}}{86,400,000}\right)$$

| Status | Mathematical Condition | Text Label & Badge | Example |
| :--- | :--- | :--- | :--- |
| **Safe** | $\Delta d > 30\text{ days}$ | `[Safe]` (Green) | `120 days left` |
| **Expiring Soon** | $0 \le \Delta d \le 30\text{ days}$ | `[Expiring soon]` (Orange) | `in 15 days` (0 days = `expires today`) |
| **Expired** | $\Delta d < 0\text{ days}$ | `[Expired]` (Red) | `expired 10 days ago` |

*Every status displays an explicit human-readable text label, not only a colour.*

---

## 🏠 Family Mode (Slide 6)
- **Greeting & Private Shelf:** Displays `Hello, {Name} 👋` and user's private records.
- **5 Live Cards:**
  1. `TOTAL` (Teal border)
  2. `SAFE` (Green border)
  3. `EXPIRING SOON` (Orange border)
  4. `EXPIRED` (Red border)
  5. `LOW STOCK` (Purple border)
- **Interactive Card Filter:** Tap any card to immediately filter the medicine list.
- **Search & Sort:** Search by medicine name, category, or family member (Dad, Mom, Kids, Grandpa).
- **One-Click Quantity Adjustment:** `[-]` and `[+]` buttons update quantity in real-time.
- **Low-Stock Warning Tag:** Medicines with quantity $\le 2$ automatically display the purple `[Low stock]` badge.

---

## 🏥 Store / Hospital Mode (Slide 7)
- **7 Live Metric Cards:**
  1. `MEDICINES`
  2. `TOTAL UNITS`
  3. `IN STOCK`
  4. `LOW STOCK`
  5. `OUT OF STOCK`
  6. `EXPIRING ≤30D (BATCHES)`
  7. `EXPIRED (BATCHES)`
- **⚠️ Actionable Alerts Panel:**
  - 🟣 Medicine low stock alert with current units vs reorder threshold.
  - 🟠 Batch expiring within 30 days.
  - ⚫ Out of stock alert (0 units remaining).
  - 🔴 Expired batch alert prompting removal from shelf.
- **Batch-Wise Tracking:** Displays batch code, quantity, expiry date, relative status, and distributor.
- **FEFO (First Expired, First Out) Stock Out:** Dispenses inventory automatically from the batch that expires earliest.
- **Stock In:** Adds quantities to existing or new batches with supplier details.
- **Stock Activity Log:** Tabular audit trail recording all stock in/out movements, timestamps, quantities, and reference notes.

---

## ✨ Future Enhancements (Slide 8)
1. 📷 **Barcode Scan:** Auto-detects medications from barcode numbers.
2. 🔍 **OCR Expiry Reading:** Extracts printed expiry dates from package photos.
3. 🔔 **Smart Reminders:** Multi-stage alerts at 60, 30, and 7 days with safe disposal tips.
4. 📄 **PDF / Print Export:** Printable medicine schedule for doctors or caregivers (`window.print()`).
5. ☁️ **Cloud Sync & Backup:** One-click JSON backup and restore.
6. 🔎 **Drug-Name Lookup:** Integrated openFDA & RxNorm reference data.
7. 🌐 **Regional Languages:** Multi-lingual interface supporting English, Tamil (தமிழ்), and Hindi (हिन्दी).
8. 📦 **Smart Cabinet:** IoT connected domestic medicine box with door and temperature sensors.

---

## ⚠️ Medical Disclaimer (Slide 9)
> **MedShelf only helps to organise medicines. Please ask a pharmacist or doctor for medical advice.**
