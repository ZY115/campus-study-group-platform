'use strict';

/* ================================================================
   APP.JS — Core Application Logic
   Campus Study Group Platform (WSU)
   Handles: session-based auth (real API), navbar rendering,
            permission guard, toast, fetch helpers, utilities.
   ================================================================ */

// ----------------------------------------------------------------
// 1. Global Session Cache
// ----------------------------------------------------------------

/** Populated by initApp() from GET /api/auth/me. Null if not logged in. */
window._sgpUser = null;

function getCurrentUser()  { return window._sgpUser; }
function getCurrentRole()  { return window._sgpUser?.role  || null; }
function getCurrentUserId(){ return window._sgpUser?.id    || null; }

// ----------------------------------------------------------------
// 2. Fetch Helpers
// ----------------------------------------------------------------

async function apiGet(path) {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) throw Object.assign(new Error(res.statusText), { status: res.status });
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status });
  return data;
}

async function apiPut(path, body) {
  const res = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status });
  return data;
}

async function apiDelete(path) {
  const res = await fetch(path, { method: 'DELETE', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status });
  return data;
}

// ----------------------------------------------------------------
// 3. Permission Guard
// ----------------------------------------------------------------

/**
 * Call after initApp() on any restricted page.
 * guardPage(['Organizer', 'Admin']) → redirects to 403 if role not in list.
 * guardPage() with no args → redirects to login if not authenticated.
 */
async function guardPage(allowedRoles) {
  const user = window._sgpUser;

  if (!user) {
    // Not logged in — redirect to login
    sessionStorage.setItem('sgp_redirect', window.location.pathname + window.location.search);
    window.location.href = 'auth-login.html';
    return false;
  }

  if (user.status === 'banned') {
    showToast('Your account has been banned. Please contact an administrator.', 'error');
    setTimeout(() => {
      window.location.href = 'auth-login.html';
    }, 2000);
    return false;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    sessionStorage.setItem('sgp_denied_from', window.location.href);
    sessionStorage.setItem('sgp_denied_role', user.role);
    window.location.href = '403.html';
    return false;
  }

  return true;
}

// ----------------------------------------------------------------
// 4. Navbar
// ----------------------------------------------------------------

function _getNavLinks(role) {
  const browse = `<li class="nav-item"><a class="nav-link" href="groups-list.html">Browse Groups</a></li>`;

  if (role === 'Admin') {
    return browse + `
      <li class="nav-item"><a class="nav-link" href="dashboard-participant.html">My Groups</a></li>
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
          Admin Panel
        </a>
        <ul class="dropdown-menu dropdown-menu-dark">
          <li><a class="dropdown-item" href="admin-dashboard.html">Dashboard</a></li>
          <li><a class="dropdown-item" href="admin-users.html">User Management</a></li>
          <li><a class="dropdown-item" href="admin-groups.html">Group Moderation</a></li>
        </ul>
      </li>
      <li class="nav-item"><a class="nav-link" href="profile.html">Profile</a></li>`;
  }

  if (role === 'Organizer') {
    return browse + `
      <li class="nav-item"><a class="nav-link" href="dashboard-organizer.html">My Dashboard</a></li>
      <li class="nav-item"><a class="nav-link" href="group-create.html">+ Create Group</a></li>
      <li class="nav-item"><a class="nav-link" href="organizer-requests.html">Join Requests</a></li>
      <li class="nav-item"><a class="nav-link" href="profile.html">Profile</a></li>`;
  }

  // Participant (default)
  return browse + `
    <li class="nav-item"><a class="nav-link" href="dashboard-participant.html">My Dashboard</a></li>
    <li class="nav-item"><a class="nav-link" href="profile.html">Profile</a></li>`;
}

