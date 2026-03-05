# Campus Study Group Platform — Mid-Deliverable Prototype

**CPTS 489 — Spring 2026 | Washington State University**
Team: Finley Blaylock · Edgar Apodaca · Yuhang Zhang

---

## How to Run

This is a **pure frontend prototype** (HTML + CSS + JS). No server required.

1. Open `pages/index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
2. Click "Browse Groups" or use the login page to navigate.
3. Use the **Role Switcher panel** (bottom-right corner of every page) to switch between roles.

> **Tip:** You can also just open `pages/auth-login.html` and click one of the three demo login buttons for a clean start.

---

## Role Switching (Demo Mode)

Every page displays a floating **"DEMO — Switch Role"** panel in the bottom-right corner.

| Role          | Demo User       | Email             | Access Level                         |
|---------------|-----------------|-------------------|--------------------------------------|
| Participant   | Pat Participant | pat@wsu.edu       | Browse, Join, Request, Comment       |
| Organizer     | Oscar Organizer | oscar@wsu.edu     | + Create, Manage Groups, Approve/Reject Requests |
| Admin         | Alice Admin     | alice@wsu.edu     | Full access including Admin Panel    |

Use the **↺ Reset** button on the role switcher to restore all fake data to its initial state.

---

## File Structure

```
mid-deliverable/
  assets/
    css/
      styles.css          — Shared styles (Bootstrap 5 overrides + custom tokens)
    js/
      data.js             — Static fake data (users, groups, requests, comments)
      app.js              — Core logic: role mgmt, state, navbar, guard, toast
      ui.js               — Reusable render functions: cards, tables, mutations
  pages/
    index.html                    S-01 Home
    auth-login.html               S-02 Login
    auth-register.html            S-03 Register
    groups-list.html              S-04 Group Listing (search + filter)
    group-detail.html             S-05 Group Detail — Public / Member view
    group-detail-private.html     S-06 Group Detail — Private Gate (non-member)
    group-create.html             S-07 Create Group (Organizer/Admin)
    dashboard-participant.html    S-08 Participant Dashboard
    dashboard-organizer.html      S-09 Organizer Dashboard
    profile.html                  S-10 User Profile
    organizer-requests.html       S-11 Join Request Management
    organizer-group-manage.html   S-12 Edit / Manage Group
    admin-dashboard.html          S-13 Admin Dashboard
    admin-users.html              S-14 Admin — User Management
    admin-groups.html             S-15 Admin — Group Moderation
    403.html                      S-16 Access Denied
    404.html                      S-17 Not Found
  README.md
```

---

## Screens & Use Cases (Mapping)

### Screens → Use Cases

| Screen ID | File                          | Roles              | Use Cases Covered       |
|-----------|-------------------------------|--------------------|-------------------------|
| S-01      | index.html                    | All                | UC-01                   |
| S-02      | auth-login.html               | All                | (Authentication flow)   |
| S-03      | auth-register.html            | All                | (Registration flow)     |
| S-04      | groups-list.html              | All                | UC-01, UC-02            |
| S-05      | group-detail.html             | All / Members      | UC-03, UC-04, UC-06, UC-12 |
| S-06      | group-detail-private.html     | All (non-member)   | UC-03, UC-05            |
| S-07      | group-create.html             | Organizer, Admin   | UC-07                   |
| S-08      | dashboard-participant.html    | Participant, Admin | UC-01, UC-05            |
| S-09      | dashboard-organizer.html      | Organizer, Admin   | UC-08, UC-09, UC-10     |
| S-10      | profile.html                  | All                | UC-10 (partial)         |
| S-11      | organizer-requests.html       | Organizer, Admin   | UC-09, UC-10            |
| S-12      | organizer-group-manage.html   | Organizer, Admin   | UC-08, UC-11, UC-12     |
| S-13      | admin-dashboard.html          | Admin              | UC-13                   |
| S-14      | admin-users.html              | Admin              | UC-14                   |
| S-15      | admin-groups.html             | Admin              | UC-15                   |
| S-16      | 403.html                      | All                | (Permission boundary demo) |

### Use Cases → Screens

| UC ID | Use Case                          | Screens        |
|-------|-----------------------------------|----------------|
| UC-01 | Browse groups                     | S-01, S-04, S-08 |
| UC-02 | Filter / Search groups            | S-04           |
| UC-03 | View group detail                 | S-05, S-06     |
| UC-04 | Join / Leave public group         | S-05           |
| UC-05 | Request to join private group     | S-06, S-08     |
| UC-06 | Post comment in discussion thread | S-05           |
| UC-07 | Create study group                | S-07           |
| UC-08 | View / manage created groups      | S-09, S-12     |
| UC-09 | Approve join request              | S-09, S-11     |
| UC-10 | Reject join request               | S-09, S-11     |
| UC-11 | Edit group info / meeting link    | S-12           |
| UC-12 | Post organizer update             | S-05, S-12     |
| UC-13 | View admin dashboard stats        | S-13           |
| UC-14 | Ban / Unban user                  | S-14           |
| UC-15 | Remove / Restore group            | S-15           |

---

## Key Demo Flows

### Flow 1: Participant browses and joins a group
1. Open `pages/index.html` → Switch role to **Participant**
2. Click "Browse Groups" → `groups-list.html`
3. Filter by "In-Person" → Click "View Details" on CPTS 489 group
4. Click "Join This Group" → See success toast + membership update
5. Return to "My Dashboard" → Group appears in joined list

### Flow 2: Organizer creates a group and approves a request
1. Switch role to **Organizer** → Go to `dashboard-organizer.html`
2. Click "+ Create New Group" → Fill form → Submit
3. Go to `organizer-requests.html` → See pending requests for MATH 315
4. Click "Approve" → User added to group; "Reject" → Request marked rejected

### Flow 3: Participant requests to join private group
1. Switch role to **Participant** → Browse Groups
2. Click on "MATH 315 Linear Algebra" (private) → Redirected to S-06 gate page
3. Enter message → Click "Send Join Request" → Status shows Pending
4. Switch to **Organizer** → `organizer-requests.html` → Approve

### Flow 4: Admin moderates the platform
1. Switch role to **Admin** → Go to `admin-dashboard.html`
2. Navigate to "User Management" → Search "Max" → Click "Unban"
3. Go to "Group Moderation" → Find removed CHEM group → Click "Restore"
4. Try accessing admin pages as Participant → Redirected to S-16 (403)

---

## Technical Notes

- **No backend / server required** — all data persists in `localStorage`
- **Reset state** — click ↺ on the role switcher to restore initial data
- **Bootstrap 5.3** via CDN — consistent UI across all pages
- **guardPage(['Admin'])** — enforces role-based access; redirects to 403.html
- All mutations (join, approve, ban, remove) update `localStorage` and reload the relevant section

---

*CPTS 489 Web Application Development — Mid-Deliverable Prototype*
