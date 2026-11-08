/**
 * MEDSHELF - Smart Medicine Expiry Tracker for Home Use
 * Module: Storage & Data Management (storage.js)
 * 
 * Responsibilities:
 * - Persistent browser LocalStorage abstraction
 * - Dynamic Expiry Calculation according to project rules
 * - Low-stock status evaluation
 * - Full CRUD operations (Create, Read, Update, Delete)
 * - Dynamic sample dataset generation (relative to current date)
 * - JSON Export & Import for data backups and cross-device testing
 */

const MedShelfStorage = (function () {
  'use strict';

  const STORAGE_KEY = 'medshelf_medicines_data';
  const SETTINGS_KEY = 'medshelf_user_settings';

  // Default application settings
  const DEFAULT_SETTINGS = {
    lowStockThreshold: 2,
    remindersEnabled: true,
    reminderIntervals: [60, 30, 7] // days before expiry
  };

  /**
   * Helper to normalize a date object to midnight local time
   * Avoids timezone off-by-one errors when comparing YYYY-MM-DD
   */
  function normalizeDate(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Parse a YYYY-MM-DD string into a local Date object set to midnight
   */
  function parseLocalDate(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day, 0, 0, 0, 0);
    }
    return normalizeDate(new Date(dateStr));
  }

  /**
   * Format a Date object to YYYY-MM-DD string
   */
  function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Add days to a date and return YYYY-MM-DD string
   */
  function addDays(baseDate, days) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    return formatDate(d);
  }

  /**
   * CORE ALGORITHM: Automatic Expiry Status Classification
   * 
   * Rules:
   * 1. EXPIRED: If expiry date is earlier than today's date (daysLeft < 0)
   * 2. EXPIRING SOON: If expiry date is today or within the next 30 days (0 <= daysLeft <= 30)
   * 3. SAFE: If expiry date is more than 30 days away (daysLeft > 30)
   * 
   * @param {string} expiryDateStr - 'YYYY-MM-DD'
   * @returns {Object} status details
   */
  function calculateExpiryStatus(expiryDateStr) {
    const today = normalizeDate(new Date());
    const expiry = parseLocalDate(expiryDateStr);

    const diffMs = expiry.getTime() - today.getTime();
    // One day in milliseconds = 1000 * 60 * 60 * 24 = 86,400,000
    const daysLeft = Math.round(diffMs / 86400000);

    let status = 'SAFE';
    let label = 'Safe';
    let badgeClass = 'status-safe';
    let humanReadable = '';

    if (daysLeft < 0) {
      status = 'EXPIRED';
      label = 'Expired';
      badgeClass = 'status-expired';
      const daysAgo = Math.abs(daysLeft);
      humanReadable = daysAgo === 1 ? 'Expired yesterday' : `Expired ${daysAgo} days ago`;
    } else if (daysLeft <= 30) {
      status = 'EXPIRING_SOON';
      label = 'Expiring Soon';
      badgeClass = 'status-warning';
      if (daysLeft === 0) {
        humanReadable = 'Expires today!';
      } else if (daysLeft === 1) {
        humanReadable = 'Expires tomorrow';
      } else {
        humanReadable = `Expires in ${daysLeft} days`;
      }
    } else {
      status = 'SAFE';
      label = 'Safe';
      badgeClass = 'status-safe';
      humanReadable = `${daysLeft} days remaining`;
    }

    return {
      status,          // 'EXPIRED' | 'EXPIRING_SOON' | 'SAFE'
      label,           // Friendly label
      badgeClass,      // CSS class for styling
      daysLeft,        // Integer difference
      humanReadable    // User-friendly text
    };
  }

  /**
   * Retrieve settings from localStorage
   */
  function getSettings() {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      return data ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(data)) : { ...DEFAULT_SETTINGS };
    } catch (e) {
      console.warn('Error reading settings from LocalStorage:', e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * Save user settings to localStorage
   */
  function saveSettings(settings) {
    try {
      const merged = Object.assign({}, getSettings(), settings);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error('Error saving settings to LocalStorage:', e);
      return null;
    }
  }

  /**
   * Retrieve raw medicine array from localStorage
   */
  function getRawMedicines() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error parsing medicine data from LocalStorage:', e);
      return [];
    }
  }

  /**
   * Save raw medicine array to localStorage
   */
  function saveRawMedicines(medicines) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
      return true;
    } catch (e) {
      console.error('Error saving medicine data to LocalStorage:', e);
      return false;
    }
  }

  /**
   * Get all medicines enriched with current computed status & low stock indicators
   * Dynamically evaluates expiry and stock relative to today
   */
  function getAllMedicines() {
    const raw = getRawMedicines();
    const settings = getSettings();
    const threshold = settings.lowStockThreshold || 2;

    return raw.map(item => {
      const expiryInfo = calculateExpiryStatus(item.expiryDate);
      const isLowStock = Number(item.quantity) <= threshold;

      return {
        ...item,
        quantity: Number(item.quantity),
        expiryStatus: expiryInfo.status,
        statusLabel: expiryInfo.label,
        statusBadgeClass: expiryInfo.badgeClass,
        daysLeft: expiryInfo.daysLeft,
        expiryHumanText: expiryInfo.humanReadable,
        isLowStock: isLowStock,
        lowStockThreshold: threshold
      };
    });
  }

  /**
   * Get single medicine by unique ID
   */
  function getMedicineById(id) {
    const all = getAllMedicines();
    return all.find(item => item.id === id) || null;
  }

  /**
   * Generate a unique medicine ID
   */
  function generateId() {
    return 'med_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
  }

  /**
   * Add a new medicine record
   */
  function addMedicine(data) {
    const medicines = getRawMedicines();

    const newRecord = {
      id: generateId(),
      name: String(data.name || '').trim(),
      expiryDate: data.expiryDate,
      quantity: Math.max(1, parseInt(data.quantity, 10) || 1),
      familyMember: String(data.familyMember || 'General / All').trim(),
      category: String(data.category || 'General').trim(),
      description: String(data.description || '').trim(),
      addedDate: new Date().toISOString(),
      updatedDate: new Date().toISOString()
    };

    medicines.push(newRecord);
    saveRawMedicines(medicines);
    return newRecord;
  }

  /**
   * Update an existing medicine record
   */
  function updateMedicine(id, data) {
    const medicines = getRawMedicines();
    const index = medicines.findIndex(m => m.id === id);

    if (index === -1) {
      return null;
    }

    medicines[index] = {
      ...medicines[index],
      name: String(data.name !== undefined ? data.name : medicines[index].name).trim(),
      expiryDate: data.expiryDate !== undefined ? data.expiryDate : medicines[index].expiryDate,
      quantity: data.quantity !== undefined ? Math.max(0, parseInt(data.quantity, 10)) : medicines[index].quantity,
      familyMember: String(data.familyMember !== undefined ? data.familyMember : medicines[index].familyMember).trim(),
      category: String(data.category !== undefined ? data.category : medicines[index].category).trim(),
      description: String(data.description !== undefined ? data.description : medicines[index].description).trim(),
      updatedDate: new Date().toISOString()
    };

    saveRawMedicines(medicines);
    return medicines[index];
  }

  /**
   * Quick adjust quantity (+1 or -1)
   */
  function adjustQuantity(id, delta) {
    const medicines = getRawMedicines();
    const index = medicines.findIndex(m => m.id === id);

    if (index === -1) return null;

    const currentQty = parseInt(medicines[index].quantity, 10) || 0;
    const newQty = Math.max(0, currentQty + delta);

    medicines[index].quantity = newQty;
    medicines[index].updatedDate = new Date().toISOString();

    saveRawMedicines(medicines);
    return medicines[index];
  }

  /**
   * Delete a medicine record by ID
   */
  function deleteMedicine(id) {
    const medicines = getRawMedicines();
    const filtered = medicines.filter(m => m.id !== id);

    if (filtered.length === medicines.length) {
      return false; // Not found
    }

    saveRawMedicines(filtered);
    return true;
  }

  /**
   * Clear all medicine records from localStorage
   */
  function clearAllMedicines() {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  }

  /**
   * Get distinct family members present in the inventory
   */
  function getDistinctFamilyMembers() {
    const list = getAllMedicines();
    const members = new Set();
    list.forEach(m => {
      if (m.familyMember) members.add(m.familyMember);
    });
    return Array.from(members).sort();
  }

  /**
   * Generate realistic Sample Medicine Data relative to the CURRENT date
   * This guarantees that whenever tested (today, tomorrow, or a year from now),
   * the sample dataset will ALWAYS showcase:
   * - At least 1 expired medicine
   * - At least 2 expiring soon medicines (< 30 days)
   * - At least 2 safe medicines (> 30 days)
   * - At least 2 low-stock medicines (qty <= 2)
   */
  function getSampleMedicines() {
    const today = new Date();

    return [
      {
        id: 'med_demo_1',
        name: 'Amoxicillin 250mg Capsules',
        expiryDate: addDays(today, -20), // 20 days expired
        quantity: 6,
        familyMember: 'Dad (Robert)',
        category: 'Antibiotics',
        description: 'Prescribed for bacterial chest infection. Course completed.',
        addedDate: addDays(today, -45),
        isSample: true
      },
      {
        id: 'med_demo_2',
        name: 'Cetirizine 10mg Allergy Relief',
        expiryDate: addDays(today, 5), // Expiring in 5 days!
        quantity: 1, // Also Low stock!
        familyMember: 'Self (Alex)',
        category: 'Allergy & Antihistamines',
        description: 'For seasonal pollen allergies. One tablet daily at night.',
        addedDate: addDays(today, -60),
        isSample: true
      },
      {
        id: 'med_demo_3',
        name: 'Dextromethorphan Cough Syrup 100ml',
        expiryDate: addDays(today, 18), // Expiring in 18 days
        quantity: 2, // Low stock!
        familyMember: 'Grandpa (Thomas)',
        category: 'Fever & Cold',
        description: 'Take 10ml twice daily after food for dry cough.',
        addedDate: addDays(today, -30),
        isSample: true
      },
      {
        id: 'med_demo_4',
        name: 'Paracetamol 500mg Tablets (Crocin)',
        expiryDate: addDays(today, 210), // ~7 months safe
        quantity: 24,
        familyMember: 'General / Shared',
        category: 'Pain Relief & Fever',
        description: 'Standard home first-aid stock for mild fever and headache.',
        addedDate: addDays(today, -15),
        isSample: true
      },
      {
        id: 'med_demo_5',
        name: 'Ibuprofen 400mg Tablets',
        expiryDate: addDays(today, 120), // ~4 months safe
        quantity: 8,
        familyMember: 'Mom (Sarah)',
        category: 'Pain Relief & Fever',
        description: 'Take with milk or after food for joint and muscle aches.',
        addedDate: addDays(today, -10),
        isSample: true
      },
      {
        id: 'med_demo_6',
        name: 'Vitamin D3 60,000 IU Softgels',
        expiryDate: addDays(today, 320), // ~10 months safe
        quantity: 4,
        familyMember: 'Grandma (Mary)',
        category: 'Vitamins & Supplements',
        description: 'Once weekly supplement taken with breakfast.',
        addedDate: addDays(today, -5),
        isSample: true
      }
    ];
  }

  /**
   * Populate localStorage with sample medicines
   */
  function loadSampleData() {
    const samples = getSampleMedicines();
    saveRawMedicines(samples);
    return getAllMedicines();
  }

  /**
   * Check if storage has any data, if not initialize with sample data automatically
   * Returns true if newly initialized
   */
  function initializeIfEmpty() {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing || existing === '[]') {
      loadSampleData();
      return true;
    }
    return false;
  }

  /**
   * Export all medicine records as a JSON string for backups / college grading
   */
  function exportDataJSON() {
    const medicines = getRawMedicines();
    const settings = getSettings();
    const payload = {
      appName: 'MedShelf',
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      settings: settings,
      medicines: medicines
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Import medicine records from a JSON file/string
   */
  function importDataJSON(jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      let list = [];

      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && Array.isArray(parsed.medicines)) {
        list = parsed.medicines;
        if (parsed.settings) {
          saveSettings(parsed.settings);
        }
      } else {
        throw new Error('Invalid MedShelf data format: expected array of medicines');
      }

      // Basic sanity validation of imported items
      const valid = list.filter(item => item && item.name && item.expiryDate);
      saveRawMedicines(valid);
      return { success: true, count: valid.length };
    } catch (e) {
      console.error('Failed to import JSON data:', e);
      return { success: false, error: e.message };
    }
  }

  // Public API
  return {
    getAllMedicines,
    getMedicineById,
    addMedicine,
    updateMedicine,
    adjustQuantity,
    deleteMedicine,
    clearAllMedicines,
    calculateExpiryStatus,
    getSettings,
    saveSettings,
    getDistinctFamilyMembers,
    loadSampleData,
    initializeIfEmpty,
    exportDataJSON,
    importDataJSON
  };
})();
