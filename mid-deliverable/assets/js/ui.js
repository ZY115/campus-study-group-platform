'use strict';

/* ================================================================
   UI.JS — Reusable Render Functions
   Campus Study Group Platform (WSU)
   Handles: group cards, comment threads, request tables, user/group
            admin tables, and all API-backed mutations.
   ================================================================ */

// ----------------------------------------------------------------
// 1. Group Card (Browse / Dashboard)
// ----------------------------------------------------------------

function renderGroupCard(group) {
  const isMember   = group.isMember;
  const isOrganizer= group.isOrganizer;
  const hasPending = group.hasPendingRequest;
  const role       = getCurrentRole();
  const isRemoved  = group.status === 'removed';

  // --- Action button logic ---
  let actionBtn = '';
  if (!isRemoved) {
    if (group.visibility === 'public') {
      if (isMember && !isOrganizer) {
        actionBtn = `<button class="btn btn-sm btn-outline-danger" onclick="leaveGroup(${group.id})">Leave</button>`;
      } else if (!isMember) {
        actionBtn = `<button class="btn btn-sm btn-wsu" onclick="joinGroup(${group.id})">Join</button>`;
      } else if (isOrganizer) {
        actionBtn = `<span class="badge bg-secondary">Organizer</span>`;
      }
    } else {
      // private group
      if (isMember && !isOrganizer) {
        actionBtn = `<button class="btn btn-sm btn-outline-danger" onclick="leaveGroup(${group.id})">Leave</button>`;
      } else if (isOrganizer) {
        actionBtn = `<span class="badge bg-secondary">Organizer</span>`;
      } else if (hasPending) {
        actionBtn = `<span class="badge badge-pending">&#8987; Pending</span>`;
      } else if (!isMember) {
        actionBtn = `<button class="btn btn-sm btn-warning text-dark" onclick="requestJoin(${group.id})">Request to Join</button>`;
      }
    }
  }

  // Determine detail link (private + not member + not admin → private gate page)
  let detailHref = `group-detail.html?id=${group.id}`;
  if (group.visibility === 'private' && !isMember && role !== 'Admin') {
    detailHref = `group-detail-private.html?id=${group.id}`;
  }

  const removedOverlay = isRemoved
    ? `<div class="card-overlay-removed"><span class="badge badge-removed fs-6">Removed by Admin</span></div>`
    : '';

  const memberCount = group.memberCount ?? 0;
  const memberBar   = memberCount / group.maxSize;
  const barWidth    = Math.min(100, Math.round(memberBar * 100));
  const barColor    = barWidth >= 90 ? 'bg-danger' : barWidth >= 60 ? 'bg-warning' : 'bg-success';

  const tags = Array.isArray(group.tags) && group.tags.length
    ? group.tags.map(t => `<span class="badge bg-secondary me-1">${t}</span>`).join('')
    : '';

  return `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card group-card h-100 position-relative ${isRemoved ? 'opacity-60' : ''}">
        ${removedOverlay}
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-1">
            <span class="badge bg-dark">${group.course}</span>
            <div class="d-flex gap-1 flex-wrap">
              ${visibilityBadge(group.visibility)}
              ${formatBadge(group.format)}
            </div>
          </div>
          <h5 class="card-title mb-1" style="font-size:1rem;">${group.name}</h5>
          <p class="card-text text-muted small flex-grow-1" style="line-height:1.45;">
            ${group.description.length > 130 ? group.description.substring(0, 130) + '…' : group.description}
          </p>
          <ul class="list-unstyled text-muted small mb-2">
            <li>&#128197; ${group.schedule}</li>
            <li>${group.format === 'virtual' ? '&#128187; Virtual' : '&#128205; ' + (group.location || '')}</li>
          </ul>
          ${tags ? `<div class="mb-2">${tags}</div>` : ''}
          <div class="mb-2">
            <div class="d-flex justify-content-between small text-muted mb-1">
              <span>Members</span><span>${memberCount} / ${group.maxSize}</span>
            </div>
            <div class="progress" style="height:5px;">
              <div class="progress-bar ${barColor}" style="width:${barWidth}%;"></div>
            </div>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-auto pt-2">
            <a href="${detailHref}" class="btn btn-sm btn-outline-primary">View Details</a>
            ${actionBtn}
          </div>
        </div>
        <div class="card-footer bg-transparent text-muted small py-2">
          Organized by ${group.organizerName || 'Unknown'}
        </div>
      </div>
    </div>`;
}