function renderNavbar() {
  const el = document.getElementById('navbar-placeholder');
  if (!el) return;

  const user = window._sgpUser;
  const role = user?.role || null;
  const avatarBg = role === 'Admin' ? '#dc3545' : role === 'Organizer' ? '#0d6efd' : '#198754';
  const initials = user?.avatar || '??';
  const displayName = user?.name || 'Guest';

  const userSection = user
    ? `<div class="d-flex align-items-center gap-2">
        <div class="avatar-circle" style="background:${avatarBg}; width:36px; height:36px; font-size:.75rem;">${initials}</div>
        <span class="text-white small d-none d-lg-inline">${displayName}</span>
        <span class="role-badge role-${role} ms-1">${role}</span>
        <button class="btn btn-sm btn-outline-light ms-2" onclick="logout()">Logout</button>
      </div>`
    : `<div class="d-flex gap-2">
        <a href="auth-login.html" class="btn btn-sm btn-outline-light">Login</a>
        <a href="auth-register.html" class="btn btn-sm btn-wsu">Register</a>
      </div>`;

  el.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-wsu shadow-sm">
      <div class="container">
        <a class="navbar-brand fw-bold" href="index.html">
          &#127891; StudyGroup <span style="opacity:.75;font-weight:400;">WSU</span>
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#sgpNav" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="sgpNav">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            ${role ? _getNavLinks(role) : `<li class="nav-item"><a class="nav-link" href="groups-list.html">Browse Groups</a></li>`}
          </ul>
          ${userSection}
        </div>
      </div>
    </nav>`;

  // Highlight active nav link
  const path = window.location.pathname.split('/').pop();
  el.querySelectorAll('.nav-link').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active', 'fw-semibold');
  });
}

// ----------------------------------------------------------------
// 5. Logout
// ----------------------------------------------------------------

async function logout() {
  try {
    await apiPost('/api/auth/logout', {});
  } catch (_) { /* ignore */ }
  window._sgpUser = null;
  window.location.href = 'auth-login.html';
}

// ----------------------------------------------------------------
// 6. Toast Notifications
// ----------------------------------------------------------------

function showToast(message, type = 'success') {
  const bgMap = {
    success: 'bg-success text-white',
    error:   'bg-danger text-white',
    warning: 'bg-warning text-dark',
    info:    'bg-info text-dark',
  };

  const container = document.getElementById('toast-container');
  if (!container) return;

  const id  = 'toast-' + Date.now();
  const cls = bgMap[type] || bgMap.success;
  container.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast align-items-center ${cls} border-0 show" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body fw-semibold">${message}</div>
        <button type="button" class="btn-close ${type === 'success' || type === 'error' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>`);

  const el    = document.getElementById(id);
  const toast = new bootstrap.Toast(el, { delay: 3500 });
  toast.show();
  el.addEventListener('hidden.bs.toast', () => el.remove());
}

// ----------------------------------------------------------------
// 7. URL / Format Utilities
// ----------------------------------------------------------------

function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function visibilityBadge(v) {
  return `<span class="badge badge-${v}">${v === 'public' ? '&#127758; Public' : '&#128274; Private'}</span>`;
}

function formatBadge(f) {
  return `<span class="badge badge-${f === 'virtual' ? 'virtual' : 'in-person'}">${f === 'virtual' ? '&#128187; Virtual' : '&#128205; In-Person'}</span>`;
}

function statusBadge(s) {
  const map    = { active: 'badge-active', removed: 'badge-removed', pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', banned: 'badge-banned' };
  const labels = { active: '&#10003; Active', removed: '&#10007; Removed', pending: '&#8987; Pending', approved: '&#10003; Approved', rejected: '&#10007; Rejected', banned: '&#9888; Banned' };
  return `<span class="badge ${map[s] || ''}">${labels[s] || s}</span>`;
}

// ----------------------------------------------------------------
// 8. App Boot
// ----------------------------------------------------------------

/**
 * Call initApp() on every page load.
 * Fetches /api/auth/me to populate window._sgpUser, then renders navbar.
 * Returns the user object (or null if not logged in).
 */
async function initApp() {
  try {
    window._sgpUser = await apiGet('/api/auth/me');
  } catch (err) {
    // 401 = not logged in; anything else is a server error
    if (err.status !== 401) console.warn('[initApp] session check failed:', err);
    window._sgpUser = null;
  }
  renderNavbar();
  return window._sgpUser;
}
