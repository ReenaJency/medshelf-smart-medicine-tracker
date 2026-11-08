/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker
 * Module: Medicines Controller (backend/controllers/medicines.controller.js)
 * 
 * Strict User Isolation: Every query enforces WHERE user_id = req.user.userId
 */

const db = require('../config/db');

/**
 * Format a Date object to YYYY-MM-DD
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add days to a date string or object
 */
function addDays(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/**
 * CORE ALGORITHM: Automatic Expiry Status Classification
 * 
 * - EXPIRED: If expiry date < today (daysLeft < 0) -> Red
 * - EXPIRING SOON: If today or <= 30 days away (0 <= daysLeft <= 30) -> Orange
 * - SAFE: If > 30 days away (daysLeft > 30) -> Green
 */
function calculateExpiryStatus(expiryDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Normalize date string (handling both YYYY-MM-DD and ISO strings)
  const cleanStr = String(expiryDateStr).split('T')[0];
  const parts = cleanStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const expiry = new Date(y, m, d, 0, 0, 0, 0);

  const diffMs = expiry.getTime() - today.getTime();
  const daysLeft = Math.round(diffMs / 86400000);

  let status = 'SAFE';
  let label = 'Safe';
  let badgeClass = 'status-safe';
  let humanText = '';

  if (daysLeft < 0) {
    status = 'EXPIRED';
    label = 'Expired';
    badgeClass = 'status-expired';
    const daysAgo = Math.abs(daysLeft);
    humanText = daysAgo === 1 ? 'Expired yesterday' : `Expired ${daysAgo} days ago`;
  } else if (daysLeft <= 30) {
    status = 'EXPIRING_SOON';
    label = 'Expiring Soon';
    badgeClass = 'status-warning';
    if (daysLeft === 0) humanText = 'Expires today!';
    else if (daysLeft === 1) humanText = 'Expires tomorrow';
    else humanText = `Expires in ${daysLeft} days`;
  } else {
    status = 'SAFE';
    label = 'Safe';
    badgeClass = 'status-safe';
    humanText = `${daysLeft} days remaining`;
  }

  return {
    status,
    label,
    badgeClass,
    daysLeft,
    humanText,
    formattedDate: cleanStr
  };
}

/**
 * Enrich raw database row with computed status fields
 */
function enrichMedicineRow(row, lowStockLimit = 2) {
  const expiryInfo = calculateExpiryStatus(row.expiry_date);
  const qty = Number(row.quantity);

  return {
    id: row.medicine_id,
    medicineId: row.medicine_id,
    userId: row.user_id,
    name: row.medicine_name,
    medicineName: row.medicine_name,
    expiryDate: expiryInfo.formattedDate,
    quantity: qty,
    familyMember: row.family_member,
    category: row.category || 'General',
    description: row.description || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiryStatus: expiryInfo.status,
    statusLabel: expiryInfo.label,
    statusBadgeClass: expiryInfo.badgeClass,
    daysLeft: expiryInfo.daysLeft,
    expiryHumanText: expiryInfo.humanText,
    isLowStock: qty <= lowStockLimit
  };
}

/**
 * Get All Medicines for Logged-In User
 * GET /api/medicines
 */
async function getAllMedicines(req, res) {
  try {
    const userId = req.user.userId;
    const { status, search, family, category, sort } = req.query;

    const rows = await db.query(
      'SELECT * FROM medicines WHERE user_id = ? ORDER BY expiry_date ASC',
      [userId]
    );

    let medicines = rows.map(r => enrichMedicineRow(r));

    // Optional Filtering
    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      medicines = medicines.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.familyMember && m.familyMember.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }

    if (status && status !== 'ALL') {
      if (status === 'LOW_STOCK') {
        medicines = medicines.filter(m => m.isLowStock);
      } else {
        medicines = medicines.filter(m => m.expiryStatus === status);
      }
    }

    if (family && family !== 'ALL') {
      medicines = medicines.filter(m => m.familyMember === family);
    }

    if (category && category !== 'ALL') {
      medicines = medicines.filter(m => m.category === category);
    }

    // Optional Sorting
    if (sort) {
      medicines.sort((a, b) => {
        switch (sort) {
          case 'expiry-asc': return a.daysLeft - b.daysLeft;
          case 'expiry-desc': return b.daysLeft - a.daysLeft;
          case 'name-asc': return a.name.localeCompare(b.name);
          case 'name-desc': return b.name.localeCompare(a.name);
          case 'qty-asc': return a.quantity - b.quantity;
          case 'added-desc': return new Date(b.createdAt) - new Date(a.createdAt);
          default: return a.daysLeft - b.daysLeft;
        }
      });
    }

    return res.status(200).json({
      success: true,
      count: medicines.length,
      medicines: medicines
    });
  } catch (err) {
    console.error('[Get All Medicines Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve medicine records.'
    });
  }
}

