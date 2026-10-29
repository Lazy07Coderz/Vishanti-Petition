# The Vishanti Petition

### Campus Grievance Redressal System

**Team:** LazyCoderz  
**Event:** WEBSTER 2026

The Vishanti Petition is a full-stack web application for submitting, tracking, and resolving campus grievances. Students can file petitions and follow their progress, while authorized administrators manage priorities, status updates, and resolution deadlines. The platform includes notifications, institution-wide summary statistics, and a SHA-256 hash-chained activity log to support accountability.

## Features

### Student portal

- Student registration and sign-in with bcrypt password hashing and JWT authentication.
- File categorized petitions with an optional anonymous-submission flag and supporting evidence.
- View **My Petitions** (only petitions belonging to the authenticated student).
- See institution-wide **aggregate** petition statistics without accessing other students' petition details.
- Track each petition's status, priority, SLA deadline, and recorded activity.
- Receive notifications when a petition is resolved; mark notifications as read.

### Administrator portal

- Role-restricted overview of institutional petitions and overdue deadlines.
- Search and filter petitions in the Work Queue.
- Change petition priority and advance its status through the defined workflow.
- Record a decision reason when changing status.
- Receive notifications for new petitions and overdue SLA deadlines.
- View recorded audit events and verify their stored SHA-256 hash chain.

## Petition workflow

```text
FILED → ASSIGNED → IN_REVIEW → RESOLVED → CLOSED
```

Administrators may move a petition **one stage forward at a time**. Public registration creates **STUDENT** accounts only; an administrator role must be assigned through a trusted database administration process.

### Priority-based SLA

| Priority | Resolution deadline |
| --- | --- |
| High | 24 hours from filing |
| Medium | 48 hours from filing |
| Low | 72 hours from filing |

New petitions start at **Medium** priority. Authorized administrators can change priority, and the deadline is recalculated from the petition's **original creation time**. An overdue checker runs at startup and approximately once per minute while the server is running.

**Overdue petitions are flagged and administrators are notified; the system does not automatically escalate or reassign them.**

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JSON Web Tokens (JWT), bcrypt |
| Validation and uploads | Zod, Multer |
| Audit hashing | Node.js `crypto` (SHA-256) |

## Project structure

```text
Vishanti-Petition/
├── frontend/
│   ├── student-portal/
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── file-petition.html
│   │   ├── petition-details.html
│   │   ├── notifications.html
│   │   └── ... CSS and JavaScript files
│   └── admin-portal/
│       ├── admin_overview.html
│       ├── admin_work_queue.html
│       ├── admin_notifications.html
│       └── ... CSS and JavaScript files
├── backend/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── server.js
│   └── package.json
├── .gitignore
└── README.md
```

## Getting started

### Prerequisites

- **Node.js 22 or later** and npm.
- A **MongoDB Atlas** cluster with a database user and permitted network access.
- A MongoDB deployment that supports **transactions** (Atlas replica-set clusters support them).

### 1. Clone the project

```bash
git clone https://github.com/Lazy07Coderz/Vishanti-Petition.git
cd Vishanti-Petition/backend
```

### 2. Install backend dependencies

```bash
npm install
```

### 3. Configure the environment

Create a file named **`.env`** inside the `backend/` directory:

```dotenv
PORT=3000
MONGODB_URI=YOUR_MONGODB_ATLAS_CONNECTION_STRING
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
```

Replace the placeholder values with your own credentials. The application explicitly uses the MongoDB database name **`Vishanti`**. Never commit `.env`, credentials, `node_modules/`, or uploaded files. The provided `.gitignore` excludes `.env`, `node_modules/`, and `uploads/`.

### 4. Start the development server

From the `backend/` directory:

```bash
npm run dev
```

This runs `node --env-file=.env --watch server.js`, loads the environment variables, and restarts the server when backend files change.

Once MongoDB connects, open:

