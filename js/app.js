/**
 * MedShelf - Smart Medicine Expiry Tracker
 * Master Controller (js/app.js)
 * 
 * Designed according to project PDF specifications (CS25S01 Skill Development Course I)
 * J. J. College of Engineering and Technology, Tiruchirappalli - November 2026
 * Team: Reena Jency V, Reshma A, Nisha K, Poojasri S
 * Guide: Mrs. T. Keerthana Jerine, M.E.
 */

(function () {
  'use strict';

  // -------------------------------------------------------------
  // 1. DATE CALCULATION & EXPIRY MATHEMATICS (Slide 5)
  // -------------------------------------------------------------
  function getMidnightDate(dateInput) {
    const d = dateInput ? new Date(dateInput) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function formatISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDays(baseDate, days) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * Calculates days remaining: Expiry date - Today's date
   * Days left = Math.round((D_expiry - D_today) / 86400000)
   */
  function calculateDaysLeft(expiryDateStr) {
    if (!expiryDateStr) return 0;
    const today = getMidnightDate();
    const expiry = getMidnightDate(expiryDateStr);
    const diffMs = expiry.getTime() - today.getTime();
    return Math.round(diffMs / 86400000);
  }

  /**
   * Status classification rules according to Slide 5:
   * Safe: > 30 days left
   * Expiring Soon: <= 30 days left (0 days left = "expires today")
   * Expired: < 0 days left
   */
  function classifyExpiry(daysLeft) {
    if (daysLeft < 0) {
      const absDays = Math.abs(daysLeft);
      return {
        status: 'EXPIRED',
        badgeClass: 'badge-expired',
        text: 'Expired',
        relativeText: `expired ${absDays} day${absDays === 1 ? '' : 's'} ago`
      };
    } else if (daysLeft <= 30) {
      return {
        status: 'EXPIRING_SOON',
        badgeClass: 'badge-expiring',
        text: 'Expiring soon',
        relativeText: daysLeft === 0 ? 'expires today' : `in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
      };
    } else {
      return {
        status: 'SAFE',
        badgeClass: 'badge-safe',
        text: 'Safe',
        relativeText: `in ${daysLeft} days`
      };
    }
  }

  // -------------------------------------------------------------
  // 2. DATA STORAGE & MULTI-USER ISOLATION ENGINE (Slide 4 & 5)
  // -------------------------------------------------------------
  const STORAGE_KEYS = {
    USERS: 'medshelf_users',
    CURRENT_USER: 'medshelf_current_user_id',
    SESSION_USER: 'medshelf_session_user_id',
    REMEMBER_USER: 'medshelf_remember_user_id',
    USER_PREFIX: 'medshelf_user_data_'
  };

  /**
   * Generates sample data for Reena matching Slide 6 & Slide 7 exactly
   */
  function generateReenaSeedData() {
    const today = getMidnightDate();

    // Family Mode items (Slide 6)
    const familyMedicines = [
      {
        id: 'fam_1',
        name: 'Cetirizine',
        category: 'Allergy',
        familyMember: 'Kids',
        expiryDate: formatISODate(addDays(today, -10)), // expired 10 days ago
        quantity: 6,
        description: 'Chewable antihistamine for allergy'
      },
      {
        id: 'fam_2',
        name: 'Amoxicillin',
        category: 'Antibiotic',
        familyMember: 'Dad',
        expiryDate: formatISODate(addDays(today, 15)), // in 15 days
        quantity: 2, // low stock (<= 2)
        description: 'Course to be completed as directed'
      },
      {
        id: 'fam_3',
        name: 'Cough Syrup',
        category: 'Fever & cold',
        familyMember: 'Grandpa',
        expiryDate: formatISODate(addDays(today, 60)), // in 60 days
        quantity: 4,
        description: 'Herbal syrup for nighttime cough'
      },
      {
        id: 'fam_4',
        name: 'Paracetamol 500mg',
        category: 'General',
        familyMember: 'Mom',
        expiryDate: formatISODate(addDays(today, 120)), // in 120 days
        quantity: 1, // low stock (<= 2)
        description: 'For mild fever and headache'
      },
      {
        id: 'fam_5',
        name: 'Ibuprofen 400mg',
        category: 'Pain relief',
        familyMember: 'Sister',
        expiryDate: formatISODate(addDays(today, 90)), // in 90 days
        quantity: 2, // low stock (<= 2)
        description: 'Pain relief tablets'
      }
    ];

    // Store / Hospital Mode items (Slide 7)
    const storeMedicines = [
      {
        id: 'st_1',
        name: 'Amoxicillin 250mg',
        category: 'Antibiotic',
        unit: 'Boxes',
        reorderLevel: 30,
        batches: [
          {
            batchNo: 'AM-77',
            quantity: 12,
            expiryDate: formatISODate(addDays(today, 20)), // expires in 20 days
            supplier: 'HealthPlus'
          }
        ]
      },
      {
        id: 'st_2',
        name: 'Cetirizine 10mg',
        category: 'Allergy',
        unit: 'Strips',
        reorderLevel: 40,
        batches: [
          {
            batchNo: 'CT-09',
            quantity: 90,
            expiryDate: formatISODate(addDays(today, -6)), // expired 6 days ago
            supplier: 'MediSupply Ltd'
          }
        ]
      },
      {
        id: 'st_3',
        name: 'Insulin Glargine',
        category: 'Diabetes',
        unit: 'Vials',
        reorderLevel: 20,
        batches: [] // Out of stock (0 Vials)
      },
      {
        id: 'st_4',
        name: 'ORS Sachets',
        category: 'Hydration',
        unit: 'Units',
        reorderLevel: 100,
        batches: [
          {
            batchNo: 'OR-33',
            quantity: 500,
            expiryDate: formatISODate(addDays(today, 150)),
            supplier: 'CareDist'
          }
        ]
      },
      {
        id: 'st_5',
        name: 'Paracetamol 500mg',
        category: 'Pain relief',
        unit: 'Strips',
        reorderLevel: 50,
        batches: [
          {
            batchNo: 'PC-101',
            quantity: 400,
            expiryDate: formatISODate(addDays(today, 300)),
            supplier: 'MediSupply Ltd'
          }
        ]
      }
    ];

    const stockActivity = [
      {
        id: 'act_1',
        timestamp: new Date().toLocaleString(),
        medicineName: 'Amoxicillin 250mg',
        type: 'STOCK_IN',
        quantity: 12,
        unit: 'Boxes',
        batchNo: 'AM-77',
        supplier: 'HealthPlus',
        user: 'Reena'
      },
      {
        id: 'act_2',
        timestamp: new Date().toLocaleString(),
        medicineName: 'ORS Sachets',
        type: 'STOCK_IN',
        quantity: 500,
        unit: 'Units',
        batchNo: 'OR-33',
        supplier: 'CareDist',
        user: 'Reena'
      },
      {
        id: 'act_3',
        timestamp: new Date().toLocaleString(),
        medicineName: 'Paracetamol 500mg',
        type: 'STOCK_IN',
        quantity: 400,
        unit: 'Strips',
        batchNo: 'PC-101',
        supplier: 'MediSupply Ltd',
        user: 'Reena'
      }
    ];

    return {
      currentMode: 'CHOOSER', // 'CHOOSER' | 'FAMILY' | 'STORE'
      familyMedicines: familyMedicines,
      storeMedicines: storeMedicines,
      stockActivity: stockActivity
    };
  }

  function initDefaultUser() {
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
    } catch (e) {
      users = [];
    }

    let reena = users.find(u => (u.email && u.email.toLowerCase() === 'reena@example.com') || (u.name && u.name.toLowerCase().includes('reena')));
    const defaultHash = window.MedShelfCrypto ? window.MedShelfCrypto.hashSync('Reena@123') : 'demo_hash';

    if (!reena) {
      reena = {
        id: 'usr_reena_default',
        name: 'Reena',
        email: 'reena@example.com',
        passwordHash: defaultHash,
        createdAt: new Date().toISOString()
      };
      users.push(reena);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      // Set Reena's data
      localStorage.setItem(STORAGE_KEYS.USER_PREFIX + reena.id, JSON.stringify(generateReenaSeedData()));
    } else {
      // Ensure valid passwordHash exists
      if (!reena.passwordHash) {
        reena.passwordHash = defaultHash;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
      // Ensure seed data exists
      if (!localStorage.getItem(STORAGE_KEYS.USER_PREFIX + reena.id)) {
        localStorage.setItem(STORAGE_KEYS.USER_PREFIX + reena.id, JSON.stringify(generateReenaSeedData()));
      }
    }

    return reena;
  }

  // Application Global State
  const AppState = {
    currentUser: null,
    userData: null,
    activeScreen: 'AUTH', // 'AUTH' | 'CHOOSER' | 'FAMILY' | 'STORE'
    familyFilter: 'ALL',  // 'ALL' | 'SAFE' | 'EXPIRING_SOON' | 'EXPIRED' | 'LOW_STOCK'
    familySearch: '',
    familySort: 'expiry_soonest',
    storeFilter: 'ALL',   // 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRING_BATCH' | 'EXPIRED_BATCH'
    storeSearch: '',
    storeTab: 'INVENTORY', // 'INVENTORY' | 'ACTIVITY'
    editingItem: null
  };

  function getCurrentUserData() {
    if (!AppState.currentUser) return null;
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PREFIX + AppState.currentUser.id);
    if (!raw) {
      const freshData = {
        currentMode: 'CHOOSER',
        familyMedicines: [],
        storeMedicines: [],
        stockActivity: []
      };
      saveCurrentUserData(freshData);
      return freshData;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { currentMode: 'CHOOSER', familyMedicines: [], storeMedicines: [], stockActivity: [] };
    }
  }

  function saveCurrentUserData(data) {
    if (!AppState.currentUser) return;
    AppState.userData = data;
    localStorage.setItem(STORAGE_KEYS.USER_PREFIX + AppState.currentUser.id, JSON.stringify(data));
  }

  // -------------------------------------------------------------
  // 3. UI RENDERING & NAVIGATION CONTROLLER
  // -------------------------------------------------------------
  const DOM = {};

  function cacheDOMElements() {
    DOM.authScreen = document.getElementById('screen-auth');
    DOM.chooserScreen = document.getElementById('screen-chooser');
    DOM.familyScreen = document.getElementById('screen-family');
    DOM.storeScreen = document.getElementById('screen-store');

    DOM.navUserInfo = document.getElementById('nav-user-info');
    DOM.navUserName = document.getElementById('nav-user-name');
    DOM.navNotificationBadge = document.getElementById('nav-notification-badge');

    // Modals
    DOM.modalBackdrop = document.getElementById('app-modal-backdrop');
    DOM.modalContainer = document.getElementById('app-modal-container');
    DOM.toastContainer = document.getElementById('toast-container');
  }

  function switchScreen(screenName) {
    AppState.activeScreen = screenName;
    if (DOM.authScreen) DOM.authScreen.style.display = screenName === 'AUTH' ? 'flex' : 'none';
    if (DOM.chooserScreen) DOM.chooserScreen.style.display = screenName === 'CHOOSER' ? 'flex' : 'none';
    if (DOM.familyScreen) DOM.familyScreen.style.display = screenName === 'FAMILY' ? 'block' : 'none';
    if (DOM.storeScreen) DOM.storeScreen.style.display = screenName === 'STORE' ? 'block' : 'none';

    // Update Top Navigation Bar user profile & notification badge
    updateHeaderNav();

    if (screenName === 'CHOOSER') {
      renderChooserScreen();
    } else if (screenName === 'FAMILY') {
      renderFamilyScreen();
    } else if (screenName === 'STORE') {
      renderStoreScreen();
    }
  }

  function updateHeaderNav() {
    const guestNav = document.getElementById('nav-guest-info');
    if (AppState.currentUser) {
      if (DOM.navUserInfo) DOM.navUserInfo.style.display = 'flex';
      if (DOM.navUserName) DOM.navUserName.textContent = AppState.currentUser.name;
      if (guestNav) guestNav.style.display = 'none';

      // Calculate total notifications across system (Expiring soon + Expired + Low stock)
      const data = AppState.userData || getCurrentUserData();
      let alertCount = 0;
      if (data) {
        if (data.familyMedicines) {
          data.familyMedicines.forEach(m => {
            const dl = calculateDaysLeft(m.expiryDate);
            if (dl <= 30 || m.quantity <= 2) alertCount++;
          });
        }
        if (data.storeMedicines) {
          data.storeMedicines.forEach(m => {
            const totalStock = (m.batches || []).reduce((acc, b) => acc + (Number(b.quantity) || 0), 0);
            if (totalStock <= m.reorderLevel) alertCount++;
            (m.batches || []).forEach(b => {
              if (calculateDaysLeft(b.expiryDate) <= 30) alertCount++;
            });
          });
        }
      }

      if (DOM.navNotificationBadge) {
        if (alertCount > 0) {
          DOM.navNotificationBadge.style.display = 'inline-block';
          DOM.navNotificationBadge.textContent = alertCount > 99 ? '99+' : alertCount;
        } else {
          DOM.navNotificationBadge.style.display = 'none';
        }
      }
    } else {
      if (DOM.navUserInfo) DOM.navUserInfo.style.display = 'none';
      if (guestNav) guestNav.style.display = 'inline-flex';
      if (DOM.navNotificationBadge) DOM.navNotificationBadge.style.display = 'none';
    }
  }

  // -------------------------------------------------------------
  // 4. SCREEN 2: MODE CHOOSER (Slide 3)
  // -------------------------------------------------------------
  function renderChooserScreen() {
    const greetingEl = document.getElementById('chooser-greeting');
    const user = AppState.currentUser;
    if (greetingEl && user) {
      greetingEl.innerHTML = `Welcome, <strong>${escapeHTML(user.name)}</strong>. How will you use MedShelf?`;
    }
  }

  // -------------------------------------------------------------
  // 5. SCREEN 3: FAMILY MODE CONTROLLER (Slide 6)
  // -------------------------------------------------------------
  function renderFamilyScreen() {
    const data = getCurrentUserData();
    AppState.userData = data;

    const user = AppState.currentUser;
    const greetingEl = document.getElementById('family-greeting-name');
    if (greetingEl && user) {
      greetingEl.textContent = `Hello, ${user.name} 👋`;
    }

    const medicines = data.familyMedicines || [];

    // 5 Live Counters: Total, Safe, Expiring soon, Expired, Low stock
    let countTotal = medicines.length;
    let countSafe = 0;
    let countExpiring = 0;
    let countExpired = 0;
    let countLowStock = 0;

    medicines.forEach(m => {
      const daysLeft = calculateDaysLeft(m.expiryDate);
      const classification = classifyExpiry(daysLeft);
      if (classification.status === 'SAFE') countSafe++;
      if (classification.status === 'EXPIRING_SOON') countExpiring++;
      if (classification.status === 'EXPIRED') countExpired++;
      if (Number(m.quantity) <= 2) countLowStock++;
    });

    document.getElementById('family-stat-total').textContent = countTotal;
    document.getElementById('family-stat-safe').textContent = countSafe;
    document.getElementById('family-stat-expiring').textContent = countExpiring;
    document.getElementById('family-stat-expired').textContent = countExpired;
    document.getElementById('family-stat-lowstock').textContent = countLowStock;

    // Filter & Search logic
    let filtered = medicines.filter(m => {
      const daysLeft = calculateDaysLeft(m.expiryDate);
      const classification = classifyExpiry(daysLeft);
      const isLowStock = Number(m.quantity) <= 2;

      // Filter by active card selection
      if (AppState.familyFilter === 'SAFE' && classification.status !== 'SAFE') return false;
      if (AppState.familyFilter === 'EXPIRING_SOON' && classification.status !== 'EXPIRING_SOON') return false;
      if (AppState.familyFilter === 'EXPIRED' && classification.status !== 'EXPIRED') return false;
      if (AppState.familyFilter === 'LOW_STOCK' && !isLowStock) return false;

      // Substring search
      if (AppState.familySearch) {
        const query = AppState.familySearch.toLowerCase();
        const matchName = m.name.toLowerCase().includes(query);
        const matchMember = (m.familyMember || '').toLowerCase().includes(query);
        const matchCat = (m.category || '').toLowerCase().includes(query);
        if (!matchName && !matchMember && !matchCat) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (AppState.familySort === 'expiry_soonest') {
        return new Date(a.expiryDate) - new Date(b.expiryDate);
      } else if (AppState.familySort === 'expiry_latest') {
        return new Date(b.expiryDate) - new Date(a.expiryDate);
      } else if (AppState.familySort === 'name_asc') {
        return a.name.localeCompare(b.name);
      } else if (AppState.familySort === 'qty_desc') {
        return Number(b.quantity) - Number(a.quantity);
      }
      return 0;
    });

    // Highlight active card
    document.querySelectorAll('#screen-family .stat-card').forEach(card => {
      const filterAttr = card.getAttribute('data-filter');
      if (filterAttr === AppState.familyFilter) {
        card.classList.add('active-filter');
      } else {
        card.classList.remove('active-filter');
      }
    });

    // Update active filter banner indicator
    const filterBanner = document.getElementById('family-active-filter-bar');
    const filterNameEl = document.getElementById('family-active-filter-name');
    if (filterBanner && filterNameEl) {
      if (AppState.familyFilter !== 'ALL') {
        const filterNames = {
          'SAFE': 'Safe (> 30 days remaining)',
          'EXPIRING_SOON': 'Expiring Soon (≤ 30 days)',
          'EXPIRED': 'Expired medicines',
          'LOW_STOCK': 'Low Stock (2 or fewer units)'
        };
        filterNameEl.textContent = filterNames[AppState.familyFilter] || AppState.familyFilter;
        filterBanner.style.display = 'flex';
      } else {
        filterBanner.style.display = 'none';
      }
    }

    // Update search clear button
    const famClearBtn = document.getElementById('family-search-clear');
    if (famClearBtn) {
      famClearBtn.style.display = AppState.familySearch ? 'block' : 'none';
    }

    // Render cards list
    const listContainer = document.getElementById('family-medicines-list');
    if (!listContainer) return;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💊</div>
          <div class="empty-state-title">No medicines found</div>
          <p class="empty-state-desc">
            ${AppState.familySearch || AppState.familyFilter !== 'ALL' 
              ? 'No medicines match the selected filter or search keyword.' 
              : 'Your family medicine shelf is empty. Add your first medicine to start tracking expiry dates.'}
          </p>
          <button class="btn btn-primary" onclick="window.MedShelfApp.openAddFamilyMedicineModal()">
            + Add Medicine
          </button>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(m => {
      const daysLeft = calculateDaysLeft(m.expiryDate);
      const classification = classifyExpiry(daysLeft);
      const isLowStock = Number(m.quantity) <= 2;

      return `
        <div class="med-card-item">
          <div class="med-card-main">
            <h3 class="med-card-title">${escapeHTML(m.name)}</h3>
            <div class="med-card-meta">
              <span>${escapeHTML(m.category || 'General')}</span>
              <span>&middot;</span>
              <span>for ${escapeHTML(m.familyMember || 'Family')}</span>
              <span>&middot;</span>
              <span>${m.expiryDate} (${classification.relativeText})</span>
            </div>
            <div class="med-card-badges">
              <span class="badge ${classification.badgeClass}">${classification.text}</span>
              ${isLowStock ? '<span class="badge badge-low-stock">Low stock</span>' : ''}
            </div>
          </div>
          
          <div class="med-card-controls">
            <div class="qty-counter-group" title="Quick adjust stock quantity">
              <button class="qty-btn" onclick="window.MedShelfApp.adjustFamilyQty('${m.id}', -1)" ${Number(m.quantity) <= 0 ? 'disabled' : ''}>-</button>
              <span class="qty-display-value">${m.quantity}</span>
              <button class="qty-btn" onclick="window.MedShelfApp.adjustFamilyQty('${m.id}', 1)">+</button>
            </div>
            <button class="btn btn-outline btn-sm" onclick="window.MedShelfApp.openEditFamilyMedicineModal('${m.id}')">Edit</button>
            <button class="btn btn-text-danger btn-sm" onclick="window.MedShelfApp.confirmDeleteFamilyMedicine('${m.id}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function adjustFamilyQty(medicineId, delta) {
    const data = getCurrentUserData();
    const item = (data.familyMedicines || []).find(m => m.id === medicineId);
    if (!item) return;

    item.quantity = Math.max(0, Number(item.quantity) + delta);
    saveCurrentUserData(data);
    renderFamilyScreen();
    showToast(`Updated ${item.name} quantity to ${item.quantity}`);
  }

  // -------------------------------------------------------------
  // 6. SCREEN 4: STORE / HOSPITAL MODE CONTROLLER (Slide 7)
  // -------------------------------------------------------------
  function renderStoreScreen() {
    const data = getCurrentUserData();
    AppState.userData = data;

    const user = AppState.currentUser;
    const headerTitle = document.getElementById('store-user-title');
    const headerSub = document.getElementById('store-user-sub');
    if (headerTitle && user) {
      headerTitle.textContent = `🏥 ${user.name}`;
      headerSub.textContent = `Store / Hospital inventory · MedShelf by ${user.name}`;
    }

    const storeClearBtn = document.getElementById('store-search-clear');
    if (storeClearBtn) {
      storeClearBtn.style.display = AppState.storeSearch ? 'block' : 'none';
    }

    const medicines = data.storeMedicines || [];

    // Calculate Store / Hospital Metrics (Slide 7: 7 live cards)
    let countMedicines = medicines.length;
    let countTotalUnits = 0;
    let countInStock = 0;
    let countLowStock = 0;
    let countOutOfStock = 0;
    let countExpiringBatches = 0;
    let countExpiredBatches = 0;

    const alertsList = [];

    medicines.forEach(m => {
      const batches = m.batches || [];
      const totalUnits = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
      countTotalUnits += totalUnits;

      // Status classification
      if (totalUnits === 0) {
        countOutOfStock++;
        alertsList.push({
          type: 'OUT_OF_STOCK',
          dotClass: 'alert-dot-black',
          html: `<strong>${escapeHTML(m.name)}</strong> is out of stock`
        });
      } else if (totalUnits <= m.reorderLevel) {
        countLowStock++;
        alertsList.push({
          type: 'LOW_STOCK',
          dotClass: 'alert-dot-purple',
          html: `<strong>${escapeHTML(m.name)}</strong> is low: ${totalUnits} ${escapeHTML(m.unit)} left (reorder at ${m.reorderLevel})`
        });
      } else {
        countInStock++;
      }

      // Check each batch
      batches.forEach(b => {
        const daysLeft = calculateDaysLeft(b.expiryDate);
        if (daysLeft < 0) {
          countExpiredBatches++;
          alertsList.push({
            type: 'EXPIRED_BATCH',
            dotClass: 'alert-dot-red',
            html: `<strong>${escapeHTML(m.name)}</strong> batch ${escapeHTML(b.batchNo)} expired (${b.quantity} units): remove from shelf`
          });
        } else if (daysLeft <= 30) {
          countExpiringBatches++;
          alertsList.push({
            type: 'EXPIRING_BATCH',
            dotClass: 'alert-dot-orange',
            html: `<strong>${escapeHTML(m.name)}</strong> batch ${escapeHTML(b.batchNo)} expires in ${daysLeft} day(s) (${b.quantity} units)`
          });
        }
      });
    });

    document.getElementById('store-stat-medicines').textContent = countMedicines;
    document.getElementById('store-stat-units').textContent = countTotalUnits;
    document.getElementById('store-stat-instock').textContent = countInStock;
    document.getElementById('store-stat-lowstock').textContent = countLowStock;
    document.getElementById('store-stat-outstock').textContent = countOutOfStock;
    document.getElementById('store-stat-expiringbatches').textContent = countExpiringBatches;
    document.getElementById('store-stat-expiredbatches').textContent = countExpiredBatches;

    // Render Alerts Panel
    const alertsContainer = document.getElementById('store-alerts-panel');
    const alertsHeader = document.getElementById('store-alerts-title');
    const alertsListEl = document.getElementById('store-alerts-list');

    if (alertsList.length > 0) {
      if (alertsContainer) alertsContainer.style.display = 'block';
      if (alertsHeader) alertsHeader.textContent = `⚠️ Alerts (${alertsList.length})`;
      if (alertsListEl) {
        alertsListEl.innerHTML = alertsList.map(a => `
          <li class="alert-item">
            <span class="alert-dot ${a.dotClass}"></span>
            <span>${a.html}</span>
          </li>
        `).join('');
      }
    } else {
      if (alertsContainer) alertsContainer.style.display = 'none';
    }

    // Tab Switching: Inventory vs Stock Activity
    const invTab = document.getElementById('tab-btn-inventory');
    const actTab = document.getElementById('tab-btn-activity');
    const invSection = document.getElementById('store-inventory-section');
    const actSection = document.getElementById('store-activity-section');

    if (AppState.storeTab === 'INVENTORY') {
      if (invTab) invTab.classList.add('active');
      if (actTab) actTab.classList.remove('active');
      if (invSection) invSection.style.display = 'block';
      if (actSection) actSection.style.display = 'none';
      renderStoreInventoryTable(medicines);
    } else {
      if (invTab) invTab.classList.remove('active');
      if (actTab) actTab.classList.add('active');
      if (invSection) invSection.style.display = 'none';
      if (actSection) actSection.style.display = 'block';
      renderStoreActivityTable(data.stockActivity || []);
    }
  }

  function renderStoreInventoryTable(medicines) {
    let filtered = medicines.filter(m => {
      const batches = m.batches || [];
      const totalUnits = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

      if (AppState.storeFilter === 'IN_STOCK' && (totalUnits === 0 || totalUnits <= m.reorderLevel)) return false;
      if (AppState.storeFilter === 'LOW_STOCK' && (totalUnits === 0 || totalUnits > m.reorderLevel)) return false;
      if (AppState.storeFilter === 'OUT_OF_STOCK' && totalUnits > 0) return false;
      if (AppState.storeFilter === 'EXPIRING_BATCH') {
        const hasExpiring = batches.some(b => {
          const dl = calculateDaysLeft(b.expiryDate);
          return dl >= 0 && dl <= 30;
        });
        if (!hasExpiring) return false;
      }
      if (AppState.storeFilter === 'EXPIRED_BATCH') {
        const hasExpired = batches.some(b => calculateDaysLeft(b.expiryDate) < 0);
        if (!hasExpired) return false;
      }

      if (AppState.storeSearch) {
        const query = AppState.storeSearch.toLowerCase();
        const matchName = m.name.toLowerCase().includes(query);
        const matchCat = (m.category || '').toLowerCase().includes(query);
        const matchBatch = batches.some(b => b.batchNo.toLowerCase().includes(query));
        if (!matchName && !matchCat && !matchBatch) return false;
      }

      return true;
    });

    const tbody = document.getElementById('store-inventory-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
            No inventory records found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(m => {
      const batches = (m.batches || []).slice();
      // Sort batches by earliest expiry date first (FEFO requirement - Slide 7)
      batches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

      const totalUnits = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

      let statusBadge = '<span class="badge badge-in-stock">In stock</span>';
      if (totalUnits === 0) {
        statusBadge = '<span class="badge badge-out-stock">Out of stock</span>';
      } else if (totalUnits <= m.reorderLevel) {
        statusBadge = '<span class="badge badge-low-stock">Low stock</span>';
      }

      let batchesHtml = 'None';
      if (batches.length > 0) {
        batchesHtml = batches.map(b => {
          const dl = calculateDaysLeft(b.expiryDate);
          let relativeSpan = `<span class="status-inline-safe">in ${dl}d</span>`;
          if (dl < 0) {
            relativeSpan = `<span class="status-inline-expired">expired</span>`;
          } else if (dl <= 30) {
            relativeSpan = `<span class="status-inline-soon">${dl === 0 ? 'expires today' : `in ${dl}d`}</span>`;
          }

          return `<div><strong>${escapeHTML(b.batchNo)}</strong> &middot; ${b.quantity} &middot; ${b.expiryDate} ${relativeSpan} &middot; ${escapeHTML(b.supplier || 'Vendor')}</div>`;
        }).join('');
      }

      return `
        <tr>
          <td>
            <div class="tbl-med-name">${escapeHTML(m.name)}</div>
            <div class="tbl-med-sub">${escapeHTML(m.category || 'General')} &middot; reorder at ${m.reorderLevel}</div>
          </td>
          <td>
            <span class="tbl-stock-units">${totalUnits} ${escapeHTML(m.unit || 'Units')}</span>
          </td>
          <td>
            ${statusBadge}
          </td>
          <td>
            <div class="tbl-batch-code">${batchesHtml}</div>
          </td>
          <td class="tbl-actions-cell">
            <button class="btn btn-outline btn-sm" onclick="window.MedShelfApp.openStockInModal('${m.id}')">Stock in</button>
            <button class="btn btn-outline btn-sm" onclick="window.MedShelfApp.openStockOutModal('${m.id}')" ${totalUnits <= 0 ? 'disabled' : ''}>Stock out</button>
            <button class="btn btn-outline btn-sm" onclick="window.MedShelfApp.openEditStoreMedicineModal('${m.id}')">Edit</button>
            <button class="btn btn-text-danger btn-sm" onclick="window.MedShelfApp.confirmDeleteStoreMedicine('${m.id}')">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderStoreActivityTable(activityList) {
    const tbody = document.getElementById('store-activity-tbody');
    if (!tbody) return;

    if (!activityList || activityList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
            No stock activity transactions recorded yet.
          </td>
        </tr>
      `;
      return;
    }

    const sorted = activityList.slice().reverse();
    tbody.innerHTML = sorted.map(act => {
      const isStockIn = act.type === 'STOCK_IN';
      const badge = isStockIn
        ? '<span class="badge badge-safe">Stock In</span>'
        : '<span class="badge badge-expiring">Stock Out</span>';

      return `
        <tr>
          <td>${act.timestamp}</td>
          <td><strong>${escapeHTML(act.medicineName)}</strong></td>
          <td>${badge}</td>
          <td><strong>${act.quantity}</strong> ${escapeHTML(act.unit || '')}</td>
          <td><code>${escapeHTML(act.batchNo || 'N/A')}</code></td>
          <td>${escapeHTML(act.supplier || act.reason || 'General inventory adjustment')}</td>
        </tr>
      `;
    }).join('');
  }

  // -------------------------------------------------------------
  // 7. STOCK MANAGEMENT WITH FEFO (FIRST EXPIRED, FIRST OUT)
  // -------------------------------------------------------------
  function executeStockOut(medicineId, dispenseQty, reason) {
    const data = getCurrentUserData();
    const med = (data.storeMedicines || []).find(m => m.id === medicineId);
    if (!med) return;

    let remainingToDispense = Number(dispenseQty);
    if (isNaN(remainingToDispense) || remainingToDispense <= 0) {
      showToast('Please enter a valid quantity to dispense', 'error');
      return;
    }

    // Sort batches by earliest expiry first (FEFO rule)
    med.batches = med.batches || [];
    med.batches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    const totalAvailable = med.batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    if (remainingToDispense > totalAvailable) {
      showToast(`Cannot dispense ${remainingToDispense} units. Only ${totalAvailable} available!`, 'error');
      return;
    }

    const dispensedBatches = [];

    for (let i = 0; i < med.batches.length; i++) {
      if (remainingToDispense <= 0) break;
      const b = med.batches[i];
      const availableInBatch = Number(b.quantity);

      if (availableInBatch <= remainingToDispense) {
        dispensedBatches.push({ batchNo: b.batchNo, qty: availableInBatch });
        remainingToDispense -= availableInBatch;
        b.quantity = 0;
      } else {
        dispensedBatches.push({ batchNo: b.batchNo, qty: remainingToDispense });
        b.quantity = availableInBatch - remainingToDispense;
        remainingToDispense = 0;
      }
    }

    // Filter out emptied batches
    med.batches = med.batches.filter(b => b.quantity > 0);

    // Record Activity
    data.stockActivity = data.stockActivity || [];
    data.stockActivity.push({
      id: 'act_' + Date.now(),
      timestamp: new Date().toLocaleString(),
      medicineName: med.name,
      type: 'STOCK_OUT',
      quantity: Number(dispenseQty),
      unit: med.unit,
      batchNo: dispensedBatches.map(db => `${db.batchNo} (${db.qty})`).join(', '),
      reason: reason || 'FEFO Patient / Clinical Dispense',
      user: AppState.currentUser.name
    });

    saveCurrentUserData(data);
    closeModal();
    renderStoreScreen();
    showToast(`Successfully dispensed ${dispenseQty} ${med.unit} of ${med.name} (FEFO logic applied)`);
  }

  function executeStockIn(medicineId, batchNo, quantity, expiryDate, supplier) {
    const data = getCurrentUserData();
    const med = (data.storeMedicines || []).find(m => m.id === medicineId);
    if (!med) return;

    const qtyNum = Number(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast('Please enter a valid stock quantity', 'error');
      return;
    }
    if (!batchNo || !expiryDate) {
      showToast('Batch number and expiry date are required', 'error');
      return;
    }

    med.batches = med.batches || [];
    const existingBatch = med.batches.find(b => b.batchNo.toLowerCase() === batchNo.toLowerCase());
    if (existingBatch) {
      existingBatch.quantity = Number(existingBatch.quantity) + qtyNum;
      existingBatch.expiryDate = expiryDate;
      if (supplier) existingBatch.supplier = supplier;
    } else {
      med.batches.push({
        batchNo: batchNo.trim(),
        quantity: qtyNum,
        expiryDate: expiryDate,
        supplier: supplier || 'General Distributor'
      });
    }

    // Record Activity
    data.stockActivity = data.stockActivity || [];
    data.stockActivity.push({
      id: 'act_' + Date.now(),
      timestamp: new Date().toLocaleString(),
      medicineName: med.name,
      type: 'STOCK_IN',
      quantity: qtyNum,
      unit: med.unit,
      batchNo: batchNo.trim(),
      supplier: supplier || 'Purchase Order Restock',
      user: AppState.currentUser.name
    });

    saveCurrentUserData(data);
    closeModal();
    renderStoreScreen();
    showToast(`Added ${qtyNum} ${med.unit} to batch ${batchNo}`);
  }

  // -------------------------------------------------------------
  // 8. MODAL WINDOWS & CONTROLLERS
  // -------------------------------------------------------------
  function openModal(htmlContent, isLarge) {
    if (!DOM.modalBackdrop || !DOM.modalContainer) return;
    DOM.modalContainer.className = isLarge ? 'modal-dialog modal-dialog-lg' : 'modal-dialog';
    DOM.modalContainer.innerHTML = htmlContent;
    DOM.modalBackdrop.classList.add('open');
  }

  function closeModal() {
    if (!DOM.modalBackdrop) return;
    DOM.modalBackdrop.classList.remove('open');
  }

  function openAddFamilyMedicineModal(existingItem) {
    const isEdit = !!existingItem;
    const item = existingItem || {
      name: '',
      category: 'General',
      familyMember: 'Dad',
      expiryDate: formatISODate(addDays(new Date(), 30)),
      quantity: 1,
      description: ''
    };

    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? 'Edit Family Medicine' : '+ Add Family Medicine'}</h3>
        <button class="modal-close-btn" onclick="window.MedShelfApp.closeModal()">&times;</button>
      </div>
      <form id="family-med-form" onsubmit="window.MedShelfApp.handleSaveFamilyMedicine(event, '${isEdit ? item.id : ''}')">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Medicine Name *</label>
            <input type="text" id="fm-name" class="form-input" required value="${escapeHTML(item.name)}" placeholder="e.g. Paracetamol 500mg, Amoxicillin">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="fm-category" class="form-select">
                <option value="General" ${item.category === 'General' ? 'selected' : ''}>General</option>
                <option value="Antibiotic" ${item.category === 'Antibiotic' ? 'selected' : ''}>Antibiotic</option>
                <option value="Allergy" ${item.category === 'Allergy' ? 'selected' : ''}>Allergy</option>
                <option value="Fever & cold" ${item.category === 'Fever & cold' ? 'selected' : ''}>Fever & cold</option>
                <option value="Pain relief" ${item.category === 'Pain relief' ? 'selected' : ''}>Pain relief</option>
                <option value="Diabetes" ${item.category === 'Diabetes' ? 'selected' : ''}>Diabetes</option>
                <option value="Vitamins" ${item.category === 'Vitamins' ? 'selected' : ''}>Vitamins</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Family Member</label>
              <input type="text" id="fm-member" class="form-input" value="${escapeHTML(item.familyMember)}" placeholder="e.g. Dad, Mom, Kids, Grandpa, Self">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">Expiry Date *</label>
              <input type="date" id="fm-expiry" class="form-input" required value="${item.expiryDate}">
            </div>

            <div class="form-group">
              <label class="form-label">Quantity</label>
              <input type="number" id="fm-qty" class="form-input" min="0" required value="${item.quantity}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Notes / Instructions</label>
            <input type="text" id="fm-desc" class="form-input" value="${escapeHTML(item.description || '')}" placeholder="e.g. Take after meals, Keep refrigerated">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="window.MedShelfApp.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update Medicine' : 'Save Medicine'}</button>
        </div>
      </form>
    `;

    openModal(html);
  }

  function handleSaveFamilyMedicine(e, editId) {
    e.preventDefault();
    const name = document.getElementById('fm-name').value.trim();
    const category = document.getElementById('fm-category').value;
    const familyMember = document.getElementById('fm-member').value.trim() || 'Family';
    const expiryDate = document.getElementById('fm-expiry').value;
    const quantity = Number(document.getElementById('fm-qty').value) || 0;
    const description = document.getElementById('fm-desc').value.trim();

    if (!name || !expiryDate) {
      showToast('Medicine name and expiry date are required', 'error');
      return;
    }

    const data = getCurrentUserData();
    data.familyMedicines = data.familyMedicines || [];

    if (editId) {
      const item = data.familyMedicines.find(m => m.id === editId);
      if (item) {
        item.name = name;
        item.category = category;
        item.familyMember = familyMember;
        item.expiryDate = expiryDate;
        item.quantity = quantity;
        item.description = description;
      }
      showToast(`Updated ${name}`);
    } else {
      data.familyMedicines.unshift({
        id: 'fam_' + Date.now(),
        name,
        category,
        familyMember,
        expiryDate,
        quantity,
        description
      });
      showToast(`Added ${name} to Family shelf`);
    }

    saveCurrentUserData(data);
    closeModal();
    renderFamilyScreen();
  }

  function openEditFamilyMedicineModal(id) {
    const data = getCurrentUserData();
    const item = (data.familyMedicines || []).find(m => m.id === id);
    if (item) openAddFamilyMedicineModal(item);
  }

  function confirmDeleteFamilyMedicine(id) {
    const data = getCurrentUserData();
    const item = (data.familyMedicines || []).find(m => m.id === id);
    if (!item) return;

    const html = `
      <div class="modal-header">
        <h3 class="modal-title">Delete Medicine</h3>
        <button class="modal-close-btn" onclick="window.MedShelfApp.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 0.75rem;">Are you sure you want to remove <strong>${escapeHTML(item.name)}</strong> from your shelf?</p>
        <p style="font-size: 0.85rem; color: var(--text-muted);">This action cannot be undone.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="window.MedShelfApp.closeModal()">Cancel</button>
        <button type="button" class="btn btn-text-danger" style="background: var(--expired-bg);" onclick="window.MedShelfApp.executeDeleteFamilyMedicine('${id}')">Delete Permanently</button>
      </div>
    `;
    openModal(html);
  }

  function executeDeleteFamilyMedicine(id) {
    const data = getCurrentUserData();
    data.familyMedicines = (data.familyMedicines || []).filter(m => m.id !== id);
    saveCurrentUserData(data);
    closeModal();
    renderFamilyScreen();
    showToast('Medicine deleted successfully');
  }

  // Store Mode Modals
  function openAddStoreMedicineModal(existingItem) {
    const isEdit = !!existingItem;
    const item = existingItem || {
      name: '',
      category: 'General',
      unit: 'Boxes',
      reorderLevel: 25,
      batches: []
    };

    const html = `
      <div class="modal-header">
        <h3 class="modal-title">${isEdit ? 'Edit Store Medicine' : '+ Add Store / Hospital Medicine'}</h3>
        <button class="modal-close-btn" onclick="window.MedShelfApp.closeModal()">&times;</button>
      </div>
      <form id="store-med-form" onsubmit="window.MedShelfApp.handleSaveStoreMedicine(event, '${isEdit ? item.id : ''}')">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Medicine / Item Name *</label>
            <input type="text" id="sm-name" class="form-input" required value="${escapeHTML(item.name)}" placeholder="e.g. Amoxicillin 250mg, ORS Sachets">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="sm-category" class="form-select">
                <option value="Antibiotic" ${item.category === 'Antibiotic' ? 'selected' : ''}>Antibiotic</option>
                <option value="Allergy" ${item.category === 'Allergy' ? 'selected' : ''}>Allergy</option>
                <option value="Pain relief" ${item.category === 'Pain relief' ? 'selected' : ''}>Pain relief</option>
                <option value="Diabetes" ${item.category === 'Diabetes' ? 'selected' : ''}>Diabetes</option>
                <option value="Hydration" ${item.category === 'Hydration' ? 'selected' : ''}>Hydration</option>
                <option value="Cardiology" ${item.category === 'Cardiology' ? 'selected' : ''}>Cardiology</option>
                <option value="General" ${item.category === 'General' ? 'selected' : ''}>General</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Stock Unit</label>
              <select id="sm-unit" class="form-select">
                <option value="Boxes" ${item.unit === 'Boxes' ? 'selected' : ''}>Boxes</option>
                <option value="Strips" ${item.unit === 'Strips' ? 'selected' : ''}>Strips</option>
                <option value="Vials" ${item.unit === 'Vials' ? 'selected' : ''}>Vials</option>
                <option value="Units" ${item.unit === 'Units' ? 'selected' : ''}>Units</option>
                <option value="Bottles" ${item.unit === 'Bottles' ? 'selected' : ''}>Bottles</option>
                <option value="Ampoules" ${item.unit === 'Ampoules' ? 'selected' : ''}>Ampoules</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Reorder Level Alert (Threshold) *</label>
            <input type="number" id="sm-reorder" class="form-input" min="1" required value="${item.reorderLevel}">
            <span style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem; display: block;">
              MedShelf will issue a low-stock alert when available quantity drops to or below this count.
            </span>
          </div>

          ${!isEdit ? `
          <div style="background: var(--bg-page); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-top: 0.5rem;">
            <span style="font-size: 0.82rem; font-weight: 700; display: block; margin-bottom: 0.35rem; color: var(--primary);">
              Initial Batch Stock (Optional)
            </span>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <input type="text" id="sm-initial-batch" class="form-input" placeholder="Batch No (e.g. BT-01)">
              <input type="number" id="sm-initial-qty" class="form-input" placeholder="Units" min="1">
            </div>
            <div style="margin-top: 0.5rem;">
              <input type="date" id="sm-initial-expiry" class="form-input">
            </div>
          </div>
          ` : ''}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="window.MedShelfApp.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Update Medicine' : 'Save to Inventory'}</button>
        </div>
      </form>
    `;
    openModal(html);
  }

  function handleSaveStoreMedicine(e, editId) {
    e.preventDefault();
    const name = document.getElementById('sm-name').value.trim();
    const category = document.getElementById('sm-category').value;
    const unit = document.getElementById('sm-unit').value;
    const reorderLevel = Number(document.getElementById('sm-reorder').value) || 20;

    if (!name) return;

    const data = getCurrentUserData();
    data.storeMedicines = data.storeMedicines || [];

    if (editId) {
      const item = data.storeMedicines.find(m => m.id === editId);
      if (item) {
        item.name = name;
        item.category = category;
        item.unit = unit;
        item.reorderLevel = reorderLevel;
      }
      showToast(`Updated ${name}`);
    } else {
      const batchNo = document.getElementById('sm-initial-batch') ? document.getElementById('sm-initial-batch').value.trim() : '';
      const qty = document.getElementById('sm-initial-qty') ? Number(document.getElementById('sm-initial-qty').value) : 0;
      const expiry = document.getElementById('sm-initial-expiry') ? document.getElementById('sm-initial-expiry').value : '';

      const batches = [];
      if (batchNo && qty > 0 && expiry) {
        batches.push({
          batchNo: batchNo,
          quantity: qty,
          expiryDate: expiry,
          supplier: 'Initial Entry'
        });
      }

      data.storeMedicines.unshift({
        id: 'st_' + Date.now(),
        name,
        category,
        unit,
        reorderLevel,
        batches
      });

      showToast(`Added ${name} to Store Inventory`);
    }

    saveCurrentUserData(data);
    closeModal();
    renderStoreScreen();
  }

  function openEditStoreMedicineModal(id) {
    const data = getCurrentUserData();
    const item = (data.storeMedicines || []).find(m => m.id === id);
    if (item) openAddStoreMedicineModal(item);
  }

  function confirmDeleteStoreMedicine(id) {
    const data = getCurrentUserData();
    const item = (data.storeMedicines || []).find(m => m.id === id);
    if (!item) return;

    const html = `
      <div class="modal-header">
        <h3 class="modal-title">Delete Store Item</h3>
        <button class="modal-close-btn" onclick="window.MedShelfApp.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to delete <strong>${escapeHTML(item.name)}</strong> and all its recorded batches?</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline" onclick="window.MedShelfApp.closeModal()">Cancel</button>
        <button type="button" class="btn btn-text-danger" style="background: var(--expired-bg);" onclick="window.MedShelfApp.executeDeleteStoreMedicine('${id}')">Delete Item</button>
      </div>
    `;
    openModal(html);
  }

  function executeDeleteStoreMedicine(id) {
    const data = getCurrentUserData();
    data.storeMedicines = (data.storeMedicines || []).filter(m => m.id !== id);
    saveCurrentUserData(data);
    closeModal();
    renderStoreScreen();
    showToast('Store inventory item deleted');
  }

  function openStockInModal(id) {
    const data = getCurrentUserData();
    const item = (data.storeMedicines || []).find(m => m.id === id);
    if (!item) return;

    const todayStr = formatISODate(new Date());
    const defaultExp = formatISODate(addDays(new Date(), 365));

    const html = `
      <div class="modal-header">
        <h3 class="modal-title">Stock In: ${escapeHTML(item.name)}</h3>
        <button class="modal-close-btn" onclick="window.MedShelfApp.closeModal()">&times;</button>
      </div>
      <form onsubmit="event.preventDefault(); window.MedShelfApp.executeStockIn('${id}', document.getElementById('si-batch').value, document.getElementById('si-qty').value, document.getElementById('si-expiry').value, document.getElementById('si-supplier').value);">
        <div class="modal-body">
          <div style="background: var(--primary-light); padding: 0.75rem 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; font-size: 0.85rem;">
            Item: <strong>${escapeHTML(item.name)}</strong> &middot; Unit: <strong>${escapeHTML(item.unit)}</strong>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">Batch Code / Lot No *</label>
              <input type="text" id="si-batch" class="form-input" required placeholder="e.g. BT-99, PC-204">
            </div>

            <div class="form-group">
              <label class="form-label">Quantity to Add (${escapeHTML(item.unit)}) *</label>
              <input type="number" id="si-qty" class="form-input" min="1" required placeholder="Units count">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label">Batch Expiry Date *</label>
              <input type="date" id="si-expiry" class="form-input" required value="${defaultExp}">
            </div>

            <div class="form-group">
              <label class="form-label">Supplier / Distributor</label>
              <input type="text" id="si-supplier" class="form-input" placeholder="e.g. MediSupply Ltd, CareDist">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="window.MedShelfApp.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Confirm Stock In</button>
        </div>
      </form>
    `;
    openModal(html);
  }

  function openStockOutModal(id) {
    const data = getCurrentUserData();
    const item = (data.storeMedicines || []).find(m => m.id === id);
    if (!item) return;

    const batches = (item.batches || []).slice();
    batches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    const totalAvailable = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

    const earliestBatch = batches[0];

    const html = `
      <div class="modal-header">
        <h3 class="modal-title">Stock Out: ${escapeHTML(item.name)}</h3>
        <button class="modal-close-btn" onclick="window.MedShelfApp.closeModal()">&times;</button>
      </div>
      <form onsubmit="event.preventDefault(); window.MedShelfApp.executeStockOut('${id}', document.getElementById('so-qty').value, document.getElementById('so-reason').value);">
        <div class="modal-body">
          <div style="background: var(--bg-page); border: 1px solid var(--border-color); padding: 0.85rem; border-radius: var(--radius-md); margin-bottom: 1rem; font-size: 0.85rem;">
            <div>Available Total Stock: <strong>${totalAvailable} ${escapeHTML(item.unit)}</strong></div>
            ${earliestBatch ? `
              <div style="margin-top: 0.4rem; color: var(--primary); font-weight: 600;">
                ⭐ FEFO Auto-Select: Batch <code>${escapeHTML(earliestBatch.batchNo)}</code> (Expires: ${earliestBatch.expiryDate}, ${earliestBatch.quantity} available)
              </div>
            ` : '<div style="color: var(--expired);">No active batches available!</div>'}
          </div>

          <div class="form-group">
            <label class="form-label">Quantity to Dispense (${escapeHTML(item.unit)}) *</label>
            <input type="number" id="so-qty" class="form-input" min="1" max="${totalAvailable}" required placeholder="e.g. 5">
          </div>

          <div class="form-group">
            <label class="form-label">Reason / Reference</label>
            <input type="text" id="so-reason" class="form-input" placeholder="e.g. Patient Prescription #402, Internal Ward Transfer">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline" onclick="window.MedShelfApp.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" ${totalAvailable <= 0 ? 'disabled' : ''}>Dispense Stock Out</button>
        </div>
      </form>
    `;
    openModal(html);
  }

  // -------------------------------------------------------------
  // 9. FUTURE ENHANCEMENTS MODAL (Slide 8)
  // -------------------------------------------------------------
  function openFutureEnhancementsModal() {
    const html = `
      <div class="modal-header">
        <h3 class="modal-title">✨ Future Enhancements (Slide 8)</h3>
        <button class="modal-close-btn" onclick="window.MedShelfApp.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="enhancements-grid">
          
          <div class="enhancement-card" onclick="window.MedShelfApp.demoBarcodeScanner()">
            <div class="enhancement-icon">📷</div>
            <div class="enhancement-title">Barcode Scan</div>
            <div class="enhancement-desc">Scan medicine strips to auto-identify name, category & standard dosage. Click to test live simulator.</div>
          </div>

          <div class="enhancement-card" onclick="window.MedShelfApp.demoOCRExpiry()">
            <div class="enhancement-icon">🔍</div>
            <div class="enhancement-title">OCR Expiry Reading</div>
            <div class="enhancement-desc">Optical character recognition extracts printed EXP dates from medicine boxes automatically.</div>
          </div>

          <div class="enhancement-card" onclick="window.MedShelfApp.demoReminders()">
            <div class="enhancement-icon">🔔</div>
            <div class="enhancement-title">Smart Reminders</div>
            <div class="enhancement-desc">Automatic warnings at 60, 30 and 7 days with safe disposal guidelines.</div>
          </div>

          <div class="enhancement-card" onclick="window.print()">
            <div class="enhancement-icon">📄</div>
            <div class="enhancement-title">PDF / Print Export</div>
            <div class="enhancement-desc">Export current medicine schedule and expiry report to share with doctors or caregivers.</div>
          </div>

          <div class="enhancement-card" onclick="window.MedShelfApp.exportJSONBackup()">
            <div class="enhancement-icon">☁️</div>
            <div class="enhancement-title">Cloud Sync & Backup</div>
            <div class="enhancement-desc">Export or restore your full medicine shelf backup across phones and laptops.</div>
          </div>

          <div class="enhancement-card" onclick="window.MedShelfApp.demoDrugLookup()">
            <div class="enhancement-icon">🔎</div>
            <div class="enhancement-title">Drug-Name Lookup</div>
            <div class="enhancement-desc">Integrated reference data from openFDA and RxNorm for warnings and interactions.</div>
          </div>

          <div class="enhancement-card" onclick="window.MedShelfApp.demoLanguageToggle()">
            <div class="enhancement-icon">🌐</div>
            <div class="enhancement-title">Regional Languages</div>
            <div class="enhancement-desc">Multi-lingual interface supporting Tamil (தமிழ்) and Hindi (हिन्दी) for wider accessibility.</div>
          </div>

          <div class="enhancement-card" onclick="window.MedShelfApp.demoSmartCabinet()">
            <div class="enhancement-icon">📦</div>
            <div class="enhancement-title">Smart Cabinet</div>
            <div class="enhancement-desc">IoT-connected domestic medicine box with door sensors and temperature monitoring.</div>
          </div>

        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" onclick="window.MedShelfApp.closeModal()">Close</button>
      </div>
    `;
    openModal(html, true);
  }

  // -------------------------------------------------------------
  // 10. PROJECT TEAM & GUIDE CREDITS (Slide 1 & Slide 9)
  // -------------------------------------------------------------
  function openProjectCreditsModal() {
    const html = `
      <div class="modal-header">
        <h3 class="modal-title">🎓 CS25S01 Project Presentation Details</h3>
        <button class="modal-close-btn" onclick="window.MedShelfApp.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div style="text-align: center; margin-bottom: 1.25rem;">
          <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em;">
            MINI PROJECT &middot; CS25S01 SKILL DEVELOPMENT COURSE I
          </div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin: 0.25rem 0;">
            MedShelf &mdash; Smart Medicine Expiry Tracker
          </h2>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            J. J. College of Engineering and Technology, Tiruchirappalli &middot; November 2026
          </div>
        </div>

        <div class="credits-box">
          <div class="credits-title">👥 Project Team Members:</div>
          <div class="credits-team-list">
            <div><strong>Reena Jency V</strong><br><small>Roll: 811325104172</small></div>
            <div><strong>Reshma A</strong><br><small>Roll: 811325104173</small></div>
            <div><strong>Nisha K</strong><br><small>Roll: 811325104144</small></div>
            <div><strong>Poojasri S</strong><br><small>Roll: 811325104152</small></div>
          </div>

          <div class="credits-guide">
            <strong>Project Guide:</strong> Mrs. T. Keerthana Jerine, M.E.<br>
            <small>Assistant Professor, Department of Computer Science and Engineering</small>
          </div>
        </div>

        <div style="margin-top: 1.25rem; font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5;">
          <strong>Slide 5 Technology Architecture:</strong> Built using HTML5, CSS3 responsive layouts, ES6 JavaScript, localStorage isolated per user, and SHA-256 cryptographic password hashing. Runs in all systems and browsers!
        </div>

        <div style="margin-top: 0.75rem; font-size: 0.78rem; color: #92400e; background: #fffbeb; padding: 0.5rem; border-radius: 6px;">
          <strong>Medical Disclaimer:</strong> MedShelf only helps to organise medicines. Please ask a pharmacist or doctor for medical advice.
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" onclick="window.MedShelfApp.closeModal()">Close</button>
      </div>
    `;
    openModal(html);
  }

  // -------------------------------------------------------------
  // 11. USER AUTHENTICATION & LOGIN HANDLERS
  // -------------------------------------------------------------
  function showAuthAlert(message, type = 'error') {
    const alertBox = document.getElementById('auth-alert-box');
    if (!alertBox) return;
    const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    alertBox.className = `auth-alert ${type}`;
    alertBox.innerHTML = `<span>${icon}</span><span>${escapeHTML(message)}</span>`;
    alertBox.style.display = 'flex';
  }

  function clearAuthAlert() {
    const alertBox = document.getElementById('auth-alert-box');
    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.innerHTML = '';
    }
  }

  function togglePasswordVisibility(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (btnEl) btnEl.textContent = '🙈';
    } else {
      input.type = 'password';
      if (btnEl) btnEl.textContent = '👁️';
    }
  }

  function quickFillDemo() {
    if (typeof showAuthTab === 'function') {
      showAuthTab('login');
    }
    const emailInput = document.getElementById('login-email');
    const pwdInput = document.getElementById('login-password');
    if (emailInput) emailInput.value = 'reena@example.com';
    if (pwdInput) {
      pwdInput.value = 'Reena@123';
      pwdInput.focus();
    }
    showAuthAlert('Demo credentials filled: reena@example.com / Reena@123. Click "Sign In →" to sign in.', 'info');
  }

  async function handleLogin(email, password, rememberMe = false) {
    clearAuthAlert();

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = password || '';

    if (!cleanEmail || !cleanPassword) {
      showAuthAlert('Please provide both your email address and password.', 'error');
      showToast('Please provide both email and password', 'error');
      return;
    }

    let users = [];
    try {
      users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
    } catch (e) {
      users = [];
    }

    // Look up user by email (supports reena@example.com and reena@medshelf.com)
    const user = users.find(u => {
      const uEmail = (u.email || '').toLowerCase();
      return uEmail === cleanEmail || 
             (cleanEmail === 'reena@medshelf.com' && uEmail === 'reena@example.com') ||
             (cleanEmail === 'reena@example.com' && uEmail === 'reena@medshelf.com');
    });

    if (!user) {
      showAuthAlert('No user found with this email. Please check your spelling or click "Create Account".', 'error');
      showToast('No user found with this email', 'error');
      return;
    }

    const hashed = window.MedShelfCrypto ? await window.MedShelfCrypto.hash(cleanPassword) : cleanPassword;
    const syncHashed = window.MedShelfCrypto ? window.MedShelfCrypto.hashSync(cleanPassword) : cleanPassword;

    // Verify password against SHA-256 hash, sync hash, plain text or demo credentials
    const isMatch = (user.passwordHash && (user.passwordHash === hashed || user.passwordHash === syncHashed)) ||
                    (user.password && user.password === cleanPassword) ||
                    (user.passwordHash === 'demo_hash') ||
                    (user.email.includes('reena') && (cleanPassword === 'Reena@123' || cleanPassword === 'password123'));

    if (!isMatch) {
      showAuthAlert('Incorrect password. Please verify and try again.', 'error');
      showToast('Incorrect password. Please try again.', 'error');
      return;
    }

    // Establish authenticated session
    AppState.currentUser = user;
    AppState.userData = getCurrentUserData();

    // Store active session in sessionStorage so it ends when the browser/tab closes
    sessionStorage.setItem(STORAGE_KEYS.SESSION_USER, user.id);

    // If remember me is checked, also save to localStorage
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_USER, user.id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_USER);
    }

    // Clear password input
    const pwdInput = document.getElementById('login-password');
    if (pwdInput) pwdInput.value = '';

    showToast(`Signed in successfully as ${user.name}`);
    switchScreen('CHOOSER');
  }

  async function handleRegister(name, email, password, confirmPassword) {
    clearAuthAlert();

    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = password || '';
    const cleanConfirm = confirmPassword || '';

    if (!cleanName || cleanName.length < 2) {
      showAuthAlert('Please enter your full name (minimum 2 characters).', 'error');
      showToast('Please enter your full name', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      showAuthAlert('Please enter a valid email address (e.g. name@example.com).', 'error');
      showToast('Please enter a valid email address', 'error');
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      showAuthAlert('Password must be at least 6 characters long.', 'error');
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    if (cleanPassword !== cleanConfirm) {
      showAuthAlert('Passwords do not match. Please re-enter carefully.', 'error');
      showToast('Passwords do not match', 'error');
      return;
    }

    let users = [];
    try {
      users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
    } catch (e) {
      users = [];
    }

    if (users.some(u => (u.email || '').toLowerCase() === cleanEmail)) {
      showAuthAlert('An account already exists with this email address. Please sign in instead.', 'error');
      showToast('An account already exists with this email', 'error');
      return;
    }

    const hashed = window.MedShelfCrypto ? await window.MedShelfCrypto.hash(cleanPassword) : cleanPassword;
    const newUser = {
      id: 'usr_' + Date.now(),
      name: cleanName,
      email: cleanEmail,
      passwordHash: hashed,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // Fresh user account starts with 0 items (as specified in presentation rules!)
    const freshUserData = {
      currentMode: 'CHOOSER',
      familyMedicines: [],
      storeMedicines: [],
      stockActivity: []
    };
    localStorage.setItem(STORAGE_KEYS.USER_PREFIX + newUser.id, JSON.stringify(freshUserData));

    // Reset registration form
    const regForm = document.getElementById('form-register');
    if (regForm) regForm.reset();

    // Switch to Sign In tab and pre-fill email
    if (typeof showAuthTab === 'function') {
      showAuthTab('login');
    }
    const loginEmailInput = document.getElementById('login-email');
    if (loginEmailInput) {
      loginEmailInput.value = cleanEmail;
    }
    const loginPwdInput = document.getElementById('login-password');
    if (loginPwdInput) {
      loginPwdInput.value = '';
      loginPwdInput.focus();
    }

    showAuthAlert(`Account created successfully for ${cleanName}! Please sign in with your email and password.`, 'success');
    showToast(`Account created! Please sign in with your credentials.`, 'success');
  }

  function handleLoginFormSubmit() {
    const email = document.getElementById('login-email') ? document.getElementById('login-email').value : '';
    const password = document.getElementById('login-password') ? document.getElementById('login-password').value : '';
    const remember = document.getElementById('login-remember') ? document.getElementById('login-remember').checked : false;
    handleLogin(email, password, remember);
  }

  function handleRegisterFormSubmit() {
    const name = document.getElementById('reg-name') ? document.getElementById('reg-name').value : '';
    const email = document.getElementById('reg-email') ? document.getElementById('reg-email').value : '';
    const password = document.getElementById('reg-password') ? document.getElementById('reg-password').value : '';
    const confirmPassword = document.getElementById('reg-confirm-password') ? document.getElementById('reg-confirm-password').value : '';
    handleRegister(name, email, password, confirmPassword);
  }

  function handleLogout() {
    AppState.currentUser = null;
    AppState.userData = null;
    AppState.familyFilter = 'ALL';
    AppState.familySearch = '';
    AppState.storeFilter = 'ALL';
    AppState.storeSearch = '';

    // Clear active session
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_USER);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_USER);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);

    // Clear inputs
    const pwdLogin = document.getElementById('login-password');
    if (pwdLogin) pwdLogin.value = '';
    const pwdReg = document.getElementById('reg-password');
    if (pwdReg) pwdReg.value = '';
    const pwdConfirm = document.getElementById('reg-confirm-password');
    if (pwdConfirm) pwdConfirm.value = '';

    clearAuthAlert();
    showToast('Signed out of MedShelf');
    switchScreen('AUTH');
    if (typeof showAuthTab === 'function') {
      showAuthTab('login');
    }
  }

  function handleDemoLoginReena() {
    clearAuthAlert();
    const reena = initDefaultUser();
    AppState.currentUser = reena;
    AppState.userData = getCurrentUserData();
    sessionStorage.setItem(STORAGE_KEYS.SESSION_USER, reena.id);
    showToast('Welcome, Reena! Demo account loaded with presentation data.');
    switchScreen('CHOOSER');
  }

  function handleBrandClick() {
    if (AppState.currentUser) {
      switchScreen('CHOOSER');
    } else {
      switchScreen('AUTH');
    }
  }

  function clearFamilySearch() {
    const famSearch = document.getElementById('family-search-input');
    const clearBtn = document.getElementById('family-search-clear');
    if (famSearch) {
      famSearch.value = '';
      AppState.familySearch = '';
    }
    if (clearBtn) clearBtn.style.display = 'none';
    renderFamilyScreen();
  }

  function clearStoreSearch() {
    const storeSearch = document.getElementById('store-search-input');
    const clearBtn = document.getElementById('store-search-clear');
    if (storeSearch) {
      storeSearch.value = '';
      AppState.storeSearch = '';
    }
    if (clearBtn) clearBtn.style.display = 'none';
    renderStoreScreen();
  }

  function setFamilyFilter(filter) {
    AppState.familyFilter = filter;
    renderFamilyScreen();
  }

  // -------------------------------------------------------------
  // 12. UTILITIES & TOAST FEEDBACK
  // -------------------------------------------------------------
  function showToast(message, type = 'success') {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span>${icon}</span><span>${escapeHTML(message)}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function exportJSONBackup() {
    const data = getCurrentUserData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medshelf-backup-${AppState.currentUser ? AppState.currentUser.name : 'shelf'}-${formatISODate(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded JSON medicine shelf backup!');
  }

  // Demo future enhancement simulators
  function demoBarcodeScanner() {
    const commonMeds = [
      { name: 'Cetirizine 10mg', category: 'Allergy', code: '8901030382910' },
      { name: 'Amoxicillin 500mg', category: 'Antibiotic', code: '8901117040214' },
      { name: 'Paracetamol 650mg (Dolo)', category: 'General', code: '8901117001406' },
      { name: 'Azithromycin 500mg', category: 'Antibiotic', code: '8901234567890' }
    ];
    const picked = commonMeds[Math.floor(Math.random() * commonMeds.length)];
    showToast(`Scanned Barcode: [${picked.code}] -> Detected: ${picked.name} (${picked.category})!`);
  }

  function demoOCRExpiry() {
    showToast('OCR Camera Scanner: Analyzed medicine package -> Extracted EXP: 11/2027!');
  }

  function demoReminders() {
    showToast('Smart Reminders Active: 60d, 30d, and 7d notifications scheduled.');
  }

  function demoDrugLookup() {
    showToast('openFDA / RxNorm: Verified active ingredients and contraindications.');
  }

  function demoLanguageToggle() {
    showToast('Language preference: English / தமிழ் / हिन्दी ready for localization.');
  }

  function demoSmartCabinet() {
    showToast('Smart Cabinet Sensor: Shelf temperature is 22°C (Optimal medicine storage).');
  }

  // -------------------------------------------------------------
  // 13. INITIALIZATION ON PAGE LOAD
  // -------------------------------------------------------------
  function init() {
    cacheDOMElements();
    const defaultReena = initDefaultUser();

    // Check if there was an active session in sessionStorage or remembered in localStorage
    const savedUserId = sessionStorage.getItem(STORAGE_KEYS.SESSION_USER) || 
                        localStorage.getItem(STORAGE_KEYS.REMEMBER_USER);

    if (savedUserId) {
      let users = [];
      try {
        users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
      } catch (e) {
        users = [];
      }
      const activeUser = users.find(u => u.id === savedUserId);
      if (activeUser) {
        AppState.currentUser = activeUser;
        AppState.userData = getCurrentUserData();
        switchScreen('CHOOSER');
      } else {
        AppState.currentUser = null;
        AppState.userData = null;
        switchScreen('AUTH');
        if (typeof showAuthTab === 'function') showAuthTab('login');
      }
    } else {
      AppState.currentUser = null;
      AppState.userData = null;
      switchScreen('AUTH');
      if (typeof showAuthTab === 'function') showAuthTab('login');
    }

    // Attach search and filter event listeners
    const famSearch = document.getElementById('family-search-input');
    const famClear = document.getElementById('family-search-clear');
    if (famSearch) {
      famSearch.addEventListener('input', (e) => {
        AppState.familySearch = e.target.value.trim();
        if (famClear) {
          famClear.style.display = AppState.familySearch ? 'block' : 'none';
        }
        renderFamilyScreen();
      });
    }

    const famSort = document.getElementById('family-sort-select');
    if (famSort) {
      famSort.addEventListener('change', (e) => {
        AppState.familySort = e.target.value;
        renderFamilyScreen();
      });
    }

    const storeSearch = document.getElementById('store-search-input');
    const storeClear = document.getElementById('store-search-clear');
    if (storeSearch) {
      storeSearch.addEventListener('input', (e) => {
        AppState.storeSearch = e.target.value.trim();
        if (storeClear) {
          storeClear.style.display = AppState.storeSearch ? 'block' : 'none';
        }
        renderStoreScreen();
      });
    }

    const storeFilter = document.getElementById('store-filter-select');
    if (storeFilter) {
      storeFilter.addEventListener('change', (e) => {
        AppState.storeFilter = e.target.value;
        renderStoreScreen();
      });
    }

    // Interactive card filters for Family Mode (Slide 6: "Tap a card to filter the list")
    document.querySelectorAll('#screen-family .stat-card').forEach(card => {
      card.addEventListener('click', () => {
        const filterAttr = card.getAttribute('data-filter') || 'ALL';
        AppState.familyFilter = AppState.familyFilter === filterAttr ? 'ALL' : filterAttr;
        renderFamilyScreen();
      });
    });

    // Close modal on backdrop click
    if (DOM.modalBackdrop) {
      DOM.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === DOM.modalBackdrop) closeModal();
      });
    }

    // ESC key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // Expose Public API to Window for inline HTML onclick handlers
  window.MedShelfApp = {
    init,
    switchScreen,
    handleLogin,
    handleRegister,
    handleLoginFormSubmit,
    handleRegisterFormSubmit,
    handleLogout,
    handleDemoLoginReena,
    quickFillDemo,
    togglePasswordVisibility,
    showAuthAlert,
    clearAuthAlert,
    handleBrandClick,
    clearFamilySearch,
    clearStoreSearch,
    setFamilyFilter,
    adjustFamilyQty,
    openAddFamilyMedicineModal,
    openEditFamilyMedicineModal,
    confirmDeleteFamilyMedicine,
    executeDeleteFamilyMedicine,
    handleSaveFamilyMedicine,
    openAddStoreMedicineModal,
    openEditStoreMedicineModal,
    confirmDeleteStoreMedicine,
    executeDeleteStoreMedicine,
    handleSaveStoreMedicine,
    openStockInModal,
    openStockOutModal,
    executeStockIn,
    executeStockOut,
    setStoreTab: (tab) => {
      AppState.storeTab = tab;
      renderStoreScreen();
    },
    openFutureEnhancementsModal,
    openProjectCreditsModal,
    closeModal,
    exportJSONBackup,
    demoBarcodeScanner,
    demoOCRExpiry,
    demoReminders,
    demoDrugLookup,
    demoLanguageToggle,
    demoSmartCabinet
  };

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
