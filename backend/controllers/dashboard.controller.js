/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker
 * Module: Dashboard Controller (backend/controllers/dashboard.controller.js)
 * 
 * Computes live, user-specific statistics directly from the database.
 * If user has no medicines, every counter strictly returns 0.
 */

const db = require('../config/db');
const { calculateExpiryStatus } = require('./medicines.controller');

/**
 * Get Real-Time Dashboard Statistics for the Logged-In User
 * GET /api/dashboard/stats
 */
async function getDashboardStats(req, res) {
  try {
    const userId = req.user.userId;
    const lowStockThreshold = parseInt(req.query.lowStockLimit || '2', 10);

    // Retrieve all medicines for the current logged-in user only
    const rows = await db.query(
      'SELECT medicine_id, medicine_name, expiry_date, quantity, family_member, category FROM medicines WHERE user_id = ?',
      [userId]
    );

    // Initial default zero counts for any user with empty shelf
    let totalMedicines = rows.length;
    let safeMedicines = 0;
    let expiringSoon = 0;
    let expiredMedicines = 0;
    let lowStockMedicines = 0;

    const familySet = new Set();
    const categoriesSet = new Set();
    const urgentItems = [];

    rows.forEach(row => {
      const expiry = calculateExpiryStatus(row.expiry_date);
      const qty = Number(row.quantity);

      if (expiry.status === 'SAFE') {
        safeMedicines++;
      } else if (expiry.status === 'EXPIRING_SOON') {
        expiringSoon++;
        urgentItems.push({
          id: row.medicine_id,
          name: row.medicine_name,
          daysLeft: expiry.daysLeft,
          status: expiry.status,
          person: row.family_member,
          humanText: expiry.humanText
        });
      } else if (expiry.status === 'EXPIRED') {
        expiredMedicines++;
        urgentItems.push({
          id: row.medicine_id,
          name: row.medicine_name,
          daysLeft: expiry.daysLeft,
          status: expiry.status,
          person: row.family_member,
          humanText: expiry.humanText
        });
      }

      if (qty <= lowStockThreshold) {
        lowStockMedicines++;
      }

      if (row.family_member) familySet.add(row.family_member);
      if (row.category) categoriesSet.add(row.category);
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalMedicines,
        safeMedicines,
        expiringSoon,
        expiredMedicines,
        lowStockMedicines,
        totalFamilyMembers: familySet.size,
        distinctFamilies: Array.from(familySet).sort(),
        distinctCategories: Array.from(categoriesSet).sort()
      },
      urgentAlerts: urgentItems.slice(0, 5), // top 5 most urgent for dashboard banner
      user: {
        userId: req.user.userId,
        fullName: req.user.fullName,
        email: req.user.email
      }
    });
  } catch (err) {
    console.error('[Dashboard Stats Error]:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate dashboard statistics.'
    });
  }
}

module.exports = {
  getDashboardStats
};
