/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker
 * Module: Dashboard Controller (frontend/js/dashboard.js)
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Guard: Ensure user is logged in
  if (!MedShelfAPI.requireAuth()) return;

  const user = MedShelfAPI.getUser();

  // 2. Populate User Name in Navigation & Welcome Banner
  const navUserName = document.getElementById('nav-user-name');
  const welcomeGreeting = document.getElementById('welcome-greeting');
  const userEmailDisplay = document.getElementById('user-email-display');

  if (navUserName && user) {
    navUserName.textContent = user.fullName || 'User';
  }
  if (welcomeGreeting && user) {
    welcomeGreeting.textContent = `Welcome back, ${user.fullName || 'Friend'}!`;
  }
  if (userEmailDisplay && user) {
    userEmailDisplay.textContent = user.email || '';
  }

  // 3. Set Current Date Display
  const currentDateEl = document.getElementById('current-date-display');
  if (currentDateEl) {
    const now = new Date();
    currentDateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // 4. Bind Logout Button
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Are you sure you want to log out of MedShelf?')) {
        MedShelfAPI.clearSession();
        window.location.href = 'login.html';
      }
    });
  }

  // 5. Bind Dashboard Card Click Filters
  setupCardNavigation();

  // 6. Bind Demo Seed Button
  const btnSeedDemo = document.getElementById('btn-seed-demo');
  if (btnSeedDemo) {
    btnSeedDemo.addEventListener('click', handleSeedDemo);
  }

  // 7. Load Real-Time Dashboard Statistics from Backend API
  await loadDashboardStats();
});

/**
 * Fetch and Render Live Dashboard Statistics
 */
async function loadDashboardStats() {
  const countTotal = document.getElementById('stat-total');
  const countSafe = document.getElementById('stat-safe');
  const countExpiring = document.getElementById('stat-expiring');
  const countExpired = document.getElementById('stat-expired');
  const countLowStock = document.getElementById('stat-lowstock');
  const urgentBanner = document.getElementById('urgent-alert-banner');
  const emptyState = document.getElementById('dashboard-empty-state');
  const remindersBadge = document.getElementById('reminders-badge');

  try {
    const data = await MedShelfAPI.request('/dashboard/stats');

    if (data.success && data.stats) {
      const stats = data.stats;

      // Update counters (Default to 0 if no medicines added)
      if (countTotal) countTotal.textContent = stats.totalMedicines;
      if (countSafe) countSafe.textContent = stats.safeMedicines;
      if (countExpiring) countExpiring.textContent = stats.expiringSoon;
      if (countExpired) countExpired.textContent = stats.expiredMedicines;
      if (countLowStock) countLowStock.textContent = stats.lowStockMedicines;

      // Reminders Bell Badge
      const totalAlerts = stats.expiringSoon + stats.expiredMedicines + stats.lowStockMedicines;
      if (remindersBadge) {
        if (totalAlerts > 0) {
          remindersBadge.textContent = totalAlerts;
          remindersBadge.style.display = 'inline-flex';
        } else {
          remindersBadge.style.display = 'none';
        }
      }

      // Show/Hide Empty State on Dashboard
      if (stats.totalMedicines === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (urgentBanner) urgentBanner.style.display = 'none';
      } else {
        if (emptyState) emptyState.style.display = 'none';

        // Check for urgent expired or expiring soon medicines
        if (stats.expiredMedicines > 0 || stats.expiringSoon > 0) {
          if (urgentBanner) {
            urgentBanner.style.display = 'flex';
            const alertText = document.getElementById('urgent-banner-text');
            if (alertText) {
              alertText.innerHTML = `Attention: You have <strong>${stats.expiredMedicines} expired</strong> and <strong>${stats.expiringSoon} expiring soon</strong> medicine(s) in your home stock.`;
            }
          }
        } else {
          if (urgentBanner) urgentBanner.style.display = 'none';
        }
      }
    }
  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
    showToast('Failed to connect to backend server: ' + err.message, 'error');
  }
}

/**
 * Make Dashboard Cards Clickable to Navigate to Medicines with Active Filter
 */
function setupCardNavigation() {
  const cards = [
    { id: 'card-stat-total', status: 'ALL' },
    { id: 'card-stat-safe', status: 'SAFE' },
    { id: 'card-stat-expiring', status: 'EXPIRING_SOON' },
    { id: 'card-stat-expired', status: 'EXPIRED' },
    { id: 'card-stat-lowstock', status: 'LOW_STOCK' }
  ];

  cards.forEach(c => {
    const el = document.getElementById(c.id);
    if (el) {
      el.addEventListener('click', () => {
        window.location.href = `medicines.html?status=${c.status}`;
      });
    }
  });
}

/**
 * Handle Seeding Sample Data for Current User
 */
async function handleSeedDemo() {
  if (confirm('Load demo medicine dataset into your personal account? This allows testing the dashboard and expiry calculations immediately.')) {
    try {
      const data = await MedShelfAPI.request('/medicines/seed-demo', { method: 'POST' });
      if (data.success) {
        showToast(data.message, 'success');
        await loadDashboardStats();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
}

/**
 * Simple Toast Feedback
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  }, 3500);
}