// ----------------------------------------------------------------
// 2. Groups Grid Container
// ----------------------------------------------------------------

function renderGroupsGrid(containerId, groups) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (groups.length === 0) {
    el.innerHTML = `<div class="col-12"><div class="alert alert-info border-0">No study groups match your filters. Try broadening your search!</div></div>`;
    return;
  }
  el.innerHTML = groups.map(g => renderGroupCard(g)).join('');
}

// ----------------------------------------------------------------
// 3. Join / Leave / Request
// ----------------------------------------------------------------

async function joinGroup(groupId) {
  try {
    await apiPost(`/api/groups/${groupId}/join`, {});
    showToast('Joined group successfully! &#127881;', 'success');
    setTimeout(() => location.reload(), 850);
  } catch (err) {
    showToast(err.message || 'Failed to join group.', 'error');
  }
}

async function leaveGroup(groupId) {
  if (!confirm('Are you sure you want to leave this group?')) return;
  try {
    await apiDelete(`/api/groups/${groupId}/leave`);
    showToast('You have left the group.', 'info');
    setTimeout(() => location.reload(), 850);
  } catch (err) {
    showToast(err.message || 'Failed to leave group.', 'error');
  }
}

async function requestJoin(groupId) {
  const message = prompt('Add a note to your join request (optional):') ?? '';
  try {
    await apiPost(`/api/groups/${groupId}/join`, { message });
    showToast('Join request sent! &#10003;', 'success');
    setTimeout(() => location.reload(), 850);
  } catch (err) {
    showToast(err.message || 'Failed to send request.', 'error');
  }
}

// ----------------------------------------------------------------
// 4. Discussion Comments
// ----------------------------------------------------------------

function renderComments(containerId, comments) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!comments || comments.length === 0) {
    el.innerHTML = '<p class="text-muted small fst-italic">No posts yet. Be the first to say something!</p>';
    return;
  }

  el.innerHTML = comments.map(c => {
    const initials = (c.userName || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return `
    <div class="comment-item">
      <div class="d-flex align-items-center gap-2 mb-1">
        <div class="avatar-circle" style="width:30px;height:30px;font-size:.65rem;background:#6c757d;">
          ${initials}
        </div>
        <strong class="small">${c.userName || 'Unknown'}</strong>
        <span class="text-muted" style="font-size:.75rem;">${fmtDateTime(c.createdAt)}</span>
      </div>
      <p class="mb-0 small">${c.text}</p>
    </div>`;
  }).join('');
}

async function postComment(groupId, text) {
  if (!text.trim()) return false;
  try {
    await apiPost(`/api/groups/${groupId}/comments`, { text: text.trim() });
    return true;
  } catch (err) {
    showToast(err.message || 'Failed to post comment.', 'error');
    return false;
  }
}

// ----------------------------------------------------------------
// 5. Organizer: Join Requests Table
// ----------------------------------------------------------------

function renderRequestRows(containerId, requests) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (requests.length === 0) {
    el.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-5 fst-italic">No join requests found.</td></tr>`;
    return;
  }

  el.innerHTML = requests.map(req => `
    <tr id="req-row-${req.id}">
      <td>
        <div class="fw-semibold">${req.userName || 'Unknown'}</div>
        <div class="text-muted small">${req.userEmail || ''}</div>
      </td>
      <td class="small">${req.groupName || ''}</td>
      <td class="small text-muted" style="max-width:260px;">${req.message || ''}</td>
      <td>${statusBadge(req.status)}<br><small class="text-muted">${fmtDate(req.requestedAt || req.createdAt)}</small></td>
      <td>
        ${req.status === 'pending'
          ? `<button class="btn btn-sm btn-success me-1 mb-1" onclick="approveRequest(${req.id})">Approve</button>
             <button class="btn btn-sm btn-danger mb-1"       onclick="rejectRequest(${req.id})">Reject</button>`
          : '<span class="text-muted small">—</span>'}
      </td>
    </tr>`).join('');
}

async function approveRequest(reqId) {
  try {
    await apiPut(`/api/join-requests/${reqId}`, { status: 'approved' });
    showToast('Request approved. &#10003;', 'success');
    setTimeout(() => location.reload(), 850);
  } catch (err) {
    showToast(err.message || 'Failed to approve request.', 'error');
  }
}

async function rejectRequest(reqId) {
  try {
    await apiPut(`/api/join-requests/${reqId}`, { status: 'rejected' });
    showToast('Request rejected.', 'info');
    setTimeout(() => location.reload(), 850);
  } catch (err) {
    showToast(err.message || 'Failed to reject request.', 'error');
  }
}

