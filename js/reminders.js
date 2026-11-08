/**
 * MEDSHELF - Smart Medicine Expiry Tracker for Home Use
 * Module: Reminders & Notification System (reminders.js)
 * 
 * Responsibilities:
 * - Scan inventory for critical expiry milestones (60 days, 30 days, 7 days, and expired)
 * - Low-stock alerts
 * - Web Notifications API integration with graceful fallback
 * - Render in-app Notification Center / Reminders panel
 * - Document real-world browser notification constraints
 */

const MedShelfReminders = (function () {
  'use strict';

  // Session flag to prevent spamming notifications on every page interaction
  let hasDispatchedSessionNotification = false;

  /**
   * Check if the browser supports the Web Notification API
   */
  function isNotificationSupported() {
    return 'Notification' in window;
  }

  /**
   * Get current notification permission state
   * Returns: 'granted' | 'denied' | 'default' | 'unsupported'
   */
  function getPermissionStatus() {
    if (!isNotificationSupported()) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  /**
   * Request permission from the user for desktop/browser notifications
   */
  async function requestPermission() {
    if (!isNotificationSupported()) {
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return Notification.permission;
    }
  }

  /**
   * Group medicines into tiered reminder categories
   * Intervals:
   * - Expired: daysLeft < 0
   * - Urgent (<= 7 days)
   * - Approaching (8 to 30 days)
   * - Advance Warning (31 to 60 days)
   * - Low Stock: quantity <= threshold
   */
  function evaluateInventory(medicines) {
    const reminders = {
      expired: [],
      urgent7Days: [],
      approaching30Days: [],
      advance60Days: [],
      lowStock: [],
      safeTotal: 0
    };

    medicines.forEach(med => {
      const days = med.daysLeft;

      if (days < 0) {
        reminders.expired.push(med);
      } else if (days <= 7) {
        reminders.urgent7Days.push(med);
      } else if (days <= 30) {
        reminders.approaching30Days.push(med);
      } else if (days <= 60) {
        reminders.advance60Days.push(med);
      } else {
        reminders.safeTotal++;
      }

      if (med.isLowStock) {
        reminders.lowStock.push(med);
      }
    });

    const totalUrgent = reminders.expired.length + reminders.urgent7Days.length + reminders.approaching30Days.length;

    return {
      ...reminders,
      totalUrgent,
      hasAlerts: totalUrgent > 0 || reminders.lowStock.length > 0
    };
  }

  /**
   * Dispatch a browser notification if permitted
   */
  function sendBrowserNotification(title, body, tag) {
    if (!isNotificationSupported() || Notification.permission !== 'granted') {
      return null;
    }

    try {
      const options = {
        body: body,
        icon: 'assets/favicon.svg',
        tag: tag || 'medshelf-reminder',
        renotify: true
      };

      const notification = new Notification(title, options);
      notification.onclick = function () {
        window.focus();
        notification.close();
      };
      return notification;
    } catch (e) {
      console.warn('Failed to send browser notification:', e);
      return null;
    }
  }

  /**
   * Check and notify user about urgent items on app launch / refresh
   */
  function triggerSystemNotifications(medicines) {
    if (hasDispatchedSessionNotification) return;

    const report = evaluateInventory(medicines);

    if (report.expired.length > 0) {
      sendBrowserNotification(
        '⚠️ MedShelf: Expired Medicine Alert',
        `You have ${report.expired.length} expired medicine(s) at home. Please inspect and safely dispose.`,
        'medshelf-expired'
      );
    } else if (report.urgent7Days.length > 0) {
      sendBrowserNotification(
        '⏳ MedShelf: Expiry Notice (< 7 Days)',
        `Action needed: ${report.urgent7Days.length} medicine(s) will expire this week.`,
        'medshelf-urgent'
      );
    }

    hasDispatchedSessionNotification = true;
  }

  /**
   * Build HTML for the In-App Notification Center
   */
  function renderInAppRemindersHTML(medicines) {
    const report = evaluateInventory(medicines);

    let html = '';

    // Notice on notification capabilities & transparent limitations
    const perm = getPermissionStatus();
    let permNotice = '';
    if (perm === 'granted') {
      permNotice = `<div class="reminder-perm-status perm-granted">
        <span class="icon">🔔</span> Browser Notifications are <strong>Active</strong> (alerts appear when app is open).
      </div>`;
    } else if (perm === 'unsupported') {
      permNotice = `<div class="reminder-perm-status perm-unsupported">
        <span class="icon">ℹ️</span> Browser Notifications are not supported in this browser. In-app alerts are active.
      </div>`;
    } else {
      permNotice = `<div class="reminder-perm-status perm-prompt">
        <span class="icon">🔔</span> Enable browser notifications for urgent desktop alerts:
        <button id="btn-enable-browser-notifications" class="btn btn-sm btn-outline">Enable Notifications</button>
      </div>`;
    }

    html += permNotice;

    // Limitation callout banner
    html += `
      <div class="reminder-limitation-box">
        <strong>📌 Note on Reminders:</strong> In-app reminders update automatically every time you open or refresh MedShelf. Web browser notifications function when this browser is open. Background mobile push without opening the browser is a planned future enhancement requiring cloud services.
      </div>
    `;

    if (!report.hasAlerts) {
      html += `
        <div class="empty-reminders-state">
          <div class="empty-icon">✅</div>
          <h4>All Medicines Are In Good Standing!</h4>
          <p>No medicines are expired or expiring within 30 days. Stock levels are healthy.</p>
        </div>
      `;
      return html;
    }

    // 1. Expired Items (High Priority)
    if (report.expired.length > 0) {
      html += `
        <div class="reminder-category cat-expired">
          <div class="reminder-category-header">
            <span class="badge badge-expired">Expired (${report.expired.length})</span>
            <span class="cat-subtext">Immediate action required: do not consume!</span>
          </div>
          <ul class="reminder-list">
            ${report.expired.map(m => `
              <li class="reminder-item item-expired">
                <div class="reminder-info">
                  <strong>${escapeHtml(m.name)}</strong>
                  <span class="reminder-meta">${m.expiryHumanText} (${m.expiryDate}) • For: ${escapeHtml(m.familyMember)}</span>
                </div>
                <span class="reminder-action-tag">Dispose Safely</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // 2. Urgent (Within 7 Days)
    if (report.urgent7Days.length > 0) {
      html += `
        <div class="reminder-category cat-urgent">
          <div class="reminder-category-header">
            <span class="badge badge-warning">Expiring in &le; 7 Days (${report.urgent7Days.length})</span>
            <span class="cat-subtext">Expiring this week — replace or finish course soon</span>
          </div>
          <ul class="reminder-list">
            ${report.urgent7Days.map(m => `
              <li class="reminder-item item-urgent">
                <div class="reminder-info">
                  <strong>${escapeHtml(m.name)}</strong>
                  <span class="reminder-meta">${m.expiryHumanText} (${m.expiryDate}) • Qty: ${m.quantity} • For: ${escapeHtml(m.familyMember)}</span>
                </div>
                <span class="reminder-action-tag">Inspect Soon</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // 3. Approaching (Within 30 Days)
    if (report.approaching30Days.length > 0) {
      html += `
        <div class="reminder-category cat-approaching">
          <div class="reminder-category-header">
            <span class="badge badge-warning">Expiring in 8-30 Days (${report.approaching30Days.length})</span>
            <span class="cat-subtext">Approaching expiry within this month</span>
          </div>
          <ul class="reminder-list">
            ${report.approaching30Days.map(m => `
              <li class="reminder-item item-approaching">
                <div class="reminder-info">
                  <strong>${escapeHtml(m.name)}</strong>
                  <span class="reminder-meta">${m.expiryHumanText} • For: ${escapeHtml(m.familyMember)}</span>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // 4. Advance Notice (31-60 Days)
    if (report.advance60Days.length > 0) {
      html += `
        <div class="reminder-category cat-advance">
          <div class="reminder-category-header">
            <span class="badge badge-info">Advance Notice: 31-60 Days (${report.advance60Days.length})</span>
            <span class="cat-subtext">Expiring in the next two months</span>
          </div>
          <ul class="reminder-list">
            ${report.advance60Days.map(m => `
              <li class="reminder-item item-advance">
                <div class="reminder-info">
                  <strong>${escapeHtml(m.name)}</strong>
                  <span class="reminder-meta">${m.daysLeft} days remaining (${m.expiryDate}) • For: ${escapeHtml(m.familyMember)}</span>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // 5. Low Stock Alert
    if (report.lowStock.length > 0) {
      html += `
        <div class="reminder-category cat-lowstock">
          <div class="reminder-category-header">
            <span class="badge badge-low-stock">Low Stock Alerts (${report.lowStock.length})</span>
            <span class="cat-subtext">Stock &le; threshold. Refill soon!</span>
          </div>
          <ul class="reminder-list">
            ${report.lowStock.map(m => `
              <li class="reminder-item item-lowstock">
                <div class="reminder-info">
                  <strong>${escapeHtml(m.name)}</strong>
                  <span class="reminder-meta">Only <strong>${m.quantity}</strong> remaining! • For: ${escapeHtml(m.familyMember)}</span>
                </div>
                <span class="reminder-action-tag">Refill Needed</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    return html;
  }

  /**
   * Helper to escape HTML characters to prevent XSS
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    isNotificationSupported,
    getPermissionStatus,
    requestPermission,
    evaluateInventory,
    triggerSystemNotifications,
    renderInAppRemindersHTML
  };
})();