- **Login / registration:** http://localhost:3000/login.html
- **Student dashboard:** http://localhost:3000/dashboard.html
- **Admin overview:** http://localhost:3000/admin-portal/admin_overview.html
- **Admin Work Queue:** http://localhost:3000/admin-portal/admin_work_queue.html
- **Admin notifications:** http://localhost:3000/admin-portal/admin_notifications.html

Sign in through the common login page; the application redirects users according to their roles. Use the student portal to create a student account. Admin accounts are **not** created through public signup.

> The `npm start` script is also defined, but unlike `npm run dev`, it does not itself load `.env`. Provide environment variables separately when using it.

## API overview

The API is served from the same Express application. Protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Access / purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Public student registration |
| `POST` | `/api/auth/login` | Student or admin login |
| `GET` | `/api/auth/me` | Authenticated user |
| `GET` | `/api/complaints/stats` | Authenticated aggregate counts only |
| `POST` | `/api/complaints` | Student creates a petition (multipart form data) |
| `GET` | `/api/complaints/mine` | Student's own petitions |
| `GET` | `/api/complaints` | Admin petition queue |
| `GET` | `/api/complaints/:id` | Admin or owning student |
| `PATCH` | `/api/complaints/:id/priority` | Admin changes priority |
| `PATCH` | `/api/complaints/:id/status` | Admin advances status with reason |
| `GET` | `/api/complaints/:id/audit` | Authorized audit history |
| `GET` | `/api/complaints/:id/audit/verify` | Authorized hash-chain verification |
| `GET` | `/api/notifications` | Current user's notifications |
| `GET` | `/api/notifications/unread-count` | Current user's unread count |
| `PATCH` | `/api/notifications/read-all` | Mark all own notifications read |
| `PATCH` | `/api/notifications/:id/read` | Mark one own notification read |

Evidence uploads accept **JPG, PNG, or PDF** with a **5 MiB** size limit. Uploaded files are stored locally under `backend/uploads/`.

## Audit and transparency

Audit events include petition creation, status changes, priority changes, and detected SLA breaches. Events store their own SHA-256 hash and the preceding event's hash. The verification endpoint checks the continuity and integrity of the **stored audit-event chain**.

Petitions that existed before audit logging began are identified as **legacy records**; earlier unrecorded actions are not reconstructed. Petition writes and audit writes use MongoDB transactions.

**Limitations:** Chain verification does not independently protect against a privileged actor rewriting an entire database, and it does not currently establish that every live petition field agrees with its audited history. Independent hash anchoring and stronger integrity checks would be required for a production-grade guarantee.

## Testing and known limitations

A useful manual end-to-end test is:

1. Register a student and sign in.
2. File a petition; confirm it starts at Medium priority with a 48-hour SLA.
3. Sign in as an admin; verify the new-petition notification.
4. Change priority to High; confirm that the deadline is 24 hours from the **original filing time**.
5. Advance the petition through the defined stages, supplying decision reasons.
6. Confirm the student receives a resolution notification and can view the recorded audit events.
7. Verify the audit chain and confirm student users cannot access another student's petition or admin-only APIs.

The `backend/package.json` currently has **no `npm test` script**; automated and live-browser tests are not bundled as a single command.

Additional limitations in the current implementation:

- Uploaded evidence is stored on disk, but there is no authenticated evidence download/view API yet.
- Upload validation checks filename extension and declared MIME type, not file contents (magic bytes).
- Notification writes are best-effort; there is no durable retry queue for failed delivery.
- A subsequent SLA breach after certain priority changes may not produce a separate overdue audit event because the existing overdue flag is not reset.
- The application should be tested against a live Atlas cluster and real browsers before production deployment.

## Team

**LazyCoderz — WEBSTER 2026**

Built to make campus grievances more visible, traceable, and accountable.

Deployed the project on render, the link is:- https://vishanti-petition.onrender.com/
