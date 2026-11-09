/**
 * MEDSHELF - Smart Medicine Expiry Tracker for Home Use
 * Module: Main Application Controller (script.js)
 * 
 * Orchestrates:
 * - UI Rendering (Dashboard counters, Medicine table/cards, Filters, Reminders)
 * - State Management (Search, Filters, Sorting)
 * - Form Validations & Submissions (Add / Edit)
 * - Quick Stock Adjustments (+ / -)
 * - Confirmation Modals (Delete, Clear, Reset)
 * - Data Import / Export (JSON Backups)
 * - Toast Notifications & User Feedback
 */

(function () {
  'use strict';

  // Application State
  const state = {
    searchQuery: '',
    statusFilter: 'ALL',       // 'ALL' | 'SAFE' | 'EXPIRING_SOON' | 'EXPIRED' | 'LOW_STOCK'
    familyFilter: 'ALL',
    categoryFilter: 'ALL',
    sortBy: 'expiry-asc',      // 'expiry-asc' | 'expiry-desc' | 'name-asc' | 'name-desc' | 'qty-asc' | 'added-desc'
    viewMode: 'table',         // 'table' | 'grid'
    editingId: null,
    pendingDeleteId: null
  };

  // DOM Elements Cache
  const DOM = {};

  /**
   * Initialize DOM references
   */
  function cacheDOM() {
    // Stats Counters
    DOM.countTotal = document.getElementById('stat-total');
    DOM.countSafe = document.getElementById('stat-safe');
    DOM.countExpiring = document.getElementById('stat-expiring');
    DOM.countExpired = document.getElementById('stat-expired');
    DOM.countLowStock = document.getElementById('stat-lowstock');

    // Dashboard Cards for interactive quick filtering
    DOM.cards = {
      total: document.getElementById('card-stat-total'),
      safe: document.getElementById('card-stat-safe'),
      expiring: document.getElementById('card-stat-expiring'),
      expired: document.getElementById('card-stat-expired'),
      lowstock: document.getElementById('card-stat-lowstock')
    };

    // Filter & Search Controls
    DOM.searchInput = document.getElementById('search-input');
    DOM.filterStatus = document.getElementById('filter-status');
    DOM.filterFamily = document.getElementById('filter-family');
    DOM.filterCategory = document.getElementById('filter-category');
    DOM.sortBy = document.getElementById('sort-by');
    DOM.btnResetFilters = document.getElementById('btn-reset-filters');
    DOM.activeFilterBadge = document.getElementById('active-filter-badge');

    // View toggles
    DOM.btnViewTable = document.getElementById('btn-view-table');
    DOM.btnViewGrid = document.getElementById('btn-view-grid');

    // Medicine Container & Empty States
    DOM.tableBody = document.getElementById('medicine-table-body');
    DOM.gridView = document.getElementById('medicine-grid-view');
    DOM.tableView = document.getElementById('medicine-table-view');
    DOM.emptyState = document.getElementById('empty-state');
    DOM.resultsSummary = document.getElementById('results-summary');

    // Modals
    DOM.medicineModal = document.getElementById('medicine-modal');
    DOM.medicineModalTitle = document.getElementById('medicine-modal-title');
    DOM.medicineForm = document.getElementById('medicine-form');
    DOM.inputName = document.getElementById('med-name');
    DOM.inputExpiry = document.getElementById('med-expiry');
    DOM.inputQuantity = document.getElementById('med-quantity');
    DOM.inputFamily = document.getElementById('med-family');
    DOM.inputCategory = document.getElementById('med-category');
    DOM.inputDescription = document.getElementById('med-description');
    DOM.familyDatalist = document.getElementById('family-members-datalist');

    DOM.deleteModal = document.getElementById('delete-modal');
    DOM.deleteMedName = document.getElementById('delete-med-name');
    DOM.btnConfirmDelete = document.getElementById('btn-confirm-delete');

    DOM.remindersModal = document.getElementById('reminders-modal');
    DOM.remindersBody = document.getElementById('reminders-body');
    DOM.remindersBadge = document.getElementById('reminders-badge');

    DOM.settingsModal = document.getElementById('settings-modal');
    DOM.inputLowStockLimit = document.getElementById('setting-low-stock-limit');
    DOM.settingsForm = document.getElementById('settings-form');

    // Buttons
    DOM.btnAddMedicine = document.getElementById('btn-add-medicine');
    DOM.btnOpenReminders = document.getElementById('btn-open-reminders');
    DOM.btnOpenSettings = document.getElementById('btn-open-settings');
    DOM.btnLoadSample = document.getElementById('btn-load-sample');
    DOM.btnClearAll = document.getElementById('btn-clear-all');
    DOM.btnExportJson = document.getElementById('btn-export-json');
    DOM.btnImportJson = document.getElementById('btn-import-json');
    DOM.fileImportInput = document.getElementById('file-import-input');

    // Toast Container
    DOM.toastContainer = document.getElementById('toast-container');
  }

  /**
   * Show Toast Notification
   */
  function showToast(message, type = 'info', duration = 3500) {
    if (!DOM.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    DOM.toastContainer.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    const removeToast = () => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 300);
    };

    closeBtn.addEventListener('click', removeToast);
    setTimeout(removeToast, duration);
  }

  /**
   * Escape HTML to guard against XSS
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

  /**
   * Update Dashboard Counters & Notification Badge
   */
  function updateDashboard() {
    const all = MedShelfStorage.getAllMedicines();
    const settings = MedShelfStorage.getSettings();
    const threshold = settings.lowStockThreshold || 2;

    let safeCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    let lowStockCount = 0;

    all.forEach(item => {
      if (item.expiryStatus === 'SAFE') safeCount++;
      else if (item.expiryStatus === 'EXPIRING_SOON') expiringCount++;
      else if (item.expiryStatus === 'EXPIRED') expiredCount++;

      if (item.quantity <= threshold) lowStockCount++;
    });

    // Update Counter text
    if (DOM.countTotal) DOM.countTotal.textContent = all.length;
    if (DOM.countSafe) DOM.countSafe.textContent = safeCount;
    if (DOM.countExpiring) DOM.countExpiring.textContent = expiringCount;
    if (DOM.countExpired) DOM.countExpired.textContent = expiredCount;
    if (DOM.countLowStock) DOM.countLowStock.textContent = lowStockCount;

    // Highlight active card border
    Object.keys(DOM.cards).forEach(key => {
      if (DOM.cards[key]) {
        DOM.cards[key].classList.remove('card-selected');
      }
    });

    if (state.statusFilter === 'ALL' && DOM.cards.total) DOM.cards.total.classList.add('card-selected');
    if (state.statusFilter === 'SAFE' && DOM.cards.safe) DOM.cards.safe.classList.add('card-selected');
    if (state.statusFilter === 'EXPIRING_SOON' && DOM.cards.expiring) DOM.cards.expiring.classList.add('card-selected');
    if (state.statusFilter === 'EXPIRED' && DOM.cards.expired) DOM.cards.expired.classList.add('card-selected');
    if (state.statusFilter === 'LOW_STOCK' && DOM.cards.lowstock) DOM.cards.lowstock.classList.add('card-selected');

    // Update reminders bell badge
    const reminderSummary = MedShelfReminders.evaluateInventory(all);
    if (DOM.remindersBadge) {
      if (reminderSummary.hasAlerts) {
        DOM.remindersBadge.textContent = reminderSummary.totalUrgent + reminderSummary.lowStock.length;
        DOM.remindersBadge.style.display = 'inline-flex';
      } else {
        DOM.remindersBadge.style.display = 'none';
      }
    }

    // Refresh Family Member options in filter & form datalist
    refreshFamilyMembersDropdown();
  }

  /**
   * Populate Family Member dropdown with dynamic entries from stored records
   */
  function refreshFamilyMembersDropdown() {
    const members = MedShelfStorage.getDistinctFamilyMembers();
    const currentSelected = DOM.filterFamily ? DOM.filterFamily.value : 'ALL';

    // Populate Filter
    if (DOM.filterFamily) {
      let optionsHtml = '<option value="ALL">All Family Members</option>';
      members.forEach(member => {
        optionsHtml += `<option value="${escapeHtml(member)}">${escapeHtml(member)}</option>`;
      });
      DOM.filterFamily.innerHTML = optionsHtml;
      if (members.includes(currentSelected)) {
        DOM.filterFamily.value = currentSelected;
      }
    }

    // Populate Datalist for easy auto-complete in Add/Edit form
    if (DOM.familyDatalist) {
      const defaultMembers = ['General / Shared', 'Self', 'Mom', 'Dad', 'Grandpa', 'Grandma', 'Kids'];
      const combined = Array.from(new Set([...defaultMembers, ...members]));
      DOM.familyDatalist.innerHTML = combined
        .map(m => `<option value="${escapeHtml(m)}"></option>`)
        .join('');
    }
  }

  /**
   * Filter, search, and sort medicines according to current state
   */
  function getFilteredAndSortedMedicines() {
    let medicines = MedShelfStorage.getAllMedicines();

    // 1. Search Query Filter (Name, Description, Family, Category)
    if (state.searchQuery.trim() !== '') {
      const q = state.searchQuery.toLowerCase().trim();
      medicines = medicines.filter(m => {
        return (
          m.name.toLowerCase().includes(q) ||
          (m.category && m.category.toLowerCase().includes(q)) ||
          (m.familyMember && m.familyMember.toLowerCase().includes(q)) ||
          (m.description && m.description.toLowerCase().includes(q))
        );
      });
    }

    // 2. Status Filter
    if (state.statusFilter === 'SAFE') {
      medicines = medicines.filter(m => m.expiryStatus === 'SAFE');
    } else if (state.statusFilter === 'EXPIRING_SOON') {
      medicines = medicines.filter(m => m.expiryStatus === 'EXPIRING_SOON');
    } else if (state.statusFilter === 'EXPIRED') {
      medicines = medicines.filter(m => m.expiryStatus === 'EXPIRED');
    } else if (state.statusFilter === 'LOW_STOCK') {
      medicines = medicines.filter(m => m.isLowStock);
    }

    // 3. Family Filter
    if (state.familyFilter !== 'ALL') {
      medicines = medicines.filter(m => m.familyMember === state.familyFilter);
    }

    // 4. Category Filter
    if (state.categoryFilter !== 'ALL') {
      medicines = medicines.filter(m => m.category === state.categoryFilter);
    }

    // 5. Sorting
    medicines.sort((a, b) => {
      switch (state.sortBy) {
        case 'expiry-asc': // Earliest expiry first (default)
          return a.daysLeft - b.daysLeft;
        case 'expiry-desc': // Latest expiry first
          return b.daysLeft - a.daysLeft;
        case 'name-asc': // A to Z
          return a.name.localeCompare(b.name);
        case 'name-desc': // Z to A
          return b.name.localeCompare(a.name);
        case 'qty-asc': // Low stock first
          return a.quantity - b.quantity;
        case 'added-desc': // Recently added first
          return new Date(b.addedDate || 0) - new Date(a.addedDate || 0);
        default:
          return a.daysLeft - b.daysLeft;
      }
    });

    return medicines;
  }

  /**
   * Render Medicine List (Table & Grid Card Views)
   */
  function renderMedicineList() {
    const list = getFilteredAndSortedMedicines();
    const totalStored = MedShelfStorage.getAllMedicines().length;

    // Results summary line
    if (DOM.resultsSummary) {
      if (list.length === totalStored) {
        DOM.resultsSummary.innerHTML = `Showing all <strong>${list.length}</strong> medicines`;
      } else {
        DOM.resultsSummary.innerHTML = `Showing <strong>${list.length}</strong> of <strong>${totalStored}</strong> medicines (filtered)`;
      }
    }

    // Handle Empty States
    if (list.length === 0) {
      if (DOM.tableView) DOM.tableView.style.display = 'none';
      if (DOM.gridView) DOM.gridView.style.display = 'none';
      if (DOM.emptyState) {
        DOM.emptyState.style.display = 'block';
        if (totalStored === 0) {
          DOM.emptyState.innerHTML = `
            <div class="empty-state-graphic">💊</div>
            <h3>Your Medicine Shelf is Empty</h3>
            <p>You haven't added any medicines to your home shelf yet.</p>
            <div class="empty-state-actions">
              <button class="btn btn-primary" onclick="document.getElementById('btn-add-medicine').click()">+ Add First Medicine</button>
              <button class="btn btn-secondary" onclick="document.getElementById('btn-load-sample').click()">Load Demo Sample Data</button>
            </div>
          `;
        } else {
          DOM.emptyState.innerHTML = `
            <div class="empty-state-graphic">🔍</div>
            <h3>No Medicines Match Your Filter</h3>
            <p>Try adjusting your search query, status, or family member filter.</p>
            <div class="empty-state-actions">
              <button class="btn btn-outline" id="btn-clear-search-filter">Clear All Filters</button>
            </div>
          `;
          const btnClear = document.getElementById('btn-clear-search-filter');
          if (btnClear) {
            btnClear.addEventListener('click', resetFilters);
          }
        }
      }
      return;
    }

    if (DOM.emptyState) DOM.emptyState.style.display = 'none';

    // Show appropriate view
    if (state.viewMode === 'table') {
      if (DOM.tableView) DOM.tableView.style.display = 'block';
      if (DOM.gridView) DOM.gridView.style.display = 'none';
      renderTableView(list);
    } else {
      if (DOM.tableView) DOM.tableView.style.display = 'none';
      if (DOM.gridView) DOM.gridView.style.display = 'grid';
      renderGridView(list);
    }
  }

  /**
   * Render Table View
   */
  function renderTableView(list) {
    if (!DOM.tableBody) return;

    DOM.tableBody.innerHTML = list.map(med => {
      const statusBadge = getStatusBadgeHTML(med);
      const lowStockBadge = med.isLowStock
        ? `<span class="badge badge-low-stock" title="Low stock threshold is ${med.lowStockThreshold}">⚠️ Low Stock</span>`
        : '';

      return `
        <tr data-id="${med.id}" class="medicine-row ${med.expiryStatus === 'EXPIRED' ? 'row-expired' : ''}">
          <td class="col-name">
            <div class="med-name-container">
              <strong class="med-title">${escapeHtml(med.name)}</strong>
              ${med.category ? `<span class="med-category-pill">${escapeHtml(med.category)}</span>` : ''}
              ${med.description ? `<p class="med-desc-snippet">${escapeHtml(med.description)}</p>` : ''}
            </div>
          </td>
          <td class="col-expiry">
            <div class="expiry-date-cell">
              <span class="expiry-date-val">${med.expiryDate}</span>
              <span class="expiry-subtext">${med.expiryHumanText}</span>
            </div>
          </td>
          <td class="col-status">
            ${statusBadge}
          </td>
          <td class="col-qty">
            <div class="quantity-controller">
              <button class="btn-qty btn-qty-minus" data-action="decrease-qty" data-id="${med.id}" title="Decrease quantity">-</button>
              <span class="qty-display ${med.isLowStock ? 'qty-low' : ''}">${med.quantity}</span>
              <button class="btn-qty btn-qty-plus" data-action="increase-qty" data-id="${med.id}" title="Increase quantity">+</button>
            </div>
            ${lowStockBadge}
          </td>
          <td class="col-family">
            <span class="family-tag">
              <span class="tag-icon">👤</span> ${escapeHtml(med.familyMember || 'General')}
            </span>
          </td>
          <td class="col-actions">
            <div class="actions-group">
              <button class="btn-action btn-edit" data-action="edit" data-id="${med.id}" title="Edit medicine">
                ✏️ Edit
              </button>
              <button class="btn-action btn-delete" data-action="delete" data-id="${med.id}" title="Delete medicine">
                🗑️ Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Render Grid Card View
   */
  function renderGridView(list) {
    if (!DOM.gridView) return;

    DOM.gridView.innerHTML = list.map(med => {
      const statusBadge = getStatusBadgeHTML(med);
      const lowStockBadge = med.isLowStock
        ? `<span class="badge badge-low-stock">⚠️ Low Stock (${med.quantity} left)</span>`
        : '';

      return `
        <div class="medicine-card ${med.expiryStatus === 'EXPIRED' ? 'card-expired' : ''}" data-id="${med.id}">
          <div class="card-header">
            <div class="card-category">${escapeHtml(med.category || 'Medicine')}</div>
            <div class="card-status">${statusBadge}</div>
          </div>
          
          <h4 class="card-title">${escapeHtml(med.name)}</h4>
          
          ${med.description ? `<p class="card-description">${escapeHtml(med.description)}</p>` : ''}
          
          <div class="card-details">
            <div class="card-detail-item">
              <span class="detail-label">Expiry Date:</span>
              <span class="detail-value"><strong>${med.expiryDate}</strong></span>
            </div>
            <div class="card-detail-item">
              <span class="detail-label">Timeline:</span>
              <span class="detail-value ${med.statusBadgeClass}">${med.expiryHumanText}</span>
            </div>
            <div class="card-detail-item">
              <span class="detail-label">Family Member:</span>
              <span class="detail-value">👤 ${escapeHtml(med.familyMember || 'General')}</span>
            </div>
            <div class="card-detail-item card-qty-row">
              <span class="detail-label">Quantity:</span>
              <div class="quantity-controller">
                <button class="btn-qty btn-qty-minus" data-action="decrease-qty" data-id="${med.id}">-</button>
                <span class="qty-display ${med.isLowStock ? 'qty-low' : ''}">${med.quantity}</span>
                <button class="btn-qty btn-qty-plus" data-action="increase-qty" data-id="${med.id}">+</button>
              </div>
            </div>
          </div>

          ${lowStockBadge ? `<div class="card-alert-strip">${lowStockBadge}</div>` : ''}

          <div class="card-footer">
            <button class="btn btn-sm btn-outline" data-action="edit" data-id="${med.id}">✏️ Edit</button>
            <button class="btn btn-sm btn-danger-outline" data-action="delete" data-id="${med.id}">🗑️ Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Helper to generate HTML for status badge
   */
  function getStatusBadgeHTML(med) {
    if (med.expiryStatus === 'EXPIRED') {
      return `<span class="badge badge-expired"><span class="badge-dot dot-red"></span> Expired</span>`;
    } else if (med.expiryStatus === 'EXPIRING_SOON') {
      return `<span class="badge badge-warning"><span class="badge-dot dot-orange"></span> Expiring Soon</span>`;
    } else {
      return `<span class="badge badge-safe"><span class="badge-dot dot-green"></span> Safe</span>`;
    }
  }

  /**
   * Open Medicine Modal in Add or Edit Mode
   */
  function openMedicineModal(id = null) {
    state.editingId = id;
    clearFormErrors();

    if (id) {
      const med = MedShelfStorage.getMedicineById(id);
      if (!med) {
        showToast('Medicine not found', 'error');
        return;
      }
      if (DOM.medicineModalTitle) DOM.medicineModalTitle.textContent = 'Edit Medicine Details';
      if (DOM.inputName) DOM.inputName.value = med.name;
      if (DOM.inputExpiry) DOM.inputExpiry.value = med.expiryDate;
      if (DOM.inputQuantity) DOM.inputQuantity.value = med.quantity;
      if (DOM.inputFamily) DOM.inputFamily.value = med.familyMember || '';
      if (DOM.inputCategory) DOM.inputCategory.value = med.category || 'General';
      if (DOM.inputDescription) DOM.inputDescription.value = med.description || '';
    } else {
      if (DOM.medicineModalTitle) DOM.medicineModalTitle.textContent = 'Add New Medicine';
      if (DOM.medicineForm) DOM.medicineForm.reset();
      if (DOM.inputQuantity) DOM.inputQuantity.value = '1';
      if (DOM.inputCategory) DOM.inputCategory.value = 'General';
      if (DOM.inputFamily) DOM.inputFamily.value = 'General / Shared';
    }

    if (DOM.medicineModal) {
      DOM.medicineModal.classList.add('modal-open');
      if (DOM.inputName) DOM.inputName.focus();
    }
  }

  /**
   * Close Medicine Modal
   */
  function closeMedicineModal() {
    if (DOM.medicineModal) DOM.medicineModal.classList.remove('modal-open');
    state.editingId = null;
    clearFormErrors();
  }

  /**
   * Clear inline validation errors
   */
  function clearFormErrors() {
    document.querySelectorAll('.field-error-message').forEach(el => el.textContent = '');
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }

  /**
   * Validate Medicine Form Inputs
   */
  function validateMedicineForm() {
    let isValid = true;
    clearFormErrors();

    const name = DOM.inputName ? DOM.inputName.value.trim() : '';
    const expiry = DOM.inputExpiry ? DOM.inputExpiry.value : '';
    const quantity = DOM.inputQuantity ? parseInt(DOM.inputQuantity.value, 10) : 0;
    const family = DOM.inputFamily ? DOM.inputFamily.value.trim() : '';

    // Validate Name
    if (!name || name.length < 2) {
      showFieldError('med-name', 'Medicine name is required (minimum 2 characters).');
      isValid = false;
    }

    // Validate Expiry Date
    if (!expiry) {
      showFieldError('med-expiry', 'Please select a valid expiry date.');
      isValid = false;
    } else {
      const parsed = new Date(expiry);
      if (isNaN(parsed.getTime())) {
        showFieldError('med-expiry', 'Invalid date format.');
        isValid = false;
      }
    }

    // Validate Quantity
    if (isNaN(quantity) || quantity < 0) {
      showFieldError('med-quantity', 'Quantity must be 0 or a positive number.');
      isValid = false;
    }

    // Validate Family Member
    if (!family) {
      showFieldError('med-family', 'Please specify a family member or select "General / Shared".');
      isValid = false;
    }

    return isValid;
  }

  function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) field.classList.add('is-invalid');
    const errSpan = document.getElementById(`${fieldId}-error`);
    if (errSpan) errSpan.textContent = message;
  }

  /**
   * Handle Add/Edit Form Submit
   */
  function handleMedicineFormSubmit(e) {
    e.preventDefault();

    if (!validateMedicineForm()) {
      showToast('Please fix the errors in the form before submitting.', 'error');
      return;
    }

    const formData = {
      name: DOM.inputName.value.trim(),
      expiryDate: DOM.inputExpiry.value,
      quantity: parseInt(DOM.inputQuantity.value, 10) || 1,
      familyMember: DOM.inputFamily.value.trim(),
      category: DOM.inputCategory.value.trim() || 'General',
      description: DOM.inputDescription.value.trim()
    };

    if (state.editingId) {
      const updated = MedShelfStorage.updateMedicine(state.editingId, formData);
      if (updated) {
        showToast(`Updated "${updated.name}" successfully!`, 'success');
      } else {
        showToast('Failed to update medicine record.', 'error');
      }
    } else {
      const created = MedShelfStorage.addMedicine(formData);
      showToast(`Added "${created.name}" to your medicine shelf!`, 'success');
    }

    closeMedicineModal();
    updateDashboard();
    renderMedicineList();
  }

  /**
   * Open Delete Confirmation Modal
   */
  function openDeleteModal(id) {
    const med = MedShelfStorage.getMedicineById(id);
    if (!med) return;

    state.pendingDeleteId = id;
    if (DOM.deleteMedName) {
      DOM.deleteMedName.textContent = `"${med.name}" (${med.familyMember})`;
    }

    if (DOM.deleteModal) {
      DOM.deleteModal.classList.add('modal-open');
    }
  }

  /**
   * Close Delete Confirmation Modal
   */
  function closeDeleteModal() {
    if (DOM.deleteModal) DOM.deleteModal.classList.remove('modal-open');
    state.pendingDeleteId = null;
  }

  /**
   * Confirm and execute deletion
   */
  function confirmDelete() {
    if (!state.pendingDeleteId) return;

    const med = MedShelfStorage.getMedicineById(state.pendingDeleteId);
    const success = MedShelfStorage.deleteMedicine(state.pendingDeleteId);

    if (success) {
      showToast(`Deleted ${med ? `"${med.name}"` : 'medicine'} from inventory.`, 'info');
      closeDeleteModal();
      updateDashboard();
      renderMedicineList();
    } else {
      showToast('Could not delete medicine. Record not found.', 'error');
      closeDeleteModal();
    }
  }

  /**
   * Handle table/grid click actions (delegated)
   */
  function handleContainerClicks(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (!id) return;

    if (action === 'edit') {
      openMedicineModal(id);
    } else if (action === 'delete') {
      openDeleteModal(id);
    } else if (action === 'increase-qty') {
      MedShelfStorage.adjustQuantity(id, 1);
      updateDashboard();
      renderMedicineList();
    } else if (action === 'decrease-qty') {
      MedShelfStorage.adjustQuantity(id, -1);
      updateDashboard();
      renderMedicineList();
    }
  }

  /**
   * Open Reminders Modal & Render In-App Alerts
   */
  function openRemindersModal() {
    const all = MedShelfStorage.getAllMedicines();
    if (DOM.remindersBody) {
      DOM.remindersBody.innerHTML = MedShelfReminders.renderInAppRemindersHTML(all);

      // Bind notification permission button if rendered
      const btnEnable = document.getElementById('btn-enable-browser-notifications');
      if (btnEnable) {
        btnEnable.addEventListener('click', async () => {
          btnEnable.disabled = true;
          btnEnable.textContent = 'Requesting...';
          const perm = await MedShelfReminders.requestPermission();
          if (perm === 'granted') {
            showToast('Browser notifications enabled successfully!', 'success');
            MedShelfReminders.triggerSystemNotifications(all);
          } else {
            showToast(`Notification permission was ${perm}. In-app alerts remain active.`, 'warning');
          }
          openRemindersModal(); // Refresh reminders modal contents
        });
      }
    }

    if (DOM.remindersModal) {
      DOM.remindersModal.classList.add('modal-open');
    }
  }

  /**
   * Close Reminders Modal
   */
  function closeRemindersModal() {
    if (DOM.remindersModal) DOM.remindersModal.classList.remove('modal-open');
  }

  /**
   * Open Settings Modal
   */
  function openSettingsModal() {
    const settings = MedShelfStorage.getSettings();
    if (DOM.inputLowStockLimit) {
      DOM.inputLowStockLimit.value = settings.lowStockThreshold || 2;
    }
    if (DOM.settingsModal) DOM.settingsModal.classList.add('modal-open');
  }

  /**
   * Close Settings Modal
   */
  function closeSettingsModal() {
    if (DOM.settingsModal) DOM.settingsModal.classList.remove('modal-open');
  }

  /**
   * Handle Settings Form Submit
   */
  function handleSettingsSubmit(e) {
    e.preventDefault();
    const threshold = parseInt(DOM.inputLowStockLimit.value, 10);
    if (isNaN(threshold) || threshold < 1) {
      showToast('Please enter a valid threshold (1 or greater).', 'error');
      return;
    }

    MedShelfStorage.saveSettings({ lowStockThreshold: threshold });
    showToast(`Settings saved! Low stock threshold is now ${threshold}.`, 'success');
    closeSettingsModal();
    updateDashboard();
    renderMedicineList();
  }

  /**
   * Reset All Filters to Default
   */
  function resetFilters() {
    state.searchQuery = '';
    state.statusFilter = 'ALL';
    state.familyFilter = 'ALL';
    state.categoryFilter = 'ALL';
    state.sortBy = 'expiry-asc';

    if (DOM.searchInput) DOM.searchInput.value = '';
    if (DOM.filterStatus) DOM.filterStatus.value = 'ALL';
    if (DOM.filterFamily) DOM.filterFamily.value = 'ALL';
    if (DOM.filterCategory) DOM.filterCategory.value = 'ALL';
    if (DOM.sortBy) DOM.sortBy.value = 'expiry-asc';

    updateDashboard();
    renderMedicineList();
    showToast('Filters cleared', 'info', 2000);
  }

  /**
   * Export JSON Backup
   */
  function handleExportJSON() {
    const jsonStr = MedShelfStorage.exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `medshelf_backup_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Inventory backup exported successfully!', 'success');
  }

  /**
   * Trigger Import File Picker
   */
  function handleImportTrigger() {
    if (DOM.fileImportInput) {
      DOM.fileImportInput.value = '';
      DOM.fileImportInput.click();
    }
  }

  /**
   * Process Selected JSON File for Import
   */
  function handleFileImportChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const content = event.target.result;
      const result = MedShelfStorage.importDataJSON(content);

      if (result.success) {
        showToast(`Successfully imported ${result.count} medicines!`, 'success');
        updateDashboard();
        renderMedicineList();
      } else {
        showToast(`Import failed: ${result.error}`, 'error');
      }
    };
    reader.onerror = function () {
      showToast('Error reading import file.', 'error');
    };
    reader.readAsText(file);
  }

  /**
   * Load Sample Data Handler
   */
  function handleLoadSampleData() {
    if (confirm('Load demo medicine dataset? (This will add realistic sample medicines for demo & testing)')) {
      MedShelfStorage.loadSampleData();
      showToast('Demo dataset loaded successfully!', 'success');
      resetFilters();
    }
  }

  /**
   * Clear All Data Handler
   */
  function handleClearAllData() {
    if (confirm('⚠️ Are you sure you want to delete ALL medicine records? This cannot be undone.')) {
      MedShelfStorage.clearAllMedicines();
      showToast('All medicine records cleared.', 'info');
      updateDashboard();
      renderMedicineList();
    }
  }

  /**
   * Bind all event listeners
   */
  function bindEvents() {
    // Search input (live filtering)
    if (DOM.searchInput) {
      DOM.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderMedicineList();
      });
    }

    // Status filter
    if (DOM.filterStatus) {
      DOM.filterStatus.addEventListener('change', (e) => {
        state.statusFilter = e.target.value;
        updateDashboard();
        renderMedicineList();
      });
    }

    // Family filter
    if (DOM.filterFamily) {
      DOM.filterFamily.addEventListener('change', (e) => {
        state.familyFilter = e.target.value;
        renderMedicineList();
      });
    }

    // Category filter
    if (DOM.filterCategory) {
      DOM.filterCategory.addEventListener('change', (e) => {
        state.categoryFilter = e.target.value;
        renderMedicineList();
      });
    }

    // Sorting
    if (DOM.sortBy) {
      DOM.sortBy.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderMedicineList();
      });
    }

    // Reset filters
    if (DOM.btnResetFilters) {
      DOM.btnResetFilters.addEventListener('click', resetFilters);
    }

    // Dashboard Cards Quick Filtering
    if (DOM.cards.total) {
      DOM.cards.total.addEventListener('click', () => {
        state.statusFilter = 'ALL';
        if (DOM.filterStatus) DOM.filterStatus.value = 'ALL';
        updateDashboard();
        renderMedicineList();
        scrollToMedicineList();
      });
    }
    if (DOM.cards.safe) {
      DOM.cards.safe.addEventListener('click', () => {
        state.statusFilter = 'SAFE';
        if (DOM.filterStatus) DOM.filterStatus.value = 'SAFE';
        updateDashboard();
        renderMedicineList();
        scrollToMedicineList();
      });
    }
    if (DOM.cards.expiring) {
      DOM.cards.expiring.addEventListener('click', () => {
        state.statusFilter = 'EXPIRING_SOON';
        if (DOM.filterStatus) DOM.filterStatus.value = 'EXPIRING_SOON';
        updateDashboard();
        renderMedicineList();
        scrollToMedicineList();
      });
    }
    if (DOM.cards.expired) {
      DOM.cards.expired.addEventListener('click', () => {
        state.statusFilter = 'EXPIRED';
        if (DOM.filterStatus) DOM.filterStatus.value = 'EXPIRED';
        updateDashboard();
        renderMedicineList();
        scrollToMedicineList();
      });
    }
    if (DOM.cards.lowstock) {
      DOM.cards.lowstock.addEventListener('click', () => {
        state.statusFilter = 'LOW_STOCK';
        if (DOM.filterStatus) DOM.filterStatus.value = 'LOW_STOCK';
        updateDashboard();
        renderMedicineList();
        scrollToMedicineList();
      });
    }

    // View toggles
    if (DOM.btnViewTable) {
      DOM.btnViewTable.addEventListener('click', () => {
        state.viewMode = 'table';
        DOM.btnViewTable.classList.add('active');
        if (DOM.btnViewGrid) DOM.btnViewGrid.classList.remove('active');
        renderMedicineList();
      });
    }
    if (DOM.btnViewGrid) {
      DOM.btnViewGrid.addEventListener('click', () => {
        state.viewMode = 'grid';
        DOM.btnViewGrid.classList.add('active');
        if (DOM.btnViewTable) DOM.btnViewTable.classList.remove('active');
        renderMedicineList();
      });
    }

    // Add Medicine Button
    if (DOM.btnAddMedicine) {
      DOM.btnAddMedicine.addEventListener('click', () => openMedicineModal());
    }

    // Form Submit
    if (DOM.medicineForm) {
      DOM.medicineForm.addEventListener('submit', handleMedicineFormSubmit);
    }

    // Delete Modal Confirm
    if (DOM.btnConfirmDelete) {
      DOM.btnConfirmDelete.addEventListener('click', confirmDelete);
    }

    // Reminders
    if (DOM.btnOpenReminders) {
      DOM.btnOpenReminders.addEventListener('click', openRemindersModal);
    }

    // Settings
    if (DOM.btnOpenSettings) {
      DOM.btnOpenSettings.addEventListener('click', openSettingsModal);
    }
    if (DOM.settingsForm) {
      DOM.settingsForm.addEventListener('submit', handleSettingsSubmit);
    }

    // Data Management
    if (DOM.btnLoadSample) {
      DOM.btnLoadSample.addEventListener('click', handleLoadSampleData);
    }
    if (DOM.btnClearAll) {
      DOM.btnClearAll.addEventListener('click', handleClearAllData);
    }
    if (DOM.btnExportJson) {
      DOM.btnExportJson.addEventListener('click', handleExportJSON);
    }
    if (DOM.btnImportJson) {
      DOM.btnImportJson.addEventListener('click', handleImportTrigger);
    }
    if (DOM.fileImportInput) {
      DOM.fileImportInput.addEventListener('change', handleFileImportChange);
    }

    // Delegated actions inside Table & Grid containers
    if (DOM.tableView) DOM.tableView.addEventListener('click', handleContainerClicks);
    if (DOM.gridView) DOM.gridView.addEventListener('click', handleContainerClicks);

    // Modal Close Buttons (using data-close-modal attribute)
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeMedicineModal();
        closeDeleteModal();
        closeRemindersModal();
        closeSettingsModal();
      });
    });

    // Close modals on clicking overlay backdrop
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeMedicineModal();
          closeDeleteModal();
          closeRemindersModal();
          closeSettingsModal();
        }
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMedicineModal();
        closeDeleteModal();
        closeRemindersModal();
        closeSettingsModal();
      }
    });
  }

  function scrollToMedicineList() {
    const section = document.getElementById('inventory-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Bootstrapping MedShelf
   */
  function init() {
    cacheDOM();
    bindEvents();

    // Auto-seed with realistic sample data if first-time run
    MedShelfStorage.initializeIfEmpty();

    // Initial render
    updateDashboard();
    renderMedicineList();

    // Check system notifications for critical/expired medicines
    const all = MedShelfStorage.getAllMedicines();
    MedShelfReminders.triggerSystemNotifications(all);

    console.log('MedShelf Smart Medicine Expiry Tracker initialized.');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
