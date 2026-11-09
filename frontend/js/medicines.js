/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker
 * Module: Medicine Management Controller (frontend/js/medicines.js)
 * Handles full CRUD operations connected to Node.js / MySQL backend
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Guard: Ensure user is logged in
  if (!MedShelfAPI.requireAuth()) return;

  const user = MedShelfAPI.getUser();
  const navUserName = document.getElementById('nav-user-name');
  const userAvatar = document.querySelector('.user-avatar');
  const displayName = (user && user.fullName) ? user.fullName : 'Reena';

  if (navUserName) {
    navUserName.textContent = displayName;
  }
  if (userAvatar) {
    userAvatar.textContent = displayName.charAt(0).toUpperCase();
  }

  // Bind Logout Button
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

  // 2. Parse URL parameters for initial filter (e.g. ?status=EXPIRING_SOON)
  const urlParams = new URLSearchParams(window.location.search);
  const initialStatus = urlParams.get('status') || 'ALL';
  const filterStatusSelect = document.getElementById('filter-status');
  if (filterStatusSelect && initialStatus) {
    filterStatusSelect.value = initialStatus;
  }

  // 3. Initialize Medicines State & Event Bindings
  initMedicinesModule();

  // 4. Load Medicines from Backend API
  await loadMedicines();

  // 5. Check if navigated directly with ?action=add
  if (urlParams.get('action') === 'add') {
    openMedicineModal(null);
  }
});

let currentMedicines = [];
let editingMedicineId = null;
let pendingDeleteId = null;
let viewMode = 'table';

function initMedicinesModule() {
  // Search Input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(loadMedicines, 250));
  }

  // Filter Dropdowns
  const filterStatus = document.getElementById('filter-status');
  if (filterStatus) filterStatus.addEventListener('change', loadMedicines);

  const filterFamily = document.getElementById('filter-family');
  if (filterFamily) filterFamily.addEventListener('change', loadMedicines);

  const filterCategory = document.getElementById('filter-category');
  if (filterCategory) filterCategory.addEventListener('change', loadMedicines);

  const sortBy = document.getElementById('sort-by');
  if (sortBy) sortBy.addEventListener('change', loadMedicines);

  // Reset Filters Button
  const btnReset = document.getElementById('btn-reset-filters');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (filterStatus) filterStatus.value = 'ALL';
      if (filterFamily) filterFamily.value = 'ALL';
      if (filterCategory) filterCategory.value = 'ALL';
      if (sortBy) sortBy.value = 'expiry-asc';
      loadMedicines();
    });
  }

  // View Mode Toggles
  const btnViewTable = document.getElementById('btn-view-table');
  const btnViewGrid = document.getElementById('btn-view-grid');

  if (btnViewTable && btnViewGrid) {
    btnViewTable.addEventListener('click', () => {
      viewMode = 'table';
      btnViewTable.classList.add('active');
      btnViewGrid.classList.remove('active');
      renderMedicinesView();
    });

    btnViewGrid.addEventListener('click', () => {
      viewMode = 'grid';
      btnViewGrid.classList.add('active');
      btnViewTable.classList.remove('active');
      renderMedicinesView();
    });
  }

  // Add Medicine Button
  const btnAdd = document.getElementById('btn-add-medicine');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => openMedicineModal(null));
  }

  // Add/Edit Form Submit
  const medicineForm = document.getElementById('medicine-form');
  if (medicineForm) {
    medicineForm.addEventListener('submit', handleMedicineFormSubmit);
  }

  // Delete Confirmation Submit
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', handleConfirmDelete);
  }

  // Container Delegated Actions (Edit, Delete, +/- Qty)
  const tableView = document.getElementById('medicine-table-view');
  const gridView = document.getElementById('medicine-grid-view');

  if (tableView) tableView.addEventListener('click', handleActionClicks);
  if (gridView) gridView.addEventListener('click', handleActionClicks);

  // Modal Closers
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('modal-open'));
      editingMedicineId = null;
      pendingDeleteId = null;
    });
  });
}

/**
 * Fetch Medicines from Backend API
 */
async function loadMedicines() {
  const searchInput = document.getElementById('search-input');
  const filterStatus = document.getElementById('filter-status');
  const filterFamily = document.getElementById('filter-family');
  const filterCategory = document.getElementById('filter-category');
  const sortBy = document.getElementById('sort-by');

  const queryParams = new URLSearchParams();
  if (searchInput && searchInput.value.trim()) queryParams.set('search', searchInput.value.trim());
  if (filterStatus && filterStatus.value !== 'ALL') queryParams.set('status', filterStatus.value);
  if (filterFamily && filterFamily.value !== 'ALL') queryParams.set('family', filterFamily.value);
  if (filterCategory && filterCategory.value !== 'ALL') queryParams.set('category', filterCategory.value);
  if (sortBy && sortBy.value) queryParams.set('sort', sortBy.value);

  try {
    const data = await MedShelfAPI.request(`/medicines?${queryParams.toString()}`);
    currentMedicines = data.medicines || [];
    renderMedicinesView();
    updateFamilyFilterOptions();
  } catch (err) {
    console.error('Failed to load medicines:', err);
    showToast(err.message, 'error');
  }
}

