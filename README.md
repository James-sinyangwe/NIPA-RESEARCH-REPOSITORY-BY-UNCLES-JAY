# Enterprise Institutional Repository & Digital Library System

An enterprise-grade Institutional Repository and Digital Library Management System designed to store, manage, preserve, and showcase research, theses, dissertations, and various institutional publications. Crafted with security, modularity, and usability in mind.

---

## 🏛️ System Overview

The system operates as a secure digital library platform comprising a hierarchical data organization:
* **Communities**: Top-level institutional divisions (e.g., Faculties, Schools, Departments).
* **Collections**: Subdivisions within communities to group related items (e.g., Journals, Masters Theses, Dissertations).
* **Documents & Files**: Academic publications and research items containing comprehensive metadata, file attachments, version histories, and workflow approval states.

---

## 🛡️ Core Security Architecture

### 1. Secure Password Hashing
All user credentials are encrypted server-side using **bcrypt** with a work factor of 10. Direct plaintext storage of passwords has been fully eliminated. The server validates incoming login requests securely:
* **Seed Passwords**: Automatically upgraded to secure hashes on server initialization.
* **Registration/Creation**: Intercepted in API routes to guarantee any newly provisioned user starts with an encrypted password.

### 2. Idle Session Inactivity Monitor
To protect sensitive institutional data in shared university environments or research labs:
* **Automatic Logout**: The client-side application monitors user interaction events (`mousedown`, `mousemove`, `keypress`, `scroll`, `touchstart`, `click`).
* **30-Minute Threshold**: If no activity is detected for 30 consecutive minutes, the user's active session is terminated, logging them out of the system.
* **Security Indicator Banner**: A responsive, high-contrast global top banner notifies the logged-out user of the security action, reinforcing best-practice security awareness.

### 3. Restricted Account Provisioning
Self-registration of accounts has been disabled to prevent unauthorized modifications to the institutional repository.
* **Staff-Only Management**: All user accounts, curators, and administrators must be registered or managed exclusively by authorized administrative personnel in the dashboard.
* **Controlled Access Control**: Institutional roles are rigidly defined (e.g., Administrator, Repository Manager, Curator, Submitter) with custom granular permissions attached.

### 4. File Upload Sanitization
The platform prevents execution of malicious assets by restricting file attachments to safe, predefined document formats. File uploads validate both file extensions and corresponding MIME-types before storage.

---

## 💾 Administration & Database Backup

### Relational PostgreSQL & Cloud SQL Integration
The system has been updated from a filesystem-persisted local JSON store to a fully relational, scalable database powered by **PostgreSQL** (configured for Google Cloud SQL) and **Drizzle ORM**.
* **Dual-Layer Persistence**: The backend automatically synchronizes its state with a PostgreSQL instance. On application boot, it automatically pulls and populates the latest global persistent state, ensuring seamless horizontal scaling.
* **Declarative Schemas**: Strictly defined schemas (in `src/db/schema.ts`) map tables like `app_data` and `users` with precise types.
* **Automated Migrations**: Schema updates are fully automated. When running `npm run build`, Drizzle Kit automatically generates any pending SQL migrations. On server startup, the system programmatically executes these migrations to ensure the target database schema is always fully up-to-date without manual intervention.

### Relational SQL Dump Engine
Administrators and Repository Managers can export the complete database with a single click. Instead of exporting unformatted JSON files, the backend dynamically compiles a fully-relational PostgreSQL-compatible `.sql` file on-the-fly:
1. **Dynamic Schema Generation**: The system evaluates JSON keys across records to deduce table definitions (`CREATE TABLE`) and map column data types (e.g., `INTEGER`, `NUMERIC`, `BOOLEAN`, `TEXT`, `JSON`).
2. **Transactional Integrity**: Wrap imports safely in standard SQL `BEGIN TRANSACTION;` and `COMMIT;` blocks to prevent partial database states.
3. **Escaped Values**: Automatically sanitizes nested quotes, arrays, objects, and strings to guarantee successful SQL client parsing.

---

## 🛠️ Technology Stack

* **Frontend**: React (Vite-powered SPA), Tailwind CSS utility-first styling, Lucide Icons.
* **Backend**: Express Node.js Server supporting API proxies, session authorization, and resource endpoints.
* **Database & ORM**: PostgreSQL (Cloud SQL ready) managed via **Drizzle ORM** & **Drizzle Kit**.
* **Local Fallback**: File-based local JSON backup layer for hybrid resilience.

---

## ⚙️ Environment Variables

To run the application with PostgreSQL support, ensure the following environment variables are defined in your deployment environment or `.env` file:

```env
# Server details
PORT=3000

# Cloud SQL Connection Variables (provided automatically by the platform at runtime, or configured manually)
SQL_HOST=your-postgresql-host
SQL_DB_NAME=your-database-name
SQL_USER=your-app-database-user
SQL_PASSWORD=your-app-database-password
SQL_ADMIN_USER=your-admin-database-user
SQL_ADMIN_PASSWORD=your-admin-database-password
```

---

## 🚀 Getting Started

### Development
To launch the Node development server hosting both the compiled React asset engine and backend API services:
```bash
npm run dev
```

### Production Build & Automated Migrations
To compile the production frontend assets, generate SQL migrations via Drizzle Kit, and bundle the backend TypeScript into a fast standalone server:
```bash
npm run build
```

The build command performs:
1. `drizzle-kit generate --config src/db/drizzle.config.ts`: Scans schema files and generates migration files in `./drizzle`.
2. `vite build`: Compiles production frontend static assets into `dist/`.
3. `esbuild server.ts --bundle ...`: Bundles the Express backend server to `dist/server.cjs`.

### Running the App
To start the production system:
```bash
npm run start
```
Upon booting, the backend programmatically executes any pending SQL migration scripts found in `./drizzle` before starting the HTTP server, fully initializing or updating the database.
