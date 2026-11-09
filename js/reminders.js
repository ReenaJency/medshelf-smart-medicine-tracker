/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker
 * Module: Reminders & Notification System (frontend/js/reminders.js)
 */

const MedShelfReminders = (function () {
  'use strict';

  function isNotificationSupported() {
    return 'Notification' in window;
  }

  function getPermissionStatus() {
    if (!isNotificationSupported()) return 'unsupported';
    return Notification.permission;
  }

  async function requestPermission() {
    if (!isNotificationSupported()) return 'unsupported';
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      return Notification.permission;
    }
  }

  function sendBrowserNotification(title, body) {
    if (!isNotificationSupported() || Notification.permission !== 'granted') return null;
    try {
      return new Notification(title, {
        body: body,
        icon: 'assets/favicon.svg'
      });
    } catch (e) {
      return null;
    }
  }

  function evaluateInventory(medicines) {
    const report = {
      expired: [],
      urgent7Days: [],
      approaching30Days: [],
      advance60Days: [],
      lowStock: []
    };

    medicines.forEach(m => {
      const days = m.daysLeft;
      if (days < 0) report.expired.push(m);
      else if (days <= 7) report.urgent7Days.push(m);
      else if (days <= 30) report.approaching30Days.push(m);
      else if (days <= 60) report.advance60Days.push(m);

      if (m.isLowStock) report.lowStock.push(m);
    });

    return report;
  }

  return {
    isNotificationSupported,
    getPermissionStatus,
    requestPermission,
    sendBrowserNotification,
    evaluateInventory
  };
})();
