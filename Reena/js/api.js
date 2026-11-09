/**
 * MEDSHELF - Full-Stack & Standalone Smart Medicine Expiry Tracker
 * Module: API Client & Resilient Multi-User Session Manager (frontend/js/api.js)
 * 
 * Capabilities:
 * 1. Automatically connects to live Node.js / MySQL backend if available.
 * 2. Seamlessly falls back to an in-browser isolated multi-user database
 *    when deployed statically (e.g. GitHub Pages, ship.place, Netlify).
 * 3. Enforces strict zero-count initialization for newly registered accounts.
 * 4. Pre-configures the personalized profile for Reena.
 */

const MedShelfAPI = (function () {
  'use strict';

  const TOKEN_KEY = 'medshelf_jwt_token';
  const USER_KEY = 'medshelf_user_data';
  const API_OVERRIDE_KEY = 'medshelf_custom_api_url';
  const MOCK_USERS_KEY = 'medshelf_app_users_v3';
  const MOCK_MEDS_PREFIX = 'medshelf_user_inventory_';

  // Pre-seed default user Reena and demo medicines
  function initMockStore() {
    try {
      const existing = localStorage.getItem(MOCK_USERS_KEY);
      if (!existing) {
        const defaultUsers = [
          {
            id: 1,
            fullName: 'Reena',
            email: 'reena@medshelf.com',
            password: 'password123'
          }
        ];
        localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(defaultUsers));
      }

      // Pre-seed Reena's personal shelf if not yet initialized
      const reenaMedsKey = MOCK_MEDS_PREFIX + '1';
      if (!localStorage.getItem(reenaMedsKey)) {
        const today = new Date();
        function fmt(d) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        function offset(days) {
          const d = new Date(today);
          d.setDate(d.getDate() + days);
          return fmt(d);
        }

        const samples = [
          { name: 'Paracetamol 500mg', expiryDate: offset(180), quantity: 12, familyMember: 'Reena', category: 'Pain Relief & Fever', description: 'Take 1 tablet after food for fever or pain' },
          { name: 'Cetirizine 10mg', expiryDate: offset(14), quantity: 2, familyMember: 'Reena', category: 'Fever & Cold', description: 'Night-time allergy relief' },
          { name: 'Amoxicillin 250mg', expiryDate: offset(-8), quantity: 1, familyMember: 'Reena', category: 'Antibiotics', description: 'Completed course - expired, dispose safely' },
          { name: 'Vitamin C 500mg (Zinc)', expiryDate: offset(320), quantity: 24, familyMember: 'Reena', category: 'Vitamins & Supplements', description: 'Daily immunity chewable' },
          { name: 'Digene Gel Antacid', expiryDate: offset(5), quantity: 1, familyMember: 'Mom', category: 'Gastrointestinal & Digestion', description: 'After meals for acidity' }
        ];

        const initialReenaMeds = samples.map((s, idx) => {
          const days = calculateDaysLeft(s.expiryDate);
          return {
            id: 1001 + idx,
            userId: 1,
            name: s.name,
            expiryDate: s.expiryDate,
            quantity: s.quantity,
            familyMember: s.familyMember,
            category: s.category,
            description: s.description,
            daysLeft: days,
            expiryStatus: classifyStatus(days),
            expiryHumanText: getHumanText(days),
            isLowStock: s.quantity <= 2,
            createdAt: new Date().toISOString()
          };
        });

        localStorage.setItem(reenaMedsKey, JSON.stringify(initialReenaMeds));
      }
    } catch (e) {
      console.warn('Storage init warning:', e);
    }
  }
  initMockStore();

  function getBaseUrl() {
    const override = localStorage.getItem(API_OVERRIDE_KEY);
    if (override) return override.replace(/\/+$/, '');

    if (window.location.protocol === 'file:') {
      return 'http://localhost:5000/api';
    }

    return window.location.origin + '/api';
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  }

  function getUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isAuthenticated() {
    return !!getToken();
  }

  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  function requireGuest(autoRedirect = false) {
    if (autoRedirect && isAuthenticated()) {
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  }

  // Helper date math for client calculations
  function calculateDaysLeft(expiryDateStr) {
    if (!expiryDateStr) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = expiryDateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const expDate = new Date(year, month, day, 0, 0, 0, 0);
      const diffTime = expDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    const d = new Date(expiryDateStr);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  function classifyStatus(daysLeft) {
    if (daysLeft < 0) return 'EXPIRED';
    if (daysLeft <= 30) return 'EXPIRING_SOON';
    return 'SAFE';
  }

  function getHumanText(daysLeft) {
    if (daysLeft < 0) {
      const abs = Math.abs(daysLeft);
      return abs === 1 ? 'Expired yesterday' : `Expired ${abs} days ago`;
    }
    if (daysLeft === 0) return 'Expires today!';
    if (daysLeft === 1) return 'Expires tomorrow!';
    return `${daysLeft} days remaining`;
  }

  function getUserMedicinesKey(userId) {
    return MOCK_MEDS_PREFIX + (userId || 'guest');
  }

  function getUserMedicines(userId) {
    try {
      const raw = localStorage.getItem(getUserMedicinesKey(userId));
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveUserMedicines(userId, meds) {
    localStorage.setItem(getUserMedicinesKey(userId), JSON.stringify(meds));
  }

  /**
   * Client-side In-Browser Backend Engine
   * Executes seamlessly when deployed online without requiring an active Node server.
   */
  async function handleMockBackend(endpoint, options = {}) {
    await new Promise(r => setTimeout(r, 60)); // subtle network feel
    const method = (options.method || 'GET').toUpperCase();
    let body = {};
    if (options.body) {
      try { body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body; } catch(e){}
    }

    const cleanEndpoint = endpoint.split('?')[0];
    const urlParams = new URLSearchParams(endpoint.includes('?') ? endpoint.split('?')[1] : '');
    const currentUser = getUser();
    const userId = currentUser ? currentUser.id : null;

    // 1. Auth: Login
    if (cleanEndpoint === '/auth/login' && method === 'POST') {
      const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';

      const match = users.find(u => u.email.toLowerCase() === email && u.password === password);
      if (match) {
        return {
          success: true,
          message: 'Login successful',
          token: 'medshelf_token_' + match.id + '_' + Date.now(),
          user: { id: match.id, fullName: match.fullName, email: match.email }
        };
      }
      return { success: false, message: 'Invalid email or password.' };
    }

    // 2. Auth: Register (New accounts start strictly at 0)
    if (cleanEndpoint === '/auth/register' && method === 'POST') {
      const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || '[]');
      const email = (body.email || '').trim().toLowerCase();
      const fullName = (body.fullName || '').trim() || 'User';
      const password = body.password || '';

      if (users.some(u => u.email.toLowerCase() === email)) {
        return { success: false, message: 'An account with this email address already exists.' };
      }

      const newUser = {
        id: Date.now(),
        fullName,
        email,
        password
      };
      users.push(newUser);
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));

      // STRICT REQUIREMENT: Initialize empty inventory array (0 counts)
      saveUserMedicines(newUser.id, []);

      return {
        success: true,
        message: 'Account created successfully! Please sign in.',
        user: { id: newUser.id, fullName: newUser.fullName, email: newUser.email }
      };
    }

    // 3. Auth: Current Profile
    if (cleanEndpoint === '/auth/me') {
      if (!currentUser) return { success: false, message: 'Not authenticated' };
      return { success: true, user: currentUser };
    }

    // 4. Dashboard: Real-time Stats
    if (cleanEndpoint === '/dashboard/stats') {
      if (!userId) return { success: false, message: 'Unauthorized' };
      const meds = getUserMedicines(userId);

      let safe = 0;
      let expiring = 0;
      let expired = 0;
      let lowStock = 0;

      meds.forEach(m => {
        const days = calculateDaysLeft(m.expiryDate);
        if (days < 0) expired++;
        else if (days <= 30) expiring++;
        else safe++;

        if (m.quantity <= 2) lowStock++;
      });

      return {
        success: true,
        stats: {
          totalMedicines: meds.length,
          safeMedicines: safe,
          expiringSoon: expiring,
          expiredMedicines: expired,
          lowStockMedicines: lowStock,
          recentMedicines: meds.slice(0, 5)
        }
      };
    }

    // 5. Medicines: List with filters & sorting
    if (cleanEndpoint === '/medicines' && method === 'GET') {
      if (!userId) return { success: false, message: 'Unauthorized' };
      let meds = getUserMedicines(userId).map(m => {
        const days = calculateDaysLeft(m.expiryDate);
        return {
          ...m,
          daysLeft: days,
          expiryStatus: classifyStatus(days),
          expiryHumanText: getHumanText(days),
          isLowStock: m.quantity <= 2
        };
      });

      // Filter by Status
      const statusParam = urlParams.get('status');
      if (statusParam && statusParam !== 'ALL') {
        if (statusParam === 'LOW_STOCK') {
          meds = meds.filter(m => m.isLowStock);
        } else {
          meds = meds.filter(m => m.expiryStatus === statusParam);
        }
      }

      // Filter by Family
      const familyParam = urlParams.get('family');
      if (familyParam && familyParam !== 'ALL') {
        meds = meds.filter(m => (m.familyMember || 'General') === familyParam);
      }

      // Filter by Category
      const catParam = urlParams.get('category');
      if (catParam && catParam !== 'ALL') {
        meds = meds.filter(m => m.category === catParam);
      }

      // Search Query
      const q = (urlParams.get('search') || '').trim().toLowerCase();
      if (q) {
        meds = meds.filter(m => 
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.category && m.category.toLowerCase().includes(q)) ||
          (m.familyMember && m.familyMember.toLowerCase().includes(q)) ||
          (m.description && m.description.toLowerCase().includes(q))
        );
      }

      // Sort
      const sortBy = urlParams.get('sort') || 'expiry-asc';
      meds.sort((a, b) => {
        if (sortBy === 'expiry-asc') return a.daysLeft - b.daysLeft;
        if (sortBy === 'expiry-desc') return b.daysLeft - a.daysLeft;
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
        if (sortBy === 'qty-asc') return a.quantity - b.quantity;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });

      return {
        success: true,
        count: meds.length,
        medicines: meds
      };
    }

    // 6. Medicines: Create
    if (cleanEndpoint === '/medicines' && method === 'POST') {
      if (!userId) return { success: false, message: 'Unauthorized' };
      const meds = getUserMedicines(userId);

      const days = calculateDaysLeft(body.expiryDate);
      const newMed = {
        id: Date.now(),
        userId,
        name: body.name.trim(),
        expiryDate: body.expiryDate,
        quantity: parseInt(body.quantity, 10) || 1,
        familyMember: (body.familyMember || 'General').trim(),
        category: body.category || 'General',
        description: (body.description || '').trim(),
        daysLeft: days,
        expiryStatus: classifyStatus(days),
        expiryHumanText: getHumanText(days),
        isLowStock: (parseInt(body.quantity, 10) || 1) <= 2,
        createdAt: new Date().toISOString()
      };

      meds.unshift(newMed);
      saveUserMedicines(userId, meds);

      return {
        success: true,
        message: 'Medicine record added successfully!',
        medicine: newMed
      };
    }

    // 7. Medicines: Update
    const putMatch = cleanEndpoint.match(/^\/medicines\/(\d+)$/);
    if (putMatch && method === 'PUT') {
      if (!userId) return { success: false, message: 'Unauthorized' };
      const id = parseInt(putMatch[1], 10);
      let meds = getUserMedicines(userId);
      const idx = meds.findIndex(m => m.id === id);

      if (idx === -1) return { success: false, message: 'Medicine not found' };

      const days = calculateDaysLeft(body.expiryDate || meds[idx].expiryDate);
      meds[idx] = {
        ...meds[idx],
        name: body.name !== undefined ? body.name.trim() : meds[idx].name,
        expiryDate: body.expiryDate !== undefined ? body.expiryDate : meds[idx].expiryDate,
        quantity: body.quantity !== undefined ? parseInt(body.quantity, 10) : meds[idx].quantity,
        familyMember: body.familyMember !== undefined ? body.familyMember.trim() : meds[idx].familyMember,
        category: body.category !== undefined ? body.category : meds[idx].category,
        description: body.description !== undefined ? body.description.trim() : meds[idx].description,
        daysLeft: days,
        expiryStatus: classifyStatus(days),
        expiryHumanText: getHumanText(days),
        isLowStock: (body.quantity !== undefined ? parseInt(body.quantity, 10) : meds[idx].quantity) <= 2
      };

      saveUserMedicines(userId, meds);
      return { success: true, message: 'Medicine updated successfully!', medicine: meds[idx] };
    }

    // 8. Medicines: Delete
    const delMatch = cleanEndpoint.match(/^\/medicines\/(\d+)$/);
    if (delMatch && method === 'DELETE') {
      if (!userId) return { success: false, message: 'Unauthorized' };
      const id = parseInt(delMatch[1], 10);
      let meds = getUserMedicines(userId);
      const newMeds = meds.filter(m => m.id !== id);

      saveUserMedicines(userId, newMeds);
      return { success: true, message: 'Medicine deleted successfully!' };
    }

    // 9. Medicines: Fast Stock Adjust (+/-)
    const adjMatch = cleanEndpoint.match(/^\/medicines\/(\d+)\/adjust-qty$/);
    if (adjMatch && method === 'PATCH') {
      if (!userId) return { success: false, message: 'Unauthorized' };
      const id = parseInt(adjMatch[1], 10);
      const amount = parseInt(body.amount, 10) || 0;
      let meds = getUserMedicines(userId);
      const idx = meds.findIndex(m => m.id === id);

      if (idx === -1) return { success: false, message: 'Medicine not found' };

      meds[idx].quantity = Math.max(0, (meds[idx].quantity || 0) + amount);
      meds[idx].isLowStock = meds[idx].quantity <= 2;

      saveUserMedicines(userId, meds);
      return { success: true, message: 'Stock updated', newQuantity: meds[idx].quantity };
    }

    // 10. Seed Demo (Optional, triggered manually)
    if (cleanEndpoint === '/medicines/seed-demo' && method === 'POST') {
      if (!userId) return { success: false, message: 'Unauthorized' };
      const today = new Date();
      function fmt(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      function offset(days) {
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        return fmt(d);
      }

      const samples = [
        { name: 'Paracetamol 500mg', expiryDate: offset(180), quantity: 12, familyMember: 'General / Shared', category: 'Pain & Fever', description: 'Take 1 tablet after food for fever' },
        { name: 'Cetirizine 10mg', expiryDate: offset(14), quantity: 2, familyMember: 'Reena', category: 'Cold & Allergy', description: 'Night-time allergy relief' },
        { name: 'Amoxicillin 250mg', expiryDate: offset(-10), quantity: 1, familyMember: 'Reena', category: 'Antibiotics', description: 'Course completed - dispose safely' },
        { name: 'Vitamin C 500mg', expiryDate: offset(360), quantity: 20, familyMember: 'Reena', category: 'Vitamins & Supplements', description: 'Daily immunity supplement' },
        { name: 'Antacid Chewable', expiryDate: offset(6), quantity: 1, familyMember: 'Mom', category: 'Digestive & Stomach', description: 'Fast acidity relief' }
      ];

      const created = samples.map((s, idx) => {
        const days = calculateDaysLeft(s.expiryDate);
        return {
          id: Date.now() + idx,
          userId,
          name: s.name,
          expiryDate: s.expiryDate,
          quantity: s.quantity,
          familyMember: s.familyMember,
          category: s.category,
          description: s.description,
          daysLeft: days,
          expiryStatus: classifyStatus(days),
          expiryHumanText: getHumanText(days),
          isLowStock: s.quantity <= 2,
          createdAt: new Date().toISOString()
        };
      });

      saveUserMedicines(userId, created);
      return { success: true, message: 'Demo medicines loaded successfully!' };
    }

    return { success: false, message: 'Endpoint not implemented' };
  }

  /**
   * Universal fetch wrapper:
   * Checks if live backend is running; if not, seamlessly runs in client mock store!
   */
  async function request(endpoint, options = {}) {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    // Attempt live server first
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.status === 401) {
        clearSession();
        window.location.href = 'login.html?expired=1';
        throw new Error('Session expired');
      }

      const data = await response.json();
      return data;
    } catch (netErr) {
      // Server not reachable (static hosting / offline): seamlessly handle via mock backend!
      return handleMockBackend(endpoint, options);
    }
  }

  return {
    getBaseUrl,
    getToken,
    getUser,
    setSession,
    clearSession,
    isAuthenticated,
    requireAuth,
    requireGuest,
    request
  };
})();
