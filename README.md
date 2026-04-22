# StudyGroup WSU — Campus Study Group Platform

**CPTS 489 Final Project — Spring 2026**
Team: Finley Blaylock · Edgar Apodaca · Yuhang Zhang

---

## Overview

A full-stack web application that allows WSU students to discover, create, and manage study groups. Built with Express.js, Sequelize ORM, and SQLite on the backend, with plain HTML/CSS/JavaScript (Bootstrap 5) on the frontend.

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Backend   | Node.js + Express.js              |
| ORM       | Sequelize v6                      |
| Database  | SQLite (file: `data.sqlite`)      |
| Auth      | express-session (cookie-based)    |
| Frontend  | Bootstrap 5.3 + Vanilla JS        |
| Passwords | bcryptjs                          |

---

## Prerequisites

- Node.js v18 or higher
- npm

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment (optional)

Create a `.env` file in the project root. All fields have defaults for local development:

```env
SESSION_SECRET=your-secret-key-here
PORT=3000
```

### 3. Seed the database

This creates the SQLite database and populates it with demo data:

```bash
npm run seed
```

### 4. Start the server

```bash
# Production
npm start

# Development (auto-restart on file changes)
npm run dev
```

The server starts at **http://localhost:3000**.
Open `http://localhost:3000` in your browser — it serves the frontend automatically.

---

## Demo Credentials

| Email                | Password        | Role        |
|----------------------|-----------------|-------------|
| alice@wsu.edu        | admin123        | Admin       |
| oscar@wsu.edu        | organizer123    | Organizer   |
| riley@wsu.edu        | organizer123    | Organizer   |
| pat@wsu.edu          | participant123  | Participant |
| sam@wsu.edu          | participant123  | Participant |
| max@wsu.edu          | banned123       | Participant (banned) |

---

## Project Structure

```
campus-study-group-platform/
├── app.js                    # Express entry point
├── package.json
├── .env                      # Environment variables (not committed)
├── data.sqlite               # SQLite database (auto-created by seed)
│
├── config/
│   └── database.js           # Sequelize + SQLite configuration
│
├── models/
│   ├── index.js              # Model registry + associations
│   ├── User.js
│   ├── Group.js
│   ├── JoinRequest.js
│   └── Comment.js
│
├── controllers/
│   ├── authController.js     # Login, register, logout, /me
│   ├── groupController.js    # Group CRUD, join, leave, removeMember
│   ├── commentController.js  # Comment list + create
│   ├── joinRequestController.js  # List + approve/reject requests
│   ├── userController.js     # Profile read/update
│   └── adminController.js    # Stats, user/group moderation
│
├── routes/
│   ├── auth.js               # /api/auth/*
│   ├── groups.js             # /api/groups/*
│   ├── joinRequests.js       # /api/join-requests/*
│   ├── users.js              # /api/users/*
│   └── admin.js              # /api/admin/*
│
├── middleware/
│   └── auth.js               # requireAuth, requireRole guards
│
├── seeders/
│   └── seed.js               # Database seeder
│
└── mid-deliverable/          # Frontend (served as static files)
    ├── pages/                # 17 HTML pages
    └── assets/
        ├── css/styles.css
        └── js/
            ├── app.js        # API helpers, initApp, guardPage, logout
            └── ui.js         # Render helpers, action handlers
```

---

## API Reference

### Auth — `/api/auth`

| Method | Path       | Auth     | Description              |
|--------|------------|----------|--------------------------|
| POST   | /register  | None     | Create account           |
| POST   | /login     | None     | Login, sets session      |
| POST   | /logout    | Auth     | Clear session            |
| GET    | /me        | None     | Current session user     |

### Groups — `/api/groups`

| Method | Path                       | Auth              | Description            |
|--------|----------------------------|-------------------|------------------------|
| GET    | /                          | None              | List groups (filtered) |
| GET    | /:id                       | None              | Group detail           |
| POST   | /                          | Organizer/Admin   | Create group           |
| PUT    | /:id                       | Auth (organizer)  | Update group           |
| POST   | /:id/join                  | Auth              | Join or request join   |
| DELETE | /:id/leave                 | Auth              | Leave group            |
| DELETE | /:id/members/:memberId     | Auth (organizer)  | Remove member          |
| GET    | /:id/comments              | None              | List comments          |
| POST   | /:id/comments              | Auth              | Post comment           |

### Join Requests — `/api/join-requests`

| Method | Path  | Auth              | Description                  |
|--------|-------|-------------------|------------------------------|
| GET    | /     | Organizer/Admin   | List requests (own groups)   |
| PUT    | /:id  | Organizer/Admin   | Approve or reject request    |

### Users — `/api/users`

| Method | Path | Auth | Description                    |
|--------|------|------|--------------------------------|
| GET    | /me  | Auth | Full profile + stats + groups  |
| PUT    | /me  | Auth | Update name, major, bio        |

### Admin — `/api/admin`

| Method | Path                 | Auth  | Description              |
|--------|----------------------|-------|--------------------------|
| GET    | /stats               | Admin | Platform statistics      |
| GET    | /users               | Admin | All users                |
| PUT    | /users/:id/status    | Admin | Ban or unban user        |
| GET    | /groups              | Admin | All groups (all statuses)|
| PUT    | /groups/:id/status   | Admin | Remove or restore group  |

---

## Role Permissions

| Feature                        | Participant | Organizer | Admin |
|--------------------------------|:-----------:|:---------:|:-----:|
| Browse groups                  | ✓           | ✓         | ✓     |
| Join public group              | ✓           | ✓         | ✓     |
| Request to join private group  | ✓           | ✓         | ✓     |
| Post comments (as member)      | ✓           | ✓         | ✓     |
| Create group                   |             | ✓         | ✓     |
| Manage own group               |             | ✓         | ✓     |
| Approve/reject join requests   |             | ✓         | ✓     |
| View all groups (incl. removed)|             |           | ✓     |
| Ban/unban users                |             |           | ✓     |
| Remove/restore any group       |             |           | ✓     |

---

## Re-seeding

To reset the database to a clean state:

```bash
npm run seed
```

This drops and recreates all tables, then inserts the demo data.