// ----------------------------------------------------------------
// 6. Admin: User Table
// ----------------------------------------------------------------

function renderUserRows(containerId, users) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (users.length === 0) {
    el.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5 fst-italic">No users found.</td></tr>`;
    return;
  }

  el.innerHTML = users.map(u => `
    <tr id="user-row-${u.id}">
      <td>
        <div class="d-flex align-items-center gap-2">
          <div class="avatar-circle" style="background:${u.role === 'Admin' ? '#dc3545' : u.role === 'Organizer' ? '#0d6efd' : '#198754'}; width:36px; height:36px; font-size:.7rem;">
            ${u.avatar}
          </div>
          <div>
            <div class="fw-semibold">${u.name}</div>
            <div class="text-muted small">${u.email}</div>
          </div>
        </div>
      </td>
      <td class="small">${u.major || ''}</td>
      <td><span class="role-badge role-${u.role}">${u.role}</span></td>
      <td>${statusBadge(u.status)}</td>
      <td class="text-muted small">${fmtDate(u.createdAt)}</td>
      <td>
        ${u.role === 'Admin'
          ? '<span class="text-muted small fst-italic">Protected</span>'
          : u.status === 'banned'
            ? `<button class="btn btn-sm btn-outline-success" onclick="unbanUser(${u.id})">Unban</button>`
            : `<button class="btn btn-sm btn-outline-danger"  onclick="banUser(${u.id})">Ban</button>`}
      </td>
    </tr>`).join('');
}

async function banUser(userId) {
  if (!confirm('Ban this user? They will lose platform access.')) return;
  try {
    await apiPut(`/api/admin/users/${userId}/status`, { action: 'ban' });
    showToast('User has been banned. &#9888;', 'warning');
    setTimeout(() => location.reload(), 850);
  } catch (err) {
    showToast(err.message || 'Failed to ban user.', 'error');
  }
}

async function unbanUser(userId) {
  try {
    await apiPut(`/api/admin/users/${userId}/status`, { action: 'unban' });
    showToast('User has been unbanned. &#10003;', 'success');
    setTimeout(() => location.reload(), 850);
  } catch (err) {
    showToast(err.message || 'Failed to unban user.', 'error');
  }
}

// ----------------------------------------------------------------
// 7. Admin: Group Moderation Table
// ----------------------------------------------------------------

function renderAdminGroupRows(containerId, groups) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (groups.length === 0) {
    el.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5 fst-italic">No groups found.</td></tr>`;
    return;
  }

  el.innerHTML = groups.map(g => `
    <tr id="group-row-${g.id}">
      <td>
        <div class="fw-semibold">${g.name}</div>
        <div class="text-muted small">${g.course}</div>
      </td>
      <td class="small">${g.organizerName || 'Unknown'}</td>
      <td>${visibilityBadge(g.visibility)}<br>${formatBadge(g.format)}</td>
      <td class="text-center small">${g.memberCount ?? 0} / ${g.maxSize}</td>
      <td>${statusBadge(g.status)}${g.reports > 0 ? ` <span class="badge bg-danger ms-1">${g.reports} reports</span>` : ''}</td>
      <td>
        ${g.status === 'active'
          ? `<button class="btn btn-sm btn-outline-danger"  onclick="removeGroup(${g.id})">Remove</button>`
          : `<button class="btn btn-sm btn-outline-success" onclick="restoreGroup(${g.id})">Restore</button>`}
        <a href="group-detail.html?id=${g.id}" class="btn btn-sm btn-outline-secondary ms-1">View</a>
      </td>
    </tr>`).join('');
}

async function removeGroup(groupId) {
  if (!confirm('Remove this group? Members will no longer be able to access it. This can be reversed.')) return;
  try {
    await apiPut(`/api/admin/groups/${groupId}/status`, { status: 'removed' });
    showToast('Group removed. &#10007;', 'warning');
    setTimeout(() => location.reload(), 850);
  } catch (err) {
    showToast(err.message || 'Failed to remove group.', 'error');
  }
}

async function restoreGroup(groupId) {
  try {
    await apiPut(`/api/admin/groups/${groupId}/status`, { status: 'active' });
    showToast('Group restored. &#10003;', 'success');
    setTimeout(() => location.reload(), 850);
  } catch (err) {
    showToast(err.message || 'Failed to restore group.', 'error');
  }
}