/**
 * Render Active View (Table vs Grid)
 */
function renderMedicinesView() {
  const tableView = document.getElementById('medicine-table-view');
  const gridView = document.getElementById('medicine-grid-view');
  const emptyState = document.getElementById('empty-state');
  const summaryEl = document.getElementById('results-summary');

  if (summaryEl) {
    summaryEl.textContent = `Showing ${currentMedicines.length} medicine(s)`;
  }

  if (currentMedicines.length === 0) {
    if (tableView) tableView.style.display = 'none';
    if (gridView) gridView.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  if (viewMode === 'table') {
    if (tableView) tableView.style.display = 'block';
    if (gridView) gridView.style.display = 'none';
    renderTable();
  } else {
    if (tableView) tableView.style.display = 'none';
    if (gridView) gridView.style.display = 'grid';
    renderGrid();
  }
}

/**
 * Render Table Rows
 */
function renderTable() {
  const tbody = document.getElementById('medicine-table-body');
  if (!tbody) return;

  tbody.innerHTML = currentMedicines.map(med => {
    const statusBadge = getStatusBadgeHTML(med);
    const lowStockTag = med.isLowStock
      ? `<span class="badge badge-low-stock">⚠️ Low Stock (&le; 2)</span>`
      : '';

    return `
      <tr class="${med.expiryStatus === 'EXPIRED' ? 'row-expired' : ''}">
        <td>
          <div style="display: flex; flex-direction: column; gap: 0.2rem;">
            <strong style="font-size: 0.95rem; color: var(--text-main);">${escapeHtml(med.name)}</strong>
            <span style="font-size: 0.75rem; color: var(--text-muted); background: #f1f5f9; padding: 0.15rem 0.5rem; border-radius: 999px; width: fit-content;">${escapeHtml(med.category)}</span>
            ${med.description ? `<span style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(med.description)}</span>` : ''}
          </div>
        </td>
        <td>
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 700;">${med.expiryDate}</span>
            <span style="font-size: 0.78rem; color: var(--text-muted);">${med.expiryHumanText}</span>
          </div>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div class="quantity-controller">
            <button class="btn-qty" data-action="decrease-qty" data-id="${med.id}">-</button>
            <span class="qty-display ${med.isLowStock ? 'qty-low' : ''}">${med.quantity}</span>
            <button class="btn-qty" data-action="increase-qty" data-id="${med.id}">+</button>
          </div>
          ${lowStockTag}
        </td>
        <td>
          <span style="font-size: 0.88rem; font-weight: 500;">👤 ${escapeHtml(med.familyMember)}</span>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 0.35rem;">
            <button class="btn btn-sm btn-outline" data-action="edit" data-id="${med.id}">✏️ Edit</button>
            <button class="btn btn-sm btn-danger-outline" data-action="delete" data-id="${med.id}">🗑️ Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Grid Cards
 */
function renderGrid() {
  const gridView = document.getElementById('medicine-grid-view');
  if (!gridView) return;

  gridView.innerHTML = currentMedicines.map(med => {
    const statusBadge = getStatusBadgeHTML(med);
    const lowStockTag = med.isLowStock ? `<div style="margin-top: 0.5rem;"><span class="badge badge-low-stock">⚠️ Low Stock (${med.quantity} remaining)</span></div>` : '';

    return `
      <div class="medicine-card ${med.expiryStatus === 'EXPIRED' ? 'card-expired' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <span style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">${escapeHtml(med.category)}</span>
          ${statusBadge}
        </div>
        <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.4rem;">${escapeHtml(med.name)}</h4>
        ${med.description ? `<p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem;">${escapeHtml(med.description)}</p>` : ''}
        
        <div style="background: #f8fafc; border-radius: var(--radius-md); padding: 0.75rem; font-size: 0.85rem; margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
            <span style="color: var(--text-muted);">Expiry Date:</span>
            <strong>${med.expiryDate}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
            <span style="color: var(--text-muted);">Status:</span>
            <span>${med.expiryHumanText}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.3rem;">
            <span style="color: var(--text-muted);">For Person:</span>
            <strong>${escapeHtml(med.familyMember)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.4rem;">
            <span style="color: var(--text-muted);">Quantity:</span>
            <div class="quantity-controller">
              <button class="btn-qty" data-action="decrease-qty" data-id="${med.id}">-</button>
              <span class="qty-display ${med.isLowStock ? 'qty-low' : ''}">${med.quantity}</span>
              <button class="btn-qty" data-action="increase-qty" data-id="${med.id}">+</button>
            </div>
          </div>
        </div>

        ${lowStockTag}

        <div style="margin-top: auto; display: flex; justify-content: flex-end; gap: 0.5rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color);">
          <button class="btn btn-sm btn-outline" data-action="edit" data-id="${med.id}">✏️ Edit</button>
          <button class="btn btn-sm btn-danger-outline" data-action="delete" data-id="${med.id}">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

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
 * Handle Click Actions
 */
async function handleActionClicks(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = parseInt(btn.dataset.id, 10);
  if (!id) return;

  if (action === 'edit') {
    openMedicineModal(id);
  } else if (action === 'delete') {
    openDeleteModal(id);
  } else if (action === 'increase-qty') {
    await adjustMedicineQuantity(id, 1);
  } else if (action === 'decrease-qty') {
    await adjustMedicineQuantity(id, -1);
  }
}

async function adjustMedicineQuantity(id, delta) {
  try {
    await MedShelfAPI.request(`/medicines/${id}/adjust-qty`, {
      method: 'PATCH',
      body: JSON.stringify({ delta })
    });
    await loadMedicines();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Open Add/Edit Modal
 */
function openMedicineModal(id = null) {
  editingMedicineId = id;
  const modal = document.getElementById('medicine-modal');
  const title = document.getElementById('medicine-modal-title');
  const form = document.getElementById('medicine-form');

  clearFormErrors();

  if (id) {
    const med = currentMedicines.find(m => m.id === id);
    if (!med) return;
    title.textContent = 'Edit Medicine Details';
    document.getElementById('med-name').value = med.name;
    document.getElementById('med-expiry').value = med.expiryDate;
    document.getElementById('med-quantity').value = med.quantity;
    document.getElementById('med-family').value = med.familyMember;
    document.getElementById('med-category').value = med.category || 'General';
    document.getElementById('med-description').value = med.description || '';
  } else {
    title.textContent = 'Add New Medicine';
    form.reset();
    document.getElementById('med-quantity').value = '1';
    document.getElementById('med-category').value = 'General';
    document.getElementById('med-family').value = 'General / Shared';
  }

  if (modal) modal.classList.add('modal-open');
}

/**
 * Handle Add/Edit Submit
 */
async function handleMedicineFormSubmit(e) {
  e.preventDefault();
  clearFormErrors();

  const name = document.getElementById('med-name').value.trim();
  const expiryDate = document.getElementById('med-expiry').value;
  const quantity = parseInt(document.getElementById('med-quantity').value, 10);
  const familyMember = document.getElementById('med-family').value.trim();
  const category = document.getElementById('med-category').value;
  const description = document.getElementById('med-description').value.trim();

  let valid = true;
  if (!name || name.length < 2) {
    showFieldError('med-name', 'Medicine name is required (min 2 characters).');
    valid = false;
  }
  if (!expiryDate) {
    showFieldError('med-expiry', 'Please pick a valid expiry date.');
    valid = false;
  }
  if (isNaN(quantity) || quantity < 0) {
    showFieldError('med-quantity', 'Quantity must be 0 or greater.');
    valid = false;
  }
  if (!familyMember) {
    showFieldError('med-family', 'Family member name is required.');
    valid = false;
  }

  if (!valid) return;

  const payload = {
    name,
    expiryDate,
    quantity,
    familyMember,
    category,
    description
  };

  try {
    const submitBtn = document.getElementById('btn-save-medicine');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    if (editingMedicineId) {
      await MedShelfAPI.request(`/medicines/${editingMedicineId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast(`Updated "${name}" successfully!`, 'success');
    } else {
      await MedShelfAPI.request('/medicines', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast(`Added "${name}" to your medicine shelf!`, 'success');
    }

    document.getElementById('medicine-modal').classList.remove('modal-open');
    editingMedicineId = null;
    await loadMedicines();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    const submitBtn = document.getElementById('btn-save-medicine');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Medicine';
  }
}

/**
 * Delete Modal
 */
function openDeleteModal(id) {
  pendingDeleteId = id;
  const med = currentMedicines.find(m => m.id === id);
  if (!med) return;

  const nameEl = document.getElementById('delete-med-name');
  if (nameEl) nameEl.textContent = `"${med.name}" (${med.familyMember})`;

  const modal = document.getElementById('delete-modal');
  if (modal) modal.classList.add('modal-open');
}

async function handleConfirmDelete() {
  if (!pendingDeleteId) return;

  try {
    await MedShelfAPI.request(`/medicines/${pendingDeleteId}`, {
      method: 'DELETE'
    });
    showToast('Medicine removed successfully.', 'info');
    document.getElementById('delete-modal').classList.remove('modal-open');
    pendingDeleteId = null;
    await loadMedicines();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Dynamic Family Member Options
 */
function updateFamilyFilterOptions() {
  const select = document.getElementById('filter-family');
  if (!select) return;

  const members = new Set();
  currentMedicines.forEach(m => {
    if (m.familyMember) members.add(m.familyMember);
  });

  const currentVal = select.value;
  let html = '<option value="ALL">All Family Members</option>';
  Array.from(members).sort().forEach(member => {
    html += `<option value="${escapeHtml(member)}" ${member === currentVal ? 'selected' : ''}>${escapeHtml(member)}</option>`;
  });
  select.innerHTML = html;
}

function clearFormErrors() {
  document.querySelectorAll('.field-error-message').forEach(el => el.textContent = '');
  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  const err = document.getElementById(`${id}-error`);
  if (el) el.classList.add('is-invalid');
  if (err) err.textContent = msg;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

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