/**
 * Get Single Medicine By ID
 * GET /api/medicines/:id
 */
async function getMedicineById(req, res) {
  try {
    const userId = req.user.userId;
    const medicineId = parseInt(req.params.id, 10);

    const rows = await db.query(
      'SELECT * FROM medicines WHERE medicine_id = ? AND user_id = ?',
      [medicineId, userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medicine record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      medicine: enrichMedicineRow(rows[0])
    });
  } catch (err) {
    console.error('[Get Medicine Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving medicine details.'
    });
  }
}

/**
 * Create a New Medicine Record
 * POST /api/medicines
 */
async function createMedicine(req, res) {
  try {
    const userId = req.user.userId;
    const { name, medicineName, expiryDate, quantity, familyMember, category, description } = req.body;

    const medName = String(name || medicineName || '').trim();
    if (!medName || medName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Medicine name is required (minimum 2 characters).'
      });
    }

    if (!expiryDate || isNaN(new Date(expiryDate).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'A valid expiry date is required.'
      });
    }

    const qty = Math.max(0, parseInt(quantity, 10) || 0);
    const person = String(familyMember || 'General / Shared').trim();
    const cat = String(category || 'General').trim();
    const desc = String(description || '').trim();
    const cleanDate = String(expiryDate).split('T')[0];

    const result = await db.query(
      `INSERT INTO medicines 
        (user_id, medicine_name, expiry_date, quantity, family_member, category, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, medName, cleanDate, qty, person, cat, desc]
    );

    const newId = result.insertId;

    const createdRows = await db.query(
      'SELECT * FROM medicines WHERE medicine_id = ? AND user_id = ?',
      [newId, userId]
    );

    const enriched = createdRows.length > 0 ? enrichMedicineRow(createdRows[0]) : null;

    return res.status(201).json({
      success: true,
      message: `"${medName}" added successfully to your shelf!`,
      medicine: enriched
    });
  } catch (err) {
    console.error('[Create Medicine Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to save medicine record.'
    });
  }
}

/**
 * Update an Existing Medicine Record
 * PUT /api/medicines/:id
 */
async function updateMedicine(req, res) {
  try {
    const userId = req.user.userId;
    const medicineId = parseInt(req.params.id, 10);
    const { name, medicineName, expiryDate, quantity, familyMember, category, description } = req.body;

    // Verify ownership
    const existing = await db.query(
      'SELECT * FROM medicines WHERE medicine_id = ? AND user_id = ?',
      [medicineId, userId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medicine record not found or access denied.'
      });
    }

    const current = existing[0];
    const medName = name !== undefined || medicineName !== undefined ? String(name || medicineName).trim() : current.medicine_name;
    const expDate = expiryDate ? String(expiryDate).split('T')[0] : current.expiry_date;
    const qty = quantity !== undefined ? Math.max(0, parseInt(quantity, 10)) : current.quantity;
    const person = familyMember !== undefined ? String(familyMember).trim() : current.family_member;
    const cat = category !== undefined ? String(category).trim() : current.category;
    const desc = description !== undefined ? String(description).trim() : current.description;

    await db.query(
      `UPDATE medicines 
       SET medicine_name = ?, expiry_date = ?, quantity = ?, family_member = ?, category = ?, description = ?
       WHERE medicine_id = ? AND user_id = ?`,
      [medName, expDate, qty, person, cat, desc, medicineId, userId]
    );

    const updatedRows = await db.query(
      'SELECT * FROM medicines WHERE medicine_id = ? AND user_id = ?',
      [medicineId, userId]
    );

    return res.status(200).json({
      success: true,
      message: `Updated "${medName}" successfully!`,
      medicine: enrichMedicineRow(updatedRows[0])
    });
  } catch (err) {
    console.error('[Update Medicine Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update medicine record.'
    });
  }
}

/**
 * Adjust Quantity (+1 or -1)
 * PATCH /api/medicines/:id/adjust-qty
 */
async function adjustQuantity(req, res) {
  try {
    const userId = req.user.userId;
    const medicineId = parseInt(req.params.id, 10);
    const { delta } = req.body;

    const existing = await db.query(
      'SELECT quantity, medicine_name FROM medicines WHERE medicine_id = ? AND user_id = ?',
      [medicineId, userId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }

    const currentQty = existing[0].quantity;
    const newQty = Math.max(0, currentQty + (parseInt(delta, 10) || 0));

    await db.query(
      'UPDATE medicines SET quantity = ? WHERE medicine_id = ? AND user_id = ?',
      [newQty, medicineId, userId]
    );

    return res.status(200).json({
      success: true,
      newQuantity: newQty
    });
  } catch (err) {
    console.error('[Adjust Quantity Error]:', err);
    return res.status(500).json({ success: false, message: 'Could not update stock.' });
  }
}

/**
 * Delete a Medicine Record
 * DELETE /api/medicines/:id
 */
async function deleteMedicine(req, res) {
  try {
    const userId = req.user.userId;
    const medicineId = parseInt(req.params.id, 10);

    const existing = await db.query(
      'SELECT medicine_name FROM medicines WHERE medicine_id = ? AND user_id = ?',
      [medicineId, userId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medicine record not found or already removed.'
      });
    }

    const medName = existing[0].medicine_name;

    await db.query(
      'DELETE FROM medicines WHERE medicine_id = ? AND user_id = ?',
      [medicineId, userId]
    );

    return res.status(200).json({
      success: true,
      message: `"${medName}" has been permanently removed.`
    });
  } catch (err) {
    console.error('[Delete Medicine Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete medicine record.'
    });
  }
}

/**
 * Seed User's Shelf With Realistic Demo Medicines
 * POST /api/medicines/seed-demo
 */
async function seedDemoData(req, res) {
  try {
    const userId = req.user.userId;
    const today = new Date();

    const sampleData = [
      {
        name: 'Amoxicillin 250mg Capsules',
        expiry: addDays(today, -15), // Expired
        qty: 6,
        person: 'Dad (Robert)',
        category: 'Antibiotics',
        desc: 'Prescribed for bacterial chest infection. Course completed.'
      },
      {
        name: 'Cetirizine 10mg Allergy Relief',
        expiry: addDays(today, 5), // Expiring in 5 days
        qty: 1, // Low stock
        person: 'Self',
        category: 'Allergy & Antihistamines',
        desc: 'Take 1 tablet daily at night for seasonal pollen allergy.'
      },
      {
        name: 'Dextromethorphan Cough Syrup 100ml',
        expiry: addDays(today, 18), // Expiring in 18 days
        qty: 2, // Low stock
        person: 'Grandpa (Thomas)',
        category: 'Fever & Cold',
        desc: 'Take 10ml twice daily after meals.'
      },
      {
        name: 'Paracetamol 500mg Tablets (Crocin)',
        expiry: addDays(today, 240), // Safe (~8 months)
        qty: 20,
        person: 'General / Shared',
        category: 'Pain Relief & Fever',
        desc: 'Home first-aid stock for fever and mild headaches.'
      },
      {
        name: 'Ibuprofen 400mg Tablets',
        expiry: addDays(today, 120), // Safe (~4 months)
        qty: 10,
        person: 'Mom (Sarah)',
        category: 'Pain Relief & Fever',
        desc: 'Take with food for joint ache.'
      }
    ];

    for (const item of sampleData) {
      await db.query(
        `INSERT INTO medicines 
          (user_id, medicine_name, expiry_date, quantity, family_member, category, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, item.name, item.expiry, item.qty, item.person, item.category, item.desc]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Sample demo medicines loaded successfully for your account!'
    });
  } catch (err) {
    console.error('[Seed Demo Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to seed sample data.'
    });
  }
}

module.exports = {
  getAllMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  adjustQuantity,
  deleteMedicine,
  seedDemoData,
  calculateExpiryStatus
};
