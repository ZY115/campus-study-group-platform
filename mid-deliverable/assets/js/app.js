'use strict';

/* ================================================================
   APP.JS — Core Application Logic
   Campus Study Group Platform (WSU)
   Handles: role management, localStorage state, navbar rendering,
            role-switcher panel, permission guard, toast, utilities.
   ================================================================ */

// ----------------------------------------------------------------
// 1. Role & Current User
// ----------------------------------------------------------------

/** Maps the active demo role to a pre-defined fake user ID. */
const ROLE_TO_USER_ID = {
  Admin:       'u1',
  Organizer:   'u2',
  Participant: 'u3',
};

function getCurrentRole() {
  return localStorage.getItem('sgp_role') || 'Participant';
}

function getCurrentUserId() {
  return ROLE_TO_USER_ID[getCurrentRole()];
}

function getCurrentUser() {
  const state = getState();
  return state.users.find(u => u.id === getCurrentUserId()) || null;
}

// ----------------------------------------------------------------
// 2. localStorage State
// ----------------------------------------------------------------

const STATE_KEY = 'sgp_state';

function getState() {
  const stored = localStorage.getItem(STATE_KEY);
  if (stored) {
    try { return JSON.parse(stored); }
    catch (_) { /* fall through to init */ }
  }
  return _initState();
}

function _initState() {
  const state = {
    groups:       JSON.parse(JSON.stringify(INITIAL_GROUPS)),
    users:        JSON.parse(JSON.stringify(INITIAL_USERS)),
    joinRequests: JSON.parse(JSON.stringify(INITIAL_JOIN_REQUESTS)),
    comments:     JSON.parse(JSON.stringify(INITIAL_COMMENTS)),
    bannedUsers:  ['u6'],
    removedGroups:['g6'],
  };
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
  return state;
}

function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function resetState() {
  localStorage.removeItem(STATE_KEY);
  return _initState();
}

// ----------------------------------------------------------------
// 3. Permission Guard
// ----------------------------------------------------------------

/**
 * Call at the top of any restricted page.
 * guardPage(['Organizer', 'Admin']) → redirects to 403 if role not in list.
 */
function guardPage(allowedRoles) {
  const role = getCurrentRole();
  if (!allowedRoles.includes(role)) {
    sessionStorage.setItem('sgp_denied_from', window.location.href);
    sessionStorage.setItem('sgp_denied_role', role);
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

  const role = getCurrentRole();
  const user = getCurrentUser();
  const avatarBg = role === 'Admin' ? '#dc3545' : role === 'Organizer' ? '#0d6efd' : '#198754';
  const initials = user ? user.avatar : '??';
  const displayName = user ? user.name : 'Guest';

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
            ${_getNavLinks(role)}
          </ul>
          <div class="d-flex align-items-center gap-2">
            <div class="avatar-circle" style="background:${avatarBg}; width:36px; height:36px; font-size:.75rem;">${initials}</div>
            <span class="text-white small d-none d-lg-inline">${displayName}</span>
            <span class="role-badge role-${role} ms-1">${role}</span>
            <a href="auth-login.html" class="btn btn-sm btn-outline-light ms-2">Switch User</a>
          </div>
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
// 5. Role-Switcher Demo Panel
// ----------------------------------------------------------------

function renderRoleSwitcher() {
  const role = getCurrentRole();

  const html = `
    <div id="role-switcher-panel">
      <div class="panel-header">
        <span>&#128295; DEMO — Switch Role</span>
        <button class="btn btn-sm btn-outline-secondary py-0 px-1" onclick="resetAppState()" title="Reset all state to defaults">&#8635;</button>
      </div>
      <div class="btn-group w-100" role="group" aria-label="Role switcher">
        <button type="button" class="btn btn-sm ${role === 'Participant' ? 'btn-success' : 'btn-outline-success'}" onclick="switchRole('Participant')">Participant</button>
        <button type="button" class="btn btn-sm ${role === 'Organizer'  ? 'btn-primary' : 'btn-outline-primary'}"  onclick="switchRole('Organizer')">Organizer</button>
        <button type="button" class="btn btn-sm ${role === 'Admin'      ? 'btn-danger'  : 'btn-outline-danger'}"   onclick="switchRole('Admin')">Admin</button>
      </div>
      <p class="text-center mb-0 mt-1" style="font-size:.7rem; color:#888;">
        Active: <strong>${role}</strong> &bull; <em>state persists in localStorage</em>
      </p>
    </div>`;

  // Inject or replace the panel
  let panel = document.getElementById('role-switcher-panel');
  if (panel) {
    panel.outerHTML = html;
  } else {
    document.body.insertAdjacentHTML('beforeend', html);
  }
}

function switchRole(role) {
  localStorage.setItem('sgp_role', role);
  window.location.reload();
}

function resetAppState() {
  resetState();
  showToast('State reset to defaults.', 'info');
  setTimeout(() => window.location.reload(), 900);
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

/** Call initApp() on every page load to set up navbar + switcher. */
function initApp() {
  if (!localStorage.getItem(STATE_KEY)) _initState();
  renderNavbar();
  renderRoleSwitcher();
}
